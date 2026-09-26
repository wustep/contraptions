"""
Gymnopédie: Satie's music, played for the show by this script.

The show (`apps/rube/src/shows/versions/gymnopedie/`) is a loop, and its music
is made here rather than taken from a record: Gymnopédie No. 1, Gnossienne
No. 1 and Gnossienne No. 3, one after the other, read from the Mutopia
Project's engravings and played on the Salamander Grand Piano's samples. What
comes out is one period of a circle. The tail of Gnossienne No. 3's last note
rings on into Gymnopédie No. 1's first bar, because the render wraps round,
so the file can be played end to start without a seam.

    python3 scripts/shows/satie-render.py <mutopia dir> <salamander dir>

writes

- apps/rube/src/shows/versions/gymnopedie/satie-gymnopedie.mp3: the period, with MARGIN seconds of its own
  end before it and of its own start after it. The show's zero is at MARGIN
  (the soundtrack's `offset`), and the player loops [MARGIN, MARGIN + PERIOD).
  Because what is either side of both loop points is the same music, a decoder
  that trims its priming a few samples differently still loops cleanly.
- scripts/shows/plans/satie-performance.json: every note as it was played, in
  show seconds: the time its hammer lands in the file (to the sample; each
  sample is trimmed to its own attack), its pitch, velocity and role (melody,
  bass, chord, grace), and every bar line. The show is timed to this file, and
  check:shows holds every strike to it. Nothing is measured off the audio,
  since nothing needs to be: these are the notes the file was made from.

Needs ffmpeg and numpy. The sources, each downloaded once:

- Mutopia Project (https://www.mutopiaproject.org/, composer SatieE):
  gymnopedie_1.mid (Mutopia-2014/12/14-37, typeset by Evin Robertson, public
  domain); Gnossienne no_1.mid (Mutopia-2015/07/23-2035, Knute Snortum) and
  no_3.mid (Mutopia-2016/08/17-2131, Frédéric Duperray), both CC BY-SA 4.0.
  Named here gymnopedie_1.mid, gnossienne_1.mid and gnossienne_3.mid.
- Salamander Grand Piano V3 (44.1 kHz 16 bit) by Alexander Holm, CC BY 3.0:
  https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html

The composition is Satie's and in the public domain. The recording made here
is released under CC BY-SA 4.0, as the Gnossiennes' engravings ask.

The performance is a pianist's choices written down: a tempo for each piece,
breaths at the ends of phrases and a ritardando at the end, the melody over
the chords, the chords rolled a little from the bottom, the grace notes just
ahead of their beat, and a legato pedal changed with each bass note.
"""
import json
import math
import os
import re
import struct
import subprocess
import sys
import wave

import numpy as np

SR = 44100
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT_AUDIO = os.path.join(ROOT, 'apps/rube/src/shows/versions/gymnopedie/satie-gymnopedie.mp3')
OUT_PLAN = os.path.join(ROOT, 'scripts/shows/plans/satie-performance.json')
MARGIN = 2.0

# ------------------------------------------------------------------ the scores


def vlq(d, i):
    v = 0
    while True:
        b = d[i]
        i += 1
        v = (v << 7) | (b & 0x7F)
        if not b & 0x80:
            return v, i


def read_midi(path):
    """Notes as (on, off) in beats, pitch and the staff (track) they are on."""
    d = open(path, 'rb').read()
    ntr, div = struct.unpack('>HH', d[10:14])
    i = 8 + struct.unpack('>I', d[4:8])[0]
    notes = []
    for tr in range(ntr):
        n = struct.unpack('>I', d[i + 4:i + 8])[0]
        j, end = i + 8, i + 8 + n
        i = end
        tick, run, on = 0, None, {}
        while j < end:
            dt, j = vlq(d, j)
            tick += dt
            st = d[j]
            if st == 0xFF:
                ln, j = vlq(d, j + 2)
                j += ln
                continue
            if st in (0xF0, 0xF7):
                ln, j = vlq(d, j + 1)
                j += ln
                continue
            if st & 0x80:
                run = st
                j += 1
            kind, ch = run & 0xF0, run & 0x0F
            if kind in (0xC0, 0xD0):
                j += 1
                continue
            a, b = d[j], d[j + 1]
            j += 2
            if kind == 0x90 and b > 0:
                on.setdefault((ch, a), []).append(tick)
            elif kind in (0x80, 0x90) and on.get((ch, a)):
                t0 = on[(ch, a)].pop(0)
                notes.append({'on': t0 / div, 'off': tick / div, 'pitch': a, 'staff': tr})
    notes.sort(key=lambda n: (n['on'], n['pitch']))
    return notes


