/* =====================  KIT.ai · network, agent, chat, tokens, attention  =====================
   Drawn for the night world by default (dark: true); pass dark: false to use them on paper.
   network, chat, tokens and attention take x, y = top-left; agent takes x, y = the agent node's centre.
   See references/components.md. */
var KIT = globalThis.KIT || {}; globalThis.KIT = KIT;
Object.assign(PAL, {
  aiNode: '#26336a', aiNodePaper: '#e3e5f3', aiSignal: '#56c3d2', aiHot: '#e6c65c', aiCard: '#1b1a3c', aiCardPaper: '#f1ece0',
  aiUser: '#ece6d8', aiBot: '#2b3570', aiBotPaper: '#dfe3f2', aiChip: ['#2b3570', '#3b2d63', '#23485a', '#4a3558'], aiChipPaper: ['#dfe3f2', '#efdbe3', '#d6ebe8', '#f1e5c8'],
});
KIT.ai = (() => {
  const K = KIT;
  const inkC = o => K.inkOf(o.dark), fillN = o => o.dark ? PAL.aiNode : PAL.aiNodePaper;

  /** network(t, {x, y, w, h, layers, speed, labels, dark, seed}): a layered neural network. A wave of signals runs from
      the first layer to the last, lighting nodes as it arrives, then starts again. labels: one caption per layer. */
  function network(t, o) {
    o = K.opts(o, { w: 620, h: 380, layers: [3, 5, 5, 2], speed: 0.9, labels: null, dark: true });
    return K.at(o, () => {
      const { w, h, layers, draw, seed } = o, L = layers.length;
      const g = K.memo(`a.net|${w}|${h}|${layers}|${seed}`, () => {
        const mx = Math.max(...layers), gap = Math.min(h / mx, 86);
        const nodes = layers.map((n, l) => Array.from({ length: n }, (_, j) => [l / (L - 1) * w, h / 2 + (j - (n - 1) / 2) * gap]));
        const edges = []; for (let l = 0; l < L - 1; l++) nodes[l].forEach((a, i) => nodes[l + 1].forEach((b, j) => edges.push({ l, a, b, on: hash3(i * 13 + j, l, seed) })));
        return { nodes, edges, r: Math.min(20, gap * 0.26) };
      });
      const ph = (t * o.speed) % (L + 0.8), ic = inkC(o), ea = K.ph(draw, 0.35, 0.9);
      g.edges.forEach((e, k) => { const q = ph - e.l, act = q > 0 && q < 1 && e.on > 0.4;
        ink([e.a, e.b], { w: K.lw(o, act ? 1.6 : 1.1), color: act ? PAL.aiSignal : ic, alpha: ea * (act ? 0.55 : 0.2), amp: 0.5, seed: seed + k,
          draw: K.ph(draw, 0.3 + e.l * 0.12, 0.6 + e.l * 0.12) }); });
      if (draw >= 1) g.edges.forEach((e, k) => { const q = ph - e.l; if (!(q > 0 && q < 1 && e.on > 0.4)) return;
        const u = E.inOut2(q), p = [lerp(e.a[0], e.b[0], u), lerp(e.a[1], e.b[1], u)], v = Math.max(0, u - 0.14), p0 = [lerp(e.a[0], e.b[0], v), lerp(e.a[1], e.b[1], v)];
        pen([p0, p], { w: K.lw(o, 3.2), color: PAL.aiSignal, taper: 0.5, seed: seed + 500 + k, amp: 0.2 });
        flat(shape.circle(p[0], p[1], 3.4, 10), o.dark ? '#e9fbff' : PAL.ink); });
      g.nodes.forEach((col, l) => col.forEach(([x, y], j) => {
        const pop = K.pop(draw, 0.05 + l * 0.1 + j * 0.02, 0.3 + l * 0.1 + j * 0.02); if (pop <= 0) return;
        const act = draw >= 1 ? clamp(1 - Math.abs(ph - l) * 1.4) * (0.35 + 0.65 * hash3(l, j, seed + 3)) : 0, r = g.r * pop;
        if (act > 0.05) flat(shape.circle(x, y, r * (1.35 + 0.25 * act), 24), PAL.aiSignal, 0.22 * act);
        ink(shape.circle(x, y, r, 24), { closed: true, w: K.lw(o, 2), color: ic, fill: fillN(o), amp: 0.5, seed: seed + 100 + l * 10 + j });
        if (act > 0.05) flat(shape.circle(x, y, r * 0.6, 20), PAL.aiSignal, act);
        if (o.dark) speckle(shape.circle(x, y, r * 0.9, 16), 4, { seed: seed + l * 10 + j, alpha: 0.35 });
      }));
      if (o.labels) o.labels.forEach((s, l) => KIT.caption((draw - 0.6) * 5, s, l / (L - 1) * w, h + 34, { dark: o.dark, align: 'center', backing: true }));
    });
  }

  function glyph(kind, x, y, o, t, on) {
    const c = on ? PAL.aiSignal : inkC(o), w = K.lw(o, 1.8), sd = o.seed + 300;
    if (kind === 'search') { ink(shape.circle(x - 2, y - 2, 7, 16), { closed: true, w, color: c, amp: 0.2, seed: sd }); ink([[x + 3, y + 3], [x + 9, y + 9]], { w: w * 1.3, color: c, amp: 0.1 }); }
    else if (kind === 'code') text('</>', x, y + 5, { kind: 'mono', size: 15, weight: 600, align: 'center', color: c, role: 'decor' });   // an icon
    else if (kind === 'files') ink([[x - 10, y - 7], [x - 3, y - 7], [x, y - 4], [x + 10, y - 4], [x + 10, y + 8], [x - 10, y + 8]], { closed: true, w, color: c, amp: 0.2, seed: sd + 1 });
    else if (kind === 'web') { ink(shape.circle(x, y, 9, 18), { closed: true, w, color: c, amp: 0.2, seed: sd + 2 }); ink(shape.ellipse(x, y, 4, 9, 0, 14), { closed: true, w: w * 0.8, color: c, amp: 0.1 }); ink([[x - 9, y], [x + 9, y]], { w: w * 0.8, color: c, amp: 0.1 }); }
    else if (kind === 'db') { ink(shape.ellipse(x, y - 6, 9, 3.5, 0, 16), { closed: true, w, color: c, amp: 0.1 }); ink([[x - 9, y - 6], [x - 9, y + 7]], { w, color: c, amp: 0.1 }); ink([[x + 9, y - 6], [x + 9, y + 7]], { w, color: c, amp: 0.1 }); ink(shape.arc(x, y + 7, 9, 0, Math.PI, 10).map(([a, b]) => [a, y + 7 + (b - y - 7) * 0.4]), { w, color: c, amp: 0.1 }); }
    else ink(shape.rect(x - 8, y - 8, 16, 16), { closed: true, w, color: c, amp: 0.2, seed: sd + 3 });
    if (on) { ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6); ink(shape.arc(0, 0, 15, 0, 1.6, 10), { w: K.lw(o, 2), color: PAL.aiHot, amp: 0 }); ctx.restore(); }
  }
  /** agent(t, {x, y, tools, R, spread, period, name, dark, seed}): an agent node calling tools in turn. Each cycle a
      request arrow travels out to one tool, the tool works, and a dashed response comes back carrying a result chip.
      tools: names or {name, icon} (icons: search, code, files, web, db). The tools fan out to the right. */
  function agent(t, o) {
    o = K.opts(o, { tools: ['search', 'code', 'files', 'web'], R: 300, spread: 1.15, period: 2.4, name: 'AGENT', dark: true });
    return K.at(o, () => {
      const { R, draw, seed } = o, ic = inkC(o), n = o.tools.length;
      const tools = o.tools.map((tl, i) => { const nm = typeof tl === 'string' ? tl : tl.name, a = n > 1 ? lerp(-o.spread / 2, o.spread / 2, i / (n - 1)) : 0;
        return { name: nm, icon: typeof tl === 'string' ? tl : tl.icon || tl.name, x: Math.cos(a) * R, y: Math.sin(a) * R * 1.05 }; });
      const [ci, f] = K.cyc(t, o.period), k = ci % n, live = draw >= 1;
      const paths = K.memo(`a.agent|${R}|${o.spread}|${n}`, () => tools.map(tl => { const a = Math.atan2(tl.y, tl.x), s = [Math.cos(a) * 80, Math.sin(a) * 80], e = [tl.x - Math.cos(a) * 80, tl.y - Math.sin(a) * 34];
        const nx = -Math.sin(a), ny = Math.cos(a), mid = (d) => [(s[0] + e[0]) / 2 + nx * d, (s[1] + e[1]) / 2 + ny * d];
        return { out: smooth([s, mid(-22), e].map(([x, y]) => [x - nx * 8, y - ny * 8]), 3), back: smooth([e, mid(22), s].map(([x, y]) => [x + nx * 8, y + ny * 8]), 3) }; }));
      tools.forEach((tl, i) => ink(paths[i].out, { w: K.lw(o, 1.2), color: ic, alpha: 0.18 * K.ph(draw, 0.4, 0.8), amp: 0.4, seed: seed + 10 + i, dash: [3, 8] }));
      if (live) {
        const P = paths[k], env = 1 - inv(0.9, 1, f);
        withAlpha(env, () => {
          arrowPath(P.out, { draw: E.inOut3(inv(0, 0.3, f)), color: ic, w: K.lw(o, 2.4), seed: seed + 20 });
          const rp = inv(0.52, 0.85, f);
          if (rp > 0) { arrowPath(P.back, { draw: E.inOut3(rp), color: PAL.aiSignal, w: K.lw(o, 2.4), dash: [9, 7], seed: seed + 21 });
            const [cx, cy] = along(P.back, E.inOut3(rp)); ink(K.rrect(cx - 16, cy - 10, 32, 20, 5), { closed: true, w: K.lw(o, 1.4), fill: PAL.aiHot, color: o.dark ? PAL.night : PAL.ink, amp: 0.3, seed: seed + 22 });
            [0, 1].forEach(j => ink([[cx - 9, cy - 3 + j * 6], [cx + 9 - j * 6, cy - 3 + j * 6]], { w: K.lw(o, 1.4), color: PAL.ink, amp: 0.1 })); }
          const [mx, my] = along(P.out, 0.5);
          text(typed('call()', (f - 0.05) * o.period, 30), mx, my - 16, { kind: 'mono', size: 13, align: 'center', color: K.mutedOf(o.dark), role: 'decor' });   // flies past with the call: motion ornament
        });
      }
      tools.forEach((tl, i) => {
        const pop = K.pop(draw, 0.3 + i * 0.08, 0.6 + i * 0.08); if (pop <= 0) return;
        const on = live && i === k && f > 0.28 && f < 0.62, work = on ? Math.sin(Math.PI * inv(0.28, 0.62, f)) : 0;
        ctx.save(); ctx.translate(tl.x, tl.y); ctx.scale(pop * (1 + 0.06 * work), pop * (1 + 0.06 * work));
        const cw = Math.max(122, measure(tl.name, { kind: 'mono', size: 22, weight: 600 }) + 64), card = K.rrect(-cw / 2, -26, cw, 52, 12);
        if (work > 0) ink(K.rrect(-cw / 2 - 8, -34, cw + 16, 68, 16), { closed: true, w: K.lw(o, 2), color: PAL.aiSignal, alpha: work * 0.7, amp: 0.5, seed: seed + 40 + i });
        ink(card, { closed: true, w: K.lw(o, on ? 2.4 : 1.8), color: on ? PAL.aiSignal : ic, fill: o.dark ? PAL.aiCard : PAL.aiCardPaper, amp: 0.5, seed: seed + 30 + i });
        glyph(tl.icon, -cw / 2 + 24, 0, o, t, on);
        text(tl.name, -cw / 2 + 44, 7, { kind: 'mono', size: 22, weight: 600, color: ic, alpha: (live && i !== k ? 0.8 : 1) * clamp((pop - 0.8) * 5) });   // names show once the chip has popped
        ctx.restore();
      });
      const ap = K.pop(draw, 0, 0.4); if (ap <= 0) return;
      ctx.save(); ctx.scale(ap, ap);
      if (o.dark) flat(shape.circle(0, 0, 78, 36), PAL.aiSignal, 0.06 + 0.04 * Math.sin(t * 2));
      ctx.save(); ctx.rotate(t * 0.6); ctx.setLineDash([10, 9]); ctx.strokeStyle = PAL.peri; ctx.lineWidth = K.lw(o, 1.6); ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.stroke(); ctx.restore();
      const core = shape.circle(0, 0, 56, 40);
      ink(core, { closed: true, w: K.lw(o, 2.6), color: ic, fill: fillN(o), amp: 0.6, seed: seed + 1, double: true });
      if (o.dark) speckle(core, 30, { seed: seed + 2, alpha: 0.3 });
      for (let j = 0; j < 3; j++) { const a = t * 2.2 + j * TAU / 3; flat(shape.circle(Math.cos(a) * 34, Math.sin(a) * 34 - 4, 3.6, 10), j ? PAL.aiSignal : PAL.aiHot); }
      text(o.name, 0, 8, { kind: 'mono', size: 22, weight: 600, ls: 2, align: 'center', color: ic, alpha: clamp((ap - 0.8) * 5) });
      ctx.restore();
    });
  }

  function wrapLines(s, maxW, size) {
    const out = []; let cur = '';
    for (const wd of s.split(' ')) { const tr = cur ? cur + ' ' + wd : wd; if (cur && measure(tr, { kind: 'sans', size }) > maxW) { out.push(cur); cur = wd; } else cur = tr; }
    if (cur) out.push(cur); return out;
  }
  function dots(x, y, t, c) { for (let i = 0; i < 3; i++) flat(shape.circle(x + (i - 1) * 13, y - 5 * Math.max(0, Math.sin(t * 7 - i * 0.9)), 4, 10), c, 0.9); }
  /** chat(t, {x, y, w, msgs, t0, size, dark}): a chat thread. msgs = [{who: 'user'|'ai', text}]. User bubbles pop in
      on the right; the assistant shows typing dots, then its reply types on. After the last message the typing dots
      keep bouncing. The thread grows downward from (x, y); returns { h }, its full height (before scaling by s). */
  function chat(t, o) {
    o = K.opts(o, { w: 520, t0: 0.4, size: 22, dark: true,
      msgs: [{ who: 'user', text: 'Can you find the failing test?' }, { who: 'ai', text: 'Found it: the date parser drops the timezone. Want a fix?' }, { who: 'user', text: 'Yes please' }] });
    return K.at(o, () => {
      const { w, size, dark } = o, pad = 14, lh = size * 1.32, ic = inkC(o);
      const L = K.memo(`a.chat|${w}|${size}|${o.msgs.map(m => m.who + m.text).join('|')}`, () => { let c = 0, y = 0;
        const items = o.msgs.map(m => { const lines = wrapLines(m.text, w * 0.7 - 2 * pad, size), bw = Math.max(...lines.map(s => measure(s, { kind: 'sans', size }))) + 2 * pad, bh = lines.length * lh + 2 * pad - 6;
          const ai = m.who !== 'user', it = { ai, lines, bw, bh, y, n: m.text.length, st: ai ? c + 0.9 : c, typ: ai ? c : null };
          c += ai ? 0.9 + m.text.length / 40 + 0.7 : 0.35 + m.text.length / 60 + 0.5; y += bh + 16; return it; });
        return { items, end: c, endY: y }; });
      const tt = t - o.t0, bx = it => it.ai ? 44 : w - it.bw;
      const bubble = (it, x, y, bw, bh, sc) => {
        const tip = it.ai ? [x - 2, y + bh] : [x + bw + 2, y + bh];
        ctx.save(); ctx.translate(tip[0], tip[1]); ctx.scale(sc, sc); ctx.translate(-tip[0], -tip[1]);
        const body = K.rrect(x, y, bw, bh, 16), tail = it.ai ? [[x + 1, y + bh - 20], [x - 7, y + bh + 8], [x + 22, y + bh - 1]] : [[x + bw - 1, y + bh - 20], [x + bw + 7, y + bh + 8], [x + bw - 22, y + bh - 1]];
        const fill = it.ai ? (dark ? PAL.aiBot : PAL.aiBotPaper) : PAL.aiUser, edge = it.ai ? ic : PAL.ink;
        if (!dark) K.shadow(body, 3, 4, 0.1);
        ink(body, { closed: true, w: K.lw(o, 1.8), color: edge, fill, amp: 0.5, seed: o.seed + 6 + Math.round(y) });
        flat(tail, fill); ink(tail, { w: K.lw(o, 1.8), color: edge, amp: 0.3, seed: o.seed + 5 });
        ctx.restore();
      };
      const avatar = (y, a) => withAlpha(a, () => { ink(shape.circle(16, y + 18, 16, 20), { closed: true, w: K.lw(o, 1.6), color: ic, fill: dark ? PAL.aiNode : PAL.aiNodePaper, amp: 0.3, seed: o.seed + 9 });
        const sp = Array.from({ length: 8 }, (_, j) => { const a2 = j * TAU / 8 + t * 0.6, rr = j % 2 ? 3 : 10 + Math.sin(t * 3); return [16 + Math.cos(a2) * rr, y + 18 + Math.sin(a2) * rr]; });
        ink(sp, { closed: true, w: K.lw(o, 1), color: PAL.aiSignal, fill: PAL.aiSignal, amp: 0.2, seed: o.seed + 10 }); });
      L.items.forEach(it => {
        if (it.ai && tt >= it.typ && tt < it.st) { const sc = E.outBack(clamp((tt - it.typ) * 4)); avatar(it.y, sc); bubble(it, 44, it.y, 76, 40, sc); dots(82, it.y + 22, t, ic); return; }
        if (tt < it.st) return;
        const sc = it.ai ? 1 : E.outBack(clamp((tt - it.st) * 4)), x = bx(it);
        if (it.ai) avatar(it.y, 1);
        bubble(it, x, it.y, it.bw, it.bh, sc);
        let left = it.ai ? Math.floor((tt - it.st) * 40) : it.n;
        it.lines.forEach((s, j) => { if (left <= 0) return; text(s.slice(0, left), x + pad, it.y + pad + size * 0.8 + j * lh, { kind: 'sans', size, color: it.ai ? ic : PAL.ink, alpha: sc }); left -= s.length + 1; });
      });
      if (tt > L.end) { const y = L.endY, a = clamp((tt - L.end) * 3); avatar(y, a); withAlpha(a, () => { bubble({ ai: true }, 44, y, 76, 40, 1); dots(82, y + 22, t, ic); }); }
      return { h: L.endY + 48 };                                                // full thread height, trailing typing bubble included
    });
  }

  /** tokens(t, {x, y, w, words, rate, t0, loop, size, dark}): a model writing: token chips pop onto a line one by one
      (the line slides left when it fills), each with its id underneath, and a small panel under the newest chip shows
      the candidate next tokens and their odds. loop: true repeats after a pause. */
  function tokens(t, o) {
    o = K.opts(o, { w: 720, rate: 2.6, t0: 0.5, loop: true, size: 22, dark: true, words: ['The', ' cat', ' sat', ' on', ' the', ' warm', ' mat', '.'] });
    return K.at(o, () => {
      const { w, size, dark, words, seed } = o, n = words.length, ic = inkC(o), chips = dark ? PAL.aiChip : PAL.aiChipPaper;
      const G = K.memo(`a.tok|${words.join('|')}|${size}|${seed}`, () => ({ cw: words.map(s => measure(s.replace(/^ /, '·'), { kind: 'mono', size }) + 22),
        ids: words.map((_, i) => 100 + Math.floor(hash3(i, seed) * 29000)), cand: words.map((s, i) => [s, ...['the', ' a', ' it', ' on', ' and', ' is'].filter((_, k) => (k + i) % 3 === 0).slice(0, 2)]) }));
      const period = n / o.rate + 2.8;
      let tt = t - o.t0; if (tt < 0) return;
      let fade = 1; if (o.loop) { fade = 1 - inv(period - 0.5, period, tt % period) ; tt = tt % period; }
      const tg = tt * o.rate;
      let right = 0; const xs = G.cw.map((cw, i) => { const g = clamp((tg - i) * 3); const x = right; right += (cw + 8) * g; return [x, g]; });
      const off = Math.max(0, right - (w - 10));
      withAlpha(fade * K.ph(o.draw, 0, 0.5), () => {
        ctx.save(); ctx.beginPath(); ctx.rect(-6, -40, w + 12, 240); ctx.clip();
        ink([[-6, 64], [w, 64]], { w: K.lw(o, 1), color: PAL.peri, amp: 0.3, alpha: 0.4, seed: seed + 1 });
        xs.forEach(([x0, g], i) => { if (g <= 0) return;
          const x = x0 - off, sc = E.outBack(g), fa = clamp((x + 6) / 50);
          withAlpha(fa, () => {
            ctx.save(); ctx.translate(x + G.cw[i] / 2, 20); ctx.scale(sc, sc);
            ink(K.rrect(-G.cw[i] / 2, -20, G.cw[i], 40, 9), { closed: true, w: K.lw(o, 1.6), color: ic, fill: chips[i % chips.length], amp: 0.4, seed: seed + 10 + i });
            text(words[i].replace(/^ /, '·'), 0, 7, { kind: 'mono', size, weight: 600, align: 'center', color: ic, alpha: clamp((g - 0.6) / 0.3) });   // the word shows once its chip has popped
            ctx.restore();
            text(String(G.ids[i]), x + G.cw[i] / 2, 86, { kind: 'mono', size: 12, align: 'center', color: K.mutedOf(dark), alpha: g, role: 'decor' });   // token ids: texture
          });
        });
        const cur = Math.floor(tg), ci = cur + 1, cf = tg - cur;     // the panel weighs up the token that comes next
        if (ci < n) {
          const cx = Math.min(w - 180, right - off + 14), cand = G.cand[ci];
          flat(shape.rect(cx - 8, 2, 3, 36), ic, Math.floor(t * 4) % 2 ? 0.2 : 0.9);
          withAlpha(E.out3(clamp(cf * 4)) * (1 - inv(0.8, 1, cf)), () => {
            ink([[cx - 6, 44], [cx + 10, 104]], { w: K.lw(o, 1.2), color: PAL.peri, amp: 0.3, alpha: 0.7 });
            cand.forEach((s, j) => { const p = j === 0 ? 0.55 + 0.25 * hash3(ci, 3, seed) : (0.3 - j * 0.1) * (0.6 + 0.4 * hash3(ci, j, Math.floor(t * 6))), y = 118 + j * 30;
              haloText(s.replace(/^ /, '·'), cx + 16, y + 7, { kind: 'mono', size: 22, dark, color: j ? K.labelOf(dark) : ic, weight: j ? 400 : 600 });
              flat(shape.rect(cx + 92, y - 5, 80 * p * E.out3(clamp(cf * 3)), 10), j ? PAL.peri : PAL.aiHot, j ? 0.6 : 1); });
          });
        }
        ctx.restore();
      });
    });
  }

  /** attention(t, {x, y, w, words, period, dark, seed}): self-attention over a sentence. Each period one word is the
      query; arcs from it to every other word swell by weight, and the key words underline by weight. */
  function attention(t, o) {
    o = K.opts(o, { w: 720, words: ['the', 'robot', 'lifted', 'the', 'box', 'because', 'it', 'was', 'light'], period: 1.7, dark: true, focus: null });
    return K.at(o, () => {
      const { w, words, dark, seed, draw } = o, n = words.length, ic = inkC(o), xs = words.map((_, i) => (i + 0.5) / n * w);
      const [ci, f] = K.cyc(t, o.period), q = o.focus ?? (ci % n), live = draw >= 1;
      const wts = words.map((_, j) => j === q ? 0 : hash3(q, j, seed) ** 2.2), mx = Math.max(...wts) || 1;
      const env = E.out3(inv(0, 0.3, f)) * (1 - E.in2(inv(0.82, 1, f)));
      if (live) words.forEach((_, j) => { if (j === q) return; const wt = wts[j] / mx, x0 = xs[q], x1 = xs[j], hh = Math.min(170, Math.abs(x1 - x0) * 0.55 + 20);
        const arc = Array.from({ length: 25 }, (_, k) => { const u = k / 24; return [lerp(x0, x1, u), -12 - Math.sin(Math.PI * u) * hh]; });
        pen(arc, { w: K.lw(o, 1 + 7 * wt), color: wt > 0.6 ? (dark ? PAL.aiHot : '#b07a1c') : (dark ? PAL.aiSignal : PAL.sea), alpha: env * (0.25 + 0.75 * wt), draw: E.out3(inv(0, 0.35, f)), taper: 0.15, seed: seed + j });
        if (wt === 1) text(wts[j].toFixed(2), (x0 + x1) / 2, -18 - hh, { kind: 'mono', size: 13, weight: 600, align: 'center', color: dark ? PAL.aiHot : '#b07a1c', alpha: env, role: 'decor' }); });   // the weight rides the arc
      words.forEach((s, j) => {
        const pop = K.pop(draw, j / n * 0.6, j / n * 0.6 + 0.3); if (pop <= 0) return;
        const isQ = live && j === q, bw = measure(s, { kind: 'mono', size: 22, weight: 600 }) + 18;
        ctx.save(); ctx.translate(xs[j], 0); ctx.scale(pop, pop);
        ink(K.rrect(-bw / 2, -2, bw, 38, 8), { closed: true, w: K.lw(o, isQ ? 2.4 : 1.4), color: isQ ? PAL.accent : ic, fill: dark ? PAL.aiCard : PAL.aiCardPaper, amp: 0.4, seed: seed + 50 + j });
        text(s, 0, 25, { kind: 'mono', size: 22, weight: isQ ? 600 : 400, align: 'center', color: ic, alpha: clamp((pop - 0.8) * 5) });
        if (live && !isQ) flat(shape.rect(-bw / 2 + 4, 44, (bw - 8) * (wts[j] / mx) * env, 5), dark ? PAL.aiHot : '#b07a1c', 0.85);
        if (isQ) text('query', 0, 68, { kind: 'mono', size: 22, ls: 1, align: 'center', color: legible(PAL.accent, dark), alpha: env });
        ctx.restore();
      });
    });
  }

  /** motes(t, {x, y, w, h, n, speed, dark, seed}): a drifting crowd of data specks (dots, bits and dashes) for the
      back layer of a night plate. Nearer specks are bigger and faster; some flicker. */
  function motes(t, o) {
    o = K.opts(o, { w: 1920, h: 1080, n: 140, speed: 1, dark: true });
    return K.at(o, () => {
      const { w, h, n, draw, seed, dark } = o;
      const M = K.memo(`a.motes|${w}|${h}|${n}|${seed}|${dark}`, () => { const r = mulberry(seed);
        return Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, z: 0.3 + r() * 0.7, k: Math.floor(r() * 3), ph: r() * TAU, u: r(), c: r() < 0.25 ? PAL.aiSignal : r() < 0.1 ? PAL.aiHot : (dark ? PAL.nightInk : PAL.inkSoft) })); });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
      M.forEach((m, i) => {
        const a = clamp(draw * 2 - m.u) * (0.3 + 0.5 * m.z) * (0.6 + 0.4 * Math.sin(t * 3 + m.ph)); if (a <= 0.02) return;
        const [dx, dy] = wander(i, t, 14 * m.z, 0.5, seed), x = ((m.x + t * 38 * m.z * o.speed + dx) % (w + 40) + w + 40) % (w + 40) - 20, y = m.y + dy - t * 6 * m.z;
        const yy = ((y % h) + h) % h, s = 1.4 + 3.2 * m.z;
        if (m.k === 0) flat(shape.circle(x, yy, s, 10), m.c, a);
        else if (m.k === 1) text(hash3(i, Math.floor(t * 2 + m.ph), seed) < 0.5 ? '0' : '1', x, yy, { kind: 'mono', size: Math.round(9 + 9 * m.z), color: m.c, alpha: a });
        else ink([[x - s * 2.5, yy], [x + s * 2.5, yy]], { w: 1 + m.z * 1.4, color: m.c, alpha: a, amp: 0.2, seed: seed + i });
      });
      ctx.restore();
    });
  }

  return { network, agent, chat, tokens, attention, motes };
})();
