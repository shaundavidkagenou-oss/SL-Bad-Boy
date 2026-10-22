import * as THREE from 'three';

export class CameraRig {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(57, 1, 0.1, 320);
    this.lookTarget = new THREE.Vector3();
    this.baseY = 6.0;
    this.baseZ = 13.8;
    this.baseFov = 57;
    this.feedback = 0;
    this.laneFeedback = 0;
    this.camera.position.set(0, this.baseY, this.baseZ);
    this.camera.lookAt(0, 1.3, -8.5);
  }

  resize(width, height) {
    const aspect = width / Math.max(1, height);
    const portrait = aspect < 0.85;
    this.camera.aspect = aspect;
    this.baseFov = portrait ? 67 : 57;
    this.camera.fov = this.baseFov;
    this.baseY = portrait ? 6.8 : 6.0;
    // Leave enough foreground room for the pursuing officer without shrinking the road view.
    this.baseZ = portrait ? 15.8 : 13.8;
    this.camera.position.set(0, this.baseY, this.baseZ);
    this.camera.updateProjectionMatrix();
  }

  reset() {
    this.feedback = 0;
    this.laneFeedback = 0;
    this.camera.fov = this.baseFov;
    this.camera.position.set(0, this.baseY, this.baseZ);
    this.lookTarget.set(0, 1.3, -8.5);
    this.camera.lookAt(this.lookTarget);
    this.camera.updateProjectionMatrix();
  }

  pulse(amount = 0.25, direction = 0) {
    this.feedback = Math.max(this.feedback, amount);
    this.laneFeedback = THREE.MathUtils.clamp(this.laneFeedback + direction * amount * 0.12, -0.1, 0.1);
  }

  update(delta, player, speed = 14, state = 'running') {
    const jump = player.group.position.y;
    this.feedback = THREE.MathUtils.damp(this.feedback, 0, 9, delta);
    this.laneFeedback = THREE.MathUtils.damp(this.laneFeedback, 0, 8, delta);
    const cruiseLift = state === 'running' ? THREE.MathUtils.clamp((speed - 14) / 22, 0, 1) * 1.1 : 0;
    const boostLift = player.scooterActive ? 2.3 : 0;
    const targetFov = this.baseFov + cruiseLift + boostLift;
    const nextFov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4.5, delta);
    if (Math.abs(nextFov - this.camera.fov) > 0.0001) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
    const targetX = player.group.position.x * 0.14 + this.laneFeedback;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetX, 5.5, delta);
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y, this.baseY + jump * 0.12 - this.feedback * 0.11, 6, delta,
    );
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z, this.baseZ + (player.scooterActive ? 0.28 : 0) + this.feedback * 0.08, 5, delta,
    );
    this.lookTarget.set(this.camera.position.x * 0.12, 1.3 + jump * 0.08 - this.feedback * 0.025, -8.5);
    this.camera.lookAt(this.lookTarget);
  }
}
