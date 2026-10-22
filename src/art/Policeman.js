import * as THREE from 'three';
import { box, roundedBox, cylinder, sphere, label } from './MeshKit.js';
import { hasLocalSignFonts, LOCAL_SIGN_FONT } from '../ui/SignFonts.js';

const SKIN = 0xa96f4b;
const SKIN_LIGHT = 0xbd8158;
const KHAKI = 0xb39b68;
const KHAKI_DARK = 0x88764f;
const NAVY = 0x1d303d;
const LEATHER = 0x171b1d;
const GOLD = 0xd5ad45;

function makeArm(side) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.51, 2.04, 0);
  sphere(shoulder, 0.17, [0, -0.03, 0], KHAKI, { flatShading: false });
  roundedBox(shoulder, [0.3, 0.4, 0.36], [0, -0.18, 0], KHAKI, { radius: 0.06 });
  box(shoulder, [0.31, 0.07, 0.37], [0, -0.39, 0], KHAKI_DARK);
  box(shoulder, [0.025, 0.3, 0.025], [side * 0.13, -0.17, -0.18], 0xc2ab78);
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.48, 0);
  sphere(elbow, 0.105, [0, 0, 0], SKIN, { flatShading: false });
  cylinder(elbow, [0.085, 0.105], 0.34, [0, -0.17, 0], SKIN_LIGHT, { segments: 8, flatShading: false });
  const wrist = new THREE.Group();
  wrist.position.set(0, -0.37, 0);
  cylinder(wrist, [0.075], 0.1, [0, 0, 0], SKIN, { segments: 8, flatShading: false });
  cylinder(wrist, [0.082], 0.045, [0, 0.025, 0], LEATHER, { segments: 8 });
  sphere(wrist, 0.115, [0, -0.1, -0.015], SKIN_LIGHT, { scale: [0.85, 1.12, 0.75], flatShading: false });
  sphere(wrist, 0.05, [-side * 0.09, -0.08, -0.02], SKIN, { flatShading: false });
  for (const x of [-0.045, 0, 0.045]) {
    roundedBox(wrist, [0.032, 0.12, 0.045], [x, -0.18, -0.035], SKIN_LIGHT, { radius: 0.012 });
  }
  elbow.add(wrist);
  shoulder.add(elbow);
  return { shoulder, elbow, wrist };
}

function makeLeg(side) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.22, 1.27, 0);
  roundedBox(hip, [0.38, 0.55, 0.43], [0, -0.23, 0], KHAKI_DARK, { radius: 0.055 });
  box(hip, [0.035, 0.48, 0.025], [side * 0.15, -0.23, -0.225], 0xc0aa78);
  const knee = new THREE.Group();
  knee.position.set(0, -0.52, 0);
  sphere(knee, 0.15, [0, 0, 0], KHAKI_DARK, { scale: [1, 0.85, 1] });
  box(knee, [0.25, 0.035, 0.035], [0, -0.05, -0.14], 0x9b865a, { rotation: [0, 0, 0.08] });
  box(knee, [0.23, 0.03, 0.035], [0, -0.12, -0.145], 0xb39b68, { rotation: [0, 0, -0.08] });
  cylinder(knee, [0.135, 0.17], 0.48, [0, -0.25, 0], KHAKI_DARK, { segments: 8 });
  box(knee, [0.035, 0.43, 0.025], [side * 0.13, -0.24, -0.15], 0xb8a171);
  const ankle = new THREE.Group();
  ankle.position.set(0, -0.53, 0);
  roundedBox(ankle, [0.32, 0.22, 0.55], [0, -0.08, -0.1], LEATHER, { radius: 0.045 });
  roundedBox(ankle, [0.33, 0.055, 0.57], [0, -0.2, -0.1], 0x090b0c, { radius: 0.018 });
  box(ankle, [0.22, 0.025, 0.19], [0, 0.02, -0.26], 0x41484a);
  for (const z of [-0.18, -0.25, -0.32]) {
    box(ankle, [0.22, 0.018, 0.025], [0, 0.045, z], 0x697174, { rotation: [0, 0, z * 0.3] });
  }
  box(ankle, [0.34, 0.055, 0.12], [0, -0.15, 0.12], 0x303638);
  knee.add(ankle);
  hip.add(knee);
  return { hip, knee, ankle };
}

