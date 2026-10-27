// Claw heads drawn by code. Each head is painted as its RIGHT half and then
// mirrored, so it is perfectly symmetric (no crooked prongs). Heads are cached
// per family / visual tier / opening step; the shaft and glows are drawn live.

import type { ClawDefinition } from '../entities/ClawsCatalog';
import { mixColor, shade } from './Color';
import { glowSprite, makeCanvas } from './PixelArt';

export type ClawStyle = 'scrap' | 'lightning' | 'hydraulic' | 'electric' | 'triple' | 'magnetic' | 'mutant' | 'gravity';

interface Pal {
  o: string; // outline
  d: string; // dark
  m: string; // main
  l: string; // light
  h: string; // highlight
  a: string; // accent
  gold: string;
}

/** Half-canvas pixel painter (x measured from the mirror axis). */
class Half {
  readonly c: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  constructor(readonly w: number, readonly h: number) {
    this.c = makeCanvas(w, h);
    this.g = this.c.getContext('2d')!;
  }
  p(x: number, y: number, col: string): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.g.fillStyle = col;
    this.g.fillRect(x, y, 1, 1);
  }
  rect(x: number, y: number, w: number, h: number, col: string): void {
    this.g.fillStyle = col;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  disc(cx: number, cy: number, r: number, col: string): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + 0.3) this.p(x, y, col);
  }
  /** Thick stroke along a polyline: stamps discs with radius r(t). */
  stroke(pts: [number, number][], r: (t: number) => number, col: string): void {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(len * 2));
      for (let k = 0; k <= n; k++) {
        const f = k / n;
        const t = (acc + len * f) / Math.max(1, total);
        this.disc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, r(t), col);
      }
      acc += len;
    }
  }
}

const HEAD_TOP = 0;
const HUB_H = 12;

function palette(def: ClawDefinition, tier: number): Pal {
  const L = def.look;
  return {
    o: shade(L.metalDark, -0.55),
    d: L.metalDark,
    m: L.metal,
    l: mixColor(L.metal, L.metalLight, 0.55),
    h: L.metalLight,
    a: L.accent,
    gold: tier >= 2 ? '#ffd84a' : L.accent,
  };
}

/** Finger geometry (right side) for a given opening spread. */
function fingerPath(style: ClawStyle, hubHalf: number, spread: number, len: number): [number, number][] {
  const sY = HUB_H - 3;
  const tipY = sY + len;
  const kneeX = Math.max(hubHalf + 2, spread + 3);
  const kneeY = sY + len * 0.42;
  const tipX = Math.max(1.5, spread * 0.3);
  const hookX = Math.max(0, tipX - 2.5);
  if (style === 'hydraulic') {
    // squared pincers
    return [[hubHalf - 2, sY], [kneeX + 1, sY + 2], [kneeX + 1, kneeY + 2], [tipX + 2, tipY - 1], [hookX, tipY - 1]];
  }
  if (style === 'magnetic') {
    // horseshoe arm: goes straight down then the pole block
    return [[hubHalf - 2, sY], [kneeX, sY + 3], [kneeX, tipY - 3], [Math.max(tipX + 1, kneeX - 2), tipY]];
  }
  return [[hubHalf - 2, sY], [kneeX, kneeY], [tipX + 1, tipY - 1], [hookX, tipY + 1]];
}

