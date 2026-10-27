import { CONFIG } from '../config';
import { CLAWS_BY_ID, type ClawDefinition } from '../entities/ClawsCatalog';
import type { SaveData } from '../core/Save';

export type Branch = 'core' | 'capture' | 'expedition' | 'ecology' | 'tech' | 'essence';
export type TreeId = 'main' | 'essence';
export const BRANCH_LABEL: Record<Branch, string> = {
  essence: 'Essência',
  core: 'Origem',
  capture: 'Captura',
  expedition: 'Expedição',
  ecology: 'Ecologia',
  tech: 'Tecnologia',
};
export const BRANCH_COLOR: Record<Branch, string> = {
  essence: '#ff7ff5',
  core: '#ffffff',
  capture: '#ff9a1f',
  expedition: '#3fe0d0',
  ecology: '#6cf27a',
  tech: '#c27bff',
};

/** Gameplay stats a node can raise. Several nodes may feed the same stat. */
export type StatKey =
  | 'runTime' | 'strikeSpeed' | 'recovery' | 'opening' | 'strength' | 'precision' | 'multi'
  | 'lateral' | 'timeBonus' | 'density' | 'luck' | 'schools' | 'variants' | 'combo' | 'perfect' | 'sonar'
  | 'value' | 'frenzy' | 'aquarium' | 'clawDiscount' | 'keepRoutes' | 'turbo';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Human readable contribution of `n` stat levels. */
export const STAT_TEXT: Record<StatKey, (n: number) => string> = {
  runTime: (n) => `+${n * CONFIG.run.secondsPerTimeLevel}s de mergulho`,
  strikeSpeed: (n) => `golpe ${Math.round(n * 7)}% mais rápido`,
  recovery: (n) => `recarga ${Math.round(n * 5.5)}% menor`,
  opening: (n) => `+${(n * 1.3).toFixed(1)} px de abertura`,
  strength: (n) => `+${(n * 0.5).toFixed(1)} de força`,
  precision: (n) => `+${n} px de tolerância`,
  multi: (n) => `+${n} alvo(s) por golpe`,
  lateral: (n) => `+${pct((n * CONFIG.movement.speedPerLevel) / CONFIG.movement.baseSpeed)} de velocidade lateral`,
  timeBonus: (n) => `+${n}s por bônus · raros +${(n * 0.5).toFixed(1)}s`,
  density: (n) => `+${Math.round(n * 16)}% de criaturas`,
  luck: (n) => `+${n} de sorte abissal`,
  schools: (n) => `+${n} peixe(s) por cardume`,
  variants: (n) => `+${Math.round(n * 30)}% de variantes`,
  combo: (n) => `combo até +${pct(comboMax(n))}, janela ${(comboWindow(n) / 1000).toFixed(1)}s`,
  perfect: (n) => `+${Math.round(n * 10)}% no centro do bicho`,
  sonar: (n) => `sonar ${['desligado', 'curto', 'médio', 'longo', 'abissal'][Math.min(4, n)]}`,
  value: (n) => `+${n * 15}% no valor de toda captura`,
  frenzy: (n) => `frenesi dura +${n}s`,
  aquarium: (n) => `+${n * 50}% de renda do aquário`,
  clawDiscount: (n) => `garras ${n * 15}% mais baratas`,
  keepRoutes: (n) => (n > 0 ? 'mantém pontos de partida e guardiões ao renascer' : 'perde as rotas ao renascer'),
  turbo: (n) => `+${n}s de turbo`,
};

export interface UpgradeDef {
  id: string;
  tree: TreeId;
  branch: Branch;
  name: string;
  description: string;
  stat: StatKey;
  maxLevel: number;
  baseCost: number;
  /** Must own at least one level of this node first (null = tree root). */
  parent: string | null;
  /** Grid position in the tree (root at 0,0; y grows downward). */
  x: number;
  y: number;
  /** Human readable effect at a given level. */
  effect: (level: number) => string;
}

type NodeSpec = Omit<UpgradeDef, 'effect' | 'tree'>;

