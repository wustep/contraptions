import type p5 from 'p5'
import { outline } from '../../core/draw'
import { FLOOR, LANE_Y, TOKEN } from '../cascade/parts'

/**
 * The shared geometry of a free fall: the three cells a ball drops through
 * when a Rube Goldberg path goes down without an elevator. A chute at the
 * top, tubes in the middle, a catch at the bottom — all built on one tube
 * width, so the walls of one cell run straight into the next.
 *
 * Units are cells, y down. The ball falls down the cell's centre line.
 */

/** Half-width of the tube. A hair wider than the ball. */
export const TUBE_W = TOKEN / 2 + 0.035
/** Radius of the ball's path round the catch's quarter-pipe. */
export const ARC_R = 0.22
/** Radius of the pipe wall the ball rides: it lands on the floor line exactly. */
export const ARC_WALL = ARC_R + (FLOOR - LANE_Y)
/** Cells per loop round the pipe: between a fall and a roll. */
export const ARC_V = 12
/** Spacing of the brackets that fix a tube to the wall. */
const TIE = 0.22

/** Both walls of a tube between two heights. */
export function tubeWalls(p: p5, k: number, ink: string, weight: number, y0: number, y1: number): void {
  outline(p, ink, weight)
  for (const x of [-TUBE_W, TUBE_W]) p.line(x * k, y0 * k, x * k, y1 * k)
}

/** Brackets on both walls every `TIE`, so a long tube reads as fixed to something. */
export function tubeTies(p: p5, k: number, ink: string, weight: number, y0: number, y1: number): void {
  outline(p, ink, weight)
  for (let y = y0 + TIE * 0.5; y < y1 - 0.04; y += TIE) {
    for (const x of [-TUBE_W, TUBE_W]) p.line(x * k, y * k, (x + Math.sign(x) * 0.06) * k, y * k)
  }
}
