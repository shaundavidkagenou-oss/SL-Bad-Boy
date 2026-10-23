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

/** One bounded additive draw for visible bus lamp halos and optional road beams. */
export class RoadLightPools {
  constructor(scene, { capacity = 36, enabled = true, roadGlow = true } = {}) {
    this.capacity = capacity;
    this.enabled = enabled;
    this.roadGlow = roadGlow;
    this.count = 0;
    this.lampCount = 0;
    this.roadCount = 0;
    this.dummy = new THREE.Object3D();
    this.lampColor = new THREE.Color(1, 0.88, 0.62);
    this.roadColor = new THREE.Color(0.38, 0.24, 0.1);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: createGlowTexture(), color: 0xffffff, transparent: true, opacity: 0.82,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'Pooled bus headlight halos and road glow';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  update(entries) {
    this.count = 0;
    this.lampCount = 0;
    this.roadCount = 0;
    if (this.enabled) {
      for (const entry of entries) {
        if (entry.type !== 'obstacle' || !BUS_KINDS.has(entry.kind)) continue;
        const position = entry.mesh.position;
        if (position.z < -72 || position.z > 18) continue;
        const required = this.roadGlow ? 3 : 2;
        if (this.count + required > this.capacity) break;
        const frontZ = position.z + entry.spec.depth * 0.5;

        // Camera-facing halos keep the actual lamps readable in direct/mobile
        // rendering, where full-screen bloom may be unavailable.
        for (const side of [-1, 1]) {
          this.dummy.position.set(position.x + side * 0.88, 1.08, frontZ + 0.06);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.set(0.72, 0.58, 1);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(this.count, this.dummy.matrix);
          this.mesh.setColorAt(this.count, this.lampColor);
          this.count += 1;
          this.lampCount += 1;
        }

        if (this.roadGlow) {
          this.dummy.position.set(position.x, 0.046, frontZ + 2.65);
          this.dummy.rotation.set(-Math.PI / 2, 0, 0);
          this.dummy.scale.set(3.6, 7.5, 1);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(this.count, this.dummy.matrix);
          this.mesh.setColorAt(this.count, this.roadColor);
          this.count += 1;
          this.roadCount += 1;
        }
      }
    }
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  getStats() {
    return {
      enabled: this.enabled, roadGlow: this.roadGlow, capacity: this.capacity,
      instances: this.count, lamps: this.lampCount, roadPools: this.roadCount,
      drawCalls: this.mesh.visible ? 1 : 0,
    };
  }
}
