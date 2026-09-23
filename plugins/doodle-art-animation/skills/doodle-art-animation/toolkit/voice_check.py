#!/usr/bin/env python3
"""voice_check.py - the deeper checks on a film's narration clips. Claude cannot hear audio, so every clip is
checked by measurement, and optionally by a model that can listen.

usage: python3 voice_check.py vo/voice.json [--lines vo/lines.json] [--json out.json] [--listen]
         [--transcriber gemini|whisper|none] [--transcripts file.json] [--only P1,P2] [--no-basic]

`node voice.mjs check` runs this for you (with --no-basic, since voice.mjs already measured pace, silence and
loudness) and merges its flags into vo/voice.json. Run it by hand for the listening pass (--listen) or on its own.

What it checks, per clip:
  words     a transcript of the clip compared with the script. A missing word fails; three or more extra words
            fail (usually a style direction read aloud), one or two warn, and extra words that are the direction or
            a delivery tag ("short pause") fail and say so. Numbers, "%" and letter-by-letter acronyms are matched
            in either spelling ("430" = "four hundred thirty"), and near-misses of one word ("meloxicam" /
            "meloxicom") pass, because transcripts misspell rare words the voice said correctly.
  pace      words a minute over the speech (first to last sound), against voice.json's wpm_target: more than 35%
            off fails (a wrong-speed clip), more than 15% warns. (Skipped with --no-basic.)
  silence   a clip with no speech fails; a gap over 1.2 s inside the speech warns. (Skipped with --no-basic.)
  voice     the clip's median pitch and brightness (spectral centroid) against the film's median of the other
            clips: pitch more than 20% off, or brightness more than 35% off, warns that the take may sound like a
            different person (Gemini sometimes changes speaker between requests). Needs 3 clips or more.
  listen    with --listen: the clip, its script and its direction go to Gemini Flash, which scores how well the
            delivery matches the direction (1-5) and lists mispronounced words, odd pauses and glitches. A score
            of 2 or less, or any glitch, warns. It is one model's opinion, so it never fails a clip on its own.
            About 0.1 cent a clip.

Transcripts come from Gemini (gemini-2.5-flash; DOODLE_VOICE_CHECK_MODEL changes it) by default, or from
faster-whisper with --transcriber whisper (python3 -m pip install faster-whisper; the model downloads from Hugging
Face the first time; DOODLE_WHISPER_MODEL, default base.en), which also gives each word's time in the output.
--transcripts file.json ({"P1": "the words heard", ...}; DOODLE_VOICE_TRANSCRIPTS does the same) uses fixed
transcripts, for tests. The fake test voice is tones, so its clips get no transcript unless one is given.

Gemini requests go to DOODLE_GEMINI_BASE_URL (default https://generativelanguage.googleapis.com) with the key from
GEMINI_API_KEY, GOOGLE_API_KEY, CLAUDE_PLUGIN_OPTION_GEMINI_API_KEY or ~/.config/doodle-art-animation/keys.env.
With no key the request goes out without one, because a claude.ai cloud environment's proxy adds it. Python's
urllib goes through HTTPS_PROXY on its own. A transcript that cannot be had (no key, no network) is a note, not a
failure: the other checks still run.

--json out.json writes { version: 1, units: { P1: { missing, extra, transcript, words, pitch_hz, centroid_hz,
wpm, listen, flags } }, cost } and prints only notes. Flags start with "fail:" or "warn:".
Exit codes: 0 no failures, 1 a clip failed a check, 2 something to fix first (a missing file, a bad option).
"""
import base64, difflib, json, math, os, re, sys, urllib.error, urllib.request, wave

try:
    import numpy as np
except ImportError:
    sys.exit('voice_check: needs numpy (python3 -m pip install numpy)')

MODEL = os.environ.get('DOODLE_VOICE_CHECK_MODEL', 'gemini-2.5-flash')
BASE = os.environ.get('DOODLE_GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com').rstrip('/')
FILLERS = {'uh', 'um', 'er', 'erm', 'hmm', 'ah'}
PRICE_IN_AUDIO, PRICE_IN_TEXT, PRICE_OUT = 1.00 / 1e6, 0.30 / 1e6, 2.50 / 1e6   # gemini-2.5-flash, $ per token


def note(msg):
    print('voice_check: ' + msg, file=sys.stderr, flush=True)


def setup_error(msg):
    note(msg)
    sys.exit(2)


