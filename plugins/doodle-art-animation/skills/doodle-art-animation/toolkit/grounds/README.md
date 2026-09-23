# Papers

Each file here defines one or more papers (grounds) and the paper sets that pair them. The notebook's two papers,
`cream` and `night`, live in `engine.js`, and `notebook` stays the default set.

`build.py` includes a file only when the story names one of its papers or sets, for example
`defineStory({ paper: 'blueprint' })` or `plate.paper = 'kraft'`. It also pulls in the files that define the two
papers of a named set. Files whose names start with `_` hold shared helpers and are always included. A story that
names its paper through a variable (`paper: pick`) gets every file.

A file looks like this:

```js
defineGround('blueprint', {
  tone: 'dark',                                   // the world it stands in for: 'light' or 'dark'
  pal: { night: '#123a78', nightInk: '#eaf1ff', nightLabel: '#b8c9ec', accent: '#f2c14e' },
  build(g, rand, W, H) {                          // paints the texture once, at the film's size
    paperKit.fill(g, '#15407f', '#0f3470');         // a top-to-bottom gradient
    paperKit.mottle(g, rand, 40, ['rgba(255,255,255,0.03)', 'rgba(0,0,20,0.05)'], 80, 260);   // mottles stop banding
    paperKit.grid(g, rand, 48, '#cfe0ff', 0.10, 1.5);   // lines 1.5 px or wider, 30 px or more apart
    paperKit.grain(g, 10, 7);                        // 2 px specks survive re-encoding
  },
  vignette: 'rgba(4,14,40,0.45)', grain: 0.5,
  treatment: { color: ['#2d62b0', 0.72], tooth: [0.06, 0.6] },
  sfx: { header: 'readout' },
});
definePaperSet('blueprint', { light: 'whiteprint', dark: 'blueprint' });
```

The full list of options, the `paperKit` helpers and the texture rules are in `references/api.md` ("Paper") and
`references/style.md` ("Papers"). `smoke_test.py` builds `story_swatch.js` on every paper and checks that ink, labels
and the accent clear their contrast floors (7, 4.5 and 3).
