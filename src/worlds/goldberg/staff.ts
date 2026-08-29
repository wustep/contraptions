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
    let best: Cell[] = []
    let bestN = Infinity
    for (const cell of unused) {
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
 * Keep the longest runs until `chains` of the leftover cells sit on a sentence.
 * The floor is high: even a modest chains setting covers most neighbours, so
 * the piece reads as one machine. `chains === 0` is the explicit "all closed"
 * stop. Isolated cells always become singles.
 */
export function budgetRuns(runs: Cell[][], leftoverCount: number, chains: number): { keep: Cell[][]; singles: Cell[] } {
  const density = Math.max(0, Math.min(1, chains))
  const want = density <= 0 ? 0 : leftoverCount * (0.72 + 0.26 * density)
  const keep: Cell[][] = []
  const singles: Cell[] = []
  let filled = 0
  for (const run of [...runs].sort((a, b) => b.length - a.length)) {
    if (run.length >= 2 && filled < want) {
      keep.push(run)
      filled += run.length
    } else singles.push(...run)
  }
  return { keep, singles }
}

export function finish(options: Options, floor: Floor, wires: Wire[], overlays: Overlay[] = []): Composition {
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
  }
}
