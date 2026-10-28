import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { seededRandom } from '../src/core/RNG';
import { defaultSave } from '../src/core/Save';
import { Claw } from '../src/entities/Claw';
import { findPathHit, resolveStrike, type Hittable } from '../src/entities/Hit';
import { RARITIES, SPECIES_BY_ID } from '../src/entities/Species';
import { ComboTracker, captureValue, depthValueMult, recordCapture } from '../src/systems/Economy';
import { computeStats } from '../src/systems/Upgrades';
import { SpawnDirector, chunkPopulation, pickSpecies, pickVariant } from '../src/world/SpawnDirector';
import { Terrain } from '../src/world/Terrain';

const box = (x: number, y: number, w = 10, h = 8, hittable = true): Hittable => ({ x, y, w, h, hittable });

describe('hit resolution', () => {
  it('hits only what overlaps the mouth at contact time', () => {
    const t = [box(100, 100), box(140, 100)];
    expect(resolveStrike(100, 100, 9, 0, t, 1, 0.35).map((h) => h.target)).toEqual([t[0]]);
    expect(resolveStrike(110, 100, 9, 0, t, 1, 0.35)).toHaveLength(1);
    expect(resolveStrike(122, 100, 9, 0, t, 1, 0.35)).toHaveLength(0);
    expect(resolveStrike(100, 130, 9, 0, t, 1, 0.35)).toHaveLength(0);
  });

  it('precision widens the edge slightly, maxTargets caps multi-capture, hidden is immune', () => {
    const t = [box(100, 100)];
    expect(resolveStrike(100, 116, 9, 0, t, 1, 0.35)).toHaveLength(0);
    expect(resolveStrike(100, 116, 9, 4, t, 1, 0.35)).toHaveLength(1);
    const many = [box(100, 100), box(104, 102), box(96, 98)];
    expect(resolveStrike(100, 100, 12, 0, many, 1, 0.35)).toHaveLength(1);
    expect(resolveStrike(100, 100, 12, 0, many, 3, 0.35)).toHaveLength(3);
    expect(resolveStrike(100, 100, 9, 0, [box(100, 100, 10, 8, false)], 1, 0.35)).toHaveLength(0);
  });

  it('flags perfect center hits', () => {
    expect(resolveStrike(100, 100, 9, 0, [box(100, 100)], 1, 0.35)[0].perfect).toBe(true);
    expect(resolveStrike(108, 100, 9, 0, [box(100, 100)], 1, 0.35)[0].perfect).toBe(false);
  });
});

describe('column dive (touch)', () => {
  it('grabs the first creature in the path, not the one further down', () => {
    const upper = box(100, 80);
    const lower = box(102, 150);
    const hit = findPathHit(100, 20, 200, 9, 0, [lower, upper]);
    expect(hit?.target).toBe(upper);
    expect(hit!.y).toBeLessThan(80);
  });

  it('ignores creatures outside the column, hidden ones, and those already passed', () => {
    expect(findPathHit(100, 20, 200, 9, 0, [box(130, 80)])).toBeNull();
    expect(findPathHit(100, 20, 200, 9, 0, [box(100, 80, 10, 8, false)])).toBeNull();
    expect(findPathHit(100, 120, 200, 9, 0, [box(100, 80)])).toBeNull();
    expect(findPathHit(100, 20, 60, 9, 0, [box(100, 80)])).toBeNull(); // dive stops before reaching it
    expect(findPathHit(100, 20, 70, 9, 0, [box(100, 80)])?.y).toBeCloseTo(80 - 8 * 0.42 - 9);
  });
});

describe('claw state machine', () => {
  it('snaps down fast: contact right after anticipation + strike time', () => {
    const stats = computeStats(defaultSave());
    const claw = new Claw(stats);
    expect(claw.trigger(100, 200, 20)).toBe(true);
    let t = 0;
    let contactAt = -1;
    while (t < 2000 && claw.state !== 'READY') {
      claw.update(1, 100, 20);
      t += 1;
      if (claw.contactPending && contactAt < 0) contactAt = t;
    }
    expect(contactAt).toBeGreaterThan(0);
    expect(contactAt).toBeLessThanOrEqual(CONFIG.claw.anticipationMs + stats.strikeMs + 2);
    expect(stats.strikeMs).toBeLessThanOrEqual(160);
    const cycle = CONFIG.claw.anticipationMs + stats.strikeMs + CONFIG.claw.closeMs + stats.retractMs + stats.cooldownMs;
    expect(t).toBeGreaterThanOrEqual(cycle - 2);
    expect(cycle).toBeGreaterThanOrEqual(450);
    expect(cycle).toBeLessThanOrEqual(650);
  });

  it('stops the dive early on contact', () => {
    const claw = new Claw(computeStats(defaultSave()));
    claw.trigger(0, 250, 20);
    for (let i = 0; i < 60; i++) claw.update(1, 0, 20);
    expect(claw.state).toBe('STRIKE');
    claw.stopAt(90);
    expect(claw.contactPending).toBe(true);
    expect(claw.state).toBe('CLOSE');
    expect(claw.targetY).toBe(90);
  });

  it('ignores clicks while busy but buffers one', () => {
    const claw = new Claw(computeStats(defaultSave()));
    claw.trigger(0, 100, 20);
    expect(claw.trigger(0, 100, 20)).toBe(false);
    expect(claw.bufferedMs).toBeGreaterThan(0);
  });

  it('a faster strike upgrade reaches contact sooner', () => {
    const s = defaultSave();
    const slow = computeStats(s).strikeMs;
    s.upgrades.strikeSpeed = 4;
    expect(computeStats(s).strikeMs).toBeLessThan(slow);
  });
});

