/* =====================  FIXTURE: story_pan_twice  ·  speed_check.mjs must warn TWICE on seam 1  ===================== */
/* The biocoating film's gel seam, reduced: a big coated ball (reticle r 170) sinks out of plate 0 and a whip pan up
   brings in plate 1, where the same hero is a 13 px dot near the top of the rising sheet. Both sheets are on screen together, so the
   hero is seen twice, 13x apart in size. speed_check still exits 0 (TWICE is a warning), with a TWICE line and the
   size jump. Build: python3 build.py story_pan_twice.js story_pan_twice.html */
const PT_X = 700;
const P = [
  { dur: 3, dark: false, hero: t => ({ x: PT_X, y: 640 + 40 * t, label: 'PT·01', r: 170 }),
    header: { num: 1, title: 'Big ball', sub: 'plate 0' },
    draw(t) { ink(shape.circle(PT_X, 640 + 40 * t, 150, 48), { closed: true, w: 3, fill: PAL.accent, seed: 3 }); } },
  { dur: 3, dark: false, enter: { type: 'pan', dir: 'up', dur: 0.9 }, hero: t => ({ x: PT_X, y: 215 + 10 * t, label: 'PT·01', r: 13 }),
    header: { num: 2, title: 'Small dot', sub: 'plate 1' },
    draw(t) { ink(shape.circle(PT_X, 215 + 10 * t, 12, 20), { closed: true, w: 2, fill: PAL.accent, seed: 4 }); } },
];
defineStory({ title: 'Pan Twice Fixture', stages: 2, silent: true, plates: P });
boot();
