import { CONFIG, VIEW_H, VIEW_W } from '../config';
import { hashFloat, valueNoise1D } from '../core/RNG';
import type { Camera } from '../core/Camera';
import type { Claw } from '../entities/Claw';
import type { Creature } from '../entities/Creature';
import type { ClawDefinition } from '../entities/ClawsCatalog';
import type { RunStats } from '../systems/Upgrades';
import { lightRaysAt, paletteAt, type BiomePalette } from '../world/Biomes';
import type { Terrain } from '../world/Terrain';
import { hexToRgb, shade } from './Color';
import type { Effects } from './Effects';
import { creatureSprite, decorSprite, drawEel, glowSprite, makeCanvas, Painter, variantPalette } from './PixelArt';

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
}

interface ChunkImage {
  canvas: HTMLCanvasElement;
  x0: number;
  top: number;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const CHUNK_PAD = 64;
const GROUND_DEPTH = 210;

export class Renderer {
  readonly low: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private dctx: CanvasRenderingContext2D;
  private scale = 1;
  private chunkImages = new Map<number, ChunkImage>();
  private waterKey = '';
  private waterPattern: CanvasPattern | null = null;
  private rays: HTMLCanvasElement;
  private snow: { x: number; y: number; s: number; d: number }[] = [];
  private lp: Painter;

