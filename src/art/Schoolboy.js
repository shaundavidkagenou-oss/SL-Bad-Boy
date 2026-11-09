import * as THREE from 'three';
import { box, capsule, cylinder, material, roundedBox, sphere, torus } from './MeshKit.js';
import {
  buttonRow, collar, detailedBrow, detailedEar, detailedEye, detailedHand,
  detailedMouth, detailedNose, seam,
} from './DetailKit.js';
import { batchArticulatedModel } from './StaticBatcher.js';

const SKIN = 0xb97850;
const PAL_POLICE_TAB = () => 0x6f6244;
const SKIN_LIGHT = 0xcb8b61;
const WHITE = 0xfffbec;
const BLUE = 0x172f63;
const HAIR = 0x171923;
const SHOE = 0x11141b;
let shirtGeometry;
let shirtGeometryKey = '';
const SHIRT_PROFILE = [
  [0.232, -0.40], [0.238, -0.33], [0.216, -0.20], [0.205, -0.06],
  [0.228, 0.06], [0.262, 0.17], [0.284, 0.27], [0.272, 0.345],
  [0.216, 0.405], [0.14, 0.44], [0.105, 0.44],
];
const SHIRT_BASE_Y = 1.545;
const SHIRT_DEPTH = 0.74;
/** Z of the shirt surface at an absolute body height, so trim never floats. */
function shirtFront(yAbs, offset = 0.006) {
  const y = THREE.MathUtils.clamp(yAbs - SHIRT_BASE_Y, -0.4, 0.44);
  for (let index = 1; index < SHIRT_PROFILE.length; index += 1) {
    const [r0, y0] = SHIRT_PROFILE[index - 1];
    const [r1, y1] = SHIRT_PROFILE[index];
    if (y <= y1) {
      const t = THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1);
      return -(THREE.MathUtils.lerp(r0, r1, t) * SHIRT_DEPTH + offset);
    }
  }
  return -(SHIRT_PROFILE[SHIRT_PROFILE.length - 1][0] * SHIRT_DEPTH + offset);
}
const limbGeometryCache = new Map();

function getShirtGeometry(palette) {
  // A lathe torso with real anatomy: broad deltoid line, defined chest, a
  // tapered waist and a seat, rather than a single extruded box.
  const key = `${palette.outfit}:${palette.build || 'athletic'}`;
  if (shirtGeometry && shirtGeometryKey === key) return shirtGeometry;
  const profile = SHIRT_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y));
  shirtGeometry = new THREE.LatheGeometry(profile, 30);
  shirtGeometry.scale(1, 1, SHIRT_DEPTH);
  shirtGeometry.computeVertexNormals();
  shirtGeometryKey = key;
  return shirtGeometry;
}

const limbMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });

function limbGeometry(kind, palette = {}) {
  const arm = kind === 'arm';
  const shirt = palette.shirt ?? WHITE;
  const shorts = palette.shorts ?? BLUE;
  const skin = palette.skin ?? SKIN;
  const skinLight = palette.skinLight ?? SKIN_LIGHT;
  const cacheKey = [kind, shirt, shorts, skin, skinLight, palette.outfit || 'uniform', palette.accent || 0].join(':');
  if (limbGeometryCache.has(cacheKey)) return limbGeometryCache.get(cacheKey);
  const jacket = palette.outfit === 'jacket';
  const length = arm ? 0.66 : 1.09;
  const joint = arm ? 0.34 : 0.56;
  const rings = arm ? 30 : 34;
  const sides = 24;
  // Biceps/forearm and quad/calf silhouettes replace the old straight tubes.
  const profile = arm
    ? [[0, 0.104], [0.14, 0.112], [0.3, 0.102], [0.42, 0.083], [0.55, 0.075], [0.74, 0.067], [0.9, 0.058], [1, 0.045]]
    : [[0, 0.134], [0.18, 0.129], [0.31, 0.110], [0.42, 0.095], [0.5, 0.085], [0.62, 0.092], [0.76, 0.080], [0.9, 0.062], [1, 0.066]];
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
    if (arm) {
      const sleeveEnd = jacket ? 0.78 : palette.sleeve === 'long' ? 1.02 : 0.34;
      const trim = jacket ? (palette.accent ?? 0xe5e2d6) : 0xf0ecdd;
      if (t < sleeveEnd) return new THREE.Color(shirt);
      if (t < sleeveEnd + 0.035) return new THREE.Color(trim);
      return new THREE.Color(t < 0.84 ? skin : skinLight);
    }
    if (palette.trousers) {
      if (t < 0.955) return new THREE.Color(palette.trousers);
      return new THREE.Color(palette.trouserCuff ?? 0x2b2a24);
    }
    if (t < 0.22) return new THREE.Color(shorts);
    if (t > 0.82) return new THREE.Color(WHITE);
    return new THREE.Color(t < 0.78 ? skin : skinLight);
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
    const capColor = new THREE.Color(shirt);
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
  limbGeometryCache.set(cacheKey, geometry);
  return geometry;
}

