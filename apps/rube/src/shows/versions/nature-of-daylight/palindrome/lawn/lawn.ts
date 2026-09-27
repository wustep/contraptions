import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { HANNAH_BY } from '../seams'
import { stub } from '../stub'
import { HOUSE } from '../worlds'

/**
 * The lawn by the lake (the LAWN builder's): the swing on the tree at the water's edge, the house's glass behind.
 * STUB: replace everything here, keeping the export names the score imports.
 */

/** Every cell the lawn claims. It is in the house's world, away from the room. */
export const LAWN_CELLS: Pt[] = box(48, -10, 90, 4, 2)

export const lawnSet = scenery<null>({
  name: 'lawn-set',
  draw: (p, _s, c) => {
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(HOUSE.day)
    p.rect(48 * c.k, -10 * c.k, 42 * c.k, 10.13 * c.k)
    p.fill(HOUSE.grass)
    p.rect(48 * c.k, 0.13 * c.k, 42 * c.k, 4 * c.k)
    p.pop()
  },
})

/** Where the swing leg and the vision start, in the house's world cells. */
export const SWING_AT: Pt = [60, 0]
export const SEES_AT: Pt = [72, 0]

export const swing = stub('swing', 3, 0, { hannah: HANNAH_BY })
export const sees = stub('sees', 0.6, 0, { hannah: HANNAH_BY })

export const LAWN_HITS: number[] = []
