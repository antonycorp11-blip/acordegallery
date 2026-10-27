// Procedural pixel-art sprites. Everything is drawn pixel by pixel into small
// cached canvases; no external images. Sprites face RIGHT; flip when drawing.

import { hueShift, mixColor, shade } from './Color';
import { seededRandom } from '../core/RNG';
import type { SpeciesDefinition, SpeciesPalette, VariantId } from '../entities/Species';
import type { Decor } from '../world/Terrain';
import type { BiomePalette } from '../world/Biomes';

type Canvas = HTMLCanvasElement;

export function makeCanvas(w: number, h: number): Canvas {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Pixel painter over a canvas 2D context. */
export class Painter {
  readonly ctx: CanvasRenderingContext2D;
  constructor(readonly canvas: Canvas) {
    this.ctx = canvas.getContext('2d')!;
  }
  p(x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, color: string, thick = 1): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.ctx.fillStyle = color;
    for (let guard = 0; guard < 400; guard++) {
      this.ctx.fillRect(x0, y0, thick, thick);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
}

// ───────────────────────────── palettes per variant

const variantPaletteCache = new Map<string, SpeciesPalette>();

export function variantPalette(def: SpeciesDefinition, variant: VariantId): SpeciesPalette {
  const key = def.id + variant;
  let p = variantPaletteCache.get(key);
  if (p) return p;
  const b = def.palette;
  switch (variant) {
    case 'golden':
      p = { main: '#ffcf2e', dark: '#a86f0c', light: '#fff6b0', accent: '#ffffff', eye: b.eye };
      break;
    case 'mutant':
      p = { main: hueShift(b.main, 140), dark: hueShift(b.dark, 140), light: hueShift(b.light, 140), accent: '#b6ff3a', eye: '#ff2a5a' };
      break;
    case 'biolum':
      p = { main: shade(hueShift(b.main, 180), 0.2), dark: hueShift(b.dark, 180), light: '#e8fffb', accent: '#7affea', eye: b.eye };
      break;
    default:
      p = b;
  }
  variantPaletteCache.set(key, p);
  return p;
}

// ───────────────────────────── creature sprites

const spriteCache = new Map<string, Canvas>();
export const FRAMES = 4;

export function creatureSprite(def: SpeciesDefinition, variant: VariantId, w: number, h: number, frame: number): Canvas {
  const key = `${def.id}|${variant}|${w}x${h}|${frame}`;
  let c = spriteCache.get(key);
  if (c) return c;
  const pal = variantPalette(def, variant);
  // sprites get a 2px margin for fins/antennae/legs
  const pad = 2;
  c = makeCanvas(w + pad * 2, h + pad * 2);
  const P = new Painter(c);
  P.ctx.translate(pad, pad);
  switch (def.shapeParts) {
    case 'fish': drawFish(P, w, h, pal, frame, def.id === 'orangeFish'); break;
    case 'boxfish': drawBoxfish(P, w, h, pal, frame); break;
    case 'crab': drawCrab(P, w, h, pal, frame); break;
    case 'star': drawStar(P, w, h, pal, frame); break;
    case 'lobster': drawLobster(P, w, h, pal, frame); break;
    case 'octopus': drawOctopus(P, w, h, pal, frame); break;
    case 'jelly': drawJelly(P, w, h, pal, frame); break;
    case 'angler': drawAngler(P, w, h, pal, frame); break;
    case 'eye': drawEye(P, w, h, pal, frame); break;
    case 'shark': drawShark(P, w, h, pal, frame); break;
    case 'chest': drawChest(P, w, h, pal, frame); break;
    case 'puffer': drawPuffer(P, w, h, pal, frame); break;
    case 'seahorse': drawSeahorse(P, w, h, pal, frame); break;
    case 'hermit': drawHermit(P, w, h, pal, frame); break;
    case 'ray': drawRay(P, w, h, pal, frame); break;
    case 'eel': break; // drawn live (segmented)
  }
  if (variant === 'mutant' && def.shapeParts !== 'eye') {
    // extra eye: mutants are a little wrong
    P.p(Math.round(w * 0.45), Math.round(h * 0.3), '#ffffff');
    P.p(Math.round(w * 0.45) + 1, Math.round(h * 0.3), pal.eye);
  }
  if (spriteCache.size > 900) spriteCache.clear();
  spriteCache.set(key, c);
  return c;
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  const dx = (x + 0.5 - cx) / rx;
  const dy = (y + 0.5 - cy) / ry;
  return dx * dx + dy * dy;
}

/** Fills an ellipse with top-dark / mid / belly-light shading and outline. */
function shadedEllipse(P: Painter, cx: number, cy: number, rx: number, ry: number, pal: SpeciesPalette, power = 2): void {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = Math.abs((x + 0.5 - cx) / rx);
      const dy = Math.abs((y + 0.5 - cy) / ry);
      const d = Math.pow(dx, power) + Math.pow(dy, power);
      if (d > 1) continue;
      const edge = d > 0.72;
      const rel = (y + 0.5 - (cy - ry)) / (2 * ry);
      let col = rel < 0.3 ? pal.dark : rel > 0.7 ? pal.light : pal.main;
      if (edge) col = rel > 0.7 ? pal.main : pal.dark;
      P.p(x, y, col);
    }
  }
}

