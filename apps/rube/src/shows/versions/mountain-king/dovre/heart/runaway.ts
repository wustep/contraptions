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
    // The machine past control: from the heart and the drum room whole (its drummers still beating), held a bar, then
    // in on the governor and the yoke that lifts him; then one mid frame (9.0 → 9.8 cells, a slow drift west) held on
    // the governor, the yoke, the valve and its keeper through the story's beats: the valve blows and bucks him off
    // onto the racing pump heads and back, the keeper rides it and is thrown off. The mid frame sits east of him (the
    // camera at world x ≈ 51.3, he at 47.5 on its left third): the heart's west wall bounds it on the left, and the
    // whole flywheel stands on the right with its rim clear of the edge. It mostly holds (w 0.8 both ways), so it is one
    // held picture as the valve bucks him east and back, its top under the drum room's floor (world 25.95; ≥ 26.3 from
    // 126.8 on). Then out to the whole heart (10.6 cells) as the governor comes apart, sitting low so the drum room over
    // it stays out (top ≥ 26.3), and to the coda's seam as the spindle splits the flywheel.
    const close = (t: number, cells: number, x: number, y: number, w = 0.8, wy = w): PartShot => ({ t, cells, hold: wp(x, y), w, wy })
    return [
      { t: slot.begin, cells: 18, hold: wp(54.4, 26.9), w: 0.9 },
      // The wide held through the fastest phrase's first bar (a slow creep, so the pull-back lands on its downbeat
      // and stays): the governor thrown in and the pump flinging him onto its yoke, with the drummers over it all.
      { t: kt(259), cells: 17, hold: wp(54.1, 27.4), w: 0.9 },
      close(kt(265), 9.0, 52.2, 30.96),
      close(kt(268), 9.2, 52.2, 31.1),
      close(VALVE_THROW + 0.2, 9.8, 52.15, 31.53),
      { t: 132.6, cells: 10.6, hold: wp(51.6, 31.9), w: 0.86 },
      { t: slot.end, cells: CODA_SHOT.cells, hold: coda(0, 0), w: CODA_SHOT.w },
    ]
  },
)
