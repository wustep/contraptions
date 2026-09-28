import { BOOKS, CONTACT, CUP, G, IN_CUP, ON_SILL, R, SILL, type Book } from './desk'
import { TRACKS, barTime, kickAt, type Track } from './music'

/**
 * The ball's way round, once a track, as a function of show time.
 *
 * - **The sill.** Through the end of a track and the start of the next (no drums: the outro, the breath between, the
 *   intro), the ball walks the sill from the plant pot to the sill's right end, in front of the rain, never quite
 *   still, and reaches the end as the intro's last bar does.
 * - **The stair.** It tips off the end and lands on the top book as the drums come in, on the downbeat, and steps down
 *   the stair a half bar a step, each landing on a strong beat, the last onto the cup's cushion.
 * - **The cup.** It settles into the cup's hollow and sits there like a listener through the groove, nodding on the
 *   kick: the cup is playing the music. Through a break it only sways.
 * - **The lob.** On the last bar of drums, the cup's last kick lobs it back over the books onto the sill, where it
 *   rolls into the plant pot and comes back off it at a walk.
 *
 * Every leg starts where and as fast as the one before it ends. The last track has no lob: the ball stays in the cup
 * and goes still as the music ends.
 */

export interface Pose {
  x: number
  y: number
}

type Kind = 'sill' | 'tip' | 'fall' | 'roll' | 'cup' | 'lob'

export interface Leg {
  from: number
  to: number
  kind: Kind
  /** The track it belongs to. */
  track: number
  at(t: number): Pose
}

/** A landing: when, how hard (0 to 1), and on what. */
export interface Landing {
  t: number
  s: number
  on: 'sill' | 'book' | 'cup' | 'pot'
  /** The book's index in `BOOKS`, for a landing on a book. */
  book?: number
}

/** A nod in the cup: a kick pushes the ball up `h` cells and it comes back down over `d` seconds. */
export interface Nod {
  t: number
  h: number
  d: number
}

export const LEGS: Leg[] = []
export const LANDINGS: Landing[] = []
export const NODS: Nod[] = []
/** Each track's moments: the drop onto the top book, the landing in the cup, the lob, and the landing on the sill. */
export interface Lap {
  track: number
  /** When the ball leaves the sill's end, and lands on the top book (the drums' first downbeat). */
  tip: number
  drop: number
  /** When it lands in the cup. */
  cup: number
  /** When the cup lobs it, and when it lands on the sill (none on the last track). */
  lob: number | null
  land: number | null
  /** When it comes back off the pot. */
  bounce: number | null
}
export const LAPS: Lap[] = []

/* ------------------------------------------------------------------ pieces of way */

/** The speed a ball rolls off an edge at: a slow roll, so it tips over the corner rather than being thrown. */
const EDGE = 0.22
/** How far over the corner it pivots before it leaves it (radians), and how fast gravity turns it there. */
const TIP_TO = 0.62
const TIP_ACC = (G / R) * 0.3

interface TipFall {
  /** Seconds from the edge to the landing. */
  dur: number
  /** Where it lands (its middle's x), and how fast it is going along then. */
  x: number
  vx: number
  vy: number
  at(tau: number): Pose
}

/**
 * Over the corner of a surface at `top` whose end is at `edge` (going right), from rolling at `v`, and down to a
 * surface lower down (the ball's middle at `land`): it pivots on the corner, leaves it, and falls.
 */
function tipFall(edge: number, top: number, land: number, v = EDGE): TipFall {
  const w0 = v / R
  const tipDur = (-w0 + Math.sqrt(w0 * w0 + 2 * TIP_ACC * TIP_TO)) / TIP_ACC
  const w1 = w0 + TIP_ACC * tipDur
  const px = edge + R * Math.sin(TIP_TO)
  const py = top - R * Math.cos(TIP_TO)
  const vx = R * w1 * Math.cos(TIP_TO)
  const vy = R * w1 * Math.sin(TIP_TO)
  const fallDur = (-vy + Math.sqrt(vy * vy + 2 * G * (land - py))) / G
  return {
    dur: tipDur + fallDur,
    x: px + vx * fallDur,
    vx,
    vy: vy + G * fallDur,
    at(tau) {
      if (tau <= tipDur) {
        const a = w0 * tau + 0.5 * TIP_ACC * tau * tau
        return { x: edge + R * Math.sin(a), y: top - R * Math.cos(a) }
      }
      const s = tau - tipDur
      return { x: px + vx * s, y: py + vy * s + 0.5 * G * s * s }
    },
  }
}

