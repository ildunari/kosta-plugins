/* =====================  Lab set · graph paper (light) + fluorescence (dark)  =====================
   For cell and molecular stories: a lab notebook outside, the microscope inside. Graph paper takes no treatment
   (lab notebooks are drawn in colour); fluorescence raises saturation and adds a soft bloom, so fills glow the way
   stained cells do. The bloom is the one treatment with a measurable price: about 30 ms a frame on its plates.

   Also here, as single papers a plate can name (plate.paper = 'semilog'): graphgreen (the green engineering
   computation pad), dotgrid (bullet journal), hexpaper (benzene-ring paper for chemistry) and semilog (for release and
   clearance curves). Each replaces the light page of the story's set for that plate. The 'engineering' set pairs the
   green pad with fluorescence.

   FLUOR holds the colour-blind-safe channel colours for fluorescence plates: magenta with green or cyan, never red with
   green, and DAPI lifted to a blue that reads on black. They are also PAL.pink / mint / cyan / navyFill on those plates. */
var FLUOR = globalThis.FLUOR || { dapi: '#4f7bff', magenta: '#ff4df0', green: '#3dff7a', cyan: '#33e1ff', gold: '#ffd24a' };
globalThis.FLUOR = FLUOR;

/** the palette the graph-style papers share; each overrides its paper colour and a few lines */
const LAB_LIGHT_PAL = { stripe: 'rgba(0,0,0,0)', ink: '#1a2130', inkSoft: '#3b4556', muted: '#7c8796', label: '#465063',
  panel: '#f8f7f1', panelEdge: '#233044', cloudFill: '#f8f7f1',
  mark: 'rgba(70,120,130,0.45)', shadow: 'rgba(30,50,60,0.12)', cardTint: 'rgba(255,255,252,0.45)', cardEdge: 'rgba(35,48,68,0.42)',
  dialShadow: 'rgba(30,50,60,0.10)', figShadow: 'rgba(30,50,60,0.12)', counter: 'rgba(60,80,95,0.6)', rim: [30, 40, 55],
  accent: '#c8452a', accentDeep: '#a33820' };
