import { outline } from '../../../../../src/core/draw'
import { FLOOR, over } from '../../parts'
import { makeRail } from '../rail'
import { lamp, tube } from './neon'

/**
 * The arcade's rail is a lit lane. A cell of it carries a lamp on a stub
 * that comes on as the ball passes and dies down after, a strip of tube
 * under the deck that lights the same way, chevrons on the floor pointing
 * the way, or nothing but the dark.
 */
export const laneRail = makeRail(['lamp', 'strip', 'chevron', 'none', 'lamp'] as const, (p, s, { k, since, ink, bg, weight }) => {
  // Lit from the moment the ball is over the cell's middle, fading over a second.
  const lit = since < 0 ? 0 : 1 - over(since, 0.3, 1.1)
  if (s.decor === 'lamp') {
    outline(p, ink, weight)
    p.line(0, FLOOR * k, 0, (FLOOR + 0.1) * k)
    lamp(p, k, ink, weight, s.color, bg, 0, FLOOR + 0.16, 0.045, lit)
  }
  if (s.decor === 'strip') tube(p, k, ink, weight, s.color, -0.3, FLOOR + 0.1, 0.3, FLOOR + 0.1, lit)
  if (s.decor === 'chevron') {
    p.push()
    p.stroke(lit > 0.5 ? s.color : ink)
    p.strokeWeight(weight)
    for (const x of [-0.2, 0, 0.2]) {
      p.line((x - 0.05) * k, 0.4 * k, (x + 0.03) * k, 0.45 * k)
      p.line((x + 0.03) * k, 0.45 * k, (x - 0.05) * k, 0.5 * k)
    }
    p.pop()
  }
})
