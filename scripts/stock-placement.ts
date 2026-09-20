import assert from 'node:assert/strict'
import { makeRng } from '../src/core/rng'
import type { BallState } from '../apps/rube/src/parts'
import { portalPlacement } from '../apps/rube/src/pieces/portal'
import type { World } from '../apps/rube/src/worlds'
import type { StockSpec } from '../apps/rube/src/shows/stock/types'

/** The arrangement picks the exit variant; the stock piece owns every clock and path. */
export function stockPlacement(world: World, spec: StockSpec, ball: BallState, index: number) {
  const theme = world.themes[0], color = theme.colors[(index * 2 + 1) % theme.colors.length]
  const stock = world.pieces.find((p) => p.name === spec.name)
  assert.ok(stock, `Unknown ${world.name}/${spec.name}`)
  const placed = spec.portal ? portalPlacement(spec.portal, color) : stock.place({
    rng: makeRng('stock'), color, theme, ball, earned: 600, taste: { weights: {} },
    fits: (_cells, exit) => !spec.exit || exit[0] === spec.exit[0] && exit[1] === spec.exit[1],
  })
  assert.ok(placed, `No stock variant for ${world.name}/${JSON.stringify(spec)}`)
  return placed
}