function drawFish(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number, stripes: boolean): void {
  const tail = Math.max(3, Math.round(w * 0.26));
  const cx = tail + (w - tail) / 2;
  const cy = h / 2;
  const rx = (w - tail) / 2 + 0.5;
  const ry = h / 2 - 0.6;
  const wag = [0, 1, 0, -1][frame % 4];
  // tail fork
  for (let x = 0; x < tail; x++) {
    const f = 1 - x / tail;
    const half = 0.8 + f * h * 0.42;
    const yc = cy + wag * f * 1.2;
    for (let y = Math.floor(yc - half); y <= Math.ceil(yc + half); y++) {
      if (Math.abs(y + 0.5 - yc) > half) continue;
      // fork notch
      if (f > 0.55 && Math.abs(y + 0.5 - yc) < half * 0.35) continue;
      P.p(x, y, f > 0.6 ? pal.dark : pal.main);
    }
  }
  // dorsal + belly fins
  const fx = Math.round(cx - rx * 0.1);
  P.rect(fx - 1, Math.round(cy - ry) - 1, 3, 1, pal.dark);
  P.p(fx - 2, Math.round(cy - ry) - 1 + (frame % 2), pal.dark);
  P.rect(fx, Math.round(cy + ry), 2, 1, pal.dark);
  shadedEllipse(P, cx, cy, rx, ry, pal);
  if (stripes) {
    for (const t of [0.42, 0.66]) {
      const sx = Math.round(tail + (w - tail) * t);
      for (let y = 0; y < h; y++) if (inEllipse(sx, y, cx, cy, rx, ry) < 0.8) P.p(sx, y, pal.accent);
    }
  }
  // pectoral fin flaps
  const px = Math.round(cx + rx * 0.15);
  P.p(px, Math.round(cy + 1 + (frame % 2)), pal.dark);
  // eye + mouth
  const ex = Math.round(w - rx * 0.42);
  const ey = Math.round(cy - ry * 0.3);
  if (h >= 7) {
    P.p(ex, ey, '#ffffff');
    P.p(ex + 1, ey, pal.eye);
    P.p(ex, ey + 1, pal.eye);
  } else P.p(ex, ey, pal.eye);
  P.p(w - 1, Math.round(cy + 1), pal.dark);
}

function drawBoxfish(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const tail = Math.max(3, Math.round(w * 0.2));
  const cx = tail + (w - tail) / 2;
  const cy = h / 2;
  const rx = (w - tail) / 2;
  const ry = h / 2 - 0.5;
  const wag = [0, 1, 0, -1][frame % 4];
  for (let x = 0; x < tail; x++) {
    const half = 1 + (1 - x / tail) * 2;
    for (let y = Math.round(cy - half + wag); y <= Math.round(cy + half + wag); y++) P.p(x, y, pal.dark);
  }
  shadedEllipse(P, cx, cy, rx, ry, pal, 4);
  // hexagonal plate spots
  for (let y = 2; y < h - 2; y += 3) {
    for (let x = tail + 2 + ((y / 3) % 2 ? 1 : 0); x < w - 3; x += 3) {
      if (inEllipse(x, y, cx, cy, rx * 0.85, ry * 0.85) < 1) P.p(x, y, pal.accent);
    }
  }
  const ex = Math.round(w - rx * 0.45);
  const ey = Math.round(cy - ry * 0.35);
  P.rect(ex, ey, 2, 2, '#ffffff');
  P.p(ex + 1, ey + 1, pal.eye);
  P.rect(w - 1, Math.round(cy), 1, 2, pal.dark);
  P.p(Math.round(cx), Math.round(cy + ry) + (frame % 2), pal.dark);
}

function drawCrab(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const cx = w / 2;
  const shellY = h * 0.5;
  const rx = w * 0.32;
  const ry = h * 0.3;
  const step = frame % 2;
  // legs: 3 per side
  for (let i = 0; i < 3; i++) {
    const lx = cx - rx * 0.6 + i * (rx * 0.6);
    const off = (i + step) % 2;
    P.line(lx - rx * 0.4, shellY + 1, lx - rx * 0.9 - 1, h - 1 - off, pal.dark);
    P.line(w - lx + rx * 0.4, shellY + 1, w - lx + rx * 0.9 + 1, h - 1 - (1 - off), pal.dark);
  }
  // arms + pincers
  const armUp = step ? 1 : 0;
  P.line(cx - rx + 1, shellY - 1, 2, shellY - 3 - armUp, pal.main);
  P.line(cx + rx - 1, shellY - 1, w - 3, shellY - 3 - armUp, pal.main);
  for (const sx of [0, w - 3]) {
    const py = Math.round(shellY - 5 - armUp);
    P.rect(sx, py, 3, 3, pal.main);
    P.p(sx + 1, py, pal.light);
    P.p(sx + (sx === 0 ? 2 : 0), py + 1, pal.dark); // pincer gap
  }
  shadedEllipse(P, cx, shellY, rx, ry, pal);
  // shell highlight
  P.rect(Math.round(cx - 1), Math.round(shellY - ry + 1), 2, 1, pal.light);
  // eye stalks
  const ey = Math.round(shellY - ry - 2);
  for (const ex of [Math.round(cx - 2), Math.round(cx + 1)]) {
    P.p(ex, ey + 1, pal.dark);
    P.p(ex, ey, pal.eye);
  }
}

