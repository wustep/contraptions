import { outline } from '../../../../../../../../src/core/draw'
import type { Engine } from './kit'
import { INK } from '../look'

/** Placeholder: the box this engine will fill. */
export const bellows: Engine = (p, c, _st, _t, e) => {
  outline(p, INK, c.weight * 0.4)
  p.rectMode(p.CORNERS)
  p.rect(e.box.x0 * c.k, e.box.y0 * c.k, e.box.x1 * c.k, e.box.y1 * c.k)
}
