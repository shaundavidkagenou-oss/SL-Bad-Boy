import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const materialCache = new Map();
const geometryCache = new Map();
const labelMaterialCache = new Map();
const surfaceTextureCache = new Map();
const fallbackLabelMaterial = new THREE.MeshBasicMaterial({ color: 0x213b56, side: THREE.DoubleSide });

export function material(color, options = {}) {
  if (options.surface && typeof document !== 'undefined') return surfaceMaterial(options.surface, color);
  const key = JSON.stringify([color, options.roughness ?? 0.82, options.metalness ?? 0,
    options.emissive ?? 0, options.emissiveIntensity ?? 0, options.side ?? THREE.FrontSide,
    options.flatShading ?? true]);
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.82,
      metalness: options.metalness ?? 0,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
      side: options.side ?? THREE.FrontSide,
      flatShading: options.flatShading ?? true,
    }));
  }
  return materialCache.get(key);
}

function surfaceTexture(name) {
  if (surfaceTextureCache.has(name)) return surfaceTextureCache.get(name);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#eeeeea';
  context.fillRect(0, 0, 128, 128);
  let seed = 9137;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const dots = name === 'asphalt' ? 1500 : 350;
  for (let i = 0; i < dots; i += 1) {
    const shade = 170 + Math.floor(random() * 80);
    context.fillStyle = `rgba(${shade},${shade},${shade},${name === 'asphalt' ? 0.34 : 0.18})`;
    const size = name === 'asphalt' ? 1 : 2;
    context.fillRect(random() * 128, random() * 128, size, size);
  }
  if (name === 'paving') {
    context.strokeStyle = 'rgba(115,115,110,.42)';
    context.lineWidth = 2;
    for (let i = 0; i <= 128; i += 32) {
      context.beginPath(); context.moveTo(i, 0); context.lineTo(i, 128); context.stroke();
      context.beginPath(); context.moveTo(0, i); context.lineTo(128, i); context.stroke();
    }
  } else if (name === 'plaster') {
    const gradient = context.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, 'rgba(255,255,255,.14)');
    gradient.addColorStop(1, 'rgba(115,105,90,.13)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(name === 'asphalt' ? 2 : 1, name === 'asphalt' ? 9 : 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  surfaceTextureCache.set(name, texture);
  return texture;
}

function surfaceMaterial(name, color) {
  const key = `surface:${name}:${color}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, new THREE.MeshStandardMaterial({
      color,
      map: surfaceTexture(name),
      roughness: name === 'asphalt' ? 0.96 : 0.88,
      metalness: 0,
      flatShading: true,
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
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
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
  };
}
