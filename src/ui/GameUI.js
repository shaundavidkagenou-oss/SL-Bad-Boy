import { GAME } from '../config.js';

const byId = (id) => document.getElementById(id);

export class GameUI {
  constructor(actions) {
    this.actions = actions;
    this.screens = {
      menu: byId('menu-screen'), pause: byId('pause-screen'), gameover: byId('gameover-screen'),
      shop: byId('shop-screen'), revive: byId('revive-screen'),
    };
    this.characterGrid = byId('character-grid');
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
    byId('shop-button').addEventListener('click', actions.shop);
    byId('shop-close').addEventListener('click', actions.closeShop);
    byId('revive-button').addEventListener('click', actions.revive);
    byId('revive-end-button').addEventListener('click', actions.finish);
    this.characterGrid.addEventListener('click', (event) => {
      const card = event.target.closest('button[data-character]');
      if (card) actions.chooseCharacter?.(card.dataset.character);
    });
    byId('mute-button').addEventListener('click', actions.mute);
    byId('music-volume').addEventListener('input', (event) => actions.musicVolume?.(Number(event.target.value)));
    byId('sfx-volume').addEventListener('input', (event) => actions.sfxVolume?.(Number(event.target.value)));
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

  showMenu(bestScore, progress = null) {
    this.updateBoost(null);
    this.feedbackAnimation?.cancel();
    byId('menu-best').textContent = bestScore.toLocaleString();
    this.updateProgress(progress);
    this.hud.classList.remove('is-visible');
    this.showScreen('menu');
    document.body.dataset.gameState = 'menu';
  }

  updateProgress(progress) {
    if (!progress) return;
    byId('island-stars').textContent = progress.stars.toLocaleString();
    byId('island-rank').textContent = `LEVEL ${progress.level} • ${progress.rank || 'EXPLORER'}`;
    byId('rank-fill').style.transform = `scaleX(${progress.levelProgress})`;
    progress.missions.slice(0, 3).forEach((mission, index) => {
      byId(`mission-${index}-label`).textContent = mission.completed ? `${mission.shortLabel} ✓` : mission.shortLabel;
      byId(`mission-${index}-progress`).textContent = mission.completed
        ? `COMPLETE • +${mission.reward} ★`
        : `${Math.floor(mission.progress).toLocaleString()} / ${mission.target.toLocaleString()}${mission.unit ? ` ${mission.unit}` : ''}`;
      byId(`mission-${index}-fill`).style.transform = `scaleX(${mission.ratio})`;
      byId(`mission-${index}-fill`).closest('.mission-row').classList.toggle('is-complete', mission.completed);
    });
  }

  setInventory(wallet, juice) {
    byId('menu-wallet').textContent = wallet.toLocaleString();
    byId('shop-wallet').textContent = wallet.toLocaleString();
    this.setJuice(juice);
  }

  setJuice(count) {
    byId('juice-value').textContent = String(count);
    byId('shop-juice').textContent = String(count);
    byId('revive-count').textContent = String(count);
  }

  updateShop(snapshot, message = '') {
    const cards = snapshot.characters.map((character, index) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.dataset.character = character.id;
      card.className = `character-card${character.selected ? ' is-selected' : ''}${character.owned ? ' is-owned' : ''}`;
      card.setAttribute('aria-pressed', String(character.selected));
      const action = character.selected ? 'EQUIPPED' : character.owned ? 'SELECT'
        : character.affordable ? `BUY • ${character.price}` : `${character.price} COINS`;
      card.setAttribute('aria-label', `${character.name}: ${action}`);
      const number = document.createElement('span');
      number.className = 'character-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const portrait = document.createElement('img');
      portrait.className = 'character-portrait';
      portrait.src = `/assets/runners/${character.id}.png`;
      portrait.alt = '';
      portrait.width = 280;
      portrait.height = 340;
      portrait.loading = 'lazy';
      portrait.decoding = 'async';
      portrait.draggable = false;
      const swatches = document.createElement('span');
      swatches.className = 'character-swatches';
      swatches.setAttribute('aria-hidden', 'true');
      for (const color of [character.shirt, character.accent, character.shorts]) {
        const swatch = document.createElement('i');
        swatch.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
        swatches.appendChild(swatch);
      }
      const name = document.createElement('strong');
      name.textContent = character.name;
      const description = document.createElement('small');
      description.textContent = character.description;
      const price = document.createElement('b');
      price.className = 'character-action';
      price.textContent = action;
      card.append(number, portrait, swatches, name, description, price);
      return card;
    });
    this.characterGrid.replaceChildren(...cards);
    byId('shop-wallet').textContent = snapshot.wallet.toLocaleString();
    if (message) byId('shop-status').textContent = message;
  }

  showShop(snapshot) {
    this.updateBoost(null);
    this.updateShop(snapshot);
    this.hud.classList.remove('is-visible');
    this.showScreen('shop');
    document.body.dataset.gameState = 'shop';
  }

  showRevive(count) {
    this.updateBoost(null);
    this.feedbackAnimation?.cancel();
    this.setJuice(count);
    this.hud.classList.remove('is-visible');
    this.showScreen('revive');
    document.body.dataset.gameState = 'revive';
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

  showGameOver(score, rewards = null, progress = null) {
    this.updateBoost(null);
    this.feedbackAnimation?.cancel();
    byId('final-score').textContent = score.score.toLocaleString();
    byId('final-distance').textContent = `${Math.floor(score.distance)} m`;
    byId('final-coins').textContent = String(score.coins);
    byId('final-best').textContent = score.bestScore.toLocaleString();
    byId('new-best').classList.toggle('is-visible', score.newBest);
    const earned = rewards?.starsEarned || 0;
    byId('reward-stars').textContent = earned > 0 ? `+${earned} ★` : `${progress?.stars || 0} ★`;
    byId('reward-copy').textContent = rewards?.completed?.length
      ? rewards.completed.map((mission) => mission.shortLabel).join(' • ')
      : `${score.nearMisses || 0} NEAR MISSES • DAILY GOALS IN PROGRESS`;
    byId('run-rewards').classList.toggle('has-reward', earned > 0);
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

  showFeedback(title, subtitle = '') {
    byId('feedback-title').textContent = title;
    byId('feedback-subtitle').textContent = subtitle;
    this.feedbackAnimation?.cancel();
    const feedback = byId('game-feedback');
    this.feedbackAnimation = feedback.animate?.([
      { opacity: 0, transform: 'translate(-50%, -8px) scale(.94)' },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.14 },
      { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.72 },
      { opacity: 0, transform: 'translate(-50%, 5px) scale(.98)' },
    ], { duration: 1450, easing: 'ease-out' });
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

  setVolumes(music, sfx) {
    byId('music-volume').value = String(music);
    byId('sfx-volume').value = String(sfx);
  }
}
