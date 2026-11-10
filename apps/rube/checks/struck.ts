/**
 * The checks for Struck: Bach's Prelude in C played by balls on physically modelled instruments. Called by
 * `checks/shows.ts` for that take.
 *
 * What it holds: the machine plays the score and nothing else (every sixteenth of the 34 bars once, by one ball, at
 * its pitch, on its beat, and the last bar's five notes together); every ball's way is physics (one speed across, each
 * leg ending where the next begins, each flight a fall under the one gravity that lands with the speed the part is
 * struck at, each part giving back its material's share); every part is cut to its pitch; and the soundtrack is those
 * contacts and nothing else, by an engine that plays the same samples whatever the block it is asked for.
 */
import type { Performance, ShowVersion } from '../src/shows/registry'
import { camera } from '../src/shows/versions/struck/works/camera'
import { defineEngine, type Strike } from '../src/shows/versions/struck/works/engine'
import {
  BALLS, BOW_FROM, BOW_T, CELL, CHORD_T, DURATION, G, HAMMER, R, S, VX,
  ballAt, balls, cellos, contacts, pipeLen, rails, stringLen, timeOf, tineLen, who,
} from '../src/shows/versions/struck/works/layout'
import { CHORD, FIGURES, LINE, ORDER, SIXTEENTHS, hzOf, midi } from '../src/shows/versions/struck/works/prelude'
import { strikes } from '../src/shows/versions/struck/works/score'

type Check = (name: string, ok: boolean, detail?: string) => void

/** The pitch of a stretch of samples, by its autocorrelation's peak near `hz`. */
function pitchOf(x: Float32Array, from: number, n: number, sr: number, hz: number): number {
  const lag0 = sr / hz
  let best = 0
  let at = 0
  const corr = (lag: number): number => {
    let sum = 0
    for (let i = 0; i < n; i++) sum += x[from + i] * x[from + i + lag]
    return sum
  }
  const lo = Math.floor(lag0 * 0.94)
  const hi = Math.ceil(lag0 * 1.06)
  const c: number[] = []
  for (let lag = lo - 1; lag <= hi + 1; lag++) c.push(corr(lag))
  for (let k = 1; k < c.length - 1; k++) {
    if (c[k] > best) {
      best = c[k]
      at = k
    }
  }
  const d = c[at - 1] - 2 * c[at] + c[at + 1]
  const frac = d ? (0.5 * (c[at - 1] - c[at + 1])) / d : 0
  return sr / (lo - 1 + at + frac)
}

