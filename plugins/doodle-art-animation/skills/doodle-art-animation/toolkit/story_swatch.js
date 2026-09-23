/* =====================  STORY: Paper Swatch  ·  visual test of the papers  ===================== */
/* Every paper set gets a light plate and a dark plate with a little of everything on them: a header, a hatched body
   with a white highlight, a callout, a stat, the Journey Log and the stage dial. Papers that belong to no set get one
   plate each. Wipes cross from one set to the next, so the transitions between papers are tested too. A specimen
   sheet, not a model for a film. smoke_test.py builds it and checks each paper's contrast (window.__paperProbe).
   Build: python3 build.py story_swatch.js swatch.html */
const SW = (paper, dark, k) => ({
  dur: 3, dark, paper: paper, enter: k === 0 ? null : dark ? { type: 'fade', dur: 0.6 } : { type: 'wipe', dur: 0.9 },
  header: { num: k + 1, title: `${paper} · ${dark ? 'night world' : 'paper world'}`, sub: dark ? 'inside, hidden, small' : 'human scale and larger' },
  stage: { n: dark ? 2 : 1, name: dark ? 'INSIDE' : 'OUTSIDE' },
  log: () => ({ title: 'JOURNEY LOG · NP·01', rows: [['SIZE', '≈ 120 nm'], ['ZETA', '−17 mV']] }),
  draw(t) {
    const ic = inkOf(dark), body = shape.blob(760, 620, 170, 7, 0.12);
    ink(body, { closed: true, w: 0, fill: dark ? PAL.navyFill : '#c9a27a', amp: 0.8, seed: 3 });
    hatch(body, { angle: -0.5, gap: 8, color: ic, alpha: 0.35, seed: 5, keep: (x, y) => clamp((x - 650) / 300) });
    pen(body, { closed: true, w: 4, color: ic, seed: 4 });
    pen(shape.arc(700, 560, 90, Math.PI * 1.1, Math.PI * 1.45), { w: 5, color: '#ffffff', alpha: 0.85, seed: 8 });
    for (let j = 0; j < 18; j++) { const a = j / 18 * TAU;
      pen([[760 + Math.cos(a) * 190, 620 + Math.sin(a) * 190], [760 + Math.cos(a) * 240, 620 + Math.sin(a) * 240]], { w: 3, color: dark ? PAL.mint : '#4f8a6a', seed: 20 + j }); }
    pen(shape.ridge(0, W, 900, 18, 3), { w: 4, color: ic, seed: 9 });
  },
  overlay(t) {
    callout(t - 0.3, { ax: 900, ay: 540, ex: 1080, ey: 460, x2: 1260, title: 'polymer core', sub: 'PLGA, about 120 nm across', dark });
    stat(t - 0.2, { x: 1250, y: 720, kicker: 'CIRCULATION HALF-LIFE', value: () => '≈ 6 h', note: 'in mice, PEG-coated', dark, size: 56 });
  },
});
const inSet = new Set(Object.values(PAPER_SETS).flatMap(s => [s.light, s.dark]));
const PAPERS = [...Object.keys(PAPER_SETS).flatMap(name => [[name, false], [name, true]]),
  ...Object.keys(GROUNDS).filter(g => !inSet.has(g)).map(g => [g, GROUNDS[g].tone === 'dark'])];
defineStory({ title: 'Paper Swatch', stages: 2, plates: PAPERS.map(([paper, dark], k) => SW(paper, dark, k)) });
boot();
