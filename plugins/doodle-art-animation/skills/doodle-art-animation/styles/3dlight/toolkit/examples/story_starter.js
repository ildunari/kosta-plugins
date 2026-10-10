// Starter: the smallest complete 3DLight film. Copy it to story.js and replace the words and the art.
// 4 beats x 4.5 s = an 18 s seamless loop, blue accent. The art of each beat is written straight into its draw(t, P),
// with t in ART time (0..6). Every word here is a placeholder: a real film's words and numbers come from facts.md.
// Build: python3 build.py examples/story_starter.js starter.html    Check: node smoke_test.mjs examples/story_starter.js
(() => {
const L = L3D, { M } = L;
const { seg, eo, lerp, clamp } = ANIM_UTIL;

// Static parts are drawn once into an offscreen canvas and blitted every frame (fast, and identical every time).
const cache = {};
function once(key, fn) { if (!cache[key]) { const c = off(W, H); withCtx(c.getContext('2d'), fn); cache[key] = c; } return cache[key]; }
function blit(c, a = 1) { if (a <= 0.002) return; X.save(); X.globalAlpha *= Math.min(1, a); X.drawImage(c, 0, 0); X.restore(); }
// tags with opacity (L.tag has none): draw at alpha a
function tagA(s, x, y, a, o = {}) { if (a <= 0.002) return null; X.save(); X.globalAlpha *= a; const b = L.tag(s, x, y, o); X.restore(); return b; }

// The hero object, shared by beats 1, 2 and 4: a tablet at TAB. Beat 4 ends exactly on beat 1's opening picture.
const TAB = { cx: 1390, cy: 470, rx: 300, ry: 96, h: 92 };
const tablet = () => once('tablet', () => L.tablet(TAB.cx, TAB.cy, TAB.rx, TAB.ry, TAB.h, { seed: 12, sr: 7 }));
// drug specks that leave the top face along gentle arcs; u = 0..1 progress of speck k
const SPECKS = (() => { const r = rng(5); return Array.from({ length: 9 }, (_, k) => ({ x: TAB.cx - 200 + k * 50 + (r() - 0.5) * 20, y: TAB.cy - 10 + (r() - 0.5) * 40, dx: (r() - 0.5) * 160, rise: 180 + r() * 160, r: 8 + r() * 5 })); })();
function specks(t, t0, a = 1) {
  SPECKS.forEach((s, k) => {
    const u = seg(t, t0 + k * 0.22, t0 + k * 0.22 + 2.2); if (u <= 0) return;
    const x = s.x + s.dx * u, y = s.y - s.rise * eo(u) + 12 * Math.sin(t * 1.3 + k); // keeps drifting after it arrives
    L.gsph(x, y, s.r, M.drug, { alpha: a * clamp(u * 4) });
  });
}

defineFilm({
  id: 'starter', title: 'Starter · 3DLight',
  kicker: 'YOUR TOPIC IN CAPITALS', accent: 'blue', credit: 'Your Lab · Your Institution',
  size: [1920, 1080], art: 6, beat: 4.5, loop: true,
  beats: [
    { head: 'One tablet holds a month of drug.', labels: ['tablet'], note: 'placeholder words: replace with sourced facts',
      draw(t, P) { // a quiet float keeps the picture alive; it is 0 at t = 0, where beat 4 ends
        const y = 6 * Math.sin(t * 0.9); X.save(); X.translate(0, y); blit(tablet()); X.restore();
        tagA(P.labels[0], 1650, 300, seg(t, 1.2, 1.6));
      } },
    { head: 'The drug leaves it slowly.', sub: 'A few specks at a time.', labels: ['drug'],
      draw(t, P) {
        const y = 6 * Math.sin((t + 6) * 0.9); X.save(); X.translate(0, y); blit(tablet()); X.restore();
        specks(t, 0.6);
        const b = tagA(P.labels[0], 1600, 200, seg(t, 2.4, 2.8), { dot: L.A.a }); if (b) { X.save(); X.globalAlpha *= seg(t, 2.4, 2.8); L.leader(b.x + 30, b.b - 4, 1480, 330); X.restore(); }
      } },
    { head: 'Cells take it up.', stat: { v: '≈ 30 days', l: 'placeholder stat: a sourced number and its unit' }, labels: ['cells'],
      draw(t, P) {
        blit(once('cells', () => L.cellRow(980, 1820, 640, 200, { n: 6, mv: 22, nucY: 0.66 })), seg(t, 0, 0.8));
        for (let k = 0; k < 6; k++) { // particles fall into the cells, one after another, and keep sinking slowly
          const u = seg(t, 0.5 + k * 0.35, 2.2 + k * 0.35), x = 1050 + k * 140, y = lerp(260, 600, u) + (u >= 1 ? 4 * Math.sin(t * 2 + k) : 0);
          if (u > 0) L.gsph(x, y, 18, M.pearl, { alpha: clamp(u * 3) * (1 - seg(u, 0.9, 1) * 0.5) });
        }
        tagA(P.labels[0], 1830, 900, seg(t, 1.0, 1.4), { align: 'right' });
      } },
    { head: 'Made to last.', sub: 'Your Lab · Your Institution', card: true,
      draw(t) { // the loop rule: the card beat ends on beat 1's opening picture (the tablet, still, at TAB)
        blit(tablet(), seg(t, 0.4, 2.0));
      } },
  ],
  sound: {
    seed: 3,
    music: { // D major, felt-piano keys, one chord per beat
      chords: [[50, 57, 61, 64, 66], [54, 57, 59, 62, 64], [55, 59, 62, 66, 69], [57, 61, 64, 66, 71]],
      bass: [38, 47, 43, 45], arp: [0, 2, 3, 5, 6, 8, 10, 11, 13, 14], cut: 1250, inst: 'keys', arpLevel: [0.5, 0.8, 0.8, 0.5],
    },
    rhythm: { level: [0.7, 1, 1, 0.75] },
    // fx: [{ at: 5.2, fx: 'name from sound-library/catalog.md', g: 0.8, pan: 0.3 }],   // shared-library effects, screen seconds
    cues(E, o, ev, U) {
      U.transitions(E, o); // a breath of air on every dissolve
      E.thump(U.S(0.9), 0.06, { f0: 150, f1: 70, dec: 0.3, body: 900, pan: 0.3 }); // the tablet settles (art time 0.9 of beat 1)
      for (let k = 0; k < 9; k++) E.pop(U.S(6 + 0.6 + k * 0.22 + 0.4), 700 + k * 40, 0.02, { pan: 0.2 + k * 0.04 }); // specks leave (beat 2)
      for (let k = 0; k < 6; k++) E.tick(U.S(12 + 2.2 + k * 0.35), 2400 + k * 120, 0.014, { pan: -0.2 + k * 0.12 }); // particles land (beat 3)
      E.chime(U.beatStart(3) + 0.3, 74, 0.45, { pan: -0.3 }); // the card
    },
  },
});
})();
