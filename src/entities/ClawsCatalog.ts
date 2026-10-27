// Claw families. Every stat here is consumed by real gameplay code
// (Claw.ts timing, Hit.ts area/strength, Game.ts specials).

export type ClawTag = 'stun' | 'shockproof' | 'multi' | 'quiet' | 'heavy' | 'magnet' | 'tentacle' | 'gravity' | 'biteproof';

export interface ClawDefinition {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Star cost (stars come from orders, bosses and daily gifts). */
  stars: number;
  /** Requirement to buy: best depth reached (m). */
  unlockDepth: number;
  strength: number;
  /** Contact radius in px. */
  opening: number;
  /** Max screen y the tip can reach. */
  reach: number;
  strikeMs: number;
  retractMs: number;
  cooldownMs: number;
  maxTargets: number;
  /** Stun duration (ms) applied around the impact point. */
  stunMs: number;
  stunRadius: number;
  /** Multiplier on creature reaction time (higher = they react later). */
  reactionMult: number;
  tags: ClawTag[];
  look: {
    prongs: number;
    metal: string;
    metalDark: string;
    metalLight: string;
    accent: string;
    width: number;
  };
}

export const CLAWS: ClawDefinition[] = [
  {
    id: 'scrap', name: 'Sucata', price: 0, stars: 0, unlockDepth: 0,
    description: 'Duas pontas prateadas. Equilibrada, boa para bichos pequenos.',
    strength: 2.4, opening: 9, reach: 262, strikeMs: 125, retractMs: 170, cooldownMs: 210,
    maxTargets: 1, stunMs: 0, stunRadius: 0, reactionMult: 1, tags: [],
    look: { prongs: 2, metal: '#b8c2cc', metalDark: '#6a7480', metalLight: '#eef4f8', accent: '#d07a3a', width: 9 },
  },
  {
    id: 'lightning', name: 'Relâmpago', price: 650, stars: 0, unlockDepth: 0,
    description: 'Corpo leve e golpe absurdamente veloz. Pouca força.',
    strength: 1.8, opening: 8, reach: 262, strikeMs: 70, retractMs: 105, cooldownMs: 120,
    maxTargets: 1, stunMs: 0, stunRadius: 0, reactionMult: 1.3, tags: ['quiet'],
    look: { prongs: 2, metal: '#ff4a5a', metalDark: '#8a1a2a', metalLight: '#ffd0d4', accent: '#ffe14a', width: 7 },
  },
  {
    id: 'hydraulic', name: 'Hidráulica', price: 1500, stars: 0, unlockDepth: 150,
    description: 'Robusta e amarela. Lenta, mas abre muito e esmaga cascos.',
    strength: 4.6, opening: 13, reach: 270, strikeMs: 165, retractMs: 230, cooldownMs: 330,
    maxTargets: 1, stunMs: 0, stunRadius: 0, reactionMult: 0.9, tags: ['heavy'],
    look: { prongs: 2, metal: '#ffcc1f', metalDark: '#a06a0a', metalLight: '#fff2a0', accent: '#2a2a2a', width: 13 },
  },
  {
    id: 'electric', name: 'Elétrica', price: 3200, stars: 0, unlockDepth: 500,
    description: 'Descarga no impacto: atordoa bichos próximos e ignora choques.',
    strength: 2.6, opening: 10, reach: 266, strikeMs: 115, retractMs: 160, cooldownMs: 240,
    maxTargets: 1, stunMs: 1400, stunRadius: 34, reactionMult: 1, tags: ['stun', 'shockproof'],
    look: { prongs: 2, metal: '#3a8cff', metalDark: '#1a3a8a', metalLight: '#bfe4ff', accent: '#7affff', width: 10 },
  },
  {
    id: 'triple', name: 'Tripla', price: 5200, stars: 0, unlockDepth: 1000,
    description: 'Três dentes e área larga. Captura até 3 bichos por golpe.',
    strength: 2.2, opening: 15, reach: 266, strikeMs: 140, retractMs: 190, cooldownMs: 300,
    maxTargets: 3, stunMs: 0, stunRadius: 0, reactionMult: 1, tags: ['multi'],
    look: { prongs: 3, metal: '#4fe08a', metalDark: '#1a7a44', metalLight: '#c8ffd8', accent: '#e8e8e8', width: 15 },
  },
  {
    id: 'magnetic', name: 'Magnética', price: 6500, stars: 4, unlockDepth: 1500,
    description: 'Ao descer, puxa para o trajeto os bichos que estão perto da coluna.',
    strength: 2.8, opening: 10, reach: 266, strikeMs: 120, retractMs: 165, cooldownMs: 250,
    maxTargets: 1, stunMs: 0, stunRadius: 0, reactionMult: 1, tags: ['magnet'],
    look: { prongs: 2, metal: '#d0d4e0', metalDark: '#a8283a', metalLight: '#ffffff', accent: '#3a6cff', width: 12 },
  },
  {
    id: 'mutant', name: 'Mutante', price: 9500, stars: 6, unlockDepth: 2500,
    description: 'Organismo vivo: tentáculos agarram até 2 vizinhos e enfraquecem quem está perto. Imune a mordidas.',
    strength: 3.4, opening: 11, reach: 266, strikeMs: 115, retractMs: 160, cooldownMs: 260,
    maxTargets: 1, stunMs: 700, stunRadius: 40, reactionMult: 1.1, tags: ['tentacle', 'biteproof'],
    look: { prongs: 4, metal: '#b04cff', metalDark: '#4a1a7a', metalLight: '#f0a8ff', accent: '#7aff6a', width: 12 },
  },
  {
    id: 'gravity', name: 'Gravitacional', price: 22000, stars: 10, unlockDepth: 4000,
    description: 'Colapso no impacto: atrai tudo num raio grande para a boca. Até 4 alvos.',
    strength: 5.2, opening: 12, reach: 270, strikeMs: 135, retractMs: 185, cooldownMs: 320,
    maxTargets: 4, stunMs: 0, stunRadius: 0, reactionMult: 1, tags: ['gravity', 'shockproof', 'biteproof'],
    look: { prongs: 3, metal: '#7a3aff', metalDark: '#2a0a5a', metalLight: '#ffe14a', accent: '#ffe14a', width: 14 },
  },
];

export const CLAWS_BY_ID: Record<string, ClawDefinition> = Object.fromEntries(CLAWS.map((c) => [c.id, c]));