/**
 * Along a flat way at height `y` from `x0` (going `v0`) to `x1` (going `v1`) in `dur` seconds: a cubic in time, its
 * speeds at the ends as asked, pulled in if they would make it go back on itself.
 */
function roll(x0: number, v0: number, x1: number, v1: number, dur: number, y: number): (tau: number) => Pose {
  const d = x1 - x0
  let m0 = v0 * dur
  let m1 = v1 * dur
  // A cubic Hermite in one direction stays monotone while its end slopes are within three times the chord.
  const cap = 3 * Math.abs(d)
  if (Math.abs(m0) > cap) m0 = Math.sign(m0) * cap
  if (Math.abs(m1) > cap) m1 = Math.sign(m1) * cap
  return (tau) => {
    const u = Math.max(0, Math.min(1, tau / dur))
    const u2 = u * u
    const u3 = u2 * u
    const x = (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * m1
    return { x, y }
  }
}

/** Half the width of the cushion's hollow, to the top of its shoulders. */
export const SHOULDER = 0.22

/**
 * How high the ball's middle sits `dx` from the cup's middle: down in the hollow, up its sides to the shoulders, and
 * over them a little way down the cushion's rounded outside.
 */
export function hollowY(dx: number): number {
  const a = Math.abs(dx)
  if (a <= SHOULDER) return IN_CUP.y - (CUP.hollow * (1 - Math.cos((Math.PI * a) / SHOULDER))) / 2
  return CUP.top - R + 1.5 * (a - SHOULDER) ** 2
}

/** Where it first touches the cushion, off the last book: on the cushion's near slope. */
const CUP_LAND_DX = -0.26

/* ------------------------------------------------------------------ the cup */

/** How far a nod lifts the ball at most, cells, and how long it takes as a share of the beat. */
const NOD_H = 0.075
const NOD_D = 0.46

/** The ball's sway in the hollow, as it sits: cells either side, at its fullest, and a full sway takes two bars. */
const SWAY = 0.028

interface CupStay {
  track: Track
  from: number
  to: number
  /** Where it came onto the cushion, and how fast along. */
  x0: number
  vx: number
  /** Whether it stays to the end of the show (the last track): its sway dies away after the drums. */
  last: boolean
}

function cupLeg(stay: CupStay): (t: number) => Pose {
  const { track, from, x0, vx, last } = stay
  // Settling into the hollow: a damped rock from where it came on, as fast as it came on.
  const dx0 = x0 - CUP.x
  const w = (2 * Math.PI) / 1.1
  const damp = 1.6
  const b = (vx + damp * dx0) / w
  const exit = barTime(track, track.exit)
  return (t) => {
    const s = t - from
    const settle = Math.exp(-damp * s) * (dx0 * Math.cos(w * s) + b * Math.sin(w * s))
    // The sway: a slow roll from side to side, two bars a sway, as full as the kit is (it is there in a break, less).
    const beat = (t - track.bars[0]) / track.period
    let sway = SWAY * Math.sin((2 * Math.PI * beat) / 8) * (1 - Math.exp(-s / 3))
    if (last) sway *= Math.exp(-Math.max(0, t - exit) / 5)
    const dx = settle + sway
    return { x: CUP.x + dx, y: hollowY(dx) - nodLift(t) }
  }
}

/** How far the nods have the ball up off the cushion at `t`. */
export function nodLift(t: number): number {
  let y = 0
  // Nods are short and in order; only the few round `t` can be up.
  for (let i = nodIndex(t); i >= 0 && i < NODS.length; i--) {
    const n = NODS[i]
    if (t < n.t) continue
    if (t > n.t + n.d) break
    const u = (t - n.t) / n.d
    // Pushed from below and falling back, a parabola in time as a toss is; and the cushion gives it back a little
    // once more before it sits (a small second bob, a third of the first's height and time), so a nod settles and
    // never stops dead.
    const first = 0.72
    const lift = u < first ? 4 * n.h * (u / first) * (1 - u / first) : 4 * 0.2 * n.h * ((u - first) / (1 - first)) * (1 - (u - first) / (1 - first))
    y = Math.max(y, lift)
  }
  return y
}

function nodIndex(t: number): number {
  let lo = 0
  let hi = NODS.length - 1
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1
    if (NODS[m].t <= t) lo = m
    else hi = m - 1
  }
  return lo
}

