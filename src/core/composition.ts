import { ART_INSET, CANVAS, LOOP } from './constants'
import { layoutByName } from './layouts'
import { registry } from '../contraptions'
import { makeRng } from './rng'
import { themeByName, type Theme } from './themes'
import type { Cell, Contraption, Instance, Wire } from './types'
import { wire } from './wiring'

export interface Options {
  seed: string
  theme: string
  layout: string
  /** Cells across the art area. */
  res: number
  /** Multiplier on the computed stroke weight. */
  stroke: number
  /** Restrict the piece to a single contraption, for inspection. */
  solo: string | null
  /** Restrict the pool to contraptions carrying this tag. */
  tag: string | null
  /** Show one labelled instance of every contraption instead of a composition. */
  catalog: boolean
  /** How eagerly to place multi-cell machines, 0..1. */
  spans: number
  /** How much of the grid to wire into firing chains, 0..1. */
  chains: number
}

export const defaultOptions: Options = {
  seed: '',
  theme: 'okazz',
  layout: 'grid',
  res: 15,
  stroke: 1,
  solo: null,
  tag: null,
  catalog: false,
  spans: 0.5,
  chains: 0.5,
}

export interface Composition {
  options: Options
  theme: Theme
  cells: Cell[]
  instances: Instance[]
  /** Frames for the whole piece to return to its starting state. */
  loop: number
  /** Distinct contraptions actually used, by name. */
  used: string[]
  /** Caption positions, populated in catalog mode. */
  labels: { x: number; y: number; text: string }[]
  /** Visible links between machines that fire in sequence. */
  wires: Wire[]
}

/**
 * Base stroke weight for a cell. Tuned so a 15x15 grid on a 900px canvas lands
 * on 2px, matching the reference sketch, and stays legible as cells shrink.
 */
const strokeFor = (size: number, theme: Theme, mult: number): number =>
  Math.max(0.75, size * 0.037) * (theme.weight ?? 1) * mult

function pool(options: Options): Contraption<unknown>[] {
  if (options.solo) {
    const one = registry.find((c) => c.name === options.solo)
    if (one) return [one]
  }
  if (options.tag) {
    const tagged = registry.filter((c) => c.tags?.includes(options.tag!))
    if (tagged.length) return tagged
  }
  return registry
}

