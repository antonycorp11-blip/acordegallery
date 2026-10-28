import { clamp, seededRandom, type Rand } from '../core/RNG';
import { VARIANTS, strengthRequired, type SpeciesDefinition, type VariantId } from './Species';
import type { Hittable } from './Hit';

export type AIState = 'IDLE' | 'PATROL' | 'ALERT' | 'FLEE' | 'HIDE' | 'STUNNED' | 'CAPTURED';

export interface School {
  id: number;
  x: number;
  y: number;
  facing: number;
  homeX: number;
  turnTimer: number;
  speed: number;
  alive: number;
}

export interface WorldQuery {
  seabedY(x: number): number;
}

export type CreatureEvent = { type: 'ink' | 'blink' | 'dash' | 'burrow'; x: number; y: number; dir: number };

let nextId = 1;

export class Creature implements Hittable {
  readonly id = nextId++;
  readonly def: SpeciesDefinition;
  variant: VariantId;
  readonly seed: number;
  w: number;
  h: number;
  strengthReq: number;
  meals = 0;
  weakened = 0;
  get captureRequirement(): number { return this.strengthReq * (1 + this.meals * 0.08) * (this.weakened > 0 ? 0.65 : 1); }
  get trophyMult(): number { return 1 + this.meals * 0.5; }
  feed(): void {
    if (this.meals >= 8) return;
    this.meals++;
    const scale = VARIANTS[this.variant].scale * (1 + this.meals * 0.12);
    this.w = Math.round(this.def.size.w * scale);
    this.h = Math.round(this.def.size.h * scale);
  }
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing = 1;
  state: AIState = 'IDLE';
  stateTime = 0;
  phase: number;
  homeX: number;
  /** distance above seabed preferred by swimmers */
  altitude: number;
  alertTimer = 0;
  stunTimer = 0;
  reactTimer = -1;
  threatX = 0;
  threatY = 0;
  timer = 0;
  alpha = 1;
  /** visual hide amount (0 visible .. 1 fully inside crevice) */
  sink = 0;
  school: School | null = null;
  schoolOffX = 0;
  schoolOffY = 0;
  frozen = false;
  removed = false;
  /** last frame flee started (for visual trail) */
  trail = 0;
  /** set when it bolted from the latest strike */
  fled = false;
  /** mimic showing its teeth (seconds left) */
  revealed = 0;
  /** magnetic/gravity pull toward a world x */
  pullX = 0;
  pullT = 0;
  /** bait attraction: point and seconds left (refreshed while the bait lasts) */
  lureX = 0;
  lureY = 0;
  lureT = 0;
  private r: Rand;
  private speedMult: number;

  constructor(def: SpeciesDefinition, variant: VariantId, x: number, y: number, seed: number) {
    this.def = def;
    this.variant = variant;
    this.seed = seed;
    this.r = seededRandom(seed);
    const v = VARIANTS[variant];
    this.w = Math.max(4, Math.round(def.size.w * v.scale));
    this.h = Math.max(3, Math.round(def.size.h * v.scale));
    this.strengthReq = strengthRequired(def, variant);
    this.speedMult = v.speedMult * (0.85 + this.r() * 0.3);
    this.x = x;
    this.y = y;
    this.homeX = x;
    this.phase = this.r() * Math.PI * 2;
    this.facing = this.r() < 0.5 ? -1 : 1;
    this.altitude = 20 + this.r() * 110;
    this.timer = 0.5 + this.r() * 2;
    this.state = def.behavior === 'sessile' || def.behavior === 'jelly' || def.behavior === 'mimic' ? 'IDLE' : 'PATROL';
  }

  get hittable(): boolean {
    return !this.removed && this.state !== 'CAPTURED' && !(this.state === 'HIDE' && this.sink > 0.6);
  }

  get onFloor(): boolean {
    const b = this.def.behavior;
    return b === 'sessile' || b === 'crawler' || b === 'burrower' || b === 'mimic' || (b === 'octopus' && this.state !== 'FLEE');
  }

  private setState(s: AIState) {
    this.state = s;
    this.stateTime = 0;
  }

