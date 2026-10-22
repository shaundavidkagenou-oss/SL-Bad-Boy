import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function isSoftwareRenderer(renderer) {
  try {
    const gl = renderer.getContext();
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const description = extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return /swiftshader|llvmpipe|softpipe|software/i.test(String(description));
  } catch {
    return false;
  }
}

function createReflectionEnvironment(renderer, scene) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const sky = context.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#79a9c5');
  sky.addColorStop(0.46, '#d9e6d8');
  sky.addColorStop(0.54, '#a7b19a');
  sky.addColorStop(1, '#4a473b');
  context.fillStyle = sky;
  context.fillRect(0, 0, 512, 256);
  const sun = context.createRadialGradient(350, 63, 1, 350, 63, 52);
  sun.addColorStop(0, 'rgba(255,250,218,1)');
  sun.addColorStop(0.12, 'rgba(255,224,157,.9)');
  sun.addColorStop(1, 'rgba(255,213,143,0)');
  context.fillStyle = sun;
  context.fillRect(298, 11, 104, 104);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  scene.environment = target.texture;
  scene.environmentIntensity = 0.42;
  texture.dispose();
  generator.dispose();
  return target;
}

function createCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  const puffs = [[58, 76, 46], [102, 54, 54], [150, 66, 52], [196, 79, 39], [120, 88, 66]];
  for (const [x, y, radius] of puffs) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255,255,248,.78)');
    gradient.addColorStop(0.5, 'rgba(250,252,241,.42)');
    gradient.addColorStop(1, 'rgba(245,250,240,0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x70aebc) },
      horizonColor: { value: new THREE.Color(0xb7d5c8) },
      sunColor: { value: new THREE.Color(0xffe1a3) },
      sunDirection: { value: new THREE.Vector3(0.42, 0.48, -0.77).normalize() },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldPosition;
      void main() {
        vec3 direction = normalize(vWorldPosition - cameraPosition);
        float heightMix = smoothstep(-0.12, 0.72, direction.y);
        vec3 color = mix(horizonColor, topColor, heightMix);
        float sunDot = max(dot(direction, sunDirection), 0.0);
        float disc = pow(sunDot, 850.0);
        float halo = pow(sunDot, 22.0) * 0.24;
        color += sunColor * (disc * 2.1 + halo);
        float horizonHaze = pow(1.0 - max(direction.y, 0.0), 7.0) * 0.08;
        color += sunColor * horizonHaze;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), material);
  sky.name = 'Procedural tropical atmosphere';
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  return sky;
}

/** Mobile-aware atmosphere, reflections, post-processing and one-way adaptive quality. */
export class GraphicsPipeline {
  constructor(renderer, scene, camera, { coarsePointer = false, software = false } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.coarsePointer = coarsePointer;
    this.software = software;
    this.quality = software ? 'compatibility-software' : coarsePointer ? 'balanced-mobile' : 'high-desktop';
    this.sky = createSky();
    scene.add(this.sky);
    this.hdrSupported = !software && !coarsePointer && renderer.extensions.has('EXT_color_buffer_float');
    this.environmentTarget = this.hdrSupported ? createReflectionEnvironment(renderer, scene) : null;
    this.clouds = [];
    if (typeof document !== 'undefined') {
      const cloudMaterial = new THREE.SpriteMaterial({
        map: createCloudTexture(), transparent: true, opacity: 0.52,
        depthWrite: false, fog: true, color: 0xf5f4df,
      });
      this.cloudMaterial = cloudMaterial;
      const positions = [[-66, 30, -140, 34], [-24, 42, -190, 42], [31, 35, -165, 37],
        [72, 26, -125, 30], [-88, 48, -210, 45], [9, 53, -225, 48]];
      const visiblePositions = software || coarsePointer ? positions.filter((_, index) => index % 3 === 0) : positions;
      for (const [x, y, z, size] of visiblePositions) {
        const cloud = new THREE.Sprite(cloudMaterial);
        cloud.position.set(x, y, z);
        cloud.scale.set(size, size * 0.42, 1);
        cloud.userData.startX = x;
        scene.add(cloud);
        this.clouds.push(cloud);
      }
    }

    this.composer = null;
    this.bloomPass = null;
    this.outputPass = null;
    this.postprocessing = false;
    if (this.hdrSupported) {
      const target = new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        samples: coarsePointer ? 0 : 2,
      });
      this.composer = new EffectComposer(renderer, target);
      this.composer.addPass(new RenderPass(scene, camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1),
        coarsePointer ? 0.09 : 0.13, 0.28, 1.35);
      this.composer.addPass(this.bloomPass);
      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);
      this.postprocessing = true;
    }
    this.width = 1;
    this.height = 1;
    this.frameTime = 0;
    this.frameCount = 0;
    this.slowWindows = 0;
    this.adaptations = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.composer?.setSize(width, height);
  }

  setTheme(skyColor, fogColor) {
    const uniforms = this.sky.material.uniforms;
    uniforms.topColor.value.copy(skyColor).multiplyScalar(0.72);
    uniforms.horizonColor.value.copy(fogColor).lerp(skyColor, 0.22);
  }

  adapt(delta) {
    if (delta <= 0) return;
    this.frameTime += delta;
    this.frameCount += 1;
    if (this.frameCount < 150) return;
    const average = this.frameTime / this.frameCount;
    this.frameTime = 0;
    this.frameCount = 0;
    this.slowWindows = average > 1 / 28 ? this.slowWindows + 1 : 0;
    if (this.slowWindows < 2) return;
    this.slowWindows = 0;
    const current = this.renderer.getPixelRatio();
    const minimum = this.coarsePointer ? 0.6 : 0.8;
    if (current > minimum + 0.05) {
      const next = Math.max(minimum, current * 0.82);
      this.renderer.setPixelRatio(next);
      this.composer?.setPixelRatio(next);
      this.renderer.setSize(this.width, this.height, false);
      this.composer?.setSize(this.width, this.height);
      this.quality = 'adaptive-resolution';
    } else if (this.postprocessing) {
      this.composer.dispose();
      this.bloomPass.dispose();
      this.composer = null;
      this.postprocessing = false;
      this.quality = 'adaptive-direct';
    }
    this.adaptations += 1;
  }

  render(delta) {
    this.sky.position.copy(this.camera.position);
    for (let index = 0; index < this.clouds.length; index += 1) {
      const cloud = this.clouds[index];
      cloud.position.x += delta * (0.12 + index * 0.015);
      if (cloud.position.x > cloud.userData.startX + 16) cloud.position.x = cloud.userData.startX - 16;
    }
    if (!this.software) this.adapt(delta);
    if (this.composer) this.composer.render(delta);
    else this.renderer.render(this.scene, this.camera);
  }

  getStats() {
    return {
      quality: this.quality,
      pixelRatio: this.renderer.getPixelRatio(),
      postprocessing: this.postprocessing,
      adaptations: this.adaptations,
      clouds: this.clouds.length,
      environment: Boolean(this.environmentTarget),
    };
  }
}