function drawStar(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) / 2;
  const rot = -Math.PI / 2 + frame * 0.04;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) - rot;
      const f = Math.max(0, Math.cos(a * 5 / 2) ** 2);
      const edge = R * (0.38 + 0.62 * Math.pow(f, 1.4));
      if (r > edge) continue;
      let col = r > edge - 1.1 ? pal.dark : pal.main;
      if (r < R * 0.22) col = pal.light;
      P.p(x, y, col);
    }
  }
  // bumps along arms
  for (let k = 0; k < 5; k++) {
    const a = rot + (k * 2 * Math.PI) / 5;
    P.p(Math.round(cx + Math.cos(a) * R * 0.5 - 0.5), Math.round(cy + Math.sin(a) * R * 0.5 - 0.5), pal.accent);
  }
}

function drawLobster(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const mid = Math.round(h * 0.45);
  const fan = 3;
  // tail fan
  P.rect(0, mid - 2, 1, 5, pal.dark);
  P.rect(1, mid - 1, 2, 3, pal.main);
  // abdomen segments
  const abEnd = Math.round(w * 0.55);
  for (let x = fan; x < abEnd; x++) {
    const seg = (x - fan) % 3 === 0;
    const th = 2 + Math.round(((x - fan) / (abEnd - fan)) * 1.5);
    for (let y = mid - th; y <= mid + th - 1; y++) {
      P.p(x, y, seg ? pal.dark : y < mid - th + 1 ? pal.light : pal.main);
    }
  }
  // carapace
  shadedEllipse(P, w * 0.67, mid, w * 0.15, h * 0.32, pal);
  // legs
  const step = frame % 2;
  for (let i = 0; i < 4; i++) {
    const lx = Math.round(w * 0.5 + i * 2);
    P.p(lx, mid + 3, pal.dark);
    P.p(lx + ((i + step) % 2), mid + 4, pal.dark);
  }
  // big claws
  const cxs = Math.round(w * 0.8);
  P.line(cxs - 2, mid + 1, cxs + 1, mid + 2, pal.main);
  P.rect(cxs + 1, mid + 1, 4, 3, pal.main);
  P.rect(cxs + 4, mid + 1, 1, 1, pal.light);
  P.p(cxs + 3, mid + 2 + step, pal.dark);
  // head + eye
  P.p(Math.round(w * 0.78), mid - 2, pal.eye);
  // antennae
  const wave = [0, 1, 0, -1][frame % 4];
  P.line(Math.round(w * 0.8), mid - 2, w - 1, mid - 5 + wave, pal.light);
  P.line(Math.round(w * 0.78), mid - 2, w - 3, mid - 6 - wave, pal.dark);
}

function drawOctopus(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const cx = w / 2;
  const headCy = h * 0.32;
  // tentacles
  const n = 5;
  for (let t = 0; t < n; t++) {
    const bx = w * 0.2 + (t * (w * 0.6)) / (n - 1);
    let px = bx, py = headCy + h * 0.2;
    for (let s = 0; py < h - 1; s++) {
      const sway = Math.sin(frame * 1.57 + t * 1.3 + s * 0.6) * 0.8 + (bx - cx) * 0.08;
      px += sway;
      py += 1;
      P.p(px, py, s % 3 === 2 ? pal.light : pal.main);
      if (s < 3) P.p(px + 1, py, pal.dark);
    }
  }
  shadedEllipse(P, cx, headCy, w * 0.36, h * 0.32, pal);
  // spots
  P.p(Math.round(cx - 2), Math.round(headCy - 2), pal.accent);
  P.p(Math.round(cx + 2), Math.round(headCy - 3), pal.accent);
  // eyes (look forward/right)
  const ey = Math.round(headCy + 1);
  P.rect(Math.round(cx - 3), ey, 2, 2, '#ffffff');
  P.rect(Math.round(cx + 2), ey, 2, 2, '#ffffff');
  P.p(Math.round(cx - 2), ey + 1, pal.eye);
  P.p(Math.round(cx + 3), ey + 1, pal.eye);
}

function drawJelly(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const pulse = [1, 0.92, 0.86, 0.92][frame % 4];
  const cx = w / 2;
  const by = h * 0.36;
  const rx = (w / 2 - 0.5) * pulse;
  const ry = h * 0.32 * (2 - pulse);
  // tentacles
  const n = 4;
  for (let t = 0; t < n; t++) {
    const tx = cx - rx * 0.7 + (t * rx * 1.4) / (n - 1);
    for (let y = Math.round(by + 1); y < h; y++) {
      const sx = tx + Math.sin(y * 0.6 + frame * 1.5 + t) * 0.9;
      P.p(sx, y, (y + t) % 3 === 0 ? pal.accent : pal.light);
    }
  }
  // bell (upper half ellipse)
  for (let y = Math.floor(by - ry); y <= Math.ceil(by); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = inEllipse(x, y, cx, by, rx, ry);
      if (d > 1 || y + 0.5 > by + 0.5) continue;
      P.p(x, y, d > 0.65 ? pal.light : d < 0.2 ? pal.accent : pal.main);
    }
  }
  // rim
  P.rect(Math.round(cx - rx), Math.round(by), Math.round(rx * 2), 1, pal.dark);
}

