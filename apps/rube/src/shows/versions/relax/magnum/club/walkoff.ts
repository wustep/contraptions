import { laneAt, type Lane, type Pt } from '../../../../../parts'
import { box, part, route, scenery, type Company, type PartShot } from '../kit'
import { beat, half } from '../music'
import { SEAMS } from '../seams'
import { drawBack, drawFront, drawRoom } from './walkoff-draw'
import {
  BAR_DROP,
  CONVERGE,
  D_END,
  D_FLINCH,
  D_GATE_DONE,
  D_GATE_ON,
  D_JUMP,
  D_JUMP_LAND,
  D_LINE_LAND,
  D_ON,
  D_POP,
  D_POP_LAND,
  D_POP_TOP,
  D_SAG,
  D_WALK,
  D_WALK_STOP,
  DEREK_PATH,
  ECHOES,
  FLARES,
  GRID_OFF,
  GRID_ON,
  H_CENTRE,
  H_COME,
  H_ECHO_LAND,
  H_GATE_ON,
  H_GO,
  H_HUM,
  H_JUMP,
  H_JUMP_LAND,
  H_JUMP_TOP,
  H_LEAVE,
  H_ON,
  H_POP,
  H_POP_LAND,
  H_POP_TOP,
  H_SETTLE,
  H_SETTLED,
  H_WALK_STOP,
  hanselAt,
  hanselSpin,
  IN,
  LINES,
  MID,
  TOUCH,
  WIN,
  D_ALONE,
  D_BACK,
  H_OUT,
} from './walkoff-plan'

/**
 * The walk-off (83.552 → 116.820): the CLUB builder's. Underground, under the lasers.
 *
 * Out of the flash Derek rolls in through the crowd onto the runway of light and stops on his plate; at its far end
 * Hansel waits in the judge's lamp. They trade moves, each a machine of the floor answering him, the lamp swinging to
 * whoever is on: the pop (a kick plate throws him straight up; Hansel's goes twice as high, turning over twice), the
 * gate (posts rise out of the floor with a laser across; Hansel's has two, higher); the walk, up to the second
 * plates; then the call and answer, Derek on each line and Hansel on its echo, and on the last line Derek lunges right
 * up to the middle while every laser in the room swings down to the floor between them. On the bridge's downbeat the
 * grid drops from the ceiling: a curtain of beams, and one of them breaks on Derek's nose; he backs off. Then Hansel's
 * move that cannot be done: he rolls into the closed grid and stops dead in its middle, every beam going on straight
 * through him, unbroken, in the vocal's silence; and out the far side. The lamp settles on him, the press fire, the
 * crowd goes up; Derek, beaten, rolls off out of the light. The grid goes off. Hansel comes to him, and they touch:
 * friends. At rest side by side for the cut, Hansel on his right.
 */

/** The walk-off's frame is the club's own. */
export const CLUB_AT: Pt = [0, 0]
export const CLUB_CELLS = box(-14, -8, 22, 4, 2)

interface ClubState {
  begin: number
}

/** Derek's lane, from the plan (it is fixed by the music): the drawing reads the same lane the stage does. */
const LANE: Lane = { segs: route(DEREK_PATH.ways(IN)), fire: D_POP - IN }
function derekAt(t: number): Pt {
  const q = laneAt(LANE, t - IN)
  return [q.x, q.y]
}

/** The room behind it all: wall, ceiling, far smoke, the crowd behind the floor. Handed show time. */
export const clubSet = scenery<null>({
  name: 'club-set',
  draw: (p, _s, c) => drawRoom(p, c.k, c.t, c.weight, derekAt(c.t)),
})

/** Every strike of the walk-off, in show seconds. */
export const CLUB_HITS: number[] = [
  // The flash he comes in out of fires from a press camera in the crowd.
  IN,
  // Round one, the pop.
  D_ON,
  D_POP,
  D_POP_TOP,
  D_POP_LAND,
  H_ON,
  H_POP,
  H_POP_TOP,
  H_POP_LAND,
  // Round two, the gate.
  D_GATE_ON,
  D_JUMP,
  D_JUMP_LAND,
  D_GATE_DONE,
  H_GATE_ON,
  H_JUMP,
  H_JUMP_TOP,
  H_JUMP_LAND,
  // The walk: each step.
  D_WALK,
  beat(181),
  D_WALK_STOP,
  half(182),
  H_WALK_STOP,
  // The call and answer.
  LINES[0],
  D_LINE_LAND[0],
  ECHOES[0],
  H_ECHO_LAND[0],
  LINES[1],
  D_LINE_LAND[1],
  ECHOES[1],
  H_ECHO_LAND[1],
  LINES[2],
  D_LINE_LAND[2],
  CONVERGE,
  BAR_DROP,
  // The grid; Derek's nose; Hansel's move.
  GRID_ON,
  D_FLINCH,
  H_GO,
  ...H_HUM,
  H_CENTRE,
  H_LEAVE,
  WIN,
  half(204),
  D_SAG,
  GRID_OFF,
  // Friends; the lasers back, flaring on the bridge's hardest hits, the crowd up on the last.
  H_COME,
  TOUCH,
  H_SETTLE,
  H_SETTLED,
  ...FLARES,
].filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i).sort((a, b) => a - b)

