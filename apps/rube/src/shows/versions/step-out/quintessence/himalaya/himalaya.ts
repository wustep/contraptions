import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const HIMALAYA_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const HIMALAYA_CELLS = box(-12, -10, 34, 4, 2)
/** The place's standing set: its sky or walls, drawn first. A stand-in until it is built. */
export const himalayaSet = scenery<null>({ name: 'himalaya-set', draw: () => {} })

/** The Himalayas: the climb, Sean, and the snow leopard (bar 83 → bar 110). A stand-in until it is built. */
export const ghostCat = stub('ghostCat', 12)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const HIMALAYA_HITS: readonly number[] = []

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const HIMALAYA_WIDE: [number, number][] = []