function drawAngler(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const tail = Math.round(w * 0.2);
  const cx = tail + (w - tail) * 0.48;
  const cy = h * 0.55;
  const rx = (w - tail) * 0.5;
  const ry = h * 0.42;
  const wag = [0, 1, 0, -1][frame % 4];
  for (let x = 0; x < tail; x++) {
    const f = 1 - x / tail;
    const half = 1 + f * h * 0.3;
    for (let y = Math.round(cy - half + wag * f); y <= Math.round(cy + half + wag * f); y++) P.p(x, y, f > 0.5 ? pal.dark : pal.main);
  }
  shadedEllipse(P, cx, cy, rx, ry, pal);
  // spines
  for (let i = 0; i < 4; i++) P.p(Math.round(cx - rx * 0.4 + i * 3), Math.round(cy - ry) - 1, pal.dark);
  // huge mouth with teeth
  const my = Math.round(cy + ry * 0.25);
  const mx0 = Math.round(cx + rx * 0.35);
  P.rect(mx0, my, w - mx0, 2, '#12041e');
  for (let x = mx0; x < w; x += 2) {
    P.p(x, my, '#ffffff');
    P.p(x + 1, my + 1, '#ffffff');
  }
  // eye
  const ex = Math.round(cx + rx * 0.45), ey = Math.round(cy - ry * 0.35);
  P.rect(ex, ey, 2, 2, pal.eye);
  P.p(ex, ey, '#ffffff');
  // lure stalk
  const sway = [0, 1, 1, 0][frame % 4];
  const sx = Math.round(cx + rx * 0.2), sy = Math.round(cy - ry);
  P.line(sx, sy, sx + 4, sy - 5, pal.light);
  P.line(sx + 4, sy - 5, sx + 9, sy - 4 + sway, pal.light);
  P.rect(sx + 9, sy - 5 + sway, 2, 2, pal.accent);
}

function drawPuffer(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const cx = w * 0.55, cy = h / 2, r = Math.min(w, h) / 2 - 1.5;
  // spikes all around
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + (frame % 2) * 0.1;
    P.p(cx + Math.cos(a) * (r + 1.2), cy + Math.sin(a) * (r + 1.2), pal.accent);
  }
  shadedEllipse(P, cx, cy, r, r, pal);
  for (let k = 0; k < 6; k++) P.p(cx - r * 0.5 + (k % 3) * r * 0.5, cy + (k < 3 ? -1 : 2), pal.accent);
  // little tail and fins
  const wag = [0, 1, 0, -1][frame % 4];
  P.rect(0, Math.round(cy - 1 + wag), 2, 3, pal.dark);
  P.p(Math.round(cx), Math.round(cy + r) - 1 + (frame % 2), pal.dark);
  // big eye + pouty mouth
  P.rect(Math.round(cx + r * 0.35), Math.round(cy - r * 0.45), 2, 2, '#ffffff');
  P.p(Math.round(cx + r * 0.35) + 1, Math.round(cy - r * 0.45) + 1, pal.eye);
  P.rect(w - 2, Math.round(cy), 2, 1, '#c04a3a');
}

function drawSeahorse(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const sway = [0, 1, 0, -1][frame % 4] * 0.5;
  // curled tail
  for (let i = 0; i < 6; i++) {
    const a = i * 0.9;
    P.p(w * 0.4 + Math.cos(a) * (2.5 - i * 0.3), h - 3 + Math.sin(a) * 2, pal.dark);
  }
  // body: stacked segments leaning forward
  for (let y = 2; y < h - 3; y++) {
    const t = y / h;
    const bw = Math.max(2, Math.round(3.5 * Math.sin(t * Math.PI) + 1));
    const x0 = Math.round(w * 0.3 + Math.sin(t * 3) * 1.2 + sway * t);
    for (let x = 0; x < bw; x++) P.p(x0 + x, y, x === 0 ? pal.dark : y % 2 ? pal.main : pal.light);
  }
  // head + snout
  P.rect(Math.round(w * 0.35), 0, 3, 3, pal.main);
  P.rect(Math.round(w * 0.35) + 3, 1, 3, 1, pal.dark);
  P.p(Math.round(w * 0.35) + 1, 1, pal.eye);
  P.p(Math.round(w * 0.35), 0, pal.accent);
  // dorsal fin flutter
  P.p(Math.round(w * 0.3) - 1, Math.round(h * 0.5) + (frame % 2), pal.accent);
}

function drawHermit(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const step = frame % 2;
  // legs and claw peeking out (facing right)
  for (let i = 0; i < 3; i++) {
    const lx = Math.round(w * 0.55 + i * 2);
    P.line(lx, h - 4, lx + 1, h - 1 - ((i + step) % 2), pal.main);
  }
  P.rect(w - 4, h - 6, 3, 3, pal.main);
  P.p(w - 2, h - 6, pal.light);
  // eye stalks
  P.p(w - 5, h - 9, pal.eye);
  P.p(w - 5, h - 8, pal.main);
  // spiral shell
  const cx = w * 0.4, cy = h * 0.48, r = Math.min(w * 0.38, h * 0.48);
  shadedEllipse(P, cx, cy, r, r * 0.95, { ...pal, main: pal.accent, light: '#ffffff', dark: '#c8a88a' });
  for (let i = 0; i < 14; i++) {
    const a = i * 0.55;
    const rr = r * (1 - i / 16);
    P.p(cx + Math.cos(a) * rr * 0.7, cy + Math.sin(a) * rr * 0.7, '#a07a5a');
  }
  P.p(Math.round(cx), Math.round(cy), '#7a5a3a');
}

