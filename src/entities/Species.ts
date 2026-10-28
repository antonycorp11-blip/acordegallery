// Data-driven species catalog. Sizes/speeds are in world pixels.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'anomalous';
export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'anomalous'];
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Rara',
  epic: 'Épica',
  legendary: 'Lendária',
  anomalous: 'Anômala',
};
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#d8e6ee',
  uncommon: '#6cf27a',
  rare: '#4fb4ff',
  epic: '#c27bff',
  legendary: '#ffc23d',
  anomalous: '#ff4fa3',
};

export type Behavior =
  | 'sessile'
  | 'crawler'
  | 'swimmer'
  | 'burrower'
  | 'eel'
  | 'tank'
  | 'octopus'
  | 'jelly'
  | 'phantom'
  | 'leviathan'
  | 'blinker'
  | 'predator'
  | 'mimic';

export type ShapeKind = 'star' | 'crab' | 'fish' | 'lobster' | 'eel' | 'boxfish' | 'octopus' | 'jelly' | 'angler' | 'eye' | 'shark' | 'chest' | 'puffer' | 'seahorse' | 'hermit' | 'ray';

export interface SpeciesPalette {
  main: string;
  dark: string;
  light: string;
  accent: string;
  eye: string;
}

export interface SpeciesDefinition {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  baseValue: number;
  minDepth: number;
  maxDepth: number;
  /** Multiplier per biome index (reef, rocky, wreck, forest, abyss). */
  biomeWeights: [number, number, number, number, number];
  /** Sprite width/height in world px. */
  size: { w: number; h: number };
  swimSpeed: number;
  perceptionRange: number;
  /** ms between noticing a strike and starting to flee */
  reactionTime: number;
  fleeAcceleration: number;
  fleeSpeed: number;
  mass: number;
  armor: number;
  behavior: Behavior;
  palette: SpeciesPalette;
  shapeParts: ShapeKind;
  special: string[];
}

