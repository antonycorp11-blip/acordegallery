import { CONFIG, VIEW_W } from '../config';
import type { Terrain } from '../world/Terrain';

/**
 * Lateral camera that follows a "focus" point (the claw's rail position).
 * When the focus nears the start of the world the camera stops scrolling and
 * the focus keeps moving on screen, so the claw can reach the very edge.
 * x = left edge in world px. y follows the seabed smoothly.
 */
export class Camera {
  focus = VIEW_W / 2;
  /** left edge of the world for this dive (the current biome's start) */
  minX = CONFIG.camera.minWorldX;
  y = 0;
  vx = 0;

  get x(): number {
    return Math.max(this.minX, this.focus - VIEW_W / 2);
  }

  /** Placing the camera places its focus at the screen center. */
  set x(v: number) {
    this.focus = v + VIEW_W / 2;
  }

  /** Focus position on screen (center, or off-center at the world edge). */
  get focusScreenX(): number {
    return this.focus - this.x;
  }

  snap(terrain: Terrain): void {
    this.y = this.targetY(terrain);
  }

  targetY(terrain: Terrain): number {
    // sample a few points so local bumps don't jerk the view
    const c = this.x + VIEW_W / 2;
    let sum = 0;
    for (let i = -2; i <= 2; i++) sum += terrain.baseFloor(c + i * 90);
    return sum / 5 - CONFIG.camera.seabedScreenY;
  }

  /** dir: -1 left, 0 none, 1 right. maxFocus: blocking wall (guardian). */
  update(dt: number, dir: number, maxSpeed: number, terrain: Terrain, maxFocus = Infinity): void {
    const m = CONFIG.movement;
    if (dir !== 0) {
      this.vx += dir * m.accel * dt;
      if (Math.abs(this.vx) > maxSpeed) this.vx = Math.sign(this.vx) * maxSpeed;
    } else {
      const f = m.friction * dt;
      this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
    }
    this.focus += this.vx * dt;
    this.clampFocus(maxFocus);
    const ty = this.targetY(terrain);
    this.y += (ty - this.y) * Math.min(1, dt * CONFIG.camera.followLerp);
  }

  clampFocus(maxFocus = Infinity): boolean {
    const min = this.minX + 22;
    if (this.focus < min) {
      this.focus = min;
      if (this.vx < 0) this.vx = 0;
    }
    if (this.focus > maxFocus) {
      this.focus = maxFocus;
      if (this.vx > 0) this.vx = 0;
      return true;
    }
    return false;
  }
}
