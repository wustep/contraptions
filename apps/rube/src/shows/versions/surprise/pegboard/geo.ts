import type { Pt } from '../../../../parts'

/**
 * Where everything is, in cells, y down. The board is a grid of pegs a cell apart, 28 across and 12 down, with the
 * frame's middle a little above its own; a pellet always lands in a gap, the middle of four pegs, so the gaps are the
 * whole cells and the pegs the half cells. The launcher stands under the board's middle.
 */
export const COLS = 28
export const ROWS = 12
/** The first peg's column and row: pegs at x = X0, X0 + 1, ... and y = Y0, Y0 + 1, ... */
export const X0 = -(COLS - 1) / 2
export const Y0 = -7.5
export const PEG_R = 0.15

/** Every peg, row by row. */
export const PEGS: readonly Pt[] = (() => {
  const out: Pt[] = []
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) out.push([X0 + i, Y0 + j])
  return out
})()

/** The gaps a pellet may land in: the board's middle, so a burst has the board round it. */
export const GAPS = { x0: -9, x1: 9, y0: -6, y1: 0 }
/** The middle gap, where the surprise lands. */
export const MIDDLE: Pt = [0, -2]

/** The launcher's pivot: the turntable's middle, and the lift under the breech. */
export const PIVOT: Pt = [0, 7.25]
/** Straight up the board: where the launcher points at rest. */
export const HOME = -Math.PI / 2

/** Along the trough, from the pivot forward, cells. */
export const TROUGH = {
  rear: -2.05,
  cap: -1.9,
  muzzle: 3.0,
  width: 0.98,
  /** The channel inside the walls. */
  channel: 0.78,
}
export const PELLET_R = 0.32
export const BLOCK = { length: 0.42, width: 0.66, rest: -0.38, cocked: -1.12, fired: 0.16 }
export const TURNTABLE_R = 1.58
export const PLINTH = 1.86

/** Where the muzzle is with the launcher aimed at `angle`. */
export function muzzle(angle: number, recoil = 0): Pt {
  const r = TROUGH.muzzle - recoil
  return [PIVOT[0] + Math.cos(angle) * r, PIVOT[1] + Math.sin(angle) * r]
}

/** The angle the launcher aims at to land in `p`. */
export function aimAt(p: Pt): number {
  return Math.atan2(p[1] - PIVOT[1], p[0] - PIVOT[0])
}

/** The frame: the board high in it, the launcher under it, 19 cells high. */
export const FRAME = { x: 0, y: 0.4, cells: 19 }