function drawRay(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const flap = [0, 1, 2, 1][frame % 4];
  const cx = w * 0.55, cy = h * 0.5;
  // diamond wings seen from the side-top, flapping
  for (let x = 0; x < w; x++) {
    const u = (x - cx) / (w * 0.45);
    if (Math.abs(u) > 1.05) continue;
    const span = (1 - Math.abs(u)) * h * 0.5;
    const tipLift = Math.abs(u) > 0.5 ? (Math.abs(u) - 0.5) * flap * 2.2 : 0;
    const top = Math.round(cy - span * 0.55 - tipLift);
    const bot = Math.round(cy + span * 0.45 - tipLift * 0.6);
    for (let y = top; y <= bot; y++) P.p(x, y, y === top ? pal.dark : y > cy + 1 ? pal.light : pal.main);
  }
  // long thin tail
  for (let x = 0; x < w * 0.12; x++) P.p(x, Math.round(cy + (x % 3 === 0 ? 0 : 1)), pal.dark);
  // cephalic fins + eye
  P.rect(w - 3, Math.round(cy - 2), 2, 1, pal.dark);
  P.rect(w - 3, Math.round(cy + 1), 2, 1, pal.dark);
  P.p(Math.round(w * 0.82), Math.round(cy - 1), '#ffffff');
  P.p(Math.round(w * 0.82) + 1, Math.round(cy - 1), pal.eye);
  // pale spots
  P.p(Math.round(cx), Math.round(cy - 1), pal.accent);
  P.p(Math.round(cx + 3), Math.round(cy - 2), pal.accent);
}

function drawShark(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const tail = Math.round(w * 0.2);
  const cy = h * 0.55;
  const wag = [0, 1, 0, -1][frame % 4];
  // crescent tail
  for (let x = 0; x < tail; x++) {
    const f = 1 - x / tail;
    const up = Math.round(cy - 1 - f * h * 0.55 + wag * f);
    const dn = Math.round(cy + 1 + f * h * 0.4 + wag * f);
    P.p(x, up, pal.dark);
    P.p(x, dn, pal.dark);
    if (f < 0.6) P.rect(x, up, 1, dn - up, pal.main);
  }
  // torpedo body: dark back, white belly
  for (let x = tail; x < w; x++) {
    const u = (x - tail) / (w - tail);
    const half = h * 0.36 * Math.sin(Math.min(1, u * 1.15 + 0.08) * Math.PI) ** 0.6;
    for (let y = Math.round(cy - half); y <= Math.round(cy + half * 0.8); y++) {
      P.p(x, y, y > cy + 1 ? pal.light : y < cy - half + 2 ? pal.dark : pal.main);
    }
  }
  // dorsal + pectoral fins
  const dx = Math.round(tail + (w - tail) * 0.42);
  for (let i = 0; i < 6; i++) P.rect(dx - i, Math.round(cy - h * 0.36) - 6 + i, Math.max(1, 6 - i), 1, pal.dark);
  P.line(dx + 2, Math.round(cy + 2), dx - 3, Math.round(cy + 5 + (frame % 2)), pal.dark, 2);
  // hammer head
  const hx = w - 4;
  P.rect(hx - 1, Math.round(cy - h * 0.45), 4, Math.round(h * 0.8), pal.main);
  P.rect(hx - 1, Math.round(cy - h * 0.45), 4, 1, pal.dark);
  P.p(hx + 1, Math.round(cy - h * 0.42), pal.eye);
  P.p(hx + 1, Math.round(cy + h * 0.3), pal.eye);
  // gills
  for (let i = 0; i < 3; i++) P.rect(hx - 6 - i * 2, Math.round(cy - 1), 1, 3, pal.dark);
  // mouth
  P.rect(hx - 5, Math.round(cy + h * 0.2), 4, 1, '#2a0a10');
}