export function checkStruck(perf: Performance, version: ShowVersion, check: Check): void {
  check('struck: one take, Struck, Fable 5.2, with an about and a still',
    version.title === 'Struck' && version.label === 'Fable 5.2' && !!version.about && typeof version.still === 'number')
  check('struck: silent here, where there is no audio context to play it in, and never a recording or a YouTube cue',
    !perf.soundtrack && perf.duration === DURATION && !perf.cuts?.(10) && !perf.titles)

  // The score.
  const figures = FIGURES.every((bar, b) => {
    const five = bar.split(' ').map(midi)
    return five.length === 5 && five.every((n, k) => k === 0 || n > five[k - 1]) && [0, 8].every((h) => ORDER.every((k, j) => LINE[b * 16 + h + j] === five[k]))
  })
  check('struck: the score is 34 bars of sixteenths, bars 1 to 32 each a five-note figure played twice, and a five-note chord',
    LINE.length === SIXTEENTHS && SIXTEENTHS === 544 && FIGURES.length === 32 && figures && CHORD.length === 5)
  check('struck: it begins on C4 E4 G4 C5 E5 and ends on C2 C3 E4 G4 C5', LINE.slice(0, 5).join() === '60,64,67,72,76' && CHORD.map(midi).join() === '36,48,64,67,72')

  // The machine plays it: every sixteenth once, by the ball whose turn it is, on the beat.
  const wrong: string[] = []
  const byIndex = new Map<number, typeof contacts>()
  for (const c of contacts) byIndex.set(c.i, [...(byIndex.get(c.i) ?? []), c])
  for (let i = 0; i < SIXTEENTHS; i++) {
    const turn = who(i)
    const here = byIndex.get(i) ?? []
    if (turn.kind === 'bow') {
      const stroke = cellos.find((c) => c.t0 === timeOf(i))
      if (here.length || !stroke || stroke.midi !== LINE[i]) wrong.push(`sixteenth ${i} is not the bow's alone`)
    } else if (here.length !== 1 || here[0].midi !== LINE[i] || here[0].ball !== turn.ball || here[0].kind !== turn.kind || here[0].sound !== timeOf(i)) {
      wrong.push(`sixteenth ${i}`)
    }
  }
  check('struck: every sixteenth of the prelude is sounded once, at its pitch, on its beat, by the ball whose turn it is', wrong.length === 0, wrong.slice(0, 4).join('; '))
  const steady = Array.from({ length: 512 }, (_, i) => timeOf(i + 1) - timeOf(i)).every((d) => Math.abs(d - S) < 1e-9)
  const broadens = Array.from({ length: 31 }, (_, k) => timeOf(514 + k) - timeOf(513 + k) > timeOf(513 + k) - timeOf(512 + k)).every(Boolean)
  check('struck: bars 1 to 32 keep one tempo, 66 to the minute, and the last two broaden a little more with every note', steady && broadens && Math.abs(S - 60 / 66 / 4) < 1e-12)
  const last = byIndex.get(SIXTEENTHS) ?? []
  const lastCello = cellos[cellos.length - 1]
  check('struck: the last chord is four balls landing at the same instant and the bow coming to its last string: C2 C3 E4 G4 C5',
    last.length === 4 && new Set(last.map((c) => c.ball)).size === 4 && last.every((c) => c.sound === CHORD_T && c.t === CHORD_T) &&
    [...last.map((c) => c.midi), lastCello.midi].sort((a, b) => a - b).join() === CHORD.map(midi).join() && lastCello.t0 === CHORD_T && lastCello.last,
    last.map((c) => `${BALLS[c.ball]}:${c.midi}`).join(' '))
  check('struck: six balls, one at first, then two, then three, and three more let go for the chord',
    balls.length === 6 && who(0).ball === 0 && who(64).ball === 1 && who(181).ball === 2 && new Set(contacts.filter((c) => c.i < 64).map((c) => c.ball)).size === 1 &&
    [3, 4, 5].every((b) => contacts.filter((c) => c.ball === b).length === 1))
  check('struck: the bass ball leaves the hammers for the bow at bar 24, and the bow plays the pedals: sixteen strokes of G, six of C, and the last',
    BOW_T === timeOf(BOW_FROM * 8) && BOW_FROM === 46 && cellos.length === 23 && cellos.slice(0, 16).every((c) => c.midi === 43) && cellos.slice(16).every((c) => c.midi === 36) &&
    cellos.every((c, k) => k === cellos.length - 1 || c.t1 === cellos[k + 1].t0) && !contacts.some((c) => c.kind === 'piano' && c.t > BOW_T))

  // Every ball's way is physics.
  let gap = 0
  let off = 0
  let speedOff = 0
  for (const b of balls) {
    for (let k = 1; k < b.segs.length; k++) {
      const s = b.segs[k]
      const before = ballAt(b, s.t0 - 1e-9)
      const after = ballAt(b, s.t0)
      gap = Math.max(gap, Math.hypot(after.x - before.x, after.y - before.y))
      if ((s.k === 'fly' || s.k === 'roll') && s.t0 <= CHORD_T) off = Math.max(off, Math.abs(s.x - VX * s.t0))
    }
  }
  check('struck: no ball ever jumps: each leg of its way ends where the next begins', gap < 1e-6, `${gap.toExponential(2)} cells`)
  check('struck: every ball in play is at the one place across, a sixteenth every 1.25 cells: across the machine is time', off < 1e-9, `${off.toExponential(2)} cells`)
  const bad: string[] = []
  for (const c of contacts) {
    const b = balls[c.ball]
    const at = ballAt(b, c.t)
    if (Math.hypot(at.x - c.x, at.y - c.y) > 1e-6) bad.push(`${BALLS[c.ball]} is not on its part at sixteenth ${c.i}`)
    // The speed it really lands with, from its fall: what the part is struck at.
    const h = 1e-5
    const falling = (ballAt(b, c.t - h).y - ballAt(b, c.t - 2 * h).y) / h
    speedOff = Math.max(speedOff, Math.abs(falling - c.vin) / c.vin)
    const give = c.vout / c.vin
    const ok = c.kind === 'piano' ? Math.abs(give - 0.6) < 1e-9 : c.kind === 'pipe' ? (c.i === SIXTEENTHS ? give === 0 : Math.abs(give - 0.7) < 1e-9) : give > 0.85 && give < 0.905
    if (!ok) bad.push(`a ${c.kind} gives back ${give.toFixed(3)} at sixteenth ${c.i}`)
    if (c.kind === 'piano' ? Math.abs(c.sound - c.t - HAMMER) > 1e-9 : c.sound !== c.t) bad.push(`sixteenth ${c.i} sounds at the wrong moment`)
  }
  check('struck: each ball is on its part when the part sounds (a hammer\'s flight early, for a string), and each part gives back its material\'s share: steel 0.86 to 0.9, a hammer 0.6, a bellows 0.7',
    bad.length === 0, bad.slice(0, 3).join('; '))
  check('struck: each part is struck at the speed the ball has really fallen to under the one gravity, 9.81 m/s² at 5 cm a cell', speedOff < 2e-3 && Math.abs(G * CELL - 9.81) < 1e-12, `${(speedOff * 100).toFixed(3)}%`)
  const speeds = contacts.map((c) => c.vin * CELL)
  check('struck: balls land at between 0.7 and 1.9 metres a second', Math.min(...speeds) > 0.7 && Math.max(...speeds) < 1.9, `${Math.min(...speeds).toFixed(2)} to ${Math.max(...speeds).toFixed(2)}`)
  const level = rails.every((r) => r.x1 > r.x0 && balls[r.ball].segs.some((s) => s.k === 'roll' && s.vy === 0 && Math.abs(s.y - r.y) < 1e-9 && VX * s.t1 <= r.x1 + 1e-9 && VX * s.t0 >= r.x0 - 1e-9))
  check('struck: every rail is level, and a ball rolls it at the speed it came with', level && rails.length > 100)

  // Cut to pitch.
  const cut = contacts.every((c) => Math.abs(c.hz - hzOf(c.midi)) < 1e-9 && Math.abs(c.len - (c.kind === 'tine' ? tineLen(c.hz) : c.kind === 'piano' ? stringLen(c.hz) : pipeLen(c.hz))) < 1e-9)
  check('struck: every tine, string and pipe is cut to its note: a tine as 1/√pitch, a pipe as 1/pitch', cut && Math.abs(tineLen(220) / tineLen(880) - 2) < 1e-9 && Math.abs(pipeLen(220) / pipeLen(440) - 2) < 1e-9)

  // The camera keeps what is playing in the frame, wide and upright.
  const lost: string[] = []
  for (const aspect of [16 / 9, 9 / 16]) {
    for (let t = 1; t < CHORD_T + 3; t += 0.173) {
      const cam = camera(t, aspect)
      const halfH = aspect >= 16 / 9 ? cam.cells / 2 : (cam.cells * 16) / 9 / aspect / 2
      const halfW = halfH * aspect
      for (const b of balls) {
        const p = ballAt(b, t)
        if (p.k === 'rest') continue
        if (Math.abs(p.x - cam.x) > halfW - R || Math.abs(p.y - cam.y) > halfH - R) lost.push(`${BALLS[b.id]} at ${t.toFixed(1)}s (${aspect > 1 ? 'wide' : 'upright'})`)
      }
    }
  }
  check('struck: every ball that is moving is in the frame, on a wide stage and on a phone held upright', lost.length === 0, lost.slice(0, 4).join('; '))

  // The soundtrack is the contacts, and the engine plays the same samples whatever block it is asked for.
  const notes = strikes()
  const counts = (kind: Strike['kind']) => notes.filter((n) => n.kind === kind).length
  check('struck: the soundtrack is one note for every contact, one for every stroke of the bow, and a knock for every latch',
    counts('tine') + counts('piano') + counts('pipe') === contacts.length && counts('bow') === cellos.length && counts('knock') === balls.length + 1 &&
    notes.every((n, k) => k === 0 || n.t >= notes[k - 1].t) && notes.every((n) => n.kind === 'knock' || n.kind === 'bow' || contacts.some((c) => c.sound === n.t && c.hz === n.hz)))
  const { makeEngine } = defineEngine()
  const SR = 44100
  const render = (from: number, seconds: number, block: number) => {
    const n = Math.round(seconds * SR)
    const L = new Float32Array(n)
    const Rr = new Float32Array(n)
    const engine = makeEngine(SR)
    engine.load(notes)
    engine.go(from, 0, 1, false)
    for (let k = 0; k < n; k += block) engine.process(L, Rr, k, Math.min(block, n - k), k)
    return { L, R: Rr }
  }
  // The bass ball's first stroke of the bow, with the tines and pipes over it.
  const a = render(BOW_T - 0.5, 3, 128)
  const b = render(BOW_T - 0.5, 3, 4096)
  let differ = 0
  let peak = 0
  let finite = true
  for (let i = 0; i < a.L.length; i++) {
    differ = Math.max(differ, Math.abs(a.L[i] - b.L[i]), Math.abs(a.R[i] - b.R[i]))
    peak = Math.max(peak, Math.abs(a.L[i]), Math.abs(a.R[i]))
    if (!Number.isFinite(a.L[i]) || !Number.isFinite(a.R[i])) finite = false
  }
  check('struck: the engine plays the same samples 128 at a time, as an audio thread asks, and 4096 at a time', differ === 0, `${differ.toExponential(2)}`)
  check('struck: and what it plays is sound: finite, and neither silent nor clipped before the room', finite && peak > 0.02 && peak < 1.5, `peak ${peak.toFixed(3)}`)
  // In tune: one note of each voice, alone.
  const flat: string[] = []
  for (const [kind, hz, dur] of [['tine', 523.25, 0], ['piano', 130.81, 0], ['pipe', 392, 0.9], ['bow', 98, 1.2]] as const) {
    const engine = makeEngine(SR)
    engine.load([{ t: 0, kind, hz, v: kind === 'bow' ? 0.29 : kind === 'piano' ? 2 : 1.2, dur, sag: false, gl: 1, gr: 1 }])
    engine.go(0, 0, 1, true)
    const n = SR
    const L = new Float32Array(n)
    engine.process(L, new Float32Array(n), 0, n, 0)
    const cents = 1200 * Math.log2(pitchOf(L, Math.round(0.35 * SR), Math.round(0.3 * SR), SR, hz) / hz)
    if (!(Math.abs(cents) < 6)) flat.push(`${kind} at ${hz} Hz is ${cents.toFixed(1)} cents out`)
  }
  check('struck: a tine, a string, a pipe and a bowed string each sound within six cents of the pitch they are cut to', flat.length === 0, flat.join('; '))
}
