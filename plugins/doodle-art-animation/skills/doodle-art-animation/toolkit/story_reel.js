/* =====================  STORY: Transition Reel  ·  engine test  ===================== */
/* Every transition type back to back. Neighbouring plates differ in world, colour, composition and hero position,
   so each transition has something real to join. Build: python3 build.py story_reel.js reel.html */
const HEROS = [[1100, 520], [760, 430], [1180, 600], [900, 470], [1240, 420], [700, 560], [1020, 380]];
const HUES = [['#e3a03c', '#a4521f'], ['#56c3d2', '#2f6f7a'], ['#e8577a', '#9a2f4c'], ['#53ba8b', '#2f6f50']];
const heroAt = k => () => { const [x, y] = HEROS[k % HEROS.length]; return { x, y, label: 'X·01', r: 60 }; };

function paperScene(t, k, pl) {
  const [hx, hy] = HEROS[k % HEROS.length], [fill, dark] = HUES[k % HUES.length], gy = 640 + (k % 3) * 60;
  const ridge = shape.ridge(-20, W + 20, gy, 40 + k * 6, 3 + k);
  const g = shape.band(ridge, H + 20); flat(g, k % 2 ? '#cfc09a' : '#d9c9a0'); hatch(g, { alpha: 0.3, seed: 4 + k, angle: k % 2 ? 0.4 : -0.3 });
  pen(ridge, { w: 4, seed: 5 + k }); grass(ridge, { every: 40, seed: k, sway: 4 });
  flow([[100, gy + 120], [700, gy + 160], [1300, gy + 140], [1860, gy + 180]], t, { color: PAL.sea, w: 3 });
  lobedCloud((k % 2 ? 1400 : 460) + 30 * Math.sin(t * 0.4), 300 + (k % 3) * 30, [[0, 90], [-120, 60], [110, 70]], { seed: 3 + k });
  const d = shape.circle(hx, hy, 70, 48); ink(d, { closed: true, w: 3.4, fill, seed: 7 + k }); shade(d, { color: dark, seed: 8 + k });
}
function nightScene(t, k) {
  const [hx, hy] = HEROS[k % HEROS.length], [fill] = HUES[(k + 2) % HUES.length];
  for (let i = 0; i < 44; i++) { const [dx, dy] = wander(i + k * 50, t, 12, 0.8), r = mulberry(i + k * 50); const x = 300 + r() * 1320 + dx, y = 220 + r() * 680 + dy;
    if (Math.hypot(x - hx, y - hy) < 90) continue;
    ink(shape.circle(x, y, 10 + r() * 8, 18), { closed: true, w: 1.6, color: PAL.nightInk, fill: PAL.navyFill, amp: 0.3, seed: i }); }
  if (!S.morph) ink(shape.circle(hx, hy, 40, 32), { closed: true, w: 2, color: PAL.nightInk, fill, seed: 9 + k });
}
const mk = (i, type, dark, extra = {}) => ({ dur: 2.4, dark, enter: { type, ...extra }, hero: heroAt(i), header: { num: i, title: type, sub: 'transition test' },
  draw(t, pl) { dark ? nightScene(t, i) : paperScene(t, i, pl); } });
const circAt = (k, r) => () => { const [x, y] = HEROS[k % HEROS.length]; return shape.circle(x, y, r, 48); };
const P = [
  { dur: 2.4, dark: false, hero: heroAt(0), header: { num: 0, title: 'start', sub: 'transition test' }, draw(t) { paperScene(t, 0); } },
  mk(1, 'lensIn', true, { dur: 0.6 }), mk(2, 'lensOut', false, { dur: 0.6 }), mk(3, 'pan', false, { dur: 0.8, dir: 'left' }),
  mk(4, 'wipe', false, { dur: 0.8 }), mk(5, 'bleed', true, { dur: 1.3 }), mk(6, 'zoom', true, { dur: 0.8, dir: 'in', k: 6 }),
  mk(7, 'shape', false, { dur: 1.0, from: circAt(6, 40), to: circAt(7, 70) }), mk(8, 'iris', false, { dur: 0.8 }),
  mk(9, 'burn', false, { dur: 1.3 }), mk(10, 'cut', false), mk(11, 'hatch', true, { dur: 0.8 }), mk(12, 'page', false, { dur: 1.0 }),
];
defineStory({ title: 'Transition Reel', stages: 1, music: { tonic: 220 }, plates: P });
boot();
