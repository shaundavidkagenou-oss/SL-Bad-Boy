import { CHARACTERS, getCharacter } from './CharacterCatalog.js';

const SHOP_KEY = 'sl-bad-boy-character-shop-v1';
const validIds = new Set(CHARACTERS.map((item) => item.id));
const safeNumber = (value) => Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

/** Persistent spendable coins and character ownership; writes happen on events, never per frame. */
export class ShopManager {
  constructor(storage = globalThis.localStorage, { legacyCoins = 0 } = {}) {
    this.storage = storage;
    this.wallet = 0;
    this.owned = new Set(['schoolboy']);
    this.selectedId = 'schoolboy';
    let saved = null;
    try { saved = JSON.parse(this.storage?.getItem(SHOP_KEY) || 'null'); } catch { /* Session-only fallback. */ }
    if (saved && typeof saved === 'object') {
      this.wallet = safeNumber(saved.wallet);
      if (Array.isArray(saved.owned)) {
        for (const id of saved.owned) if (validIds.has(id)) this.owned.add(id);
      }
      if (this.owned.has(saved.selectedId)) this.selectedId = saved.selectedId;
    } else if (safeNumber(legacyCoins) > 0) {
      // Existing players keep the value of coins earned before the shop existed.
      this.wallet = safeNumber(legacyCoins);
      this.save();
    }
  }

  save() {
    try {
      this.storage?.setItem(SHOP_KEY, JSON.stringify({
        wallet: this.wallet, owned: [...this.owned], selectedId: this.selectedId,
      }));
    } catch { /* Storage denial never stops gameplay or purchases for this session. */ }
  }

  earn(amount = 1) {
    const value = safeNumber(amount);
    this.wallet += value;
    return this.wallet;
  }

  buyOrSelect(id) {
    if (!validIds.has(id)) return { ok: false, reason: 'unknown' };
    const definition = getCharacter(id);
    if (this.owned.has(id)) {
      this.selectedId = id;
      this.save();
      return { ok: true, purchased: false, definition };
    }
    if (this.wallet < definition.price) {
      return { ok: false, reason: 'coins', needed: definition.price - this.wallet, definition };
    }
    this.wallet -= definition.price;
    this.owned.add(id);
    this.selectedId = id;
    this.save();
    return { ok: true, purchased: true, definition };
  }

  getSnapshot() {
    return {
      wallet: this.wallet,
      selectedId: this.selectedId,
      characters: CHARACTERS.map((definition) => ({
        ...definition,
        owned: this.owned.has(definition.id),
        selected: this.selectedId === definition.id,
        affordable: this.wallet >= definition.price,
      })),
    };
  }
}
