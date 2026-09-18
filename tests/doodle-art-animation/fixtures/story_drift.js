/* =====================  FIXTURE: story_drift  ·  story_check.mjs must fail this  ===================== */
/* Three plates whose Journey Log contradicts itself, the way "The Slow Squeeze" did: elapsed time goes
   T+ 5 min -> T+ 10 min -> T+ 5 min (TIME), plates 2 and 3 both claim stage 2 (STAGE), and the hero's ID in the log
   title changes from DRUG·01 to DRUG·02 on the last plate (HERO).
   Build: python3 build.py story_drift.js story_drift.html */
const HERO = [960, 560];
const STATES = ['PRESSED', 'RELEASED'];
const logOf = (id, el, site) => () => ({ title: `JOURNEY LOG · ${id}`, rows: [['ELAPSED', el], ['SITE', site]], states: STATES, state: 0 });
const scene = seed => () => { const ridge = shape.ridge(-20, W + 20, 700, 40, seed); flat(shape.band(ridge, H + 20), '#d9c9a0'); pen(ridge, { w: 4, seed: seed + 1 });
  ink(shape.circle(HERO[0], HERO[1], 70, 40), { closed: true, w: 3.2, fill: PAL.accent, seed: seed + 2 }); };
const hero = id => () => ({ x: HERO[0], y: HERO[1], label: id, r: 60 });
const P = [
  { dur: 3, dark: false, hero: hero('DRUG·01'), header: { num: 1, title: 'Pressed', sub: 'five minutes in' },
    stage: { n: 1, name: 'PRESS', prevN: 0 }, log: logOf('DRUG·01', 'T+ 5 min', 'THE PRESS'), draw: scene(1) },
  { dur: 3, dark: false, enter: { type: 'cut' }, hero: hero('DRUG·01'), header: { num: 2, title: 'Cooled', sub: 'ten minutes in' },
    stage: { n: 2, name: 'COOL', prevN: 1 }, log: logOf('DRUG·01', 'T+ 10 min', 'THE BENCH'), draw: scene(3) },
  { dur: 3, dark: false, enter: { type: 'cut' }, hero: hero('DRUG·02'), header: { num: 3, title: 'Back again', sub: 'the clock went backwards' },
    stage: { n: 2, name: 'COOL', prevN: 2 }, log: logOf('DRUG·02', 'T+ 5 min', 'THE BENCH'), draw: scene(5) },
];
defineStory({ title: 'Drift Fixture', stages: 3, plates: P });
boot();
