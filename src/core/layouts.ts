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
): Cell => ({ x, y, size, col, row, index, depth })

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

/** Running bond: every other row slides half a cell sideways. */
const bricks: Layout = {
  name: 'bricks',
  label: 'Bricks',
  note: 'offset courses',
  build({ x, y, area, res }) {
    const size = area / res
    const cells: Cell[] = []
    let index = 0
    for (let row = 0; row < res; row++) {
      const shift = row % 2 === 0 ? 0 : -size / 2
      for (let col = 0; col <= res; col++) {
        const cx = x + col * size + size / 2 + shift
        if (cx - size / 2 >= x + area || cx + size / 2 <= x) continue
        cells.push(cell(cx, y + row * size + size / 2, size, col, row, index++))
      }
    }
    return cells
  },
}

/**
 * Recursive quartering. Produces a mix of cell sizes, so big slow machines sit
 * next to clusters of small fast ones.
 */
const quads: Layout = {
  name: 'quads',
  label: 'Quads',
  note: 'recursive subdivision',
  build({ x, y, area, res, rng }) {
    const maxDepth = Math.max(1, Math.min(5, Math.round(Math.log2(res))))
    const minDepth = Math.max(1, maxDepth - 2)
    const cells: Cell[] = []
    let index = 0

    const split = (cx: number, cy: number, size: number, depth: number) => {
      const shouldSplit =
        depth < minDepth || (depth < maxDepth && rng.bool(0.62 - depth * 0.05))
      if (!shouldSplit) {
        const col = Math.floor((cx - x) / (area / res))
        const row = Math.floor((cy - y) / (area / res))
        cells.push(cell(cx + size / 2, cy + size / 2, size, col, row, index++, depth))
        return
      }
      const h = size / 2
      split(cx, cy, h, depth + 1)
      split(cx + h, cy, h, depth + 1)
      split(cx, cy + h, h, depth + 1)
      split(cx + h, cy + h, h, depth + 1)
    }

    split(x, y, area, 0)
    return cells
  },
}

/**
 * Vertical bands of differing width. Each band is filled with squares at its
 * own scale, so the piece reads as columns of different tempos.
 */
const bands: Layout = {
  name: 'bands',
  label: 'Bands',
  note: 'columns at mixed scales',
  build({ x, y, area, res, rng }) {
    const unit = area / res
    const allowed = [1, 2, 3, 4].filter((k) => res % k === 0)
    const widths: number[] = []
    let remaining = res
    while (remaining > 0) {
      const options = allowed.filter((k) => k <= remaining && remaining % k === 0)
      // Bias toward narrow bands so wide ones stay a punctuation mark.
      widths.push(rng.weighted(options, (k) => 1 / (k * k)))
      remaining -= widths[widths.length - 1]
    }

    const cells: Cell[] = []
    let index = 0
    let offset = 0
    widths.forEach((k, col) => {
      const size = unit * k
      const rows = res / k
      for (let row = 0; row < rows; row++) {
        cells.push(
          cell(x + offset * unit + size / 2, y + row * size + size / 2, size, col, row, index++),
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
