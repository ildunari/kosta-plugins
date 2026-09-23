// instrument_probe.js — the body regression_test.py runs in a built film (through probe.mjs) to check the instruments
// and stingers: each instrument's pitch by FFT, that a fixed seed repeats one exact note while plain calls vary, and
// that every stinger renders sound. Returns { tuning: [[name, Hz, cents]], worst, varied, stingers, deg }.
const NOTES = { marimba: [220, 440, 880], vibes: [220, 440, 880], musicBox: [523.25, 1046.5, 2093], kalimba: [261.63, 523.25, 1046.5],
  celesta: [523.25, 1046.5, 2093], glock: [784, 1568, 3136], epiano: [110, 220, 440, 880], pluck: [55, 110, 220, 440, 880, 1760],
  feltPiano: [65.41, 130.81, 261.63, 523.25, 1046.5], strings: [110, 220, 440] };
const fft = (re, im) => { const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } };
// render one call alone (mono sum of the two channels)
const render = async (fn, dur) => { const ac = new OfflineAudioContext(2, Math.ceil(SR * dur), SR); ac._noise = noiseBuffer(ac, 6); AUDIO.reset();
  fn(ac, ac.destination); const b = await ac.startRendering(), L = b.getChannelData(0), R = b.getChannelData(1), m = new Float32Array(L.length);
  for (let i = 0; i < m.length; i++) m[i] = 0.5 * (L[i] + R[i]); return m; };
// the pitch heard: the power-weighted centre of the spectrum within 35 cents of the target (a detuned chorus reads as
// its centre, as the ear hears it), from a Hann-windowed FFT of 2^18 points (0.18 Hz per bin)
const pitch = (x, f0) => { const N = 1 << 18, re = new Float64Array(N), im = new Float64Array(N), n = Math.min(x.length, N);
  for (let i = 0; i < n; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
  fft(re, im); const bin = SR / N, lo = Math.floor(f0 * 2 ** (-35 / 1200) / bin), hi = Math.ceil(f0 * 2 ** (35 / 1200) / bin);
  let sw = 0, s = 0; for (let k = lo; k <= hi; k++) { const p = re[k] * re[k] + im[k] * im[k]; sw += p; s += p * k * bin; }
  return 1200 * Math.log2(s / sw / f0); };
const out = { tuning: [], worst: 0, varied: {}, stingers: {} };
for (const [name, fs] of Object.entries(NOTES)) for (const f of fs) for (const k of [0, 1]) {   // two calls per note: the variation must stay in tune
  const x = await render((ac, o) => SFX[name](ac, o, 0.05 + k * 0.013, { f, dur: 2 }), 5.4);
  const c = pitch(x, f); out.tuning.push([name, f, +c.toFixed(2)]); out.worst = Math.max(out.worst, Math.abs(c)); }
// equal within 1e-5: WebAudio oscillators (strings) can differ by about 1e-7 between two renders, far below hearing
const same = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-5);
for (const name of Object.keys(NOTES)) {
  const a = await render((ac, o) => SFX[name](ac, o, 0.1, { deg: 2, seed: 7 }), 1.5), b = await render((ac, o) => SFX[name](ac, o, 0.1, { deg: 2, seed: 7 }), 1.5);
  // two calls at one instant: the first and the second differ (the repeat count re-seeds), so swapping which one is silent changes the sound
  const d = await render((ac, o) => { SFX[name](ac, o, 0.1, { deg: 2 }); SFX[name](ac, o, 0.1, { deg: 2, g: 0 }); }, 1.5);
  const e = await render((ac, o) => { SFX[name](ac, o, 0.1, { deg: 2, g: 0 }); SFX[name](ac, o, 0.1, { deg: 2 }); }, 1.5);
  out.varied[name] = { seedRepeats: same(a, b), callsDiffer: !same(d, e) }; }
for (const name of ['motif', 'success', 'question', 'oops', 'reveal', 'resolve']) {
  const x = await render((ac, o) => SFX[name](ac, o, 1.5, {}), 5); let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  out.stingers[name] = +pk.toFixed(4); }
out.deg = +(1200 * Math.log2(pitchOf({ deg: 2 }, 1) / note(tonicOf({}) * 2, 2))).toFixed(3);   // deg + home octave = note() in the film's key
return out;
