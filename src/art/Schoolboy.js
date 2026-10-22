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
    [0.28, -0.43], [0.33, -0.4], [0.37, -0.32], [0.39, -0.18],
    [0.4, -0.04], [0.43, 0.14], [0.41, 0.25], [0.37, 0.35],
    [0.3, 0.41], [0.22, 0.45], [0.16, 0.45],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  shirtGeometry = new THREE.LatheGeometry(profile, 28);
  shirtGeometry.scale(1, 1, 0.66);
  shirtGeometry.computeVertexNormals();
  return shirtGeometry;
}

const limbMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });

function limbGeometry(kind) {
  const arm = kind === 'arm';
  const length = arm ? 0.7 : 0.87;
  const joint = arm ? 0.36 : 0.41;
  const rings = arm ? 30 : 34;
  const sides = 22;
  const profile = arm
    ? [[0, 0.148], [0.18, 0.153], [0.37, 0.125], [0.52, 0.098], [0.78, 0.083], [1, 0.064]]
    : [[0, 0.178], [0.25, 0.165], [0.34, 0.118], [0.5, 0.108], [0.75, 0.09], [1, 0.096]];
  const radiusAt = (t) => {
    for (let index = 1; index < profile.length; index += 1) {
      if (t <= profile[index][0]) {
        const [previousT, previousR] = profile[index - 1];
        const [nextT, nextR] = profile[index];
        const blend = THREE.MathUtils.smoothstep(t, previousT, nextT);
        return THREE.MathUtils.lerp(previousR, nextR, blend);
      }
    }
    return profile[profile.length - 1][1];
  };
  const colorAt = (t) => {
    if (arm) return new THREE.Color(t < 0.35 ? WHITE : t < 0.39 ? 0xe5e2d6 : SKIN_LIGHT);
    if (t < 0.3) return new THREE.Color(BLUE);
    if (t > 0.81 && t < 0.86) return new THREE.Color(0x34518b);
    return new THREE.Color(t < 0.72 ? SKIN_LIGHT : WHITE);
  };
  const positions = [];
  const colors = [];
  const uvs = [];
  const skinIndices = [];
  const skinWeights = [];
  const indices = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    const distance = t * length;
    const radius = radiusAt(t);
    const color = colorAt(t);
    let first = 0;
    let second = 1;
    let blend = distance / joint;
    if (distance > joint) {
      first = 1;
      second = 2;
      blend = (distance - joint) / (length - joint);
    }
    blend = THREE.MathUtils.clamp(blend, 0, 1);
    for (let side = 0; side <= sides; side += 1) {
      const angle = side / sides * Math.PI * 2;
      const organic = 1 + Math.sin(angle * 3 + t * 4) * 0.012;
      positions.push(Math.cos(angle) * radius * organic, -distance, Math.sin(angle) * radius * (arm ? 0.88 : 0.94));
      colors.push(color.r, color.g, color.b);
      uvs.push(side / sides, t * 2);
      skinIndices.push(first, second, 0, 0);
      skinWeights.push(1 - blend, blend, 0, 0);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  if (arm) {
    // Close the sleeve above the first ring; an open tube reads as a missing
    // shoulder from the chase camera. The root-weighted fan bends with the arm.
    const center = positions.length / 3;
    const capColor = new THREE.Color(WHITE);
    positions.push(0, 0.105, 0);
    colors.push(capColor.r, capColor.g, capColor.b);
    uvs.push(0.5, 0);
    skinIndices.push(0, 1, 0, 0);
    skinWeights.push(1, 0, 0, 0);
    for (let side = 0; side < sides; side += 1) indices.push(center, side + 1, side);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.userData.shoulderCap = arm;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function continuousLimb(kind, side) {
  const arm = kind === 'arm';
  const root = new THREE.Bone();
  root.name = `${side < 0 ? 'Left' : 'Right'} ${arm ? 'shoulder' : 'hip'}`;
  root.position.set(side * (arm ? 0.47 : 0.2), arm ? 1.73 : 1.04, 0);
  const middle = new THREE.Bone();
  middle.name = arm ? 'Elbow' : 'Knee';
  middle.position.set(0, arm ? -0.36 : -0.41, 0);
  root.add(middle);
  const end = new THREE.Bone();
  end.name = arm ? 'Wrist' : 'Ankle';
  end.position.set(0, arm ? -0.34 : -0.46, 0);
  middle.add(end);
  const mesh = new THREE.SkinnedMesh(limbGeometry(kind), limbMaterial);
  mesh.name = `Continuous skinned ${kind}`;
  mesh.position.copy(root.position);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.continuousLimb = kind;
  mesh.userData.closedShoulder = arm;
  return { root, middle, end, mesh, bones: [root, middle, end] };
}

function makeArm(side) {
  const limb = continuousLimb('arm', side);
  const { root: shoulder, middle: elbow, end: wrist } = limb;
  sphere(wrist, 0.105, [0, -0.115, -0.015], SKIN_LIGHT, {
    scale: [0.82, 1.08, 0.72], widthSegments: 18, heightSegments: 12,
  });
  sphere(wrist, 0.045, [-side * 0.075, -0.1, -0.03], SKIN, {
    scale: [0.75, 1.2, 0.7], widthSegments: 14, heightSegments: 10,
  });
  for (const x of [-0.037, 0, 0.037]) {
    capsule(wrist, 0.013, 0.045, [x, -0.195, -0.035], 0xa96b4c, {
      radialSegments: 8, capSegments: 3,
    });
  }
  return { shoulder, elbow, wrist, mesh: limb.mesh, bones: limb.bones };
}

function makeLeg(side) {
  const limb = continuousLimb('leg', side);
  const { root: hip, middle: knee, end: ankle } = limb;
  sphere(ankle, 1, [0, -0.07, -0.1], SHOE, {
    scale: [0.15, 0.105, 0.25], widthSegments: 20, heightSegments: 14,
  });
  sphere(ankle, 1, [0, -0.145, -0.105], 0x080a0e, {
    scale: [0.155, 0.035, 0.255], widthSegments: 18, heightSegments: 10,
  });
  sphere(ankle, 1, [0, -0.025, -0.245], 0x343c47, {
    scale: [0.125, 0.045, 0.09], widthSegments: 16, heightSegments: 10,
  });
  for (const z of [-0.11, -0.17, -0.23]) {
    cylinder(ankle, [0.009], 0.17, [0, 0.02, z], 0xd8d9d2, {
      segments: 8, rotation: [0, 0, Math.PI / 2 + z * 0.3],
    });
  }
  return { hip, knee, ankle, mesh: limb.mesh, bones: limb.bones };
}

function bindLimb(visual, limb) {
  visual.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(limb.bones);
  limb.mesh.bind(skeleton, limb.mesh.matrixWorld);
}

/** Smooth articulated schoolboy with shared, lightweight organic geometry. */
export function createSchoolboy() {
  const visual = new THREE.Group();
  visual.name = 'Smooth articulated Sri Lankan schoolboy';
  visual.userData.detailLevel = 'continuous-skinned-limbs-organic-uniform';
  visual.userData.anatomy = 'continuous-skinned-limbs-lathe-torso-shaped-head';
  visual.userData.shoulders = 'closed-caps-with-rounded-deltoid-joins';
  const body = new THREE.Group();
  visual.add(body);

  const shirt = new THREE.Mesh(getShirtGeometry(), material(WHITE, { roughness: 0.86 }));
  shirt.position.set(0, 1.48, 0);
  body.add(shirt);
  for (const side of [-1, 1]) {
    sphere(body, 1, [side * 0.43, 1.68, 0], WHITE, {
      scale: [0.16, 0.17, 0.155], widthSegments: 22, heightSegments: 15,
    });
  }
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
    widthSegments: 28, heightSegments: 20, scale: [0.34, 0.38, 0.32], flatShading: false,
  });
  sphere(head, 1, [0, 0.075, -0.025], SKIN_LIGHT, {
    widthSegments: 22, heightSegments: 14, scale: [0.27, 0.19, 0.27], flatShading: false,
  });
  sphere(head, 1, [0, 0.42, 0.07], HAIR, {
    widthSegments: 24, heightSegments: 16, scale: [0.35, 0.24, 0.32], flatShading: false,
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
  sphere(backpack, 1, [0, 1.49, 0.35], 0x8b3048, { scale: [0.38, 0.44, 0.22], widthSegments: 26, heightSegments: 18 });
  sphere(backpack, 1, [0, 1.29, 0.54], 0x176c68, { scale: [0.29, 0.18, 0.1], widthSegments: 22, heightSegments: 14 });
  capsule(backpack, 0.018, 0.45, [0, 1.72, 0.54], 0xf4b942, {
    rotation: [0, 0, Math.PI / 2], radialSegments: 7, capSegments: 2,
  });
  capsule(backpack, 0.014, 0.5, [0, 1.42, 0.64], 0xe4b46a, {
    rotation: [0, 0, Math.PI / 2], radialSegments: 7, capSegments: 2,
  });
  for (const side of [-1, 1]) {
    sphere(backpack, 1, [side * 0.36, 1.34, 0.38], 0x176c68, { scale: [0.11, 0.18, 0.13], widthSegments: 18, heightSegments: 12 });
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
  visual.add(left.shoulder, right.shoulder, leftLeg.hip, rightLeg.hip,
    left.mesh, right.mesh, leftLeg.mesh, rightLeg.mesh);
  for (const limb of [left, right, leftLeg, rightLeg]) bindLimb(visual, limb);
  visual.userData.skinnedLimbs = [left.mesh, right.mesh, leftLeg.mesh, rightLeg.mesh];
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
