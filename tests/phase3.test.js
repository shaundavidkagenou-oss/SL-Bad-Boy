import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/game/Player.js';
import { PoliceChase, POLICE_MIN_GAP } from '../src/game/PoliceChase.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';
import { PLAYER_Z } from '../src/config.js';

test('Sri Lankan police pursuer has uniform details and articulated joints', () => {
  const scene = new THREE.Scene();
  const police = new PoliceChase(scene);
  assert.equal(police.visual.userData.isSriLankanPolice, true);
  assert.equal(police.visual.userData.uniform, 'khaki-shirt-trousers-navy-peaked-cap');
  for (const name of ['head', 'pelvis', 'baton', 'leftWrist', 'rightWrist', 'leftAnkle', 'rightAnkle']) {
    assert.ok(police.joints[name], `missing police joint: ${name}`);
  }
  assert.equal(police.joints.leftAnkle.parent, police.joints.leftKnee);
});

test('police chase never catches the player and responds to road hazards', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  const police = new PoliceChase(scene);
  for (let frame = 0; frame < 1200; frame += 1) {
    if (frame % 90 === 0) player.lane = (player.lane + 1) % 3;
    player.update(1 / 60, 14 + (frame % 400) * 0.05, 'running');
    police.update(1 / 60, 14 + (frame % 400) * 0.05, player, 'running', []);
    assert.ok(police.getGap() >= POLICE_MIN_GAP, `officer caught player at frame ${frame}`);
    assert.ok(Number.isFinite(police.group.position.x));
  }
  const hazard = {
    type: 'obstacle', lane: police.nearestLane(), spec: { avoid: 'jump' },
    mesh: { position: { z: police.group.position.z - 3 } },
  };
  police.update(1 / 60, 20, player, 'running', [hazard]);
  assert.ok(police.velocityY > 0 || police.group.position.y > 0);
  for (let frame = 0; frame < 120; frame += 1) police.update(1 / 60, 0, player, 'gameover', []);
  assert.ok(police.getGap() >= POLICE_MIN_GAP);
});

test('police pointing gesture, equipment motion and landing compression are animated', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  const police = new PoliceChase(scene);
  police.pointTimer = 0.75;
  for (let frame = 0; frame < 12; frame += 1) police.update(1 / 60, 18, player, 'running', []);
  assert.ok(police.joints.rightArm.rotation.x > 0.65);
  assert.ok(Math.abs(police.joints.baton.rotation.x) > 0.001);
  police.group.position.y = 0.02;
  police.velocityY = -4;
  police.update(1 / 60, 18, player, 'running', []);
  assert.equal(police.group.position.y, 0);
  assert.ok(police.landingTimer > 0);
  police.update(1 / 60, 18, player, 'running', []);
  assert.ok(police.visual.scale.y < police.baseScale);
});

test('selected buses genuinely approach faster while other traffic keeps road speed', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  const spawner = new ObstacleSpawner(scene);
  spawner.nextSpawnIn = 999;
  spawner.collisionEnabled = false;
  const bus = spawner.spawnObstacle('public-bus', 0, PLAYER_Z - 24, 1);
  const car = spawner.spawnObstacle('car', 2, PLAYER_Z - 24, 1);
  assert.equal(bus.oncoming, true);
  assert.ok(bus.approachSpeed >= 5);
  assert.equal(car.oncoming, false);
  const busBefore = bus.mesh.position.z;
  const carBefore = car.mesh.position.z;
  spawner.update(0.1, 20, player);
  const busTravel = bus.mesh.position.z - busBefore;
  const carTravel = car.mesh.position.z - carBefore;
  assert.ok(busTravel > carTravel + 0.49, `${busTravel} should exceed ${carTravel}`);
});

test('enhanced schoolboy has new joints and a timed coin celebration', () => {
  const player = new Player(new THREE.Scene());
  for (const name of ['head', 'backpack', 'leftWrist', 'rightWrist', 'leftAnkle', 'rightAnkle']) {
    assert.ok(player.joints[name], `missing schoolboy joint: ${name}`);
  }
  assert.equal(player.joints.rightAnkle.parent, player.joints.rightKnee);
  player.celebrate();
  for (let frame = 0; frame < 10; frame += 1) player.update(1 / 60, 14, 'running');
  assert.ok(player.coinTimer > 0);
  assert.ok(player.joints.rightArm.rotation.z > 0.4);
  for (let frame = 0; frame < 60; frame += 1) player.update(1 / 60, 14, 'running');
  assert.equal(player.coinTimer, 0);
});
