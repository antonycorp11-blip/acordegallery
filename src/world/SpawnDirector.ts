import { CONFIG, VIEW_W } from '../config';
import { hash3, randInt, seededRandom, weightedIndex, type Rand } from '../core/RNG';
import { Creature, type School } from '../entities/Creature';
import { RARITIES, SPECIES, SPECIES_BY_ID, type SpeciesDefinition, type VariantId } from '../entities/Species';
import { biomeIndexAt } from './Biomes';
import { depthAt } from './Depth';
import type { Terrain } from './Terrain';

export interface SpawnParams {
  density: number;
  luck: number;
  schoolBonus: number;
  variantMult: number;
}

/** Soft habitat weight: 1 inside [min,max], fading out shortly outside it. */
function depthWeight(def: SpeciesDefinition, depth: number): number {
  if (depth >= def.minDepth && depth <= def.maxDepth) return 1;
  const below = depth < def.minDepth;
  const span = below ? Math.max(30, def.minDepth * 0.3) : Math.max(40, def.maxDepth * 0.2);
  const d = below ? def.minDepth - depth : depth - def.maxDepth;
  return d > span ? 0 : 1 - d / span;
}

export function speciesWeights(depth: number, biome: number, luck: number): number[] {
  return SPECIES.map((def) => {
    const tier = RARITIES.indexOf(def.rarity);
    const base = CONFIG.rarityWeights[def.rarity];
    const luckF = 1 + luck * Math.pow(tier, 1.5) * CONFIG.luckTierFactor;
    return base * luckF * def.biomeWeights[biome] * depthWeight(def, depth);
  });
}

export function pickSpecies(depth: number, biome: number, luck: number, r: Rand): SpeciesDefinition | null {
  const i = weightedIndex(r, speciesWeights(depth, biome, luck));
  return i < 0 ? null : SPECIES[i];
}

export function pickVariant(def: SpeciesDefinition, depth: number, variantMult: number, r: Rand): VariantId {
  const v = CONFIG.variants;
  const roll = r();
  let acc = 0;
  const table: [VariantId, number][] = [
    ['golden', def.special.includes('shiny') ? 0 : v.golden * variantMult],
    ['mutant', depth >= 1500 ? v.mutant * variantMult : 0],
    ['biolum', depth >= 400 && !def.special.includes('glow') ? v.biolum * variantMult : 0],
    ['giant', v.giant * variantMult],
    ['mini', v.mini],
  ];
  for (const [id, p] of table) {
    acc += p;
    if (roll < acc) return id;
  }
  return 'normal';
}

export function chunkPopulation(biome: number, density: number, r: Rand): number {
  const base = CONFIG.spawn.perChunk[biome] * density;
  return Math.max(0, Math.round(base * (0.7 + r() * 0.6)));
}

/**
 * Populates chunks once as they come into range (no respawn when the camera
 * returns) and trickles new arrivals in from just off-screen to keep areas
 * alive, always under a hard cap of live entities.
 */
export class SpawnDirector {
  readonly creatures: Creature[] = [];
  readonly schools: School[] = [];
  private spawned = new Set<number>();
  private trickle = 0;
  private schoolId = 1;
  private rng: Rand;

  constructor(private terrain: Terrain, private params: SpawnParams, seed: number) {
    this.rng = seededRandom(hash3(seed, 991));
  }

  get alive(): number {
    let n = 0;
    for (const c of this.creatures) if (!c.removed && c.state !== 'CAPTURED') n++;
    return n;
  }

  /** camX = left edge of view in world px. avoidX = current aim world x. */
  update(dt: number, camX: number, avoidX: number, moveDir: number): void {
    const cw = CONFIG.terrain.chunkWidth;
    const m = CONFIG.spawn.activeMargin;
    // Free the population budget BEFORE filling newly visible chunks.
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (c.removed || c.state === 'CAPTURED' || c.x < camX - m || c.x > camX + VIEW_W + m) {
        if (c.school) c.school.alive--;
        this.creatures.splice(i, 1);
      }
    }
    const first = Math.max(0, Math.floor((camX - m) / cw));
    const last = Math.floor((camX + VIEW_W + m) / cw);
    for (let i = first; i <= last; i++) {
      if (this.spawned.has(i)) continue;
      this.spawned.add(i);
      this.populateChunk(i, camX, avoidX);
    }

