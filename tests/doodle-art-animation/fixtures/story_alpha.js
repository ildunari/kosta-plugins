/* =====================  FIXTURE: story_alpha  ·  a plate's own globalAlpha must not undo a transition's fade  ===================== */
/* Plate code often writes ctx.globalAlpha = 0.4 … ctx.globalAlpha = 1 instead of save/restore or *=. Inside a transition
   that used to throw the fade away: art drawn after the reset showed at full strength, then vanished in one drawing
   (the biocoating film's title ring). Each block below is drawn right after exactly that pattern:
   - plate 0's block sits on the hero, so it stays under the pivot while the zoom in grows the old plate; it must fade out;
   - plate 2's block (draw) and its card (overlay) must fade in through the crossfade.
   Probed by tests/doodle-art-animation/regression_test.py. Build: python3 build.py story_alpha.js story_alpha.html */
const ALPHA_HERO = [960, 540], ALPHA_DRAW = [1400, 540], ALPHA_OVL = [520, 540];
function alphaBlock([x, y]) {
  ctx.globalAlpha = 0.4; ctx.fillStyle = '#000'; ctx.fillRect(x - 40, y - 200, 80, 30);   // the pattern under test:
  ctx.globalAlpha = 1; ctx.fillRect(x - 90, y - 90, 180, 180);                              // an absolute reset to 1
}
const P = [
  { dur: 3, dark: false, hero: () => ({ x: ALPHA_HERO[0], y: ALPHA_HERO[1] }), counter: false, marks: false, draw() { alphaBlock(ALPHA_HERO); } },
  { dur: 3, dark: false, enter: { type: 'zoom', dir: 'in', k: 3.5 }, hero: () => ({ x: ALPHA_HERO[0], y: ALPHA_HERO[1] }), counter: false, marks: false, draw() {} },
  { dur: 3, dark: false, enter: { type: 'fade' }, counter: false, marks: false, draw() { alphaBlock(ALPHA_DRAW); }, overlay() { alphaBlock(ALPHA_OVL); } },
];
defineStory({ title: 'Alpha Fixture', stages: 1, silent: true, grain: 0, plates: P });
boot();