const NODES: NodeSpec[] = [
  { id: 'core', branch: 'core', name: 'Instinto de Caça', stat: 'runTime', maxLevel: 1, baseCost: 20, parent: null, x: 0, y: 0,
    description: 'O primeiro passo. +5 segundos de mergulho e libera os caminhos da árvore.' },

  // ── Captura (para cima)
  { id: 'strikeSpeed', branch: 'capture', name: 'Golpe Rápido', stat: 'strikeSpeed', maxLevel: 4, baseCost: 45, parent: 'core', x: 0, y: -1,
    description: 'Investida e recolhimento mais rápidos. Menos tempo para o bicho fugir.' },
  { id: 'opening', branch: 'capture', name: 'Abertura', stat: 'opening', maxLevel: 3, baseCost: 60, parent: 'strikeSpeed', x: -1, y: -2,
    description: 'A garra abre mais: área de contato real maior.' },
  { id: 'strength', branch: 'capture', name: 'Força', stat: 'strength', maxLevel: 3, baseCost: 80, parent: 'strikeSpeed', x: 1, y: -2,
    description: 'Segura presas pesadas e encouraçadas, como o Peixe-Cofre.' },
  { id: 'recovery', branch: 'capture', name: 'Recuperação', stat: 'recovery', maxLevel: 4, baseCost: 90, parent: 'opening', x: -1, y: -3,
    description: 'Menos espera entre um golpe e outro.' },
  { id: 'precision', branch: 'capture', name: 'Precisão', stat: 'precision', maxLevel: 3, baseCost: 110, parent: 'opening', x: -2, y: -2,
    description: 'Pequena tolerância nas bordas dos alvos (sem autoaim).' },
  { id: 'strength2', branch: 'capture', name: 'Pinça de Aço', stat: 'strength', maxLevel: 3, baseCost: 240, parent: 'strength', x: 1, y: -3,
    description: 'Ainda mais força para gigantes e mutantes.' },
  { id: 'strikeSpeed2', branch: 'capture', name: 'Estalo Relâmpago', stat: 'strikeSpeed', maxLevel: 4, baseCost: 280, parent: 'recovery', x: -1, y: -4,
    description: 'O golpe vira um estalo. Peixes ariscos quase não reagem.' },
  { id: 'multi', branch: 'capture', name: 'Captura Múltipla', stat: 'multi', maxLevel: 1, baseCost: 900, parent: 'strength2', x: 1, y: -4,
    description: 'Pega mais um bicho se ele estiver dentro da área da garra.' },
  { id: 'recovery2', branch: 'capture', name: 'Molas Abissais', stat: 'recovery', maxLevel: 4, baseCost: 520, parent: 'strikeSpeed2', x: -1, y: -5,
    description: 'Recarga ainda menor.' },
  { id: 'multi2', branch: 'capture', name: 'Rede de Garras', stat: 'multi', maxLevel: 1, baseCost: 2600, parent: 'multi', x: 1, y: -5,
    description: 'Mais um alvo por golpe.' },
  { id: 'opening2', branch: 'capture', name: 'Mandíbula Larga', stat: 'opening', maxLevel: 3, baseCost: 320, parent: 'precision', x: -3, y: -3,
    description: 'Abertura ainda maior.' },

  // ── Expedição (para a direita)
  { id: 'runTime', branch: 'expedition', name: 'Mais Tempo', stat: 'runTime', maxLevel: 3, baseCost: 50, parent: 'core', x: 1, y: 0,
    description: 'Cada nível adiciona 5 segundos ao mergulho.' },
  { id: 'lateral', branch: 'expedition', name: 'Propulsores', stat: 'lateral', maxLevel: 4, baseCost: 55, parent: 'runTime', x: 2, y: 0,
    description: 'Navega mais rápido para a direita (e para águas fundas).' },
  { id: 'runTime2', branch: 'expedition', name: 'Mergulho Longo', stat: 'runTime', maxLevel: 3, baseCost: 190, parent: 'lateral', x: 3, y: -1,
    description: 'Ainda mais segundos por mergulho.' },
  { id: 'lateral2', branch: 'expedition', name: 'Turbina', stat: 'lateral', maxLevel: 3, baseCost: 210, parent: 'lateral', x: 3, y: 0,
    description: 'Deslocamento lateral ainda mais rápido.' },
  { id: 'timeBonus', branch: 'expedition', name: 'Relógio Dourado', stat: 'timeBonus', maxLevel: 3, baseCost: 260, parent: 'runTime2', x: 4, y: -1,
    description: 'Bônus de tempo maiores, e raros passam a dar segundos.' },
  { id: 'runTime3', branch: 'expedition', name: 'Fôlego Abissal', stat: 'runTime', maxLevel: 4, baseCost: 650, parent: 'runTime2', x: 3, y: -2,
    description: 'Mergulhos muito mais longos.' },
  { id: 'lateral3', branch: 'expedition', name: 'Hélice Abissal', stat: 'lateral', maxLevel: 3, baseCost: 750, parent: 'lateral2', x: 4, y: 0,
    description: 'Velocidade para alcançar o abismo.' },
  { id: 'turbo', branch: 'expedition', name: 'Turbo', stat: 'turbo', maxLevel: 3, baseCost: 240, parent: 'lateral2', x: 3, y: 1,
    description: 'Mais segundos de turbo por mergulho.' },
  { id: 'timeBonus2', branch: 'expedition', name: 'Ampulheta Viva', stat: 'timeBonus', maxLevel: 3, baseCost: 1500, parent: 'timeBonus', x: 5, y: -1,
    description: 'Bônus de tempo ainda maiores.' },

  // ── Ecologia (para baixo)
  { id: 'density', branch: 'ecology', name: 'Mais Criaturas', stat: 'density', maxLevel: 3, baseCost: 65, parent: 'runTime', x: 1, y: 1,
    description: 'Mais fauna em cada trecho do oceano.' },
  { id: 'luck', branch: 'ecology', name: 'Sorte Abissal', stat: 'luck', maxLevel: 3, baseCost: 90, parent: 'density', x: 1, y: 2,
    description: 'Aumenta a chance real de espécies raras (retorno decrescente).' },
  { id: 'schools', branch: 'ecology', name: 'Cardumes', stat: 'schools', maxLevel: 3, baseCost: 100, parent: 'density', x: 2, y: 2,
    description: 'Cardumes com mais peixes.' },
  { id: 'luck2', branch: 'ecology', name: 'Faro de Raros', stat: 'luck', maxLevel: 4, baseCost: 320, parent: 'luck', x: 0, y: 3,
    description: 'Ainda mais sorte para raros e épicos.' },
  { id: 'variants', branch: 'ecology', name: 'Variantes', stat: 'variants', maxLevel: 3, baseCost: 170, parent: 'luck', x: 1, y: 3,
    description: 'Mais dourados, gigantes, bioluminescentes e mutantes.' },
  { id: 'density2', branch: 'ecology', name: 'Superpopulação', stat: 'density', maxLevel: 3, baseCost: 360, parent: 'schools', x: 2, y: 3,
    description: 'O oceano fica lotado de vida.' },
  { id: 'luck3', branch: 'ecology', name: 'Sorte Lendária', stat: 'luck', maxLevel: 4, baseCost: 1200, parent: 'luck2', x: 0, y: 4,
    description: 'Lendários e anômalos deixam de ser lenda.' },
  { id: 'variants2', branch: 'ecology', name: 'Mutagênese', stat: 'variants', maxLevel: 3, baseCost: 720, parent: 'variants', x: 1, y: 4,
    description: 'Variantes especiais muito mais frequentes.' },

  // ── Tecnologia (para a esquerda)
  { id: 'combo', branch: 'tech', name: 'Sincronia de Combo', stat: 'combo', maxLevel: 3, baseCost: 140, parent: 'precision', x: -2, y: -1,
    description: 'Capturas seguidas valem mais e o combo dura mais.' },
  { id: 'perfect', branch: 'tech', name: 'Captura Perfeita', stat: 'perfect', maxLevel: 3, baseCost: 160, parent: 'combo', x: -2, y: 0,
    description: 'Acertar no centro do bicho rende bônus.' },
  { id: 'sonar', branch: 'tech', name: 'Sonar de Raros', stat: 'sonar', maxLevel: 2, baseCost: 400, parent: 'combo', x: -3, y: -1,
    description: 'Seta na borda indica o raro mais próximo fora da tela.' },
  { id: 'combo2', branch: 'tech', name: 'Frenesi', stat: 'combo', maxLevel: 3, baseCost: 600, parent: 'perfect', x: -3, y: 0,
    description: 'Combos ainda mais lucrativos.' },
  { id: 'perfect2', branch: 'tech', name: 'Olho Cirúrgico', stat: 'perfect', maxLevel: 3, baseCost: 700, parent: 'perfect', x: -2, y: 1,
    description: 'Bônus de captura perfeita maior.' },
  { id: 'sonar2', branch: 'tech', name: 'Sonar Profundo', stat: 'sonar', maxLevel: 2, baseCost: 1800, parent: 'sonar', x: -4, y: -1,
    description: 'Detecta raros muito mais longe.' },
];

