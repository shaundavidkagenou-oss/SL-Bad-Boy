import * as THREE from 'three';

const palettes = new Map();

/** Cached dusk palettes retain district identity without rebuilding colors per frame. */
export function eveningPalette(theme) {
  if (palettes.has(theme.id)) return palettes.get(theme.id);
  const hot = ['ancient', 'palmyrah'].includes(theme.layout);
  const mist = ['hill', 'rail', 'tea'].includes(theme.layout);
  const coast = ['coast', 'fort'].includes(theme.layout);
  const skyBase = hot ? 0x513846 : mist ? 0x26384e : coast ? 0x1f3c58 : 0x243b58;
  const fogBase = hot ? 0x715765 : mist ? 0x465b6c : coast ? 0x485f74 : 0x4c6072;
  // "Colombo After Hours": the city districts run deep into the night, while
  // ancient/hill districts keep a later, softer dusk. Values are 0..1 night mix.
  const nightByLayout = {
    city: 0.92, market: 0.88, garden: 0.62, suburb: 0.5, fort: 0.72, coast: 0.66,
    hill: 0.55, rail: 0.6, tea: 0.5, ancient: 0.34, palmyrah: 0.46,
  };
  const night = theme.night ?? nightByLayout[theme.layout] ?? 0.55;
  const nightSky = hot ? 0x120d1c : mist ? 0x0a111c : coast ? 0x081524 : 0x0a1424;
  const nightFog = hot ? 0x1c1424 : mist ? 0x101a26 : coast ? 0x0d1a2a : 0x111c2c;
  const palette = Object.freeze({
    night,
    nightSky: 0x000000 | nightSky,
    nightFog: 0x000000 | nightFog,
    nightSun: new THREE.Color(0x93a9d6),
    nightFill: new THREE.Color(0x35507f),
    nightSunIntensity: 0.62,
    nightHemisphere: 0.5,
    nightExposure: 1.22,
    sky: new THREE.Color(theme.sky).lerp(new THREE.Color(skyBase), 0.88).getHex(),
    fog: new THREE.Color(theme.fog).lerp(new THREE.Color(fogBase), 0.78).getHex(),
    ground: new THREE.Color(theme.ground).lerp(new THREE.Color(hot ? 0x3b3233 : 0x253c36), 0.76).getHex(),
    fogNear: theme.fogNear,
    fogFar: theme.fogFar,
  });
  palettes.set(theme.id, palette);
  return palette;
}
