import type { Options } from '../../core/composition'
import type { Contraption } from '../../core/types'

/**
 * What the Goldberg composers share.
 *
 * This used to be a toolkit for finding runs of leftover cells to staff —
 * inset rings, eastbound rows, stacked bands, shared columns, serpentines.
 * None of it survived the move to lane worlds: cascade and workshop own their
 * whole grid and snake through every cell of it by construction, and circus
 * builds its own programme block, so there are no leftovers to hunt for. What
 * is left is the pool filtering every composer does the same way.
 */

export const isUnit = (c: Contraption<unknown>): boolean => !c.span || (c.span[0] === 1 && c.span[1] === 1)

/** The catalog narrowed by the Solo and Tag dials, for inspecting one machine. */
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