def unfold_gymnopedie(notes):
    """Mutopia writes No. 1 as 31 bars and two eight-bar endings; Satie wrote it out, 78 bars. Play it as he wrote it."""
    bar = 3.0
    body, first, second = (0, 31), (31, 39), (39, 47)
    out = []
    for (a, b), at in [(body, 0), (first, 31), (body, 39), (second, 70)]:
        for n in notes:
            if a * bar <= n['on'] < b * bar:
                shift = (at - a) * bar
                out.append({**n, 'on': n['on'] + shift, 'off': min(n['off'], b * bar) + shift})
    out.sort(key=lambda n: (n['on'], n['pitch']))
    return out


def roles(notes, bar):
    """
    What each note is for. A chord is two or more notes of the upper staff struck together for the same length (the
    accompaniment's), or any three or more; a grace is a note shorter than a sixteenth that leads straight into the
    next melody note; the melody is the highest of what is left at each moment; the bass is the lowest note of the
    lower staff on a downbeat; the rest are inner voices.
    """
    by_on = {}
    for n in notes:
        by_on.setdefault(n['on'], []).append(n)
    for on, group in by_on.items():
        sig = {}
        for n in group:
            if n['staff'] == 1:
                sig.setdefault(round(n['off'] - n['on'], 3), []).append(n)
        chordish = set()
        for dur, g in sig.items():
            if len(g) >= 2:
                chordish.update(id(n) for n in g)
        upper = [n for n in group if n['staff'] == 1 and id(n) not in chordish]
        top = max(upper, key=lambda n: n['pitch']) if upper else None
        lower = [n for n in group if n['staff'] == 2]
        low = min(lower, key=lambda n: n['pitch']) if lower else None
        for n in group:
            dur = n['off'] - n['on']
            if n is top:
                n['role'] = 'grace' if dur < 0.2 else 'melody'
            elif n is low and n['pitch'] < 55 and abs(on / bar - round(on / bar)) < 1e-6:
                n['role'] = 'bass'
            elif id(n) in chordish or n['staff'] == 2:
                n['role'] = 'chord'
            else:
                n['role'] = 'inner'
    # A chord of the upper staff with nothing over it, where the melody has stopped to sing a chord (the Gymnopédie's
    # last bars), is the melody.
    return notes


# ------------------------------------------------------------------ the pieces

PIECES = [
    {
        'key': 'gymnopedie-1',
        'title': 'Gymnopédie No. 1',
        'marking': 'Lent et douloureux',
        'file': 'gymnopedie_1.mid',
        'bar': 3.0,
        'bpm': 70.0,
        'melody': 50,
        'bass': 44,
        'chord': 33,
        'half_pedal': 6.0,
        # Where the phrases breathe: the long notes the melody comes to rest on, found below, and these beats more.
        'breaths': [],
        'final_rit': 9.0,
        'lead': 0.9,
    },
    {
        'key': 'gnossienne-1',
        'title': 'Gnossienne No. 1',
        'marking': 'Lent',
        'file': 'gnossienne_1.mid',
        'bar': 4.0,
        'bpm': 84.0,
        'melody': 52,
        'bass': 46,
        'chord': 32,
        'half_pedal': 1.6,
        'breaths': [],
        'final_rit': 8.0,
        'lead': 3.2,
    },
    {
        'key': 'gnossienne-3',
        'title': 'Gnossienne No. 3',
        'marking': 'Lent',
        'file': 'gnossienne_3.mid',
        'bar': 4.0,
        'bpm': 72.0,
        'melody': 49,
        'bass': 44,
        'chord': 31,
        'half_pedal': 1.8,
        'breaths': [],
        'final_rit': 8.0,
        'lead': 3.2,
    },
]
# Seconds after the last piece's last note before the first piece begins again: its resonance, and a breath.
TAIL = 4.2

rng = np.random.default_rng(1893)


def tempo_map(notes, piece, length):
    """Beats to seconds: the piece's tempo, slowed into the long notes the melody rests on and at the very end."""
    step = 1 / 96
    grid = np.arange(0, length + 8, step)
    slow = np.zeros_like(grid)
    mel = [n for n in notes if n['role'] == 'melody']
    rests = []
    for a, b in zip(mel, mel[1:] + [None]):
        dur = (b['on'] if b else length) - a['on']
        if dur >= 2.5:
            rests.append(a['on'])
    for at in rests + piece['breaths']:
        # Into the note, over two beats, up to a tenth slower; then back over a beat and a half.
        into = np.clip((grid - (at - 2.0)) / 2.0, 0, 1)
        out = np.clip(1 - (grid - at) / 1.5, 0, 1)
        shape = np.where(grid <= at, into ** 2, out ** 2)
        slow = np.maximum(slow, 0.1 * shape)
    rit = np.clip((grid - (length - piece['final_rit'])) / piece['final_rit'], 0, 1)
    slow = np.maximum(slow, 0.32 * rit ** 1.5)
    # A living pulse: a percent and a half either way over sixteen beats.
    drift = 0.015 * np.sin(grid * 2 * np.pi / 16 + 1.1)
    spb = (60 / piece['bpm']) / np.maximum(0.5, 1 - slow + drift)
    secs = np.concatenate([[0], np.cumsum(spb[:-1] * step)])
    return lambda beat: float(np.interp(beat, grid, secs))


