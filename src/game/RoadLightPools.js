import * as THREE from 'three';

const BUS_KINDS = new Set(['public-bus', 'private-bus']);

function createGlowTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size * 2 - 1;
      const ny = (y + 0.5) / size * 2 - 1;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const alpha = 1 - THREE.MathUtils.smoothstep(radius, 0.04, 1);
      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 239;
      data[offset + 2] = 194;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** One bounded additive instanced draw for bus headlight glow, never per-bus lights. */
export class RoadLightPools {
  constructor(scene, { capacity = 20, enabled = true } = {}) {
    this.capacity = capacity;
    this.enabled = enabled;
    this.count = 0;
    this.dummy = new THREE.Object3D();
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: createGlowTexture(), color: 0xffd28a, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'Pooled bus headlight road glow';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  update(entries) {
    this.count = 0;
    if (this.enabled) {
      for (const entry of entries) {
        if (this.count >= this.capacity) break;
        if (entry.type !== 'obstacle' || !BUS_KINDS.has(entry.kind)) continue;
        const position = entry.mesh.position;
        if (position.z < -72 || position.z > 18) continue;
        const length = 7.5;
        this.dummy.position.set(position.x, 0.046, position.z + entry.spec.depth * 0.5 + 2.65);
        this.dummy.rotation.set(-Math.PI / 2, 0, 0);
        this.dummy.scale.set(3.6, length, 1);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(this.count, this.dummy.matrix);
        this.count += 1;
      }
    }
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count > 0) this.mesh.instanceMatrix.needsUpdate = true;
  }

  getStats() {
    return {
      enabled: this.enabled, capacity: this.capacity, instances: this.count,
      drawCalls: this.mesh.visible ? 1 : 0,
    };
  }
}
