import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHARACTERS, getCharacter } from '../src/game/CharacterCatalog.js';
import { ShopManager } from '../src/game/ShopManager.js';
import { JuiceInventory, MAX_JUICE_PACKETS } from '../src/game/JuiceInventory.js';
import { createSchoolboy } from '../src/art/Schoolboy.js';
import { disposeBatchedGeometry } from '../src/art/StaticBatcher.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';
import { ENVIRONMENT_THEMES } from '../src/game/EnvironmentThemes.js';
import { makeCollider } from '../src/game/Collision.js';
import { Player } from '../src/game/Player.js';
import { Game } from '../src/game/Game.js';
import { WorldGenerator } from '../src/game/WorldGenerator.js';
import { GraphicsPipeline } from '../src/game/GraphicsPipeline.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function collisionPlayer() {
  return {
    group: { position: new THREE.Vector3(0, 0, 4) },
    scooterActive: false,
    invincibleTimer: 0,
    getCollider: () => makeCollider(0, 0, 4, 0.74, 0.03, 2.12, 0.76),
  };
}

test('shop contains ten distinct original runners with articulated live rigs', () => {
  assert.equal(CHARACTERS.length, 10);
  assert.equal(new Set(CHARACTERS.map((item) => item.id)).size, 10);
  assert.equal(getCharacter('not-a-runner').id, 'schoolboy');
  for (const definition of CHARACTERS) {
    const visual = createSchoolboy(definition);
    let skinnedLimbs = 0;
    visual.traverse((node) => { if (node.isSkinnedMesh) skinnedLimbs += 1; });
    assert.equal(visual.userData.characterId, definition.id);
    assert.equal(skinnedLimbs, 4, `${definition.id} must retain all four continuous limbs`);
    assert.ok(visual.userData.joints.head && visual.userData.joints.backpack);
    assert.ok(Number.isInteger(definition.price) && definition.price >= 0);
    disposeBatchedGeometry(visual);
  }
});

test('character switching keeps one live rig and releases old skinned GPU buffers', () => {
  const player = new Player(new THREE.Scene());
  const original = player.visual;
  let disposed = 0;
  const oldGeometries = new Set();
  original.traverse((node) => { if (node.isSkinnedMesh) oldGeometries.add(node.geometry); });
  assert.equal(oldGeometries.size, 2, 'left/right arms and legs share their respective geometry');
  for (const geometry of oldGeometries) geometry.addEventListener('dispose', () => { disposed += 1; });
  assert.equal(player.setCharacter('colombo-scout'), true);
  assert.equal(disposed, oldGeometries.size);
  assert.equal(player.characterId, 'colombo-scout');
  assert.equal(player.group.children.filter((child) => child.userData.characterId).length, 1);
  assert.equal(player.setCharacter('colombo-scout'), false);
  assert.equal(player.setCharacter('schoolboy'), true);
  assert.equal(player.characterId, 'schoolboy');
  assert.equal(player.group.children.filter((child) => child.userData.characterId).length, 1);
});

test('character purchases, selection, wallet and legacy earnings persist safely', () => {
  const storage = memoryStorage();
  const migrated = new ShopManager(storage, { legacyCoins: 137 });
  assert.equal(migrated.wallet, 137);
  assert.equal(migrated.selectedId, 'schoolboy');
  const insufficient = migrated.buyOrSelect('coastal-sprinter');
  assert.equal(insufficient.ok, false);
  assert.equal(insufficient.reason, 'coins');
  assert.equal(migrated.wallet, 137);
  const purchased = migrated.buyOrSelect('colombo-scout');
  assert.equal(purchased.purchased, true);
  assert.equal(migrated.wallet, 87);
  assert.equal(migrated.selectedId, 'colombo-scout');
  const reloaded = new ShopManager(storage, { legacyCoins: 9999 });
  assert.equal(reloaded.wallet, 87, 'saved shop wallet replaces the legacy total after migration');
  assert.equal(reloaded.selectedId, 'colombo-scout');
  assert.equal(reloaded.buyOrSelect('colombo-scout').purchased, false);
  assert.equal(reloaded.wallet, 87);
  reloaded.earn(10000);
  for (const definition of CHARACTERS) reloaded.buyOrSelect(definition.id);
  assert.equal(reloaded.getSnapshot().characters.filter((item) => item.owned).length, 10);
  assert.equal(reloaded.selectedId, 'island-legend');
  assert.equal(reloaded.wallet, 10087 - (CHARACTERS.reduce((sum, item) => sum + item.price, 0) - getCharacter('colombo-scout').price));
  assert.equal(reloaded.buyOrSelect('unknown').reason, 'unknown');
  const finalReload = new ShopManager(storage);
  assert.equal(finalReload.selectedId, 'island-legend');
  assert.equal(finalReload.getSnapshot().characters.filter((item) => item.owned).length, 10);
});

