import * as THREE from 'three';
import { box, capsule, cone, cylinder, label, sphere, torus } from './MeshKit.js';

function landmark(id) {
  const root = new THREE.Group();
  root.name = `${id} detailed Sri Lankan place`;
  root.userData.landmark = id;
  return root;
}

function placeLabel(root, text, position, width = 4.8) {
  return label(root, text, [width, 0.62], position, {
    background: '#174f49', foreground: '#fff5d8', border: '#d9b64c', fontSize: 37,
  });
}

function arches(parent, xs, y, z, color = 0xeee6d2) {
  for (const x of xs) {
    cylinder(parent, [0.12], 1.65, [x - 0.42, y, z], color, { segments: 8 });
    cylinder(parent, [0.12], 1.65, [x + 0.42, y, z], color, { segments: 8 });
    torus(parent, 0.42, 0.11, [x, y + 0.82, z], color, { arc: Math.PI });
    box(parent, [0.62, 1.25, 0.06], [x, y - 0.08, z - 0.04], 0x315f68);
  }
}

function colomboFort() {
  const root = landmark('colombo-fort');
  box(root, [12.5, 0.16, 7.4], [0, 0.08, 0], 0xc6bda7, { surface: 'paving' });
  box(root, [6.6, 3.1, 3.1], [-1.4, 1.7, -0.8], 0xe8dfc8, { surface: 'plaster' });
  const roof = cone(root, 4.6, 1.2, [-1.4, 3.85, -0.8], 0x9c523f, { segments: 4, surface: 'roof' });
  roof.rotation.y = Math.PI / 4;
  roof.scale.z *= 0.58;
  arches(root, [-3.6, -2.15, -0.7, 0.75], 1.25, 0.79);
  box(root, [1.9, 5.8, 1.9], [3.35, 3, -0.75], 0xe9e2cf, { surface: 'plaster' });
  for (const y of [0.6, 2.4, 4.5, 5.75]) box(root, [2.08, 0.18, 2.08], [3.35, y, -0.75], 0xc9bfa8);
  cylinder(root, [0.65], 0.08, [3.35, 4.95, 0.23], 0xf6f0dc, { segments: 20, rotation: [Math.PI / 2, 0, 0] });
  box(root, [0.055, 0.45, 0.04], [3.35, 5.05, 0.29], 0x30393a, { rotation: [0, 0, -0.3] });
  box(root, [0.34, 0.05, 0.04], [3.49, 4.94, 0.29], 0x30393a, { rotation: [0, 0, 0.15] });
  sphere(root, 1.05, [3.35, 6.2, -0.75], 0x6f8579, { scale: [1, 0.65, 1] });
  cone(root, 0.16, 1.05, [3.35, 7.05, -0.75], 0xc7a24d, { segments: 8 });
  // Colombo port crane silhouette gives the Fort approach a distinct skyline.
  box(root, [0.25, 5.3, 0.25], [-5.1, 2.65, -2.25], 0x607476);
  box(root, [3.8, 0.22, 0.22], [-3.35, 5.1, -2.25], 0x607476, { rotation: [0, 0, -0.16] });
  box(root, [0.08, 2.1, 0.08], [-1.55, 3.95, -2.25], 0x607476);
  placeLabel(root, 'COLOMBO FORT • RAIL & CLOCK TOWER', [-0.4, 0.65, 3.73], 6.2);
  return root;
}

function redMosque() {
  const root = landmark('red-mosque');
  box(root, [10.5, 0.15, 6.5], [0, 0.075, 0], 0xbeb49e, { surface: 'paving' });
  box(root, [6.3, 3.6, 3.5], [0, 1.9, -0.55], 0xf0e2ca);
  for (let y = 0.45; y < 3.7; y += 0.55) {
    box(root, [6.36, 0.22, 3.56], [0, y, -0.55], 0xa64840);
  }
  for (const x of [-2.5, -1.25, 0, 1.25, 2.5]) {
    arches(root, [x], 1.25, 1.24, yColor(x));
  }
  function yColor(x) { return Math.round(x * 2) % 2 ? 0xf1e4cc : 0xa64840; }
  for (const x of [-3.65, 3.65]) {
    cylinder(root, [0.45, 0.58], 5.3, [x, 2.65, -0.6], 0xf0e2ca, { segments: 12 });
    for (let y = 0.5; y < 5.1; y += 0.62) cylinder(root, [0.59], 0.18, [x, y, -0.6], 0xa64840, { segments: 12 });
    sphere(root, 0.58, [x, 5.45, -0.6], 0xa64840, { scale: [1, 0.8, 1] });
    cone(root, 0.12, 0.8, [x, 6.15, -0.6], 0xd2ad4f, { segments: 8 });
  }
  for (const x of [-1.8, 0, 1.8]) {
    sphere(root, 0.9, [x, 4.05, -0.55], 0xa64840, { scale: [1, 0.78, 1] });
    cone(root, 0.1, 0.65, [x, 4.85, -0.55], 0xd2ad4f, { segments: 8 });
  }
  placeLabel(root, 'PETTAH • RED MOSQUE', [0, 0.65, 3.28], 4.4);
  return root;
}

