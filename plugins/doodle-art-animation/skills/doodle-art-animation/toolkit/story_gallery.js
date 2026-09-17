/* =====================  STORY: Component Gallery  ·  visual test of toolkit/kits  ===================== */
/* One plate per kit, every component drawing on and then idling, each labelled with its call. This is a specimen
   sheet for checking the kits, not a model for a film's composition: a real film uses a few components inside a
   scene built for its topic. Build: python3 build.py story_gallery.js gallery.html */
const DUR = 6;
/** draw-on for the k-th component on a plate: staggered, eased */
const DR = (t, k) => E.inOut2(inv(0.35 + k * 0.28, 1.9 + k * 0.28, t));
/** a FIG caption that types on after its component */
const FIG = (t, k, name, x, y, dark = false, o = {}) => KIT.caption(t - 1.2 - k * 0.28, `FIG. ${k + 1}  ·  ${name}`, x, y, { dark, ...o });
const header = (num, title, sub) => ({ num, title, sub });
/** a slow hand-held float, so the specimen sheet never sits dead still */
const FLOAT = k => t => ({ x: W / 2, y: H / 2, s: 1.02 + 0.02 * E.inOutSine(clamp(t / DUR)), dx: 24 * Math.sin(t * 1.0 + k), dy: 14 * Math.sin(t * 0.8 + k * 2) });

