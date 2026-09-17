/* =====================  FIXTURE: story_snap  ·  speed_check.mjs must fail this with SNAP  ===================== */
/* Minimal 3-plate story. Plate 0 -> 1 is a healthy lensIn (should read ok). Plate 1 -> 2 is a `zoom` with the old
   v0.10 timing (dur 0.25 s, far under the 1.9 s / k-4 minimum in references/motion.md, and a linear ease instead
   of a shaped one): the on-screen scale changes far more than 5% per drawing, so it must SNAP both here and in
   motion_check.py on a render. Build: python3 build.py story_snap.js story_snap.html */
const HERO = [960, 560];
function scene(t, seed, dark) {
  const ridge = shape.ridge(-20, W + 20, 660, 50, seed);
  const g = shape.band(ridge, H + 20); flat(g, dark ? PAL.navyFill : '#d9c9a0'); pen(ridge, { w: 4, seed: seed + 1 });
  ink(shape.circle(HERO[0], HERO[1], 70, 40), { closed: true, w: 3.2, fill: dark ? PAL.gold : PAL.accent, seed: seed + 2 });
}
const P = [
  { dur: 3, dark: false, hero: () => ({ x: HERO[0], y: HERO[1], label: 'X·01', r: 60 }),
    header: { num: 0, title: 'Snap Fixture', sub: 'plate 0' }, draw(t) { scene(t, 1, false); } },
  { dur: 3, dark: false, enter: { type: 'lensIn' }, hero: () => ({ x: HERO[0], y: HERO[1], label: 'X·01', r: 60 }),
    header: { num: 1, title: 'Healthy seam', sub: 'lensIn, default timing' }, draw(t) { scene(t, 2, false); } },
  // the seam under test: a zoom crammed into 0.25 s with a linear ease and k=5 (old v0.10 zooms measured 90-137
  // on motion_check.py, well past its SNAP line of 75) instead of the 2.15 s the table calls for at that k.
  { dur: 3, dark: true, enter: { type: 'zoom', dir: 'in', k: 5, dur: 0.25, ease: 'lin' },
    hero: () => ({ x: HERO[0], y: HERO[1], label: 'X·02', r: 60 }),
    header: { num: 2, title: 'Snapped seam', sub: 'zoom, dur 0.25s, linear' }, draw(t) { scene(t, 3, true); } },
];
defineStory({ title: 'Snap Fixture', stages: 1, plates: P });
boot();
