import { CONFIG, VIEW_H, VIEW_W } from '../config';
import { BAITS, BAITS_BY_ID, baitAttracts, type BaitDef } from '../entities/Baits';
import { BOSSES, Boss, CHECKPOINTS, bossAwake, checkpointUnlocked, nextBoss, type BossDef } from '../entities/Boss';
import { Claw, type ClawState } from '../entities/Claw';
import { updateSchool, type Creature, type CreatureEvent } from '../entities/Creature';
import { findPathHit, resolveStrike } from '../entities/Hit';
import { RARITIES, RARITY_COLOR, SPECIES_BY_ID, VARIANTS, isCreature, type Rarity, type VariantId } from '../entities/Species';
import { Effects } from '../render/Effects';
import { Renderer } from '../render/Renderer';
import { ComboTracker, captureValue, recordCapture, timeBonusFor } from '../systems/Economy';
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

export type EventKind = 'goldenSchool' | 'current' | 'shark';

export class Game {
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
  private barrierHint = 0;
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
    this.barrierHint = 0;
    this.valueMult = this.stats.valueMult * (1 + collectionBonus(this.save) + licenseBonus(this.save.quota.license));
    this.runCommitted = false;
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

    this.updateBoss(dt);
    this.updateShots(dt);
    this.updateEvents(dt);

