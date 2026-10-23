const JUICE_KEY = 'sl-bad-boy-juice-packets-v1';
export const MAX_JUICE_PACKETS = 3;

/** Small persistent revive inventory; rare pickups are safe to save immediately. */
export class JuiceInventory {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.count = 0;
    try {
      const saved = Number.parseInt(this.storage?.getItem(JUICE_KEY) ?? '0', 10);
      if (Number.isFinite(saved)) this.count = Math.max(0, Math.min(MAX_JUICE_PACKETS, saved));
    } catch { /* Session-only fallback. */ }
  }

  save() {
    try { this.storage?.setItem(JUICE_KEY, String(this.count)); } catch { /* Keep the session inventory. */ }
  }

  add() {
    if (this.count >= MAX_JUICE_PACKETS) return false;
    this.count += 1;
    this.save();
    return true;
  }

  consume() {
    if (this.count <= 0) return false;
    this.count -= 1;
    this.save();
    return true;
  }
}
