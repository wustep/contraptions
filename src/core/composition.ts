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
}

export const defaultOptions: Options = {
  seed: '',
  theme: 'okazz',
  layout: 'grid',
  res: 15,
  stroke: 1,
  solo: null,
  tag: null,
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
  }
}

export const strokeWeight = strokeFor
