import { Struggle } from '../systems/Struggle';
import { CONFIG, VIEW_H, VIEW_W } from '../config';
import { BAITS, BAITS_BY_ID, baitAttracts, type BaitDef } from '../entities/Baits';
import { Boss, CHECKPOINTS, bossAwake, bossBiome, checkpointUnlocked, nextBoss, type BossDef } from '../entities/Boss';
import { Claw, type ClawState } from '../entities/Claw';
import { updateSchool, type Creature, type CreatureEvent } from '../entities/Creature';
import { findPathHit, resolveStrike } from '../entities/Hit';
import { RARITIES, RARITY_COLOR, SPECIES, SPECIES_BY_ID, VARIANTS, isCreature, type Rarity, type VariantId } from '../entities/Species';
import { Effects } from '../render/Effects';
import { Renderer } from '../render/Renderer';
import { ComboTracker, captureValue, recordCapture } from '../systems/Economy';
import { aquariumTouch, collectionBonus } from '../systems/Meta';
import { applyOrderEvent, ensureOrders, orderText, type OrderEvent } from '../systems/Orders';
import { catchKg, deliverDive, licenseBonus, quotaTarget, type QuotaOutcome } from '../systems/Quota';
import { computeStats, type RunStats } from '../systems/Upgrades';
import { paletteAt } from '../world/Biomes';
import { depthAt } from '../world/Depth';
import { pickSpecies, pickVariant, SpawnDirector } from '../world/SpawnDirector';
import { biomeIndexAt } from '../world/Biomes';
import { Terrain } from '../world/Terrain';
import { AudioFx } from './Audio';
import { Camera } from './Camera';
import { Input } from './Input';
import { seededRandom } from './RNG';
import { loadSave, writeSave, type SaveData } from './Save';

export type Mode = 'menu' | 'playing' | 'paused' | 'results';

export interface CaptureLog {
  speciesId: string;
  variant: VariantId;
  value: number;
  rarity: Rarity;
}

export interface RunSummary {
  captures: CaptureLog[];
  coins: number;
  stars: number;
  newSpecies: string[];
  maxDepth: number;
  maxDistance: number;
  depthRecord: boolean;
  rarityCounts: Partial<Record<Rarity, number>>;
  bonusSeconds: number;
  bestCombo: number;
  bossesDefeated: string[];
  weakPointsHit: number;
  ordersCompleted: string[];
  kg: number;
  quota: QuotaOutcome;
  quotaTargetKg: number;
  clawBroken: boolean;
}

export interface BossShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  color: string;
  dark: string;
}

export interface RunHud {
  timeLeft: number;
  coins: number;
  captures: number;
  depth: number;
  bestDepth: number;
  combo: number;
  /** 0..1 frenzy time left */
  frenzy: number;
  /** 0..1 turbo gauge */
  turbo: number;
  boss: { name: string; hp: number; max: number; open: boolean; hearts: number; maxHearts: number } | null;
  quota: { kg: number; target: number; divesLeft: number };
  bait: { name: string; count: number; color: string };
  hunt: { marker: number; window: number; tension: number; progress: number; target: number; name: string } | null;
  tools: { net: number; harpoon: number; prestige: number };
  rage: string;
  flash: { name: string; got: number; need: number; t: number } | null;
  tide: boolean;
}

export interface ActiveBait {
  def: BaitDef;
  x: number;
  y: number;
  targetY: number;
  t: number;
  sinking: boolean;
  callTimer: number;
  called: number;
}

export type EventKind = 'goldenSchool' | 'current' | 'shark' | 'bigSchool' | 'chestRain' | 'meteorShower' | 'flashOrder';

/** Timed in-dive challenge: catch N of one species before the clock runs out. */
export interface FlashOrder {
  speciesId: string;
  name: string;
  need: number;
  got: number;
  t: number;
  reward: number;
}

/** A claw on the platform that strikes on its own (Braço Auxiliar). */
export interface AutoClaw {
  /** x offset from the platform center */
  offset: number;
  cd: number;
  state: 'idle' | 'down' | 'up';
  t: number;
  tipY: number;
  targetY: number;
  target: Creature | null;
  held: Creature | null;
}

/** Offsets of the automatic claws around the main one, closest first. */
export const AUTO_OFFSETS = [-44, 44, -88, 88, -132, 132, -176, 176];
const AUTO_DOWN = 0.16;
const AUTO_UP = 0.24;

export class Game {
  fight: { target: Creature; game: Struggle; perfect: boolean } | null = null;
  netCooldown = 0;
  harpoonCooldown = 0;
  private fightTapQueued = false;
  private toolQueued: 'net' | 'harpoon' | null = null;
  private bossEscape = 0;
  save: SaveData;
  stats: RunStats;
  mode: Mode = 'menu';
  readonly input: Input;
  readonly audio = new AudioFx();
  readonly renderer: Renderer;
  readonly effects = new Effects();
  readonly cam = new Camera();
  terrain: Terrain;
  spawn: SpawnDirector;
  claw: Claw;
  combo: ComboTracker;
  boss: Boss | null = null;
  autoClaws: AutoClaw[] = [];
  flash: FlashOrder | null = null;
  private tideAnnounced = false;
  /** variants first seen during this dive (species|variant) */
  private seenVariants = new Set<string>();
  private cableWarned = false;

  // run state
  timeLeft = 0;
  runCoins = 0;
  runStars = 0;
  captures: CaptureLog[] = [];
  newSpecies: string[] = [];
  maxDepth = 0;
  maxDistance = 0;
  bonusSeconds = 0;
  bestCombo = 0;
  frenzy = 0;
  turbo = 0;
  current = { t: 0, dir: 1 };
  runKg = 0;
  baits: ActiveBait[] = [];
  /** claw integrity during guardian fights */
  hearts = 3;
  shots: BossShot[] = [];
  private clawBroken = false;
  private bossesDefeated: string[] = [];
  private weakPointsHit = 0;
  private ordersCompleted: string[] = [];
  private eventTimer = 0;
  private lastOrderDepth = 0;
  private bossIntroShown = new Set<string>();
  private buoysAnnounced = new Set<string>();
  private valueMult = 1;
  private runCommitted = true;
  private perceivers: Creature[] = [];
  private lastTick = -1;
  private time = 0;
  private aimSX = VIEW_W / 2;
  private prevClawState: ClawState = 'READY';
  private events: CreatureEvent[] = [];
  private rng = seededRandom(Date.now() & 0xffffffff);
  private raf = 0;
  /** brief freeze on capture to sell the impact */
  private hitStop = 0;
  private last = 0;

  onModeChange: (m: Mode) => void = () => {};
  onRunEnd: (s: RunSummary) => void = () => {};
  onHud: (h: RunHud) => void = () => {};
  onBanner: (title: string, sub: string, color: string) => void = () => {};

  constructor(display: HTMLCanvasElement) {
    this.save = loadSave();
    ensureOrders(this.save);
    aquariumTouch(this.save, Date.now());
    writeSave(this.save);
    this.audio.muted = this.save.settings.muted;
    this.stats = computeStats(this.save);
    this.renderer = new Renderer(display);
    this.input = new Input(display);
    this.input.onFirstGesture = () => this.audio.unlock();
    this.terrain = new Terrain(1234);
    this.spawn = this.makeSpawn(this.terrain);
    this.claw = new Claw(this.stats);
    this.combo = new ComboTracker(this.stats);
    this.setupWorld(1234, 0);
  }

  private makeSpawn(t: Terrain): SpawnDirector {
    return new SpawnDirector(t, { density: this.stats.density, luck: this.stats.luck, schoolBonus: this.stats.schoolBonus, variantMult: this.stats.variantMult }, t.seed);
  }

