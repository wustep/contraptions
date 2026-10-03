import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const NUUK_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const NUUK_CELLS = box(-12, -10, 34, 4, 2)
/** The place's standing set: its sky or walls, drawn first. A stand-in until it is built. */
export const nuukSet = scenery<null>({ name: 'nuuk-set', draw: () => {} })

/** The bar at Nuuk: the pilot's thumb, the little stage, Cheryl singing, and the run (bar 17 → bar 25). A stand-in until it is built. */
export const bar = stub('bar', 8)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const NUUK_HITS: readonly number[] = []

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const NUUK_WIDE: [number, number][] = []
