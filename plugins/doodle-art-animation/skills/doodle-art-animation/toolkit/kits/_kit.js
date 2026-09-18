/* =====================  COMPONENT KITS · shared base  =====================
   build.py inlines every toolkit/kits/*.js in name order, after engine.js and before the story, so this file
   (its name starts with "_") loads first. Each kit lives in its own namespace: KIT.earth, KIT.tech, KIT.ai,
   KIT.life, KIT.settle, KIT.space, KIT.lab, KIT.studio. Every component has the same call shape:

       KIT.<kit>.<name>(t, { x, y, s, rot, draw, alpha, seed, dark, ...its own options })

   t      the plate's local seconds; it drives the component's idle motion, so pass the plate's t through
   x, y   where the component's anchor lands (catalogue: references/components.md)
   s      scale (line weights thin out a little less than the art, so small copies stay legible)
   draw   0..1 draw-on progress (0 draws nothing, 1 is fully drawn)
   seed   picks the layout variant; the same seed always gives the same drawing
   dark   true on night plates (ink turns pale)
   Components are pure functions of their arguments: no Math.random, no Date, no state between frames.
   Geometry that does not move is computed once and cached with KIT.memo. */
var KIT = globalThis.KIT || {};
globalThis.KIT = KIT;
(() => {
  const cache = new Map(), CAP = 256;
  /** memo(key, fn): compute fn() once per key (layouts, outlines, word wraps). Least-recently-used entries are dropped
      past 256 keys, so never put a value that changes every frame into a key: animate positions, not geometry options. */
  KIT.memo = (key, fn) => {
    if (cache.has(key)) { const v = cache.get(key); cache.delete(key); cache.set(key, v); return v; }
    const v = fn(); cache.set(key, v); if (cache.size > CAP) cache.delete(cache.keys().next().value); return v;
  };
  /** opts(o, defaults): the shared option defaults, then the component's, then the caller's */
  KIT.opts = (o = {}, d = {}) => ({ x: 0, y: 0, s: 1, rot: 0, draw: 1, alpha: 1, seed: 1, dark: false, ...d, ...o });
  /** at(o, fn): run fn with the origin at (o.x, o.y), turned by o.rot and scaled by o.s; skipped when draw or alpha is 0 */
  KIT.at = (o, fn) => {
    if (o.draw <= 0 || o.alpha <= 0) return null;
    ctx.save(); ctx.translate(o.x, o.y); if (o.rot) ctx.rotate(o.rot); if (o.s !== 1) ctx.scale(o.s, o.s);
    ctx.globalAlpha *= clamp(o.alpha);
    try { return fn(); } finally { ctx.restore(); }
  };
  /** lw(o, w): a line width that lands at w·√s on screen */
  KIT.lw = (o, w) => w / Math.sqrt(o.s || 1);
  /** ph(draw, a, b): the part of the draw-on between a and b, eased (sequence a component's pieces) */
  KIT.ph = (draw, a, b) => E.out3(inv(a, b, draw));
  /** pop(draw, a, b): like ph, with a small overshoot (for things that pop into place) */
  KIT.pop = (draw, a, b) => E.outBack(inv(a, b, draw));
  /** cyc(t, period): [index, fraction] of a repeating cycle */
  KIT.cyc = (t, period) => { const c = Math.max(0, t) / period, i = Math.floor(c); return [i, c - i]; };
  KIT.inkOf = dark => dark ? PAL.nightInk : PAL.ink;
  KIT.mutedOf = dark => dark ? PAL.nightMuted : PAL.muted;
  /** rrect(x, y, w, h, r): rounded rectangle outline */
  KIT.rrect = (x, y, w, h, r = 12, n = 5) => {
    r = Math.max(0.1, Math.min(r, w / 2, h / 2)); const out = [];
    const cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
    for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  };
  /** ribbon(pts, hw): a closed outline of constant half-width around a centre line (arms, legs, tubes) */
  KIT.ribbon = (pts, hw) => {
    const L = [], R = [];
    pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, h = typeof hw === 'function' ? hw(i / (pts.length - 1)) : hw;
      L.push([p[0] - dy / l * h, p[1] + dx / l * h]); R.push([p[0] + dy / l * h, p[1] - dx / l * h]); });
    return [...L, ...R.reverse()];
  };
  /** offset(pts, d): an open polyline shifted sideways by d */
  KIT.offset = (pts, d) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] - dy / l * d, p[1] + dx / l * d]; });
  /** cubic(p0, c0, c1, p1, n): points on a cubic Bézier */
  KIT.cubic = (p0, c0, c1, p1, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u;
    return [0, 1].map(k => v * v * v * p0[k] + 3 * v * v * u * c0[k] + 3 * v * u * u * c1[k] + u * u * u * p1[k]); });
  /** rot(pts, a, cx, cy): points turned by a about (cx, cy) */
  KIT.rot = (pts, a, cx = 0, cy = 0) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
  /** shadow(poly, dx, dy, a): a flat drop shadow for cards and windows on paper */
  KIT.shadow = (poly, dx = 5, dy = 6, a = 0.12) => flat(poly.map(([x, y]) => [x + dx, y + dy]), 'rgba(40,30,20,1)', a);
  /** labelOf(dark): the colour for secondary text (readable on the plate's paper); mutedOf is for lines */
  KIT.labelOf = dark => dark ? PAL.nightLabel : PAL.label;
  /**
   * caption(t, s, x, y, o): a mono caption that types on (part names, scene labels). Role 'label', 22 px by default.
   * o.screen: true keeps it 22 px on screen under any camera (screenText). o.backing: true puts it on a paper halo.
   * o.role: 'decor' for a FIG. number or a marking that nobody needs to read.
   */
  KIT.caption = (t, s, x, y, o = {}) => { const lo = { kind: 'mono', size: 22, ls: 1, role: 'label', color: KIT.labelOf(o.dark), ...o };
    if (o.backing && t > 0) { const b = textBox(s, x, y, lo); backing(b[0], b[1], b[2], b[3], { dark: o.dark, pad: 8, feather: 10, seed: 7, alpha: clamp(t * 6) }); }   // o.backing: a paper halo, for captions over busy art
    return (o.screen ? screenText : text)(typed(s, t, 40), x, y, lo); };
})();