/** Prestige tree, bought with Essência Abissal. Never reset. */
const ESSENCE_NODES: NodeSpec[] = [
  { id: 'e_core', branch: 'essence', name: 'Memória Abissal', stat: 'value', maxLevel: 5, baseCost: 1, parent: null, x: 0, y: 0,
    description: 'Tudo o que você captura vale mais, para sempre.' },
  { id: 'e_time', branch: 'essence', name: 'Fôlego Eterno', stat: 'runTime', maxLevel: 3, baseCost: 2, parent: 'e_core', x: -1, y: -1,
    description: '+5 segundos em todo mergulho.' },
  { id: 'e_strength', branch: 'essence', name: 'Garra Ancestral', stat: 'strength', maxLevel: 4, baseCost: 2, parent: 'e_core', x: 1, y: -1,
    description: 'Força permanente para qualquer garra.' },
  { id: 'e_aquarium', branch: 'essence', name: 'Maré Fértil', stat: 'aquarium', maxLevel: 3, baseCost: 2, parent: 'e_core', x: 0, y: 1,
    description: 'O aquário rende muito mais.' },
  { id: 'e_luck', branch: 'essence', name: 'Sorte Primordial', stat: 'luck', maxLevel: 4, baseCost: 3, parent: 'e_time', x: -2, y: -1,
    description: 'Mais chance de raros desde o primeiro mergulho.' },
  { id: 'e_frenzy', branch: 'essence', name: 'Fúria das Marés', stat: 'frenzy', maxLevel: 3, baseCost: 3, parent: 'e_strength', x: 2, y: -1,
    description: 'O frenesi dura mais.' },
  { id: 'e_claws', branch: 'essence', name: 'Forja Ancestral', stat: 'clawDiscount', maxLevel: 3, baseCost: 3, parent: 'e_aquarium', x: 1, y: 1,
    description: 'Garras custam menos moedas.' },
  { id: 'e_speed', branch: 'essence', name: 'Corrente Interna', stat: 'lateral', maxLevel: 3, baseCost: 3, parent: 'e_aquarium', x: -1, y: 1,
    description: 'Navega mais rápido sempre.' },
  { id: 'e_routes', branch: 'essence', name: 'Memória de Rota', stat: 'keepRoutes', maxLevel: 1, baseCost: 8, parent: 'e_claws', x: 1, y: 2,
    description: 'Ao renascer, mantém os guardiões vencidos e os pontos de partida.' },
];

