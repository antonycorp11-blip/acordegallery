import { CONFIG } from '../config';
import { CLAWS_BY_ID, type ClawDefinition } from '../entities/ClawsCatalog';
import type { SaveData } from '../core/Save';

export type Branch = 'capture' | 'expedition' | 'ecology' | 'tech';
export const BRANCH_LABEL: Record<Branch, string> = {
  capture: 'Captura',
  expedition: 'Expedição',
  ecology: 'Ecologia',
  tech: 'Tecnologia',
};

export interface UpgradeDef {
  id: string;
  branch: Branch;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  requires?: { id: string; level: number }[];
  /** Human readable effect at a given level. */
  effect: (level: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const UPGRADES: UpgradeDef[] = [
  // ── Captura
  { id: 'strikeSpeed', branch: 'capture', name: 'Velocidade do Golpe', maxLevel: 8, baseCost: 60,
    description: 'Investida e recolhimento mais rápidos. Menos tempo para o bicho fugir.',
    effect: (l) => `golpe ${pct(strikeMult(l))} do tempo` },
  { id: 'recovery', branch: 'capture', name: 'Recuperação', maxLevel: 8, baseCost: 70,
    description: 'Reduz a espera entre um golpe e outro.',
    effect: (l) => `recarga ${pct(cooldownMult(l))}` },
  { id: 'opening', branch: 'capture', name: 'Abertura', maxLevel: 6, baseCost: 80,
    description: 'Garra abre mais: área de contato real maior.',
    effect: (l) => `+${(l * 1.3).toFixed(1)} px de raio` },
  { id: 'strength', branch: 'capture', name: 'Força', maxLevel: 8, baseCost: 100,
    description: 'Segura presas pesadas e encouraçadas.',
    effect: (l) => `+${(l * 0.5).toFixed(1)} de força` },
  { id: 'precision', branch: 'capture', name: 'Precisão', maxLevel: 5, baseCost: 120,
    description: 'Pequena tolerância nas bordas dos alvos (sem autoaim).',
    effect: (l) => `+${l} px de tolerância` },
  { id: 'multi', branch: 'capture', name: 'Captura Múltipla', maxLevel: 2, baseCost: 900,
    requires: [{ id: 'opening', level: 3 }, { id: 'strength', level: 2 }],
    description: 'Pega mais um bicho se estiver dentro da área da garra.',
    effect: (l) => `+${l} alvo(s) por golpe` },
  // ── Expedição
  { id: 'runTime', branch: 'expedition', name: 'Tempo de Mergulho', maxLevel: 10, baseCost: 50,
    description: 'Cada nível adiciona 5 segundos à run.',
    effect: (l) => `${CONFIG.run.baseSeconds + l * CONFIG.run.secondsPerTimeLevel}s por run` },
  { id: 'lateral', branch: 'expedition', name: 'Propulsores', maxLevel: 10, baseCost: 60,
    description: 'Navega mais rápido para a direita (e para águas fundas).',
    effect: (l) => `velocidade ${pct((CONFIG.movement.baseSpeed + l * CONFIG.movement.speedPerLevel) / CONFIG.movement.baseSpeed)}` },
  { id: 'timeBonus', branch: 'expedition', name: 'Relógio Dourado', maxLevel: 5, baseCost: 150,
    requires: [{ id: 'runTime', level: 2 }],
    description: 'Bônus de tempo maiores, e raros passam a dar segundos.',
    effect: (l) => `+${l}s por bônus · raros +${(l * 0.5).toFixed(1)}s` },
  // ── Ecologia
  { id: 'density', branch: 'ecology', name: 'Mais Criaturas', maxLevel: 8, baseCost: 70,
    description: 'Mais fauna aparece em cada trecho do oceano.',
    effect: (l) => `densidade ${pct(densityMult(l))}` },
  { id: 'luck', branch: 'ecology', name: 'Sorte Abissal', maxLevel: 10, baseCost: 90,
    description: 'Aumenta a chance real de espécies raras (retorno decrescente).',
    effect: (l) => `sorte ${(luckValue(l) * 100).toFixed(0)}` },
  { id: 'schools', branch: 'ecology', name: 'Cardumes Grandes', maxLevel: 5, baseCost: 100,
    requires: [{ id: 'density', level: 1 }],
    description: 'Cardumes com mais peixes.',
    effect: (l) => `+${l} peixe(s) por cardume` },
  { id: 'variants', branch: 'ecology', name: 'Variantes', maxLevel: 6, baseCost: 120,
    requires: [{ id: 'luck', level: 1 }],
    description: 'Mais dourados, gigantes, bioluminescentes e mutantes.',
    effect: (l) => `variantes ${pct(variantMult(l))}` },
  // ── Tecnologia
  { id: 'combo', branch: 'tech', name: 'Sincronia de Combo', maxLevel: 5, baseCost: 140,
    description: 'Capturas seguidas valem mais e o combo dura mais.',
    effect: (l) => `até +${pct(comboMax(l))} · janela ${(comboWindow(l) / 1000).toFixed(1)}s` },
  { id: 'perfect', branch: 'tech', name: 'Captura Perfeita', maxLevel: 5, baseCost: 160,
    description: 'Acertar no centro do bicho rende bônus.',
    effect: (l) => `+${pct(perfectBonus(l))} no centro` },
  { id: 'sonar', branch: 'tech', name: 'Sonar de Raros', maxLevel: 3, baseCost: 400,
    requires: [{ id: 'luck', level: 2 }],
    description: 'Seta na borda indica o raro mais próximo fora da tela.',
    effect: (l) => `alcance ${['desligado', 'curto', 'médio', 'longo'][Math.min(3, l)]}` },
];

export const UPGRADES_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// ── effect curves (exported for tests)
export const strikeMult = (l: number) => Math.max(0.45, 1 - 0.07 * l);
export const cooldownMult = (l: number) => Math.max(0.55, 1 - 0.055 * l);
export const densityMult = (l: number) => 1 + 0.16 * l;
export const luckValue = (l: number) => 1 - Math.pow(0.86, l);
export const variantMult = (l: number) => 1 + 0.3 * l;
export const comboMax = (l: number) => CONFIG.economy.comboMaxBonus + 0.1 * l;
export const comboWindow = (l: number) => CONFIG.economy.comboWindowMs + 300 * l;
export const perfectBonus = (l: number) => CONFIG.economy.perfectBaseBonus + 0.1 * l;
export const sonarRange = (l: number) => (l <= 0 ? 0 : 500 + 400 * l);

export function level(save: SaveData, id: string): number {
  const def = UPGRADES_BY_ID[id];
  const l = save.upgrades[id] ?? 0;
  return def ? Math.min(l, def.maxLevel) : 0;
}

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(CONFIG.upgradeGrowth, currentLevel));
}

