import { describe, expect, it } from 'vitest';
import { defaultSave, sanitizeSave } from '../src/core/Save';
import { BOSSES, Boss, CHECKPOINTS, checkpointUnlocked, nextBoss } from '../src/entities/Boss';
import {
  aquariumCollect, aquariumIncomePerMinute, aquariumPending, aquariumTouch, aquariumUpgrade, canPrestige, claimDaily,
  collectionBonus, collectionSets, dailyAvailable, doPrestige, essenceGain,
} from '../src/systems/Meta';
import { applyOrderEvent, claimOrder, ensureOrders, isComplete, orderText } from '../src/systems/Orders';
import { computeStats } from '../src/systems/Upgrades';

const HOUR = 3600 * 1000;

describe('orders', () => {
  it('always keeps three, deterministic and readable', () => {
    const a = defaultSave();
    const b = defaultSave();
    ensureOrders(a);
    ensureOrders(b);
    expect(a.orders).toHaveLength(3);
    expect(a.orders).toEqual(b.orders);
    for (const o of a.orders) expect(orderText(o).length).toBeGreaterThan(5);
  });

  it('progress from captures completes and pays once', () => {
    const s = defaultSave();
    s.orders = [{ id: 1, kind: 'catchSpecies', key: 'star', target: 2, progress: 0, coins: 100, stars: 1 }];
    s.orderSerial = 1;
    expect(applyOrderEvent(s, { type: 'capture', speciesId: 'coralCrab', rarity: 'common', variant: 'normal' })).toHaveLength(0);
    applyOrderEvent(s, { type: 'capture', speciesId: 'star', rarity: 'common', variant: 'normal' });
    const done = applyOrderEvent(s, { type: 'capture', speciesId: 'star', rarity: 'common', variant: 'normal' });
    expect(done).toHaveLength(1);
    expect(isComplete(s.orders[0])).toBe(true);
    // further events don't re-complete
    expect(applyOrderEvent(s, { type: 'capture', speciesId: 'star', rarity: 'common', variant: 'normal' })).toHaveLength(0);
    expect(claimOrder(s, 1)).toBe(true);
    expect(s.coins).toBe(100);
    expect(s.stars).toBe(1);
    expect(s.orders).toHaveLength(3);
    expect(claimOrder(s, 1)).toBe(false);
  });

  it('single-run goals keep the best run, depth keeps the max', () => {
    const s = defaultSave();
    s.orders = [
      { id: 1, kind: 'runCaptures', key: '', target: 8, progress: 0, coins: 1, stars: 1 },
      { id: 2, kind: 'reachDepth', key: '', target: 100, progress: 0, coins: 1, stars: 1 },
    ];
    applyOrderEvent(s, { type: 'run', captures: 5, coins: 10 });
    applyOrderEvent(s, { type: 'run', captures: 3, coins: 10 });
    expect(s.orders[0].progress).toBe(5);
    applyOrderEvent(s, { type: 'depth', meters: 120 });
    expect(isComplete(s.orders[1])).toBe(true);
  });

  it('orders survive save/load', () => {
    const s = defaultSave();
    ensureOrders(s);
    expect(sanitizeSave(JSON.parse(JSON.stringify(s))).orders).toEqual(s.orders);
  });
});

describe('aquarium', () => {
  it('earns per minute from discovered species, capped offline', () => {
    const s = defaultSave();
    expect(aquariumIncomePerMinute(s)).toBe(0);
    s.species.star = { caught: 3, variants: ['normal'] };
    s.species.coralCrab = { caught: 1, variants: ['normal'] };
    aquariumTouch(s, 1000);
    expect(s.aquarium.last).toBe(1000);
    const perMin = aquariumIncomePerMinute(s);
    expect(perMin).toBeGreaterThan(0);
    expect(aquariumPending(s, 1000 + 10 * 60000)).toBe(Math.floor(perMin * 10));
    expect(aquariumPending(s, 1000 + 100 * HOUR)).toBe(Math.floor(perMin * 8 * 60));
    const got = aquariumCollect(s, 1000 + 10 * 60000);
    expect(s.coins).toBe(got);
    expect(aquariumPending(s, 1000 + 10 * 60000)).toBe(0);
  });

  it('upgrades cost stars and raise income', () => {
    const s = defaultSave();
    s.species.star = { caught: 1, variants: ['normal'] };
    const before = aquariumIncomePerMinute(s);
    expect(aquariumUpgrade(s)).toBe(false);
    s.stars = 10;
    expect(aquariumUpgrade(s)).toBe(true);
    expect(aquariumIncomePerMinute(s)).toBeGreaterThan(before);
  });

  it('completing a biome collection boosts capture value', () => {
    const s = defaultSave();
    expect(collectionBonus(s)).toBe(0);
    const reef = collectionSets(s)[0];
    expect(reef.species.length).toBeGreaterThan(2);
    for (const sp of reef.species) s.species[sp.id] = { caught: 1, variants: ['normal'] };
    expect(collectionBonus(s)).toBeCloseTo(0.1);
  });
});

