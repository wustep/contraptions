import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { PLAN, SEAM_SHOT } from '../seams'
import { BELLOWS, FLY, OOM, PAH, PISTONS, T0, T1, kt } from './heart-clock'
import { HOPS, OFF_FLY, laneOf } from './heart-path'
import { drawHeart, drawHeartOver } from './heart-set'

/**
 * The mountain's heart, the gears (101.95 → 124.01, phrases 12–15, A A B B, fortissimo), laid mirrored: the machine
 * the trolls built the hall on, woken by Peer's fall and growing a mechanism every phrase. The hammer bats him on
 * every 1 and 3, the furnace flares on every 2 and 4; he is flung onto the flywheel as it engages (107.75), off it
 * onto the pistons as they start (113.36), bounced higher when the great bellows come in (118.72), and is back down
 * on the first piston for the runaway (124.01). This part draws the whole room for both of the heart's parts
 * (`heart-set.ts`); its clock is `heart-clock.ts`, his path `heart-path.ts`.
 */

const uniq = (list: number[]): number[] => {
  const out: number[] = []
  for (const t of [...list].sort((a, b) => a - b)) if (!out.length || t - out[out.length - 1] > 1e-4) out.push(t)
  return out
}

/** Every strike of the gears: his landing, the blows and the flares, the new mechanisms, every landing and fling on the pistons. */
export const GEARS_HITS: number[] = uniq([
  T0,
  ...OOM,
  ...PAH,
  FLY,
  PISTONS,
  BELLOWS,
  OFF_FLY,
  ...HOPS.flatMap((h) => [kt(h.k), kt(h.off)]),
]).filter((t) => t >= T0 - 1e-6 && t < T1 - 1e-6)

export const gears = part<{ begin: number }>(
  {
    name: 'gears',
    draw: (p, s, c) => drawHeart(p, c, s.begin + c.t),
    over: (p, s, c) => drawHeartOver(p, c, s.begin + c.t),
  },
  (slot) => ({
    cells: box(-1.5, -6.5, 15.5, 3),
    exit: PLAN.gears.exit,
    lane: { segs: laneOf(slot.begin, slot.end), fire: OOM[0] - slot.begin },
    state: { begin: slot.begin },
  }),
  (slot): PartShot[] => {
    const at = (t: number, cells: number, hold?: Pt, w?: number, off?: Pt): PartShot => ({ t, cells, hold, w, off })
    return [
      { t: slot.begin, ...SEAM_SHOT },
      // His landing trips the hammer; its first blow wakes the furnace: easing back as the heart wakes, the anvil, the
      // furnace and the flywheel in the frame with him.
      at(OOM[0], 6.45, [3.0, -1.2], 0.4),
      at(kt(196), 9.0, [3.8, -1.9], 0.62),
      at(OOM[5], 8.3, [4.0, -2.4], 0.55),
      // The flywheel engages: wide on the great wheel.
      at(FLY, 9.6, [5.9, -1.7], 0.65),
      at(FLY + 2.6, 8.9, [5.8, -1.6], 0.6),
      at(OFF_FLY, 8.3, [7.0, -1.5], 0.5),
      // The pistons.
      at(PISTONS + 0.4, 8.4, [9.4, -1.6], 0.55),
      at(PISTONS + 3.0, 6.0, [10.6, -0.9], 0.45, [0, -0.5]),
      // The great bellows: everything.
      at(BELLOWS + 0.35, 10.2, [7.0, -2.1], 0.65),
      at(BELLOWS + 3.2, 6.6, [10.4, -1.3], 0.5, [0, -0.6]),
      { t: slot.end, ...SEAM_SHOT },
    ]
  },
)
