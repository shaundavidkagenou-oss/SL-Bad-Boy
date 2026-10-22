import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ENVIRONMENT_THEMES } from '../src/game/EnvironmentThemes.js';
import { createDistrictLandmark } from '../src/art/Landmarks.js';
import { createBackdrop, createTree } from '../src/art/Environment.js';
import { createSriLankanRoadside } from '../src/art/Roadside.js';
import { createSchoolboy } from '../src/art/Schoolboy.js';
import { batchStaticGroup, disposeBatchedGeometry } from '../src/art/StaticBatcher.js';
import { box, configureSurfaceQuality, getMeshKitStats, sphere } from '../src/art/MeshKit.js';
import { WorldGenerator } from '../src/game/WorldGenerator.js';
import { createDistrictSideFill } from '../src/art/DistrictDetail.js';
import { createElephant, updateElephant } from '../src/art/Elephant.js';

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

    for (const id of [theme.landmark, theme.approachLandmark, theme.featureLandmark].filter(Boolean)) {
      const model = createDistrictLandmark(id);
      assert.equal(model.userData.landmark, id);
      assert.ok(renderStats(model).meshes >= 10, `${id} lacks modeled detail`);
      assert.equal(renderStats(model).shadows, 0);
    }
  }
  assert.ok(backdropSignatures.size >= 10, 'district backdrops are too visually similar');
  assert.ok(roadsideKinds.size >= 6);
});

