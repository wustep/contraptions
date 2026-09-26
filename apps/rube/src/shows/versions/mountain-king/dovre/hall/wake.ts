import { box, part, type PartShot, type Slot } from '../kit'
import { PLAN, SEAM_SHOT } from '../seams'
import {
  COURT_UP, CRACK, FIRST_EYES, GRAB, KING_EYES, KING_GRAB, LURCH, OPEN, PEER_PATH, SLAY, SMASH, STEPS, WAKE_DX, WAVE, WOMAN_GONE, WOMAN_PATH,
  q6, q7,
} from './hall-clock'

/**
 * The hall, second part (58.02 → 74.42: phrases 6 and 7, A A, the second statement: the accelerando begins and the
 * orchestra grows). The court notices him.
 *
 *   58.02  the troll nearest him (the elder whose tail he trod on) opens its eyes;
 *   58.29 → 59.64  the heads turn to him in a wave, one column of the court a note, west from the throne, the dark
 *          gallery's eyes opening with them;
 *   60.17  "Slay him!": every mouth, every arm; he starts back against the dais;
 *   61.23  the King's eyes open; she slips away along the dais and out of the east door; the King rises (a bar);
 *          the court's heads nod on the beats, row against row;
 *   64.37  "Slay him!" again, the King's sceptre up; he starts back;
 *   66.43  the court stands; the front row comes down after him, a stride a note;
 *   68.46  a grab at him closes on air: he has bolted up the dais; 69.46 the King reaches down: he is through his feet;
 *   71.36  "Slay him!", the biggest accent: the sceptre comes down on the dais where he stood; its jolt throws him on;
 *          the crack runs after him (71.95, 72.44) to the trolls' hatch;
 *   72.93  the hatch lurches under him; 73.18 it swings open, and he falls straight down, 9 cells, into the mine
 *          (74.42, the next phrase's downbeat).
 *
 * The hall is drawn by the court part (`hall.ts`); this part owns the lane, the Woman's leaving, the camera, and
 * the shaft under the hatch.
 */

export const WAKE_HITS: number[] = [
  FIRST_EYES, ...WAVE, SLAY[0], q6(10), KING_EYES, SLAY[1], q6(26), COURT_UP, ...STEPS, GRAB, KING_GRAB, q7(14), q7(16),
  SMASH, ...CRACK, LURCH, OPEN,
].map((t) => Math.round(t * 1e4) / 1e4)
  .filter((t, i, a) => a.indexOf(t) === i)
  .sort((a, b) => a - b)

/** Court-frame x to this part's frame. */
const X = (x: number): number => x - WAKE_DX

export const wake = part<{ begin: number }>(
  { name: 'wake', draw: () => {} },
  (slot: Slot) => ({
    cells: box(-1, -12, 14, 1.5).concat(box(10.5, 1.5, 12.5, 9)),
    exit: PLAN.wake.exit,
    lane: { segs: PEER_PATH.segs(slot.begin, slot.end, -WAKE_DX), fire: SLAY[0] - slot.begin },
    state: { begin: slot.begin },
    company: [
      {
        who: 'woman',
        from: slot.begin,
        to: WOMAN_GONE,
        at: (t: number) => {
          const [x, y] = WOMAN_PATH.at(t)
          return { x: X(x), y }
        },
      },
    ],
  }),
  (slot: Slot): PartShot[] => [
    { t: slot.begin, ...SEAM_SHOT },
    // Back, as the heads turn, to the whole court looking at him.
    { t: 59.9, cells: 9.4, hold: [X(11.0), -2.7], w: 1 },
    // East, keeping the court nodding at the frame's west side, to the King as he wakes and rises and roars.
    { t: 62.4, cells: 8.8, hold: [X(15.2), -2.6], w: 0.95 },
    { t: 64.4, cells: 8.2, hold: [X(16.4), -2.6], w: 0.9 },
    // A little back as the court stands.
    { t: 66.6, cells: 9.4, hold: [X(15.4), -2.7], w: 0.9 },
    // The chase: up the dais, through the King's feet, to its end.
    { t: 68.5, cells: 7.4, hold: [X(17.4), -1.7], w: 0.6 },
    { t: 70.4, cells: 7.0, hold: [X(21.0), -1.9], w: 0.7 },
    // The blow, the crack, the hatch, and down the shaft after him.
    { t: 71.4, cells: 7.2, hold: [X(23.4), -1.6], w: 0.8 },
    // Close on the fissure racing from the sceptre's head to the hatch, so the lurch and the fall read big.
    { t: 72.6, cells: 5.4, hold: [X(24.2), -0.7], w: 0.7 },
    { t: 73.45, cells: 5.5, hold: [X(26.9), 1.2], w: 0.6 },
    { t: slot.end, ...SEAM_SHOT },
  ],
)
