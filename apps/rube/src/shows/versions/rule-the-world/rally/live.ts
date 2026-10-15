import type p5 from 'p5'
import type { Framing } from '../../../registry'
import type { RallyShow } from './show'

/**
 * The show as the score composed it, for the few drawings that look past their own place: the transitions draw the
 * place being left as the next one opens out of Marty, Marty's light follows him, and the finale lays every place
 * round the ward. `compose()` fills it once; until then (and in the checks, which draw nothing) it is empty. `painting` is
 * set while a place is painted for the finale's rooms (`snap.ts`), when Marty's own light stays out of the picture.
 */
export const live: { show: RallyShow | null; camera: ((t: number) => Framing) | null; painting: boolean; stage: p5 | null } = {
  show: null,
  camera: null,
  painting: false,
  /** The last p5 that drew the show (dev only: the rooms' pictures framed by eye). */
  stage: null,
}
