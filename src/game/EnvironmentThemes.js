export const THEME_SECTIONS = 4;

export const ENVIRONMENT_THEMES = Object.freeze([
  Object.freeze({
    id: 'colombo', name: 'COLOMBO', subtitle: 'CITY STREETS', roadName: 'GALLE ROAD',
    sky: 0x9fcfd0, fog: 0xa8cfcb, ground: 0x68845a,
  }),
  Object.freeze({
    id: 'suburb', name: 'MAHARAGAMA', subtitle: 'GARDEN SUBURBS', roadName: 'HIGH LEVEL ROAD',
    sky: 0xb4d9ce, fog: 0xb4d4c3, ground: 0x5f8751,
  }),
  Object.freeze({
    id: 'market', name: 'PETTAH', subtitle: 'TOWN MARKET', roadName: 'MARKET STREET',
    sky: 0xa8cbd0, fog: 0xbecbc0, ground: 0x75805a,
  }),
]);

export function themeForSequence(sequence) {
  const block = Math.floor(Math.max(0, sequence) / THEME_SECTIONS);
  return ENVIRONMENT_THEMES[block % ENVIRONMENT_THEMES.length];
}

export function themeForDistance(distance) {
  return themeForSequence(Math.floor(Math.max(0, distance) / 30));
}
