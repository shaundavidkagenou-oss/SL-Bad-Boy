import * as THREE from 'three';
import { cylinder, roundedBox, sphere, torus } from './MeshKit.js';
import { batchStaticGroup } from './StaticBatcher.js';

const FIELD_GEOMETRY = new THREE.TorusGeometry(0.72, 0.026, 5, 36);
const FIELD_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0x7fe8ff, transparent: true, opacity: 0.55, depthWrite: false,
  blending: THREE.AdditiveBlending, toneMapped: false,
});

/** Original electromagnet pickup: a horseshoe coil with a cyan field ring. */
export function createMagnetPickup() {
  const root = new THREE.Group();
  root.name = 'Coin magnet pickup';
  const red = 0xc63a2e;
  const steel = 0xc9ced2;
  // Horseshoe: two upright poles joined by a curved crown.
  for (const side of [-1, 1]) {
    roundedBox(root, [0.14, 0.34, 0.14], [side * 0.15, -0.06, 0], red, {
      radius: 0.05, roughness: 0.45, metalness: 0.15,
    });
    roundedBox(root, [0.16, 0.09, 0.16], [side * 0.15, 0.13, 0], steel, {
      radius: 0.03, roughness: 0.3, metalness: 0.6,
    });
    cylinder(root, [0.026], 0.16, [side * 0.15, 0.22, 0], 0x8b6b3f, {
      segments: 8, roughness: 0.9,
    });
  }
  const crown = torus(root, 0.15, 0.07, [0, 0.13, 0], red, {
    arc: Math.PI, rotation: [Math.PI / 2, 0, Math.PI], roughness: 0.45,
  });
  crown.scale.z = 0.9;
  for (const side of [-1, 1]) {
    cylinder(root, [0.035], 0.1, [side * 0.15, -0.24, 0], steel, {
      segments: 8, metalness: 0.55, roughness: 0.3,
    });
  }
  sphere(root, 0.02, [0, 0.01, 0.075], 0x7fe8ff, {
    emissive: 0x49d8ff, emissiveIntensity: 0.9, widthSegments: 8, heightSegments: 6,
  });
  const field = new THREE.Mesh(FIELD_GEOMETRY, FIELD_MATERIAL);
  field.rotation.x = Math.PI / 2;
  field.position.y = -0.02;
  field.userData.noBatch = true;
  root.add(field);
  root.userData.pickupHalo = field;
  return batchStaticGroup(root);
}
