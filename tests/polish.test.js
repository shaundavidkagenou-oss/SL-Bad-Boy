import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCoin } from '../src/art/MeshKit.js';
import { ContactShadows } from '../src/game/ContactShadows.js';
import { LongShadows } from '../src/game/LongShadows.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';
import { Player } from '../src/game/Player.js';
import { CameraRig } from '../src/game/CameraRig.js';
import { localDayKey, ProgressionManager } from '../src/game/ProgressionManager.js';
import { AudioManager } from '../src/game/AudioManager.js';
import { ScoreManager } from '../src/game/ScoreManager.js';
import { WorldGenerator } from '../src/game/WorldGenerator.js';
import { batchStaticGroup, disposeBatchedGeometry } from '../src/art/StaticBatcher.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test('crested coins retain one shared vertex-colored mesh and a bounded triangle budget', () => {
  const first = createCoin();
  const second = createCoin();
  assert.equal(first.isMesh, true);
  assert.equal(first.children.length, 0);
  assert.equal(first.geometry, second.geometry);
  assert.equal(first.geometry.userData.crest, 'lotus-sun');
  assert.equal(first.material.vertexColors, true);
  assert.ok(first.material.emissiveIntensity >= 0.7, 'coins must provide a restrained bloom source');
  assert.ok(first.geometry.attributes.color.count > 0);
  assert.ok(first.geometry.index.count / 3 <= 360);
  assert.equal(first.castShadow && first.receiveShadow, false);
});

test('static batching removes only unused UVs and preserves textured coordinates', () => {
  const flat = new THREE.Group();
  const flatMaterial = new THREE.MeshStandardMaterial({ color: 0x4a8b45 });
  flat.add(new THREE.Mesh(new THREE.BoxGeometry(), flatMaterial));
  flat.add(new THREE.Mesh(new THREE.SphereGeometry(), flatMaterial));
  batchStaticGroup(flat);
  const flatMeshes = flat.children.filter((node) => node.userData.batchOwnedGeometry);
  assert.equal(flatMeshes.length, 1);
  assert.equal(flatMeshes[0].geometry.attributes.uv, undefined);

  const textured = new THREE.Group();
  const texture = new THREE.Texture();
  const texturedMaterial = new THREE.MeshStandardMaterial({ map: texture });
  textured.add(new THREE.Mesh(new THREE.BoxGeometry(), texturedMaterial));
  textured.add(new THREE.Mesh(new THREE.SphereGeometry(), texturedMaterial));
  batchStaticGroup(textured);
  const texturedMeshes = textured.children.filter((node) => node.userData.batchOwnedGeometry);
  assert.equal(texturedMeshes.length, 1);
  assert.ok(texturedMeshes[0].geometry.attributes.uv.count > 0);

  const custom = new THREE.Group();
  const customMaterial = new THREE.ShaderMaterial();
  custom.add(new THREE.Mesh(new THREE.BoxGeometry(), customMaterial));
  custom.add(new THREE.Mesh(new THREE.SphereGeometry(), customMaterial));
  batchStaticGroup(custom);
  const customMeshes = custom.children.filter((node) => node.userData.batchOwnedGeometry);
  assert.equal(customMeshes.length, 1);
  assert.ok(customMeshes[0].geometry.attributes.uv.count > 0);
  disposeBatchedGeometry(flat);
  disposeBatchedGeometry(textured);
  disposeBatchedGeometry(custom);
  texturedMaterial.dispose();
  customMaterial.dispose();
  texture.dispose();
  flatMaterial.dispose();
});

test('soft contact grounding stays in one bounded instanced draw without shadow maps', () => {
  const scene = new THREE.Scene();
  const shadows = new ContactShadows(scene, { capacity: 3 });
  const player = new Player(scene);
  player.group.position.y = 1.2;
  const police = { group: { visible: true, position: new THREE.Vector3(1, 0, 8) } };
  const entries = [0, 1].map((lane) => ({
    type: 'obstacle', kind: 'car', spec: { width: 2.05, depth: 3.9 },
    mesh: { position: new THREE.Vector3(lane ? 3.1 : -3.1, 0, -8) },
  }));
  shadows.update(player, police, entries);
  assert.equal(shadows.mesh.isInstancedMesh, true);
  assert.equal(shadows.getStats().drawCalls, 1);
  assert.equal(shadows.getStats().instances, 3, 'instance capacity must never be exceeded');
  assert.equal(shadows.mesh.count, 3);
  assert.equal(shadows.mesh.material.transparent, true);
  assert.equal(shadows.mesh.castShadow || shadows.mesh.receiveShadow, false);
  assert.ok(shadows.mesh.instanceColor, 'airborne contact color was not initialized');
  shadows.reset();
  assert.equal(shadows.mesh.count, 0);
});

