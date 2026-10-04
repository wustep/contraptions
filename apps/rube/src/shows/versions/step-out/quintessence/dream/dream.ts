import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { CHERYL } from '../worlds'
import { drawBuilding, drawGround, drawOver, drawPart, drawSky } from './draw'
import { BEAM, BRAKE, CAR_DOWN, CHERYL_AT, DOOR, DOG_HOME, DRAIN, DREAM_STRIKES, LAND_IN, LEAP_BACK, T0, T1, toneAt, WAY } from './geo'
import type { Pen } from './pen'

/**
 * The daydream (10.363 → 23.74, bars 1 to 8, as the band comes in): the film's first. He sits on the lip of a night
 * platform, in the same place on the screen as the blank frame he was staring into; on the band's first downbeat the
 * window across the way blows out, and he goes: a run, a leap over the tracks into the burning room, through it under
 * a falling joist, into the dumbwaiter where the three-legged dog is hiding, down in it on his own weight, out through
 * the shop's door to where Cheryl waits under the street lamp. The dog goes to her. In the last bar the colour goes out
 * of everything, and he leaps back across to the lip, and sits where he sat: it ends where it began.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const DREAM_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const DREAM_CELLS = box(-12, -10, 34, 4, 2)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number, t: number): Pen => ({ p, k, ink, w, tone: toneAt(t) })

/** The night, the platform, the street and the building: drawn first, on show time. */
export const dreamSet = scenery<null>({
  name: 'dream-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight, c.t)
    p.push()
    drawSky(pen, frame(p, c.k), c.t)
    drawBuilding(pen, c.t)
    drawGround(pen, c.t)
    p.pop()
  },
})

interface LeapState {
  begin: number
}

/** The daydream: the leap across into the burning building, the three-legged dog, Cheryl (bar 1 → bar 9). */
export const leap = part<LeapState>(
  {
    name: 'leap',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      drawPart(penOf(p, c.k, c.ink, c.weight, t), t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      drawOver(penOf(p, c.k, c.ink, c.weight, t), t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-4, -8, 14, 3),
    exit: [0, 0] as Pt,
    lane: { segs: WAY.segs, fire: LAND_IN - slot.begin },
    state: { begin: slot.begin },
    // Cheryl waits under the street lamp from the cut in to the cut out, greying with everything else at the end.
    company: [
      {
        who: 'cheryl' as const,
        from: T0,
        to: T1,
        at: (t: number) => ({ x: CHERYL_AT[0], y: CHERYL_AT[1], color: toneAt(t)(CHERYL), spin: -Math.PI / 2 }),
      },
    ],
  }),
  () => shots(),
)

/**
 * The camera: from the seam's close framing on him at the lip, back and up with the leap to see the window take him;
 * across the room with him and the joist; on the car going down; out through the door to her; and as the colour goes,
 * in again on the lip to exactly the framing it opened on, for the cut back to the basement.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const seam = SEAMS.office
  return [
    hold(T0 + 1.25, 4.3, [2.0, -1.15]),
    hold(LAND_IN + 0.3, 4.4, [5.0, -1.75]),
    hold(BEAM + 0.5, 4.4, [6.4, -1.75]),
    hold(BRAKE + 0.3, 4.5, [6.6, -1.35]),
    hold(CAR_DOWN + 0.2, 4.5, [6.2, -0.55]),
    hold(DOOR + 0.2, 4.4, [4.3, -0.6]),
    hold(DOG_HOME + 0.4, 4.4, [3.4, -0.7]),
    // In on the three of them under the lamp, slowly, while the fire burns over them.
    hold(DRAIN - 0.1, 3.5, [3.0, -0.35]),
    hold(LEAP_BACK + 0.25, 3.9, [2.0, -0.5]),
    hold(T1, seam.cells, [-0.5 + seam.frame[0], seam.frame[1]]),
  ]
}

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const DREAM_HITS: readonly number[] = DREAM_STRIKES

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const DREAM_WIDE: [number, number][] = []

