import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ENVIRONMENT_THEMES } from '../src/game/EnvironmentThemes.js';
import { createDistrictLandmark } from '../src/art/Landmarks.js';
import { createBackdrop, createTree } from '../src/art/Environment.js';
import { createSriLankanRoadside } from '../src/art/Roadside.js';
import { createSchoolboy } from '../src/art/Schoolboy.js';
import { batchStaticGroup } from '../src/art/StaticBatcher.js';
import { box, configureSurfaceQuality, getMeshKitStats, sphere } from '../src/art/MeshKit.js';
import { WorldGenerator } from '../src/game/WorldGenerator.js';

function renderStats(root) {
  let meshes = 0;
  let shadows = 0;
  const signature = [];
  root.traverse((node) => {
    if (node.castShadow || node.receiveShadow) shadows += 1;
    if (!node.isMesh) return;
    meshes += 1;
    signature.push(`${node.geometry.type}:${node.material?.color?.getHexString?.() || 'none'}`);
  });
  return { meshes, shadows, signature: signature.join('|') };
}

test('fourteen districts have bounded local backdrops, six kinds of roadside detail and unique approaches', () => {
  const backdropSignatures = new Set();
  const roadsideKinds = new Set();
  for (const theme of ENVIRONMENT_THEMES) {
    const backdrop = createBackdrop(theme.id);
    const backdropStats = renderStats(backdrop);
    assert.equal(backdrop.userData.backdrop, theme.id);
    assert.ok(backdropStats.meshes >= 5, `${theme.id} backdrop too sparse`);
    assert.equal(backdropStats.shadows, 0);
    backdropSignatures.add(backdropStats.signature);

    const roadside = createSriLankanRoadside(theme.id, 1);
    assert.equal(roadside.userData.sriLankanRoadside, theme.id);
    assert.ok(renderStats(roadside).meshes >= 5, `${theme.id} roadside detail missing`);
    assert.equal(renderStats(roadside).shadows, 0);
    roadsideKinds.add(roadside.name);

    for (const id of [theme.landmark, theme.approachLandmark].filter(Boolean)) {
      const model = createDistrictLandmark(id);
      assert.equal(model.userData.landmark, id);
      assert.ok(renderStats(model).meshes >= 10, `${id} lacks modeled detail`);
      assert.equal(renderStats(model).shadows, 0);
    }
  }
  assert.ok(backdropSignatures.size >= 10, 'district backdrops are too visually similar');
  assert.ok(roadsideKinds.size >= 6);
});

test('organic schoolboy and layered tree geometry replace block figures without shadows', () => {
  const boy = createSchoolboy();
  assert.equal(boy.userData.anatomy, 'lathe-torso-capsule-limbs-shaped-head');
  const stats = renderStats(boy);
  let vertices = 0;
  boy.traverse((node) => { if (node.isMesh) vertices += node.geometry.attributes.position.count; });
  assert.ok(stats.meshes >= 12, 'articulated body parts were not retained');
  assert.ok(vertices >= 5000, 'organic anatomy lacks smooth geometric detail');
  assert.equal(stats.shadows, 0);
  boy.traverse((node) => assert.notEqual(node.geometry?.type, 'BoxGeometry'));
  for (const joint of ['leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle', 'head']) {
    assert.ok(boy.userData.joints[joint], `${joint} joint missing`);
  }

  const tree = createTree(1.1, 2);
  assert.equal(tree.userData.vegetation, 'branched-canopy');
  let canopyClusters = 0;
  tree.traverse((node) => { if (node.geometry?.type === 'IcosahedronGeometry') canopyClusters += 1; });
  assert.ok(canopyClusters >= 7);
  assert.equal(renderStats(tree).shadows, 0);
});

test('shadow-free mesh defaults, configurable anisotropy and frozen static matrices reduce render work', () => {
  configureSurfaceQuality({ anisotropy: 8, bump: false });
  assert.equal(getMeshKitStats().anisotropy, 8);
  assert.equal(getMeshKitStats().bumpMapping, false);
  const source = new THREE.Group();
  box(source, [1, 1, 1], [0, 0.5, 0], 0x456789);
  sphere(source, 0.5, [1, 0.5, 0], 0xabcdef);
  const batched = batchStaticGroup(source, { freeze: true });
  let frozen = 0;
  batched.traverse((node) => {
    if (!node.isMesh) return;
    assert.equal(node.castShadow, false);
    assert.equal(node.receiveShadow, false);
    assert.equal(node.matrixAutoUpdate, false);
    frozen += 1;
  });
  assert.ok(frozen > 0);
  configureSurfaceQuality({ anisotropy: 4, bump: true });
});

test('world begins with Colombo Fort approach, welcome sign and frozen shadow-free scenery', () => {
  const scene = new THREE.Scene();
  const world = new WorldGenerator(scene);
  world.reset();
  const approach = world.sections.find((section) => section.userData.approachLandmark === 'colombo-fort');
  assert.ok(approach);
  let gateways = 0;
  let frozenMeshes = 0;
  world.group.traverse((node) => {
    assert.equal(Boolean(node.castShadow || node.receiveShadow), false);
    if (node.userData.gateway === 'colombo') gateways += 1;
    if (node.isMesh && node.userData.batchOwnedGeometry && !node.matrixAutoUpdate) frozenMeshes += 1;
  });
  assert.equal(gateways, 1);
  assert.ok(frozenMeshes > 20);
  assert.equal(world.getStats().activeSections, 9);
  assert.equal(world.getStats().activeSceneryGroups, 9);
});