export const SPECIES: SpeciesDefinition[] = [
  {
    id: 'star', name: 'Estrela-viva', rarity: 'common', baseValue: 10,
    description: 'Quase parada no fundo. Presa fácil para treinar a mira.',
    minDepth: 0, maxDepth: 450, biomeWeights: [1.2, 0.8, 0.2, 0, 0],
    size: { w: 11, h: 11 }, swimSpeed: 3, perceptionRange: 0, reactionTime: 9999,
    fleeAcceleration: 0, fleeSpeed: 0, mass: 0.4, armor: 0, behavior: 'sessile',
    palette: { main: '#ff8a3d', dark: '#c4502a', light: '#ffd27a', accent: '#fff2c4', eye: '#3b1a10' },
    shapeParts: 'star', special: [],
  },
  {
    id: 'coralCrab', name: 'Caranguejo Coral', rarity: 'common', baseValue: 17,
    description: 'Anda pelo terreno e foge de lado quando a garra vem.',
    minDepth: 0, maxDepth: 700, biomeWeights: [1.3, 1.1, 0.5, 0.1, 0],
    size: { w: 14, h: 9 }, swimSpeed: 16, perceptionRange: 34, reactionTime: 150,
    fleeAcceleration: 650, fleeSpeed: 85, mass: 0.9, armor: 0.2, behavior: 'crawler',
    palette: { main: '#ff4a4a', dark: '#a82432', light: '#ff9a7a', accent: '#ffe0c0', eye: '#1a0a12' },
    shapeParts: 'crab', special: [],
  },
  {
    id: 'orangeFish', name: 'Peixe-Laranja', rarity: 'common', baseValue: 19,
    description: 'Nada em pequenos cardumes. Dá um dash quando se assusta.',
    minDepth: 0, maxDepth: 900, biomeWeights: [1.4, 1, 0.4, 0.1, 0],
    size: { w: 13, h: 8 }, swimSpeed: 26, perceptionRange: 38, reactionTime: 125,
    fleeAcceleration: 900, fleeSpeed: 120, mass: 0.6, armor: 0, behavior: 'swimmer',
    palette: { main: '#ff9a1f', dark: '#c25a10', light: '#ffd56a', accent: '#ffffff', eye: '#101018' },
    shapeParts: 'fish', special: ['school'],
  },
  {
    id: 'lanternFish', name: 'Peixe-Lanterninha', rarity: 'common', baseValue: 24,
    description: 'Cardumes luminosos das águas fundas. Comuns, mas valem mais pela profundidade.',
    minDepth: 900, maxDepth: 99999, biomeWeights: [0, 0, 0.5, 1.4, 1.4],
    size: { w: 11, h: 7 }, swimSpeed: 30, perceptionRange: 40, reactionTime: 120,
    fleeAcceleration: 1000, fleeSpeed: 130, mass: 0.6, armor: 0, behavior: 'swimmer',
    palette: { main: '#7a5cff', dark: '#3a1f9e', light: '#c8b8ff', accent: '#7affea', eye: '#fff36a' },
    shapeParts: 'fish', special: ['school', 'glow'],
  },
  {
    id: 'spiderCrab', name: 'Caranguejo-Aranha', rarity: 'common', baseValue: 28,
    description: 'Pernas longas, anda pelo fundo abissal e corre de lado.',
    minDepth: 1200, maxDepth: 99999, biomeWeights: [0, 0, 0.4, 1.2, 1.3],
    size: { w: 16, h: 10 }, swimSpeed: 20, perceptionRange: 38, reactionTime: 160,
    fleeAcceleration: 800, fleeSpeed: 95, mass: 1.3, armor: 0.4, behavior: 'crawler',
    palette: { main: '#f2e6ff', dark: '#8a5cc8', light: '#ffffff', accent: '#ff7ff5', eye: '#2a0a3a' },
    shapeParts: 'crab', special: [],
  },
  {
    id: 'tangFish', name: 'Cirurgião-Azul', rarity: 'common', baseValue: 18,
    description: 'Azul elétrico com cauda amarela. Nada rápido entre os corais.',
    minDepth: 0, maxDepth: 400, biomeWeights: [1.3, 0.5, 0.1, 0, 0],
    size: { w: 13, h: 10 }, swimSpeed: 32, perceptionRange: 40, reactionTime: 135,
    fleeAcceleration: 950, fleeSpeed: 130, mass: 0.7, armor: 0, behavior: 'swimmer',
    palette: { main: '#2f6bff', dark: '#14308a', light: '#7fb0ff', accent: '#ffd23a', eye: '#0a0a14' },
    shapeParts: 'fish', special: ['school'],
  },
  {
    id: 'parrotFish', name: 'Peixe-Papagaio', rarity: 'common', baseValue: 24,
    description: 'Rói coral com o bico. Grande e colorido, mas desconfiado.',
    minDepth: 0, maxDepth: 600, biomeWeights: [1.1, 0.7, 0.2, 0, 0],
    size: { w: 17, h: 10 }, swimSpeed: 22, perceptionRange: 40, reactionTime: 150,
    fleeAcceleration: 800, fleeSpeed: 115, mass: 1.0, armor: 0.2, behavior: 'swimmer',
    palette: { main: '#3ad08a', dark: '#1a7a5a', light: '#9affc8', accent: '#ff6fb0', eye: '#101018' },
    shapeParts: 'fish', special: [],
  },
  {
    id: 'hermitCrab', name: 'Ermitão', rarity: 'common', baseValue: 15,
    description: 'Mora numa concha emprestada. A concha torna mais difícil segurá-lo.',
    minDepth: 0, maxDepth: 500, biomeWeights: [1.2, 0.8, 0.3, 0, 0],
    size: { w: 13, h: 11 }, swimSpeed: 10, perceptionRange: 30, reactionTime: 170,
    fleeAcceleration: 500, fleeSpeed: 60, mass: 0.9, armor: 0.7, behavior: 'crawler',
    palette: { main: '#e87a3a', dark: '#8a3a1a', light: '#ffc89a', accent: '#f4e2c8', eye: '#1a0a12' },
    shapeParts: 'hermit', special: [],
  },
  {
    id: 'pufferfish', name: 'Baiacu', rarity: 'uncommon', baseValue: 38,
    description: 'Lento e redondo, coberto de espinhos. Precisa de força para segurar.',
    minDepth: 0, maxDepth: 900, biomeWeights: [1.0, 1.0, 0.5, 0.2, 0],
    size: { w: 13, h: 12 }, swimSpeed: 10, perceptionRange: 34, reactionTime: 200,
    fleeAcceleration: 300, fleeSpeed: 50, mass: 1.2, armor: 1.0, behavior: 'tank',
    palette: { main: '#e8d27a', dark: '#8a7a3a', light: '#fff6d0', accent: '#5a4a2a', eye: '#141010' },
    shapeParts: 'puffer', special: [],
  },
  {
    id: 'seahorse', name: 'Cavalo-Marinho', rarity: 'uncommon', baseValue: 44,
    description: 'Flutua devagar perto das algas. Fácil de pegar, difícil de achar.',
    minDepth: 10, maxDepth: 500, biomeWeights: [1.0, 0.6, 0.1, 0, 0],
    size: { w: 8, h: 15 }, swimSpeed: 6, perceptionRange: 0, reactionTime: 9999,
    fleeAcceleration: 0, fleeSpeed: 0, mass: 0.4, armor: 0, behavior: 'jelly',
    palette: { main: '#ff9a3a', dark: '#a84a10', light: '#ffd28a', accent: '#fff2c4', eye: '#1a0a00' },
    shapeParts: 'seahorse', special: [],
  },
  {
    id: 'mantaRay', name: 'Raia-Manta', rarity: 'rare', baseValue: 150,
    description: 'Plana pelo recife com asas enormes. Grande, mas percebe tudo.',
    minDepth: 40, maxDepth: 1500, biomeWeights: [0.8, 1.0, 0.6, 0.2, 0],
    size: { w: 34, h: 13 }, swimSpeed: 28, perceptionRange: 52, reactionTime: 110,
    fleeAcceleration: 700, fleeSpeed: 120, mass: 2.4, armor: 0.2, behavior: 'swimmer',
    palette: { main: '#3a4a6a', dark: '#1a2238', light: '#e8eef6', accent: '#7ad8ff', eye: '#0a0a10' },
    shapeParts: 'ray', special: [],
  },
  {
    id: 'blueLobster', name: 'Lagosta Azul', rarity: 'uncommon', baseValue: 42,
    description: 'Vive em fendas. Se sentir a garra, recua com um golpe de cauda.',
    minDepth: 40, maxDepth: 2200, biomeWeights: [0.5, 1.6, 1.3, 0.8, 0.4],
    size: { w: 20, h: 9 }, swimSpeed: 12, perceptionRange: 48, reactionTime: 130,
    fleeAcceleration: 1500, fleeSpeed: 170, mass: 1.6, armor: 0.6, behavior: 'burrower',
    palette: { main: '#2f7bff', dark: '#1a3f9e', light: '#7fc2ff', accent: '#e6f4ff', eye: '#0a0a14' },
    shapeParts: 'lobster', special: ['hide'],
  },
  {
    id: 'stripedEel', name: 'Enguia-Listrada', rarity: 'uncommon', baseValue: 46,
    description: 'Corpo ondulado e trajetória errática. Difícil de prever.',
    minDepth: 60, maxDepth: 6000, biomeWeights: [0.4, 1.3, 1.4, 1.0, 0.6],
    size: { w: 30, h: 6 }, swimSpeed: 34, perceptionRange: 40, reactionTime: 140,
    fleeAcceleration: 1000, fleeSpeed: 130, mass: 1.3, armor: 0, behavior: 'eel',
    palette: { main: '#ffe14a', dark: '#2d2a3a', light: '#fff6b0', accent: '#2d2a3a', eye: '#ff3a3a' },
    shapeParts: 'eel', special: [],
  },
  {
    id: 'boxfish', name: 'Peixe-Cofre', rarity: 'uncommon', baseValue: 72,
    description: 'Casco duro e lento. Exige uma garra com força.',
    minDepth: 20, maxDepth: 2500, biomeWeights: [0.9, 1.2, 1.3, 0.8, 0.3],
    size: { w: 15, h: 12 }, swimSpeed: 12, perceptionRange: 30, reactionTime: 220,
    fleeAcceleration: 260, fleeSpeed: 45, mass: 2.4, armor: 1.0, behavior: 'tank',
    palette: { main: '#f2d24a', dark: '#9b7a1e', light: '#fff2a0', accent: '#3a6cff', eye: '#141010' },
    shapeParts: 'boxfish', special: ['armored'],
  },
  {
    id: 'thiefOctopus', name: 'Polvo Ladrão', rarity: 'rare', baseValue: 120,
    description: 'Camufla-se no fundo e dispara com uma nuvem de tinta.',
    minDepth: 120, maxDepth: 7000, biomeWeights: [0.3, 1.2, 1.5, 1.4, 1.1],
    size: { w: 15, h: 15 }, swimSpeed: 14, perceptionRange: 48, reactionTime: 125,
    fleeAcceleration: 1300, fleeSpeed: 160, mass: 1.8, armor: 0.3, behavior: 'octopus',
    palette: { main: '#c94cff', dark: '#6a1f9e', light: '#f0a8ff', accent: '#ffe86a', eye: '#14081a' },
    shapeParts: 'octopus', special: ['ink', 'camouflage'],
  },
  {
    id: 'neonJelly', name: 'Água-Viva Neon', rarity: 'rare', baseValue: 95,
    description: 'Flutua devagar. Dá choque e atrasa a garra (exceto a Elétrica).',
    minDepth: 200, maxDepth: 9000, biomeWeights: [0.2, 0.6, 1.4, 2.2, 2.6],
    size: { w: 13, h: 17 }, swimSpeed: 8, perceptionRange: 0, reactionTime: 9999,
    fleeAcceleration: 0, fleeSpeed: 0, mass: 0.8, armor: 0, behavior: 'jelly',
    palette: { main: '#4dfff0', dark: '#1a9ec2', light: '#d6fffb', accent: '#ff6fe8', eye: '#ffffff' },
    shapeParts: 'jelly', special: ['shock', 'glow'],
  },
  {
    id: 'goldenCrab', name: 'Caranguejo Dourado', rarity: 'rare', baseValue: 210,
    description: 'Valioso e esperto. Um troféu dourado para sua coleção.',
    minDepth: 0, maxDepth: 3000, biomeWeights: [1, 1, 1, 0.6, 0.3],
    size: { w: 14, h: 9 }, swimSpeed: 26, perceptionRange: 52, reactionTime: 95,
    fleeAcceleration: 1100, fleeSpeed: 130, mass: 1.2, armor: 0.3, behavior: 'crawler',
    palette: { main: '#ffcf2e', dark: '#b07a10', light: '#fff5a8', accent: '#ffffff', eye: '#2a1a00' },
    shapeParts: 'crab', special: ['shiny'],
  },
  {
    id: 'ghostFish', name: 'Peixe-Fantasma', rarity: 'epic', baseValue: 380,
    description: 'Brilho pálido e reflexos absurdos. Só um golpe veloz o pega.',
    minDepth: 1200, maxDepth: 99999, biomeWeights: [0, 0, 0.6, 1.4, 1.8],
    size: { w: 17, h: 8 }, swimSpeed: 50, perceptionRange: 72, reactionTime: 75,
    fleeAcceleration: 2200, fleeSpeed: 230, mass: 1.4, armor: 0, behavior: 'phantom',
    palette: { main: '#c8f4ff', dark: '#6aa8d8', light: '#ffffff', accent: '#7affea', eye: '#2a0a4a' },
    shapeParts: 'fish', special: ['glow'],
  },
  {
    id: 'lanternLeviathan', name: 'Leviatã-Lanterna', rarity: 'legendary', baseValue: 1500,
    description: 'Gigante com isca luminosa. Só garras muito fortes o seguram.',
    minDepth: 3000, maxDepth: 99999, biomeWeights: [0, 0, 0, 0.8, 1.6],
    size: { w: 40, h: 24 }, swimSpeed: 16, perceptionRange: 60, reactionTime: 260,
    fleeAcceleration: 280, fleeSpeed: 55, mass: 5.5, armor: 1.5, behavior: 'leviathan',
    palette: { main: '#5a2a8a', dark: '#2a0f4a', light: '#9a5fd0', accent: '#fff36a', eye: '#ff4f6a' },
    shapeParts: 'angler', special: ['glow', 'lure'],
  },
  {
    id: 'wanderingEye', name: 'Olho Errante', rarity: 'anomalous', baseValue: 4000,
    description: 'Ninguém sabe o que é. Pisca e some de onde estava.',
    minDepth: 5000, maxDepth: 99999, biomeWeights: [0, 0, 0, 0.3, 1.5],
    size: { w: 18, h: 18 }, swimSpeed: 12, perceptionRange: 70, reactionTime: 140,
    fleeAcceleration: 0, fleeSpeed: 0, mass: 3.0, armor: 1.0, behavior: 'blinker',
    palette: { main: '#ffffff', dark: '#d0a0c0', light: '#ffffff', accent: '#ff2f7f', eye: '#1a0020' },
    shapeParts: 'eye', special: ['blink', 'glow'],
  },
  {
    id: 'mimic', name: 'Baú-Mímico', rarity: 'epic', baseValue: 320,
    description: 'Finge ser um baú de tesouro. Se perceber a garra, mostra os dentes e pula para longe.',
    minDepth: 300, maxDepth: 99999, biomeWeights: [0, 0, 0, 0, 0],
    size: { w: 14, h: 11 }, swimSpeed: 0, perceptionRange: 46, reactionTime: 120,
    fleeAcceleration: 1600, fleeSpeed: 150, mass: 1.8, armor: 0.8, behavior: 'mimic',
    palette: { main: '#a0623a', dark: '#5a3018', light: '#d89a5a', accent: '#ffd84a', eye: '#ff3a3a' },
    shapeParts: 'chest', special: ['treasureLook'],
  },
  {
    id: 'hammerShark', name: 'Tubarão-Martelo', rarity: 'epic', baseValue: 650,
    description: 'Aparece em eventos e devora os bichos pequenos. Morde garras fracas.',
    minDepth: 0, maxDepth: 99999, biomeWeights: [0, 0, 0, 0, 0],
    size: { w: 46, h: 16 }, swimSpeed: 62, perceptionRange: 0, reactionTime: 9999,
    fleeAcceleration: 0, fleeSpeed: 0, mass: 3.5, armor: 1.0, behavior: 'predator',
    palette: { main: '#6a8296', dark: '#3a4a5a', light: '#e6eef2', accent: '#2a3440', eye: '#0a0a10' },
    shapeParts: 'shark', special: ['bite', 'event'],
  },
  {
    id: 'chest', name: 'Baú Submerso', rarity: 'uncommon', baseValue: 70,
    description: 'Tesouro perdido no fundo do mar.',
    minDepth: 0, maxDepth: 99999, biomeWeights: [0, 0, 0, 0, 0],
    size: { w: 14, h: 11 }, swimSpeed: 0, perceptionRange: 0, reactionTime: 9999,
    fleeAcceleration: 0, fleeSpeed: 0, mass: 1.0, armor: 0, behavior: 'sessile',
    palette: { main: '#a0623a', dark: '#5a3018', light: '#d89a5a', accent: '#ffd84a', eye: '#000000' },
    shapeParts: 'chest', special: ['object', 'treasure'],
  },
];

