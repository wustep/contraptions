import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { FLOOR, dipLane, floor, type Beat } from './parts'

/**
 * A dished cup set into the rail: the ball drops into it, settles, and climbs
 * back out the far side. The quietest beat in the set — nothing here moves
 * but the ball, and the cup is what makes it dip.
 */
const FIRE = 0
const MOUTH = 0.34
const DEEP = 0.15

export const cup = defineContraption<Beat>({
  name: 'cup',
  label: 'Cup',
  tags: ['ball'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => dipLane(ctx, { by: 0.09, down: 0.035, wait: 0.06, up: 0.055 }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, ink, weight }) => {
    floor(p, k, ink, weight, s, MOUTH / 2)
    solid(p, ink, weight, s.color)
    p.arc(0, FLOOR * k, MOUTH * k, DEEP * 2 * k, 0, Math.PI)
  },
  // The near lip stands between the viewer and the ball in the dish, so it is
  // drawn after the world's tokens: without it the ball reads as sitting on
  // the cup rather than in it.
  over: (p, _s, { size: k, ink, weight }) => {
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      p.line(((side * MOUTH) / 2) * k, (FLOOR + 0.02) * k, ((side * MOUTH) / 2) * k, (FLOOR - 0.08) * k)
    }
  },
})
