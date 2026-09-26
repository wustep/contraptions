import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { CODA_SHOT, PLAN } from '../seams'
import { GOVERNOR, GOV_SNAP, GOV_STOPS, GOV_WEIGHTS, OOM, PAH, RUN_DX, T1, T2, VALVE_AT, VALVE_THROW, YOKE_GOES, kt } from './heart-clock'
import { ON_YOKE, YOKE_BUCKS, laneOf } from './heart-path'

/**
 * The runaway (124.01 → 134.25, phrases 16–17, A A, the fastest part: quarter 0.33 s down to 0.29 s), laid mirrored:
 * the heart past all control. The keeper throws the governor in to hold it; a piston flings Peer onto the governor's
 * yoke, which lifts him toward the chimney as the governor spins up, bucking him on the blows; the pump pipe's safety
 * valve blows (129.11) and bucks him off onto the racing pump heads and back onto the yoke; the keeper sits on the
 * valve and is thrown off (131.58); the governor opens past its stops and flies apart (132.79–133.67); the yoke drops him and he falls
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

export const runaway = part<{ begin: number }>(
  { name: 'runaway', draw: () => {} },
  (slot) => ({
    cells: box(-6, -6.5, 5, 3),
    exit: PLAN.runaway.exit,
    lane: { segs: laneOf(slot.begin, slot.end, RUN_DX), fire: ON_YOKE - slot.begin },
    state: { begin: slot.begin },
  }),
  (slot): PartShot[] => {
    // CODA_SHOT's world point in this frame (laid mirrored from world x 51: the chimney's foot is this frame's exit),
    // nudged by dx, dy world cells.
    const coda = (dx: number, dy: number): Pt => [PLAN.runaway.exit[0] - 0.5 - (CODA_SHOT.world[0] + dx - 47.5), CODA_SHOT.world[1] + dy - 33]
    // A point in WORLD cells, in this frame.
    const wp = (x: number, y: number): Pt => coda(x - CODA_SHOT.world[0], y - CODA_SHOT.world[1])
    // The machine past control: from the heart and the drum room whole (its drummers still beating), in on the
    // governor and the yoke that lifts him; out again to both rooms as the valve blows and the keeper rides it (the
    // drum room shaking over the heart); then in to the whole heart (11 cells) as the governor comes apart, and to the
    // coda's seam as the spindle splits the flywheel.
    const close = (t: number, cells: number, x: number, y: number, w = 0.5): PartShot => ({ t, cells, hold: wp(x, y), w })
    return [
      { t: slot.begin, cells: 18, hold: wp(54.4, 26.9), w: 0.9 },
      close(kt(262), 9.0, 50.4, 30.6, 0.5),
      close(kt(268), 9.2, 50.4, 30.5, 0.5),
      { t: 130.3, cells: 18, hold: wp(54.2, 26.9), w: 0.9 },
      { t: 132.6, cells: 11, hold: wp(53.2, 30.6), w: 0.86 },
      { t: slot.end, cells: CODA_SHOT.cells, hold: coda(0, 0), w: CODA_SHOT.w },
    ]
  },
)
