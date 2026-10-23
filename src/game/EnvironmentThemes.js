import { ROAD } from '../config.js';

// 1,080 m is about a minute at an 18 m/s cruise, while retaining fair speed scaling.
export const THEME_SECTIONS = 36;
export const THEME_LENGTH = THEME_SECTIONS * ROAD.sectionLength;
export const TRANSITION_TUNNEL_SECTIONS = 2;

export const ENVIRONMENT_THEMES = Object.freeze([
  Object.freeze({
    id: 'colombo', name: 'COLOMBO', subtitle: 'FORT, LOTUS TOWER & CITY', roadName: 'GALLE ROAD',
    sky: 0x9fcfd0, fog: 0xa8cfcb, ground: 0x68845a, layout: 'city', landmark: 'colombo', approachLandmark: 'colombo-fort', featureLandmark: 'colombo-lotus',
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
    id: 'kandy', name: 'KANDY', subtitle: 'MISTY HILLS, TEMPLE & LAKE', roadName: 'DALADA VIDIYA',
    sky: 0x9dbbb5, fog: 0x9fb8ac, ground: 0x4f7b4d, layout: 'hill', landmark: 'kandy', fogNear: 52, fogFar: 185,
  }),
  Object.freeze({
    id: 'kadugannawa', name: 'KADUGANNAWA', subtitle: 'HILL COUNTRY TUNNELS', roadName: 'KANDY ROAD',
    sky: 0x91afa9, fog: 0x93aa9c, ground: 0x456f46, layout: 'rail', landmark: 'railway', tunnelSections: Object.freeze([4, 5]), fogNear: 48, fogFar: 175,
  }),
  Object.freeze({
    id: 'nuwara-eliya', name: 'NUWARA ELIYA', subtitle: 'TEA GARDENS', roadName: 'BADULLA ROAD',
    sky: 0xa8c6bd, fog: 0xadc2b3, ground: 0x4f8249, layout: 'tea', landmark: 'tea', fogNear: 58, fogFar: 205,
  }),
  Object.freeze({
    id: 'ella', name: 'ELLA', subtitle: 'NINE ARCHES & RAIL', roadName: 'WELLAWAYA ROAD',
    sky: 0x94b6ae, fog: 0x9db3a3, ground: 0x467746, layout: 'rail', landmark: 'nine-arches', tunnelSections: Object.freeze([3, 4]), fogNear: 52, fogFar: 190,
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
    id: 'anuradhapura', name: 'ANURADHAPURA', subtitle: 'HOT FOREST, ELEPHANTS & STUPA', roadName: 'SACRED CITY ROAD',
    sky: 0xe6c994, fog: 0xd9bc87, ground: 0x887643, layout: 'ancient', landmark: 'anuradhapura', fogNear: 88, fogFar: 232,
  }),
  Object.freeze({
    id: 'polonnaruwa', name: 'POLONNARUWA', subtitle: 'ANCIENT RUINS & STUPA', roadName: 'ANCIENT CITY ROAD',
    sky: 0xd5c49b, fog: 0xcab98f, ground: 0x7f8754, layout: 'ancient', landmark: 'polonnaruwa', fogNear: 82, fogFar: 250,
  }),
  Object.freeze({
    id: 'jaffna', name: 'JAFFNA', subtitle: 'FORT, LIBRARY & PALMYRAH', roadName: 'KKS ROAD',
    sky: 0xc4d0b5, fog: 0xc6c6a5, ground: 0x90905a, layout: 'palmyrah', landmark: 'jaffna',
  }),
  Object.freeze({
    id: 'trincomalee', name: 'TRINCOMALEE', subtitle: 'HARBOUR & KONESWARAM', roadName: 'COAST ROAD',
    sky: 0x8fcbd5, fog: 0xa9d2cf, ground: 0x758d5e, layout: 'coast', landmark: 'trincomalee',
  }),
]);

export function isTransitionTunnelSection(localIndex) {
  return localIndex >= THEME_SECTIONS - TRANSITION_TUNNEL_SECTIONS;
}

export function isThemeTunnel(theme, localIndex) {
  return isTransitionTunnelSection(localIndex) || Boolean(theme.tunnelSections?.includes(localIndex));
}

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
