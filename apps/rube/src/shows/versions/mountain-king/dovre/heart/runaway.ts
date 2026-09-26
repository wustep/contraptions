import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { CODA_SHOT, PLAN, SEAM_SHOT } from '../seams'
import { GOVERNOR, GOV_SNAP, GOV_STOPS, GOV_WEIGHTS, OOM, PAH, RUN_DX, T1, T2, VALVE_AT, VALVE_THROW, YOKE_GOES, kt } from './heart-clock'
import { ON_YOKE, YOKE_BUCKS, laneOf } from './heart-path'

/**
 * The runaway (124.01 → 134.25, phrases 16–17, A A, the fastest part: quarter 0.33 s down to 0.29 s), laid mirrored:
 * the heart past all control. The keeper throws the governor in to hold it; a piston flings Peer onto the governor's
 * yoke, which lifts him toward the chimney as the governor spins up; the pump pipe's safety valve blows (129.11),
 * the keeper sits on it and is thrown off (131.58); the governor opens past its stops and flies apart (132.79–133.67); the yoke drops him and he falls
 * straight down to the chimney's foot on the coda's first chord (134.25), where the director's finale takes him.
 * The room is drawn by the gears part; this part is his lane and the camera.
 */

const uniq = (list: number[]): number[] => {
  const out: number[] = []
  for (const t of [...list].sort((a, b) => a - b)) if (!out.length || t - out[out.length - 1] > 1e-4) out.push(t)
  return out
}

/** Every strike of the runaway: the seam, the blows and flares, the yoke, the brake and its snap, the governor coming apart. */
export const RUNAWAY_HITS: number[] = uniq([
  T1,
  ...OOM,
  ...PAH,
  kt(257),
  ON_YOKE,
  ...YOKE_BUCKS.flatMap((k) => [kt(k), kt(k + 1)]),
  GOVERNOR,
  VALVE_AT,
  VALVE_THROW,
  GOV_STOPS,
  ...GOV_WEIGHTS,
  YOKE_GOES,
  GOV_SNAP,
]).filter((t) => t >= T1 - 1e-6 && t < T2 - 1e-6)

/** A point of gears' frame in the runaway's. */
const g = (x: number, y: number): Pt => [x - RUN_DX, y]

export const runaway = part<{ begin: number }>(
  { name: 'runaway', draw: () => {} },
  (slot) => ({
    cells: box(-6, -6.5, 5, 3),
    exit: PLAN.runaway.exit,
    lane: { segs: laneOf(slot.begin, slot.end, RUN_DX), fire: ON_YOKE - slot.begin },
    state: { begin: slot.begin },
  }),
  (slot): PartShot[] => {
    const at = (t: number, cells: number, hold?: Pt, w?: number, off?: Pt): PartShot => ({ t, cells, hold, w, off })
    // CODA_SHOT's world point in this frame (laid mirrored from world x 51: the chimney's foot is this frame's exit),
    // nudged by dx, dy world cells.
    const coda = (dx: number, dy: number): Pt => [PLAN.runaway.exit[0] - 0.5 - (CODA_SHOT.world[0] + dx - 47.5), CODA_SHOT.world[1] + dy - 33]
    return [
      { t: slot.begin, ...SEAM_SHOT },
      // Flung onto the yoke: the governor, the whole of it, spinning up with him on it.
      at(ON_YOKE + 0.2, 9.2, g(11.6, -2.6), 0.55),
      at(ON_YOKE + 2.4, 6.0, undefined, 0, [-0.6, -0.9]),
      // The valve blows and the keeper sits on it: wide on the whole machine past control.
      at(VALVE_AT + 0.2, 11.0, g(7.4, -2.4), 0.7),
      at(VALVE_THROW, 7.0, g(12.4, -2.4), 0.45),
      // The governor opens past its stops: back, to hold the whole machine as it comes apart over him (the weights
      // flung, the flywheel split), and he drops into the collar low in the frame on the coda's first chord.
      at(GOV_STOPS, 10.0, coda(0, 0), 0.82),
      at(GOV_SNAP, CODA_SHOT.cells, coda(0, 0), CODA_SHOT.w),
      { t: slot.end, cells: CODA_SHOT.cells, hold: coda(0, 0), w: CODA_SHOT.w },
    ]
  },
)