# ---------------------------------------------------------------- options
args = sys.argv[1:]
if not args or args[0] in ('-h', '--help') or args[0].startswith('--'):
    print(__doc__)
    sys.exit(0 if args and args[0] in ('-h', '--help') else 2)
VOICE = os.path.abspath(args[0])
BOOL = {'--listen', '--no-basic'}
opts = {}
i = 1
while i < len(args):
    a = args[i]
    if a in BOOL:
        opts[a] = True
    elif a.startswith('--') and i + 1 < len(args):
        opts[a] = args[i + 1]
        i += 1
    else:
        setup_error(f'unknown option {a} (see the top of voice_check.py)')
    i += 1
transcriber = opts.get('--transcriber', os.environ.get('DOODLE_VOICE_TRANSCRIBER', 'gemini'))
if transcriber not in ('gemini', 'whisper', 'none'):
    setup_error(f'--transcriber is gemini, whisper or none (it was given "{transcriber}")')

if not os.path.exists(VOICE):
    setup_error(f'no {VOICE}; run node voice.mjs generate first')
V = json.load(open(VOICE))
FILM = os.path.dirname(os.path.dirname(VOICE)) if os.path.basename(os.path.dirname(VOICE)) == 'vo' else os.path.dirname(VOICE)
L = {}
lines_path = opts.get('--lines') or os.path.join(os.path.dirname(VOICE), 'lines.json')
if os.path.exists(lines_path):
    L = json.load(open(lines_path))
lines_by_id = {u.get('id'): u for u in L.get('units', [])}
fixed = {}
tp = opts.get('--transcripts') or os.environ.get('DOODLE_VOICE_TRANSCRIPTS')
if tp:
    if not os.path.exists(tp):
        setup_error(f'no transcripts file {tp}')
    fixed = json.load(open(tp))
only = {s.strip() for s in (opts.get('--only') or '').split(',') if s.strip()}
units = [u for u in V.get('units', []) if u.get('file') and (not only or u['id'] in only)]


