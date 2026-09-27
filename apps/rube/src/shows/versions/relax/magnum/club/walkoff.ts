import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** The underground walk-off (the CLUB builder's). A stub until it is built: keep these export names. */
export const CLUB_AT: Pt = [0, 0]
export const CLUB_CELLS = box(-4, -8, 20, 4, 2)
export const clubSet = scenery<null>({ name: 'club-set', draw: () => {} })
export const walkoff = stub('walkoff', 12, 0, { hansel: [0.9, 0], cells: 5 })
export const CLUB_HITS: number[] = []
