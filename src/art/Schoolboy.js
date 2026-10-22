import * as THREE from 'three';
import { capsule, cylinder, material, roundedBox, sphere, torus } from './MeshKit.js';
import { batchArticulatedModel } from './StaticBatcher.js';

const SKIN = 0xb97850;
const SKIN_LIGHT = 0xcb8b61;
const WHITE = 0xfffbec;
const BLUE = 0x172f63;
const HAIR = 0x171923;
const SHOE = 0x11141b;
let shirtGeometry;

function getShirtGeometry() {
  if (shirtGeometry) return shirtGeometry;
  const profile = [
    [0.29, -0.43], [0.36, -0.34], [0.4, -0.06], [0.43, 0.17],
    [0.37, 0.35], [0.25, 0.44], [0.16, 0.45],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  shirtGeometry = new THREE.LatheGeometry(profile, 16);
  shirtGeometry.scale(1, 1, 0.66);
  shirtGeometry.computeVertexNormals();
  return shirtGeometry;
}

function makeArm(side) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.47, 1.73, 0);
  capsule(shoulder, 0.155, 0.16, [0, -0.13, 0], WHITE, {
    scale: [1, 1, 0.9], radialSegments: 12, capSegments: 5,
  });
  cylinder(shoulder, [0.142], 0.035, [0, -0.3, 0], 0xe5e2d6, { segments: 12 });
  const elbow = new THREE.Group();
  elbow.position.set(0, -0.36, 0);
  sphere(elbow, 0.105, [0, 0, 0], SKIN, { scale: [0.95, 1, 0.9], flatShading: false });
  capsule(elbow, 0.088, 0.18, [0, -0.15, 0], SKIN_LIGHT, {
    scale: [0.94, 1, 0.88], radialSegments: 10, capSegments: 4,
  });
  const wrist = new THREE.Group();
  wrist.position.set(0, -0.34, 0);
  capsule(wrist, 0.073, 0.07, [0, -0.035, 0], SKIN, { radialSegments: 9, capSegments: 3 });
  sphere(wrist, 0.105, [0, -0.115, -0.015], SKIN_LIGHT, {
    scale: [0.82, 1.08, 0.72], flatShading: false,
  });
  sphere(wrist, 0.045, [-side * 0.075, -0.1, -0.03], SKIN, {
    scale: [0.75, 1.2, 0.7], flatShading: false,
  });
  for (const x of [-0.037, 0, 0.037]) {
    capsule(wrist, 0.013, 0.045, [x, -0.195, -0.035], 0xa96b4c, {
      radialSegments: 6, capSegments: 2,
    });
  }
  elbow.add(wrist);
  shoulder.add(elbow);
  return { shoulder, elbow, wrist };
}

function makeLeg(side) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.2, 1.04, 0);
  capsule(hip, 0.175, 0.13, [0, -0.13, 0], BLUE, {
    scale: [1, 1, 1.12], radialSegments: 12, capSegments: 4,
  });
  capsule(hip, 0.112, 0.15, [0, -0.3, 0], SKIN, {
    scale: [0.95, 1, 0.92], radialSegments: 10, capSegments: 4,
  });
  const knee = new THREE.Group();
  knee.position.set(0, -0.41, 0);
  sphere(knee, 0.11, [0, 0, -0.012], SKIN, { scale: [0.9, 1, 0.9], flatShading: false });
  capsule(knee, 0.098, 0.18, [0, -0.17, 0], SKIN_LIGHT, {
    scale: [0.94, 1, 0.9], radialSegments: 10, capSegments: 4,
  });
  cylinder(knee, [0.103], 0.16, [0, -0.36, 0], WHITE, { segments: 12 });
  cylinder(knee, [0.106], 0.022, [0, -0.305, 0], BLUE, { segments: 12 });
  cylinder(knee, [0.106], 0.018, [0, -0.345, 0], 0x34518b, { segments: 12 });
  const ankle = new THREE.Group();
  ankle.position.set(0, -0.46, 0);
  sphere(ankle, 1, [0, -0.07, -0.1], SHOE, {
    scale: [0.15, 0.105, 0.25], widthSegments: 12, heightSegments: 8, flatShading: false,
  });
  sphere(ankle, 1, [0, -0.145, -0.105], 0x080a0e, {
    scale: [0.155, 0.035, 0.255], widthSegments: 12, heightSegments: 6,
  });
  sphere(ankle, 1, [0, -0.025, -0.245], 0x343c47, {
    scale: [0.125, 0.045, 0.09], widthSegments: 10, heightSegments: 6,
  });
  for (const z of [-0.11, -0.17, -0.23]) {
    cylinder(ankle, [0.009], 0.17, [0, 0.02, z], 0xd8d9d2, {
      segments: 6, rotation: [0, 0, Math.PI / 2 + z * 0.3],
    });
  }
  knee.add(ankle);
  hip.add(knee);
  return { hip, knee, ankle };
}

