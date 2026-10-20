import type { Pt } from '../../path'

/**
 * Troy, laid out in world cells at the scale of its people (a ball is a man: a step is a ball high, a doorway three and
 * a half): the sea to the right, a shelving beach, low dunes, the hill climbing to the city wall and its gate tower, and
 * inside the wall the lower street, the temple steps, and Athena's forecourt and temple on the height.
 *
 * Read left to right, the way the hero goes on the night of the sack:
 *
 *   temple ─ forecourt (the horse, Athena) ─ steps ─ street ─ shaft (the counterweight) ─ wall and gate ─ hillside
 *   ─ dunes ─ beach ─ sea
 *
 * and under the hill, the drain from the shaft's foot out to the hillside, which is how he leaves.
 */

/** The waterline meets the sand here. */
export const SHORE = -4

export const FORECOURT = { x0: -40.6, x1: -34.1, y: -5.08 }
export const TEMPLE = { x0: -45.4, x1: -40.6, y: -5.08 }
/** Eight steps down from the forecourt to the street, a ball high and a ball deep each. */
export const STEPS = { x0: -34.1, n: 8, run: 0.26, rise: 0.26 }
export const STREET = { x0: -32.02, x1: -29.65, y: -3.0 }
/** The shaft the counterweight goes down, under the gate tower's floor. */
export const SHAFT = { x0: -29.65, x1: -28.4, top: -3.0, floor: -1.5 }
/** The city wall, its gate passage at street level, and the gate tower over the shaft and the passage. */
export const WALL = { x0: -28.4, x1: -27.2, top: -5.8, passage: -4.5 }
export const TOWER = { x0: -29.95, x1: -26.95, top: -7.3, floor: -4.85, roof: -6.98 }
/** The gate: a timber slab in a slot through the passage, lifted by the gear train above. */
export const GATE = { x0: -27.96, x1: -27.74, bottom: -3.0, top: -5.92, lift: 1.0 }
/** The drain: from the shaft's floor out under the hill to the hillside. */
export const DRAIN = { from: [-28.4, -1.5] as Pt, to: [-21.7, -1.3] as Pt, r: 0.2 }

/** The horse's place on the forecourt that night, facing out over the city to the sea, and Athena's statue before it. */
export const HORSE_AT_TEMPLE = -38.4
export const PLINTH = { x: -37.0, w: 0.3, top: FORECOURT.y - 0.14 }
/** Athena's neck, where the rope is made fast, and her head's middle: a little smaller than a man's. */
export const NECK: Pt = [-37.0, -5.84]
export const HEAD: Pt = [-37.0, -5.93]
export const HEAD_R = 0.085

/** The ground's profile: the height of the surface at x (cells, negative up). Through the shaft it is the shaft's floor. */
const PROFILE: Pt[] = [
  [-140, -5.5],
  [-46.6, -5.5],
  [-45.4, -5.08],
  [FORECOURT.x1, FORECOURT.y],
  // The steps are drawn as steps; for the ground under them a straight line is enough.
  [STREET.x0, STREET.y],
  [STREET.x1, STREET.y],
  [WALL.x1, STREET.y],
  // The hillside down from the gate.
  [-25.4, -2.8],
  [-22.6, -1.75],
  [-20.4, -0.95],
  [-19.0, -0.62],
  // Dunes.
  [-17.6, -0.58],
  [-16.4, -0.66],
  [-15.0, -0.5],
  [-13.6, -0.42],
  // The beach, shelving to the water.
  [-11.0, -0.3],
  [-8.0, -0.2],
  [-6.0, -0.11],
  [SHORE, 0],
  // The seabed.
  [-1.0, 0.95],
  [3.0, 2.1],
  [12.0, 2.6],
]

export function ground(x: number): number {
  if (x <= PROFILE[0][0]) return PROFILE[0][1]
  for (let i = 1; i < PROFILE.length; i++) {
    const [x1, y1] = PROFILE[i]
    if (x <= x1) {
      const [x0, y0] = PROFILE[i - 1]
      const u = (x - x0) / (x1 - x0)
      // Smooth between the points of the hill and the beach, straight where the city is built.
      const s = x0 >= WALL.x1 - 1e-6 ? u * u * (3 - 2 * u) : u
      return y0 + (y1 - y0) * s
    }
  }
  return PROFILE[PROFILE.length - 1][1]
}

/** The ground's points from x0 to x1, for drawing its edge. */
export function groundLine(x0: number, x1: number, step = 0.25): Pt[] {
  const out: Pt[] = []
  for (let x = x0; x < x1; x += step) out.push([x, ground(x)])
  out.push([x1, ground(x1)])
  return out
}

/** The top of step `i` (0 is the forecourt's edge, the highest): its left and right x, and its y. */
export function step(i: number): { x0: number; x1: number; y: number } {
  const x0 = STEPS.x0 + i * STEPS.run
  return { x0, x1: x0 + STEPS.run, y: FORECOURT.y + (i + 1) * STEPS.rise }
}

/** Where a ball of radius r rests on the ground at x. */
export const onGround = (x: number, r: number): Pt => [x, ground(x) - r]