export function requirementsMet(save: SaveData, def: UpgradeDef): boolean {
  return (def.requires ?? []).every((r) => level(save, r.id) >= r.level);
}

export type BuyResult = 'ok' | 'max' | 'locked' | 'funds';

export function canBuy(save: SaveData, id: string): BuyResult {
  const def = UPGRADES_BY_ID[id];
  if (!def) return 'locked';
  const l = level(save, id);
  if (l >= def.maxLevel) return 'max';
  if (!requirementsMet(save, def)) return 'locked';
  if (save.coins < upgradeCost(def, l)) return 'funds';
  return 'ok';
}

/** Mutates save. Returns result. */
export function buyUpgrade(save: SaveData, id: string): BuyResult {
  const res = canBuy(save, id);
  if (res !== 'ok') return res;
  const def = UPGRADES_BY_ID[id];
  const l = level(save, id);
  save.coins -= upgradeCost(def, l);
  save.upgrades[id] = l + 1;
  return 'ok';
}

export function canBuyClaw(save: SaveData, id: string): 'ok' | 'owned' | 'locked' | 'funds' {
  const c = CLAWS_BY_ID[id];
  if (!c) return 'locked';
  if (save.ownedClaws.includes(id)) return 'owned';
  if (save.bestDepth < c.unlockDepth) return 'locked';
  if (save.coins < c.price) return 'funds';
  return 'ok';
}

export function buyClaw(save: SaveData, id: string): boolean {
  if (canBuyClaw(save, id) !== 'ok') return false;
  save.coins -= CLAWS_BY_ID[id].price;
  save.ownedClaws.push(id);
  save.equippedClaw = id;
  return true;
}

/** Everything a run needs, derived from save (claw + upgrades). */
export interface RunStats {
  claw: ClawDefinition;
  runSeconds: number;
  strikeMs: number;
  retractMs: number;
  cooldownMs: number;
  opening: number;
  strength: number;
  precision: number;
  maxTargets: number;
  reach: number;
  lateralSpeed: number;
  density: number;
  luck: number;
  schoolBonus: number;
  variantMult: number;
  timeBonusExtra: number;
  rareTimeBonus: number;
  comboMax: number;
  comboStep: number;
  comboWindowMs: number;
  perfectBonus: number;
  sonarRange: number;
}

export function computeStats(save: SaveData): RunStats {
  const claw = CLAWS_BY_ID[save.equippedClaw] ?? CLAWS_BY_ID.scrap;
  const c = CONFIG.claw;
  const L = (id: string) => level(save, id);
  return {
    claw,
    runSeconds: CONFIG.run.baseSeconds + L('runTime') * CONFIG.run.secondsPerTimeLevel,
    strikeMs: Math.max(c.minStrikeMs, claw.strikeMs * strikeMult(L('strikeSpeed'))),
    retractMs: Math.max(c.minRetractMs, claw.retractMs * strikeMult(L('strikeSpeed'))),
    cooldownMs: Math.max(c.minCooldownMs, claw.cooldownMs * cooldownMult(L('recovery'))),
    opening: claw.opening + L('opening') * 1.3,
    strength: claw.strength + L('strength') * 0.5,
    precision: L('precision'),
    maxTargets: claw.maxTargets + L('multi'),
    reach: claw.reach,
    lateralSpeed: CONFIG.movement.baseSpeed + L('lateral') * CONFIG.movement.speedPerLevel,
    density: densityMult(L('density')),
    luck: luckValue(L('luck')),
    schoolBonus: L('schools'),
    variantMult: variantMult(L('variants')),
    timeBonusExtra: L('timeBonus'),
    rareTimeBonus: L('timeBonus') * 0.5,
    comboMax: comboMax(L('combo')),
    comboStep: CONFIG.economy.comboStep + 0.03 * L('combo'),
    comboWindowMs: comboWindow(L('combo')),
    perfectBonus: perfectBonus(L('perfect')),
    sonarRange: sonarRange(L('sonar')),
  };
}
