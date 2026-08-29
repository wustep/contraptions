import { ART_INSET, LOOP } from '../../core/constants'
import type { Composition, Options, Overlay } from '../../core/composition'
import { layoutByName } from '../../core/layouts'
import { makeRng, type Rng } from '../../core/rng'
import { themeByName, type Theme } from '../../core/themes'
import type { Cell, Contraption, Instance, Wire } from '../../core/types'

/**
 * Shared grid scaffolding for the Goldberg composers. Cascade and workshop
 * each decide how leftover cells are staffed and how tokens travel; this file
 * only opens the floor, places spans, and builds instances.
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

export function neighbors(cell: Cell, pool: Iterable<Cell>): Cell[] {
  const out: Cell[] = []
  for (const n of pool) {
    if (n !== cell && adjacent(cell, n)) out.push(n)
  }
  return out
}

export interface Floor {
  theme: Theme
  rng: Rng
  cells: Cell[]
  at: Map<string, Cell>
  claimed: Set<Cell>
  instances: Instance[]
  singles: Contraption<unknown>[]
  spanning: Contraption<unknown>[]
  place: (c: Contraption<unknown>, cell: Cell, seed: string, extra?: Record<string, unknown>) => Instance
}

export function openFloor(
  options: Options,
  canvas: number,
  catalog: Contraption<unknown>[],
  opts: { mirror?: boolean } = {},
): Floor {
  const theme = themeByName(options.theme)
  const layout = layoutByName(options.layout)
  const rng = makeRng(options.seed)
  const area = Math.floor((canvas * ART_INSET) / options.res) * options.res
  const origin = Math.round((canvas - area) / 2)
  const cells = layout.build({
    x: origin,
    y: origin,
    area,
    res: options.res,
    rng: rng.fork('layout'),
  })
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

  return { theme, rng, cells, at, claimed, instances, singles, spanning, place }
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

/** Drop the outermost ring so a run cannot start or end on the art edge. */
export function insetRing(cells: Cell[]): Cell[] {
  const units = cells.filter((c) => c.w === c.size && c.h === c.size)
  if (units.length < 9) return units
  const left = Math.min(...units.map((c) => c.x - c.w / 2))
  const right = Math.max(...units.map((c) => c.x + c.w / 2))
  const top = Math.min(...units.map((c) => c.y - c.h / 2))
  const bottom = Math.max(...units.map((c) => c.y + c.h / 2))
  return units.filter((c) => {
    const pad = c.size * 0.55
    return (
      c.x - c.w / 2 > left + pad &&
      c.x + c.w / 2 < right - pad &&
      c.y - c.h / 2 > top + pad &&
      c.y + c.h / 2 < bottom - pad
    )
  })
}

/** Equal-size neighbours grouped into eastbound rows. */
export function eastRows(cells: Cell[]): Cell[][] {
  const groups = new Map<string, Cell[]>()
  for (const cell of cells) {
    const key = `${Math.round(cell.y)}|${Math.round(cell.size * 1000)}`
    const g = groups.get(key) ?? []
    g.push(cell)
    groups.set(key, g)
  }
  const rows: Cell[][] = []
  for (const group of groups.values()) {
    group.sort((a, b) => a.x - b.x)
    let cur: Cell[] = [group[0]]
    for (let i = 1; i < group.length; i++) {
      if (Math.abs(group[i].x - cur[cur.length - 1].x - group[i].size) < 1) cur.push(group[i])
      else {
        rows.push(cur)
        cur = [group[i]]
      }
    }
    rows.push(cur)
  }
  rows.sort((a, b) => a[0].y - b[0].y)
  return rows
}

/** A contiguous slice, centred, so thinning a floor does not split it. */
export function takeBlock<T>(list: T[], n: number): T[] {
  if (n <= 0) return []
  if (n >= list.length) return list
  const start = Math.floor((list.length - n) / 2)
  return list.slice(start, start + n)
}

