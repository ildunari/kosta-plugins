/* =====================  KIT.settle · houses, towns, roads, ships, fields, markets, maps, ruins  =====================
   Where people live and how they move: buildings, settlements, routes and the traces they leave. Paper-world pieces
   that also work at night (dark: true lights the windows). Things that stand on the ground (house, hut, tent, tower,
   cart, ship at its waterline) take x, y = the middle of their base; box components (village, skyline, fields,
   market, map, ruins) take x, y = the left end of their ground line (map: its top-left corner); road takes a path
   relative to x, y; bridge takes x, y = the left end of its deck. See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  settleWall: '#eadcbc', settleWallDeep: '#8c6f4a', settleBrick: '#c47f5c', settleBrickDeep: '#6e3a26', settleBoard: '#b5523d', settleBoardDeep: '#5e2419',
  settleRoof: '#b0553c', settleRoofDeep: '#5e2419', settleSlate: '#6f7486', settleSlateDeep: '#2e3142', settleThatch: '#d3a95e', settleThatchDeep: '#7d5c26',
  settleMud: '#c99b6b', settleMudDeep: '#6f4a2c', settleStone: '#c4bbaa', settleStoneDeep: '#554e46', settleWood: '#8a5a38', settleWoodDeep: '#442b1b',
  settleGlass: '#56627a', settleLit: '#f2c35b', settleDark: '#2f2620', settleCanvas: '#ece2c8', settleFelt: '#dccaa4', settleFeltDeep: '#826a45',
  settleMeadow: '#c9c792', settleMeadowDeep: '#6d7040', settleRoad: '#cdb68b', settleRoadDeep: '#7a6340', settleAsphalt: '#8d8a86',
  settleCity: '#b9b4ab', settleCityFar: '#d6d0c2', settleCityDeep: '#3f3b3a', settleWater: '#2f7f98', settleWaterDeep: '#1f5d71', settleFoam: '#e8f3f5',
  settleSail: '#f3ecd9', settleSailDeep: '#9b8a6a', settleHull: '#6b4a32', settleHullDeep: '#33231a', settleWheat: '#d4b268', settleWheatDeep: '#8d6c2c',
  settleCrop: '#7d9a58', settleCropDeep: '#3f6b3a', settleFurrow: '#a67c58', settleFurrowDeep: '#5a3a22', settleHedge: '#4f7d52', settleLeaf: '#6f9a58',
  settleSkin: '#e2b48c', settleCloth: ['#d8643a', '#2f7f98', '#6f9a58', '#8487c6', '#e3a03c', '#b0553c'],
  settleMapPaper: '#efe4c6', settleMapSea: '#b8d8dc', settleMapLand: '#e1d2a2', settleMarble: '#e3dccb', settleMarbleDeep: '#7c7262', settleVine: '#5e8a4a',
});
KIT.settle = (() => {
  const K = KIT, R4 = (x, y, w, h) => shape.rect(x, y, w, h);
  const litOf = o => o.lit ?? o.dark;
  const nightDim = (poly, o, a = 0.36) => { if (o.dark) flat(poly, PAL.night, a); };
  /** a large fill: flat colour, a directional hatch, pen shading away from the light, optional stipple (two textures min) */
  function tex(poly, base, deep, o, seed, { angle = 0.5, gap = 7, len = 11, alpha = 0.32, dots = 0, light = true, w = 1.3 } = {}) {
    flat(poly, base);
    hatch(poly, { color: deep, alpha, gap, len, angle, seed, w });
    if (light) shade(poly, { color: deep, alpha: 0.42, seed: seed + 1, light: [-0.8, -0.6] });
    if (dots) stipple(poly, dots, { seed: seed + 2, alpha: 0.28, color: deep });
    nightDim(poly, o);
  }
  const outline = (p, o, seed, draw = 1, w = 2.6, closed = true) => pen(p, { closed, w: K.lw(o, w), color: K.inkOf(o.dark), seed, draw, taper: 0.05, amp: 0.8 });
  const popAt = (cx, cy, k, fn) => { if (k <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); fn(); ctx.restore(); };
  /** a window [x, y, w, h]: dark glass by day, a warm flickering light when lit */
  function win([x, y, w, h], o, t, seed, on) {
    const p = R4(x, y, w, h), ic = K.inkOf(o.dark);
    if (on) { flat(R4(x - 5, y - 5, w + 10, h + 10), PAL.settleLit, 0.14); flat(p, PAL.settleLit, 0.78 + 0.22 * hash3(seed, Math.floor(t * 5), 7)); }
    else { flat(p, o.dark ? '#1c1b33' : PAL.settleGlass); hatch(p, { color: '#1b1518', alpha: 0.45, gap: 4, len: 6, angle: 0.8, seed }); ink([[x + w * 0.2, y + h * 0.7], [x + w * 0.45, y + h * 0.2]], { w: 1.2, color: '#ffffff', alpha: 0.5, amp: 0.2, seed }); }
    const lw = K.lw(o, 1.5);
    ink(p, { closed: true, w: lw, color: on ? PAL.settleWoodDeep : ic, amp: 0.5, seed: seed + 1 });
    ink([[x + w / 2, y], [x + w / 2, y + h]], { w: lw * 0.8, color: on ? PAL.settleWoodDeep : ic, amp: 0.3, seed: seed + 2 });
    ink([[x, y + h / 2], [x + w, y + h / 2]], { w: lw * 0.8, color: on ? PAL.settleWoodDeep : ic, amp: 0.3, seed: seed + 3 });
  }
  /** smoke puffs rising from (x, y), drifting with the wind */
  function smoke(t, x, y, o, seed, k = 1, a = 1) {
    for (let i = 0; i < 6; i++) {
      const u = (t * 0.3 + i / 6 + hash3(seed, i) * 0.05) % 1, px = x + u * 46 * k + 6 * k * Math.sin(t * 1.3 + i * 2), py = y - u * 120 * k, r = (5 + 15 * u) * k;
      ink(shape.blob(px, py, r, seed + i, 0.25, 16), { closed: true, w: K.lw(o, 1.3), color: o.dark ? PAL.nightMuted : PAL.inkSoft, fill: o.dark ? '#3a3858' : '#f1ece0',
        fillAlpha: 0.85, alpha: a * 0.75 * Math.sin(Math.PI * u) ** 0.7, amp: 0.6, seed: seed + 10 + i });
    }
  }
  /** a small flag at (x, y) (its hoist top) that ripples */
  function flag(x, y, fw, fh, t, color, o, seed) {
    const top = [], bot = [];
    for (let k = 0; k <= 6; k++) { const u = k / 6, wv = Math.sin(u * 4 - t * 6 + seed) * fh * 0.2 * u; top.push([x + u * fw, y + wv]); bot.push([x + u * fw * 0.94, y + fh + wv * 1.2]); }
    ink([...top, ...bot.reverse()], { closed: true, w: K.lw(o, 1.4), color: K.inkOf(o.dark), fill: color, amp: 0.4, seed });
  }
  /** a small walking figure standing at (x, y); walk 0 stands still (a little sway), dir -1 faces left */
  function person(x, y, t, sc, o, seed, { walk = 1, dir = 1, color = null } = {}) {
    const ic = K.inkOf(o.dark), c = color || PAL.settleCloth[seed % PAL.settleCloth.length], ph = t * 7 + seed;
    const st = walk ? Math.sin(ph) * 0.5 : 0, bob = walk ? Math.abs(Math.cos(ph)) * 1.6 : 0.8 * Math.sin(t * 1.5 + seed);
    ctx.save(); ctx.translate(x, y - bob * sc); ctx.scale(sc * dir, sc);
    for (const sg of [1, -1]) pen([[0, -24], [Math.sin(st * sg) * 16 + 1, 0]], { w: 3.2, color: ic, seed: seed + (sg > 0 ? 1 : 2), taper: 0.08, amp: 0.3 });
    ink([[-7, -48], [7, -48], [10, -21], [-10, -21]], { closed: true, w: 1.6, color: ic, fill: c, amp: 0.4, seed: seed + 3 });
    pen([[1, -45], [-Math.sin(st) * 12 + 3, -27]], { w: 2.6, color: ic, seed: seed + 4, taper: 0.1, amp: 0.3 });
    ink(shape.circle(0, -56, 7, 14), { closed: true, w: 1.6, color: ic, fill: PAL.settleSkin, amp: 0.3, seed: seed + 5 });
    ctx.restore();
  }
  function groundLine(o, x0, x1, seed, draw, grassy = true) {
    const g = K.memo(`s.gl|${x0}|${x1}|${seed}`, () => shape.ridge(x0, x1, 0, 2.5, seed, 0.02, 12));
    pen(g, { w: K.lw(o, 3.2), color: K.inkOf(o.dark), seed, taper: 0.06, draw });
    if (grassy) grass(g, { every: 24, h: 11, seed: seed + 1, draw, sway: 2.5 });
  }

  /* ---------------- house ---------------- */
  function houseGeo(st, W) {
    if (st === 'townhouse') {
      const wh = W * 1.75, fh = wh / 3, wins = [];
      for (let f = 0; f < 3; f++) for (let c = 0; c < 2; c++) if (f < 2 || c) wins.push([-W * 0.36 + c * W * 0.44, -wh + f * fh + fh * 0.24, W * 0.28, fh * 0.46]);
      return { W, wh, wall: R4(-W / 2, -wh, W, wh), wallC: [PAL.settleBrick, PAL.settleBrickDeep, { angle: 0, gap: 7, len: 12, alpha: 0.4 }],
        roof: [[-W / 2 - 8, -wh + 2], [0, -wh - W * 0.52], [W / 2 + 8, -wh + 2]], roofC: [PAL.settleSlate, PAL.settleSlateDeep],
        chimney: R4(W * 0.2, -wh - W * 0.46, 20, W * 0.4), smokeAt: [W * 0.2 + 10, -wh - W * 0.46],
        door: [-W * 0.34, -fh * 0.74, W * 0.27, fh * 0.74], wins, round: [0, -wh - W * 0.17, W * 0.085], cornice: -wh + fh * 0.02 };
    }
    if (st === 'farmhouse') {
      const wh = W * 0.4, rh = W * 0.34;
      return { W, wh, wall: R4(-W / 2, -wh, W, wh), wallC: [PAL.settleBoard, PAL.settleBoardDeep, { angle: Math.PI / 2, gap: 11, len: 40, alpha: 0.45 }],
        roof: [[-W / 2 - 12, -wh + 2], [-W * 0.4, -wh - rh * 0.6], [-W * 0.17, -wh - rh], [W * 0.17, -wh - rh], [W * 0.4, -wh - rh * 0.6], [W / 2 + 12, -wh + 2]],
        roofC: [PAL.settleSlate, PAL.settleSlateDeep], chimney: R4(-W * 0.3, -wh - rh * 0.92, 20, rh * 0.6), smokeAt: [-W * 0.3 + 10, -wh - rh * 0.92],
        door: [-W * 0.12, -wh * 0.8, W * 0.24, wh * 0.8], barn: true, vane: [W * 0.05, -wh - rh],
        wins: [[-W * 0.41, -wh * 0.72, W * 0.13, wh * 0.36], [W * 0.28, -wh * 0.72, W * 0.13, wh * 0.36], [-W * 0.055, -wh - rh * 0.66, W * 0.11, rh * 0.3]] };
    }
    const wh = W * 0.55, rh = W * 0.42;                                        // cottage
    return { W, wh, wall: R4(-W / 2, -wh, W, wh), wallC: [PAL.settleWall, PAL.settleWallDeep, { angle: 0.6, gap: 9, len: 10, dots: Math.round(W * 1.5) }],
      roof: [[-W / 2 - 14, -wh + 3], [-W * 0.38, -wh - rh], [W * 0.38, -wh - rh], [W / 2 + 14, -wh + 3]], roofC: [PAL.settleRoof, PAL.settleRoofDeep],
      chimney: R4(W * 0.18, -wh - rh - 22, 22, rh * 0.7), smokeAt: [W * 0.18 + 11, -wh - rh - 22],
      door: [-W * 0.08, -wh * 0.64, W * 0.16, wh * 0.64], wins: [[-W * 0.39, -wh * 0.74, W * 0.19, wh * 0.36], [W * 0.2, -wh * 0.74, W * 0.19, wh * 0.36]] };
  }
  /** house(t, {x, y, s, style, w, smoke, lit, ground}): style 'cottage', 'townhouse' or 'farmhouse' (a barn-roofed
      farmhouse with a turning weather vane). Walls, roof, then windows draw on; chimney smoke rises; lit (default: dark)
      lights the windows with a flicker. (x, y) is the middle of the ground line. */
  function house(t, o) {
    o = K.opts(o, { style: 'cottage', w: null, smoke: true, lit: null, ground: true });
    return K.at(o, () => {
      const { draw, seed } = o, st = o.style, W = o.w ?? ({ townhouse: 150, farmhouse: 280 }[st] || 200);
      const g = K.memo(`s.house|${st}|${W}`, () => houseGeo(st, W)), ic = K.inkOf(o.dark), on = litOf(o);
      const cd = K.ph(draw, 0.45, 0.7);
      if (cd > 0) { withAlpha(cd, () => tex(g.chimney, PAL.settleBrick, PAL.settleBrickDeep, o, seed + 5, { angle: 0, gap: 6, len: 8, light: false })); outline(g.chimney, o, seed + 6, cd, 2.2); }
      withAlpha(K.ph(draw, 0.15, 0.45), () => tex(g.wall, g.wallC[0], g.wallC[1], o, seed + 10, g.wallC[2]));
      outline(g.wall, o, seed + 11, K.ph(draw, 0, 0.35), 2.8);
      if (g.cornice) ink([[-W / 2 - 4, g.cornice], [W / 2 + 4, g.cornice]], { w: K.lw(o, 3), color: ic, alpha: K.ph(draw, 0.3, 0.5), amp: 0.5, seed: seed + 12 });
      withAlpha(K.ph(draw, 0.4, 0.7), () => tex(g.roof, g.roofC[0], g.roofC[1], o, seed + 20, { angle: 0.02, gap: 8, len: 16, alpha: 0.45 }));
      outline(g.roof, o, seed + 21, K.ph(draw, 0.3, 0.62), 3);
      if (g.round) popAt(g.round[0], g.round[1], K.pop(draw, 0.6, 0.8), () => {
        const c = shape.circle(g.round[0], g.round[1], g.round[2], 18);
        flat(c, on ? PAL.settleLit : PAL.settleGlass, on ? 0.85 : 1); ink(c, { closed: true, w: K.lw(o, 1.8), color: ic, amp: 0.4, seed: seed + 22 });
      });
      const [dx, dy, dw, dh] = g.door, dp = R4(dx, dy, dw, dh);
      popAt(dx + dw / 2, 0, K.pop(draw, 0.55, 0.75), () => {
        flat(dp, PAL.settleWood); hatch(dp, { color: PAL.settleWoodDeep, alpha: 0.5, gap: 6, len: 30, angle: Math.PI / 2, seed: seed + 30 }); nightDim(dp, o);
        if (on && !g.barn) flat(R4(dx + 3, dy + 3, dw - 6, dh * 0.22), PAL.settleLit, 0.85);
        ink(dp, { closed: true, w: K.lw(o, 2), color: ic, amp: 0.5, seed: seed + 31 });
        if (g.barn) { ink([[dx, dy], [dx + dw, dy + dh]], { w: K.lw(o, 2), color: PAL.settleWall, amp: 0.4, seed: seed + 32 }); ink([[dx + dw, dy], [dx, dy + dh]], { w: K.lw(o, 2), color: PAL.settleWall, amp: 0.4, seed: seed + 33 }); }
        else ink(shape.circle(dx + dw * 0.78, dy + dh * 0.55, 2.2, 8), { closed: true, w: 1, color: ic, fill: PAL.gold, amp: 0.1, seed: seed + 34 });
      });
      if (g.steps) ink([[dx - 6, -4], [dx + dw + 6, -4]], { w: K.lw(o, 3), color: ic, amp: 0.4, seed: seed + 35, alpha: K.ph(draw, 0.6, 0.8) });
      g.wins.forEach((r, i) => popAt(r[0] + r[2] / 2, r[1] + r[3] / 2, K.pop(draw, 0.6 + i * 0.04, 0.8 + i * 0.04), () =>
        win(r, o, t, seed + 40 + i * 5, on && hash3(seed, i, 3) < 0.8)));
      if (g.vane && draw >= 0.85) {                                               // weather vane turning in the wind
        const [vx, vy] = g.vane, sp = Math.cos(t * 0.9 + seed);
        pen([[vx, vy], [vx, vy - 40]], { w: K.lw(o, 2), color: ic, seed: seed + 50, taper: 0.1 });
        ctx.save(); ctx.translate(vx, vy - 34); ctx.scale(Math.abs(sp) < 0.08 ? 0.08 * Math.sign(sp || 1) : sp, 1);
        ink([[-18, 0], [16, 0]], { w: K.lw(o, 2), color: ic, amp: 0.2, seed: seed + 51 }); arrowHead(18, 0, 0, 7, ic, K.lw(o, 2));
        ink([[-18, 0], [-24, -6], [-12, -6]], { closed: true, w: K.lw(o, 1.4), color: ic, fill: PAL.accent, amp: 0.2, seed: seed + 52 });
        ctx.restore();
        text('N', vx, vy - 48, { kind: 'mono', size: 11, weight: 600, align: 'center', color: ic, role: 'decor' });
      }
      if (o.smoke) smoke(t, g.smokeAt[0], g.smokeAt[1], o, seed + 60, W / 220 + 0.3, K.ph(draw, 0.8, 1));
      if (o.ground) groundLine(o, -W / 2 - 50, W / 2 + 50, seed + 70, K.ph(draw, 0, 0.35));
    });
  }

  /* ---------------- hut ---------------- */
  /** hut(t, {x, y, s, kind, w, smoke, lit, ground}): kind 'round' (a mud-walled roundhouse with a conical thatch roof)
      or 'long' (a low longhouse under a deep thatch). The thatch fringe sways, smoke seeps through the roof, and a
      fire glows in the doorway when lit. */
  function hut(t, o) {
    o = K.opts(o, { kind: 'round', w: null, smoke: true, lit: null, ground: true });
    return K.at(o, () => {
      const { draw, seed } = o, long = o.kind === 'long', W = o.w ?? (long ? 320 : 180), ic = K.inkOf(o.dark), on = litOf(o);
      const g = K.memo(`s.hut|${o.kind}|${W}`, () => {
        const wh = W * (long ? 0.2 : 0.34), hw = W * (long ? 0.42 : 0.46), ex = W / 2 + (long ? 6 : 18), ey = -wh + (long ? 26 : 16);
        const wall = [[-hw, -wh], [hw, -wh], [hw * 1.03, 0], [-hw * 1.03, 0]];
        const top = long ? [[-ex, ey], [-W * 0.3, -wh - W * 0.3], [W * 0.3, -wh - W * 0.3], [ex, ey]] : [[-ex, ey], [0, -wh - W * 0.62], [ex, ey]];
        const zig = []; for (let x = ex, k = 0; x >= -ex - 0.1; x -= 12, k++) zig.push([x, ey + (k % 2 ? 7 : 0)]);
        const dw = W * (long ? 0.12 : 0.2), dh = wh * (long ? 0.85 : 0.8);
        return { wh, wall, roof: [...top, ...zig.slice(1)], eave: zig, apex: long ? [W * 0.12, -wh - W * 0.3] : [0, -wh - W * 0.62],
          door: [[-dw / 2, 0], ...shape.arc(0, -dh + dw / 2, dw / 2, Math.PI, TAU, 10), [dw / 2, 0]] };
      });
      withAlpha(K.ph(draw, 0.1, 0.4), () => tex(g.wall, PAL.settleMud, PAL.settleMudDeep, o, seed + 1, { angle: 0.3, gap: 8, len: 9, dots: W * 2 }));
      outline(g.wall, o, seed + 2, K.ph(draw, 0, 0.3), 2.6);
      popAt(0, 0, K.pop(draw, 0.35, 0.55), () => {
        flat(g.door, on ? PAL.settleLit : PAL.settleDark, on ? 0.7 + 0.3 * hash3(seed, Math.floor(t * 7)) : 1);
        if (on) for (let i = 0; i < 3; i++) pen([[-6 + i * 6, -2], [-6 + i * 6 + 3 * Math.sin(t * 9 + i), -12 - 8 * hash3(i, Math.floor(t * 8), seed)]], { w: 3, color: PAL.accent, seed: seed + 5 + i, taper: 0.5 });
        ink(g.door, { closed: true, w: K.lw(o, 2), color: ic, amp: 0.4, seed: seed + 3 });
      });
      withAlpha(K.ph(draw, 0.4, 0.7), () => {
        flat(g.roof, PAL.settleThatch);
        hatch(g.roof, { color: PAL.settleThatchDeep, alpha: 0.5, gap: 5, len: 18, angle: long ? 1.45 : 1.25, seed: seed + 10, w: 1.4 });
        hatch(g.roof, { color: PAL.settleThatchDeep, alpha: 0.3, gap: 9, len: 14, angle: long ? -1.45 : -1.25, seed: seed + 11 });
        shade(g.roof, { color: PAL.settleThatchDeep, alpha: 0.45, seed: seed + 12, light: [-0.8, -0.6] }); nightDim(g.roof, o);
      });
      outline(g.roof, o, seed + 13, K.ph(draw, 0.3, 0.65), 2.8);
      if (draw > 0.7) g.eave.forEach(([x, y], k) => { if (k % 2) return; const sw = 2.5 * Math.sin(t * 2.1 + k * 0.7);
        pen([[x, y], [x + sw, y + 11 + 3 * hash3(k, seed)]], { w: K.lw(o, 1.4), color: PAL.settleThatchDeep, seed: seed + 20 + k, taper: 0.4, alpha: K.ph(draw, 0.7, 1) }); });
      if (o.smoke) smoke(t, g.apex[0], g.apex[1] + 6, o, seed + 40, W / 260 + 0.25, K.ph(draw, 0.8, 1));
      if (o.ground) groundLine(o, -W / 2 - 50, W / 2 + 50, seed + 50, K.ph(draw, 0, 0.3));
    });
  }

  /* ---------------- tent ---------------- */
  /** tent(t, {x, y, s, kind, w, color, smoke, lit, ground}): kind 'camp' (an A-frame tent with guy ropes, a pennant and
      a door flap that swings in the breeze) or 'yurt' (a felt yurt with a lattice wall, a painted door whose curtain
      sways, and smoke from the crown). color overrides the canvas or felt. */
  function tent(t, o) {
    o = K.opts(o, { kind: 'camp', w: null, color: null, smoke: true, lit: null, ground: true });
    return K.at(o, () => {
      const { draw, seed } = o, ic = K.inkOf(o.dark), on = litOf(o), yurt = o.kind === 'yurt', W = o.w ?? (yurt ? 280 : 240);
      if (!yurt) {
        const H = W * 0.62, body = [[-W / 2, 0], [0, -H], [W / 2, 0]], dr = [[0, -H * 0.78], [-W * 0.13, 0], [W * 0.13, 0]];
        [-1, 1].forEach(sg => { ink([[sg * W * 0.22, -H * 0.56], [sg * W * 0.74, 0]], { w: K.lw(o, 1.3), color: ic, amp: 0.4, seed: seed + (sg > 0 ? 1 : 2), draw: K.ph(draw, 0.5, 0.8) });
          ink([[sg * W * 0.74 - 5, -8], [sg * W * 0.74 + 3, 4]], { w: K.lw(o, 2.4), color: PAL.settleWood, amp: 0.2, seed: seed + 3, alpha: K.ph(draw, 0.6, 0.8) }); });
        withAlpha(K.ph(draw, 0.15, 0.45), () => tex(body, o.color || PAL.settleCanvas, PAL.settleSailDeep, o, seed + 4, { angle: 1.05, gap: 8, len: 14 }));
        ink([[0, -H], [-W * 0.3, 0]], { w: K.lw(o, 1.4), color: ic, alpha: 0.6 * K.ph(draw, 0.4, 0.6), amp: 0.5, seed: seed + 5 });
        popAt(0, 0, K.pop(draw, 0.35, 0.55), () => {
          flat(dr, on ? PAL.settleLit : PAL.settleDark, on ? 0.75 + 0.25 * hash3(seed, Math.floor(t * 6)) : 1);
          const fx = W * 0.27 + 7 * Math.sin(t * 1.6 + seed), fy = -H * 0.12 + 4 * Math.sin(t * 2.2), flap = [[0, -H * 0.78], [W * 0.13, 0], [fx, fy]];
          ink(flap, { closed: true, w: K.lw(o, 1.8), color: ic, fill: o.color || PAL.settleCanvas, amp: 0.4, seed: seed + 6 });
          hatch(flap, { color: PAL.settleSailDeep, alpha: 0.55, gap: 5, len: 9, angle: -0.9, seed: seed + 7 }); nightDim(flap, o, 0.2);
        });
        outline(body, o, seed + 8, K.ph(draw, 0, 0.35), 2.8);
        pen([[0, -H + 4], [0, -H - 36]], { w: K.lw(o, 2.4), color: PAL.settleWood, seed: seed + 9, taper: 0.1, draw: K.ph(draw, 0.5, 0.7) });
        if (draw > 0.7) withAlpha(K.ph(draw, 0.7, 0.9), () => { const fl = [[0, -H - 36]]; for (let k = 1; k <= 5; k++) fl.push([k * 8, -H - 36 + 6 * k / 5 + 3 * Math.sin(k - t * 6) * k / 5]); fl.push([0, -H - 24]);
          ink(fl, { closed: true, w: K.lw(o, 1.3), color: ic, fill: PAL.accent, amp: 0.3, seed: seed + 10 }); });
        if (o.ground) groundLine(o, -W * 0.85, W * 0.85, seed + 20, K.ph(draw, 0, 0.3));
        return;
      }
      const g = K.memo(`s.yurt|${W}`, () => {
        const wh = W * 0.3, dome = [];
        for (let k = 0; k <= 20; k++) { const u = k / 10 - 1; dome.push([u * (W / 2 + 10), -wh + 6 - W * 0.26 * Math.min(1, (1 - u * u) * 1.25) ** 0.9]); }
        return { wh, wall: R4(-W / 2, -wh, W, wh), dome: [...dome, [W / 2 + 10, -wh + 8], [-W / 2 - 10, -wh + 8]], ridge: dome, crown: -wh + 6 - W * 0.26,
          ribs: [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map(u => [[u * 0.2 * W / 2, -wh + 6 - W * 0.26 + 4], [u * (W / 2 + 10), -wh + 6]]) };
      });
      withAlpha(K.ph(draw, 0.1, 0.4), () => { tex(g.wall, o.color || PAL.settleFelt, PAL.settleFeltDeep, o, seed + 1, { angle: 0.8, gap: 13, len: 30, alpha: 0.35 });
        hatch(g.wall, { color: PAL.settleFeltDeep, alpha: 0.35, gap: 13, len: 30, angle: -0.8, seed: seed + 2 });
        flat(R4(-W / 2, -g.wh * 0.62, W, g.wh * 0.12), PAL.settleRoof, 0.85); nightDim(g.wall, o, 0.15); });
      outline(g.wall, o, seed + 3, K.ph(draw, 0, 0.3), 2.6);
      withAlpha(K.ph(draw, 0.35, 0.65), () => tex(g.dome, o.color || PAL.settleFelt, PAL.settleFeltDeep, o, seed + 4, { angle: 0.1, gap: 9, len: 16 }));
      g.ribs.forEach((p, i) => ink(p, { w: K.lw(o, 1.3), color: PAL.settleFeltDeep, alpha: 0.7, amp: 0.6, seed: seed + 5 + i, draw: K.ph(draw, 0.5, 0.75) }));
      outline(g.ridge, o, seed + 12, K.ph(draw, 0.3, 0.6), 2.8, false);
      ink([[-W * 0.1, g.crown + 2], [W * 0.1, g.crown + 2]], { w: K.lw(o, 3), color: ic, amp: 0.4, seed: seed + 13, alpha: K.ph(draw, 0.5, 0.7) });
      const dw = W * 0.2, dh = g.wh * 0.86, dp = R4(-dw / 2, -dh, dw, dh);
      popAt(0, 0, K.pop(draw, 0.55, 0.75), () => {
        ink(dp, { closed: true, w: K.lw(o, 2), color: ic, fill: on ? PAL.settleLit : PAL.settleRoof, amp: 0.4, seed: seed + 14 });
        const sw = 5 * Math.sin(t * 1.4 + seed), cur = [[-dw / 2 + 5, -dh + 5], [dw / 2 - 5, -dh + 5], [dw / 2 - 5 + sw * 0.4, -dh * 0.3], [-dw / 2 + 5 + sw, -dh * 0.18]];
        ink(cur, { closed: true, w: K.lw(o, 1.4), color: ic, fill: PAL.settleFelt, amp: 0.3, seed: seed + 15 });
        hatch(cur, { color: PAL.settleFeltDeep, alpha: 0.5, gap: 5, len: 8, angle: 1.2, seed: seed + 16 });
      });
      if (o.smoke) { pen([[W * 0.05, g.crown + 2], [W * 0.05, g.crown - 16]], { w: K.lw(o, 4), color: PAL.settleStoneDeep, seed: seed + 17, taper: 0.02, alpha: K.ph(draw, 0.6, 0.8) });
        smoke(t, W * 0.05, g.crown - 16, o, seed + 20, W / 300, K.ph(draw, 0.8, 1)); }
      if (o.ground) groundLine(o, -W / 2 - 50, W / 2 + 50, seed + 30, K.ph(draw, 0, 0.3));
    });
  }

  /* ---------------- tower ---------------- */
  /** tower(t, {x, y, s, kind, w, h, lit, flag, beam, ground}): kind 'castle' (a crenellated keep with arrow slits and
      a flag), 'lighthouse' (a striped lighthouse on rocks whose beam sweeps round) or 'watchtower' (a timber lookout on
      braced legs with a ladder and a lookout). Stone and timber draw up from the ground. */
  function tower(t, o) {
    o = K.opts(o, { kind: 'castle', w: null, h: null, lit: null, flag: true, beam: true, ground: true });
    return K.at(o, () => {
      const { draw, seed, kind } = o, ic = K.inkOf(o.dark), on = litOf(o);
      const up = (fn, a, b) => { const k = K.ph(draw, a, b); if (k <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(-2000, -2000 * k, 4000, 2000 * k + 60); ctx.clip(); fn(k); ctx.restore(); };
      if (kind === 'lighthouse') {
        const B = o.w ?? 120, H = o.h ?? 420, T = B * 0.62, hw = y => lerp(B / 2, T / 2, -y / H);
        const g = K.memo(`s.light|${B}|${H}`, () => ({ body: [[-B / 2, 0], [-T / 2, -H], [T / 2, -H], [B / 2, 0]],
          bands: [0.12, 0.42, 0.72].map(v => { const y0 = -H * v, y1 = -H * (v + 0.15); return [[-hw(y0), y0], [-hw(y1), y1], [hw(y1), y1], [hw(y0), y0]]; }),
          rocks: [[-B * 0.58, 4, B * 0.36], [B * 0.56, 6, B * 0.3], [B * 0.28, 8, B * 0.24], [-B * 0.3, 10, B * 0.2]].map(([x, y, r], i) => shape.blob(x, y, r, 40 + i, 0.3, 24)),
          cap: [[-T * 0.5, -H - 60], ...shape.arc(0, -H - 60, T * 0.5, Math.PI, TAU, 12).slice(1, -1), [T * 0.5, -H - 60]] }));
        const rocks = (a, b) => { ctx.save(); ctx.beginPath(); ctx.rect(-4 * B, -4 * B, 8 * B, 4 * B + 3); ctx.clip();
          g.rocks.slice(a, b).forEach((p, i) => { withAlpha(K.ph(draw, 0, 0.3), () => tex(p, PAL.settleStone, PAL.settleStoneDeep, o, seed + a + i, { angle: 0.6, gap: 8 })); outline(p, o, seed + 5 + a + i, K.ph(draw, 0, 0.3), 2.2); });
          ctx.restore(); };
        if (o.ground) groundLine(o, -B * 1.3, B * 1.3, seed + 70, K.ph(draw, 0, 0.3), false);
        rocks(0, 2);
        up(() => { tex(g.body, '#f1ebdc', PAL.settleStoneDeep, o, seed + 10, { angle: 1.4, gap: 10, len: 10, alpha: 0.2 });
          g.bands.forEach((p, i) => { flat(p, PAL.settleRoof); hatch(p, { color: PAL.settleRoofDeep, alpha: 0.45, gap: 6, len: 10, angle: 0.3, seed: seed + 12 + i }); nightDim(p, o); });
          shade(g.body, { color: PAL.settleStoneDeep, alpha: 0.35, seed: seed + 16, light: [-0.9, -0.3] });
          [[-H * 0.33], [-H * 0.62]].forEach(([y], i) => win([-7, y, 14, 24], o, t, seed + 20 + i, on));
          outline(g.body, o, seed + 11, 1, 2.8); }, 0.15, 0.55);
        rocks(2, 4);
        if (draw < 0.5) return;
        const la = K.ph(draw, 0.5, 0.8), lamp = [-T * 0.36, -H - 58, T * 0.72, 48], ly = -H - 34;
        withAlpha(la, () => {
          ink(R4(-T / 2 - 14, -H - 10, T + 28, 10), { closed: true, w: K.lw(o, 1.8), color: ic, fill: PAL.settleCityDeep, amp: 0.3, seed: seed + 30 });
          flat(R4(...lamp), PAL.settleLit, 0.85 + 0.15 * hash3(seed, Math.floor(t * 6)));
          [-1, -0.33, 0.33, 1].forEach((u, i) => ink([[u * T * 0.36, -H - 58], [u * T * 0.36, -H - 10]], { w: K.lw(o, 1.6), color: ic, amp: 0.2, seed: seed + 31 + i }));
          ink([[-T / 2 - 12, -H - 30], [T / 2 + 12, -H - 30]], { w: K.lw(o, 1.4), color: ic, amp: 0.3, seed: seed + 36 });
          ink(g.cap, { closed: true, w: K.lw(o, 2.2), color: ic, fill: PAL.settleRoof, amp: 0.4, seed: seed + 37 });
          pen([[0, -H - 60 - T * 0.5], [0, -H - 60 - T * 0.5 - 18]], { w: K.lw(o, 2.4), color: ic, seed: seed + 38, taper: 0.3 });
        });
        if (o.beam && draw >= 0.8) {                                              // the beam sweeps round: long when side-on, a flash when it faces us
          const a = t * 1.1 + seed, c = Math.cos(a), L = 620 * Math.abs(c), sd = Math.sign(c) || 1, sp = 22 + L * 0.1, ba = (o.dark ? 0.34 : 0.22) * K.ph(draw, 0.8, 1);
          if (L > 30) { const wedge = [[sd * T * 0.3, ly - 8], [sd * (T * 0.3 + L), ly - sp - L * 0.04], [sd * (T * 0.3 + L), ly + sp - L * 0.04], [sd * T * 0.3, ly + 8]];
            flat(wedge, PAL.settleLit, ba); hatch(wedge, { color: PAL.gold, alpha: ba * 1.4, gap: 8, len: 30, angle: -0.04 * sd, seed: seed + 40 }); }
          const fl = clamp(1 - Math.abs(c) * 4);
          if (fl > 0) for (let k = 0; k < 8; k++) { const an = k / 8 * TAU; pen([[Math.cos(an) * 16, ly + Math.sin(an) * 16], [Math.cos(an) * (30 + 40 * fl), ly + Math.sin(an) * (30 + 40 * fl)]], { w: 3, color: PAL.gold, alpha: fl, seed: seed + 45 + k, taper: 0.4 }); }
        }
        return;
      }
      if (kind === 'watchtower') {
        const Wt = o.w ?? 150, H = o.h ?? 360, py = -H * 0.64, cabin = R4(-Wt * 0.32, -H * 0.88, Wt * 0.64, H * 0.24);
        const roof = [[-Wt * 0.46, -H * 0.86], [0, -H], [Wt * 0.46, -H * 0.86]], legs = [[-Wt * 0.5, -Wt * 0.3], [Wt * 0.5, Wt * 0.3]];
        up(() => {
          legs.forEach(([a, b], i) => pen([[a, 0], [b, py]], { w: K.lw(o, 6), color: PAL.settleWood, seed: seed + i, taper: 0.02 }));
          legs.forEach(([a, b], i) => pen([[a * 0.55, 2], [b * 0.7, py]], { w: K.lw(o, 4), color: PAL.settleWoodDeep, seed: seed + 5 + i, taper: 0.02, alpha: 0.7 }));
          [0, 1, 2].forEach(k => { const y0 = -k * H * 0.21, y1 = y0 - H * 0.21, xa = u => lerp(Wt * 0.5, Wt * 0.3, -u / -py);
            ink([[-xa(y0), y0], [xa(y1), y1]], { w: K.lw(o, 2), color: PAL.settleWoodDeep, amp: 0.5, seed: seed + 10 + k });
            ink([[xa(y0), y0], [-xa(y1), y1]], { w: K.lw(o, 2), color: PAL.settleWoodDeep, amp: 0.5, seed: seed + 13 + k });
            ink([[-xa(y1), y1], [xa(y1), y1]], { w: K.lw(o, 2.4), color: ic, amp: 0.5, seed: seed + 16 + k }); });
          [Wt * 0.08, Wt * 0.2].forEach((x, i) => pen([[x, 0], [x, py]], { w: K.lw(o, 2), color: ic, seed: seed + 20 + i, taper: 0.02 }));
          for (let y = -16; y > py; y -= 22) ink([[Wt * 0.08, y], [Wt * 0.2, y]], { w: K.lw(o, 1.8), color: ic, amp: 0.3, seed: seed + 30 + y });
        }, 0, 0.45);
        if (draw < 0.4) return;
        withAlpha(K.ph(draw, 0.4, 0.7), () => {
          ink(R4(-Wt * 0.46, py - 6, Wt * 0.92, 14), { closed: true, w: K.lw(o, 2), color: ic, fill: PAL.settleWood, amp: 0.4, seed: seed + 40 });
          tex(cabin, PAL.settleWood, PAL.settleWoodDeep, o, seed + 41, { angle: 0, gap: 7, len: 30, alpha: 0.5, light: false });
          const wr = R4(-Wt * 0.22, -H * 0.84, Wt * 0.44, H * 0.1);
          flat(wr, on ? PAL.settleLit : PAL.settleDark, on ? 0.8 : 1);
          ctx.save(); trace(wr, true); ctx.clip(); person(Wt * 0.08 * Math.sin(t * 0.5 + seed), -H * 0.74 + 44, t, 0.9, o, seed + 42, { walk: 0 }); ctx.restore();
          ink(wr, { closed: true, w: K.lw(o, 1.6), color: ic, amp: 0.3, seed: seed + 43 });
          outline(cabin, o, seed + 44, 1, 2.4);
          tex(roof, PAL.settleThatch, PAL.settleThatchDeep, o, seed + 45, { angle: 1.2, gap: 5, len: 14 });
          outline(roof, o, seed + 46, 1, 2.6);
        });
        if (o.flag && draw > 0.7) { pen([[0, -H], [0, -H - 44]], { w: K.lw(o, 2.2), color: ic, seed: seed + 50, taper: 0.1 }); flag(0, -H - 44, 36, 20, t, PAL.accent, o, seed + 51); }
        if (o.ground) groundLine(o, -Wt * 0.8, Wt * 0.8, seed + 60, K.ph(draw, 0, 0.3));
        return;
      }
      const Wc = o.w ?? 140, H = o.h ?? 380;                                      // castle keep
      const g = K.memo(`s.keep|${Wc}|${H}`, () => {
        const x0 = -Wc * 0.58, x1 = Wc * 0.58, yb = -H + 26, sw = (x1 - x0) / 9, top = [[x0, yb]];
        for (let i = 0; i < 9; i++) { const y = i % 2 ? -H - 6 : -H - 30; top.push([x0 + i * sw, y], [x0 + (i + 1) * sw, y]); }
        top.push([x1, yb]);
        const dw = Wc * 0.3, dh = Wc * 0.44;
        return { body: [[-Wc / 2, 0], [-Wc * 0.46, -H + 20], [Wc * 0.46, -H + 20], [Wc / 2, 0]], top,
          slits: [[-Wc * 0.22, -H * 0.5], [Wc * 0.18, -H * 0.62], [0, -H * 0.78], [-Wc * 0.2, -H * 0.3]],
          door: [[-dw / 2, 0], ...shape.arc(0, -dh + dw / 2, dw / 2, Math.PI, TAU, 10), [dw / 2, 0]] };
      });
      up(() => {
        tex(g.body, PAL.settleStone, PAL.settleStoneDeep, o, seed + 1, { angle: 0, gap: 16, len: 24, alpha: 0.45, dots: Math.round(Wc * H / 200) });
        hatch(g.body, { color: PAL.settleStoneDeep, alpha: 0.35, gap: 16, len: 5, angle: Math.PI / 2, seed: seed + 4 });
        flat(g.door, PAL.settleDark); ink(g.door, { closed: true, w: K.lw(o, 2), color: ic, amp: 0.4, seed: seed + 5 });
        g.slits.forEach(([sx, sy], i) => { flat(R4(sx - 4, sy, 8, 30), on ? PAL.settleLit : PAL.settleDark, on ? 0.7 + 0.3 * hash3(i, Math.floor(t * 4), seed) : 1); });
        outline(g.body, o, seed + 6, 1, 2.8);
      }, 0.05, 0.55);
      if (draw < 0.5) return;
      withAlpha(K.ph(draw, 0.5, 0.75), () => { tex(g.top, PAL.settleStone, PAL.settleStoneDeep, o, seed + 7, { angle: 0, gap: 12, len: 18, alpha: 0.4 }); outline(g.top, o, seed + 8, 1, 2.8); });
      if (o.flag && draw > 0.7) { pen([[0, -H - 30], [0, -H - 110]], { w: K.lw(o, 2.4), color: ic, seed: seed + 9, taper: 0.1, draw: K.ph(draw, 0.7, 0.85) });
        if (draw > 0.85) flag(0, -H - 110, 62, 34, t, PAL.accent, o, seed + 10); }
      if (o.ground) groundLine(o, -Wc * 0.9, Wc * 0.9, seed + 20, K.ph(draw, 0, 0.3));
    });
  }

  /* ---------------- village ---------------- */
  function tree(t, x, y, sc, o, seed) {
    const sw = 2.5 * sc * Math.sin(t * 1.2 + seed), ic = K.inkOf(o.dark);
    pen([[x, y], [x + sw * 0.3, y - 30 * sc]], { w: K.lw(o, 5) * sc, color: PAL.settleWood, seed, taper: 0.3 });
    const c = K.memo(`s.tree|${seed}`, () => shape.blob(0, 0, 34, seed, 0.3, 30)).map(([a, b]) => [x + sw + a * sc, y - 58 * sc + b * sc]);
    ink(c, { closed: true, w: K.lw(o, 2), color: ic, fill: PAL.settleLeaf, amp: 0.8, seed: seed + 1 });
    shade(c, { color: PAL.settleCropDeep, alpha: 0.55, seed: seed + 2 }); nightDim(c, o, 0.25);
  }
  /** village(t, {x, y, w, h, n, seed, smoke, lit, people}): a seeded cluster of n houses in two rows on a meadow, with
      trees, a winding main path, footpaths to the back doors and people walking. Houses build up one after another;
      chimneys smoke, and at night (or lit) the windows glow. (x, y) is the left end of the front ground line. */
  function village(t, o) {
    o = K.opts(o, { w: 900, h: 200, n: 7, smoke: true, lit: null, people: 2 });
    return K.at(o, () => {
      const { w, h, n, draw, seed } = o;
      const g = K.memo(`s.vil|${w}|${h}|${n}|${seed}`, () => {
        const r = mulberry(seed), hill = shape.ridge(-40, w + 40, -h * 1.05, h * 0.12, seed, 0.004, 16);
        const path = smooth([[-40, -h * 0.28], [w * 0.22, -h * 0.16], [w * 0.5, -h * 0.4], [w * 0.78, -h * 0.2], [w + 40, -h * 0.34]], 3);
        const pathY = x => { let b = path[0]; for (const p of path) if (Math.abs(p[0] - x) < Math.abs(b[0] - x)) b = p; return b[1]; };
        const items = Array.from({ length: n }, (_, i) => { const back = i % 2 === 0, x = (i + 0.5) / n * w + (r() - 0.5) * w / n * 0.4, u = r();
          return { kind: 'house', x, y: back ? -h * (0.46 + r() * 0.12) : -h * r() * 0.06, s: back ? 0.44 + r() * 0.1 : 0.62 + r() * 0.14,
            style: u < 0.18 ? 'farmhouse' : u < 0.36 ? 'townhouse' : 'cottage', back, seed: seed + 100 + i * 7 }; });
        items.forEach(it => { if (it.back) it.spur = smooth([[it.x, it.y], [it.x + 12, (it.y + pathY(it.x)) / 2], [it.x + 4, pathY(it.x)]], 2); });
        const nt = Math.max(3, n >> 1);
        for (let i = 0; i < nt; i++) items.push({ kind: 'tree', x: (i + 0.8 + r() * 0.3) / nt * w * 0.98, y: -h * (0.6 + r() * 0.25), s: 0.8 + r() * 0.45, seed: seed + 300 + i });
        items.sort((a, b) => a.y - b.y);
        return { hill, meadow: [...hill, [w + 40, 8], [-40, 8]], path, ribbon: K.ribbon(path, 10), items };
      });
      withAlpha(K.ph(draw, 0, 0.25), () => { tex(g.meadow, PAL.settleMeadow, PAL.settleMeadowDeep, o, seed + 1, { angle: 1.25, gap: 12, len: 9, alpha: 0.28, light: false, dots: Math.round(w * 0.8) });
        hatch(g.meadow, { color: PAL.settleMeadowDeep, alpha: 0.16, gap: 17, len: 13, angle: 0.5, seed: seed + 6 });
        scribble(g.meadow, { color: PAL.settleMeadowDeep, alpha: 0.1, gap: 26, seed: seed + 7, angle: 0.25 });
        nightDim(g.meadow, o, 0.3); });
      pen(g.hill, { w: K.lw(o, 2.6), color: K.inkOf(o.dark), seed: seed + 2, taper: 0.05, draw: K.ph(draw, 0, 0.3) });
      const pd = K.ph(draw, 0.15, 0.4);
      if (pd > 0) {
        withAlpha(pd, () => { flat(g.ribbon, PAL.settleRoad); stipple(g.ribbon, Math.round(w * 0.6), { seed: seed + 3, color: PAL.settleRoadDeep, alpha: 0.4 }); nightDim(g.ribbon, o, 0.2); });
        [-10, 10].forEach((d, k) => ink(K.offset(g.path, d), { w: K.lw(o, 1.4), color: PAL.settleRoadDeep, amp: 0.6, seed: seed + 4 + k, draw: pd }));
        withAlpha(pd, () => g.items.forEach((it, i) => { if (!it.spur) return; const sb = K.ribbon(it.spur, 5.5);
          flat(sb, PAL.settleRoad); stipple(sb, 60, { seed: seed + 10 + i, color: PAL.settleRoadDeep, alpha: 0.4 }); nightDim(sb, o, 0.2);
          [-5.5, 5.5].forEach((d, k) => ink(K.offset(it.spur, d), { w: K.lw(o, 1.1), color: PAL.settleRoadDeep, alpha: 0.8, amp: 0.7, seed: seed + 20 + i * 2 + k })); }));
      }
      const N = g.items.length;
      let walked = false;
      g.items.forEach((it, j) => {
        const d = K.ph(draw, 0.25 + j / N * 0.5, 0.45 + j / N * 0.5);
        if (!walked && !it.back && it.kind === 'house') {                        // people walk the main path, between the rows
          walked = true;
          if (draw > 0.6) for (let i = 0; i < o.people; i++) {
            const u = (t * 0.022 + i / o.people + hash3(i, seed) * 0.2) % 1, fw = i % 2 === 0, [px, py] = along(g.path, fw ? u : 1 - u);
            withAlpha(clamp(Math.min(u, 1 - u) * 12) * K.ph(draw, 0.6, 0.9), () => person(px, py + 4, t, 0.55, o, seed + 400 + i, { dir: fw ? 1 : -1 }));
          }
        }
        if (it.kind === 'tree') { popAt(it.x, it.y, K.pop(d, 0, 1), () => tree(t, it.x, it.y, it.s, o, it.seed)); return; }
        house(t, { x: it.x, y: it.y, s: it.s, style: it.style, draw: d, seed: it.seed, dark: o.dark, lit: o.lit, smoke: o.smoke && j % 2 === 0, ground: true });
      });
      pen([[-40, 6], [w + 40, 6]], { w: K.lw(o, 3.2), color: K.inkOf(o.dark), seed: seed + 5, taper: 0.03, draw: K.ph(draw, 0, 0.3) });
    });
  }

  /* ---------------- skyline ---------------- */
  const inPoly = (p, x, y) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  /** skyline(t, {x, y, w, h, era, seed, lit, haze}): a seeded city silhouette standing on (x, y). era 'modern' (towers,
      setbacks, antennas with blinking lights, a crane that swings) or 'old' (gables, domes, steeples, towers with flags,
      birds wheeling). Buildings rise one by one. By day a glint slides across the glass and haze drifts; at night
      (or lit) about half the windows are lit and switch on and off. */
  function skyline(t, o) {
    o = K.opts(o, { w: 1000, h: 380, era: 'modern', lit: null, haze: true });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, old = o.era === 'old', ic = K.inkOf(o.dark), on = litOf(o);
      const g = K.memo(`s.sky|${w}|${h}|${seed}|${o.era}`, () => {
        const r = mulberry(seed), bs = [], sil = [[-10, 0]];
        for (let x = -10; x < w; ) { const bw = 40 + r() * 70, bh = h * (0.3 + r() * 0.35); sil.push([x, -bh], [Math.min(w + 10, x + bw), -bh]); x += bw; }
        sil.push([w + 10, 0]);
        const kinds = old ? ['gable', 'gable', 'dome', 'steeple', 'tower'] : ['box', 'setback', 'spire', 'slant', 'box'];
        let craned = false;
        for (let x = 4, i = 0; x < w - 40; i++) {
          const kind = kinds[Math.floor(r() * kinds.length)], bw = Math.min(w - x, (old ? 60 + r() * 60 : 52 + r() * 80) * (kind === 'steeple' ? 0.6 : 1));
          let bh = h * (old ? 0.3 + r() * 0.35 : 0.34 + r() * 0.58);
          if (kind === 'steeple') bh = Math.min(bh * 1.1, h / 1.7);
          if (kind === 'dome') bh = Math.min(bh, h - bw * 0.6);
          const X = x, X1 = x + bw; let poly, top;
          if (kind === 'setback') { poly = [[X, 0], [X, -bh * 0.66], [X + bw * 0.16, -bh * 0.66], [X + bw * 0.16, -bh], [X1 - bw * 0.16, -bh], [X1 - bw * 0.16, -bh * 0.66], [X1, -bh * 0.66], [X1, 0]]; top = [X + bw / 2, -bh]; }
          else if (kind === 'slant') { poly = [[X, 0], [X, -bh * 0.86], [X1, -bh], [X1, 0]]; top = [X1 - 8, -bh]; }
          else if (kind === 'gable') { poly = [[X, 0], [X, -bh], [X + bw / 2, -bh - bw * 0.42], [X1, -bh], [X1, 0]]; top = [X + bw / 2, -bh - bw * 0.42]; }
          else if (kind === 'dome') { poly = [[X, 0], [X, -bh], ...shape.arc(X + bw / 2, -bh, bw / 2, Math.PI, TAU, 14).slice(1, -1), [X1, -bh], [X1, 0]]; top = [X + bw / 2, -bh - bw / 2]; }
          else if (kind === 'steeple') { poly = [[X, 0], [X, -bh], [X + bw / 2, -bh - bh * 0.62], [X1, -bh], [X1, 0]]; top = [X + bw / 2, -bh * 1.62]; }
          else if (kind === 'tower') { poly = [[X, 0]]; for (let k = 0; k < 5; k++) { const y = k % 2 ? -bh : -bh - 12; poly.push([X + k * bw / 5, y], [X + (k + 1) * bw / 5, y]); } poly.push([X1, 0]); top = [X + bw / 2, -bh - 12]; }
          else { poly = [[X, 0], [X, -bh], [X1, -bh], [X1, 0]]; top = [X + bw * 0.5, -bh]; }
          const ww = old ? 11 : 13, wh = old ? 17 : 12, sx = old ? 24 : 26, sy = old ? 34 : 26, wins = [], bands = [];
          const cols = Math.max(1, Math.floor((bw - 12) / sx)), x0w = X + (bw - (cols - 1) * sx - ww) / 2;
          for (let c = 0; c < cols; c++) { const xx = x0w + c * sx; let y0 = null, y1 = null;
            for (let yy = -bh + (old ? 22 : 14); yy < -wh - 12; yy += sy) {
              if (!(inPoly(poly, xx - 3, yy - 3) && inPoly(poly, xx + ww + 3, yy + wh + 3))) continue;
              if (y0 === null) y0 = yy; y1 = yy + wh;
              if (r() > (old ? 0.1 : 0.06)) wins.push([xx + (r() - 0.5) * 1.6, yy + (r() - 0.5) * 1.6, r() < 0.45, r()]); }
            if (y0 !== null && !old) bands.push([xx - 1, y0 - 3, y1 + 3]); }
          const crane = !old && !craned && kind === 'box' && bh > h * 0.5 ? (craned = true) : false;
          bs.push({ poly, top, kind, bh: -Math.min(...poly.map(p => p[1])), x0: X, x1: X1, bw, wins, bands, crane, tone: [PAL.settleCity, '#c9c2b3', '#a9a49b', '#d2ccbe'][Math.floor(r() * 4)], seed: seed + 20 + i * 5 });
          x = X1 + 5 + r() * 16;
        }
        return { bs, sil, haze: [0, 1, 2].map(i => ({ y: -h * (0.12 + i * 0.16), L: w * (0.25 + r() * 0.15), sp: 10 + i * 6, u: r() })) };
      });
      withAlpha(K.ph(draw, 0, 0.35), () => {
        flat(g.sil, PAL.settleCityFar); hatch(g.sil, { color: PAL.settleCityDeep, alpha: 0.18, gap: 8, len: 20, angle: Math.PI / 2, seed: seed + 1 }); nightDim(g.sil, o, 0.45);
        pen(g.sil.slice(1, -1), { w: K.lw(o, 1.6), color: ic, alpha: 0.5, seed: seed + 2, taper: 0.02 });
      });
      if (o.haze && draw > 0.4) g.haze.forEach((m, i) => {                       // haze drifting behind the towers
        const x = ((m.u * (w + 2 * m.L) + t * m.sp) % (w + 2 * m.L)) - m.L, y = m.y + 3 * Math.sin(t * 0.6 + i);
        withAlpha(K.ph(draw, 0.4, 0.8) * clamp(Math.min(x + m.L, w - x) / (m.L * 0.6)) * (o.dark ? 0.35 : 0.55), () => {
          pen([[x, y], [x + m.L * 0.5, y - 2], [x + m.L, y]], { w: 8, color: o.dark ? PAL.night2 : '#f3efe4', alpha: 0.75, seed: seed + 70 + i, taper: 0.45 });
          pen([[x + m.L * 0.2, y + 6], [x + m.L * 0.8, y + 6]], { w: K.lw(o, 1.2), color: o.dark ? PAL.nightMuted : PAL.muted, alpha: 0.45, seed: seed + 75 + i, taper: 0.4 });
        });
      });
      const N = g.bs.length, gx = ((t * 150 + seed * 50) % (w + 700)) - 350, ww = old ? 11 : 9, wh = old ? 17 : 12;
      const batch = (list, col, a, jit = 0) => { if (!list.length) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.beginPath();
        list.forEach(([x, y], j) => ctx.rect(x, y, ww - (jit ? hash3(j, 5, seed) : 0), wh)); ctx.fill(); ctx.restore(); };
      g.bs.forEach((b, i) => {
        const k = K.ph(draw, 0.15 + i / N * 0.55, 0.4 + i / N * 0.55); if (k <= 0) return;
        ctx.save(); ctx.beginPath(); ctx.rect(b.x0 - 30, -(b.bh + 60) * k, b.x1 - b.x0 + 60, (b.bh + 60) * k + 10); ctx.clip();
        tex(b.poly, b.tone, PAL.settleCityDeep, o, b.seed, { angle: Math.PI / 2, gap: 9, len: 22, alpha: 0.22 });
        if (!old && b.bands.length) {                                            // glazing bands, then floor lines: fewer marks than a grid of windows
          ctx.save(); ctx.globalAlpha *= o.dark ? 0.85 : 0.5; ctx.fillStyle = o.dark ? '#191834' : PAL.settleGlass; ctx.beginPath();
          b.bands.forEach(([bx, y0, y1], j) => ctx.rect(bx, y0, ww + 2 - 3 * hash3(j, 9, b.seed), y1 - y0)); ctx.fill(); ctx.restore();
          hatch(b.poly, { color: PAL.settleCityDeep, alpha: 0.22, gap: 24, len: b.bw * 1.3, angle: 0, seed: b.seed + 1, w: 1.1 });
        }
        const lit = [], dim = [];
        b.wins.forEach(([wx, wy, l, ph], j) => { const off = hash3(i * 131 + j, Math.floor(t * 0.5 + ph * 10), seed) < 0.12;
          if (on && l !== off) lit.push([wx, wy]); else if (old || hash3(j, 11, b.seed) < 0.16) dim.push([wx, wy]); });
        batch(dim, o.dark ? '#14132b' : '#6b7488', o.dark ? 0.9 : 0.55, 1);
        batch(lit, PAL.settleLit, 0.92);
        if (!on && !old) { const gq = [[gx - 34, -b.bh - 40], [gx + 20, -b.bh - 40], [gx + 54, 20], [gx, 20]];   // daylight sliding across the glass
          ctx.save(); trace(b.poly, true); ctx.clip(); flat(gq, '#f7f3e6', 0.22); hatch(gq, { color: '#ffffff', alpha: 0.22, gap: 9, len: 22, angle: 1.35, seed: b.seed + 2 }); ctx.restore(); }
        outline(b.poly.slice(1, -1), o, b.seed + 3, 1, 2.2, false);
        ctx.restore();
        if (k < 1) return;
        const [tx, ty] = b.top;
        if (b.kind === 'spire') { pen([[tx, ty], [tx, ty - b.bh * 0.22]], { w: K.lw(o, 2), color: ic, seed: b.seed + 4, taper: 0.2 });
          if ((t + i * 0.37) % 1.4 < 0.45) ink(shape.circle(tx, ty - b.bh * 0.22, 4, 10), { closed: true, w: 1, color: ic, fill: PAL.pink, amp: 0.1, seed: b.seed + 5 }); }
        if (b.kind === 'dome' || b.kind === 'steeple') { pen([[tx, ty], [tx, ty - 22]], { w: K.lw(o, 2), color: ic, seed: b.seed + 6, taper: 0.2 });
          ink([[tx - 6, ty - 15], [tx + 6, ty - 15]], { w: K.lw(o, 2), color: ic, amp: 0.2, seed: b.seed + 7 }); }
        if (b.kind === 'tower') { pen([[tx, ty], [tx, ty - 40]], { w: K.lw(o, 2), color: ic, seed: b.seed + 8, taper: 0.1 }); flag(tx, ty - 40, 28, 15, t, PAL.accent, o, b.seed + 9); }
        if (b.crane) {                                                             // a tower crane on the roof, its jib slowly swinging
          const my = ty - 110, L = 120 * Math.cos(t * 0.35 + seed);
          pen([[tx, ty], [tx, my]], { w: K.lw(o, 3), color: PAL.sun, seed: b.seed + 10, taper: 0.02 });
          for (let yy = ty - 14; yy > my; yy -= 14) ink([[tx - 4, yy], [tx + 4, yy - 14]], { w: 1, color: ic, amp: 0.2, seed: b.seed + yy });
          ink([[tx - L * 0.35, my], [tx + L, my]], { w: K.lw(o, 2.6), color: ic, amp: 0.3, seed: b.seed + 11 });
          ink([[tx + L, my], [tx, my - 18], [tx - L * 0.35, my]], { w: 1, color: ic, amp: 0.2, seed: b.seed + 12 });
          const hx = tx + L * (0.55 + 0.1 * Math.sin(t * 0.6)), hy = my + 50 + 14 * Math.sin(t * 0.8);
          ink([[hx, my], [hx, hy]], { w: 1, color: ic, amp: 0.2, seed: b.seed + 13 });
          ink(R4(hx - 10, hy, 20, 8), { closed: true, w: 1.2, color: ic, fill: PAL.accent, amp: 0.2, seed: b.seed + 14 });
        }
      });
      if (draw >= 0.9 && old) for (let i = 0; i < 5; i++) {                         // birds wheeling over the roofs
        const a = t * 0.5 + i * 1.3, bx = w * (0.3 + 0.12 * i) + 70 * Math.cos(a), by = -h * 0.95 + 30 * Math.sin(a * 1.3), fl = 5 * Math.sin(t * 9 + i);
        pen([[bx - 9, by - fl], [bx, by], [bx + 9, by - fl]], { w: K.lw(o, 1.8), color: ic, seed: seed + 60 + i, taper: 0.3, alpha: K.ph(draw, 0.9, 1) });
      }
      pen([[-20, 0], [w + 20, 0]], { w: K.lw(o, 3.2), color: ic, seed: seed + 80, taper: 0.03, draw: K.ph(draw, 0, 0.3) });
    });
  }

  /* ---------------- road ---------------- */
  const angAt = (p, u) => { const a = along(p, Math.max(0, u - 0.004)), b = along(p, Math.min(1, u + 0.004)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  const box = (x, y, a, hl, hw) => K.rot([[x - hl, y - hw], [x + hl, y - hw], [x + hl, y + hw], [x - hl, y + hw]], a, x, y);
  /** road(t, {x, y, path, kind, width, traffic, seed}): a route along path (points relative to x, y) that draws on
      from its first point. kind 'road' (a paved road with a dashed centre line and cars both ways, headlights at
      night), 'path' (a dirt track where footprints appear behind a walker) or 'rail' (sleepers, rails and a small
      train with smoke). traffic: how many cars (default 4) or carriages (default 3). */
  function road(t, o) {
    o = K.opts(o, { path: [[0, 0], [260, -50], [560, -20], [800, -90]], kind: 'road', width: null, traffic: null });
    return K.at(o, () => {
      const { draw, seed, kind } = o, ic = K.inkOf(o.dark), wd = o.width ?? ({ path: 30, rail: 40 }[kind] || 48);
      const g = K.memo(`s.road|${o.path.map(p => p.join(',')).join(';')}|${wd}`, () => { const c = smooth(o.path, 3); return { c, L: pathLen(c), band: K.ribbon(c, wd / 2) }; });
      const dr = K.ph(draw, 0, 0.7), c = dr < 1 ? partial(g.c, dr) : g.c; if (dr <= 0 || c.length < 2) return;
      const band = dr < 1 ? K.ribbon(c, wd / 2) : g.band, L = g.L, fin = K.ph(draw, 0.7, 1);
      if (kind === 'rail') {
        flat(band, '#b3aca0'); stipple(band, Math.round(L * 1.5), { seed: seed + 1, color: PAL.settleStoneDeep, alpha: 0.5 }); nightDim(band, o, 0.25);
        const cl = pathLen(c);
        for (let s = 8; s < cl; s += 17) { const u = s / L, [px, py] = along(g.c, u), a = angAt(g.c, u) + Math.PI / 2, dx = Math.cos(a) * wd * 0.42, dy = Math.sin(a) * wd * 0.42;
          ink([[px - dx, py - dy], [px + dx, py + dy]], { w: K.lw(o, 4), color: PAL.settleWood, amp: 0.3, seed: seed + s }); }
        [-1, 1].forEach(sg => pen(K.offset(c, sg * wd * 0.24), { w: K.lw(o, 2.6), color: ic, seed: seed + 3 + sg, taper: 0.01, amp: 0.4 }));
        if (fin > 0) withAlpha(fin, () => {
          const n = o.traffic ?? 3, head = (t * 70 + seed * 13) % (L + n * 50 + 200) - 30;
          for (let k = n; k >= 0; k--) { const s = head - k * 50; if (s < 0 || s > L) continue;
            const u = s / L, [px, py] = along(g.c, u), a = angAt(g.c, u), bx = box(px, py, a, 22, 12);
            ink(bx, { closed: true, w: K.lw(o, 1.8), color: ic, fill: k ? PAL.settleCloth[(k + seed) % 6] : PAL.settleCityDeep, amp: 0.3, seed: seed + 20 + k });
            if (!k) smoke(t, px, py - 14, o, seed + 30, 0.4, clamp(Math.min(s, L - s) / 60));
            else hatch(bx, { color: PAL.ink, alpha: 0.35, gap: 5, len: 6, angle: a + 0.8, seed: seed + 25 + k }); }
        });
        return;
      }
      if (kind === 'path') {
        flat(band, PAL.settleRoad); hatch(band, { color: PAL.settleRoadDeep, alpha: 0.3, gap: 7, len: 9, angle: 0.3, seed: seed + 1 });
        stipple(band, Math.round(L * 1.2), { seed: seed + 2, color: PAL.settleRoadDeep, alpha: 0.45 }); nightDim(band, o, 0.25);
        [-1, 1].forEach(sg => ink(K.offset(c, sg * wd / 2), { w: K.lw(o, 1.4), color: PAL.settleRoadDeep, amp: 0.8, seed: seed + 3 + sg, dash: [16, 7] }));
        if (fin > 0) withAlpha(fin, () => {
          const head = (t * 42 + seed * 37) % (L + 260);
          for (let s = 10, k = 0; s < Math.min(head, L); s += 15, k++) { const a0 = clamp(1 - (head - s) / 260); if (a0 <= 0) continue;
            const u = s / L, [px, py] = along(g.c, u), a = angAt(g.c, u), sd = k % 2 ? 5 : -5, fx = px - Math.sin(a) * sd, fy = py + Math.cos(a) * sd;
            ink(shape.ellipse(fx, fy, 4.5, 2.4, a, 10), { closed: true, w: 0.8, color: PAL.settleRoadDeep, fill: PAL.settleFurrowDeep, amp: 0.1, alpha: a0 * 0.9, seed: seed + 40 + k }); }
          if (head < L) { const [px, py] = along(g.c, head / L), a = angAt(g.c, head / L), st = Math.sin(t * 7);   // seen from above: shoulders, head, swinging arms
            withAlpha(clamp(Math.min(head, L - head) / 30), () => {
              ink(shape.ellipse(px, py, 9, 6, a, 16), { closed: true, w: K.lw(o, 1.5), color: ic, fill: PAL.settleCloth[seed % 6], amp: 0.3, seed: seed + 60 });
              for (const sg of [-1, 1]) ink([[px - Math.sin(a) * sg * 5, py + Math.cos(a) * sg * 5], [px - Math.sin(a) * sg * 9 + Math.cos(a) * st * sg * 4, py + Math.cos(a) * sg * 9 + Math.sin(a) * st * sg * 4]], { w: K.lw(o, 1.6), color: ic, amp: 0.2, seed: seed + 62 + sg });
              ink(shape.circle(px + Math.cos(a) * 2, py + Math.sin(a) * 2, 4.6, 12), { closed: true, w: K.lw(o, 1.4), color: ic, fill: PAL.settleSkin, amp: 0.2, seed: seed + 64 }); }); }
        });
        return;
      }
      flat(band, PAL.settleAsphalt); hatch(band, { color: PAL.settleCityDeep, alpha: 0.28, gap: 6, len: 10, angle: 0.4, seed: seed + 1 });
      stipple(band, Math.round(L * 1.2), { seed: seed + 2, color: '#f1ead8', alpha: 0.3 }); nightDim(band, o, 0.2);
      [-1, 1].forEach(sg => pen(K.offset(c, sg * wd / 2), { w: K.lw(o, 2.4), color: ic, seed: seed + 3 + sg, taper: 0.01, amp: 0.6 }));
      ink(c, { w: K.lw(o, 2.2), color: '#f1ead8', dash: [16, 14], amp: 0.3, seed: seed + 6 });
      if (fin > 0) withAlpha(fin, () => {
        const n = o.traffic ?? 4;
        for (let k = 0; k < n; k++) {
          const fw = k % 2 === 0, sp = (38 + 14 * hash3(k, seed)) / L, u0 = (hash3(k, 7, seed) + t * sp) % 1, u = fw ? u0 : 1 - u0, dirn = fw ? 1 : -1;
          const [px, py] = along(g.c, u), a = angAt(g.c, u), off = dirn * wd * 0.23, cx = px - Math.sin(a) * off, cy = py + Math.cos(a) * off;
          withAlpha(clamp(Math.min(u, 1 - u) * L / 40), () => {                  // a car from above: body, roof, headlights
            ink(box(cx, cy, a, 17, 8.5), { closed: true, w: K.lw(o, 1.8), color: PAL.ink, fill: PAL.settleCloth[(k * 2 + seed) % 6], amp: 0.25, seed: seed + 10 + k });
            ink(box(cx - Math.cos(a) * 2 * dirn, cy - Math.sin(a) * 2 * dirn, a, 7, 7), { closed: true, w: K.lw(o, 1.2), color: PAL.ink, fill: PAL.settleGlass, amp: 0.2, seed: seed + 12 + k });
            ink([[cx + Math.cos(a) * 12 * dirn - Math.sin(a) * 6, cy + Math.sin(a) * 12 * dirn + Math.cos(a) * 6], [cx + Math.cos(a) * 12 * dirn + Math.sin(a) * 6, cy + Math.sin(a) * 12 * dirn - Math.cos(a) * 6]], { w: K.lw(o, 1.2), color: PAL.ink, alpha: 0.7, amp: 0.1, seed: seed + 13 + k });
            if (o.dark) for (const sd of [-5, 5]) { const hx = cx + Math.cos(a) * 16 * dirn - Math.sin(a) * sd, hy = cy + Math.sin(a) * 16 * dirn + Math.cos(a) * sd;
              pen([[hx, hy], [hx + Math.cos(a) * 30 * dirn, hy + Math.sin(a) * 30 * dirn]], { w: 6, color: PAL.settleLit, alpha: 0.5, seed: seed + 15 + k, taper: 0.6 }); }
          });
        }
      });
    });
  }

  /* ---------------- bridge ---------------- */
  function sideCar(x, y, dir, o, seed, col) {
    const ic = K.inkOf(o.dark);
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ink([[-10, -8], [7, -8], [11, -14], [-8, -15]], { closed: true, w: 1.2, color: ic, fill: PAL.settleGlass, amp: 0.2, seed });
    ink([[-18, -8], [18, -8], [18, -1], [-18, -1]], { closed: true, w: 1.4, color: ic, fill: col, amp: 0.2, seed: seed + 1 });
    [-11, 11].forEach((wx, i) => ink(shape.circle(wx, 0, 4, 10), { closed: true, w: 1, color: ic, fill: PAL.settleDark, amp: 0.1, seed: seed + 2 + i }));
    ctx.restore();
  }
  const addPoly = p => { ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath(); };
  /** bridge(t, {x, y, w, h, kind, n, traffic, seed}): a bridge over a river gorge, deck from (x, y) to (x + w, y), the
      water about 0.7·h below. kind 'arch' (a stone bridge of n arches with rippling reflections), 'suspension' (two
      towers and hung cables, cars crossing) or 'plank' (a rope bridge that sags and dips as a walker crosses). Banks
      and water come first, then the structure builds; the river flows underneath. */
  function bridge(t, o) {
    o = K.opts(o, { kind: 'arch', w: 640, h: 240, n: 3, traffic: true });
    return K.at(o, () => {
      const { w, h, draw, seed, kind } = o, ic = K.inkOf(o.dark), ry = h * 0.64;
      const g = K.memo(`s.bridge|${w}|${h}|${o.n}|${seed}`, () => {
        const bank = sg => { const X = x => sg > 0 ? x : w - x; return [[X(-110), -2], [X(w * 0.03), -2], [X(w * 0.05), h * 0.3], [X(w * 0.09), h * 0.6], [X(w * 0.12), h + 12], [X(-110), h + 12]]; };
        const n = o.n, rr = w / n * 0.37, spring = Math.max(34 + rr, ry * 0.62);
        return { banks: [bank(1), bank(-1)], water: R4(-110, ry, w + 220, h + 12 - ry), flows: [ry + 14, ry + 30, ry + 46].map((yy, i) => shape.ridge(-100, w + 100, yy, 3, seed + i, 0.01, 14)),
          body: R4(w * 0.02, -8, w * 0.96, ry + 8), para: R4(0, -24, w, 16), rr,
          arches: Array.from({ length: n }, (_, i) => { const cx = w * (i + 0.5) / n; return { cx, spring, open: [[cx - rr, ry + 4], ...shape.arc(cx, spring, rr, Math.PI, TAU, 18), [cx + rr, ry + 4]] }; }) };
      });
      const bd = K.ph(draw, 0, 0.3);
      withAlpha(bd, () => {
        flat(g.water, PAL.settleWater); hatch(g.water, { color: PAL.settleWaterDeep, alpha: 0.5, gap: 7, len: 14, angle: 0.02, seed: seed + 1 }); nightDim(g.water, o, 0.2);
        g.flows.forEach((p, i) => flow(p, t + i, { speed: 40 + i * 12, gap: 120, len: 36, color: PAL.settleFoam, w: K.lw(o, 2), alpha: 0.8, seed: seed + 2 + i }));
        pen([[-110, ry], [w + 110, ry]], { w: K.lw(o, 2), color: ic, alpha: 0.7, seed: seed + 13, taper: 0.02 });
        g.banks.forEach((p, i) => { tex(p, PAL.soil, PAL.settleMudDeep, o, seed + 5 + i, { angle: 0.5, gap: 7, dots: 500 });
          scribble(p, { color: PAL.settleStoneDeep, alpha: 0.25, gap: 14, seed: seed + 7 + i });
          hatch(p, { color: PAL.settleMudDeep, alpha: 0.3, gap: 22, len: 26, angle: 1.5, seed: seed + 15 + i });
          pebbles(p, 14, { seed: seed + 17 + i, rmin: 4, rmax: 11, alpha: 0.4, color: PAL.settleStoneDeep }); });
      });
      g.banks.forEach((p, i) => { pen(p.slice(0, 5), { w: K.lw(o, 2.8), color: ic, seed: seed + 9 + i, taper: 0.05, draw: bd });
        grass([p[0], p[1]].sort((a, b) => a[0] - b[0]), { every: 20, h: 10, seed: seed + 11 + i, draw: bd }); });
      const sd = K.ph(draw, 0.25, 0.85), fin = K.ph(draw, 0.85, 1);
      if (sd <= 0) return;
      if (kind === 'arch') {
        ctx.save(); ctx.beginPath(); ctx.rect(-200, ry + 4 - (ry + 40) * sd, w + 400, ry + 60); ctx.clip();
        ctx.save(); ctx.beginPath(); addPoly(g.body); addPoly(g.para); g.arches.forEach(a => addPoly(a.open.slice().reverse())); ctx.clip('evenodd');
        tex(R4(0, -24, w, ry + 30), PAL.settleStone, PAL.settleStoneDeep, o, seed + 20, { angle: 0, gap: 14, len: 22, alpha: 0.45, dots: Math.round(w * 1.2) });
        hatch(R4(0, -24, w, ry + 30), { color: PAL.settleStoneDeep, alpha: 0.3, gap: 14, len: 4, angle: Math.PI / 2, seed: seed + 23 });
        ctx.restore();
        g.arches.forEach((a, i) => {
          pen(shape.arc(a.cx, a.spring, g.rr, Math.PI, TAU, 18), { w: K.lw(o, 2.6), color: ic, seed: seed + 30 + i, taper: 0.02 });
          [-1, 1].forEach((sg, k) => pen([[a.cx + sg * g.rr, a.spring], [a.cx + sg * g.rr, ry]], { w: K.lw(o, 2.2), color: ic, seed: seed + 34 + i * 2 + k, taper: 0.02 }));
          for (let k = 1; k < 9; k++) { const an = Math.PI + k / 9 * Math.PI, ca = Math.cos(an), sa = Math.sin(an);
            ink([[a.cx + ca * g.rr, a.spring + sa * g.rr], [a.cx + ca * (g.rr + 16), a.spring + sa * (g.rr + 16)]], { w: K.lw(o, 1.4), color: ic, amp: 0.3, seed: seed + 50 + i * 9 + k }); }
        });
        pen([[0, -24], [w, -24]], { w: K.lw(o, 3), color: ic, seed: seed + 60, taper: 0.02 }); pen([[0, -8], [w, -8]], { w: K.lw(o, 2), color: ic, seed: seed + 61, taper: 0.02 });
        [0, w].forEach((X, k) => pen([[X, -24], [X, -8]], { w: K.lw(o, 2.4), color: ic, seed: seed + 62 + k, taper: 0.02 }));
        ctx.restore();
        if (fin > 0) g.arches.forEach((a, i) => { for (let k = 0; k < 3; k++) { const yy = ry + 10 + k * 12, hw = g.rr * (0.9 - k * 0.2) + 4 * Math.sin(t * 1.5 + k + i);
          pen([[a.cx - hw, yy], [a.cx + hw, yy]], { w: K.lw(o, 1.6), color: PAL.settleStone, alpha: 0.7 * fin, seed: seed + 70 + i * 3 + k, taper: 0.4 }); } });
      } else if (kind === 'suspension') {
        const sag = 3 * Math.sin(t * 0.8), top = -h * 0.95, tx = [w * 0.22, w * 0.78], mid = w / 2, half = (tx[1] - tx[0]) / 2;
        const cy = x => top + (-14 - top + sag) * (1 - ((x - mid) / half) ** 2), up = K.ph(sd, 0, 0.5), cab = K.ph(sd, 0.4, 1);
        tx.forEach((X, i) => { if (up <= 0) return; const y0 = top + (ry - top) * (1 - up), tw = R4(X - 10, y0, 20, ry - y0);
          tex(tw, PAL.settleStone, PAL.settleStoneDeep, o, seed + 20 + i, { angle: 0, gap: 12, len: 10, light: false }); outline(tw, o, seed + 22 + i, 1, 2.4);
          [0.1, 0.45].forEach((v, k) => { const yy = top + (ry - top) * v; if (yy > y0) ink([[X - 14, yy], [X + 14, yy]], { w: K.lw(o, 3), color: ic, amp: 0.3, seed: seed + 24 + i * 2 + k }); }); });
        if (cab > 0) {
          const deck = R4(-110, -6, (w + 220) * cab, 14);
          flat(deck, PAL.settleCityDeep); hatch(deck, { color: '#ffffff', alpha: 0.25, gap: 5, len: 8, angle: 1.2, seed: seed + 30 }); outline(deck, o, seed + 31, 1, 2);
          const cable = []; for (let x = tx[0]; x <= tx[1] + 0.1; x += 12) cable.push([x, cy(x)]);
          pen(cable, { w: K.lw(o, 2.8), color: ic, seed: seed + 32, taper: 0.02, draw: cab });
          [[[tx[0], top], [tx[0] * 0.45, top * 0.4 + sag], [-100, -6]], [[tx[1], top], [(tx[1] + w) / 2 + w * 0.03, top * 0.4 + sag], [w + 100, -6]]]
            .forEach((p, i) => pen(smooth(p, 2), { w: K.lw(o, 2.6), color: ic, seed: seed + 33 + i, taper: 0.02, draw: cab }));
          for (let x = tx[0] + 22; x < tx[1] - 10; x += 22) if ((x - tx[0]) / (tx[1] - tx[0]) < cab) ink([[x, cy(x)], [x, -6]], { w: K.lw(o, 1), color: ic, amp: 0.2, seed: seed + x });
        }
        if (fin > 0 && o.traffic) withAlpha(fin, () => { for (let k = 0; k < 3; k++) { const fw = k % 2 === 0, u = (t * 0.07 + k / 3 + hash3(k, seed) * 0.1) % 1, X = -100 + (w + 200) * (fw ? u : 1 - u);
          withAlpha(clamp(Math.min(u, 1 - u) * 20), () => sideCar(X, -6, fw ? 1 : -1, o, seed + 40 + k, PAL.settleCloth[(k + seed) % 6])); } });
      } else {
        const sagA = h * 0.2 * (1 + 0.05 * Math.sin(t * 1.3)), walker = fin > 0 ? (t * 0.045 + hash3(seed)) % 1 : -1;
        const dip = u => Math.sin(Math.PI * u) * sagA + 3 * Math.sin(t * 2) * Math.sin(Math.PI * u) + (walker >= 0 ? 12 * Math.sin(Math.PI * u) * Math.exp(-((u - walker) ** 2) / 0.01) : 0);
        const deckP = [], hand = []; for (let k = 0; k <= 30; k++) { const u = k / 30; deckP.push([u * w, dip(u)]); hand.push([u * w, dip(u) * 0.75 - 48]); }
        [0, w].forEach((X, i) => pen([[X, 6], [X, -58]], { w: K.lw(o, 5), color: PAL.settleWood, seed: seed + 20 + i, taper: 0.05, draw: K.ph(sd, 0, 0.3) }));
        const rd = K.ph(sd, 0.2, 1);
        pen(deckP, { w: K.lw(o, 2.4), color: ic, seed: seed + 22, taper: 0.02, draw: rd }); pen(hand, { w: K.lw(o, 2), color: ic, seed: seed + 23, taper: 0.02, draw: rd });
        for (let k = 1; k < 60; k++) { const u = k / 60; if (u > rd) break; const px = u * w, py = dip(u);
          pen([[px, py - 2], [px, py + 6]], { w: K.lw(o, 5), color: PAL.settleWood, seed: seed + 30 + k, taper: 0.1, amp: 0.2 });
          if (k % 4 === 0) ink([[px, py], [px, py * 0.75 - 48]], { w: K.lw(o, 1), color: ic, amp: 0.3, seed: seed + 100 + k }); }
        if (walker >= 0) withAlpha(fin * clamp(Math.min(walker, 1 - walker) * 25), () => person(walker * w, dip(walker) - 1, t, 0.8, o, seed + 200, { dir: 1 }));
      }
    });
  }

  /* ---------------- ship ---------------- */
  const bulge = (a, b, amt, n = 8) => Array.from({ length: n + 1 }, (_, k) => { const v = k / n; return [lerp(a[0], b[0], v) + Math.sin(Math.PI * v) * amt, lerp(a[1], b[1], v)]; });
  /** ship(t, {x, y, s, kind, w, dir, sea, wake, lit, seed}): a vessel at its waterline (x, y). kind 'sail' (a two-masted
      sailing ship whose sails billow, with a jib, rigging and a pennant), 'boat' (a rowing boat whose rower pulls the
      oars) or 'steam' (a steamer with a smoking funnel and portholes that light at night). It bobs and rolls; a wake
      trails behind. dir -1 sails left; sea: false leaves out the strip of water (put it on your own sea). */
  function ship(t, o) {
    o = K.opts(o, { kind: 'sail', w: null, dir: 1, sea: true, wake: true, lit: null });
    return K.at(o, () => {
      const { draw, seed, kind } = o, ic = K.inkOf(o.dark), on = litOf(o), W = o.w ?? ({ boat: 180, steam: 380 }[kind] || 360), H1 = W * (kind === 'boat' ? 0.14 : 0.1);
      const bob = 4 * Math.sin(t * 1.4 + seed) * W / 360, roll = 0.035 * Math.sin(t * 1.1 + seed);
      ctx.save(); ctx.scale(o.dir, 1);
      const hull = [[-W * 0.47, -H1], [W * 0.52, -H1 - W * 0.035], [W * 0.42, W * 0.02], [W * 0.3, W * 0.07], [-W * 0.36, W * 0.07], [-W * 0.46, W * 0.02]];
      const hd = K.ph(draw, 0, 0.4), md = K.ph(draw, 0.35, 0.55), sdw = K.ph(draw, 0.5, 0.85), fin = K.ph(draw, 0.8, 1);
      ctx.save(); ctx.translate(0, bob); ctx.rotate(roll);
      const funnel = [-W * 0.05, -H1 - W * 0.3, W * 0.08, W * 0.2];
      if (kind === 'steam' && md > 0) {                                          // the funnel sits behind the cabins
        ctx.save(); ctx.beginPath(); ctx.rect(-W, -H1 - W * 0.12 - W * 0.2 * md, 2 * W, W); ctx.clip();
        const fp = R4(...funnel); tex(fp, PAL.settleRoof, PAL.settleRoofDeep, o, seed + 60, { angle: Math.PI / 2, gap: 6, len: 20 });
        flat(R4(funnel[0], funnel[1], funnel[2], 12), PAL.settleCityDeep); outline(fp, o, seed + 61, 1, 2.2); ctx.restore();
      }
      if (kind === 'sail' && md > 0) {
        [[-W * 0.12, W * 0.62], [W * 0.18, W * 0.74]].forEach(([mx, mh], i) => pen([[mx, -H1 + 2], [mx, -H1 - mh]], { w: K.lw(o, 3.2), color: PAL.settleWoodDeep, seed: seed + 10 + i, taper: 0.05, draw: md }));
        pen([[W * 0.5, -H1 - W * 0.04], [W * 0.72, -H1 - W * 0.12]], { w: K.lw(o, 2.6), color: PAL.settleWoodDeep, seed: seed + 12, taper: 0.1, draw: md });
        if (sdw > 0) {
          ink([[W * 0.72, -H1 - W * 0.12], [W * 0.18, -H1 - W * 0.74], [-W * 0.12, -H1 - W * 0.62], [-W * 0.45, -H1]], { w: K.lw(o, 1), color: ic, amp: 0.3, seed: seed + 13, alpha: 0.7 * sdw });
          [[-W * 0.12, -H1 - W * 0.58, -H1 - W * 0.36, W * 0.13], [-W * 0.12, -H1 - W * 0.34, -H1 - W * 0.1, W * 0.16], [W * 0.18, -H1 - W * 0.7, -H1 - W * 0.44, W * 0.14], [W * 0.18, -H1 - W * 0.42, -H1 - W * 0.12, W * 0.18]]
            .forEach(([mx, y0, y1, hw], k) => {
              const b = W * 0.035 * (1 + 0.35 * Math.sin(t * 1.3 + k * 0.8)), yb = lerp(y0, y1, sdw);
              const sail = [...bulge([mx - hw, y0], [mx + hw, y0], -2, 4), ...bulge([mx + hw, y0], [mx + hw, yb], b), ...bulge([mx + hw, yb], [mx - hw, yb], -b * 0.4, 4).slice(1), ...bulge([mx - hw, yb], [mx - hw, y0], -b * 0.7).slice(1)];
              flat(sail, PAL.settleSail); hatch(sail, { color: PAL.settleSailDeep, alpha: 0.3, gap: 12, len: 40, angle: Math.PI / 2, seed: seed + 20 + k });
              hatch(sail, { color: PAL.settleSailDeep, alpha: 0.5, gap: 5, len: 9, angle: -0.6, seed: seed + 25 + k, keep: px => clamp((px - mx) / hw) * 0.8 }); nightDim(sail, o, 0.25);
              ink(sail, { closed: true, w: K.lw(o, 1.8), color: ic, amp: 0.4, seed: seed + 30 + k });
              ink([[mx - hw - 6, y0], [mx + hw + 6, y0]], { w: K.lw(o, 2.6), color: PAL.settleWoodDeep, amp: 0.2, seed: seed + 35 + k });
            });
          const jb = W * 0.03 * (1 + 0.3 * Math.sin(t * 1.5)), jib = [[W * 0.2, -H1 - W * 0.66], ...bulge([W * 0.2, -H1 - W * 0.66], [W * 0.68, -H1 - W * 0.12], jb).slice(1), [W * 0.22, -H1 - W * 0.08]];
          withAlpha(sdw, () => { flat(jib, PAL.settleSail); hatch(jib, { color: PAL.settleSailDeep, alpha: 0.4, gap: 6, len: 9, angle: 0.9, seed: seed + 40 }); nightDim(jib, o, 0.25);
            ink(jib, { closed: true, w: K.lw(o, 1.8), color: ic, amp: 0.4, seed: seed + 41 }); });
        }
        if (fin > 0) withAlpha(fin, () => flag(W * 0.18, -H1 - W * 0.74 - 2, W * 0.1, W * 0.045, t, PAL.accent, o, seed + 42));
      }
      if (kind === 'boat' && md > 0) withAlpha(md, () => {                          // the rower sits low; the hull hides the legs
        const pull = Math.sin(t * 2.2 + seed);
        ctx.save(); ctx.translate(-W * 0.02, -H1 + 22); ctx.rotate(-0.25 * pull); ctx.translate(W * 0.02, H1 - 22); person(-W * 0.02, -H1 + 22, t, 0.95, o, seed + 50, { walk: 0, dir: -1 }); ctx.restore();
      });
      ctx.save(); ctx.beginPath(); ctx.rect(-W, -2 * W, 2 * W, 2 * W + 6); ctx.clip();
      withAlpha(K.ph(draw, 0.1, 0.4), () => tex(hull, PAL.settleHull, PAL.settleHullDeep, o, seed + 1, { angle: -0.02, gap: 7, len: 34, alpha: 0.45 }));
      outline(hull, o, seed + 2, hd, 2.8);
      ctx.restore();
      if (hd >= 1) {
        ink([[-W * 0.46, -H1 * 0.45], [W * 0.49, -H1 * 0.55 - W * 0.02]], { w: K.lw(o, 2.4), color: kind === 'steam' ? '#f1ead8' : PAL.sun, amp: 0.4, seed: seed + 3 });
        if (kind !== 'boat') for (let i = 0; i < 5; i++) { const px = -W * 0.3 + i * W * 0.15, pc = shape.circle(px, -H1 * 0.55, W * 0.012 + 1.5, 10);
          ink(pc, { closed: true, w: K.lw(o, 1.2), color: ic, fill: on ? PAL.settleLit : PAL.settleGlass, amp: 0.1, seed: seed + 4 + i }); }
      }
      if (kind === 'steam' && md > 0) withAlpha(md, () => {
        const cab = R4(-W * 0.3, -H1 - W * 0.1, W * 0.5, W * 0.1), br = R4(-W * 0.02, -H1 - W * 0.17, W * 0.16, W * 0.07);
        [cab, br].forEach((p, i) => { tex(p, '#f1ead8', PAL.settleStoneDeep, o, seed + 62 + i, { angle: 0, gap: 7, len: 14, alpha: 0.2 }); outline(p, o, seed + 64 + i, 1, 2); });
        for (let i = 0; i < 6; i++) win([-W * 0.27 + i * W * 0.078, -H1 - W * 0.075, W * 0.04, W * 0.04], o, t, seed + 66 + i * 4, on && i % 3 !== 1);
        pen([[W * 0.25, -H1 - 2], [W * 0.25, -H1 - W * 0.36]], { w: K.lw(o, 2.4), color: ic, seed: seed + 90, taper: 0.1 });
        if (fin > 0) flag(W * 0.25, -H1 - W * 0.36, W * 0.07, W * 0.04, t, PAL.accent, o, seed + 91);
        smoke(t, funnel[0] + funnel[2] / 2 - W * 0.02, funnel[1], o, seed + 92, W / 260, fin);
      });
      if (kind === 'boat' && hd >= 1) {
        const a = 0.55 + 0.5 * Math.sin(t * 2.2 + seed), px = W * 0.02, py = -H1 - 2, L = W * 0.62, tip = [px - Math.cos(a) * L * 0.1 + Math.cos(a) * L, py + Math.sin(a) * L];
        pen([[px - Math.cos(a) * L * 0.25, py - Math.sin(a) * L * 0.25], tip], { w: K.lw(o, 3), color: PAL.settleWood, seed: seed + 70, taper: 0.05 });
        ink(shape.ellipse(tip[0], tip[1], 12, 4, a, 12), { closed: true, w: K.lw(o, 1.2), color: ic, fill: PAL.settleWood, amp: 0.2, seed: seed + 71 });
      }
      ctx.restore();
      if (o.sea) {
        const sh = W * 0.17, strip = [[-W * 0.99, 5], [W * 0.99, 5], [W * 0.86, 5 + sh * 0.7], [W * 0.5, 5 + sh], [-W * 0.55, 5 + sh], [-W * 0.88, 5 + sh * 0.66]];
        withAlpha(K.ph(draw, 0, 0.3), () => { flat(strip, PAL.settleWater); hatch(strip, { color: PAL.settleFoam, alpha: 0.35, gap: 8, len: 14, angle: 0.02, seed: seed + 80 });
          hatch(strip, { color: PAL.settleWaterDeep, alpha: 0.5, gap: 6, len: 12, angle: 0.02, seed: seed + 81, keep: (px, py) => clamp((py - 4) / sh * 1.4) }); nightDim(strip, o, 0.2); });
      }
      const ww = shape.ridge(-W * 0.95, W * 0.95, 4, 2, seed + 82, 0.02, 10).map(([x, y]) => [x, y + 2 * Math.sin(x * 0.03 - t * 2)]);
      pen(ww, { w: K.lw(o, 2.2), color: o.sea ? ic : PAL.settleFoam, seed: seed + 83, taper: 0.1, draw: K.ph(draw, 0, 0.3) });
      if (o.wake && fin > 0) for (let i = 0; i < 7; i++) {
        const u = (t * 0.45 + i / 7) % 1, x = -W * 0.45 - u * W * 0.5, y = 10 + u * W * 0.06 * (i % 2 ? 1 : -0.3) + (kind === 'boat' ? 0 : 4);
        pen([[x, y], [x - 14 - 20 * u, y + 2], [x - 30 - 30 * u, y]], { w: K.lw(o, 2), color: PAL.settleFoam, alpha: fin * (1 - u) * 0.95, seed: seed + 84 + i, taper: 0.4 });
      }
      if (kind === 'boat' && fin > 0) { const dip = Math.sin(t * 2.2 + seed); if (dip > 0.3) { const e = (dip - 0.3) / 0.7, cx = W * 0.02 + Math.cos(1.05) * W * 0.55;
        ink(shape.ellipse(cx, 12, 10 + 16 * (1 - e), 3 + 3 * (1 - e), 0, 16), { closed: true, w: K.lw(o, 1.4), color: PAL.settleFoam, alpha: e * fin, amp: 0.3, seed: seed + 95 }); } }
      ctx.restore();
    });
  }

  /* ---------------- cart ---------------- */
  /** cart(t, {x, y, s, w, load, wheels, spin, dust, seed}): a wooden cart standing on (x, y) with shafts to the right.
      load 'hay', 'sacks', 'barrels' or 'none'; wheels 1 (a two-wheeled cart seen side-on) or 2 (a wagon). The wheels
      turn at spin (radians per second; 0 parks it), the bed jolts and dust puffs behind. Move it by animating x. */
  function cart(t, o) {
    o = K.opts(o, { w: 220, load: 'hay', wheels: 1, spin: 2.4, dust: true });
    return K.at(o, () => {
      const { w, draw, seed } = o, ic = K.inkOf(o.dark), R = w * (o.wheels > 1 ? 0.13 : 0.17), jolt = o.spin ? 1.4 * Math.abs(Math.sin(t * o.spin * 2)) : 0;
      const bedY = -R * 1.25 - jolt, bed = R4(-w / 2, bedY - w * 0.12, w, w * 0.12), wx = o.wheels > 1 ? [-w * 0.3, w * 0.3] : [-w * 0.06];
      const g = K.memo(`s.cart|${w}|${o.load}|${seed}`, () => { const r = mulberry(seed), top = [];
        for (let k = 0; k <= 16; k++) { const u = k / 16 * 2 - 1; top.push([u * w * 0.5, -w * 0.26 * (1 - u * u) ** 0.55 - (k % 16 ? r() * 5 : 0)]); }
        return { hay: top, sacks: [[-w * 0.28, 0.2], [0, -0.1], [w * 0.26, 0.15], [-w * 0.12, -0.3], [w * 0.14, 0.4]].map(([sx, rt], i) => ({ sx, rt, r: w * (0.1 + r() * 0.02), up: i > 2 })) }; });
      if (o.dust && o.spin && draw >= 1) wx.forEach((X, j) => { for (let i = 0; i < 4; i++) { const u = (t * 0.9 + i / 4 + j * 0.13) % 1;
        ink(shape.blob(X - R * 0.9 - u * 50, -4 - u * 14, 3 + 9 * u, seed + i, 0.3, 12), { closed: true, w: K.lw(o, 1), color: PAL.settleRoadDeep, fill: PAL.settleRoad, fillAlpha: 0.7, alpha: (1 - u) * 0.8, amp: 0.3, seed: seed + 5 + i }); } });
      const ld = K.ph(draw, 0.45, 0.8);
      if (ld > 0) popAt(0, bedY - w * 0.12, ld, () => {
        const by = bedY - w * 0.12;
        if (o.load === 'hay') { const hay = [...g.hay.map(([x, y]) => [x * 0.92, by + y]), [w * 0.46, by + 4], [-w * 0.46, by + 4]];
          tex(hay, PAL.settleWheat, PAL.settleWheatDeep, o, seed + 10, { angle: 1.35, gap: 5, len: 16, alpha: 0.5 }); outline(hay, o, seed + 11, 1, 2.2);
          for (let k = 0; k < 7; k++) { const [hx, hy] = g.hay[2 + k * 2], sw = 3 * Math.sin(t * 2 + k); pen([[hx * 0.92, by + hy + 3], [hx * 0.92 + 8 + sw, by + hy - 9]], { w: K.lw(o, 1.4), color: PAL.settleWheatDeep, seed: seed + 12 + k, taper: 0.4 }); } }
        else if (o.load === 'sacks') g.sacks.forEach((sk, i) => { const cy0 = by - sk.r * (sk.up ? 1.7 : 0.75), c = K.rot(shape.blob(sk.sx, cy0, sk.r, seed + 20 + i, 0.18, 22), sk.rt * 0.3, sk.sx, by);
          ink(c, { closed: true, w: K.lw(o, 1.8), color: ic, fill: '#d7c49c', amp: 0.4, seed: seed + 30 + i });
          hatch(c, { color: PAL.settleSailDeep, alpha: 0.35, gap: 6, len: 9, angle: 1.1, seed: seed + 33 + i });
          shade(c, { color: PAL.settleSailDeep, alpha: 0.5, seed: seed + 35 + i });
          ink([[sk.sx - sk.r * 0.5, cy0 - sk.r * 0.62], [sk.sx + sk.r * 0.5, cy0 - sk.r * 0.55]], { w: K.lw(o, 1.6), color: PAL.settleWoodDeep, amp: 0.3, seed: seed + 38 + i });
          nightDim(c, o, 0.2); });
        else if (o.load === 'barrels') [-w * 0.26, 0, w * 0.26].forEach((bx, i) => { const bh = w * 0.24, bw = w * 0.18, p = [[bx - bw * 0.42, by], [bx - bw * 0.5, by - bh * 0.5], [bx - bw * 0.42, by - bh], [bx + bw * 0.42, by - bh], [bx + bw * 0.5, by - bh * 0.5], [bx + bw * 0.42, by]];
          tex(p, PAL.settleWood, PAL.settleWoodDeep, o, seed + 40 + i, { angle: Math.PI / 2, gap: 6, len: 24 }); outline(p, o, seed + 43 + i, 1, 2);
          [0.2, 0.8].forEach((v, k) => ink([[bx - bw * 0.47, by - bh * v], [bx + bw * 0.47, by - bh * v]], { w: K.lw(o, 2), color: PAL.settleStoneDeep, amp: 0.3, seed: seed + 46 + i * 2 + k })); });
      });
      withAlpha(K.ph(draw, 0.15, 0.45), () => { tex(bed, PAL.settleWood, PAL.settleWoodDeep, o, seed + 50, { angle: 0, gap: 7, len: 40, alpha: 0.5 });
        [0.33, 0.66].forEach((v, k) => ink([[-w / 2, bed[0][1] + w * 0.12 * v], [w / 2, bed[0][1] + w * 0.12 * v]], { w: K.lw(o, 1.2), color: PAL.settleWoodDeep, amp: 0.3, seed: seed + 51 + k })); });
      outline(bed, o, seed + 53, K.ph(draw, 0.1, 0.4), 2.4);
      pen([[w / 2 - 6, bedY - w * 0.03], [w / 2 + w * 0.46, -R * 0.45]], { w: K.lw(o, 4), color: PAL.settleWood, seed: seed + 54, taper: 0.1, draw: K.ph(draw, 0.2, 0.5) });
      pen([[w / 2 + w * 0.43, -R * 0.2], [w / 2 + w * 0.47, -R * 0.75]], { w: K.lw(o, 3), color: PAL.settleWoodDeep, seed: seed + 55, taper: 0.1, alpha: K.ph(draw, 0.4, 0.6) });
      wx.forEach((X, j) => {
        const wd = K.ph(draw, 0.3 + j * 0.1, 0.7 + j * 0.1); if (wd <= 0) return;
        const a = t * o.spin + j, rim = shape.circle(X, -R, R, 36);
        pen(rim, { closed: true, w: K.lw(o, 5), color: PAL.settleWoodDeep, seed: seed + 60 + j, draw: wd });
        ink(shape.circle(X, -R, R * 0.84, 30), { closed: true, w: K.lw(o, 1.4), color: ic, amp: 0.4, seed: seed + 62 + j, draw: wd });
        withAlpha(wd, () => { for (let k = 0; k < 8; k++) { const an = a + k / 8 * TAU; pen([[X + Math.cos(an) * R * 0.14, -R + Math.sin(an) * R * 0.14], [X + Math.cos(an) * R * 0.86, -R + Math.sin(an) * R * 0.86]], { w: K.lw(o, 2.6), color: PAL.settleWood, seed: seed + 64 + k, taper: 0.1, amp: 0.3 }); }
          ink(shape.circle(X, -R, R * 0.16, 12), { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.settleWoodDeep, amp: 0.2, seed: seed + 74 + j }); });
      });
      groundLine(o, -w * 0.7, w * 1.05, seed + 80, K.ph(draw, 0, 0.3), false);
    });
  }

  /* ---------------- fields ---------------- */
  const FIELD = { wheat: ['settleWheat', 'settleWheatDeep'], crop: ['settleCrop', 'settleCropDeep'], furrow: ['settleFurrow', 'settleFurrowDeep'], fallow: ['settleMeadow', 'settleMeadowDeep'] };
  /** fields(t, {x, y, w, h, cols, rows, hedges, seed}): a patchwork of farm fields seen at an angle, receding up to
      (x, y - h) from the front edge at (x, y). Each patch is wheat, a green crop, ploughed furrows or fallow ground; crop
      rows sway, gusts run across the wheat, and hedgerows with bushes and a few trees divide the patches. Patches fill
      in from the front corner. */
  function fields(t, o) {
    o = K.opts(o, { w: 900, h: 300, cols: 5, rows: 3, hedges: true });
    return K.at(o, () => {
      const { w, h, cols, rows, draw, seed } = o, ic = K.inkOf(o.dark);
      const g = K.memo(`s.fields|${w}|${h}|${cols}|${rows}|${seed}`, () => {
        const r = mulberry(seed), P = [];
        for (let j = 0; j <= rows; j++) { P.push([]); const v = j / rows, y = -h * (1 - v ** 1.35);
          for (let i = 0; i <= cols; i++) { const u = i / cols, inner = i > 0 && i < cols && j > 0 && j < rows;
            P[j].push([w / 2 + (u - 0.5) * w * (0.86 + 0.24 * v) + (inner ? (r() - 0.5) * w / cols * 0.3 : 0), y + (inner ? (r() - 0.5) * h / rows * 0.2 : 0)]); } }
        const kinds = Object.keys(FIELD), cells = [];
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const TL = P[j][i], TR = P[j][i + 1], BR = P[j + 1][i + 1], BL = P[j + 1][i], kind = kinds[Math.floor(r() * kinds.length)], across = r() < 0.5;
          const span = across ? Math.hypot(BL[0] - TL[0], BL[1] - TL[1]) : Math.hypot(TR[0] - TL[0], TR[1] - TL[1]), m = Math.max(3, Math.round(span / (kind === 'furrow' ? 9 : 13)));
          const lines = []; for (let k = 1; k < m; k++) { const v = k / m; lines.push(across ? [[lerp(TL[0], BL[0], v), lerp(TL[1], BL[1], v)], [lerp(TR[0], BR[0], v), lerp(TR[1], BR[1], v)]] : [[lerp(TL[0], TR[0], v), lerp(TL[1], TR[1], v)], [lerp(BL[0], BR[0], v), lerp(BL[1], BR[1], v)]]); }
          cells.push({ poly: [TL, TR, BR, BL], kind, lines, across, order: (cols - 1 - i + rows - 1 - j) / (cols + rows - 2 || 1), i, j, depth: (j + 1) / rows });
        }
        const edges = [];
        for (let j = 0; j <= rows; j++) edges.push(P[j]);
        for (let i = 0; i <= cols; i++) edges.push(P.map(row => row[i]));
        const bushes = []; edges.forEach((e, k) => { const L = pathLen(e); for (let s = 10; s < L; s += 34) { const [bx, by] = along(e, s / L); bushes.push([bx, by, (3 + 4 * (1 + by / h)) * (0.8 + r() * 0.4), k]); } });
        const trees = Array.from({ length: Math.max(2, cols - 1) }, () => { const j = 1 + Math.floor(r() * rows), i = Math.floor(r() * (cols + 1)); return [P[j][i][0], P[j][i][1], 0.35 + 0.5 * j / rows]; }).sort((a, b) => a[1] - b[1]);
        return { cells, edges, bushes, trees, all: [P[0][0], P[0][cols], P[rows][cols], P[rows][0]] };
      });
      const gust = ((t * 150 + seed * 40) % (w + 500)) - 250;
      g.cells.forEach(c => {
        const d = K.ph(draw, 0.05 + c.order * 0.5, 0.35 + c.order * 0.5); if (d <= 0) return;
        const [base, deep] = FIELD[c.kind].map(k => PAL[k]);
        withAlpha(d, () => {
          flat(c.poly, base);
          stipple(c.poly, 160, { seed: seed + c.i * 7 + c.j, color: deep, alpha: 0.3 });
          if (c.kind === 'fallow') hatch(c.poly, { color: deep, alpha: 0.3, gap: 8, len: 7, angle: 0.4, seed: seed + c.i + 40 });
          ctx.save(); trace(c.poly, true); ctx.clip();
          const sway = c.kind === 'wheat' || c.kind === 'crop';
          c.lines.forEach((ln, k) => { if (k / c.lines.length > d) return;
            const sw = sway ? 1.6 * c.depth * Math.sin(t * 1.8 + k * 0.6 + c.i) : 0, q = c.across ? ln.map(([x, y]) => [x + sw, y]) : ln.map(([x, y]) => [x + sw * (y - ln[0][1]) / 60, y]);
            ink(q, { w: K.lw(o, c.kind === 'furrow' ? 1.8 : 1.3), color: deep, alpha: c.kind === 'crop' ? 0.8 : 0.55, amp: 0.6, seed: seed + k + c.i * 31, dash: c.kind === 'crop' ? [4, 5] : null }); });
          if (c.kind === 'wheat') for (let k = 0; k < 3; k++) { const gy = lerp(c.poly[0][1], c.poly[3][1], (k + 0.5) / 3), gx = gust - k * 30 + gy * 0.3;
            pen([[gx - 40, gy], [gx, gy - 2], [gx + 40, gy]], { w: 5 * c.depth + 2, color: '#f6e7b8', alpha: 0.6, seed: seed + k + c.i * 11, taper: 0.45 }); }
          ctx.restore();
          nightDim(c.poly, o, 0.3);
        });
      });
      if (o.hedges) {
        const hd = K.ph(draw, 0.4, 0.8);
        g.edges.forEach((e, k) => ink(e, { w: K.lw(o, 3), color: PAL.settleHedge, amp: 1, seed: seed + 200 + k, draw: hd }));
        if (hd > 0) g.bushes.forEach(([bx, by, br, k], i) => { if (i / g.bushes.length > hd) return;
          ink(shape.circle(bx, by - br * 0.4, br, 10), { closed: true, w: K.lw(o, 1.1), color: o.dark ? PAL.nightInk : PAL.settleCropDeep, fill: PAL.settleHedge, amp: 0.4, seed: seed + 300 + i }); });
        g.trees.forEach(([tx, ty, ts], i) => popAt(tx, ty, K.pop(draw, 0.7 + i * 0.04, 0.9 + i * 0.03), () => tree(t, tx, ty, ts, o, seed + 500 + i)));
      }
      pen([g.all[3], g.all[2]], { w: K.lw(o, 3), color: ic, seed: seed + 600, taper: 0.03, draw: K.ph(draw, 0, 0.3) });
      pen([g.all[0], g.all[1]], { w: K.lw(o, 2), color: ic, alpha: 0.6, seed: seed + 601, taper: 0.03, draw: K.ph(draw, 0, 0.3) });
    });
  }

  /* ---------------- market ---------------- */
  const GOODS = ['fruit', 'jars', 'cloth', 'bread'];
  /** market(t, {x, y, w, n, goods, people, lit, seed}): a row of n market stalls standing on a cobbled street from (x, y):
      striped awnings with a fringe that flutters, hanging signs that swing, sellers behind counters of goods (goods:
      a list from 'fruit', 'jars', 'cloth', 'bread'), and people walking past. At night (or lit) lanterns glow. */
  function market(t, o) {
    o = K.opts(o, { w: 760, n: 3, goods: null, people: 4, lit: null });
    return K.at(o, () => {
      const { w, n, draw, seed } = o, ic = K.inkOf(o.dark), on = litOf(o), sw = w / n, H = Math.min(230, sw * 1.05);
      const street = R4(-30, 0, w + 60, 46);
      withAlpha(K.ph(draw, 0, 0.2), () => { tex(street, PAL.settleStone, PAL.settleStoneDeep, o, seed + 1, { angle: 0, gap: 9, len: 12, alpha: 0.45, light: false, dots: Math.round(w * 0.5) });
        hatch(street, { color: PAL.settleStoneDeep, alpha: 0.35, gap: 9, len: 3, angle: Math.PI / 2, seed: seed + 2 }); });
      pen([[-30, 0], [w + 30, 0]], { w: K.lw(o, 3), color: ic, seed: seed + 3, taper: 0.03, draw: K.ph(draw, 0, 0.25) });
      const cols = [[PAL.settleRoof, '#f1ead8'], [PAL.sea, '#f1ead8'], [PAL.leaf, '#f1ead8'], [PAL.sun, '#f1ead8']];
      for (let i = 0; i < n; i++) {
        const d = K.ph(draw, 0.15 + i / n * 0.45, 0.45 + i / n * 0.45); if (d <= 0) continue;
        const x0 = i * sw + sw * 0.1, x1 = (i + 1) * sw - sw * 0.1, cx = (x0 + x1) / 2, kind = (o.goods && o.goods[i % o.goods.length]) || GOODS[(i + seed) % 4], ss = seed + 20 + i * 40;
        const [ca, cb] = cols[(i + seed) % cols.length];
        [x0, x1].forEach((X, k) => pen([[X, 0], [X, -H]], { w: K.lw(o, 4), color: PAL.settleWood, seed: ss + k, taper: 0.03, draw: K.ph(d, 0, 0.4) }));
        if (d > 0.3) withAlpha(K.ph(d, 0.3, 0.6), () => person(cx + 12 * Math.sin(t * 0.4 + i), -52, t, 0.95, o, ss + 3, { walk: 0, dir: i % 2 ? 1 : -1 }));
        const cnt = R4(x0 + 4, -70, x1 - x0 - 8, 70);
        withAlpha(K.ph(d, 0.2, 0.5), () => { tex(cnt, PAL.settleWood, PAL.settleWoodDeep, o, ss + 4, { angle: 0, gap: 8, len: 40, alpha: 0.5 }); outline(cnt, o, ss + 5, 1, 2.2); });
        popAt(cx, -70, K.pop(d, 0.55, 0.85), () => {
          const gw = x1 - x0 - 30;
          if (kind === 'fruit') for (let k = 0; k < 11; k++) { const row = k < 6 ? 0 : 1, fx = cx - gw / 2 + 12 + (row ? (k - 6) * (gw - 24) / 4 + (gw - 24) / 10 : k * (gw - 24) / 5), fy = -78 - row * 12, fc = [PAL.accent, PAL.sun, PAL.leaf][(k + i) % 3];
            ink(shape.circle(fx, fy, 8, 14), { closed: true, w: K.lw(o, 1.3), color: ic, fill: fc, amp: 0.3, seed: ss + 10 + k });
            ink([[fx - 3, fy - 3], [fx - 1, fy - 5]], { w: 1.4, color: '#ffffff', alpha: 0.7, amp: 0.1, seed: ss + 25 + k }); }
          if (kind === 'jars') for (let k = 0; k < 5; k++) { const jx = cx - gw / 2 + 10 + k * (gw - 20) / 4, jh = 20 + (k % 2) * 8, jp = [[jx - 8, -70], [jx - 9, -70 - jh + 4], [jx - 5, -70 - jh], [jx + 5, -70 - jh], [jx + 9, -70 - jh + 4], [jx + 8, -70]];
            ink(jp, { closed: true, w: K.lw(o, 1.3), color: ic, fill: [PAL.sun, PAL.pink, PAL.mint][k % 3], fillAlpha: 0.85, amp: 0.3, seed: ss + 10 + k });
            flat(R4(jx - 6, -70 - jh - 5, 12, 5), PAL.settleWood); }
          if (kind === 'cloth') for (let k = 0; k < 4; k++) { const bw = gw * 0.42, bx = cx - gw / 2 + (k % 2) * gw * 0.52, by = -70 - 12 - Math.floor(k / 2) * 13, p = KIT.rrect(bx, by, bw, 12, 5);
            ink(p, { closed: true, w: K.lw(o, 1.3), color: ic, fill: PAL.settleCloth[(k + i) % 6], amp: 0.3, seed: ss + 10 + k }); hatch(p, { color: PAL.ink, alpha: 0.3, gap: 4, len: 5, angle: 1.3, seed: ss + 15 + k }); }
          if (kind === 'bread') for (let k = 0; k < 5; k++) { const lx = cx - gw / 2 + 16 + k * (gw - 32) / 4, lp = shape.ellipse(lx, -78 - (k % 2) * 6, 15, 8, (k - 2) * 0.1, 18);
            ink(lp, { closed: true, w: K.lw(o, 1.3), color: ic, fill: PAL.settleThatch, amp: 0.3, seed: ss + 10 + k });
            [-5, 1, 7].forEach((dx, m) => ink([[lx + dx - 2, -80 - (k % 2) * 6], [lx + dx + 2, -76 - (k % 2) * 6]], { w: 1.2, color: PAL.settleThatchDeep, amp: 0.1, seed: ss + 30 + k * 3 + m })); }
        });
        const ad = K.pop(d, 0.35, 0.7);
        if (ad > 0) popAt(cx, -H - 20, ad, () => {
          const top = -H - 34, bot = -H + 16, aw = [[x0 + 6, top], [x1 - 6, top], [x1 + 18, bot], [x0 - 18, bot]], ns = 6;
          flat(aw, ca);
          ctx.save(); trace(aw, true); ctx.clip();
          for (let k = 1; k < ns; k += 2) flat([[lerp(x0 + 6, x1 - 6, k / ns), top], [lerp(x0 + 6, x1 - 6, (k + 1) / ns), top], [lerp(x0 - 18, x1 + 18, (k + 1) / ns), bot], [lerp(x0 - 18, x1 + 18, k / ns), bot]], cb);
          hatch(aw, { color: PAL.ink, alpha: 0.18, gap: 6, len: 10, angle: 1.2, seed: ss + 40 }); ctx.restore(); nightDim(aw, o, 0.25);
          outline(aw, o, ss + 41, 1, 2.4);
          for (let k = 0; k < ns; k++) { const a0 = lerp(x0 - 18, x1 + 18, k / ns), a1 = lerp(x0 - 18, x1 + 18, (k + 1) / ns), fl = 3 * Math.sin(t * 3.2 + k * 0.9 + i), mid = (a0 + a1) / 2;
            const sc = [[a0, bot], [lerp(a0, mid, 0.5), bot + 12 + fl * 0.6], [mid, bot + 16 + fl], [lerp(mid, a1, 0.5), bot + 12 + fl * 0.6], [a1, bot]];
            ink(sc, { closed: true, w: K.lw(o, 1.4), color: ic, fill: k % 2 ? cb : ca, amp: 0.3, seed: ss + 45 + k }); }
        });
        if (d >= 1) {
          const rt = 0.12 * Math.sin(t * 1.4 + i * 1.7), label = kind.toUpperCase(), lw = measure(label, { kind: 'mono', size: 12, weight: 600, ls: 2 }) + 16;
          ctx.save(); ctx.translate(cx, -H + 34); ctx.rotate(rt);
          ink([[-lw / 2 + 6, 0], [-lw / 2 + 6, 10]], { w: 1, color: ic, amp: 0.1, seed: ss + 60 }); ink([[lw / 2 - 6, 0], [lw / 2 - 6, 10]], { w: 1, color: ic, amp: 0.1, seed: ss + 61 });
          ink(R4(-lw / 2, 10, lw, 22), { closed: true, w: 1.4, color: PAL.ink, fill: PAL.settleCanvas, amp: 0.3, seed: ss + 62 });
          text(label, 0, 26, { kind: 'mono', size: 12, weight: 600, ls: 2, align: 'center', color: PAL.ink, role: 'decor' });   // painted on the stall
          ctx.restore();
          if (on) { const lx = x1 - 14, ly = -H + 44 + 3 * Math.sin(t * 1.3 + i); ink([[lx, -H + 16], [lx, ly - 8]], { w: 1, color: ic, amp: 0.1, seed: ss + 63 });
            flat(shape.circle(lx, ly, 22, 16), PAL.settleLit, 0.12 + 0.05 * hash3(i, Math.floor(t * 6), seed));
            ink(shape.circle(lx, ly, 7, 12), { closed: true, w: 1.3, color: ic, fill: PAL.settleLit, amp: 0.2, seed: ss + 64 }); }
        }
      }
      const pa = K.ph(draw, 0.7, 1);
      if (pa > 0) for (let k = 0; k < o.people; k++) {
        const sp = 0.035 + 0.02 * hash3(k, seed), u = (t * sp + hash3(k, 3, seed) * 2) % 2, fw = u < 1, X = -20 + (w + 40) * (fw ? u : 2 - u);
        withAlpha(pa, () => person(X, 30 + (k % 2) * 10, t, 1.05, o, seed + 700 + k, { dir: fw ? 1 : -1 }));
      }
    });
  }

  /* ---------------- map ---------------- */
  /** map(t, {x, y, w, h, title, route, labels, compass, seed}): a hand-drawn map card with its top-left at (x, y): a
      seeded coastline with contour rings, hills and woods, an island, drifting wave marks, a dashed route (route:
      points in 0..1 of the card) with a boat that travels it, a compass whose needle settles, a scale bar, labels
      (labels: [[text, u, v], ...]) and a title. The card stays paper-coloured on night plates. */
  function map(t, o) {
    o = K.opts(o, { w: 560, h: 400, title: 'THE KNOWN COAST', route: null, labels: null, compass: true });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, ic = K.inkOf(o.dark), m = Math.min(w, h);
      const route = o.route || [[0.1, 0.16], [0.26, 0.3], [0.36, 0.5], [0.3, 0.72], [0.56, 0.86], [0.8, 0.68]];
      const labels = o.labels || [['PORT', 0.12, 0.13], ['HIGHLANDS', 0.36, 0.42], ['ISLE', 0.8, 0.6]];
      const g = K.memo(`s.map|${w}|${h}|${seed}|${route.join(';')}`, () => {
        const r = mulberry(seed), land = smooth(shape.blob(w * 0.44, h * 0.5, m * 0.37, seed, 0.42, 36), 2, true), isle = shape.blob(w * 0.8, h * 0.7, m * 0.08, seed + 3, 0.3, 24);
        const sc = (p, k, cx, cy) => p.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
        const inner = sc(land, 0.62, w * 0.44, h * 0.5), pts = (n, test) => { const out = []; for (let k = 0; k < n * 40 && out.length < n; k++) { const x = w * (0.06 + r() * 0.88), y = h * (0.08 + r() * 0.84); if (test(x, y)) out.push([x, y, r()]); } return out; };
        return { land, isle, contours: [0.78, 0.55].map(k => sc(land, k, w * 0.44, h * 0.5)), ripple: sc(land, 1.07, w * 0.44, h * 0.5),
          hills: pts(7, (x, y) => inPoly(inner, x, y)), woods: pts(6, (x, y) => inPoly(land, x, y) && !inPoly(inner, x, y)),
          waves: pts(14, (x, y) => !inPoly(sc(land, 1.15, w * 0.44, h * 0.5), x, y) && !inPoly(sc(isle, 1.6, w * 0.8, h * 0.7), x, y)),
          route: smooth(route.map(([u, v]) => [u * w, v * h]), 3) };
      });
      const card = R4(0, 0, w, h), inner = R4(12, 12, w - 24, h - 24), cd = K.ph(draw, 0, 0.2);
      if (cd > 0) withAlpha(cd, () => { if (!o.dark) K.shadow(card, 6, 8, 0.14); flat(card, PAL.settleMapPaper); stipple(card, Math.round(w * h / 400), { seed: seed + 1, alpha: 0.2, color: PAL.settleWallDeep }); });
      ink(card, { closed: true, w: K.lw(o, 2.4), color: ic, amp: 0.6, seed: seed + 2, draw: K.ph(draw, 0, 0.25), double: true });
      ctx.save(); trace(inner, true); ctx.clip();
      const sd = K.ph(draw, 0.1, 0.3);
      withAlpha(sd, () => { flat(inner, PAL.settleMapSea); hatch(inner, { color: PAL.settleWaterDeep, alpha: 0.28, gap: 8, len: 14, angle: 0.02, seed: seed + 3 }); });
      if (draw > 0.3) g.waves.forEach(([wx, wy, p], i) => { const x = wx + ((t * 6 + p * 40) % 40) - 20, y = wy + 2 * Math.sin(t + p * 6), a = Math.sin(Math.PI * (((t * 6 + p * 40) % 40) / 40));
        pen([[x, y], [x + 6, y - 3], [x + 12, y], [x + 18, y - 3]], { w: 1.4, color: PAL.settleWaterDeep, alpha: 0.7 * a * K.ph(draw, 0.3, 0.5), seed: seed + 10 + i, taper: 0.3, amp: 0.3 }); });
      const ld = K.ph(draw, 0.2, 0.5);
      ink(g.ripple, { closed: true, w: 1.2, color: PAL.settleWaterDeep, alpha: (0.45 + 0.25 * Math.sin(t * 1.5)) * ld, dash: [6, 6], amp: 0.8, seed: seed + 20 });
      [g.land, g.isle].forEach((p, k) => {
        withAlpha(ld, () => { flat(p, PAL.settleMapLand); stipple(p, k ? 60 : 500, { seed: seed + 21 + k, alpha: 0.3, color: PAL.settleWallDeep });
          shade(p, { color: PAL.settleWallDeep, alpha: 0.3, gap: 6, seed: seed + 23 + k }); });
        pen(p, { closed: true, w: 2.4, color: PAL.ink, seed: seed + 25 + k, draw: K.ph(draw, 0.15, 0.5) });
      });
      g.contours.forEach((p, k) => ink(p, { closed: true, w: 1, color: PAL.settleWallDeep, alpha: 0.6 * K.ph(draw, 0.4, 0.6), amp: 1.2, seed: seed + 30 + k }));
      g.hills.forEach(([hx, hy, q], i) => { const k = K.pop(draw, 0.45 + i * 0.02, 0.6 + i * 0.02); if (k <= 0) return; const s2 = (10 + q * 8) * k;
        pen([[hx - s2, hy], [hx, hy - s2 * 1.1], [hx + s2, hy]], { w: 2, color: PAL.ink, seed: seed + 40 + i, taper: 0.1 });
        ink([[hx + s2 * 0.2, hy - s2 * 0.7], [hx + s2 * 0.55, hy - 1]], { w: 1, color: PAL.ink, alpha: 0.6, amp: 0.2, seed: seed + 50 + i }); });
      g.woods.forEach(([tx, ty], i) => { const k = K.pop(draw, 0.5 + i * 0.02, 0.65 + i * 0.02); if (k <= 0) return;
        for (let j = 0; j < 3; j++) { const bx = tx + (j - 1) * 8, by = ty + (j % 2) * 5, sw = Math.sin(t * 1.4 + i + j) * 0.6;
          ink([[bx, by + 5], [bx, by]], { w: 1, color: PAL.ink, amp: 0.1, seed: seed + 60 + i * 3 + j });
          ink(shape.circle(bx + sw, by - 3, 4 * k, 10), { closed: true, w: 1, color: PAL.ink, fill: PAL.settleLeaf, amp: 0.2, seed: seed + 70 + i * 3 + j }); } });
      const rd = K.ph(draw, 0.55, 0.85);
      ink(partial(g.route, rd), { w: 2.2, color: PAL.accent, dash: [7, 6], amp: 0.4, seed: seed + 80, draw: rd > 0 ? 1 : 0 });
      if (rd > 0) { const [sx0, sy0] = g.route[0]; ink(shape.circle(sx0, sy0, 5, 12), { closed: true, w: 1.6, color: PAL.ink, fill: PAL.accent, amp: 0.2, seed: seed + 81 });
        const [ex, ey] = g.route[g.route.length - 1]; if (rd >= 1) { ink([[ex - 7, ey - 7], [ex + 7, ey + 7]], { w: 2.6, color: PAL.accent, amp: 0.2, seed: seed + 82 }); ink([[ex + 7, ey - 7], [ex - 7, ey + 7]], { w: 2.6, color: PAL.accent, amp: 0.2, seed: seed + 83 }); } }
      if (draw >= 0.85) {                                                           // a boat sailing the route, leaving a solid trail
        const u = (t * 0.07) % 1, fade = clamp(Math.min(u, 1 - u) * 12) * K.ph(draw, 0.85, 1), [bx, by] = along(g.route, u), a = angAt(g.route, u), fl = Math.cos(a) < 0 ? -1 : 1;
        withAlpha(fade, () => {
          pen(subpath(g.route, Math.max(0, u - 0.1), u), { w: 3, color: PAL.accent, seed: seed + 84, taper: 0.5 });
          ink(shape.circle(bx, by, 10 + 6 * ((t * 1.5) % 1), 16), { closed: true, w: 1.2, color: PAL.accent, alpha: 1 - ((t * 1.5) % 1), amp: 0.2, seed: seed + 85 });
          ctx.save(); ctx.translate(bx, by + Math.sin(t * 3) * 1.2); ctx.scale(fl, 1);
          ink([[-11, -2], [11, -2], [7, 4], [-8, 4]], { closed: true, w: 1.4, color: PAL.ink, fill: PAL.settleHull, amp: 0.2, seed: seed + 86 });
          ink([[0, -3], [0, -18], [9 + Math.sin(t * 2), -5]], { closed: true, w: 1.2, color: PAL.ink, fill: PAL.settleSail, amp: 0.2, seed: seed + 87 });
          ctx.restore();
        });
      }
      labels.forEach(([s, u, v], i) => { const lo = { kind: 'mono', size: 22, weight: 600, ls: 2, color: PAL.inkSoft }, a = clamp((draw - 0.6 - i * 0.05) * 30);   // place names sit on a patch of map paper
        if (a > 0) flat(K.rrect(u * w - 7, v * h - 21, measure(s, lo) + 14, 29, 6), PAL.settleMapPaper, 0.92 * a);
        text(typed(s, (draw - 0.6 - i * 0.05) * 3, 12), u * w, v * h, lo); });
      ctx.restore();
      if (o.compass) { const cx = w - 62, cy = 62, cr = 36, k = K.pop(draw, 0.35, 0.6);
        if (k > 0) popAt(cx, cy, k, () => {
          flat(shape.circle(cx, cy, cr, 30), PAL.settleMapPaper, 0.9);
          ink(shape.circle(cx, cy, cr, 30), { closed: true, w: 1.6, color: PAL.ink, amp: 0.4, seed: seed + 90, double: true });
          for (let q = 0; q < 16; q++) { const an = q / 16 * TAU, l = q % 4 ? 4 : 8; ink([[cx + Math.cos(an) * cr, cy + Math.sin(an) * cr], [cx + Math.cos(an) * (cr - l), cy + Math.sin(an) * (cr - l)]], { w: 1, color: PAL.ink, amp: 0.1, seed: seed + 91 + q }); }
          const rot = 0.25 * Math.exp(-Math.max(0, t - 1) * 0.6) * Math.sin(t * 3) + 0.04 * Math.sin(t * 0.9);
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
          for (let q = 0; q < 4; q++) { const an = q * Math.PI / 2 - Math.PI / 2, L = q ? cr * 0.62 : cr * 0.82, c = Math.cos(an), s2 = Math.sin(an);
            ink([[0, 0], [c * L, s2 * L], [-s2 * 6, c * 6]], { closed: true, w: 1, color: PAL.ink, fill: q ? PAL.ink : PAL.accent, amp: 0.1, seed: seed + 110 + q });
            ink([[0, 0], [c * L, s2 * L], [s2 * 6, -c * 6]], { closed: true, w: 1, color: PAL.ink, fill: PAL.settleMapPaper, amp: 0.1, seed: seed + 115 + q }); }
          ctx.restore();
          text('N', cx, cy - cr - 6, { kind: 'mono', size: 13, weight: 600, align: 'center', color: PAL.ink, role: 'decor' });
        }); }
      const tl = K.ph(draw, 0.6, 0.9);
      if (tl > 0) { const TO = { kind: 'mono', size: 22, weight: 600, ls: 2 }, tw = Math.min(w * 0.62, measure(o.title, TO) + 30), bx = 26, by = h - 62;
        withAlpha(tl, () => { flat(R4(bx, by, tw, 38), PAL.settleMapPaper); ink(R4(bx, by, tw, 38), { closed: true, w: 1.4, color: PAL.ink, amp: 0.3, seed: seed + 120, double: true }); });
        text(typed(o.title, (draw - 0.65) * 4, 16), bx + 15, by + 27, { ...TO, color: PAL.ink });
        const sx = w - 150, sy = h - 34;
        for (let q = 0; q < 4; q++) ink(R4(sx + q * 26, sy, 26, 6), { closed: true, w: 1, color: PAL.ink, fill: q % 2 ? PAL.settleMapPaper : PAL.ink, amp: 0.1, seed: seed + 121 + q, alpha: tl });
        text('LEAGUES', sx + 52, sy - 6, { kind: 'mono', size: 10, ls: 2, align: 'center', color: PAL.inkSoft, alpha: tl, role: 'decor' }); }
    });
  }

  /* ---------------- ruins ---------------- */
  /** ruins(t, {x, y, w, h, columns, vines, seed}): the remains of an old building standing on (x, y): a broken wall with
      an arch, fluted columns (some whole with capitals and a lintel, some snapped), fallen drums and rubble. Stones build
      up from the ground, vines grow up the columns and sway, and dust drifts in the light. */
  function ruins(t, o) {
    o = K.opts(o, { w: 560, h: 300, columns: 4, vines: true });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, ic = K.inkOf(o.dark), n = Math.max(2, o.columns);
      const g = K.memo(`s.ruins|${w}|${h}|${n}|${seed}`, () => {
        const r = mulberry(seed), cw = w * 0.055, full = h * 0.92, cols = [];
        for (let i = 0; i < n; i++) { const x = w * (0.42 + i * 0.5 / (n - 1)), whole = i === 1 || i === 2 ? true : r() < 0.3, ht = whole ? full : full * (0.3 + r() * 0.4);
          const top = whole ? [[x + cw * 0.44, -ht], [x - cw * 0.44, -ht]] : Array.from({ length: 6 }, (_, k) => [x + cw * 0.44 - k / 5 * cw * 0.88, -ht - (k % 2 ? r() * 18 : r() * 6)]);
          cols.push({ x, whole, ht, body: [[x - cw / 2, -14], [x + cw / 2, -14], ...top, [x - cw / 2, -14]].slice(0, -1).concat([]), flutes: [-0.25, 0, 0.25].map(f => x + f * cw), vine: i % 2 === 0 }); }
        const wall = [[0, 0], [0, -h * 0.64], [w * 0.05, -h * 0.64], [w * 0.05, -h * 0.72], [w * 0.12, -h * 0.72], [w * 0.14, -h * 0.56], [w * 0.2, -h * 0.6], [w * 0.24, -h * 0.4], [w * 0.29, -h * 0.34], [w * 0.31, -h * 0.12], [w * 0.33, 0]];
        const arch = [[w * 0.1, 0], ...shape.arc(w * 0.15, -h * 0.3, w * 0.05, Math.PI, TAU, 12), [w * 0.2, 0]];
        const lin = cols[1].whole && cols[2].whole ? R4(cols[1].x - cw, -full - 44, cols[2].x - cols[1].x + cw * 2.2, 26) : null;
        const drums = [[w * 0.36, 0.1], [w * 0.9, -0.15]].map(([dx, rt]) => ({ dx, rt, L: cw * 2.2, r: cw * 0.5 }));
        const vines = cols.filter(c => c.vine).map((c, k) => { const pts = []; for (let v = 0; v <= 16; v++) pts.push([c.x + Math.sin(v * 1.1 + k) * cw * 0.55, -v / 16 * c.ht * 0.85]); return pts; });
        vines.push(Array.from({ length: 15 }, (_, v) => [w * 0.06 + Math.sin(v * 0.8) * w * 0.035 + v / 14 * w * 0.05, -v / 14 * h * 0.58]));
        return { cw, cols, wall, arch, lin, drums, vines, full, dust: Array.from({ length: 36 }, () => [r(), r(), r(), r()]) };
      });
      const ground = R4(-30, -6, w + 60, 26), gd = K.ph(draw, 0, 0.2);
      withAlpha(gd, () => { tex(ground, PAL.soil, PAL.settleMudDeep, o, seed + 1, { angle: 0.1, gap: 6, len: 10, light: false, dots: Math.round(w * 0.6) }); pebbles(ground, Math.round(w / 22), { seed: seed + 2, rmin: 3, rmax: 8, alpha: 0.6 }); });
      const up = (fn, a, b, top) => { const k = K.ph(draw, a, b); if (k <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(-100, -(top + 80) * k, w + 200, (top + 80) * k + 20); ctx.clip(); fn(); ctx.restore(); };
      up(() => {
        ctx.save(); ctx.beginPath(); addPoly(g.wall); addPoly(g.arch); ctx.clip('evenodd');
        tex(g.wall, PAL.settleStone, PAL.settleStoneDeep, o, seed + 3, { angle: 0, gap: 15, len: 24, alpha: 0.5, dots: 300 });
        hatch(g.wall, { color: PAL.settleStoneDeep, alpha: 0.35, gap: 15, len: 4, angle: Math.PI / 2, seed: seed + 6 }); ctx.restore();
        outline(g.wall, o, seed + 7, 1, 2.6, false); pen(shape.arc(w * 0.15, -h * 0.3, w * 0.05, Math.PI, TAU, 12), { w: K.lw(o, 2.2), color: ic, seed: seed + 8, taper: 0.05 });
        [[w * 0.1, -h * 0.3], [w * 0.2, -h * 0.3]].forEach(([ax, ay], k) => pen([[ax, ay], [ax, 0]], { w: K.lw(o, 2), color: ic, seed: seed + 9 + k, taper: 0.05 }));
      }, 0.05, 0.4, h * 0.72);
      g.cols.forEach((c, i) => up(() => {
        const base = R4(c.x - g.cw * 0.78, -16, g.cw * 1.56, 16);
        tex(c.body, PAL.settleMarble, PAL.settleMarbleDeep, o, seed + 20 + i * 5, { angle: Math.PI / 2, gap: 6, len: 30, alpha: 0.22 });
        c.flutes.forEach((fx, k) => ink([[fx, -16], [fx, -c.ht + (c.whole ? 0 : 20)]], { w: K.lw(o, 1.1), color: PAL.settleMarbleDeep, amp: 0.4, seed: seed + 21 + i * 5 + k }));
        outline(c.body, o, seed + 24 + i * 5, 1, 2.4, !c.whole ? true : true);
        tex(base, PAL.settleMarble, PAL.settleMarbleDeep, o, seed + 60 + i, { angle: 0, gap: 5, len: 20, light: false }); outline(base, o, seed + 61 + i, 1, 2);
        if (c.whole) { const cap = [[c.x - g.cw * 0.9, -c.ht - 18], [c.x + g.cw * 0.9, -c.ht - 18], [c.x + g.cw * 0.55, -c.ht], [c.x - g.cw * 0.55, -c.ht]];
          tex(cap, PAL.settleMarble, PAL.settleMarbleDeep, o, seed + 70 + i, { angle: 0, gap: 5, len: 20, light: false }); outline(cap, o, seed + 71 + i, 1, 2.2);
          [-1, 1].forEach(sg => ink(shape.circle(c.x + sg * g.cw * 0.8, -c.ht - 10, 5, 10), { closed: true, w: K.lw(o, 1.4), color: ic, amp: 0.2, seed: seed + 72 + i })); }
      }, 0.15 + i * 0.08, 0.5 + i * 0.08, c.ht + 20));
      if (g.lin) { const k = K.pop(draw, 0.55, 0.75); if (k > 0) popAt(g.lin[0][0] + (g.lin[1][0] - g.lin[0][0]) / 2, g.lin[2][1], k, () => {
        const L = [g.lin[0], [g.lin[1][0] - 10, g.lin[1][1] + 4], [g.lin[2][0] - 18, g.lin[2][1]], g.lin[3]];
        tex(L, PAL.settleMarble, PAL.settleMarbleDeep, o, seed + 80, { angle: 0, gap: 6, len: 26 }); outline(L, o, seed + 81, 1, 2.4); }); }
      g.drums.forEach((d, i) => popAt(d.dx, -6, K.pop(draw, 0.4 + i * 0.1, 0.6 + i * 0.1), () => {
        const body = K.rot(R4(d.dx - d.L / 2, -6 - d.r * 2, d.L, d.r * 2), d.rt * 0.2, d.dx, -6), end = K.rot(shape.ellipse(d.dx + d.L / 2, -6 - d.r, d.r * 0.4, d.r, 0, 16), d.rt * 0.2, d.dx, -6);
        tex(body, PAL.settleMarble, PAL.settleMarbleDeep, o, seed + 90 + i, { angle: 0.1, gap: 6, len: 30 }); outline(body, o, seed + 92 + i, 1, 2.2);
        ink(end, { closed: true, w: K.lw(o, 1.8), color: ic, fill: PAL.settleMarble, amp: 0.3, seed: seed + 94 + i });
      }));
      pen([[-30, -6], [w + 30, -6]], { w: K.lw(o, 3), color: ic, seed: seed + 100, taper: 0.03, draw: gd });
      if (o.vines) { const vd = K.ph(draw, 0.6, 0.95);
        if (vd > 0) g.vines.forEach((v, i) => { const p = smooth(v, 2); pen(partial(p, vd), { w: K.lw(o, 2.2), color: PAL.settleVine, seed: seed + 110 + i, taper: 0.3 });
          for (let k = 2; k < v.length; k += 2) { const u = k / (v.length - 1); if (u > vd) break; const [lx, ly] = v[k], sd = k % 4 ? 1 : -1, a = sd * 0.9 + 0.2 * Math.sin(t * 1.6 + k + i), ls = 7 * K.pop(clamp((vd - u) * 6), 0, 1);
            if (ls > 0) ink(shape.ellipse(lx + Math.cos(a) * ls, ly - Math.sin(Math.abs(a)) * ls * 0.5, ls, ls * 0.45, a, 12), { closed: true, w: K.lw(o, 1), color: o.dark ? PAL.nightInk : PAL.settleCropDeep, fill: PAL.settleLeaf, amp: 0.2, seed: seed + 120 + i * 20 + k }); } }); }
      if (draw > 0.7) g.dust.forEach(([u, v, p, q], i) => { const x = ((u * w + t * (6 + q * 8)) % (w + 40)) - 20, y = -((v * h + t * (3 + p * 4)) % h) - 10, a = 0.45 + 0.4 * Math.sin(t * 2 + p * 9);
        ink(shape.circle(x, y, 1.6 + q * 2.4, 6), { closed: true, w: 0, fill: o.dark ? PAL.nightInk : PAL.settleWallDeep, amp: 0, alpha: a * K.ph(draw, 0.7, 1) * clamp(Math.min(x + 20, w + 20 - x) / 40), seed: seed + 200 + i }); });
    });
  }

  return { house, hut, tent, tower, village, skyline, road, bridge, ship, cart, fields, market, map, ruins };
})();
