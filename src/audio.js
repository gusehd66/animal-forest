// 절차적 사운드(WebAudio, 에셋 없음): 효과음 + 애니멀리즈 음성 + 시간대별 BGM. 첫 제스처 후 init.
const MOODS = { // 시간대별 BGM 분위기 (scale, seq, interval(ms), 음길이, 볼륨)
  dawn: { scale: [261.6, 293.7, 349.2, 392.0, 440.0], seq: [0, 2, 3, 4, 3, 1], interval: 1000, dur: 1.0, vol: 0.045 },
  day: { scale: [261.6, 293.7, 329.6, 392.0, 440.0, 523.3], seq: [0, 2, 4, 3, 2, 0, 4, 5], interval: 820, dur: 0.85, vol: 0.05 },
  dusk: { scale: [246.9, 277.2, 329.6, 370.0, 415.3], seq: [4, 3, 2, 1, 2, 0], interval: 1050, dur: 1.1, vol: 0.045 },
  night: { scale: [220.0, 261.6, 293.7, 329.6], seq: [0, 2, 1, 3, 1, 0], interval: 1300, dur: 1.3, vol: 0.035 },
};

class GameAudio {
  constructor() { this.ctx = null; this.master = null; this.muted = false; this._t = null; this._i = 0; this.mood = 'day'; }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.32; this.master.connect(this.ctx.destination);
    this._scheduleBgm();
  }
  _blip(freq, dur, type = 'sine', vol = 0.3, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  }
  step() { this._blip(150 + Math.random() * 40, 0.07, 'triangle', 0.09); }
  pick() { this._blip(620, 0.08, 'square', 0.12); this._blip(880, 0.06, 'square', 0.08, 0.05); }
  catchGet() { this._blip(660, 0.1, 'sine', 0.18); this._blip(990, 0.12, 'sine', 0.16, 0.08); this._blip(1320, 0.14, 'sine', 0.12, 0.16); }
  place() { this._blip(300, 0.09, 'triangle', 0.14); this._blip(200, 0.1, 'triangle', 0.1, 0.05); }
  coin() { this._blip(1050, 0.07, 'square', 0.14); this._blip(1400, 0.09, 'square', 0.12, 0.05); }
  ui() { this._blip(520, 0.05, 'sine', 0.1); }
  emote() { this._blip(740, 0.09, 'sine', 0.14); this._blip(1100, 0.09, 'sine', 0.1, 0.06); }
  // 애니멀리즈: 대사 글자마다 짧은 소리를 빠르게 재생(동숲 주민 말소리). voice=음높이 배율.
  speak(text, voice = 1) {
    if (!this.ctx || this.muted) return;
    const chars = [...String(text)].filter((c) => /\S/.test(c)).slice(0, 16);
    const base = 340 * voice;
    chars.forEach((ch, i) => {
      const f = base + (ch.charCodeAt(0) % 13) * 24 + (i % 2 ? 18 : 0);
      this._blip(f, 0.05, 'square', 0.05, i * 0.052);
    });
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.32; return this.muted; }
  setMood(m) { if (MOODS[m]) this.mood = m; }
  // 시간대 분위기에 맞춰 스스로 재예약되는 BGM 루프(잔잔한 5음계)
  _scheduleBgm() {
    const play = () => {
      const M = MOODS[this.mood] || MOODS.day;
      if (this.ctx && !this.muted) {
        const f = M.scale[M.seq[this._i % M.seq.length]] / 2; // 한 옥타브 낮게(부드럽게)
        this._blip(f, M.dur, 'sine', M.vol);
        if (this._i % 2 === 0) this._blip(f * 1.5, M.dur * 0.7, 'triangle', M.vol * 0.5, 0.2);
      }
      this._i++;
      this._t = setTimeout(play, M.interval);
    };
    play();
  }
}
export const audio = new GameAudio();
