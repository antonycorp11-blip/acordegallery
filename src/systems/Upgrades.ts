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
  | 'value' | 'frenzy' | 'aquarium' | 'clawDiscount' | 'keepRoutes' | 'turbo'
  | 'stealth' | 'hull' | 'kg' | 'baitTime' | 'grip' | 'tools' | 'dual' | 'cable' | 'autoClaw' | 'autoSpeed';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Human readable contribution of `n` stat levels. */
export const STAT_TEXT: Record<StatKey, (n: number) => string> = {
  runTime: (n) => `+${n * CONFIG.run.secondsPerTimeLevel}s de mergulho`,
  strikeSpeed: (n) => `golpe ${Math.round((1 - strikeMult(n)) * 100)}% mais rápido`,
  recovery: (n) => `recarga ${Math.round((1 - cooldownMult(n)) * 100)}% mais rápida`,
  opening: (n) => `+${n * 2} px de abertura`,
  strength: (n) => `+${strengthBonus(n).toFixed(1)} de força`,
  precision: (n) => `+${n} px de tolerância`,
  multi: (n) => `+${n} alvo(s) por golpe`,
  lateral: (n) => `+${pct((n * CONFIG.movement.speedPerLevel) / CONFIG.movement.baseSpeed)} de velocidade`,
  timeBonus: () => '',
  density: (n) => `+${Math.round(n * 35)}% de bichos no mar`,
  luck: (n) => `raros ${(1 + luckValue(n) * 4).toFixed(1)}× mais comuns`,
  schools: (n) => `+${n * 3} peixes por cardume`,
  variants: (n) => `+${n * 50}% de variantes`,
  combo: (n) => `combo até +${pct(comboMax(n))}, janela ${(comboWindow(n) / 1000).toFixed(1)}s`,
  perfect: (n) => `+${Math.round(n * 10)}% no centro do bicho`,
  sonar: (n) => `sonar ${['desligado', 'curto', 'médio', 'longo', 'abissal'][Math.min(4, n)]}`,
  value: (n) => `+${n * 25}% no valor de toda captura`,
  frenzy: (n) => `frenesi dura +${n}s`,
  aquarium: (n) => `+${n * 50}% de renda do aquário`,
  clawDiscount: (n) => `garras ${n * 15}% mais baratas`,
  keepRoutes: (n) => (n > 0 ? 'mantém pontos de partida e guardiões ao renascer' : 'perde as rotas ao renascer'),
  turbo: (n) => `+${n}s de turbo`,
  stealth: (n) => `bichos reagem ${n * 10}% mais devagar`,
  hull: (n) => `+${n} ♥ contra guardiões`,
  kg: (n) => `+${n * 10}% de kg para a cota`,
  grip: (n) => `disputa: +${n * 4}% de tolerância e +${n * 5}% de força na linha`,
  tools: (n) => `ferramentas recarregam ${n * 8}% mais rápido`,
  dual: (n) => `segunda garra: +${n} presa(s) vizinha(s) por golpe`,
  baitTime: (n) => `iscas duram +${n * 25}% e chamam +${n} bicho(s)`,
  cable: (n) => `+${n.toLocaleString('pt-BR')} m de cabo`,
  autoClaw: (n) => `+${n} garra(s) automática(s)`,
  autoSpeed: (n) => `garras automáticas ${Math.round((1 - Math.pow(0.85, n)) * 100)}% mais rápidas`,
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
  /** Sealed until this guardian is captured (the tree grows with the game). */
  requiresBoss?: string;
  requiresPrestige?: number;
  /** stat amount per level (default 1): cable nodes add meters */
  power?: number;
  /** Grid position in the tree (root at 0,0; y grows downward). */
  x: number;
  y: number;
  /** Human readable effect at a given level. */
  effect: (level: number) => string;
}

type NodeSpec = Omit<UpgradeDef, 'effect' | 'tree'>;