    this.ensureCoverage(camX);
    // Keep history bounded during long exploration; coverage handles revisits.
    for (const index of this.spawned) if (index < first - 8 || index > last + 8) this.spawned.delete(index);
    this.trickle -= dt * this.params.density;
    if (this.trickle <= 0) {
      this.trickle = CONFIG.spawn.trickleSeconds * (0.7 + this.rng() * 0.6);
      const target = (CONFIG.spawn.perChunk[biomeIndexAt(camX + VIEW_W / 2)] * this.params.density * (VIEW_W + 2 * m)) / cw;
      if (this.countNear(camX - m, camX + VIEW_W + m) < target * 0.8) {
        // arrive from the edge we are heading to (or a random edge)
        const side = moveDir !== 0 ? moveDir : this.rng() < 0.5 ? -1 : 1;
        const x = side > 0 ? camX + VIEW_W + 30 + this.rng() * 80 : camX - 30 - this.rng() * 80;
        if (x > 20) {
          const before = this.creatures.length;
          this.spawnAt(x);
          for (let i = before; i < this.creatures.length; i++) {
            const c = this.creatures[i];
            c.facing = -side;
            if (c.school) c.school.facing = -side;
          }
        }
      }
    }

    // cleanup: drop removed and very distant creatures
    const cx = camX + VIEW_W / 2;
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (c.removed || Math.abs(c.x - cx) > CONFIG.spawn.despawnDistance) {
        if (c.school) c.school.alive--;
        this.creatures.splice(i, 1);
      }
    }
    for (let i = this.schools.length - 1; i >= 0; i--) if (this.schools[i].alive <= 0) this.schools.splice(i, 1);
  }

  /** Reserve habitat-appropriate wildlife in each visible 120px lane. */
  private ensureCoverage(camX: number): void {
    for (let left = camX; left < camX + VIEW_W; left += 120) {
      const right = Math.min(left + 120, camX + VIEW_W);
      const living = this.creatures.filter(c => c.hittable && c.state !== 'CAPTURED' && c.x >= left && c.x < right && !c.def.special.includes('object'));
      for (let n = living.length; n < 2; n++) {
        if (this.alive >= CONFIG.spawn.maxAlive) {
          const far = this.creatures.filter(c => c.state !== 'CAPTURED' && (c.x < camX || c.x >= camX + VIEW_W))
            .sort((a,b) => Math.abs(b.x - (left + 60)) - Math.abs(a.x - (left + 60)))[0];
          if (!far) break;
          far.removed = true;
        }
        const x = left + (right - left) * (n === 0 ? 0.35 : 0.7);
        const depth = depthAt(x);
        const def = pickSpecies(depth, biomeIndexAt(x), this.params.luck, this.rng)
          ?? SPECIES_BY_ID[depth >= 900 ? 'lanternFish' : 'orangeFish'];
        const c = this.spawnSpecial(def, pickVariant(def, depth, this.params.variantMult, this.rng), x, null, this.rng() < 0.5 ? -1 : 1);
        if (!c.onFloor) c.y = this.terrain.seabedY(x) - 45 - this.rng() * 75;
      }
    }
  }

  countNear(x0: number, x1: number): number {
    let n = 0;
    for (const c of this.creatures) if (!c.removed && c.x >= x0 && c.x <= x1) n++;
    return n;
  }

  private populateChunk(index: number, camX: number, avoidX: number): void {
    const cw = CONFIG.terrain.chunkWidth;
    const x0 = index * cw;
    const r = seededRandom(hash3(this.terrain.seed, index, 313));
    const biome = biomeIndexAt(x0 + cw / 2);
    const n = chunkPopulation(biome, this.params.density, r);
    const visible = x0 + cw > camX && x0 < camX + VIEW_W;
    for (let k = 0; k < n; k++) {
      let x = x0 + 8 + r() * (cw - 16);
      // never pop a creature right under the claw
      if (visible && Math.abs(x - avoidX) < 26) x += x < avoidX ? -30 : 30;
      this.spawnAt(x, r, index);
    }
    // sunken treasure — and things pretending to be treasure
    if (index > 0 && r() < CONFIG.chest.chunkChance && this.alive < CONFIG.spawn.maxAlive) {
      const x = x0 + 20 + r() * (cw - 40);
      const depth = depthAt(x);
      const mimic = depth >= 300 && r() < CONFIG.chest.mimicChance;
      this.spawnSpecial(SPECIES_BY_ID[mimic ? 'mimic' : 'chest'], 'normal', x, null, r() < 0.5 ? 1 : -1);
    }
  }

  /** Places a specific creature (events, treasure). y = null puts it on the floor. */
  spawnSpecial(def: SpeciesDefinition, variant: VariantId, x: number, y: number | null, facing: number): Creature {
    const floor = this.terrain.seabedY(x);
    const c = new Creature(def, variant, x, y ?? floor - def.size.h / 2, hash3(this.terrain.seed, Math.floor(x * 13), this.schoolId * 7 + this.creatures.length));
    if (y === null && c.onFloor) c.y = floor - c.h / 2 + 1;
    c.facing = facing;
    c.homeX = x;
    this.creatures.push(c);
    return c;
  }

  /** A whole school entering from one side (golden school event). */
  spawnSchool(def: SpeciesDefinition, variant: VariantId, x: number, count: number, facing: number): void {
    const floor = this.terrain.seabedY(x);
    const school: School = { id: this.schoolId++, x, y: floor - 70, facing, homeX: x + facing * 300, turnTimer: 99, speed: def.swimSpeed * 1.6, alive: 0 };
    // events may go slightly over the normal cap, never unbounded
    for (let i = 0; i < count && this.alive < CONFIG.spawn.maxAlive + 10; i++) {
      const c = new Creature(def, variant, x + (this.rng() - 0.5) * 30, school.y, hash3(this.terrain.seed, this.schoolId, i));
      c.school = school;
      c.schoolOffX = (this.rng() - 0.5) * 40;
      c.schoolOffY = (this.rng() - 0.5) * 22;
      school.alive++;
      this.creatures.push(c);
    }
    this.schools.push(school);
  }

  /** Spawns one creature (or a school). Returns number spawned. */
  spawnAt(x: number, r: Rand = this.rng, chunkIndex?: number): number {
    if (this.alive >= CONFIG.spawn.maxAlive - 16) return 0;
    const depth = depthAt(x);
    const biome = biomeIndexAt(x);
    const def = pickSpecies(depth, biome, this.params.luck, r);
    if (!def) return 0;
    const floor = this.terrain.seabedY(x);
    const seed = hash3(this.terrain.seed, Math.floor(x * 7), Math.floor(r() * 1e9));

    if (def.special.includes('school')) {
      const count = randInt(r, CONFIG.spawn.schoolMin, CONFIG.spawn.schoolMax) + this.params.schoolBonus;
      const school: School = {
        id: this.schoolId++, x, y: floor - 40 - r() * 60, facing: r() < 0.5 ? -1 : 1,
        homeX: x, turnTimer: 2 + r() * 3, speed: def.swimSpeed * (0.8 + r() * 0.4), alive: 0,
      };
      let made = 0;
      for (let i = 0; i < count && this.alive < CONFIG.spawn.maxAlive - 16; i++) {
        const variant = pickVariant(def, depth, this.params.variantMult, r);
        const c = new Creature(def, variant, x + (r() - 0.5) * 30, school.y + (r() - 0.5) * 16, seed + i * 31);
        c.school = school;
        c.schoolOffX = (r() - 0.5) * 34;
        c.schoolOffY = (r() - 0.5) * 18;
        school.alive++;
        this.creatures.push(c);
        made++;
      }
      this.schools.push(school);
      return made;
    }

    const variant = pickVariant(def, depth, this.params.variantMult, r);
    let px = x;
    if (def.behavior === 'burrower' && chunkIndex !== undefined) {
      // lobsters live by crevices when a chunk has one
      const cr = this.terrain.getChunk(chunkIndex).crevices;
      if (cr.length) px = cr[Math.floor(r() * cr.length)];
    }
    const c = new Creature(def, variant, px, floor - def.size.h, seed);
    if (!c.onFloor) c.y = floor - c.altitude;
    if (def.behavior === 'jelly') c.y = floor - 50 - r() * 90;
    this.creatures.push(c);
    return 1;
  }
}
