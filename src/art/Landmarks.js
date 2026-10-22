import * as THREE from 'three';
import { box, cylinder, sphere, cone, label, material, torus } from './MeshKit.js';
import { createAdditionalDistrictLandmark } from './MoreLandmarks.js';

let sailGeometry;

function landmark(id) {
  const group = new THREE.Group();
  group.name = `${id} original Sri Lankan landmark`;
  group.userData.landmark = id;
  return group;
}

function addFlag(parent, x, z) {
  cylinder(parent, [0.045], 4.2, [x, 2.1, z], 0xd8d4bd, { segments: 7 });
  box(parent, [1.15, 0.68, 0.035], [x + 0.6, 3.72, z], 0xf0b53d);
  box(parent, [0.82, 0.54, 0.045], [x + 0.72, 3.72, z + 0.01], 0x8e3038);
  box(parent, [0.18, 0.54, 0.05], [x + 0.2, 3.72, z + 0.012], 0x2c7450);
  box(parent, [0.18, 0.54, 0.05], [x + 0.39, 3.72, z + 0.012], 0xe28b35);
}

function addWindows(parent, width, front, rows = 1) {
  for (let row = 0; row < rows; row += 1) {
    for (let x = -width / 2 + 0.8; x <= width / 2 - 0.7; x += 1.35) {
      box(parent, [0.65, 0.85, 0.07], [x, 1.15 + row * 1.25, front], 0x315f6c);
      box(parent, [0.05, 0.85, 0.04], [x, 1.15 + row * 1.25, front + 0.05], 0xe9dfc7);
    }
  }
}

function colomboLandmark() {
  const root = landmark('colombo');
  box(root, [11, 0.18, 7], [0, 0.09, 0], 0x6f9a61);
  box(root, [11, 0.12, 1.15], [0, 0.16, 2.75], 0xd0c7ae, { surface: 'paving' });
  box(root, [11, 0.06, 2.1], [0, 0.04, -4.2], 0x4c9fa9, { surface: 'water' });
  cylinder(root, [0.42, 0.82], 9.2, [-2.2, 4.75, -0.8], 0xd9d7c5, { segments: 10 });
  sphere(root, 1.45, [-2.2, 9.4, -0.8], 0x71956f, { scale: [0.9, 1.15, 0.9] });
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    const petal = cone(root, 0.48, 2.2, [-2.2 + Math.cos(angle) * 0.8, 9.5, -0.8 + Math.sin(angle) * 0.8], 0x8aa77c, { segments: 6 });
    petal.rotation.z = Math.cos(angle) * 0.28;
    petal.rotation.x = Math.sin(angle) * 0.28;
  }
  cylinder(root, [0.13], 3.1, [-2.2, 11.5, -0.8], 0xb9b9aa, { segments: 8 });
  cone(root, 0.22, 1.2, [-2.2, 13.5, -0.8], 0xd5b561, { segments: 8 });
  addFlag(root, 2.7, 0.7);
  label(root, 'GALLE FACE GREEN', [4.2, 0.62], [2, 0.75, 3.36], { background: '#176b63', foreground: '#fff4cf', fontSize: 42 });
  return root;
}

function schoolLandmark() {
  const root = landmark('school');
  box(root, [9, 3.4, 3.8], [0, 1.7, -0.6], 0xf0dba9, { surface: 'plaster' });
  const roof = cone(root, 5.8, 1.25, [0, 3.9, -0.6], 0x9e513c, { segments: 4 });
  roof.rotation.y = Math.PI / 4;
  roof.scale.z *= 0.55;
  addWindows(root, 8.5, 1.34, 2);
  box(root, [1.1, 1.9, 0.1], [0, 0.96, 1.35], 0x2e5d55);
  label(root, 'MAHARAGAMA SCHOOL', [5.3, 0.65], [0, 2.8, 1.36], { background: '#25466d', foreground: '#fff4cf', fontSize: 40 });
  for (const x of [-4.8, 4.8]) box(root, [0.5, 2.1, 0.5], [x, 1.05, 2.1], 0xe6d7b7);
  box(root, [10.1, 0.18, 0.35], [0, 0.12, 2.1], 0xc7bfa7);
  addFlag(root, 4.1, 0.8);
  return root;
}

