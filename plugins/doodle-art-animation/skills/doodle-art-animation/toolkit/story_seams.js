/* =====================  STORY: Pencil to Ladybug  ·  seam design example  ===================== */
/* Every cut is designed from both sides. The plate script's seam column:
     I → II   custom   : two designs, chosen with SEAM below.
                         'morph': the eraser pops off, rounds, turns and becomes the ladybug's shell as the garden
                                  dissolves in around it; head, spots and legs grow as it lands.
                         'macro': the camera sinks into the red eraser until red fills the screen, black spots bloom,
                                  the ladybug draws itself as the camera eases back to a close-up, and when it takes off the
                                  camera travels with it, pulling back to reveal the garden (a switch-up, not a mirror).
     II → III pan      : the ladybug flies off to the right, so the whip pan continues rightward (dir 'auto')
     III → IV cut      : the ladybug lands on a poppy; a match cut puts the pencil sketch of it in the same spot
     IV → V   page     : chapter end, turning to the right                                                          */
Object.assign(PAL, { pencil: '#f0b429', pencilDark: '#a8761a', wood: '#e9c89a', graphite: '#3a3438', ferrule: '#b9b6ae',
  eraser: '#d9584f', bug: '#d23b2f', bugDark: '#7e1d17', leafGreen: '#7fae5a', leafDark: '#3f6b2c', poppy: '#dd4a3a', rule: 'rgba(90,120,190,0.28)' });

