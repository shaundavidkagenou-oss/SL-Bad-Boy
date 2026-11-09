import * as THREE from 'three';
import { box, roundedBox, cylinder, sphere, torus } from './MeshKit.js';
import { batchStaticGroup } from './StaticBatcher.js';

function scooterWheel(parent, z) {
  const wheel = new THREE.Group();
  wheel.position.set(0, 0.34, z);
  wheel.userData.radius = 0.34;
  cylinder(wheel, [0.34], 0.18, [0, 0, 0], 0x11151a, {
    segments: 16, rotation: [0, 0, Math.PI / 2], roughness: 0.9,
  });
  cylinder(wheel, [0.18], 0.2, [0, 0, 0], 0x9ca9ad, {
    segments: 12, rotation: [0, 0, Math.PI / 2], metalness: 0.55,
  });
  cylinder(wheel, [0.055], 0.23, [0, 0, 0], 0x34434a, {
    segments: 10, rotation: [0, 0, Math.PI / 2], metalness: 0.4,
  });
  parent.add(wheel);
  parent.userData.wheels.push(wheel);
  return wheel;
}

/** Original unbranded step-through scooter, facing the runner's forward -Z. */
export function createScooter(color = 0x16877d) {
  const scooter = new THREE.Group();
  scooter.name = 'Sri Lankan street scooter power-up';
  scooter.userData.wheels = [];
  scooterWheel(scooter, -0.82);
  scooterWheel(scooter, 0.78);

  roundedBox(scooter, [0.58, 0.14, 1.25], [0, 0.45, -0.02], 0x26353c, { radius: 0.05 });
  roundedBox(scooter, [0.64, 0.54, 0.82], [0, 0.72, 0.43], color, { radius: 0.13 });
  roundedBox(scooter, [0.62, 0.82, 0.27], [0, 0.86, -0.55], color, { radius: 0.1, rotation: [-0.12, 0, 0] });
  roundedBox(scooter, [0.54, 0.18, 0.68], [0, 0.54, -0.78], color, { radius: 0.08 });
  box(scooter, [0.07, 0.36, 0.78], [-0.32, 0.75, 0.38], 0xf2b841, { rotation: [0, 0, -0.08] });
  box(scooter, [0.07, 0.36, 0.78], [0.32, 0.75, 0.38], 0xf2b841, { rotation: [0, 0, 0.08] });
  roundedBox(scooter, [0.54, 0.16, 0.82], [0, 1.05, 0.34], 0x20262c, { radius: 0.07 });
  box(scooter, [0.46, 0.035, 0.62], [0, 1.14, 0.36], 0x4b555b);

  cylinder(scooter, [0.045], 0.64, [0, 1.03, -0.66], 0x9da9ac, { segments: 8, rotation: [-0.14, 0, 0], metalness: 0.5 });
  cylinder(scooter, [0.045], 0.84, [0, 1.35, -0.72], 0x26343a, { segments: 8, rotation: [0, 0, Math.PI / 2] });
  for (const side of [-1, 1]) {
    cylinder(scooter, [0.025], 0.3, [side * 0.35, 1.49, -0.7], 0x879398, {
      segments: 6, rotation: [0, 0, side * -0.45], metalness: 0.45,
    });
    sphere(scooter, 0.12, [side * 0.43, 1.62, -0.7], 0x9db4b8, { scale: [1.1, 0.8, 0.3], metalness: 0.45 });
    box(scooter, [0.18, 0.07, 0.12], [side * 0.37, 1.35, -0.73], 0x171d22);
  }
  sphere(scooter, 0.18, [0, 1.19, -0.73], 0xffe6a0, {
    scale: [1.15, 0.85, 0.35], emissive: 0xffc957, emissiveIntensity: 1.15,
  });
  sphere(scooter, 0.1, [0, 0.83, 0.88], 0xe34d42, { scale: [1.25, 0.75, 0.35], emissive: 0x8a140c, emissiveIntensity: 0.65 });
  box(scooter, [0.36, 0.18, 0.035], [0, 0.58, 0.93], 0xf1e2a4);
  torus(scooter, 0.37, 0.025, [0, 0.35, -0.82], 0x6e7b80, { rotation: [0, Math.PI / 2, 0], metalness: 0.5 });
  return batchStaticGroup(scooter, { preserve: new Set(scooter.userData.wheels) });
}
