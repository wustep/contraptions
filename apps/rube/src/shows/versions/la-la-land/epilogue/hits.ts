/**
 * Every strike of Epilogue, part by part, in show seconds: what `check:shows`
 * holds against the measured onsets of the recording. A part that strikes
 * exports its list; this only gathers them.
 */
import { PIANO_HITS } from './piano'
import { KISS_HITS } from './kiss'
import { FREEWAY_HITS } from './freeway'
import { STUDIO_HITS } from './studio'
import { PARIS_HITS } from './paris'
import { STARS_HITS } from './stars'
import { NUMBER_HITS } from './number'
import { HOME_HITS } from './home'
import { SEBS_HITS } from './sebs'
import { FINALE_HITS } from './finale'

export interface Strikes {
  /** On the piano's own notes, at the start and at the end (rubato: ±40 ms). */
  piano: Record<string, number[]>
  /** On the swing's comb, beats or eighths (±26 ms). */
  swing: Record<string, number[]>
  /** On the waltz's comb, bars or their thirds (±26 ms), the cadence included. */
  waltz: Record<string, number[]>
  /** On the number's comb, beats or eighths (±26 ms). */
  number: Record<string, number[]>
  /** In the free stretches, on a measured onset (±35 ms): the kiss and the rush, the stars, the build, home, the chorus, the look, the last chords. */
  free: Record<string, number[]>
}

export const STRIKES: Strikes = {
  piano: {
    piano: PIANO_HITS,
    finale: FINALE_HITS,
  },
  swing: {
    freeway: FREEWAY_HITS,
    studio: STUDIO_HITS,
  },
  waltz: {
    paris: PARIS_HITS,
  },
  number: {
    number: NUMBER_HITS,
  },
  free: {
    kiss: KISS_HITS,
    stars: STARS_HITS,
    home: HOME_HITS,
    sebs: SEBS_HITS,
  },
}
