/* =====================  STORY: The Long Release  ===================== */
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

/* ---------- PLATE 0 · title card ---------- */
const TIP = [780, 262];
const P0 = {
  dur: 6.5, dark: false,
  focus: () => [TIP[0], 792],
  cues: [[0.25, 'noise', { dur: 1.6, g: 0.07, f0: 400, f1: 1800, q: 0.8 }], [2.55, 'plink'], [2.6, 'chime', { f: 523 }], [4.9, 'tick']],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [261.6, 329.6, 392], g: 0.016 }),
  draw(t) {
    const fl = E.out3(inv(0, 0.9, t)), c = { w: 1.2, color: PAL.peri, amp: 0, alpha: 0.55 };
    ink([[34, 34], [lerp(34, W - 34, fl), 34]], c); ink([[W - 34, 34], [W - 34, lerp(34, H - 34, fl)]], c); ink([[34, 34], [34, lerp(34, H - 34, fl)]], c);
    fluid(t, 800, lerp(-300, W + 400, E.inOut3(inv(0.25, 1.6, t))), PAL.blood, PAL.bloodDeep, 3);
    // syringe (local frame: needle tip at origin, pointing +x)
    ctx.save(); ctx.translate(TIP[0], TIP[1]); ctx.rotate(0.42);
    const d = E.out3(inv(0.05, 0.9, t));
    const barrel = shape.rect(-640, -36, 440, 72);
    if (d >= 1) { flat(shape.rect(-560, -30, 358, 60), PAL.sus, 0.9); hatch(shape.rect(-560, -30, 358, 60), { color: PAL.peri, alpha: 0.4, gap: 6, len: 8, angle: 0.7, seed: 8 }); }
    ink(barrel, { closed: true, w: 3, amp: 1, seed: 11, draw: d });
    ink([[-200, -14], [-176, -8], [-176, 8], [-200, 14]], { w: 3, seed: 12, draw: d });
    ink([[-176, 0], [0, 0]], { w: 2.4, seed: 13, draw: d });
    ink(shape.rect(-900, -10, 340, 20), { closed: true, w: 3, fill: PAL.panel, seed: 14, draw: d });
    ink(shape.rect(-580, -30, 20, 60), { closed: true, w: 3, fill: PAL.ink, seed: 15, draw: d });
    for (let i = 0; i < 9; i++) ink([[-560 + i * 40, -36], [-560 + i * 40, i % 2 ? -24 : -16]], { w: 1.6, amp: 0.2, draw: inv(0.5 + i * 0.04, 0.8 + i * 0.04, t) });
    ctx.restore();
    // drop forms, falls, lands
    const form = E.out3(inv(1.0, 1.9, t)), fall = inv(2.05, 2.55, t);
    if (form > 0 && fall < 1) {
      const r = 12 * form, y = TIP[1] + r + 2 + fall * fall * (800 - TIP[1] - 14);
      ink([[TIP[0] - r * 0.5, y - r * 0.7], [TIP[0], y - r * 1.9], [TIP[0] + r * 0.5, y - r * 0.7]], { w: 2.2, amp: 0.2, fill: PAL.sus, closed: true, alpha: fall > 0 ? 0 : 1 });
      ink(shape.circle(TIP[0], y, r, 24), { closed: true, w: 2.4, fill: PAL.sus, amp: 0.3 });
    }
    const rl = E.out3(inv(1.4, 2.3, t));
    if (rl > 0) {
      const x = TIP[0] - 70; ink([[x, 330], [x, lerp(330, 780, rl)]], { w: 1.4, color: PAL.peri, amp: 0 });
      for (let y = 330; y <= lerp(330, 780, rl); y += 22) ink([[x - (y % 110 ? 7 : 13), y], [x, y]], { w: 1.2, color: PAL.peri, amp: 0 });
      text(typed('Ø 150 nm', t - 2.0, 20), x - 26, 500, { kind: 'mono', size: 18, align: 'right', color: PAL.peri });
      ink([[x - 60, 470], [x - 60, 470 + 80 * rl]], { w: 1.6, color: PAL.peri, amp: 0, alpha: 0 });
    }
    if (t > 2.55) {
      const u = t - 2.55;
      for (let k = 0; k < 3; k++) { const q = clamp(u * 0.9 - k * 0.25); if (q > 0 && q < 1) ink(shape.ellipse(TIP[0], 804, 20 + q * 120, 5 + q * 22, 0, 40), { closed: true, w: 2, color: '#f3d2c4', amp: 0.4, alpha: 1 - q }); }
      reticle(TIP[0], 792, t, { label: 'NP·01', r: 36, alpha: E.out3(clamp(u * 3)) });
    }
    // title block
    text(typed('A FIELD STUDY IN 4 PLATES', t - 0.5, 34), 922, 392, { kind: 'mono', size: 21, ls: 9, color: PAL.inkSoft });
    dropText('The Long Release', 914, 508, t - 0.95, { kind: 'display', size: 112, weight: 500, cps: 13 });
    const ul = E.out3(inv(2.0, 2.8, t));
    if (ul > 0) { ink([[918, 548], [lerp(918, 1800, ul), 548]], { w: 1.6, color: PAL.peri, amp: 0 });
      for (let x = 918; x <= lerp(918, 1800, ul); x += 40) ink([[x, 548], [x, x % 200 === 118 ? 557 : 553]], { w: 1.2, color: PAL.peri, amp: 0 }); }
    text(typed('the journey of one nanoparticle', t - 2.5, 26), 918, 618, { kind: 'display', size: 46, italic: true, color: PAL.inkSoft });
  },
};

