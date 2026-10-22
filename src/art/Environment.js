import * as THREE from 'three';
import { box, cylinder, sphere, cone, label, material } from './MeshKit.js';
import { createObstacleModel } from './Vehicles.js';
import { hasLocalSignFonts, LOCAL_SIGN_FONT } from '../ui/SignFonts.js';

let frondGeometry;
const wireGeometries = new Map();
const wireMaterial = new THREE.LineBasicMaterial({ color: 0x303638 });

function getFrondGeometry() {
  if (frondGeometry) return frondGeometry;
  frondGeometry = new THREE.BufferGeometry();
  frondGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -0.42, 0, 1.05, -0.28, -0.14, 2.15, 0, -0.62, 3.25,
    0.28, -0.14, 2.15, 0.42, 0, 1.05, 0, 0.1, 1.35,
  ], 3));
  frondGeometry.setIndex([0, 1, 6, 1, 2, 6, 2, 3, 6, 3, 4, 6, 4, 5, 6, 5, 0, 6]);
  frondGeometry.computeVertexNormals();
  return frondGeometry;
}

function addWindow(parent, x, y, z, width = 1, height = 1, shutters = false) {
  box(parent, [width + 0.14, height + 0.14, 0.08], [x, y, z], 0xeee4cf);
  box(parent, [width, height, 0.09], [x, y, z + 0.045], 0x396776, { roughness: 0.32 });
  box(parent, [0.045, height, 0.04], [x, y, z + 0.1], 0xd9d6c7);
  box(parent, [width, 0.045, 0.04], [x, y, z + 0.1], 0xd9d6c7);
  if (shutters) {
    for (const side of [-1, 1]) {
      box(parent, [width * 0.36, height, 0.07], [x + side * width * 0.72, y, z + 0.02], 0x39705d, {
        rotation: [0, side * 0.18, 0],
      });
    }
  }
}

function addAwning(parent, width, y, z, color, striped = false) {
  const strips = striped ? 7 : 1;
  for (let i = 0; i < strips; i += 1) {
    const stripWidth = width / strips;
    box(parent, [stripWidth + 0.015, 0.1, 1.05], [-width / 2 + stripWidth * (i + 0.5), y, z],
      striped && i % 2 ? 0xfff0d5 : color, { rotation: [0.12, 0, 0] });
  }
  box(parent, [width, 0.24, 0.08], [0, y - 0.16, z + 0.49], color);
}

function addBalcony(parent, width, y, z) {
  box(parent, [width, 0.14, 1.05], [0, y, z + 0.38], 0xd6d0bd);
  box(parent, [width, 0.08, 0.08], [0, y + 0.85, z + 0.87], 0x354f52);
  for (let x = -width / 2 + 0.12; x <= width / 2; x += 0.42) {
    box(parent, [0.055, 0.82, 0.055], [x, y + 0.45, z + 0.87], 0x354f52);
  }
}

export function createPalm(height = 6.5, lean = 0.5) {
  const palm = new THREE.Group();
  const segments = 6;
  for (let i = 0; i < segments; i += 1) {
    const t = i / (segments - 1);
    cylinder(palm, [0.17 - t * 0.04, 0.24 - t * 0.04], height / segments + 0.09,
      [lean * t * t, (i + 0.5) * height / segments, 0], i % 2 ? 0x89613e : 0xa3784b, {
        segments: 7, rotation: [0, 0, -lean * 0.025],
      });
  }
  const crown = new THREE.Group();
  crown.position.set(lean, height, 0);
  palm.add(crown);
  for (let i = 0; i < 10; i += 1) {
    const frond = new THREE.Mesh(getFrondGeometry(), material(i % 3 ? 0x237a46 : 0x43a253, {
      side: THREE.DoubleSide,
    }));
    frond.rotation.y = i * Math.PI * 0.2;
    frond.rotation.x = i % 2 ? 0.08 : -0.1;
    frond.scale.setScalar(i % 2 ? 1 : 0.82);
    frond.castShadow = true;
    crown.add(frond);
  }
  for (let i = 0; i < 4; i += 1) {
    const angle = i * Math.PI / 2;
    sphere(crown, 0.18, [Math.cos(angle) * 0.25, -0.18, Math.sin(angle) * 0.25], 0x7b5b2c);
  }
  return palm;
}

