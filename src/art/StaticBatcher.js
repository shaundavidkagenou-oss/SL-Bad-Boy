import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const inverseRoot = new THREE.Matrix4();
const relativeMatrix = new THREE.Matrix4();
const sharedMaterials = new Map();

function renderingMaterial(source) {
  // Combined canopies already carry their palette in the color attribute.
  // Preserve it instead of multiplying every vertex by a second flat color.
  if (source.vertexColors) return { material: source, vertexColors: false };
  if (!source.isMeshStandardMaterial || source.map || source.bumpMap || source.normalMap
    || source.roughnessMap || source.metalnessMap || source.displacementMap
    || (source.emissiveIntensity > 0 && source.emissive?.getHex() !== 0)) {
    return { material: source, vertexColors: false };
  }
  // A few deliberate bands retain matte, satin and glossy responses while
  // allowing different object colors to share one draw call.
  const roughness = source.roughness <= 0.36 ? 0.28 : source.roughness <= 0.68 ? 0.55 : 0.86;
  const metalness = source.metalness <= 0.05 ? 0 : source.metalness <= 0.45 ? 0.25 : 0.65;
  const key = [roughness, metalness, source.side, source.flatShading].join(':');
  if (!sharedMaterials.has(key)) {
    sharedMaterials.set(key, new THREE.MeshStandardMaterial({
      name: `Shared vertex-color surface ${key}`,
      color: 0xffffff,
      vertexColors: true,
      roughness,
      metalness,
      side: source.side,
      flatShading: source.flatShading,
    }));
  }
  return { material: sharedMaterials.get(key), vertexColors: true };
}

function addVertexColor(geometry, color) {
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Combine compatible stationary meshes without flattening animated roots.
 * Original MeshKit geometry remains shared; only merged copies are owned here.
 */
export function batchStaticGroup(root, { preserve = new Set(), freeze = false } = {}) {
  if (!root) return root;
  root.updateMatrixWorld(true);
  inverseRoot.copy(root.matrixWorld).invert();
  const groups = new Map();

  const visit = (node) => {
    if (node !== root && preserve.has(node)) return;
    if (node.isMesh && !node.isSkinnedMesh && !node.userData.noBatch
      && !node.userData.text && !Array.isArray(node.material)
      && !node.material.transparent && node.visible) {
      const batch = renderingMaterial(node.material);
      const attributeKey = Object.entries(node.geometry.attributes)
        .filter(([name]) => name !== 'color')
        .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized}`)
        .sort().join('|');
      const colorKey = batch.vertexColors ? 'generated' : Boolean(node.geometry.attributes.color);
      const key = [batch.material.uuid, batch.vertexColors, colorKey, node.castShadow, node.receiveShadow,
        Boolean(node.geometry.index), attributeKey].join(':');
      if (!groups.has(key)) groups.set(key, { ...batch, meshes: [] });
      groups.get(key).meshes.push(node);
    }
    for (const child of node.children) visit(child);
  };
  for (const child of root.children) visit(child);

  for (const group of groups.values()) {
    const { meshes, material, vertexColors } = group;
    if (meshes.length < 2) continue;
    const copies = [];
    for (const mesh of meshes) {
      const copy = mesh.geometry.clone();
      relativeMatrix.copy(inverseRoot).multiply(mesh.matrixWorld);
      copy.applyMatrix4(relativeMatrix);
      if (vertexColors) addVertexColor(copy, mesh.material.color);
      copies.push(copy);
    }
    const mergedGeometry = mergeGeometries(copies, false);
    copies.forEach((copy) => copy.dispose());
    if (!mergedGeometry) continue;
    const merged = new THREE.Mesh(mergedGeometry, material);
    merged.name = `Batched ${meshes.length} stationary meshes`;
    merged.castShadow = false;
    merged.receiveShadow = false;
    merged.matrixAutoUpdate = false;
    merged.updateMatrix();
    merged.userData.batchOwnedGeometry = true;
    merged.userData.batchSize = meshes.length;
    for (const mesh of meshes) mesh.removeFromParent();
    root.add(merged);
  }

  // Empty construction groups no longer need per-frame matrix traversal.
  const prune = (node) => {
    for (const child of [...node.children]) {
      if (preserve.has(child)) continue;
      prune(child);
      if (!child.isMesh && !child.isLine && !child.isPoints && child.children.length === 0
        && Object.keys(child.userData).length === 0) child.removeFromParent();
    }
  };
  prune(root);
  if (freeze) {
    root.traverse((node) => {
      if (node === root) return;
      node.updateMatrix();
      node.matrixAutoUpdate = false;
    });
  }
  return root;
}

/** Batch each rigid body part independently, retaining every animation joint. */
export function batchArticulatedModel(root) {
  const joints = Object.values(root.userData.joints || {});
  const preserve = new Set(joints);
  for (const joint of joints) batchStaticGroup(joint, { preserve });
  return root;
}

/** Dispose only geometry allocated by this module, never shared MeshKit geometry. */
export function disposeBatchedGeometry(root) {
  root?.traverse((node) => {
    if (node.userData.batchOwnedGeometry) {
      node.geometry.dispose();
      node.userData.batchOwnedGeometry = false;
    }
  });
}

export function getStaticBatchStats() {
  return { sharedMaterials: sharedMaterials.size };
}
