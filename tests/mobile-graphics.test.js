import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { box, label } from '../src/art/MeshKit.js';
import { batchStaticGroup, disposeBatchedGeometry, getStaticBatchStats } from '../src/art/StaticBatcher.js';
import { createObstacleModel } from '../src/art/Vehicles.js';
import { VisualEffects } from '../src/game/VisualEffects.js';
import { GraphicsPipeline, isSoftwareRenderer } from '../src/game/GraphicsPipeline.js';

test('static batching preserves source colors in bounded vertex-color materials', () => {
  const root = new THREE.Group();
  box(root, [1, 1, 1], [-2, 0.5, 0], 0xd64045, { roughness: 0.8 });
  box(root, [1, 2, 1], [0, 1, 0], 0x3b78c5, { roughness: 0.82 });
  box(root, [1, 1, 2], [2, 0.5, 0], 0x57a35a, { roughness: 0.86 });
  label(root, 'ORIGINAL SIGN', [2, 0.5], [0, 3, 0]);
  batchStaticGroup(root);
  const meshes = root.children.filter((child) => child.isMesh && child.userData.batchOwnedGeometry);
  assert.equal(meshes.length, 1);
  assert.equal(meshes[0].userData.batchSize, 3);
  assert.equal(meshes[0].material.vertexColors, true);
  assert.ok(meshes[0].geometry.attributes.color.count > 0);
  assert.equal(root.children.some((child) => child.userData.text === 'ORIGINAL SIGN'), true);
  assert.ok(getStaticBatchStats().sharedMaterials > 0);

  let disposed = 0;
  meshes[0].geometry.addEventListener('dispose', () => { disposed += 1; });
  disposeBatchedGeometry(root);
  disposeBatchedGeometry(root);
  assert.equal(disposed, 1, 'owned geometry must be disposed exactly once');
});

test('vehicle optimization retains independent wheel assemblies and labels', () => {
  const bus = createObstacleModel('private-bus', 2);
  assert.equal(bus.userData.wheels.length, 4);
  for (const wheel of bus.userData.wheels) {
    assert.equal(wheel.parent, bus);
    assert.ok(wheel.userData.radius > 0);
    let pieces = 0;
    wheel.traverse((node) => { if (node.isMesh) pieces += 1; });
    assert.equal(pieces, 2, 'two hub pieces batch without joining independent wheel rotation');
  }
  let busMeshes = 0;
  bus.traverse((node) => { if (node.isMesh) busMeshes += 1; });
  assert.equal(busMeshes, 14, 'bus retains detail with four fewer wheel draws');
  let merged = 0;
  bus.traverse((node) => {
    if (node.userData.batchOwnedGeometry) merged += 1;
  });
  assert.ok(merged > 0);
  disposeBatchedGeometry(bus);
});

test('visual effect pools overwrite old particles and never allocate extra geometry', () => {
  const scene = new THREE.Scene();
  const effects = new VisualEffects(scene, { capacity: 16, speedLines: 4 });
  const player = {
    group: { position: new THREE.Vector3(0, 0, 4) },
    scooterActive: false,
    sliding: false,
  };
  const geometry = effects.geometry;
  const lineGeometry = effects.lineGeometry;
  for (let index = 0; index < 30; index += 1) effects.coin(player.group.position);
  assert.equal(effects.getStats().active, 16);
  assert.equal(effects.getStats().capacity, 16);
  player.group.position.y = 1;
  effects.update(1 / 60, 14, player, 'running', 1);
  const settledColorUploads = effects.getStats().colorUploads;
  for (let index = 0; index < 119; index += 1) effects.update(1 / 60, 14, player, 'running', 1);
  assert.equal(effects.getStats().colorUploads, settledColorUploads,
    'unchanged particle colors must not be uploaded every frame');
  assert.equal(effects.geometry, geometry);
  assert.equal(effects.lineGeometry, lineGeometry);
  assert.equal(effects.getStats().geometries, 2);
  player.scooterActive = true;
  const police = { group: { visible: true, position: new THREE.Vector3(1, 0, 5) } };
  const entries = [{ type: 'obstacle', kind: 'public-bus', spec: { depth: 6.52 },
    mesh: { position: new THREE.Vector3(0, 0, -8) } }];
  effects.update(1 / 60, 140, player, 'running', 1, police, entries);
  assert.equal(effects.lines.visible, true);
  assert.ok(effects.getStats().exhaustEmitted > 0, 'Leyland bus must emit pooled exhaust');
  assert.ok(effects.getStats().policeDustEmitted > 0, 'officer slippers must kick up pooled dust');
  effects.reset(player);
  assert.equal(effects.getStats().active, 0);
  assert.equal(effects.lines.visible, false);
  assert.equal(effects.geometry, geometry);
});

