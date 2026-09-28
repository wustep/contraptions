/**
 * Every strike of Kick, part by part, in show seconds: what `check:shows` holds against the measured beats and onsets
 * of the recording. A part that strikes exports its list; this only gathers them.
 */
import { LIMBO_HITS } from './limbo/limbo'
import { PARIS_HITS } from './paris/paris'
import { PLANE_HITS } from './plane/plane'
import { RAIN_HITS } from './rain/rain'
import { HOTEL_HITS } from './hotel/hotel'
import { SNOW_HITS } from './snow/snow'
import { HOME_HITS } from './home/home'

export const STRIKES: Record<string, readonly number[]> = {
  limbo: LIMBO_HITS,
  paris: PARIS_HITS,
  plane: PLANE_HITS,
  rain: RAIN_HITS,
  hotel: HOTEL_HITS,
  snow: SNOW_HITS,
  home: HOME_HITS,
}