export function build(options: Options): Composition {
  if (options.catalog) return buildCatalog(options)

  const theme = themeByName(options.theme)
  const layout = layoutByName(options.layout)
  const rng = makeRng(options.seed)

  const area = CANVAS * ART_INSET
  const origin = (CANVAS - area) / 2
  const cells = layout.build({
    x: origin,
    y: origin,
    area,
    res: options.res,
    rng: rng.fork('layout'),
  })

  const candidates = pool(options)
  const singles = candidates.filter((c) => !c.span || (c.span[0] === 1 && c.span[1] === 1))
  const spanning = candidates.filter((c) => c.span && (c.span[0] > 1 || c.span[1] > 1))

  const at = new Map<string, Cell>()
  const posKey = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`
  for (const cell of cells) at.set(posKey(cell.x, cell.y), cell)

  const claimed = new Set<Cell>()
  const instances: Instance[] = []

  const place = (contraption: Contraption<unknown>, cell: Cell, seed: string) => {
    const cellRng = rng.fork(seed)
    const rotations = contraption.rotations ?? (cell.w === cell.h ? [0, 1, 2, 3] : [0, 2])
    const period = contraption.period ?? LOOP
    const phase = cellRng.int(0, period)
    instances.push({
      contraption,
      state: contraption.setup({
        rng: cellRng,
        size: cell.size,
        w: cell.w,
        h: cell.h,
        theme,
        cell,
        color: cellRng.pick(theme.colors),
      }),
      cell,
      angle: (cellRng.pick(rotations) * Math.PI) / 2,
      mirror: contraption.mirror === false ? 1 : cellRng.sign(),
      phase,
      period,
      fireFrame: Math.round(((contraption.fireAt ?? 0) * period - phase + LOOP * 4) % LOOP),
    })
  }

  /**
   * Try to claim a w x h block of same-sized free cells with `anchor` at its
   * top-left. Layouts whose rows do not line up (bricks) simply fail here and
   * fall back to single-cell machines.
   */
  const claimBlock = (anchor: Cell, w: number, h: number): Cell[] | null => {
    const block: Cell[] = []
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const found = at.get(posKey(anchor.x + dx * anchor.size, anchor.y + dy * anchor.size))
        if (!found || found.size !== anchor.size || claimed.has(found)) return null
        block.push(found)
      }
    }
    return block
  }

  // Soloing a multi-cell machine leaves nothing for the second pass, so pack
  // the grid with it instead of sprinkling.
  const spanChance = singles.length === 0 ? 1 : options.spans * 0.16

  // Pass one: multi-cell machines, which need contiguous room.
  if (spanning.length) {
    for (const anchor of rng.fork('spans').shuffle(cells)) {
      if (claimed.has(anchor)) continue
      const spanRng = rng.fork(`span:${anchor.index}`)
      if (!spanRng.bool(spanChance)) continue
      const contraption = spanRng.weighted(spanning, (c) => c.weight ?? 1)
      const [w, h] = contraption.span!
      const block = claimBlock(anchor, w, h)
      if (!block) continue
      for (const c of block) claimed.add(c)
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
      place(contraption, merged, `cell:${anchor.index}`)
    }
  }

  // Pass two: everything else fills the leftovers.
  for (const cell of singles.length ? cells : []) {
    if (claimed.has(cell)) continue
    const cellRng = rng.fork(`pick:${cell.index}`)
    const contraption =
      singles.length === 1 ? singles[0] : cellRng.weighted(singles, (c) => c.weight ?? 1)
    place(contraption, cell, `cell:${cell.index}`)
  }

  const wires = wire(instances, rng.fork('wires'), options.chains)

  return {
    options,
    theme,
    cells,
    instances,
    loop: LOOP,
    used: [...new Set(instances.map((i) => i.contraption.name))].sort(),
    labels: [],
    wires,
  }
}

/**
 * One labelled instance of every contraption, at rest orientation and zero
 * phase. This is the working view when you are building a new machine, and the
 * fastest way to see whether the set still hangs together as one language.
 */
function buildCatalog(options: Options): Composition {
  const theme = themeByName(options.theme)
  const rng = makeRng(options.seed)
  const cols = Math.ceil(Math.sqrt(registry.length))
  const rows = Math.ceil(registry.length / cols)
  const area = CANVAS * ART_INSET
  const slot = area / cols
  const box = slot * 0.74
  const originX = (CANVAS - area) / 2
  const originY = (CANVAS - rows * slot) / 2

  const cells: Cell[] = []
  const labels: Composition['labels'] = []
  const instances: Instance[] = registry.map((contraption, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const cx = originX + col * slot + slot / 2
    const cy = originY + row * slot + slot / 2 - slot * 0.06
    // Scale a multi-cell machine down so its whole footprint fits the slot.
    const span = contraption.span ?? [1, 1]
    const size = box / Math.max(span[0], span[1])
    const w = size * span[0]
    const h = size * span[1]
    const cell: Cell = { x: cx, y: cy, size, w, h, col, row, index, depth: 0 }
    cells.push(cell)
    labels.push({ x: cx, y: cy + box / 2 + slot * 0.09, text: contraption.label ?? contraption.name })
    const cellRng = rng.fork(`catalog:${contraption.name}`)
    return {
      contraption,
      state: contraption.setup({
        rng: cellRng,
        size,
        w,
        h,
        theme,
        cell,
        color: cellRng.pick(theme.colors),
      }),
      cell,
      angle: 0,
      mirror: 1,
      phase: 0,
      period: contraption.period ?? LOOP,
      fireFrame: 0,
    }
  })

  return {
    options,
    theme,
    cells,
    instances,
    loop: LOOP,
    used: registry.map((c) => c.name).sort(),
    labels,
    wires: [],
  }
}

export const strokeWeight = strokeFor
