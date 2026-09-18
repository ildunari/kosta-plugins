/* =====================  FIXTURE: story_monotone  ·  cue_check.mjs must fail this  ===================== */
/* A short film (two plates, 16 s) whose cues are one sound over and over: ten pops for ten different things arriving,
   and nothing else. Each pop varies by itself, so it has no identical repeats; it must fail on DOMINANT (10 of 11
   judged events against a limit of 0.3 * 11 + 2 = 5.3), which the old 40-event floor never judged.
   Build: python3 build.py story_monotone.js story_monotone.html */
const DOTS = [...Array(10)].map((_, i) => [360 + (i % 5) * 300, 420 + (i / 5 | 0) * 260]);
const scene = (seed, from) => t => { const ridge = shape.ridge(-20, W + 20, 860, 30, seed); flat(shape.band(ridge, H + 20), '#d9c9a0'); pen(ridge, { w: 4, seed: seed + 1 });
  DOTS.slice(from, from + 5).forEach(([x, y], i) => { const u = inv(1 + i * 1.3, 1.4 + i * 1.3, t);
    if (u > 0) ink(shape.circle(x, y, 40 * E.outBack(u), 28), { closed: true, w: 3, fill: PAL.accent, seed: seed + i }); }); };
const pops = [...Array(5)].map((_, i) => [1 + i * 1.3, 'pop']);
const P = [
  { dur: 8, dark: false, header: { num: 1, title: 'Arrivals', sub: 'one after another' }, draw: scene(1, 0), cues: pops },
  { dur: 8, dark: false, enter: { type: 'cut' }, header: { num: 2, title: 'More arrivals', sub: 'the same sound again' }, draw: scene(7, 5), cues: pops },
];
defineStory({ title: 'Monotone Fixture', stages: 2, music: { tonic: 220 }, plates: P });
boot();
