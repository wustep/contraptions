import type p5 from 'p5'
import { FLOOR, type Pt } from '../../../../../parts'
import { GHOST_ON_SHELF } from '../space/gargantua'

/**
 * Cooper Station, seen end-on: a ring of land round its axis, twenty cells
 * out, spinning so that "down" is outward, away from the axis. The show looks
 * at it from the ring's own frame, so the land is still and a ball thrown
 * across it curves.
 *
 * Act II's station parts share this one geometry. Everything is given
 * relative to O, where Act II starts: the ball resting on the top shelf of
 * the replica bookcase, which is where Act I left it. The replica farmhouse
 * (the same house as Act I's, moved up here as a museum) stands on a levelled
 * plinth at the bottom of the ring, and its yard is the ring's ground.
 */

/** Cells from the axis to the ground. */
export const RIM_R = 20

/** O in the bookcase's own cells (the shelf part's frame in Act I): where the ghost came to rest. */
const REST = GHOST_ON_SHELF()
/** Act I's house cells, from O: Act I placed the shelf part's frame at world (0, -2) and the house at world (0, 0). */
export const HOUSE: Pt = [-REST[0], 2 - REST[1]]
/** The house's yard, the ring's ground at the bottom, 1 + FLOOR below the house's ground floor. */
const YARD_Y = HOUSE[1] + 1 + FLOOR
/** The axis, from O: straight above the middle of the house, a radius up from its yard. */
export const AXIS: Pt = [HOUSE[0] + 3.65, YARD_Y - RIM_R]

/** A point `h` cells in from the ground at angle `a` (radians, y down: π/2 is the bottom of the ring), from O. */
export const onRim = (a: number, h = 0): Pt => [AXIS[0] + (RIM_R - h) * Math.cos(a), AXIS[1] + (RIM_R - h) * Math.sin(a)]
/** Where a ball rolling on the ground is, at angle `a`, from O. */
export const ballOnRim = (a: number): Pt => onRim(a, FLOOR)
/** The angle of a point from O. */
export const angleOf = (q: Pt): number => Math.atan2(q[1] - AXIS[1], q[0] - AXIS[0])

/**
 * The seams between Act II's station parts, from O. Each part starts where
 * the one before ended, rolling along the ground in the ring's turning
 * direction (angle decreasing: from the bottom round the right-hand side and
 * over the top).
 */
export const SEAM = {
  /** Act II starts: the ball on the replica shelf. */
  start: [0, 0] as Pt,
  /** Out of the replica house's yard onto the ring, just past the plinth. */
  replicaOut: ballOnRim(Math.PI / 2 - 0.36),
  /** The ballpark's first base line, round on the right-hand side. */
  ballparkIn: ballOnRim(0.12),
  /** Across the ring: in through the window of a house on the far side, up and to the left. */
  ballparkOut: ballOnRim(Math.PI * 1.18),
  /** At the axis, in the Ranger's cockpit, docked at the hub. */
  dock: [AXIS[0] + 0.8, AXIS[1]] as Pt,
}

/**
 * A part's own frame, given where it starts (from O): converts points from
 * O into the part's cells (its entry at (-0.5, 0)), and gives the axis and
 * the ring in those cells.
 */
export function stationFrame(entry: Pt) {
  const local = (q: Pt): Pt => [q[0] - entry[0] - 0.5, q[1] - entry[1]]
  return {
    local,
    axis: local(AXIS),
    rim: (a: number, h = 0): Pt => local(onRim(a, h)),
    ball: (a: number): Pt => local(ballOnRim(a)),
    /** The exit for a part that ends at `q` (from O): the next part's entry cell, relative to this one's. */
    exit: (q: Pt): Pt => {
      const l = local(q)
      return [l[0] + 0.5, l[1]]
    },
  }
}

/**
 * Draw something standing on the ground at angle `a`, in its own upright
 * cells: (0, 0) is the ground under it, x runs along the ground in the
 * direction of travel, y is "down" into the ground. `origin` is the axis in
 * the caller's cells.
 */
export function standOnRim(p: p5, k: number, axis: Pt, a: number, draw: () => void): void {
  const g = [axis[0] + RIM_R * Math.cos(a), axis[1] + RIM_R * Math.sin(a)]
  p.push()
  p.translate(g[0] * k, g[1] * k)
  // Upright means the local "down" (y) points away from the axis.
  p.rotate(a - Math.PI / 2)
  draw()
  p.pop()
}

/** A point given in a rim-standing frame at angle `a` (x along, y down), in the caller's cells. */
export function fromRim(axis: Pt, a: number, x: number, y: number): Pt {
  const gx = axis[0] + RIM_R * Math.cos(a)
  const gy = axis[1] + RIM_R * Math.sin(a)
  const r = a - Math.PI / 2
  return [gx + x * Math.cos(r) - y * Math.sin(r), gy + x * Math.sin(r) + y * Math.cos(r)]
}
