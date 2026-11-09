import { STORAGE_KEY } from '../config.js';

export class ScoreManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.bestScore = this.loadBest();
    this.reset();
  }

  loadBest() {
    try {
      const value = Number.parseInt(this.storage?.getItem(STORAGE_KEY) ?? '0', 10);
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      return 0; // Private browsing or blocked storage must not stop the game.
    }
  }

  reset() {
    this.distance = 0;
    this.coins = 0;
    this.nearMisses = 0;
    this.score = 0;
    this.newBest = false;
    this.combo = 0;
    this.bestCombo = 0;
    this.bonus = 0;
    this.magnets = 0;
    this.tricks = 0;
    this.topSpeed = 0;
  }

  get multiplier() {
    return Math.min(5, 1 + Math.floor(this.combo / 2));
  }

  update(delta, speed) {
    this.distance += speed * delta;
    this.topSpeed = Math.max(this.topSpeed, speed);
    this.recalculate();
  }

  addCoin() {
    this.coins += 1;
    // Coins are worth the live near-miss combo multiplier.
    this.bonus += (this.multiplier - 1) * 100;
    this.recalculate();
  }

  addNearMiss() {
    this.nearMisses += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.recalculate();
  }

  addMagnet() {
    this.magnets += 1;
  }

  addTrick(points = 150) {
    this.tricks += 1;
    this.bonus += points;
    this.recalculate();
  }

  addBonus(points = 0) {
    this.bonus += Math.max(0, Math.floor(points));
    this.recalculate();
  }

  breakCombo() {
    this.combo = 0;
    this.recalculate();
  }

  recalculate() {
    this.score = Math.floor(this.distance * 10) + this.coins * 100
      + this.nearMisses * 250 + this.bonus;
  }

  finish() {
    this.recalculate();
    this.newBest = this.score > this.bestScore;
    if (this.newBest) {
      this.bestScore = this.score;
      try {
        this.storage?.setItem(STORAGE_KEY, String(this.bestScore));
      } catch {
        // The record remains valid for this session if persistent storage fails.
      }
    }
    return this.newBest;
  }
}
