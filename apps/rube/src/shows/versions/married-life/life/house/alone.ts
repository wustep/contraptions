import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * ALONE (a stub; the house builder replaces it): home alone: up the front steps, in, his chair beside her empty one; the house idle; the credits over it (201.944 to the end).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const ALONE_AT: Pt = [0, 0]

export const alone = stub('alone', 10, 0, { ellie: false })

/**
 * Where he ties the balloon off (to her chair, say), in this part's frame, and from when (show seconds): the cast
 * then carries the string's end there over a second. Null keeps it tied to him to the end.
 */
export const ALONE_TIE: { from: number; at: Pt } | null = null

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const ALONE_HITS: number[] = []