/**
 * An original procedural Sri Lankan police officer: khaki shirt and trousers,
 * navy peaked cap, black belt/boots, epaulettes, radio and generic insignia.
 * No official emblem or third-party character model is used.
 */
export function createPoliceOfficer() {
  const visual = new THREE.Group();
  visual.name = 'Sri Lankan police officer in khaki uniform';
  visual.userData.isSriLankanPolice = true;
  visual.userData.uniform = 'khaki-shirt-trousers-navy-peaked-cap';
  const body = new THREE.Group();
  visual.add(body);

  roundedBox(body, [0.94, 0.94, 0.5], [0, 1.74, 0], KHAKI, { radius: 0.085 });
  box(body, [0.025, 0.72, 0.025], [0, 1.7, 0.262], 0x927d53);
  box(body, [0.76, 0.025, 0.025], [0, 1.99, 0.262], 0xc2aa76);
  for (const side of [-1, 1]) {
    box(body, [0.025, 0.31, 0.025], [side * 0.28, 1.48, 0.263], 0x9c875a, { rotation: [0, 0, side * 0.28] });
    box(body, [0.3, 0.13, 0.035], [side * 0.15, 2.08, -0.235], 0xc0a873, { rotation: [0, 0, side * 0.42] });
  }
  roundedBox(body, [0.86, 0.27, 0.46], [0, 1.25, 0], KHAKI_DARK, { radius: 0.05 });
  box(body, [0.98, 0.12, 0.53], [0, 1.28, 0], LEATHER);
  for (const x of [-0.36, -0.18, 0.18, 0.36]) {
    box(body, [0.045, 0.22, 0.035], [x, 1.31, -0.25], KHAKI_DARK);
    box(body, [0.045, 0.22, 0.035], [x, 1.31, 0.25], KHAKI_DARK);
  }
  roundedBox(body, [0.24, 0.3, 0.16], [-0.36, 1.12, 0.29], LEATHER, { radius: 0.035 });
  box(body, [0.17, 0.04, 0.17], [-0.36, 1.28, 0.29], 0x41484a);
  roundedBox(body, [0.2, 0.16, 0.055], [0, 1.28, -0.285], GOLD, { radius: 0.025, metalness: 0.45 });
  for (const side of [-1, 1]) {
    roundedBox(body, [0.3, 0.26, 0.035], [side * 0.24, 1.73, -0.265], 0xa58d5d, { radius: 0.025 });
    box(body, [0.32, 0.045, 0.045], [side * 0.24, 1.88, -0.27], KHAKI_DARK);
    sphere(body, 0.025, [side * 0.24, 1.84, -0.295], 0x5d5a48, { widthSegments: 6, heightSegments: 4 });
    box(body, [0.34, 0.075, 0.36], [side * 0.38, 2.15, 0], NAVY);
    sphere(body, 0.035, [side * 0.38, 2.2, -0.08], GOLD, { widthSegments: 6, heightSegments: 4 });
  }
  for (let y = 1.48; y < 2.05; y += 0.18) {
    sphere(body, 0.022, [0, y, -0.265], 0x4a4b42, { widthSegments: 6, heightSegments: 4 });
  }
  // Generic brass shield and name strip, intentionally not an official crest.
  sphere(body, 0.085, [-0.25, 1.98, -0.275], GOLD, { scale: [0.82, 1, 0.25], metalness: 0.45 });
  box(body, [0.25, 0.065, 0.035], [0.25, 1.98, -0.275], NAVY);
  box(body, [0.18, 0.018, 0.04], [0.25, 1.98, -0.3], 0xf2e5bd);

  if (typeof document !== 'undefined') {
    const local = hasLocalSignFonts();
    label(body, local ? 'පොලිස්\nPOLICE' : 'POLICE', [0.72, local ? 0.38 : 0.2], [0, 1.76, 0.262], {
      background: '#1d303d', foreground: '#fff7db', border: '#d5ad45', fontSize: local ? 42 : 52,
      fontFamily: local ? LOCAL_SIGN_FONT : 'Arial, sans-serif',
    });
  }

  // Belt equipment and shoulder radio make the silhouette readable from behind.
  const baton = new THREE.Group();
  baton.position.set(0.5, 1.29, 0.08);
  body.add(baton);
  cylinder(baton, [0.055], 0.75, [0.02, -0.33, 0], LEATHER, { segments: 8, rotation: [0, 0, -0.12] });
  cylinder(baton, [0.07], 0.16, [0, 0.04, 0], 0x303638, { segments: 8 });
  roundedBox(body, [0.18, 0.34, 0.14], [-0.43, 1.93, 0.18], NAVY, { radius: 0.035 });
  cylinder(body, [0.018], 0.31, [-0.43, 2.22, 0.18], LEATHER, { segments: 6, rotation: [0, 0, -0.15] });

  cylinder(body, [0.14], 0.18, [0, 2.23, 0], SKIN, { segments: 8, flatShading: false });
  const head = new THREE.Group();
  head.position.set(0, 2.22, 0);
  body.add(head);
  sphere(head, 0.35, [0, 0.31, 0], SKIN_LIGHT, {
    widthSegments: 14, heightSegments: 9, scale: [0.94, 1.08, 0.94], flatShading: false,
  });
  sphere(head, 0.25, [0, 0.13, 0.015], SKIN, { scale: [1.05, 0.72, 0.9], flatShading: false });
  roundedBox(head, [0.5, 0.18, 0.16], [0, 0.47, 0.2], 0x242421, { radius: 0.05 });
  for (const side of [-1, 1]) {
    sphere(head, 0.075, [side * 0.33, 0.3, 0], SKIN, { scale: [0.55, 1, 0.7], flatShading: false });
    sphere(head, 0.036, [side * 0.345, 0.3, -0.005], 0x865238, { scale: [0.35, 0.72, 0.45], flatShading: false });
    sphere(head, 0.057, [side * 0.12, 0.34, -0.315], 0xf4ebd8, { scale: [1, 0.8, 0.4], flatShading: false });
    sphere(head, 0.03, [side * 0.12, 0.335, -0.35], 0x1b2023, { flatShading: false });
    sphere(head, 0.009, [side * 0.115, 0.35, -0.37], 0xffffff, { widthSegments: 6, heightSegments: 4 });
    box(head, [0.13, 0.025, 0.025], [side * 0.12, 0.42, -0.31], 0x292421);
    roundedBox(head, [0.09, 0.19, 0.09], [side * 0.27, 0.43, -0.15], 0x242421, { radius: 0.025 });
  }
  sphere(head, 0.052, [0, 0.25, -0.35], SKIN, { scale: [0.75, 0.9, 0.65], flatShading: false });
  box(head, [0.17, 0.025, 0.025], [0, 0.14, -0.325], 0x6e3e32);
  cylinder(head, [0.36, 0.38], 0.22, [0, 0.62, 0.015], NAVY, { segments: 12 });
  cylinder(head, [0.375], 0.055, [0, 0.535, 0.015], 0x101d26, { segments: 12 });
  cylinder(head, [0.39], 0.075, [0, 0.73, 0.015], NAVY, { segments: 12 });
  box(head, [0.54, 0.018, 0.025], [0, 0.72, -0.31], 0x56636a);
  roundedBox(head, [0.54, 0.055, 0.35], [0, 0.52, -0.25], LEATHER, { radius: 0.025 });
  sphere(head, 0.075, [0, 0.62, -0.365], GOLD, { scale: [0.78, 1, 0.25], metalness: 0.45 });

  const left = makeArm(-1);
  const right = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  const pelvis = new THREE.Group();
  pelvis.add(leftLeg.hip, rightLeg.hip);
  visual.add(left.shoulder, right.shoulder, pelvis);
  visual.userData.joints = {
    body,
    head,
    pelvis,
    baton,
    leftArm: left.shoulder,
    rightArm: right.shoulder,
    leftElbow: left.elbow,
    rightElbow: right.elbow,
    leftWrist: left.wrist,
    rightWrist: right.wrist,
    leftLeg: leftLeg.hip,
    rightLeg: rightLeg.hip,
    leftKnee: leftLeg.knee,
    rightKnee: rightLeg.knee,
    leftAnkle: leftLeg.ankle,
    rightAnkle: rightLeg.ankle,
  };
  return visual;
}
