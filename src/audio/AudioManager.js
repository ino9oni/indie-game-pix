// Simple Web Audio manager for SFX/BGM without external assets
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.playTimer = null;
    this.playRate = 1;
    this._nextStep = 0;
    this._seqIndex = 0;
    this._sampleBuffers = new Map(); // name -> AudioBuffer
  }

  init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);

    const sfx = ctx.createGain();
    sfx.gain.value = 0.9;
    sfx.connect(master);

    const bgm = ctx.createGain();
    bgm.gain.value = 0.3;
    bgm.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.sfxGain = sfx;
    this.bgmGain = bgm;
  }

  async enable() {
    this.init();
    if (!this.ctx) return;
    await this.ctx.resume();
    this.enabled = true;
  }

  async disable() {
    if (!this.ctx) return;
    this.stopPlayMusic();
    await this.ctx.suspend();
    this.enabled = false;
  }

  // --- Sample loading ---
  async _loadSample(name, url) {
    if (!this.ctx) this.init();
    if (this._sampleBuffers.has(name)) return this._sampleBuffers.get(name);
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const audioBuf = await this.ctx.decodeAudioData(buf);
    this._sampleBuffers.set(name, audioBuf);
    return audioBuf;
  }

  _playBuffer(buffer, gain = 0.8) {
    const { ctx, sfxGain } = this;
    const t0 = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    src.connect(g);
    g.connect(sfxGain);
    src.start(t0);
    return new Promise((resolve) => {
      src.onended = () => {
        try {
          src.disconnect();
          g.disconnect();
        } catch {}
        resolve();
      };
    });
  }

  // --- SFX ---
  playFill() {
    if (!this.enabled || !this.ctx) return;
    // Brush-like short noise burst
    this._noiseBurst(0.06, 2000, 500);
  }

  playMark() {
    if (!this.enabled || !this.ctx) return;
    this._beep(360, 0.06, 0.005);
  }

  playMove() {
    if (!this.enabled || !this.ctx) return;
    // Simple whoosh-like sweep
    const { ctx, sfxGain } = this;
    const t0 = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(8000, t0);
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, t0);
    osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.5);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.6, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    osc.connect(lpf);
    lpf.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + 0.6);
    osc.onended = () => {
      osc.disconnect();
      lpf.disconnect();
      g.disconnect();
    };
  }

  async playFootstep() {
    if (!this.enabled) return;
    this.init();
    try {
      const { findSfxUrl } = await import("./sfxLibrary.js");
      const url = findSfxUrl(/foot|step|walk|shoe|sand|wood/i);
      if (url) {
        const buf = await this._loadSample("footstep", url);
        await this._playBuffer(buf, 0.9);
        return;
      }
    } catch (_) {
      /* ignore and fallback */
    }
    // Fallback to synthetic short noise-tap pattern
    this._noiseBurst(0.03, 1800, 800);
    this._noiseBurst(0.03, 1600, 700);
    // Resolve after a short delay approximating the SFX length
    await new Promise((r) => setTimeout(r, 160));
  }

  _beep(freq, dur = 0.08, attack = 0.01) {
    const { ctx, sfxGain } = this;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0, t0);
    gain.gain.linearRampToValueAtTime(1.0, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  _noiseBurst(dur = 0.08, lpfHz = 1800, hpfHz = 400) {
    const { ctx, sfxGain } = this;
    const t0 = ctx.currentTime;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++)
      data[i] = (Math.random() * 2 - 1) * 0.6;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = lpfHz;

    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = hpfHz;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.9, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(g);
    g.connect(sfxGain);

    src.start(t0);
    src.stop(t0 + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      hpf.disconnect();
      lpf.disconnect();
      g.disconnect();
    };
  }

  // --- Music ---
  playOpening() {
    if (!this.enabled || !this.ctx) return;
    // Simple rising arpeggio to signal start
    const t0 = this.ctx.currentTime + 0.02;
    const notes = [392, 523, 659, 784]; // G4 C5 E5 G5
    notes.forEach((f, i) => this._note(f, t0 + i * 0.18, 0.14, 0.02, 0.6));
  }

  playClearFanfare() {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + 0.02;
    const seq = [523, 659, 784, 1047]; // C5 E5 G5 C6
    seq.forEach((f, i) => this._note(f, t0 + i * 0.16, 0.14, 0.01, 0.9));
  }

  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    // Gentle descending closure
    const t0 = this.ctx.currentTime + 0.02;
    const seq = [784, 659, 523, 392]; // G5 E5 C5 G4
    seq.forEach((f, i) => this._note(f, t0 + i * 0.22, 0.18, 0.01, 0.6));
  }

  startPlayMusic() {
    if (!this.enabled || !this.ctx) return;
    this.stopPlayMusic();
    this.playRate = 1;
    this._seqIndex = 0;
    this._nextStep = this.ctx.currentTime;
    // Use a light-weight scheduler with setInterval
    this.playTimer = setInterval(() => this._scheduleLoop(), 60);
  }

  stopPlayMusic() {
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  setPlayRate(rate) {
    this.playRate = Math.max(0.5, Math.min(2.0, rate || 1));
  }

  _note(freq, start, dur = 0.18, attack = 0.01, vol = 0.5) {
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, start);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(this.bgmGain);
    osc.start(start);
    osc.stop(start + dur + 0.05);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  _scheduleLoop() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const lookAhead = 0.3; // seconds to schedule ahead
    const beat = 0.4 / this.playRate; // base tempo
    while (this._nextStep < now + lookAhead) {
      // A simple 8-step pattern over a minor chord
      const pattern = [0, 3, 5, 7, 5, 3, 0, -2];
      const base = 261.63; // C4
      const minor = [0, 3, 7, 10]; // Cmin7
      const degree = pattern[this._seqIndex % pattern.length];
      const chord = minor[this._seqIndex % minor.length];
      const freq = base * Math.pow(2, (degree + chord) / 12);
      this._note(freq, this._nextStep, 0.18 / this.playRate, 0.01, 0.35);
      this._seqIndex += 1;
      this._nextStep += beat;
    }
  }
}

const audio = new AudioManager();
export default audio;