function pettahLandmark() {
  const root = landmark('pettah');
  box(root, [10.5, 0.16, 6], [0, 0.08, 0], 0xb9ad94, { surface: 'paving' });
  box(root, [3.1, 5.8, 3.1], [-1.8, 2.9, -0.5], 0xe7d4ad, { surface: 'plaster' });
  for (let y = 0.6; y < 5.6; y += 0.85) box(root, [3.18, 0.28, 3.18], [-1.8, y, -0.5], 0xa64c43);
  box(root, [2.45, 1.65, 2.45], [-1.8, 6.45, -0.5], 0xe7d4ad);
  cylinder(root, [0.73], 0.09, [-1.8, 6.48, 0.76], 0xf4eed8, { segments: 20, rotation: [Math.PI / 2, 0, 0] });
  box(root, [0.06, 0.52, 0.05], [-1.8, 6.65, 0.83], 0x2e3538, { rotation: [0, 0, -0.35] });
  box(root, [0.43, 0.055, 0.05], [-1.61, 6.47, 0.83], 0x2e3538, { rotation: [0, 0, 0.2] });
  const dome = sphere(root, 1.4, [-1.8, 7.65, -0.5], 0xa64c43, { scale: [1, 0.75, 1] });
  dome.scale.y = 1.05;
  cone(root, 0.18, 1.25, [-1.8, 9, -0.5], 0xd6b75e, { segments: 8 });
  box(root, [4.8, 2.7, 3.5], [2.7, 1.35, -0.65], 0xd99478);
  for (const x of [0.8, 2.05, 3.3, 4.55]) {
    cylinder(root, [0.16], 2.3, [x, 1.15, 1.12], 0xf0dfbd, { segments: 8 });
    sphere(root, 0.48, [x, 3.05, -0.65], 0xe8d4ae, { scale: [1, 0.7, 1] });
  }
  box(root, [5.1, 0.38, 3.8], [2.7, 2.75, -0.65], 0xf0dfbd);
  label(root, 'PETTAH • MAIN STREET', [4.4, 0.62], [2.4, 2.15, 1.16], { background: '#7f2d43', foreground: '#fff4cf', fontSize: 39 });
  return root;
}

function parliamentLandmark() {
  const root = landmark('parliament');
  box(root, [12, 0.07, 8], [0, 0.04, 0], 0x579da3, { surface: 'water' });
  box(root, [9.8, 0.2, 6.2], [0, 0.14, -0.3], 0x738e59);
  box(root, [7.8, 2.3, 4.1], [0, 1.4, -0.6], 0xe8e3d2, { surface: 'plaster' });
  for (const x of [-3.1, -2.05, -1, 0, 1, 2.05, 3.1]) {
    cylinder(root, [0.14], 2.15, [x, 1.35, 1.55], 0xf4efdf, { segments: 8 });
  }
  box(root, [8.4, 0.24, 4.7], [0, 2.62, -0.6], 0xd4cdbb);
  const roof = cone(root, 5.6, 1.4, [0, 3.35, -0.6], 0x6d756d, { segments: 4 });
  roof.rotation.y = Math.PI / 4;
  roof.scale.z *= 0.62;
  box(root, [2.5, 0.65, 2.1], [0, 3.25, -0.6], 0xe8e3d2);
  const topRoof = cone(root, 2.1, 0.9, [0, 4.05, -0.6], 0x69736b, { segments: 4 });
  topRoof.rotation.y = Math.PI / 4;
  label(root, 'DIYAWANNA • KOTTE', [4.1, 0.58], [0, 0.7, 3.15], { background: '#176b63', foreground: '#fff4cf', fontSize: 40 });
  return root;
}

function kandyLandmark() {
  const root = landmark('kandy');
  box(root, [11.5, 0.07, 7.5], [0, 0.04, 0], 0x559aa0, { surface: 'water' });
  box(root, [9.5, 0.18, 5.8], [0, 0.13, -0.8], 0xc9c3aa);
  box(root, [6.7, 2.5, 3.8], [-0.8, 1.48, -0.9], 0xf0ead9, { surface: 'plaster' });
  addWindows(root, 6.2, 1.04, 1);
  const roof = cone(root, 4.9, 1.3, [-0.8, 3.35, -0.9], 0xc49a42, { segments: 4 });
  roof.rotation.y = Math.PI / 4;
  roof.scale.z *= 0.62;
  cylinder(root, [1.05], 3.5, [3.25, 1.9, -0.9], 0xf0ead9, { segments: 8 });
  cone(root, 1.45, 1.35, [3.25, 4.25, -0.9], 0xc49a42, { segments: 8 });
  for (let x = -5; x <= 5; x += 0.8) box(root, [0.16, 0.72, 0.18], [x, 0.48, 2.8], 0xf1ecdd);
  box(root, [10.3, 0.14, 0.18], [0, 0.85, 2.8], 0xf1ecdd);
  label(root, 'KANDY • DALADA VIDIYA', [4.6, 0.6], [-0.6, 2.25, 1.06], { background: '#7f2d43', foreground: '#fff4cf', fontSize: 38 });
  return root;
}

