import type { Pt } from '../../../../../parts'
import { laneAt } from '../../../../../parts'
import { box, part, scenery, type PartShot } from '../kit'
import { WALTER_WARM } from '../worlds'
import { drawFront, drawMachine, drawSet } from './press-draw'
import {
  buildLane,
  CINCH,
  CRIMP,
  CURTAIN,
  CUTS,
  EXIT_X,
  FLING,
  FLOOR_HIT,
  IMPRESSIONS,
  JOG,
  LAID,
  LIFTS,
  OFF_NOSE,
  ON_STACK,
  ON_WEB,
  PAVEMENT,
  RAMS,
  RAMS_NEXT,
  RECOIL,
  RIDE,
  ROLL_BEATS,
  SHOVE,
  SLAPS,
  STACK_X,
  STEPS,
  STRAP_OVER,
  STRAP_UP,
  T0,
  T1,
  TREADLE,
} from './press-plan'

/**
 * Life (191.409 → 226.384, bars 110 to 130: the peak), the PRESS builder's.
 *
 * On the peak's first downbeat negative 25 lies on the long conference table where he has just laid it, and Walter
 * beside it. At the table's far end Ted, a hard dark shape with his beard, starts back from it, and stands. Walter
 * goes: along the table and off its end, down the iron stair into the press hall a tread a beat, and onto the start
 * treadle at its foot. The press starts under him, and the treadle throws him up onto the web.
 *
 * The last issue of Life is made, and he rides it. The paper carries him down one straight line through three units,
 * each striking every beat: the first prints the red box, the second its white rule, the third the grey photograph.
 * Each lifts its plate on a beat to let him by and drops it on a beat behind him. Then the folder comes in, a cut a
 * beat, the copies falling face on to the stacker's tray, and the ram shoves one in under the stack each beat after.
 * He comes round the turning roller, down the former's board, off its nose and onto the stack, and the stack grows
 * under him, lifting him a copy a beat to the bundle's height. Joggers square it, the strap goes round, it is
 * cinched and crimped, and on the loudest hit of the stretch the pusher shoves the bundle out onto the conveyor.
 * Its front drops onto a roller every beat; it pushes through the strip curtain of the loading door into the
 * morning; it stops at the bumper and he rolls on, off its front, down onto the pavement, and away at the street's
 * pace as the band falls away.
 */

export const PRESS_AT: Pt = [0, 0]
export const PRESS_CELLS = box(-12, -8, 34, 8, 2)

export const pressSet = scenery<null>({
  name: 'press-set',
  draw: (p, _s, c) => {
    p.push()
    drawSet(p, c, c.t)
    p.pop()
  },
})

const SEGS = buildLane()
const LANE = { segs: SEGS, fire: TREADLE - T0 }
/** Walter at show time t, in the part's cells. */
const him = (t: number): Pt => {
  const q = laneAt(LANE, t - T0)
  return [q.x, q.y]
}

export const press = part<null>(
  {
    name: 'press',
    draw: (p, _s, c) => {
      p.push()
      drawMachine(p, c, c.t + T0)
      p.pop()
    },
    over: (p, _s, c) => {
      p.push()
      drawFront(p, c, c.t + T0)
      p.pop()
    },
  },
  () => ({
    cells: box(-6, -6, 30, 6, 1),
    exit: [EXIT_X, 4] as Pt,
    lane: LANE,
    state: null,
    // He is Life's red from Nuuk on; said again here so the peak never depends on it.
    changes: [{ at: 0, color: WALTER_WARM }],
  }),
  () => shots(),
)

/** The camera: Ted and the negative; with him down the stair; the press as it starts; along the web; the folder and the stack; the bundle out; the street. */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, x: number, y: number): PartShot => ({ t, cells, hold: [x, y], w: 1 })
  const on = (t: number, cells: number, dx: number, dy: number, y?: number): PartShot => {
    const [x, hy] = him(t)
    return hold(t, cells, x + dx, y ?? hy + dy)
  }
  return [
    // Upstairs: the negative laid down, Ted at the far end; holding while he stands; then off.
    hold(T0 + 1.0, 3.5, -0.75, -0.55),
    hold(STEPS[0] - 1.6, 3.6, -0.3, -0.35),
    on(FLOOR_HIT, 3.9, 0.7, -0.35),
    // Down the stair with him, opening out as the hall comes into view.
    on(STEPS[3], 4.3, 0.75, -0.45),
    on(STEPS[6], 4.8, 1.0, -0.6),
    // The treadle, the reel and the first unit, as the press starts.
    hold(TREADLE + 0.3, 5.0, 8.1, 2.45),
    hold(ON_WEB, 4.9, 9.9, 2.2),
    // Along the web, through the three units.
    on(ON_WEB + 1.6, 4.6, 0.9, 0.35),
    on(ON_WEB + 4.5, 4.6, 0.9, 0.35),
    on(OFF_NOSE - 2.2, 4.8, 0.7, 0.35),
    // The folder and the stack: he comes down to it, and it grows under him.
    hold(OFF_NOSE, 5.2, 17.7, 2.75),
    hold(ON_STACK + 0.6, 5.0, 18.0, 2.85),
    hold(JOG[0], 4.1, STACK_X + 0.05, 2.75),
    hold(SHOVE, 4.0, STACK_X + 0.15, 2.7),
    // Out on the conveyor, through the door, and onto the pavement.
    on(RIDE + 0.4, 4.1, 0.9, 0, 2.35),
    on(CURTAIN + 0.3, 4.2, 0.9, 0, 2.9),
    on(PAVEMENT + 0.2, 4.2, 0.9, 0, 3.5),
    hold(T1, 4.2, EXIT_X - 0.5 + 0.9, 4 - 0.5),
  ]
}

/** Every strike, in show seconds. */
export const PRESS_HITS: readonly number[] = (() => {
  const all = [
    LAID,
    RECOIL,
    FLOOR_HIT,
    ...STEPS,
    TREADLE,
    FLING,
    ON_WEB,
    ...IMPRESSIONS.flat(),
    ...LIFTS.flat(),
    ...CUTS,
    ...RAMS,
    ...RAMS_NEXT,
    ON_STACK,
    ...JOG,
    STRAP_UP,
    STRAP_OVER,
    CINCH,
    CRIMP,
    SHOVE,
    ...ROLL_BEATS,
    CURTAIN,
    PAVEMENT,
    ...SLAPS,
  ].sort((a, b) => a - b)
  const out: number[] = []
  for (const t of all) if (!out.length || t - out[out.length - 1] > 0.001) out.push(t)
  return out
})()

/** No wides: he is always the thing in the frame. */
export const PRESS_WIDE: [number, number][] = []
