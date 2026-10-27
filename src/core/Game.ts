import { CONFIG, VIEW_H, VIEW_W } from '../config';
import { Claw, type ClawState } from '../entities/Claw';
import { updateSchool, type Creature, type CreatureEvent } from '../entities/Creature';
import { findPathHit, resolveStrike } from '../entities/Hit';
import { RARITIES, RARITY_COLOR, VARIANTS, type Rarity, type VariantId } from '../entities/Species';
import { Effects } from '../render/Effects';
import { Renderer } from '../render/Renderer';
import { ComboTracker, captureValue, recordCapture, timeBonusFor } from '../systems/Economy';
import { computeStats, type RunStats } from '../systems/Upgrades';
import { paletteAt } from '../world/Biomes';
import { depthAt } from '../world/Depth';
import { SpawnDirector } from '../world/SpawnDirector';
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
  newSpecies: string[];
  maxDepth: number;
  maxDistance: number;
  depthRecord: boolean;
  rarityCounts: Partial<Record<Rarity, number>>;
  bonusSeconds: number;
  bestCombo: number;
}

export interface RunHud {
  timeLeft: number;
  coins: number;
  captures: number;
  depth: number;
  bestDepth: number;
  combo: number;
}

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

  // run state
  timeLeft = 0;
  runCoins = 0;
  captures: CaptureLog[] = [];
  newSpecies: string[] = [];
  maxDepth = 0;
  maxDistance = 0;
  bonusSeconds = 0;
  bestCombo = 0;
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

  constructor(display: HTMLCanvasElement) {
    this.save = loadSave();
    this.audio.muted = this.save.settings.muted;
    this.stats = computeStats(this.save);
    this.renderer = new Renderer(display);
    this.input = new Input(display);
    this.input.onFirstGesture = () => this.audio.unlock();
    this.terrain = new Terrain(1234);
    this.spawn = this.makeSpawn(this.terrain);
    this.claw = new Claw(this.stats);
    this.combo = new ComboTracker(this.stats);
    this.setupWorld(1234);
  }

  private makeSpawn(t: Terrain): SpawnDirector {
    return new SpawnDirector(t, { density: this.stats.density, luck: this.stats.luck, schoolBonus: this.stats.schoolBonus, variantMult: this.stats.variantMult }, t.seed);
  }

  private setupWorld(seed: number): void {
    this.terrain = new Terrain(seed);
    this.spawn = this.makeSpawn(this.terrain);
    this.renderer.resetWorld();
    this.effects.clear();
    this.cam.x = 0;
    this.cam.vx = 0;
    this.cam.snap(this.terrain);
    this.claw = new Claw(this.stats);
    this.claw.x = this.cam.x + this.input.aimX;
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

  // ───────────────────────── run lifecycle

  startRun(): void {
    this.audio.unlock();
    this.refreshStats();
    this.setupWorld((this.rng() * 0xffffffff) >>> 0);
    this.combo = new ComboTracker(this.stats);
    this.timeLeft = this.stats.runSeconds;
    this.runCoins = 0;
    this.captures = [];
    this.newSpecies = [];
    this.maxDepth = 0;
    this.maxDistance = 0;
    this.bonusSeconds = 0;
    this.bestCombo = 0;
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
    s.coins += this.runCoins;
    s.totalEarned += this.runCoins;
    s.totalCaptures += this.captures.length;
    s.totalRuns += 1;
    s.bestDepth = Math.max(s.bestDepth, this.maxDepth);
    s.bestDistance = Math.max(s.bestDistance, this.maxDistance);
    for (const c of this.captures) recordCapture(s, c.speciesId, c.variant);
    this.persist();
    const rarityCounts: Partial<Record<Rarity, number>> = {};
    for (const c of this.captures) rarityCounts[c.rarity] = (rarityCounts[c.rarity] ?? 0) + 1;
    const summary: RunSummary = {
      captures: this.captures.slice(),
      coins: this.runCoins,
      newSpecies: this.newSpecies.slice(),
      maxDepth: this.maxDepth,
      maxDistance: this.maxDistance,
      depthRecord,
      rarityCounts,
      bonusSeconds: this.bonusSeconds,
      bestCombo: this.bestCombo,
    };
    this.claw.held = [];
    this.audio.play('end');
    this.setMode('results');
    this.onRunEnd(summary);
  }

  /** Back to the base: idle shallow reef in the background. */
  toMenu(): void {
    this.refreshStats();
    this.setupWorld((this.rng() * 0xffffffff) >>> 0);
    this.setMode('menu');
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

    // lateral navigation; depth comes only from horizontal distance
    const dir = this.input.dir();
    this.cam.update(dt, dir, stats.lateralSpeed, this.terrain);
    const centerX = this.cam.x + VIEW_W / 2;
    this.maxDistance = Math.max(this.maxDistance, centerX);
    this.maxDepth = Math.max(this.maxDepth, depthAt(centerX));

    // aim + strike (touch: the claw stays centered and dives down its column)
    const k = 1 - Math.pow(0.0001, dt);
    this.aimSX += (this.aimScreenX() - this.aimSX) * k;
    const restY = this.cam.y + CONFIG.claw.restTipY;
    if (this.input.consumeStrike() || this.claw.takeBuffered()) this.tryStrike(restY);
    const prevTip = this.claw.tipY;
    const wasStriking = this.claw.state === 'STRIKE';
    this.claw.update(dt * 1000, this.cam.x + this.aimSX, restY);
    if (this.pathMode && wasStriking) {
      // grab the first thing the mouth runs into on its way down
      const hit = findPathHit(this.claw.x, prevTip, this.claw.tipY, stats.opening, stats.precision, this.spawn.creatures.filter((c) => !c.frozen));
      if (hit) this.claw.stopAt(hit.y);
    }
    if (this.claw.contactPending) this.resolveContact();
    if (this.prevClawState === 'RETRACT' && this.claw.state === 'COOLDOWN') this.deliverHeld();
    this.prevClawState = this.claw.state;

    this.spawn.update(dt, this.cam.x, this.cam.x + this.aimScreenX(), dir);
    this.updateCreatures(dt);
    if (this.combo.expired(this.time * 1000)) this.combo.miss();
    this.effects.update(dt);
    this.ambientBubbles(dt);

    this.onHud({
      timeLeft: this.timeLeft,
      coins: this.runCoins,
      captures: this.captures.length,
      depth: depthAt(centerX),
      bestDepth: Math.max(this.save.bestDepth, this.maxDepth),
      combo: this.combo.count,
    });
  }

  private updateCreatures(dt: number): void {
    const cx = this.cam.x + VIEW_W / 2;
    const freeze = CONFIG.spawn.freezeDistance;
    for (const s of this.spawn.schools) if (Math.abs(s.x - cx) < freeze) updateSchool(s, dt, this.terrain, this.rng);
    this.events.length = 0;
    for (const c of this.spawn.creatures) {
      c.frozen = Math.abs(c.x - cx) > freeze;
      if (!c.frozen) c.update(dt, this.terrain, this.events);
    }
    for (const e of this.events) this.creatureEvent(e);
    this.terrain.prune(this.terrain.chunkIndex(cx));
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

  // ───────────────────────── strike & contact

  /** Touch play: no tapping on targets; the claw dives down its own column. */
  get pathMode(): boolean {
    return this.input.touchMode;
  }

  private aimScreenX(): number {
    return this.pathMode ? VIEW_W / 2 : this.input.aimX;
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
    for (const c of this.spawn.creatures) {
      if (c.frozen || c.removed) continue;
      c.fled = false;
      // in path mode the threat is the whole column, felt at the creature's own height
      const ty = this.pathMode ? Math.max(restY, Math.min(wy, c.y)) : wy;
      if (c.notifyStrike(wx, ty, stats.claw.reactionMult)) this.perceivers.push(c);
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

    // electric discharge stuns around the impact
    if (stats.claw.stunMs > 0) {
      for (const c of this.spawn.creatures) {
        if (!c.hittable || c.frozen) continue;
        if (Math.hypot(c.x - x, c.y - y) <= stats.claw.stunRadius) c.stun(stats.claw.stunMs / 1000);
      }
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * stats.claw.stunRadius;
        fx.spawn('bolt', x + Math.cos(a) * r, y + Math.sin(a) * r, 0, 0, 0.3, '#7affff');
      }
    }

    const candidates = this.spawn.creatures.filter((c) => !c.frozen);
    const hits = resolveStrike(x, y, stats.opening, stats.precision, candidates, stats.maxTargets, CONFIG.economy.perfectRadiusFrac);

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
    let textY = y - 12;
    for (const h of hits) {
      const c = h.target;
      const req = c.state === 'STUNNED' ? c.strengthReq * 0.75 : c.strengthReq;
      if (req > stats.strength) {
        resisted++;
        c.shove(Math.sign(c.x - x) || 1);
        fx.burst('spark', c.x, c.y, 5, 60, 0.3, ['#ff6a5a', '#ffd0a0']);
        continue;
      }
      c.capture();
      claw.held.push(c);
      this.hitStop = 0.045;
      captured++;
      const comboBonus = this.combo.hit(nowMs);
      this.bestCombo = Math.max(this.bestCombo, this.combo.count);
      const perfect = h.perfect ? stats.perfectBonus : 0;
      const depth = depthAt(c.x);
      const value = captureValue(c.def, c.variant, depth, comboBonus, perfect);
      this.runCoins += value;
      this.captures.push({ speciesId: c.def.id, variant: c.variant, value, rarity: c.def.rarity });

      const known = (this.save.species[c.def.id]?.caught ?? 0) > 0 || this.newSpecies.includes(c.def.id);
      const tier = RARITIES.indexOf(c.def.rarity);
      if (!known) {
        this.newSpecies.push(c.def.id);
        fx.text(c.x, textY, 'ESPÉCIE NOVA!', '#ffe14a', true, 1.3);
        this.audio.play('newSpecies');
      } else {
        fx.text(c.x, textY, h.perfect && perfect > 0 ? 'PERFEITO!' : 'CAPTURADO!', h.perfect ? '#7affea' : '#ffffff');
        this.audio.play('capture');
      }
      textY -= 9;
      const variantLabel = VARIANTS[c.variant].label;
      const extra = [variantLabel ? variantLabel.toUpperCase() : '', this.combo.count > 1 ? `COMBO x${this.combo.count}` : ''].filter(Boolean).join(' · ');
      fx.text(c.x, textY + 18, `+$${value}${extra ? '  ' + extra : ''}`, tier >= 2 || c.variant !== 'normal' ? RARITY_COLOR[c.def.rarity] : '#ffe680');
      this.audio.play('coin');

      const tb = timeBonusFor(c.def, c.variant, stats, this.rng());
      if (tb > 0) {
        this.timeLeft += tb;
        this.bonusSeconds += tb;
        fx.text(c.x, textY - 8, `+${Number.isInteger(tb) ? tb : tb.toFixed(1)}s`, '#7aff8a', true);
        this.audio.play('bonus');
      }
      if (c.def.special.includes('shock') && !stats.claw.tags.includes('shockproof')) {
        claw.extraCooldownMs += 450;
        fx.text(x, y + 14, 'CHOQUE!', '#7affff');
        for (let i = 0; i < 10; i++) fx.spawn('bolt', x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 16, 0, -20, 0.4, '#bfffff');
        this.audio.play('shock');
      }
      if (tier >= 2) fx.flash = Math.max(fx.flash, 0.4 + tier * 0.1);
      fx.burst('star', c.x, c.y, 6 + tier * 2, 60, 0.45, ['#ffffff', RARITY_COLOR[c.def.rarity], '#ffe14a']);
    }
    if (resisted) {
      fx.text(x, y - (captured ? 30 : 12), 'RESISTIU!', '#ff6a5a');
      if (!captured) {
        this.audio.play('resist');
        this.combo.miss();
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
    });
  }

  /** What the claw would grab right now if it dove down its column. */
  private pathPreview(): { x: number; floorY: number; target: { x: number; y: number; w: number; h: number } | null } {
    const x = this.claw.x;
    const floorY = this.terrain.seabedY(x) - 1;
    const hit = this.claw.busy
      ? null
      : findPathHit(x, this.cam.y + CONFIG.claw.restTipY, floorY, this.stats.opening, this.stats.precision, this.spawn.creatures.filter((c) => !c.frozen));
    return {
      x: x - this.cam.x,
      floorY: floorY - this.cam.y,
      target: hit ? { x: hit.target.x - this.cam.x, y: hit.target.y - this.cam.y, w: hit.target.w, h: hit.target.h } : null,
    };
  }

  /** Test/debug helper: visible creatures in view coordinates. */
  debugVisible(): { x: number; y: number; id: string; state: string }[] {
    return this.spawn.creatures
      .filter((c) => !c.removed && c.hittable)
      .map((c) => ({ x: c.x - this.cam.x, y: c.y - this.cam.y, id: c.def.id, state: c.state }))
      .filter((c) => c.x > 0 && c.x < VIEW_W && c.y > 30 && c.y < VIEW_H);
  }
}
