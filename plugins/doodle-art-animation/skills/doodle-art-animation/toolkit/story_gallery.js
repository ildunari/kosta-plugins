/* =====================  STORY: Component Gallery  ·  visual test of toolkit/kits  ===================== */
/* One plate per kit, every component drawing on and then idling, each labelled with its call. This is a specimen
   sheet for checking the kits, not a model for a film's composition: a real film uses a few components inside a
   scene built for its topic. Build: python3 build.py story_gallery.js gallery.html */
const DUR = 6;
/** draw-on for the k-th component on a plate: staggered, eased */
const DR = (t, k) => E.inOut2(inv(0.35 + k * 0.28, 1.9 + k * 0.28, t));
/** a FIG caption that types on after its component */
const FIG = (t, k, name, x, y, dark = false, o = {}) => KIT.caption(t - 1.2 - k * 0.28, `FIG. ${k + 1}  ·  ${name}`, x, y, { dark, size: 15, ls: 2, role: 'decor', ...o });   // specimen FIG. labels: ornament (role decor)
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
  dur: DUR, cam: FLOAT(2), enter: { type: 'wipe', dur: 1.0 }, header: header(2, 'Tech kit', 'terminal, code, browser, rack, circuit, cursor'),
  draw(t) {
    KIT.tech.browser(t, { x: 70, y: 290, w: 620, h: 560, draw: DR(t, 0), seed: 11 });
    KIT.tech.terminal(t, { x: 760, y: 70, w: 520, h: 320, draw: DR(t, 1), seed: 12, t0: 1.2,
      lines: ['$ npm run build', '  bundling 6 kits…', '✓ gallery.html  412 KB', '$ node render.mjs --sheet 1', '  wrote 36 stills', '$ git status'] });
    KIT.tech.code(t, { x: 760, y: 470, w: 520, draw: DR(t, 2), seed: 13, t0: 1.4 });
    KIT.tech.circuit(t, { x: 1340, y: 70, w: 490, h: 330, draw: DR(t, 3), seed: 14 });
    KIT.tech.rack(t, { x: 1600, y: 925, s: 1.05, units: 8, draw: DR(t, 4), seed: 15 });
    KIT.tech.cursor(t, { x: 0, y: 0, path: [[165, 555], [380, 700], [560, 440], [240, 700]], period: 1.2, draw: DR(t, 5), seed: 16 });
    [['tech.browser  + tech.cursor', 70, 888], ['tech.terminal', 760, 426], ['tech.code', 760, 850], ['tech.circuit', 1340, 438], ['tech.rack', 1480, 972]]
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
    KIT.ai.tokens(t, { x: 1380, y: 100, w: 430, draw: DR(t, 3), seed: 24, t0: 1.4 });
    KIT.ai.attention(t, { x: 1290, y: 760, w: 520, words: ['the', 'agent', 'read', 'it', 'then', 'wrote'], draw: DR(t, 4), seed: 25 });
    [['ai.network', 800, 460], ['ai.agent', 70, 900], ['ai.chat', 780, 960], ['ai.tokens', 1380, 330], ['ai.attention', 1310, 870], ['ai.motes  (the backdrop)', 70, 300]]
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
  dur: DUR, cam: FLOAT(5), enter: { type: 'wipe', dur: 1.0, dir: 'rl' }, header: header(5, 'Lab kit', 'flask, cell, molecule, microscope, pipette'),
  draw(t) {
    KIT.lab.cell(t, { x: 350, y: 470, r: 160, draw: DR(t, 0), seed: 41 });
    KIT.lab.molecule(t, { x: 960, y: 420, preset: 'ethanol', unit: 78, spin: 0.9, draw: DR(t, 1), seed: 42 });
    KIT.lab.pipette(t, { x: 1600, y: 330, fall: 170, draw: DR(t, 2), seed: 43 });
    KIT.lab.flask(t, { x: 150, y: 965, s: 0.95, kind: 'beaker', draw: DR(t, 3), seed: 44 });
    KIT.lab.flask(t, { x: 360, y: 965, s: 0.95, kind: 'flask', fill: PAL.mint, level: 0.4, draw: DR(t, 3.3), seed: 45 });
    KIT.lab.flask(t, { x: 560, y: 965, s: 0.95, kind: 'tube', fill: PAL.pink, level: 0.6, steam: true, draw: DR(t, 3.6), seed: 46 });
    KIT.lab.microscope(t, { x: 980, y: 965, s: 0.9, draw: DR(t, 4), seed: 47 });
    KIT.lab.molecule(t, { x: 1600, y: 790, preset: 'benzene', unit: 48, labels: false, spin: 0.45, draw: DR(t, 4.5), seed: 48 });
    [['lab.cell', 200, 675], ['lab.molecule  ethanol', 800, 628], ['lab.pipette', 1480, 600], ['lab.flask  beaker · flask · tube', 140, 1002],
      ['lab.microscope', 880, 1002], ['lab.molecule  benzene', 1450, 962]].forEach(([s, x, y], k) => FIG(t, k, s, x, y));
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
    KIT.studio.brush(t, { x: 760, y: 965, path: [[0, 30], [140, 0], [300, 40], [420, 10]], color: PAL.sea, width: 24, period: 3.6, draw: DR(t, 5), seed: 56 });
    [['studio.easel', 190, 1030], ['studio.brush', 760, 300], ['studio.penTool', 1340, 330], ['studio.swatches', 780, 445],
      ['studio.wireframe', 1260, 925], ['studio.brush  (color, width)', 760, 1048]].forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

const NATURE = {
  dur: DUR, cam: FLOAT(7), enter: { type: 'wipe', dur: 1.0 }, header: header(7, 'Earth kit, wilder', 'river, volcano, cave, dunes, iceberg, flowers'),
  draw(t) {
    KIT.earth.river(t, { x: 70, y: 270, w: 600, h: 290, from: [0.75, 0], to: [0.3, 1], width: [16, 120], draw: DR(t, 0), seed: 61 });
    KIT.earth.volcano(t, { x: 1010, y: 520, w: 540, h: 270, plume: 0.55, draw: DR(t, 1), seed: 62 });
    KIT.earth.cave(t, { x: 1330, y: 90, w: 540, h: 430, glow: true, draw: DR(t, 2), seed: 63 });
    KIT.earth.dunes(t, { x: 70, y: 620, w: 600, h: 340, draw: DR(t, 3), seed: 64 });
    KIT.earth.iceberg(t, { x: 1000, y: 745, w: 560, h: 220, size: 190, above: 110, draw: DR(t, 4), seed: 65 });
    KIT.earth.flowers(t, { x: 1340, y: 950, w: 510, h: 200, n: 10, draw: DR(t, 5), seed: 66 });
    [['earth.river', 70, 598], ['earth.volcano', 740, 598], ['earth.cave  (glow)', 1330, 558],
      ['earth.dunes', 70, 998], ['earth.iceberg', 720, 998], ['earth.flowers', 1340, 998]].forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

const LIFE = {
  dur: DUR, cam: FLOAT(8), enter: { type: 'page', dur: 1.1 }, header: header(8, 'Life kit', 'quadruped, fishSchool, insect, flock, figure, crowd'),
  draw(t) {
    KIT.life.flock(t, { x: 720, y: 40, w: 560, h: 220, mode: 'v', size: 13, speed: 40, at: 0.3, draw: DR(t, 0), seed: 71 });
    KIT.life.flock(t, { x: 1320, y: 30, w: 560, h: 250, mode: 'murmur', draw: DR(t, 0), seed: 72 });
    pen([[40, 560], [1180, 560]], { w: 3.4, seed: 73, taper: 0.02, draw: DR(t, 0) });
    KIT.life.quadruped(t, { x: 210, y: 560, kind: 'horse', s: 1.05, draw: DR(t, 1), seed: 74 });
    KIT.life.quadruped(t, { x: 450 + 42 * t, y: 560, kind: 'deer', walk: 40, s: 1.05, draw: DR(t, 1.3), seed: 75 });
    KIT.life.quadruped(t, { x: 870, y: 560, kind: 'dog', s: 1.05, draw: DR(t, 1.6), seed: 76 });
    KIT.life.quadruped(t, { x: 1080, y: 560, kind: 'fox', dir: -1, s: 1.05, draw: DR(t, 1.9), seed: 77 });
    const pond = shape.rect(1240, 330, 640, 300);
    withAlpha(DR(t, 2), () => { flat(pond, PAL.sea, 0.3); hatch(pond, { color: PAL.seaDeep, alpha: 0.35, gap: 9, len: 14, angle: 0.02, seed: 78 }); });
    KIT.life.fishSchool(t, { x: 1240, y: 330, w: 640, h: 300, n: 14, draw: DR(t, 2), seed: 79 });
    pen([[40, 960], [1880, 960]], { w: 3.4, seed: 80, taper: 0.02, draw: DR(t, 3) });
    KIT.life.crowd(t, { x: 60, y: 960, w: 520, n: 36, rows: 3, size: 70, draw: DR(t, 3), seed: 81 });
    KIT.life.figure(t, { x: 700, y: 960, pose: 'point', aim: 0.25, draw: DR(t, 3.3), seed: 82 });
    KIT.life.figure(t, { x: 870 + 36 * t, y: 960, pose: 'walk', walk: 36, draw: DR(t, 3.6), seed: 83 });
    KIT.life.figure(t, { x: 1250, y: 960, pose: 'hold', item: 'box', dir: -1, draw: DR(t, 3.9), seed: 84 });
    KIT.life.figure(t, { x: 1400, y: 960, pose: 'wave', draw: DR(t, 4.2), seed: 85 });
    KIT.life.insect(t, { x: 1560, y: 740, kind: 'butterfly', rot: -0.4, s: 1.6, draw: DR(t, 4.5), seed: 89 });
    KIT.life.insect(t, { x: 1700, y: 760, kind: 'bee', s: 1.6, draw: DR(t, 4.6), seed: 88 });
    KIT.life.insect(t, { x: 1815, y: 800, kind: 'ladybug', rot: -1.2, s: 1.5, draw: DR(t, 4.7), seed: 87 });
    KIT.life.insect(t, { x: 1590 + 18 * t, y: 850, kind: 'beetle', walk: 12, s: 1.5, draw: DR(t, 4.8), seed: 86 });
    KIT.life.insect(t, { x: 1880 - 16.8 * t, y: 905, kind: 'ant', walk: 14, rot: Math.PI, s: 1.2, draw: DR(t, 4.9), seed: 90 });
    [['life.flock  v · murmur', 1320, 305], ['life.quadruped  horse · deer · dog · fox', 40, 598], ['life.fishSchool', 1240, 668],
      ['life.crowd', 60, 998], ['life.figure  point · walk · hold · wave', 700, 998], ['life.insect', 1500, 935]].forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

const SETTLE_A = {
  dur: DUR, cam: FLOAT(9), enter: { type: 'wipe', dur: 1.0 }, header: header(9, 'Settle kit · shelter', 'house, hut, tent, tower, cart, ship'),
  draw(t) {
    KIT.settle.house(t, { x: 300, y: 620, s: 0.78, style: 'cottage', draw: DR(t, 0), seed: 61 });
    KIT.settle.house(t, { x: 520, y: 620, s: 0.6, style: 'townhouse', draw: DR(t, 0.3), seed: 62 });
    KIT.settle.house(t, { x: 720, y: 620, s: 0.52, style: 'farmhouse', draw: DR(t, 0.6), seed: 63 });
    KIT.settle.hut(t, { x: 940, y: 620, s: 0.7, draw: DR(t, 1), seed: 64 });
    KIT.settle.hut(t, { x: 1130, y: 620, s: 0.45, kind: 'long', draw: DR(t, 1.3), seed: 65 });
    KIT.settle.tent(t, { x: 1330, y: 620, s: 0.6, draw: DR(t, 1.6), seed: 66 });
    KIT.settle.tent(t, { x: 1560, y: 620, s: 0.5, kind: 'yurt', draw: DR(t, 1.9), seed: 67 });
    KIT.settle.tower(t, { x: 1700, y: 620, s: 0.45, draw: DR(t, 2.2), seed: 68 });
    KIT.settle.tower(t, { x: 250, y: 975, s: 0.5, kind: 'lighthouse', draw: DR(t, 2.5), seed: 69 });
    KIT.settle.tower(t, { x: 480, y: 975, s: 0.45, kind: 'watchtower', draw: DR(t, 2.8), seed: 70 });
    KIT.settle.cart(t, { x: 760, y: 965, s: 0.7, draw: DR(t, 3.1), seed: 71 });
    KIT.settle.ship(t, { x: 1250, y: 925, s: 0.6, draw: DR(t, 3.4), seed: 72 });
    KIT.settle.ship(t, { x: 1620, y: 955, s: 0.5, kind: 'boat', draw: DR(t, 3.7), seed: 73 });
    [['settle.house  3 styles', 200, 664], ['settle.hut  round · long', 900, 664], ['settle.tent  camp · yurt', 1300, 664],
      ['settle.tower  3 kinds', 170, 1015], ['settle.cart', 660, 1011], ['settle.ship  sail · boat', 1120, 1011]]
      .forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

const SETTLE_B = {
  dur: DUR, cam: FLOAT(10), enter: { type: 'zoom', dir: 'out', dur: 1.5 }, header: header(10, 'Settle kit · land and routes', 'village, skyline, road, bridge, fields, market, map, ruins'),
  draw(t) {
    KIT.settle.skyline(t, { x: 560, y: 400, w: 780, h: 250, era: 'old', draw: DR(t, 0), seed: 81 });
    KIT.settle.bridge(t, { x: 1400, y: 270, w: 430, h: 180, draw: DR(t, 1), seed: 82 });
    KIT.settle.village(t, { x: 60, y: 660, w: 470, h: 170, n: 5, draw: DR(t, 2), seed: 83 });
    KIT.settle.ruins(t, { x: 610, y: 660, w: 540, h: 190, draw: DR(t, 3), seed: 84 });
    KIT.settle.map(t, { x: 1330, y: 500, w: 510, h: 320, title: 'THE COAST ROAD', draw: DR(t, 4), seed: 85 });
    KIT.settle.fields(t, { x: 60, y: 1010, w: 540, h: 240, cols: 4, rows: 3, draw: DR(t, 5), seed: 86 });
    KIT.settle.market(t, { x: 640, y: 1010, w: 560, n: 2, draw: DR(t, 6), seed: 87 });
    KIT.settle.road(t, { x: 1250, y: 930, path: [[0, 0], [200, 52], [420, -26], [610, 40]], width: 34, draw: DR(t, 7), seed: 88 });
    [['settle.skyline  old', 560, 438], ['settle.bridge  arch', 1400, 486], ['settle.village', 60, 700], ['settle.ruins', 610, 700],
      ['settle.map', 1330, 856], ['settle.fields', 60, 1044], ['settle.market', 640, 734], ['settle.road', 1250, 1040]]
      .forEach(([s, x, y], k) => FIG(t, k, s, x, y));
  },
};

defineStory({ title: 'Component Gallery', stages: 10, music: { tonic: 220 }, plates: [EARTH, TECH, AI, SPACE, LAB, STUDIO, NATURE, LIFE, SETTLE_A, SETTLE_B] });
boot();
