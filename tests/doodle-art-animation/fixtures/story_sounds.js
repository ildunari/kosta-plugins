/* =====================  FIXTURE: story_sounds  ·  every sound added in sound build S2 (v0.16.4)  ===================== */
/* One cue of each new effect, one plate per new ambience bed, and headers typed with each writing tool (through
   plate.pen, so the fixture needs no paper registry). effects_test.py renders its audio and runs cue_check on it.
   Build: python3 build.py story_sounds.js story_sounds.html */
const FX = [['pencil', { dur: 1 }], ['chalk', { dur: 1 }], ['marker', {}], ['quill', { dur: 0.8 }], ['charcoal', { dur: 0.8 }], ['techPen', { dur: 0.8 }],
  ['typewriter', { chars: 8 }], ['eraser', {}], ['stamp', {}], ['tear', {}], ['counter', { n: 8, dur: 1 }], ['sonify', { dur: 1 }], ['sparkle', {}],
  ['pipette', {}], ['centrifuge', { dur: 1.2 }], ['syringe', {}], ['pills', { shakes: 2 }], ['fizz', { dur: 1 }], ['bubbles', { dur: 1 }], ['squelch', {}],
  ['heartbeat', {}], ['beep', { n: 2 }], ['zap', {}], ['magnet', {}]];
const BEDS = ['body', 'underwater', 'forest', 'ocean', 'fire', 'clockRoom', 'micro', 'vinyl'];
const PENS = ['pencil', 'chalk', 'marker', 'quill', 'charcoal', 'techPen'];
const blank = seed => t => pen(shape.ridge(-20, W + 20, 860, 30, seed), { w: 4, seed });
const P = [
  ...[0, 1, 2, 3].map(k => ({ dur: 6 * 1.4 + 0.6, enter: k ? { type: 'cut' } : undefined, pen: PENS[k], header: { num: k + 1, title: 'Sound check ' + (k + 1), sub: 'one of each' },
    draw: blank(k + 1), cues: FX.slice(k * 6, k * 6 + 6).map(([n, o], i) => [0.4 + i * 1.4, n, o]) })),
  ...BEDS.map((b, i) => ({ dur: 3.2, enter: { type: 'cut' }, pen: i < 2 ? PENS[4 + i] : 'none', header: i < 2 ? { num: 5 + i, title: 'Bed ' + b } : undefined,
    draw: blank(20 + i), bed: BED[b] })),
];
defineStory({ title: 'Sounds Fixture', stages: 4, music: { tonic: 220 }, plates: P });
boot();
