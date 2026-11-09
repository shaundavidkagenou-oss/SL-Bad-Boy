import * as THREE from 'three';
import { box, capsule, cylinder, roundedBox, sphere, torus } from './MeshKit.js';

/**
 * Small, reusable anatomy and clothing pieces used by the runner and the
 * police officer. Everything here is rigid geometry added to an existing
 * joint; the static batcher folds each joint back down to one or two draws,
 * so facial and fabric detail costs triangles rather than draw calls.
 */

export function detailedEye(parent, side, {
  y = 0.24, z = -0.305, scale = 1, skin = 0xb97850, shadow = 0x8f5a3e,
  iris = 0x4a2f1d, highlight = 0xffffff, lidCover = 0.42,
} = {}) {
  const s = scale;
  // Socket recession keeps the eye from reading as a sticker on a ball.
  sphere(parent, 0.072 * s, [side * 0.125 * s, y + 0.006 * s, z + 0.018 * s], shadow, {
    scale: [1.02, 0.78, 0.5], widthSegments: 16, heightSegments: 10,
    roughness: 0.92,
  });
  sphere(parent, 0.057 * s, [side * 0.125 * s, y, z], 0xfff6e4, {
    scale: [1.14, 0.86, 0.5], widthSegments: 18, heightSegments: 12, roughness: 0.22,
  });
  const irisRadius = 0.024 * s;
  cylinder(parent, [irisRadius, irisRadius], 0.008 * s,
    [side * 0.125 * s, y - 0.002 * s, z - 0.026 * s], iris, {
      segments: 16, rotation: [Math.PI / 2, 0, 0], roughness: 0.3,
    });
  cylinder(parent, [irisRadius * 0.44, irisRadius * 0.44], 0.004 * s,
    [side * 0.125 * s, y - 0.002 * s, z - 0.031 * s], 0x120d0a, {
      segments: 12, rotation: [Math.PI / 2, 0, 0], roughness: 0.4,
    });
  sphere(parent, 0.0062 * s, [side * 0.125 * s + 0.008 * s, y + 0.009 * s, z - 0.034 * s], highlight, {
    widthSegments: 6, heightSegments: 4, roughness: 0.1,
  });
  sphere(parent, 0.0034 * s, [side * 0.125 * s - 0.009 * s, y - 0.009 * s, z - 0.034 * s], highlight, {
    widthSegments: 5, heightSegments: 4, roughness: 0.1,
  });
  // Upper lid and lash line overlap the sclera just enough to shape the gaze.
  sphere(parent, 0.062 * s, [side * 0.125 * s, y + 0.034 * s * lidCover / 0.42, z + 0.004 * s], skin, {
    scale: [1.12, 0.52, 0.55], widthSegments: 16, heightSegments: 10, roughness: 0.72,
  });
  const lash = torus(parent, 0.052 * s, 0.007 * s,
    [side * 0.125 * s, y + 0.012 * s, z - 0.018 * s], 0x241a14, {
      arc: Math.PI * 0.94, rotation: [0.18, 0, side > 0 ? 0 : Math.PI], roughness: 0.8,
    });
  lash.scale.y = 0.72;
  sphere(parent, 0.056 * s, [side * 0.125 * s, y - 0.037 * s, z + 0.006 * s], skin, {
    scale: [1.02, 0.3, 0.5], widthSegments: 14, heightSegments: 8, roughness: 0.72,
  });
  return { x: side * 0.125 * s, y, z };
}

export function detailedBrow(parent, side, {
  y = 0.335, z = -0.292, scale = 1, color = 0x1d1a18, angle = 0.1,
} = {}) {
  const s = scale;
  for (let index = 0; index < 4; index += 1) {
    const t = index / 3;
    const x = side * (0.058 + t * 0.105) * s;
    const lift = (1 - t) * 0.012 * s;
    capsule(parent, 0.0115 * s - t * 0.0035 * s, 0.052 * s,
      [x, y + lift, z - t * 0.008 * s], color, {
        rotation: [0, 0, Math.PI / 2 + side * (angle + t * 0.1)],
        radialSegments: 6, capSegments: 2, roughness: 0.85,
      });
  }
}

