import * as THREE from 'three';
import { GAME } from '../config.js';
import { WorldGenerator } from './WorldGenerator.js';
import { ObstacleSpawner } from './ObstacleSpawner.js';
import { Player } from './Player.js';
import { PoliceChase } from './PoliceChase.js';
import { ScoreManager } from './ScoreManager.js';
import { ProgressionManager } from './ProgressionManager.js';
import { ShopManager } from './ShopManager.js';
import { JuiceInventory } from './JuiceInventory.js';
import { InputController } from './InputController.js';
import { CameraRig } from './CameraRig.js';
import { AudioManager } from './AudioManager.js';
import { GameUI } from '../ui/GameUI.js';
import { GraphicsPipeline, isSoftwareRenderer } from './GraphicsPipeline.js';
import { configureSurfaceQuality } from '../art/MeshKit.js';
import { VisualEffects } from './VisualEffects.js';
import { ContactShadows } from './ContactShadows.js';
import { LongShadows } from './LongShadows.js';
import { GodRays } from './GodRays.js';
import { RoadLightPools } from './RoadLightPools.js';
import { eveningPalette } from './Evening.js';
import { RewardedAds } from '../mobile/RewardedAds.js';

export function speedForElapsed(elapsed, scooterActive = false) {
  const cruiseSpeed = Math.min(GAME.maxSpeed, GAME.baseSpeed + Math.max(0, elapsed) * GAME.acceleration);
  return cruiseSpeed * (scooterActive ? GAME.scooterMultiplier : 1);
}