/* ---------- shared drawings ---------- */
function notebook(t) {                                                         // ruled lines and a margin
  for (let y = 250, i = 0; y < H + 40; y += 58, i++) pen([[-20, y], [W + 20, y]], { w: 1.2, color: PAL.rule, amp: 0.4, seed: 300 + i, taper: 0 });
  pen([[250, -20], [250, H + 20]], { w: 1.6, color: 'rgba(210,90,80,0.45)', amp: 0.4, seed: 299, taper: 0 });
}
/** pencil lying along angle `ang` from its tip (tx, ty); returns the eraser centre */
const ERASER = (len = 560) => [[len - 28, -24], [len - 8, -24], ...shape.arc(len - 8, 0, 24, -Math.PI / 2, Math.PI / 2, 12), [len - 28, 24]];
function pencil(tx, ty, ang, len = 560, eraser = true) {
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang);
  const body = [[70, -24], [len - 60, -24], [len - 60, 24], [70, 24]];
  ctx.save(); ctx.translate(14, 18); ctx.globalAlpha *= 0.18; flat(body, '#2a1d10'); ctx.restore();             // shadow on the page
  ink([[0, 0], [70, -24], [70, 24]], { closed: true, w: 2.2, fill: PAL.wood, seed: 401 });
  ink([[0, 0], [20, -7], [20, 7]], { closed: true, w: 1.6, fill: PAL.graphite, seed: 402 });
  ink(body, { closed: true, w: 2.6, fill: PAL.pencil, seed: 403 });
  shade(shape.rect(70, 6, len - 130, 18), { color: PAL.pencilDark, seed: 404, alpha: 0.55 });
  pen([[72, -8], [len - 62, -8]], { w: 1.2, color: PAL.pencilDark, seed: 405 }); pen([[72, 8], [len - 62, 8]], { w: 1.2, color: PAL.pencilDark, seed: 406 });
  ink(shape.rect(len - 60, -24, 32, 48), { closed: true, w: 2.2, fill: PAL.ferrule, seed: 407 });
  for (let k = 0; k < 3; k++) pen([[len - 54 + k * 9, -23], [len - 54 + k * 9, 23]], { w: 1, color: '#6d6a64', seed: 408 + k });
  const er = ERASER(len);
  if (eraser) { ink(er, { closed: true, w: 2.4, fill: PAL.eraser, seed: 412 }); shade(er, { color: '#8e2e28', seed: 413, alpha: 0.5 }); }
  ctx.restore();
  return [tx + Math.cos(ang) * (len - 12), ty + Math.sin(ang) * (len - 12)];
}
const SPOTS = [[22, 0, 7], [-18, -15, 7], [-18, 15, 7], [2, -20, 6], [2, 20, 6], [-34, -4, 5], [-34, 4, 5]];
/** ladybug at (x, y), heading hd (0 = facing right); o.open 0..1 lifts the wing cases, o.walk animates legs */
const BUG_SHELL = shape.ellipse(0, 0, 36, 32.4, 0, 48);                     // body outline, centred (drawn at local x -6)
function ladybug(x, y, t, { s = 1, hd = 0, open = 0, walk = 0, shell = true, grow = 1, spots = 1, detail = 1 } = {}) {
  const g = E.outBack(clamp(grow));
  ctx.save(); ctx.translate(x, y); ctx.rotate(hd); ctx.scale(s, s);
  for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) { const ph = Math.sin(S.boil * 1.3 + k * 2 + (sd > 0 ? Math.PI : 0)) * 6 * walk;
    const q = clamp(grow * 1.6 - 0.6 - k * 0.1); if (q > 0) pen([[-12 + k * 16, sd * 22], [-18 + k * 18 + ph, sd * 42], [-24 + k * 20 + ph, sd * 50]], { w: 2.2, color: PAL.ink, seed: 500 + k * 2 + sd, taper: 0.3, draw: q }); }
  if (open > 0) { const fl = Math.sin(S.boil * 2.2) * 0.35;                 // hind wings beating
    for (const sd of [-1, 1]) { ctx.save(); ctx.translate(-4, sd * 6); ctx.rotate(sd * (0.55 + fl) * open);
      ink(shape.ellipse(-38, sd * 18, 46, 16, 0, 28), { closed: true, w: 1.4, color: '#5c6a80', fill: 'rgba(225,235,248,0.6)', amp: 0.4, seed: 510 + sd }); ctx.restore(); } }
  const half = sd => [[26, 0], ...shape.arc(-6, 0, 36, 0, sd * Math.PI, 18).map(([px, py]) => [px, py * 0.9])];   // one wing case
  if (shell) for (const sd of [-1, 1]) { ctx.save(); ctx.translate(22, sd * 2); ctx.rotate(-sd * 0.7 * open); ctx.translate(-22, -sd * 2);
    const h = half(sd); ink(h, { closed: true, w: 2.4, fill: PAL.bug, seed: 520 + sd }); if (detail > 0) shade(h, { color: PAL.bugDark, seed: 522 + sd, alpha: 0.45 * detail });
    for (const [sx, sy, r] of SPOTS) if (spots > 0 && sy * sd >= 0 && (sy !== 0 || sd > 0)) ink(shape.circle(sx, sy, r * E.outBack(spots), 14), { closed: true, w: 1, fill: PAL.ink, amp: 0.3, seed: 530 + sx });
    ctx.restore(); }
  if (!shell && grow < 1) SPOTS.forEach(([sx, sy, r], i) => { const q = E.outBack(clamp(grow * 1.8 - 0.4 - i * 0.06)); if (q > 0) ink(shape.circle(sx, sy, r * q, 14), { closed: true, w: 1, fill: PAL.ink, amp: 0.3, seed: 530 + sx }); });
  if (g > 0) { ink(shape.circle(38 - 14 * (1 - g), 0, 16 * g, 20), { closed: true, w: 2, fill: PAL.ink, seed: 540 });
    for (const sd of [-1, 1]) { ink(shape.circle(45 - 14 * (1 - g), sd * 7 * g, 3 * g, 8), { closed: true, w: 0.6, fill: '#f4efe2', amp: 0.2, seed: 541 + sd });
      pen([[50, sd * 6], [62, sd * 14], [70, sd * 14]], { w: 1.6, color: PAL.ink, seed: 543 + sd, taper: 0.4, draw: clamp(grow * 2 - 1) }); } }
  ctx.restore();
}
function leaf(cx, cy, len, ang, seed, t) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang + 0.02 * Math.sin(t * 1.3 + seed));
  const top = shape.arc(0, len * 0.9, len * 1.05, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5, 24).map(([x, y]) => [x * 1.02, y]);
  const outline = [...top, ...top.slice().reverse().map(([x, y]) => [x, -y])];
  ink(outline, { closed: true, w: 3, fill: PAL.leafGreen, seed }); shade(outline, { color: PAL.leafDark, seed: seed + 1, alpha: 0.5 });
  pen([[-len * 0.52, 0], [len * 0.52, 0]], { w: 2.2, color: PAL.leafDark, seed: seed + 2 });
  for (let k = -3; k <= 3; k++) if (k) pen([[k * len * 0.12, 0], [k * len * 0.12 + len * 0.1, -len * 0.16]], { w: 1.4, color: PAL.leafDark, seed: seed + 5 + k, alpha: 0.8 });
  for (let k = -3; k <= 3; k++) if (k) pen([[k * len * 0.12, 0], [k * len * 0.12 + len * 0.1, len * 0.16]], { w: 1.4, color: PAL.leafDark, seed: seed + 15 + k, alpha: 0.8 });
  ctx.restore();
}
function daisy(x, y, s, t, seed) {
  const sw = 4 * Math.sin(t * 1.4 + seed), hx = x + sw, hy = y - 110 * s;
  pen([[x, y], [x + sw * 0.4, y - 55 * s], [hx, hy]], { w: 2.4, color: PAL.leafDark, seed });
  for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + seed; ink(shape.ellipse(hx + Math.cos(a) * 16 * s, hy + Math.sin(a) * 16 * s, 13 * s, 5 * s, a, 12), { closed: true, w: 1.2, fill: '#f7f3ea', amp: 0.3, seed: seed + k }); }
  ink(shape.circle(hx, hy, 8 * s, 12), { closed: true, w: 1.2, fill: '#e8b93c', amp: 0.3, seed: seed + 20 });
}
function poppy(x, y, s, t, seed, headY = null) {
  const sw = 5 * Math.sin(t * 1.1 + seed), hx = x + sw, hy = headY ?? y - 150 * s;
  pen([[x, y], [x + sw * 0.5, (y + hy) / 2], [hx, hy + 20 * s]], { w: 3, color: PAL.leafDark, seed });
  for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.4 + seed, P = shape.blob(hx + Math.cos(a) * 26 * s, hy + Math.sin(a) * 20 * s, 34 * s, seed + k, 0.25, 24);
    ink(P, { closed: true, w: 2, fill: PAL.poppy, seed: seed + k }); shade(P, { color: '#8a2319', seed: seed + 10 + k, alpha: 0.4 }); }
  ink(shape.circle(hx, hy, 12 * s, 14), { closed: true, w: 1.6, fill: '#2a2226', seed: seed + 30 });
  return [hx, hy];
}
function ground(y0, seed, t, x0 = -40, x1 = W + 40) {
  const r = shape.ridge(x0, x1, y0, 26, seed);
  const g = shape.band(r, H + 40); flat(g, '#b9c48a'); hatch(g, { color: '#5d7040', alpha: 0.3, gap: 7, len: 10, angle: 0.5, seed: seed + 1 });
  pen(r, { w: 3, seed: seed + 2 }); grass(r, { every: 22, h: 22, seed: seed + 3, sway: 5 });
}

