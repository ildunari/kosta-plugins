/* =====================  FIXTURE: story_legmiss  ·  legibility_check.mjs must fail this with CLASH  ===================== */
/* The v0.15 final review's probes: each plate holds a line a viewer cannot read that the first legibility_check passed.
     I    faint ink: a line in rgba(..., 0.40) and one at alpha 0.42 on plain paper (judged at their faint peak)
     II   half a line on an ink-dark block (the worst stretch fails; the mean over the whole ring read 6.8)
     III  haloed lines inside double crosshatching (the halo is clean, the 0.5 em beyond it is noise: halo busy)
     IV   textOnPath (one text() call per glyph, grouped back into its line) and lone letters, grey on hatching
     V    a long sentence of facts marked role 'decor' (DECOR warning, not a failure: decor is the escape hatch)
     VI   a pale gradient fill (its colour is read off the rendered glyphs, not taken as black)
   Plates I-IV and VI fail with CLASH; plate V warns.
   Build: python3 build.py story_legmiss.js story_legmiss.html */
const P = [
  { dur: 3, dark: false, header: { num: 1, title: 'Translucent ink', sub: "a faded fact" }, draw() {},
    overlay(t) {
      text('the dose falls to a tenth by day three', 160, 520, { kind: 'sans', size: 32, color: 'rgba(40,30,20,0.40)', role: 'fact' });
      text('the tablet swells before it breaks up', 160, 640, { kind: 'sans', size: 32, color: PAL.ink, alpha: 0.42, role: 'fact' });
    } },
  { dur: 3, dark: false, enter: { type: 'cut' }, header: { num: 2, title: 'Half on a dark block', sub: 'ink on ink' },
    draw(t) { flat(shape.rect(560, 440, 900, 160), '#2a2226'); },
    overlay(t) { text('pressure held at ten thousand pounds', 160, 535, { kind: 'sans', size: 36, weight: 600, color: PAL.ink, role: 'fact' }); } },
  { dur: 3, dark: false, enter: { type: 'cut' }, header: { num: 3, title: 'Halo over hatching', sub: 'knocked out, still noisy' },
    draw(t) { const b = shape.rect(120, 380, 1680, 420); crosshatch(b, { seed: 4, alpha: 1, gap: 3, w: 2.2 }); crosshatch(b, { seed: 9, alpha: 1, gap: 4, angle: 1.2 }); },
    overlay(t) { haloText('crystals melt into a disordered glass', 180, 600, { kind: 'sans', size: 28, color: PAL.inkSoft, role: 'fact' });
      haloText('the lattice gives way under load', 180, 700, { kind: 'display', size: 28, italic: true, weight: 300, color: PAL.label, role: 'fact' }); } },
  { dur: 3, dark: false, enter: { type: 'cut' }, header: { num: 4, title: 'Letters one at a time', sub: 'text on a path, single glyphs' },
    draw(t) { const b = shape.rect(120, 380, 1680, 420); crosshatch(b, { seed: 4, alpha: 1 }); },
    overlay(t) { textOnPath('CHAINS SLIDE PAST EACH OTHER', [[200, 560], [900, 520], [1600, 600]], 0, { kind: 'mono', size: 22, color: '#8d8478' });
      text('A', 400, 700, { kind: 'sans', size: 30, color: '#9a9080', role: 'label' }); text('B', 900, 700, { kind: 'sans', size: 30, color: '#9a9080', role: 'label' }); } },
  { dur: 3, dark: false, enter: { type: 'cut' }, header: { num: 5, title: 'Marked decor', sub: 'the escape hatch' },
    draw(t) { const b = shape.rect(120, 380, 1680, 420); crosshatch(b, { seed: 4, alpha: 1 }); },
    overlay(t) { text('the drug is 40 mg per tablet, released over 12 hours', 180, 600, { kind: 'sans', size: 13, color: '#8d8478', role: 'decor' }); } },
  { dur: 3, dark: false, enter: { type: 'cut' }, header: { num: 6, title: 'Gradient fill', sub: 'a pale ramp read as black' }, draw() {},
    overlay(t) { const g = ctx.createLinearGradient(160, 0, 1200, 0); g.addColorStop(0, '#e9dfc8'); g.addColorStop(1, '#ddd2b8');
      text('pale gradient words vanish into the paper', 160, 560, { kind: 'sans', size: 34, color: g, role: 'fact' }); } },
];
defineStory({ title: 'Legibility Misses', stages: 6, plates: P });
boot();