/* ------------------------------------------------------------------ the laps */

/** How fast the ball comes back off the pot. */
const WALK_START = 0.2

/**
 * The sill's walk, from `x0` going `v0` to the sill's end in `dur` seconds: it eases from the speed it comes off the pot
 * with to an even walk over two seconds, walks, and over its last second and a half eases to the speed it tips over the
 * end at. The walk's own speed is whatever brings it to the end on time.
 */
function walk(x0: number, v0: number, dur: number): (tau: number) => Pose {
  const x1 = SILL.x1
  const ta = Math.min(2, dur / 4)
  const tc = Math.min(1.5, dur / 4)
  const vc = (x1 - x0 - (v0 * ta) / 2 - (EDGE * tc) / 2) / (dur - ta / 2 - tc / 2)
  const da = ((v0 + vc) / 2) * ta
  const tb = dur - ta - tc
  return (tau) => {
    const s = Math.max(0, Math.min(dur, tau))
    let x: number
    if (s < ta) x = x0 + v0 * s + ((vc - v0) / (2 * ta)) * s * s
    else if (s < ta + tb) x = x0 + da + vc * (s - ta)
    else {
      const u = s - ta - tb
      x = x0 + da + vc * tb + vc * u + ((EDGE - vc) / (2 * tc)) * u * u
    }
    return { x, y: ON_SILL }
  }
}

