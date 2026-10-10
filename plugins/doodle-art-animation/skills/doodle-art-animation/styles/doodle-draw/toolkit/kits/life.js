/* =====================  KIT.life · animals, insects, flocks, people, crowds  =====================
   Living things for any paper (or night) scene. quadruped, figure and crowd stand on the ground: x, y is the ground
   under them. insect is centred on its body and faces right (turn it with rot). fishSchool and flock fill a box with
   x, y = top-left and w, h. Walkers take walk (ground speed in px/s, before scale) or dist (distance walked so far):
   move x by the same amount (times s) and the feet stay planted. See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  lifeDeer: '#bf8a58', lifeDeerDeep: '#6b4426', lifeDog: '#b39170', lifeDogDeep: '#5f4630', lifeHorse: '#8f5f3e', lifeHorseDeep: '#4a2e1c',
  lifeFox: '#d27a3a', lifeFoxDeep: '#7a3f1c', lifeCream: '#f1e6cf', lifeHoof: '#2b2220', lifeAntler: '#d9c49a',
  lifeFish: '#9cc3cf', lifeFishDeep: '#3f6f86', lifeFishNight: '#9ad9e3', lifeFin: '#e3a03c',
  lifeBeetle: '#3f6b3a', lifeBeetleDeep: '#1f3a22', lifeLadybug: '#c8442e', lifeAnt: '#6a4030', lifeBee: '#e6c65c', lifeWing: '#e6eff2',
  lifeButterfly: '#e3a03c', lifePole: '#6b4a32', lifeButterflyDeep: '#b44e2e',
  lifeSkin: ['#f0cfae', '#e0b48a', '#c98f62', '#9a6642', '#6e4a30'],
  lifeShirt: ['#d8643a', '#2f7f98', '#6f9a58', '#8487c6', '#e3a03c', '#b85a6a', '#5f8a8a', '#c9a45a'],
  lifePants: ['#3d4a6b', '#5a4a3a', '#34403f', '#6b5a4a', '#4a4560'],
  lifeHair: ['#2b2020', '#5a3a22', '#8a6a3a', '#c9b28a', '#1b1518', '#9a4a2a'],
});
KIT.life = (() => {
  const K = KIT, PI = Math.PI;
  const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];
  const MIX = new Map(), mix = (a, b, u) => { const k = a + '|' + b + '|' + u; if (!MIX.has(k)) MIX.set(k, mixColor(a, b, u)); return MIX.get(k); };   // colours are parsed once
  /** two-bone reach from (hx, hy) to (fx, fy); side +1 bends the joint forward (+x), -1 backward */
  function ik(hx, hy, fx, fy, a, b, side) {
    let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 1;
    const dm = Math.min(d, (a + b) * 0.999); fx = hx + dx / d * dm; fy = hy + dy / d * dm; d = dm;
    const th = Math.atan2(dy, dx), al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const ang = th - side * al;
    return { knee: [hx + a * Math.cos(ang), hy + a * Math.sin(ang)], foot: [fx, fy] };
  }
  /** points along a polyline, each segment cut into k pieces */
  function dense(pts, k = 4) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) for (let j = 1; j <= k; j++) out.push([lerp(pts[i - 1][0], pts[i][0], j / k), lerp(pts[i - 1][1], pts[i][1], j / k)]);
    return out;
  }
  /** a limb: a filled tube with a pen line down each side (w0 at the root, w1 at the tip) */
  function limb(pts, w0, w1, fill, ic, o, seed, a = 1, lw = 1.5, from = 0) {
    if (a <= 0) return;
    const P = dense(pts, 4), n = P.length, rib = K.ribbon(P, u => lerp(w0, w1, u) / 2);
    withAlpha(a, () => {
      flat(rib, fill);
      const L = rib.slice(0, n), R = rib.slice(n).reverse(), i0 = Math.floor(from * (n - 1));
      pen(L.slice(i0), { w: K.lw(o, lw), color: ic, seed, taper: 0.12, amp: 0.4 });
      pen(R.slice(i0), { w: K.lw(o, lw), color: ic, seed: seed + 1, taper: 0.12, amp: 0.4 });
    });
  }
  /** gait: where a foot is relative to its hip. p = phase 0..1, duty = share of the cycle on the ground */
  function footAt(p, stride, lift, duty) {
    p = ((p % 1) + 1) % 1;
    if (p < duty) return [stride / 2 - p / duty * stride, 0];
    const q = (p - duty) / (1 - duty);
    return [-stride / 2 + E.inOutSine(q) * stride, -lift * Math.sin(PI * q)];
  }

  /* ------------------------------------------------------------------ quadruped */
  const BEASTS = {
    deer: { L: 118, H: 44, leg: 86, neck: 50, na: -1.05, hl: 36, hh: 16, fill: 'lifeDeer', deep: 'lifeDeerDeep', tail: 'flag', ears: 'leaf', antlers: true, hoof: true, stride: 0.72 },
    dog: { L: 92, H: 38, leg: 48, neck: 22, na: -0.75, hl: 34, hh: 19, fill: 'lifeDog', deep: 'lifeDogDeep', tail: 'up', ears: 'flop', hoof: false, stride: 0.8 },
    horse: { L: 152, H: 60, leg: 100, neck: 64, na: -0.9, hl: 54, hh: 21, fill: 'lifeHorse', deep: 'lifeHorseDeep', tail: 'long', ears: 'point', mane: true, hoof: true, stride: 0.7 },
    fox: { L: 88, H: 32, leg: 38, neck: 18, na: -0.55, hl: 32, hh: 16, fill: 'lifeFox', deep: 'lifeFoxDeep', tail: 'bush', ears: 'tri', hoof: false, stride: 0.85 },
  };
  /** quadruped(t, {x, y, kind, walk, dist, moving, dir, fill, antlers, look, seed}): a four-legged animal standing on
      the ground at (x, y). kind: 'deer', 'dog', 'horse' or 'fox' (or pass shape: {L, H, leg, neck, hl, hh} to change
      proportions). walk: ground speed in px/s (0 = idle: breathing, head, ears and tail keep moving); dist: distance
      walked so far, instead of walk (for eased moves). dir: 1 faces right, -1 left. look: extra head lift in radians. */
  function quadruped(t, o) {
    o = K.opts(o, { kind: 'deer', walk: 0, dist: null, moving: null, dir: 1, fill: null, antlers: null, look: 0 });
    return K.at(o, () => {
      const P = { ...(BEASTS[o.kind] || BEASTS.deer), ...(o.shape || {}) }, { L, H, leg, draw, seed } = { ...P, draw: o.draw, seed: o.seed };
      const ic = K.inkOf(o.dark), fill = o.fill || PAL[P.fill], deep = PAL[P.deep] || PAL.lifeDeerDeep;
      const m = clamp(o.moving ?? (o.walk || o.dist != null ? 1 : 0));
      const stride = leg * P.stride, duty = 0.62, cyc = stride / duty;
      const dist = o.dist ?? o.walk * t, ph = dist / cyc;
      const idle = 1 - m, br = Math.sin(t * 2.1 + seed);
      const bob = m * 1.2 * Math.cos(ph * TAU * 2);
      const cy = -leg - H * 0.1 + bob + idle * 0.6 * br, ux = L * 0.34;
      if (o.dir < 0) ctx.scale(-1, 1);
      if (!o.dark) withAlpha(K.ph(draw, 0.2, 0.6) * 0.13, () => flat(shape.ellipse(0, 1, L * 0.62, 5, 0, 24), '#2a1e14'));
      // legs: lateral-sequence walk (hind, fore, hind, fore); far legs darker and behind the body
      const a = leg * 0.52, b = leg * 0.55, la = K.ph(draw, 0.3, 0.7);
      const legs = [[-ux, 0.5, -1, true], [ux, 0.75, 1, true], [-ux, 0, -1, false], [ux, 0.25, 1, false]];
      const legPts = legs.map(([hx, off, side, far]) => {
        const [fx, fy] = footAt(ph + off, stride, leg * 0.2, duty), sh = idle * 1.5 * Math.sin(t * 0.7 + off * 9);
        const hy = cy + H * 0.12, j = ik(hx, hy, hx + (far ? 4 : -2) + m * fx + sh, m * fy, a, b, side);
        return { far, pts: [[hx, hy - H * 0.2], [hx, hy], j.knee, j.foot], foot: j.foot };
      });
      const hoof = (f, far) => P.hoof ? ink(shape.rect(f[0] - 4, f[1] - 6, 9, 7), { closed: true, w: K.lw(o, 1.2), color: ic, fill: PAL.lifeHoof, amp: 0.3, seed: seed + 5 })
        : ink(shape.ellipse(f[0] + 3, f[1] - 3, 7, 3.6, 0, 12), { closed: true, w: K.lw(o, 1.3), color: ic, fill: far ? deep : fill, amp: 0.3, seed: seed + 6 });
      const drawLeg = (lg, i) => { withAlpha(la, () => {
        limb(lg.pts, H * (lg.far ? 0.26 : 0.3), leg * 0.075, lg.far ? mix(fill, deep, 0.45) : fill, ic, o, seed + 10 + i * 3, 1, lg.far ? 1.3 : 1.6, 0.25);
        hoof(lg.foot, lg.far); }); };
      legPts.filter(l => l.far).forEach(drawLeg);
      // head pose: idle look-about and a slow dip, nodding with the walk
      const na = P.na - o.look + idle * (0.1 * Math.sin(t * 0.45 + seed) + 0.05 * Math.sin(t * 1.3)) + m * 0.05 * Math.sin(ph * TAU * 2);
      const sx = L * 0.36, sy = cy - H * 0.2, px = sx + P.neck * Math.cos(na), py = sy + P.neck * Math.sin(na);
      const ha = 0.45 - o.look * 0.5 + idle * 0.12 * Math.sin(t * 0.6 + 1) + m * 0.06 * Math.sin(ph * TAU * 2 + 0.6);
      const nx = -Math.sin(na), ny = Math.cos(na), tn = P.hh * 0.62;
      // tail (behind the body)
      const ta = K.ph(draw, 0.5, 0.9), tx = -L * 0.5, ty = cy - H * 0.28;
      if (ta > 0) withAlpha(ta, () => tail(t, P, o, tx, ty, fill, deep, ic, m, ph));
      legPts.filter(l => !l.far).forEach((l, i) => drawLeg(l, i + 2));
      // body and neck as one outline
      const body = smooth([[-L * 0.5, -H * 0.12], [-L * 0.42, -H * 0.44], [-L * 0.1, -H * 0.5], [L * 0.24, -H * 0.54],
        [lerp(L * 0.3, px, 0.5) + nx * 0 - nx * tn * 0.35, lerp(-H * 0.56, py - cy, 0.5) - ny * tn * 0.35],
        [px - nx * tn * 0.5, py - cy - ny * tn * 0.5], [px + nx * tn * 0.5, py - cy + ny * tn * 0.5],
        [lerp(L * 0.5, px, 0.4) + nx * tn * 0.4, lerp(-H * 0.1, py - cy, 0.4) + ny * tn * 0.4],
        [L * 0.52, H * 0.1], [L * 0.4, H * 0.46], [0, H * 0.5 + idle * br * 0.8], [-L * 0.3, H * 0.44], [-L * 0.53, H * 0.16]].map(([x, y]) => [x, y + cy]), 3, true);
      const fa = K.ph(draw, 0.25, 0.6);
      withAlpha(fa, () => {
        flat(body, fill);
        shade(body, { color: deep, alpha: 0.5, gap: 5, len: 8, light: [-0.3, -1], base: 0.02, gain: 0.8, seed: seed + 20 });
        hatch(body, { color: deep, alpha: 0.22, gap: 7, len: 6, angle: 0.35, w: 1.1, seed: seed + 21, keep: 0.5 });
        if (o.kind === 'deer') flat(shape.ellipse(-L * 0.44, cy - H * 0.02, L * 0.08, H * 0.22, 0.2, 16), PAL.lifeCream, 0.9);
        if (o.kind === 'fox') flat(smooth([[L * 0.34, cy + H * 0.1], [L * 0.5, cy + H * 0.05], [px + nx * tn * 0.3, py + ny * tn * 0.3], [L * 0.44, cy + H * 0.42]], 2, true), PAL.lifeCream, 0.95);
      });
      pen(body, { closed: true, w: K.lw(o, 2.6), color: ic, seed: seed + 22, draw: K.ph(draw, 0, 0.5), amp: 0.7 });
      if (P.mane) withAlpha(K.ph(draw, 0.55, 0.95), () => { const dx = Math.cos(na), dy = Math.sin(na);
        for (let k = 0; k < 11; k++) { const u = 0.08 + k / 10 * 0.95, bx = lerp(L * 0.22, px - nx * tn * 0.5, u), by = lerp(cy - H * 0.54, py - ny * tn * 0.5, u), ln = 16 + 6 * Math.sin(k * 2.1), sw = 2.5 * Math.sin(t * 1.6 + k * 0.7 + m * ph * 6);
          pen(smooth([[bx, by], [bx + nx * ln * 0.35 - dx * ln * 0.2, by + ny * ln * 0.35 - dy * ln * 0.2], [bx + nx * ln * 0.8 - dx * ln * 0.45 + sw, by + ny * ln * 0.8 - dy * ln * 0.45]], 1), { w: K.lw(o, 4), color: PAL.lifeHoof, seed: seed + 30 + k, taper: 0.5, amp: 0.4 }); }
        const [fx, fy] = [px + dx * 4 - nx * tn * 0.4, py + dy * 4 - ny * tn * 0.4];
        pen([[fx, fy], [fx + 8, fy + 2], [fx + 12 + 2 * Math.sin(t * 1.3), fy + 9]], { w: K.lw(o, 3.4), color: PAL.lifeHoof, seed: seed + 45, taper: 0.45 }); });
      // head
      const hd = K.ph(draw, 0.2, 0.6);
      if (hd > 0) { ctx.save(); ctx.translate(px, py); ctx.rotate(ha); head(t, P, o, fill, deep, ic, hd, m); ctx.restore(); }
    });
  }
  function tail(t, P, o, x, y, fill, deep, ic, m, ph) {
    const s = o.seed, sw = Math.sin(t * (m ? 3 : 1.7) + s) * (m ? 0.35 : 0.25) + (P.tail === 'up' ? 0.3 * Math.sin(t * 7) * (1 - m * 0.5) : 0);
    if (P.tail === 'flag') { x += 7; const f = K.rot(smooth([[x + 3, y - 3], [x - 8, y + 1], [x - 10, y + 13], [x - 4, y + 18], [x + 2, y + 9]], 2, true), -0.15 + 1.1 * Math.max(0, Math.sin(t * 1.3 + s)) ** 8 + (m ? 0.3 : 0), x, y);
      ink(f, { closed: true, w: K.lw(o, 1.6), color: ic, fill: PAL.lifeCream, amp: 0.4, seed: s + 40 }); return; }
    if (P.tail === 'up') { const pts = K.rot([[x + 4, y + 2], [x - 12, y - 10], [x - 20, y - 26], [x - 16, y - 38]], sw * 0.8, x, y);
      limb(smooth(pts, 2), 9, 3, fill, ic, o, s + 41); return; }
    if (P.tail === 'bush') { const pts = K.rot(smooth([[x + 4, y + 2], [x - 18, y + 4], [x - 36, y + 18], [x - 50, y + 20]], 2), sw * 0.6, x, y);
      const rib = K.ribbon(dense(pts, 3), u => 5 + 10 * Math.sin(PI * clamp(u * 0.9 + 0.1)));
      ink(rib, { closed: true, w: K.lw(o, 1.8), color: ic, fill, amp: 0.8, seed: s + 42 });
      hatch(rib, { color: deep, alpha: 0.4, gap: 5, len: 7, angle: 0.5, seed: s + 43 });
      const tip = pts[pts.length - 1]; ink(shape.blob(tip[0] + 2, tip[1], 7, s + 44, 0.3, 14), { closed: true, w: K.lw(o, 1.4), color: ic, fill: PAL.lifeCream, amp: 0.5, seed: s + 45 }); return; }
    if (P.tail === 'long') for (let k = 0; k < 6; k++) { const d = k - 2.5, sw2 = sw * (1 + k * 0.08);
      pen(smooth([[x + 4, y - 2], [x - 10 - d, y + 4 + d], [x - 18 + d * 2.5 + sw2 * 20, y + 34 + d], [x - 18 + d * 4 + sw2 * 36, y + 72 - Math.abs(d) * 3]], 2), { w: K.lw(o, 4.2 - Math.abs(d) * 0.5), color: PAL.lifeHoof, seed: s + 50 + k, taper: 0.5, amp: 0.8 }); }
  }
  function head(t, P, o, fill, deep, ic, a, m) {
    const { hl, hh } = P, s = o.seed, kind = o.kind;
    const G = K.memo(`l.head|${hl}|${hh}|${kind}`, () => {
      // the horse gets its own profile: a deep jaw, a long straight nasal bridge and a blunt muzzle
      if (kind === 'horse') return smooth([[-hh * 0.42, -hh * 0.16], [-hh * 0.12, -hh * 0.6], [hl * 0.3, -hh * 0.56],
        [hl * 0.68, -hh * 0.44], [hl * 0.94, -hh * 0.34], [hl * 1.02, -hh * 0.06], [hl * 1.0, hh * 0.24], [hl * 0.86, hh * 0.34],
        [hl * 0.56, hh * 0.34], [hl * 0.28, hh * 0.54], [hl * 0.02, hh * 0.72], [-hh * 0.34, hh * 0.44]], 3, true);
      const snout = kind === 'dog' ? [[hl * 0.55, -hh * 0.2], [hl * 0.98, -hh * 0.05], [hl * 1.0, hh * 0.28], [hl * 0.62, hh * 0.45]]
        : kind === 'fox' ? [[hl * 0.5, -hh * 0.25], [hl * 1.05, hh * 0.12], [hl * 0.98, hh * 0.3], [hl * 0.55, hh * 0.42]]
          : [[hl * 0.55, -hh * 0.32], [hl * 0.96, -hh * 0.08], [hl * 1.0, hh * 0.3], [hl * 0.6, hh * 0.5]];
      return smooth([[-hh * 0.35, -hh * 0.2], [-hh * 0.05, -hh * 0.62], [hl * 0.25, -hh * 0.62], ...snout, [hl * 0.15, hh * 0.62], [-hh * 0.3, hh * 0.4]], 3, true);
    });
    const flick = Math.max(0, Math.sin(t * 1.1 + s * 3)) ** 12 * 0.5, ea = K.ph(o.draw, 0.55, 1);
    const ear = (ex, ey, back) => withAlpha(ea * (back ? 0.9 : 1), () => {
      if (P.ears === 'flop') { ex -= hh * 0.35; ey += 2; const e = K.rot(smooth([[ex + 2, ey - 2], [ex - 8, ey], [ex - 11, ey + 13], [ex - 5, ey + 17], [ex + 3, ey + 6]], 2, true), 0.15 * Math.sin(t * 2 + s) + m * 0.2 * Math.sin(t * 8), ex, ey);
        ink(e, { closed: true, w: K.lw(o, 1.5), color: ic, fill: back ? deep : mix(fill, deep, 0.35), amp: 0.4, seed: s + 60 + back }); return; }
      const len = P.ears === 'leaf' ? 20 : P.ears === 'tri' ? 15 : 12, wd = P.ears === 'leaf' ? 7 : 6;
      const e = K.rot([[ex - wd, ey + 2], [ex - wd * 0.4, ey - len * 0.7], [ex + 1, ey - len], [ex + wd * 0.5, ey - len * 0.5], [ex + wd * 0.6, ey + 2]], -0.5 - flick + (back ? -0.15 : 0), ex, ey);
      ink(P.ears === 'tri' ? e : smooth(e, 2, true), { closed: true, w: K.lw(o, 1.5), color: ic, fill: back ? deep : fill, amp: 0.4, seed: s + 62 + back });
      if (!back) ink(K.rot([[ex - 2, ey - 2], [ex, ey - len * 0.7]], -0.5 - flick, ex, ey), { w: K.lw(o, 1.1), color: ic, alpha: 0.6, amp: 0.3, seed: s + 64 });
    });
    ear(hh * 0.05, -hh * 0.45, 1);
    if (P.antlers !== undefined && (o.antlers ?? P.antlers)) withAlpha(K.ph(o.draw, 0.6, 1), () => [[-1, 0.9], [1, 1]].forEach(([side, k]) => {
      const bx = hh * 0.1 + side * 3, by = -hh * 0.5, main = smooth([[bx, by], [bx - 7 * k, by - 12 * k], [bx - 6 * k, by - 28 * k], [bx - 12 * k, by - 42 * k], [bx - 22 * k, by - 50 * k]], 2);
      const c = side < 0 ? mix(PAL.lifeAntler, deep, 0.35) : PAL.lifeAntler;
      const two = (pts, w0, sd) => { pen(pts, { w: K.lw(o, w0 + 2.2), color: ic, seed: s + sd, taper: 0.55, amp: 0.3 }); pen(pts, { w: K.lw(o, w0), color: c, seed: s + sd + 1, taper: 0.6, amp: 0.3 }); };
      [[0.22, 12, -8], [0.5, 12, -11], [0.74, 9, -12]].forEach(([u, dx, dy], i) => { const q = along(main, u); two(smooth([q, [q[0] + dx * k * 0.5, q[1] + dy * k * 0.6], [q[0] + dx * k, q[1] + dy * k]], 1), 2, 74 + i * 2 + side * 7); });
      two(main, 3.4, 70 + side);
    }));
    withAlpha(a, () => { flat(G, fill); shade(G, { color: deep, alpha: 0.45, gap: 4.5, len: 6, light: [0, -1], base: 0, gain: 0.7, seed: s + 80 });
      if (kind === 'fox') flat(smooth([[hl * 0.4, hh * 0.1], [hl * 1.0, hh * 0.22], [hl * 0.6, hh * 0.5], [hl * 0.1, hh * 0.55]], 2, true), PAL.lifeCream); });
    pen(G, { closed: true, w: K.lw(o, 2.2), color: ic, seed: s + 81, draw: a, amp: 0.5 });
    ear(hh * 0.3, -hh * 0.5, 0);
    if (kind === 'horse') withAlpha(a * 0.55, () => {                    // cheek and jaw
      pen([[hl * 0.26, hh * 0.46], [hl * 0.12, hh * 0.1], [hl * 0.2, -hh * 0.3]], { w: K.lw(o, 1.6), color: deep, seed: s + 84, taper: 0.5, amp: 0.4 });
      pen([[hl * 0.5, -hh * 0.44], [hl * 0.88, -hh * 0.3]], { w: K.lw(o, 1.4), color: deep, seed: s + 85, taper: 0.5, amp: 0.3 }); });
    if (o.draw < 0.7) return;
    const blink = K.cyc(t + s, 3.7)[1] > 0.96;
    const ex = hl * (kind === 'dog' ? 0.32 : kind === 'horse' ? 0.28 : 0.3), ey = -hh * (kind === 'horse' ? 0.3 : 0.18);
    if (blink) ink([[ex - 3, ey], [ex + 3, ey]], { w: K.lw(o, 1.6), color: ic, amp: 0.2, seed: s + 82 });
    else { flat(shape.circle(ex, ey, 2.8, 10), ic); flat(shape.circle(ex + 0.8, ey - 0.9, 0.9, 6), o.dark ? PAL.night : '#fff'); }
    flat(shape.ellipse(hl * 0.97, kind === 'fox' ? hh * 0.14 : hh * 0.02, 3.2, 2.4, 0, 10), ic);
    if (kind === 'dog' || kind === 'fox') pen([[hl * 0.95, hh * 0.3], [hl * 0.7, hh * 0.36]], { w: K.lw(o, 1.2), color: ic, seed: s + 83, taper: 0.4 });
  }

  /* ------------------------------------------------------------------ fishSchool */
  /** fishSchool(t, {x, y, w, h, n, speed, size, fill, seed}): a school swimming a looping figure-eight through its box.
      Each fish follows the leader's path a little late, holds its place in the school and wanders; tails beat. */
  function fishSchool(t, o) {
    o = K.opts(o, { w: 700, h: 360, n: 16, speed: 90, size: 1, spread: 1, fill: null });
    return K.at(o, () => {
      const { w, h, n, draw, seed } = o, ic = K.inkOf(o.dark), fill = o.fill || (o.dark ? PAL.lifeFishNight : PAL.lifeFish);
      const R = 26 * Math.sqrt(n) * o.size * o.spread;
      const G = K.memo(`l.fish|${n}|${seed}|${o.size}|${o.spread}`, () => { const r = mulberry(seed);
        return Array.from({ length: n }, (_, i) => { const d = Math.sqrt((i + 0.5) / n) * R, a = i * 2.39996 + (r() - 0.5) * 0.6;
          return { lag: 0.05 + r() * 0.35 + d / R * 0.3, ox: Math.cos(a) * d * 1.3, oy: Math.sin(a) * d * 0.8, sz: 0.8 + r() * 0.4, ph: r() * TAU, fin: r() < 0.3, i }; }); });
      // the loop is sized so the whole school stays inside the box
      const ax = Math.max(0, w / 2 - R * 1.3 - 30 * o.size), ay = Math.max(0, h / 2 - R * 1.1 - 22 * o.size), om = o.speed / Math.max(ax, 80);
      const P = u => [w / 2 + ax * Math.sin(u * om), h / 2 + ay * Math.sin(2 * u * om + 0.6)];
      const fish = G.map(f => { const u = t - f.lag, [px, py] = P(u), [qx, qy] = P(u + 0.05), hd = Math.atan2(qy - py, qx - px), c = Math.cos(hd), sn = Math.sin(hd);
        const [wx, wy] = wander(f.i, t, 10, 0.5, seed);
        return { ...f, x: px + f.ox * c - f.oy * sn + wx, y: py + f.ox * sn + f.oy * c + wy, hd }; }).sort((a, b) => a.sz - b.sz);
      fish.forEach((f, k) => {
        const a = K.pop(draw, f.i / n * 0.6, f.i / n * 0.6 + 0.4); if (a <= 0) return;
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.hd); const sc = f.sz * o.size * a; ctx.scale(sc, sc);
        const L = 38, Hh = 11, beat = t * 9 + f.ph, body = [], low = [];
        for (let i = 0; i <= 10; i++) { const u = i / 10, x = L / 2 - u * L, bw = Hh * Math.sin(PI * Math.min(1, 0.12 + u * 0.95)) ** 0.8, bend = 3 * u * u * Math.sin(beat - u * 2.5);
          body.push([x, -bw + bend]); low.push([x, bw * 0.9 + bend]); }
        const tb = 3 * Math.sin(beat - 2.5), tx = -L / 2, tail = [[tx + 2, tb], [tx - 11, tb - 9 + 2 * Math.sin(beat - 3)], [tx - 7, tb], [tx - 11, tb + 9 + 2 * Math.sin(beat - 3)]];
        const poly = [...body, ...low.reverse()];
        ink(tail, { closed: true, w: 1.4, color: ic, fill: f.fin ? PAL.lifeFin : fill, amp: 0.3, seed: seed + 100 + f.i });
        ink(poly, { closed: true, w: 1.6, color: ic, fill, amp: 0.35, seed: seed + 120 + f.i });
        hatch(poly, { color: o.dark ? '#dcdcef' : PAL.lifeFishDeep, alpha: 0.45, gap: 3.5, len: 5, angle: 0.3, w: 1, seed: seed + 140 + f.i, keep: (px, py) => clamp(py / Hh + 0.3) });
        pen(body.slice(2, 9).map(([x, y]) => [x, y * 0.15 + 1]), { w: 1.3, color: o.dark ? '#dcdcef' : PAL.lifeFishDeep, alpha: 0.7, seed: seed + 160 + f.i, taper: 0.4, amp: 0.2 });
        flat(shape.circle(L * 0.3, -2, 1.8, 8), ic);
        ctx.restore();
      });
      if (draw >= 1) for (let i = 0; i < 6; i++) { const [c, fr] = K.cyc(t + i * 0.7 + seed, 4.2), bx = w * (0.1 + 0.8 * hash3(c, i, seed)), by = h * (0.95 - fr * 0.8);
        withAlpha(Math.sin(PI * fr) * 0.8, () => ink(shape.circle(bx + 5 * Math.sin(t * 2 + i), by, (3 + fr * 4) * o.size, 10), { closed: true, w: K.lw(o, 1.1), color: o.dark ? PAL.nightInk : PAL.lifeFishDeep, amp: 0.2, seed: seed + 180 + i })); }
    });
  }

  /* ------------------------------------------------------------------ insect */
  /** insect(t, {x, y, kind, walk, dist, fly, seed}): a small insect seen from above, facing right (turn it with rot).
      kind: 'beetle', 'ladybug', 'ant' (legs walk in tripods at walk px/s, antennae feel about) or 'bee', 'butterfly'
      (they hover with beating wings; fly: false lands them). */
  function insect(t, o) {
    o = K.opts(o, { kind: 'beetle', walk: 0, dist: null, fly: null, fill: null });
    return K.at(o, () => {
      const { kind, draw, seed } = o, ic = K.inkOf(o.dark), flier = kind === 'bee' || kind === 'butterfly', fly = o.fly ?? flier;
      if (fly) { const [dx, dy] = wander(3, t, 8, 0.9, seed); ctx.translate(dx + 5 * Math.sin(t * 1.7 + seed), dy + 4 * Math.sin(t * 3.4 + seed)); }
      const a = K.pop(draw, 0, 0.6), la = K.ph(draw, 0.4, 0.9);
      ctx.scale(a || 0.001, a || 0.001);
      const m = clamp(o.walk || o.dist != null ? 1 : 0), dist = o.dist ?? o.walk * t;
      const len = kind === 'ant' ? 34 : kind === 'bee' ? 30 : kind === 'butterfly' ? 26 : 34;
      // legs: three pairs; tripods alternate while walking, a slow shuffle when idle
      if (!(flier && fly)) withAlpha(la, () => { const ph = dist / 16 + (1 - m) * 0.08 * Math.sin(t * 1.3 + seed);
        [[-1, 0], [1, 0.5]].forEach(([side]) => [0.28, 0, -0.26].forEach((ax, k) => {
          const tri = (k + (side > 0 ? 1 : 0)) % 2, sw = m ? Math.sin((ph + tri * 0.5) * TAU) : 0.3 * Math.sin(t * 2 + k + side);
          const base = [ax * len * (kind === 'ant' ? 0.5 : 0.6), side * 4], spread = [0.9, 0, -0.9][k], ll = kind === 'ant' ? 0.95 : kind === 'bee' ? 0.7 : 1;
          const ang = side * (PI / 2) - side * spread * 0.55 - side * sw * 0.28, kx = base[0] + Math.cos(ang) * 10 * ll, ky = base[1] + Math.sin(ang) * 10 * ll;
          const ang2 = ang - side * (0.9 - spread * 0.2) + (k === 2 ? side * 0.4 : 0), fx = kx + Math.cos(ang2) * 11 * ll + sw * 2, fy = ky + Math.sin(ang2) * 11 * ll;
          ink([base, [kx, ky], [fx, fy]], { w: K.lw(o, kind === 'ant' ? 1.3 : 1.7), color: ic, amp: 0.2, seed: seed + 200 + k * 2 + side }); })); });
      // antennae
      withAlpha(la, () => [-1, 1].forEach(side => { const tw = 0.25 * Math.sin(t * 3.1 + side + seed) + 0.1 * Math.sin(t * 7.3 + side);
        const hx = kind === 'butterfly' ? 10 : len * (kind === 'ant' ? 0.62 : 0.5), bend = kind === 'ant' ? 0.9 : 0.35, al = kind === 'butterfly' ? 0.6 : 1, a1 = side * ((kind === 'butterfly' ? 0.3 : 0.55) + tw), p1 = [hx + 9 * al * Math.cos(a1), side * 2 + 9 * al * Math.sin(a1)];
        const a2 = a1 - side * bend, p2 = [p1[0] + 10 * al * Math.cos(a2), p1[1] + 10 * al * Math.sin(a2)];
        ink(kind === 'butterfly' ? [[hx, side * 1], p2] : [[hx, side * 2], p1, p2], { w: K.lw(o, 1.2), color: ic, amp: 0.2, seed: seed + 220 + side });
        if (kind === 'butterfly') flat(shape.circle(p2[0], p2[1], 1.5, 8), ic); }));
      const shell = (poly, fill, sd) => { ink(poly, { closed: true, w: K.lw(o, 1.8), color: ic, fill, amp: 0.35, seed: seed + sd }); };
      if (kind === 'beetle' || kind === 'ladybug') {
        const fillC = o.fill || (kind === 'ladybug' ? PAL.lifeLadybug : PAL.lifeBeetle), hr = kind === 'ladybug' ? 7 : 7.5;
        shell(shape.ellipse(len * 0.5, 0, hr, hr * 0.95, 0, 16), PAL.lifeHoof, 1);
        shell(shape.ellipse(len * 0.3, 0, 6, 10, 0, 16), kind === 'ladybug' ? PAL.lifeHoof : PAL.lifeBeetleDeep, 2);
        const lift = kind === 'ladybug' ? 0.06 * Math.max(0, Math.sin(t * 0.8 + seed)) ** 8 : 0;
        [-1, 1].forEach(side => { const half = K.rot(smooth([[len * 0.28, 0], [len * 0.26, side * 13], [len * 0.0, side * 15], [-len * 0.36, side * 10], [-len * 0.48, side * 1], [-len * 0.48, 0]], 2, true), side * lift, len * 0.28, 0);
          shell(half, fillC, 3 + side);
          shade(half, { color: kind === 'ladybug' ? '#6b1e14' : PAL.lifeBeetleDeep, alpha: 0.5, gap: 3.5, len: 5, light: [0.3, -side], seed: seed + 5 + side });
          if (kind === 'ladybug') [[0.05, 7], [-0.2, 10], [-0.3, 4]].forEach(([u, d], i) => flat(shape.circle(len * u, side * d, 2.8, 10), PAL.lifeHoof));
          else pen([[len * 0.15, side * 9], [-len * 0.3, side * 7]], { w: K.lw(o, 1.6), color: '#eaf2e2', alpha: 0.6, seed: seed + 8 + side, taper: 0.4 }); });
        if (kind === 'ladybug') [[len * 0.5 + 3, -3], [len * 0.5 + 3, 3]].forEach(([x, y]) => flat(shape.circle(x, y, 1.6, 6), '#f3efe4'));
      }
      if (kind === 'ant') {
        const c = o.fill || PAL.lifeAnt, sw = m ? Math.sin(dist / 8) * 1.5 : 0;
        shell(shape.ellipse(-len * 0.35, sw, 10, 7, 0, 18), c, 11); hatch(shape.ellipse(-len * 0.35, sw, 10, 7, 0, 18), { color: PAL.lifeHoof, alpha: 0.5, gap: 3, len: 4, seed: seed + 12 });
        shell(shape.ellipse(0, 0, 7, 4, 0, 14), c, 13);
        shell(shape.ellipse(len * 0.52, -sw * 0.5, 6, 5.5, 0, 14), c, 14);
      }
      if (kind === 'bee') {
        const flap = Math.floor(t * FPS) % 2, wa = fly ? (flap ? 0.95 : 0.35) : 0.12;
        const wing = (side, k, ang, alpha) => withAlpha(alpha, () => ink(KIT.rot(shape.ellipse(len * 0.02 - k * 6, side * 13, k ? 7 : 10, 5.5, 0, 16), side * ang, len * 0.1, 0), { closed: true, w: K.lw(o, 1.2), color: ic, fill: PAL.lifeWing, fillAlpha: 0.6, amp: 0.2, seed: seed + 30 + k + side }));
        const body = shape.ellipse(-len * 0.28, 0, 13, 9, 0, 22);
        shell(body, PAL.lifeBee, 20);
        ctx.save(); trace(body, true); ctx.clip();
        [-0.12, -0.42].forEach((u, i) => flat(shape.rect(len * u - 2.5, -10, 5, 20), PAL.lifeHoof, 0.9));
        ctx.restore();
        const th = shape.ellipse(len * 0.1, 0, 7.5, 7, 0, 16); shell(th, '#b88a3a', 21); hatch(th, { color: PAL.lifeHoof, alpha: 0.45, gap: 2.2, len: 2.5, w: 0.9, angle: 1.1, seed: seed + 22 });
        shell(shape.ellipse(len * 0.38, 0, 5, 5.5, 0, 12), PAL.lifeHoof, 23);
        pen([[-len * 0.28 - 13, 0], [-len * 0.28 - 17, 0]], { w: K.lw(o, 1.6), color: ic, seed: seed + 24, taper: 0.6 });
        [-1, 1].forEach(side => { wing(side, 0, wa, fly ? 0.75 : 1); wing(side, 1, wa - 0.1, fly ? 0.75 : 1);
          if (fly) wing(side, 0, flap ? 0.35 : 0.95, 0.25); });
      }
      if (kind === 'butterfly') {
        const c1 = o.fill || PAL.lifeButterfly, c2 = PAL.lifeButterflyDeep;
        const open = fly ? 0.2 + 0.8 * Math.abs(Math.cos(t * 5.5 + seed)) : 0.75 + 0.25 * Math.cos(t * 0.9 + seed);
        [-1, 1].forEach(side => {
          const fw = smooth([[2, 0], [10, side * 10], [8, side * 24], [-2, side * 28], [-8, side * 18], [-4, side * 3]], 2, true).map(([x, y]) => [x, y * open]);
          const hw = smooth([[-2, 0], [-6, side * 8], [-10, side * 18], [-20, side * 17], [-18, side * 6], [-8, side * 1]], 2, true).map(([x, y]) => [x, y * open]);
          ink(hw, { closed: true, w: K.lw(o, 1.4), color: ic, fill: c2, amp: 0.3, seed: seed + 40 + side });
          ink(fw, { closed: true, w: K.lw(o, 1.5), color: ic, fill: c1, amp: 0.3, seed: seed + 42 + side });
          hatch(fw, { color: c2, alpha: 0.55, gap: 3.5, len: 5, angle: 0.9, seed: seed + 44 + side, keep: (px, py) => clamp(Math.abs(py) / (24 * open + 0.01) - 0.2) });
          flat(shape.ellipse(2, side * 17 * open, 3, 3 * open + 0.2, 0, 10), PAL.lifeHoof, 0.85);
          flat(shape.ellipse(-13, side * 11 * open, 2, 2 * open + 0.2, 0, 8), PAL.lifeCream, 0.9);
        });
        shell(shape.ellipse(-3, 0, 12, 2.4, 0, 12), PAL.lifeHoof, 46); flat(shape.circle(9.5, 0, 2.6, 10), PAL.lifeHoof);
      }
    });
  }

  /* ------------------------------------------------------------------ flock */
  const bird = (x, y, s, f, o, seed, alpha = 1) => pen([[x - s, y - f * s * 0.6], [x - s * 0.4, y - 2 * s / 11], [x, y + s / 11], [x + s * 0.4, y - 2 * s / 11], [x + s, y - f * s * 0.6]],
    { w: K.lw(o, 1.4 + s * 0.04), color: K.inkOf(o.dark), seed, taper: 0.25, amp: 0.2, alpha });
  /** flock(t, {x, y, w, h, n, mode, speed, at, size, seed}): birds crossing a box of sky. mode: 'v' (a skein in V
      formation), 'line' (a loose diagonal line) or 'murmur' (a murmuration of a couple of hundred starlings folding and
      stretching in place). speed: px/s across the box for 'v' and 'line' (0 holds the flock in place; birds fade at
      the box sides instead of popping). at: where the leader starts, 0..1 along its run (with speed 0: across the box). */
  function flock(t, o) {
    o = K.opts(o, { w: 800, h: 300, n: null, mode: 'v', speed: 45, at: null, size: 11 });
    return K.at(o, () => {
      const { w, h, draw, seed, mode } = o, n = o.n ?? (mode === 'murmur' ? 340 : 9);
      if (mode === 'murmur') {
        // an even cloud of birds with a dense ridge sweeping through it: where the ridge pulls birds together they
        // overlap into a dark folding band, and the rim stays loose enough to read as single birds.
        const G = K.memo(`l.murm|${n}|${seed}`, () => { const r = mulberry(seed); return Array.from({ length: n }, () => {
          const a = r() * TAU, d = Math.sqrt(r());                       // sqrt: an even spread, no clot in the middle
          return { u: Math.cos(a) * d, v: Math.sin(a) * d, d, ph: r() * TAU, s: 0.8 + r() * 0.4, k: r(), j: r() * 50 }; }); });
        const cx = w / 2 + w * 0.05 * Math.sin(t * 0.21 + seed), cy = h / 2 + h * 0.05 * Math.sin(t * 0.33), rot = 0.3 * Math.sin(t * 0.17 + seed);
        const A = w * (0.24 + 0.03 * Math.sin(t * 0.23)), B = h * (0.22 + 0.05 * Math.sin(t * 0.31 + 1));
        const grip = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(t * 0.29 + seed));    // how hard the ridge packs the flock
        const c = Math.cos(rot), sn = Math.sin(rot);
        G.forEach((b, i) => {
          const a = clamp(draw * 2 - b.k); if (a <= 0) return;
          const lx = b.u * A + 7 * vnoise(t * 0.9 + b.j, seed);
          const ridge = B * 0.42 * Math.sin(b.u * 2.1 + t * 0.55);            // the band the flock folds along
          const near = Math.exp(-(((b.v * B - ridge) / (B * 0.3)) ** 2));     // birds close to it get drawn into it
          const ly = lerp(b.v * B, ridge + (b.v * B - ridge) * 0.18, grip * near) + 6 * vnoise(t * 0.9 + b.j, seed + 7);
          const x = cx + lx * c - ly * sn, y = cy + lx * sn + ly * c, f = Math.sin(t * 14 + b.ph);
          bird(x, y, o.size * 0.5 * b.s, f, o, seed + i % 23, a * (0.8 + 0.2 * b.d));
        });
        return;
      }
      const G = K.memo(`l.flock|${n}|${seed}|${mode}`, () => { const r = mulberry(seed);
        return Array.from({ length: n }, (_, i) => { const k = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
          return mode === 'line' ? { dx: -i * 40 - r() * 12, dy: i * 14 + (r() - 0.5) * 12, s: 0.85 + r() * 0.3, ph: r() * TAU }
            : { dx: -k * 38 - r() * 6, dy: side * k * 22 + (r() - 0.5) * 6, s: 0.85 + r() * 0.3, ph: r() * TAU }; }); });
      const span = w + 420, lead = o.speed ? (((o.at ?? hash3(seed)) * span + t * o.speed) % span) - 60 : w * (o.at ?? 0.62);
      G.forEach((b, i) => {
        const a = K.ph(draw, i / n * 0.5, i / n * 0.5 + 0.5); if (a <= 0) return;
        const x = lead + b.dx + 4 * Math.sin(t * 0.8 + b.ph), y = h * 0.45 + b.dy + 5 * Math.sin(t * 1.1 + b.ph) - (mode === 'line' ? 60 : 0);
        const edge = clamp(Math.min(x, w - x) / 60);
        if (edge <= 0) return;
        bird(x, y, o.size * b.s, Math.sin(t * 7 + b.ph + i * 0.6), o, seed + i, a * edge);
      });
    });
  }

  /* ------------------------------------------------------------------ figure */
  function poseOf(name, t, o, sw) {
    const br = Math.sin(t * 1.9 + o.seed);
    switch (name) {
      case 'walk': return { nA: -0.5 * sw, nB: 0.35 - 0.2 * sw, fA: 0.5 * sw, fB: 0.35 + 0.2 * sw, lean: 0.06, walk: 1, head: 0 };
      case 'point': return { nA: PI / 2 - (o.aim || 0), nB: 0.02, fA: -0.06, fB: 0.3, lean: 0.03, walk: 0, head: -(o.aim || 0) * 0.5, finger: 1 };
      case 'wave': return { nA: 2.45, nB: 0.35 + 0.5 * Math.sin(t * 7), fA: -0.06 + 0.02 * br, fB: 0.25, lean: -0.02, walk: 0, head: -0.08 };
      case 'hold': return { nA: 0.62 + 0.02 * br, nB: 1.2, fA: 0.72 + 0.02 * br, fB: 1.1, lean: -0.03, walk: 0, head: 0.12 };
      case 'cheer': return { nA: 2.45 + 0.15 * Math.sin(t * 5), nB: 0.25, fA: 2.85 + 0.12 * Math.sin(t * 5 + 1), fB: -0.1, lean: -0.04, walk: 0, head: -0.2 };
      default: return { nA: 0.1 + 0.03 * br, nB: 0.18, fA: -0.1 - 0.03 * br, fB: 0.22, lean: 0.01 * br, walk: 0, head: 0.04 * Math.sin(t * 0.5 + o.seed) };
    }
  }
  const mixPose = (a, b, u) => { const out = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = lerp(a[k] ?? 0, b[k] ?? 0, u); return out; };
  function itemArt(t, kind, x, y, o, ic) {
    if (kind === 'box') { const b = shape.rect(x - 22, y - 30, 44, 34); ink(b, { closed: true, w: K.lw(o, 2), color: ic, fill: '#c9a26a', amp: 0.6, seed: o.seed + 300 });
      hatch(b, { color: '#6b4a2a', alpha: 0.35, gap: 6, len: 8, angle: 1.2, seed: o.seed + 301 }); ink([[x - 22, y - 20], [x + 22, y - 20]], { w: K.lw(o, 1.4), color: ic, alpha: 0.6, amp: 0.4, seed: o.seed + 302 });
      flat(shape.rect(x - 4, y - 30, 8, 34), '#e6d6a8', 0.9); return; }
    if (kind === 'book') { const fl = 3 * Math.sin(t * 2);
      [-1, 1].forEach(sd => ink([[x, y - 4], [x + sd * 20, y - 10 - fl * (sd > 0 ? 1 : 0)], [x + sd * 20, y + 12], [x, y + 16]], { closed: true, w: K.lw(o, 1.8), color: ic, fill: '#f3efe4', amp: 0.4, seed: o.seed + 305 + sd }));
      for (let k = 0; k < 3; k++) [-1, 1].forEach(sd => ink([[x + sd * 4, y + k * 5], [x + sd * 16, y - 3 + k * 5]], { w: K.lw(o, 1), color: PAL.muted, amp: 0.2, seed: o.seed + 310 + k }));
      return; }
    if (kind === 'sign') { pen([[x, y + 30], [x, y - 60]], { w: K.lw(o, 3.4), color: PAL.lifePole, seed: o.seed + 320, taper: 0.05 });
      const b = shape.rect(x - 42, y - 96, 84, 44); ink(b, { closed: true, w: K.lw(o, 2.2), color: ic, fill: '#f3efe4', amp: 0.6, seed: o.seed + 321 });
      if (o.label) text(o.label, x, y - 66, { kind: 'mono', size: 22, weight: 600, ls: 0, align: 'center', color: PAL.ink }); return; }
    if (kind === 'ball') { const b = shape.circle(x, y - 14 + 2 * Math.sin(t * 3), 13, 18); ink(b, { closed: true, w: K.lw(o, 2), color: ic, fill: PAL.accent, amp: 0.4, seed: o.seed + 330 });
      shade(b, { color: PAL.accentDeep, alpha: 0.5, seed: o.seed + 331, gap: 3.5, len: 5 }); }
  }
  /** figure(t, {x, y, pose, pose2, blend, walk, dist, dir, aim, item, label, height, skin, shirt, pants, hair, hairStyle, seed}):
      a pen-drawn person standing on the ground at (x, y), about 170 px tall. pose: 'stand', 'walk', 'point', 'hold',
      'wave' or 'cheer'; pose2 + blend (0..1) ease from one pose into another. walk / dist: as for quadruped (walk
      pose only). aim: the pointing angle (radians, positive is up). item: 'box', 'book', 'sign' (with label) or 'ball',
      or a function (t, hx, hy) drawn at the hands in screen-facing coordinates. The seed picks skin, clothes and hair. */
  function figure(t, o) {
    o = K.opts(o, { pose: 'stand', pose2: null, blend: 0, walk: 40, dist: null, dir: 1, aim: 0, item: null, label: '', height: null });
    return K.at(o, () => {
      const { draw, seed } = o, ic = K.inkOf(o.dark), r = mulberry(seed * 7 + 3);
      const V = K.memo(`l.fig|${seed}`, () => ({ skin: pick(PAL.lifeSkin, r()), shirt: pick(PAL.lifeShirt, r()), pants: pick(PAL.lifePants, r()), hair: pick(PAL.lifeHair, r()), style: Math.floor(r() * 4), tall: 0.93 + r() * 0.13 }));
      const skin = o.skin || V.skin, shirt = o.shirt || V.shirt, pants = o.pants || V.pants, hairC = o.hair || V.hair, style = o.hairStyle ?? V.style;
      const sc = (o.height ?? 170) / 170 * V.tall;
      ctx.scale(sc, sc);
      const legL = 80, a = 40.3, b = 40.3, stride = 62, duty = 0.6;
      const dist = o.dist ?? o.walk * t, ph = dist / (stride / duty);
      const swing = -footAt(ph, stride, 0, duty)[0] / (stride / 2);
      let Pz = poseOf(o.pose, t, o, swing);
      if (o.pose2) Pz = mixPose(Pz, poseOf(o.pose2, t, o, swing), clamp(o.blend));
      const wk = Pz.walk, br = Math.sin(t * 1.9 + seed);
      const hipY = -legL + 0.3 + wk * (1.5 + 2.2 * Math.cos(ph * TAU * 2)) + (1 - wk) * 0.5 * br;
      const flip = o.dir < 0 ? -1 : 1;
      ctx.save(); if (flip < 0) ctx.scale(-1, 1);
      const la = K.ph(draw, 0.25, 0.65), ba = K.ph(draw, 0, 0.45), ha = K.pop(draw, 0.3, 0.7), aa = K.ph(draw, 0.45, 0.9);
      // legs
      const legsOut = [[0, 0.5, true], [0, 0, false]].map(([hx, off, far]) => {
        const [fx, fy] = footAt(ph + off, stride, 14, duty), sx = (far ? -4 : 4) * (1 - wk);
        const hip = [hx + (far ? -2 : 2), hipY], j = ik(hip[0], hip[1], lerp(sx + (far ? -1 : 1) * 3 + 2 * Math.sin(t * 0.6 + off * 5) * (1 - wk), fx, wk), lerp(0, fy, wk), a, b, 1);
        return { far, pts: [hip, j.knee, j.foot], foot: j.foot };
      });
      const shoe = (f, far) => ink(smooth([[f[0] - 5, f[1] - 5], [f[0] + 7, f[1] - 5], [f[0] + 12, f[1] - 1], [f[0] + 11, f[1] + 1], [f[0] - 5, f[1] + 1]], 1, true), { closed: true, w: K.lw(o, 1.4), color: ic, fill: far ? '#3a302c' : '#2b2220', amp: 0.3, seed: seed + 400 + far });
      const lean = Pz.lean, shY = hipY - 58, shX = 58 * Math.sin(lean) * 1.0;
      const arm = (A, B, far) => { const sx = shX + (far ? -3 : 3), sy = shY + 5, e = [sx + 28 * Math.sin(A), sy + 28 * Math.cos(A)], hnd = [e[0] + 27 * Math.sin(A + B), e[1] + 27 * Math.cos(A + B)];
        return { pts: [[sx, sy], e, hnd], hand: hnd, ang: A + B, far }; };
      const arms = [arm(Pz.fA, Pz.fB, true), arm(Pz.nA, Pz.nB, false)];
      const drawArm = am => withAlpha(aa, () => {
        limb(am.pts, 11, 8, am.far ? mix(shirt, '#1b1518', 0.25) : shirt, ic, o, seed + 410 + am.far, 1, 1.4, 0.12);
        ink(shape.circle(am.hand[0], am.hand[1], 4.6, 10), { closed: true, w: K.lw(o, 1.3), color: ic, fill: skin, amp: 0.2, seed: seed + 415 + am.far });
        if (!am.far && Pz.finger > 0.5) pen([am.hand, [am.hand[0] + 11 * Math.sin(am.ang), am.hand[1] + 11 * Math.cos(am.ang)]], { w: K.lw(o, 2.4), color: ic, seed: seed + 418, taper: 0.4 });
      });
      withAlpha(la, () => legsOut.forEach(lg => { limb(lg.pts, 13, 9, lg.far ? mix(pants, '#1b1518', 0.3) : pants, ic, o, seed + 420 + lg.far, 1, 1.4, 0.1); shoe(lg.foot, lg.far); }));
      drawArm(arms[0]);
      // torso
      const tor = smooth([[-9, hipY + 4], [-11, hipY - 20], [-10, shY + 4], [-4 + shX, shY - 1], [7 + shX, shY - 1], [11 + shX, shY + 6], [11, hipY - 18], [10, hipY + 4]], 2, true);
      withAlpha(ba, () => { flat(tor, shirt); shade(tor, { color: '#1b1518', alpha: 0.35, gap: 3.5, len: 6, light: [0.6, -0.8], seed: seed + 430 });
        hatch(tor, { color: '#1b1518', alpha: 0.12, gap: 5, len: 5, angle: 1.3, seed: seed + 431, keep: 0.6 }); });
      pen(tor, { closed: true, w: K.lw(o, 2), color: ic, seed: seed + 432, draw: ba, amp: 0.4 });
      // head
      const hx = shX + 2 + 3 * Math.sin(lean), hy = shY - 17, hr = 13.5, tilt = (Pz.head || 0);
      if (ha > 0) { ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt); ctx.scale(ha, ha);
        pen([[-1, 14], [0, 20]], { w: K.lw(o, 5.5), color: skin, seed: seed + 440, taper: 0 });
        const hair = style === 1 ? smooth([[-hr * 0.9, -hr * 0.2], [-hr * 0.4, -hr * 1.15], [hr * 0.7, -hr * 0.95], [hr * 0.2, -hr * 0.5], [-hr * 0.4, -hr * 0.2], [-hr * 1.1, hr * 1.4], [-hr * 1.3, hr * 0.5]], 2, true)
          : style === 2 ? smooth([[-hr * 0.95, 0], [-hr * 0.6, -hr * 1.05], [hr * 0.6, -hr * 1.05], [hr * 0.9, -hr * 0.3], [hr * 0.3, -hr * 0.55], [-hr * 0.5, -hr * 0.3]], 2, true)
            : style === 3 ? smooth([[-hr * 1.05, -hr * 0.2], [-hr * 0.8, -hr * 1.05], [hr * 0.7, -hr * 1.05], [hr * 1.0, -hr * 0.35], [hr * 1.65, -hr * 0.3], [hr * 1.0, -hr * 0.1]], 1, true)
              : smooth([[-hr * 1.0, hr * 0.1], [-hr * 0.8, -hr * 0.95], [hr * 0.5, -hr * 1.1], [hr * 0.95, -hr * 0.35], [hr * 0.35, -hr * 0.6], [-hr * 0.3, -hr * 0.35], [-hr * 0.6, hr * 0.3]], 2, true);
        if (style === 1) ink(hair, { closed: true, w: K.lw(o, 1.4), color: ic, fill: hairC, amp: 0.4, seed: seed + 441 });
        const face = shape.circle(0, 0, hr, 22);
        ink(face, { closed: true, w: K.lw(o, 1.9), color: ic, fill: skin, amp: 0.45, seed: seed + 442 });
        hatch(face, { color: '#6b4426', alpha: 0.3, gap: 3.2, len: 4, angle: 1.2, seed: seed + 443, keep: (px, py) => clamp(-px / hr - 0.2) });
        if (style !== 1) ink(hair, { closed: true, w: K.lw(o, 1.4), color: ic, fill: hairC, amp: 0.4, seed: seed + 441 });
        if (style === 2) ink(shape.circle(-hr * 0.85, -hr * 0.75, 5.5, 12), { closed: true, w: K.lw(o, 1.3), color: ic, fill: hairC, amp: 0.3, seed: seed + 444 });
        if (style === 3) flat(shape.rect(-hr * 1.0, -hr * 0.35, hr * 2.4, 2.6), '#1b1518', 0.5);
        if (draw >= 0.7) { const blink = K.cyc(t + seed * 0.37, 3.3)[1] > 0.95;
          if (blink) ink([[5, -1], [10, -1]], { w: K.lw(o, 1.4), color: ic, amp: 0.1, seed: seed + 445 });
          else flat(shape.circle(7.5, -1.5, 1.7, 8), ic);
          pen([[hr - 1, 0], [hr + 3, 4], [hr - 1, 5]], { w: K.lw(o, 1.4), color: ic, seed: seed + 446, taper: 0.2, amp: 0.2 });
          ink([[5, 7.5], [9, 7]], { w: K.lw(o, 1.2), color: ic, amp: 0.2, alpha: 0.8, seed: seed + 447 }); }
        ctx.restore(); }
      const near = arms[1];
      if (o.item && Pz.walk < 0.5 && aa > 0) { ctx.save(); if (flip < 0) ctx.scale(-1, 1);
        const hxs = (near.hand[0] + arms[0].hand[0]) / 2 * flip, hys = (near.hand[1] + arms[0].hand[1]) / 2;
        withAlpha(aa, () => typeof o.item === 'function' ? o.item(t, hxs, hys) : itemArt(t, o.item, hxs, hys, o, ic));
        ctx.restore(); }
      drawArm(near);
      ctx.restore();
    });
  }

  /* ------------------------------------------------------------------ crowd */
  /** crowd(t, {x, y, w, n, rows, mode, speed, size, seed}): many small people, cheap to draw (dozens to a hundred).
      (x, y) is the ground under the front row's left end; back rows stand higher and smaller. mode: 'idle' (shifting,
      chatting, the odd wave), 'cheer' (arms up, bouncing) or 'walk' (everyone walking right at speed px/s, fading at
      the ends). size: figure height in px. */
  function crowd(t, o) {
    o = K.opts(o, { w: 700, n: 40, rows: 3, mode: 'idle', speed: 30, size: 64 });
    return K.at(o, () => {
      const { w, n, rows, draw, seed, mode, size } = o, ic = K.inkOf(o.dark);
      const G = K.memo(`l.crowd|${w}|${n}|${rows}|${seed}`, () => { const r = mulberry(seed), per = Math.ceil(n / rows);
        return Array.from({ length: n }, (_, i) => { const row = rows - 1 - Math.floor(i / per), col = i % per;
          return { row, x: (col + 0.5 + (r() - 0.5) * 0.7 + (row % 2) * 0.4) / per * w, sc: (1 - row * 0.13) * (0.88 + r() * 0.22), skin: pick(PAL.lifeSkin, r()), shirt: pick(PAL.lifeShirt, r()),
            hair: pick(PAL.lifeHair, r()), ph: r() * TAU, wave: r() < 0.3, k: r(), long: r() < 0.35 }; }); });
      const u = size / 64;
      G.forEach((p, i) => {
        const pa = K.pop(draw, p.x / w * 0.6 + p.row * 0.05, p.x / w * 0.6 + p.row * 0.05 + 0.35); if (pa <= 0) return;
        let x = p.x; const walking = mode === 'walk';
        if (walking) x = ((p.x + t * o.speed * (0.85 + p.k * 0.3)) % (w + 40)) - 20;
        const edge = walking ? clamp(Math.min(x, w - x) / 30) : 1; if (edge <= 0) return;
        const s = p.sc * u, gy = -p.row * 16 * u, bounce = mode === 'cheer' ? Math.max(0, Math.sin(t * 5 + p.ph)) * 6 * s : 0;
        const sway = 0.05 * Math.sin(t * (0.8 + p.k) + p.ph), fade = 1 - p.row * 0.12;
        withAlpha(edge * fade, () => { ctx.save(); ctx.translate(x, gy - bounce); ctx.rotate(sway); ctx.scale(s * pa, s * pa);
          const lp = walking ? Math.sin(t * 6 + p.ph) * 7 : 0;
          pen([[-3, -26], [-4 - lp, 0]], { w: K.lw(o, 2.6), color: ic, seed: seed + i * 5, taper: 0.1, amp: 0.3 });
          pen([[3, -26], [4 + lp, 0]], { w: K.lw(o, 2.6), color: ic, seed: seed + i * 5 + 1, taper: 0.1, amp: 0.3 });
          const up = mode === 'cheer' ? 1 : mode === 'idle' && p.wave ? clamp(Math.sin(t * 0.6 + p.ph) * 3 - 1.5) : 0;
          const wv = Math.sin(t * 8 + p.ph) * 0.3, arm = (side, raise) => { const A = lerp(0.2, 2.7 + wv * (side > 0 ? 1 : -1), raise), sw = walking ? Math.sin(t * 6 + p.ph) * 0.4 * side : 0;
            pen([[side * 7, -48], [side * 7 + side * 9 * Math.sin(A) * 0.8 + 16 * Math.sin(sw), -48 + 20 * Math.cos(A)]], { w: K.lw(o, 2.3), color: ic, seed: seed + i * 5 + 2 + side, taper: 0.3, amp: 0.3 }); };
          arm(-1, mode === 'cheer' ? up : 0); arm(1, up);
          ink([[-8, -24], [-9, -44], [-5, -52], [5, -52], [9, -44], [8, -24]], { closed: true, w: K.lw(o, 1.6), color: ic, fill: p.shirt, amp: 0.4, seed: seed + i * 5 + 3 });
          const hx = 1.5 * Math.sin(t * 0.7 + p.ph * 2), hr = 7;
          if (p.long) flat(shape.ellipse(hx - 1, -58, 8, 9, 0, 12), p.hair);
          ink(shape.circle(hx, -61, hr, 12), { closed: true, w: K.lw(o, 1.5), color: ic, fill: p.skin, amp: 0.3, seed: seed + i * 5 + 4 });
          flat([[hx - hr - 0.5, -61], [hx - hr + 1, -67], [hx, -69.5], [hx + hr - 1, -67], [hx + hr + 0.5, -62], [hx, -64.5]], p.hair);
          ctx.restore(); });
      });
    });
  }

  return { quadruped, fishSchool, insect, flock, figure, crowd };
})();
