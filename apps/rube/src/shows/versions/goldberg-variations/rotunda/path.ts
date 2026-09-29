import { R as BALL_R, mixHex, type Pt } from '../../../../parts'
import type { ShowBall } from '../../../../show'
import { STARTS, VARIATIONS, trackAt, wrap } from './music'
import { GOLD, INK, IVORY, PEARL, PEARL_RIM, SILVER, clamp, pulse, smooth } from './world'

/**
 * Where the ball is. The ball goes round the colonnade's rail once to a variation: a variation is thirty-two bars over
 * the same ground bass and the colonnade has thirty-two columns, one to a bar. The lap's pace is the recording's: a
 * smooth curve through "track k starts, k laps done", so the ball is at the gate at the top of every variation, goes
 * round the slower the longer the variation is, and never starts or stops between.
 *
 * The room is drawn from a little above, as a plan tilted back: a point is where it is round the ring (`phi`, radians,
 * 0 at the gate, in front, and clockwise from above, so the ball crosses the front to the right), how far out from the
 * middle, and how high.
 */

export const COLUMNS = 32
/** The ring's radius, cells. */
export const RING = 6.4
/** The columns' height to the underside of the band, the top of the rail, and the height the ball's centre rides at. */
export const HEIGHT = 2.5
export const RAIL = 2.8
export const SEAT = RAIL + 0.2
/** How big the ball is drawn: the engine's ball is small for a room this size. */
export const BALL_SCALE = 1.6
const BAR = 1 / COLUMNS

/**
 * How the room is seen at a moment: how far the plan is tilted back (`sin`: a circle on the floor is an ellipse this
 * much as tall as it is wide), how tall a column stands for it (`cos`), and how far the room has been turned about its
 * middle (`turn`, radians, the way the ball goes), which it is only in the Adagio.
 */
export interface View {
  sin: number
  cos: number
  turn: number
}

/**
 * The view rises as the floor is written, so that what has been played takes more of the picture the more of it there
 * is: low for the Aria, where the colonnade is all there is; a little higher through the first half; lifted by the
 * overture, with the light that comes in from above; brought low and close for the Adagio; highest for the quodlibet and
 * the da capo, over the whole floor; and down again in the dark as the lamps go out, so the loop closes where it opened.
 */
export const LOW = 0.34
export function tiltAt(time: number): number {
  const t = wrap(time)
  const end = STARTS[N]
  return (
    LOW +
    0.07 * smooth(t, STARTS[1], STARTS[15]) +
    0.1 * smooth(t, STARTS[16] + 3, STARTS[16] + 55) -
    0.1 * pulse(t, STARTS[25] - 8, STARTS[25] + 60, STARTS[26] - 60, STARTS[26] + 8) +
    0.06 * smooth(t, STARTS[29], STARTS[31] + 30) -
    0.23 * smooth(t, end - 110, end - 12)
  )
}

/**
 * How far round the room has turned in the Adagio, as a share of a turn: it comes to follow the pearl over the first
 * bars and turns with it, a whole turn by the end, so that the pearl is held near the front, dark over the lit floor,
 * and the columns go by behind it. It starts and stops from rest, and a whole turn is no turn, so the room after is
 * the room before.
 */
const EASE = 0.12
const SPAN = 1 - EASE
function eased(p: number): number {
  const a = (x: number): number => EASE * (x * x * x - (x * x * x * x) / 2)
  if (p <= EASE) return a(p / EASE) / SPAN
  if (p >= 1 - EASE) return 1 - a((1 - p) / EASE) / SPAN
  return (EASE / 2 + (p - EASE)) / SPAN
}
export function turnAt(time: number): number {
  const { v, p } = lapAt(time)
  return v === 25 ? eased(p) : 0
}

/** The view at show time `t`. */
export function viewAt(time: number): View {
  const sin = tiltAt(time)
  return { sin, cos: Math.sqrt(1 - sin * sin), turn: 2 * Math.PI * turnAt(time) }
}

/** A point of the room on the screen, in world cells: `phi` round from the gate, `r` out, `h` up. */
export function project(phi: number, r: number, h: number, view: View): Pt {
  const a = phi - view.turn
  return [r * Math.sin(a), r * Math.cos(a) * view.sin - h * view.cos]
}

/** A point of the floor. */
export const floorPt = (phi: number, r: number, view: View): Pt => project(phi, r, 0, view)

/** How far in front of the middle a point is, for laying things back to front. */
export const depth = (phi: number, r: number, view: View): number => r * Math.cos(phi - view.turn)

// ---------------------------------------------------------------- the lap

const N = VARIATIONS.length
const HS = Array.from({ length: N }, (_, i) => STARTS[i + 1] - STARTS[i])
/** Fritsch–Butland tangents of the monotone curve through (start of track k, k). */
const TANGENTS: number[] = (() => {
  const s = HS.map((h) => 1 / h)
  const m: number[] = new Array(N + 1)
  m[0] = s[0]
  m[N] = s[N - 1]
  for (let i = 1; i < N; i++) {
    const h0 = HS[i - 1]
    const h1 = HS[i]
    m[i] = (3 * (h0 + h1)) / ((2 * h1 + h0) / s[i - 1] + (h1 + 2 * h0) / s[i])
  }
  return m
})()

