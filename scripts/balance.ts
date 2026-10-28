// Pacing simulation: a greedy player dives, earns, and buys upgrades.
// Run with: npx vite-node scripts/balance.ts
// Rough model, not a replay of the real game: it estimates how many dives
// (and minutes) each guardian takes, so the cost tables can be tuned.

import { CONFIG } from '../src/config';
import { defaultSave } from '../src/core/Save';
import { BOSSES } from '../src/entities/Boss';
import { SPECIES, VARIANTS, type VariantId } from '../src/entities/Species';
import { captureValue } from '../src/systems/Economy';
import { canBuy, buyUpgrade, computeStats, level, treeNodes, upgradeCost } from '../src/systems/Upgrades';
import { speciesWeights } from '../src/world/SpawnDirector';
import { BIOMES } from '../src/world/Biomes';
import { DEPTH_KEYS } from '../src/world/Depth';

const HIT_RATE = 0.35; // share of player strikes that catch something (misses, travel, aiming)
const AUTO_HIT = 0.45;
const MENU_SECONDS = 25; // time spent in the base between dives

/** Average value of a capture at a depth, for this save. */
function avgValue(depth: number, biome: number, luck: number, mult: number, strength: number): number {
  const w = speciesWeights(depth, biome, luck);
  let sum = 0, tw = 0;
  SPECIES.forEach((sp, i) => {
    if (!w[i] || sp.special.includes('event')) return;
    const variants: [VariantId, number][] = [['normal', 0.85], ['giant', 0.05], ['silver', 0.035], ['golden', 0.018], ['mini', 0.05]];
    for (const [v, p] of variants) {
      const req = (sp.mass + sp.armor) * VARIANTS[v].strengthMult;
      if (req > strength) continue;
      sum += w[i] * p * captureValue(sp, v, depth, 0.15, 0, mult);
      tw += w[i] * p;
    }
  });
  return tw ? sum / tw : 0;
}

/** Where the player farms: the deepest biome both unlocked by guardians and reached by the cable. */
function farmDepth(cable: number, bossesBeaten: number): { depth: number; biome: number } {
  const depthOf = (x: number) => {
    for (let i = 1; i < DEPTH_KEYS.length; i++) {
      const a = DEPTH_KEYS[i - 1], b = DEPTH_KEYS[i];
      if (x <= b.x) return a.m + ((x - a.x) / (b.x - a.x)) * (b.m - a.m);
    }
    return DEPTH_KEYS[DEPTH_KEYS.length - 1].m;
  };
  let biome = 0;
  for (let i = 1; i < BIOMES.length; i++) if (i <= bossesBeaten && depthOf(BIOMES[i].startX) <= cable) biome = i;
  const endX = biome + 1 < BIOMES.length ? BIOMES[biome + 1].startX : DEPTH_KEYS[DEPTH_KEYS.length - 1].x;
  return { depth: Math.min(cable, depthOf(endX)), biome };
}

const save = defaultSave();
let minutes = 0;
let dives = 0;
const rows: string[] = [];
let rage = 0;
let bossIdx = 0;
while (bossIdx < BOSSES.length && dives < 3000) {
  const st = computeStats(save);
  const { depth, biome } = farmDepth(st.cable, bossIdx);
  const cycle = (CONFIG.claw.anticipationMs + st.strikeMs + st.retractMs + st.cooldownMs + CONFIG.claw.closeMs) / 1000;
  const density = Math.min(1.6, 0.6 + st.density * 0.25); // more fish = fewer whiffs, capped
  const playerCaps = (st.runSeconds / (cycle + 0.35)) * HIT_RATE * density * Math.min(st.maxTargets, 1.4);
  const autoCaps = st.autoClaws * (st.runSeconds / (st.autoCooldown + 0.4)) * AUTO_HIT * density;
  const caps = playerCaps + autoCaps;
  const value = avgValue(depth, biome, st.luck, st.valueMult * (1 + 1 / st.runSeconds * CONFIG.run.finalTideSeconds), st.strength);
  save.coins += Math.round(caps * value);
  dives++;
  minutes += (st.runSeconds + MENU_SECONDS) / 60;
  const boss = BOSSES[bossIdx];
  if (biome >= Math.min(4, bossIdx)) rage += caps;
  // the guardian fight happens once it is awake and the claw is strong enough
  if (rage >= boss.rage && st.strength >= boss.strength) {
    rows.push(`| ${boss.name} | ${dives} | ${Math.round(minutes)} | ${st.cable.toLocaleString('pt-BR')} m | ${st.strength.toFixed(1)} | ${st.runSeconds}s | ${st.autoClaws} | ${Math.round(caps)} |`);
    save.bosses.push(boss.id);
    bossIdx++;
    rage = 0;
  }
  // greedy shopping: strength/cable first when they block, then the cheapest node
  for (let guard = 0; guard < 200; guard++) {
    const open = treeNodes('main').filter((u) => canBuy(save, u.id) === 'ok');
    if (!open.length) break;
    const need = (u: (typeof open)[number]) => (u.stat === 'strength' && st.strength < boss.strength) || u.stat === 'cable' ? 0.4 : 1;
    open.sort((a, b) => upgradeCost(a, level(save, a.id)) * need(a) - upgradeCost(b, level(save, b.id)) * need(b));
    buyUpgrade(save, open[0].id);
  }
}
console.log('| Guardião | Mergulhos | Minutos | Cabo | Força | Tempo | Garras auto | Capturas/mergulho |');
console.log('|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(r);
