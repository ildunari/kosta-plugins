/* =====================  STORY: The Brush Set  ·  visual test of brush.* and wash()  ===================== */
/* A specimen sheet for the natural-media brushes: the nine stroke types, watercolor washes on paper and night paper,
   brush hatching, and flow fields, each drawing on and then idling. Every medium is shown twice: as a labelled
   stroke, and at work in a small scene. Build: python3 build.py story_brushes.js brushes.html

   Seams (exit → entry, link, transition):
     0 → I    title card → the dry-media page          link: the page is set up          → `wipe`, 0.9 s
     I → II   the pencil landscape → the pen diagram   link: turning to a new page       → `page`, 1.1 s
     II → III the diagram → the watercolor landscape   link: wet media, time to dry      → `bleed`, 1.3 s
     III → IV the pond → plankton under the lens      link: scale, into the water       → `lensIn`, 1.4 s
     IV → V   the cells → the end card                 link: the end                     → `fade`, 1.0 s

   The brushes keep their grain fixed per seed, so moving art passes a seed and only the outline boils. */
Object.assign(PAL, { wet: '#7fa8c9', hill: '#8fae6a', field: '#d9b36a', dusk: '#c98bb0' });
const DUR = 4.6;
/** a slow hand-held float, so no drawing sits dead still */
const FLOAT = (k, s0 = 1.02) => t => ({ x: W / 2, y: H / 2, s: s0 + 0.06 * E.inOutSine(clamp(t / DUR)),
  dx: 30 * Math.sin(t * 0.85 + k) + 5 * t * (k % 2 ? 1 : -1), dy: 18 * Math.sin(t * 0.62 + k * 2) + 3 * t, rot: 0.005 * Math.sin(t * 0.5 + k) });   // a sine that never stalls: the hand also drifts
/** draw-on for the k-th item on a plate: staggered, eased */
const DR = (t, k, t0 = 0.3, step = 0.32, len = 1.3) => E.inOutSine(inv(t0 + k * step, t0 + k * step + len, t));
const SWOOSH = (x, y, len, amp, ph) => Array.from({ length: 26 }, (_, i) => { const u = i / 25; return [x + u * len, y + amp * Math.sin(u * 5.2 + ph) * (0.4 + 0.6 * Math.sin(u * Math.PI))]; });
/** the same swoosh, breathing slowly, so a drawn specimen never sits still */
const LIVE = (x, y, len, amp, ph, t) => SWOOSH(x, y + 9 * Math.sin(t * 1.9 + ph * 2), len, amp * (1 + 0.3 * Math.sin(t * 1.5 + ph)), ph + 1.1 * Math.sin(t * 1.7 + ph));
/** one labelled specimen stroke */
function specimen(t, k, type, x, y, o = {}) {
  const { len = 470, wave = 16, lab = 44, ...so } = o;
  brush.stroke(LIVE(x, y, len, wave, k * 1.3, t), { type, seed: 100 + k * 7, draw: DR(t, k), ...so });
  KIT.caption(t - 0.8 - k * 0.32, `'${type}'`, x, y + lab, { dark: S.dark });
}
/** breathe(poly, t, k, o): a wash that swells and settles. The transform scales the cached raster, so the points (and
    the cache key) never change — animate a wash this way rather than by moving its points. */
function breathe(poly, t, k, o, amp = 0.035, rate = 1.1) {
  const c = poly.reduce((q, [x, y]) => [q[0] + x / poly.length, q[1] + y / poly.length], [0, 0]);
  const s = 1 + amp * Math.sin(t * rate + k);
  ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(s, s); ctx.translate(-c[0], -c[1]); wash(poly, o); ctx.restore();
}
const header = (num, title, sub) => ({ num, title, sub });

