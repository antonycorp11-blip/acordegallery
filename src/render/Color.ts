// Small color helpers working on "#rrggbb" strings with a cache to avoid churn.

type RGB = [number, number, number];
const rgbCache = new Map<string, RGB>();

export function hexToRgb(hex: string): RGB {
  let c = rgbCache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1, 7), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
  }
  return c;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const v = (Math.round(clamp255(r)) << 16) | (Math.round(clamp255(g)) << 8) | Math.round(clamp255(b));
  return '#' + v.toString(16).padStart(6, '0');
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function mixColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t);
}

export function shade(hex: string, amount: number): string {
  return amount >= 0 ? mixColor(hex, '#ffffff', amount) : mixColor(hex, '#000000', -amount);
}

export function hueShift(hex: string, degrees: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as RGB;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (h + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  return rgbToHex((rr + m) * 255, (gg + m) * 255, (bb + m) * 255);
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