/* ---------- PLATE I · into the blood ---------- */
const LUMEN = [470, 850];
const cellsI = (() => { const r = mulberry(101); return Array.from({ length: 30 }, (_, i) => ({ x0: r() * (W + 300), y: lerp(505, 815, r()), r: 30 + r() * 8, a0: r() * TAU, spin: 0.4 + r() * 0.9, seed: 200 + i })); })();
const P1 = {
  dur: 10, dark: false, enter: { type: 'cut' },
  header: { num: 1, title: 'Into the Blood', sub: 'carried along at the pace of the heart' },
  stage: { n: 1, name: 'CIRCULATION', prevN: 0 },
  log: t => ({ title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', `T+ ${Math.floor(lerp(0, 9, t / 10))} s`], ['SITE', t < 5 ? 'VEIN' : 'RIGHT HEART'], ['DIAMETER', '150 nm']], states: STATES, state: 0 }),
  focus: t => [lerp(300, 1150, E.inOutSine(clamp(t / 11))), 690 + 28 * Math.sin(t * 1.3)],
  bed: heart(0.24, [220, 277.2, 329.6]),
  cues: [[3.0, 'chime', { f: 660 }], [4.2, 'pop'], [6.0, 'pop'], [6.9, 'plink'], [7.25, 'plink'], [7.6, 'plink'], [7.95, 'plink']],
  draw(t) {
    const v = y => 110 + 260 * (1 - ((y - 660) / 200) ** 2);
    const tissue = shape.band(shape.ridge(-20, W + 20, 392, 8, 5), H + 20);
    flat(tissue, PAL.flesh, 0.55);
    hatch(tissue, { color: PAL.fleshDeep, alpha: 0.35, gap: 12, len: 9, angle: 0.9, seed: 6, keep: 0.45 });
    const lumen = shape.rect(-20, LUMEN[0], W + 40, LUMEN[1] - LUMEN[0]);
    flat(lumen, PAL.plasma);
    hatch(lumen, { color: '#caa577', alpha: 0.35, angle: 0.03, gap: 10, len: 14, seed: 57, keep: (x, y) => 0.1 + 0.6 * (Math.abs(y - 660) / 190) ** 2 });
    const r = mulberry(55); ctx.save(); ctx.strokeStyle = PAL.plasmaLine; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 70; i++) { const y = lerp(485, 835, r()), L = 30 + r() * 70, x = ((r() * (W + 300) + v(y) * 1.2 * t) % (W + 300)) - 150; ctx.moveTo(x, y); ctx.lineTo(x + L, y); }
    ctx.stroke(); ctx.restore();
    for (const c of cellsI) { const x = ((c.x0 + v(c.y) * t) % (W + 300)) - 150; rbc(x, c.y, c.r, c.a0 + t * c.spin, c.seed); }
    const fx = lerp(640, 1000, t / 10), fy = 560;
    rbc(fx, fy, 42, 0.25 + 0.15 * Math.sin(t), 999);
    for (let k = 0; k < 2; k++) { const x = ((300 + k * 900 + 90 * t) % (W + 300)) - 150, y = 760 - k * 180;
      ink(shape.blob(x, y, 50, 300 + k, 0.12), { closed: true, w: 2.4, fill: '#d6c8e2', seed: 300 + k });
      ink(shape.blob(x - 8, y + 4, 24, 310 + k, 0.5), { closed: true, w: 1.8, fill: '#7a5a96', seed: 310 + k }); }
    const [nx, ny] = P1.focus(t);
    ctx.beginPath(); ctx.arc(nx, ny, 6, 0, TAU); ctx.fillStyle = PAL.plga; ctx.fill();
    reticle(nx, ny, t, { label: 'NP·01', r: 36 });
    for (const [y0, y1, s] of [[420, 470, 1], [850, 900, 2]]) {
      const top = shape.ridge(-20, W + 20, y0, 5, 20 + s), bot = shape.ridge(-20, W + 20, y1, 5, 30 + s);
      const wall = [...top, ...bot.slice().reverse()];
      flat(wall, PAL.fleshDeep); hatch(wall, { color: PAL.bloodDeep, alpha: 0.45, gap: 6, len: 14, angle: 0.15, seed: 40 + s });
      ink(top, { w: 3, seed: 50 + s }); ink(bot, { w: 3, seed: 60 + s });
    }
    stat(t - 1.2, { x: 610, y: 335, kicker: 'ONE MG OF 150 NM PLGA SPHERES', value: u => '≈ ' + countUp(430, u, 1.5) + ' billion', note: 'solid spheres, density ≈ 1.3 g/cm³' });
    callout(t - 4.2, { ax: fx + 20, ay: fy - 30, ex: 1110, ey: 300, x2: 1170, title: 'red blood cell', sub: '≈ 7.5 µm across · 50× our particle' });
    const cp = card(t - 6.0, { x: 490, y: 902, w: 1300, h: 142, title: 'SIZE LADDER · LOG SCALE', fig: 'FIG. 1' });
    if (cp > 0) logRuler(t - 6.4, { x: 540, y: 1000, w: 1180, min: 1e-8, max: 1e-3,
      ticks: [[1e-8, '10 nm'], [1e-7, '100 nm'], [1e-6, '1 µm'], [1e-5, '10 µm'], [1e-4, '100 µm'], [1e-3, '1 mm']],
      marks: [{ v: 1.5e-7, label: 'NP·01 · 150 nm', color: PAL.accent }, { v: 1e-6, label: 'bacterium · ~1 µm', row: 1 },
        { v: 7.5e-6, label: 'red cell · 7.5 µm' }, { v: 7e-5, label: 'hair · ~70 µm', row: 1 }] });
  },
};

/* ---------- PLATE II · the corona ---------- */
const C2 = [960, 600], R2 = 200;
const protII = (() => { const r = mulberry(202); return Array.from({ length: 72 }, (_, i) => ({ a: i * 2.39996 + r() * 0.2, ta: 0.9 + 7.8 * (i / 72) ** 1.15, d0: 330 + r() * 260, r: 9 + r() * 7, kind: Math.floor(r() * 3), seed: 400 + i })); })();
const P2 = {
  dur: 10, dark: true, enter: { type: 'lensIn', dur: 0.55 },
  header: { num: 2, title: 'The Corona', sub: 'the blood dresses the particle in protein' },
  stage: { n: 2, name: 'CORONA' },
  log: t => { const s = lerp(12, 300, E.inOut3(t / 10));
    return { title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', s < 60 ? `T+ ${s | 0} s` : `T+ ${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, '0')} s`], ['SITE', 'PLASMA'], ['DIAMETER', `${Math.round(lerp(150, 172, inv(1, 9, t)))} nm`]], states: STATES, state: 0 }; },
  focus: () => C2,
  bed: darkBed([110, 164.8, 196]),
  cues: [[3.1, 'chime', { f: 523 }], [4.0, 'pop'], [6.2, 'pop'], ...Array.from({ length: 12 }, (_, i) => [1.0 + i * 0.62, 'plink'])],
  draw(t) {
    const r = mulberry(210);
    for (let i = 0; i < 34; i++) { const x = r() * W + 30 * Math.sin(t * 0.3 + i), y = 260 + r() * 760 + 20 * Math.cos(t * 0.25 + i);
      if (Math.hypot(x - C2[0], y - C2[1]) > 330) protein(x, y, 6 + r() * 5, i % 3, 500 + i, 0.55); }
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
    reticle(C2[0], C2[1], t, { label: 'NP·01', r: 270, dark: true });
    // left: backbone schematic
    const lt = t - 0.6;
    if (lt > 0) {
      text(typed('PLGA  ·  50 : 50', lt, 30), 250, 430, { kind: 'mono', size: 18, ls: 5, align: 'center', color: '#b9b9d6' });
      const beads = Array.from({ length: 6 }, (_, i) => [130 + i * 48, 520 + (i % 2 ? 18 : -18)]);
      ink(beads, { w: 2, color: '#b9b9d6', amp: 0, draw: E.out3(clamp(lt / 0.9)) });
      beads.forEach(([x, y], i) => { const s = E.outBack(clamp((lt - i * 0.12) * 4)); if (s <= 0) return;
        ink(shape.circle(x, y, 15 * s, 24), { closed: true, w: 2, color: '#f0eef8', fill: i % 2 ? PAL.pink : PAL.drug, amp: 0.3, seed: 70 + i });
        if (i % 2 === 0) ink([[x, y - 15 * s], [x - 6, y - 32 * s]], { w: 2, color: '#f0eef8', amp: 0 });
        if (i < 5) { ctx.beginPath(); ctx.arc((x + beads[i + 1][0]) / 2, (y + beads[i + 1][1]) / 2, 3.5 * s, 0, TAU); ctx.fillStyle = PAL.accent; ctx.fill(); } });
      text(typed('lactide  ·  glycolide', lt - 1.0, 30), 250, 580, { kind: 'mono', size: 15, align: 'center', color: PAL.nightMuted });
      text(typed('ester bonds hold it together', lt - 1.4, 30), 250, 616, { kind: 'display', size: 22, italic: true, align: 'center', color: '#9d9dbd' });
    }
    stat(t - 1.6, { x: 1330, y: 580, kicker: 'PLASMA PROTEIN', value: u => '≈ ' + countUp(70, u, 1.2) + ' g per litre', note: 'enough to coat a particle within minutes', dark: true, size: 56 });
    const sa = 0.5, sx = C2[0] + Math.cos(sa) * 222, sy = C2[1] + Math.sin(sa) * 222;
    callout(t - 4.0, { ax: sx, ay: sy, ex: 1270, ey: 790, x2: 1330, title: 'protein corona', sub: 'the body now sees the coat, not the particle', dark: true });
    const pa = 2.5, px = C2[0] + Math.cos(pa) * 232, py = C2[1] + Math.sin(pa) * 232;
    callout(t - 6.2, { ax: px, ay: py, ex: 660, ey: 830, x2: 600, align: 'right', title: 'PEG brush', sub: 'slows the tagging by immune proteins', dark: true });
    const sb = E.out3(inv(0.8, 1.4, t));
    ink([[1627, 1000], [lerp(1627, 1760, sb), 1000]], { w: 2, color: PAL.nightInk, amp: 0 });
    if (sb >= 1) { ink([[1627, 992], [1627, 1008]], { w: 2, color: PAL.nightInk, amp: 0 }); ink([[1760, 992], [1760, 1008]], { w: 2, color: PAL.nightInk, amp: 0 });
      text('50 nm', 1693, 985, { kind: 'mono', size: 15, align: 'center', color: PAL.nightInk }); }
  },
};

/* ---------- PLATE III · leaky vessels ---------- */
const PATH3 = [[200, 425], [1282, 425], [1282, 515], [1300, 600], [1330, 700], [1318, 760]];
const tumorCells = (() => { const r = mulberry(303), out = [];
  for (let k = 0; k < 400 && out.length < 34; k++) { const x = lerp(1010, 1880, r()), y = lerp(585, 880, r()), rr = 34 + r() * 20;
    if (PATH3.slice(2).some(([px, py]) => Math.hypot(px - x, py - y) < rr + 14)) continue;
    if (out.some(c => Math.hypot(c.x - x, c.y - y) < (c.r + rr) * 0.82)) continue;
    out.push({ x, y, r: rr, seed: 600 + k }); } return out; })();
const P3 = {
  dur: 10, dark: false, enter: { type: 'lensOut', dur: 0.6 },
  header: { num: 3, title: 'Leaky Vessels', sub: 'it slips out where the walls are broken' },
  stage: { n: 3, name: 'EXTRAVASATION' },
  log: t => ({ title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', `T+ ${Math.round(lerp(6, 24, E.inOut3(t / 10)))} h`], ['SITE', t < 4.4 ? 'CAPILLARY' : 'TUMOUR'], ['DIAMETER', '172 nm']], states: STATES, state: t < 6.2 ? 0 : 1 }),
  focus: t => kf(t, [[0, PATH3[0]], [3.4, PATH3[1]], [4.4, PATH3[2]], [5.3, PATH3[3]], [6.3, PATH3[4]], [7.2, PATH3[5]]], E.inOutSine),
  bed: heart(0.14, [196, 246.9, 293.7]),
  cues: [[1.8, 'pop'], [2.4, 'chime', { f: 587 }], [4.4, 'plink'], [5.2, 'pop'], [7.2, 'chime', { f: 784 }]],
  draw(t) {
    // capillary
    const topW = shape.band(shape.ridge(-20, W + 20, 338, 3, 71), 360);
    flat(shape.rect(-20, 360, W + 40, 130), PAL.plasma);
    for (let i = 0; i < 9; i++) rbc(((i * 260 + 150 * t) % (W + 300)) - 150, 420 + 22 * Math.sin(i * 2.1), 24, i + t * 0.7, 700 + i);
    flat(topW, PAL.fleshDeep); hatch(topW, { color: PAL.bloodDeep, alpha: 0.4, gap: 5, len: 12, seed: 72 });
    ink(shape.ridge(-20, W + 20, 338, 3, 71), { w: 3, seed: 73 }); ink([[-20, 360], [W + 20, 360]], { w: 2.4, seed: 74 });
    // endothelium: tight on the left, gapped on the right
    const cells = [];
    for (let x = -40; x < 960; x += 150) cells.push([x, 150]);
    for (let x = 980; x < W + 40; x += 158) cells.push([x, 130]);
    cells.forEach(([x, w], i) => { const body = shape.blob(x + w / 2, 510, 1, 800 + i, 0, 40).map(([a, b], j) => [x + w / 2 + (a - x - w / 2) * w * 0.5, 510 + (b - 510) * 20]);
      ink(body, { closed: true, w: 2.4, fill: PAL.flesh, seed: 800 + i });
      ink(shape.ellipse(x + w / 2, 512, w * 0.18, 8, 0, 20), { closed: true, w: 1.6, fill: PAL.nucleus, seed: 820 + i }); });
    // extra particles taking the same exit
    for (let k = 0; k < 7; k++) { const u = ((t * 0.09 + k / 7) % 1), gx = 1124 + 158 * (k % 4);
      const p = kf(u, [[0, [150, 400 + k * 6]], [0.55, [gx, 420]], [0.7, [gx, 520]], [1, [gx + 30 * Math.sin(k), 640 + k * 30]]], E.inOutSine);
      ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, TAU); ctx.fillStyle = PAL.plga; ctx.globalAlpha = clamp(u * 10) * clamp((1 - u) * 10); ctx.fill(); ctx.globalAlpha = 1; }
    // tissues
    for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
      const x = 80 + col * 124 + (row % 2) * 40, y = 690 + row * 88;
      const b = shape.blob(x, y, 1, 900 + row * 10 + col, 0.1, 30).map(([a, c]) => [x + (a - x) * 54, y + (c - y) * 38]);
      ink(b, { closed: true, w: 2, fill: PAL.cellFill, seed: 900 + row * 10 + col });
      ink(shape.circle(x + 6, y, 11, 16), { closed: true, w: 1.6, fill: PAL.nucleus, seed: 950 + col });
    }
    for (const c of tumorCells) {
      const b = shape.blob(c.x, c.y, c.r, c.seed, 0.28, 36);
      ink(b, { closed: true, w: 2.2, fill: PAL.tumor, seed: c.seed });
      hatch(b, { color: PAL.tumorDeep, alpha: 0.5, gap: 6, len: 8, angle: 0.8, seed: c.seed, w: 1.1 });
      ink(shape.blob(c.x + 4, c.y - 3, c.r * 0.42, c.seed + 1, 0.3, 20), { closed: true, w: 1.8, fill: '#4e3656', seed: c.seed + 1 });
    }
    ink([[960, 250], [960, 900]], { w: 1.6, color: PAL.peri, amp: 0, dash: [10, 8], alpha: E.out3(inv(0.3, 1, t)) });
    text(typed('HEALTHY', t - 0.8, 20), 930, 322, { kind: 'mono', size: 17, ls: 6, align: 'right', color: PAL.muted });
    text(typed('TUMOUR', t - 0.8, 20), 990, 322, { kind: 'mono', size: 17, ls: 6, color: PAL.muted });
    // lymph on the healthy side only
    const lp = E.out3(inv(1.2, 2.2, t));
    if (lp > 0) { const tube = [[430, 918], [lerp(430, 920, lp), 918], [lerp(430, 920, lp), 958], [430, 958]];
      ink(tube, { closed: true, w: 2.4, fill: '#e7eef0', seed: 88 });
      for (let i = 0; i < 6; i++) { const x = 450 + ((i * 80 + t * 60) % 460); if (x < lerp(430, 900, lp)) arrowHead(x, 938, 0, 9, PAL.peri, 1.8); }
      text(typed('lymph drains fluid away', t - 2.2, 30), 432, 1000, { kind: 'mono', size: 16, color: PAL.inkSoft });
      text(typed('no drainage: particles stay put', t - 2.8, 30), 1000, 1000, { kind: 'display', size: 24, italic: true, color: PAL.inkSoft }); }
    const [nx, ny] = P3.focus(t);
    ctx.beginPath(); ctx.arc(nx, ny, 6.5, 0, TAU); ctx.fillStyle = PAL.plga; ctx.fill();
    reticle(nx, ny, t, { label: 'NP·01', r: 34 });
    stat(t - 1.0, { x: 720, y: 196, kicker: 'GAPS IN MANY TUMOUR VESSELS', value: u => typed('200–800 nm', u, 16), note: '', size: 56 });
    callout(t - 1.8, { ax: 560, ay: 527, ex: 600, ey: 600, x2: 650, title: 'tight junctions', sub: 'healthy walls leave only tiny clefts' });
    callout(t - 5.2, { ax: 1282, ay: 505, ex: 1420, ey: 262, x2: 1470, title: 'EPR effect', sub: 'leaky walls, poor drainage' });
  },
};

/* ---------- PLATE IV · slow release ---------- */
const C4 = [700, 600];
const rel = d => 22 * (1 - Math.exp(-d / 0.7)) + 66 * (1 - Math.exp(-d / 11));
const drugsIV = (() => { const r = mulberry(404); return Array.from({ length: 46 }, (_, i) => ({ a: r() * TAU, d0: Math.sqrt(r()) * 150, tr: 0.8 + 10.5 * (i / 46) ** 1.7, v: 45 + r() * 30 })); })();
const P4 = {
  dur: 12, dark: true, enter: { type: 'lensIn', dur: 0.55 },
  header: { num: 4, title: 'Slow Release', sub: 'water gets in, the drug gets out' },
  stage: { n: 4, name: 'RELEASE' },
  log: t => { const day = lerp(1, 28, inv(1.0, 11.5, t));
    return { title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', `T+ ${Math.round(day)} days`], ['SITE', 'TUMOUR'], ['RELEASED', `${Math.round(rel(day))} %`]], states: STATES, state: 2 }; },
  focus: () => C4,
  bed: (ac, out, t0, dur) => { darkBed([98, 146.8, 185])(ac, out, t0, dur); },
  cues: [[2.6, 'pop'], [6.4, 'pop'], [11.6, 'chime', { f: 440 }], ...drugsIV.slice(0, 16).map(d => [d.tr + 0.2, 'plink'])],
  draw(t) {
    const e = inv(1, 12, t), R = 220 - 38 * E.inOut3(e);
    const r = mulberry(410);
    for (let i = 0; i < 80; i++) { const a = r() * TAU, dIn = 60 + r() * 120, dOut = 330 + r() * 150, u = (t * 0.1 + r()) % 1;
      const d = lerp(dOut, dIn, E.inOutSine(u)), x = C4[0] + Math.cos(a) * d, y = C4[1] + Math.sin(a) * d, al = clamp(u * 6) * clamp((1 - u) * 4);
      ctx.save(); ctx.globalAlpha = al * 0.9; ctx.fillStyle = PAL.cyan; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = PAL.pink; ctx.beginPath(); ctx.arc(x - 4, y + 3, 2.2, 0, TAU); ctx.arc(x + 4, y + 3, 2.2, 0, TAU); ctx.fill(); ctx.restore(); }
    particle(C4[0], C4[1], R, t, { irr: lerp(0.02, 0.13, e), drugs: 0, pits: Math.floor(lerp(0, 16, e)), seed: 45 });
    for (let k = 0; k < 7; k++) { const a = hash3(k, 3) * TAU, g = E.out3(inv(1.5 + k * 1.1, 3 + k * 1.1, t)); if (g <= 0) continue;
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
    reticle(C4[0], C4[1], t, { label: 'NP·01', r: R + 50, dark: true });
    const ca = -0.7;
    callout(t - 2.6, { ax: C4[0] + Math.cos(ca) * R, ay: C4[1] + Math.sin(ca) * R, ex: 930, ey: 290, x2: 990, title: 'ester hydrolysis', sub: 'water splits the polyester backbone', dark: true });
    const da = 0.95;
    callout(t - 6.4, { ax: C4[0] + Math.cos(da) * R, ay: C4[1] + Math.sin(da) * R, ex: 870, ey: 895, x2: 930, title: 'drug diffuses out', sub: 'slowly, over days to weeks', dark: true });
    const cp = card(t - 0.9, { x: 1262, y: 380, w: 608, h: 560, dark: true, title: 'CUMULATIVE RELEASE', fig: 'FIG. 2' });
    if (cp > 0) {
      const draw = inv(1.0, 11.5, t), day = lerp(0, 28, draw);
      const pts = Array.from({ length: 113 }, (_, i) => [i / 4, rel(i / 4)]).filter(([d]) => d <= Math.max(day, 0.01));
      const g = lineChart(t - 1.3, { x: 1340, y: 470, w: 480, h: 340, xr: [0, 28], yr: [0, 100], xticks: [0, 7, 14, 21, 28], yticks: [0, 25, 50, 75, 100], xlab: 'DAYS', ylab: '% OF DRUG RELEASED', dark: true,
        series: [{ pts: pts.length > 1 ? pts : [[0, 0], [0.01, 0]], color: PAL.accent, draw: 1, w: 3.4 }] });
      const [ex, ey] = [g.X(day), g.Y(rel(day))];
      if (draw > 0) { ctx.beginPath(); ctx.arc(ex, ey, 7, 0, TAU); ctx.fillStyle = PAL.nightInk; ctx.fill();
        text(`${Math.round(rel(day))}%`, ex + 12, ey - 12, { kind: 'mono', size: 16, weight: 600, color: PAL.nightInk }); }
      if (day > 2) text(typed('burst', (day - 2) / 3, 20), g.X(1.5), g.Y(30), { kind: 'display', size: 24, italic: true, color: PAL.gold });
      if (day > 13) text(typed('sustained', (day - 13) / 3, 20), g.X(12), g.Y(72), { kind: 'display', size: 24, italic: true, color: PAL.gold });
      text(typed('illustrative profile · shape depends on Mw, LA:GA, size', t - 3, 40), 1286, 918, { kind: 'mono', size: 13, color: PAL.nightMuted });
    }
  },
};

/* ---------- END CARD ---------- */
const P5 = {
  dur: 7, dark: true, enter: { type: 'fade', dur: 0.8 }, counter: false,
  focus: () => [960, 380],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur: dur - 0.5, notes: [130.8, 196, 246.9, 329.6], g: 0.02, dark: true }),
  cues: [[1.2, 'chime', { f: 392 }], [3.3, 'chime', { f: 587 }]],
  draw(t) {
    const [cx, cy] = [960, 380], a = E.out3(inv(0.3, 1.4, t));
    ink([[cx - 260 * a, cy], [cx + 260 * a, cy]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.3 });
    ink([[cx, cy - 170 * a], [cx, cy + 170 * a]], { w: 1, color: PAL.peri, amp: 0, alpha: 0.3 });
    ink(shape.circle(cx, cy, 150), { closed: true, w: 1, color: PAL.peri, amp: 0, alpha: 0.25 * a });
    ink(shape.circle(cx, cy, 86), { closed: true, w: 2.4, color: PAL.nightInk, amp: 0.6, draw: E.out3(inv(0.4, 1.2, t)) });
    for (let i = 0; i < 48; i++) { const q = inv(0.6 + i * 0.012, 0.8 + i * 0.012, t); if (!q) continue; const an = i / 48 * TAU - Math.PI / 2;
      ink([[cx + Math.cos(an) * 98, cy + Math.sin(an) * 98], [cx + Math.cos(an) * (i % 4 ? 106 : 114), cy + Math.sin(an) * (i % 4 ? 106 : 114)]], { w: 1.4, color: i % 12 ? PAL.peri : PAL.accent, amp: 0, alpha: q }); }
    const pr = E.outBack(inv(1.0, 1.6, t)); if (pr > 0) particle(cx, cy, 44 * pr, t, { drugs: 10, detail: 1 });
    reticle(cx, cy, t, { r: 62, dark: true, tag: false, alpha: inv(1.4, 2, t) });
    const q = 'Every dose is a slow journey.', qo = { kind: 'display', size: 60, italic: true, color: PAL.nightInk, cps: 20 };
    dropText(q, cx - measure(q, qo) / 2, 610, t - 1.8, qo);
    const rl = E.out3(inv(3.3, 4.1, t)); if (rl > 0) ink([[cx - 320 * rl, 650], [cx + 320 * rl, 650]], { w: 1.2, color: PAL.peri, amp: 0, alpha: 0.7 });
    const col = `THE LONG RELEASE  ·  4 PLATES  ·  ${fmt(TOTAL_F)} FRAMES  ·  DRAWN IN CODE`, co = { kind: 'mono', size: 20, ls: 6, color: '#9fa0c8' };
    text(typed(col, t - 3.5, 60), cx - measure(col, co) / 2, 700, co);
    const src = 'NOTES  ·  VALUES ARE ILLUSTRATIVE  ·  NOT A SPECIFIC FORMULATION', so = { kind: 'mono', size: 15, ls: 5, color: PAL.nightMuted };
    text(typed(src, t - 4.6, 60), cx - measure(src, so) / 2, 930, so);
  },
};

defineStory({ title: 'The Long Release', stages: 4, plates: [P0, P1, P2, P3, P4, P5] });
boot();
