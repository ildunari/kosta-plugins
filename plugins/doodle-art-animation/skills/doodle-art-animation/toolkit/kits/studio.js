/* =====================  KIT.studio · easel, brush, swatches, wireframe, penTool  =====================
   Paper-world art and design pieces. easel takes x, y = the floor under it; brush and penTool take x, y = the origin of
   their path points; swatches and wireframe take x, y = top-left. See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  studioWood: '#b98457', studioWoodDeep: '#6b4426', studioCanvas: '#f7f2e6', studioHandle: '#8c5a3c', studioFerrule: '#b9b3a8',
  studioSky: '#9cc7d8', studioSkyWarm: '#f0d59a', studioHill: '#7fa35f', studioHillDeep: '#4f7a40', studioLake: '#3f8fb0', studioBoard: '#fbf8f0',
  studioGuide: '#e8577a', studioSelect: '#d8643a',
  studioSwatches: [['Vermilion', '#d8643a'], ['Ochre', '#e3a03c'], ['Sage', '#6f9a58'], ['Teal', '#2f7f98'], ['Periwinkle', '#8487c6'], ['Rose', '#e8577a']],
});
KIT.studio = (() => {
  const K = KIT;

  /** daub(pts, color, w, o): a loaded-brush stroke: a body plus lighter and darker bristle streaks */
  function daub(pts, color, w, o, seed, draw = 1, alpha = 1) {
    if (draw <= 0) return;
    pen(pts, { w, color, seed, taper: 0.12, draw, alpha: 0.9 * alpha, amp: 0.8 });
    for (let k = 0; k < 3; k++) pen(K.offset(pts, (k - 1) * w * 0.28), { w: Math.max(1, w * 0.12), color: k === 1 ? '#ffffff' : '#1b1518', alpha: (k === 1 ? 0.22 : 0.14) * alpha, seed: seed + 5 + k, taper: 0.2, draw: draw * (0.85 + 0.05 * k), amp: 0.6 });
  }
  function brushShape() {                                                   // tip at (0, 0), handle up the -y axis
    return {
      tuft: [[0, 0], [-6, -10], [-8, -26], [-7, -34], [7, -34], [8, -26], [6, -10]],
      ferrule: [[-8, -34], [-7, -58], [7, -58], [8, -34]],
      handle: [[-7, -58], [-3.5, -170], [3.5, -170], [7, -58]],
    };
  }
  function drawBrush(x, y, rot, color, o, seed, alpha = 1) {
    if (alpha <= 0) return;
    const b = brushShape();
    const ic = K.inkOf(o.dark);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha;
    ink(b.handle, { color: ic, closed: true, w: K.lw(o, 1.8), fill: PAL.studioHandle, amp: 0.3, seed: seed + 1 });
    pen([[-2, -64], [-1, -160]], { w: K.lw(o, 1.6), color: '#ffffff', alpha: 0.35, taper: 0.4, seed: seed + 2 });
    ink(b.ferrule, { color: ic, closed: true, w: K.lw(o, 1.8), fill: PAL.studioFerrule, amp: 0.3, seed: seed + 3 });
    ink([[-7, -42], [7, -42]], { w: K.lw(o, 1), color: PAL.ink, amp: 0.1, alpha: 0.6 });
    ink(b.tuft, { color: ic, closed: true, w: K.lw(o, 1.8), fill: color, amp: 0.4, seed: seed + 4 });
    hatch(b.tuft, { color: '#1b1518', alpha: 0.3, gap: 3, len: 10, angle: 1.5, seed: seed + 5 });
    ctx.restore();
  }

  /** easel(t, {x, y, s, paint, seed}): a wooden easel holding a canvas with a small landscape that paints itself on
      (paint: 0..1, default follows draw). Painted clouds drift, the sun pulses and the lake glints. */
  function easel(t, o) {
    o = K.opts(o, { paint: null });
    return K.at(o, () => {
      const ic = K.inkOf(o.dark);
      const { draw, seed } = o, pp = o.paint ?? K.ph(draw, 0.35, 1), wa = K.ph(draw, 0, 0.4);
      const legs = [[[-8, -410], [-118, 0]], [[8, -410], [118, 0]]];
      pen([[0, -380], [36, -6]], { w: K.lw(o, 7), color: PAL.studioWoodDeep, alpha: 0.7, seed: seed + 1, taper: 0.04, draw: wa });
      legs.forEach((l, i) => { const rb = K.ribbon(l, 7); ink(rb, { color: ic, closed: true, w: K.lw(o, 1.8), fill: PAL.studioWood, amp: 0.4, seed: seed + 2 + i, draw: wa });
        if (wa >= 1) hatch(rb, { color: PAL.studioWoodDeep, alpha: 0.35, gap: 4, len: 14, angle: Math.atan2(l[1][1] - l[0][1], l[1][0] - l[0][0]), seed: seed + 4 + i }); });
      const ledge = shape.rect(-128, -150, 256, 14);
      ink(ledge, { color: ic, closed: true, w: K.lw(o, 2), fill: PAL.studioWood, amp: 0.4, seed: seed + 6, draw: wa });
      const ca = K.ph(draw, 0.2, 0.5); if (ca <= 0) return;
      withAlpha(ca, () => {
        if (!o.dark) K.shadow(shape.rect(-110, -392, 220, 242), 6, 6, 0.12);
        const cv = shape.rect(-110, -392, 220, 242);
        ink(cv, { color: ic, closed: true, w: K.lw(o, 2.4), fill: PAL.studioCanvas, amp: 0.5, seed: seed + 7 });
        ctx.save(); trace(cv, true); ctx.clip();
        const x0 = -110, y0 = -392;
        for (let k = 0; k < 7; k++) daub([[x0 + 6, y0 + 16 + k * 18], [x0 + 214, y0 + 20 + k * 18]], k < 4 ? PAL.studioSky : PAL.studioSkyWarm, 22, o, seed + 10 + k, E.out2(clamp(pp * 7 - k * 0.5)), 0.85);
        const sa = E.outBack(clamp(pp * 3 - 1.1)), sr = 22 * sa * (1 + 0.05 * Math.sin(t * 2));
        if (sa > 0) { ink(shape.circle(55, y0 + 70, sr, 20), { color: ic, closed: true, w: 0, fill: PAL.sun });
          for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * 0.2, L = (i % 2 ? 8 : 14) * (1 + 0.25 * Math.sin(t * 3 + i));
            daub([[55 + Math.cos(a) * (sr + 5), y0 + 70 + Math.sin(a) * (sr + 5)], [55 + Math.cos(a) * (sr + 5 + L), y0 + 70 + Math.sin(a) * (sr + 5 + L)]], PAL.accent, 3.5, o, seed + 30 + i, sa); } }
        for (let c = 0; c < 2; c++) { const cx = ((t * 7 + c * 130) % 300) - 150, cy = y0 + 46 + c * 34, ca2 = clamp(pp * 3 - 1.2);
          daub([[cx - 30, cy], [cx + 30, cy]], '#ffffff', 12, o, seed + 40 + c, ca2, 0.9); daub([[cx - 14, cy - 8], [cx + 16, cy - 8]], '#ffffff', 10, o, seed + 44 + c, ca2, 0.9); }
        const hp = clamp(pp * 2.5 - 1.2);
        daub(smooth([[x0, y0 + 160], [x0 + 60, y0 + 128], [x0 + 130, y0 + 150], [x0 + 230, y0 + 120]], 2), PAL.studioHill, 46, o, seed + 50, hp);
        daub(smooth([[x0, y0 + 200], [x0 + 90, y0 + 176], [x0 + 230, y0 + 196]], 2), PAL.studioHillDeep, 50, o, seed + 51, clamp(hp * 1.2 - 0.15));
        const lp = clamp(pp * 2.5 - 1.5);
        daub([[x0 + 20, y0 + 226], [x0 + 200, y0 + 226]], PAL.studioLake, 26, o, seed + 52, lp);
        if (lp >= 1) for (let i = 0; i < 4; i++) { const gx = x0 + 50 + i * 40 + 6 * Math.sin(t * 1.5 + i), ga = 0.5 + 0.5 * Math.sin(t * 2.5 + i * 2);
          pen([[gx, y0 + 224], [gx + 14, y0 + 224]], { w: 2.4, color: '#ffffff', alpha: ga * 0.9, taper: 0.4, seed: seed + 60 + i }); }
        const tp = clamp(pp * 3 - 2);
        if (tp > 0) { const sw = 2 * Math.sin(t * 1.3); pen([[-60, y0 + 190], [-60 + sw * 0.4, y0 + 160]], { w: 4, color: PAL.studioWoodDeep, seed: seed + 70, draw: tp, taper: 0.2 });
          daub([[-72 + sw, y0 + 150], [-48 + sw, y0 + 150]], PAL.studioHillDeep, 26 * E.outBack(tp), o, seed + 71, tp); }
        hatch(cv, { color: PAL.muted, alpha: 0.08, gap: 5, len: 6, angle: 0.8, seed: seed + 80 });
        ctx.restore();
        ink(cv, { color: ic, closed: true, w: K.lw(o, 2.4), amp: 0.5, seed: seed + 7 });
        ink(shape.rect(-16, -406, 32, 18), { color: ic, closed: true, w: K.lw(o, 1.8), fill: PAL.studioWood, amp: 0.3, seed: seed + 8 });
        drawBrush(58, -152, -1.62, PAL.studioLake, o, seed + 90);
        drawBrush(112, -153, -1.53, PAL.accent, o, seed + 95);
      });
    });
  }

  /** brush(t, {x, y, path, color, width, period, paint, seed}): a brush that paints a stroke along path (points
      relative to x, y) with bristle streaks and a wet sheen, lifts away, and repaints each period. paint: fix the
      progress (0..1) instead of looping. */
  function brush(t, o) {
    o = K.opts(o, { path: [[0, 60], [120, 0], [260, 50], [400, 10], [520, 40]], color: PAL.accent, width: 30, period: 4.5, paint: null });
    return K.at(o, () => {
      const ic = K.inkOf(o.dark);
      const { color, width, seed, draw } = o, P = K.memo(`st.brush|${o.path.join(';')}|${width}`, () => { const p = resample(smooth(o.path, 3, false), 80, false); return { p, off: [-0.34, -0.17, 0, 0.17, 0.34].map(k => K.offset(p, k * width)) }; });
      let prog, fade = 1, bAlpha = 1, lift = 0;
      if (o.paint != null) prog = o.paint;
      else { const [, f] = K.cyc(t, o.period); prog = E.inOut2(inv(0, 0.5, f)); fade = 1 - inv(0.86, 1, f);
        lift = E.in2(inv(0.52, 0.7, f)); bAlpha = f < 0.52 ? clamp(f * 12) : 1 - inv(0.55, 0.72, f); }
      prog *= K.ph(draw, 0, 1);
      withAlpha(fade, () => {
        pen(P.p, { w: width, color, seed, taper: 0.1, draw: prog, alpha: 0.92, amp: 0.9, pressure: u => (0.72 + 0.28 * Math.sin(u * 9 + seed)) * Math.min(1, Math.min(u, 1 - u) / 0.1 + 0.25) });
        P.off.forEach((q, k) => pen(q, { w: K.lw(o, 1.8), color: k % 2 ? '#ffffff' : '#1b1518', alpha: k % 2 ? 0.3 : 0.2, seed: seed + 10 + k, taper: 0.2, draw: prog * (0.88 + 0.03 * k), amp: 0.7 }));
        if (prog > 0.05) flow(subpath(P.off[1], 0, prog), t, { speed: 90, gap: 110, len: 34, color: '#ffffff', w: K.lw(o, 3), alpha: 0.45, seed: seed + 20 });
      });
      if (prog > 0 && bAlpha > 0) {
        const [x, y] = along(P.p, prog), [qx, qy] = along(P.p, Math.max(0, prog - 0.03)), dl = Math.hypot(x - qx, y - qy) || 1;
        const tx = -(x - qx) / dl * 0.6, ty = -(y - qy) / dl * 0.6 - 0.8;          // the handle trails behind the stroke and up
        drawBrush(x, y - lift * 50, Math.atan2(tx, -ty) + 0.06 * Math.sin(t * 6), color, o, seed + 30, bAlpha);
      }
    });
  }

  /** swatches(t, {x, y, colors, cols, period, seed}): paint chips with names and hex codes. Every period one chip lifts
      and gets a selection ring, and an eyedropper moves to it. colors: [[name, hex], ...]. */
  function swatches(t, o) {
    o = K.opts(o, { colors: null, cols: 6, period: 1.4 });
    return K.at(o, () => {
      const ic = K.inkOf(o.dark);
      const cols = o.colors || PAL.studioSwatches, n = cols.length, cw = 100, ch = 138, gap = 18, { draw, seed } = o;
      const pos = i => [(i % o.cols) * (cw + gap), Math.floor(i / o.cols) * (ch + gap + 16)];
      const [ci, f] = K.cyc(t, o.period), sel = ci % n, prev = (sel + n - 1) % n, live = draw >= 1;
      cols.forEach(([name, hex], i) => {
        const pop = K.pop(draw, i / n * 0.6, i / n * 0.6 + 0.35); if (pop <= 0) return;
        const lift = live && i === sel ? E.outBack(inv(0, 0.35, f)) * (1 - E.in2(inv(0.86, 1, f))) : 0, [px, py] = pos(i);
        ctx.save(); ctx.translate(px + cw / 2, py + ch - lift * 16); ctx.scale(pop, pop); ctx.translate(-cw / 2, -ch);
        const card = K.rrect(0, 0, cw, ch, 6);
        if (!o.dark) K.shadow(card, 4 + lift * 4, 5 + lift * 12, 0.12 + lift * 0.08);
        ink(card, { color: ic, closed: true, w: K.lw(o, 1.8), fill: PAL.panel, amp: 0.4, seed: seed + i });
        const blk = shape.rect(8, 8, cw - 16, 84);
        ink(blk, { color: ic, closed: true, w: K.lw(o, 1.4), fill: hex, amp: 0.4, seed: seed + 20 + i });
        hatch(blk, { color: '#1b1518', alpha: 0.22, gap: 5, len: 9, angle: -0.6, seed: seed + 40 + i, keep: (x, y) => clamp((x + y) / 160) * 0.8 });
        pen([[14, 18], [30, 14]], { w: K.lw(o, 2.4), color: '#ffffff', alpha: 0.6, taper: 0.4, seed: seed + 60 + i });
        text(name, 10, 112, { kind: 'sans', size: 14, weight: 600, color: PAL.ink, role: 'decor' });   // printed on the paint chip
        text(hex.toUpperCase(), 10, 129, { kind: 'mono', size: 12, color: PAL.muted, role: 'decor' });
        if (lift > 0) ink(K.rrect(-5, -5, cw + 10, ch + 10, 9), { closed: true, w: K.lw(o, 2.6), color: PAL.studioSelect, alpha: clamp(lift), amp: 0.5, seed: seed + 80 });
        ctx.restore();
      });
      if (!live) return;
      const a = pos(prev), b = pos(sel), m = E.inOut3(inv(0, 0.35, f)), ex = lerp(a[0], b[0], m) + cw * 0.72, ey = lerp(a[1], b[1], m) + 26 * E.inOut2(inv(0.3, 0.5, f)) * (1 - inv(0.8, 0.95, f)) - 4 + 4 * Math.sin(t * 3);   // dips into the chip, then lifts
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(0.6);
      const tipC = cols[sel][1];
      ink([[0, 0], [-4, -12], [-4, -46], [4, -46], [4, -12]], { color: ic, closed: true, w: K.lw(o, 1.8), fill: '#fbf8f1', amp: 0.3, seed: seed + 90 });
      ctx.save(); ctx.beginPath(); ctx.rect(-6, -22, 12, 24); ctx.clip(); ink([[0, 0], [-4, -12], [-4, -22], [4, -22], [4, -12]], { color: ic, closed: true, w: 0, fill: tipC, fillAlpha: m }); ctx.restore();
      ink(K.rrect(-8, -72, 16, 28, 7), { color: ic, closed: true, w: K.lw(o, 1.8), fill: PAL.ink, amp: 0.3, seed: seed + 91 });
      ctx.restore();
    });
  }

  const BLOCKS = [
    { k: 'nav', c: [0, 12], y: 14, h: 36 }, { k: 'text', c: [0, 6], y: 76, h: 150 }, { k: 'img', c: [6, 12], y: 76, h: 150 },
    { k: 'card', c: [0, 4], y: 250, h: 130 }, { k: 'card', c: [4, 8], y: 250, h: 130 }, { k: 'card', c: [8, 12], y: 250, h: 130 },
  ];
  /** wireframe(t, {x, y, w, h, label, period, seed}): a layout on an artboard: 12-column guides, a baseline grid and
      greyed blocks (nav, heading, image, cards). A selection box with handles and a size badge hops between blocks,
      with a red spacing marker to the edge. */
  function wireframe(t, o) {
    o = K.opts(o, { w: 640, h: 420, label: 'Desktop — 1440', period: 1.8 });
    return K.at(o, () => {
      const ic = K.inkOf(o.dark);
      const { w, h, draw, seed } = o, m = 24, g = 12, colw = (w - 2 * m - 11 * g) / 12, cx = c => m + c * (colw + g);
      const rectOf = b => { const x0 = cx(b.c[0]), x1 = cx(b.c[1]) - g; return [x0, b.y * h / 420, x1 - x0, b.h * h / 420]; };
      const board = shape.rect(0, 0, w, h);
      if (!o.dark) K.shadow(board, 6, 8, 0.12 * K.ph(draw, 0.1, 0.4));
      ink(board, { color: ic, closed: true, w: K.lw(o, 2), fill: PAL.studioBoard, fillReveal: 'sweep', amp: 0.5, seed: seed + 1, draw: K.ph(draw, 0, 0.4) });
      KIT.caption((draw - 0.2) * 4, o.label, 0, -12, { size: 12, dark: o.dark, role: 'decor' });   // the artboard's name tab
      const ga = K.ph(draw, 0.3, 0.6);
      withAlpha(ga, () => { for (let c = 0; c < 12; c++) flat(shape.rect(cx(c), 0, colw, h), PAL.studioGuide, 0.07);
        for (let y = 24; y < h; y += 24) ink([[0, y], [w, y]], { w: K.lw(o, 0.8), color: PAL.peri, alpha: 0.18, amp: 0 }); });
      BLOCKS.forEach((b, i) => {
        const a = K.ph(draw, 0.4 + i * 0.06, 0.7 + i * 0.06); if (a <= 0) return;
        const [x, y, bw, bh] = rectOf(b);
        withAlpha(a, () => {
          ink(shape.rect(x, y, bw, bh), { closed: true, w: K.lw(o, 1.8), color: PAL.inkSoft, fill: '#efe9dc', amp: 0.5, seed: seed + 10 + i });
          if (b.k === 'nav') { ink(shape.circle(x + 20, y + bh / 2, 9, 14), { color: ic, closed: true, w: K.lw(o, 1.4), fill: PAL.muted, amp: 0.2 });
            for (let k = 0; k < 4; k++) pen([[x + bw - 190 + k * 46, y + bh / 2], [x + bw - 160 + k * 46, y + bh / 2]], { w: K.lw(o, 3), color: PAL.muted, seed: seed + 20 + k, taper: 0.2 }); }
          if (b.k === 'text') { pen([[x + 14, y + 26], [x + bw * 0.85, y + 26]], { w: K.lw(o, 11), color: PAL.muted, seed: seed + 30, taper: 0.05 });
            pen([[x + 14, y + 52], [x + bw * 0.6, y + 52]], { w: K.lw(o, 11), color: PAL.muted, seed: seed + 31, taper: 0.05 });
            [0, 1].forEach(k => ink([[x + 14, y + 80 + k * 14], [x + bw * (0.8 - k * 0.2), y + 80 + k * 14]], { w: K.lw(o, 1.8), color: PAL.muted, amp: 0.3, seed: seed + 32 + k }));
            ink(K.rrect(x + 14, y + bh - 34, 90, 24, 12), { closed: true, w: K.lw(o, 1.6), color: PAL.inkSoft, fill: '#e0d8c6', amp: 0.3, seed: seed + 35 }); }
          if (b.k === 'img') { ink([[x, y], [x + bw, y + bh]], { w: K.lw(o, 1.2), color: PAL.muted, amp: 0.3 }); ink([[x + bw, y], [x, y + bh]], { w: K.lw(o, 1.2), color: PAL.muted, amp: 0.3 }); }
          if (b.k === 'card') { ink(shape.rect(x + 10, y + 10, bw - 20, bh * 0.42), { closed: true, w: K.lw(o, 1.2), color: PAL.muted, amp: 0.3, seed: seed + 40 + i });
            [0, 1, 2].forEach(k => ink([[x + 10, y + bh * 0.62 + k * 13], [x + bw * (0.85 - k * 0.2), y + bh * 0.62 + k * 13]], { w: K.lw(o, 1.8), color: PAL.muted, amp: 0.3, seed: seed + 44 + i * 3 + k })); }
        });
      });
      if (draw < 1) return;
      const order = [1, 2, 3, 4, 5, 0], [ci, f] = K.cyc(t, o.period), A = rectOf(BLOCKS[order[ci % 6]]), B = rectOf(BLOCKS[order[(ci + 1) % 6]]);
      const e = E.inOut3(inv(0.62, 1, f)), [x, y, bw, bh] = A.map((v, k) => lerp(v, B[k], e));
      ink([[0, y + bh / 2], [x, y + bh / 2]], { w: K.lw(o, 1.4), color: PAL.studioGuide, dash: [4, 4], amp: 0.2, alpha: x > 20 ? 0.9 : 0 });
      if (x > 30) text(String(Math.round(x)), x / 2, y + bh / 2 - 6, { kind: 'mono', size: 11, weight: 600, align: 'center', color: PAL.studioGuide, role: 'decor' });
      ink(shape.rect(x, y, bw, bh), { closed: true, w: K.lw(o, 2.4), color: PAL.studioSelect, amp: 0.4, seed: seed + 60 });
      [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]].forEach(([u, v], k) => ink(shape.rect(x + u * bw - 5, y + v * bh - 5, 10, 10), { closed: true, w: K.lw(o, 1.6), color: PAL.studioSelect, fill: '#ffffff', amp: 0.1, seed: seed + 70 + k }));
      const lab = `${Math.round(bw * 2)} × ${Math.round(bh * 2)}`, lw = measure(lab, { kind: 'mono', size: 12 }) + 16;
      ink(K.rrect(x + bw / 2 - lw / 2, y + bh + 10, lw, 22, 6), { color: ic, closed: true, w: 0, fill: PAL.studioSelect });
      text(lab, x + bw / 2, y + bh + 25, { kind: 'mono', size: 12, weight: 600, align: 'center', color: '#fff8ee', role: 'decor' });   // the design tool's size badge
    });
  }

  /** penTool(t, {x, y, anchors, period, seed}): a Bézier path being edited. anchors = [[x, y, hx, hy], ...] (a point
      and its handle vector). The handles swing slowly so the curve reshapes; each period a different anchor is active,
      with its handles shown and the pen-nib cursor beside it; a dashed rubber band previews the next segment. */
  function penTool(t, o) {
    o = K.opts(o, { anchors: [[0, 120, 70, -90], [200, 10, 90, 0], [390, 150, 70, 70], [560, 50, 60, -70]], period: 1.6 });
    return K.at(o, () => {
      const ic = K.inkOf(o.dark);
      const { draw, seed } = o, A = o.anchors, n = A.length;
      const H = A.map(([, , hx, hy], i) => { const a = 0.35 * Math.sin(t * 0.9 + i * 1.7), k = 1 + 0.18 * Math.sin(t * 1.3 + i), c = Math.cos(a), s = Math.sin(a); return [(hx * c - hy * s) * k, (hx * s + hy * c) * k]; });
      const pts = []; for (let i = 0; i < n - 1; i++) { const p = A[i], q = A[i + 1]; pts.push(...KIT.cubic([p[0], p[1]], [p[0] + H[i][0], p[1] + H[i][1]], [q[0] - H[i + 1][0], q[1] - H[i + 1][1]], [q[0], q[1]], 28).slice(i ? 1 : 0)); }
      pen(pts, { color: ic, w: K.lw(o, 3.6), seed: seed + 1, taper: 0.03, draw: K.ph(draw, 0, 0.7), amp: 0.5 });
      const [ci, f] = K.cyc(t, o.period), act = ci % n, live = draw >= 1;
      A.forEach(([x, y], i) => {
        const pop = K.pop(draw, 0.2 + i * 0.1, 0.5 + i * 0.1); if (pop <= 0) return;
        const on = live && i === act, ha = on ? 1 : 0.3;
        [[1, 1], [-1, 1]].forEach(([sg], k) => { if ((i === 0 && sg < 0) || (i === n - 1 && sg > 0)) return;
          const hx = x + sg * H[i][0], hy = y + sg * H[i][1];
          withAlpha(ha * pop, () => { ink([[x, y], [hx, hy]], { w: K.lw(o, 1.4), color: PAL.peri, amp: 0.2, seed: seed + 10 + i * 2 + k });
            ink(shape.circle(hx, hy, 5.5, 12), { closed: true, w: K.lw(o, 1.6), color: PAL.peri, fill: on ? PAL.peri : '#ffffff', amp: 0.1 }); }); });
        const s = 7 * pop; ink(shape.rect(x - s, y - s, 2 * s, 2 * s), { color: ic, closed: true, w: K.lw(o, 1.8), fill: on ? ic : '#ffffff', amp: 0.2, seed: seed + 30 + i });
      });
      if (!live) return;
      const last = A[n - 1], fx = last[0] + 20 + 30 * Math.sin(t * 0.8), fy = last[1] + 120 + 16 * Math.cos(t * 1.1);
      ink([[last[0], last[1]], [fx, fy]], { w: K.lw(o, 1.4), color: PAL.peri, dash: [6, 6], amp: 0.2, alpha: 0.8 });
      const P0 = A[(act + n - 1) % n], P1 = A[act], m = E.inOut3(inv(0, 0.35, f)), nx = lerp(P0[0], P1[0], m) + 16, ny = lerp(P0[1], P1[1], m) + 18;
      ctx.save(); ctx.translate(nx, ny); ctx.rotate(-0.7);
      const nib = [[0, 0], [-8, 14], [-7, 28], [7, 28], [8, 14]];
      ink(nib, { color: ic, closed: true, w: K.lw(o, 1.8), fill: '#ffffff', amp: 0.2, seed: seed + 40 });
      ink([[0, 2], [0, 14]], { w: K.lw(o, 1.2), color: PAL.ink, amp: 0 }); flat(shape.circle(0, 15, 2.4, 8), PAL.ink);
      ink(shape.rect(-8, 28, 16, 8), { color: ic, closed: true, w: K.lw(o, 1.6), fill: PAL.ink, amp: 0.1 });
      ctx.restore();
    });
  }

  return { easel, brush, swatches, wireframe, penTool };
})();
