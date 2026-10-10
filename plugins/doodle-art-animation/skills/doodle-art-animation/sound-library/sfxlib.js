/*
 * sfxlib.js: the shared sound-effect library of the doodle-art-animation plugin. Every style can use it.
 * Every effect is synthesized with the Web Audio API inside an (Offline)AudioContext. There are no samples.
 *
 *   SFXLIB.fx.<name>(ac, out, t, opts)    schedule the sound to start at time t (seconds) into the AudioNode `out`
 *   SFXLIB.meta.<name>                    { family, styles, tags, events, desc, dur, from }
 *   SFXLIB.families                       family id -> { name, desc }
 *   SFXLIB.list({ family, style, tag })   effect names, filtered
 *
 * Options every effect takes:
 *   g      gain multiplier; 1 is the effect's designed level: a peak near -15 dBFS per channel before any master
 *          processing (sfxlib_test.mjs allows -22 to -5)
 *   pan    stereo position -1..1 (some effects move from it)
 *   seed   integer. Without one, the seed comes from the start time and the effect's name, so two plays at different
 *          times differ while a re-render of the same film is identical
 *   pitch  transposition in semitones, for effects with a pitch
 *   dur    length in seconds, for effects with a length
 *   key    MIDI note of the music's tonic, for effects that play notes (default 69, A4)
 *   style  '3dlight' (default) or 'doodle-draw', for effects with a flavour per style
 * Some effects take more (size, dir, bpm, n, curve); README.md and catalog.md list them.
 *
 * Rules: no Math.random, Date or performance.now; all randomness comes from mulberry32 seeded as above. Effects never
 * read globals of a style's engine, so the same file runs in Doodle Draw's engine.js, in 3DLight's sound engine and in
 * the listening page.
 *
 * Adding an effect: pick its family, give it meta (what it sounds like, which on-screen events it fits, which styles it
 * suits), build it from the helpers in H, keep it at the shared level, and run sfxlib_test.mjs. README.md has the rules.
 */
