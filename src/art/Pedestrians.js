import * as THREE from 'three';
import { box, capsule, cylinder, roundedBox, sphere } from './MeshKit.js';
import { batchStaticGroup } from './StaticBatcher.js';

/**
 * Sidewalk life for Colombo after hours: five original, differently built
 * locals per crowd, posed walking, waiting or chatting. Everything merges into
 * the section's static batch, so an entire pavement of people is one or two
 * draw calls instead of dozens.
 */

const SKINS = [0x8a5a3a, 0xa9704c, 0xbd8158, 0x9a643f, 0x7d4d33];
const HAIRS = [0x141212, 0x1d1a18, 0x2a211a, 0x3a2c22, 0x514238];
const CLOTH = [
  [0xf4f0e2, 0x1d2a4a], [0x2f6f8f, 0x1a2c3d], [0x9b3a44, 0x2b2f3a],
  [0xf0d9a4, 0x6c4a2a], [0x3f7d63, 0x22303a], [0x7a4f93, 0x2a2438],
  [0xe7e4d8, 0x415066], [0xd97a3c, 0x2b2a33],
];

const pick = (list, index) => list[Math.abs(index) % list.length];

function addFace(head, y) {
  for (const side of [-1, 1]) {
    sphere(head, 0.016, [side * 0.045, y + 0.012, -0.108], 0x1a1512, {
      scale: [1, 1.15, 0.6], widthSegments: 6, heightSegments: 5, roughness: 0.5,
    });
    sphere(head, 0.011, [side * 0.043, y + 0.05, -0.104], 0x2a201b, {
      scale: [1.6, 0.5, 0.5], widthSegments: 5, heightSegments: 4, roughness: 0.9,
    });
  }
  sphere(head, 0.021, [0, y - 0.018, -0.112], 0x9a6242, {
    scale: [0.9, 1.05, 0.95], widthSegments: 6, heightSegments: 5, roughness: 0.7,
  });
  box(head, [0.05, 0.008, 0.01], [0, y - 0.062, -0.108], 0x6a332c);
}

