import { CONFIG } from '../config';
import { VARIANTS, type SpeciesDefinition, type VariantId } from '../entities/Species';
import type { RunStats } from './Upgrades';
import type { SaveData } from '../core/Save';

export function depthValueMult(depthMeters: number): number {
  return 1 + Math.sqrt(Math.max(0, depthMeters)) / CONFIG.economy.depthDivisor;
}

export function captureValue(
  def: SpeciesDefinition,
  variant: VariantId,
  depthMeters: number,
  comboBonus: number,
  perfectBonus: number,
): number {
  const v = def.baseValue * VARIANTS[variant].valueMult * depthValueMult(depthMeters) * (1 + comboBonus + perfectBonus);
  return Math.max(1, Math.round(v));
}

/** Seconds added to the clock by this capture (0 if none). */
export function timeBonusFor(def: SpeciesDefinition, variant: VariantId, stats: RunStats, roll: number): number {
  const tb = CONFIG.timeBonus;
  let s = 0;
  if (def.rarity === 'legendary' || def.rarity === 'anomalous') s = tb.legendary;
  else if (def.special.includes('timeBonus') && roll < 0.45) s = tb.goldenCrab;
  else if (variant === 'golden') s = tb.golden;
  if (s > 0) return s + stats.timeBonusExtra;
  if (def.rarity !== 'common' && def.rarity !== 'uncommon') return stats.rareTimeBonus;
  return 0;
}

export class ComboTracker {
  count = 0;
  private lastAt = -Infinity;

  constructor(private stats: Pick<RunStats, 'comboStep' | 'comboMax' | 'comboWindowMs'>) {}

  /** Call on each successful capture; returns the bonus to apply to it. */
  hit(nowMs: number): number {
    this.count = nowMs - this.lastAt <= this.stats.comboWindowMs ? this.count + 1 : 1;
    this.lastAt = nowMs;
    return this.bonus();
  }

  miss(): void {
    this.count = 0;
    this.lastAt = -Infinity;
  }

  bonus(): number {
    return Math.min(this.stats.comboMax, Math.max(0, this.count - 1) * this.stats.comboStep);
  }

  expired(nowMs: number): boolean {
    return this.count > 0 && nowMs - this.lastAt > this.stats.comboWindowMs;
  }
}

/** Registers a capture in the collection. Returns true if species is new. */
export function recordCapture(save: SaveData, speciesId: string, variant: VariantId): boolean {
  let rec = save.species[speciesId];
  const isNew = !rec || rec.caught === 0;
  if (!rec) rec = save.species[speciesId] = { caught: 0, variants: [] };
  rec.caught++;
  if (!rec.variants.includes(variant)) rec.variants.push(variant);
  return isNew;
}

export function formatCoins(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}
