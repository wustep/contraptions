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
    { t: 41.35, cells: 6.6, hold: [1.5, -1.45], w: 0.7 },
    // Station 1, low and close: the tail trodden, the flick, the snort into the brazier; up with the sparks to the torch.
    { t: TAIL_A - 0.1, cells: 5.7, hold: [2.45, -1.0], w: 0.85 },
    { t: SNORT_A, cells: 5.55, hold: [2.75, -1.05], w: 0.9 },
    { t: TORCH_A + 0.1, cells: 5.85, hold: [3.2, -1.85], w: 0.9 },
    // The scurry east along the sleepers' feet.
    { t: 45.6, cells: 6.0, hold: [5.2, -1.2], w: 0.5 },
    // Station 2, the same, closer to the sleeper: the brazier flares west; the frame opens up and on as the pillar's
    // other torch catches, and runs on east along the court (one move, no stop) to the goal: the throne, dark.
    { t: TAIL_B - 0.1, cells: 5.7, hold: [6.3, -1.0], w: 0.85 },
    { t: SNORT_B, cells: 5.65, hold: [6.5, -1.05], w: 0.9 },
    { t: TORCH_B + 0.2, cells: 6.25, hold: [7.2, -1.9], w: 0.9 },
    { t: 50.1, cells: 8.1, hold: [13.6, -2.35], w: 0.9 },
    // Station 3, the elder, close: the rope runs up out of the frame, east, where the throne was.
    { t: TAIL_C + 0.05, cells: 5.8, hold: [12.4, -1.05], w: 0.85 },
    { t: SNORT_C + 0.1, cells: 5.8, hold: [12.7, -1.35], w: 0.9 },
    // The fire runs to the crown-lamp; the King lit; she goes up to him. Held wide from here into the wake (`wake.ts`):
    // the whole court and the dais in one frame, so the heads waking and playing the theme are all seen together.
    { t: 55.0, cells: 9.6, hold: [14.6, -2.95], w: 0.9 },
    { t: slot.end, ...SEAM_SHOT },
  ],
)
