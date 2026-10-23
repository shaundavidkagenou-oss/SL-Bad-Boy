import * as THREE from 'three';
import { createShadowTexture } from './ContactShadows.js';

const BUS_KINDS = new Set(['public-bus', 'private-bus']);

/**
 * Low-angle projected silhouettes complement the soft contact pool. One soft
 * instanced draw gives long sunset shadows without a second shadow-map render.
 */
export class LongShadows {
  constructor(scene, { capacity = 32, enabled = true } = {}) {
    this.capacity = capacity;
    this.enabled = enabled;
    this.count = 0;
    this.dummy = new THREE.Object3D();
    this.direction = new THREE.Vector2(-0.55, 0.835).normalize();
    this.angle = Math.atan2(this.direction.x, this.direction.y);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.geometry.rotateX(-Math.PI / 2);
    this.material = new THREE.MeshBasicMaterial({
      map: createShadowTexture(), color: 0x282235, transparent: true, opacity: 0.28,
      depthWrite: false, toneMapped: false, polygonOffset: true,
      polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'Batched low-sun projected long shadows';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.count = 0;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  add(position, width, length) {
    if (this.count >= this.capacity) return;
    this.dummy.position.set(
      position.x + this.direction.x * length * 0.38,
      0.027,
      position.z + this.direction.y * length * 0.38,
    );
    this.dummy.rotation.set(0, this.angle, 0);
    this.dummy.scale.set(width, 1, length);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.count, this.dummy.matrix);
    this.count += 1;
  }

  update(player, police, entries) {
    this.count = 0;
    if (this.enabled) {
      this.add(player.group.position, player.scooterActive ? 1.15 : 0.72, player.scooterActive ? 5.8 : 4.9);
      if (police.group.visible) this.add(police.group.position, 0.72, 4.7);
      for (const entry of entries) {
        if (entry.type !== 'obstacle' || entry.kind === 'overhead') continue;
        const position = entry.mesh.position;
        if (position.z < -62 || position.z > 16) continue;
        const bus = BUS_KINDS.has(entry.kind);
        this.add(position, Math.min(2.2, entry.spec.width * 0.76), bus ? 7.4 : 4.4);
      }
    }
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }

  reset() {
    this.count = 0;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  getStats() {
    return {
      enabled: this.enabled, capacity: this.capacity, instances: this.count,
      drawCalls: this.mesh.visible ? 1 : 0, shadowMapPasses: 0,
    };
  }
}