/* ---------- plate I · the pencil: a line is written, then the camera closes on the eraser ---------- */
const SCRIPT = Array.from({ length: 320 }, (_, i) => { const u = i / 319; return [380 + u * 760 + 9 * Math.cos(u * TAU * 21), 650 + 15 * Math.sin(u * TAU * 21) * (0.6 + 0.4 * Math.sin(u * TAU * 5)) + 5 * Math.sin(u * TAU * 3)]; });
const tipAt = t => { const w = E.inOutSine(inv(0.6, 4.2, t)), p = along(SCRIPT, w), lift = E.inOut3(inv(4.2, 5.2, t));
  return [lerp(p[0], 1000, lift), lerp(p[1], 700, lift) - 6 * Math.abs(Math.sin(t * 18)) * (1 - lift)]; };
const angAt = t => lerp(-1.02, -1.25, E.inOut3(inv(4.2, 5.2, t)));
const eraserAt = t => { const [x, y] = tipAt(t), a = angAt(t); return [x + Math.cos(a) * 548, y + Math.sin(a) * 548]; };
const P1 = {
  dur: 6, dark: false, drift: false,
  header: { num: 1, title: 'The Pencil', sub: 'a line being written' }, stage: { n: 1, name: 'WRITING', prevN: 0 },
  cam: t => { const [ex, ey] = eraserAt(t); return { x: ex, y: ey, s: kf(t, [[0, 1], [4.4, 1.03], [6, 1.22]], E.inOutSine) }; },
  hero: t => { const [x, y] = eraserAt(t); return { x, y }; },
  cues: [[0.6, 'scratch', { chars: 60 }], [4.4, 'pop']],
  draw(t) {
    notebook(t);
    pen(SCRIPT, { w: 2.6, color: PAL.graphite, draw: E.inOutSine(inv(0.6, 4.2, t)), taper: 0.05, seed: 420 });
    const [tx, ty] = tipAt(t); pencil(tx, ty, angAt(t), 560, !(SEAM === 'morph' && S.trans && S.trans.type === 'custom' && S.side === 'old'));   // the morph seam animates the eraser itself
  },
  overlay(t) {
    withAlpha(beat(t, 1.4, 4.0), () => text(typed('field note, 9 a.m.', t - 1.4, 20), 380, 560, { kind: 'mono', size: 22, ls: 4, color: PAL.inkSoft }));
  },
};
const SEAM = 'morph';                                                          // 'morph' or 'macro'
/* ---------- seam I → II (macro): into the red, spots appear, back out to the ladybug, then the garden ---------- */
function eraserToBugMacro(p, X) {
  const camA = P1.cam(X.pt), [tx, ty] = tipAt(X.pt), a = angAt(X.pt), [ex, ey] = camPoint(camA, [tx + Math.cos(a) * 552, ty + Math.sin(a) * 552]);
  const camN = camP2(X.t), hd = hdB(X.t), [bx, by] = bugB(X.t), [cx, cy] = camPoint(camN, [bx - 7.5 * Math.cos(hd), by - 7.5 * Math.sin(hd)]);
  const rA = 24 * camA.s, rB = 40 * 1.25 * (camN.s || 1);
  if (p < 0.32) {                                                            // sink into the eraser
    const q = p / 0.32, KA = coverR(ex, ey) / rA * 1.15, sc = curve(q, [[0, 1], [1, KA, 'in3']], { geo: true });
    X.drawOldX({ hud: 1 - inv(0, 0.4, q), xf: about(ex, ey, sc) });
    withAlpha(curve(q, [[0, 0], [0.45, 0], [0.97, 0.9]]), () => { ctx.fillStyle = PAL.eraser; ctx.beginPath(); ctx.arc(ex, ey, rA * sc, 0, TAU); ctx.fill(); });   // the eraser's grain shows to the last moment
    return 0;
  }
  const KB = coverR(cx, cy) / rB * 1.25;                                     // the shell fills the screen at this zoom
  // pacing: a slow drift while the spots bloom, then a smooth ease back until the whole ladybug fits; the seam ends on
  // plate II's own close-up camera, which takes over from here (no straight zoom out)
  const sc = curve(p, [[0.32, KB], [0.44, KB * 0.8, 'lin'], [0.9, 1, 'inOutSine'], [1, 1]], { geo: true });
  ctx.fillStyle = PAL.bug; ctx.fillRect(-20, -20, W + 40, H + 40);
  S.noReticle = p < 0.9;
  X.drawNewX({ hud: inv(0.9, 1, p), xf: about(cx, cy, sc) });
  S.noReticle = false;
  withAlpha(0.85 * (1 - inv(0.32, 0.36, p)), () => { ctx.fillStyle = PAL.eraser; ctx.fillRect(-20, -20, W + 40, H + 40); });   // eraser red settles into shell red; never a flat hold
  return inv(0.32, 0.36, p);
}
/* ---------- seam I → II (morph): the eraser becomes the ladybug ---------- */
function eraserToBug(p, X) {
  const camA = P1.cam(X.pt), [tx, ty] = tipAt(X.pt), a = angAt(X.pt), [ex, ey] = camPoint(camA, [tx + Math.cos(a) * 552, ty + Math.sin(a) * 552]);
  const camN = camB(X.t), hd = hdB(X.t), [bx, by] = bugB(X.t), sN = 1.25 * (camN.s || 1);
  const [cx, cy] = camPoint(camN, [bx - 6 * 1.25 * Math.cos(hd), by - 6 * 1.25 * Math.sin(hd)]);
  const u = E.inOut3(inv(0.05, 0.8, p)), lift = Math.sin(Math.PI * u) * 70;                  // the shape travels on a gentle arc
  const pa = { x: ex, y: ey, rot: a, s: camA.s }, pb = { x: cx, y: cy, rot: hd, s: sN };
  const px = lerp(pa.x, pb.x, u), py = lerp(pa.y, pb.y, u) - lift, rot = lerp(pa.rot, pb.rot, u), sc = lerp(pa.s, pb.s, u);
  X.drawOldX({ hud: 1 - inv(0, 0.35, p) });
  softReveal(() => X.drawNewX({ hud: inv(0.6, 1, p) }), px, py, lerp(0, coverR(px, py) + 300, E.inOutSine(inv(0.15, 0.95, p))), 320);
  const M = morphPose(ERASER().map(([x, y]) => [x - 552, y]), BUG_SHELL, u, pa, pb);
  const Ml = M.map(([x, y]) => [x, y - lift]),                                             // lifted onto the arc
    fade = 1 - inv(0.86, 1, p);
  withAlpha(fade, () => { ink(Ml, { closed: true, w: 2.4, fill: mixColor(PAL.eraser, PAL.bug, u), amp: 0.6, seed: 900 });
    shade(Ml, { color: PAL.bugDark, seed: 901, alpha: 0.45 * u });
    if (u > 0.5) { ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.scale(sc, sc); pen([[-36, 0], [30, 0]], { w: 2, color: PAL.ink, draw: inv(0.5, 0.8, u), seed: 902 }); ctx.restore(); } });
  const gx = px + 6 * sc * Math.cos(rot), gy = py + 6 * sc * Math.sin(rot);             // head, spots and legs grow in the bug's own frame
  withAlpha(fade, () => ladybug(gx, gy, X.t, { s: sc, hd: rot, shell: false, grow: inv(0.45, 0.95, p), walk: 1 }));
  return E.inOutSine(inv(0.2, 0.9, p));
}
/* ---------- plate II · the garden: out of the red, a ladybug on a leaf; it walks, opens up, and flies off right ---------- */
const BUG_DELAY = SEAM === 'macro' ? 1.8 : 0;                                 // a longer seam pushes plate II's action back
const bugB = tt => { const t = tt - BUG_DELAY; return t < 3.2 ? [lerp(905, 1000, E.inOutSine(inv(0, 2.8, t))), 560 + 4 * Math.sin(t * 2)]
  : SEAM === 'macro' ? kf(t, [[3.2, [1000, 560]], [4.2, [1170, 500]], [5.2, [1520, 430]], [6.6, [2350, 340]], [7.6, [2900, 300]]], E.in2)   // a longer flight the camera travels with
  : kf(t, [[3.2, [1000, 560]], [4.4, [1180, 480]], [5.4, [1420, 390]], [6.6, [1800, 300]]], E.in2); };