/* ---------- title card ---------- */
const TBLOB = shape.blob(960, 470, 330, 12, 0.34, 56).map(([x, y]) => [x, 470 + (y - 470) * 0.52]);
const P0 = {
  dur: 3.8, counter: false,
  // the pull-out and the push-in overlap (1.4 s .. 2.2 s) so the scale never rests at a turning point
  cam: t => ({ x: 960, y: 470, s: 1.045 - 0.045 * E.out3(clamp(t / 2.2)) + 0.032 * E.inOutSine(clamp((t - 1.4) / 2.4)),
    dx: 22 * Math.sin(t * 0.9) + 9 * t, dy: 11 * Math.sin(t * 1.15) - 4 * t }),
  cues: [[0.3, 'noise', { dur: 1.2, g: 0.05, f0: 500, f1: 1600 }], [0.7, 'scratch', { chars: 14, cps: 14 }], [1.6, 'scratch', { chars: 30 }]],
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [261.6, 329.6, 392], g: 0.015 }),
  draw(t) {
    breathe(TBLOB, t, 0, { seed: 21, color: PAL.wet, bleed: 0.45, draw: E.out3(inv(0.1, 1.6, t)), from: [700, 470] }, 0.075, 1.7);
    wash(shape.blob(1500 + 26 * Math.sin(t * 0.75), 250 + 14 * Math.sin(t * 1.05), 80, 22, 0.3, 30), { seed: 22, color: PAL.sun, bleed: 0.5, draw: E.out3(inv(0.6, 1.8, t)) });
    brush.stroke(SWOOSH(640, 560, 640, 10, 0.4), { type: 'charcoal', seed: 23, draw: DR(t, 0, 1.2, 0, 0.9), w: 11 });
    for (let i = 0; i < 170; i++) { const r = mulberry(900 + i), x = (r() * W + t * (55 + r() * 150)) % W, y = r() * H + 38 * Math.sin(t * (1.3 + 0.5 * (i % 3)) + i), sz = 3 + (i % 3);
      ctx.fillStyle = `rgba(70,60,50,${0.2 + 0.07 * (i % 3)})`; ctx.fillRect(x, y, sz, sz); }   // graphite dust drifting over the page, at mixed speeds
    for (let i = 0; i < 3; i++) { const y = 700 + i * 34 + 7 * Math.sin(t * 1.25 + i * 1.7), x0 = 760 + i * 30;
      brush.stroke([[x0 + 11 * Math.sin(t * 1.6 + i), y], [x0 + 400 - i * 60, y + 11 * Math.sin(t * 1.15 + i)]], { type: ['pencil-2b', 'marker', 'spray'][i], seed: 24 + i,
        color: [undefined, PAL.accent, PAL.sea][i], w: [5, 12, 20][i], draw: DR(t, i, 1.7, 0.2, 0.7) }); }
  },
  overlay(t) {
    const a = 1 - inv(3.4, 3.8, t);
    withAlpha(a, () => {
      const k = 'A SPECIMEN SHEET', ko = { kind: 'mono', size: 22, ls: 8, color: PAL.inkSoft };
      text(typed(k, t - 0.3, 34), 960 - measure(k, ko) / 2, 380, ko);
      const ti = 'The Brush Set', to = { kind: 'display', size: 108, weight: 500 };
      dropText(ti, 960 - measure(ti, to) / 2, 520, t - 0.7, { ...to, cps: 14 });
      const sb = 'nine media, one page', so = { kind: 'display', size: 32, italic: true, color: PAL.inkSoft };
      text(typed(sb, t - 0.9, 30), 960 - measure(sb, so) / 2, 640, so);
    });
  },
};

