import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/** STUB (the valley builder replaces this): the helicopter, from the cloud over the ridge down to the pad. */
export const FLIGHT_AT: Pt = [-70, -40]
/** The base's origin: where the flight's lane ends (the ball in the cabin, the helicopter on the pad). */
export const PAD_AT: Pt = [-20, -1.13]
export const flight = stub('flight', PAD_AT[0] - FLIGHT_AT[0], PAD_AT[1] - FLIGHT_AT[1], { ian: [0.36, 0] })
export const FLIGHT_HITS: number[] = []
