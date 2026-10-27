import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { defaultSave } from '../src/core/Save';
import { CLAWS_BY_ID } from '../src/entities/ClawsCatalog';
import { UPGRADES, UPGRADES_BY_ID, buyClaw, buyUpgrade, canBuy, computeStats, upgradeCost } from '../src/systems/Upgrades';

describe('upgrade costs', () => {
  it('grows by the configured factor', () => {
    const u = UPGRADES_BY_ID.runTime;
    expect(upgradeCost(u, 0)).toBe(u.baseCost);
    expect(upgradeCost(u, 1)).toBe(Math.round(u.baseCost * CONFIG.upgradeGrowth));
    expect(upgradeCost(u, 3)).toBeGreaterThan(upgradeCost(u, 2));
  });

  it('first upgrades are affordable after a decent first run', () => {
    const roots = UPGRADES.filter((u) => !u.requires);
    for (const u of roots.filter((u) => u.branch !== 'tech')) expect(upgradeCost(u, 0)).toBeLessThanOrEqual(150);
  });
});

describe('buying', () => {
  it('deducts coins, raises level and respects max/prereqs', () => {
    const s = defaultSave();
    expect(canBuy(s, 'runTime')).toBe('funds');
    s.coins = 10000;
    expect(buyUpgrade(s, 'runTime')).toBe('ok');
    expect(s.upgrades.runTime).toBe(1);
    expect(s.coins).toBe(10000 - UPGRADES_BY_ID.runTime.baseCost);
    expect(canBuy(s, 'multi')).toBe('locked');
    s.upgrades.opening = 3;
    s.upgrades.strength = 2;
    expect(canBuy(s, 'multi')).toBe('ok');
    s.upgrades.precision = UPGRADES_BY_ID.precision.maxLevel;
    expect(canBuy(s, 'precision')).toBe('max');
  });

  it('claws need depth record and coins, then auto-equip', () => {
    const s = defaultSave();
    s.coins = 100000;
    expect(buyClaw(s, 'hydraulic')).toBe(false); // needs 150 m record
    s.bestDepth = 200;
    expect(buyClaw(s, 'hydraulic')).toBe(true);
    expect(s.equippedClaw).toBe('hydraulic');
    expect(buyClaw(s, 'hydraulic')).toBe(false);
  });
});

describe('computeStats applies real effects', () => {
  it('run time +5s per level', () => {
    const s = defaultSave();
    expect(computeStats(s).runSeconds).toBe(30);
    s.upgrades.runTime = 1;
    expect(computeStats(s).runSeconds).toBe(35);
    s.upgrades.runTime = 3;
    expect(computeStats(s).runSeconds).toBe(45);
  });

  it('speed, recovery, opening, strength, density, luck, lateral all change numbers', () => {
    const base = computeStats(defaultSave());
    const s = defaultSave();
    Object.assign(s.upgrades, { strikeSpeed: 3, recovery: 3, opening: 2, strength: 2, density: 2, luck: 3, lateral: 2, multi: 1, opening2: 0 });
    const up = computeStats(s);
    expect(up.strikeMs).toBeLessThan(base.strikeMs);
    expect(up.retractMs).toBeLessThan(base.retractMs);
    expect(up.cooldownMs).toBeLessThan(base.cooldownMs);
    expect(up.opening).toBeGreaterThan(base.opening);
    expect(up.strength).toBeGreaterThan(base.strength);
    expect(up.density).toBeGreaterThan(base.density);
    expect(up.luck).toBeGreaterThan(base.luck);
    expect(up.lateralSpeed).toBeGreaterThan(base.lateralSpeed);
    expect(up.maxTargets).toBe(base.maxTargets + 1);
  });

  it('strike speed has a readable floor and luck has diminishing returns', () => {
    const s = defaultSave();
    s.upgrades.strikeSpeed = 99;
    expect(computeStats(s).strikeMs).toBeGreaterThanOrEqual(CONFIG.claw.minStrikeMs);
    const l = (n: number) => { const t = defaultSave(); t.upgrades.luck = n; return computeStats(t).luck; };
    expect(l(2) - l(1)).toBeLessThan(l(1) - l(0));
    expect(l(10)).toBeLessThan(1);
  });

  it('equipped claw drives stats', () => {
    const s = defaultSave();
    s.ownedClaws.push('lightning', 'hydraulic');
    s.equippedClaw = 'lightning';
    const fast = computeStats(s);
    s.equippedClaw = 'hydraulic';
    const heavy = computeStats(s);
    expect(fast.strikeMs).toBe(CLAWS_BY_ID.lightning.strikeMs);
    expect(fast.strikeMs).toBeLessThan(heavy.strikeMs);
    expect(heavy.strength).toBeGreaterThan(fast.strength);
    expect(heavy.opening).toBeGreaterThan(fast.opening);
  });
});