  constructor(private display: HTMLCanvasElement) {
    this.low = makeCanvas(VIEW_W, VIEW_H);
    this.lctx = this.low.getContext('2d')!;
    this.lp = new Painter(this.low);
    this.dctx = display.getContext('2d')!;
    this.rays = this.buildRays();
    for (let i = 0; i < 70; i++) this.snow.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.7, d: Math.random() });
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (this.display.width !== w || this.display.height !== h) {
      this.display.width = w;
      this.display.height = h;
    }
    this.scale = w / VIEW_W;
  }

  /** Throw away cached terrain images (new run / new seed). */
  resetWorld(): void {
    this.chunkImages.clear();
  }

  render(v: RenderView): void {
    const ctx = this.lctx;
    ctx.imageSmoothingEnabled = false;
    const camX = Math.round(v.cam.x);
    const camY = Math.round(v.cam.y);
    const pal = paletteAt(camX + VIEW_W / 2);

    this.drawWater(ctx, pal);
    this.drawRays(ctx, camX, v.time, lightRaysAt(camX + VIEW_W / 2));
    this.drawSilhouettes(ctx, camX, camY, pal, v.time);
    this.drawSnow(ctx, camX, v.time, pal);

    const cw = CONFIG.terrain.chunkWidth;
    const first = Math.floor((camX - CHUNK_PAD) / cw);
    const last = Math.floor((camX + VIEW_W + CHUNK_PAD) / cw);
    for (let i = first; i <= last; i++) {
      if (i < -1) continue;
      const img = this.chunkImage(v.terrain, i);
      ctx.drawImage(img.canvas, img.x0 - CHUNK_PAD - camX, img.top - camY);
    }
    for (let i = first; i <= last; i++) if (i >= 0) this.drawLiveDecor(ctx, v.terrain, i, camX, camY, v.time, false);

    this.drawCreatures(ctx, v, camX, camY);
    this.drawParticles(ctx, v.effects, camX, camY);
    for (let i = first; i <= last; i++) if (i >= 0) this.drawLiveDecor(ctx, v.terrain, i, camX, camY, v.time, true);

    this.drawClaw(ctx, v, camX, camY);
    if (v.path) this.drawPath(ctx, v);
    else if (v.showReticle) this.drawReticle(ctx, v);
    if (v.sonar) this.drawSonar(ctx, v.sonar, v.time);

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
  }

  // ───────────────────────── background

  private drawWater(ctx: CanvasRenderingContext2D, pal: BiomePalette): void {
    const key = pal.waterTop + pal.waterBottom;
    if (key !== this.waterKey || !this.waterPattern) {
      this.waterKey = key;
      const c = makeCanvas(4, VIEW_H);
      const g = c.getContext('2d')!;
      const img = g.createImageData(4, VIEW_H);
      const a = hexToRgb(pal.waterTop);
      const b = hexToRgb(pal.waterBottom);
      const bands = 14;
      for (let y = 0; y < VIEW_H; y++) {
        const t = (y / VIEW_H) * bands;
        const band = Math.floor(t);
        for (let x = 0; x < 4; x++) {
          const k = (band + (t - band > BAYER[(y % 4) * 4 + x] / 16 ? 1 : 0)) / bands;
          const i = (y * 4 + x) * 4;
          img.data[i] = a[0] + (b[0] - a[0]) * k;
          img.data[i + 1] = a[1] + (b[1] - a[1]) * k;
          img.data[i + 2] = a[2] + (b[2] - a[2]) * k;
          img.data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      this.waterPattern = ctx.createPattern(c, 'repeat');
    }
    ctx.fillStyle = this.waterPattern!;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  private buildRays(): HTMLCanvasElement {
    const c = makeCanvas(VIEW_W * 2, 210);
    const P = new Painter(c);
    for (let k = 0; k < 7; k++) {
      const x0 = 40 + k * 140 + Math.round(hashFloat(k, 9) * 60);
      const w = 10 + Math.round(hashFloat(k, 3) * 22);
      for (let y = 0; y < 210; y++) {
        const fade = 1 - y / 210;
        if ((y * 7 + k) % 16 > fade * 16 + 2) continue;
        P.rect(x0 + Math.floor(y * 0.45), y, w, 1, '#ffffff');
      }
    }
    return c;
  }

  private drawRays(ctx: CanvasRenderingContext2D, camX: number, t: number, amount: number): void {
    if (amount <= 0.02) return;
    const off = (((camX * 0.15 + Math.sin(t * 0.3) * 8) % VIEW_W) + VIEW_W) % VIEW_W;
    ctx.globalAlpha = 0.09 * amount;
    ctx.drawImage(this.rays, -Math.round(off), 0);
    ctx.globalAlpha = 1;
  }

  private drawSilhouettes(ctx: CanvasRenderingContext2D, camX: number, camY: number, pal: BiomePalette, t: number): void {
    const layers = [
      { par: 0.2, base: 150, amp: 46, freq: 1 / 140, color: pal.farSil, seed: 501 },
      { par: 0.45, base: 178, amp: 40, freq: 1 / 90, color: pal.midSil, seed: 733 },
    ];
    for (const L of layers) {
      ctx.fillStyle = L.color;
      const yOff = -camY * L.par * 0.3;
      for (let x = 0; x < VIEW_W; x += 2) {
        const wx = camX * L.par + x;
        const n = valueNoise1D(L.seed, wx * L.freq) * 0.7 + valueNoise1D(L.seed + 1, wx * L.freq * 3.1) * 0.3;
        // occasional spires
        const spire = Math.max(0, valueNoise1D(L.seed + 2, wx / 23) - 0.6) * 90;
        const top = Math.round(L.base - n * L.amp - spire + yOff);
        ctx.fillRect(x, top, 2, VIEW_H - top);
      }
    }
    // distant glowing specks in deep zones
    if (pal.glow) {
      ctx.fillStyle = pal.glow;
      for (let i = 0; i < 18; i++) {
        const wx = Math.floor(camX * 0.45 / 60) * 60 + i * 60;
        if (hashFloat(wx, 17) > 0.35) continue;
        const sx = Math.round(wx - camX * 0.45 + (hashFloat(wx, 3) * 40));
        const sy = Math.round(150 + hashFloat(wx, 5) * 60 - camY * 0.135);
        if (Math.sin(t * 2 + i) > -0.3) ctx.fillRect(sx, sy, 1, 1);
      }
    }
  }

  private drawSnow(ctx: CanvasRenderingContext2D, camX: number, t: number, pal: BiomePalette): void {
    ctx.fillStyle = pal.particle;
    ctx.globalAlpha = 0.55;
    for (const s of this.snow) {
      const x = ((s.x * VIEW_W - camX * 0.7 * s.s + Math.sin(t * 0.7 + s.d * 6) * 4) % VIEW_W + VIEW_W) % VIEW_W;
      const y = ((s.y * VIEW_H + t * 6 * s.s) % VIEW_H + VIEW_H) % VIEW_H;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ───────────────────────── terrain chunks

  private chunkImage(terrain: Terrain, index: number): ChunkImage {
    let img = this.chunkImages.get(index);
    if (img) return img;
    const cw = CONFIG.terrain.chunkWidth;
    const x0 = index * cw;
    const chunk = index >= 0 ? terrain.getChunk(index) : { decor: [], crevices: [], index };
    let minY = Infinity;
    let maxY = -Infinity;
    for (let x = -CHUNK_PAD; x < cw + CHUNK_PAD; x += 4) {
      const y = terrain.seabedY(x0 + x);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (const d of chunk.decor) minY = Math.min(minY, d.y - d.h - 4);
    const top = Math.floor(minY - 8);
    const height = Math.ceil(maxY + GROUND_DEPTH - top);
    const canvas = makeCanvas(cw + CHUNK_PAD * 2, height);
    const P = new Painter(canvas);
    const ox = CHUNK_PAD - x0;
    const oy = -top;

    const back = chunk.decor.filter((d) => d.type === 'rock' || d.type === 'coral' || d.type === 'ruin' || d.type === 'wreck');
    for (const d of back) {
      const s = decorSprite(d, paletteAt(d.x));
      P.ctx.drawImage(s, Math.round(d.x - d.w / 2 + ox), Math.round(d.y - d.h + oy));
    }
    // ground columns (only the chunk's own span)
    for (let x = 0; x < cw; x++) {
      const wx = x0 + x;
      const p = paletteAt(wx);
      const sy = Math.round(terrain.seabedY(wx)) + oy;
      const cx = x + CHUNK_PAD;
      P.rect(cx, sy, 1, 1, p.sandLight);
      P.rect(cx, sy + 1, 1, 4, p.sand);
      P.rect(cx, sy + 5, 1, 40, p.sandDark);
      P.rect(cx, sy + 45, 1, GROUND_DEPTH, shade(p.sandDark, -0.3));
      // dithered strata boundaries
      for (let y = 0; y < 4; y++) {
        if (BAYER[((sy + y) % 4) * 4 + (wx % 4)] < 8) P.p(cx, sy + 3 + y, p.sandDark);
        if (BAYER[((sy + y) % 4) * 4 + (wx % 4)] < 6) P.p(cx, sy + 43 + y, shade(p.sandDark, -0.3));
      }
      // pebbles & speckles, fixed by world position
      for (let k = 0; k < 5; k++) {
        const h = hashFloat(terrain.seed, wx, k);
        if (h > 0.22) continue;
        const dy = 2 + Math.floor(hashFloat(wx, k, 5) * 70);
        P.p(cx, sy + dy, dy < 6 ? p.sandLight : dy < 40 ? p.sand : p.sandDark);
      }
    }
    for (const d of chunk.decor) {
      if (d.type === 'crevice') {
        const s = decorSprite(d, paletteAt(d.x));
        P.ctx.drawImage(s, Math.round(d.x - d.w / 2 + ox), Math.round(d.y + oy));
      } else if (d.type === 'shell') {
        const s = decorSprite(d, paletteAt(d.x));
        P.ctx.drawImage(s, Math.round(d.x - 2 + ox), Math.round(d.y - 3 + oy));
      }
    }
    img = { canvas, x0, top };
    this.chunkImages.set(index, img);
    if (this.chunkImages.size > 10) {
      for (const k of this.chunkImages.keys()) {
        if (Math.abs(k - index) > 4) this.chunkImages.delete(k);
      }
    }
    return img;
  }

  private drawLiveDecor(ctx: CanvasRenderingContext2D, terrain: Terrain, index: number, camX: number, camY: number, t: number, front: boolean): void {
    const chunk = terrain.getChunk(index);
    for (const d of chunk.decor) {
      if (d.front !== front) continue;
      const sx = Math.round(d.x - camX);
      if (sx < -40 || sx > VIEW_W + 40) continue;
      const sy = Math.round(d.y - camY);
      if (d.type === 'weed') {
        const p = paletteAt(d.x);
        const dark = shade(p.weed, -0.35);
        const ph = (d.seed % 1000) / 160;
        for (let i = 0; i < d.h; i++) {
          const f = i / d.h;
          const off = Math.round(Math.sin(t * 1.8 + ph + i * 0.18) * f * 3.5);
          ctx.fillStyle = i % 5 === 0 ? dark : p.weed;
          ctx.fillRect(sx + off, sy - i, 2, 1);
          if (i % 6 === 3) {
            ctx.fillStyle = p.weed;
            ctx.fillRect(sx + off + (i % 12 === 3 ? 2 : -1), sy - i, 1, 1);
          }
        }
      } else if (d.type === 'glowPlant') {
        const p = paletteAt(d.x);
        const ph = (d.seed % 1000) / 160;
        const stalk = shade(p.weed, -0.4);
        let tipX = sx;
        for (let i = 0; i < d.h; i++) {
          tipX = sx + Math.round(Math.sin(t * 1.2 + ph + i * 0.12) * (i / d.h) * 2);
          ctx.fillStyle = stalk;
          ctx.fillRect(tipX, sy - i, 1, 1);
        }
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.4 + ph);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 * pulse;
        const g = glowSprite(6, p.glow);
        ctx.drawImage(g, tipX - 6, sy - d.h - 6);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = p.glow;
        ctx.fillRect(tipX - 1, sy - d.h - 1, 3, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(tipX, sy - d.h - 1, 1, 1);
      }
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
      if (c.facing < 0 && def.shapeParts !== 'crab' && def.shapeParts !== 'star') {
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

    paintClaw(ctx, this.lp, ax, tip, v.stats.claw, v.stats.opening * Math.max(0, claw.open), v.time);

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

/** Draws a claw (shaft from the top edge, hub, prongs). Shared by the game and the workshop preview. */
export function paintClaw(
  ctx: CanvasRenderingContext2D,
  P: Painter,
  ax: number,
  tip: number,
  def: ClawDefinition,
  spreadPx: number,
  time: number,
): void {
  const look = def.look;
  const id = def.id;
  const W = look.width;
  const hubY = tip - 9;
  const spread = Math.max(1, spreadPx);
  // shaft
  const shaftTop = -2;
  const shaftBot = hubY;
  ctx.fillStyle = look.metalDark;
  ctx.fillRect(ax - 2, shaftTop, 4, shaftBot - shaftTop);
  ctx.fillStyle = look.metal;
  ctx.fillRect(ax - 1, shaftTop, 2, shaftBot - shaftTop);
  ctx.fillStyle = look.metalLight;
  ctx.fillRect(ax - 1, shaftTop, 1, shaftBot - shaftTop);
  ctx.fillStyle = look.accent;
  for (let y = shaftBot - 6; y > shaftTop; y -= 12) ctx.fillRect(ax - 2, y, 4, 1);
  if (id === 'hydraulic') {
    // pistons
    ctx.fillStyle = look.metalDark;
    ctx.fillRect(ax - 5, hubY - 12, 2, 12);
    ctx.fillRect(ax + 3, hubY - 12, 2, 12);
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(ax - 5, hubY - 5, 2, 5);
    ctx.fillRect(ax + 3, hubY - 5, 2, 5);
  } else if (id === 'lightning') {
    ctx.fillStyle = look.accent;
    for (let y = hubY - 3; y > Math.max(0, hubY - 30); y -= 6) ctx.fillRect(ax + ((y / 6) % 2 ? 1 : -2), y, 2, 2);
  }

  // hub
  ctx.fillStyle = look.metalDark;
  ctx.fillRect(ax - Math.round(W / 2) - 1, hubY - 1, W + 2, 7);
  ctx.fillStyle = look.metal;
  ctx.fillRect(ax - Math.round(W / 2), hubY, W, 5);
  ctx.fillStyle = look.metalLight;
  ctx.fillRect(ax - Math.round(W / 2), hubY, W, 1);
  ctx.fillStyle = look.accent;
  ctx.fillRect(ax - 1, hubY + 2, 2, 2);

  // prongs
  for (const s of [-1, 1]) {
    const bx = ax + s * (Math.round(W / 2) - 1);
    const kx = ax + s * Math.round(spread + 2);
    const ky = tip - 2;
    const tx = ax + s * Math.max(1, Math.round(spread * 0.3));
    P.line(bx, hubY + 5, kx, ky, look.metalDark, 2);
    P.line(kx, ky, tx, tip + 3, look.metalDark, 2);
    P.line(bx, hubY + 5, kx, ky, look.metal);
    P.line(kx, ky, tx, tip + 3, look.metalLight);
  }
  if (look.prongs === 3) {
    P.line(ax, hubY + 5, ax, tip + 3, look.metalDark, 2);
    P.line(ax, hubY + 5, ax, tip + 2, look.metalLight);
  }
  if (id === 'electric' && Math.sin(time * 23) > 0.4) {
    ctx.fillStyle = look.accent;
    ctx.fillRect(ax - Math.round(spread) - 2 + Math.round(Math.random() * 3), tip + Math.round(Math.random() * 3), 1, 1);
    ctx.fillRect(ax + Math.round(spread) + 1 - Math.round(Math.random() * 3), tip + Math.round(Math.random() * 3), 1, 1);
  }

}