describe('spawn director', () => {
  it('respects habitats: no deep species in the shallow reef', () => {
    const r = seededRandom(1);
    for (let i = 0; i < 2000; i++) {
      const sp = pickSpecies(20, 0, 0, r)!;
      expect(sp.minDepth).toBeLessThan(200);
    }
  });

  it('luck really shifts the rarity distribution', () => {
    const share = (luck: number) => {
      const r = seededRandom(9);
      let rare = 0;
      for (let i = 0; i < 20000; i++) if (RARITIES.indexOf(pickSpecies(600, 2, luck, r)!.rarity) >= 2) rare++;
      return rare / 20000;
    };
    const base = share(0);
    expect(base).toBeGreaterThan(0.01); // rare but possible
    expect(share(0.6)).toBeGreaterThan(base * 1.5);
  });

  it('density really increases population', () => {
    let lo = 0;
    let hi = 0;
    const r1 = seededRandom(3);
    const r2 = seededRandom(3);
    for (let i = 0; i < 500; i++) {
      lo += chunkPopulation(0, 1, r1);
      hi += chunkPopulation(0, 1.48, r2);
    }
    expect(hi).toBeGreaterThan(lo * 1.3);
  });

  it('variant upgrades raise special variant odds', () => {
    const count = (mult: number) => {
      const r = seededRandom(5);
      let n = 0;
      for (let i = 0; i < 20000; i++) if (['golden', 'giant', 'biolum', 'mutant'].includes(pickVariant(SPECIES_BY_ID.orangeFish, 2000, mult, r))) n++;
      return n;
    };
    expect(count(2)).toBeGreaterThan(count(1) * 1.5);
  });

  it('populates chunks once, never duplicates on return, keeps the cap', () => {
    const terrain = new Terrain(11);
    const sd = new SpawnDirector(terrain, { density: 1, luck: 0, schoolBonus: 0, variantMult: 1 }, 11);
    sd.update(0.016, 0, -999, 0);
    const first = sd.creatures.length;
    expect(first).toBeGreaterThan(4);
    sd.update(0.016, 0, -999, 0);
    expect(sd.creatures.length).toBeLessThanOrEqual(first);
    expect(new Set(sd.creatures.map(c => c.id)).size).toBe(sd.creatures.length);
    const dense = new SpawnDirector(terrain, { density: 50, luck: 0, schoolBonus: 5, variantMult: 1 }, 11);
    for (let x = 0; x < 3000; x += 120) dense.update(0.1, x, -999, 1);
    expect(dense.alive).toBeLessThanOrEqual(CONFIG.spawn.maxAlive);
  });
});

describe('economy', () => {
  it('deeper captures are worth more, variants multiply', () => {
    const fish = SPECIES_BY_ID.orangeFish;
    expect(captureValue(fish, 'normal', 400, 0, 0)).toBeGreaterThan(captureValue(fish, 'normal', 0, 0, 0));
    expect(captureValue(fish, 'golden', 0, 0, 0)).toBe(Math.round(fish.baseValue * 4));
    expect(depthValueMult(0)).toBe(1);
  });

  it('combo grows within the window and resets on miss/timeout', () => {
    const c = new ComboTracker({ comboStep: 0.1, comboMax: 0.5, comboWindowMs: 1000 });
    expect(c.hit(0)).toBe(0);
    expect(c.hit(500)).toBeCloseTo(0.1);
    expect(c.hit(900)).toBeCloseTo(0.2);
    expect(c.hit(5000)).toBe(0);
    for (let i = 0; i < 20; i++) c.hit(5000 + i);
    expect(c.bonus()).toBe(0.5);
    c.miss();
    expect(c.count).toBe(0);
  });

  it('records discoveries once', () => {
    const s = defaultSave();
    expect(recordCapture(s, 'star', 'normal')).toBe(true);
    expect(recordCapture(s, 'star', 'golden')).toBe(false);
    expect(s.species.star).toEqual({ caught: 2, variants: ['normal', 'golden'] });
  });
});