/** Laps done at show time `t` (wrapped), 0 to 32. */
export function lapsAt(t: number): number {
  const { i } = trackAt(t)
  const h = HS[i]
  const u = clamp((t - STARTS[i]) / h)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * i + (u3 - 2 * u2 + u) * h * TANGENTS[i] + (-2 * u3 + 3 * u2) * (i + 1) + (u3 - u2) * h * TANGENTS[i + 1]
}

export interface Lap {
  /** Which track, 0 to 31. */
  v: number
  /** How far round its lap, 0 to 1. */
  p: number
}

export function lapAt(time: number): Lap {
  const t = wrap(time)
  const { i } = trackAt(t)
  return { v: i, p: clamp(lapsAt(t) - i) }
}

// ---------------------------------------------------------------- the riders

/** How far the ball has turned into the pearl at `t`: 0 to 1, over the Adagio. */
export function pearlAt(time: number): number {
  const t = wrap(time)
  return pulse(t, STARTS[25] - 1, STARTS[25] + 14, STARTS[26] - 16, STARTS[26] + 1)
}

/** A rider's place round the ring, and how it is drawn. */
export interface Rider extends ShowBall {
  /** Nearer the viewer is greater: the order they are painted in. */
  z: number
}

const two = 2 * Math.PI

function rider(view: View, id: number, phi: number, r: number, h: number, scale: number, color: string, rim?: string): Rider {
  const [x, y] = project(phi, r, h, view)
  return { id, x, y, scale, color, rim, spin: x / (BALL_R * Math.max(scale, 0.3)), angle: 0, z: depth(phi, r, view) }
}

/** Up over the first `a` of a lap and down over the last `b`, as shares of it. */
const bars = (p: number, a: number, b: number): number => smooth(p, 0, a * BAR) * (1 - smooth(p, 1 - b * BAR, 1))

/** The companions of the ball's lap: the second hand, the follower of a canon, the tunes of the quodlibet. */
export const QUOD = ['#9CC58A', '#C58AC0', '#E58F6A', '#7DB4E0', '#E3D27A']

/**
 * The riders at show time `t`, back to front. The first is always the ball, on the rail at the head of the lap; the
 * variation may give it company:
 * - the ones for two hands: a second ball comes out of the first and they go round each other on the rail, hand over
 *   hand, and are one again at the end of the lap;
 * - a canon: the second voice, one column (one bar) behind, on a rail higher by the interval, in contrary motion (the
 *   other way round, the two passing at the back at the half) where the score turns the tune upside down;
 * - the quodlibet: five small tunes in a line behind it.
 */
export function ridersAt(time: number): Rider[] {
  const { v, p } = lapAt(time)
  const t = wrap(time)
  const spec = VARIATIONS[v]
  const phi = two * p
  const pearl = pearlAt(t)
  const view = viewAt(t)
  // The ball is seen at the first and last seconds of the period as it comes out of the dark and goes back into it.
  const seen = pulse(t, 0.4, 4.4, STARTS[N] - 14, STARTS[N] - 2)
  const out: Rider[] = []

  let color: string = IVORY
  let dh = 0
  let dr = 0
  let hands = 0
  if (spec.kind === 'hands') {
    hands = bars(p, 2, 2)
    // Twice as many crossings as the lap is long in tens of bars, more or less; an even number, so they come back as they went.
    const crossings = 2 * (1 + (v % 3))
    const turn = Math.PI * crossings * smooth(p, 0.03, 0.97)
    const d = 0.3 * hands
    dr = d * Math.sin(turn)
    dh = d * Math.cos(turn)
    color = mixHex(IVORY, GOLD, hands)
    const second = rider(view, 1, phi, RING - dr, SEAT - dh, hands * BALL_SCALE, SILVER)
    out.push(second)
  }
  const lead = rider(view, 0, phi, RING + dr, SEAT + dh, BALL_SCALE * (1 + 0.16 * pearl) * seen, mixHex(color, PEARL, pearl), mixHex(INK, PEARL_RIM, pearl))
  out.push(lead)

  if (spec.kind === 'canon') {
    const e = bars(p, 3, 3)
    const sign = spec.inverse ? -1 : 1
    const h = SEAT + ((spec.interval ?? 1) - 1) * 0.15
    out.push(rider(view, 1, sign * two * (p - BAR), RING, h, BALL_SCALE * 0.9 * e, SILVER))
  }
  if (spec.kind === 'quodlibet') {
    QUOD.forEach((c, j) => {
      const e = bars(p, 4 + j, 5 + j)
      out.push(rider(view, 2 + j, two * (p - (1.5 + 1.3 * j) * BAR), RING, SEAT, BALL_SCALE * 0.6 * e, c))
    })
  }
  // The hands' second ball is nearer or farther than the first by which side of the rail it is on.
  return out.sort((a, b) => a.z - b.z)
}

/** The ball itself. */
export function leaderAt(time: number): Rider {
  return ridersAt(time).find((r) => r.id === 0)!
}