/* ---------- plate I · dry media: pencils and charcoal, then a landscape sketched with them ---------- */
const RIDGE = shape.ridge(930, 1880, 560, 70, 31, 0.006, 16).map(([x, y]) => [x, y - 90 * Math.sin((x - 930) / 950 * Math.PI)]);
const HILL = shape.ridge(930, 1880, 700, 26, 32, 0.004, 20);
const CREST = shape.between(RIDGE.map(([x, y]) => [x, y + 16]), RIDGE.map(([x, y]) => [x, y + 110]));
const FIELD = shape.between(shape.ridge(930, 1880, 736, 10, 33, 0.005, 28), [[1880, 1010], [930, 1010]]);
const P1 = {
  dur: DUR, cam: FLOAT(1), enter: { type: 'wipe', dur: 0.9 },
  header: header(1, 'Dry media', 'graphite and charcoal'), stage: { n: 1, name: 'DRY MEDIA', prevN: 0 },
  cues: [[0.3, 'scratch', { chars: 40, cps: 30 }], [2.0, 'scratch', { chars: 30, cps: 26 }]],
  draw(t) {
    KIT.caption(t - 0.2, 'brush.stroke · dry', 140, 272);
    ['pencil-2b', 'pencil-hb', 'pencil-2h', 'cpencil', 'charcoal'].forEach((ty, k) => specimen(t, k, ty, 140, 320 + k * 118, { w: ty === 'charcoal' ? 12 : undefined }));
    // the sketch: 2H construction lines, a charcoal ridge, 2B hills, HB trees, a coloured-pencil sun
    const d = k => DR(t, k, 1.0, 0.35, 1.2);
    ctx.save(); ctx.translate(34 * Math.sin(t * 1.5), 21 * Math.sin(t * 1.25 + 1));   // the page drifts under the hand
    brush.stroke([[930, 720], [1880, 720]], { type: 'pencil-2h', seed: 40, draw: d(0), alpha: 0.7 });
    for (let i = 0; i < 4; i++) brush.stroke([[1400, 720], [930 + i * 320, 1000]], { type: 'pencil-2h', seed: 41 + i, draw: d(0), alpha: 0.45 });
    brush.stroke(RIDGE, { type: 'charcoal', seed: 45, draw: d(1), w: 10 });
    brush.hatch(CREST, { type: 'charcoal', w: 3.5, gap: 13, angle: -0.8, seed: 46, draw: d(2), alpha: 0.45, keep: x => 0.35 + 0.65 * clamp((x - 1250) / 500) });
    brush.stroke(HILL, { type: 'pencil-2b', seed: 47, draw: d(2) });
    const sway = 3 * Math.sin(t * 1.3);                                        // HB trees on the hill, canopies swaying
    [[1160, 1], [1560, 0.75]].forEach(([tx, s], j) => { const gy = 700 + 8 * j;
      brush.stroke([[tx, gy], [tx + sway * 0.3, gy - 50 * s], [tx + sway, gy - 100 * s]], { type: 'pencil-2b', seed: 48 + j, draw: d(3), w: 5 * s });
      const crown = shape.blob(tx + sway, gy - 150 * s, 62 * s, 50 + j, 0.3, 30);
      withAlpha(d(3), () => flat(crown, PAL.paper, 0.92));                     // the tree stands in front of the hatched ridge
      brush.stroke(crown, { type: 'pencil-hb', closed: true, seed: 52 + j, draw: d(3.2), w: 3.5 });
      brush.hatch(shape.blob(tx + sway + 12 * s, gy - 136 * s, 44 * s, 54 + j, 0.3, 24), { type: 'pencil-hb', gap: 7, angle: -0.7, seed: 56 + j, draw: d(3.6), alpha: 0.6 }); });
    brush.hatch(FIELD, { type: 'pencil-2h', gap: 12, angle: 0.25, seed: 62, draw: d(2.6), alpha: 0.55, rand: 0.4,
      keep: (x, y) => 0.25 + 0.6 * clamp((y - 740) / 240) });                  // the near field, hatched flat and pale
    // a 2B path running down to the viewer, along the 2H perspective lines
    brush.stroke([[1400, 722], [1350, 800], [1260, 900], [1140, 1000]], { type: 'pencil-2b', seed: 58, draw: d(3.4), w: 4 });
    brush.stroke([[1410, 722], [1480, 800], [1580, 900], [1700, 1000]], { type: 'pencil-2b', seed: 59, draw: d(3.5), w: 4 });
    const sun = [1690, 250], rot = t * 0.75;
    brush.stroke(shape.circle(sun[0], sun[1], 46, 30), { type: 'cpencil', closed: true, seed: 60, draw: d(4), w: 7 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + rot, r0 = 64, r1 = (k % 2 ? 96 : 112) + 9 * Math.sin(t * 5.5 + k * 1.7);   // the rays flicker
      brush.stroke([[sun[0] + Math.cos(a) * r0, sun[1] + Math.sin(a) * r0], [sun[0] + Math.cos(a) * r1, sun[1] + Math.sin(a) * r1]], { type: 'cpencil', seed: 61 + k, draw: d(4.3 + k * 0.05), w: 5 }); }
    for (let i = 0; i < 3; i++) { const cx = 980 + ((t * 54 + i * 330) % 980), cy = 250 + i * 34 + 8 * Math.sin(t * 1.1 + i);   // HB clouds drifting across
      brush.stroke(shape.blob(cx, cy, 52 - i * 8, 70 + i, 0.34, 26), { type: 'pencil-hb', closed: true, seed: 70 + i, w: 2.6, alpha: 0.5 * inv(1.6, 2.4, t), streaks: false }); }
    for (let i = 0; i < 16; i++) { const gx = 960 + i * 58, gy = 706 + 6 * Math.sin(i), sw = 9 * Math.sin(t * 3.2 + i * 0.7);   // grass tufts swaying on the ridge line
      brush.stroke([[gx, gy], [gx + sw, gy - 20 - 6 * ((i * 7) % 3)]], { type: 'pencil-2b', seed: 90 + i, w: 2.2, alpha: 0.75 * inv(2.0, 2.8, t), streaks: false }); }
    for (let i = 0; i < 6; i++) { const x = 1000 + ((t * 120 + i * 90) % 700), y = 330 + i * 26 + 9 * Math.sin(t * 2.4 + i), f = 9 * Math.sin(t * 11 + i);   // birds in HB
      brush.stroke([[x - 12, y - f], [x, y], [x + 12, y - f]], { type: 'pencil-hb', seed: 80 + i, w: 2.4, alpha: inv(1.8, 2.4, t), streaks: false }); }
    ctx.restore();
  },
  overlay(t) { KIT.caption(t - 1.9, 'brush.hatch · charcoal', 1540, 660, { backing: true }); },
};

/* ---------- plate II · pens, markers and spray: a notebook diagram ---------- */
const BOXES = [[960, 360, 'IDEA'], [1300, 560, 'SKETCH'], [1640, 360, 'INK']];
const P2 = {
  dur: DUR, cam: FLOAT(2), enter: { type: 'page', dur: 1.1 },
  header: header(2, 'Pens, markers, spray', 'pooled edges, fine mist'), stage: { n: 2, name: 'WET INK', prevN: 1 },
  cues: [[0.4, 'scratch', { chars: 30 }], [1.6, 'noise', { dur: 1.2, g: 0.05, f0: 3000, type: 'highpass' }]],
  draw(t) {
    KIT.caption(t - 0.2, 'brush.stroke · wet', 140, 280);
    ['marker', 'marker-2', 'techpen', 'spray'].forEach((ty, k) => specimen(t, k, ty, 140, 340 + k * 140, { color: [PAL.gold, PAL.cyan, undefined, PAL.pink][k], lab: 52, wave: ty === 'marker-2' ? 36 : 16 }));
    // spray mist drifting behind the diagram
    for (let i = 0; i < 3; i++) { const y = 420 + i * 110 + 22 * Math.sin(t * 1.5 + i * 2), dx = 120 * Math.sin(t * 1.3 + i);
      brush.stroke(SWOOSH(930 + dx, y, 820, 30, i), { type: 'spray', seed: 300 + i, w: 30, color: [PAL.peri, PAL.cyan, PAL.pink][i], alpha: 0.7 * DR(t, i, 0.4, 0.3, 1.2) }); }
    const d = k => DR(t, k, 1.0, 0.35, 1.0);
    ctx.save(); ctx.translate(34 * Math.sin(t * 1.45), 22 * Math.sin(t * 1.2 + 2));   // the diagram drifts as one
    BOXES.forEach(([x, y, label], k) => {
      const bob = 9 * Math.sin(t * 2.6 + k), R = shape.rect(x - 110, y - 50 + bob, 220, 100);
      brush.stroke(R, { type: 'techpen', closed: true, seed: 310 + k, draw: d(k), w: 2.4 });
      brush.stroke([[x - 70, y + 2 + bob], [x + 70, y + 2 + bob]], { type: 'marker', color: PAL.gold, seed: 320 + k, draw: DR(t, k, 2.0, 0.3, 0.6), w: 30, alpha: 0.75 });
      withAlpha(inv(1.2 + k * 0.35, 1.6 + k * 0.35, t), () => text(label, x, y + 10 + bob, { kind: 'mono', size: 26, weight: 600, ls: 5, align: 'center' }));
    });
    const arrows = [[[1075, 390], [1190, 520]], [[1415, 520], [1530, 390]]];
    arrows.forEach(([a, b], k) => { const q = DR(t, k, 1.8, 0.4, 0.7); if (q <= 0) return;
      brush.stroke([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 24], b], { type: 'techpen', seed: 330 + k, draw: q, w: 2 });
      if (q >= 1) { const ang = Math.atan2(b[1] - a[1] + 24, b[0] - a[0]); arrowHead(b[0], b[1], ang, 14, PAL.ink, 2); } });
    // a chisel-marker underline that sweeps across the bottom note
    brush.stroke([[980, 820], [1620, 812]], { type: 'marker-2', color: PAL.cyan, seed: 340, draw: DR(t, 0, 2.4, 0, 0.8), nib: -0.9 });
    withAlpha(inv(1.7, 2.1, t), () => text(typed('one line, three media', t - 1.7, 26), 1000, 806, { kind: 'display', size: 34, italic: true }));
    const gear = t * 1.3;                                                    // a turning techpen star keeps the corner alive
    brush.stroke(Array.from({ length: 17 }, (_, i) => { const a = i / 16 * TAU + gear, r = i % 2 ? 22 : 46; return [1760 + Math.cos(a) * r, 860 + Math.sin(a) * r]; }), { type: 'techpen', seed: 350, draw: d(3), w: 2 });
    ctx.restore();
  },
};