/**
 * Eastbound sentences to staff. A high-res floor keeps a one-cell inset and
 * skips a row so the lines stay readable. A low-res floor is already a few
 * large cells: using the inset ring and then dropping a row bunches the
 * machine in the upper-left. There the whole leftover grid is the block.
 */
export function staffedRows(
  cells: Cell[],
  options: Options,
  density: number,
  opts: { skipFrom?: number } = {},
): Cell[][] {
  const low = options.res < 12
  const units = cells.filter((c) => c.w === c.size && c.h === c.size)
  const interior = low ? units : insetRing(units)
  const rows = eastRows(interior).filter((row) => row.length >= 3)
  const stride = options.res >= (opts.skipFrom ?? 12) ? 2 : 1
  const spaced = rows.filter((_, i) => i % stride === 0)
  if (density <= 0) return []
  const frac = low ? 1 : 0.45 + 0.55 * density
  return takeBlock(spaced, Math.max(1, Math.round(spaced.length * frac)))
}

/** Courses that sit on consecutive y — a missing band breaks the drop. */
export function stackedBands(rows: Cell[][]): Cell[][][] {
  const bands: Cell[][][] = []
  let cur: Cell[][] = []
  for (const row of rows) {
    if (cur.length) {
      const above = cur[cur.length - 1][0]
      if (Math.abs(row[0].y - above.y - above.size) > 2) {
        bands.push(cur)
        cur = []
      }
    }
    cur.push(row)
  }
  if (cur.length) bands.push(cur)
  return bands
}

/**
 * The longest run of x-centres every row shares. A south step from the
 * east (or west) end only lands on the next sentence if that column exists
 * on both courses — bricks are offset, so they have no such run.
 */
export function sharedColumns(rows: Cell[][]): Cell[][] {
  if (!rows.length) return []
  const size = rows[0][0].size
  const sets = rows.map((row) => new Set(row.map((c) => Math.round(c.x))))
  const xs = [...sets[0]].filter((x) => sets.every((s) => s.has(x))).sort((a, b) => a - b)
  let best: number[] = []
  let run: number[] = []
  for (const x of xs) {
    if (run.length && Math.abs(x - run[run.length - 1] - size) > 2) {
      if (run.length > best.length) best = run
      run = [x]
    } else run.push(x)
  }
  if (run.length > best.length) best = run
  if (best.length < 2) return []
  const want = new Set(best)
  return rows.map((row) => row.filter((c) => want.has(Math.round(c.x))))
}

/** Same-size cells stacked south, for a band that is a single column. */
export function southCols(cells: Cell[]): Cell[][] {
  const groups = new Map<string, Cell[]>()
  for (const cell of cells) {
    const key = `${Math.round(cell.x)}|${Math.round(cell.size * 1000)}`
    const g = groups.get(key) ?? []
    g.push(cell)
    groups.set(key, g)
  }
  const cols: Cell[][] = []
  for (const group of groups.values()) {
    group.sort((a, b) => a.y - b.y)
    let cur: Cell[] = [group[0]]
    for (let i = 1; i < group.length; i++) {
      if (Math.abs(group[i].y - cur[cur.length - 1].y - group[i].size) < 1) cur.push(group[i])
      else {
        cols.push(cur)
        cur = [group[i]]
      }
    }
    cols.push(cur)
  }
  return cols.sort((a, b) => b.length - a.length)
}

const cellsIn = (block: Cell[][]) => block.reduce((n, row) => n + row.length, 0)

/**
 * A rectangle of leftover cells the snake can actually traverse: consecutive
 * courses, shared columns, no skip-row. Offset bricks have no south neighbour,
 * so they collapse to the longest single row. A lone band becomes a column.
 */