    // aim + strike (touch: the claw stays centered and dives down its column)
    const k = 1 - Math.pow(0.0001, dt);
    this.aimSX += (this.aimScreenX() - this.aimSX) * k;
    const restY = this.cam.y + CONFIG.claw.restTipY;
    if (this.input.consumeBaitCycle()) this.cycleBait();
    if (this.input.consumeBait()) this.throwBait();
    this.updateBaits(dt);
    if (this.input.consumeStrike() || this.claw.takeBuffered()) this.tryStrike(restY);
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
    if (this.claw.contactPending) this.resolveContact();
    if (this.prevClawState === 'RETRACT' && this.claw.state === 'COOLDOWN') this.deliverHeld();
    this.prevClawState = this.claw.state;

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
    });
  }

  // ───────────────────────── guardians

  /** The next undefeated guardian blocks the way: the claw rail can't pass it. */
  private applyBarrier(): void {
    const nb = nextBoss(this.save.bosses);
    // the claw column must be able to sweep the whole guardian
    if (this.cam.clampFocus(nb ? nb.x + nb.w * 0.5 + 12 : Infinity) && nb && this.time - this.barrierHint > 6) {
      this.barrierHint = this.time;
      const left = nb.rage - (this.save.bossRage[nb.id] ?? 0);
      if (left > 0) this.onBanner(`${nb.name.toUpperCase()} DORME`, `A correnteza dele bloqueia o caminho. Capture mais ${left} bicho(s) deste bioma para provocá-lo.`, '#9fd8e8');
      else this.effects.text(this.cam.x + VIEW_W * 0.8, this.cam.y + 120, 'CORRENTEZA BLOQUEIA!', '#9fd8e8');
    }
  }

  private updateBoss(dt: number): void {
    const nb = nextBoss(this.save.bosses);
    const centerX = this.cam.x + VIEW_W / 2;
    if (!this.boss && nb && bossAwake(nb, this.save.bossRage) && Math.abs(nb.x - centerX) < 650) {
      this.boss = new Boss(nb, this.save.bossDamage[nb.id] ?? 0);
      if (!this.bossIntroShown.has(nb.id)) {
        this.bossIntroShown.add(nb.id);
        this.onBanner(`GUARDIÃO: ${nb.name.toUpperCase()}`, nb.intro, '#ff6a5a');
        this.audio.play('resist');
      }
    }
    const boss = this.boss;
    if (!boss) return;
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
    this.timeLeft += 10;
    this.bonusSeconds += 10;
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
      `${def.name} · +$${coins.toLocaleString('pt-BR')} · +${def.stars}★ · +10s${cp > 0 ? ` · novo ponto de partida: ${CHECKPOINTS[cp].name}` : ''}`,
      '#ffe14a',
    );
  }

  // ───────────────────────── random events

  private updateEvents(dt: number): void {
    this.eventTimer -= dt;
    if (this.eventTimer > 0) return;
    const e = CONFIG.events;
    this.eventTimer = e.minGap + this.rng() * (e.maxGap - e.minGap);
    if (this.boss && !this.boss.defeated) return; // keep guardian fights readable
    const depth = depthAt(this.cam.x + VIEW_W / 2);
    const options: [EventKind, number][] = [['goldenSchool', 3], ['current', 3], ['shark', depth > 30 ? 3 : 1]];
    let roll = this.rng() * options.reduce((a, o) => a + o[1], 0);
    let kind: EventKind = 'goldenSchool';
    for (const [k, w] of options) {
      if (roll < w) { kind = k; break; }
      roll -= w;
    }
    this.startEvent(kind);
  }

  startEvent(kind: EventKind): void {
    const floorX = this.cam.x + VIEW_W / 2;
    const depth = depthAt(floorX);
    switch (kind) {
      case 'goldenSchool': {
        const def = SPECIES_BY_ID[depth > 900 ? 'lanternFish' : 'orangeFish'];
        this.spawn.spawnSchool(def, 'golden', this.cam.x + VIEW_W + 50, 7, -1);
        this.onBanner('CARDUME DOURADO!', 'Peixes dourados valem 4× e dão segundos extras', '#ffd84a');
        this.audio.play('bonus');
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
        this.spawn.spawnSpecial(SPECIES_BY_ID.hammerShark, 'normal', x, this.terrain.seabedY(x) - 70, fromLeft ? 1 : -1);
        this.onBanner('TUBARÃO!', 'Ele devora os bichos pequenos — pegue-os antes!', '#ff6a5a');
        this.audio.play('resist');
        break;
      }
    }
  }

  private updateCreatures(dt: number): void {
    const cx = this.cam.x + VIEW_W / 2;
    const freeze = CONFIG.spawn.freezeDistance;
    for (const s of this.spawn.schools) if (Math.abs(s.x - cx) < freeze) updateSchool(s, dt, this.terrain, this.rng);
    this.events.length = 0;
    const drift = this.current.t > 0 ? this.current.dir * CONFIG.events.currentPush * 0.7 * dt : 0;
    for (const c of this.spawn.creatures) {
      c.frozen = Math.abs(c.x - cx) > freeze && c.def.behavior !== 'predator';
      if (c.frozen) continue;
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
        this.effects.text(c.x, c.y - 8, 'NHAC!', '#ff6a5a');
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
    const x = this.cam.x + this.aimScreenX();
    const floor = this.terrain.seabedY(x);
    const targetY = this.pathMode ? floor - 34 : Math.min(floor - 4, this.cam.y + Math.max(60, this.input.aimY));
    this.baits.push({ def, x, y: this.cam.y + CONFIG.claw.restTipY + 6, targetY, t: def.seconds * this.stats.baitMult, sinking: true, callTimer: 0.6, called: 0 });
    this.effects.text(x, this.cam.y + 50, `${def.name.toUpperCase()}!`, def.color);
    this.audio.play('strike');
  }

  private updateBaits(dt: number): void {
    const depth = depthAt(this.cam.x + VIEW_W / 2);
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
      }
      // call more of the right creatures in from the edges
      b.callTimer -= dt;
      if (b.callTimer <= 0 && b.called < b.def.calls + Math.round((this.stats.baitMult - 1) * 4)) {
        b.callTimer = CONFIG.bait.callEvery;
        b.called++;
        this.callForBait(b, depth);
      }
    }
  }

  private callForBait(b: ActiveBait, depth: number): void {
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
    if (!def || this.spawn.alive >= CONFIG.spawn.maxAlive + 6) return;
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
    const floor = this.terrain.seabedY(wx) - 1;
    // the mouth can't go through the seabed; in path mode it dives all the way down
    const wy = this.pathMode ? floor : Math.min(this.cam.y + Math.min(this.input.aimY, stats.reach), floor);
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
      const req = c.state === 'STUNNED' ? c.strengthReq * 0.75 : c.strengthReq;
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

  private captureCreature(c: Creature, perfectHit: boolean, nowMs: number, textY: number): void {
    const stats = this.stats;
    const fx = this.effects;
    const creature = isCreature(c.def);
    c.capture();
    this.claw.held.push(c);
    this.hitStop = 0.045;
    const comboBonus = this.combo.hit(nowMs);
    this.bestCombo = Math.max(this.bestCombo, this.combo.count);
    const perfect = perfectHit ? stats.perfectBonus : 0;
    const depth = depthAt(c.x);
    const frenzyMult = this.frenzy > 0 ? CONFIG.frenzy.valueMult : 1;
    const value = captureValue(c.def, c.variant, depth, comboBonus, perfect, this.valueMult * frenzyMult);
    this.runCoins += value;
    const kg = catchKg(c.def, c.variant) * stats.kgMult;
    this.runKg = Math.round((this.runKg + kg) * 10) / 10;
    this.captures.push({ speciesId: c.def.id, variant: c.variant, value, rarity: c.def.rarity });
    const tier = RARITIES.indexOf(c.def.rarity);

    if (!creature) {
      fx.text(c.x, textY, 'TESOURO!', '#ffd84a', true);
      if (this.rng() < CONFIG.chest.starChance) {
        this.runStars++;
        fx.text(c.x, textY - 10, '+1★', '#ffe14a', true);
      }
      this.audio.play('bonus');
    } else {
      const known = (this.save.species[c.def.id]?.caught ?? 0) > 0 || this.newSpecies.includes(c.def.id);
      if (!known) {
        this.newSpecies.push(c.def.id);
        fx.text(c.x, textY, 'ESPÉCIE NOVA!', '#ffe14a', true, 1.3);
        this.audio.play('newSpecies');
      } else {
        fx.text(c.x, textY, perfectHit && perfect > 0 ? 'PERFEITO!' : 'CAPTURADO!', perfectHit ? '#7affea' : '#ffffff');
        this.audio.play('capture');
      }
      this.orderEvent({ type: 'capture', speciesId: c.def.id, rarity: c.def.rarity, variant: c.variant });
      this.feedRage(c.x);
    }
    const variantLabel = VARIANTS[c.variant].label;
    const extra = [variantLabel ? variantLabel.toUpperCase() : '', this.combo.count > 1 ? `COMBO x${this.combo.count}` : '', frenzyMult > 1 ? 'FRENESI' : '']
      .filter(Boolean)
      .join(' · ');
    fx.text(c.x, textY + 18, `+$${value}${kg ? ` · ${kg.toLocaleString('pt-BR')}kg` : ''}${extra ? '  ' + extra : ''}`, tier >= 2 || c.variant !== 'normal' ? RARITY_COLOR[c.def.rarity] : '#ffe680');
    this.audio.play('coin');
    this.effects.coinFly(c.x - this.cam.x, c.y - this.cam.y, Math.min(6, 1 + Math.floor(value / 40)));
    this.vibrate(15);
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

    const tb = timeBonusFor(c.def, c.variant, stats, this.rng());
    if (tb > 0) {
      this.timeLeft += tb;
      this.bonusSeconds += tb;
      fx.text(c.x, textY - 8, `+${Number.isInteger(tb) ? tb : tb.toFixed(1)}s`, '#7aff8a', true);
      this.audio.play('bonus');
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
  private feedRage(x: number): void {
    const nb = nextBoss(this.save.bosses);
    if (!nb || biomeIndexAt(x) !== BOSSES.indexOf(nb) || bossAwake(nb, this.save.bossRage)) return;
    this.save.bossRage[nb.id] = (this.save.bossRage[nb.id] ?? 0) + 1;
    if (bossAwake(nb, this.save.bossRage)) {
      this.onBanner(`${nb.name.toUpperCase()} ACORDOU!`, 'Você tirou comida demais do território dele. Ele espera no fim do bioma.', '#ff6a5a');
      this.audio.play('resist');
      this.effects.shake = 8;
      this.vibrate([60, 60, 120]);
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
    const nb = playing ? nextBoss(this.save.bosses) : null;
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
      barrierX: nb ? nb.x + nb.w / 2 + 50 : null,
      current: this.current.t > 0 ? Math.min(1, this.current.t) * this.current.dir : 0,
      frenzy: playing && this.frenzy > 0 ? this.frenzy / this.stats.frenzySeconds : 0,
      baits: playing ? this.baits : [],
      shots: playing ? this.shots : [],
    });
  }

  /** What the claw would grab right now if it dove down its column. */
  private pathPreview(): { x: number; floorY: number; target: { x: number; y: number; w: number; h: number } | null } {
    const x = this.claw.x;
    const floorY = this.terrain.seabedY(x) - 1;
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