/* ---------- plate III · watercolour washes: a landscape tinted under its ink ---------- */
const SKY = [[-60, -60], [W + 60, -60], [W + 60, 620], [-60, 620]];
const FAR = shape.band(shape.ridge(-60, W + 60, 520, 60, 51, 0.004, 24), 700);
const FARSHADE = shape.between(FAR.slice(0, -2).map(([x, y]) => [x, y + 14]), FAR.slice(0, -2).map(([x, y]) => [x, y + 70]));
const NEAR = shape.band(shape.ridge(-60, W + 60, 640, 30, 52, 0.003, 30), H + 60);
const POND = shape.blob(1240, 820, 230, 53, 0.18, 44).map(([x, y]) => [x, 820 + (y - 820) * 0.34]);
const SUNW = shape.blob(1600, 250, 80, 54, 0.2, 30);
const cloudAt = (i, t) => shape.blob(300 + i * 560 + t * (30 + i * 9), 170 + i * 40, 110 - i * 15, 60 + i, 0.3, 30).map(([x, y], j) => [x, 170 + i * 40 + (y - 170 - i * 40) * 0.45]);
const P3 = {
  dur: DUR + 0.4, cam: t => ({ x: W / 2, y: H / 2, s: 1.02 + 0.05 * E.inOutSine(clamp(t / 5)), dx: 22 * Math.sin(t * 0.5) - 11 * t, dy: 8 * Math.sin(t * 0.8) + 4 * t }),
  // fall 0.38 (not the default 0.22): at this shorter 1.3 s the drop otherwise covers 465 px in one step and
  // snaps (speed_check ceiling 324 px near a seam's ends). Keep the quicker seam, soften its peak.
  enter: { type: 'bleed', dur: 1.3, fall: 0.38 },
  focus: () => [1240, 820],
  header: header(3, 'Watercolour washes', 'tints under the ink'), stage: { n: 3, name: 'WASHES', prevN: 2 },
  cues: [[0.3, 'noise', { dur: 2.5, g: 0.04, f0: 300, f1: 900, type: 'lowpass' }], [3.4, 'chime', { f: 523 }]],
  draw(t) {
    const w = (k, len = 1.4) => E.out2(inv(0.2 + k * 0.35, 0.2 + k * 0.35 + len, t));
    breathe(SKY, t, 0, { seed: 70, color: PAL.wet, bleed: 0.18, strength: 0.32, draw: w(0), reveal: 'sweep', texture: 0.8 }, 0.016, 0.9);
    breathe(SUNW, t, 1, { seed: 71, color: PAL.sun, bleed: 0.6, draw: w(1) }, 0.06, 1.6);
    for (let i = 0; i < 3; i++) breathe(cloudAt(i, t), t, i * 2, { seed: 72 + i, color: PAL.dusk, bleed: 0.5, strength: 0.3, draw: w(1.5 + i * 0.3) }, 0.05, 1.4);
    breathe(FAR, t, 3, { seed: 75, color: PAL.hill, bleed: 0.14, draw: w(2) }, 0.02, 1.15);
    breathe(NEAR, t, 5, { seed: 76, color: PAL.field, bleed: 0.2, draw: w(3), strength: 0.45 }, 0.016, 0.95);
    breathe(POND, t, 2, { seed: 77, color: PAL.sea, bleed: 0.3, draw: w(4, 1.0), strength: 0.55 }, 0.05, 1.5);
    // ink on top: pen outlines, brush hatching on the far hills, ripples on the pond
    const d = k => DR(t, k, 1.2, 0.4, 1.1);
    pen(FAR.slice(0, -2), { w: 3, seed: 78, draw: d(0) });
    pen(NEAR.slice(0, -2), { w: 3.4, seed: 79, draw: d(1) });
    brush.hatch(FARSHADE, { type: 'pencil-hb', gap: 9, angle: -0.9, seed: 80, draw: d(2), alpha: 0.7, keep: x => 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(x * 0.006)) });
    pen(POND, { closed: true, w: 2.6, seed: 81, draw: d(2.5) });
    for (let k = 0; k < 6; k++) { const q = (t * 0.7 + k / 6) % 1;
      ink(shape.ellipse(1240, 820, 40 + q * 170, 8 + q * 50, 0, 40), { closed: true, w: 1.6, color: PAL.seaDeep, amp: 0.4, seed: 82 + k, alpha: (1 - q) * inv(2.6, 3.2, t) }); }
    ink(shape.circle(1600, 250, 62 + 3 * Math.sin(t * 1.1), 36), { closed: true, w: 2.4, seed: 86, draw: d(3) });
    for (let i = 0; i < 6; i++) { const x = 140 + ((t * 150 + i * 150) % 1000), y = 300 + i * 26 + 10 * Math.sin(t * 2 + i), f = 10 * Math.sin(t * 10 + i);
      pen([[x - 13, y - f], [x, y], [x + 13, y - f]], { w: 2, seed: 90 + i, alpha: inv(1.5, 2, t) }); }
  },
  overlay(t) {
    KIT.caption(t - 0.8, 'wash(poly, { bleed })', 520, 990, { backing: true });
    KIT.caption(t - 2.0, 'brush.hatch · pencil-hb', 520, 1020, { backing: true });
  },
};