const labMargin = (g, H) => { g.save(); g.strokeStyle = 'rgba(214,92,92,0.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(58, 0); g.lineTo(58, H); g.stroke(); g.restore(); };
const labPaper = (g, r, col) => { paperKit.fill(g, col); paperKit.mottle(g, r, 8, ['rgba(255,255,250,0.10)', 'rgba(90,110,100,0.035)'], 260, 600); };
const labFinish = (g, r, seed) => { paperKit.fibres(g, r, 1400, ['120,120,110', '170,170,160'], 0.03, 0.07); paperKit.grain(g, 10, seed); };

/** graph: warm white with a teal 30 px grid, a heavier line every 150 px, and a red lab-book margin rule behind the dial */
defineGround('graph', {
  tone: 'light',
  pal: { ...LAB_LIGHT_PAL, paper: '#f1efe6' },
  build(g, r, W, H) {
    labPaper(g, r, '#f1efe6');
    paperKit.grid(g, r, 30, '#5f9ea8', 0.24, 1.5, { every: 5, majorAlpha: 0.40, majorW: 1.8 });
    labMargin(g, H); labFinish(g, r, 5);
  },
  vignette: 'rgba(40,60,70,0.12)', grain: 0.7, contours: false, sfx: { header: 'scratch' },
});

/** graphgreen: the engineering computation pad, pale green with a green grid */
defineGround('graphgreen', {
  tone: 'light',
  pal: { ...LAB_LIGHT_PAL, paper: '#e3ecd6', panel: '#eef3e6', cloudFill: '#eef3e6', mark: 'rgba(90,140,90,0.45)' },
  build(g, r, W, H) {
    labPaper(g, r, '#e3ecd6');
    paperKit.grid(g, r, 30, '#8fbf8a', 0.45, 1.5, { every: 5, majorAlpha: 0.7, majorW: 1.8 });
    labFinish(g, r, 6);
  },
  vignette: 'rgba(40,70,40,0.12)', grain: 0.7, contours: false, sfx: { header: 'scratch' },
});

/** dotgrid: bullet-journal paper, a dot every 30 px */
defineGround('dotgrid', {
  tone: 'light',
  pal: { ...LAB_LIGHT_PAL, paper: '#f6f4ee', ink: '#1c1c20', inkSoft: '#3f3f46', muted: '#85858c', label: '#4b4b53', panel: '#fbfaf6',
    panelEdge: '#26262c', cloudFill: '#fbfaf6', mark: 'rgba(120,120,130,0.4)', cardEdge: 'rgba(38,38,44,0.4)', counter: 'rgba(80,80,90,0.6)' },
  build(g, r, W, H) {
    paperKit.fill(g, '#f6f4ee'); paperKit.mottle(g, r, 6, ['rgba(255,255,255,0.10)', 'rgba(80,70,60,0.03)'], 300, 600);
    for (let x = 15; x < W; x += 30) for (let y = 15; y < H; y += 30) {
      g.fillStyle = `rgba(110,110,118,${(0.38 + r() * 0.14).toFixed(3)})`; g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill(); }
    paperKit.fibres(g, r, 900, ['120,120,120', '170,170,170'], 0.03, 0.06); paperKit.grain(g, 9, 6);
  },
  vignette: 'rgba(40,40,40,0.10)', grain: 0.7, contours: false, sfx: { header: 'scratch' },
});

/** hexpaper: organic-chemistry paper, a lattice of flat-topped hexagons (36 px sides) */
defineGround('hexpaper', {
  tone: 'light',
  pal: { ...LAB_LIGHT_PAL, paper: '#f2f0e8' },
  build(g, r, W, H) {
    labPaper(g, r, '#f2f0e8');
    const s = 36, dx = s * 1.5, dy = s * Math.sqrt(3);
    g.save(); g.strokeStyle = '#6f9aa8'; g.lineWidth = 1.5;
    for (let i = -1, cx = 0; cx < W + s; i++, cx = i * dx) for (let cy = (i & 1) ? dy / 2 : 0; cy < H + dy; cy += dy) {
      g.globalAlpha = 0.22 * (0.85 + 0.3 * r()); g.beginPath();
      for (let k = 0; k <= 6; k++) { const a = k * Math.PI / 3; g[k ? 'lineTo' : 'moveTo'](cx + s * Math.cos(a), cy + s * Math.sin(a)); }
      g.stroke(); }
    g.restore(); labFinish(g, r, 8);
  },
  vignette: 'rgba(40,60,70,0.12)', grain: 0.7, contours: false, sfx: { header: 'scratch' },
});

/** semilog: linear across, three log decades up; the decade lines are heavier */
defineGround('semilog', {
  tone: 'light',
  pal: { ...LAB_LIGHT_PAL, paper: '#f1efe6' },
  build(g, r, W, H) {
    labPaper(g, r, '#f1efe6');
    g.save(); g.strokeStyle = '#5f9ea8';
    const line = (x0, y0, x1, y1, a, w) => { g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    for (let x = 0, i = 0; x <= W; x += 40, i++) line(x, 0, x, H, i % 5 ? 0.22 : 0.40, i % 5 ? 1.5 : 1.8);
    const dec = H / 3, ticks = [];                                          // each decade: lines at 1..9, skipping ones that would sit closer than 30 px
    for (let d = 0; d < 3; d++) for (let k = 1; k < 10; k++) ticks.push([H - d * dec - Math.log10(k) * dec, k === 1]);
    let last = Infinity;
    for (const [y, major] of ticks) { if (!major && Math.abs(last - y) < 30) continue; line(0, y, W, y, major ? 0.42 : 0.22, major ? 1.8 : 1.5); last = y; }
    g.restore(); labMargin(g, H); labFinish(g, r, 9);
  },
  vignette: 'rgba(40,60,70,0.12)', grain: 0.7, contours: false, sfx: { header: 'scratch' },
});

/** fluorescence: near-black (never pure #000, to avoid halation on phones) with faint out-of-focus coloured glows */
defineGround('fluorescence', {
  tone: 'dark',
  pal: { night: '#07080b', night2: '#050609', nightInk: '#e6eeff', nightMuted: '#6f7a90', nightLabel: '#aeb8cc', nightSoft: '#c8d1e2', nightSoft2: '#c2cbdc',
    nightPanel: 'rgba(14,16,22,0.94)', nightPanelEdge: 'rgba(170,190,230,0.45)', nightMark: 'rgba(150,170,210,0.30)', nightShadow: 'rgba(0,0,0,0.5)',
    nightCardTint: 'rgba(30,34,46,0.30)', nightCardEdge: 'rgba(170,190,230,0.40)', nightCounter: 'rgba(160,175,205,0.6)',
    nightFig: 'rgba(14,16,22,0.92)', nightFigEdge: 'rgba(170,190,230,0.45)', nightCurtain: '#040507', nightRim: [10, 12, 20],
    nightPageBack: 'rgba(60,70,100,0.20)',
    navyFill: FLUOR.dapi, pink: FLUOR.magenta, mint: FLUOR.green, cyan: FLUOR.cyan, gold: FLUOR.gold, accent: '#ff7a45', accentDeep: '#e5602c' },
  build(g, r, W, H) {
    paperKit.fill(g, '#07080b', '#050609');
    const k = Math.sqrt(W * H / (1920 * 1080));
    for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, R = (40 + r() * 170) * k, rg = g.createRadialGradient(x, y, 0, x, y, R), c = ['79,123,255', '61,255,122', '255,77,240'][i % 3];
      rg.addColorStop(0, `rgba(${c},${(0.025 + r() * 0.03).toFixed(3)})`); rg.addColorStop(1, `rgba(${c},0)`); g.fillStyle = rg; g.fillRect(x - R, y - R, 2 * R, 2 * R); }
    paperKit.mottle(g, r, 10, ['rgba(40,50,70,0.05)', 'rgba(0,0,0,0.10)'], 250, 560);   // stops the near-black gradient banding
    paperKit.specks(g, r, 300, '160,190,255', 0.8, 1.4, 0.05, 0.22);
    paperKit.grain(g, 9, 15, { mono: false });
  },
  vignette: 'rgba(0,0,0,0.62)', grain: 0.5, contours: false,
  treatment: { filter: 'saturate(1.35)', glow: [8, 0.6] },
  sfx: { header: 'readout' },
});

definePaperSet('lab', { light: 'graph', dark: 'fluorescence' });
definePaperSet('engineering', { light: 'graphgreen', dark: 'fluorescence' });
