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
// ================================================================ Motion and interface: transitions, impacts, interface (research/motion_ui.md)
// motion_a.js: transitions, impacts and interface sounds from the motion_ui catalog (3DLight style first).
// Every effect is self-contained: sample-level synthesis into AudioBuffers, a few Web Audio filters and a verb send.
// Shared option conventions: o.pitch (semitones), o.key (MIDI tonic, default 69), o.pan, o.dur (length where it has one),
// o.dir ('up'/'down' for sweeps, 'in'/'out' for converge/diverge pairs), o.size (siliconeTap, dopplerPass: 0 small .. 1 big).

// ---------------------------------------------------------------------------------------------- transitions
define('tunedSweep', { family: 'transition', styles: ['3dlight'], tags: ['airy', 'tonal', 'soft', 'premium'], dur: 1.5,
  desc: 'A breath of air that sings a soft open chord as it passes: a tonal swoosh made of chord-tuned noise, never a plain hiss.',
  events: 'dissolve between beats; camera push; element glides in; one scene hands over to the next',
  from: 'motion_ui catalog, tunedSweep (sources 34 tuned bandpass resonators, 16 UVI whoosh tips, 14 Pixflow transitions)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const pink = n => { const x = new Float32Array(n); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, e = 0; for (let i = 0; i < n; i++) { const w = r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; x[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926; e += x[i] * x[i]; } const k = 1 / Math.sqrt(e / n || 1); for (let i = 0; i < n; i++) x[i] *= k; return x; };
  const f0 = fold(H.mtof(key + (r() < 0.5 ? 0 : 7)), 196) * pf * H.semis(0.34);
  const upDir = o.dir ? o.dir !== 'down' : r() < 0.5;
  const T = Math.min(1.6, Math.max(0.4, o.dur || 0.85)) * H.rr(0.94, 1.06), nb = 3 + Math.floor(r() * 3);
  const total = T + 0.1, n = Math.ceil(total * sr), nz = pink(n);
  const ratio = [1, 1.5, 2, 3, 4], wt = [1, 0.7, 0.5, 0.3, 0.2], bd = [], q = [];
  for (let b = 0; b < nb; b++) { bd.push(mkSvf()); q.push(H.rr(25, 35)); }
  const air = mkSvf(), pw = Math.log(0.5) / Math.log(0.6), pan0 = o.pan || 0;
  const g = H.buffer(out, t, total, d => {
    for (let i = 0; i < n; i++) {
      const u = i / sr / T; if (u >= 1) break;
      const c = Math.sin(Math.PI * Math.pow(u, pw)), w = c * c, fc = f0 * Math.pow(2, upDir ? u : 1 - u);
      let y = 0; for (let b = 0; b < nb; b++) { bd[b].run(nz[i], fc * ratio[b], q[b]); y += bd[b].bp * wt[b]; }
      air.run(nz[i], Math.min(fc * 4, 6000), 1.2); y += air.bp * 0.06;
      d[i] = y * w;
    }
  }, { level: 0.22 * db(H.rr(-1.5, 1.5)), pan: pan0 - 0.4, pan1: pan0 + 0.4, filters: [{ type: 'highpass', f: 130 }, { type: 'lowpass', f: 5000 }] });
  g.connect(H.verb(out, { sec: 1.2, decay: 3, wet: 0.2, lp: 3500 }));
});

define('breathBloom', { family: 'transition', styles: ['3dlight'], tags: ['soft', 'warm', 'tonal', 'premium'], dur: 1.0,
  desc: 'A tiny inhale, a soft rounded two-note swell on the boundary 150 ms later, then a quiet room tail.',
  events: 'beat-to-beat dissolve; section change; new card arriving; any calm scene boundary (the swell lands 0.15 s after t)',
  from: 'motion_ui catalog, breathBloom (sources 7 Quietmark breath-bloom-tail, 6 Microsoft sound design)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const f1 = fold(H.mtof(key), 262) * pf * H.semis(0.34), f2 = f1 * (r() < 0.5 ? 1.5 : 5 / 3);
  const lead = 0.15, total = 0.95, n = Math.ceil(total * sr), bc = 2000 * H.rr(0.85, 1.15), svf = mkSvf();
  let p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU;
  const g = H.buffer(out, t, total, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, s2 = s - lead;
      const be = 0.15 * (s < 0.12 ? sm(s / 0.12) : s < lead ? 1 : Math.exp(-(s - lead) / 0.05));
      svf.run(r() * 2 - 1, bc, 1);
      let y = svf.bp * be;
      p1 += TAU * f1 / sr; p2 += TAU * f2 / sr; p3 += TAU * 3 * f1 / sr;
      if (s2 >= 0) {
        const env = sm(s2 / 0.04) * (s2 < 0.14 ? 1 : Math.exp(-(s2 - 0.14) / 0.075)) * (s2 > 0.62 ? sm((0.74 - s2) / 0.12) : 1);
        y += env * (0.6 * Math.sin(p1) + 0.5 * Math.sin(p2) + 0.075 * (2 / Math.PI) * Math.asin(Math.sin(p3)));
      }
      d[i] = y;
    }
  }, { level: 0.24 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0 });
  g.connect(H.verb(out, { sec: 0.9, decay: 3, wet: 0.25, lp: 3000 }));
});

define('reverseBloom', { family: 'transition', styles: ['3dlight', 'doodle-draw'], tags: ['airy', 'soft', 'tonal', 'premium'], dur: 2.0,
  desc: 'A soft note\'s room tail played backwards: a stereo swell that grows out of silence and lands on the dry note exactly o.dur (default 1.4 s) after t.',
  events: 'headline arrives; layer assembles; any about-to-appear moment (schedule t = boundary - o.dur; o.voice marimba or kalimba for the notebook style)',
  from: 'motion_ui catalog, reverseBloom (sources 20 Beat Kitchen reverse reverb, 19 Attack Magazine, 17 IRPR risers)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const lead = Math.min(2.4, Math.max(0.6, o.dur || 1.4)), D = 6, ds = sr / D;
  const nx = Math.round(0.25 * ds), nh = Math.max(16, Math.round((lead - 0.25) * ds)), ny = nx + nh - 1, nW = Math.round(lead * sr);
  const f1 = fold(H.mtof(key), 330) * pf * H.semis(0.34), f2 = f1 * (r() < 0.5 ? 1.5 : 5 / 3);
  const voice = o.voice === 'marimba' ? { parts: [[1, 1], [4, 0.3], [10, 0.07]], atk: 0.004, tau: 0.075 }
    : o.voice === 'kalimba' ? { parts: [[1, 1], [6.27, 0.2], [17.5, 0.04]], atk: 0.002, tau: 0.11 }
    : { parts: [[1, 1], [3, 0.12]], atk: 0.03, tau: 0.05 };
  // the note, written into arr at `rate`; amp scales it. airy adds a soft noise tick that becomes a hiss swell when reversed
  const note = (arr, rate, amp, airy) => {
    const len = Math.min(arr.length, Math.round(0.4 * rate));
    for (const [fb, a0] of [[f1, 1], [f2, 0.8]]) for (const [rt, pa] of voice.parts) {
      const f = fb * rt; if (f > 0.45 * rate) continue; const w = TAU * f / rate;
      for (let i = 0; i < len; i++) { const s = i / rate; arr[i] += amp * a0 * pa * Math.sin(w * i) * Math.min(1, s / voice.atk) * Math.exp(-s / voice.tau); }
    }
    if (airy) { let lp = 0, slow = 0; for (let i = 0; i < len; i++) { const w = r() * 2 - 1; slow += 0.25 * (w - slow); lp += 0.5 * ((w - slow) - lp); arr[i] += amp * airy * lp * Math.exp(-i / rate / 0.012) * Math.min(1, i / rate / 0.004); } }
  };
  const mkIR = () => { const h = new Float32Array(nh), tauH = (nh / ds) / 6.9; let lp = 0;
    for (let i = 0; i < nh; i++) { const c = 6000 * Math.pow(1200 / 6000, i / nh), a = 1 - Math.exp(-TAU * c / ds); lp += a * ((r() * 2 - 1) - lp); h[i] = lp * Math.exp(-i / ds / tauH) * Math.min(1, i / (0.004 * ds)); } return h; };
  const conv = (x, h) => { const y = new Float32Array(ny); for (let k = 0; k < nx; k++) { const xv = x[k]; if (Math.abs(xv) < 1e-6) continue; const m = Math.min(nh, ny - k); for (let j = 0; j < m; j++) y[k + j] += xv * h[j]; } return y; };
  // reversed read + cubic (Catmull-Rom) upsampling to the full rate
  const revUp = y => { const W = new Float32Array(nW), at = j => (j < 0 || j >= ny) ? 0 : y[ny - 1 - j];
    for (let i = 0; i < nW; i++) { const pos = i / D, i1 = Math.floor(pos), fr = pos - i1, p0 = at(i1 - 1), p1 = at(i1), p2 = at(i1 + 1), p3 = at(i1 + 2);
      W[i] = p1 + 0.5 * fr * (p2 - p0 + fr * (2 * p0 - 5 * p1 + 4 * p2 - p3 + fr * (3 * (p1 - p2) + p3 - p0))); } return W; };
  const x = new Float32Array(nx); note(x, ds, 1, 0.5);
  const WL = revUp(conv(x, mkIR())), WR = revUp(conv(x, mkIR()));
  let m = 0; for (let i = 0; i < nW; i++) m = Math.max(m, Math.abs(WL[i]), Math.abs(WR[i]));
  const k = m > 0 ? 1 / m : 0, fin = Math.round(0.15 * sr);
  const dry = new Float32Array(Math.round(0.6 * sr)); note(dry, sr, 0.5 * (o.voice ? 1.3 : 1), 0);
  const total = lead + 0.6, n = Math.ceil(total * sr), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  for (let i = 0; i < nW; i++) { const w = i < fin ? Math.pow(Math.sin(Math.PI / 2 * i / fin), 2) : 1; L[i] = WL[i] * k * w; R[i] = WR[i] * k * w; }
  for (let i = 0; i < dry.length && nW + i < n; i++) { L[nW + i] += dry[i]; R[nW + i] += dry[i]; }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const lpf = H.filter('lowpass', 5500), g = H.gain(0.18 * db(H.rr(-1.5, 1.5)));
  s.connect(lpf); lpf.connect(g); g.connect(out); s.start(t);
  // a little room around the swell and the landing
  const send = H.gain(0.5, H.verb(out, { sec: 0.7, decay: 3, wet: 0.25, lp: 3000 })); lpf.connect(send);
});

define('fallAway', { family: 'transition', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'dark', 'airy'], dur: 0.7,
  desc: 'A soft downward breath: pitch and brightness fall together over about half a second, then a beat of near silence.',
  events: 'element shrinks to a dot; zoom out; scene exit; collapse to a sphere',
  from: 'motion_ui catalog, fallAway (sources 17 IRPR riser glossary, 18 Ableton high-impact sounds)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const T = Math.min(1.2, Math.max(0.25, o.dur || 0.55)) * H.rr(0.88, 1.12), total = T + 0.03, n = Math.ceil(total * sr);
  const fs = fold(H.mtof(key), 740) * pf * H.semis(0.34), fe = fs * 1.5 / 8, lp = mkSvf(), uEnd = (T - 0.06) / T;
  H.buffer(out, t, total, d => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const u = i / sr / T; if (u >= 1) break;
      const e = Math.pow(u, 1.6), f = fs * Math.pow(fe / fs, e); ph += TAU * f / sr;
      const a = u < 0.15 ? sm(u / 0.15) : Math.max(0, 1 - (u - 0.15) / (uEnd - 0.15));
      lp.run(r() * 2 - 1, 5000 * Math.pow(400 / 5000, e), 0.707);
      d[i] = a * (Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.3 * lp.lp);
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'highpass', f: 90 }] });
});

define('shepardRise', { family: 'transition', styles: ['3dlight'], tags: ['tonal', 'airy', 'dark', 'premium'], dur: 8,
  desc: 'A quiet endless lift built from octave-spaced partials under a fixed bell: it keeps rising without ever arriving, and fades in and out without a peak.',
  events: 'the seam of the 45 s loop; long camera drift; keep going progress (o.dur sets length, o.octaves the total lift, o.dir down for a relaxing fall)',
  from: 'motion_ui catalog, shepardRise (sources 25 Eldredge Shepard tone, 17 IRPR risers)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const dur = Math.min(60, Math.max(2, o.dur || 8)), oct = o.octaves != null ? o.octaves : 1, down = o.dir === 'down';
  const n = Math.ceil(dur * sr), fade = Math.min(2.2, dur * 0.3), fadeN = fade * sr, K = 10, SIG = 1.5;
  const base = fold(H.mtof(key), 27.5), c0 = Math.log2(700 * pf), step = (down ? -1 : 1) * oct / (dur * sr), grow = Math.pow(2, step), span = Math.pow(2, K);
  const am0 = r() * TAU, amDepth = 0.1, lb = Math.log2(base), det = H.rr(1.0012, 1.0022);
  const b = ac.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let k = 0; k < K; k++) { // one octave-spaced partial: it rises with the shared lift and wraps from the top back to the bottom
      let p = k + (down ? oct : 0); p -= Math.floor(p / K) * K;
      let f = base * Math.pow(2, p) * (ch ? det : 1), ph = r() * TAU, w = 0;
      for (let i = 0; i < n; i++) {
        p += step; if (p >= K) { p -= K; f /= span; } else if (p < 0) { p += K; f *= span; }
        f *= grow; ph += TAU * f / sr; if (ph > TAU) ph -= TAU;
        if ((i & 31) === 0) { const z = (lb + p - c0) / SIG; w = f < sr * 0.45 ? Math.exp(-0.5 * z * z) : 0; }
        if (w > 0.002) d[i] += w * Math.sin(ph);
      }
    }
    for (let i = 0; i < n; i++) {
      const e = i < fadeN ? Math.pow(Math.sin(Math.PI / 2 * i / fadeN), 2) : i > n - fadeN ? Math.pow(Math.sin(Math.PI / 2 * (n - i) / fadeN), 2) : 1;
      d[i] *= e * (1 + amDepth * Math.sin(TAU * 0.3 * i / sr + am0 + ch * 1.7));
    }
  }
  const L = b.getChannelData(0), R = b.getChannelData(1); let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const lpf = H.filter('lowpass', 4000), g = H.gain(0.18 * db(H.rr(-1.5, 1.5)));
  s.connect(lpf); lpf.connect(g); g.connect(out); s.start(t);
});

define('dopplerPass', { family: 'transition', styles: ['3dlight'], tags: ['smooth', 'tonal', 'soft'], dur: 1.1,
  desc: 'A soft tone drifts across the stereo field and away: pitch slides down through the middle, brightness and level swell and fade like a floating object passing.',
  events: 'a capsule or cell floats across the shot; parallax slide; side-to-side camera move (o.dir left for right-to-left, o.size 0..1 for heavier and longer)',
  from: 'motion_ui catalog, dopplerPass (sources 15 Krotos whooshes, 14 Pixflow transitions)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const size = Math.min(1, Math.max(0, o.size != null ? o.size : 0.3)), dirN = o.dir === 'left' ? -1 : 1;
  const f0 = fold(H.mtof(key), 294) * pf * H.semis(0.34) * Math.pow(2, -size * 0.45);
  const T = Math.min(2.2, Math.max(0.5, o.dur || 0.9)) * (1 + size * 0.4) * H.rr(0.92, 1.08), n = Math.ceil((T + 0.05) * sr);
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1), lp = mkSvf(), th2 = Math.tanh(2), b0 = 1 / 1.3, b1 = 1 / 0.3;
  let ph = r() * TAU;
  for (let i = 0; i < n; i++) {
    const u = i / sr / T; if (u >= 1) break;
    const x = 2 * u - 1, c = -58 * Math.tanh(4 * (u - 0.5)) / th2, f = f0 * Math.pow(2, c / 1200); ph += TAU * f / sr;
    const bell = 1 / (0.3 + Math.abs(x)), bn = (bell - b0) / (b1 - b0), win = sm(u / 0.07) * sm((1 - u) / 0.07);
    lp.run(Math.sin(ph) + 0.355 * Math.sin(2 * ph) + 0.126 * Math.sin(3 * ph), 1200 + 2800 * bn, 0.707);
    const y = lp.lp * bell / b1 * win, a = (Math.max(-1, Math.min(1, 0.9 * x * dirN)) + 1) * Math.PI / 4;
    L[i] = y * Math.cos(a); R[i] = y * Math.sin(a);
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const g = H.gain(0.18 * db(H.rr(-1.5, 1.5)), out); s.connect(g); s.start(t);
});

define('easeSettle', { family: 'transition', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'matte', 'natural'], dur: 0.8,
  desc: 'An object glides in and seats itself: a soft hush whose level follows an ease-out velocity curve and slows to a stop, then a matte low seat thump.',
  events: 'card or panel slide-in with ease-out; 3D object settling on a surface (o.dur is the move length, o.pan to o.pan1 follows the slide)',
  from: 'motion_ui catalog, easeSettle (sources 14 Pixflow, 12 A Sound Effect UI guide)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12);
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const T = Math.min(0.9, Math.max(0.2, o.dur || 0.45)) * H.rr(0.94, 1.06), pe = 3 + r(), total = T + 0.32, n = Math.ceil(total * sr), nT = Math.round(T * sr);
  const svf = mkSvf(), bandF = H.rr(0.9, 1.1);
  const lay = new Float32Array(n); let lm = 0;
  for (let i = 0; i < nT; i++) { // velocity of an ease-out of power pe: v(u) = (1-u)^(pe-1)
    const u = i / nT, v = Math.pow(1 - u, pe - 1);
    svf.run(r() * 2 - 1, (500 + 400 * v) * bandF, 1.1); lay[i] = svf.bp * v * Math.min(1, i / (0.012 * sr)); lm = Math.max(lm, Math.abs(lay[i])); }
  const fb = 95 * pf * H.semis(0.34), fe = 55 * pf;
  H.buffer(out, t, total, d => {
    for (let i = 0; i < nT; i++) d[i] = lay[i] / (lm || 1) * 0.22;
    let ph = 0, lp = 0; const a = 1 - Math.exp(-TAU * 1100 / sr);
    for (let i = nT; i < n; i++) {
      const s = (i - nT) / sr, f = fe + (fb - fe) * Math.exp(-s / 0.02); ph += TAU * f / sr;
      lp += a * ((r() * 2 - 1) * Math.exp(-s / 0.0008) - lp);
      d[i] += sm(s / 0.006) * Math.exp(-s / 0.03) * (Math.sin(ph) + 0.6 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph)) + 0.1 * lp;
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, pan1: o.pan1 != null ? o.pan1 : null });
});

define('lensRack', { family: 'transition', styles: ['3dlight'], tags: ['tonal', 'soft', 'clinical', 'premium'], dur: 1.0,
  desc: 'Two close tones beat slowly, then lock into one clean note with a small bump: the sound of coming into focus.',
  events: 'blur to sharp; zoom lands on a cell; highlight settles on a target (o.dir out for the defocus mirror, tones drifting apart)',
  from: 'motion_ui catalog, lensRack (sources 12 A Sound Effect UI guide, 10 Soundcy)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const focus = o.dir !== 'out', F = fold(H.mtof(key), 262) * pf * H.semis(0.34), del0 = H.rr(0.015, 0.03), TL = 0.45 * H.rr(0.94, 1.06);
  const total = focus ? TL + 0.5 : TL + 0.28, n = Math.ceil(total * sr), iL = Math.round(TL * sr);
  let del = del0;
  const mBd = (d, s) => Math.pow(1 + d, focus ? 1 - Math.min(1, s / TL) : Math.min(1, s / TL));
  const cycles = d => { let c = 0; for (let i = 0; i < iL; i++) c += F * (mBd(d, i / sr) - 1) / sr; return c; };
  for (let k = 0; k < 3; k++) { const c = cycles(del); del *= Math.max(2, Math.round(c)) / c; }
  const mB = s => mBd(del, s);
  // phase of B so that, when the tones meet (end of the glide when focusing, start when defocusing), they are in phase
  let sumB = 0; for (let i = 0; i < iL; i++) sumB += TAU * F * mB(i / sr) / sr;
  const phA0 = r() * TAU, phB0 = focus ? phA0 + TAU * F * iL / sr - sumB : phA0;
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  let pa = phA0, pb = phB0;
  for (let i = 0; i < n; i++) {
    const s = i / sr, u = Math.min(1, s / TL), sp = 0.15 * (focus ? 1 - u : u);
    pa += TAU * F / sr; pb += TAU * F * mB(s) / sr;
    let env;
    if (focus) { const e = s - TL; env = e < 0 ? sm(s / 0.08) * (1 + 0.26 * sm((s - (TL - 0.03)) / 0.03)) : (1 + 0.26 * Math.exp(-e / 0.04)) * Math.exp(-e / 0.085); }
    else env = sm(s / 0.025) * (1 + 0.26 * Math.exp(-s / 0.04)) * Math.exp(-s / 0.22);
    env *= sm((total - s) / 0.04);
    const A = Math.sin(pa) + 0.2 * Math.sin(2 * pa), B = Math.sin(pb) + 0.2 * Math.sin(2 * pb);
    const aA = (-sp + 1) * Math.PI / 4, aB = (sp + 1) * Math.PI / 4;
    L[i] = 0.5 * env * (A * Math.cos(aA) + B * Math.cos(aB)); R[i] = 0.5 * env * (A * Math.sin(aA) + B * Math.sin(aB));
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const lpf = H.filter('lowpass', 1800), g = H.gain(0.18 * db(H.rr(-1.5, 1.5)), out);
  s.connect(lpf); lpf.connect(g); s.start(t);
});

define('forkMerge', { family: 'transition', styles: ['3dlight'], tags: ['tonal', 'organic', 'soft'], dur: 0.9,
  desc: 'One soft note splits into two that glide apart in pitch and stereo, then ring out; the mirror brings two voices together into one.',
  events: 'cell division; layer separates; exploded view; pill splits (o.dir in for a stack merging)',
  from: 'motion_ui catalog, forkMerge (sources 12 A Sound Effect UI guide, 5 Sound of Apple pt 2)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const merge = o.dir === 'in', F = fold(H.mtof(key), 294) * pf * H.semis(0.34), span = H.pick([4, 3, 5, 7]);
  const upS = Math.round(span * 0.57), dnS = span - upS, G = 0.26 * H.rr(0.92, 1.08), ts = merge ? 0.03 : 0.05, tg = ts + G;
  const total = tg + 0.4, n = Math.ceil(total * sr), iG = Math.round(tg * sr);
  const sh = s => sm((s - ts) / G), fa = s => F * Math.pow(2, upS / 12 * (merge ? 1 - sh(s) : sh(s))), fb = s => F * Math.pow(2, -dnS / 12 * (merge ? 1 - sh(s) : sh(s)));
  let sumA = 0, sumB = 0; for (let i = 0; i < iG; i++) { sumA += TAU * fa(i / sr) / sr; sumB += TAU * fb(i / sr) / sr; }
  const phA0 = r() * TAU, phB0 = merge ? phA0 + sumA - sumB : phA0;
  const wave = p => 0.7 * Math.sin(p) + 0.3 * (2 / Math.PI) * Math.asin(Math.sin(p));
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  let pa = phA0, pb = phB0;
  for (let i = 0; i < n; i++) {
    const s = i / sr, e = s - tg;
    pa += TAU * fa(s) / sr; pb += TAU * fb(s) / sr;
    const g0 = sm(s / 0.015) * (e < 0 ? 1 : Math.exp(-e / 0.1)) * (merge && e >= 0 ? 1 + 0.12 * Math.exp(-e / 0.05) : 1) * sm((total - s) / 0.05);
    const sp = merge ? 0.5 * (1 - sh(s)) : 0.5 * sh(s), aA = (-sp + 1) * Math.PI / 4, aB = (sp + 1) * Math.PI / 4;
    const bA = merge ? 0.5 : 1 - 0.5 * sm((s - ts) / 0.03), bB = merge ? 0.5 : 0.5 * sm((s - ts) / 0.03);
    const A = wave(pa) * bA * g0, B = wave(pb) * bB * g0;
    L[i] = A * Math.cos(aA) + B * Math.cos(aB); R[i] = A * Math.sin(aA) + B * Math.sin(aB);
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const lpf = H.filter('lowpass', 2000), g = H.gain(0.18 * db(H.rr(-1.5, 1.5)), out);
  s.connect(lpf); lpf.connect(g); s.start(t);
});

define('accelPulses', { family: 'transition', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'playful', 'tonal'], dur: 3.4,
  desc: 'A rhythmic riser of soft sine drops that tighten from 0.6 s apart to 0.06 s while climbing a fifth, the last (longest) one landing exactly o.dur after t.',
  events: 'build-up before a headline; loading that completes; counter about to land (follow with haloHit or silence)',
  from: 'motion_ui catalog, accelPulses (source 17 IRPR riser glossary)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const T = Math.min(4, Math.max(1.4, o.dur || 2.8)) * H.rr(0.97, 1.03), f0 = fold(H.mtof(key), 262) * pf * H.semis(0.34), ATT = 0.025;
  // solve the interval ratio so the pulse train spans exactly T and the intervals shrink 10x
  const Ts = T - ATT, nI = Math.max(5, Math.round(1 + Math.log(0.1) / Math.log(Math.max(0.3, 1 - 0.54 / Ts)))), rr = Math.pow(0.1, 1 / (nI - 1)), ioi0 = Ts * (1 - rr) / (1 - Math.pow(rr, nI));
  const deg = [0, 2, 4, 5, 7], total = T + 0.45, n = Math.ceil(total * sr), grid = [ATT];
  for (let k = 0; k < nI; k++) grid.push(grid[k] + ioi0 * Math.pow(rr, k));
  H.buffer(out, t, total, d => {
    for (let k = 0; k <= nI; k++) {
      const last = k === nI, f = f0 * Math.pow(2, deg[Math.round(4 * k / nI)] / 12), a = Math.pow(10, (-14 + 14 * k / nI) / 20) * (last ? 1.1 : 1), tau = last ? 0.075 : 0.03;
      const i0 = Math.round((grid[k] - ATT) * sr), len = Math.round((ATT + tau * 7) * sr); let ph = 0;
      for (let i = 0; i < len && i0 + i < n; i++) {
        const s = i / sr, fr = f * (1 + 0.035 * Math.exp(-s / 0.03)); ph += TAU * fr / sr;
        const env = s < ATT ? Math.pow(Math.sin(Math.PI / 2 * s / ATT), 2) : Math.exp(-(s - ATT) / tau);
        d[i0 + i] += a * env * (Math.sin(ph) + 0.1 * Math.sin(2 * ph));
      }
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 3200 }] });
});

// ---------------------------------------------------------------------------------------------- impacts
define('subSigh', { family: 'impact', styles: ['3dlight'], tags: ['sub', 'soft', 'dark', 'premium'], dur: 1.6,
  desc: 'A round, slow low exhale: a sine that sinks an octave and blooms and fades with no click, with just enough harmonics to be heard on a laptop.',
  events: 'title reveal; new chapter; a large object arrives',
  from: 'motion_ui catalog, subSigh (sources 32 Tone.js MembraneSynth, 18 Ableton, 29 sonic logo guide)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const fe = fold(H.mtof(key), 44) * pf * H.semis(0.34), fs = 2 * fe, total = 1.75, n = Math.ceil(total * sr), tau = 0.23 * H.rr(0.92, 1.08), sh = Math.tanh(1.5);
  H.buffer(out, t, total, d => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr, f = fs * Math.pow(fe / fs, Math.min(1, s / 0.38)); ph += TAU * f / sr;
      const env = sm(s / 0.025) * Math.exp(-s / tau) * sm((total - s) / 0.2), sub = Math.sin(ph);
      d[i] = env * (sub + 0.3 * Math.tanh(1.5 * sub) / sh) + 0.3 * Math.sin(2 * ph) * sm(s / 0.025) * Math.exp(-s / 0.09);
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'highpass', f: 28 }] });
});

define('haloHit', { family: 'impact', styles: ['3dlight'], tags: ['soft', 'premium', 'airy', 'sub'], dur: 1.6,
  desc: 'A matte low thud with a halo of five slightly detuned high sines that beat slowly in the air above it; shimmer without bells or mallets.',
  events: 'headline lands; hero object arrives; key stat reveal',
  from: 'motion_ui catalog, haloHit (sources 18 Ableton, 14 Pixflow, 5 Sound of Apple pt 2)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const fh = fold(H.mtof(key), 1480) * pf * H.semis(0.34), total = 2.4, n = Math.ceil(total * sr), tf = 62 * pf * H.semis(0.34);
  const off = [-0.012, -0.0045, 0, 0.0055, 0.013], hf = off.map(x => fh * (1 + x * H.rr(0.85, 1.15))), hph = off.map(() => r() * TAU);
  const prate = off.map(() => H.rr(0.15, 0.35)), pph = off.map(() => r() * TAU), svf = mkSvf(), cf = 700 * H.rr(0.9, 1.1);
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  let pt = 0; const pc = new Float64Array(5), ps = new Float64Array(5);
  for (let i = 0; i < n; i++) {
    const s = i / sr, f = tf + (120 * pf - tf) * Math.exp(-s / 0.05); pt += TAU * f / sr;
    let y = sm(s / 0.008) * Math.exp(-s / 0.09) * (Math.sin(pt) + 0.3 * Math.sin(2 * pt) + 0.1 * Math.sin(3 * pt));
    svf.run((r() * 2 - 1) * (s < 0.012 ? 1 - s / 0.012 : 0), cf, 0.8); y += svf.bp * 0.12;
    let hl = 0, hr = 0; const he = sm(s / 0.12) * Math.exp(-s / 0.45) * sm((total - s) / 0.4);
    if (i % 32 === 0) for (let k = 0; k < 5; k++) { const a = (0.6 * Math.sin(TAU * prate[k] * s + pph[k]) * (0.4 + 0.15 * k) + 1) * Math.PI / 4; pc[k] = Math.cos(a); ps[k] = Math.sin(a); }
    for (let k = 0; k < 5; k++) { const v = 0.028 * he * Math.sin(hph[k] + TAU * hf[k] * s); hl += v * pc[k]; hr += v * ps[k]; }
    L[i] = y * 0.7071 + hl; R[i] = y * 0.7071 + hr;
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const lv = H.gain(0.18 * db(H.rr(-1.5, 1.5)), out);
  s.connect(lv); lv.connect(H.verb(out, { sec: 1.2, decay: 3, wet: 0.3, lp: 5000 })); s.start(t);
});

define('softBoom', { family: 'impact', styles: ['3dlight'], tags: ['sub', 'dark', 'soft'], dur: 1.9,
  desc: 'A large, dark, rounded boom: a slow sinking sub body, a muffled thump and a faint veil of high air, all swallowed by a long hushed room tail.',
  events: 'chapter title; product name reveal; end of a big beat',
  from: 'motion_ui catalog, softBoom (sources 18 Ableton high-impact sounds, 15 Krotos)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const fe = fold(H.mtof(key), 36) * pf * H.semis(0.34), fs = fe * 1.75, total = 1.9, n = Math.ceil(total * sr);
  const air = [3170, 3730, 4290, 4860].map(f => f * H.rr(0.96, 1.04)), aph = air.map(() => r() * TAU), atau = air.map(() => H.rr(0.3, 0.45));
  const g = H.buffer(out, t, total, d => {
    let ph = 0, lp1 = 0, lp2 = 0; const a = 1 - Math.exp(-TAU * 600 / sr);
    for (let i = 0; i < n; i++) {
      const s = i / sr, f = fe + (fs - fe) * Math.exp(-s / 0.09); ph += TAU * f / sr;
      const att = sm(s / 0.025), end = sm((total - s) / 0.25);
      let y = att * Math.exp(-s / 0.28) * (Math.sin(ph) + 0.25 * Math.sin(2 * ph) + 0.08 * Math.sin(3 * ph));
      lp1 += a * ((r() * 2 - 1) * Math.exp(-s / 0.025) * (s < 0.08 ? 1 : 0) - lp1); lp2 += a * (lp1 - lp2); y += 1.4 * lp2;
      let hs = 0; for (let k = 0; k < 4; k++) hs += Math.sin(aph[k] + TAU * air[k] * s) * Math.exp(-s / atau[k]);
      y += 0.03 * hs * sm(s / 0.02);
      d[i] = y * end;
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'highpass', f: 24 }] });
  const hp = H.filter('highpass', 150); g.connect(hp); hp.connect(H.verb(out, { sec: 2.2, decay: 3, wet: 0.5, lp: 3500 }));
});

// ---------------------------------------------------------------------------------------------- interface
define('siliconeTap', { family: 'ui', styles: ['3dlight'], tags: ['soft', 'warm', 'premium', 'tonal'], dur: 0.2,
  desc: 'A soft-touch key press: a low rounded pitched body with a barely-there contact, matte and never ticky or glassy; o.size 0 (tiny sphere) to 1 (big cell) lowers the pitch and lengthens the body.',
  events: 'label appears; icon selected; step marker; button press; a sphere or cell is touched (o.size scales with the object)',
  from: 'motion_ui catalog, siliconeTap (sources 9 Morphic, 11 userinterface-wiki, 13 Brewster earcons)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const size = Math.min(1, Math.max(0, o.size != null ? o.size : 0.5));
  const f = fold(H.mtof(key), 196) * pf * H.semis(0.34) * Math.pow(2, (0.5 - size) * 1.6);
  const tau = 0.015 * Math.pow(2, (size - 0.5) * 2) * H.rr(0.92, 1.08), len = tau * 9 + 0.025, n = Math.ceil(len * sr);
  const cf = 2400 * H.rr(0.85, 1.15) * Math.pow(2, (0.5 - size) * 0.4), svf = mkSvf();
  H.buffer(out, t, len, d => {
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr, fr = f * (1 + 0.06 * Math.exp(-s / 0.008)); ph += TAU * fr / sr;
      let y = Math.min(1, s / 0.001) * Math.exp(-s / tau) * (Math.sin(ph) + 0.28 * Math.sin(2 * ph) * Math.exp(-s / (tau * 0.5)) + 0.08 * Math.sin(3 * ph) * Math.exp(-s / (tau * 0.35)));
      svf.run((r() * 2 - 1) * Math.exp(-s / 0.001), cf, 1.5); y += svf.bp * 0.23;
      d[i] = y;
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 3500 }] });
});

define('toggleStep', { family: 'ui', styles: ['3dlight'], tags: ['soft', 'crisp', 'playful'], dur: 0.2,
  desc: 'Two soft taps a whole tone apart: stepping up means on, stepping down (a little lower and quieter) means off.',
  events: 'switch flips; option enabled; layer toggled (o.dir down for off)',
  from: 'motion_ui catalog, toggleStep (sources 9 Morphic, 10 Soundcy)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const on = o.dir !== 'down', f1 = fold(H.mtof(key), 330) * pf * H.semis(0.34) * (on ? 1 : 0.92), f2 = f1 * Math.pow(2, 2 / 12);
  const gap = 0.045 * H.rr(0.94, 1.06), len = gap + 0.1, n = Math.ceil(len * sr), taps = on ? [[0, f1, 0.8], [gap, f2, 1]] : [[0, f2, 0.8], [gap, f1, 1]];
  const svf = mkSvf(), tau = 0.009;
  H.buffer(out, t, len, d => {
    for (const [t0, f, a] of taps) {
      const i0 = Math.round(t0 * sr); let ph = 0; const cf = 2400 * H.rr(0.85, 1.15);
      for (let i = 0; i + i0 < n; i++) {
        const s = i / sr, fr = f * (1 + 0.05 * Math.exp(-s / 0.006)); ph += TAU * fr / sr;
        let y = Math.min(1, s / 0.001) * Math.exp(-s / tau) * (Math.sin(ph) + 0.3 * Math.sin(2 * ph) * Math.exp(-s / 0.005));
        svf.run((r() * 2 - 1) * Math.exp(-s / 0.001), cf, 1.5); y += svf.bp * 0.2 * Math.exp(-s / 0.002);
        d[i0 + i] += a * y;
      }
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5) - (on ? 0 : 3)), pan: (o.pan || 0) + (on ? 0.1 : -0.1), filters: [{ type: 'lowpass', f: 3500 }] });
});

define('confirmPair', { family: 'ui', styles: ['3dlight', 'doodle-draw'], tags: ['bright', 'tonal', 'premium'], dur: 0.5,
  desc: 'Two short rising notes, root then fifth, 80 ms apart: a quick accented first note and a longer, brighter last note with a small tail.',
  events: 'check mark drawn; step complete; a yes or confirmation',
  from: 'motion_ui catalog, confirmPair (sources 9 Morphic, 11 userinterface-wiki, 13 Brewster, 5 Sound of Apple pt 2)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const f1 = fold(H.mtof(key), 330) * pf * H.semis(0.34), gap = 0.08 * H.rr(0.94, 1.06), len = gap + 0.3, n = Math.ceil(len * sr);
  const notes = [[0, f1, 1, 0.06, 0.02, 0.2], [gap, f1 * 1.5 * H.semis(0.2), 0.85, 0.22, 0.07, 0.32]];
  const g = H.buffer(out, t, len, d => {
    for (const [t0, f, a, dl, tau, h2] of notes) {
      const i0 = Math.round(t0 * sr), w = TAU * f / sr, ph0 = r() * 0.5; const m = Math.round((dl + 0.1) * sr);
      for (let i = 0; i < m && i0 + i < n; i++) {
        const s = i / sr, e = sm(s / 0.005) * Math.exp(-s / tau) * sm((dl + 0.08 - s) / 0.08);
        d[i0 + i] += a * e * ((2 / Math.PI) * Math.asin(Math.sin(w * i + ph0)) * 0.9 + h2 * Math.sin(2 * w * i));
      }
    }
  }, { level: 0.2 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 3000 }] });
  g.connect(H.verb(out, { sec: 0.35, decay: 3, wet: 0.3, lp: 3000 }));
});

define('attentionDyad', { family: 'ui', styles: ['3dlight'], tags: ['clinical', 'dark', 'soft'], dur: 0.65,
  desc: 'Two pure tones a minor ninth apart that sag a little in pitch and fade: a dull, unharsh look-here signal.',
  events: 'pathology appears; problem state; warning label (use sparingly)',
  from: 'motion_ui catalog, attentionDyad (sources 6 Microsoft minor-ninth error tone, 9 Morphic)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const f1 = fold(H.mtof(key), 330) * pf * H.semis(0.34), f2 = f1 * Math.pow(2, 13 / 12), total = 0.62, n = Math.ceil(total * sr);
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1), tau = 0.1 * H.rr(0.92, 1.08);
  let p1 = r() * TAU, p2 = r() * TAU;
  for (let i = 0; i < n; i++) {
    const s = i / sr, c = Math.pow(2, -30 / 1200 * Math.min(1, s / 0.3));
    p1 += TAU * f1 * c / sr; p2 += TAU * f2 * c / sr;
    const e = sm(s / 0.015) * Math.exp(-s / tau) * sm((total - s) / 0.15), A = Math.sin(p1) * e, B = 0.85 * Math.sin(p2) * e;
    L[i] = A * 0.78 + B * 0.62; R[i] = A * 0.62 + B * 0.78;
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const lpf = H.filter('lowpass', 1800), g = H.gain(0.14 * db(H.rr(-1.5, 1.5)), out);
  s.connect(lpf); lpf.connect(g); s.start(t);
});

define('hoverBreath', { family: 'ui', styles: ['3dlight'], tags: ['airy', 'soft', 'clinical'], dur: 0.15,
  desc: 'A near-silent puff of air with a tiny high sine grain inside it, when a pointer or highlight arrives; pan it to the target.',
  events: 'callout line reaches its label; focus ring appears; a highlight lands on a part (o.pan = the target\'s screen x)',
  from: 'motion_ui catalog, hoverBreath (sources 7 Quietmark, 10 Soundcy)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12);
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const T = H.rr(0.06, 0.08), cf = H.rr(2000, 3500) * pf, gf = 1200 * pf * H.semis(0.34), len = T + 0.03, n = Math.ceil(len * sr), svf = mkSvf(), gc = T * 0.4, gl = 0.02, gph = r() * TAU;
  H.buffer(out, t, len, d => {
    const nz = new Float32Array(n); let m = 0;
    for (let i = 0; i < n; i++) { const u = i / sr / T; if (u >= 1) break; svf.run(r() * 2 - 1, cf, 1.2); const w = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 2); nz[i] = svf.bp * w; m = Math.max(m, Math.abs(nz[i])); }
    for (let i = 0; i < n; i++) {
      const s = i / sr, gu = (s - (gc - gl / 2)) / gl; let y = nz[i] / (m || 1);
      if (gu > 0 && gu < 1) y += 0.63 * Math.pow(Math.sin(Math.PI * gu), 2) * Math.sin(gph + TAU * gf * s);
      d[i] = y;
    }
  }, { level: 0.23 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 6000 }] });
});

define('softLatch', { family: 'ui', styles: ['3dlight'], tags: ['precise', 'premium', 'matte', 'clinical'], dur: 0.2,
  desc: 'A two-stage matte latch: a low soft k, a beat of silence, then a tight upper click with a small body knock and a short tail, like a premium lid closing.',
  events: 'capsule closes; part docks onto a sphere; segment locks (pairs with airOpen)',
  from: 'motion_ui catalog, softLatch (sources 5 Sound of Apple pt 2, 12 A Sound Effect UI guide)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12);
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const f1 = 140 * pf * H.semis(0.34), gap = 0.02 * H.rr(0.9, 1.1), t2 = 0.025 + gap, len = t2 + 0.16, n = Math.ceil(len * sr);
  const fa = 1800 * pf * H.semis(0.34), fb = 2900 * pf * H.semis(0.34), fk = 620 * pf * H.semis(0.3), la = 0.015 / 6.9, lb = 0.011 / 6.9;
  const g = H.buffer(out, t, len, d => {
    let lp = 0; const a = 1 - Math.exp(-TAU * 1200 / sr);
    for (let i = 0; i < n; i++) {
      const s = i / sr; let y = 0;
      if (s < 0.05) { lp += a * ((r() * 2 - 1) * Math.exp(-s / 0.0012) - lp); y += 0.8 * Math.min(1, s / 0.0015) * Math.exp(-s / 0.007) * Math.sin(TAU * f1 * s) * sm((0.045 - s) / 0.02) + 0.18 * lp; }
      const s2 = s - t2;
      if (s2 >= 0) {
        const at = Math.min(1, s2 / 0.0003);
        y += at * (Math.exp(-s2 / la) * Math.sin(TAU * fa * s2) + 0.32 * Math.exp(-s2 / lb) * Math.sin(TAU * fb * s2));
        y += 0.25 * Math.min(1, s2 / 0.001) * Math.exp(-s2 / 0.012) * Math.sin(TAU * fk * s2);
      }
      d[i] = y;
    }
  }, { level: 0.25 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 4200 }] });
  g.connect(H.verb(out, { sec: 0.14, decay: 3, wet: 0.35, lp: 3500 }));
});

define('airOpen', { family: 'ui', styles: ['3dlight'], tags: ['airy', 'soft', 'clinical'], dur: 0.4,
  desc: 'A soft airy lift: a band of air opens upward while a faint sine edges up a fourth, then settles; no click.',
  events: 'shell or membrane opens; layers separate; panel expands (o.dir down for the closing exhale; pairs with softLatch)',
  from: 'motion_ui catalog, airOpen (sources 5 Sound of Apple pt 2, 9 Morphic, 12 A Sound Effect UI guide)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const mkSvf = () => { const s = { s1: 0, s2: 0, bp: 0, lp: 0, run(x, f, q) { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - s.s2, v1 = a1 * s.s1 + a2 * v3, v2 = s.s2 + a2 * s.s1 + a3 * v3; s.s1 = 2 * v1 - s.s1; s.s2 = 2 * v2 - s.s2; s.bp = k * v1; s.lp = v2; } }; return s; };
  const open = o.dir !== 'down', fa = fold(H.mtof(key), 262) * pf * H.semis(0.34), fb = fa * Math.pow(2, 5 / 12);
  const nT = 0.12 * H.rr(0.92, 1.08), gT = 0.15 * H.rr(0.92, 1.08), B = 0.22, total = 0.5, n = Math.ceil(total * sr), svf = mkSvf();
  const lay = new Float32Array(n); let m = 0;
  for (let i = 0; i < n; i++) { const s = i / sr; if (s >= B) break; const u = s / nT, e = Math.min(1, u), c = 1000 * Math.pow(3, open ? e : 1 - e), w = Math.pow(Math.sin(Math.PI * Math.pow(s / B, 0.85)), 2);
    svf.run(r() * 2 - 1, c, 1); lay[i] = svf.bp * w; m = Math.max(m, Math.abs(lay[i])); }
  H.buffer(out, t, total, d => {
    let ph = r() * TAU;
    for (let i = 0; i < n; i++) {
      const s = i / sr, e = Math.min(1, s / gT), f = open ? fa * Math.pow(fb / fa, e) : fb * Math.pow(fa / fb, e); ph += TAU * f / sr;
      const bell = s < B ? Math.pow(Math.sin(Math.PI * Math.pow(s / B, 0.85)), 2) : 0;
      d[i] = lay[i] / (m || 1) + 0.45 * bell * Math.sin(ph) + (s >= B * 0.8 ? 0.03 * sm((s - B * 0.8) / 0.05) * Math.exp(-(s - B * 0.8) / 0.07) * Math.sin(ph) : 0);
    }
  }, { level: 0.19 * db(H.rr(-1.5, 1.5)), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 5500 }] });
});

define('handoffPair', { family: 'ui', styles: ['3dlight', 'doodle-draw'], tags: ['crisp', 'soft', 'tonal'], dur: 1.0,
  desc: 'A crisp assertive blip leaves one side, and after the travel time a lower, softer, rounder blip arrives on the other; sent is bright, received is gentle.',
  events: 'data or an object travels from card A to card B (o.dur travel time, o.pan source x, o.pan1 target x)',
  from: 'motion_ui catalog, handoffPair (source 10 Soundcy: sent assertive, received softer)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, db = x => Math.pow(10, x / 20), pf = Math.pow(2, (o.pitch || 0) / 12), key = o.key != null ? o.key : 69;
  const fold = (f, lo) => { while (f >= lo * 2) f /= 2; while (f < lo) f *= 2; return f; };
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const travel = Math.min(1, Math.max(0.3, o.dur || 0.6)) * H.rr(0.94, 1.06), p0 = o.pan ? o.pan : -0.5, p1 = o.pan1 != null ? o.pan1 : -p0;
  const fd = fold(H.mtof(key), 330) * 1.5 * pf * H.semis(0.34), fa = fd * 0.75 * H.semis(0.2), total = travel + 0.45, n = Math.ceil(total * sr);
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1), pan = (p) => (Math.max(-1, Math.min(1, p)) + 1) * Math.PI / 4;
  const a0 = pan(p0), a1 = pan(p1); let lpA = 0, hpA = 0; const ka = 1 - Math.exp(-TAU * 2000 / sr), kh = Math.exp(-TAU * 3000 / sr);
  for (let i = 0; i < n; i++) {
    const s = i / sr, sa = s - travel; let dep = 0, arr = 0;
    if (s < 0.3) { const e = Math.min(1, s / 0.002) * Math.exp(-s / 0.03), nz = (r() * 2 - 1) * Math.exp(-s / 0.0012), hp = nz - hpA; hpA = hpA * kh + nz * (1 - kh); dep = e * Math.sin(TAU * fd * s) + 0.14 * hp; }
    if (sa >= 0) { const e = sm(sa / 0.012) * Math.exp(-sa / 0.055); lpA += ka * ((Math.sin(TAU * fa * sa) + 0.18 * Math.sin(2 * TAU * fa * sa)) * e - lpA); arr = 0.56 * lpA; }
    L[i] = dep * Math.cos(a0) + arr * Math.cos(a1); R[i] = dep * Math.sin(a0) + arr * Math.sin(a1);
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk > 0) for (let i = 0; i < n; i++) { L[i] /= pk; R[i] /= pk; }
  const s = ac.createBufferSource(); s.buffer = b; const g = H.gain(0.18 * db(H.rr(-1.5, 1.5)), out); s.connect(g); s.start(t);
});

// ================================================================ Motion and interface: data, text, morphs, tonal, rhythm (research/motion_ui.md)
// motion_b.js: data, text, morph, tonal and rhythm effects from the motion_ui catalog (3dlight style).
// 15 effects. Every effect is deterministic per seed and tuned to peak near -15 dBFS at g = 1.

define('scanPass', { family: 'digital', styles: ['3dlight'], tags: ['clinical', 'tonal', 'cold', 'premium'], dur: 2.2,
  desc: 'A calm, narrow band of tone glides across the frame with a soft ping-pong echo and lands on a small matte "found" tap.',
  events: 'a scan line crosses tissue; an analysis sweep runs over a sample; a microscope pass; a target is found',
  from: 'motion_ui data and digital: scanPass (source 12, A Sound Effect sci-fi UI guide)' },
(ac, out, t, o, H) => {
  const { sr, r, DSP, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const pg = p => { const a = (H.clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
  const rms = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length) || 1; };
  const svf = (x, fc, Q, mode) => { const y = new Float32Array(x.length), k = 1 / Q; let s1 = 0, s2 = 0;
    for (let i = 0; i < x.length; i++) { const g = Math.tan(Math.PI * Math.min(fc(i), sr * 0.45) / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      const v3 = x[i] - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
      y[i] = mode === 'bp' ? k * v1 : mode === 'lp' ? v2 : x[i] - k * v1 - v2; } return y; };
  const tap = (d, t0, f, a, tau, len) => { // matte key press: round body that drops 6 %, faint 2nd partial, barely-there contact
    DSP.chirp(d, sr, t0, a, f * 1.06, f, 0.025, tau, len);
    DSP.modes(d, sr, t0, [[f * 2, a * 0.18, tau * 0.6]]);
    DSP.modes(d, sr, t0, [[H.rr(2040, 2760), a * 0.09, 0.00025]], 3); };
  const emit = (L, R, level, filters) => { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    const b = ac.createBuffer(2, L.length, sr), A = b.getChannelData(0), B = b.getChannelData(1); for (let i = 0; i < L.length; i++) { A[i] = L[i] / m; B[i] = R[i] / m; }
    const s = ac.createBufferSource(); s.buffer = b; let node = s; for (const [ty, f, q] of filters || []) { const fl = H.filter(ty, f, q); node.connect(fl); node = fl; }
    node.connect(H.gain(level, out)); s.start(t); };

  const T = H.clamp(o.dur ?? 1.2, 0.4, 8), up = o.dir !== 'down';
  const f0 = 500 * tr * H.rr(0.95, 1.06), f1 = 2200 * tr * H.rr(0.95, 1.06);
  const nS = Math.ceil(T * sr), tapAt = T + 0.07, N = Math.ceil((tapAt + 0.12 + 0.8) * sr);
  const fc = i => { const u = i / nS, e = u * u * (3 - 2 * u); return f0 * Math.pow(f1 / f0, up ? e : 1 - e); };
  const wn = new Float32Array(nS); for (let i = 0; i < nS; i++) wn[i] = r() * 2 - 1;
  const nz = svf(svf(wn, fc, 9, 'bp'), fc, 9, 'bp');                                                   // two bandpasses in series: a narrow band with steep skirts
  for (let i = 0; i < nS; i++) nz[i] *= Math.sqrt(f0 / fc(i));                                           // keep the level even as the band rises
  const kz = 0.25 / rms(nz), lfo = r() * TAU, dL = new Float32Array(N), dR = new Float32Array(N);
  let ph = r() * TAU;
  for (let i = 0; i < nS; i++) {
    const s = i / sr, u = i / nS, e0 = Math.min(1, s / 0.08, (T - s) / 0.08), env = e0 * e0 * (3 - 2 * e0);
    ph += TAU * fc(i) / sr;
    const trem = 1 - 0.25 * (0.5 - 0.5 * Math.cos(TAU * 7 * s + lfo));
    const v = (nz[i] * kz + 0.112 * Math.sin(ph)) * env * trem, [gl, gr] = pg((up ? 1 : -1) * (-0.75 + 1.5 * u) + (o.pan || 0));
    dL[i] += v * gl; dR[i] += v * gr;
  }
  // the "found" tap: the key's fifth, panned where the scan ended
  const tp = new Float32Array(Math.ceil(0.14 * sr)); tap(tp, 0, fold(H.mtof(o.key ?? 69) * 1.5 * tr, 400) * H.semis(0.1), 1.05, 0.02, 0.13);
  const [tl, trr] = pg((up ? 0.75 : -0.75) + (o.pan || 0)), i0 = Math.round(tapAt * sr);
  for (let i = 0; i < tp.length && i0 + i < N; i++) { dL[i0 + i] += tp[i] * tl; dR[i0 + i] += tp[i] * trr; }
  // ping-pong echo: 140 ms, feedback 0.3, darker on every pass (lowpass 2 kHz)
  const D = Math.round(0.14 * sr), a = 1 - Math.exp(-TAU * 2000 / sr), wL = new Float32Array(N), wR = new Float32Array(N); let yl = 0, yr = 0;
  for (let i = D; i < N; i++) { yl += a * (0.5 * dR[i - D] + 0.3 * wR[i - D] - yl); yr += a * (0.5 * dL[i - D] + 0.3 * wL[i - D] - yr); wL[i] = yl; wR[i] = yr; }
  for (let i = 0; i < N; i++) { dL[i] += wL[i]; dR[i] += wR[i]; }
  emit(dL, dR, 0.18 * lvl, [['lowpass', 5000, 0.6]]);
});

define('densityPulse', { family: 'digital', styles: ['3dlight'], tags: ['soft', 'clinical', 'playful'], dur: 3.1,
  desc: 'A shower of soft, damped pings at irregular intervals whose rate climbs from sparse to dense, so the count reads as an amount.',
  events: 'a concentration rises; a dose-response curve fills in; particles are counted; a population grows',
  from: 'motion_ui data and digital: densityPulse (sources 12, 22); options value or v0/v1, cat' },
(ac, out, t, o, H) => {
  const { sr, r, DSP } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const pg = p => { const a = (H.clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
  const emit = (L, R, level, filters) => { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    const b = ac.createBuffer(2, L.length, sr), A = b.getChannelData(0), B = b.getChannelData(1); for (let i = 0; i < L.length; i++) { A[i] = L[i] / m; B[i] = R[i] / m; }
    const s = ac.createBufferSource(); s.buffer = b; let node = s; for (const [ty, f, q] of filters || []) { const fl = H.filter(ty, f, q); node.connect(fl); node = fl; }
    node.connect(H.gain(level, out)); s.start(t); };

  const T = H.clamp(o.dur ?? 3, 0.5, 20), N = Math.ceil((T + 0.12) * sr), L = new Float32Array(N), R = new Float32Array(N);
  const v0 = o.value ?? o.v0 ?? 0.05, v1 = o.value ?? o.v1 ?? 1;                     // value 0..1 sets the rate: 2 -> 28 per second
  const cluster = [0, 2, 4, 7], base = fold(H.mtof(o.key ?? 69) * tr, 800) * Math.pow(2, 7 * (o.cat | 0) / 12);           // category = pitch band, a fifth apart
  let tt = 0.02 + 0.05 * r();
  while (tt < T) {
    const rate = 2 + 26 * H.clamp(v0 + (v1 - v0) * tt / T, 0, 1);
    const f = base * Math.pow(2, H.pick(cluster) / 12) * H.rr(0.985, 1.015), amp = H.rr(0.5, 1), [gl, gr] = pg(H.clamp((o.pan || 0) + H.rr(-0.6, 0.6), -1, 1));
    const e = new Float32Array(Math.ceil(0.05 * sr)); DSP.chirp(e, sr, 0, 1, f * 1.05, f, 0.008, 0.0045, 0.045); DSP.modes(e, sr, 0, [[f * 0.5, 0.4, 0.007]]);
    const i0 = Math.round(tt * sr); for (let i = 0; i < e.length && i0 + i < N; i++) { L[i0 + i] += e[i] * amp * gl; R[i0 + i] += e[i] * amp * gr; }
    tt += -Math.log(1 - r()) / rate;
  }
  emit(L, R, 0.18 * lvl, [['lowpass', 5000, 0.6]]);
});

define('oximeterBeep', { family: 'digital', styles: ['3dlight'], tags: ['clinical', 'tonal', 'bright'], dur: 3.0,
  desc: 'A clean, soft monitor beep at a resting heart rate whose pitch steps through three bands (high, middle, low) as a value falls.',
  events: 'a vital sign appears; a biomarker level is read out; dose bands normal, borderline and low; a value drops',
  from: 'motion_ui data and digital: oximeterBeep (sources 27, 28); options value (0..1), to, hr or bpm' },
(ac, out, t, o, H) => {
  const { sr, r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const T = H.clamp(o.dur ?? 3, 0.3, 30), P = o.hr ? 60 / o.hr : 1.5 * 60 / (o.bpm ?? 106.7);  // 1.5 beats of the film = about 71 bpm
  const v0 = o.value ?? 1, v1 = o.to ?? v0;
  const root = fold(H.mtof(o.key ?? 69) * tr, 587) * H.semis(0.12), bands = [root, root * Math.pow(2, -3 / 12), root * Math.pow(2, -7 / 12)]; // high, mid, low
  H.buffer(out, t, T + 0.15, d => {
    const nb = Math.max(1, Math.floor((T - 0.1) / P) + 1);
    for (let k = 0; k < nb; k++) {
      const tk = Math.max(0, k * P + H.rr(-0.008, 0.008)), v = H.clamp(v0 + (v1 - v0) * (nb > 1 ? k / (nb - 1) : 0), 0, 1);
      const f = bands[v >= 0.66 ? 0 : v >= 0.33 ? 1 : 2] * H.semis(0.04), amp = H.rr(0.9, 1.05);
      const lpa = 1 - Math.exp(-TAU * (1500 + 4500 * v) / sr), tdepth = 0.2 * H.clamp((0.5 - v) / 0.5, 0, 1), h2 = 0.316 * (0.45 + 0.55 * v);
      const i0 = Math.round(tk * sr), n = Math.ceil(0.1 * sr); let y = 0;
      for (let i = 0; i < n && i0 + i < d.length; i++) {
        const s = i / sr, a = s < 0.004 ? Math.sin(Math.PI / 2 * s / 0.004) : Math.exp(-(s - 0.004) / 0.027), tp = Math.min(1, (n - 1 - i) / (0.012 * sr));
        const trem = 1 - tdepth * (0.5 - 0.5 * Math.cos(TAU * 12 * s));
        const x = (Math.sin(TAU * f * s) + h2 * Math.sin(TAU * 2 * f * s)) * a * tp * trem * amp;
        y += lpa * (x - y); d[i0 + i] += y;
      }
    }
  }, { level: 0.25 * lvl, pan: o.pan || 0 });
});

define('denoiseResolve', { family: 'digital', styles: ['3dlight'], tags: ['digital', 'clean', 'premium'], dur: 1.0,
  desc: 'A crushed, stuttering fragment of a tone gradually sharpens and clears into a clean, pure two-partial note that rings out.',
  events: 'noisy data is cleaned; an image sharpens; a signal separates from the background; a denoise step finishes',
  from: 'motion_ui data and digital: denoiseResolve (sources 26, 12)' },
(ac, out, t, o, H) => {
  const { sr, r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const f = fold(H.mtof(o.key ?? 69) * tr, 330) * H.semis(0.1);
  const Tc = 0.42, hold = 0.2, rel = 0.33, total = Tc + hold + rel, sliceN = Math.round(0.03 * sr), stutN = sliceN * 4;   // 4 repeats of a 30 ms slice = 120 ms
  H.buffer(out, t, total + 0.05, d => {
    const n = d.length, y = new Float32Array(n), sc = sr / 48000; let hp = 1, held = 0, nz = 0, p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr, x = Math.min(1, s / Tc), at = Math.min(1, s / 0.008), rl = s > Tc + hold ? Math.exp(-(s - Tc - hold) / 0.11) : 1;
      const env = at * at * (3 - 2 * at) * rl * (1 + 0.18 * Math.exp(-Math.pow((s - Tc) / 0.05, 2)));   // small bump as it locks
      p1 += TAU * f / sr; p2 += TAU * 2 * f / sr;
      const c = (Math.sin(p1) + 0.251 * Math.sin(p2)) * env / 1.3;
      const N = Math.max(1, 24 * sc * Math.pow(1 / (24 * sc), x));                                // sample-and-hold length 24 -> 1
      hp += 1 / N; if (hp >= 1) { hp -= 1; held = c; }
      const Lq = Math.pow(2, 3 + 13 * x - 1), q = Math.round(held * Lq) / Lq;                     // bit depth 3 -> 16
      nz += 0.45 * ((r() * 2 - 1) - nz);
      y[i] = q + 0.5 * (1 - x) * nz * 0.9 * at;
    }
    const fn = Math.round(0.0012 * sr), xf = Math.round(0.003 * sr);                             // the first 120 ms: one slice repeated 4 times
    for (let i = stutN - 1; i >= 0; i--) { const j = i % sliceN, w = Math.min(1, j / fn, (sliceN - 1 - j) / fn), m = i > stutN - xf ? (stutN - i) / xf : 1; d[i] = y[j] * w * m + y[i] * (1 - m); }
    for (let i = stutN; i < n; i++) d[i] = y[i];
  }, { level: 0.25 * lvl, pan: o.pan || 0, fade: 0.01, filters: [{ type: 'lowpass', f: 2600, f1: 7000, q: 0.6 }] });   // the lowpass opens as the signal clears
});

define('processingPulse', { family: 'digital', styles: ['3dlight'], tags: ['soft', 'dark', 'clinical'], dur: 5.4,
  desc: 'A slow low pulse, one every two beats like quiet breathing, with a fifth and a longer swell on every fourth pulse, ending on a soft settle chord.',
  events: 'a progress ring fills; analysing; waiting on a pipeline; staged work completes',
  from: 'motion_ui data and digital: processingPulse (sources 9, 10); options steps (3 = short-short-long), bpm' },
(ac, out, t, o, H) => {
  const { sr, r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const P = 120 / (o.bpm ?? 106.7), dur = H.clamp(o.dur ?? 5.4, 1.5, 60), steps = (o.steps | 0) > 0;
  const f = fold(H.mtof(o.key ?? 69) * tr, 98) * H.semis(0.1), n = Math.max(1, Math.round((dur - 0.8) / P)), total = n * P + 0.8;
  const pulse = (d, ts, fq, att, dec, amp, fifth, rise = 0.12) => {
    const i0 = Math.max(0, Math.round(ts * sr)), len = Math.min(d.length - i0, Math.ceil((att + dec * 1.3) * sr)), tau = dec / 3; let ph = 0, p5 = 0;
    for (let i = 0; i < len; i++) {
      const s = i / sr, g = s < att ? 0.5 - 0.5 * Math.cos(Math.PI * s / att) : Math.exp(-(s - att) / tau), tp = Math.min(1, (len - 1 - i) / (0.02 * sr));
      const u = Math.min(1, s / 0.06), fr = fq * (1 - rise * (1 - u * u * (3 - 2 * u)));   // pitch rises 12 % over 60 ms
      ph += TAU * fr / sr; let v = Math.sin(ph) + 0.45 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph);
      if (fifth) { p5 += TAU * fr * 1.5 / sr; v += 0.55 * Math.sin(p5) + 0.17 * Math.sin(2 * p5); }
      d[i0 + i] += amp * g * tp * v;
    }
  };
  H.buffer(out, t, total + 0.1, d => {
    for (let k = 0; k < n; k++) {
      const tk = k * P + H.rr(-0.006, 0.006);
      if (steps) { const fs = f * 2, off = [0, 0.2, 0.4], sm = [0, 2, 5], ln = [0.08, 0.08, 0.2];            // short-short-long, root +2 +5 semitones, an octave up
        for (let j = 0; j < 3; j++) pulse(d, tk + off[j] + H.rr(-0.004, 0.004), fs * Math.pow(2, sm[j] / 12), 0.012, ln[j], 0.9, false, 0.03); }
      else { const four = k % 4 === 3; pulse(d, tk, f, 0.04, four ? 0.31 : 0.26, 1, four); }
    }
    // settle chord: root, fifth, octave in the next slot
    const i0 = Math.round(n * P * sr), len = Math.min(d.length - i0, Math.ceil(0.85 * sr));
    for (let i = 0; i < len; i++) { const s = i / sr, g = Math.min(1, s / 0.03) * Math.exp(-s / 0.22) * Math.min(1, (len - 1 - i) / (0.03 * sr));
      d[i0 + i] += 0.3 * g * (Math.sin(TAU * 2 * f * s) + Math.sin(TAU * 3 * f * s) + 0.8 * Math.sin(TAU * 4 * f * s)); }
  }, { level: 0.25 * lvl, pan: o.pan || 0, fade: 0.01, filters: [{ type: 'lowpass', f: 2200, q: 0.6 }] });
});

define('dataRain', { family: 'digital', styles: ['3dlight'], tags: ['digital', 'airy', 'bright', 'soft'], dur: 4.1,
  desc: 'A very soft cloud of tiny sine grains on a pentatonic scale that drifts and pulses around the stereo field, with no bell tone.',
  events: 'a data stream flows; a network is active; information moves between objects; a dataset loads',
  from: 'motion_ui data and digital: dataRain (sources 21, 12); options rate, ramp (up or down), dur' },
(ac, out, t, o, H) => {
  const { sr, r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const pg = p => { const a = (H.clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
  const emit = (L, R, level, filters) => { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    const b = ac.createBuffer(2, L.length, sr), A = b.getChannelData(0), B = b.getChannelData(1); for (let i = 0; i < L.length; i++) { A[i] = L[i] / m; B[i] = R[i] / m; }
    const s = ac.createBufferSource(); s.buffer = b; let node = s; for (const [ty, f, q] of filters || []) { const fl = H.filter(ty, f, q); node.connect(fl); node = fl; }
    node.connect(H.gain(level, out)); s.start(t); };
  const T = H.clamp(o.dur ?? 4, 0.6, 60), N = Math.ceil((T + 0.1) * sr), L = new Float32Array(N), R = new Float32Array(N);
  const tonic = H.mtof(o.key ?? 69) * tr, notes = [];
  for (let oc = -6; oc <= 6; oc++) for (const p of [0, 2, 4, 7, 9]) { const f = tonic * Math.pow(2, oc + p / 12); if (f >= 500 && f < 4000) notes.push(f); }
  notes.sort((a, b) => a - b);
  const rate = o.rate ?? 90, ph1 = r() * TAU, ph2 = r() * TAU, aN = Math.round(0.004 * sr), n = Math.ceil(0.04 * sr);
  let tt = 0;
  for (;;) {
    const u = tt / T, rp = o.ramp === 'up' ? 0.25 + 0.75 * u : o.ramp === 'down' ? 1 - 0.75 * u : 1;
    tt += -Math.log(1 - r()) / Math.max(8, rate * (1 + 0.45 * Math.sin(TAU * tt / 1.9 + ph1)) * rp);
    if (tt >= T) break;
    const edge = Math.min(1, tt / 0.25, (T - tt) / 0.25), f = notes[Math.min(notes.length - 1, Math.floor((r() + r()) / 2 * notes.length))] * (1 + 0.002 * (r() * 2 - 1));
    const amp = Math.pow(10, (-40 + 10 * r()) / 20) * Math.pow(f / 1000, -0.35) * edge, ph = r() * TAU;
    const [gl, gr] = pg(0.55 * Math.sin(TAU * tt / 3.7 + ph2) + 0.5 * (r() * 2 - 1) + (o.pan || 0)), i0 = Math.round(tt * sr), w = TAU * f / sr;
    for (let i = 0; i < n && i0 + i < N; i++) {
      const e = i < aN ? Math.pow(Math.sin(Math.PI / 2 * i / aN), 2) : Math.exp(-(i - aN) / (0.0065 * sr)), v = amp * e * Math.sin(ph + w * i) * Math.min(1, (n - 1 - i) / (0.004 * sr));
      L[i0 + i] += v * gl; R[i0 + i] += v * gr;
    }
  }
  emit(L, R, 0.18 * lvl, [['lowpass', 5500, 0.6]]);
});

define('overshootPop', { family: 'ui', styles: ['3dlight', 'doodle-draw'], tags: ['playful', 'soft', 'tonal'], dur: 0.8,
  desc: 'A soft round pop whose pitch bulges slightly above its resting note and settles, following the easing of a bouncy scale-in.',
  events: 'a label or badge scales in with overshoot; an icon pops; a callout bounces into place',
  from: 'motion_ui text and number animation: overshootPop (sources 14, 12, 23); o.dur is the animation length' },
(ac, out, t, o, H) => {
  const { sr, TAU, DSP } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const D = H.clamp(o.dur ?? 0.27, 0.12, 0.8), f0 = fold(H.mtof(o.key ?? 69) * tr, 440) * H.semis(0.1) / 2, tau = 0.6 * D;
  const ease = x => { const c1 = 1.70158, y = x - 1; return 1 + (c1 + 1) * y * y * y + c1 * y * y; };       // easeOutBack: 0 -> 1.1 -> 1
  H.buffer(out, t, D + 0.5, d => {
    let ph = 0;
    for (let i = 0; i < d.length; i++) {
      const s = i / sr, sc = Math.max(0, ease(Math.min(1, s / D)));
      ph += TAU * f0 * Math.pow(2, sc) / sr;                                                              // pitch follows the scale value
      d[i] = Math.pow(sc, 1.5) * Math.exp(-s / tau) * Math.min(1, s / 0.003) * (Math.sin(ph) + 0.16 * Math.sin(2 * ph));
    }
    DSP.modes(d, sr, D, [[H.rr(1000, 1200), 0.03, 0.0025]]);                                              // tiny seat tick at the settle
    const tp = Math.round(0.04 * sr); for (let i = 0; i < tp; i++) d[d.length - 1 - i] *= i / tp;
  }, { level: 0.25 * lvl, pan: o.pan || 0, filters: [{ type: 'lowpass', f: 4000, q: 0.6 }] });
});

define('staggerCascade', { family: 'ui', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'playful', 'tonal', 'premium'], dur: 0.9,
  desc: 'A short run of soft matte taps climbing the key\'s pentatonic scale, one per item and drifting left to right, with the last one a little longer.',
  events: 'words or cards appear in a stagger; a bullet list builds; chips cascade in',
  from: 'motion_ui text and number animation: staggerCascade (sources 13, 33, 22); o.n items over o.dur seconds' },
(ac, out, t, o, H) => {
  const { sr, r, DSP } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const pg = p => { const a = (H.clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
  const tap = (d, t0, f, a, tau, len) => { DSP.chirp(d, sr, t0, a, f * 1.06, f, 0.025, tau, len); DSP.modes(d, sr, t0, [[f * 2, a * 0.18, tau * 0.6]]); DSP.modes(d, sr, t0, [[H.rr(2040, 2760), a * 0.09, 0.00025]], 3); };
  const emit = (L, R, level, filters) => { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    const b = ac.createBuffer(2, L.length, sr), A = b.getChannelData(0), B = b.getChannelData(1); for (let i = 0; i < L.length; i++) { A[i] = L[i] / m; B[i] = R[i] / m; }
    const s = ac.createBufferSource(); s.buffer = b; let node = s; for (const [ty, f, q] of filters || []) { const fl = H.filter(ty, f, q); node.connect(fl); node = fl; }
    node.connect(H.gain(level, out)); s.start(t); };
  const n = H.clamp(Math.round(o.n ?? 5), 1, 200), span = o.dur ?? 0.6, gap = n > 1 ? span / (n - 1) : 0, stepV = n <= 5 ? 1 : Math.ceil(n / 5);
  const voiced = []; for (let i = n - 1; i >= 0; i -= stepV) voiced.unshift(i);                           // at most 5 voiced, the last item always sounds
  const pent = [0, 2, 4, 7, 9], semi = dg => 12 * Math.floor(dg / 5) + pent[((dg % 5) + 5) % 5];
  const base = fold(H.mtof(o.key ?? 69) * tr, 262), N = Math.ceil((span + 0.3) * sr), L = new Float32Array(N), R = new Float32Array(N);
  let dg = 0;
  voiced.forEach((it, j) => {
    if (j > 0) dg += r() < 0.35 ? 2 : 1;                                                                    // a rise of 1 or 2 scale steps
    const last = j === voiced.length - 1, tau = 0.02 * (last ? 1.4 : 1), f = base * Math.pow(2, semi(dg) / 12) * H.semis(0.1);
    const a = Math.pow(10, -1.5 * j / 20) * (j === 0 ? 1.19 : 1), at = Math.max(0, it * gap + H.rr(-0.003, 0.003));
    const e = new Float32Array(Math.ceil(0.2 * sr)); tap(e, 0, f, a, tau, tau * 6);
    const [gl, gr] = pg((n > 1 ? -0.35 + 0.7 * it / (n - 1) : 0) + (o.pan || 0)), i0 = Math.round(at * sr);
    for (let i = 0; i < e.length && i0 + i < N; i++) { L[i0 + i] += e[i] * gl; R[i0 + i] += e[i] * gr; }
  });
  emit(L, R, 0.18 * lvl, [['lowpass', 3800, 0.6]]);
});

define('rollTicks', { family: 'ui', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'crisp', 'clinical'], dur: 1.6,
  desc: 'A roll of soft key-tuned ticks that is dense at the start and spreads as the count eases out, rising in pitch and landing on a two-partial lock tone.',
  events: 'a numeric counter animates to a value; a stat counts up; a percentage fills',
  from: 'motion_ui text and number animation: rollTicks (sources 22, 12); o.n ticks over o.dur, dir down for a falling count' },
(ac, out, t, o, H) => {
  const { sr, r, DSP, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const tap = (d, t0, f, a, tau, len) => { DSP.chirp(d, sr, t0, a, f * 1.05, f, 0.012, tau, len); DSP.modes(d, sr, t0, [[f * 2, a * 0.15, tau * 0.6]]); DSP.modes(d, sr, t0, [[H.rr(2040, 2760), a * 0.09, 0.00025]], 3); };
  const n = H.clamp(Math.round(o.n ?? 16), 2, 120), T = H.clamp(o.dur ?? 1.2, 0.3, 10), down = o.dir === 'down', ratio = o.ease ?? 7;
  const rho = Math.pow(ratio, 1 / (n - 1)); let sum = 0; for (let j = 0; j < n; j++) sum += Math.pow(rho, j);
  const g1 = T / sum, tonic = H.mtof(o.key ?? 69) * tr, cand = [];
  for (let oc = -5; oc <= 5; oc++) for (const p of [0, 2, 4, 7, 9]) { const f = tonic * Math.pow(2, oc + p / 12); if (f > 480 && f < 1800) cand.push(f); }
  const lockF = fold(tonic, 700);
  H.buffer(out, t, T + 0.45, d => {
    let tk = 0;
    for (let k = 0; k < n; k++) {
      const gk = g1 * Math.pow(rho, k), v = down ? 1 - k / n : k / n, ft = 600 * Math.pow(1400 / 600, v);
      let best = cand[0]; for (const c of cand) if (Math.abs(Math.log(c / ft)) < Math.abs(Math.log(best / ft))) best = c;
      const a = (0.55 + 0.45 * Math.min(1, gk / (g1 * ratio))) * H.rr(0.92, 1.05);
      tap(d, Math.min(T, tk + H.rr(-0.001, 0.001) * (k > 0)), best * H.semis(0.1), a, 0.011, 0.08);
      tk += gk;
    }
    const i0 = Math.round(T * sr), len = Math.min(d.length - i0, Math.ceil(0.4 * sr));                       // lock tone: root and fifth, 200 ms
    for (let i = 0; i < len; i++) { const s = i / sr, g = Math.min(1, s / 0.006) * Math.exp(-s / 0.075) * Math.min(1, (len - 1 - i) / (0.02 * sr));
      d[i0 + i] += 0.9 * g * (Math.sin(TAU * lockF * s) + 0.62 * Math.sin(TAU * 1.5 * lockF * s)); }
  }, { level: 0.25 * lvl, pan: o.pan || 0, filters: [{ type: 'lowpass', f: 4500, q: 0.6 }] });
});

define('bandSwipe', { family: 'ui', styles: ['3dlight'], tags: ['airy', 'soft', 'clean'], dur: 0.65,
  desc: 'A soft airy band of breath that travels left to right as a highlight sweeps a phrase, growing a little and ending on a small matte stop.',
  events: 'a highlight band wipes over a phrase; an underline sweeps; a progress band crosses a card',
  from: 'motion_ui text and number animation: bandSwipe (sources 23, 14); dir left for right-to-left' },
(ac, out, t, o, H) => {
  const { sr, r, DSP } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const pg = p => { const a = (H.clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
  const rms = x => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length) || 1; };
  const svf = (x, fc, Q, mode) => { const y = new Float32Array(x.length), k = 1 / Q; let s1 = 0, s2 = 0;
    for (let i = 0; i < x.length; i++) { const g = Math.tan(Math.PI * Math.min(fc(i), sr * 0.45) / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      const v3 = x[i] - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
      y[i] = mode === 'bp' ? k * v1 : mode === 'lp' ? v2 : x[i] - k * v1 - v2; } return y; };
  const tap = (d, t0, f, a, tau, len) => { DSP.chirp(d, sr, t0, a, f * 1.06, f, 0.025, tau, len); DSP.modes(d, sr, t0, [[f * 2, a * 0.18, tau * 0.6]]); DSP.modes(d, sr, t0, [[H.rr(2040, 2760), a * 0.09, 0.00025]], 3); };
  const emit = (L, R, level, filters) => { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    const b = ac.createBuffer(2, L.length, sr), A = b.getChannelData(0), B = b.getChannelData(1); for (let i = 0; i < L.length; i++) { A[i] = L[i] / m; B[i] = R[i] / m; }
    const s = ac.createBufferSource(); s.buffer = b; let node = s; for (const [ty, f, q] of filters || []) { const fl = H.filter(ty, f, q); node.connect(fl); node = fl; }
    node.connect(H.gain(level, out)); s.start(t); };
  const T = H.clamp(o.dur ?? 0.3, 0.1, 2), rev = o.dir === 'left' || o.dir === 'down', sg = rev ? -1 : 1, nS = Math.ceil(T * sr), N = Math.ceil((T + 0.3) * sr);
  const fc0 = 2200 * tr * H.rr(0.96, 1.04), wn = new Float32Array(nS); for (let i = 0; i < nS; i++) wn[i] = r() * 2 - 1;
  const fcs = i => fc0 * (1 + 0.1 * i / nS), nz = svf(svf(wn, fcs, 4.5, 'bp'), fcs, 4.5, 'bp'), kz = 0.22 / rms(nz);       // about Q 3 with steeper skirts, centre drifts +10 %
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < nS; i++) {
    const s = i / sr, u = i / nS, e = (0.08 + 0.92 * u) * Math.min(1, s / 0.006, (T - s) / 0.01), [gl, gr] = pg(sg * (-0.7 + 1.4 * u) + (o.pan || 0));
    L[i] = nz[i] * kz * e * gl; R[i] = nz[i] * kz * e * gr;
  }
  const tp = new Float32Array(Math.ceil(0.16 * sr)); tap(tp, 0, fold(H.mtof(o.key ?? 69) * 1.5 * tr, 1100) * H.semis(0.1), 0.75, 0.02, 0.15);
  const [tl, trr] = pg(sg * 0.7 + (o.pan || 0)), i0 = Math.round((T + 0.012) * sr);
  for (let i = 0; i < tp.length && i0 + i < N; i++) { L[i0 + i] += tp[i] * tl; R[i0 + i] += tp[i] * trr; }
  emit(L, R, 0.18 * lvl, [['lowpass', 5500, 0.6]]);
});

define('lineTrace', { family: 'ui', styles: ['3dlight'], tags: ['tonal', 'clean', 'clinical'], dur: 0.75,
  desc: 'A faint sine climbs a ninth as a leader line draws across the frame and finishes with a soft matte dot on the key\'s fifth.',
  events: 'a leader line draws from a part to its label; an outline is traced; a connector reaches its node',
  from: 'motion_ui text and number animation: lineTrace (sources 12, 21); o.dur is the line time, dir down for a retracting line' },
(ac, out, t, o, H) => {
  const { sr, r, DSP, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const pg = p => { const a = (H.clamp(p, -1, 1) + 1) * Math.PI / 4; return [Math.cos(a), Math.sin(a)]; };
  const tap = (d, t0, f, a, tau, len) => { DSP.chirp(d, sr, t0, a, f * 1.06, f, 0.025, tau, len); DSP.modes(d, sr, t0, [[f * 2, a * 0.18, tau * 0.6]]); DSP.modes(d, sr, t0, [[H.rr(2040, 2760), a * 0.09, 0.00025]], 3); };
  const emit = (L, R, level, filters) => { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    const b = ac.createBuffer(2, L.length, sr), A = b.getChannelData(0), B = b.getChannelData(1); for (let i = 0; i < L.length; i++) { A[i] = L[i] / m; B[i] = R[i] / m; }
    const s = ac.createBufferSource(); s.buffer = b; let node = s; for (const [ty, f, q] of filters || []) { const fl = H.filter(ty, f, q); node.connect(fl); node = fl; }
    node.connect(H.gain(level, out)); s.start(t); };
  const T = H.clamp(o.dur ?? 0.45, 0.15, 4), up = o.dir !== 'down', nS = Math.ceil(T * sr), N = Math.ceil((T + 0.3) * sr);
  const f0 = fold(H.mtof(o.key ?? 69) * tr, 370) * H.semis(0.1), f1 = f0 * Math.pow(2, 14 / 12);              // root up to the ninth (about 400 -> 900 Hz)
  const p0 = H.clamp((o.pan || 0) - 0.5, -1, 1), p1 = H.clamp((o.pan || 0) + 0.5, -1, 1), L = new Float32Array(N), R = new Float32Array(N);
  const tri = x => 2 / Math.PI * Math.asin(Math.sin(x));
  let ph = r() * TAU;
  for (let i = 0; i < nS; i++) {
    const s = i / sr, u = i / nS, fr = f0 * Math.pow(f1 / f0, up ? u : 1 - u), e = Math.min(1, s / 0.03, (T - s) / 0.025), env = e * e * (3 - 2 * e) * (0.6 + 0.4 * u);
    ph += TAU * fr / sr; const v = 0.28 * env * (Math.sin(ph) + 0.25 * tri(2 * ph)), [gl, gr] = pg(up ? p0 + (p1 - p0) * u : p1 + (p0 - p1) * u);
    L[i] = v * gl; R[i] = v * gr;
  }
  const tp = new Float32Array(Math.ceil(0.16 * sr)); tap(tp, 0, fold(H.mtof(o.key ?? 69) * 1.5 * tr, 400) * H.semis(0.1), 1, 0.02, 0.15);
  const [tl, trr] = pg(up ? p1 : p0), i0 = Math.round((T + 0.01) * sr);
  for (let i = 0; i < tp.length && i0 + i < N; i++) { L[i0 + i] += tp[i] * tl; R[i0 + i] += tp[i] * trr; }
  emit(L, R, 0.18 * lvl, [['lowpass', 4500, 0.6]]);
});

define('vowelMorph', { family: 'organic', styles: ['3dlight'], tags: ['organic', 'warm', 'soft'], dur: 0.95,
  desc: 'A warm, hummed "ooh to aah" slide made of filtered breath and a soft reed-like source; smooth and organic, never a voice.',
  events: 'a sphere morphs into a capsule; a shape or colour transforms; a membrane changes form',
  from: 'motion_ui morphs and shape changes: vowelMorph (sources 12, 5); dir down for aah to ooh' },
(ac, out, t, o, H) => {
  const { sr, r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const svf = (x, fc, Q, mode) => { const y = new Float32Array(x.length), k = 1 / Q; let s1 = 0, s2 = 0;
    for (let i = 0; i < x.length; i++) { const g = Math.tan(Math.PI * Math.min(fc(i), sr * 0.45) / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      const v3 = x[i] - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
      y[i] = mode === 'bp' ? k * v1 : mode === 'lp' ? v2 : x[i] - k * v1 - v2; } return y; };
  const dur = H.clamp(o.dur ?? 0.95, 0.5, 6), M = Math.min(0.5, dur - 0.3), up = o.dir !== 'down', f = fold(H.mtof(o.key ?? 69) * tr, 98) * H.semis(0.1);
  // one cycle of a sawtooth whose harmonics roll off like a 12 dB/oct lowpass at 1.2 kHz
  const TL = 2048, tab = new Float32Array(TL);
  for (let k = 1; k <= 40; k++) { const w = 1 / (k * Math.sqrt(1 + Math.pow(f * k / 1200, 4))); for (let j = 0; j < TL; j++) tab[j] += w * Math.sin(TAU * k * j / TL); }
  const det = (c) => Math.pow(2, c / 1200), voices = [[1, det(-4), 1], [1, det(4), 1], [1.5, det(-4), 0.7], [1.5, det(4), 0.7]].map(v => ({ m: v[0] * v[1], a: v[2], p: r() }));
  H.buffer(out, t, dur, d => {
    const n = d.length, src = new Float32Array(n), vph = r() * TAU;
    for (let i = 0; i < n; i++) {
      const s = i / sr, vib = 1 + 0.0017 * Math.sin(TAU * 5 * s + vph) * Math.min(1, s / 0.4); let v = 0;
      for (const vo of voices) { vo.p += f * vo.m * vib / sr; vo.p -= Math.floor(vo.p); const pos = vo.p * TL, i0 = pos | 0, fr = pos - i0; v += vo.a * (tab[i0] * (1 - fr) + tab[(i0 + 1) % TL] * fr); }
      src[i] = v + 0.12 * (r() * 2 - 1);                                                               // a little breath
    }
    const ez = i => { const u = H.clamp((i / sr - 0.05) / M, 0, 1), e = u * u * (3 - 2 * u); return up ? e : 1 - e; };
    const b1 = svf(src, i => 300 * Math.pow(700 / 300, ez(i)), 5, 'bp'), b2 = svf(src, i => 900 * Math.pow(1200 / 900, ez(i)), 5, 'bp');
    for (let i = 0; i < n; i++) { const s = i / sr, a = Math.min(1, s / 0.06), z = Math.min(1, (dur - s) / 0.2); d[i] = (b1[i] + 0.5 * b2[i]) * (a * a * (3 - 2 * a)) * (z * z * (3 - 2 * z)); }
  }, { level: 0.25 * lvl, pan: o.pan || 0, fade: 0.005, filters: [{ type: 'lowpass', f: 3200, q: 0.6 }] });
});

define('breathChime', { family: 'tonal', styles: ['3dlight'], tags: ['airy', 'tonal', 'soft'], dur: 1.1,
  desc: 'A small chime made of breath: a puff of noise rings three tuned resonators like air across a bottle, with a faint airy shimmer.',
  events: 'a label is revealed; a node is highlighted; a small ta-da; a section is named',
  from: 'motion_ui tonal accents and stingers: breathChime (sources 34, 21); o.dur is the ring length' },
(ac, out, t, o, H) => {
  const { sr, r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const svf = (x, fc, Q, mode) => { const y = new Float32Array(x.length), k = 1 / Q; let s1 = 0, s2 = 0;
    for (let i = 0; i < x.length; i++) { const g = Math.tan(Math.PI * Math.min(fc(i), sr * 0.45) / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      const v3 = x[i] - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
      y[i] = mode === 'bp' ? k * v1 : mode === 'lp' ? v2 : x[i] - k * v1 - v2; } return y; };
  const ring = H.clamp(o.dur ?? 0.9, 0.3, 4), f = fold(H.mtof(o.key ?? 69) * Math.pow(2, H.pick([0, 7]) / 12) * tr, 660) * H.semis(0.1);  // root or fifth of the key
  H.buffer(out, t, ring + 0.2, d => {
    const n = d.length, bl = Math.round(H.rr(0.008, 0.012) * sr), w = Math.round(0.06 * sr), air = 3000 * H.semis(0.2);
    for (const [ratio, g, tf] of [[1, 1, 0.68], [2.01, 0.5, 0.58], [3.02, 0.25, 0.48]]) {
      const fr = f * ratio; if (fr > sr * 0.4) continue;
      const rho = Math.exp(-6.9078 / (ring * tf * H.rr(0.9, 1.1) * sr)), c1 = 2 * rho * Math.cos(TAU * fr / sr), c2 = -rho * rho; let best = null;
      for (let tries = 0; tries < 4; tries++) {                          // each resonator is struck by its own 8-12 ms puff of noise (best of 4 so none is struck at a spectral null)
        const ex = new Float32Array(bl); for (let i = 0; i < bl; i++) ex[i] = (r() * 2 - 1) * Math.sin(Math.PI * i / bl);
        const y = new Float32Array(n); let y1 = 0, y2 = 0, e = 0;
        for (let i = 0; i < n; i++) { const v = (i < bl ? ex[i] : 0) - (i > 1 && i - 2 < bl ? ex[i - 2] : 0) + c1 * y1 + c2 * y2; y[i] = v; y2 = y1; y1 = v; if (i >= bl && i < bl + w) e += v * v; }
        if (!best || e > best.e) best = { y, e };
      }
      const k = g * H.rr(0.8, 1.25) / (Math.sqrt(2 * best.e / w) || 1);          // set the ringing level (1 : 0.5 : 0.25), with a little timbre jitter
      for (let i = 0; i < n; i++) d[i] += best.y[i] * k;
    }
    const an = Math.round(0.12 * sr), wn = new Float32Array(an); for (let i = 0; i < an; i++) wn[i] = r() * 2 - 1;
    const ab = svf(wn, () => air, 2, 'bp'); let am = 1e-9; for (let i = 0; i < an; i++) am = Math.max(am, Math.abs(ab[i]));
    for (let i = 0; i < an; i++) d[i] += 0.12 * ab[i] / am * Math.pow(Math.sin(Math.PI * i / an), 2);        // 10 % breathy air layer
    const tp = Math.round(0.03 * sr); for (let i = 0; i < tp; i++) d[n - 1 - i] *= i / tp;
  }, { level: 0.25 * lvl, pan: o.pan || 0, filters: [{ type: 'highpass', f: 300, q: 0.707 }, { type: 'lowpass', f: 7000, q: 0.6 }] });
});

define('loopSeamOpen', { family: 'tonal', styles: ['3dlight', 'doodle-draw'], tags: ['tonal', 'soft', 'premium'], dur: 3.4,
  desc: 'An open, unresolved suspended chord on the dominant gathers note by note, swells for about a second, then fades away, leaning toward the first note of the film.',
  events: 'the end of a seamless loop; coming up next; a section that hands over to the start',
  from: 'motion_ui tonal accents and stingers: loopSeamOpen (sources 29, 5); o.dur scales the whole gesture; start it (dur - 0.6) s before the loop end so its tail overlaps the start by 0.6 s' },
(ac, out, t, o, H) => {
  const { sr, r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const emit = (L, R, level, filters) => { let m = 1e-9; for (let i = 0; i < L.length; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    const b = ac.createBuffer(2, L.length, sr), A = b.getChannelData(0), B = b.getChannelData(1); for (let i = 0; i < L.length; i++) { A[i] = L[i] / m; B[i] = R[i] / m; }
    const s = ac.createBufferSource(); s.buffer = b; let node = s; for (const [ty, f, q] of filters || []) { const fl = H.filter(ty, f, q); node.connect(fl); node = fl; }
    node.connect(H.gain(level, out)); s.start(t); };
  // sus2 chord on the dominant (root, 2nd, 5th, octave): the top note is the dominant of the film's tonic, so the ear wants the first note
  const root = fold(H.mtof((o.key ?? 69) + 7) * tr, 262) * H.semis(0.15), sc = H.clamp((o.dur ?? 3.4) / 3.4, 0.4, 3), A = 1.2 * sc, Dc = 1.8 * sc, N = Math.ceil((0.36 * sc + A + Dc + 0.05) * sr);
  const L = new Float32Array(N), R = new Float32Array(N), tri = x => 0.8106 * (Math.sin(x) - Math.sin(3 * x) / 9 + Math.sin(5 * x) / 25);
  for (const [sm, delay, amp] of [[0, 0, 0.8], [7, 0.12, 0.7], [2, 0.24, 0.45], [12, 0.36, 1.0]]) {
    const f = root * Math.pow(2, sm / 12);
    for (let ch = 0; ch < 2; ch++) {
      const fc = f * Math.pow(2, (ch ? 1.5 : -1.5) / 1200), p0 = r() * TAU, lr = H.rr(0.2, 0.35), lp = r() * TAU, dst = ch ? R : L, i0 = Math.round(delay * sc * sr), n = Math.min(N - i0, Math.ceil((A + Dc) * sr));
      for (let i = 0; i < n; i++) {
        const s = i / sr, e = s < A ? Math.pow(Math.sin(Math.PI / 2 * s / A), 2) : Math.pow(Math.cos(Math.PI / 2 * (s - A) / Dc), 2), x = TAU * fc * s + p0;
        dst[i0 + i] += amp * e * (1 + 0.12 * Math.sin(TAU * lr * s + lp)) * (Math.sin(x) + 0.3 * tri(x));
      }
    }
  }
  emit(L, R, 0.18 * lvl, [['highpass', 150, 0.707], ['lowpass', 3500, 0.6]]);
});

define('breathingBed', { family: 'rhythm', styles: ['3dlight'], tags: ['warm', 'soft', 'tonal'], dur: 9,
  desc: 'A soft pad of four pure sines (root, fifth, octave, high ninth) that swells and ebbs once per beat, the upper notes fading in at half the speed of the lower ones.',
  events: 'the whole film bed; a calm beat feel at the film tempo; a pulse without drums',
  from: 'motion_ui rhythmic and musical elements: breathingBed (sources 5, 7); options bpm (default 106.7), dur' },
(ac, out, t, o, H) => {
  const { r, TAU } = H, tr = Math.pow(2, (o.pitch || 0) / 12), lvl = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const fold = (f, lo) => { while (f >= 2 * lo) f /= 2; while (f < lo) f *= 2; return f; };
  const bpm = o.bpm ?? 106.7, beat = 60 / bpm, dur = H.clamp(o.dur ?? 9, 1, 300), nB = Math.ceil(dur / beat);
  const root = fold(H.mtof(o.key ?? 69) * tr, 165) * H.semis(0.05);
  const master = H.gain(0.8 * lvl, out), lp = H.filter('lowpass', 1400, 0.5); lp.connect(master);
  const cosUp = Float32Array.from({ length: 64 }, (_, i) => 0.5 - 0.5 * Math.cos(Math.PI * i / 63)), cosDown = Float32Array.from(cosUp).reverse();
  const fadeA = Math.min(2, dur * 0.1);
  const layer = (notes, depth, fin, fout) => {
    const lg = ac.createGain(), pu = ac.createGain(); lg.gain.value = 0; lg.connect(pu); pu.connect(lp);
    lg.gain.setValueCurveAtTime(cosUp, t, fin); lg.gain.setValueCurveAtTime(cosDown, t + dur - fout, fout);       // fade in and out
    const curve = Float32Array.from({ length: 48 }, (_, i) => 1 - depth * (0.5 - 0.5 * Math.cos(TAU * i / 47)));    // 1 - depth x raised cosine, once per beat
    for (let k = 0; k < nB; k++) pu.gain.setValueCurveAtTime(curve, t + k * beat, beat - 0.0005);
    for (const [f, a, pn] of notes) {                                                                            // one sine per note, 1-3 cents off, spread across the field
      const osc = H.osc('sine', f, t, t + dur), g = H.gain(a), p = ac.createStereoPanner(); osc.detune.value = (r() < 0.5 ? -1 : 1) * H.rr(1, 3); p.pan.value = pn;
      osc.connect(g); g.connect(p); p.connect(lg);
    }
  };
  layer([[root, 0.1, 0], [root * 1.5, 0.075, -0.3]], 0.3, fadeA, fadeA * 0.75);                                           // ambient layer
  layer([[root * 2, 0.06, 0.3], [root * Math.pow(2, 26 / 12), 0.045, 0.15]], 0.45, fadeA * 2, fadeA * 1.5);               // melodic layer (octave and a high ninth, no close seconds), fades in at half the speed
});

// ================================================================ Biology: organic, liquid, particles, crystal and heat (research/bio_organic.md)
// ---------------------------------------------------------------- bio_a: organic and biological (molecular and cellular events)

define('dockSeat', { family: 'organic', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'premium', 'clinical', 'organic'], dur: 0.8,
  desc: 'A molecule finds its pocket: a faint breathy approach, then one dry matte tok as it seats and a tiny hollow settle (3dlight: silicone tok; doodle-draw: wooden peg tok with a pencil-soft breath).',
  events: 'docking; a ligand or drug binds a receptor; antibody meets antigen; a puzzle piece fits; a part seats in a slot',
  from: 'research: bio_organic dockSeat (sources 3, 26)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const tc = H.rr(0.2, 0.32), sm = H.semis(1), n1 = Math.round(tc * sr);
  play(tc + 0.5, (L, R) => {
    // approach: a breath that opens upward and stops dead on contact
    const x = noise(tc), f0 = dd ? 1400 : 900, f1 = dd ? 3200 : 1800;
    const y = DSP.reson(x, sr, i => f0 * Math.pow(f1 / f0, i / n1) * pf, dd ? 800 : 450); DSP.norm(y);
    for (let i = 0; i < n1; i++) { const u = i / n1, s = Math.sin(u * Math.PI / 2); y[i] *= 0.17 * s * s * Math.min(1, (n1 - i) / (0.004 * sr)); }
    add(L, R, y, 1, 0);
    // seat: a short pitched thud plus a mid body so it carries on small speakers, and a soft tick
    const s = mono(0.4);
    if (dd) { DSP.chirp(s, sr, 0, 1, 330 * pf * sm, 245 * pf * sm, 0.03, 0.026); DSP.modes(s, sr, 0, [[760 * pf * sm, 0.4, 0.012], [1850 * pf * sm, 0.16, 0.006]]); }
    else { DSP.chirp(s, sr, 0, 1, 250 * pf * sm, 175 * pf * sm, 0.035, 0.03); DSP.modes(s, sr, 0, [[520 * pf * sm, 0.5, 0.014], [1150 * pf * sm, 0.14, 0.006]]); }
    const k = mono(0.02); DSP.burst(k, sr, 0, 1, 0.02, dd ? 0.0014 : 0.0009, r); lp(k, dd ? 3800 : 2500); add(L, R, k, dd ? 0.4 : 0.26, 0, n1);
    add(L, R, s, 1, 0, n1);
    // settle: two small damped modes, one each side
    const f = H.rr(640, 760) * pf * (dd ? 1.3 : 1), a = mono(0.5), b = mono(0.5);
    DSP.modes(a, sr, 0.02, [[f, 1, dd ? 0.05 : 0.09]]); DSP.modes(b, sr, 0.026, [[f * 2.32, 0.7, dd ? 0.035 : 0.06]]);
    add(L, R, a, 0.075, -0.2, n1); add(L, R, b, 0.075, 0.2, n1);
  });
});

define('bondLock', { family: 'organic', styles: ['3dlight'], tags: ['tonal', 'soft', 'premium', 'clean'], dur: 1.6,
  desc: 'Two near-identical soft tones beat slowly while they drift together from the sides, then lock into one steady centred tone with a quiet octave bloom.',
  events: 'binding affinity; a complex forms; charge pairing; two cards or cells join; an equation resolves',
  from: 'research: bio_organic bondLock (sources 5, 25)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const f = H.mtof((o.key == null ? 69 : o.key) + (o.pitch || 0) + H.pick([0, 7, -5])) * Math.pow(2, H.rr(-6, 6) / 1200), beat = H.rr(6.5, 10), tau = H.rr(0.17, 0.21), lock = H.rr(0.42, 0.5), rel = H.rr(0.16, 0.19);
  const wave = p => Math.sin(p) - 0.11 * Math.sin(3 * p);
  play(1.5, (L, R) => {
    const n = L.length;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, pA = TAU * f * tt, pB = pA - TAU * beat * tau * Math.exp(-tt / tau);   // the beat dies away and the phases end up equal, so the lock adds up in mono
      const env = Math.min(1, tt / 0.03) * (tt < lock + 0.08 ? 1 : Math.exp(-(tt - lock - 0.08) / rel)), tail = Math.min(1, (n - 1 - i) / (0.12 * sr));
      const u = Math.min(1, tt / (lock + 0.1)), mv = 0.3 * (1 - u * u * (3 - 2 * u));
      const aA = (-mv + 1) * Math.PI / 4, aB = (mv + 1) * Math.PI / 4;
      const bloom = tt > lock ? 0.1 * Math.sin(2 * pA) * (1 - Math.exp(-(tt - lock) / 0.12)) * Math.exp(-(tt - lock) / 0.45) : 0;
      const a = wave(pA) * 0.5 * env * tail, b = wave(pB) * 0.5 * env * tail;
      L[i] = a * Math.cos(aA) + b * Math.cos(aB) + bloom * 0.707; R[i] = a * Math.sin(aA) + b * Math.sin(aB) + bloom * 0.707;
    }
  });
});

define('enzymeSnip', { family: 'organic', styles: ['3dlight', 'doodle-draw'], tags: ['crisp', 'bright', 'clinical'], dur: 0.55,
  desc: 'A crisp, tiny shear and then two faint tones drift apart to either side as the halves part (3dlight: pure and clean; doodle-draw: a small paper scissor snip with pencil-grain noise).',
  events: 'an enzyme cuts a strand; a restriction enzyme; protease cleavage; a CRISPR cut; a link is severed',
  from: 'research: bio_organic enzymeSnip (source 3)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const hp = (x, fc) => { let y = 0; const c = 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { y += c * (x[i] - y); x[i] -= y; } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const base = H.rr(2300, 3000) * pf, drift = H.rr(0.04, 0.09), hf = H.rr(1000, 1350) * pf;
  play(0.6, (L, R) => {
    const m = mono(0.5);
    if (!dd) {
      const c = mono(0.01); DSP.burst(c, sr, 0, 1, 0.01, 0.0007, r); hp(c, 4000); add(L, R, c, 0.7, 0);
      DSP.modes(m, sr, 0, [[base, 1, 0.02], [base * 1.74, 0.15, 0.01]]);
    } else {
      const sh = DSP.reson(noise(0.04), sr, i => (2400 + 1800 * i / (0.04 * sr)) * pf, 1800); DSP.norm(sh);
      for (let i = 0; i < sh.length; i++) sh[i] *= Math.sin(Math.PI * i / sh.length) * 0.42;
      add(L, R, sh, 1, 0);
      const c = mono(0.01); DSP.burst(c, sr, 0, 1, 0.01, 0.0011, r); hp(c, 2800); add(L, R, c, 0.8, 0, Math.round(0.034 * sr));
      DSP.modes(m, sr, 0.034, [[base * 0.85, 0.35, 0.01], [base * 1.52, 0.15, 0.006]]);
    }
    add(L, R, m, 1, 0);
    // the two halves: a pair of faint tones gliding apart, one to each side
    const a = mono(0.55), b = mono(0.55), st = dd ? 0.034 : 0.02, hg = dd ? 0.07 : 0.075;
    DSP.chirp(a, sr, st, 1, hf, hf * (1 - drift), 0.16, 0.09); DSP.chirp(b, sr, st, 1, hf, hf * (1 + drift), 0.16, 0.09);
    add(L, R, a, hg, -0.5); add(L, R, b, hg, 0.5);
  });
});

define('membraneFlex', { family: 'organic', styles: ['3dlight'], tags: ['soft', 'sub', 'organic', 'premium'], dur: 1.0,
  desc: 'A soft, round, low flex of a lipid membrane: a muted elastic "bwum" that bends and relaxes, with no boing.',
  events: 'a membrane bends; a cell squeezes through a gap; deformation; a vesicle wobbles; a wall under pressure',
  from: 'research: bio_organic membraneFlex (sources 10, 12, 25)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const f0 = H.rr(150, 200) * pf, att = H.rr(0.015, 0.04), ratios = [1, 1.59, 2.14, 2.30, 2.65, 2.92], amps = [1, 0.6, 0.4, 0.35, 0.25, 0.2], taus = [0.24, 0.19, 0.15, 0.14, 0.11, 0.09];
  const ph = ratios.map(() => r() * TAU), g0 = H.rr(1.025, 1.04);
  play(1.0, (L, R) => {
    const x = mono(1.0), n = x.length;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, g = g0 - (g0 - 0.955) * (1 - Math.exp(-tt / 0.15)), at = tt < att ? 0.5 - 0.5 * Math.cos(Math.PI * tt / att) : 1;
      let v = 0; for (let k = 0; k < 6; k++) { ph[k] += TAU * f0 * ratios[k] * g / sr; v += amps[k] * Math.sin(ph[k]) * Math.exp(-tt / taus[k]); }
      x[i] = v * at;
    }
    const body = lp(lp(noise(1.0), 300, 2), 300, 1); DSP.norm(body);
    for (let i = 0; i < n; i++) x[i] += 0.1 * body[i] * Math.exp(-i / sr / 0.25) * Math.min(1, i / sr / att);
    lp(x, 1100, 2);
    const tl = Math.round(0.1 * sr); for (let i = 0; i < tl; i++) x[n - 1 - i] *= i / tl;
    add(L, R, x, 1, 0);
  });
});

define('engulf', { family: 'organic', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'wet', 'organic', 'sub'], dur: 1.6,
  desc: 'A soft swallow: a filtered breath opens and closes around something, a low gulp, then a round thump and a few tiny bubbles as the pocket seals (3dlight: smooth and filtered; doodle-draw: wetter, with more bubbles).',
  events: 'endocytosis; phagocytosis; a cell takes in a particle; a nanoparticle is wrapped by a membrane',
  from: 'research: bio_organic engulf (sources 7, 9)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const svf = (x, fcf, Q) => { let c1 = 0, c2 = 0; const k = 1 / Q; for (let i = 0; i < x.length; i++) { const g = Math.tan(Math.PI * Math.min(fcf(i), sr * 0.45) / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x[i] - c2, v1 = a1 * c1 + a2 * v3, v2 = c2 + a2 * c1 + a3 * v3; c1 = 2 * v1 - c1; c2 = 2 * v2 - c2; x[i] = v2; } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const wrapT = H.rr(0.45, 0.8), closeT = H.rr(0.3, 0.38), ts = wrapT + closeT, nb = dd ? 4 + Math.floor(r() * 4) : 2 + Math.floor(r() * 3);
  play(ts + 0.45, (L, R) => {
    const n = L.length, x = noise(ts + 0.45);
    svf(x, i => { const tt = i / sr; return pf * (tt < wrapT ? 250 * Math.pow(1100 / 250, tt / wrapT) : 1100 * Math.pow(200 / 1100, Math.min(1, (tt - wrapT) / closeT))); }, 1.5);
    DSP.norm(x);
    const s = mono(ts + 0.45);
    for (let i = 0; i < n; i++) {
      const tt = i / sr, u = tt < wrapT ? 0.5 - 0.5 * Math.cos(Math.PI * tt / wrapT) : tt < ts ? 0.15 + 0.85 * (0.5 + 0.5 * Math.cos(Math.PI * (tt - wrapT) / closeT)) : 0.15 * Math.exp(-(tt - ts) / 0.04);
      const pan = 0.3 - 0.4 * Math.min(1, tt / ts), a = (pan + (o.pan || 0) + 1) * Math.PI / 4;
      L[i] += 0.42 * u * x[i] * Math.cos(a); R[i] += 0.42 * u * x[i] * Math.sin(a);
      // the gulp: a low sine falling through the closing phase
      if (tt > wrapT && tt < ts + 0.12) { const w = (tt - wrapT) / (closeT + 0.12), e = Math.pow(Math.sin(Math.PI * w), 2); s[i] = 0.12 * e * Math.sin(TAU * pf * (190 * (tt - wrapT) - 40 * (tt - wrapT) * (tt - wrapT) / (closeT + 0.12))); }
    }
    add(L, R, s, 1, -0.05);
    // seal: a round low thump and a few tiny rising bubbles
    const th = mono(0.3); DSP.chirp(th, sr, 0, 0.3, 95 * pf, 72 * pf, 0.05, 0.04); add(L, R, th, 1, 0, Math.round((ts - 0.01) * sr));
    for (let k = 0; k < nb; k++) { const bf = H.rr(900, 1500) * pf, bb = mono(0.1); DSP.chirp(bb, sr, 0, 1, bf, bf * 1.25, 0.012, dd ? 0.014 : 0.012); add(L, R, bb, dd ? 0.16 : 0.08, H.rr(-0.5, 0.5), Math.round((ts + 0.01 + k * H.rr(0.02, 0.05)) * sr)); }
    if (dd) for (let k = 0; k < 8; k++) { const bf = H.rr(500, 1100) * pf, bb = mono(0.06); DSP.chirp(bb, sr, 0, 1, bf, bf * 1.3, 0.01, 0.01); add(L, R, bb, 0.07, H.rr(-0.5, 0.5), Math.round(H.rr(0.1, wrapT + 0.1) * sr)); }
  });
});

define('vesiclePinch', { family: 'organic', styles: ['3dlight', 'doodle-draw'], tags: ['organic', 'wet', 'tonal', 'playful'], dur: 0.7,
  desc: 'An elastic neck thins on a rising tone, snaps clean, and a small round bead leaves to the right; a smaller vesicle (o.size below 1) leaves a higher bead.',
  events: 'a vesicle buds; pinching off; cytokinesis; a droplet breaks away; exocytosis',
  from: 'research: bio_organic vesiclePinch (sources 9, 25)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const size = o.size || 1, tb = H.rr(0.3, 0.38), f0 = 380 * H.semis(1.5) * pf, f1 = 1500 * H.semis(1.5) * pf, bead = 600 * H.semis(1) * pf / Math.pow(size, 0.6), sz = dd ? 0.8 : 1;
  play(tb + 0.45, (L, R) => {
    const nk = Math.round(tb * sr), neck = mono(tb + 0.02);
    let ph = 0;
    for (let i = 0; i < neck.length; i++) {
      const tt = i / sr, u = Math.min(1, tt / tb), vib = 1 + (dd ? 0.022 : 0.015) * u * Math.sin(TAU * 14 * tt);
      ph += TAU * f0 * Math.pow(f1 / f0, u) * vib / sr;
      const fall = tt > tb ? Math.max(0, 1 - (tt - tb) / 0.008) : 1;
      if (tt > tb) ph += (TAU * 520 * pf - TAU * f1 * vib) / sr;   // at the break the pitch drops to 520 Hz and fades in 8 ms
      neck[i] = (Math.sin(ph) + 0.1 * Math.sin(2 * ph)) * 0.24 * Math.pow(Math.min(1, tt / tb), 1.6) * Math.min(1, tt / 0.01) * fall;
    }
    lp(neck, dd ? 2600 : 4000, 1);
    add(L, R, neck, 1, 0);
    const k = mono(0.01); DSP.burst(k, sr, 0, 1, 0.01, 0.0009, r); lp(k, 3200); add(L, R, k, 0.22, 0, nk);
    const b = mono(0.5); DSP.chirp(b, sr, 0, 0.45, bead, bead * 1.5, 0.05, 0.06 * sz); DSP.modes(b, sr, 0, [[bead * (dd ? 2.76 : 2.0), dd ? 0.12 : 0.05, 0.02]]);
    add(L, R, b, 1, 0.4, nk + Math.round(0.004 * sr));
  });
});

define('cellDivide', { family: 'organic', styles: ['3dlight'], tags: ['tonal', 'soft', 'premium'], dur: 1.9,
  desc: 'One steady soft tone is pinched, then splits into two identical voices that drift apart to left and right, widen slightly, and settle together.',
  events: 'cell division; mitosis; cloning or duplicating an item; a branch in a diagram; one becomes two',
  from: 'research: bio_organic cellDivide (source 2)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const f = H.mtof((o.key == null ? 69 : o.key) + (o.pitch || 0) + H.pick([0, 7])) * Math.pow(2, H.rr(-6, 6) / 1200), ts = H.rr(0.3, 0.45), wave = p => Math.sin(p) * 0.6 + 0.4 * (Math.sin(p) - 0.11 * Math.sin(3 * p)), cw = 5.5 * H.rr(0.85, 1.15);
  play(1.9, (L, R) => {
    const n = L.length; let p0 = 0, p1 = 0, p2 = 0, split = false;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, sp = tt - ts, at = Math.min(1, tt / 0.03);
      p0 += TAU * f / sr;
      if (sp < 0) { const v = wave(p0) * at * 0.8; L[i] = v * 0.707; R[i] = v * 0.707; continue; }
      if (!split) { split = true; p1 = p0; p2 = p0; }
      // after the split: two voices from the same phase, detune widening to cw cents and relaxing to 2, panning out to +-0.7
      const x = sp / 0.25, cents = 1.5 * (1 - Math.exp(-sp / 0.08)) + (cw - 1.5) * x * Math.exp(1 - x), pr = Math.min(1, sp / 0.6), pan = 0.7 * (0.5 - 0.5 * Math.cos(Math.PI * pr));
      p1 += TAU * f * Math.pow(2, cents / 1200) / sr; p2 += TAU * f * Math.pow(2, -cents / 1200) / sr;
      const old = Math.max(0, 1 - sp / 0.04), env = Math.min(1, sp / 0.04) * (sp < 0.3 ? 1 : Math.exp(-(sp - 0.3) / 0.24)) * 0.8;
      const a = (-pan + 1) * Math.PI / 4, b = (pan + 1) * Math.PI / 4, v1 = wave(p1) * env * 0.75, v2 = wave(p2) * env * 0.75, v0 = wave(p0) * 0.8 * old * at;
      const bloom = 0.1 * Math.sin(2 * p0) * (1 - Math.exp(-sp / 0.25)) * Math.exp(-sp / 0.5);
      L[i] = v0 * 0.707 + v1 * Math.cos(a) + v2 * Math.cos(b) + bloom * 0.707; R[i] = v0 * 0.707 + v1 * Math.sin(a) + v2 * Math.sin(b) + bloom * 0.707;
    }
    // the pinch: one tiny tick as it divides
    const k = mono(0.01); DSP.modes(k, sr, 0, [[1600 * pf, 1, 0.0025]]); DSP.burst(k, sr, 0, 0.3, 0.008, 0.0008, r); add(L, R, k, 0.2, 0, Math.round(ts * sr));
    const tail = Math.round(0.15 * sr); for (let i = 0; i < tail; i++) { const w = i / tail; L[n - 1 - i] *= w; R[n - 1 - i] *= w; }
  });
});

define('membraneBurst', { family: 'organic', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'wet', 'organic'], dur: 0.6,
  desc: 'A gentle rupture: a soft low "pff" with a short falling thump, then a scatter of tiny droplets across the stereo field and a faint hush. Not a pop.',
  events: 'lysis; a capsule bursts open; an endosome releases cargo; a vesicle breaks; cargo release',
  from: 'research: bio_organic membraneBurst (sources 7, 15, 30)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const ng = 12 + Math.floor(r() * 13), rate = 0.12;
  play(0.75, (L, R) => {
    const x = noise(0.4), n = x.length;
    lp(x, i => pf * 1800 * Math.pow(400 / 1800, Math.min(1, i / (0.09 * sr))), 2); DSP.norm(x);
    for (let i = 0; i < n; i++) { const tt = i / sr; x[i] *= Math.min(1, tt / 0.002) * Math.exp(-tt / 0.055); }
    add(L, R, x, 1, 0);
    const th = mono(0.2); DSP.chirp(th, sr, 0, 0.32, 160 * pf, 70 * pf, 0.08, 0.05); add(L, R, th, 1, 0);
    // spray of tiny droplets: more of them early, each short and panned at random
    for (let k = 0; k < ng; k++) {
      const at = 0.02 - rate * Math.log(1 - r() * (1 - Math.exp(-0.4 / rate))), fq = Math.exp(Math.log(dd ? 700 : 1400) + r() * Math.log((dd ? 2600 : 4400) / (dd ? 700 : 1400))) * pf, p = H.rr(-0.8, 0.8), a = 0.6 * Math.exp(-at / 0.2) * H.rr(0.6, 1);
      const gl = (p + (o.pan || 0) + 1) * Math.PI / 4, i0 = Math.round(at * sr), tau = dd ? H.rr(0.004, 0.009) : H.rr(0.0012, 0.0026);
      DSP.chirp(L.subarray(i0), sr, 0, a * Math.cos(gl), fq, fq * 1.12, 0.004, tau, tau * 7); DSP.chirp(R.subarray(i0), sr, 0, a * Math.sin(gl), fq, fq * 1.12, 0.004, tau, tau * 7);
    }
    const h = lp(noise(0.2), 500, 2); DSP.norm(h); for (let i = 0; i < h.length; i++) h[i] *= Math.sin(Math.PI * i / h.length); add(L, R, h, 0.05, 0, Math.round(0.03 * sr));
  });
});

define('ionChannel', { family: 'organic', styles: ['3dlight'], tags: ['clinical', 'crisp', 'tonal'], dur: 2.0,
  desc: 'A tiny gate click opens a hollow tube, a sparse stream of soft pentatonic ions passes through it, and a softer click closes the gate; o.dur sets the open time.',
  events: 'an ion channel or nuclear pore opens; molecules cross a gate; a transporter; filtration',
  from: 'research: bio_organic ionChannel (sources 3, 5, 15)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const hp = (x, fc) => { let y = 0; const c = 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { y += c * (x[i] - y); x[i] -= y; } return x; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const D = o.dur || 1.8, key = (o.key == null ? 69 : o.key) + (o.pitch || 0), pool = [12, 14, 16, 19, 21, 24, 26, 28, 31, 33], peak = H.rr(10, 28), T = D + 0.5;
  play(T, (L, R) => {
    const n = L.length, xl = new Float32Array(n), xr = new Float32Array(n), nz = noise(T);
    lp(nz, 1500, 2); DSP.norm(nz);
    for (let i = 0; i < n; i++) { const tt = i / sr, w = tt > 0.02 && tt < D ? Math.pow(Math.sin(Math.PI * (tt - 0.02) / (D - 0.02)), 0.8) : 0; xl[i] = nz[i] * 0.04 * w; xr[i] = xl[i]; }
    let tt = 0.07, last = -1;
    for (;;) {
      const u = (tt - 0.07) / (D - 0.12); if (u >= 1) break;
      tt += -Math.log(1 - r()) / Math.max(3, peak * Math.pow(Math.sin(Math.PI * Math.max(0, u)), 0.7));
      if (tt > D - 0.05) break;
      let k; do { k = Math.floor(r() * pool.length); } while (k === last); last = k;
      const f = H.mtof(key + pool[k]) * H.semis(0.1), a = 0.17 * H.rr(0.6, 1), p = H.rr(-0.3, 0.3) + (o.pan || 0), gl = (H.clamp(p, -1, 1) + 1) * Math.PI / 4;
      DSP.modes(xl, sr, tt, [[f, a * Math.cos(gl), 0.02]]); DSP.modes(xr, sr, tt, [[f, a * Math.sin(gl), 0.02]]);
    }
    // the tube: a short feedback comb with a darkened loop gives a hollow resonance near 400 Hz
    const del = Math.round(0.0025 * sr), c = 1 - Math.exp(-TAU * 1000 / sr);
    for (const x of [xl, xr]) { const y = new Float32Array(n); let ls = 0; for (let i = 0; i < n; i++) { ls += c * ((i >= del ? y[i - del] : 0) - ls); y[i] = x[i] + 0.7 * ls; } for (let i = 0; i < n; i++) x[i] = 0.45 * x[i] + 0.8 * y[i]; }
    for (let i = 0; i < n; i++) { L[i] = xl[i]; R[i] = xr[i]; }
    // gate clicks
    const g1 = mono(0.05); DSP.burst(g1, sr, 0, 0.5, 0.004, 0.0006, r); hp(g1, 2000); DSP.modes(g1, sr, 0, [[1800 * pf, 0.5, 0.007]]); add(L, R, g1, 0.5, 0);
    const g2 = mono(0.05); DSP.burst(g2, sr, 0, 0.4, 0.004, 0.0008, r); hp(g2, 1500); DSP.modes(g2, sr, 0, [[1300 * pf, 0.5, 0.008]]); add(L, R, g2, 0.28, 0, Math.round(D * sr));
  });
});

define('cascade', { family: 'organic', styles: ['3dlight', 'doodle-draw'], tags: ['tonal', 'playful', 'premium'], dur: 1.7,
  desc: 'A signalling cascade of soft plucks: each stage has twice as many voices as the last, climbs one pentatonic step and fans wider in stereo, ending on one clean tone at the octave (doodle-draw: thumb-piano plucks).',
  events: 'signal transduction; a kinase cascade; immune activation; a chain reaction of icons; 1 to 2 to 4 to 8',
  from: 'research: bio_organic cascade (sources 2, 3)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const key = (o.key == null ? 69 : o.key) + (o.pitch || 0), steps = [0, 2, 4, 7, 9, 12], sp = H.rr(0.14, 0.16), win = 0.09;
  play(0.1 + sp * 5 + 1.3, (L, R) => {
    const pluck = (f, a, tau) => { const x = mono(tau * 7); DSP.modes(x, sr, 0, [[f, a, tau], [f * 2, a * 0.25, tau * 0.7]].concat(dd ? [[f * 5.4, a * 0.1, 0.02]] : []), Math.round(0.002 * sr)); return x; };
    for (let k = 0; k < 5; k++) {
      const cnt = 1 << k, spread = 0.2 * k, lvl = Math.pow(10, -3 * k / 20) * 0.5, t0 = 0.03 + k * sp;
      for (let j = 0; j < cnt; j++) {
        const st = steps[Math.max(0, Math.min(5, k + (k > 0 ? H.pick([-1, 0, 0, 1]) : 0)))], f = H.mtof(key + st) * Math.pow(2, H.rr(-8, 8) / 1200), p = H.rr(-1, 1) * spread;
        add(L, R, pluck(f, lvl * H.rr(0.75, 1), dd ? 0.11 : 0.085), 1, p, Math.round((t0 + (cnt > 1 ? win * r() : 0)) * sr));
      }
    }
    // result: one clean tone at the octave of the tonic
    const fr = H.mtof(key + 12), res = mono(1.3), tr = 0.03 + 5 * sp;
    DSP.modes(res, sr, 0, [[fr, 1, 0.16], [fr * 2, 0.15, 0.1]], 140); add(L, R, res, 0.55, 0, Math.round(tr * sr));
  });
});

define('annealSettle', { family: 'organic', styles: ['3dlight'], tags: ['tonal', 'soft', 'premium'], dur: 3.0,
  desc: 'Three soft wandering voices whose pitch jitter cools while the sound darkens, until they snap onto one open chord and ring out in a small room.',
  events: 'protein folding; equilibrium reached; annealing or a cooling system; a noisy search resolves into a pattern',
  from: 'research: bio_organic annealSettle (sources 3, 5)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const key = (o.key == null ? 69 : o.key) + (o.pitch || 0) - 12, notes = [key, key + H.pick([4, 7]), key + 12], tSnap = H.rr(1.45, 1.65), pans = [-0.35, 0.35, 0];
  const s = play(2.85, (L, R) => {
    const n = L.length, step = Math.round(0.04 * sr), sm = 1 - Math.exp(-1 / (0.025 * sr));
    const mix = new Float32Array(n);
    notes.forEach((nt, v) => {
      const f = H.mtof(nt); let tgt = gs() * 170, cur = tgt, ph = r() * TAU;
      const vl = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const tt = i / sr;
        if (i % step === 0) tgt = tgt * 0.9 + 105 * Math.exp(-tt / 0.6) * gs();
        const snapK = Math.min(1, Math.max(0, (tt - tSnap) / 0.12)), want = tgt * (1 - snapK * snapK * (3 - 2 * snapK));
        cur += sm * (want - cur); ph += TAU * f * Math.pow(2, cur / 1200) / sr;
        const rel = tt < tSnap + 0.4 ? 1 : Math.exp(-(tt - tSnap - 0.4) / 0.16);
        vl[i] = (Math.sin(ph) - 0.11 * Math.sin(3 * ph) + 0.04 * Math.sin(5 * ph)) * Math.min(1, tt / 0.12) * rel * 0.35;
      }
      const a = (pans[v] + (o.pan || 0) + 1) * Math.PI / 4; for (let i = 0; i < n; i++) { L[i] += vl[i] * Math.cos(a); R[i] += vl[i] * Math.sin(a); }
    });
    lp(L, i => 4000 * Math.pow(1500 / 4000, Math.min(1, i / (2.0 * sr))), 2); lp(R, i => 4000 * Math.pow(1500 / 4000, Math.min(1, i / (2.0 * sr))), 2);
    const tail = Math.round(0.15 * sr); for (let i = 0; i < tail; i++) { const w = i / tail; L[n - 1 - i] *= w; R[n - 1 - i] *= w; }
  });
  s.connect(H.gain(0.3)).connect(H.verb(out, { sec: 0.9, decay: 3, wet: 1, lp: 4500 }));
});


// ---------------------------------------------------------------- bio_a: liquid, gel and micro-fluid

define('diffuseDrift', { family: 'liquid', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'airy', 'organic', 'premium'], dur: 3.1,
  desc: 'A silky cloud of tiny soft ticks whose pitch wanders up and down in a random walk, Brownian motion made audible with no rising bubbles; o.dur sets the length and o.viscosity (0 to 1) makes it sparser and duller.',
  events: 'diffusion through gel or mucus; particles drift and jostle in crowded cytoplasm; nanoparticle penetration; random walks',
  from: 'research: bio_organic diffuseDrift (sources 3, 15, 16)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const D = o.dur || 3, visc = H.clamp(o.viscosity == null ? 0.3 : o.viscosity, 0, 1), rate = H.rr(25, 60) * (1 - 0.6 * visc), cut = (dd ? 5200 : 6000) * (1 - 0.55 * visc), reg = dd ? 0.72 : 1;
  const s = play(D + 0.1, (L, R) => {
    let tt = 0.02, f = H.rr(1500, 3000) * pf * reg, pan = 0;
    for (;;) {
      tt += -Math.log(1 - r()) / rate; if (tt > D - 0.05) break;
      f = H.clamp(f * Math.pow(2, gs() * 2.5 / 12), 900 * pf * reg, 5200 * pf * reg); pan = H.clamp(pan + gs() * 0.2, -0.6, 0.6);
      const a = Math.pow(10, H.clamp(-25 + gs() * 3, -30, -20) / 20), tau = dd ? H.rr(0.007, 0.012) : H.rr(0.004, 0.007), g = (H.clamp(pan + (o.pan || 0), -1, 1) + 1) * Math.PI / 4;
      DSP.modes(L, sr, tt, [[f, a * Math.cos(g), tau]]); DSP.modes(R, sr, tt, [[f, a * Math.sin(g), tau]]);
    }
    lp(L, cut, 2); lp(R, cut, 2);
    const fd = Math.round(0.15 * sr); for (let i = 0; i < fd; i++) { const w = i / fd; L[i] *= w; R[i] *= w; L[L.length - 1 - i] *= w; R[R.length - 1 - i] *= w; }
  }, 0.15);
  s.connect(H.verb(out, { sec: 0.03, decay: 2, wet: 0.2, lp: 5000 }));
});

define('mucusStretch', { family: 'liquid', styles: ['3dlight', 'doodle-draw'], tags: ['wet', 'soft', 'organic'], dur: 0.8,
  desc: 'A thick strand pulled apart: a low sticky creak of quickening pulses over a rising hum, then a soft release puff and two tiny drops. Dull and tasteful, never slimy.',
  events: 'a mucus layer; a sticky gel stretches; hydrogel; a biofilm; a drug sticks to mucosa and is pulled away',
  from: 'research: bio_organic mucusStretch (sources 7, 8)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const T = H.rr(0.45, 0.55);
  play(1.0, (L, R) => {
    const x = mono(1.0), n = x.length;
    // stick-slip: pulses whose spacing shrinks from 90 to 25 ms, each a short resonant burst
    for (let tt = 0.02; tt < T;) {
      const u = tt / T, fc = (380 + 320 * u) * pf * (1 + 0.06 * gs()), a = (0.55 + 0.45 * r()) * (0.6 + 0.4 * u);
      DSP.modes(x, sr, tt, [[fc, a, 0.0045]]); DSP.burst(x, sr, tt, a * 0.3, 0.006, 0.0012, r);
      tt += 0.09 * Math.pow(0.025 / 0.09, u) * H.rr(0.8, 1.2);
    }
    // under-tone rising as the strand thins
    let ph = 0;
    for (let i = 0; i < n; i++) { const tt = i / sr, u = Math.min(1, tt / (T + 0.05)); ph += TAU * pf * 140 * Math.pow(260 / 140, u) / sr; if (tt < T + 0.1) x[i] += 0.1 * Math.sin(ph) * Math.pow(Math.sin(Math.PI * tt / (T + 0.1)), 1.5); }
    // release: a short soft puff that opens upward, then two tiny drops
    const rl = noise(0.12); lp(rl, i => pf * 600 * Math.pow(3, Math.min(1, i / (0.05 * sr))), 2); DSP.norm(rl);
    const i0 = Math.round((T + 0.03) * sr); for (let i = 0; i < rl.length && i0 + i < n; i++) x[i0 + i] += 0.55 * rl[i] * Math.exp(-i / sr / 0.022);
    for (let k = 0; k < 2; k++) DSP.chirp(x, sr, T + 0.1 + k * H.rr(0.05, 0.09), dd ? 0.3 : 0.18, 700 * pf * H.semis(1.5), 900 * pf * H.semis(1.5), 0.03, 0.012);
    lp(x, dd ? 1800 : 1100, 2);
    const tl = Math.round(0.05 * sr); for (let i = 0; i < tl; i++) x[n - 1 - i] *= i / tl;
    add(L, R, x, 1, 0);
  });
});

define('gelWobble', { family: 'liquid', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'playful', 'sub'], dur: 0.9,
  desc: 'A jelly or hydrogel nudged and wobbling to rest: a dull low tone whose pitch and level waver at 5 to 7 Hz while it dies away; o.size makes a bigger, lower, slower wobble (doodle-draw: a livelier wobble).',
  events: 'hydrogel; a soft cell cluster shakes; tissue jiggle; a drop wobbles after landing',
  from: 'research: bio_organic gelWobble (sources 10, 25)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const size = o.size || 1, f0 = H.rr(170, 250) * pf / Math.pow(size, 0.5), rate = (dd ? 7 : 6) / Math.pow(size, 0.4) * H.rr(0.95, 1.05), dep = dd ? 0.06 : 0.04, ph0 = r() * 0.6;
  play(1.0, (L, R) => {
    const x = mono(1.0), n = x.length; let p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, w = Math.sin(TAU * rate * tt + ph0) * Math.exp(-tt / 0.26), f = f0 * (1 + dep * w);
      p1 += TAU * f / sr; p2 += TAU * f * 2.76 / sr;
      const am = 1 + 0.4 * Math.sin(TAU * rate * tt + ph0 + 0.8) * Math.exp(-tt / 0.26);
      x[i] = (Math.sin(p1) * Math.exp(-tt / 0.17) * am + 0.12 * Math.sin(p2) * Math.exp(-tt / 0.09)) * Math.min(1, tt / 0.003);
    }
    lp(x, 700, 2);
    const nudge = lp(noise(0.02), 450, 2); DSP.norm(nudge); for (let i = 0; i < nudge.length; i++) x[i] += 0.15 * nudge[i] * Math.exp(-i / sr / 0.006);
    const tl = Math.round(0.08 * sr); for (let i = 0; i < tl; i++) x[n - 1 - i] *= i / tl;
    add(L, R, x, 1, 0);
  });
});

define('capillaryFlow', { family: 'liquid', styles: ['3dlight'], tags: ['airy', 'clean', 'clinical'], dur: 3.3,
  desc: 'A thin quiet thread of liquid in a micro-channel: a narrow airy hiss with a slow shimmer and faint meniscus ticks, brightening as it fills (o.dir "out" drains, o.flat keeps it steady and loopable); o.dur sets the length.',
  events: 'microfluidics; capillary action; a lab-on-a-chip; a test strip wicking; thin vessels',
  from: 'research: bio_organic capillaryFlow (sources 9, 16)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const hp = (x, fc) => { let y = 0; const c = 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { y += c * (x[i] - y); x[i] -= y; } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const D = o.dur || 3, T = D + 0.2, up = o.dir !== 'out', ramp = !o.flat;
  const vn = rate => { const v = Array.from({ length: Math.ceil(T * rate) + 3 }, () => r() * 2 - 1); return tt => { const x = tt * rate, i = x | 0, f = x - i, s = f * f * (3 - 2 * f); return v[i] * (1 - s) + v[i + 1] * s; }; };
  const v3 = vn(3), v7 = vn(7), v5 = vn(5);
  const base = tt => pf * (ramp ? (up ? 2200 : 4200) * Math.pow(4200 / 2200, (up ? 1 : -1) * Math.min(1, tt / D)) : 3200);
  play(T, (L, R) => {
    const n = L.length, y1 = DSP.reson(noise(T), sr, i => base(i / sr) * (1 + 0.12 * v3(i / sr)), 520), y2 = DSP.reson(noise(T), sr, i => base(i / sr) * 1.75 * (1 + 0.1 * v5(i / sr)), 520);
    DSP.norm(y1); DSP.norm(y2);
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) { const tt = i / sr, fd = Math.min(1, tt / 0.08, (T - tt) / 0.12); x[i] = (y1[i] + 0.32 * y2[i]) * (1 + 0.25 * v7(tt)) * fd; }
    hp(x, 900);
    // meniscus ticks every 0.4 to 1.2 s
    for (let tt = H.rr(0.3, 0.7); tt < D - 0.1; tt += H.rr(0.4, 1.2)) { const k = mono(0.02); DSP.burst(k, sr, 0, 1, 0.005, 0.0007, r); hp(k, 4000); const i0 = Math.round(tt * sr); for (let i = 0; i < k.length; i++) x[i0 + i] += 0.35 * k[i]; }
    const p = H.rr(-0.15, 0.15); add(L, R, x, 1, p);
  }, 0.16);
});

define('dropMerge', { family: 'liquid', styles: ['3dlight', 'doodle-draw'], tags: ['wet', 'playful', 'tonal'], dur: 0.4,
  desc: 'Two small drops touch one after the other and fuse into one rounder, lower bloop with a tiny tick.',
  events: 'droplet coalescence; micelles or spheres merge; two cells join; two data points become one',
  from: 'research: bio_organic dropMerge (source 9)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const f1 = (dd ? H.rr(700, 1200) : H.rr(900, 1500)) * pf, gap = H.rr(0.015, 0.03), tm = H.rr(0.05, 0.07), rise = dd ? 1.28 : 1.2;
  play(0.6, (L, R) => {
    const a = mono(0.3), b = mono(0.3), m = mono(0.5);
    DSP.chirp(a, sr, 0, 0.7, f1, f1 * rise, 0.018, 0.02); DSP.chirp(b, sr, 0, 0.7, f1 * 1.25, f1 * 1.25 * rise, 0.018, 0.02);
    add(L, R, a, 1, -0.25); add(L, R, b, 1, 0.25, Math.round(gap * sr));
    DSP.chirp(m, sr, 0, 1, f1 * 0.62, f1 * 0.62 * 1.35, 0.06, 0.05);
    if (dd) DSP.modes(m, sr, 0, [[f1 * 1.3, 0.12, 0.03]]);
    const k = mono(0.01); DSP.burst(k, sr, 0, 1, 0.01, 0.0008, r); lp(k, dd ? 3000 : 2200); add(L, R, k, 0.2, 0, Math.round(tm * sr));
    add(L, R, m, 1, 0, Math.round(tm * sr));
  });
});

define('microBubbles', { family: 'liquid', styles: ['3dlight'], tags: ['bright', 'airy', 'clinical', 'playful'], dur: 1.5,
  desc: 'A glittering cloud of tiny pitched bubbles that thickens and thins, the smaller the bubble the higher and quieter, snapped to the music\'s pentatonic scale; o.dur sets the length, o.pop adds a soft collapse at the end.',
  events: 'microbubble contrast agents; ultrasound; cavitation; nanobubbles; gas-filled microspheres; oxygen carriers',
  from: 'research: bio_organic microBubbles (sources 9, 25)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const snap = (m, key) => { let b = Math.round(m); for (let d = 0; d < 6; d++) for (const c of [b + d, b - d]) if ([0, 2, 4, 7, 9].includes((((c - key) % 12) + 12) % 12)) return c; return b; };
  const D = o.dur || 1.4, nb = Math.round(H.rr(20, 60) * Math.min(1.6, D / 1.4)), key = (o.key == null ? 69 : o.key) + (o.pitch || 0);
  play(D + 0.35, (L, R) => {
    for (let k = 0; k < nb; k++) {
      const at = 0.02 + (D - 0.04) * (r() + r()) / 2, Rr = Math.exp(gs() * 0.33);
      let f = H.clamp(3300 / Rr * H.semis(0.3), 2200, 5600);
      if (r() < 0.7) f = H.clamp(H.mtof(snap(69 + 12 * Math.log2(f / 440), key)), 2100, 5800);
      const a = 0.3 * Math.min(1.6, Rr), tau = H.clamp(0.0045 * Rr, 0.0025, 0.008), p = H.rr(-0.7, 0.7), g = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, i0 = Math.round(at * sr);
      DSP.chirp(L.subarray(i0), sr, 0, a * Math.cos(g), f, f * 1.08, tau * 3, tau, tau * 8); DSP.chirp(R.subarray(i0), sr, 0, a * Math.sin(g), f, f * 1.08, tau * 3, tau, tau * 8);
    }
    if (o.pop) { const pp = hpf(noise(0.03)); add(L, R, pp, 0.12, 0, Math.round((D + 0.02) * sr)); }
    lp(L, 6000, 1); lp(R, 6000, 1);
  }, 0.16);
  function hpf(x) { let y = 0; const c = 1 - Math.exp(-TAU * 3000 / sr); for (let i = 0; i < x.length; i++) { y += c * (x[i] - y); x[i] = (x[i] - y) * Math.sin(Math.PI * i / x.length); } return x; }
});

define('accrete', { family: 'liquid', styles: ['3dlight'], tags: ['soft', 'tonal', 'premium', 'matte'], dur: 2.7,
  desc: 'Single soft taps on pentatonic notes speed up, narrow in pitch and fuse into a smooth silk-like sheen that settles on a quiet octave note, like a layer forming; o.dur sets the length.',
  events: 'nanoparticles coat a cell; layer-by-layer assembly; adsorption; particles stick to a surface; a film deposits',
  from: 'research: bio_organic accrete (sources 15, 16)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const snap = (m, key) => { let b = Math.round(m); for (let d = 0; d < 6; d++) for (const c of [b + d, b - d]) if ([0, 2, 4, 7, 9].includes((((c - key) % 12) + 12) % 12)) return c; return b; };
  const D = o.dur || 2, key = (o.key == null ? 69 : o.key) + (o.pitch || 0);
  play(D + 0.55, (L, R) => {
    const n = L.length;
    for (let tt = 0.02; tt < D;) {
      const u = tt / D, rate = 3 * Math.pow(30, u), spread = 18 - 12 * u, m = snap(key + 12 + spread * (r() * 2 - 1), key), f = H.mtof(m), a = Math.pow(10, -6 * u / 20) * (1 - 0.55 * Math.pow(Math.min(1, Math.max(0, (u - 0.75) / 0.25)), 2)) * H.rr(0.7, 1), p = H.rr(-0.4, 0.4), g = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4;
      DSP.modes(L, sr, tt, [[f, a * Math.cos(g), 0.007]]); DSP.modes(R, sr, tt, [[f, a * Math.sin(g), 0.007]]);
      tt += (1 / rate) * H.rr(0.6, 1.4);
    }
    // the sheen: pink-ish noise around 2.4 kHz that takes over once the taps are dense
    for (const X of [L, R]) {
      const sh = DSP.reson(noise(D + 0.55), sr, 2400, 3400); DSP.norm(sh);
      for (let i = 0; i < n; i++) { const tt = i / sr, u = tt / D, up = Math.min(1, Math.max(0, (u - 0.7) / 0.3)), e = tt < D + 0.05 ? up * up * (3 - 2 * up) : Math.exp(-(tt - D - 0.05) / 0.13); X[i] += 0.35 * sh[i] * e; }
    }
    // settle: a short quiet sine one octave above the tonic
    const st = mono(0.4); DSP.modes(st, sr, 0, [[H.mtof(key + 12), 1, 0.06]], Math.round(0.01 * sr)); add(L, R, st, 0.28, 0, Math.round((D + 0.04) * sr));
  });
});


// ---------------------------------------------------------------- bio_a: particles, charge and fields

define('chargeCancel', { family: 'tonal', styles: ['3dlight'], tags: ['tonal', 'clean', 'clinical'], dur: 1.0,
  desc: 'Two opposite glides, one rising and one falling, meet on one pitch while their pans converge; the second turns upside down so the sum nulls and the sound dies to silence with a tiny tick.',
  events: 'charges neutralise; positive meets negative; acid meets base; an antibody neutralises a virus; subtraction',
  from: 'research: bio_organic chargeCancel (source 5)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const f = H.mtof((o.key == null ? 69 : o.key) + (o.pitch || 0) + H.pick([0, -5])) * Math.pow(2, H.rr(-6, 6) / 1200), T = H.rr(0.5, 0.9), cs = Math.min(0.22, T * 0.35);
  play(T + 0.5, (L, R) => {
    const n = L.length, iT = Math.round(T * sr);
    const fA = tt => f * Math.pow(0.8, 1 - Math.min(1, tt / T)), fB = tt => f * Math.pow(1.25, 1 - Math.min(1, tt / T));
    let pa = 0, pb = 0; for (let i = 0; i < iT; i++) { pa += TAU * fA(i / sr) / sr; pb += TAU * fB(i / sr) / sr; }
    let qa = 0, qb = pa - pb;   // start B at the phase that makes both land together at the meeting point
    for (let i = 0; i < n; i++) {
      const tt = i / sr, x = Math.min(1, tt / T), sm = x * x * (3 - 2 * x), s = Math.min(1, Math.max(0, (tt - (T - cs)) / cs)), ss = s * s * (3 - 2 * s);
      qa += TAU * fA(tt) / sr; qb += TAU * fB(tt) / sr;
      const at = Math.min(1, tt / 0.03), master = (1 - 0.7 * ss) * at * (tt > T + 0.01 ? 0 : 1), pan = 0.6 * (1 - sm);
      const A = Math.sin(qa) * 0.5 * master, B = Math.sin(qb) * 0.5 * (1 - 2 * ss) * master;
      const ga = (-pan + 1) * Math.PI / 4, gb = (pan + 1) * Math.PI / 4;
      L[i] = A * Math.cos(ga) + B * Math.cos(gb); R[i] = A * Math.sin(ga) + B * Math.sin(gb);
    }
    const k = lp(mono(0.01), 1200); for (let i = 0; i < k.length; i++) k[i] = (r() * 2 - 1) * Math.exp(-i / sr / 0.0007);
    lp(k, 1200, 2); add(L, R, k, 0.12, 0, Math.round((T + 0.01) * sr));
  });
});

define('fieldPull', { family: 'tonal', styles: ['3dlight', 'doodle-draw'], tags: ['sub', 'warm', 'clinical'], dur: 1.7,
  desc: 'A magnetic or electric field approaching: a warm low hum that brightens and leans in while its tremolo accelerates, then a soft latch (doodle-draw: a woody latch); o.dur sets the approach time.',
  events: 'magnetism; magnetic nanoparticle targeting; field gradients; electrophoresis; electrostatic attraction',
  from: 'research: bio_organic fieldPull (source 21); a variant of magnet' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const f = H.rr(105, 135) * pf, tL = o.dur || 0.9, T = tL + 0.85;
  play(T, (L, R) => {
    const x = mono(T), n = x.length; let ph = 0, pa = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, u = Math.min(1, tt / tL);
      ph += TAU * f * (0.97 + 0.06 * u) / sr;
      if (tt < tL) pa += TAU * 2 * Math.pow(7, u) / sr;
      const u2 = Math.min(1, Math.max(0, (tt - tL) / 0.03)), am = (1 - 0.65 * (0.5 + 0.5 * Math.sin(pa))) * (1 - u2) + u2;
      const env = (0.3 + 0.7 * Math.pow(u, 1.5)) * Math.min(1, tt / 0.12) * (tt < tL + 0.08 ? 1 : Math.exp(-(tt - tL - 0.08) / 0.13));
      const w = Math.sin(ph) - Math.sin(3 * ph) / 9 + Math.sin(5 * ph) / 25 + 0.13 * Math.sin(1.5 * ph) + 0.06 * Math.sin(2 * ph);
      x[i] = w * am * env;
    }
    lp(x, i => (dd ? 260 : 300) * Math.pow(3, Math.min(1, i / (tL * sr))), 2);
    for (let i = 0; i < x.length; i++) x[i] *= 0.9;
    add(L, R, x, 1, 0);
    // latch
    const lt = mono(0.3), nz = noise(0.02);
    if (dd) { DSP.modes(lt, sr, 0, [[260 * pf, 0.8, 0.014], [520 * pf, 0.2, 0.008]]); lp(nz, 1200, 2); DSP.norm(nz); for (let i = 0; i < nz.length; i++) lt[i] += 0.3 * nz[i] * Math.exp(-i / sr / 0.004); }
    else { DSP.modes(lt, sr, 0, [[330 * pf, 0.7, 0.012]]); DSP.burst(lt, sr, 0, 0.3, 0.006, 0.0009, r); }
    add(L, R, lt, 1, 0, Math.round(tL * sr));
  });
});

// ---------------------------------------------------------------- bio_a: crystal, heat and phase change

define('crystalGrow', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['glassy', 'bright', 'cold', 'premium'], dur: 2.6,
  desc: 'A lattice assembling: tiny bright inharmonic ticks in a few short bursts that quicken as facets add, ending in a still, clear shimmer (3dlight: sparse and quiet; doodle-draw: frost tinkle with glass-bead taps); o.dur sets the length.',
  events: 'a crystal forms; nucleation and growth; precipitation; mineralisation; a solid emerges from solution; frost',
  from: 'research: bio_organic crystalGrow (sources 13, 15, 27)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const hp = (x, fc) => { let y = 0; const c = 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { y += c * (x[i] - y); x[i] -= y; } return x; };
  const D = o.dur || 2.5, G = Math.max(0.4, D - 0.75), f0 = H.rr(1100, 1700) * pf, ratios = dd ? [1, 1.34, 1.9, 2.5, 3.3, 4.1] : [1, 1.19, 1.71, 2.0, 2.74, 3.76];
  const bursts = Array.from({ length: 2 + Math.floor(r() * 2) }, () => G * H.rr(0.25, 0.9));
  play(D + 0.05, (L, R) => {
    const n = L.length;
    for (let tt = 0.03; tt < G;) {
      const k = Math.floor(r() * ratios.length), f = f0 * ratios[k] * (1 + 0.003 * gs()), a = Math.pow(10, H.rr(-26, -16) / 20) * 6 / (1 + 0.25 * k), tau = dd ? H.rr(0.01, 0.022) : H.rr(0.014, 0.03), p = H.rr(-0.5, 0.5), g = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, i0 = Math.round(tt * sr);
      DSP.modes(L.subarray(i0), sr, 0, [[f, a * Math.cos(g), tau]]); DSP.modes(R.subarray(i0), sr, 0, [[f, a * Math.sin(g), tau]]);
      if (dd) { DSP.burst(L.subarray(i0), sr, 0, a * 0.25 * Math.cos(g), 0.004, 0.0004, r); DSP.burst(R.subarray(i0), sr, 0, a * 0.25 * Math.sin(g), 0.004, 0.0004, r); }
      const inB = bursts.some(b => tt > b && tt < b + 0.12);
      tt += Math.max(0.012, (0.3 + 1.4 * r()) / (4 * Math.pow(7.5, tt / G) * (inB ? 3 : 1)));
    }
    // still shimmer: three held partials, each doubled 0.8 Hz apart so they beat slowly
    const ts = G - 0.1, len = n / sr - ts;
    [0, 3, 5].forEach((q, j) => {
      const f = f0 * ratios[q], p = (j - 1) * 0.3, g = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, ph = r() * TAU, i0 = Math.round(ts * sr);
      for (let i = 0; i + i0 < n; i++) { const u = i / sr / len, w = Math.pow(Math.sin(Math.PI * u), 2) * 0.05, tt = i / sr, v = w * (Math.sin(TAU * f * tt + ph) + Math.sin(TAU * (f + 0.8) * tt + ph + 1)); L[i0 + i] += v * Math.cos(g); R[i0 + i] += v * Math.sin(g); }
    });
    lp(L, 6000, 1); lp(R, 6000, 1); hp(L, 600); hp(R, 600);
  }, 0.15);
});

define('crystalDissolve', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['glassy', 'soft', 'airy'], dur: 2.8,
  desc: 'The reverse of crystalGrow: bright ticks thin out and sink slightly in pitch while the sound darkens and lengthens into a soft hush. Quiet, with no bubbles; o.dur sets the length.',
  events: 'dissolving; a tablet or salt disappears; melting away; disassembly; a layer fades out',
  from: 'research: bio_organic crystalDissolve (source 27); the quiet counterpart of fizz' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const hp = (x, fc) => { let y = 0; const c = 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { y += c * (x[i] - y); x[i] -= y; } return x; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const D = o.dur || 2.5, f0 = H.rr(1100, 1700) * pf, ratios = dd ? [1, 1.34, 1.9, 2.5, 3.3, 4.1] : [1, 1.19, 1.71, 2.0, 2.74, 3.76], tauR = D / 3.6;
  play(D + 0.3, (L, R) => {
    const n = L.length;
    for (let tt = 0.02; tt < D - 0.25;) {
      const u = tt / D, k = Math.floor(r() * ratios.length), f = f0 * ratios[k] * Math.exp(-0.151 * tt) * (1 + 0.003 * gs()), a = Math.pow(10, H.rr(-26, -16) / 20) * 6 / (1 + 0.25 * k), tau = (0.008 + 0.017 * u) * (dd ? 0.8 : 1), p = H.rr(-0.5, 0.5), g = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, i0 = Math.round(tt * sr);
      DSP.modes(L.subarray(i0), sr, 0, [[f, a * Math.cos(g), tau]]); DSP.modes(R.subarray(i0), sr, 0, [[f, a * Math.sin(g), tau]]);
      tt += Math.max(0.012, (0.3 + 1.4 * r()) / (24 * Math.exp(-tt / tauR) + 0.5));
    }
    // the hush: soft bandpassed noise that rises as the ticks fall away, then fades out
    for (const X of [L, R]) {
      const h = DSP.reson(noise(D + 0.3), sr, 1200, 1500); DSP.norm(h);
      for (let i = 0; i < n; i++) { const tt = i / sr, e = 0.025 * Math.pow(4, tt / D) * (tt > D - 0.4 ? 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, (tt - D + 0.4) / 0.7)) : 1); X[i] += h[i] * e; }
      lp(X, i => 6000 * Math.pow(1800 / 6000, Math.min(1, i / (D * sr))), 2); hp(X, 400);
    }
  }, 0.15);
});

define('fractureChirp', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['cold', 'bright', 'glassy'], dur: 0.5,
  desc: 'A short falling "pew" from a dispersive solid, a high tone dropping fast to a low one, with a faint echo from the boundary: a crystal cracks or a bond breaks (3dlight: lower and softer; doodle-draw: ice with tiny tinks).',
  events: 'a crystal cracks; a bond breaks; chain scission; a brittle shell shatters; thermal shock; ice',
  from: 'research: bio_organic fractureChirp (source 13)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const hp = (x, fc) => { let y = 0; const c = 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { y += c * (x[i] - y); x[i] -= y; } return x; };
  const T = H.rr(0.09, 0.22), hi = (dd ? 7200 : 4400) * pf * H.semis(0.5), lo = 700 * pf * H.semis(0.5), pan = H.rr(-0.2, 0.2);
  const crack = (buf, i0, amp, h, trav) => {
    const t0 = 0.015 * trav / 0.12, tau = trav / (dd ? 3.2 : 3.8), n = Math.min(buf.length - i0, Math.round(trav * 1.4 * sr)); let ph = 0;
    for (let i = 0; i < n; i++) { const tt = i / sr; ph += TAU * (lo + (h - lo) * t0 / (t0 + tt)) / sr; buf[i0 + i] += amp * Math.sin(ph) * Math.min(1, tt / (dd ? 0.0007 : 0.0015)) * Math.exp(-tt / tau); }
  };
  play(0.8, (L, R) => {
    const x = mono(0.8); crack(x, 0, 1, hi, T);
    crack(x, Math.round(H.rr(0.03, 0.06) * sr), 0.25, hi * 0.72, T * 0.7);
    const c = mono(0.01); DSP.burst(c, sr, 0, 1, 0.01, 0.0008, r); hp(c, 3000); for (let i = 0; i < c.length; i++) x[i] += (dd ? 0.5 : 0.3) * c[i];
    for (let k = 0; k < (dd ? 3 : 2); k++) DSP.modes(x, sr, T * H.rr(0.7, 1.4) + 0.05 * k, [[H.rr(2600, 4800) * pf, dd ? 0.09 : 0.05, 0.008]]);
    add(L, R, x, 1, pan);
  });
});

define('thermalTick', { family: 'material', styles: ['3dlight'], tags: ['metallic', 'clean', 'dry', 'clinical'], dur: 3.4,
  desc: 'Sparse dry metal ticks while something warms and expands: the ticking quickens and creeps up in pitch over a faint rising low hum; o.dur sets the length.',
  events: 'heating; a hot plate or heater; thermal expansion; an incubator warms; a thermocycler ramps',
  from: 'research: bio_organic thermalTick (source 15); pairs with relay' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const noise = len => { const x = mono(len); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; return x; };
  const D = o.dur || 3;
  play(D + 0.3, (L, R) => {
    const n = L.length;
    for (let tt = 0.05; tt < D;) {
      const u = tt / D, fc = 1 + 0.12 * u, a = Math.pow(10, gs() * 2.5 / 20), p = H.rr(-0.4, 0.4), g = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4;
      const k = mono(0.05); DSP.burst(k, sr, 0, 1, 0.005, 0.0006, r);
      const y = DSP.reson(k, sr, 2800 * fc * pf, 470); DSP.norm(y); DSP.modes(y, sr, 0, [[1900 * fc * pf * (1 + 0.03 * gs()), 0.5, 0.006]]);
      const i0 = Math.round(tt * sr); for (let i = 0; i < y.length && i0 + i < n; i++) { L[i0 + i] += y[i] * a * Math.cos(g); R[i0 + i] += y[i] * a * Math.sin(g); }
      tt += Math.max(0.045, (0.3 + 1.4 * r()) / (1.5 + 9.5 * u));
    }
    // the element energising: a very quiet low hum creeping up
    let ph = 0; for (let i = 0; i < n; i++) { const tt = i / sr, v = 0.15 * Math.sin(ph) * Math.min(1, tt / 0.3, (D + 0.3 - tt) / 0.3); ph += TAU * 55 * pf * Math.pow(70 / 55, Math.min(1, tt / D)) / sr; L[i] += v * 0.707; R[i] += v * 0.707; }
  }, 0.15);
});

define('meltDull', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['metallic', 'soft', 'tonal'], dur: 1.2,
  desc: 'A stiff ring loses its ring: four taps on a metallic body, each shorter, lower and duller, until it sags into a soft low thud.',
  events: 'melting; a solid softens; glass transition; wax or polymer melts; a rigid shell goes soft',
  from: 'research: bio_organic meltDull (sources 10, 11)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, pf = Math.pow(2, (o.pitch || 0) / 12), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), dd = o.style === 'doodle-draw', gs = () => (r() + r() + r() + r() - 2) * 1.732;
  const mono = len => new Float32Array(Math.ceil(sr * len));
  const add = (L, R, x, g, p, i0 = 0) => { const a = (H.clamp(p + (o.pan || 0), -1, 1) + 1) * Math.PI / 4, gl = g * Math.cos(a), gr = g * Math.sin(a), n = Math.min(x.length, L.length - i0); for (let i = 0; i < n; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const play = (dur, fill, level = 0.18) => { const n = Math.ceil(sr * dur), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); const k = level * lv / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = b; s.connect(out); s.start(t); return s; };
  const lp = (x, fc, k = 1) => { const fn = typeof fc === 'function'; for (let p = 0; p < k; p++) { let y = 0, c = fn ? 0 : 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < x.length; i++) { if (fn) c = 1 - Math.exp(-TAU * fc(i) / sr); y += c * (x[i] - y); x[i] = y; } } return x; };
  const f0 = (dd ? H.rr(520, 700) : H.rr(650, 900)) * pf, ratios = [1, 2.76, 5.4, 8.9], amps = [1, 0.5, 0.28, 0.16], t60 = [0.9, 0.5, 0.22, 0.07], cut = [8000, 3500, 1500, 700], gap = H.rr(0.24, 0.28);
  play(3 * gap + 1.0, (L, R) => {
    for (let k = 0; k < 4; k++) {
      const x = mono(1.0), pk = 1 - 0.06 * k / 3, tau = t60[k] / 6.91 * (dd ? 0.8 : 1);
      DSP.modes(x, sr, 0, ratios.map((q, j) => [f0 * q * pk, amps[j] * (dd ? 0.8 : 1), tau * (1 - 0.1 * j)]), Math.round((0.0015 + 0.0015 * k) * sr));
      lp(x, cut[k] * pf, 2);
      if (k >= 2) DSP.chirp(x, sr, 0, k === 3 ? 0.55 : 0.2, 150 * pf, 100 * pf, 0.05, 0.035);
      if (k < 3) { const d0 = Math.round((gap - 0.005) * sr); for (let i = d0; i < x.length; i++) x[i] *= Math.exp(-(i - d0) / sr / 0.045); }
      add(L, R, x, k === 3 ? 1.1 : 0.9, (k - 1.5) * 0.06, Math.round(k * gap * sr));
    }
  });
});

// ================================================================ Biology: pharma objects, medical signals, materials, textures (research/bio_organic.md)
// bio_b.js: pharma objects and release, medical signals and light, material bodies, textures.
// Catalog: sfx_research/bio_organic.md. Every effect here is written sample by sample into an AudioBuffer.

// ---------------------------------------------------------------- Pharma objects and release
define('capsuleOpen', { family: 'material', styles: ['3dlight'], tags: ['dry', 'soft', 'clinical', 'premium'], dur: 0.6,
  desc: 'A capsule parting: a dry plastic click and a faint second click, a soft breath of powder, then a few tiny granules scattering to either side.',
  events: 'a capsule opens; drug release starts; a shell splits; a pill breaks; cargo is released',
  from: 'research: bio_organic Pharma objects and release (capsuleOpen); sources 7, 30, 31' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, pf = Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.35);
  const n = Math.ceil(sr * 0.64), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const put = (x, at, pan, a) => { const i0 = Math.round(at * sr), p = (cl(pan, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(p) * a, gr = Math.sin(p) * a, m = Math.min(x.length, n - i0); for (let i = 0; i < m; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const pk = (x, a) => { let m = 1e-9; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); const k = a / m; for (let i = 0; i < x.length; i++) x[i] *= k; return x; };
  const send = level => { const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9; for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); } const k = level / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t); };
  const bp = (x, f, Q) => { const k = 2 * Math.sin(Math.PI * f / sr), q = 1 / Q, y = new Float32Array(x.length); let lo = 0, bd = 0; for (let i = 0; i < x.length; i++) { const hi = x[i] - lo - q * bd; bd += k * hi; lo += k * bd; y[i] = bd; } return y; };
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  // one half of the shell: a short bandpassed noise tick on a damped plastic body
  const shell = (f, a, at) => {
    const m = Math.round(0.16 * sr), x = new Float32Array(m), ns = new Float32Array(m), w = TAU * f / sr;
    for (let i = 0; i < 0.008 * sr; i++) ns[i] = (r() * 2 - 1) * Math.exp(-i / (0.0016 * sr));
    const bn = pk(bp(ns, 3500 * pf, 3), 0.5);
    for (let i = 0; i < m; i++) { const e = Math.min(1, i / 14);
      x[i] = bn[i] + e * (0.55 * Math.sin(w * i) * Math.exp(-i / (0.016 * sr)) + 0.17 * Math.sin(w * 2.07 * i) * Math.exp(-i / (0.006 * sr)) + 0.28 * Math.sin(w * 0.36 * i) * Math.exp(-i / (0.011 * sr))); }
    put(x, at, 0, a);
  };
  shell(1050 * pf, 1, 0.003);
  shell(1300 * pf, 0.32, 0.003 + 0.025 + 0.004 * (r() * 2 - 1));
  // powder puff: lowpassed noise that closes from 3 kHz to 700 Hz, one stereo-decorrelated copy per channel
  for (const ch of [L, R]) {
    const m = Math.round(0.34 * sr), x = new Float32Array(m); let y1 = 0, y2 = 0;
    for (let i = 0; i < m; i++) { const s = i / sr, fc = 3000 * Math.pow(700 / 3000, Math.min(1, s / 0.16)), a = 1 - Math.exp(-TAU * fc / sr);
      y1 += a * (r() * 2 - 1 - y1); y2 += a * (y1 - y2); x[i] = y2 * Math.min(1, s / 0.005) * Math.exp(-s / 0.06); }
    pk(x, 0.2 * (0.9 + 0.2 * r())); const i0 = Math.round(0.006 * sr); for (let i = 0; i < m && i0 + i < n; i++) ch[i0 + i] += x[i] * 0.8;
  }
  // granules: tiny ticks from 40 ms, exponentially thinning out, quieter as they go
  const ng = 8 + Math.floor(r() * 9);
  for (let k = 0; k < ng; k++) {
    const at = 0.04 - 0.12 * Math.log(1 - r() * (1 - Math.exp(-0.4 / 0.12)));
    const fc = 1800 * Math.pow(5000 / 1800, Math.pow(r(), 1.3)) * pf, tg = 0.0012 + 0.002 * r(), m = Math.round(tg * 8 * sr), x = new Float32Array(m);
    for (let i = 0; i < m; i++) x[i] = (0.85 * Math.sin(TAU * fc * i / sr) + 0.3 * (r() * 2 - 1)) * Math.exp(-i / (tg * sr)) * Math.min(1, i / 8);
    put(x, at, (r() * 2 - 1) * 0.7, 0.3 * Math.exp(-(at - 0.04) / 0.2) * (0.55 + 0.45 * r()));
  }
  send(0.18 * lj);
});

define('releaseCurve', { family: 'digital', styles: ['3dlight'], tags: ['soft', 'clean', 'clinical', 'tonal'], dur: 4,
  desc: 'A sparse trickle of tiny soft pentatonic grains over a faint glow; the number of grains per second follows a drug-release curve, busy at first and then tailing off.',
  events: 'controlled or sustained release; a pharmacokinetic curve is drawn; concentration against time; burst then plateau',
  from: 'research: bio_organic Pharma objects and release (releaseCurve); sources 5, 15, 21. Options: dur, curve (array of 0..1), key, pitch' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, pf = Math.pow(2, (o.pitch || 0) / 12);
  const dur = cl(o.dur || 4, 0.5, 30), D = dur + 0.2, n = Math.ceil(sr * D), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const put = (x, at, pan, a) => { const i0 = Math.round(at * sr), p = (cl(pan, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(p) * a, gr = Math.sin(p) * a, m = Math.min(x.length, n - i0); for (let i = 0; i < m; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const pk = (x, a) => { let m = 1e-9; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); const k = a / m; for (let i = 0; i < x.length; i++) x[i] *= k; return x; };
  const send = level => { const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9; for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); } const k = level / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; } const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t); };
  const bp = (x, f, Q) => { const k = 2 * Math.sin(Math.PI * f / sr), q = 1 / Q, y = new Float32Array(x.length); let lo = 0, bd = 0; for (let i = 0; i < x.length; i++) { const hi = x[i] - lo - q * bd; bd += k * hi; lo += k * bd; y[i] = bd; } return y; };
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  // the release curve: the caller's array (0..1 over the length) or a fast burst with a slow tail
  const cu = Array.isArray(o.curve) && o.curve.length > 1 ? o.curve : null;
  const cv = u => { u = cl(u, 0, 1); if (!cu) return 0.07 + 0.93 * Math.exp(-4.2 * u);
    const x = u * (cu.length - 1), i = Math.floor(x), f = x - i; return cl((+cu[i] || 0) * (1 - f) + (+cu[Math.min(cu.length - 1, i + 1)] || 0) * f, 0, 1); };
  // notes: major pentatonic of the key, spread over three octaves, never the same note twice in a row
  let base = o.key != null ? o.key : 69; while (base < 72) base += 12; while (base >= 84) base -= 12;
  const deg = [0, 2, 4, 7, 9]; let last = -1;
  const pick = () => { let m, tries = 0; do { const u = r(), off = u < 0.4 ? 0 : u < 0.8 ? 12 : 24; m = base + off + deg[Math.floor(r() * 5) % 5]; if (m > 108) m -= 12; } while (m === last && ++tries < 8); last = m; return H.mtof(m) * pf; };
  // grains: an inhomogeneous Poisson process by time rescaling
  let cum = 0, thr = -Math.log(1 - r()), cnt = 0; const dt = 0.0005;
  for (let s = 0; s < dur - 0.05; s += dt) {
    cum += 38 * cv(s / dur) * dt;
    if (cum >= thr) { cum -= thr; thr = -Math.log(1 - r()); const f = pick(), m = Math.round(0.1 * sr), x = new Float32Array(m), w = TAU * f / sr, ph = r() * TAU;
      for (let i = 0; i < m; i++) x[i] = Math.sin(ph + w * i) * Math.exp(-i / (0.010 * sr)) * Math.min(1, i / 48);
      put(x, s, (r() * 2 - 1) * 0.6, (cnt++ < 10 ? 1.41 : 1) * (0.45 + 0.55 * r()) / (1 + Math.pow(f / 3500, 2))); }
  }
  // glow: a faint bandpassed noise that follows the same curve
  for (const ch of [L, R]) {
    const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
    const y = pk(bp(x, 4000 * pf, 1), 1);
    for (let i = 0; i < n; i++) { const s = i / sr; ch[i] += y[i] * 0.07 * Math.pow(cv(s / dur), 0.8) * Math.min(1, s / 0.03); }
  }
  const fo = Math.round(0.18 * sr); for (let i = 0; i < fo; i++) { const g = 0.5 + 0.5 * Math.cos(Math.PI * i / fo); L[n - fo + i] *= g; R[n - fo + i] *= g; }
  send(0.18 * lj);
});

define('capTwist', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['plastic', 'dry', 'clean', 'woody'], dur: 1.2,
  desc: 'A cap screwed onto a vial: a ratchet of soft stick-slip ticks that slow down and creep up in pitch as the thread tightens, then a soft seat (soft plastic in 3dlight, a wooden or cork lid in doodle-draw).',
  events: 'closing a vial; sealing a sample; locking a cartridge; a screw cap; a lab prep step',
  from: 'research: bio_organic Pharma objects and release (capTwist); source 10. Flavour follows o.style (3dlight default, doodle-draw)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, dd = o.style === 'doodle-draw', pf = Math.pow(2, (o.pitch || 0) / 12);
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20), nT = 7 + Math.floor(r() * 5), f0 = (dd ? 820 : 1250) * pf * H.semis(0.35);
  H.buffer(out, t, 1.25, d => {
  const bp = (x, f, Q) => { const k = 2 * Math.sin(Math.PI * f / sr), q = 1 / Q, y = new Float32Array(x.length); let lo = 0, bd = 0; for (let i = 0; i < x.length; i++) { const hi = x[i] - lo - q * bd; bd += k * hi; lo += k * bd; y[i] = bd; } return y; };
    const add = (x, at, a) => { const i0 = Math.round(at * sr); for (let i = 0; i < x.length && i0 + i < d.length; i++) d[i0 + i] += x[i] * a; };
    const click = (len, tau) => { const m = Math.round(len * sr), x = new Float32Array(m); let p = 0; for (let i = 0; i < m; i++) { const v = r() * 2 - 1; x[i] = (v - p) * Math.exp(-i / (tau * sr)); p = v; } return x; };
    const tone = (f, tau, len, h2 = 0.2, tau2 = 0.003) => { const m = Math.round(len * sr), x = new Float32Array(m), w = TAU * f / sr;
      for (let i = 0; i < m; i++) x[i] = Math.min(1, i / 12) * (Math.sin(w * i) * Math.exp(-i / (tau * sr)) + h2 * Math.sin(w * 2.3 * i) * Math.exp(-i / (tau2 * sr))); return x; };
    let at = 0.02;
    for (let k = 0; k < nT; k++) {
      const u = k / (nT - 1), f = f0 * (1 + 0.08 * u) * (1 + 0.015 * (r() * 2 - 1)), a = (0.45 + 0.4 * u) * (0.85 + 0.3 * r());
      // friction rasp: grips as it builds, then the thread slips into the tick
      const iv = (55 + 40 * u) / 1000 * (1 + 0.06 * (r() * 2 - 1)), rl = Math.round(iv * 0.55 * sr), ra = new Float32Array(rl);
      for (let i = 0; i < rl; i++) ra[i] = r() * 2 - 1;
      const rb = bp(ra, dd ? 1200 : 2200, 1.5); let mx = 1e-9; for (let i = 0; i < rl; i++) mx = Math.max(mx, Math.abs(rb[i]));
      for (let i = 0; i < rl; i++) rb[i] *= Math.pow(i / rl, 2) / mx;
      add(rb, at - rl / sr, dd ? 0.13 : 0.07);
      add(click(0.002, 0.0005), at, dd ? 0.4 : 0.2);
      add(tone(f, dd ? 0.0075 : 0.006, 0.07), at, a);
      at += iv;
    }
    // seat: a soft thud with a short tone and a touch of click
    const sf = (dd ? 520 : 780) * pf, st = at + 0.01;
    add(tone(sf, 0.022, 0.2, 0.15, 0.008), st, 0.95);
    add(click(0.002, 0.0006), st, 0.3);
    add(tone(dd ? 90 : 120, 0.018, 0.12, 0, 0.01), st, dd ? 0.16 : 0.1);
  }, { level: 0.25 * lj, pan: o.pan || 0 });
});

// ---------------------------------------------------------------- Medical signals and light
define('dopplerFlow', { family: 'rhythm', styles: ['3dlight'], tags: ['clinical', 'airy', 'organic', 'soft'], dur: 4.5,
  desc: 'The warm rushing pulse of a Doppler ultrasound: band-limited noise that swells and sweeps up on each beat, with a small second bump, wide in stereo; a bed on the beat grid.',
  events: 'blood flow; a pulse through a vessel; perfusion; a patient-monitor beat; a heart-rate theme; a rhythmic bed on the beat grid',
  from: 'research: bio_organic Medical signals and light (dopplerFlow); sources 22, 23, 24. Options: bpm (default 106.7), dur (default 4.5 s = 8 beats)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU;
  const per = 60 / cl(o.bpm || 106.7, 40, 220), dur = cl(o.dur || 4.5, 0.8, 60), n = Math.ceil(sr * dur), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  // flow curve per beat: quick systolic rise, fall, a small second bump
  const c = new Float32Array(n).fill(0.08), bump = 0.42 * Math.min(1, per / 0.9);
  for (let k = 0; ; k++) {
    const b0 = 0.03 + k * per + per * 0.02 * (r() * 2 - 1); if (b0 + 0.42 > dur) break;
    const A = 0.94 + 0.06 * r(), i0 = Math.round(b0 * sr), len = Math.round(0.5 * sr);
    for (let i = 0; i < len && i0 + i < n; i++) { const s = i / sr;
      let v = s < 0.09 ? 0.5 - 0.5 * Math.cos(Math.PI * s / 0.09) : Math.exp(-(s - 0.09) / 0.07);
      v += 0.22 * Math.exp(-Math.pow((s - bump) / 0.035, 2));
      c[i0 + i] = Math.max(c[i0 + i], 0.08 + 0.92 * A * Math.min(1, v)); }
  }
  const f1 = new Float32Array(n), f2 = new Float32Array(n), amp = new Float32Array(n);
  for (let i = 0; i < n; i++) { const cf = 500 * Math.pow(5.2, c[i]); f1[i] = 2 * Math.sin(Math.PI * cf / sr); f2[i] = 2 * Math.sin(Math.PI * cf * 0.5 / sr); amp[i] = Math.pow(10, (-26 + 12 * c[i]) / 20); }
  const vnoise = (rate) => { const p = new Float32Array(Math.ceil(dur * rate) + 3); for (let i = 0; i < p.length; i++) p[i] = r() * 2 - 1; return i => { const x = i / sr * rate, k = x | 0, f = x - k, e = f * f * (3 - 2 * f); return p[k] * (1 - e) + p[k + 1] * e; }; };
  const k5 = 1 - Math.exp(-TAU * 5000 / sr), q = 1 / 1.2;
  for (const X of [L, R]) {
    const vn = vnoise(35); let lo = 0, bd = 0, lo2 = 0, bd2 = 0, a1 = 0, a2 = 0;
    for (let i = 0; i < n; i++) {
      const x = r() * 2 - 1, hi = x - lo - q * bd; bd += f1[i] * hi; lo += f1[i] * bd;
      const hi2 = x - lo2 - q * bd2; bd2 += f2[i] * hi2; lo2 += f2[i] * bd2;
      const y = (bd + 0.4 * bd2) * amp[i] * (1 + 0.2 * vn(i)); a1 += k5 * (y - a1); a2 += k5 * (a1 - a2); X[i] = a2;
    }
  }
  const fi = Math.round(0.05 * sr), fo = Math.round(0.12 * sr); for (let i = 0; i < fi; i++) { const g = 0.5 - 0.5 * Math.cos(Math.PI * i / fi); L[i] *= g; R[i] *= g; } for (let i = 0; i < fo; i++) { const g = 0.5 + 0.5 * Math.cos(Math.PI * i / fo); L[n - fo + i] *= g; R[n - fo + i] *= g; }
  const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9;
  for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.18 * lj / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t);
});

define('pulseOx', { family: 'digital', styles: ['3dlight'], tags: ['clinical', 'tonal', 'soft', 'data'], dur: 4,
  desc: 'A short run of soft, rounded monitor blips whose pitch climbs a value on a log scale, with a quiet two-note reference tone before every fourth blip; the blips wobble until they reach the target, then steady and brighten.',
  events: 'a value rising to target; SpO2 or oxygenation; concentration or efficacy as pitch; a dose-response; a reading settling',
  from: 'research: bio_organic Medical signals and light (pulseOx); source 21. Different from motion_ui oximeterBeep (a steady 3-step beep at heart rate): this is a continuous value trajectory with a reference tone. Options: from, to, target (0..1), beat, dur' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, pf = Math.pow(2, (o.pitch || 0) / 12);
  const beat = cl(o.beat || 0.45, 0.2, 1.5), dur = cl(o.dur || 4, 1, 30), b0 = 0.26;
  const nb = Math.max(2, Math.floor((dur - b0 - 0.25) / beat) + 1), v0 = o.from != null ? o.from : 0.25, v1 = o.to != null ? o.to : 0.82, tgt = o.target != null ? o.target : v1;
  const fv = v => 330 * Math.pow(2, 2 * cl(v, 0, 1)) * pf, lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  H.buffer(out, t, dur, d => {
    const blip = (at, v) => {
      const f = fv(v) * (1 + 0.006 * (r() * 2 - 1)), i0 = Math.round(at * sr), m = Math.round(0.26 * sr), wob = 0.4 * cl((tgt - v - 0.06) / 0.35, 0, 1), h2 = 0.04 + 0.14 * cl(v, 0, 1), a = 0.95 + 0.1 * r();
      let ph = 0; for (let i = 0; i < m && i0 + i < d.length; i++) { const s = i / sr; ph += TAU * f * (1 + 0.035 * Math.exp(-s / 0.012)) / sr;
        d[i0 + i] += a * (Math.sin(ph) + h2 * Math.sin(2 * ph)) * Math.min(1, s / 0.006) * Math.exp(-s / 0.045) * (1 - wob * (0.5 - 0.5 * Math.cos(TAU * 7 * s))); }
    };
    const beacon = at => { const f = fv(tgt), i0 = Math.round(at * sr), m = Math.round(0.3 * sr), w = TAU * f / sr;
      for (let i = 0; i < m && i0 + i < d.length; i++) { const s = i / sr; d[i0 + i] += 0.3 * (Math.sin(w * i) + 0.4 * Math.sin(w * 1.5 * i)) * Math.min(1, s / 0.01) * Math.exp(-s / 0.05); } };
    for (let k = 0; k < nb; k++) {
      const u = nb > 1 ? k / (nb - 1) : 1, v = v0 + (v1 - v0) * (1 - Math.pow(1 - u, 1.6)), bk = b0 + k * beat + 0.004 * (r() * 2 - 1);
      if (k % 4 === 0) beacon(bk - 0.24);
      blip(bk, v);
    }
  }, { level: 0.25 * lj, pan: o.pan || 0 });
});

define('stokesGlow', { family: 'tonal', styles: ['3dlight'], tags: ['glassy', 'bright', 'premium', 'tonal'], dur: 1.8,
  desc: 'A quick bright excitation blip followed at once by a lower, longer glow that blooms from dull to bright: fluorescence switching on.',
  events: 'fluorescence lighting up; a labelled structure glows; bioluminescence; a reporter or marker turns on; contrast imaging',
  from: 'research: bio_organic Medical signals and light (stokesGlow); sources 25, 27. Options: key, pitch' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU;
  let base = o.key != null ? o.key : 69; while (base < 69) base += 12; while (base >= 81) base -= 12;
  const f = H.mtof(base) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.35), D = 1.8, n = Math.ceil(sr * D), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20), t0 = 0.03, rat = [1, 2, 3, 4.01, 5.02], am = [1, 0.5, 0.33, 0.2, 0.12];
  const lfo = rat.map(() => ({ rate: 0.15 + 0.15 * r(), pl: r() * TAU, pr: r() * TAU, c: 3 * (0.6 + 0.4 * r()) }));
  const phL = new Float64Array(5), phR = new Float64Array(5);
  for (let i = Math.round(t0 * sr); i < n; i++) {
    const s = i / sr - t0, fc = 800 * Math.pow(7.5, Math.min(1, s / 0.4));
    const att = s < 0.22 ? Math.pow(Math.sin(Math.PI / 2 * s / 0.22), 1.5) : 1, xr = (s - 0.72) / 0.9, env = att * (xr <= 0 ? 1 : xr >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * xr));
    let vl = 0, vr = 0;
    for (let j = 0; j < 5; j++) {
      const fj = f * rat[j], w = 1 / Math.sqrt(1 + Math.pow(fj / fc, 4)) * am[j], lf = lfo[j];
      phL[j] += TAU * fj * Math.pow(2, lf.c / 1200 * Math.sin(TAU * lf.rate * s + lf.pl)) / sr; phR[j] += TAU * fj * Math.pow(2, lf.c / 1200 * Math.sin(TAU * lf.rate * s + lf.pr)) / sr;
      vl += w * Math.sin(phL[j]); vr += w * Math.sin(phR[j]);
    }
    L[i] += 0.28 * env * vl; R[i] += 0.28 * env * vr;
  }
  // the excitation: a quick upward-chirped blip an octave above the glow
  let pe = 0; for (let i = 0; i < 0.12 * sr; i++) { const s = i / sr; pe += TAU * 2 * f * (1 - 0.07 * Math.exp(-s / 0.003)) / sr; const v = 0.17 * Math.sin(pe) * Math.min(1, s / 0.001) * Math.exp(-s / 0.012); L[i] += v; R[i] += v; }
  // a breath of air at the switch-on
  let p1 = 0, p2 = 0; for (let i = 0; i < 0.06 * sr; i++) { const x1 = r() * 2 - 1, x2 = r() * 2 - 1, e = Math.exp(-i / (0.015 * sr)) * 0.04; L[i] += (x1 - p1) * e; R[i] += (x2 - p2) * e; p1 = x1; p2 = x2; }
  const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9;
  for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.18 * lj / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t);
});

define('phShift', { family: 'tonal', styles: ['3dlight'], tags: ['tonal', 'soft', 'clean', 'wet'], dur: 2.2,
  desc: 'A small drop lands, then a soft three-note chord fades in and its colour changes: for acid it brightens and its top note climbs a tone, for base it darkens and the top note settles down a tone.',
  events: 'a pH change; litmus or indicator colour; titration; an environment turns acidic; endosomal acidification',
  from: 'research: bio_organic Medical signals and light (phShift); source 25. Options: mode ("acid" default or "base"; o.dir "up"/"down" also works), key, pitch. The base move is a whole tone, not a semitone, to avoid a minor-ninth clash' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, pf = Math.pow(2, (o.pitch || 0) / 12), acid = !(o.mode === 'base' || o.dir === 'down');
  let rb = o.key != null ? o.key : 69; while (rb < 62) rb += 12; while (rb >= 74) rb -= 12;
  const notes = [rb, rb + 7, rb + 14], vp = [0, -0.25, 0.25], va = [1, 0.85, 0.7], D = 2.0, n = Math.ceil(sr * D), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20), slide0 = 0.2 + 0.04 * (r() * 2 - 1), slideT = 0.7 + 0.06 * (r() * 2 - 1), ph = [r() * TAU, r() * TAU, r() * TAU], fcA = acid ? [1500, 5000] : [4000, 1400];
  const gp = vp.map(p => { const q = (p + 1) * Math.PI / 4; return [Math.cos(q), Math.sin(q)]; });
  let l1 = 0, l2 = 0, r1 = 0, r2 = 0, mx = 1e-9;
  for (let i = 0; i < n; i++) {
    const s = i / sr, x = cl((s - slide0) / slideT, 0, 1), e = 0.5 - 0.5 * Math.cos(Math.PI * x), fc = fcA[0] * Math.pow(fcA[1] / fcA[0], e), a = 1 - Math.exp(-TAU * fc / sr);
    const env = s < 0.12 ? 0 : s < 0.2 ? 0.5 - 0.5 * Math.cos(Math.PI * (s - 0.12) / 0.08) : s < 1.15 ? 1 : s < 1.85 ? 0.5 + 0.5 * Math.cos(Math.PI * (s - 1.15) / 0.7) : 0;
    let sl = 0, sr_ = 0;
    if (env > 0) for (let v = 0; v < 3; v++) {
      const fv = H.mtof(notes[v] + (v === 2 ? (acid ? 2 : -2) * e : 0)) * pf; ph[v] += TAU * fv / sr;
      const N = Math.min(22, Math.floor(9000 / fv)); let y = 0; for (let k = 1; k <= N; k++) y += Math.sin(k * ph[v]) / Math.pow(k, 1.7);
      y *= va[v] * env; sl += y * gp[v][0]; sr_ += y * gp[v][1];
    }
    l1 += a * (sl - l1); l2 += a * (l1 - l2); r1 += a * (sr_ - r1); r2 += a * (r1 - r2); L[i] = l2; R[i] = r2; mx = Math.max(mx, Math.abs(l2), Math.abs(r2));
  }
  const kk = 0.6 / mx; for (let i = 0; i < n; i++) { L[i] *= kk; R[i] *= kk; }
  // the drop: a damped sine that rises 700 -> 1000 Hz
  const dr = new Float32Array(Math.round(0.25 * sr)); H.DSP.chirp(dr, sr, 0, 0.5, 700 * pf * H.semis(0.4), 1000 * pf, 0.045, 0.028);
  for (let i = 0; i < dr.length; i++) { L[i] += dr[i]; R[i] += dr[i]; }
  const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9;
  for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.18 * lj / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t);
});

// ---------------------------------------------------------------- Material bodies
define('ceramicTap', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['dry', 'crisp', 'premium', 'woody'], dur: 0.35,
  desc: 'A dry glazed "tok" from four quickly dying inharmonic modes and a low body knock (a hard tile or tablet in 3dlight, a warmer clay pot in doodle-draw).',
  events: 'a tablet or capsule shell lands; ceramic scaffolds; porcelain particles; a bead is tapped; a tablet drops after pressing',
  from: 'research: bio_organic Material bodies (ceramicTap); sources 10, 11. Flavour follows o.style (3dlight default, doodle-draw). Options: size (bigger is lower), hard (0..1), pitch' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, dd = o.style === 'doodle-draw', size = o.size > 0 ? o.size : 1;
  const f0 = (dd ? 680 : 900) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.4) / Math.sqrt(size), lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  const rat = dd ? [1, 2.2, 3.8, 5.6] : [1, 2.32, 4.25, 6.63], am = dd ? [1, 0.45, 0.2, 0.08] : [1, 0.55, 0.3, 0.14], t60 = dd ? [190, 80, 40, 22] : [150, 90, 50, 30];
  const hard = o.hard != null ? o.hard : 0.35 + 0.4 * r();
  H.buffer(out, t, 0.36, d => {
    H.DSP.modes(d, sr, 0.001, rat.map((q, k) => [f0 * q * (1 + 0.004 * (r() * 2 - 1)), am[k] * (0.9 + 0.2 * r()), t60[k] / 1000 / 6.9]), 18);
    H.DSP.modes(d, sr, 0.001, [[(dd ? 150 : 190) * Math.pow(2, (o.pitch || 0) / 12) / Math.sqrt(size), dd ? 0.4 : 0.22, dd ? 0.016 : 0.011]], 30);
    const m = Math.round(0.0015 * sr), fc = (dd ? 3000 : 3000 + 6000 * hard), a = 1 - Math.exp(-TAU * fc / sr); let p = 0, y = 0;
    for (let i = 0; i < m; i++) { const v = r() * 2 - 1; y += a * ((v - p) - y); p = v; d[Math.round(0.001 * sr) + i] += y * Math.exp(-i / (0.0006 * sr)) * (dd ? 1.2 : 2.2); }
  }, { level: 0.25 * lj, pan: o.pan || 0 });
});

define('bowlRing', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['glassy', 'tonal', 'warm', 'premium'], dur: 4.5,
  desc: 'A singing-bowl bloom: a soft strike and a long pure ring in which every mode is a pair of near-identical tones, so it beats slowly and shimmers across the stereo field (ceramic or glass vessel in 3dlight, a small brass bowl a fifth higher in doodle-draw).',
  events: 'a reveal or result; a hero moment; a long pause between beats; the end of a sequence; a ceramic or glass vessel',
  from: 'research: bio_organic Material bodies (bowlRing); sources 10, 11, 27. Flavour follows o.style (3dlight default, doodle-draw). Options: key, pitch' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, dd = o.style === 'doodle-draw';
  let m0 = o.key != null ? o.key : 69; while (m0 > 69) m0 -= 12; while (m0 <= 57) m0 += 12;
  const f0 = H.mtof(m0) * (dd ? 1.5 : 1) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.35), D = 4.4, n = Math.ceil(sr * D), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  const rat = dd ? [1, 2.71, 5.15, 8.4] : [1, 2.71, 5.15], am = dd ? [1, 0.5, 0.22, 0.07] : [1, 0.4, 0.15], t60 = dd ? [3.0, 1.6, 0.8, 0.4] : [3.5, 2.0, 1.0];
  const gA = [Math.cos(0.7 * Math.PI / 4), Math.sin(0.7 * Math.PI / 4)], gB = [gA[1], gA[0]], delta = 0.6 + 1.2 * r();
  for (let j = 0; j < rat.length; j++) {
    const fj = f0 * rat[j], dj = delta * Math.min(rat[j], 3), tau = t60[j] / 6.9, pa = r() * 0.4, pb = r() * 0.4, wa = TAU * (fj - dj / 2) / sr, wb = TAU * (fj + dj / 2) / sr, len = Math.min(n, Math.round(tau * 7.5 * sr));
    for (let i = 0; i < len; i++) { const s = i / sr, e = am[j] * 0.5 * Math.exp(-s / tau) * Math.min(1, s / 0.004), va = Math.sin(wa * i + pa) * e, vb = Math.sin(wb * i + pb) * e;
      L[i] += va * gA[0] + vb * gB[0]; R[i] += va * gA[1] + vb * gB[1]; }
  }
  // the strike: a soft 3 ms noise tap lowpassed near 2 kHz
  let y = 0; const ka = 1 - Math.exp(-TAU * 2000 / sr);
  for (let i = 0; i < 0.012 * sr; i++) { y += ka * (r() * 2 - 1 - y); const v = y * Math.exp(-i / (0.0012 * sr)) * Math.min(1, i / (0.002 * sr)) * (dd ? 0.7 : 0.45); L[i] += v; R[i] += v; }
  const fo = Math.round(0.1 * sr); for (let i = 0; i < fo; i++) { const g = 0.5 + 0.5 * Math.cos(Math.PI * i / fo); L[n - fo + i] *= g; R[n - fo + i] *= g; }
  const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let mx = 1e-9;
  for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; mx = Math.max(mx, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.16 * lj / mx; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = buf; const rv = H.verb(out, { sec: 1.8, decay: 3, wet: 0.25, lp: 5000 }); s.connect(out); s.connect(rv); s.start(t);
});

define('steelTick', { family: 'material', styles: ['3dlight'], tags: ['metallic', 'crisp', 'cold', 'clinical'], dur: 0.45,
  desc: 'A stainless instrument tick: a fine metallic tap with a short high ring made of free-bar modes, a faint knock underneath and no harsh top end.',
  events: 'an instrument tray; tweezers; a spatula; a thermocycler lid; metal touches metal',
  from: 'research: bio_organic Material bodies (steelTick); sources 10, 11, 31. Options: heavy (0..1, a heavier tool is lower and rings longer), pitch' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, hv = o.heavy === true ? 1 : +o.heavy || 0, lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  const f0 = 2000 * (1 - 0.4 * hv) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.5), rat = [1, 2.76, 5.4, 8.93], am = [1, 0.6, 0.35, 0.2], t60 = [220, 140, 80, 40];
  H.buffer(out, t, 0.52, d => {
    H.DSP.modes(d, sr, 0.001, rat.map((q, k) => { const f = f0 * q; return [f, am[k] * (0.9 + 0.2 * r()) / Math.sqrt(1 + Math.pow(f / 8000, 4)), t60[k] * (1 + hv) / 1000 / 6.9]; }), 14);
    H.DSP.modes(d, sr, 0.001, [[1200 * (1 - 0.3 * hv), 0.35, 0.0045]], 30);
    let p1 = 0, p2 = 0; for (let i = 0; i < 0.0012 * sr; i++) { const v = r() * 2 - 1; d[Math.round(0.001 * sr) + i] += (v - 2 * p1 + p2) * 0.07 * Math.exp(-i / (0.0004 * sr)); p2 = p1; p1 = v; }
  }, { level: 0.25 * lj, pan: o.pan || 0 });
});

define('rubberStretch', { family: 'material', styles: ['doodle-draw'], tags: ['organic', 'playful', 'noisy', 'natural'], dur: 0.9,
  desc: 'A balloon-skin stretch: stick-slip squeaks that speed up and rise as the tension builds, then a soft elastic thwip when it lets go.',
  events: 'a membrane is stretched; an elastic network; a balloon-like cell; a rubber band; polymer tension',
  from: 'research: bio_organic Material bodies (rubberStretch); source 10. Doodle-draw only: the catalog allows 3dlight only at very low level. Options: dur, pitch' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, pf = Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.35), Ts = cl((o.dur || 0.9) - 0.25, 0.25, 4), lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  H.buffer(out, t, Ts + 0.3, d => {
  const bp = (x, f, Q) => { const k = 2 * Math.sin(Math.PI * f / sr), q = 1 / Q, y = new Float32Array(x.length); let lo = 0, bd = 0; for (let i = 0; i < x.length; i++) { const hi = x[i] - lo - q * bd; bd += k * hi; lo += k * bd; y[i] = bd; } return y; };
    const n = d.length, e = new Float32Array(n); let at = 0.01;
    // stick-slip pulses: a short falling tooth every 35 ms, shrinking to 12 ms, growing louder with tension
    while (at < Ts) { const u = at / Ts, iv = 0.035 * Math.pow(12 / 35, u) * (1 + 0.14 * (r() * 2 - 1)), i0 = Math.round(at * sr), m = Math.round(0.004 * sr), a = 0.08 + 0.92 * Math.pow(u, 1.2);
      for (let j = 0; j < m && i0 + j < n; j++) e[i0 + j] += a * ((1 - 2 * j / m) * (0.5 - 0.5 * Math.cos(TAU * j / m)) + 0.1 * (r() * 2 - 1)); at += iv; }
    // a narrow resonance that climbs with the tension
    let lo = 0, bd = 0, lp = 0, hp = 0; const q = 1 / 8, kp = 1 - Math.exp(-TAU * 3600 / sr), kh = 1 - Math.exp(-TAU * 600 / sr), ns = Math.round(Ts * sr), y = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = Math.min(1, i / ns), f = 2 * Math.sin(Math.PI * 1100 * pf * Math.pow(2800 / 1100, u) / sr), hi = e[i] - lo - q * bd; bd += f * hi; lo += f * bd; hp += kh * (bd - hp); lp += kp * (bd - hp - lp); y[i] = lp; }
    let mx = 1e-9; for (let i = 0; i < ns; i++) mx = Math.max(mx, Math.abs(y[i]));
    const fo = Math.round(0.004 * sr), fi = Math.round(0.02 * sr);
    for (let i = 0; i < ns; i++) { let g = 0.55 / mx; if (i < fi) g *= i / fi; if (i > ns - fo) g *= (ns - i) / fo; d[i] += y[i] * g; }
    // let go: a quick falling thwip and a puff of air
    H.DSP.chirp(d, sr, Ts, 0.6, 600 * pf, 200 * pf, 0.06, 0.03);
    const pn = Math.round(0.012 * sr), px = new Float32Array(pn); for (let i = 0; i < pn; i++) px[i] = (r() * 2 - 1) * Math.exp(-i / (0.004 * sr));
    const pb = bp(px, 1500, 1); let pm = 1e-9; for (let i = 0; i < pn; i++) pm = Math.max(pm, Math.abs(pb[i])); for (let i = 0; i < pn; i++) d[Math.round(Ts * sr) + i] += pb[i] / pm * 0.3;
  }, { level: 0.25 * lj, pan: o.pan || 0 });
});

define('paperCrumple', { family: 'material', styles: ['doodle-draw'], tags: ['crisp', 'natural', 'noisy', 'dry'], dur: 1.6,
  desc: 'A sheet of paper crumpled in the hand: a flurry of dry crackles of very unequal loudness that thins out, over a faint low rustle.',
  events: 'notebook pages; crumpling a draft; discarded paper; a scrunched sheet; a hand-drawn transition',
  from: 'research: bio_organic Material bodies (paperCrumple); source 14 (power-law crackle energy). Options: dur' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, Tc = o.dur ? cl(o.dur - 0.2, 0.4, 8) : 0.85 + 0.5 * r(), D = Tc + 0.3, n = Math.ceil(sr * D), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1);
  const put = (x, at, pan, a) => { const i0 = Math.round(at * sr), p = (cl(pan, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(p) * a, gr = Math.sin(p) * a, m = Math.min(x.length, n - i0); for (let i = 0; i < m; i++) { L[i0 + i] += x[i] * gl; R[i0 + i] += x[i] * gr; } };
  const bp = (x, f, Q) => { const k = 2 * Math.sin(Math.PI * f / sr), q = 1 / Q, y = new Float32Array(x.length); let lo = 0, bd = 0; for (let i = 0; i < x.length; i++) { const hi = x[i] - lo - q * bd; bd += k * hi; lo += k * bd; y[i] = bd; } return y; };
  const lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20), spike = new Float32Array(n);
  const click = (at, E, pan) => {
    const fc = 2000 * Math.pow(3, r()), tau = 0.0015 + 0.0004 * E, m = Math.max(16, Math.round(tau * 7 * sr)), x = new Float32Array(m);
    for (let i = 0; i < m; i++) x[i] = (r() * 2 - 1) * Math.exp(-i / (tau * sr));
    const y = bp(x, fc, 1.5); let mx = 1e-9; for (let i = 0; i < m; i++) mx = Math.max(mx, Math.abs(y[i])); const a = 0.18 * Math.sqrt(E) / mx;
    for (let i = 0; i < m; i++) y[i] *= a; put(y, at, pan, 1); const si = Math.round(at * sr); if (si < n) spike[si] = Math.max(spike[si], Math.sqrt(E));
  };
  let cum = 0, thr = -Math.log(1 - r()); const dt = 0.0005;
  for (let s = 0; s < Tc; s += dt) {
    const u = s / Tc; cum += (28 + 62 * Math.exp(-s / (0.4 * Tc))) * (1 - u * u) * dt;
    if (cum >= thr) { cum -= thr; thr = -Math.log(1 - r());
      const E = Math.min(30, 1 / Math.pow(1 - r(), 2)), pan = (r() * 2 - 1) * 0.5; click(s, E, pan);
      if (r() < 0.1) click(s + 0.008 + 0.007 * r(), E * 0.4, pan); }
  }
  // under-layer: a low rustle that follows how busy the crumple is
  for (const ch of [L, R]) {
    let a1 = 0, a2 = 0, en = 0; const k4 = 1 - Math.exp(-TAU * 400 / sr), dec = Math.exp(-1 / (0.08 * sr)), x = new Float32Array(n); let mx = 1e-9;
    for (let i = 0; i < n; i++) { a1 += k4 * (r() * 2 - 1 - a1); a2 += k4 * (a1 - a2); en = Math.max(en * dec, spike[i]); x[i] = a2 * Math.min(1, en); mx = Math.max(mx, Math.abs(x[i])); }
    for (let i = 0; i < n; i++) ch[i] += x[i] / mx * 0.05;
  }
  const fo = Math.round(0.05 * sr); for (let i = 0; i < fo; i++) { const g = 0.5 + 0.5 * Math.cos(Math.PI * i / fo); L[n - fo + i] *= g; R[n - fo + i] *= g; }
  const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9;
  for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.18 * lj / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t);
});

define('sheetSlide', { family: 'transition', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'airy', 'natural', 'premium'], dur: 1,
  desc: 'The silky friction of a thin sheet sliding over another: narrow soft noise that sweeps up with a slow swell, a faint grain and a few fibre catches, panning across (silk film in 3dlight, paper or cloth rubbing in doodle-draw).',
  events: 'tissue layers sliding; fabric; a film moving; layered materials; a smooth dissolve between layers',
  from: 'research: bio_organic Material bodies (sheetSlide); sources 16, 32. Flavour follows o.style (3dlight default, doodle-draw). Options: dur, dir ("up"/"right" pans left to right and rises; "down"/"left" the reverse)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, dd = o.style === 'doodle-draw', pf = Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.3);
  const dur = cl(o.dur || 1, 0.3, 8), n = Math.ceil(sr * dur), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1), lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  const rev = o.dir === 'down' || o.dir === 'left', Q = dd ? 0.9 : 1.4, q = 1 / Q, f0 = (dd ? 1100 : 1600) * pf, f1 = (dd ? 2200 : 2800) * pf, depth = dd ? 0.5 : 0.25;
  const am = new Float32Array(Math.ceil(dur * 50) + 3); for (let i = 0; i < am.length; i++) am[i] = r() * 2 - 1;
  const rate = 25 + 25 * r(), att = 0.12 * dur, rel = 0.26 * dur, kh = 1 - Math.exp(-TAU * 500 / sr);
  let lo = 0, bd = 0, hp = 0, mx = 1e-9; const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = i / sr, u = rev ? 1 - s / dur : s / dur, f = 2 * Math.sin(Math.PI * f0 * Math.pow(f1 / f0, u) / sr), x = r() * 2 - 1, hi = x - lo - q * bd; bd += f * hi; lo += f * bd;
    hp += kh * (bd - hp); const xa = s * rate, ka = xa | 0, fa = xa - ka, g = 1 + depth * (am[ka] * (1 - fa) + am[ka + 1] * fa);
    const e = s < att ? 0.5 - 0.5 * Math.cos(Math.PI * s / att) : s > dur - rel ? 0.5 + 0.5 * Math.cos(Math.PI * (s - (dur - rel)) / rel) : 1;
    y[i] = (bd - hp) * Math.max(0, g) * e; mx = Math.max(mx, Math.abs(y[i]));
  }
  for (let i = 0; i < n; i++) { const u = i / n, pan = rev ? 0.6 - 1.2 * u : -0.6 + 1.2 * u, p = (pan + 1) * Math.PI / 4, v = y[i] / mx * 0.9; L[i] = v * Math.cos(p); R[i] = v * Math.sin(p); }
  // fibre catches: a few tiny bright ticks
  const nc = dd ? 4 + Math.floor(r() * 3) : 2 + Math.floor(r() * 3);
  for (let k = 0; k < nc; k++) {
    const at = (0.15 + 0.7 * r()) * dur, i0 = Math.round(at * sr), pan = (r() * 2 - 1) * 0.6, p = (pan + 1) * Math.PI / 4, a = (dd ? 0.4 : 0.25) * (0.6 + 0.4 * r()); let pv = 0;
    for (let i = 0; i < 0.003 * sr && i0 + i < n; i++) { const v = r() * 2 - 1, w = (v - pv) * Math.exp(-i / (0.0009 * sr)) * a; pv = v; L[i0 + i] += w * Math.cos(p); R[i0 + i] += w * Math.sin(p); }
  }
  const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9;
  for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.18 * lj / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t);
});

// ---------------------------------------------------------------- Textures and ambiences
define('vitalTone', { family: 'texture', styles: ['3dlight', 'doodle-draw'], tags: ['tonal', 'natural', 'sub', 'soft'], dur: 8,
  desc: 'The cell as a steady tone: alive is a pure, softly breathing hum near 880 Hz with a faint halo; dead is a low dull rumble; the two crossfade when the state changes.',
  events: 'viability; treated against untreated; live and dead contrast; a healthy and a dying cell; an "is it working" indicator',
  from: 'research: bio_organic Textures and ambiences (vitalTone); source 6 (yeast sonocytology). Options: alive (0..1, default 1), from (start state, default alive), at (s), fade (s, default 2.5), dur, key, pitch. 3dlight is a pure sine; doodle-draw adds warm harmonics and a slow shimmer' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, cl = H.clamp, TAU = H.TAU, dd = o.style === 'doodle-draw';
  const dur = cl(o.dur || 8, 2, 60), n = Math.ceil(sr * dur), buf = ac.createBuffer(2, n, sr), L = buf.getChannelData(0), R = buf.getChannelData(1), lj = Math.pow(10, (r() * 2 - 1) * 1.5 / 20);
  const alive = cl(o.alive != null ? o.alive : 1, 0, 1), from = cl(o.from != null ? o.from : alive, 0, 1), fade = cl(o.fade || 2.5, 0.5, 10), at = o.at != null ? o.at : Math.max(0.6, dur * 0.35);
  const key = o.key != null ? o.key : 69, fm = 81 + ((((key - 81 + 6) % 12) + 12) % 12) - 6, f0 = H.mtof(fm) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.35);
  const bp = (x, f, Q) => { const k = 2 * Math.sin(Math.PI * f / sr), q = 1 / Q, y = new Float32Array(x.length); let lo = 0, bd = 0; for (let i = 0; i < x.length; i++) { const hi = x[i] - lo - q * bd; bd += k * hi; lo += k * bd; y[i] = bd; } return y; };
  const vnoise = rate => { const p = new Float32Array(Math.ceil(dur * rate) + 3); for (let i = 0; i < p.length; i++) p[i] = r() * 2 - 1; return i => { const x = i / sr * rate, k = x | 0, f = x - k, e = f * f * (3 - 2 * f); return p[k] * (1 - e) + p[k + 1] * e; }; };
  const aw = new Float32Array(n); let lo = 1, hi = 0;
  for (let i = 0; i < n; i++) { const x = cl((i / sr - at) / fade, 0, 1), e = x * x * (3 - 2 * x); aw[i] = from + (alive - from) * e; lo = Math.min(lo, aw[i]); hi = Math.max(hi, aw[i]); }
  const rmsTo = (x, target) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; const k = target / Math.sqrt(s / x.length + 1e-12); for (let i = 0; i < x.length; i++) x[i] *= k; return x; };
  const nz = () => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; };
  const lay = [new Float32Array(n), new Float32Array(n)], dead = [new Float32Array(n), new Float32Array(n)];
  if (hi > 0.001) {
    // alive: a stable pure tone with a tiny jitter and a slow breath, in a narrow halo of noise
    const jit = vnoise(4), bph = r() * TAU; let ph = 0, pb = 0; const tone = new Float32Array(n);
    for (let i = 0; i < n; i++) { const s = i / sr, f = f0 * (1 + 0.002 * jit(i)), br = 1 + 0.15 * Math.sin(TAU * 0.12 * s + bph); ph += TAU * f / sr; pb += TAU * (f + 0.9) / sr;
      tone[i] = br * (dd ? Math.sin(ph) + 0.2 * Math.sin(2 * ph + 0.5) + 0.07 * Math.sin(3 * ph) + 0.35 * Math.sin(pb) : Math.sin(ph)); }
    rmsTo(tone, 0.707);
    for (let c = 0; c < 2; c++) { const sk = rmsTo(bp(nz(), f0, 4), dd ? 0.28 : 0.2); for (let i = 0; i < n; i++) lay[c][i] = tone[i] + sk[i]; }
  }
  if (lo < 0.999) {
    // dead: low, dull rumble, drifting slowly
    for (let c = 0; c < 2; c++) { const x = nz(), d = dead[c], md = vnoise(0.8); let a1 = 0, a2 = 0, h = 0; const k1 = 1 - Math.exp(-TAU * 140 / sr), kh = 1 - Math.exp(-TAU * 35 / sr);
      for (let i = 0; i < n; i++) { a1 += k1 * (x[i] - a1); a2 += k1 * (a1 - a2); h += kh * (a2 - h); d[i] = (a2 - h) * (1 + 0.25 * md(i)); }
      rmsTo(d, 1.1); }
  }
  const fi = Math.round(0.3 * sr), fo = Math.round(0.5 * sr);
  for (let i = 0; i < n; i++) {
    const ga = Math.sqrt(aw[i]), gd = Math.sqrt(1 - aw[i]), env = i < fi ? 0.5 - 0.5 * Math.cos(Math.PI * i / fi) : i > n - fo ? 0.5 + 0.5 * Math.cos(Math.PI * (i - (n - fo)) / fo) : 1;
    L[i] = (ga * lay[0][i] + gd * dead[0][i]) * env; R[i] = (ga * lay[1][i] + gd * dead[1][i]) * env;
  }
  const pp = (cl(o.pan || 0, -1, 1) + 1) * Math.PI / 4, gl = Math.cos(pp) * Math.SQRT2, gr = Math.sin(pp) * Math.SQRT2; let m = 1e-9;
  for (let i = 0; i < n; i++) { L[i] *= gl; R[i] *= gr; m = Math.max(m, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.12 * lj / m; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = buf; s.connect(out); s.start(t);
});

// ================================================================ Synthesis: material hits, bells, impacts (research/synthesis.md)
// synth_a.js: material hits, tonal accents and bells, impacts (from sfx_research/synthesis.md).
// Only define(...) calls. Every effect is written at sample level, so none of the Web Audio traps apply
// (no DelayNode feedback clamp, no WaveShaper input clamp). Notes: o.note (MIDI) wins, otherwise a pentatonic
// degree of o.key (default 69) is folded into the effect's own register; o.pitch transposes in semitones.

// ---------------------------------------------------------------------------------------------- Materials
define('handbellBeat', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['glassy', 'bright', 'tonal', 'premium'], dur: 2.1,
  desc: 'A small, bright handbell whose tone slowly breathes, because every partial is a close pair that beats against itself.',
  events: 'a success tick; a new item is added; a notification-level accent',
  from: 'research: synthesis.md Material hits, handbellBeat (Csound handbell doublet table, source 1)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, key = o.key ?? 69;
  const m = o.note != null ? o.note : 72 + (((key + H.pick([0, 0, 7, 4, 9, 2]) - 72) % 12) + 12) % 12;
  const s = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.15) / 1312;
  // [freq a, freq b, gain, T60 s] at scale 1; the 27 Hz pair is kept quieter so the top stays soft
  const pairs = [[1312.0, 1314.5, 1, 2.4], [2353.3, 2362.9, 0.7, 1.6], [3306.5, 3309.4, 0.5, 1.1], [3923.8, 3928.2, 0.45, 0.8], [4966.6, 4993.7, 0.21, 0.5], [5994.4, 6003.0, 0.2, 0.35]];
  const used = r() < 0.5 ? 5 : 6, dv = H.rr(0.88, 1.12);
  H.buffer(out, t, 2.4, d => {
    const list = [];
    // the second member of each pair is 4-5 dB quieter, so the tone breathes (about 8 dB) instead of cancelling
    for (let k = 0; k < used; k++) { const [fa, fb, g, t60] = pairs[k], tau = t60 * dv / 6.908; list.push([fa * s, g, tau], [fb * s, g * H.rr(0.55, 0.7), tau]); }
    H.DSP.modes(d, sr, 0, list, 0.0015 * sr);
    // clapper: a 2 ms noise tick, highpassed at 4 kHz
    const kc = 1 - Math.exp(-H.TAU * 4000 / sr), nc = 0.004 * sr | 0; let lp = 0;
    for (let i = 0; i < nc; i++) { const x = (r() * 2 - 1) * Math.exp(-i / (0.0007 * sr)); lp += kc * (x - lp); d[i] += 0.25 * (x - lp); }
    for (let i = 0, m = 0.1 * sr | 0; i < m; i++) d[d.length - 1 - i] *= i / m;   // close the tail smoothly
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('tuningForkPing', { family: 'material', styles: ['3dlight'], tags: ['cold', 'clinical', 'tonal', 'bright'], dur: 3.2,
  desc: 'A pure, clinical ping: a very brief metallic tink at the start, then a long, almost sine tail that wavers slightly.',
  events: 'a measurement starts; a calibration finishes; a number is revealed; a lab instrument cue',
  from: 'research: synthesis.md Material hits, tuningForkPing (cantilever beam modes 1 : 6.267 : 17.55)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, key = o.key ?? 69;
  const m = o.note != null ? o.note : 72 + (((key + H.pick([0, 7, 4, 0, 9]) - 72) % 12) + 12) % 12;
  const f = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.15), T = H.rr(0.9, 1.1);
  H.buffer(out, t, 3.3, d => {
    H.DSP.modes(d, sr, 0, [[f, 1, 3.5 * T / 6.908], [f * 6.267, 0.35, 0.12 / 6.908], [f * 17.55, 0.08, 0.03 / 6.908], [f * 2, 0.04, T / 6.908]], 0.001 * sr);
    // strike: 1.5 ms noise highpassed at 3 kHz
    const kc = 1 - Math.exp(-H.TAU * 3000 / sr), nc = 0.003 * sr | 0; let lp = 0;
    for (let i = 0; i < nc; i++) { const x = (r() * 2 - 1) * Math.exp(-i / (0.0005 * sr)); lp += kc * (x - lp); d[i] += 0.2 * (x - lp); }
    // slow waver after the first second, like a fork beating against itself
    const ph = r() * H.TAU;
    for (let i = sr | 0; i < d.length; i++) { const u = i / sr - 1; d[i] *= 1 + 0.06 * Math.sin(ph + H.TAU * 0.3 * u) * Math.min(1, u / 0.5); }
    for (let i = 0, m = 0.2 * sr | 0; i < m; i++) d[d.length - 1 - i] *= i / m;
  }, { level: 0.19 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('woodBlockTok', { family: 'material', styles: ['doodle-draw'], tags: ['woody', 'warm', 'crisp', 'natural'], dur: 0.2,
  desc: 'A short, dry wooden tok, hollow or solid, with almost no sustain and a small thock underneath.',
  events: 'a pen taps a diagram; labels snap into place; ticks along a timeline',
  from: 'research: synthesis.md Material hits, woodBlockTok (STK ModalBar wood presets, source 3)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, key = o.key ?? 69;
  const m = o.note != null ? o.note : 67 + (((key + H.pick([0, 2, 4, 7, 9]) - 67) % 12) + 12) % 12;
  const f0 = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.2);
  // [ratios, gains, T60 ms]; T60s are the STK values (39/26/26/16 ms) stretched by about 2.3 so the tok has some body
  const kinds = {
    solid: [[1, 2.777, 7.378, 15.377], [1, 0.25, 0.25, 0.2], [90, 60, 60, 36]],
    hollow: [[1, 1.777, 2.378, 3.377], [1, 0.45, 0.3, 0.2], [110, 75, 62, 45]],
    cedar: [[1, 1.47, 2.09, 2.56], [1, 0.6, 0.4, 0.3], [100, 70, 56, 44]],
  };
  const [ratios, gains, t60] = kinds[o.kind] || kinds[H.pick(['hollow', 'hollow', 'solid', 'cedar'])];
  const pos = H.rr(0.14, 0.5); // strike position tilts the gains
  H.buffer(out, t, 0.34, d => {
    const list = ratios.map((q, k) => [f0 * q, gains[k] * (0.4 + 0.6 * Math.abs(Math.sin((k + 1) * Math.PI * pos))), t60[k] * H.rr(0.92, 1.08) / 6908]);
    H.DSP.modes(d, sr, 0, list, 0.0004 * sr);
    // contact: 0.8 ms noise lowpassed at 5 kHz, plus a soft body thock
    const kc = 1 - Math.exp(-H.TAU * 5000 / sr), nc = 0.003 * sr | 0; let lp = 0;
    for (let i = 0; i < nc; i++) { const x = (r() * 2 - 1) * Math.exp(-i / (0.0003 * sr)); lp += kc * (x - lp); d[i] += 0.5 * lp; }
    const wb = H.TAU * f0 * 0.36 / sr;
    for (let i = 0, n = 0.14 * sr | 0; i < n; i++) d[i] += 0.4 * Math.sin(wb * i) * Math.exp(-i / (0.02 * sr)) * Math.min(1, i / (0.001 * sr));
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('membraneTap', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'warm', 'organic', 'natural'], dur: 0.25,
  desc: 'A soft, round skin boop with a tiny pitch fall; a centre touch is pitched, an off-centre touch is drummier.',
  events: 'a sphere touches a cell wall; a membrane is poked; a soft button press',
  from: 'research: synthesis.md Material hits, membraneTap (circular membrane Bessel-zero modes; sources 8, 28)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, key = o.key ?? 69;
  const m = o.note != null ? o.note : 48 + (((key + H.pick([0, 2, 4, 7, 9]) - 48) % 12) + 12) % 12;
  const f0 = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.2);
  const centre = o.centre != null ? !!o.centre : r() < 0.3;
  const ratios = centre ? [1, 2.295, 3.598] : [1, 1.594, 2.136, 2.296, 2.653, 2.918];
  const gains = centre ? [1, 0.4, 0.2] : [1, 0.6, 0.45, 0.35, 0.25, 0.2];
  const t60 = [0.16, 0.11, 0.09, 0.08, 0.07, 0.06];
  H.buffer(out, t, 0.34, d => {
    const n = d.length, na = 0.003 * sr;
    for (let k = 0; k < ratios.length; k++) {
      const tau = t60[k] * H.rr(0.9, 1.1) / 6.908, w = H.TAU * f0 * ratios[k] / sr, g = gains[k] * Math.pow(10, H.rr(-2, 2) / 20);
      let ph = 0;
      for (let i = 0; i < n; i++) {
        const s = i / sr; ph += w * (1 + 0.07 * Math.exp(-s / 0.012)); // the skin relaxes: about 7 % high, falling over 40 ms
        d[i] += g * (i < na ? 0.5 - 0.5 * Math.cos(Math.PI * i / na) : 1) * Math.sin(ph) * Math.exp(-s / tau);
      }
    }
    // the soft slap of the finger: 40 ms of noise lowpassed at 500 Hz
    const kl = 1 - Math.exp(-H.TAU * 500 / sr), nn = 0.045 * sr | 0; let lp = 0;
    for (let i = 0; i < nn; i++) { lp += kl * ((r() * 2 - 1) - lp); d[i] += 0.55 * lp * Math.exp(-i / (0.012 * sr)) * Math.min(1, i / (0.002 * sr)); }
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('metalHat808', { family: 'rhythm', styles: ['3dlight'], tags: ['metallic', 'crisp', 'bright', 'digital'], dur: 0.2,
  desc: 'A tiny, bright, inharmonic tss: six square-wave partials in the 808 cymbal ratios, closed by default (o.open for a longer shimmer).',
  events: 'an off-beat rhythm layer; step ticks on a timeline; scan-line ticks',
  from: 'research: synthesis.md Material hits, metalHat808 (808 cymbal ratios, Tone.js MetalSynth; sources 7, 30)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, open = !!o.open;
  const f = 200 * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.35);
  const decay = o.dur != null ? o.dur : open ? H.rr(0.35, 0.9) : H.rr(0.045, 0.07), vel = o.vel ?? H.rr(0.6, 1);
  const tau = decay / 4.6, len = decay * 1.5 + 0.02;
  const ratios = [1, 1.483, 1.932, 2.546, 2.63, 3.897], inc = ratios.map(q => f * q / sr), ph = ratios.map(() => r());
  const blep = (x, dt) => x < dt ? (x /= dt, x + x - x * x - 1) : x > 1 - dt ? (x = (x - 1) / dt, x * x + x + x + 1) : 0;
  const kLP = 1 - Math.exp(-TAU * 9000 / sr), kq = 1 / 0.9;
  H.buffer(out, t, len, d => {
    let ic1 = 0, ic2 = 0, lp = 0;
    for (let i = 0; i < d.length; i++) {
      let x = 0;
      for (let k = 0; k < 6; k++) { let p = ph[k] + inc[k]; if (p >= 1) p -= 1; ph[k] = p; x += (p < 0.5 ? 1 : -1) + blep(p, inc[k]) - blep((p + 0.5) % 1, inc[k]); }
      const s = i / sr, e = Math.exp(-s / tau);
      // highpass whose cutoff rides the envelope from 11.3 kHz down to 4 kHz (two-pole state-variable, TPT form)
      const fc = Math.min(4000 * Math.pow(2, 1.5 * e), sr * 0.45), g = Math.tan(Math.PI * fc / sr);
      const a1 = 1 / (1 + g * (g + kq)), a2 = g * a1, a3 = g * a2;
      const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      const hp = x - kq * v1 - v2; lp += kLP * (hp - lp);
      d[i] = lp * e * Math.min(1, s / 0.001);
    }
  }, { level: (0.165 + 0.03 * vel) * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('resonantPlate', { family: 'material', styles: ['3dlight'], tags: ['metallic', 'cold', 'bright', 'clinical'], dur: 1.4,
  desc: 'A short click rings a struck metal panel: forty inharmonic modes in a dense, bright, stereo-wide ring that fades from the top down.',
  events: 'a tray or panel is hit; an instrument clanks; a lock engages; a material swap',
  from: 'research: synthesis.md Material hits, resonantPlate (modal impulse response used as a resonator; sources 1, 18, 19)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU;
  const size = o.size || 1, sc = Math.pow(2, (o.pitch || 0) / 12) / size * H.semis(0.35);
  const len = 1.7, n = Math.ceil(sr * len), b = ac.createBuffer(2, n, sr), ch = [b.getChannelData(0), b.getChannelData(1)];
  for (let i = 0; i < 40; i++) {
    // golden-ratio spacing: a fixed set of 40 log-spread modes, so the plate keeps its identity from play to play
    const f1 = 500 * Math.pow(18, (0.5 + i * 0.6180339887) % 1), f = f1 * sc;
    if (f > sr * 0.42) continue;
    const t60 = 1.15 * Math.pow(1000 / f1, 0.7), amp = Math.pow(f1 / 1000, -0.05) * H.rr(0.7, 1.4);
    const tau = t60 / 6.908, w = TAU * f / sr, cnt = Math.min(n, Math.ceil(tau * 7 * sr)), k = 1 / (tau * sr);
    for (let c = 0; c < 2; c++) { const d = ch[c], ph = r() * TAU; for (let j = 0; j < cnt; j++) d[j] += amp * Math.sin(ph + w * j) * Math.exp(-j * k); }
  }
  // the exciting click (the dry part): about 1 ms of noise, bandpassed around 4 kHz, independent per channel
  const kh = 1 - Math.exp(-TAU * 2500 / sr), kl = 1 - Math.exp(-TAU * 6000 / sr);
  for (let c = 0; c < 2; c++) { const d = ch[c]; let a = 0, bb = 0; for (let j = 0, m = 0.004 * sr | 0; j < m; j++) { const x = (r() * 2 - 1) * Math.exp(-j / (0.0004 * sr)); a += kl * (x - a); bb += kh * (a - bb); d[j] += 6 * (a - bb); } }
  const ramp = 0.0004 * sr; let pk = 0;
  for (let c = 0; c < 2; c++) for (let j = 0; j < n; j++) { if (j < ramp) ch[c][j] *= j / ramp; if (j > n - 0.15 * sr) ch[c][j] *= (n - j) / (0.15 * sr); pk = Math.max(pk, Math.abs(ch[c][j])); }
  const k = 0.165 * Math.pow(10, H.rr(-1.5, 1.5) / 20) / pk; for (let c = 0; c < 2; c++) for (let j = 0; j < n; j++) ch[c][j] *= k;
  const src = ac.createBufferSource(); src.buffer = b; const g = H.gain(1);
  const p = ac.createStereoPanner(); p.pan.value = H.clamp(o.pan || 0, -1, 1) * 0.5; src.connect(g); g.connect(p); p.connect(out); src.start(t);
});

// ---------------------------------------------------------------------------------------------- Tonal accents and bells
define('rissetBell', { family: 'tonal', styles: ['3dlight', 'doodle-draw'], tags: ['tonal', 'warm', 'premium', 'dark'], dur: 3.6,
  desc: 'A deep, shimmering bell: a low hum an octave and a bit under the note, beating partials and a clear strike (o.kind "church" gives a plainer church bell).',
  events: 'an end card; a logo; a chapter title; a big result lands',
  from: 'research: synthesis.md Tonal accents and bells, rissetBell (Risset 11-partial table, sources 11, 12)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, key = o.key ?? 69, church = o.kind === 'church';
  const m = o.note != null ? o.note : 60 + (((key + H.pick([0, 0, 7, 4, 9]) - 60) % 12) + 12) % 12;
  const f0 = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.15);
  const D = (o.dur != null ? o.dur : church ? 4.2 : 3.4) * H.rr(0.85, 1.15);
  let ratio, det, amp, tau;
  if (church) { // church bell: hum, prime, minor third, fifth, nominal; T60 from long to short
    ratio = [0.5, 1, 1.2, 1.5, 2]; det = [0, 0.7, 0, 0, 0]; amp = [1, 0.9, 0.55, 0.45, 0.35];
    tau = [5, 4, 3, 2, 1.2].map(v => v * D / 4.2 / 6.908);
  } else {
    ratio = [0.56, 0.56, 0.92, 0.92, 1.19, 1.7, 2, 2.74, 3, 3.76, 4.07]; det = [0, 1, 0, 1.7, 0, 0, 0, 0, 0, 0, 0];
    amp = [1, 0.67, 1, 1.8, 2.67, 1.67, 1.46, 1.33, 1.33, 1, 1.33];
    tau = [1, 0.9, 0.65, 0.55, 0.325, 0.35, 0.25, 0.2, 0.15, 0.1, 0.075].map(v => D * v / 4.5);
  }
  const len = Math.min(8, D * 1.15 + 0.15), n = Math.ceil(sr * len), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  const fade = 0.25 * sr, na = 0.005 * sr;
  for (let p = 0; p < ratio.length; p++) {
    const f = f0 * ratio[p] * (1 + H.rr(-0.001, 0.001)) + det[p] * (0.8 + 0.4 * r()), w = TAU * f / sr, k = 1 / (tau[p] * sr), cnt = Math.min(n, Math.ceil(tau[p] * 7 * sr));
    const pa = ((p % 2 ? 1 : -1) * 0.3 + 1) * Math.PI / 4, gl = Math.cos(pa) * amp[p], gr = Math.sin(pa) * amp[p], ph = r() * 0.5;
    for (let i = 0; i < cnt; i++) {
      const v = Math.sin(ph + w * i) * Math.exp(-i * k) * (i < na ? 0.5 - 0.5 * Math.cos(Math.PI * i / na) : 1);
      L[i] += gl * v; R[i] += gr * v;
    }
  }
  // the strike: a soft mallet tick, lowpassed noise of about 6 ms
  const kl = 1 - Math.exp(-TAU * 2500 / sr);
  for (let c = 0; c < 2; c++) { const d = c ? R : L; let lp = 0; for (let i = 0, nn = 0.02 * sr | 0; i < nn; i++) { lp += kl * ((r() * 2 - 1) - lp); d[i] += 0.5 * lp * Math.exp(-i / (0.004 * sr)) * Math.min(1, i / (0.001 * sr)); } }
  let pk = 0;
  for (let i = 0; i < n; i++) { if (i > n - fade) { const q = (n - i) / fade; L[i] *= q; R[i] *= q; } pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
  const k = 0.14 * Math.pow(10, H.rr(-1.5, 1.5) / 20) / pk; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const src = ac.createBufferSource(); src.buffer = b; const g = H.gain(1), pn = ac.createStereoPanner(); pn.pan.value = H.clamp(o.pan || 0, -1, 1);
  src.connect(g); g.connect(pn); pn.connect(out); src.start(t);
});

define('fmBell', { family: 'tonal', styles: ['3dlight', 'doodle-draw'], tags: ['glassy', 'bright', 'metallic', 'tonal'], dur: 3.4,
  desc: 'An FM bell whose brightness dies faster than its loudness: a Chowning bell by default, o.kind "glass" for a glass ting or "bar" for a hollow metal bar.',
  events: 'a reveal; an achievement tick; a tooltip ting; a unit label appears',
  from: 'research: synthesis.md Tonal accents and bells, fmBell (Chowning bell 1 : 1.4, sources 9, 10, 30)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, key = o.key ?? 69;
  const kinds = {
    bell: { lo: 64, mods: [[1.4, 1]], I: 4.5, ti: 0.7, ta: 0.75, len: 3.4 },
    glass: { lo: 72, mods: [[3.5, 1], [7.07 * 1.003, 0.4]], I: 3, ti: 0.18, ta: 0.9, len: 3.2 },
    bar: { lo: 67, mods: [[2.76, 1]], I: 5, ti: 0.25, ta: 0.6, len: 2.6 },
  };
  const K = kinds[o.kind] || kinds.bell;
  const m = o.note != null ? o.note : K.lo + (((key + H.pick([0, 2, 4, 7, 9]) - K.lo) % 12) + 12) % 12;
  const f = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.15);
  const I0 = K.I * H.rr(0.9, 1.1), ti = K.ti * H.rr(0.9, 1.1), ta = K.ta * H.rr(0.9, 1.1);
  const len = Math.min(K.len, ta * 4.9), kLP = 1 - Math.exp(-TAU * 9000 / sr);
  H.buffer(out, t, len, d => {
    const n = d.length, pm = K.mods.map(() => 0), wc = TAU * f / sr, na = 0.002 * sr; let pc = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr, idx = I0 * Math.exp(-s / ti); let mod = 0;
      for (let j = 0; j < pm.length; j++) { pm[j] += wc * K.mods[j][0]; mod += K.mods[j][1] * Math.sin(pm[j]); }
      pc += wc; lp += kLP * (Math.sin(pc + idx * mod) - lp);
      d[i] = lp * Math.exp(-s / ta) * (i < na ? 0.5 - 0.5 * Math.cos(Math.PI * i / na) : 1);
    }
    for (let i = 0, m = 0.15 * sr | 0; i < m; i++) d[n - 1 - i] *= i / m;
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('fmMallet', { family: 'tonal', styles: ['3dlight'], tags: ['soft', 'warm', 'tonal', 'playful'], dur: 0.5,
  desc: 'A round, soft bonk: a drum-like FM tone whose brief sheen only lasts about 40 ms, tuned to the key.',
  events: 'spheres collide; a soft button; a row of items appears',
  from: 'research: synthesis.md Tonal accents and bells, fmMallet (FM ratio 1/sqrt(2), low index; source 9)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, key = o.key ?? 69;
  const m = o.note != null ? o.note : 57 + (((key + H.pick([0, 2, 4, 7, 9]) - 57) % 12) + 12) % 12;
  const f = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.15);
  const pan = H.clamp((o.pan || 0) + H.rr(-0.3, 0.3), -1, 1), I0 = H.rr(1.4, 1.8), tauA = H.rr(0.062, 0.078);
  H.buffer(out, t, 0.5, d => {
    const n = d.length, na = 0.002 * sr; let pc = 0, pm = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr, fi = f * (1 + 0.06 * Math.exp(-s / 0.012)), idx = 0.05 + (I0 - 0.05) * Math.exp(-s / 0.035);
      pc += TAU * fi / sr; pm += TAU * fi * 0.7071 / sr;
      d[i] = Math.sin(pc + idx * Math.sin(pm)) * Math.exp(-s / tauA) * (i < na ? i / na : 1);
    }
    // a hint of felt: 20 ms of noise lowpassed at 1.2 kHz
    const kl = 1 - Math.exp(-TAU * 1200 / sr); let lp = 0;
    for (let i = 0, nn = 0.02 * sr | 0; i < nn; i++) { lp += kl * ((r() * 2 - 1) - lp); d[i] += 0.12 * lp * (1 - i / nn); }
  }, { level: 0.21 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan });
});

define('lpgPluck', { family: 'tonal', styles: ['3dlight'], tags: ['soft', 'warm', 'tonal', 'premium'], dur: 0.7,
  desc: 'A warm, round bloop-tok whose brightness fades with its loudness, like a lowpass gate; never glossy.',
  events: 'an element appears; a bullet point lands; a number pops in; a UI confirmation',
  from: 'research: synthesis.md Tonal accents and bells, lpgPluck (lowpass-gate idea, source 17; numbers are start values)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, key = o.key ?? 69;
  const lo = r() < 0.65 ? 60 : 72;
  const m = o.note != null ? o.note : lo + (((key + H.pick([0, 2, 4, 7, 9]) - lo) % 12) + 12) % 12;
  const f = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.12) * Math.pow(2, H.rr(-3, 3) / 1200);
  const v = o.vel ?? H.rr(0.5, 1), pan = H.clamp((o.pan || 0) + H.rr(-0.2, 0.2), -1, 1);
  const c0 = Math.min(f * (3 + 12 * (v - 0.5)), 9000), kq = 1 / H.rr(0.9, 1.2);
  H.buffer(out, t, 0.7, d => {
    const n = d.length, a1c = 1 - Math.exp(-1 / (0.015 * sr)), a2c = 1 - Math.exp(-1 / (0.07 * sr));
    let ph = 0, ic1 = 0, ic2 = 0, fc = c0;
    for (let i = 0; i < n; i++) {
      const s = i / sr;
      fc += ((s < 0.04 ? f * 3 : f * 1.2) - fc) * (s < 0.04 ? a1c : a2c);
      ph += f / sr; const w = TAU * ph;
      const x = (2 / Math.PI) * Math.asin(Math.sin(w)) + 0.316 * Math.sin(2 * w);
      const g = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr), a1 = 1 / (1 + g * (g + kq)), a2 = g * a1, a3 = g * a2;
      const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      d[i] = v2 * (s < 0.002 ? s / 0.002 : Math.exp(-(s - 0.002) / 0.11));
    }
    // a barely-there pluck of air: 1.5 ms of noise around 2 kHz
    const kh = 1 - Math.exp(-TAU * 1200 / sr), kl = 1 - Math.exp(-TAU * 3000 / sr); let a = 0, b = 0;
    for (let i = 0, nn = 0.004 * sr | 0; i < nn; i++) { const x = (r() * 2 - 1) * Math.exp(-i / (0.0005 * sr)); a += kl * (x - a); b += kh * (a - b); d[i] += 0.1 * (a - b); }
  }, { level: (0.2 + 0.05 * v) * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan });
});

define('formantAah', { family: 'tonal', styles: ['3dlight', 'doodle-draw'], tags: ['warm', 'organic', 'tonal', 'airy'], dur: 2.8,
  desc: 'A soft, synthetic ooh-to-aah breath of vowel choir, two voices a fifth apart, human but not voice-like, with a plate tail.',
  events: 'a sunrise or reveal stinger; a warm resolve; a transition into a new section',
  from: 'research: synthesis.md Tonal accents and bells, formantAah (Csound alto formants, source 2)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, key = o.key ?? 69;
  const m = o.note != null ? o.note : 50 + (((key + H.pick([0, 7, 4, 9, 2]) - 50) % 12) + 12) % 12;
  const f0 = H.mtof(m + (o.pitch || 0)) * H.semis(o.note != null ? 0.05 : 0.15);
  const total = Math.max(1, o.dur ?? 1.8), atk = Math.min(0.35, total * 0.22), rel = Math.min(0.6, total * 0.36);
  const n = Math.ceil(sr * (total + 0.05)), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  const Fo = [450, 800, 2830], Do = [0, -9, -16], Bo = [70, 80, 100], Fa = [800, 1150, 2800], Da = [0, -4, -20], Ba = [80, 90, 120];
  const ss = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const voices = [{ f: f0, g: 1, pan: -0.3 }, { f: f0 * 1.4983 * (1 + H.rr(-0.003, 0.003)), g: 0.5, pan: 0.3 }];
  for (const V of voices) {
    const nh = Math.max(6, Math.min(24, Math.floor(6000 / V.f))), hamp = []; for (let h = 1; h <= nh; h++) hamp.push(Math.pow(h, -1.25));
    const vph = r() * TAU, vrate = 5.2 * H.rr(0.95, 1.05), pl = Math.cos((V.pan + 1) * Math.PI / 4), pr = Math.sin((V.pan + 1) * Math.PI / 4);
    const src = new Float32Array(n); let ph = 0, nz = 0, drift = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr; drift = 0.9995 * drift + 0.00004 * (r() * 2 - 1);
      ph += TAU * V.f * (1 + 0.005 * ss((s - 0.3) / 0.4) * Math.sin(vph + TAU * vrate * s) + drift) / sr;
      const c2 = 2 * Math.cos(ph); let s0 = 0, s1 = Math.sin(ph), x = 0;   // sin(h*ph) by recurrence
      for (let h = 0; h < nh; h++) { x += hamp[h] * s1; const s2 = c2 * s1 - s0; s0 = s1; s1 = s2; }
      nz = 0.85 * nz + 0.15 * (r() * 2 - 1);
      src[i] = x + 0.15 * nz;
    }
    // three formant resonators, peak-normalized so the dB figures mean peak heights; coefficients refreshed every 16 samples
    const y1 = [0, 0, 0], y2 = [0, 0, 0], c1 = [0, 0, 0], c2 = [0, 0, 0], a0 = [0, 0, 0], gn = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const s = i / sr;
      if ((i & 15) === 0) {
        const u = ss((s - 0.15) / 0.7);
        for (let k = 0; k < 3; k++) {
          const F = Math.pow(Fo[k], 1 - u) * Math.pow(Fa[k], u), bw = (Bo[k] * (1 - u) + Ba[k] * u) * 1.35, db = Do[k] * (1 - u) + Da[k] * u;
          const rr = Math.exp(-Math.PI * bw / sr), th = TAU * F / sr, cs = Math.cos(th), sn = Math.sin(th);
          const pk = (1 - rr) / Math.sqrt(cs * cs * Math.pow(1 - rr, 4) + sn * sn * Math.pow(1 - rr * rr, 2));
          c1[k] = 2 * rr * cs; c2[k] = -rr * rr; a0[k] = 1 - rr; gn[k] = Math.pow(10, db / 20) / pk;
        }
      }
      const x = src[i]; let y = 0;
      for (let k = 0; k < 3; k++) { const v = a0[k] * x + c1[k] * y1[k] + c2[k] * y2[k]; y2[k] = y1[k]; y1[k] = v; y += gn[k] * v; }
      let e = s < atk ? Math.pow(Math.sin(Math.PI / 2 * s / atk), 2) : 1;
      if (s > total - rel) e *= 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (s - (total - rel)) / rel)));
      y *= e * V.g; L[i] += y * pl; R[i] += y * pr;
    }
  }
  let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const k = 0.13 * Math.pow(10, H.rr(-1.5, 1.5) / 20) / pk; for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const src = ac.createBufferSource(); src.buffer = b; const g = H.gain(1), pn = ac.createStereoPanner(); pn.pan.value = H.clamp(o.pan || 0, -1, 1);
  src.connect(g); g.connect(pn); pn.connect(out);
  const rv = H.verb(out, { sec: 1.5, decay: 3.2, wet: 2.0, lp: 5500 }); pn.connect(rv); src.start(t);
});

// ---------------------------------------------------------------------------------------------- Impacts and arrivals
define('subDrop', { family: 'impact', styles: ['3dlight'], tags: ['sub', 'dark', 'soft', 'premium'], dur: 1.5,
  desc: 'A long, soft sub boom with a small pitch dive, tuned to the key and saturated so it still carries on laptop speakers.',
  events: 'a title card; a chapter change; a hero shape lands; the downbeat of a loop',
  from: 'research: synthesis.md Impacts and arrivals, subDrop (808-style sine with parallel tanh saturation; source 22)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, key = o.key ?? 69;
  const m = o.note != null ? o.note : 28 + (((key - 28) % 12) + 12) % 12;       // the tonic, 41-77 Hz
  const fe = H.mtof(m + (o.pitch || 0)) * H.semis(0.1), R0 = H.rr(2.1, 2.7);       // dive starts at about 2.4 x f_end
  const len = Math.max(0.6, o.dur ?? 1.5), tauA = len / 6.2, kh = 1 - Math.exp(-TAU * 28 / sr), kc = 1 - Math.exp(-TAU * 1500 / sr), kt = Math.tanh(3.2);
  H.buffer(out, t, len, d => {
    const n = d.length, na = 0.004 * sr; let ph = 0, hp = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr, f = fe * (0.85 + 0.15 * Math.exp(-s / 0.35)) * (1 + (R0 - 1) * Math.exp(-s / 0.024));
      ph += TAU * f / sr;
      const x = Math.sin(ph) * Math.exp(-s / tauA) * (i < na ? 0.5 - 0.5 * Math.cos(Math.PI * i / na) : 1);
      const y = (Math.tanh(3.2 * (x + 0.12)) - Math.tanh(0.384)) / kt;             // saturation with a little asymmetry: adds 2f, 3f, 5f
      const z = 0.6 * x + 0.4 * y; hp += kh * (z - hp); d[i] = z - hp;
    }
    let lp = 0; for (let i = 0, nn = 0.003 * sr | 0; i < nn; i++) { lp += kc * ((r() * 2 - 1) - lp); d[i] += 0.1 * lp * (1 - i / nn); }
    for (let i = 0, m = 0.12 * sr | 0; i < m; i++) d[n - 1 - i] *= i / m;
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('bounceSettle', { family: 'impact', styles: ['3dlight', 'doodle-draw'], tags: ['soft', 'natural', 'warm', 'playful'], dur: 1.1,
  desc: 'A soft matte ball bounces several times, each hit softer and closer than the last, then settles with a tiny roll.',
  events: 'a sphere drops onto a surface; tissue layers stack; capsules settle into a cluster',
  from: 'research: synthesis.md Impacts and arrivals, bounceSettle (restitution timing e^k; sources 28, derived)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU;
  const e = o.e ?? H.rr(0.52, 0.66), G = (o.dur != null ? o.dur / 3 : H.rr(0.22, 0.36)), tr = Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.3);
  const pan = o.pan != null ? o.pan : H.rr(-0.4, 0.4);
  const hits = []; let at = 0, amp = 1;
  for (let k = 0; k < 8 && amp > 0.05; k++) { hits.push([at, amp, k]); at += G * Math.pow(e, k); amp *= e; }
  const settle = hits[hits.length - 1][0], len = settle + 0.42;
  H.buffer(out, t, len, d => {
    const kl = 1 - Math.exp(-TAU * 700 / sr);
    for (const [t0, a, k] of hits) {
      const f0 = 124 * (1 + 0.06 * k) * tr, tt = t0 + H.rr(-0.002, 0.002) * (k ? 1 : 0);
      H.DSP.chirp(d, sr, Math.max(0, tt), a, f0, 78 * tr, 0.04, 0.035);                 // the body: a damped sine that drops
      H.DSP.chirp(d, sr, Math.max(0, tt), a * 0.42, f0 * 2.6, 200 * tr, 0.03, 0.024);     // its first overtone, so small speakers hear it
      let lp = 0; const i0 = Math.max(0, tt) * sr | 0;                                  // the contact: 25 ms of noise lowpassed at 700 Hz
      for (let i = 0, nn = 0.025 * sr | 0; i < nn && i0 + i < d.length; i++) { lp += kl * ((r() * 2 - 1) - lp); d[i0 + i] += a * 0.5 * lp * (1 - i / nn); }
    }
    // the roll: a short, very quiet band of noise around 1.2 kHz
    const sw = 2 * Math.sin(Math.PI * 1200 / sr), q = 1; let bl = 0, bb = 0; const i0 = (settle + 0.02) * sr | 0, nr = 0.14 * sr | 0;
    for (let i = 0; i < nr && i0 + i < d.length; i++) { const x = r() * 2 - 1; bl += sw * bb; const hpf = x - bl - q * bb; bb += sw * hpf; d[i0 + i] += 0.05 * bb * Math.pow(Math.sin(Math.PI * i / nr), 2); }
    for (let i = 0, m = 0.04 * sr | 0; i < m; i++) d[d.length - 1 - i] *= i / m;
  }, { level: 0.22 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan });
});

define('layerStack', { family: 'impact', styles: ['3dlight', 'doodle-draw'], tags: ['premium', 'soft', 'sub', 'crisp'], dur: 1.3,
  desc: 'A full, layered impact: a soft click, a tuned metallic body, a sub underneath, a barely audible high ping and a short plate tail; o.size from 0.5 (small) to 2 (big).',
  events: 'a hero shape or title lands; a big versus a small object hits; a chapter downbeat',
  from: 'research: synthesis.md Impacts and arrivals, layerStack (transient + body + sub + tail + sweetener; source 23)' },
(ac, out, t, o, H) => {
  const sr = H.sr, r = H.r, TAU = H.TAU, key = o.key ?? 69, size = H.clamp(o.size ?? 1, 0.5, 2);
  const mb = o.note != null ? o.note : 33 + 24 + (((key - 33) % 12) + 12) % 12;          // body note; the sub sits two octaves below
  const tr = o.pitch || 0, fsub = H.mtof(mb - 24 + tr) * H.semis(0.1), fb = H.mtof(mb + tr) * H.semis(0.1) / size;
  const tb = H.rr(0.002, 0.006), tw = 0.02, len = 0.62 * Math.sqrt(size) + 0.1;
  const bus = H.gain(1, out), dl = ac.createDelay(0.05); dl.delayTime.value = 0.012;     // 12 ms pre-delay into the plate; feed-forward, no loop
  const hp = H.filter('highpass', 200, 0.707), rv = H.verb(out, { sec: 1.5, decay: 4, wet: 2.0, lp: 7000 });
  bus.connect(dl); dl.connect(hp); hp.connect(rv);
  H.buffer(bus, t, len, d => {
    const n = d.length, kt = Math.tanh(1.2);
    const mk = (i0, f, a, tau, att) => { const w = TAU * f / sr; for (let i = 0, m = Math.min(n - i0, Math.ceil(tau * 7 * sr)); i < m; i++) d[i0 + i] += a * Math.sin(w * i) * Math.exp(-i / (tau * sr)) * Math.min(1, i / att); };
    // transient: 4 ms of noise between 1.2 and 4.5 kHz (the 0 dB reference), smoothed by two lowpass poles so it clicks without biting
    const kh = 1 - Math.exp(-TAU * 1200 / sr), kl = 1 - Math.exp(-TAU * 4500 / sr); let a = 0, a2 = 0, b = 0;
    for (let i = 0, nn = 0.012 * sr | 0; i < nn; i++) { const x = (r() * 2 - 1) * Math.exp(-i / (0.001 * sr)) * Math.min(1, i / (0.0003 * sr)); a += kl * (x - a); a2 += kl * (a - a2); b += kh * (a2 - b); d[i] += 2.2 * (a2 - b); }
    // body 2-6 ms later, -3 dB: a short bar-like modal set, durations scale with size
    const ib = tb * sr | 0;
    mk(ib, fb, 0.7, 0.38 * size / 6.908 * 1.6, 0.0015 * sr); mk(ib, fb * 2.756, 0.32, 0.22 * size / 6.908 * 1.6, 0.0015 * sr); mk(ib, fb * 5.423, 0.16, 0.12 * size / 6.908 * 1.6, 0.0015 * sr);
    // sub from 0 ms, -9 dB, with a small dive; gain grows with size
    const ws = TAU * fsub / sr, sg = 0.35 * size; let ph = 0;
    for (let i = 0, m = Math.min(n, 0.5 * size * sr | 0); i < m; i++) { const s = i / sr; ph += ws * (1 + 0.12 * Math.exp(-s / 0.03)); d[i] += sg * Math.sin(ph) * Math.exp(-s / (0.07 * size)) * Math.min(1, i / (0.003 * sr)); }
    // sweetener at +20 ms, -24 dB: a high ping
    mk(tw * sr | 0, fb * 8.988, 0.063, 0.15 / 6.908, 0.001 * sr);
    // glue: tanh(1.2 x) on the normalized sum
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < n; i++) d[i] = Math.tanh(1.2 * d[i] / (pk || 1)) / kt;
    for (let i = 0, m = 0.06 * sr | 0; i < m; i++) d[n - 1 - i] *= i / m;
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

// ================================================================ Synthesis: transitions, digital, acoustic-physical, textures (research/synthesis.md)
// synth_b.js: synthesized effects, part B (transitions and motion, data and digital, organic and acoustic-physical, textures).
// Source catalog: sfx_research/synthesis.md. Every effect is written sample by sample (or from native nodes) and peak-normalised,
// so the level is exact; randomness comes only from H.r.

// ---------------------------------------------------------------- Transitions and motion, textures
define('shepardBed', { family: 'texture', styles: ['3dlight'], tags: ['airy', 'tonal', 'dark', 'premium'], dur: 13.5,
  desc: 'A quiet endless glide: eight octave-spaced sine layers rise (or fall) forever under a soft bell-shaped spectrum, and the texture repeats exactly every beat, so a 45 s loop has no seam.',
  events: 'a bed under the whole loop; growth or continuing motion; a calm held scene; a sustained zoom or scale-up',
  from: 'research: synthesis.md Shepard tone (CRI ADX, Wikipedia, SuperCollider); shepardBed' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, LN2 = Math.LN2, N = 8, TS = 2048;
  const beat = Math.max(0.25, +o.beat || 4.5), dur = Math.max(0.25, +o.dur || beat * 3), n = Math.ceil(dur * sr), sgn = o.dir === 'down' ? -1 : 1;
  // base pitch: the key's tonic folded under 55 Hz, so at every beat boundary the layers sit on the tonic's octaves
  let base = H.mtof(o.key || 69); while (base >= 55) base /= 2; while (base < 27.5) base *= 2;
  base *= Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.1);
  const fcut = 4500 * H.rr(0.9, 1.1), th = H.r() * TAU, pm = H.pick([1, 2]), spread = H.rr(0.35, 0.6), th2 = H.r() * TAU, breath = H.rr(0.05, 0.09);
  // per-channel weight tables over the octave position p in [0, N): raised cosine x gentle lowpass tilt x pan
  const WL = new Float64Array(TS + 1), WR = new Float64Array(TS + 1);
  for (let k = 0; k <= TS; k++) {
    const p = k / TS * N, w = 0.5 - 0.5 * Math.cos(TAU * p / N), f = base * Math.pow(2, p);
    const tilt = 1 / Math.sqrt(1 + Math.pow(f / fcut, 4)), a = (spread * Math.sin(TAU * pm * p / N + th) + 1) * Math.PI / 4;
    WL[k] = w * tilt * Math.cos(a); WR[k] = w * tilt * Math.sin(a);
  }
  const at = (W, p) => { const x = p * TS / N, i = x | 0; return W[i] + (W[i + 1] - W[i]) * (x - i); };
  // The phase of a layer is a pure function of its octave position (K * 2^p), so after one beat the layer on
  // position p+1 carries exactly the phase the next one had: the summed waveform repeats every beat.
  const Kc = sgn * TAU * base * beat / LN2;
  let sa = 0, sb = 0;
  for (let j = 0; j < N; j++) { const m = at(WL, j) + at(WR, j), ph = Kc * Math.pow(2, j); sa += m * Math.sin(ph); sb += m * Math.cos(ph); }
  const c = Math.atan2(-sa, sb); // start (and, by periodicity, end) on a zero crossing
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1), dpi = sgn / (beat * sr), per = beat * sr;
  for (let i = 0; i < n; i++) {
    let l = 0, r = 0;
    for (let j = 0; j < N; j++) {
      const x = j + i * dpi; let p = x - N * Math.floor(x / N); if (p >= N) p = 0;
      const s = Math.sin(Kc * Math.exp(p * LN2) + c);
      l += at(WL, p) * s; r += at(WR, p) * s;
    }
    const am = 1 + breath * Math.cos(TAU * i / per + th2); // very slow breathing, also one cycle per beat
    L[i] = l * am; R[i] = r * am;
  }
  let mx = 1e-9; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), d = Math.abs(R[i]); if (a > mx) mx = a; if (d > mx) mx = d; }
  const fd = Math.min(n >> 1, Math.round((o.fade != null ? +o.fade : 0.01) * sr)), g = 1 / mx;
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  for (let i = 0; i < fd; i++) { const w = i / fd; L[i] *= w; R[i] *= w; L[n - 1 - i] *= w; R[n - 1 - i] *= w; }
  const s = ac.createBufferSource(); s.buffer = b; s.start(t);
  H.out(s, out, t, { level: 0.16 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('tonalSwoosh', { family: 'transition', styles: ['3dlight', 'doodle-draw'], tags: ['airy', 'tonal', 'soft', 'premium'], dur: 0.8,
  desc: 'An airy whistle-sweep: narrow bands of noise glide up (or down) and land on a note of the key, with a faint sine landing, travelling left to right.',
  events: 'a slide transition; an element flies in; a camera move; a card or panel sweeps across',
  from: 'research: synthesis.md tonalSwoosh (Soundcy whoosh, Ableton swoosh thread); transitions' },
(ac, out, t, o, H) => {
  const sr = H.sr, T = Math.max(0.2, +o.dur || 0.68), down = o.dir === 'down';
  let fb = o.note != null ? H.mtof(+o.note) : H.mtof((o.key || 69) + H.pick([0, 0, 4, 7, 7, 9, 2]));
  while (fb < 620) fb *= 2; while (fb > 1250) fb /= 2;
  fb *= Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.12);
  const f0 = down ? fb * 2 : fb / 2.5, Ts = T * H.rr(0.66, 0.72), bend = H.rr(1.35, 1.7);
  const mk = () => { let c1 = 0, c2 = 0; return (x, f, Q) => { const g = Math.tan(Math.PI * Math.min(f, sr * 0.45) / sr), k = 1 / Q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - c2, v1 = a1 * c1 + a2 * v3, v2 = c2 + a2 * c1 + a3 * v3; c1 = 2 * v1 - c1; c2 = 2 * v2 - c2; return v1 * k; }; };
  const bA = mk(), bB = mk(), bC = mk(), bD = mk();
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  const pink = () => { const x = H.r() * 2 - 1; b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.96900 * b2 + x * 0.1538520; b3 = 0.86650 * b3 + x * 0.3104856; b4 = 0.55000 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.0168980; const v = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926; return v; };
  const tl = Ts * 0.82, la = Math.pow(10, H.rr(-10, -7) / 20);
  H.buffer(out, t, T + 0.08, d => {
    const n = d.length; let sq = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const u = i / sr / T, s = Math.min(1, i / sr / Ts), f = f0 * Math.pow(fb / f0, Math.pow(s, bend));
      const e = u < 0.6 ? Math.pow(Math.sin(Math.PI / 2 * u / 0.6), 2) : u < 1 ? Math.pow(Math.cos(Math.PI / 2 * (u - 0.6) / 0.4), 2) : 0;
      const x = pink() * e;
      const y = bA(x, f, 14) + 0.4 * bB(x, f * 1.5, 20) + 0.2 * bC(x, f * 2, 28) + 0.07 * bD(x, f * 1.2, 1.6);
      d[i] = y; if (u > 0.3 && u < 0.7) { sq += y * y; cnt++; }
    }
    // a faint sine lands on the note when the sweep arrives
    const rms = Math.sqrt(sq / Math.max(1, cnt)), amp = rms * 1.414 * la;
    for (let i = Math.floor(tl * sr); i < n; i++) { const u = i / sr - tl; d[i] += amp * Math.sin(H.TAU * fb * u) * (1 - Math.exp(-u / 0.03)) * Math.exp(-u / 0.1); }
    const fo = Math.round(0.03 * sr); for (let i = 0; i < fo; i++) d[n - 1 - i] *= i / fo;
  }, { level: 0.2 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: down ? 0.5 : -0.5, pan1: down ? -0.5 : 0.5 });
});

define('combFlangeWhoosh', { family: 'transition', styles: ['3dlight'], tags: ['cold', 'digital', 'airy', 'metallic'], dur: 1,
  desc: 'A tech whoosh: pink noise through a moving comb filter whose notches sweep fast, giving a metallic, pitched swirl, wide in stereo.',
  events: 'a data rush; a scan sweep; a wipe between diagrams (use sparingly, low level)',
  from: 'research: synthesis.md combFlangeWhoosh (Soundcy whoosh; Web Audio delay clamp note)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, T = Math.max(0.3, +o.dur || 0.95), n = Math.ceil(T * sr), up = o.dir !== 'down';
  const t0 = H.rr(5.2, 6.4) / 1000, t1 = H.rr(0.6, 0.8) / 1000, Tsw = T * 0.74, ff = H.rr(0.65, 0.78), fbk = H.rr(0.35, 0.45);
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1), x = new Float32Array(n);
  // pink noise band-limited to about 150 Hz .. 7 kHz
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, l0 = 0, l1 = 0, l2 = 0, l3 = 0;
  const aH = 1 - Math.exp(-TAU * 150 / sr), aL = 1 - Math.exp(-TAU * 7000 / sr);
  for (let i = 0; i < n; i++) {
    const w = H.r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
    const p = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    l0 += aH * (p - l0); l1 += aH * ((p - l0) - l1); l2 += aL * (((p - l0) - l1) - l2); l3 += aL * (l2 - l3); x[i] = l3; // two highpass poles at 150 Hz, two lowpass poles at 7 kHz
  }
  const comb = (y, scale) => {
    for (let i = 0; i < n; i++) {
      const s = Math.min(1, i / sr / Tsw), tau = (up ? t0 * Math.pow(t1 / t0, s) : t1 * Math.pow(t0 / t1, s)) * scale, D = tau * sr, Di = D | 0, fr = D - Di;
      const j = i - Di; let xd = 0, yd = 0;
      if (j >= 1) { xd = x[j] * (1 - fr) + x[j - 1] * fr; yd = y[j] * (1 - fr) + y[j - 1] * fr; } else if (j === 0) { xd = x[0] * (1 - fr); yd = y[0] * (1 - fr); }
      y[i] = x[i] + ff * xd + fbk * yd;
    }
    for (let i = 0; i < n; i++) { const u = i / sr / T, e = u < 0.55 ? Math.pow(Math.sin(Math.PI / 2 * u / 0.55), 2) : Math.pow(Math.cos(Math.PI / 2 * Math.min(1, (u - 0.55) / 0.45)), 2); y[i] *= e; }
  };
  comb(L, 1); comb(R, 1.15);
  let mx = 1e-9; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), d = Math.abs(R[i]); if (a > mx) mx = a; if (d > mx) mx = d; }
  for (let i = 0; i < n; i++) { L[i] /= mx; R[i] /= mx; }
  const s = ac.createBufferSource(); s.buffer = b; const lp = H.filter('lowpass', 5200, 0.707); s.connect(lp); s.start(t);
  H.out(lp, out, t, { level: 0.17 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('grainCloud', { family: 'texture', styles: ['3dlight'], tags: ['airy', 'soft', 'tonal', 'bright'], dur: 1.8,
  desc: 'A soft cloud of tonal specks in a pentatonic set that thickens and thins: a dissolve or a mist, with a few airy noise sparkles, spread wide.',
  events: 'a dissolve between scenes; an aerosol or powder disperses; a zoom into particles; mist rising',
  from: 'research: synthesis.md grainCloud (Beat Kitchen granular; CCRMA granular notes)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, T = Math.max(0.4, +o.dur || 1.4), n = Math.ceil((T + 0.1) * sr);
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  const tonic = H.mtof(o.key || 69) * Math.pow(2, (o.pitch || 0) / 12), pool = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3], use = [];
  for (let k = 0; k < 3; k++) use.push(pool.splice(Math.floor(H.r() * pool.length), 1)[0]);
  const octs = [0.5, 1, 1, 2, 2, 4], peak = H.rr(100, 135);
  let tt = 0;
  for (;;) {
    const u = tt / T, lam = 14 + peak * Math.pow(Math.sin(Math.PI * Math.min(1, u)), 2);
    tt += Math.max(0.003, -Math.log(1 - H.r()) / lam);
    if (tt >= T) break;
    const i0 = Math.floor(tt * sr), pan = H.rr(-0.8, 0.8), ga = Math.cos((pan + 1) * Math.PI / 4), gb = Math.sin((pan + 1) * Math.PI / 4);
    const amp = 0.2 * Math.pow(10, H.rr(-3, 3) / 20);
    if (H.r() < 0.1) { // airy noise speck, bandpassed 4..9 kHz
      const m = Math.round(H.rr(0.008, 0.016) * sr), nz = new Float32Array(m); for (let i = 0; i < m; i++) nz[i] = H.r() * 2 - 1;
      const fc = H.rr(4000, 9000), y = H.DSP.reson(nz, sr, fc, fc * 0.25); let pk = 1e-9; for (let i = 0; i < m; i++) pk = Math.max(pk, Math.abs(y[i]));
      for (let i = 0; i < m && i0 + i < n; i++) { const w = Math.pow(Math.sin(Math.PI * i / m), 2), v = amp * 0.55 * w * y[i] / pk; L[i0 + i] += v * ga; R[i0 + i] += v * gb; }
    } else {
      const f = tonic * H.pick(use) * H.pick(octs) * Math.pow(2, H.rr(-8, 8) / 1200), m = Math.round(H.rr(0.022, 0.045) * sr), ph = H.r() * TAU;
      for (let i = 0; i < m && i0 + i < n; i++) { const w = Math.pow(Math.sin(Math.PI * i / m), 2), v = amp * w * Math.sin(ph + TAU * f * i / sr); L[i0 + i] += v * ga; R[i0 + i] += v * gb; }
    }
  }
  let mx = 1e-9; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), d = Math.abs(R[i]); if (a > mx) mx = a; if (d > mx) mx = d; }
  for (let i = 0; i < n; i++) { L[i] /= mx; R[i] /= mx; }
  const s = ac.createBufferSource(); s.buffer = b; const lp = H.filter('lowpass', 7000, 0.707); s.connect(lp); s.start(t);
  const g = H.out(lp, out, t, { level: 0.17 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
  g.connect(H.verb(out, { sec: 0.9, decay: 3, wet: 0.25, lp: 6000 }));
});

// ---------------------------------------------------------------- Data and digital
define('crushResolve', { family: 'digital', styles: ['3dlight'], tags: ['digital', 'cold', 'crisp', 'clinical'], dur: 0.75,
  desc: 'A low-resolution, grainy tone sweeping upward that sharpens (fewer held samples, more bits) into a clean pure ting on a note of the key, like an image coming into focus.',
  events: 'blur-to-focus; data decoding; a scan resolves; an ID locks',
  from: 'research: synthesis.md crushResolve (ZzFX bitCrush, jsfxr)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, Ts = H.rr(0.29, 0.35), dur = Math.max(0.4, +o.dur || 0.72), hold0 = H.rr(18, 24);
  let f1 = o.note != null ? H.mtof(+o.note) : H.mtof((o.key || 69) + H.pick([0, 0, 4, 7, 12, 9]));
  while (f1 < 1700) f1 *= 2; while (f1 > 2700) f1 /= 2;
  f1 *= Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.12);
  const f0 = f1 / 4.8, tg = Ts - 0.015, tauT = 0.06 * dur / 0.72;
  H.buffer(out, t, dur, d => {
    const n = d.length; let ph = 0, held = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr; let v = 0;
      if (tt < Ts + 0.02) {
        const s = Math.min(1, tt / Ts), f = f0 * Math.pow(f1 / f0, s); ph += TAU * f / sr;
        const src = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) / 1.3, lev = Math.pow(2, 5 + 7 * s - 1);
        if (cnt <= 0) { held = Math.round(src * lev) / lev; cnt += Math.pow(hold0, 1 - s); }
        cnt -= 1;
        const fi = Math.min(1, tt / 0.03), fo = tt < Ts - 0.06 ? 1 : Math.max(0, 1 - (tt - (Ts - 0.06)) / 0.08);
        v = 0.55 * held * (fi * fi * (3 - 2 * fi)) * fo;
      }
      if (tt > tg) { const u = tt - tg; v += 0.9 * (Math.sin(TAU * f1 * u) + 0.12 * Math.sin(TAU * 2 * f1 * u)) * (1 - Math.exp(-u / 0.002)) * Math.exp(-u / tauT); }
      d[i] = v;
    }
    const fo = Math.round(0.04 * sr); for (let i = 0; i < fo; i++) d[n - 1 - i] *= i / fo;
  }, { level: 0.22 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 6000, q: 0.6 }] });
});

define('foldedSine', { family: 'digital', styles: ['3dlight'], tags: ['digital', 'bright', 'metallic', 'tonal'], dur: 1.5,
  desc: 'A pure sine that blooms into a glassy-metal sheen as a wavefolder opens, then relaxes back to a clean tone.',
  events: 'activation; charging or energy building before a reveal; a molecule is excited; a switch powers up',
  from: 'research: synthesis.md foldedSine (UCSD synthnotes wavefolding)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, dur = Math.max(0.5, +o.dur || 1.4), sc = dur / 1.4;
  const note = o.note != null ? +o.note : (o.key || 69) - 12 + H.pick([0, 0, 7, 12]);
  const f = H.mtof(note) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.12), rise = 0.35 * sc * H.rr(0.9, 1.1), relax = 0.38 * sc, off = H.rr(0.08, 0.15), peakA = H.rr(0.85, 0.95);
  H.buffer(out, t, dur, d => {
    const n = d.length, ah = 1 - Math.exp(-TAU * 35 / sr); let ph = 0, dc = 0, dc2 = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr; ph += TAU * f / sr;
      let k; if (tt < rise) { const s = tt / rise; k = s * s * (3 - 2 * s); } else k = Math.exp(-(tt - rise) / relax);
      const a = 0.08 + (peakA - 0.08) * k, x = a * (Math.sin(ph) + off), y = Math.sin(3.5 * Math.PI * x);
      dc += ah * (y - dc); const h1 = y - dc; dc2 += ah * (h1 - dc2); // two one-pole highpasses at 35 Hz take out the DC the asymmetric fold makes
      const att = Math.min(1, tt / (0.12 * sc)), e = (att * att * (3 - 2 * att)) * (tt < 0.12 * sc ? 1 : Math.exp(-(tt - 0.12 * sc) / (0.3 * sc)));
      d[i] = (h1 - dc2) * e;
    }
    const fo = Math.round(0.08 * sr); for (let i = 0; i < fo; i++) d[n - 1 - i] *= i / fo;
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 6000, q: 0.6 }] });
});

define('ringModBell', { family: 'digital', styles: ['3dlight'], tags: ['metallic', 'digital', 'bright', 'cold'], dur: 1.3,
  desc: 'A metallic, slightly sci-fi zing: two tones multiplied together give sum and difference partials that die at different speeds, over a faint tonic.',
  events: 'a lock or verify cue; a logo ping (use sparingly); a data check passes',
  from: 'research: synthesis.md ringModBell (Wikipedia ring modulation)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, dur = Math.max(0.4, +o.dur || 1.2), sc = dur / 1.2;
  const fc = H.mtof(o.note != null ? +o.note : (o.key || 69) + 12) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.12);
  const ratio = o.ratio ? +o.ratio : H.pick([1.414, 1.414, 1.507, 1.618]), drift = H.rr(0.015, 0.025), tauA = 0.22 * sc, tauB = 0.1 * sc, dry = H.rr(0.25, 0.35);
  H.buffer(out, t, dur, d => {
    const n = d.length; let pc = 0, pm = 0, pc2 = 0, pm2 = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr, wob = 1 - drift * (1 - Math.exp(-tt / 0.12));
      pc += TAU * fc / sr; pm += TAU * fc * ratio * wob / sr; pc2 += TAU * fc * 2.003 / sr; pm2 += TAU * fc * ratio * 0.5 * wob / sr;
      const att = 1 - Math.exp(-tt / 0.0012);
      const A = Math.sin(pc) * Math.sin(pm) * Math.exp(-tt / tauA), B = 0.35 * Math.sin(pc2) * Math.sin(pm2) * Math.exp(-tt / tauB), C = dry * Math.sin(pc) * Math.exp(-tt / (tauA * 1.3));
      d[i] = (A + B + C) * att;
    }
    const fo = Math.round(0.1 * sr); for (let i = 0; i < fo; i++) d[n - 1 - i] *= i / fo;
  }, { level: 0.22 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 7500, q: 0.6 }] });
});

define('sfxrBlip', { family: 'digital', styles: ['3dlight'], tags: ['digital', 'playful', 'crisp', 'bright'], dur: 0.6,
  desc: 'A parametric 8-bit style blip in a family of variants (o.kind: select, pickup, jump, power, laser, hit), pitched into the key, band-limited and softened so it stays tidy rather than retro-harsh.',
  events: 'a data chip ticks; a tiny confirm or pick-up; a game-like or pixel moment; a retro style set (future)',
  from: 'research: synthesis.md sfxrBlipFamily (jsfxr, ZzFX); default kind select' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, r = H.r, key = o.key || 69, pent = [0, 2, 4, 7, 9];
  const KINDS = ['select', 'pickup', 'jump', 'power', 'laser', 'hit'], kind = KINDS.includes(o.kind) ? o.kind : 'select';
  const near = (lo, hi) => { const c = []; for (let k = -36; k <= 48; k++) { if (pent.includes(((k % 12) + 12) % 12)) { const f = H.mtof(key + k); if (f >= lo && f <= hi) c.push(f); } } return c[Math.floor(r() * c.length) % c.length]; };
  // jsfxr-style parameters, converted to seconds / Hz / octaves per second
  let wave = 'square', f0, slide = 0, duty = 0.5 - r() * 0.25, att = 0.0015, sus = 0.05, dec = 0.08, punch = 0.2, arpAt = 0, arpMul = 1, fmin = 0;
  const sec = x => x * x * 2.268; // jsfxr: seconds = x^2 * 100000 / 44100
  if (kind === 'select') { wave = r() < 0.7 ? 'square' : 'saw'; f0 = near(520, 1500); sus = sec(0.1 + r() * 0.1); dec = sec(0.12 + r() * 0.1); }
  else if (kind === 'pickup') { wave = 'saw'; f0 = near(600, 1400); sus = sec(r() * 0.1); dec = sec(0.15 + r() * 0.3); punch = 0.3 + r() * 0.3; arpAt = ((1 - (0.5 + r() * 0.2)) * (1 - (0.5 + r() * 0.2)) * 20000 + 32) / 44100; arpMul = Math.pow(2, H.pick([5, 7, 12]) / 12); }
  else if (kind === 'jump') { wave = 'square'; f0 = near(330, 800); slide = H.rr(2.5, 4.5); sus = sec(0.1 + r() * 0.3); dec = sec(0.1 + r() * 0.2); }
  else if (kind === 'power') { wave = r() < 0.5 ? 'saw' : 'square'; f0 = near(220, 520); slide = H.rr(2, 3.5); sus = sec(0.15 + r() * 0.25); dec = sec(0.1 + r() * 0.3); }
  else if (kind === 'laser') { wave = r() < 0.5 ? 'saw' : 'square'; f0 = near(1100, 2600); slide = -H.rr(4, 7); sus = sec(0.1 + r() * 0.2); dec = sec(r() * 0.3 + 0.1); fmin = f0 * 0.25; }
  else { wave = r() < 0.6 ? 'noise' : 'saw'; f0 = near(110, 330); slide = -H.rr(3, 6); sus = sec(r() * 0.1 + 0.05); dec = sec(0.1 + r() * 0.2); }
  if (o.note != null && kind !== 'hit') f0 = H.mtof(+o.note);
  f0 *= Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.12);
  const total0 = att + sus + dec, k = o.dur ? Math.max(0.1, +o.dur) / total0 : 1; sus *= k; dec *= k;
  const total = att + sus + dec, nb = new Float32Array(32); for (let i = 0; i < 32; i++) nb[i] = r() * 2 - 1;
  H.buffer(out, t, total + 0.05, d => {
    const n = d.length, up = Math.pow(2, slide / sr), lpa = 1 - Math.exp(-TAU * 3300 / sr); let f = f0, phase = r(), l1 = 0, l2 = 0, x1 = 0, y1 = 0, jumped = false;
    const wv = p => wave === 'square' ? (p < duty ? 0.5 : -0.5) : wave === 'saw' ? (1 - p * 2) * 0.5 : wave === 'sine' ? Math.sin(TAU * p) * 0.5 : nb[(p * 32) | 0] * 0.5;
    for (let i = 0; i < n; i++) {
      const tt = i / sr; f *= up; if (!jumped && arpAt && tt >= arpAt) { f *= arpMul; jumped = true; }
      if (fmin && f < fmin) f = fmin;
      let s = 0; for (let q = 0; q < 4; q++) { phase += f / (sr * 4); if (phase >= 1) phase -= 1; s += wv(phase); } s *= 0.25;
      let e; if (tt < att) e = tt / att; else if (tt < att + sus) e = 1 + Math.pow(1 - (tt - att) / sus, 2) * 2 * punch; else e = Math.pow(Math.max(0, 1 - (tt - att - sus) / dec), 1.5);
      l1 += lpa * (s * e - l1); l2 += lpa * (l1 - l2);
      const y = l2 - x1 + 0.995 * y1; x1 = l2; y1 = y; d[i] = y;
    }
  }, { level: 0.2 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('sonarPing', { family: 'digital', styles: ['3dlight'], tags: ['clinical', 'cold', 'tonal', 'airy'], dur: 1.4,
  desc: 'A clean sine ping followed by four darker, softer echoes that alternate left and right, like an ultrasound or depth probe.',
  events: 'an imaging scan; probing tissue depth; measuring a distance; a sensor reads out',
  from: 'research: synthesis.md sonarPing (derived)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, T = Math.max(0.6, +o.dur || 1.4), ds = T / 1.4, n = Math.ceil(T * sr);
  const f = H.mtof(o.note != null ? +o.note : (o.key || 69) + 24) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.15);
  const pl = Math.ceil(0.14 * sr), ping = new Float32Array(pl), tp = Math.round(0.02 * sr);
  for (let i = 0; i < pl; i++) { const u = i / sr, w = u < 0.008 ? Math.pow(Math.sin(Math.PI / 2 * u / 0.008), 2) : Math.exp(-(u - 0.008) / 0.018), tr = i > pl - tp ? Math.pow(Math.cos(Math.PI / 2 * (i - (pl - tp)) / tp), 2) : 1; ping[i] = w * tr * (Math.sin(TAU * f * u) + 0.15 * Math.sin(TAU * 2 * f * u)); }
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  const del = [0, 0.22, 0.47, 0.71, 1.02], gains = [1, 0.42, 0.24, 0.14, 0.08], cut = [0, 5000, 3500, 2400, 1600], side = H.r() < 0.5 ? 1 : -1;
  const bpf = (x, fc, Q) => { const w = TAU * fc / sr, al = Math.sin(w) / (2 * Q), c = Math.cos(w), a0 = 1 + al, b0 = al / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * (x[i] - x2) - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  for (let k = 0; k < 5; k++) {
    const at = Math.round(del[k] * ds * (k ? 1 + H.rr(-0.03, 0.03) : 1) * sr), pan = k === 0 ? 0 : side * (k % 2 ? -0.4 : 0.4), ga = Math.cos((pan + 1) * Math.PI / 4), gb = Math.sin((pan + 1) * Math.PI / 4), g = gains[k];
    let arr = Float32Array.from(ping);
    if (cut[k]) { const a = 1 - Math.exp(-TAU * cut[k] / sr); let s1 = 0, s2 = 0; for (let i = 0; i < arr.length; i++) { s1 += a * (arr[i] - s1); s2 += a * (s1 - s2); arr[i] = s2; } }
    for (let i = 0; i < arr.length && at + i < n; i++) { L[at + i] += g * arr[i] * ga; R[at + i] += g * arr[i] * gb; }
    if (k) { // scatter: a faint noise burst around the ping's pitch under each echo
      const m = Math.round(0.03 * sr), nz = new Float32Array(m); for (let i = 0; i < m; i++) nz[i] = (H.r() * 2 - 1) * Math.pow(Math.sin(Math.PI * i / m), 2);
      const y = bpf(nz, f, 5); let pk = 1e-9; for (let i = 0; i < m; i++) pk = Math.max(pk, Math.abs(y[i]));
      for (let i = 0; i < m && at + i < n; i++) { const v = g * 0.03 * y[i] / pk; L[at + i] += v * ga; R[at + i] += v * gb; }
    }
  }
  let mx = 1e-9; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), d = Math.abs(R[i]); if (a > mx) mx = a; if (d > mx) mx = d; }
  for (let i = 0; i < n; i++) { L[i] /= mx; R[i] /= mx; }
  const s = ac.createBufferSource(); s.buffer = b; s.start(t);
  H.out(s, out, t, { level: 0.17 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('holdArp', { family: 'digital', styles: ['3dlight'], tags: ['digital', 'playful', 'tonal', 'crisp'], dur: 1.6,
  desc: 'A wandering, stepped blip melody like a sample-and-hold module: soft triangle notes on a pentatonic walk, swelling and fading, with a ping-pong echo.',
  events: 'data streaming; analysis running; a counter or ticker; a generative readout',
  from: 'research: synthesis.md holdArp (derived; value-noise sample and hold)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, rate = Math.max(4, +o.rate || 12), step = 1 / rate, tail = 0.4;
  const steps = o.n ? Math.max(2, o.n | 0) : o.dur ? Math.max(3, Math.floor((+o.dur - tail) * rate)) : 8 + Math.floor(H.r() * 7), span = steps * step, n = Math.ceil((span + tail + 0.2) * sr);
  const tonic = H.mtof(o.key || 69) * Math.pow(2, (o.pitch || 0) / 12), ratios = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
  const kn = Math.ceil(span * 1.5) + 5, v = new Float64Array(kn); for (let i = 0; i < kn; i++) v[i] = H.r();
  const cubic = x => { const i = Math.floor(x), u = x - i, a = v[i], b = v[i + 1], c = v[i + 2], d = v[i + 3]; return b + 0.5 * u * (c - a + u * (2 * a - 5 * b + 4 * c - d + u * (3 * (b - c) + d - a))); };
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1), off = H.rr(0, 0.5), eg = 0.3, ed = Math.round(1.5 * step * sr);
  let pan = 0;
  for (let k = 0; k < steps; k++) {
    if (k > 0 && H.r() < 0.08) continue; // a rare rest
    const tk = k * step + H.rr(0, 0.001), val = Math.min(0.999, Math.max(0, cubic(1 + (tk + off) * 1.5))), idx = Math.floor(val * 10);
    const f = tonic * ratios[idx % 5] * (idx >= 5 ? 2 : 1), tri = 0.25 + 0.75 * (1 - Math.abs(2 * tk / span - 1)), amp = tri * H.rr(0.75, 1);
    pan = Math.max(-0.45, Math.min(0.45, pan + H.rr(-0.3, 0.3))); const ga = Math.cos((pan + 1) * Math.PI / 4), gb = Math.sin((pan + 1) * Math.PI / 4);
    const i0 = Math.round(tk * sr), m = Math.round(0.34 * sr); let ph = H.r();
    for (let i = 0; i < m && i0 + i < n; i++) {
      const u = i / sr; ph += f / sr; const q = ph - Math.floor(ph);
      const y = amp * (1 - Math.exp(-u / 0.001)) * (Math.exp(-u / 0.055) * (1 - 4 * Math.abs(q - 0.5)) + 0.2 * Math.exp(-u / 0.04) * Math.sin(TAU * 2 * ph));
      L[i0 + i] += y * ga; R[i0 + i] += y * gb;
      if (i0 + i + ed < n) { L[i0 + i + ed] += y * eg * gb; R[i0 + i + ed] += y * eg * ga; } // ping-pong echo into the other channel
    }
  }
  let mx = 1e-9; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), d = Math.abs(R[i]); if (a > mx) mx = a; if (d > mx) mx = d; }
  const fo = Math.round(0.1 * sr); for (let i = 0; i < n; i++) { const w = i > n - fo ? (n - i) / fo : 1; L[i] = L[i] / mx * w; R[i] = R[i] / mx * w; }
  const s = ac.createBufferSource(); s.buffer = b; const lp = H.filter('lowpass', 2200, 0.8); s.connect(lp); s.start(t);
  H.out(lp, out, t, { level: 0.18 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

// ---------------------------------------------------------------- Organic and acoustic-physical
define('ksPluckPlus', { family: 'tonal', styles: ['doodle-draw', '3dlight'], tags: ['warm', 'woody', 'natural', 'tonal'], dur: 2.5,
  desc: 'A natural plucked string (harp or guitar-like): extended Karplus-Strong with pick position, velocity, a touch of stiffness and a woody body resonance, in the key.',
  events: 'a note event; a drawn line sparkles with a harp feel; a music motif; a label lands with a gentle pluck',
  from: 'research: synthesis.md ksPluckPlus (J.O. Smith, Extended Karplus-Strong)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, r = H.r, dd = o.style === 'doodle-draw', key = o.key || 69;
  const note = o.note != null ? +o.note : key + H.pick([0, 0, 0, 2, 4, 7, 7, 9]) - (r() < 0.35 ? 12 : 0);
  const f = H.mtof(note) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.12), dur = Math.max(0.4, +o.dur || 2.5);
  const vel = o.vel != null ? +o.vel : H.rr(0.45, 0.9), wire = o.wire != null ? +o.wire : H.rr(0, 0.5), beta = H.rr(0.13, 0.45), T60 = H.rr(1.2, 2.6) * Math.min(1.2, dur / 2.5);
  const g = Math.pow(10, -3 / (T60 * f)), aD = -0.15 * wire, dispD = (1 - aD) / (1 + aD), tgt = sr / f - 0.5 - dispD, N = Math.max(4, Math.floor(tgt - 0.5)), dFr = tgt - N, eta = (1 - dFr) / (1 + dFr);
  const bpf = (x, fc, Q) => { const w = TAU * fc / sr, al = Math.sin(w) / (2 * Q), c = Math.cos(w), a0 = 1 + al, b0 = al / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * (x[i] - x2) - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  H.buffer(out, t, dur, d => {
    const n = d.length, buf = new Float64Array(N), e = new Float64Array(N), ac1 = 1 - Math.exp(-TAU * Math.min(f * (2 + 10 * vel), sr * 0.4) / sr), sh = Math.max(1, Math.round(beta * N));
    let lp = 0; for (let i = 0; i < N; i++) { lp += ac1 * ((r() * 2 - 1) - lp); e[i] = lp; }
    for (let i = 0; i < N; i++) buf[i] = e[i] - e[(i - sh + N) % N];
    const y = new Float32Array(n); let p = 0, vp = 0, apx = 0, apy = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
      const v = buf[p]; y[i] = v;
      const lv = g * 0.5 * (v + vp); vp = v;
      const a1 = eta * lv + apx - eta * apy; apx = lv; apy = a1;
      const a2 = aD * a1 + dx - aD * dy; dx = a1; dy = a2;
      buf[p] = a2; if (++p >= N) p = 0;
    }
    let pk = 1e-9; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(y[i]));
    const b1 = bpf(y, H.rr(180, 230), 4), b2 = bpf(y, H.rr(360, 460), 5), bg1 = (dd ? 0.55 : 0.3) * pk, bg2 = (dd ? 0.3 : 0.15) * pk;
    let p1 = 1e-9, p2 = 1e-9; for (let i = 0; i < n; i++) { p1 = Math.max(p1, Math.abs(b1[i])); p2 = Math.max(p2, Math.abs(b2[i])); }
    for (let i = 0; i < n; i++) d[i] = y[i] + bg1 * b1[i] / p1 + bg2 * b2[i] / p2;
    const fo = Math.round(0.2 * sr); for (let i = 0; i < fo; i++) d[n - 1 - i] *= Math.pow(i / fo, 2);
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0, filters: [{ type: 'lowpass', f: dd ? 5200 : 7500, q: 0.5 }] });
});

define('ksDrum', { family: 'rhythm', styles: ['doodle-draw'], tags: ['woody', 'organic', 'soft', 'natural'], dur: 0.5,
  desc: 'A short, weakly pitched hand-drum "tuk" from a Karplus-Strong noise loop with random sign flips, softened and given a small thump.',
  events: 'a pen tap rhythm; notebook percussion; a rim tick; a step on a hand-drawn timeline',
  from: 'research: synthesis.md ksDrum (Jaffe and Smith, Karplus-Strong drum variant)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, r = H.r, key = o.key || 69;
  const f = o.f ? +o.f : H.mtof(key - 24 + H.pick([0, 2, 4, 7, 9])) * Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.2);
  const dur = Math.max(0.2, +o.dur || 0.5), bb = o.b != null ? +o.b : H.rr(0.8, 0.92), thump = H.rr(0.5, 0.9);
  H.buffer(out, t, dur, d => {
    const n = d.length, N = Math.max(8, Math.round(sr / f)), y = new Float64Array(n);
    let lp = 0; for (let i = 0; i <= N && i < n; i++) { lp += 0.6 * ((r() * 2 - 1) - lp); y[i] = lp; }
    for (let i = N + 1; i < n; i++) y[i] = 0.995 * (r() < bb ? 1 : -1) * 0.5 * (y[i - N] + y[i - N - 1]);
    let pk = 1e-9; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(y[i]));
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr; ph += TAU * f * (1 + 0.35 * Math.exp(-tt / 0.012)) / sr;
      d[i] = (y[i] / pk + thump * Math.sin(ph) * Math.exp(-tt / 0.04)) * (1 - Math.exp(-tt / 0.0005));
    }
    const fo = Math.round(0.08 * sr); for (let i = 0; i < fo; i++) d[n - 1 - i] *= i / fo;
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 2800, q: 0.5 }] });
});

define('tubePop', { family: 'material', styles: ['3dlight', 'doodle-draw'], tags: ['organic', 'natural', 'soft', 'glassy'], dur: 0.4,
  desc: 'A hollow, round "bloop" of an open glass tube: a closed-open waveguide with odd harmonics and a small pitch flick; no water.',
  events: 'a pipette tip pops; a capillary releases; a test tube hoots; a cork-like pop',
  from: 'research: synthesis.md tubePop (STK BlowBotl, Karplus-Strong waveguide)' },
(ac, out, t, o, H) => {
  const sr = H.sr, key = o.key || 69;
  let f = o.note != null ? H.mtof(+o.note) : H.mtof(key + H.pick([0, 2, 4, 7, 9, 12]));
  while (f < 280) f *= 2; while (f > 700) f /= 2;
  f *= Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.15);
  const dur = Math.max(0.15, +o.dur || 0.45), g = H.rr(0.97, 0.985), a = H.rr(0.5, 0.6), flick = H.rr(0.04, 0.08), lpd = a / (1 - a), exLen = Math.round(H.rr(0.0018, 0.0026) * sr);
  H.buffer(out, t, dur, d => {
    const n = d.length, y = new Float64Array(n), x = new Float64Array(exLen); let lp = 0, st = 0;
    for (let i = 0; i < exLen; i++) { lp += 0.25 * ((H.r() * 2 - 1) - lp); x[i] = lp * Math.sin(Math.PI * (i + 0.5) / exLen); }
    for (let i = 0; i < n; i++) {
      const tt = i / sr, ff = f * (1 + flick * Math.exp(-tt / 0.008)), D = Math.max(2, sr / (2 * ff) - lpd), Di = Math.floor(D), fr = D - Di, j = i - Di;
      const yd = j >= 1 ? y[j] * (1 - fr) + y[j - 1] * fr : j === 0 ? y[0] * (1 - fr) : 0;
      st = (1 - a) * yd + a * st;
      y[i] = (i < exLen ? x[i] : 0) - g * st;
    }
    for (let i = 0; i < n; i++) d[i] = (y[i] - (i < exLen ? x[i] : 0)) * Math.min(1, i / (0.0006 * sr)); // the resonance only, without the raw excitation click
    const fo = Math.round(0.06 * sr); for (let i = 0; i < fo; i++) d[n - 1 - i] *= i / fo;
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0, filters: [{ type: 'lowpass', f: 6000, q: 0.5 }] });
});

define('breathTone', { family: 'organic', styles: ['3dlight', 'doodle-draw'], tags: ['airy', 'soft', 'natural', 'tonal'], dur: 0.9,
  desc: 'A soft pitched puff of air, like blowing across a bottle: narrow-band noise on a note of the key with a gentle flutter and a little raw breath on top.',
  events: 'an aerosol is released; an inhaler or spray demo; an exhale; an air-jet transition',
  from: 'research: synthesis.md breathTone (STK BlowBotl)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, key = o.key || 69, T = Math.max(0.25, +o.dur || H.rr(0.5, 0.85));
  let f = o.note != null ? H.mtof(+o.note) : H.mtof(key + H.pick([0, 2, 4, 7, 9]));
  while (f < 350) f *= 2; while (f > 900) f /= 2;
  f *= Math.pow(2, (o.pitch || 0) / 12) * H.semis(0.12);
  const kn = Math.ceil(T * 6) + 4, vn = new Float64Array(kn); for (let i = 0; i < kn; i++) vn[i] = H.r() * 2 - 1;
  const wob = x => { const i = Math.floor(x), u = x - i, s = (1 - Math.cos(Math.PI * u)) / 2; return vn[i] * (1 - s) + vn[i + 1] * s; };
  const mk = () => { let c1 = 0, c2 = 0; return (x, fq, Q) => { const g = Math.tan(Math.PI * Math.min(fq, sr * 0.45) / sr), k = 1 / Q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - c2, v1 = a1 * c1 + a2 * v3, v2 = c2 + a2 * c1 + a3 * v3; c1 = 2 * v1 - c1; c2 = 2 * v2 - c2; return v1 * k; }; };
  const bA = mk(), bA2 = mk(), bB = mk(), bB2 = mk(); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, hl = 0, lb = 0, lb2 = 0, lb3 = 0;
  const aH = 1 - Math.exp(-TAU * 2000 / sr), aB = 1 - Math.exp(-TAU * 4500 / sr), rel = 0.12;
  H.buffer(out, t, T + 0.25, d => {
    const n = d.length, A = new Float32Array(n), B = new Float32Array(n), C = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const tt = i / sr, at = Math.min(1, tt / 0.04), e = at * at * (3 - 2 * at) * (0.8 + 0.2 * Math.exp(-tt / 0.1)) * (tt < T ? 1 : Math.pow(Math.max(0, 1 - (tt - T) / rel), 2));
      const w = H.r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
      const pk = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      const fq = f * (1 + 0.006 * wob(tt * 6));
      A[i] = bA2(bA(pk * e, fq, 24), fq, 24); B[i] = bB2(bB(pk * e, fq * 2.76, 24), fq * 2.76, 24); // two cascaded bands: bandwidth of Q 36, steeper skirts
      const wr = H.r() * 2 - 1; hl += aH * (wr - hl); lb += aB * ((wr - hl) - lb); lb2 += aB * (lb - lb2); lb3 += aB * (lb2 - lb3); C[i] = lb3 * e;
    }
    const rms = x => { let s = 0; for (let i = 0; i < n; i++) s += x[i] * x[i]; return Math.sqrt(s / n) + 1e-12; };
    const ra = rms(A), gB = 0.15 * ra / rms(B), gC = Math.pow(10, -17 / 20) * ra / rms(C);
    for (let i = 0; i < n; i++) d[i] = A[i] + gB * B[i] + gC * C[i];
  }, { level: 0.25 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
});

define('bambooChimes', { family: 'texture', styles: ['doodle-draw'], tags: ['woody', 'natural', 'airy', 'tonal'], dur: 3.3,
  desc: 'Bamboo tubes clattering in a gust: sparse random knocks, each ringing a tube tuned to a pentatonic set of the key, building with the wind and fading away.',
  events: 'wind through the margins; hand-drawn weather; an idle ambience; a quiet garden scene',
  from: 'research: synthesis.md bambooChimes (STK Shakers PhISEM bamboo chimes, Cook)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, r = H.r, T = Math.max(1, +o.dur || 3), n = Math.ceil((T + 0.3) * sr);
  const offs = [0, 2, 5, 7, 9, 12, 14], base = H.mtof((o.key || 69) + 12) * Math.pow(2, (o.pitch || 0) / 12), K = offs.length;
  const fr = offs.map(s => base * Math.pow(2, s / 12) * H.semis(0.06)), pans = offs.map((_, i) => -0.55 + 1.1 * i / (K - 1));
  for (let i = K - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = pans[i]; pans[i] = pans[j]; pans[j] = tmp; }
  const R1 = fr.map(() => 1 - H.rr(0.0012, 0.0024)), R2 = 1 - H.rr(0.003, 0.005), m2 = 2.76;
  const c1 = fr.map((f, k) => 2 * R1[k] * Math.cos(TAU * f / sr)), q1 = R1.map(x => -x * x), c2 = fr.map(f => 2 * R2 * Math.cos(TAU * f * m2 / sr)), q2 = -R2 * R2;
  const n1 = fr.map(f => Math.sin(TAU * f / sr)), n2 = fr.map(f => Math.sin(TAU * f * m2 / sr)); // impulse-peak normalisation of each resonator
  const y1 = new Float64Array(K), y2 = new Float64Array(K), z1 = new Float64Array(K), z2 = new Float64Array(K), lvl = new Float64Array(K);
  const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1), kn = Math.ceil(T * 1.7) + 4, vn = new Float64Array(kn); for (let i = 0; i < kn; i++) vn[i] = r();
  const gl = pans.map(p => Math.cos((p + 1) * Math.PI / 4)), gr = pans.map(p => Math.sin((p + 1) * Math.PI / 4));
  let last = -1, last2 = -1;
  for (let i = 0; i < n; i++) {
    const tt = i / sr, x = tt * 1.7, ki = Math.floor(x), u = x - ki, s = (1 - Math.cos(Math.PI * u)) / 2, gust = 0.7 + 0.6 * (vn[ki] * (1 - s) + vn[ki + 1] * s);
    const rs = Math.min(1, tt / 0.3), uu = Math.min(1, Math.max(0, (tt - 0.3) / (T - 0.3))), E = tt < T ? rs * rs * (3 - 2 * rs) * Math.pow(0.5 + 0.5 * Math.cos(Math.PI * uu), 1.3) * gust : 0;
    if (r() < (2 + 14 * E) / sr) { let k; do { k = Math.floor(r() * K); } while (k === last || k === last2); last2 = last; last = k; lvl[k] += (0.4 + 0.5 * r()) * Math.pow(E, 0.6); }
    let sl = 0, sr_ = 0;
    for (let k = 0; k < K; k++) {
      const lv = lvl[k]; let xin = 0; if (lv > 1e-7) { xin = (r() * 2 - 1) * lv; lvl[k] = lv * 0.94; }
      const y = xin * n1[k] + c1[k] * y1[k] + q1[k] * y2[k]; y2[k] = y1[k]; y1[k] = y;
      const z = xin * n2[k] + c2[k] * z1[k] + q2 * z2[k]; z2[k] = z1[k]; z1[k] = z;
      const v = y + 0.18 * z; sl += v * gl[k]; sr_ += v * gr[k];
    }
    L[i] = sl; R[i] = sr_;
  }
  let mx = 1e-9; for (let i = 0; i < n; i++) { const a = Math.abs(L[i]), d = Math.abs(R[i]); if (a > mx) mx = a; if (d > mx) mx = d; }
  const fo = Math.round(0.2 * sr); for (let i = 0; i < n; i++) { const w = i > n - fo ? Math.pow((n - i) / fo, 2) : 1; L[i] = L[i] / mx * w; R[i] = R[i] / mx * w; }
  const s = ac.createBufferSource(); s.buffer = b; s.start(t);
  const g = H.out(s, out, t, { level: 0.17 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
  g.connect(H.verb(out, { sec: 1.0, decay: 3, wet: 0.2, lp: 5000 }));
});

// ---------------------------------------------------------------- Textures and ambiences
define('breathChord', { family: 'texture', styles: ['3dlight', 'doodle-draw'], tags: ['airy', 'noisy', 'tonal', 'soft'], dur: 9.7,
  desc: 'A quiet air-borne chord made only of noise: five very narrow resonances on a stacked fifth-and-octave chord that drift in level and pitch, like wind through a hollow instrument; it wraps exactly at o.loop (default 45 s).',
  events: 'a bed under dissolves and loops; calm sections; a pad replacement with its own identity',
  from: 'research: synthesis.md breathChord (Soundcy whoosh, derived)' },
(ac, out, t, o, H) => {
  const sr = H.sr, TAU = H.TAU, loop = Math.max(2, +o.loop || 45), dur = Math.max(1, +o.dur || 9), warm = 1.6;
  const tonic = H.mtof((o.key || 69) - 12) * Math.pow(2, (o.pitch || 0) / 12), ratios = [1, 3 / 2, 2, 9 / 4, 3], ks = [5, 7, 9, 11, 13], nF = ratios.length;
  const nOut = Math.ceil(dur * sr), nW = Math.round(warm * sr), nT = nW + nOut, loopN = Math.round(loop * sr), M = Math.min(loopN, nT);
  // pink noise, periodic with the loop length
  const nz = new Float32Array(M); { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < M; i++) { const w = H.r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980; nz[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; } }
  // periodic value noise (cubic) with `cyc` cycles per loop; ph is the position in the loop in [0, 1)
  const tabs = ks.map(k => { const v = new Float64Array(k); for (let i = 0; i < k; i++) v[i] = H.r(); return v; });
  const vnoise = (v, ph) => { const k = v.length, x = ph * k, i = Math.floor(x), u = x - i, a = v[(i + k - 1) % k], b = v[i % k], c = v[(i + 1) % k], d = v[(i + 2) % k]; return Math.min(1, Math.max(0, b + 0.5 * u * (c - a + u * (2 * a - 5 * b + 4 * c - d + u * (3 * (b - c) + d - a))))); };
  const pans = [-0.5, -0.25, 0, 0.25, 0.5]; for (let i = nF - 1; i > 0; i--) { const j = Math.floor(H.r() * (i + 1)); const tmp = pans[i]; pans[i] = pans[j]; pans[j] = tmp; }
  const gl = pans.map(p => Math.cos((p + 1) * Math.PI / 4)), gr = pans.map(p => Math.sin((p + 1) * Math.PI / 4)), dph = ratios.map(() => H.r() * TAU), dcyc = [2, 3, 4, 3, 2];
  const Q = 70, B = ac.createBuffer(2, nOut, sr), L = B.getChannelData(0), R = B.getChannelData(1);
  const x1 = new Float64Array(nF), x2 = new Float64Array(nF), y1 = new Float64Array(nF), y2 = new Float64Array(nF), cb0 = new Float64Array(nF), ca1 = new Float64Array(nF), ca2 = new Float64Array(nF), gn = new Float64Array(nF);
  for (let i = 0; i < nT; i++) {
    const ta = (i - nW) / sr, ph = (((ta / loop) % 1) + 1) % 1;
    if ((i & 63) === 0) for (let k = 0; k < nF; k++) {
      const fk = tonic * ratios[k] * Math.pow(2, 0.0067 * Math.sin(TAU * dcyc[k] * ph + dph[k]) ), w = TAU * fk / sr, al = Math.sin(w) / (2 * Q), a0 = 1 + al;
      cb0[k] = al / a0; ca1[k] = -2 * Math.cos(w) / a0; ca2[k] = (1 - al) / a0; gn[k] = 0.2 + 0.8 * vnoise(tabs[k], ph);
    }
    const x = nT > loopN ? nz[((i - nW) % loopN + loopN) % loopN] : nz[i];
    let sl = 0, sr_ = 0;
    for (let k = 0; k < nF; k++) {
      const y = cb0[k] * (x - x2[k]) - ca1[k] * y1[k] - ca2[k] * y2[k]; x2[k] = x1[k]; x1[k] = x; y2[k] = y1[k]; y1[k] = y;
      const v = y * gn[k]; sl += v * gl[k]; sr_ += v * gr[k];
    }
    if (i >= nW) { L[i - nW] = sl; R[i - nW] = sr_; }
  }
  let mx = 1e-9; for (let i = 0; i < nOut; i++) { const a = Math.abs(L[i]), d = Math.abs(R[i]); if (a > mx) mx = a; if (d > mx) mx = d; }
  const fd = Math.min(nOut >> 1, Math.round((o.fade != null ? +o.fade : 0.004) * sr));
  for (let i = 0; i < nOut; i++) { const w = i < fd ? i / fd : i >= nOut - fd ? (nOut - 1 - i) / fd : 1; L[i] = L[i] / mx * w; R[i] = R[i] / mx * w; }
  const s = ac.createBufferSource(); s.buffer = B; s.start(t);
  const g = H.out(s, out, t, { level: 0.15 * Math.pow(10, H.rr(-1.5, 1.5) / 20), pan: o.pan || 0 });
  const wet = o.wet != null ? +o.wet : 0.3; if (wet > 0) g.connect(H.verb(out, { sec: 1.2, decay: 3, wet, lp: 5500 }));
});

// ================================================================ Music voices: leads, plucks, bass, pads, rhythm, stingers (research/music_beds.md). Several stingers call fmGlassPluck, resoPluck, glassPad and shimmerTail through lib.fx, so keep those four.
// ---------------------------------------------------------------- music_a: instrument voices and one-shot musical sounds for the music-bed engine (3dlight palette)
// Voices are played note by note: o.note (MIDI) or o.key (MIDI tonic, default 69), o.vel (0..1.3, default 1: level and brightness), o.dur (held length for
// sustained voices, with a clean release after it), o.pan, o.pitch (semitones). Chord voices take o.notes. Reverb baked into a voice is scaled by o.verb (0 = dry).
// Pitched voices only detune by a few cents per play, so they stay in tune with the pads; the rest of the per-seed variation is level, timbre and timing.
// meta.dur: for pads, drones and bass it is the default held length (the release adds up to 1.3 s); for everything else it is the full length.
// Composed voices (gatedArp, dottedPing, octaveFlam, chordSwellToUnison, fiveNoteMnemonic, jewelResolve) play fmGlassPluck, resoPluck, glassPad and
// shimmerTail through lib.fx, so those four must stay defined in the same library.

// ---------------------------------------------------------------- leads and plucks
// opts: note, vel, dur (decay length, s), gate (cut the note after s), idx (start FM index), exact (no detune), pan, pitch
define('fmGlassPluck', { family: 'tonal', styles: ['3dlight'], tags: ['glassy', 'crisp', 'tonal', 'premium', 'cold'], dur: 1.2,
  desc: 'A short clear glass pluck: a bright, slightly inharmonic strike that mellows to a near-pure sine within about 150 ms, with a faint shimmer on top.',
  events: 'a node or card appears; arpeggio and count-up steps; data points land; any single note of a motif or bed',
  from: 'research: music_beds fmGlassPluck (2-op FM at 5:7, index 3.2 falling to 0.15; sources 13, 14)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const f = H.mtof((o.note ?? o.key ?? 69) + (o.pitch || 0)) * (o.exact ? 1 : Math.pow(2, H.rr(-2, 2) / 1200));
  const T = o.dur != null ? H.clamp(o.dur, 0.1, 4) : H.clamp(0.9 * Math.sqrt(440 / f), 0.3, 1.2), tau = T / 6.908;
  const I0 = (o.idx ?? (1.4 + 1.9 * vel)) * (1 + H.rr(-0.12, 0.12)) * H.clamp(1500 / f, 0.45, 1);
  const gate = o.gate, len = (gate != null ? Math.min(T, gate + 0.06) : T) + 0.02, n = Math.ceil(sr * len);
  const w = TAU * f / sr, hpA = Math.exp(-TAU * 4000 / sr);
  H.buffer(out, t, len, d => {
    let pc = 0, pm = 0, hp = 0, xp = 0;
    for (let i = 0; i < n; i++) {
      const s = i / sr, at = s < 0.002 ? 0.5 - 0.5 * Math.cos(Math.PI * s / 0.002) : 1, I = 0.12 + (I0 - 0.12) * Math.exp(-s / 0.04);
      let y = Math.sin(pc + I * Math.sin(pm)) * Math.exp(-s / tau) + 0.1 * Math.sin(2 * pc) * Math.exp(-s / 0.06);
      if (s < 0.005) { const x = r() * 2 - 1; hp = hpA * (hp + x - xp); xp = x; y += 0.02 * hp * Math.exp(-s / 0.0015); }
      const gt = gate == null || s < gate ? 1 : s < gate + 0.04 ? Math.pow(Math.cos(Math.PI * 0.5 * (s - gate) / 0.04), 2) : 0;
      d[i] = y * at * gt * Math.min(1, (n - i) / (0.02 * sr));
      pc += w; pm += w * 1.4;
    }
  }, { level: 0.18 * vel * lv, pan: (o.pan || 0) + H.rr(-0.2, 0.2), filters: [{ type: 'highpass', f: f * 0.62, q: -3 }, { type: 'highpass', f: f * 0.62, q: -3 }] });
});

// opts: note, vel, gate (s, cut the note), pan, pitch
define('resoPluck', { family: 'tonal', styles: ['3dlight'], tags: ['warm', 'digital', 'tonal', 'premium'], dur: 0.45,
  desc: 'A rounded subtractive pluck that bwips on a resonant filter sweep: warm, electronic and tidy, never buzzy.',
  events: 'arpeggio and pulse steps; bar-one accents; small hops; a quick answer note',
  from: 'research: music_beds resoPluck (saw plus sub-square, resonant lowpass 4.2 kHz to 520 Hz; source 23)' },
(ac, out, t, o, H) => {
  const { sr, TAU } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const f = H.mtof((o.note ?? o.key ?? 69) + (o.pitch || 0)) * Math.pow(2, H.rr(-3, 3) / 1200), gate = o.gate;
  const len = (gate != null ? Math.min(0.45, gate + 0.07) : 0.45), n = Math.ceil(sr * len);
  const peak = Math.min(3600, 4200 * (0.6 + 0.4 * Math.min(vel, 1)) * (1 + H.rr(-0.1, 0.1))), k = 1 / 4.5, dt = f / sr;
  const blep = (p, d) => p < d ? (p /= d, p + p - p * p - 1) : p > 1 - d ? (p = (p - 1) / d, p * p + p + p + 1) : 0;
  let pa = H.r(), pb = H.r(), s1 = 0, s2 = 0, lp7 = 0; const c7 = 1 - Math.exp(-TAU * 7000 / sr);
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, saw = 2 * pa - 1 - blep(pa, dt), sq = (pb < 0.5 ? 1 : -1) + blep(pb, dt / 2) - blep((pb + 0.5) % 1, dt / 2);
      pa += dt; if (pa >= 1) pa -= 1; pb += dt / 2; if (pb >= 1) pb -= 1;
      const x = saw + 0.4 * sq, fc = peak * Math.pow(520 / peak, Math.min(s, 0.16) / 0.16);
      const g = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      const v3 = x - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
      lp7 += c7 * (v2 - lp7);
      const at = s < 0.003 ? 0.5 - 0.5 * Math.cos(Math.PI * s / 0.003) : 1, gt = gate == null || s < gate ? 1 : s < gate + 0.05 ? Math.pow(Math.cos(Math.PI * 0.5 * (s - gate) / 0.05), 2) : 0;
      d[i] = lp7 * at * gt * Math.exp(-s / 0.055) * Math.min(1, (n - i) / (0.02 * sr));
    }
  }, { level: 0.25 * vel * lv, pan: (o.pan || 0) + H.rr(-0.3, 0.3), filters: [{ type: 'highpass', f: 150, q: 0 }] });
});

// opts: notes (the cell, cycled; default 1 5 9 3 5' of the key), bpm (106.7), dur (run length, s), cell (steps per cell, default notes.length),
//       steps (active steps of the cell, for the additive build), gate (0.07 s), voice ('fm' or 'reso'), vel, pan, pitch
define('gatedArp', { family: 'tonal', styles: ['3dlight'], tags: ['tonal', 'crisp', 'digital', 'premium'], dur: 2.4,
  desc: 'A Reich-style pulse: a cell of short glass plucks, one per sixteenth, with an accent pattern that gives the grain, under a lowpass that opens across the run.',
  events: 'a process running; a pipeline or assembly working; cells cycling; the engine of a bed',
  from: 'research: music_beds gatedArp (5-sixteenth cell, gate 70 ms, lowpass 1.8 to 3.2 kHz; sources 1, 12, 23)' },
(ac, out, t, o, H) => {
  const key = o.key ?? 69, sx = 60 / (o.bpm ?? 106.7) / 4, dur = H.clamp(o.dur ?? 2.25, sx, 40), V = [0.85, 0.45, 0.55, 0.5, 0.6];
  const notes = (o.notes && o.notes.length ? o.notes : [0, 7, 14, 4, 19].map(x => key + x)), N = Math.max(1, Math.round(o.cell ?? notes.length));
  const active = Math.min(N, Math.round(o.steps ?? N)), gate = o.gate ?? 0.07, fx = o.voice === 'reso' ? 'resoPluck' : 'fmGlassPluck';
  const lp = H.filter('lowpass', 1800, 0); lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(3200, t + dur); lp.connect(out);
  const steps = Math.ceil(dur / sx - 1e-6);
  for (let i = 0; i < steps; i++) {
    const ci = i % N; if (ci >= active) continue;
    const at = Math.max(t, t + i * sx + H.rr(-0.004, 0.004));
    lib.fx[fx](ac, lp, at, { note: notes[ci % notes.length] + (o.pitch || 0), vel: V[ci % V.length] * (1 + H.rr(-0.08, 0.08)) * (o.vel ?? 1), gate, pan: o.pan || 0, g: 1.0, seed: Math.floor(H.r() * 2147483647) });
  }
});

// opts: note, from (previous note, for the 35 ms glide), dur (held length, s), vel, verb, pan, pitch
define('softSquare', { family: 'tonal', styles: ['3dlight'], tags: ['soft', 'digital', 'tonal', 'clinical'], dur: 1.3,
  desc: 'A pensive, hollow lead like a muted digital flute: odd harmonics under a soft lowpass, a late vibrato and a touch of room.',
  events: 'a title or claim motif; an answer phrase; the hero entering; a three to five note melody',
  from: 'research: music_beds softSquare (odd harmonics 1/k^1.2 to k=11, lowpass about 1.9 kHz; source 5)' },
(ac, out, t, o, H) => {
  const { sr, TAU } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), pit = o.pitch || 0;
  const f = H.mtof((o.note ?? o.key ?? 69) + pit) * Math.pow(2, H.rr(-3, 3) / 1200), glide = o.from != null ? (o.from - (o.note ?? o.key ?? 69)) / 12 : 0;
  const hold = H.clamp(o.dur ?? 0.6, 0.08, 8), rel = 0.18, len = hold + rel + 0.04, n = Math.ceil(sr * len), NT = 2048, tb = new Float32Array(NT + 1);
  for (let k = 1; k <= 11; k += 2) for (let i = 0; i < NT; i++) tb[i] += Math.sin(TAU * k * i / NT) / Math.pow(k, 1.2);
  tb[NT] = tb[0];
  const kq = 1 / 0.9, vph = H.r() * TAU;
  let ph = 0, s1 = 0, s2 = 0;
  const bus = H.gain(1, out), rv = H.verb(out, { sec: 1.0, decay: 3.5, wet: 0.5 * (o.verb ?? 1), lp: 5000 }); bus.connect(rv);
  H.buffer(bus, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, vf = s < 0.25 ? 0 : Math.min(1, (s - 0.25) / 0.3), cents = 5 * vf * Math.sin(TAU * 5.2 * s + vph);
      const gl = s < 0.035 ? glide * (1 - s / 0.035) : 0, fi = f * Math.pow(2, cents / 1200 + gl);
      ph += fi / sr; const q = (ph - Math.floor(ph)) * NT, i0 = q | 0, fr = q - i0;
      const x = tb[i0] + (tb[i0 + 1] - tb[i0]) * fr + 0.2 * Math.sin(Math.PI * (ph % 2));
      const fc = s < 0.08 ? 1200 * Math.pow(2100 / 1200, s / 0.08) : 1900 + 200 * Math.exp(-(s - 0.08) / 0.25);
      const g = Math.tan(Math.PI * fc / sr), a1 = 1 / (1 + g * (g + kq)), a2 = g * a1, a3 = g * a2;
      const v3 = x - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
      const at = s < 0.018 ? 0.5 - 0.5 * Math.cos(Math.PI * s / 0.018) : 1, rl = s < hold ? 1 : s < hold + rel ? Math.pow(Math.cos(Math.PI * 0.5 * (s - hold) / rel), 2) : 0;
      d[i] = v2 * at * rl;
    }
  }, { level: 0.23 * vel * lv, pan: (o.pan || 0) + H.rr(-0.1, 0.1) });
});

// opts: notes (chord tones, up to 4; default the key's maj7 without root), vel, invert (bool; seeded by default), pan, pitch
define('sawStab', { family: 'tonal', styles: ['3dlight'], tags: ['warm', 'digital', 'bright', 'premium'], dur: 0.45,
  desc: 'A warm chord punch that snaps shut: three chord tones on detuned saws through a fast-closing lowpass, spread left and right with a Haas offset.',
  events: 'a beat-one accent; a section change; a panel snaps into place; syncopated chord hits',
  from: 'research: music_beds sawStab (3 saws per voice at -6/0/+6 cents, lowpass 3.2 kHz to 700 Hz in 220 ms; sources 11, 22)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, key = o.key ?? 69, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  let notes = (o.notes && o.notes.length ? o.notes.slice(0, 4) : [key - 5, key - 1, key + 4]).map(m => m + (o.pitch || 0)).sort((a, b) => a - b);
  if (o.invert ?? r() < 0.4) notes.push(notes.shift() + 12);
  const len = 0.46, n = Math.ceil(sr * len), peak = 3200 * (1 + H.rr(-0.08, 0.08)) * (0.85 + 0.15 * Math.min(vel, 1)), k = 1 / 1.6;
  const blep = (p, dt) => p < dt ? (p /= dt, p + p - p * p - 1) : p > 1 - dt ? (p = (p - 1) / dt, p * p + p + p + 1) : 0;
  const pans = [-0.5, 0.5, 0, -0.3], dly = [0, 0.012, 0.006, 0.012];
  const play = (fill, level, fl) => {
    const b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1); fill(L, R); let m = 1e-9;
    for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
    for (let i = 0; i < n; i++) { L[i] *= level / m; R[i] *= level / m; }
    const s = ac.createBufferSource(); s.buffer = b; const bq = H.filter(fl[0], fl[1], fl[2]); s.connect(bq); bq.connect(out); s.start(t);
  };
  play((L, R) => {
    notes.forEach((m, vi) => {
      const f = H.mtof(m), dts = [-6, 0, 6].map(c => f * Math.pow(2, (c + H.rr(-1, 1)) / 1200) / sr), ph = [r(), r(), r()], x = new Float32Array(n);
      let s1 = 0, s2 = 0;
      for (let i = 0; i < n; i++) {
        const s = i / sr; let v = 0;
        for (let j = 0; j < 3; j++) { v += 2 * ph[j] - 1 - blep(ph[j], dts[j]); ph[j] += dts[j]; if (ph[j] >= 1) ph[j] -= 1; }
        const fc = peak * Math.pow(700 / peak, Math.min(s, 0.22) / 0.22), g = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
        const v3 = v - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
        const at = s < 0.004 ? 0.5 - 0.5 * Math.cos(Math.PI * s / 0.004) : 1;
        x[i] = v2 * at * Math.exp(-s / 0.05) * Math.min(1, (n - i) / (0.03 * sr));
      }
      const pn = H.clamp(pans[vi % 4] + (o.pan || 0), -1, 1), a = (pn + 1) * Math.PI / 4, gl = Math.cos(a), gr = Math.sin(a), off = Math.round(dly[vi % 4] * sr);
      for (let i = 0; i + off < n; i++) { L[i + off] += x[i] * gl; R[i + off] += x[i] * gr; }
    });
  }, 0.178 * vel * lv, ['highpass', 180, 0]);
});

// opts: note, vel, pan, pitch. Best above 400 Hz
define('glassHarp', { family: 'tonal', styles: ['3dlight'], tags: ['glassy', 'airy', 'tonal', 'premium'], dur: 3,
  desc: 'A harp-like string excited by a pure sine burst instead of noise: cleaner and more digital than a plucked string, with a quick glassy bloom and a long soft ring.',
  events: 'a delicate arrival; a rising pattern; chord sparkle; a quiet note that should not sound wooden',
  from: 'research: music_beds glassHarp (Karplus-Strong with sine-burst excitation and 3-tap loop filter; source 15)' },
(ac, out, t, o, H) => {
  const { sr, TAU } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const f = H.mtof((o.note ?? (o.key ?? 69) + 12) + (o.pitch || 0)) * Math.pow(2, H.rr(-2, 2) / 1200), per = sr / f;
  const NI = Math.max(2, Math.floor(per - 1.5)), D = per - NI - 1, ap = (1 - D) / (1 + D);
  const t60 = Math.min(3, H.rr(1.6, 2.6)), cosw = Math.cos(TAU * f / sr / 2), loss = Math.min(0.9999, Math.pow(10, -3 / (f * t60)) / (cosw * cosw));
  const nb = Math.ceil(2 * sr / f), a3 = 0.35 + 0.55 * Math.min(vel, 1.2), len = t60 + 0.1, n = Math.ceil(sr * len);
  const line = new Float32Array(NI); let p = 0, x1 = 0, x2 = 0, axp = 0, ayp = 0;
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) {
      const xv = line[p], y3 = (0.25 * xv + 0.5 * x1 + 0.25 * x2) * loss; x2 = x1; x1 = xv;
      const ya = ap * y3 + axp - ap * ayp; axp = y3; ayp = ya;
      let e = 0;
      if (i < nb) { const w = 0.5 - 0.5 * Math.cos(TAU * i / nb), ph = TAU * f * i / sr; e = w * (0.4 * Math.sin(ph) + 0.45 * Math.sin(2 * ph) + a3 * Math.sin(3 * ph)); }
      const v = ya + e; line[p] = v; p = p + 1 < NI ? p + 1 : 0;
      d[i] = v * Math.min(1, (n - i) / (0.05 * sr));
    }
  }, { level: 0.25 * vel * lv, pan: (o.pan || 0) + H.rr(-0.4, 0.4) });
});

// opts: note, from (previous note, for the legato glide), dur (held length, s), vel, verb, pan, pitch
define('singingGlass', { family: 'tonal', styles: ['3dlight', 'doodle-draw'], tags: ['airy', 'glassy', 'soft', 'tonal', 'premium'], dur: 3.6,
  desc: 'A sustained bowed-glass tone that swells slowly, shimmers with a beating overtone and a faint bow hiss, and settles into a soft room.',
  events: 'a slow melody under narration; a large structure is revealed; a camera push; one held note per bar',
  from: 'research: music_beds singingGlass (sines at f, 2f, 3f and a detuned 2f, 600 ms swell, tremolo 4.6 Hz; sources 5, 16)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), pit = o.pitch || 0;
  const note = (o.note ?? (o.key ?? 69) + 7), f = H.mtof(note + pit) * Math.pow(2, H.rr(-3, 3) / 1200), glide = o.from != null ? (o.from - note) / 12 : 0;
  const hold = H.clamp(o.dur ?? 2.4, 0.5, 20), att = Math.min(0.6, hold), rel = 0.9, len = hold + rel + 0.04, n = Math.ceil(sr * len);
  const nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = r() * 2 - 1;
  const bow = DSP.reson(nz, sr, 3400, 3400 / 5); DSP.norm(bow);
  const tph = r() * TAU;
  let ph = 0, ph2 = 0;
  const bus = H.gain(1, out), rv = H.verb(out, { sec: 1.0, decay: 3.5, wet: 0.65 * (o.verb ?? 1), lp: 5000 }); bus.connect(rv);
  H.buffer(bus, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, sc = s < 0.12 ? -15 * Math.pow(1 - s / 0.12, 2) / 1200 : 0, gl = s < 0.12 ? glide * Math.pow(1 - s / 0.12, 2) : 0, fi = f * Math.pow(2, sc + gl);
      ph += TAU * fi / sr; ph2 += TAU * (2 * fi + 0.8) / sr;
      const sw = s < att ? Math.pow(Math.sin(Math.PI * 0.5 * s / att), 2) : 1, trem = 1 - 0.06 * (0.5 - 0.5 * Math.cos(TAU * 4.6 * s + tph));
      const x = Math.sin(ph) + 0.251 * Math.sin(2 * ph) + 0.063 * Math.sin(3 * ph) + 0.158 * Math.sin(ph2) + 0.04 * bow[i] * sw;
      const rl = s < hold ? 1 : s < hold + rel ? Math.pow(Math.cos(Math.PI * 0.5 * (s - hold) / rel), 2) : 0;
      d[i] = x * sw * trem * rl;
    }
  }, { level: 0.23 * vel * lv, pan: (o.pan || 0) + H.rr(-0.15, 0.15) });
});

// ---------------------------------------------------------------- bass
// opts: note (root; default the key folded into 55-104 Hz), dur (held length; default one 8th at bpm), bpm (106.7), vel, pan, pitch
define('subPulse', { family: 'tonal', styles: ['3dlight'], tags: ['sub', 'soft', 'dark', 'premium'], dur: 0.28,
  desc: 'A round sine pulse you feel more than hear: a low root with quiet 2nd and 3rd harmonics so laptop and booth speakers still carry the note.',
  events: 'the pulse of a bed; chord roots; a heavy object settling; a quiet low accent',
  from: 'research: music_beds subPulse (sine plus 2f at -9 dB and 3f at -14 dB, lowpass 450 Hz, soft tanh; sources 18, 33)' },
(ac, out, t, o, H) => {
  const { sr, TAU } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), key = o.key ?? 69;
  let m0 = o.note ?? 33 + (((key - 33) % 12) + 12) % 12; while (m0 > 57) m0 -= 12;
  const f = H.mtof(m0 + (o.pitch || 0)) * Math.pow(2, H.rr(-2, 2) / 1200);
  const hold = H.clamp(o.dur ?? (o.bpm ? 30 / o.bpm : 0.28), 0.05, 8), att = 0.012 * (1 + H.rr(-0.1, 0.1)), rel = 0.09, len = hold + rel + 0.02, n = Math.ceil(sr * len);
  const g = Math.tan(Math.PI * 450 / sr), k = 1.414, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, g2 = H.rr(0.33, 0.38), g3 = H.rr(0.18, 0.22), th = Math.tanh(1.4);
  let s1 = 0, s2 = 0, pk = 1e-9; const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ph = TAU * f * i / sr, x = Math.sin(ph) + g2 * Math.sin(2 * ph) + g3 * Math.sin(3 * ph);
    const v3 = x - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2; y[i] = v2; pk = Math.max(pk, Math.abs(v2));
  }
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, at = s < att ? Math.pow(Math.sin(Math.PI * 0.5 * s / att), 2) : 1, rl = s < hold ? 1 : s < hold + rel ? Math.pow(Math.cos(Math.PI * 0.5 * (s - hold) / rel), 2) : 0;
      d[i] = Math.tanh(1.4 * y[i] / pk) / th * at * rl;
    }
  }, { level: 0.25 * vel * lv, pan: o.pan || 0 });
});

// opts: note (root; default the key folded into 55-104 Hz), dur (held length, s), vel, pan, pitch
define('fmSubBass', { family: 'tonal', styles: ['3dlight'], tags: ['warm', 'sub', 'digital'], dur: 1.2,
  desc: 'A bass with a rounded bite on the attack that relaxes into a near-pure sine: warm FM at a one-to-one ratio, with no saw buzz.',
  events: 'sustained root notes; a product reveal; a held low note under a chord',
  from: 'research: music_beds fmSubBass (2-op FM 1:1, index 1.8 falling to 0.5 in 150 ms, lowpass 900 Hz; sources 13, 14)' },
(ac, out, t, o, H) => {
  const { sr, TAU } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), key = o.key ?? 69;
  let m0 = o.note ?? 33 + (((key - 33) % 12) + 12) % 12; while (m0 > 57) m0 -= 12;
  const f = H.mtof(m0 + (o.pitch || 0)) * Math.pow(2, H.rr(-2, 2) / 1200);
  const hold = H.clamp(o.dur ?? 1.2, 0.1, 12), rel = 0.12, len = hold + rel + 0.02, n = Math.ceil(sr * len), I0 = (1.3 + 0.5 * Math.min(vel, 1.2)) * (1 + H.rr(-0.08, 0.08));
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, ph = TAU * f * s, I = 0.5 + (I0 - 0.5) * Math.exp(-s / 0.05), at = s < 0.006 ? 0.5 - 0.5 * Math.cos(Math.PI * s / 0.006) : 1;
      const sus = 0.6 + 0.4 * Math.exp(-s / 0.12), rl = s < hold ? 1 : s < hold + rel ? Math.pow(Math.cos(Math.PI * 0.5 * (s - hold) / rel), 2) : 0;
      d[i] = (Math.sin(ph + I * Math.sin(ph)) + 0.71 * Math.sin(ph)) * at * sus * rl;
    }
  }, { level: 0.25 * vel * lv, pan: o.pan || 0, filters: [{ type: 'lowpass', f: 900, q: 0 }] });
});

// opts: note (root), dur (held length, s), bpm (106.7), depth (pump depth in dB, default 4), vel, pan, pitch
define('pumpBass', { family: 'tonal', styles: ['3dlight'], tags: ['warm', 'sub', 'soft'], dur: 4.5,
  desc: 'A sustained bass that breathes with the beat: a triangle and sine root under a low lowpass, dipping a few dB on every quarter and swelling back.',
  events: 'a chord-length bass under a pad; an alive, pulsing background; the root of a calm bed',
  from: 'research: music_beds pumpBass (triangle plus sine, lowpass 260 Hz, per-quarter duck 6 ms down then 90 ms back; sources 22, 35)' },
(ac, out, t, o, H) => {
  const { sr, TAU } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), key = o.key ?? 69;
  let m0 = o.note ?? 33 + (((key - 33) % 12) + 12) % 12; while (m0 > 57) m0 -= 12;
  const f = H.mtof(m0 + (o.pitch || 0)) * Math.pow(2, H.rr(-2, 2) / 1200), q = 60 / (o.bpm ?? 106.7), dv = Math.pow(10, -H.clamp(o.depth ?? 4, 0, 12) / 20);
  const hold = H.clamp(o.dur ?? 4.5, 0.2, 40), att = 0.012, rel = 0.25, len = hold + rel + 0.02, n = Math.ceil(sr * len);
  const g = Math.tan(Math.PI * 260 / sr), k = 1.414, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
  let s1 = 0, s2 = 0;
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, c = f * s - Math.floor(f * s), tri = 4 * Math.abs(c - 0.5) - 1, ph = TAU * f * s;
      const x = tri + 0.71 * Math.sin(ph) + 0.18 * Math.sin(2 * ph);
      const v3 = x - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
      const u = s % q, duck = u < 0.006 ? 1 - (1 - dv) * u / 0.006 : 1 - (1 - dv) * Math.exp(-(u - 0.006) / 0.09);
      const at = s < att ? Math.pow(Math.sin(Math.PI * 0.5 * s / att), 2) : 1, rl = s < hold ? 1 : s < hold + rel ? Math.pow(Math.cos(Math.PI * 0.5 * (s - hold) / rel), 2) : 0;
      d[i] = v2 * duck * at * rl;
    }
  }, { level: 0.25 * vel * lv, pan: o.pan || 0 });
});

// opts: note (root), dur (run length, s; default one bar), bpm (106.7), step (start position in the R,8ve,R,8ve pattern; accents on pattern steps 0 and 4), vel, pan, pitch
define('octaveRoll', { family: 'tonal', styles: ['3dlight'], tags: ['warm', 'dark', 'digital'], dur: 2.25,
  desc: 'Rolling root-and-octave eighths on a filtered saw with a sine under it: forward motion without drums.',
  events: 'momentum; a pipeline running; the second half of a chord; a build before a reveal',
  from: 'research: music_beds octaveRoll (saw into lowpass Q 2.5 sweeping 900 to 260 Hz, gate 55%; source 11)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), key = o.key ?? 69;
  let m0 = o.note ?? 33 + (((key - 33) % 12) + 12) % 12; while (m0 > 57) m0 -= 12;
  const f0 = H.mtof(m0 + (o.pitch || 0)) * Math.pow(2, H.rr(-2, 2) / 1200), e8 = 30 / (o.bpm ?? 106.7);
  const dur = H.clamp(o.dur ?? 2.25, 0.05, 30), steps = Math.max(1, Math.round(dur / e8)), s0 = Math.round(o.step ?? 0);
  const len = (steps - 1) * e8 + e8 * 0.55 + 0.05, n = Math.ceil(sr * len), kq = 1 / 2.5, L = e8 * 0.55;
  const blep = (p, dt) => p < dt ? (p /= dt, p + p - p * p - 1) : p > 1 - dt ? (p = (p - 1) / dt, p * p + p + p + 1) : 0;
  let s1 = 0, s2 = 0, pa = r();
  H.buffer(out, t, len, d => {
    for (let st = 0; st < steps; st++) {
      const j = s0 + st, oct = ((j % 2) + 2) % 2 === 1, acc = (((j % 4) + 4) % 4) === 0, f = f0 * (oct ? 2 : 1), dt = f / sr, i0 = Math.round(st * e8 * sr), m = Math.min(n - i0, Math.ceil((L + 0.02) * sr));
      const peak = (acc ? 1080 : 900) * (1 + H.rr(-0.05, 0.05)), amp = acc ? 1 : 0.75;
      for (let i = 0; i < m; i++) {
        const s = i / sr, saw = 2 * pa - 1 - blep(pa, dt); pa += dt; if (pa >= 1) pa -= 1;
        const x = saw + 0.5 * Math.sin(TAU * f * s), fc = 260 + (peak - 260) * Math.exp(-s / (0.11 / 3.2)), g = Math.tan(Math.PI * fc / sr), a1 = 1 / (1 + g * (g + kq)), a2 = g * a1, a3 = g * a2;
        const v3 = x - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2;
        const at = s < 0.004 ? 0.5 - 0.5 * Math.cos(Math.PI * s / 0.004) : 1, rl = s < L ? 1 : s < L + 0.02 ? 1 - (s - L) / 0.02 : 0;
        d[i0 + i] += v2 * amp * at * rl;
      }
    }
  }, { level: 0.25 * 0.708 * vel * lv, pan: o.pan || 0 });
});

// ---------------------------------------------------------------- pads and textures
// opts: notes (default Dmaj9 voicing of the key), dur (held length, s), att (1.6), rel (1.3; pass 2.4 for a longer fade), stagger (0.1 s per note), vel, pan
define('glassPad', { family: 'texture', styles: ['3dlight'], tags: ['glassy', 'airy', 'cold', 'tonal', 'premium'], dur: 6,
  desc: 'A transparent additive pad that never sounds like a saw: pure sine partials that each breathe on their own slow cycle, cold, clean and slowly alive.',
  events: 'the ground of every beat; a camera drift; a calm underlay for narration; a chord bloom',
  from: 'research: music_beds glassPad (sine partials 1-5 and 7, per-partial LFO periods 45/n s, 120 Hz to 3.2 kHz; sources 5, 10)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, key = o.key ?? 69, lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), vel = H.clamp(o.vel ?? 1, 0.05, 1.3);
  const hold = H.clamp(o.dur ?? 6, 0.4, 60), att = Math.min(o.att ?? 1.6, hold), rel = o.rel ?? 1.3, stag = o.stagger ?? 0.1, len = hold + rel + 0.05, n = Math.ceil(sr * len);
  const notes = (o.notes && o.notes.length ? o.notes : [0, 7, 11, 14, 16].map(x => key - 12 + x)).map(m => m + (o.pitch || 0));
  const K = [1, 2, 3, 4, 5, 7], G = [1, 0.5, 0.28, 0.16, 0.09, 0.04], na = Math.ceil(att * sr), A = new Float32Array(na);
  for (let i = 0; i < na; i++) A[i] = Math.pow(Math.sin(Math.PI * 0.5 * i / na), 2);
  const L = new Float32Array(n), R = new Float32Array(n);
  notes.forEach((m, ni) => {
    const off = Math.round(ni * stag * sr), f0 = H.mtof(m);
    K.forEach((k, ki) => {
      const f = f0 * k * Math.pow(2, H.rr(-1.5, 1.5) / 1200); if (f > sr * 0.42) return;
      const wl = TAU / ((45 / (4 + Math.floor(r() * 11))) * sr), ph0 = r() * TAU, lp0 = r() * TAU, w = TAU * f / sr;
      const a = ((ni + ki) % 2 ? 0.35 : -0.35) + 1, gl = Math.cos(a * Math.PI / 4) * G[ki], gr = Math.sin(a * Math.PI / 4) * G[ki];
      let x = Math.cos(ph0), y = Math.sin(ph0), lx = Math.cos(lp0), ly = Math.sin(lp0); const c = Math.cos(w), sn = Math.sin(w), lc = Math.cos(wl), ls = Math.sin(wl);
      for (let i = off; i < n; i++) {
        const u = i - off, v = y * (u < na ? A[u] : 1) * (0.825 + 0.175 * lx);
        L[i] += v * gl; R[i] += v * gr;
        const nx = x * c - y * sn; y = x * sn + y * c; x = nx; const nl = lx * lc - ly * ls; ly = lx * ls + ly * lc; lx = nl;
      }
    });
  });
  const b = ac.createBuffer(2, n, sr), cl = b.getChannelData(0), cr = b.getChannelData(1), h0 = Math.round(hold * sr), nr = Math.round(rel * sr); let m = 1e-9;
  for (let i = 0; i < n; i++) { const e = i < h0 ? 1 : i < h0 + nr ? Math.pow(Math.cos(Math.PI * 0.5 * (i - h0) / nr), 2) : 0; cl[i] = L[i] * e; cr[i] = R[i] * e; m = Math.max(m, Math.abs(cl[i]), Math.abs(cr[i])); }
  const lvl = 0.178 * lv * vel / (m * (1 + 0.6 * Math.abs(o.pan || 0))); for (let i = 0; i < n; i++) { cl[i] *= lvl; cr[i] *= lvl; }
  const s = ac.createBufferSource(); s.buffer = b; const lp = H.filter('lowpass', 3200, 0), hp = H.filter('highpass', 120, 0);
  const pn = ac.createStereoPanner(); pn.pan.value = H.clamp(o.pan || 0, -1, 1); s.connect(lp); lp.connect(hp); hp.connect(pn); pn.connect(out); s.start(t);
});

// opts: notes (default Dmaj9 voicing of the key), dur (held length, s), att (2), rel (1.3), vel, pan
define('morphPad', { family: 'texture', styles: ['3dlight'], tags: ['airy', 'tonal', 'digital', 'premium'], dur: 8,
  desc: 'A pad whose timbre slowly morphs between hollow and glassy-bright over a nine-second cycle while its lowpass drifts, so a long scene never sits still.',
  events: 'long scenes; a slow transformation; a calm underlay that needs motion; a structure revealing itself',
  from: 'research: music_beds morphPad (two wavetables crossfaded on a 45/5 s LFO, formant bump at the 7th harmonic; source 10)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, key = o.key ?? 69, lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), vel = H.clamp(o.vel ?? 1, 0.05, 1.3);
  const hold = H.clamp(o.dur ?? 8, 0.4, 60), att = Math.min(o.att ?? 2, hold), rel = o.rel ?? 1.3, len = hold + rel + 0.05, n = Math.ceil(sr * len);
  const notes = (o.notes && o.notes.length ? o.notes : [0, 7, 11, 14, 16].map(x => key - 12 + x)).map(m => m + (o.pitch || 0));
  const NT = 4096, mk = amps => { const tb = new Float32Array(NT + 1); amps.forEach((a, kk) => { for (let i = 0; i < NT; i++) tb[i] += a * Math.sin(TAU * (kk + 1) * i / NT); }); tb[NT] = tb[0]; let e = 0; for (let i = 0; i < NT; i++) e += tb[i] * tb[i]; const k = 0.3 / Math.sqrt(e / NT); for (let i = 0; i <= NT; i++) tb[i] *= k; return tb; };
  const TA = mk([1, 0.3, 0.1, 0.04]), TB = mk(Array.from({ length: 16 }, (_, kk) => (1 / (kk + 1)) * (1 + 2 * Math.exp(-Math.pow((kk + 1 - 7) / 1.5, 2)))));
  const L = new Float32Array(n), R = new Float32Array(n), na = Math.ceil(att * sr);
  notes.forEach((m, ni) => {
    const f = H.mtof(m), fa = f * Math.pow(2, 4 / 1200), fbq = f * Math.pow(2, -4 / 1200), phi = H.rr(-0.08, 0.08), off = Math.round(ni * 0.12 * sr), pn = (ni % 2 ? 0.4 : -0.4);
    const pa = (pn - 0.15 + 1) * Math.PI / 4, pb = (pn + 0.15 + 1) * Math.PI / 4, hi = f * 16 > sr * 0.45;
    const ca = Math.cos(pa), sa = Math.sin(pa), cb = Math.cos(pb), sb = Math.sin(pb);
    let qa = r(), qb = r();
    for (let i = off; i < n; i++) {
      const u = i - off, s = i / sr, e = u < na ? Math.pow(Math.sin(Math.PI * 0.5 * u / na), 2) : 1, mm = 0.5 - 0.5 * Math.cos(TAU * (s / 9 + phi)), ga = hi ? 1 : Math.cos(mm * Math.PI / 2), gb = hi ? 0 : Math.sin(mm * Math.PI / 2);
      qa += fa / sr; qb += fbq / sr; qa -= Math.floor(qa); qb -= Math.floor(qb);
      let q = qa * NT, i0 = q | 0; const va = (TA[i0] + (TA[i0 + 1] - TA[i0]) * (q - i0)) * ga * e;
      q = qb * NT; i0 = q | 0; const vb = (TB[i0] + (TB[i0 + 1] - TB[i0]) * (q - i0)) * gb * e;
      L[i] += va * ca + vb * cb; R[i] += va * sa + vb * sb;
    }
  });
  const lpf = (x, ph) => { let s1 = 0, s2 = 0, g = 0, a1 = 0, a2 = 0, a3 = 0; const k = 1.414;
    for (let i = 0; i < x.length; i++) {
      if ((i & 31) === 0) { g = Math.tan(Math.PI * (2400 * (1 + 0.3 * Math.sin(TAU * (i / sr / 15) + ph))) / sr); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
      const v3 = x[i] - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2; x[i] = v2;
    } };
  const ph = r() * TAU; lpf(L, ph); lpf(R, ph + 0.4);
  const b = ac.createBuffer(2, n, sr), cl = b.getChannelData(0), cr = b.getChannelData(1), h0 = Math.round(hold * sr), nr = Math.round(rel * sr); let mx = 1e-9;
  for (let i = 0; i < n; i++) { const e = i < h0 ? 1 : i < h0 + nr ? Math.pow(Math.cos(Math.PI * 0.5 * (i - h0) / nr), 2) : 0; cl[i] = L[i] * e; cr[i] = R[i] * e; mx = Math.max(mx, Math.abs(cl[i]), Math.abs(cr[i])); }
  const lvl = 0.178 * lv * vel / (mx * (1 + 0.6 * Math.abs(o.pan || 0))); for (let i = 0; i < n; i++) { cl[i] *= lvl; cr[i] *= lvl; }
  const s = ac.createBufferSource(); s.buffer = b; const hp = H.filter('highpass', 100, 0), pn = ac.createStereoPanner(); pn.pan.value = H.clamp(o.pan || 0, -1, 1);
  s.connect(hp); hp.connect(pn); pn.connect(out); s.start(t);
});

// opts: notes (chord to halo; default Dmaj9 voicing of the key), dur (fade length, s), room (reverb length, s, 2.6), vel, pan
define('shimmerTail', { family: 'texture', styles: ['3dlight'], tags: ['airy', 'glassy', 'wet', 'premium'], dur: 4.3,
  desc: 'An octave-up halo that blooms just after a chord and melts away into a long bright room: airy sparkle on the same notes, never a pitch-shifter wobble.',
  events: 'chord changes; reveals; the end of a beat; a held note that needs air',
  from: 'research: music_beds shimmerTail (chord re-synthesised at 2f and 4f, 150 ms late, +7 cents, long convolved tail; source 16)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, key = o.key ?? 69, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const notes = (o.notes && o.notes.length ? o.notes : [0, 7, 11, 14, 16].map(x => key - 12 + x)).map(m => m + (o.pitch || 0));
  const dur = H.clamp(o.dur ?? 2.6, 0.8, 10), lag = 0.15, bloom = 0.5, n = Math.ceil(sr * (lag + dur + 0.05));
  const src = ac.createBuffer(1, n, sr), d = src.getChannelData(0);
  notes.forEach((m, ni) => {
    [[2, 1], [4, 0.316]].forEach(([k, a]) => {
      const f = H.mtof(m) * k * Math.pow(2, (7 + H.rr(-1.5, 1.5)) / 1200), w = TAU * f / sr, ph = r() * TAU, off = Math.round((lag + ni * 0.045) * sr);
      for (let i = off; i < n; i++) {
        const s = (i - off) / sr, e = (s < bloom ? Math.pow(Math.sin(Math.PI * 0.5 * s / bloom), 2) : 1) * (s < dur - 0.3 ? 1 : Math.max(0, Math.pow(Math.cos(Math.PI * 0.5 * Math.min(1, (s - (dur - 0.3)) / 0.3)), 2)));
        d[i] += a * Math.sin(ph + w * (i - off)) * e * Math.exp(-s / (dur * 0.7));
      }
    });
  });
  let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(d[i])); const k = 0.26 * vel * lv / (m * (1 + 0.6 * Math.abs(o.pan || 0))); for (let i = 0; i < n; i++) d[i] *= k;
  const s = ac.createBufferSource(); s.buffer = src; const dl = ac.createDelay(0.1); dl.delayTime.value = 0.025;
  const pn = ac.createStereoPanner(); pn.pan.value = H.clamp(o.pan || 0, -1, 1); pn.connect(out);
  const rv = H.verb(pn, { sec: H.clamp(o.room ?? 2.6, 0.6, 6), decay: 4, wet: 1.6, lp: 5000 }), dry = H.gain(0.25, pn), lp5 = H.filter('lowpass', 5000, 0);
  s.connect(lp5); lp5.connect(dl); dl.connect(rv); lp5.connect(dry); s.start(t);
});

// opts: notes (chord to colour the air; default Dmaj9 voicing of the key), dur (held length, s), att (1.5), rel (1.3), vel, pan
define('tunedAir', { family: 'texture', styles: ['3dlight', 'doodle-draw'], tags: ['airy', 'noisy', 'soft', 'tonal'], dur: 8,
  desc: 'Noise turned into chord-tuned breath: four very narrow resonances on open chord tones that swell and fade slowly, like a ghost choir made of air.',
  events: 'the background of any scene; anticipation; a quiet moment before a reveal; a texture that follows the chord',
  from: 'research: music_beds tunedAir (noise through 4 resonators with Q 35-60 on chord tones, 0.04-0.08 Hz level drift; sources 10, 16)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r, DSP } = H, key = o.key ?? 69, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  const hold = H.clamp(o.dur ?? 8, 0.6, 60), att = Math.min(o.att ?? 1.5, hold), rel = o.rel ?? 1.3, len = hold + rel + 0.05, n = Math.ceil(sr * len);
  const notes = (o.notes && o.notes.length ? o.notes : [0, 7, 11, 14, 16].map(x => key - 12 + x)).map(m => m + (o.pitch || 0));
  const tones = []; let prev = 0;
  for (let j = 0; j < 4; j++) { let m = notes[j % notes.length]; if (j === 0) m = 67 + (((m - 67) % 12) + 12) % 12; else { while (m <= prev) m += 12; while (m > prev + 12) m -= 12; } tones.push(m); prev = m; }
  const L = new Float32Array(n), R = new Float32Array(n), flip = r() < 0.5 ? 1 : -1, rms = x => { let e = 0; for (let i = 0; i < x.length; i++) e += x[i] * x[i]; return Math.sqrt(e / x.length) || 1; };
  const add = (x, g, pn, ph, lfoHz) => { const a = (pn + 1) * Math.PI / 4, gl = Math.cos(a) * g, gr = Math.sin(a) * g;
    for (let i = 0; i < n; i++) { const e = lfoHz ? 0.65 + 0.35 * Math.cos(TAU * lfoHz * i / sr + ph) : 1; L[i] += x[i] * gl * e; R[i] += x[i] * gr * e; } };
  tones.forEach((m, j) => {
    const f = H.mtof(m) * Math.pow(2, H.rr(-1, 1) / 1200), Q = H.rr(35, 60), nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = r() * 2 - 1;
    const y = DSP.reson(nz, sr, f, f / Q), k = 1 / rms(y); for (let i = 0; i < n; i++) y[i] *= k;
    add(y, 1, (j % 2 ? 0.5 : -0.5) * flip, r() * TAU, H.rr(0.04, 0.08));
  });
  { const nz = new Float32Array(n); for (let i = 0; i < n; i++) nz[i] = r() * 2 - 1; const y = DSP.reson(nz, sr, 3500, 3500 / 0.4), k = 0.45 / rms(y); for (let i = 0; i < n; i++) y[i] *= k; add(y, 1, 0, 0, 0); }
  const b = ac.createBuffer(2, n, sr), cl = b.getChannelData(0), cr = b.getChannelData(1), h0 = Math.round(hold * sr), nr = Math.round(rel * sr), na = Math.round(att * sr); let m = 1e-9;
  for (let i = 0; i < n; i++) { const e = (i < na ? Math.pow(Math.sin(Math.PI * 0.5 * i / na), 2) : 1) * (i < h0 ? 1 : i < h0 + nr ? Math.pow(Math.cos(Math.PI * 0.5 * (i - h0) / nr), 2) : 0); cl[i] = L[i] * e; cr[i] = R[i] * e; m = Math.max(m, Math.abs(cl[i]), Math.abs(cr[i])); }
  const lvl = 0.178 * lv * vel / (m * (1 + 0.6 * Math.abs(o.pan || 0))); for (let i = 0; i < n; i++) { cl[i] *= lvl; cr[i] *= lvl; }
  const s = ac.createBufferSource(); s.buffer = b; const pn = ac.createStereoPanner(); pn.pan.value = H.clamp(o.pan || 0, -1, 1); s.connect(pn); pn.connect(out); s.start(t);
});

// opts: note (root; default the key folded into 55-104 Hz), dur (held length, s), att (2.5), rel (1.3), vel, pan, pitch
define('lumenDrone', { family: 'texture', styles: ['3dlight', 'doodle-draw'], tags: ['dark', 'warm', 'sub', 'tonal'], dur: 9,
  desc: 'A low root-and-fifth drone with a slow beat between two close sines and a nine-second breath, with quiet upper harmonics so small speakers still hear it.',
  events: 'slow beds; contemplative scenes; a floor under a long reveal; a quiet underlay for narration',
  from: 'research: music_beds lumenDrone (root sines 1/9 Hz apart, triangle fifth at -8 dB, lowpass 300 Hz, 9 s breathing; source 2)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), key = o.key ?? 69;
  let m0 = o.note ?? 33 + (((key - 33) % 12) + 12) % 12; while (m0 > 50) m0 -= 12; m0 += (o.pitch || 0); const cs = Math.pow(2, H.rr(-2, 2) / 1200), f = H.mtof(m0) * cs, f5 = H.mtof(m0 + 7) * cs;
  const hold = H.clamp(o.dur ?? 9, 0.6, 60), att = Math.min(o.att ?? 2.5, hold), rel = o.rel ?? 1.3, len = hold + rel + 0.05, n = Math.ceil(sr * len), pb = r() * 0.3;
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, p1 = TAU * f * s, p2 = TAU * (f + 1 / 9) * s, c5 = f5 * s - Math.floor(f5 * s);
      const x = 0.7 * Math.sin(p1) + 0.28 * Math.sin(p2) + 0.17 * Math.sin(2 * p1) + 0.1 * Math.sin(3 * p2) + 0.33 * (4 * Math.abs(c5 - 0.5) - 1);
      const br = Math.pow(10, 2 * Math.sin(TAU * s / 9 + pb) / 20), at = s < att ? Math.pow(Math.sin(Math.PI * 0.5 * s / att), 2) : 1, rl = s < hold ? 1 : s < hold + rel ? Math.pow(Math.cos(Math.PI * 0.5 * (s - hold) / rel), 2) : 0;
      d[i] = x * br * at * rl;
    }
  }, { level: 0.25 * vel * lv, pan: o.pan || 0, filters: [{ type: 'lowpass', f: 300, q: 0 }] });
});

// ---------------------------------------------------------------- rhythm and percussion
// opts: note (a chord tone; the click is placed on it in the 3.2-7.5 kHz octave), hi (bool: the octave above), vel, pan
define('sineClick', { family: 'rhythm', styles: ['3dlight'], tags: ['digital', 'crisp', 'clinical', 'tonal'], dur: 0.08,
  desc: 'A tuned digital click: three cycles of a high sine in a tiny window with a faint ring, so a pulse of them is rhythm and harmony together.',
  events: 'a pulse under data; markers; tiny arrivals; a sixteenth-note tick grid in the music',
  from: 'research: music_beds sineClick (3-cycle Hann-windowed sine at 3.2-7.5 kHz on a chord tone; sources 24, 29)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20);
  let f = H.mtof((o.note ?? o.key ?? 69) + (o.pitch || 0)); while (f < 3200) f *= 2; while (f >= 7500) f /= 2; if (o.hi && f * 2 < 7500) f *= 2;
  f *= Math.pow(2, H.rr(-17, 17) / 1200);
  const nc = Math.round(3 * sr / f), len = 0.045, n = Math.ceil(sr * len);
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, w = TAU * f * s;
      d[i] = (i < nc ? (0.5 - 0.5 * Math.cos(TAU * i / nc)) * Math.sin(w) : 0) + 0.12 * Math.sin(w) * Math.exp(-s / 0.006) * Math.min(1, s / 0.001) * Math.min(1, (n - i) / (0.01 * sr));
    }
  }, { level: 0.25 * vel * lv, pan: o.pan != null ? o.pan : (r() < 0.5 ? -1 : 1) * 0.35 });
});

// opts: tock (bool: the lower second tick of the pair), accent (bool: +3 dB), key (tunes the pair to the tonic and its major third), vel, pan, pitch
define('escapementTick', { family: 'rhythm', styles: ['3dlight', 'doodle-draw'], tags: ['clinical', 'metallic', 'crisp', 'tonal'], dur: 0.12,
  desc: 'A clock-like tick of two close pitches, each a bright ping with an inharmonic overtone and a hair of click: a ticking pulse for timers and processes.',
  events: 'a timer or measuring; time passing; count-ups; a process that is running',
  from: 'research: music_beds escapementTick (sines at f and 2.76f with 14 ms decay plus a 0.6 ms noise tick; source 3)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20) * (o.accent ? 1.41 : 1), pit = Math.pow(2, (o.pitch || 0) / 12);
  let fA = 2100, fB = 1700;
  if (o.key != null) { fB = H.mtof(o.key); while (fB < 1200) fB *= 2; while (fB >= 2400) fB /= 2; fA = fB * Math.pow(2, 4 / 12); }
  const f = (o.tock ? fB : fA) * pit * (1 + H.rr(-0.015, 0.015)), len = 0.12, n = Math.ceil(sr * len), hpA = Math.exp(-TAU * 5000 / sr);
  let hp = 0, xp = 0;
  H.buffer(out, t + 0.0008 + H.rr(-0.0008, 0.0008), len, d => {
    for (let i = 0; i < n; i++) {
      const s = i / sr, e = Math.exp(-s / 0.014), at = Math.min(1, s / 0.0004);
      let y = (Math.sin(TAU * f * s) + 0.5 * Math.sin(TAU * f * 2.76 * s)) * e * at;
      if (s < 0.003) { const x = r() * 2 - 1; hp = hpA * (hp + x - xp); xp = x; y += 0.45 * hp * Math.exp(-s / 0.0003); }
      d[i] = y * Math.min(1, (n - i) / (0.02 * sr));
    }
  }, { level: 0.25 * vel * lv, pan: o.pan != null ? o.pan : H.rr(-0.1, 0.1) });
});

// opts: note (tunes the puff to a chord tone, e.g. the 9th; Q 6), vel, pan, pitch
define('airPuff', { family: 'rhythm', styles: ['3dlight', 'doodle-draw'], tags: ['airy', 'soft', 'noisy'], dur: 0.35,
  desc: 'A small soft breath of air that rises in tone as it opens, like a hat made of air; given a note it becomes a tuned puff on that chord tone.',
  events: 'offbeat accents; transitions between bars; a gentle fill in a gap; a light answer to a pad change',
  from: 'research: music_beds airPuff (white noise through a bandpass sweeping 1.8 to 3.6 kHz, 40 ms attack, 120 ms decay; source 23)' },
(ac, out, t, o, H) => {
  const { sr, r, DSP } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), pf = Math.pow(2, (o.pitch || 0) / 12) * (1 + H.rr(-0.03, 0.03)), len = 0.34, n = Math.ceil(sr * len);
  let f1 = 3600 * pf, f0 = 1800 * pf, bw = 2700 * pf / 0.9;
  if (o.note != null) { let f = H.mtof(o.note + (o.pitch || 0)) * (1 + H.rr(-0.01, 0.01)); while (f < 1800) f *= 2; while (f >= 4000) f /= 2; f1 = f; f0 = f * 0.88; bw = f / 6; }
  const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
  const ns = 0.16 * sr, y = DSP.reson(x, sr, i => f0 * Math.pow(f1 / f0, Math.min(1, i / ns)), bw);
  H.buffer(out, t, len, d => {
    for (let i = 0; i < n; i++) { const s = i / sr, e = s < 0.04 ? Math.pow(Math.sin(Math.PI * 0.5 * s / 0.04), 2) : Math.exp(-(s - 0.04) / 0.04); d[i] = y[i] * e * Math.min(1, (n - i) / (0.02 * sr)); }
  }, { level: 0.25 * vel * lv, pan: o.pan != null ? o.pan : (r() < 0.5 ? -1 : 1) * 0.4 });
});

// opts: note (pitch of the thump, always folded into 55-104 Hz), vel, pan. Real use: schedule it with the quarter notes and duck the pad and bass buses with the same timing.
define('phantomKick', { family: 'rhythm', styles: ['3dlight'], tags: ['soft', 'sub', 'premium'], dur: 0.35,
  desc: 'A barely-there soft low thump on the beat, quieter than any other hit; its real use is as the marker for ducking a bed, dipping pad and bass 1.5 to 4 dB on every quarter so they swell back.',
  events: 'the main pulse of a calm bed; a quarter-note heartbeat you feel more than hear; the timing source for pad and bass ducking',
  from: 'research: music_beds phantomKick (sidechain pump without an audible kick, optional hidden sine kick; sources 22, 35)' },
(ac, out, t, o, H) => {
  const { sr, DSP } = H, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1, 1) / 20), key = o.key ?? 69;
  const f = H.mtof(33 + ((((o.note ?? key) - 33) % 12) + 12) % 12 + (o.pitch || 0)) * Math.pow(2, H.rr(-2, 2) / 1200), len = 0.3;
  H.buffer(out, t, len, d => {
    DSP.chirp(d, sr, 0, 1, f * 2, f, 0.05, 0.075, 0.28);
    DSP.chirp(d, sr, 0, 0.25, f * 4, f * 2, 0.04, 0.045, 0.2);
    const n = d.length; for (let i = 0; i < n; i++) d[i] *= Math.min(1, (n - i) / (0.03 * sr));
  }, { level: 0.14 * vel * lv, pan: o.pan || 0, filters: [{ type: 'lowpass', f: 220, q: 0 }] });
});

// opts: note, bpm (106.7; the echo is a dotted eighth), echoes (3), vel, pan, pitch
define('dottedPing', { family: 'rhythm', styles: ['3dlight'], tags: ['wet', 'tonal', 'airy'], dur: 2,
  desc: 'A glass ping followed by dotted-eighth echoes that bounce left and right and darken as they fade: two plucks turn into a pulse.',
  events: 'arpeggio feeds; motif tails; accents that need a tempo-locked echo',
  from: 'research: music_beds dottedPing (delay 0.75 of an eighth, feedback 0.35 through a 300 Hz to 3.2 kHz loop filter, ping-pong; source 27)' },
(ac, out, t, o, H) => {
  const dly = 0.75 * 60 / (o.bpm ?? 106.7), ne = H.clamp(Math.round(o.echoes ?? 3), 0, 6), seed = Math.floor(H.r() * 2147483647), sgn = H.r() < 0.5 ? -1 : 1;
  const base = { note: (o.note ?? (o.key ?? 69) + 7) + (o.pitch || 0), vel: o.vel ?? 1, idx: 2.0, dur: 0.7, seed };
  lib.fx.fmGlassPluck(ac, out, t, { ...base, pan: (o.pan || 0), g: 1.15 });
  for (let k = 1; k <= ne; k++) {
    const hp = H.filter('highpass', 300, 0), lp = H.filter('lowpass', 3200 / (1 + 0.35 * (k - 1)), 0); hp.connect(lp); lp.connect(out);
    lib.fx.fmGlassPluck(ac, hp, t + k * dly, { ...base, pan: sgn * (k % 2 ? 1 : -1) * 0.6, g: 1.15 * 0.35 * Math.pow(0.35, k - 1) });
  }
});

// ---------------------------------------------------------------- stingers and logo resolves
// opts: note (the lower ping; default the key), verb (0 = dry), vel, pan, pitch
define('octaveFlam', { family: 'tonal', styles: ['3dlight'], tags: ['glassy', 'bright', 'premium', 'playful'], dur: 1.6,
  desc: 'Two glass pings an octave apart, only a hair apart in time, so they land as one small, confident ping with a short room behind it.',
  events: 'a title card; a section hero; a loop start; one small moment of arrival (at most one per section)',
  from: 'research: music_beds octaveFlam (two fmGlassPluck pings 42 ms apart, second -3 dB, index 2.4; source 3)' },
(ac, out, t, o, H) => {
  const n0 = (o.note ?? o.key ?? 69) + (o.pitch || 0), vel = o.vel ?? 1, bus = H.gain(1, out), rv = H.verb(out, { sec: 1.4, decay: 3.5, wet: 0.5 * (o.verb ?? 1), lp: 5500 }); bus.connect(rv);
  const s1 = Math.floor(H.r() * 2147483647), s2 = Math.floor(H.r() * 2147483647), fl = 0.042 + H.rr(-0.003, 0.003);
  lib.fx.fmGlassPluck(ac, bus, t, { note: n0, idx: 2.4, dur: 0.9, exact: true, pan: (o.pan || 0) - 0.08, seed: s1, g: 0.85, vel });
  lib.fx.fmGlassPluck(ac, bus, t + fl, { note: n0 + 12, idx: 2.4, dur: 0.9, exact: true, pan: (o.pan || 0) + 0.08, seed: s2, g: 0.85 * 0.708, vel });
});

// opts: notes (chord, default Dmaj9 voicing of the key), note (the single note it collapses to, default the key), verb, vel, pan
define('chordSwellToUnison', { family: 'tonal', styles: ['3dlight'], tags: ['airy', 'tonal', 'premium'], dur: 2.2,
  desc: 'A wide chord swells open as its filter brightens, then every voice drops away in a blink and one glass note is left ringing.',
  events: 'an end card; a logo hold; everything becomes one; a resolve after a build',
  from: 'research: music_beds chordSwellToUnison (Dmaj9 sine pairs, lowpass 700 to 4500 Hz, collapse at 560 ms onto one note; source 3)' },
(ac, out, t, o, H) => {
  const { sr, TAU, r } = H, key = o.key ?? 69, vel = H.clamp(o.vel ?? 1, 0.05, 1.3), lv = Math.pow(10, H.rr(-1.5, 1.5) / 20), pit = o.pitch || 0;
  const notes = (o.notes && o.notes.length ? o.notes : [-12, -5, 2, 4, 11].map(x => key + x)).map(m => m + pit), uni = (o.note ?? key) + pit, tc = 0.56 + H.rr(-0.01, 0.01);
  const bus = H.gain(1, out), rv = H.verb(out, { sec: 1.2, decay: 3.5, wet: 0.35 * (o.verb ?? 1), lp: 5000 }); bus.connect(rv);
  const len = tc + 0.2, n = Math.ceil(sr * len), b = ac.createBuffer(2, n, sr), L = b.getChannelData(0), R = b.getChannelData(1);
  notes.forEach((m, vi) => {
    [-1.5, 1.5].forEach((c, side) => {
      const w = TAU * H.mtof(m) * Math.pow(2, c / 1200) / sr, ph = r() * TAU, a = ((side ? 0.5 : -0.5) + 1) * Math.PI / 4, gl = Math.cos(a), gr = Math.sin(a), g = 1 / (1 + 0.15 * vi);
      for (let i = 0; i < n; i++) { const s = i / sr, e = (s < 0.45 ? Math.pow(Math.sin(Math.PI * 0.5 * s / 0.45), 2) : 1) * (s < tc ? 1 : s < tc + 0.14 ? Math.pow(Math.cos(Math.PI * 0.5 * (s - tc) / 0.14), 2) : 0), v = Math.sin(ph + w * i) * e * g; L[i] += v * gl; R[i] += v * gr; }
    });
  });
  const lpf = x => { let s1 = 0, s2 = 0; const k = 1.2; for (let i = 0; i < n; i++) { const s = i / sr, fc = 700 * Math.pow(4500 / 700, Math.min(1, s / 0.45)), g = Math.tan(Math.PI * fc / sr), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x[i] - s2, v1 = a1 * s1 + a2 * v3, v2 = s2 + a2 * s1 + a3 * v3; s1 = 2 * v1 - s1; s2 = 2 * v2 - s2; x[i] = v2; } };
  lpf(L); lpf(R); let m = 1e-9; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(L[i]), Math.abs(R[i]));
  const k = 0.13 * vel * lv / (m * (1 + 0.6 * Math.abs(o.pan || 0))); for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  const s = ac.createBufferSource(); s.buffer = b; const pn = ac.createStereoPanner(); pn.pan.value = H.clamp(o.pan || 0, -1, 1); s.connect(pn); pn.connect(bus); s.start(t);
  // the single note: a ping on the collapse plus a pure ring of the note and its octave
  lib.fx.fmGlassPluck(ac, bus, t + tc, { note: uni, idx: 1.8, dur: 1.2, exact: true, pan: o.pan || 0, seed: Math.floor(H.r() * 2147483647), g: 0.6, vel });
  const f = H.mtof(uni), ring = 1.4 + 0.05;
  H.buffer(bus, t + tc, ring, d => { for (let i = 0; i < d.length; i++) { const s2 = i / sr; d[i] = (Math.sin(TAU * f * s2) + 0.3 * Math.sin(TAU * 2 * f * s2)) * Math.exp(-s2 / 0.45) * Math.min(1, s2 / 0.02) * Math.min(1, (d.length - i) / (0.05 * sr)); } },
    { level: 0.07 * vel * lv, pan: o.pan || 0 });
});

// opts: key (the tonic; the motif starts on its octave above), notes (5 MIDI notes), times (5 onsets in s), vel, verb, pan
define('fiveNoteMnemonic', { family: 'tonal', styles: ['3dlight'], tags: ['glassy', 'tonal', 'premium'], dur: 2.8,
  desc: 'A five-note, rhythmically distinct motif played on glass FM with a pure sine under each note, the last one ringing: a sonic logo that does not sound like marimba.',
  events: 'a brand or title reveal; an end card; the same motif each time the product appears',
  from: 'research: music_beds fiveNoteMnemonic (D5 A5 E6 C#6 A5 at 0/0.18/0.36/0.72/1.10 s; sources 7, 9)' },
(ac, out, t, o, H) => {
  const { sr, TAU } = H, key = o.key ?? 69, pit = o.pitch || 0, notes = (o.notes && o.notes.length >= 5 ? o.notes : [0, 7, 14, 11, 7].map(x => key + 12 + x)).map(m => m + pit);
  const times = o.times && o.times.length >= 5 ? o.times : [0, 0.18, 0.36, 0.72, 1.10], vel = H.clamp(o.vel ?? 1, 0.05, 1.3), V = [0.9, 0.75, 0.8, 0.95, 1.0], lv = Math.pow(10, H.rr(-1, 1) / 20);
  const bus = H.gain(1, out), rv = H.verb(out, { sec: 1.4, decay: 3.5, wet: 0.45 * (o.verb ?? 1), lp: 5500 }); bus.connect(rv);
  const ring = 1.6, len = times[4] + ring + 0.1, n = Math.ceil(sr * len);
  notes.slice(0, 5).forEach((m, i) => {
    const v = V[i] * (1 + H.rr(-0.08, 0.08)) * vel;
    lib.fx.fmGlassPluck(ac, bus, t + times[i], { note: m, idx: 2.4, dur: i === 4 ? ring : 0.75, exact: true, pan: o.pan || 0, seed: Math.floor(H.r() * 2147483647), g: 0.72 * v });
  });
  H.buffer(bus, t, len, d => {
    notes.slice(0, 5).forEach((m, i) => {
      const f = H.mtof(m), i0 = Math.round(times[i] * sr), tau = i === 4 ? 0.3 : 0.16, a = (V[i] || 1) * vel;
      for (let j = 0; i0 + j < n; j++) { const s = j / sr; d[i0 + j] += a * Math.sin(TAU * f * s) * Math.exp(-s / tau) * Math.min(1, s / 0.003); }
    });
    for (let i = 0; i < n; i++) d[i] *= Math.min(1, (n - i) / (0.05 * sr));
  }, { level: 0.08 * lv, pan: o.pan || 0 });
});

// opts: key (the tonic), notes (chord of the bloom, default Dmaj9 voicing of the key), pings (3 MIDI notes, default 5-8-3 above the key), sparkle (MIDI note), verb, vel, pan
define('jewelResolve', { family: 'tonal', styles: ['3dlight'], tags: ['glassy', 'airy', 'premium'], dur: 3.3,
  desc: 'A tiny jewel of a resolve: three rising glass pings, then a wide chord blooms under them with a bright sparkle on top and a halo that fades out by the end.',
  events: 'the final resolve; the end of the loop\'s story; an end card; a completed process',
  from: 'research: music_beds jewelResolve (pings at 0/0.25/0.5 s, Dmaj9 glassPad bloom with an E6 sparkle, shimmer send; sources 6, 8)' },
(ac, out, t, o, H) => {
  const key = o.key ?? 69, pit = o.pitch || 0, vel = o.vel ?? 1, vb = o.verb ?? 1, chord = (o.notes && o.notes.length ? o.notes : [0, 7, 11, 14, 16].map(x => key - 12 + x)).map(m => m + pit);
  const pings = (o.pings && o.pings.length >= 3 ? o.pings : [7, 12, 16].map(x => key + x)).map(m => m + pit), spark = (o.sparkle ?? key + 26) + pit;
  const bus = H.gain(1, out), rv = H.verb(out, { sec: 1.2, decay: 3.5, wet: 0.3 * vb, lp: 5500 }); bus.connect(rv);
  [0, 0.25, 0.5].forEach((at, i) => lib.fx.fmGlassPluck(ac, bus, t + at, { note: pings[i], idx: 2.2, dur: i === 2 ? 1.5 : 1.0, exact: true, pan: (o.pan || 0) + (i - 1) * 0.12, seed: Math.floor(H.r() * 2147483647), g: 1.0 * vel }));
  lib.fx.glassPad(ac, out, t + 0.5, { notes: chord.concat([spark]), dur: 0.4, att: 0.35, rel: 2.4, stagger: 0.05, pan: o.pan || 0, seed: Math.floor(H.r() * 2147483647), g: 0.55 * vel });
  lib.fx.shimmerTail(ac, out, t + 0.5, { notes: chord, dur: 1.5, room: 1.5, pan: o.pan || 0, seed: Math.floor(H.r() * 2147483647), g: 0.25 * vel });
});

// __EFFECTS__ (new effects go above this line)

root.SFXLIB = lib;
})(typeof window !== 'undefined' ? window : globalThis);