(function (root) {
'use strict';
const TAU = Math.PI * 2;
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
function mulberry(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

const lib = { version: 1, families: {}, meta: {}, fx: {} };
lib.families = {
  transition: { name: 'Transitions and motion', desc: 'Moves between scenes, camera moves, things flying past: swishes, air, tonal sweeps.' },
  impact: { name: 'Impacts and arrivals', desc: 'Something lands, locks, presses or is revealed: soft hits, sub drops, thuds with a tail.' },
  ui: { name: 'Interface', desc: 'Small precise sounds for labels, chips, checks, toggles and highlights.' },
  digital: { name: 'Data and digital', desc: 'Scans, readouts, data moving, processing and tidy glitches.' },
  organic: { name: 'Organic and biological', desc: 'Cells, membranes, binding, cutting, engulfing: soft, living, wet but clean.' },
  liquid: { name: 'Liquid and micro-fluid', desc: 'Drops, micro-bubbles, flow in channels and vessels.' },
  material: { name: 'Materials', desc: 'Struck glass, ceramic, metal, wood and plastic, from measured mode ratios.' },
  tonal: { name: 'Tonal accents and stingers', desc: 'Short musical figures: confirmations, reveals, logo resolves, in the music\'s key.' },
  texture: { name: 'Textures and ambiences', desc: 'Beds and long sounds under a scene: air, shimmer, hum, granular clouds.' },
  rhythm: { name: 'Rhythm and pulse', desc: 'Percussive elements for a bed or a tempo-locked cue: clicks, soft kicks, ticks.' },
};
lib.list = ({ family, style, tag } = {}) => Object.keys(lib.meta).filter(n => {
  const m = lib.meta[n];
  return (!family || m.family === family) && (!style || m.styles.includes(style)) && (!tag || (m.tags || []).includes(tag));
});

// ---------------------------------------------------------------- helpers handed to every effect
const NOISE = new WeakMap();
function noiseBufs(ac) { // 4 s of white and pink noise per context, seeded, stereo-decorrelated
  let nb = NOISE.get(ac); if (nb) return nb;
  const sr = ac.sampleRate, n = sr * 4, r = mulberry(0x5f1b);
  const white = ac.createBuffer(2, n, sr), pink = ac.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const w = white.getChannelData(ch), p = pink.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const x = r() * 2 - 1; w[i] = x;   // Paul Kellet's pink filter
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.96900 * b2 + x * 0.1538520;
      b3 = 0.86650 * b3 + x * 0.3104856; b4 = 0.55000 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.0168980;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
    }
  }
  nb = { white, pink }; NOISE.set(ac, nb); return nb;
}
const DSP = {
  /** decaying noise burst into d */
  burst(d, sr, t0, amp, len, tau, r) { const i0 = t0 * sr | 0, n = Math.min(d.length - i0, len * sr | 0), k = 1 / (tau * sr); for (let i = 0; i < n; i++) d[i0 + i] += amp * (r() * 2 - 1) * Math.exp(-i * k); },
  /** sum of exponentially decaying sines: [[freq, amp, tau]], the core of modal synthesis */
  modes(d, sr, t0, list, att = 24) { const i0 = t0 * sr | 0;
    for (const [f, a, tau] of list) { if (f >= sr / 2) continue; const n = Math.min(d.length - i0, tau * 7 * sr | 0), w = TAU * f / sr, k = 1 / (tau * sr);
      for (let i = 0; i < n; i++) d[i0 + i] += a * Math.sin(w * i) * Math.exp(-i * k) * Math.min(1, i / att); } },
  /** a damped sine whose pitch glides exponentially from f0 to f1 over `sweep` seconds (bubbles, drops, chirps) */
  chirp(d, sr, t0, amp, f0, f1, sweep, tau, len = tau * 6) { const i0 = t0 * sr | 0, n = Math.min(d.length - i0, len * sr | 0), k = Math.log(f1 / f0) / Math.max(1e-4, sweep);
    let ph = 0; for (let i = 0; i < n; i++) { const s = i / sr; ph += TAU * f0 * Math.exp(k * Math.min(s, sweep)) / sr; d[i0 + i] += amp * Math.sin(ph) * Math.exp(-s / tau) * Math.min(1, i / 48); } },
  /** two-pole resonator, centre f (Hz or a function of the sample index), bandwidth bw Hz */
  reson(x, sr, f, bw) { const r = Math.exp(-Math.PI * bw / sr), a2 = -r * r, y = new Float32Array(x.length); let y1 = 0, y2 = 0;
    const fixed = typeof f !== 'function', c = fixed ? 2 * r * Math.cos(TAU * f / sr) : 0;
    for (let i = 0; i < x.length; i++) { const a1 = fixed ? c : 2 * r * Math.cos(TAU * f(i) / sr), v = (1 - r) * x[i] + a1 * y1 + a2 * y2; y[i] = v; y2 = y1; y1 = v; } return y; },
  /** Karplus-Strong plucked string: a noise burst circulating in a delay line through a two-point average.
   *  decay (0.9..0.999) sets how long it rings; bright 0..1 lowpasses the starting burst for a softer pluck */
  karplus(d, sr, t0, amp, f, dur, r, decay = 0.996, bright = 1) {
    const N = Math.max(2, Math.round(sr / f)), buf = new Float32Array(N); let lp = 0;
    for (let i = 0; i < N; i++) { const x = r() * 2 - 1; lp += bright * (x - lp); buf[i] = lp; }
    const i0 = t0 * sr | 0, n = Math.min(d.length - i0, dur * sr | 0); let p = 0;
    for (let i = 0; i < n; i++) { const q = (p + 1) % N, v = buf[p]; buf[p] = decay * 0.5 * (v + buf[q]); d[i0 + i] += amp * v; p = q; } },
  /** two-operator FM tone written sample by sample: carrier fc, modulator fc*ratio, index decays idx0 -> idx1 over tauI */
  fm(d, sr, t0, amp, fc, ratio, idx0, idx1, tauI, tau, len = tau * 6, fb = 0) {
    const i0 = t0 * sr | 0, n = Math.min(d.length - i0, len * sr | 0); let pc = 0, pm = 0, last = 0;
    for (let i = 0; i < n; i++) { const s = i / sr, idx = idx1 + (idx0 - idx1) * Math.exp(-s / tauI);
      pm += TAU * fc * ratio / sr; const m = Math.sin(pm + fb * last); last = m; pc += TAU * fc / sr;
      d[i0 + i] += amp * Math.sin(pc + idx * m) * Math.exp(-s / tau) * Math.min(1, i / 32); } },
  /** granular cloud: n short windowed grains of a sine (or noise when f is 0) spread over `span` seconds */
  grains(d, sr, t0, amp, n, span, gl, fpick, r, shape = s => 1) {
    for (let k = 0; k < n; k++) { const at = t0 + span * r(), f = fpick(r, k), len = gl * (0.6 + 0.8 * r()), i0 = at * sr | 0, m = Math.min(d.length - i0, len * sr | 0), ph = r() * TAU, a = amp * (0.4 + 0.6 * r()) * shape((at - t0) / span);
      for (let i = 0; i < m; i++) { const w = Math.sin(Math.PI * i / m); d[i0 + i] += a * w * w * (f ? Math.sin(ph + TAU * f * i / sr) : (r() * 2 - 1)); } } },
  norm(d) { let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); if (m > 0) for (let i = 0; i < d.length; i++) d[i] /= m; return d; },
};
function makeH(ac, r) {
  const sr = ac.sampleRate;
  const H = {
    sr, r, TAU, clamp, mtof, DSP,
    rr: (a, b) => a + (b - a) * r(),
    pick: arr => arr[Math.floor(r() * arr.length) % arr.length],
    semis: n => Math.pow(2, ((r() * 2 - 1) * n) / 12),
    /** gain node (optionally into dest) */
    gain(v = 1, dest) { const g = ac.createGain(); g.gain.value = v; if (dest) g.connect(dest); return g; },
    /** node -> gain(level) -> panner(pan, optionally ramping to pan1 over dur) -> dest; returns the gain node */
    out(node, dest, t, { level = 1, pan = 0, pan1 = null, dur = 0.5 } = {}) {
      const g = ac.createGain(); g.gain.value = level; const p = ac.createStereoPanner(); p.pan.setValueAtTime(clamp(pan, -1, 1), t);
      if (pan1 != null) p.pan.linearRampToValueAtTime(clamp(pan1, -1, 1), t + dur);
      node.connect(g); g.connect(p); p.connect(dest); return g;
    },
    /** attack-decay envelope on an AudioParam; curve 'exp' or 'lin' */
    env(param, t, a, peak, d, curve = 'exp', hold = 0) {
      param.setValueAtTime(0.00001, t); param.linearRampToValueAtTime(peak, t + Math.max(0.0005, a));
      if (hold > 0) param.setValueAtTime(peak, t + a + hold);
      if (curve === 'exp') param.exponentialRampToValueAtTime(0.00001, t + a + hold + d); else param.linearRampToValueAtTime(0.00001, t + a + hold + d);
    },
    osc(type, f, t0, t1, detune = 0) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune; o.start(t0); o.stop(t1 + 0.05); return o; },
    filter(type, f, q = 0.707, g = 0) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = g; return b; },
    /** looping noise source (white or pink) from t0 to t1, from a seeded offset */
    noise(t0, t1, pink = false) { const nb = noiseBufs(ac), s = ac.createBufferSource(); s.buffer = pink ? nb.pink : nb.white; s.loop = true; s.start(t0, r() * 3.5); s.stop(t1 + 0.05); return s; },
    /** tanh waveshaper; drive > 1 adds harmonics */
    shaper(drive = 2) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(drive * x) / Math.tanh(drive); } const w = ac.createWaveShaper(); w.curve = c; w.oversample = '2x'; return w; },
    /** a small synthetic reverb: returns an input node; wet signal goes to dest */
    verb(dest, { sec = 1.2, decay = 3, wet = 0.3, lp = 6000, bright = 0 } = {}) {
      const n = Math.max(1, sec * sr | 0), b = ac.createBuffer(2, n, sr), rv = mulberry(0x77aa ^ (sec * 1000 | 0));
      for (let ch = 0; ch < 2; ch++) { const x = b.getChannelData(ch); for (let i = 0; i < n; i++) { const u = i / n; x[i] = (rv() * 2 - 1) * Math.pow(1 - u, decay) * (i < sr * 0.004 ? i / (sr * 0.004) : 1) * (bright ? 1 + bright * Math.sin(i * 0.37) : 1); } }
      const cv = ac.createConvolver(); cv.buffer = b; const f = H.filter('lowpass', lp); const g = H.gain(wet); cv.connect(f); f.connect(g); g.connect(dest); return cv;
    },
    /** sample-level synthesis: fill(d) writes a mono buffer of `dur` s, which is normalized to peak 1 and played at t
     *  through optional filters [{type, f, f1, q, gain}] -> gain(level) -> pan -> dest. Returns the gain node. */
    buffer(dest, t, dur, fill, { level = 0.25, pan = 0, pan1 = null, filters = [], fade = 0 } = {}) {
      const n = Math.max(2, Math.ceil(sr * dur)), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0); fill(d); DSP.norm(d);
      if (fade) { const m = Math.min(n >> 1, fade * sr | 0); for (let i = 0; i < m; i++) { d[i] *= i / m; d[n - 1 - i] *= i / m; } }
      const s = ac.createBufferSource(); s.buffer = b; let node = s;
      for (const fl of filters) { const bq = H.filter(fl.type || 'bandpass', fl.f, fl.q ?? 0.707, fl.gain ?? 0); bq.frequency.setValueAtTime(fl.f, t); if (fl.f1) bq.frequency.exponentialRampToValueAtTime(fl.f1, t + dur); node.connect(bq); node = bq; }
      s.start(t); return H.out(node, dest, t, { level, pan, pan1, dur });
    },
  };
  return H;
}