  /** A strike was launched at (px,py). Creatures that perceive it schedule a reaction. */
  notifyStrike(px: number, py: number, reactionMult: number): boolean {
    if (this.state === 'CAPTURED' || this.state === 'STUNNED') return false;
    const def = this.def;
    if (def.perceptionRange <= 0) return false;
    const alert = this.alertTimer > 0;
    const feeding = this.lureT > 0;
    const range = def.perceptionRange * (alert ? 1.35 : 1) * (this.state === 'HIDE' ? 0.7 : 1) * (feeding ? 0.6 : 1);
    const d = Math.hypot(px - this.x, py - this.y);
    if (d > range) return false;
    if (this.state === 'FLEE') return (this.fled = true); // already running
    const jitter = 0.85 + this.r() * 0.35;
    this.reactTimer = (def.reactionTime / 1000) * reactionMult * jitter * (alert ? 0.75 : 1) * (feeding ? 1.5 : 1);
    this.threatX = px;
    this.threatY = py;
    return true;
  }

  /** Strike missed near us: stay nervous for a while. */
  alarm(px: number, py: number): void {
    if (Math.hypot(px - this.x, py - this.y) < this.def.perceptionRange * 2.2 + 20) this.alertTimer = 2.6;
  }

  stun(seconds: number): void {
    if (this.state === 'CAPTURED') return;
    this.stunTimer = Math.max(this.stunTimer, seconds);
    this.reactTimer = -1;
    this.setState('STUNNED');
  }

  /** Turned into another variant on the spot (meteor shower). */
  mutate(variant: VariantId): void {
    this.variant = variant;
    const scale = VARIANTS[variant].scale * (1 + this.meals * 0.12);
    this.w = Math.max(4, Math.round(this.def.size.w * scale));
    this.h = Math.max(3, Math.round(this.def.size.h * scale));
    this.strengthReq = strengthRequired(this.def, variant);
  }

  capture(): void {
    this.setState('CAPTURED');
    this.vx = this.vy = 0;
    this.reactTimer = -1;
  }

  /** Bump after resisting the claw. */
  shove(dir: number): void {
    this.vx += dir * 60;
    this.alertTimer = 3;
    this.reactTimer = 0.001;
    this.threatX = this.x - dir * 10;
    this.threatY = this.y;
  }

  update(dt: number, world: WorldQuery, events: CreatureEvent[]): void {
    if (this.state === 'CAPTURED' || this.removed) return;
    this.weakened = Math.max(0, this.weakened - dt);
    this.stateTime += dt;
    this.phase += dt * (1 + Math.abs(this.vx) / 30) * 6;
    if (this.pullT > 0) {
      this.pullT -= dt;
      const d = this.pullX - this.x;
      this.x += Math.sign(d) * Math.min(Math.abs(d), 140 * dt);
    }
    if (this.alertTimer > 0) this.alertTimer -= dt;
    if (this.trail > 0) this.trail -= dt;

    if (this.state === 'STUNNED') {
      this.stunTimer -= dt;
      this.vx *= Math.pow(0.02, dt);
      this.vy = this.onFloor ? 0 : 8;
      this.integrate(dt, world);
      if (this.stunTimer <= 0) {
        this.alertTimer = 2;
        this.setState('PATROL');
      }
      return;
    }

    if (this.reactTimer > 0) {
      this.reactTimer -= dt;
      if (this.reactTimer <= 0) this.startFlee(events);
    }

    if (this.lureT > 0) {
      this.lureT -= dt;
      const b = this.def.behavior;
      const busy = this.state === 'FLEE' || this.state === 'HIDE';
      if (!busy && b !== 'sessile' && b !== 'mimic') {
        this.updateLured(dt);
        this.integrate(dt, world);
        return;
      }
    }

    switch (this.def.behavior) {
      case 'sessile': this.updateSessile(dt); break;
      case 'crawler': this.updateCrawler(dt); break;
      case 'swimmer':
      case 'phantom':
      case 'tank':
      case 'leviathan': this.updateSwimmer(dt, world); break;
      case 'burrower': this.updateBurrower(dt); break;
      case 'eel': this.updateEel(dt, world); break;
      case 'octopus': this.updateOctopus(dt, world); break;
      case 'jelly': this.updateJelly(dt); break;
      case 'blinker': this.updateBlinker(dt); break;
      case 'predator': this.updatePredator(world); break;
      case 'mimic': this.updateMimic(dt); break;
    }
    this.integrate(dt, world);
  }

