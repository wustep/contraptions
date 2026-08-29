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
 * Running bond: every other course slides half a cell sideways. A brick that
 * hung off the end used to be kept — its centre was inside the art area even
 * though half of it was not — and the machine in it was drawn half off the
 * page. A bricklayer with no half-bricks recesses the course instead, so the
 * offset rows are one brick shorter and the wall keeps a straight edge.
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
      const shift = offset ? size / 2 : 0
      for (let col = 0; col < count; col++) {
        cells.push(
          cell(x + col * size + size / 2 + shift, y + row * size + size / 2, size, col, row, index++),
        )
      }
    }
    return cells
  },
}

/**
 * Recursive quartering, in two tiers exactly one octave apart. Big slow
 * machines next to clusters of small fast ones is the thesis; three tiers is
 * two artworks on one sheet, and that is what the old `maxDepth - 2` produced
 * — a 470px hall with a 60px toy beside it.
 *
 * The big cells cluster rather than sprinkle: each parent of the big tier
 * draws a tempo for its quarter, so a slow pocket keeps most of its large
 * cells and a fast field keeps almost none. A flat keep-rate reads as a grid
 * with holes in it.
 */
const quads: Layout = {
  name: 'quads',
  label: 'Quads',
  note: 'recursive subdivision',
  build({ x, y, area, res, rng }) {
    const maxDepth = Math.max(1, Math.min(5, Math.round(Math.log2(res))))
    const minDepth = Math.max(0, maxDepth - 1)
    const cells: Cell[] = []
    let index = 0

    const split = (cx: number, cy: number, size: number, depth: number, keep: number) => {
      if (depth === maxDepth || (depth === minDepth && rng.bool(keep))) {
        const col = Math.floor((cx - x) / (area / res))
        const row = Math.floor((cy - y) / (area / res))
        cells.push(cell(cx + size / 2, cy + size / 2, size, col, row, index++, depth))
        return
      }
      const h = size / 2
      const childKeep = depth + 1 === minDepth ? (rng.bool(0.35) ? 0.85 : 0.08) : 0
      split(cx, cy, h, depth + 1, childKeep)
      split(cx + h, cy, h, depth + 1, childKeep)
      split(cx, cy + h, h, depth + 1, childKeep)
      split(cx + h, cy + h, h, depth + 1, childKeep)
    }

    split(x, y, area, 0, 0)
    return cells
  },
}

/**
 * Vertical bands of differing width, one unit or two. Each band is filled
 * with squares at its own scale, so the piece reads as columns of different
 * tempos — and the widest column is still within an octave of the narrowest,
 * so it reads as a column and not as a poster pasted over the page.
 */
const bands: Layout = {
  name: 'bands',
  label: 'Bands',
  note: 'columns at mixed scales',
  build({ x, y, area, res, rng }) {
    const unit = area / res
    const widths: number[] = []
    let remaining = res
    while (remaining > 0) {
      const options = [1, 2].filter((k) => k <= remaining)
      // Bias toward narrow bands so wide ones stay a punctuation mark.
      widths.push(rng.weighted(options, (k) => 1 / (k * k)))
      remaining -= widths[widths.length - 1]
    }

    const cells: Cell[] = []
    let index = 0
    let offset = 0
    widths.forEach((k, col) => {
      const size = unit * k
      const rows = Math.floor(res / k)
      for (let row = 0; row < rows; row++) {
        cells.push(
          cell(x + offset * unit + size / 2, y + row * size + size / 2, size, col, row, index++),
        )
      }
      // An odd res leaves a strip under a wide band. Lay it as a course of
      // unit cells so every band still bottoms out on the same ground line.
      for (let i = 0; i < res % k; i++) {
        cells.push(
          cell(x + (offset + i) * unit + unit / 2, y + rows * size + unit / 2, unit, col, rows, index++),
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
