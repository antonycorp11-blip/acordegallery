// Contact resolution: checked at the instant the claw mouth arrives.

export interface Hittable {
  x: number;
  y: number;
  w: number;
  h: number;
  /** false while hidden in a crevice / already captured */
  hittable: boolean;
}

export interface HitResult<T extends Hittable> {
  target: T;
  /** distance from mouth center to target center */
  dist: number;
  /** hit near the target's center */
  perfect: boolean;
}

/** Circle (claw mouth) vs. shrunk AABB (creature body). */
export function circleHitsBox(cx: number, cy: number, r: number, t: Hittable): boolean {
  const hw = t.w * 0.42;
  const hh = t.h * 0.42;
  const nx = Math.max(t.x - hw, Math.min(cx, t.x + hw));
  const ny = Math.max(t.y - hh, Math.min(cy, t.y + hh));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

export function resolveStrike<T extends Hittable>(
  cx: number,
  cy: number,
  opening: number,
  precision: number,
  targets: readonly T[],
  maxTargets: number,
  perfectFrac: number,
): HitResult<T>[] {
  const r = opening + precision;
  const hits: HitResult<T>[] = [];
  for (const t of targets) {
    if (!t.hittable) continue;
    if (!circleHitsBox(cx, cy, r, t)) continue;
    const dist = Math.hypot(cx - t.x, cy - t.y);
    const perfectR = Math.max(2, Math.min(t.w, t.h) * perfectFrac);
    hits.push({ target: t, dist, perfect: dist <= perfectR });
  }
  hits.sort((a, b) => a.dist - b.dist);
  return hits.slice(0, Math.max(1, maxTargets));
}
