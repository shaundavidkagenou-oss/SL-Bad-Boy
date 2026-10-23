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
  const palette = Object.freeze({
    sky: new THREE.Color(theme.sky).lerp(new THREE.Color(skyBase), 0.88).getHex(),
    fog: new THREE.Color(theme.fog).lerp(new THREE.Color(fogBase), 0.78).getHex(),
    ground: new THREE.Color(theme.ground).lerp(new THREE.Color(hot ? 0x3b3233 : 0x253c36), 0.76).getHex(),
    fogNear: theme.fogNear,
    fogFar: theme.fogFar,
  });
  palettes.set(theme.id, palette);
  return palette;
}
