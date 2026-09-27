import { stub } from '../stub'

/** STUB (the shaft builder replaces this): the mouth, gravity's turn, the long shaft to the light. */
export const shaft = stub('shaft', 24, 0, { ian: [-0.48, 0] })
export const SHAFT_HITS: number[] = []
/** The camera's roll, radians (Framing.angle): -π/2 in the mouth, turning to 0 with gravity. 0 outside the shaft. */
export const rollAt = (_t: number): number => 0
