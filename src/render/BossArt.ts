// Hand-built (by code) animated art for guardians that deserve more than a
// scaled-up creature sprite. Frames are cached per pose.

import type { SpeciesPalette } from '../entities/Species';
import { shade } from './Color';
import { makeCanvas, Painter } from './PixelArt';

export type BossPose = 'walk' | 'raise' | 'hurt';
const PAD = 14;
const cache = new Map<string, HTMLCanvasElement>();

/** Caranguejo-Rei: armored shell, 8 walking legs, snapping claws, stalked eyes. */
export function kingCrabFrame(w: number, h: number, pal: SpeciesPalette, frame: number, pose: BossPose): { canvas: HTMLCanvasElement; pad: number } {
  const key = `king|${w}|${h}|${frame}|${pose}`;
  let c = cache.get(key);
  if (c) return { canvas: c, pad: PAD };
  c = makeCanvas(w + PAD * 2, h + PAD * 2);
  const P = new Painter(c);
  P.ctx.translate(PAD, PAD);
  const o = shade(pal.dark, -0.5);
  const cx = w / 2;
  const shellY = h * 0.47;
  const rx = w * 0.33;
  const ry = h * 0.24;
  const ground = h - 1;
  const ph = (frame / 8) * Math.PI * 2;

  // ── legs: 4 per side, two segments, alternating lift
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const lift = Math.max(0, Math.sin(ph + i * 1.6 + (side > 0 ? Math.PI : 0))) * 3;
      const hipX = cx + side * (rx * 0.35 + i * rx * 0.2);
      const hipY = shellY + ry * 0.55;
      const kneeX = cx + side * (rx * 0.8 + i * rx * 0.28);
      const kneeY = shellY - ry * 0.15 - lift;
      const footX = cx + side * (rx * 0.95 + i * rx * 0.3);
      const footY = ground - lift * 0.6;
      P.line(hipX, hipY, kneeX, kneeY, o, 3);
      P.line(kneeX, kneeY, footX, footY, o, 3);
      P.line(hipX, hipY, kneeX, kneeY, pal.main, 2);
      P.line(kneeX, kneeY, footX, footY, pal.dark, 2);
      P.p(kneeX, kneeY - 1, pal.light);
      P.p(footX, footY, pal.light);
    }
  }

  // ── arms + giant pincers
  const raise = pose === 'raise';
  const snap = pose === 'raise' ? 1 : 0.35 + 0.35 * Math.sin(ph * 2);
  for (const side of [-1, 1]) {
    const sx = cx + side * rx * 0.85;
    const sy = shellY - ry * 0.2;
    const ex = cx + side * (rx * 1.25);
    const ey = raise ? shellY - ry * 2.2 : shellY - ry * 1.1;
    const px = cx + side * (rx * 1.05);
    const py = raise ? shellY - ry * 3.4 : shellY - ry * 2.0;
    P.line(sx, sy, ex, ey, o, 5);
    P.line(ex, ey, px, py + 4, o, 5);
    P.line(sx, sy, ex, ey, pal.main, 3);
    P.line(ex, ey, px, py + 4, pal.main, 3);
    P.p(ex, ey - 1, pal.light);
    // pincer: big palm + two jaws
    const pw = Math.round(w * 0.13);
    const phh = Math.round(h * 0.2);
    const bx = Math.round(px - pw / 2);
    const by = Math.round(py - phh / 2);
    for (let y = 0; y < phh; y++) {
      for (let x = 0; x < pw; x++) {
        const dx = (x - pw / 2 + 0.5) / (pw / 2);
        const dy = (y - phh / 2 + 0.5) / (phh / 2);
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        P.p(bx + x, by + y, d > 0.7 ? o : dy < -0.3 ? pal.light : dy > 0.4 ? pal.dark : pal.main);
      }
    }
    // jaws open upward
    const jawLen = Math.round(h * 0.16);
    const gap = Math.round(1 + snap * 4);
    for (let k = 0; k < jawLen; k++) {
      const taper = 1 - k / jawLen;
      const jw = Math.max(1, Math.round(3 * taper));
      const jx1 = Math.round(px - gap - jw - k * 0.25 * snap);
      const jx2 = Math.round(px + gap + k * 0.25 * snap);
      const jy = by - k;
      P.rect(jx1 - 1, jy, jw + 2, 1, o);
      P.rect(jx2 - 1, jy, jw + 2, 1, o);
      P.rect(jx1, jy, jw, 1, k > jawLen - 3 ? pal.light : pal.main);
      P.rect(jx2, jy, jw, 1, k > jawLen - 3 ? pal.light : pal.main);
    }
    // teeth on the inner edges
    for (let k = 1; k < jawLen - 1; k += 2) {
      P.p(Math.round(px - gap), by - k, '#ffffff');
      P.p(Math.round(px + gap - 1), by - k, '#ffffff');
    }
  }

  // ── shell: banded dome, rim spikes, barnacles, scar
  for (let y = Math.floor(shellY - ry); y <= Math.ceil(shellY + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - shellY) / ry;
      const d = dx * dx + dy * dy * (dy > 0 ? 2.2 : 1);
      if (d > 1) continue;
      let col = d > 0.82 ? o : dy < -0.55 ? pal.light : dy < 0 ? pal.main : dy < 0.35 ? pal.dark : shade(pal.dark, -0.25);
      if (d <= 0.82 && Math.abs(dx) > 0.55 && dy < 0.1 && (x + y) % 4 === 0) col = pal.dark;
      P.p(x, y, col);
    }
  }
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    const sx = cx + Math.cos(a) * rx;
    const sy = shellY + Math.sin(a) * ry;
    P.p(sx, sy - 1, o);
    P.p(sx + Math.cos(a) * 1.5, sy + Math.sin(a) * 1.5 - 1, pal.light);
  }
  // barnacles + coral growth on the shell
  for (const [bx, by] of [[-0.35, -0.55], [0.3, -0.6], [0.05, -0.8], [-0.1, -0.35]]) {
    const x = Math.round(cx + bx * rx);
    const y = Math.round(shellY + by * ry);
    P.rect(x - 1, y, 3, 2, '#e8e0d0');
    P.p(x, y, '#8a7a6a');
  }
  P.rect(Math.round(cx + rx * 0.45), Math.round(shellY - ry * 0.95), 1, 3, '#ff6fa8');
  P.rect(Math.round(cx + rx * 0.45) - 1, Math.round(shellY - ry * 0.95), 3, 1, '#ff6fa8');
  P.line(cx - rx * 0.6, shellY - ry * 0.1, cx - rx * 0.3, shellY + ry * 0.2, shade(pal.dark, -0.3));

  // ── eye stalks + mouth
  const hurt = pose === 'hurt';
  for (const side of [-1, 1]) {
    const wob = Math.round(Math.sin(ph + side) * 1);
    const ex = Math.round(cx + side * rx * 0.22 + wob);
    const top = Math.round(shellY - ry - 7);
    P.rect(ex, top + 3, 2, 6, o);
    P.rect(ex, top + 3, 1, 5, pal.main);
    P.rect(ex - 1, top, 4, 4, o);
    if (hurt) {
      P.p(ex, top + 1, '#ff3a3a');
      P.p(ex + 1, top + 2, '#ff3a3a');
      P.p(ex + 1, top + 1, '#ff3a3a');
      P.p(ex, top + 2, '#ff3a3a');
    } else if (frame === 7) {
      P.rect(ex, top + 2, 2, 1, pal.dark);
    } else {
      P.rect(ex, top + 1, 2, 2, '#ffffff');
      P.p(ex + (side > 0 ? 1 : 0), top + 2, '#000000');
    }
  }
  P.rect(Math.round(cx - 4), Math.round(shellY + ry * 0.5), 8, 2, o);
  for (let k = 0; k < 4; k++) P.p(Math.round(cx - 3 + k * 2), Math.round(shellY + ry * 0.5) + (frame + k) % 2, pal.light);

  if (cache.size > 64) cache.clear();
  cache.set(key, c);
  return { canvas: c, pad: PAD };
}

