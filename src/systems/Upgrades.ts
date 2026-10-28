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
  | 'stealth' | 'hull' | 'kg' | 'baitTime' | 'grip' | 'tools' | 'dual';

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Human readable contribution of `n` stat levels. */
export const STAT_TEXT: Record<StatKey, (n: number) => string> = {
  runTime: (n) => `+${n * CONFIG.run.secondsPerTimeLevel}s de mergulho`,
  strikeSpeed: (n) => `reduz ${Math.round((1 - strikeMult(n)) * 100)}% da espera até a velocidade máxima`,
  recovery: (n) => `reduz ${Math.round((1 - cooldownMult(n)) * 100)}% da espera até a recarga mínima`,
  opening: (n) => `+${(n * 1.3).toFixed(1)} px de abertura`,
  strength: (n) => `${n} nível(is) de força · +0,5 por nível, ganho acelerado após 6 níveis somados`,
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
  stealth: (n) => `bichos reagem ${n * 10}% mais devagar`,
  hull: (n) => `+${n} ♥ contra guardiões`,
  kg: (n) => `+${n * 10}% de kg para a cota`,
  grip: (n) => `Disputa: +${n * 4}% de tolerância e +${n * 5}% de força na linha`,
  tools: (n) => `Ferramentas: recarga ${n * 8}% menor`,
  dual: (n) => `Segunda garra: +${n} presa(s) próxima(s) por golpe`,
  baitTime: (n) => `iscas duram +${n * 25}% e chamam +${n} bicho(s)`,
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
  /** Grid position in the tree (root at 0,0; y grows downward). */
  x: number;
  y: number;
  /** Human readable effect at a given level. */
  effect: (level: number) => string;
}

type NodeSpec = Omit<UpgradeDef, 'effect' | 'tree'>;