/** define(name, meta, fn): fn(ac, out, t, o, H) schedules the sound; H carries the seeded rng and the helpers */
function define(name, meta, fn) {
  if (lib.fx[name]) throw new Error('sfxlib: duplicate effect ' + name);
  if (!lib.families[meta.family]) throw new Error('sfxlib: unknown family ' + meta.family + ' for ' + name);
  lib.meta[name] = { styles: ['3dlight', 'doodle-draw'], tags: [], ...meta };
  lib.fx[name] = (ac, out, t, o = {}) => {
    const seed = o.seed != null ? (Math.imul(o.seed | 0, 2654435761) ^ hashStr(name)) >>> 0 : (Math.imul(Math.round(t * 1000), 40503) ^ hashStr(name)) >>> 0;
    const H = makeH(ac, mulberry(seed));
    const g = o.g ?? 1; const sub = ac.createGain(); sub.gain.value = g; sub.connect(out);
    fn(ac, sub, Math.max(0, t), o, H);
  };
}
lib.define = define;
lib.util = { mulberry, hashStr, mtof, DSP, noiseBufs };

// ---------------------------------------------------------------- effects
// Each effect lives in one family. Levels: aim for a peak near -15 dBFS per channel at g = 1 (H.buffer level 0.25 at centre pan).
// __EFFECTS__

root.SFXLIB = lib;
})(typeof window !== 'undefined' ? window : globalThis);
