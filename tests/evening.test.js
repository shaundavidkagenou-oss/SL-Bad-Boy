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
import { GodRays } from '../src/game/GodRays.js';
import { createCinematicGradePass } from '../src/game/CinematicGradePass.js';
import { createUtilityWires } from '../src/art/Environment.js';

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

test('bus lamp halos and road glow share one bounded draw across quality tiers', () => {
  const scene = new THREE.Scene();
  const lights = new RoadLightPools(scene, { capacity: 6 });
  const entries = [
    { kind: 'public-bus', x: 0, z: -12 },
    { kind: 'private-bus', x: 3, z: -32 },
    { kind: 'car', x: -3, z: -52 },
    { kind: 'public-bus', x: 6, z: -60 },
  ].map(({ kind, x, z }) => ({
    type: 'obstacle', kind, spec: { depth: 6.8 }, mesh: { position: new THREE.Vector3(x, 0, z) },
  }));
  lights.update(entries);
  assert.equal(lights.mesh.isInstancedMesh, true);
  assert.equal(lights.mesh.material.blending, THREE.AdditiveBlending);
  assert.deepEqual(lights.getStats(), {
    enabled: true, roadGlow: true, capacity: 6, instances: 6,
    lamps: 4, roadPools: 2, drawCalls: 1,
  });
  lights.roadGlow = false;
  lights.update(entries);
  assert.equal(lights.getStats().lamps, 6, 'low-cost tiers retain visible headlight halos');
  assert.equal(lights.getStats().roadPools, 0);
  assert.equal(lights.getStats().instances, 6);
  assert.equal(lights.getStats().drawCalls, 1);
  lights.enabled = false;
  lights.update(entries);
  assert.equal(lights.getStats().instances, 0);
  assert.equal(lights.getStats().drawCalls, 0);
  assert.equal(lights.mesh.visible, false);
});

test('golden-hour god rays use one bounded instanced draw and recycle without new geometry', () => {
  const scene = new THREE.Scene();
  const rays = new GodRays(scene, { capacity: 5 });
  const geometry = rays.mesh.geometry;
  rays.update(0.5, 28, 'running');
  assert.equal(rays.mesh.isInstancedMesh, true);
  assert.equal(rays.getStats().drawCalls, 1);
  assert.equal(rays.getStats().instances, 5);
  assert.equal(rays.material.blending, THREE.AdditiveBlending);
  for (let frame = 0; frame < 20; frame += 1) rays.update(0.5, 28, 'running');
  assert.equal(rays.mesh.geometry, geometry);
  assert.ok(rays.state[2] < 19, 'ray positions must recycle behind the camera');
  rays.enabled = false;
  rays.update(0.5, 28, 'running');
  assert.equal(rays.getStats().drawCalls, 0);
  assert.equal(rays.mesh.visible, false);
});

test('combined cinematic pass includes saturation, contrast, vignette and boost-only radial blur', () => {
  const pass = createCinematicGradePass();
  assert.ok(pass.uniforms.saturation.value > 1.1);
  assert.ok(pass.uniforms.contrast.value > 1);
  assert.ok(pass.uniforms.vignette.value > 0);
  assert.equal(pass.uniforms.boost.value, 0);
  assert.equal(pass.uniforms.fxaa.value, 1);
  assert.ok(pass.uniforms.toneMappingExposure.value > 1);
  assert.match(pass.material.fragmentShader, /if \(boost > 0\.001\)/);
  assert.match(pass.material.fragmentShader, /radial/);
  assert.match(pass.material.fragmentShader, /ACESFilmicToneMapping/);
  assert.match(pass.material.fragmentShader, /sRGBTransferOETF/);
  assert.match(pass.material.fragmentShader, /inverseResolution/);
  pass.uniforms.boost.value = 0.85;
  assert.equal(pass.uniforms.boost.value, 0.85);
  pass.dispose();
});

test('Colombo wire crosshatch combines seven cables into one cached line draw', () => {
  const first = createUtilityWires(30);
  const second = createUtilityWires(30);
  const wires = first.children[0];
  assert.equal(first.children.length, 1);
  assert.equal(wires.isLineSegments, true);
  assert.equal(wires.userData.cableCount, 7);
  assert.equal(wires.geometry, second.children[0].geometry);
  assert.equal(wires.geometry.attributes.position.count, 136);
  assert.ok(Math.max(...wires.geometry.attributes.position.array) > 14, 'cross-street spans must cross the road');
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
