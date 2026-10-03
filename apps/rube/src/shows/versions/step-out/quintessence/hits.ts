/**
 * Every strike of Quintessence, place by place, in show seconds: what `check:shows` holds against the measured beats
 * and onsets of the recording. A place that strikes exports its list; this only gathers them.
 */
import { NEGATIVES_HITS } from './negatives/negatives'
import { DREAM_HITS } from './dream/dream'
import { NUUK_HITS } from './nuuk/nuuk'
import { SKY_HITS } from './sky/sky'
import { SEA_HITS } from './sea/sea'
import { ICELAND_HITS } from './iceland/iceland'
import { HOME_HITS } from './home/home'
import { HIMALAYA_HITS } from './himalaya/himalaya'
import { PRESS_HITS } from './press/press'
import { STREET_HITS } from './street/street'

export const STRIKES: Record<string, readonly number[]> = {
  negatives: NEGATIVES_HITS,
  dream: DREAM_HITS,
  nuuk: NUUK_HITS,
  sky: SKY_HITS,
  sea: SEA_HITS,
  iceland: ICELAND_HITS,
  home: HOME_HITS,
  himalaya: HIMALAYA_HITS,
  press: PRESS_HITS,
  street: STREET_HITS,
}
