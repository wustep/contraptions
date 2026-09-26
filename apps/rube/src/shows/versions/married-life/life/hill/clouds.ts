import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * CLOUDS (a stub; the hill builder replaces it): the picnic on the hill: the clouds, and the baby in them (49.644 to 63.251).
 * The brief is dev/BUILD_BRIEF.md. Keep the export names.
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const CLOUDS_AT: Pt = [0, 0]

export const clouds = stub('clouds', 6, 0, { ellie: true })

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const CLOUDS_HITS: number[] = []