export const UPGRADES: UpgradeDef[] = [
  ...NODES.map((n) => ({ ...n, tree: 'main' as const, effect: (l: number) => STAT_TEXT[n.stat](l) })),
  ...ESSENCE_NODES.map((n) => ({ ...n, tree: 'essence' as const, effect: (l: number) => STAT_TEXT[n.stat](l) })),
];
export const treeNodes = (tree: TreeId) => UPGRADES.filter((u) => u.tree === tree);
export const UPGRADES_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const childrenOf = (id: string) => UPGRADES.filter((u) => u.parent === id);

// ── effect curves (exported for tests); `l` = total stat levels
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

/** Sum of levels of every node feeding a stat. */
export function statLevel(save: SaveData, stat: StatKey): number {
  let n = 0;
  for (const u of UPGRADES) if (u.stat === stat) n += level(save, u.id);
  return n;
}

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  if (def.tree === 'essence') return def.baseCost * (currentLevel + 1);
  return Math.round(def.baseCost * Math.pow(CONFIG.upgradeGrowth, currentLevel));
}

export function requirementsMet(save: SaveData, def: UpgradeDef): boolean {
  return def.parent === null || level(save, def.parent) >= 1;
}

export type NodeVisibility = 'owned' | 'available' | 'teaser' | 'hidden';

