import { defineContraption } from '../core/define'
import { coil, outline, rails, solid } from '../core/draw'
import { lerp, pingPong } from '../core/ease'

/** A block bouncing on a compression spring. */
export const spring = defineContraption({
  name: 'spring',
  label: 'Spring',
  tags: ['bounce', 'square'],
  period: 120,
  mirror: false,
  setup: ({ color, rng }) => ({ color, coils: rng.pick([4, 5, 6]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const block = size * 0.26
    const top = -size * 0.2
    const bottom = size * 0.16
    const y = lerp(bottom, top, pingPong(u))

    outline(p, ink, weight)
    rails(p, size)
    coil(p, 0, size / 2, 0, y + block / 2, s.coils, size * 0.12)

    solid(p, ink, weight, s.color)
    p.rect(0, y, block, block)
  },
})
