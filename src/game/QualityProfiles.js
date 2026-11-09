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
    pixelRatioCap: 1.35, pixelRatioFloor: 1.0,
    postprocessing: false, bloom: false, bloomStrength: 0,
    environment: false, clouds: false, godRays: false, longShadows: false,
    roadGlow: false, headlightHalos: false, rainDrops: 90,
    detailDistance: 80, signDistance: 54, animationHz: 20, generationBudget: 1.0,
  }),
  medium: Object.freeze({
    id: 'medium', label: 'MEDIUM', blurb: 'BALANCED',
    pixelRatioCap: 1.6, pixelRatioFloor: 1.2,
    postprocessing: true, bloom: false, bloomStrength: 0,
    environment: true, clouds: false, godRays: false, longShadows: true,
    roadGlow: false, headlightHalos: true, rainDrops: 200,
    detailDistance: 112, signDistance: 80, animationHz: 30, generationBudget: 1.4,
  }),
  high: Object.freeze({
    id: 'high', label: 'HIGH', blurb: 'CINEMATIC',
    pixelRatioCap: 2.0, pixelRatioFloor: 1.25,
    postprocessing: true, bloom: true, bloomStrength: 0.26,
    environment: true, clouds: true, godRays: true, longShadows: true,
    roadGlow: true, headlightHalos: true, rainDrops: 380,
    detailDistance: 160, signDistance: 124, animationHz: 60, generationBudget: 2.0,
  }),
  ultra: Object.freeze({
    id: 'ultra', label: 'ULTRA', blurb: 'SHOWCASE',
    pixelRatioCap: 2.0, pixelRatioFloor: 1.5,
    postprocessing: true, bloom: true, bloomStrength: 0.38,
    environment: true, clouds: true, godRays: true, longShadows: true,
    roadGlow: true, headlightHalos: true, rainDrops: 560,
    detailDistance: 200, signDistance: 156, animationHz: 60, generationBudget: 2.6,
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
  coarsePointer = false, software = false, cores = 4, deviceMemory = 4, gpu = '',
} = {}) {
  if (software) return 'low';
  if (coarsePointer) {
    // The GPU family matters far more than the core count on phones: a 2017
    // eight-core handset with an Adreno 506 must not start on HIGH.
    if (/adreno (4|5)|mali-[t4]|mali-4|powervr|videocore/i.test(gpu)) return 'low';
    if (cores <= 4 || deviceMemory <= 3) return 'low';
    if (cores <= 6 || deviceMemory <= 4 || /adreno 6[0-3]|mali-g5/i.test(gpu)) return 'medium';
    return 'high';
  }
  if (cores <= 4) return 'medium';
  if (cores >= 12 && deviceMemory >= 8) return 'ultra';
  return 'high';
}

export function readDeviceHints(renderer = null) {
  const coarsePointer = typeof window !== 'undefined'
    ? (window.matchMedia?.('(pointer: coarse)').matches ?? false) : false;
  let gpu = '';
  try {
    const context = renderer?.getContext?.();
    const info = context?.getExtension?.('WEBGL_debug_renderer_info');
    if (info) gpu = String(context.getParameter(info.UNMASKED_RENDERER_WEBGL) || '');
  } catch {
    gpu = '';
  }
  return {
    coarsePointer,
    gpu,
    cores: globalThis.navigator?.hardwareConcurrency ?? 4,
    deviceMemory: globalThis.navigator?.deviceMemory ?? 4,
  };
}
