/* =====================  STORY: Salt in Water  ·  a narrated example (voice first)  ===================== */
/* How a narrated film is put together (references/api.md, "Narration"):
   1. The narration came first: vo/lines.json, one clip per plate, with {marks} on the words a beat should land on.
   2. The voice was made from it (here Kokoro-82M, voice af_heart, with make_voice.py; in a real film, the plugin's
      voice tool) and measured into vo/voice.json: each clip's length, its sentence times and its mark times.
   3. The picture follows the voice. Each plate names its clip (vo: 'P1'); the engine starts the clip once the title
      has typed on and makes the plate as long as its line needs, and a beat that names a word lands on it:
      mark('gone') in draw and overlay, 'gone+0.2' as a cue time. Exits are written against the plate's own length
      (P1.dur, which the engine sets), never against a fixed number of seconds.
   Built with --voice none, every plate keeps its own dur and every mark its estimate (vo.marks), so the same story
   plays before the voice exists.

   Seams: 0 → I zoom into the beaker as the salt lands; I → II lens into the water where the crystals were;
   II → end card: lens back out to the bench.
   Values rounded: table salt (NaCl) dissolves to about 36 g per 100 mL of water at 20 °C. */
Object.assign(PAL, { na: '#8e7cc3', cl: '#6fb56c', oxy: '#e0645a', hyd: '#f4f1ea', salt: '#f7f4ec', saltSide: '#d9d3c5', streak: '#eef8fa' });
const BENCH = 910;
const waterY = b => b.y - b.s * (4 + 202 * b.level);                   // the water surface in lab.flask's beaker
function bench(t, x0 = 1060, x1 = 1900) {
  ink([[x0, BENCH], [x1, BENCH]], { w: 3, seed: 5, draw: E.out3(inv(0, 0.8, t)) });
  hatch(shape.rect(x0, BENCH, x1 - x0, 60), { color: PAL.muted, alpha: 0.35, gap: 9, len: 10, angle: 0.8, seed: 6, keep: 0.5 });
}
/** a salt crystal: a small cube, front face and two lit faces */
function crystal(x, y, s, rot, seed, a = 1) {
  if (s < 0.8 || a <= 0) return;
  withAlpha(a, () => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const k = s * 0.5, f = [[-s, -s], [s, -s], [s, s], [-s, s]];
    ink([[-s, -s], [-s + k, -s - k], [s + k, -s - k], [s, -s]], { closed: true, w: 1.2, fill: '#ffffff', amp: 0.2, seed });
    ink([[s, -s], [s + k, -s - k], [s + k, s - k], [s, s]], { closed: true, w: 1.2, fill: PAL.saltSide, amp: 0.2, seed: seed + 1 });
    ink(f, { closed: true, w: 1.4, fill: PAL.salt, amp: 0.2, seed: seed + 2 });
    ctx.restore(); });
}

