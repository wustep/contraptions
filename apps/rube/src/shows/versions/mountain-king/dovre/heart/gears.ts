import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { PLAN, SEAM_SHOT } from '../seams'
import { BELLOWS, FLY, OOM, PAH, PISTONS, T0, T1, kt } from './heart-clock'
import { FLICK, HOPS, OFF_FLY, laneOf } from './heart-path'
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
    // A point in WORLD cells, in this part's frame (laid mirrored: its entry, frame (-0.5, 0), is world (61.5, 33)).
    const wp = (x: number, y: number): Pt => [61 - x, y - 33]
    // The frame opens a step with each new mechanism and never goes back in, so the machine is visibly bigger each
    // phrase: 7 cells on the hammer, 8.5 on the flywheel, 9.2 on the pumps, 9.5 (the whole heart) on the great
    // bellows, held so into the runaway (`runaway.ts`). The frame's top stays under the drum's floor (world y 26.3):
    // the drum room above is never in the heart's frames.
    return [
      { t: slot.begin, ...SEAM_SHOT },
      // His landing trips the hammer; its first blows wake the furnace: easing back to the anvil, the cam and the
      // furnace's mouth with him.
      at(kt(196), 7.0, wp(58.3, 31.35), 0.7),
      // The flywheel engages: the great wheel whole, him riding up its side.
      at(FLY, 8.5, wp(56.2, 31.05), 0.78),
      at(FLICK, 8.8, wp(55.0, 30.85), 0.8),
      // The pistons.
      at(PISTONS, 9.2, wp(53.4, 31.15), 0.82),
      // The great bellows: everything, the whole heart.
      at(BELLOWS, 9.5, wp(53.8, 31.25), 0.85),
      at(slot.end, 9.5, wp(52.6, 31.25), 0.82),
    ]
  },
)
