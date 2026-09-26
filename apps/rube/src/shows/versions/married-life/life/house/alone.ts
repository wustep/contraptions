import type { Pt } from '../../../../../parts'
import { box, part, type PartShot, type Pose } from '../kit'
import { CUT, DURATION } from '../music'
import { CUTS } from '../seams'
import { CHAIR } from '../props/chairs'
import { drawFacadeFront } from './front-house'
import { lookAt } from './front'
import { ALONE, CHAIRS, FOOT_X, LAMP_X, LAMPS, P, STAR, SWINGS, TREADS } from './front-plan'
import { crouch, cubic, pieces, stepUp, trace, type Path } from './front-motion'

/**
 * ALONE (201.944 to the end): the house builder's. The church's steps become his own: at the cut he is at rest at
 * the foot of his three front steps, old, the balloon over him, at dusk. The piano alone. He climbs them a step on a
 * note, resting on the second (204.138, 204.899, 207.006); on the porch the latch gives on a note (208.155) and the
 * door swings in; he goes in, and it shuts behind him (211.801). Through the bay window he crosses the room to her
 * chair and ties the balloon to it (214.93), so it floats over the empty seat; then to his own, and sits (219.312),
 * the chair taking him with a slow settle. He reaches over and the lamp comes on (222.703). The credits come over
 * the house (226.197) as the camera draws back from the window to the whole house at night: the one lit window,
 * the street lamps coming on down the street on the piano's notes, the first stars.
 *
 * Nothing of the fix-up's machine remains but what it made: the house (faded now, the roof patched where the tree
 * came through), the prints on the mailbox, the two chairs.
 */

const T0 = CUT.home

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const ALONE_AT: Pt = [FOOT_X + 0.5, 0]

const FOOT: Pt = [FOOT_X, 0]
const ON: Pt[] = [
  [(TREADS[1].x0 + TREADS[1].x1) / 2, TREADS[1].y - 0.13],
  [(TREADS[0].x0 + TREADS[0].x1) / 2, TREADS[0].y - 0.13],
  [TREADS[0].x0 - 0.25, P - 0.13],
]
const FLOOR = P - 0.13
const SEATED: Pt = [CHAIRS.carl, P + CHAIR.sit]

/** Where he stands at the door, at her chair, before his own. */
const DOOR_X = 5.22
const HERS_X = CHAIRS.ellie + 0.27
const MINE_X = CHAIRS.carl + 0.12

const A = {
  up: [203.66, 204.43, 206.52],
  toDoor: [207.25, 207.95],
  walkIn: [208.7, 214.3],
  toMine: [215.65, 218.8],
}

const carl: Path = pieces([
  [A.up[0], () => FOOT],
  [ALONE.steps[0], (T) => stepUp(T, A.up[0], FOOT, ALONE.steps[0], ON[0])],
  [A.up[1], () => ON[0]],
  [ALONE.steps[1], (T) => stepUp(T, A.up[1], ON[0], ALONE.steps[1], ON[1])],
  [A.up[2], () => ON[1]],
  [ALONE.steps[2], (T) => stepUp(T, A.up[2], ON[1], ALONE.steps[2], ON[2])],
  [A.toDoor[0], () => ON[2]],
  [A.toDoor[1], (T) => [cubic(T, A.toDoor[0], ON[2][0], 0, A.toDoor[1], DOOR_X, 0), FLOOR]],
  [A.walkIn[0], () => [DOOR_X, FLOOR]],
  [A.walkIn[1], (T) => [cubic(T, A.walkIn[0], DOOR_X, 0, A.walkIn[1], HERS_X, 0), FLOOR]],
  [A.toMine[0], () => [HERS_X, FLOOR]],
  [A.toMine[1], (T) => [cubic(T, A.toMine[0], HERS_X, 0, A.toMine[1], MINE_X, 0), FLOOR]],
  [ALONE.sit, (T) => stepUp(T, A.toMine[1], [MINE_X, FLOOR], ALONE.sit, SEATED, 0.08)],
  [Infinity, () => SEATED],
])

/** A bell curve of width w round t0: how a lean comes and goes. */
const lean = (T: number, t0: number, w: number) => Math.exp(-(((T - t0) / w) ** 2))

