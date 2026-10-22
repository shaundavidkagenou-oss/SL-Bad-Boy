import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { themeForDistance, themeForSequence, themeSectionIndex, THEME_SECTIONS, THEME_LENGTH, ENVIRONMENT_THEMES } from '../src/game/EnvironmentThemes.js';
import { getMeshKitStats, box, sphere, cylinder, cone } from '../src/art/MeshKit.js';
import { InputController } from '../src/game/InputController.js';
import { Player } from '../src/game/Player.js';
import { AudioManager } from '../src/game/AudioManager.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';
import { PLAYER_Z, ROAD } from '../src/config.js';
import { WorldGenerator } from '../src/game/WorldGenerator.js';
import { createDistrictLandmark, createTunnelSection } from '../src/art/Landmarks.js';

class FakeTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  removeEventListener(type) { this.listeners.delete(type); }
  emit(type, event) { this.listeners.get(type)?.({ preventDefault() {}, ...event }); }
}

test('ten district schedules use longer eight-section blocks and wrap cleanly', () => {
  assert.equal(THEME_SECTIONS, 8);
  assert.equal(THEME_LENGTH, 240);
  assert.equal(ENVIRONMENT_THEMES.length, 10);
  const ids = ['colombo', 'suburb', 'market', 'kotte', 'kandy', 'kadugannawa', 'nuwara-eliya', 'ella', 'galle', 'negombo'];
  ids.forEach((id, index) => {
    const start = index * THEME_SECTIONS;
    assert.equal(themeForSequence(start).id, id);
    assert.equal(themeForSequence(start + THEME_SECTIONS - 1).id, id);
    assert.equal(themeForDistance(index * THEME_LENGTH).id, id);
    assert.equal(themeForDistance((index + 1) * THEME_LENGTH - 0.01).id, id);
  });
  assert.equal(themeForSequence(ids.length * THEME_SECTIONS).id, 'colombo');
  assert.equal(themeSectionIndex(THEME_SECTIONS + 3), 3);
  for (let sequence = 0; sequence < 5000; sequence += 1) {
    assert.ok(ENVIRONMENT_THEMES.includes(themeForSequence(sequence)));
  }
});

test('all district landmarks are original articulated scenery and tunnels form consecutive runs', () => {
  for (const theme of ENVIRONMENT_THEMES) {
    const model = createDistrictLandmark(theme.landmark);
    assert.equal(model.userData.landmark, theme.landmark);
    let meshes = 0;
    model.traverse((node) => { if (node.isMesh) meshes += 1; });
    assert.ok(meshes >= 10, `${theme.id} landmark lacked detail`);
  }
  const tunnelThemes = ENVIRONMENT_THEMES.filter((theme) => theme.tunnelSections?.length);
  assert.deepEqual(tunnelThemes.map((theme) => theme.id), ['kadugannawa', 'ella']);
  for (const theme of tunnelThemes) {
    assert.equal(theme.tunnelSections.length, 2);
    assert.equal(theme.tunnelSections[1], theme.tunnelSections[0] + 1);
  }
  const tunnel = createTunnelSection(ROAD.sectionLength, { portalStart: true });
  assert.equal(tunnel.userData.tunnel, true);
  assert.ok(tunnel.children.length >= 18);
  const texts = [];
  tunnel.traverse((node) => { if (node.userData.text) texts.push(node.userData.text); });
  assert.ok(texts.includes('HILL COUNTRY TUNNEL'));
});

test('recycled district landmarks and tunnels keep primitive geometry bounded', () => {
  const world = new WorldGenerator(new THREE.Scene());
  const section = world.sections[0];
  for (let sequence = 0; sequence < ENVIRONMENT_THEMES.length * THEME_SECTIONS; sequence += 1) {
    world.buildScenery(section, sequence);
    const theme = themeForSequence(sequence);
    assert.equal(section.userData.tunnel, Boolean(theme.tunnelSections?.includes(themeSectionIndex(sequence))));
    if (themeSectionIndex(sequence) === 1) assert.equal(section.userData.landmark, theme.landmark);
  }
  const before = getMeshKitStats().geometries;
  for (let sequence = 80; sequence < 160; sequence += 1) world.buildScenery(section, sequence);
  assert.equal(getMeshKitStats().geometries, before);
});

test('primitive geometry cache remains bounded across varied regenerated dimensions', () => {
  const group = new THREE.Group();
  const before = getMeshKitStats().geometries;
  for (let index = 0; index < 500; index += 1) {
    box(group, [1 + index * 0.01, 2, 3], [0, 0, 0], 0x336699);
    sphere(group, 1 + index * 0.01, [0, 0, 0], 0x336699);
    cylinder(group, [0.1, 0.2], 2 + index * 0.01, [0, 0, 0], 0x336699);
    cone(group, 1 + index * 0.01, 3 + index * 0.01, [0, 0, 0], 0x336699);
  }
  const after = getMeshKitStats().geometries;
  assert.ok(after - before <= 4, `geometry cache grew by ${after - before} entries`);
});

test('touch swipes map to lane, jump and slide actions without duplicate listeners', () => {
  const keyboard = new FakeTarget();
  const touch = new FakeTarget();
  touch.setPointerCapture = () => {};
  const actions = [];
  const input = new InputController((action) => actions.push(action), keyboard);
  input.attachTouch(touch);
  input.attachTouch(touch);
  const gesture = (x, y, endX, endY) => {
    touch.emit('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: x, clientY: y });
    touch.emit('pointerup', { pointerType: 'touch', pointerId: 1, clientX: endX, clientY: endY });
  };
  gesture(100, 100, 50, 103);
  gesture(100, 100, 155, 103);
  gesture(100, 150, 103, 80);
  gesture(100, 100, 103, 180);
  gesture(100, 100, 104, 105);
  assert.deepEqual(actions, ['left', 'right', 'jump', 'slide']);
  assert.equal(touch.listeners.size, 4);
  input.destroy();
  assert.equal(touch.listeners.size, 0);
  assert.equal(keyboard.listeners.size, 0);
});

test('articulated character exposes connected joints and emits one landing callback', () => {
  let landings = 0;
  const player = new Player(new THREE.Scene(), { land: () => { landings += 1; } });
  for (const name of ['leftElbow', 'rightElbow', 'leftKnee', 'rightKnee']) assert.ok(player.joints[name]);
  assert.equal(player.joints.leftKnee.parent, player.joints.leftLeg);
  player.jump();
  for (let frame = 0; frame < 120; frame += 1) player.update(1 / 60, 14, 'running');
  assert.equal(landings, 1);
  assert.equal(player.group.position.y, 0);
});

test('audio remains lazy until interaction and mute preference persists', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  const audio = new AudioManager(storage);
  assert.equal(audio.context, null);
  assert.equal(audio.muted, false);
  assert.equal(audio.toggleMute(), true);
  assert.equal(audio.context, null);
  const restored = new AudioManager(storage);
  assert.equal(restored.muted, true);
});

test('vehicle wheel rotation follows travelled distance', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  const spawner = new ObstacleSpawner(scene);
  spawner.nextSpawnIn = 999;
  spawner.collisionEnabled = false;
  const entry = spawner.spawnObstacle('car', 1, PLAYER_Z - 20, 1);
  const wheel = entry.mesh.userData.wheels[0];
  const before = wheel.rotation.x;
  spawner.update(0.1, 20, player);
  assert.ok(wheel.rotation.x < before);
});
