class BgmPlayer {
  constructor() {
    this.audio = null
    this.currentKey = null
    this.pendingPlay = false
  }

  _ensure() {
    if (!this.audio) {
      const a = new Audio()
      a.loop = true
      a.preload = 'auto'
      a.crossOrigin = 'anonymous'
      a.volume = 0.6
      this.audio = a
    }
  }

  async play(url, key = null) {
    if (!url) return this.stop()
    this._ensure()
    try {
      if (this.currentKey !== key || this.audio.src !== url) {
        this.audio.src = url
        this.currentKey = key
      }
      this.pendingPlay = true
      await this.audio.play()
      this.pendingPlay = false
    } catch (e) {
      // Likely blocked by autoplay; will retry on resume()
      this.pendingPlay = true
    }
  }

  async resume() {
    if (!this.audio) return
    if (!this.pendingPlay) return
    try {
      await this.audio.play()
      this.pendingPlay = false
    } catch {}
  }

  stop() {
    if (!this.audio) return
    try { this.audio.pause() } catch {}
    this.pendingPlay = false
  }

  setRate(rate = 1) {
    if (!this.audio) return
    try { this.audio.playbackRate = Math.max(0.5, Math.min(2, Number(rate) || 1)) } catch {}
  }

  setVolume(vol = 0.6) {
    if (!this.audio) return
    this.audio.volume = Math.max(0, Math.min(1, Number(vol) || 0.6))
  }
}

const bgm = new BgmPlayer()
export default bgm

