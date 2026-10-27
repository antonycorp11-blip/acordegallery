// Short-lived world-space particles and floating texts, pooled.

export type ParticleKind = 'spark' | 'bubble' | 'ink' | 'dust' | 'star' | 'ring' | 'trail' | 'bolt';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  big: boolean;
}

/** A coin flying from a capture (view coords) to the HUD counter. */
export interface CoinFly {
  x: number;
  y: number;
  t: number;
  delay: number;
}

const MAX_PARTICLES = 420;

export class Effects {
  particles: Particle[] = [];
  texts: FloatText[] = [];
  coins: CoinFly[] = [];
  private pool: Particle[] = [];
  shake = 0;
  flash = 0;

  spawn(kind: ParticleKind, x: number, y: number, vx: number, vy: number, life: number, color: string, size = 1): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    const p = this.pool.pop() ?? ({} as Particle);
    p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.max = life; p.color = color; p.size = size;
    this.particles.push(p);
  }

  burst(kind: ParticleKind, x: number, y: number, n: number, speed: number, life: number, colors: string[], size = 1): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      this.spawn(kind, x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), colors[i % colors.length], size);
    }
  }

  text(x: number, y: number, text: string, color: string, big = false, life = 0.9): void {
    // stack texts that land on the same spot
    let oy = 0;
    for (const t of this.texts) if (Math.abs(t.x - x) < 30 && Math.abs(t.y - (y - oy)) < 8 && t.life > t.max - 0.25) oy += 9;
    this.texts.push({ x, y: y - oy, text, color, life, max: life, big });
    if (this.texts.length > 24) this.texts.shift();
  }

  coinFly(viewX: number, viewY: number, n: number): void {
    for (let i = 0; i < n && this.coins.length < 40; i++) this.coins.push({ x: viewX + (Math.random() - 0.5) * 8, y: viewY + (Math.random() - 0.5) * 8, t: 0, delay: i * 0.05 });
  }

  update(dt: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.delay > 0) c.delay -= dt;
      else c.t += dt * 1.6;
      if (c.t >= 1) this.coins.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
        this.pool.push(p);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'bubble') {
        p.vy -= 20 * dt;
        p.vx += Math.sin(p.life * 12) * 6 * dt;
      } else if (p.kind === 'ink' || p.kind === 'dust') {
        p.vx *= Math.pow(0.08, dt);
        p.vy *= Math.pow(0.08, dt);
      } else {
        p.vx *= Math.pow(0.2, dt);
        p.vy *= Math.pow(0.2, dt);
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= dt * (t.life > t.max * 0.6 ? 28 : 6);
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
  }

  clear(): void {
    this.pool.push(...this.particles);
    this.particles.length = 0;
    this.texts.length = 0;
    this.coins.length = 0;
    this.shake = 0;
    this.flash = 0;
  }
}