function drawChest(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const open = frame === 3;
  const lidH = Math.round(h * 0.4);
  const bodyY = lidH;
  // body planks
  for (let y = bodyY; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || x === w - 1 || y === h - 1;
      P.p(x, y, edge ? pal.dark : (y - bodyY) % 3 === 0 ? pal.dark : pal.main);
    }
  }
  // metal bands + lock
  P.rect(2, bodyY, 1, h - bodyY, pal.accent);
  P.rect(w - 3, bodyY, 1, h - bodyY, pal.accent);
  if (open) {
    // mimic: open maw with teeth, tongue and an angry eye on the lid
    const lift = 3;
    for (let y = 0; y < lidH; y++) for (let x = 0; x < w; x++) P.p(x, y - lift, y === 0 || x === 0 || x === w - 1 ? pal.dark : pal.light);
    P.rect(1, bodyY - lift + lidH - lidH, w - 2, lift + 1, '#2a0610');
    for (let x = 1; x < w - 1; x += 2) {
      P.p(x, bodyY - lift + 1, '#ffffff');
      P.p(x + 1, bodyY, '#ffffff');
    }
    P.rect(Math.round(w / 2) - 2, bodyY - 1, 4, 2, '#ff5a7a');
    P.rect(Math.round(w / 2) - 1, Math.round(lidH / 2) - lift, 3, 2, '#ffffff');
    P.p(Math.round(w / 2), Math.round(lidH / 2) - lift, pal.eye);
    return;
  }
  // closed rounded lid
  for (let y = 0; y < lidH; y++) {
    const inset = y === 0 ? 2 : y === 1 ? 1 : 0;
    for (let x = inset; x < w - inset; x++) P.p(x, y, y === 0 ? pal.dark : y === 1 ? pal.light : pal.main);
  }
  P.rect(2, 1, 1, lidH - 1, pal.accent);
  P.rect(w - 3, 1, 1, lidH - 1, pal.accent);
  P.rect(Math.round(w / 2) - 1, lidH - 2, 3, 3, pal.accent);
  P.p(Math.round(w / 2), lidH - 1, pal.dark);
  // gold peeking out of the seam
  P.p(4, lidH, '#fff27a');
  P.p(w - 5, lidH, '#fff27a');
  if (frame === 2) {
    // the mimic's tell: a glint like an eye in the keyhole
    P.p(Math.round(w / 2), lidH - 1, pal.eye);
  }
}

function drawEye(P: Painter, w: number, h: number, pal: SpeciesPalette, frame: number): void {
  const cx = w / 2, cy = h * 0.42;
  const r = Math.min(w, h * 0.84) / 2;
  // tentacle roots
  for (let t = 0; t < 3; t++) {
    const bx = cx - r * 0.5 + t * r * 0.5;
    for (let y = Math.round(cy + r * 0.6); y < h; y++) P.p(bx + Math.sin(y * 0.7 + frame * 1.5 + t * 2) * 1.2, y, pal.accent);
  }
  const blink = frame === 3;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = inEllipse(x, y, cx, cy, r, r);
      if (d > 1) continue;
      let col = d > 0.75 ? pal.dark : pal.main;
      if (blink) col = d > 0.75 ? '#7a2a5a' : '#c25a9a';
      P.p(x, y, col);
    }
  }
  if (blink) {
    P.rect(Math.round(cx - r + 1), Math.round(cy), Math.round(r * 2 - 2), 1, '#3a0a2a');
    return;
  }
  // veins
  const rr = seededRandom(77);
  for (let v = 0; v < 4; v++) {
    const a = rr() * Math.PI * 2;
    P.line(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, pal.accent);
  }
  // iris looking right
  const ix = cx + r * 0.2;
  for (let y = Math.floor(cy - r * 0.45); y <= Math.ceil(cy + r * 0.45); y++) {
    for (let x = Math.floor(ix - r * 0.45); x <= Math.ceil(ix + r * 0.45); x++) {
      const d = inEllipse(x, y, ix, cy, r * 0.45, r * 0.45);
      if (d <= 1) P.p(x, y, d < 0.35 ? pal.eye : '#ff2f7f');
    }
  }
  P.p(Math.round(ix - 1), Math.round(cy - 2), '#ffffff');
}

/** Eel is segmented and drawn live onto the target context. */
export function drawEel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  facing: number,
  phase: number,
  pal: SpeciesPalette,
): void {
  const seg = Math.max(6, Math.round(w / 2));
  for (let i = seg - 1; i >= 0; i--) {
    const f = i / seg;
    const px = Math.round(x + facing * (w / 2 - i * 2));
    const amp = 1 + f * 2.2;
    const py = Math.round(y + Math.sin(phase * 0.8 - i * 0.55) * amp);
    const th = Math.max(2, Math.round(h * (1 - f * 0.55)));
    ctx.fillStyle = Math.floor(i / 2) % 3 === 0 ? pal.dark : pal.main;
    ctx.fillRect(px, py - Math.floor(th / 2), 2, th);
    ctx.fillStyle = pal.light;
    ctx.fillRect(px, py - Math.floor(th / 2), 2, 1);
  }
  // head
  const hx = Math.round(x + facing * (w / 2));
  const hy = Math.round(y + Math.sin(phase * 0.8) * 1);
  ctx.fillStyle = pal.main;
  ctx.fillRect(hx - (facing > 0 ? 0 : 2), hy - 2, 3, 4);
  ctx.fillStyle = pal.eye;
  ctx.fillRect(hx + (facing > 0 ? 1 : -1), hy - 1, 1, 1);
  ctx.fillStyle = pal.dark;
  ctx.fillRect(hx + (facing > 0 ? 2 : -2), hy + 1, 1, 1);
}

// ───────────────────────────── glow halo

const glowCache = new Map<string, Canvas>();

/** Dithered pixel halo (no smooth gradients). */
export function glowSprite(radius: number, color: string): Canvas {
  const r = Math.max(3, Math.round(radius));
  const key = `${r}|${color}`;
  let c = glowCache.get(key);
  if (c) return c;
  c = makeCanvas(r * 2, r * 2);
  const P = new Painter(c);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < r * 2; y++) {
    for (let x = 0; x < r * 2; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (d > 1) continue;
      const v = (1 - d) * (1 - d) * 16;
      if (v > bayer[(y % 4) * 4 + (x % 4)]) P.p(x, y, color);
    }
  }
  glowCache.set(key, c);
  return c;
}

