import * as THREE from 'three';
import { box, roundedBox, cylinder, sphere, torus } from './MeshKit.js';
import { batchArticulatedModel } from './StaticBatcher.js';

const SKIN = 0xb97850;
const SKIN_LIGHT = 0xc98a60;
const WHITE = 0xfffbec;
const BLUE = 0x172f63;
const HAIR = 0x171923;
const SHOE = 0x11141b;

function makeArm(side) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.5, 1.74, 0);
  sphere(shoulder, 0.17, [0, -0.03, 0], WHITE, { scale: [1, 1.05, 1], flatShading: false });
  roundedBox(shoulder, [0.29, 0.34, 0.34], [0, -0.15, 0], WHITE, { radius: 0.07 });
  box(shoulder, [0.3, 0.045, 0.35], [0, -0.32, 0], 0xe5e2d6);
  cylinder(shoulder, [0.105, 0.12], 0.23, [0, -0.34, 0], SKIN, { segments: 8, flatShading: false });
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.42, 0);
  sphere(elbow, 0.11, [0, 0, 0], SKIN, { flatShading: false });
  cylinder(elbow, [0.085, 0.105], 0.29, [0, -0.15, 0], SKIN_LIGHT, { segments: 8, flatShading: false });
  const wrist = new THREE.Group();
  wrist.position.set(0, -0.32, 0);
  cylinder(wrist, [0.073], 0.1, [0, 0, 0], SKIN, { segments: 8, flatShading: false });
  sphere(wrist, 0.115, [0, -0.09, -0.015], SKIN_LIGHT, { scale: [0.88, 1.12, 0.82], flatShading: false });
  sphere(wrist, 0.047, [-side * 0.085, -0.075, -0.025], SKIN, { flatShading: false });
  for (const x of [-0.04, 0, 0.04]) {
    box(wrist, [0.012, 0.085, 0.012], [x, -0.16, -0.055], 0x9d6245, { castShadow: false });
  }
  elbow.add(wrist);
  shoulder.add(elbow);
  return { shoulder, elbow, wrist };
}

function makeLeg(side) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.21, 1.04, 0);
  roundedBox(hip, [0.35, 0.39, 0.42], [0, -0.14, 0], BLUE, { radius: 0.055 });
  box(hip, [0.025, 0.25, 0.025], [side * 0.12, -0.14, -0.22], 0x34518b);
  cylinder(hip, [0.125, 0.14], 0.16, [0, -0.34, 0], SKIN, { segments: 8, flatShading: false });
  const knee = new THREE.Group();
  knee.position.set(0, -0.4, 0);
  sphere(knee, 0.125, [0, 0, 0], SKIN, { flatShading: false });
  cylinder(knee, [0.105, 0.125], 0.32, [0, -0.17, 0], SKIN_LIGHT, { segments: 8, flatShading: false });
  cylinder(knee, [0.112], 0.17, [0, -0.38, 0], WHITE, { segments: 8 });
  cylinder(knee, [0.114], 0.025, [0, -0.325, 0], BLUE, { segments: 8 });
  cylinder(knee, [0.114], 0.02, [0, -0.36, 0], 0x34518b, { segments: 8 });
  const ankle = new THREE.Group();
  ankle.position.set(0, -0.46, 0);
  roundedBox(ankle, [0.29, 0.19, 0.47], [0, -0.07, -0.1], SHOE, { radius: 0.045 });
  roundedBox(ankle, [0.3, 0.05, 0.49], [0, -0.16, -0.1], 0x080a0e, { radius: 0.018 });
  box(ankle, [0.2, 0.025, 0.22], [0, 0.005, -0.22], 0x3a414b);
  for (const z of [-0.13, -0.2, -0.27]) {
    box(ankle, [0.19, 0.018, 0.025], [0, 0.035, z], 0xd8d9d2, { rotation: [0, 0, z * 0.35] });
  }
  knee.add(ankle);
  hip.add(knee);
  return { hip, knee, ankle };
}

