/* =====================  KIT.earth · sea, coast, mountains, forest, strata, weather  =====================
   Paper-world scenery. Box components (sea, coast, mountains, strata, weather) take x, y = top-left and w, h.
   forest takes x, y = left end of its ground line. See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  earthSea: '#2f7f98', earthSeaDeep: '#22657b', earthSeaLight: '#bfe3ea', earthFoam: '#e8f3f5', earthLand: '#d6cc9c', earthLandDeep: '#7d7a4a',
  earthSand: '#e2c98f', earthSandDeep: '#9c7f4a', earthRock: '#b3ab9c', earthRockFar: '#cbc4b6', earthRockDeep: '#4d4640', earthSnow: '#f7f3ea',
  earthHill: '#b9b48a', earthBark: '#6b4a32', earthLeaf: '#6f9a58', earthLeafDeep: '#3f6b3a', earthPine: '#4f7d52', earthPineDeep: '#2c4f33',
  earthSoil: '#b98457', earthSoilDeep: '#6b4426', earthGravel: '#d8c9a6', earthAquifer: '#6d9aa6', earthAquiferDeep: '#2f5c68',
  earthBedrock: '#5a5250', earthWorm: '#d98a8a', earthRain: '#5f63b0', earthRainNight: '#a9b8e8', earthMist: '#f3efe4', earthCloud: '#efe9db',
});
KIT.earth = (() => {
  const K = KIT;

  /** sea(t, {x, y, w, h, waves, glint}): open water seen from the side. (x, y) is the left end of the horizon.
      Waves drift and bob; glint: x of a sun glint column (optional). */
  function sea(t, o) {
    o = K.opts(o, { w: 800, h: 300, waves: 26, glint: null });
    return K.at(o, () => {
      const { w, h, draw, seed } = o;
      const g = K.memo(`e.sea|${w}|${h}|${seed}|${o.waves}`, () => {
        const r = mulberry(seed);
        return { poly: shape.rect(-4, 0, w + 8, h), waves: Array.from({ length: o.waves }, (_, i) => ({ u: r(), d: (i + 0.5) / o.waves, sp: 14 + r() * 22, ph: r() * TAU })) };
      });
      const fr = K.ph(draw, 0.2, 1);
      if (fr > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, (w + 20) * fr, h + 20); ctx.clip();
        flat(g.poly, PAL.earthSea);
        hatch(g.poly, { color: PAL.earthSeaLight, alpha: 0.45, gap: 9, len: 14, angle: 0.02, seed: seed + 1 });
        hatch(g.poly, { color: PAL.earthSeaDeep, alpha: 0.5, gap: 7, len: 12, angle: 0.02, seed: seed + 2, keep: (px, py) => clamp(py / h * 1.3) });
        g.waves.forEach((wv, i) => {
          const k = 0.45 + wv.d * 0.9, x = ((wv.u * (w + 120) + t * wv.sp) % (w + 120)) - 60, y = 14 + wv.d * (h - 34) + 2.5 * Math.sin(t * 1.3 + wv.ph);
          const a = 13 * k, b = 5 * k * (0.75 + 0.25 * Math.sin(t * 2 + wv.ph));
          pen([[x, y], [x + a, y - b], [x + 2 * a, y], [x + 3 * a, y - b]], { w: K.lw(o, 1.3 + k), color: PAL.earthFoam, seed: seed + 10 + i, taper: 0.3, alpha: 0.9 });
        });
        if (o.glint != null) for (let i = 0; i < 7; i++) {
          const ww = (46 - i * 5) * (0.65 + 0.35 * hash3(i, Math.floor(t * 5), seed));
          pen([[o.glint - ww / 2, 12 + i * 15], [o.glint + ww / 2, 12 + i * 15]], { w: K.lw(o, 2.6), color: PAL.gold, taper: 0.3, seed: seed + 40 + i });
        }
        ctx.restore();
      }
      pen([[-4, 0], [w + 4, 0]], { w: K.lw(o, 3.2), color: K.inkOf(o.dark), seed: seed + 3, draw: K.ph(draw, 0, 0.45), taper: 0.02 });
    });
  }

  /** coast(t, {x, y, w, h, side, land}): a map-view coastline: land with hill contours, a sand fringe and surf lines
      that breathe along the shore. side: 'left' (land on the left) or 'right'; land: 0..1 share of the width. */
  function coast(t, o) {
    o = K.opts(o, { w: 600, h: 400, side: 'left', land: 0.46 });
    return K.at(o, () => {
      const { w, h, draw, seed } = o;
      const sx = y => w * o.land + w * 0.12 * vnoise(y * 0.012, seed) + w * 0.05 * vnoise(y * 0.04, seed + 5);
      const g = K.memo(`e.coast|${w}|${h}|${seed}|${o.land}`, () => {
        const shore = []; for (let y = -12; y <= h + 12; y += 8) shore.push([sx(y), y]);
        const off = d => shore.map(([x, y]) => [x + d, y]);
        const r = mulberry(seed + 7), hx = w * o.land * 0.48, hy = h * (0.35 + r() * 0.3);
        return { shore, surf: [0, 1, 2, 3], off, land: [[-12, -12], ...shore, [-12, h + 12]], sand: [...shore, ...off(-22).reverse()],
          hills: [0, 1, 2].map(k => shape.blob(hx, hy, Math.min(w * o.land * 0.36, h * 0.3) * (1 - k * 0.3), seed + 20 + k, 0.25, 48)),
          ticks: Array.from({ length: 10 }, () => [r(), r(), r()]), box: shape.rect(-2, -2, w + 4, h + 4) };
      });
      ctx.save();
      if (o.side === 'right') { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.beginPath(); ctx.rect(-2, -2, (w + 4) * K.ph(draw, 0.05, 0.85), h + 4); ctx.clip();
      flat(g.box, PAL.earthSea);
      hatch(g.box, { color: PAL.earthSeaLight, alpha: 0.35, gap: 10, len: 14, angle: 0.02, seed: seed + 1 });
      hatch(g.box, { color: PAL.earthSeaDeep, alpha: 0.5, gap: 7, len: 12, angle: 0.02, seed: seed + 2, keep: (px, py) => clamp((px - sx(py)) / (w * 0.45)) });
      g.ticks.forEach(([u, v, p], i) => {                                        // little wave marks drifting offshore
        const x = sx(v * h) + 60 + ((u * (w - sx(v * h)) + t * 10) % Math.max(60, w - sx(v * h) - 60)), y = v * h + 3 * Math.sin(t + p * 6);
        pen([[x, y], [x + 8, y - 4], [x + 16, y], [x + 24, y - 4]], { w: K.lw(o, 1.6), color: PAL.earthFoam, alpha: 0.75, seed: seed + 60 + i, taper: 0.3 });
      });
      g.surf.forEach(k => ink(g.off(12 + k * 15 + 4 * Math.sin(t * 1.6 - k * 0.9)), { w: K.lw(o, 1.8 - k * 0.3), color: PAL.earthFoam, alpha: 0.95 - k * 0.2, amp: 0.8, seed: seed + 30 + k, dash: k ? [12, 9] : null }));
      flat(g.land, PAL.earthLand);
      hatch(g.land, { color: PAL.earthLandDeep, alpha: 0.22, gap: 8, len: 12, angle: 0.5, seed: seed + 3 });
      stipple(g.land, Math.round(w * h / 300), { seed: seed + 4, alpha: 0.22 });
      flat(g.sand, PAL.earthSand); stipple(g.sand, Math.round(h * 1.6), { seed: seed + 5, alpha: 0.35, color: PAL.earthSandDeep });
      g.hills.forEach((p, k) => ink(p, { closed: true, w: K.lw(o, 1.4), color: PAL.earthSandDeep, alpha: 0.75, amp: 0.8, seed: seed + 40 + k }));
      pen(g.shore, { w: K.lw(o, 3), color: K.inkOf(o.dark), seed: seed + 6, taper: 0.02 });
      ctx.restore();
    });
  }

  function peak(cx, base, pw, ph, seed) {
    const r = mulberry(seed), pts = [];
    for (let k = 0; k <= 12; k++) { const u = k / 6 - 1, j = (k === 0 || k === 12 || k === 6) ? 0 : (r() - 0.5) * ph * 0.12; pts.push([cx + u * pw / 2, base - ph * (1 - Math.abs(u)) ** 1.15 + j]); }
    const poly = [...pts, [cx + pw / 2, base + 40], [cx - pw / 2, base + 40]];
    const snow = pts.filter(([, y]) => y < base - ph * 0.62); let cap = null;
    if (snow.length > 1) { const zig = [], a = snow[0][0], b = snow[snow.length - 1][0];
      for (let k = 0; k <= 6; k++) zig.push([lerp(b, a, k / 6) + (k % 6 ? (r() - 0.5) * pw * 0.04 : 0), base - ph * (0.66 + (k % 2 ? -0.05 - r() * 0.05 : 0.02 + r() * 0.04))]); cap = [...snow, ...zig]; }
    return { pts, poly, cap, apex: pts[6] };
  }
  /** mountains(t, {x, y, w, h, n, bleed, seed}): a range with a paler back row, snowcaps, foothills, drifting mist and
      snow blowing off the tallest peak. Peaks stand on the box's bottom edge and end inside the box; bleed: true lets
      the range run past its sides (for a range that continues off frame). */
  function mountains(t, o) {
    o = K.opts(o, { w: 700, h: 360, n: 3, bleed: false });
    return K.at(o, () => {
      const { w, h, n, draw, seed } = o;
      const g = K.memo(`e.mtn|${w}|${h}|${n}|${seed}|${o.bleed}`, () => {
        const r = mulberry(seed);
        const fit = (cx, pw) => o.bleed ? pw : Math.min(pw, 2 * cx - 8, 2 * (w - cx) - 8);   // without bleed every slope ends inside the box
        const back = Array.from({ length: n + 1 }, (_, i) => { const cx = o.bleed ? (i + 0.1 + r() * 0.3) / n * w : lerp(0.14, 0.86, i / n) * w + (r() - 0.5) * w / n * 0.2;
          return peak(cx, h - h * 0.1, fit(cx, w / n * 1.5), h * (0.45 + r() * 0.15), seed + 10 + i); });
        const front = Array.from({ length: n }, (_, i) => { const cx = (i + 0.5) / n * w + (r() - 0.5) * w / n * 0.3;
          return peak(cx, h, fit(cx, w / n * 1.45), h * (0.66 + r() * 0.3), seed + 30 + i); });
        const top = front.reduce((a, b) => b.apex[1] < a.apex[1] ? b : a);
        const foot = o.bleed ? shape.ridge(-40, w + 40, h - h * 0.1, h * 0.04, seed + 50, 0.01, 16)
          : shape.ridge(0, w, h, h * 0.04, seed + 50, 0.01, 16).map(([x, y]) => [x, h - (h - y + h * 0.1) * Math.sin(Math.PI * x / w) ** 0.6]);
        return { back, front, top, foot, footPoly: shape.band(foot, h + 60), mist: [0, 1, 2].map(i => ({ y: h * (0.42 + i * 0.16), L: w * (0.22 + r() * 0.12), sp: 9 + i * 5, u: r() })) };
      });
      ctx.save(); ctx.beginPath(); ctx.rect(o.bleed ? -60 : 0, -h, w + (o.bleed ? 120 : 0), h * 2); ctx.clip();
      const fa = K.ph(draw, 0.3, 0.8), ic = K.inkOf(o.dark);
      g.back.forEach((p, i) => {
        withAlpha(fa * 0.8, () => { flat(p.poly, PAL.earthRockFar); shade(p.poly, { color: PAL.earthRockDeep, seed: seed + 60 + i, alpha: 0.25, light: [-0.8, -0.5] }); if (p.cap) ink(p.cap, { closed: true, w: K.lw(o, 1), color: ic, fill: PAL.earthSnow, amp: 0.5, alpha: 0.8, seed: seed + 70 + i }); });
        pen(p.pts, { w: K.lw(o, 1.8), color: ic, alpha: 0.6, seed: seed + 80 + i, taper: 0.05, draw: K.ph(draw, 0, 0.5) });
      });
      g.mist.slice(0, 1).forEach((m, i) => mistBand(t, m, w, o, i));
      g.front.forEach((p, i) => {
        withAlpha(fa, () => { flat(p.poly, PAL.earthRock); shade(p.poly, { color: PAL.earthRockDeep, seed: seed + 90 + i, alpha: 0.42, light: [-0.8, -0.5] });
          hatch(p.poly, { color: PAL.earthRockDeep, alpha: 0.18, gap: 11, len: 7, angle: 1.25, seed: seed + 95 + i });
          if (p.cap) ink(p.cap, { closed: true, w: K.lw(o, 1.4), color: ic, fill: PAL.earthSnow, amp: 0.6, seed: seed + 100 + i }); });
        pen(p.pts, { w: K.lw(o, 2.8), color: ic, seed: seed + 110 + i, taper: 0.05, draw: K.ph(draw, 0.05 + i * 0.1, 0.55 + i * 0.1) });
      });
      withAlpha(fa, () => { flat(g.footPoly, PAL.earthHill); hatch(g.footPoly, { color: '#6b6a3f', alpha: 0.28, gap: 7, len: 10, angle: 0.5, seed: seed + 120 }); });
      pen(g.foot, { w: K.lw(o, 2.4), color: ic, seed: seed + 121, taper: 0.02, draw: K.ph(draw, 0.3, 0.9) });
      g.mist.slice(1).forEach((m, i) => mistBand(t, m, w, o, i + 1));
      ctx.restore();
      if (draw >= 1) {                                                          // snow blowing off the tallest summit
        const [ax, ay] = g.top.apex;
        for (let i = 0; i < 9; i++) { const u = (t * 0.45 + i / 9) % 1, x = ax + 6 + u * 130, y = ay + 4 - u * 16 + 5 * Math.sin(t * 2 + i * 1.7);
          pen([[x, y], [x + 10 + u * 8, y - 1]], { w: K.lw(o, 1.5), color: o.dark ? PAL.nightInk : PAL.inkSoft, alpha: 0.55 * Math.sin(Math.PI * u), seed: seed + 130 + i, taper: 0.4 }); }
      }
    });
  }
  function mistBand(t, m, w, o, i) {
    const x = ((m.u * (w + 2 * m.L) + t * m.sp) % (w + 2 * m.L)) - m.L, y = m.y + 3 * Math.sin(t * 0.7 + i);
    const cx = x + m.L / 2, edge = o.bleed ? 1 : clamp(Math.min(cx, w - cx) / (m.L * 0.7));   // fade out at the box sides instead of a hard crop
    withAlpha(K.ph(o.draw, 0.6, 1) * edge, () => {
      [[0, 0.95, 0, 11], [0.25, 0.8, -8, 8], [0.1, 0.55, 8, 7]].forEach(([a, b, dy, ww], k) =>
        pen([[x + m.L * a, y + dy], [x + m.L * (a + b) * 0.5, y + dy - 2], [x + m.L * b, y + dy]], { w: ww, color: PAL.earthMist, alpha: 0.85, seed: o.seed + 160 + i * 3 + k, taper: 0.45 }));
      pen([[x + m.L * 0.12, y + 9], [x + m.L * 0.88, y + 9]], { w: K.lw(o, 1.4), color: K.mutedOf(o.dark), alpha: 0.6, seed: o.seed + 140 + i, taper: 0.4 });
    });
  }

  function roundTree(t, s, seed, g, ic) {
    const sw = 3 * s * Math.sin(t * 1.3 + seed), cx = sw, cy = -88 * s;
    pen([[0, 4], [sw * 0.3, -40 * s], [cx, cy + 10 * s]], { w: 5.5 * s, color: PAL.earthBark, seed, taper: 0.3 });
    const c = g.map(([x, y]) => [x + cx, y]);
    ink(c, { closed: true, w: 2.4, color: ic, fill: PAL.earthLeaf, amp: 1, seed: seed + 1 });
    shade(c, { color: PAL.earthLeafDeep, seed: seed + 2, alpha: 0.55 });
  }
  function pineTree(t, s, seed, tiers, ic) {
    const sw = 3.5 * s * Math.sin(t * 1.2 + seed), bend = ([x, y]) => [x + sw * clamp(-y / (150 * s)), y];
    pen([[0, 4], [sw * 0.1, -30 * s]], { w: 5 * s, color: PAL.earthBark, seed, taper: 0.3 });
    tiers.forEach((p, k) => { const q = p.map(bend); ink(q, { closed: true, w: 2.2, color: ic, fill: PAL.earthPine, amp: 0.8, seed: seed + k });
      hatch(q, { color: PAL.earthPineDeep, alpha: 0.55, gap: 4.5, len: 8, angle: -0.9, w: 1.4, seed: seed + 10 + k, keep: (px) => clamp(0.15 + (px - sw * 0.5) / (40 * s)) }); });
  }
  /** forest(t, {x, y, w, h, n, seed}): a row of round and pointed trees on a grassy ground line; trees grow in one by
      one on draw and sway. (x, y) is the left end of the ground; h is the tallest tree's height. */
  function forest(t, o) {
    o = K.opts(o, { w: 600, h: 150, n: 7 });
    return K.at(o, () => {
      const { w, h, n, draw, seed } = o;
      const g = K.memo(`e.forest|${w}|${h}|${n}|${seed}`, () => {
        const r = mulberry(seed), ground = shape.ridge(-10, w + 10, 0, 5, seed, 0.01, 14);
        const trees = Array.from({ length: n }, (_, i) => { const s = h / 150 * (0.6 + r() * 0.4) * (i % 2 ? 0.85 : 1), pine = r() < 0.45, x = (i + 0.5) / n * w + (r() - 0.5) * w / n * 0.5;
          return { x, y: (i % 2 ? -8 : 2) * h / 150, s, pine, back: i % 2, seed: seed + 20 + i * 7,
            canopy: shape.blob(0, -88 * s, 44 * s, seed + 20 + i * 7, 0.28, 40),
            tiers: [0, 1, 2].map(k => { const y0 = -(26 + k * 34) * s, bw = (44 - k * 10) * s, th = (62 - k * 6) * s;
              return [[-bw, y0], [-bw * 0.55, y0 - th * 0.35], [-bw * 0.7, y0 - th * 0.3], [0, y0 - th], [bw * 0.7, y0 - th * 0.3], [bw * 0.55, y0 - th * 0.35], [bw, y0]]; }) }; })
          .sort((a, b) => a.y - b.y);
        return { ground, trees };
      });
      g.trees.forEach((tr, i) => {
        const gr = K.pop(draw, 0.1 + i / n * 0.55, 0.4 + i / n * 0.55); if (gr <= 0) return;
        ctx.save(); ctx.translate(tr.x, tr.y); ctx.scale(gr, gr); if (tr.back) ctx.globalAlpha *= 0.85;
        tr.pine ? pineTree(t, tr.s, tr.seed, tr.tiers, K.inkOf(o.dark)) : roundTree(t, tr.s, tr.seed, tr.canopy, K.inkOf(o.dark));
        ctx.restore();
      });
      pen(g.ground, { w: K.lw(o, 3.6), color: K.inkOf(o.dark), seed: seed + 1, taper: 0.02, draw: K.ph(draw, 0, 0.4) });
      grass(g.ground, { every: 26, h: 13, seed: seed + 2, draw: K.ph(draw, 0.2, 0.8), sway: 3 });
    });
  }

  /** strata(t, {x, y, w, h, seed, labels}): an underground cutaway: grass, topsoil with roots and a worm, gravel,
      an aquifer with creeping groundwater, bedrock. Layers reveal top to bottom on draw. */
  function strata(t, o) {
    o = K.opts(o, { w: 600, h: 380, labels: true });
    return K.at(o, () => {
      const { w, h, draw, seed } = o;
      const g = K.memo(`e.strata|${w}|${h}|${seed}`, () => {
        const a = -10, b = w + 10, R = [shape.ridge(a, b, 0, 6, seed, 0.006, 12), shape.ridge(a, b, h * 0.24, 8, seed + 1, 0.006, 12),
          shape.ridge(a, b, h * 0.47, 9, seed + 2, 0.006, 12), shape.ridge(a, b, h * 0.72, 8, seed + 3, 0.006, 12)];
        const r = mulberry(seed + 9);
        return { R, soil: shape.between(R[0], R[1]), grav: shape.between(R[1], R[2]), aq: shape.between(R[2], R[3]), rock: shape.band(R[3], h),
          water: [shape.ridge(a, b, h * 0.555, 5, seed + 4, 0.008, 12), shape.ridge(a, b, h * 0.64, 5, seed + 5, 0.008, 12)],
          roots: Array.from({ length: 4 }, (_, i) => { const x = w * (0.12 + i * 0.25 + r() * 0.06); return smooth([[x, 2], [x + (r() - 0.5) * 20, h * 0.08], [x + (r() - 0.5) * 36, h * 0.15], [x + (r() - 0.5) * 44, h * 0.2]], 2); }) };
      });
      ctx.save(); ctx.beginPath(); ctx.rect(-4, -40, w + 8, (h + 44) * K.ph(draw, 0.05, 0.9)); ctx.clip();
      ctx.beginPath(); ctx.rect(-4, -40, w + 8, h + 40); ctx.clip();
      flat(g.soil, PAL.earthSoil); hatch(g.soil, { color: PAL.earthSoilDeep, alpha: 0.35, gap: 5, len: 10, angle: 0.1, seed: seed + 10 });
      stipple(g.soil, Math.round(w * 1.2), { seed: seed + 11, alpha: 0.3 });
      g.roots.forEach((p, i) => pen(p, { w: K.lw(o, 2.2), color: PAL.earthBark, seed: seed + 12 + i, taper: 0.6 }));
      flat(g.grav, PAL.earthGravel); pebbles(g.grav, Math.round(w * h / 1400), { seed: seed + 13, alpha: 0.5, rmin: 5, rmax: 13 });
      flat(g.aq, PAL.earthAquifer); hatch(g.aq, { color: PAL.earthAquiferDeep, alpha: 0.5, gap: 6, len: 16, angle: 0.02, seed: seed + 14 });
      flat(g.rock, PAL.earthBedrock); scribble(g.rock, { color: '#2b2523', alpha: 0.4, gap: 12, seed: seed + 15, angle: 0.5 });
      hatch(g.rock, { color: '#2b2523', alpha: 0.3, gap: 14, len: 8, angle: 1.45, seed: seed + 16 });
      g.water.forEach((p, i) => flow(p, t + i * 1.7, { speed: 24, gap: 130, len: 40, color: '#e8f3f5', w: K.lw(o, 2.2), alpha: 0.75, seed: seed + 17 + i }));
      const wx = ((t * 16 + seed * 37) % (w + 120)) - 60;                       // an earthworm tunnelling through the topsoil
      for (let k = 7; k >= 0; k--) { const x = wx - k * 7, y = h * 0.12 + 5 * Math.sin(x * 0.06 - t * 3);
        ink(shape.circle(x, y, 5.2 - k * 0.35, 12), { closed: true, w: K.lw(o, 1.1), color: PAL.ink, fill: PAL.earthWorm, amp: 0.2, seed: seed + 30 + k }); }
      [1, 2, 3].forEach(k => pen(g.R[k], { w: K.lw(o, 2), color: PAL.ink, seed: seed + 20 + k, taper: 0.02, alpha: 0.8 }));
      grass(g.R[0], { every: 22, h: 14, seed: seed + 25, sway: 3 });
      pen(g.R[0], { w: K.lw(o, 3.6), color: K.inkOf(o.dark), seed: seed + 24, taper: 0.02 });
      if (o.labels) [['TOPSOIL', 0.14, PAL.ink, PAL.earthSoil], ['GRAVEL', 0.36, PAL.ink, PAL.earthGravel], ['AQUIFER', 0.6, PAL.earthFoam, PAL.earthAquifer], ['BEDROCK', 0.88, '#e4d9bd', PAL.earthBedrock]].forEach(([s, v, c, bg], i) => {
        const a = clamp((draw - 0.5 - i * 0.08) * 4), lw = measure(s, { kind: 'mono', size: 13, weight: 600, ls: 3 });   // a patch of the layer's own colour keeps the name legible
        if (a > 0) flat(K.rrect(w - 22 - lw, h * v - 11, lw + 16, 22, 5), bg, 0.9 * a);
        text(typed(s, (draw - 0.5 - i * 0.08) * 4, 12), w - 14, h * v + 5, { kind: 'mono', size: 13, weight: 600, ls: 3, align: 'right', color: c });
      });
      ctx.restore();
    });
  }

  /** weather(t, {x, y, w, h, kind, n, cloud, seed}): kind 'rain' (streaks and splashes), 'snow' (turning flakes that
      drift) or 'wind' (gust lines that curl, with tumbling leaves). cloud: draw a cloud at the top (default for rain/snow). */
  function weather(t, o) {
    o = K.opts(o, { w: 420, h: 360, kind: 'rain', n: null, cloud: null });
    return K.at(o, () => {
      const { w, h, draw, seed, kind, dark } = o, cloud = o.cloud ?? kind !== 'wind', cb = cloud ? h * 0.3 : 0, ic = K.inkOf(dark), rain = dark ? PAL.earthRainNight : PAL.earthRain;
      const g = K.memo(`e.wx|${w}|${h}|${seed}|${kind}|${o.n}`, () => {
        const r = mulberry(seed), N = o.n ?? (kind === 'snow' ? 26 : kind === 'rain' ? 24 : 5);
        const drops = Array.from({ length: N }, () => ({ x: lerp(w * 0.12, w * 0.88, r()), ph: r(), sz: 5 + r() * 4 }));
        const gusts = Array.from({ length: N }, (_, i) => { const y = lerp(h * 0.14, h * 0.86, i / Math.max(1, N - 1)) + (r() - 0.5) * 12, x0 = r() * w * 0.15, x1 = w * (0.62 + r() * 0.25), rr = 12 + r() * 10, pts = [];
          for (let x = x0; x <= x1; x += 10) pts.push([x, y + 7 * Math.sin(x * 0.02 + i)]);
          const [ex, ey] = pts[pts.length - 1];
          for (let k = 1; k <= 22; k++) { const a = Math.PI / 2 - k / 22 * TAU * 1.1, R = rr * (1 - k / 32); pts.push([ex + Math.cos(a) * R, ey - rr + Math.sin(a) * R]); }   // curl up and over
          return smooth(pts, 2); });
        const s = w / 420;
        return { drops, gusts, bumps: [[0, 70 * s], [-100 * s, 52 * s], [96 * s, 58 * s], [30 * s, 50 * s, 30 * s], [-50 * s, 44 * s, 26 * s]] };
      });
      if (cloud) lobedCloud(w / 2 + 10 * Math.sin(t * 0.4), cb, g.bumps, { draw: K.ph(draw, 0, 0.7), seed: seed + 3, color: ic, fill: kind === 'snow' ? '#e6e4e0' : PAL.earthCloud });
      const pa = K.ph(draw, 0.5, 1);
      if (pa <= 0) return;
      withAlpha(pa, () => {
        if (kind === 'rain') g.drops.forEach((d, i) => {
          const u = (t * 1.25 + d.ph) % 1, y = lerp(cb + 4, h - 30, u);
          pen([[d.x, y], [d.x - 6, y + 38]], { w: K.lw(o, 3.2), color: rain, seed: seed + 10 + i, taper: 0.35, alpha: Math.sin(Math.PI * u) ** 0.5 });
          const q = ((t * 1.25 + d.ph + 0.08) % 1); if (q < 0.22) { const e = q / 0.22;
            const sx2 = d.x - 6; ink([[sx2 - 10 - 10 * e, h], [sx2 + 10 + 10 * e, h]], { w: K.lw(o, 1.6), color: rain, alpha: (1 - e) * 0.8, amp: 0.3, seed: seed + 70 + i });
            for (const sg of [-1, 1]) pen([[sx2 + sg * 3, h - 2], [sx2 + sg * (7 + 12 * e), h - 6 - 12 * Math.sin(Math.PI * e)]], { w: K.lw(o, 2.2), color: rain, alpha: 1 - e, seed: seed + 40 + i, taper: 0.3 }); }
        });
        if (kind === 'snow') g.drops.forEach((d, i) => {
          const u = (t * 0.2 + d.ph) % 1, y = lerp(cb + 4, h - 8, u), x = d.x + 16 * Math.sin(t * 1.1 + d.ph * 9), a = t * 1.2 + d.ph * 6;
          withAlpha(Math.sin(Math.PI * u) ** 0.4, () => { for (let k = 0; k < 3; k++) { const c = Math.cos(a + k * Math.PI / 3) * d.sz, s = Math.sin(a + k * Math.PI / 3) * d.sz;
            ink([[x - c, y - s], [x + c, y + s]], { w: K.lw(o, 1.6), color: dark ? PAL.nightInk : PAL.peri, amp: 0.3, seed: seed + 60 + i * 3 + k }); } });
        });
        if (kind === 'wind') {
          g.gusts.forEach((p, i) => { ink(p, { w: K.lw(o, 1.4), color: dark ? PAL.nightMuted : PAL.inkSoft, alpha: 0.35, amp: 0.6, seed: seed + 80 + i });
            flow(p, t * 1.0 + i * 0.9, { speed: 150, gap: 200, len: 120, color: ic, w: K.lw(o, 3), alpha: 0.9, seed: seed + 90 + i }); });
          for (let i = 0; i < 4; i++) { const p = g.gusts[i % g.gusts.length], [x, y] = along(p, (t * 0.12 + i / 4) % 1), a = t * 4 + i;
            const leaf = KIT.rot(shape.ellipse(x, y, 13, 6, 0, 16), a, x, y);
            ink(leaf, { closed: true, w: K.lw(o, 1.3), color: ic, fill: i % 2 ? PAL.earthLeaf : PAL.sun, amp: 0.3, seed: seed + 100 + i }); }
        }
      });
    });
  }

  return { sea, coast, mountains, forest, strata, weather };
})();
