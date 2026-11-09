import * as THREE from 'three';
import { tessellationScale } from './MeshKit.js';

/**
 * One-piece sculpted head.
 *
 * The face used to be a stack of ellipsoids (skull, jaw, chin, cheeks, brow),
 * which always leaves a visible seam where two spheres cross. Here the skull,
 * jaw, cheekbones, brow ridge, eye sockets and skull base are instead formed by
 * a single closed surface: a unit sphere whose radius is displaced by a small
 * field of anisotropic Gaussian bumps. One mesh, one set of smooth normals, so
 * the face is continuous no matter how close the camera gets.
 *
 * Blobs live in unit-sphere space (y up, -z is the face) so the same sculpt can
 * be scaled to any head size.
 */

export const HEAD_EXTENT = [0.285, 0.358, 0.292];
export const HEAD_ORIGIN = [0, 0.245, 0.005];

// p: centre on the unit sphere, s: Gaussian sigma per axis, a: radial amount.
const BLOBS = [
  // Cranium: a gentle forehead and a rounder occiput.
  { p: [0, 0.55, 0.5], s: [0.65, 0.4, 0.45], a: 0.025 },
  { p: [0, 0.12, -0.85], s: [0.95, 0.85, 0.5], a: 0.035 },
  // Brow ridge and the socket hollows under it.
  { p: [0, 0.26, 0.84], s: [0.78, 0.17, 0.32], a: 0.055 },
  { p: [-0.36, 0.05, 0.88], s: [0.3, 0.24, 0.32], a: -0.05 },
  { p: [0.36, 0.05, 0.88], s: [0.3, 0.24, 0.32], a: -0.05 },
  // Cheekbones, then the temples pulling in above them.
  { p: [-0.64, -0.14, 0.56], s: [0.3, 0.26, 0.34], a: 0.038 },
  { p: [0.64, -0.14, 0.56], s: [0.3, 0.26, 0.34], a: 0.038 },
  { p: [-0.84, 0.34, 0.3], s: [0.28, 0.42, 0.42], a: -0.03 },
  { p: [0.84, 0.34, 0.3], s: [0.28, 0.42, 0.42], a: -0.03 },
  // Nose bridge and the soft muzzle above the mouth.
  { p: [0, -0.02, 0.97], s: [0.13, 0.3, 0.2], a: 0.06 },
  { p: [0, -0.3, 0.86], s: [0.4, 0.2, 0.28], a: 0.035 },
  // Jaw: wide at the gonial angle, then forward into the chin.
  { p: [0, -0.5, 0.12], s: [0.9, 0.5, 0.9], a: 0.05 },
  { p: [-0.58, -0.6, 0.46], s: [0.32, 0.3, 0.34], a: 0.055 },
  { p: [0.58, -0.6, 0.46], s: [0.32, 0.3, 0.34], a: 0.055 },
  { p: [0, -0.84, 0.42], s: [0.55, 0.3, 0.6], a: 0.065 },
  // Skull base tapers in so the head meets the neck instead of ending flat.
  { p: [0, -0.98, 0], s: [0.85, 0.3, 0.9], a: -0.1 },
];

const BLOB_COUNT = BLOBS.length;

/** Radius multiplier for a unit direction. */
function radial(x, y, z) {
  let radius = 1;
  for (let index = 0; index < BLOB_COUNT; index += 1) {
    const blob = BLOBS[index];
    const dx = (x - blob.p[0]) / blob.s[0];
    const dy = (y - blob.p[1]) / blob.s[1];
    const dz = (z - blob.p[2]) / blob.s[2];
    const q = dx * dx + dy * dy + dz * dz;
    if (q < 9) radius += blob.a * Math.exp(-q);
  }
  return radius;
}

/**
 * Hairline on the unit sphere: high across the forehead, dropping to the nape,
 * with the ears carved out and a short sideburn in front of them.
 */
function insideHairline(x, y, z) {
  const ax = Math.abs(x);
  const back = THREE.MathUtils.clamp((z + 0.15) / 0.85, 0, 1);
  // The cut rises towards the sides so the ears stay clear of the hair.
  const side = THREE.MathUtils.smoothstep(ax, 0.4, 0.88);
  const edge = THREE.MathUtils.lerp(0.36 - 0.46 * back, 0.1, side);
  if (y < edge) return ax > 0.82 && y > 0.0 && z < -0.4;
  return true;
}

function buildSurface({
  rings = 40, segments = 52, offset = 0, grow = 0, mask = null,
  extent = HEAD_EXTENT, origin = HEAD_ORIGIN,
} = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const grid = [];
  const [ex, ey, ez] = extent;
  const [cx, cy, cz] = origin;
  for (let ring = 0; ring <= rings; ring += 1) {
    const v = ring / rings;
    const phi = v * Math.PI;
    const sy = Math.cos(phi);
    const sr = Math.sin(phi);
    const row = [];
    for (let segment = 0; segment <= segments; segment += 1) {
      const u = segment / segments;
      const theta = u * Math.PI * 2;
      const ux = sr * Math.sin(theta);
      const uy = sy;
      const uz = -sr * Math.cos(theta);
      const r = radial(ux, uy, uz) * (1 + grow) + offset;
      const keep = mask ? mask(ux, uy, uz, r) : true;
      row.push({ keep, x: ux * r * ex + cx, y: uy * r * ey + cy, z: uz * r * ez + cz });
      positions.push(ux * r * ex + cx, uy * r * ey + cy, uz * r * ez + cz);
      uvs.push(u, 1 - v);
    }
    grid.push(row);
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = grid[ring][segment];
      const b = grid[ring][segment + 1];
      const c = grid[ring + 1][segment];
      const d = grid[ring + 1][segment + 1];
      if (!(a.keep && b.keep && c.keep && d.keep)) continue;
      const i0 = ring * (segments + 1) + segment;
      const i1 = i0 + 1;
      const i2 = i0 + segments + 1;
      const i3 = i2 + 1;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

let cached = null;

/**
 * Sculpted head surfaces plus a height lookup that returns the true z of the
 * face for any (x, y), so eyes, nose, mouth and brows always sit on the skin.
 */
export function sculptedHead() {
  // Low tiers pay per vertex, so the sculpt follows the tessellation setting.
  const scale = Math.max(0.62, tessellationScale());
  const key = Math.round(scale * 100);
  if (cached && cached.key === key) return cached;
  const skin = buildSurface({
    rings: Math.round(56 * scale), segments: Math.round(64 * scale),
  });
  const hair = buildSurface({
    rings: Math.round(52 * scale), segments: Math.round(60 * scale),
    offset: 0.006, grow: 0.014, mask: insideHairline,
  });
  const position = skin.getAttribute('position');
  const front = [];
  for (let index = 0; index < position.count; index += 1) {
    const z = position.getZ(index);
    if (z < HEAD_ORIGIN[2]) {
      front.push(Math.abs(position.getX(index)), position.getY(index), z);
    }
  }
  /**
   * Front-surface z at (x, y). x is mirrored so the two sides of the face are
   * guaranteed to place features at exactly the same depth.
   */
  const faceZ = (x, y) => {
    const ax = Math.abs(x);
    let best = -0.32;
    let bestDistance = Infinity;
    for (let index = 0; index < front.length; index += 3) {
      const dx = front[index] - ax;
      const dy = front[index + 1] - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = front[index + 2];
      }
    }
    return best;
  };
  cached = { key, skin, hair, faceZ };
  return cached;
}
