/* =====================  STORY: The Long Release  ·  worked example  ===================== */
/* One PLGA nanoparticle (NP·01), from the syringe to the slow release of its drug, in 4 plates plus title and end card.
   Read this for structure: plates, beats that enter and leave, text in overlay(), motivated cameras, and designed seams.

   Seams (exit → entry, link, transition):
     0 → I    the drop lands in a pool of blood → a red blood cell beside NP·01 in a vein
              link: going into a surface (the blood) and out of a red object inside it → `through`, 2.2 s
     I → II   NP·01, tracked along the vein → the same particle, huge, in plasma
              link: scale (paper world → microscope world) → `lensIn`, 1.6 s
     II → III the coated particle, carried off to the right by the plasma → a dot moving right along a capillary
              link: travel, not scale: the flow carries the camera on (a switch-up; a pull-out here would mirror the
              lens-in) → whip `pan` to the right, 1.2 s; plate III's own camera then pulls back to reveal the tumour
     III → IV NP·01 lodged in the tumour, camera pulled back → the particle up close, swelling with water
              link: scale, motivated by a slow creep and a pulsing reticle; slower than seam I → II → `lensIn`, 1.9 s
     IV → V   the eroded particle → the small particle of the end card
              link: the same object becomes a symbol → `shape` morph, 1.6 s

   Rhythm: scale-dive 2.2 s · lens 1.6 s · whip 1.2 s · slow lens 1.9 s · morph 1.6 s. Nothing reads until a move lands.

   Values are rounded and illustrative; the end card says so. Checked: 1 mg of 150 nm PLGA spheres (density ≈ 1.3 g/cm³)
   is ≈ 4.3 × 10¹¹ particles; a red cell (≈ 7.5 µm) is 50× the particle; plasma holds ≈ 60–80 g of protein per litre. */
Object.assign(PAL, {
  blood: '#b8453e', bloodDeep: '#8a2e2b', plasma: '#efd8b0', plasmaLine: '#d7b584',
  flesh: '#e4b8a2', fleshDeep: '#c98770', tumor: '#bb8aa0', tumorDeep: '#8d5c77',
  cellFill: '#e6dcb8', nucleus: '#6a5478', plga: '#27336b', plgaLine: '#d9dbf2', drug: '#e6c65c',
  sus: '#d6e6e8',
});
const STATES = ['FLOWING', 'LODGED', 'RELEASING'];
const heart = (g, notes) => (ac, out, t0, dur) => {
  for (let t = 0.3; t < dur; t += 0.9) { SFX.thump(ac, out, t0 + t, { g }); SFX.thump(ac, out, t0 + t + 0.24, { g: g * 0.55 }); }
  SFX.pad(ac, out, t0, { dur, notes, g: 0.016 });
};
const darkBed = notes => (ac, out, t0, dur) => {
  SFX.pad(ac, out, t0, { dur, notes, g: 0.02, dark: true });
  SFX.noise(ac, out, t0, { dur, g: 0.03, f0: 180, type: 'lowpass', q: 0.5, a: 1 });
};

/* ---------- shared drawings ---------- */
function rbc(x, y, r, tumble, seed, alpha = 1) {
  const ry = r * Math.max(0.32, Math.abs(Math.cos(tumble)));
  ctx.save(); ctx.globalAlpha *= alpha;
  const body = shape.ellipse(x, y, r, ry, 0.2, 36);
  flat(body, PAL.blood);
  if (ry > r * 0.45) flat(shape.ellipse(x + 2, y + 1, r * 0.5, ry * 0.5, 0.2, 24), PAL.bloodDeep, 0.65);
  shade(body, { color: '#5a1a1c', seed, angle: -0.6, gap: 4.5, len: 7, alpha: 0.55 });
  ink(body, { closed: true, w: 2.2, amp: 0.7, seed });
  ink(shape.arc(x - r * 0.1, y - ry * 0.1, r * 0.72, 3.5, 4.4, 8).map(([a, b]) => [a, lerp(y, b, ry / r)]), { w: 2, color: '#f0b3a2', amp: 0.3, alpha: 0.8 });
  ctx.restore();
}
function particle(x, y, R, t, o = {}) {
  const { irr = 0.02, seed = 40, drugs = 30, pits = 0, detail = 1 } = o;
  const body = shape.blob(x, y, R, seed, irr, 72);
  flat(body, PAL.plga);
  if (detail) { hatch(body, { color: '#9aa2e0', alpha: 0.22, angle: 0.6, gap: 8, len: 10, seed: 41, w: 1.2 });
    speckle(body, Math.round(R * 1.1), { color: '#fff', alpha: 0.45, rmin: 0.7, rmax: 1.8, seed: 42 }); }
  const r = mulberry(43);
  for (let i = 0; i < drugs; i++) { const a = r() * TAU + t * 0.05, d = Math.sqrt(r()) * R * 0.8; hex(x + Math.cos(a) * d, y + Math.sin(a) * d, R * 0.035, PAL.drug, 0.8); }
  for (let i = 0; i < pits; i++) { const a = hash3(i, 7) * TAU, s = R * (0.05 + hash3(i, 8) * 0.06);
    ink(shape.blob(x + Math.cos(a) * R * 0.97, y + Math.sin(a) * R * 0.97, s, 60 + i, 0.3, 20), { closed: true, w: 1.5, color: PAL.plgaLine, fill: PAL.night, amp: 0.3 }); }
  ink(body, { closed: true, w: Math.max(2, R * 0.017), color: PAL.plgaLine, amp: 0.8, seed: 44 });
  ink(shape.arc(x, y, R * 0.74, 3.55, 4.25, 16), { w: Math.max(2, R * 0.025), color: '#ffffff', amp: 0.4, alpha: 0.9 });
}
function hex(x, y, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(40,30,10,0.6)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
}
function protein(x, y, r, kind, seed, alpha = 1) {
  const col = [PAL.pink, PAL.cyan, PAL.drug][kind];
  ctx.save(); ctx.globalAlpha *= alpha;
  const p = kind === 2 ? shape.ellipse(x, y, r * 1.5, r * 0.6, seed, 24) : shape.blob(x, y, r, seed, 0.35, 24);
  ink(p, { closed: true, w: 1.6, color: '#f3eef8', fill: col, amp: 0.5, seed });
  ink(shape.arc(x, y, r * 0.45, seed, seed + 2.2, 8), { w: 1.4, color: 'rgba(20,20,50,0.7)', amp: 0.2 });
  ctx.restore();
}
function fluid(t, y0, front, colA, colB, seed = 1) {
  const sx = Math.min(front, W + 200);
  const surf = [];
  for (let x = -20; x <= sx; x += 14) {
    const crest = front < W + 150 ? 105 * Math.max(0, 1 - (front - x) / 420) ** 2.2 : 0;
    surf.push([x, y0 + 4 * Math.sin(x * 0.012 + t * 2) - crest]);
  }
  if (front < W + 150) surf.push([front + 34, y0 - 96], [front + 44, y0 - 70], [front + 18, y0 - 58], [front + 30, y0 + 10], [front + 70, H + 20]);
  const poly = [...surf, [Math.min(front + 70, W + 200), H + 20], [-20, H + 20]];
  ink(poly, { closed: true, w: 3, fill: colA, amp: 1, seed });
  hatch(poly, { color: colB, alpha: 0.7, angle: 0.02, gap: 6, len: 14, w: 1.5, seed: seed + 3, keep: (x, y) => 0.2 + 0.7 * clamp((y - y0) / 260) });
  hatch(poly, { color: '#5e1c1c', alpha: 0.5, angle: 0.5, gap: 5, len: 8, w: 1.1, seed: seed + 4, keep: (x, y) => 0.8 * clamp((y - y0 - 120) / 200) });
  for (let k = 0; k < 16; k++) { const wy = y0 + 40 + (k % 4) * 60 + k * 3, wx = ((k * 263 + t * 30) % (W + 300)) - 150;
    if (wx < front) ink([[wx, wy], [wx + 40, wy - 6], [wx + 90, wy + 2], [wx + 140, wy - 3]], { w: 2.2, color: '#f2c1b4', amp: 0.6, seed: 30 + k, alpha: 0.8 }); }
  hatch(poly, { color: '#f6d9c8', alpha: 0.5, angle: -0.02, gap: 13, len: 10, w: 1.4, seed: seed + 5, keep: (x, y) => 0.35 * (1 - clamp((y - y0) / 260)) });
  if (front < W + 150) { const r = mulberry(seed + 9); for (let i = 0; i < 14; i++) { const a = r() * 1.6 - 1.2, d = 20 + r() * 50;
    ctx.beginPath(); ctx.arc(front + 40 + Math.cos(a) * d, y0 - 100 + Math.sin(a) * d * 0.6, 1.5 + r() * 3, 0, TAU); ctx.fillStyle = PAL.ink; ctx.fill(); } }
  return poly;
}

