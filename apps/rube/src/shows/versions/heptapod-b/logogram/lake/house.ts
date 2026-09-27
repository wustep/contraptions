import type { Pt } from '../../../../../parts'
import { R } from '../../../../../parts'
import { box, carried, part, scenery, type Company, type PartShot, type Riders, type Slot } from '../kit'
import { CREDITS_AT } from '../music'
import { HANNAH_OLDER, HANNAH_SCALE } from '../worlds'
import { pulse } from '../music'
import { drawGlare, drawHouse, type Body } from './house-draw'
import {
  END,
  HANNAH_END,
  HANNAH_GAZE,
  HANNAH_PROLOGUE,
  HANNAH_V2,
  HR,
  LOUISE_END,
  HR2,
  LOUISE_GAZE,
  PRO,
  SCENES,
  SEAT,
  V1,
  V1_AT,
  V2,
  V3_DROPS,
  WIN,
  along,
  hannahLawn,
  lightAt,
  louiseLawn,
} from './house-plan'

/**
 * The lake house (the future): Louise and Hannah by the long window over the lake. Its standing set, and the five
 * scenes in it: the prologue (the film's first image: dawn, Hannah comes across the room to her mother, the sun
 * catches the fog on the water and goes to white), the three visions (summer on the lawn with little Hannah; Hannah
 * older, leaning on her, and going; the window at dusk in the rain, alone), and the end, which opens on the prologue's
 * first frame and is the prologue again, knowing.
 *
 * There is no machine here. The only mechanisms are the light, the rain, and a child crossing a room. The set draws
 * everything from show time (`house-draw.ts`); the scenes build Louise's lane, Hannah's company and the camera, and
 * set where each of them looks (a ball's mark, read as a gaze). The numbers are in `house-plan.ts`.
 */

export const HOUSE_BOX = { x0: -14, y0: -12, x1: V1_AT[0] + 16, y1: 9 }
export const HOUSE_CELLS = box(HOUSE_BOX.x0, HOUSE_BOX.y0, HOUSE_BOX.x1, HOUSE_BOX.y1, 4)

/** Where each scene starts (the part's origin), lake cells. Every room scene starts her on the bench; the end is the prologue's frame. */
export const PROLOGUE_AT: Pt = [0, 0]
export { V1_AT }
export const V2_AT: Pt = [0, 0]
export const V3_AT: Pt = [0, 0]
export const END_AT: Pt = PROLOGUE_AT

/** Where Louise and Hannah are at show time `t` (lake cells), for the set's shadows. */
function bodies(t: number): Body[] {
  const { prologue, v1, v2, v3, end } = SCENES
  const seat: Body = { x: SEAT[0], y: SEAT[1], r: R }
  const at = (p: Pt, r: number): Body => ({ x: p[0], y: p[1], r })
  if (t >= v1.begin - 1 && t < v1.end + 1) {
    const [lx, ly] = louiseLawn(t)
    const [hx, hy] = hannahLawn(t)
    return [at([V1_AT[0] + lx, V1_AT[1] + ly], R), at([V1_AT[0] + hx, V1_AT[1] + hy], HR)]
  }
  if (t >= v2.begin - 1 && t < v2.end + 1) return [seat, at(along(HANNAH_V2, v2.begin, t), HR2)]
  if (t >= v3.begin - 1 && t < v3.end + 1) return [seat]
  if (t >= end.begin - 1) {
    const u = Math.max(t, end.begin)
    return [at(along(LOUISE_END, end.begin, u), R), at(along(HANNAH_END, end.begin, u), HR)]
  }
  return [seat, at(along(HANNAH_PROLOGUE, 0, Math.min(t, prologue.end)), HR)]
}

export const houseSet = scenery<null>({
  name: 'house-set',
  draw: (p, _s, c) => drawHouse(p, c, c.t, lightAt(c.t), bodies(c.t)),
  over: (p, _s, c) => drawGlare(p, c, lightAt(c.t)),
})

/* ------------------------------------------------------------------ the scenes */