test('low-sun long shadows add one bounded projected draw without shadow-map passes', () => {
  const scene = new THREE.Scene();
  const shadows = new LongShadows(scene, { capacity: 3 });
  const player = new Player(scene);
  const police = { group: { visible: true, position: new THREE.Vector3(1, 0, 8) } };
  const entries = [0, 1].map((lane) => ({
    type: 'obstacle', kind: lane ? 'private-bus' : 'car', spec: { width: 2.05, depth: 3.9 },
    mesh: { position: new THREE.Vector3(lane ? 3.1 : -3.1, 0, -8) },
  }));
  shadows.update(player, police, entries);
  assert.equal(shadows.mesh.isInstancedMesh, true);
  assert.equal(shadows.getStats().drawCalls, 1);
  assert.equal(shadows.getStats().instances, 3);
  assert.equal(shadows.getStats().shadowMapPasses, 0);
  assert.equal(shadows.mesh.count, 3);
  assert.equal(shadows.mesh.castShadow || shadows.mesh.receiveShadow, false);
  const matrix = new THREE.Matrix4();
  shadows.mesh.getMatrixAt(0, matrix);
  player.group.position.x = 2;
  shadows.update(player, police, entries);
  const moved = new THREE.Matrix4();
  shadows.mesh.getMatrixAt(0, moved);
  assert.notDeepEqual(matrix.elements, moved.elements, 'projected shadow must follow its character');
  shadows.reset();
  assert.equal(shadows.mesh.count, 0);
});

test('near misses require real lateral clearance, award once, and never replace collisions', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  let nearMisses = 0;
  let hits = 0;
  const spawner = new ObstacleSpawner(scene, {
    onNearMiss: () => { nearMisses += 1; }, onHit: () => { hits += 1; },
  });
  spawner.nextSpawnIn = 999;
  spawner.nextScooterIn = 999;
  player.group.position.x = (2.05 + 0.74) * 0.5 + 0.4;
  spawner.spawnObstacle('car', 1, -10, 501);
  spawner.update(0.5, 36, player);
  assert.equal(nearMisses, 1);
  assert.equal(hits, 0);
  spawner.update(0.1, 36, player);
  assert.equal(nearMisses, 1, 'one vehicle awarded more than once');

  player.group.position.x = 0;
  spawner.spawnObstacle('car', 2, -10, 502);
  spawner.update(0.5, 36, player);
  assert.equal(nearMisses, 1, 'an ordinary adjacent-lane pass should not award a near miss');

  spawner.spawnObstacle('car', 1, -10, 503);
  const result = spawner.update(0.5, 36, player);
  assert.equal(result, 'hit');
  assert.equal(hits, 1);
  assert.equal(nearMisses, 1);
});

test('camera boost and feedback remain restrained and return to the portrait baseline', () => {
  const rig = new CameraRig();
  rig.resize(390, 844);
  const player = { group: { position: new THREE.Vector3() }, scooterActive: false };
  for (let frame = 0; frame < 120; frame += 1) rig.update(1 / 60, player, 14, 'running');
  assert.ok(Math.abs(rig.camera.fov - 67) < 0.01);
  player.scooterActive = true;
  for (let frame = 0; frame < 120; frame += 1) rig.update(1 / 60, player, 16.8, 'running');
  assert.ok(rig.camera.fov > 69 && rig.camera.fov < 70.5, `boost FOV was ${rig.camera.fov}`);
  rig.pulse(0.6, 1);
  assert.ok(rig.feedback > 0);
  player.scooterActive = false;
  for (let frame = 0; frame < 180; frame += 1) rig.update(1 / 60, player, 14, 'running');
  assert.ok(rig.feedback < 0.001);
  assert.ok(Math.abs(rig.camera.fov - 67) < 0.01);
  rig.pulse(0.65, -1);
  rig.reset();
  assert.equal(rig.feedback, 0);
  assert.equal(rig.laneFeedback, 0);
  assert.equal(rig.camera.fov, 67);
  assert.deepEqual(rig.camera.position.toArray(), [0, 6.8, 15.8]);
});

