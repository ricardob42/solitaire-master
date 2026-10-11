/** Synthesised sound effects (Web Audio): no audio files to ship or cache. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let volume = 0.55;
let unlocked = false; // browsers only allow audio after a user gesture

function ensure(): void {
  if (!unlocked) return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number): void {
  if (muted || !ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.06);
}

export const sfx = {
  unlock() {
    unlocked = true;
    ensure();
  },
  flip() { ensure(); tone(620, 0.07, 'triangle', 0.14, 0, 300); },
  place() { ensure(); tone(200, 0.09, 'sine', 0.22, 0, 140); tone(480, 0.045, 'triangle', 0.06); },
  foundation() { ensure(); tone(523, 0.12, 'triangle', 0.15); tone(784, 0.17, 'triangle', 0.12, 0.06); },
  invalid() { ensure(); tone(150, 0.11, 'square', 0.06, 0, 105); },
  undo() { ensure(); tone(430, 0.1, 'triangle', 0.1, 0, 230); },
  redo() { ensure(); tone(560, 0.1, 'triangle', 0.1, 0, 320); },
  recycle() { ensure(); tone(300, 0.13, 'triangle', 0.1, 0, 170); },
  /** Filtered noise sweep plus three quick flicks for a fresh deal. */
  shuffle() {
    ensure();
    if (muted || !ctx || !master) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(0.34 * ctx.sampleRate);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, t0);
    filter.frequency.exponentialRampToValueAtTime(3400, t0 + 0.3);
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(0.16, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
    src.stop(t0 + 0.4);
    for (let k = 0; k < 3; k++) tone(880 - k * 150, 0.05, 'triangle', 0.05, 0.07 + k * 0.09, 460);
  },
  victory() {
    ensure();
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, i * 0.12));
    tone(1318.5, 0.42, 'triangle', 0.11, 0.5);
  },
  setMuted(m: boolean) { muted = m; },
  /** v: 0..100 */
  setVolume(v: number) {
    volume = Math.max(0, Math.min(100, v)) / 100;
    if (master) master.gain.value = volume;
  }
};

export const haptic = (pattern: number | number[]): void => {
  navigator.vibrate?.(pattern);
};
