import * as THREE from 'three';
import { GAME } from '../config.js';
import { WorldGenerator } from './WorldGenerator.js';
import { ObstacleSpawner } from './ObstacleSpawner.js';
import { Player } from './Player.js';
import { PoliceChase } from './PoliceChase.js';
import { ScoreManager } from './ScoreManager.js';
import { InputController } from './InputController.js';
import { CameraRig } from './CameraRig.js';
import { AudioManager } from './AudioManager.js';
import { GameUI } from '../ui/GameUI.js';

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fcfd0);
    this.scene.fog = new THREE.Fog(0xa8cfcb, 74, 232);
    this.cameraRig = new CameraRig();
    this.camera = this.cameraRig.camera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;
    container.appendChild(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0xe8f5ff, 0x716344, 1.7);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffe4b0, 2.45);
    sun.position.set(-18, 28, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -16;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.025;
    sun.target.position.set(0, 0, -18);
    this.scene.add(sun, sun.target);

    this.score = new ScoreManager();
    this.audio = new AudioManager();
    this.world = new WorldGenerator(this.scene);
    this.player = new Player(this.scene, {
      jump: () => this.audio.play('jump'),
      land: () => this.audio.play('land'),
      slide: () => this.audio.play('slide'),
    });
    this.police = new PoliceChase(this.scene);
    this.spawner = new ObstacleSpawner(this.scene, {
      onCoin: () => {
        this.score.addCoin();
        this.player.celebrate();
        this.audio.play('coin');
        this.ui?.pulseCoin();
      },
      onHit: () => {
        this.audio.play('collision');
        this.endRun();
      },
    });
    this.ui = new GameUI({
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
    });
    this.input = new InputController((action) => this.handleAction(action));
    this.input.attachTouch(container);

    this.state = 'menu';
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.lastTime = performance.now();
    this.currentTheme = null;
    this.themeTargets = { sky: new THREE.Color(), fog: new THREE.Color() };
    this.handleResize = () => this.resize();
    this.handleVisibility = () => {
      if (document.hidden && this.state === 'running') this.pause();
    };
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.resize();
    this.spawner.reset();
    this.ui.showMenu(this.score.bestScore);
    this.ui.setMuted(this.audio.muted);
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
  }

  startRun(seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) {
    this.state = 'running';
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.score.reset();
    this.player.reset();
    this.police.reset();
    this.world.reset();
    this.currentTheme = null;
    this.updateTheme(0);
    this.spawner.reset(seed);
    this.audio.setState('running');
    this.ui.showRunning();
    this.ui.updateHud(this.score, this.speed, true);
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
    this.audio.setState('gameover');
    this.ui.flashImpact();
    this.ui.showGameOver(this.score);
  }

  goToMenu() {
    this.state = 'menu';
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.player.reset();
    this.police.reset();
    this.world.reset();
    this.currentTheme = null;
    this.updateTheme(0);
    this.spawner.reset();
    this.audio.setState('menu');
    this.ui.showMenu(this.score.bestScore);
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
      this.themeTargets.sky.set(theme.sky);
      this.themeTargets.fog.set(theme.fog);
      this.ui.setDistrict(theme, announce);
    }
    if (delta === 0) {
      this.scene.background.copy(this.themeTargets.sky);
      this.scene.fog.color.copy(this.themeTargets.fog);
    } else {
      const blend = 1 - Math.exp(-delta * 0.75);
      this.scene.background.lerp(this.themeTargets.sky, blend);
      this.scene.fog.color.lerp(this.themeTargets.fog, blend);
    }
  }

  animate(time) {
    const delta = Math.min(Math.max((time - this.lastTime) / 1000, 0), 0.05);
    this.lastTime = time;

    if (this.state === 'running') {
      this.elapsed += delta;
      this.speed = Math.min(GAME.maxSpeed, GAME.baseSpeed + this.elapsed * GAME.acceleration);
      this.world.update(delta, this.speed);
      this.player.update(delta, this.speed, 'running');
      const result = this.spawner.update(delta, this.speed, this.player);
      if (result !== 'hit' && this.state === 'running') {
        this.score.update(delta, this.speed);
        this.ui.updateHud(this.score, this.speed);
      }
    } else if (this.state === 'menu') {
      this.player.update(delta, 0, 'menu');
      for (const entry of this.spawner.entries) {
        if (entry.type === 'coin') entry.mesh.rotation.y += delta * 1.8;
      }
    } else if (this.state === 'gameover') {
      this.player.update(delta, this.speed, 'gameover');
    }

    this.police.update(delta, this.speed, this.player, this.state, this.spawner.entries);
    this.updateTheme(delta);
    this.audio.update(delta, this.state);
    this.cameraRig.update(delta, this.player);
    this.renderer.render(this.scene, this.camera);
  }
}
