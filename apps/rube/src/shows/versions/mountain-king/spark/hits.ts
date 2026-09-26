/**
 * Every strike of Spark, part by part, in show seconds: what `check:shows` holds against the measured onsets and the
 * theme's tracked beat. A part that strikes exports its list; this only gathers them.
 */
import { SNEAK_HITS } from './loft/sneak'
import { STOVE_HITS } from './loft/stove'
import { GLASS_HITS } from './glass/glassworks'
import { BALLOON_HITS } from './regatta/balloons'
import { EXPRESS_HITS } from './railway/express'
import { FIREWORKS_HITS } from './railway/fireworks'
import { HOME_HITS } from './loft/home'

export const STRIKES: Record<string, readonly number[]> = {
  sneak: SNEAK_HITS,
  stove: STOVE_HITS,
  glassworks: GLASS_HITS,
  balloons: BALLOON_HITS,
  express: EXPRESS_HITS,
  fireworks: FIREWORKS_HITS,
  home: HOME_HITS,
}
