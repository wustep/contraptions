import type { Pt } from '../../../../../parts'
import { stub } from '../stub'
import { INSIDE } from './inside'

/**
 * YARD (a stub; the home builder replaces it): Ellie alone in the yard; Carl brings her the adventure book; it opens on the waltz's return (84.376 to 103.288).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in the house's inside: Carl just inside the back door, at (-0.6, 0) in the house's inside (`inside.ts`); the score adds INSIDE_AT. */
export const YARD_AT: Pt = [-0.1, INSIDE.floor]

export const yard = stub('yard', 0.9, 0, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const YARD_HITS: number[] = []
