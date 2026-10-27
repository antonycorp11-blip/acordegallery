import { describe, expect, it } from 'vitest';
import { DEPTH_KEYS, depthAt } from '../src/world/Depth';
import { BIOMES, biomeBlend, biomeIndexAt, paletteAt } from '../src/world/Biomes';
import { Terrain } from '../src/world/Terrain';

describe('depthAt', () => {
  it('starts at 0 m and hits every keypoint', () => {
    expect(depthAt(0)).toBe(0);
    for (const k of DEPTH_KEYS) expect(depthAt(k.x)).toBeCloseTo(k.m, 6);
  });

  it('is monotonic and continuous going right', () => {
    let prev = depthAt(0);
    for (let x = 1; x < 20000; x += 7) {
      const d = depthAt(x);
      expect(d).toBeGreaterThanOrEqual(prev);
      expect(d - prev).toBeLessThan(10); // no jumps
      prev = d;
    }
  });

  it('never returns NaN for bad input', () => {
    expect(depthAt(-500)).toBe(0);
    expect(depthAt(Number.NaN)).toBe(0);
    expect(Number.isFinite(depthAt(1e7))).toBe(true);
  });
});

describe('biomes', () => {
  it('maps distance ranges to the right biome', () => {
    expect(BIOMES[biomeIndexAt(500)].id).toBe('reef');
    expect(BIOMES[biomeIndexAt(4000)].id).toBe('reef');
    expect(BIOMES[biomeIndexAt(9000)].id).toBe('rocky');
    expect(BIOMES[biomeIndexAt(20000)].id).toBe('wreck');
    expect(BIOMES[biomeIndexAt(34000)].id).toBe('forest');
    expect(BIOMES[biomeIndexAt(50000)].id).toBe('abyss');
  });

  it('blends continuously across a boundary', () => {
    let prevT = -1;
    let prevPair = '';
    for (let x = 5000; x <= 7000; x += 5) {
      const b = biomeBlend(x);
      const pair = `${b.a}-${b.b}`;
      if (pair === '0-1') {
        if (prevPair === '0-1') expect(b.t).toBeGreaterThanOrEqual(prevT);
        prevT = b.t;
      }
      prevPair = pair;
      expect(b.t).toBeGreaterThanOrEqual(0);
      expect(b.t).toBeLessThanOrEqual(1);
    }
    expect(biomeBlend(6000 - 1).t).toBeCloseTo(biomeBlend(6000).t, 1);
  });

  it('interpolated palette is valid hex everywhere', () => {
    for (let x = 0; x < 14000; x += 333) expect(paletteAt(x).waterTop).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('terrain', () => {
  it('is deterministic per seed and chunk', () => {
    const a = new Terrain(42);
    const b = new Terrain(42);
    expect(a.seabedY(1234.5)).toBe(b.seabedY(1234.5));
    expect(JSON.stringify(a.getChunk(3))).toBe(JSON.stringify(b.getChunk(3)));
    // regenerating after pruning gives the same rocks in the same place
    const before = JSON.stringify(a.getChunk(3));
    a.prune(100, 2);
    expect(JSON.stringify(a.getChunk(3))).toBe(before);
  });

  it('seabed trends downward to the right but stays smooth', () => {
    const t = new Terrain(7);
    expect(t.baseFloor(10000)).toBeGreaterThan(t.baseFloor(0));
    for (let x = 0; x < 5000; x += 1) expect(Math.abs(t.seabedY(x + 1) - t.seabedY(x))).toBeLessThan(3);
  });
});
