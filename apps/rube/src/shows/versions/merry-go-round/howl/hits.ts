/**
 * Every strike of Merry-Go-Round, part by part, in show seconds: what `check:shows` holds against the measured
 * onsets and beats of the recording. A part that strikes exports its list; this only gathers them.
 */
import { SHOP_HITS } from './town/shop'
import { ALLEY_HITS } from './sky/alley'
import { SKYWALK_HITS } from './sky/skywalk'
import { CURSE_HITS } from './town/curse'
import { HILLS_HITS } from './wastes/hills'
import { WALK_HITS } from './wastes/walk'
import { MORNING_HITS } from './castle/morning'
import { FIELD_HITS } from './flowers/field'
import { RAID_HITS } from './war/raid'
import { HEARTH_HITS } from './plank/hearth'
import { PLANK_HITS } from './plank/plank'
import { FLIGHT_HITS } from './finale/flight'

export const STRIKES: Record<string, readonly number[]> = {
  shop: SHOP_HITS,
  alley: ALLEY_HITS,
  skywalk: SKYWALK_HITS,
  curse: CURSE_HITS,
  hills: HILLS_HITS,
  walk: WALK_HITS,
  morning: MORNING_HITS,
  field: FIELD_HITS,
  raid: RAID_HITS,
  hearth: HEARTH_HITS,
  plank: PLANK_HITS,
  flight: FLIGHT_HITS,
}