test('software GPU detection uses capability strings and tolerates restricted contexts', () => {
  const mock = (description, available = true) => ({
    getContext: () => ({
      getExtension: () => available ? { UNMASKED_RENDERER_WEBGL: 1 } : null,
      getParameter: () => description,
    }),
  });
  assert.equal(isSoftwareRenderer(mock('ANGLE (Google, Vulkan SwiftShader)')), true);
  assert.equal(isSoftwareRenderer(mock('Mesa llvmpipe')), true);
  assert.equal(isSoftwareRenderer(mock('NVIDIA GeForce GTX 1660 SUPER')), false);
  assert.equal(isSoftwareRenderer(mock('WebKit WebGL', false)), false);
  assert.equal(isSoftwareRenderer({ getContext: () => { throw new Error('blocked'); } }), false);
});

test('visible sunset disc stays low in the forward sky in every rendering tier', () => {
  const pipeline = new GraphicsPipeline({ getPixelRatio: () => 1 }, new THREE.Scene(),
    new THREE.PerspectiveCamera(), { software: true });
  const direction = pipeline.sky.material.uniforms.sunDirection.value;
  assert.ok(direction.y > 0.04 && direction.y < 0.12, `sun elevation was ${direction.y}`);
  assert.ok(direction.z < -0.9 && Math.abs(direction.x) > 0.1);
  assert.match(pipeline.sky.material.fragmentShader, /smoothstep\(0\.9982, 0\.99925, sunDot\)/);
  assert.match(pipeline.sky.material.fragmentShader, /horizonHaze/);
});

test('mobile resolution adapts promptly but never drops below its sharpness floor', () => {
  const pipeline = Object.create(GraphicsPipeline.prototype);
  let ratio = 1.5;
  let resized = 0;
  Object.assign(pipeline, {
    renderer: {
      getPixelRatio: () => ratio,
      setPixelRatio: (value) => { ratio = value; },
      setSize: () => { resized += 1; },
    },
    composer: null, cinematicPass: null, postprocessing: false,
    scene: { environment: null }, environmentTarget: null, clouds: [],
    coarsePointer: true, width: 390, height: 844,
    frameTime: 0, frameCount: 0, slowWindows: 0, adaptations: 0,
    performanceMode: true, minimumPixelRatio: 0.85, quality: 'performance-mobile',
  });
  for (let frame = 0; frame < 60; frame += 1) pipeline.adapt(0.03);
  assert.ok(Math.abs(ratio - 1.35) < 0.00001);
  assert.equal(resized, 1);
  assert.equal(pipeline.quality, 'adaptive-resolution');
  assert.equal(pipeline.adaptations, 1);
  for (let frame = 0; frame < 600; frame += 1) pipeline.adapt(0.03);
  assert.equal(ratio, 0.85);
  assert.ok(ratio >= pipeline.minimumPixelRatio);
});

test('desktop slow-frame fallback removes effects before resolution and never goes below native CSS pixels', () => {
  const pipeline = Object.create(GraphicsPipeline.prototype);
  let ratio = 1.25;
  let composerDisposed = 0;
  let bloomDisposed = 0;
  let gradeDisposed = 0;
  let environmentDisposed = 0;
  Object.assign(pipeline, {
    renderer: { getPixelRatio: () => ratio },
    applyPixelRatio: (value) => { ratio = value; },
    composer: { dispose: () => { composerDisposed += 1; } },
    bloomPass: { enabled: true, dispose: () => { bloomDisposed += 1; } },
    cinematicPass: { dispose: () => { gradeDisposed += 1; } },
    postprocessing: true, coarsePointer: false,
    scene: { environment: {} }, environmentTarget: { dispose: () => { environmentDisposed += 1; } },
    clouds: [{ visible: true }], frameTime: 0, frameCount: 0, slowWindows: 0,
    adaptations: 0, performanceMode: false, minimumPixelRatio: 1, quality: 'high-desktop',
  });
  for (let frame = 0; frame < 60; frame += 1) pipeline.adapt(0.03);
  assert.equal(pipeline.bloomPass.enabled, false);
  assert.equal(pipeline.quality, 'adaptive-grade');
  assert.equal(ratio, 1.25, 'bloom fallback must not blur the scene');
  for (let frame = 0; frame < 60; frame += 1) pipeline.adapt(0.03);
  assert.equal(pipeline.postprocessing, false);
  assert.equal(pipeline.quality, 'adaptive-direct');
  assert.deepEqual([composerDisposed, bloomDisposed, gradeDisposed], [1, 1, 1]);
  assert.equal(ratio, 1.25, 'direct fallback must still retain native resolution');
  for (let frame = 0; frame < 60; frame += 1) pipeline.adapt(0.03);
  assert.equal(pipeline.performanceMode, true);
  assert.equal(pipeline.quality, 'performance-desktop');
  assert.equal(environmentDisposed, 1);
  assert.equal(ratio, 1.25, 'distance/reflection fallback still precedes resolution');
  for (let frame = 0; frame < 600; frame += 1) pipeline.adapt(0.03);
  assert.equal(ratio, 1);
  assert.ok(ratio >= pipeline.minimumPixelRatio);
});
