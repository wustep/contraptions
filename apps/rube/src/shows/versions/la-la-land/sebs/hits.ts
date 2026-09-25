import * as opening from './club/opening'
import * as finale from './club/finale'
import * as kiss from './liptons/kiss'
import * as theatre from './theatre/theatre'
import * as studio from './studio/studio'
import * as hollywood from './studio/hollywood'
import * as shadow from './audition/shadow'
import * as globe from './audition/globe'
import * as jazz from './paris/jazz'
import * as trumpet from './paris/trumpet'
import * as painted from './night/painted'
import * as stars from './night/stars'
import * as movie from './movie/movie'
import * as drive from './movie/drive'

/**
 * Every strike of Seb's, part by part, in show seconds: what `check:shows`
 * holds against the measured onsets of the recording. A part that strikes
 * exports its list as `<NAME>_HITS`; this only gathers them.
 */
const modules: Record<string, Record<string, unknown>> = { opening, finale, kiss, theatre, studio, hollywood, shadow, globe, jazz, trumpet, painted, stars, movie, drive }

export const STRIKES: Record<string, number[]> = Object.fromEntries(
  Object.entries(modules).map(([name, m]) => [
    name,
    Object.entries(m)
      .filter(([key, v]) => key.endsWith('_HITS') && Array.isArray(v))
      .flatMap(([, v]) => v as number[])
      .sort((a, b) => a - b),
  ]),
)