/* ---------- PLATE 0 · title card: a pinch of salt into a beaker ---------- */
const BK0 = { x: 1480, y: BENCH, s: 2.1, level: 0.6 }, W0 = waterY(BK0), MOUTH = [1506, 262];
const grains0 = Array.from({ length: 16 }, (_, i) => ({ dt: i * 0.06 + hash3(i, 2) * 0.05, vx: (hash3(i, 5) - 0.5) * 70, s: 4 + 4 * hash3(i, 3), rot: hash3(i, 4) * TAU, sink: 30 + 40 * hash3(i, 6) }));
const grain0 = (g, t) => {                                             // falls from the packet, lands, sinks slowly
  const u = t - mark('drop', P0) - g.dt; if (u < 0) return null;
  const hit = Math.sqrt(2 * (W0 - MOUTH[1]) / 1800), x = MOUTH[0] + g.vx * Math.min(u, hit);
  return u < hit ? [x, MOUTH[1] + 900 * u * u, false] : [x, W0 + 6 + g.sink * (1 - Math.exp(-(u - hit) * 1.5)), true];
};
const P0 = {
  dur: 6.5, vo: { id: 'P0', at: 2.4, marks: { drop: 2.4 } },            // the line starts once the title has landed
  cam: t => ({ x: BK0.x, y: W0, s: 1 + 0.05 * E.inOutSine(inv(P0.dur - 2.4, P0.dur, t)), dx: 10 * Math.sin(t * 0.6), dy: 4 * Math.sin(t * 0.8) }),
  hero: () => ({ x: BK0.x, y: W0 + 40 }),
  cues: [[0.3, 'scratch', { chars: 24, cps: 34 }], ['drop+0.1', 'foil'], ['drop+0.55', 'plop', { size: 0.5 }], ['drop+0.8', 'droplet', { g: 0.05 }]],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [196, 246.9, 293.7], g: 0.014 }),
  draw(t) {
    bench(t);
    KIT.lab.flask(t, { x: BK0.x, y: BK0.y, s: BK0.s, level: BK0.level, bubbles: 0, draw: E.inOut2(inv(0.2, 1.6, t)), seed: 3 });
    for (const [i, g] of grains0.entries()) { const p = grain0(g, t); if (p) crystal(p[0], p[1], g.s, g.rot + t * (p[2] ? 0.3 : 3), 100 + i * 3); }
    const tip = 0.35 + 0.55 * E.inOut3(inv(-0.5, 0.1, t - mark('drop', P0)));   // the packet tips as the line begins
    ctx.save(); ctx.translate(MOUTH[0], MOUTH[1]); ctx.rotate(tip);
    const pk = shape.rect(-190, -60, 190, 72);
    ink(pk, { closed: true, w: 2.6, fill: PAL.panel, seed: 21, draw: E.out3(inv(0.3, 1.2, t)) });
    hatch(pk, { color: PAL.peri, alpha: 0.35, gap: 7, len: 9, angle: 0.6, seed: 22, keep: 0.5 });
    text('NaCl', -100, -12, { kind: 'mono', size: 22, weight: 600, align: 'center', color: PAL.inkSoft, role: 'decor', alpha: inv(0.9, 1.3, t) });
    ctx.restore();
  },
  overlay(t) {
    withAlpha(1 - inv(P0.dur - 0.7, P0.dur - 0.2, t), () => {            // the title clears just before the zoom
      text(typed('A FIELD NOTE IN 2 PLATES', t - 0.3, 34), 150, 392, { kind: 'mono', size: 22, ls: 8, color: PAL.inkSoft });
      dropText('Salt in Water', 142, 508, t - 0.8, { kind: 'display', size: 112, weight: 500, cps: 13 });
      const ul = E.out3(inv(1.9, 2.6, t)); if (ul > 0) ink([[146, 548], [lerp(146, 860, ul), 548]], { w: 1.6, color: PAL.peri, amp: 0 });
      text(typed('why the crystals seem to vanish', t - 2.2, 26), 146, 618, { kind: 'display', size: 46, italic: true, color: PAL.inkSoft, role: 'fact' });
    });
  },
};

