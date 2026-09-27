import { R, type Pt, type Seg } from '../../../../../parts'
import { box, part, type PartShot, type Slot } from '../kit'
import { PLAN, SEAM_SHOT } from '../seams'
import {
  COURT_UP, CRACK, DAIS, FIRST_EYES, GRAB, KING_EYES, KING_GRAB, LURCH, OPEN, PEER_PATH, Path, SLAY, SMASH, STEPS, WAKE_BEGIN, WAKE_DX, WAVE,
  WOMAN_GONE, WOMAN_PATH, q6, q7,
} from './hall-clock'

/**
 * The hall, second part (58.02 → 74.42: phrases 6 and 7, A A, the second statement: the accelerando begins and the
 * orchestra grows). The court notices him.
 *
 *   58.02  the troll nearest him (the elder whose tail he trod on) opens its eyes;
 *   58.29 → 59.64  the heads turn to him in a wave, one column of the court a note, west from the throne, the dark
 *          gallery's eyes opening with them; he backs away from them a step with every other column, toward the dais;
 *   60.17  "Slay him!": every mouth, every arm; he jumps back onto the dais's first step, against the second, and
 *          she rolls to the dais's lip beside him (their parting: the two of them together, a little space between);
 *   61.23  the King's eyes open over them: he jumps off the step, away from the King; she stays a note, then rolls
 *          off east along the dais top, quicker and quicker, and drops off its end out of shot by ~62.9, before the
 *          King is half risen; the King rises (a bar), and he creeps back toward the dais, a step a beat; the
 *          court's heads nod on the beats, row against row;
 *   64.37  "Slay him!" again, the King's sceptre up: it blows him back across the floor, and again on the next note;
 *   66.43  the court stands: he backs toward the dais, a hop a beat, as the front row comes down after him;
 *   67.95  he bolts; 68.46 a grab at him closes on air: he is up the dais; 69.46 the King reaches down: he is through
 *          his feet;
 *   71.36  "Slay him!", the biggest accent: the sceptre comes down on the dais where he stood; its jolt throws him on;
 *          the crack runs after him (71.95, 72.44) to the trolls' hatch;
 *   72.93  the hatch lurches under him; 73.18 it swings open, and he falls straight down, 9 cells, into the mine
 *          (74.42, the next phrase's downbeat).
 *
 * The hall is drawn by the court part (`hall.ts`); this part owns the lane, the Woman's leaving, the camera, and
 * the shaft under the hatch.
 */

/** His steps' take-offs and landings that are not already strikes: each on an eighth of the grid. */
const TAKEOFFS = [q6(17), q6(18), q6(19), q6(20), q6(21), q6(22), q6(27), q6(28), q7(10), q7(18)]

export const WAKE_HITS: number[] = [
  FIRST_EYES, ...WAVE, SLAY[0], q6(10), KING_EYES, q6(14), SLAY[1], q6(26), COURT_UP, ...STEPS, GRAB, KING_GRAB, q7(14), q7(16),
  SMASH, ...CRACK, LURCH, OPEN, ...TAKEOFFS,
].map((t) => Math.round(t * 1e4) / 1e4)
  .filter((t, i, a) => a.indexOf(t) === i)
  .sort((a, b) => a - b)

/** Court-frame x to this part's frame. */
const X = (x: number): number => x - WAKE_DX

/** The ball on a flat of height `top` (the floor, a step, the dais): its centre. */
const on = (top: number): number => top - R
const FLOOR = 0
const STEP = on(DAIS.step)

/**
 * Peer from the seam to the grab (court frame). Every move takes off and lands on an eighth of the grid (the court's
 * wave, the shouts, the King's eyes, his rise, the court standing), so he answers each thing the court does on the
 * note it does it. From the grab on he runs the hall clock's chase (`PEER_PATH`), which the court's grab and the
 * King's blow are aimed at.
 */