/**
 * Moreia Colossal: a long leopard-spotted body that ripples tail to head, a
 * dorsal fin running its length, and a heavy head whose jaws open (wide on
 * the attack) to show the teeth. Drawn head-right; mirror for facing left.
 */
export function morayFrame(w: number, h: number, pal: SpeciesPalette, frame: number, pose: BossPose): { canvas: HTMLCanvasElement; pad: number } {
  const key = `moray|${w}|${h}|${frame}|${pose}`;
  const pad = Math.round(h * 0.8) + 4;
  let c = cache.get(key);
  if (c) return { canvas: c, pad };
  const W = w + pad * 2;
  const H = h + pad * 2;
  c = makeCanvas(W, H);
  const P = new Painter(c);
  const grid: (string | null)[] = new Array(W * H).fill(null);
  const put = (x: number, y: number, col: string) => {
    const gx = Math.round(x) + pad;
    const gy = Math.round(y) + pad;
    if (gx >= 0 && gy >= 0 && gx < W && gy < H) grid[gy * W + gx] = col;
  };
  const ph = (frame / 8) * Math.PI * 2;
  const cy = h / 2 + (pose === 'raise' ? -2 : 0);
  const hx0 = Math.round(w * 0.74);
  const R = h * 0.74;
  const belly = shade(pal.light, -0.1);
  const finCol = shade(pal.main, -0.25);
  const spot = shade(pal.dark, -0.2);

  // ── body: spine wave grows toward the tail, the head stays steady
  const spine = (x: number) => {
    const s = x / hx0;
    return cy + Math.sin(s * Math.PI * 3 - ph) * (5 * (1 - s) + 0.5) * (pose === 'hurt' ? 1.6 : 1);
  };
  for (let x = 0; x <= hx0 + 3; x++) {
    const s = x / hx0;
    const yc = spine(x);
    const r = h * 0.4 * (s < 0.45 ? 0.3 + (s / 0.45) * 0.7 : 1 + Math.max(0, s - 0.75) * 1.6);
    // dorsal fin along the back, ventral fin on the rear half, both rippling
    const fh = s > 0.06 && s < 0.97 ? 2 + Math.round(1 + Math.sin(x * 0.45 - ph * 2)) : 0;
    for (let k = 1; k <= fh; k++) put(x, yc - r - k, k === fh ? pal.dark : finCol);
    const vh = s < 0.5 ? Math.round(2 + Math.sin(x * 0.5 - ph * 2)) : 0;
    for (let k = 1; k <= vh; k++) put(x, yc + r + k, finCol);
    for (let y = Math.floor(yc - r); y <= Math.ceil(yc + r); y++) {
      const v = (y - (yc - r)) / (2 * r);
      let col = v < 0.18 ? pal.dark : v < 0.66 ? pal.main : v < 0.8 ? shade(pal.main, 0.1) : belly;
      // leopard blotches: one irregular spot per 6×5 cell
      const cx6 = Math.floor(x / 6);
      const cyy = Math.floor((y - yc + 40) / 5);
      const hsh = (cx6 * 73 + cyy * 151) % 17;
      const sx = cx6 * 6 + 1 + (hsh % 4);
      const sy = cyy * 5 + (hsh % 3);
      if (v >= 0.16 && v < 0.72 && hsh < 11 && Math.abs(x - sx) + Math.abs(y - yc + 40 - sy) <= (hsh % 2) + 1) col = spot;
      if (v > 0.25 && v < 0.3 && x % 7 === 0) col = pal.light; // lateral line
      put(x, y, col);
    }
  }
  // tail fin
  for (let k = 0; k < 6; k++) {
    const yc = spine(0);
    put(-k, yc - 1 - k * 0.6, finCol);
    put(-k, yc + 1 + k * 0.6, finCol);
    put(-k, yc, pal.dark);
  }

  // ── head with articulated jaws
  const gape = pose === 'raise' ? 1 : pose === 'hurt' ? 0.6 : 0.12 + 0.12 * Math.sin(ph);
  const hl = w - hx0;
  for (let x = hx0; x <= w; x++) {
    const t = (x - hx0) / hl;
    // the neck swells from the body into the skull, then narrows to the snout
    const rNeck = h * 0.4 * 1.0;
    const grow = Math.min(1, t / 0.28);
    const ease = grow * grow * (3 - 2 * grow);
    const top = cy - (rNeck + (R - rNeck) * ease) * (1 - 0.72 * t * t);
    const hinge = 0.32;
    if (t < hinge) {
      const bot = cy + rNeck + (R * 0.8 - rNeck) * ease;
      for (let y = Math.floor(top); y <= Math.ceil(bot); y++) {
        const v = (y - top) / (bot - top);
        put(x, y, v < 0.2 ? pal.dark : v < 0.65 ? pal.main : belly);
      }
      continue;
    }
    const open = (t - hinge) * R * 1.05 * gape;
    const ub = cy - open; // upper jaw lower edge
    const lb = cy + 1 + open * 0.8; // lower jaw upper edge
    const lbot = lb + R * 0.55 * (1 - 0.55 * t);
    for (let y = Math.floor(top); y <= Math.ceil(ub); y++) {
      const v = (y - top) / Math.max(1, ub - top);
      put(x, y, v < 0.3 ? pal.dark : v < 0.8 ? pal.main : shade(pal.main, 0.12));
    }
    for (let y = Math.ceil(ub) + 1; y < Math.floor(lb); y++) put(x, y, t > 0.96 ? pal.dark : '#3a0a14');
    for (let y = Math.floor(lb); y <= Math.ceil(lbot); y++) put(x, y, y < lb + 1.5 ? pal.main : belly);
    // teeth: fangs on both jaws, longer toward the snout
    if (t < 0.97 && x % 2 === 0) {
      const len = t > 0.7 ? 2 : 1;
      for (let k = 1; k <= len && open > k; k++) {
        put(x, ub + k, '#f4f0e0');
        put(x, lb - k, '#f4f0e0');
      }
    }
  }
  // gill slits
  for (let k = 0; k < 3; k++) {
    const gx = hx0 + 1 + k * 2;
    for (let y = -2; y <= 3; y++) put(gx, cy + y, spot);
  }
  // eye
  const ex = hx0 + Math.round(hl * 0.48);
  const ey = Math.round(cy - R * 0.5);
  if (pose === 'hurt') {
    for (const [dx, dy] of [[-1, -1], [1, 1], [-1, 1], [1, -1], [0, 0]]) put(ex + dx, ey + dy, '#ff3a3a');
  } else {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) < 4) put(ex + dx, ey + dy, pal.eye);
    const pc = pose === 'raise' ? '#ff2a2a' : '#000000';
    put(ex + 1, ey, pc);
    put(ex + 1, ey + 1, pc);
    put(ex, ey, pc);
    put(ex - 1, ey - 1, '#ffffff');
    if (pose === 'raise') for (let k = -3; k <= 3; k++) put(ex + k, ey - 3 + Math.round(k * 0.4), spot); // angry brow
  }
  // nostril tube on the snout
  put(w - 2, cy - R * 0.32 - 1, pal.dark);
  put(w - 1, cy - R * 0.32 - 2, pal.light);

  // ── outline pass + blit
  const o = shade(pal.dark, -0.55);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const col = grid[y * W + x];
      if (col) {
        P.p(x, y, col);
        continue;
      }
      const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < W && yy < H && grid[yy * W + xx] !== null;
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) P.p(x, y, o);
    }
  }
  if (cache.size > 64) cache.clear();
  cache.set(key, c);
  return { canvas: c, pad };
}