function continuousLimb(kind, side, palette = {}) {
  const arm = kind === 'arm';
  const root = new THREE.Bone();
  root.name = `${side < 0 ? 'Left' : 'Right'} ${arm ? 'shoulder' : 'hip'}`;
  root.position.set(side * (arm ? 0.285 : 0.122), arm ? 1.82 : 1.19, 0);
  const middle = new THREE.Bone();
  middle.name = arm ? 'Elbow' : 'Knee';
  middle.position.set(0, arm ? -0.34 : -0.56, 0);
  root.add(middle);
  const end = new THREE.Bone();
  end.name = arm ? 'Wrist' : 'Ankle';
  end.position.set(0, arm ? -0.32 : -0.53, 0);
  middle.add(end);
  const mesh = new THREE.SkinnedMesh(limbGeometry(kind, palette), limbMaterial);
  mesh.name = `Continuous skinned ${kind}`;
  mesh.position.copy(root.position);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.continuousLimb = kind;
  mesh.userData.closedShoulder = arm;
  return { root, middle, end, mesh, bones: [root, middle, end] };
}

function makeArm(side, palette) {
  const limb = continuousLimb('arm', side, palette);
  const { root: shoulder, middle: elbow, end: wrist } = limb;
  const jacket = palette.outfit === 'jacket';
  const skin = palette.skin ?? SKIN;
  const skinLight = palette.skinLight ?? SKIN_LIGHT;
  const sleeveEnd = jacket ? 0.78 : 0.34;
  const longSleeve = jacket || palette.sleeve === 'long';
  const sleeveColor = longSleeve ? palette.shirt : skin;
  const forearmColor = longSleeve ? palette.shirt : skinLight;
  // Deltoid, biceps and forearm definition sit on top of the skinned tube.
  sphere(shoulder, 0.1, [0, -0.055, 0], palette.shirt, {
    scale: [1.02, 0.98, 0.94], widthSegments: 16, heightSegments: 10, roughness: 0.9,
  });
  sphere(shoulder, 0.074, [side * 0.008, -0.17, -0.012], palette.shirt, {
    scale: [0.9, 1.2, 0.86], widthSegments: 12, heightSegments: 8, roughness: 0.9,
  });
  cylinder(shoulder, [0.098], 0.038, [0, -0.225, 0], longSleeve ? palette.shirt : 0xf3efe0, {
    segments: 14, scale: [1, 1, 0.9], roughness: 0.9,
  });
  if (jacket) {
    capsule(shoulder, 0.012, 0.28, [0, -0.2, -0.115], palette.accent, {
      radialSegments: 5, capSegments: 2,
    });
    for (let index = 0; index < 3; index += 1) {
      sphere(elbow, 0.013, [side * 0.02, -0.18 - index * 0.09, -0.075], 0xd9d4c4, {
        widthSegments: 6, heightSegments: 4, roughness: 0.5,
      });
    }
  }
  sphere(elbow, 0.058, [0, 0.012, -0.008], sleeveColor, {
    scale: [0.95, 0.95, 1], widthSegments: 12, heightSegments: 8, roughness: 0.72,
  });
  sphere(elbow, 0.062, [side * 0.004, -0.15, -0.01], forearmColor, {
    scale: [0.92, 1.5, 0.88], widthSegments: 12, heightSegments: 8, roughness: 0.72,
  });
  cylinder(wrist, [0.056], 0.05, [0, 0.008, 0], longSleeve ? palette.shirt : skin, {
    segments: 12, scale: [1, 1, 0.9], roughness: 0.72,
  });
  if (palette.sleeve === 'long') {
    cylinder(wrist, [0.086], 0.045, [0, -0.02, 0], palette.trouserCuff ?? 0x2a2822, {
      segments: 12, roughness: 0.6,
    });
  } else if (palette.accessories?.includes('watch')) {
    cylinder(wrist, [0.086], 0.05, [0, -0.025, 0], 0x2c333b, { segments: 12 });
    cylinder(wrist, [0.09], 0.012, [0, -0.004, 0], 0xc9ccd0, {
      segments: 12, metalness: 0.5, roughness: 0.35,
    });
  } else {
    cylinder(wrist, [0.082], 0.035, [0, -0.018, 0], 0xb98c66, { segments: 12, roughness: 0.8 });
  }
  detailedHand(wrist, side, {
    y: -0.05, z: -0.012, scale: 0.66, skin, skinLight: palette.skinLight ?? SKIN_LIGHT,
    curl: 0.95,
  });
  if (palette.accessories?.includes('wristbands')) {
    capsule(wrist, 0.079, 0.03, [0, -0.012, 0], palette.accent, {
      radialSegments: 10, capSegments: 2,
    });
  }
  return { shoulder, elbow, wrist, mesh: limb.mesh, bones: limb.bones };
}

