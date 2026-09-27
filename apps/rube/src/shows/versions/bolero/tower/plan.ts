import type { Pt } from '../../../../parts'
import { BEAT, STATEMENTS, STROKES, THEMES, bar, lastIndex, type Note } from './music'

/**
 * The tower, laid out once. Cells, y down; the ground is y = 0 and the side drum stands on it at x = 0.
 *
 * Everything stands on the drum: a mast rises from the middle of its head, and the storeys are hung on the mast one
 * over another, each wider than the one under it, so the tower is an inverted pyramid on one small drum. A storey is
 * one loop of track: the upper rail left to right (the tune's first eight bars), a U-turn down at the right end (its
 * long held note), the lower rail right to left (the other eight), and at the left end a lift that ticks the ball up
 * again on the side drum's strokes, to the upper rail, or on up to the next storey. The ball goes round each storey
 * twice (the tune is played twice in each of its two themes, A A B B), then climbs to the next, which has just
 * unfolded out of the bud at the top of the mast. The last two statements (A, then B) have a storey each.
 *
 * The rails are the score. A key is laid for every note of the tune, where the ball's middle will be when the note
 * sounds, and the ball rolls on at the pace that puts it there: slow over a held note, quick through a run. Under
 * each key hangs a tine as long as its note is low, so each rail's tines are the tune's shape upside down.
 */

export const R = 0.13
/** The drum: its middle, its shell's size, and its head, where the mast stands. */
export const DRUM = { w: 1.5, h: 0.62, foot: 0.14, head: -0.76 }
export const STOREYS = 10
/** How far the rails fall along their length (the upper to the right, the lower to the left). */
export const SLOPE = 0.16
/** From the upper rail's line to the lower's. */
export const GAP = 0.95
/** Under the lower rail to the floor. */
const UNDER = 0.66

export interface Storey {
  n: number
  /** Its floor (y), its top (y), its width. */
  floor: number
  top: number
  w: number
  /** The ball's line on each rail at its left (xa) and right (xb) ends. */
  xa: number
  xb: number
  upper: { left: number; right: number }
  lower: { left: number; right: number }
  /** The U-turn at the right end: its middle and radius (the ball's middle goes round it). */
  turn: { x: number; y: number; r: number }
  /** The lift's line at this storey, and where it takes the ball on (A, under the lower rail's left end) and off (B). */
  lift: number
  A: Pt
  B: Pt
  /** Where the roof zone is: its top and bottom (the storey's engine lives here). */
  roof: [number, number]
  theme: 'A' | 'B'
}

const width = (n: number): number => 8.6 + 0.8 * n
const roofOf = (n: number): number => 0.95 + 0.12 * n
export const heightOf = (n: number): number => roofOf(n) + GAP + UNDER

/** The first storey's floor: the mast's foot is on the drum head, and a short stretch of mast carries it clear. */
const FLOOR0 = -1.9

export const TOWER: Storey[] = (() => {
  const out: Storey[] = []
  let floor = FLOOR0
  for (let n = 0; n < STOREYS; n++) {
    const h = heightOf(n)
    const w = width(n)
    const top = floor - h
    const upperY = top + roofOf(n)
    const lowerY = upperY + GAP
    const xa = -w / 2 + 0.62
    const xb = w / 2 - 0.62
    const upper = { left: upperY - SLOPE / 2, right: upperY + SLOPE / 2 }
    const lower = { left: lowerY + SLOPE / 2, right: lowerY - SLOPE / 2 }
    const r = (lower.right - upper.right) / 2
    const lift = -w / 2 + 0.3
    out.push({
      n,
      floor,
      top,
      w,
      xa,
      xb,
      upper,
      lower,
      turn: { x: xb, y: (upper.right + lower.right) / 2, r },
      lift,
      A: [lift, lower.left + 0.1],
      B: [lift, upper.left - 0.12],
      roof: [top + 0.08, upperY - R - 0.12],
      theme: n % 2 === 0 ? 'A' : 'B',
    })
    floor = top
  }
  return out
})()

/** Where the lift starts: its foot, on the ground to the left of the drum. The ball waits here for the first two bars. */
export const FOOT: Pt = [-1.3, -R - 0.08]

/* ------------------------------------------------------------------ laps */

/** The storey a statement is played on, and which time round it is. */
export function lapOf(k: number): { storey: number; round: number } {
  if (k < 16) return { storey: Math.floor(k / 2), round: k % 2 }
  return { storey: k - 8, round: 0 }
}
/** The statements played on a storey. */
export const statementsOn = (n: number): number[] => (n < 8 ? [2 * n, 2 * n + 1] : [n + 8])

/** When the ball leaves the rail at the U-turn, reaches the lower rail, and reaches the left end: quarters of a statement. */
export const INTO_TURN = 22.5
export const OUT_OF_TURN = 24
export const HOME = 48
/** Off the lower rail's end and into the lift's cup. */
export const INTO_CUP = 48.5

