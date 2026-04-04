import { eventBus, Events } from '../core/EventBus.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not available');
    }

    // Wire to EventBus
    eventBus.on(Events.SFX_PLAY, ({ sound }) => {
      if (this[sound]) this[sound]();
    });
  }

  play(freq, dur, type = 'sine', vol = 0.08) {
    if (!this.ctx || !this.enabled) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }

  coin() {
    this.play(880, 0.08);
    setTimeout(() => this.play(1320, 0.12), 80);
  }

  build() {
    this.play(330, 0.12, 'square');
    setTimeout(() => this.play(440, 0.1, 'square'), 60);
  }

  error() {
    this.play(200, 0.2, 'sawtooth');
  }

  milestone() {
    this.play(523, 0.1);
    setTimeout(() => this.play(659, 0.1), 100);
    setTimeout(() => this.play(784, 0.15), 200);
  }

  sell() {
    this.play(660, 0.06);
    setTimeout(() => this.play(880, 0.06), 60);
    setTimeout(() => this.play(1100, 0.1), 120);
  }
}