function anuradhapura() {
  const root = landmark('anuradhapura');
  box(root, [13, 0.16, 8], [0, 0.08, 0], 0xd7ceb7, { surface: 'paving' });
  for (const [radius, y, height] of [[4.2, 0.2, 0.25], [3.85, 0.43, 0.22], [3.55, 0.64, 0.2]]) {
    cylinder(root, [radius], height, [-0.8, y, -0.6], 0xf1eddf, { segments: 24 });
  }
  sphere(root, 1, [-0.8, 2.45, -0.6], 0xf4f0e4, {
    scale: [3.35, 1.85, 3.35], widthSegments: 24, heightSegments: 14,
  });
  cylinder(root, [0.82, 1.15], 0.6, [-0.8, 4.45, -0.6], 0xe9e3d4, { segments: 16 });
  for (let index = 0; index < 5; index += 1) {
    cylinder(root, [0.65 - index * 0.09], 0.18, [-0.8, 4.85 + index * 0.18, -0.6], 0xd7c69a, { segments: 14 });
  }
  cone(root, 0.25, 1.75, [-0.8, 6.25, -0.6], 0xd2a83f, { segments: 12 });
  for (const x of [-5.3, 4.8]) {
    for (const z of [-2.6, 0, 2.4]) {
      cylinder(root, [0.14], 2.25, [x, 1.125, z], 0xd8cbae, { segments: 8 });
      box(root, [0.42, 0.16, 0.42], [x, 2.28, z], 0xeee4ce);
    }
  }
  placeLabel(root, 'ANURADHAPURA • RUWANWELISEYA', [1.7, 0.7, 4.03], 5.7);
  return root;
}

function polonnaruwa() {
  const root = landmark('polonnaruwa');
  box(root, [12, 0.15, 7.5], [0, 0.075, 0], 0xb9a88a, { surface: 'paving' });
  cylinder(root, [2.45], 0.35, [-2.2, 0.3, -0.7], 0x9f6649, { segments: 20 });
  sphere(root, 1, [-2.2, 1.75, -0.7], 0xa96c4d, {
    scale: [2.25, 1.55, 2.25], widthSegments: 20, heightSegments: 12,
  });
  cylinder(root, [0.42, 0.72], 0.5, [-2.2, 3.35, -0.7], 0x8e5b44, { segments: 12 });
  cone(root, 0.16, 1.15, [-2.2, 4.15, -0.7], 0x806040, { segments: 9 });
  for (const x of [1.2, 2.4, 3.6, 4.8]) {
    for (const z of [-2, 1.2]) {
      const height = 1.7 + ((Math.round(x * 10) + Math.round(z * 10)) % 3) * 0.38;
      cylinder(root, [0.16], height, [x, height / 2, z], 0xa79a82, { segments: 8 });
      box(root, [0.46, 0.16, 0.46], [x, height + 0.04, z], 0xc2b49a);
    }
  }
  box(root, [4.8, 0.55, 0.45], [3, 0.28, 2.2], 0x9e9079);
  torus(root, 0.75, 0.12, [2.8, 0.19, 2.8], 0xb9ab90, { rotation: [Math.PI / 2, 0, 0] });
  placeLabel(root, 'POLONNARUWA • ANCIENT CITY', [0.8, 0.72, 3.78], 5.2);
  return root;
}

function jaffna() {
  const root = landmark('jaffna');
  box(root, [12, 0.15, 7.4], [0, 0.075, 0], 0xc1b28f, { surface: 'paving' });
  box(root, [5.2, 1.8, 3.6], [-3.1, 0.95, -0.7], 0x9b8b6e, { surface: 'plaster' });
  for (const x of [-5.5, -0.7]) cylinder(root, [0.85], 2.25, [x, 1.125, -0.7], 0x918169, { segments: 12 });
  for (let x = -5.3; x <= -0.9; x += 0.75) box(root, [0.42, 0.4, 0.65], [x, 2, 1.1], 0xa59679);
  box(root, [5.2, 3.2, 3.2], [3, 1.7, -0.75], 0xeee8d9, { surface: 'plaster' });
  arches(root, [1.3, 2.55, 3.8, 5.05], 1.3, 0.89, 0xe4dbc6);
  box(root, [5.5, 0.25, 3.5], [3, 3.38, -0.75], 0xd6cbb5);
  cylinder(root, [0.85], 0.65, [3, 3.8, -0.75], 0xeee8d9, { segments: 12 });
  sphere(root, 0.92, [3, 4.25, -0.75], 0xd8cdb8, { scale: [1, 0.65, 1] });
  cone(root, 0.12, 0.8, [3, 5.05, -0.75], 0xb79544, { segments: 8 });
  placeLabel(root, 'JAFFNA • FORT & LIBRARY', [0.2, 0.68, 3.73], 5.1);
  return root;
}

