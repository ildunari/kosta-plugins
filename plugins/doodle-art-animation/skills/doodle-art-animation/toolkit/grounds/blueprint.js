/* =====================  Blueprint set · whiteprint (light) + blueprint (dark)  =====================
   For devices and processes: presses, dies, pumps, microfluidic chips, anything drawn like an engineering sheet.
   Both papers tint the whole scene toward one blue, so subjects keep their shading but lose their own colours.
   The vermilion accent is only 2.7:1 on blueprint, so the dark page uses warm yellow (the red-pencil convention on
   real blueprints is yellow or coral chalk); the light page uses a red pencil that clears 3:1 on the off-white.
   Both headers type with the technical pen: PAPER_PEN in engine.js names these papers, so they set no sfx. */

if (PAL.bpLine == null) PAL.bpLine = '#9bc4d3';   // pale cyan: cyanotype linework (4.0:1 on blueprint, so lines only, never text)

/** whiteprint: off-white diazo paper, a faint non-photo-blue drafting grid and the developer's soft horizontal streaks */
defineGround('whiteprint', {
  tone: 'light',
  pal: { paper: '#eeede4', stripe: 'rgba(0,0,0,0)', ink: '#1d3470', inkSoft: '#3a4d86', muted: '#8190b8', label: '#3c4c80',
    panel: '#f5f4ee', panelEdge: '#1d3470', cloudFill: '#f5f4ee',
    mark: 'rgba(60,80,150,0.45)', shadow: 'rgba(30,40,90,0.12)', cardTint: 'rgba(252,252,246,0.40)', cardEdge: 'rgba(29,52,112,0.45)',
    dialShadow: 'rgba(30,40,90,0.10)', figShadow: 'rgba(30,40,90,0.12)', counter: 'rgba(50,70,130,0.6)', pageBack: 'rgba(250,250,244,0.35)',
    rim: [30, 45, 100], accent: '#c2412d', accentDeep: '#9e3222',
    topo: ['#8fa7d8', '#7f9ad0', '#a3b4dc', '#8b9fd4'] },
  build(g, r, W, H) {
    paperKit.fill(g, '#eeede4');
    paperKit.mottle(g, r, 12, ['rgba(120,140,210,0.05)', 'rgba(210,200,140,0.06)', 'rgba(255,255,250,0.08)'], 200, 520);
    paperKit.grid(g, r, 60, '#8fb0dc', 0.16, 1.5, { every: 5, majorAlpha: 0.26, majorW: 1.8 });   // non-photo-blue drafting grid
    for (let i = 0; i < 7; i++) { const y = r() * H, h = (30 + r() * 90) * H / 1080, lg = g.createLinearGradient(0, y, 0, y + h);   // diazo developer streaks
      lg.addColorStop(0, 'rgba(90,110,180,0)'); lg.addColorStop(0.5, 'rgba(90,110,180,0.035)'); lg.addColorStop(1, 'rgba(90,110,180,0)');
      g.fillStyle = lg; g.fillRect(0, y, W, h); }
    paperKit.fibres(g, r, 1600, ['110,120,160', '170,170,150'], 0.03, 0.07);
    paperKit.grain(g, 11, 7);
  },
  vignette: 'rgba(40,50,90,0.12)', grain: 0.7,
  contours: { alpha: 0.10 },
  treatment: { color: ['#2a3f96', 0.8] },
});

/** blueprint: Prussian-blue cyanotype with uneven exposure, a faint white grid (8% or less, as the plan asks), fold
    creases and white fibres and specks. Linework reads best in pale cyan (PAL.bpLine); text stays near-white. */
defineGround('blueprint', {
  tone: 'dark',
  pal: { night: '#1f4d8b', night2: '#194377', nightInk: '#eef4ff', nightMuted: '#8fb0dc', nightLabel: '#c4d6f0',
    nightSoft: '#d6e3f6', nightSoft2: '#d0def3',
    nightPanel: 'rgba(24,62,114,0.94)', nightPanelEdge: 'rgba(220,235,255,0.55)', nightMark: 'rgba(210,228,255,0.45)', nightShadow: 'rgba(3,12,35,0.45)',
    nightCardTint: 'rgba(40,85,150,0.30)', nightCardEdge: 'rgba(220,235,255,0.45)', nightCounter: 'rgba(200,220,250,0.6)',
    nightFig: 'rgba(22,58,108,0.92)', nightFigEdge: 'rgba(220,235,255,0.50)', nightCurtain: '#123463', nightRim: [10, 34, 80],
    nightPageBack: 'rgba(120,170,235,0.20)',
    navyFill: '#2d5fa0', accent: '#ffd166', accentDeep: '#f0b43c', bpLine: '#9bc4d3' },
  build(g, r, W, H) {
    paperKit.fill(g, '#1f4d8b', '#194377');
    paperKit.mottle(g, r, 22, ['rgba(120,170,235,0.07)', 'rgba(5,20,55,0.12)', 'rgba(60,110,180,0.06)'], 140, 480);   // uneven exposure; also stops banding
    paperKit.grid(g, r, 60, '#dce9ff', 0.06, 1.5, { every: 5, majorAlpha: 0.08, majorW: 1.8 });
    g.save(); g.lineCap = 'butt';                                          // two fold creases: a pale ridge beside a dark valley
    for (const [x0, y0, x1, y1] of [[W / 3, 0, W / 3 + W * 0.004, H], [0, H / 2, W, H / 2 - H * 0.006]]) {
      const nx = y1 - y0, ny = x0 - x1, n = Math.hypot(nx, ny) || 1, ox = nx / n * 2, oy = ny / n * 2;
      g.strokeStyle = 'rgba(200,225,255,0.07)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - ox, y0 - oy); g.lineTo(x1 - ox, y1 - oy); g.stroke();
      g.strokeStyle = 'rgba(5,18,50,0.14)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 + ox, y0 + oy); g.lineTo(x1 + ox, y1 + oy); g.stroke(); }
    g.restore();
    paperKit.fibres(g, r, 2200, ['190,215,255', '10,30,70'], 0.02, 0.06);
    paperKit.specks(g, r, 400, '230,240,255', 0.8, 1.6, 0.05, 0.22);
    paperKit.grain(g, 12, 11);
  },
  vignette: 'rgba(4,14,40,0.45)', grain: 0.5,
  contours: { colors: ['#9bc4d3', '#c4d6f0', '#8fb0dc', '#b5cde9'], alpha: 0.09 },
  treatment: { color: ['#2d62b0', 0.72], tooth: [0.06, 0.6] },
});

definePaperSet('blueprint', { light: 'whiteprint', dark: 'blueprint' });
