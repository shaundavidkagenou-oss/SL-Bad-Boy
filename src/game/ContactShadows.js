import * as THREE from 'three';

function createShadowTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size * 2 - 1;
      const ny = (y + 0.5) / size * 2 - 1;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const alpha = 1 - THREE.MathUtils.smoothstep(radius, 0.18, 1);
      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
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

/** One transparent instanced draw for soft grounding, never a shadow-map pass. */
export class ContactShadows {
  constructor(scene, { capacity = 48 } = {}) {
    this.capacity = capacity;
    this.count = 0;
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.dark = new THREE.Color(0x18211f);
    this.road = new THREE.Color(0x495052);
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({
      map: createShadowTexture(),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'Pooled soft contact shadows';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  add(x, y, z, width, depth, height = 0) {
    if (this.count >= this.capacity) return;
    const fade = THREE.MathUtils.clamp(height / 2.2, 0, 0.86);
    const spread = 1 + height * 0.09;
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(-Math.PI / 2, 0, 0);
    this.dummy.scale.set(width * spread, depth * spread, 1);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.count, this.dummy.matrix);
    this.color.copy(this.dark).lerp(this.road, fade);
    this.mesh.setColorAt(this.count, this.color);
    this.count += 1;
  }

  update(player, police, entries) {
    this.count = 0;
    const playerPosition = player.group.position;
    this.add(playerPosition.x, 0.032, playerPosition.z,
      player.scooterActive ? 1.35 : 0.92, player.scooterActive ? 2.0 : 1.15, playerPosition.y);
    if (police.group.visible) {
      const position = police.group.position;
      this.add(position.x, 0.032, position.z, 0.9, 1.12, position.y);
    }
    for (const entry of entries) {
      if (entry.type !== 'obstacle' || entry.kind === 'overhead') continue;
      const position = entry.mesh.position;
      if (position.z < -82 || position.z > 19) continue;
      this.add(position.x, 0.031, position.z,
        entry.spec.width * 1.04, Math.max(0.72, entry.spec.depth * 0.88));
    }
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  reset() {
    this.count = 0;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  getStats() {
    return { capacity: this.capacity, instances: this.count, drawCalls: this.mesh.visible ? 1 : 0 };
  }
}