  private startFlee(events: CreatureEvent[]): void {
    const def = this.def;
    this.reactTimer = -1;
    this.alertTimer = 3;
    this.fled = true;
    let dx = this.x - this.threatX;
    if (Math.abs(dx) < 1) dx = this.r() < 0.5 ? -1 : 1;
    const dir = Math.sign(dx);
    this.facing = dir;
    if (def.behavior === 'blinker') {
      const jump = 50 + this.r() * 40;
      events.push({ type: 'blink', x: this.x, y: this.y, dir });
      this.x += dir * jump;
      this.y += (this.r() - 0.5) * 40;
      this.homeX = this.x;
      events.push({ type: 'blink', x: this.x, y: this.y, dir });
      this.setState('PATROL');
      return;
    }
    if (def.behavior === 'jelly' || def.behavior === 'sessile' || def.behavior === 'predator') return;
    if (def.behavior === 'mimic') this.revealed = 3.5;
    if (def.behavior === 'burrower') {
      // tail flip backwards, toward its crevice if it has one nearby
      const toHome = this.homeX - this.x;
      const fdir = Math.abs(toHome) > 4 && Math.abs(toHome) < 140 ? Math.sign(toHome) : dir;
      this.facing = -fdir; // lobsters flee tail-first
      this.vx = fdir * def.fleeSpeed * 0.6;
      events.push({ type: 'burrow', x: this.x, y: this.y, dir: fdir });
    }
    if (def.behavior === 'octopus') {
      events.push({ type: 'ink', x: this.x, y: this.y, dir });
      this.alpha = 1;
    }
    if (def.behavior !== 'burrower') {
      // flight starts with an impulse: animals bolt, they don't ease in
      this.vx = dir * def.fleeSpeed * 0.65 * this.speedMult;
      events.push({ type: 'dash', x: this.x, y: this.y, dir });
    }
    this.trail = 0.35;
    this.setState('FLEE');
  }

  private patrolTurn(min: number, max: number): void {
    if (this.timer <= 0) {
      this.timer = min + this.r() * (max - min);
      if (this.r() < 0.55) this.facing = -this.facing;
    }
  }

  private tether(range: number): void {
    if (this.x - this.homeX > range) this.facing = -1;
    else if (this.homeX - this.x > range) this.facing = 1;
  }

  private approach(target: number, accel: number, dt: number): number {
    const d = target - this.vx;
    const step = accel * dt;
    return Math.abs(d) <= step ? target : this.vx + Math.sign(d) * step;
  }

  private updateSessile(dt: number): void {
    this.timer -= dt;
    this.patrolTurn(3, 7);
    this.vx = this.facing * this.def.swimSpeed * 0.5 * (Math.sin(this.phase * 0.1) > 0 ? 1 : 0);
  }

  private updateCrawler(dt: number): void {
    const def = this.def;
    if (this.state === 'FLEE') {
      // sidestep sprint along the floor
      this.vx = this.approach(this.facing * def.fleeSpeed * this.speedMult, def.fleeAcceleration, dt);
      if (this.stateTime > 0.55) this.setState('PATROL');
      return;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.6 + this.r() * 2.2;
      const roll = this.r();
      this.setState(roll < 0.3 ? 'IDLE' : 'PATROL');
      if (roll > 0.6) this.facing = -this.facing;
    }
    this.tether(140);
    const target = this.state === 'IDLE' ? 0 : this.facing * def.swimSpeed * this.speedMult * (this.alertTimer > 0 ? 1.6 : 1);
    this.vx = this.approach(target, 120, dt);
  }

