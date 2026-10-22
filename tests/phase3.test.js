import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/game/Player.js';
import { PoliceChase, POLICE_MIN_GAP } from '../src/game/PoliceChase.js';
import { ObstacleSpawner } from '../src/game/ObstacleSpawner.js';
import { GAME, PLAYER_Z } from '../src/config.js';
import { speedForElapsed } from '../src/game/Game.js';

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

test('enhanced schoolboy retains running joints but never waves or celebrates coins', () => {
  const player = new Player(new THREE.Scene());
  for (const name of ['head', 'backpack', 'leftWrist', 'rightWrist', 'leftAnkle', 'rightAnkle']) {
    assert.ok(player.joints[name], `missing schoolboy joint: ${name}`);
  }
  assert.equal(player.joints.rightAnkle.parent, player.joints.rightKnee);
  assert.equal(typeof player.celebrate, 'undefined');
  assert.equal('coinTimer' in player, false);
  player.joints.rightArm.rotation.z = 1.2;
  player.joints.rightWrist.rotation.z = 0.5;
  player.update(1 / 60, 0, 'menu');
  assert.equal(player.joints.rightArm.rotation.z, 0);
  assert.equal(player.joints.rightWrist.rotation.z, 0);
  player.joints.rightArm.rotation.z = 1.2;
  for (let frame = 0; frame < 90; frame += 1) player.update(1 / 60, 14, 'running');
  assert.ok(Math.abs(player.joints.rightArm.rotation.z) < 0.001);
  assert.ok(Math.abs(player.joints.leftLeg.rotation.x) > 0.01 || Math.abs(player.joints.rightLeg.rotation.x) > 0.01);
});

test('scooter pickup is swept, rides for ten seconds, pauses and resets cleanly', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  let pickups = 0;
  const spawner = new ObstacleSpawner(scene, { onScooter: () => { pickups += 1; player.startScooter(); } });
  spawner.nextSpawnIn = 999;
  spawner.spawnScooter(1, PLAYER_Z - 6, 910);
  spawner.update(0.5, GAME.baseSpeed * GAME.scooterMultiplier, player);
  assert.equal(pickups, 1);
  assert.equal(spawner.getRowEntries(910).length, 0);
  assert.equal(player.scooterActive, true);
  assert.equal(player.scooter.visible, true);
  assert.equal(player.shield.visible, true);
  assert.equal(player.scooterTimer, GAME.scooterDuration);
  const wheel = player.scooter.userData.wheels[0];
  const wheelBefore = wheel.rotation.x;
  for (let frame = 0; frame < 300; frame += 1) player.update(1 / 60, GAME.baseSpeed * GAME.scooterMultiplier, 'running');
  assert.ok(wheel.rotation.x < wheelBefore);
  assert.ok(player.joints.leftKnee.rotation.x < -0.2);
  assert.ok(player.joints.leftArm.rotation.x > 0.4);
  assert.ok(player.scooterTimer > 4.9 && player.scooterTimer <= 5.1);
  const pausedTimer = player.scooterTimer;
  player.update(2, GAME.baseSpeed * GAME.scooterMultiplier, 'paused');
  assert.equal(player.scooterTimer, pausedTimer);
  for (let frame = 0; frame < 302; frame += 1) player.update(1 / 60, GAME.baseSpeed * GAME.scooterMultiplier, 'running');
  assert.equal(player.scooterActive, false);
  assert.equal(player.scooterTimer, 0);
  assert.equal(player.scooter.visible, false);
  player.startScooter();
  player.reset();
  assert.equal(player.scooterActive, false);
  assert.equal(player.shield.visible, false);
});

test('1.2-times speed is literal and scooter traffic shield replaces only boosted crashes', () => {
  assert.equal(GAME.scooterMultiplier, 1.2);
  assert.equal(GAME.scooterDuration, 10);
  assert.equal(speedForElapsed(8, true), speedForElapsed(8, false) * 1.2);
  assert.equal(speedForElapsed(10000, true), GAME.maxSpeed * 1.2);
  const scene = new THREE.Scene();
  const player = new Player(scene);
  let hits = 0;
  let shieldHits = 0;
  const spawner = new ObstacleSpawner(scene, { onHit: () => { hits += 1; }, onShieldHit: () => { shieldHits += 1; } });
  spawner.nextSpawnIn = 999;
  player.startScooter();
  spawner.spawnObstacle('car', 1, PLAYER_Z - 6, 911);
  const result = spawner.update(0.5, GAME.baseSpeed * GAME.scooterMultiplier, player);
  assert.equal(result, 'running');
  assert.equal(hits, 0);
  assert.equal(shieldHits, 1);
  assert.equal(spawner.getRowEntries(911).length, 0);
  player.stopScooter();
  spawner.spawnObstacle('cone', 1, PLAYER_Z, 912);
  assert.equal(spawner.update(0.01, 14, player), 'hit');
  assert.equal(hits, 1);
});

test('officer is hidden on menu, sprints on run start, falls behind on scooter and returns', () => {
  const scene = new THREE.Scene();
  const player = new Player(scene);
  const police = new PoliceChase(scene);
  police.update(1 / 60, 0, player, 'menu', []);
  assert.equal(police.group.visible, false);
  assert.equal(police.chaseStarted, false);
  const phase = police.runPhase;
  police.update(1 / 60, 14, player, 'running', []);
  assert.equal(police.chaseStarted, true);
  assert.equal(police.group.visible, true);
  assert.ok(police.runPhase > phase);
  for (let frame = 0; frame < 15; frame += 1) police.update(1 / 60, 14, player, 'running', []);
  const stride = police.joints.leftLeg.rotation.x;
  const stridePhase = police.runPhase;
  for (let frame = 0; frame < 15; frame += 1) police.update(1 / 60, 14, player, 'running', []);
  assert.ok(police.runPhase > stridePhase + 2);
  assert.ok(Math.abs(police.joints.leftLeg.rotation.x - stride) > 0.001);
  player.startScooter();
  for (let frame = 0; frame < 300; frame += 1) {
    player.update(1 / 60, GAME.baseSpeed * GAME.scooterMultiplier, 'running');
    police.update(1 / 60, GAME.baseSpeed * GAME.scooterMultiplier, player, 'running', []);
  }
  assert.ok(police.getGap() > 12, `boost gap was ${police.getGap()}`);
  assert.equal(police.group.visible, false);
  player.stopScooter();
  for (let frame = 0; frame < 240; frame += 1) police.update(1 / 60, 18, player, 'running', []);
  assert.ok(police.getGap() < 4, `officer did not return: ${police.getGap()}`);
  assert.ok(police.getGap() >= POLICE_MIN_GAP);
  assert.equal(police.group.visible, true);
});
