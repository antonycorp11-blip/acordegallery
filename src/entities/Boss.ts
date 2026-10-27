// Biome guardians: huge creatures that block the way. Capture them by grabbing
// their glowing weak points one by one (progress persists between dives).

import type { SpeciesDefinition, SpeciesPalette, ShapeKind } from './Species';

export interface BossDef {
  id: string;
  name: string;
  /** arena center, world x (end of a biome) */
  x: number;
  shape: ShapeKind;
  w: number;
  h: number;
  /** height above the seabed (0 = walks on it) */
  hover: number;
  palette: SpeciesPalette;
  /** weak points as fractions of w/h from the center (sprite facing right) */
  weakPoints: { dx: number; dy: number }[];
  /** where the crown sits (same units) */
  crown: { dx: number; dy: number };
  strength: number;
  /** grabs needed on each weak point */
  hits: number;
  /** creatures taken from its biome before it wakes up */
  rage: number;
  /** projectile thrown when it attacks */
  shot: { color: string; dark: string; count: number; speed: number };
  /** diary entry unlocked when it is captured */
  lore: string;
  coins: number;
  stars: number;
  /** touching the body shocks non-shockproof claws */
  shocking?: boolean;
  intro: string;
}

export const BOSSES: BossDef[] = [
  {
    id: 'kingCrab', name: 'Caranguejo-Rei', x: 5800, shape: 'crab', w: 116, h: 72, hover: 0,
    palette: { main: '#e8323a', dark: '#7a1020', light: '#ff8a6a', accent: '#ffd84a', eye: '#1a0008' },
    weakPoints: [{ dx: -0.41, dy: -0.29 }, { dx: 0.41, dy: -0.29 }, { dx: -0.13, dy: -0.22 }, { dx: 0.13, dy: -0.22 }],
    crown: { dx: 0, dy: -0.42 },
    strength: 3.2, hits: 2, coins: 1200, stars: 4, rage: 60,
    shot: { color: '#9a8a7a', dark: '#4a3a30', count: 3, speed: 120 },
    lore: 'O Caranguejo-Rei comia os restos que a radiação do meteoro trazia na correnteza. Cresceu cem vezes o tamanho normal — e aprendeu a defender o recife.',
    intro: 'Você tirou comida demais do recife! Desvie das pedras e agarre cada ponto brilhante 2 vezes.',
  },
  {
    id: 'colossalEel', name: 'Moreia Colossal', x: 14800, shape: 'eel', w: 170, h: 24, hover: 46,
    palette: { main: '#5ad06a', dark: '#1a4a2a', light: '#c8ff9a', accent: '#1a4a2a', eye: '#ffe14a' },
    weakPoints: [{ dx: -0.36, dy: -0.3 }, { dx: -0.12, dy: -0.36 }, { dx: 0.12, dy: -0.4 }, { dx: 0.34, dy: -0.44 }],
    crown: { dx: 0.5, dy: -0.75 },
    strength: 3.8, hits: 2, coins: 4000, stars: 5, rage: 90,
    shot: { color: '#7a8a6a', dark: '#2a3a2a', count: 4, speed: 135 },
    lore: 'A Moreia Colossal seguiu o brilho do meteoro rumo às fendas. Nas suas escamas foram achados cristais que não existem em nenhuma tabela periódica.',
    intro: 'Uma moreia do tamanho de um navio. Precisa de força para segurá-la.',
  },
  {
    id: 'wreckOctopus', name: 'Polvo do Naufrágio', x: 26800, shape: 'octopus', w: 100, h: 100, hover: 6,
    palette: { main: '#8a3ad0', dark: '#3a0f6a', light: '#d8a0ff', accent: '#ffe86a', eye: '#14081a' },
    weakPoints: [{ dx: -0.22, dy: -0.3 }, { dx: 0.22, dy: -0.3 }, { dx: 0, dy: -0.44 }, { dx: 0, dy: -0.12 }],
    crown: { dx: 0, dy: -0.54 },
    strength: 4.6, hits: 2, coins: 10000, stars: 6, rage: 120,
    shot: { color: '#5a4a3a', dark: '#2a1a10', count: 4, speed: 140 },
    lore: 'Os navios afundados não foram tempestades: algo no fundo puxava o metal. O Polvo do Naufrágio guarda os destroços como um tesouro... ou como um aviso.',
    intro: 'Mora entre os destroços. Esconde os pontos fracos com frequência.',
  },
  {
    id: 'cathedralJelly', name: 'Água-Viva Catedral', x: 41800, shape: 'jelly', w: 90, h: 120, hover: 70,
    palette: { main: '#4dfff0', dark: '#1a7ec2', light: '#e6fffb', accent: '#ff6fe8', eye: '#ffffff' },
    weakPoints: [{ dx: -0.3, dy: -0.2 }, { dx: 0.3, dy: -0.2 }, { dx: -0.12, dy: -0.38 }, { dx: 0.12, dy: -0.38 }, { dx: 0, dy: -0.1 }],
    crown: { dx: 0, dy: -0.52 },
    strength: 5.4, hits: 2, coins: 22000, stars: 8, shocking: true, rage: 150,
    shot: { color: '#7affff', dark: '#1a7ec2', count: 5, speed: 150 },
    lore: 'A Água-Viva Catedral pulsa no mesmo ritmo do meteoro. Os cientistas da Cooperativa acham que ela é uma antena viva.',
    intro: 'Tocar no corpo dá choque. Só garras isoladas escapam ilesas.',
  },
  {
    id: 'primordial', name: 'Leviatã Primordial', x: 58000, shape: 'angler', w: 150, h: 90, hover: 30,
    palette: { main: '#3a1a6a', dark: '#14062a', light: '#7a4ac0', accent: '#fff36a', eye: '#ff2f5a' },
    weakPoints: [
      { dx: -0.22, dy: -0.24 }, { dx: -0.04, dy: -0.32 }, { dx: 0.16, dy: -0.32 },
      { dx: 0.32, dy: -0.18 }, { dx: 0.36, dy: 0.06 }, { dx: -0.16, dy: 0.14 },
    ],
    crown: { dx: 0.12, dy: -0.44 },
    strength: 6.8, hits: 2, coins: 60000, stars: 12, rage: 200,
    shot: { color: '#b6ff3a', dark: '#3a1a6a', count: 6, speed: 160 },
    lore: 'O Leviatã Primordial dormia enrolado no meteoro. Agora que foi capturado, o caminho até a pedra alienígena está livre. O que ela quer com o nosso oceano?',
    intro: 'O guardião final do abismo. Capture-o e o oceano é seu.',
  },
];

