import { ART_INSET, LOOP, SEAM_REACH } from '../../core/constants'
import type { Composition, Options, Overlay } from '../../core/composition'
import { makeRng, type Rng } from '../../core/rng'
import { themeByName, type Theme } from '../../core/themes'
import type { Cell, Contraption, Instance, Wire } from '../../core/types'

/**
 * Shared floor for the three Goldberg worlds.
 *
 * These worlds do not lay out a grid, they staff one: every cell is a beat in
 * something, and a beat needs the cell east of it and the cell below it to
 * exist and be the same size. That is a floor, not a layout — so the world
 * builds its own square one and the Layout dial stays out of it. Consulting
 * `quads` or `bricks` here was a lottery: on an offset course no two rows
 * share a column, so the snake collapsed to a single row, and a piece that
 * should have covered the page came out a thumbnail adrift in it.
 *
 * Cascade, workshop and circus each decide who stands where. This file opens
 * the floor, hands out the rows, and builds instances.
 */

export const posKey = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`

export const isUnit = (c: Contraption<unknown>): boolean => !c.span || (c.span[0] === 1 && c.span[1] === 1)

export function filteredPool(options: Options, catalog: Contraption<unknown>[]): Contraption<unknown>[] {
  if (options.solo) {
    const one = catalog.find((c) => c.name === options.solo)
    if (one) return [one]
  }
  if (options.tag) {
    const tagged = catalog.filter((c) => c.tags?.includes(options.tag!))
    if (tagged.length) return tagged
  }
  return catalog
}

export function adjacent(a: Cell, b: Cell): boolean {
  if (a.size !== b.size) return false
  return Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - a.size) < 1
}

export interface Floor {
  theme: Theme
  rng: Rng
  cells: Cell[]
  /** The same cells as courses: `rows[r][c]`, north to south, west to east. */
  rows: Cell[][]
  at: Map<string, Cell>
  claimed: Set<Cell>
  instances: Instance[]
  singles: Contraption<unknown>[]
  spanning: Contraption<unknown>[]
  place: (c: Contraption<unknown>, cell: Cell, seed: string, extra?: Record<string, unknown>) => Instance
}

/** Cells across the floor. Below three there is nothing to snake through. */
export const floorSize = (options: Options): number => Math.max(3, Math.round(options.res))

/**
 * A square floor of equal cells filling the art area. Whole-pixel cells, so a
 * rail drawn on one lands on a whole pixel; the leftover is the margin, which
 * is the same on all four sides by construction.
 */
export function openFloor(
  options: Options,
  canvas: number,
  catalog: Contraption<unknown>[],
  opts: { mirror?: boolean } = {},
): Floor {
  const theme = themeByName(options.theme)
  const rng = makeRng(options.seed)
  const k = floorSize(options)
  const size = Math.floor((canvas * ART_INSET) / k)
  const area = size * k
  const origin = Math.round((canvas - area) / 2)

  const rows: Cell[][] = []
  const cells: Cell[] = []
  let index = 0
  for (let row = 0; row < k; row++) {
    const course: Cell[] = []
    for (let col = 0; col < k; col++) {
      const c: Cell = {
        x: origin + col * size + size / 2,
        y: origin + row * size + size / 2,
        size,
        w: size,
        h: size,
        col,
        row,
        index: index++,
        depth: 0,
      }
      course.push(c)
      cells.push(c)
    }
    rows.push(course)
  }

  const candidates = filteredPool(options, catalog)
  const singles = candidates.filter(isUnit)
  const spanning = candidates.filter((c) => !isUnit(c))
  const at = new Map<string, Cell>()
  for (const cell of cells) at.set(posKey(cell.x, cell.y), cell)
  const claimed = new Set<Cell>()
  const instances: Instance[] = []
  const allowMirror = opts.mirror !== false

  const place = (
    contraption: Contraption<unknown>,
    cell: Cell,
    seed: string,
    extra?: Record<string, unknown>,
  ): Instance => {
    const cellRng = rng.fork(seed)
    const rotations = contraption.rotations ?? (cell.w === cell.h ? [0, 1, 2, 3] : [0, 2])
    const period = contraption.period ?? LOOP
    const phase = cellRng.int(0, period)
    const state = contraption.setup({
      rng: cellRng,
      size: cell.size,
      w: cell.w,
      h: cell.h,
      theme,
      cell,
      color: cellRng.pick(theme.colors),
    }) as Record<string, unknown>
    if (extra) Object.assign(state, extra)
    const instance: Instance = {
      contraption,
      state,
      cell,
      angle: (cellRng.pick(rotations) * Math.PI) / 2,
      mirror: !allowMirror || contraption.mirror === false ? 1 : cellRng.sign(),
      phase,
      period,
      fireFrame: Math.round(((contraption.fireAt ?? 0) * period - phase + LOOP * 4) % LOOP),
    }
    instances.push(instance)
    return instance
  }

  return { theme, rng, cells, rows, at, claimed, instances, singles, spanning, place }
}

export function claimBlock(floor: Floor, anchor: Cell, w: number, h: number): Cell[] | null {
  const block: Cell[] = []
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      const found = floor.at.get(posKey(anchor.x + dx * anchor.size, anchor.y + dy * anchor.size))
      if (!found || found.size !== anchor.size || floor.claimed.has(found)) return null
      block.push(found)
    }
  }
  return block
}

export function placeSpans(floor: Floor, chance: number): void {
  if (!floor.spanning.length) return
  for (const anchor of floor.rng.fork('spans').shuffle(floor.cells)) {
    if (floor.claimed.has(anchor)) continue
    const spanRng = floor.rng.fork(`span:${anchor.index}`)
    if (!spanRng.bool(chance)) continue
    const contraption = spanRng.weighted(floor.spanning, (c) => c.weight ?? 1)
    const [w, h] = contraption.span!
    const block = claimBlock(floor, anchor, w, h)
    if (!block) continue
    for (const cell of block) floor.claimed.add(cell)
    const merged: Cell = {
      x: anchor.x + ((w - 1) * anchor.size) / 2,
      y: anchor.y + ((h - 1) * anchor.size) / 2,
      size: anchor.size,
      w: w * anchor.size,
      h: h * anchor.size,
      col: anchor.col,
      row: anchor.row,
      index: anchor.index,
      depth: anchor.depth,
    }
    floor.place(contraption, merged, `cell:${anchor.index}`)
  }
}

export const leftoverCells = (floor: Floor): Cell[] =>
  floor.cells.filter((c) => !floor.claimed.has(c) && c.w === c.size && c.h === c.size)

/** A contiguous slice, centred, so thinning a floor does not split it. */
export function takeBlock<T>(list: T[], n: number): T[] {
  if (n <= 0) return []
  if (n >= list.length) return list
  const start = Math.floor((list.length - n) / 2)
  return list.slice(start, start + n)
}

/**
 * The courses the long chain runs through, and the ones left to stand on
 * their own.
 *
 * `chains` is how much of the floor is one machine rather than many: at 0 the
 * floor is all independent sentences, at 1 the whole floor is a single snake.
 * Either way every course is staffed — an empty course is dead paper, and a
 * dial that empties the page is not a dial.
 */
export function programmeBand(rows: Cell[][], chains: number): { band: Cell[][]; rest: Cell[][] } {
  const d = Math.max(0, Math.min(1, chains))
  if (d <= 0 || rows.length < 2) return { band: [], rest: rows }
  const want = Math.max(2, Math.min(rows.length, Math.round(rows.length * d)))
  const band = takeBlock(rows, want)
  const first = rows.indexOf(band[0])
  return { band, rest: [...rows.slice(0, first), ...rows.slice(first + band.length)] }
}

/**
 * Serpentine through consecutive rows: east along the first, drop into the
 * cell below its east end, west along the next, drop, east, … so the path
 * is one sentence with real corners.
 */
export function snakeRows(rows: Cell[][]): Cell[] {
  const path: Cell[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = i % 2 === 0 ? rows[i] : [...rows[i]].reverse()
    path.push(...row)
  }
  return path
}

/**
 * A cell that shares an elevator shaft with the one above or below draws the
 * car across the seam, so both halves agree and nothing is cut. Only the
 * composer knows the neighbour is the same machine, so only the composer can
 * say the ink may cross.
 */
function grantSeams(floor: Floor): void {
  for (const inst of floor.instances) {
    const state = inst.state as {
      ride?: unknown
      flow?: { in?: string | null; out?: string | null }
      line?: { drop?: boolean; catch?: boolean }
    }
    const rides =
      !!state.ride ||
      state.flow?.out === 'S' ||
      state.flow?.in === 'N' ||
      !!state.line?.drop ||
      !!state.line?.catch
    if (rides) inst.reach = SEAM_REACH
  }
}

export function finish(
  options: Options,
  floor: Floor,
  wires: Wire[],
  overlays: Overlay[] = [],
  extras: { showWires?: boolean; wireY?: number } = {},
): Composition {
  grantSeams(floor)
  return {
    options,
    theme: floor.theme,
    cells: floor.cells,
    unit: floor.cells.length ? Math.min(...floor.cells.map((c) => c.size)) : 0,
    instances: floor.instances,
    loop: LOOP,
    used: [...new Set(floor.instances.map((i) => i.contraption.name))].sort(),
    captions: [],
    header: null,
    wires,
    overlays,
    showWires: extras.showWires,
    wireY: extras.wireY,
  }
}
