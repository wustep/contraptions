import { R as BALL_R } from '../../../../parts'
import { MELODY, PERIOD, wrap, type Note } from './music'

/**
 * The ball's way round: one orbit of a small sea planet, once a period.
 *
 * The melody is the landscape. Every run of one pitch in the melody is a
 * stone standing out of the sea, as high as the note (`heightOf`), and the
 * ball lands on each stone at the instant its note is struck, rides it, and
 * leaves it for the next just before that one sounds. A note struck again on
 * the same stone is a small bounce when it comes quickly (the Gnossienne's
 * paired notes), or nothing at all when it is the long note held while the
 * chords under it strike its key again, which the stone answers with a pulse.
 *
 * Along the way the ball goes as the music does: quick through a run of
 * eighths, slow over a long note, never stopping. Its distance round the
 * planet is `along(t)`, a smooth curve through the landings, and the planet is
 * exactly as big as one time round makes it (`RADIUS`), so the ball comes back
 * to where it started at the end of the period, on the same stone, going the
 * same way at the same speed.
 */

/** A stone: one run of one pitch in the melody. */
export interface Stone {
  index: number
  pitch: number
  /** Height of its top over the sea, in cells. */
  h: number
  /** Which piece it belongs to (its first note's). */
  piece: number
  /** Its span round the planet, cells along the sea (u0 < u1; the last one may run past LENGTH). */
  u0: number
  u1: number
  /** Show times its note is struck while the ball is on it: the landing, then bounces and restrikes. */
  touches: number[]
  /** Which of those the ball bounces into (true) rather than only riding over (false; the first is the landing). */
  bounced: boolean[]
  /** Show time the ball leaves it. */
  leave: number
}

export interface Touch {
  t: number
  stone: number
  kind: 'land' | 'bounce' | 'restrike'
  note: Note
}

/** A note's stone height: middle C a little under half a cell out of the sea, an eighth of a cell a semitone. */
export const heightOf = (pitch: number): number => 0.45 + (pitch - 60) * 0.12

/** Cells round the planet between two landings `dt` apart: more for a long note, but less than in proportion. */
const spacing = (dt: number): number => 0.86 * Math.pow(dt, 0.6)

/** A second note on the same stone this soon after the last is a bounce; later, it is the chord striking the held key. */
const BOUNCE_UNDER = 1.2

// ---------------------------------------------------------------- the landings

interface Landing {
  t: number
  note: Note
  stone: number
  kind: Touch['kind']
}

const landings: Landing[] = []
{
  let stone = -1
  let prev: Note | null = null
  for (const n of MELODY) {
    if (prev && n.p === prev.p) {
      landings.push({ t: n.t, note: n, stone, kind: n.t - prev.t < BOUNCE_UNDER ? 'bounce' : 'restrike' })
    } else {
      stone++
      landings.push({ t: n.t, note: n, stone, kind: 'land' })
    }
    prev = n
  }
  // Round the circle: the last run may be the same pitch as the first. It is not in these three pieces.
}

/** The show times the ball's horizontal way is pinned at: every landing and bounce (a restrike moves nothing). */
const knots = landings.filter((l) => l.kind !== 'restrike')
const KT = knots.map((k) => k.t)
const KU: number[] = [0]
for (let i = 1; i < KT.length; i++) KU.push(KU[i - 1] + spacing(KT[i] - KT[i - 1]))
/** Once round: the last knot to the first again, a period on. */
export const LENGTH = KU[KU.length - 1] + spacing(KT[0] + PERIOD - KT[KT.length - 1])
/** The planet's radius at the sea: one time round is one orbit. */
export const RADIUS = LENGTH / (2 * Math.PI)

