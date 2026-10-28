// Central balance & tuning. Change numbers here, not deep inside systems.

/** Internal resolution: fixed height, width follows the screen's aspect. */
export const VIEW_H = 270;
export const VIEW_MIN_W = 400;
export const VIEW_MAX_W = 640;
export let VIEW_W = 480;

/** Picks the internal width for a screen aspect (w/h) so the game fills it edge to edge. */
export function setViewAspect(aspect: number): number {
  const w = Math.round(VIEW_H * (Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9));
  VIEW_W = Math.max(VIEW_MIN_W, Math.min(VIEW_MAX_W, w));
  return VIEW_W;
}

export const CONFIG = {
  run: {
    baseSeconds: 30,
    maxSeconds: 75,
    secondsPerTimeLevel: 3,
    warnSeconds: 5,
  },
  camera: {
    /** Screen-space Y where the seabed should sit (0..VIEW_H). */
    seabedScreenY: 200,
    followLerp: 2.2,
    minWorldX: 0,
  },
  movement: {
    baseSpeed: 120, // world px / s
    speedPerLevel: 32,
    accel: 2400,
    friction: 3200,
  },
  terrain: {
    baseY: 0,
    /** Visual seabed descent per world px (pure framing; depth uses depthAt). */
    slope: 0.035,
    chunkWidth: 240,
  },
  claw: {
    restTipY: 38, // screen y of the claw mouth while idle (head fully visible)
    anticipationMs: 25,
    closeMs: 50,
    inputBufferMs: 140,
    minStrikeMs: 55,
    minRetractMs: 80,
    minCooldownMs: 60,
  },
  economy: {
    /** value multiplier = 1 + sqrt(depth)/depthDivisor */
    depthDivisor: 20,
    comboWindowMs: 3200,
    comboStep: 0.1,
    comboMaxBonus: 0.5,
    perfectBaseBonus: 0.1,
    perfectRadiusFrac: 0.35,
  },
  spawn: {
    maxAlive: 70,
    /** Base creatures per chunk per biome index. */
    perChunk: [5.2, 4.4, 3.8, 3.8, 3.4],
    trickleSeconds: 1.4,
    activeMargin: 260,
    freezeDistance: 760,
    despawnDistance: 3200,
    schoolMin: 3,
    schoolMax: 5,
  },
  rarityWeights: {
    common: 100,
    uncommon: 30,
    rare: 7,
    epic: 2.2,
    legendary: 0.6,
    anomalous: 0.25,
  },
  /** Luck multiplies rarity weight by (1 + luck * tier^1.5 * luckTierFactor). */
  luckTierFactor: 0.9,
  variants: {
    mini: 0.08,
    giant: 0.05,
    golden: 0.018,
    biolum: 0.07, // needs depth >= 400
    mutant: 0.035, // needs depth >= 1500
  },
  timeBonus: {
    golden: 3,
    goldenCrab: 5,
    legendary: 10,
  },
  upgradeGrowth: 1.55,
  frenzy: { combo: 5, seconds: 4, haste: 0.55, valueMult: 2 },
  turbo: { seconds: 2.5, rechargePerSecond: 0.12, speedMult: 2 },
  events: { firstAfter: 9, minGap: 12, maxGap: 20, currentPush: 55, currentSeconds: 5 },
  aquarium: { perMinute: 0.05, capHours: 8, levelMult: 0.5 },
  chest: { chunkChance: 0.16, mimicChance: 0.3, starChance: 0.25 },
  quota: { baseKg: 24, growth: 1.3, coinsPerKg: 7, licenseValue: 0.04, fine: 0.15 },
  bait: { maxActive: 2, sinkSpeed: 170, callEvery: 1.3 },
};