const NODES: NodeSpec[] = [
  { id: 'core', branch: 'core', name: 'Instinto de Caça', stat: 'runTime', maxLevel: 1, baseCost: 20, parent: null, x: 0, y: 0,
    description: 'O primeiro passo. +3 segundos de mergulho e libera os caminhos da árvore.' },

  { id: 'grip', branch: 'capture', name: 'Domínio da Linha', stat: 'grip', maxLevel: 5, baseCost: 220, parent: 'strength', x: 2, y: -2,
    description: 'Presas gigantes, lendárias e tubarões alimentados iniciam uma disputa. Clique no verde para vencer; errar aumenta a tensão. Cada nível facilita.' },
  { id: 'tools', branch: 'tech', name: 'Arsenal de Caça', stat: 'tools', maxLevel: 5, baseCost: 1200, parent: 'combo', x: -5, y: 0,
    description: 'Melhora a recarga da rede (1º renascimento) e do arpão (2º). Ferramentas usam recarga, não moedas por disparo.' },
  { id: 'dual', branch: 'capture', name: 'Garra Gêmea', stat: 'dual', maxLevel: 2, baseCost: 8000, parent: 'multi2', x: 1, y: -6, requiresPrestige: 1,
    description: 'Após renascer, monte uma segunda garra: ela captura vizinhos do alvo principal. A linha adicional aparece durante o golpe.' },
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
  { id: 'strength2', branch: 'capture', name: 'Pinça de Aço', stat: 'strength', maxLevel: 3, baseCost: 384, parent: 'strength', x: 1, y: -3,
    description: 'Ainda mais força para gigantes e mutantes.' },
  { id: 'strikeSpeed2', branch: 'capture', name: 'Estalo Relâmpago', stat: 'strikeSpeed', maxLevel: 4, baseCost: 448, parent: 'recovery', x: -1, y: -4,
    description: 'O golpe vira um estalo. Peixes ariscos quase não reagem.' },
  { id: 'multi', branch: 'capture', name: 'Captura Múltipla', stat: 'multi', maxLevel: 1, baseCost: 1440, parent: 'strength2', x: 1, y: -4,
    description: 'Pega mais um bicho se ele estiver dentro da área da garra.' },
  { id: 'recovery2', branch: 'capture', name: 'Molas Abissais', stat: 'recovery', maxLevel: 4, baseCost: 832, parent: 'strikeSpeed2', x: -1, y: -5,
    description: 'Recarga ainda menor.' },
  { id: 'multi2', branch: 'capture', name: 'Rede de Garras', stat: 'multi', maxLevel: 1, baseCost: 4160, parent: 'multi', x: 1, y: -5,
    description: 'Mais um alvo por golpe.' },
  { id: 'opening2', branch: 'capture', name: 'Mandíbula Larga', stat: 'opening', maxLevel: 3, baseCost: 512, parent: 'precision', x: -3, y: -3,
    description: 'Abertura ainda maior.' },

  // ── Expedição (para a direita)
  { id: 'runTime', branch: 'expedition', name: 'Mais Tempo', stat: 'runTime', maxLevel: 3, baseCost: 50, parent: 'core', x: 1, y: 0,
    description: 'Cada nível adiciona 3 segundos. Limite de 75s; níveis excedentes dão +3% no valor.' },
  { id: 'lateral', branch: 'expedition', name: 'Natação • Propulsores', stat: 'lateral', maxLevel: 4, baseCost: 35, parent: 'core', x: 2, y: 0,
    description: 'Navega mais rápido para a direita (e para águas fundas).' },
  { id: 'runTime2', branch: 'expedition', name: 'Mergulho Longo', stat: 'runTime', maxLevel: 3, baseCost: 304, parent: 'lateral', x: 3, y: -1,
    description: 'Ainda mais segundos por mergulho.' },
  { id: 'lateral2', branch: 'expedition', name: 'Turbina', stat: 'lateral', maxLevel: 3, baseCost: 336, parent: 'lateral', x: 3, y: 0,
    description: 'Deslocamento lateral ainda mais rápido.' },
  { id: 'timeBonus', branch: 'expedition', name: 'Caça Seletiva', stat: 'value', maxLevel: 3, baseCost: 416, parent: 'runTime2', x: 4, y: -1,
    description: 'Mais valor por captura, sem prolongar o relógio. Escolha suas presas.' },
  { id: 'runTime3', branch: 'expedition', name: 'Fôlego Abissal', stat: 'runTime', maxLevel: 4, baseCost: 1040, parent: 'runTime2', x: 3, y: -2,
    description: 'Mergulhos muito mais longos.' },
  { id: 'lateral3', branch: 'expedition', name: 'Hélice Abissal', stat: 'lateral', maxLevel: 3, baseCost: 1200, parent: 'lateral2', x: 4, y: 0,
    description: 'Velocidade para alcançar o abismo.' },
  { id: 'turbo', branch: 'expedition', name: 'Turbo', stat: 'turbo', maxLevel: 3, baseCost: 384, parent: 'lateral2', x: 3, y: 1,
    description: 'Mais segundos de turbo por mergulho.' },
  { id: 'timeBonus2', branch: 'expedition', name: 'Troféus de Caça', stat: 'value', maxLevel: 3, baseCost: 2400, parent: 'timeBonus', x: 5, y: -1,
    description: 'Colecionadores pagam melhor pelas suas capturas. O relógio continua correndo.' },

  // ── Ecologia (para baixo)
  { id: 'density', branch: 'ecology', name: 'Mais Criaturas', stat: 'density', maxLevel: 3, baseCost: 65, parent: 'runTime', x: 1, y: 1,
    description: 'Mais fauna em cada trecho do oceano.' },
  { id: 'luck', branch: 'ecology', name: 'Sorte Abissal', stat: 'luck', maxLevel: 3, baseCost: 90, parent: 'density', x: 1, y: 2,
    description: 'Aumenta a chance real de espécies raras (retorno decrescente).' },
  { id: 'schools', branch: 'ecology', name: 'Cardumes', stat: 'schools', maxLevel: 3, baseCost: 100, parent: 'density', x: 2, y: 2,
    description: 'Cardumes com mais peixes.' },
  { id: 'luck2', branch: 'ecology', name: 'Faro de Raros', stat: 'luck', maxLevel: 4, baseCost: 512, parent: 'luck', x: 0, y: 3,
    description: 'Ainda mais sorte para raros e épicos.' },
  { id: 'variants', branch: 'ecology', name: 'Variantes', stat: 'variants', maxLevel: 3, baseCost: 272, parent: 'luck', x: 1, y: 3,
    description: 'Mais dourados, gigantes, bioluminescentes e mutantes.' },
  { id: 'density2', branch: 'ecology', name: 'Superpopulação', stat: 'density', maxLevel: 3, baseCost: 576, parent: 'schools', x: 2, y: 3,
    description: 'O oceano fica lotado de vida.' },
  { id: 'luck3', branch: 'ecology', name: 'Sorte Lendária', stat: 'luck', maxLevel: 4, baseCost: 1920, parent: 'luck2', x: 0, y: 4,
    description: 'Lendários e anômalos deixam de ser lenda.' },
  { id: 'variants2', branch: 'ecology', name: 'Mutagênese', stat: 'variants', maxLevel: 3, baseCost: 1152, parent: 'variants', x: 1, y: 4,
    description: 'Variantes especiais muito mais frequentes.' },

  // ── Tecnologia (para a esquerda)
  { id: 'combo', branch: 'tech', name: 'Sincronia de Combo', stat: 'combo', maxLevel: 3, baseCost: 140, parent: 'precision', x: -2, y: -1,
    description: 'Capturas seguidas valem mais e o combo dura mais.' },
  { id: 'perfect', branch: 'tech', name: 'Captura Perfeita', stat: 'perfect', maxLevel: 3, baseCost: 256, parent: 'combo', x: -2, y: 0,
    description: 'Acertar no centro do bicho rende bônus.' },
  { id: 'sonar', branch: 'tech', name: 'Sonar de Raros', stat: 'sonar', maxLevel: 2, baseCost: 640, parent: 'combo', x: -3, y: -1,
    description: 'Seta na borda indica o raro mais próximo fora da tela.' },
  { id: 'combo2', branch: 'tech', name: 'Frenesi', stat: 'combo', maxLevel: 3, baseCost: 960, parent: 'perfect', x: -3, y: 0,
    description: 'Combos ainda mais lucrativos.' },
  { id: 'perfect2', branch: 'tech', name: 'Olho Cirúrgico', stat: 'perfect', maxLevel: 3, baseCost: 1120, parent: 'perfect', x: -2, y: 1,
    description: 'Bônus de captura perfeita maior.' },
  { id: 'sonar2', branch: 'tech', name: 'Sonar Profundo', stat: 'sonar', maxLevel: 2, baseCost: 2880, parent: 'sonar', x: -4, y: -1,
    description: 'Detecta raros muito mais longe.' },
  // ── sealed by guardians: the tree grows as you progress
  { id: 'precision2', branch: 'capture', name: 'Mira Laser', stat: 'precision', maxLevel: 4, baseCost: 1400, parent: 'precision', x: -2, y: -3, requiresBoss: 'kingCrab',
    description: 'Tolerância maior nas bordas dos bichos.' },
  { id: 'stealth', branch: 'capture', name: 'Garra Silenciosa', stat: 'stealth', maxLevel: 5, baseCost: 900, parent: 'recovery', x: -2, y: -4, requiresBoss: 'kingCrab',
    description: 'Motores abafados: os bichos percebem a garra mais tarde.' },
  { id: 'strikeSpeed3', branch: 'capture', name: 'Pistão Turbo', stat: 'strikeSpeed', maxLevel: 5, baseCost: 1600, parent: 'strikeSpeed2', x: -2, y: -5, requiresBoss: 'kingCrab',
    description: 'Golpe ainda mais rápido para os bichos ariscos das costas rochosas.' },
  { id: 'strength3', branch: 'capture', name: 'Hidráulica Pesada', stat: 'strength', maxLevel: 5, baseCost: 2400, parent: 'strength2', x: 2, y: -4, requiresBoss: 'kingCrab',
    description: 'Força para cascos e guardiões maiores.' },
  { id: 'stealth2', branch: 'capture', name: 'Camuflagem Ótica', stat: 'stealth', maxLevel: 5, baseCost: 7000, parent: 'stealth', x: -3, y: -5, requiresBoss: 'colossalEel',
    description: 'A garra quase some na água.' },
  { id: 'strength4', branch: 'capture', name: 'Pinça Titânica', stat: 'strength', maxLevel: 5, baseCost: 9000, parent: 'strength3', x: 2, y: -5, requiresBoss: 'colossalEel',
    description: 'Força de guardião.' },
  { id: 'opening3', branch: 'capture', name: 'Garras Expansíveis', stat: 'opening', maxLevel: 4, baseCost: 4500, parent: 'opening2', x: -4, y: -3, requiresBoss: 'colossalEel',
    description: 'Abertura máxima.' },
  { id: 'strikeSpeed4', branch: 'capture', name: 'Hiperestalo', stat: 'strikeSpeed', maxLevel: 4, baseCost: 14000, parent: 'strikeSpeed3', x: -2, y: -6, requiresBoss: 'wreckOctopus',
    description: 'O golpe mais rápido possível.' },
  { id: 'hull', branch: 'expedition', name: 'Casco Reforçado', stat: 'hull', maxLevel: 3, baseCost: 1500, parent: 'lateral3', x: 4, y: 1, requiresBoss: 'kingCrab',
    description: 'A garra aguenta mais pancadas dos guardiões.' },
  { id: 'baitTime', branch: 'expedition', name: 'Iscas Concentradas', stat: 'baitTime', maxLevel: 4, baseCost: 900, parent: 'timeBonus', x: 4, y: -2, requiresBoss: 'kingCrab',
    description: 'Iscas duram mais e atraem mais bichos.' },
  { id: 'lateral4', branch: 'expedition', name: 'Motor Abissal', stat: 'lateral', maxLevel: 5, baseCost: 5000, parent: 'lateral3', x: 5, y: 0, requiresBoss: 'colossalEel',
    description: 'Para atravessar biomas enormes.' },
  { id: 'runTime4', branch: 'expedition', name: 'Tanques Extras', stat: 'runTime', maxLevel: 3, baseCost: 8000, parent: 'runTime3', x: 3, y: -3, requiresBoss: 'colossalEel',
    description: 'Mais alguns segundos preciosos.' },
  { id: 'turbo2', branch: 'expedition', name: 'Turbo Nitro', stat: 'turbo', maxLevel: 3, baseCost: 3200, parent: 'turbo', x: 3, y: 2, requiresBoss: 'colossalEel',
    description: 'Muito mais turbo por mergulho.' },
  { id: 'hull2', branch: 'expedition', name: 'Blindagem', stat: 'hull', maxLevel: 2, baseCost: 12000, parent: 'hull', x: 5, y: 1, requiresBoss: 'wreckOctopus',
    description: 'Mais resistência contra os guardiões finais.' },
  { id: 'kg', branch: 'ecology', name: 'Rede Densa', stat: 'kg', maxLevel: 5, baseCost: 700, parent: 'density2', x: 3, y: 3, requiresBoss: 'kingCrab',
    description: 'Cada captura conta mais kg para a cota.' },
  { id: 'density3', branch: 'ecology', name: 'Explosão de Vida', stat: 'density', maxLevel: 4, baseCost: 6000, parent: 'density2', x: 2, y: 4, requiresBoss: 'colossalEel',
    description: 'Biomas fundos lotados.' },
  { id: 'variants3', branch: 'ecology', name: 'DNA Alienígena', stat: 'variants', maxLevel: 4, baseCost: 10000, parent: 'variants2', x: 1, y: 5, requiresBoss: 'colossalEel',
    description: 'A radiação do meteoro gera mais mutantes e dourados.' },
  { id: 'kg2', branch: 'ecology', name: 'Balança Viciada', stat: 'kg', maxLevel: 5, baseCost: 8000, parent: 'kg', x: 3, y: 4, requiresBoss: 'wreckOctopus',
    description: 'Ainda mais kg por captura.' },
  { id: 'luck4', branch: 'ecology', name: 'Sorte Meteórica', stat: 'luck', maxLevel: 5, baseCost: 16000, parent: 'luck3', x: 0, y: 5, requiresBoss: 'wreckOctopus',
    description: 'Raros e épicos em toda parte.' },
  { id: 'value', branch: 'tech', name: 'Mercado Negro', stat: 'value', maxLevel: 4, baseCost: 2200, parent: 'perfect2', x: -3, y: 1, requiresBoss: 'kingCrab',
    description: 'Compradores pagam mais por cada bicho.' },
  { id: 'combo3', branch: 'tech', name: 'Frenesi Eterno', stat: 'frenzy', maxLevel: 3, baseCost: 5000, parent: 'combo2', x: -4, y: 0, requiresBoss: 'colossalEel',
    description: 'O frenesi dura mais.' },
  { id: 'value2', branch: 'tech', name: 'Leilão Abissal', stat: 'value', maxLevel: 4, baseCost: 13000, parent: 'value', x: -4, y: 1, requiresBoss: 'wreckOctopus',
    description: 'Colecionadores do mundo inteiro disputam suas capturas.' },
  { id: 'sonar3', branch: 'tech', name: 'Radar Alienígena', stat: 'sonar', maxLevel: 2, baseCost: 20000, parent: 'sonar2', x: -5, y: -1, requiresBoss: 'cathedralJelly',
    description: 'Tecnologia do meteoro: detecta raros a qualquer distância.' },
];