/** The alien meteor resting at the bottom of the abyss (the reason for all of this). */
export function meteorSprite(): HTMLCanvasElement {
  const key = 'meteor';
  let c = cache.get(key);
  if (c) return c;
  const W = 150, H = 90;
  c = makeCanvas(W, H);
  const P = new Painter(c);
  const cx = W / 2, cy = H * 0.62, rx = W * 0.4, ry = H * 0.38;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const bump = Math.sin(x * 0.31) * 0.06 + Math.sin(y * 0.47 + x * 0.1) * 0.05;
      const d = dx * dx + dy * dy + bump;
      if (d > 1) continue;
      let col = d > 0.86 ? '#140a1e' : dy < -0.4 ? '#4a3a5a' : dy < 0.1 ? '#2e2240' : '#1e1630';
      // craters
      for (const [kx, ky, kr] of [[-0.4, -0.2, 0.18], [0.3, 0.1, 0.22], [0.05, -0.45, 0.12]]) {
        const ex = dx - kx, ey = dy - ky;
        if (ex * ex + ey * ey < kr * kr) col = ex + ey < 0 ? '#120a1a' : '#5a4a6a';
      }
      P.p(x, y, col);
    }
  }
  // glowing alien cracks
  const crack = (pts: [number, number][]) => {
    for (let i = 1; i < pts.length; i++) P.line(cx + pts[i - 1][0] * rx, cy + pts[i - 1][1] * ry, cx + pts[i][0] * rx, cy + pts[i][1] * ry, '#b6ff3a');
  };
  crack([[-0.7, 0.1], [-0.35, -0.05], [-0.1, 0.25], [0.2, 0.05], [0.55, 0.3]]);
  crack([[-0.1, 0.25], [0, 0.6]]);
  crack([[0.2, 0.05], [0.25, -0.5], [0.45, -0.7]]);
  // alien crystals growing out of it
  for (const [kx, kh, col] of [[-0.55, 26, '#7a3aff'], [-0.2, 38, '#b6ff3a'], [0.15, 30, '#7a3aff'], [0.45, 22, '#3fffe8']] as [number, number, string][]) {
    const x0 = cx + kx * rx;
    const base = cy - Math.sqrt(Math.max(0, 1 - kx * kx)) * ry + 4;
    for (let y = 0; y < kh; y++) {
      const ww = Math.max(1, Math.round(4 * (1 - y / kh) + 1));
      P.rect(Math.round(x0 - ww / 2 + y * 0.15), Math.round(base - y), ww, 1, y % 5 === 0 ? '#ffffff' : col);
    }
  }
  cache.set(key, c);
  return c;
}