export const LORE_INTRO =
  'Há décadas, um meteoro alienígena caiu no ponto mais fundo do oceano. Sua radiação reescreveu o DNA da vida marinha: peixes que brilham, mutantes, criaturas que não deveriam existir — e guardiões gigantes que defendem seus territórios. A Cooperativa Abissal contratou você e sua garra para coletar espécimes, bater as cotas… e chegar até o meteoro.';

/** Rage needed and current progress toward waking a guardian. */
export function bossAwake(b: BossDef, rage: Record<string, number>): boolean {
  return (rage[b.id] ?? 0) >= b.rage;
}

export const BOSSES_BY_ID: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

export interface Checkpoint {
  name: string;
  x: number;
  /** boss that must be defeated to unlock it */
  requires: string | null;
  /** distance record needed (mid-biome buoys) */
  minDistance?: number;
}

export const CHECKPOINTS: Checkpoint[] = [
  { name: 'Recife', x: 0, requires: null },
  { name: 'Recife Profundo', x: 3000, requires: null, minDistance: 3000 },
  { name: 'Costa Rochosa', x: 6200, requires: 'kingCrab' },
  { name: 'Fendas Rochosas', x: 10500, requires: 'kingCrab', minDistance: 10500 },
  { name: 'Naufrágios', x: 15200, requires: 'colossalEel' },
  { name: 'Cemitério de Navios', x: 21000, requires: 'colossalEel', minDistance: 21000 },
  { name: 'Floresta Abissal', x: 27200, requires: 'wreckOctopus' },
  { name: 'Bosque Luminoso', x: 34500, requires: 'wreckOctopus', minDistance: 34500 },
  { name: 'Abismo', x: 42200, requires: 'cathedralJelly' },
  { name: 'Fenda Primordial', x: 50000, requires: 'cathedralJelly', minDistance: 50000 },
];

export function checkpointUnlocked(bosses: string[], i: number, bestDistance = 0): boolean {
  const c = CHECKPOINTS[i];
  if (!c) return false;
  if (c.requires !== null && !bosses.includes(c.requires)) return false;
  return bestDistance >= (c.minDistance ?? 0);
}

/** First guardian not yet defeated (they are fought in order). */
export function nextBoss(bosses: string[]): BossDef | null {
  return BOSSES.find((b) => !bosses.includes(b.id)) ?? null;
}

/** A sprite-compatible definition so bosses reuse the procedural creature art. */
export function bossSpriteDef(b: BossDef): SpeciesDefinition {
  return {
    id: 'boss_' + b.id, name: b.name, description: '', rarity: 'legendary', baseValue: 0, minDepth: 0, maxDepth: 0,
    biomeWeights: [0, 0, 0, 0, 0], size: { w: b.w, h: b.h }, swimSpeed: 0, perceptionRange: 0, reactionTime: 0,
    fleeAcceleration: 0, fleeSpeed: 0, mass: 0, armor: 0, behavior: 'sessile', palette: b.palette, shapeParts: b.shape, special: [],
  };
}

export type BossHit = 'weak' | 'body' | null;