test('juice inventory is capped, persistent and survives blocked storage', () => {
  const storage = memoryStorage();
  const juice = new JuiceInventory(storage);
  assert.equal(juice.consume(), false);
  assert.equal(juice.add(), true);
  assert.equal(juice.add(), true);
  assert.equal(juice.add(), true);
  assert.equal(juice.add(), false);
  assert.equal(juice.count, MAX_JUICE_PACKETS);
  const restored = new JuiceInventory(storage);
  assert.equal(restored.count, 3);
  assert.equal(restored.consume(), true);
  assert.equal(restored.count, 2);
  const blocked = new JuiceInventory({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
  assert.equal(blocked.add(), true);
  assert.equal(blocked.consume(), true);
  assert.equal(blocked.count, 0);
});

test('one fair juice packet is offered on every second district transition', () => {
  const spawner = new ObstacleSpawner(new THREE.Scene());
  for (let index = 0; index < ENVIRONMENT_THEMES.length; index += 1) {
    spawner.setDistrict(ENVIRONMENT_THEMES[index].id);
    const rowId = 1200 + index;
    spawner.spawnPattern({ id: rowId, obstacles: [], coins: [], freeLane: 1, requiredAction: false }, -90 - index * 30);
    const juice = spawner.getRowEntries(rowId).filter((entry) => entry.type === 'juice');
    assert.equal(juice.length, index > 0 && index % 2 === 1 ? 1 : 0, ENVIRONMENT_THEMES[index].id);
    if (juice.length) {
      assert.equal(juice[0].lane, 1, 'packet uses the planner-approved free lane');
      assert.equal(spawner.getRowEntries(rowId).some((entry) => entry.type === 'obstacle' && entry.lane === 1), false);
    }
  }
  spawner.setDistrict('suburb');
  spawner.spawnPattern({ id: 1300, obstacles: [], coins: [], freeLane: 2, requiredAction: true }, -40);
  assert.equal(spawner.getRowEntries(1300).filter((entry) => entry.type === 'juice').length, 0);
  assert.equal(spawner.pendingJuice, true, 'an action row cannot consume the pending rare pickup');
  spawner.reset(7);
  assert.equal(spawner.pendingJuice, false);
  assert.equal(spawner.district, 'colombo');
  assert.equal(spawner.entries.some((entry) => entry.type === 'juice'), false);
});

test('full inventory rejects a juice overlap without consuming the world packet', () => {
  let allowed = false;
  let callbacks = 0;
  const spawner = new ObstacleSpawner(new THREE.Scene(), {
    onJuice: () => { callbacks += 1; return allowed; },
  });
  const entry = spawner.spawnJuice(1, 4, 1400);
  const player = collisionPlayer();
  assert.equal(spawner.update(0, 0, player), 'running');
  assert.equal(callbacks, 1);
  assert.equal(spawner.entries.includes(entry), true);
  allowed = true;
  assert.equal(spawner.update(0, 0, player), 'running');
  assert.equal(callbacks, 2);
  assert.equal(spawner.entries.includes(entry), false);
});

test('respawn road clearing and temporary protection retain fair pickups', () => {
  let hits = 0;
  const spawner = new ObstacleSpawner(new THREE.Scene(), { onHit: () => { hits += 1; } });
  const near = spawner.spawnObstacle('car', 1, 4, 1500);
  spawner.spawnObstacle('car', 0, -85, 1501);
  spawner.spawnCoin(1, 4, 1, 1502);
  spawner.spawnJuice(2, -5, 1503);
  spawner.nextSpawnIn = 2;
  spawner.prepareRespawn();
  assert.equal(spawner.entries.includes(near), false);
  assert.ok(spawner.entries.some((entry) => entry.rowId === 1501), 'distant recycled traffic remains bounded');
  assert.ok(spawner.entries.some((entry) => entry.type === 'coin'));
  assert.ok(spawner.entries.some((entry) => entry.type === 'juice'));
  assert.ok(spawner.nextSpawnIn >= 30);

  spawner.clear();
  const player = collisionPlayer();
  player.invincibleTimer = 3;
  spawner.spawnObstacle('car', 1, 4, 1504);
  assert.equal(spawner.update(0, 0, player), 'running');
  assert.equal(hits, 0);
  player.invincibleTimer = 0;
  assert.equal(spawner.update(0, 0, player), 'hit');
  assert.equal(hits, 1);
});

test('game revive consumes one packet, preserves score and restores a three-second shield', () => {
  const scene = new THREE.Scene();
  const realPlayer = new Player(scene);
  realPlayer.respawn();
  assert.equal(realPlayer.invincibleTimer, 3);
  assert.equal(realPlayer.shield.visible, true);
  realPlayer.update(1, 14);
  realPlayer.update(1, 14);
  assert.ok(realPlayer.invincibleTimer > 0);
  realPlayer.update(1, 14);
  assert.equal(realPlayer.invincibleTimer, 0);
  assert.equal(realPlayer.shield.visible, false);

  const score = { score: 900, distance: 123 };
  let consumes = 0;
  let respawns = 0;
  let clears = 0;
  let shown = 0;
  const game = {
    completeRespawn: Game.prototype.completeRespawn,
    state: 'revive', score, speed: 18,
    juice: { count: 1, consume: () => { consumes += 1; return true; } },
    player: { respawn: () => { respawns += 1; } },
    spawner: { prepareRespawn: () => { clears += 1; } },
    police: { reset: () => {} }, cameraRig: { reset: () => {} }, effects: { reset: () => {} },
    audio: { setState: () => {} },
    ui: { showRunning: () => { shown += 1; }, setJuice: () => {}, updateHud: () => {}, showFeedback: () => {} },
  };
  assert.equal(Game.prototype.respawn.call(game), true);
  assert.equal(game.state, 'running');
  assert.equal(game.score, score);
  assert.deepEqual(score, { score: 900, distance: 123 });
  assert.equal(consumes, 1);
  assert.equal(respawns, 1);
  assert.equal(clears, 1);
  assert.equal(shown, 1);
  assert.equal(Game.prototype.respawn.call(game), false);
  assert.equal(consumes, 1, 'a second activation cannot consume another packet');
});

test('mobile scenery visibility and adaptive performance fallback stay bounded', () => {
  const world = new WorldGenerator(new THREE.Scene(), { detailDistance: 175, animationHz: 20 });
  const initial = world.getStats();
  assert.equal(initial.activeSceneryGroups, 9);
  assert.ok(initial.visibleSceneryGroups > 0 && initial.visibleSceneryGroups < initial.activeSceneryGroups);
  assert.equal(world.sections.every((section) => Boolean(section.userData.scenery)), true, 'culling never deletes recycled scenery');
  world.setPerformanceMode(true);
  assert.equal(world.getStats().detailDistance, 135);
  assert.ok(world.getStats().visibleSceneryGroups <= initial.visibleSceneryGroups);

  const pipeline = Object.create(GraphicsPipeline.prototype);
  let disposed = 0;
  Object.assign(pipeline, {
    renderer: { getPixelRatio: () => 0.65, setPixelRatio: () => {}, setSize: () => {} },
    composer: null, postprocessing: false, coarsePointer: true,
    scene: { environment: {} }, environmentTarget: { dispose: () => { disposed += 1; } },
    clouds: [{ visible: true }, { visible: true }],
    frameTime: 0, frameCount: 0, slowWindows: 0, adaptations: 0,
    performanceMode: false, quality: 'adaptive-resolution',
  });
  for (let frame = 0; frame < 90; frame += 1) pipeline.adapt(0.05);
  assert.equal(pipeline.performanceMode, true);
  assert.equal(pipeline.quality, 'performance-mobile');
  assert.equal(pipeline.scene.environment, null);
  assert.equal(pipeline.environmentTarget, null);
  assert.equal(disposed, 1);
  assert.equal(pipeline.clouds.every((cloud) => cloud.visible === false), true);
  assert.equal(pipeline.adaptations, 1);

  Object.assign(pipeline, {
    scene: { environment: {} }, environmentTarget: { dispose: () => { disposed += 1; } },
    clouds: [{ visible: false }], frameTime: 0, frameCount: 0, slowWindows: 0,
    adaptations: 0, performanceMode: true, quality: 'performance-mobile',
  });
  for (let frame = 0; frame < 90; frame += 1) pipeline.adapt(0.05);
  assert.equal(disposed, 2, 'initial mobile performance mode still permits later reflection cleanup');
  assert.equal(pipeline.environmentTarget, null);
  assert.equal(pipeline.adaptations, 1);
});
