import { DOORS, FESTIVAL, strongEighths } from '../music'
import { stub } from '../stub'

/**
 * EXPRESS's part (a stub until built): the night express, from the third door (`DOORS.railway`, statement 3's first
 * note, fortissimo) to the festival (`FESTIVAL`, phrase 16). The spark bursts out of the smokestack on the first
 * chuff; the fireworks train, with no one on its footplate, lurches off and runs away, faster with every bar (its
 * wheels and rods are the tempo); and at the festival it brakes and throws the spark ahead into the fireworks field.
 * The leg is laid at [0, 0] in the railway's cells, so the part's entry (-0.5, 0) is the smokestack's lip.
 */

/** The strikes (show seconds). A stub's guess: the backbeats of phrases 12 to 15. Replace with yours. */
export const EXPRESS_HITS: number[] = strongEighths(DOORS.railway + 0.1, FESTIVAL - 0.2, 2.4).map((e) => e.t)

export const express = stub('express', { exit: [48, 0], hits: EXPRESS_HITS, cells: 7, lift: 0.6 })