export function createBananaPlant(scale = 1, variant = 0) {
  const plant = new THREE.Group();
  plant.name = 'Original tropical banana plant';
  cylinder(plant, [0.12, 0.19], 1.65, [0, 0.825, 0], 0x7e9448, { segments: 7 });
  for (let ring = 0; ring < 4; ring += 1) {
    cylinder(plant, [0.15 - ring * 0.008], 0.12, [0, 0.35 + ring * 0.34, 0], 0xa1a75a, { segments: 7 });
  }
  const crown = new THREE.Group();
  crown.position.y = 1.58;
  plant.add(crown);
  for (let index = 0; index < 8; index += 1) {
    const leaf = new THREE.Mesh(getFrondGeometry(), material(index % 3 ? 0x3d8d45 : 0x6da34b, {
      side: THREE.DoubleSide, roughness: 0.76,
    }));
    leaf.rotation.y = index * Math.PI / 4 + variant * 0.17;
    leaf.rotation.x = index % 2 ? 0.18 : -0.08;
    leaf.scale.set(0.88, 0.72, index % 2 ? 0.62 : 0.72);
    leaf.castShadow = true;
    crown.add(leaf);
  }
  const blossom = cone(crown, 0.13, 0.36, [0.18, -0.35, 0.1], 0x7e3547, { segments: 7 });
  blossom.rotation.z = Math.PI;
  plant.scale.setScalar(scale);
  return plant;
}

export function createTree(scale = 1, variant = 0) {
  const tree = new THREE.Group();
  cylinder(tree, [0.22, 0.34], 2.8 * scale, [0, 1.4 * scale, 0], 0x765035, { segments: 7 });
  const greens = [0x2f7846, 0x3d8c4d, 0x276b40, 0x548c45];
  sphere(tree, 1.5 * scale, [0, 3.4 * scale, 0], greens[variant % 4], { scale: [1, 0.9, 1] });
  sphere(tree, 1.05 * scale, [-0.9 * scale, 3.2 * scale, 0.25], greens[(variant + 1) % 4]);
  sphere(tree, 1.1 * scale, [0.85 * scale, 3.5 * scale, -0.2], greens[(variant + 2) % 4]);
  sphere(tree, 0.85 * scale, [0.2, 4.25 * scale, 0.15], greens[(variant + 1) % 4]);
  if (variant % 5 === 4) {
    for (const x of [-0.6, 0.3, 0.75]) sphere(tree, 0.18 * scale, [x, 4 * scale, 0.7], 0xe69aaf);
  }
  return tree;
}