function build(): void {
  // The first track: the ball is at the pot as the show begins, and sets off along the sill.
  let walkFrom = 0
  let walkX = CONTACT
  let walkV = WALK_START * 0.5
  for (const tr of TRACKS) {
    const last = tr.n === TRACKS.length - 1
    // The drums' first downbeat: the ball lands on the top book.
    const drop = barTime(tr, tr.entry)
    const top = BOOKS[0]
    const first = tipFall(SILL.x1, SILL.y, top.top - R)
    const tip = drop - first.dur
    // The walk along the sill, pot to end.
    const along = walk(walkX, walkV, tip - walkFrom)
    const from = walkFrom
    LEGS.push({ from, to: tip, kind: 'sill', track: tr.n, at: (t) => along(t - from) })
    LEGS.push({ from: tip, to: drop, kind: 'tip', track: tr.n, at: (t) => first.at(t - tip) })
    LANDINGS.push({ t: drop, s: 0.55, on: 'book', book: 0 })
    // Down the stair: a step every two beats, each landing on a strong beat.
    let at = drop
    let x = first.x
    let v = first.vx * 0.6
    for (let i = 0; i < BOOKS.length; i++) {
      const book: Book = BOOKS[i]
      const next = BOOKS[i + 1]
      // Off the last book it lands on the cushion's slope, as high as the cushion is where it comes down.
      let land = next ? next.top - R : hollowY(CUP_LAND_DX)
      let fall = tipFall(book.x1, book.top, land)
      for (let k = 0; !next && k < 3; k++) {
        land = hollowY(fall.x - CUP.x)
        fall = tipFall(book.x1, book.top, land)
      }
      const landAt = at + 2 * tr.period
      const rollTo = landAt - fall.dur
      const r = roll(x, v, book.x1, EDGE, rollTo - at, book.top - R)
      const start = at
      LEGS.push({ from: start, to: rollTo, kind: 'roll', track: tr.n, at: (t) => r(t - start) })
      LEGS.push({ from: rollTo, to: landAt, kind: 'fall', track: tr.n, at: (t) => fall.at(t - rollTo) })
      LANDINGS.push({ t: landAt, s: next ? 0.4 : 0.3, on: next ? 'book' : 'cup', book: next ? i + 1 : undefined })
      at = landAt
      x = fall.x
      v = fall.vx * 0.6
    }
    const cup = at
    // The lob: on the last bar of drums, beat three; it lands on the sill as the drums leave.
    const lob = last ? null : barTime(tr, tr.exit - 1, 2)
    const land = last ? null : barTime(tr, tr.exit)
    // Nods: the kick on a strong beat (one and three) pushes the ball up, as hard as it is struck and as full as the
    // bar is; a little more through the last bar before the lob.
    for (const run of tr.runs) {
      for (let i = run.from; i < run.to; i++) {
        for (const q of [0, 2]) {
          const g = barTime(tr, i, q)
          if (g < cup + tr.period * 0.9) continue
          if (lob !== null && g >= lob) continue
          const k = kickAt(tr, g)
          if (k < 0.45) continue
          const build = lob !== null && g >= lob - 4 * tr.period ? 1.35 : 1
          const lvl = 0.55 + 0.45 * (tr.level[i] ?? 1)
          NODS.push({ t: g, h: NOD_H * Math.min(1, k) * lvl * build, d: Math.min(0.5, NOD_D * tr.period * 1.4) })
        }
      }
    }
    const stay: CupStay = { track: tr, from: cup, to: lob ?? Infinity, x0: x, vx: v, last }
    const inCup = cupLeg(stay)
    LEGS.push({ from: cup, to: lob ?? Infinity, kind: 'cup', track: tr.n, at: inCup })
    if (lob === null || land === null) {
      LAPS.push({ track: tr.n, tip, drop, cup, lob: null, land: null, bounce: null })
      break
    }
    // It crouches into the cushion a moment before the kick that lobs it.
    LANDINGS.push({ t: lob - 0.1, s: 0.45, on: 'cup' })
    // The lob, from wherever it sits in the cup, over the books to the sill, a little way short of the pot.
    const start = inCup(lob)
    const toX = CONTACT + 0.62
    const T = land - lob
    const vx = (toX - start.x) / T
    const vy = (ON_SILL - start.y - 0.5 * G * T * T) / T
    LEGS.push({ from: lob, to: land, kind: 'lob', track: tr.n, at: (t) => {
      const s = t - lob
      return { x: start.x + vx * s, y: start.y + vy * s + 0.5 * G * s * s }
    } })
    LANDINGS.push({ t: land, s: 0.7, on: 'sill' })
    // On the sill it keeps some of its way, rolls into the pot slowing all the while, and comes back off it.
    const v0 = vx * 0.42
    const d = CONTACT - toX
    const v1 = -0.34
    const toPot = (2 * d) / (v0 + v1)
    const decel = (v1 - v0) / toPot
    const bounce = land + toPot
    LEGS.push({ from: land, to: bounce, kind: 'sill', track: tr.n, at: (t) => {
      const s = t - land
      return { x: toX + v0 * s + 0.5 * decel * s * s, y: ON_SILL }
    } })
    LANDINGS.push({ t: bounce, s: 0.35, on: 'pot' })
    LAPS.push({ track: tr.n, tip, drop, cup, lob, land, bounce })
    walkFrom = bounce
    walkX = CONTACT
    walkV = WALK_START
  }
  LEGS.sort((a, b) => a.from - b.from)
}

build()

/** The leg at `t` (the last one that has begun). */
export function legAt(t: number): Leg {
  let lo = 0
  let hi = LEGS.length - 1
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1
    if (LEGS[m].from <= t) lo = m
    else hi = m - 1
  }
  return LEGS[lo]
}

/** Where the ball's middle is at `t`. */
export function ballAt(t: number): Pose {
  return legAt(t).at(t)
}

/**
 * How squashed the ball is at `t`, 0 round, up to about a fifth: each landing squashes it as hard as it was, and it
 * springs back with a small overshoot, over about a quarter second. A nod's push squashes it a little as it starts.
 */
export function squashAt(t: number): number {
  let q = 0
  for (let i = LANDINGS.length - 1; i >= 0; i--) {
    const l = LANDINGS[i]
    const s = t - l.t
    if (s < 0) continue
    if (s > 0.6) break
    q += 0.2 * l.s * Math.exp(-s / 0.09) * Math.cos(s * 17)
  }
  return Math.max(-0.06, Math.min(0.22, q))
}
