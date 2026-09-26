import type { Pt } from '../../../../../parts'
import { stub } from '../stub'
import { INSIDE } from './inside'

/**
 * NURSERY (a stub; the home builder replaces it): the nursery upstairs: painting it, the mobile on its music box, which runs down with the music (63.251 to 73.456).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in the house's inside: Carl at the crib upstairs, at (4, INSIDE.up) in the house's inside (`inside.ts`); the score adds INSIDE_AT. */
export const NURSERY_AT: Pt = [4.5, INSIDE.up]

export const nursery = stub('nursery', 4, 0, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const NURSERY_HITS: number[] = []
