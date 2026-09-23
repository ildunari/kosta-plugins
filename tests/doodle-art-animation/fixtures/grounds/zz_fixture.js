/* regression_test.py: a paper set whose two papers use every treatment kind, so the treatment layer, the per-plate
   palette and transitions between papers are exercised before real papers exist. Not shipped. */
defineGround('fixprint', { tone: 'dark',
  pal: { night: '#15407f', night2: '#1b4a8c', nightInk: '#eef3ff', nightLabel: '#c3d3f2', accent: '#f2c14e' },
  build(g, rand) { paperKit.fill(g, '#15407f', '#0f3470'); paperKit.mottle(g, rand, 40, ['rgba(255,255,255,0.03)', 'rgba(0,0,20,0.05)'], 80, 260);
    paperKit.grid(g, rand, 48, '#cfe0ff', 0.10, 1.5); paperKit.grain(g, 10, 7); },
  vignette: 'rgba(4,14,40,0.45)', treatment: { tooth: [0.06, 0.6], color: ['#2d62b0', 0.5], glow: [6, 0.3] } });
defineGround('fixkraft', { tone: 'light', pal: { paper: '#c9a57a', ink: '#1d140d', label: '#3e2c1c', accent: '#8a2f12' },
  build(g, rand) { paperKit.fill(g, '#cfa97c'); paperKit.fibres(g, rand, 4000, ['90,60,30', '240,220,190']); paperKit.grain(g, 12, 9); },
  treatment: { filter: 'sepia(0.3)' }, sfx: { header: 'readout' } });
definePaperSet('fixture', { light: 'fixkraft', dark: 'fixprint' });