const NODES: NodeSpec[] = [
  { id: 'core', branch: 'core', name: 'Instinto de Caça', stat: 'runTime', maxLevel: 1, baseCost: 20, parent: null, x: 0, y: 0,
    description: 'O primeiro passo: +5 s de mergulho e abre os caminhos da árvore.' },

  // ── Captura (para cima): a garra em si
  { id: 'c_speed', branch: 'capture', name: 'Golpe Rápido', stat: 'strikeSpeed', maxLevel: 5, baseCost: 80, parent: 'core', x: 0, y: -1,
    description: 'A garra desce e sobe 16% mais rápido por nível. Menos tempo para o bicho fugir.' },
  { id: 'c_str', branch: 'capture', name: 'Força', stat: 'strength', maxLevel: 5, baseCost: 120, parent: 'c_speed', x: 1, y: -1,
    description: 'Segura bichos mais pesados. O Caranguejo-Rei exige força 4.' },
  { id: 'c_open', branch: 'capture', name: 'Abertura', stat: 'opening', maxLevel: 5, baseCost: 110, parent: 'c_speed', x: -1, y: -1,
    description: 'A boca da garra fica 2 px maior por nível. Dá para ver a garra crescer.' },
  { id: 'c_recov', branch: 'capture', name: 'Recarga Hidráulica', stat: 'recovery', maxLevel: 5, baseCost: 240, parent: 'c_speed', x: 0, y: -2,
    description: 'Recarrega 16% mais rápido por nível: mais golpes por mergulho.' },
  { id: 'c_multi', branch: 'capture', name: 'Captura Múltipla', stat: 'multi', maxLevel: 2, baseCost: 1800, parent: 'c_open', x: -1, y: -2,
    description: 'Pega +1 bicho por golpe.' },
  { id: 'c_grip', branch: 'capture', name: 'Domínio da Linha', stat: 'grip', maxLevel: 5, baseCost: 1200, parent: 'c_str', x: 2, y: -2,
    description: 'Troféus (gigantes, lendários e tubarões alimentados) abrem uma disputa: toque no verde para vencer.' },
  { id: 'c_str2', branch: 'capture', name: 'Pinça de Aço', stat: 'strength', maxLevel: 5, baseCost: 6800, parent: 'c_str', x: 1, y: -2, requiresBoss: 'kingCrab',
    description: 'Força para a Moreia e os bichos da costa rochosa.' },
  { id: 'c_speed2', branch: 'capture', name: 'Golpe Relâmpago', stat: 'strikeSpeed', maxLevel: 5, baseCost: 11200, parent: 'c_recov', x: 0, y: -3, requiresBoss: 'kingCrab',
    description: 'O golpe vira um estalo.' },
  { id: 'c_stealth', branch: 'capture', name: 'Garra Silenciosa', stat: 'stealth', maxLevel: 5, baseCost: 8100, parent: 'c_multi', x: -1, y: -3, requiresBoss: 'kingCrab',
    description: 'Os bichos reagem 10% mais devagar por nível.' },
  { id: 'c_open2', branch: 'capture', name: 'Boca Larga', stat: 'opening', maxLevel: 5, baseCost: 30000, parent: 'c_multi', x: -2, y: -2, requiresBoss: 'colossalEel',
    description: 'Abertura gigante: cardumes inteiros cabem na boca.' },
  { id: 'c_recov2', branch: 'capture', name: 'Pistão Duplo', stat: 'recovery', maxLevel: 5, baseCost: 35000, parent: 'c_speed2', x: 0, y: -4, requiresBoss: 'colossalEel',
    description: 'Recarga quase instantânea.' },
  { id: 'c_str3', branch: 'capture', name: 'Hidráulica Titânica', stat: 'strength', maxLevel: 6, baseCost: 120000, parent: 'c_str2', x: 1, y: -3, requiresBoss: 'wreckOctopus',
    description: 'Força para os gigantes do abismo.' },
  { id: 'c_multi2', branch: 'capture', name: 'Rede de Pinças', stat: 'multi', maxLevel: 2, baseCost: 320000, parent: 'c_open2', x: -2, y: -3, requiresBoss: 'wreckOctopus',
    description: 'Ainda mais bichos por golpe.' },
  { id: 'c_dual', branch: 'capture', name: 'Garra Gêmea', stat: 'dual', maxLevel: 2, baseCost: 40000, parent: 'c_speed2', x: 1, y: -4, requiresPrestige: 1,
    description: 'Após renascer, uma segunda garra pega os vizinhos do alvo principal.' },
  { id: 'c_stealth2', branch: 'capture', name: 'Camuflagem Ótica', stat: 'stealth', maxLevel: 5, baseCost: 360000, parent: 'c_stealth', x: -1, y: -4, requiresBoss: 'cathedralJelly',
    description: 'Os bichos quase não percebem a garra.' },

  // ── Expedição (para a direita): guincho, tempo e navegação
  { id: 'x_cable1', branch: 'expedition', name: 'Guincho', stat: 'cable', maxLevel: 5, baseCost: 90, parent: 'core', x: 1, y: 0, power: 22,
    description: 'Baixa a plataforma: o cabo alcança +22 m por nível. Onde o fundo passa do cabo, nada é alcançável.' },
  { id: 'x_cable2', branch: 'expedition', name: 'Guincho Pesado', stat: 'cable', maxLevel: 5, baseCost: 5400, parent: 'x_cable1', x: 2, y: 0, requiresBoss: 'kingCrab', power: 90,
    description: '+90 m por nível: abre a Costa Rochosa (até 600 m).' },
  { id: 'x_cable3', branch: 'expedition', name: 'Cabo de Aço', stat: 'cable', maxLevel: 5, baseCost: 45000, parent: 'x_cable2', x: 3, y: 0, requiresBoss: 'colossalEel', power: 240,
    description: '+240 m por nível: abre os Naufrágios (até 1.800 m).' },
  { id: 'x_cable4', branch: 'expedition', name: 'Cabo Abissal', stat: 'cable', maxLevel: 5, baseCost: 240000, parent: 'x_cable3', x: 4, y: 0, requiresBoss: 'wreckOctopus', power: 540,
    description: '+540 m por nível: abre a Floresta Abissal (até 4.500 m).' },
  { id: 'x_cable5', branch: 'expedition', name: 'Elevador do Meteoro', stat: 'cable', maxLevel: 5, baseCost: 4800000, parent: 'x_cable4', x: 5, y: 0, requiresBoss: 'cathedralJelly', power: 1100,
    description: '+1.100 m por nível: abre o Abismo (até 10.000 m).' },
  { id: 'x_cable6', branch: 'expedition', name: 'Âncora Primordial', stat: 'cable', maxLevel: 3, baseCost: 30000000, parent: 'x_cable5', x: 6, y: 0, requiresBoss: 'primordial', power: 600,
    description: '+600 m por nível: a fossa onde caçam os novos predadores.' },
  { id: 'x_time1', branch: 'expedition', name: 'Mais Tempo', stat: 'runTime', maxLevel: 3, baseCost: 160, parent: 'x_cable1', x: 2, y: 1,
    description: '+5 s de mergulho por nível.' },
  { id: 'x_time2', branch: 'expedition', name: 'Mergulho Longo', stat: 'runTime', maxLevel: 3, baseCost: 9000, parent: 'x_time1', x: 3, y: 1, requiresBoss: 'kingCrab',
    description: '+5 s de mergulho por nível.' },
  { id: 'x_time3', branch: 'expedition', name: 'Fôlego Abissal', stat: 'runTime', maxLevel: 3, baseCost: 70000, parent: 'x_time2', x: 4, y: 1, requiresBoss: 'colossalEel',
    description: '+5 s de mergulho por nível.' },
  { id: 'x_time4', branch: 'expedition', name: 'Pulmão de Aço', stat: 'runTime', maxLevel: 2, baseCost: 720000, parent: 'x_time3', x: 5, y: 1, requiresBoss: 'wreckOctopus',
    description: 'Chega ao teto de 90 s.' },
  { id: 'x_move', branch: 'expedition', name: 'Propulsores', stat: 'lateral', maxLevel: 4, baseCost: 120, parent: 'x_cable1', x: 2, y: -1,
    description: 'A plataforma navega mais rápido.' },
  { id: 'x_turbo', branch: 'expedition', name: 'Turbo', stat: 'turbo', maxLevel: 3, baseCost: 700, parent: 'x_move', x: 3, y: -1,
    description: '+1 s de turbo por nível.' },
  { id: 'x_hull', branch: 'expedition', name: 'Casco Reforçado', stat: 'hull', maxLevel: 3, baseCost: 6800, parent: 'x_turbo', x: 3, y: -2, requiresBoss: 'kingCrab',
    description: '+1 ♥ contra guardiões.' },
  { id: 'x_move2', branch: 'expedition', name: 'Turbina', stat: 'lateral', maxLevel: 4, baseCost: 13500, parent: 'x_turbo', x: 4, y: -1, requiresBoss: 'kingCrab',
    description: 'Navegação ainda mais rápida.' },
  { id: 'x_bait', branch: 'expedition', name: 'Iscas Concentradas', stat: 'baitTime', maxLevel: 4, baseCost: 5400, parent: 'x_hull', x: 4, y: -2, requiresBoss: 'kingCrab',
    description: 'Iscas duram mais e chamam mais bichos.' },

  // ── Ecologia (para baixo): o mar enche
  { id: 'g_density', branch: 'ecology', name: 'Mais Criaturas', stat: 'density', maxLevel: 5, baseCost: 100, parent: 'core', x: 0, y: 1,
    description: '+35% de bichos no mar por nível. A tela vai enchendo.' },
  { id: 'g_schools', branch: 'ecology', name: 'Cardumes', stat: 'schools', maxLevel: 4, baseCost: 300, parent: 'g_density', x: 0, y: 2,
    description: '+3 peixes em cada cardume por nível.' },
  { id: 'g_luck', branch: 'ecology', name: 'Sorte', stat: 'luck', maxLevel: 5, baseCost: 400, parent: 'g_density', x: 1, y: 2,
    description: 'Raros, épicos e lendários aparecem mais.' },
  { id: 'g_variants', branch: 'ecology', name: 'Variantes', stat: 'variants', maxLevel: 5, baseCost: 500, parent: 'g_density', x: -1, y: 2,
    description: '+50% de chance de prateados, dourados, gigantes e outras variantes por nível.' },
  { id: 'g_density2', branch: 'ecology', name: 'Berçário', stat: 'density', maxLevel: 5, baseCost: 11200, parent: 'g_schools', x: 0, y: 3, requiresBoss: 'kingCrab',
    description: 'Ainda mais vida no mar.' },
  { id: 'g_kg', branch: 'ecology', name: 'Rede de Carga', stat: 'kg', maxLevel: 4, baseCost: 7200, parent: 'g_luck', x: 1, y: 3, requiresBoss: 'kingCrab',
    description: '+10% de kg para a cota por nível.' },
  { id: 'g_luck2', branch: 'ecology', name: 'Faro Abissal', stat: 'luck', maxLevel: 5, baseCost: 60000, parent: 'g_kg', x: 1, y: 4, requiresBoss: 'colossalEel',
    description: 'Muito mais raros.' },
  { id: 'g_variants2', branch: 'ecology', name: 'Colecionador', stat: 'variants', maxLevel: 5, baseCost: 45000, parent: 'g_variants', x: -1, y: 3, requiresBoss: 'colossalEel',
    description: 'Variantes por toda parte.' },
  { id: 'g_schools2', branch: 'ecology', name: 'Cardumes Gigantes', stat: 'schools', maxLevel: 4, baseCost: 75000, parent: 'g_density2', x: 0, y: 4, requiresBoss: 'colossalEel',
    description: 'Cardumes enormes cruzam a tela.' },
  { id: 'g_density3', branch: 'ecology', name: 'Explosão de Vida', stat: 'density', maxLevel: 5, baseCost: 640000, parent: 'g_schools2', x: 0, y: 5, requiresBoss: 'wreckOctopus',
    description: 'O oceano transborda.' },
  { id: 'g_sonar', branch: 'ecology', name: 'Sonar', stat: 'sonar', maxLevel: 3, baseCost: 25000, parent: 'g_variants2', x: -1, y: 4, requiresBoss: 'colossalEel',
    description: 'Aponta raros e variantes fora da tela.' },

  // ── Tecnologia (para a esquerda): valor e automação
  { id: 't_value', branch: 'tech', name: 'Preço Justo', stat: 'value', maxLevel: 5, baseCost: 140, parent: 'core', x: -1, y: 0,
    description: '+25% no valor de toda captura por nível.' },
  { id: 't_auto', branch: 'tech', name: 'Braço Auxiliar', stat: 'autoClaw', maxLevel: 2, baseCost: 800, parent: 't_value', x: -2, y: 0,
    description: '+1 garra automática na plataforma por nível: ela ataca sozinha o que passar embaixo.' },
  { id: 't_autoSpeed', branch: 'tech', name: 'Motor Auxiliar', stat: 'autoSpeed', maxLevel: 5, baseCost: 1200, parent: 't_auto', x: -3, y: 0,
    description: 'As garras auxiliares atacam 15% mais rápido por nível.' },
  { id: 't_combo', branch: 'tech', name: 'Combo', stat: 'combo', maxLevel: 4, baseCost: 600, parent: 't_auto', x: -2, y: -1,
    description: 'Combos valem mais e duram mais.' },
  { id: 't_frenzy', branch: 'tech', name: 'Frenesi', stat: 'frenzy', maxLevel: 3, baseCost: 1600, parent: 't_combo', x: -3, y: -1,
    description: 'O frenesi dura +1 s por nível.' },
  { id: 't_tools', branch: 'tech', name: 'Arsenal de Caça', stat: 'tools', maxLevel: 5, baseCost: 2400, parent: 't_frenzy', x: -4, y: -1,
    description: 'Rede (1º renascimento) e arpão (2º) recarregam mais rápido.' },
  { id: 't_auto2', branch: 'tech', name: 'Braços Extras', stat: 'autoClaw', maxLevel: 2, baseCost: 18000, parent: 't_autoSpeed', x: -3, y: 1, requiresBoss: 'kingCrab',
    description: '+1 garra automática por nível.' },
  { id: 't_value2', branch: 'tech', name: 'Mercado', stat: 'value', maxLevel: 5, baseCost: 13500, parent: 't_autoSpeed', x: -4, y: 0, requiresBoss: 'kingCrab',
    description: '+25% no valor por nível.' },
  { id: 't_auto3', branch: 'tech', name: 'Linha de Montagem', stat: 'autoClaw', maxLevel: 2, baseCost: 125000, parent: 't_auto2', x: -4, y: 1, requiresBoss: 'colossalEel',
    description: '+1 garra automática por nível.' },
  { id: 't_autoSpeed2', branch: 'tech', name: 'Servomotores', stat: 'autoSpeed', maxLevel: 5, baseCost: 100000, parent: 't_auto3', x: -5, y: 1, requiresBoss: 'colossalEel',
    description: 'Garras auxiliares ainda mais rápidas.' },
  { id: 't_value3', branch: 'tech', name: 'Exportação', stat: 'value', maxLevel: 5, baseCost: 125000, parent: 't_value2', x: -5, y: 0, requiresBoss: 'colossalEel',
    description: '+25% no valor por nível.' },
  { id: 't_auto4', branch: 'tech', name: 'Fábrica Flutuante', stat: 'autoClaw', maxLevel: 2, baseCost: 1200000, parent: 't_autoSpeed2', x: -6, y: 1, requiresBoss: 'wreckOctopus',
    description: '+1 garra automática por nível.' },
  { id: 't_value4', branch: 'tech', name: 'Monopólio', stat: 'value', maxLevel: 5, baseCost: 1600000, parent: 't_value3', x: -6, y: 0, requiresBoss: 'wreckOctopus',
    description: '+25% no valor por nível.' },
];

