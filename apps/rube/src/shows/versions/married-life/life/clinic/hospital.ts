import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * HOSPITAL (a stub; the clinic builder replaces it): the hospital: her bed, the balloon he brings (180.413 to 189.452).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const HOSPITAL_AT: Pt = [0, 0]

export const hospital = stub('hospital', 3, 0, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const HOSPITAL_HITS: number[] = []
