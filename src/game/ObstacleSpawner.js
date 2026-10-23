import * as THREE from 'three';
import { GAME, LANES, OBSTACLE_SPECS } from '../config.js';
import { createObstacleModel } from '../art/Vehicles.js';
import { createCoin } from '../art/MeshKit.js';
import { createScooter } from '../art/Scooter.js';
import { createJuicePacket } from '../art/JuicePacket.js';
import { ENVIRONMENT_THEMES } from './EnvironmentThemes.js';
import { PatternPlanner } from './PatternPlanner.js';
import { intersects, makeCollider } from './Collision.js';
import { disposeBatchedGeometry } from '../art/StaticBatcher.js';

const SCOOTER_HALO_GEOMETRY = new THREE.TorusGeometry(1.05, 0.045, 6, 28);
const SCOOTER_HALO_MATERIAL = new THREE.MeshBasicMaterial({ color: 0x73fff2, transparent: true, opacity: 0.72, depthWrite: false });
const NEAR_MISS_VEHICLES = new Set(['public-bus', 'private-bus', 'car', 'tuk-tuk']);
const COIN_CAPACITY = 96;

export class ObstacleSpawner {
  constructor(scene, { onCoin = () => {}, onHit = () => {}, onScooter = () => {}, onShieldHit = () => {}, onNearMiss = () => {}, onJuice = () => {} } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'Traffic, road hazards and coins';
    scene.add(this.group);
    this.entries = [];
    const coinTemplate = createCoin();
    this.coinPool = new THREE.InstancedMesh(coinTemplate.geometry, coinTemplate.material, COIN_CAPACITY);
    this.coinPool.name = 'Instanced lotus-sun coin trails';
    this.coinPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinPool.frustumCulled = false;
    this.coinPool.count = 0;
    this.coinPool.visible = false;
    this.group.add(this.coinPool);
    this.planner = new PatternPlanner();
    this.onCoin = onCoin;
    this.onHit = onHit;
    this.onScooter = onScooter;
    this.onShieldHit = onShieldHit;
    this.onNearMiss = onNearMiss;
    this.onJuice = onJuice;
    this.nextSpawnIn = 30;
    this.nextScooterIn = 320;
    this.collisionEnabled = true;
    this.district = 'colombo';
    this.pendingJuice = false;
    this.trafficOrder = [];
  }

  setDistrict(themeId) {
    const nextDistrict = themeId || 'colombo';
    const changed = nextDistrict !== this.district;
    this.district = nextDistrict;
    const index = ENVIRONMENT_THEMES.findIndex((theme) => theme.id === nextDistrict);
    if (changed && index > 0 && index % 2 === 1) this.pendingJuice = true;
  }

  clear() {
    for (const entry of this.entries) {
      disposeBatchedGeometry(entry.mesh);
      this.group.remove(entry.mesh);
    }
    this.entries.length = 0;
    this.syncCoins();
  }

  reset(seed = Date.now()) {
    this.clear();
    this.planner.reset(seed);
    this.collisionEnabled = true;
    this.district = 'colombo';
    this.pendingJuice = false;
    this.nextSpawnIn = 30;
    this.nextScooterIn = 320;
    for (let index = 0; index < 5; index += 1) {
      this.spawnPattern(this.planner.next(), -42 - index * 30);
    }
    // The first pickup is centered between rows, so it is always reachable.
    this.spawnScooter(1, -57);
    this.syncCoins();
  }

  spawnPattern(pattern, z) {
    let approachSpeed = 0;
    const obstacles = pattern.obstacles.map((obstacle) => ({ ...obstacle }));
    // Colombo is busier, never less fair: only add same-direction traffic to
    // non-action rows and preserve the planner's guaranteed free lane.
    if (this.district === 'colombo' && !pattern.requiredAction && Number.isInteger(pattern.freeLane)) {
      const trafficKinds = ['public-bus', 'car', 'private-bus', 'tuk-tuk'];
      const targetCount = pattern.obstacles.length === 0 ? 1 : 2;
      for (const lane of [0, 1, 2]) {
        if (obstacles.length >= targetCount) break;
        if (lane === pattern.freeLane || obstacles.some((obstacle) => obstacle.lane === lane)) continue;
        obstacles.push({ kind: trafficKinds[Math.abs(pattern.id * 3 + lane) % trafficKinds.length], lane, oncoming: false });
      }
    }
    for (const obstacle of obstacles) {
      const entry = this.spawnObstacle(obstacle.kind, obstacle.lane, z, pattern.id, { oncoming: obstacle.oncoming });
      approachSpeed = Math.max(approachSpeed, entry.approachSpeed);
    }
    for (const coin of pattern.coins) {
      this.spawnCoin(coin.lane, z + coin.z, coin.y, pattern.id);
    }
    if (this.pendingJuice && !pattern.requiredAction && Number.isInteger(pattern.freeLane)) {
      this.spawnJuice(pattern.freeLane, z + 6, pattern.id);
      this.pendingJuice = false;
    }
    return approachSpeed;
  }

