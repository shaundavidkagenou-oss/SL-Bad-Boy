import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { themeForDistance, themeForSequence, ENVIRONMENT_THEMES } from '../src/game/EnvironmentThemes.js';
import { getMeshKitStats, box, sphere, cylinder, cone } from '../src/art/MeshKit.js';
import { InputController } from '../src/game/InputController.js';
import { Player } from '../src/game/Player.js';
import { AudioManager } from '../src/game/AudioManager.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';
import { PLAYER_Z } from '../src/config.js';

class FakeTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  removeEventListener(type) { this.listeners.delete(type); }
  emit(type, event) { this.listeners.get(type)?.({ preventDefault() {}, ...event }); }
}

test('district schedule transitions through four-section city, suburb and market blocks', () => {
  assert.equal(themeForSequence(0).id, 'colombo');
  assert.equal(themeForSequence(3).id, 'colombo');
  assert.equal(themeForSequence(4).id, 'suburb');
  assert.equal(themeForSequence(7).id, 'suburb');
  assert.equal(themeForSequence(8).id, 'market');
  assert.equal(themeForSequence(11).id, 'market');
  assert.equal(themeForSequence(12).id, 'colombo');
  assert.equal(themeForDistance(119.9).id, 'colombo');
  assert.equal(themeForDistance(120).id, 'suburb');
  assert.equal(themeForDistance(240).id, 'market');
  assert.equal(themeForDistance(360).id, 'colombo');
  for (let sequence = 0; sequence < 5000; sequence += 1) {
    assert.ok(ENVIRONMENT_THEMES.includes(themeForSequence(sequence)));
  }
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
