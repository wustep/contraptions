import type { Pt } from '../../../../../parts'
import { bar, beat } from '../music'
import * as jar from '../inside/jar'

/**
 * The street side of the house, as a plan: where everything stands (world cells of the house world, from the FRONT
 * set's origin) and when the fix-up does each thing (show seconds). The set (`front.ts`), the fix-up (`fixup.ts`)
 * and the end (`alone.ts`) all read it, so the house, the machine and the two of them agree by construction.
 *
 * The house faces the street: a two-storey clapboard house with a side-gabled roof, a front gable over the bay
 * window on the left, the front door beside the bay under a small porch roof, and the porch's three steps running
 * down to the right along the house's face (the church's steps, mirrored in place: at the cut from the church he is
 * at the foot of a flight of three that rises to his left, and so he is here).
 */

/** The ground: street, path and lawn. A ball on it has its centre at y = 0. */
export const G = 0.13
/** The porch's and the rooms' floor: three risers up from the ground. Carl on it has his centre at P - 0.13. */
export const RISE = 0.22
export const TREAD = 0.35
export const P = G - 3 * RISE

export const HOUSE = {
  x0: 0,
  x1: 8.4,
  /** The band between the storeys, and the eaves; the ridge of the main roof, and its overhang. */
  band: [-3.1, -3.3] as Pt,
  eaves: -5.4,
  ridge: -7.9,
  roof: [-0.45, 8.85] as Pt,
  /** The front gable over the bay: its foot on the eaves, its apex. */
  gable: { x0: 0.05, x1: 4.35, apex: -7.5 },
  /** The bay window: its glass from sill to head, its two side facets' width, the top of its little roof. */
  bay: { x0: 0.45, x1: 3.95, sill: -0.6, head: -2.85, facet: 0.46, top: -3.18 },
  /** The front door's opening. */
  door: { x0: 4.3, x1: 5.05, top: -2.45 },
  /** The porch: its floor from the bay to the top of the steps; its roof's underside. */
  porch: { x0: 3.95, x1: 5.75, roof: -2.78 },
  /** The ground-floor window right of the porch, [x0, x1, top, bottom]. */
  side: [6.75, 7.85, -2.55, -1.05] as [number, number, number, number],
  /** The upstairs windows: two in the gable over the bay, one on the right with shutters. [x0, x1], top, bottom. */
  upper: [
    [1.3, 2.05],
    [2.35, 3.1],
    [6.25, 7.3],
  ] as Pt[],
  upperY: [-4.95, -3.7] as Pt,
  /** The little window high in the gable. */
  attic: [1.95, 2.45, -6.8, -6.1] as [number, number, number, number],
  /** The chimney, out of the roof right of the ridge's middle: [x0, x1, top]. */
  chimney: [5.95, 6.55, -8.7] as [number, number, number],
}

/** The porch's edge, where the steps start down to the right; the steps' treads' tops, top first. */
export const EDGE = HOUSE.porch.x1
export const TREADS: { x0: number; x1: number; y: number }[] = [1, 2].map((i) => ({ x0: EDGE + (i - 1) * TREAD, x1: EDGE + i * TREAD, y: P + i * RISE }))
/** Carl at rest at the steps' foot: as far from the last edge as the church's own (`CUTS.home`). */
export const FOOT_X = EDGE + 2 * TREAD + 0.25

/** The surface under x on the steps' side of the porch (the ground, a tread, the porch floor). */
export function stepAt(x: number): number {
  if (x < EDGE) return P
  for (const t of TREADS) if (x < t.x1) return t.y
  return G
}

/** Their two armchairs by the bay window (`props/chairs.ts`): Carl's on the left. The floor lamp by his. */
export const CHAIRS = { carl: 1.74, ellie: 2.66 }
export const LAMP_X = 1.12

/** The mailbox at the street: its post's middle, and its box (x0, x1, top, bottom). The flag on its right end. */
export const MAILBOX = { x: 8.9, box: [8.54, 9.26, -0.94, -0.58] as [number, number, number, number] }
/** Where the two prints are pressed into its wet paint: his square, her round (their centres). */
export const PRINTS = { carl: [8.74, -0.76] as Pt, ellie: [9.08, -0.76] as Pt }

