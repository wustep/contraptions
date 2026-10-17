import { outline, solid } from '../../../../../../src/core/draw'
import { makeRail } from '../../../pieces/rail'
import { baluster, brass } from './hall'
import { FLOOR } from '../../../parts'

/**
 * The hall's rail is the front edge of a stage, on turned balusters. A cell of it carries a baluster, a footlight's
 * hood on the floor, a music stand's folded tripod, or nothing but the board. The board itself is the rail's own line.
 */
export const stageRail = makeRail(['baluster', 'footlight', 'none', 'baluster', 'tripod'] as const, (p, s, { k, ink, weight, theme }) => {
  if (s.decor === 'baluster') baluster(p, k, ink, weight, s.color, 0)
  if (s.decor === 'footlight') {
    // A footlight: a brass hood on the floor, its back to us.
    solid(p, ink, weight, brass(theme))
    p.arc(0.1 * k, 0.5 * k, 0.24 * k, 0.24 * k, Math.PI, Math.PI * 2, p.CHORD)
  }
  if (s.decor === 'tripod') {
    outline(p, ink, weight)
    p.line(0, FLOOR * k, 0, 0.4 * k)
    p.line(0, 0.4 * k, -0.1 * k, 0.5 * k)
    p.line(0, 0.4 * k, 0.1 * k, 0.5 * k)
  }
})
