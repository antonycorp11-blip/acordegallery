// Depth is a function of horizontal distance only. Monotonic, continuous,
// piecewise-linear between configurable keypoints, linear extrapolation after.

export interface DepthKey {
  x: number;
  m: number;
}

export const DEPTH_KEYS: DepthKey[] = [
  { x: 0, m: 0 },
  { x: 6000, m: 150 },
  { x: 15000, m: 600 },
  { x: 27000, m: 1800 },
  { x: 42000, m: 4500 },
  { x: 60000, m: 10000 },
];

export function depthAt(worldX: number, keys: DepthKey[] = DEPTH_KEYS): number {
  if (!Number.isFinite(worldX) || worldX <= keys[0].x) return keys[0].m;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (worldX <= k.x) {
      const p = keys[i - 1];
      return p.m + ((worldX - p.x) / (k.x - p.x)) * (k.m - p.m);
    }
  }
  const a = keys[keys.length - 2];
  const b = keys[keys.length - 1];
  const slope = (b.m - a.m) / (b.x - a.x);
  return b.m + (worldX - b.x) * slope;
}

export function formatDepth(m: number): string {
  return `${Math.round(m).toLocaleString('pt-BR')} m`;
}
