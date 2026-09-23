/* staratlas: the dark page of the Codex set. Deep navy with about 1,400 stars sized by magnitude, a faint band of the
   Milky Way and, in place of the topographic loops, a curved coordinate net (declination arcs and hour lines) that
   turns slowly. Gold-cream ink sets it apart from the notebook's night paper. */
defineGround('staratlas', {
  tone: 'dark',
  pal: { night: '#0f1d3d', night2: '#0b1631', nightInk: '#efe3bd', nightMuted: '#9c8f66', nightLabel: '#cdbf92',
    nightSoft: '#ddd0a6', nightSoft2: '#d6c99e', nightPanel: 'rgba(16,31,64,0.94)', nightPanelEdge: 'rgba(222,196,120,0.5)',
    nightFig: 'rgba(14,28,60,0.94)', nightFigEdge: 'rgba(222,196,120,0.45)', nightMark: 'rgba(222,196,120,0.40)',
    nightShadow: 'rgba(0,3,12,0.5)', nightCardTint: 'rgba(30,50,95,0.30)', nightCardEdge: 'rgba(222,196,120,0.45)',
    nightCounter: 'rgba(222,200,140,0.6)', nightCurtain: '#081229', nightRim: [10, 18, 40], nightPageBack: 'rgba(120,140,190,0.22)',
    accent: '#e8a13a' },   // accent: a warm amber, 7.6:1 on the navy; the vermilion (4.6:1) fights the gold ink
  vignette: 'rgba(2,6,20,0.5)', grain: 0.5,
  treatment: { color: ['#808080', 0.3] },   // colours a third less saturated (a grey 'color' blend; cheaper than a CSS filter)
  sfx: { header: 'readout' },
  /** the coordinate net: declination arcs around a pole below the frame, hour lines turning slowly about it */
  contours(t) {
    const cy = H * 1.9, cx = W * 0.5, top = cy - H * 1.05, rot = t * 0.004;
    ctx.save(); ctx.strokeStyle = 'rgba(222,196,120,0.13)'; ctx.lineWidth = 1.5;
    for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.arc(cx, cy, top + k * (H * 0.9) / 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    const step = 0.09 * 1080 / H;                                        // about the same spacing on screen in portrait
    for (let k = -Math.ceil(0.75 / step); k <= Math.ceil(0.75 / step); k++) { const a = -Math.PI / 2 + k * step + rot;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (cy - H - 60), cy + Math.sin(a) * (cy - H - 60)); ctx.lineTo(cx + Math.cos(a) * (cy + 60), cy + Math.sin(a) * (cy + 60)); ctx.stroke(); }
    ctx.restore();
  },
  build(g, rand, W, H) {
    paperKit.fill(g, '#0f1d3d', '#0b1631');
    paperKit.mottle(g, rand, 10, ['rgba(80,110,180,0.05)', 'rgba(0,0,10,0.15)'], 250, 600);
    g.save(); g.translate(W / 2, H / 2); g.rotate(-0.35);                 // a faint band of the Milky Way
    const span = Math.hypot(W, H);
    for (let i = 0; i < 40; i++) { const x = (rand() - .5) * span, y = (rand() - .5) * 180, R = 60 + rand() * 140, rg = g.createRadialGradient(x, y, 0, x, y, R);
      rg.addColorStop(0, 'rgba(170,185,230,0.035)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - R, y - R, 2 * R, 2 * R); }
    g.restore();
    for (let i = 0, N = Math.round(1400 * paperKit.area(g)); i < N; i++) { const m = rand() ** 3;   // stars: few bright, many faint
      g.fillStyle = `rgba(${rand() < .2 ? '255,236,200' : '225,230,255'},${(0.15 + m * 0.7).toFixed(3)})`; g.beginPath(); g.arc(rand() * W, rand() * H, 0.8 + m * 1.9, 0, TAU); g.fill(); }
    paperKit.grain(g, 8, 14);
  },
});
