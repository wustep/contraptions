import { stub } from '../stub'
import { LIFT_AT } from './geo'
import { PAD_AT } from './flight'

/** STUB (the valley builder replaces this): out of the helicopter, through the base, onto the lift's deck. */
export const base = stub('base', LIFT_AT[0] - PAD_AT[0], LIFT_AT[1] - PAD_AT[1], { ian: [-0.42, 0] })
export const BASE_HITS: number[] = []