/**
 * owned: bought at least once. available: parent owned (can be bought).
 * teaser: one step beyond the frontier, shown as "?". hidden: further away.
 */
export function nodeVisibility(save: SaveData, id: string): NodeVisibility {
  const def = UPGRADES_BY_ID[id];
  if (!def) return 'hidden';
  if (level(save, id) >= 1) return 'owned';
  if (requirementsMet(save, def)) return 'available';
  const parent = UPGRADES_BY_ID[def.parent!];
  return parent && requirementsMet(save, parent) ? 'teaser' : 'hidden';
}

export type BuyResult = 'ok' | 'max' | 'locked' | 'funds';

/** Coins for the main tree, essence for the prestige tree. */
export function wallet(save: SaveData, tree: TreeId): number {
  return tree === 'essence' ? save.essence : save.coins;
}

export function canBuy(save: SaveData, id: string): BuyResult {
  const def = UPGRADES_BY_ID[id];
  if (!def) return 'locked';
  const l = level(save, id);
  if (l >= def.maxLevel) return 'max';
  if (!requirementsMet(save, def)) return 'locked';
  if (wallet(save, def.tree) < upgradeCost(def, l)) return 'funds';
  return 'ok';
}

/** Mutates save. Returns result. */
export function buyUpgrade(save: SaveData, id: string): BuyResult {
  const res = canBuy(save, id);
  if (res !== 'ok') return res;
  const def = UPGRADES_BY_ID[id];
  const l = level(save, id);
  if (def.tree === 'essence') save.essence -= upgradeCost(def, l);
  else save.coins -= upgradeCost(def, l);
  save.upgrades[id] = l + 1;
  return 'ok';
}

export function clawPrice(save: SaveData, c: ClawDefinition): number {
  return Math.round(c.price * (1 - 0.15 * statLevel(save, 'clawDiscount')));
}

export function canBuyClaw(save: SaveData, id: string): 'ok' | 'owned' | 'locked' | 'funds' {
  const c = CLAWS_BY_ID[id];
  if (!c) return 'locked';
  if (save.ownedClaws.includes(id)) return 'owned';
  if (save.bestDepth < c.unlockDepth) return 'locked';
  if (save.coins < clawPrice(save, c) || save.stars < c.stars) return 'funds';
  return 'ok';
}

export function buyClaw(save: SaveData, id: string): boolean {
  if (canBuyClaw(save, id) !== 'ok') return false;
  save.coins -= clawPrice(save, CLAWS_BY_ID[id]);
  save.stars -= CLAWS_BY_ID[id].stars;
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
  /** multiplier on every capture value (essence) */
  valueMult: number;
  frenzySeconds: number;
  turboSeconds: number;
}

export function computeStats(save: SaveData): RunStats {
  const claw = CLAWS_BY_ID[save.equippedClaw] ?? CLAWS_BY_ID.scrap;
  const c = CONFIG.claw;
  const L = (stat: StatKey) => statLevel(save, stat);
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
    valueMult: 1 + 0.15 * L('value'),
    frenzySeconds: CONFIG.frenzy.seconds + L('frenzy'),
    turboSeconds: CONFIG.turbo.seconds + L('turbo'),
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
