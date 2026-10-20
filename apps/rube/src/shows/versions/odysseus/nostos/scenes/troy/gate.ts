import { ring, smooth } from '../../draw'
import { M } from '../../music'
import type { Pt } from '../../path'
import { GATE, SHAFT, TOWER } from './geo'

/**
 * The gate's machine, as the Trojans built it to raise their gate: a bucket on a rope down a shaft, the rope over a
 * pulley and round a drum, the drum's pinion driving a great wheel, and the wheel's own pinion running up a rack on the
 * gate. A man's weight in the bucket is not enough; six are not enough; the seventh, his, takes it down, and the gate
 * goes up with it.
 *
 * Everything here is a function of the bucket's drop, which is a function of show time; the gate and the wheels
 * follow it by their ratios, so they can never disagree.
 */

/** When the men drop into the bucket (each makes it give a little), and when his weight takes it down. */
export const HE_LANDS = 109.83
/** When the bucket reaches the shaft's floor, and its flap falls open into the drain. */
export const BOTTOM = 115.7
export const FLAP = 116.85
/** The men's landings in the bucket, set by the plan (in the order they come). */
let menLand: number[] = []
export function setMenLand(times: number[]): void {
  menLand = times
}

/** The bucket: its width, its depth, and how far it can go down. */
export const BUCKET = { w: 1.06, depth: 0.47, wall: 0.045 }
export const BUCKET_X = (SHAFT.x0 + SHAFT.x1) / 2
const RIM0 = SHAFT.top + 0.05
export const DROP = SHAFT.floor - BUCKET.depth - RIM0

/** The wheels: the drum and its pinion share an axle, the great wheel and its pinion another. Radii in cells. */
export const R_DRUM = 0.12
export const R_A = 0.16
export const R_B = 0.42
export const R_C = 0.26
/** The pinion that climbs the gate's rack, and the great wheel on its axle; the drum's axle beside them. */
export const AXLE_B: Pt = [GATE.x0 - 0.035 - R_C, -5.55]
export const AXLE_A: Pt = [AXLE_B[0] - (R_A + R_B), -5.55]
/** The pulley over the shaft that turns the rope down to the bucket. */
export const R_PULLEY = 0.07
export const PULLEY: Pt = [BUCKET_X + R_PULLEY, AXLE_A[1] + R_DRUM + R_PULLEY]

/** How far the bucket has gone down at `t` (cells): a give at each man's landing, then his weight, slowly, and the stop. */
export function drop(t: number): number {
  let d = 0
  for (const at of menLand) d += 0.02 * Math.max(-0.4, ring(t, at, 1.8, 0.35)) + 0.004 * smooth(t, at, at + 0.4)
  // His landing first stretches the rope, then the whole train gives, gathering way, and the bucket comes to rest on the
  // shaft's floor with a short bounce.
  const u = smooth(t, HE_LANDS + 0.05, BOTTOM)
  const run = u * u * (1.6 - 0.6 * u)
  d += (DROP - 0.054) * Math.min(1, run) + 0.03 * smooth(t, HE_LANDS, HE_LANDS + 0.2)
  d -= 0.018 * Math.max(0, ring(t, BOTTOM, 2.2, 0.25))
  return Math.min(DROP, d)
}

/** The bucket's rim's middle at `t`. */
export const rimAt = (t: number): Pt => [BUCKET_X, RIM0 + drop(t)]

/** How far the gate is up: the rope's run through the train's ratio. */
export const RATIO = (R_A / R_DRUM) * (R_C / R_B)
export const gateUp = (t: number): number => {
  // At dusk it stands open for the horse's ropes; by the night it has been let down (unseen, while we are at Ithaca).
  if (t < M.answer - 1) return (DROP - 0.04) * RATIO * (1 - smooth(t, M.second + 2, M.answer - 3))
  return Math.min(GATE.lift, Math.max(0, drop(t) - 0.04) * RATIO)
}

/** The wheels' turns (radians, clockwise on the screen): the drum and its pinion one way, the great wheel the other. */
export const turnA = (t: number): number => drop(t) / R_DRUM
export const turnB = (t: number): number => -turnA(t) * (R_A / R_B)

/** The flap on the bucket's seaward side: 0 shut, 1 lying open as a ramp into the drain. */
export const flapOpen = (t: number): number => smooth(t, FLAP, FLAP + 0.35)

/** The top of the tower's chamber, where the rope comes up through the floor. */
export const CHAMBER = { floor: TOWER.floor, roof: TOWER.roof }
