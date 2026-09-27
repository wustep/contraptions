import type { Pt } from '../../../../../parts'
import { glint } from '../cast'
import { box, part, scenery, type PartShot } from '../kit'
import { SEAMS } from '../seams'
import {
  CUT,
  DEREK_LANE,
  derekAt,
  HITS,
  hanselAt,
  mugatuAt,
  STEEL,
  WINGS_X,
} from './awards-clock'
import { drawFront, drawPit, drawSpill } from './awards-press'
import { drawRig } from './awards-rig'
import { drawTheatre } from './awards-set'

/**
 * The awards (0 → 27.394), the AWARDS builder's: Male Model of the Year, and Derek is sure it is his.
 *
 * A theatre at night, side on. In the dark, one follow spot on Derek at the head of the runway. As the first call
 * begins he struts down it, stops at its end over the press pit and gives Blue Steel on the call's strongest onset
 * (5.126): the look, and the pit's volley. He turns and goes back up it toward the podium, and the house comes up for
 * him: a spot on the stage ahead that takes him as he walks into it (6.920), the trophy's own lamp (7.210), the wall of
 * bulbs behind in two banks (7.773, 8.133); up the podium's step on the second call (8.679), onto its top (9.347),
 * another spot on him: his moment.
 *
 * The pickup (10.246): the truss of spots lurches on its chains. The drums (10.746): every spot swings off him onto the
 * far wings, the trolley on the truss lifts the trophy away from beside him and flies it across, and Hansel rolls out
 * of the wings into the light (the lip's press fire as he plants in it, 12.301). The trophy is set down beside him on
 * bar 6 (the lip's press fire again), a hop of joy, and
 * his victory roll down the runway past the podium, the trophy flown along over his head (over Derek's), set down
 * beside him at the runway's end on bar 8 to the pit's volley. Derek, left in the dark on the podium, backs off it
 * (17.503, 18.031) and away into the dark of the wings, the camera with him, Hansel's light behind; the pit's flashes
 * flicker on the curtain. From 20.6 Mugatu glides out of the dark behind him and stops on his right on bar 12
 * (25.310); Derek starts (a little hop, 25.827). A photographer who has come round into the wings rises into the frame,
 * raises his camera on beat 50 and fires the flash the cut is in.
 *
 * The frame's origin is AWARDS_AT; everything is laid out in `awards-clock.ts`.
 */

interface AwardsState {
  begin: number
}

export const AWARDS_AT: Pt = [0, 0]
/** The whole theatre, sparse: the stage, the house to the pit, the rig overhead, the wings. */
export const AWARDS_CELLS = box(-14, -9, 15, 3, 2)

export const awardsSet = scenery<null>({
  name: 'awards-set',
  draw: (p, _s, c) => {
    if (c.t > CUT + 1) return
    drawTheatre(p, c, c.t)
  },
})

/** Every strike, in show seconds. */
export const AWARDS_HITS: number[] = HITS

export const awards = part<AwardsState>(
  {
    name: 'awards',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      if (t > CUT + 1) return
      drawRig(p, c, t)
      drawPit(p, c, t)
    },
    over: (p, s, c) => {
      const t = c.t + s.begin
      if (t > CUT + 1) return
      // Blue Steel: the look, on the rim of him.
      const d = derekAt(t)
      glint(p, c.k, [d[0] + 0.09, d[1] - 0.09], t - STEEL, 0.35)
      drawFront(p, c, t)
      drawSpill(p, c, t)
    },
  },
  (slot) => {
    const begin = slot.begin
    if (Math.abs(begin) > 1e-9 || Math.abs(slot.end - CUT) > 1e-9) console.warn(`magnum: awards is laid out for 0 → ${CUT.toFixed(3)}, not ${begin.toFixed(3)} → ${slot.end.toFixed(3)}`)
    return {
      cells: box(-12, -7, 14, 3, 2),
      exit: [WINGS_X + 0.5, 0] as Pt,
      lane: DEREK_LANE,
      state: { begin },
      company: [
        // Hansel waits out of shot behind the curtain, rolls out on the drums, and ends at the runway's end, out of shot.
        { who: 'hansel', from: 9.0, to: slot.end, at: (t: number) => { const [x, y] = hanselAt(t - begin); return { x, y } } },
        // Mugatu, deep in the dark of the wings, glides to Derek's side.
        { who: 'mugatu', from: 19.0, to: slot.end, at: (t: number) => { const [x, y] = mugatuAt(t - begin); return { x, y } } },
      ],
    }
  },
  (slot) => shots(slot.end),
)

/**
 * The camera: FIRST (the score's) creeping in on him in the follow spot; with him down the runway and pushed in for
 * Blue Steel, framed so the punch lands on him; with him back up to the podium; on the drums a move right to the
 * reversal in one frame (Derek in the dark on the podium in the left third, the trophy flying across the middle,
 * Hansel rolling into the light in the right third), then wider, holding the stage as Hansel parades past him; then in on Derek, and with him off the podium into the wings; the two-shot with Mugatu at
 * the seam's framing at the cut.
 */
function shots(end: number): PartShot[] {
  const seam = SEAMS.spa
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  return [
    hold(2.6, 5.0, [0.95, -1.12]),
    follow(4.05, 4.35, [-0.55, -0.5]),
    hold(5.0, 3.5, [-4.25, -0.36]),
    hold(5.95, 3.55, [-4.18, -0.4]),
    follow(7.35, 4.3, [0.75, -0.62]),
    hold(9.25, 4.4, [1.5, -1.18]),
    hold(10.75, 4.2, [2.05, -1.18]),
    // The reversal, in one glance: Derek left in the dark on the podium (left third), the trophy flying across the
    // middle, Hansel rolling into the light (right third).
    hold(11.75, 4.0, [3.5, -0.9]),
    hold(12.95, 4.0, [3.62, -0.86]),
    hold(14.3, 5.2, [2.7, -1.0]),
    hold(16.3, 5.3, [2.95, -1.0]),
    follow(19.0, 4.7, [1.0, -0.7]),
    hold(22.4, 4.3, [8.1, -0.8]),
    hold(25.3, 3.95, [7.8, -0.64]),
    hold(end, seam.cells, [WINGS_X + seam.frame[0], seam.frame[1]]),
  ]
}