/** The street lamps either side of the house: their posts' x, and the note each lights on (once the camera has drawn back to them; the last on the piano's last note). */
export const LAMPS: { x: number; at: number }[] = [
  { x: -6.4, at: 240.013 },
  { x: 14.8, at: 242.532 },
]
/** The evening star, low in the west beside the house, out on the strongest of the last notes; the others come after it. */
export const STAR = { at: [10.4, -6.5] as Pt, on: 237.813 }

/** When the tree came through the roof (the jar builder's `TREE_AT`), so the roof is patched from then on. */
export const TREE_AT: number = (jar as unknown as { TREE_AT?: number }).TREE_AT ?? 128.871

/* ------------------------------------------------------------------ the fix-up, in time */

/**
 * The machine is a cart Carl pushes along the front of the house. At its front stands a telescoping mast of three
 * stacked rollers as tall as the house; wherever it has passed, the house is new. `W(T)` is where its rollers are
 * (the line between the old house and the new one). Each downbeat its trip hammer strikes the wall just ahead of
 * the rollers; the cart moves in a waltz's lilt, slowest on the blow.
 */
const KNOTS: [number, number][] = [
  [bar('waltz', 6), -0.3],
  [bar('waltz', 7), 0.5],
  [bar('waltz', 8), 1.35],
  [bar('waltz', 9), 2.2],
  [bar('waltz', 10), 3.0],
  [bar('waltz', 11), 3.7],
  [bar('waltz', 12), 4.38],
  [bar('waltz', 13), 5.2],
  [bar('waltz', 14), 6.0],
  [bar('waltz', 15), 6.85],
  [bar('waltz', 16), 7.7],
  [bar('waltz', 17), 8.6],
  [bar('waltz', 18), 9.5],
  [bar('waltz', 19), 10.45],
  [bar('waltz', 20), 11.22],
]
/** The shove: Carl runs into the cart's handle and it starts. The run's end: the cart at rest. */
export const SHOVE = KNOTS[0][0]
export const HALT = KNOTS[KNOTS.length - 1][0]
/** The cart's speed just after the shove (Carl's run is spent into it). */
export const KICK = 0.42
/** The last blow: past it, the cart rolls on free of the lilt and comes to rest. */
const BLOW_END = bar('waltz', 17)
/** Past the house: the speeds it rolls on at, each knot's, to rest at the last. */
const SPEED_ON: number[] = KNOTS.map((k, i) => {
  if (i === KNOTS.length - 1) return 0
  if (i === 0 || k[0] <= BLOW_END) return 0
  return 0.8 * ((KNOTS[i + 1][1] - KNOTS[i - 1][1]) / (KNOTS[i + 1][0] - KNOTS[i - 1][0]))
})

function hermite(a: number, va: number, b: number, vb: number, T: number, u: number): number {
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * T * va + (-2 * u3 + 3 * u2) * b + (u3 - u2) * T * vb
}

/** The lilt: each blow kicks the cart on, and it glides, slowing, into the next. How much of a bar's way is made by `u` of it. */
const LILT = 0.55
const PHASE = 0.12
const lilt = (u: number): number => u + (LILT / (2 * Math.PI)) * (Math.sin(2 * Math.PI * (u - PHASE)) + Math.sin(2 * Math.PI * PHASE))

/** Where the rollers are at show time T (the new house is left of this). */
export function W(T: number): number {
  const n = KNOTS.length
  if (T <= KNOTS[0][0]) return KNOTS[0][1]
  if (T >= KNOTS[n - 1][0]) return KNOTS[n - 1][1]
  let i = 1
  while (KNOTS[i][0] < T) i++
  const [t0, x0] = KNOTS[i - 1]
  const [t1, x1] = KNOTS[i]
  const D = t1 - t0
  const u = (T - t0) / D
  const lastBlow = BLOW_END
  // The shove: from its kick into the first bar's glide. The stop: from the last glide down to rest.
  if (i === 1) return hermite(x0, KICK, x1, ((x1 - x0) / D) * (1 + LILT * Math.cos(2 * Math.PI * PHASE)), D, u)
  if (t0 >= lastBlow) {
    const m0 = (KNOTS[i - 1][1] - KNOTS[i - 2][1]) / (KNOTS[i - 1][0] - KNOTS[i - 2][0])
    const v0 = t0 === lastBlow ? m0 * (1 + LILT * Math.cos(2 * Math.PI * (1 - PHASE))) : SPEED_ON[i - 1]
    return hermite(x0, v0, x1, SPEED_ON[i], D, u)
  }
  return x0 + (x1 - x0) * lilt(u)
}
/** How far the fix-up has got at x: true where the house is new at T. Before the run nothing is; after it, all is. */
export const renewed = (x: number, T: number): boolean => T >= HALT || x < W(T)

