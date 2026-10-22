import * as THREE from 'three';

export class CameraRig {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(57, 1, 0.1, 320);
    this.lookTarget = new THREE.Vector3();
    this.baseY = 6.0;
    this.baseZ = 13.8;
    this.camera.position.set(0, this.baseY, this.baseZ);
    this.camera.lookAt(0, 1.3, -8.5);
  }

  resize(width, height) {
    const aspect = width / Math.max(1, height);
    const portrait = aspect < 0.85;
    this.camera.aspect = aspect;
    this.camera.fov = portrait ? 67 : 57;
    this.baseY = portrait ? 6.8 : 6.0;
    // Leave enough foreground room for the pursuing officer without shrinking the road view.
    this.baseZ = portrait ? 15.8 : 13.8;
    this.camera.position.set(0, this.baseY, this.baseZ);
    this.camera.updateProjectionMatrix();
  }

  update(delta, player) {
    const jump = player.group.position.y;
    const targetX = player.group.position.x * 0.14;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetX, 4.5, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.baseY + jump * 0.12, 5, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.baseZ, 5, delta);
    this.lookTarget.set(this.camera.position.x * 0.12, 1.3 + jump * 0.08, -8.5);
    this.camera.lookAt(this.lookTarget);
  }
}