export function detailedEar(parent, side, {
  y = 0.21, z = -0.01, scale = 1, skin = 0xcb8b61, inner = 0xa8694a,
} = {}) {
  const s = scale;
  sphere(parent, 0.062 * s, [side * 0.322 * s, y, z], skin, {
    scale: [0.42, 1.05, 0.78], widthSegments: 14, heightSegments: 10, roughness: 0.72,
  });
  sphere(parent, 0.038 * s, [side * 0.344 * s, y - 0.002 * s, z + 0.008 * s], inner, {
    scale: [0.32, 0.9, 0.62], widthSegments: 10, heightSegments: 8, roughness: 0.8,
  });
  sphere(parent, 0.021 * s, [side * 0.354 * s, y - 0.032 * s, z - 0.012 * s], inner, {
    scale: [0.5, 0.7, 0.6], widthSegments: 8, heightSegments: 6, roughness: 0.8,
  });
  capsule(parent, 0.008 * s, 0.05 * s, [side * 0.35 * s, y + 0.042 * s, z - 0.004 * s], skin, {
    rotation: [0, 0, side * 0.5], radialSegments: 6, capSegments: 2, roughness: 0.72,
  });
}

export function detailedNose(parent, {
  y = 0.175, z = -0.303, scale = 1, skin = 0xb97850, skinLight = 0xcb8b61, shadow = 0x915a3e,
} = {}) {
  const s = scale;
  capsule(parent, 0.032 * s, 0.085 * s, [0, y + 0.055 * s, z - 0.012 * s], skinLight, {
    rotation: [0.24, 0, 0], scale: [1, 1, 0.85], radialSegments: 10, capSegments: 3, roughness: 0.72,
  });
  sphere(parent, 0.043 * s, [0, y, z - 0.028 * s], skinLight, {
    scale: [1.02, 0.86, 0.92], widthSegments: 12, heightSegments: 9, roughness: 0.7,
  });
  for (const side of [-1, 1]) {
    sphere(parent, 0.024 * s, [side * 0.032 * s, y - 0.012 * s, z - 0.018 * s], shadow, {
      scale: [0.85, 0.62, 0.7], widthSegments: 8, heightSegments: 6, roughness: 0.8,
    });
    sphere(parent, 0.008 * s, [side * 0.014 * s, y - 0.02 * s, z - 0.036 * s], 0x6b4030, {
      scale: [1.1, 0.6, 0.5], widthSegments: 6, heightSegments: 4, roughness: 0.9,
    });
  }
}

export function detailedMouth(parent, {
  y = 0.062, z = -0.296, scale = 1, lip = 0x8f4a3d, lipDark = 0x6f332b, teeth = 0xf2e6d4, smile = 0.012,
} = {}) {
  const s = scale;
  // Upper lip: two soft lobes with a philtrum groove above them.
  for (const side of [-1, 1]) {
    sphere(parent, 0.032 * s, [side * 0.027 * s, y + 0.011 * s, z - 0.004 * s], lip, {
      scale: [1.15, 0.5, 0.42], rotation: [0, 0, side * -0.16],
      widthSegments: 10, heightSegments: 6, roughness: 0.7,
    });
  }
  sphere(parent, 0.045 * s, [0, y - 0.014 * s, z - 0.002 * s], lip, {
    scale: [1.05, 0.62, 0.45], widthSegments: 12, heightSegments: 8, roughness: 0.68,
  });
  sphere(parent, 0.032 * s, [0, y - 0.004 * s, z + 0.009 * s], teeth, {
    scale: [1.02, 0.16, 0.14], widthSegments: 10, heightSegments: 5, roughness: 0.4,
  });
  box(parent, [0.085 * s, 0.004 * s, 0.004 * s], [0, y + smile * s, z - 0.019 * s], lipDark);
  for (const side of [-1, 1]) {
    capsule(parent, 0.0035 * s, 0.018 * s, [side * 0.062 * s, y + 0.004 * s, z - 0.006 * s], lipDark, {
      rotation: [0, 0, side * 1.15], radialSegments: 5, capSegments: 2,
    });
  }

}

