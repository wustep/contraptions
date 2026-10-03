import type { Pt } from '../../../../../parts'
import { follower } from '../camera'
import { box, frame, part, scenery, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { WALTER_WARM } from '../worlds'
import { drawCounter, drawDoorIn, drawDoorOut, drawGuitar, drawOver, drawPilot, drawQuay, drawRoom, drawSpot, drawStage } from './draw'
import { CHERYL_FROM, CHERYL_GONE, cherylAt, EXIT_X, HINGE, NUUK_STRIKES, OUT, PLANK, SHE_LANDS, STOP, T0, T1, V_SKY, WAY } from './geo'
import type { Pen } from '../dream/pen'

/**
 * The bar at Nuuk (37.05 → 50.41, bars 17 to 24). He rolls in over the threshold out of the grey harbour into the dark
 * wood, the door's bell ringing, and stops by the pilot, hunched drunk over his glass. The pilot's hand comes up, and
 * the ring on his thumb catches the light: the thumb in the negative. He hesitates. Then the film's hinge, on bar 21:
 * the little stage's spotlight comes on, and Cheryl is on it with a guitar, imagined, swaying on the beat. She rolls
 * off the stage and out of the back door, and he goes after her, for real, at a run: through the door he goes warm,
 * Life's red, and runs on along the quay to the helicopter.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const NUUK_AT: Pt = [0, 0]
export const NUUK_CELLS = box(-12, -10, 34, 4, 2)

const PLANK_X = WAY.at(PLANK)[0]
const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number): Pen => ({ p, k, ink, w, tone: (h) => h })

/** The room, the harbour at its doors, the counter and the stage: drawn first, on show time. */
export const nuukSet = scenery<null>({
  name: 'nuuk-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    p.push()
    drawRoom(pen, c.t, frame(p, c.k))
    drawCounter(pen, c.t)
    drawStage(pen, c.t)
    p.pop()
  },
})

interface BarState {
  begin: number
}

/** The bar at Nuuk: the pilot's thumb, the little stage, Cheryl, and the run (bar 17 → bar 25). */
export const bar = part<BarState>(
  {
    name: 'bar',
    dynamic: true,
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const pen = penOf(p, c.k, c.ink, c.weight)
      p.push()
      drawSpot(pen, t)
      drawDoorIn(pen, t)
      drawDoorOut(pen, t)
      drawQuay(pen, t, PLANK_X)
      drawPilot(pen, t)
      drawGuitar(pen, t)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      p.push()
      drawOver(penOf(p, c.k, c.ink, c.weight), t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-4, -5, Math.ceil(EXIT_X) + 4, 3),
    exit: [EXIT_X + 0.5, 0] as Pt,
    lane: { segs: WAY.segs, fire: HINGE - slot.begin },
    state: { begin: slot.begin },
    // Through the back door, running after her, he goes warm: fully Life's red by the cut.
    changes: [{ at: OUT - slot.begin, color: WALTER_WARM, over: 2 }],
    company: [
      {
        who: 'cheryl' as const,
        from: CHERYL_FROM,
        to: CHERYL_GONE,
        at: (t: number) => {
          const c = cherylAt(t)
          return c ? { x: c[0], y: c[1] } : null
        },
      },
    ],
  }),
  () => shots(),
)

/**
 * The camera: in with him over the threshold; settling on him and the pilot, close, the stage out of the frame to the
 * right; on the hinge a cut wide to the three of them, him, the pilot and her in the light; then away with him out of
 * the back door to the seam's framing, running.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  const seam = SEAMS.sky
  const where = (s: number): Pt => (s > T1 ? [EXIT_X + V_SKY * (s - T1), 0] : WAY.at(Math.max(T0, s)))
  const fl = follower(where, 400)(T1)
  const offEnd: Pt = [EXIT_X + seam.frame[0] - fl[0], seam.frame[1] - fl[1]]
  return [
    hold(STOP + 0.2, 3.3, [1.05, -0.95]),
    hold(HINGE - 0.25, 3.05, [0.95, -0.9]),
    { t: HINGE, cells: 4.4, hold: [2.6, -1.05], w: 1, cut: true },
    hold(SHE_LANDS - 0.3, 4.3, [2.9, -1.0]),
    follow(OUT + 0.3, 4.3, [1.1, -0.75]),
    follow(T1, seam.cells, offEnd),
  ]
}

export const NUUK_HITS: readonly number[] = NUUK_STRIKES

export const NUUK_WIDE: [number, number][] = []