def perform(piece, src):
    raw = read_midi(os.path.join(src, piece['file']))
    if piece['key'] == 'gymnopedie-1':
        raw = unfold_gymnopedie(raw)
    notes = roles(raw, piece['bar'])
    length = max(n['off'] for n in notes)
    clock = tempo_map(notes, piece, length)
    mel = [n for n in notes if n['role'] == 'melody']
    # Phrases of the melody, for shaping its dynamics: broken at every rest of two beats or more.
    phrase, last_end = 0, -99
    for n in mel:
        if n['on'] - last_end >= 2 or n['on'] - last_end < -50:
            phrase += 1
        n['phrase'] = phrase
        last_end = n['off']
    by_phrase = {}
    for n in mel:
        by_phrase.setdefault(n['phrase'], []).append(n['pitch'])
    out = []
    graces = {id(n): n for n in notes if n['role'] == 'grace'}
    for n in notes:
        t = clock(n['on'])
        end = clock(n['off'])
        role = n['role']
        if role == 'melody':
            ps = by_phrase[n['phrase']]
            lift = (n['pitch'] - (min(ps) + max(ps)) / 2) / 12
            vel = piece['melody'] + 9 * lift + rng.normal(0, 2.2)
        elif role == 'grace':
            vel = piece['melody'] - 7 + rng.normal(0, 1.5)
        elif role == 'bass':
            vel = piece['bass'] + rng.normal(0, 1.8)
        else:
            vel = piece['chord'] + rng.normal(0, 1.8)
        if role == 'grace':
            # Just ahead of the note it leans on, whatever the engraving's MIDI made of it.
            nxt = min((m for m in notes if m['on'] > n['on'] and m['role'] == 'melody'), key=lambda m: m['on'], default=None)
            if nxt:
                t = clock(nxt['on']) - 0.075
                end = clock(nxt['on']) + 0.02
        out.append({'t': t, 'end': max(end, t + 0.05), 'pitch': n['pitch'], 'vel': int(np.clip(round(vel), 12, 110)), 'role': role, 'beat': n['on']})
    # Roll the chords a little, from the bottom.
    by_t = {}
    for n in out:
        if n['role'] == 'chord':
            by_t.setdefault(round(n['t'], 4), []).append(n)
    for group in by_t.values():
        group.sort(key=lambda n: n['pitch'])
        for i, n in enumerate(group):
            n['t'] += 0.011 * i
    bars = [clock(b * piece['bar']) for b in range(int(math.ceil(length / piece['bar'])) + 1)]
    return out, bars, clock(length)


# ------------------------------------------------------------------ the piano


class Piano:
    def __init__(self, root):
        self.dir = os.path.join(root, '44.1khz16bit')
        sfz = open(os.path.join(root, 'SalamanderGrandPianoV3.sfz'), encoding='latin1').read()
        self.regions = []
        for m in re.finditer(r'sample=44\.1khz16bit\\([A-G]#?\d)v(\d+)\.wav\s+lokey=(\d+)\s+hikey=(\d+)\s+lovel=(\d+)(?:\s+hivel=(\d+))?(?:\s+pitch_keycenter=(\d+))?', sfz):
            name, layer, lo, hi, lv, hv, kc = m.groups()
            lo, hi = int(lo), int(hi)
            self.regions.append({'file': f'{name}v{layer}.wav', 'lo': lo, 'hi': hi, 'lv': int(lv), 'hv': int(hv or 127), 'center': int(kc) if kc else (lo + hi) // 2 + (0 if (hi - lo) % 2 else 0)})
        self.cache = {}

    def load(self, f):
        if f in self.cache:
            return self.cache[f]
        w = wave.open(os.path.join(self.dir, f))
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, w.getnchannels()).astype(np.float32) / 32768
        # Trimmed to the attack: the hammer lands on the note's time, to the sample.
        env = np.abs(x).max(1)
        peak = env.max()
        at = int(np.argmax(env > peak * 0.04))
        x = x[max(0, at - 24):]
        self.cache[f] = x
        return x

    def region(self, pitch, vel):
        for r in self.regions:
            if r['lo'] <= pitch <= r['hi'] and r['lv'] <= vel <= r['hv']:
                return r
        raise ValueError((pitch, vel))

    def release(self, pitch):
        f = f'rel{pitch - 20}.wav'
        if f in self.cache:
            return self.cache[f]
        path = os.path.join(self.dir, f)
        if not os.path.exists(path):
            self.cache[f] = None
            return None
        w = wave.open(path)
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, w.getnchannels()).astype(np.float32) / 32768
        self.cache[f] = x
        return x


