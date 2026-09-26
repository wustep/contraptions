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

/** 0 before `a`, 1 after `b`, smoothly between. */
const ramp = (T: number, a: number, b: number) => {
  const u = Math.max(0, Math.min(1, (T - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/**
 * An old man: a stoop as he stands and goes, a rest on the steps, a push on the door, a bow at her chair, the chair's
 * settle, a reach for the lamp. His lean is one continuous sum (it never flips between frames); the years' own settle,
 * and their stoop while he walks, are the cast's (`bearingOfAge`), under this.
 */
function carlPose(T: number): { tilt?: number; squash?: number } {
  // Each step placed with a small settle; a gathering before he lifts himself into his chair.
  let settle = 0
  for (const t of ALONE.steps) if (T > t) settle += 0.06 * Math.exp(-(T - t) / 0.18)
  settle += 0.07 * crouch(T, A.toMine[1], 0.3)
  // Catching his breath on the second step.
  const breath = ramp(T, ALONE.steps[1], ALONE.steps[1] + 0.5) * (1 - ramp(T, A.up[2] - 0.4, A.up[2]))
  const tilt =
    -0.03 * ramp(T, T0, T0 + 0.8) * (1 - ramp(T, A.toMine[1] - 0.2, A.toMine[1] + 0.3)) -
    0.03 * breath -
    0.1 * lean(T, ALONE.latch, 0.35) -
    0.09 * lean(T, ALONE.tie, 0.4) -
    0.2 * lean(T, ALONE.lamp - 0.1, 0.32)
  if (T < A.up[0]) return { tilt, squash: 0 }
  if (T < A.up[2]) return { tilt, squash: settle + 0.05 * breath }
  if (T >= A.toDoor[0] && T < A.walkIn[1]) return { tilt, squash: 0 }
  if (T >= A.walkIn[1] && T < A.toMine[1] + 0.3) return { tilt, squash: settle }
  if (T >= ALONE.sit) {
    const s = T - ALONE.sit
    return { tilt, squash: 0.11 * Math.exp(-s / 0.4) * Math.cos(Math.min(Math.PI / 2, s * 1.6)) }
  }
  return { tilt, squash: settle }
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
    // In close on his three steps, the door and the porch rail, so each step on its note fills the frame; the mailbox's
    // faded prints just inside its right edge, the rhyme. Held (drifting with him) to the latch.
    key(203.7, 3.5, 6.42, -0.95),
    key(206.4, 3.45, 6.36, -0.97),
    key(ALONE.latch, 3.5, 6.3, -1.0),
    // Then wider as he goes in; through the window across the room.
    key(210.3, 4.3, 4.6, -1.4),
    key(212.6, 4.1, 3.4, -1.55),
    key(215.6, 3.8, 2.75, -1.65),
    key(ALONE.sit, 3.6, 2.2, -1.7),
    // Slowly in on the two chairs, his and hers with the balloon over it, until he reaches over and the lamp comes on.
    key(ALONE.lamp, 3.2, 2.3, -1.8),
    // From the lamp, one long draw back without a stop: the lit window, the house at dusk, the roof, and past it to the
    // sky before the first card comes (227.695), so every card is over the sky; and on, slower and slower, to the end:
    // the house small under the stars. He stays inside the Zoom frame (a third of its height from its middle) the
    // whole way.
    key(225.0, 5.4, 2.6, -2.4),
    key(226.9, 9.5, 3.3, -3.5),
    key(228.6, 12.6, 3.8, -4.6),
    // From here an even draw back (the same share of the frame each second, so it never slows to a park), the house
    // sinking to the frame's foot and the sky opening over it.
    key(233.5, 14.3, 4.1, -5.45),
    key(239.0, 16.5, 4.2, -6.15),
    key(245.0, 19.3, 4.2, -7.05),
    key(252.0, 23.1, 4.25, -8.15),
    key(DURATION, 27.0, 4.25, -9.15),
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
