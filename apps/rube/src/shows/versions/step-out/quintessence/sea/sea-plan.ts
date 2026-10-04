import type { Pt, Seg } from '../../../../../parts'
import { R } from '../../../../../parts'
import { carried, route, smooth, type Way } from '../kit'
import { at, SEAM } from '../music'
import { G } from '../physics'
import { BOAT, boomTip } from './boat'

/**
 * The sea's numbers and clocks (B3's). The frame: he comes in at (-0.5, 0) at the water's skin, falling at
 * [0.3, 7]; the surface is y 0, down is into the dark. The boat's transom is at x `BOAT_X0` (its hull from there to
 * the right, its keel a little under the surface), the same boat the sky saw from the air, in the same place.
 *
 * Every moving thing is a pure function of show time, read alike by the lane, the drawing and the camera.
 */

export const BEGIN = SEAM.sea
export const END = SEAM.iceland
/** The boat's transom, from where he goes in (as the sky has it: 1.7 cells right of the splash). */
export const BOAT_X0 = -0.5 + 1.7
/** The water's level (a ball's centre at it). */
export const W = 0

/* ------------------------------------------------------------------ the clock */

/** Under: bubbles go up from him on the strongest lows of bars 38 to 46 (the kick, and the bass under it). */
export const PUFFS = [at(38), at(38, 2), at(39), at(40), at(41), at(42), at(42, 2), at(43, 2), at(44), at(44, 3), at(45), at(45, 2), at(46)]
/** The net: it hits the water on bar 47, closes round him on beat 3, and the line comes taut on beat 4. */
export const NET_IN = at(47)
export const NET_ON = at(47, 3)
/** Out of the water as the band comes back (bar 48), and at the top of the haul on its second beat. */
export const OUT = at(48)
export const TOP = at(48, 2)
/** The boom swings him in over the deck; the net opens, and he drops to the deck on bar 49. */
export const SWUNG = at(48, 4) - 0.18
export const DECK_ON = at(49)
/** A fisherman's hand sets the cake down beside him (bar 50); he rolls over to it (bar 51); a drop off him lands on the wrapper. */
export const CAKE = at(50)
export const BY_CAKE = at(51)
export const DRIP = at(51, 2)

/* ------------------------------------------------------------------ places */

/** Where the line hangs from the boom, out over the stern, and where he is swung in to. */
export const LINE_X = boomTip(BOAT_X0, W, 0)[0]
/** His centre on the deck. */
export const DECK_Y = W + BOAT.deck - R
/** Where he lands, and where he comes to rest by the cake; the cake and its wrapper. */
export const LAND_X = boomTip(BOAT_X0, W, 1)[0]
export const REST_X = LAND_X + 0.42
export const CAKE_X = REST_X + 1.02
export const WRAP = { x0: REST_X + 0.15, x1: REST_X + 1.6 }
/** How far under the boom's tip he hangs in the net. */
export const HANG = 0.67

/* ------------------------------------------------------------------ under */

/** How quickly the water takes his speed, and how slowly he sinks after. */
const TAU = 0.3
const SINK = 0.13
/** He drifts in the current from where he went in toward the boat's stern, slowly, rocking a little. */
export function sinking(t: number): Pt {
  const u = Math.max(0, t - BEGIN)
  const y = W + SINK * u + (7 - SINK) * TAU * (1 - Math.exp(-u / TAU))
  const drift = LINE_X + 0.5 - 0.15
  const x = -0.5 + 0.15 * (1 - Math.exp(-u / 0.5)) + drift * smooth(t, BEGIN + 1.5, NET_ON - 0.4) + 0.06 * Math.sin(u * 0.9) * smooth(t, BEGIN + 1, BEGIN + 3) * (1 - smooth(t, NET_ON - 2, NET_ON - 0.4))
  return [x, y]
}

/** The boom's swing, 0 out over the stern to 1 in over the deck. */
export const swingAt = (t: number): number => smooth(t, TOP + 0.05, SWUNG)

/** The parcel: it leaves him at the skin and goes down faster than he does (the radio in it), turning, into the dark. */
export function parcelAt(t: number): { p: Pt; rot: number } {
  const u = Math.max(0, t - BEGIN)
  const sink = 0.85
  const y = 0.02 + sink * u + (7 - sink) * 0.38 * (1 - Math.exp(-u / 0.38))
  const x = -0.5 + 0.27 + 0.3 * 0.6 * (1 - Math.exp(-u / 0.6)) - 0.12 * u
  return { p: [x, y], rot: 1.4 * (BEGIN - at(36, 3)) + u * 0.35 }
}

