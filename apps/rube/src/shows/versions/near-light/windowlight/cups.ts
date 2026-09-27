import { add, dir, fly, hermite, ring, scale, settle, type Pt } from './kit'
import { CUPS_FROM } from './layout'
import { onset, since } from './music'

/**
 * The cups: the intro. Eight little counterweighted arms on a slanting beam, each with a felt cup at its end, and the
 * felt piano handing the ball down them, one chord at a time.
 *
 * A cup catches the ball as a chord is struck (it gives a little under it, and comes back), then leans, slowly at
 * first and faster as the weight wins, until it meets its stop; the ball rolls out over the lip and drops into the
 * next cup as the next chord is struck. Let go, the arm swings back up on its counterweight and settles. The last cup
 * pours the ball into the trough as the strings come in.
 *
 * Which chords: the first of the piece (bar 0's downbeat), and after it the strongest of each phrase, so the ball is
 * handed on every three or four seconds and leans through the piano's two long breaths (17 to 26 s, 30 to 41 s).
 */

/** The chords the cups catch the ball on, and the strings' entry, where the trough does (measured onsets). */
export const CATCHES: number[] = [0.16, 3.13, 7.04, 10.26, 12.26, 16.96, 25.96, 30.22, 41.03].map((t, i) =>
  onset(t, i < 8 ? 'intro' : 'strings').t,
)
/** How hard each was played, against its section: how far the cup gives under the ball. */
export const WEIGHTS: number[] = CATCHES.map((t, i) => Math.min(2, onset(t, i < 8 ? 'intro' : 'strings').s))

export const COUNT = 8

/** Cells from pivot to cup, and from pivot to counterweight. */
export const ARM = 0.5
export const BACK = 0.3
/** Where the ball sits over the arm's line in the cup. */
const SEAT = 0.14
/** At rest the cup end is up a little; at its stop it is down a little, enough to let the ball go. */
export const REST = -0.17
export const STOP = 0.3
/** Seconds rolling out over the lip; how fast it leaves, along the lip; seconds in the air to the next cup. */
const ROLL = 0.25
const OUT = 1.3
const FLIGHT = 0.42
/** Into the trough: a softer pour, a little shorter. */
const LAST_OUT = 1.0
const LAST_FLIGHT = 0.4

const up = (g: number): Pt => [Math.sin(g), -Math.cos(g)]
/** From the ball at rest in a cup to its pivot. */
const TO_PIVOT: Pt = add(scale(dir(REST), -ARM), scale(up(REST), -SEAT))
/** From a pivot to the ball in its cup with the arm at `g`. */
const FROM_PIVOT = (g: number): Pt => add(scale(dir(g), ARM), scale(up(g), SEAT))
/** From a pivot to just over the lip, where the ball leaves the cup at its stop. */
const TO_LIP: Pt = add(FROM_PIVOT(STOP), scale(dir(STOP), 0.2))
/** Where a ball that leaves a lip at `speed`, along it, is `T` seconds later. */
const poured = (lip: Pt, speed: number, T: number): Pt => fly(lip, scale(dir(STOP), speed), T)

/**
 * The ball at rest in each cup, and the trough's floor after them: each cup stands where the one before pours the
 * ball, so every pour is a ball rolling off a tipped lip and falling, and nothing is thrown.
 */
const chain = (() => {
  const seats: Pt[] = []
  let at: Pt = CUPS_FROM
  for (let i = 0; i < COUNT; i++) {
    seats.push(at)
    const lip = add(add(at, TO_PIVOT), TO_LIP)
    at = i < COUNT - 1 ? poured(lip, OUT, FLIGHT) : poured(lip, LAST_OUT, LAST_FLIGHT)
  }
  return { seats, floor: at }
})()
export const SEATS: Pt[] = chain.seats
/** The trough's floor: where the last cup pours the ball. */
export const FLOOR: Pt = chain.floor
/** Each arm's pivot. */
export const PIVOTS: Pt[] = SEATS.map((s) => add(s, TO_PIVOT))

/** Where the ball sits in cup `i` with its arm at `g`. */
export const seat = (i: number, g: number): Pt => add(PIVOTS[i], FROM_PIVOT(g))
/** The cup's middle (its bowl), with its arm at `g`. */
export const bowl = (i: number, g: number): Pt => add(PIVOTS[i], scale(dir(g), ARM))

export interface Pour {
  /** The chord it is caught on; when the arm meets its stop and the ball starts out; over the lip; the next catch. */
  catch: number
  pour: number
  off: number
  next: number
  /** Over the lip, and the speed it leaves at. */
  from: Pt
  v: Pt
  /** Where it lands. */
  to: Pt
}

export const POURS: Pour[] = Array.from({ length: COUNT }, (_, i) => {
  const last = i === COUNT - 1
  const next = CATCHES[i + 1]
  const off = next - (last ? LAST_FLIGHT : FLIGHT)
  const from = add(PIVOTS[i], TO_LIP)
  return { catch: CATCHES[i], pour: off - ROLL, off, next, from, v: scale(dir(STOP), last ? LAST_OUT : OUT), to: last ? FLOOR : SEATS[i + 1] }
})

/**
 * The arm's lean after a catch, 0 to 1 of the way to its stop: slow while the felt damper holds it, faster as the
 * weight wins, meeting the stop with some speed.
 */
const lean = (u: number): number => Math.pow(Math.max(0, Math.min(1, u)), 1.6)

/** Cup `i`'s arm at show time `t`, radians (clockwise from level; positive is the cup end down). */
export function arm(i: number, t: number): number {
  const p = POURS[i]
  const s = since(t, p.catch)
  const span = p.pour - p.catch
  if (s >= 0 && s < span) {
    // Holding the ball: the give of the catch, and the lean.
    return REST + (STOP - REST) * lean(s / span) + 0.09 * WEIGHTS[i] * ring(s, 0.55, 0.28)
  }
  const back = since(t, p.pour)
  if (back >= 0 && back < 8) {
    // Let go at its stop: back up on the counterweight, over a little, settling; gone by eight seconds.
    const fade = back > 6 ? 1 - (back - 6) / 2 : 1
    return REST + (STOP - REST) * settle(back, 1.35, 0.42) * fade
  }
  return REST
}

/** The ball in the cups at show time `t` (in [CATCHES[0], CATCHES[8])): where it is, and whether it is in the air. */
export function ballInCups(t: number): { p: Pt; flying: boolean; cup: number } {
  let i = 0
  while (i + 1 < COUNT && t >= POURS[i + 1].catch) i++
  const p = POURS[i]
  if (t < p.pour) return { p: seat(i, arm(i, t)), flying: false, cup: i }
  if (t < p.off) {
    // Rolling out over the lip from a standstill at the stop, to the speed it leaves at.
    return { p: hermite({ t: p.pour, p: seat(i, STOP), v: [0, 0] }, { t: p.off, p: p.from, v: p.v }, t), flying: false, cup: i }
  }
  return { p: fly(p.from, p.v, t - p.off), flying: true, cup: i }
}

/** The catches' squash: the ball gives a little of its height as each cup takes it, as hard as the chord was played. */
export function cupSquash(t: number): number {
  let q = 0
  for (let i = 0; i < COUNT; i++) {
    const s = since(t, CATCHES[i])
    if (s < 0 || s > 0.6) continue
    q += 0.12 * Math.min(1.4, WEIGHTS[i]) * (1 - Math.exp(-s / 0.012)) * Math.exp(-s / 0.08) * Math.cos((2 * Math.PI * s) / 0.32)
  }
  return q
}
