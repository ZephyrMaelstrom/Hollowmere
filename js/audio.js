// Synthesised sound effects and a gentle generative soundtrack. No audio files.
export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.musicT = 0;
    this.started = false;
  }
  start() {
    if (this.started) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { return; }
    this.started = true;
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = 0.55; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.connect(this.master);
    // simple echo for music
    this.delay = c.createDelay(1.0); this.delay.delayTime.value = 0.42;
    this.fb = c.createGain(); this.fb.gain.value = 0.33;
    this.delay.connect(this.fb); this.fb.connect(this.delay);
    this.delay.connect(this.mus);
    this.apply();
  }
  apply() {
    if (!this.ctx) return;
    const s = this.game.state.settings;
    this.sfx.gain.value = s.sound ? 0.8 : 0;
    this.mus.gain.value = s.music ? 0.28 : 0;
  }
  tone(freq, dur, type = 'sine', vol = 0.3, when = 0, dest = null, slide = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol = 0.2, freq = 2000, when = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + when;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfx);
    src.start(t);
  }
  play(name) {
    if (!this.ctx || !this.game.state.settings.sound) return;
    const T = (f, d, ty, v, w, sl) => this.tone(f, d, ty, v, w, null, sl);
    switch (name) {
      case 'tick': T(880, 0.04, 'square', 0.05); break;
      case 'open': T(520, 0.06, 'triangle', 0.12); T(780, 0.08, 'triangle', 0.1, 0.04); break;
      case 'pick': T(660, 0.07, 'triangle', 0.18); T(990, 0.09, 'triangle', 0.14, 0.05); break;
      case 'place': this.noise(0.08, 0.25, 600); T(180, 0.1, 'sine', 0.25); break;
      case 'scoop': for (let i = 0; i < 6; i++) T(200 + i * 18, 0.12, 'sawtooth', 0.05, i * 0.03); T(520, 0.15, 'triangle', 0.15, 0.2); break;
      case 'net': this.noise(0.25, 0.25, 3000); T(1200, 0.12, 'sine', 0.12, 0.1, 1.5); break;
      case 'chop': this.noise(0.12, 0.45, 900); this.noise(0.1, 0.35, 700, 0.14); break;
      case 'coin': T(1320, 0.07, 'square', 0.08); T(1760, 0.12, 'square', 0.07, 0.06); break;
      case 'craft': T(440, 0.06, 'square', 0.08); T(554, 0.06, 'square', 0.08, 0.06); T(659, 0.12, 'square', 0.08, 0.12); break;
      case 'crank': this.noise(0.05, 0.3, 1500); this.noise(0.05, 0.25, 1300, 0.07); break;
      case 'lens': for (let i = 0; i < 5; i++) T(1000 + i * 240, 0.12, 'sine', 0.07, i * 0.04); break;
      case 'talk': T(330 + Math.random() * 120, 0.05, 'triangle', 0.08); break;
      case 'nope': T(200, 0.12, 'square', 0.07); T(150, 0.15, 'square', 0.07, 0.08); break;
      case 'mail': T(1568, 0.3, 'sine', 0.12); T(2093, 0.4, 'sine', 0.08, 0.12); break;
      case 'discover': [784, 988, 1175, 1568].forEach((f, i) => T(f, 0.25, 'triangle', 0.12, i * 0.07)); break;
      case 'quest': [523, 659, 784, 1047].forEach((f, i) => T(f, 0.3, 'triangle', 0.14, i * 0.09)); break;
      case 'rank': [392, 523, 659, 784, 1047].forEach((f, i) => T(f, 0.45, 'square', 0.08, i * 0.11)); break;
      case 'awake': [262, 330, 392, 523, 659, 784].forEach((f, i) => T(f, 3.5, 'sine', 0.1, i * 0.25)); break;
    }
  }
  // Called each frame: occasionally plays a soft note.
  update(dt, mood) {
    if (!this.ctx || !this.game.state.settings.music) return;
    this.musicT -= dt;
    if (this.musicT > 0) return;
    const scales = {
      day: [0, 2, 4, 7, 9, 12, 14, 16], night: [0, 3, 5, 7, 10, 12, 15], cold: [0, 2, 7, 9, 12, 14, 19], hot: [0, 1, 4, 5, 7, 8, 12], dark: [0, 3, 6, 7, 10, 12],
    };
    const roots = { day: 261.6, night: 220, cold: 293.7, hot: 246.9, dark: 196 };
    const sc = scales[mood] || scales.day, root = roots[mood] || 261.6;
    const n = sc[Math.floor(Math.random() * sc.length)];
    const f = root * Math.pow(2, n / 12) * (Math.random() < 0.25 ? 0.5 : 1);
    this.tone(f, 1.6, 'sine', 0.18, 0, this.mus);
    this.tone(f, 1.6, 'sine', 0.06, 0, this.delay);
    if (Math.random() < 0.25) this.tone(root / 2, 3.5, 'triangle', 0.05, 0, this.mus);
    this.musicT = 0.9 + Math.random() * 2.2;
  }
}
