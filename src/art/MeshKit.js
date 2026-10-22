import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const materialCache = new Map();
const geometryCache = new Map();
const labelMaterialCache = new Map();
const surfaceTextureCache = new Map();
const surfaceQuality = { bump: true, anisotropy: 4 };
const fallbackLabelMaterial = new THREE.MeshBasicMaterial({ color: 0x213b56, side: THREE.DoubleSide });

export function configureSurfaceQuality({ bump = true, anisotropy = 4 } = {}) {
  surfaceQuality.bump = bump;
  surfaceQuality.anisotropy = anisotropy;
}

export function material(color, options = {}) {
  if (options.surface && typeof document !== 'undefined') return surfaceMaterial(options.surface, color, options);
  const key = JSON.stringify([color, options.roughness ?? 0.82, options.metalness ?? 0,
    options.emissive ?? 0, options.emissiveIntensity ?? 0, options.side ?? THREE.FrontSide,
    options.flatShading ?? false]);
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.82,
      metalness: options.metalness ?? 0,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      side: options.side ?? THREE.FrontSide,
      flatShading: options.flatShading ?? false,
    }));
  }
  return materialCache.get(key);
}

function surfaceTexture(name, bump = false) {
  const cacheKey = `${name}:${bump ? 'height' : 'color'}:${surfaceQuality.anisotropy}`;
  if (surfaceTextureCache.has(cacheKey)) return surfaceTextureCache.get(cacheKey);
  const size = bump ? 256 : 512;
  const densityScale = (size / 256) ** 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = bump ? '#808080' : '#eeeeea';
  context.fillRect(0, 0, size, size);
  let seed = 9137;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const dots = (name === 'asphalt' ? 5200 : name === 'grass' ? 2800 : name === 'foliage' ? 5200 : name === 'water' ? 250 : 950) * densityScale;
  for (let i = 0; i < dots; i += 1) {
    const shade = bump ? 90 + Math.floor(random() * 85) : 155 + Math.floor(random() * 96);
    context.fillStyle = bump
      ? `rgb(${shade},${shade},${shade})`
      : `rgba(${shade},${shade},${shade},${name === 'asphalt' ? 0.38 : 0.2})`;
    const dotSize = name === 'asphalt' ? (random() > 0.92 ? 2 : 1) : 2;
    context.fillRect(random() * size, random() * size, dotSize, dotSize);
  }
  if (name === 'asphalt') {
    // Fine repaired cracks and aggregate remain subtle at running speed.
    for (let crack = 0; crack < 7; crack += 1) {
      let x = random() * size;
      let y = random() * size;
      context.beginPath();
      context.moveTo(x, y);
      for (let part = 0; part < 4; part += 1) {
        x += (random() - 0.5) * 22;
        y += 8 + random() * 14;
        context.lineTo(x, y);
      }
      context.strokeStyle = bump ? 'rgba(45,45,45,.65)' : 'rgba(55,58,56,.2)';
      context.lineWidth = bump ? 1.4 : 0.8;
      context.stroke();
    }
  } else if (name === 'grass') {
    for (let blade = 0; blade < 1100; blade += 1) {
      const x = random() * size;
      const y = random() * size;
      context.strokeStyle = bump ? 'rgba(190,190,190,.45)' : 'rgba(85,115,70,.24)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y + 2);
      context.lineTo(x + (random() - 0.5) * 2, y - 2 - random() * 3);
      context.stroke();
    }
  } else if (name === 'bark') {
    for (let grain = 0; grain < 90 * densityScale; grain += 1) {
      const x = random() * size;
      const y = random() * size;
      context.strokeStyle = bump ? 'rgba(45,45,45,.4)' : 'rgba(70,55,42,.24)';
      context.lineWidth = 0.7 + random();
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(x + 3, y + 8, x - 3, y + 17, x + 1, y + 28);
      context.stroke();
    }
  } else if (name === 'water') {
    for (let wave = 0; wave < 34; wave += 1) {
      const y = random() * size;
      const x = random() * size;
      context.strokeStyle = bump ? 'rgba(210,210,210,.5)' : 'rgba(235,245,235,.22)';
      context.lineWidth = 1 + random();
      context.beginPath();
      context.moveTo(x, y);
      context.bezierCurveTo(x + 12, y - 3, x + 28, y + 3, x + 44, y);
      context.stroke();
    }
  } else if (name === 'roof') {
    for (let y = 0; y <= size; y += 32) {
      context.strokeStyle = bump ? '#4d4d4d' : 'rgba(85,60,48,.32)';
      context.lineWidth = 2;
      context.beginPath(); context.moveTo(0, y); context.lineTo(size, y); context.stroke();
      for (let x = (y / 32) % 2 ? 16 : 0; x <= size; x += 32) {
        context.beginPath(); context.moveTo(x, y); context.lineTo(x, y + 32); context.stroke();
      }
    }
  } else if (name === 'paving') {
    for (let i = 0; i <= size; i += 64) {
      context.strokeStyle = bump ? '#484848' : 'rgba(105,105,100,.48)';
      context.lineWidth = 3;
      context.beginPath(); context.moveTo(i, 0); context.lineTo(i, size); context.stroke();
      context.beginPath(); context.moveTo(0, i); context.lineTo(size, i); context.stroke();
      context.strokeStyle = bump ? '#a8a8a8' : 'rgba(255,255,250,.26)';
      context.lineWidth = 1;
      context.beginPath(); context.moveTo(i + 3, 0); context.lineTo(i + 3, size); context.stroke();
      context.beginPath(); context.moveTo(0, i + 3); context.lineTo(size, i + 3); context.stroke();
    }
  } else if (name === 'plaster') {
    const gradient = context.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, bump ? 'rgba(180,180,180,.12)' : 'rgba(255,255,255,.18)');
    gradient.addColorStop(1, bump ? 'rgba(55,55,55,.12)' : 'rgba(100,92,78,.16)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    for (let stain = 0; stain < 9; stain += 1) {
      const x = random() * size;
      const y = random() * size;
      const radius = 8 + random() * 24;
      const patch = context.createRadialGradient(x, y, 0, x, y, radius);
      patch.addColorStop(0, bump ? 'rgba(70,70,70,.14)' : 'rgba(110,105,90,.1)');
      patch.addColorStop(1, 'rgba(128,128,128,0)');
      context.fillStyle = patch;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `Procedural ${cacheKey}`;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const repeats = name === 'asphalt' ? [2, 9] : name === 'grass' ? [5, 5]
    : name === 'foliage' ? [3, 3] : name === 'bark' ? [2, 5]
      : name === 'water' ? [3, 8] : name === 'roof' ? [3, 2] : [2, 3];
  texture.repeat.set(repeats[0], repeats[1]);
  texture.anisotropy = surfaceQuality.anisotropy;
  if (!bump) texture.colorSpace = THREE.SRGBColorSpace;
  surfaceTextureCache.set(cacheKey, texture);
  return texture;
}

function surfaceMaterial(name, color, options = {}) {
  const defaultRoughness = name === 'water' ? 0.2 : name === 'asphalt' || name === 'grass' ? 0.91 : 0.84;
  const key = `surface:${name}:${color}:${surfaceQuality.bump}:${surfaceQuality.anisotropy}:${options.roughness ?? defaultRoughness}:${options.side ?? THREE.FrontSide}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color,
      map: surfaceTexture(name),
      bumpMap: surfaceQuality.bump ? surfaceTexture(name, true) : null,
      bumpScale: surfaceQuality.bump ? (name === 'water' ? 0.075 : name === 'asphalt' ? 0.055 : 0.035) : 0,
      roughness: options.roughness ?? defaultRoughness,
      metalness: options.metalness ?? (name === 'water' ? 0.12 : 0),
      side: options.side ?? THREE.FrontSide,
      envMapIntensity: name === 'water' ? 1.1 : name === 'asphalt' || name === 'grass' ? 0.32 : 0.5,
      flatShading: options.flatShading ?? false,
    }));
  }
  return materialCache.get(key);
}

function geometry(key, factory) {
  if (!geometryCache.has(key)) geometryCache.set(key, factory());
  return geometryCache.get(key);
}

function finish(mesh, parent, position, rotation, options = {}) {
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

export function box(parent, size, position, color, options = {}) {
  const geo = geometry('box:unit', () => new THREE.BoxGeometry(1, 1, 1));
  const mesh = new THREE.Mesh(geo, material(color, options));
  const extra = options.scale ?? [1, 1, 1];
  mesh.scale.set(size[0] * extra[0], size[1] * extra[1], size[2] * extra[2]);
  return finish(mesh, parent, position, options.rotation, options);
}

export function roundedBox(parent, size, position, color, options = {}) {
  const radius = Math.min(options.radius ?? 0.07, Math.min(...size) * 0.45);
  const segments = options.segments ?? 1;
  const key = `rounded:${size.join(',')}:${segments}:${radius}`;
  const geo = geometry(key, () => new RoundedBoxGeometry(...size, segments, radius));
  return finish(new THREE.Mesh(geo, material(color, options)), parent, position, options.rotation, options);
}

export function cylinder(parent, radii, height, position, color, options = {}) {
  const [top, bottom = top] = radii;
  const segments = options.segments ?? 8;
  const geo = geometry(`cyl:${top},${bottom},${segments}`,
    () => new THREE.CylinderGeometry(top, bottom, 1, segments));
  const mesh = new THREE.Mesh(geo, material(color, options));
  mesh.scale.y = height;
  return finish(mesh, parent, position, options.rotation, options);
}

export function capsule(parent, radius, length, position, color, options = {}) {
  const capSegments = options.capSegments ?? 4;
  const radialSegments = options.radialSegments ?? 10;
  const geo = geometry(`capsule:${radius},${length},${capSegments},${radialSegments}`,
    () => new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments));
  const mesh = new THREE.Mesh(geo, material(color, options));
  const scale = options.scale ?? [1, 1, 1];
  mesh.scale.set(...scale);
  return finish(mesh, parent, position, options.rotation, options);
}

export function sphere(parent, radius, position, color, options = {}) {
  const width = options.widthSegments ?? 8;
  const height = options.heightSegments ?? 6;
  const geo = geometry(`sphere:${width},${height}`, () => new THREE.SphereGeometry(1, width, height));
  const mesh = new THREE.Mesh(geo, material(color, options));
  const scale = options.scale ?? [1, 1, 1];
  mesh.scale.set(radius * scale[0], radius * scale[1], radius * scale[2]);
  return finish(mesh, parent, position, options.rotation, options);
}

export function cone(parent, radius, height, position, color, options = {}) {
  const segments = options.segments ?? 8;
  const geo = geometry(`cone:${segments}`, () => new THREE.ConeGeometry(1, 1, segments));
  const mesh = new THREE.Mesh(geo, material(color, options));
  mesh.scale.set(radius, height, radius);
  return finish(mesh, parent, position, options.rotation, options);
}

export function torus(parent, radius, tube, position, color, options = {}) {
  const arc = options.arc ?? Math.PI * 2;
  const geo = geometry(`torus:${radius},${tube},${arc}`, () => new THREE.TorusGeometry(radius, tube, 6, 16, arc));
  return finish(new THREE.Mesh(geo, material(color, options)), parent, position, options.rotation, options);
}

export function label(parent, text, size, position, options = {}) {
  const background = options.background ?? '#14213d';
  const foreground = options.foreground ?? '#fff8e7';
  const border = options.border ?? '#f4b942';
  const fontFamily = options.fontFamily ?? 'Arial, sans-serif';
  const lines = String(text).split('\n');
  const fontSize = options.fontSize ?? (lines.length > 1 ? 42 : 58);
  if (typeof document === 'undefined') {
    const mesh = new THREE.Mesh(geometry('plane:unit', () => new THREE.PlaneGeometry(1, 1)), fallbackLabelMaterial);
    mesh.userData.text = String(text);
    mesh.userData.fontFamily = fontFamily;
    mesh.scale.set(size[0], size[1], 1);
    return finish(mesh, parent, position, options.rotation, { castShadow: false, receiveShadow: false });
  }
  const key = `${lines.join('|')}:${background}:${foreground}:${border}:${fontFamily}:${fontSize}`;
  if (!labelMaterialCache.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = lines.length > 1 ? 256 : 128;
    const context = canvas.getContext('2d');
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = border;
    context.lineWidth = 10;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    context.fillStyle = foreground;
    context.font = `700 ${fontSize}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const lineHeight = Math.min(76, (canvas.height - 30) / lines.length);
    lines.forEach((line, index) => {
      const y = canvas.height / 2 + (index - (lines.length - 1) / 2) * lineHeight;
      context.fillText(line, 256, y, 470);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    labelMaterialCache.set(key, new THREE.MeshBasicMaterial({
      map: texture, side: THREE.DoubleSide, toneMapped: false,
    }));
  }
  const geo = geometry('plane:unit', () => new THREE.PlaneGeometry(1, 1));
  const mesh = new THREE.Mesh(geo, labelMaterialCache.get(key));
  mesh.userData.text = String(text);
  mesh.userData.fontFamily = fontFamily;
  mesh.scale.set(size[0], size[1], 1);
  return finish(mesh, parent, position, options.rotation, { castShadow: false, receiveShadow: false });
}

export function createCoin() {
  const coin = new THREE.Group();
  cylinder(coin, [0.23], 0.08, [0, 0, 0], 0xf6b91f, {
    segments: 16, rotation: [Math.PI / 2, 0, 0], metalness: 0.6, roughness: 0.28,
  });
  torus(coin, 0.235, 0.035, [0, 0, 0.045], 0xffdf63, { metalness: 0.55, roughness: 0.25 });
  box(coin, [0.055, 0.23, 0.035], [0, 0, 0.09], 0xfff0a0, { castShadow: false });
  return coin;
}

export function getMeshKitStats() {
  return {
    geometries: geometryCache.size,
    materials: materialCache.size,
    labelMaterials: labelMaterialCache.size,
    surfaceTextures: surfaceTextureCache.size,
    bumpMapping: surfaceQuality.bump,
    anisotropy: surfaceQuality.anisotropy,
  };
}
