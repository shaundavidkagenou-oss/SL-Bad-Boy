import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PatternPlanner, difficultyForSpeed, isPatternSurvivable } from '../src/game/PatternPlanner.js';
import { OBSTACLE_SPECS, GAME, LANES, PLAYER_Z, ROAD, STORAGE_KEY } from '../src/config.js';
import { Player } from '../src/game/Player.js';
import { ScoreManager } from '../src/game/ScoreManager.js';
import { intersects, makeCollider } from '../src/game/Collision.js';
import { advanceSectionCenter, areSectionsContinuous } from '../src/game/RoadMath.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';

function frames(player, count) {
  for (let i = 0; i < count; i += 1) player.update(1 / 60, GAME.baseSpeed, 'running');
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test('500 generated traffic rows always have a survival route', () => {
  const planner = new PatternPlanner(424242);
  const seen = new Set();
  let previousFreeLane = 1;
  for (let index = 0; index < 500; index += 1) {
    const row = planner.next();
    assert.equal(isPatternSurvivable(row), true, `row ${index} was not survivable`);
    assert.ok(Math.abs(row.freeLane - previousFreeLane) <= 1, `row ${index} requires a two-lane snap`);
    previousFreeLane = row.freeLane;
    row.obstacles.forEach((obstacle) => {
      seen.add(obstacle.kind);
      assert.equal(obstacle.oncoming, false);
    });
  }
  assert.deepEqual([...seen].sort(), ['barrier', 'car', 'cone', 'overhead', 'private-bus', 'public-bus', 'tuk-tuk']);
});

test('row spacing remains reactable as running speed increases', () => {
  const planner = new PatternPlanner(7);
  for (const speed of [GAME.baseSpeed, 24, GAME.maxSpeed]) {
    for (let i = 0; i < 100; i += 1) {
      const spacing = planner.spacingForSpeed(speed);
      assert.ok(spacing / speed >= 1.15);
      assert.ok(spacing >= 30);
    }
  }
});

test('higher speed tiers add fair two-lane pressure without changing bus closing speed', () => {
  assert.deepEqual([10, 17, 24, 31, 180].map(difficultyForSpeed), [0, 1, 2, 3, 3]);
  const low = new PatternPlanner(90210);
  const high = new PatternPlanner(90210);
  let lowObstacles = 0;
  let highObstacles = 0;
  let highBuses = 0;
  let previousFreeLane = 1;
  for (let index = 0; index < 64; index += 1) {
    const lowRow = low.next(14);
    const highRow = high.next(34);
    lowObstacles += lowRow.obstacles.length;
    highObstacles += highRow.obstacles.length;
    assert.equal(isPatternSurvivable(highRow), true, `high-speed row ${index} was not survivable`);
    assert.ok(Math.abs(highRow.freeLane - previousFreeLane) <= 1, `high-speed row ${index} needs a two-lane snap`);
    previousFreeLane = highRow.freeLane;
    for (const obstacle of highRow.obstacles) {
      assert.equal(obstacle.oncoming, false, 'procedural traffic must retain its planned arrival time');
      if (obstacle.kind.includes('bus')) highBuses += 1;
    }
    assert.ok(high.spacingForSpeed(34 + 7) / (34 + 7) >= 1.15);
  }
  assert.ok(highObstacles > lowObstacles, `${highObstacles} should exceed ${lowObstacles}`);
  assert.ok(highBuses > 0);
});

test('lane changes are responsive, smooth and clamped to three lanes', () => {
  const player = new Player(new THREE.Scene());
  assert.equal(player.lane, 1);
  player.moveLeft();
  frames(player, 30);
  assert.equal(player.lane, 0);
  assert.ok(Math.abs(player.group.position.x - LANES[0]) < 0.01);
  player.moveLeft();
  assert.equal(player.lane, 0);
  player.moveRight();
  player.moveRight();
  frames(player, 45);
  assert.equal(player.lane, 2);
  assert.ok(Math.abs(player.group.position.x - LANES[2]) < 0.01);
  player.moveRight();
  assert.equal(player.lane, 2);
});

test('jump has real vertical physics, lands, and cannot double-jump', () => {
  const player = new Player(new THREE.Scene());
  assert.equal(player.jump(), true);
  assert.equal(player.jump(), false);
  frames(player, 12);
  assert.ok(player.group.position.y > 1.1);
  assert.ok(player.getCollider().minY > 1.1);
  frames(player, 90);
  assert.equal(player.group.position.y, 0);
  assert.equal(player.velocityY, 0);
  assert.equal(player.jump(), true);
});

test('slide changes collision height and expires reliably', () => {
  const player = new Player(new THREE.Scene());
  const standingHeight = player.getCollider().maxY;
  assert.equal(player.slide(), true);
  assert.equal(player.sliding, true);
  assert.ok(player.getCollider().maxY < standingHeight * 0.5);
  frames(player, 60);
  assert.equal(player.sliding, false);
  assert.equal(player.getCollider().maxY, standingHeight);
  player.slide();
  player.jump();
  assert.equal(player.sliding, false);
  assert.ok(player.velocityY > 0);
});

test('jumping clears a barrier and sliding clears an overhead sign using colliders', () => {
  const player = new Player(new THREE.Scene());
  const barrierSpec = OBSTACLE_SPECS.barrier;
  const barrier = makeCollider(0, 0, PLAYER_Z, barrierSpec.width, barrierSpec.minY, barrierSpec.maxY, barrierSpec.depth);
  assert.equal(intersects(player.getCollider(), barrier), true);
  player.jump();
  frames(player, 12);
  assert.equal(intersects(player.getCollider(), barrier), false);

  player.reset();
  const overheadSpec = OBSTACLE_SPECS.overhead;
  const overhead = makeCollider(0, 0, PLAYER_Z, overheadSpec.width, overheadSpec.minY, overheadSpec.maxY, overheadSpec.depth);
  assert.equal(intersects(player.getCollider(), overhead), true);
  player.slide();
  assert.equal(intersects(player.getCollider(), overhead), false);
});

test('swept collision collects a coin even when a low-FPS frame crosses the player', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  let collected = 0;
  const spawner = new ObstacleSpawner(scene, { onCoin: () => { collected += 1; } });
  spawner.nextSpawnIn = 999;
  spawner.spawnCoin(1, PLAYER_Z, 1, 99);
  spawner.update(0.05, GAME.maxSpeed, player);
  assert.equal(collected, 1);
  assert.equal(spawner.getRowEntries(99).length, 0);
});

