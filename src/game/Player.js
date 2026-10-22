import * as THREE from 'three';
import { GAME, LANES, PLAYER_Z } from '../config.js';
import { createSchoolboy } from '../art/Schoolboy.js';
import { makeCollider } from './Collision.js';

const damp = THREE.MathUtils.damp;

export class Player {
  constructor(scene, callbacks = {}) {
    this.callbacks = callbacks;
    this.group = new THREE.Group();
    this.group.name = 'Player schoolboy';
    this.visual = createSchoolboy();
    this.group.add(this.visual);
    scene.add(this.group);
    this.joints = this.visual.userData.joints;
    this.reset();
  }

  reset() {
    this.lane = 1;
    this.group.position.set(LANES[1], 0, PLAYER_Z);
    this.visual.position.set(0, 0, 0);
    this.visual.rotation.set(0, 0, 0);
    this.visual.scale.set(1, 1, 1);
    this.velocityY = 0;
    this.slideTimer = 0;
    this.landingTimer = 0;
    this.crashTimer = 0;
    this.coinTimer = 0;
    this.startTimer = 0.45;
    this.sliding = false;
    this.crashed = false;
    this.runPhase = 0;
    Object.values(this.joints).forEach((joint) => joint.rotation.set(0, 0, 0));
    this.joints.body.position.set(0, 0, 0);
    this.joints.backpack.position.set(0, 0, 0);
  }

  moveLeft() {
    this.lane = Math.max(0, this.lane - 1);
  }

  moveRight() {
    this.lane = Math.min(LANES.length - 1, this.lane + 1);
  }

  jump() {
    if (this.crashed || this.group.position.y > 0.02 || Math.abs(this.velocityY) > 0.01) return false;
    this.sliding = false;
    this.slideTimer = 0;
    this.velocityY = GAME.jumpVelocity;
    this.callbacks.jump?.();
    return true;
  }

  slide() {
    if (this.crashed) return false;
    if (this.group.position.y > 0.02 || Math.abs(this.velocityY) > 0.01) {
      this.velocityY = Math.min(this.velocityY, -11);
      return false;
    }
    this.sliding = true;
    this.slideTimer = GAME.slideDuration;
    this.callbacks.slide?.();
    return true;
  }

  celebrate() {
    if (!this.crashed) this.coinTimer = 0.42;
  }

  crash() {
    this.crashed = true;
    this.coinTimer = 0;
    this.crashTimer = 0;
    this.sliding = false;
    this.velocityY = 0;
  }

  update(delta, speed, mode = 'running') {
    if (mode === 'paused') return;
    const responsiveness = 1 - Math.exp(-18 * delta);
    this.group.position.x += (LANES[this.lane] - this.group.position.x) * responsiveness;

    if (mode === 'gameover') {
      this.crashTimer += delta;
      const stumble = Math.min(1, this.crashTimer / 0.22);
      this.visual.rotation.z = damp(this.visual.rotation.z, 1.02, 6, delta);
      this.visual.rotation.x = damp(this.visual.rotation.x, 0.22, 6, delta);
      this.visual.position.y = damp(this.visual.position.y, 0.2, 6, delta);
      this.visual.position.z = -Math.sin(stumble * Math.PI) * 0.24;
      this.joints.leftArm.rotation.x = damp(this.joints.leftArm.rotation.x, -1.1, 9, delta);
      this.joints.rightArm.rotation.x = damp(this.joints.rightArm.rotation.x, -0.8, 9, delta);
      this.joints.leftElbow.rotation.x = -0.65;
      this.joints.rightElbow.rotation.x = -0.65;
      this.joints.leftWrist.rotation.z = -0.35;
      this.joints.rightWrist.rotation.z = 0.35;
      this.joints.head.rotation.z = damp(this.joints.head.rotation.z, -0.3, 7, delta);
      this.joints.head.rotation.x = damp(this.joints.head.rotation.x, 0.18, 7, delta);
      this.joints.leftLeg.rotation.x = damp(this.joints.leftLeg.rotation.x, 0.2, 7, delta);
      this.joints.rightLeg.rotation.x = damp(this.joints.rightLeg.rotation.x, -0.35, 7, delta);
      return;
    }

    if (mode === 'menu') {
      this.runPhase += delta * 2;
      this.visual.position.y = 0;
      this.visual.rotation.x = 0;
      this.joints.leftArm.rotation.x = Math.sin(this.runPhase) * 0.045;
      this.joints.rightArm.rotation.x = -Math.sin(this.runPhase) * 0.045;
      this.joints.leftElbow.rotation.x = -0.12;
      this.joints.rightElbow.rotation.x = -0.12;
      this.joints.body.rotation.z = Math.sin(this.runPhase * 0.6) * 0.012;
      this.joints.body.position.y = Math.sin(this.runPhase) * 0.012;
      this.joints.head.rotation.y = Math.sin(this.runPhase * 0.45) * 0.18;
      this.joints.head.rotation.x = Math.sin(this.runPhase * 0.7) * 0.025;
      const wave = THREE.MathUtils.clamp((Math.sin(this.runPhase * 0.42) - 0.62) / 0.38, 0, 1);
      this.joints.rightArm.rotation.z = wave * 1.22;
      this.joints.rightElbow.rotation.x = -0.12 - wave * 0.75;
      this.joints.rightWrist.rotation.z = Math.sin(this.runPhase * 5) * 0.28 * wave;
      this.joints.leftWrist.rotation.z = 0;
      this.joints.backpack.rotation.x = 0;
      return;
    }

    this.coinTimer = Math.max(0, this.coinTimer - delta);
    this.startTimer = Math.max(0, this.startTimer - delta);
    const wasAirborne = this.group.position.y > 0 || this.velocityY > 0;
    if (wasAirborne) {
      this.velocityY -= GAME.gravity * delta;
      this.group.position.y += this.velocityY * delta;
      if (this.group.position.y <= 0) {
        this.group.position.y = 0;
        this.velocityY = 0;
        this.landingTimer = 0.18;
        this.callbacks.land?.();
      }
    }
    this.landingTimer = Math.max(0, this.landingTimer - delta);

    if (this.sliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.slideTimer = 0;
        this.sliding = false;
      }
    }