const sharkBase = SPECIES.find(s => s.id === 'hammerShark')!;
SPECIES.push(
  { ...sharkBase, id: 'reefShark', name: 'Tubarão do Recife', rarity: 'rare', baseValue: 360, mass: 2.8, armor: 0.6,
    description: 'Caçador ágil. Engorda ao comer peixes atraídos por iscas.', size: { w: 35, h: 14 }, swimSpeed: 48,
    palette: { ...sharkBase.palette, main: '#71a7b8', light: '#d1fff2', accent: '#4be6c4' } },
  { ...sharkBase, id: 'tigerShark', name: 'Tubarão-Tigre', rarity: 'legendary', baseValue: 1200, mass: 5, armor: 1.2,
    description: 'Minichefe voraz. Alimente-o para criar um troféu gigante, depois vença a disputa.', size: { w: 58, h: 21 }, swimSpeed: 42,
    palette: { ...sharkBase.palette, main: '#a9934c', dark: '#4b432c', light: '#f5e0a2', accent: '#ff9345' } },
);

/** Species that count for the catalog, orders and "new species" (not objects). */
export const isCreature = (def: SpeciesDefinition) => !def.special.includes('object');

export const SPECIES_BY_ID: Record<string, SpeciesDefinition> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

export type VariantId = 'normal' | 'mini' | 'giant' | 'silver' | 'albino' | 'golden' | 'biolum' | 'mutant' | 'crystal';

