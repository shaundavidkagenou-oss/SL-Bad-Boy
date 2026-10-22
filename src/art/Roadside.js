import * as THREE from 'three';
import { box, capsule, cone, cylinder, label, sphere, torus } from './MeshKit.js';
import { hasLocalSignFonts, LOCAL_SIGN_FONT } from '../ui/SignFonts.js';

function localLabel(parent, sinhala, english, size, position, colors = ['#176b63', '#fff4cf']) {
  const local = hasLocalSignFonts();
  return label(parent, local ? `${sinhala}\n${english}` : english, size, position, {
    background: colors[0], foreground: colors[1], border: '#f4b942',
    fontSize: local ? 39 : 43, fontFamily: local ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
  });
}

function coconutCart(variant) {
  const root = new THREE.Group();
  root.name = 'Sri Lankan king coconut cart';
  box(root, [1.75, 0.18, 1.15], [0, 0.72, 0], 0x9a6a3f);
  for (const x of [-0.82, 0.82]) {
    box(root, [0.1, 0.62, 1.1], [x, 0.98, 0], 0xb07b48);
    torus(root, 0.34, 0.045, [x, 0.43, 0.12], 0x252c2c, { rotation: [0, Math.PI / 2, 0] });
    cylinder(root, [0.045], 0.16, [x, 0.43, 0.12], 0x59615b, { rotation: [0, 0, Math.PI / 2] });
  }
  for (let index = 0; index < 11; index += 1) {
    const x = -0.58 + (index % 4) * 0.38;
    const z = -0.32 + (Math.floor(index / 4) % 2) * 0.48;
    const y = 0.93 + Math.floor(index / 8) * 0.2;
    sphere(root, 0.2, [x, y, z], index % 3 ? 0x87943f : 0xd1a43c, {
      scale: [0.9, 1.12, 0.9], widthSegments: 8, heightSegments: 6,
    });
  }
  cylinder(root, [0.045], 2.35, [0.58, 1.55, 0.22], 0x6a5038, { segments: 7 });
  cone(root, 1.25, 0.38, [0.58, 2.72, 0.22], variant % 2 ? 0xd55b3f : 0xe5b63e, { segments: 12 });
  localLabel(root, 'තැඹිලි', 'KING COCONUT', [1.7, 0.65], [0, 0.68, 0.61]);
  return root;
}

function flagRow() {
  const root = new THREE.Group();
  root.name = 'Buddhist flag row beside Sri Lankan road';
  for (const x of [-1.65, 1.65]) cylinder(root, [0.04], 2.7, [x, 1.35, 0], 0x6d5a43, { segments: 7 });
  box(root, [3.3, 0.025, 0.025], [0, 2.55, 0], 0x6d5a43);
  const colors = [0x2454a6, 0xf1c83c, 0xb64242, 0xf4eee0, 0xe57e32, 0x3d7c55];
  colors.forEach((color, index) => {
    box(root, [0.42, 0.58, 0.025], [-1.3 + index * 0.52, 2.22 - (index % 2) * 0.05, 0], color, {
      rotation: [0, 0, (index % 2 ? 1 : -1) * 0.04],
    });
  });
  box(root, [3.7, 0.42, 0.28], [0, 0.21, 0], 0xf0ead8);
  return root;
}

function teaCrates() {
  const root = new THREE.Group();
  root.name = 'Ceylon tea chests and leaf sacks';
  for (let index = 0; index < 3; index += 1) {
    const x = -0.85 + index * 0.85;
    box(root, [0.75, 0.68, 0.8], [x, 0.34, 0], 0x9c7449);
    for (const y of [0.12, 0.56]) box(root, [0.78, 0.07, 0.84], [x, y, 0], 0x6d5135);
    label(root, 'CEYLON TEA', [0.65, 0.22], [x, 0.37, 0.411], {
      background: '#315d43', foreground: '#fff1c9', border: '#315d43', fontSize: 42,
    });
  }
  for (const x of [-0.5, 0.55]) {
    sphere(root, 0.42, [x, 0.42, 0.85], 0xb59a6a, { scale: [0.78, 1.15, 0.72] });
    capsule(root, 0.055, 0.18, [x, 0.89, 0.85], 0x6c5739, { radialSegments: 7, capSegments: 2 });
  }
  return root;
}