/** Louise, at rest on the bench for the whole slot. */
const seated = (slot: Slot) => ({ segs: [{ from: SEAT, to: SEAT, dur: slot.end - slot.begin }], fire: 0 })
/** Her mark as a gaze. */
const looking = (fn: (t: number) => number): Riders => (t, hero) => [{ ...hero, spin: fn(t) }]
/** The room's footprint, for the world's bounds. */
const ROOM_CELLS = box(WIN.x0 - 3, -4, WIN.x1 + 2, 2)
/**
 * The last framing, for the credits: the whole window, its frame's top edge `top` of the way down the picture (the
 * page sets the cards in the top third), and a slow drift back from `cells` to `drift` to the end.
 */
const FINAL = { cells: 7.6, drift: 7.95, top: 0.38 }
const finalY = (cells: number) => WIN.top - 0.08 + cells * (0.5 - FINAL.top)
/** A framing held on her, `off` from her. */
const on = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, hold: [SEAT[0] + off[0], SEAT[1] + off[1]], w: 1 })

const hannahSpan = (slot: Slot, lane: typeof HANNAH_PROLOGUE, t0: number, scale: number, gazeFn: (t: number) => number, to = slot.end): Company => ({
  who: 'hannah',
  from: slot.begin,
  to,
  at: (t) => {
    const [x, y] = along(lane, t0, t)
    return { x, y, scale, spin: gazeFn(t) }
  },
})

/**
 * The prologue (0 → 8.911): dawn. Louise on the bench under the window's left end; Hannah across the room on the
 * floor. On the first murmur that carries she sets off, a child's roll; on the clicks she springs up onto the bench's
 * end and lands; on the loudest click she comes to her mother, a soft touch, and settles by her. They turn to the
 * window; on the first pulse the sun behind the fog catches the water, and grows, and the window goes to white.
 */
export const prologue = part<null>(
  { name: 'prologue', draw: () => {} },
  (slot) => ({
    cells: ROOM_CELLS,
    exit: [0, 0],
    lane: { ...seated(slot), fire: PRO.touch - slot.begin },
    state: null,
    riders: looking(LOUISE_GAZE.prologue),
    company: [hannahSpan(slot, HANNAH_PROLOGUE, 0, HANNAH_SCALE, HANNAH_GAZE.prologue)],
  }),
  (slot) => [
    // From the first frame (the score's), a slow push toward the window as the light grows, closing on the two of them.
    on(3.3, 4.5, [1.1, -0.9]),
    on(PRO.light[0], 3.95, [0.62, -0.6]),
    on(slot.end, 3.2, [0.25, -0.25]),
  ],
)

/**
 * The first vision (139.476 → 142.582): summer, the lawn along the lake, bright. Little Hannah runs ahead, laughing (a
 * leap, a skip, two skips more on the pulses), Louise after her; the cut takes it away with Hannah still running.
 */
export const vision1 = part<null>(
  { name: 'vision1', draw: () => {} },
  (slot) => {
    const end = louiseLawn(slot.end)
    return {
      cells: box(-4, -3, 8, 3),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs: carried(louiseLawn, slot.begin, slot.end, 64), fire: V1.bounce[0] - slot.begin },
      state: null,
      company: [
        {
          who: 'hannah',
          from: slot.begin,
          to: slot.end,
          at: (t) => {
            const [x, y] = hannahLawn(t)
            return { x, y, scale: HANNAH_SCALE, spin: x / HR }
          },
        },
      ],
    }
  },
  (slot) => [
    { t: slot.begin + 1.3, cells: 4.5, off: [0.75, -0.5], w: 0 },
    { t: slot.end, cells: 4.5, off: [0.7, -0.5], w: 0 },
  ],
)

/**
 * The second vision (156.177 → 160.015): the window by day. Hannah older beside her; on the cut she leans in against
 * her, and rests there; then she goes, off along the bench and down off its end, and out of the room's frame. The
 * camera comes in on them, and when she has gone draws back to Louise alone.
 */
export const vision2 = part<null>(
  { name: 'vision2', draw: () => {} },
  (slot) => ({
    cells: ROOM_CELLS,
    exit: [0, 0],
    lane: { ...seated(slot), fire: V2.lean - slot.begin },
    state: null,
    riders: looking(LOUISE_GAZE.v2),
    company: [hannahSpan(slot, HANNAH_V2, SCENES.v2.begin, HANNAH_OLDER, HANNAH_GAZE.v2)],
  }),
  (slot) => [on(V2.rest + 0.6, 3.78, [0.3, -0.55]), on(V2.go + 1.0, 3.84, [0.44, -0.58]), on(slot.end, 4, [0.5, -0.6])],
)