test('swept collision also prevents traffic tunnelling at maximum speed', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  let hits = 0;
  const spawner = new ObstacleSpawner(scene, { onHit: () => { hits += 1; } });
  spawner.nextSpawnIn = 999;
  spawner.spawnObstacle('cone', 1, PLAYER_Z, 99);
  const result = spawner.update(0.05, GAME.maxSpeed, player);
  assert.equal(result, 'hit');
  assert.equal(hits, 1);
});

test('score, coins and best-score persistence survive a new manager and reset', () => {
  const storage = memoryStorage();
  const score = new ScoreManager(storage);
  score.update(1, 14);
  score.addCoin();
  assert.equal(score.distance, 14);
  assert.equal(score.coins, 1);
  assert.equal(score.score, 240);
  assert.equal(score.finish(), true);
  assert.equal(storage.values.get(STORAGE_KEY), '240');

  const restored = new ScoreManager(storage);
  assert.equal(restored.bestScore, 240);
  restored.reset();
  assert.equal(restored.score, 0);
  assert.equal(restored.coins, 0);
  assert.equal(restored.distance, 0);
  assert.equal(restored.bestScore, 240);
});

test('blocked storage does not prevent scoring or finishing a run', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const score = new ScoreManager(storage);
  score.addCoin();
  assert.doesNotThrow(() => score.finish());
  assert.equal(score.bestScore, 100);
});

test('road sections stay contiguous through thousands of metres of recycling', () => {
  let centers = Array.from({ length: ROAD.sectionCount }, (_, index) => 15 - index * ROAD.sectionLength);
  for (let step = 0; step < 6000; step += 1) {
    centers = centers.map((center) => advanceSectionCenter(center, GAME.maxSpeed / 60));
    assert.equal(areSectionsContinuous(centers), true, `gap appeared at step ${step}`);
    const intervals = centers.map((center) => [center - 15, center + 15]);
    assert.ok(intervals.some(([min, max]) => PLAYER_Z >= min && PLAYER_Z <= max));
    assert.ok(intervals.some(([min, max]) => 11.8 >= min && 11.8 <= max));
  }
});

test('oncoming buses brake before same-lane vehicles and obstacles instead of passing through them', () => {
  for (const delta of [1 / 60, 0.5]) {
    const scene = new THREE.Scene();
    const player = new Player(scene);
    player.moveLeft();
    frames(player, 30);
    const spawner = new ObstacleSpawner(scene);
    spawner.nextSpawnIn = 999;
    spawner.nextScooterIn = 999;
    const cone = spawner.spawnObstacle('cone', 1, -20, 90, { oncoming: false });
    const bus = spawner.spawnObstacle('public-bus', 1, -45, 91, { oncoming: true });
    for (let frame = 0; frame < 600; frame += 1) spawner.update(delta, 0, player);
    const safeGap = (bus.spec.depth + cone.spec.depth) * 0.5 + 0.5;
    assert.ok(bus.mesh.position.z <= cone.mesh.position.z - safeGap,
      `bus overlapped cone with delta ${delta}: ${bus.mesh.position.z} / ${cone.mesh.position.z}`);
    assert.ok(bus.currentApproachSpeed < bus.approachSpeed, 'bus never reacted to traffic ahead');
    assert.equal(bus.mesh.userData.trafficBraking, true);
  }
});

test('Colombo adds traffic without closing the planner free lane or mutating patterns', () => {
  const pattern = { id: 8, obstacles: [], coins: [], freeLane: 1, requiredAction: null };
  const colombo = new ObstacleSpawner(new THREE.Scene());
  colombo.setDistrict('colombo');
  colombo.spawnPattern(pattern, -60);
  const cityRows = colombo.getRowEntries(8).filter((entry) => entry.type === 'obstacle');
  assert.equal(cityRows.length, 1);
  assert.equal(cityRows.some((entry) => entry.lane === 1), false);
  assert.equal(cityRows.every((entry) => !entry.oncoming), true);
  assert.equal(pattern.obstacles.length, 0);

  const kandy = new ObstacleSpawner(new THREE.Scene());
  kandy.setDistrict('kandy');
  kandy.spawnPattern(pattern, -60);
  assert.equal(kandy.getRowEntries(8).filter((entry) => entry.type === 'obstacle').length, 0);
});
