import { describe, expect, it } from 'vitest';
import { BOSSES } from '../src/entities/Boss';
import { SPECIES, VARIANTS, strengthRequired, type VariantId } from '../src/entities/Species';
import { sanitizeSave } from '../src/core/Save';
import { CONFIG } from '../src/config';
import { defaultSave } from '../src/core/Save';
import { CLAWS_BY_ID } from '../src/entities/ClawsCatalog';
import { UPGRADES_BY_ID, buyClaw, buyUpgrade, canBuy, childrenOf, computeStats, nodeVisibility, treeNodes, upgradeCost } from '../src/systems/Upgrades';

describe('upgrade costs', () => {
  it('grows by the configured factor', () => {
    const u = UPGRADES_BY_ID.runTime;
    expect(upgradeCost(u, 0)).toBe(u.baseCost);
    expect(upgradeCost(u, 1)).toBe(Math.round(u.baseCost * CONFIG.upgradeGrowth));
    expect(upgradeCost(u, 3)).toBeGreaterThan(upgradeCost(u, 2));
  });

  it('root and its first children are affordable after a decent first run', () => {
    const first = [UPGRADES_BY_ID.core, ...childrenOf('core')];
    expect(first.reduce((n, u) => n + upgradeCost(u, 0), 0)).toBeLessThanOrEqual(150);
  });
});

describe('tree structure', () => {
  it('each tree is connected from its root with unique grid slots', () => {
    for (const [tree, root] of [['main', 'core'], ['essence', 'e_core']] as const) {
      const nodes = treeNodes(tree);
      expect(nodes.filter((u) => u.parent === null).map((u) => u.id)).toEqual([root]);
      expect(new Set(nodes.map((u) => `${u.x},${u.y}`)).size).toBe(nodes.length);
      for (const u of nodes) {
        let cur = u;
        for (let guard = 0; cur.parent && guard < 50; guard++) cur = UPGRADES_BY_ID[cur.parent];
        expect(cur.id).toBe(root);
        if (u.parent) expect(UPGRADES_BY_ID[u.parent].tree).toBe(tree);
      }
    }
    expect(childrenOf('core').map(u => u.id).sort()).toEqual(['lateral','runTime','strikeSpeed']);
  });

  it('essence nodes are paid with essence, not coins', () => {
    const s = defaultSave();
    s.coins = 99999;
    expect(canBuy(s, 'e_core')).toBe('funds');
    s.essence = 1;
    expect(buyUpgrade(s, 'e_core')).toBe('ok');
    expect(s.essence).toBe(0);
    expect(s.coins).toBe(99999);
    expect(computeStats(s).valueMult).toBeCloseTo(1.15);
  });

  it('buying a node reveals its children and teases the next ring', () => {
    const s = defaultSave();
    s.coins = 10000;
    expect(nodeVisibility(s, 'core')).toBe('available');
    expect(nodeVisibility(s, 'strikeSpeed')).toBe('teaser');
    expect(nodeVisibility(s, 'opening')).toBe('hidden');
    expect(canBuy(s, 'strikeSpeed')).toBe('locked');
    buyUpgrade(s, 'core');
    expect(nodeVisibility(s, 'core')).toBe('owned');
    expect(nodeVisibility(s, 'strikeSpeed')).toBe('available');
    expect(nodeVisibility(s, 'runTime')).toBe('available');
    expect(nodeVisibility(s, 'opening')).toBe('teaser');
    buyUpgrade(s, 'strikeSpeed');
    expect(nodeVisibility(s, 'opening')).toBe('available');
    expect(nodeVisibility(s, 'strength')).toBe('available');
  });
});

describe('buying', () => {
  it('deducts coins, raises level and respects max/prereqs', () => {
    const s = defaultSave();
    s.upgrades.core = 1;
    expect(canBuy(s, 'runTime')).toBe('funds');
    s.coins = 10000;
    expect(buyUpgrade(s, 'runTime')).toBe('ok');
    expect(s.upgrades.runTime).toBe(1);
    expect(s.coins).toBe(10000 - UPGRADES_BY_ID.runTime.baseCost);
    expect(canBuy(s, 'multi')).toBe('locked');
    s.upgrades.strength2 = 1;
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
    s.bestDepth = 5000;
    expect(buyClaw(s, 'magnetic')).toBe(false); // needs stars too
    s.stars = 4;
    expect(buyClaw(s, 'magnetic')).toBe(true);
    expect(s.stars).toBe(0);
    expect(s.equippedClaw).toBe('magnetic');
    expect(buyClaw(s, 'hydraulic')).toBe(false);
  });
});

