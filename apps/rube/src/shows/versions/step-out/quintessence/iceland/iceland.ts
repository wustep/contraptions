import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const ICELAND_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const ICELAND_CELLS = box(-12, -10, 34, 4, 2)
/** The place's standing set: its sky or walls, drawn first. A stand-in until it is built. */
export const icelandSet = scenery<null>({ name: 'iceland-set', draw: () => {} })

/** Iceland: the bicycle, the road sign, the longboard down to the fjord, the eruption, the ash (bar 52 → bar 75). A stand-in until it is built. */
export const road = stub('road', 30)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const ICELAND_HITS: readonly number[] = []

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const ICELAND_WIDE: [number, number][] = []