function commercialBuilding(variant, style) {
  const root = new THREE.Group();
  const market = style === 'market' || style === 'negombo';
  const fort = style === 'galle';
  const hill = ['kandy', 'kadugannawa', 'ella', 'nuwara-eliya'].includes(style);
  const widths = [4.8, 5.4, 5.9, 4.6, 6.1, 5.2];
  const cityHeights = [6.3, 7.8, 5.6, 8.6, 6.9, 7.4];
  const marketHeights = [4.1, 5.2, 4.6, 5.8, 4.3, 5.1];
  const fortHeights = [3.8, 4.6, 4.2, 5.1, 4.4, 4.8];
  const hillHeights = [3.6, 4.8, 4.1, 5.2, 3.9, 4.5];
  const width = widths[variant % widths.length];
  const heights = fort ? fortHeights : hill ? hillHeights : market ? marketHeights : cityHeights;
  const height = heights[variant % 6];
  const depth = [3.8, 4.2, 3.6][variant % 3];
  const colors = fort
    ? [0xeee3c7, 0xe4d2a5, 0xf0e8d5, 0xd9c49c, 0xe7d8b9, 0xf1e5ca]
    : hill
      ? [0xd7d9b5, 0xc0d5c0, 0xe2c2a5, 0xb8ced0, 0xe5d7ae, 0xc8c0d2]
      : market
        ? [0xe2b778, 0xc7d9a5, 0xe2a18f, 0xa9ccd2, 0xe3cf8a, 0xc7b1d2]
        : [0xe8c98e, 0xb9d8c0, 0xe5b2a0, 0xb9cce2, 0xe7dcb8, 0xd1b8d8];
  const front = depth / 2;
  box(root, [width, height, depth], [0, height / 2, 0], colors[variant % colors.length], { surface: 'plaster' });
  box(root, [width + 0.16, 0.18, depth + 0.15], [0, height + 0.02, 0], 0xe8dfc9);
  for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
    box(root, [0.18, height, 0.18], [x, height / 2, front + 0.02], 0xe3d7bd);
  }

  const shopNames = fort
    ? ['FORT BOOKS', 'RAMPART CAFE', 'GALLE STORES', 'LIGHTHOUSE TEA', 'DUTCH LANE', 'FORT BAKERY']
    : hill
      ? ['HILL TEA', 'KANDY BAKERY', 'RAIL VIEW STORE', 'TEA & SPICE', 'HORTON KADE', 'ELLA SHORT EATS']
      : style === 'negombo'
        ? ['LAGOON FISH', 'KING COCONUT', 'SEAFOOD STORE', 'CANAL BAKERY', 'FISH MARKET', 'NEGOMBO STORES']
        : market
          ? ['KOTTE POLA', 'KING COCONUT', 'SPICE HOUSE', 'MARKET TEXTILES', 'FRESH FRUIT', 'ISLAND RICE']
          : ['CEYLON TEA', 'LOTUS KADE', 'SHORT EATS', 'COLOMBO BAKERY', 'GALLE BOOKS', 'CITY STORES'];
  const sinhalaShopNames = market
    ? ['තැඹිලි', 'එළවළු', 'කුළු බඩු', 'රෙදි කඩේ', 'පළතුරු', 'සහල් කඩේ']
    : ['තේ කඩේ', 'පොත් කඩේ', 'කෑම කඩේ', 'පාසල් උපකරණ', 'ඖෂධ කඩේ', 'ආයුබෝවන්'];
  const localSign = hasLocalSignFonts() && variant % 2 === 0;
  const signColors = ['#7f2d43', '#166b63', '#25466d', '#a84b2a'];
  box(root, [width * 0.9, 0.68, 0.14], [0, 2.63, front + 0.08], 0x213b56);
  label(root, localSign ? sinhalaShopNames[variant % shopNames.length] : shopNames[variant % shopNames.length],
    [width * 0.84, 0.53], [0, 2.64, front + 0.16], {
      background: signColors[variant % signColors.length], foreground: '#fff4cf', border: '#f4b942', fontSize: 45,
      fontFamily: localSign ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
    });
  addAwning(root, width * 0.96, 2.18, front + 0.47, market ? 0xc44d42 : 0x278276, variant % 2 === 0);

  box(root, [0.92, 1.75, 0.1], [0, 0.9, front + 0.07], 0x29454a);
  for (const side of [-1, 1]) {
    const x = side * width * 0.29;
    if (variant % 3 === 1) {
      box(root, [1.25, 1.55, 0.09], [x, 0.95, front + 0.07], 0x718082);
      for (let y = 0.35; y < 1.65; y += 0.22) box(root, [1.2, 0.035, 0.04], [x, y, front + 0.13], 0x4f6164);
    } else {
      addWindow(root, x, 1.15, front + 0.07, 1.08, 1.15, false);
    }
  }

  const floors = Math.max(1, Math.floor((height - 2.9) / 1.9));
  for (let floor = 0; floor < floors; floor += 1) {
    const y = 3.75 + floor * 1.8;
    for (const side of [-1, 1]) {
      addWindow(root, side * width * 0.25, y, front + 0.04, 0.9, 1.02, variant % 4 === 2);
      for (const sideZ of [-0.85, 0.65]) {
        box(root, [0.075, 0.9, 0.82], [side * (width / 2 + 0.035), y, sideZ], 0x426c75);
        box(root, [0.085, 0.05, 0.86], [side * (width / 2 + 0.045), y - 0.47, sideZ], 0xe2d8c2);
      }
    }
    if (floor === 0 && variant % 2 === 0) addBalcony(root, width * 0.82, y - 0.73, front);
  }
  if (variant % 3 === 0) {
    cylinder(root, [0.55], 0.9, [width * 0.23, height + 0.55, -0.4], 0x314f59, { segments: 12 });
    box(root, [1.35, 0.1, 1.35], [width * 0.23, height + 0.06, -0.4], 0x8b8a7c);
  }
  return root;
}

