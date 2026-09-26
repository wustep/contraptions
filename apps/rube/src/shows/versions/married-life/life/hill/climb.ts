import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * CLIMB (a stub; the hill builder replaces it): the same hill, years later: the climb, and her fall (167.706 to 180.413).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const CLIMB_AT: Pt = [0, 0]

export const climb = stub('climb', 8, -1, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const CLIMB_HITS: number[] = []
