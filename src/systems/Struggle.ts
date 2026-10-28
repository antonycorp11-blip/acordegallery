/** Timed skill check: waiting is safe, repeated blind taps break the line. */
export class Struggle {
  elapsed = 0;
  tension = 0.15;
  progress = 0;
  private lastTap = -Infinity;
  resolved: 'caught' | 'escaped' | null = null;
  constructor(readonly skill: number, readonly difficulty: number) {}
  get marker(): number { return 0.5 + Math.sin(this.elapsed * (3.5 + this.difficulty)) * 0.46; }
  get halfWindow(): number { return 0.16 + this.skill * 0.02; }
  get inWindow(): boolean { return Math.abs(this.marker - 0.5) <= this.halfWindow; }
  update(dt: number): void {
    if (this.resolved) return;
    this.elapsed += dt;
    this.tension = Math.max(0.08, this.tension - dt * 0.06);
    if (this.elapsed >= 9) this.resolved = 'escaped';
  }
  tap(): boolean {
    if (this.resolved || this.elapsed - this.lastTap < 0.25) return false;
    this.lastTap = this.elapsed;
    const good = this.inWindow;
    if (good) { this.progress += 1; this.tension = Math.max(0.08, this.tension - 0.1); }
    else this.tension += 0.27;
    if (this.tension >= 1) this.resolved = 'escaped';
    else if (this.progress >= 3 + Math.floor(this.difficulty)) this.resolved = 'caught';
    return good;
  }
}
