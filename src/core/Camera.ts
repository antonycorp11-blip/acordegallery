import { CONFIG, VIEW_W } from '../config';
import type { Terrain } from '../world/Terrain';

/** Lateral camera. x = left edge in world px. y follows the seabed smoothly. */
export class Camera {
  x = 0;
  y = 0;
  vx = 0;

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

  /** dir: -1 left, 0 none, 1 right. */
  update(dt: number, dir: number, maxSpeed: number, terrain: Terrain): void {
    const m = CONFIG.movement;
    if (dir !== 0) {
      this.vx += dir * m.accel * dt;
      if (Math.abs(this.vx) > maxSpeed) this.vx = Math.sign(this.vx) * maxSpeed;
    } else {
      const f = m.friction * dt;
      this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
    }
    this.x += this.vx * dt;
    if (this.x < CONFIG.camera.minWorldX) {
      this.x = CONFIG.camera.minWorldX;
      if (this.vx < 0) this.vx = 0;
    }
    const ty = this.targetY(terrain);
    this.y += (ty - this.y) * Math.min(1, dt * CONFIG.camera.followLerp);
  }
}