  private updateSwimmer(dt: number, world: WorldQuery): void {
    const def = this.def;
    const floor = world.seabedY(this.x);
    if (this.state === 'FLEE') {
      const accel = def.fleeAcceleration * this.speedMult;
      this.vx = this.approach(this.facing * def.fleeSpeed * this.speedMult, accel, dt);
      const vyDir = this.y < this.threatY ? -1 : 1;
      this.vy += vyDir * accel * 0.25 * dt;
      this.vy = clamp(this.vy, -def.fleeSpeed * 0.4, def.fleeSpeed * 0.4);
      const dur = def.behavior === 'tank' || def.behavior === 'leviathan' ? 1.2 : 0.6;
      if (this.stateTime > dur) this.setState('PATROL');
      return;
    }
    let targetY: number;
    if (this.school) {
      const s = this.school;
      this.facing = s.facing;
      const tx = s.x + this.schoolOffX;
      targetY = s.y + this.schoolOffY + Math.sin(this.phase * 0.3) * 2;
      const want = s.facing * s.speed + (tx - this.x) * 1.5;
      this.vx = this.approach(want, 160, dt);
    } else {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 2.5 + this.r() * 4;
        if (this.r() < 0.5) this.facing = -this.facing;
        this.altitude = clamp(this.altitude + (this.r() - 0.5) * 60, 18, 150);
      }
      this.tether(def.behavior === 'phantom' ? 320 : 220);
      const speed = def.swimSpeed * this.speedMult * (this.alertTimer > 0 ? 1.4 : 1);
      this.vx = this.approach(this.facing * speed, 90, dt);
      targetY = floor - this.altitude - this.h / 2 + Math.sin(this.phase * 0.12) * 6;
    }
    this.vy = clamp((targetY - this.y) * 1.8, -30, 30);
  }

  private updateBurrower(dt: number): void {
    const def = this.def;
    if (this.state === 'FLEE') {
      this.vx = this.approach(-this.facing * def.fleeSpeed * this.speedMult, def.fleeAcceleration, dt);
      const nearHome = Math.abs(this.x - this.homeX) < 6;
      if ((nearHome && this.stateTime > 0.12) || this.stateTime > 0.5) {
        this.setState(nearHome ? 'HIDE' : 'PATROL');
        this.timer = 1.8 + this.r() * 2;
      }
      return;
    }
    if (this.state === 'HIDE') {
      this.vx = 0;
      this.sink = Math.min(1, this.sink + dt * 6);
      this.timer -= dt;
      if (this.timer <= 0 && this.alertTimer <= 0) this.setState('IDLE');
      return;
    }
    this.sink = Math.max(0, this.sink - dt * 2.5);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1 + this.r() * 2.5;
      const roll = this.r();
      if (roll < 0.25 && Math.abs(this.x - this.homeX) < 8) {
        this.setState('HIDE');
        this.timer = 1.2 + this.r() * 1.8;
      } else {
        this.setState(roll < 0.5 ? 'IDLE' : 'PATROL');
        if (roll > 0.75) this.facing = -this.facing;
      }
    }
    this.tether(60);
    const target = this.state === 'PATROL' ? this.facing * def.swimSpeed * this.speedMult : 0;
    this.vx = this.approach(target, 80, dt);
  }

  private updateEel(dt: number, world: WorldQuery): void {
    const def = this.def;
    const floor = world.seabedY(this.x);
    this.timer -= dt;
    const fleeing = this.state === 'FLEE';
    if (this.timer <= 0) {
      this.timer = fleeing ? 0.15 + this.r() * 0.15 : 0.4 + this.r() * 1.1;
      if (!fleeing && this.r() < 0.45) this.facing = -this.facing;
      this.vy = (this.r() - 0.5) * (fleeing ? 140 : 50);
    }
    if (fleeing && this.stateTime > 0.8) this.setState('PATROL');
    this.tether(200);
    const speed = (fleeing ? def.fleeSpeed : def.swimSpeed * (this.alertTimer > 0 ? 1.5 : 1)) * this.speedMult;
    this.vx = this.approach(this.facing * speed, fleeing ? def.fleeAcceleration : 140, dt);
    const lo = floor - 70;
    const hi = floor - 6 - this.h;
    if (this.y < lo) this.vy = Math.abs(this.vy) + 5;
    if (this.y > hi) this.vy = -Math.abs(this.vy) - 5;
  }

  private updateOctopus(dt: number, world: WorldQuery): void {
    const def = this.def;
    const floor = world.seabedY(this.x);
    if (this.state === 'FLEE') {
      this.vx = this.approach(this.facing * def.fleeSpeed * this.speedMult, def.fleeAcceleration, dt);
      this.vy = -40 + Math.sin(this.stateTime * 20) * 20;
      if (this.stateTime > 0.55) {
        this.setState('HIDE');
        this.timer = 2.5 + this.r() * 2;
      }
      return;
    }
    // settle down to the floor
    const ground = floor - this.h / 2 + 1;
    this.vy = clamp((ground - this.y) * 3, -30, 50);
    if (this.state === 'HIDE') {
      this.vx = this.approach(0, 120, dt);
      this.alpha = Math.max(0.28, this.alpha - dt * 1.5);
      this.timer -= dt;
      if (this.timer <= 0) this.setState('PATROL');
      return;
    }
    this.alpha = Math.min(1, this.alpha + dt * 1.2);
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1.2 + this.r() * 2.5;
      const roll = this.r();
      if (roll < 0.35) {
        this.setState('HIDE');
        this.timer = 2 + this.r() * 2;
      } else {
        this.setState('PATROL');
        if (roll > 0.7) this.facing = -this.facing;
      }
    }
    this.tether(120);
    this.vx = this.approach(this.facing * def.swimSpeed * this.speedMult, 60, dt);
  }

  private updateJelly(dt: number): void {
    // pulse upward, sink slowly; tethered to a band above home floor
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1.1 + this.r() * 0.9;
      this.vy = -22;
      this.vx = (this.r() - 0.5) * 10;
    }
    this.vy = Math.min(9, this.vy + 30 * dt);
    if (this.x - this.homeX > 60) this.vx = -4;
    if (this.homeX - this.x > 60) this.vx = 4;
  }

  /** Heads to the bait and mills around it, nibbling. */
  private updateLured(dt: number): void {
    if (this.school) {
      this.school.alive--;
      this.school = null;
    }
    const dx = this.lureX + Math.sin(this.phase * 0.2 + this.seed) * 8 - this.x;
    this.facing = dx >= 0 ? 1 : -1;
    const speed = this.def.swimSpeed * 1.8 * this.speedMult + 20;
    this.vx = this.approach(clamp(dx * 2.5, -speed, speed), 260, dt);
    if (!this.onFloor) {
      const ty = this.lureY - 6 + Math.cos(this.phase * 0.25 + this.seed) * 9;
      this.vy = clamp((ty - this.y) * 2.5, -50, 50);
    }
    this.homeX = this.x;
    if (this.state === 'IDLE') this.state = 'PATROL';
  }

  private updatePredator(world: WorldQuery): void {
    if (this.meals > 0) this.tether(150);
    // crosses the screen in a straight line, bobbing a little
    this.vx = this.facing * this.def.swimSpeed * this.speedMult;
    const target = world.seabedY(this.x) - 70 + Math.sin(this.phase * 0.08) * 20;
    this.vy = Math.max(-25, Math.min(25, (target - this.y) * 1.2));
  }

  private updateMimic(dt: number): void {
    if (this.revealed > 0) this.revealed -= dt;
    if (this.state === 'FLEE') {
      // hops away along the floor
      this.vx = this.approach(this.facing * this.def.fleeSpeed, this.def.fleeAcceleration, dt);
      if (this.stateTime > 0.7) this.setState('IDLE');
      return;
    }
    this.vx = this.approach(0, 300, dt);
  }

  private updateBlinker(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 2 + this.r() * 3;
      this.facing = -this.facing;
    }
    this.tether(100);
    this.vx = this.approach(this.facing * this.def.swimSpeed, 30, dt);
    this.vy = Math.sin(this.phase * 0.15) * 8;
  }

  private integrate(dt: number, world: WorldQuery): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const floor = world.seabedY(this.x);
    if (this.onFloor) {
      this.y = floor - this.h / 2 + 1;
      this.vy = 0;
    } else {
      const maxY = floor - this.h / 2 - 3;
      const minY = floor - 175;
      if (this.y > maxY) {
        this.y = maxY;
        if (this.vy > 0) this.vy = 0;
      }
      if (this.y < minY) {
        this.y = minY;
        if (this.vy < 0) this.vy = 0;
      }
    }
    if (this.x < 8) {
      this.x = 8;
      this.facing = 1;
      if (this.vx < 0) this.vx = 0;
    }
  }
}

/** School "leader" movement: a virtual point the members follow. */
export function updateSchool(s: School, dt: number, world: WorldQuery, r: Rand): void {
  s.turnTimer -= dt;
  if (s.turnTimer <= 0) {
    s.turnTimer = 3 + r() * 4;
    if (r() < 0.5) s.facing = -s.facing;
  }
  if (s.x - s.homeX > 200) s.facing = -1;
  if (s.homeX - s.x > 200) s.facing = 1;
  s.x += s.facing * s.speed * dt;
  const floor = world.seabedY(s.x);
  const target = floor - 55 - Math.sin(s.x / 90) * 25;
  s.y += (target - s.y) * Math.min(1, dt * 0.8);
  if (s.x < 20) s.facing = 1;
}