export interface VariantDef {
  id: VariantId;
  label: string;
  scale: number;
  valueMult: number;
  strengthMult: number;
  speedMult: number;
}

export const VARIANTS: Record<VariantId, VariantDef> = {
  normal: { id: 'normal', label: '', scale: 1, valueMult: 1, strengthMult: 1, speedMult: 1 },
  mini: { id: 'mini', label: 'Mini', scale: 0.7, valueMult: 0.7, strengthMult: 0.6, speedMult: 1.15 },
  giant: { id: 'giant', label: 'Gigante', scale: 1.5, valueMult: 2.6, strengthMult: 1.7, speedMult: 0.85 },
  silver: { id: 'silver', label: 'Prateado', scale: 1, valueMult: 2, strengthMult: 1, speedMult: 1.05 },
  albino: { id: 'albino', label: 'Albino', scale: 1, valueMult: 2.5, strengthMult: 1, speedMult: 1 },
  golden: { id: 'golden', label: 'Dourado', scale: 1, valueMult: 4, strengthMult: 1, speedMult: 1.1 },
  biolum: { id: 'biolum', label: 'Bioluminescente', scale: 1, valueMult: 1.8, strengthMult: 1, speedMult: 1 },
  mutant: { id: 'mutant', label: 'Mutante', scale: 1.15, valueMult: 3, strengthMult: 1.3, speedMult: 1.05 },
  crystal: { id: 'crystal', label: 'Cristalino', scale: 1.05, valueMult: 6, strengthMult: 1.2, speedMult: 1.1 },
};

/** Catalog order of the collectible variants. */
export const VARIANT_ORDER: VariantId[] = ['normal', 'mini', 'giant', 'silver', 'albino', 'golden', 'biolum', 'mutant', 'crystal'];

/** Variants a species can ever show up as (catalog slots). */
export function variantsFor(def: SpeciesDefinition): VariantId[] {
  return VARIANT_ORDER.filter((v) => {
    if (v === 'golden') return !def.special.includes('shiny');
    if (v === 'biolum') return !def.special.includes('glow') && def.maxDepth >= 400;
    if (v === 'crystal') return def.maxDepth >= 1800;
    return true;
  });
}

export function strengthRequired(def: SpeciesDefinition, variant: VariantId): number {
  return (def.mass + def.armor) * VARIANTS[variant].strengthMult;
}