  spawnObstacle(kind, lane, z, rowId = -1, options = {}) {
    const spec = OBSTACLE_SPECS[kind];
    if (!spec) throw new Error(`Cannot spawn unknown obstacle: ${kind}`);
    const mesh = createObstacleModel(kind, Math.abs(rowId * 3 + lane) % 4);
    mesh.position.set(LANES[lane], 0, z);
    mesh.userData.kind = kind;
    const bus = kind === 'public-bus' || kind === 'private-bus';
    // Normal planner rows always keep road speed. Faster movement is reserved
    // for explicit isolated tests, never inferred from a live gameplay row ID.
    const oncoming = bus && options.oncoming === true;
    const approachSpeed = oncoming ? 5 + Math.abs(rowId + lane) % 3 : 0;
    mesh.userData.oncoming = oncoming;
    this.group.add(mesh);
    const entry = { type: 'obstacle', kind, lane, rowId, spec, mesh, oncoming, approachSpeed, currentApproachSpeed: approachSpeed };
    this.entries.push(entry);
    return entry;
  }

  spawnCoin(lane, z, y = 1, rowId = -1) {
    // Lightweight transform proxies retain the existing collision/gameplay API;
    // the shared InstancedMesh renders every coin trail in one draw.
    const mesh = new THREE.Object3D();
    mesh.userData.coin = true;
    mesh.position.set(LANES[lane], y, z);
    const entry = {
      type: 'coin', kind: 'coin', lane, rowId, mesh, baseY: y,
      spec: { width: 0.62, depth: 0.4, minY: -0.32, maxY: 0.32 },
      spin: (rowId + z) * 0.17,
    };
    this.entries.push(entry);
    return entry;
  }

  spawnJuice(lane, z, rowId = -1) {
    const mesh = createJuicePacket();
    mesh.position.set(LANES[lane], 1.05, z);
    this.group.add(mesh);
    const entry = {
      type: 'juice', kind: 'juice', lane, rowId, mesh, baseY: 1.05,
      spec: { width: 0.78, depth: 0.48, minY: -0.38, maxY: 0.38 }, spin: 0,
    };
    this.entries.push(entry);
    return entry;
  }

  spawnScooter(lane, z, rowId = -1) {
    const mesh = createScooter(0x159c91);
    mesh.position.set(LANES[lane], 0, z);
    const halo = new THREE.Mesh(SCOOTER_HALO_GEOMETRY, SCOOTER_HALO_MATERIAL);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.07;
    mesh.add(halo);
    mesh.userData.pickupHalo = halo;
    this.group.add(mesh);
    const entry = {
      type: 'scooter', kind: 'scooter', lane, rowId, mesh, baseY: 0,
      spec: { width: 1.2, depth: 2.1, minY: 0, maxY: 1.75 },
      spin: 0,
    };
    this.entries.push(entry);
    return entry;
  }

  removeEntry(index) {
    disposeBatchedGeometry(this.entries[index].mesh);
    this.group.remove(this.entries[index].mesh);
    this.entries.splice(index, 1);
  }

  getCollider(entry, sweepDistance = 0) {
    const { x, y, z } = entry.mesh.position;
    const spec = entry.spec;
    const collider = makeCollider(x, y, z, spec.width, spec.minY, spec.maxY, spec.depth);
    // Include the space crossed since the previous frame. Without this sweep,
    // a low-FPS frame could move a small coin or car completely past the player.
    collider.minZ -= Math.max(0, sweepDistance);
    return collider;
  }

  updateTrafficFlow(delta) {
    this.trafficOrder.length = 0;
    for (const entry of this.entries) {
      if (entry.type === 'obstacle') this.trafficOrder.push(entry);
    }
    this.trafficOrder.sort((a, b) => b.mesh.position.z - a.mesh.position.z);
    const nearestAhead = [null, null, null];
    const step = Math.max(delta, 1 / 240);
    for (const entry of this.trafficOrder) {
      let flowSpeed = entry.oncoming ? entry.approachSpeed : 0;
      const ahead = nearestAhead[entry.lane];
      if (flowSpeed > 0 && ahead) {
        const safeGap = (entry.spec.depth + ahead.spec.depth) * 0.5 + 0.55;
        const gap = ahead.mesh.position.z - entry.mesh.position.z;
        const aheadFlow = ahead.currentApproachSpeed || 0;
        const gapLimitedFlow = aheadFlow + (gap - safeGap) / step;
        flowSpeed = Math.max(0, Math.min(flowSpeed, gapLimitedFlow));
      }
      entry.currentApproachSpeed = flowSpeed;
      entry.mesh.userData.trafficBraking = entry.oncoming && flowSpeed < entry.approachSpeed - 0.01;
      nearestAhead[entry.lane] = entry;
    }
  }