  private setupWorld(seed: number, startX: number): void {
    this.terrain = new Terrain(seed);
    this.spawn = this.makeSpawn(this.terrain);
    this.renderer.resetWorld();
    this.effects.clear();
    this.boss = null;
    this.cam.x = Math.max(0, startX);
    this.cam.vx = 0;
    this.cam.snap(this.terrain);
    this.claw = new Claw(this.stats);
    this.claw.x = this.cam.x + VIEW_W / 2;
    this.claw.tipY = this.cam.y + CONFIG.claw.restTipY;
    this.autoClaws = AUTO_OFFSETS.slice(0, this.stats.autoClaws).map((offset, i) => ({
      offset, cd: 0.8 + i * 0.35, state: 'idle', t: 0, tipY: 0, targetY: 0, target: null, held: null,
    }));
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  persist(): void {
    writeSave(this.save);
  }

  /** Recompute stats after purchases/equip (only outside runs). */
  refreshStats(): void {
    this.stats = computeStats(this.save);
    this.claw.stats = this.stats;
  }

  setMode(m: Mode): void {
    this.mode = m;
    this.onModeChange(m);
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.save.settings.vibrate) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* not supported */
    }
  }

  // ───────────────────────── run lifecycle

  startCheckpointX(): number {
    const i = checkpointUnlocked(this.save.bosses, this.save.checkpoint, this.save.bestDistance) ? this.save.checkpoint : 0;
    return CHECKPOINTS[i].x;
  }

  startRun(): void {
    this.audio.unlock();
    this.refreshStats();
    this.setupWorld((this.rng() * 0xffffffff) >>> 0, this.startCheckpointX());
    this.combo = new ComboTracker(this.stats);
    this.timeLeft = this.stats.runSeconds;
    this.fight = null;
    this.fightTapQueued = false;
    this.toolQueued = null;
    this.netCooldown = this.harpoonCooldown = this.bossEscape = 0;
    this.runCoins = 0;
    this.runStars = 0;
    this.captures = [];
    this.newSpecies = [];
    this.maxDepth = depthAt(this.cam.x + VIEW_W / 2);
    this.lastOrderDepth = 0;
    this.maxDistance = 0;
    this.bonusSeconds = 0;
    this.bestCombo = 0;
    this.frenzy = 0;
    this.turbo = this.stats.turboSeconds;
    this.current = { t: 0, dir: 1 };
    this.runKg = 0;
    this.baits = [];
    this.hearts = this.stats.hearts;
    this.shots = [];
    this.clawBroken = false;
    this.bossesDefeated = [];
    this.weakPointsHit = 0;
    this.ordersCompleted = [];
    this.eventTimer = CONFIG.events.firstAfter;
    this.valueMult = this.stats.valueMult * (1 + collectionBonus(this.save) + licenseBonus(this.save.quota.license));
    this.runCommitted = false;
    this.cableWarned = false;
    this.tideAnnounced = false;
    this.seenVariants.clear();
    this.flash = null;
    this.lastTick = -1;
    this.input.reset();
    this.setMode('playing');
    this.audio.play('click');
  }

  pause(): void {
    if (this.mode === 'playing') {
      this.input.reset();
      this.setMode('paused');
    }
  }

  resume(): void {
    if (this.mode === 'paused') {
      this.last = performance.now();
      this.input.reset();
      this.setMode('playing');
    }
  }

  togglePause(): void {
    if (this.mode === 'playing') this.pause();
    else if (this.mode === 'paused') this.resume();
  }

  /** Ends the run and credits rewards exactly once. */
  endRun(): void {
    if (this.runCommitted) return;
    this.runCommitted = true;
    const s = this.save;
    const depthRecord = this.maxDepth > s.bestDepth + 0.5;
    this.orderEvent({ type: 'depth', meters: this.maxDepth });
    this.orderEvent({ type: 'run', captures: this.captures.length, coins: this.runCoins });
    s.coins += this.runCoins;
    s.totalEarned += this.runCoins;
    s.earnedThisLife += this.runCoins;
    s.stars += this.runStars;
    const quotaTargetKg = quotaTarget(s.quota.tier);
    const quota = deliverDive(s, this.runKg);
    s.totalCaptures += this.captures.length;
    s.totalRuns += 1;
    s.bestDepth = Math.max(s.bestDepth, this.maxDepth);
    s.bestDistance = Math.max(s.bestDistance, this.maxDistance);
    for (const c of this.captures) recordCapture(s, c.speciesId, c.variant);
    aquariumTouch(s, Date.now());
    this.persist();
    const rarityCounts: Partial<Record<Rarity, number>> = {};
    for (const c of this.captures) rarityCounts[c.rarity] = (rarityCounts[c.rarity] ?? 0) + 1;
    const summary: RunSummary = {
      captures: this.captures.slice(),
      coins: this.runCoins,
      stars: this.runStars,
      newSpecies: this.newSpecies.slice(),
      maxDepth: this.maxDepth,
      maxDistance: this.maxDistance,
      depthRecord,
      rarityCounts,
      bonusSeconds: this.bonusSeconds,
      bestCombo: this.bestCombo,
      bossesDefeated: this.bossesDefeated.slice(),
      weakPointsHit: this.weakPointsHit,
      ordersCompleted: this.ordersCompleted.slice(),
      kg: this.runKg,
      quota,
      quotaTargetKg,
      clawBroken: this.clawBroken,
    };
    this.fight = null;
    this.shots = [];
    this.baits = [];
    this.claw.held = [];
    this.frenzy = 0;
    this.claw.haste = 1;
    this.audio.play('end');
    this.setMode('results');
    this.onRunEnd(summary);
  }

  /** Back to the base: idle reef in the background. */
  toMenu(): void {
    this.refreshStats();
    this.setupWorld((this.rng() * 0xffffffff) >>> 0, 0);
    this.setMode('menu');
  }

  private orderEvent(ev: OrderEvent): void {
    for (const o of applyOrderEvent(this.save, ev)) {
      this.ordersCompleted.push(orderText(o));
      if (this.mode === 'playing') {
        this.onBanner('ENCOMENDA CONCLUÍDA!', `${orderText(o)} · resgate na base`, '#6cf27a');
        this.audio.play('bonus');
      }
    }
  }

  // ───────────────────────── frame

  private frame(dt: number): void {
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.render();
      return;
    }
    if (this.mode === 'playing') this.updateRun(dt);
    else if (this.mode === 'menu' || this.mode === 'results') this.updateAmbient(dt);
    this.render();
  }

  private updateAmbient(dt: number): void {
    this.time += dt;
    this.cam.update(dt, 0, 0, this.terrain);
    this.spawn.update(dt, this.cam.x, -999, 0);
    this.updateCreatures(dt);
    this.claw.update(dt * 1000, this.cam.x + VIEW_W * 0.5 + Math.sin(this.time * 0.6) * 120, this.cam.y + CONFIG.claw.restTipY);
    this.effects.update(dt);
    this.ambientBubbles(dt);
  }

  private updateRun(dt: number): void {
    this.time += dt;
    const stats = this.stats;

    // clock
    this.timeLeft -= dt;
    const whole = Math.ceil(this.timeLeft);
    if (whole !== this.lastTick && whole <= CONFIG.run.warnSeconds && whole > 0) this.audio.play('tick');
    this.lastTick = whole;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endRun();
      return;
    }

    // frenzy
    if (this.frenzy > 0) {
      this.frenzy -= dt;
      if (this.frenzy <= 0) {
        this.frenzy = 0;
        this.claw.haste = 1;
      }
    }

    // lateral navigation (turbo + currents); depth comes only from horizontal distance
    let dir = this.input.dir();
    let speed = stats.lateralSpeed;
    const tc = CONFIG.turbo;
    if (this.input.turbo() && this.turbo > 0) {
      this.turbo = Math.max(0, this.turbo - dt);
      if (dir === 0) dir = 1;
      speed *= tc.speedMult;
      if (Math.random() < dt * 30) this.effects.spawn('bubble', this.cam.x + VIEW_W / 2 - dir * 40, this.cam.y + 40 + Math.random() * 150, -dir * 60, -5, 0.5, '#e8ffff', 1);
    } else {
      this.turbo = Math.min(stats.turboSeconds, this.turbo + tc.rechargePerSecond * dt);
    }
    this.cam.update(dt, dir, speed, this.terrain);
    if (this.current.t > 0) {
      this.current.t -= dt;
      this.cam.focus += this.current.dir * CONFIG.events.currentPush * dt;
    }
    this.applyBarrier();
    const centerX = this.cam.x + VIEW_W / 2;
    this.maxDistance = Math.max(this.maxDistance, centerX);
    this.maxDepth = Math.max(this.maxDepth, depthAt(centerX));
    for (const c of CHECKPOINTS) {
      if (!c.minDistance || this.save.bestDistance >= c.minDistance || this.buoysAnnounced.has(c.name)) continue;
      if (this.maxDistance >= c.minDistance && (c.requires === null || this.save.bosses.includes(c.requires))) {
        this.buoysAnnounced.add(c.name);
        this.onBanner(`BOIA ALCANÇADA: ${c.name.toUpperCase()}`, 'Novo ponto de partida liberado ao fim do mergulho', '#7ad8ff');
        this.audio.play('bonus');
      }
    }
    if (this.maxDepth - this.lastOrderDepth >= 5) {
      this.lastOrderDepth = this.maxDepth;
      this.orderEvent({ type: 'depth', meters: this.maxDepth });
    }

    this.netCooldown = Math.max(0, this.netCooldown - dt);
    this.harpoonCooldown = Math.max(0, this.harpoonCooldown - dt);
    if (this.toolQueued) { this.useTool(this.toolQueued); this.toolQueued = null; }
    this.updateBoss(dt);
    this.updateShots(dt);
    this.updateEvents(dt);
    this.updateFlash(dt);
    if (!this.tideAnnounced && this.timeLeft <= CONFIG.run.finalTideSeconds) {
      this.tideAnnounced = true;
      this.onBanner('MARÉ FINAL!', `Tudo vale ×${CONFIG.run.finalTideMult} até o fim do mergulho`, '#ffd84a');
      this.audio.play('bonus');
      // the sea answers: a last big school rushes in
      this.startEvent('bigSchool', true);
    }

    // aim + strike (touch: the claw stays centered and dives down its column)
    const k = 1 - Math.pow(0.0001, dt);
    this.aimSX += (this.aimScreenX() - this.aimSX) * k;
    const restY = this.cam.y + CONFIG.claw.restTipY;
    if (this.input.consumeBaitCycle()) this.cycleBait();
    if (this.input.consumeBait()) this.throwBait();
    this.updateBaits(dt);
    const strike = this.input.consumeStrike();
    if (this.fight) {
      const f = this.fight;
      f.game.update(dt);
      if (strike || this.fightTapQueued) {
        const good = f.game.tap();
        this.effects.burst('spark', f.target.x, f.target.y, 5, 40, 0.3, [good ? '#7affb0' : '#ff6a5a']);
        this.audio.play(good ? 'bonus' : 'resist');
      }
      if (f.game.resolved) {
        this.fight = null;
        if (f.game.resolved === 'caught') {
          this.captureCreature(f.target, f.perfect, this.time * 1000, f.target.y - 16);
          this.effects.text(f.target.x, f.target.y - 28, 'TROFÉU DOMINADO!', '#ffe14a', true);
        } else {
          f.target.stun(0.3);
          f.target.shove(1);
          this.combo.miss();
          this.effects.text(f.target.x, f.target.y - 18, 'LINHA SOLTOU!', '#ff8a6a');
        }
      }
    } else if (strike || this.claw.takeBuffered()) this.tryStrike(restY);
    this.fightTapQueued = false;
    const prevTip = this.claw.tipY;
    const wasStriking = this.claw.state === 'STRIKE';
    this.claw.update(dt * 1000, this.cam.x + this.aimSX, restY);
    if (this.pathMode && wasStriking) {
      // grab the first thing the mouth runs into on its way down (creature or guardian)
      const r = stats.opening + stats.precision;
      const hit = findPathHit(this.claw.x, prevTip, this.claw.tipY, stats.opening, stats.precision, this.spawn.creatures.filter((c) => !c.frozen));
      const bh = this.boss?.pathHit(this.claw.x, prevTip, this.claw.tipY, r) ?? null;
      const y = Math.min(hit?.y ?? Infinity, bh?.y ?? Infinity);
      if (Number.isFinite(y)) this.claw.stopAt(y);
    }
    if (this.claw.contactPending && !this.fight) this.resolveContact();
    if (this.prevClawState === 'RETRACT' && this.claw.state === 'COOLDOWN') this.deliverHeld();
    this.prevClawState = this.claw.state;
    this.updateAutoClaws(dt);

    this.spawn.update(dt, this.cam.x, this.cam.x + this.aimScreenX(), dir);
    this.updateCreatures(dt);
    if (this.combo.expired(this.time * 1000)) this.combo.miss();
    this.effects.update(dt);
    this.ambientBubbles(dt);

    const b = this.boss && !this.boss.defeated ? this.boss : null;
    this.onHud({
      timeLeft: this.timeLeft,
      coins: this.runCoins,
      captures: this.captures.length,
      depth: depthAt(centerX),
      bestDepth: Math.max(this.save.bestDepth, this.maxDepth),
      combo: this.combo.count,
      frenzy: this.frenzy > 0 ? this.frenzy / stats.frenzySeconds : 0,
      turbo: this.turbo / stats.turboSeconds,
      boss: b ? { name: b.def.name, hp: b.hp, max: b.total, open: b.open, hearts: this.hearts, maxHearts: this.stats.hearts } : null,
      quota: { kg: this.save.quota.deliveredKg + this.runKg, target: quotaTarget(this.save.quota.tier), divesLeft: this.save.quota.divesLeft },
      bait: this.baitHud(),
      hunt: this.fight ? { marker: this.fight.game.marker, window: this.fight.game.halfWindow,
        tension: this.fight.game.tension, progress: this.fight.game.progress,
        target: 3 + Math.floor(this.fight.game.difficulty), name: this.fight.target.def.name } : null,
      tools: { net: this.netCooldown, harpoon: this.harpoonCooldown, prestige: this.save.prestiges },
      flash: this.flash ? { name: this.flash.name, got: this.flash.got, need: this.flash.need, t: this.flash.t } : null,
      tide: this.tide() > 0,
      rage: (() => { const nb = nextBoss(this.save.bosses); return nb ? `${nb.name}: ${Math.min(nb.rage, this.save.bossRage[nb.id] ?? 0)}/${nb.rage}` : 'Guardiões dominados'; })(),
    });
  }

  // ───────────────────────── guardians

  /**
   * Lateral travel is free; the barrier is depth. Past the point where the
   * seabed is deeper than the cable, the claw stops in open water: the reach
   * line climbs and the creatures below stay out of reach.
   */
  private applyBarrier(): void {
    this.cam.clampFocus();
    const x = this.cam.x + this.cam.focusScreenX;
    if (!this.cableWarned && this.reachGap(x) > 40) {
      this.cableWarned = true;
      this.onBanner('FUNDO FORA DO ALCANCE', `O cabo só chega a ${this.stats.cable.toLocaleString('pt-BR')} m. Compre Guincho na árvore para descer mais.`, '#9fd8e8');
    }
  }

  /** How far above the seabed the cable stops at world x (0 = reaches the sand). */
  reachGap(x: number): number {
    const depth = depthAt(x);
    const cable = this.stats.cable;
    if (depth <= cable) return 0;
    const c = CONFIG.cable;
    return Math.min(c.maxGapPx, (depth / cable - 1) * c.gapPx);
  }

  /** Deepest world y the claw can reach at x. */
  reachY(x: number): number {
    return this.terrain.seabedY(x) - 1 - this.reachGap(x);
  }

  private updateBoss(dt: number): void {
    const nb = nextBoss(this.save.bosses);
    const centerX = this.cam.x + VIEW_W / 2;
    if (!this.boss && nb && bossAwake(nb, this.save.bossRage) && biomeIndexAt(centerX) >= bossBiome(nb)) {
      // provoked guardians come to you, right where you are hunting
      this.boss = new Boss({ ...nb, x: centerX + 130 }, this.save.bossDamage[nb.id] ?? 0);
      this.bossEscape = 0;
      if (!this.bossIntroShown.has(nb.id)) {
        this.bossIntroShown.add(nb.id);
        this.onBanner(`GUARDIÃO: ${nb.name.toUpperCase()}`, nb.intro, '#ff6a5a');
        this.audio.play('resist');
      }
    }
    const boss = this.boss;
    if (!boss) return;
    if (!boss.defeated && Math.abs(boss.x - centerX) > VIEW_W * 0.9) {
      this.bossEscape += dt;
      if (this.bossEscape > 1.5) {
        this.save.bossRage[boss.def.id] = Math.floor(boss.def.rage * 0.5);
        this.boss = null;
        this.bossEscape = 0;
        this.onBanner('VOCÊ DESPISTOU O GUARDIÃO', 'O dano fica salvo. Continue caçando para provocá-lo novamente.', '#7affea');
        return;
      }
    } else this.bossEscape = 0;
    if (boss.defeated && boss.dying > 2.2) {
      this.boss = null;
      return;
    }
    const ev = boss.update(dt, (x) => this.terrain.seabedY(x));
    if (ev === 'slam') {
      this.throwShots(boss);
      this.effects.shake = Math.max(this.effects.shake, 6);
      this.effects.burst('ring', boss.x, boss.y + boss.def.h * 0.4, 1, 0, 0.6, ['#ffffff'], 60);
      const p = paletteAt(boss.x);
      this.effects.burst('dust', boss.x, this.terrain.seabedY(boss.x) - 2, 24, 90, 1, [p.sand, p.sandLight], 2);
      this.audio.play('miss');
      // a claw caught out near the guardian gets stunned
      if (this.claw.busy && this.claw.state !== 'COOLDOWN' && Math.abs(this.claw.x - boss.x) < boss.def.w * 0.8) {
        this.claw.extraCooldownMs += 800;
        this.effects.text(this.claw.x, this.claw.tipY - 10, 'ATORDOADO!', '#ff6a5a');
        this.vibrate(60);
      }
      for (const c of this.spawn.creatures) if (!c.frozen && Math.abs(c.x - boss.x) < 140) c.notifyStrike(boss.x, c.y, 0.5);
    }
  }

  /** The guardian hurls rocks (or zaps) at the claw: dodge them with the arrows. */
  private throwShots(boss: Boss): void {
    const sh = boss.def.shot;
    const tx = this.claw.x;
    const ty = this.cam.y + CONFIG.claw.restTipY - 8;
    for (let k = 0; k < sh.count; k++) {
      const x = boss.x + (this.rng() - 0.5) * boss.def.w * 0.5;
      const y = boss.y - boss.def.h * 0.35;
      const aimX = tx + (k - (sh.count - 1) / 2) * 24 + (this.rng() - 0.5) * 6;
      const d = Math.hypot(aimX - x, ty - y) || 1;
      const sp = sh.speed * (0.9 + this.rng() * 0.25);
      this.shots.push({ x, y, vx: ((aimX - x) / d) * sp, vy: ((ty - y) / d) * sp, t: 0, color: sh.color, dark: sh.dark });
    }
  }

  private updateShots(dt: number): void {
    const headY = this.claw.tipY - 8;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const p = this.shots[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const onHead = Math.hypot(p.x - this.claw.x, p.y - headY) < 11;
      const onShaft = Math.abs(p.x - this.claw.x) < 4 && p.y > this.cam.y && p.y < headY;
      if (onHead || onShaft) {
        this.shots.splice(i, 1);
        this.hurtClaw(p.x, p.y);
        continue;
      }
      if (p.t > 4 || p.y < this.cam.y - 30) this.shots.splice(i, 1);
    }
  }

  private hurtClaw(x: number, y: number): void {
    if (this.clawBroken) return;
    this.hearts--;
    this.timeLeft = Math.max(0.1, this.timeLeft - 3);
    this.claw.extraCooldownMs += 500;
    this.effects.shake = 9;
    this.effects.flash = 0.5;
    this.effects.text(x, y + 14, this.hearts > 0 ? 'DANO! -3s' : 'GARRA DESTRUÍDA!', '#ff4a5a', true);
    this.effects.burst('spark', x, y, 14, 90, 0.5, ['#ff4a5a', '#ffd0a0', '#ffffff']);
    this.vibrate([90, 40, 90]);
    this.audio.play('resist');
    if (this.hearts <= 0) {
      this.clawBroken = true;
      this.onBanner('GARRA DESTRUÍDA!', 'O guardião venceu desta vez. Melhore a garra e volte.', '#ff4a5a');
      this.timeLeft = Math.min(this.timeLeft, 1.2);
    }
  }

  /** Claw contact with the guardian. Returns true if the guardian took the hit. */
  private contactBoss(x: number, y: number): boolean {
    const boss = this.boss;
    if (!boss) return false;
    const stats = this.stats;
    const fx = this.effects;
    const kind = boss.hitTest(x, y, stats.opening + stats.precision);
    if (!kind) return false;
    if (kind === 'body') {
      if (boss.def.shocking && !stats.claw.tags.includes('shockproof')) {
        this.claw.extraCooldownMs += 700;
        fx.text(x, y - 10, 'CHOQUE!', '#7affff');
        for (let i = 0; i < 12; i++) fx.spawn('bolt', x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20, 0, -20, 0.4, '#bfffff');
        this.audio.play('shock');
      } else {
        this.claw.extraCooldownMs += 250;
        fx.text(x, y - 10, boss.open ? 'BLINDADO! MIRE NO BRILHO' : 'BLINDADO!', '#c8d8e0');
        fx.burst('spark', x, y, 10, 80, 0.3, ['#ffffff', '#ffd27a']);
        this.audio.play('resist');
      }
      this.combo.miss();
      return true;
    }
    if (stats.strength < boss.def.strength) {
      fx.text(x, y - 10, 'RESISTIU!', '#ff6a5a');
      fx.text(x, y - 20, `força ${stats.strength.toFixed(1)} / ${boss.def.strength.toFixed(1)}`, '#ffb36a');
      boss.flinch = 0.3;
      this.audio.play('resist');
      return true;
    }
    const def = boss.def;
    const defeated = boss.hitWeak();
    this.weakPointsHit++;
    this.save.bossDamage[def.id] = boss.damage;
    const chunk = Math.round(def.coins * 0.08 * this.valueMult);
    this.runCoins += chunk;
    fx.text(x, y - 12, 'PONTO FRACO!', '#ffe14a', true);
    fx.text(x, y + 4, `+$${chunk}`, '#ffe680');
    fx.burst('star', x, y, 16, 90, 0.6, ['#ffffff', '#ffe14a', '#ff6a5a']);
    fx.shake = 7;
    fx.flash = 0.6;
    this.hitStop = 0.09;
    this.effects.coinFly(x - this.cam.x, y - this.cam.y, 5);
    this.vibrate(45);
    this.audio.play('bonus');
    if (defeated) this.defeatBoss(def);
    this.persist();
    return true;
  }

  private defeatBoss(def: BossDef): void {
    const s = this.save;
    if (!s.bosses.includes(def.id)) s.bosses.push(def.id);
    delete s.bossDamage[def.id];
    const coins = Math.round(def.coins * this.valueMult);
    this.runCoins += coins;
    this.runStars += def.stars;
    this.bossesDefeated.push(def.name);
    this.addTime(CONFIG.run.bossBonusSeconds);

    const boss = this.boss!;
    this.effects.burst('star', boss.x, boss.y, 40, 160, 1.2, ['#ffffff', '#ffe14a', '#ff7ff5', '#7affea']);
    this.effects.coinFly(boss.x - this.cam.x, boss.y - this.cam.y, 14);
    this.effects.shake = 10;
    this.effects.flash = 1;
    this.vibrate([80, 50, 80, 50, 160]);
    this.audio.play('newSpecies');
    const last = !nextBoss(s.bosses);
    const cp = CHECKPOINTS.findIndex((c) => c.requires === def.id);
    this.onBanner(
      last ? 'VOCÊ CONQUISTOU O ABISMO!' : 'GUARDIÃO CAPTURADO!',
      `${def.name} · +$${coins.toLocaleString('pt-BR')} · +${def.stars}★ · +${CONFIG.run.bossBonusSeconds}s${cp > 0 ? ` · novo ponto de partida: ${CHECKPOINTS[cp].name}` : ''}`,
      '#ffe14a',
    );
  }

  /** 0..1 while the Maré Final (last seconds of the dive) is on. */
  tide(): number {
    const f = CONFIG.run.finalTideSeconds;
    return this.mode === 'playing' && this.timeLeft <= f ? Math.min(1, (f - this.timeLeft) * 2 + 0.3) : 0;
  }

  /** One of the very few ways to win time inside a dive. */
  private addTime(seconds: number): void {
    this.timeLeft += seconds;
    this.bonusSeconds += seconds;
    this.audio.play('bonus');
  }

  // ───────────────────────── random events

  /** Something happens every 9–14 s, so no stretch of a dive is dull. */
  private updateEvents(dt: number): void {
    this.eventTimer -= dt;
    if (this.eventTimer > 0) return;
    const e = CONFIG.events;
    this.eventTimer = e.minGap + this.rng() * (e.maxGap - e.minGap);
    if (this.boss && !this.boss.defeated) return; // keep guardian fights readable
    if (this.timeLeft <= CONFIG.run.finalTideSeconds) return; // the Maré Final has its own show
    const depth = depthAt(this.cam.x + VIEW_W / 2);
    const options: [EventKind, number][] = [
      ['bigSchool', 4],
      ['goldenSchool', 3],
      ['flashOrder', this.flash ? 0 : 3],
      ['chestRain', 2],
      ['meteorShower', depth > 150 ? 2.5 : 1],
      ['shark', depth > 30 ? 2 : 0.5],
      ['current', 1.5],
    ];
    let roll = this.rng() * options.reduce((a, o) => a + o[1], 0);
    let kind: EventKind = 'bigSchool';
    for (const [k, w] of options) {
      if (roll < w) { kind = k; break; }
      roll -= w;
    }
    this.startEvent(kind);
  }

  /** A school species that lives around here (for school events). */
  private localSchoolSpecies(x: number) {
    const depth = depthAt(x);
    const pool = SPECIES.filter((d) => d.special.includes('school') && depth >= d.minDepth * 0.8 && depth <= d.maxDepth * 1.1);
    return pool.length ? pool[Math.floor(this.rng() * pool.length)] : SPECIES_BY_ID[depth > 900 ? 'lanternFish' : 'orangeFish'];
  }

  /** Visible x with the sand inside the cable's reach (for treasure drops). */
  private reachableX(): number {
    let best = this.cam.x + VIEW_W / 2;
    for (let i = 0; i < 12; i++) {
      const x = this.cam.x + 30 + this.rng() * (VIEW_W - 60);
      if (this.reachGap(x) < 4) return x;
      if (this.reachGap(x) < this.reachGap(best)) best = x;
    }
    return best;
  }

  startEvent(kind: EventKind, quiet = false): void {
    const floorX = this.cam.x + VIEW_W / 2;
    const depth = depthAt(floorX);
    switch (kind) {
      case 'goldenSchool': {
        const def = this.localSchoolSpecies(floorX);
        this.spawn.spawnSchool(def, 'golden', this.cam.x + VIEW_W + 50, 7 + Math.round(this.stats.schoolBonus / 2), -1);
        this.onBanner('CARDUME DOURADO!', 'Peixes dourados valem 4×', '#ffd84a');
        this.audio.play('bonus');
        break;
      }
      case 'bigSchool': {
        const def = this.localSchoolSpecies(floorX);
        const fromRight = this.rng() < 0.6;
        const n = 14 + this.stats.schoolBonus * 2;
        this.spawn.spawnSchool(def, 'normal', fromRight ? this.cam.x + VIEW_W + 60 : this.cam.x - 60, n, fromRight ? -1 : 1);
        if (!quiet) this.onBanner('CARDUME GIGANTE!', `${n} ${def.name} cruzando a tela`, '#7ad8ff');
        this.audio.play('newSpecies');
        break;
      }
      case 'chestRain': {
        const n = 4 + Math.floor(this.rng() * 3);
        for (let i = 0; i < n; i++) {
          const x = this.reachableX();
          const mimic = depth >= 300 && this.rng() < 0.2;
          this.spawn.spawnSpecial(SPECIES_BY_ID[mimic ? 'mimic' : 'chest'], 'normal', x, null, this.rng() < 0.5 ? 1 : -1);
          this.effects.burst('dust', x, this.terrain.seabedY(x) - 2, 10, 50, 0.8, [paletteAt(x).sand, '#ffd84a'], 2);
        }
        this.effects.shake = 4;
        this.onBanner('CHUVA DE BAÚS!', 'Um navio despejou a carga. Pegue antes que afundem na areia!', '#ffd84a');
        this.audio.play('bonus');
        break;
      }
      case 'meteorShower': {
        // fragments of the meteor fall and mutate whatever they hit
        const targets = this.spawn.creatures
          .filter((c) => !c.frozen && c.hittable && isCreature(c.def) && c.variant === 'normal' && c.x > this.cam.x && c.x < this.cam.x + VIEW_W)
          .sort(() => this.rng() - 0.5)
          .slice(0, 4 + Math.floor(this.rng() * 4));
        for (const c of targets) {
          for (let k = 0; k < 8; k++) this.effects.spawn('spark', c.x + k * 3, c.y - 20 - k * 10, -40, 200, 0.25 + k * 0.03, '#b6ff3a', 2);
          c.mutate('mutant');
          this.effects.burst('ring', c.x, c.y, 1, 0, 0.6, ['#b6ff3a'], c.w);
        }
        this.effects.flash = 0.5;
        this.onBanner('CHUVA DE METEOROS!', `${targets.length} bichos viraram mutantes (valem 3×)`, '#b6ff3a');
        this.audio.play('shock');
        break;
      }
      case 'flashOrder': {
        const counts = new Map<string, number>();
        for (const c of this.spawn.creatures) {
          if (c.frozen || !c.hittable || !isCreature(c.def) || c.def.behavior === 'predator') continue;
          if (c.x < this.cam.x - 100 || c.x > this.cam.x + VIEW_W + 100) continue;
          counts.set(c.def.id, (counts.get(c.def.id) ?? 0) + 1);
        }
        const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        if (!best) return;
        const def = SPECIES_BY_ID[best[0]];
        const need = Math.min(6, Math.max(3, Math.round(best[1] * 0.6)));
        const reward = Math.round(def.baseValue * need * 4 * this.valueMult);
        this.flash = { speciesId: def.id, name: def.name, need, got: 0, t: 12, reward };
        this.onBanner('PEDIDO RELÂMPAGO!', `Capture ${need} ${def.name} em 12s · paga $${reward.toLocaleString('pt-BR')}`, '#6cf27a');
        this.audio.play('click');
        break;
      }
      case 'current':
        this.current = { t: CONFIG.events.currentSeconds, dir: 1 };
        this.onBanner('CORRENTEZA! →', 'O mar te empurra para águas mais fundas', '#7ad8ff');
        this.audio.play('escape');
        break;
      case 'shark': {
        const fromLeft = this.rng() < 0.5;
        const x = fromLeft ? this.cam.x - 60 : this.cam.x + VIEW_W + 60;
        this.spawn.spawnSpecial(SPECIES_BY_ID[depth > 1500 ? 'tigerShark' : this.rng() < 0.5 ? 'reefShark' : 'hammerShark'], 'normal', x, this.reachY(x) - 20, fromLeft ? 1 : -1);
        this.onBanner('TUBARÃO!', 'Ele devora os bichos pequenos e cresce — pegue-os antes!', '#ff6a5a');
        this.audio.play('resist');
        break;
      }
    }
  }

  private updateFlash(dt: number): void {
    const f = this.flash;
    if (!f) return;
    f.t -= dt;
    if (f.t <= 0) {
      this.flash = null;
      this.onBanner('PEDIDO PERDIDO', `Faltaram ${f.need - f.got} ${f.name}`, '#c8d8e0');
    }
  }

  private flashProgress(): void {
    const f = this.flash!;
    f.got++;
    if (f.got < f.need) return;
    this.flash = null;
    this.runCoins += f.reward;
    this.effects.coinFly(VIEW_W / 2, 60, 10);
    this.onBanner('PEDIDO ENTREGUE!', `+$${f.reward.toLocaleString('pt-BR')}`, '#6cf27a');
    this.audio.play('bonus');
  }

  private updateCreatures(dt: number): void {
    const cx = this.cam.x + VIEW_W / 2;
    const freeze = CONFIG.spawn.freezeDistance;
    for (const s of this.spawn.schools) if (Math.abs(s.x - cx) < freeze) updateSchool(s, dt, this.terrain, this.rng);
    this.events.length = 0;
    const drift = this.current.t > 0 ? this.current.dir * CONFIG.events.currentPush * 0.7 * dt : 0;
    for (const c of this.spawn.creatures) {
      c.frozen = Math.abs(c.x - cx) > freeze && c.def.behavior !== 'predator';
      if (c.frozen || c === this.fight?.target) continue;
      c.update(dt, this.terrain, this.events);
      if (drift && !c.onFloor && c.state !== 'CAPTURED') c.x += drift;
      if (c.def.behavior === 'predator') this.predatorFeed(c);
    }
    for (const e of this.events) this.creatureEvent(e);
    this.terrain.prune(this.terrain.chunkIndex(cx));
  }

  /** The shark eats small creatures it swims through, and leaves eventually. */
  private predatorFeed(shark: Creature): void {
    if (shark.state === 'CAPTURED') return;
    if (Math.abs(shark.x - (this.cam.x + VIEW_W / 2)) > VIEW_W) {
      shark.removed = true;
      return;
    }
    const mouthX = shark.x + shark.facing * shark.w * 0.4;
    for (const c of this.spawn.creatures) {
      if (c === shark || c.removed || c.state === 'CAPTURED' || !isCreature(c.def) || c.def.behavior === 'predator') continue;
      if (RARITIES.indexOf(c.def.rarity) > 1 || c.onFloor) continue;
      if (Math.abs(c.x - mouthX) < 8 + c.w / 2 && Math.abs(c.y - shark.y) < shark.h / 2 + c.h / 2) {
        c.removed = true;
        shark.feed();
        this.feedRage(shark.x, 2);
        this.effects.text(shark.x, shark.y - shark.h, `NHAC! ${shark.meals}/8 · ×${shark.trophyMult.toFixed(1)}`, '#ffb36a', true);
        this.effects.burst('ring', shark.x, shark.y, 1, 0, 0.5, ['#ffb36a'], shark.w * 0.6);
        this.effects.burst('bubble', c.x, c.y, 6, 30, 0.8, ['#e8ffff']);
      }
    }
  }

  private creatureEvent(e: CreatureEvent): void {
    const fx = this.effects;
    switch (e.type) {
      case 'ink':
        for (let i = 0; i < 16; i++) fx.spawn('ink', e.x - e.dir * 4 + (Math.random() - 0.5) * 8, e.y + (Math.random() - 0.5) * 8, -e.dir * (10 + Math.random() * 30), (Math.random() - 0.5) * 20, 1.6 + Math.random(), i % 3 ? '#2a1238' : '#4a2060', 2 + Math.round(Math.random() * 2));
        break;
      case 'blink':
        fx.burst('ring', e.x, e.y, 1, 0, 0.5, ['#ff7ff5'], 14);
        fx.burst('spark', e.x, e.y, 8, 50, 0.4, ['#ffffff', '#ff4fa3']);
        break;
      case 'dash':
        for (let i = 0; i < 4; i++) fx.spawn('bubble', e.x - e.dir * 6, e.y + (Math.random() - 0.5) * 6, -e.dir * 20, -10, 0.8, '#e8ffff', 1);
        break;
      case 'burrow':
        fx.burst('dust', e.x, e.y + 3, 8, 30, 0.7, [paletteAt(e.x).sand, paletteAt(e.x).sandLight], 2);
        break;
    }
  }

  private ambientBubbles(dt: number): void {
    if (Math.random() < dt * 1.5) {
      const x = this.cam.x + Math.random() * VIEW_W;
      const y = this.terrain.seabedY(x) - 2;
      for (let i = 0; i < 3; i++) this.effects.spawn('bubble', x + (Math.random() - 0.5) * 3, y - i * 3, 0, -12 - Math.random() * 10, 3 + Math.random() * 2, '#d8ffff', Math.random() < 0.4 ? 2 : 1);
    }
  }

  /** Queue actions so tools obey pause and the game update order. */
  queueTool(tool: 'net' | 'harpoon'): void {
    if (this.mode === 'playing') this.toolQueued = tool;
  }
  tapFight(): void { if (this.mode === 'playing' && this.fight) this.fightTapQueued = true; }

  private useTool(tool: 'net' | 'harpoon'): void {
    if (this.fight) return;
    const net = tool === 'net';
    if (this.save.prestiges < (net ? 1 : 2) || (net ? this.netCooldown : this.harpoonCooldown) > 0) return;
    const x = this.cam.x + this.aimScreenX();
    const floor = this.terrain.seabedY(x);
    const y = this.pathMode ? floor - 65 : this.cam.y + this.input.aimY;
    if (net) {
      this.netCooldown = 10 * this.stats.toolCooldown;
      const hits = this.spawn.creatures.filter(c => !c.frozen && c.hittable && Math.hypot(c.x - x, c.y - y) < 65)
        .sort((a,b) => Math.hypot(a.x-x,a.y-y) - Math.hypot(b.x-x,b.y-y)).slice(0, 6);
      for (const c of hits) {
        if (c.captureRequirement <= this.stats.strength * 0.8 && c.def.behavior !== 'predator' && RARITIES.indexOf(c.def.rarity) < 4) this.captureCreature(c, false, this.time * 1000, c.y - 10);
        else c.stun(1.5);
      }
      this.effects.text(x,y-12,'REDE!', '#7affea', true);
      this.effects.burst('ring', x,y,3,15,0.9,['#7affea','#ffffff'],65);
    } else {
      this.harpoonCooldown = 7 * this.stats.toolCooldown;
      if (this.boss && !this.boss.defeated && Math.hypot(this.boss.x-x,this.boss.y-y) < 90) {
        if (this.stats.strength >= this.boss.def.strength) {
          const defeated = this.boss.hitWeak();
          this.weakPointsHit++;
          this.save.bossDamage[this.boss.def.id] = this.boss.damage;
          if (defeated) this.defeatBoss(this.boss.def);
          this.persist();
        }
      } else {
        const c = this.spawn.creatures.filter(c => !c.frozen && c.hittable && Math.hypot(c.x-x,c.y-y)<65)
          .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
        if (c) { c.stun(3); c.weakened = 5; }
      }
      this.effects.text(x,y-12,'ARPÃO!', '#ffb36a', true);
      for(let i=0;i<12;i++) this.effects.spawn('spark',x,y-i*6,0,100,0.4,'#ffb36a',2);
    }
    this.effects.shake = 4;
    this.audio.play('strike');
  }

  // ───────────────────────── baits

  private baitHud(): { name: string; count: number; color: string } {
    const def = BAITS_BY_ID[this.save.selectedBait] ?? BAITS[0];
    return { name: def.name, count: this.save.baits[def.id] ?? 0, color: def.color };
  }

  /** Next bait type the player owns. */
  cycleBait(): void {
    const owned = BAITS.filter((b) => (this.save.baits[b.id] ?? 0) > 0);
    if (!owned.length) return;
    const i = owned.findIndex((b) => b.id === this.save.selectedBait);
    this.save.selectedBait = owned[(i + 1) % owned.length].id;
    this.audio.play('click');
  }

  throwBait(): void {
    if (this.mode !== 'playing') return;
    let def = BAITS_BY_ID[this.save.selectedBait];
    if (!def || (this.save.baits[def.id] ?? 0) <= 0) {
      const any = BAITS.find((b) => (this.save.baits[b.id] ?? 0) > 0);
      if (!any) {
        this.effects.text(this.claw.x, this.cam.y + 60, 'SEM ISCAS! COMPRE NA OFICINA', '#ff6a5a');
        this.audio.play('miss');
        return;
      }
      def = any;
      this.save.selectedBait = any.id;
    }
    if (this.baits.length >= CONFIG.bait.maxActive) this.baits.shift();
    this.save.baits[def.id]--;
    this.persist();
    const x = this.cam.x + this.aimScreenX();
    const floor = this.terrain.seabedY(x);
    // a bait can't sink past the cable: deep creatures have to come up to it
    const targetY = Math.min(this.pathMode ? floor - 34 : Math.min(floor - 4, this.cam.y + Math.max(60, this.input.aimY)), this.reachY(x) - 4);
    this.baits.push({ def, x, y: this.cam.y + CONFIG.claw.restTipY + 6, targetY, t: def.seconds * this.stats.baitMult, sinking: true, callTimer: 0.6, called: 0 });
    this.effects.text(x, this.cam.y + 50, `${def.name.toUpperCase()}!`, def.color);
    this.audio.play('strike');
  }

  private updateBaits(dt: number): void {
    for (let i = this.baits.length - 1; i >= 0; i--) {
      const b = this.baits[i];
      if (b.sinking) {
        b.y += CONFIG.bait.sinkSpeed * dt;
        if (b.y >= b.targetY) {
          b.y = b.targetY;
          b.sinking = false;
          this.effects.burst('ring', b.x, b.y, 1, 0, 0.6, [b.def.color], 30);
        }
        continue;
      }
      b.t -= dt;
      if (b.t <= 0) {
        this.baits.splice(i, 1);
        continue;
      }
      // scent trail
      if (Math.random() < dt * 8) this.effects.spawn('bubble', b.x + (Math.random() - 0.5) * 6, b.y - 2, (Math.random() - 0.5) * 8, -14, 1.4, b.def.color, 1);
      for (const c of this.spawn.creatures) {
        if (c.frozen || !c.hittable || c.state === 'CAPTURED') continue;
        if (Math.abs(c.x - b.x) > b.def.radius || !baitAttracts(b.def, c.def)) continue;
        c.lureX = b.x;
        c.lureY = b.y;
        c.lureT = 0.35;
        if (b.def.weaken) {
          c.weakened = 0.6;
          c.reactTimer = c.reactTimer > 0 ? Math.max(c.reactTimer, 0.25) : c.reactTimer;
          if (Math.random() < dt * 5) this.effects.spawn('spark', c.x, c.y, 0, -12, 0.5, b.def.color);
        }
      }
      // call more of the right creatures in from the edges
      b.callTimer -= dt;
      if (b.callTimer <= 0 && b.called < b.def.calls + Math.round((this.stats.baitMult - 1) * 4)) {
        b.callTimer = CONFIG.bait.callEvery;
        b.called++;
        this.callForBait(b, depthAt(b.x));
      }
    }
  }

  private callForBait(b: ActiveBait, depth: number): void {
    if (b.def.chum && b.called === 1) {
      const fish = SPECIES_BY_ID[depth >= 900 ? 'lanternFish' : 'orangeFish'];
      for (let i = 0; i < 8 && this.spawn.alive < this.spawn.cap + 6; i++) {
        const c = this.spawn.spawnSpecial(fish, 'normal', b.x + 65 + i * 7, b.y - 15 + (i % 3) * 7, -1);
        c.lureX = b.x; c.lureY = b.y; c.lureT = 2;
      }
      const shark = SPECIES_BY_ID[depth >= 1500 ? 'tigerShark' : depth >= 300 ? 'hammerShark' : 'reefShark'];
      if (this.spawn.alive < this.spawn.cap + 10) {
        const c = this.spawn.spawnSpecial(shark, 'normal', b.x - 80, b.y, 1);
        c.lureX = b.x; c.lureY = b.y; c.lureT = 2;
      }
      this.effects.burst('ring', b.x, b.y, 1, 0, 0.8, [b.def.color], 80);
      return;
    }
    let def = null;
    if (b.def.species.includes('*')) def = pickSpecies(depth, biomeIndexAt(b.x), this.stats.luck, this.rng);
    else {
      const pool = b.def.species
        .map((id) => SPECIES_BY_ID[id])
        .filter((sp) => sp && sp.id !== 'hammerShark' && depth >= sp.minDepth * 0.7 && depth <= sp.maxDepth * 1.2 && (sp.rarity !== 'legendary' || depth >= sp.minDepth));
      // squid bait sometimes lures a shark
      if (b.def.species.includes('hammerShark') && this.rng() < 0.18) pool.push(SPECIES_BY_ID.hammerShark);
      if (pool.length) def = pool[Math.floor(this.rng() * pool.length)];
    }
    if (!def || this.spawn.alive >= this.spawn.cap + 6) return;
    const variant = b.def.variant && this.rng() < (b.def.variantChance ?? 0) ? b.def.variant : pickVariant(def, depth, this.stats.variantMult, this.rng);
    const fromLeft = b.x - this.cam.x > VIEW_W / 2 ? false : true;
    const x = fromLeft ? this.cam.x - 30 : this.cam.x + VIEW_W + 30;
    const floor = this.terrain.seabedY(x);
    const c = this.spawn.spawnSpecial(def, variant, x, def.behavior === 'crawler' || def.behavior === 'burrower' ? null : floor - 40 - this.rng() * 50, fromLeft ? 1 : -1);
    c.lureX = b.x;
    c.lureY = b.y;
    c.lureT = 0.5;
  }

  // ───────────────────────── strike & contact

  /** Touch play: no tapping on targets; the claw dives down its own column. */
  get pathMode(): boolean {
    return this.input.touchMode;
  }

  private aimScreenX(): number {
    // touch: the claw rides the rail focus (centered, or off-center at the world edge)
    return this.pathMode ? this.cam.focusScreenX : this.input.aimX;
  }

  private tryStrike(restY: number): void {
    const stats = this.stats;
    const wx = this.cam.x + this.aimScreenX();
    // the mouth stops at the sand or at the end of the cable, whichever comes first
    const limit = this.reachY(wx);
    const wy = this.pathMode ? limit : Math.min(this.cam.y + this.input.aimY, limit);
    if (!this.claw.trigger(wx, wy, restY)) return;
    this.audio.play('strike');
    this.perceivers = [];
    const magnet = stats.claw.tags.includes('magnet');
    // a column dive is harder to read than a point strike, and Furtividade slows every reaction
    const react = stats.claw.reactionMult * stats.stealth * (this.pathMode ? 1.2 : 1);
    for (const c of this.spawn.creatures) {
      if (c.frozen || c.removed) continue;
      c.fled = false;
      // in path mode the threat is the whole column, felt at the creature's own height
      const ty = this.pathMode ? Math.max(restY, Math.min(wy, c.y)) : wy;
      if (c.notifyStrike(wx, ty, react)) this.perceivers.push(c);
      if (magnet && c.hittable && Math.abs(c.x - wx) < 46 && Math.abs(c.x - wx) > 2) {
        c.pullX = wx;
        c.pullT = 0.35;
        this.effects.spawn('spark', c.x, c.y, (wx - c.x) * 2, 0, 0.3, '#7aa8ff');
      }
    }
  }

  private resolveContact(): void {
    const stats = this.stats;
    const claw = this.claw;
    const x = claw.x;
    const y = claw.targetY;
    const fx = this.effects;
    const nowMs = this.time * 1000;
    const floor = this.terrain.seabedY(x);
    this.audio.play('clamp');
    fx.shake = Math.max(fx.shake, stats.claw.tags.includes('heavy') ? 4 : 2.5);
    fx.burst('spark', x, y, 6, 70, 0.25, ['#ffffff', stats.claw.look.metalLight]);
    if (y >= floor - 3) {
      const p = paletteAt(x);
      fx.burst('dust', x, floor - 1, 10, 40, 0.8, [p.sand, p.sandLight], 2);
    }
    if (this.contactBoss(x, y)) return;

    // electric discharge / mutant spores stun around the impact
    if (stats.claw.stunMs > 0) {
      for (const c of this.spawn.creatures) {
        if (!c.hittable || c.frozen) continue;
        if (Math.hypot(c.x - x, c.y - y) <= stats.claw.stunRadius) c.stun(stats.claw.stunMs / 1000);
      }
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * stats.claw.stunRadius;
        fx.spawn('bolt', x + Math.cos(a) * r, y + Math.sin(a) * r, 0, 0, 0.3, stats.claw.look.accent);
      }
    }
    // gravitational collapse drags everything nearby into the mouth
    if (stats.claw.tags.includes('gravity')) {
      for (const c of this.spawn.creatures) {
        if (!c.hittable || c.frozen) continue;
        if (Math.hypot(c.x - x, c.y - y) <= 48) {
          c.x += (x - c.x) * 0.85;
          c.y += (y - c.y) * 0.85;
        }
      }
      fx.burst('ring', x, y, 1, 0, 0.4, ['#ffe14a'], 48);
    }

    const candidates = this.spawn.creatures.filter((c) => !c.frozen);
    const hits = resolveStrike(x, y, stats.opening, stats.precision, candidates, stats.maxTargets, CONFIG.economy.perfectRadiusFrac);
    if (hits.length && stats.dual > 0) {
      hits.push(...resolveStrike(x + 38, y, stats.opening, stats.precision, candidates.filter(c => !hits.some(h => h.target === c)), stats.dual, CONFIG.economy.perfectRadiusFrac));
      fx.burst('ring', x + 38, y, 1, 0, 0.35, ['#7affea'], stats.opening);
    }
    // mutant tentacles grab up to two neighbours as well
    if (hits.length && stats.claw.tags.includes('tentacle')) {
      const extra = resolveStrike(x, y, stats.opening + 16, 0, candidates.filter((c) => !hits.some((h) => h.target === c)), 2, 0);
      if (extra.length) fx.text(x, y + 14, 'TENTÁCULOS!', '#b6ff3a');
      hits.push(...extra);
    }

    if (!hits.length) {
      const escaped = this.perceivers.some((c) => !c.removed && c.fled && Math.hypot(c.x - x, c.y - y) < stats.opening + 60);
      if (escaped) {
        fx.text(x, y - 10, 'ESCAPOU!', '#ffb36a');
        this.audio.play('escape');
      } else {
        fx.text(x, y - 10, 'ERROU!', '#c8d8e0');
        this.audio.play('miss');
      }
      this.combo.miss();
      for (const c of this.spawn.creatures) if (!c.frozen) c.alarm(x, y);
      return;
    }

    let captured = 0;
    let resisted = 0;
    let requiredStrength = 0;
    let textY = y - 12;
    for (const h of hits) {
      const c = h.target;
      const req = c.captureRequirement * (c.state === 'STUNNED' ? 0.75 : 1);
      const trophy = (c.variant === 'giant' && (c.def.mass >= 2 || req > stats.strength * 0.6)) || RARITIES.indexOf(c.def.rarity) >= 4 || c.meals >= 3;
      if (!this.fight && stats.grip > 0 && trophy && req <= stats.strength * (1.25 + stats.grip * 0.05)) {
        this.fight = { target: c, game: new Struggle(stats.grip, Math.max(0, req / stats.strength)), perfect: h.perfect };
        c.reactTimer = -1;
        this.onBanner('DISPUTA DE CAPTURA!', 'Toque em FISGAR ou clique quando o marcador estiver no verde. O relógio continua!', '#ffe14a');
        this.effects.burst('ring', c.x, c.y, 1, 0, 0.7, ['#ffe14a'], c.w);
        break;
      }
      if (req > stats.strength) {
        resisted++;
        requiredStrength = Math.max(requiredStrength, req);
        c.shove(Math.sign(c.x - x) || 1);
        fx.burst('spark', c.x, c.y, 5, 60, 0.3, ['#ff6a5a', '#ffd0a0']);
        if (c.def.special.includes('bite') && !stats.claw.tags.includes('biteproof')) {
          claw.extraCooldownMs += 900;
          fx.text(x, y + 12, 'MORDIDA!', '#ff4a5a', true);
          fx.shake = 6;
          this.vibrate(80);
        }
        continue;
      }
      this.captureCreature(c, h.perfect, nowMs, textY);
      captured++;
      textY -= 9;
    }
    if (resisted) {
      fx.text(x, y - (captured ? 30 : 12), `RESISTIU! Força ${stats.strength.toFixed(2)} / ${requiredStrength.toFixed(2)}`, '#ff6a5a');
      if (!captured) {
        this.audio.play('resist');
        this.combo.miss();
      }
    }
  }

  private captureCreature(c: Creature, perfectHit: boolean, nowMs: number, textY: number, auto = false): void {
    const stats = this.stats;
    const fx = this.effects;
    const creature = isCreature(c.def);
    c.capture();
    // automatic claws carry their own prey and don't touch the player's combo
    if (!auto) {
      this.claw.held.push(c);
      this.hitStop = 0.045;
    }
    const comboBonus = auto ? 0 : this.combo.hit(nowMs);
    this.bestCombo = Math.max(this.bestCombo, this.combo.count);
    const perfect = perfectHit ? stats.perfectBonus : 0;
    const depth = depthAt(c.x);
    const frenzyMult = this.frenzy > 0 ? CONFIG.frenzy.valueMult : 1;
    const tideMult = this.tide() > 0 ? CONFIG.run.finalTideMult : 1;
    // collectors are paid: every variant of a species you own makes it worth +5%
    const rec = this.save.species[c.def.id];
    const collected = new Set([...(rec?.variants ?? []), ...[...this.seenVariants].filter((k) => k.startsWith(c.def.id + '|')).map((k) => k.split('|')[1])]);
    const newVariant = creature && c.variant !== 'normal' && !collected.has(c.variant);
    if (creature) this.seenVariants.add(`${c.def.id}|${c.variant}`);
    const collectMult = 1 + 0.05 * Math.max(0, collected.size - 1);
    const value = captureValue(c.def, c.variant, depth, comboBonus, perfect, this.valueMult * frenzyMult * tideMult * collectMult * c.trophyMult);
    this.runCoins += value;
    const kg = catchKg(c.def, c.variant) * stats.kgMult * c.trophyMult;
    this.runKg = Math.round((this.runKg + kg) * 10) / 10;
    this.captures.push({ speciesId: c.def.id, variant: c.variant, value, rarity: c.def.rarity });
    const tier = RARITIES.indexOf(c.def.rarity);

    if (!creature) {
      fx.text(c.x, textY, 'TESOURO!', '#ffd84a', true);
      if (this.rng() < CONFIG.chest.hourglassChance) {
        this.addTime(CONFIG.run.hourglassSeconds);
        fx.text(c.x, textY - 20, `AMPULHETA! +${CONFIG.run.hourglassSeconds}s`, '#7aff8a', true, 1.2);
      }
      if (this.rng() < CONFIG.chest.starChance) {
        this.runStars++;
        fx.text(c.x, textY - 10, '+1★', '#ffe14a', true);
      }
      this.audio.play('bonus');
    } else {
      const known = (this.save.species[c.def.id]?.caught ?? 0) > 0 || this.newSpecies.includes(c.def.id);
      if (newVariant && known) {
        this.runStars++;
        fx.text(c.x, textY - 10, `VARIANTE NOVA! +1★`, '#ffe14a', true, 1.2);
        this.onBanner(`VARIANTE NOVA: ${c.def.name.toUpperCase()} ${VARIANTS[c.variant].label.toUpperCase()}`, '+1★ · registrada no catálogo', '#ffe14a');
      }
      if (!known) {
        this.newSpecies.push(c.def.id);
        fx.text(c.x, textY, 'ESPÉCIE NOVA!', '#ffe14a', true, 1.3);
        this.audio.play('newSpecies');
      } else if (!auto) {
        fx.text(c.x, textY, perfectHit && perfect > 0 ? 'PERFEITO!' : 'CAPTURADO!', perfectHit ? '#7affea' : '#ffffff');
        this.audio.play('capture');
      }
      // legendary and anomalous prey are the rare in-dive way to earn time
      if (tier >= 4) {
        this.addTime(CONFIG.run.legendaryBonusSeconds);
        fx.text(c.x, textY - 20, `+${CONFIG.run.legendaryBonusSeconds}s`, '#7aff8a', true, 1.2);
      }
      this.orderEvent({ type: 'capture', speciesId: c.def.id, rarity: c.def.rarity, variant: c.variant, meals: c.meals });
      if (this.flash && this.flash.speciesId === c.def.id) this.flashProgress();
      this.feedRage(c.x);
    }
    const variantLabel = VARIANTS[c.variant].label;
    const extra = [variantLabel ? variantLabel.toUpperCase() : '', this.combo.count > 1 ? `COMBO x${this.combo.count}` : '', frenzyMult > 1 ? 'FRENESI' : '']
      .filter(Boolean)
      .join(' · ');
    fx.text(c.x, textY + 18, `+$${value}${kg ? ` · ${kg.toLocaleString('pt-BR')}kg` : ''}${extra ? '  ' + extra : ''}`, tier >= 2 || c.variant !== 'normal' ? RARITY_COLOR[c.def.rarity] : '#ffe680');
    this.audio.play('coin');
    this.effects.coinFly(c.x - this.cam.x, c.y - this.cam.y, Math.min(auto ? 2 : 6, 1 + Math.floor(value / 40)));
    if (!auto) this.vibrate(15);
    this.orderEvent({ type: 'combo', count: this.combo.count });
    this.orderEvent({ type: 'run', captures: this.captures.length, coins: this.runCoins });

    // frenzy kicks in on a hot streak
    if (this.combo.count === CONFIG.frenzy.combo && this.frenzy <= 0) {
      this.frenzy = stats.frenzySeconds;
      this.claw.haste = CONFIG.frenzy.haste;
      this.onBanner('FRENESI!', `golpes ultrarrápidos e valor ×${CONFIG.frenzy.valueMult} por ${stats.frenzySeconds}s`, '#ff9a1f');
      this.audio.play('bonus');
      this.vibrate([30, 30, 30]);
    }

    if (c.def.special.includes('shock') && !stats.claw.tags.includes('shockproof')) {
      this.claw.extraCooldownMs += 450;
      fx.text(this.claw.x, this.claw.targetY + 14, 'CHOQUE!', '#7affff');
      for (let i = 0; i < 10; i++) fx.spawn('bolt', this.claw.x + (Math.random() - 0.5) * 16, this.claw.targetY + (Math.random() - 0.5) * 16, 0, -20, 0.4, '#bfffff');
      this.audio.play('shock');
    }
    if (tier >= 2) fx.flash = Math.max(fx.flash, 0.4 + tier * 0.1);
    fx.burst('star', c.x, c.y, 6 + tier * 2, 60, 0.45, ['#ffffff', RARITY_COLOR[c.def.rarity], '#ffe14a']);
  }

  /** Taking creatures from a guardian's biome slowly wakes it up. */
  private feedRage(x: number, amount = 1): void {
    const nb = nextBoss(this.save.bosses);
    if (!nb || bossAwake(nb, this.save.bossRage) || biomeIndexAt(x) < bossBiome(nb)) return;
    this.save.bossRage[nb.id] = (this.save.bossRage[nb.id] ?? 0) + amount;
    if (bossAwake(nb, this.save.bossRage)) {
      this.onBanner(`${nb.name.toUpperCase()} ACORDOU!`, 'Você tirou comida demais do território dele. Ele está vindo até você!', '#ff6a5a');
      this.audio.play('resist');
      this.effects.shake = 8;
      this.vibrate([60, 60, 120]);
    }
  }

  /** Platform x the automatic claws hang from (the rail, not the aim). */
  platformX(): number {
    return this.cam.x + this.cam.focusScreenX;
  }

  /** Automatic claws: each one watches its own column and snaps at whatever passes. */
  private updateAutoClaws(dt: number): void {
    if (!this.autoClaws.length) return;
    const stats = this.stats;
    const rest = this.cam.y + CONFIG.claw.restTipY - 4;
    const px = this.platformX();
    const r = Math.max(5, stats.opening * 0.8);
    for (const a of this.autoClaws) {
      const x = px + a.offset;
      if (a.state === 'idle') {
        a.tipY = rest;
        a.cd -= dt;
        if (a.cd > 0) continue;
        const limit = this.reachY(x);
        let best: Creature | null = null;
        for (const c of this.spawn.creatures) {
          if (c.frozen || !c.hittable || c === this.fight?.target) continue;
          if (Math.abs(c.x - x) > r + c.w * 0.4 || c.y < rest + 6 || c.y > limit + c.h * 0.4) continue;
          if (!best || c.y < best.y) best = c;
        }
        if (!best) {
          a.cd = 0.15;
          continue;
        }
        a.target = best;
        a.targetY = Math.min(best.y, limit);
        a.state = 'down';
        a.t = 0;
        continue;
      }
      a.t += dt;
      if (a.state === 'down') {
        const k = Math.min(1, a.t / AUTO_DOWN);
        a.tipY = rest + (a.targetY - rest) * k * k;
        if (k < 1) continue;
        const c = a.target;
        a.target = null;
        if (c && c.hittable && Math.abs(c.x - x) <= r + c.w * 0.45 && Math.abs(c.y - a.tipY) <= r + c.h * 0.45) {
          if (c.captureRequirement <= stats.strength) {
            this.captureCreature(c, false, this.time * 1000, c.y - 10, true);
            a.held = c;
          } else {
            c.shove(Math.sign(c.x - x) || 1);
            this.effects.burst('spark', c.x, c.y, 3, 40, 0.25, ['#ff6a5a']);
          }
        }
        this.effects.burst('spark', x, a.tipY, 3, 40, 0.2, ['#ffffff', '#7affea']);
        a.state = 'up';
        a.t = 0;
      } else {
        const k = Math.min(1, a.t / AUTO_UP);
        a.tipY = a.targetY + (rest - a.targetY) * k;
        if (a.held) {
          a.held.x = x;
          a.held.y = a.tipY + a.held.h * 0.25;
        }
        if (k < 1) continue;
        if (a.held) a.held.removed = true;
        a.held = null;
        a.state = 'idle';
        a.cd = stats.autoCooldown * (0.85 + this.rng() * 0.3);
      }
    }
  }

  private deliverHeld(): void {
    for (const c of this.claw.held) {
      c.removed = true;
      this.effects.burst('spark', c.x, this.cam.y + CONFIG.claw.restTipY + 4, 4, 40, 0.3, ['#ffe680']);
    }
    this.claw.held = [];
  }

  // ───────────────────────── render

  private sonarTarget(): { x: number; y: number; color: string } | null {
    const range = this.stats.sonarRange;
    if (range <= 0 || this.mode !== 'playing') return null;
    let best: Creature | null = null;
    let bestD = Infinity;
    const cx = this.cam.x + VIEW_W / 2;
    for (const c of this.spawn.creatures) {
      if (c.removed || c.state === 'CAPTURED') continue;
      if (RARITIES.indexOf(c.def.rarity) < 2 && c.variant !== 'golden') continue;
      const sx = c.x - this.cam.x;
      if (sx >= 0 && sx <= VIEW_W) continue;
      const d = Math.abs(c.x - cx);
      if (d < range && d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (!best) return null;
    return { x: best.x - this.cam.x, y: best.y - this.cam.y, color: RARITY_COLOR[best.def.rarity] };
  }

  private render(): void {
    const playing = this.mode === 'playing' || this.mode === 'paused';
    const warn = playing && this.timeLeft <= CONFIG.run.warnSeconds ? 0.5 + 0.5 * Math.sin(this.time * 10) : 0;
    this.renderer.render({
      cam: this.cam,
      terrain: this.terrain,
      time: this.time,
      creatures: this.spawn.creatures,
      claw: this.claw,
      stats: this.stats,
      effects: this.effects,
      aimX: this.input.aimX,
      aimY: this.input.aimY,
      showReticle: playing,
      path: playing && this.pathMode ? this.pathPreview() : null,
      sonar: this.sonarTarget(),
      warn,
      boss: this.boss,
      barrierX: null,
      current: this.current.t > 0 ? Math.min(1, this.current.t) * this.current.dir : 0,
      frenzy: playing && this.frenzy > 0 ? this.frenzy / this.stats.frenzySeconds : 0,
      baits: playing ? this.baits : [],
      shots: playing ? this.shots : [],
      struggleTarget: playing ? this.fight?.target ?? null : null,
      reachAt: (x) => (playing ? this.reachY(x) : this.terrain.seabedY(x) - 1),
      platform: playing ? { x: this.platformX(), autos: this.autoClaws } : null,
      tide: playing ? this.tide() : 0,
    });
  }

  /** What the claw would grab right now if it dove down its column. */
  private pathPreview(): { x: number; floorY: number; target: { x: number; y: number; w: number; h: number } | null } {
    const x = this.claw.x;
    const floorY = this.reachY(x);
    if (this.claw.busy) return { x: x - this.cam.x, floorY: floorY - this.cam.y, target: null };
    const y0 = this.cam.y + CONFIG.claw.restTipY;
    const r = this.stats.opening + this.stats.precision;
    const hit = findPathHit(x, y0, floorY, this.stats.opening, this.stats.precision, this.spawn.creatures.filter((c) => !c.frozen));
    const bh = this.boss?.pathHit(x, y0, floorY, r) ?? null;
    let target: { x: number; y: number; w: number; h: number } | null = null;
    if (bh && (!hit || bh.y < hit.y)) {
      if (bh.kind === 'weak' && this.boss) {
        const p = this.boss.weakPointPos(this.boss.activeWeak);
        target = { x: p.x - this.cam.x, y: p.y - this.cam.y, w: 10, h: 10 };
      }
    } else if (hit) {
      target = { x: hit.target.x - this.cam.x, y: hit.target.y - this.cam.y, w: hit.target.w, h: hit.target.h };
    }
    return { x: x - this.cam.x, floorY: (bh && bh.kind === 'body' && (!hit || bh.y < hit.y) ? bh.y : floorY) - this.cam.y, target };
  }

  /** Test/debug helper: visible creatures in view coordinates. */
  debugVisible(): { x: number; y: number; id: string; state: string }[] {
    return this.spawn.creatures
      .filter((c) => !c.removed && c.hittable)
      .map((c) => ({ x: c.x - this.cam.x, y: c.y - this.cam.y, id: c.def.id, state: c.state }))
      .filter((c) => c.x > 0 && c.x < VIEW_W && c.y > 30 && c.y < VIEW_H);
  }
}

