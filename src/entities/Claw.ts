import { CONFIG } from '../config';
import type { RunStats } from '../systems/Upgrades';
import type { Creature } from './Creature';

export type ClawState = 'READY' | 'ANTICIPATE' | 'STRIKE' | 'CLOSE' | 'RETRACT' | 'COOLDOWN';

/**
 * The claw lives at the top of the screen. A strike is a near-instant snap:
 * ANTICIPATE (tiny jerk up) -> STRIKE (accelerating dive) -> CLOSE (contact
 * resolved at the first frame) -> RETRACT -> COOLDOWN -> READY.
 * Positions are in world coordinates; the rest position follows the camera.
 */
export class Claw {
  state: ClawState = 'READY';
  t = 0; // ms in current state
  x = 0; // world x of the claw axis
  tipY = 0; // world y of the mouth
  startY = 0;
  targetY = 0;
  /** 1 = open, 0 = closed */
  open = 1;
  held: Creature[] = [];
  extraCooldownMs = 0;
  bufferedMs = -1;
  /** recent tip positions for the motion smear */
  smear: number[] = [];
  /** set for exactly one update when the mouth arrives */
  contactPending = false;

  constructor(public stats: RunStats) {}

  get busy(): boolean {
    return this.state !== 'READY';
  }

  get cooldownProgress(): number {
    if (this.state === 'READY') return 1;
    const s = this.stats;
    const total = CONFIG.claw.anticipationMs + s.strikeMs + CONFIG.claw.closeMs + s.retractMs + s.cooldownMs + this.extraCooldownMs;
    let elapsed = this.t;
    const order: ClawState[] = ['ANTICIPATE', 'STRIKE', 'CLOSE', 'RETRACT', 'COOLDOWN'];
    for (const st of order) {
      if (st === this.state) break;
      elapsed += this.duration(st);
    }
    return Math.min(1, elapsed / total);
  }

  duration(st: ClawState): number {
    const s = this.stats;
    switch (st) {
      case 'ANTICIPATE': return CONFIG.claw.anticipationMs;
      case 'STRIKE': return s.strikeMs;
      case 'CLOSE': return CONFIG.claw.closeMs;
      case 'RETRACT': return s.retractMs;
      case 'COOLDOWN': return s.cooldownMs + this.extraCooldownMs;
      default: return 0;
    }
  }

  /** Try to strike at world (x, y). Returns true if the strike started. */
  trigger(worldX: number, worldY: number, restY: number): boolean {
    if (this.state !== 'READY') {
      this.bufferedMs = CONFIG.claw.inputBufferMs;
      return false;
    }
    this.x = worldX;
    this.startY = restY;
    this.tipY = restY;
    this.targetY = Math.max(restY + 4, worldY);
    this.held = [];
    this.extraCooldownMs = 0;
    this.smear = [];
    this.set('ANTICIPATE');
    return true;
  }

  private set(s: ClawState) {
    this.state = s;
    this.t = 0;
  }

  /**
   * Advance the state machine. `aimWorldX`/`restY` keep the idle claw aligned
   * with the reticle and pinned to the top of the camera.
   */
  update(dtMs: number, aimWorldX: number, restY: number): void {
    this.contactPending = false;
    this.t += dtMs;
    if (this.bufferedMs > 0) this.bufferedMs -= dtMs;
    const dur = this.duration(this.state);
    const k = dur > 0 ? Math.min(1, this.t / dur) : 1;
    switch (this.state) {
      case 'READY':
      case 'COOLDOWN': {
        // idle: hang at the top, follow the aim quickly (but not instantly)
        const follow = 1 - Math.pow(0.0005, dtMs / 1000);
        this.x += (aimWorldX - this.x) * follow;
        this.tipY = restY;
        this.open = this.state === 'READY' ? 1 : 0.4 + 0.6 * k;
        if (this.state === 'COOLDOWN' && k >= 1) this.set('READY');
        break;
      }
      case 'ANTICIPATE':
        this.tipY = restY - 4 * Math.sin(k * Math.PI);
        this.open = 1 + 0.25 * k;
        if (k >= 1) this.set('STRIKE');
        break;
      case 'STRIKE': {
        // accelerating dive: the "PÁ!"
        const e = k * k * (2.2 - 1.2 * k);
        this.tipY = this.startY + (this.targetY - this.startY) * e;
        this.smear.push(this.tipY);
        if (this.smear.length > 6) this.smear.shift();
        this.open = 1.25;
        if (k >= 1) {
          this.tipY = this.targetY;
          this.contactPending = true;
          this.set('CLOSE');
        }
        break;
      }
      case 'CLOSE':
        this.tipY = this.targetY;
        this.open = Math.max(this.held.length ? 0.35 : 0, 1.25 * (1 - k));
        if (k >= 1) this.set('RETRACT');
        break;
      case 'RETRACT': {
        const e = 1 - Math.pow(1 - k, 2.4);
        this.tipY = this.targetY + (restY - this.targetY) * e;
        this.open = this.held.length ? 0.35 : 0;
        if (this.smear.length) this.smear.shift();
        if (k >= 1) {
          this.tipY = restY;
          this.set('COOLDOWN');
        }
        break;
      }
    }
  }

  /** Ends the dive early: the mouth met something on its way down. */
  stopAt(y: number): void {
    this.targetY = y;
    this.tipY = y;
    this.contactPending = true;
    this.set('CLOSE');
  }

  /** Consumes a buffered click if the claw just became ready. */
  takeBuffered(): boolean {
    if (this.state === 'READY' && this.bufferedMs > 0) {
      this.bufferedMs = -1;
      return true;
    }
    return false;
  }
}
