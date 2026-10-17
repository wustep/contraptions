import { smooth } from '../kit'
import { mix } from '../pen'
import { SUN_CLEAR, T0 } from './geo'

/**
 * The dawn's clock, which every light in the ward reads: grey-blue at the cut, the sky over the roofs blushing rose as
 * the sun nears them, and gold once it has cleared them (bar 103) and on to the end. Everything here is a pure function
 * of show time.
 */

/** How far the dawn has come: grey-blue at the cut, gold by the end. */
export const warm = (t: number): number => smooth(t, T0 - 4, T0 + 58)

/** The rose before the gold: the low sky blushing as the sun nears the roofs, at its fullest as it clears them, then giving way. */
export const rose = (t: number): number => smooth(t, T0 - 4, T0 + 9) * (1 - 0.65 * smooth(t, SUN_CLEAR, T0 + 46))

/** The sun over the roofs: nothing while it is under them, all of it from just after it clears them. */
export const sunUp = (t: number): number => smooth(t, SUN_CLEAR - 1.2, SUN_CLEAR + 2.6)

/** How gold the light is: the slow warming, or the sun's own once it is up. */
export const gold = (t: number): number => Math.max(warm(t), 0.8 * sunUp(t))

/** The colour of the light through every window: grey-blue, then rose, then gold. */
export const daylight = (t: number): string => mix(mix('#D2DAE0', '#F6C6B4', rose(t)), '#FFD38A', gold(t))

/** How strong that light is, 0 to 1: a pale wash at the cut, the rose stronger, and full once the sun is up. */
export const strength = (t: number): number => 0.3 + 0.25 * rose(t) + 0.2 * warm(t) + 0.35 * sunUp(t)

/** How high the sun stands, 0 at the cut to 1 at the end: the shafts steepen and the patches on the floor draw in. */
export const climb = (t: number): number => smooth(t, T0 - 2, T0 + 66)