export function createBuilding(variant = 0, style = 'colombo') {
  return commercialBuilding(variant, style);
}

export function createHouse(variant = 0) {
  const house = new THREE.Group();
  const width = [4.7, 5.4, 4.9][variant % 3];
  const depth = 4;
  const height = [2.8, 3.2, 2.95][variant % 3];
  const colors = [0xf0d7ac, 0xc4dbc1, 0xe6bdb0, 0xc1d4e0];
  box(house, [width, height, depth], [0, height / 2, 0], colors[variant % 4], { surface: 'plaster' });
  const roof = cone(house, width * 0.74, 1.35, [0, height + 0.63, 0], variant % 2 ? 0x92503c : 0xa9583e, { segments: 4, surface: 'roof' });
  roof.rotation.y = Math.PI / 4;
  roof.scale.z *= 0.72;
  box(house, [1.0, 1.85, 0.1], [0, 0.94, depth / 2 + 0.06], 0x31554e);
  for (const side of [-1, 1]) addWindow(house, side * width * 0.29, 1.35, depth / 2 + 0.04, 0.92, 1.08, true);
  addAwning(house, width * 0.72, 2.15, depth / 2 + 0.45, variant % 2 ? 0x49766b : 0xb07145, false);
  box(house, [width * 0.8, 0.15, 1.25], [0, 0.08, depth / 2 + 0.48], 0xc4bca7, { surface: 'paving' });
  return house;
}

export function createBoundaryWall(variant = 0) {
  const root = new THREE.Group();
  const color = variant % 2 ? 0xd7c9ac : 0xc4d0bc;
  for (const side of [-1, 1]) {
    box(root, [1.65, 0.85, 0.25], [side * 1.95, 0.43, 0], color, { surface: 'plaster' });
    box(root, [0.32, 1.25, 0.35], [side * 1.05, 0.63, 0], color);
    box(root, [0.42, 0.12, 0.45], [side * 1.05, 1.28, 0], 0xeee1c6);
  }
  for (let x = -0.85; x <= 0.85; x += 0.24) box(root, [0.055, 0.92, 0.07], [x, 0.5, 0], 0x365154);
  box(root, [1.9, 0.07, 0.08], [0, 0.94, 0], 0x365154);
  return root;
}

export function createMarketStall(variant = 0) {
  const stall = new THREE.Group();
  const width = 2.9;
  for (const x of [-1.3, 1.3]) {
    for (const z of [-0.7, 0.7]) cylinder(stall, [0.045], 2.25, [x, 1.125, z], 0x6a5137, { segments: 6 });
  }
  addAwning(stall, width, 2.25, 0, [0xd34f45, 0x298b78, 0xe2a93b][variant % 3], true);
  box(stall, [2.65, 0.18, 1.3], [0, 0.92, 0], 0x9a693d);
  for (const x of [-0.82, 0, 0.82]) {
    box(stall, [0.7, 0.38, 0.9], [x, 0.65, 0], 0xa87947);
    for (let i = 0; i < 4; i += 1) {
      sphere(stall, 0.13, [x - 0.2 + (i % 2) * 0.3, 1.08 + Math.floor(i / 2) * 0.13, -0.15 + (i % 2) * 0.25],
        [0xe19b32, 0x78a93c, 0xd85c43][(variant + i) % 3]);
    }
  }
  return stall;
}