const hdB = t => { if (t - BUG_DELAY < 3.3) return -0.12; const [x0, y0] = bugB(t - 0.1), [x1, y1] = bugB(t); return Math.atan2(y1 - y0, x1 - x0); };
const camB = t => ({ x: W / 2, y: H / 2, s: 1.04, dx: -0.55 * clamp(bugB(t)[0] - 1150, 0, 800), dy: 0.3 * clamp(480 - bugB(t)[1], 0, 300) });
// macro: the seam ends close on the ladybug and hands the camera to a tracking shot; when it takes off the camera pulls
// back while travelling with it (lead room ahead of it), instead of mirroring the push-in with a straight zoom out
const camMacro = t => follow(bugB, t, { s: u => curve(u, [[0, 2.4], [BUG_DELAY + 3.0, 2.3], [BUG_DELAY + 6.2, 1.1, 'inOutSine']], { geo: true }), lead: 240, lag: 0.3 });
const camP2 = t => SEAM === 'macro' ? camMacro(t) : camB(t);
const P2 = {
  dur: 6.5 + BUG_DELAY, dark: false,
  enter: SEAM === 'macro' ? { type: 'custom', dur: 3.4, draw: eraserToBugMacro, carry: false, momentum: false }
    : { type: 'custom', dur: 1.8, draw: eraserToBug, carry: false, momentum: false },
  header: { num: 2, title: 'The Garden', sub: 'a ladybug on a leaf' }, stage: { n: 2, name: 'GARDEN', prevN: 1 },
  cam: camP2,
  hero: t => { const [x, y] = bugB(t); return { x, y, label: 'LADYBUG·01', r: 58 }; },
  cues: [[3.2 + BUG_DELAY, 'pop'], [3.3 + BUG_DELAY, 'scratch', { chars: 8 }]],
  draw(t) {
    const c = camP2(t), wide = SEAM === 'macro';
    parallax(c, 0.2, () => { lobedCloud(820, 240, [[0, 70], [-90, 50], [90, 56]], { seed: 601 }); lobedCloud(1500, 200, [[0, 60], [-70, 44], [74, 48]], { seed: 602 });
      if (wide) { lobedCloud(2300, 260, [[0, 64], [-80, 46], [80, 50]], { seed: 603 }); lobedCloud(3000, 190, [[0, 56], [-66, 40], [70, 44]], { seed: 604 }); } });
    parallax(c, 0.6, () => { ground(760, 610, t, -600, wide ? 4200 : W + 40);
      [[180, 0.9], [420, 1.1], [1500, 1.0], [1760, 1.2], [2100, 0.9], ...(wide ? [[2500, 1.1], [2750, 0.8], [3100, 1.2], [3500, 1.0]] : [])].forEach(([x, s], i) => daisy(x, 800, s, t, 620 + i * 7)); });
    leaf(1000, 600, 620, -0.18, 650, t);
    leaf(1650, 690, 380, 0.35, 660, t);
    if (wide) { leaf(2350, 720, 460, -0.3, 670, t); leaf(3050, 660, 520, 0.2, 680, t); }
    const open = E.outBack(inv(2.8 + BUG_DELAY, 3.3 + BUG_DELAY, t));
    const tr = S.trans && S.trans.type === 'custom' && S.side === 'new' ? S.trans.p : 1;       // role in the seam I → II
    const bug = o => ladybug(...bugB(t), t, { s: 1.25, hd: hdB(t), open, walk: t - BUG_DELAY < 2.8 ? 1 : 0, ...o });
    if (SEAM === 'macro') bug({ spots: inv(0.33, 0.48, tr), detail: inv(0.55, 0.8, tr), grow: inv(0.45, 0.85, tr) });   // spots bloom, then the head and legs draw on as we ease back
    else withAlpha(inv(0.86, 1, tr), () => bug());
  },
  overlay(t) {
    const h = heroOf(P2, t);
    withAlpha(beat(t, 1.2 + BUG_DELAY * 1.2, 3.0 + BUG_DELAY), () => callout(t - 1.2 - BUG_DELAY * 1.2, { ax: h.x - 20, ay: h.y - 40, ex: h.x - 90, ey: 330, x2: h.x - 150, align: 'right', title: 'seven-spot ladybird', sub: 'Coccinella septempunctata' }));
  },
};
/* ---------- plate III · the meadow: still flying right, it slows and lands on a poppy ---------- */
const POPPY = [1150, 540];
const bugC = t => kf(t, [[0, [560, 380]], [1.5, [900, 350]], [3.0, [POPPY[0], POPPY[1] - 44]]], E.out2);
const P3 = {
  dur: 3.3, dark: false,                                                        // ends as the ladybug settles, so the cut lands on action
  enter: { type: 'pan' },                                                        // dir 'auto': follows the ladybug's flight
  header: { num: 3, title: 'The Meadow', sub: 'looking for a place to land' }, stage: { n: 3, name: 'MEADOW', prevN: 2 },
  cam: t => ({ x: POPPY[0], y: POPPY[1], s: kf(t, [[0, 1], [1.6, 1.02], [3.3, 1.18]], E.inOutSine) }),
  hero: t => { const [x, y] = bugC(t); return { x, y, label: 'LADYBUG·01', r: 58 }; },
  cues: [[3.0, 'chime', { f: 660 }]],
  draw(t) {
    lobedCloud(1560 + t * 10, 200, [[0, 64], [-80, 46], [84, 50]], { seed: 701 });
    const hill = shape.ridge(-40, W + 40, 640, 60, 702, 0.002); flat(shape.band(hill, H), '#cdd19e'); pen(hill, { w: 2, seed: 703, alpha: 0.7 });
    ground(730, 710, t);
    const r = mulberry(720);
    for (let i = 0; i < 26; i++) { const x = r() * W, s = 0.6 + r() * 0.5; if (Math.abs(x - POPPY[0]) < 120) continue;
      r() < 0.5 ? daisy(x, 760 + r() * 120, s, t, 730 + i) : poppy(x, 780 + r() * 120, s * 0.8, t, 760 + i); }
    poppy(POPPY[0], 760, 1, t, 790, POPPY[1]);
    const land = inv(2.7, 3.4, t), [bx, by] = bugC(t);
    ladybug(bx, by, t, { s: 0.95, hd: lerp(-0.25, -0.1, land), open: 1 - E.inOut3(land) });
  },
  overlay(t) {
    withAlpha(beat(t, 0.9, 3.2), () => stat(t - 0.9, { x: 480, y: 330, kicker: 'AN ADULT LADYBIRD EATS, PER DAY', value: u => 'up to ≈ ' + countUp(50, u, 1.0) + ' aphids' }));   // no note: a 3.3 s plate has no time to read one
  },
};
/* ---------- plate IV · the notebook: a pencil sketch of the same ladybug, drawn where the real one sat ---------- */
const SK = [760, 540];
const SK_BODY = shape.circle(SK[0], SK[1], 70, 60), SK_HEAD = shape.circle(SK[0] + 76, SK[1] - 6, 26, 30);
const P4 = {
  dur: 5.5, dark: false,
  enter: { type: 'cut', match: 1, settle: 1.4 },                                 // match cut: the sketch opens exactly where the ladybug was, then glides home
  header: { num: 4, title: 'The Notebook', sub: 'what was seen, written down' }, stage: { n: 4, name: 'NOTEBOOK', prevN: 3 },
  hero: () => ({ x: SK[0], y: SK[1], label: 'SKETCH·01', r: 96 }),
  cues: [[0.3, 'scratch', { chars: 40 }]],
  draw(t) {
    notebook(t);
    const d1 = t < 0.01 ? 0.35 : lerp(0.35, 1, E.inOutSine(inv(0, 1.2, t))), d2 = E.inOutSine(inv(1.5, 2.1, t));
    ink(SK_BODY, { closed: true, w: 2.4, color: PAL.graphite, draw: d1, amp: 1.4, seed: 801 });
    ink(SK_HEAD, { closed: true, w: 2.4, color: PAL.graphite, draw: d2, amp: 1.4, seed: 802 });
    pen([[SK[0] + 70, SK[1]], [SK[0] - 70, SK[1]]], { w: 2, color: PAL.graphite, draw: E.out3(inv(2.0, 2.4, t)), seed: 803 });
    SPOTS.forEach(([sx, sy, r], i) => { const q = stagger(i, t, { t0: 2.4, step: 0.12, dur: 0.3 }); if (q > 0) ink(shape.circle(SK[0] + sx * 1.7, SK[1] + sy * 1.7, r * 1.6 * q, 14), { closed: true, w: 1.4, color: PAL.graphite, fill: 'rgba(58,52,56,0.55)', seed: 810 + i }); });
    const tip = t < 1.2 ? along(SK_BODY, d1) : t < 2.1 ? along(SK_HEAD, d2) : t < 2.4 ? [lerp(SK[0] + 70, SK[0] - 70, inv(2.0, 2.4, t)), SK[1]] : [SK[0] + 30 * Math.cos(t * 3), SK[1] + 40 + 20 * Math.sin(t * 5)];
    const out = E.inOut3(inv(3.6, 4.6, t));
    pencil(lerp(tip[0], 1500, out), lerp(tip[1], 1100, out), -1.0);
    withAlpha(inv(2.8, 3.2, t), () => text(typed('7 spots · 1 leaf · 1 flight', t - 2.8, 24), 1000, 520, { kind: 'mono', size: 26, ls: 3, color: PAL.graphite }));
  },
};
/* ---------- plate V · end card ---------- */
const P5 = {
  dur: 4, dark: true, counter: false, focus: () => [960, 420],
  enter: { type: 'page', dir: 'right' },
  draw(t) {
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 0.4, [dx, dy] = wander(i, t, 8, 0.7);
      ink(shape.circle(960 + Math.cos(a) * 120 + dx, 420 + Math.sin(a) * 70 + dy, 4, 8), { closed: true, w: 1, color: '#9fb4ff', fill: PAL.pink, amp: 0.2, seed: i }); }
    ladybug(960, 420, t, { s: 0.7, hd: -Math.PI / 2 + 0.2 * Math.sin(t), walk: 1 });
    const q = 'From a pencil to a ladybug, and back.', qo = { kind: 'display', size: 52, italic: true, color: PAL.nightInk, cps: 24 };
    dropText(q, 960 - measure(q, qo) / 2, 640, t - 0.6, qo);
    const col = 'A SEAM DESIGN EXAMPLE  ·  DRAWN IN CODE', co = { kind: 'mono', size: 22, ls: 5, color: '#a9aacb' };
    text(typed(col, t - 2.0, 60), 960 - measure(col, co) / 2, 720, co);
  },
};
defineStory({ title: 'Pencil to Ladybug', stages: 4, music: { tonic: 262 }, plates: [P1, P2, P3, P4, P5] });
boot();