// ───────────────────────────── decor sprites

export function decorSprite(d: Decor, pal: BiomePalette): Canvas {
  const r = seededRandom(d.seed);
  switch (d.type) {
    case 'rock': return rockSprite(d.w, d.h, pal, r);
    case 'coral': return coralSprite(d.w, d.h, pal, r);
    case 'crevice': return creviceSprite(d.w, d.h, pal);
    case 'shell': return shellSprite(pal, r);
    case 'ruin': return ruinSprite(d.w, d.h, pal, r);
    case 'wreck': return wreckSprite(d.w, d.h, pal, r);
    case 'crystal': return crystalSprite(d.w, d.h, pal, r);
    case 'vent': return ventSprite(d.w, d.h, pal, r);
    default: return makeCanvas(1, 1);
  }
}

function crystalSprite(w: number, h: number, pal: BiomePalette, r: () => number): Canvas {
  const c = makeCanvas(w, h + 2);
  const P = new Painter(c);
  const base = mixColor(pal.glow, pal.coralB, 0.4);
  const light = shade(base, 0.45);
  const dark = shade(base, -0.4);
  const n = 2 + Math.floor(r() * 3);
  for (let j = 0; j < n; j++) {
    const cx = Math.round(w * (0.2 + 0.6 * (n === 1 ? 0.5 : j / (n - 1))));
    const ch = Math.round(h * (0.45 + r() * 0.55));
    const cw = 3 + Math.floor(r() * 3);
    const lean = (r() - 0.5) * 0.5;
    for (let y = 0; y < ch; y++) {
      const k = y < ch * 0.75 ? 1 : 1 - (y - ch * 0.75) / (ch * 0.25);
      const ww = Math.max(1, Math.round(cw * k));
      const x0 = Math.round(cx + lean * y - ww / 2);
      for (let x = 0; x < ww; x++) P.p(x0 + x, h - y, x === 0 ? light : x === ww - 1 ? dark : base);
    }
    P.p(Math.round(cx + lean * ch), h - ch, '#ffffff');
  }
  P.rect(0, h, w, 2, shade(pal.rockDark, -0.2));
  return c;
}

function ventSprite(w: number, h: number, pal: BiomePalette, r: () => number): Canvas {
  const c = makeCanvas(w, h + 2);
  const P = new Painter(c);
  const rock = pal.rock, dark = pal.rockDark, light = pal.rockLight;
  for (let y = 0; y <= h; y++) {
    const k = y / h; // 0 = top
    const ww = Math.round(4 + k * (w - 4) + Math.sin(y * 0.9) * 1);
    const x0 = Math.round((w - ww) / 2);
    for (let x = 0; x < ww; x++) P.p(x0 + x, y, x < 1 ? light : x > ww - 2 ? dark : (y + x) % 5 === 0 ? dark : rock);
  }
  // glowing mouth and mineral streaks
  P.rect(Math.round(w / 2) - 1, 0, 3, 1, '#ffb070');
  P.p(Math.round(w / 2), 1, '#ff6a3a');
  for (let i = 0; i < 3; i++) P.p(Math.round(w * (0.3 + r() * 0.4)), Math.round(h * (0.3 + r() * 0.6)), '#e8c070');
  return c;
}

function rockSprite(w: number, h: number, pal: BiomePalette, r: () => number): Canvas {
  const c = makeCanvas(w, h + 4);
  const P = new Painter(c);
  const bumps = [r(), r(), r(), r()];
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    let top = Math.sin(t * Math.PI) ** 0.7 * h;
    top *= 0.8 + 0.2 * Math.sin(t * 9 + bumps[0] * 6) * bumps[1];
    const y0 = Math.round(h - top);
    for (let y = y0; y < h + 4; y++) {
      const rel = (y - y0) / Math.max(1, top);
      const n = (x * 7 + y * 13 + Math.floor(bumps[2] * 10)) % 11 === 0;
      let col = rel < 0.15 ? pal.rockLight : rel < 0.55 ? pal.rock : pal.rockDark;
      if (x < w * 0.25 && rel > 0.1) col = pal.rockDark;
      if (n) col = rel < 0.5 ? pal.rockLight : pal.rock;
      P.p(x, y, col);
    }
    if (y0 < h) P.p(x, y0, shade(pal.rockLight, 0.15));
  }
  // moss / coral dots on top
  for (let i = 0; i < w / 6; i++) {
    const x = Math.floor(r() * w);
    const t = x / (w - 1);
    const y = Math.round(h - Math.sin(t * Math.PI) ** 0.7 * h * 0.9);
    P.p(x, y, r() < 0.5 ? pal.weed : pal.coralA);
  }
  return c;
}

