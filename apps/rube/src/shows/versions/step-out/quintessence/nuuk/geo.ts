import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { route, type Way } from '../kit'
import { at, SEAM } from '../music'
import { G } from '../physics'

/**
 * The bar at Nuuk's clock and ground (37.05 → 50.41, bars 17 to 24), in the place's own cells (the ball comes in at
 * (-0.5, 0), rolling in over the threshold from the harbour).
 *
 * Left to right: the harbour door he comes in by (its bell over it), the bar counter with the pilot hunched at it, the
 * little stage with its mic stand under a spotlight, the back door onto the quay, and the quay in the grey daylight.
 */

export const T0 = SEAM.nuuk
export const T1 = SEAM.sky

/* ------------------------------------------------------------------ the clock */

/** The harbour door swings to its stop and its bell rings as he comes in. */
export const BELL = at(17, 1)
/** Over the threshold. */
export const SILL = at(17, 2)
/** He starts to slow. */
const SLOW = at(17, 3)
/** He stops by the pilot. */
export const STOP = at(18, 3)
/** The pilot puts his glass down. */
export const GLASS = at(18, 1)
/** The thumb: the pilot's hand comes up off the glass, and the ring on his thumb catches the light. */
export const THUMB = at(19, 1)
/** It taps the counter, drunk, on the beat. */
export const TAPS = [at(19, 3), at(20, 1), at(20, 3)]
/** He hesitates: an inch toward the door he came in by, and back. */
const NUDGE: [number, number, number] = [at(20, 1), at(20, 2), at(20, 4)]
/** The hinge: the little stage's spotlight comes on, and she is on it. */
export const HINGE = at(21, 1)
/** Her guitar, on the beats. */
export const STRUMS = [at(21, 2), at(21, 3), at(21, 4), at(22, 1), at(22, 2)]
/** He is drawn toward her. */
export const DRIFT = at(22, 1)
/** She rolls off the stage, and out of the back door; she lands outside as the spotlight goes off. */
export const OFF_STAGE = at(22, 3)
export const SHE_LANDS = at(23, 1)
export const SPOT_OFF = at(23, 1)
/** He bangs the back door open, running: he goes warm from here. */
export const OUT = at(23, 4)
/** A plank of the quay knocks under him. */
export const PLANK = at(24, 1)
/** The back door slams shut behind him. */
export const SLAM = at(24, 3)

/* ------------------------------------------------------------------ the ground */

export const FLOOR = 0.13
/** The harbour door: its jambs, and the opening's head. */
export const DOOR_IN: [number, number] = [-0.3, -0.06]
export const HEAD = -2.3
/** The counter, its top. */
export const COUNTER: [number, number] = [0.9, 3.0]
export const COUNTER_TOP = -1.05
/** The pilot's stool. */
export const STOOL_X = 2.0
/** The stage and its top; the mic stand. */
export const STAGE: [number, number] = [3.3, 4.7]
export const STAGE_TOP = -0.42
export const MIC_X = 3.62
/** The back door, in the back wall. */
export const WALL_OUT: [number, number] = [5.25, 5.5]
export const DOOR_X = (WALL_OUT[0] + WALL_OUT[1]) / 2
/** The ceiling, and the spotlight on its beam. */
export const CEIL = -3.3
export const SPOT: Pt = [3.0, -3.05]

/** Where he stops, where she stands on the stage. */
export const STOP_X = 1.2
export const CHERYL_AT: Pt = [4.0, STAGE_TOP - 0.13]

/* ------------------------------------------------------------------ the way */

const V_DRIFT = 1.6
const DRIFT_X = STOP_X + (V_DRIFT / 2) * (SHE_LANDS - DRIFT)
const V_DOOR = (2 * (DOOR_X - DRIFT_X)) / (OUT - SHE_LANDS) - V_DRIFT
export const V_SKY = 2.2
export const EXIT_X = DOOR_X + ((V_DOOR + V_SKY) / 2) * (T1 - OUT)
const NUDGE_X = 0.1

export function nuukWay(): { segs: Seg[]; at: (t: number) => Pt } {
  const slowAt = -0.5 + (SLOW - T0)
  const ways: Way[] = [
    { at: T0, p: [-0.5, 0] },
    { at: SLOW, p: [slowAt, 0] },
    { at: STOP, p: [STOP_X, 0], ramp: [1, 0] },
    { at: NUDGE[0], p: [STOP_X, 0] },
    { at: NUDGE[1], p: [STOP_X - NUDGE_X, 0], ease: 'inout' },
    { at: NUDGE[2], p: [STOP_X, 0], ease: 'inout' },
    { at: DRIFT, p: [STOP_X, 0] },
    { at: SHE_LANDS, p: [DRIFT_X, 0], ramp: [0, V_DRIFT] },
    { at: OUT, p: [DOOR_X, 0], ramp: [V_DRIFT, V_DOOR] },
    { at: T1, p: [EXIT_X, 0], ramp: [V_DOOR, V_SKY] },
  ]
  const segs = route(ways)
  return {
    segs,
    at: (t) => {
      const q = laneAt({ segs, fire: 0 }, t - T0)
      return [q.x, q.y]
    },
  }
}
export const WAY = nuukWay()

/* ------------------------------------------------------------------ Cheryl */

/** She is there before the light comes on (out of shot), and gone out of shot after she leaves. */
export const CHERYL_FROM = HINGE - 0.6
const EDGE: Pt = [STAGE[1] + 0.05, CHERYL_AT[1]]
const LAND: Pt = [DOOR_X + 0.35, -0.0]
const V_OUT = 5.2
export const CHERYL_GONE = SHE_LANDS + 1.05

export function cherylAt(t: number): Pt | null {
  if (t < CHERYL_FROM || t >= CHERYL_GONE) return null
  if (t < HINGE) return CHERYL_AT
  // The sway: a little lean to the beat while she plays.
  if (t < OFF_STAGE) {
    const sway = 0.035 * Math.sin(((t - HINGE) / ((OFF_STAGE - HINGE) / 6)) * Math.PI)
    return [CHERYL_AT[0] + sway, CHERYL_AT[1]]
  }
  const tEdge = OFF_STAGE + 0.5
  if (t < tEdge) {
    const u = (t - OFF_STAGE) / (tEdge - OFF_STAGE)
    return [CHERYL_AT[0] + (EDGE[0] - CHERYL_AT[0]) * u * u, CHERYL_AT[1]]
  }
  if (t < SHE_LANDS) {
    // Off the stage's edge and through the door, on the flight gravity draws.
    const T = SHE_LANDS - tEdge
    const s = t - tEdge
    const vx = (LAND[0] - EDGE[0]) / T
    const vy = (LAND[1] - EDGE[1]) / T - 0.5 * G * T
    return [EDGE[0] + vx * s, EDGE[1] + vy * s + 0.5 * G * s * s]
  }
  const s = t - SHE_LANDS
  const v0 = (LAND[0] - EDGE[0]) / (SHE_LANDS - tEdge)
  return [LAND[0] + v0 * s + 0.5 * (V_OUT - v0) * s * s * 2, 0]
}

/* ------------------------------------------------------------------ strikes */

export const NUUK_STRIKES: number[] = [BELL, SILL, GLASS, THUMB, ...TAPS, HINGE, ...STRUMS, SHE_LANDS, OUT, PLANK, SLAM]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)