/** The cart's parts from the rollers' line: its middle, its deck's ends, its wheels, Carl at the handle, Ellie's spot on the deck. */
export const CART = {
  mid: -1.2,
  deck: [-2.35, -0.05] as Pt,
  deckY: -0.52,
  wheels: [-2.0, -0.4],
  wheelR: 0.3,
  carl: -2.62,
  ellie: -1.72,
  /** The mast stands just behind the rollers; the hammer's pivot on it, and where its face strikes the wall. */
  mast: -0.13,
  hammerPivot: [0.0, -2.05] as Pt,
  strike: [0.46, -1.22] as Pt,
  /** The jib's pivot on the mast, and its length. */
  jib: [-0.13, -2.75] as Pt,
  jibLength: 1.8,
}

/** The trip hammer's blows: every downbeat along the house, the last on the mailbox's post. */
export const BLOWS: number[] = KNOTS.filter(([t]) => t > SHOVE + 0.1 && t <= bar('waltz', 17) + 0.01).map(([t]) => t)
/** Past the house the cart rolls on, lighter, and comes to rest on bar 20 with Carl under the mailbox: its brake drops against the wheel. */
export const BRAKE = HALT

/** The mast's upper two sections telescope up after the shove, a section a beat, and fold down as the cart stops. */
export const RAISE = [beat('waltz', 6, 2), beat('waltz', 6, 3)]
export const FOLD = [bar('waltz', 18), beat('waltz', 18, 2)]

/** The chairs, lifted off the lawn on the jib and lowered in through the empty bay: [hook down, lift, landed]. */
export const CHAIR_LIFT = {
  carl: [beat('waltz', 9, 1) + 0.05, beat('waltz', 9, 2), beat('waltz', 10, 2)] as [number, number, number],
  ellie: [beat('waltz', 10, 3) + 0.09, bar('waltz', 11), bar('waltz', 12)] as [number, number, number],
}
/** The bay's missing middle pane, slid in once the chairs are in. */
export const PANE_AT = beat('waltz', 13, 3)
/** The door, hanging off one hinge, knocked straight and shut by the hammer's blow. */
export const DOOR_HUNG = bar('waltz', 12)
/** The mailbox: the last blow, on its post, knocks it straight and its flag up (seen new as the rollers pass it). */
export const FLAG_AT = bar('waltz', 17)
/** The prints: hers, pressed on bar 21 from the cart; his beside it on bar 22, from the ground. */
export const PRINT_AT = { ellie: bar('waltz', 21), carl: bar('waltz', 22) }

/** The front door's leaf, open 0..1 (inward), at show time T: the fix-up's comings and goings, and his at the end. */
export interface DoorSwing {
  /** Opening starts, fully open, closing starts, shut (show seconds). */
  open: number
  wide: number
  close: number
  shut: number
}

/* ------------------------------------------------------------------ the end, in time */

/** Home alone: up his three steps on the piano's notes (a rest on the second), the latch, the door shut behind him, the balloon tied to her chair, the sit, the lamp. */
export const ALONE = {
  steps: [204.138, 204.899, 207.006],
  latch: 208.155,
  shut: 211.801,
  tie: 214.93,
  sit: 219.312,
  lamp: 222.703,
}

/** The front door's swings: hers and his going in after the fix-up, and his alone at the end. */
export const SWINGS: DoorSwing[] = [
  { open: 42.3, wide: 42.75, close: 45.05, shut: bar('waltz', 28) },
  { open: ALONE.latch, wide: 209.0, close: 211.3, shut: ALONE.shut },
]

/** How far the dusk has come down at T (0 by day): evening as he comes home, night by the last note. */
export function darkAt(T: number): number {
  if (T < 195) return 0
  const u = Math.max(0, Math.min(1, (T - 201.9) / 46))
  return 0.3 + 0.52 * (u * u * (3 - 2 * u))
}
