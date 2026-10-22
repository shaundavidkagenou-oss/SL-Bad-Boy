import * as THREE from 'three';
import { capsule, cone, cylinder, material, sphere } from './MeshKit.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const canopyGeometries = [];
const leafGeometries = new Map();

function branch(parent, start, end, radiusStart, radiusEnd, color, segments = 8) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const length = direction.length();
  const midpoint = from.clone().add(to).multiplyScalar(0.5);
  const mesh = cylinder(parent, [radiusEnd, radiusStart], length, midpoint.toArray(), color, {
    segments, roughness: 0.94, surface: 'bark',
  });
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  return mesh;
}

function leafGeometry(kind) {
  if (leafGeometries.has(kind)) return leafGeometries.get(kind);
  const banana = kind === 'banana';
  const length = banana ? 2.45 : 3.35;
  const width = banana ? 0.68 : 0.39;
  const droop = banana ? 0.48 : 0.78;
  const segments = banana ? 7 : 9;
  const positions = [];
  const indices = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const z = t * length;
    const y = Math.sin(t * Math.PI) * 0.2 - t * t * droop;
    const taper = Math.sin(Math.PI * Math.pow(t, 0.78));
    const serration = index % 2 ? (banana ? 0.82 : 0.64) : 1;
    const halfWidth = Math.max(0.012, width * taper * serration * (1 - t * 0.18));
    positions.push(-halfWidth, y - (banana ? 0.025 : 0), z);
    positions.push(0, y + (banana ? 0.065 : 0.045), z);
    positions.push(halfWidth, y - (banana ? 0.025 : 0), z);
    if (index < segments) {
      const a = index * 3;
      const b = a + 3;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
      // Occasional edge splits make banana leaves look grown rather than cut from paper.
      if (!banana || index % 3 !== 1) indices.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  leafGeometries.set(kind, geometry);
  return geometry;
}

function canopyGeometry(variant) {
  const slot = Math.abs(variant) % 4;
  if (canopyGeometries[slot]) return canopyGeometries[slot];
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const variation = 1 + Math.sin(x * 5.3 + slot) * 0.055
      + Math.cos(y * 6.1 + z * 3.7 + slot * 0.8) * 0.065;
    positions.setXYZ(index, x * variation, y * variation, z * variation);
  }
  geometry.computeVertexNormals();
  canopyGeometries[slot] = geometry;
  return geometry;
}

function addLeaf(parent, kind, angle, tilt, scale, color) {
  const leaf = new THREE.Mesh(leafGeometry(kind), material(color, {
    side: THREE.DoubleSide, roughness: 0.79,
  }));
  leaf.rotation.set(tilt, angle, 0);
  leaf.scale.set(...scale);
  parent.add(leaf);
  return leaf;
}

function buildPalm(height, lean, palmyrah = false) {
  const palm = new THREE.Group();
  palm.name = palmyrah ? 'Branching Jaffna palmyrah palm' : 'Curved coconut palm with layered fronds';
  palm.userData.vegetation = palmyrah ? 'palmyrah' : 'coconut-palm';
  const bark = palmyrah ? 0x6d5a43 : 0x8a6847;
  const points = [];
  const segments = 4;
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    points.push([lean * t * t, height * t, Math.sin(t * Math.PI) * lean * 0.12]);
  }
  for (let index = 0; index < segments; index += 1) {
    const t = index / segments;
    branch(palm, points[index], points[index + 1], 0.22 - t * 0.07, 0.2 - t * 0.065,
      index % 2 ? bark : palmyrah ? 0x79664d : 0x9a7650, 9);
  }
  const crown = new THREE.Group();
  crown.position.set(...points[points.length - 1]);
  palm.add(crown);
  const colors = palmyrah ? [0x376e3d, 0x4b7f42, 0x2f6338] : [0x247843, 0x3b914e, 0x55a457];
  const fronds = palmyrah ? 9 : 8;
  for (let index = 0; index < fronds; index += 1) {
    const angle = index * Math.PI * 2 / fronds;
    const leaf = addLeaf(crown, 'palm', angle, palmyrah ? -0.42 + (index % 3) * 0.16 : (index % 2 ? 0.1 : -0.08),
      palmyrah ? [1.65, 1, 0.72] : [1, 1, index % 2 ? 0.92 : 1.05], colors[index % colors.length]);
    leaf.rotation.z = palmyrah ? (index % 2 ? 0.08 : -0.08) : 0;
  }
  if (!palmyrah) {
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI * 0.5;
      sphere(crown, 0.17, [Math.cos(angle) * 0.24, -0.2, Math.sin(angle) * 0.24], 0x73813b, {
        scale: [0.9, 1.15, 0.9], widthSegments: 8, heightSegments: 6,
      });
    }
  }
  return palm;
}