function makeLeg(side, palette) {
  const limb = continuousLimb('leg', side, palette);
  const { root: hip, middle: knee, end: ankle } = limb;
  const skin = palette.skin ?? SKIN;
  const skinLight = palette.skinLight ?? SKIN_LIGHT;
  const shoe = palette.shoe ?? SHOE;
  const trousers = palette.trousers;
  const hipColor = trousers ?? palette.shorts;
  const kneeColor = trousers ?? skinLight;
  const calfColor = trousers ?? skin;
  if (trousers) {
    // Pressed trousers over a short black boot.
    cylinder(hip, [0.185], 0.08, [0, -0.07, 0], hipColor, {
      segments: 14, scale: [1, 1, 0.95], roughness: 0.9,
    });
    box(hip, [0.008, 0.3, 0.012], [0, -0.2, -0.1], 0x51482f);
    sphere(knee, 0.072, [0, -0.012, -0.038], kneeColor, {
      scale: [0.9, 0.84, 0.62], widthSegments: 12, heightSegments: 8, roughness: 0.9,
    });
    sphere(knee, 0.1, [0, -0.24, 0.012], calfColor, {
      scale: [0.86, 1.6, 0.98], widthSegments: 12, heightSegments: 8, roughness: 0.9,
    });
    roundedBox(ankle, [0.155, 0.24, 0.17], [0, 0.05, 0.0], 0x16171a, {
      radius: 0.03, segments: 2, roughness: 0.45,
    });
    roundedBox(ankle, [0.165, 0.1, 0.29], [0, -0.1, -0.065], 0x101114, {
      radius: 0.03, segments: 2, roughness: 0.4,
    });
    roundedBox(ankle, [0.175, 0.035, 0.31], [0, -0.155, -0.06], 0x050506, {
      radius: 0.012, segments: 2, roughness: 0.55,
    });
    for (let index = 0; index < 3; index += 1) {
      cylinder(ankle, [0.008], 0.14, [0, 0.02 - index * 0.05, -0.19], 0x3a3d40, {
        segments: 6, rotation: [0, 0, Math.PI / 2], roughness: 0.5,
      });
    }
    return { hip, knee, ankle, mesh: limb.mesh, bones: limb.bones };
  }
  // Shorts hem, kneecap, calf and a detailed lace-up shoe.
  cylinder(hip, [0.196], 0.075, [0, -0.075, 0], hipColor, {
    segments: 14, scale: [1, 1, 0.95], roughness: 0.9,
  });
  sphere(hip, 0.12, [side * 0.012, -0.16, -0.02], hipColor, {
    scale: [0.95, 1.2, 0.92], widthSegments: 12, heightSegments: 8, roughness: 0.9,
  });
  sphere(knee, 0.072, [0, -0.012, -0.038], kneeColor, {
    scale: [0.9, 0.84, 0.62], widthSegments: 12, heightSegments: 8, roughness: 0.72,
  });
  sphere(knee, 0.1, [0, -0.24, 0.012], calfColor, {
    scale: [0.86, 1.6, 0.98], widthSegments: 12, heightSegments: 8, roughness: 0.72,
  });
  // Socks with two school-uniform stripes.
  cylinder(ankle, [0.098, 0.086], 0.17, [0, 0.055, 0], 0xf2eee1, {
    segments: 12, roughness: 0.9,
  });
  for (const [offset, color] of [[0.09, palette.accent ?? 0x28406e], [0.048, 0xf2eee1], [0.012, palette.accent ?? 0x28406e]]) {
    cylinder(ankle, [0.099], 0.018, [0, offset, 0], color, { segments: 12, roughness: 0.9 });
  }
  sphere(ankle, 1, [0, -0.078, -0.105], shoe, {
    scale: [0.152, 0.106, 0.255], widthSegments: 20, heightSegments: 14, roughness: 0.55,
  });
  sphere(ankle, 1, [0, -0.036, -0.195], shoe, {
    scale: [0.132, 0.072, 0.145], widthSegments: 16, heightSegments: 10, roughness: 0.5,
  });
  sphere(ankle, 1, [0, -0.152, -0.105], 0x080a0e, {
    scale: [0.158, 0.034, 0.262], widthSegments: 18, heightSegments: 10, roughness: 0.6,
  });
  sphere(ankle, 1, [0, -0.162, -0.105], 0x1c2026, {
    scale: [0.162, 0.016, 0.268], widthSegments: 16, heightSegments: 8, roughness: 0.7,
  });
  sphere(ankle, 1, [0, -0.028, -0.246], 0x343c47, {
    scale: [0.121, 0.046, 0.088], widthSegments: 16, heightSegments: 10, roughness: 0.5,
  });
  sphere(ankle, 1, [0, -0.062, -0.17], 0xe8e4d6, {
    scale: [0.118, 0.045, 0.075], widthSegments: 14, heightSegments: 8, roughness: 0.6,
  });
  for (const z of [-0.11, -0.17, -0.23]) {
    cylinder(ankle, [0.009], 0.17, [0, -0.012, z], 0xd8d9d2, {
      segments: 8, rotation: [0, 0, Math.PI / 2 + z * 0.3],
    });
  }
  for (const x of [-0.04, 0.04]) {
    cylinder(ankle, [0.008], 0.032, [x, -0.005, -0.28], 0xbfc5c7, {
      segments: 6, rotation: [Math.PI / 2, 0, 0],
    });
  }
  capsule(ankle, 0.012, 0.1, [0, -0.045, 0.14], 0x2a2f36, {
    rotation: [0, 0, Math.PI / 2], radialSegments: 6, capSegments: 2, roughness: 0.8,
  });
  sphere(ankle, 1, [0, -0.02, 0.055], shoe, {
    scale: [0.132, 0.11, 0.09], widthSegments: 14, heightSegments: 8, roughness: 0.55,
  });
  return { hip, knee, ankle, mesh: limb.mesh, bones: limb.bones };
}

function bindLimb(visual, limb) {
  visual.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(limb.bones);
  limb.mesh.bind(skeleton, limb.mesh.matrixWorld);
}

