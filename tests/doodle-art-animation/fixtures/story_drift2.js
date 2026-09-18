/* =====================  FIXTURE: story_drift2  ·  story_check.mjs must fail this  ===================== */
/* The v0.15 final review's probe: facts that drift without any `T+` value or log-title change.
     - elapsed time is written as ELAPSED "40 min" -> "10 min" -> "5 min" and DAY "DAY 3 of 28" -> 1 -> 0 (TIME, twice
       per seam: each clock row is followed on its own)
     - the hero() label drifts NP·01 -> NP·07 -> CELL·9 while the log title keeps NP·01 (HERO: changes and disagrees)
     - header numbers 2, 2, 1 (HEADER: repeated, then backwards)
     - stages 3, 1, 9 with defineStory stages: 3 (STAGE: backwards, then out of range)
   Build: python3 build.py story_drift2.js story_drift2.html */
const HERO = [960, 560];
const scene = () => { ink(shape.circle(HERO[0], HERO[1], 70, 40), { closed: true, w: 3.2, fill: PAL.accent, seed: 2 }); };
const L = (el, day) => () => ({ title: 'JOURNEY LOG · NP·01', rows: [['ELAPSED', el], ['DAY', day]], states: ['A', 'B'], state: 0 });
const P = [
  { dur: 3, hero: () => ({ x: HERO[0], y: HERO[1], label: 'NP·01', r: 60 }), header: { num: 2, title: 'One', sub: 'a' }, stage: { n: 3, name: 'X', prevN: 0 }, log: L('40 min', 'DAY 3 of 28'), draw: scene },
  { dur: 3, enter: { type: 'cut' }, hero: () => ({ x: HERO[0], y: HERO[1], label: 'NP·07', r: 60 }), header: { num: 2, title: 'Two', sub: 'b' }, stage: { n: 1, name: 'Y', prevN: 3 }, log: L('10 min', 'DAY 1 of 28'), draw: scene },
  { dur: 3, enter: { type: 'cut' }, hero: () => ({ x: HERO[0], y: HERO[1], label: 'CELL·9', r: 60 }), header: { num: 1, title: 'Three', sub: 'c' }, stage: { n: 9, name: 'Z', prevN: 1 }, log: L('5 min', 'DAY 0 of 28'), draw: scene },
];
defineStory({ title: 'Drift Two', stages: 3, plates: P });
boot();