function paintHalf(def: ClawDefinition, style: ClawStyle, tier: number, spread: number, frame: number, half: Half, hubHalf: number, len: number): void {
  const P = palette(def, tier);
  // ── hub: narrow cap, rounded housing, jaw plate (right half)
  const capHalf = Math.max(3, hubHalf - 3);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < capHalf; x++) half.p(x, HEAD_TOP + y, x === capHalf - 1 || y === 0 ? P.o : y === 1 ? P.l : P.d);
  }
  for (let y = 3; y < HUB_H; y++) {
    const yy = y - 3;
    const inset = yy === 0 ? 2 : yy === 1 ? 1 : y >= HUB_H - 1 ? 2 : y >= HUB_H - 2 ? 1 : 0;
    for (let x = 0; x < hubHalf - inset; x++) {
      const edge = x === hubHalf - inset - 1 || yy === 0 || y === HUB_H - 1;
      let col = edge ? P.o : yy <= 1 ? P.h : yy <= 3 ? P.l : y >= HUB_H - 3 ? P.d : P.m;
      // specular strip
      if (!edge && x === hubHalf - inset - 3 && yy > 1 && yy < 6) col = P.h;
      half.p(x, HEAD_TOP + y, col);
    }
  }
  // jaw plate seam, side bolts
  half.rect(0, HEAD_TOP + HUB_H - 4, hubHalf - 2, 1, P.o);
  half.p(hubHalf - 3, HEAD_TOP + 5, P.o);
  half.p(hubHalf - 3, HEAD_TOP + 4, P.h);
  if (tier >= 1) {
    half.p(hubHalf - 3, HEAD_TOP + HUB_H - 3, P.h);
    half.p(Math.max(1, capHalf - 2), HEAD_TOP + 1, P.h);
  }
  if (tier >= 2) {
    half.rect(0, HEAD_TOP + 3, hubHalf - 2, 1, P.gold);
    half.rect(0, HEAD_TOP + HUB_H - 4, hubHalf - 2, 1, P.gold);
  }

  // ── style extras on the hub
  if (style === 'lightning') {
    // swept fins
    for (let i = 0; i < 5; i++) half.rect(hubHalf - 1 + i, HEAD_TOP + 1 + i, 1, 4 - Math.floor(i / 2), i === 0 ? P.o : P.a);
  }
  if (style === 'hydraulic') {
    // piston running down to the arm
    half.rect(hubHalf - 4, HEAD_TOP + HUB_H - 1, 3, 6, P.o);
    half.rect(hubHalf - 3, HEAD_TOP + HUB_H - 1, 1, 5, '#e8e8e8');
  }
  if (style === 'electric') {
    for (let i = 0; i < 3; i++) half.rect(hubHalf - 1, HEAD_TOP + 2 + i * 2, 2, 1, P.a);
  }
  if (style === 'gravity') {
    half.rect(hubHalf - 1, HEAD_TOP + 3, 2, 3, P.gold);
  }

  // ── finger
  const pts = fingerPath(style, hubHalf, spread, len);
  const organic = style === 'mutant';
  if (organic) {
    // wobbling tentacle-finger
    for (const p of pts) p[0] += Math.sin(frame * 1.6 + p[1] * 0.5) * 0.8;
  }
  const thick = style === 'hydraulic' ? 2.6 : style === 'lightning' ? 1.5 : 2.1;
  const taper = (t: number) => Math.max(0.7, thick * (1 - t * 0.55));
  half.stroke(pts, (t) => taper(t) + 1, P.o);
  half.stroke(pts, taper, P.m);
  // shadow on the inner side of the talon, light on the outer edge of the arm
  half.stroke(pts.slice(1).map(([x, y]) => [x - 0.8, y + 0.2] as [number, number]), (t) => Math.max(0.4, 0.8 - t * 0.4), P.d);
  half.stroke(pts.slice(0, 2).map(([x, y]) => [x + 0.8, y - 0.6] as [number, number]), () => 0.6, P.h);
  if (tier >= 2) half.stroke(pts.slice(0, 2).map(([x, y]) => [x + 0.2, y + 0.1] as [number, number]), () => 0.45, P.gold);
  // knuckle pivot
  const knee = pts[1];
  half.disc(knee[0], knee[1], 2.1, P.o);
  half.disc(knee[0], knee[1], 1.3, tier >= 2 ? P.gold : P.l);
  half.p(knee[0], knee[1], P.d);
  // teeth on the inner edge (hydraulic) / suckers (mutant)
  if (style === 'hydraulic') {
    for (let i = 0; i < 3; i++) half.p(pts[2][0] - 2 - i * 2, pts[2][1] + 2 + i * 1.5, P.h);
  }
  if (organic) {
    for (let i = 1; i < 4; i++) half.p(pts[1][0] - i * 1.5, pts[1][1] + i * 2.5, P.a);
  }
  // fingertip
  const tip = pts[pts.length - 1];
  if (style === 'magnetic') {
    half.rect(tip[0] - 1, tip[1] - 3, 4, 4, P.o);
    half.rect(tip[0], tip[1] - 2, 2, 2, '#ff3a4a');
  } else if (style === 'electric' || style === 'gravity') {
    half.p(tip[0], tip[1], P.a);
    half.p(tip[0] + 1, tip[1] - 1, P.a);
  } else {
    half.p(tip[0], tip[1], tier >= 1 ? P.h : P.l);
  }
  if (tier >= 3) half.p(knee[0] + 1, knee[1] - 2, '#ffffff');
}