export function createStreetlight(side = 1) {
  const root = new THREE.Group();
  cylinder(root, [0.075, 0.13], 5.4, [0, 2.7, 0], 0x4a585c, { segments: 8 });
  box(root, [0.38, 0.18, 0.38], [0, 0.09, 0], 0x6f7772);
  box(root, [1.25, 0.09, 0.09], [-side * 0.57, 5.32, 0], 0x4a585c);
  box(root, [0.58, 0.15, 0.3], [-side * 1.15, 5.24, 0], 0x36464b);
  box(root, [0.44, 0.035, 0.23], [-side * 1.15, 5.15, 0], 0xffdf8a, {
    emissive: 0xffc95c, emissiveIntensity: 0.45, castShadow: false,
  });
  return root;
}

export function createUtilityPole() {
  const root = new THREE.Group();
  cylinder(root, [0.11, 0.17], 6.2, [0, 3.1, 0], 0x765338, { segments: 7 });
  box(root, [1.65, 0.13, 0.13], [0, 5.75, 0], 0x5f4634);
  for (const x of [-0.62, 0, 0.62]) cylinder(root, [0.075], 0.24, [x, 5.93, 0], 0xd7d2b9, { segments: 7 });
  return root;
}

export function createUtilityWires(length = 30) {
  const root = new THREE.Group();
  for (const x of [-0.62, 0, 0.62]) {
    const key = `${length}:${x}`;
    if (!wireGeometries.has(key)) {
      const points = [];
      for (let i = 0; i <= 12; i += 1) {
        const t = i / 12;
        points.push(new THREE.Vector3(x, 5.93 - Math.sin(t * Math.PI) * 0.22, -length / 2 + t * length));
      }
      wireGeometries.set(key, new THREE.BufferGeometry().setFromPoints(points));
    }
    root.add(new THREE.Line(wireGeometries.get(key), wireMaterial));
  }
  return root;
}

export function createBusStop() {
  const stop = new THREE.Group();
  box(stop, [4.2, 0.18, 2.05], [0, 2.68, 0], 0x236b68);
  box(stop, [4.0, 0.09, 0.12], [0, 2.48, 0.95], 0xf2b83d);
  for (const x of [-1.75, 1.75]) {
    for (const z of [-0.72, 0.72]) cylinder(stop, [0.07], 2.65, [x, 1.325, z], 0x3d4d50);
  }
  box(stop, [3.3, 0.16, 0.55], [0, 0.65, -0.45], 0x9b623d);
  box(stop, [3.3, 0.7, 0.12], [0, 1.02, -0.72], 0x9b623d);
  box(stop, [0.12, 1.65, 1.5], [-1.78, 1.65, 0], 0x85a9aa, { roughness: 0.35 });
  cylinder(stop, [0.07], 3.3, [2.42, 1.65, 0], 0x3d4d50);
  const multilingual = hasLocalSignFonts();
  label(stop, multilingual ? 'බස් නැවතුම\nபேருந்து நிறுத்தம்\nBUS HALT' : 'BUS HALT', [2.05, 1.15], [2.42, 2.83, 0.05], {
    background: '#7f2d43', foreground: '#fff4cf', border: '#f4b942', fontSize: multilingual ? 40 : 48,
    fontFamily: multilingual ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
  });
  return stop;
}

export function createRoadSign(text = 'KOTTE ROAD') {
  const sign = new THREE.Group();
  cylinder(sign, [0.065], 2.7, [0, 1.35, 0], 0x536065, { segments: 8 });
  const localNames = {
    'SCHOOL ZONE': 'පාසල් කලාපය\nபள்ளி வலயம்\nSCHOOL ZONE',
    'GALLE ROAD': 'ගාලු පාර\nGALLE ROAD',
    'KOTTE ROAD': 'කෝට්ටේ පාර\nKOTTE ROAD',
  };
  const local = hasLocalSignFonts() && Boolean(localNames[text]);
  label(sign, local ? localNames[text] : text, [2.3, local ? (text === 'SCHOOL ZONE' ? 1.12 : 0.94) : 0.68], [0, 2.3, 0.04], {
    background: '#176b52', foreground: '#ffffff', border: '#ffffff', fontSize: local ? 40 : 42,
    fontFamily: local ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
  });
  return sign;
}