/** Prestige tree, bought with Essência Abissal. Never reset. */
const ESSENCE_NODES: NodeSpec[] = [
  { id: 'e_core', branch: 'essence', name: 'Memória Abissal', stat: 'value', maxLevel: 5, baseCost: 1, parent: null, x: 0, y: 0,
    description: 'Tudo o que você captura vale mais, para sempre.' },
  { id: 'e_time', branch: 'essence', name: 'Fôlego Eterno', stat: 'runTime', maxLevel: 3, baseCost: 2, parent: 'e_core', x: -1, y: -1,
    description: '+3 segundos em todo mergulho.' },
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
export const strikeMult = (l: number) => Math.pow(0.86, l);
export const cooldownMult = (l: number) => Math.pow(0.88, l);

// Preserve the first guardian's progression, then outgrow giant/armored prey.
export const strengthBonus = (l: number) => 0.5 * l + 0.04 * Math.pow(Math.max(0, l - 6), 2);

// Approach the timing floor smoothly so every purchased level still helps.
const upgradedTiming = (base: number, floor: number, mult: number) =>
  Math.min(base, floor) + Math.max(0, base - floor) * mult;
export const densityMult = (l: number) => 1 + 0.16 * l;
export const luckValue = (l: number) => 1 - Math.pow(0.86, l);
export const variantMult = (l: number) => 1 + 0.3 * l;
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
  for (const u of UPGRADES) if (u.stat === stat) n += level(save, u.id);
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
}

