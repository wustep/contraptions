import { stub } from '../stub'
import { LIFT_EXIT } from './geo'

/** STUB (the lift builder replaces this): the scissor lift, up through the fog into the slot in the shell's belly. */
export const lift = stub('lift', LIFT_EXIT[0], LIFT_EXIT[1], { ian: [-0.42, 0] })
export const LIFT_HITS: number[] = []