function railwayLandmark() {
  const root = landmark('railway');
  box(root, [10, 0.15, 6.5], [0, 0.08, 0], 0x6e7e57);
  for (const x of [-3.5, 3.6]) sphere(root, 2.5, [x, 1.25, -1.6], 0x65705b, { scale: [1.2, 1, 1] });
  box(root, [5.8, 1.6, 2.1], [0, 1.25, -0.4], 0x376d64);
  box(root, [2.1, 1.5, 2], [-1.6, 2.45, -0.4], 0x447e72);
  for (const x of [-2.1, 1.9]) {
    for (const z of [-1.25, 0.45]) cylinder(root, [0.48], 0.22, [x, 0.55, z], 0x20282c, { segments: 12, rotation: [0, 0, Math.PI / 2] });
  }
  box(root, [1.2, 0.75, 0.08], [-1.6, 2.55, 0.64], 0x9ac2c2);
  cylinder(root, [0.12], 1.2, [2.1, 2.55, -0.4], 0x333d3f, { segments: 8 });
  label(root, 'KADUGANNAWA RAIL', [4.2, 0.62], [0, 1.45, 0.69], { background: '#25466d', foreground: '#fff4cf', fontSize: 40 });
  return root;
}

function teaLandmark() {
  const root = landmark('tea');
  box(root, [11, 0.14, 7], [0, 0.07, 0], 0x6e8b50);
  box(root, [7.2, 2.9, 3.7], [0, 1.65, -1], 0xeee5cf, { surface: 'plaster' });
  const roof = cone(root, 4.8, 1.15, [0, 3.65, -1], 0x9e503e, { segments: 4 });
  roof.rotation.y = Math.PI / 4;
  roof.scale.z *= 0.58;
  addWindows(root, 6.8, 0.89, 2);
  cylinder(root, [0.3], 4.2, [2.7, 3.4, -1.6], 0x9b5945, { segments: 8 });
  label(root, 'CEYLON TEA • NUWARA ELIYA', [5.6, 0.65], [0, 2.45, 0.91], { background: '#176b63', foreground: '#fff4cf', fontSize: 36 });
  for (const x of [-4.4, 4.4]) {
    for (const z of [0.8, 2.2]) sphere(root, 0.85, [x, 0.62, z], 0x2f743d, { scale: [1.3, 0.7, 1] });
  }
  return root;
}

function nineArchesLandmark() {
  const root = landmark('nine-arches');
  const stone = 0xa68e70;
  box(root, [13, 1.4, 1.15], [0, 3.7, 0], stone);
  box(root, [13.35, 0.18, 1.35], [0, 0.09, 0], 0x927c61);
  for (let index = 0; index <= 9; index += 1) {
    const x = -6.5 + index * (13 / 9);
    box(root, [0.34, 3.05, 1.15], [x, 1.525, 0], stone);
  }
  for (let index = 0; index < 9; index += 1) {
    const x = -6.5 + (index + 0.5) * (13 / 9);
    torus(root, 0.54, 0.13, [x, 2.48, 0], stone, { arc: Math.PI });
  }
  box(root, [13.4, 0.25, 1.55], [0, 4.48, 0], 0x8c795f);
  for (const z of [-0.36, 0.36]) box(root, [13.1, 0.07, 0.065], [0, 4.66, z], 0x4c5150);
  for (let x = -6.2; x <= 6.2; x += 0.55) box(root, [0.12, 0.06, 1.05], [x, 4.61, 0], 0x654c36);
  for (const x of [-4.2, 4.2]) sphere(root, 2.4, [x, 0.8, -2.2], 0x4f774a, { scale: [1.2, 1, 1.3] });
  label(root, 'NINE ARCHES • ELLA', [4.1, 0.58], [0, 4.05, 0.62], { background: '#25466d', foreground: '#fff4cf', fontSize: 39 });
  return root;
}

