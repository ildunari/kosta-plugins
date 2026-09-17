/* =====================  STORY: The Long Way Out  ===================== */
Object.assign(PAL, { plasmaHot: '#f0b24a', plasmaDeep: '#d9772f', earth: '#3f86a0', land: '#7aa35e' });
const STATES = ['SCATTERING', 'FREE', 'ABSORBED'];
const walk = (() => { const r = mulberry(7), p = [[960, 620]];            // pre-computed random walk = frame-pure motion
  for (let i = 0; i < 60; i++) { const [x, y] = p[i], a = r() * TAU; p.push([clamp(x + Math.cos(a) * 90, 500, 1420), clamp(y + Math.sin(a) * 70, 420, 860)]); } return p; })();

const T0 = {   // title card
  dur: 5, dark: false, focus: () => [700, 560],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [261.6, 329.6, 392], g: 0.016 }),
  cues: [[1.2, 'chime', { f: 523 }]],
  draw(t) {
    const g = E.out3(inv(0.1, 1.2, t));
    const disc = shape.circle(420, 560, 260 * g, 72);
    if (g > 0) { ink(disc, { closed: true, w: 3.5, fill: PAL.sun, seed: 3 }); shade(disc, { color: '#a4521f', seed: 4 }); }
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU, q = E.out3(inv(0.8 + i * 0.03, 1.2 + i * 0.03, t));
      ink([[420 + Math.cos(a) * 290, 560 + Math.sin(a) * 290], [420 + Math.cos(a) * lerp(290, i % 2 ? 340 : 370, q), 560 + Math.sin(a) * lerp(290, i % 2 ? 340 : 370, q)]], { w: 3, color: PAL.accent, seed: 20 + i }); }
    text(typed('A FIELD STUDY IN 2 PLATES', t - 0.5, 34), 822, 452, { kind: 'mono', size: 21, ls: 9, color: PAL.inkSoft });
    dropText('The Long Way Out', 814, 566, t - 0.9, { kind: 'display', size: 104, weight: 500, cps: 14 });
    text(typed('the journey of one photon', t - 2.2, 26), 818, 640, { kind: 'display', size: 44, italic: true, color: PAL.inkSoft });
  },
};
const PL1 = {  // night plate: the core
  dur: 9, dark: true, enter: { type: 'lensIn', dur: 0.5 },
  header: { num: 1, title: 'The Core', sub: 'every step ends in a collision' },
  stage: { n: 1, name: 'RADIATIVE ZONE', prevN: 0 },
  log: t => ({ title: 'JOURNEY LOG · γ·01', rows: [['ELAPSED', `T+ ${fmt(Math.round(lerp(0, 170000, E.inOut3(t / 9))))} yr`], ['DEPTH', `${fmt(Math.round(lerp(500000, 150000, t / 9)))} km`]], states: STATES, state: 0 }),
  focus: t => along(walk, t / 9),
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [110, 164.8, 196], g: 0.02, dark: true }),
  cues: [[2.9, 'chime', { f: 660 }], [4.0, 'pop'], ...Array.from({ length: 10 }, (_, i) => [0.6 + i * 0.8, 'plink'])],
  draw(t) {
    const r = mulberry(31);
    for (let i = 0; i < 70; i++) { const x = 480 + r() * 960, y = 400 + r() * 480, j = 3 * Math.sin(t * 3 + i);
      ink(shape.circle(x + j, y, 9, 16), { closed: true, w: 1.6, color: PAL.nightInk, fill: i % 3 ? PAL.navyFill : PAL.pink, amp: 0.3, seed: i }); }
    const path = partial(walk, t / 9);
    ink(path, { w: 2.2, color: PAL.gold, amp: 0.6, seed: 5, alpha: 0.9 });
    const [x, y] = along(walk, t / 9);
    reticle(x, y, t, { label: 'γ·01', r: 30, dark: true });
    stat(t - 1.6, { x: 1330, y: 560, kicker: 'CORE TEMPERATURE', value: u => '≈ ' + countUp(15, u, 1.3) + ' million K', note: 'dense enough to scatter light at every turn', dark: true, size: 54 });
    callout(t - 4.0, { ax: x, ay: y, ex: x + 90, ey: 330, x2: x + 150, title: 'random walk', sub: 'estimates run from ~10,000 to ~170,000 years to escape', dark: true });
  },
};
const PL2 = {  // paper plate: arrival
  dur: 9, dark: false, enter: { type: 'lensOut', dur: 0.55 },
  header: { num: 2, title: 'Arrival', sub: 'the last stretch is the quickest' },
  stage: { n: 2, name: 'FREE FLIGHT' },
  log: t => ({ title: 'JOURNEY LOG · γ·01', rows: [['ELAPSED', `T+ ${Math.floor(lerp(0, 499, inv(0.5, 6, t)))} s`], ['DISTANCE', `${fmt(lerp(0, 149.6, inv(0.5, 6, t)), 1)} M km`]], states: STATES, state: t < 6 ? 1 : 2 }),
  focus: t => [lerp(330, 1560, E.inOut3(inv(0.5, 6, t))), 640],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [196, 246.9, 293.7], g: 0.016 }),
  cues: [[2.8, 'chime', { f: 784 }], [6.0, 'plink'], [6.2, 'pop'], [6.8, 'pop']],
  draw(t) {
    const sun = shape.circle(120, 640, 210, 64);
    ink(sun, { closed: true, w: 3.5, fill: PAL.sun, seed: 8 }); shade(sun, { color: '#a4521f', seed: 9 });
    const earth = shape.circle(1640, 640, 70, 48);
    ink(earth, { closed: true, w: 3, fill: PAL.earth, seed: 10 });
    ink(shape.blob(1620, 620, 30, 11, 0.4, 24), { closed: true, w: 2, fill: PAL.land, seed: 11 }); shade(earth, { color: PAL.ink, seed: 12, alpha: 0.4 });
    const [x, y] = PL2.focus(t);
    ink([[330, 640], [x, 640]], { w: 2, color: PAL.accent, amp: 0.8, dash: [14, 10] });
    reticle(x, y, t, { label: 'γ·01', r: 28 });
    stat(t - 1.2, { x: 700, y: 420, kicker: 'SUN → EARTH AT LIGHT SPEED', value: u => typed('8 min 20 s', u, 14), note: 'about 150 million km' });
    callout(t - 6.2, { ax: 1600, ay: 690, ex: 1520, ey: 820, x2: 1460, align: 'right', title: 'absorbed', sub: 'warming one square metre of ocean' });
    insetLens(t - 6.8, { cx: 1300, cy: 380, r: 105, sx: 1640, sy: 640, label: 'INSIDE THE WATER', draw: u => {
      for (let i = 0; i < 14; i++) { const a = i * 2.4, d = 20 + (i * 37) % 80, j = 4 * Math.sin(u * 14 + i);
        const x = Math.cos(a) * d + j, y = Math.sin(a) * d - j;
        ink(shape.circle(x, y, 9, 14), { closed: true, w: 1.4, color: PAL.nightInk, fill: PAL.cyan, amp: 0.2, seed: i });
        ctx.beginPath(); ctx.arc(x - 8, y + 6, 4, 0, TAU); ctx.arc(x + 8, y + 6, 4, 0, TAU); ctx.fillStyle = PAL.pink; ctx.fill(); } } });
    const cp = card(t - 3.2, { x: 490, y: 902, w: 1180, h: 142, title: 'TIME TO LEAVE · LOG SCALE', fig: 'FIG. 1' });
    if (cp > 0) logRuler(t - 3.6, { x: 540, y: 1000, w: 1060, min: 1, max: 1e13,
      ticks: [[1, '1 s'], [3600, '1 h'], [3.15e7, '1 yr'], [3.15e10, '1 kyr'], [3.15e12, '100 kyr']],
      marks: [{ v: 499, label: 'space · 8 min', color: PAL.accent }, { v: 5.4e12, label: 'core → surface · up to ~170 kyr' }] });
  },
};
const END = {
  dur: 5, dark: true, enter: { type: 'fade', dur: 0.8 }, counter: false, focus: () => [960, 420],
  cues: [[1.0, 'chime', { f: 392 }]],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur: dur - 0.5, notes: [130.8, 196, 246.9], g: 0.02, dark: true }),
  draw(t) {
    reticle(960, 400, t, { r: 70, dark: true, tag: false, alpha: inv(0.3, 1, t) });
    const q = 'Sunlight is older than it looks.', qo = { kind: 'display', size: 58, italic: true, color: PAL.nightInk, cps: 20 };
    dropText(q, 960 - measure(q, qo) / 2, 620, t - 0.8, qo);
    const col = `THE LONG WAY OUT  ·  2 PLATES  ·  ${fmt(TOTAL_F)} FRAMES  ·  DRAWN IN CODE`, co = { kind: 'mono', size: 20, ls: 6, color: '#9fa0c8' };
    text(typed(col, t - 2.4, 60), 960 - measure(col, co) / 2, 700, co);
  },
};
defineStory({ title: 'The Long Way Out', stages: 2, plates: [T0, PL1, PL2, END] });
boot();
