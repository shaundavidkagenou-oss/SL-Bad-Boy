import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * One combined color-grade, vignette and boost-only radial-blur pass.
 * Keeping these together avoids three separate full-screen mobile-style effects.
 */
export function createCinematicGradePass() {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      saturation: { value: 1.14 },
      contrast: { value: 1.055 },
      vignette: { value: 0.2 },
      boost: { value: 0 },
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
      uniform vec2 resolution;
      varying vec2 vUv;

      void main() {
        vec2 centered = vUv - 0.5;
        vec4 source = texture2D(tDiffuse, vUv);
        vec3 color = source.rgb;

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
        gl_FragColor = vec4(max(color, 0.0), source.a);
      }
    `,
  });
  pass.name = 'Combined cinematic color grade and boost radial blur';
  pass.material.toneMapped = false;
  return pass;
}
