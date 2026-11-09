import * as THREE from 'three';
import { GAME } from '../config.js';
import { WorldGenerator } from './WorldGenerator.js';
import { MonsoonRain } from '../art/RailLife.js';
import { MAGNET_DURATION, ObstacleSpawner } from './ObstacleSpawner.js';
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
import { QUALITY_TIERS, qualityProfile, detectQualityTier, readDeviceHints } from './QualityProfiles.js';
import { material as sharedMaterial } from '../art/MeshKit.js';
import { getAdMaterial } from '../art/AdBoards.js';
import { setStreetGlow } from '../art/Environment.js';
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
    this.qualityTiers = QUALITY_TIERS;
    const requestedTier = new URLSearchParams(window.location.search).get('tier');
    this.qualityPreference = QUALITY_TIERS.includes(requestedTier)
      ? requestedTier : this.readQualityPreference();
    this.qualityTier = this.qualityPreference
      ?? detectQualityTier({ ...readDeviceHints(), software: this.softwareRenderer });
    // Shared emissive materials that become the "after hours" light sources.
    this.litWindowMaterial = sharedMaterial(0xffd69a, {
      roughness: 0.28, emissive: 0xffb85c, emissiveIntensity: 0.95,
    });
    this.adMaterial = getAdMaterial();
    this.nightMix = 0;

    this.score = new ScoreManager();
    this.progress = new ProgressionManager();
    this.shop = new ShopManager(globalThis.localStorage, { legacyCoins: this.progress.totals.coins });
    this.juice = new JuiceInventory(globalThis.localStorage);
    this.runRewards = null;
    this.audio = new AudioManager();
    this.world = new WorldGenerator(this.scene, {
      detailDistance: coarsePointer ? 175 : this.softwareRenderer ? 165 : 210,
      animationHz: coarsePointer ? 20 : 60,
      generationBudget: coarsePointer ? 1.25 : 2,
    });
    this.player = new Player(this.scene, {
      jump: () => { this.audio.play('jump'); this.cameraRig.pulse(0.08); },
      land: () => { this.audio.play('land'); this.cameraRig.pulse(0.2); },
      slide: () => this.audio.play('slide'),
      lane: (direction) => { this.audio.play('lane'); this.cameraRig.pulse(0.06, direction); },
      step: () => this.audio.play('step'),
      trick: () => this.audio.play('slide'),
      landTrick: () => {
        this.score.addTrick(150);
        this.audio.play('combo');
        this.ui?.showFeedback('STYLE FLIP', '+150');
      },
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
    this.rain = new MonsoonRain(this.scene, { count: coarsePointer ? 240 : 420 });
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
        this.score.breakCombo();
        this.ui?.setCombo(1, 0);
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
        const multiplier = this.score.multiplier;
        this.ui?.showFeedback(multiplier > 1 ? `COMBO x${multiplier}` : 'NEAR MISS',
          multiplier > 1 ? 'KEEP IT CLOSE' : '+250');
        this.ui?.setCombo(multiplier, this.score.combo);
      },
      onMagnet: () => {
        if (!this.player.startMagnet(MAGNET_DURATION)) return;
        this.score.addMagnet();
        this.audio.play('magnet');
        this.effects.shield(this.player.group.position);
        this.ui?.showFeedback('COIN MAGNET', '8 SECONDS • COINS COME TO YOU');
        this.ui?.setMagnet(true, MAGNET_DURATION);
      },
      onCow: () => {
        this.audio.play('cow');
        this.ui?.showFeedback('MOO!', 'ROAD COW • CHANGE LANE');
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
      graphics: (tier) => this.setQualityTier(tier),
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
      exposure: 1.08, sunIntensity: 2.15, hemisphereIntensity: 0.62, night: 0.55,
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
    this.applyQualityTier(this.qualityTier, { persist: false, silent: true });
    this.animate = this.animate.bind(this);
    this.renderer.setAnimationLoop(this.animate);
  }

  readQualityPreference() {
    try {
      const stored = globalThis.localStorage?.getItem('lanka-run-graphics-v1');
      if (QUALITY_TIERS.includes(stored)) return stored;
    } catch { /* storage can be blocked; auto-detect still runs */ }
    return null;
  }

  /**
   * Switches graphics tier live. Only rendering cost changes; the road, lanes,
   * traffic, scoring and collision are identical on every tier.
   */
  applyQualityTier(tier, { persist = true, silent = false } = {}) {
    const profile = qualityProfile(tier);
    this.qualityTier = profile.id;
    this.pixelRatioLimit = profile.pixelRatioCap;
    this.graphics.maxPixelRatio = Math.min(window.devicePixelRatio || 1, profile.pixelRatioCap);
    this.graphics.minimumPixelRatio = Math.min(this.graphics.maxPixelRatio, profile.pixelRatioFloor);
    this.graphics.applyProfile(profile);
    this.world?.setQuality({
      detailDistance: profile.detailDistance,
      animationHz: profile.animationHz,
      generationBudget: profile.generationBudget,
    });
    if (this.longShadows) this.longShadows.enabled = profile.longShadows && !this.softwareRenderer;
    if (this.godRays) this.godRays.enabled = profile.godRays && !this.softwareRenderer;
    if (this.roadLights) {
      this.roadLights.roadGlow = profile.roadGlow;
      this.roadLights.enabled = true;
    }
    this.rain?.setDensity(profile.rainDrops / 420);
    this.resize();
    this.ui?.setQuality(profile.id);
    if (persist) {
      try { globalThis.localStorage?.setItem('lanka-run-graphics-v1', profile.id); } catch { /* offline */ }
    }
    if (!silent) this.ui?.showFeedback(`${profile.label} GRAPHICS`, profile.blurb);
    return profile;
  }

  setQualityTier(tier) {
    if (!QUALITY_TIERS.includes(tier)) return;
    this.buttonFeedback();
    this.applyQualityTier(tier);
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
    this.ui.setMagnet(false);
    this.ui.setCombo(1, 0);
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
    if (this.runRewards.streakBonus) this.shop.earn(this.runRewards.streakBonus);
    this.shop.save();
    this.audio.setState('gameover');
    this.ui.flashImpact();
    const snapshot = this.progress.getSnapshot();
    this.ui.showGameOver(this.score, this.runRewards, snapshot, {
      topSpeed: this.score.topSpeed,
      bestCombo: this.score.bestCombo,
      magnets: this.score.magnets,
      tricks: this.score.tricks,
      stampCount: snapshot.stampCount,
      districtTotal: snapshot.districtTotal,
    });
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
      const hot = ['ancient', 'palmyrah'].includes(theme.layout);
      const mist = ['hill', 'rail', 'tea'].includes(theme.layout);
      const night = palette.night ?? 0.55;
      // "After hours": blend the district's dusk palette into moonlit night and
      // keep the warm street glow in the fog so the city still reads at distance.
      const duskSky = new THREE.Color(palette.sky);
      const duskFog = new THREE.Color(palette.fog);
      const nightSky = new THREE.Color(palette.nightSky);
      const nightFog = new THREE.Color(palette.nightFog);
      this.themeTargets.sky.copy(duskSky).lerp(nightSky, night * 0.86);
      this.themeTargets.fog.copy(duskFog).lerp(nightFog, night * 0.82);
      this.themeTargets.night = night;
      this.themeTargets.fogNear = (palette.fogNear ?? 82) + night * 12;
      this.themeTargets.fogFar = (palette.fogFar ?? 285) - night * 26;
      const duskSun = new THREE.Color(hot ? 0xffa06b : mist ? 0xffb987 : 0xffad73);
      const duskFill = new THREE.Color(mist ? 0x92b9ef : 0x9bbcff);
      this.themeTargets.sun.copy(duskSun).lerp(palette.nightSun, night * 0.8);
      this.themeTargets.fill.copy(duskFill).lerp(palette.nightFill, night * 0.85);
      this.themeTargets.exposure = THREE.MathUtils.lerp(hot ? 1.04 : mist ? 1.06 : 1.08,
        palette.nightExposure, night * 0.7);
      this.themeTargets.sunIntensity = THREE.MathUtils.lerp(hot ? 2.0 : mist ? 1.65 : 2.15,
        palette.nightSunIntensity, night * 0.85);
      this.themeTargets.hemisphereIntensity = THREE.MathUtils.lerp(mist ? 0.72 : 0.62,
        palette.nightHemisphere, night * 0.8);
      this.ui.setDistrict(theme, announce);
      if (announce && this.state === 'running') {
        const stampBonus = this.progress.visitDistrict(theme.id);
        if (stampBonus > 0) {
          this.shop.earn(stampBonus);
          this.ui.showFeedback('NEW DISTRICT STAMP', `+${stampBonus} COINS • ${this.progress.stampCount}/14`);
          this.ui.setInventory(this.shop.wallet, this.juice.count);
        }
      }
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
    // Shared emissive materials become the city's after-hours light sources.
    const nightBlend = delta === 0 ? 1 : 1 - Math.exp(-delta * 0.8);
    this.nightMix = THREE.MathUtils.lerp(this.nightMix, this.themeTargets.night, nightBlend);
    this.litWindowMaterial.emissiveIntensity = 0.95 + this.nightMix * 1.35;
    if (this.adMaterial) this.adMaterial.emissiveIntensity = 0.22 + this.nightMix * 0.5;
    document.body.classList.toggle('is-night', this.nightMix > 0.55);
    setStreetGlow(this.nightMix);
    if (this.hemisphere) this.hemisphere.color.setHex(0x8fa8d6).lerp(new THREE.Color(0x54689b), this.nightMix);
    this.graphics.setNight(this.themeTargets.night);
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
        this.world.update(stepDelta, this.speed, false);
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
      this.world.update(frameDelta, 0, false);
      this.player.update(frameDelta, 0, 'menu');
      for (const entry of this.spawner.entries) {
        if (entry.type === 'coin') entry.mesh.rotation.y += frameDelta * 1.8;
      }
      this.spawner.syncCoins();
    } else if (this.state === 'gameover' || this.state === 'revive') {
      this.player.update(frameDelta, this.speed, 'gameover');
    }

    // Process at most one small generation budget per rendered frame, never
    // once per physics catch-up substep.
    this.world.processSceneryQueue();
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
    const rainLayouts = ['hill', 'tea', 'rail'];
    const rainActive = (this.state === 'running' || this.state === 'menu' || this.state === 'gameover')
      && rainLayouts.includes(this.world.getCurrentTheme().layout);
    this.rain.setActive(rainActive, this.graphics.performanceMode);
    this.rain.update(frameDelta, this.player, this.graphics.performanceMode);
    if (this.state !== 'running') this.ui.setCombo(this.score.multiplier, this.score.combo);
    const boostTarget = this.state === 'running' && this.player.scooterActive ? 0.85 : 0;
    this.graphics.render(frameDelta, boostTarget);
  }
}
