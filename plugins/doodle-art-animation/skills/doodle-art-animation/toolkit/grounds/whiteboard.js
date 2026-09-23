/* whiteboard: the light page of the Chalk set. Cool white melamine with a soft gloss band and faint ghosts of erased
   marker. No treatment: marker on a whiteboard keeps its colours. Green marker (#2e8b57) is 4.0:1, so it is for lines,
   not small text. */
defineGround('whiteboard', {
  tone: 'light',
  pal: { paper: '#f5f6f4', stripe: 'rgba(0,0,0,0)', ink: '#1b1f25', inkSoft: '#39414c', muted: '#8a939e', label: '#48505b',
    panel: '#ffffff', panelEdge: '#1b1f25', cloudFill: '#ffffff', accent: '#d0342c', accentDeep: '#a82820',
    mark: 'rgba(90,100,120,0.35)', shadow: 'rgba(20,30,40,0.10)', cardTint: 'rgba(255,255,255,0.5)', cardEdge: 'rgba(27,31,37,0.4)',
    dialShadow: 'rgba(20,30,40,0.08)', figShadow: 'rgba(20,30,40,0.10)', counter: 'rgba(70,80,95,0.6)', pageBack: 'rgba(255,255,255,0.4)' },
  vignette: 'rgba(30,40,50,0.10)', grain: 0.5, contours: false,
  sfx: { header: 'scratch' },   // a marker squeak belongs to the sound build; the pen scratch stands in until then
  build(g, rand, W, H) {
    paperKit.fill(g, '#f5f6f4');
    const sh = g.createLinearGradient(0, 0, W, H);                       // the gloss: one soft diagonal band of light
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.42, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    sh.addColorStop(0.58, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
    paperKit.mottle(g, rand, 8, ['rgba(120,140,160,0.035)'], 200, 500);
    const k = Math.sqrt(paperKit.area(g));
    for (let i = 0; i < 9; i++) paperKit.swirl(g, rand, rand() * W, rand() * H, (160 + rand() * 200) * k, `rgba(${rand() < .3 ? '60,90,160' : '70,75,85'},0.012)`, 26, 34);   // erased marker
    g.lineCap = 'round';
    for (let i = 0, N = Math.round(30 * paperKit.area(g)); i < N; i++) {                          // a few strokes the eraser missed
      g.strokeStyle = `rgba(80,90,110,${(0.03 + rand() * 0.03).toFixed(3)})`; g.lineWidth = 3 + rand() * 4; const x = rand() * W, y = rand() * H;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 40, y - 20 * rand(), x + 90, y + 20 * rand(), x + 60 + 120 * rand(), y + (rand() - .5) * 30); g.stroke(); }
    paperKit.grain(g, 6, 8);
  },
});
definePaperSet('chalk', { light: 'whiteboard', dark: 'chalkboard' });
