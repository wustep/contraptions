import type { Lane, Pt } from '../../../../../parts'
import { box, part, scenery, type PartShot } from '../kit'
import { drawRoom, drawRoomOver } from './draw'
import { CLUE_STEPS, CLUES_AT, CLUES_LANE_ROOM, cherylAt, DREAM, frameX, GAP_X, IN_BLANK, LANDS, LIFT, NUUK, OFFICE, OPENING_LANE, ROOM_HITS, TO_TRAY, TRAY_X } from './plan'

/**
 * The negatives room (the B1 builder's): the negative assets room under the Life building, twice.
 *
 * The opening (0 → bar 1). Dark. On the swell the light table's tubes strike, stutter and catch, and strike again
 * just before the lead: a long glass lit from under, and on it a strip of negatives, frames 20 to 27, with a gap
 * where 25 should be. Walter is at its near end, on frame 20. On the lead (the guitar and the bass, no hats) he goes
 * along the strip a frame a bar, each frame lighting under him as he lands (21, 22, 23 on the downbeats; 24 on the
 * half bar as the gap draws him), and on bar 0 he rolls down into the gap's gate and sits in the blank. It glows,
 * whiter and wider, as he stares into it, and on the band's first downbeat the daydream takes him.
 *
 * The clues (bar 9 → bar 17). He is back in the blank exactly as he left it; the tubes tick. Cheryl comes in from
 * the right along the bench, pushing the loupe on its rail, and stops beside him as it clicks down over the blank.
 * Ted is a hard dark shape on the frosted door: two raps, and gone. Then the two of them go back through the strip,
 * the loupe clicking down on each frame on the downbeat: the water, the thumb, the curve, and the water again,
 * close, with a ship in it. He goes for the enlarger: onto its tray, up its column on the ratchet, home into the
 * head; the lamp comes on and throws the ship large on the far wall; the focus finds it; and he rolls out along the
 * shelf into the picture's grey daylight. Cheryl stays at the strip's end below.
 */

export const NEGATIVES_AT: Pt = [0, 0]
export { CLUES_AT }
/** The room, claimed coarsely so the stage draws it wherever the camera is. */
export const NEGATIVES_CELLS = box(-9, -7, 16, 3, 2)

export const negativesSet = scenery<null>({
  name: 'negatives-set',
  draw: (p, _s, c) => drawRoom(p, c.k, c.t),
  over: (p, _s, c) => drawRoomOver(p, c.k, c.t),
})

/** A lane in room cells moved into a part's own frame. */
const moved = (lane: Lane, by: Pt): Lane => ({
  fire: lane.fire,
  segs: lane.segs.map((s) => ({ ...s, from: [s.from[0] - by[0], s.from[1] - by[1]] as Pt, to: [s.to[0] - by[0], s.to[1] - by[1]] as Pt })),
})

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

/** The opening: the light table in the dark, the strip, frame 25 missing (0 → bar 1). */
export const opening = part<null>(
  { name: 'opening', draw: () => {} },
  (slot) => {
    if (!near(slot.begin, 0) || !near(slot.end, DREAM)) console.warn('quintessence: the opening was built for 0 → bar 1')
    return {
      cells: box(-2, -2, 8, 2),
      exit: [IN_BLANK[0] + 0.5, IN_BLANK[1]],
      lane: OPENING_LANE,
      state: null,
    }
  },
  () => {
    // The first frame holds through the swell; then the camera goes along the strip with him, a little behind, and
    // settles on the blank, a touch closer, framed as the daydream's cut wants it.
    const on = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x, y], w: 1 })
    return [
      on(2.6, 3.2, 0.6, -0.35),
      on(LANDS[0], 3.18, 1.05, -0.34),
      on(LANDS[1], 3.14, 1.95, -0.32),
      on(LANDS[2], 3.1, 2.9, -0.3),
      on(LANDS[4], 3.03, 4.35, IN_BLANK[1] - 0.35),
      on(DREAM, 3.0, IN_BLANK[0] + 0.15, IN_BLANK[1] - 0.35),
    ]
  },
)

/** The clues: Cheryl, the loupe, the strip backwards, the enlarger and the ship (bar 9 → bar 17). */
export const clues = part<null>(
  { name: 'clues', draw: () => {} },
  (slot) => {
    if (!near(slot.begin, OFFICE) || !near(slot.end, NUUK)) console.warn('quintessence: the clues were built for bar 9 → bar 17')
    const lane = moved(CLUES_LANE_ROOM, CLUES_AT)
    const end = lane.segs[lane.segs.length - 1].to
    return {
      cells: box(-8, -6, 4, 2),
      exit: [end[0] + 0.5, end[1]],
      lane,
      state: null,
      company: [
        {
          who: 'cheryl',
          from: OFFICE,
          to: NUUK,
          at: (t: number) => {
            const [x, y] = cherylAt(t)
            return { x: x - CLUES_AT[0], y: y - CLUES_AT[1] }
          },
        },
      ],
    }
  },
  () => {
    const on = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - CLUES_AT[0], y - CLUES_AT[1]], w: 1 })
    return [
      // Out a little from the blank to take in the door and Cheryl coming.
      on(25.3, 3.9, GAP_X + 1.1, -0.75),
      on(26.35, 3.85, GAP_X + 0.75, -0.7),
      // Back along the strip with the loupe.
      on(CLUE_STEPS[0][3], 3.5, frameX(24) + 0.5, -0.5),
      on(CLUE_STEPS[1][3], 3.4, frameX(23) + 0.45, -0.48),
      on(CLUE_STEPS[2][3], 3.3, frameX(22) + 0.4, -0.48),
      on(CLUE_STEPS[3][3], 3.1, frameX(21) + 0.4, -0.5),
      on(TO_TRAY.leave + 0.2, 3.15, frameX(21) + 0.1, -0.55),
      // To the enlarger, up with him, and out into the picture with him.
      on(TO_TRAY.land, 3.7, TRAY_X + 0.95, -1.0),
      on(LIFT.to, 4.2, TRAY_X + 1.55, -2.25),
      { t: NUUK, cells: 4.0, off: [0.8, -0.5], w: 0 },
    ]
  },
)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const NEGATIVES_HITS: readonly number[] = ROOM_HITS

/** Where Walter may be small or out of the Zoom frame in this place. None: the room is close. */
export const NEGATIVES_WIDE: [number, number][] = []