const headCache = new Map<string, { canvas: HTMLCanvasElement; ax: number; mouthY: number }>();

function styleOf(def: ClawDefinition): ClawStyle {
  return (['scrap', 'lightning', 'hydraulic', 'electric', 'triple', 'magnetic', 'mutant', 'gravity'] as ClawStyle[]).includes(def.id as ClawStyle)
    ? (def.id as ClawStyle)
    : 'scrap';
}

/** Cached full (mirrored) head sprite. ax = mirror axis x, mouthY = grab point. */
export function clawHead(def: ClawDefinition, tier: number, spreadPx: number, time: number) {
  const style = styleOf(def);
  const spread = Math.max(1, Math.round(spreadPx));
  const frame = style === 'mutant' ? Math.floor(time * 6) % 4 : 0;
  const key = `${def.id}|${tier}|${spread}|${frame}`;
  let head = headCache.get(key);
  if (head) return head;
  const hubHalf = Math.max(5, Math.round(def.look.width / 2) + 1);
  const len = style === 'lightning' ? 19 : style === 'hydraulic' ? 15 : 17;
  const halfW = Math.max(hubHalf + 7, spread + 8);
  const H = HUB_H + len + 5;
  const half = new Half(halfW, H);
  paintHalf(def, style, tier, spread, frame, half, hubHalf, len);

  const canvas = makeCanvas(halfW * 2, H);
  const g = canvas.getContext('2d')!;
  g.drawImage(half.c, halfW, 0);
  g.save();
  g.translate(halfW, 0);
  g.scale(-1, 1);
  g.drawImage(half.c, 0, 0);
  g.restore();

  // centered details (drawn across the axis so they stay symmetric)
  const P = palette(def, tier);
  const cx = halfW;
  const c = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  // lens / core light
  c(cx - 3, HEAD_TOP + 4, 6, 5, P.o);
  c(cx - 2, HEAD_TOP + 5, 4, 3, shade(P.a, -0.35));
  c(cx - 1, HEAD_TOP + 5, 2, 2, tier >= 3 ? '#ffffff' : P.a);
  c(cx - 2, HEAD_TOP + 5, 1, 1, '#ffffff');
  if (style === 'lightning') {
    c(cx - 1, HEAD_TOP + 9, 2, 1, P.a);
    c(cx, HEAD_TOP + 10, 1, 1, P.a);
  }
  if (style === 'mutant') {
    // an eye instead of a lens
    c(cx - 3, HEAD_TOP + 4, 6, 5, '#f0f0d0');
    c(cx - 1, HEAD_TOP + 5, 2, 3, '#c01030');
    c(cx - 1, HEAD_TOP + 6, 1, 1, '#000000');
  }
  if (style === 'gravity') {
    c(cx - 3, HEAD_TOP + 4, 6, 5, '#0a0016');
    c(cx - 1, HEAD_TOP + 5, 2, 3, '#7a3aff');
    c(cx - 1, HEAD_TOP + 5, 1, 1, '#ffffff');
  }
  if (style === 'triple') {
    // straight central talon
    c(cx - 2, HUB_H - 1, 4, len - 1, P.o);
    c(cx - 1, HUB_H - 1, 2, len - 2, P.m);
    c(cx - 1, HUB_H - 1, 1, len - 3, P.h);
    c(cx - 1, HUB_H + len - 3, 2, 2, P.l);
  }
  head = { canvas, ax: halfW, mouthY: HUB_H + len - 2 };
  if (headCache.size > 400) headCache.clear();
  headCache.set(key, head);
  return head;
}

