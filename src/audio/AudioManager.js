// Simple Web Audio manager for SFX/BGM without external assets
const VICTORY_FANFARE_URL = "./assets/bgm/indie-game-fanfare.wav"; // Picross victory SE (single-shot)

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
    this._sfxUrlCache = new Map();
    this._fanfareSource = null;
    this._celebrationGain = null;
    this._scoreSource = null;
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
    this.stopScoreCount();
    this.stopClearFanfare();
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

  async _getSfxUrl(key, pattern) {
    if (this._sfxUrlCache.has(key)) return this._sfxUrlCache.get(key);
    const { findSfxUrl } = await import("./sfxLibrary.js");
    const url = findSfxUrl(pattern) || null;
    this._sfxUrlCache.set(key, url);
    return url;
  }

  async _playSoftClick(playbackRate = 1, gain = 0.9) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const url = await this._getSfxUrl("picross_click_soft", /picross_click_soft|click_soft|soft_click/i);
      if (url) {
        const buffer = await this._loadSample("picross_click_soft", url);
        const { ctx, sfxGain } = this;
        const when = ctx.currentTime + 0.004;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.setValueAtTime(playbackRate, when);
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, when);
        src.connect(g);
        g.connect(sfxGain);
        src.start(when);
        src.onended = () => {
          try {
            src.disconnect();
            g.disconnect();
          } catch {}
        };
        return;
      }
    } catch (_) {
      /* fall through to synthetic fallback */
    }
    if (!this.ctx) this.init();
    if (this.ctx) {
      this._noiseBurst(0.04, 2600, 900);
    }
  }

  // --- SFX ---
  playFill() {
    if (!this.enabled) return;
    this._playSoftClick(1, 0.9);
  }

  playMark() {
    if (!this.enabled) return;
    this._playSoftClick(1.1, 0.8);
  }

  async playSpellAttack(alignment = "hero") {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const url = await this._getSfxUrl(
        "spell_attack",
        /spell_attack|magic_blast|laser|attack|impact/i,
      );
      if (url) {
        const buffer = await this._loadSample("spell_attack", url);
        const playbackRate = alignment === "enemy" ? 0.92 : 1.08;
        const sourceGain = alignment === "enemy" ? 0.95 : 0.8;
        const { ctx, sfxGain } = this;
        const when = ctx.currentTime + 0.01;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.setValueAtTime(playbackRate, when);
        const g = ctx.createGain();
        g.gain.setValueAtTime(sourceGain, when);
        src.connect(g);
        g.connect(sfxGain);
        src.start(when);
        src.onended = () => {
          try {
            src.disconnect();
            g.disconnect();
          } catch {}
        };
        return;
      }
    } catch (_) {
      /* fall through to synthetic fallback */
    }
    const base = alignment === "enemy" ? 220 : 420;
    this._beep(base * 1.3, 0.12, 0.006);
    this._beep(base * 1.6, 0.1, 0.006);
    this._noiseBurst(0.16, alignment === "enemy" ? 1100 : 1600, 280);
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

  async startScoreCount() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopScoreCount();
    try {
      const url = await this._getSfxUrl(
        "score_chime",
        /coin_rush|score_chime|score_chiptune|chime/i,
      );
      if (!url) return;
      const buffer = await this._loadSample("score_chime", url);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = false;
      const gain = this.ctx.createGain();
      const startAt = this.ctx.currentTime + 0.01;
      const releaseAt = startAt + 0.48;
      gain.gain.setValueAtTime(0.32, startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, releaseAt);
      src.playbackRate.setValueAtTime(1.32, startAt);
      src.connect(gain);
      gain.connect(this.sfxGain);
      src.start(startAt);
      this._scoreSource = { src, gain };
      src.onended = () => {
        if (this._scoreSource && this._scoreSource.src === src) {
          this._scoreSource = null;
        }
        try {
          src.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch (_) {
      // Ignore and allow silent fallback
    }
  }

  stopClearFanfare() {
    if (this._fanfareSource) {
      try {
        this._fanfareSource.stop();
      } catch {}
      this._fanfareSource = null;
    }
  }

  stopScoreCount() {
    if (!this._scoreSource || !this.ctx) return;
    const { src, gain } = this._scoreSource;
    this._scoreSource = null;
    try {
      const now = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      if (typeof src.stop === "function") {
        src.stop(now + 0.1);
      }
    } catch {}
    setTimeout(() => {
      try {
        src.disconnect();
        gain.disconnect();
      } catch {}
    }, 180);
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

  async playEnemyEncounter() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const url = await this._getSfxUrl(
        "enemy_encount",
        /indie-game-pix-enemy-encount|enemy_encount|encounter/i,
      );
      if (url) {
        const buffer = await this._loadSample("enemy_encount", url);
        await this._playBuffer(buffer, 0.9);
        return;
      }
    } catch (_) {
      /* fall back to synthetic cue */
    }
    const base = 520;
    this._beep(base * 0.75, 0.22, 0.01);
    this._beep(base, 0.18, 0.01);
    this._noiseBurst(0.18, 2800, 900);
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

  async playStageClear() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const buffer = await this._loadSample(
        "victory_fanfare",
        VICTORY_FANFARE_URL,
      );
      if (this._fanfareSource) {
        try {
          this._fanfareSource.stop();
        } catch {}
        this._fanfareSource = null;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = false;
      const gain = this.ctx.createGain();
      const startAt = this.ctx.currentTime + 0.02;
      gain.gain.setValueAtTime(0.75, startAt);
      src.connect(gain);
      gain.connect(this.sfxGain);
      src.start(startAt);
      this._fanfareSource = src;
      src.onended = () => {
        try {
          src.disconnect();
          gain.disconnect();
        } catch {}
        if (this._fanfareSource === src) this._fanfareSource = null;
      };
      return;
    } catch (_) {
      /* fall back to synthetic fanfare if asset missing */
    }
    /* fall back to synthetic fanfare */
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + 0.02;
    const seq = [523, 659, 784, 1047, 784, 659, 523];
    seq.forEach((f, i) =>
      this._brassNote(f, t0 + i * 0.16, 0.2, i < 4 ? 0.85 : 0.7),
    );
    this._brassNote(1175, t0 + 1.12, 0.22, 0.6);
  }

  async playClearFanfare() {
    await this.playStageClear();
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
  // Brass-like synthesized note (trumpet-ish)
  _brassNote(freq, start, dur = 0.22, vol = 0.7) {
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2.type = "square";
    osc1.frequency.setValueAtTime(freq, start);
    osc2.frequency.setValueAtTime(freq * 0.999, start);

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.setValueAtTime(2200, start);
    lpf.Q.value = 0.9;

    const g = ctx.createGain();
    const a = 0.015, d = 0.12, s = 0.6, r = 0.12;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + a);
    g.gain.linearRampToValueAtTime(vol * s, start + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(dur, a + d) + r);

    lpf.frequency.linearRampToValueAtTime(2600, start + a + d);
    lpf.frequency.linearRampToValueAtTime(2000, start + Math.max(dur, a + d));

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(5.5, start);
    lfoGain.gain.setValueAtTime(6, start);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    const mix = ctx.createGain();
    osc1.connect(mix);
    osc2.connect(mix);
    mix.connect(lpf);
    lpf.connect(g);
    g.connect(this.bgmGain);

    osc1.start(start);
    osc2.start(start);
    lfo.start(start + 0.02);
    const stopAt = start + Math.max(dur, a + d) + 0.2;
    osc1.stop(stopAt);
    osc2.stop(stopAt);
    lfo.stop(stopAt);
    osc1.onended = () => { try { osc1.disconnect(); } catch {} };
    osc2.onended = () => { try { osc2.disconnect(); } catch {} };
    lfo.onended = () => { try { lfo.disconnect(); lfoGain.disconnect(); } catch {} };
    setTimeout(() => { try { mix.disconnect(); lpf.disconnect(); g.disconnect(); } catch {} }, (stopAt - ctx.currentTime) * 1000 + 20);
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
