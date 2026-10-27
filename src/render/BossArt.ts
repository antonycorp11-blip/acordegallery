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
