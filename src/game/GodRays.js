import * as THREE from 'three';

function createRayTexture(width = 32, height = 64) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const vertical = y / (height - 1);
    const lengthFade = Math.sin(vertical * Math.PI) * (1 - vertical * 0.42);
    for (let x = 0; x < width; x += 1) {
      const horizontal = Math.abs((x + 0.5) / width * 2 - 1);
      const edgeFade = 1 - THREE.MathUtils.smoothstep(horizontal, 0.08, 1);
      const offset = (y * width + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 232;
      data[offset + 2] = 190;
      data[offset + 3] = Math.round(edgeFade * lengthFade * 255);
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Bounded, depth-tested sunset shafts: one additive instanced draw, no raymarching. */
export class GodRays {
  constructor(scene, { capacity = 7, enabled = true } = {}) {
    this.capacity = capacity;
    this.enabled = enabled;
    this.time = 0;
    this.dummy = new THREE.Object3D();
    this.state = new Float32Array(capacity * 4);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: createRayTexture(), color: 0xffc58d, transparent: true, opacity: 0.085,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
      side: THREE.DoubleSide, toneMapped: false, fog: true,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'Batched golden-hour god rays';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    for (let index = 0; index < capacity; index += 1) {
      const offset = index * 4;
      this.state[offset] = (index % 2 ? -1 : 1) * (3.8 + (index % 3) * 3.4);
      this.state[offset + 1] = 9 + (index % 3) * 2.1;
      this.state[offset + 2] = -17 - index * 22;
      this.state[offset + 3] = 19 + (index % 2) * 7;
    }
    scene.add(this.mesh);
    this.update(0, 0, 'menu');
  }

  update(delta, speed, state) {
    this.mesh.visible = this.enabled;
    if (!this.enabled) return;
    if (state !== 'paused' && state !== 'revive') {
      this.time += delta;
      const travel = state === 'running' ? speed * delta : 0;
      for (let index = 0; index < this.capacity; index += 1) {
        const offset = index * 4;
        this.state[offset + 2] += travel;
        if (this.state[offset + 2] > 19) this.state[offset + 2] -= 165;
        this.dummy.position.set(this.state[offset], this.state[offset + 1], this.state[offset + 2]);
        this.dummy.rotation.set(0, 0, -0.4);
        this.dummy.scale.set(3.1 + (index % 3) * 0.75, this.state[offset + 3], 1);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(index, this.dummy.matrix);
      }
      this.material.opacity = 0.076 + Math.sin(this.time * 0.42) * 0.009;
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  getStats() {
    return {
      enabled: this.enabled, capacity: this.capacity,
      instances: this.enabled ? this.capacity : 0, drawCalls: this.enabled ? 1 : 0,
    };
  }
}