test('daily goals persist, reward once, and roll over without losing stars or totals', () => {
  const storage = memoryStorage();
  const progress = new ProgressionManager(storage, '2026-10-22');
  const first = progress.recordRun({ distance: 10000, coins: 500, nearMisses: 50 });
  assert.equal(first.completed.length, 3);
  assert.equal(first.starsEarned, 8);
  assert.equal(progress.getSnapshot().stars, 8);
  const second = progress.recordRun({ distance: 10000, coins: 500, nearMisses: 50 });
  assert.equal(second.starsEarned, 0);
  assert.equal(progress.getSnapshot().totals.runs, 2);

  const restored = new ProgressionManager(storage, '2026-10-22');
  assert.equal(restored.getSnapshot().stars, 8);
  assert.equal(restored.getSnapshot().missions.every((mission) => mission.completed), true);
  const nextDay = new ProgressionManager(storage, '2026-10-23');
  assert.equal(nextDay.getSnapshot().stars, 8);
  assert.equal(nextDay.getSnapshot().totals.runs, 2);
  assert.equal(nextDay.getSnapshot().missions.every((mission) => !mission.completed && mission.progress === 0), true);

  const live = new ProgressionManager(memoryStorage());
  live.recordRun({ distance: 25 });
  live.day = '2000-01-01';
  live.missions[0].progress = 999;
  const rolled = live.getSnapshot();
  assert.equal(rolled.day, localDayKey());
  assert.equal(rolled.totals.runs, 1);
  assert.equal(rolled.totals.distance, 25);
  assert.equal(rolled.missions.every((mission) => mission.progress === 0 && !mission.completed), true);
  assert.doesNotThrow(() => new ProgressionManager({ getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); } }, '2026-10-22').recordRun({ distance: 20 }));
});

test('near-miss scoring and independent audio levels persist without eager audio startup', () => {
  const score = new ScoreManager(memoryStorage());
  score.addNearMiss();
  score.addNearMiss();
  assert.equal(score.score, 500);
  score.reset();
  assert.equal(score.nearMisses, 0);

  const storage = memoryStorage();
  const audio = new AudioManager(storage);
  audio.setMusicVolume(0.35);
  audio.setSfxVolume(1.4);
  assert.equal(audio.sfxVolume, 1);
  assert.equal(audio.context, null);
  const restored = new AudioManager(storage);
  assert.equal(restored.musicVolume, 0.35);
  assert.equal(restored.sfxVolume, 1);
  assert.equal(restored.context, null);
});

test('seeded palm and banana crowns animate while retaining batched geometry', () => {
  const world = new WorldGenerator(new THREE.Scene());
  const sway = world.sections.flatMap((section) => section.userData.animatedVegetation || []);
  assert.ok(sway.length >= 8);
  assert.equal(world.getStats().animatedVegetation, sway.length);
  for (const { root } of sway) {
    let draws = 0;
    root.traverse((node) => { if (node.isMesh) draws += 1; });
    assert.equal(draws, 1, 'each animated crown should remain a single draw');
  }
  const sample = sway[0];
  const before = sample.root.rotation.z;
  const geometries = [];
  sample.root.traverse((node) => { if (node.isMesh) geometries.push(node.geometry); });
  assert.equal(geometries.length, 1);
  world.update(1 / 60, 14);
  assert.notEqual(sample.root.rotation.z, before);
  assert.equal(sample.root.matrixAutoUpdate, true);
  sample.root.traverse((node) => {
    if (node.isMesh) assert.equal(geometries.includes(node.geometry), true);
    assert.equal(Boolean(node.castShadow || node.receiveShadow), false);
  });
});

test('recycled scenery builds offscreen in bounded stages and resets unfinished drafts cleanly', () => {
  const world = new WorldGenerator(new THREE.Scene(), { detailDistance: 210, generationBudget: 0 });
  const section = world.sections[0];
  const previous = section.userData.scenery;
  let ownedGeometry;
  previous.traverse((node) => {
    if (!ownedGeometry && node.userData.batchOwnedGeometry) ownedGeometry = node.geometry;
  });
  assert.ok(ownedGeometry);
  let disposals = 0;
  ownedGeometry.addEventListener('dispose', () => { disposals += 1; });
  const rebuilds = world.rebuildCount;

  section.position.z = 46;
  world.update(0, 0, false);
  assert.equal(world.getStats().pendingScenery, 1);
  assert.equal(previous.visible, false, 'recycled district must not appear ahead while drafting');
  assert.equal(world.rebuildCount, rebuilds, 'construction does not count as committed scenery');

  let stages = 0;
  while (world.getStats().pendingScenery && stages < 30) {
    world.processSceneryQueue(0);
    stages += 1;
  }
  assert.ok(stages > 1 && stages < 30, `generation used ${stages} stages`);
  assert.equal(world.getStats().pendingScenery, 0);
  assert.equal(world.rebuildCount, rebuilds + 1);
  assert.notEqual(section.userData.scenery, previous);
  assert.equal(disposals, 1, 'replaced batch geometry is disposed exactly once');
  assert.equal(world.getStats().activeSceneryGroups, 9);
  assert.equal(world.getStats().maxGenerationQueue, 1);
  assert.ok(world.getStats().generationStages >= stages);

  section.position.z = 46;
  world.update(0, 0, false);
  assert.equal(world.getStats().pendingScenery, 1);
  world.processSceneryQueue(0);
  world.reset();
  assert.equal(world.getStats().pendingScenery, 0);
  assert.equal(world.getStats().activeSceneryGroups, 9);
  assert.equal(world.sections.every((section) => !section.userData.generationJob), true);
});