function fishingRack() {
  const root = new THREE.Group();
  root.name = 'Sri Lankan coastal fishing net rack';
  for (const x of [-1.35, 1.35]) cylinder(root, [0.055], 2.25, [x, 1.125, 0], 0x6b5138, { segments: 7 });
  box(root, [2.9, 0.07, 0.07], [0, 2.12, 0], 0x6b5138);
  const net = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.PlaneGeometry(2.55, 1.35, 7, 5)),
    new THREE.LineBasicMaterial({ color: 0x71867c, transparent: true, opacity: 0.75 }),
  );
  net.position.set(0, 1.32, 0);
  root.add(net);
  for (let index = 0; index < 7; index += 1) {
    sphere(root, 0.09, [-1.15 + index * 0.38, 0.63, 0.04], index % 2 ? 0xe0d2a0 : 0xa84f3e);
  }
  for (const x of [-0.75, 0.65]) {
    box(root, [0.65, 0.38, 0.65], [x, 0.19, 0.6], 0x9b744c);
    sphere(root, 0.18, [x, 0.45, 0.6], 0x9db8b6, { scale: [1.5, 0.45, 0.65] });
  }
  return root;
}

function flowerOfferings() {
  const root = new THREE.Group();
  root.name = 'Temple flower and oil-lamp offerings';
  box(root, [2.5, 0.16, 1.1], [0, 0.78, 0], 0x9a6d43);
  for (const x of [-1.05, 1.05]) cylinder(root, [0.055], 0.75, [x, 0.375, 0], 0x674b34, { segments: 7 });
  for (let index = 0; index < 12; index += 1) {
    const x = -0.95 + (index % 6) * 0.38;
    const z = -0.25 + Math.floor(index / 6) * 0.48;
    sphere(root, 0.14, [x, 0.96, z], [0xf2ecdc, 0xe69aaf, 0x6f9ec6][index % 3], {
      scale: [1.2, 0.45, 1.2], widthSegments: 8, heightSegments: 5,
    });
  }
  for (const x of [-1.45, 1.45]) {
    cylinder(root, [0.15, 0.24], 0.18, [x, 0.09, 0], 0xb68b3d, { segments: 10 });
    capsule(root, 0.045, 0.72, [x, 0.53, 0], 0xb68b3d, { radialSegments: 8, capSegments: 3 });
    cone(root, 0.11, 0.28, [x, 0.99, 0], 0xe0ad3d, { segments: 9 });
  }
  localLabel(root, 'මල් පූජා', 'FLOWER OFFERINGS', [2.1, 0.58], [0, 0.7, 0.57], ['#7f2d43', '#fff4cf']);
  return root;
}

function palmyrahProduce() {
  const root = new THREE.Group();
  root.name = 'Jaffna palmyrah produce baskets';
  for (const x of [-0.75, 0.2, 0.95]) {
    cylinder(root, [0.38, 0.29], 0.52, [x, 0.26, 0], 0xa67b45, { segments: 12 });
    torus(root, 0.38, 0.035, [x, 0.52, 0], 0x6f5133, { rotation: [Math.PI / 2, 0, 0] });
    for (let index = 0; index < 4; index += 1) {
      sphere(root, 0.16, [x + (index % 2) * 0.18 - 0.09, 0.58 + Math.floor(index / 2) * 0.12, 0],
        index % 2 ? 0x5b3c2e : 0x766036, { widthSegments: 8, heightSegments: 6 });
    }
  }
  localLabel(root, 'පනා පලතුරු', 'PALMYRAH PRODUCE', [2.25, 0.62], [0.1, 1.25, 0.05], ['#6d4c32', '#fff4cf']);
  return root;
}

export function createSriLankanRoadside(themeId, variant = 0) {
  let root;
  if (['anuradhapura', 'polonnaruwa'].includes(themeId)) root = flowerOfferings();
  else if (['kandy', 'kadugannawa', 'nuwara-eliya', 'ella'].includes(themeId)) root = teaCrates();
  else if (['galle', 'negombo', 'trincomalee'].includes(themeId)) root = fishingRack();
  else if (themeId === 'jaffna') root = palmyrahProduce();
  else if (['kotte', 'suburb'].includes(themeId) && variant % 2) root = flagRow();
  else root = coconutCart(variant);
  root.userData.sriLankanRoadside = themeId;
  return root;
}

export function createDistrictGateway(theme) {
  const root = new THREE.Group();
  root.name = `${theme.name} district welcome gateway`;
  for (const x of [-1.55, 1.55]) {
    cylinder(root, [0.07, 0.1], 3.25, [x, 1.625, 0], 0x5b6260, { segments: 8 });
    for (let index = 0; index < 4; index += 1) {
      cylinder(root, [0.105], 0.26, [x, 0.18 + index * 0.27, 0], index % 2 ? 0xf0eee2 : 0x242a2b, { segments: 8 });
    }
  }
  label(root, `WELCOME TO\n${theme.name}`, [3.7, 1.25], [0, 2.65, 0.04], {
    background: '#176b52', foreground: '#ffffff', border: '#f4f0d8', fontSize: 43,
  });
  label(root, theme.subtitle, [3.25, 0.5], [0, 1.72, 0.04], {
    background: '#243e56', foreground: '#fff2c9', border: '#d5ac43', fontSize: 39,
  });
  root.userData.gateway = theme.id;
  return root;
}
