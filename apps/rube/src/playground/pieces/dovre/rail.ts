import { outline } from '../../../../../../src/core/draw'
import { makeRail } from '../../../pieces/rail'
import { FLOOR } from '../../../parts'
import { floor, gold, lamp, moss, prop, stone, wood } from './look'

/**
 * The mountain's rail is a gallery floor of troll-sawn planks. A cell of it
 * stands on a pit prop, has a miner's lamp hung from a nail on a short post
 * behind it, a clump of moss and a pebble under the line, or nothing but
 * the plank.
 */
export const dovreRail = makeRail(['prop', 'lamp', 'moss', 'none', 'prop'] as const, (p, s, { k, ink, weight, theme, t }) => {
  floor(p, k, ink, weight, -0.5, 0.5)
  if (s.decor === 'prop') prop(p, k, ink, weight, wood(theme), 0.05)
  if (s.decor === 'lamp') {
    outline(p, ink, weight * 0.85)
    p.line(-0.18 * k, FLOOR * k, -0.18 * k, -0.46 * k)
    p.line(-0.18 * k, -0.4 * k, -0.05 * k, -0.4 * k)
    lamp(p, k, ink, weight, gold(theme), -0.05, -0.34, 0.5 + 0.5 * Math.sin(t * 7))
  }
  if (s.decor === 'moss') {
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    p.fill(stone(theme))
    p.ellipse(0.2 * k, 0.44 * k, 0.16 * k, 0.1 * k)
    p.fill(moss(theme))
    p.arc(-0.12 * k, 0.5 * k, 0.28 * k, 0.2 * k, Math.PI, Math.PI * 2, p.CHORD)
  }
})