describe('computeStats applies real effects', () => {
  it('run time +3s per level, summed across every time node', () => {
    const s = defaultSave();
    expect(computeStats(s).runSeconds).toBe(30);
    s.upgrades.core = 1;
    expect(computeStats(s).runSeconds).toBe(33);
    s.upgrades.runTime = 3;
    expect(computeStats(s).runSeconds).toBe(42);
    s.upgrades.runTime2 = 1;
    expect(computeStats(s).runSeconds).toBe(45);
  });

  it('sealed nodes show as a teaser and only open after their guardian falls', () => {
    const s = defaultSave();
    Object.assign(s.upgrades, { core: 1, strikeSpeed: 1, strength: 1, strength2: 1 });
    expect(nodeVisibility(s, 'strength3')).toBe('teaser');
    expect(canBuy(s, 'strength3')).toBe('locked');
    s.bosses.push('kingCrab');
    s.coins = 1e9;
    expect(nodeVisibility(s, 'strength3')).toBe('available');
    expect(canBuy(s, 'strength3')).toBe('ok');
  });

  it('new stats: stealth, hull, kg and bait time', () => {
    const s = defaultSave();
    const base = computeStats(s);
    expect(base.hearts).toBe(3);
    Object.assign(s.upgrades, { stealth: 2, hull: 1, kg: 2, baitTime: 2 });
    const st = computeStats(s);
    expect(st.stealth).toBeCloseTo(1.2);
    expect(st.hearts).toBe(4);
    expect(st.kgMult).toBeCloseTo(1.2);
    expect(st.baitMult).toBeCloseTo(1.5);
  });

  it('speed, recovery, opening, strength, density, luck, lateral all change numbers', () => {
    const base = computeStats(defaultSave());
    const s = defaultSave();
    Object.assign(s.upgrades, { strikeSpeed: 3, recovery: 3, opening: 2, strength: 2, density: 2, luck: 3, lateral: 2, multi: 1 });
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
    s.upgrades.strikeSpeed2 = 99;
    expect(computeStats(s).strikeMs).toBeGreaterThanOrEqual(CONFIG.claw.minStrikeMs);
    const l = (n: number) => { const t = defaultSave(); t.upgrades.luck2 = n; return computeStats(t).luck; };
    expect(l(2) - l(1)).toBeLessThan(l(1) - l(0));
    expect(l(4)).toBeLessThan(1);
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

describe('capture progression across the full tree', () => {
  it('can reach each guardian using only strength nodes unlocked before it', () => {
    const s = defaultSave();
    for (const boss of BOSSES) {
      for (const u of treeNodes('main')) {
        if (u.stat === 'strength' && (!u.requiresBoss || s.bosses.includes(u.requiresBoss))) {
          s.upgrades[u.id] = u.maxLevel;
        }
      }
      expect(computeStats(s).strength, boss.id).toBeGreaterThanOrEqual(boss.strength);
      s.bosses.push(boss.id);
    }
  });

  it('a fully invested main tree can hold every species and variant with any claw, without prestige', () => {
    const s = defaultSave();
    for (const u of treeNodes('main')) s.upgrades[u.id] = u.maxLevel;
    for (const claw of Object.values(CLAWS_BY_ID)) {
      s.equippedClaw = claw.id;
      for (const species of SPECIES) {
        for (const variant of Object.keys(VARIANTS) as VariantId[]) {
          expect(computeStats(s).strength, claw.id + '/' + species.id + '/' + variant)
            .toBeGreaterThanOrEqual(strengthRequired(species, variant));
        }
      }
    }
  });

  it('every speed and recovery purchase improves actual timings for every claw', () => {
    for (const claw of Object.values(CLAWS_BY_ID)) {
      for (const stat of ['strikeSpeed', 'recovery'] as const) {
        const s = defaultSave();
        s.equippedClaw = claw.id;
        for (const u of treeNodes('main').filter((u) => u.stat === stat)) {
          for (let l = 1; l <= u.maxLevel; l++) {
            const before = computeStats(s);
            s.upgrades[u.id] = l;
            const after = computeStats(s);
            if (stat === 'strikeSpeed') {
              expect(after.strikeMs).toBeLessThan(before.strikeMs);
              expect(after.retractMs).toBeLessThan(before.retractMs);
            } else expect(after.cooldownMs).toBeLessThan(before.cooldownMs);
          }
        }
      }
    }
  });

  it('recalculates existing saves without losing progress or requiring a reset', () => {
    const s = defaultSave();
    Object.assign(s.upgrades, { strength: 3, strength2: 3, strength3: 5, strength4: 5 });
    s.coins = 12345;
    const loaded = sanitizeSave(JSON.parse(JSON.stringify(s)));
    expect(loaded).toEqual(s);
    expect(computeStats(loaded).strength).toBeCloseTo(14.4);
    expect(computeStats(loaded).strength).toBeGreaterThanOrEqual(strengthRequired(
      SPECIES.find((sp) => sp.id === 'lanternLeviathan')!, 'giant',
    ));
  });
});

it('each strength purchase raises power and never removes an already capturable variant', () => {
  for (const claw of Object.values(CLAWS_BY_ID)) {
    const s = defaultSave();
    s.equippedClaw = claw.id;
    let previous = computeStats(s).strength;
    for (const u of treeNodes('main').filter(u => u.stat === 'strength')) {
      for (let l = 1; l <= u.maxLevel; l++) {
        s.upgrades[u.id] = l;
        const current = computeStats(s).strength;
        expect(current).toBeGreaterThan(previous);
        const requirements = SPECIES.flatMap(sp => Object.keys(VARIANTS).map(v =>
          strengthRequired(sp, v as VariantId)));
        expect(requirements.filter(req => req <= current).length)
          .toBeGreaterThanOrEqual(requirements.filter(req => req <= previous).length);
        previous = current;
      }
    }
  }
});
