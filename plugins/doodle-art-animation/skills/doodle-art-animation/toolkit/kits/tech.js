/* =====================  KIT.tech · terminal, code, browser, rack, circuit, cursor  =====================
   Windows and boards take x, y = top-left and w, h; rack takes x, y = floor centre; cursor takes x, y = the origin of
   its path (the pointer tip). See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  techScreen: '#1f2233', techScreenBar: '#33374d', techScreenInk: '#dfe6f0', techScreenMuted: '#8f96b3', techPrompt: '#53ba8b',
  techWindow: '#f4efe3', techChrome: '#ddd3bf', techField: '#fbf8f1', techKeyword: '#5a5fa8', techString: '#4f7d3c', techNumber: '#b07a1c',
  techHighlight: '#e6c65c', techMetal: '#a39d93', techMetalDeep: '#3d393c', techMetalLight: '#c9c3b8', techLedOff: '#4a4648',
  techLedGreen: '#6fdc8c', techLedAmber: '#f0b347', techLedBlue: '#6fc8e0', techBoard: '#4f8a6a', techBoardDeep: '#2c5a44',
  techCopper: '#d8aa5c', techChip: '#2a2629', techPulse: '#fff2c4', techImage: '#cfe0e3', techCardNight: '#1b1a3c',
});
KIT.tech = (() => {
  const K = KIT;
  const DOTS = () => [PAL.pink, PAL.sun, PAL.mint];

  /** windowFrame: the shared window body. Returns nothing; draws shadow, body, title bar and the three dots. */
  function windowFrame(o, w, h, bar, body, barCol, dark) {                 // dark: a dark screen; o.dark: a night plate
    const frame = K.rrect(0, 0, w, h, 14);
    if (!dark && !o.dark) K.shadow(frame, 6, 8, 0.14 * K.ph(o.draw, 0.2, 0.6));
    ink(frame, { closed: true, w: K.lw(o, 2.4), color: K.inkOf(o.dark), fill: body, fillReveal: 'sweep', amp: 0.7, seed: o.seed + 1, draw: K.ph(o.draw, 0, 0.55), double: !dark });
    const a = K.ph(o.draw, 0.45, 0.7); if (a <= 0) return;
    withAlpha(a, () => {
      ctx.save(); trace(frame, true); ctx.clip(); flat(shape.rect(0, 0, w, bar), barCol); ctx.restore();
      ink([[0, bar], [w, bar]], { w: K.lw(o, 1.4), amp: 0.4, seed: o.seed + 2, alpha: 0.7, color: dark ? PAL.techScreenMuted : PAL.ink });
      DOTS().forEach((c, i) => ink(shape.circle(20 + i * 20, bar / 2, 6, 14), { closed: true, w: K.lw(o, 1.2), fill: c, amp: 0.3, seed: o.seed + 3 + i, color: dark ? '#0d0e17' : PAL.ink }));
    });
  }

  /** terminal(t, {x, y, w, h, lines, title, cps, t0, loop, size}): a dark terminal that types. Lines starting with
      '$ ' are typed commands; other lines print as output ('✓ …' green, '✗ …' or '! …' pink). The cursor blinks and the
      view scrolls when the lines overflow. loop: seconds before it starts again (optional). */
  function terminal(t, o) {
    o = K.opts(o, { w: 620, h: 340, title: 'zsh — ~/project', cps: 24, t0: 0.7, loop: null, size: 18,
      lines: ['$ npm test', '  PASS  kits/earth.test.js', '  PASS  kits/tech.test.js', '✓ 42 tests passed', '$ git push'] });
    return K.at(o, () => {
      const { w, h, size } = o, lh = size * 1.5, bar = 34;
      windowFrame(o, w, h, bar, PAL.techScreen, PAL.techScreenBar, true);
      const ca = K.ph(o.draw, 0.55, 0.85); if (ca <= 0) return;
      text(o.title, w / 2, bar / 2 + 5, { kind: 'mono', size: 13, align: 'center', color: PAL.techScreenMuted, alpha: ca });
      const sch = K.memo(`t.term|${o.lines.join('\n')}|${o.cps}`, () => { let c = 0;
        return o.lines.map(s => { const cmd = s.startsWith('$ '), st = c; c += cmd ? (s.length - 2) / o.cps + 0.45 : 0.14; return { s, cmd, st }; }).concat([{ s: '$ ', cmd: true, st: c + 0.2, end: true }]); });
      let tt = t - o.t0; if (o.loop && tt > 0) tt %= o.loop;
      if (tt < 0) tt = 0;
      const rows = Math.floor((h - bar - 20) / lh);
      let scroll = 0; sch.forEach((l, i) => { if (i >= rows) scroll += E.inOut3(inv(l.st, l.st + 0.25, tt)); });
      const cw = measure('M', { kind: 'mono', size });
      withAlpha(ca, () => {
        ctx.save(); ctx.beginPath(); ctx.rect(8, bar + 4, w - 16, h - bar - 10); ctx.clip();
        let cursor = null, last = -1; sch.forEach((l, i) => { if (tt >= l.st) last = i; });
        sch.forEach((l, i) => {
          if (tt < l.st) return;
          const y = bar + 14 + lh * (i + 1 - scroll) - lh * 0.3;
          if (l.cmd) {
            const body = typed(l.s.slice(2), tt - l.st, o.cps);
            text('$', 20, y, { kind: 'mono', size, weight: 600, color: PAL.techPrompt });
            text(body, 20 + cw * 2, y, { kind: 'mono', size, color: PAL.techScreenInk });
            if (i === last) cursor = [20 + cw * (2 + body.length), y, body.length < l.s.length - 2];
          } else {
            const c = /^\s*✓/.test(l.s) ? PAL.techPrompt : /^\s*[✗!]/.test(l.s) ? PAL.pink : PAL.techScreenMuted;
            text(l.s, 20, y, { kind: 'mono', size, color: c, alpha: E.out3(inv(l.st, l.st + 0.12, tt)) });
          }
        });
        if (cursor && (cursor[2] || Math.floor(t * 2.4) % 2 === 0)) flat(shape.rect(cursor[0] + 1, cursor[1] - size * 0.82, cw * 0.62, size * 1.02), PAL.techScreenInk, 0.85);
        ctx.restore();
      });
    });
  }

  const KW = new Set('const let var function return if else for while await async import from export def class new yield try catch in of with as and or not None True False null true false'.split(' '));
  function tokens(line) {
    const out = [], re = /(\s+|"[^"]*"?|'[^']*'?|`[^`]*`?|#.*$|\/\/.*$|\d+(?:\.\d+)?|[A-Za-z_]\w*|[^\w\s])/g; let m, col = 0, prev = '';
    while ((m = re.exec(line))) { const s = m[0]; let c = 'ink', bold = false;   // colour roles, resolved per plate world when drawn
      if (/^\s/.test(s)) c = null; else if (/^(#|\/\/)/.test(s)) c = 'comment'; else if (/^["'`]/.test(s)) c = 'string';
      else if (/^\d/.test(s)) c = 'number'; else if (KW.has(s)) { c = 'keyword'; bold = true; } else if (/^(def|function|class)$/.test(prev)) { c = 'name'; bold = true; }
      if (c) out.push({ s, col, c, bold }); col += s.length; if (!/^\s/.test(s)) prev = s; }
    return out;
  }
  const CODE_COL = { paper: { ink: '#1b1518', comment: '#8a8176', string: '#4f7d3c', number: '#b07a1c', keyword: '#5a5fa8', name: '#b44e2e' },
    night: { ink: '#dcdcef', comment: '#77789a', string: '#8fd3a0', number: '#e6c65c', keyword: '#9fa3e8', name: '#f0a07a' } };
  /** code(t, {x, y, w, lines, hl, size, title, t0}): a code card with line numbers and light syntax colour. A highlight
      bar steps through the lines (hl: a line index, or t => index, to control it) and a caret blinks at its end.
      Returns { h }, the card's height (it follows the line count). */
  function code(t, o) {
    o = K.opts(o, { w: 560, size: 17, title: 'agent.py', t0: 0.5, hl: null,
      lines: ['def plan(goal):', '    steps = think(goal)', '    for step in steps:', '        result = act(step)', '        if result.ok:', '            log(result)', '    return summary(steps)'] });
    return K.at(o, () => {
      const { w, size, lines } = o, lh = size * 1.62, top = 52, h = top + lines.length * lh + 18;
      const frame = K.rrect(0, 0, w, h, 10);
      const dk = o.dark, CC = CODE_COL[dk ? 'night' : 'paper'];
      if (!dk) K.shadow(frame, 5, 6, 0.12 * K.ph(o.draw, 0.2, 0.6));
      ink(frame, { closed: true, w: K.lw(o, 2), color: K.inkOf(dk), fill: dk ? PAL.techCardNight : PAL.panel, fillReveal: 'sweep', amp: 0.6, seed: o.seed + 1, draw: K.ph(o.draw, 0, 0.5), double: true });
      const ca = K.ph(o.draw, 0.4, 0.75); if (ca <= 0) return;
      const toks = K.memo(`t.code|${lines.join('\n')}`, () => lines.map(tokens)), cw = measure('M', { kind: 'mono', size });
      const tt = t - o.t0, n = lines.length;
      let hv = typeof o.hl === 'function' ? o.hl(t) : o.hl;
      if (hv == null) { const [i, f] = K.cyc(Math.max(0, tt - 0.8), 1.3); hv = lerp(i % n, (i + 1) % n, E.inOut3(inv(0.72, 1, f))); }
      hv = clamp(hv, 0, n - 1);
      withAlpha(ca, () => {
        text(o.title, 22, 32, { kind: 'mono', size: 13, weight: 600, ls: 2, color: dk ? '#b9b9d6' : PAL.inkSoft });
        ink([[16, 44], [w - 16, 44]], { w: K.lw(o, 1.2), color: PAL.peri, amp: 0.3, alpha: 0.7, seed: o.seed + 4 });
        ink([[54, 50], [54, h - 12]], { w: K.lw(o, 1), color: PAL.peri, amp: 0.3, alpha: 0.5, seed: o.seed + 5 });
        const hy = top + hv * lh;
        flat(shape.rect(56, hy + 3, w - 70, lh - 2), PAL.techHighlight, 0.3 * clamp(tt * 2));
        flat(shape.rect(56, hy + 3, 4, lh - 2), PAL.accent, clamp(tt * 2));
        toks.forEach((ts, i) => {
          const y = top + i * lh + lh * 0.7, shown = Math.floor(clamp((tt - i * 0.14) * 70, 0, lines[i].length));
          if (shown <= 0) return;
          text(String(i + 1), 42, y, { kind: 'mono', size: size - 3, align: 'right', color: K.mutedOf(dk) });
          ts.forEach(k => { if (k.col >= shown) return; text(k.s.slice(0, shown - k.col), 68 + k.col * cw, y, { kind: 'mono', size, color: CC[k.c], weight: k.bold ? 600 : 400 }); });
        });
        const li = Math.round(hv); if (Math.abs(hv - li) < 0.05 && Math.floor(t * 2.4) % 2 === 0 && tt > 0.8)
          flat(shape.rect(68 + lines[li].length * cw + 3, top + li * lh + lh * 0.7 - size * 0.8, 2.4, size), CC.ink, 0.85);
      });
      return { h };
    });
  }

  /** browser(t, {x, y, w, h, url, title}): a browser window with a tab (spinning loader), an address bar that types
      the url, a loading bar that sweeps, and a sketched web page that scrolls gently. */
  function browser(t, o) {
    o = K.opts(o, { w: 720, h: 460, url: 'https://kits.example/doodle', title: 'Doodle kits' });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, bar = 44;
      windowFrame(o, w, h, bar, PAL.techWindow, PAL.techChrome, false);
      const ca = K.ph(draw, 0.5, 0.85); if (ca <= 0) return;
      withAlpha(ca, () => {
        const tab = [[82, bar + 1], [92, 9], [262, 9], [272, bar + 1]];
        ink(tab, { closed: true, w: K.lw(o, 1.6), fill: PAL.techWindow, amp: 0.5, seed: seed + 10 });
        flat(shape.rect(84, bar - 2, 186, 5), PAL.techWindow);
        ctx.save(); ctx.translate(112, 27); ctx.rotate(t * 5);
        ink(shape.arc(0, 0, 7, 0, 4.4, 16), { w: K.lw(o, 2), color: PAL.accent, amp: 0 }); ctx.restore();
        text(o.title, 128, 32, { kind: 'sans', size: 15, weight: 600, color: PAL.inkSoft });
        const field = K.rrect(16, 54, w - 32, 32, 16);
        ink(field, { closed: true, w: K.lw(o, 1.4), fill: PAL.techField, color: PAL.peri, amp: 0.4, seed: seed + 11 });
        ink(K.rrect(34, 64, 10, 9, 2), { closed: true, w: K.lw(o, 1.4), fill: PAL.inkSoft, amp: 0.2, seed: seed + 12 });
        ink(shape.arc(39, 64, 4, Math.PI, TAU, 10), { w: K.lw(o, 1.4), color: PAL.inkSoft, amp: 0.2 });
        text(typed(o.url, (t - 0.8) * 1.2, 30), 54, 76, { kind: 'mono', size: 15, color: PAL.ink });
        const [, lf] = K.cyc(t, 2.6), lp = E.out3(inv(0, 0.8, lf));
        if (lp > 0) flat(shape.rect(16, 92, (w - 32) * lp, 3), PAL.accent, 1 - inv(0.8, 0.95, lf));
        // the page
        const vy = 98, vh = h - vy - 10, smax = Math.max(20, 510 - vh), sc = smax * (0.5 - 0.5 * Math.cos(t * 0.45));
        ctx.save(); ctx.beginPath(); ctx.rect(10, vy, w - 20, vh); ctx.clip(); ctx.translate(0, vy - sc);
        const p = (i) => K.ph(draw, 0.6 + i * 0.05, 0.9 + i * 0.05);
        withAlpha(p(0), () => {
          ink(shape.circle(40, 30, 11, 16), { closed: true, w: K.lw(o, 1.6), fill: PAL.ink, amp: 0.3, seed: seed + 20 });
          text('doodle', 58, 36, { kind: 'display', size: 20, weight: 500, color: PAL.ink });
          [0, 1, 2].forEach(i => pen([[w - 210 + i * 62, 30], [w - 170 + i * 62, 30]], { w: K.lw(o, 3), color: PAL.inkSoft, seed: seed + 21 + i, taper: 0.2 }));
          ink([[20, 54], [w - 20, 54]], { w: K.lw(o, 1), color: PAL.peri, amp: 0.3, alpha: 0.6 });
        });
        withAlpha(p(1), () => {
          pen([[32, 98], [w * 0.42, 98]], { w: K.lw(o, 12), color: PAL.ink, seed: seed + 23, taper: 0.06, alpha: 0.85 });
          pen([[32, 128], [w * 0.33, 128]], { w: K.lw(o, 12), color: PAL.ink, seed: seed + 24, taper: 0.06, alpha: 0.85 });
          [0, 1, 2].forEach(i => ink([[32, 160 + i * 18], [32 + w * (0.4 - i * 0.05), 160 + i * 18]], { w: K.lw(o, 2.2), color: PAL.muted, amp: 0.5, seed: seed + 25 + i }));
          const bp = 1 + 0.04 * Math.sin(t * 3);
          ctx.save(); ctx.translate(92, 232); ctx.scale(bp, bp);
          ink(K.rrect(-60, -18, 120, 36, 18), { closed: true, w: K.lw(o, 1.8), fill: PAL.accent, amp: 0.4, seed: seed + 28 });
          text('Start', 0, 6, { kind: 'sans', size: 16, weight: 600, align: 'center', color: '#fff8ee' }); ctx.restore();
        });
        withAlpha(p(2), () => {
          const ix = w * 0.52, iw = w - ix - 30, box = shape.rect(ix, 76, iw, 170);
          ink(box, { closed: true, w: K.lw(o, 2), fill: PAL.techImage, amp: 0.6, seed: seed + 30 });
          const mt = [[ix, 246], [ix + iw * 0.3, 150], [ix + iw * 0.45, 190], [ix + iw * 0.65, 120], [ix + iw, 246]];
          ink(mt, { closed: true, w: K.lw(o, 1.8), fill: PAL.leaf, amp: 0.6, seed: seed + 31 });
          ink(shape.circle(ix + iw * 0.8, 112, 16 + Math.sin(t * 1.5), 20), { closed: true, w: K.lw(o, 1.6), fill: PAL.sun, amp: 0.3, seed: seed + 32 });
        });
        [0, 1, 2].forEach(i => withAlpha(p(3 + i), () => {
          const cw = (w - 40 - 2 * 16) / 3, cx = 20 + i * (cw + 16), cy = 280, card = K.rrect(cx, cy, cw, 150, 10);
          ink(card, { closed: true, w: K.lw(o, 1.6), fill: '#fffdf7', amp: 0.5, seed: seed + 40 + i });
          ink(shape.circle(cx + 26, cy + 28, 12, 16), { closed: true, w: K.lw(o, 1.4), fill: [PAL.cyan, PAL.gold, PAL.pink][i], amp: 0.3, seed: seed + 44 + i });
          pen([[cx + 16, cy + 64], [cx + cw * 0.7, cy + 64]], { w: K.lw(o, 5), color: PAL.inkSoft, seed: seed + 47 + i, taper: 0.1 });
          [0, 1, 2].forEach(k => ink([[cx + 16, cy + 88 + k * 16], [cx + cw * (0.85 - k * 0.12), cy + 88 + k * 16]], { w: K.lw(o, 1.8), color: PAL.muted, amp: 0.4, seed: seed + 50 + i * 3 + k }));
        }));
        withAlpha(p(6), () => { [0, 1].forEach(k => ink([[20, 470 + k * 18], [w * (0.6 - k * 0.2), 470 + k * 18]], { w: K.lw(o, 1.8), color: PAL.muted, amp: 0.4, seed: seed + 60 + k })); });
        ctx.restore();
        const th = vh * vh / (vh + smax), ty = vy + 4 + (vh - th - 8) * (sc / smax);
        flat(K.rrect(w - 16, ty, 6, th, 3), PAL.muted, 0.45);
      });
    });
  }

  /** rack(t, {x, y, s, units, seed}): a server rack standing on the floor at (x, y). Units slide in on draw; power,
      activity and network lights blink; cables sway. */
  function rack(t, o) {
    o = K.opts(o, { units: 6 });
    return K.at(o, () => {
      const { units, draw, seed } = o, u = 38, w = 210, H = units * u + 40;
      const body = shape.rect(-w / 2, -H, w, H);
      if (!o.dark) K.shadow(body, 8, 0, 0.12 * K.ph(draw, 0.2, 0.6));
      withAlpha(K.ph(draw, 0.2, 0.5), () => flat(body, PAL.techMetalDeep));
      pen([...body, body[0]], { w: K.lw(o, 3), color: K.inkOf(o.dark), seed: seed + 1, taper: 0.02, draw: K.ph(draw, 0, 0.45) });
      [-w / 2 + 10, w / 2 - 22].forEach((fx, i) => ink(shape.rect(fx, 0, 12, 8), { closed: true, w: K.lw(o, 1.4), color: K.inkOf(o.dark), fill: PAL.ink, amp: 0.2, seed: seed + 2 + i, alpha: K.ph(draw, 0.2, 0.5) }));
      withAlpha(K.ph(draw, 0.3, 0.6), () => { for (let k = 0; k < 9; k++) ink([[-60 + k * 15, -H + 8], [-54 + k * 15, -H + 8]], { w: K.lw(o, 2), color: PAL.techMetal, amp: 0.2, seed: seed + 5 + k }); });
      for (let i = 0; i < units; i++) {
        const sl = K.ph(draw, 0.25 + i * 0.07, 0.55 + i * 0.07); if (sl <= 0) continue;
        const y = -H + 18 + i * u, dx = (1 - sl) * 60;
        ctx.save(); ctx.translate(dx, 0); ctx.globalAlpha *= sl;
        const face = shape.rect(-w / 2 + 12, y, w - 24, u - 6);
        ink(face, { closed: true, w: K.lw(o, 1.5), fill: PAL.techMetal, amp: 0.4, seed: seed + 20 + i });
        hatch(face, { color: PAL.techMetalDeep, alpha: 0.25, gap: 5, len: 8, angle: -0.5, seed: seed + 30 + i, keep: (px, py) => clamp((py - y) / (u - 6)) * 0.8 });
        for (let k = 0; k < 6; k++) ink([[w / 2 - 54 + k * 7, y + 8], [w / 2 - 54 + k * 7, y + u - 14]], { w: K.lw(o, 1.4), color: PAL.techMetalDeep, amp: 0.2, alpha: 0.7, seed: seed + 40 + i * 9 + k });
        ink(shape.rect(-w / 2 + 66, y + 9, 34, 13), { closed: true, w: K.lw(o, 1.1), fill: PAL.techMetalLight, amp: 0.3, seed: seed + 50 + i });
        text(`SRV-${String(i + 1).padStart(2, '0')}`, -w / 2 + 106, y + 20, { kind: 'mono', size: 10, weight: 600, color: PAL.techMetalDeep });
        const leds = [
          [PAL.techLedGreen, 0.75 + 0.25 * Math.sin(t * 2 + i)],
          [PAL.techLedAmber, hash3(i, 1, Math.floor(t * 9 + i * 3) + seed) > 0.45 ? 1 : 0],
          [PAL.techLedBlue, hash3(i, 2, Math.floor(t * 2.5 + i) + seed) > 0.35 ? 1 : 0]];
        leds.forEach(([c, on], k) => { const lx = -w / 2 + 26 + k * 13, ly = y + 16;
          if (on > 0) flat(shape.circle(lx, ly, 6.5, 14), c, 0.3 * on);
          ink(shape.circle(lx, ly, 3.4, 12), { closed: true, w: K.lw(o, 0.9), fill: on > 0.5 ? c : PAL.techLedOff, amp: 0.1, color: PAL.ink, seed: seed + 60 + k }); });
        ctx.restore();
      }
      const ca = K.ph(draw, 0.7, 1);
      if (ca > 0) [0, 1, 2].forEach(i => { const y0 = -H + 34 + i * u * 1.6, sw = 3 * Math.sin(t * 0.9 + i * 1.3);
        pen(smooth([[w / 2 - 4, y0], [w / 2 + 30 + i * 8 + sw, y0 + 30], [w / 2 + 22 + i * 10 + sw, -30], [w / 2 + 40 + i * 14, 2]], 3),
          { w: K.lw(o, 3.2), color: [PAL.cyan, PAL.sun, PAL.pink][i], seed: seed + 70 + i, taper: 0.05, draw: ca, alpha: 0.9 }); });
    });
  }

  /** circuit(t, {x, y, w, h, label, pins, seed}): a green circuit board with a central chip, fanned-out copper traces
      ending in vias, a few parts, and pulses running along the traces (alternately outward and inward). */
  function circuit(t, o) {
    o = K.opts(o, { w: 600, h: 380, label: 'NPU-7', pins: [6, 4] });
    return K.at(o, () => {
      const { w, h, draw, seed } = o, cw = 150, ch = 92;
      const g = K.memo(`t.pcb|${w}|${h}|${seed}|${o.pins}`, () => {
        const r = mulberry(seed), traces = [], [np, ns] = o.pins.map(v => Math.max(1, Math.round(v))), leg = 14;
        for (const sg of [-1, 1]) for (let i = 0; i < np; i++) {                     // top and bottom
          const m = i - (np - 1) / 2, px = m * (cw - 40) / Math.max(1, np - 1), y1 = sg * (ch / 2 + leg + 12), avail = h / 2 - 30 - Math.abs(y1);
          const q = Math.min(28, avail / (Math.abs(np - 1) / 2 + 0.6)), sh = m * q, yEnd = sg * (h / 2 - 26 - r() * Math.max(0, avail - Math.abs(sh)) * 0.6);
          traces.push([[px, sg * (ch / 2 + leg)], [px, y1], [px + sh, y1 + sg * Math.abs(sh)], [px + sh, Math.abs(yEnd) > Math.abs(y1 + sg * Math.abs(sh)) ? yEnd : y1 + sg * (Math.abs(sh) + 10)]]);
        }
        for (const sg of [-1, 1]) for (let i = 0; i < ns; i++) {                     // left and right
          const m = i - (ns - 1) / 2, py = m * (ch - 30) / Math.max(1, ns - 1), x1 = sg * (cw / 2 + leg + 14), sh = m * 30;
          traces.push([[sg * (cw / 2 + leg), py], [x1, py], [x1 + sg * Math.abs(sh), py + sh], [sg * (w / 2 - 30 - r() * w * 0.12), py + sh]]);
        }
        return { traces, lens: traces.map(pathLen), parts: [[-w / 2 + 70, -h / 2 + 50, 0], [w / 2 - 80, h / 2 - 48, 1], [-w / 2 + 64, h / 2 - 50, 2], [w / 2 - 70, -h / 2 + 52, 3]] };
      });
      ctx.save(); ctx.translate(w / 2, h / 2);
      const board = K.rrect(-w / 2, -h / 2, w, h, 16);
      if (!o.dark) K.shadow(board, 6, 8, 0.14 * K.ph(draw, 0.1, 0.5));
      ink(board, { closed: true, w: K.lw(o, 2.6), color: K.inkOf(o.dark), fill: PAL.techBoard, fillReveal: 'sweep', amp: 0.8, seed: seed + 1, draw: K.ph(draw, 0, 0.5) });
      const ba = K.ph(draw, 0.4, 0.7);
      if (ba > 0) withAlpha(ba, () => {
        hatch(board, { color: PAL.techBoardDeep, alpha: 0.35, gap: 8, len: 12, angle: 0.8, seed: seed + 2 });
        hatch(board, { color: '#9cc7a8', alpha: 0.18, gap: 11, len: 10, angle: -0.8, seed: seed + 3 });
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => ink(shape.circle(a * (w / 2 - 18), b * (h / 2 - 18), 7, 14), { closed: true, w: K.lw(o, 1.4), fill: o.dark ? PAL.night : PAL.paper, amp: 0.2, seed: seed + 4 + i }));
      });
      g.traces.forEach((p, i) => {
        const d = K.ph(draw, 0.45 + i * 0.012, 0.8 + i * 0.012); if (d <= 0) return;
        ink(p, { w: K.lw(o, 3.2), color: PAL.techCopper, amp: 0.5, seed: seed + 10 + i, draw: d, cap: 'round' });
        if (d >= 1) { const [ex, ey] = p[p.length - 1]; ink(shape.circle(ex, ey, 6.5, 14), { closed: true, w: K.lw(o, 1.2), fill: PAL.techCopper, color: PAL.techBoardDeep, amp: 0.2, seed: seed + 60 + i });
          flat(shape.circle(ex, ey, 2.4, 10), PAL.techBoardDeep); }
      });
      if (draw >= 1) g.traces.forEach((p, i) => { const L = g.lens[i], path = i % 2 ? p.slice().reverse() : p;
        flow(path, t + hash3(i, seed) * 3, { speed: 110 + 70 * hash3(i, 7, seed), gap: L + 90, len: 22, color: PAL.techPulse, w: K.lw(o, 3.6), alpha: 1, seed: seed + 80 + i }); });
      g.parts.forEach(([px, py, k], i) => withAlpha(K.ph(draw, 0.6, 0.9), () => {
        if (k % 2 === 0) { ink(K.rrect(px - 20, py - 8, 40, 16, 7), { closed: true, w: K.lw(o, 1.4), fill: '#d9c6a0', amp: 0.3, seed: seed + 90 + i });
          [-8, 0, 8].forEach((bx, j) => flat(shape.rect(px + bx - 2, py - 8, 4, 16), [PAL.pink, PAL.inkSoft, PAL.gold][j])); }
        else { ink(shape.circle(px, py, 13, 20), { closed: true, w: K.lw(o, 1.4), fill: '#b9c3cf', amp: 0.3, seed: seed + 90 + i }); ink(shape.circle(px, py, 7, 14), { closed: true, w: K.lw(o, 1), amp: 0.2, alpha: 0.6, seed: seed + 95 + i }); }
      }));
      const chip = K.ph(draw, 0.3, 0.6);
      if (chip > 0) withAlpha(chip, () => {
        const [np, ns] = o.pins.map(v => Math.max(1, Math.round(v)));
        for (const sg of [-1, 1]) { for (let i = 0; i < np; i++) { const px = (i - (np - 1) / 2) * (cw - 40) / Math.max(1, np - 1); flat(shape.rect(px - 4, sg > 0 ? ch / 2 : -ch / 2 - 15, 8, 15), PAL.techMetalLight); }
          for (let i = 0; i < ns; i++) { const py = (i - (ns - 1) / 2) * (ch - 30) / Math.max(1, ns - 1); flat(shape.rect(sg > 0 ? cw / 2 : -cw / 2 - 15, py - 4, 15, 8), PAL.techMetalLight); } }
        ink(K.rrect(-cw / 2, -ch / 2, cw, ch, 6), { closed: true, w: K.lw(o, 2.2), fill: PAL.techChip, amp: 0.5, seed: seed + 100 });
        flat(shape.circle(-cw / 2 + 14, -ch / 2 + 14, 4, 12), '#6b6468');
        text(o.label, 0, 8, { kind: 'mono', size: 20, weight: 600, ls: 3, align: 'center', color: PAL.techScreenInk });
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        text('0x1F·AI', 0, 30, { kind: 'mono', size: 11, ls: 2, align: 'center', color: PAL.techScreenMuted, alpha: 0.6 + 0.4 * pulse });
      });
      ctx.restore();
    });
  }

  const POINTER = [[0, 0], [0, 30], [7, 23], [13, 36], [19, 33], [13, 21], [22, 21]];
  /** cursor(t, {x, y, path, period, dark}): a mouse pointer hopping between the points of path (relative to x, y),
      clicking at each stop with a ripple. period: seconds per hop. Draw it last so it sits on top. */
  function cursor(t, o) {
    o = K.opts(o, { path: [[0, 0], [160, 60], [60, 140]], period: 1.3 });
    return K.at(o, () => {
      const { path, period, dark } = o, n = path.length, [i, f] = K.cyc(t, period);
      const a = path[i % n], b = path[(i + 1) % n], m = E.inOut3(inv(0, 0.55, f));
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, arc = Math.sin(Math.PI * m) * Math.min(30, L * 0.15);
      const px = lerp(a[0], b[0], m) - dy / L * arc, py = lerp(a[1], b[1], m) + dx / L * arc;
      const rp = inv(0.62, 1, f);
      if (rp > 0 && rp < 1) for (let k = 0; k < 2; k++) { const q = clamp(rp * 1.3 - k * 0.3); if (q > 0 && q < 1)
        ink(shape.circle(b[0], b[1], 6 + q * 30, 28), { closed: true, w: K.lw(o, 2), color: PAL.accent, alpha: (1 - q) * 0.9, amp: 0.3, seed: o.seed + k }); }
      const sq = 1 - 0.12 * Math.sin(Math.PI * inv(0.58, 0.72, f)), pop = K.pop(o.draw, 0, 0.6);
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.08); ctx.scale(1.15 * sq * pop, 1.15 * sq * pop);
      if (!dark) flat(POINTER.map(([x, y]) => [x + 3, y + 4]), 'rgba(40,30,20,1)', 0.18);
      ink(POINTER, { closed: true, w: K.lw(o, 2.2), fill: dark ? PAL.nightInk : '#fffdf6', color: dark ? PAL.night : PAL.ink, amp: 0.3, seed: o.seed + 5 });
      ctx.restore();
    });
  }

  return { terminal, code, browser, rack, circuit, cursor };
})();
