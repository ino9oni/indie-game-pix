class BgmPlayer {
  constructor() {
    this.audio = null;
    this.currentKey = null;
    this.currentUrl = null;
    this.pendingPlay = false;
    this.defaultVolume = 0.6;
    this._fadeAbort = null;
    this._fadeFrame = null;
  }

  _ensure() {
    if (!this.audio) {
      const a = new Audio();
      a.loop = true;
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      a.volume = this.defaultVolume;
      this.audio = a;
    }
  }

  _cancelFade() {
    if (this._fadeAbort) {
      this._fadeAbort();
      this._fadeAbort = null;
    }
    if (this._fadeFrame) {
      cancelAnimationFrame(this._fadeFrame);
      this._fadeFrame = null;
    }
  }

  _animateVolume(targetVolume, durationMs) {
    if (!this.audio) return Promise.resolve();
    this._cancelFade();
    if (!durationMs || durationMs <= 0) {
      this.audio.volume = targetVolume;
      return Promise.resolve();
    }

    const startVolume = this.audio.volume;
    const delta = targetVolume - startVolume;
    const start = performance.now();

    return new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - start;
        const ratio = Math.min(1, elapsed / durationMs);
        this.audio.volume = startVolume + delta * ratio;
        if (ratio < 1) {
          this._fadeFrame = requestAnimationFrame(step);
        } else {
          this._fadeAbort = null;
          this._fadeFrame = null;
          resolve();
        }
      };

      this._fadeAbort = () => {
        if (this._fadeFrame) {
          cancelAnimationFrame(this._fadeFrame);
          this._fadeFrame = null;
        }
        const abortResolve = resolve;
        this._fadeAbort = null;
        abortResolve();
      };

      this._fadeFrame = requestAnimationFrame(step);
    });
  }

  async crossFadeTo(url, key = null, { fadeOutMs = 0, fadeInMs = 0, targetVolume } = {}) {
    if (!url) {
      await this.fadeOutAndStop(fadeOutMs);
      return;
    }

    this._ensure();
    if (!this.audio) return;

    const volume = targetVolume ?? this.defaultVolume;
    const sameSource = this.currentKey === key && this.currentUrl === url;

    if (sameSource && !this.audio.paused) {
      await this._animateVolume(volume, fadeInMs);
      return;
    }

    await this._animateVolume(0, fadeOutMs);

    this.audio.volume = 0;
    this.audio.src = url;
    this.currentKey = key;
    this.currentUrl = url;

    try {
      await this.audio.play();
      this.pendingPlay = false;
    } catch (e) {
      this.pendingPlay = true;
    }

    await this._animateVolume(volume, fadeInMs);
  }

  async play(url, key = null) {
    if (!url) return this.stop();
    this._ensure();
    try {
      const sameSource = this.currentKey === key && this.currentUrl === url;
      if (!sameSource) {
        this.audio.src = url;
        this.currentKey = key;
        this.currentUrl = url;
      }
      if (sameSource && !this.audio.paused) {
        this.pendingPlay = false;
        return;
      }
      this.pendingPlay = true;
      await this.audio.play();
      this.pendingPlay = false;
    } catch (e) {
      // Likely blocked by autoplay; will retry on resume()
      this.pendingPlay = true;
    }
  }

  async resume() {
    if (!this.audio) return;
    if (!this.pendingPlay) return;
    try {
      await this.audio.play();
      this.pendingPlay = false;
    } catch {}
  }

  stop() {
    if (!this.audio) return;
    try {
      this.audio.pause();
    } catch {}
    this.pendingPlay = false;
    this._cancelFade();
  }

  setRate(rate = 1) {
    if (!this.audio) return;
    try {
      this.audio.playbackRate = Math.max(0.5, Math.min(2, Number(rate) || 1));
    } catch {}
  }

  setVolume(vol = 0.6) {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, Number(vol) || 0.6));
  }

  async fadeOutAndStop(durationMs = 0) {
    if (!this.audio) {
      this.stop();
      return;
    }
    await this._animateVolume(0, durationMs);
    this.stop();
    this._ensure();
    if (this.audio) this.audio.volume = this.defaultVolume;
    this.currentKey = null;
    this.currentUrl = null;
  }
}

const bgm = new BgmPlayer();
export default bgm;
