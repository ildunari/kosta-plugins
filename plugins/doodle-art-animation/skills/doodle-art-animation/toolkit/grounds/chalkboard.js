/* chalkboard: the dark page of the Chalk set. Slate green with eraser smears, ghosts of old formulas and chalk dust.
   Its treatment is a chalk lift. Chalk can only add light to a board, so a navy fill drawn on it would otherwise stay a
   dark hole. The lift measures how far each drawn pixel is from the board (a 'difference' blend of the plate's layer
   with the bare board), punches the board's tooth through that, and adds it back onto the board. The board stays as
   it was, pale ink comes out as chalk white, and dark fills come out as pale chalk of their own hue. */
defineGround('chalkboard', {
  tone: 'dark',
  pal: { night: '#2a3831', night2: '#243029', nightInk: '#efefe6', nightMuted: '#9aa89f', nightLabel: '#c6cfc7',
    nightSoft: '#d8ded5', nightSoft2: '#d2d9cf', nightPanel: 'rgba(38,52,45,0.94)', nightPanelEdge: 'rgba(235,238,228,0.5)',
    nightFig: 'rgba(36,50,43,0.94)', nightFigEdge: 'rgba(235,238,228,0.45)', nightMark: 'rgba(225,230,220,0.35)',
    nightShadow: 'rgba(0,5,3,0.45)', nightCardTint: 'rgba(60,78,68,0.30)', nightCardEdge: 'rgba(235,238,228,0.45)',
    nightCounter: 'rgba(210,218,208,0.6)', nightCurtain: '#1c2621', nightRim: [20, 28, 24], nightPageBack: 'rgba(200,215,205,0.18)',
    navyFill: '#3c5a8a', accent: '#f4a259' },   // accent: orange chalk (the vermilion is 3.4:1 here, orange 5.9:1)
  vignette: 'rgba(5,10,8,0.5)', grain: 0.5, contours: false,
  sfx: { header: 'scratch' },   // a chalk tap belongs to the sound build; the pen scratch stands in until then
  build(g, rand, W, H) {
    paperKit.fill(g, '#2a3831', '#243029');
    paperKit.mottle(g, rand, 14, ['rgba(200,215,205,0.035)', 'rgba(0,10,5,0.10)'], 200, 520);   // mottles also stop banding
    const k = Math.sqrt(paperKit.area(g));
    for (let i = 0; i < 12; i++) paperKit.swirl(g, rand, rand() * W, rand() * H, (180 + rand() * 240) * k, 'rgba(225,232,222,0.010)', 34, 40);   // eraser smears
    g.save(); g.font = 'italic 40px Georgia, serif';                     // ghosts of old writing, about 2% strong
    const words = ['dx/dt', 'x²', 'k·t', 'ΔG', 'π r²', 'n = 3', '→', 'Σ'];
    for (let i = 0, N = Math.round(26 * paperKit.area(g)); i < N; i++) { g.fillStyle = `rgba(230,235,225,${(0.018 + rand() * 0.02).toFixed(3)})`;
      g.setTransform(1, 0, 0, 1, rand() * W, rand() * H); g.rotate((rand() - .5) * 0.2); g.fillText(words[i % words.length], 0, 0); }
    g.restore();
    paperKit.specks(g, rand, 1600, '235,238,230', 0.6, 1.6, 0.04, 0.18);   // chalk dust
    paperKit.grain(g, 14, 12);
  },
  treatment(g2d, gr, { base, raw }) {
    const c = g2d.canvas, s = treatScratch(c), sg = s.getContext('2d');
    sg.save(); sg.globalCompositeOperation = 'difference'; sg.setTransform(base); sg.drawImage(raw, 0, 0); sg.restore();   // s: |plate − board|
    const pat = holePattern(0.24); pat.setTransform(base.multiply(new DOMMatrix([2, 0, 0, 2, 0, 0])));
    sg.save(); sg.globalCompositeOperation = 'destination-out'; sg.globalAlpha = 0.8; sg.fillStyle = pat; sg.fillRect(0, 0, s.width, s.height); sg.restore();   // the board's tooth
    g2d.setTransform(base); g2d.beginPath(); g2d.rect(0, 0, raw.width, raw.height); g2d.clip();
    g2d.drawImage(raw, 0, 0); g2d.setTransform(1, 0, 0, 1, 0, 0);          // the bare board
    g2d.globalCompositeOperation = 'lighter'; g2d.filter = 'saturate(0.7) brightness(1.35)'; g2d.drawImage(s, 0, 0);   // the chalk, lifted
    g2d.filter = 'none'; g2d.globalCompositeOperation = 'source-over';
  },
});
