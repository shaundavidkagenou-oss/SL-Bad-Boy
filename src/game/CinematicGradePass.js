import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * One native-resolution FXAA, color-grade, vignette, boost-blur and output pass.
 * Combining final ACES/sRGB output here removes a separate full-screen pass;
 * FXAA avoids a multi-sampled HDR scene buffer while retaining sharp CSS pixels.
 */
export function createCinematicGradePass() {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      saturation: { value: 1.14 },
      contrast: { value: 1.055 },
      vignette: { value: 0.2 },
      boost: { value: 0 },
      fxaa: { value: 1 },
      toneMappingExposure: { value: 1.08 },
      resolution: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float saturation;
      uniform float contrast;
      uniform float vignette;
      uniform float boost;
      uniform float fxaa;
      uniform vec2 resolution;
      varying vec2 vUv;
      #include <tonemapping_pars_fragment>

      void main() {
        vec2 centered = vUv - 0.5;
        vec2 inverseResolution = 1.0 / max(resolution, vec2(1.0));
        vec4 source = texture2D(tDiffuse, vUv);
        vec3 color = source.rgb;

        // Edge-directed FXAA at the actual drawing-buffer resolution. Flat
        // regions skip the second set of taps; geometry stays at native size.
        if (fxaa > 0.5) {
          vec3 luma = vec3(0.299, 0.587, 0.114);
          vec3 nw = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * inverseResolution).rgb;
          vec3 ne = texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * inverseResolution).rgb;
          vec3 sw = texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * inverseResolution).rgb;
          vec3 se = texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * inverseResolution).rgb;
          float lumaM = dot(color, luma);
          float lumaNW = dot(nw, luma);
          float lumaNE = dot(ne, luma);
          float lumaSW = dot(sw, luma);
          float lumaSE = dot(se, luma);
          float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
          float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
          if (lumaMax - lumaMin >= max(0.0312, lumaMax * 0.125)) {
            vec2 direction = vec2(
              -((lumaNW + lumaNE) - (lumaSW + lumaSE)),
               ((lumaNW + lumaSW) - (lumaNE + lumaSE))
            );
            float reduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.03125, 0.0078125);
            float reciprocal = 1.0 / (min(abs(direction.x), abs(direction.y)) + reduce);
            direction = clamp(direction * reciprocal, vec2(-6.0), vec2(6.0)) * inverseResolution;
            vec3 rgbA = 0.5 * (
              texture2D(tDiffuse, vUv + direction * (-1.0 / 6.0)).rgb
              + texture2D(tDiffuse, vUv + direction * (1.0 / 6.0)).rgb
            );
            vec3 rgbB = rgbA * 0.5 + 0.25 * (
              texture2D(tDiffuse, vUv - direction * 0.5).rgb
              + texture2D(tDiffuse, vUv + direction * 0.5).rgb
            );
            float lumaB = dot(rgbB, luma);
            color = (lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB;
          }
        }
        source.rgb = color;

        // Six restrained taps are active only during the scooter boost. The
        // center remains readable while the outer frame gains radial speed.
        if (boost > 0.001) {
          float edge = smoothstep(0.12, 0.68, length(centered));
          vec2 radial = centered * (0.024 * boost * edge);
          vec3 blurred = source.rgb * 0.34;
          blurred += texture2D(tDiffuse, vUv - radial * 0.25).rgb * 0.18;
          blurred += texture2D(tDiffuse, vUv - radial * 0.50).rgb * 0.16;
          blurred += texture2D(tDiffuse, vUv - radial * 0.75).rgb * 0.13;
          blurred += texture2D(tDiffuse, vUv - radial).rgb * 0.11;
          blurred += texture2D(tDiffuse, vUv + radial * 0.35).rgb * 0.08;
          color = mix(color, blurred, boost * edge * 0.72);
        }

        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(vec3(luminance), color, saturation);
        color = (color - 0.5) * contrast + 0.5;
        float highlight = smoothstep(0.42, 1.15, luminance);
        color += vec3(0.018, 0.005, -0.008) * highlight;
        color += vec3(-0.004, 0.002, 0.014) * (1.0 - highlight);

        vec2 aspect = vec2(resolution.x / max(resolution.y, 1.0), 1.0);
        float edgeDistance = length(centered * aspect * 0.82);
        float edgeShade = smoothstep(0.3, 0.72, edgeDistance) * vignette;
        color *= 1.0 - edgeShade;
        color = ACESFilmicToneMapping(max(color, 0.0));
        gl_FragColor = sRGBTransferOETF(vec4(color, source.a));
      }
    `,
  });
  pass.name = 'Combined cinematic color grade and boost radial blur';
  pass.material.toneMapped = false;
  return pass;
}