/** An old man: a stoop as he goes, a rest on the steps, a push on the door, a bow at her chair, the chair's settle, a reach for the lamp. */
function carlPose(T: number): { tilt?: number; squash?: number } {
  // Each step placed with a small settle; a gathering before he lifts himself into his chair.
  let settle = 0
  for (const t of ALONE.steps) if (T > t) settle += 0.06 * Math.exp(-(T - t) / 0.18)
  settle += 0.07 * crouch(T, A.toMine[1], 0.3)
  if (T < A.up[0]) return { tilt: -0.03 * Math.min(1, (T - T0) / 0.8), squash: 0 }
  if (T < A.up[1] - 0.5) return { tilt: -0.04, squash: settle }
  if (T >= A.up[1] - 0.5 && T < A.up[2]) {
    // Catching his breath on the second step.
    const s = Math.max(0, T - ALONE.steps[1])
    return { tilt: -0.06 * Math.min(1, s / 0.5), squash: settle + 0.05 * Math.min(1, s / 0.6) * (1 - Math.max(0, Math.min(1, (T - (A.up[2] - 0.4)) / 0.4))) }
  }
  if (T >= A.toDoor[0] && T < A.walkIn[1]) return { tilt: -0.07 - 0.1 * lean(T, ALONE.latch, 0.35), squash: 0 }
  if (T >= A.walkIn[1] && T < A.toMine[1] + 0.3) return { tilt: -0.07 * (1 - crouch(T, A.toMine[1], 0.3)) - 0.09 * lean(T, ALONE.tie, 0.4), squash: settle }
  if (T >= ALONE.sit) {
    const s = T - ALONE.sit
    return { tilt: -0.2 * lean(T, ALONE.lamp - 0.1, 0.32), squash: 0.11 * Math.exp(-s / 0.4) * Math.cos(Math.min(Math.PI / 2, s * 1.6)) }
  }
  return {}
}

/**
 * Where he ties the balloon off (to her chair, low on its front), in this part's frame, and from when (show seconds):
 * the cast then carries the string's end there over a second. It floats over her empty seat to the end.
 */
export const ALONE_TIE: { from: number; at: Pt } | null = { from: ALONE.tie, at: [CHAIRS.ellie - 0.18 - ALONE_AT[0], P - 0.3 - ALONE_AT[1]] }

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const ALONE_HITS: number[] = [...ALONE.steps, ALONE.latch, ALONE.shut, ALONE.tie, ALONE.sit, ALONE.lamp, ...LAMPS.map((l) => l.at), STAR.on].sort((a, b) => a - b)

function shotsFor(): PartShot[] {
  const at = ALONE_AT
  const key = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x - at[0], y - at[1]], w: 1 })
  void CUTS
  return [
    // The foot of his steps at dusk: easing up and back to take in the house as he climbs.
    key(203.9, 4.9, 6.3, -1.45),
    key(206.6, 4.8, 5.6, -1.5),
    // In at the door with him; through the window across the room.
    key(209.2, 4.5, 4.55, -1.5),
    key(212.6, 4.1, 3.4, -1.55),
    key(215.6, 3.8, 2.75, -1.65),
    key(ALONE.sit, 3.6, 2.2, -1.7),
    // Slowly in on the two chairs, his and hers with the balloon over it, until he reaches over and the lamp comes on.
    key(ALONE.lamp, 3.2, 2.3, -1.8),
    // From the lamp, one long draw back without a stop: the lit window, the house at dusk, the roof and the sky, and
    // on, slower and slower, to the end: the house small under the stars. The first card comes over the upper storey,
    // the second over the roof, the rest over the sky. He stays inside the Zoom frame (a third of its height from
    // its middle) the whole way.
    key(225.2, 4.1, 2.5, -2.05),
    key(228.3, 6.4, 3.0, -2.6),
    key(232.3, 9.4, 3.6, -3.55),
    key(236.5, 12.8, 4.1, -4.6),
    key(241.0, 15.2, 4.2, -5.3),
    key(247.0, 17.4, 4.2, -5.85),
    key(255.0, 20.6, 4.25, -6.55),
    key(DURATION, 22.0, 4.25, -6.95),
  ]
}

interface AloneState {
  begin: number
}

export const alone = part<AloneState>(
  {
    name: 'alone',
    draw: () => {},
    over: (p, s, c) => {
      const T = c.t + s.begin
      if (T < 125) return
      p.push()
      p.translate(-ALONE_AT[0] * c.k, -ALONE_AT[1] * c.k)
      drawFacadeFront(p, c.k, c.weight, lookAt(T), SWINGS)
      p.pop()
    },
  },
  (slot) => {
    const breaks = [...A.up, ...ALONE.steps, ...A.toDoor, ...A.walkIn, ...A.toMine, ALONE.sit]
    const segs = trace(carl, ALONE_AT, slot.begin, slot.end, breaks, 30)
    const end = carl(slot.end)
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: carlPose }]
    void LAMP_X
    return {
      cells: box(-14 - ALONE_AT[0], -14, 18 - ALONE_AT[0], 6),
      exit: [end[0] - ALONE_AT[0] + 0.5, end[1] - ALONE_AT[1]],
      lane: { segs, fire: ALONE.sit - slot.begin },
      state: { begin: slot.begin },
      pose,
    }
  },
  () => shotsFor(),
)
