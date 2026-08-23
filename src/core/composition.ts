import { ART_INSET, CANVAS, LOOP } from './constants'
import { layoutByName } from './layouts'
import { registry } from '../contraptions'
import { makeRng } from './rng'
import { themeByName, type Theme } from './themes'
import type { Cell, Contraption, Instance } from './types'

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
  const cells = layout.build({ x: origin, y: origin, area, res: options.res, rng: rng.fork('layout') })

  const candidates = pool(options)
  const instances: Instance[] = cells.map((cell) => {
    const cellRng = rng.fork(`cell:${cell.index}`)
    const contraption = candidates.length === 1
      ? candidates[0]
      : cellRng.weighted(candidates, (c) => c.weight ?? 1)
    const rotations = contraption.rotations ?? [0, 1, 2, 3]
    const period = contraption.period ?? LOOP
    const color = cellRng.pick(theme.colors)
    return {
      contraption,
      state: contraption.setup({ rng: cellRng, size: cell.size, theme, cell, color }),
      cell,
      angle: (cellRng.pick(rotations) * Math.PI) / 2,
      mirror: contraption.mirror === false ? 1 : cellRng.sign(),
      phase: cellRng.int(0, period),
      period,
    }
  })

  return {
    options,
    theme,
    cells,
    instances,
    loop: LOOP,
    used: [...new Set(instances.map((i) => i.contraption.name))].sort(),
    labels: [],
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
  const size = slot * 0.74
  const originX = (CANVAS - area) / 2
  const originY = (CANVAS - rows * slot) / 2

  const cells: Cell[] = []
  const labels: Composition['labels'] = []
  const instances: Instance[] = registry.map((contraption, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const cx = originX + col * slot + slot / 2
    const cy = originY + row * slot + slot / 2 - slot * 0.06
    const cell: Cell = { x: cx, y: cy, size, col, row, index, depth: 0 }
    cells.push(cell)
    labels.push({ x: cx, y: cy + size / 2 + slot * 0.11, text: contraption.label ?? contraption.name })
    const cellRng = rng.fork(`catalog:${contraption.name}`)
    return {
      contraption,
      state: contraption.setup({
        rng: cellRng,
        size,
        theme,
        cell,
        color: cellRng.pick(theme.colors),
      }),
      cell,
      angle: 0,
      mirror: 1,
      phase: 0,
      period: contraption.period ?? LOOP,
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
  }
}

export const strokeWeight = strokeFor
