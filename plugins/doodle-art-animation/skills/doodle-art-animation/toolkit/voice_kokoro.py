#!/usr/bin/env python3
"""voice_kokoro.py - Kokoro-82M speech for voice.mjs, run in-process with kokoro-onnx on the CPU (no server).

voice.mjs runs this; you do not need to. It reads one JSON object on stdin:
  {"jobs": [{"out": "/tmp/x/0_0.wav", "text": "One sentence.", "voice": "af_heart", "speed": 1.0, "lang": "en-us"}]}
writes each job's speech as a 16-bit mono WAV at Kokoro's own rate (24 kHz), and prints {"done": i} on stdout as
each job finishes.

The model files (kokoro-v1.0.onnx, about 325 MB, and voices-v1.0.bin, about 28 MB) live in $DOODLE_KOKORO_DIR,
by default ~/.cache/doodle-art-animation/kokoro. They are downloaded from the kokoro-onnx GitHub release the first
time (GitHub is reachable from claude.ai cloud sessions; Hugging Face may not be). $DOODLE_KOKORO_MODEL picks another
model file from the same release, for example kokoro-v1.0.int8.onnx (about 88 MB, a little rougher).
Kokoro-82M is Apache-2.0, so its voices can be used in published films.

Exit codes: 0 done, 3 kokoro-onnx is not installed (python3 -m pip install kokoro-onnx), 4 the model files could
not be downloaded, 5 an unknown voice, 1 anything else.
"""
import json, os, sys, urllib.request, wave

RELEASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'


def say(msg):
    print('voice_kokoro: ' + msg, file=sys.stderr, flush=True)


def fetch(name, dest):
    tmp = dest + '.part'
    say(f'downloading {name} into {os.path.dirname(dest)} (first run only)')
    with urllib.request.urlopen(RELEASE + name, timeout=120) as r, open(tmp, 'wb') as f:
        while True:
            block = r.read(1 << 20)
            if not block:
                break
            f.write(block)
    os.replace(tmp, dest)


def main():
    try:
        import numpy as np
        from kokoro_onnx import Kokoro
    except ImportError:
        say('the kokoro-onnx package is missing. Install it with: python3 -m pip install kokoro-onnx')
        return 3
    req = json.load(sys.stdin)
    folder = os.environ.get('DOODLE_KOKORO_DIR') or os.path.join(os.path.expanduser('~'), '.cache', 'doodle-art-animation', 'kokoro')
    os.makedirs(folder, exist_ok=True)
    names = [os.environ.get('DOODLE_KOKORO_MODEL') or 'kokoro-v1.0.onnx', 'voices-v1.0.bin']
    for name in names:
        dest = os.path.join(folder, name)
        if not os.path.exists(dest):
            try:
                fetch(name, dest)
            except Exception as e:  # network, proxy, disk
                say(f'could not download {name} from {RELEASE}: {e}\n  Download it yourself into {folder}, or set DOODLE_KOKORO_DIR.')
                return 4
    kokoro = Kokoro(os.path.join(folder, names[0]), os.path.join(folder, names[1]))
    known = set(kokoro.get_voices())
    for job in req['jobs']:
        if job['voice'] not in known:
            say(f"unknown Kokoro voice {job['voice']!r}. English voices start with af_, am_ (American) or bf_, bm_ (British): "
                'af_heart, bf_emma, am_michael and bm_george are good narrators.')
            return 5
    for i, job in enumerate(req['jobs']):
        samples, rate = kokoro.create(job['text'], voice=job['voice'], speed=float(job.get('speed') or 1.0),
                                      lang=job.get('lang') or 'en-us')
        pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype('<i2').tobytes()
        with wave.open(job['out'], 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(pcm)
        print(json.dumps({'done': i}), flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
