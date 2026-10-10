import { STORE_WIDE } from './store/store'
import { LONDON_WIDE } from './london/london'
import { HOTEL_WIDE } from './hotel/hotel'
import { ALLEY_WIDE } from './alley/alley'
import { JERSEY_WIDE } from './jersey/jersey'
import { TOKYO_WIDE } from './tokyo/tokyo'
import { HOSPITAL_WIDE } from './hospital/hospital'

/**
 * Where Marty may be small or out of the Zoom frame: the great wides, each a stretch of show seconds, said by the place
 * that frames it (the check holds the rest of the show to Zoom and to a ball that can be found).
 */
export const WIDE: [number, number][] = [...STORE_WIDE, ...LONDON_WIDE, ...HOTEL_WIDE, ...ALLEY_WIDE, ...JERSEY_WIDE, ...TOKYO_WIDE, ...HOSPITAL_WIDE]
