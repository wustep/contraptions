/**
 * Every strike of Magnum, part by part, in show seconds: what `check:shows` holds against the measured beats and
 * onsets of the recording. A part that strikes exports its list; this only gathers them.
 */
import { AWARDS_HITS } from './awards/awards'
import { SPA_HITS } from './spa/spa'
import { CLUB_HITS } from './club/walkoff'
import { RUNWAY_HITS } from './derelicte/runway'
import { TOWER_HITS } from './derelicte/tower'
import { CENTER_HITS } from './center/center'

export const STRIKES: Record<string, readonly number[]> = {
  awards: AWARDS_HITS,
  spa: SPA_HITS,
  club: CLUB_HITS,
  runway: RUNWAY_HITS,
  tower: TOWER_HITS,
  center: CENTER_HITS,
}
