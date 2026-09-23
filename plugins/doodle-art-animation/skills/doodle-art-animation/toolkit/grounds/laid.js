/* laid: the light page of the Codex set. Warm hand-made paper in the manner of Leonardo's notebooks (paper, not
   parchment): laid lines, foxing, tide rings and a strong brown vignette. The treatment is a sepia wash with a light
   paper tooth, so any subject reads as iron-gall ink and wash. Red chalk is the accent. Keep stains away from text:
   they are faint, but a story can still steer labels onto clean paper. */
defineGround('laid', {
  tone: 'light',
  pal: { paper: '#e4d0a2', stripe: 'rgba(0,0,0,0)', ink: '#35200f', inkSoft: '#553a22', muted: '#93785a', label: '#553a22',
    panel: '#eee0bd', panelEdge: '#35200f', cloudFill: '#f0e4c6', accent: '#b0472c', accentDeep: '#8e3520',
    mark: 'rgba(120,70,40,0.45)', shadow: 'rgba(70,40,15,0.16)', cardTint: 'rgba(250,240,215,0.35)', cardEdge: 'rgba(53,32,15,0.45)',
    dialShadow: 'rgba(70,40,15,0.12)', figShadow: 'rgba(70,40,15,0.14)', counter: 'rgba(90,60,35,0.65)', rim: [80, 45, 20], pageBack: 'rgba(250,238,210,0.35)' },
  vignette: 'rgba(90,45,10,0.38)', grain: 0.8,
  contours: { colors: ['#a8452c', '#7a6a40', '#a8452c', '#6a5030'], alpha: 0.12 },
  treatment: { tooth: [0.08, 0.5], filter: 'sepia(0.45) saturate(0.8)' },
  sfx: { header: 'scratch' },
  build(g, rand, W, H) {
    paperKit.fill(g, '#e4d0a2');
    paperKit.mottle(g, rand, 16, ['rgba(140,90,40,0.07)', 'rgba(250,235,200,0.10)', 'rgba(120,80,30,0.05)'], 160, 520);
    for (let i = 0, N = Math.round(26 * paperKit.area(g)); i < N; i++) {  // foxing: small rust spots
      const x = rand() * W, y = rand() * H, R = 3 + rand() * 16, rg = g.createRadialGradient(x, y, 0, x, y, R);
      rg.addColorStop(0, 'rgba(150,80,30,0.22)'); rg.addColorStop(1, 'rgba(150,80,30,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); }
    g.save(); g.strokeStyle = 'rgba(140,90,40,0.10)'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const x = rand() * W, y = rand() * H, R = 90 + rand() * 140; g.beginPath(); g.ellipse(x, y, R, R * (0.8 + rand() * 0.3), rand(), 0, TAU); g.stroke(); }   // tide rings
    g.strokeStyle = 'rgba(120,80,40,0.10)'; g.lineWidth = 1.5;               // laid lines of the paper mould, 1.5 px so they survive re-encoding
    for (let y = 40; y < H; y += 32 + rand() * 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (rand() - .5) * 3); g.stroke(); }
    g.restore();
    paperKit.fibres(g, rand, 2600, ['110,70,30', '180,140,90'], 0.04, 0.09);
    paperKit.grain(g, 16, 10, { mono: false });
  },
});
definePaperSet('codex', { light: 'laid', dark: 'staratlas' });
