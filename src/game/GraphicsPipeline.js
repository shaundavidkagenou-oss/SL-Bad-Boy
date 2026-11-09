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
      moonDirection: { value: new THREE.Vector3(-30, 26, -70).normalize() },
      night: { value: 0 },
      time: { value: 0 },
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
      uniform vec3 moonDirection;
      uniform float night;
      uniform float time;
      varying vec3 vWorldPosition;
      float hash21(vec2 point) {
        point = fract(point * vec2(123.34, 456.21));
        point += dot(point, point + 45.32);
        return fract(point.x * point.y);
      }
      void main() {
        vec3 direction = normalize(vWorldPosition - cameraPosition);
        vec3 color = mix(horizonColor, midColor, smoothstep(-0.08, 0.24, direction.y));
        color = mix(color, topColor, smoothstep(0.18, 0.76, direction.y));
        // Below the horizon the sky settles into the dark ground haze so the
        // world edge never shows as a bright band behind the city.
        color = mix(color, horizonColor * 0.22, smoothstep(0.0, -0.2, direction.y));
        float sunDot = max(dot(direction, sunDirection), 0.0);
        float disc = smoothstep(0.9982, 0.99925, sunDot);
        float halo = pow(sunDot, 18.0) * 0.42;
        color += sunColor * (disc * 3.1 + halo) * max(0.0, 1.0 - night * 1.15);
        float horizonHaze = pow(1.0 - max(direction.y, 0.0), 7.0) * 0.14;
        color += sunColor * horizonHaze * (1.0 - night * 0.5);
        // Warm city glow sits on the horizon once Colombo after-hours lighting takes over.
        color += vec3(0.42, 0.24, 0.13) * pow(1.0 - max(direction.y, 0.0), 12.0) * night * 0.9;
        // Sparse twinkling star field with a soft Milky-Way band.
        vec2 skyUv = vec2(atan(direction.z, direction.x) / 6.2831853, asin(clamp(direction.y, -1.0, 1.0)) / 1.5707963);
        vec2 starGrid = skyUv * vec2(760.0, 380.0);
        vec2 cell = floor(starGrid);
        vec2 local = fract(starGrid) - 0.5;
        float star = hash21(cell);
        float twinkle = 0.55 + 0.45 * sin(time * 1.7 + star * 63.0);
        float starShape = smoothstep(0.34, 0.02, length(local));
        float starMask = smoothstep(0.9971, 0.9995, star) * starShape
          * smoothstep(0.02, 0.3, direction.y) * night;
        vec3 starColor = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.88, 0.72), hash21(cell + 7.1));
        color += starColor * starMask * (0.8 + 1.6 * twinkle);
        float band = exp(-pow((skyUv.y - 0.18) * 5.2, 2.0)) * night * 0.05;
        color += vec3(0.42, 0.46, 0.62) * band * (0.55 + 0.45 * sin(skyUv.x * 42.0));
        // Cool moon disc and halo.
        float moonDot = max(dot(direction, moonDirection), 0.0);
        float moonDisc = smoothstep(0.99955, 0.99985, moonDot);
        color += vec3(0.86, 0.9, 1.0) * moonDisc * night * 2.2;
        color += vec3(0.45, 0.55, 0.86) * pow(moonDot, 220.0) * night * 0.9;
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
    this.profile = null;
    this.night = 0;
    this.nightTarget = 0;
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
    const night = this.night;
    // Dusk mixes toward the sunset identity; after hours the sky keeps the
    // district's own blend so the warm sunset never overrides the night.
    uniforms.topColor.value.copy(skyColor)
      .lerp(SUNSET_ZENITH, 0.62 * (1 - night)).multiplyScalar(1 - night * 0.45);
    uniforms.midColor.value.copy(fogColor).lerp(SUNSET_MID, 0.6 * (1 - night));
    uniforms.horizonColor.value.copy(fogColor).lerp(SUNSET_HORIZON, 0.65 * (1 - night));
  }

  ensureEnvironment() {
    if (this.environmentTarget || this.software) return this.environmentTarget;
    if (typeof document === 'undefined') return null;
    try {
      this.environmentTarget = createReflectionEnvironment(
        this.renderer, this.scene, this.profile?.id === 'low' || this.coarsePointer,
      );
    } catch {
      this.environmentTarget = null;
      this.scene.environment = null;
    }
    return this.environmentTarget;
  }

  releaseEnvironment() {
    if (!this.environmentTarget) return;
    this.scene.environment = null;
    this.environmentTarget.dispose();
    this.environmentTarget = null;
  }

  /**
   * Applies a named graphics tier. Only cost toggles here: resolution caps,
   * post-processing, reflection probe, clouds and adaptive behaviour. Scene
   * content, collision and gameplay are untouched.
   */
  applyProfile(profile) {
    if (!profile) return;
    this.profile = profile;
    if (this.bloomPass) {
      this.bloomPass.enabled = Boolean(profile.bloom);
      this.bloomPass.strength = profile.bloomStrength || 0;
      this.postprocessing = Boolean(profile.postprocessing);
    } else {
      this.postprocessing = false;
    }
    if (profile.environment) this.ensureEnvironment();
    else this.releaseEnvironment();
    for (const cloud of this.clouds) cloud.visible = Boolean(profile.clouds) && !this.performanceMode;
    this.minimumPixelRatio = Math.min(this.maxPixelRatio, profile.pixelRatioFloor ?? this.minimumPixelRatio);
    this.adaptations = 0;
    this.slowWindows = 0;
    this.frameTime = 0;
    this.frameCount = 0;
    this.quality = profile.id;
  }

  setNight(value) {
    this.nightTarget = THREE.MathUtils.clamp(value, 0, 1);
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
    if (this.profile && this.adaptations < 1 && this.bloomPass?.enabled) {
      this.bloomPass.enabled = false;
      this.quality = `${this.profile.id}-adaptive`;
    } else if (this.bloomPass?.enabled) {
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
      const floor = this.profile?.pixelRatioFloor ?? (this.coarsePointer ? 0.85 : 1);
      const cap = Number.isFinite(this.maxPixelRatio) ? this.maxPixelRatio : current;
      const minimum = Math.min(cap, floor);
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
    this.night = THREE.MathUtils.lerp(this.night, this.nightTarget, 1 - Math.exp(-Math.max(0, delta) * 1.4));
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms.night.value = this.night;
    skyUniforms.time.value += Math.max(0, delta);
    this.sky.position.copy(this.camera.position);
    for (let index = 0; index < this.clouds.length; index += 1) {
      const cloud = this.clouds[index];
      if (this.performanceMode) break;
      cloud.position.x += delta * (0.12 + index * 0.015);
      if (cloud.position.x > cloud.userData.startX + 16) cloud.position.x = cloud.userData.startX - 16;
    }
    if (!this.software && this.profile?.id !== 'low') this.adapt(delta);
    if (this.composer && this.postprocessing) this.composer.render(delta);
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