/* ---------- camera helpers ---------- */
const mixCam = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), s: lerp(a.s, b.s, u), dx: lerp(a.dx || 0, b.dx || 0, u), dy: lerp(a.dy || 0, b.dy || 0, u), rot: lerp(a.rot || 0, b.rot || 0, u) });
const FULL = { x: W / 2, y: H / 2, s: 1, dx: 0, dy: 0 };

/* ---------- PLATE 0 · title card: the syringe, a drop, the blood ---------- */
const TIP = [780, 262], LAND = [780, 804];
const P0 = {
  dur: 6.5, dark: false,
  // a small settle while the title writes, then a push towards the landing ripple that motivates the dive
  cam: t => ({ x: LAND[0], y: LAND[1], s: curve(t, [[0, 1.05], [2.6, 1.0, 'out3'], [4.6, 1.035, 'inOutSine'], [6.5, 1.14, 'in2']]), dx: 16 * Math.sin(t * 0.7), dy: 6 * Math.sin(t * 0.9) }),   // never quite still
  hero: t => ({ x: LAND[0], y: 792, label: 'NP·01', r: 36, alpha: E.out3(clamp((t - 2.55) * 3)) }),
  cues: [[0.25, 'noise', { dur: 1.6, g: 0.07, f0: 400, f1: 1800, q: 0.8 }], [0.5, 'scratch', { chars: 25, cps: 34 }], [1.0, 'scratch', { chars: 16, cps: 13 }], [2.5, 'scratch', { chars: 31, cps: 26 }], [2.55, 'plink'], [2.6, 'chime', { f: 523 }], [4.6, 'tick']],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [261.6, 329.6, 392], g: 0.016 }),
  draw(t) {
    fluid(t, 800, lerp(-300, W + 400, E.inOut3(inv(0.25, 1.6, t))), PAL.blood, PAL.bloodDeep, 3);
    for (let i = 0; i < 20; i++) { const x = ((i * 157 + t * (40 + (i % 5) * 9)) % (W + 200)) - 100, y = 860 + (i % 4) * 55;   // cells drift in the pool
      if (t > 1.4) rbc(x, y + 6 * Math.sin(t + i), 16 + (i % 3) * 3, i + t * 0.6, 1200 + i, 0.9 * inv(1.4, 2.2, t)); }
    // syringe (local frame: needle tip at origin, pointing +x)
    ctx.save(); ctx.translate(TIP[0], TIP[1]); ctx.rotate(0.42);
    const d = E.out3(inv(0.05, 0.9, t));
    if (d >= 1) { flat(shape.rect(-560, -30, 358, 60), PAL.sus, 0.9); hatch(shape.rect(-560, -30, 358, 60), { color: PAL.peri, alpha: 0.4, gap: 6, len: 8, angle: 0.7, seed: 8 }); }
    ink(shape.rect(-640, -36, 440, 72), { closed: true, w: 3, amp: 1, seed: 11, draw: d });
    ink([[-200, -14], [-176, -8], [-176, 8], [-200, 14]], { w: 3, seed: 12, draw: d });
    ink([[-176, 0], [0, 0]], { w: 2.4, seed: 13, draw: d });
    const push = E.inOut3(inv(0.9, 1.9, t)) * 30;                              // the plunger moves as the drop forms
    ink(shape.rect(-900 + push, -10, 340, 20), { closed: true, w: 3, fill: PAL.panel, seed: 14, draw: d });
    ink(shape.rect(-580 + push, -30, 20, 60), { closed: true, w: 3, fill: PAL.ink, seed: 15, draw: d });
    for (let i = 0; i < 9; i++) ink([[-560 + i * 40, -36], [-560 + i * 40, i % 2 ? -24 : -16]], { w: 1.6, amp: 0.2, draw: inv(0.5 + i * 0.04, 0.8 + i * 0.04, t) });
    ctx.restore();
    const form = E.out3(inv(1.0, 1.9, t)), fall = inv(2.05, 2.55, t);          // drop forms, falls on an easing, lands
    if (form > 0 && fall < 1) {
      const r = 12 * form, y = TIP[1] + r + 2 + fall * fall * (800 - TIP[1] - 14);
      ink([[TIP[0] - r * 0.5, y - r * 0.7], [TIP[0], y - r * (1.9 + fall * 1.2)], [TIP[0] + r * 0.5, y - r * 0.7]], { w: 2.2, amp: 0.2, fill: PAL.sus, closed: true });
      ink(shape.circle(TIP[0], y, r, 24), { closed: true, w: 2.4, fill: PAL.sus, amp: 0.3 });
    }
    if (t > 2.55) { const u = t - 2.55;                                         // ripples keep spreading (the end of the plate still moves)
      for (let k = 0; k < 5; k++) { const q = clamp((u * 0.9 - k * 0.3) % 1.6); if (u * 0.9 - k * 0.3 > 0 && q < 1) ink(shape.ellipse(LAND[0], LAND[1], 20 + q * 140, 5 + q * 26, 0, 40), { closed: true, w: 2, color: '#f3d2c4', amp: 0.4, alpha: 1 - q }); } }
    const rl = E.out3(inv(1.4, 2.3, t));
    if (rl > 0) { const x = TIP[0] - 70; ink([[x, 330], [x, lerp(330, 780, rl)]], { w: 1.4, color: PAL.peri, amp: 0 });
      for (let y = 330; y <= lerp(330, 780, rl); y += 22) ink([[x - (y % 110 ? 7 : 13), y], [x, y]], { w: 1.2, color: PAL.peri, amp: 0 }); }
  },
  overlay(t) {
    const fl = E.out3(inv(0, 0.9, t)), c = { w: 1.2, color: PAL.peri, amp: 0, alpha: 0.55 };
    ink([[34, 34], [lerp(34, W - 34, fl), 34]], c); ink([[W - 34, 34], [W - 34, lerp(34, H - 34, fl)]], c); ink([[34, 34], [34, lerp(34, H - 34, fl)]], c);
    text(typed('Ø 150 nm', t - 2.0, 20), TIP[0] - 96, 500, { kind: 'mono', size: 18, align: 'right', color: PAL.peri });
    withAlpha(1 - inv(5.95, 6.45, t), () => {                                  // the title clears just before the dive
      text(typed('A FIELD STUDY IN 4 PLATES', t - 0.5, 34), 922, 392, { kind: 'mono', size: 21, ls: 9, color: PAL.inkSoft });
      dropText('The Long Release', 914, 508, t - 0.95, { kind: 'display', size: 112, weight: 500, cps: 13 });
      const ul = E.out3(inv(2.0, 2.8, t));
      if (ul > 0) { ink([[918, 548], [lerp(918, 1800, ul), 548]], { w: 1.6, color: PAL.peri, amp: 0 });
        for (let x = 918; x <= lerp(918, 1800, ul); x += 40) ink([[x, 548], [x, x % 200 === 118 ? 557 : 553]], { w: 1.2, color: PAL.peri, amp: 0 }); }
      text(typed('the journey of one nanoparticle', t - 2.5, 26), 918, 618, { kind: 'display', size: 46, italic: true, color: PAL.inkSoft });
    });
  },
};

