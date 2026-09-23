/* =====================  KIT.lab · flask, cell, molecule, microscope, pipette, scale bar  =====================
   Paper-world lab pieces (cell and molecule also work at night with dark: true). flask, microscope and pipette take
   x, y = the point they stand on (the pipette: its tip); cell and molecule take x, y = their centre.
   See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  labGlass: '#dff0f3', labLiquid: '#56c3d2', labLiquidDeep: '#2f7f98', labBubble: '#ffffff', labCell: '#f1dccb', labCellNight: '#2a2350',
  labCellEdge: '#b9826b', labNucleus: '#b7a6d6', labNucleolus: '#6d5a9c', labMito: '#e8a06a', labMitoDeep: '#9c5a2f', labEr: '#c0607a',
  labVesicle: '#f7efe3', labBody: '#e7dcc6', labBodyDeep: '#4a4446', labLamp: '#f0c75a', labBulb: '#b8475a', labDish: '#e9f1ee',
  labAtom: { C: '#3b3638', H: '#f3eee2', O: '#d9534f', N: '#4a6fb5', S: '#e6c65c', P: '#e3a03c' },
});
KIT.lab = (() => {
  const K = KIT;

  const GLASS = {
    beaker: { outline: [[-78, -214], [-70, -206], [-70, -10], [-62, 0], [62, 0], [70, -10], [70, -206], [80, -216]], inner: [[-66, -206], [-66, -10], [-58, -4], [58, -4], [66, -10], [66, -206]], top: -206, bottom: -4, half: 66, ticks: true, hl: [[-56, -178], [-56, -64]] },
    flask: { outline: [[-26, -266], [-19, -258], [-19, -176], [-92, -24], [-84, 0], [84, 0], [92, -24], [19, -176], [19, -258], [26, -266]], inner: [[-15, -258], [-15, -174], [-88, -24], [-80, -4], [80, -4], [88, -24], [15, -174], [15, -258]], top: -258, bottom: -4, half: 88, ticks: false, hl: [[-22, -146], [-60, -66]] },
    tube: { outline: [[-28, -262], [-22, -256], ...shape.arc(0, -26, 22, Math.PI, 0, 14), [22, -256], [28, -262]], inner: [[-18, -256], ...shape.arc(0, -26, 18, Math.PI, 0, 12), [18, -256]], top: -256, bottom: -8, half: 18, ticks: false, hl: [[-10, -232], [-10, -120]] },
  };
  /** flask(t, {x, y, s, kind, level, fill, bubbles, steam, label, seed}): glassware (kind: 'beaker', 'flask' or 'tube')
      whose liquid pours in on draw, with a moving surface, rising bubbles, a glass highlight and optional steam. */
  function flask(t, o) {
    o = K.opts(o, { kind: 'beaker', level: 0.55, fill: PAL.labLiquid, bubbles: 9, steam: false, label: null });
    return K.at(o, () => {
      const { draw, seed } = o, ic = K.inkOf(o.dark), G = GLASS[o.kind] || GLASS.beaker, bottom = G.bottom, full = bottom - G.top;
      const lvl = o.level * E.inOut2(inv(0.35, 1, draw)), sy = bottom - full * lvl;
      withAlpha(K.ph(draw, 0, 0.4), () => flat(G.inner, PAL.labGlass, 0.45));
      if (lvl > 0.01) {
        ctx.save(); trace(G.inner, true); ctx.clip();
        const top = []; for (let x = -100; x <= 100; x += 8) top.push([x, sy + 3 * Math.sin(x * 0.06 + t * 2.2) + 1.5 * Math.sin(x * 0.13 - t * 3)]);
        const liq = [...top, [100, 10], [-100, 10]];
        flat(liq, o.fill, 0.85);
        hatch(liq, { color: PAL.labLiquidDeep, alpha: 0.4, gap: 6, len: 12, angle: 0.02, seed: seed + 1, keep: (px, py) => clamp((py - sy) / Math.max(40, -sy) * 1.2) * 0.9 });
        pen(top, { w: K.lw(o, 2), color: '#ffffff', alpha: 0.75, taper: 0.1, seed: seed + 2 });
        if (draw >= 1) for (let i = 0; i < o.bubbles; i++) {
          const ph = hash3(i, seed), u = (t * (0.35 + 0.3 * hash3(i, 2, seed)) + ph) % 1, depth = bottom - 8 - sy;
          if (depth < 20) break;
          const bx = (hash3(i, 3, seed) - 0.5) * Math.min(G.half * 1.4, 110) + 4 * Math.sin(t * 3 + i), by = bottom - 8 - u * depth, br = 2.5 + 3.5 * u;
          ink(shape.circle(bx, by, br, 12), { closed: true, w: K.lw(o, 1.3), color: '#ffffff', alpha: 0.9 * Math.min(1, (1 - u) * 5), amp: 0.2, seed: seed + 10 + i });
        }
        ctx.restore();
      }
      pen(G.outline, { color: ic, w: K.lw(o, 3.2), seed: seed + 3, taper: 0.03, draw: K.ph(draw, 0, 0.45) });
      withAlpha(K.ph(draw, 0.3, 0.6), () => {
        pen(G.hl, { w: K.lw(o, 3.2), color: '#ffffff', alpha: 0.85, taper: 0.4, seed: seed + 4 });           // the highlight follows each glass's own wall
        if (G.ticks) [0.25, 0.5, 0.75].forEach((v, i) => { const y = bottom - full * v;
          ink([[G.half - 22, y], [G.half - 6, y]], { color: ic, w: K.lw(o, 1.4), amp: 0.2, seed: seed + 5 + i });
          text(String((i + 1) * 100), G.half - 26, y + 4, { kind: 'mono', size: 11, align: 'right', color: o.dark ? '#b9b9d6' : PAL.inkSoft, role: 'decor' }); });   // graduations on the glass
        if (o.label) text(o.label, 0, bottom - full * 0.2, { kind: 'mono', size: 22, weight: 600, ls: 1, align: 'center', color: ic });
      });
      if (o.steam && draw >= 1) for (let k = 0; k < 3; k++) {
        const u = (t * 0.45 + k / 3) % 1, pts = Array.from({ length: 14 }, (_, i) => { const v = i / 13; return [(k - 1) * 16 + 7 * Math.sin(v * 7 + t * 2 + k), G.top - 14 - v * 90]; });
        pen(subpath(pts, u * 0.5, u * 0.5 + 0.45), { w: K.lw(o, 2.2), color: K.mutedOf(o.dark), alpha: Math.sin(Math.PI * u) * 0.8, taper: 0.4, seed: seed + 30 + k });
      }
    });
  }

  /** cell(t, {x, y, r, seed, dark}): a eukaryotic cell. The membrane breathes; the nucleus turns slowly; mitochondria,
      ER, Golgi, ribosomes and vesicles drift. Organelles pop in after the membrane draws on. */
  function cell(t, o) {
    o = K.opts(o, { r: 170, dark: false });
    return K.at(o, () => {
      const { r, draw, seed, dark } = o, ic = K.inkOf(dark);
      const G = K.memo(`l.cell|${r}|${seed}`, () => { const q = mulberry(seed), polar = (a0, a1, k0, k1) => { const a = lerp(a0, a1, q()), k = lerp(k0, k1, q()); return [Math.cos(a) * r * k, Math.sin(a) * r * k]; };
        return { mito: Array.from({ length: 5 }, (_, i) => ({ p: polar(i * 1.26 + 0.2, i * 1.26 + 0.9, 0.58, 0.72), rot: q() * TAU, ph: q() * TAU })),
          ribo: Array.from({ length: 46 }, () => polar(0, TAU, 0.46, 0.84)), ves: Array.from({ length: 7 }, () => ({ p: polar(0, TAU, 0.5, 0.78), s: 5 + q() * 6, ph: q() * TAU })),
          chrom: Array.from({ length: 5 }, () => [(q() - 0.5) * r * 0.36, (q() - 0.5) * r * 0.36, q() * TAU]) }; });
      const breathe = 1 + 0.018 * Math.sin(t * 1.1), memb = shape.blob(0, 0, r * breathe, seed, 0.12, 80, t * 0.04);
      ink(memb, { closed: true, w: 0, fill: dark ? PAL.labCellNight : PAL.labCell, fillReveal: 'sweep', draw: K.ph(draw, 0, 0.5) });
      const ia = K.ph(draw, 0.4, 0.7);
      if (ia > 0) withAlpha(ia, () => { stipple(memb, Math.round(r * 5), { seed: seed + 1, alpha: dark ? 0.25 : 0.2, color: dark ? PAL.nightInk : PAL.labCellEdge });
        hatch(memb, { color: PAL.labCellEdge, alpha: 0.35, gap: 5, len: 9, angle: -0.5, seed: seed + 2, keep: (px, py) => clamp(Math.hypot(px, py) / r - 0.78) * 2.8 }); });
      pen(memb, { closed: true, w: K.lw(o, 3.6), color: ic, seed: seed + 3, draw: K.ph(draw, 0, 0.5) });
      withAlpha(ia * 0.55, () => ink(shape.blob(0, 0, r * breathe * 0.95, seed, 0.12, 80, t * 0.04), { closed: true, w: K.lw(o, 1.3), color: ic, amp: 0.5, seed: seed + 4 }));
      const pop = i => K.pop(draw, 0.5 + i * 0.04, 0.75 + i * 0.04);
      G.ribo.forEach((p, i) => { const [dx, dy] = wander(i, t, 3, 0.5, seed); withAlpha(ia, () => flat(shape.circle(p[0] + dx, p[1] + dy, 2.2, 6), dark ? PAL.pink : PAL.labNucleolus, 0.7)); });
      const nx = r * 0.05 + 4 * Math.sin(t * 0.5), ny = -r * 0.04 + 3 * Math.cos(t * 0.4), np = pop(0);
      if (np > 0) { ctx.save(); ctx.translate(nx, ny); ctx.scale(np, np);
        for (let k = 0; k < 3; k++) { const R = r * (0.38 + k * 0.075), a0 = 2.3 + k * 0.2, a1 = 5.2 - k * 0.15;
          const er = Array.from({ length: 30 }, (_, i) => { const a = lerp(a0, a1, i / 29), rr = R + 3.5 * Math.sin(i * 1.3 + t * 2 + k); return [Math.cos(a) * rr, Math.sin(a) * rr]; });
          pen(er, { w: K.lw(o, 1.8), color: PAL.labEr, alpha: 0.75, taper: 0.1, seed: seed + 10 + k }); }
        const nuc = shape.blob(0, 0, r * 0.3, seed + 5, 0.1, 48, -t * 0.05);
        ink(nuc, { closed: true, w: K.lw(o, 2.4), color: ic, fill: PAL.labNucleus, amp: 0.6, seed: seed + 6, double: true });
        shade(nuc, { color: PAL.labNucleolus, alpha: 0.45, seed: seed + 7 });
        G.chrom.forEach(([cx, cy, a], i) => pen([[cx, cy], [cx + Math.cos(a + t * 0.3) * 10, cy + Math.sin(a) * 8], [cx + Math.cos(a) * 18, cy + Math.sin(a + t * 0.3) * 14]], { w: K.lw(o, 1.4), color: PAL.labNucleolus, alpha: 0.8, seed: seed + 20 + i }));
        const nl = shape.blob(r * 0.06, r * 0.04, r * 0.095, seed + 8, 0.15, 24, t * 0.1);
        ink(nl, { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.labNucleolus, amp: 0.3, seed: seed + 9 }); speckle(nl, 8, { seed: seed + 9, alpha: 0.5 });
        ctx.restore(); }
      const gp = pop(2);
      if (gp > 0) { const gx = -r * 0.5, gy = r * 0.32; ctx.save(); ctx.translate(gx, gy); ctx.rotate(0.6 + 0.05 * Math.sin(t * 0.7)); ctx.scale(gp, gp);
        for (let k = 0; k < 4; k++) { const R = 26 + k * 9; const arc = shape.arc(0, 30, R, -2.3, -0.84, 12), in2 = shape.arc(0, 30, R + 5, -0.84, -2.3, 12);
          ink([...arc, ...in2], { closed: true, w: K.lw(o, 1.4), color: ic, fill: PAL.labEr, fillAlpha: 0.55, amp: 0.3, seed: seed + 40 + k }); }
        ctx.restore(); }
      G.mito.forEach((m, i) => { const p = pop(3 + i); if (p <= 0) return; const [dx, dy] = wander(i, t, 6, 0.35, seed + 50);
        ctx.save(); ctx.translate(m.p[0] + dx, m.p[1] + dy); ctx.rotate(m.rot + 0.15 * Math.sin(t * 0.5 + m.ph)); ctx.scale(p, p);
        const body = shape.ellipse(0, 0, r * 0.14, r * 0.065, 0, 28);
        ink(body, { closed: true, w: K.lw(o, 2), color: ic, fill: PAL.labMito, amp: 0.4, seed: seed + 60 + i });
        const L = r * 0.11, cr = []; for (let k = 0; k <= 10; k++) cr.push([-L + k * L / 5, (k % 2 ? 1 : -1) * r * 0.04]);
        pen(cr, { w: K.lw(o, 1.4), color: PAL.labMitoDeep, taper: 0.1, seed: seed + 70 + i }); ctx.restore(); });
      G.ves.forEach((v, i) => { const p = pop(4 + i * 0.5); if (p <= 0) return; const a = v.ph + t * 0.25, dx = Math.cos(a) * 10, dy = Math.sin(a) * 8;
        ink(shape.circle(v.p[0] + dx, v.p[1] + dy, v.s * p, 14), { closed: true, w: K.lw(o, 1.4), color: ic, fill: dark ? '#3a3268' : PAL.labVesicle, amp: 0.3, seed: seed + 80 + i }); });
    });
  }

  const MOL = {
    water: { atoms: [['O', 0, 0, 0], ['H', 0.76, 0.59, 0], ['H', -0.76, 0.59, 0]], bonds: [[0, 1], [0, 2]] },
    co2: { atoms: [['C', 0, 0, 0], ['O', 1.16, 0, 0], ['O', -1.16, 0, 0]], bonds: [[0, 1, 2], [0, 2, 2]] },
    methane: { atoms: [['C', 0, 0, 0], ['H', 0.63, 0.63, 0.63], ['H', -0.63, -0.63, 0.63], ['H', -0.63, 0.63, -0.63], ['H', 0.63, -0.63, -0.63]], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] },
    ethanol: { atoms: [['C', -0.75, 0, 0], ['C', 0.75, 0, 0], ['O', 1.3, 1.25, 0], ['H', 2.2, 1.3, 0], ['H', -1.15, -1.0, 0], ['H', -1.15, 0.5, 0.87], ['H', -1.15, 0.5, -0.87], ['H', 1.15, -0.5, 0.87], ['H', 1.15, -0.5, -0.87]],
      bonds: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]] },
    benzene: (() => { const atoms = [], bonds = [];
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; atoms.push(['C', 1.39 * Math.cos(a), 1.39 * Math.sin(a), 0]); }
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; atoms.push(['H', 2.47 * Math.cos(a), 2.47 * Math.sin(a), 0]); bonds.push([k, (k + 1) % 6, k % 2 ? 1 : 2], [k, k + 6]); }
      return { atoms, bonds }; })(),
  };
  const RAD = { H: 0.27, C: 0.4, N: 0.4, O: 0.42, S: 0.5, P: 0.5 };
  /** molecule(t, {x, y, s, preset, atoms, bonds, unit, spin, labels, dark, seed}): a ball-and-stick model turning in 3-D.
      preset: water, co2, methane, ethanol, benzene; or pass atoms [[el, x, y, z] (Å)] and bonds [[i, j, order]].
      Depth order is re-sorted every frame so near atoms pass in front. */
  function molecule(t, o) {
    o = K.opts(o, { preset: 'ethanol', atoms: null, bonds: null, unit: 70, spin: 0.6, labels: true, dark: false });
    return K.at(o, () => {
      const m = o.atoms ? { atoms: o.atoms, bonds: o.bonds || [] } : MOL[o.preset] || MOL.water, { unit, draw, seed, dark } = o, ic = K.inkOf(dark);
      const c = m.atoms.reduce((s, a) => [s[0] + a[1], s[1] + a[2], s[2] + a[3]], [0, 0, 0]).map(v => v / m.atoms.length);
      const ay = t * o.spin + seed, ax = 0.35 + 0.15 * Math.sin(t * 0.4);
      const P = m.atoms.map(([el, x0, y0, z0]) => { let x = x0 - c[0], y = y0 - c[1], z = z0 - c[2];
        [x, z] = [x * Math.cos(ay) + z * Math.sin(ay), -x * Math.sin(ay) + z * Math.cos(ay)];
        [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
        const k = 1 + z * 0.07; return { el, x: x * unit * k, y: y * unit * k, z, k }; });
      const items = [...m.bonds.map((b, i) => ({ b, i, z: (P[b[0]].z + P[b[1]].z) / 2 - 0.01 })), ...P.map((p, i) => ({ p, i, z: p.z }))].sort((a, b) => a.z - b.z);
      items.forEach(it => {
        if (it.b) { const [i, j, ord = 1] = it.b, A = P[i], B = P[j], bd = K.ph(draw, 0.4, 0.9); if (bd <= 0) return;
          const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
          for (let k = 0; k < ord; k++) { const off = (k - (ord - 1) / 2) * 9;
            pen([[A.x + nx * off, A.y + ny * off], [B.x + nx * off, B.y + ny * off]], { w: K.lw(o, ord > 1 ? 3.6 : 6), color: ic, taper: 0.02, seed: seed + it.i * 3 + k, draw: bd, alpha: 0.6 + 0.4 * clamp(it.z + 1) }); }
          return; }
        const p = it.p, pop = K.pop(draw, it.i / P.length * 0.5, it.i / P.length * 0.5 + 0.3); if (pop <= 0) return;
        const R = (RAD[p.el] || 0.4) * unit * p.k * pop, d = shape.circle(p.x, p.y, R, 32), fill = PAL.labAtom[p.el] || PAL.labAtom.C;
        ink(d, { closed: true, w: K.lw(o, 2.2), color: dark && p.el !== 'H' ? PAL.nightInk : PAL.ink, fill, amp: 0.4, seed: seed + 50 + it.i });
        shade(d, { color: p.el === 'H' ? PAL.muted : '#1b1518', alpha: p.el === 'C' ? 0.25 : 0.5, gap: 3.5, len: 6, seed: seed + 60 + it.i });
        pen(shape.arc(p.x, p.y, R * 0.68, Math.PI * 1.1, Math.PI * 1.45, 8), { w: K.lw(o, 2.6), color: '#ffffff', alpha: p.el === 'H' ? 0.9 : 0.75, taper: 0.4, seed: seed + 70 + it.i });
        if (o.labels && p.el !== 'H' && R > 18) text(p.el, p.x, p.y + 6, { kind: 'mono', size: Math.round(R * 0.6), weight: 600, align: 'center', color: p.el === 'C' ? PAL.paper : '#fff8ee', role: 'decor' });
      });
    });
  }

  /** microscope(t, {x, y, s, seed}): a light microscope on the bench at (x, y). The focus knob turns back and forth,
      the tube rises and falls with it, and the lamp under the stage flickers its beam up through the slide. */
  function microscope(t, o) {
    o = K.opts(o, {});
    return K.at(o, () => {
      const { draw, seed } = o, ic = K.inkOf(o.dark), fk = 0.7 * Math.sin(t * 0.9), lift = -3 * Math.sin(t * 0.9), fa = K.ph(draw, 0.3, 0.7);
      const base = K.rrect(-120, -34, 230, 34, 12);
      const arm = K.ribbon(smooth([[70, -34], [100, -110], [92, -200], [40, -248], [-16, -252]], 2), u => 22 - 8 * u);
      const tube = K.ribbon([[-6, -196 + lift], [-60, -318 + lift]], 17);
      ink(base, { color: ic, closed: true, w: K.lw(o, 2.6), fill: PAL.labBody, fillReveal: 'sweep', amp: 0.5, seed: seed + 1, draw: K.ph(draw, 0, 0.4) });
      withAlpha(fa, () => { shade(base, { color: PAL.labBodyDeep, alpha: 0.4, seed: seed + 2 });
        const lampA = 0.65 + 0.35 * Math.sin(t * 7) * Math.sin(t * 3.1);
        flat(shape.circle(-20, -52, 26, 24), PAL.labLamp, 0.25 * lampA);
        ink(shape.rect(-34, -48, 28, 14), { color: ic, closed: true, w: K.lw(o, 1.8), fill: PAL.labBodyDeep, amp: 0.3, seed: seed + 3 });
        ink(shape.circle(-20, -56, 9, 16), { color: ic, closed: true, w: K.lw(o, 1.6), fill: PAL.labLamp, amp: 0.2, seed: seed + 4 });
        for (let k = 0; k < 3; k++) ink([[-26 + k * 6, -70], [-26 + k * 6 + (k - 1) * 2, -128]], { w: K.lw(o, 1.4), color: PAL.sun, alpha: lampA * 0.7, dash: [5, 6], amp: 0.2, seed: seed + 5 + k }); });
      ink(arm, { color: ic, closed: true, w: K.lw(o, 2.6), fill: PAL.labBody, amp: 0.6, seed: seed + 8, draw: K.ph(draw, 0.1, 0.5) });
      withAlpha(fa, () => { shade(arm, { color: PAL.labBodyDeep, alpha: 0.45, light: [-0.9, -0.2], seed: seed + 9 });
        const stage = shape.rect(-104, -148, 150, 14);
        ink(stage, { color: ic, closed: true, w: K.lw(o, 2.2), fill: PAL.labBodyDeep, amp: 0.4, seed: seed + 10 });
        ink(shape.rect(-86, -154, 96, 6), { color: ic, closed: true, w: K.lw(o, 1.4), fill: PAL.labGlass, amp: 0.2, seed: seed + 11 });
        flat(shape.ellipse(-22, -151, 9, 2.5, 0, 12), PAL.pink, 0.9);
        [-96, 26].forEach((cx, i) => pen([[cx, -150], [cx + 18, -158]], { color: ic, w: K.lw(o, 2.4), seed: seed + 12 + i, taper: 0.2 }));
        ink(tube, { color: ic, closed: true, w: K.lw(o, 2.6), fill: PAL.labBody, amp: 0.5, seed: seed + 14 });
        hatch(tube, { color: PAL.labBodyDeep, alpha: 0.35, gap: 5, len: 8, angle: 1.1, seed: seed + 15 });
        const ep = K.ribbon([[-58, -314 + lift], [-70, -338 + lift]], 12);
        ink(ep, { color: ic, closed: true, w: K.lw(o, 2.2), fill: PAL.labBodyDeep, amp: 0.3, seed: seed + 16 });
        const tur = [[-34, -196 + lift], [22, -196 + lift], [14, -180 + lift], [-26, -180 + lift]];
        ink(tur, { color: ic, closed: true, w: K.lw(o, 2), fill: PAL.labBodyDeep, amp: 0.3, seed: seed + 17 });
        [[-22, -8], [2, 8]].forEach(([ox, da], i) => { const p = K.ribbon([[ox, -180 + lift], [ox + da * 0.4, -160 + lift]], 5 - i);
          ink(p, { color: ic, closed: true, w: K.lw(o, 1.6), fill: i ? PAL.labBody : PAL.sun, amp: 0.2, seed: seed + 18 + i }); });
        for (const [R, n] of [[22, 10], [12, 6]]) {
          ink(shape.circle(88, -140, R, 24), { color: ic, closed: true, w: K.lw(o, 2), fill: R > 15 ? PAL.labBodyDeep : PAL.labBody, amp: 0.3, seed: seed + 20 + R });
          for (let k = 0; k < n; k++) { const a = fk * (R > 15 ? 1 : -1.6) + k / n * TAU;
            ink([[88 + Math.cos(a) * (R - 5), -140 + Math.sin(a) * (R - 5)], [88 + Math.cos(a) * R, -140 + Math.sin(a) * R]], { w: K.lw(o, 1.4), color: R > 15 ? PAL.labBody : PAL.labBodyDeep, amp: 0 }); }
        }
      });
    });
  }

  /** pipette(t, {x, y, s, fall, period, fill, dish, seed}): a dropper with its tip at (x, y). The bulb squeezes, a drop
      swells at the tip, falls `fall` px and lands in a dish with a ripple, over and over (period seconds). */
  function pipette(t, o) {
    o = K.opts(o, { fall: 170, period: 1.8, fill: PAL.labLiquid, dish: true });
    return K.at(o, () => {
      const { draw, seed, fall } = o, ic = K.inkOf(o.dark), [, f] = K.cyc(t + 0.3, o.period), live = draw >= 1;
      const sq = live ? 1 - 0.2 * Math.sin(Math.PI * inv(0.05, 0.4, f)) : 1;
      if (o.dish) {
        const rim = shape.ellipse(0, fall, 120, 20, 0, 48), low = Array.from({ length: 25 }, (_, i) => { const a = Math.PI - i / 24 * Math.PI; return [120 * Math.cos(a), fall + 22 + 20 * Math.sin(a)]; });
        withAlpha(K.ph(draw, 0.2, 0.6), () => {
          ink([[-120, fall], ...low, [120, fall]], { color: ic, closed: true, w: K.lw(o, 2.4), fill: PAL.labDish, amp: 0.5, seed: seed + 1 });
          ink(shape.ellipse(0, fall + 4, 108, 15, 0, 40), { color: ic, closed: true, w: 0, fill: o.fill, fillAlpha: 0.55 });
          hatch(shape.ellipse(0, fall + 4, 108, 15, 0, 40), { color: PAL.labLiquidDeep, alpha: 0.4, gap: 4, len: 10, angle: 0.02, seed: seed + 2 });
          ink(rim, { color: ic, closed: true, w: K.lw(o, 2.4), amp: 0.5, seed: seed + 3 });
          for (let k = 0; k < 2; k++) { const q = ((t * 0.5 + k * 0.5) % 1); ink(shape.ellipse(0, fall + 4, 20 + q * 80, 3 + q * 10, 0, 32), { closed: true, w: K.lw(o, 1.2), color: '#ffffff', alpha: (1 - q) * 0.5, amp: 0.3, seed: seed + 4 + k }); }
        });
        if (live) { const q = inv(0.8, 1, f); if (q > 0 && q < 1) {
          ink(shape.ellipse(0, fall + 4, 8 + q * 60, 2 + q * 9, 0, 32), { closed: true, w: K.lw(o, 2), color: '#ffffff', alpha: 1 - q, amp: 0.3, seed: seed + 6 });
          for (let k = 0; k < 5; k++) { const a = Math.PI + (k + 0.5) / 5 * Math.PI, d = q * 30; flat(shape.circle(Math.cos(a) * d * 1.4, fall + Math.sin(a) * d * 1.2 * Math.sin(Math.PI * q) * 1.6, 2.4 * (1 - q), 6), o.fill); } } }
      }
      const glass = [[0, 0], [-3, -6], [-5, -40], [-13, -78], [-13, -186], [-16, -192], [16, -192], [13, -186], [13, -78], [5, -40], [3, -6]];
      const inner = [[-2, -8], [-3, -40], [-10, -78], [-10, -184], [10, -184], [10, -78], [3, -40], [2, -8]];
      const lvl = -150 + 20 * (1 - sq) * 3;
      withAlpha(K.ph(draw, 0.2, 0.6), () => { flat(inner, PAL.labGlass, 0.6);
        ctx.save(); trace(inner, true); ctx.clip(); const liq = [[-20, lvl], [-10, lvl - 2], [0, lvl + 1], [10, lvl - 1], [20, lvl], [20, 2], [-20, 2]];
        flat(liq, o.fill, 0.85); hatch(liq, { color: PAL.labLiquidDeep, alpha: 0.35, gap: 5, len: 8, angle: 0.02, seed: seed + 7 }); ctx.restore();
        [0, 1, 2, 3].forEach(k => ink([[6, -100 - k * 20], [13, -100 - k * 20]], { color: ic, w: K.lw(o, 1.2), amp: 0.1, alpha: 0.7 })); });
      pen([...glass, glass[0]], { color: ic, w: K.lw(o, 2.6), taper: 0.02, seed: seed + 8, draw: K.ph(draw, 0, 0.45) });
      withAlpha(K.ph(draw, 0.3, 0.6), () => {
        const b2 = [[-15 * sq, -192], [-21 * sq, -212], [-22 * sq, -240], [-14 * sq, -266], [0, -272], [14 * sq, -266], [22 * sq, -240], [21 * sq, -212], [15 * sq, -192]];
        ink(b2, { color: ic, closed: true, w: K.lw(o, 2.4), fill: PAL.labBulb, amp: 0.5, seed: seed + 9 });
        shade(b2, { color: '#5a1f2c', alpha: 0.5, gap: 4, len: 7, seed: seed + 10 });
        pen([[-10 * sq, -248], [-8 * sq, -226]], { w: K.lw(o, 2.4), color: '#ffffff', alpha: 0.6, taper: 0.4, seed: seed + 11 });
      });
      if (live) {
        const grow = inv(0.2, 0.52, f), fallU = inv(0.52, 0.8, f);
        if (grow > 0 && fallU <= 0) { const s = 1.5 + 5 * E.out2(grow); ink(shape.circle(0, 2 + s, s, 16), { color: ic, closed: true, w: K.lw(o, 1.3), fill: o.fill, amp: 0.2, seed: seed + 12 }); }
        if (fallU > 0 && fallU < 1) { const y = lerp(10, fall, E.in2(fallU)); ink(teardrop(0, y, 6.5 * (1 + 0.15 * fallU)), { color: ic, closed: true, w: K.lw(o, 1.4), fill: o.fill, amp: 0.2, seed: seed + 13 }); }
      }
    });
  }

  /** scaleBar(t, {x, y, len, label, dark, color, draw}): a microscope scale bar, a solid bar len px long whose left end is
      at x, y, with its length typed above it ('10 µm'). It draws on from the left; 6 px thick so it survives phone
      compression. Made for fluorescence plates (dark: true), where it reads in the paper's ink. */
  function scaleBar(t, o) {
    o = K.opts(o, { len: 160, label: '10 µm', dark: true, color: null });
    return K.at(o, () => {
      const col = o.color || K.inkOf(o.dark), u = K.ph(o.draw, 0, 0.6);
      ctx.save(); ctx.fillStyle = col; ctx.fillRect(0, -3, o.len * u, 6); ctx.restore();
      if (o.label) K.caption(t, o.label, o.len / 2, -16, { dark: o.dark, align: 'center', color: col, alpha: K.ph(o.draw, 0.4, 1) });
    });
  }

  return { flask, cell, molecule, microscope, pipette, scaleBar };
})();
