/* =====================  KIT.space · stars, planet, orbits, comet, telescope  =====================
   Night-world pieces (dark: true by default). stars takes x, y = top-left and w, h; planet, orbits and comet take
   x, y = the body's centre (the comet's head); telescope takes x, y = the ground under its tripod.
   See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  spaceStar: '#f3f0ff', spaceGold: '#e6c65c', spaceCyan: '#9ad9e3', spacePlanet: '#d9b36a', spaceBand: '#9c6a3a', spaceShadow: '#1a1430',
  spaceRing: '#cdb892', spaceMoon: '#c9c6d8', spaceTube: '#2f2c58', spaceTubePaper: '#e2d6bd', spaceBrass: '#c9a45a', spaceComa: '#e9f4ff',
  spaceBodies: ['#56c3d2', '#e8577a', '#53ba8b', '#d9b36a', '#9a9ad4'],
});
KIT.space = (() => {
  const K = KIT;
  const inkC = o => K.inkOf(o.dark);

  /** stars(t, {x, y, w, h, n, drift, shooting, seed}): a star field that twinkles and drifts slowly (bigger stars move
      faster, for depth). Bright stars get a four-point sparkle; a shooting star crosses every few seconds. */
  function stars(t, o) {
    o = K.opts(o, { w: 800, h: 400, n: 160, drift: 5, shooting: true, dark: true });
    return K.at(o, () => {
      const { w, h, n, draw, seed } = o;
      const S = K.memo(`s.stars|${w}|${h}|${n}|${seed}`, () => { const r = mulberry(seed);
        return Array.from({ length: n }, () => { const big = r() < 0.09, near = r() < 0.2; return { x: r() * w, y: r() * h, r: big ? 1.6 + r() * 1.2 : near ? 1.8 + r() * 1.6 : 0.6 + r() * 1.1, big, ph: r() * TAU, sp: 1 + r() * 3, u: r(),
          c: r() < 0.15 ? PAL.spaceGold : r() < 0.2 ? PAL.spaceCyan : PAL.spaceStar }; }); });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      S.forEach((s, i) => {
        const a = clamp(draw * 2.2 - s.u * 1.2) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph)));
        if (a <= 0.01) return;
        const x = ((s.x + t * o.drift * (0.3 + s.r * s.r * 0.35)) % w + w) % w, y = s.y;
        if (s.big) { const L = s.r * (3.2 + 1.4 * Math.sin(t * s.sp * 1.3 + s.ph)), rt = t * 0.3 + s.ph;
          for (let k = 0; k < 2; k++) { const c = Math.cos(rt + k * Math.PI / 2) * L, sn = Math.sin(rt + k * Math.PI / 2) * L;
            pen([[x - c, y - sn], [x + c, y + sn]], { w: K.lw(o, 1.6), color: s.c, alpha: a, taper: 0.5, seed: seed + i + k, amp: 0.1 }); } }
        flat(shape.circle(x, y, s.r, 8), s.c, a);
      });
      if (o.shooting && draw >= 1) { const [c, f] = K.cyc(t + hash3(seed, 1) * 3, 3.4);
        if (f < 0.4) { const sx = w * (0.1 + 0.6 * hash3(c, 1, seed)), sy = h * (0.05 + 0.4 * hash3(c, 2, seed)), L = Math.min(w, h) * 0.55, u = E.out2(f / 0.4);
          const hx = sx + L * u * 0.88, hy = sy + L * u * 0.47, tl = 90 * Math.sin(Math.PI * Math.min(1, u * 1.2));
          pen([[hx - tl * 0.88, hy - tl * 0.47], [hx, hy]], { w: K.lw(o, 2.6), color: PAL.spaceStar, alpha: 1 - inv(0.6, 1, u), taper: 0.02, pressure: q => q ** 1.5, seed: seed + 900 });
          flat(shape.circle(hx, hy, 2.4, 8), '#ffffff', 1 - inv(0.6, 1, u)); } }
      ctx.restore();
    });
  }

  /** planet(t, {x, y, r, fill, band, rings, tilt, moon, seed, dark}): a banded planet with a shaded night side,
      optional rings (split so the front half passes in front), ring particles circling, and a small orbiting moon. */
  function planet(t, o) {
    o = K.opts(o, { r: 120, fill: PAL.spacePlanet, band: PAL.spaceBand, rings: true, tilt: -0.28, moon: true, dark: true });
    return K.at(o, () => {
      const { r, draw, seed, tilt } = o, ic = inkC(o), pop = K.pop(draw, 0, 0.5);
      const G = K.memo(`s.planet|${r}|${seed}`, () => { const q = mulberry(seed);
        return { bands: Array.from({ length: 7 }, (_, k) => ({ y: -r * 0.8 + k * r * 0.26 + (q() - 0.5) * r * 0.06, amp: 3 + q() * 5, f: 0.02 + q() * 0.02, ph: q() * TAU, wide: q() < 0.5 })),
          parts: Array.from({ length: 70 }, () => ({ a: q() * TAU, k: 1.4 + q() * 0.6, s: 0.7 + q() * 1.2 })) }; });
      const ringBand = (k0, k1) => [...shape.ellipse(0, 0, r * k1, r * k1 * 0.26, 0, 64), ...shape.ellipse(0, 0, r * k0, r * k0 * 0.26, 0, 64).reverse()];
      const drawRing = front => { if (!o.rings) return; const ra = K.ph(draw, 0.35, 0.8); if (ra <= 0) return;
        ctx.save(); ctx.rotate(tilt); ctx.beginPath(); front ? ctx.rect(-3 * r, 0, 6 * r, 2 * r) : ctx.rect(-3 * r, -2 * r, 6 * r, 2 * r); ctx.clip();
        withAlpha(ra, () => {
          const outer = ringBand(1.35, 2.15), inner = ringBand(1.5, 1.72);
          flat(outer, PAL.spaceRing, 0.75); hatch(outer, { color: PAL.spaceBand, alpha: 0.45, gap: 5, len: 9, angle: 0.05, seed: seed + 3 });
          flat(inner, PAL.spaceShadow, 0.35);
          [1.35, 1.5, 1.72, 2.15].forEach((k, i) => ink(shape.ellipse(0, 0, r * k, r * k * 0.26, 0, 64), { closed: true, w: K.lw(o, i % 3 ? 1 : 1.8), color: ic, alpha: i % 3 ? 0.5 : 0.9, amp: 0.4, seed: seed + 5 + i }));
          G.parts.forEach(p => { const a = p.a + t * 0.25 / p.k, y = Math.sin(a) * r * p.k * 0.26; if (front ? y < 0 : y >= 0) return;
            flat(shape.circle(Math.cos(a) * r * p.k, y, p.s, 6), PAL.spaceStar, 0.8); });
        });
        ctx.restore(); };
      const moonAt = () => { const a = t * 0.55 + seed, R = r * 2.55; return { x: Math.cos(a) * R, y: Math.sin(a) * R * 0.32, front: Math.sin(a) > 0 }; };
      const drawMoon = () => { if (!o.moon) return; const m = moonAt(), mr = r * 0.13, c = KIT.rot([[m.x, m.y]], tilt)[0];
        withAlpha(K.ph(draw, 0.6, 1), () => { const d = shape.circle(c[0], c[1], mr, 20); ink(d, { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.spaceMoon, amp: 0.3, seed: seed + 40 });
          shade(d, { color: PAL.spaceShadow, alpha: 0.6, gap: 3, len: 5, light: [-c[0], -c[1]].map(v => v / (Math.hypot(c[0], c[1]) || 1)), seed: seed + 41 }); }); };
      ctx.save(); ctx.scale(pop, pop);
      if (o.moon && !moonAt().front) drawMoon();
      drawRing(false);
      const disc = shape.circle(0, 0, r, 72);
      ink(disc, { closed: true, w: K.lw(o, 2.8), color: ic, fill: o.fill, amp: 0.8, seed: seed + 1, draw: K.ph(draw, 0, 0.5), fillReveal: 'sweep' });
      if (draw >= 0.5) withAlpha(K.ph(draw, 0.5, 0.8), () => {
        ctx.save(); trace(disc, true); ctx.clip();
        G.bands.forEach((b, k) => { const line = []; for (let x = -r; x <= r; x += 8) line.push([x, b.y + b.amp * Math.sin(x * b.f + b.ph + t * 0.35)]);
          if (b.wide) { const lower = line.map(([x, y]) => [x, y + r * 0.08]).reverse(); flat([...line, ...lower], o.band, 0.45); }
          pen(line, { w: K.lw(o, 1.8), color: o.band, alpha: 0.8, taper: 0.1, seed: seed + 10 + k }); });
        const spot = [r * 0.3 + 10 * Math.sin(t * 0.35), r * 0.22];
        ink(shape.ellipse(spot[0], spot[1], r * 0.14, r * 0.07, 0, 24), { closed: true, w: K.lw(o, 1.4), color: o.band, fill: '#c9784a', amp: 0.4, seed: seed + 20 });
        shade(disc, { color: PAL.spaceShadow, alpha: 0.75, gap: 4, len: 8, base: 0, gain: 1.2, light: [-0.7, -0.7], seed: seed + 21 });
        ctx.restore();
        pen(shape.arc(0, 0, r * 0.8, Math.PI * 1.08, Math.PI * 1.42, 16), { w: K.lw(o, 3.4), color: '#fff8e8', alpha: 0.8, taper: 0.4, seed: seed + 22 });
      });
      drawRing(true);
      if (o.moon && moonAt().front) drawMoon();
      ctx.restore();
    });
  }

  /** orbits(t, {x, y, radii, tilt, speed, sizes, colors, dark, seed}): a star with bodies on tilted orbits, each moving
      at its own pace (farther is slower), trailing a short arc, passing behind and in front of the star. */
  function orbits(t, o) {
    o = K.opts(o, { radii: [110, 180, 260], tilt: 0.36, speed: 0.9, sizes: [9, 14, 11], colors: null, dark: true });
    return K.at(o, () => {
      const { radii, tilt, draw, seed } = o, ic = inkC(o), cols = o.colors || PAL.spaceBodies;
      const bodies = radii.map((R, i) => { const a = hash3(i, seed) * TAU + t * o.speed * (radii[0] / R) ** 1.5; return { R, i, a, x: Math.cos(a) * R, y: Math.sin(a) * R * tilt, back: Math.sin(a) < 0 }; });
      radii.forEach((R, i) => ink(shape.ellipse(0, 0, R, R * tilt, 0, 72), { closed: true, w: K.lw(o, 1.3), color: PAL.peri, alpha: 0.75, amp: 0.4, dash: [6, 8], seed: seed + i, draw: K.ph(draw, 0.1 + i * 0.1, 0.6 + i * 0.1) }));
      const body = b => { const pop = K.pop(draw, 0.4 + b.i * 0.1, 0.7 + b.i * 0.1); if (pop <= 0) return;
        const trail = Array.from({ length: 16 }, (_, k) => { const a = b.a - 0.9 * (1 - k / 15); return [Math.cos(a) * b.R, Math.sin(a) * b.R * tilt]; });
        pen(trail, { w: K.lw(o, 3), color: cols[b.i % cols.length], alpha: 0.55 * pop, pressure: u => u, taper: 0.01, seed: seed + 20 + b.i });
        const s = (o.sizes[b.i] ?? 10) * pop * (b.back ? 0.9 : 1), d = shape.circle(b.x, b.y, s, 20);
        ink(d, { closed: true, w: K.lw(o, 1.6), color: ic, fill: cols[b.i % cols.length], amp: 0.3, seed: seed + 30 + b.i });
        shade(d, { color: PAL.spaceShadow, alpha: 0.6, gap: 3, len: 5, light: [-b.x, -b.y].map(v => v / (Math.hypot(b.x, b.y) || 1)), seed: seed + 40 + b.i });
        if (b.i === radii.length - 1) ink(shape.ellipse(b.x, b.y, s * 1.9, s * 0.5, -0.3, 24), { closed: true, w: K.lw(o, 1.2), color: ic, alpha: 0.8, amp: 0.2 }); };
      bodies.filter(b => b.back).forEach(body);
      const sp = K.pop(draw, 0, 0.4);
      if (sp > 0) { ctx.save(); ctx.scale(sp, sp);
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + t * 0.1, L = (i % 2 ? 12 : 22) * (1 + 0.2 * Math.sin(t * 2.3 + i));
          pen([[Math.cos(a) * 40, Math.sin(a) * 40], [Math.cos(a) * (40 + L), Math.sin(a) * (40 + L)]], { w: K.lw(o, 2.6), color: PAL.spaceGold, taper: 0.45, seed: seed + 60 + i }); }
        const d = shape.circle(0, 0, 32, 36); ink(d, { closed: true, w: K.lw(o, 2.4), color: ic, fill: PAL.sun, amp: 0.5, seed: seed + 50 });
        crosshatch(d, { color: '#a4521f', alpha: 0.35, seed: seed + 51 }); ctx.restore(); }
      bodies.filter(b => !b.back).forEach(body);
    });
  }

  /** comet(t, {x, y, len, ang, dark, seed}): a comet head with a glowing coma and a flickering, streaming tail.
      ang: the direction the tail points (radians; default up and to the left, so the comet flies down-right). */
  function comet(t, o) {
    o = K.opts(o, { len: 300, ang: -2.6, dark: true });
    return K.at(o, () => {
      const { len, ang, draw, seed } = o, bx = 3 * Math.sin(t * 1.3), by = 2 * Math.cos(t * 1.1), gr = K.ph(draw, 0.2, 1);
      const G = K.memo(`s.comet|${len}|${ang}|${seed}`, () => { const r = mulberry(seed);
        return { streaks: Array.from({ length: 7 }, (_, k) => ({ da: (k - 3) * 0.06 + (r() - 0.5) * 0.02, L: len * (0.55 + 0.45 * r()) * (1 - Math.abs(k - 3) * 0.08), w: 11 - Math.abs(k - 3) * 2.2, c: k % 2 ? PAL.spaceCyan : PAL.spaceComa })),
          dust: Array.from({ length: 26 }, () => ({ u: r(), off: (r() - 0.5) * 0.3, sp: 0.15 + r() * 0.2 })) }; });
      ctx.save(); ctx.translate(bx, by);
      G.streaks.forEach((s, k) => { const a = ang + s.da + 0.015 * Math.sin(t * 2 + k), L = s.L * gr * (0.92 + 0.08 * Math.sin(t * 3 + k * 1.7));
        const p = Array.from({ length: 12 }, (_, i) => { const u = i / 11; return [Math.cos(a) * L * u + Math.sin(a) * 6 * Math.sin(u * 5 + t * 2 + k) * u, Math.sin(a) * L * u - Math.cos(a) * 6 * Math.sin(u * 5 + t * 2 + k) * u]; });
        pen(p, { w: K.lw(o, s.w), color: s.c, alpha: 0.75, pressure: u => (1 - u) ** 0.6, taper: 0.01, seed: seed + k });
        if (draw >= 1) flow(p, t + k * 0.4, { speed: 140, gap: 80, len: 16, color: '#ffffff', w: K.lw(o, 1.6), alpha: 0.7, seed: seed + 20 + k }); });
      if (draw >= 1) G.dust.forEach((d, i) => { const u = (d.u + t * d.sp) % 1, a = ang + d.off * (0.4 + u);
        flat(shape.circle(Math.cos(a) * len * u * 1.05, Math.sin(a) * len * u * 1.05, 1.6 * (1 - u) + 0.4, 6), PAL.spaceStar, (1 - u) * 0.9); });
      const pop = K.pop(draw, 0, 0.4);
      [[34, 0.12], [22, 0.25], [14, 0.5]].forEach(([r, a]) => flat(shape.circle(0, 0, r * pop * (1 + 0.06 * Math.sin(t * 4)), 28), PAL.spaceComa, a));
      ink(shape.circle(0, 0, 8 * pop, 16), { closed: true, w: K.lw(o, 1.6), color: inkC(o), fill: '#ffffff', amp: 0.2, seed: seed + 40 });
      ctx.restore();
    });
  }

  /** telescope(t, {x, y, s, aim, flip, beam, dark, seed}): a refractor on a tripod, slowly scanning the sky (aim: base
      angle in radians, negative is up; it points right, or left with flip: true), with a lens glint and a sight line. */
  function telescope(t, o) {
    o = K.opts(o, { aim: -0.62, flip: false, beam: true, dark: true });
    return K.at(o, () => {
      if (o.flip) ctx.scale(-1, 1);
      const { draw, seed, dark } = o, ic = inkC(o), a = o.aim + 0.07 * Math.sin(t * 0.4), tube = dark ? PAL.spaceTube : PAL.spaceTubePaper;
      const legs = [[[0, -176], [-104, 0]], [[0, -176], [104, 0]]];
      pen([[4, -170], [30, -8]], { w: K.lw(o, 3.2), color: ic, alpha: 0.6, seed: seed + 1, draw: K.ph(draw, 0, 0.4), taper: 0.05 });
      legs.forEach((l, i) => { pen(l, { w: K.lw(o, 5), color: ic, seed: seed + 2 + i, draw: K.ph(draw, 0, 0.4), taper: 0.05 });
        withAlpha(K.ph(draw, 0.3, 0.5), () => ink(shape.rect(l[1][0] - 7, -4, 14, 6), { closed: true, w: K.lw(o, 1.4), color: ic, fill: PAL.spaceBrass, amp: 0.2, seed: seed + 5 + i })); });
      withAlpha(K.ph(draw, 0.2, 0.5), () => ink([[-50, -80], [50, -80]], { w: K.lw(o, 2), color: ic, amp: 0.4, seed: seed + 7 }));
      const ta = K.ph(draw, 0.35, 0.8); if (ta <= 0) return;
      withAlpha(ta, () => {
        ink(shape.rect(-15, -196, 30, 24), { closed: true, w: K.lw(o, 1.8), color: ic, fill: PAL.spaceBrass, amp: 0.3, seed: seed + 8 });
        ctx.save(); ctx.translate(0, -196); ctx.rotate(a);
        if (o.beam && draw >= 1) { const bp = 0.18 + 0.1 * Math.sin(t * 1.7);
          ink([[196, 0], [620, 0]], { w: K.lw(o, 1.4), color: PAL.spaceCyan, alpha: bp, dash: [3, 10], amp: 0.2, seed: seed + 9 });
          ink([[196, -12], [620, -46]], { w: K.lw(o, 1), color: PAL.spaceCyan, alpha: bp * 0.6, dash: [2, 12], amp: 0.2, seed: seed + 10 });
          ink([[196, 12], [620, 46]], { w: K.lw(o, 1), color: PAL.spaceCyan, alpha: bp * 0.6, dash: [2, 12], amp: 0.2, seed: seed + 11 }); }
        const body = [[-86, -13], [150, -16], [150, 16], [-86, 13]];
        ink(body, { closed: true, w: K.lw(o, 2.6), color: ic, fill: tube, amp: 0.5, seed: seed + 12 });
        hatch(body, { color: dark ? '#0b0a1e' : PAL.inkSoft, alpha: 0.5, gap: 4, len: 8, angle: 0.02, seed: seed + 13, keep: (px, py) => clamp(py / 16 + 0.2) });
        const shield = [[140, -21], [196, -23], [196, 23], [140, 21]];
        ink(shield, { closed: true, w: K.lw(o, 2.6), color: ic, fill: tube, amp: 0.5, seed: seed + 14 });
        [[-40, 15], [60, 17]].forEach(([rx, hh], i) => ink(shape.rect(rx, -hh - 1, 12, 2 * hh + 2), { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.spaceBrass, amp: 0.3, seed: seed + 15 + i }));
        ink(shape.rect(-20, -30, 60, 10), { closed: true, w: K.lw(o, 1.4), color: ic, fill: tube, amp: 0.3, seed: seed + 17 });
        ink([[-86, -8], [-104, -30], [-96, -36], [-78, -14]], { closed: true, w: K.lw(o, 1.8), color: ic, fill: PAL.spaceBrass, amp: 0.3, seed: seed + 18 });
        ink(shape.ellipse(196, 0, 5, 22, 0, 24), { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.spaceCyan, amp: 0.2, seed: seed + 19 });
        const gl = 0.5 + 0.5 * Math.sin(t * 2.6), L = 6 + 8 * gl;
        pen([[198, -L - 4], [198, L - 4]], { w: K.lw(o, 2), color: '#ffffff', alpha: 0.4 + 0.6 * gl, taper: 0.5, seed: seed + 20 });
        pen([[198 - L, -4], [198 + L, -4]], { w: K.lw(o, 2), color: '#ffffff', alpha: 0.4 + 0.6 * gl, taper: 0.5, seed: seed + 21 });
        ctx.restore();
      });
    });
  }

  return { stars, planet, orbits, comet, telescope };
})();
