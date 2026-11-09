import * as THREE from 'three';
import { capsule, cone, material, sphere } from './MeshKit.js';
import { batchArticulatedModel } from './StaticBatcher.js';

const SKIN = 0x777a70;
const SKIN_DARK = 0x60675e;
const IVORY = 0xe8d9b4;

function trunkGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -0.55, 0.18),
    new THREE.Vector3(0, -1.2, 0.2),
    new THREE.Vector3(0, -1.75, 0.45),
    new THREE.Vector3(0.08, -1.9, 0.88),
  ]);
  const rings = 28;
  const sides = 14;
  const frames = curve.computeFrenetFrames(rings, false);
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    const point = curve.getPointAt(t);
    const radius = THREE.MathUtils.lerp(0.23, 0.095, t) * (1 + Math.sin(t * 28) * 0.018);
    for (let side = 0; side <= sides; side += 1) {
      const angle = side / sides * Math.PI * 2;
      const normal = frames.normals[ring].clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[ring], Math.sin(angle));
      const vertex = point.clone().addScaledVector(normal, radius);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(side / sides, t * 3);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function earGeometry(side) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.65);
  shape.bezierCurveTo(side * 0.75, 1.05, side * 1.18, 0.45, side * 1.02, -0.25);
  shape.bezierCurveTo(side * 0.88, -0.85, side * 0.3, -1.02, 0, -0.55);
  shape.bezierCurveTo(side * 0.16, -0.1, side * 0.12, 0.35, 0, 0.65);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.075, bevelEnabled: true, bevelSegments: 2, steps: 1,
    bevelSize: 0.045, bevelThickness: 0.035, curveSegments: 8,
  });
  geometry.center();
  return geometry;
}

export function createElephant(variant = 0) {
  const root = new THREE.Group();
  root.userData.elephant = true;
  const skinOptions = { roughness: 0.96, surface: 'stone' };
  sphere(root, 1, [0, 2.15, 0], SKIN, { ...skinOptions, scale: [1.28, 1.02, 1.72], widthSegments: 28, heightSegments: 18 });
  sphere(root, 1, [0, 2.45, 0.55], SKIN, { ...skinOptions, scale: [1.12, 0.92, 1.08], widthSegments: 24, heightSegments: 16 });

  const legs = [];
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.76, 1.65, front * 0.95);
      root.add(leg);
      capsule(leg, 0.29, 0.85, [0, -0.58, 0], SKIN, { ...skinOptions, radialSegments: 16, capSegments: 6, scale: [1, 1, 0.92] });
      sphere(leg, 0.34, [0, -1.22, 0.07], SKIN_DARK, { scale: [1, 0.52, 1.18], widthSegments: 18, heightSegments: 10 });
      if (front > 0) {
        for (const toe of [-1, 0, 1]) sphere(leg, 0.075, [toe * 0.14, -1.3, 0.34], IVORY, { scale: [1, 0.55, 0.45], widthSegments: 10, heightSegments: 6 });
      }
      legs.push(leg);
    }
  }

  const head = new THREE.Group();
  head.position.set(0, 2.55, 1.35);
  root.add(head);
  sphere(head, 1, [0, 0, 0], SKIN, { ...skinOptions, scale: [0.78, 0.86, 0.72], widthSegments: 28, heightSegments: 18 });
  sphere(head, 1, [0, 0.46, 0.22], SKIN, { ...skinOptions, scale: [0.63, 0.48, 0.56], widthSegments: 24, heightSegments: 14 });
  for (const side of [-1, 1]) {
    sphere(head, 0.105, [side * 0.49, 0.13, 0.54], 0x1d241f, { scale: [1, 0.8, 0.55], widthSegments: 14, heightSegments: 10 });
    sphere(head, 0.028, [side * 0.5, 0.16, 0.6], 0xf4eee0, { widthSegments: 10, heightSegments: 8 });
    cone(head, 0.085, 0.72, [side * 0.36, -0.42, 0.68], IVORY, { segments: 14, rotation: [-1.12, 0, side * 0.08] });
  }

  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.67, 0.05, -0.04);
    head.add(ear);
    const mesh = new THREE.Mesh(earGeometry(side), material(SKIN_DARK, { ...skinOptions, side: THREE.DoubleSide }));
    mesh.userData.batchOwnedGeometry = true;
    mesh.position.x = side * 0.43;
    mesh.rotation.y = side * -0.2;
    ear.add(mesh);
    ears.push(ear);
  }

  const trunk = new THREE.Group();
  trunk.position.set(0, -0.25, 0.57);
  head.add(trunk);
  const trunkMesh = new THREE.Mesh(trunkGeometry(), material(SKIN, skinOptions));
  trunkMesh.userData.batchOwnedGeometry = true;
  trunk.add(trunkMesh);

  const tail = new THREE.Group();
  tail.position.set(0, 2.35, -1.58);
  root.add(tail);
  capsule(tail, 0.055, 0.85, [0, -0.48, -0.1], SKIN_DARK, { radialSegments: 10, capSegments: 4, rotation: [0.22, 0, 0] });
  sphere(tail, 0.12, [0, -0.98, -0.2], 0x3f4640, { scale: [0.8, 1.3, 0.8], widthSegments: 12, heightSegments: 8 });

  batchArticulatedModel(root, new Set([head, trunk, tail, ...ears, ...legs]));
  root.userData.joints = { head, trunk, tail, ears, legs };
  root.userData.phase = variant * 1.73;
  root.userData.baseY = 0;
  return root;
}

export function updateElephant(elephant, time) {
  const { head, trunk, tail, ears, legs } = elephant.userData.joints;
  const phase = elephant.userData.phase;
  const slow = time * 1.15 + phase;
  head.rotation.x = Math.sin(slow * 0.55) * 0.045;
  head.rotation.y = Math.sin(slow * 0.32) * 0.055;
  trunk.rotation.x = Math.sin(slow) * 0.13;
  trunk.rotation.z = Math.sin(slow * 0.72) * 0.09;
  tail.rotation.z = Math.sin(slow * 1.35) * 0.2;
  ears[0].rotation.y = -0.12 + Math.sin(slow * 1.6) * 0.2;
  ears[1].rotation.y = 0.12 - Math.sin(slow * 1.6) * 0.2;
  for (let index = 0; index < legs.length; index += 1) {
    legs[index].rotation.x = Math.sin(slow * 0.65 + (index % 2) * Math.PI) * 0.035;
  }
  elephant.position.y = elephant.userData.baseY + Math.sin(slow * 0.65) * 0.018;
}