function trincomalee() {
  const root = landmark('trincomalee');
  box(root, [12.5, 0.08, 8], [0, 0.04, 0], 0x4599a8, { surface: 'water' });
  sphere(root, 1, [2.2, 1.0, -0.8], 0x6e7658, {
    scale: [3.2, 1.15, 2.3], widthSegments: 12, heightSegments: 8,
  });
  box(root, [3.2, 1.65, 2.3], [2.2, 2.25, -0.8], 0xe2b26d);
  for (let tier = 0; tier < 4; tier += 1) {
    const width = 2.7 - tier * 0.48;
    box(root, [width, 0.55, 1.8 - tier * 0.25], [2.2, 3.25 + tier * 0.52, -0.8],
      [0xd57454, 0xe1b55e, 0x5c9a87, 0xd98b5c][tier]);
    for (const side of [-1, 1]) {
      sphere(root, 0.17, [2.2 + side * width * 0.32, 3.57 + tier * 0.52, -0.05 - tier * 0.12],
        tier % 2 ? 0xf0d073 : 0x764f81, { scale: [1, 1.25, 0.8] });
    }
  }
  cone(root, 0.22, 0.9, [2.2, 5.55, -0.8], 0xd4aa42, { segments: 9 });
  sphere(root, 1, [-3.4, 0.32, 1], 0x347a8b, { scale: [1.85, 0.36, 0.72] });
  box(root, [2.7, 0.14, 0.65], [-3.4, 0.54, 1], 0x774d32);
  cylinder(root, [0.045], 2.5, [-3.4, 1.65, 1], 0x65472f, { segments: 7 });
  capsule(root, 0.055, 2.3, [-3.4, 0.3, 2], 0x6b4b31, { rotation: [0, 0, Math.PI / 2], radialSegments: 7 });
  placeLabel(root, 'TRINCOMALEE • HARBOUR & KONESWARAM', [0, 0.72, 4.03], 6.1);
  return root;
}

function colomboLotus() {
  const root = landmark('colombo-lotus');
  box(root, [7.2, 0.28, 7.2], [0, 0.14, 0], 0xd9d4c6, { surface: 'paving' });
  cylinder(root, [2.5, 2.9], 0.7, [0, 0.55, 0], 0xe8e2d4, { segments: 32 });
  cylinder(root, [0.68, 1.15], 11.8, [0, 6.65, 0], 0xd9d7d2, { segments: 28, roughness: 0.48 });
  for (const y of [3.2, 6.2, 9.2]) {
    cylinder(root, [1.65, 1.85], 0.32, [0, y, 0], 0x72567f, { segments: 28, roughness: 0.42 });
    torus(root, 1.78, 0.09, [0, y + 0.2, 0], 0xe0b95e, { arc: Math.PI * 2, rotation: [Math.PI / 2, 0, 0] });
  }
  for (let ring = 0; ring < 2; ring += 1) {
    const count = ring === 0 ? 12 : 8;
    const radius = ring === 0 ? 1.75 : 1.15;
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2 + ring * 0.24;
      const petal = sphere(root, 1, [Math.cos(angle) * radius, 12.1 + ring * 1.2, Math.sin(angle) * radius],
        ring === 0 ? 0xb85c94 : 0xd284ae, {
          scale: [0.62, 1.75 - ring * 0.2, 0.36], widthSegments: 22, heightSegments: 14, roughness: 0.42,
        });
      petal.rotation.y = -angle;
      petal.rotation.z = Math.cos(angle) * 0.48;
      petal.rotation.x = Math.sin(angle) * 0.48;
    }
  }
  sphere(root, 1, [0, 14.1, 0], 0x8d427b, { scale: [1.05, 1.45, 1.05], widthSegments: 28, heightSegments: 18, roughness: 0.4 });
  cylinder(root, [0.15, 0.28], 3.4, [0, 16.1, 0], 0xd7c36b, { segments: 18, metalness: 0.25, roughness: 0.38 });
  sphere(root, 0.24, [0, 17.85, 0], 0xf0d579, { widthSegments: 18, heightSegments: 12, emissive: 0x8a6420, emissiveIntensity: 0.2 });
  for (const side of [-1, 1]) box(root, [1.15, 1.8, 0.12], [side * 2.15, 1.15, 3.48], 0x396c78, { roughness: 0.2, metalness: 0.1 });
  placeLabel(root, 'COLOMBO • LOTUS TOWER', [0, 0.8, 3.66], 5.4);
  return root;
}

export function createAdditionalDistrictLandmark(id) {
  switch (id) {
    case 'colombo-lotus': return colomboLotus();
    case 'colombo-fort': return colomboFort();
    case 'red-mosque': return redMosque();
    case 'anuradhapura': return anuradhapura();
    case 'polonnaruwa': return polonnaruwa();
    case 'jaffna': return jaffna();
    case 'trincomalee': return trincomalee();
    default: return null;
  }
}