export function computeStats(save: SaveData): RunStats {
  const claw = CLAWS_BY_ID[save.equippedClaw] ?? CLAWS_BY_ID.scrap;
  const c = CONFIG.claw;
  const L = (stat: StatKey) => statLevel(save, stat);
  return {
    claw,
    runSeconds: Math.min(CONFIG.run.maxSeconds, CONFIG.run.baseSeconds + L('runTime') * CONFIG.run.secondsPerTimeLevel),
    grip: L('grip'),
    toolCooldown: Math.pow(0.92, L('tools')),
    dual: save.prestiges >= 1 ? L('dual') : 0,
    strikeMs: upgradedTiming(claw.strikeMs, c.minStrikeMs, strikeMult(L('strikeSpeed'))),
    retractMs: upgradedTiming(claw.retractMs, c.minRetractMs, strikeMult(L('strikeSpeed'))),
    cooldownMs: upgradedTiming(claw.cooldownMs, c.minCooldownMs, cooldownMult(L('recovery'))),
    opening: claw.opening + L('opening') * 1.3,
    strength: claw.strength + strengthBonus(L('strength')),
    precision: L('precision'),
    maxTargets: claw.maxTargets + L('multi'),
    reach: claw.reach,
    lateralSpeed: CONFIG.movement.baseSpeed + L('lateral') * CONFIG.movement.speedPerLevel,
    valueMult: 1 + 0.15 * L('value') + 0.03 * Math.max(0, L('runTime') - 15),
    frenzySeconds: CONFIG.frenzy.seconds + L('frenzy'),
    turboSeconds: CONFIG.turbo.seconds + L('turbo'),
    stealth: 1 + 0.1 * L('stealth'),
    hearts: 3 + L('hull'),
    kgMult: 1 + 0.1 * L('kg'),
    baitMult: 1 + 0.25 * L('baitTime'),
    clawTier: clawTier(L('strikeSpeed') + L('strength') + L('opening') + L('recovery') + L('precision') + L('multi') * 3),
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