    this.runPhase += delta * (8 + speed * 0.28);
    const stride = Math.sin(this.runPhase);
    const airborne = this.group.position.y > 0.02;
    const landing = this.landingTimer > 0 && !airborne;
    const scaleTarget = this.sliding ? 0.68 : landing ? 0.92 : 1;
    this.visual.scale.y = damp(this.visual.scale.y, scaleTarget, 22, delta);
    this.visual.rotation.x = damp(this.visual.rotation.x,
      this.sliding ? 1.0 : airborne ? -0.12 : this.startTimer > 0 ? -0.17 : -0.06, 18, delta);
    this.visual.position.y = 0;
    this.visual.position.z = damp(this.visual.position.z, 0, 18, delta);

    if (this.sliding) {
      this.joints.leftLeg.rotation.x = damp(this.joints.leftLeg.rotation.x, 0.02, 20, delta);
      this.joints.rightLeg.rotation.x = damp(this.joints.rightLeg.rotation.x, -0.04, 20, delta);
      this.joints.leftKnee.rotation.x = damp(this.joints.leftKnee.rotation.x, 0.04, 20, delta);
      this.joints.rightKnee.rotation.x = damp(this.joints.rightKnee.rotation.x, 0.08, 20, delta);
      this.joints.leftArm.rotation.x = damp(this.joints.leftArm.rotation.x, -0.42, 20, delta);
      this.joints.rightArm.rotation.x = damp(this.joints.rightArm.rotation.x, -0.3, 20, delta);
      this.joints.leftElbow.rotation.x = -0.4;
      this.joints.rightElbow.rotation.x = -0.4;
    } else if (airborne) {
      this.joints.leftLeg.rotation.x = damp(this.joints.leftLeg.rotation.x, 0.48, 12, delta);
      this.joints.rightLeg.rotation.x = damp(this.joints.rightLeg.rotation.x, -0.28, 12, delta);
      this.joints.leftKnee.rotation.x = damp(this.joints.leftKnee.rotation.x, 0.78, 12, delta);
      this.joints.rightKnee.rotation.x = damp(this.joints.rightKnee.rotation.x, 0.36, 12, delta);
      this.joints.leftArm.rotation.x = damp(this.joints.leftArm.rotation.x, -0.62, 12, delta);
      this.joints.rightArm.rotation.x = damp(this.joints.rightArm.rotation.x, -0.62, 12, delta);
      this.joints.leftElbow.rotation.x = -0.65;
      this.joints.rightElbow.rotation.x = -0.65;
    } else if (landing) {
      for (const side of ['left', 'right']) {
        this.joints[`${side}Leg`].rotation.x = damp(this.joints[`${side}Leg`].rotation.x, 0.18, 24, delta);
        this.joints[`${side}Knee`].rotation.x = damp(this.joints[`${side}Knee`].rotation.x, 0.58, 24, delta);
        this.joints[`${side}Arm`].rotation.x = damp(this.joints[`${side}Arm`].rotation.x, -0.28, 18, delta);
      }
    } else {
      this.joints.leftLeg.rotation.x = stride * 0.8;
      this.joints.rightLeg.rotation.x = -stride * 0.8;
      this.joints.leftKnee.rotation.x = 0.08 + Math.max(0, -stride) * 0.95;
      this.joints.rightKnee.rotation.x = 0.08 + Math.max(0, stride) * 0.95;
      this.joints.leftArm.rotation.x = -stride * 0.7;
      this.joints.rightArm.rotation.x = stride * 0.7;
      this.joints.leftElbow.rotation.x = -0.35 - Math.max(0, stride) * 0.32;
      this.joints.rightElbow.rotation.x = -0.35 - Math.max(0, -stride) * 0.32;
    }

