export function intersects(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX
    && a.minY <= b.maxY && a.maxY >= b.minY
    && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

export function makeCollider(x, y, z, width, minY, maxY, depth) {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minY: y + minY,
    maxY: y + maxY,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}
