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
    this.score = 0;
    this.newBest = false;
  }

  update(delta, speed) {
    this.distance += speed * delta;
    this.recalculate();
  }

  addCoin() {
    this.coins += 1;
    this.recalculate();
  }

  recalculate() {
    this.score = Math.floor(this.distance * 10) + this.coins * 100;
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
