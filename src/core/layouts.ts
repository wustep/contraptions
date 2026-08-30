import type { Rng } from './rng'
import type { Cell } from './types'

export interface LayoutArgs {
  /** Top-left corner of the art area, in canvas pixels. */
  x: number
  y: number
  /** Edge length of the (square) art area. */
  area: number
  /** Coarseness dial from the UI, roughly "cells across". */
  res: number
  rng: Rng
}

export interface Layout {
  name: string
  label: string
  note: string
  build(args: LayoutArgs): Cell[]
}

const cell = (
  x: number,
  y: number,
  size: number,
  col: number,
  row: number,
  index: number,
  depth = 0,
): Cell => ({ x, y, size, w: size, h: size, col, row, index, depth })

/** Uniform res x res grid. The default, and what the reference sketch uses. */
const grid: Layout = {
  name: 'grid',
  label: 'Grid',
  note: 'uniform squares',
  build({ x, y, area, res }) {
    const size = area / res
    const cells: Cell[] = []
    let index = 0
    for (let col = 0; col < res; col++) {
      for (let row = 0; row < res; row++) {
        cells.push(
          cell(x + col * size + size / 2, y + row * size + size / 2, size, col, row, index++),
        )
      }
    }
    return cells
  },
}

/**
 * Running bond: every other course slides half a cell sideways and loses a
 * cell to it. Letting the end cells hang half outside the art area instead put
 * a sliced machine against the canvas edge at low res.
 */
const bricks: Layout = {
  name: 'bricks',
  label: 'Bricks',
  note: 'offset courses',
  build({ x, y, area, res }) {
    const size = area / res
    const cells: Cell[] = []
    let index = 0
    for (let row = 0; row < res; row++) {
      const offset = row % 2 === 1
      const count = offset ? res - 1 : res
      for (let col = 0; col < count; col++) {
        const cx = x + col * size + size / 2 + (offset ? size / 2 : 0)
        cells.push(cell(cx, y + row * size + size / 2, size, col, row, index++))
      }
    }
    return cells
  },
}

/**
 * One level of quartering on the res grid: a 2x2 block of units is either one
 * big cell or four small ones. Two sizes at most, and they differ by exactly
 * 2 — four scales at once made the smallest machines read as artifacts beside
 * the largest, and with one pen for the piece a 4:1 cell is a 4:1 line too.
 * An odd res leaves a last column and row of single units.
 */
const quads: Layout = {
  name: 'quads',
  label: 'Quads',
  note: 'recursive subdivision',
  build({ x, y, area, res, rng }) {
    const unit = area / res
    const cells: Cell[] = []
    let index = 0
    const put = (col: number, row: number, k: number) => {
      const size = unit * k
      cells.push(
        cell(x + col * unit + size / 2, y + row * unit + size / 2, size, col, row, index++, 2 - k),
      )
    }
    for (let col = 0; col < res; col += 2) {
      for (let row = 0; row < res; row += 2) {
        if (col + 1 < res && row + 1 < res && rng.bool(0.42)) {
          put(col, row, 2)
          continue
        }
        for (let dc = 0; dc < 2 && col + dc < res; dc++) {
          for (let dr = 0; dr < 2 && row + dr < res; dr++) put(col + dc, row + dr, 1)
        }
      }
    }
    return cells
  },
}

/**
 * Vertical bands one or two units wide, each filled with squares at its own
 * scale, so the piece reads as columns of different tempos. Widths stay in
 * {1, 2} for the same reason quads stops at one level. A wide band whose rows
 * do not divide the height finishes on a course of single units rather than a
 * gap or a clipped cell.
 */
const bands: Layout = {
  name: 'bands',
  label: 'Bands',
  note: 'columns at mixed scales',
  build({ x, y, area, res, rng }) {
    const unit = area / res
    const widths: number[] = []
    for (let remaining = res; remaining > 0; ) {
      // Bias toward narrow bands so a wide one stays a punctuation mark.
      const k = remaining >= 2 && rng.bool(0.36) ? 2 : 1
      widths.push(k)
      remaining -= k
    }

    const cells: Cell[] = []
    let index = 0
    let offset = 0
    widths.forEach((k, col) => {
      const size = unit * k
      const rows = Math.floor(res / k)
      for (let row = 0; row < rows; row++) {
        cells.push(
          cell(x + offset * unit + size / 2, y + row * size + size / 2, size, col, row, index++, 2 - k),
        )
      }
      for (let d = 0; d < (res - rows * k) * k; d++) {
        cells.push(
          cell(x + (offset + d) * unit + unit / 2, y + rows * size + unit / 2, unit, col, rows, index++, 1),
        )
      }
      offset += k
    })
    return cells
  },
}

export const layouts: Layout[] = [grid, bricks, quads, bands]

export const layoutByName = (name: string): Layout =>
  layouts.find((l) => l.name === name) ?? layouts[0]