/* ---------- PLATE I · into the blood: the camera travels with NP·01 down the vein ---------- */
const LUMEN = [470, 850], SPAN1 = W + 900;
const npI = t => [lerp(300, 1150, E.inOutSine(clamp(t / 11))), 690 + 28 * Math.sin(t * 1.3)];
const rbcI = t => { const [x, y] = npI(t); return [x + 110, y - 90]; };   // the red cell rides just ahead of NP·01
const camI = t => ({ x: W / 2, y: H / 2, s: 1.04, dx: -0.5 * (npI(t)[0] - 300), dy: 6 * Math.sin(t * 0.9) });   // lags the particle: it drifts ahead of centre
const cellsI = (() => { const r = mulberry(101); return Array.from({ length: 44 }, (_, i) => ({ x0: r() * SPAN1, y: lerp(505, 815, r()), r: 30 + r() * 8, a0: r() * TAU, spin: 0.4 + r() * 0.9, seed: 200 + i })); })();
const P1 = {
  dur: 10, dark: false,
  enter: { type: 'through', dur: 2.2, momentum: false, from: { at: LAND, r: 30 }, to: (pl, t) => ({ at: rbcI(t), r: 32 }), fromFill: PAL.blood, toFill: PAL.blood },   // to r 32: inside the cell, so the colour field reads as its body
  header: { num: 1, title: 'Into the Blood', sub: 'carried along at the pace of the heart' },
  stage: { n: 1, name: 'CIRCULATION', prevN: 0 },
  log: t => ({ title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', `T+ ${Math.floor(lerp(0, 9, t / 10))} s`], ['SITE', 'VEIN'], ['DIAMETER', '150 nm']], states: STATES, state: 0 }),
  cam: camI,
  hero: t => { const [x, y] = npI(t); return { x, y, label: 'NP·01', r: 36 }; },
  bed: heart(0.24, [220, 277.2, 329.6]),
  cues: [[2.6, 'scratch', { chars: 29, cps: 40 }], [3.8, 'scratch', { chars: 34, cps: 40 }], [4.2, 'chime', { f: 660 }], [4.3, 'pop'], [4.65, 'scratch', { chars: 14 }], [6.0, 'pop'], [6.9, 'plink'], [7.25, 'plink'], [7.6, 'plink'], [7.95, 'plink']],
  draw(t) {
    const v = y => 110 + 260 * (1 - ((y - 660) / 200) ** 2), x0 = -200, x1 = SPAN1;
    const tissue = shape.band(shape.ridge(x0, x1, 392, 8, 5), H + 20);
    flat(tissue, PAL.flesh, 0.55);
    hatch(tissue, { color: PAL.fleshDeep, alpha: 0.35, gap: 12, len: 9, angle: 0.9, seed: 6, keep: 0.45 });
    const lumen = shape.rect(x0, LUMEN[0], x1 - x0, LUMEN[1] - LUMEN[0]);
    flat(lumen, PAL.plasma);
    hatch(lumen, { color: '#caa577', alpha: 0.35, angle: 0.03, gap: 10, len: 14, seed: 57, keep: (x, y) => 0.1 + 0.6 * (Math.abs(y - 660) / 190) ** 2 });
    const r = mulberry(55); ctx.save(); ctx.strokeStyle = PAL.plasmaLine; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 100; i++) { const y = lerp(485, 835, r()), L = 30 + r() * 70, x = ((r() * SPAN1 + v(y) * 1.2 * t) % SPAN1) - 150; ctx.moveTo(x, y); ctx.lineTo(x + L, y); }
    ctx.stroke(); ctx.restore();
    for (const c of cellsI) { const x = ((c.x0 + v(c.y) * t) % SPAN1) - 150; rbc(x, c.y, c.r, c.a0 + t * c.spin, c.seed); }
    const [fx, fy] = rbcI(t);
    rbc(fx, fy, 42, 0.25 + 0.15 * Math.sin(t), 999);
    for (let k = 0; k < 3; k++) { const x = ((700 + k * 900 + 90 * t) % SPAN1) - 150, y = 760 - (k % 2) * 180;
      ink(shape.blob(x, y, 50, 300 + k, 0.12), { closed: true, w: 2.4, fill: '#d6c8e2', seed: 300 + k });
      ink(shape.blob(x - 8, y + 4, 24, 310 + k, 0.5), { closed: true, w: 1.8, fill: '#7a5a96', seed: 310 + k }); }
    const [nx, ny] = npI(t);
    ctx.beginPath(); ctx.arc(nx, ny, 6, 0, TAU); ctx.fillStyle = PAL.plga; ctx.fill();
    for (const [y0, y1, s] of [[420, 470, 1], [850, 900, 2]]) {
      const top = shape.ridge(x0, x1, y0, 5, 20 + s), bot = shape.ridge(x0, x1, y1, 5, 30 + s);
      const wall = [...top, ...bot.slice().reverse()];
      flat(wall, PAL.fleshDeep); hatch(wall, { color: PAL.bloodDeep, alpha: 0.45, gap: 6, len: 14, angle: 0.15, seed: 40 + s });
      ink(top, { w: 3, seed: 50 + s }); ink(bot, { w: 3, seed: 60 + s });
    }
  },
  overlay(t) {
    withAlpha(beat(t, 2.6, 8.0), () => stat(t - 2.6, { x: 610, y: 335, kicker: 'ONE MG OF 150 NM PLGA SPHERES', value: u => '≈ ' + countUp(435, u, 1.5) + ' billion', note: 'solid spheres, density ≈ 1.3 g/cm³' }));
    const [ax, ay] = camPoint(camI(t), [rbcI(t)[0] + 20, rbcI(t)[1] - 30]);
    withAlpha(beat(t, 4.3, 10.0), () => callout(t - 4.3, { ax, ay, ex: 1180, ey: 300, x2: 1240, title: 'red blood cell', sub: '≈ 7.5 µm · 50× our particle (dot not to scale)' }));
    const cp = withCard(t, 6.0);
    if (cp) logRuler(t - 6.4, { x: 540, y: 1000, w: 1060, min: 1e-8, max: 1e-3,
      ticks: [[1e-8, '10 nm'], [1e-7, '100 nm'], [1e-6, '1 µm'], [1e-5, '10 µm'], [1e-4, '100 µm'], [1e-3, '1 mm']],
      marks: [{ v: 1.5e-7, label: 'NP·01 · 150 nm', color: PAL.accent }, { v: 1e-6, label: 'bacterium · ~1 µm', row: 1 },
        { v: 7.5e-6, label: 'red cell · 7.5 µm' }, { v: 7e-5, label: 'hair · ~70 µm', row: 1 }] });
  },
};
const withCard = (t, t0) => card(t - t0, { x: 490, y: 902, w: 1180, h: 142, title: 'SIZE LADDER · LOG SCALE', fig: 'FIG. 1' }) > 0;

/* ---------- PLATE II · the corona: a slow push and turn while the protein coat builds ---------- */
const C2 = [960, 600], R2 = 200;
const camII = t => ({ x: C2[0], y: C2[1], s: curve(t, [[0, 1], [10.5, 1.12, 'inOutSine']]), rot: 0.05 * E.inOutSine(clamp(t / 10.5)), dx: 300 * E.in2(inv(8.8, 10, t)) });   // at the end the flow carries it off to the right, into the whip pan
const protII = (() => { const r = mulberry(202); return Array.from({ length: 72 }, (_, i) => ({ a: i * 2.39996 + r() * 0.2, ta: 0.9 + 7.8 * (i / 72) ** 1.15, d0: 330 + r() * 260, r: 9 + r() * 7, kind: Math.floor(r() * 3), seed: 400 + i })); })();
const edgeII = (a, extra, t) => camPoint(camII(t), [C2[0] + Math.cos(a) * (R2 + extra), C2[1] + Math.sin(a) * (R2 + extra)]);
const P2 = {
  dur: 10, dark: true, enter: { type: 'lensIn', dur: 1.6 },
  header: { num: 2, title: 'The Corona', sub: 'the blood dresses the particle in protein' },
  stage: { n: 2, name: 'CORONA', prevN: 1 },
  log: t => { const s = lerp(12, 300, E.inOut3(t / 10));
    return { title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', s < 60 ? `T+ ${s | 0} s` : `T+ ${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, '0')} s`], ['SITE', 'PLASMA'], ['DIAMETER', `${Math.round(lerp(150, 172, inv(1, 9, t)))} nm`]], states: STATES, state: 0 }; },
  cam: camII,
  hero: () => ({ x: C2[0], y: C2[1], label: 'NP·01', r: 270 }),
  bed: darkBed([110, 164.8, 196]),
  cues: [[0.12, 'pop'], [3.3, 'scratch', { chars: 34, cps: 40 }], [3.8, 'chime', { f: 523 }], [4.0, 'pop'], [5.3, 'pop'], [5.65, 'scratch', { chars: 20 }], ...Array.from({ length: 12 }, (_, i) => [1.0 + i * 0.62, 'plink'])],
  draw(t) {
    const r = mulberry(210);                                                  // a dense plasma of proteins drifting past
    for (let i = 0; i < 90; i++) { const x0 = r() * (W + 400) - 200, y0 = 160 + r() * 860, sp = 30 + r() * 20, [wx, wy] = wander(i, t, 16, 0.6, 3);
      const x = ((x0 + sp * t) % (W + 400)) - 200 + wx, y = y0 + wy;
      if ((x > 1250 && y > 470 && y < 690) || (x < 760 && y < 150)) continue;   // keep the stat and header readable
      if (Math.hypot(x - C2[0], y - C2[1]) > 330) protein(x, y, 5 + r() * 5, i % 3, 500 + i, 0.4 + 0.3 * r()); }
    for (let i = 0; i < 90; i++) { const a = i / 90 * TAU, L = 38 + 6 * Math.sin(t * 1.5 + i);
      const pts = [0, 0.33, 0.66, 1].map(u => { const d = R2 + u * L, w = 5 * Math.sin(u * 6 + t * 2 + i) * u; return [C2[0] + Math.cos(a) * d - Math.sin(a) * w, C2[1] + Math.sin(a) * d + Math.cos(a) * w]; });
      ink(pts, { w: 1.6, color: '#9296da', amp: 0, alpha: 0.75 }); }
    particle(C2[0], C2[1], R2, t, { drugs: 34 });
    for (const p of protII) {
      const u = E.out3(inv(p.ta - 1.3, p.ta, t)), d = lerp(p.d0, R2 + 18, u), al = clamp((t - (p.ta - 1.6)) * 3);
      if (al <= 0) continue;
      const jig = u >= 1 ? Math.sin(t * 3 + p.a * 5) * 1.5 : 0;
      protein(C2[0] + Math.cos(p.a) * (d + jig), C2[1] + Math.sin(p.a) * (d + jig), p.r, p.kind, p.seed, al);
    }
  },
  overlay(t) {
    withAlpha(beat(t, 1.8, 9.6), () => { const lt = t - 1.8;                  // backbone schematic, left
      text(typed('PLGA  ·  50 : 50', lt, 30), 250, 430, { kind: 'mono', size: 18, ls: 5, align: 'center', color: '#b9b9d6' });
      const beads = Array.from({ length: 6 }, (_, i) => [130 + i * 48, 520 + (i % 2 ? 18 : -18) + 3 * Math.sin(t * 1.4 + i)]);
      ink(beads, { w: 2, color: '#b9b9d6', amp: 0, draw: E.out3(clamp(lt / 0.9)) });
      beads.forEach(([x, y], i) => { const s = E.outBack(clamp((lt - i * 0.12) * 4)); if (s <= 0) return;
        ink(shape.circle(x, y, 15 * s, 24), { closed: true, w: 2, color: '#f0eef8', fill: [0, 1, 1, 0, 1, 0][i] ? PAL.pink : PAL.drug, amp: 0.3, seed: 70 + i });   // a random-ish copolymer, not strictly alternating
        if (i % 2 === 0) ink([[x, y - 15 * s], [x - 6, y - 32 * s]], { w: 2, color: '#f0eef8', amp: 0 });
        if (i < 5) { ctx.beginPath(); ctx.arc((x + beads[i + 1][0]) / 2, (y + beads[i + 1][1]) / 2, 3.5 * s, 0, TAU); ctx.fillStyle = PAL.accent; ctx.fill(); } });
      text(typed('lactide  ·  glycolide', lt - 1.0, 30), 250, 580, { kind: 'mono', size: 15, align: 'center', color: PAL.nightMuted });
      text(typed('schematic · ester bonds hold it together', lt - 1.4, 30), 250, 616, { kind: 'display', size: 22, italic: true, align: 'center', color: '#9d9dbd' }); });
    withAlpha(beat(t, 2.1, 7.2), () => stat(t - 2.1, { x: 1330, y: 580, kicker: 'PLASMA PROTEIN', value: u => '≈ ' + countUp(70, u, 1.2) + ' g per litre', note: 'a coat forms in under a minute', dark: true, size: 56 }));
    const [sx, sy] = edgeII(0.5, 22, t);
    withAlpha(beat(t, 3.8, 9.9), () => callout(t - 3.8, { ax: sx, ay: sy, ex: 1270, ey: 800, x2: 1330, title: 'protein corona', sub: 'the body now sees the coat, not the particle', dark: true }));
    const [px, py] = edgeII(2.5, 32, t);
    withAlpha(beat(t, 5.3, 9.95), () => callout(t - 5.3, { ax: px, ay: py, ex: 660, ey: 830, x2: 600, align: 'right', title: 'PEG brush (PEG–PLGA)', sub: 'slows tagging by immune proteins', dark: true }));
    const sb = E.out3(inv(0.8, 1.4, t));
    ink([[1627, 1000], [lerp(1627, 1760, sb), 1000]], { w: 2, color: PAL.nightInk, amp: 0 });
    if (sb >= 1) { ink([[1627, 992], [1627, 1008]], { w: 2, color: PAL.nightInk, amp: 0 }); ink([[1760, 992], [1760, 1008]], { w: 2, color: PAL.nightInk, amp: 0 });
      text(`${Math.round(50 / camII(t).s)} nm`, 1693, 985, { kind: 'mono', size: 15, align: 'center', color: PAL.nightInk }); }   // the scale bar follows the zoom
  },
};

/* ---------- PLATE III · leaky vessels: follow NP·01 out through a gap, then pull back to the whole diagram ---------- */
const PATH3 = [[700, 425], [1282, 425], [1282, 515], [1300, 600], [1330, 700], [1318, 760]];   // starts near where the corona left the frame
const npIII = t => curve(t, [[0, PATH3[0]], [3.4, PATH3[1], 'out2'], [4.4, PATH3[2], 'inOutSine'], [5.3, PATH3[3], 'inOutSine'], [6.3, PATH3[4], 'inOutSine'], [7.2, PATH3[5], 'inOutSine']]);   // enters already moving
const camIII = t => {
  if (t >= 8.2) return { x: PATH3[5][0], y: PATH3[5][1], s: 1 + 0.07 * E.inOutSine(inv(11.2, 12.8, t)), dx: 0, dy: 0 };   // wide, then a slow creep towards the lodged particle
  const fol = follow(npIII, t, { s: 1.3, lead: 200, lag: 0.3, anchor: [W * 0.5, H * 0.55] }), clampCam = c => ({ ...c, dx: clamp(c.dx, -W * 0.3 * c.s, W * 0.35), dy: clamp(c.dy, -140, 140) });
  return mixCam(clampCam(fol), FULL, E.inOutSine(inv(5.6, 8.2, t))); };
const tumorCells = (() => { const r = mulberry(303), out = [];
  for (let k = 0; k < 400 && out.length < 34; k++) { const x = lerp(1010, 1880, r()), y = lerp(585, 880, r()), rr = 34 + r() * 20;
    if (PATH3.slice(2).some(([px, py]) => Math.hypot(px - x, py - y) < rr + 14)) continue;
    if (out.some(c => Math.hypot(c.x - x, c.y - y) < (c.r + rr) * 0.82)) continue;
    out.push({ x, y, r: rr, seed: 600 + k }); } return out; })();
const P3 = {
  dur: 12.8, dark: false, enter: { type: 'pan', dir: 'right', dur: 1.2 },   // the flow carries us on: the sheets keep sliding right, the way the particle was going
  header: { num: 3, title: 'Leaky Vessels', sub: 'it slips out where the walls are broken' },
  stage: { n: 3, name: 'EXTRAVASATION', prevN: 2 },
  log: t => ({ title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', `T+ ${Math.round(lerp(6, 24, E.inOut3(t / 12.8)))} h`], ['SITE', t < 4.4 ? 'CAPILLARY' : 'TUMOUR'], ['DIAMETER', '172 nm']], states: STATES, state: t < 6.2 ? 0 : 1 }),
  cam: camIII,
  hero: t => { const [x, y] = npIII(t); return { x, y, label: 'NP·01', r: 34 + 8 * inv(11.2, 12.8, t) * (0.5 + 0.5 * Math.sin(t * 7)) }; },   // the reticle pulses before the dive
  bed: heart(0.14, [196, 246.9, 293.7]),
  cues: [[1.4, 'pop'], [1.75, 'scratch', { chars: 15 }], [2.1, 'chime', { f: 587 }], [4.4, 'plink'], [5.2, 'pop'], [5.55, 'scratch', { chars: 10 }], [7.2, 'chime', { f: 784 }], [8.3, 'scratch', { chars: 23, cps: 30 }]],
  draw(t) {
    const topW = shape.band(shape.ridge(-400, W + 400, 338, 3, 71), 360);
    flat(shape.rect(-400, 360, W + 800, 130), PAL.plasma);
    for (let i = 0; i < 12; i++) rbc(((i * 260 + 150 * t) % (W + 800)) - 400, 420 + 22 * Math.sin(i * 2.1), 24, i + t * 0.7, 700 + i);
    flat(topW, PAL.fleshDeep); hatch(topW, { color: PAL.bloodDeep, alpha: 0.4, gap: 5, len: 12, seed: 72 });
    ink(shape.ridge(-400, W + 400, 338, 3, 71), { w: 3, seed: 73 }); ink([[-400, 360], [W + 400, 360]], { w: 2.4, seed: 74 });
    flat(shape.rect(-400, 0, W + 800, 338), PAL.flesh, 0.35);                  // tissue above the capillary, for the close framing
    const cells = [];
    for (let x = -340; x < 960; x += 150) cells.push([x, 150]);
    for (let x = 980; x < W + 340; x += 158) cells.push([x, 130]);
    cells.forEach(([x, w], i) => { const body = shape.blob(x + w / 2, 510, 1, 800 + i, 0, 40).map(([a, b]) => [x + w / 2 + (a - x - w / 2) * w * 0.5, 510 + (b - 510) * 20]);
      ink(body, { closed: true, w: 2.4, fill: PAL.flesh, seed: 800 + i });
      ink(shape.ellipse(x + w / 2, 512, w * 0.18, 8, 0, 20), { closed: true, w: 1.6, fill: PAL.nucleus, seed: 820 + i }); });
    for (let k = 0; k < 7; k++) { const u = ((t * 0.09 + k / 7) % 1), gx = 1124 + 158 * (k % 4);
      const p = kf(u, [[0, [150, 400 + k * 6]], [0.55, [gx, 420]], [0.7, [gx, 520]], [1, [gx + 30 * Math.sin(k), 640 + k * 30]]], E.inOutSine);
      ctx.save(); ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, TAU); ctx.fillStyle = PAL.plga; ctx.globalAlpha *= clamp(u * 10) * clamp((1 - u) * 10) * (S.trans && S.trans.type === 'zoom' && S.side === 'new' ? inv(0.55, 0.8, S.trans.p) : 1); ctx.fill(); ctx.restore(); }
    for (let row = 0; row < 4; row++) for (let col = -2; col < 7; col++) {
      const x = 80 + col * 124 + (row % 2) * 40, y = 690 + row * 88;
      const b = shape.blob(x, y, 1, 900 + row * 10 + col, 0.1, 30).map(([a, c]) => [x + (a - x) * 54, y + (c - y) * 38]);
      ink(b, { closed: true, w: 2, fill: PAL.cellFill, seed: 900 + row * 10 + col });
      ink(shape.circle(x + 6, y, 11, 16), { closed: true, w: 1.6, fill: PAL.nucleus, seed: 950 + col });
    }
    for (const c of tumorCells) {
      const b = shape.blob(c.x, c.y + 2 * Math.sin(t * 0.8 + c.seed), c.r, c.seed, 0.28, 36);
      ink(b, { closed: true, w: 2.2, fill: PAL.tumor, seed: c.seed });
      hatch(b, { color: PAL.tumorDeep, alpha: 0.5, gap: 6, len: 8, angle: 0.8, seed: c.seed, w: 1.1 });
      ink(shape.blob(c.x + 4, c.y - 3, c.r * 0.42, c.seed + 1, 0.3, 20), { closed: true, w: 1.8, fill: '#4e3656', seed: c.seed + 1 });
    }
    ink([[960, 250], [960, 900]], { w: 1.6, color: PAL.peri, amp: 0, dash: [10, 8], alpha: E.out3(inv(0.3, 1, t)) });
    withAlpha(inv(7.2, 8.2, t), () => {                                         // side labels only once the wide view is back
      text(typed('HEALTHY', t - 7.2, 20), 930, 322, { kind: 'mono', size: 17, ls: 6, align: 'right', color: PAL.muted });
      text(typed('TUMOUR', t - 7.2, 20), 990, 322, { kind: 'mono', size: 17, ls: 6, color: PAL.muted }); });
    const lp = E.out3(inv(1.2, 2.2, t));
    if (lp > 0) { const tube = [[430, 918], [lerp(430, 920, lp), 918], [lerp(430, 920, lp), 958], [430, 958]];
      ink(tube, { closed: true, w: 2.4, fill: '#e7eef0', seed: 88 });
      for (let i = 0; i < 6; i++) { const x = 450 + ((i * 80 + t * 60) % 460); if (x < lerp(430, 900, lp)) arrowHead(x, 938, 0, 9, PAL.peri, 1.8); } }
    const [nx, ny] = npIII(t), zin = S.trans && S.trans.type === 'zoom' && S.side === 'new' ? inv(0.55, 0.8, S.trans.p) : 1;   // one particle on screen while the zoom hands over
    ctx.save(); ctx.globalAlpha *= zin; ctx.beginPath(); ctx.arc(nx, ny, 6.5, 0, TAU); ctx.fillStyle = PAL.plga; ctx.fill(); ctx.restore();
  },
  overlay(t) {
    const c = camIII(t), at = p => camPoint(c, p);
    withAlpha(beat(t, 1.4, 7.3), () => stat(t - 1.4, { x: 720, y: 196, kicker: 'GAPS IN MANY TUMOUR VESSELS', value: u => typed('≈ 380–780 nm', u, 16), note: 'pore cut-off in most tumours tested (mice)', size: 56 }));
    const [jx, jy] = at([760, 505]);                                           // a junction the particle passes while the label is up
    withAlpha(beat(t, 1.7, 6.7), () => callout(t - 1.7, { ax: jx, ay: jy, ex: 520, ey: 760, x2: 580, title: 'tight junctions', sub: 'healthy walls leave only tiny clefts' }));   // the label stays put; only its leader follows the camera
    const [gx, gy] = at([1282, 505]);
    withAlpha(beat(t, 5.2, 12.6), () => callout(t - 5.2, { ax: gx, ay: gy, ex: 1380, ey: 240, x2: 1430, title: 'EPR effect', sub: 'leaky walls, poor drainage · clearest in mice' }));
    withAlpha(beat(t, 8.3, 12.6), () => { const [lx, ly] = at([432, 1045]);   // once the wide view is back; below the cells
      text(typed('lymph drains fluid away', t - 8.3, 30), lx, ly, { kind: 'mono', size: 16, color: PAL.inkSoft });
      text(typed('no drainage: particles stay put', t - 8.6, 30), at([1000, 1045])[0], ly, { kind: 'display', size: 24, italic: true, color: PAL.inkSoft }); });
  },
};

/* ---------- PLATE IV · slow release: a slow push while the particle swells, pits and lets its drug go ---------- */
const C4 = [700, 600];
const rel = d => 22 * (1 - Math.exp(-d / 0.7)) + 66 * (1 - Math.exp(-d / 11));
const R4 = t => 220 - 38 * E.inOut3(inv(1, 12, t));
const camIV = t => ({ x: C4[0], y: C4[1], s: curve(t, [[0, 1.06], [12.5, 1.14, 'inOutSine']]), dx: 10 * Math.sin(t * 0.4) });
const drugsIV = (() => { const r = mulberry(404); return Array.from({ length: 46 }, (_, i) => ({ a: r() * TAU, d0: Math.sqrt(r()) * 150, tr: 0.8 + 10.5 * (i / 46) ** 1.7, v: 45 + r() * 30 })); })();
const P4 = {
  dur: 12, dark: true, enter: { type: 'lensIn', dur: 1.9 },   // longer than seam I → II, so it reads slower
  header: { num: 4, title: 'Slow Release', sub: 'water gets in, the drug gets out' },
  stage: { n: 4, name: 'RELEASE', prevN: 3 },
  log: t => { const day = lerp(0, 28, inv(2.4, 11.5, t));   // the same clock as the release chart
    return { title: 'JOURNEY LOG · NP·01', rows: [['DAY IN TUMOUR', `${Math.round(day)} of 28`], ['SITE', 'TUMOUR'], ['RELEASED', `${Math.round(rel(day))} %`]], states: STATES, state: 2 }; },
  cam: camIV,
  hero: t => ({ x: C4[0], y: C4[1], label: 'NP·01', r: R4(t) + 50 }),
  bed: (ac, out, t0, dur) => { darkBed([98, 146.8, 185])(ac, out, t0, dur); },
  cues: [[0.12, 'pop'], [2.1, 'pop'], [2.6, 'pop'], [2.95, 'scratch', { chars: 16 }], [6.6, 'pop'], [6.95, 'scratch', { chars: 17 }], [11.6, 'chime', { f: 440 }], ...drugsIV.slice(0, 16).map(d => [d.tr + 0.2, 'plink'])],   // 0.12: a hit as the lens opens
  draw(t) {
    const e = inv(1, 12, t), R = R4(t);
    const r = mulberry(410);
    for (let i = 0; i < 120; i++) { const a = r() * TAU, dIn = 60 + r() * 120, dOut = 330 + r() * 260, u = (t * 0.1 + r()) % 1;
      const d = lerp(dOut, dIn, E.inOutSine(u)), x = C4[0] + Math.cos(a) * d, y = C4[1] + Math.sin(a) * d, al = clamp(u * 6) * clamp((1 - u) * 4);
      ctx.save(); ctx.globalAlpha = al * 0.9; ctx.fillStyle = PAL.cyan; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = PAL.pink; ctx.beginPath(); ctx.arc(x - 4, y + 3, 2.2, 0, TAU); ctx.arc(x + 4, y + 3, 2.2, 0, TAU); ctx.fill(); ctx.restore(); }
    const leave = S.morph && S.trans ? 1 - inv(0, 0.2, S.trans.p) : 1;       // hands over to the end-card morph gradually
    const rm = mulberry(430);                                                   // tumour context: faint cell membranes and matrix fibres
    for (let i = 0; i < 7; i++) { const cx = 180 + rm() * 1560, cy = 150 + rm() * 800; if (Math.hypot(cx - C4[0], cy - C4[1]) < 380) continue;
      ink(shape.blob(cx + 10 * Math.sin(t * 0.3 + i), cy, 150 + rm() * 90, 440 + i, 0.3, 48), { closed: true, w: 1.6, color: '#5b5f9e', amp: 0.8, alpha: 0.35, seed: 440 + i }); }
    for (let i = 0; i < 10; i++) { const y0 = 120 + rm() * 860, a0 = rm() * 0.6 - 0.3;
      pen([[-20, y0], [W / 2, y0 + Math.tan(a0) * W / 2 + 18 * Math.sin(t * 0.4 + i)], [W + 20, y0 + Math.tan(a0) * W]], { w: 1.2, color: '#474b86', alpha: 0.35, amp: 1.2, seed: 460 + i }); }
    withAlpha(leave, () => particle(C4[0], C4[1], R, t, { irr: lerp(0.02, 0.13, e), drugs: 0, pits: Math.floor(lerp(0, 16, e)), seed: 45 }));
    for (let k = 0; k < 7; k++) { const a = hash3(k, 3) * TAU, g = E.out3(inv(1.5 + k * 1.1, 3 + k * 1.1, t)); if (g <= 0 || leave < 0.05) continue;
      const pts = [0, 0.3, 0.6, 1].map(u => [C4[0] + Math.cos(a + u * 0.3 * (k % 2 ? 1 : -1)) * R * lerp(0.98, 0.45, u), C4[1] + Math.sin(a + u * 0.3 * (k % 2 ? 1 : -1)) * R * lerp(0.98, 0.45, u)]);
      ink(pts, { w: 2, color: '#b8bbef', amp: 1.2, seed: 90 + k, draw: g, alpha: 0.9 }); }
    for (const d of drugsIV) {
      const u = t - d.tr, dist = u <= 0 ? d.d0 * (R / 220) : d.d0 + u * d.v * (1 + u * 0.15);
      const x = C4[0] + Math.cos(d.a) * dist + (u > 0 ? u * 12 : 0), y = C4[1] + Math.sin(d.a) * dist;
      const al = u <= 0 ? 0.85 : clamp((560 - dist) / 120);
      if (al > 0) hex(x, y, u > 0 ? 8 : 7, PAL.drug, al);
    }
    for (let k = 0; k < 10; k++) { const u = t - 3 - k * 0.8; if (u <= 0) continue; const a = hash3(k, 11) * TAU, d = R + u * 28;
      const x = C4[0] + Math.cos(a) * d, y = C4[1] + Math.sin(a) * d, al = clamp((6 - u) / 2);
      [0, 1, 2].slice(0, 2 + k % 2).forEach(j => { ctx.save(); ctx.globalAlpha = al; ctx.beginPath(); ctx.arc(x + j * 11 * Math.cos(a + 1.3), y + j * 11 * Math.sin(a + 1.3), 5, 0, TAU); ctx.fillStyle = j % 2 ? PAL.pink : PAL.drug; ctx.fill(); ctx.restore(); }); }
  },
  overlay(t) {
    const c = camIV(t), R = R4(t), at = a => camPoint(c, [C4[0] + Math.cos(a) * R, C4[1] + Math.sin(a) * R]);
    const [hx, hy] = at(-0.7);
    withAlpha(beat(t, 2.6, 7.6), () => callout(t - 2.6, { ax: hx, ay: hy, ex: 930, ey: 290, x2: 990, title: 'ester hydrolysis', sub: 'water splits the polyester backbone', dark: true }));
    const [dx, dy] = at(0.95);
    withAlpha(beat(t, 6.6, 11.9), () => callout(t - 6.6, { ax: dx, ay: dy, ex: 870, ey: 895, x2: 930, title: 'drug diffuses out', sub: 'slowly, over days to weeks', dark: true }));
    const cp = card(t - 2.1, { x: 1262, y: 380, w: 608, h: 560, dark: true, title: 'CUMULATIVE RELEASE', fig: 'FIG. 2' });
    if (cp > 0) {
      const draw = inv(2.4, 11.5, t), day = lerp(0, 28, draw);
      const pts = Array.from({ length: 113 }, (_, i) => [i / 4, rel(i / 4)]).filter(([d]) => d <= Math.max(day, 0.01));
      const g = lineChart(t - 2.4, { x: 1340, y: 470, w: 480, h: 340, xr: [0, 28], yr: [0, 100], xticks: [0, 7, 14, 21, 28], yticks: [0, 25, 50, 75, 100], xlab: 'DAYS', ylab: '% OF DRUG RELEASED', dark: true,
        series: [{ pts: pts.length > 1 ? pts : [[0, 0], [0.01, 0]], color: PAL.accent, draw: 1, w: 3.4 }] });
      const [ex, ey] = [g.X(day), g.Y(rel(day))];
      if (draw > 0) { ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ctx.fillStyle = PAL.nightInk; ctx.fill();
        text(`${Math.round(rel(day))}%`, ex + 12, ey - 12, { kind: 'mono', size: 16, weight: 600, color: PAL.nightInk }); }
      if (day > 2) text(typed('burst', (day - 2) / 3, 20), g.X(1.5), g.Y(30), { kind: 'display', size: 24, italic: true, color: PAL.gold });
      if (day > 13) text(typed('sustained', (day - 13) / 3, 20), g.X(15), g.Y(56), { kind: 'display', size: 24, italic: true, color: PAL.gold });
      text(typed('illustrative profile · shape depends on Mw, LA:GA, size', t - 3.6, 40), 1286, 918, { kind: 'mono', size: 13, color: PAL.nightMuted });
    }
  },
};

/* ---------- END CARD: the eroded particle becomes the card's emblem ---------- */
const P5 = {
  dur: 10.5, dark: true, counter: false,
  enter: { type: 'shape', dur: 1.6,
    from: (pl, t) => { const c = camIV(t), [x, y] = camPoint(c, C4); return shape.blob(x, y, R4(t) * c.s, 45, 0.13, 64); },
    to: () => shape.circle(960, 380, 44, 64), fromFill: PAL.plga, toFill: PAL.plga },
  focus: () => [960, 380],
  cam: t => ({ x: 960, y: 380, s: 1 + 0.05 * E.inOutSine(clamp(t / 10.5)), dx: 14 * Math.sin(t * 0.6), dy: 8 * Math.sin(t * 0.45), rot: 0.02 * Math.sin(t * 0.3) }),   // a slow drift; the text in overlay stays put
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur: dur - 0.5, notes: [130.8, 196, 246.9, 329.6], g: 0.02, dark: true }),
  cues: [[0.12, 'pop'], [1.2, 'chime', { f: 392 }], [2.0, 'scratch', { chars: 29, cps: 20 }], [3.5, 'chime', { f: 587 }]],   // 0.12: a hit as the morph begins
  draw(t) {
    const [cx, cy] = [960, 380], a = E.out3(inv(0.3, 1.4, t));
    const dust = mulberry(1300);                                              // drifting motes behind everything
    for (let i = 0; i < 70; i++) { const x0 = dust() * (W + 200) - 100, y0 = dust() * H, sp = 20 + dust() * 30, [wx, wy] = wander(i, t, 10, 0.5, 13);
      ctx.beginPath(); ctx.arc(((x0 + sp * t) % (W + 200)) - 100 + wx, y0 + wy, 1.2 + dust() * 1.8, 0, TAU); ctx.fillStyle = 'rgba(160,165,230,0.45)'; ctx.fill(); }
    for (let k = 0; k < 5; k++) { const q = ((t * 0.3 + k / 5) % 1); ink(shape.circle(cx, cy, 90 + q * 320, 72), { closed: true, w: 1.4, color: PAL.peri, amp: 0.3, seed: k, alpha: 0.55 * (1 - q) * a }); }   // ripples keep spreading
    ink([[cx - 260 * a, cy], [cx + 260 * a, cy]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.3 });
    ink([[cx, cy - 170 * a], [cx, cy + 170 * a]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.3 });
    ink(shape.circle(cx, cy, 86), { closed: true, w: 2.4, color: PAL.nightInk, amp: 0.6, draw: E.out3(inv(0.4, 1.2, t)) });
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.3); ctx.translate(-cx, -cy);    // the tick ring turns
    for (let i = 0; i < 48; i++) { const q = inv(0.6 + i * 0.012, 0.8 + i * 0.012, t); if (!q) continue; const an = i / 48 * TAU - Math.PI / 2;
      ink([[cx + Math.cos(an) * 98, cy + Math.sin(an) * 98], [cx + Math.cos(an) * (i % 4 ? 106 : 114), cy + Math.sin(an) * (i % 4 ? 106 : 114)]], { w: 1.4, color: i % 12 ? PAL.peri : PAL.accent, amp: 0, alpha: q }); }
    ctx.restore();
    for (let i = 0; i < 14; i++) { const an = i / 14 * TAU + t * (i % 2 ? 0.5 : -0.35), rr = i % 2 ? 150 : 190, [wx, wy] = wander(i, t, 8, 0.9); hex(cx + Math.cos(an) * rr + wx, cy + Math.sin(an) * rr * 0.7 + wy, 7, PAL.drug, 0.8 * a); }   // drug molecules orbit both ways
    const arrive = S.morph && S.trans ? inv(0.8, 1, S.trans.p) : 1;          // fades in as the morph outline fades out
    withAlpha(arrive, () => particle(cx, cy, 44 * (1 + 0.04 * Math.sin(t * 1.6)), t, { drugs: 10, detail: 1 }));   // it breathes
    reticle(cx, cy, t, { r: 62, dark: true, tag: false, alpha: inv(1.4, 2, t) });
  },
  overlay(t) {
    const cx = 960, q = 'Every dose is a slow journey.', qo = { kind: 'display', size: 60, italic: true, color: PAL.nightInk, cps: 20 };
    dropText(q, cx - measure(q, qo) / 2, 610, t - 2.0, qo);
    const rl = E.out3(inv(3.3, 4.1, t)); if (rl > 0) ink([[cx - 320 * rl, 650], [cx + 320 * rl, 650]], { w: 1.2, color: PAL.peri, amp: 0, alpha: 0.7 });
    const col = `THE LONG RELEASE  ·  4 PLATES  ·  ${fmt(TOTAL_F)} FRAMES  ·  DRAWN IN CODE`, co = { kind: 'mono', size: 20, ls: 6, color: '#9fa0c8' };
    text(typed(col, t - 3.0, 60), cx - measure(col, co) / 2, 700, co);
    const src = 'NOTES  ·  VALUES ARE ROUNDED AND ILLUSTRATIVE  ·  EPR IS VARIABLE IN PATIENTS  ·  NOT A SPECIFIC FORMULATION', so = { kind: 'mono', size: 15, ls: 5, color: PAL.nightMuted };
    text(typed(src, t - 3.4, 60), cx - measure(src, so) / 2, 930, so);
    const refs = ['SOURCES  ·  PROTEIN CORONA: TENZER ET AL., NAT. NANOTECHNOL. 2013  ·  TUMOUR PORES: HOBBS ET AL., PNAS 1998',
      'TUMOUR DELIVERY: WILHELM ET AL., NAT. REV. MATER. 2016  ·  PLASMA PROTEIN: CLINICAL REFERENCE RANGE'], ro = { kind: 'mono', size: 14, ls: 3, color: PAL.nightMuted };
    refs.forEach((l, k) => text(typed(l, t - 4.2 - k * 0.5, 70), cx - measure(l, ro) / 2, 966 + k * 26, ro));
  },
};

defineStory({ title: 'The Long Release', stages: 4, plates: [P0, P1, P2, P3, P4, P5] });
boot();