function galleLandmark() {
  const root = landmark('galle');
  box(root, [11.5, 0.06, 7.5], [0, 0.03, -0.2], 0x4e9eaa, { surface: 'water' });
  box(root, [8.7, 1.25, 4.4], [-1.2, 0.65, -0.6], 0xa99b7f, { surface: 'plaster' });
  for (let x = -5; x <= 2.8; x += 1.1) box(root, [0.7, 0.42, 0.8], [x, 1.48, 1.2], 0xb7a98a);
  cylinder(root, [0.72, 1.05], 6.2, [3.25, 3.25, -0.8], 0xf0eee0, { segments: 14 });
  cylinder(root, [1.02], 0.18, [3.25, 6.25, -0.8], 0xd8d7c9, { segments: 14 });
  cylinder(root, [0.68], 1.05, [3.25, 6.85, -0.8], 0x8fb6b7, { segments: 12, roughness: 0.25 });
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    cylinder(root, [0.045], 1.05, [3.25 + Math.cos(angle) * 0.66, 6.85, -0.8 + Math.sin(angle) * 0.66], 0xe6e2d3, { segments: 6 });
  }
  cone(root, 0.92, 0.75, [3.25, 7.75, -0.8], 0x515d5b, { segments: 12 });
  label(root, 'GALLE FORT • LIGHTHOUSE', [4.6, 0.6], [-1.25, 0.75, 1.64], { background: '#25466d', foreground: '#fff4cf', fontSize: 38 });
  return root;
}

function getSailGeometry() {
  if (sailGeometry) return sailGeometry;
  sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 2.8, 0, 2.1, 0.35, 0], 3));
  sailGeometry.setIndex([0, 1, 2]);
  sailGeometry.computeVertexNormals();
  return sailGeometry;
}

function negomboLandmark() {
  const root = landmark('negombo');
  box(root, [11.5, 0.07, 7.5], [0, 0.04, 0], 0x4e9da5, { surface: 'water' });
  sphere(root, 1, [-0.7, 0.35, 0], 0x31778a, { scale: [2.8, 0.48, 0.82] });
  box(root, [3.8, 0.16, 0.8], [-0.7, 0.58, 0], 0x6e472e);
  cylinder(root, [0.055], 3.5, [-0.8, 2.1, 0], 0x6b4c31, { segments: 7 });
  const sail = new THREE.Mesh(getSailGeometry(), material(0xf0dfb5, { side: THREE.DoubleSide }));
  sail.position.set(-0.74, 0.75, 0.03);
  root.add(sail);
  for (const x of [-1.9, 0.7]) cylinder(root, [0.04], 2.1, [x, 0.36, 0.85], 0x6b4c31, { segments: 6, rotation: [Math.PI / 2, 0, 0] });
  cylinder(root, [0.12], 4.2, [-0.65, 0.24, 1.75], 0x785235, { segments: 7, rotation: [0, 0, Math.PI / 2] });
  for (const x of [2.8, 3.8]) {
    box(root, [0.8, 0.45, 0.75], [x, 0.28, 1.7], 0xa87947);
    for (let i = 0; i < 3; i += 1) sphere(root, 0.12, [x - 0.22 + i * 0.22, 0.57, 1.7], 0x9fb8b4, { scale: [1.4, 0.55, 0.6] });
  }
  label(root, 'NEGOMBO • LAGOON', [3.9, 0.6], [3.1, 1.25, 2.13], { background: '#176b63', foreground: '#fff4cf', fontSize: 40 });
  return root;
}

export function createDistrictLandmark(id) {
  switch (id) {
    case 'colombo': return colomboLandmark();
    case 'school': return schoolLandmark();
    case 'pettah': return pettahLandmark();
    case 'parliament': return parliamentLandmark();
    case 'kandy': return kandyLandmark();
    case 'railway': return railwayLandmark();
    case 'tea': return teaLandmark();
    case 'nine-arches': return nineArchesLandmark();
    case 'galle': return galleLandmark();
    case 'negombo': return negomboLandmark();
    default: return createAdditionalDistrictLandmark(id) || landmark(id || 'island');
  }
}

