import { GAME } from '../config.js';

const byId = (id) => document.getElementById(id);

export class GameUI {
  constructor(actions) {
    this.actions = actions;
    this.screens = { menu: byId('menu-screen'), pause: byId('pause-screen'), gameover: byId('gameover-screen') };
    this.hud = byId('hud');
    this.distance = byId('distance-value');
    this.score = byId('score-value');
    this.coins = byId('coin-value');
    this.coinPill = byId('coin-pill');
    this.speed = byId('speed-value');
    this.boostHud = byId('boost-hud');
    this.boostTime = byId('boost-time');
    this.boostFill = byId('boost-fill');
    this.lastHudUpdate = 0;

    byId('play-button').addEventListener('click', actions.play);
    byId('restart-button').addEventListener('click', actions.restart);
    byId('pause-button').addEventListener('click', actions.pause);
    byId('resume-button').addEventListener('click', actions.resume);
    byId('pause-restart-button').addEventListener('click', actions.restart);
    byId('pause-menu-button').addEventListener('click', actions.menu);
    byId('gameover-menu-button').addEventListener('click', actions.menu);
    byId('mute-button').addEventListener('click', actions.mute);
    byId('touch-controls').querySelectorAll('button[data-action]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        actions.control?.(button.dataset.action);
        if (navigator.vibrate) navigator.vibrate(8);
      }, { passive: false });
    });
  }

  hideScreens() {
    Object.values(this.screens).forEach((screen) => {
      screen.classList.remove('is-visible');
      screen.setAttribute('aria-hidden', 'true');
    });
  }

  showScreen(name) {
    this.hideScreens();
    const screen = this.screens[name];
    if (screen) {
      screen.classList.add('is-visible');
      screen.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => screen.querySelector('button')?.focus({ preventScroll: true }));
    }
  }

  showMenu(bestScore) {
    this.updateBoost(null);
    byId('menu-best').textContent = bestScore.toLocaleString();
    this.hud.classList.remove('is-visible');
    this.showScreen('menu');
    document.body.dataset.gameState = 'menu';
  }

  showRunning() {
    this.hideScreens();
    this.hud.classList.add('is-visible');
    document.body.dataset.gameState = 'running';
  }

  showPause() {
    this.showScreen('pause');
    document.body.dataset.gameState = 'paused';
  }

  showGameOver(score) {
    this.updateBoost(null);
    byId('final-score').textContent = score.score.toLocaleString();
    byId('final-distance').textContent = `${Math.floor(score.distance)} m`;
    byId('final-coins').textContent = String(score.coins);
    byId('final-best').textContent = score.bestScore.toLocaleString();
    byId('new-best').classList.toggle('is-visible', score.newBest);
    this.hud.classList.remove('is-visible');
    this.showScreen('gameover');
    document.body.dataset.gameState = 'gameover';
  }

  updateBoost(player) {
    const active = Boolean(player?.scooterActive);
    this.boostHud.classList.toggle('is-visible', active);
    this.boostHud.setAttribute('aria-hidden', String(!active));
    document.body.classList.toggle('scooter-active', active);
    if (!active) return;
    this.boostTime.textContent = `${player.scooterTimer.toFixed(1)} s`;
    this.boostFill.style.transform = `scaleX(${Math.max(0, player.scooterTimer / GAME.scooterDuration)})`;
  }

  updateHud(score, speed, force = false, player = null) {
    this.updateBoost(player);
    const now = performance.now();
    if (!force && now - this.lastHudUpdate < 80) return;
    this.lastHudUpdate = now;
    this.distance.textContent = `${Math.floor(score.distance)} m`;
    this.score.textContent = score.score.toLocaleString();
    this.coins.textContent = String(score.coins);
    this.speed.textContent = `${Math.round(speed * 3.6)} km/h`;
  }

  setDistrict(theme, announce = false) {
    byId('district-name').textContent = theme.name;
    byId('district-subtitle').textContent = theme.subtitle;
    byId('world-tag-name').textContent = theme.roadName;
    byId('world-tag-theme').textContent = theme.subtitle;
    if (!announce) return;
    byId('district-banner-name').textContent = theme.name;
    byId('district-banner-subtitle').textContent = theme.subtitle;
    const banner = byId('district-banner');
    banner.classList.add('is-visible');
    clearTimeout(this.districtTimer);
    this.districtTimer = setTimeout(() => banner.classList.remove('is-visible'), 2200);
  }

  pulseCoin() {
    this.coinPill.animate?.([
      { transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: 0.45 }, { transform: 'scale(1)' },
    ], { duration: 220, easing: 'ease-out' });
  }

  flashImpact() {
    byId('impact-flash').animate?.([{ opacity: 0.65 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' });
  }

  flashShield() {
    this.boostHud.animate?.([
      { filter: 'brightness(1)' }, { filter: 'brightness(1.8)' }, { filter: 'brightness(1)' },
    ], { duration: 180, easing: 'ease-out' });
  }

  setMuted(muted) {
    byId('audio-icon').textContent = muted ? '×' : '♪';
    byId('audio-label').textContent = muted ? 'MUTED' : 'SOUND ON';
    byId('mute-button').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    byId('mute-button').setAttribute('aria-pressed', String(muted));
  }
}