const OPEN_SECONDS = 2.4;
const SHUT_SECONDS = 1.3;
const ATTACK_EVERY = 7;
const TELEGRAPH = 0.9;

/** Runtime state of a guardian in the current dive. */
export class Boss {
  x: number;
  y = 0;
  t = 0;
  damage: number;
  open = true;
  private cycle = 0;
  flinch = 0;
  attackTimer = ATTACK_EVERY * 0.6;
  /** >0 while winding up an attack (seconds left) */
  telegraph = 0;
  defeated = false;
  dying = 0;
  facing = -1;

  constructor(readonly def: BossDef, damage: number) {
    this.x = def.x;
    this.damage = Math.min(damage, def.weakPoints.length * def.hits);
  }

  get total(): number {
    return this.def.weakPoints.length * this.def.hits;
  }

  get hp(): number {
    return this.total - this.damage;
  }

  /** Index of the weak point currently exposed (one at a time). */
  get activeWeak(): number {
    return Math.min(this.def.weakPoints.length - 1, Math.floor(this.damage / this.def.hits));
  }

  weakPointPos(i: number): { x: number; y: number } {
    const wp = this.def.weakPoints[i];
    return { x: this.x + wp.dx * this.def.w * this.facing, y: this.y + wp.dy * this.def.h };
  }

  /** Returns 'slam' on the frame an attack lands. */
  update(dt: number, seabedY: (x: number) => number): 'slam' | null {
    this.t += dt;
    if (this.flinch > 0) this.flinch -= dt;
    if (this.defeated) {
      this.dying += dt;
      return null;
    }
    const d = this.def;
    this.x = d.x + Math.sin(this.t * 0.45) * 34;
    this.facing = Math.cos(this.t * 0.45) > 0 ? 1 : -1;
    const floor = seabedY(this.x);
    this.y = floor - d.h / 2 - d.hover + (d.hover > 0 ? Math.sin(this.t * 1.3) * 5 : 0) + 2;
    // weak point opens and shuts in a rhythm (more often shut when hurt)
    this.cycle += dt;
    const shut = SHUT_SECONDS + this.damage * 0.15;
    if (this.open && this.cycle > OPEN_SECONDS) {
      this.open = false;
      this.cycle = 0;
    } else if (!this.open && this.cycle > shut) {
      this.open = true;
      this.cycle = 0;
    }
    if (this.telegraph > 0) {
      this.telegraph -= dt;
      if (this.telegraph <= 0) {
        this.attackTimer = ATTACK_EVERY - this.damage * 0.4;
        return 'slam';
      }
      return null;
    }
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) this.telegraph = TELEGRAPH;
    return null;
  }

  private bodyBox() {
    const d = this.def;
    return { x0: this.x - d.w * 0.42, x1: this.x + d.w * 0.42, y0: this.y - d.h * 0.42, y1: this.y + d.h * 0.42 };
  }

  /** What a claw mouth of radius r touches at (cx, cy). */
  hitTest(cx: number, cy: number, r: number): BossHit {
    if (this.defeated) return null;
    if (this.open) {
      const p = this.weakPointPos(this.activeWeak);
      if (Math.hypot(cx - p.x, cy - p.y) <= r + 6) return 'weak';
    }
    const b = this.bodyBox();
    const nx = Math.max(b.x0, Math.min(cx, b.x1));
    const ny = Math.max(b.y0, Math.min(cy, b.y1));
    return Math.hypot(cx - nx, cy - ny) <= r ? 'body' : null;
  }

  /** First contact of a vertical dive down column x, from y0 to y1. */
  pathHit(x: number, y0: number, y1: number, r: number): { y: number; kind: 'weak' | 'body' } | null {
    if (this.defeated) return null;
    let best: { y: number; kind: 'body' } | null = null;
    if (this.open) {
      const p = this.weakPointPos(this.activeWeak);
      const rr = r + 6;
      const dx = Math.abs(x - p.x);
      if (dx <= rr) {
        // an exposed weak point is an opening: diving straight onto it always reaches it
        const y = Math.max(y0, p.y - Math.sqrt(rr * rr - dx * dx));
        if (y <= y1) return { y: Math.max(y0, p.y), kind: 'weak' };
      }
    }
    const b = this.bodyBox();
    const dx = Math.max(0, Math.max(b.x0 - x, x - b.x1));
    if (dx <= r) {
      const y = Math.max(y0, b.y0 - Math.sqrt(r * r - dx * dx));
      if (y <= y1) best = { y, kind: 'body' };
    }
    return best;
  }

  /** Registers a successful grab on the exposed weak point. */
  hitWeak(): boolean {
    this.damage++;
    this.flinch = 0.5;
    this.open = false;
    this.cycle = 0;
    if (this.damage >= this.total) {
      this.defeated = true;
      return true;
    }
    return false;
  }
}
