import * as THREE from 'three';
import { box, roundedBox, cylinder, sphere, cone, label } from './MeshKit.js';
import { hasLocalSignFonts, LOCAL_SIGN_FONT } from '../ui/SignFonts.js';
import { batchStaticGroup } from './StaticBatcher.js';

const DARK = 0x17202b;
const GLASS = 0x183c52;
const WHITE = 0xfff8e9;

function addLabel(...args) {
  if (typeof document !== 'undefined') label(...args);
}

function wheel(parent, x, y, z, radius = 0.43, width = 0.26) {
  const assembly = new THREE.Group();
  assembly.position.set(x, y, z);
  assembly.userData.radius = radius;
  parent.add(assembly);
  cylinder(assembly, [radius], width, [0, 0, 0], 0x111318, {
    segments: 14, rotation: [0, 0, Math.PI / 2], roughness: 0.92,
  });
  const outside = Math.sign(x) || 1;
  cylinder(assembly, [radius * 0.48], 0.028, [outside * width * 0.53, 0, 0], 0xa4adb3, {
    segments: 10, rotation: [0, 0, Math.PI / 2], metalness: 0.5,
  });
  cylinder(assembly, [radius * 0.18], 0.032, [outside * width * 0.56, 0, 0], 0x424c53, {
    segments: 8, rotation: [0, 0, Math.PI / 2], metalness: 0.35,
  });
  if (!parent.userData.wheels) parent.userData.wheels = [];
  parent.userData.wheels.push(assembly);
  return assembly;
}

function createBus(isPrivate, variant) {
  const bus = new THREE.Group();
  bus.userData.wheels = [];
  const palettes = [
    [0x087f8c, 0xffbf36, 0xf15b64],
    [0x772a85, 0x36d399, 0xffbf36],
    [0xd85b24, 0xffe15c, 0x2b9a91],
    [0x285eaa, 0xf2a43a, 0xe84d68],
  ];
  const [lower, accent, trim] = isPrivate ? palettes[variant % 4] : [0xb72e38, WHITE, 0x8e202d];

  roundedBox(bus, [2.48, 1.18, 6.52], [0, 1.25, 0], lower, { radius: 0.12 });
  roundedBox(bus, [2.42, 1.18, 6.43], [0, 2.21, -0.02], WHITE, { radius: 0.09 });
  roundedBox(bus, [2.5, 0.18, 6.55], [0, 2.88, -0.02], isPrivate ? accent : 0xe8e5dc, { radius: 0.06 });
  box(bus, [2.5, 0.18, 6.58], [0, 0.73, 0], DARK);
  box(bus, [2.52, 0.15, 6.56], [0, 1.48, 0], accent);
  box(bus, [2.5, 0.08, 6.5], [0, 0.93, 0], trim);

  roundedBox(bus, [2.08, 0.9, 0.07], [0, 2.18, 3.25], GLASS, { radius: 0.06, roughness: 0.22, metalness: 0.12 });
  box(bus, [0.065, 0.88, 0.08], [0, 2.18, 3.3], DARK);
  box(bus, [2.15, 0.07, 0.09], [0, 1.71, 3.29], DARK);
  const localDestination = hasLocalSignFonts();
  const destinations = isPrivate ? ['මහරගම', 'කෝට්ටේ', 'පිටකොටුව'] : ['කොළඹ', 'මහරගම', 'පිටකොටුව'];
  addLabel(bus, localDestination ? destinations[variant % destinations.length]
    : isPrivate ? `EXPRESS 0${7 + variant % 3}` : `COLOMBO 0${1 + variant % 3}`,
  [1.78, 0.32], [0, 2.75, 3.32], {
    background: isPrivate ? '#401d50' : '#182a36', foreground: '#ffe586',
    border: isPrivate ? '#ffbf36' : '#eeeeee', fontSize: 45,
    fontFamily: localDestination ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
  });
  if (isPrivate) {
    box(bus, [2.24, 0.12, 0.58], [0, 2.91, 3.0], trim, { rotation: [0.08, 0, 0] });
    for (const side of [-1, 1]) {
      box(bus, [0.36, 0.08, 0.05], [side * 0.56, 1.48, 3.33], accent, { rotation: [0, 0, side * 0.45] });
    }
  }

  roundedBox(bus, [1.05, 0.34, 0.06], [0, 1.1, 3.29], 0x26313a, { radius: 0.03 });
  for (let x = -0.4; x <= 0.4; x += 0.2) box(bus, [0.05, 0.26, 0.065], [x, 1.1, 3.34], 0x82919a);
  for (const side of [-1, 1]) {
    sphere(bus, 0.15, [side * 0.88, 1.08, 3.32], 0xffe6a1, {
      scale: [1.15, 0.8, 0.35], emissive: 0xffc95c, emissiveIntensity: 0.4,
    });
    sphere(bus, 0.065, [side * 0.88, 1.32, 3.32], 0xe98535, { scale: [1.1, 0.8, 0.35] });
    box(bus, [0.24, 0.16, 0.16], [side * 1.32, 2.34, 2.83], DARK);
    box(bus, [0.06, 0.3, 0.07], [side * 1.24, 2.34, 2.83], DARK);
  }
  roundedBox(bus, [2.56, 0.16, 0.2], [0, 0.69, 3.35], 0xb9c1c5, { radius: 0.035, metalness: 0.4 });
  addLabel(bus, 'WP BUS', [0.68, 0.2], [0, 0.79, 3.46], {
    background: '#f6e39a', foreground: '#18202a', border: '#f6e39a', fontSize: 54,
  });

  for (const side of [-1, 1]) {
    for (const z of [-2.24, -0.86, 0.52, 1.9]) {
      roundedBox(bus, [0.045, 0.72, 1.05], [side * 1.22, 2.2, z], GLASS, { radius: 0.02, roughness: 0.27 });
      box(bus, [0.055, 0.05, 1.08], [side * 1.24, 1.82, z], 0xd8d6ca);
    }
    // A visible folding door and vertical seams on the pavement side.
    box(bus, [0.055, 1.62, 0.74], [side * 1.245, 1.43, 1.85], 0x2a4b55);
    box(bus, [0.065, 1.58, 0.035], [side * 1.28, 1.43, 1.85], 0xb9c4c2);
    if (isPrivate) {
      box(bus, [0.06, 0.16, 5.85], [side * 1.25, 1.08, -0.05], accent);
      box(bus, [0.06, 0.08, 5.85], [side * 1.26, 1.3, -0.05], trim);
    }
  }
  if (isPrivate && variant % 4 === 2) {
    for (const x of [-0.85, 0.85]) box(bus, [0.07, 0.22, 5.1], [x, 3.02, -0.3], DARK);
    for (const z of [-2.5, 0, 2.0]) box(bus, [1.8, 0.07, 0.07], [0, 3.12, z], DARK);
  }
  for (const x of [-1.22, 1.22]) {
    for (const z of [-2.18, 2.12]) wheel(bus, x, 0.51, z, 0.48, 0.3);
  }
  return bus;
}