/* ---------- plate IV · night paper: plankton as washes, currents as a flow field ---------- */
const CELLS = Array.from({ length: 7 }, (_, i) => { const r = mulberry(400 + i); return { x: 260 + i * 240 + r() * 60, y: 360 + r() * 420, R: 50 + r() * 50, c: [PAL.cyan, PAL.pink, PAL.mint, PAL.gold][i % 4], s: 410 + i }; });
const P4 = {
  dur: DUR + 0.4, dark: true, cam: FLOAT(4, 1.03), enter: { type: 'lensIn', dur: 1.4 },
  header: header(4, 'Night paper', 'washes glow at night'), stage: { n: 4, name: 'NIGHT', prevN: 3 },
  hero: t => { const c = CELLS[3], [dx, dy] = wander(3, t, 34, 1.2); return { x: c.x + dx, y: c.y + dy, label: 'CELL·04', r: c.R + 26, alpha: inv(2.4, 2.8, t) }; },
  bed: (ac, out, t0, dur) => SFX.pad(ac, out, t0, { dur, notes: [130.8, 196, 246.9], g: 0.02, dark: true }),
  cues: [[1.6, 'chime', { f: 392 }]],
  draw(t) {
    // currents: the same straight strokes, bent by a field that drifts with time
    brush.field('waves', () => {
      for (let k = 0; k < 8; k++) { const y = 310 + k * 90;
        brush.stroke([[-40, y], [W + 40, y]], { type: k % 3 ? 'pencil-2h' : 'pencil-hb', seed: 500 + k, fieldT: t * 2.2 + k * 0.4, fieldAmt: 0.7, alpha: 0.5 * DR(t, k, 0.2, 0.12, 1.2), draw: DR(t, k, 0.2, 0.12, 1.4) });
      }
    });
    CELLS.forEach((c, i) => {
      const [dx, dy] = wander(i, t, 34, 1.2), body = shape.blob(c.x + dx, c.y + dy, c.R, c.s, 0.22, 36);
      breathe(body, t, i, { seed: c.s, color: c.c, bleed: 0.45, draw: DR(t, i, 0.5, 0.18, 1.2) }, 0.055, 1.7);
      pen(body, { closed: true, w: 2, color: PAL.nightInk, seed: c.s, draw: DR(t, i, 0.9, 0.18, 1.0), alpha: 0.8 });
      if (i === 3) brush.hatch(body, { type: 'pencil-2h', gap: 7, angle: 0.8, seed: 520, draw: DR(t, 0, 1.6, 0, 1.0), inset: 6 });
      else speckle(body, 18, { seed: c.s + 1, alpha: 0.5 });
    });
    for (let i = 0; i < 150; i++) { const r = mulberry(600 + i), x = (r() * W + t * (60 + r() * 90)) % W, y = r() * H + 22 * Math.sin(t * 1.7 + i);   // motes
      ctx.fillStyle = 'rgba(200,205,255,0.45)'; ctx.fillRect(x, y, 4, 4); }
  },
  overlay(t) { KIT.caption(t - 1.0, "brush.field('waves')", 520, 1010, { dark: true }); },
};

