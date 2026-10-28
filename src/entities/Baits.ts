// Baits: thrown from the claw, they sink to a spot and pull certain creatures
// in for a few seconds (and call more of them in from the edges).

import type { SpeciesDefinition, VariantId } from './Species';

export interface BaitDef {
  id: string;
  name: string;
  description: string;
  price: number;
  stars: number;
  /** best depth (m) needed to buy */
  unlockDepth: number;
  /** species attracted (ids) */
  species: string[];
  /** attraction radius in world px */
  radius: number;
  seconds: number;
  /** extra creatures it calls in while active */
  calls: number;
  /** variant forced/boosted on called creatures */
  variant?: VariantId;
  variantChance?: number;
  weaken?: number;
  chum?: boolean;
  color: string;
  dark: string;
}

export const BAITS: BaitDef[] = [
  { id: 'sedative', name: 'Isca Calmante', description: 'Enfraquece em 35% e atrasa a reação das presas na nuvem violeta. Ideal para gigantes.', price: 90, stars: 0, unlockDepth: 100,
    species: ['*'], radius: 170, seconds: 8, calls: 3, weaken: 0.65, color: '#c798ff', dark: '#65388a' },
  { id: 'chum', name: 'Banquete dos Tubarões', description: 'Chama um cardume e um tubarão. Deixe-o comer: ele cresce, vale mais e provoca o guardião. Capture-o após 3 refeições para a encomenda.', price: 85, stars: 0, unlockDepth: 80,
    species: ['orangeFish', 'lanternFish', 'hammerShark', 'reefShark', 'tigerShark'], radius: 230, seconds: 12, calls: 8, chum: true, color: '#ff7777', dark: '#8a2838' },
  {
    id: 'algae', name: 'Pão de Algas', price: 12, stars: 0, unlockDepth: 0,
    description: 'Atrai peixes de cardume e o Peixe-Cofre. Barata e eficiente no raso.',
    species: ['orangeFish', 'lanternFish', 'boxfish'],
    radius: 150, seconds: 8, calls: 4, color: '#8be33a', dark: '#3a7a1a',
  },
  {
    id: 'shrimp', name: 'Camarão Fresco', price: 30, stars: 0, unlockDepth: 0,
    description: 'Atrai caranguejos e lagostas — às vezes até o Caranguejo Dourado.',
    species: ['coralCrab', 'spiderCrab', 'blueLobster', 'goldenCrab'],
    radius: 150, seconds: 8, calls: 4, color: '#ff8a6a', dark: '#a83a2a',
  },
  {
    id: 'squid', name: 'Carne de Lula', price: 70, stars: 0, unlockDepth: 150,
    description: 'Atrai predadores e bichos grandes: enguias, polvos e até tubarões.',
    species: ['stripedEel', 'thiefOctopus', 'boxfish', 'hammerShark', 'lanternLeviathan'],
    radius: 170, seconds: 9, calls: 3, color: '#e8d0e0', dark: '#8a5a7a',
  },
  {
    id: 'glow', name: 'Isca Luminosa', price: 110, stars: 0, unlockDepth: 500,
    description: 'Brilha no escuro: atrai águas-vivas, peixes-fantasma e lanterninhas. Variantes bioluminescentes.',
    species: ['neonJelly', 'ghostFish', 'lanternFish', 'stripedEel', 'wanderingEye'],
    radius: 180, seconds: 9, calls: 4, variant: 'biolum', variantChance: 0.5, color: '#7affea', dark: '#1a8a7a',
  },
  {
    id: 'golden', name: 'Isca Dourada', price: 240, stars: 1, unlockDepth: 300,
    description: 'Irresistível: atrai qualquer bicho e chama variantes douradas (valem 4×).',
    species: ['*'],
    radius: 190, seconds: 9, calls: 5, variant: 'golden', variantChance: 0.6, color: '#ffd84a', dark: '#a86f0c',
  },
];

export const BAITS_BY_ID: Record<string, BaitDef> = Object.fromEntries(BAITS.map((b) => [b.id, b]));

export function baitAttracts(bait: BaitDef, def: SpeciesDefinition): boolean {
  if (def.special.includes('object')) return false;
  return bait.species.includes('*') || bait.species.includes(def.id);
}
