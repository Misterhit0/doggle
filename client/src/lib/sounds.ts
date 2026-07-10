class SoundEngine {
  private ctx: AudioContext | null = null;

  private init(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, gain: number, type: OscillatorType = 'sine', startTime = 0) {
    const ctx = this.init();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + startTime);
    gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration + 0.05);
  }

  playTap() {
    try {
      this.tone(520, 0.06, 0.06, 'sine');
    } catch {}
  }

  playPass() {
    try {
      this.tone(220, 0.12, 0.07, 'sine');
      this.tone(180, 0.10, 0.05, 'sine', 0.06);
    } catch {}
  }

  playLike() {
    try {
      // Arpège C-E-G montant
      this.tone(523, 0.10, 0.12, 'sine', 0.00);
      this.tone(659, 0.10, 0.12, 'sine', 0.08);
      this.tone(784, 0.15, 0.14, 'sine', 0.16);
    } catch {}
  }

  playFavorite() {
    try {
      // Scintillement étoile
      this.tone(880, 0.08, 0.10, 'sine', 0.00);
      this.tone(1108, 0.08, 0.10, 'sine', 0.07);
      this.tone(1320, 0.12, 0.12, 'sine', 0.14);
    } catch {}
  }

  playMatch() {
    try {
      // Accord C-E-G + shimmer
      this.tone(523, 0.5, 0.15, 'sine', 0.00);
      this.tone(659, 0.5, 0.13, 'sine', 0.00);
      this.tone(784, 0.5, 0.12, 'sine', 0.00);
      this.tone(1046, 0.3, 0.08, 'triangle', 0.10);
      this.tone(1318, 0.2, 0.06, 'triangle', 0.20);
    } catch {}
  }
}

export const sounds = new SoundEngine();
