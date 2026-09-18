/* =====================  FIXTURE: story_clash  ·  legibility_check.mjs must fail this with CLASH  ===================== */
/* Two plates. Plate 1 prints a line of story text straight across dense line art (a crosshatched block and a gauge
   with its ticks) in a muted grey, so it is both low-contrast and on a busy background (CLASH), and sets one
   `fact` line at 16 px (SMALL; the floor is 28 px). For contrast, the same plate writes a note on an opaque card,
   which must NOT be flagged: that is the legitimate kind of overlap.
   Build: python3 build.py story_clash.js story_clash.html */
const HERO = [1400, 560];
function gauge(cx, cy, r, v) {
  ink(shape.circle(cx, cy, r, 64), { closed: true, w: 3, fill: '#efe6cf', seed: 5 });
  for (let i = 0; i <= 40; i++) { const a = Math.PI * (0.8 + 1.4 * i / 40), l = i % 5 ? 14 : 30;
    ink([[cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)], [cx + Math.cos(a) * (r - 6 - l), cy + Math.sin(a) * (r - 6 - l)]], { w: i % 5 ? 1.6 : 2.6, amp: 0 }); }
  const a = Math.PI * (0.8 + 1.4 * v); pen([[cx, cy], [cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40)]], { w: 4, color: PAL.accent });
}
const P = [
  { dur: 4, dark: false, hero: () => ({ x: HERO[0], y: HERO[1], label: 'X·01', r: 60 }),
    header: { num: 0, title: 'Clash Fixture', sub: 'plate 0' },
    draw(t) { ink(shape.circle(HERO[0], HERO[1], 70, 40), { closed: true, w: 3.2, fill: PAL.accent, seed: 2 }); } },
  { dur: 5, dark: false, enter: { type: 'cut' }, hero: () => ({ x: HERO[0], y: HERO[1], label: 'X·01', r: 60 }),
    header: { num: 1, title: 'Text on line art', sub: 'the grey line below is the failure' },
    draw(t) {
      const block = shape.rect(160, 360, 900, 300);
      ink(block, { closed: true, w: 3, fill: '#d9c9a0', seed: 3 }); crosshatch(block, { seed: 4, alpha: 0.8 });
      gauge(820, 510, 150, 0.2 + 0.05 * Math.sin(t));
      ink(shape.circle(HERO[0], HERO[1], 70, 40), { closed: true, w: 3.2, fill: PAL.accent, seed: 2 });
    },
    overlay(t) {
      // story text printed across the hatching and the gauge, muted grey: low contrast AND busy (CLASH)
      text('the pressure climbs past the safe line', 200, 520, { kind: 'sans', size: 30, color: '#8d8478', role: 'label' });
      // a fact at 16 px (SMALL: the fact floor is 28 px)
      text('10,000 lb for five minutes', 200, 760, { kind: 'sans', size: 16, color: PAL.ink, role: 'fact' });
      // a note written on an opaque card over the art: flat background, full contrast, big enough (passes)
      flat(shape.rect(1150, 760, 620, 110), PAL.panel);
      text('written on a card: fine', 1180, 830, { kind: 'sans', size: 30, weight: 600, color: PAL.ink, role: 'fact' });
    } },
];
defineStory({ title: 'Clash Fixture', stages: 1, plates: P });
boot();
