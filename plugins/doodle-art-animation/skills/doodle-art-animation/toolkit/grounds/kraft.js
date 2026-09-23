/* kraft: the light page of the Toned set. Tan wrapping paper with dense dark and light fibres, black ink and white
   highlights. White is for highlights only (2.2:1 on kraft), never for text. The vermilion fails here (1.6:1), so the
   accent is a dark red (3.8:1). For text-heavy plates the lighter 'tan' paper below is the safer page. */
const KRAFT_PAL = { stripe: 'rgba(0,0,0,0)', ink: '#17110c', inkSoft: '#35271a', muted: '#6d5840', label: '#33261a',
  panel: '#e6d7b8', panelEdge: '#22180f', cloudFill: '#f3ead6', accent: '#8e2216', accentDeep: '#6e190f',
  mark: 'rgba(60,40,20,0.45)', shadow: 'rgba(40,25,10,0.18)', cardTint: 'rgba(245,235,210,0.30)', cardEdge: 'rgba(34,24,15,0.5)',
  dialShadow: 'rgba(40,25,10,0.14)', figShadow: 'rgba(40,25,10,0.16)', counter: 'rgba(50,35,20,0.65)', rim: [60, 40, 20], pageBack: 'rgba(245,235,210,0.3)' };
const kraftBuild = (base, dense) => function (g, rand, W, H) {
  paperKit.fill(g, base);
  paperKit.mottle(g, rand, 14, ['rgba(90,60,25,0.07)', 'rgba(230,205,160,0.08)'], 200, 520);
  paperKit.fibres(g, rand, 5200 * dense, ['70,45,20', '120,85,45', '215,190,150'], 0.05, 0.16, 3, 16, 0.5, 1.3);
  paperKit.specks(g, rand, 700 * dense, '50,30,12', 0.6, 1.6, 0.1, 0.4);
  paperKit.grain(g, 18, 9, { mono: false });
};
defineGround('kraft', {
  tone: 'light',
  pal: { ...KRAFT_PAL, paper: '#c6a676' },
  vignette: 'rgba(60,35,10,0.22)', grain: 0.8,
  contours: { colors: ['#8a5a3a', '#4d6d6a', '#9a7a30', '#5a5a80'], alpha: 0.14 },
  treatment: { tooth: [0.1, 0.55], color: ['#808080', 0.15] },
  sfx: { header: 'scratch' },
  build: kraftBuild('#c6a676', 1),
});
/* tan: a lighter toned paper (9.8:1 for the ink) with fewer fibres, for plates with a lot of text */
defineGround('tan', {
  tone: 'light',
  pal: { ...KRAFT_PAL, paper: '#cdb996', accent: '#9a2618', accentDeep: '#7a1d12' },
  vignette: 'rgba(60,35,10,0.18)', grain: 0.8,
  contours: { colors: ['#8a5a3a', '#4d6d6a', '#9a7a30', '#5a5a80'], alpha: 0.14 },
  treatment: { tooth: [0.08, 0.5], color: ['#808080', 0.12] },
  sfx: { header: 'scratch' },
  build: kraftBuild('#cdb996', 0.6),
});
definePaperSet('toned', { light: 'kraft', dark: 'sketchbook' });
