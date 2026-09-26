import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * FIXUP (a stub; the house builder replaces it): fixing up the old house on the waltz: boards, paint, the mailbox and its two handprints, the armchairs (21.577 to 49.644).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const FIXUP_AT: Pt = [0, 0]

export const fixup = stub('fixup', 14, 0, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const FIXUP_HITS: number[] = []
