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

test('menu characters and camera present an idle showcase and reset cleanly for gameplay', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  const police = new PoliceChase(scene);
  const rig = new CameraRig();
  rig.resize(390, 844);
  for (let frame = 0; frame < 180; frame += 1) {
    player.update(1 / 60, 0, 'menu');
    police.update(1 / 60, 0, player, 'menu', []);
    rig.update(1 / 60, player, 0, 'menu');
  }
  assert.equal(police.group.visible, true);
  assert.equal(police.chaseStarted, false);
  assert.ok(police.getGap() >= POLICE_MIN_GAP);
  assert.ok(Math.abs(player.visual.rotation.y - Math.PI) < 0.01);
  assert.ok(Math.abs(police.visual.rotation.y - Math.PI) < 0.01);
  assert.ok(Math.abs(rig.camera.fov - 54) < 0.01);
  player.reset();
  police.reset();
  rig.reset();
  assert.equal(player.visual.rotation.y, 0);
  assert.equal(police.group.visible, false);
  assert.equal(rig.camera.fov, 67);
});
