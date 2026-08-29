import { registry as workshopRegistry } from '../../contraptions/workshop'
import { BELT_V, PART, PART_Y, SHEAVE_Y } from '../../contraptions/workshop/shop'
import { LOOP } from '../../core/constants'
import type { CatalogEntry, Composition, Options } from '../../core/composition'
import { solid } from '../../core/draw'
import { themeByName, type Theme } from '../../core/themes'
import { SHOP_RIDE } from './elevator'
import { buildLaneWorld, laneCatalog, type WorldSpec } from './laneworld'

/**
 * Workshop: one shop floor, one line through every bench of it.
 *
 * The same snake as cascade at twice the tempo — a part leaves the feeder
 * every half loop, so the line is always loaded and every bench works once per
 * part rather than once per loop. `chains` says how much of the line is
 * machinery; the rest is belt.
 *
 * The part is the world's, not the benches'. See `laneworld.ts`.
 */
export const WORKSHOP: WorldSpec = {
  catalog: workshopRegistry,
  /** A part every half loop: a shop line is busy or it is not a shop line. */
  emit: 0.5,
  floorY: PART_Y,
  rollV: BELT_V,
  sheaveY: SHEAVE_Y,
  tokenSize: PART,
  ride: SHOP_RIDE,
  /** Every bench's own clock is one part long, so it acts once per part. */
  period: LOOP / 2,
  names: {
    feeders: ['hopper', 'hoist', 'tipper'],
    endings: ['bin', 'bell', 'lamp'],
    filler: 'belt',
    lift: 'elevator',
    well: 'well',
  },
  state: (_role, ctx, color) => ({
    line: {
      in: ctx.in !== null,
      out: ctx.out !== null,
      color,
      along: 1,
      drop: ctx.out === 'S',
      catch: ctx.in === 'N',
      ride: ctx.ride,
    },
  }),
  token: (p, size, ink, weight, color, x, y) => {
    solid(p, ink, weight, color)
    p.rect(x, y, PART * size, PART * size, size * 0.02)
  },
}

export const buildWorkshop = (options: Options, canvas: number): Composition =>
  buildLaneWorld(options, canvas, WORKSHOP)

export const workshopCatalog = (theme: Theme | string): CatalogEntry[] =>
  laneCatalog(WORKSHOP, typeof theme === 'string' ? themeByName(theme) : theme)