/* ------------------------------------------------------------------ the lane */

export function plan(begin: number): Seg[] {
  const rel = (t: number) => t - begin
  const net = sinking(NET_ON)
  const under = carried(sinking, begin, NET_ON, Math.ceil((NET_ON - begin) / 0.02))
  // The haul: up from where the net took him to the surface, faster and faster; out, and slowing to the boom.
  const d1 = net[1] - W
  const v1 = (2 * d1) / (OUT - NET_ON) - 1
  const top: Pt = [LINE_X, boomTip(BOAT_X0, W, 0)[1] + HANG]
  const d2 = W - top[1]
  const v2 = Math.max(0.2, (2 * d2) / (TOP - OUT) - v1)
  const haul: Way[] = [
    { at: rel(NET_ON), p: net },
    { at: rel(OUT), p: [LINE_X, W], ramp: [1, v1] },
    { at: rel(TOP), p: top, ramp: [v1, v2] },
  ]
  // Swung in on the boom, hanging under its tip.
  const swing = carried((t) => {
    const [x, y] = boomTip(BOAT_X0, W, swingAt(t))
    return [x, y + HANG]
  }, TOP, SWUNG, 30)
  // The net opens and he drops from rest onto the deck, landing on bar 49.
  const hung = boomTip(BOAT_X0, W, 1)
  const fallFrom: Pt = [hung[0], hung[1] + HANG]
  const T = Math.sqrt((2 * (DECK_Y - fallFrom[1])) / G)
  const opens = DECK_ON - T
  const deck: Way[] = [
    { at: rel(SWUNG), p: fallFrom },
    { at: rel(opens), p: fallFrom },
    { at: rel(DECK_ON), p: [fallFrom[0], DECK_Y], ease: 'in' },
    { at: rel(BY_CAKE - 0.62), p: [LAND_X, DECK_Y] },
    { at: rel(BY_CAKE), p: [REST_X, DECK_Y], ease: 'inout' },
    { at: rel(END), p: [REST_X, DECK_Y] },
  ]
  return [...under, ...route(haul), ...swing, ...route(deck)]
}

/** When the net opens (from rest, the drop takes it to the deck on bar 49). */
export const OPENS = DECK_ON - Math.sqrt((2 * (DECK_Y - (boomTip(BOAT_X0, W, 1)[1] + HANG))) / G)

/* ------------------------------------------------------------------ the shark */

/**
 * The shark: a dark shape that goes by far off, slow, like a porpoise; comes back the other way nearer, behind him;
 * and turns, out of sight, and comes by in front and under him, slowest and nearest of all, as the net comes down.
 * Its place, its size (nearness), which way it heads, and whether it is in front of him.
 */
export interface Shark {
  x: number
  y: number
  s: number
  dir: number
  front: boolean
  /** How much of it the water lets through: far is faint. */
  a: number
}
const PASSES = [
  { t0: at(40, 3), t1: at(43, 3), x0: -9, x1: 9.5, y0: 5.2, y1: 4.8, s: 0.42, front: false, a: 0.45 },
  { t0: at(43, 4), t1: at(45, 4), x0: 9, x1: -7.5, y0: 4.75, y1: 4.55, s: 0.72, front: false, a: 0.75 },
  { t0: at(46), t1: at(48, 4), x0: -7.5, x1: 8.5, y0: 5.6, y1: 5.45, s: 1.05, front: true, a: 1 },
]
export function sharkAt(t: number): Shark | null {
  for (const q of PASSES) {
    if (t < q.t0 || t > q.t1) continue
    const u = (t - q.t0) / (q.t1 - q.t0)
    // A slow, even cruise, a little sway in its line.
    const x = q.x0 + (q.x1 - q.x0) * u
    const y = q.y0 + (q.y1 - q.y0) * u + 0.12 * Math.sin(u * Math.PI * 2)
    return { x, y, s: q.s, dir: Math.sign(q.x1 - q.x0), front: q.front, a: q.a }
  }
  return null
}
export const SHARK_PASSES = PASSES
