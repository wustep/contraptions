/**
 * Every strike of Logogram, part by part, in show seconds: what `check:shows` holds against the measured pulses and
 * onsets of the recording. A part that strikes exports its list; this only gathers them.
 */
import { LAKE_HITS } from './lake/house'
import { FLIGHT_HITS } from './valley/flight'
import { BASE_HITS } from './valley/base'
import { LIFT_HITS } from './valley/lift'
import { DEPART_HITS } from './valley/depart'
import { SHAFT_HITS } from './shell/shaft'
import { CHAMBER_HITS } from './shell/chamber'
import { FOG_HITS } from './fog/fog'

export const STRIKES: Record<string, readonly number[]> = {
  lake: LAKE_HITS,
  flight: FLIGHT_HITS,
  base: BASE_HITS,
  lift: LIFT_HITS,
  shaft: SHAFT_HITS,
  chamber: CHAMBER_HITS,
  fog: FOG_HITS,
  depart: DEPART_HITS,
}
