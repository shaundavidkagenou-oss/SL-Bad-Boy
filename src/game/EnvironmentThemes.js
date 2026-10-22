import { ROAD } from '../config.js';

export const THEME_SECTIONS = 8;
export const THEME_LENGTH = THEME_SECTIONS * ROAD.sectionLength;

export const ENVIRONMENT_THEMES = Object.freeze([
  Object.freeze({
    id: 'colombo', name: 'COLOMBO', subtitle: 'FORT, GALLE FACE & CITY', roadName: 'GALLE ROAD',
    sky: 0x9fcfd0, fog: 0xa8cfcb, ground: 0x68845a, layout: 'city', landmark: 'colombo', approachLandmark: 'colombo-fort',
  }),
  Object.freeze({
    id: 'suburb', name: 'MAHARAGAMA', subtitle: 'SCHOOLS & GARDEN SUBURBS', roadName: 'HIGH LEVEL ROAD',
    sky: 0xb4d9ce, fog: 0xb4d4c3, ground: 0x5f8751, layout: 'suburb', landmark: 'school',
  }),
  Object.freeze({
    id: 'market', name: 'PETTAH', subtitle: 'BAZAAR, MOSQUE & CLOCK TOWER', roadName: 'MAIN STREET',
    sky: 0xa8cbd0, fog: 0xbecbc0, ground: 0x75805a, layout: 'market', landmark: 'pettah', approachLandmark: 'red-mosque',
  }),
  Object.freeze({
    id: 'kotte', name: 'KOTTE', subtitle: 'DIYAWANNA PARLIAMENT', roadName: 'KOTTE ROAD',
    sky: 0xaed8cf, fog: 0xb5d2c2, ground: 0x62895a, layout: 'garden', landmark: 'parliament',
  }),
  Object.freeze({
    id: 'kandy', name: 'KANDY', subtitle: 'TEMPLE & LAKE', roadName: 'DALADA VIDIYA',
    sky: 0xa8cfca, fog: 0xa9c6b5, ground: 0x4f7b4d, layout: 'hill', landmark: 'kandy',
  }),
  Object.freeze({
    id: 'kadugannawa', name: 'KADUGANNAWA', subtitle: 'HILL COUNTRY TUNNELS', roadName: 'KANDY ROAD',
    sky: 0x9fc5c2, fog: 0x9cb9aa, ground: 0x456f46, layout: 'rail', landmark: 'railway', tunnelSections: Object.freeze([4, 5]),
  }),
  Object.freeze({
    id: 'nuwara-eliya', name: 'NUWARA ELIYA', subtitle: 'TEA GARDENS', roadName: 'BADULLA ROAD',
    sky: 0xb4d5ce, fog: 0xb8cec0, ground: 0x4f8249, layout: 'tea', landmark: 'tea',
  }),
  Object.freeze({
    id: 'ella', name: 'ELLA', subtitle: 'NINE ARCHES & RAIL', roadName: 'WELLAWAYA ROAD',
    sky: 0x9dc8c5, fog: 0xa5bfae, ground: 0x467746, layout: 'rail', landmark: 'nine-arches', tunnelSections: Object.freeze([3, 4]),
  }),
  Object.freeze({
    id: 'galle', name: 'GALLE', subtitle: 'FORT & LIGHTHOUSE', roadName: 'RAMPART STREET',
    sky: 0x91ccd3, fog: 0xa8ced0, ground: 0x7d8d62, layout: 'fort', landmark: 'galle',
  }),
  Object.freeze({
    id: 'negombo', name: 'NEGOMBO', subtitle: 'LAGOON & FISH MARKET', roadName: 'COLOMBO ROAD',
    sky: 0x9dd4d5, fog: 0xb4d5ca, ground: 0x758c5b, layout: 'coast', landmark: 'negombo',
  }),
  Object.freeze({
    id: 'anuradhapura', name: 'ANURADHAPURA', subtitle: 'RUWANWELISEYA & SACRED CITY', roadName: 'SACRED CITY ROAD',
    sky: 0xb9d8cf, fog: 0xc4d3ba, ground: 0x7d8b58, layout: 'ancient', landmark: 'anuradhapura',
  }),
  Object.freeze({
    id: 'polonnaruwa', name: 'POLONNARUWA', subtitle: 'ANCIENT RUINS & STUPA', roadName: 'ANCIENT CITY ROAD',
    sky: 0xb4d2c7, fog: 0xc3cfb5, ground: 0x7f8754, layout: 'ancient', landmark: 'polonnaruwa',
  }),
  Object.freeze({
    id: 'jaffna', name: 'JAFFNA', subtitle: 'FORT, LIBRARY & PALMYRAH', roadName: 'KKS ROAD',
    sky: 0xa8d3d1, fog: 0xc0d2bd, ground: 0x90905a, layout: 'palmyrah', landmark: 'jaffna',
  }),
  Object.freeze({
    id: 'trincomalee', name: 'TRINCOMALEE', subtitle: 'HARBOUR & KONESWARAM', roadName: 'COAST ROAD',
    sky: 0x8fcbd5, fog: 0xa9d2cf, ground: 0x758d5e, layout: 'coast', landmark: 'trincomalee',
  }),
]);

export function themeForSequence(sequence) {
  const block = Math.floor(Math.max(0, sequence) / THEME_SECTIONS);
  return ENVIRONMENT_THEMES[block % ENVIRONMENT_THEMES.length];
}

export function themeSectionIndex(sequence) {
  return Math.floor(Math.max(0, sequence)) % THEME_SECTIONS;
}

export function themeForDistance(distance) {
  return themeForSequence(Math.floor(Math.max(0, distance) / ROAD.sectionLength));
}
