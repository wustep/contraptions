import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * DOCTOR (a stub; the clinic builder replaces it): the doctor's office: the held note, the silence (73.456 to 84.376).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const DOCTOR_AT: Pt = [0, 0]

export const doctor = stub('doctor', 3, 0, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const DOCTOR_HITS: number[] = []