/** Prestige tree, bought with Essência Abissal. Never reset. */
const ESSENCE_NODES: NodeSpec[] = [
  { id: 'e_core', branch: 'essence', name: 'Memória Abissal', stat: 'value', maxLevel: 5, baseCost: 1, parent: null, x: 0, y: 0,
    description: 'Tudo o que você captura vale mais, para sempre.' },
  { id: 'e_time', branch: 'essence', name: 'Fôlego Eterno', stat: 'runTime', maxLevel: 3, baseCost: 2, parent: 'e_core', x: -1, y: -1,
    description: '+5 segundos em todo mergulho (o teto continua 90 s).' },
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
  ...NODES.map((n) => ({ ...n, tree: 'main' as const, effect: (l: number) => STAT_TEXT[n.stat](l * (n.power ?? 1)) })),
  ...ESSENCE_NODES.map((n) => ({ ...n, tree: 'essence' as const, effect: (l: number) => STAT_TEXT[n.stat](l) })),
];
export const treeNodes = (tree: TreeId) => UPGRADES.filter((u) => u.tree === tree);
export const UPGRADES_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
export const childrenOf = (id: string) => UPGRADES.filter((u) => u.parent === id);

// ── effect curves (exported for tests); `l` = total stat levels
export const strikeMult = (l: number) => Math.pow(0.84, l);
export const cooldownMult = (l: number) => Math.pow(0.84, l);