export function createPalm(height = 6.5, lean = 0.5) {
  return buildPalm(height, lean, false);
}

export function createPalmyrah(height = 5.8, lean = 0.2) {
  return buildPalm(height, lean, true);
}

export function createBananaPlant(scale = 1, variant = 0) {
  const plant = new THREE.Group();
  plant.name = 'Broad-leaf tropical banana plant';
  plant.userData.vegetation = 'banana';
  cylinder(plant, [0.11, 0.18], 1.6, [0, 0.8, 0], 0x849a4d, { segments: 9 });
  for (let ring = 0; ring < 3; ring += 1) {
    cylinder(plant, [0.145 - ring * 0.01], 0.1, [0, 0.38 + ring * 0.4, 0], 0xa4aa61, { segments: 9 });
  }
  const crown = new THREE.Group();
  crown.position.y = 1.52;
  plant.add(crown);
  for (let index = 0; index < 7; index += 1) {
    addLeaf(crown, 'banana', index * Math.PI * 2 / 7 + variant * 0.13,
      index % 2 ? 0.15 : -0.11, [0.9, 1, index % 2 ? 0.85 : 1],
      [0x3c8b45, 0x5a9f4b, 0x347b3e][index % 3]);
  }
  const blossom = cone(crown, 0.13, 0.34, [0.17, -0.32, 0.08], 0x7e3547, { segments: 8 });
  blossom.rotation.z = Math.PI;
  for (let index = 0; index < 5; index += 1) {
    capsule(crown, 0.045, 0.13, [-0.08 + index * 0.055, -0.12 - (index % 2) * 0.07, 0.1],
      0x82a64b, { rotation: [0.35, 0, index * 0.15], radialSegments: 6, capSegments: 2 });
  }
  plant.scale.setScalar(scale);
  return plant;
}

export function createTree(scale = 1, variant = 0) {
  const tree = new THREE.Group();
  tree.name = 'Layered tropical tree with textured bark and leaf clusters';
  tree.userData.vegetation = 'branched-canopy';
  const bark = variant % 2 ? 0x69503a : 0x76573c;
  branch(tree, [0, 0, 0], [0.08, 1.45, 0.03], 0.32, 0.22, bark, 12);
  branch(tree, [0.08, 1.4, 0.03], [-0.08, 2.65, 0.08], 0.22, 0.13, bark, 12);
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI * 2 / 4 + variant;
    branch(tree, [0, 0.16, 0], [Math.cos(angle) * 0.68, 0.02, Math.sin(angle) * 0.68], 0.13, 0.04, bark, 9);
  }
  const crowns = [
    [-1.15, 2.8, 0.15, 0.9], [1.0, 3.0, -0.4, 1.0],
    [-0.45, 3.45, -0.95, 1.02], [0.35, 3.75, 0.3, 1.08],
    [1.1, 3.45, 0.8, 0.84], [-1.05, 3.4, 0.95, 0.88],
    [0.05, 4.3, -0.05, 0.88], [-0.5, 4.05, 0.85, 0.72],
    [0.75, 4.0, -0.75, 0.74], [-1.35, 3.35, -0.55, 0.68],
    [1.35, 3.25, 0.2, 0.7], [0.1, 3.25, 1.25, 0.74],
  ];
  const greens = [0x2c7041, 0x3b8748, 0x26643a, 0x4a8b45];
  crowns.forEach(([x, y, z, radius], index) => {
    branch(tree, [-0.05, 2.1 + (index % 3) * 0.18, 0.04], [x * 0.84, y - 0.24, z * 0.84],
      0.105, 0.026, bark, 9);
    const canopy = new THREE.Mesh(canopyGeometry(variant + index), material(greens[Math.abs(variant + index) % greens.length], {
      roughness: 0.9, flatShading: false, surface: 'foliage',
    }));
    canopy.position.set(x, y, z);
    canopy.scale.set(radius * 1.15, radius * (0.8 + (index % 3) * 0.07), radius);
    canopy.rotation.set(index * 0.31, variant * 0.47 + index, index * 0.12);
    tree.add(canopy);
  });
  if (variant % 5 === 4) {
    for (const [x, y, z] of [[-0.7, 3.8, 0.8], [0.45, 4.25, 0.55], [1.0, 3.35, 0.35], [-1.1, 3.2, -0.4]]) {
      sphere(tree, 0.13, [x, y, z], 0xe69aaf, { widthSegments: 10, heightSegments: 7 });
    }
  }
  tree.scale.setScalar(scale);
  return tree;
}
