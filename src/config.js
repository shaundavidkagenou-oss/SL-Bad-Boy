export const LANES = Object.freeze([-3.1, 0, 3.1]);
export const PLAYER_Z = 4;
export const ROAD = Object.freeze({ sectionLength: 30, sectionCount: 9, recycleZ: 45 });

export const GAME = Object.freeze({
  baseSpeed: 14,
  maxSpeed: 36,
  acceleration: 0.22,
  gravity: 24,
  jumpVelocity: 9.2,
  slideDuration: 0.78,
  scooterDuration: 10,
  scooterMultiplier: 10,
  spawnZ: -162,
});

// Colliders are local to each obstacle's origin. Y values are deliberately
// explicit so jumping and sliding are physical game mechanics, not animation-only.
export const OBSTACLE_SPECS = Object.freeze({
  'public-bus': { width: 2.55, depth: 6.8, minY: 0, maxY: 3.15, avoid: 'lane' },
  'private-bus': { width: 2.55, depth: 6.8, minY: 0, maxY: 3.15, avoid: 'lane' },
  car: { width: 2.05, depth: 3.9, minY: 0, maxY: 1.55, avoid: 'lane' },
  'tuk-tuk': { width: 1.7, depth: 2.55, minY: 0, maxY: 2.05, avoid: 'lane' },
  cone: { width: 0.82, depth: 0.82, minY: 0, maxY: 1.02, avoid: 'jump' },
  barrier: { width: 2.5, depth: 0.72, minY: 0, maxY: 1.08, avoid: 'jump' },
  overhead: { width: 2.58, depth: 0.65, minY: 1.04, maxY: 2.55, avoid: 'slide' },
});

export const STORAGE_KEY = 'lanka-run-schoolboy-rush-best-v1';
