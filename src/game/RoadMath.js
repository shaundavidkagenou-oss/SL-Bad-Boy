import { ROAD } from '../config.js';

export function advanceSectionCenter(center, travel) {
  let next = center + travel;
  if (next > ROAD.recycleZ) next -= ROAD.sectionLength * ROAD.sectionCount;
  return next;
}

export function areSectionsContinuous(centers) {
  const sorted = [...centers].sort((a, b) => a - b);
  return sorted.every((center, index) => index === 0
    || Math.abs((center - sorted[index - 1]) - ROAD.sectionLength) < 0.0001);
}
