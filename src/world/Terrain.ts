import { CONFIG } from '../config';
import { hash3, seededRandom, valueNoise1D, weightedIndex, randInt } from '../core/RNG';
import { BIOMES, biomeIndexAt } from './Biomes';

export type DecorType = 'rock' | 'coral' | 'weed' | 'crevice' | 'shell' | 'ruin' | 'wreck' | 'glowPlant';
const DECOR_TYPES: DecorType[] = ['rock', 'coral', 'weed', 'crevice', 'shell', 'ruin', 'wreck', 'glowPlant'];

export interface Decor {
  type: DecorType;
  x: number;
  /** seabed world y at x */
  y: number;
  w: number;
  h: number;
  seed: number;
  /** draw in front of creatures? (small foreground clutter) */
  front: boolean;
}

export interface Chunk {
  index: number;
  decor: Decor[];
  crevices: number[];
}

export class Terrain {
  readonly seed: number;
  private chunks = new Map<number, Chunk>();

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  /** Smooth low-frequency floor line (used by the camera). */
  baseFloor(x: number): number {
    const t = CONFIG.terrain;
    return t.baseY + Math.max(0, x) * t.slope + 34 * valueNoise1D(this.seed + 11, x / 700);
  }

  /** Seabed surface world y at x (larger = deeper on screen). */
  seabedY(x: number): number {
    return (
      this.baseFloor(x) +
      18 * valueNoise1D(this.seed + 23, x / 170) +
      7 * valueNoise1D(this.seed + 37, x / 48) +
      2 * valueNoise1D(this.seed + 41, x / 13)
    );
  }

  chunkIndex(x: number): number {
    return Math.floor(x / CONFIG.terrain.chunkWidth);
  }

  getChunk(index: number): Chunk {
    let c = this.chunks.get(index);
    if (!c) {
      c = this.generateChunk(index);
      this.chunks.set(index, c);
    }
    return c;
  }

  /** Free decor of chunks far from the camera (they regenerate identically). */
  prune(centerIndex: number, keep = 8): void {
    for (const k of this.chunks.keys()) if (Math.abs(k - centerIndex) > keep) this.chunks.delete(k);
  }

  private generateChunk(index: number): Chunk {
    const cw = CONFIG.terrain.chunkWidth;
    const x0 = index * cw;
    const r = seededRandom(hash3(this.seed, index, 7));
    const biome = BIOMES[biomeIndexAt(x0 + cw / 2)];
    const decor: Decor[] = [];
    const crevices: number[] = [];
    const count = index < 0 ? 0 : randInt(r, 7, 11);
    for (let i = 0; i < count; i++) {
      const type = DECOR_TYPES[weightedIndex(r, biome.decor)];
      const x = x0 + r() * cw;
      const seed = hash3(this.seed, index, i + 100);
      let w = 10, h = 10;
      switch (type) {
        case 'rock': w = randInt(r, 14, 40); h = randInt(r, 8, 22); break;
        case 'coral': w = randInt(r, 10, 22); h = randInt(r, 12, 30); break;
        case 'weed': w = 4; h = randInt(r, 14, 40); break;
        case 'crevice': w = randInt(r, 16, 26); h = randInt(r, 6, 10); crevices.push(x); break;
        case 'shell': w = 5; h = 4; break;
        case 'ruin': w = randInt(r, 14, 26); h = randInt(r, 24, 50); break;
        case 'wreck': w = randInt(r, 60, 90); h = randInt(r, 22, 32); break;
        case 'glowPlant': w = randInt(r, 6, 12); h = randInt(r, 12, 28); break;
      }
      // a wreck per chunk at most, and keep the start area readable
      if (type === 'wreck' && decor.some((d) => d.type === 'wreck')) continue;
      decor.push({ type, x, y: this.seabedY(x), w, h, seed, front: type === 'shell' || (type === 'weed' && r() < 0.25) });
    }
    // big structures in the back, small ones in front
    decor.sort((a, b) => b.w * b.h - a.w * a.h);
    return { index, decor, crevices };
  }
}
