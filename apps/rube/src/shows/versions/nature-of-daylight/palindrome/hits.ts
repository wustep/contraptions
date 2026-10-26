/**
 * Every strike of Palindrome, part by part, in show seconds: what `check:shows` holds against the measured beats,
 * chords and onsets of the recording. A part that strikes exports its list; this only gathers them.
 */
import { HOUSE_HITS } from './house/house'
import { LAWN_HITS } from './lawn/lawn'
import { HALL_HITS } from './hall/hall'
import { VALLEY_HITS } from './valley/valley'
import { SHAFT_HITS } from './shaft/shaft'
import { CHAMBER_HITS } from './chamber/chamber'
import { FOG_HITS } from './fog/fog'
import { GALA_HITS } from './fog/gala'
import { TWELVE_HITS } from './twelve/twelve'

export const STRIKES: Record<string, readonly number[]> = {
  house: HOUSE_HITS,
  lawn: LAWN_HITS,
  hall: HALL_HITS,
  valley: VALLEY_HITS,
  shaft: SHAFT_HITS,
  chamber: CHAMBER_HITS,
  fog: FOG_HITS,
  gala: GALA_HITS,
  twelve: TWELVE_HITS,
}
