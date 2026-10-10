/**
 * Every strike of Rally, place by place, in show seconds: what `check:shows` holds against the measured beats,
 * shuffles and onsets of the recording. A place that strikes exports its list; this only gathers them.
 */
import { STORE_HITS } from './store/store'
import { LONDON_HITS } from './london/london'
import { HOTEL_HITS } from './hotel/hotel'
import { ALLEY_HITS } from './alley/alley'
import { JERSEY_HITS } from './jersey/jersey'
import { TOKYO_HITS } from './tokyo/tokyo'
import { HOSPITAL_HITS } from './hospital/hospital'

export const STRIKES: Record<string, readonly number[]> = {
  store: STORE_HITS,
  london: LONDON_HITS,
  hotel: HOTEL_HITS,
  alley: ALLEY_HITS,
  jersey: JERSEY_HITS,
  tokyo: TOKYO_HITS,
  hospital: HOSPITAL_HITS,
}