/** Smooth articulated schoolboy with shared, lightweight organic geometry. */
export function createSchoolboy() {
  const visual = new THREE.Group();
  visual.name = 'Smooth articulated Sri Lankan schoolboy';
  visual.userData.detailLevel = 'organic-anatomy-layered-hair-rounded-uniform';
  visual.userData.anatomy = 'lathe-torso-capsule-limbs-shaped-head';
  const body = new THREE.Group();
  visual.add(body);

  const shirt = new THREE.Mesh(getShirtGeometry(), material(WHITE, { roughness: 0.86 }));
  shirt.position.set(0, 1.48, 0);
  body.add(shirt);
  sphere(body, 1, [0, 1.03, 0], BLUE, {
    scale: [0.37, 0.23, 0.25], widthSegments: 14, heightSegments: 9,
  });
  const belt = cylinder(body, [0.355], 0.05, [0, 1.16, 0], 0x243e73, { segments: 16 });
  belt.scale.z = 0.69;
  roundedBox(body, [0.14, 0.1, 0.035], [0, 1.16, -0.255], 0xb8b9ae, { radius: 0.025, segments: 2 });
  capsule(body, 0.018, 0.5, [0, 1.49, -0.27], 0xf0eee2, { radialSegments: 7, capSegments: 2 });
  for (const side of [-1, 1]) {
    sphere(body, 1, [side * 0.14, 1.82, -0.2], WHITE, {
      scale: [0.17, 0.065, 0.035], rotation: [0.15, 0, side * 0.38], widthSegments: 10, heightSegments: 6,
    });
  }
  sphere(body, 1, [0.22, 1.5, -0.255], 0xf0eee2, {
    scale: [0.125, 0.115, 0.022], widthSegments: 10, heightSegments: 7,
  });
  sphere(body, 0.055, [-0.25, 1.61, -0.27], 0xf4b942, { scale: [1, 1.15, 0.35] });
  sphere(body, 0.032, [-0.25, 1.61, -0.292], 0x1f8a70, { scale: [1, 1, 0.3] });
  for (let y = 1.3; y < 1.75; y += 0.15) {
    sphere(body, 0.019, [0, y, -0.287], 0x3d4654, { widthSegments: 7, heightSegments: 5 });
  }

  capsule(body, 0.11, 0.08, [0, 1.9, 0], SKIN, { radialSegments: 10, capSegments: 4 });
  const head = new THREE.Group();
  head.position.set(0, 1.91, 0);
  body.add(head);
  sphere(head, 1, [0, 0.23, 0], SKIN_LIGHT, {
    widthSegments: 18, heightSegments: 12, scale: [0.34, 0.38, 0.32], flatShading: false,
  });
  sphere(head, 1, [0, 0.075, -0.025], SKIN_LIGHT, {
    widthSegments: 14, heightSegments: 9, scale: [0.27, 0.19, 0.27], flatShading: false,
  });
  sphere(head, 1, [0, 0.42, 0.07], HAIR, {
    widthSegments: 16, heightSegments: 10, scale: [0.35, 0.24, 0.32], flatShading: false,
  });
  for (let index = 0; index < 6; index += 1) {
    const x = -0.25 + index * 0.1;
    sphere(head, 1, [x, 0.42 + (index % 3) * 0.025, -0.19 - (index % 2) * 0.025], HAIR, {
      scale: [0.095, 0.15 + (index % 2) * 0.025, 0.085],
      rotation: [0.25, 0, -0.35 + index * 0.12], widthSegments: 10, heightSegments: 7,
    });
  }
  for (const side of [-1, 1]) {
    sphere(head, 1, [side * 0.335, 0.21, 0], SKIN, {
      scale: [0.045, 0.08, 0.055], flatShading: false,
    });
    sphere(head, 1, [side * 0.35, 0.21, -0.005], 0x9f6247, {
      scale: [0.018, 0.045, 0.028], flatShading: false,
    });
    capsule(head, 0.035, 0.11, [side * 0.29, 0.27, -0.13], HAIR, {
      rotation: [0.2, 0, side * 0.12], radialSegments: 8, capSegments: 3,
    });
    sphere(head, 1, [side * 0.125, 0.24, -0.303], 0xfff8e8, {
      scale: [0.066, 0.047, 0.026], widthSegments: 12, heightSegments: 8, flatShading: false,
    });
    sphere(head, 1, [side * 0.125, 0.235, -0.327], 0x20202a, {
      scale: [0.029, 0.035, 0.015], widthSegments: 10, heightSegments: 7, flatShading: false,
    });
    sphere(head, 0.011, [side * 0.12, 0.25, -0.341], 0xffffff, { widthSegments: 6, heightSegments: 4 });
    capsule(head, 0.011, 0.085, [side * 0.125, 0.32, -0.302], HAIR, {
      rotation: [0, 0, Math.PI / 2 + side * 0.09], radialSegments: 6, capSegments: 2,
    });
  }
  sphere(head, 1, [0, 0.155, -0.325], 0xad6c4c, {
    scale: [0.043, 0.061, 0.052], flatShading: false,
  });
  const smile = torus(head, 0.073, 0.011, [0, 0.065, -0.296], 0x71382f, { rotation: [0, Math.PI, Math.PI] });
  smile.scale.y = 0.45;

  const backpack = new THREE.Group();
  body.add(backpack);
  roundedBox(backpack, [0.72, 0.8, 0.34], [0, 1.49, 0.35], 0x8b3048, { radius: 0.12, segments: 3 });
  roundedBox(backpack, [0.56, 0.32, 0.13], [0, 1.29, 0.56], 0x176c68, { radius: 0.065, segments: 3 });
  capsule(backpack, 0.018, 0.45, [0, 1.72, 0.54], 0xf4b942, {
    rotation: [0, 0, Math.PI / 2], radialSegments: 7, capSegments: 2,
  });
  capsule(backpack, 0.014, 0.5, [0, 1.42, 0.64], 0xe4b46a, {
    rotation: [0, 0, Math.PI / 2], radialSegments: 7, capSegments: 2,
  });
  for (const side of [-1, 1]) {
    roundedBox(backpack, [0.17, 0.32, 0.24], [side * 0.39, 1.34, 0.37], 0x176c68, { radius: 0.06, segments: 2 });
    capsule(body, 0.048, 0.49, [side * 0.34, 1.51, -0.225], 0x70283c, {
      rotation: [0, 0, side * 0.12], radialSegments: 8, capSegments: 3,
    });
    capsule(body, 0.043, 0.45, [side * 0.31, 1.51, 0.52], 0x70283c, { radialSegments: 8, capSegments: 3 });
  }
  torus(backpack, 0.14, 0.027, [0, 1.94, 0.36], 0x70283c, { rotation: [Math.PI / 2, 0, 0] });

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