/* ---------- PLATE I · the beaker: the crystals sink and are gone on the word ---------- */
const BK1 = { x: 960, y: 1010, s: 3.3, level: 0.62 }, W1 = waterY(BK1), HALF1 = 60 * BK1.s;
const sink1 = Array.from({ length: 7 }, (_, i) => ({ x: BK1.x + (i - 3) * 50 + (hash3(i, 7) - 0.5) * 24, y0: W1 + 30 + hash3(i, 8) * 70, s: 11 + 6 * hash3(i, 9), rot: hash3(i, 10) * TAU, v: 60 + 50 * hash3(i, 11), k: hash3(i, 12) }));
const size1 = (c, t) => { const g = mark('gone', P1); return c.s * clamp(1 - inv(0.8 + 1.4 * c.k, g, t)) ** 0.8; };   // every crystal is gone as the word is said
const pos1 = (c, t) => [c.x + 6 * Math.sin(t * 0.9 + c.k * 9), Math.min(BK1.y - 40, c.y0 + c.v * t * (1 - 0.25 * inv(0, 4, t)))];
const ions1 = Array.from({ length: 44 }, (_, i) => ({ x: BK1.x + (hash3(i, 21) - 0.5) * 2 * (HALF1 - 20), y: lerp(W1 + 40, BK1.y - 40, hash3(i, 22)), na: i % 2 === 0, d: hash3(i, 23) }));
const P1 = {
  dur: 10, enter: { type: 'zoom', dir: 'in', dur: 1.9, k: 3 },
  vo: { id: 'P1', marks: { gone: 5.2 } },
  header: { num: 1, title: 'The Beaker', sub: 'a pinch of salt, a glass of water' },
  hero: t => ({ x: 900, y: 880, r: 30, alpha: inv(mark('gone', P1) + 2.4, mark('gone', P1) + 3, t) }),   // where the crystals were: the lens goes in here
  bed: (ac, out, t0, dur) => BED.roomTone(ac, out, t0, dur, { g: 0.016 }),
  cues: [[0.4, 'slosh', { g: 0.05 }], [1.4, 'pop'], ['gone', 'plink', { f: 880 }], ['gone+0.2', 'scratch', { chars: 19, cps: 40 }], ['gone+1.9', 'chime', { f: 587 }]],
  draw(t) {
    const g = mark('gone', P1);
    KIT.lab.flask(t, { x: BK1.x, y: BK1.y, s: BK1.s, level: BK1.level, bubbles: 0, seed: 3 });
    ctx.save(); ctx.beginPath(); ctx.rect(BK1.x - HALF1, W1 + 8, 2 * HALF1, BK1.y - W1 - 20); ctx.clip();
    for (const [i, c] of sink1.entries()) {
      const s = size1(c, t), [x, y] = pos1(c, t); if (s <= 0.5 && t > g) continue;
      const st = clamp(s / c.s) * inv(0.3, 1.2, t);                         // the dissolving streaks: denser water rising and curling off
      for (let k = 0; k < 3; k++) { const pts = Array.from({ length: 10 }, (_, j) => { const v = j / 9; return [x + (k - 1) * 6 + 14 * v * Math.sin(v * 5 + t * 2.2 + k + i), y - 10 - v * (70 + 30 * k)]; });
        pen(pts, { w: 2, color: PAL.streak, alpha: 0.7 * st, taper: 0.5, seed: 300 + i * 5 + k }); }
      crystal(x, y, s, c.rot + t * 0.25, 200 + i * 3);
    }
    for (const [i, p] of ions1.entries()) { const a = inv(g + 0.6 + p.d * 1.6, g + 1.2 + p.d * 1.6, t); if (a <= 0) continue;
      const [wx, wy] = wander(i, t, 10, 0.5, 40); ctx.beginPath(); ctx.arc(p.x + wx, p.y + wy, p.na ? 4 : 5.5, 0, TAU);
      ctx.globalAlpha = a; ctx.fillStyle = p.na ? PAL.na : PAL.cl; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.restore();
  },
  overlay(t) {
    const g = mark('gone', P1), [cx, cy] = pos1(sink1[1], t);
    withAlpha(beat(t, 1.4, g - 0.2), () => callout(t - 1.4, { ax: cx - 8, ay: cy, ex: 640, ey: 900, x2: 560, align: 'right', title: 'a salt crystal', sub: 'sodium chloride, NaCl' }));
    withAlpha(beat(t, g + 0.2, P1.dur), () => stat(t - g - 0.2, { x: 1280, y: 470, kicker: 'SOLUBILITY AT 20 °C', value: u => '≈ ' + countUp(36, u, 1.2) + ' g', note: 'of salt in 100 mL of water' }));
  },
};

/* ---------- PLATE II · pulled apart: water takes the ions off the crystal's edge ---------- */
const LAT = { x: 470, y: 500, n: 5, d: 68 };
const lattice = Array.from({ length: LAT.n * LAT.n }, (_, i) => { const r = Math.floor(i / LAT.n), c = i % LAT.n; return { r, c, na: (r + c) % 2 === 0, x: LAT.x + c * LAT.d, y: LAT.y + r * LAT.d }; });
const IA = lattice.find(q => q.r === 0 && q.c === 4), IB = lattice.find(q => q.r === 1 && q.c === 4);   // the two ions pulled loose: Na⁺, then Cl⁻
const ionPos = (q, t, t0, to) => { const u = E.inOut3(inv(t0, t0 + 2.8, t)), drift = Math.max(0, t - t0 - 2.8) * 14;
  return [lerp(q.x, to[0], u) + drift, lerp(q.y, to[1], u) - drift * 0.3]; };
const posA = t => ionPos(IA, t, mark('pull', P2), [1180, 420]), posB = t => ionPos(IB, t, mark('pull', P2) + 2.2, [1140, 760]);
const waters = Array.from({ length: 26 }, (_, i) => ({ x: lerp(900, 1800, hash3(i, 31)), y: lerp(330, 960, hash3(i, 32)), a: hash3(i, 33) * TAU, spin: (hash3(i, 34) - 0.5) * 1.2, seed: i }));
function ion(x, y, na, seed, a = 1) {
  withAlpha(a, () => { const r = na ? 15 : 23;
    ink(shape.circle(x, y, r, 28), { closed: true, w: 2, color: PAL.nightInk, fill: na ? PAL.na : PAL.cl, amp: 0.3, seed });
    ink([[x - 6, y], [x + 6, y]], { w: 2.4, color: '#ffffff', amp: 0.1, seed: seed + 1 });
    if (na) ink([[x, y - 6], [x, y + 6]], { w: 2.4, color: '#ffffff', amp: 0.1, seed: seed + 2 }); });
}
/** a water molecule: oxygen with its two hydrogens on the side th points to (104.5° apart) */
function water(x, y, th, seed, a = 1) {
  withAlpha(a, () => { for (const s of [-0.91, 0.91]) { const hx = x + 17 * Math.cos(th + s), hy = y + 17 * Math.sin(th + s);
      ink([[x, y], [hx, hy]], { w: 2, color: PAL.nightInk, amp: 0.1, seed: seed + (s > 0 ? 1 : 2) });
      ink(shape.circle(hx, hy, 6.5, 16), { closed: true, w: 1.6, color: PAL.nightInk, fill: PAL.hyd, amp: 0.2, seed: seed + (s > 0 ? 3 : 4) }); }
    ink(shape.circle(x, y, 11, 20), { closed: true, w: 1.8, color: PAL.nightInk, fill: PAL.oxy, amp: 0.2, seed: seed + 5 }); });
}
const P2 = {
  dur: 12, dark: true, enter: { type: 'lensIn', dur: 1.6, dive: 1.8 },
  vo: { id: 'P2', marks: { ions: 5, pull: 8, shell: 10 }, tail: 1.4 },   // a longer tail: the last callout needs its reading time
  header: { num: 2, title: 'Pulled Apart', sub: 'water takes the crystal to pieces' },
  hero: t => { const [x, y] = posA(t); return { x, y }; },               // the lens back out leaves from the freed ion
  cues: [[0.15, 'pop'], ['ions', 'readout', { chars: 18, cps: 30 }], ['pull', 'pegSnap'], ['pull+2.2', 'plink'], ['shell', 'chime', { f: 659 }]],
  draw(t) {
    const P = mark('pull', P2), crowd = inv(P - 3.2, P - 0.4, t);        // the waters close in on the edge while "crowd its edges" is said
    for (const q of lattice) { if (q === IA || q === IB) continue; ion(q.x, q.y + 2 * Math.sin(t * 2 + q.r + q.c), q.na, 500 + q.r * 9 + q.c, E.out3(inv(0.3 + (q.r + q.c) * 0.06, 0.8 + (q.r + q.c) * 0.06, t))); }
    const shellA = waters.slice(0, 6), shellB = waters.slice(6, 12), [ax, ay] = posA(t), [bx, by] = posB(t);
    for (const [i, w] of waters.entries()) {
      const [wx, wy] = wander(i, t, 30, 0.35, 60), free = [w.x + wx - crowd * (w.x - 900) * 0.35, w.y + wy], th = w.a + t * w.spin;
      const inA = i < 6, inB = i >= 6 && i < 12, k = inA ? i : i - 6;
      const lock = inA ? E.inOut2(inv(P - 0.6, P + 1.0, t)) : inB ? E.inOut2(inv(P + 1.6, P + 3.2, t)) : 0;
      if (!lock) { water(free[0], free[1], th, 700 + i * 7, E.out3(inv(0.4, 1.2, t))); continue; }
      const [cx, cy] = inA ? [ax, ay] : [bx, by], ang = k / 6 * TAU + t * 0.3, R = inA ? 52 : 60;
      const sx = cx + R * Math.cos(ang), sy = cy + R * Math.sin(ang), out = inA ? ang : ang + Math.PI;   // oxygen in to the sodium, hydrogens in to the chloride
      water(lerp(free[0], sx, lock), lerp(free[1], sy, lock), lerp(th, out + Math.round((th - out) / TAU) * TAU, lock), 700 + i * 7);
    }
    ion(ax, ay, true, 590); ion(bx, by, false, 595);
  },
  overlay(t) {
    const I = mark('ions', P2), S2 = mark('shell', P2), [ax, ay] = posA(t);
    withAlpha(beat(t, I, P2.dur), () => { const lc = PAL.nightLabel;
      for (const [k, na, s] of [[0, true, 'sodium  Na⁺'], [1, false, 'chloride  Cl⁻']]) { const y = 870 + k * 44, u = t - I - k * 0.5;
        if (u > 0) { ctx.beginPath(); ctx.arc(482, y - 7, na ? 8 : 11, 0, TAU); ctx.fillStyle = na ? PAL.na : PAL.cl; ctx.fill(); }
        haloText(typed(s, u, 30), 506, y, { kind: 'mono', size: 22, color: lc, role: 'label' }); } });
    withAlpha(beat(t, S2, P2.dur), () => callout(t - S2, { ax: ax + 18, ay: ay - 40, ex: 1330, ey: 270, x2: 1390, title: 'a shell of water', sub: 'oxygen faces the sodium', dark: true }));
  },
};

/* ---------- PLATE III · end card: back at the bench ---------- */
const P3 = {
  dur: 7, enter: { type: 'lensOut', dur: 1.6 }, counter: false, vo: { id: 'P3', tail: 1.6 },
  hero: () => ({ x: BK0.x, y: W0 + 60 }),
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur: dur - 0.4, notes: [196, 293.7, 392, 493.9], g: 0.016 }),
  draw(t) {
    bench(1);
    KIT.lab.flask(t, { x: BK0.x, y: BK0.y, s: BK0.s, level: BK0.level, bubbles: 4, seed: 3 });
    for (const [i, p] of ions1.entries()) { if (i % 2) continue; const [wx, wy] = wander(i, t, 6, 0.5, 80), x = BK0.x + (p.x - BK1.x) * BK0.s / BK1.s, y = W0 + 10 + (p.y - W1) * BK0.s / BK1.s;
      ctx.beginPath(); ctx.arc(x + wx, y + wy, p.na ? 2.5 : 3.5, 0, TAU); ctx.fillStyle = p.na ? PAL.na : PAL.cl; ctx.fill(); }
  },
  overlay(t) {
    text(typed('SALT IN WATER', t - 0.6, 30), 150, 360, { kind: 'mono', size: 22, ls: 8, color: PAL.inkSoft });
    dropText('Taken apart by water', 142, 470, t - 1.0, { kind: 'display', size: 84, weight: 500, cps: 16 });
    const rows = [['NARRATION', 'Kokoro-82M · voice af_heart · made on a CPU'], ['TIMING', 'each plate as long as its line'], ['VALUES', 'rounded · NaCl ≈ 36 g per 100 mL at 20 °C']];
    rows.forEach(([k, v], i) => { const u = t - 2.2 - i * 0.35; if (u <= 0) return;
      text(typed(k, u, 30), 150, 590 + i * 44, { kind: 'mono', size: 22, ls: 2, color: PAL.label, role: 'label' });
      text(typed(v, u - 0.2, 40), 330, 590 + i * 44, { kind: 'mono', size: 22, color: PAL.inkSoft, role: 'label' }); });
  },
};

defineStory({ title: 'Salt in Water', stages: 0, music: { tonic: 196, gain: 0.016 }, plates: [P0, P1, P2, P3],
  // the loudness shape, written against the timed plates and the words, so it follows the voice
  dynamics: P => [[0, -4], [P[1].start, -3], [P[2].start, -2], [markAt('pull'), 1.5], [P[3].start + 0.5, 0], [P[3].start + P[3].dur, -1]] });
boot();