def resample(x, ratio, n):
    """`n` frames of `x` read at `ratio`: cubic (Catmull-Rom) interpolation."""
    pos = np.arange(n, dtype=np.float64) * ratio
    i = pos.astype(np.int64)
    f = (pos - i)[:, None].astype(np.float32)
    L = len(x)
    def at(k):
        return x[np.clip(k, 0, L - 1)]
    p0, p1, p2, p3 = at(i - 1), at(i), at(i + 1), at(i + 2)
    return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)))


def damper(pitch):
    """How fast a released note dies once the damper is on it, seconds; the top of the piano has no dampers."""
    if pitch >= 89:
        return None
    return 0.09 + 0.3 * np.clip((72 - pitch) / 40, 0, 1)


def render(notes, pedal_ups, period, piano, half_pedal, finals=()):
    buf = np.zeros((int(round(period * SR)), 2), dtype=np.float32)
    ups = np.array(sorted(pedal_ups))
    for n in notes:
        r = piano.region(n['pitch'], n['vel'])
        x = piano.load(r['file'])
        ratio = 2 ** ((n['pitch'] - r['center']) / 12)
        # Within a layer, the velocity still counts for a little (the sfz's own amp_veltrack, in part).
        span = max(1, r['hv'] - r['lv'])
        gain = 10 ** ((-3.0 * (1 - (n['vel'] - r['lv']) / span)) / 20)
        key_off = n['end'] - 0.03
        # The pedal holds it until the next change after the key comes up.
        nxt = ups[ups > key_off]
        held = float(nxt[0]) if len(nxt) else key_off + 8
        tau = damper(n['pitch'])
        stop = max(key_off, held)
        # The last pedal of a piece comes up slowly, and the resonance goes with it rather than stopping.
        if tau and held in finals:
            tau *= 6
        ring = (len(x) / ratio) / SR
        dur = min(ring, (stop - n['t']) + (8 * tau if tau else 20))
        m = int(dur * SR)
        if m <= 0:
            continue
        y = resample(x, ratio, m) * gain
        tt = np.arange(m, dtype=np.float32) / SR + n['t']
        env = np.ones(m, dtype=np.float32)
        # Held by the pedal and not the key: half pedal, a little faster to fade.
        if held > key_off:
            env *= np.where(tt > key_off, np.exp(-np.clip(tt - key_off, 0, None) / half_pedal), 1).astype(np.float32)
        if tau:
            env *= np.where(tt > stop, np.exp(-np.clip(tt - stop, 0, None) / tau), 1).astype(np.float32)
        # A last few milliseconds to nothing, so a note cut at the end of its sample makes no click.
        fade = min(m, 441)
        env[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)
        y *= env[:, None]
        start = int(round(n['t'] * SR))
        _wrap_add(buf, start, y)
        # The damper coming down on the string: the key's own release, very quiet.
        if tau and n['role'] != 'grace' and held not in finals:
            rel = piano.release(n['pitch'])
            if rel is not None:
                _wrap_add(buf, int(round(stop * SR)), rel * 10 ** (-46 / 20) * (n['vel'] / 64))
    return buf


def _wrap_add(buf, start, y):
    N = len(buf)
    start %= N
    m = len(y)
    while m > 0:
        take = min(m, N - start)
        buf[start:start + take] += y[:take]
        y = y[take:]
        m -= take
        start = 0