export function staffedBlock(cells: Cell[], options: Options, density: number): Cell[][] {
  const low = options.res < 12
  const units = cells.filter((c) => c.w === c.size && c.h === c.size)
  const interior = low ? units : insetRing(units)
  if (density <= 0 || !interior.length) return []
  const frac = low ? 1 : 0.65 + 0.35 * density

  const candidates: Cell[][][] = []
  const rows = eastRows(interior).filter((row) => row.length >= 2)
  for (const band of stackedBands(rows)) {
    const n = Math.min(band.length, Math.max(1, Math.round(band.length * frac)))
    for (let h = n; h >= 1; h--) {
      const slice = takeBlock(band, h)
      if (h === 1) {
        if (slice[0].length >= 2) candidates.push(slice)
        break
      }
      const clipped = sharedColumns(slice)
      if (clipped.length === h && clipped.every((r) => r.length >= 2)) {
        candidates.push(clipped)
        break
      }
    }
  }

  const col = southCols(interior).find((c) => c.length >= 2)
  if (col) {
    const n = Math.min(col.length, Math.max(2, Math.round(col.length * frac)))
    candidates.push(takeBlock(col, n).map((c) => [c]))
  }

  if (!candidates.length) return []
  candidates.sort((a, b) => {
    const byCells = cellsIn(b) - cellsIn(a)
    if (byCells) return byCells
    return b.length - a.length
  })
  return candidates[0]
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
 * Walk every leftover cell into a run. Starts at a dead-end (fewest unused
 * neighbours) and prefers to keep going straight, so a corridor becomes one
 * sentence instead of a pile of pairs.
 */
export function coverRuns(cells: Cell[], rng: Rng, neverUp = false): Cell[][] {
  const unused = new Set(cells)
  const runs: Cell[][] = []

  const nexts = (head: Cell): Cell[] => {
    let ns = neighbors(head, unused)
    if (neverUp) ns = ns.filter((n) => n.y >= head.y - 1)
    return ns
  }

  while (unused.size) {
    // A cell whose only unused neighbour is north has zero legal nexts
    // under neverUp. If we claim it first, the cell above can never drop
    // into it and the floor fills with leftover singles. Grow from cells
    // that can actually take a step; true isolates go last.
    const growable = [...unused].filter((c) => nexts(c).length > 0)
    const pool = growable.length ? growable : [...unused]
    let best: Cell[] = []
    let bestN = Infinity
    for (const cell of pool) {
      const n = nexts(cell).length
      if (n < bestN) {
        bestN = n
        best = [cell]
      } else if (n === bestN) best.push(cell)
    }
    const start = rng.pick(best)
    const path = [start]
    unused.delete(start)
    while (true) {
      const head = path[path.length - 1]
      const cands = nexts(head)
      if (!cands.length) break
      let next: Cell | undefined
      if (path.length >= 2) {
        const prev = path[path.length - 2]
        const dx = head.x - prev.x
        const dy = head.y - prev.y
        next = cands.find((n) => Math.abs(n.x - head.x - dx) < 1 && Math.abs(n.y - head.y - dy) < 1)
      }
      if (!next) next = rng.pick(cands)
      path.push(next)
      unused.delete(next)
    }
    runs.push(path)
  }
  return runs
}

/**
 * Every leftover neighbour-run becomes a sentence. Isolated cells are the
 * only singles. `chains === 0` is the explicit all-closed stop; otherwise
 * leaving a connected corridor as leftovers is what made the grid read as
 * a pile of parts.
 */
export function budgetRuns(runs: Cell[][], _leftoverCount: number, chains: number): { keep: Cell[][]; singles: Cell[] } {
  if (chains <= 0) return { keep: [], singles: runs.flat() }
  const keep: Cell[][] = []
  const singles: Cell[] = []
  for (const run of runs) {
    if (run.length >= 2) keep.push(run)
    else singles.push(...run)
  }
  return { keep, singles }
}

export function finish(
  options: Options,
  floor: Floor,
  wires: Wire[],
  overlays: Overlay[] = [],
  extras: { showWires?: boolean } = {},
): Composition {
  return {
    options,
    theme: floor.theme,
    cells: floor.cells,
    instances: floor.instances,
    loop: LOOP,
    used: [...new Set(floor.instances.map((i) => i.contraption.name))].sort(),
    captions: [],
    header: null,
    wires,
    overlays,
    showWires: extras.showWires,
  }
}
