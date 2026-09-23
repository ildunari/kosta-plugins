"""make_voice.py: the narration of the narrated example film, made with Kokoro-82M on the CPU (free, local).

usage: python3 make_voice.py MODEL_DIR    (MODEL_DIR holds kokoro-v1.0.onnx and voices-v1.0.bin, from
       github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)
needs: pip install kokoro-onnx soundfile numpy faster-whisper; ffmpeg

It reads vo/lines.json and writes vo/clips/<id>.ogg (Opus) and vo/voice.json in the format the engine reads
(docs/doodle-art-animation/voice-track.md). The plugin's own voice tool (toolkit/voice.mjs) is the real way to make
narration; this script only exists so the example's clips can be remade. How it times things:
  - each sentence is generated on its own and the clip is the sentences joined with set pauses (0.35 s, or 0.75 s after
    [pause]), so every sentence start and end is exact;
  - a mark ({gone} before a word) is the start of that word, found by transcribing the sentence with faster-whisper
    (word timestamps) and matching its words to the script's;
  - each clip is set to -20 LUFS (the engine re-measures every clip anyway)."""
import json, os, re, subprocess, sys, tempfile, difflib
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
PAUSE, LONG = 0.35, 0.75

def lufs_ffmpeg(path):
    r = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = r[r.rfind('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1))

words_of = lambda s: re.findall(r"[a-z0-9']+", s.lower())

def main(model_dir):
    from kokoro_onnx import Kokoro
    from faster_whisper import WhisperModel
    lines = json.load(open(os.path.join(HERE, 'vo', 'lines.json')))
    k = Kokoro(os.path.join(model_dir, 'kokoro-v1.0.onnx'), os.path.join(model_dir, 'voices-v1.0.bin'))
    asr = WhisperModel('base.en', device='cpu', compute_type='int8')
    units = []
    for u in lines['units']:
        parts = [p for p in re.split(r'(?<=[.!?])\s+', u['text'].strip()) if p]
        audio, sr, t, sents, marks = [], 24000, 0.0, [], {}
        for i, part in enumerate(parts):
            nxt = parts[i + 1] if i + 1 < len(parts) else ''     # [pause] lengthens the gap it sits in
            pause = LONG if re.search(r'\[pause\]\s*$', part) or re.match(r'\s*\[pause\]', nxt) else PAUSE
            part = re.sub(r'\s*\[[^\]]*\]\s*', ' ', part).strip()
            names = {}                                           # word index -> mark name
            for m in re.finditer(r'\{(\w+)\}', part):
                names[len(words_of(part[:m.start()]))] = m.group(1)
            clean = re.sub(r'\{\w+\}', '', part)
            s, sr = k.create(clean, voice=lines['voice'], speed=lines['speed'], lang='en-us')
            dur = len(s) / sr
            if names:                                            # word starts from a transcription of this sentence
                with tempfile.NamedTemporaryFile(suffix='.wav') as f:
                    sf.write(f.name, s, sr)
                    segs, _ = asr.transcribe(f.name, word_timestamps=True, language='en')
                    heard = [(w.word, w.start) for seg in segs for w in seg.words]
                said, got = words_of(clean), [re.sub(r"[^a-z0-9']", '', w.lower()) for w, _ in heard]
                sm = difflib.SequenceMatcher(a=said, b=got, autojunk=False)
                idx = {a: b for blk in sm.get_matching_blocks() for a, b in zip(range(blk.a, blk.a + blk.size), range(blk.b, blk.b + blk.size))}
                for wi, name in names.items():
                    if wi not in idx: sys.exit(f'{u["id"]}: could not find the word for {{{name}}} in the transcript {got}')
                    marks[name] = round(t + heard[idx[wi]][1], 3)
                print(u['id'], 'heard:', ' '.join(got))
            sents.append([round(t, 3), round(t + dur, 3), clean.strip()])
            audio.append(s); t += dur
            if i < len(parts) - 1: audio.append(np.zeros(int(pause * sr), np.float32)); t += pause
        x = np.concatenate(audio).astype(np.float32)
        with tempfile.TemporaryDirectory() as d:
            raw = os.path.join(d, 'raw.wav'); sf.write(raw, x, sr)
            gain = -20 - lufs_ffmpeg(raw)
            out = os.path.join(HERE, 'vo', 'clips', f'{u["id"]}.ogg')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', f'volume={gain:.2f}dB', '-ac', '1', '-ar', '48000',
                            '-c:a', 'libopus', '-b:a', '64k', '-application', 'voip', out], check=True)
        n = len(words_of(re.sub(r'\{\w+\}|\[[^\]]*\]', '', u['text'])))
        units.append({'id': u['id'], 'plate': u['plate'], 'file': f'vo/clips/{u["id"]}.ogg', 'dur': round(len(x) / sr, 3), 'lufs': -20.0,
                      'sentences': sents, 'marks': marks, 'timing': 'sentences+whisper',
                      'checks': {'wpm': round(n / (len(x) / sr) * 60), 'missing': [], 'extra': [], 'flags': []}})
        print(u['id'], f'{len(x) / sr:.2f} s', units[-1]['checks']['wpm'], 'wpm', marks)
    head = {k: lines[k] for k in ('provider', 'model', 'voice', 'style')}
    json.dump({'version': 1, **head, 'units': units}, open(os.path.join(HERE, 'vo', 'voice.json'), 'w'), indent=2)

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main(sys.argv[1])
