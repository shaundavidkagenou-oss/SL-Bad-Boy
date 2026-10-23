import * as THREE from 'three';
import { GAME, LANES, PLAYER_Z } from '../config.js';
import { createSchoolboy } from '../art/Schoolboy.js';
import { createScooter } from '../art/Scooter.js';
import { disposeBatchedGeometry } from '../art/StaticBatcher.js';
import { getCharacter } from './CharacterCatalog.js';
import { makeCollider } from './Collision.js';

const damp = THREE.MathUtils.damp;

export class Player {
  constructor(scene, callbacks = {}, characterId = 'schoolboy') {
    this.callbacks = callbacks;
    this.group = new THREE.Group();
    this.group.name = 'Player runner';
    this.characterId = getCharacter(characterId).id;
    this.visual = createSchoolboy(getCharacter(this.characterId));
    this.group.add(this.visual);
    this.scooter = createScooter();
    this.group.add(this.scooter);
    this.shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0x72fff0, wireframe: true, transparent: true, opacity: 0.2, depthWrite: false }),
    );
    this.shield.position.y = 1.05;
    this.shield.scale.set(0.72, 1, 1.05);
    this.group.add(this.shield);
    scene.add(this.group);
    this.joints = this.visual.userData.joints;
    this.reset();
  }

  setCharacter(characterId) {
    const definition = getCharacter(characterId);
    if (definition.id === this.characterId) return false;
    // Release the old rig's GPU buffers. Palette geometry remains in a bounded
    // CPU cache and is uploaded again only if that runner is equipped later.
    const oldGeometries = new Set();
    this.visual.traverse((node) => { if (node.isSkinnedMesh) oldGeometries.add(node.geometry); });
    for (const geometry of oldGeometries) geometry.dispose();
    disposeBatchedGeometry(this.visual);
    this.visual.removeFromParent();
    this.characterId = definition.id;
    this.visual = createSchoolboy(definition);
    this.group.add(this.visual);
    this.joints = this.visual.userData.joints;
    this.reset();
    return true;
  }

  reset() {
    this.lane = 1;
    this.group.position.set(LANES[1], 0, PLAYER_Z);
    this.visual.position.set(0, 0, 0);
    this.visual.rotation.set(0, 0, 0);
    this.visual.scale.set(1, 1, 1);
    this.scooterActive = false;
    this.scooterTimer = 0;
    this.scooter.visible = false;
    this.scooter.rotation.set(0, 0, 0);
    this.shield.visible = false;
    this.velocityY = 0;
    this.slideTimer = 0;
    this.landingTimer = 0;
    this.crashTimer = 0;
    this.invincibleTimer = 0;
    this.startTimer = 0.45;
    this.sliding = false;
    this.crashed = false;
    this.runPhase = 0;
    this.stepMarker = 0;
    Object.values(this.joints).forEach((joint) => joint.rotation.set(0, 0, 0));
    this.joints.body.position.set(0, 0, 0);
    this.joints.backpack.position.set(0, 0, 0);
  }

  moveLeft() {
    const next = Math.max(0, this.lane - 1);
    if (next === this.lane) return false;
    this.lane = next;
    this.callbacks.lane?.(-1);
    return true;
  }

  moveRight() {
    const next = Math.min(LANES.length - 1, this.lane + 1);
    if (next === this.lane) return false;
    this.lane = next;
    this.callbacks.lane?.(1);
    return true;
  }

  jump() {
    if (this.crashed || this.group.position.y > 0.02 || Math.abs(this.velocityY) > 0.01) return false;
    this.sliding = false;
    this.slideTimer = 0;
    this.velocityY = GAME.jumpVelocity;
    this.callbacks.jump?.();
    return true;
  }

  startScooter(duration = GAME.scooterDuration) {
    if (this.crashed) return false;
    this.scooterActive = true;
    this.scooterTimer = duration;
    this.scooter.visible = true;
    this.shield.visible = true;
    this.sliding = false;
    this.slideTimer = 0;
    return true;
  }

  stopScooter() {
    this.scooterActive = false;
    this.scooterTimer = 0;
    this.scooter.visible = false;
    this.shield.visible = this.invincibleTimer > 0;
  }

  respawn() {
    this.reset();
    this.invincibleTimer = 3;
    this.shield.visible = true;
  }

  slide() {
    if (this.crashed || this.scooterActive) return false;
    if (this.group.position.y > 0.02 || Math.abs(this.velocityY) > 0.01) {
      this.velocityY = Math.min(this.velocityY, -11);
      return false;
    }
    this.sliding = true;
    this.slideTimer = GAME.slideDuration;
    this.callbacks.slide?.();
    return true;
  }

  crash() {
    this.crashed = true;
    this.invincibleTimer = 0;
    this.stopScooter();
    this.crashTimer = 0;
    this.sliding = false;
    this.velocityY = 0;
  }

  update(delta, speed, mode = 'running') {
    if (mode === 'paused') return;
    this.invincibleTimer = Math.max(0, this.invincibleTimer - delta);
    this.shield.visible = !this.crashed && (this.scooterActive || this.invincibleTimer > 0);
    this.shield.material.color.set(this.scooterActive ? 0x72fff0 : 0xffd15c);
    if (this.invincibleTimer > 0 && !this.scooterActive) {
      this.shield.rotation.y += delta * 2.4;
      this.shield.material.opacity = 0.18 + Math.sin(this.invincibleTimer * 8) * 0.05;
    }
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
      this.visual.rotation.y = damp(this.visual.rotation.y, Math.PI, 5, delta);
      this.joints.leftArm.rotation.x = Math.sin(this.runPhase) * 0.045;
      this.joints.rightArm.rotation.x = -Math.sin(this.runPhase) * 0.045;
      this.joints.leftElbow.rotation.x = -0.12;
      this.joints.rightElbow.rotation.x = -0.12;
      this.joints.body.rotation.z = Math.sin(this.runPhase * 0.6) * 0.012;
      this.joints.body.position.y = Math.sin(this.runPhase) * 0.012;
      this.joints.head.rotation.y = Math.sin(this.runPhase * 0.45) * 0.18;
      this.joints.head.rotation.x = Math.sin(this.runPhase * 0.7) * 0.025;
      this.joints.rightArm.rotation.z = 0;
      this.joints.rightElbow.rotation.x = -0.12;
      this.joints.rightWrist.rotation.z = 0;
      this.joints.leftWrist.rotation.z = 0;
      this.joints.backpack.rotation.x = 0;
      return;
    }

    if (this.scooterActive) {
      this.scooterTimer = Math.max(0, this.scooterTimer - delta);
      if (this.scooterTimer <= 0) this.stopScooter();
    }
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
    const airborne = this.group.position.y > 0.02;

    if (this.sliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.slideTimer = 0;
        this.sliding = false;
      }
    }

    if (this.scooterActive) {
      this.runPhase += delta * 8;
      this.visual.scale.y = damp(this.visual.scale.y, 1, 18, delta);
      this.visual.rotation.x = damp(this.visual.rotation.x, airborne ? -0.2 : -0.12, 16, delta);
      this.visual.position.y = 0;
      this.visual.position.z = damp(this.visual.position.z, 0.12, 16, delta);
      for (const side of ['left', 'right']) {
        this.joints[`${side}Leg`].rotation.x = damp(this.joints[`${side}Leg`].rotation.x, 0.95, 18, delta);
        this.joints[`${side}Knee`].rotation.x = damp(this.joints[`${side}Knee`].rotation.x, -0.65, 18, delta);
        this.joints[`${side}Arm`].rotation.x = damp(this.joints[`${side}Arm`].rotation.x, 0.75, 18, delta);
        this.joints[`${side}Elbow`].rotation.x = damp(this.joints[`${side}Elbow`].rotation.x, -0.2, 18, delta);
        this.joints[`${side}Arm`].rotation.z = damp(this.joints[`${side}Arm`].rotation.z, 0, 18, delta);
        this.joints[`${side}Ankle`].rotation.x = damp(this.joints[`${side}Ankle`].rotation.x, 0.1, 18, delta);
        this.joints[`${side}Wrist`].rotation.z = damp(this.joints[`${side}Wrist`].rotation.z, 0, 18, delta);
      }
      const laneOffset = LANES[this.lane] - this.group.position.x;
      this.visual.rotation.z = damp(this.visual.rotation.z, laneOffset * -0.075, 12, delta);
      this.visual.rotation.y = damp(this.visual.rotation.y, laneOffset * -0.03, 10, delta);
      this.scooter.rotation.z = this.visual.rotation.z * 0.65;
      this.scooter.rotation.y = this.visual.rotation.y;
      this.joints.body.rotation.z = Math.sin(this.runPhase) * 0.008;
      this.joints.body.rotation.y = 0;
      this.joints.body.position.y = 0;
      this.joints.head.rotation.x = damp(this.joints.head.rotation.x, -0.06, 12, delta);
      this.joints.head.rotation.y = damp(this.joints.head.rotation.y, laneOffset * -0.06, 10, delta);
      this.joints.backpack.rotation.x = damp(this.joints.backpack.rotation.x, -0.04, 12, delta);
      for (const wheel of this.scooter.userData.wheels) {
        wheel.rotation.x -= speed * delta / (wheel.userData.radius || 0.34);
      }
      this.shield.rotation.y += delta * 1.8;
      this.shield.material.opacity = 0.16 + Math.sin(this.runPhase * 0.7) * 0.045;
      return;
    }

    this.runPhase += delta * (8 + speed * 0.28);
    const stepMarker = Math.floor(this.runPhase / Math.PI);
    if (stepMarker !== this.stepMarker) {
      this.stepMarker = stepMarker;
      if (!airborne && !this.sliding && this.startTimer <= 0) this.callbacks.step?.(stepMarker % 2);
    }
    const stride = Math.sin(this.runPhase);
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

    this.joints.leftArm.rotation.z = damp(this.joints.leftArm.rotation.z, 0, 14, delta);
    this.joints.rightArm.rotation.z = damp(this.joints.rightArm.rotation.z, 0, 18, delta);
    this.joints.rightWrist.rotation.z = damp(this.joints.rightWrist.rotation.z, 0, 14, delta);
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
      this.sliding ? 0 : laneOffset * -0.075, 9, delta);
    this.joints.head.rotation.x = damp(this.joints.head.rotation.x,
      this.sliding ? -0.12 : landing ? 0.13 : airborne ? -0.08 : stride * 0.018, 10, delta);
    this.joints.head.rotation.z = damp(this.joints.head.rotation.z, 0, 10, delta);
    this.joints.backpack.rotation.x = damp(this.joints.backpack.rotation.x,
      this.sliding ? -0.12 : stride * 0.025, 12, delta);
    this.joints.backpack.position.y = this.sliding ? 0 : Math.abs(Math.cos(this.runPhase)) * 0.015;
  }

  getCollider() {
    const height = this.sliding ? 0.82 : 2.12;
    const depth = this.scooterActive ? 1.8 : this.sliding ? 1.35 : 0.76;
    const width = this.scooterActive ? 0.9 : 0.74;
    const z = this.group.position.z + (this.sliding ? -0.2 : 0);
    return makeCollider(this.group.position.x, this.group.position.y, z, width, 0.03, height, depth);
  }
}