describe('daily gift', () => {
  it('once every ~day, streak grows and resets after a gap', () => {
    const s = defaultSave();
    const t0 = 1_000_000_000_000;
    expect(claimDaily(s, t0)?.streak).toBe(1);
    expect(claimDaily(s, t0 + HOUR)).toBeNull();
    expect(dailyAvailable(s, t0 + 21 * HOUR)).toBe(true);
    expect(claimDaily(s, t0 + 21 * HOUR)?.streak).toBe(2);
    expect(claimDaily(s, t0 + 21 * HOUR + 72 * HOUR)?.streak).toBe(1);
    expect(s.stars).toBeGreaterThan(0);
  });
});

describe('prestige', () => {
  it('needs two guardians and enough earnings; keeps collection and essence tree', () => {
    const s = defaultSave();
    s.earnedThisLife = 20000;
    expect(canPrestige(s)).toBe(false);
    s.bosses = ['kingCrab', 'colossalEel'];
    expect(essenceGain(s)).toBe(6);
    s.coins = 999;
    s.upgrades = { core: 1, strength: 2, e_core: 1 };
    s.ownedClaws = ['scrap', 'hydraulic'];
    s.equippedClaw = 'hydraulic';
    s.species.star = { caught: 4, variants: ['normal'] };
    s.stars = 7;
    expect(doPrestige(s)).toBe(6);
    expect(s.essence).toBe(6);
    expect(s.coins).toBe(0);
    expect(s.upgrades).toEqual({ e_core: 1 });
    expect(s.ownedClaws).toEqual(['scrap']);
    expect(s.bosses).toEqual([]);
    expect(s.species.star.caught).toBe(4);
    expect(s.stars).toBe(7);
  });

  it('Memória de Rota keeps guardians and checkpoints', () => {
    const s = defaultSave();
    s.earnedThisLife = 5000;
    s.bosses = ['kingCrab', 'colossalEel'];
    s.upgrades = { e_routes: 1 };
    s.checkpoint = 2;
    doPrestige(s);
    expect(s.bosses).toHaveLength(2);
    expect(s.checkpoint).toBe(2);
  });
});

describe('guardians', () => {
  it('are fought in order and unlock checkpoints', () => {
    expect(nextBoss([])!.id).toBe('kingCrab');
    expect(nextBoss(['kingCrab'])!.id).toBe('colossalEel');
    expect(nextBoss(BOSSES.map((b) => b.id))).toBeNull();
    expect(checkpointUnlocked([], 0)).toBe(true);
    // mid-biome buoy: unlocked by reaching it
    expect(checkpointUnlocked([], 1, 0)).toBe(false);
    expect(checkpointUnlocked([], 1, 3000)).toBe(true);
    // next biome: needs the guardian
    expect(checkpointUnlocked([], 2, 99999)).toBe(false);
    expect(checkpointUnlocked(['kingCrab'], 2)).toBe(true);
    for (const c of CHECKPOINTS) if (c.requires) expect(c.x).toBeGreaterThan(BOSSES.find((b) => b.id === c.requires)!.x);
    // biomes are long: the first guardian is far from the start
    expect(BOSSES[0].x).toBeGreaterThan(5000);
  });

  it('only the exposed weak point counts; the body is armored', () => {
    const b = new Boss(BOSSES[0], 0);
    b.update(0.01, () => 300);
    expect(b.open).toBe(true);
    const p = b.weakPointPos(b.activeWeak);
    expect(b.hitTest(p.x, p.y, 9)).toBe('weak');
    expect(b.hitTest(b.x, b.y + b.def.h * 0.3, 9)).toBe('body');
    expect(b.hitTest(b.x + 500, b.y, 9)).toBeNull();
    // a dive straight down the weak point's column reaches it before the body
    expect(b.pathHit(p.x, 0, 400, 9)?.kind).toBe('weak');
    // even the weak point in the middle of the shell is reachable from above
    const mid = new Boss(BOSSES[0], 2);
    mid.update(0.01, () => 300);
    const mp = mid.weakPointPos(mid.activeWeak);
    expect(mid.pathHit(mp.x, 0, 400, 9)?.kind).toBe('weak');
    expect(mid.pathHit(mid.x, 0, 400, 9)?.kind).toBe('body');
  });

  it('closes after a hit, persists damage and is defeated after all weak points', () => {
    const b = new Boss(BOSSES[0], BOSSES[0].weakPoints.length * BOSSES[0].hits - 1);
    expect(b.hp).toBe(1);
    expect(b.hitWeak()).toBe(true);
    expect(b.defeated).toBe(true);
    expect(b.hitTest(b.x, b.y, 9)).toBeNull();
  });

  it('each weak point needs several grabs', () => {
    const b = new Boss(BOSSES[0], 0);
    expect(b.activeWeak).toBe(0);
    b.hitWeak();
    expect(b.activeWeak).toBe(0);
    b.hitWeak();
    expect(b.activeWeak).toBe(1);
  });

  it('the first guardian needs some Força upgrades', () => {
    const s = defaultSave();
    expect(computeStats(s).strength).toBeLessThan(BOSSES[0].strength);
    s.upgrades = { core: 1, strikeSpeed: 1, strength: 2 };
    expect(computeStats(s).strength).toBeGreaterThanOrEqual(BOSSES[0].strength);
  });
});