const EARTH = {
  dur: DUR, cam: FLOAT(1), header: header(1, 'Earth kit', 'sea, coast, mountains, forest, strata, weather'),
  draw(t) {
    KIT.earth.forest(t, { x: 70, y: 490, w: 600, h: 170, n: 8, draw: DR(t, 0), seed: 3 });
    KIT.earth.weather(t, { x: 700, y: 80, w: 340, h: 410, kind: 'rain', n: 34, draw: DR(t, 1), seed: 4 });
    KIT.earth.mountains(t, { x: 1080, y: 80, w: 780, h: 410, n: 3, draw: DR(t, 2), seed: 5 });
    KIT.earth.sea(t, { x: 70, y: 610, w: 560, h: 350, glint: 390, draw: DR(t, 3), seed: 6 });
    KIT.earth.coast(t, { x: 680, y: 580, w: 520, h: 380, draw: DR(t, 4), seed: 7 });
    KIT.earth.strata(t, { x: 1260, y: 600, w: 600, h: 360, draw: DR(t, 5), seed: 8 });
    [['earth.forest', 70, 530], ['earth.weather  rain', 700, 530], ['earth.mountains', 1080, 530],
      ['earth.sea', 70, 998], ['earth.coast', 680, 998], ['earth.strata', 1260, 998]].forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

const TECH = {
  dur: DUR, cam: FLOAT(2), enter: { type: 'wipe', dur: 0.8 }, header: header(2, 'Tech kit', 'terminal, code, browser, rack, circuit, cursor'),
  draw(t) {
    KIT.tech.browser(t, { x: 70, y: 290, w: 620, h: 560, draw: DR(t, 0), seed: 11 });
    KIT.tech.terminal(t, { x: 760, y: 70, w: 520, h: 320, draw: DR(t, 1), seed: 12, t0: 1.2,
      lines: ['$ npm run build', '  bundling 6 kits…', '✓ gallery.html  412 KB', '$ node render.mjs gallery.html --sheet 1', '  wrote 36 stills', '$ git status'] });
    KIT.tech.code(t, { x: 760, y: 470, w: 520, size: 18, draw: DR(t, 2), seed: 13, t0: 1.4 });
    KIT.tech.circuit(t, { x: 1340, y: 70, w: 520, h: 330, draw: DR(t, 3), seed: 14 });
    KIT.tech.rack(t, { x: 1600, y: 960, s: 1.1, units: 8, draw: DR(t, 4), seed: 15 });
    KIT.tech.cursor(t, { x: 0, y: 0, path: [[165, 555], [380, 700], [560, 440], [240, 700]], period: 1.2, draw: DR(t, 5), seed: 16 });
    [['tech.browser  + tech.cursor', 70, 888], ['tech.terminal', 760, 426], ['tech.code', 760, 790], ['tech.circuit', 1340, 438], ['tech.rack', 1480, 1000]]
      .forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

const AI = {
  dur: DUR, cam: FLOAT(3), dark: true, enter: { type: 'hatch', dur: 0.8 }, header: header(3, 'AI kit', 'network, agent, chat, tokens, attention, motes'),
  draw(t) {
    KIT.ai.motes(t, { x: -40, y: -40, w: W + 80, h: H + 80, n: 240, draw: DR(t, 0) * 1.5, seed: 20 });
    KIT.ai.network(t, { x: 800, y: 80, w: 480, h: 300, layers: [3, 5, 5, 2], speed: 1.4, draw: DR(t, 0), seed: 21, labels: ['in', 'hidden', 'hidden', 'out'] });
    KIT.ai.agent(t, { x: 230, y: 640, R: 290, tools: ['search', 'code', 'files', { name: 'db', icon: 'db' }], draw: DR(t, 1), seed: 22 });
    KIT.ai.chat(t, { x: 780, y: 500, w: 500, draw: DR(t, 2), seed: 23, t0: 1.2 });
    KIT.ai.tokens(t, { x: 1380, y: 100, w: 480, draw: DR(t, 3), seed: 24, t0: 1.4 });
    KIT.ai.attention(t, { x: 1370, y: 760, w: 500, words: ['the', 'agent', 'read', 'it', 'then', 'wrote'], draw: DR(t, 4), seed: 25 });
    [['ai.network', 800, 460], ['ai.agent', 70, 900], ['ai.chat', 780, 960], ['ai.tokens', 1380, 330], ['ai.attention', 1370, 870], ['ai.motes  (the backdrop)', 70, 300]]
      .forEach(([s, x, y], k) => FIG(t, k, s, x, y, true));
  },
};

const SPACE = {
  dur: DUR, cam: FLOAT(4), dark: true, enter: { type: 'cut' }, header: header(4, 'Space kit', 'stars, planet, orbits, comet, telescope'),
  draw(t) {
    KIT.space.stars(t, { x: -40, y: -40, w: W + 80, h: H + 80, n: 520, drift: 30, draw: DR(t, 0) * 1.4, seed: 31 });
    KIT.space.planet(t, { x: 1420, y: 330, r: 118, draw: DR(t, 1), seed: 32 });
    KIT.space.orbits(t, { x: 470, y: 690, radii: [90, 155, 225], draw: DR(t, 2), seed: 33 });
    KIT.space.comet(t, { x: 1080, y: 700, len: 320, ang: -2.55, draw: DR(t, 3), seed: 34 });
    KIT.space.telescope(t, { x: 1700, y: 990, flip: true, aim: -0.55, draw: DR(t, 4), seed: 35 });
    [['space.stars  (the whole backdrop)', 90, 300], ['space.planet', 1320, 560], ['space.orbits', 350, 900], ['space.comet', 1010, 820], ['space.telescope', 1330, 1030]]
      .forEach(([s, x, y], k) => FIG(t, k, s, x, y, true));
  },
};

const LAB = {
  dur: DUR, cam: FLOAT(5), enter: { type: 'wipe', dur: 0.8, dir: 'rl' }, header: header(5, 'Lab kit', 'flask, cell, molecule, microscope, pipette'),
  draw(t) {
    KIT.lab.cell(t, { x: 350, y: 470, r: 160, draw: DR(t, 0), seed: 41 });
    KIT.lab.molecule(t, { x: 960, y: 420, preset: 'ethanol', unit: 78, spin: 0.9, draw: DR(t, 1), seed: 42 });
    KIT.lab.pipette(t, { x: 1600, y: 330, fall: 170, draw: DR(t, 2), seed: 43 });
    KIT.lab.flask(t, { x: 130, y: 1000, s: 0.95, kind: 'beaker', draw: DR(t, 3), seed: 44 });
    KIT.lab.flask(t, { x: 340, y: 1000, s: 0.95, kind: 'flask', fill: PAL.mint, level: 0.4, draw: DR(t, 3.3), seed: 45 });
    KIT.lab.flask(t, { x: 540, y: 1000, s: 0.95, kind: 'tube', fill: PAL.pink, level: 0.6, steam: true, draw: DR(t, 3.6), seed: 46 });
    KIT.lab.microscope(t, { x: 980, y: 1000, s: 0.9, draw: DR(t, 4), seed: 47 });
    KIT.lab.molecule(t, { x: 1600, y: 820, preset: 'benzene', unit: 48, labels: false, spin: 0.45, draw: DR(t, 4.5), seed: 48 });
    [['lab.cell', 200, 675], ['lab.molecule  ethanol', 800, 675], ['lab.pipette', 1480, 600], ['lab.flask  beaker · flask · tube', 60, 1040],
      ['lab.microscope', 880, 1040], ['lab.molecule  benzene', 1450, 990]].forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

const STUDIO = {
  dur: DUR, cam: FLOAT(6), enter: { type: 'page', dur: 1.1 }, header: header(6, 'Studio kit', 'easel, brush, swatches, wireframe, penTool'),
  draw(t) {
    KIT.studio.easel(t, { x: 330, y: 990, s: 1.2, draw: DR(t, 0), seed: 51 });
    KIT.studio.brush(t, { x: 760, y: 200, path: [[0, 50], [110, 0], [250, 44], [390, 6], [500, 36]], draw: DR(t, 1), seed: 52 });
    KIT.studio.penTool(t, { x: 1340, y: 90, anchors: [[0, 120, 60, -80], [160, 10, 70, 0], [320, 140, 60, 60], [470, 50, 50, -60]], draw: DR(t, 2), seed: 53 });
    KIT.studio.swatches(t, { x: 780, y: 470, cols: 3, draw: DR(t, 3), seed: 54 });
    KIT.studio.wireframe(t, { x: 1260, y: 500, w: 600, h: 380, draw: DR(t, 4), seed: 55 });
    KIT.studio.brush(t, { x: 760, y: 900, path: [[0, 30], [140, 0], [300, 40], [420, 10]], color: PAL.sea, width: 24, period: 3.6, draw: DR(t, 5), seed: 56 });
    [['studio.easel', 190, 1030], ['studio.brush', 760, 300], ['studio.penTool', 1340, 330], ['studio.swatches', 780, 850],
      ['studio.wireframe', 1260, 925], ['studio.brush  (color, width)', 760, 1000]].forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

defineStory({ title: 'Component Gallery', stages: 6, music: { tonic: 220 }, plates: [EARTH, TECH, AI, SPACE, LAB, STUDIO] });
boot();
