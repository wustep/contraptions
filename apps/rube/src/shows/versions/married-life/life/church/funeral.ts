import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * FUNERAL (a stub; the church builder replaces it): the funeral: the same church, empty; Carl alone in the front pew with the balloon; the one toll; out to the steps (189.452 to 201.944).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const FUNERAL_AT: Pt = [0, 0]

export const funeral = stub('funeral', 5, 0, { ellie: false })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const FUNERAL_HITS: number[] = []
