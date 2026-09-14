import { outline } from '../../../../../src/core/draw'
import { FLOOR } from '../../parts'
import { makeRail } from '../rail'
import { bloom, pot, stem, tuft } from './green'

/**
 * The garden's rail is a path edge on stakes. A cell of it carries a stake
 * with a tie, a tuft of grass, a small pot with one flower in it, or
 * nothing but the ground.
 */
export const gardenRail = makeRail(['stake', 'tuft', 'pot', 'none', 'tuft'] as const, (p, s, { k, ink, weight, bg }) => {
  outline(p, ink, weight)
  if (s.decor === 'stake') {
    p.line(0, FLOOR * k, 0, 0.5 * k)
    p.line(-0.05 * k, 0.5 * k, 0.05 * k, 0.5 * k)
    // The tie: two turns of twine round the stake under the rail.
    p.line(-0.03 * k, (FLOOR + 0.05) * k, 0.03 * k, (FLOOR + 0.08) * k)
    p.line(-0.03 * k, (FLOOR + 0.08) * k, 0.03 * k, (FLOOR + 0.11) * k)
  }
  if (s.decor === 'tuft') {
    tuft(p, k, ink, weight, -0.2, 0.5, 0.12, 0.03)
    tuft(p, k, ink, weight, 0.18, 0.5, 0.09, -0.02)
  }
  if (s.decor === 'pot') {
    pot(p, k, ink, weight, s.color, 0.12, 0.5, 0.2, 0.14)
    stem(p, k, ink, weight, 0.12, 0.36, 0.14, 0.22, 0.02)
    bloom(p, k, ink, weight, s.color, bg, 0.14, 0.2, 0.05, 5)
  }
})