# ---------------------------------------------------------------- audio
def read_wav(path):
    with wave.open(path, 'rb') as w:
        rate, n, ch, width = w.getframerate(), w.getnframes(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(n)
    if width != 2:
        raise ValueError(f'{path} is not 16-bit')
    x = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    return x, rate


def frames(x, rate, win=0.04, hop=0.01):
    n, h = int(win * rate), int(hop * rate)
    if len(x) < n:
        return np.zeros((0, n), dtype=np.float32), h
    idx = np.arange(0, len(x) - n + 1, h)
    return np.stack([x[j:j + n] for j in idx]), h


def speech_span(x, rate):
    """first and last sound, and gaps inside the speech (seconds), from 10 ms energy frames"""
    f, h = frames(x, rate, 0.02, 0.01)
    if not len(f):
        return None, None, []
    db = 10 * np.log10(np.mean(f ** 2, axis=1) + 1e-12)
    if db.max() < -60:
        return None, None, []
    on = db > max(db.max() - 35, -55)
    idx = np.flatnonzero(on)
    t0, t1 = idx[0] * h / rate, (idx[-1] * h + f.shape[1]) / rate
    gaps, start = [], None
    for k in range(idx[0], idx[-1] + 1):
        if not on[k] and start is None:
            start = k
        elif on[k] and start is not None:
            gaps.append((start * h / rate, k * h / rate))
            start = None
    return t0, t1, gaps


def voice_print(x, rate):
    """median pitch (Hz) over voiced frames, by autocorrelation, and median spectral centroid (Hz)"""
    f, _ = frames(x, rate, 0.04, 0.01)
    if not len(f):
        return None, None
    e = np.mean(f ** 2, axis=1)
    loud = f[e > max(e.max() * 10 ** (-25 / 10), 1e-9)]
    if not len(loud):
        return None, None
    win = np.hanning(f.shape[1]).astype(np.float32)
    spec = np.abs(np.fft.rfft(loud * win, axis=1))
    hz = np.fft.rfftfreq(f.shape[1], 1 / rate)
    cent = float(np.median((spec * hz).sum(axis=1) / (spec.sum(axis=1) + 1e-9)))
    lo, hi = int(rate / 400), int(rate / 60)
    ac = np.fft.irfft(np.abs(np.fft.rfft(loud - loud.mean(axis=1, keepdims=True), n=2 * f.shape[1], axis=1)) ** 2, axis=1)
    ac = ac[:, :hi + 1] / (ac[:, :1] + 1e-12)
    lag = lo + np.argmax(ac[:, lo:hi + 1], axis=1)
    strength = ac[np.arange(len(lag)), lag]
    voiced = lag[strength > 0.5]
    pitch = float(np.median(rate / voiced)) if len(voiced) >= 5 else None
    return pitch, cent


# ---------------------------------------------------------------- words
ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()


def say_int(n):
    if n < 20:
        return [ONES[n]]
    if n < 100:
        return [TENS[n // 10]] + (say_int(n % 10) if n % 10 else [])
    if n < 1000:
        return say_int(n // 100) + ['hundred'] + (say_int(n % 100) if n % 100 else [])
    for size, name in ((10 ** 12, 'trillion'), (10 ** 9, 'billion'), (10 ** 6, 'million'), (1000, 'thousand')):
        if n >= size:
            return say_int(n // size) + [name] + (say_int(n % size) if n % size else [])
    return [str(n)]


def say_number(tok):
    tok = tok.replace(',', '')
    if re.fullmatch(r'(1[1-9]|20)\d\d', tok):                    # a year: 1953 -> nineteen fifty three
        a, b = int(tok[:2]), int(tok[2:])
        return say_int(a) + (['hundred'] if b == 0 else ['oh'] + say_int(b) if b < 10 else say_int(b))
    if '.' in tok:
        a, b = tok.split('.', 1)
        return (say_int(int(a)) if a else ['zero']) + ['point'] + [ONES[int(d)] for d in b if d.isdigit()]
    return say_int(int(tok)) if tok.isdigit() else [tok]


def words_of(text):
    text = re.sub(r'\{[^}]*\}|\[[^\]]*\]', ' ', text)                # marks and delivery tags
    text = text.replace('%', ' percent ').replace('&', ' and ').replace('°C', ' degrees celsius ')
    out = []
    for tok in re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d[\d,]*(?:\.\d+)?", text):
        if tok[0].isdigit():
            out += say_number(tok)
        else:
            t = tok.lower().replace("'", '')
            if t not in FILLERS:
                out.append(t)
    num = set(ONES) | set(TENS) | {'hundred', 'thousand', 'million', 'billion', 'trillion'}
    return [w for k, w in enumerate(out)                            # "four hundred and thirty" = "four hundred thirty"
            if not (w == 'and' and 0 < k < len(out) - 1 and out[k - 1] == 'hundred' and out[k + 1] in num)]


SMALL = {'a', 'an', 'the', 'and', 'or', 'with', 'in', 'at', 'on', 'of', 'to', 'like', 'but', 'not', 'it', 'is', 'this', 'that'}


def read_aloud(extra, direction, tags):
    """what among the extra words heard was meant for the voice, not the listener: the direction, or a delivery tag.
    A tag counts when its words were heard together; the direction when two or more of its own words (not small
    ones like "with") were heard and make up at least half of the extra words."""
    found, heard = [], ' ' + ' '.join(extra) + ' '
    hits = [w for w in extra if w in set(words_of(direction or '')) - SMALL]
    if len(hits) >= 3 or (len(hits) >= 2 and len(hits) * 2 >= len(extra)):
        found.append('the direction')
    for tag in dict.fromkeys(tags):
        w = ' '.join(words_of(tag))
        if w and f' {w} ' in heard:
            found.append(f'the tag [{tag}]')
    return found


def compare(script, heard):
    """missing and extra words between the script and a transcript, forgiving spelling and spacing differences"""
    a, b = words_of(script), words_of(heard)
    missing, extra = [], []
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for op, i0, i1, j0, j1 in sm.get_opcodes():
        if op == 'equal':
            continue
        sa, sb = ''.join(a[i0:i1]), ''.join(b[j0:j1])
        if op == 'replace' and difflib.SequenceMatcher(a=sa, b=sb).ratio() >= 0.75:
            continue                                               # "p c l" vs "pcl", "meloxicam" vs "meloxicom"
        if op == 'replace' and i1 - i0 == j1 - j0 and all(difflib.SequenceMatcher(a=x, b=y).ratio() >= 0.7 for x, y in zip(a[i0:i1], b[j0:j1])):
            continue
        missing += a[i0:i1]
        extra += b[j0:j1]
    return missing, extra


# ---------------------------------------------------------------- Gemini and whisper
def gemini_key():
    for k in ('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'CLAUDE_PLUGIN_OPTION_GEMINI_API_KEY', 'CLAUDE_PLUGIN_OPTION_GOOGLE_API_KEY'):
        if os.environ.get(k):
            return os.environ[k]
    f = os.environ.get('DOODLE_KEYS_FILE') or os.path.expanduser('~/.config/doodle-art-animation/keys.env')
    if os.path.exists(f):
        for line in open(f):
            m = re.match(r'\s*(?:export\s+)?(GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*["\']?([^"\'\s]+)', line)
            if m:
                return m.group(2)
    return None


cost = 0.0


def gemini(path, prompt, as_json=False):
    global cost
    body = {'contents': [{'parts': [{'inline_data': {'mime_type': 'audio/wav', 'data': base64.b64encode(open(path, 'rb').read()).decode()}},
                                    {'text': prompt}]}],
            'generationConfig': {'temperature': 0, **({'responseMimeType': 'application/json'} if as_json else {})}}
    headers = {'content-type': 'application/json'}
    key = gemini_key()
    if key:
        headers['x-goog-api-key'] = key
    req = urllib.request.Request(f'{BASE}/v1beta/models/{MODEL}:generateContent', data=json.dumps(body).encode(), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            res = json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise RuntimeError('Gemini refused the request (no working key: set GEMINI_API_KEY)')
        raise RuntimeError(f'Gemini answered {e.code}')
    use = res.get('usageMetadata', {})
    cost += use.get('promptTokenCount', 0) * PRICE_IN_AUDIO + use.get('candidatesTokenCount', 0) * PRICE_OUT
    parts = (res.get('candidates') or [{}])[0].get('content', {}).get('parts', [])
    text = ''.join(p.get('text', '') for p in parts).strip()
    if not as_json:
        return text
    m = re.search(r'\{.*\}', text, re.S)
    return json.loads(m.group(0)) if m else {}


def transcribe_gemini(path):
    return gemini(path, 'Transcribe this speech exactly, word for word, as plain text. Write every word that is spoken, '
                        'including any instructions or stage directions that are read aloud. Write numbers the way they '
                        'are spoken. Do not add anything else.')


_whisper = None


def transcribe_whisper(path):
    global _whisper
    if _whisper is None:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            raise RuntimeError('faster-whisper is not installed (python3 -m pip install faster-whisper)')
        _whisper = WhisperModel(os.environ.get('DOODLE_WHISPER_MODEL', 'base.en'), device='cpu', compute_type='int8')
    segs, _ = _whisper.transcribe(path, word_timestamps=True, beam_size=5, language='en')
    words = [[round(w.start, 3), round(w.end, 3), w.word.strip()] for s in segs for w in (s.words or [])]
    return ' '.join(w[2] for w in words), words


def listen(path, text, direction):
    return gemini(path, 'You are checking a narration clip for a short science film. The narrator was given this '
                        f'direction: "{direction or "a calm documentary narrator"}". The script was: "{text}". '
                        'Listen and answer in JSON only: {"direction_match": 1-5 (5 = the delivery fits the direction), '
                        '"mispronounced": [words said wrongly], "odd_pauses": [short descriptions with the word they '
                        'follow], "glitches": [clicks, distortion, garbled or doubled words, a sudden change of voice], '
                        '"notes": a one-sentence summary of the delivery}. Use empty lists when there is nothing to report.', as_json=True)


# ---------------------------------------------------------------- checks
out = {}
target = V.get('wpm_target') or L.get('wpm') or 140
prints = {}
transcript_note = None
for u in units:
    uid, flags = u['id'], []
    r = out[uid] = {'missing': [], 'extra': [], 'flags': flags}
    path = os.path.join(FILM, u['file'])
    if not os.path.exists(path):
        flags.append(f'fail: the clip {u["file"]} is missing')
        continue
    x, rate = read_wav(path)
    t0, t1, gaps = speech_span(x, rate)
    text = u.get('text') or lines_by_id.get(uid, {}).get('text', '')
    nwords = len(words_of(text))
    if t0 is None:
        if not opts.get('--no-basic'):
            flags.append('fail: no speech in the clip (it is silent)')
        continue
    pause_tags = sum({'short': 0.25, 'medium': 0.5, 'long': 1.0}.get(m, 0) for m in re.findall(r'\[(short|medium|long) pause\]', lines_by_id.get(uid, {}).get('text', '')))
    wpm = round(nwords * 60 / max(0.1, t1 - t0 - pause_tags)) if nwords else 0
    r['wpm'] = wpm
    if not opts.get('--no-basic') and nwords >= 6:
        dev = wpm / target - 1
        if abs(dev) > 0.35:
            flags.append(f'fail: pace {wpm} words a minute against a target of {target} ({dev:+.0%}); the clip is {"too fast" if dev > 0 else "too slow"}, retake it')
        elif abs(dev) > 0.15:
            flags.append(f'warn: pace {wpm} words a minute against a target of {target} ({dev:+.0%})')
        for g0, g1 in gaps:
            if g1 - g0 > 1.2 + pause_tags:
                flags.append(f'warn: {g1 - g0:.2f} s of silence at {g0:.2f} s that the script does not ask for')
    prints[uid] = voice_print(x, rate)
    r['pitch_hz'], r['centroid_hz'] = (round(v, 1) if v else None for v in prints[uid])

    heard, timed = fixed.get(uid), None
    if heard is None and transcriber != 'none' and V.get('provider') != 'fake' and not transcript_note:
        try:
            if transcriber == 'whisper':
                heard, timed = transcribe_whisper(path)
            else:
                heard = transcribe_gemini(path)
        except Exception as e:                                         # no key, no network: the other checks still run
            transcript_note = f'no transcripts ({e}); the word check was skipped'
            note(transcript_note)
    if heard is not None:
        r['transcript'] = heard
        if timed:
            r['words'] = timed
        missing, extra = compare(text, heard)
        r['missing'], r['extra'] = missing, extra
        if missing:
            flags.append(f'fail: {len(missing)} word{"s" if len(missing) > 1 else ""} of the script not heard: {" ".join(missing[:12])}')
        line = lines_by_id.get(uid, {})
        said = read_aloud(extra, line.get('direction') or L.get('direction'), [t.strip() for t in re.findall(r'\[([^\]]*)\]', line.get('text', ''))])
        if said:
            flags.append(f'fail: {" and ".join(said)} {"was" if len(said) == 1 else "were"} read aloud; heard {len(extra)} words that are not in the script: {" ".join(extra[:12])}')
        elif len(extra) >= 3:
            flags.append(f'fail: {len(extra)} words heard that are not in the script (a direction read aloud?): {" ".join(extra[:12])}')
        elif extra:
            flags.append(f'warn: heard {" ".join(extra)}, which is not in the script')

    if opts.get('--listen'):
        direction = lines_by_id.get(uid, {}).get('direction') or L.get('direction')
        try:
            s = listen(path, text, direction)
            r['listen'] = s
            dm = s.get('direction_match')
            if isinstance(dm, (int, float)) and dm <= 2:
                flags.append(f'warn: the listening pass scored the delivery {dm}/5 for the direction ({s.get("notes", "")})')
            if s.get('glitches'):
                flags.append(f'warn: the listening pass heard glitches: {"; ".join(map(str, s["glitches"]))[:200]}')
            if s.get('mispronounced'):
                flags.append(f'warn: the listening pass heard mispronounced: {", ".join(map(str, s["mispronounced"]))[:200]}')
        except Exception as e:
            note(f'listening pass failed for {uid}: {e}')

# voice consistency: each clip against the median of the others
ok = {k: v for k, v in prints.items() if v[0] and v[1]}
if len(ok) >= 3:
    for uid, (p, c) in ok.items():
        others = [v for k, v in ok.items() if k != uid]
        mp, mc = float(np.median([v[0] for v in others])), float(np.median([v[1] for v in others]))
        dp, dc = p / mp - 1, c / mc - 1
        if abs(dp) > 0.20 or abs(dc) > 0.35:
            what = []
            if abs(dp) > 0.20:
                what.append(f'pitch {p:.0f} Hz against {mp:.0f} Hz ({dp:+.0%})')
            if abs(dc) > 0.35:
                what.append(f'brightness {c:.0f} Hz against {mc:.0f} Hz ({dc:+.0%})')
            out[uid]['flags'].append(f'warn: this take may sound like a different voice: {" and ".join(what)} for the other clips; listen, and retake it if it does')

result = {'version': 1, 'units': out, 'cost': round(cost, 5)}
if opts.get('--json'):
    json.dump(result, open(opts['--json'], 'w'), indent=1)
else:
    for uid, r in out.items():
        print(f'{uid:<5} {str(r.get("wpm", "-")) + " wpm":<9} {("%.0f Hz" % r["pitch_hz"]) if r.get("pitch_hz") else "-":<8} '
              + ('; '.join(r['flags']) or 'ok'))
        if r.get('listen'):
            print(f'      listening pass: {json.dumps(r["listen"])}')
    if cost:
        print(f'checks cost about ${cost:.4f}')
sys.exit(1 if any(f.startswith('fail') for r in out.values() for f in r['flags']) else 0)
