// Encomendas: three short-term goals at a time, rewarding coins and stars.

import { hash3, randInt, seededRandom, weightedIndex, type Rand } from '../core/RNG';
import type { OrderKind, OrderState, SaveData } from '../core/Save';
import { RARITIES, RARITY_LABEL, SPECIES, SPECIES_BY_ID, isCreature, type Rarity, type VariantId } from '../entities/Species';
import { formatCoins } from './Economy';

export const ORDER_SLOTS = 3;

export type OrderEvent =
  | { type: 'capture'; speciesId: string; rarity: Rarity; variant: VariantId }
  | { type: 'depth'; meters: number }
  | { type: 'run'; captures: number; coins: number }
  | { type: 'combo'; count: number };

/** Species the player can realistically find now. */
function reachableSpecies(save: SaveData) {
  return SPECIES.filter(
    (s) => isCreature(s) && s.biomeWeights.some((w) => w > 0) && s.minDepth <= save.bestDepth + 120 && s.rarity !== 'legendary' && s.rarity !== 'anomalous',
  );
}

export function generateOrder(save: SaveData, r: Rand): OrderState {
  const tier = save.ordersDone;
  const scale = 1 + Math.pow(tier, 0.8) * 0.35;
  const kinds: [OrderKind, number][] = [
    ['catchSpecies', 40],
    ['catchRarity', 14],
    ['catchVariant', 9],
    ['reachDepth', 12],
    ['runCaptures', 11],
    ['runCoins', 8],
    ['combo', 6],
  ];
  const kind = kinds[weightedIndex(r, kinds.map((k) => k[1]))][0];
  let key = '';
  let target = 1;
  let difficulty = 1;
  switch (kind) {
    case 'catchSpecies': {
      const pool = reachableSpecies(save);
      const sp = pool[Math.floor(r() * pool.length)] ?? SPECIES_BY_ID.coralCrab;
      key = sp.id;
      const tierIdx = RARITIES.indexOf(sp.rarity);
      target = tierIdx === 0 ? randInt(r, 3, 6) : tierIdx === 1 ? randInt(r, 2, 3) : 1;
      difficulty = 1 + tierIdx * 0.8;
      break;
    }
    case 'catchRarity': {
      key = save.bestDepth > 150 && r() < 0.5 ? 'rare' : 'uncommon';
      target = key === 'rare' ? randInt(r, 1, 2) : randInt(r, 2, 4);
      difficulty = key === 'rare' ? 2.2 : 1.4;
      break;
    }
    case 'catchVariant':
      target = randInt(r, 1, 2);
      difficulty = 1.8;
      break;
    case 'reachDepth':
      target = Math.round(Math.max(save.bestDepth * 1.3, save.bestDepth + 60) / 25) * 25;
      difficulty = 1.6;
      break;
    case 'runCaptures':
      target = Math.min(30, 6 + Math.floor(tier / 2));
      difficulty = 1.3;
      break;
    case 'runCoins':
      target = Math.round((150 * scale) / 10) * 10;
      difficulty = 1.4;
      break;
    case 'combo':
      target = Math.min(8, 3 + Math.floor(tier / 4));
      difficulty = 1.5;
      break;
  }
  const coins = Math.round((70 * scale * difficulty) / 5) * 5;
  const stars = difficulty >= 2 ? 2 : 1;
  return { id: ++save.orderSerial, kind, key, target, progress: 0, coins, stars };
}

/** Fills empty slots. Deterministic from the serial so reloads don't reroll. */
export function ensureOrders(save: SaveData): void {
  while (save.orders.length < ORDER_SLOTS) save.orders.push(generateOrder(save, seededRandom(hash3(save.orderSerial + 1, 7177))));
}

export const isComplete = (o: OrderState) => o.progress >= o.target;

/** Applies a gameplay event. Returns orders that just became complete. */
export function applyOrderEvent(save: SaveData, ev: OrderEvent): OrderState[] {
  const done: OrderState[] = [];
  for (const o of save.orders) {
    if (isComplete(o)) continue;
    const before = o.progress;
    switch (o.kind) {
      case 'catchSpecies':
        if (ev.type === 'capture' && ev.speciesId === o.key) o.progress++;
        break;
      case 'catchRarity':
        if (ev.type === 'capture' && RARITIES.indexOf(ev.rarity) >= RARITIES.indexOf(o.key as Rarity)) o.progress++;
        break;
      case 'catchVariant':
        if (ev.type === 'capture' && ev.variant !== 'normal') o.progress++;
        break;
      case 'reachDepth':
        if (ev.type === 'depth') o.progress = Math.max(o.progress, Math.floor(ev.meters));
        break;
      case 'runCaptures':
        if (ev.type === 'run') o.progress = Math.max(o.progress, ev.captures);
        break;
      case 'runCoins':
        if (ev.type === 'run') o.progress = Math.max(o.progress, ev.coins);
        break;
      case 'combo':
        if (ev.type === 'combo') o.progress = Math.max(o.progress, ev.count);
        break;
    }
    o.progress = Math.min(o.progress, o.target);
    if (before < o.target && isComplete(o)) done.push(o);
  }
  return done;
}

/** Pays a finished order and replaces it. Returns false if not claimable. */
export function claimOrder(save: SaveData, id: number): boolean {
  const i = save.orders.findIndex((o) => o.id === id);
  if (i < 0 || !isComplete(save.orders[i])) return false;
  const o = save.orders[i];
  save.coins += o.coins;
  save.totalEarned += o.coins;
  save.earnedThisLife += o.coins;
  save.stars += o.stars;
  save.ordersDone++;
  save.orders.splice(i, 1);
  ensureOrders(save);
  return true;
}

export function orderText(o: OrderState): string {
  switch (o.kind) {
    case 'catchSpecies': return `Capture ${o.target}× ${SPECIES_BY_ID[o.key]?.name ?? o.key}`;
    case 'catchRarity': return `Capture ${o.target} bicho(s) ${RARITY_LABEL[o.key as Rarity].toLowerCase()}(s) ou melhor`;
    case 'catchVariant': return `Capture ${o.target} variante(s) especial(is)`;
    case 'reachDepth': return `Chegue a ${o.target.toLocaleString('pt-BR')} m de profundidade`;
    case 'runCaptures': return `Faça ${o.target} capturas num só mergulho`;
    case 'runCoins': return `Ganhe $${formatCoins(o.target)} num só mergulho`;
    case 'combo': return `Faça um combo x${o.target}`;
  }
}