    const celebrating = this.coinTimer > 0 && !this.sliding && !airborne && !landing;
    this.joints.leftArm.rotation.z = damp(this.joints.leftArm.rotation.z, 0, 14, delta);
    this.joints.rightArm.rotation.z = damp(this.joints.rightArm.rotation.z, celebrating ? 1.22 : 0, 18, delta);
    if (celebrating) {
      this.joints.rightArm.rotation.x = damp(this.joints.rightArm.rotation.x, -0.38, 20, delta);
      this.joints.rightElbow.rotation.x = damp(this.joints.rightElbow.rotation.x, -1.25, 20, delta);
      this.joints.rightWrist.rotation.z = -0.25 + Math.sin(this.runPhase * 2) * 0.12;
    } else {
      this.joints.rightWrist.rotation.z = damp(this.joints.rightWrist.rotation.z, 0, 14, delta);
    }
    this.joints.leftWrist.rotation.z = damp(this.joints.leftWrist.rotation.z, 0, 14, delta);
    this.joints.leftWrist.rotation.x = this.sliding ? 0.12 : stride * 0.13;
    this.joints.rightWrist.rotation.x = this.sliding ? 0.12 : -stride * 0.13;
    this.joints.leftAnkle.rotation.x = damp(this.joints.leftAnkle.rotation.x,
      this.sliding ? 0 : -this.joints.leftLeg.rotation.x * 0.25 + (airborne ? -0.12 : 0), 18, delta);
    this.joints.rightAnkle.rotation.x = damp(this.joints.rightAnkle.rotation.x,
      this.sliding ? 0 : -this.joints.rightLeg.rotation.x * 0.25 + (airborne ? -0.12 : 0), 18, delta);

    const laneOffset = LANES[this.lane] - this.group.position.x;
    this.visual.rotation.z = damp(this.visual.rotation.z, laneOffset * -0.06, 12, delta);
    this.visual.rotation.y = damp(this.visual.rotation.y, laneOffset * -0.025, 10, delta);
    this.joints.body.rotation.z = this.sliding ? 0 : stride * 0.022;
    this.joints.body.rotation.y = this.sliding ? 0 : stride * 0.018;
    this.joints.body.position.y = this.sliding ? 0 : Math.abs(Math.cos(this.runPhase)) * 0.012;
    this.joints.head.rotation.y = damp(this.joints.head.rotation.y,
      this.sliding ? 0 : laneOffset * -0.075 + (celebrating ? -0.12 : 0), 9, delta);
    this.joints.head.rotation.x = damp(this.joints.head.rotation.x,
      this.sliding ? -0.12 : landing ? 0.13 : airborne ? -0.08 : stride * 0.018, 10, delta);
    this.joints.head.rotation.z = damp(this.joints.head.rotation.z, 0, 10, delta);
    this.joints.backpack.rotation.x = damp(this.joints.backpack.rotation.x,
      this.sliding ? -0.12 : stride * 0.025, 12, delta);
    this.joints.backpack.position.y = this.sliding ? 0 : Math.abs(Math.cos(this.runPhase)) * 0.015;
  }

  getCollider() {
    const height = this.sliding ? 0.82 : 2.12;
    const depth = this.sliding ? 1.35 : 0.76;
    const z = this.group.position.z + (this.sliding ? -0.2 : 0);
    return makeCollider(this.group.position.x, this.group.position.y, z, 0.74, 0.03, height, depth);
  }
}
