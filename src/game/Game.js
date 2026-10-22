import * as THREE from 'three';
import { GAME } from '../config.js';
import { WorldGenerator } from './WorldGenerator.js';
import { ObstacleSpawner } from './ObstacleSpawner.js';
import { Player } from './Player.js';
import { PoliceChase } from './PoliceChase.js';
import { ScoreManager } from './ScoreManager.js';
import { ProgressionManager } from './ProgressionManager.js';
import { InputController } from './InputController.js';
import { CameraRig } from './CameraRig.js';
import { AudioManager } from './AudioManager.js';
import { GameUI } from '../ui/GameUI.js';
import { GraphicsPipeline, isSoftwareRenderer } from './GraphicsPipeline.js';
import { configureSurfaceQuality } from '../art/MeshKit.js';
import { VisualEffects } from './VisualEffects.js';
import { ContactShadows } from './ContactShadows.js';

export function speedForElapsed(elapsed, scooterActive = false) {
  const cruiseSpeed = Math.min(GAME.maxSpeed, GAME.baseSpeed + Math.max(0, elapsed) * GAME.acceleration);
  return cruiseSpeed * (scooterActive ? GAME.scooterMultiplier : 1);
}

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fcfd0);
    this.scene.fog = new THREE.Fog(0xa8cfcb, 82, 285);
    this.cameraRig = new CameraRig();
    this.camera = this.cameraRig.camera;

    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const requestedQuality = new URLSearchParams(window.location.search).get('quality');
    this.softwareRenderer = requestedQuality === 'high' ? false : isSoftwareRenderer(this.renderer);
    if (this.softwareRenderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    }
    configureSurfaceQuality({
      bump: !this.softwareRenderer && !coarsePointer,
      roadBump: !this.softwareRenderer,
      anisotropy: this.softwareRenderer ? 1 : coarsePointer ? 2 : 4,
    });
    const pixelRatioLimit = this.softwareRenderer ? 0.75 : coarsePointer ? 1.5 : 1.4;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
    // Shadows are intentionally disabled on every device. Directional and
    // hemisphere lighting still provide depth without a second scene render.
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    container.appendChild(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xf2f8ff, 0x8a7c60, 1.65);
    this.scene.add(hemisphere);
    this.hemisphere = hemisphere;
    const sun = new THREE.DirectionalLight(0xffe9c4, 3.0);
    sun.position.set(26, 34, -45);
    sun.castShadow = false;
    sun.target.position.set(0, 0, -18);
    this.scene.add(sun, sun.target);
    this.sun = sun;
    // The main sun lights the character's front. A soft camera-side fill makes
    // the back, shoulders and road readable without any shadow-map render.
    const fill = new THREE.DirectionalLight(0xd9ecff, 1.35);
    fill.position.set(-18, 20, 32);
    fill.target.position.set(0, 1, -10);
    fill.castShadow = false;
    this.scene.add(fill, fill.target);
    this.fillLight = fill;
    this.graphics = new GraphicsPipeline(this.renderer, this.scene, this.camera, {
      coarsePointer, software: this.softwareRenderer,
    });

    this.score = new ScoreManager();
    this.progress = new ProgressionManager();
    this.runRewards = null;
    this.audio = new AudioManager();
    this.world = new WorldGenerator(this.scene);
    this.player = new Player(this.scene, {
      jump: () => { this.audio.play('jump'); this.cameraRig.pulse(0.08); },
      land: () => { this.audio.play('land'); this.cameraRig.pulse(0.2); },
      slide: () => this.audio.play('slide'),
      lane: (direction) => { this.audio.play('lane'); this.cameraRig.pulse(0.06, direction); },
      step: () => this.audio.play('step'),
    });
    this.police = new PoliceChase(this.scene);
    this.contactShadows = new ContactShadows(this.scene, { capacity: coarsePointer ? 40 : 48 });
    this.effects = new VisualEffects(this.scene, { capacity: coarsePointer ? 112 : 144 });
    this.spawner = new ObstacleSpawner(this.scene, {
      onCoin: () => {
        this.score.addCoin();
        this.audio.play('coin');
        this.effects.coin(this.player.group.position);
        this.ui?.pulseCoin();
      },
      onHit: () => {
        this.audio.play('collision');
        this.effects.crash(this.player.group.position);
        this.cameraRig.pulse(0.65);
        this.endRun();
      },
      onScooter: () => {
        if (!this.player.startScooter()) return;
        this.audio.play('powerup');
        this.effects.scooter(this.player.group.position);
        this.ui?.updateHud(this.score, this.speed, true, this.player);
      },
      onShieldHit: () => {
        this.audio.play('shield');
        this.effects.shield(this.player.group.position);
        this.ui?.flashShield();
      },
      onNearMiss: (entry, clearance, direction) => {
        this.score.addNearMiss();
        this.audio.play('nearMiss');
        this.effects.nearMiss(this.player.group.position);
        this.cameraRig.pulse(0.16, direction);
        this.ui?.showFeedback('NEAR MISS', '+250');
      },
    });
    this.ui = new GameUI({
      control: (action) => this.handleAction(action),
      play: () => { this.buttonFeedback(); this.startRun(); },
      restart: () => { this.buttonFeedback(); this.startRun(); },
      pause: () => { this.buttonFeedback(); this.pause(); },
      resume: () => { this.buttonFeedback(); this.resume(); },
      menu: () => { this.buttonFeedback(); this.goToMenu(); },
      mute: () => {
        this.audio.unlock();
        const muted = this.audio.toggleMute();
        this.ui.setMuted(muted);
        if (!muted) this.audio.play('button');
      },
      musicVolume: (value) => this.audio.setMusicVolume(value),
      sfxVolume: (value) => this.audio.setSfxVolume(value),
    });
    this.input = new InputController((action) => this.handleAction(action));
    this.input.attachTouch(container);

    this.state = 'menu';
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.nextMilestone = 500;
    this.lastTime = performance.now();
    this.currentTheme = null;
    this.themeTargets = {
      sky: new THREE.Color(), fog: new THREE.Color(), fogNear: 82, fogFar: 285,
      sun: new THREE.Color(0xffe9c4), fill: new THREE.Color(0xd9ecff),
      exposure: 1.16, sunIntensity: 3, hemisphereIntensity: 1.65,
    };
    this.handleResize = () => this.resize();
    this.handleVisibility = () => {
      if (document.hidden && this.state === 'running') this.pause();
    };
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.resize();
    this.spawner.reset();
    this.ui.showMenu(this.score.bestScore, this.progress.getSnapshot());
    this.ui.setMuted(this.audio.muted);
    this.ui.setVolumes(this.audio.musicVolume, this.audio.sfxVolume);
    this.updateTheme(0);
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
  }

  buttonFeedback() {
    this.audio.unlock();
    this.audio.play('button');
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.cameraRig.resize(width, height);
    this.renderer.setSize(width, height, false);
    this.graphics.resize(width, height);
  }

  startRun(seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) {
    this.state = 'running';
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.nextMilestone = 500;
    this.runRewards = null;
    this.score.reset();
    this.player.reset();
    this.cameraRig.reset();
    this.police.reset();
    this.effects.reset(this.player);
    this.world.reset();
    this.currentTheme = null;
    this.updateTheme(0);
    this.spawner.reset(seed);
    this.audio.setState('running');
    this.ui.showRunning();
    this.ui.updateHud(this.score, this.speed, true, this.player);
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.audio.setState('paused');
    this.ui.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.lastTime = performance.now();
    this.audio.setState('running');
    this.ui.showRunning();
  }

  endRun() {
    if (this.state !== 'running') return;
    this.state = 'gameover';
    this.player.crash();
    this.score.finish();
    this.runRewards = this.progress.recordRun(this.score);
    this.audio.setState('gameover');
    this.ui.flashImpact();
    this.ui.showGameOver(this.score, this.runRewards, this.progress.getSnapshot());
  }

  goToMenu() {
    this.state = 'menu';
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.player.reset();
    this.cameraRig.reset();
    this.police.reset();
    this.effects.reset(this.player);
    this.world.reset();
    this.currentTheme = null;
    this.updateTheme(0);
    this.spawner.reset();
    this.audio.setState('menu');
    this.ui.showMenu(this.score.bestScore, this.progress.getSnapshot());
  }

  handleAction(action) {
    this.audio.unlock();
    if (this.state === 'menu') {
      if (action === 'confirm') { this.audio.play('button'); this.startRun(); }
      return;
    }
    if (this.state === 'gameover') {
      if (action === 'confirm') { this.audio.play('button'); this.startRun(); }
      return;
    }
    if (this.state === 'paused') {
      if (action === 'pause' || action === 'confirm') this.resume();
      return;
    }
    switch (action) {
      case 'left': this.player.moveLeft(); break;
      case 'right': this.player.moveRight(); break;
      case 'jump': this.player.jump(); break;
      case 'slide': this.player.slide(); break;
      case 'pause': this.pause(); break;
      default: break;
    }
  }

  updateTheme(delta) {
    const theme = this.world.getCurrentTheme();
    if (this.currentTheme?.id !== theme.id) {
      const announce = Boolean(this.currentTheme && this.state === 'running');
      this.currentTheme = theme;
      this.spawner.setDistrict(theme.id);
      this.themeTargets.sky.set(theme.sky);
      this.themeTargets.fog.set(theme.fog);
      this.themeTargets.fogNear = theme.fogNear ?? 82;
      this.themeTargets.fogFar = theme.fogFar ?? 285;
      const hot = ['ancient', 'palmyrah'].includes(theme.layout);
      const mist = ['hill', 'rail', 'tea'].includes(theme.layout);
      this.themeTargets.sun.set(hot ? 0xffd39a : mist ? 0xe4efff : 0xffe9c4);
      this.themeTargets.fill.set(mist ? 0xd5e7ff : 0xd9ecff);
      this.themeTargets.exposure = hot ? 1.12 : mist ? 1.14 : 1.16;
      this.themeTargets.sunIntensity = hot ? 2.75 : mist ? 2.65 : 3;
      this.themeTargets.hemisphereIntensity = mist ? 1.55 : 1.65;
      this.ui.setDistrict(theme, announce);
    }
    const lightBlend = delta === 0 ? 1 : 1 - Math.exp(-delta * 0.9);
    this.sun.color.lerp(this.themeTargets.sun, lightBlend);
    this.fillLight.color.lerp(this.themeTargets.fill, lightBlend);
    this.sun.intensity = THREE.MathUtils.lerp(this.sun.intensity, this.themeTargets.sunIntensity, lightBlend);
    this.hemisphere.intensity = THREE.MathUtils.lerp(this.hemisphere.intensity, this.themeTargets.hemisphereIntensity, lightBlend);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      this.renderer.toneMappingExposure, this.themeTargets.exposure, lightBlend,
    );
    if (delta === 0) {
      this.scene.background.copy(this.themeTargets.sky);
      this.scene.fog.color.copy(this.themeTargets.fog);
      this.scene.fog.near = this.themeTargets.fogNear;
      this.scene.fog.far = this.themeTargets.fogFar;
    } else {
      const blend = 1 - Math.exp(-delta * 0.75);
      this.scene.background.lerp(this.themeTargets.sky, blend);
      this.scene.fog.color.lerp(this.themeTargets.fog, blend);
      this.scene.fog.near = THREE.MathUtils.lerp(this.scene.fog.near, this.themeTargets.fogNear, blend);
      this.scene.fog.far = THREE.MathUtils.lerp(this.scene.fog.far, this.themeTargets.fogFar, blend);
    }
    this.graphics.setTheme(this.scene.background, this.scene.fog.color);
  }

  animate(time) {
    // Preserve real-time speed on slow devices, but keep physics/collision steps
    // small and bounded. Swept collisions and the scenery queue handle each step.
    const frameDelta = Math.min(Math.max((time - this.lastTime) / 1000, 0), 0.25);
    this.lastTime = time;

    let policeAdvanced = false;
    if (this.state === 'running') {
      const steps = Math.max(1, Math.ceil(frameDelta / 0.05));
      const stepDelta = frameDelta / steps;
      for (let step = 0; step < steps && this.state === 'running'; step += 1) {
        this.elapsed += stepDelta;
        this.speed = speedForElapsed(this.elapsed, this.player.scooterActive);
        this.world.update(stepDelta, this.speed);
        this.player.update(stepDelta, this.speed, 'running');
        const result = this.spawner.update(stepDelta, this.speed, this.player);
        if (result !== 'hit' && this.state === 'running') this.score.update(stepDelta, this.speed);
        this.police.update(stepDelta, this.speed, this.player, this.state, this.spawner.entries);
        policeAdvanced = true;
      }
      // Avoid repeating DOM writes for every physics catch-up substep.
      if (this.state === 'running') {
        this.ui.updateHud(this.score, this.speed, false, this.player);
        if (this.score.distance >= this.nextMilestone) {
          const milestone = this.nextMilestone;
          this.nextMilestone += 500;
          this.audio.play('milestone');
          this.ui.showFeedback(`${milestone.toLocaleString()} M`, 'ISLAND MILESTONE');
        }
      }
    } else if (this.state === 'menu') {
      this.player.update(frameDelta, 0, 'menu');
      for (const entry of this.spawner.entries) {
        if (entry.type === 'coin') entry.mesh.rotation.y += frameDelta * 1.8;
      }
    } else if (this.state === 'gameover') {
      this.player.update(frameDelta, this.speed, 'gameover');
    }

    if (!policeAdvanced) this.police.update(frameDelta, this.speed, this.player, this.state, this.spawner.entries);
    this.updateTheme(frameDelta);
    this.audio.update(frameDelta, this.state);
    this.cameraRig.update(frameDelta, this.player, this.speed, this.state);
    this.effects.update(frameDelta, this.speed, this.player, this.state, this.renderer.getPixelRatio());
    this.contactShadows.update(this.player, this.police, this.spawner.entries);
    this.graphics.render(frameDelta);
  }
}
