import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * WEDDING (a stub; the church builder replaces it): the wedding: the flash, the Wedding March, the kiss on bar 1 of the waltz, the families, out of the doors (0 to 21.577).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const WEDDING_AT: Pt = [0, 0]

export const wedding = stub('wedding', 10, 0, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const WEDDING_HITS: number[] = []
