import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createCinematicGradePass } from './CinematicGradePass.js';

const SUNSET_HORIZON = new THREE.Color(0xf08a62);
const SUNSET_MID = new THREE.Color(0xc46183);
const SUNSET_ZENITH = new THREE.Color(0x342b62);

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

function createReflectionEnvironment(renderer, scene, compact = false) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const sky = context.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#1d3455');
  sky.addColorStop(0.46, '#b66758');
  sky.addColorStop(0.54, '#4e4a52');
  sky.addColorStop(1, '#171d25');
  context.fillStyle = sky;
  context.fillRect(0, 0, 512, 256);
  const sun = context.createRadialGradient(350, 63, 1, 350, 63, 52);
  sun.addColorStop(0, 'rgba(255,222,174,1)');
  sun.addColorStop(0.12, 'rgba(255,164,105,.9)');
  sun.addColorStop(1, 'rgba(255,132,92,0)');
  context.fillStyle = sun;
  context.fillRect(298, 11, 104, 104);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromEquirectangular(texture);
  scene.environment = target.texture;
  scene.environmentIntensity = compact ? 0.32 : 0.42;
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
      topColor: { value: new THREE.Color(0x342b62) },
      midColor: { value: new THREE.Color(0xc46183) },
      horizonColor: { value: new THREE.Color(0xf08a62) },
      sunColor: { value: new THREE.Color(0xffc38a) },
      sunDirection: { value: new THREE.Vector3(24, 8.5, -90).normalize() },
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
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldPosition;
      void main() {
        vec3 direction = normalize(vWorldPosition - cameraPosition);
        vec3 color = mix(horizonColor, midColor, smoothstep(-0.08, 0.24, direction.y));
        color = mix(color, topColor, smoothstep(0.18, 0.76, direction.y));
        float sunDot = max(dot(direction, sunDirection), 0.0);
        float disc = smoothstep(0.9982, 0.99925, sunDot);
        float halo = pow(sunDot, 18.0) * 0.42;
        color += sunColor * (disc * 3.1 + halo);
        float horizonHaze = pow(1.0 - max(direction.y, 0.0), 7.0) * 0.14;
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
    this.environmentTarget = null;
    if (!software) {
      try {
        // One generated PMREM gives paint, glass and water restrained highlights.
        // It is created once, including on hardware mobile, never per frame.
        this.environmentTarget = createReflectionEnvironment(renderer, scene, coarsePointer);
      } catch {
        this.environmentTarget = null;
        scene.environment = null;
      }
    }
    this.clouds = [];
    if (typeof document !== 'undefined') {
      const cloudMaterial = new THREE.SpriteMaterial({
        map: createCloudTexture(), transparent: true, opacity: 0.34,
        depthWrite: false, fog: true, color: 0xd8a19a,
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
    this.cinematicPass = null;
    this.bloomResolutionScale = 0.5;
    this.postprocessing = false;
    if (this.hdrSupported) {
      // Native-resolution FXAA in the final pass is substantially cheaper than
      // multi-sampled half-float HDR buffers at 1080p and high DPR.
      const target = new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        samples: 0,
      });
      this.composer = new EffectComposer(renderer, target);
      this.composer.addPass(new RenderPass(scene, camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.32, 0.95);
      // Bloom is low-frequency: its already-downsampled mip chain can run at
      // half size again without reducing scene, text or geometry resolution.
      const resizeBloom = this.bloomPass.setSize.bind(this.bloomPass);
      this.bloomPass.setSize = (width, height) => resizeBloom(
        Math.max(1, Math.round(width * this.bloomResolutionScale)),
        Math.max(1, Math.round(height * this.bloomResolutionScale)),
      );
      this.composer.addPass(this.bloomPass);
      this.cinematicPass = createCinematicGradePass();
      this.composer.addPass(this.cinematicPass);
      this.postprocessing = true;
    }
    this.width = 1;
    this.height = 1;
    this.drawingBufferSize = new THREE.Vector2(1, 1);
    this.maxPixelRatio = renderer.getPixelRatio();
    this.minimumPixelRatio = Math.min(this.maxPixelRatio, coarsePointer ? 0.85 : 1);
    this.frameTime = 0;
    this.frameCount = 0;
    this.slowWindows = 0;
    this.adaptations = 0;
    this.performanceMode = false;
    this.boost = 0;
  }

  updateResolution() {
    if (!this.cinematicPass) return;
    this.renderer.getDrawingBufferSize(this.drawingBufferSize);
    this.cinematicPass.uniforms.resolution.value.copy(this.drawingBufferSize);
  }

  applyPixelRatio(next) {
    this.renderer.setPixelRatio(next);
    this.composer?.setPixelRatio(next);
    this.renderer.setSize(this.width, this.height, false);
    this.composer?.setSize(this.width, this.height);
    this.updateResolution();
  }

  disposePostprocessing() {
    this.composer?.dispose();
    this.bloomPass?.dispose();
    this.cinematicPass?.dispose();
    this.composer = null;
    this.bloomPass = null;
    this.cinematicPass = null;
    this.postprocessing = false;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.composer?.setSize(width, height);
    this.updateResolution();
  }

  setTheme(skyColor, fogColor) {
    const uniforms = this.sky.material.uniforms;
    uniforms.topColor.value.copy(skyColor).lerp(SUNSET_ZENITH, 0.62).multiplyScalar(0.72);
    uniforms.midColor.value.copy(fogColor).lerp(SUNSET_MID, 0.6);
    uniforms.horizonColor.value.copy(fogColor).lerp(SUNSET_HORIZON, 0.65);
  }

  adapt(delta) {
    if (delta <= 0) return;
    this.frameTime += delta;
    this.frameCount += 1;
    if (this.frameCount < 60) return;
    const average = this.frameTime / this.frameCount;
    this.frameTime = 0;
    this.frameCount = 0;
    this.slowWindows = average > 1 / 45 ? this.slowWindows + 1 : 0;
    if (this.slowWindows < 1) return;
    this.slowWindows = 0;

    // Preserve native CSS-pixel sharpness. Remove expensive full-screen and
    // distant-scene work before considering any resolution reduction.
    if (this.bloomPass?.enabled) {
      this.bloomPass.enabled = false;
      this.quality = 'adaptive-grade';
    } else if (this.postprocessing) {
      this.disposePostprocessing();
      this.quality = 'adaptive-direct';
    } else if (!this.performanceMode || this.environmentTarget) {
      this.performanceMode = true;
      this.quality = this.coarsePointer ? 'performance-mobile' : 'performance-desktop';
      this.scene.environment = null;
      this.environmentTarget?.dispose();
      this.environmentTarget = null;
      for (const cloud of this.clouds) cloud.visible = false;
    } else {
      const current = this.renderer.getPixelRatio();
      const minimum = this.minimumPixelRatio ?? Math.min(current, this.coarsePointer ? 0.85 : 1);
      if (current <= minimum + 0.01) return;
      this.applyPixelRatio(Math.max(minimum, current * 0.9));
      this.quality = 'adaptive-resolution';
    }
    this.adaptations += 1;
  }

  render(delta, boostTarget = 0) {
    const boostBlend = 1 - Math.exp(-Math.max(0, delta) * 8);
    this.boost = THREE.MathUtils.lerp(this.boost, THREE.MathUtils.clamp(boostTarget, 0, 1), boostBlend);
    if (this.cinematicPass) {
      this.cinematicPass.uniforms.boost.value = this.boost;
      this.cinematicPass.uniforms.toneMappingExposure.value = this.renderer.toneMappingExposure;
    }
    this.sky.position.copy(this.camera.position);
    for (let index = 0; index < this.clouds.length; index += 1) {
      const cloud = this.clouds[index];
      if (this.performanceMode) break;
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
      minimumPixelRatio: this.minimumPixelRatio,
      postprocessing: this.postprocessing,
      cinematic: Boolean(this.cinematicPass),
      fxaa: Boolean(this.cinematicPass?.uniforms.fxaa.value),
      bloomStrength: this.bloomPass?.strength ?? 0,
      bloomEnabled: Boolean(this.bloomPass?.enabled),
      bloomResolutionScale: this.bloomPass ? this.bloomResolutionScale : 0,
      hdrSamples: this.composer?.renderTarget1.samples ?? 0,
      boost: this.boost,
      performanceMode: this.performanceMode,
      adaptations: this.adaptations,
      clouds: this.clouds.length,
      environment: Boolean(this.environmentTarget),
    };
  }
}