/* ---------- end card ---------- */
const EMBLEM = shape.blob(960, 400, 120, 90, 0.2, 40);
const P5 = {
  dur: 5, dark: true, counter: false, focus: () => [960, 400], enter: { type: 'fade', dur: 1.0 },
  cam: t => ({ x: 960, y: 400, s: 1 + 0.05 * E.inOutSine(clamp(t / 5)), dx: 10 * Math.sin(t * 0.7) + 5 * t, dy: 6 * Math.sin(t * 0.5) - 3 * t }),
  cues: [[0.4, 'chime', { f: 523 }], [1.2, 'readout', { chars: 26, cps: 22 }]],
  draw(t) {
    breathe(EMBLEM, t, 0, { seed: 91, color: PAL.cyan, bleed: 0.5, draw: E.out3(inv(0, 1.2, t)) }, 0.06, 1.8);
    for (let k = 0; k < 5; k++) { const q = (t * 0.5 + k / 5) % 1;
      ink(shape.circle(960, 400, 140 + q * 260, 60), { closed: true, w: 1.3, color: PAL.peri, amp: 0.3, seed: k, alpha: 0.5 * (1 - q) }); }
    brush.stroke(shape.circle(960, 400, 124, 48), { type: 'techpen', closed: true, seed: 92, draw: E.out3(inv(0.3, 1.2, t)), w: 2.2 });
    for (let i = 0; i < 110; i++) { const r = mulberry(950 + i), x = (r() * W + t * (60 + r() * 90)) % W, y = r() * H + 26 * Math.sin(t * 1.5 + i);
      ctx.fillStyle = 'rgba(190,195,250,0.4)'; ctx.fillRect(x, y, 4, 4); }
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU + t * 0.75;
      brush.stroke([[960 + Math.cos(a) * 150, 400 + Math.sin(a) * 150], [960 + Math.cos(a) * 172, 400 + Math.sin(a) * 172]], { type: 'charcoal', w: 6, seed: 93 + k, alpha: inv(0.6, 1.2, t) }); }
  },
  overlay(t) {
    const q = 'Every medium, drawn in code.', qo = { kind: 'display', size: 56, italic: true, color: PAL.nightInk, cps: 22 };
    dropText(q, 960 - measure(q, qo) / 2, 690, t - 0.6, qo);
    const col = 'BRUSHES AFTER P5.BRUSH  ·  MIT', co = { kind: 'mono', size: 22, ls: 5, color: '#a9aacb' };
    text(typed(col, t - 1.0, 70), 960 - measure(col, co) / 2, 770, co);
  },
};

defineStory({ title: 'The Brush Set', stages: 4, music: { tonic: 247 }, plates: [P0, P1, P2, P3, P4, P5] });
boot();
