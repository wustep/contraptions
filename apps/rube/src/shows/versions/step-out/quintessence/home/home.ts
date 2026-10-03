import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const HOME_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const HOME_CELLS = box(-12, -10, 34, 4, 2)
/** The place's standing set: its sky or walls, drawn first. A stand-in until it is built. */
export const homeSet = scenery<null>({ name: 'home-set', draw: () => {} })

/** Home: his mother's piano, and its curve (bar 75 → bar 83). A stand-in until it is built. */
export const piano = stub('piano', 6)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const HOME_HITS: readonly number[] = []

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const HOME_WIDE: [number, number][] = []
