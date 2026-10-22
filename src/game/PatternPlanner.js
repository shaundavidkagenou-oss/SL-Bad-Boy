import { OBSTACLE_SPECS } from '../config.js';
import { mulberry32, pick, shuffled } from './Random.js';

function coinLine(lane, count = 3, height = 1) {
  const coins = [];
  const middle = (count - 1) / 2;
  for (let i = 0; i < count; i += 1) {
    coins.push({ lane, z: (i - middle) * 3, y: height });
  }
  return coins;
}

/**
 * Produces readable rows with a guaranteed survival route.
 * A row either leaves a reachable empty lane, or every lane uses the same
 * jump/slide response. Two-lane rows choose an empty lane adjacent to the
 * previous one so high-speed rows cannot demand an impossible cross-road snap.
 */
export function difficultyForSpeed(speed) {
  if (speed >= 31) return 3;
  if (speed >= 24) return 2;
  if (speed >= 17) return 1;
  return 0;
}

export class PatternPlanner {
  constructor(seed = Date.now()) {
    this.reset(seed);
  }

  reset(seed = Date.now()) {
    this.seed = seed;
    this.random = mulberry32(seed);
    this.rowIndex = 0;
    this.lastFreeLane = 1;
  }

  chooseFreeLane(open = [0, 1, 2]) {
    const reachable = open.filter((lane) => Math.abs(lane - this.lastFreeLane) <= 1);
    const lane = pick(this.random, reachable.length ? reachable : open);
    this.lastFreeLane = lane;
    return lane;
  }

  rowWithFreeLane(kinds, coinCount = 3) {
    const freeLane = this.chooseFreeLane();
    const blocked = shuffled(this.random, [0, 1, 2].filter((lane) => lane !== freeLane));
    const obstacles = kinds.map((kind, index) => ({ kind, lane: blocked[index] }));
    return { obstacles, coins: coinLine(freeLane, coinCount), requiredAction: null, freeLane };
  }

  randomLane() {
    return Math.floor(this.random() * 3);
  }

  next(speed = 14) {
    const phase = this.rowIndex % 8;
    const tier = difficultyForSpeed(speed);
    const previousFreeLane = this.lastFreeLane;
    this.rowIndex += 1;
    let row;

    switch (phase) {
      case 0: {
        const lane = this.chooseFreeLane();
        row = { obstacles: [], coins: coinLine(lane, 5), requiredAction: null, freeLane: lane };
        break;
      }
      case 1: {
        const busLane = Math.floor(this.random() * 3);
        const freeLane = this.chooseFreeLane([0, 1, 2].filter((lane) => lane !== busLane));
        row = {
          obstacles: [{ kind: 'public-bus', lane: busLane }],
          coins: coinLine(freeLane),
          requiredAction: null,
          freeLane,
        };
        break;
      }
      case 2:
        row = this.rowWithFreeLane(['private-bus', 'cone']);
        break;
      case 3:
        row = this.rowWithFreeLane(['car', 'tuk-tuk']);
        break;
      case 4: {
        const lane = this.lastFreeLane;
        row = {
          obstacles: [0, 1, 2].map((laneIndex) => ({ kind: 'barrier', lane: laneIndex })),
          coins: [
            { lane, z: -3, y: 1 },
            { lane, z: 0, y: 2.05 },
            { lane, z: 3, y: 1 },
          ],
          requiredAction: 'jump',
          freeLane: lane,
        };
        break;
      }
      case 5: {
        const lane = this.lastFreeLane;
        row = {
          obstacles: [0, 1, 2].map((laneIndex) => ({ kind: 'overhead', lane: laneIndex })),
          coins: coinLine(lane, 3, 0.52),
          requiredAction: 'slide',
          freeLane: lane,
        };
        break;
      }
      case 6: {
        const vehicles = shuffled(this.random, ['public-bus', 'private-bus', 'car', 'tuk-tuk']);
        row = this.rowWithFreeLane(vehicles.slice(0, 2));
        break;
      }
      default:
        row = this.rowWithFreeLane([pick(this.random, ['car', 'tuk-tuk', 'private-bus']), 'barrier']);
        break;
    }

    // Speed tiers add decisions, not impossible reactions: every replacement
    // still uses the same adjacent guaranteed free lane as the base planner.
    if (tier >= 1 && phase === 0) {
      this.lastFreeLane = previousFreeLane;
      const vehicles = [pick(this.random, ['car', 'tuk-tuk', 'private-bus'])];
      if (tier >= 2) vehicles.push(pick(this.random, ['cone', 'barrier', 'car']));
      row = this.rowWithFreeLane(vehicles);
    } else if (tier >= 2 && phase === 1) {
      this.lastFreeLane = previousFreeLane;
      row = this.rowWithFreeLane(['public-bus', pick(this.random, ['car', 'tuk-tuk', 'cone'])]);
    }

    if (tier > 0) {
      for (const obstacle of row.obstacles) {
        if (obstacle.kind !== 'public-bus' && obstacle.kind !== 'private-bus') continue;
        obstacle.oncoming = tier === 3 || this.random() < 0.22 + tier * 0.16;
      }
    }
    row.difficulty = tier;
    row.id = this.rowIndex - 1;
    return row;
  }

  spacingForSpeed(speed) {
    return Math.max(25, speed * 0.95) + this.random() * 4;
  }
}

export function isPatternSurvivable(pattern) {
  for (let lane = 0; lane < 3; lane += 1) {
    if (!pattern.obstacles.some((obstacle) => obstacle.lane === lane)) return true;
  }

  const responses = new Set(pattern.obstacles.map((obstacle) => OBSTACLE_SPECS[obstacle.kind]?.avoid));
  return responses.size === 1 && (responses.has('jump') || responses.has('slide'));
}
