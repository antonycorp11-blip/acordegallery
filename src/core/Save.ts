import { BAITS_BY_ID } from '../entities/Baits';
import { CLAWS_BY_ID } from '../entities/ClawsCatalog';
import { SPECIES_BY_ID, VARIANTS, type VariantId } from '../entities/Species';

export const SAVE_KEY = 'abyssclaw.save';
export const SAVE_VERSION = 1;

export interface SpeciesRecord {
  caught: number;
  variants: VariantId[];
}

export type OrderKind = 'catchSpecies' | 'catchRarity' | 'catchVariant' | 'reachDepth' | 'runCaptures' | 'runCoins' | 'combo';

export interface OrderState {
  id: number;
  kind: OrderKind;
  /** species id or rarity, when relevant */
  key: string;
  target: number;
  progress: number;
  coins: number;
  stars: number;
}

export interface QuotaState {
  day: number;
  /** how many quotas were met (drives the target) */
  tier: number;
  deliveredKg: number;
  divesLeft: number;
  /** license level: +value per level, lost one per failed day */
  license: number;
  failed: number;
}

export interface SaveData {
  version: number;
  coins: number;
  /** earned by finishing orders, bosses and daily gifts */
  stars: number;
  /** prestige currency */
  essence: number;
  prestiges: number;
  /** coins earned since the last prestige (drives essence gain) */
  earnedThisLife: number;
  bosses: string[];
  /** weak points already destroyed per boss (persists between runs) */
  bossDamage: Record<string, number>;
  /** selected starting checkpoint (0 = beach) */
  checkpoint: number;
  orders: OrderState[];
  orderSerial: number;
  ordersDone: number;
  aquarium: { level: number; last: number };
  daily: { last: number; streak: number };
  quota: QuotaState;
  baits: Record<string, number>;
  selectedBait: string;
  totalEarned: number;
  upgrades: Record<string, number>;
  ownedClaws: string[];
  equippedClaw: string;
  bestDepth: number;
  bestDistance: number;
  totalCaptures: number;
  totalRuns: number;
  species: Record<string, SpeciesRecord>;
  settings: { muted: boolean; vibrate: boolean };
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    stars: 0,
    essence: 0,
    prestiges: 0,
    earnedThisLife: 0,
    bosses: [],
    bossDamage: {},
    checkpoint: 0,
    orders: [],
    orderSerial: 0,
    ordersDone: 0,
    aquarium: { level: 0, last: 0 },
    daily: { last: 0, streak: 0 },
    quota: { day: 1, tier: 0, deliveredKg: 0, divesLeft: 3, license: 0, failed: 0 },
    baits: { algae: 3, shrimp: 2 },
    selectedBait: 'algae',
    totalEarned: 0,
    upgrades: {},
    ownedClaws: ['scrap'],
    equippedClaw: 'scrap',
    bestDepth: 0,
    bestDistance: 0,
    totalCaptures: 0,
    totalRuns: 0,
    species: {},
    settings: { muted: false, vibrate: true },
  };
}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);