function buildHead(head, palette) {
  const skin = palette.skin ?? SKIN;
  const skinLight = palette.skinLight ?? SKIN_LIGHT;
  const shadow = palette.skinShadow ?? 0x8f5a3e;

  // Face parts sit on the sculpted mask surface rather than floating in front of it.
  const faceZ = (x, y) => {
    const nx = x / 0.30;
    const ny = (y - 0.155) / 0.255;
    return -0.03 - 0.30 * Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
  };
  // Skull, brow, cheek and jaw volumes blend into one readable silhouette.
  sphere(head, 1, [0, 0.245, 0.005], skinLight, {
    widthSegments: 26, heightSegments: 18, scale: [0.335, 0.372, 0.325], roughness: 0.7,
  });
  sphere(head, 1, [0, 0.155, -0.03], skinLight, {
    widthSegments: 22, heightSegments: 14, scale: [0.30, 0.255, 0.30], roughness: 0.7,
  });
  sphere(head, 1, [0, 0.085, -0.05], skin, {
    widthSegments: 20, heightSegments: 14, scale: [0.215, 0.16, 0.265], roughness: 0.72,
  });
  sphere(head, 1, [0, 0.028, -0.13], skin, {
    widthSegments: 18, heightSegments: 12, scale: [0.175, 0.10, 0.165], rotation: [0.24, 0, 0], roughness: 0.72,
  });
  for (const side of [-1, 1]) {
    sphere(head, 1, [side * 0.16, 0.2, -0.175], skinLight, {
      widthSegments: 12, heightSegments: 9, scale: [0.105, 0.075, 0.085], roughness: 0.7,
    });
    sphere(head, 1, [side * 0.29, 0.25, -0.02], skin, {
      widthSegments: 10, heightSegments: 8, scale: [0.07, 0.1, 0.09], roughness: 0.72,
    });
  }
  sphere(head, 0.05, [0, 0.115, -0.075], skin, {
    scale: [1.2, 0.9, 0.8], widthSegments: 10, heightSegments: 7, roughness: 0.8,
  });
  for (const side of [-1, 1]) {
    capsule(head, 0.022, 0.105, [side * 0.068, -0.03, -0.075], skin, {
      rotation: [0.22, 0, side * 0.42], radialSegments: 7, capSegments: 2, roughness: 0.75,
    });
    detailedEye(head, side, {
      y: 0.248, z: faceZ(0.098, 0.248) + 0.012, scale: 0.84, skin, shadow, lidCover: 0.56,
      iris: palette.eyeColor ?? 0x4a2f1d,
    });
    detailedBrow(head, side, {
      y: 0.338, z: faceZ(0.098, 0.338) - 0.006, color: palette.hair ?? HAIR, angle: 0.08,
    });
    detailedEar(head, side, { y: 0.225, z: -0.012, skin, inner: 0xa8694a, scale: 0.86 });
  }
  detailedNose(head, { y: 0.185, z: faceZ(0, 0.185) + 0.004, skin, skinLight, shadow });
  detailedMouth(head, { y: 0.074, z: faceZ(0, 0.074) + 0.004, lip: palette.lip ?? 0x8f4a3d, lipDark: 0x6f332b });

  // Hair: dense cap, faded temples, swept fringe strands and sideburns.
  const hair = palette.hair ?? HAIR;
  const style = palette.hairStyle || 'crop';
  sphere(head, 1, [0, 0.438, 0.055], hair, {
    widthSegments: 24, heightSegments: 16,
    scale: [0.345, style === 'fade' ? 0.115 : 0.20, 0.325], roughness: 0.92,
  });
  sphere(head, 1, [0, 0.335, 0.13], hair, {
    widthSegments: 20, heightSegments: 14, scale: [0.315, 0.235, 0.235], roughness: 0.92,
  });
  const fringeCount = palette.capStyle === 'peaked' ? 0 : style === 'curly' ? 11 : style === 'fade' ? 5 : 8;
  for (let index = 0; index < fringeCount; index += 1) {
    const centered = index - (fringeCount - 1) / 2;
    const x = centered * (style === 'curly' ? 0.062 : 0.074);
    const curl = style === 'curly' ? 0.03 : 0;
    sphere(head, 1, [x, 0.445 + (index % 3) * 0.014 + curl, -0.176 - (index % 2) * 0.018], hair, {
      scale: [0.082 + curl, 0.112 + (index % 2) * 0.02 + curl, 0.085 + curl],
      rotation: [0.32, 0, (style === 'side' ? -0.7 : -0.3) + index * 0.14],
      widthSegments: 10, heightSegments: 7, roughness: 0.92,
    });
  }
  for (const side of [-1, 1]) {
    if (palette.capStyle === 'peaked') break;
    capsule(head, 0.045, 0.13, [side * 0.295, 0.32, -0.115], hair, {
      rotation: [0.26, 0, side * 0.16], radialSegments: 8, capSegments: 3, roughness: 0.92,
    });
    capsule(head, 0.03, 0.10, [side * 0.323, 0.205, -0.055], hair, {
      rotation: [0.05, 0, side * 0.1], radialSegments: 7, capSegments: 2, roughness: 0.92,
    });
  }
  if (style === 'long') {
    sphere(head, 1, [0, 0.19, 0.185], hair, {
      scale: [0.30, 0.37, 0.16], widthSegments: 18, heightSegments: 12, roughness: 0.92,
    });
  }
  if (palette.capStyle === 'peaked') {
    // Sri Lanka Police peaked cap: stiff black crown, black band, lacquered peak and badge.
    const capBlack = palette.cap ?? 0x141518;
    const band = 0x0a0b0d;
    cylinder(head, [0.342, 0.348], 0.085, [0, 0.405, 0.01], band, { segments: 28, roughness: 0.5 });
    cylinder(head, [0.348, 0.40], 0.155, [0, 0.525, 0.01], capBlack, {
      segments: 28, roughness: 0.45, scale: [1, 1, 1.03],
    });
    sphere(head, 1, [0, 0.60, 0.01], capBlack, {
      scale: [0.402, 0.045, 0.414], widthSegments: 28, heightSegments: 10, roughness: 0.42,
    });
    // Black lacquered peak, raked forward and slightly wider than the band.
    const peak = cylinder(head, [0.315], 0.03, [0, 0.352, -0.2], 0x08090b, {
      segments: 26, scale: [1.16, 1, 1.06], roughness: 0.22, metalness: 0.2,
    });
    peak.rotation.x = 0.2;
    roundedBox(head, [0.13, 0.09, 0.022], [0, 0.415, -0.335], 0xb9bcc0, {
      radius: 0.03, metalness: 0.55, roughness: 0.3,
    });
    sphere(head, 0.032, [0, 0.415, -0.352], 0x8f2f2a, { scale: [1, 1.15, 0.35], roughness: 0.4 });
    for (const side of [-1, 1]) {
      box(head, [0.026, 0.05, 0.026], [side * 0.348, 0.44, 0.0], 0xb9bcc0, {
        metalness: 0.5, roughness: 0.35,
      });
    }
    // Short regulation haircut under the cap and a clipped moustache.
    sphere(head, 1, [0, 0.33, 0.02], palette.hair ?? HAIR, {
      scale: [0.33, 0.13, 0.31], widthSegments: 20, heightSegments: 12, roughness: 0.95,
    });
    for (const side of [-1, 1]) {
      capsule(head, 0.026, 0.075, [side * 0.30, 0.21, -0.05], palette.hair ?? HAIR, {
        rotation: [0, 0, side * 0.1], radialSegments: 6, capSegments: 2, roughness: 0.95,
      });
      capsule(head, 0.017, 0.062, [side * 0.03, 0.026, faceZ(0.03, 0.03) - 0.004], palette.hair ?? HAIR, {
        rotation: [0, 0, Math.PI / 2 + side * 0.24], radialSegments: 6, capSegments: 2, roughness: 0.95,
      });
    }
  }
  if (palette.accessories?.includes('cap')) {
    sphere(head, 1, [0, 0.505, 0.03], palette.cap ?? palette.shirt, {
      scale: [0.35, 0.17, 0.33], widthSegments: 20, heightSegments: 12, roughness: 0.8,
    });
    roundedBox(head, [0.42, 0.042, 0.24], [0, 0.43, -0.255], palette.accent, {
      radius: 0.02, roughness: 0.8,
    });
  }
  if (palette.accessories?.includes('headband')) {
    capsule(head, 0.028, 0.48, [0, 0.36, -0.25], palette.accent, {
      rotation: [0, 0, Math.PI / 2], radialSegments: 8, capSegments: 2,
    });
  }
  if (palette.accessories?.includes('glasses')) {
    for (const side of [-1, 1]) {
      torus(head, 0.072, 0.011, [side * 0.105, 0.245, -0.33], 0x20252e, { arc: Math.PI * 2 });
      box(head, [0.006, 0.006, 0.075], [side * 0.17, 0.25, -0.27], 0x20252e);
    }
    capsule(head, 0.008, 0.06, [0, 0.245, -0.335], 0x20252e, {
      rotation: [0, 0, Math.PI / 2], radialSegments: 6, capSegments: 2,
    });
  }
}

