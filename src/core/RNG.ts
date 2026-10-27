// Deterministic pseudo-random helpers. Everything procedural (terrain, decor,
// creature looks) derives from a seed so the world never "shuffles" on scroll.

export type Rand = () => number;

/** mulberry32: tiny, fast, good-enough PRNG. Returns floats in [0, 1). */
export function seededRandom(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash of up to three ints -> uint32. */
export function hash3(a: number, b = 0, c = 0): number {
  let h = 2166136261 >>> 0;
  h = Math.imul(h ^ (a | 0), 16777619);
  h = Math.imul(h ^ (b | 0), 16777619);
  h = Math.imul(h ^ (c | 0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}

/** Hash to float in [0, 1). */
export function hashFloat(a: number, b = 0, c = 0): number {
  return hash3(a, b, c) / 4294967296;
}

/** 1D smooth value noise in [-1, 1]. */
export function valueNoise1D(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hashFloat(seed, i) * 2 - 1;
  const b = hashFloat(seed, i + 1) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

export function randRange(r: Rand, min: number, max: number): number {
  return min + (max - min) * r();
}

export function randInt(r: Rand, min: number, maxInclusive: number): number {
  return Math.floor(min + (maxInclusive - min + 1) * r());
}

export function pick<T>(r: Rand, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length) % arr.length];
}

/** Weighted pick. Returns index, or -1 if all weights are zero. */
export function weightedIndex(r: Rand, weights: readonly number[]): number {
  let total = 0;
  for (const w of weights) total += w > 0 ? w : 0;
  if (total <= 0) return -1;
  let roll = r() * total;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i] > 0 ? weights[i] : 0;
    if (roll < w) return i;
    roll -= w;
  }
  return weights.length - 1;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