test('continuous skinned schoolboy and layered tree geometry replace assembled block figures', () => {
  const boy = createSchoolboy();
  assert.equal(boy.userData.anatomy, 'continuous-skinned-limbs-lathe-torso-shaped-head');
  assert.equal(boy.userData.skinnedLimbs.length, 4);
  assert.equal(boy.userData.shoulders, 'closed-caps-with-rounded-deltoid-joins');
  for (const limb of boy.userData.skinnedLimbs) {
    assert.equal(limb.isSkinnedMesh, true);
    assert.equal(limb.skeleton.bones.length, 3);
    if (limb.userData.continuousLimb === 'arm') {
      assert.equal(limb.userData.closedShoulder, true);
      assert.equal(limb.geometry.userData.shoulderCap, true);
    }
    assert.ok(limb.geometry.attributes.position.count >= 700);
    for (let index = 0; index < limb.geometry.attributes.skinWeight.count; index += 1) {
      const weights = limb.geometry.attributes.skinWeight;
      const sum = weights.getX(index) + weights.getY(index) + weights.getZ(index) + weights.getW(index);
      assert.ok(Math.abs(sum - 1) < 0.00001, 'limb skin weights are not normalized');
    }
  }
  const arm = boy.userData.skinnedLimbs[0];
  const vertexIndex = 400;
  const before = new THREE.Vector3().fromBufferAttribute(arm.geometry.attributes.position, vertexIndex);
  arm.applyBoneTransform(vertexIndex, before);
  boy.userData.joints.leftElbow.rotation.x = 0.65;
  boy.updateMatrixWorld(true);
  arm.skeleton.update();
  const after = new THREE.Vector3().fromBufferAttribute(arm.geometry.attributes.position, vertexIndex);
  arm.applyBoneTransform(vertexIndex, after);
  assert.ok(before.distanceTo(after) > 0.001, 'elbow does not deform the continuous arm');
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
  assert.equal(tree.userData.canopyClusters, 12);
  assert.ok(tree.userData.canopyTriangles <= 1000,
    `near canopy budget was ${tree.userData.canopyTriangles} triangles`);
  let canopyMeshes = 0;
  tree.traverse((node) => {
    if (!node.userData.canopy) return;
    canopyMeshes += 1;
    assert.equal(node.material.vertexColors, true);
    assert.ok(node.geometry.attributes.color, 'combined canopy lost its green palette');
    assert.ok(node.geometry.attributes.position.count > 1000);
  });
  assert.equal(canopyMeshes, 1, 'near crowns must be combined into one mesh');
  assert.equal(renderStats(tree).shadows, 0);

  const background = createTree(1, 2, { background: true });
  assert.equal(background.userData.lod, 'background');
  assert.equal(background.userData.canopyClusters, 7);
  assert.ok(background.userData.canopyTriangles <= 140,
    `background LOD budget was ${background.userData.canopyTriangles} triangles`);

  const grove = new THREE.Group();
  grove.add(createTree(1, 2), createTree(1, 3));
  batchStaticGroup(grove);
  const combined = [];
  grove.traverse((node) => {
    if (node.isMesh && node.material.name === 'Four-tone textured tree canopy') combined.push(node);
  });
  assert.equal(combined.length, 1, 'tree canopies did not share a section draw call');
  assert.equal(combined[0].geometry.attributes.position.count / 3, 1920);
  const palette = new Set();
  const colors = combined[0].geometry.attributes.color;
  for (let index = 0; index < colors.count; index += 1) {
    palette.add([colors.getX(index), colors.getY(index), colors.getZ(index)]
      .map((value) => value.toFixed(4)).join(','));
  }
  assert.equal(palette.size, 4, 'section batching flattened or recolored the canopy palette');
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

test('filled hill terrain, hot forest atmosphere, detailed lotus and animated elephants are local assets', () => {
  const kandy = ENVIRONMENT_THEMES.find((theme) => theme.id === 'kandy');
  const hot = ENVIRONMENT_THEMES.find((theme) => theme.id === 'anuradhapura');
  assert.ok(kandy.fogFar < 200 && kandy.fogNear < 60, 'Kandy needs close hill fog');
  assert.ok(hot.sky !== 0x9fcfd0 && hot.fogFar < 250, 'Anuradhapura needs a hot distinct atmosphere');
  const fill = createDistrictSideFill('kandy', 1, 4);
  let terrain;
  let trees = 0;
  fill.traverse((node) => {
    if (node.userData.sideTerrain) terrain = node;
    if (node.userData.vegetation) trees += 1;
  });
  assert.ok(terrain && terrain.geometry.attributes.position.count > 100);
  assert.ok(trees >= 4);
  const heights = terrain.geometry.attributes.position;
  let maximum = -Infinity;
  for (let index = 0; index < heights.count; index += 1) maximum = Math.max(maximum, heights.getY(index));
  assert.ok(maximum > 4, 'hilltop terrain is still flat');

  const lotus = createDistrictLandmark('colombo-lotus');
  assert.equal(lotus.userData.landmark, 'colombo-lotus');
  assert.ok(renderStats(lotus).meshes >= 30);
  const bounds = new THREE.Box3().setFromObject(lotus);
  assert.ok(bounds.max.y > 17, 'Lotus Tower is not a large skyline feature');

  const elephant = createElephant(2);
  assert.equal(elephant.userData.elephant, true);
  assert.ok(renderStats(elephant).meshes >= 10);
  assert.equal(renderStats(elephant).shadows, 0);
  const trunk = elephant.userData.joints.trunk;
  let trunkMesh;
  trunk.traverse((node) => { if (node.isMesh) trunkMesh = node; });
  assert.ok(trunkMesh.geometry.attributes.position.getX(0) * trunkMesh.geometry.attributes.normal.getX(0)
    + trunkMesh.geometry.attributes.position.getZ(0) * trunkMesh.geometry.attributes.normal.getZ(0) > 0,
  'elephant trunk normals must face outward');
  const before = trunk.rotation.x;
  updateElephant(elephant, 1.25);
  assert.ok(Math.abs(trunk.rotation.x - before) > 0.01, 'elephant trunk is not animated');
  assert.ok(Math.abs(elephant.userData.joints.ears[0].rotation.y) > 0.01);
  let trunkDisposals = 0;
  trunkMesh.geometry.addEventListener('dispose', () => { trunkDisposals += 1; });
  disposeBatchedGeometry(elephant);
  disposeBatchedGeometry(elephant);
  assert.equal(trunkDisposals, 1, 'custom animated geometry must be disposed exactly once');

  const world = new WorldGenerator(new THREE.Scene());
  world.buildScenery(world.sections[0], 363);
  assert.equal(world.sections[0].userData.animatedScenery.length, 1);
  assert.doesNotThrow(() => world.update(1 / 60, 0));
  assert.equal(world.getStats().animatedElephants, 1);
});
