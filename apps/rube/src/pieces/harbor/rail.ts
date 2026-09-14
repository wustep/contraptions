import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR } from '../../parts'
import { makeRail } from '../rail'
import { cleat, piling, water } from './sea'

/**
 * The harbor's rail is a pier: a deck over water, on pilings. A cell of it
 * carries a piling, a cleat with a coil of rope, a life ring hung under
 * the deck, or nothing but the water.
 */
export const pierRail = makeRail(['piling', 'cleat', 'ring', 'none', 'piling'] as const, (p, s, { k, ink, weight, bg }) => {
  water(p, k, ink, weight, -0.5, 0.5)
  if (s.decor === 'piling') piling(p, k, ink, weight, 0.08)
  if (s.decor === 'cleat') {
    cleat(p, k, ink, weight, s.color, -0.12)
    outline(p, ink, weight * 0.9)
    p.ellipse(0.16 * k, (FLOOR + 0.1) * k, 0.2 * k, 0.1 * k)
    p.ellipse(0.16 * k, (FLOOR + 0.1) * k, 0.12 * k, 0.05 * k)
  }
  if (s.decor === 'ring') {
    // A life ring hung on a hook under the deck.
    outline(p, ink, weight)
    p.line(0, FLOOR * k, 0, (FLOOR + 0.05) * k)
    solid(p, ink, weight, s.color)
    p.circle(0, (FLOOR + 0.16) * k, 0.22 * k)
    solid(p, ink, weight, bg)
    p.circle(0, (FLOOR + 0.16) * k, 0.1 * k)
    outline(p, ink, weight)
    for (const a of [0.6, 2.2, 3.8, 5.4]) {
      p.line(Math.cos(a) * 0.05 * k, (FLOOR + 0.16 + Math.sin(a) * 0.05) * k, Math.cos(a) * 0.11 * k, (FLOOR + 0.16 + Math.sin(a) * 0.11) * k)
    }
  }
})
