// 3DLight score: the ARRANGER between the instruments (sound/engine.js) and the story's sound settings.
// SCORE.play(E, o, film, opts) is called once per pass with o = the pass start (seconds in the render). It plays:
//   1. the music bed from film.sound.music: per beat a pad chord, a bass root (downbeat + a softer repeat), and an
//      arpeggio of the chord an octave up on keys (felt piano) or mallet (glass), two bars per visual beat;
//   2. a soft rhythm under it (kick on 1 and 3, wooden knock on 2 and 4, shaker on the off-beats), film.sound.rhythm;
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
    E.fxCount = 0; // library effects without a seed are numbered per pass
    if (typeof s.score === 'function') { s.score(E, o, ev, U); return; }
    if (s.music !== false) bed(E, o, s.music || DEFAULT_MUSIC, T);
    if (!opts.noRhythm && s.rhythm !== false) rhythm(E, o, s.rhythm || {}, T);
    if (opts.bedOnly) return;
    (s.fx || []).forEach((c, k) => {
      const t = typeof c.at === 'number' ? c.at : typeof c.art === 'number' ? c.art * T.K : NaN;
      if (!(typeof c.fx === 'string' && t >= -1 && t <= T.LEN + 1)) throw new Error(`sound.fx[${k}]: needs fx: 'name' and at (screen s) or art (art s) inside the film`);
      const { at, art, fx, ...opt } = c; E.fx(fx, o + t, opt);
    });
    if (typeof s.cues === 'function') s.cues(E, o, ev, U);
  },
  bed, rhythm, at, first, DEFAULT_MUSIC,
};
})();