export const walkoff = part<ClubState>(
  {
    name: 'walkoff',
    draw: (p, s, c) => drawBack(p, c.k, s.begin + c.t, c.weight, derekAt(s.begin + c.t)),
    over: (p, s, c) => drawFront(p, c.k, s.begin + c.t, c.weight, derekAt(s.begin + c.t)),
  },
  (slot) => {
    if (Math.abs(slot.begin - IN) > 1e-6) console.warn(`magnum: walkoff built for ${slot.begin}, timed for ${IN}`)
    const company: Company[] = [
      {
        who: 'hansel',
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const [x, y] = hanselAt(t)
          return { x, y, spin: hanselSpin(t, CLUB_AT[0] + x) }
        },
      },
    ]
    return {
      cells: box(-14, -7, 22, 3, 1),
      exit: [D_END[0] + 0.5, D_END[1]] as Pt,
      lane: { segs: route(DEREK_PATH.ways(slot.begin)), fire: D_POP - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  // Framed so Derek is never further than about half the frame's height from its middle across, a third up or down:
  // under Zoom he stays in it.
  (): PartShot[] => [
    // Out of the flash, going on ahead of him as he slows onto the runway, and drawing back to take in the whole
    // floor: Hansel at its far end, waiting in the judge's lamp.
    { t: IN + 1.35, cells: 5.1, hold: [2.3, -1.05], w: 1 },
    { t: D_ON + 0.4, cells: 6.05, hold: [MID - 0.2, -1.4], w: 1 },
    { t: H_POP, cells: 6.6, hold: [MID + 0.05, -1.7], w: 1 },
    { t: D_GATE_DONE, cells: 5.95, hold: [MID - 0.05, -1.3], w: 1 },
    // In as they walk up to the second plates.
    { t: D_WALK, cells: 5.6, hold: [MID, -1.2], w: 1 },
    { t: LINES[0], cells: 4.5, hold: [MID, -0.9], w: 1 },
    { t: LINES[2], cells: 4.4, hold: [MID, -0.85], w: 1 },
    // The lasers' wide: every beam in the room down to the floor between them, and the grid dropping on it.
    { t: GRID_ON, cells: 6.4, hold: [MID, -1.6], w: 1 },
    { t: H_GO, cells: 6.0, hold: [MID + 0.1, -1.45], w: 1 },
    // In for Hansel's move.
    { t: H_CENTRE, cells: 4.6, hold: [MID - 0.35, -0.95], w: 1 },
    { t: H_LEAVE, cells: 4.45, hold: [MID - 0.45, -0.92], w: 1 },
    // The lamp on him, the crowd up; Derek off out of the light.
    { t: WIN, cells: 5.2, hold: [(D_BACK + H_OUT) / 2 + 0.45, -1.35], w: 1 },
    { t: GRID_OFF, cells: 4.8, hold: [D_ALONE + 1.15, -0.85], w: 1 },
    // Hansel comes to him; the two of them for the cut.
    { t: H_COME, cells: 4.5, hold: [(D_ALONE + H_OUT) / 2, -0.85], w: 1 },
    { t: TOUCH, cells: 4.0, hold: [D_ALONE + 0.5, -0.72], w: 1 },
    { t: H_SETTLED, cells: 3.75, hold: [D_ALONE + 0.42, -0.65], w: 1 },
    { t: SEAMS.derelicte.t, cells: SEAMS.derelicte.cells, hold: [D_END[0] + SEAMS.derelicte.frame[0], D_END[1] + SEAMS.derelicte.frame[1]], w: 1 },
  ],
)

/** For the report and the check: the middle of the floor, where the grid comes down. */
export const CLUB_MID = MID
