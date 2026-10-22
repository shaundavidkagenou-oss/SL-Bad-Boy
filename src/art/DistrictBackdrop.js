import * as THREE from 'three';
import { box, cone, cylinder, sphere } from './MeshKit.js';
import { createPalmyrah } from './Vegetation.js';

/** Distant, static district silhouette; rebuilt only when the district changes. */
export function createDistrictBackdrop(themeId = 'colombo') {
  const root = new THREE.Group();
  root.name = `${themeId} distant district skyline`;
  root.userData.backdrop = themeId;
  const hill = ['kandy', 'kadugannawa', 'nuwara-eliya', 'ella'].includes(themeId);
  const coast = ['galle', 'negombo', 'trincomalee'].includes(themeId);
  const ancient = ['anuradhapura', 'polonnaruwa'].includes(themeId);
  const suburban = ['suburb', 'kotte'].includes(themeId);
  const z = -207;

  if (coast) {
    box(root, [220, 0.07, 55], [0, -0.02, z - 5], themeId === 'trincomalee' ? 0x3e93a6 : 0x579fa5, {
      surface: 'water',
    });
    for (const x of [-62, 48]) {
      sphere(root, 1.7, [x, 0.5, z + 8], 0x386f7c, { scale: [2.5, 0.4, 0.8] });
      box(root, [2.8, 0.12, 0.65], [x, 0.72, z + 8], 0x71503a);
    }
  } else {
    box(root, [220, 0.12, 45], [0, -0.08, z], hill ? 0x4d7949 : ancient ? 0x818455 : 0x668157);
  }

  if (hill) {
    const hills = [[-74, 34, 0x477b55], [-37, 43, 0x3c704e], [5, 48, 0x356848], [49, 40, 0x417651], [82, 32, 0x4d8057]];
    for (const [x, radius, color] of hills) {
      sphere(root, radius, [x, -8, z - 10 - (Math.abs(x) % 3) * 4], color, {
        widthSegments: 12, heightSegments: 8, scale: [1.3, 0.72, 0.85],
      });
    }
    if (themeId === 'nuwara-eliya' || themeId === 'ella') {
      for (let index = 0; index < 12; index += 1) {
        sphere(root, 2.2, [-58 + index * 10.5, 0.65, z + 12], index % 2 ? 0x3e8248 : 0x4b8d4d, {
          scale: [2.2, 0.45, 1.4], widthSegments: 8, heightSegments: 5,
        });
      }
    }
  } else if (!coast && !ancient) {
    const count = suburban ? 12 : themeId === 'market' ? 23 : 20;
    for (let index = 0; index < count; index += 1) {
      const x = -100 + index * (200 / Math.max(1, count - 1));
      const height = (suburban ? 3.5 : 6) + (index * 7 % (suburban ? 6 : 17));
      const width = suburban ? 6 + (index % 2) : 4.5 + (index % 3);
      box(root, [width, height, 5.5], [x, height / 2, z - (index % 4) * 3],
        [0x9db5a5, 0xc0b898, 0x91a8ad, 0xb5a9b8][index % 4]);
      if (index % 3 === 0) {
        cylinder(root, [0.65], 0.8, [x, height + 0.45, z - (index % 4) * 3], 0x718887, { segments: 8 });
      }
    }
  }

  if (themeId === 'colombo') {
    cylinder(root, [0.65, 1.25], 29, [-38, 14.5, z + 2], 0x9aa9a4, { segments: 12 });
    sphere(root, 3.3, [-38, 30, z + 2], 0x7e9c85, { scale: [1, 0.6, 1] });
    cone(root, 1.1, 7, [-38, 35, z + 2], 0x8a9c96, { segments: 10 });
    for (const x of [37, 51]) {
      box(root, [0.35, 16, 0.35], [x, 8, z + 4], 0x607476);
      box(root, [12, 0.3, 0.3], [x + 5, 15.5, z + 4], 0x607476, { rotation: [0, 0, -0.12] });
    }
  } else if (themeId === 'kandy') {
    box(root, [9, 3.2, 5], [38, 1.7, z + 5], 0xece7d7);
    const roof = cone(root, 6.2, 2, [38, 4.3, z + 5], 0xc49a42, { segments: 4 });
    roof.rotation.y = Math.PI / 4;
  } else if (ancient) {
    const color = themeId === 'anuradhapura' ? 0xeae7d9 : 0xa96c4d;
    cylinder(root, [6.2], 0.5, [43, 0.25, z + 5], color, { segments: 20 });
    sphere(root, 5.7, [43, 3.5, z + 5], color, { scale: [1.15, 0.68, 1.15], widthSegments: 16, heightSegments: 10 });
    cone(root, 0.45, 4.5, [43, 9.2, z + 5], themeId === 'anuradhapura' ? 0xc8a64d : 0x806040, { segments: 10 });
    for (let index = 0; index < 9; index += 1) {
      cylinder(root, [0.22], 3 + (index % 3), [-48 + index * 4.2, 1.5, z + 9], 0xaca088, { segments: 7 });
    }
  } else if (themeId === 'jaffna') {
    for (const x of [-52, -22, 17, 54]) {
      const palm = createPalmyrah(7 + (Math.abs(x) % 3), 0.25);
      palm.position.set(x, 0, z + 7);
      root.add(palm);
    }
    box(root, [16, 4, 6], [34, 2, z + 2], 0xe5decc);
    sphere(root, 2.2, [34, 4.7, z + 2], 0xd2c5ac, { scale: [1, 0.7, 1] });
  } else if (themeId === 'galle') {
    cylinder(root, [1.1, 1.7], 12, [43, 6, z + 3], 0xe9e7da, { segments: 12 });
    cone(root, 1.4, 1.5, [43, 12.7, z + 3], 0x52615e, { segments: 12 });
  }

  return root;
}
