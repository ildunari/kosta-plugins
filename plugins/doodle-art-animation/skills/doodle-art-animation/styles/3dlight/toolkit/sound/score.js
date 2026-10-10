// 3DLight score: the ARRANGER between the instruments (sound/engine.js) and the story's sound settings.
// SCORE.play(E, o, film, opts) is called once per pass with o = the pass start (seconds in the render). It plays:
//   1. the music bed from film.sound.music.bed, built from the shared library's instrument voices (sfxlib.js):
//      'glassPulse' (the default: glass pad, sub pulse, a gated glass arpeggio, tuned clicks, a quiet hat),
//      'slowAir' (ambient: morphing pad, drone, singing glass, phase loops, no drums) or 'quietEngine' (a product
//      groove: saw stabs, octave bass, a square-wave motif, hats). Each follows a five-chord cycle, two beats per
//      chord, in music.key, and an arc over the film: thin at the start, fullest near 60 %, thin again at the end so a
//      loop returns to its opening. 'classic' is the first booth loops' bed (pad, bass, keys or mallet arpeggio) with
//      its soft kick, knock and shaker (film.sound.rhythm); a music object with chords and no bed plays it;
//   2. (classic only) a soft rhythm under it (kick on 1 and 3, wooden knock on 2 and 4, shaker on the off-beats);
//   3. the story's library effects: film.sound.fx = [{ at, fx: 'name', g, pan, pitch, size, seed, send, ... }], effects
//      from the plugin's shared sound library (sfxlib.js), at = screen seconds from the film start (or art: art time);
//   4. the story's own effect cues: film.sound.cues(E, o, ev, U), with ev = film.sound.events (times in ART time).
//      Inside cues, E.fx(name, t, opts) plays a library effect too.
// A story can replace 1-4 with its own film.sound.score(E, o, ev, U).
// Taken from the booth loops' score_l3d.js and cues_l3d.js (2026-10-09); with the booth settings it plays the same notes.
(() => {
const { timing } = window.SOUND_ENGINE;

// used when a story gives no music: the nanoparticle loop's bed (A minor, glass mallets), cycled over the beats
const DEFAULT_MUSIC = {
  chords: [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [55, 59, 60, 62, 64], [55, 59, 62, 64, 67], [50, 53, 57, 60, 64],
           [53, 57, 59, 60, 64], [55, 57, 60, 64, 67], [52, 55, 59, 60, 64], [53, 55, 57, 60, 64], [52, 57, 59, 62, 64]],
  bass: [45, 41, 48, 43, 38, 41, 45, 48, 41, 40],
  arp: [0, 2, 3, 5, 7, 8, 10, 11, 13, 15], cut: 1600, inst: 'mallet',
  arpLevel: [0.7, 0.8, 0.6, 0.8, 0.5, 0.9, 0.9, 0.8, 0.5, 0.6],
};
const cyc = (a, i, d) => (a && a.length ? a[i % a.length] : d);

// music bed: chords[i] (MIDI notes) for beat i, bass[i] its root, arp = eighth-note positions (0..15) over the beat's two
// bars, arpLevel[i] how loud the arpeggio is in beat i (lower where the effects are busy), cut = pad lowpass (Hz),
// inst = 'keys' | 'mallet'. Lists shorter than the film repeat.
function bed(E, o, M, T) {
  const { Q, BAR, VB, N } = T;
  for (let i = 0; i < N; i++) {
    const ch = cyc(M.chords, i), t = o + i * VB;
    E.pad(t - 0.3, VB + 0.3, ch, { gain: 0.012, cut: M.cut ?? 1400, att: 1.0, rel: 1.6 });
    // bass: root on the downbeat, a softer repeat on beat 3 of the second bar
    const root = cyc(M.bass, i, ch[0] - 12);
    E.bass(t, VB * 0.62, root, { gain: 0.05 }); E.bass(t + BAR + 2 * Q, BAR * 0.45, root, { gain: 0.032 });
    const q = cyc(M.arpLevel, i, 0.8); if (q <= 0) continue;
    const top = ch.map(m => m + 12).filter(m => m <= 86);
    (M.arp || []).forEach((e8, k) => {
      const m = top[(k * 3 + i) % top.length], v = (e8 % 8 === 0 ? 0.36 : 0.24) * q;
      if (M.inst === 'keys') E.keys(t + e8 * Q / 2, m, v, { pan: (k % 2 ? 0.28 : -0.28), dec: 1.1 });
      else E.mallet(t + e8 * Q / 2, m, v, { pan: (k % 2 ? 0.32 : -0.32), dec: 0.9 });
    });
  }
}
// soft rhythm under everything; opt.level[i] scales beat i (e.g. quieter on the first and last beat)
function rhythm(E, o, opt, T) {
  const { Q, BAR, N } = T, bars = 2 * N;
  for (let b = 0; b < bars; b++) {
    const t = o + b * BAR, lvl = (opt.level && opt.level[Math.floor(b / 2)]) ?? 1;
    E.kick(t, 0.085 * lvl); E.kick(t + 2 * Q, 0.06 * lvl);
    E.rim(t + Q, 0.016 * lvl); E.rim(t + 3 * Q, 0.016 * lvl, 0.2);
    for (let k = 0; k < 8; k++) E.shaker(t + k * Q / 2 + Q / 4 * (k % 2 ? 0 : 0), (k % 2 ? 0.011 : 0.006) * lvl, 0.35);
  }
}

// ---------------- beds made of the shared library's voices (v0.19) ----------------
// Five-chord cycles, two beats per chord, written in D and moved to music.key (a MIDI note; default 62, D4).
// pad = the chord's voicing, bass = its root. From the music research (sound-library/research/music_beds.md).
const CYCLES = {
  reich: [{ pad: [50, 57, 61, 64, 66], bass: 38 }, { pad: [54, 57, 61, 64, 68], bass: 42 }, { pad: [59, 62, 66, 69, 73], bass: 35 },
          { pad: [55, 59, 62, 66, 73], bass: 43 }, { pad: [57, 62, 64, 69, 71], bass: 33 }],          // Dmaj9 F#m9 Bm9 Gmaj7#11 Asus2
  dorian: [{ pad: [52, 59, 62, 66, 67], bass: 40 }, { pad: [55, 62, 66, 69, 71], bass: 43 }, { pad: [57, 64, 71, 73], bass: 45 },
           { pad: [50, 57, 61, 64, 66], bass: 38 }, { pad: [59, 66, 69, 74, 76], bass: 35 }],         // Em9 Gmaj9 Aadd9 Dmaj9 Bm7(11)
  lydian: [{ pad: [50, 57, 61, 64, 66], bass: 38 }, { pad: [50, 57, 64, 68, 71], bass: 38 }, { pad: [59, 62, 66, 69, 73], bass: 35 },
           { pad: [55, 59, 62, 66, 73], bass: 43 }, { pad: [45, 50, 55, 61, 66], bass: 33 }],         // Dmaj9 E/D Bm9 Gmaj7#11 quartal
};
function chordAt(M, i, dflt) {
  const cyc = Array.isArray(M.cycle) ? M.cycle : CYCLES[M.cycle || dflt] || CYCLES[dflt], k = (M.key ?? 62) - 62;
  const c = cyc[Math.floor(i / 2) % cyc.length]; let bass = c.bass + k;
  while (bass < 33) bass += 12; while (bass > 45) bass -= 12; // roots stay at 55-110 Hz, where booth and laptop speakers still play them
  return { pad: c.pad.map(m => m + k), bass };
}
// arc position 0..9 of beat i: a film of any length follows the same ten-step shape, and its last beat matches its first.
// A short film (under 6 beats) uses steps 1 to 8, so its first and last beats are not left with the pad alone.
const arcPos = (i, N) => (N <= 1 ? 0 : N < 6 ? 1 + Math.round(i * 7 / (N - 1)) : Math.round(i * 9 / (N - 1)));
const euclid = (k, n) => Array.from({ length: n }, (_, s) => (s * k) % n < k);
// the pump: pad and bass dip `depth` dB on every quarter and swell back, the "phantom kick" a calm bed breathes with
function pumpBus(E, o, T, depth) {
  const c = E.ctx, g = c.createGain(); g.connect(E.music); if (!(depth > 0)) return g;
  const lo = Math.pow(10, -depth / 20), q = T.Q;
  g.gain.setValueAtTime(1, Math.max(0, o - 0.01));
  for (let t = o; t < o + T.LEN - 1e-6; t += q) { g.gain.setValueAtTime(1, t); g.gain.linearRampToValueAtTime(lo, t + 0.03); g.gain.linearRampToValueAtTime(1, t + q * 0.85); }
  return g;
}
const levels = M => { const l = M.level ?? 1; return dB => l * Math.pow(10, dB / 20); };
// the arpeggio cell from a chord: root, fifth, ninth, third (or the sus note), the fifth an octave up
function arpCell(c) {
  let r = c.bass; while (r < 57) r += 12; while (r > 69) r -= 12;
  const pcs = c.pad.map(m => (((m - r) % 12) + 12) % 12), third = pcs.includes(4) ? 4 : pcs.includes(3) ? 3 : 2;
  return [r, r + 7, r + 14, r + third + 12, r + 19].map(m => (m > 88 ? m - 12 : m));
}

const BEDS = {
  // Bed A, pulse minimalism: a premium biotech bed. Layers by arc position: pad and air always; the sub pulse from 1;
  // tuned clicks 2-5; the arpeggio 3-7 (growing, then thinning); a quiet closed hat and a dotted echo ping 4-6.
  glassPulse(E, o, M, T) {
    const { Q, BAR, VB, N } = T, sx = Q / 4, L = levels(M), pump = pumpBus(E, o, T, M.pump ?? 2.5), ARP = { 3: 2, 4: 3, 5: 4, 6: 5, 7: 3 };
    for (let i = 0; i < N; i++) {
      const t = o + i * VB, b = arcPos(i, N), c = chordAt(M, i, 'reich');
      if (i % 2 === 0) {
        const span = Math.min(2, N - i) * VB;
        E.voice('glassPad', t - 0.35, { notes: c.pad, dur: span + 0.25, att: 1.2, rel: 2.0, g: L(-10) }, pump);
        E.voice('tunedAir', t - 0.35, { notes: c.pad.slice(1).map(m => m + 12), dur: span + 0.25, g: L(-30) });
        if (i > 0) E.voice('shimmerTail', t, { notes: c.pad.slice(-3).map(m => m + 12), g: L(-20) });
      }
      for (let bar = 0; bar < 2; bar++) {
        const tb = t + bar * BAR;
        if (b >= 1 && b <= 8) { E.voice('subPulse', tb, { note: c.bass, dur: 0.34, g: L(-7) }, pump); E.voice('subPulse', tb + 6 * sx, { note: c.bass, dur: 0.22, vel: 0.7, g: L(-7) }, pump); }
        if (b >= 2 && b <= 5) euclid(7, 16).forEach((on, s) => { if (on) E.voice('sineClick', tb + s * sx, { note: c.pad[(s + bar) % c.pad.length] + 24, g: L(-27) }); });
        const steps = ARP[b] || 0;
        if (steps) E.voice('gatedArp', tb, { notes: arpCell(c), steps, bpm: T.BPM, dur: BAR, g: L(-3), pan: bar ? 0.18 : -0.18 });
        if (b >= 4 && b <= 6) [2, 6, 10, 14].forEach(s => E.voice('metalHat808', tb + s * sx, { g: L(-29), pan: 0.25 }));
        if ((b === 4 || b === 5) && bar === 1) E.voice('dottedPing', tb + 3 * sx, { note: c.pad[c.pad.length - 1] + 12, bpm: T.BPM, g: L(-15), pan: 0.3 });
      }
    }
  },
  // Bed B, ambient documentary: no drums and no bass line. A low drone, a morphing pad, one singing glass note per
  // beat (2-8), glass plucks looping at periods that divide the film (3-7), a tick on each quarter (4-7), one grain
  // cloud at the peak.
  slowAir(E, o, M, T) {
    const { Q, VB, N, LEN } = T, L = levels(M), k = (M.key ?? 62) - 62, SING = [66, 69, 73, 76].map(m => m + k);
    E.voice('lumenDrone', o - 0.6, { note: 38 + k, dur: LEN + 1.2, att: 2.4, rel: 2.4, g: L(-16) });
    for (let i = 0; i < N; i++) {
      const t = o + i * VB, b = arcPos(i, N), c = chordAt(M, i, 'lydian');
      if (i % 2 === 0) {
        const span = Math.min(2, N - i) * VB;
        E.voice('morphPad', t - 0.5, { notes: c.pad, dur: span + 0.3, att: 1.8, rel: 2.4, g: L(-8) });
        E.voice('tunedAir', t - 0.5, { notes: c.pad.slice(1).map(m => m + 12), dur: span + 0.3, g: L(-24) });
      }
      if (b >= 2 && b <= 8) { E.voice('singingGlass', t + 0.1, { note: SING[i % SING.length], dur: VB * 0.8, g: L(-15), pan: i % 2 ? 0.25 : -0.25 });
        if (i % 2 === 0) E.voice('shimmerTail', t + 0.3, { notes: [SING[i % SING.length] + 12], g: L(-22) }); }
      if (b >= 4 && b <= 7) for (let q = 0; q < VB / Q - 1e-6; q++) E.voice('escapementTick', t + q * Q, { accent: q % 4 === 0, g: L(-24), pan: 0.2 });
      if (b === 5) E.voice('grainCloud', t + VB * 0.3, { dur: VB * 0.9, key: 62 + k + 12, g: L(-15) });
    }
    // phase loops: five glass voices, each repeating every LEN / n seconds (n = 5, 7, 8, 9, 11): they drift apart and
    // meet again exactly at the loop point
    [5, 7, 8, 9, 11].forEach((n, v) => { const P = LEN / n;
      for (let j = 0; j < n; j++) { const tj = o + j * P, i = Math.min(N - 1, Math.floor(j * P / VB)), b = arcPos(i, N);
        if (b < 3 || b > 7 || (b === 7 && v > 2)) continue;
        const c = chordAt(M, i, 'lydian'); E.voice('fmGlassPluck', tj, { note: c.pad[(v + 1) % c.pad.length] + 12, idx: 1.6, g: L(-16), pan: -0.5 + v * 0.25 }); } });
  },
  // Bed C, a quiet product groove: syncopated saw stabs (3-3-2), a rolling octave bass, a square-wave motif on two
  // beats, offbeat hats, a pump on pad and bass. No acoustic sound at all.
  quietEngine(E, o, M, T) {
    const { Q, BAR, VB, N } = T, sx = Q / 4, L = levels(M), k = (M.key ?? 62) - 62, pump = pumpBus(E, o, T, M.pump ?? 4);
    const MOTIF = [71, 76, 78].map(m => m + k);
    for (let i = 0; i < N; i++) {
      const t = o + i * VB, b = arcPos(i, N), c = chordAt(M, i, 'dorian'), top3 = c.pad.slice(-3);
      if (i % 2 === 0) E.voice('glassPad', t - 0.3, { notes: c.pad, dur: Math.min(2, N - i) * VB + 0.2, att: 0.9, rel: 1.6, g: L(-12) }, pump);
      if (i % 2 === 1 && b >= 1 && b <= 7) E.voice('octaveRoll', t, { note: c.bass < 40 ? c.bass + 12 : c.bass, bpm: T.BPM, dur: VB, g: L(-11) }, pump);
      for (let bar = 0; bar < 2; bar++) {
        const tb = t + bar * BAR, gb = i * 2 + bar;
        [0, 8].forEach(s => E.voice('subPulse', tb + s * sx, { note: c.bass, dur: 0.3, g: L(-9) }, pump));
        if (b >= 2 && b <= 7) (b === 6 ? [0, 12] : [0, 6, 12]).forEach(s => E.voice('sawStab', tb + s * sx, { notes: top3, g: L(-4), pan: s === 6 ? 0.2 : -0.1 }));
        if (b >= 3 && b <= 6) for (let e = 0; e < 4; e++) E.voice('metalHat808', tb + (2 * e + 1) * 2 * sx, { g: L(-20), pan: 0.3 });
        if (b >= 2 && gb % 2 === 1) E.voice('airPuff', tb + 14 * sx, { g: L(-22), pan: -0.3 });
        if (b >= 4 && b <= 8) for (let h = 0; h * 0.75 < BAR - 1e-6; h++) E.voice('escapementTick', tb + h * 0.75 * (T.Q / 0.5625), { g: L(-25), pan: 0.15 });
      }
      if (b === 2 || b === 6) MOTIF.forEach((m, j) => E.voice('softSquare', t + BAR + j * Q, { note: m, dur: Q * 0.9, g: L(-9), pan: 0.1 }));
    }
  },
};

// cue helpers (U in cues(E, o, ev, U))
const at = (ev, re) => ev.filter(e => re.test(e.what));
const first = (ev, re) => { const e = ev.find(x => re.test(x.what)); if (!e) throw new Error('no event ' + re); return e; };
function helpers(E, o, film, T) {
  return {
    at, first, K: T.K, VB: T.VB, BAR: T.BAR, Q: T.Q, N: T.N, LEN: T.LEN, music: (film.sound && film.sound.music) || DEFAULT_MUSIC,
    S: x => o + x * T.K, // art time (from the film start) -> render time in this pass
    beatStart: i => o + i * T.VB, // screen start of beat i (0-based) in this pass
    // a soft breath of air on every dissolve (the booth loops use it on all ten)
    transitions: (E2 = E, o2 = o, n = T.N) => { for (let i = 0; i < n; i++) E2.whoosh(o2 + i * T.VB - 0.25, 0.75, 500, 2600, 0.022, { pan: -0.2, panTo: 0.2, send: 0.35 }); },
  };
}

window.SCORE = {
  play(E, o, film, opts = {}) {
    const s = film.sound || {}, T = timing(window.FILM_INFO), ev = s.events || [], U = helpers(E, o, film, T);
    E.fxCount = 0; E.voiceCount = 0; // library effects and bed voices without a seed are numbered per pass
    if (typeof s.score === 'function') { s.score(E, o, ev, U); return; }
    const M = s.music === false ? null : (s.music || {}), kind = M && (M.bed || (M.chords ? 'classic' : 'glassPulse'));
    if (kind === 'classic') {
      bed(E, o, M.chords ? M : DEFAULT_MUSIC, T);
      if (!opts.noRhythm && s.rhythm !== false) rhythm(E, o, s.rhythm || {}, T);
    } else if (kind) {
      if (!BEDS[kind]) throw new Error(`sound.music.bed: unknown bed '${kind}' (use ${Object.keys(BEDS).join(', ')} or classic)`);
      BEDS[kind](E, o, M, T, opts);
    }
    if (opts.bedOnly) return;
    (s.fx || []).forEach((c, k) => {
      const t = typeof c.at === 'number' ? c.at : typeof c.art === 'number' ? c.art * T.K : NaN;
      if (!(typeof c.fx === 'string' && t >= -1 && t <= T.LEN + 1)) throw new Error(`sound.fx[${k}]: needs fx: 'name' and at (screen s) or art (art s) inside the film`);
      const { at, art, fx, ...opt } = c; E.fx(fx, o + t, opt);
    });
    if (typeof s.cues === 'function') s.cues(E, o, ev, U);
  },
  bed, rhythm, at, first, DEFAULT_MUSIC, BEDS, CYCLES,
};
})();
