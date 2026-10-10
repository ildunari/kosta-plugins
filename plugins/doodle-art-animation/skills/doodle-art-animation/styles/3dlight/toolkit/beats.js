// 3DLight beat engine. Loaded after core.js and l3d.js, before the story. The story calls defineFilm({...}) once.
//
// A film is a list of beats. Each beat is a headline block on the left (head, optional sub, stat, note) and art on the
// right, drawn by the beat's draw(t, P, S) at ART TIME t (0..film.art, default 6 s). Art time is played back faster:
// a beat lasts film.beat screen seconds (default 4.5), so K = art / beat (1.333) art seconds pass per screen second.
// Text timings below are in art time too, so the whole beat speeds up together.
//
// Layers, bottom to top: backdrop (one per film, cached) -> beat art -> text -> chrome (note, credit, beat ticks).
// Beat changes: during the first `dissolve` art seconds (0.7) of beat i, the frame dissolves from beat i-1's end
// picture (its art at t = art, cached) to beat i's art. In a loop, beat 1 dissolves from the last beat, so the video
// repeats without a seam as long as the last beat ends on beat 1's opening picture. A film that is not a loop fades its
// first beat in from the bare backdrop instead.
// Text changes: the old headline block fades out over the first 0.3 art s; the new one rises in line by line from 0.22 s.
//
// window.drawFrame(T) draws global time T (screen seconds) onto the canvas C. It is a pure function of T: caches only
// hold pictures that never change (backdrop, end pictures, headline layouts), so frames can be drawn in any order.
// window.FILM_INFO has the timing; window.filmReady() waits for the fonts and reports them.
// Taken from the booth loops' anim_base.js (2026-10-09); with the booth's story it draws the same pixels.
(() => {
const L = window.L3D;
const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const eo = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const sm5 = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
// timing helpers for stories: seg(t, a, b) is the eased 0..1 progress of t from a to b, segL the linear one
window.ANIM_UTIL = { clamp, ease, eo, sm5, lerp, seg: (t, a, b) => ease((t - a) / (b - a)), segL: (t, a, b) => clamp((t - a) / (b - a)) };

let FILM = null, ART = 6, BEAT = 4.5, K = ART / BEAT, N = 0, LEN = 0, DIS = 0.7 / K, LOOP = true, ACC = 'teal';

// ---------- defineFilm: validate the story and fix the timing ----------
const fail = msg => { throw new Error('defineFilm: ' + msg); };
const isStr = s => typeof s === 'string' && s.length > 0;
window.defineFilm = spec => {
  if (FILM) fail('called twice; a story file defines one film');
  if (!spec || typeof spec !== 'object') fail('pass one object: defineFilm({ id, title, beats: [...] })');
  const { id, title, beats } = spec;
  if (!isStr(id) || !/^[\w.-]+$/.test(id)) fail(`id must be a short file-safe name (letters, digits, _ . -), got ${JSON.stringify(id)}`);
  if (!isStr(title)) fail('title is required');
  if (!Array.isArray(beats) || !beats.length) fail('beats must be a non-empty array');
  const art = spec.art ?? 6, beat = spec.beat ?? 4.5, dis = spec.dissolve ?? 0.7;
  if (!(art > 0) || !(beat > 0)) fail('art and beat must be positive numbers of seconds');
  if (!(dis >= 0 && dis < art)) fail('dissolve must be between 0 and art (art seconds)');
  const size = spec.size ?? [1920, 1080];
  if (!Array.isArray(size) || size.length !== 2 || !(size[0] > 0) || Math.abs(size[0] / size[1] - 16 / 9) > 1e-3) fail('size must be [width, height] at 16:9 (the art is drawn at 1920 x 1080)');
  beats.forEach((b, i) => {
    const at = `beats[${i}]`;
    if (!b || typeof b !== 'object') fail(`${at} must be an object`);
    if (!isStr(b.head)) fail(`${at}.head (the headline) is required`);
    if (b.draw != null && typeof b.draw !== 'function') fail(`${at}.draw must be a function draw(t, P, S)`);
    if (b.sub != null && !isStr(b.sub)) fail(`${at}.sub must be a string`);
    if (b.note != null && !isStr(b.note)) fail(`${at}.note must be a string`);
    if (b.stat != null && !(b.stat && isStr(b.stat.v) && isStr(b.stat.l))) fail(`${at}.stat must be { v: 'value', l: 'what it is' }`);
    if (b.labels != null && !(Array.isArray(b.labels) && b.labels.every(isStr))) fail(`${at}.labels must be an array of strings`);
    if (b.card && !(isStr(b.sub) && b.sub.includes(' · '))) fail(`${at}.card needs sub: 'Big line · smaller line' (split at ' · ')`);
  });
  L.setA(spec.accent ?? 'teal'); // throws on an unknown accent
  FILM = spec; ACC = spec.accent ?? 'teal';
  ART = art; BEAT = beat; K = ART / BEAT; N = beats.length; LEN = BEAT * N; DIS = dis / K; LOOP = spec.loop !== false;
  window.FILM = spec;
  window.FILM_INFO = { id, title, ART, BEAT, K, N, LEN, LOOP: LEN, loop: LOOP, DIS, DIS_ART: dis, size: size.slice(), fps: spec.fps ?? 30, accent: typeof ACC === 'string' ? ACC : 'custom' };
  return spec;
};

// ---------- pictures that never change: backdrop, end pictures ----------
const pool = {};
function canvas(key) { if (!pool[key]) pool[key] = off(W, H); const c = pool[key]; const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, W, H); return c; }
function onto(c, fn) { withCtx(c.getContext('2d'), fn); return c; }
let bg = null;
function backdrop() {
  if (!bg) { bg = off(W, H); onto(bg, () => { L.setA(ACC); L.backdrop(null, 1, FILM.backdrop || {}); }); }
  return bg;
}
function drawArt(i, t) {
  const P = FILM.beats[i]; L.setA(ACC);
  X.save();
  if (P.draw) P.draw(t, P, FILM);
  X.restore();
}
const endCache = {};
function endFrame(i) { // backdrop + beat i art at its last moment, cached
  if (!endCache[i]) { const c = off(W, H); onto(c, () => { X.drawImage(backdrop(), 0, 0); drawArt(i, ART); }); endCache[i] = c; }
  return endCache[i];
}

// ---------- text: the headline block, with timing ----------
// layout (1920 x 1080): kicker y 190; headline from y 316 (116..92 px, 1-3 lines); sub 96 px below the last headline
// line (50 px); stat value baseline y 790 (156..112 px) and its label from y 858 (44 px); note right-aligned at RX,
// y 946 (27 px); credit at RX, y 994 (22 px); beat ticks at LX, y 986.
const Y = { kicker: 190, head: 316, subGap: 96, subLh: 64, stat: 790, statL: 858, statLh: 54, note: 946, noteLh: 36, credit: 994, ticks: 986, rise: 26 };
const headCache = {};
function headFor(P) { return headCache[P.head] || (headCache[P.head] = L.headLines(P.head)); }
function statSize(v) { let vs = 156; while (vs > 112 && meas(v, { w: 700, size: vs, f: F.sora, ls: -4 }) > 740) vs -= 2; return vs; }
// te: seconds since the text started entering (art time); a: overall alpha
function textBlock(P, te, a) {
  if (a <= 0) return;
  const A = L.A; const ho = { w: 700, f: F.sora, ls: -2 }; const { size, lines } = headFor(P);
  const lh = Math.round(size * 1.07); const y0 = Y.head; const rise = Y.rise;
  const k = (d, dur = 0.55) => eo((te - d) / dur);
  lines.forEach((l, n) => { const e = k(0.1 * n); if (e > 0) txt(l, L.LX - 5, y0 + n * lh + (1 - e) * rise, { ...ho, size, color: L.NAVY, alpha: a * e }); });
  let yb = y0 + (lines.length - 1) * lh; const dSub = 0.1 * lines.length + 0.15;
  if (P.sub) {
    const e = k(dSub);
    if (P.card) { // lab card: accent bar, then the two parts of the sub, large
      const [l1, l2] = P.sub.split(' · '); yb += 74;
      X.save(); X.globalAlpha = a * e; X.fillStyle = A.a; rr(L.LX, yb, 96 * e, 9, 4.5); X.fill(); X.restore();
      txt(l1, L.LX, yb + 96 + (1 - e) * rise, { w: 700, size: 66, f: F.sora, color: L.NAVY, ls: -1, alpha: a * e });
      const e2 = k(dSub + 0.15); txt(l2, L.LX, yb + 166 + (1 - e2) * rise, { w: 600, size: 52, f: F.sora, color: A.t, alpha: a * e2 });
    } else {
      const so = { w: 500, size: 50, f: F.sora }; const sl = L.subLines(P.sub, L.TW - 40, so); yb += Y.subGap;
      sl.forEach((l, n) => { const e2 = k(dSub + 0.08 * n); txt(l, L.LX, yb + n * Y.subLh + (1 - e2) * rise, { ...so, color: L.SLATE, alpha: a * e2 }); });
    }
  }
  if (P.stat) {
    const e = k(dSub + 0.25, 0.7);
    const vs = statSize(P.stat.v);
    const yv = Y.stat + (1 - e) * rise * 1.4;
    if (e > 0) { X.save(); X.globalAlpha = a * e; font(700, vs, F.sora, 'normal', -4); const g = X.createLinearGradient(0, yv - vs * 0.74, 0, yv); g.addColorStop(0, A.a); g.addColorStop(1, A.t); X.fillStyle = g; X.fillText(P.stat.v, L.LX - 6, yv); X.restore(); }
    const e2 = k(dSub + 0.45); const lo = { w: 600, size: 44, f: F.sora };
    if (e2 > 0) L.wrapLines(P.stat.l, 740, lo).forEach((l, n) => txt(l, L.LX, Y.statL + n * Y.statLh + (1 - e2) * rise, { ...lo, color: L.INK2, alpha: a * e2 }));
  }
}
function noteLines(P) { const o = { w: 400, size: 27, f: F.sora }; return meas(P.note, o) > 1120 ? L.splitBest(P.note, 760, o, 2) : [P.note]; }
function note(P, a) {
  if (!P.note || a <= 0) return;
  const o = { w: 400, size: 27, f: F.sora }; const lines = noteLines(P);
  let y = Y.note - (lines.length - 1) * Y.noteLh;
  lines.forEach(l => { txt(l, L.RX, y, { ...o, color: L.SLATE, align: 'right', alpha: a }); y += Y.noteLh; });
}
function ticks(i, t) {
  const A = L.A, x = L.LX, y = Y.ticks, w = 34, h = 7, gap = 8, offc = 'rgba(15,27,45,.13)';
  for (let k = 0; k < N; k++) {
    X.fillStyle = offc; rr(x + k * (w + gap), y, w, h, h / 2); X.fill();
    if (k === i) { const p = clamp(t / BEAT); X.save(); rr(x + k * (w + gap), y, w, h, h / 2); X.clip(); X.fillStyle = A.a; X.fillRect(x + k * (w + gap), y, w * p, h); X.restore(); }
  }
}

// ---------- one frame ----------
window.drawFrame = T => {
  if (!FILM) throw new Error('drawFrame: no film (the story must call defineFilm)');
  T = LOOP ? ((T % LEN) + LEN) % LEN : Math.min(Math.max(T, 0), LEN - 1e-6);
  const i = Math.min(N - 1, Math.floor(T / BEAT + 1e-9)), t = T - i * BEAT;
  const prev = LOOP || i > 0, ip = (i + N - 1) % N;
  const S = FILM, B = FILM.beats, ta = t * K; // ta: art time within the beat
  X = C.getContext('2d'); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.letterSpacing = '0px';
  L.setA(ACC);
  // art
  if (t < DIS) {
    X.drawImage(prev ? endFrame(ip) : backdrop(), 0, 0);
    const c = canvas('cur'); onto(c, () => { X.drawImage(backdrop(), 0, 0); drawArt(i, ta); });
    X.save(); X.globalAlpha = ease(t / DIS); X.drawImage(c, 0, 0); X.restore();
  } else {
    X.drawImage(backdrop(), 0, 0); drawArt(i, ta);
  }
  L.setA(ACC);
  // text: the kicker never changes, so it stays put
  if (S.kicker) txt(S.kicker, L.LX, Y.kicker, { w: 600, size: 32, f: F.sora, color: L.A.t, ls: 6 });
  const out = prev ? 1 - ease(ta / 0.3) : 0;
  if (out > 0) { textBlock(B[ip], 99, out); note(B[ip], out); }
  textBlock(B[i], ta - 0.22, 1);
  note(B[i], ease((ta - 0.9) / 0.6));
  // credit: hidden on a card beat, where the card shows it large
  const cr = B[i].card ? 1 - ease(ta / 0.4) : prev && B[ip].card ? ease((ta - 0.3) / 0.5) : 1;
  if (S.credit && cr > 0) txt(S.credit, L.RX, Y.credit, { w: 600, size: 22, f: F.sora, color: L.MUTE, align: 'right', ls: 1, alpha: cr });
  if (S.ticks !== false) ticks(i, t);
  return true;
};

// ---------- for checks: beat i's art alone (backdrop + art at art time t, no text), and where each beat's text sits ----------
// The loop rule in pixels: drawArtFrame(N - 1, art) must equal drawArtFrame(0, 0) (smoke_test.mjs compares them).
window.drawArtFrame = (i, t) => {
  X = C.getContext('2d'); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; X.letterSpacing = '0px';
  L.setA(ACC); X.drawImage(t >= ART ? endFrame(i) : backdrop(), 0, 0); if (t < ART) drawArt(i, t); return true;
};
// ---------- for checks: where each beat's text sits once it has entered (smoke_test.mjs) ----------
window.textLayout = i => {
  const P = FILM.beats[i]; const { size, lines } = headFor(P); const lh = Math.round(size * 1.07);
  const box = (kind, x0, y0, x1, y1) => ({ kind, x0: Math.round(x0), y0: Math.round(y0), x1: Math.round(x1), y1: Math.round(y1) });
  const out = [];
  const hw = Math.max(...lines.map(l => meas(l, { w: 700, size, f: F.sora, ls: -2 })));
  out.push(box('head', L.LX - 5, Y.head - size * 0.76, L.LX - 5 + hw, Y.head + (lines.length - 1) * lh + size * 0.22));
  let yb = Y.head + (lines.length - 1) * lh;
  if (P.sub && P.card) { yb += 74; out.push(box('card', L.LX, yb, L.LX + Math.max(meas(P.sub.split(' · ')[0], { w: 700, size: 66, f: F.sora, ls: -1 }), meas(P.sub.split(' · ')[1], { w: 600, size: 52, f: F.sora })), yb + 166 + 12)); }
  else if (P.sub) { const so = { w: 500, size: 50, f: F.sora }; const sl = L.subLines(P.sub, L.TW - 40, so); yb += Y.subGap; out.push(box('sub', L.LX, yb - 38, L.LX + Math.max(...sl.map(l => meas(l, so))), yb + (sl.length - 1) * Y.subLh + 12)); }
  if (P.stat) {
    const vs = statSize(P.stat.v), lo = { w: 600, size: 44, f: F.sora }, ll = L.wrapLines(P.stat.l, 740, lo);
    out.push(box('stat', L.LX - 6, Y.stat - vs * 0.74, L.LX - 6 + meas(P.stat.v, { w: 700, size: vs, f: F.sora, ls: -4 }), Y.stat + vs * 0.05));
    out.push(box('statLabel', L.LX, Y.statL - 34, L.LX + Math.max(...ll.map(l => meas(l, lo))), Y.statL + (ll.length - 1) * Y.statLh + 10));
  }
  if (P.note) { const nl = noteLines(P), o = { w: 400, size: 27, f: F.sora }; out.push(box('note', L.RX - Math.max(...nl.map(l => meas(l, o))), Y.note - (nl.length - 1) * Y.noteLh - 21, L.RX, Y.note + 7)); }
  return out;
};

// fonts: wait for Sora, then report which family loaded and any on-screen character Sora does not cover
window.filmReady = async () => {
  await document.fonts.ready;
  const sample = 'Ag→×≈−µ°';
  for (const fam of ['"Sora Variable"', 'Sora']) await Promise.all([400, 500, 600, 700].map(w => document.fonts.load(`${w} 40px ${fam}`, sample)));
  const faces = [...document.fonts].filter(f => /^["']?Sora( Variable)?["']?$/.test(f.family));
  const loaded = faces.filter(f => f.status === 'loaded');
  const inRange = (cp, f) => (f.unicodeRange || 'U+0-10FFFF').split(',').some(r => { const m = r.trim().replace(/^U\+/i, '').split('-'); const a = parseInt(m[0].replace(/\?/g, '0'), 16), b = m[1] ? parseInt(m[1], 16) : parseInt(m[0].replace(/\?/g, 'F'), 16); return cp >= a && cp <= b; });
  const strings = FILM ? [FILM.kicker, FILM.credit, ...FILM.beats.flatMap(b => [b.head, b.sub, b.note, b.stat && b.stat.v, b.stat && b.stat.l, ...(b.labels || [])])].filter(Boolean) : [];
  const chars = [...new Set(strings.join(''))].filter(ch => ch.trim() && !faces.some(f => inRange(ch.codePointAt(0), f)));
  return { family: loaded.length ? loaded[0].family.replace(/["']/g, '') : null, faces: faces.length, loaded: loaded.length, latin: loaded.some(f => inRange(0x41, f)), fallbackChars: chars.join('') };
};
})();