/** Accepts anything (possibly corrupt) and returns a valid SaveData. */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  d.coins = Math.floor(num(r.coins));
  d.totalEarned = Math.floor(num(r.totalEarned));
  d.stars = Math.floor(num(r.stars));
  d.essence = Math.floor(num(r.essence));
  d.prestiges = Math.floor(num(r.prestiges));
  d.earnedThisLife = Math.floor(num(r.earnedThisLife, d.totalEarned));
  d.checkpoint = Math.floor(num(r.checkpoint));
  d.orderSerial = Math.floor(num(r.orderSerial));
  d.ordersDone = Math.floor(num(r.ordersDone));
  if (Array.isArray(r.bosses)) d.bosses = [...new Set(r.bosses.filter((b): b is string => typeof b === 'string'))];
  if (r.bossDamage && typeof r.bossDamage === 'object') {
    for (const [k, v] of Object.entries(r.bossDamage as Record<string, unknown>)) if (num(v) > 0) d.bossDamage[k] = Math.floor(num(v));
  }
  if (Array.isArray(r.orders)) {
    const kinds: OrderKind[] = ['catchSpecies', 'catchRarity', 'catchVariant', 'reachDepth', 'runCaptures', 'runCoins', 'combo'];
    for (const o of r.orders) {
      if (!o || typeof o !== 'object') continue;
      const oo = o as Record<string, unknown>;
      if (!kinds.includes(oo.kind as OrderKind)) continue;
      d.orders.push({
        id: Math.floor(num(oo.id)), kind: oo.kind as OrderKind, key: typeof oo.key === 'string' ? oo.key : '',
        target: Math.max(1, Math.floor(num(oo.target, 1))), progress: num(oo.progress),
        coins: Math.floor(num(oo.coins)), stars: Math.floor(num(oo.stars)),
      });
    }
    d.orders = d.orders.slice(0, 3);
  }
  if (r.aquarium && typeof r.aquarium === 'object') {
    const a = r.aquarium as Record<string, unknown>;
    d.aquarium = { level: Math.floor(num(a.level)), last: num(a.last) };
  }
  if (r.quota && typeof r.quota === 'object') {
    const q = r.quota as Record<string, unknown>;
    d.quota = {
      day: Math.max(1, Math.floor(num(q.day, 1))), tier: Math.floor(num(q.tier)), deliveredKg: num(q.deliveredKg),
      divesLeft: Math.min(3, Math.max(1, Math.floor(num(q.divesLeft, 3)))), license: Math.floor(num(q.license)), failed: Math.floor(num(q.failed)),
    };
  }
  if (r.baits && typeof r.baits === 'object') {
    d.baits = {};
    for (const [k, v] of Object.entries(r.baits as Record<string, unknown>)) if (BAITS_BY_ID[k]) d.baits[k] = Math.floor(num(v));
  }
  if (typeof r.selectedBait === 'string' && BAITS_BY_ID[r.selectedBait]) d.selectedBait = r.selectedBait;
  if (r.daily && typeof r.daily === 'object') {
    const a = r.daily as Record<string, unknown>;
    d.daily = { last: num(a.last), streak: Math.floor(num(a.streak)) };
  }
  d.bestDepth = num(r.bestDepth);
  d.bestDistance = num(r.bestDistance);
  d.totalCaptures = Math.floor(num(r.totalCaptures));
  d.totalRuns = Math.floor(num(r.totalRuns));
  if (r.upgrades && typeof r.upgrades === 'object') {
    for (const [k, v] of Object.entries(r.upgrades as Record<string, unknown>)) {
      const lvl = Math.floor(num(v));
      if (lvl > 0) d.upgrades[k] = lvl;
    }
  }
  if (Array.isArray(r.ownedClaws)) {
    const owned = new Set<string>(['scrap']);
    for (const c of r.ownedClaws) if (typeof c === 'string' && CLAWS_BY_ID[c]) owned.add(c);
    d.ownedClaws = [...owned];
  }
  if (typeof r.equippedClaw === 'string' && d.ownedClaws.includes(r.equippedClaw)) d.equippedClaw = r.equippedClaw;
  if (r.species && typeof r.species === 'object') {
    for (const [id, rec] of Object.entries(r.species as Record<string, unknown>)) {
      if (!SPECIES_BY_ID[id] || !rec || typeof rec !== 'object') continue;
      const rr = rec as Record<string, unknown>;
      const variants = Array.isArray(rr.variants)
        ? (rr.variants.filter((v) => typeof v === 'string' && v in VARIANTS) as VariantId[])
        : [];
      d.species[id] = { caught: Math.floor(num(rr.caught)), variants: [...new Set(variants)] };
    }
  }
  if (r.settings && typeof r.settings === 'object') {
    d.settings.muted = (r.settings as Record<string, unknown>).muted === true;
    d.settings.vibrate = (r.settings as Record<string, unknown>).vibrate !== false;
  }
  return d;
}

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function storage(): KV | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSave(kv: KV | null = storage()): SaveData {
  if (!kv) return defaultSave();
  try {
    const txt = kv.getItem(SAVE_KEY);
    if (!txt) return defaultSave();
    return sanitizeSave(JSON.parse(txt));
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: SaveData, kv: KV | null = storage()): void {
  if (!kv) return;
  try {
    kv.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* quota or private mode: game keeps working in memory */
  }
}

export function clearSave(kv: KV | null = storage()): void {
  try {
    kv?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
