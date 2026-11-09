import * as THREE from 'three';
import { box, capsule, cylinder, roundedBox, sphere, torus } from './MeshKit.js';
import { batchArticulatedModel } from './StaticBatcher.js';

const HIDE = 0xd9d3c4;
const HIDE_DARK = 0x5a4a3a;
const HORN = 0xd8c9a0;
const HOOF = 0x2a2622;

/**
 * Original Sri Lankan road cow: a humped zebu with dewlap, horns and a moving
 * head/tail. It blocks one lane exactly like a parked car, so every pattern
 * remains survivable, but it gives rural districts an unmistakable island feel.
 */
export function createCow(variant = 0) {
  const root = new THREE.Group();
  root.name = 'Sri Lankan road cow';
  root.userData.kind = 'cow';
  const spotted = variant % 2 === 0;
  const body = new THREE.Group();
  root.add(body);
  sphere(body, 1, [0, 1.02, 0], HIDE, {
    scale: [0.42, 0.38, 0.82], widthSegments: 18, heightSegments: 12, roughness: 0.92,
  });
  sphere(body, 1, [0, 1.24, -0.2], HIDE, {
    scale: [0.36, 0.26, 0.4], widthSegments: 16, heightSegments: 11, roughness: 0.92,
  });
  // Zebu hump and rib shaping.
  sphere(body, 1, [0, 1.42, -0.18], HIDE, {
    scale: [0.22, 0.22, 0.26], widthSegments: 14, heightSegments: 10, roughness: 0.92,
  });
  if (spotted) {
    for (const [x, y, z, sx, sy] of [[0.22, 1.12, 0.18, 0.2, 0.16], [-0.18, 0.98, -0.24, 0.18, 0.2], [0.1, 1.2, -0.42, 0.15, 0.13]]) {
      sphere(body, 1, [x, y, z], HIDE_DARK, {
        scale: [sx, sy, 0.06], widthSegments: 10, heightSegments: 7, roughness: 0.94,
      });
    }
  }
  // Legs and hooves.
  for (const side of [-1, 1]) {
    for (const z of [-0.5, 0.5]) {
      capsule(body, 0.075, 0.62, [side * 0.24, 0.48, z], HIDE, {
        radialSegments: 8, capSegments: 3, roughness: 0.92,
      });
      cylinder(body, [0.078, 0.09], 0.13, [side * 0.24, 0.08, z], HOOF, {
        segments: 8, roughness: 0.6,
      });
    }
  }
  // Dewlap and tail root.
  sphere(body, 1, [0, 0.82, -0.52], HIDE, {
    scale: [0.16, 0.26, 0.12], widthSegments: 10, heightSegments: 8, roughness: 0.92,
  });

  const head = new THREE.Group();
  head.name = 'Cow head';
  head.position.set(0, 1.28, -0.72);
  body.add(head);
  sphere(head, 1, [0, 0, 0], HIDE, {
    scale: [0.21, 0.24, 0.3], widthSegments: 16, heightSegments: 12, roughness: 0.9,
  });
  sphere(head, 1, [0, -0.09, -0.24], HIDE_DARK, {
    scale: [0.14, 0.11, 0.15], widthSegments: 12, heightSegments: 9, roughness: 0.85,
  });
  for (const side of [-1, 1]) {
    sphere(head, 0.045, [side * 0.13, 0.06, -0.22], 0x241f1a, {
      scale: [1, 1, 0.7], widthSegments: 8, heightSegments: 6, roughness: 0.4,
    });
    sphere(head, 0.016, [side * 0.13, 0.065, -0.25], 0xffffff, {
      widthSegments: 6, heightSegments: 4, roughness: 0.2,
    });
    capsule(head, 0.075, 0.22, [side * 0.22, 0.16, -0.02], HIDE, {
      rotation: [0.2, 0, side * 0.5], radialSegments: 8, capSegments: 3, roughness: 0.9,
    });
    capsule(head, 0.035, 0.16, [side * 0.15, 0.28, -0.05], HORN, {
      rotation: [-0.2, 0, side * 0.72], radialSegments: 7, capSegments: 3, roughness: 0.5,
    });
    // Bell and rope on one side.
    if (side < 0) {
      capsule(head, 0.012, 0.18, [side * 0.16, -0.14, -0.12], 0x7a3a2a, {
        rotation: [0.2, 0, side * 0.3], radialSegments: 5, capSegments: 2,
      });
      sphere(head, 0.045, [side * 0.18, -0.24, -0.14], 0xc9a44a, {
        scale: [1, 1.2, 1], metalness: 0.45, roughness: 0.35, widthSegments: 10, heightSegments: 8,
      });
    }
  }
  box(head, [0.12, 0.03, 0.06], [0, -0.16, -0.26], 0x8a5c50);

  const tail = new THREE.Group();
  tail.name = 'Cow tail';
  tail.position.set(0, 1.2, 0.72);
  body.add(tail);
  capsule(tail, 0.028, 0.5, [0, -0.22, 0.03], HIDE, {
    radialSegments: 6, capSegments: 2, roughness: 0.92,
  });
  capsule(tail, 0.05, 0.16, [0, -0.52, 0.05], HIDE_DARK, {
    radialSegments: 7, capSegments: 3, roughness: 0.95,
  });

  root.userData.joints = { head, tail, body };
  root.userData.cow = true;
  root.scale.setScalar(0.96 + (variant % 3) * 0.04);
  return batchArticulatedModel(root);
}

/** Idle head sway and tail switch; called only for visible nearby obstacles. */
export function updateCow(cow, time) {
  const { head, tail } = cow.userData.joints || cow.userData;
  if (head) {
    head.rotation.y = Math.sin(time * 1.15) * 0.22;
    head.rotation.x = Math.sin(time * 0.7 + 1) * 0.06;
  }
  if (tail) {
    tail.rotation.z = Math.sin(time * 2.1) * 0.32;
    tail.rotation.x = Math.sin(time * 1.3) * 0.12;
  }
}
