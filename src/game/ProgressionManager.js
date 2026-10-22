const PROGRESS_KEY = 'lanka-run-schoolboy-rush-island-progress-v1';
const RANKS = ['EXPLORER', 'PATHFINDER', 'ISLAND RUNNER', 'ROUTE ACE', 'ISLAND LEGEND'];

export function localDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayHash(day) {
  let hash = 2166136261;
  for (const character of day) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createMissions(day) {
  const hash = dayHash(day);
  return [
    { id: 'distance', label: 'ISLAND DISTANCE', shortLabel: 'DISTANCE', target: 1000 + (hash % 3) * 250,
      unit: 'm', reward: 3, progress: 0, completed: false },
    { id: 'coins', label: 'COIN TRAIL', shortLabel: 'COINS', target: 35 + ((hash >>> 3) % 4) * 5,
      unit: '', reward: 2, progress: 0, completed: false },
    { id: 'nearMisses', label: 'CLOSE CALLS', shortLabel: 'NEAR MISS', target: 2 + ((hash >>> 6) % 3),
      unit: '', reward: 3, progress: 0, completed: false },
  ];
}

function number(value, fallback = 0) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Persistent daily goals and non-spendable achievement stars. */
export class ProgressionManager {
  constructor(storage = globalThis.localStorage, day) {
    this.storage = storage;
    // Explicit days keep deterministic tests/tools fixed; production follows
    // the device's local calendar even when it stays open past midnight.
    this.autoRollover = day === undefined;
    this.day = day || localDayKey();
    this.stars = 0;
    this.totals = { runs: 0, distance: 0, coins: 0, nearMisses: 0, bestDistance: 0 };
    this.missions = createMissions(this.day);
    this.load();
  }

  load() {
    let saved;
    try { saved = JSON.parse(this.storage?.getItem(PROGRESS_KEY) || 'null'); } catch { return; }
    if (!saved || typeof saved !== 'object') return;
    this.stars = Math.floor(number(saved.stars));
    for (const key of Object.keys(this.totals)) this.totals[key] = number(saved.totals?.[key]);
    if (saved.day !== this.day || !Array.isArray(saved.missions)) return;
    for (const mission of this.missions) {
      const old = saved.missions.find((item) => item?.id === mission.id);
      if (!old) continue;
      mission.progress = number(old.progress);
      mission.completed = Boolean(old.completed) || mission.progress >= mission.target;
    }
  }

  save() {
    try {
      this.storage?.setItem(PROGRESS_KEY, JSON.stringify({
        day: this.day,
        stars: this.stars,
        totals: this.totals,
        missions: this.missions.map(({ id, progress, completed }) => ({ id, progress, completed })),
      }));
    } catch {
      // Progress remains valid for this session when storage is unavailable.
    }
  }

  ensureCurrentDay() {
    if (!this.autoRollover) return;
    const today = localDayKey();
    if (today === this.day) return;
    this.day = today;
    this.missions = createMissions(today);
    this.save();
  }

  recordRun({ distance = 0, coins = 0, nearMisses = 0 } = {}) {
    this.ensureCurrentDay();
    const run = {
      distance: Math.floor(number(distance)),
      coins: Math.floor(number(coins)),
      nearMisses: Math.floor(number(nearMisses)),
    };
    this.totals.runs += 1;
    this.totals.distance += run.distance;
    this.totals.coins += run.coins;
    this.totals.nearMisses += run.nearMisses;
    this.totals.bestDistance = Math.max(this.totals.bestDistance, run.distance);
    const completed = [];
    for (const mission of this.missions) {
      mission.progress += run[mission.id];
      if (!mission.completed && mission.progress >= mission.target) {
        mission.completed = true;
        this.stars += mission.reward;
        completed.push({ ...mission });
      }
    }
    const starsEarned = completed.reduce((sum, mission) => sum + mission.reward, 0);
    this.save();
    return { starsEarned, completed, totalStars: this.stars };
  }

  getSnapshot() {
    this.ensureCurrentDay();
    const level = 1 + Math.floor(this.stars / 10);
    return {
      day: this.day,
      stars: this.stars,
      level,
      rank: RANKS[Math.min(RANKS.length - 1, level - 1)],
      levelProgress: (this.stars % 10) / 10,
      totals: { ...this.totals },
      missions: this.missions.map((mission) => ({
        ...mission,
        ratio: Math.min(1, mission.progress / mission.target),
      })),
    };
  }
}
