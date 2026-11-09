/**
 * Explicit graphics tiers for SL BAD BOY: COLOMBO AFTER HOURS.
 *
 * Every tier only removes cost — resolution, post-processing, reflection
 * probes, decorative effects and scenery draw distance. Geometry, the three
 * gameplay lanes, collision data and the road itself are identical on all
 * tiers, so gameplay never changes with the graphics setting.
 */
export const QUALITY_TIERS = Object.freeze(['low', 'medium', 'high', 'ultra']);

const PROFILES = {
  low: Object.freeze({
    id: 'low', label: 'LOW', blurb: 'STEADY FRAMES',
    pixelRatioCap: 0.85, pixelRatioFloor: 0.7,
    postprocessing: false, bloom: false, bloomStrength: 0,
    environment: false, clouds: false, godRays: false, longShadows: false,
    roadGlow: false, headlightHalos: false, rainDrops: 90,
    detailDistance: 120, animationHz: 20, generationBudget: 1.0,
  }),
  medium: Object.freeze({
    id: 'medium', label: 'MEDIUM', blurb: 'BALANCED',
    pixelRatioCap: 1.0, pixelRatioFloor: 0.8,
    postprocessing: true, bloom: false, bloomStrength: 0,
    environment: true, clouds: false, godRays: false, longShadows: true,
    roadGlow: false, headlightHalos: true, rainDrops: 200,
    detailDistance: 165, animationHz: 30, generationBudget: 1.4,
  }),
  high: Object.freeze({
    id: 'high', label: 'HIGH', blurb: 'CINEMATIC',
    pixelRatioCap: 1.35, pixelRatioFloor: 0.9,
    postprocessing: true, bloom: true, bloomStrength: 0.26,
    environment: true, clouds: true, godRays: true, longShadows: true,
    roadGlow: true, headlightHalos: true, rainDrops: 380,
    detailDistance: 210, animationHz: 60, generationBudget: 2.0,
  }),
  ultra: Object.freeze({
    id: 'ultra', label: 'ULTRA', blurb: 'SHOWCASE',
    pixelRatioCap: 2.0, pixelRatioFloor: 1.0,
    postprocessing: true, bloom: true, bloomStrength: 0.38,
    environment: true, clouds: true, godRays: true, longShadows: true,
    roadGlow: true, headlightHalos: true, rainDrops: 560,
    detailDistance: 265, animationHz: 60, generationBudget: 2.6,
  }),
};

export function qualityProfile(tier) {
  return PROFILES[tier] ?? PROFILES.high;
}

/**
 * Picks a starting tier from measurable device hints. Nothing here claims to
 * measure frame rate; it only avoids starting an obviously weak device on
 * Ultra or a desktop GPU on Low.
 */
export function detectQualityTier({
  coarsePointer = false, software = false, cores = 4, deviceMemory = 4,
} = {}) {
  if (software) return 'low';
  if (coarsePointer) {
    if (cores <= 4 || deviceMemory <= 3) return 'low';
    if (cores <= 6) return 'medium';
    return 'high';
  }
  if (cores <= 4) return 'medium';
  if (cores >= 12 && deviceMemory >= 8) return 'ultra';
  return 'high';
}

export function readDeviceHints() {
  const coarsePointer = typeof window !== 'undefined'
    ? (window.matchMedia?.('(pointer: coarse)').matches ?? false) : false;
  return {
    coarsePointer,
    cores: globalThis.navigator?.hardwareConcurrency ?? 4,
    deviceMemory: globalThis.navigator?.deviceMemory ?? 4,
  };
}
