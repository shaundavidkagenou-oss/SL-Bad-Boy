import * as THREE from 'three';

const PARTICLE_VERTEX = `
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float pixelRatio;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(size * pixelRatio * (200.0 / max(1.0, -viewPosition.z)), 0.0, 64.0);
  }
`;

const PARTICLE_FRAGMENT = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered) * 2.0;
    float softEdge = 1.0 - smoothstep(0.45, 1.0, radius);
    if (softEdge * vAlpha < 0.004) discard;
    gl_FragColor = vec4(vColor, softEdge * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Fixed-pool particles and speed lines; no per-frame mesh or geometry creation. */
export class VisualEffects {
  constructor(scene, { capacity = 144, speedLines = 24 } = {}) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 3);
    this.velocities = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.cursor = 0;
    this.dustTimer = 0;
    this.boostTimer = 0;
    this.tempColor = new THREE.Color();
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms: { pixelRatio: { value: 1 } },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'Pooled road dust and feedback sparks';
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    scene.add(this.points);

    this.lineCount = speedLines;
    this.linePositions = new Float32Array(speedLines * 6);
    this.lineState = new Float32Array(speedLines * 4);
    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3).setUsage(THREE.DynamicDrawUsage));
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0x9dfff1, transparent: true, opacity: 0.38,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.lines.name = 'Fixed scooter velocity streaks';
    this.lines.frustumCulled = false;
    scene.add(this.lines);
    this.reset();
  }

  spawn(x, y, z, vx, vy, vz, duration, size, red, green, blue) {
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const offset = index * 3;
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
    this.velocities[offset] = vx;
    this.velocities[offset + 1] = vy;
    this.velocities[offset + 2] = vz;
    this.colors[offset] = red;
    this.colors[offset + 1] = green;
    this.colors[offset + 2] = blue;
    this.sizes[index] = size;
    this.alphas[index] = 0.85;
    this.life[index] = duration;
    this.maxLife[index] = duration;
  }

  burst(position, color, count = 18, power = 2.4) {
    this.tempColor.set(color);
    const { r, g, b } = this.tempColor;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = power * (0.35 + Math.random() * 0.65);
      this.spawn(position.x, position.y + 0.8, position.z,
        Math.cos(angle) * speed, 0.8 + Math.random() * power, Math.sin(angle) * speed,
        0.35 + Math.random() * 0.45, 0.18 + Math.random() * 0.18, r, g, b);
    }
  }

  coin(position) { this.burst(position, 0xffcf45, 16, 2.1); }
  scooter(position) { this.burst(position, 0x73fff0, 26, 3.1); }
  shield(position) { this.burst(position, 0x8afff3, 24, 3.5); }
  crash(position) {
    this.burst(position, 0xffa43b, 22, 3.7);
    this.burst(position, 0xe54b3e, 14, 2.6);
  }

  resetLines(player) {
    for (let index = 0; index < this.lineCount; index += 1) {
      const state = index * 4;
      this.lineState[state] = player.group.position.x + (Math.random() - 0.5) * 13;
      this.lineState[state + 1] = 0.35 + Math.random() * 4.5;
      this.lineState[state + 2] = -34 + Math.random() * 39;
      this.lineState[state + 3] = 2 + Math.random() * 5;
    }
  }

  reset(player = null) {
    this.life.fill(0);
    this.alphas.fill(0);
    this.sizes.fill(0);
    for (let index = 0; index < this.capacity; index += 1) this.positions[index * 3 + 1] = -1000;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.lines.visible = false;
    this.dustTimer = 0;
    this.boostTimer = 0;
    if (player) this.resetLines(player);
  }

  update(delta, speed, player, state, pixelRatio = 1) {
    this.material.uniforms.pixelRatio.value = pixelRatio;
    if (state === 'paused' || delta <= 0) return;
    const position = player.group.position;
    const running = state === 'running';
    if (running && !player.scooterActive && position.y < 0.08) {
      this.dustTimer -= delta;
      if (this.dustTimer <= 0) {
        this.dustTimer = player.sliding ? 0.025 : 0.065;
        this.tempColor.set(0xc6b58e);
        const { r, g, b } = this.tempColor;
        for (let index = 0; index < (player.sliding ? 3 : 1); index += 1) {
          this.spawn(position.x + (Math.random() - 0.5) * 0.55, 0.1, position.z + 0.25,
            (Math.random() - 0.5) * 0.7, 0.35 + Math.random() * 0.55, 0.8 + Math.random() * 1.3,
            0.4 + Math.random() * 0.35, 0.22 + Math.random() * 0.22, r, g, b);
        }
      }
    }
    if (running && player.scooterActive) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.boostTimer = 0.035;
        this.tempColor.set(Math.random() > 0.35 ? 0x6fffea : 0xffc44d);
        const { r, g, b } = this.tempColor;
        this.spawn(position.x + (Math.random() - 0.5) * 0.45, 0.4, position.z + 0.9,
          (Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.5, 3 + Math.random() * 2,
          0.28 + Math.random() * 0.25, 0.18 + Math.random() * 0.15, r, g, b);
      }
    }

    for (let index = 0; index < this.capacity; index += 1) {
      if (this.life[index] <= 0) continue;
      this.life[index] = Math.max(0, this.life[index] - delta);
      const offset = index * 3;
      this.velocities[offset + 1] -= delta * 2.4;
      this.positions[offset] += this.velocities[offset] * delta;
      this.positions[offset + 1] = Math.max(0.035, this.positions[offset + 1] + this.velocities[offset + 1] * delta);
      this.positions[offset + 2] += this.velocities[offset + 2] * delta;
      const remaining = this.life[index] / this.maxLife[index];
      this.alphas[index] = remaining * 0.82;
      if (this.life[index] === 0) {
        this.positions[offset + 1] = -1000;
        this.sizes[index] = 0;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;

    this.lines.visible = running && player.scooterActive;
    if (!this.lines.visible) return;
    for (let index = 0; index < this.lineCount; index += 1) {
      const stateOffset = index * 4;
      this.lineState[stateOffset + 2] += speed * delta * 0.55;
      if (this.lineState[stateOffset + 2] > 12) {
        this.lineState[stateOffset] = position.x + (Math.random() - 0.5) * 13;
        this.lineState[stateOffset + 1] = 0.35 + Math.random() * 4.5;
        this.lineState[stateOffset + 2] = -34 - Math.random() * 18;
      }
      const vertex = index * 6;
      this.linePositions[vertex] = this.lineState[stateOffset];
      this.linePositions[vertex + 1] = this.lineState[stateOffset + 1];
      this.linePositions[vertex + 2] = this.lineState[stateOffset + 2];
      this.linePositions[vertex + 3] = this.lineState[stateOffset];
      this.linePositions[vertex + 4] = this.lineState[stateOffset + 1];
      this.linePositions[vertex + 5] = this.lineState[stateOffset + 2] - this.lineState[stateOffset + 3];
    }
    this.lineGeometry.attributes.position.needsUpdate = true;
  }

  getStats() {
    let active = 0;
    for (let index = 0; index < this.capacity; index += 1) if (this.life[index] > 0) active += 1;
    return { capacity: this.capacity, active, speedLines: this.lineCount, geometries: 2 };
  }
}
