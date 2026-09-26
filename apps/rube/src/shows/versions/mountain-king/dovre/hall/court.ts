import { box, part, type PartShot, type Slot } from '../kit'
import { PLAN, SEAM_SHOT } from '../seams'
import { drawHall } from './hall'
import {
  COURT_BEGIN, CROWN_LAMP, FLICK_A, FLICK_B, FLICK_C, LANTERNS, PEER_PATH, SNORT_A, SNORT_B, SNORT_C, TAIL_A, TAIL_B, TAIL_C, TORCH_A, TORCH_B,
  WOMAN_PATH, q4, q5,
} from './hall-clock'

/**
 * The hall, first part (40.19 → 58.02: phrases 4 and 5, A A, the last of the pianissimo statement). Ibsen: the
 * court assembled, the King on his throne, Peer brought before him by the Woman in Green. Here the music is still
 * sneaking, so the court sleeps (the noticing is the wake part's): rows of trolls dozing on their benches, breathing
 * every two beats, and banked braziers glowing with their breath, the only light.
 *
 * Peer tiptoes in on the run's quarter notes and freezes on the held ones; she leads, stepping over the tails. The
 * chain, three times, each bigger (bar 2's two accents each time):
 *
 *   1. 42.46 he treads on a sleeper's tail; 43.02 it flicks and tosses him on; 43.57 the sleeper snorts into its
 *      brazier and it flares; the sparks fly up and 44.12 the torch on the pillar catches.
 *   2. 46.91 the next tail, 47.47 the flick, 48.01 the snort, 48.59 the pillar's other torch.
 *   3. 51.38 the elder's tail (an eye opens a crack, and closes); 51.94 a higher toss, over its knees; 52.50 its snort
 *      flares its brazier into the lantern hanging over it; the oiled rope catches and the fire runs up it on the
 *      notes, lantern by lantern (53.63, 54.18), to the crown-lamp over the throne (54.74): the King is lit, asleep
 *      under his crown. Peer scurries under the running fire; she goes up the dais to her father's side; he creeps
 *      the last steps and stands before the throne on the held notes.
 *
 * The hall itself (and the King) is `hall.ts`, drawn here for both of the hall's parts and for the finale.
 */

const scurry = (q: (at: number) => number): number[] => [16, 17, 18, 19, 20, 21, 22, 23].map(q)

export const COURT_HITS: number[] = [
  COURT_BEGIN, q4(2), q4(4), q4(6), TAIL_A, FLICK_A, SNORT_A, TORCH_A, ...scurry(q4), TAIL_B, FLICK_B, SNORT_B, TORCH_B,
  q5(0), q5(2), q5(4), q5(6), TAIL_C, FLICK_C, SNORT_C, ...scurry(q5), q5(24), q5(26), q5(28), LANTERNS[1], LANTERNS[2], CROWN_LAMP,
].map((t) => Math.round(t * 1e4) / 1e4)
  .filter((t, i, a) => a.indexOf(t) === i)
  .sort((a, b) => a - b)

interface HallState {
  begin: number
}

export const court = part<HallState>(
  { name: 'court', draw: (p, s, c) => drawHall(p, c, c.t + s.begin) },
  (slot: Slot) => ({
    cells: box(-2, -12.5, 31, 2),
    exit: PLAN.court.exit,
    lane: { segs: PEER_PATH.segs(slot.begin, slot.end), fire: TAIL_A - slot.begin },
    state: { begin: slot.begin },
    company: [
      {
        who: 'woman',
        from: slot.begin,
        to: slot.end,
        at: (t: number) => {
          const [x, y] = WOMAN_PATH.at(t)
          return { x, y }
        },
      },
    ],
  }),
  (slot: Slot): PartShot[] => [
    { t: slot.begin, ...SEAM_SHOT },
    // In at the door: the dark hall opens round them, the first sleeper and its brazier.
    { t: 41.9, cells: 7.4, hold: [2.4, -1.8], w: 0.75 },
    { t: 44.3, cells: 6.3, hold: [3.0, -1.55], w: 0.85 },
    // The scurry to the second tail, the pillar's other torch.
    { t: 46.7, cells: 6.4, hold: [6.3, -1.4], w: 0.65 },
    { t: 48.7, cells: 6.8, hold: [5.9, -1.75], w: 0.85 },
    // Back to see the court asleep in its tiers, the two torches, the throne dark beyond.
    { t: 50.7, cells: 9.6, hold: [8.4, -2.9], w: 0.85 },
    // The elder, its brazier, the lantern.
    { t: 52.6, cells: 7.0, hold: [11.8, -1.7], w: 0.8 },
    // The fire runs to the crown-lamp; the King lit; she goes up to him.
    { t: 55.0, cells: 9.2, hold: [15.3, -2.9], w: 0.9 },
    // His last steps to the foot of the dais.
    { t: 57.1, cells: 6.6, hold: [15.9, -1.2], w: 0.6 },
    { t: slot.end, ...SEAM_SHOT },
  ],
)