// Monotone cubic (Fritsch-Carlson) through the knots, taken round the circle: speed carries through every landing.
// Two knots of the turn before and two of the turn after pad the ends, so every time in [0, PERIOD) is interior.
const N = KT.length
const XT = [KT[N - 2] - PERIOD, KT[N - 1] - PERIOD, ...KT, KT[0] + PERIOD, KT[1] + PERIOD]
const XU = [KU[N - 2] - LENGTH, KU[N - 1] - LENGTH, ...KU, KU[0] + LENGTH, KU[1] + LENGTH]
const XM: number[] = (() => {
  const n = XT.length
  const d = (i: number) => (XU[i + 1] - XU[i]) / (XT[i + 1] - XT[i])
  const m = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    const a = d(i - 1)
    const b = d(i)
    const h0 = XT[i] - XT[i - 1]
    const h1 = XT[i + 1] - XT[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / a + w2 / b)
  }
  return m
})()

function interval(t: number): number {
  let lo = 1
  let hi = XT.length - 3
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (XT[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** The raw way round, on the extended knots: any `t` within one period either side of [0, PERIOD). */
function rawAlong(t: number): number {
  const i = interval(t)
  const H = XT[i + 1] - XT[i]
  const u = (t - XT[i]) / H
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * XU[i] + (u3 - 2 * u2 + u) * H * XM[i] + (-2 * u3 + 3 * u2) * XU[i + 1] + (u3 - u2) * H * XM[i + 1]
}

/** Where the ball is along the sea at show time 0: the zero of `along`. */
const ZERO = rawAlong(0)

/**
 * How far round the ball is at show time `t`, in cells along the sea: 0 at show time 0, LENGTH a period on. Any `t`;
 * it counts whole orbits, so it is continuous across the end of the period.
 */
export function along(t: number): number {
  const turns = Math.floor(t / PERIOD)
  return rawAlong(t - turns * PERIOD) - ZERO + turns * LENGTH
}

/** Its speed, cells a second. */
export const speed = (t: number): number => (along(t + 0.01) - along(t - 0.01)) / 0.02

// ---------------------------------------------------------------- the stones

const PAD = 0.11

export const STONES: Stone[] = []
export const TOUCHES: Touch[] = []
{
  const byStone = new Map<number, Landing[]>()
  for (const l of landings) {
    if (!byStone.has(l.stone)) byStone.set(l.stone, [])
    byStone.get(l.stone)!.push(l)
  }
  const count = byStone.size
  const firstOf = (s: number) => byStone.get(s)![0].t
  for (let s = 0; s < count; s++) {
    const own = byStone.get(s)!
    const first = own[0]
    const nextT = s + 1 < count ? firstOf(s + 1) : firstOf(0) + PERIOD
    const lastT = own[own.length - 1].t
    const leave = nextT - hopTime(nextT - lastT)
    STONES.push({
      index: s,
      pitch: first.note.p,
      h: heightOf(first.note.p),
      piece: first.note.piece,
      u0: along(first.t) - PAD,
      u1: along(leave) + PAD,
      touches: own.map((l) => l.t),
      bounced: own.map((l) => l.kind === 'bounce'),
      leave,
    })
    for (const l of own) TOUCHES.push({ t: l.t, stone: s, kind: l.kind, note: l.note })
  }
  // Stepping stones, not a pile: each ends a little short of the next.
  for (let s = 0; s + 1 < STONES.length; s++) {
    const a = STONES[s]
    const b = STONES[s + 1]
    const ride = along(a.leave)
    a.u1 = Math.max(ride + 0.02, Math.min(a.u1, b.u0 - 0.04))
  }
  const last = STONES[STONES.length - 1]
  last.u1 = Math.max(along(last.leave) + 0.02, Math.min(last.u1, STONES[0].u0 + LENGTH - 0.04))
}

/** Seconds in the air between two stones whose landings are `gap` apart: after a long note, a long slow leap. */
function hopTime(gap: number): number {
  return Math.max(0.14, Math.min(0.62 + 0.1 * Math.max(0, gap - 1.5), 1.15, 0.45 * gap))
}

/** Seconds since `at`, round the circle: negative while it is still to come (within half a period). */
export function since(t: number, at: number): number {
  const d = wrap(t - at)
  return d > PERIOD / 2 ? d - PERIOD : d
}

/**
 * How far a stone has sunk under the ball's landings at `t`, cells (positive is down): each landing presses it in
 * and it comes back up on a damped spring. The ball rides it down and up.
 */
export function sink(stone: Stone, t: number): number {
  let d = 0
  for (let i = 0; i < stone.touches.length; i++) {
    const s = since(t, stone.touches[i])
    if (s < 0 || s > 4) continue
    const depth = i === 0 ? 0.055 : stone.bounced[i] ? 0.03 : 0
    if (!depth) continue
    d += depth * Math.exp(-s / 0.45) * Math.sin(s * ((2 * Math.PI) / 1.05))
  }
  return d
}

const stoneStart = STONES.map((s) => s.touches[0])

/** The stone the ball is on or last left at show time `t` (in [0, PERIOD)). */
function stoneAt(u: number): number {
  if (u < stoneStart[0]) return STONES.length - 1
  let lo = 0
  let hi = STONES.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (stoneStart[mid] <= u) lo = mid
    else hi = mid - 1
  }
  return lo
}

export interface BallLocal {
  /** Cells round the planet (continuous; see `along`). */
  u: number
  /** Height of the ball's centre over the sea, cells. */
  h: number
  /** The stone it is on, or has just left. */
  stone: number
  /** In the air. */
  flying: boolean
}

/** Height of the ball's centre riding stone `s` at `t`. */
const riding = (s: Stone, t: number): number => s.h + BALL_R - sink(s, t)

/**
 * Where the ball is at show time `t`: how far round, and how high. On a stone it rides its top (and its sinking);
 * between two it flies a parabola of low gravity, arriving on the next as its note is struck.
 */
export function ballLocal(t: number): BallLocal {
  const w = wrap(t)
  const i = stoneAt(w)
  const s = STONES[i]
  // Time on this stone's clock: the last one is left after the end of the period.
  const tt = w < s.touches[0] ? w + PERIOD : w
  const u = along(t)
  if (tt < s.leave) {
    // Bouncing between two touches of the same stone.
    for (let j = 1; j < s.touches.length; j++) {
      if (!s.bounced[j]) continue
      const land = s.touches[j]
      const T = Math.min(0.5, 0.9 * (land - s.touches[j - 1]))
      if (tt >= land - T && tt < land) {
        const q = (tt - (land - T)) / T
        const y0 = riding(s, land - T)
        const y1 = riding(s, land)
        const A = 0.07 + 0.09 * T
        return { u, h: y0 + (y1 - y0) * q + A * 4 * q * (1 - q), stone: i, flying: true }
      }
    }
    return { u, h: riding(s, tt), stone: i, flying: false }
  }
  // Flying to the next.
  const n = STONES[(i + 1) % STONES.length]
  const land = i + 1 < STONES.length ? n.touches[0] : n.touches[0] + PERIOD
  const T = land - s.leave
  const q = Math.max(0, Math.min(1, (tt - s.leave) / T))
  const y0 = riding(s, s.leave)
  const y1 = n.h + BALL_R
  // Low gravity: a slow, high arc, and always coming down onto the stone.
  const g = 5.2
  const A = Math.max((g * T * T) / 8, (y1 - y0) / 4 + 0.05 + 0.1 * T)
  return { u, h: y0 + (y1 - y0) * q + A * 4 * q * (1 - q), stone: i, flying: true }
}

/** The stones whose span meets [u0, u1] (cells along; any turn of the circle), each with the offset to draw it at. */
export function stonesIn(u0: number, u1: number): { stone: Stone; shift: number }[] {
  const out: { stone: Stone; shift: number }[] = []
  if (u1 - u0 >= LENGTH) {
    for (const stone of STONES) out.push({ stone, shift: 0 })
    return out
  }
  const t0 = Math.floor(u0 / LENGTH)
  for (let turn = t0 - 1; turn <= t0 + 1; turn++) {
    const shift = turn * LENGTH
    for (const stone of STONES) {
      if (stone.u1 + shift >= u0 && stone.u0 + shift <= u1) out.push({ stone, shift })
    }
  }
  return out
}
