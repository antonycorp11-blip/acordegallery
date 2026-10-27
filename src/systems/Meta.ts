// Long-term systems: aquarium (passive income + collections), daily gift and prestige.

import { CONFIG } from '../config';
import type { SaveData } from '../core/Save';
import { SPECIES, isCreature, type SpeciesDefinition } from '../entities/Species';
import { BIOMES } from '../world/Biomes';
import { statLevel } from './Upgrades';

// ───────────────────────── aquarium

/** Biome a species "belongs to" for collection sets (null for event-only species). */
export function homeBiome(def: SpeciesDefinition): number | null {
  if (!isCreature(def)) return null;
  let best = -1;
  let bi = -1;
  def.biomeWeights.forEach((w, i) => {
    if (w > best) { best = w; bi = i; }
  });
  return best > 0 ? bi : null;
}

export interface CollectionSet {
  biome: number;
  name: string;
  species: SpeciesDefinition[];
  found: number;
  complete: boolean;
}

export function collectionSets(save: SaveData): CollectionSet[] {
  return BIOMES.map((b, i) => {
    const species = SPECIES.filter((s) => homeBiome(s) === i);
    const found = species.filter((s) => (save.species[s.id]?.caught ?? 0) > 0).length;
    return { biome: i, name: b.name, species, found, complete: species.length > 0 && found === species.length };
  });
}

/** +10% capture value per completed biome collection. */
export function collectionBonus(save: SaveData): number {
  return collectionSets(save).filter((s) => s.complete).length * 0.1;
}

export const AQUARIUM_MAX_LEVEL = 8;
export const aquariumUpgradeStars = (level: number) => 2 + level * 2;

export function aquariumIncomePerMinute(save: SaveData): number {
  const a = CONFIG.aquarium;
  let sum = 0;
  for (const s of SPECIES) {
    const caught = save.species[s.id]?.caught ?? 0;
    if (!caught || !isCreature(s)) continue;
    sum += s.baseValue * a.perMinute * (1 + Math.min(caught, 25) / 25);
  }
  return sum * (1 + a.levelMult * save.aquarium.level) * (1 + 0.5 * statLevel(save, 'aquarium'));
}

export function aquariumCapMinutes(save: SaveData): number {
  return CONFIG.aquarium.capHours * 60 * (1 + 0.25 * save.aquarium.level);
}

export function aquariumPending(save: SaveData, now: number): number {
  if (!save.aquarium.last) return 0;
  const minutes = Math.min(Math.max(0, (now - save.aquarium.last) / 60000), aquariumCapMinutes(save));
  return Math.floor(aquariumIncomePerMinute(save) * minutes);
}

/** Starts the clock once the first species is in the tank. */
export function aquariumTouch(save: SaveData, now: number): void {
  if (!save.aquarium.last && aquariumIncomePerMinute(save) > 0) save.aquarium.last = now;
}

export function aquariumCollect(save: SaveData, now: number): number {
  const amount = aquariumPending(save, now);
  if (amount > 0) {
    save.coins += amount;
    save.totalEarned += amount;
    save.earnedThisLife += amount;
  }
  save.aquarium.last = now;
  return amount;
}

export function aquariumUpgrade(save: SaveData): boolean {
  const cost = aquariumUpgradeStars(save.aquarium.level);
  if (save.aquarium.level >= AQUARIUM_MAX_LEVEL || save.stars < cost) return false;
  save.stars -= cost;
  save.aquarium.level++;
  return true;
}

// ───────────────────────── daily gift

const HOUR = 3600 * 1000;
const DAILY_STARS = [1, 1, 2, 1, 2, 2, 4];

export function dailyAvailable(save: SaveData, now: number): boolean {
  return now - save.daily.last >= 20 * HOUR;
}

export function dailyPreview(save: SaveData, now: number): { streak: number; coins: number; stars: number; baits: Record<string, number> } {
  const keep = save.daily.last > 0 && now - save.daily.last <= 48 * HOUR;
  const streak = keep ? Math.min(7, save.daily.streak + 1) : 1;
  const coins = Math.round(((80 + 40 * streak) * (1 + save.bestDepth / 400)) / 5) * 5;
  const baits: Record<string, number> = { algae: 2, shrimp: 1 };
  if (streak >= 4) baits.squid = 1;
  if (streak >= 7) baits.golden = 1;
  return { streak, coins, stars: DAILY_STARS[streak - 1], baits };
}

export function claimDaily(save: SaveData, now: number): { streak: number; coins: number; stars: number; baits: Record<string, number> } | null {
  if (!dailyAvailable(save, now)) return null;
  const p = dailyPreview(save, now);
  save.coins += p.coins;
  save.totalEarned += p.coins;
  save.earnedThisLife += p.coins;
  save.stars += p.stars;
  for (const [k, v] of Object.entries(p.baits)) save.baits[k] = (save.baits[k] ?? 0) + v;
  save.daily = { last: now, streak: p.streak };
  return p;
}

// ───────────────────────── prestige

export const PRESTIGE_BOSSES = 2;

export function canPrestige(save: SaveData): boolean {
  return save.bosses.length >= PRESTIGE_BOSSES && essenceGain(save) >= 1;
}

export function essenceGain(save: SaveData): number {
  return Math.floor(Math.sqrt(save.earnedThisLife / 500));
}

/** Resets the run economy for Essência Abissal. Returns essence gained. */
export function doPrestige(save: SaveData): number {
  if (!canPrestige(save)) return 0;
  const gain = essenceGain(save);
  const keepRoutes = statLevel(save, 'keepRoutes') > 0;
  save.essence += gain;
  save.prestiges++;
  save.coins = 0;
  save.earnedThisLife = 0;
  for (const k of Object.keys(save.upgrades)) if (!k.startsWith('e_')) delete save.upgrades[k];
  save.ownedClaws = ['scrap'];
  save.equippedClaw = 'scrap';
  save.quota = { day: save.quota.day, tier: 0, deliveredKg: 0, divesLeft: 3, license: 0, failed: save.quota.failed };
  if (!keepRoutes) {
    save.bosses = [];
    save.bossDamage = {};
    save.checkpoint = 0;
  }
  return gain;
}