// Preserve the first guardian's progression, then outgrow giant/armored prey.
export const strengthBonus = (l: number) => 0.5 * l + 0.04 * Math.pow(Math.max(0, l - 6), 2);

// Approach the timing floor smoothly so every purchased level still helps.
const upgradedTiming = (base: number, floor: number, mult: number) =>
  Math.min(base, floor) + Math.max(0, base - floor) * mult;
export const densityMult = (l: number) => 1 + 0.35 * l;
export const luckValue = (l: number) => 1 - Math.pow(0.84, l);
export const variantMult = (l: number) => 1 + 0.5 * l;
/** Seconds between attacks of each automatic claw. */
export const autoCooldown = (l: number) => 2.6 * Math.pow(0.85, l);
export const comboMax = (l: number) => CONFIG.economy.comboMaxBonus + 0.1 * l;
export const comboWindow = (l: number) => CONFIG.economy.comboWindowMs + 300 * l;
export const perfectBonus = (l: number) => CONFIG.economy.perfectBaseBonus + 0.1 * l;
export const sonarRange = (l: number) => (l <= 0 ? 0 : 500 + 400 * l);

/** Visual tier 0..3 from how invested the player is in claw upgrades. */
export function clawTier(levels: number): number {
  return levels >= 18 ? 3 : levels >= 10 ? 2 : levels >= 4 ? 1 : 0;
}
export const CLAW_TIER_NAMES = ['Básica', 'Reforçada', 'Dourada', 'Lendária'];

