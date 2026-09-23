/* sketchbook: the dark page of the Toned set. Warm black sketchbook paper with white and gold gel pen. The treatment
   takes a fifth of the saturation out of the scene, so fills read as gel ink on paper rather than glowing colour, and
   the warm black and gold ink set it apart from the notebook's night paper. */
defineGround('sketchbook', {
  tone: 'dark',
  pal: { night: '#1d1b19', night2: '#191715', nightInk: '#f2ede3', nightMuted: '#8f887c', nightLabel: '#c0b8aa',
    nightSoft: '#dad3c6', nightSoft2: '#d3ccbf', nightPanel: 'rgba(40,37,33,0.94)', nightPanelEdge: 'rgba(240,232,215,0.45)',
    nightFig: 'rgba(36,33,30,0.94)', nightFigEdge: 'rgba(240,232,215,0.40)', nightMark: 'rgba(220,210,190,0.30)',
    nightShadow: 'rgba(0,0,0,0.5)', nightCardTint: 'rgba(70,64,56,0.30)', nightCardEdge: 'rgba(240,232,215,0.40)',
    nightCounter: 'rgba(210,200,185,0.6)', nightCurtain: '#100f0e', nightRim: [24, 22, 20], nightPageBack: 'rgba(180,170,150,0.18)',
    navyFill: '#34405e', accent: '#e0b04a' },   // accent: gold gel pen
  vignette: 'rgba(0,0,0,0.5)', grain: 0.5,
  contours: { colors: ['#8a7a5a', '#5a7a7a', '#9a8a4a', '#6a6a8a'], alpha: 0.10 },
  treatment: { color: ['#808080', 0.2] },
  sfx: { header: 'scratch' },
  build(g, rand, W, H) {
    paperKit.fill(g, '#1d1b19', '#191715');
    paperKit.mottle(g, rand, 10, ['rgba(120,110,90,0.04)', 'rgba(0,0,0,0.12)'], 250, 560);
    paperKit.fibres(g, rand, 3000, ['150,140,120', '60,55,48'], 0.03, 0.08);
    paperKit.grain(g, 10, 13);
  },
});
