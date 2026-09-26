/**
 * Every strike of Caravan, part by part, in show seconds: what `check:shows` holds against the measured recording.
 * A part that strikes exports its list; this only gathers them.
 */
import { PRACTICE_HITS } from './shaffer/practice'
import { BAND_HITS } from './shaffer/band'
import { TEMPO_HITS } from './shaffer/tempo'
import { NIGHT_HITS } from './shaffer/night'
import { FOLDER_HITS } from './road/folder'
import { CRASH_HITS } from './road/crash'
import { SABOTAGE_HITS } from './carnegie/sabotage'
import { SOLO_HITS } from './carnegie/solo'
import { HUSH_HITS } from './carnegie/hush'
import { FAST_HITS } from './carnegie/fast'
import { RUBATO_HITS } from './carnegie/rubato'
import { FINALE_HITS } from './carnegie/finale'

export interface Strikes {
  /** The tune, on its click: a beat or an eighth of `tune(k)` (±30 ms), or a measured onset (±35 ms). */
  tune: Record<string, number[]>
  /** The last chorus: a beat or an eighth of `shout(k)` (±30 ms), or a measured onset (±35 ms). */
  shout: Record<string, number[]>
  /** The solo, free: a measured onset (±35 ms), or a stroke of the ride's rubato. */
  solo: Record<string, number[]>
}

export const STRIKES: Strikes = {
  tune: {
    practice: PRACTICE_HITS,
    band: BAND_HITS,
    tempo: TEMPO_HITS,
    night: NIGHT_HITS,
    folder: FOLDER_HITS,
    crash: CRASH_HITS,
  },
  shout: {
    sabotage: SABOTAGE_HITS,
  },
  solo: {
    solo: SOLO_HITS,
    hush: HUSH_HITS,
    fast: FAST_HITS,
    rubato: RUBATO_HITS,
    finale: FINALE_HITS,
  },
}
