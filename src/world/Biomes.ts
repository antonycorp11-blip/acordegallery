import { mixColor } from '../render/Color';
import { smoothstep } from '../core/RNG';

export interface BiomePalette {
  waterTop: string;
  waterBottom: string;
  sandLight: string;
  sand: string;
  sandDark: string;
  rockLight: string;
  rock: string;
  rockDark: string;
  coralA: string;
  coralB: string;
  coralC: string;
  weed: string;
  particle: string;
  farSil: string;
  midSil: string;
  glow: string;
}

export interface BiomeDef {
  id: string;
  name: string;
  startX: number;
  palette: BiomePalette;
  /** decoration weights, in DECOR_TYPES order:
   *  rock, coral, weed, crevice, shell, ruin, wreck, glowPlant, kelp, anemone, crystal, vent */
  decor: number[];
  lightRays: number;
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'reef',
    name: 'Recife Colorido',
    startX: 0,
    lightRays: 1,
    decor: [2, 7, 5, 1, 3, 0, 0, 0, 0, 4, 0, 0],
    palette: {
      waterTop: '#3fd6d8', waterBottom: '#1f8fb8',
      sandLight: '#f6dc8f', sand: '#e0b562', sandDark: '#b98a45',
      rockLight: '#5aa3a8', rock: '#2f7480', rockDark: '#1d4f5e',
      coralA: '#ff6fa8', coralB: '#b06cff', coralC: '#ff9a3c',
      weed: '#8be33a', particle: '#e9ffff', farSil: '#2aa6bf', midSil: '#2290aa', glow: '#fff7b0',
    },
  },
  {
    id: 'rocky',
    name: 'Costa Rochosa',
    startX: 1500,
    lightRays: 0.6,
    decor: [7, 2, 3, 4, 2, 0, 0, 0, 5, 2, 0, 0],
    palette: {
      waterTop: '#2fa7c9', waterBottom: '#16609a',
      sandLight: '#c9b48a', sand: '#9c8766', sandDark: '#6f5d48',
      rockLight: '#5f86a8', rock: '#3b5d82', rockDark: '#233b5a',
      coralA: '#ff7f6a', coralB: '#d36cff', coralC: '#ffd84a',
      weed: '#4fc76a', particle: '#d6f4ff', farSil: '#1f7fae', midSil: '#1a6a98', glow: '#c8fff4',
    },
  },
  {
    id: 'wreck',
    name: 'Naufrágios e Ruínas',
    startX: 4000,
    lightRays: 0.25,
    decor: [4, 1, 2, 2, 1, 5, 3, 1, 2, 1, 0, 2],
    palette: {
      waterTop: '#2a6fb8', waterBottom: '#1a3b84',
      sandLight: '#a7a0b8', sand: '#7a7392', sandDark: '#524c6c',
      rockLight: '#6c7fb8', rock: '#46558e', rockDark: '#2b3463',
      coralA: '#ff5fbf', coralB: '#5fe3ff', coralC: '#ffb84a',
      weed: '#46d6a0', particle: '#cfe0ff', farSil: '#234f9a', midSil: '#1e4288', glow: '#7cf5ff',
    },
  },
  {
    id: 'forest',
    name: 'Floresta Abissal',
    startX: 7000,
    lightRays: 0,
    decor: [3, 2, 3, 2, 1, 1, 0, 5, 6, 1, 1, 2],
    palette: {
      waterTop: '#3b3fb0', waterBottom: '#24207a',
      sandLight: '#8d7cc4', sand: '#64559c', sandDark: '#433874',
      rockLight: '#6f63c9', rock: '#4a3f99', rockDark: '#2e2766',
      coralA: '#ff4fd8', coralB: '#40ffd0', coralC: '#c6ff4a',
      weed: '#36f0b0', particle: '#e0d0ff', farSil: '#3a34a0', midSil: '#2f2a8e', glow: '#5cffe1',
    },
  },
  {
    id: 'abyss',
    name: 'Abismo Impossível',
    startX: 11000,
    lightRays: 0,
    decor: [4, 2, 1, 3, 0, 2, 0, 4, 1, 0, 7, 3],
    palette: {
      waterTop: '#4a2a9e', waterBottom: '#2c1468',
      sandLight: '#a46ad0', sand: '#7a44aa', sandDark: '#522c80',
      rockLight: '#8a4fd0', rock: '#5f2fa6', rockDark: '#3c1c74',
      coralA: '#ff3fa0', coralB: '#3fffe8', coralC: '#ffe14a',
      weed: '#ff5ff0', particle: '#ffd6ff', farSil: '#4a2aa6', midSil: '#3c2090', glow: '#ff7ff5',
    },
  },
];

const TRANSITION = 600;

/** Which biome dominates at x, plus the neighbor it is blending into. */
export function biomeBlend(worldX: number): { a: number; b: number; t: number } {
  let idx = 0;
  for (let i = 0; i < BIOMES.length; i++) if (worldX >= BIOMES[i].startX) idx = i;
  const next = idx + 1;
  if (next < BIOMES.length) {
    const edge = BIOMES[next].startX;
    const start = edge - TRANSITION / 2;
    if (worldX > start) {
      const t = smoothstep(Math.min(1, (worldX - start) / TRANSITION));
      return { a: idx, b: next, t };
    }
  }
  const prev = idx - 1;
  if (prev >= 0) {
    const edge = BIOMES[idx].startX;
    const end = edge + TRANSITION / 2;
    if (worldX < end) {
      const t = smoothstep(0.5 + (worldX - edge) / TRANSITION);
      return { a: prev, b: idx, t };
    }
  }
  return { a: idx, b: idx, t: 0 };
}

export function biomeIndexAt(worldX: number): number {
  const { a, b, t } = biomeBlend(worldX);
  return t < 0.5 ? a : b;
}

const paletteCache = new Map<number, BiomePalette>();

/** Interpolated palette at a world x (quantized to keep the cache small). */
export function paletteAt(worldX: number): BiomePalette {
  const q = Math.round(worldX / 16);
  const cached = paletteCache.get(q);
  if (cached) return cached;
  const { a, b, t } = biomeBlend(q * 16);
  const pa = BIOMES[a].palette;
  const pb = BIOMES[b].palette;
  const out = {} as BiomePalette;
  for (const k of Object.keys(pa) as (keyof BiomePalette)[]) out[k] = t === 0 ? pa[k] : mixColor(pa[k], pb[k], t);
  if (paletteCache.size > 4000) paletteCache.clear();
  paletteCache.set(q, out);
  return out;
}

export function lightRaysAt(worldX: number): number {
  const { a, b, t } = biomeBlend(worldX);
  return BIOMES[a].lightRays + (BIOMES[b].lightRays - BIOMES[a].lightRays) * t;
}
