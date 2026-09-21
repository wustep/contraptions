import { outline, solid } from '../../../../../../src/core/draw'
import { makeRail } from '../../../pieces/rail'
import { baluster, brass, stage } from './hall'
import { FLOOR } from '../../../parts'

/**
 * The hall's rail is the front edge of a stage, on turned balusters. A cell of it carries a baluster, a shell footlight on the
 * floor, a music stand's folded tripod, or nothing but the board.
 */
export const stageRail = makeRail(['baluster', 'footlight', 'none', 'baluster', 'tripod'] as const, (p, s, { k, ink, weight, theme }) => {
  stage(p, k, ink, weight, -0.5, 0.5)
  if (s.decor === 'baluster') baluster(p, k, ink, weight, s.color, 0)
  if (s.decor === 'footlight') {
    // A shell footlight: a fan on the floor, its back to us.
    solid(p, ink, weight, brass(theme))
    p.arc(0.1 * k, 0.5 * k, 0.24 * k, 0.26 * k, Math.PI, Math.PI * 2, p.CHORD)
    outline(p, ink, weight * 0.7)
    for (const a of [-0.9, -0.3, 0.3, 0.9]) p.line(0.1 * k, 0.5 * k, (0.1 + Math.sin(a) * 0.115) * k, (0.5 - Math.cos(a) * 0.125) * k)
  }
  if (s.decor === 'tripod') {
    outline(p, ink, weight)
    p.line(0, FLOOR * k, 0, 0.4 * k)
    p.line(0, 0.4 * k, -0.1 * k, 0.5 * k)
    p.line(0, 0.4 * k, 0.1 * k, 0.5 * k)
  }
})