/**
 * Draws a full claw: hydraulic shaft from `shaftTop` down to the head, the
 * head (mouth centered at ax, tip) and live effects.
 */
export function paintClaw(
  ctx: CanvasRenderingContext2D,
  ax: number,
  tip: number,
  def: ClawDefinition,
  spreadPx: number,
  time: number,
  tier = 0,
  shaftTop = -2,
): void {
  const head = clawHead(def, tier, spreadPx, time);
  const hx = Math.round(ax - head.ax);
  const hy = Math.round(tip - head.mouthY);
  const P = palette(def, tier);
  // shaft: symmetric 6px tube with bands
  const bot = hy + 2;
  if (bot > shaftTop) {
    const x0 = Math.round(ax) - 3;
    ctx.fillStyle = P.o;
    ctx.fillRect(x0, shaftTop, 6, bot - shaftTop);
    ctx.fillStyle = P.d;
    ctx.fillRect(x0 + 1, shaftTop, 4, bot - shaftTop);
    ctx.fillStyle = P.m;
    ctx.fillRect(x0 + 2, shaftTop, 2, bot - shaftTop);
    ctx.fillStyle = P.h;
    ctx.fillRect(x0 + 2, shaftTop, 1, bot - shaftTop);
    for (let y = bot - 5; y > shaftTop; y -= 9) {
      ctx.fillStyle = P.o;
      ctx.fillRect(x0 - 1, y, 8, 2);
      ctx.fillStyle = tier >= 2 ? P.gold : P.l;
      ctx.fillRect(x0, y, 6, 1);
    }
    if (tier >= 3) {
      ctx.fillStyle = P.a;
      for (let y = bot - 2 - Math.floor((time * 40) % 9); y > shaftTop; y -= 9) ctx.fillRect(x0 + 2, y, 2, 2);
    }
  }
  // aura for the top tier and special families
  if (tier >= 3 || def.id === 'gravity' || def.id === 'electric') {
    const g = glowSprite(12 + (tier >= 3 ? 4 : 0), def.id === 'gravity' ? '#ffe14a' : P.a);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(time * 6);
    ctx.drawImage(g, Math.round(ax - g.width / 2), Math.round(hy + 4 - g.height / 2));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(head.canvas, hx, hy);
  // live sparks
  const spread = Math.max(1, spreadPx);
  if (def.id === 'electric' && Math.sin(time * 23) > 0.3) {
    ctx.fillStyle = P.a;
    for (const s of [-1, 1]) ctx.fillRect(Math.round(ax + s * spread * 0.4 + (Math.random() - 0.5) * 3), Math.round(tip + Math.random() * 3), 1, 1);
  }
  if (def.id === 'gravity') {
    const r = Math.round(spread + 6 + Math.sin(time * 6) * 2);
    ctx.fillStyle = '#ffe14a';
    for (let k = 0; k < 8; k++) {
      const a = time * 3 + (k * Math.PI) / 4;
      ctx.fillRect(Math.round(ax + Math.cos(a) * r), Math.round(tip + Math.sin(a) * r * 0.45), 1, 1);
    }
  }
  if (tier >= 3 && Math.sin(time * 7) > 0.6) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(ax + Math.sin(time * 13) * (spread + 4)), Math.round(hy + 2 + Math.cos(time * 11) * 4), 1, 1);
  }
}
