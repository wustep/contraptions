import { outline } from '../../../../../../src/core/draw'
import { makeRail } from '../../../pieces/rail'
import { fir, snow, snowAt, snowWhite, wand } from './snow'

/**
 * The mountain's rail is a track over the snow: the snow lies under every
 * cell of it, and a cell carries a trail wand, a small fir, a snow fence
 * of two slats, or nothing but the drift.
 */
export const snowRail = makeRail(['wand', 'fir', 'fence', 'none', 'wand'] as const, (p, s, { k, ink, weight, theme }) => {
  snow(p, k, ink, weight, -0.5, 0.5)
  if (s.decor === 'wand') wand(p, k, ink, weight, s.color, 0.06)
  if (s.decor === 'fir') fir(p, k, ink, weight, s.color === snowWhite(theme) ? theme.colors[0] : s.color, 0.2, snowAt(0.2) + 0.02, 0.2)
  if (s.decor === 'fence') {
    outline(p, ink, weight)
    for (const x of [-0.22, 0.02]) p.line(x * k, 0.2 * k, x * k, (snowAt(x) + 0.03) * k)
    p.line(-0.27 * k, 0.24 * k, 0.07 * k, 0.24 * k)
    p.line(-0.27 * k, 0.31 * k, 0.07 * k, 0.31 * k)
  }
})