function buildBackpack(body, palette) {
  const backpack = new THREE.Group();
  backpack.name = 'Animated school backpack';
  body.add(backpack);
  const bagColor = palette.backpack ?? 0x8b3048;
  const accent = palette.accent ?? 0x176c68;
  const strap = palette.id === 'schoolboy' ? 0x70283c : bagColor;

  if (palette.style === 'police') return { backpack: null };

  if (palette.accessories?.includes('satchel')) {
    sphere(backpack, 1, [0.215, 1.22, 0.24], bagColor, {
      scale: [0.155, 0.20, 0.10], widthSegments: 22, heightSegments: 14, roughness: 0.85,
    });
    sphere(backpack, 1, [0.215, 1.25, 0.335], accent, {
      scale: [0.13, 0.13, 0.03], widthSegments: 18, heightSegments: 10, roughness: 0.8,
    });
    roundedBox(backpack, [0.06, 0.04, 0.02], [0.215, 1.20, 0.345], 0xd9b45e, { radius: 0.008 });
    capsule(body, 0.028, 0.56, [0, 1.52, -0.155], bagColor, {
      rotation: [0, 0, -0.55], radialSegments: 8, capSegments: 3,
    });
    capsule(backpack, 0.011, 0.22, [0.215, 1.28, 0.34], accent, {
      rotation: [0, 0, Math.PI / 2], radialSegments: 7, capSegments: 2,
    });
    return backpack;
  }

  // Main body with rounded shell, front pocket and side bottle sleeve.
  sphere(backpack, 1, [0, 1.585, 0.255], bagColor, {
    scale: [0.265, 0.315, 0.17], widthSegments: 24, heightSegments: 18, roughness: 0.85,
  });
  roundedBox(backpack, [0.4, 0.26, 0.12], [0, 1.44, 0.37], bagColor, {
    radius: 0.06, segments: 3, roughness: 0.85,
  });
  roundedBox(backpack, [0.32, 0.12, 0.05], [0, 1.43, 0.425], accent, {
    radius: 0.03, segments: 2, roughness: 0.8,
  });
  seam(backpack, [0.009, 0.32, 0.01], [0, 1.59, 0.418], 0x5f2133);
  seam(backpack, [0.25, 0.009, 0.01], [0, 1.70, 0.418], 0x5f2133);
  for (const side of [-1, 1]) {
    capsule(backpack, 0.032, 0.2, [side * 0.258, 1.47, 0.27], accent, {
      radialSegments: 9, capSegments: 3, roughness: 0.8,
    });
    seam(backpack, [0.035, 0.15, 0.01], [side * 0.2, 1.53, 0.425], 0xe4d9c4);
  }
  // Top flap hinge: its own joint so it can bounce with each stride.
  const flap = new THREE.Group();
  flap.name = 'Backpack flap';
  flap.position.set(0, 1.815, 0.26);
  backpack.add(flap);
  roundedBox(flap, [0.46, 0.14, 0.1], [0, 0.012, 0.015], bagColor, {
    radius: 0.045, segments: 3, roughness: 0.85,
  });
  roundedBox(flap, [0.13, 0.06, 0.028], [0, -0.045, 0.066], 0xd9b45e, {
    radius: 0.014, metalness: 0.35, roughness: 0.4,
  });
  for (const side of [-1, 1]) {
    capsule(flap, 0.009, 0.11, [side * 0.11, -0.065, 0.045], 0x3a2a24, {
      rotation: [0.15, 0, 0], radialSegments: 5, capSegments: 2,
    });
    sphere(flap, 0.016, [side * 0.11, -0.12, 0.07], 0xc9ccd0, {
      widthSegments: 7, heightSegments: 5, metalness: 0.45, roughness: 0.4,
    });
  }
  // Side bottle in a mesh sleeve, animated separately.
  const bottle = new THREE.Group();
  bottle.name = 'Backpack water bottle';
  bottle.position.set(0.262, 1.53, 0.315);
  backpack.add(bottle);
  cylinder(bottle, [0.034, 0.037], 0.17, [0, 0, 0], 0x9fd2e0, {
    segments: 12, roughness: 0.3, metalness: 0.05,
  });
  cylinder(bottle, [0.038], 0.04, [0, 0.09, 0], accent, { segments: 12, roughness: 0.7 });
  cylinder(bottle, [0.016], 0.022, [0, 0.116, 0], 0xd9dde0, { segments: 8, roughness: 0.5 });
  // Zip pulls and a small woven charm tag swing with the bag.
  const charm = new THREE.Group();
  charm.name = 'Backpack charm';
  charm.position.set(-0.17, 1.69, 0.425);
  backpack.add(charm);
  capsule(charm, 0.005, 0.045, [0, -0.022, 0], 0xb9a26a, { radialSegments: 5, capSegments: 2 });
  roundedBox(charm, [0.055, 0.033, 0.014], [0, -0.062, 0], 0xf2c94c, {
    radius: 0.008, rotation: [0, 0, 0.22], roughness: 0.6,
  });
  roundedBox(charm, [0.034, 0.019, 0.016], [0, -0.062, 0], 0x2b6b52, { radius: 0.006 });
  // Shoulder harness with adjusters and a chest strap.
  for (const side of [-1, 1]) {
    sphere(backpack, 1, [side * 0.175, 1.79, 0.21], accent, {
      scale: [0.07, 0.055, 0.09], widthSegments: 16, heightSegments: 10, roughness: 0.8,
    });
    box(body, [0.042, 0.44, 0.018], [side * 0.135, 1.6, shirtFront(1.6, 0.004)], strap, {
      rotation: [0, 0, side * 0.08], roughness: 0.85,
    });
    box(body, [0.05, 0.34, 0.022], [side * 0.175, 1.66, 0.245], strap, {
      rotation: [0, 0, side * 0.08], roughness: 0.85,
    });
    roundedBox(body, [0.05, 0.08, 0.028], [side * 0.185, 1.5, 0.29], 0x2f343b, {
      radius: 0.01, roughness: 0.5,
    });
    capsule(body, 0.009, 0.15, [side * 0.09, 1.46, shirtFront(1.46, 0.03)], 0x30363d, {
      rotation: [0, 0, Math.PI / 2], radialSegments: 5, capSegments: 2,
    });
  }
  torus(backpack, 0.095, 0.018, [0, 1.89, 0.245], strap, {
    rotation: [Math.PI / 2, 0, 0], roughness: 0.85,
  });
  return { backpack, flap, bottle, charm };
}

