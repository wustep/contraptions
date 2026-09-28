import { BEAT, LAST, RETURN, STATEMENTS, STROKES, THEMES } from './music'
import { LOOPS, RIDES, lapOf, sOf } from './plan'
import { FINALE_HITS, LAST_RIDE } from './finale'

/**
 * Every strike in the show, gathered for the check: each is where the music is by construction, and `check:shows`
 * measures each against `scripts/shows/plans/bolero-onsets.json` again.
 *
 * - `melody`: every note of all eighteen statements, a key under the ball as the note sounds (1,738 of them).
 * - `stick`: the drum's every stroke, 24 to two bars, from the first bar to the collapse.
 * - `lift`: the lift's steps with the ball in its cup, each on a stroke.
 * - `treads`: the stair in E major, a tread a beat; `finial`: the ball in the cup on C's return; `drum`: the ball on
 *   the drum head on the last chord.
 */

export interface MelodyHit {
  k: number
  storey: number
  i: number
  q: number
  t: number
}

export const MELODY: MelodyHit[] = STATEMENTS.flatMap((s, k) => {
  const storey = lapOf(k).storey
  const keys = LOOPS[storey].keys
  return THEMES[s.theme].map(([q], i) => ({ k, storey, i: keys[i].i, q, t: sOf(k, q) }))
})

export const STICK: readonly number[] = STROKES
export const LIFT: number[] = [...RIDES, LAST_RIDE].flatMap((r) => r.steps)
export const TREADS: number[] = FINALE_HITS.treads
export const FINIAL = RETURN
export const DRUM_LANDING = LAST
void BEAT
