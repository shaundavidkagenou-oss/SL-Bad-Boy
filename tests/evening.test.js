import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ENVIRONMENT_THEMES } from '../src/game/EnvironmentThemes.js';
import { eveningPalette } from '../src/game/Evening.js';
import { createObstacleModel } from '../src/art/Vehicles.js';
import { RoadLightPools } from '../src/game/RoadLightPools.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';
import { createCoin } from '../src/art/MeshKit.js';
import { PoliceChase, POLICE_MIN_GAP } from '../src/game/PoliceChase.js';
import { Player } from '../src/game/Player.js';
import { CameraRig } from '../src/game/CameraRig.js';

test('all districts retain cached evening palettes without mutating their source themes', () => {
  for (const theme of ENVIRONMENT_THEMES) {
    const source = [theme.sky, theme.fog, theme.ground];
    const palette = eveningPalette(theme);
    assert.equal(eveningPalette(theme), palette);
    assert.notEqual(palette.sky, theme.sky);
    assert.notEqual(palette.fog, theme.fog);
    assert.notEqual(palette.ground, theme.ground);
    assert.deepEqual([theme.sky, theme.fog, theme.ground], source);
  }
});

test('public and private buses have emissive headlights and warm windows without dynamic lights', () => {
  for (const kind of ['public-bus', 'private-bus']) {
    const bus = createObstacleModel(kind, 1);
    let headlights = 0;
    let warmWindows = 0;
    bus.traverse((node) => {
      assert.equal(Boolean(node.isLight), false);
      if (!node.isMesh) return;
      if (node.material.emissiveIntensity >= 2) headlights += 1;
      if (node.material.emissiveIntensity >= 0.25 && node.material.emissiveIntensity < 1) warmWindows += 1;
    });
    assert.ok(headlights > 0, `${kind} headlights are not illuminated`);
    assert.ok(warmWindows > 0, `${kind} windows are not illuminated`);
    assert.equal(bus.userData.wheels.length, 4);
  }
});

test('bus road glow is one bounded instanced draw and is skipped on software rendering', () => {
  const scene = new THREE.Scene();
  const lights = new RoadLightPools(scene, { capacity: 2 });
  const entries = [0, 1, 2].map((lane) => ({
    type: 'obstacle', kind: lane === 2 ? 'car' : 'public-bus',
    spec: { depth: 6.52 }, mesh: { position: new THREE.Vector3(lane, 0, -12 - lane * 20) },
  }));
  lights.update(entries);
  assert.equal(lights.mesh.isInstancedMesh, true);
  assert.equal(lights.mesh.material.blending, THREE.AdditiveBlending);
  assert.deepEqual(lights.getStats(), { enabled: true, capacity: 2, instances: 2, drawCalls: 1 });
  lights.enabled = false;
  lights.update(entries);
  assert.equal(lights.getStats().instances, 0);
  assert.equal(lights.getStats().drawCalls, 0);
  assert.equal(lights.mesh.visible, false);
});

test('coin trails render through one bounded instanced pool while retaining collision proxies', () => {
  const spawner = new ObstacleSpawner(new THREE.Scene());
  spawner.reset(42);
  const coins = spawner.entries.filter((entry) => entry.type === 'coin');
  assert.ok(coins.length > 0);
  assert.equal(spawner.coinPool.isInstancedMesh, true);
  assert.equal(spawner.coinPool.count, coins.length);
  assert.equal(spawner.coinPool.visible, true);
  assert.equal(spawner.coinPool.geometry, createCoin().geometry);
  assert.ok(spawner.coinPool.count <= 96);
  for (const coin of coins) assert.equal(spawner.group.children.includes(coin.mesh), false);
  spawner.clear();
  assert.equal(spawner.coinPool.count, 0);
  assert.equal(spawner.coinPool.visible, false);
});

test('solo menu hides the officer while the kid animates and rigs reset cleanly', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  const police = new PoliceChase(scene);
  const rig = new CameraRig();
  rig.resize(390, 844);
  let peakStep = 0;
  let peakLift = 0;
  for (let frame = 0; frame < 300; frame += 1) {
    player.update(1 / 60, 0, 'menu');
    police.update(1 / 60, 0, player, 'menu', []);
    rig.update(1 / 60, player, 0, 'menu');
    peakStep = Math.max(peakStep, Math.abs(player.joints.leftLeg.rotation.x));
    peakLift = Math.max(peakLift, player.visual.position.y);
  }
  assert.equal(police.group.visible, false);
  assert.equal(police.chaseStarted, false);
  assert.ok(police.getGap() >= POLICE_MIN_GAP);
  assert.ok(peakStep > 0.2, `menu warm-up step was only ${peakStep}`);
  assert.ok(peakLift > 0.02, `menu warm-up lift was only ${peakLift}`);
  assert.ok(Math.abs(player.visual.rotation.y - Math.PI) < 0.08);
  assert.ok(Math.abs(player.joints.rightArm.rotation.z) < 0.001, 'removed arm gestures must stay removed');
  assert.ok(Math.abs(rig.camera.fov - 54) < 0.01);
  player.reset();
  police.reset();
  rig.reset();
  assert.equal(player.visual.rotation.y, 0);
  assert.equal(police.group.visible, false);
  assert.equal(rig.camera.fov, 67);
});

test('cinematic Play handoff preserves the menu frame then eases into the chase camera', () => {
  const rig = new CameraRig();
  rig.resize(390, 844);
  const player = new Player(new THREE.Scene());
  for (let frame = 0; frame < 180; frame += 1) rig.update(1 / 60, player, 0, 'menu');
  const menuPosition = rig.camera.position.toArray();
  const menuLook = rig.lookTarget.toArray();
  const menuFov = rig.camera.fov;
  rig.beginRun(true);
  assert.deepEqual(rig.camera.position.toArray(), menuPosition, 'Play must not cut the camera');
  assert.deepEqual(rig.lookTarget.toArray(), menuLook);
  assert.equal(rig.camera.fov, menuFov);
  for (let frame = 0; frame < 30; frame += 1) rig.update(1 / 60, player, 14, 'running');
  assert.ok(rig.camera.position.y > menuPosition[1] + 1);
  assert.ok(rig.lookTarget.z < menuLook[2] - 3 && rig.lookTarget.z > -8.5);
  for (let frame = 0; frame < 150; frame += 1) rig.update(1 / 60, player, 14, 'running');
  assert.ok(Math.abs(rig.camera.position.x) < 0.001);
  assert.ok(Math.abs(rig.camera.position.y - 6.8) < 0.001);
  assert.ok(Math.abs(rig.camera.position.z - 15.8) < 0.001);
  assert.ok(Math.abs(rig.lookTarget.z + 8.5) < 0.001);
  assert.ok(Math.abs(rig.camera.fov - 67) < 0.01);
  rig.beginRun(false);
  assert.deepEqual(rig.camera.position.toArray(), [0, 6.8, 15.8], 'ordinary restarts still reset immediately');
});
