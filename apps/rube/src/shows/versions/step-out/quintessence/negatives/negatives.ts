import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Where this place's first part starts, in the place's own cells (the ball comes in at (-0.5, 0) from it). */
export const NEGATIVES_AT: Pt = [0, 0]
/** Where the clues leg (the second visit, after the daydream) starts, in the same cells. */
export const CLUES_AT: Pt = [0, 0]
/** Everything the place's standing set draws, claimed coarsely so the stage draws it wherever the camera is. */
export const NEGATIVES_CELLS = box(-12, -10, 34, 4, 2)
/** The place's standing set: its sky or walls, drawn first. A stand-in until it is built. */
export const negativesSet = scenery<null>({ name: 'negatives-set', draw: () => {} })

/** The opening: the light table in the dark, the strip, frame 25 missing (0 → bar 1). A stand-in until it is built. */
export const opening = stub('opening', 6)
/** The clues: Cheryl, the contact sheet, the loupe, the enlarger and the ship (bar 9 → bar 17). A stand-in until it is built. */
export const clues = stub('clues', 6)

/** Every strike this place makes, in show seconds: what `check:shows` holds against the recording. */
export const NEGATIVES_HITS: readonly number[] = []

/** Where Walter may be small or out of the Zoom frame in this place: the great wides, stretches of show seconds. Keep them few. */
export const NEGATIVES_WIDE: [number, number][] = []
