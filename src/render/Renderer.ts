import { VIEW_H, VIEW_W } from '../config';
import type { Camera } from '../core/Camera';
import { bossSpriteDef, type Boss } from '../entities/Boss';
import type { Claw } from '../entities/Claw';
import { paintClaw } from './ClawArt';
import type { Creature } from '../entities/Creature';
import type { RunStats } from '../systems/Upgrades';
import type { Terrain } from '../world/Terrain';
import type { Effects } from './Effects';
import { creatureSprite, drawEel, glowSprite, makeCanvas, variantPalette } from './PixelArt';
import { Scenery } from './Scenery';

export interface RenderView {
  cam: Camera;
  terrain: Terrain;
  time: number;
  creatures: readonly Creature[];
  claw: Claw;
  stats: RunStats;
  effects: Effects;
  aimX: number;
  aimY: number;
  showReticle: boolean;
  /** touch play: vertical dive guide and the creature currently in the path */
  path: { x: number; floorY: number; target: { x: number; y: number; w: number; h: number } | null } | null;
  sonar: { x: number; y: number; color: string } | null;
  warn: number; // 0..1 low-time pulse
  boss: Boss | null;
  /** world x of the current wall that blocks the way (null when free) */
  barrierX: number | null;
  /** -1..1 strength/direction of an active current event */
  current: number;
  /** 0..1 frenzy time left */
  frenzy: number;
  baits: readonly { def: { color: string; dark: string; seconds: number }; x: number; y: number; t: number; sinking: boolean }[];
}

export class Renderer {
  readonly low: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private dctx: CanvasRenderingContext2D;
  private scale = 1;
  private scenery: Scenery;
  /** where flying coins land, in display pixels (the HUD coin counter) */
  coinTarget = { x: 0, y: 0 };
  onCoinLanded: () => void = () => {};

