import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, smooth, type Company, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import { penOf } from '../home/pen'
import { drawCat, drawFace, drawFarRocks, drawFarSide, drawKicks, drawSifts, drawSky, drawSteps, drawTripod, drawWind } from './himalaya-draw'
import { BACK, CAT_GONE, CAT_IN, CAT_STEPS_IN, CAT_STEPS_OUT, GUST, LANDINGS, LEAN, LIFT, ON_LEDGE, REST, SEAN_AT, SETTLE, SIFTS, STEPS, TICKS, himalayaLane } from './himalaya-plan'

/**
 * The Himalayas (146.519 → 191.409, bars 83 to 109): the build. The wind comes with it, tearing the snow off the rock
 * over him; he climbs, a step every other beat and then a step on every beat as the choir comes up, three legs of a
 * switchback up the face to the ledge where Sean sits behind his long lens, still. Walter stops beside him. They wait.
 * Across the valley the snow leopard comes out onto the rocks, pale on pale; Sean does not take the picture. He lifts
 * his eye from the camera and looks. The cat goes. While the music builds, the picture holds its breath, and only the
 * world round them moves on the beats: snow sifting down off the rock, the strap knocking the tripod's leg, the
 * cat's feet in the snow.
 *
 * See `himalaya-plan.ts` for the clock and the ground, `himalaya-draw.ts` for the drawing.
 */

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const HIMALAYA_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const HIMALAYA_CELLS = box(-16, -18, 28, 8, 2)

/** The sky, the ranges, the cloud, the far side, the face and its steps: drawn first, wherever the camera is. */
export const himalayaSet = scenery<null>({
  name: 'himalaya-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k)
    const f = frame(p, c.k)
    drawSky(pen, f, c.t)
    drawFarSide(pen)
    drawCat(pen, c.t)
    drawFarRocks(pen)
    drawFace(pen, f)
    drawSteps(pen, f)
  },
})

interface HimalayaState {
  begin: number
}

/** The Himalayas: the climb, Sean, and the snow leopard. */
export const ghostCat = part<HimalayaState>(
  {
    name: 'ghostCat',
    draw: (p, s, c) => {
      const pen = penOf(p, c.k)
      const t = s.begin + c.t
      drawKicks(pen, t)
      drawSifts(pen, t)
    },
    over: (p, s, c) => {
      const pen = penOf(p, c.k)
      const t = s.begin + c.t
      drawTripod(pen, t)
      drawWind(pen, frame(p, c.k), t)
    },
  },
  (slot) => {
    const sean: Company = {
      who: 'sean',
      from: slot.begin,
      to: slot.end,
      at: (t: number) => {
        // Leaning into the eyepiece, his eye on it; then, on the third beat of bar 102, back off it, beside Walter, and
        // looking out with him: the camera left standing alone.
        const u = smooth(t, LIFT, LIFT + 1.1)
        const x = SEAN_AT[0] + LEAN * (1 - u) - BACK * u
        return { x, y: SEAN_AT[1], spin: 0.3 * (1 - u) - 0.42 * u, scale: 1 }
      },
    }
    return {
      cells: box(-2, -12, 12, 1),
      exit: [REST[0] + 0.5, REST[1]] as Pt,
      lane: { segs: himalayaLane(slot.begin, slot.end), fire: ON_LEDGE - slot.begin },
      state: { begin: slot.begin },
      company: [sean],
    }
  },
  (slot) => shotsFor(slot.begin, slot.end),
)

/**
 * The camera: close on him at the foot as the wind comes; up with him; pulled back on the second bar of the climb to
 * the whole face, the sky over it and Sean, a speck at the top; in again for the bounding stretch; on the two of them
 * at the ledge; then back and across, the valley and the far rocks in the frame, where the cat is to be found; and in
 * on the two of them at the cut.
 */
function shotsFor(begin: number, end: number): PartShot[] {
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  const seam = SEAMS.press
  const pair: Pt = [REST[0] + 0.3, REST[1] - 0.5]
  const valley: Pt = [REST[0] + 2.75, REST[1] - 0.62]
  return [
    follow(begin + 0.8, 3.9, [0.6, -0.55]),
    follow(STEPS[3].land, 4.4, [0.8, -0.7]),
    hold(STEPS[7].land, 13.6, [4.6, -6.4]),
    hold(STEPS[12].land, 14.0, [4.6, -6.6]),
    follow(STEPS[17].land, 5.2, [0.7, -0.75]),
    follow(STEPS[25].land, 5.4, [1.0, -0.85]),
    hold(SETTLE, 4.4, pair),
    hold(SIFTS[0] + 0.6, 4.6, [pair[0] + 0.15, pair[1] - 0.05]),
    hold(CAT_IN - 0.4, 7.0, valley),
    hold(LIFT + 0.6, 6.8, [valley[0] - 0.1, valley[1]]),
    hold(CAT_GONE, 6.5, [valley[0] - 0.3, valley[1] + 0.02]),
    hold(end, seam.cells, [REST[0] + seam.frame[0], REST[1] + seam.frame[1]]),
  ]
}

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const HIMALAYA_HITS: readonly number[] = [GUST, ...LANDINGS, SETTLE, ...SIFTS, ...TICKS, ...CAT_STEPS_IN, ...CAT_STEPS_OUT]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const HIMALAYA_WIDE: [number, number][] = []