export class Game {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x243b58);
    this.scene.fog = new THREE.Fog(0x4c6072, 82, 285);
    this.cameraRig = new CameraRig();
    this.camera = this.cameraRig.camera;

    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    this.renderer = new THREE.WebGLRenderer({ antialias: !coarsePointer, powerPreference: 'high-performance' });
    const requestedQuality = new URLSearchParams(window.location.search).get('quality');
    this.softwareRenderer = requestedQuality === 'high' ? false : isSoftwareRenderer(this.renderer);
    if (this.softwareRenderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    }
    configureSurfaceQuality({
      bump: !this.softwareRenderer && !coarsePointer,
      roadBump: !this.softwareRenderer && !coarsePointer,
      anisotropy: this.softwareRenderer ? 1 : coarsePointer ? 2 : 4,
    });
    this.coarsePointer = coarsePointer;
    this.pixelRatioLimit = this.softwareRenderer ? 1 : coarsePointer ? 1.25 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.pixelRatioLimit));
    // Batched projected/contact shadows ground the scene without a costly
    // second shadow-map scene render on mid-range phones.
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    const hemisphere = new THREE.HemisphereLight(0x8fa8d6, 0x3c3140, 0.62);
    this.scene.add(hemisphere);
    this.hemisphere = hemisphere;
    const sun = new THREE.DirectionalLight(0xffad73, 2.15);
    sun.position.set(46, 12, -62);
    sun.castShadow = false;
    sun.target.position.set(0, 0, -18);
    this.scene.add(sun, sun.target);
    this.sun = sun;
    // A restrained camera-side fill preserves runner/road readability while
    // allowing the warm low sun to define the scene instead of flat ambient light.
    const fill = new THREE.DirectionalLight(0x9bbcff, 0.68);
    fill.position.set(-18, 20, 32);
    fill.target.position.set(0, 1, -10);
    fill.castShadow = false;
    this.scene.add(fill, fill.target);
    this.fillLight = fill;
    this.graphics = new GraphicsPipeline(this.renderer, this.scene, this.camera, {
      coarsePointer, software: this.softwareRenderer,
    });
    if (coarsePointer) {
      this.graphics.performanceMode = true;
      this.graphics.quality = 'performance-mobile';
      for (const cloud of this.graphics.clouds) cloud.visible = false;
    }

    this.score = new ScoreManager();
    this.progress = new ProgressionManager();
    this.shop = new ShopManager(globalThis.localStorage, { legacyCoins: this.progress.totals.coins });
    this.juice = new JuiceInventory(globalThis.localStorage);
    this.runRewards = null;
    this.audio = new AudioManager();
    this.world = new WorldGenerator(this.scene, {
      detailDistance: coarsePointer ? 175 : this.softwareRenderer ? 165 : 210,
      animationHz: coarsePointer ? 20 : 60,
    });
    this.player = new Player(this.scene, {
      jump: () => { this.audio.play('jump'); this.cameraRig.pulse(0.08); },
      land: () => { this.audio.play('land'); this.cameraRig.pulse(0.2); },
      slide: () => this.audio.play('slide'),
      lane: (direction) => { this.audio.play('lane'); this.cameraRig.pulse(0.06, direction); },
      step: () => this.audio.play('step'),
    }, this.shop.selectedId);
    this.police = new PoliceChase(this.scene);
    this.contactShadows = new ContactShadows(this.scene, { capacity: coarsePointer ? 40 : 48 });
    this.longShadows = new LongShadows(this.scene, {
      enabled: !this.softwareRenderer, capacity: coarsePointer ? 20 : 32,
    });
    this.godRays = new GodRays(this.scene, {
      enabled: !this.softwareRenderer, capacity: coarsePointer ? 4 : 7,
    });
    this.roadLights = new RoadLightPools(this.scene, {
      enabled: true, roadGlow: !coarsePointer, capacity: coarsePointer || this.softwareRenderer ? 24 : 36,
    });
    this.effects = new VisualEffects(this.scene, { capacity: coarsePointer ? 112 : 144 });
    this.spawner = new ObstacleSpawner(this.scene, {
      onCoin: () => {
        this.score.addCoin();
        this.shop.earn(1);
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
      onJuice: (entry) => {
        if (!this.juice.add()) {
          if (!entry.fullNotified) {
            entry.fullNotified = true;
            this.ui?.showFeedback('JUICE PACK FULL', '3 / 3 PACKETS');
          }
          return false;
        }
        this.audio.play('powerup');
        this.effects.juice(this.player.group.position);
        this.ui?.setJuice(this.juice.count);
        this.ui?.showFeedback('JUICE PACKET', 'REVIVE READY');
        return true;
      },
    });
    this.ui = new GameUI({
      control: (action) => this.handleAction(action),
      play: () => { this.buttonFeedback(); this.startRun(); },
      restart: () => { this.buttonFeedback(); this.startRun(); },
      pause: () => { this.buttonFeedback(); this.pause(); },
      resume: () => { this.buttonFeedback(); this.resume(); },
      menu: () => { this.buttonFeedback(); this.goToMenu(); },
      shop: () => { this.buttonFeedback(); this.openShop(); },
      closeShop: () => { this.buttonFeedback(); this.closeShop(); },
      chooseCharacter: (id) => { this.buttonFeedback(); this.chooseCharacter(id); },
      revive: () => { this.buttonFeedback(); this.respawn(); },
      adRevive: () => { this.buttonFeedback(); this.reviveWithAd(); },
      finish: () => { this.buttonFeedback(); this.finishRun(); },
      mute: () => {
        this.audio.unlock();
        const muted = this.audio.toggleMute();
        this.ui.setMuted(muted);
        if (!muted) this.audio.play('button');
      },
      musicVolume: (value) => this.audio.setMusicVolume(value),
      sfxVolume: (value) => this.audio.setSfxVolume(value),
    });
    this.rewardedAds = new RewardedAds({
      onStatus: (status) => this.ui.setReviveAdStatus(status),
    });
    this.input = new InputController((action) => this.handleAction(action));
    this.input.attachTouch(container);

    this.state = 'menu';
    this.revivePending = false;
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.nextMilestone = 500;
    this.lastTime = performance.now();
    this.currentTheme = null;
    this.themeTargets = {
      sky: new THREE.Color(), fog: new THREE.Color(), fogNear: 82, fogFar: 285,
      sun: new THREE.Color(0xffad73), fill: new THREE.Color(0x9bbcff),
      exposure: 1.08, sunIntensity: 2.15, hemisphereIntensity: 0.62,
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
    this.ui.setInventory(this.shop.wallet, this.juice.count);
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
    const maximum = Math.min(window.devicePixelRatio || 1, this.pixelRatioLimit);
    const minimum = Math.min(maximum, this.coarsePointer ? 0.85 : 1);
    const current = this.renderer.getPixelRatio();
    const next = this.graphics.adaptations > 0 ? Math.max(minimum, Math.min(current, maximum)) : maximum;
    this.graphics.maxPixelRatio = maximum;
    this.graphics.minimumPixelRatio = minimum;
    if (Math.abs(next - current) > 0.001) {
      this.renderer.setPixelRatio(next);
      this.graphics.composer?.setPixelRatio(next);
    }
    this.cameraRig.resize(width, height);
    this.renderer.setSize(width, height, false);
    this.graphics.resize(width, height);
  }

  startRun(seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) {
    const fromMenu = this.state === 'menu';
    const menuRotation = this.player.visual.rotation.y;
    this.shop.save();
    this.state = 'running';
    this.revivePending = false;
    this.speed = GAME.baseSpeed;
    this.elapsed = 0;
    this.nextMilestone = 500;
    this.runRewards = null;
    this.score.reset();
    this.player.reset();
    if (fromMenu) this.player.visual.rotation.y = menuRotation;
    this.cameraRig.beginRun(fromMenu);
    this.police.reset();
    this.effects.reset(this.player);
    this.world.reset();
    this.currentTheme = null;
    this.updateTheme(0);
    this.spawner.reset(seed);
    this.audio.setState('running');
    this.ui.showRunning();
    this.ui.setJuice(this.juice.count);
    this.ui.updateHud(this.score, this.speed, true, this.player);
    if (this.rewardedAds.supported && this.rewardedAds.status !== 'ready') this.rewardedAds.initialize();
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.shop.save();
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
    this.shop.save();
    if (this.rewardedAds.supported && this.rewardedAds.status !== 'ready') this.rewardedAds.initialize?.();
    if (this.juice.count > 0 || this.rewardedAds.supported) {
      this.state = 'revive';
      this.revivePending = false;
      this.player.crash();
      this.audio.setState('gameover');
      this.ui.showRevive(this.juice.count, this.rewardedAds.supported);
      return;
    }
    this.finishRun();
  }

  finishRun() {
    if (this.revivePending) return false;
    if (this.state !== 'running' && this.state !== 'revive') return false;
    this.state = 'gameover';
    this.player.crash();
    this.score.finish();
    this.shop.save();
    this.runRewards = this.progress.recordRun(this.score);
    this.audio.setState('gameover');
    this.ui.flashImpact();
    this.ui.showGameOver(this.score, this.runRewards, this.progress.getSnapshot());
  }

  respawn() {
    if (this.state !== 'revive' || this.revivePending || !this.juice.consume()) return false;
    return this.completeRespawn('juice');
  }

  async reviveWithAd() {
    if (this.state !== 'revive' || this.revivePending || !this.rewardedAds.supported) return false;
    this.revivePending = true;
    this.ui.setReviveAdPending(true);
    let rewarded = false;
    try {
      rewarded = await this.rewardedAds.show();
    } catch {
      rewarded = false;
    }
    if (this.state !== 'revive') {
      this.revivePending = false;
      return false;
    }
    this.revivePending = false;
    this.ui.setReviveAdPending(false);
    if (!rewarded) {
      const feedback = this.rewardedAds.getFeedback?.() || 'AD NOT COMPLETED • TRY AGAIN OR END THIS RUN';
      this.ui.setReviveAdMessage(feedback);
      return false;
    }
    return this.completeRespawn('ad');
  }

  completeRespawn(source) {
    if (this.state !== 'revive') return false;
    this.revivePending = false;
    this.player.respawn();
    this.spawner.prepareRespawn();
    this.police.reset();
    this.cameraRig.reset();
    this.effects.reset(this.player);
    this.state = 'running';
    this.lastTime = performance.now();
    this.audio.setState('running');
    this.ui.showRunning();
    this.ui.setJuice(this.juice.count);
    this.ui.updateHud(this.score, this.speed, true, this.player);
    this.ui.showFeedback(source === 'ad' ? 'AD REWARD REVIVE' : 'JUICE REVIVE', '3 SECOND SAFETY SHIELD');
    return true;
  }

  openShop() {
    if (this.state !== 'menu') return;
    this.state = 'shop';
    this.ui.showShop(this.shop.getSnapshot());
  }

  closeShop() {
    if (this.state !== 'shop') return;
    this.state = 'menu';
    this.ui.showMenu(this.score.bestScore, this.progress.getSnapshot());
    this.ui.setInventory(this.shop.wallet, this.juice.count);
  }

  chooseCharacter(id) {
    if (this.state !== 'shop') return;
    const result = this.shop.buyOrSelect(id);
    if (result.ok) {
      this.player.setCharacter(this.shop.selectedId);
      this.ui.updateShop(this.shop.getSnapshot(), `${result.definition.name} EQUIPPED`);
    } else if (result.reason === 'coins') {
      this.ui.updateShop(this.shop.getSnapshot(), `COLLECT ${result.needed} MORE COINS`);
    }
  }

  goToMenu() {
    this.shop.save();
    this.state = 'menu';
    this.revivePending = false;
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
    this.ui.setInventory(this.shop.wallet, this.juice.count);
  }

  handleAction(action) {
    this.audio.unlock();
    if (this.state === 'menu') {
      if (action === 'confirm') { this.audio.play('button'); this.startRun(); }
      return;
    }
    if (this.state === 'shop') {
      if (action === 'confirm' || action === 'pause') this.closeShop();
      return;
    }
    if (this.state === 'revive') {
      if (action === 'confirm') {
        if (this.juice.count > 0) this.respawn();
        else this.reviveWithAd();
      } else if (action === 'pause') this.finishRun();
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
      const palette = eveningPalette(theme);
      this.themeTargets.sky.set(palette.sky);
      this.themeTargets.fog.set(palette.fog);
      this.themeTargets.fogNear = palette.fogNear ?? 82;
      this.themeTargets.fogFar = palette.fogFar ?? 285;
      const hot = ['ancient', 'palmyrah'].includes(theme.layout);
      const mist = ['hill', 'rail', 'tea'].includes(theme.layout);
      this.themeTargets.sun.set(hot ? 0xffa06b : mist ? 0xffb987 : 0xffad73);
      this.themeTargets.fill.set(mist ? 0x92b9ef : 0x9bbcff);
      this.themeTargets.exposure = hot ? 1.04 : mist ? 1.06 : 1.08;
      this.themeTargets.sunIntensity = hot ? 2.0 : mist ? 1.65 : 2.15;
      this.themeTargets.hemisphereIntensity = mist ? 0.72 : 0.62;
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
    } else if (this.state === 'menu' || this.state === 'shop') {
      this.world.update(frameDelta, 0);
      this.player.update(frameDelta, 0, 'menu');
      for (const entry of this.spawner.entries) {
        if (entry.type === 'coin') entry.mesh.rotation.y += frameDelta * 1.8;
      }
      this.spawner.syncCoins();
    } else if (this.state === 'gameover' || this.state === 'revive') {
      this.player.update(frameDelta, this.speed, 'gameover');
    }

    const presentationState = this.state === 'shop' ? 'menu' : this.state;
    if (!policeAdvanced) this.police.update(frameDelta, this.speed, this.player, presentationState, this.spawner.entries);
    this.updateTheme(frameDelta);
    this.audio.update(frameDelta, this.state);
    this.cameraRig.update(frameDelta, this.player, this.speed, presentationState);
    this.effects.update(frameDelta, this.speed, this.player, this.state,
      this.renderer.getPixelRatio(), this.police, this.spawner.entries);
    this.contactShadows.update(this.player, this.police, this.spawner.entries);
    this.longShadows.enabled = !this.softwareRenderer && this.graphics.adaptations < 3;
    this.longShadows.update(this.player, this.police, this.spawner.entries);
    this.godRays.enabled = !this.softwareRenderer && this.graphics.adaptations < 2;
    this.godRays.update(frameDelta, this.speed, this.state);
    this.world.setPerformanceMode(this.graphics.performanceMode);
    // Lamp halos remain visible in every tier. Only the larger road projection
    // is optional under sustained load; both share one bounded instanced draw.
    this.roadLights.enabled = true;
    this.roadLights.roadGlow = !this.graphics.performanceMode;
    this.roadLights.update(this.spawner.entries);
    const boostTarget = this.state === 'running' && this.player.scooterActive ? 0.85 : 0;
    this.graphics.render(frameDelta, boostTarget);
  }
}