function createVan() {
  const van = new THREE.Group();
  van.userData.wheels = [];
  const color = 0xd7d5ca;
  roundedBox(van, [1.95, 1.02, 3.65], [0, 0.94, -0.02], color, { radius: 0.13 });
  roundedBox(van, [1.9, 0.09, 3.45], [0, 1.48, -0.08], 0xeee9dc, { radius: 0.04 });
  roundedBox(van, [1.58, 0.52, 0.06], [0, 1.18, 1.79], GLASS, { radius: 0.05, rotation: [-0.12, 0, 0] });
  for (const side of [-1, 1]) {
    box(van, [0.045, 0.48, 1.9], [side * 0.98, 1.18, -0.35], GLASS);
    box(van, [0.055, 0.8, 0.04], [side * 1.0, 0.88, -0.25], 0x9a9c96);
    sphere(van, 0.13, [side * 0.65, 0.75, 1.84], 0xffe7a8, { scale: [1.2, 0.75, 0.35] });
  }
  box(van, [0.85, 0.24, 0.05], [0, 0.65, 1.86], 0x3c464b);
  roundedBox(van, [1.98, 0.12, 0.15], [0, 0.43, 1.87], 0x9da8ac, { radius: 0.025 });
  for (const x of [-0.94, 0.94]) for (const z of [-1.15, 1.15]) wheel(van, x, 0.38, z, 0.34, 0.22);
  return van;
}

function createCar(variant) {
  if (variant % 4 === 3) return createVan();
  const car = new THREE.Group();
  car.userData.wheels = [];
  const color = [0xe0a72f, 0x3176a8, 0xb9b7ae][variant % 3];
  roundedBox(car, [1.95, 0.64, 3.72], [0, 0.7, 0], color, { radius: 0.14 });
  roundedBox(car, [1.7, 0.61, 1.92], [0, 1.23, -0.28], color, { radius: 0.12 });
  roundedBox(car, [1.53, 0.49, 0.055], [0, 1.27, 0.69], GLASS, { radius: 0.04, rotation: [-0.18, 0, 0] });
  box(car, [1.53, 0.46, 0.055], [0, 1.26, -1.25], GLASS, { rotation: [0.16, 0, 0] });
  for (const side of [-1, 1]) {
    box(car, [0.045, 0.45, 1.22], [side * 0.86, 1.26, -0.28], GLASS);
    box(car, [0.055, 0.06, 1.4], [side * 0.98, 0.83, -0.2], 0xe1d8bd);
    sphere(car, 0.13, [side * 0.65, 0.8, 1.86], 0xffe7a8, { scale: [1.25, 0.72, 0.35] });
  }
  roundedBox(car, [1.98, 0.12, 0.16], [0, 0.45, 1.88], 0xb8c1c8, { radius: 0.025 });
  for (const x of [-0.94, 0.94]) for (const z of [-1.18, 1.17]) wheel(car, x, 0.4, z, 0.36, 0.22);
  return car;
}

