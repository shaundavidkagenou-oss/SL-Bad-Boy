import * as THREE from 'three';
import { material, sphere } from './MeshKit.js';
import { createBuilding } from './Environment.js';
import { createPalmyrah, createPalm, createTree } from './Vegetation.js';

const HILLS = new Set(['kandy', 'kadugannawa', 'nuwara-eliya', 'ella']);
const FORESTS = new Set(['anuradhapura', 'polonnaruwa']);
const URBAN = new Set(['colombo', 'suburb', 'market', 'kotte', 'galle']);

function terrainHeight(themeId, offset, z, variant) {
  const hill = HILLS.has(themeId);
  const forest = FORESTS.has(themeId);
  const coast = themeId === 'negombo' || themeId === 'trincomalee';
  const maximum = hill ? 10 : forest ? 1.15 : coast ? 1.8 : 0.42;
  const rise = Math.max(0, (offset - 1.5) / 18.5);
  const rolling = 0.72 + Math.sin(z * 0.15 + variant * 1.9) * 0.17 + Math.cos(offset * 0.3 + variant) * 0.11;
  return maximum * rise * rise * rolling;
}

function createTerrain(themeId, side, variant) {
  const xSegments = 9;
  const zSegments = 12;
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let iz = 0; iz <= zSegments; iz += 1) {
    const z = -15 + iz / zSegments * 30;
    for (let ix = 0; ix <= xSegments; ix += 1) {
      const offset = ix / xSegments * 20;
      positions.push(side * (10.8 + offset), terrainHeight(themeId, offset, z, variant) - 0.05, z);
      uvs.push(ix / xSegments * 5, iz / zSegments * 5);
      if (ix < xSegments && iz < zSegments) {
        const a = iz * (xSegments + 1) + ix;
        const b = a + xSegments + 1;
        if (side > 0) indices.push(a, b, a + 1, b, b + 1, a + 1);
        else indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const color = HILLS.has(themeId) ? 0x426b3f : FORESTS.has(themeId) ? 0x6f713d : 0x66834e;
  const terrain = new THREE.Mesh(geometry, material(color, { roughness: 0.98, surface: 'grass', side: THREE.DoubleSide }));
  terrain.userData.sideTerrain = true;
  terrain.userData.batchOwnedGeometry = true;
  return terrain;
}

export function createDistrictSideFill(themeId, side, variant = 0) {
  const group = new THREE.Group();
  group.userData.districtSideFill = true;
  group.add(createTerrain(themeId, side, variant));
  const forest = FORESTS.has(themeId);
  const hill = HILLS.has(themeId);
  const coast = themeId === 'negombo' || themeId === 'trincomalee';
  const palmyrah = themeId === 'jaffna';
  const positions = forest || hill
    ? [[14, -11], [18, -4], [23, 4], [15, 11]]
    : [[13.5, -10], [16, 10]];

  positions.forEach(([x, z], index) => {
    const scale = forest ? 1.15 + (index % 2) * 0.22 : 0.82 + (index % 3) * 0.12;
    const tree = palmyrah ? createPalmyrah(5.8 + index * 0.25, 0.2) : coast ? createPalm(6.2 + index * 0.3, 0.45) : createTree(scale, variant * 3 + index);
    tree.scale.setScalar(scale);
    tree.position.set(side * x, terrainHeight(themeId, x - 10.8, z, variant), z + ((variant % 3) - 1) * 1.2);
    tree.rotation.y = variant * 0.7 + index;
    group.add(tree);
  });

  if (URBAN.has(themeId)) {
    const rear = createBuilding(variant + (side > 0 ? 2 : 5), themeId);
    const x = 18.5 + (variant % 2) * 2;
    const z = variant % 2 ? -4 : 4;
    rear.position.set(side * x, 0, z);
    rear.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    rear.scale.setScalar(0.9 + (variant % 3) * 0.08);
    group.add(rear);
    if (variant % 3 === 0) {
      const farther = createBuilding(variant + 9, themeId);
      farther.position.set(side * 24, 0, -10);
      farther.rotation.y = rear.rotation.y;
      farther.scale.setScalar(0.82);
      group.add(farther);
    }
  }

  // Flowering verges break up flat edges without entering a traffic lane.
  for (const z of [-8, 8]) {
    sphere(group, 0.55, [side * 8.35, 0.32, z + (variant % 2)], 0x426f3e, { scale: [1.25, 0.72, 1], widthSegments: 14, heightSegments: 9 });
    sphere(group, 0.12, [side * 8.25, 0.7, z + (variant % 2)], variant % 2 ? 0xf2c94c : 0xe895ad, { widthSegments: 10, heightSegments: 7 });
  }
  return group;
}