  constructor(private display: HTMLCanvasElement) {
    this.low = makeCanvas(VIEW_W, VIEW_H);
    this.lctx = this.low.getContext('2d')!;
    this.dctx = display.getContext('2d')!;
    this.scenery = new Scenery(this.lctx);
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.display.width !== w || this.display.height !== h) {
      this.display.width = w;
      this.display.height = h;
    }
    if (this.low.width !== VIEW_W) this.low.width = VIEW_W;
    this.scale = w / VIEW_W;
  }

  /** Throw away cached terrain images (new run / new seed). */
  resetWorld(): void {
    this.scenery.reset();
  }

  render(v: RenderView): void {
    const ctx = this.lctx;
    ctx.imageSmoothingEnabled = false;
    const camX = Math.round(v.cam.x);
    const camY = Math.round(v.cam.y);

    this.scenery.drawBackground(camX, camY, v.time);
    if (v.barrierX !== null) this.drawBarrier(ctx, v.barrierX - camX, v.time);
    this.scenery.drawTerrain(v.terrain, camX, camY, v.time);
    if (v.boss) this.drawBoss(ctx, v.boss, camX, camY, v.time);
    for (const b of v.baits) this.drawBait(ctx, b, camX, camY, v.time);
    this.drawCreatures(ctx, v, camX, camY);
    this.drawParticles(ctx, v.effects, camX, camY);
    if (v.current !== 0) this.drawCurrent(ctx, v.current, v.time);
    this.scenery.drawFront(v.terrain, camX, camY, v.time);

    this.drawClaw(ctx, v, camX, camY);
    if (v.path) this.drawPath(ctx, v);
    else if (v.showReticle) this.drawReticle(ctx, v);
    if (v.sonar) this.drawSonar(ctx, v.sonar, v.time);

    if (v.frenzy > 0) {
      // warm pulsing frame while the frenzy lasts
      const a = 0.25 + 0.15 * Math.sin(v.time * 14);
      ctx.fillStyle = `rgba(255,150,40,${a})`;
      const th = 3;
      ctx.fillRect(0, 0, VIEW_W, th);
      ctx.fillRect(0, VIEW_H - th, VIEW_W, th);
      ctx.fillRect(0, 0, th, VIEW_H);
      ctx.fillRect(VIEW_W - th, 0, th, VIEW_H);
    }
    if (v.warn > 0) {
      ctx.fillStyle = `rgba(255,40,60,${0.18 * v.warn})`;
      ctx.fillRect(0, 0, VIEW_W, 2);
      ctx.fillRect(0, VIEW_H - 2, VIEW_W, 2);
      ctx.fillRect(0, 0, 2, VIEW_H);
      ctx.fillRect(VIEW_W - 2, 0, 2, VIEW_H);
    }
    if (v.effects.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 * v.effects.flash})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // compose: nearest-neighbor upscale, then crisp overlay text
    const d = this.dctx;
    d.imageSmoothingEnabled = false;
    const sh = v.effects.shake;
    const ox = sh > 0 ? Math.round((Math.random() - 0.5) * sh) * this.scale : 0;
    const oy = sh > 0 ? Math.round((Math.random() - 0.5) * sh) * this.scale : 0;
    d.drawImage(this.low, ox, oy, this.display.width, this.display.height);
    this.drawTexts(d, v.effects, camX, camY);
    this.drawCoins(d, v.effects);
  }

  // ───────────────────────── guardians & events

  private drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, camX: number, camY: number, t: number): void {
    const d = boss.def;
    let sx = boss.x - camX;
    const sy = boss.y - camY;
    if (sx < -d.w || sx > VIEW_W + d.w) return;
    if (boss.flinch > 0) sx += Math.round(Math.sin(t * 60) * 3);
    const fade = boss.defeated ? Math.max(0, 1 - boss.dying / 2) : 1;
    const scale = boss.defeated ? Math.max(0.2, 1 - boss.dying * 0.35) : 1;
    // menacing glow + telegraph flash
    const tele = boss.telegraph > 0;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (tele ? 0.45 + 0.35 * Math.sin(t * 30) : 0.18) * fade;
    const g = glowSprite(Math.max(d.w, d.h) * 0.75, tele ? '#ff3a3a' : d.palette.accent);
    ctx.drawImage(g, Math.round(sx - g.width / 2), Math.round(sy - g.height / 2));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = fade;
    const w = Math.max(4, Math.round(d.w * scale));
    const h = Math.max(4, Math.round(d.h * scale));
    if (d.shape === 'eel') {
      drawEel(ctx, Math.round(sx), Math.round(sy), w, h, boss.facing, t * 3, d.palette);
    } else {
      const frame = Math.floor(t * 3) % 4;
      const spr = creatureSprite(bossSpriteDef(d), 'normal', w, h, frame);
      const dx = Math.round(sx - spr.width / 2);
      const dy = Math.round(sy - spr.height / 2);
      if (boss.facing < 0 && d.shape !== 'crab') {
        ctx.save();
        ctx.translate(dx + spr.width, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0);
        ctx.restore();
      } else ctx.drawImage(spr, dx, dy);
    }
    // crown: every guardian wears one
    if (!boss.defeated) {
      const cx = Math.round(sx + d.crown.dx * d.w * boss.facing);
      const cy = Math.round(sy + d.crown.dy * d.h - 4);
      ctx.fillStyle = '#ffd84a';
      ctx.fillRect(cx - 6, cy + 2, 13, 3);
      for (const k of [-6, -2, 2, 6]) ctx.fillRect(cx + k, cy - (k === -2 || k === 2 ? 2 : 0), 1, 3);
      ctx.fillStyle = '#ff3a5a';
      ctx.fillRect(cx, cy + 3, 1, 1);
    }
    ctx.globalAlpha = 1;
    if (boss.defeated) return;

    // weak points: destroyed (scar), exposed (pulsing), waiting (dim)
    for (let i = 0; i < d.weakPoints.length; i++) {
      const p = boss.weakPointPos(i);
      const px = Math.round(p.x - camX + (sx - (boss.x - camX)));
      const py = Math.round(p.y - camY);
      if (i < boss.damage) {
        ctx.fillStyle = '#2a0a10';
        ctx.fillRect(px - 2, py - 1, 5, 3);
        ctx.fillStyle = '#5a1a20';
        ctx.fillRect(px - 1, py - 2, 3, 1);
      } else if (i === boss.activeWeak && boss.open) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 10);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.7 * pulse;
        const gg = glowSprite(10, '#ff4f6a');
        ctx.drawImage(gg, px - 10, py - 10);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ff4f6a';
        ctx.fillRect(px - 3, py - 2, 7, 5);
        ctx.fillRect(px - 2, py - 3, 5, 7);
        ctx.fillStyle = '#ffd0d8';
        ctx.fillRect(px - 1, py - 1, 2, 2);
      } else {
        ctx.fillStyle = i === boss.activeWeak ? '#7a8a9a' : '#4a3a4a';
        ctx.fillRect(px - 2, py - 2, 5, 4);
        ctx.fillStyle = '#a8b8c8';
        if (i === boss.activeWeak) ctx.fillRect(px - 2, py - 2, 5, 1);
      }
    }
  }

  private drawBait(ctx: CanvasRenderingContext2D, b: RenderView['baits'][number], camX: number, camY: number, t: number): void {
    const x = Math.round(b.x - camX);
    const y = Math.round(b.y - camY);
    if (x < -40 || x > VIEW_W + 40) return;
    if (b.sinking) {
      // a faint trail while it sinks
      ctx.fillStyle = b.def.color;
      ctx.globalAlpha = 0.35;
      for (let k = 1; k < 5; k++) ctx.fillRect(x, y - k * 4, 1, 2);
      ctx.globalAlpha = 1;
    } else {
      // attraction pulse (fades as the bait runs out)
      const life = Math.max(0, b.t / b.def.seconds);
      const r = 10 + ((t * 18) % 22);
      ctx.fillStyle = b.def.color;
      ctx.globalAlpha = (1 - (r - 10) / 22) * 0.6 * (0.4 + life * 0.6);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), 1, 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 8);
      const g = glowSprite(7, b.def.color);
      ctx.drawImage(g, x - 7, y - 7);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    // the bait pellet
    ctx.fillStyle = b.def.dark;
    ctx.fillRect(x - 2, y - 1, 5, 3);
    ctx.fillRect(x - 1, y - 2, 3, 5);
    ctx.fillStyle = b.def.color;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 1, y - 1, 1, 1);
  }

  /** Wall of rushing water that blocks the way until the guardian falls. */
  private drawBarrier(ctx: CanvasRenderingContext2D, sx: number, t: number): void {
    if (sx > VIEW_W + 30 || sx < -60) return;
    for (let i = 0; i < 46; i++) {
      const x = Math.round(sx + ((i * 37) % 40));
      const len = 10 + ((i * 13) % 20);
      const y = Math.round(((t * (120 + (i % 5) * 30) + i * 29) % (VIEW_H + len)) - len);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(200,240,255,0.28)';
      ctx.fillRect(x, y, 1, len);
    }
    ctx.fillStyle = 'rgba(160,220,255,0.12)';
    ctx.fillRect(Math.round(sx), 0, 40, VIEW_H);
  }

  private drawCurrent(ctx: CanvasRenderingContext2D, k: number, t: number): void {
    const dir = Math.sign(k);
    ctx.fillStyle = `rgba(220,245,255,${0.35 * Math.abs(k)})`;
    for (let i = 0; i < 36; i++) {
      const len = 8 + (i % 4) * 6;
      const x = Math.round(((((t * 260 * dir + i * 97) % (VIEW_W + 60)) + VIEW_W + 60) % (VIEW_W + 60)) - 30);
      const y = 20 + ((i * 53) % (VIEW_H - 60));
      ctx.fillRect(x, y, len, 1);
    }
  }

  /** Coins fly from captures to the HUD counter (display pixels, crisp). */
  private drawCoins(d: CanvasRenderingContext2D, fx: Effects): void {
    if (!fx.coins.length) return;
    const S = this.scale;
    const size = Math.max(4, Math.round(S * 2.5));
    for (const c of fx.coins) {
      if (c.delay > 0) continue;
      const k = c.t;
      const e = k * k * (3 - 2 * k);
      const x0 = c.x * S;
      const y0 = c.y * S;
      // arc upward then into the counter
      const x = x0 + (this.coinTarget.x - x0) * e;
      const y = y0 + (this.coinTarget.y - y0) * e - Math.sin(k * Math.PI) * 40 * S * 0.4;
      d.fillStyle = '#b8860b';
      d.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
      d.fillStyle = '#ffd84a';
      d.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size - Math.round(S * 0.6), size - Math.round(S * 0.6));
      d.fillStyle = '#fff6b0';
      d.fillRect(Math.round(x - size / 2) + 1, Math.round(y - size / 2) + 1, Math.max(1, Math.round(size / 3)), Math.max(1, Math.round(size / 3)));
      if (k > 0.95) this.onCoinLanded();
    }
  }

  // ───────────────────────── creatures

  private drawCreatures(ctx: CanvasRenderingContext2D, v: RenderView, camX: number, camY: number): void {
    for (const c of v.creatures) {
      if (c.removed || c.state === 'CAPTURED') continue;
      const sx = c.x - camX;
      const sy = c.y - camY;
      if (sx < -50 || sx > VIEW_W + 50 || sy < -50 || sy > VIEW_H + 50) continue;
      this.drawCreature(ctx, c, sx, sy, v.time);
    }
  }

  drawCreature(ctx: CanvasRenderingContext2D, c: Creature, sx: number, sy: number, t: number): void {
    const def = c.def;
    const glowy = def.special.includes('glow') || c.variant === 'biolum' || c.variant === 'golden';
    if (glowy) {
      const pal = variantPalette(def, c.variant);
      const r = Math.max(c.w, c.h) * 0.8 + 3;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 3 + c.seed);
      ctx.drawImage(glowSprite(r, c.variant === 'golden' ? '#ffd84a' : pal.accent), Math.round(sx - r), Math.round(sy - r));
      if (def.special.includes('lure')) {
        const lx = sx + c.facing * (c.w * 0.25);
        ctx.globalAlpha = 0.7;
        ctx.drawImage(glowSprite(9, pal.accent), Math.round(lx - 9), Math.round(sy - c.h / 2 - 14));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    let alpha = c.alpha;
    if (def.behavior === 'phantom') alpha *= 0.75 + 0.2 * Math.sin(t * 9 + c.seed);
    ctx.globalAlpha = alpha;
    if (def.shapeParts === 'eel') {
      drawEel(ctx, Math.round(sx), Math.round(sy), c.w, c.h, c.facing, c.phase, variantPalette(def, c.variant));
    } else {
      let frame = Math.floor(c.phase / 1.6) % 4;
      if (def.behavior === 'blinker') frame = Math.sin(t * 1.3 + c.seed) > 0.96 ? 3 : Math.floor(c.phase / 3) % 3;
      if (def.shapeParts === 'chest') frame = c.revealed > 0 ? 3 : def.behavior === 'mimic' && Math.sin(t * 0.9 + c.seed) > 0.94 ? 2 : 0;
      if (c.state === 'STUNNED') frame = 0;
      const spr = creatureSprite(def, c.variant, c.w, c.h, frame);
      const dx = Math.round(sx - spr.width / 2);
      let dy = Math.round(sy - spr.height / 2);
      let srcH = spr.height;
      if (c.sink > 0) {
        const cut = Math.round(c.sink * c.h * 0.85);
        dy += cut;
        srcH = Math.max(1, spr.height - cut);
      }
      if (c.facing < 0 && def.shapeParts !== 'crab' && def.shapeParts !== 'star' && def.shapeParts !== 'chest') {
        ctx.save();
        ctx.translate(dx + spr.width, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0, spr.width, srcH, 0, 0, spr.width, srcH);
        ctx.restore();
      } else {
        ctx.drawImage(spr, 0, 0, spr.width, srcH, dx, dy, spr.width, srcH);
      }
    }
    ctx.globalAlpha = 1;
    // dash trail
    if (c.trail > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const len = Math.round(10 * (c.trail / 0.35));
      const tx = Math.round(sx - c.facing * (c.w / 2 + 2));
      for (let i = 0; i < 3; i++) ctx.fillRect(tx - (c.facing > 0 ? len : 0), Math.round(sy - 2 + i * 2), len, 1);
    }
    // state hints: alert "!" and stun stars
    if (c.state === 'STUNNED') {
      ctx.fillStyle = '#ffee55';
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + (i * Math.PI * 2) / 3;
        ctx.fillRect(Math.round(sx + Math.cos(a) * 6), Math.round(sy - c.h / 2 - 3 + Math.sin(a) * 2), 1, 1);
      }
    } else if (c.alertTimer > 1.6 && c.def.perceptionRange > 0 && c.state !== 'FLEE') {
      ctx.fillStyle = '#ffffff';
      const ax = Math.round(sx);
      const ay = Math.round(sy - c.h / 2 - 7);
      ctx.fillRect(ax, ay, 1, 3);
      ctx.fillRect(ax, ay + 4, 1, 1);
    }
  }

  // ───────────────────────── particles & text

  private drawParticles(ctx: CanvasRenderingContext2D, fx: Effects, camX: number, camY: number): void {
    for (const p of fx.particles) {
      const x = Math.round(p.x - camX);
      const y = Math.round(p.y - camY);
      if (x < -10 || x > VIEW_W + 10 || y < -10 || y > VIEW_H + 10) continue;
      const k = p.life / p.max;
      ctx.fillStyle = p.color;
      switch (p.kind) {
        case 'ink':
          ctx.globalAlpha = Math.min(1, k * 1.4) * 0.85;
          ctx.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2);
          ctx.globalAlpha = 1;
          break;
        case 'ring': {
          const r = Math.round((1 - k) * p.size);
          ctx.globalAlpha = k;
          ctx.fillRect(x - r, y, 1, 1); ctx.fillRect(x + r, y, 1, 1);
          ctx.fillRect(x, y - r, 1, 1); ctx.fillRect(x, y + r, 1, 1);
          const d = Math.round(r * 0.7);
          ctx.fillRect(x - d, y - d, 1, 1); ctx.fillRect(x + d, y - d, 1, 1);
          ctx.fillRect(x - d, y + d, 1, 1); ctx.fillRect(x + d, y + d, 1, 1);
          ctx.globalAlpha = 1;
          break;
        }
        case 'bubble':
          ctx.fillRect(x, y, p.size, p.size);
          if (p.size > 1) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, 1, 1);
          }
          break;
        case 'star':
          ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillRect(x, y - 1, 1, 3);
          break;
        case 'bolt':
          ctx.fillRect(x, y, 1, 1);
          ctx.fillRect(x + (p.life * 100 % 2 > 1 ? 1 : -1), y + 1, 1, 1);
          break;
        default:
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.fillRect(x, y, p.size, p.size);
          ctx.globalAlpha = 1;
      }
    }
  }

  private drawTexts(d: CanvasRenderingContext2D, fx: Effects, camX: number, camY: number): void {
    if (!fx.texts.length) return;
    const S = this.scale;
    d.textAlign = 'center';
    d.textBaseline = 'middle';
    d.lineJoin = 'round';
    for (const t of fx.texts) {
      const size = Math.max(11, Math.round((t.big ? 8 : 5.6) * S));
      const k = t.life / t.max;
      const pop = k > 0.85 ? 1 + (k - 0.85) * 2.5 : 1;
      d.font = `900 ${Math.round(size * pop)}px "Trebuchet MS", "Arial Black", system-ui, sans-serif`;
      d.globalAlpha = Math.min(1, k * 3);
      const x = Math.round((t.x - camX) * S);
      const y = Math.round((t.y - camY) * S);
      d.lineWidth = Math.max(3, size * 0.28);
      d.strokeStyle = '#06131f';
      d.strokeText(t.text, x, y);
      d.fillStyle = t.color;
      d.fillText(t.text, x, y);
    }
    d.globalAlpha = 1;
  }

  // ───────────────────────── claw & reticle

  private drawClaw(ctx: CanvasRenderingContext2D, v: RenderView, camX: number, camY: number): void {
    const claw = v.claw;
    const look = v.stats.claw.look;
    const ax = Math.round(claw.x - camX);
    const tip = Math.round(claw.tipY - camY);
    const W = look.width;
    const hubY = tip - 9;

    // motion smear: afterimages + speed lines during the dive
    if (claw.state === 'STRIKE' || claw.state === 'CLOSE') {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = look.metalLight;
      for (const sy of claw.smear) {
        const y = Math.round(sy - camY);
        ctx.fillRect(ax - Math.round(W / 2), y - 8, W, 4);
      }
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ax - Math.round(W / 2) - 3, Math.max(0, hubY - 40), 1, 34);
      ctx.fillRect(ax + Math.round(W / 2) + 2, Math.max(0, hubY - 30), 1, 26);
      ctx.globalAlpha = 1;
    }

    paintClaw(ctx, ax, tip, v.stats.claw, v.stats.opening * Math.max(0, claw.open), v.time, v.stats.clawTier);

    // held prey rides the claw up
    for (const c of claw.held) this.drawCreature(ctx, c, ax, tip + Math.round(c.h * 0.25), v.time);
  }

  private drawReticle(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const x = Math.round(v.aimX);
    const y = Math.round(v.aimY);
    const out = y > v.stats.reach;
    const ready = !v.claw.busy;
    const col = out ? '#ff5a6a' : ready ? '#ffffff' : '#9fd8e8';
    const r = Math.max(5, Math.round(v.stats.opening * 0.7));
    ctx.fillStyle = col;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = x + sx * r;
      const cy = y + sy * r;
      ctx.fillRect(sx < 0 ? cx : cx - 2, cy, 3, 1);
      ctx.fillRect(cx, sy < 0 ? cy : cy - 2, 1, 3);
    }
    ctx.fillRect(x, y, 1, 1);
    // alignment guide from the claw
    ctx.globalAlpha = 0.18;
    for (let gy = 34; gy < y - r - 2; gy += 5) ctx.fillRect(x, gy, 1, 2);
    ctx.globalAlpha = 1;
    if (out) {
      // reach limit marker
      ctx.fillStyle = '#ff5a6a';
      const ry = Math.round(v.stats.reach);
      for (let dx = -6; dx <= 6; dx += 3) ctx.fillRect(x + dx, ry, 2, 1);
    }
    if (!ready) {
      const k = v.claw.cooldownProgress;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - r, y + r + 3, r * 2 + 1, 2);
      ctx.fillStyle = '#7affea';
      ctx.fillRect(x - r, y + r + 3, Math.round((r * 2 + 1) * k), 2);
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D, v: RenderView): void {
    const p = v.path!;
    const x = Math.round(p.x);
    const ready = !v.claw.busy;
    const t = p.target;
    const endY = Math.round(t ? t.y : p.floorY);
    // dotted dive line from the claw to the target (or the sand)
    ctx.globalAlpha = ready ? 0.45 : 0.15;
    ctx.fillStyle = t ? '#ffe14a' : '#ffffff';
    const phase = Math.floor(v.time * 20) % 6;
    for (let y = 36 + phase; y < endY - 2; y += 6) ctx.fillRect(x, y, 1, 3);
    ctx.globalAlpha = 1;
    if (t && ready) {
      // lock-on brackets around whatever is in the way
      const hw = Math.round(t.w / 2) + 3;
      const hh = Math.round(t.h / 2) + 3;
      const tx = Math.round(t.x);
      const ty = Math.round(t.y);
      const pulse = Math.sin(v.time * 10) > 0 ? 1 : 0;
      ctx.fillStyle = '#ffe14a';
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = tx + sx * (hw + pulse);
        const cy = ty + sy * (hh + pulse);
        ctx.fillRect(sx < 0 ? cx : cx - 2, cy, 3, 1);
        ctx.fillRect(cx, sy < 0 ? cy : cy - 2, 1, 3);
      }
    } else if (ready) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - 3, endY, 7, 1);
    }
    if (!ready) {
      const k = v.claw.cooldownProgress;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 8, 40, 17, 2);
      ctx.fillStyle = '#7affea';
      ctx.fillRect(x - 8, 40, Math.round(17 * k), 2);
    }
  }

  private drawSonar(ctx: CanvasRenderingContext2D, s: { x: number; y: number; color: string }, t: number): void {
    if (Math.sin(t * 8) < -0.2) return;
    const right = s.x > VIEW_W / 2;
    const x = right ? VIEW_W - 6 : 5;
    const y = Math.round(Math.max(40, Math.min(VIEW_H - 30, s.y)));
    ctx.fillStyle = '#06131f';
    ctx.fillRect(x - 3, y - 4, 4, 9);
    ctx.fillStyle = s.color;
    for (let i = 0; i < 4; i++) {
      const h = 4 - i;
      ctx.fillRect(right ? x - 3 + i : x - i, y - h + 1, 1, h * 2 - 1);
    }
  }
}
