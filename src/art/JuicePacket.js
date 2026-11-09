import * as THREE from 'three';
import { capsule, cylinder, label, roundedBox, sphere } from './MeshKit.js';
import { batchStaticGroup } from './StaticBatcher.js';

const HALO_GEOMETRY = new THREE.TorusGeometry(0.48, 0.018, 5, 28);
const HALO_MATERIAL = new THREE.MeshBasicMaterial({
  color: 0xffd45c, transparent: true, opacity: 0.58, depthWrite: false,
  blending: THREE.AdditiveBlending, toneMapped: false,
});

/** Original mango juice packet: a rare, emissive revive pickup with no dynamic light. */
export function createJuicePacket() {
  const root = new THREE.Group();
  root.name = 'Rare mango juice revive packet';
  roundedBox(root, [0.46, 0.66, 0.17], [0, 0, 0], 0xf2a72e, {
    radius: 0.045, segments: 2, roughness: 0.5, emissive: 0x9b4c0c, emissiveIntensity: 0.6,
  });
  roundedBox(root, [0.47, 0.075, 0.18], [0, 0.31, 0], 0xffdf78, { radius: 0.018 });
  roundedBox(root, [0.47, 0.055, 0.18], [0, -0.31, 0], 0xd77b24, { radius: 0.015 });
  label(root, 'MANGO\nJUICE', [0.39, 0.27], [0, 0.075, 0.092], {
    background: '#fff1b0', foreground: '#6c2f25', border: '#f6c54d', fontSize: 43,
  });
  sphere(root, 1, [0, -0.18, 0.102], 0xffc434, {
    scale: [0.105, 0.085, 0.025], widthSegments: 12, heightSegments: 8,
    emissive: 0xff9b24, emissiveIntensity: 0.85,
  });
  capsule(root, 0.022, 0.1, [0.085, -0.11, 0.11], 0x38825b, {
    rotation: [0, 0, -0.7], radialSegments: 6, capSegments: 2,
  });
  cylinder(root, [0.055], 0.055, [0.13, 0.375, 0], 0xfff4d6, { segments: 12 });
  capsule(root, 0.018, 0.24, [0.16, 0.51, 0], 0xf4eee0, {
    rotation: [0, 0, -0.18], radialSegments: 6, capSegments: 2,
  });
  const halo = new THREE.Mesh(HALO_GEOMETRY, HALO_MATERIAL);
  halo.position.z = -0.08;
  halo.scale.set(0.86, 1.15, 1);
  halo.userData.noBatch = true;
  root.add(halo);
  root.userData.pickupHalo = halo;
  return batchStaticGroup(root);
}