function createTukTuk(variant) {
  const tuk = new THREE.Group();
  tuk.userData.wheels = [];
  const color = [0xd6a923, 0x1d7768, 0x287a9a, 0x9b4145][variant % 4];
  roundedBox(tuk, [1.55, 0.55, 2.25], [0, 0.65, -0.05], color, { radius: 0.12 });
  roundedBox(tuk, [1.5, 0.8, 1.25], [0, 1.2, -0.52], color, { radius: 0.1 });
  roundedBox(tuk, [1.64, 0.2, 2.04], [0, 1.88, -0.12], DARK, { radius: 0.09 });
  roundedBox(tuk, [1.32, 0.66, 0.055], [0, 1.45, 0.83], GLASS, { radius: 0.05, rotation: [-0.13, 0, 0] });
  box(tuk, [1.35, 0.12, 0.15], [0, 1.85, 0.77], DARK);
  for (const side of [-1, 1]) {
    box(tuk, [0.075, 1.08, 0.075], [side * 0.67, 1.3, 0.62], DARK);
    box(tuk, [0.075, 1.06, 0.075], [side * 0.67, 1.3, -0.88], DARK);
    box(tuk, [0.06, 0.08, 1.3], [side * 0.77, 0.88, -0.1], 0xf0d783);
  }
  sphere(tuk, 0.16, [0, 0.87, 1.12], 0xffe5a0, { scale: [1, 1, 0.35], emissive: 0xffc85a, emissiveIntensity: 0.3 });
  addLabel(tuk, 'TUK', [0.52, 0.18], [0, 0.54, 1.15], { background: '#f5e6ae', foreground: '#17202b', border: '#f5e6ae', fontSize: 50 });
  wheel(tuk, -0.75, 0.38, -0.65, 0.34, 0.2);
  wheel(tuk, 0.75, 0.38, -0.65, 0.34, 0.2);
  wheel(tuk, 0, 0.36, 0.79, 0.32, 0.18);
  return tuk;
}

function createCone() {
  const root = new THREE.Group();
  box(root, [0.76, 0.1, 0.76], [0, 0.05, 0], DARK);
  cone(root, 0.34, 0.9, [0, 0.54, 0], 0xef6826, { segments: 10 });
  cylinder(root, [0.19, 0.25], 0.17, [0, 0.54, 0], WHITE, { segments: 10 });
  return root;
}

function createBarrier() {
  const root = new THREE.Group();
  for (const side of [-1, 1]) {
    box(root, [0.13, 1.02, 0.13], [side * 1.03, 0.51, 0], 0x4b5154);
    box(root, [0.65, 0.12, 0.4], [side * 1.03, 0.08, 0], DARK);
  }
  roundedBox(root, [2.48, 0.55, 0.18], [0, 0.79, 0], WHITE, { radius: 0.04 });
  for (const x of [-0.9, -0.3, 0.3, 0.9]) box(root, [0.32, 0.57, 0.025], [x, 0.79, 0.105], 0xe14c38, { rotation: [0, 0, -0.32] });
  for (const x of [-1.03, 1.03]) sphere(root, 0.075, [x, 1.08, 0], 0xf2b63d, { emissive: 0xf2b63d, emissiveIntensity: 0.35 });
  return root;
}

function createOverhead() {
  const root = new THREE.Group();
  for (const side of [-1, 1]) {
    cylinder(root, [0.07], 2.55, [side * 1.2, 1.275, 0], 0x4b5b60, { segments: 8 });
    box(root, [0.42, 0.1, 0.42], [side * 1.2, 0.05, 0], DARK);
  }
  box(root, [2.58, 1.05, 0.2], [0, 1.565, 0], 0x213b56);
  const local = hasLocalSignFonts();
  addLabel(root, local ? 'පාසල් කලාපය\nSCHOOL ZONE' : 'SCHOOL ZONE', [2.4, local ? 0.82 : 0.7], [0, 1.58, 0.115], {
    background: '#213b56', foreground: '#fff4cf', border: '#f4b942', fontSize: local ? 38 : 45,
    fontFamily: local ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
  });
  box(root, [2.65, 0.12, 0.28], [0, 1.06, 0], 0xf4b942);
  return root;
}

export function createObstacleModel(kind, variant = 0) {
  let model;
  switch (kind) {
    case 'public-bus': model = createBus(false, variant); break;
    case 'private-bus': model = createBus(true, variant); break;
    case 'car': model = createCar(variant); break;
    case 'tuk-tuk': model = createTukTuk(variant); break;
    case 'cone': model = createCone(); break;
    case 'barrier': model = createBarrier(); break;
    case 'overhead': model = createOverhead(); break;
    default: throw new Error(`Unknown obstacle model: ${kind}`);
  }
  return batchStaticGroup(model, { preserve: new Set(model.userData.wheels || []) });
}
