// Tiny Web Audio synth. No audio files. Starts after the first user gesture.

export type Sfx = 'strike' | 'clamp' | 'capture' | 'miss' | 'escape' | 'resist' | 'shock' | 'coin' | 'newSpecies' | 'tick' | 'end' | 'buy' | 'bonus' | 'click';

export class AudioFx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.4);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(dur: number, vol: number, freq: number, q = 1, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master!);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  play(sfx: Sfx): void {
    if (this.muted || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    switch (sfx) {
      case 'strike': this.hiss(0.09, 0.5, 2400, 0.8); this.tone(900, 0.06, 'square', 0.08, 300); break;
      case 'clamp': this.tone(180, 0.07, 'square', 0.22, 90); this.hiss(0.05, 0.4, 5200, 2); break;
      case 'capture': this.tone(520, 0.08, 'square', 0.12, 780); this.tone(780, 0.1, 'square', 0.1, 1040, 0.06); break;
      case 'coin': this.tone(1320, 0.05, 'square', 0.06); this.tone(1760, 0.08, 'square', 0.06, undefined, 0.04); break;
      case 'miss': this.tone(140, 0.12, 'triangle', 0.25, 70); this.hiss(0.12, 0.25, 600, 0.7); break;
      case 'escape': this.hiss(0.18, 0.3, 1400, 0.5); this.tone(400, 0.12, 'triangle', 0.08, 900); break;
      case 'resist': this.tone(110, 0.16, 'sawtooth', 0.16, 70); this.tone(240, 0.08, 'square', 0.08, 120, 0.05); break;
      case 'shock': for (let i = 0; i < 4; i++) this.tone(1800 - i * 250, 0.04, 'sawtooth', 0.07, 400, i * 0.04); break;
      case 'newSpecies': [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, 0.12, 'square', 0.08, undefined, i * 0.07)); break;
      case 'bonus': [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.14, undefined, i * 0.06)); break;
      case 'tick': this.tone(1000, 0.04, 'square', 0.06); break;
      case 'end': [660, 520, 390].forEach((f, i) => this.tone(f, 0.18, 'square', 0.1, undefined, i * 0.12)); break;
      case 'buy': this.tone(700, 0.06, 'square', 0.1, 1400); this.tone(1400, 0.1, 'square', 0.06, undefined, 0.06); break;
      case 'click': this.tone(600, 0.03, 'square', 0.05); break;
    }
  }
}
