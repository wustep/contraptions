import { NEGATIVES_WIDE } from './negatives/negatives'
import { DREAM_WIDE } from './dream/dream'
import { NUUK_WIDE } from './nuuk/nuuk'
import { SKY_WIDE } from './sky/sky'
import { SEA_WIDE } from './sea/sea'
import { ICELAND_WIDE } from './iceland/iceland'
import { HOME_WIDE } from './home/home'
import { HIMALAYA_WIDE } from './himalaya/himalaya'
import { PRESS_WIDE } from './press/press'
import { STREET_WIDE } from './street/street'

/**
 * Where Walter may be small or out of the Zoom frame: the great wides, each a stretch of show seconds, said by the
 * place that frames it (the check holds the rest of the show to Zoom and to a ball that can be found).
 */
export const WIDE: [number, number][] = [...NEGATIVES_WIDE, ...DREAM_WIDE, ...NUUK_WIDE, ...SKY_WIDE, ...SEA_WIDE, ...ICELAND_WIDE, ...HOME_WIDE, ...HIMALAYA_WIDE, ...PRESS_WIDE, ...STREET_WIDE]
