import * as THREE from 'three';
import { LANES, PLAYER_Z } from '../config.js';
import { createPoliceOfficer } from '../art/Policeman.js';

const damp = THREE.MathUtils.damp;
export const POLICE_MIN_GAP = 2.2;

/** A visual pursuer with a guaranteed safety gap; he never ends the run. */
export class PoliceChase {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'Sri Lankan police pursuit — non-catching NPC';
    this.visual = createPoliceOfficer();
    this.group.add(this.visual);
    scene.add(this.group);
    this.joints = this.visual.userData.joints;
    this.baseScale = 0.86;
    this.reset();
  }

  reset() {
    this.group.position.set(LANES[1] + 0.55, 0, PLAYER_Z + 6.2);
    this.group.visible = false;
    this.chaseStarted = false;
    this.visual.position.set(0, 0, 0);
    this.visual.rotation.set(0, 0, 0);
    this.visual.scale.setScalar(this.baseScale);
    this.runPhase = 0;
    this.velocityY = 0;
    this.slideTimer = 0;
    this.landingTimer = 0;
    this.startTimer = 0.7;
    this.behaviorTime = 0;
    this.pointTimer = 0;
    this.targetLane = 1;
    this.avoiding = false;
    Object.values(this.joints).forEach((joint) => {
      joint.rotation.set(0, 0, 0);
      if (joint === this.joints.body || joint === this.joints.pelvis) joint.position.set(0, 0, 0);
    });
  }

  nearestLane() {
    let nearest = 0;
    for (let lane = 1; lane < LANES.length; lane += 1) {
      if (Math.abs(LANES[lane] - this.group.position.x) < Math.abs(LANES[nearest] - this.group.position.x)) nearest = lane;
    }
    return nearest;
  }

  avoidTraffic(entries, player, delta) {
    const currentLane = this.nearestLane();
    let blockedMask = 0;
    let response = null;
    let responseZ = -Infinity;
    // A single allocation-free scan keeps the NPC inexpensive on mobile.
    for (const entry of entries) {
      if (entry.type !== 'obstacle') continue;
      const z = entry.mesh.position.z;
      if (z <= this.group.position.z - 7 || z >= this.group.position.z + 2.2) continue;
      if (entry.spec.avoid === 'lane') blockedMask |= 1 << entry.lane;
      if (entry.lane === currentLane && z < this.group.position.z
        && this.group.position.z - z < 5.2 && z > responseZ) {
        response = entry.spec.avoid;
        responseZ = z;
      }
    }
    this.targetLane = player.lane;
    this.avoiding = false;
    if ((blockedMask & (1 << currentLane)) || (blockedMask & (1 << this.targetLane))) {
      let freeLane = -1;
      let bestDistance = Infinity;
      for (let lane = 0; lane < LANES.length; lane += 1) {
        const distance = Math.abs(lane - player.lane);
        if (!(blockedMask & (1 << lane)) && distance < bestDistance) {
          freeLane = lane;
          bestDistance = distance;
        }
      }
      if (freeLane >= 0) {
        this.targetLane = freeLane;
        this.avoiding = freeLane !== player.lane;
      }
    }

    if (response === 'jump' && this.group.position.y <= 0.01 && Math.abs(this.velocityY) < 0.01) {
      this.velocityY = 8.2;
    } else if (response === 'slide' && this.group.position.y <= 0.01) {
      this.slideTimer = Math.max(this.slideTimer, 0.66);
    }

    const responseTime = this.avoiding ? 12 : 6.5;
    // Run at the player's shoulder rather than directly over their silhouette.
    const shoulderOffset = this.targetLane === LANES.length - 1 ? -0.55 : 0.55;
    this.group.position.x = damp(this.group.position.x, LANES[this.targetLane] + shoulderOffset, responseTime, delta);
  }

  update(delta, speed, player, mode = 'running', entries = []) {
    if (mode === 'paused') return;
    if (mode === 'menu') {
      // The title screen is a solo runner showcase. Keep the pursuit reset,
      // but do not render or animate an officer who is not in the scene yet.
      this.group.visible = false;
      this.chaseStarted = false;
      this.behaviorTime = 0;
      this.pointTimer = 0;
      return;
    }
    if (mode === 'running' && !this.chaseStarted) {
      this.chaseStarted = true;
      this.group.visible = true;
      this.group.position.z = PLAYER_Z + 6.2;
      this.startTimer = 0.7;
    }
    if (mode === 'gameover') this.group.visible = this.chaseStarted;
    this.slideTimer = Math.max(0, this.slideTimer - delta);
    this.landingTimer = Math.max(0, this.landingTimer - delta);
    this.startTimer = Math.max(0, this.startTimer - delta);
    this.pointTimer = Math.max(0, this.pointTimer - delta);
    if (mode === 'running') {
      this.behaviorTime += delta;
      if (this.behaviorTime >= 5.2) {
        this.behaviorTime = 0;
        this.pointTimer = 0.75;
      }
    } else {
      this.behaviorTime = 0;
      this.pointTimer = 0;
    }

    if (mode === 'running') {
      this.avoidTraffic(entries, player, delta);
      const gap = player.scooterActive ? 18 : 3.0 + THREE.MathUtils.clamp((speed - 14) / 22, 0, 1) * 0.25;
      this.group.position.z = damp(this.group.position.z, PLAYER_Z + gap, player.scooterActive ? 4.5 : 3.5, delta);
      this.group.visible = !player.scooterActive || this.group.position.z < 14.5;
    } else {
      this.targetLane = 1;
      this.avoiding = false;
      const menu = mode === 'menu';
      this.group.position.x = damp(this.group.position.x, menu ? -1.35 : player.group.position.x, 3, delta);
      this.group.position.z = damp(this.group.position.z, PLAYER_Z + (menu ? 2.45 : 2.55), 3, delta);
    }
    // This invariant makes catching the schoolboy impossible, including after a crash.
    this.group.position.z = Math.max(PLAYER_Z + POLICE_MIN_GAP, this.group.position.z);

    if (this.group.position.y > 0 || this.velocityY > 0) {
      this.velocityY -= 24 * delta;
      this.group.position.y += this.velocityY * delta;
      if (this.group.position.y <= 0) {
        if (this.velocityY < -2) this.landingTimer = 0.22;
        this.group.position.y = 0;
        this.velocityY = 0;
      }
    }

    const running = mode === 'running';
    const stopped = mode === 'gameover';
    const menu = mode === 'menu';
    this.runPhase += delta * (running ? 8.6 + Math.min(speed, 36) * 0.27 : 1.6);
    const stride = running ? Math.sin(this.runPhase) : 0;
    const airborne = this.group.position.y > 0.02;
    const sliding = this.slideTimer > 0 && !airborne;
    const landing = this.landingTimer > 0 && !airborne && !sliding;
    const pointing = this.pointTimer > 0 && running && !airborne && !sliding && !landing && !this.avoiding;
    const animatedRun = running && !airborne && !sliding && !landing;
    const scaleY = this.baseScale * (sliding ? 0.68 : landing ? 0.9 : 1);
    this.visual.scale.y = damp(this.visual.scale.y, scaleY, 20, delta);
    this.visual.scale.x = this.baseScale;
    this.visual.scale.z = this.baseScale;
    this.visual.rotation.y = damp(this.visual.rotation.y, mode === 'menu' ? Math.PI : 0, 5, delta);
    this.visual.rotation.x = damp(this.visual.rotation.x,
      sliding ? 0.92 : airborne ? -0.12 : running ? (this.startTimer > 0 ? -0.2 : -0.1) : 0, 16, delta);
    const visualOffset = this.targetLane === LANES.length - 1 ? -0.55 : 0.55;
    this.visual.rotation.z = damp(this.visual.rotation.z,
      running ? (LANES[this.targetLane] + visualOffset - this.group.position.x) * -0.055 : 0, 10, delta);
    this.visual.position.y = 0;
    this.joints.body.position.y = landing ? -0.055
      : running ? Math.abs(Math.cos(this.runPhase)) * 0.034
        : stopped ? Math.sin(this.runPhase * 1.4) * 0.018 : Math.sin(this.runPhase) * 0.009;
    this.joints.pelvis.position.y = landing ? -0.035 : animatedRun ? Math.abs(Math.sin(this.runPhase)) * 0.016 : 0;
    this.joints.pelvis.rotation.z = animatedRun ? stride * 0.035 : 0;
    this.joints.pelvis.rotation.y = animatedRun ? -stride * 0.055 : 0;
    this.joints.body.rotation.y = animatedRun ? stride * 0.065 : 0;
    this.joints.body.rotation.z = animatedRun ? -stride * 0.018 : 0;

    if (menu) {
      this.joints.leftLeg.rotation.x = damp(this.joints.leftLeg.rotation.x, 0, 8, delta);
      this.joints.rightLeg.rotation.x = damp(this.joints.rightLeg.rotation.x, 0, 8, delta);
      this.joints.leftArm.rotation.x = Math.sin(this.runPhase) * 0.04;
      this.joints.rightArm.rotation.x = -Math.sin(this.runPhase) * 0.04;
      this.joints.leftArm.rotation.z = damp(this.joints.leftArm.rotation.z, -0.09, 8, delta);
      this.joints.rightArm.rotation.z = damp(this.joints.rightArm.rotation.z, 0.09, 8, delta);
      this.joints.leftElbow.rotation.x = -0.28;
      this.joints.rightElbow.rotation.x = -0.28;
    } else if (stopped) {
      const breath = Math.sin(this.runPhase * 1.4);
      this.joints.leftLeg.rotation.x = damp(this.joints.leftLeg.rotation.x, 0.08, 7, delta);
      this.joints.rightLeg.rotation.x = damp(this.joints.rightLeg.rotation.x, -0.08, 7, delta);
      this.joints.leftArm.rotation.x = -0.24 + breath * 0.035;
      this.joints.rightArm.rotation.x = -0.24 - breath * 0.035;
      this.joints.leftArm.rotation.z = damp(this.joints.leftArm.rotation.z, -0.34, 7, delta);
      this.joints.rightArm.rotation.z = damp(this.joints.rightArm.rotation.z, 0.34, 7, delta);
      this.joints.leftElbow.rotation.x = damp(this.joints.leftElbow.rotation.x, -1.02, 7, delta);
      this.joints.rightElbow.rotation.x = damp(this.joints.rightElbow.rotation.x, -1.02, 7, delta);
    } else if (sliding) {
      this.joints.leftLeg.rotation.x = damp(this.joints.leftLeg.rotation.x, 0.02, 20, delta);
      this.joints.rightLeg.rotation.x = damp(this.joints.rightLeg.rotation.x, -0.12, 20, delta);
      this.joints.leftKnee.rotation.x = damp(this.joints.leftKnee.rotation.x, 0.04, 20, delta);
      this.joints.rightKnee.rotation.x = damp(this.joints.rightKnee.rotation.x, 0.38, 20, delta);
      this.joints.leftArm.rotation.x = damp(this.joints.leftArm.rotation.x, -0.55, 20, delta);
      this.joints.rightArm.rotation.x = damp(this.joints.rightArm.rotation.x, 0.18, 20, delta);
      this.joints.leftArm.rotation.z = damp(this.joints.leftArm.rotation.z, -0.14, 16, delta);
      this.joints.rightArm.rotation.z = damp(this.joints.rightArm.rotation.z, 0.16, 16, delta);
      this.joints.leftElbow.rotation.x = -0.25;
      this.joints.rightElbow.rotation.x = -0.55;
    } else if (airborne) {
      this.joints.leftLeg.rotation.x = damp(this.joints.leftLeg.rotation.x, 0.72, 14, delta);
      this.joints.rightLeg.rotation.x = damp(this.joints.rightLeg.rotation.x, -0.42, 14, delta);
      this.joints.leftKnee.rotation.x = damp(this.joints.leftKnee.rotation.x, 1.05, 14, delta);
      this.joints.rightKnee.rotation.x = damp(this.joints.rightKnee.rotation.x, 0.28, 14, delta);
      this.joints.leftArm.rotation.x = damp(this.joints.leftArm.rotation.x, -0.95, 14, delta);
      this.joints.rightArm.rotation.x = damp(this.joints.rightArm.rotation.x, 0.72, 14, delta);
      this.joints.leftElbow.rotation.x = -0.48;
      this.joints.rightElbow.rotation.x = -0.48;
    } else if (landing) {
      for (const side of ['left', 'right']) {
        this.joints[`${side}Leg`].rotation.x = damp(this.joints[`${side}Leg`].rotation.x, 0.22, 24, delta);
        this.joints[`${side}Knee`].rotation.x = damp(this.joints[`${side}Knee`].rotation.x, 0.6, 24, delta);
        this.joints[`${side}Arm`].rotation.x = damp(this.joints[`${side}Arm`].rotation.x, -0.45, 20, delta);
        this.joints[`${side}Elbow`].rotation.x = -0.55;
      }
    } else {
      const drive = 1 + this.startTimer * 0.35;
      this.joints.leftLeg.rotation.x = stride * 0.86 * drive;
      this.joints.rightLeg.rotation.x = -stride * 0.86 * drive;
      this.joints.leftKnee.rotation.x = 0.08 + Math.max(0, -stride) * 1.05;
      this.joints.rightKnee.rotation.x = 0.08 + Math.max(0, stride) * 1.05;
      this.joints.leftArm.rotation.x = -stride * 0.82 * drive;
      this.joints.rightArm.rotation.x = stride * 0.82 * drive;
      this.joints.leftElbow.rotation.x = -0.48 - Math.max(0, stride) * 0.34;
      this.joints.rightElbow.rotation.x = -0.48 - Math.max(0, -stride) * 0.34;
      this.joints.leftArm.rotation.z = damp(this.joints.leftArm.rotation.z, this.avoiding ? -0.16 : 0, 12, delta);
      this.joints.rightArm.rotation.z = damp(this.joints.rightArm.rotation.z, this.avoiding ? 0.16 : 0, 12, delta);
      if (pointing) {
        this.joints.rightArm.rotation.x = damp(this.joints.rightArm.rotation.x, 1.35, 22, delta);
        this.joints.rightArm.rotation.z = damp(this.joints.rightArm.rotation.z, 0.5, 18, delta);
        this.joints.rightElbow.rotation.x = damp(this.joints.rightElbow.rotation.x, -0.12, 22, delta);
      }
    }

    this.joints.leftAnkle.rotation.x = damp(this.joints.leftAnkle.rotation.x,
      sliding ? 0.08 : -this.joints.leftLeg.rotation.x * 0.28 + Math.max(0, stride) * 0.12, 18, delta);
    this.joints.rightAnkle.rotation.x = damp(this.joints.rightAnkle.rotation.x,
      sliding ? -0.08 : -this.joints.rightLeg.rotation.x * 0.28 + Math.max(0, -stride) * 0.12, 18, delta);
    this.joints.leftWrist.rotation.x = Math.sin(this.runPhase + 0.5) * (running ? 0.11 : 0.04);
    this.joints.rightWrist.rotation.x = pointing ? -0.18 : -Math.sin(this.runPhase + 0.5) * (running ? 0.11 : 0.04);
    this.joints.leftWrist.rotation.z = damp(this.joints.leftWrist.rotation.z, 0, 12, delta);
    this.joints.rightWrist.rotation.z = damp(this.joints.rightWrist.rotation.z, pointing ? -0.12 : 0, 12, delta);
    this.joints.baton.rotation.x = damp(this.joints.baton.rotation.x, running ? Math.sin(this.runPhase + 0.8) * 0.13 : 0, 10, delta);
    this.joints.baton.rotation.z = damp(this.joints.baton.rotation.z, this.avoiding ? 0.15 : 0, 10, delta);
    const headLook = menu ? Math.sin(this.runPhase * 0.5) * 0.15
      : stopped ? Math.sin(this.runPhase * 0.7) * 0.1
        : THREE.MathUtils.clamp((player.group.position.x - this.group.position.x) * 0.06, -0.28, 0.28);
    this.joints.head.rotation.y = damp(this.joints.head.rotation.y, headLook, 7, delta);
    this.joints.head.rotation.x = damp(this.joints.head.rotation.x,
      stopped ? 0.18 : sliding ? -0.18 : landing ? 0.15 : airborne ? -0.08 : pointing ? -0.06 : 0, 8, delta);
    this.joints.head.rotation.z = damp(this.joints.head.rotation.z, this.avoiding ? -this.visual.rotation.z * 0.5 : 0, 8, delta);
  }

  getGap() {
    return this.group.position.z - PLAYER_Z;
  }
}