/**
 * The third vision (163.126 → 166.243): the window at dusk, the room dim, the lamp unlit, Louise alone. The hard
 * pulses are the rain: each a drop landing on a pane and running down it. She does not move; the camera breathes.
 */
export const vision3 = part<null>(
  { name: 'vision3', draw: () => {} },
  (slot) => ({
    cells: ROOM_CELLS,
    exit: [0, 0],
    lane: { ...seated(slot), fire: V3_DROPS[0] - slot.begin },
    state: null,
    riders: looking(LOUISE_GAZE.v3),
  }),
  (slot) => [on(slot.begin + 1.55, 3.87, [0.46, -0.64]), on(slot.end, 4, [0.5, -0.6])],
)

/**
 * The end (196.783 → 246): the first frame again, and this time we know. The held tones die; the fog on the water
 * glows and thins; the camera comes in, very slowly. She looks at her daughter first, this time. The flutter: Hannah
 * comes across the room to her, skipping on its hardest notes, springs up onto the bench and touches her on its
 * heart (212.312). A second of stillness together; then, as the sun comes through the fog on the water, the camera
 * draws back to the whole window low in the frame, the two of them small at its end, before the credits come over
 * the quiet wall above it, and drifts there to the end.
 */
export const ending = part<null>(
  { name: 'ending', draw: () => {} },
  (slot) => ({
    cells: ROOM_CELLS,
    exit: [0, 0],
    lane: { ...LOUISE_END, fire: END.touch - slot.begin },
    state: null,
    riders: looking(LOUISE_GAZE.end),
    company: [hannahSpan(slot, HANNAH_END, SCENES.end.begin, HANNAH_SCALE, HANNAH_GAZE.end)],
  }),
  (slot) => [
    // From the first frame (the score's), a slow push toward the two of them, never stopping, while the tones die.
    on(slot.begin + 1.2, 4.62, [1.18, -0.96]),
    on(202.3, 4.0, [0.55, -0.8]),
    on(END.go - 0.4, 3.42, [-0.62, -0.62]),
    // Drifting with Hannah as she comes; at rest on the touch; then back, slowly, to the whole window, the two of them
    // small at its end.
    on(END.touch, 3.22, [-0.1, -0.5]),
    // A second together, nearly still; then back, in one smooth ease, to the whole window low in the frame (its top
    // edge 38% down, the wall and ceiling quiet above it for the credits), before the first card comes; then only a
    // slow drift to the end.
    on(END.touch + 1.0, 3.25, [-0.05, -0.5]),
    { t: CREDITS_AT - 0.3, cells: FINAL.cells, hold: [(WIN.x0 + WIN.x1) / 2, finalY(FINAL.cells)], w: 1 },
    { t: slot.end, cells: FINAL.drift, hold: [(WIN.x0 + WIN.x1) / 2 - 0.08, finalY(FINAL.drift)], w: 1 },
  ],
)

/** Every strike of the five scenes (show seconds, exact measured times). */
export const LAKE_HITS: number[] = [
  // The prologue: she sets off, springs, lands, touches; they turn to the window; the sun catches, and grows.
  PRO.go,
  PRO.spring,
  PRO.land,
  PRO.touch,
  PRO.look,
  PRO.lookToo,
  ...PRO.light,
  // The first great pulse (8.911): the glare on the water has swelled to white, the frame all light (the director's
  // veil peaks on it) and the place changes inside it.
  pulse(37),
  // The first vision: the cut, Hannah's leap (off, down) and skip, and her two skips running on.
  V1.cut,
  ...V1.bounce,
  ...V1.skips,
  // The second: the lean, at rest against her, she goes, and lands on the floor off the bench's end.
  V2.lean,
  V2.rest,
  V2.go,
  V2.down,
  // The third: the rain.
  ...V3_DROPS,
  // The end: she looks at her daughter, who looks up at her; the flutter: sets off, three skips, a dash, springs,
  // lands, touches.
  END.knows,
  END.notices,
  END.go,
  ...END.skip,
  END.run,
  END.spring,
  END.land,
  END.touch,
]
