import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, post } from '../../parts'
import { makeRail } from '../rail'

/** The workshop's rail: a post, a bracket, a riveted plate, or nothing. */
export const plainRail = makeRail(['post', 'bracket', 'plate', 'none', 'post'] as const, (p, s, { k, ink, weight }) => {
  if (s.decor === 'post') post(p, k, ink, weight, 0)
  if (s.decor === 'bracket') {
    outline(p, ink, weight)
    p.line(0, FLOOR * k, 0, 0.5 * k)
    p.line(0, 0.5 * k, 0.22 * k, FLOOR * k)
    p.line(0, 0.5 * k, -0.22 * k, FLOOR * k)
  }
  if (s.decor === 'plate') {
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR + 0.06) * k, 0.3 * k, 0.08 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(-0.09 * k, (FLOOR + 0.06) * k, 0.03 * k)
    p.circle(0.09 * k, (FLOOR + 0.06) * k, 0.03 * k)
  }
})