export function level(save: SaveData, id: string): number {
  const def = UPGRADES_BY_ID[id];
  const l = save.upgrades[id] ?? 0;
  return def ? Math.min(l, def.maxLevel) : 0;
}

/** Sum of levels of every node feeding a stat. */
export function statLevel(save: SaveData, stat: StatKey): number {
  let n = 0;
  for (const u of UPGRADES) if (u.stat === stat) n += level(save, u.id) * (u.power ?? 1);
  return n;
}

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  if (def.tree === 'essence') return def.baseCost * (currentLevel + 1);
  return Math.round(def.baseCost * Math.pow(CONFIG.upgradeGrowth, currentLevel));
}

export function requirementsMet(save: SaveData, def: UpgradeDef): boolean {
  if (def.requiresPrestige && save.prestiges < def.requiresPrestige) return false;
  if (def.requiresBoss && !save.bosses.includes(def.requiresBoss)) return false;
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
  if (def.requiresBoss && parent && level(save, parent.id) >= 1) return 'teaser';
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
  grip: number;
  toolCooldown: number;
  dual: number;
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
  /** 0..3: the claw looks better the more you invest in it */
  clawTier: number;
  /** creature reaction time multiplier from stealth upgrades */
  stealth: number;
  hearts: number;
  kgMult: number;
  baitMult: number;
  /** how deep the cable lets the claw go (meters) */
  cable: number;
  autoClaws: number;
  autoCooldown: number;
}