const NOTICED: Path = (() => {
  const a = new Path(WAKE_BEGIN, [15.5, FLOOR])
  // Still as the elder's eyes open; then back from the wave a step with every other column turning to him.
  a.rest(q6(1))
  a.hop([15.68, FLOOR], q6(2), 0.1)
  a.rest(q6(3))
  a.hop([15.86, FLOOR], q6(4), 0.1)
  a.rest(q6(5))
  a.hop([16.02, FLOOR], q6(6), 0.1)
  // Frozen through the held note. "Slay him!": he jumps back up onto the first step, his back to the second.
  a.rest(SLAY[0])
  a.hop([16.62, STEP], q6(10), 0.36)
  // The King's eyes open right over him: he jumps off the step, away from the throne.
  a.rest(KING_EYES)
  a.hop([15.62, FLOOR], q6(14), 0.3)
  // She is leaving along the dais; as the King rises he creeps back toward it after her, a small step a beat.
  a.rest(q6(17))
  a.hop([15.84, FLOOR], q6(18), 0.08)
  a.rest(q6(19))
  a.hop([16.04, FLOOR], q6(20), 0.08)
  a.rest(q6(21))
  a.hop([16.22, FLOOR], q6(22), 0.08)
  // The King's roar, the sceptre up: it blows him back across the floor, and the court's echo on the next note again.
  a.rest(SLAY[1])
  a.hop([15.2, FLOOR], q6(26), 0.34)
  a.rest(q6(27))
  a.hop([14.95, FLOOR], q6(28), 0.12)
  // Still through the held notes. The court stands: he backs toward the dais, a hop a beat, as the front row comes
  // down off its bench after him and on.
  a.rest(COURT_UP)
  a.hop([15.35, FLOOR], STEPS[0], 0.13)
  a.hop([15.7, FLOOR], STEPS[1], 0.13)
  // Then he bolts up the dais, and the grab closes where he was.
  a.rest(STEPS[2])
  a.hop([17.35, on(DAIS.top)], GRAB, 0.55)
  return a
})()

function lane(begin: number, end: number): Seg[] {
  const end0: Pt = NOTICED.at(GRAB)
  const chase: Pt = PEER_PATH.at(GRAB)
  if (Math.abs(end0[0] - chase[0]) > 1e-9 || Math.abs(end0[1] - chase[1]) > 1e-9) throw new Error('wake: the noticing must end where the chase starts')
  return [...NOTICED.segs(begin, GRAB, -WAKE_DX), ...PEER_PATH.segs(GRAB, end, -WAKE_DX)]
}

export const wake = part<{ begin: number }>(
  { name: 'wake', draw: () => {} },
  (slot: Slot) => ({
    cells: box(-1, -12, 14, 1.5).concat(box(10.5, 1.5, 12.5, 9)),
    exit: PLAN.wake.exit,
    lane: { segs: lane(slot.begin, slot.end), fire: SLAY[0] - slot.begin },
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
    // One held frame of the whole court and the dais (the court's own seam is free) from the first note through
    // "Slay him!": the heads waking in a wave and swinging on every note of the theme, row after row in canon, he
    // backing up onto the dais's step, the Woman at the King's side. No pan west and back.
    { t: slot.begin, cells: 11.2, hold: [X(11.9), -3.0], w: 1 },
    { t: SLAY[0] + 0.1, cells: 10.8, hold: [X(12.3), -2.9], w: 1 },
    // East to the King as his eyes open over him, the nodding court still at the frame's west side; out a little as
    // he rises and roars, and as the court stands.
    // Close (6.3 cells: he is the story, a fifth bigger than at 7), the floor low in the frame. East with her as she
    // leaves him and goes, the King rising behind her; she rolls out of its east side (~62.8) before he is half up.
    { t: 61.65, cells: 6.4, hold: [X(16.6), -1.85], w: 1 },
    { t: 63.45, cells: 6.3, hold: [X(17.7), -1.85], w: 1 },
    // Out and up as he roars, and held there through the chase and the blow: the whole King, the sceptre's head on
    // every pump and on the wind-up, and the lit crown-lamp over him whole (its ring is at the head's height, so a top
    // edge between them would slice it), with Peer still inside the zoomed frame on the floor: ~8.2 cells at least.
    { t: 64.6, cells: 8.3, hold: [X(16.3), -2.5], w: 1 },
    { t: 66.6, cells: 8.3, hold: [X(15.6), -2.5], w: 0.95, wy: 1 },
    // The chase: up the dais, through the King's feet, to its end; the frame travels with him, its height held.
    { t: 68.5, cells: 8.2, hold: [X(17.4), -2.5], w: 0.6, wy: 1 },
    // The wind-up and the blow: the whole King, the sceptre's arc and the dais step it strikes, Peer east of them.
    { t: 70.4, cells: 8.1, hold: [X(20.0), -2.6], w: 0.7, wy: 1 },
    { t: 71.3, cells: 8.2, hold: [X(21.4), -2.5], w: 0.8, wy: 1 },
    // Close on the fissure racing from the sceptre's head to the hatch, so the lurch and the fall read big.
    { t: 72.6, cells: 5.4, hold: [X(24.2), -0.7], w: 0.7 },
    { t: 73.45, cells: 5.5, hold: [X(26.9), 1.2], w: 0.6 },
    { t: slot.end, ...SEAM_SHOT },
  ],
)