const SINHALA_BOARDS = Object.freeze({
  colombo: ['ආයුබෝවන්', 'කොළඹ', 'තේ කඩේ', 'පොත් කඩේ', 'විවෘතයි'],
  suburb: ['ආයුබෝවන්', 'මහරගම', 'පාසල් උපකරණ', 'විවෘතයි', 'ගෘහ ආහාර'],
  market: ['පිටකොටුව', 'තැඹිලි', 'පළතුරු', 'එළවළු', 'අඩු මිලට'],
  kotte: ['කෝට්ටේ', 'දියවන්න', 'ආයුබෝවන්', 'තේ කඩේ', 'විවෘතයි'],
  kandy: ['මහනුවර', 'දලදා මාළිගාව', 'තේ කඩේ', 'ආයුබෝවන්', 'විවෘතයි'],
  kadugannawa: ['කඩුගන්නාව', 'දුම්රිය', 'තේ කඩේ', 'ආයුබෝවන්', 'විවෘතයි'],
  'nuwara-eliya': ['නුවරඑළිය', 'තේ', 'කෑම කඩේ', 'ආයුබෝවන්', 'විවෘතයි'],
  ella: ['ඇල්ල', 'නව ආරුක්කු', 'තේ කඩේ', 'ආයුබෝවන්', 'විවෘතයි'],
  galle: ['ගාල්ල', 'කොටුව', 'පොත් කඩේ', 'තේ කඩේ', 'ආයුබෝවන්'],
  negombo: ['මීගමුව', 'මාළු', 'තැඹිලි', 'කෑම කඩේ', 'ආයුබෝවන්'],
});
const BOARD_FALLBACKS = ['WELCOME', 'ISLAND TOWN', 'TEA SHOP', 'FOOD STORE', 'OPEN'];

/** A guaranteed readable Sinhala roadside board in every recycled section. */
export function createSinhalaBoard(variant = 0, theme = 'colombo') {
  const root = new THREE.Group();
  root.name = 'Sinhala roadside board';
  const words = SINHALA_BOARDS[theme] || SINHALA_BOARDS.colombo;
  const index = Math.abs(variant) % words.length;
  const local = hasLocalSignFonts();
  for (const x of [-1.0, 1.0]) {
    cylinder(root, [0.055], 2.25, [x, 1.125, 0], 0x67523a, { segments: 7 });
    box(root, [0.18, 0.08, 0.28], [x, 0.04, 0], 0x7c7666);
  }
  box(root, [2.65, 0.94, 0.12], [0, 1.85, 0], 0x213b56);
  label(root, local ? words[index] : BOARD_FALLBACKS[index], [2.48, 0.77], [0, 1.86, 0.071], {
    background: ['#7f2d43', '#176b63', '#274b73', '#9b4d2f', '#366748'][index],
    foreground: '#fff7d8', border: '#f4b942', fontSize: local ? 54 : 46,
    fontFamily: local ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
  });
  return root;
}

export function createAdvertisingBoard(variant = 0) {
  const root = new THREE.Group();
  for (const x of [-1.25, 1.25]) cylinder(root, [0.07], 3.8, [x, 1.9, 0], 0x4d5657);
  const local = hasLocalSignFonts() && variant % 4 !== 3;
  const localTexts = ['තේ  •  தேநீர்\nCEYLON TEA', 'ආයුබෝවන්\nWELCOME', 'තැඹිලි\nKING COCONUT'];
  const texts = ['CEYLON TEA', 'VISIT THE POLA', 'KING COCONUT', 'ISLAND EXPRESS'];
  label(root, local ? localTexts[variant % localTexts.length] : texts[variant % texts.length],
    [3.25, local ? 1.35 : 1.15], [0, 3.35, 0.04], {
      background: ['#8b3048', '#176b63', '#b85832', '#274b73'][variant % 4], foreground: '#fff3cf',
      border: '#f4b942', fontSize: local ? 46 : 48,
      fontFamily: local ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
    });
  return root;
}