def room(seconds=2.3, seed=7):
    """A hall's impulse response: a few early reflections, then a diffuse tail that darkens as it dies. Stereo."""
    n = int(seconds * 1.6 * SR)
    t = np.arange(n) / SR
    g = np.random.default_rng(seed)
    ir = np.zeros((n, 2), dtype=np.float64)
    for ch in range(2):
        noise = g.standard_normal(n)
        spec = np.fft.rfft(noise)
        freqs = np.fft.rfftfreq(n, 1 / SR)
        # Bands, each with its own decay: the highs die first.
        tail = np.zeros(n)
        for lo, hi, rt in [(0, 250, seconds * 1.15), (250, 2000, seconds), (2000, 6000, seconds * 0.7), (6000, SR / 2, seconds * 0.45)]:
            band = np.fft.irfft(np.where((freqs >= lo) & (freqs < hi), spec, 0), n)
            tail += band * np.exp(-6.91 * t / rt)
        pre = 0.022
        tail *= np.clip((t - pre) / 0.03, 0, 1)
        ir[:, ch] = tail
        for d, a in [(0.011, 0.5), (0.017, 0.38), (0.023, 0.3), (0.031, 0.22), (0.041, 0.16)]:
            k = int((d + 0.002 * g.standard_normal()) * SR)
            ir[k, ch] += a * (1 if g.random() > 0.5 else -1) * 3
    ir /= np.sqrt((ir ** 2).sum(0))
    return ir.astype(np.float32)


def convolve_circular(x, ir, block=1 << 18):
    """x (circular) convolved with ir, block by block; what runs off the end wraps to the start."""
    N = len(x)
    L = len(ir)
    size = 1 << int(math.ceil(math.log2(block + L)))
    H = [np.fft.rfft(ir[:, c], size) for c in range(2)]
    out = np.zeros_like(x)
    for s in range(0, N, block):
        seg = x[s:s + block]
        for c in range(2):
            y = np.fft.irfft(np.fft.rfft(seg[:, c], size) * H[c], size)[: len(seg) + L - 1].astype(np.float32)
            _wrap_add(out[:, c:c + 1], s, y[:, None])
    return out


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src, sal = sys.argv[1], sys.argv[2]
    piano = Piano(sal)
    at = 0.0
    all_notes, pieces, pedal = [], [], []
    for piece in PIECES:
        at += piece['lead']
        notes, bars, length = perform(piece, src)
        for n in notes:
            n['t'] += at
            n['end'] += at
            n['piece'] = piece['key']
        # The legato pedal: up just after each bass note sounds, down again at once; and up at the end of the piece.
        bass = sorted({round(n['t'], 5) for n in notes if n['role'] == 'bass'})
        last = max(n['end'] for n in notes)
        pedal_ups = [b + 0.035 for b in bass] + [last + 3.4]
        pieces.append({
            'key': piece['key'], 'title': piece['title'], 'marking': piece['marking'], 'bpm': piece['bpm'],
            'from': round(at, 6), 'last': round(max(n['t'] for n in notes), 6), 'end': round(last, 6),
            'bars': [round(b + at, 6) for b in bars],
        })
        all_notes.append((notes, pedal_ups, piece['half_pedal']))
        at = last
    period = round((at + TAIL) * 20) / 20
    pieces[-1]['next'] = round(period + PIECES[0]['lead'], 6)
    print(f'period {period:.2f}s', ', '.join(f"{p['title']} {p['from']:.1f}-{p['end']:.1f}" for p in pieces))

    dry = np.zeros((int(round(period * SR)), 2), dtype=np.float32)
    for notes, ups, hp in all_notes:
        dry += render(notes, ups, period, piano, hp, finals={ups[-1]})
    wet = convolve_circular(dry, room())
    mix = dry * 0.82 + wet * 0.34
    # A little air off the close microphones' top.
    peak = np.abs(mix).max()
    mix *= 10 ** (-1.5 / 20) / peak
    padded = np.concatenate([mix[-int(MARGIN * SR):], mix, mix[: int(MARGIN * SR)]])
    tmp = OUT_AUDIO + '.wav'
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(padded, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-q:a', '3', OUT_AUDIO], check=True)
    os.remove(tmp)

    flat = sorted((n for notes, _, _ in all_notes for n in notes), key=lambda n: (n['t'], n['pitch']))
    plan = {
        'about': 'Satie, played for the Gymnopédie show by scripts/shows/satie-render.py. Show seconds; the file is apps/rube/src/shows/versions/gymnopedie/satie-gymnopedie.mp3, whose show zero is at `margin`.',
        'period': period,
        'margin': MARGIN,
        'pieces': pieces,
        'notes': [{'t': round(n['t'], 5), 'p': n['pitch'], 'v': n['vel'], 'r': n['role'], 'b': round(n['beat'], 4), 'piece': PIECES.index(next(p for p in PIECES if p['key'] == n['piece']))} for n in flat],
    }
    with open(OUT_PLAN, 'w') as f:
        json.dump(plan, f, separators=(',', ':'))
    print(f'{len(flat)} notes; wrote {OUT_AUDIO} and {OUT_PLAN}')


if __name__ == '__main__':
    main()