function coralSprite(w: number, h: number, pal: BiomePalette, r: () => number): Canvas {
  const c = makeCanvas(w, h);
  const P = new Painter(c);
  const color = [pal.coralA, pal.coralB, pal.coralC][Math.floor(r() * 3)];
  const dark = shade(color, -0.35);
  const light = shade(color, 0.35);
  const kind = r();
  if (kind < 0.55) {
    // branching coral
    const branch = (x: number, y: number, len: number, ang: number, depth: number) => {
      let px = x, py = y;
      for (let i = 0; i < len; i++) {
        px += Math.cos(ang);
        py += Math.sin(ang);
        P.p(px, py, i < len * 0.3 ? dark : color);
        P.p(px + 1, py, dark);
      }
      P.p(px, py - 1, light);
      if (depth > 0) {
        branch(px, py, len * 0.7, ang - 0.5 - r() * 0.3, depth - 1);
        branch(px, py, len * 0.7, ang + 0.5 + r() * 0.3, depth - 1);
      }
    };
    branch(w / 2, h, h * 0.42, -Math.PI / 2, 2);
  } else if (kind < 0.8) {
    // brain/mound coral
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = inEllipse(x, y, w / 2, h, w / 2, h * 0.6);
        if (d > 1) continue;
        const groove = (x + Math.round(Math.sin(y * 0.9) * 2)) % 4 === 0;
        P.p(x, y, d > 0.8 ? dark : groove ? dark : (x + y) % 5 === 0 ? light : color);
      }
    }
  } else {
    // tube sponges
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const tx = Math.round(2 + (i * (w - 5)) / Math.max(1, n - 1));
      const th = Math.round(h * (0.5 + r() * 0.5));
      P.rect(tx, h - th, 3, th, color);
      P.rect(tx, h - th, 1, th, light);
      P.rect(tx + 2, h - th, 1, th, dark);
      P.rect(tx, h - th, 3, 1, dark);
      P.p(tx + 1, h - th, '#1a0a1a');
    }
  }
  return c;
}

function creviceSprite(w: number, h: number, pal: BiomePalette): Canvas {
  const c = makeCanvas(w, h);
  const P = new Painter(c);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = inEllipse(x, y, w / 2, 0, w / 2, h);
      if (d > 1) continue;
      P.p(x, y, d > 0.7 ? pal.rockDark : shade(pal.rockDark, -0.55));
    }
  }
  P.rect(0, 0, w, 1, pal.rock);
  return c;
}

function shellSprite(pal: BiomePalette, r: () => number): Canvas {
  const c = makeCanvas(5, 4);
  const P = new Painter(c);
  const col = r() < 0.5 ? '#ffe2d0' : pal.coralC;
  P.rect(1, 0, 3, 1, col);
  P.rect(0, 1, 5, 2, col);
  P.p(1, 1, shade(col, -0.3));
  P.p(3, 1, shade(col, -0.3));
  P.rect(1, 3, 3, 1, shade(col, -0.4));
  return c;
}

function ruinSprite(w: number, h: number, pal: BiomePalette, r: () => number): Canvas {
  const c = makeCanvas(w, h);
  const P = new Painter(c);
  const stone = mixColor(pal.rockLight, '#c8c0a8', 0.35);
  const dark = shade(stone, -0.4);
  const broken = Math.round(h * (0.55 + r() * 0.45));
  const top = h - broken;
  // column
  const cw = Math.max(6, Math.round(w * 0.45));
  const x0 = Math.round((w - cw) / 2);
  for (let y = top; y < h; y++) {
    for (let x = x0; x < x0 + cw; x++) {
      const flute = (x - x0) % 3 === 0;
      P.p(x, y, flute ? dark : x === x0 + 1 ? shade(stone, 0.2) : stone);
    }
  }
  // capital / base
  P.rect(x0 - 2, h - 3, cw + 4, 3, dark);
  if (broken > h * 0.9) P.rect(x0 - 2, top, cw + 4, 3, stone);
  // cracks + glyph
  P.line(x0 + 2, top + 2, x0 + cw - 2, top + 6, dark);
  P.rect(x0 + Math.round(cw / 2) - 1, top + Math.round(broken / 2), 2, 2, pal.glow);
  // rubble
  P.rect(0, h - 2, 3, 2, dark);
  P.rect(w - 4, h - 3, 3, 3, stone);
  return c;
}

function wreckSprite(w: number, h: number, pal: BiomePalette, r: () => number): Canvas {
  const c = makeCanvas(w, h + 6);
  const P = new Painter(c);
  const wood = mixColor('#6a4a3a', pal.rock, 0.45);
  const dark = shade(wood, -0.45);
  const light = shade(wood, 0.25);
  const tilt = r() < 0.5 ? 1 : -1;
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    // hull: curved bottom, tilted deck
    const deck = Math.round(h * 0.25 + tilt * (t - 0.5) * h * 0.25);
    const bottom = Math.round(h - Math.pow(Math.abs(t - 0.45) * 2, 3) * h * 0.55);
    for (let y = deck; y < bottom + 6; y++) {
      const plank = (y - deck) % 4 === 0;
      const hole = (x * 3 + y * 5) % 37 === 0 && y > deck + 3;
      P.p(x, y, hole ? '#0a0612' : plank ? dark : x % 9 === 0 ? dark : y === deck ? light : wood);
    }
  }
  // portholes
  for (let i = 0; i < 3; i++) {
    const px = Math.round(w * (0.3 + i * 0.15));
    const py = Math.round(h * 0.45);
    P.rect(px, py, 3, 3, dark);
    P.p(px + 1, py + 1, pal.glow);
  }
  // broken mast
  const mx = Math.round(w * 0.55);
  P.line(mx, Math.round(h * 0.25), mx + tilt * 8, 0, dark, 2);
  return c;
}
