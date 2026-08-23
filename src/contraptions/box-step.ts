import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutSine, lerp, seg } from '../core/ease'

/** A square walking the perimeter of its own cell, one edge per beat. */
export const boxStep = defineContraption({
  name: 'box-step',
  label: 'Box Step',
  tags: ['step', 'square'],
  role: 'source',
  fireAt: 0.0,
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const box = size / 3
    const reach = size / 2 - box / 2
    const phase = s.dir > 0 ? u : 1 - u
    const leg = Math.floor(phase * 4)
    // Move for the first two thirds of each leg, then rest in the corner.
    const local = easeInOutSine(seg(phase * 4 - leg, 0, 0.66))

    let x = reach
    let y = reach
    if (leg === 0) {
      y = lerp(reach, -reach, local)
    } else if (leg === 1) {
      x = lerp(reach, -reach, local)
      y = -reach
    } else if (leg === 2) {
      x = -reach
      y = lerp(-reach, reach, local)
    } else {
      x = lerp(-reach, reach, local)
    }

    outline(p, ink, weight)
    p.rect(0, 0, size, size)
    solid(p, ink, weight, s.color)
    p.rect(x, y, box, box)
  },
})
