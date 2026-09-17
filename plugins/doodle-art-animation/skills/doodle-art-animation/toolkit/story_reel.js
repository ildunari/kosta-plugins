const HERO = 'X·01';
function paperScene(t, k) {
  const g = shape.band(shape.ridge(-20, W + 20, 700, 40, 3 + k), H + 20); flat(g, '#d9c9a0'); hatch(g, { alpha: 0.3, seed: 4 });
  pen(shape.ridge(-20, W + 20, 700, 40, 3 + k), { w: 4, seed: 5 }); grass(shape.ridge(-20, W + 20, 700, 40, 3 + k), { every: 40 });
  flow([[100, 820], [700, 860], [1300, 840], [1860, 880]], t, { color: '#2f7f98', w: 3 });
  lobedCloud(500 + 30 * Math.sin(t * 0.4), 360, [[0, 90], [-120, 60], [110, 70]], { seed: 3 + k });
  const d = shape.circle(1100, 520, 70, 48); ink(d, { closed: true, w: 3.4, fill: PAL.sun, seed: 7 }); shade(d, { color: '#a4521f', seed: 8 });
}
function nightScene(t) {
  for (let i = 0; i < 40; i++) { const [dx, dy] = wander(i, t, 10, 0.8), r = mulberry(i); const x = 500 + r() * 900 + dx, y = 300 + r() * 560 + dy;
    ink(shape.circle(x, y, 14, 18), { closed: true, w: 1.6, color: PAL.nightInk, fill: PAL.navyFill, amp: 0.3, seed: i }); }
  if (!S.morph) ink(shape.circle(1100, 520, 40, 32), { closed: true, w: 2, color: PAL.nightInk, fill: PAL.pink, seed: 9 });
}
const hero = () => ({ x: 1100, y: 520, label: HERO, r: 60 });
const mk = (i, type, dark, extra = {}) => ({ dur: 2.2, dark, enter: { type, ...extra }, hero, header: { num: i, title: type, sub: 'transition test' },
  draw(t) { dark ? nightScene(t) : paperScene(t, i); } });
const circ = () => shape.circle(1100, 520, 40, 32);
const P = [
  { dur: 2.2, dark: false, hero, header: { num: 0, title: 'start', sub: 'transition test' }, draw(t) { paperScene(t, 0); } },
  mk(1, 'lensIn', true, { dur: 0.5 }), mk(2, 'lensOut', false, { dur: 0.5 }), mk(3, 'pan', false, { dur: 0.7, dir: 'left' }),
  mk(4, 'wipe', false, { dur: 0.7 }), mk(5, 'bleed', true, { dur: 0.9 }), mk(6, 'zoom', true, { dur: 0.8, dir: 'in', k: 6 }),
  mk(7, 'shape', false, { dur: 0.9, from: circ, to: () => shape.circle(1100, 520, 70, 48) }), mk(8, 'iris', false, { dur: 0.6 }),
  mk(9, 'burn', false, { dur: 0.9 }), mk(10, 'cut', false), mk(11, 'hatch', true, { dur: 0.7 }), mk(12, 'page', false, { dur: 0.9 }),
];
defineStory({ title: 'Transition Reel', stages: 1, music: { tonic: 220 }, plates: P });
boot();
