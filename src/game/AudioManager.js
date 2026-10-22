const AUDIO_KEY = 'lanka-run-schoolboy-rush-muted-v1';

/** Original Web Audio synthesis. No sound files or third-party audio are used. */
export class AudioManager {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.context = null;
    this.muted = this.loadMuted();
    this.hornTimer = 9;
    this.state = 'menu';
  }

  loadMuted() {
    try { return this.storage?.getItem(AUDIO_KEY) === 'true'; } catch { return false; }
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
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
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
    const now = this.context.currentTime;
    this.ambient.gain.cancelScheduledValues(now);
    if (immediate) this.ambient.gain.setValueAtTime(volume, now);
    else this.ambient.gain.setTargetAtTime(volume, now, 0.25);
  }

  toggleMute() {
    this.muted = !this.muted;
    try { this.storage?.setItem(AUDIO_KEY, String(this.muted)); } catch { /* Session-only is fine. */ }
    if (this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.context.currentTime, 0.03);
    return this.muted;
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

  noise(duration, volume, frequency, delay = 0) {
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
    gain.connect(this.sfx);
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

  update(delta, state) {
    if (state !== this.state) this.setState(state);
    if (!this.context || state !== 'running') return;
    this.hornTimer -= delta;
    if (this.hornTimer <= 0) {
      this.horn();
      this.hornTimer = 9 + Math.random() * 11;
    }
  }
}
