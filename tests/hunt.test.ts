import { describe, expect, it } from 'vitest';
import { Struggle } from '../src/systems/Struggle';
import { defaultSave, sanitizeSave } from '../src/core/Save';
import { CONFIG, VIEW_W } from '../src/config';
import { Creature } from '../src/entities/Creature';
import { SPECIES, SPECIES_BY_ID, VARIANTS } from '../src/entities/Species';
import { timeBonusFor } from '../src/systems/Economy';
import { computeStats, treeNodes, canBuy } from '../src/systems/Upgrades';
import { applyOrderEvent, claimOrder } from '../src/systems/Orders';
import { Terrain } from '../src/world/Terrain';
import { SpawnDirector } from '../src/world/SpawnDirector';

describe('timed trophy struggle', () => {
  it('rewards timing and completes before its deadline', () => {
    const f = new Struggle(2, 1);
    for(let i=0;i<8*120 && !f.resolved;i++) {
      f.update(1/120);
      if(f.inWindow) f.tap();
    }
    expect(f.resolved).toBe('caught');
    expect(f.elapsed).toBeLessThan(9);
  });
  it('blind tapping can break the line; ignoring it times out', () => {
    const f = new Struggle(0, 1);
    for(let i=0;i<9*120 && !f.resolved;i++) {
      f.update(1/120);
      if(!f.inWindow) f.tap();
    }
    expect(f.resolved).toBe('escaped');
    const idle = new Struggle(5, 0);
    idle.update(9);
    expect(idle.resolved).toBe('escaped');
  });
  it('does not grant progress for duplicate inputs in the same frame', () => {
    const f = new Struggle(5,1);
    f.tap();
    for(let i=0;i<20;i++) f.tap();
    expect(f.progress).toBe(1);
  });
});

describe('short expeditions and meaningful growth', () => {
  it('never awards time for any species or variant', () => {
    const s = defaultSave();
    for(const u of treeNodes('main')) s.upgrades[u.id]=u.maxLevel;
    for(const u of treeNodes('essence')) s.upgrades[u.id]=u.maxLevel;
    const stats = computeStats(s);
    expect(stats.runSeconds).toBe(CONFIG.run.maxSeconds);
    for(const sp of SPECIES) for(const variant of Object.values(VARIANTS)) {
      expect(timeBonusFor(sp,variant.id,stats,0)).toBe(0);
    }
  });
  it('max swimming exceeds five times starting speed and old saves keep levels', () => {
    const s = defaultSave();
    const start = computeStats(s).lateralSpeed;
    for(const u of treeNodes('main')) s.upgrades[u.id]=u.maxLevel;
    for(const u of treeNodes('essence')) s.upgrades[u.id]=u.maxLevel;
    expect(computeStats(s).lateralSpeed).toBeGreaterThan(start*5);
    const loaded = sanitizeSave(JSON.parse(JSON.stringify(s)));
    expect(loaded.upgrades).toEqual(s.upgrades);
    expect(computeStats(loaded).lateralSpeed).toBe(computeStats(s).lateralSpeed);
    s.upgrades.dual=0;
    expect(canBuy(s,'dual')).toBe('locked');
    s.prestiges=1;
    s.upgrades.dual=0;
    s.coins=1e9;
    expect(canBuy(s,'dual')).toBe('ok');
  });
});

describe('predator preparation and collection orders', () => {
  it('meals grow the predator, increase the reward and cap at eight', () => {
    const c = new Creature(SPECIES_BY_ID.tigerShark,'normal',100,100,1);
    const originalW=c.w, originalStrength=c.captureRequirement;
    for(let i=0;i<20;i++) c.feed();
    expect(c.meals).toBe(8);
    expect(c.w).toBeGreaterThan(originalW*1.8);
    expect(c.trophyMult).toBe(5);
    expect(c.captureRequirement).toBeGreaterThan(originalStrength);
    c.weakened=2;
    expect(c.captureRequirement).toBeCloseTo(originalStrength*1.64*0.65);
  });
  it('feeding mission pays once after capturing a predator with three meals', () => {
    const s=defaultSave();
    s.orders=[{id:99,kind:'fedShark',key:'',target:1,progress:0,coins:500,stars:2}];
    applyOrderEvent(s,{type:'capture',speciesId:'reefShark',rarity:'rare',variant:'normal',meals:2});
    expect(s.orders[0].progress).toBe(0);
    applyOrderEvent(s,{type:'capture',speciesId:'reefShark',rarity:'rare',variant:'normal',meals:3});
    expect(claimOrder(s,99)).toBe(true);
    expect(claimOrder(s,99)).toBe(false);
    expect(s.coins).toBe(500);
  });
});

describe('populated ocean corridors', () => {
  it('keeps every visible lane populated across all biomes, fast travel, turns and revisits', () => {
    for(const density of [1,3.4,50]) for(const seed of [1,42,812]) {
      const sd=new SpawnDirector(new Terrain(seed),{density,luck:0.5,schoolBonus:4,variantMult:2},seed);
      const points=[];
      for(let x=0;x<=66000;x+=350) points.push(x);
      points.push(...points.slice().reverse());
      for(const x of points) {
        sd.update(1/30,x,x+VIEW_W/2,x<33000?1:-1);
        for(let lane=x;lane<x+VIEW_W;lane+=120) {
          expect(sd.creatures.some(c=>c.hittable && !c.def.special.includes('object') && c.x>=lane && c.x<Math.min(lane+120,x+VIEW_W)),
            `density=${density} seed=${seed} lane=${lane}`).toBe(true);
        }
        expect(sd.alive).toBeLessThanOrEqual(CONFIG.spawn.maxAlive);
      }
    }
  });
  it('repopulates after captures and hidden animals cannot consume the visible wildlife budget', () => {
    const sd=new SpawnDirector(new Terrain(23),{density:1,luck:0,schoolBonus:0,variantMult:1},23);
    sd.update(0.1,20000,-999,1);
    for(const c of sd.creatures) c.capture();
    sd.update(0.1,20000,-999,0);
    expect(sd.creatures.filter(c=>c.hittable).length).toBeGreaterThanOrEqual(8);
  });
});