  checkNearMiss(entry, previousRelativeZ, relativeZ, playerCollider, player) {
    if (entry.nearMissAwarded || entry.type !== 'obstacle' || !NEAR_MISS_VEHICLES.has(entry.kind)) return;
    const threshold = entry.spec.depth * 0.5 + 0.3;
    if (previousRelativeZ > threshold || relativeZ <= threshold) return;
    entry.nearMissAwarded = true;
    const playerWidth = playerCollider.maxX - playerCollider.minX;
    const clearance = Math.abs(entry.mesh.position.x - player.group.position.x)
      - (entry.spec.width + playerWidth) * 0.5;
    if (clearance >= 0 && clearance < 0.8) {
      const direction = Math.sign(player.group.position.x - entry.mesh.position.x);
      this.onNearMiss(entry, clearance, direction);
    }
  }

  syncCoins() {
    let count = 0;
    for (const entry of this.entries) {
      if (entry.type !== 'coin' || count >= COIN_CAPACITY) continue;
      entry.mesh.updateMatrix();
      this.coinPool.setMatrixAt(count, entry.mesh.matrix);
      count += 1;
    }
    this.coinPool.count = count;
    this.coinPool.visible = count > 0;
    if (count > 0) this.coinPool.instanceMatrix.needsUpdate = true;
  }

  update(delta, speed, player) {
    const travel = speed * delta;
    this.updateTrafficFlow(delta);
    this.nextSpawnIn -= travel;
    if (!player.scooterActive) this.nextScooterIn -= travel;
    const playerCollider = player.getCollider();

    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      const previousRelativeZ = entry.mesh.position.z - player.group.position.z;
      const entryTravel = travel + (entry.currentApproachSpeed || 0) * delta;
      entry.mesh.position.z += entryTravel;

      if (entry.type === 'coin') {
        entry.spin += delta * 5;
        entry.mesh.rotation.y = entry.spin;
        entry.mesh.position.y = entry.baseY + Math.sin(entry.spin * 1.4) * 0.055;
      } else if (entry.type === 'juice') {
        entry.spin += delta * 2.2;
        entry.mesh.rotation.y = Math.sin(entry.spin) * 0.42;
        entry.mesh.position.y = entry.baseY + Math.sin(entry.spin * 1.6) * 0.09;
        entry.mesh.userData.pickupHalo.rotation.z += delta * 0.9;
      } else if (entry.type === 'scooter') {
        entry.spin += delta * 2.4;
        const pulse = 1 + Math.sin(entry.spin * 2) * 0.08;
        entry.mesh.userData.pickupHalo.scale.setScalar(pulse);
        entry.mesh.userData.pickupHalo.rotation.z += delta * 0.8;
        for (const wheel of entry.mesh.userData.wheels) {
          wheel.rotation.x -= entryTravel / (wheel.userData.radius || 0.34);
        }
      } else if (entry.mesh.userData.wheels) {
        for (const wheel of entry.mesh.userData.wheels) {
          wheel.rotation.x -= entryTravel / (wheel.userData.radius || 0.4);
        }
      }

      if (entry.mesh.position.z > 22) {
        this.removeEntry(index);
        continue;
      }

      const relativeZ = entry.mesh.position.z - player.group.position.z;
      if (!this.collisionEnabled || relativeZ < -6 || relativeZ > 6 + entryTravel) continue;
      if (entry.type === 'obstacle' && player.invincibleTimer > 0) continue;
      if (!intersects(playerCollider, this.getCollider(entry, entryTravel))) {
        this.checkNearMiss(entry, previousRelativeZ, relativeZ, playerCollider, player);
        continue;
      }

      if (entry.type === 'coin') {
        this.removeEntry(index);
        this.onCoin(entry);
      } else if (entry.type === 'juice') {
        if (this.onJuice(entry) === false) continue;
        this.removeEntry(index);
      } else if (entry.type === 'scooter') {
        this.removeEntry(index);
        this.onScooter(entry);
      } else if (player.scooterActive) {
        this.removeEntry(index);
        this.onShieldHit(entry);
      } else {
        this.onHit(entry);
        this.syncCoins();
        return 'hit';
      }
    }

    if (this.nextSpawnIn <= 0) {
      this.spawnPattern(this.planner.next(speed), GAME.spawnZ);
      this.nextSpawnIn = this.planner.spacingForSpeed(speed);
    }
    if (this.nextScooterIn <= 0 && !player.scooterActive) {
      this.spawnScooter(this.planner.randomLane(), GAME.spawnZ + 12);
      this.nextScooterIn = 280 + Math.floor(this.planner.random() * 140);
    }
    this.syncCoins();
    return 'running';
  }

  prepareRespawn() {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      if (entry.type === 'obstacle' && entry.mesh.position.z > -70) this.removeEntry(index);
    }
    this.nextSpawnIn = Math.max(this.nextSpawnIn, 30);
    this.syncCoins();
  }

  getActiveKinds() {
    return [...new Set(this.entries.filter((entry) => entry.type === 'obstacle').map((entry) => entry.kind))];
  }

  getRowEntries(rowId) {
    return this.entries.filter((entry) => entry.rowId === rowId);
  }
}
