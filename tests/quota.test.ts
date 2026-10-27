import { describe, expect, it } from 'vitest';
import { defaultSave, sanitizeSave } from '../src/core/Save';
import { BAITS, BAITS_BY_ID, baitAttracts } from '../src/entities/Baits';
import { SPECIES_BY_ID } from '../src/entities/Species';
import { claimDaily, doPrestige } from '../src/systems/Meta';
import { DIVES_PER_DAY, catchKg, deliverDive, licenseBonus, quotaTarget } from '../src/systems/Quota';
import { Camera } from '../src/core/Camera';
import { Terrain } from '../src/world/Terrain';
import { VIEW_W } from '../src/config';

describe('daily quota', () => {
  it('weights catches, bigger variants weigh more, objects weigh nothing', () => {
    const fish = SPECIES_BY_ID.orangeFish;
    expect(catchKg(fish, 'normal')).toBeGreaterThan(0);
    expect(catchKg(fish, 'giant')).toBeGreaterThan(catchKg(fish, 'normal') * 2);
    expect(catchKg(SPECIES_BY_ID.chest, 'normal')).toBe(0);
  });

  it('meeting the quota pays, raises the license and the next target', () => {
    const s = defaultSave();
    const t0 = quotaTarget(s.quota.tier);
    const out = deliverDive(s, t0 + 5);
    expect(out.kind).toBe('met');
    expect(s.coins).toBeGreaterThan(0);
    expect(s.stars).toBeGreaterThan(0);
    expect(s.quota.license).toBe(1);
    expect(s.quota.day).toBe(2);
    expect(quotaTarget(s.quota.tier)).toBeGreaterThan(t0);
    expect(licenseBonus(s.quota.license)).toBeGreaterThan(0);
  });

  it('accumulates over the day; missing it fines, drops license and repeats the target', () => {
    const s = defaultSave();
    s.coins = 1000;
    s.quota.license = 2;
    s.quota.tier = 1;
    const target = quotaTarget(1);
    for (let i = 0; i < DIVES_PER_DAY - 1; i++) expect(deliverDive(s, 1).kind).toBe('pending');
    expect(s.quota.deliveredKg).toBe(DIVES_PER_DAY - 1);
    const out = deliverDive(s, 1);
    expect(out.kind).toBe('failed');
    expect(s.coins).toBe(850);
    expect(s.quota.license).toBe(1);
    expect(quotaTarget(s.quota.tier)).toBe(target);
    expect(s.quota.divesLeft).toBe(DIVES_PER_DAY);
    expect(s.quota.deliveredKg).toBe(0);
  });

  it('survives save/load and resets on prestige', () => {
    const s = defaultSave();
    deliverDive(s, 3);
    expect(sanitizeSave(JSON.parse(JSON.stringify(s))).quota).toEqual(s.quota);
    s.bosses = ['kingCrab', 'colossalEel'];
    s.earnedThisLife = 5000;
    s.quota.tier = 4;
    s.quota.license = 3;
    doPrestige(s);
    expect(s.quota.tier).toBe(0);
    expect(s.quota.license).toBe(0);
  });
});

describe('baits', () => {
  it('each bait attracts its own group', () => {
    expect(baitAttracts(BAITS_BY_ID.shrimp, SPECIES_BY_ID.coralCrab)).toBe(true);
    expect(baitAttracts(BAITS_BY_ID.shrimp, SPECIES_BY_ID.orangeFish)).toBe(false);
    expect(baitAttracts(BAITS_BY_ID.algae, SPECIES_BY_ID.orangeFish)).toBe(true);
    expect(baitAttracts(BAITS_BY_ID.glow, SPECIES_BY_ID.neonJelly)).toBe(true);
    expect(baitAttracts(BAITS_BY_ID.golden, SPECIES_BY_ID.thiefOctopus)).toBe(true);
    expect(baitAttracts(BAITS_BY_ID.golden, SPECIES_BY_ID.chest)).toBe(false);
    for (const b of BAITS) for (const id of b.species) if (id !== '*') expect(SPECIES_BY_ID[id]).toBeDefined();
  });

  it('new players start with some bait; the daily gift adds more', () => {
    const s = defaultSave();
    expect(s.baits.algae).toBeGreaterThan(0);
    const before = s.baits.algae;
    claimDaily(s, 1_000_000_000_000);
    expect(s.baits.algae).toBeGreaterThan(before);
  });
});

describe('claw rail', () => {
  it('reaches the very left edge even though the camera stops scrolling', () => {
    const cam = new Camera();
    const t = new Terrain(1);
    cam.x = 300;
    for (let i = 0; i < 400; i++) cam.update(0.05, -1, 200, t);
    expect(cam.x).toBe(0);
    expect(cam.focus).toBeLessThan(30);
    expect(cam.focusScreenX).toBeLessThan(30);
    for (let i = 0; i < 40; i++) cam.update(0.05, 1, 200, t);
    expect(cam.focusScreenX).toBeLessThanOrEqual(VIEW_W / 2);
  });

  it('a guardian wall stops the rail', () => {
    const cam = new Camera();
    const t = new Terrain(1);
    for (let i = 0; i < 400; i++) cam.update(0.05, 1, 200, t, 900);
    expect(cam.focus).toBe(900);
  });
});
