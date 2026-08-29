import { registry as cascadeRegistry } from '../../contraptions/cascade'
import { LANE_Y, SHEAVE_Y, SPEED, TOKEN } from '../../contraptions/cascade/parts'
import { LOOP } from '../../core/constants'
import type { CatalogEntry, Composition, Options } from '../../core/composition'
import { solid } from '../../core/draw'
import { themeByName, type Theme } from '../../core/themes'
import { CASCADE_RIDE } from './elevator'
import { buildLaneWorld, laneCatalog, type WorldSpec } from './laneworld'

/**
 * Cascade: one ball, one snake, one sentence.
 *
 * The whole grid is the machine — east along a row, down an elevator at its
 * end, west along the next — from a feeder that lets a ball go once a loop to
 * an ending that keeps it. Every cell is a beat; `chains` says how many of
 * them are working machinery and how many are plain rail.
 *
 * The ball is the world's, not the machines'. See `laneworld.ts`.
 */
export const CASCADE: WorldSpec = {
  catalog: cascadeRegistry,
  /** One ball a loop: long enough for a beat to read before the next arrives. */
  emit: 1,
  floorY: LANE_Y,
  rollV: SPEED,
  sheaveY: SHEAVE_Y,
  tokenSize: TOKEN,
  ride: CASCADE_RIDE,
  period: LOOP,
  names: {
    feeders: ['hopper', 'knocker', 'tipper', 'fuse'],
    endings: ['bell', 'lamp', 'flag', 'toaster', 'balloon', 'jack'],
    filler: 'rail',
    lift: 'lift',
    well: 'well',
  },
  state: (_role, ctx, color) => ({
    flow: { in: ctx.in, out: ctx.out, color },
    ride: ctx.ride ? { ...ctx.ride, at: 0 } : undefined,
  }),
  token: (p, size, ink, weight, color, x, y) => {
    solid(p, ink, weight, color)
    p.circle(x, y, TOKEN * size)
  },
}

export const buildCascade = (options: Options, canvas: number): Composition =>
  buildLaneWorld(options, canvas, CASCADE)

export const cascadeCatalog = (theme: Theme | string): CatalogEntry[] =>
  laneCatalog(CASCADE, typeof theme === 'string' ? themeByName(theme) : theme)
