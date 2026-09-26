import type { Pt } from '../../../../../parts'
import { box, part, route, type PartShot, type Way } from '../kit'
import { CODA, LAST1, LAST2 } from '../music'
import { G_EARTH, hop } from '../physics'

/**
 * The director's: the coda. The bells, the hall coming down, Peer up the chimney through every level he has passed,
 * out at the summit on the last two chords, and the dawn (134.25 → the end). A first pass that runs: he lands at the
 * chimney's foot on the coda's first chord, rises straight up it, bursts out of the summit on the first of the two
 * last chords, lands on the second, and rolls down onto the east flank to rest in the dawn.
 *
 * The chimney's foot is where the heart's runaway leaves him (world ≈ 48, 33); the summit is `mountain.ts`'s
 * SUMMIT (48, -21): 54 cells up, in this part's frame (0, -54).
 */

/** The climb, in this part's frame: the chimney's top, where the summit is. */
export const CHIMNEY: Pt = [-0.5, -54]

export const FALL_HITS: number[] = [CODA, LAST1, LAST2]

export const fall = part<{ begin: number }>(
  { name: 'fall', draw: () => {} },
  (slot) => {
    const span = slot.end - slot.begin
    const at = (t: number) => t - slot.begin
    const ways: Way[] = [
      { at: 0, p: [-0.5, 0] },
      { at: 0.6, p: [-0.5, 0] },
      { at: at(LAST1) - 0.6, p: [CHIMNEY[0], CHIMNEY[1] + 1.2], ease: 'inout' },
      { at: at(LAST1), p: CHIMNEY, ease: 'out' },
    ]
    ways.push(hop(ways[ways.length - 1], [2.2, -53.4], at(LAST2), G_EARTH))
    ways.push({ at: at(LAST2) + 2.8, p: [6.5, -51.2], ease: 'out' })
    ways.push({ at: span, p: [6.5, -51.2] })
    return {
      cells: box(-3, -58, 10, 3, 2),
      exit: [7, -51.2] as Pt,
      lane: { segs: route(ways), fire: 0 },
      state: { begin: slot.begin },
    }
  },
  (slot): PartShot[] => [
    { t: slot.begin, cells: 6, off: [0, -0.5] },
    { t: slot.begin + 3, cells: 14, off: [0, -3] },
    { t: LAST1 - 1, cells: 10, off: [0, -2] },
    { t: LAST2 + 2, cells: 12, hold: [4, -52], w: 0.6 },
    { t: slot.end, cells: 16, hold: [8, -50], w: 0.9 },
  ],
)
