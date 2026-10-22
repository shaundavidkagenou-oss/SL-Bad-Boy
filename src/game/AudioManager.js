const AUDIO_KEY = 'lanka-run-schoolboy-rush-muted-v1';
const MUSIC_KEY = 'lanka-run-schoolboy-rush-music-volume-v1';
const SFX_KEY = 'lanka-run-schoolboy-rush-sfx-volume-v1';
const MUSIC_SCALE = [220, 246.94, 293.66, 329.63, 369.99];
const MUSIC_MELODY = [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 3, 1, 2, 4, 3, 2];
const clamp = (value) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Original Web Audio synthesis. No sound files or third-party audio are used. */
export class AudioManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.context = null;
    this.muted = this.loadMuted();
    this.musicVolume = this.loadVolume(MUSIC_KEY, 0.55);
    this.sfxVolume = this.loadVolume(SFX_KEY, 0.85);
    this.hornTimer = 9;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.state = 'menu';
  }

  loadMuted() {
    try { return this.storage?.getItem(AUDIO_KEY) === 'true'; } catch { return false; }
  }

  loadVolume(key, fallback) {
    try {
      const stored = this.storage?.getItem(key);
      if (stored === null || stored === undefined || stored === '') return fallback;
      const value = Number(stored);
      return Number.isFinite(value) ? clamp(value) : fallback;
    } catch { return fallback; }
  }

  unlock() {
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(this.context.destination);
      this.sfx = this.context.createGain();
      this.sfx.gain.value = this.sfxVolume;
      this.sfx.connect(this.master);
      this.music = this.context.createGain();
      this.music.gain.value = 0;
      this.music.connect(this.master);
      this.ambient = this.context.createGain();
      this.ambient.gain.value = 0;
      this.ambient.connect(this.master);
      this.noiseBuffer = this.createNoiseBuffer(2);
      this.startAmbient();
      this.setState(this.state, true);
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    return true;
  }

  createNoiseBuffer(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      previous = (previous + white * 0.035) / 1.035;
      data[i] = previous * 2.4;
    }
    return buffer;
  }

  startAmbient() {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    source.connect(filter);
    filter.connect(this.ambient);
    source.start();
    this.ambientSource = source;
  }

  setState(state, immediate = false) {
    this.state = state;
    if (!this.context) return;
    const volume = state === 'running' ? 0.16 : state === 'menu' ? 0.045 : 0;
    const musicLevel = state === 'running' ? 0.28 : state === 'menu' ? 0.08 : 0;
    const now = this.context.currentTime;
    this.ambient.gain.cancelScheduledValues(now);
    this.music.gain.cancelScheduledValues(now);
    if (immediate) {
      this.ambient.gain.setValueAtTime(volume, now);
      this.music.gain.setValueAtTime(this.musicVolume * musicLevel, now);
    } else {
      this.ambient.gain.setTargetAtTime(volume, now, 0.25);
      this.music.gain.setTargetAtTime(this.musicVolume * musicLevel, now, 0.2);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try { this.storage?.setItem(AUDIO_KEY, String(this.muted)); } catch { /* Session-only is fine. */ }
    if (this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.context.currentTime, 0.03);
    return this.muted;
  }

  setMusicVolume(value) {
    this.musicVolume = clamp(value);
    try { this.storage?.setItem(MUSIC_KEY, String(this.musicVolume)); } catch { /* Session-only is fine. */ }
    if (this.context) this.setState(this.state, true);
  }

  setSfxVolume(value) {
    this.sfxVolume = clamp(value);
    try { this.storage?.setItem(SFX_KEY, String(this.sfxVolume)); } catch { /* Session-only is fine. */ }
    if (this.context) this.sfx.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.03);
  }

  tone(frequency, endFrequency, duration, volume, type = 'sine', delay = 0, destination = this.sfx) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.025, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  noise(duration, volume, frequency, delay = 0, destination = this.sfx) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(now);
    source.stop(now + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  play(name) {
    if (!this.context || this.muted) return;
    switch (name) {
      case 'coin':
        this.tone(760, 980, 0.09, 0.11);
        this.tone(1050, 1320, 0.12, 0.09, 'sine', 0.065);
        break;
      case 'jump': this.tone(240, 520, 0.17, 0.1, 'triangle'); break;
      case 'land': this.noise(0.09, 0.12, 520); break;
      case 'slide': this.noise(0.28, 0.13, 1250); break;
      case 'lane': this.noise(0.065, 0.035, 1800); break;
      case 'step':
        this.noise(0.045, 0.028, 360);
        this.tone(82, 58, 0.05, 0.015, 'sine');
        break;
      case 'nearMiss':
        this.tone(440, 760, 0.16, 0.08, 'triangle');
        this.tone(880, 1100, 0.12, 0.05, 'sine', 0.07);
        break;
      case 'milestone':
        this.tone(523.25, 523.25, 0.14, 0.065, 'triangle');
        this.tone(659.25, 659.25, 0.16, 0.06, 'triangle', 0.09);
        this.tone(783.99, 783.99, 0.2, 0.055, 'triangle', 0.18);
        break;
      case 'powerup':
        this.tone(260, 780, 0.34, 0.13, 'sawtooth');
        this.tone(520, 1240, 0.28, 0.09, 'triangle', 0.12);
        break;
      case 'shield':
        this.noise(0.12, 0.09, 1800);
        this.tone(180, 90, 0.16, 0.07, 'square');
        break;
      case 'collision':
        this.noise(0.42, 0.32, 360);
        this.tone(115, 42, 0.38, 0.2, 'sawtooth');
        break;
      case 'button': this.tone(430, 520, 0.055, 0.045, 'triangle'); break;
      default: break;
    }
  }

  horn() {
    if (!this.context || this.muted) return;
    this.tone(205, 195, 0.46, 0.035, 'triangle', 0, this.ambient);
    this.tone(258, 245, 0.42, 0.025, 'triangle', 0.04, this.ambient);
  }

  updateMusic(delta) {
    this.musicTimer -= delta;
    let scheduled = 0;
    while (this.musicTimer <= 0 && scheduled < 2) {
      this.musicTimer += 0.27;
      const step = this.musicStep % 16;
      this.musicStep += 1;
      if (step % 2 === 0) {
        const note = MUSIC_SCALE[MUSIC_MELODY[step]];
        this.tone(note, note * 1.002, 0.2, 0.11, 'triangle', 0, this.music);
      }
      if (step % 4 === 0) this.tone(73.42, 71, 0.22, 0.15, 'sine', 0, this.music);
      if (step % 2 === 0) this.noise(0.04, 0.035, step % 4 === 0 ? 240 : 1400, 0, this.music);
      scheduled += 1;
    }
  }

  update(delta, state) {
    if (state !== this.state) this.setState(state);
    if (!this.context) return;
    if (state === 'running' || state === 'menu') this.updateMusic(delta);
    if (state !== 'running') return;
    this.hornTimer -= delta;
    if (this.hornTimer <= 0) {
      this.horn();
      this.hornTimer = 9 + Math.random() * 11;
    }
  }
}
