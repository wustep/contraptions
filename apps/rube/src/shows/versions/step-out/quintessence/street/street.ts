import type { Pt } from '../../../../../parts'
import { box, part, scenery, type PartShot } from '../kit'
import { DURATION } from '../music'
import { drawStreet } from './draw'
import { cherylAt, COVER_X, FINAL, IN, MEET, ON, STOP, STREET_STRIKES, WALTER_LANE, walterAt } from './plan'

/**
 * The street (the B1 builder's): bar 131 to the end.
 *
 * A New York street on a pale morning. Walter rolls in out of the Life building's doors at the pace he left them,
 * over a pair of cellar doors (two clanks, as the band begins to fall away), and slows: Cheryl is coming to him along
 * the pavement from the right, and on the strong beat of bar 132 they stop, touching. They go on together toward the
 * newsstand, which is opening: its shutter goes up in two hauls, and the man inside puts the morning's issues out on
 * the wire, flipping each down: the last of them is Life, its red box, and on its cover the photograph of a slate
 * ball sitting by a lit strip in the dark: the show's first frame. On the last chord they stop before it.
 *
 * They look a while. Then they go on up the street together, close, and the camera lets them go, drawing back to
 * the whole street and holding: the stand, the fronts, the pale sky over the low building in the middle (where the
 * credits come), and the two of them small at the corner, waiting to cross. Then it is still.
 */

export const STREET_AT: Pt = [0, 0]
/** The street, claimed coarsely so the stage draws it wherever the camera is. */
export const STREET_CELLS = box(-10, -11, 24, 4, 2)

export const streetSet = scenery<null>({
  name: 'street-set',
  draw: (p, _s, c) => drawStreet(p, c.k, c.t),
})

/** The street: the newsstand, the cover, Cheryl, and the walk (bar 131 → the end). */
export const newsstand = part<null>(
  { name: 'newsstand', draw: () => {} },
  (slot) => {
    if (Math.abs(slot.begin - IN) > 1e-6 || Math.abs(slot.end - DURATION) > 1e-6) console.warn('quintessence: the street was built for bar 131 → the end')
    const end = WALTER_LANE.segs[WALTER_LANE.segs.length - 1].to
    return {
      cells: box(-2, -3, 15, 1),
      exit: [end[0] + 0.5, end[1]],
      lane: WALTER_LANE,
      state: null,
      company: [
        {
          who: 'cheryl',
          from: IN,
          to: DURATION + 1,
          at: (t: number) => {
            const [x, y] = cherylAt(t)
            return { x, y }
          },
        },
      ],
    }
  },
  () => {
    const on = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x, y], w: 1 })
    const [mx] = walterAt(MEET)
    return [
      // With him over the cellar doors; then holding as she comes to him, the stand in the frame's right.
      { t: IN + 0.8, cells: 4.1, off: [0.8, -0.5], w: 0 },
      on(MEET, 3.7, mx + 0.75, -0.78),
      on(MEET + 1.7, 3.6, mx + 1.9, -0.84),
      // On to the cover with them; closer on the chord, and a breath closer while they look.
      on(STOP, 3.1, COVER_X + 0.05, -0.86),
      on(ON, 2.95, COVER_X + 0.05, -0.86),
      // They go; the camera draws back to the whole street and holds.
      on(ON + 1.4, 3.5, COVER_X + 1.0, -0.95),
      on(241.8, FINAL.cells, FINAL.x, FINAL.y),
      on(DURATION, FINAL.cells, FINAL.x, FINAL.y),
    ]
  },
)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const STREET_HITS: readonly number[] = STREET_STRIKES

/** Where Walter may be small or out of the Zoom frame in this place. None: they stay in the street's frame, small. */
export const STREET_WIDE: [number, number][] = []
