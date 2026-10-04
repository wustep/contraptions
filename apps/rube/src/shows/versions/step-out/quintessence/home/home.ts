import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { BENCH, HOP1, KEY, NOTES, REST_PT, RIM, SOLVED, homeLane } from './home-plan'
import { drawBench, drawLamp, drawLandings, drawMother, drawNegative, drawPianoBody, drawRoom, drawStrings } from './home-draw'
import { penOf } from './pen'

/**
 * Home (133.278 → 146.519, bars 75 to 82): his mother's new apartment at evening, under the low pulse. The ash lifts
 * off him on the floor. She is at the piano, playing the pulse, one low note at a time. He goes up beside her (the
 * bench, a key of his own, the rim), and her notes carry him along the rim of the curved side: each string she
 * strikes ends under him, and its ring moves him on. At the curve he touches the negative hung from the lamp, turning
 * on its thread, and stops it face on: the curve in it is the curve under him. The clue solved, without a word.
 *
 * See `home-plan.ts` for the clock and the piano's shape, `home-draw.ts` for the drawing.
 */

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const HOME_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const HOME_CELLS = box(-8, -7, 12, 4, 2)

/** The room, the piano and his mother: drawn first, wherever the camera is. */
export const homeSet = scenery<null>({
  name: 'home-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k)
    drawRoom(pen, frame(p, c.k))
    drawBench(pen)
    drawMother(pen, c.t)
    drawPianoBody(pen, c.t)
  },
})

interface HomeState {
  begin: number
}

/** Home: his mother's piano, and its curve. */
export const piano = part<HomeState>(
  {
    name: 'piano',
    draw: (p, s, c) => {
      const pen = penOf(p, c.k)
      const t = s.begin + c.t
      drawStrings(pen, t)
      drawLamp(pen, t)
      drawLandings(pen, t)
    },
    over: (p, s, c) => {
      drawNegative(penOf(p, c.k), s.begin + c.t)
    },
  },
  (slot) => ({
    cells: box(-4, -4, 7, 2),
    exit: [REST_PT[0] + 0.5, REST_PT[1]] as Pt,
    lane: { segs: homeLane(slot.begin, slot.end), fire: SOLVED - slot.begin },
    state: { begin: slot.begin },
  }),
  (slot) => shotsFor(slot.begin, slot.end),
)

/**
 * The camera: still on him on the floor while the ash lifts and she plays; drifting up and right with him onto the
 * bench and the keys, close on her; along the rim with him, the lamp coming into the frame; and settled on the curve,
 * him and the negative together, on the seam's framing at the cut.
 */
function shotsFor(begin: number, end: number): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const seam = SEAMS.himalaya
  const endHold: Pt = [REST_PT[0] + seam.frame[0], REST_PT[1] + seam.frame[1]]
  return [
    hold(begin + 1.5, 3.6, [-0.05, -0.45]),
    hold(HOP1, 3.55, [0.25, -0.62]),
    hold(KEY, 3.45, [0.85, -0.95]),
    hold(RIM + 0.6, 3.35, [1.75, -1.2]),
    hold(NOTES[NOTES.length - 4], 3.4, [2.85, -1.35]),
    hold(SOLVED, 3.6, [endHold[0] - 0.05, endHold[1]]),
    hold(end, seam.cells, endHold),
  ]
}

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const HOME_HITS: readonly number[] = [...NOTES, BENCH, KEY, RIM, SOLVED].sort((a, b) => a - b)

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const HOME_WIDE: [number, number][] = []