/** A key: where along the loop it starts and ends (arc length), the note, and when it sounds (show seconds, each statement). */
export interface Key {
  i: number
  /** 0 on the upper rail, 1 on the lower. */
  rail: 0 | 1
  s0: number
  s1: number
  q: number
  midi: number
}

/** A storey's loop as arc length: the step from the lift onto the upper rail, the rail, the U-turn, the lower rail, the drop into the cup. */
export interface Loop {
  n: number
  /** Lengths of the pieces, in order: in (B to the rail), upper, turn, lower, out (to A). */
  lengths: [number, number, number, number, number]
  keys: Key[]
  /** Knots of the ball's arc length against quarters of the statement. */
  knots: [number, number][]
  /** The notes' pitch range, for the tines. */
  low: number
  high: number
}

/** A point on a storey's loop at arc length `s`, and the direction it runs (radians). */
export function onLoop(st: Storey, loop: Loop, s: number): { p: Pt; angle: number } {
  const [lin, lu, lt, ll, lout] = loop.lengths
  const upperStart: Pt = [st.xa, st.upper.left]
  if (s <= lin) {
    const f = s / lin
    return { p: [st.B[0] + (upperStart[0] - st.B[0]) * f, st.B[1] + (upperStart[1] - st.B[1]) * f], angle: Math.atan2(upperStart[1] - st.B[1], upperStart[0] - st.B[0]) }
  }
  s -= lin
  if (s <= lu) {
    const f = s / lu
    return { p: [st.xa + (st.xb - st.xa) * f, st.upper.left + (st.upper.right - st.upper.left) * f], angle: Math.atan2(st.upper.right - st.upper.left, st.xb - st.xa) }
  }
  s -= lu
  if (s <= lt) {
    const phi = -Math.PI / 2 + (s / lt) * Math.PI
    return { p: [st.turn.x + st.turn.r * Math.cos(phi), st.turn.y + st.turn.r * Math.sin(phi)], angle: phi + Math.PI / 2 }
  }
  s -= lt
  if (s <= ll) {
    const f = s / ll
    return { p: [st.xb + (st.xa - st.xb) * f, st.lower.right + (st.lower.left - st.lower.right) * f], angle: Math.atan2(st.lower.left - st.lower.right, st.xa - st.xb) }
  }
  s -= ll
  const f = Math.min(1, s / lout)
  const end: Pt = [st.xa, st.lower.left]
  return { p: [end[0] + (st.A[0] - end[0]) * f, end[1] + (st.A[1] - end[1]) * f], angle: Math.atan2(st.A[1] - end[1], st.A[0] - end[0]) }
}

/** How much room a note asks for on the rail: a little for being a note, more for being long. */
const room = (d: number): number => 0.42 + Math.min(d, 2.2)

function layRail(notes: readonly Note[], from: number, to: number, end: number, s0: number, length: number, rail: 0 | 1, first: number): { keys: Key[]; knots: [number, number][] } {
  const here = notes.filter(([q]) => q >= from && q < to)
  const weights = here.map(([q], i) => room((i + 1 < here.length ? here[i + 1][0] : end) - q))
  const total = weights.reduce((a, b) => a + b, 0)
  const keys: Key[] = []
  const knots: [number, number][] = []
  let s = s0
  here.forEach(([q, midi], i) => {
    const w = (weights[i] / total) * length
    keys.push({ i: first + i, rail, s0: s, s1: s + w, q, midi })
    knots.push([q, s])
    s += w
  })
  return { keys, knots }
}

export const LOOPS: Loop[] = TOWER.map((st) => {
  const notes = THEMES[st.theme]
  const upperStart: Pt = [st.xa, st.upper.left]
  const lin = Math.hypot(upperStart[0] - st.B[0], upperStart[1] - st.B[1])
  const lu = Math.hypot(st.xb - st.xa, st.upper.right - st.upper.left)
  const lt = Math.PI * st.turn.r
  const ll = Math.hypot(st.xb - st.xa, st.lower.right - st.lower.left)
  const lout = Math.hypot(st.A[0] - st.xa, st.A[1] - st.lower.left)
  const up = layRail(notes, 0, OUT_OF_TURN, INTO_TURN, lin, lu, 0, 0)
  // The lower rail's last key is the tune's last note (A strikes it on the 17th downbeat; B's is tied into it).
  const down = layRail(notes, OUT_OF_TURN, HOME + 0.01, INTO_CUP, lin + lu + lt, ll, 1, up.keys.length)
  const knots: [number, number][] = [
    [-0.25, 0],
    ...up.knots,
    [INTO_TURN, lin + lu],
    ...down.knots,
  ]
  // B's last note is tied into the 17th downbeat: the ball is at the lower rail's last key then all the same.
  if (knots[knots.length - 1][0] < HOME) {
    const last = down.keys[down.keys.length - 1]
    knots.push([HOME, last.s0 + (last.s1 - last.s0) * ((HOME - last.q) / (INTO_CUP - last.q))])
  }
  knots.push([INTO_CUP, lin + lu + lt + ll + lout])
  const midis = notes.map(([, m]) => m)
  return { n: st.n, lengths: [lin, lu, lt, ll, lout], keys: [...up.keys, ...down.keys], knots, low: Math.min(...midis), high: Math.max(...midis) }
})