/** Smooth, detailed articulated runner with shared lightweight organic geometry. */
export function createSchoolboy(options = {}) {
  const palette = {
    id: 'schoolboy', skin: SKIN, skinLight: SKIN_LIGHT, shirt: WHITE, shorts: BLUE,
    hair: HAIR, shoe: SHOE, backpack: 0x8b3048, accent: 0x176c68,
    outfit: 'uniform', hairStyle: 'crop', accessories: ['badge'], build: 'athletic', ...options,
  };
  palette.accessories = palette.accessories || [];
  const visual = new THREE.Group();
  visual.name = `Articulated runner ${palette.id}`;
  visual.userData.characterId = palette.id;
  visual.userData.detailLevel = 'sculpted-face-anatomy-tailored-clothing-articulated-backpack';
  visual.userData.anatomy = 'athletic-v-taper-lathe-torso-sculpted-head-articulated-hands';
  visual.userData.shoulders = 'rounded-deltoids-with-closed-skinned-sleeves';
  visual.userData.backpackAnimated = true;
  const body = new THREE.Group();
  visual.add(body);

  const shirt = new THREE.Mesh(getShirtGeometry(palette), material(palette.shirt, { roughness: 0.88 }));
  shirt.position.set(0, SHIRT_BASE_Y, 0);
  body.add(shirt);

  // Shoulder yoke bridges the torso into the deltoids so the sleeves read as one body.
  sphere(body, 1, [0, 1.885, 0.005], palette.shirt, {
    scale: [0.305, 0.085, 0.145], widthSegments: 20, heightSegments: 12, roughness: 0.88,
  });
  // Chest, lat and abdominal shaping under the fabric. These volumes stop the
  // runner reading as a single extruded block without turning him into a blob.
  for (const side of [-1, 1]) {
    sphere(body, 1, [side * 0.24, 1.66, -0.025], palette.shirt, {
      scale: [0.05, 0.16, 0.05], widthSegments: 14, heightSegments: 10, roughness: 0.8,
    });
  }

  // School shirt construction: collar, placket, buttons, pocket, badge and tie.
  collar(body, {
    y: 1.9, z: shirtFront(1.9, 0.004), width: 0.15, color: palette.shirt, trim: 0xe6e0cf,
  });
  seam(body, [0.03, 0.4, 0.014], [0, 1.66, shirtFront(1.66, 0.004)], 0xf4f1e4);
  buttonRow(body, { count: 5, top: 1.80, bottom: 1.42, z: shirtFront(1.6, 0.012), radius: 0.01, color: 0x3d4654 });
  roundedBox(body, [0.095, 0.085, 0.012], [0.125, 1.70, shirtFront(1.70, 0.004)], palette.shirt, {
    radius: 0.015, roughness: 0.85,
  });
  seam(body, [0.095, 0.011, 0.016], [0.125, 1.742, shirtFront(1.742, 0.004)], 0xe7e2d1);
  if (palette.style === 'police') {
    const LEATHER = 0x141210;
    const SILVER = 0xc4c8cc;
    // Tunic: pressed placket, silver buttons, epaulettes and collar dogs.
    buttonRow(body, { count: 5, top: 1.86, bottom: 1.44, z: shirtFront(1.6, 0.012), radius: 0.012, color: SILVER });
    for (const side of [-1, 1]) {
      roundedBox(body, [0.13, 0.026, 0.085], [side * 0.185, 1.872, -0.01], palette.trouserCuff ?? 0x2b2a24, {
        radius: 0.012, rotation: [0, 0, side * 0.12], roughness: 0.7,
      });
      sphere(body, 0.018, [side * 0.245, 1.9, -0.02], SILVER, {
        widthSegments: 8, heightSegments: 6, metalness: 0.5, roughness: 0.35,
      });
      sphere(body, 0.017, [side * 0.075, 1.86, shirtFront(1.86, 0.014)], PAL_POLICE_TAB(), {
        scale: [1, 1.2, 0.4], widthSegments: 8, heightSegments: 6, roughness: 0.5,
      });
    }
    // Sam Browne belt, cross strap, buckle, holster and baton.
    const belt = cylinder(body, [0.246], 0.075, [0, 1.27, 0], LEATHER, {
      segments: 22, scale: [1, 1, 0.78], roughness: 0.45,
    });
    roundedBox(body, [0.11, 0.09, 0.03], [0, 1.27, -0.195], SILVER, {
      radius: 0.02, metalness: 0.55, roughness: 0.3,
    });
    capsule(body, 0.024, 0.52, [-0.05, 1.56, shirtFront(1.56, 0.01)], LEATHER, {
      rotation: [0, 0, 0.46], radialSegments: 7, capSegments: 2, roughness: 0.45,
    });
    roundedBox(body, [0.085, 0.16, 0.07], [0.235, 1.2, 0.1], LEATHER, {
      radius: 0.02, rotation: [0, 0, -0.1], roughness: 0.5,
    });
    roundedBox(body, [0.09, 0.11, 0.075], [-0.245, 1.26, -0.06], LEATHER, {
      radius: 0.018, roughness: 0.5,
    });

  }
  if (palette.accessories.includes('badge') || palette.outfit === 'uniform') {
    sphere(body, 0.036, [-0.13, 1.70, shirtFront(1.70, 0.008)], 0xf2c94c, {
      scale: [1, 1.18, 0.3], metalness: 0.25, roughness: 0.45,
    });
    sphere(body, 0.02, [-0.13, 1.70, shirtFront(1.70, 0.018)], 0x1f8a70, { scale: [1, 1, 0.28] });
  }
  if (palette.outfit === 'uniform' && palette.style !== 'police') {
    // Knotted tie: small knot, tapered blade, two woven school stripes.
    roundedBox(body, [0.05, 0.05, 0.022], [0, 1.845, shirtFront(1.845, 0.008)], palette.accent, {
      radius: 0.016, roughness: 0.6,
    });
    const blade = roundedBox(body, [0.042, 0.15, 0.014], [0, 1.745, shirtFront(1.745, 0.006)], palette.accent, {
      radius: 0.01, roughness: 0.6,
    });
    blade.scale.x = 1.1;
    for (let index = 0; index < 2; index += 1) {
      seam(body, [0.036, 0.009, 0.005], [0, 1.79 - index * 0.04, shirtFront(1.79 - index * 0.04, 0.014)], 0xe8e2cf);
    }
    for (const side of [-1, 1]) {
      sphere(body, 1, [side * 0.1, 1.87, shirtFront(1.87, 0.004)], palette.shirt, {
        scale: [0.1, 0.038, 0.02], rotation: [0.12, 0, side * 0.36],
        widthSegments: 10, heightSegments: 6, roughness: 0.85,
      });
    }
  } else if (palette.outfit === 'jacket') {
    for (const side of [-1, 1]) {
      roundedBox(body, [0.135, 0.09, 0.02], [side * 0.16, 1.36, shirtFront(1.36, 0.004)], palette.shirt, { radius: 0.02 });
      capsule(body, 0.011, 0.11, [side * 0.16, 1.39, shirtFront(1.39, 0.016)], palette.accent, {
        rotation: [0, 0, Math.PI / 2], radialSegments: 6, capSegments: 2,
      });
    }
  } else if (palette.style !== 'police') {
    for (const side of [-1, 1]) {
      capsule(body, 0.018, 0.34, [side * 0.2, 1.56, shirtFront(1.56, 0.004)], palette.accent, {
        rotation: [0, 0, side * 0.12], radialSegments: 6, capSegments: 2,
      });
    }
  }

  // Shorts, belt and pockets.
  sphere(body, 1, [0, 1.115, 0], palette.shorts, {
    scale: [0.225, 0.15, 0.168], widthSegments: 18, heightSegments: 12, roughness: 0.9,
  });
  for (const side of [-1, 1]) {
    sphere(body, 1, [side * 0.112, 1.06, -0.012], palette.shorts, {
      scale: [0.115, 0.135, 0.15], widthSegments: 14, heightSegments: 10, roughness: 0.9,
    });
    seam(body, [0.008, 0.15, 0.014], [side * 0.203, 1.09, -0.125], 0x2a3f6b);
    roundedBox(body, [0.085, 0.05, 0.012], [side * 0.13, 1.128, -0.172], palette.shorts, {
      radius: 0.01, roughness: 0.9,
    });
  }
  const belt = cylinder(body, [0.228], 0.042, [0, 1.235, 0], 0x23304c, { segments: 20 });
  belt.scale.z = 0.76;
  roundedBox(body, [0.07, 0.055, 0.028], [0, 1.235, -0.168], 0xc9ccd0, {
    radius: 0.012, metalness: 0.5, roughness: 0.35,
  });
  roundedBox(body, [0.044, 0.03, 0.014], [0, 1.235, -0.182], 0x1c242c, { radius: 0.007 });

  // Neck (kept on the body so the smaller head can rotate naturally).
  cylinder(body, [0.086, 0.078], 0.19, [0, 1.945, 0.004], palette.skin, {
    segments: 14, scale: [1, 1, 0.92], roughness: 0.72,
  });
  sphere(body, 0.05, [0, 2.0, -0.05], palette.skin, {
    scale: [1.15, 0.5, 0.8], widthSegments: 12, heightSegments: 8, roughness: 0.8,
  });

  const head = new THREE.Group();
  head.name = 'Sculpted head';
  head.position.set(0, 2.035, 0);
  head.scale.setScalar(0.56);
  body.add(head);
  buildHead(head, palette);

  const bag = buildBackpack(body, palette);
  const backpack = bag.backpack === null ? null : (bag.backpack ?? bag);

  const left = makeArm(-1, palette);
  const right = makeArm(1, palette);
  const leftLeg = makeLeg(-1, palette);
  const rightLeg = makeLeg(1, palette);
  const pelvis = new THREE.Group();
  pelvis.name = 'Pelvis';
  pelvis.add(leftLeg.hip, rightLeg.hip);
  visual.add(left.shoulder, right.shoulder, pelvis,
    left.mesh, right.mesh, leftLeg.mesh, rightLeg.mesh);
  for (const limb of [left, right, leftLeg, rightLeg]) bindLimb(visual, limb);
  visual.userData.skinnedLimbs = [left.mesh, right.mesh, leftLeg.mesh, rightLeg.mesh];
  visual.userData.joints = {
    body,
    head,
    pelvis,
    backpack,
    backpackFlap: bag.flap || null,
    backpackBottle: bag.bottle || null,
    backpackCharm: bag.charm || null,
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
  for (const key of Object.keys(visual.userData.joints)) {
    if (!visual.userData.joints[key]) delete visual.userData.joints[key];
  }
  return batchArticulatedModel(visual);
}
