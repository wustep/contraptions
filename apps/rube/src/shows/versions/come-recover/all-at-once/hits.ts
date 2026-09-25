/**
 * Every strike of All at Once, part by part, in show seconds: what `check:shows` holds against the measured onsets
 * of the recording. A part that strikes exports its list; this only gathers them.
 */
import { LAUNDROMAT_HITS } from './home/laundromat'
import { DRYER_HITS } from './home/dryer'
import { PREMIERE_HITS } from './star/premiere'
import { DOJO_HITS } from './dojo/dummies'
import { HOTDOG_HITS } from './hotdog/fingers'
import { HIBACHI_HITS } from './hibachi/raccacoonie'
import { SURF_HITS } from './multi/surf'
import { PULL_HITS } from './void/pull'
import { MOSAIC_HITS } from './multi/mosaic'
import { KINDNESS_HITS } from './home/kindness'
import { ROCKS_HITS } from './rocks/ledge'
import { PEAK_HITS } from './void/peak'
import { FINALE_HITS } from './home/finale'

export const STRIKES: Record<string, readonly number[]> = {
  laundromat: LAUNDROMAT_HITS,
  dryer: DRYER_HITS,
  premiere: PREMIERE_HITS,
  dojo: DOJO_HITS,
  hotdog: HOTDOG_HITS,
  hibachi: HIBACHI_HITS,
  surf: SURF_HITS,
  pull: PULL_HITS,
  mosaic: MOSAIC_HITS,
  kindness: KINDNESS_HITS,
  rocks: ROCKS_HITS,
  peak: PEAK_HITS,
  finale: FINALE_HITS,
}