/** A hand with a shaped palm, knuckle row, four fingers and an opposed thumb. */
export function detailedHand(parent, side, {
  y = -0.07, z = -0.012, scale = 1, skin = 0xb97850, skinLight = 0xcb8b61,
  nail = 0xe3bda5, rotation = [0, 0, 0], curl = 0.24,
} = {}) {
  const s = scale;
  const hand = new THREE.Group();
  hand.name = side < 0 ? 'Left hand detail' : 'Right hand detail';
  parent.add(hand);
  hand.position.set(side * 0.004 * s, y, z);
  hand.rotation.set(...rotation);
  sphere(hand, 0.082 * s, [0, 0, -0.004 * s], skinLight, {
    scale: [0.92, 1.1, 0.55], widthSegments: 16, heightSegments: 10, roughness: 0.7,
  });
  roundedBox(hand, [0.118 * s, 0.11 * s, 0.062 * s], [0, -0.062 * s, -0.006 * s], skinLight, {
    radius: 0.024 * s, segments: 2, roughness: 0.7,
  });
  for (let finger = 0; finger < 4; finger += 1) {
    const x = (-0.04 + finger * 0.0265) * s;
    const length = (0.05 - Math.abs(finger - 1.5) * 0.008) * s;
    capsule(hand, 0.0135 * s, length, [x, -0.135 * s, -0.014 * s], skin, {
      rotation: [curl, 0, 0], radialSegments: 7, capSegments: 2, roughness: 0.7,
    });
    capsule(hand, 0.0115 * s, length * 0.72, [x, -0.135 * s - length * 0.86, -0.03 * s], skin, {
      rotation: [curl * 2.1, 0, 0], radialSegments: 7, capSegments: 2, roughness: 0.7,
    });
    sphere(hand, 0.0062 * s, [x, -0.135 * s - length * 1.42, -0.048 * s], nail, {
      scale: [1, 1, 0.6], widthSegments: 6, heightSegments: 4, roughness: 0.5,
    });
    sphere(hand, 0.017 * s, [x, -0.06 * s, -0.03 * s], skinLight, {
      scale: [0.9, 0.65, 0.7], widthSegments: 6, heightSegments: 4, roughness: 0.7,
    });
  }
  capsule(hand, 0.017 * s, 0.055 * s, [side * 0.058 * s, -0.055 * s, -0.02 * s], skin, {
    rotation: [0.35, 0, side * 0.95], radialSegments: 8, capSegments: 2, roughness: 0.7,
  });
  capsule(hand, 0.014 * s, 0.042 * s, [side * 0.082 * s, -0.092 * s, -0.036 * s], skin, {
    rotation: [0.55, 0, side * 1.2], radialSegments: 7, capSegments: 2, roughness: 0.7,
  });
  return hand;
}

/** Stitched seams, buttons and fabric trim that read at chase-camera distance. */
export function buttonRow(parent, { count = 5, top = 0.3, bottom = -0.16, x = 0, z = -0.285, radius = 0.014, color = 0x39424e }) {
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0 : index / (count - 1);
    cylinder(parent, [radius], 0.012, [x, top + (bottom - top) * t, z], color, {
      segments: 8, rotation: [Math.PI / 2, 0, 0], roughness: 0.5,
    });
  }
}

export function seam(parent, size, position, color, rotation) {
  return box(parent, size, position, color, { rotation, roughness: 0.9 });
}

/** Shirt/hoodie hood or folded collar; two rigid flaps either side of the neck. */
export function collar(parent, {
  y = 0.4, z = -0.16, width = 0.3, color = 0xf3efe0, trim = 0xe2dcc8,
} = {}) {
  for (const side of [-1, 1]) {
    box(parent, [width, 0.1, 0.012], [side * width * 0.42, y, z], color, {
      rotation: [0.12, side * -0.5, side * 0.22], roughness: 0.9,
    });
    box(parent, [width * 0.92, 0.014, 0.014], [side * width * 0.42, y - 0.045, z - 0.008], trim, {
      rotation: [0.12, side * -0.5, side * 0.22],
    });
  }
  cylinder(parent, [0.16, 0.175], 0.09, [0, y + 0.04, 0.02], color, {
    segments: 14, scale: [1, 1, 0.82], roughness: 0.9,
  });
}