export function createTrafficLight() {
  const root = new THREE.Group();
  cylinder(root, [0.07], 3.5, [0, 1.75, 0], 0x3f4c50);
  box(root, [0.48, 1.25, 0.4], [0, 3.25, 0], 0x273238);
  [0xdb4d43, 0xe4b73e, 0x4fae64].forEach((color, index) => {
    sphere(root, 0.14, [0, 3.62 - index * 0.37, 0.22], color, {
      scale: [1, 1, 0.45], emissive: index === 2 ? color : 0, emissiveIntensity: index === 2 ? 0.5 : 0,
    });
  });
  return root;
}

export function createRoadsideBin() {
  const root = new THREE.Group();
  cylinder(root, [0.32, 0.28], 0.78, [0, 0.39, 0], 0x28705a, { segments: 10 });
  cylinder(root, [0.35], 0.1, [0, 0.81, 0], 0x203f38, { segments: 10 });
  return root;
}

export function createParkedVehicle(kind = 'car', variant = 0) {
  const vehicle = createObstacleModel(kind, variant);
  vehicle.scale.setScalar(0.88);
  vehicle.userData.decorative = true;
  return vehicle;
}

export function createBackdrop() {
  const backdrop = new THREE.Group();
  const hills = [[-62, -249, 34, 0x3f7f58], [-25, -255, 40, 0x39734f], [23, -258, 43, 0x326c4c], [67, -250, 35, 0x43845a]];
  for (const [x, z, radius, color] of hills) {
    sphere(backdrop, radius, [x, -8, z], color, { widthSegments: 10, heightSegments: 6, scale: [1.25, 0.65, 0.8], castShadow: false });
  }
  for (let i = 0; i < 24; i += 1) {
    const x = -102 + i * 9;
    const height = 6 + (i * 7 % 17);
    box(backdrop, [5 + (i % 3), height, 6], [x, height / 2, -242 - (i % 4) * 4],
      [0x9db5a5, 0xc0b898, 0x91a8ad, 0xb5a9b8][i % 4], { castShadow: false });
    if (i % 3 === 0) box(backdrop, [2.2, 1.1, 2.2], [x, height + 0.55, -242 - (i % 4) * 4], 0x77928b, { castShadow: false });
  }
  // An original slender island communications tower and a distant white dagoba.
  cylinder(backdrop, [0.65, 1.25], 29, [-38, 14.5, -251], 0x9aa9a4, { segments: 10, castShadow: false });
  sphere(backdrop, 3.3, [-38, 30, -251], 0x7e9c85, { scale: [1, 0.6, 1], castShadow: false });
  cone(backdrop, 1.1, 7, [-38, 35, -251], 0x8a9c96, { segments: 10, castShadow: false });
  sphere(backdrop, 5.5, [49, 3.3, -246], 0xe8e5d7, { scale: [1.2, 0.72, 1.2], castShadow: false });
  cylinder(backdrop, [0.35], 3.2, [49, 8.1, -246], 0xd5cda9, { segments: 8, castShadow: false });
  for (const [x, y, z, scale] of [[-45, 28, -190, 2.2], [34, 34, -205, 2.8], [74, 25, -180, 1.8]]) {
    sphere(backdrop, scale, [x, y, z], 0xe9f0e7, { scale: [2.2, 0.55, 1], castShadow: false, receiveShadow: false });
    sphere(backdrop, scale * 0.75, [x + scale * 1.4, y + 0.3, z], 0xe9f0e7, { scale: [1.4, 0.6, 1], castShadow: false, receiveShadow: false });
  }
  return backdrop;
}
