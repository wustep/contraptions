import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const SKY_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const SKY_CELLS = box(-12, -10, 34, 4, 2)
/** The place's standing set: its sky or walls, drawn first. A stand-in until it is built. */
export const skySet = scenery<null>({ name: 'sky-set', draw: () => {} })

/** The helicopter: up, over the sea, the boat it will not land on, and the jump (bar 25 → bar 37). A stand-in until it is built. */
export const helicopter = stub('helicopter', 14)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const SKY_HITS: readonly number[] = []

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const SKY_WIDE: [number, number][] = []