/** One side of a district-specific landscape, aligned along the road Z axis. */
export function createLandscapeStrip(layout, length = 30) {
  const root = new THREE.Group();
  root.name = `${layout} roadside landscape`;
  if (layout === 'tea') {
    box(root, [4.2, 0.13, length], [0, 0.065, 0], 0x735f3f);
    for (const x of [-1.05, 1.05]) {
      for (let z = -length / 2 + 2; z < length / 2; z += 4) {
        sphere(root, 1, [x, 0.6, z], (Math.round(z) + (x > 0 ? 1 : 0)) % 2 ? 0x347b40 : 0x3e8747, { scale: [1.15, 0.62, 2.15] });
      }
    }
  } else if (layout === 'rail') {
    box(root, [2.5, 0.12, length], [0, 0.06, 0], 0x817863);
    for (const x of [-0.72, 0.72]) box(root, [0.075, 0.09, length], [x, 0.18, 0], 0x555c5c, { metalness: 0.4 });
    for (let z = -length / 2 + 0.5; z < length / 2; z += 1.5) box(root, [2.05, 0.09, 0.18], [0, 0.12, z], 0x684b34);
  } else if (layout === 'coast') {
    box(root, [4.4, 0.07, length], [0, 0.04, 0], 0x4d9da2, { surface: 'water' });
    for (const x of [-2.3, 2.3]) box(root, [0.35, 0.4, length], [x, 0.2, 0], 0xa99c7d);
    for (let z = -12; z <= 12; z += 6) cylinder(root, [0.06], 1.4, [1.7, 0.7, z], 0x6e5137, { segments: 6 });
  } else if (layout === 'fort') {
    box(root, [1.1, 1.35, length], [0, 0.68, 0], 0xaa9c80, { surface: 'plaster' });
    for (let z = -length / 2 + 1; z < length / 2; z += 2.2) box(root, [1.2, 0.4, 1.1], [0, 1.53, z], 0xb5a789);
  } else if (layout === 'ancient') {
    box(root, [3.8, 0.13, length], [0, 0.065, 0], 0xb6a789, { surface: 'paving' });
    for (let z = -length / 2 + 2; z < length / 2; z += 5) {
      cylinder(root, [0.13], 1.8, [-1.25, 0.9, z], 0xb9ab90, { segments: 8 });
      box(root, [0.4, 0.14, 0.4], [-1.25, 1.84, z], 0xd0c2a5);
      sphere(root, 0.65, [1.1, 0.42, z + 1.5], 0x6f824c, { scale: [1.25, 0.65, 1.1] });
    }
  } else if (layout === 'palmyrah') {
    box(root, [4.1, 0.11, length], [0, 0.055, 0], 0x9a8a5d);
    for (let z = -length / 2 + 2; z < length / 2; z += 4.5) {
      sphere(root, 0.55, [0.7, 0.34, z], 0x7c8148, { scale: [1.4, 0.62, 1.1] });
      cylinder(root, [0.08], 1.15, [-1.3, 0.575, z], 0x746143, { segments: 7 });
    }
  } else if (layout === 'hill') {
    box(root, [1.3, 1.1, length], [0, 0.55, 0], 0x8d8874, { surface: 'plaster' });
    for (let z = -length / 2 + 2; z < length / 2; z += 4) sphere(root, 1.3, [0.6, 0.6, z], 0x68715b, { scale: [1.3, 0.8, 1.4] });
  }
  return root;
}

/** Enclosed 30 m tunnel. The high roof keeps the chase camera inside it. */
export function createTunnelSection(length = 30, { portalStart = false, portalEnd = false } = {}) {
  const root = new THREE.Group();
  root.name = 'Enclosed hill country road tunnel';
  root.userData.tunnel = true;
  for (const side of [-1, 1]) {
    box(root, [1.05, 8.2, length], [side * 7.15, 4.1, 0], 0x555a54, { surface: 'plaster' });
    box(root, [0.18, 1.1, length], [side * 6.58, 0.55, 0], 0x9a927c);
    for (const z of [-10, 0, 10]) {
      box(root, [0.16, 0.32, 1.1], [side * 6.55, 4.5, z], 0xffd58a, { emissive: 0xffb33f, emissiveIntensity: 0.8, castShadow: false });
    }
  }
  box(root, [15.35, 1.0, length], [0, 8.25, 0], 0x50564f, { surface: 'plaster' });
  for (const z of [-10, 0, 10]) box(root, [1.4, 0.09, 0.5], [0, 7.72, z], 0xffe1a0, { emissive: 0xffc45c, emissiveIntensity: 0.75, castShadow: false });
  const addPortal = (z, withSign) => {
    for (const side of [-1, 1]) box(root, [1.3, 8.1, 1.1], [side * 6.65, 4.05, z], 0x9a8d72, { surface: 'plaster' });
    box(root, [14.5, 1.25, 1.1], [0, 7.55, z], 0x9a8d72, { surface: 'plaster' });
    box(root, [12.2, 0.18, 1.2], [0, 6.85, z], 0xe1c890);
    if (withSign) label(root, 'HILL COUNTRY TUNNEL', [4.5, 0.66], [0, 7.55, z + 0.57], { background: '#25466d', foreground: '#fff4cf', fontSize: 41 });
  };
  if (portalStart) addPortal(length / 2, true);
  if (portalEnd) addPortal(-length / 2, false);
  return root;
}
