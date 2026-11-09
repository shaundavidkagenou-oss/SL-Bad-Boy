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
  const cx = side * 0.108 * s;
  // Every offset is mirrored through `side`, so the two eyes are exact
  // reflections: no lopsided highlights, pupils or lids.
  const at = (dx, dy, dz) => [cx + side * dx * s, y + dy * s, z + dz * s];
  // Socket: a shallow recess that stops the eye reading as a sticker.
  sphere(parent, 0.066 * s, at(0, 0.004, 0.014), shadow, {
    scale: [1.06, 0.66, 0.42], widthSegments: 16, heightSegments: 10, roughness: 0.94,
  });
  // Sclera, narrower than it is tall so the eye reads as an almond.
  sphere(parent, 0.047 * s, at(0, 0, 0), 0xfdf6e7, {
    scale: [1.06, 0.74, 0.4], widthSegments: 18, heightSegments: 12, roughness: 0.2,
  });
  // Iris + pupil sit just proud of the sclera so the gaze stays readable.
  const irisR = 0.0205 * s;
  sphere(parent, irisR, at(0, -0.001, -0.014), iris, {
    scale: [1, 1, 0.4], widthSegments: 16, heightSegments: 10, roughness: 0.24,
  });
  sphere(parent, irisR * 0.62, at(0, -0.001, -0.019), 0x2a1a10, {
    scale: [1, 1, 0.36], widthSegments: 12, heightSegments: 8, roughness: 0.3,
  });
  sphere(parent, irisR * 0.34, at(0, -0.001, -0.0225), 0x0f0a07, {
    scale: [1, 1, 0.34], widthSegments: 10, heightSegments: 6, roughness: 0.4,
  });
  // One catchlight per eye, mirrored, plus a smaller secondary glint.
  sphere(parent, 0.0056 * s, at(0.007, 0.008, -0.0205), highlight, {
    widthSegments: 6, heightSegments: 5, roughness: 0.08, emissive: 0xffffff, emissiveIntensity: 0.22,
  });
  sphere(parent, 0.0028 * s, at(-0.007, -0.007, -0.0195), highlight, {
    widthSegments: 5, heightSegments: 4, roughness: 0.12,
  });
  // Upper lid and lash line overlap the sclera just enough to shape the gaze.
  sphere(parent, 0.052 * s, at(0, 0.028 * (lidCover / 0.42), 0.002), skin, {
    scale: [1.06, 0.36, 0.40], widthSegments: 16, heightSegments: 10, roughness: 0.72,
  });
  const lash = torus(parent, 0.042 * s, 0.0044 * s, at(0, 0.008, -0.008), 0x241a14, {
    arc: Math.PI * 0.92, rotation: [0.16, 0, side > 0 ? 0 : Math.PI], roughness: 0.78,
  });
  lash.scale.y = 0.66;
  // Lower lid: a thin skin ridge rather than a second ring.
  sphere(parent, 0.05 * s, at(0, -0.031, 0.004), skin, {
    scale: [1.02, 0.26, 0.42], widthSegments: 14, heightSegments: 8, roughness: 0.72,
  });
  return { x: cx, y, z };
}

export function detailedBrow(parent, side, {
  y = 0.335, z = -0.292, scale = 1, color = 0x1d1a18, angle = 0.1,
} = {}) {
  const s = scale;
  for (let index = 0; index < 4; index += 1) {
    const t = index / 3;
    const x = side * (0.058 + t * 0.105) * s;
    const lift = (1 - t) * 0.012 * s;
    capsule(parent, 0.0082 * s - t * 0.0028 * s, 0.048 * s,
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
    sphere(parent, 0.017 * s, [side * 0.03 * s, y - 0.014 * s, z - 0.02 * s], shadow, {
      scale: [0.9, 0.6, 0.7], widthSegments: 8, heightSegments: 6, roughness: 0.8,
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
  nail = 0xd8ae96, rotation = [0, 0, 0], curl = 0.9,
} = {}) {
  const s = scale;
  const hand = new THREE.Group();
  hand.name = side < 0 ? 'Left hand detail' : 'Right hand detail';
  parent.add(hand);
  hand.position.set(side * 0.004 * s, y, z);
  hand.rotation.set(...rotation);

  // Loose running fist: continuous palm mass, knuckle line, three phalanx
  // segments per finger that overlap so no gaps show, and a thumb wrapped
  // across the front of the index finger.
  sphere(hand, 0.034 * s, [0, 0.018 * s, 0], skin, {
    scale: [1, 1.18, 0.88], widthSegments: 14, heightSegments: 9, roughness: 0.68,
  });
  roundedBox(hand, [0.08 * s, 0.09 * s, 0.052 * s], [0, -0.036 * s, -0.006 * s], skinLight, {
    radius: 0.022 * s, segments: 2, roughness: 0.68,
  });
  // Knuckle shelf: one continuous ridge instead of four separate bumps.
  roundedBox(hand, [0.083 * s, 0.034 * s, 0.056 * s], [0, -0.088 * s, -0.012 * s], skin, {
    radius: 0.014 * s, segments: 2, roughness: 0.68,
  });
  for (let finger = 0; finger < 4; finger += 1) {
    const x = (-0.027 + finger * 0.018) * s;
    capsule(hand, 0.0118 * s, 0.032 * s, [x, -0.106 * s, -0.032 * s], skin, {
      rotation: [0.34 + curl * 0.16, 0, 0], radialSegments: 7, capSegments: 3, roughness: 0.68,
    });
    capsule(hand, 0.011 * s, 0.026 * s, [x, -0.118 * s, -0.052 * s], skin, {
      rotation: [1.22 * curl, 0, 0], radialSegments: 7, capSegments: 3, roughness: 0.68,
    });
    capsule(hand, 0.0102 * s, 0.017 * s, [x, -0.109 * s, -0.066 * s], skin, {
      rotation: [2.1 * curl, 0, 0], radialSegments: 7, capSegments: 3, roughness: 0.68,
    });
  }
  // Thenar mound, then the thumb laid diagonally across the curled fingers.
  sphere(hand, 0.0195 * s, [side * 0.031 * s, -0.03 * s, -0.024 * s], skinLight, {
    scale: [1, 1.25, 0.92], widthSegments: 9, heightSegments: 7, roughness: 0.68,
  });
  capsule(hand, 0.0136 * s, 0.042 * s, [side * 0.02 * s, -0.056 * s, -0.06 * s], skin, {
    rotation: [0.22, 0, side * 0.55], radialSegments: 9, capSegments: 3, roughness: 0.68,
  });
  sphere(hand, 0.0132 * s, [side * 0.004 * s, -0.08 * s, -0.064 * s], skin, {
    scale: [1.05, 1, 0.95], widthSegments: 8, heightSegments: 6, roughness: 0.68,
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
  // A low stand around the neck, then two pointed lapels that follow the
  // chest slope from the collar down to the placket.
  cylinder(parent, [width * 0.44, width * 0.5], 0.05, [0, y + 0.02, 0.01], color, {
    segments: 18, scale: [1, 1, 0.9], roughness: 0.9,
  });
  for (const side of [-1, 1]) {
    box(parent, [width * 0.44, 0.082, 0.007], [side * width * 0.2, y - 0.052, z], color, {
      rotation: [0.5, side * -0.2, side * 0.52], roughness: 0.9,
    });
    box(parent, [width * 0.38, 0.008, 0.009], [side * width * 0.235, y - 0.055, z - 0.004], trim, {
      rotation: [0.5, side * -0.2, side * 0.52], roughness: 0.92,
    });
  }
}
