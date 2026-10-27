// Cota diária (inspired by Coal LLC): the Cooperativa Abissal demands a weight
// of catch per "day" of 3 dives. Meet it for pay and license level; miss it
// and you are fined, lose a license level and the quota repeats.

import { CONFIG } from '../config';
import type { QuotaState, SaveData } from '../core/Save';
import { VARIANTS, isCreature, type SpeciesDefinition, type VariantId } from '../entities/Species';

export const DIVES_PER_DAY = 3;

export function defaultQuota(): QuotaState {
  return { day: 1, tier: 0, deliveredKg: 0, divesLeft: DIVES_PER_DAY, license: 0, failed: 0 };
}

/** Weight of a catch in kg (objects weigh nothing for the quota). */
export function catchKg(def: SpeciesDefinition, variant: VariantId): number {
  if (!isCreature(def)) return 0;
  const s = VARIANTS[variant].scale;
  return Math.round(((def.size.w * def.size.h) / 30) * s * s * 10) / 10;
}

export function quotaTarget(tier: number): number {
  return Math.round(CONFIG.quota.baseKg * Math.pow(CONFIG.quota.growth, tier));
}

export function quotaReward(q: QuotaState): { coins: number; stars: number } {
  const target = quotaTarget(q.tier);
  return { coins: Math.round(target * CONFIG.quota.coinsPerKg * (1 + 0.1 * q.license)), stars: 1 + (q.tier % 3 === 2 ? 1 : 0) };
}

/** Capture value bonus from the license. */
export const licenseBonus = (license: number) => license * CONFIG.quota.licenseValue;

export type QuotaOutcome =
  | { kind: 'met'; coins: number; stars: number; overKg: number; bonusCoins: number }
  | { kind: 'pending'; missingKg: number; divesLeft: number }
  | { kind: 'failed'; fine: number; missingKg: number };

/** Delivers a dive's catch. Mutates the save (coins, stars, quota). */
export function deliverDive(save: SaveData, kg: number): QuotaOutcome {
  const q = save.quota;
  const target = quotaTarget(q.tier);
  q.deliveredKg = Math.round((q.deliveredKg + kg) * 10) / 10;
  if (q.deliveredKg >= target) {
    const r = quotaReward(q);
    const overKg = Math.round((q.deliveredKg - target) * 10) / 10;
    const bonusCoins = Math.round(overKg * CONFIG.quota.coinsPerKg * 0.5);
    save.coins += r.coins + bonusCoins;
    save.totalEarned += r.coins + bonusCoins;
    save.earnedThisLife += r.coins + bonusCoins;
    save.stars += r.stars;
    q.tier++;
    q.license++;
    q.day++;
    q.deliveredKg = 0;
    q.divesLeft = DIVES_PER_DAY;
    return { kind: 'met', coins: r.coins, stars: r.stars, overKg, bonusCoins };
  }
  q.divesLeft--;
  if (q.divesLeft > 0) return { kind: 'pending', missingKg: Math.round((target - q.deliveredKg) * 10) / 10, divesLeft: q.divesLeft };
  const missingKg = Math.round((target - q.deliveredKg) * 10) / 10;
  const fine = Math.round(save.coins * CONFIG.quota.fine);
  save.coins -= fine;
  q.license = Math.max(0, q.license - 1);
  q.failed++;
  q.day++;
  q.deliveredKg = 0;
  q.divesLeft = DIVES_PER_DAY;
  return { kind: 'failed', fine, missingKg };
}