/** Original articulated Sri Lankan schoolboy made from lightweight local meshes. */
export function createSchoolboy() {
  const visual = new THREE.Group();
  visual.name = 'Detailed Sri Lankan schoolboy';
  visual.userData.detailLevel = 'enhanced-uniform-face-backpack-and-articulation';
  const body = new THREE.Group();
  visual.add(body);

  roundedBox(body, [0.88, 0.85, 0.47], [0, 1.49, 0], WHITE, { radius: 0.09 });
  box(body, [0.86, 0.045, 0.48], [0, 1.085, 0], 0xe6e3d8);
  roundedBox(body, [0.8, 0.36, 0.45], [0, 1.03, 0], BLUE, { radius: 0.06 });
  box(body, [0.82, 0.055, 0.47], [0, 1.18, 0], 0x243e73);
  roundedBox(body, [0.15, 0.11, 0.04], [0, 1.18, -0.25], 0x2e3542, { radius: 0.02 });
  box(body, [0.075, 0.055, 0.045], [0, 1.18, -0.28], 0xb8b9ae);
  box(body, [0.34, 0.12, 0.035], [-0.16, 1.87, -0.25], WHITE, { rotation: [0, 0, -0.38] });
  box(body, [0.34, 0.12, 0.035], [0.16, 1.87, -0.25], WHITE, { rotation: [0, 0, 0.38] });
  box(body, [0.12, 0.21, 0.035], [0, 1.81, -0.255], 0xf0eee2, { rotation: [0, 0, 0.04] });
  roundedBox(body, [0.23, 0.22, 0.025], [0.23, 1.51, -0.25], 0xf0eee2, { radius: 0.025 });
  box(body, [0.25, 0.04, 0.035], [0.23, 1.63, -0.265], 0xd8d6cc);
  box(body, [0.11, 0.13, 0.03], [-0.27, 1.62, -0.255], 0xf4b942);
  box(body, [0.07, 0.07, 0.035], [-0.27, 1.62, -0.275], 0x1f8a70);
  for (let y = 1.28; y < 1.75; y += 0.17) {
    sphere(body, 0.022, [0, y, -0.25], 0x3d4654, { widthSegments: 6, heightSegments: 4 });
  }

  cylinder(body, [0.13], 0.2, [0, 1.94, 0], SKIN, { segments: 8, flatShading: false });
  const head = new THREE.Group();
  head.position.set(0, 1.94, 0);
  body.add(head);
  sphere(head, 0.38, [0, 0.22, 0], SKIN_LIGHT, {
    widthSegments: 14, heightSegments: 9, scale: [0.95, 1.06, 0.94], flatShading: false,
  });
  sphere(head, 0.39, [0, 0.38, 0.035], HAIR, {
    widthSegments: 12, heightSegments: 8, scale: [0.97, 0.68, 0.95],
  });
  roundedBox(head, [0.64, 0.28, 0.24], [0, 0.31, 0.22], HAIR, { radius: 0.08 });
  box(head, [0.42, 0.12, 0.13], [-0.1, 0.41, -0.28], HAIR, { rotation: [0.12, 0, -0.12] });
  for (const side of [-1, 1]) {
    sphere(head, 0.08, [side * 0.36, 0.21, 0], SKIN, { scale: [0.55, 1, 0.7], flatShading: false });
    sphere(head, 0.04, [side * 0.375, 0.21, -0.005], 0x9f6247, { scale: [0.35, 0.7, 0.45], flatShading: false });
    sphere(head, 0.068, [side * 0.13, 0.24, -0.34], 0xfff8e8, {
      scale: [1.05, 0.82, 0.38], flatShading: false,
    });
    sphere(head, 0.036, [side * 0.13, 0.235, -0.375], 0x20202a, {
      scale: [0.85, 1.1, 0.42], flatShading: false,
    });
    sphere(head, 0.012, [side * 0.125, 0.255, -0.393], 0xffffff, { widthSegments: 6, heightSegments: 4 });
    box(head, [0.13, 0.025, 0.025], [side * 0.13, 0.34, -0.34], HAIR, { rotation: [0, 0, side * -0.08] });
    roundedBox(head, [0.12, 0.18, 0.1], [side * 0.29, 0.29, -0.18], HAIR, { radius: 0.035 });
  }
  sphere(head, 0.052, [0, 0.15, -0.38], 0xad6c4c, { scale: [0.75, 0.85, 0.7], flatShading: false });
  const smile = torus(head, 0.082, 0.013, [0, 0.07, -0.355], 0x71382f, { rotation: [0, Math.PI, Math.PI] });
  smile.scale.y = 0.48;

  const backpack = new THREE.Group();
  body.add(backpack);
  roundedBox(backpack, [0.75, 0.83, 0.35], [0, 1.5, 0.36], 0x8b3048, { radius: 0.1 });
  roundedBox(backpack, [0.58, 0.34, 0.13], [0, 1.3, 0.57], 0x176c68, { radius: 0.055 });
  box(backpack, [0.5, 0.04, 0.035], [0, 1.73, 0.55], 0xf4b942);
  box(backpack, [0.56, 0.025, 0.025], [0, 1.44, 0.65], 0xe4b46a);
  box(backpack, [0.04, 0.09, 0.035], [0.25, 1.42, 0.67], 0xf4b942);
  for (const side of [-1, 1]) {
    roundedBox(backpack, [0.18, 0.34, 0.25], [side * 0.4, 1.35, 0.38], 0x176c68, { radius: 0.045 });
    box(body, [0.12, 0.66, 0.07], [side * 0.36, 1.53, -0.24], 0x70283c, { rotation: [0, 0, side * 0.12] });
    box(body, [0.09, 0.54, 0.08], [side * 0.32, 1.52, 0.56], 0x70283c);
    for (const y of [1.35, 1.48, 1.61]) {
      box(body, [0.1, 0.018, 0.075], [side * 0.36, y, -0.28], 0xa94b5e, { castShadow: false });
    }
  }
  torus(backpack, 0.15, 0.032, [0, 1.96, 0.37], 0x70283c, { rotation: [Math.PI / 2, 0, 0] });

  const left = makeArm(-1);
  const right = makeArm(1);
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  visual.add(left.shoulder, right.shoulder, leftLeg.hip, rightLeg.hip);
  visual.userData.joints = {
    body,
    head,
    backpack,
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
  return batchArticulatedModel(visual);
}