export function computeStats(save: SaveData): RunStats {
  const claw = CLAWS_BY_ID[save.equippedClaw] ?? CLAWS_BY_ID.scrap;
  const c = CONFIG.claw;
  const L = (stat: StatKey) => statLevel(save, stat);
  return {
    claw,
    runSeconds: Math.min(CONFIG.run.maxSeconds, CONFIG.run.baseSeconds + L('runTime') * CONFIG.run.secondsPerTimeLevel),
    cable: CONFIG.cable.baseMeters + L('cable'),
    autoClaws: L('autoClaw'),
    autoCooldown: autoCooldown(L('autoSpeed')),
    grip: L('grip'),
    toolCooldown: Math.pow(0.92, L('tools')),
    dual: save.prestiges >= 1 ? L('dual') : 0,
    strikeMs: upgradedTiming(claw.strikeMs, c.minStrikeMs, strikeMult(L('strikeSpeed'))),
    retractMs: upgradedTiming(claw.retractMs, c.minRetractMs, strikeMult(L('strikeSpeed'))),
    cooldownMs: upgradedTiming(claw.cooldownMs, c.minCooldownMs, cooldownMult(L('recovery'))),
    opening: claw.opening + L('opening') * 2,
    strength: claw.strength + strengthBonus(L('strength')),
    precision: L('precision'),
    maxTargets: claw.maxTargets + L('multi'),
    reach: claw.reach,
    lateralSpeed: CONFIG.movement.baseSpeed + L('lateral') * CONFIG.movement.speedPerLevel,
    valueMult: 1 + 0.25 * L('value'),
    frenzySeconds: CONFIG.frenzy.seconds + L('frenzy'),
    turboSeconds: CONFIG.turbo.seconds + L('turbo'),
    stealth: 1 + 0.1 * L('stealth'),
    hearts: 3 + L('hull'),
    kgMult: 1 + 0.1 * L('kg'),
    baitMult: 1 + 0.25 * L('baitTime'),
    clawTier: clawTier(L('strikeSpeed') + L('strength') + L('opening') + L('recovery') + L('precision') + L('multi') * 3),
    density: densityMult(L('density')),
    luck: luckValue(L('luck')),
    schoolBonus: L('schools') * 3,
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
