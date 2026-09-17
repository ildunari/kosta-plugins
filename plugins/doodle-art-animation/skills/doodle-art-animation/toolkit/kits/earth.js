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
Object.assign(PAL, {                                                         // river, volcano, cave, dunes, iceberg, flowers
  earthMeadow: '#c9c690', earthMeadowDeep: '#7d7a4a', earthVolcano: '#8d7c6c', earthVolcanoDeep: '#3d3330', earthLava: '#e0662f',
  earthLavaDeep: '#9a3418', earthLavaCore: '#f6d36a', earthSmoke: '#b9b3aa', earthSmokeDeep: '#5a5450', earthCave: '#2e2622',
  earthCaveDeep: '#201a17', earthDune: '#e6c68a', earthDuneFar: '#eed9b0', earthDuneLee: '#9c6f3a', earthIce: '#f5f9fa',
  earthIceDeep: '#6fa7bb', earthIceUnder: '#bfe0e8', earthPetal: '#fbf7ee', earthTulip: '#c8442e',
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

  /* ------------------------------------------------------------------ river */
  /** river(t, {x, y, w, h, from, to, width, bends, land, seed}): a river winding through its box, narrow where it
      rises (from) and wide where it arrives (to), so it recedes into the distance. from / to: [u, v] fractions of the
      box; width: [start, end] in px. Dashes and ripples run downstream, reeds sway on the banks, foam rings rocks.
      land: false draws only the water and its banks (to lay it over your own ground). */
  function river(t, o) {
    o = K.opts(o, { w: 600, h: 420, from: [0.62, 0], to: [0.38, 1], width: [18, 150], bends: 1.6, land: true });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, ic = K.inkOf(o.dark);
      const g = K.memo(`e.river|${w}|${h}|${o.from}|${o.to}|${o.width}|${o.bends}|${seed}`, () => {
        const r = mulberry(seed), N = 48, ph = r() * TAU, [u0, v0] = o.from, [u1, v1] = o.to;
        const mid = Array.from({ length: N + 1 }, (_, i) => { const v = i / N, e = v ** 1.15;
          return [lerp(u0, u1, e) * w + w * 0.14 * Math.sin(v * PI_ * o.bends + ph) * (0.35 + v), lerp(v0, v1, v) * h + (i === 0 ? -6 : i === N ? 6 : 0)]; });
        const half = mid.map((_, i) => lerp(o.width[0], o.width[1], (i / N) ** 1.4) / 2);
        const side = d => mid.map((p, i) => { const a = mid[Math.max(0, i - 1)], b = mid[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, hw = half[i] * d;
          return [p[0] - dy / l * hw, p[1] + dx / l * hw]; });
        const L = side(1), R = side(-1), L2 = side(1.25), R2 = side(-1.25);
        const rocks = [0.45, 0.72, 0.86].map((v, k) => { const i = Math.round(v * N), q = (r() - 0.5) * 0.9; return { i, x: lerp(mid[i][0], L[i][0], q), y: lerp(mid[i][1], L[i][1], q), rr: half[i] * (0.12 + r() * 0.08) }; });
        const reeds = Array.from({ length: 7 }, (_, k) => { const i = Math.round((0.3 + r() * 0.68) * N), sd = r() < 0.5 ? L2 : R2; return { p: sd[i], s: 0.5 + (i / N) * 0.9, ph: r() * TAU }; });
        return { mid, half, L, R, L2, R2, rocks, reeds, N, lanes: [-0.45, -0.1, 0.25, 0.55].map(d => side(d)), box: shape.rect(0, 0, w, h) };
      });
      const reveal = K.ph(draw, 0.1, 0.9), n = Math.max(2, Math.round(g.N * reveal) + 1), cut = p => p.slice(0, n);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      if (o.land) withAlpha(K.ph(draw, 0, 0.35), () => { flat(g.box, PAL.earthMeadow); hatch(g.box, { color: PAL.earthMeadowDeep, alpha: 0.28, gap: 8, len: 11, angle: 0.15, seed: seed + 1 });
        stipple(g.box, Math.round(w * h / 260), { seed: seed + 2, alpha: 0.25 }); });
      if (n > 2) {
        const bank = [...cut(g.L2), ...cut(g.R2).reverse()], water = [...cut(g.L), ...cut(g.R).reverse()];
        flat(bank, PAL.earthSand); stipple(bank, Math.round(w * 1.5), { seed: seed + 3, alpha: 0.4, color: PAL.earthSandDeep });
        flat(water, PAL.earthSea);
        hatch(water, { color: PAL.earthSeaLight, alpha: 0.45, gap: 8, len: 13, angle: 0.03, seed: seed + 4 });
        hatch(water, { color: PAL.earthSeaDeep, alpha: 0.5, gap: 6, len: 10, angle: 0.03, seed: seed + 5, keep: (px, py) => clamp(py / h * 1.1) });
        g.lanes.forEach((ln, k) => flow(cut(ln), t + k * 0.8, { speed: 34 + k * 6, gap: 90 + k * 10, len: 30, color: PAL.earthFoam, w: K.lw(o, 1.4 + k * 0.3), alpha: 0.85, seed: seed + 10 + k }));
        for (let k = 0; k < 9; k++) { const u = ((t * 0.05 + k / 9) % 1), i = Math.floor(u * g.N); if (i >= n - 1) continue;
          const [mx, my] = g.lanes[k % 4][i], sz = g.half[i] * 0.22 + 2, fade = Math.sin(PI_ * u);
          pen([[mx - sz, my - sz * 0.3], [mx, my + sz * 0.25], [mx + sz, my - sz * 0.3]], { w: K.lw(o, 1.2 + sz * 0.05), color: PAL.earthFoam, alpha: 0.8 * fade, seed: seed + 20 + k, taper: 0.3 }); }
        g.rocks.forEach((rk, k) => { if (rk.i >= n - 1) return; const rr = rk.rr;
          ink(shape.ellipse(rk.x, rk.y + rr * 0.35, rr * 1.9 + 2 * Math.sin(t * 2 + k), rr * 0.8, 0, 18), { closed: true, w: K.lw(o, 1.4), color: PAL.earthFoam, alpha: 0.85, amp: 0.6, seed: seed + 30 + k });
          ink(shape.blob(rk.x, rk.y, rr, seed + 33 + k, 0.25, 14), { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.earthRock, amp: 0.4, seed: seed + 36 + k }); });
        [g.L, g.R].forEach((sd, k) => pen(cut(sd), { w: K.lw(o, 2.6), color: ic, seed: seed + 40 + k, taper: 0.05, pressure: u => 0.35 + 0.65 * u }));
        [g.L2, g.R2].forEach((sd, k) => grass(cut(sd), { every: 22, h: 10, seed: seed + 44 + k, draw: K.ph(draw, 0.4, 1), sway: 2 }));
      }
      withAlpha(K.ph(draw, 0.6, 1), () => g.reeds.forEach((rd, k) => { const [bx, by] = rd.p, s = rd.s, sw = 4 * s * Math.sin(t * 1.4 + rd.ph);
        for (let j = -1; j <= 1; j++) { const tip = [bx + j * 5 * s + sw * (1 + j * 0.2), by - (34 + j * 6) * s];
          pen([[bx + j * 2 * s, by], [bx + j * 3 * s + sw * 0.4, by - 16 * s], tip], { w: K.lw(o, 1.8), color: PAL.earthLeafDeep, seed: seed + 50 + k * 3 + j, taper: 0.4 });
          if (j === 0) ink(shape.ellipse(tip[0], tip[1] + 5 * s, 2.4 * s, 6 * s, sw * 0.03, 10), { closed: true, w: K.lw(o, 1), color: ic, fill: PAL.earthBark, amp: 0.2, seed: seed + 60 + k }); } }));
      ctx.restore();
    });
  }
  const PI_ = Math.PI;

  /* ------------------------------------------------------------------ volcano */
  /** volcano(t, {x, y, w, h, erupt, wind, plume, seed}): a cone standing on the ground at (x, y) with a glowing crater,
      lava runs creeping down its flanks, a plume of smoke puffs that swell and drift, and embers thrown from the vent.
      erupt: 0 (quiet: a thin steam wisp) to 1 (full plume and embers). wind bends the plume; plume scales how high it
      climbs (1 reaches about 1.4 h above the crater, so lower it where there is less sky). */
  function volcano(t, o) {
    o = K.opts(o, { w: 520, h: 300, erupt: 1, wind: 1, plume: 1 });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, ic = K.inkOf(o.dark), er = clamp(o.erupt), cw = w * 0.13;
      const g = K.memo(`e.volc|${w}|${h}|${seed}`, () => {
        const r = mulberry(seed), slope = (sd) => Array.from({ length: 9 }, (_, i) => { const u = i / 8, x = sd * lerp(cw / 2, w / 2, u);
          return [x + (i && i < 8 ? (r() - 0.5) * w * 0.03 : 0), -h * (1 - u) ** 1.7 + (i && i < 8 ? (r() - 0.5) * h * 0.05 : 0)]; });
        const Lf = slope(-1), Rt = slope(1), rim = [[-cw / 2, -h], [-cw * 0.25, -h + h * 0.045], [cw * 0.2, -h + h * 0.05], [cw / 2, -h]];
        const cone = smooth([...Lf.slice().reverse(), ...rim.slice(1, 3), ...Rt], 2).concat([[w / 2 + 10, 12], [-w / 2 - 10, 12]]);
        const surf = x => -h * (1 - clamp((Math.abs(x) - cw / 2) / (w / 2 - cw / 2))) ** 1.7;   // the cone's face under x
        const runs = [[-0.25, -1, 0.1, 0.55], [0.12, 1, 0.06, 0.72], [0.3, 1, 0.16, 0.45]].map(([dx, sd, reach, fall], k) => { const pts = [];   // down the face, toward us
          for (let i = 0; i <= 14; i++) { const u = i / 14, x = cw * dx + sd * u * w * reach + Math.sin(u * 9 + k * 2) * 8 * u;
            pts.push([x, Math.max(surf(x) + 9 + u * 6, -h + 5 + u * h * fall)]); }
          return smooth(pts, 2); });
        const bands = [0.3, 0.55, 0.78].map((v, k) => shape.ridge(-w / 2, w / 2, -h * (1 - v) ** 1.7 * 0.9 - h * 0.05, 5, seed + 70 + k, 0.02, 14));
        return { cone, runs, bands, rim, smoke: Array.from({ length: 14 }, (_, i) => ({ ph: i / 14, dx: (r() - 0.5) * 60, r: 0.6 + r() * 0.5, sd: seed + 100 + i })) };
      });
      const ca = K.ph(draw, 0, 0.5), fa = K.ph(draw, 0.2, 0.6), glow = 0.75 + 0.25 * Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1);
      // smoke plume behind the cone's top
      const plume = K.ph(draw, 0.6, 1) * (0.35 + 0.65 * er);
      if (plume > 0) g.smoke.slice().sort((a, b) => ((t * 0.14 + b.ph) % 1) - ((t * 0.14 + a.ph) % 1)).forEach(p => {
        const u = (t * 0.14 + p.ph) % 1, R = (cw * 0.3 + u * w * 0.17) * p.r * (0.4 + 0.6 * er), x = p.dx * u + o.wind * u * u * w * 0.35 + 6 * Math.sin(t * 0.8 + p.ph * 9), y = -h - 8 - u * h * (0.9 + er * 0.5) * o.plume;
        const a = plume * clamp(u * 6) * (1 - u) ** 0.8, blob = shape.blob(x, y, R, p.sd, 0.38, 30, t * 0.2);
        withAlpha(a, () => { ink(blob, { closed: true, w: K.lw(o, 1.5), color: ic, alpha: 0.85, fill: o.dark ? '#5a5670' : PAL.earthSmoke, amp: 1.2, seed: p.sd, double: true });
          hatch(blob, { color: o.dark ? '#2a2840' : PAL.earthSmokeDeep, alpha: 0.5, gap: 4.5, len: 8, angle: -0.5, seed: p.sd + 1, keep: (px, py) => clamp((py - y) / R + 0.35) });
          if (u < 0.35 && er > 0.3) withAlpha((0.35 - u) / 0.35 * 0.55 * glow, () => hatch(blob, { color: PAL.earthLava, alpha: 0.8, gap: 4, len: 7, angle: 0.4, seed: p.sd + 2, keep: (px, py) => clamp((py - y) / R + 0.2) })); });
      });
      withAlpha(fa, () => { flat(g.cone, PAL.earthVolcano);
        shade(g.cone, { color: PAL.earthVolcanoDeep, alpha: 0.55, gap: 5, len: 9, light: [-0.9, -0.4], seed: seed + 1 });
        scribble(g.cone, { color: PAL.earthVolcanoDeep, alpha: 0.18, gap: 16, seed: seed + 2, angle: 0.9 });
        ctx.save(); trace(g.cone, true); ctx.clip();
        g.bands.forEach((b, k) => ink(b, { w: K.lw(o, 1.3), color: PAL.earthVolcanoDeep, alpha: 0.45, amp: 1.2, dash: [18, 10], seed: seed + 80 + k }));
        ctx.restore(); });
      // lava runs creep down, glowing
      g.runs.forEach((p, k) => { const d = K.ph(draw, 0.45 + k * 0.08, 0.95) * (0.45 + 0.55 * er); if (d <= 0) return;
        const part = partial(p, d), rib = KIT.ribbon(part, u => (7 - u * 4) * (1 - k * 0.15)), cool = clamp(1 - er * 1.4);   // a quiet volcano's runs have cooled dark
        flat(rib, mixColorC(PAL.earthLava, PAL.earthVolcanoDeep, cool * 0.8)); ink(rib, { closed: true, w: K.lw(o, 1.3), color: PAL.earthLavaDeep, amp: 0.4, seed: seed + 90 + k });
        flow(part, t * (0.6 + k * 0.2), { speed: 22, gap: 26, len: 12, color: PAL.earthLavaCore, w: K.lw(o, 2.4), alpha: glow * (1 - cool * 0.8), seed: seed + 95 + k }); });
      // crater glow and rim
      if (fa > 0) { const [ax, ay] = [0, -h + h * 0.02];
        [[1.5, 0.18], [1.1, 0.3], [0.7, 0.6]].forEach(([k, a]) => flat(shape.ellipse(ax, ay, cw * 0.5 * k * (0.9 + 0.1 * glow), h * 0.035 * k, 0, 20), PAL.earthLava, a * glow * fa * (0.4 + 0.6 * er)));
        flat(shape.ellipse(ax, ay + 1, cw * 0.28, h * 0.018, 0, 16), PAL.earthLavaCore, fa * glow); }
      pen(g.cone.slice(0, -2), { w: K.lw(o, 3), color: ic, seed: seed + 3, taper: 0.03, draw: ca });
      // embers thrown from the vent
      if (draw >= 1 && er > 0.2) for (let i = 0; i < 10; i++) { const [c, f] = K.cyc(t + i * 0.37, 1.9 + hash3(i, seed) * 0.8), vx = (hash3(c, i, seed) - 0.5) * w * 0.5, vy = h * (0.55 + hash3(c, i + 9, seed) * 0.45);
        if (f > 0.9) continue; const tt = f * 1.2, x = vx * tt, y = -h - vy * tt + h * 1.3 * tt * tt;
        const px = vx * (tt - 0.06), py = -h - vy * (tt - 0.06) + h * 1.3 * (tt - 0.06) ** 2;
        withAlpha(er * (1 - f / 0.9), () => { pen([[px, py], [x, y]], { w: K.lw(o, 2.2), color: PAL.earthLava, taper: 0.5, seed: seed + 120 + i });
          flat(shape.circle(x, y, 2.6, 8), PAL.earthLavaCore); }); }
      if (er < 0.2 && draw >= 1) for (let i = 0; i < 3; i++) { const u = (t * 0.25 + i / 3) % 1;
        pen([[0 + 6 * Math.sin(t + i), -h - 4 - u * 60], [4 + 10 * Math.sin(t * 1.3 + i + u * 3), -h - 20 - u * 80]], { w: K.lw(o, 2), color: o.dark ? PAL.nightInk : PAL.inkSoft, alpha: 0.5 * Math.sin(PI_ * u), seed: seed + 140 + i, taper: 0.5 }); }
    });
  }

  /* ------------------------------------------------------------------ cave */
  /** cave(t, {x, y, w, h, mouth, glow, bats, seed}): a rock face filling its box (ground along the bottom) with a
      cave mouth that falls away into darkness in steps. Stalactites hang in the mouth and drip, vines sway at its
      edge, bats flit in and out. mouth: the opening's width share (0..1); glow: a flickering fire deep inside. */
  function cave(t, o) {
    o = K.opts(o, { w: 600, h: 400, mouth: 0.5, glow: false, bats: 3 });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, ic = K.inkOf(o.dark);
      const g = K.memo(`e.cave|${w}|${h}|${o.mouth}|${seed}`, () => {
        const r = mulberry(seed), mw = w * o.mouth, mh = h * 0.62, cx = w * 0.5;
        const top = shape.ridge(-10, w + 10, h * 0.12, h * 0.07, seed, 0.012, 14);
        const face = [...top, [w + 10, h + 10], [-10, h + 10]];
        const arch = k => { const pts = []; for (let i = 0; i <= 24; i++) { const a = PI_ + i / 24 * PI_, j = 1 + (i && i < 24 ? (r() - 0.5) * 0.08 : 0);
          pts.push([cx + (1 - k) * mw * 0.12 + Math.cos(a) * mw / 2 * k * j, h - (1 - k) * mh * 0.1 + Math.sin(a) * mh * k ** 0.8 * j]); } return pts; };
        const mouth = arch(1), steps = [0.78, 0.56, 0.36].map(k => arch(k));
        const tites = Array.from({ length: 7 }, (_, i) => { const u = 0.3 + i / 6 * 0.4 + (r() - 0.5) * 0.03, p = along(mouth, u); return { x: p[0], y: p[1] + 2, len: mh * (0.07 + r() * 0.1), wd: 4 + r() * 5, drip: r() < 0.6, ph: r() }; });
        const cracks = Array.from({ length: 6 }, () => { const x0 = r() * w, y0 = h * (0.15 + r() * 0.5), pts = [[x0, y0]];
          for (let k = 0; k < 4; k++) pts.push([pts[k][0] + (r() - 0.5) * 50, pts[k][1] + 12 + r() * 22]); return pts; });
        const vines = [0.18, 0.3, 0.72, 0.84].map(u => { const p = along(mouth, u); return { p, len: Math.min(mh * (0.25 + r() * 0.25), h - p[1] - 16), ph: r() * TAU }; });
        return { face, top, mouth, steps, tites, cracks, vines, cx, mw, mh };
      });
      const fa = K.ph(draw, 0.1, 0.5), ma = K.ph(draw, 0.35, 0.8);
      withAlpha(fa, () => { flat(g.face, PAL.earthRock);
        shade(g.face, { color: PAL.earthRockDeep, alpha: 0.4, gap: 6, len: 9, light: [-0.7, -0.7], seed: seed + 1 });
        hatch(g.face, { color: PAL.earthRockDeep, alpha: 0.2, gap: 12, len: 7, angle: 1.35, seed: seed + 2 });
        g.cracks.forEach((c, k) => pen(c, { w: K.lw(o, 1.6), color: PAL.earthRockDeep, alpha: 0.7, seed: seed + 10 + k, taper: 0.5 })); });
      pen(g.top, { w: K.lw(o, 3), color: ic, seed: seed + 3, taper: 0.03, draw: K.ph(draw, 0, 0.45) });
      grass(g.top, { every: 20, h: 12, seed: seed + 4, draw: K.ph(draw, 0.3, 0.9), sway: 3 });
      if (ma > 0) withAlpha(ma, () => {
        flat(g.mouth, PAL.earthCave);
        crosshatch(g.mouth, { color: '#000', alpha: 0.35, gap: 5, len: 8, seed: seed + 5 });
        g.steps.forEach((st, k) => { flat(st, [PAL.earthCaveDeep, '#15110f', '#0b0908'][k]); hatch(st, { color: '#000', alpha: 0.4, gap: 4, len: 7, angle: 0.8 - k * 0.5, seed: seed + 6 + k }); });
        if (o.glow) { const fl = 0.7 + 0.3 * Math.sin(t * 9) * Math.sin(t * 5.3 + 1), [gx, gy] = [g.cx + g.mw * 0.1, h - 4]; ctx.save(); trace(g.mouth, true); ctx.clip();
          [[g.mw * 0.2, 0.18], [g.mw * 0.12, 0.3]].forEach(([rr, a]) => flat(shape.ellipse(gx, gy, rr * (0.9 + 0.1 * fl), rr * 0.6, 0, 20), PAL.earthLava, a * fl));
          for (let k = 0; k < 3; k++) { const hh = (14 + k * 6) * fl * (0.8 + 0.2 * Math.sin(t * 11 + k)); ink([[gx - 7 + k * 5, gy], [gx - 3 + k * 4 + 2 * Math.sin(t * 13 + k), gy - hh], [gx + k * 5, gy]], { closed: true, w: K.lw(o, 1), color: PAL.earthLavaDeep, fill: k === 1 ? PAL.earthLavaCore : PAL.earthLava, amp: 0.4, seed: seed + 15 + k }); } ctx.restore(); }
        g.steps.forEach((st, k) => ink(st, { w: K.lw(o, 1.2), color: o.dark ? PAL.nightMuted : '#5a514a', alpha: 0.55 - k * 0.12, amp: 0.8, seed: seed + 20 + k, dash: [14, 10] }));
        g.tites.forEach((s, k) => { const tri = [[s.x - s.wd, s.y - 6], [s.x - s.wd * 0.3, s.y + s.len * 0.5], [s.x + 1, s.y + s.len], [s.x + s.wd * 0.4, s.y + s.len * 0.45], [s.x + s.wd, s.y - 6]];
          flat(tri, PAL.earthRock); pen(tri.slice(0, 5), { w: K.lw(o, 1.4), color: ic, seed: seed + 30 + k, taper: 0.1, amp: 0.3 });
          hatch(tri, { color: PAL.earthRockDeep, alpha: 0.5, gap: 3.5, len: 5, angle: 1.3, seed: seed + 40 + k });
          if (s.drip) { const u = (t * 0.55 + s.ph) % 1, dy = s.y + s.len + E.in2(u) * (h - s.y - s.len);
            withAlpha(u < 0.9 ? 0.9 : (1 - u) * 9, () => ink(teardrop(s.x + 1, dy, 2.6, 12), { closed: true, w: K.lw(o, 1), color: PAL.earthSeaLight, fill: PAL.earthSeaLight, amp: 0.1, seed: seed + 50 + k }));
            if (u > 0.9) ink(shape.ellipse(s.x + 1, h - 3, 3 + (u - 0.9) * 90, 1.5 + (u - 0.9) * 20, 0, 12), { closed: true, w: K.lw(o, 1), color: PAL.earthSeaLight, alpha: (1 - u) * 10, amp: 0.2, seed: seed + 60 + k }); } });
      });
      pen(g.mouth, { w: K.lw(o, 3.2), color: ic, seed: seed + 7, taper: 0.03, draw: K.ph(draw, 0.2, 0.7) });
      pen([[-4, h], [w + 4, h]], { w: K.lw(o, 3), color: ic, seed: seed + 8, taper: 0.02, draw: K.ph(draw, 0, 0.4) });
      withAlpha(K.ph(draw, 0.6, 1), () => g.vines.forEach((v, k) => { const [vx, vy] = v.p, sw = 6 * Math.sin(t * 1.1 + v.ph), pts = [];
        for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push([vx + sw * u * u + 3 * Math.sin(u * 5 + k), vy + u * v.len]); }
        pen(pts, { w: K.lw(o, 2), color: PAL.earthLeafDeep, seed: seed + 70 + k, taper: 0.3 });
        for (let i = 1; i < 6; i++) { const [lx, ly] = pts[i], sd = i % 2 ? 1 : -1;
          ink(KIT.rot(shape.ellipse(lx + sd * 6, ly, 6, 3, 0, 10), sd * 0.5 + sw * 0.02, lx, ly), { closed: true, w: K.lw(o, 1), color: ic, fill: PAL.earthLeaf, amp: 0.2, seed: seed + 80 + k * 7 + i }); } }));
      if (draw >= 1) for (let i = 0; i < o.bats; i++) { const [c, f] = K.cyc(t + i * 1.3 + seed, 5 + i), dir = hash3(c, i, seed) < 0.5 ? 1 : -1;
        const x = g.cx + dir * (f * w * 0.7) + 30 * Math.sin(f * 9 + i), y = h - g.mh * (0.5 + 0.4 * f) - 30 * Math.sin(f * 5 + i) - f * h * 0.3, sz = 6 + f * 8, fl = Math.sin(t * 22 + i * 2);
        withAlpha(clamp(f * 8) * clamp((1 - f) * 5), () => ink([[x - sz * 1.4, y - fl * sz * 0.6], [x - sz * 0.7, y - sz * 0.1], [x - sz * 0.45, y + sz * 0.3], [x, y], [x + sz * 0.45, y + sz * 0.3], [x + sz * 0.7, y - sz * 0.1], [x + sz * 1.4, y - fl * sz * 0.6], [x + sz * 0.5, y - sz * 0.35], [x, y - sz * 0.2], [x - sz * 0.5, y - sz * 0.35]],
          { closed: true, w: K.lw(o, 1.2), color: ic, fill: '#2b2220', amp: 0.2, seed: seed + 90 + i })); }
    });
  }

  /* ------------------------------------------------------------------ dunes */
  /** dunes(t, {x, y, w, h, rows, wind, seed}): desert dunes in rows that pale with distance: gentle windward slopes,
      shaded slip faces, sand ripples that creep downwind and sand blowing off the crests. wind: +1 blows right, -1 left. */
  function dunes(t, o) {
    o = K.opts(o, { w: 800, h: 360, rows: 3, wind: 1 });
    return K.at(o, () => {
      const { w, h, draw, seed, rows } = o, ic = K.inkOf(o.dark), wd = o.wind < 0 ? -1 : 1;
      const g = K.memo(`e.dunes|${w}|${h}|${rows}|${seed}|${wd}`, () => {
        const r = mulberry(seed);
        return Array.from({ length: rows }, (_, k) => { const d = rows - 1 - k, base = h * (0.35 + 0.65 * (k + 1) / rows), amp = h * (0.16 + 0.12 * k / Math.max(1, rows - 1));
          const nb = 2 + Math.ceil((rows - k) * 0.8);
          const bumps = Array.from({ length: nb }, (_, i) => ({ c: (i + 0.25 + r() * 0.5) / nb * (w + 160) - 80, W: w / (nb * 0.75) * (0.7 + r() * 0.6), A: amp * (0.55 + r() * 0.55) }));
          // a long windward slope, a slightly rounded crest, a steep slip face downwind
          const prof = u => u < 0 ? Math.exp(-u * u * 1.2) : Math.exp(-u * u * 6);
          const yAt = x => { let y = h * 0.02 * Math.sin(x * 0.01 + k); for (const b of bumps) y = Math.max(y, b.A * prof((x - b.c) * wd / b.W)); return base - y; };
          const slips = bumps.map(b => { const top = yAt(b.c); if (top > base - b.A * 0.9) return null; const lee = [];
            for (let q = 0; q <= 10; q++) { const x = b.c + wd * (0.03 + q / 10 * 0.47) * b.W; lee.push([x, yAt(x)]); }
            const P = [b.c + wd * b.W * 0.08, top + b.A * 0.85], end = lee[10], bend = [];
            for (let q = 1; q < 6; q++) { const v = q / 6, a = [lerp(b.c, P[0], v), lerp(top, P[1], v)], c = [lerp(P[0], end[0], v), lerp(P[1], end[1], v)]; bend.push([lerp(a[0], c[0], v), lerp(a[1], c[1], v)]); }
            const edge = [[b.c, top + 1], ...bend, end];
            return { face: [...lee, ...edge.slice().reverse()], edge: edge.slice(0, 4) }; }).filter(Boolean);
          const crest = smooth((() => { const c = []; for (let x = -20; x <= w + 20; x += 6) c.push([x, yAt(x)]); return c; })(), 1);
          const poly = shape.band(crest, h + 20);
          const rip = Array.from({ length: 14 }, () => ({ u: r(), v: 0.15 + r() * 0.7, L: 30 + r() * 40 }));
          return { crest, poly, yAt, base, amp, far: d / Math.max(1, rows - 1), rip, bumps, slips };
        });
      });
      ctx.save(); ctx.beginPath(); ctx.rect(-4, -h, (w + 8) * K.ph(draw, 0.05, 0.85), h * 2 + 30); ctx.clip();
      g.forEach((row, k) => {
        const col = mixColorC(PAL.earthDune, PAL.earthDuneFar, row.far), shadeCol = PAL.earthDuneLee;
        flat(row.poly, col);
        hatch(row.poly, { color: shadeCol, alpha: 0.3 - row.far * 0.1, gap: 7, len: 10, angle: 0.08, seed: seed + 10 + k, keep: (px, py) => clamp((py - row.base + 30) / 90) * 0.7 });
        stipple(row.poly, Math.round(w * (1.2 + k)), { seed: seed + 20 + k, alpha: 0.3, color: PAL.earthSandDeep });
        ctx.save(); trace(row.poly, true); ctx.clip();
        row.slips.forEach((sl, i) => { flat(sl.face, shadeCol, 0.32 - row.far * 0.12);
          hatch(sl.face, { color: shadeCol, alpha: 0.7 - row.far * 0.25, gap: 4, len: 8, angle: 1.0 * wd, seed: seed + 70 + k * 7 + i });
          pen(sl.edge, { w: K.lw(o, 1.6 - row.far * 0.5), color: ic, alpha: 0.55 - row.far * 0.2, seed: seed + 80 + k * 7 + i, taper: 0.5 }); });
        row.rip.forEach((rp, i) => { const span = w + 120, x = ((rp.u * span + t * 6 * wd * (1 + k * 0.3)) % span + span) % span - 60, yb = row.yAt(x), y = lerp(yb, row.base + 40, rp.v);
          const pts = []; for (let j = 0; j <= 6; j++) { const xx = x + j / 6 * rp.L; pts.push([xx, y + (row.yAt(xx) - yb) * (1 - rp.v) + 2 * Math.sin(j * 1.8 + i)]); }
          ink(pts, { w: K.lw(o, 1.2), color: PAL.earthSandDeep, alpha: 0.55 * (1 - row.far * 0.5), amp: 0.5, seed: seed + 40 + i }); });
        ctx.restore();
        pen(row.crest, { w: K.lw(o, 2.8 - row.far * 1.2), color: ic, alpha: 1 - row.far * 0.35, seed: seed + 30 + k, taper: 0.02, draw: K.ph(draw, 0.05 + k * 0.08, 0.6 + k * 0.08) });
        if (draw >= 1) row.bumps.forEach((b, i) => { if (b.c < 20 || b.c > w - 20) return; const cy = row.yAt(b.c);
          for (let j = 0; j < 4; j++) { const u = (t * 0.6 + j / 4 + i * 0.3) % 1, x = b.c + wd * u * 60, y = cy - 4 - 10 * Math.sin(PI_ * u) + j;
            pen([[x, y], [x + wd * (14 + 10 * u), y + 1 + u * 3]], { w: K.lw(o, 1.4), color: o.dark ? PAL.nightInk : PAL.earthSandDeep, alpha: 0.6 * Math.sin(PI_ * u) * (1 - row.far * 0.5), seed: seed + 60 + i * 4 + j, taper: 0.5 }); } });
      });
      ctx.restore();
    });
  }
  const MIXC = new Map();
  function mixColorC(a, b, u) { const k = `${a}|${b}|${u.toFixed(2)}`; if (!MIXC.has(k)) MIXC.set(k, mixColor(a, b, u)); return MIXC.get(k); }

  /* ------------------------------------------------------------------ iceberg */
  /** iceberg(t, {x, y, w, h, size, above, sea, seed}): an iceberg afloat, (x, y) the middle of the waterline.
      The small peak above water and the much larger mass below (seen through the water) bob together; foam laps at the
      waterline, bubbles rise and a floe drifts past. w, h: the water box (centred on x, below y); sea: false leaves the
      water out (to float it in your own sea). size: the berg's width at the waterline; above: its height. */
  function iceberg(t, o) {
    o = K.opts(o, { w: 620, h: 380, size: 220, above: 130, sea: true });
    return K.at(o, () => {
      const { w, h, draw, seed, size, above } = o, ic = K.inkOf(o.dark);
      const g = K.memo(`e.ice|${size}|${above}|${h}|${seed}`, () => {
        const r = mulberry(seed), top = [[-size / 2, 0]];
        const peaks = [[-0.36, 0.45], [-0.22, 0.62], [-0.05, 1], [0.08, 0.78], [0.2, 0.86], [0.34, 0.4]];
        peaks.forEach(([u, v]) => top.push([u * size + (r() - 0.5) * 10, -v * above * (0.9 + r() * 0.2)]));
        top.push([size / 2, 0]);
        const below = [[-0.5, 0], [-0.78, 0.2], [-0.84, 0.46], [-0.62, 0.7], [-0.3, 0.86], [0.02, 0.97], [0.34, 0.8], [0.66, 0.6], [0.8, 0.32], [0.62, 0.1], [0.5, 0]]
          .map(([u, v], i) => [u * size * 1.1 + (i && i < 10 ? (r() - 0.5) * size * 0.08 : 0), v * h * 0.72 + (i && i < 10 ? (r() - 0.5) * h * 0.05 : 0)]);
        // two spine points inside the mass split it into facets, the way a block of ice breaks
        const S0 = [-size * 0.08 + (r() - 0.5) * 20, h * 0.17], S1 = [size * 0.14 + (r() - 0.5) * 20, h * 0.45];
        const facetsU = [[[0, 1, 2], [S0], 0.15], [[2, 3, 4], [S1, S0], 0.55], [[4, 5, 6], [S1], 0.8], [[6, 7, 8], [S1], 0.45], [[8, 9, 10], [S0, S1], 0.1]]
          .map(([idx, spine, tone]) => ({ poly: [...idx.map(i => below[i]), ...spine], tone }));
        const strias = [0.3, 0.5, 0.68, 0.84].map((v, k) => { const L = along(below.slice(0, 6), v * 0.9), R = along(below.slice(5).reverse(), v * 0.9);
          return smooth([L, [lerp(L[0], R[0], 0.5), lerp(L[1], R[1], 0.5) + h * 0.03], R], 2); });
        const facets = [[1, 0.2], [2, 0.5], [3, 0.35], [4, 0.6]].map(([i, v]) => [top[i + 1], [top[i + 1][0] + size * 0.04, -above * v * 0.15]]);
        return { top, below, facets, facetsU, strias, S0, S1, floe: shape.blob(0, 0, 26, seed + 9, 0.3, 16).map(([x, y]) => [x, y * 0.35]) };
      });
      const bob = 3 * Math.sin(t * 0.8 + seed), tilt = 0.018 * Math.sin(t * 0.6 + seed);
      const sa = K.ph(draw, 0, 0.4), ba = K.ph(draw, 0.2, 0.7), ta = K.ph(draw, 0.3, 0.8);
      const water = shape.rect(-w / 2, 0, w, h);
      if (o.sea) withAlpha(sa, () => { flat(water, PAL.earthSea);
        hatch(water, { color: PAL.earthSeaLight, alpha: 0.4, gap: 9, len: 14, angle: 0.02, seed: seed + 1 });
        hatch(water, { color: PAL.earthSeaDeep, alpha: 0.55, gap: 7, len: 12, angle: 0.02, seed: seed + 2, keep: (px, py) => clamp(py / h * 1.2) }); });
      ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, 0, w, h); ctx.clip();
      ctx.save(); ctx.translate(0, bob); ctx.rotate(tilt);
      withAlpha(ba, () => { flat(g.below, PAL.earthIceUnder, 0.72);
        g.facetsU.forEach((f, k) => flat(f.poly, mixColorC(PAL.earthIceUnder, PAL.earthIceDeep, 0.14 + f.tone * 0.5), 0.7));   // faces catching different light
        ctx.save(); trace(g.below, true); ctx.clip();                                                                          // the water swallows the deep half
        [[0.34, 0.3], [0.58, 0.35], [0.78, 0.4]].forEach(([v, a]) => flat(shape.rect(-w, h * 0.72 * v, w * 2, h), mixColorC(PAL.earthIceUnder, PAL.earthAquiferDeep, 0.5), a));
        ctx.restore();
        hatch(g.below, { color: PAL.earthIceDeep, alpha: 0.7, gap: 4.5, len: 9, angle: 0.95, seed: seed + 3, keep: (px, py) => clamp(py / (h * 0.72) * 1.2) ** 1.3 });   // darker with depth
        hatch(g.below, { color: PAL.earthIceDeep, alpha: 0.42, gap: 8, len: 7, angle: -0.35, seed: seed + 6, keep: (px, py) => clamp(0.1 + px / size) });
        hatch(g.below, { color: mixColorC(PAL.earthIceDeep, PAL.earthAquiferDeep, 0.55), alpha: 0.5, gap: 4, len: 8, angle: 0.95, seed: seed + 9,
          keep: (px, py) => clamp((py / (h * 0.72) - 0.4) * 2) });                                                            // the deepest part goes murky
        speckle(g.below, Math.round(size * 0.5), { color: '#ffffff', alpha: 0.4, rmin: 0.8, rmax: 2.4, seed: seed + 7 });      // trapped air
        g.strias.forEach((p, k) => ink(p, { w: K.lw(o, 1.5), color: PAL.earthIceDeep, alpha: 0.6, amp: 1, dash: [16, 11], seed: seed + 8 + k }));
        g.facetsU.forEach((f, k) => ink([f.poly[0], f.poly[3], f.poly[2]], { w: K.lw(o, 1.4), color: PAL.earthIceDeep, alpha: 0.7, amp: 0.7, seed: seed + 14 + k }));
        ink(g.below, { closed: true, w: K.lw(o, 1.8), color: o.dark ? PAL.nightInk : PAL.earthIceDeep, amp: 1, dash: [12, 8], seed: seed + 4, draw: ba }); });
      // refraction: the mass shifts sideways in the first few px under the surface
      withAlpha(ba * 0.65, () => { ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, 0, w, 13); ctx.clip(); ctx.translate(5 * Math.sin(t * 1.1 + seed), 0);
        flat(g.below, PAL.earthIceUnder, 0.8); ctx.restore();
        for (let k = 0; k < 4; k++) { const y = 3 + k * 3.2, dx = 7 * Math.sin(t * 1.3 + k * 1.1);
          ink([[-size * 0.55 + dx, y], [size * 0.55 + dx, y]], { w: K.lw(o, 1.2), color: PAL.earthSeaLight, alpha: 0.5, amp: 0.7, dash: [22, 14], seed: seed + 70 + k }); } });
      ctx.restore();
      if (draw >= 1) for (let i = 0; i < 7; i++) { const u = (t * 0.22 + i / 7) % 1, bx = (hash3(i, seed) - 0.5) * size * 1.2 + 6 * Math.sin(t * 2 + i), by = h * 0.75 * (1 - u) + 6;
        withAlpha(Math.sin(PI_ * u) * 0.8, () => ink(shape.circle(bx, by, 2 + u * 3, 10), { closed: true, w: K.lw(o, 1.1), color: PAL.earthFoam, amp: 0.2, seed: seed + 10 + i })); }
      ctx.restore();
      // above the water
      ctx.save(); ctx.beginPath(); ctx.rect(-w, -above * 2, w * 2, above * 2 + 0.5); ctx.clip(); ctx.translate(0, bob); ctx.rotate(tilt);
      withAlpha(ta, () => { flat(g.top.concat([[size / 2, 10], [-size / 2, 10]]), PAL.earthIce);
        hatch(g.top, { color: PAL.earthIceDeep, alpha: 0.55, gap: 4.5, len: 8, angle: 1.1, seed: seed + 20, keep: (px, py) => clamp(px / size * 1.6 + 0.25) });
        hatch(g.top, { color: PAL.earthIceDeep, alpha: 0.25, gap: 8, len: 6, angle: -0.2, seed: seed + 21 });
        g.facets.forEach((f, k) => pen(f, { w: K.lw(o, 1.4), color: PAL.earthIceDeep, alpha: 0.8, seed: seed + 22 + k, taper: 0.4 })); });
      pen(g.top, { w: K.lw(o, 2.8), color: ic, seed: seed + 25, taper: 0.03, draw: K.ph(draw, 0.2, 0.75) });
      ctx.restore();
      // the waterline: surface, lapping foam, a drifting floe
      if (o.sea) pen([[-w / 2, 0], [w / 2, 0]], { w: K.lw(o, 2.6), color: ic, seed: seed + 30, taper: 0.02, draw: K.ph(draw, 0, 0.4) });
      if (draw >= 0.5) { const fa = K.ph(draw, 0.5, 1);
        [-1, 1].forEach(sd => { for (let k = 0; k < 3; k++) { const x = sd * (size / 2 + 8 + k * 16 + ((t * 12) % 16)), a = fa * (1 - (k + (t * 12 % 16) / 16) / 3);
          pen([[x - 7, bob * 0.3], [x, bob * 0.3 - 3], [x + 7, bob * 0.3]], { w: K.lw(o, 1.6), color: PAL.earthFoam, alpha: a, seed: seed + 40 + k + sd * 5, taper: 0.3 }); } });
        for (let i = 0; i < 6; i++) { const x = ((i / 6 * w + t * 16) % w) - w / 2; if (Math.abs(x) < size * 0.6) continue;
          pen([[x, 3], [x + 10, -1], [x + 20, 3]], { w: K.lw(o, 1.5), color: PAL.earthFoam, alpha: fa * 0.8, seed: seed + 50 + i, taper: 0.3 }); }
        const fx = ((t * 9 + w * 0.3) % (w + 80)) - w / 2 - 40, fl = g.floe.map(([x, y]) => [x + fx, y + 1 + Math.sin(t * 1.3)]);
        if (Math.abs(fx) > size * 0.75) withAlpha(fa * clamp((w / 2 - Math.abs(fx)) / 40), () => ink(fl, { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.earthIce, amp: 0.4, seed: seed + 60 })); }
    });
  }

  /* ------------------------------------------------------------------ flowers */
  /** flowers(t, {x, y, w, h, n, kinds, seed}): a patch of flowers on a grassy ground line, (x, y) its left end.
      Stems grow and heads open on draw; they sway in the breeze and now and then a petal drifts off.
      kinds: any of 'daisy', 'tulip', 'poppy', 'bell' (default all); h: the tallest stem. */
  function flowers(t, o) {
    o = K.opts(o, { w: 500, h: 150, n: 11, kinds: ['daisy', 'tulip', 'poppy', 'bell'] });
    return K.at(o, () => {
      const { w, h, n, draw, seed } = o, ic = K.inkOf(o.dark);
      const g = K.memo(`e.flow|${w}|${h}|${n}|${seed}|${o.kinds}`, () => { const r = mulberry(seed);
        return { ground: shape.ridge(-10, w + 10, 0, 4, seed, 0.01, 14), fl: Array.from({ length: n }, (_, i) => ({ x: (i + 0.5 + (r() - 0.5) * 0.6) / n * w, hh: h * (0.5 + r() * 0.5), kind: o.kinds[Math.floor(r() * o.kinds.length)],
          bend: (r() - 0.5) * 0.3, ph: r() * TAU, leaf: 0.25 + r() * 0.2, col: Math.floor(r() * 3), sz: 1.2 + r() * 0.4 })).sort((a, b) => b.hh - a.hh) };
      });
      g.fl.forEach((f, i) => {
        const gr = K.ph(draw, 0.1 + i / n * 0.45, 0.55 + i / n * 0.45); if (gr <= 0) return;
        const sw = (4 + f.hh * 0.06) * Math.sin(t * 1.3 + f.x * 0.02 + f.ph) + f.bend * f.hh;
        const stem = [[f.x, 2], [f.x + sw * 0.15, -f.hh * 0.35], [f.x + sw * 0.55, -f.hh * 0.7], [f.x + sw, -f.hh]];
        const sm = smooth(stem, 2);
        pen(sm, { w: K.lw(o, 2.6), color: PAL.earthLeafDeep, seed: seed + 10 + i, taper: 0.15, draw: gr, amp: 0.4 });
        if (gr > 0.4) [[1 - f.leaf, i % 2 ? 1 : -1, 1], [0.8 - f.leaf, i % 2 ? -1 : 1, 0.75]].forEach(([u, sd, ls], j) => { const [lx, ly] = along(sm, u), L = 24 * ls * f.sz;
          const lf = KIT.rot(smooth([[lx, ly], [lx + sd * L * 0.4, ly - L * 0.45], [lx + sd * L, ly - L * 0.4], [lx + sd * L * 0.5, ly + 1]], 2, true), sd * 0.12 * Math.sin(t * 1.3 + f.ph + j), lx, ly);
          ink(lf, { closed: true, w: K.lw(o, 1.3), color: ic, fill: PAL.earthLeaf, amp: 0.3, seed: seed + 20 + i * 2 + j, draw: K.ph(gr, 0.4, 1) });
          pen([[lx, ly], [lx + sd * L * 0.8, ly - L * 0.38]], { w: K.lw(o, 0.9), color: PAL.earthLeafDeep, alpha: 0.7, seed: seed + 25 + i * 2 + j, taper: 0.4 }); });
        const op = K.pop(draw, 0.4 + i / n * 0.45, 0.7 + i / n * 0.3); if (op <= 0) return;
        const hx = f.x + sw, hy = -f.hh, s = f.sz * op, tilt = sw * 0.012;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt); ctx.scale(s, s);
        if (f.kind === 'daisy') { for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + f.ph;
            ink(KIT.rot(shape.ellipse(9, 0, 7, 2.8, 0, 10), a, 0, 0), { closed: true, w: K.lw(o, 1), color: ic, fill: PAL.earthPetal, amp: 0.2, seed: seed + 30 + k }); }
          ink(shape.circle(0, 0, 4.6, 12), { closed: true, w: K.lw(o, 1.2), color: ic, fill: PAL.sun, amp: 0.2, seed: seed + 41 });
          stipple(shape.circle(0, 0, 4.6, 12), 12, { seed: seed + 42, alpha: 0.5 }); }
        if (f.kind === 'tulip') { const c = [PAL.earthTulip, PAL.pink, PAL.sun][f.col];
          const cup = smooth([[-9, -4], [-8, -18], [-4, -12], [0, -21], [4, -12], [8, -18], [9, -4], [4, 4], [-4, 4]], 1, true);
          ink(cup, { closed: true, w: K.lw(o, 1.5), color: ic, fill: c, amp: 0.3, seed: seed + 43 });
          hatch(cup, { color: '#6b1e14', alpha: 0.4, gap: 3, len: 5, angle: 1.2, seed: seed + 44, keep: (px) => clamp(px / 9 + 0.3) });
          pen([[0, 3], [0, -14]], { w: K.lw(o, 1), color: ic, alpha: 0.5, seed: seed + 45, taper: 0.4 }); }
        if (f.kind === 'poppy') { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + f.ph + 0.08 * Math.sin(t * 2 + k);
            const pt = KIT.rot(shape.blob(8, 0, 7.5, seed + 50 + k, 0.2, 14), a, 0, 0);
            ink(pt, { closed: true, w: K.lw(o, 1.2), color: ic, fill: [PAL.accent, PAL.earthTulip, PAL.peri][f.col], amp: 0.3, seed: seed + 55 + k }); }
          flat(shape.circle(0, 0, 4, 10), '#2b2220'); }
        if (f.kind === 'bell') { const arc = [[0, 0], [6, -5], [13, -4], [18, 2], [20, 9]];
          pen(arc, { w: K.lw(o, 1.8), color: PAL.earthLeafDeep, seed: seed + 60, taper: 0.3 });
          [[3, -3], [10, -5], [16, -1], [20, 8]].forEach(([bx, by], k) => { const swb = 0.25 * Math.sin(t * 2.2 + k + f.ph), sz = 0.8 + k * 0.1;
            const bell = KIT.rot(smooth([[bx - 2, by + 2], [bx - 3.5 * sz, by + 7 * sz], [bx - 6 * sz, by + 12 * sz], [bx - 2, by + 10.5 * sz], [bx, by + 12 * sz], [bx + 2, by + 10.5 * sz], [bx + 6 * sz, by + 12 * sz], [bx + 3.5 * sz, by + 7 * sz], [bx + 2, by + 2]], 1, true), swb, bx, by);
            ink(bell, { closed: true, w: K.lw(o, 1.2), color: ic, fill: PAL.peri, amp: 0.2, seed: seed + 65 + k });
            hatch(bell, { color: '#3d3f7a', alpha: 0.5, gap: 2.5, len: 4, angle: 1.3, seed: seed + 70 + k, keep: (px) => clamp((px - bx) / 5 + 0.3) }); }); }
        ctx.restore();
      });
      pen(g.ground, { w: K.lw(o, 3.2), color: ic, seed: seed + 1, taper: 0.02, draw: K.ph(draw, 0, 0.35) });
      grass(g.ground, { every: 16, h: 16, seed: seed + 2, draw: K.ph(draw, 0.2, 0.7), sway: 3 });
      if (draw >= 1) for (let i = 0; i < 2; i++) { const [c, u] = K.cyc(t + i * 2.3 + seed, 4.6), f = g.fl[Math.floor(hash3(c, i, seed) * g.fl.length)];
        if (f.kind === 'bell') continue; const x = f.x + u * 90 + 10 * Math.sin(u * 9), y = -f.hh + u * f.hh * 0.9, a = t * 3 + i;
        withAlpha(Math.sin(PI_ * u), () => ink(KIT.rot(shape.ellipse(x, y, 5, 2.2, 0, 10), a, x, y), { closed: true, w: K.lw(o, 1), color: ic, fill: f.kind === 'daisy' ? PAL.earthPetal : PAL.accent, amp: 0.2, seed: seed + 90 + i })); }
    });
  }

  return { sea, coast, mountains, forest, strata, weather, river, volcano, cave, dunes, iceberg, flowers };
})();
