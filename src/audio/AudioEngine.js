/**
 * AudioEngine — Generative cyberpunk music + SFX via Web Audio API
 * No external files needed — everything is synthesized in real time.
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.musicVol = 0.6;
    this.sfxVol = 0.8;
    this.initialized = false;
    this.beatScheduler = null;
    this.bpm = 128;
    this.beatCount = 0;
    this.currentLevel = 1;
    this._lookahead = 0.1;
    this._nextBeatTime = 0;
    this._active = false;
    // Bass pattern (16 steps, midi-style note offsets)
    this.bassPattern = [0,0,7,0, 5,0,5,7, 0,0,7,0, 5,10,8,7];
    this.padPattern  = [0,4,7,11];
    this.arpNotes    = [0,7,12,7, 5,12,17,12];
  }

  async init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.ctx.destination);

      // Compressor for polish
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 8;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      comp.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.musicGain.connect(comp);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(comp);

      // Reverb
      this.reverb = await this._buildReverb(1.8);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.18;
      this.reverbGain.connect(this.musicGain);
      this.reverb.connect(this.reverbGain);

      this.initialized = true;
    } catch(e) {
      console.warn('AudioEngine init failed:', e);
    }
  }

  async _buildReverb(duration) {
    const sr = this.ctx.sampleRate;
    const len = sr * duration;
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.2);
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  _midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  _baseNote(level) {
    const roots = [33, 35, 33, 30, 33, 38, 33, 31, 33, 35];
    return roots[(level - 1) % roots.length]; // MIDI A1 range
  }

  startMusic(level = 1) {
    if (!this.initialized || !this.musicEnabled) return;
    this.stopMusic();
    this.currentLevel = level;
    this._active = true;
    this._nextBeatTime = this.ctx.currentTime + 0.05;
    this._scheduleLoop();
  }

  _scheduleLoop() {
    if (!this._active) return;
    const secondsPerBeat = 60 / this.bpm;
    const now = this.ctx.currentTime;

    while (this._nextBeatTime < now + this._lookahead) {
      const beat = this.beatCount % 16;
      const t = this._nextBeatTime;
      this._scheduleBeat(beat, t);
      this._nextBeatTime += secondsPerBeat / 2; // 8th notes
      this.beatCount++;
    }
    this.beatScheduler = setTimeout(() => this._scheduleLoop(), 25);
  }

  _scheduleBeat(step, t) {
    const root = this._baseNote(this.currentLevel);
    const spd = 60 / this.bpm;

    // === KICK on beats 0, 4, 8, 12 ===
    if (step % 4 === 0) this._kick(t);

    // === SNARE on beats 4, 12 ===
    if (step === 4 || step === 12) this._snare(t);

    // === HI-HAT every step (quieter on off-beats) ===
    this._hihat(t, step % 2 === 0 ? 0.5 : 0.25);

    // === BASS ===
    const bOffset = this.bassPattern[step];
    if (bOffset !== null) {
      this._bass(t, this._midiToFreq(root + bOffset), spd * 0.9);
    }

    // === ARP (every 2 steps) ===
    if (step % 2 === 0) {
      const aIdx = (step / 2) % this.arpNotes.length;
      this._arp(t, this._midiToFreq(root + 24 + this.arpNotes[aIdx]), spd * 0.4);
    }

    // === PAD (every 8 steps) ===
    if (step % 8 === 0) {
      const pIdx = (step / 8) % this.padPattern.length;
      this._pad(t, this._midiToFreq(root + 12 + this.padPattern[pIdx]), spd * 7);
    }
  }

  _kick(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.08);
    gain.gain.setValueAtTime(1.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain); gain.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.22);
  }

  _snare(t) {
    // Noise burst
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 2000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    src.connect(hp); hp.connect(gain); gain.connect(this.musicGain);
    src.start(t); src.stop(t + 0.15);

    // Tone component
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.frequency.value = 200;
    og.gain.setValueAtTime(0.3, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(og); og.connect(this.musicGain);
    osc.start(t); osc.stop(t + 0.08);
  }

  _hihat(t, vol) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(hp); hp.connect(gain); gain.connect(this.musicGain);
    src.start(t);
  }

  _bass(t, freq, dur) {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 2;
    osc.type = 'sawtooth'; osc.frequency.value = freq;
    osc2.type = 'square'; osc2.frequency.value = freq * 0.5;
    const g2 = this.ctx.createGain(); g2.gain.value = 0.3;
    gain.gain.setValueAtTime(0.55, t);
    gain.gain.setValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp); osc2.connect(g2); g2.connect(lp); lp.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t); osc.stop(t + dur);
    osc2.start(t); osc2.stop(t + dur);
  }

  _arp(t, freq, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'bandpass'; lp.frequency.value = freq * 2; lp.Q.value = 3;
    osc.type = 'square'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp); lp.connect(gain);
    gain.connect(this.musicGain);
    gain.connect(this.reverb);
    osc.start(t); osc.stop(t + dur);
  }

  _pad(t, freq, dur) {
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * (i === 0 ? 1 : i === 1 ? 1.5 : 2);
      osc.detune.value = (Math.random() - 0.5) * 12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08 / (i + 1), t + 0.4);
      gain.gain.linearRampToValueAtTime(0.05 / (i + 1), t + dur - 0.5);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(gain);
      gain.connect(this.musicGain);
      gain.connect(this.reverb);
      osc.start(t); osc.stop(t + dur);
    }
  }

  stopMusic() {
    this._active = false;
    clearTimeout(this.beatScheduler);
    this.beatCount = 0;
  }

  setLevel(level) {
    this.currentLevel = level;
    this.bpm = Math.min(160, 128 + (level - 1) * 4);
  }

  // ===== SFX =====
  _playSFX(fn) {
    if (!this.initialized || !this.sfxEnabled) return;
    try { fn(); } catch(e) {}
  }

  sfxJump() {
    this._playSFX(() => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'square';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(560, t + 0.08);
      gain.gain.setValueAtTime(this.sfxVol * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.12);
    });
  }

  sfxDash() {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 1.5);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 1;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVol * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      src.connect(bp); bp.connect(gain); gain.connect(this.sfxGain);
      src.start(t);
    });
  }

  sfxCollect(comboMult = 1) {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      const base = 880 * (1 + (comboMult - 1) * 0.15);
      [0, 0.06, 0.12].forEach((delay, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = base * [1, 1.25, 1.5][i];
        const s = t + delay;
        gain.gain.setValueAtTime(this.sfxVol * 0.25, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.15);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(s); osc.stop(s + 0.15);
      });
    });
  }

  sfxPortal() {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.3);
      gain.gain.setValueAtTime(this.sfxVol * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2000;
      osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  sfxHit() {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 0.8);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVol * 0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      src.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      src.start(t);
    });
  }

  sfxDeath() {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.8);
      gain.gain.setValueAtTime(this.sfxVol * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      const dist = this.ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) curve[i] = ((i/128 - 1) * 3) / (1 + Math.abs((i/128-1)*3));
      dist.curve = curve;
      osc.connect(dist); dist.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 1);
    });
  }

  sfxLevelUp() {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      [0, 4, 7, 12].forEach((semitone, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 440 * Math.pow(2, semitone / 12);
        const s = t + i * 0.1;
        gain.gain.setValueAtTime(this.sfxVol * 0.4, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.4);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(s); osc.stop(s + 0.5);
      });
    });
  }

  sfxMenuHover() {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 1200;
      gain.gain.setValueAtTime(this.sfxVol * 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.07);
    });
  }

  sfxMenuClick() {
    this._playSFX(() => {
      const t = this.ctx.currentTime;
      [600, 900].forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.value = f;
        const s = t + i * 0.04;
        gain.gain.setValueAtTime(this.sfxVol * 0.15, s);
        gain.gain.exponentialRampToValueAtTime(0.001, s + 0.08);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(s); osc.stop(s + 0.1);
      });
    });
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMusicVolume(v) {
    this.musicVol = v / 100;
    if (this.musicGain) this.musicGain.gain.value = this.musicEnabled ? this.musicVol : 0;
  }
  setSFXVolume(v) {
    this.sfxVol = v / 100;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVol : 0;
  }
  toggleMusic(on) {
    this.musicEnabled = on;
    if (this.musicGain) this.musicGain.gain.value = on ? this.musicVol : 0;
    if (!on) this.stopMusic();
  }
  toggleSFX(on) {
    this.sfxEnabled = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? this.sfxVol : 0;
  }
}

window.audio = new AudioEngine();
