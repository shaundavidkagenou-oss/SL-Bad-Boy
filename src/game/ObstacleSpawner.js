import * as THREE from 'three';
import { GAME, LANES, OBSTACLE_SPECS } from '../config.js';
import { createObstacleModel } from '../art/Vehicles.js';
import { createCoin } from '../art/MeshKit.js';
import { PatternPlanner } from './PatternPlanner.js';
import { intersects, makeCollider } from './Collision.js';

export class ObstacleSpawner {
  constructor(scene, { onCoin = () => {}, onHit = () => {} } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'Traffic, road hazards and coins';
    scene.add(this.group);
    this.entries = [];
    this.planner = new PatternPlanner();
    this.onCoin = onCoin;
    this.onHit = onHit;
    this.nextSpawnIn = 30;
    this.collisionEnabled = true;
  }

  clear() {
    for (const entry of this.entries) this.group.remove(entry.mesh);
    this.entries.length = 0;
  }

  reset(seed = Date.now()) {
    this.clear();
    this.planner.reset(seed);
    this.collisionEnabled = true;
    this.nextSpawnIn = 30;
    for (let index = 0; index < 5; index += 1) {
      this.spawnPattern(this.planner.next(), -42 - index * 30);
    }
  }

  spawnPattern(pattern, z) {
    let approachSpeed = 0;
    for (const obstacle of pattern.obstacles) {
      const entry = this.spawnObstacle(obstacle.kind, obstacle.lane, z, pattern.id);
      approachSpeed = Math.max(approachSpeed, entry.approachSpeed);
    }
    for (const coin of pattern.coins) {
      this.spawnCoin(coin.lane, z + coin.z, coin.y, pattern.id);
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
    // Only a deterministic subset approaches under its own power. The first
    // solo bus demonstrates the behavior; later rows retain a free lane.
    const oncoming = bus && (options.oncoming
      ?? (rowId >= 0 && (rowId === 1 || Math.abs(rowId * 11 + lane * 7) % 4 === 0)));
    const approachSpeed = oncoming ? 5 + Math.abs(rowId + lane) % 3 : 0;
    mesh.userData.oncoming = oncoming;
    this.group.add(mesh);
    const entry = { type: 'obstacle', kind, lane, rowId, spec, mesh, oncoming, approachSpeed };
    this.entries.push(entry);
    return entry;
  }

  spawnCoin(lane, z, y = 1, rowId = -1) {
    const mesh = createCoin();
    mesh.position.set(LANES[lane], y, z);
    this.group.add(mesh);
    const entry = {
      type: 'coin', kind: 'coin', lane, rowId, mesh, baseY: y,
      spec: { width: 0.62, depth: 0.4, minY: -0.32, maxY: 0.32 },
      spin: (rowId + z) * 0.17,
    };
    this.entries.push(entry);
    return entry;
  }

  removeEntry(index) {
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

  update(delta, speed, player) {
    const travel = speed * delta;
    this.nextSpawnIn -= travel;
    const playerCollider = player.getCollider();

    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index];
      const entryTravel = travel + (entry.approachSpeed || 0) * delta;
      entry.mesh.position.z += entryTravel;

      if (entry.type === 'coin') {
        entry.spin += delta * 5;
        entry.mesh.rotation.y = entry.spin;
        entry.mesh.position.y = entry.baseY + Math.sin(entry.spin * 1.4) * 0.055;
      } else if (entry.mesh.userData.wheels) {
        for (const wheel of entry.mesh.userData.wheels) {
          wheel.rotation.x -= entryTravel / (wheel.userData.radius || 0.4);
        }
      }

      if (entry.mesh.position.z > 22) {
        this.removeEntry(index);
        continue;
      }

      if (!this.collisionEnabled || Math.abs(entry.mesh.position.z - player.group.position.z) > 6) continue;
      if (!intersects(playerCollider, this.getCollider(entry, entryTravel))) continue;

      if (entry.type === 'coin') {
        this.removeEntry(index);
        this.onCoin(entry);
      } else {
        this.onHit(entry);
        return 'hit';
      }
    }

    if (this.nextSpawnIn <= 0) {
      const approachSpeed = this.spawnPattern(this.planner.next(), GAME.spawnZ);
      // Extra following distance preserves reaction time after a faster bus row.
      this.nextSpawnIn = this.planner.spacingForSpeed(speed + approachSpeed);
    }
    return 'running';
  }

  getActiveKinds() {
    return [...new Set(this.entries.filter((entry) => entry.type === 'obstacle').map((entry) => entry.kind))];
  }

  getRowEntries(rowId) {
    return this.entries.filter((entry) => entry.rowId === rowId);
  }
}