/** One local, built from a seeded look plus a pose. */
export function createFigure(seed) {
  const figure = new THREE.Group();
  const skin = pick(SKINS, seed * 3 + 1);
  const [shirt, trousers] = pick(CLOTH, seed * 5 + 2);
  const hair = pick(HAIRS, seed * 7 + 1);
  const style = Math.abs(seed) % 6;
  figure.userData.figureStyle = style;
  figure.userData.figureSeed = seed;
  const walk = style === 0 || style === 3;
  const sway = walk ? 0.22 : style === 5 ? 0.1 : 0.02;
  // Real crowds are not clones: vary stature and build with the seed.
  const stature = 0.93 + (Math.abs(seed * 37) % 11) / 100;
  const build = 0.94 + (Math.abs(seed * 53) % 9) / 100;
  figure.scale.set(build, stature, build);

  // Trousers / sarong / sari skirt with a pressed edge.
  if (style === 2) {
    cylinder(figure, [0.21, 0.3], 0.92, [0, 0.62, 0], shirt, {
      segments: 10, scale: [1, 1, 0.86], roughness: 0.9,
    });
    cylinder(figure, [0.31], 0.08, [0, 1.05, 0], 0xd9b45e, { segments: 12, roughness: 0.7 });
  } else {
    for (const side of [-1, 1]) {
      capsule(figure, 0.078, 0.82, [side * 0.1, 0.46, walk ? side * 0.05 : 0], trousers, {
        rotation: [0, 0, side * 0.02], radialSegments: 6, capSegments: 2, roughness: 0.88,
      });
      roundedBox(figure, [0.14, 0.075, 0.25], [side * 0.1, 0.06, -0.04], 0x1d1f22, {
        radius: 0.03, roughness: 0.6,
      });
    }
  }
  if (style === 2) {
    for (const side of [-1, 1]) {
      roundedBox(figure, [0.13, 0.07, 0.22], [side * 0.1, 0.05, -0.03], 0x1d1f22, {
        radius: 0.03, roughness: 0.6,
      });
    }
  }

  // Torso: shirt, blouse or office shirt with a collar and belt line.
  roundedBox(figure, [0.36, 0.54, 0.23], [0, 1.16, 0], shirt, {
    radius: 0.08, segments: 3, roughness: 0.82,
  });
  roundedBox(figure, [0.3, 0.07, 0.24], [0, 0.92, 0], 0x2f3540, { radius: 0.02, roughness: 0.7 });
  box(figure, [0.19, 0.09, 0.02], [0, 1.35, -0.115], 0xece7d8);
  if (style === 1 || style === 4) {
    // Long-sleeved arms with skin at the cuffs.
    for (const side of [-1, 1]) {
      capsule(figure, 0.062, 0.6, [side * 0.22, 1.12, sway * 0.05], shirt, {
        rotation: [0, 0, side * 0.1], radialSegments: 6, capSegments: 2, roughness: 0.85,
      });
      sphere(figure, 0.055, [side * 0.25, 0.79, sway * 0.09], skin, {
        widthSegments: 6, heightSegments: 5, roughness: 0.75,
      });
    }
  } else {
    for (const side of [-1, 1]) {
      capsule(figure, 0.055, 0.3, [side * 0.21, 1.24, 0], shirt, {
        radialSegments: 6, capSegments: 2, roughness: 0.85,
      });
      capsule(figure, 0.048, 0.36, [side * 0.23, 0.96, sway * 0.06], skin, {
        rotation: [sway, 0, side * 0.06], radialSegments: 6, capSegments: 2, roughness: 0.75,
      });
      sphere(figure, 0.05, [side * 0.235, 0.77, sway * 0.1], skin, {
        widthSegments: 6, heightSegments: 5, roughness: 0.75,
      });
    }
  }

  // Neck, head, hair and a readable face.
  cylinder(figure, [0.06, 0.07], 0.1, [0, 1.45, 0], skin, { segments: 10, roughness: 0.75 });
  const head = new THREE.Group();
  head.position.set(0, 1.6, 0);
  figure.add(head);
  sphere(head, 1, [0, 0, 0], skin, {
    scale: [0.115, 0.135, 0.12], widthSegments: 10, heightSegments: 8, roughness: 0.72,
  });
  sphere(head, 1, [0, 0.075, 0.012], hair, {
    scale: [0.122, 0.085, 0.126], widthSegments: 10, heightSegments: 8, roughness: 0.92,
  });
  if (style === 0 || style === 3) {
    // Long hair / ponytail.
    sphere(head, 1, [0, -0.06, 0.09], hair, {
      scale: [0.11, 0.14, 0.07], widthSegments: 9, heightSegments: 7, roughness: 0.92,
    });
    capsule(head, 0.03, 0.18, [0.1, -0.08, 0.08], hair, {
      rotation: [0.3, 0, 0.2], radialSegments: 6, capSegments: 2, roughness: 0.92,
    });
  }
  if (style === 4) {
    // Cap.
    sphere(head, 1, [0, 0.095, 0], 0x1f2a3a, {
      scale: [0.125, 0.06, 0.128], widthSegments: 10, heightSegments: 6, roughness: 0.8,
    });
    roundedBox(head, [0.2, 0.02, 0.12], [0, 0.075, -0.13], 0x1f2a3a, { radius: 0.01 });
  }
  addFace(head, 0);

  // Everyday accessories: shoulder bag, market bag, phone.
  if (style === 1 || style === 5) {
    capsule(figure, 0.018, 0.52, [0.2, 1.16, 0.02], 0x6a4632, {
      rotation: [0, 0, 0.55], radialSegments: 5, capSegments: 2,
    });
    roundedBox(figure, [0.2, 0.2, 0.1], [0.3, 0.92, 0.04], 0x8d5a3c, {
      radius: 0.03, roughness: 0.8,
    });
  }
  if (style === 2) {
    cylinder(figure, [0.12, 0.15], 0.22, [-0.32, 0.86, -0.02], 0xc9a86a, {
      segments: 10, roughness: 0.85,
    });
  }
  return figure;
}

/**
 * A pavement crowd. Figures sit outside the traffic lanes, between the kerb and
 * the shopfronts, so they add life without ever touching gameplay colliders.
 */
export function createPedestrianCrowd(seed, sectionLength = 30) {
  const crowd = new THREE.Group();
  crowd.name = `Colombo pavement crowd ${seed}`;
  const count = 4 + (Math.abs(seed) % 2);
  for (let index = 0; index < count; index += 1) {
    const figure = createFigure(seed * 13 + index * 7);
    const side = (seed + index) % 2 ? 1 : -1;
    const lane = Math.abs(seed * 5 + index * 3) % 4;
    figure.position.set(side * (7.05 + lane * 0.42), 0.02,
      (index / count) * sectionLength - sectionLength * 0.42 + (lane % 2) * 0.8);
    figure.rotation.y = side > 0 ? -Math.PI / 2 + (lane - 1.5) * 0.22 : Math.PI / 2 + (lane - 1.5) * 0.22;
    figure.userData.figureSeed = seed * 13 + index * 7;
    crowd.add(figure);
  }
  crowd.userData.pedestrianCount = count;
  crowd.userData.figurePositions = crowd.children.map((figure) => [figure.position.x, figure.position.z]);
  crowd.userData.figureStyles = [...new Set(crowd.children.map((figure) => figure.userData.figureStyle))];
  batchStaticGroup(crowd);
  return crowd;
}

export const PEDESTRIAN_VARIANTS = 6;
