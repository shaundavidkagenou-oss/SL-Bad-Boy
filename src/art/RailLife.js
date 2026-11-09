import * as THREE from 'three';
import { box, capsule, cylinder, roundedBox, sphere, torus } from './MeshKit.js';
import { batchStaticGroup } from './StaticBatcher.js';

/** Monsoon shower: one LineSegments draw, quality-scaled and camera-following. */
export class MonsoonRain {
  constructor(scene, { count = 360 } = {}) {
    this.count = count;
    this.group = new THREE.Group();
    this.group.name = 'Monsoon shower';
    this.group.visible = false;
    scene.add(this.group);
    this.positions = new Float32Array(count * 6);
    this.drops = [];
    for (let index = 0; index < count; index += 1) {
      this.drops.push({
        x: (Math.random() - 0.5) * 44,
        y: Math.random() * 16,
        z: (Math.random() - 0.5) * 52 - 12,
        length: 0.55 + Math.random() * 0.85,
        speed: 17 + Math.random() * 9,
      });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.LineBasicMaterial({
      color: 0xc2d8e6, transparent: true, opacity: 0.34, depthWrite: false,
    });
    this.lines = new THREE.LineSegments(geometry, this.material);
    this.lines.frustumCulled = false;
    this.group.add(this.lines);
    this.visible = false;
    this.density = 1;
    this.performanceScale = 1;
  }

  /** Graphics-tier density; keeps one pooled draw but shortens the draw range. */
  setDensity(fraction) {
    this.density = Math.max(0.1, Math.min(1, fraction));
    if (this.visible) this.applyDrawRange();
  }

  applyDrawRange() {
    const active = Math.floor(this.count * this.density * this.performanceScale);
    this.lines.geometry.setDrawRange(0, Math.max(0, active) * 2);
  }

  setActive(active, performanceMode = false) {
    const next = Boolean(active);
    if (next === this.visible) return;
    this.visible = next;
    this.group.visible = next;
    this.performanceScale = performanceMode ? 0.55 : 1;
    this.applyDrawRange();
  }

  update(delta, player, performanceMode = false) {
    if (!this.visible) return;
    this.group.position.set(player.group.position.x, 0, player.group.position.z);
    const positions = this.positions;
    const limit = performanceMode ? Math.floor(this.count * 0.55) : this.count;
    for (let index = 0; index < limit; index += 1) {
      const drop = this.drops[index];
      drop.y -= drop.speed * delta;
      if (drop.y < 0) {
        drop.y += 16;
        drop.x = (Math.random() - 0.5) * 44;
        drop.z = (Math.random() - 0.5) * 52 - 12;
      }
      const offset = index * 6;
      // Slight slant sells wind while keeping the streak count identical.
      positions[offset] = drop.x;
      positions[offset + 1] = drop.y;
      positions[offset + 2] = drop.z;
      positions[offset + 3] = drop.x + 0.14;
      positions[offset + 4] = drop.y + drop.length;
      positions[offset + 5] = drop.z + 0.05;
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
  }
}

/** Sleepers, rails and a cleared corridor for hill-country sections. */
export function createRailwayTrack(sectionLength = 30) {
  const root = new THREE.Group();
  root.name = 'Hill country railway track';
  root.userData.railway = true;
  box(root, [2.9, 0.22, sectionLength], [0, 0.11, 0], 0x8b8574, { roughness: 0.95 });
  for (let z = -sectionLength / 2 + 0.6; z < sectionLength / 2; z += 0.9) {
    box(root, [2.5, 0.12, 0.26], [0, 0.24, z], 0x5c4b3a, { roughness: 0.95 });
  }
  for (const x of [-0.72, 0.72]) {
    box(root, [0.12, 0.14, sectionLength], [x, 0.36, 0], 0x9aa0a2, { metalness: 0.55, roughness: 0.42 });
    box(root, [0.18, 0.05, sectionLength], [x, 0.29, 0], 0x6f7477);
  }
  for (const z of [-sectionLength / 3, sectionLength / 3]) {
    cylinder(root, [0.06], 1.5, [2.1, 0.75, z], 0x3f4749, { segments: 6 });
    roundedBox(root, [0.32, 0.24, 0.08], [2.1, 1.5, z], 0x2a3134, { radius: 0.03 });
    sphere(root, 0.08, [2.1, 1.5, z + 0.06], 0x7fe3a0, {
      scale: [1, 1, 0.5], emissive: 0x2fbf62, emissiveIntensity: 0.8, widthSegments: 8, heightSegments: 6,
    });
  }
  return batchStaticGroup(root);
}

/** Blue-and-cream hill country train; batched once and animated along the rails. */
export function createRailwayTrain() {
  const root = new THREE.Group();
  root.name = 'Hill country train';
  const bodyColor = 0x2c5a86;
  const cream = 0xf0e6cf;
  const length = 26;
  for (let carriage = 0; carriage < 3; carriage += 1) {
    const z = carriage * 8.6;
    roundedBox(root, [2.35, 2.15, 7.6], [0, 2.2, z], bodyColor, { radius: 0.14, segments: 2, roughness: 0.6 });
    roundedBox(root, [2.4, 0.55, 7.7], [0, 1.15, z], cream, { radius: 0.08, roughness: 0.65 });
    box(root, [2.42, 0.09, 7.7], [0, 3.2, z], 0xb9b3a0);
    for (let window = 0; window < 5; window += 1) {
      box(root, [0.06, 0.62, 0.95], [1.2, 2.45, z - 2.8 + window * 1.4], 0xffe9b0, {
        emissive: 0xffcf7a, emissiveIntensity: 0.55, roughness: 0.3,
      });
      box(root, [0.06, 0.62, 0.95], [-1.2, 2.45, z - 2.8 + window * 1.4], 0xffe9b0, {
        emissive: 0xffcf7a, emissiveIntensity: 0.55, roughness: 0.3,
      });
    }
    for (const x of [-0.9, 0.9]) {
      for (const wheelZ of [-2.6, 2.6]) {
        cylinder(root, [0.42], 0.14, [x, 0.64, z + wheelZ], 0x222629, {
          segments: 12, rotation: [0, 0, Math.PI / 2], roughness: 0.75,
        });
        cylinder(root, [0.12], 0.2, [x, 0.64, z + wheelZ], 0x5b605f, {
          segments: 8, rotation: [0, 0, Math.PI / 2],
        });
      }
    }
    box(root, [2.1, 0.3, 0.12], [0, 1.6, z - 3.85], 0x1f2426);
  }
  // Locomotive nose and headlamp.
  roundedBox(root, [2.3, 2.0, 3.4], [0, 2.1, -5.2], 0x8a2d2d, { radius: 0.16, segments: 2 });
  box(root, [2.32, 0.4, 3.42], [0, 1.25, -5.2], 0x3c3a36);
  cylinder(root, [0.46], 0.55, [0, 3.15, -6.3], 0x24292b, { segments: 12 });
  sphere(root, 0.16, [0, 1.7, -6.95], 0xfff0c0, {
    emissive: 0xffd27a, emissiveIntensity: 1.1, widthSegments: 10, heightSegments: 8,
  });
  root.userData.length = length;
  return batchStaticGroup(root);
}

/** Roadside level crossing with blinking lamps and rising booms. */
export function createLevelCrossing() {
  const root = new THREE.Group();
  root.name = 'Railway level crossing';
  const booms = [];
  for (const side of [-1, 1]) {
    const post = new THREE.Group();
    post.position.set(side * 6.3, 0, 0);
    root.add(post);
    cylinder(post, [0.09], 2.4, [0, 1.2, 0], 0xd9d5c8, { segments: 8 });
    for (let band = 0; band < 4; band += 1) {
      cylinder(post, [0.095], 0.22, [0, 0.35 + band * 0.55, 0], band % 2 ? 0xc0392b : 0xf4f0e4, { segments: 8 });
    }
    roundedBox(post, [0.32, 0.5, 0.2], [0, 2.35, 0], 0x22282a, { radius: 0.04 });
    sphere(post, 0.085, [0, 2.42, -0.06], 0xd93b30, {
      emissive: 0xff3a26, emissiveIntensity: 0.9, widthSegments: 8, heightSegments: 6,
    });
    sphere(post, 0.085, [0, 2.2, -0.06], 0x3b2f2a, { widthSegments: 8, heightSegments: 6 });
    const boom = new THREE.Group();
    boom.position.set(0, 1.5, 0);
    post.add(boom);
    for (let segment = 0; segment < 5; segment += 1) {
      box(boom, [1.15, 0.09, 0.09], [segment * 1.15 - 2.3, 0, 0], segment % 2 ? 0xc0392b : 0xf4f0e4);
    }
    booms.push(boom);
  }
  box(root, [12.8, 0.05, 2.2], [0, 0.03, 0], 0x3f4648, { roughness: 0.95 });
  root.userData.updateCrossing = (time) => {
    const closed = Math.sin(time * 0.35) > 0.2;
    booms.forEach((boom, index) => {
      boom.rotation.z = closed ? Math.PI / 2 * (index ? 1 : -1) : 0;
    });
  };
  return batchStaticGroup(root, { preserve: new Set(booms) });
}