/**
 * Monotone cubic through knots (Fritsch-Carlson): the ball's arc length against time never runs back and carries its
 * speed smoothly through every key, quick through a run and slow over a held note.
 */
export function monotone(knots: [number, number][]): (x: number) => number {
  const n = knots.length
  const xs = knots.map((k) => k[0])
  const ys = knots.map((k) => k[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m: number[] = new Array(n).fill(0)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0
    else {
      const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1])
      const w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1])
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    }
  }
  return (x: number): number => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    let hi = n - 1
    while (hi - i > 1) {
      const mid = (i + hi) >> 1
      if (xs[mid] <= x) i = mid
      else hi = mid
    }
    const h = xs[i + 1] - xs[i]
    const u = (x - xs[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

export const ARC = LOOPS.map((l) => monotone(l.knots))

/* ------------------------------------------------------------------ the lift */

/**
 * The lift's line up the tower's left flank: from its foot by the drum to the first storey's lower rail, then up
 * each storey (A to B) and slanting out to the next (B to the next A). One chain runs up it; the cups on it step up
 * on the side drum's strokes.
 */
export const LIFT_LINE: Pt[] = (() => {
  const out: Pt[] = [FOOT]
  for (const st of TOWER) out.push(st.A, st.B)
  return out
})()
const LIFT_S: number[] = (() => {
  const s = [0]
  for (let i = 1; i < LIFT_LINE.length; i++) s.push(s[i - 1] + Math.hypot(LIFT_LINE[i][0] - LIFT_LINE[i - 1][0], LIFT_LINE[i][1] - LIFT_LINE[i - 1][1]))
  return s
})()
export const LIFT_LENGTH = LIFT_S[LIFT_S.length - 1]
/** Arc length along the lift's line of a storey's A and B. */
export const liftA = (n: number): number => LIFT_S[1 + 2 * n]
export const liftB = (n: number): number => LIFT_S[2 + 2 * n]
export function onLift(s: number): Pt {
  const c = Math.max(0, Math.min(LIFT_LENGTH, s))
  let i = 1
  while (i < LIFT_S.length - 1 && LIFT_S[i] < c) i++
  const f = (c - LIFT_S[i - 1]) / Math.max(1e-9, LIFT_S[i] - LIFT_S[i - 1])
  return [LIFT_LINE[i - 1][0] + (LIFT_LINE[i][0] - LIFT_LINE[i - 1][0]) * f, LIFT_LINE[i - 1][1] + (LIFT_LINE[i][1] - LIFT_LINE[i - 1][1]) * f]
}

/** A ride on the lift: when the cup takes the ball, when it lets it go, and from where to where along the line. */
export interface Ride {
  from: number
  to: number
  s0: number
  s1: number
  /** The strokes it steps on, show seconds. */
  steps: number[]
}

/** One step of the lift: quick, eased at both ends, done well before the next stroke. */
export const STEP = 0.1
export function ride(from: number, to: number, s0: number, s1: number): Ride {
  const i0 = lastIndex(STROKES, from) + 1
  const i1 = lastIndex(STROKES, to - STEP)
  const steps = STROKES.slice(i0, i1 + 1)
  return { from, to, s0, s1, steps }
}
/** Where the lift has the ball on a ride at `t`: a step a stroke. */
export function rideAt(r: Ride, t: number): Pt {
  const n = r.steps.length
  let done = 0
  for (let i = 0; i < n; i++) {
    const a = r.steps[i]
    if (t >= a + STEP) done += 1
    else if (t > a) {
      const u = (t - a) / STEP
      done += u * u * (3 - 2 * u)
    }
  }
  return onLift(r.s0 + (r.s1 - r.s0) * (n ? done / n : t >= r.to ? 1 : 0))
}

/* ------------------------------------------------------------------ the timeline */

export const sOf = (k: number, q: number): number => STATEMENTS[k].t + q * BEAT

/** Every ride: the intro's (the foot to the first storey), and one after each statement but the last. */
export const RIDES: Ride[] = (() => {
  const out: Ride[] = [ride(bar(3) - 0.02, STATEMENTS[0].t - 0.25 * BEAT, 0, liftB(0))]
  for (let k = 0; k < STATEMENTS.length - 1; k++) {
    const a = lapOf(k).storey
    const b = lapOf(k + 1).storey
    out.push(ride(sOf(k, INTO_CUP), sOf(k + 1, -0.25), liftA(a), liftB(b)))
  }
  return out
})()

/** When each storey unfolds: the two bars before its first statement, while the ball rides up to it. */
export const UNFOLD = 2 * 2.5
export const unfoldsAt = (n: number): number => STATEMENTS[statementsOn(n)[0]].t - UNFOLD

/** When a storey's engine is let in: as the ball starts round it the second time (the last two storeys, the first). */
export const engineAt = (n: number): number => {
  const ks = statementsOn(n)
  return STATEMENTS[ks[ks.length - 1]].t
}
