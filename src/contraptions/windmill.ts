import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'

/** Four sails on a tower. */
export const windmill = defineContraption({
  name: 'windmill',
  label: 'Windmill',
  tags: ['spin'],
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const hubY = -size * 0.12
    const sail = size * 0.34
    const wide = size * 0.12
    // Four-fold symmetry: half a turn per loop still reads as steady rotation.
    const rot = u * Math.PI * s.dir

    outline(p, ink, weight)
    floorRail(p, size)
    p.line(-size * 0.2, size / 2, -size * 0.05, hubY)
    p.line(size * 0.2, size / 2, size * 0.05, hubY)

    p.push()
    p.translate(0, hubY)
    p.rotate(rot)
    for (let i = 0; i < 4; i++) {
      outline(p, ink, weight)
      if (i % 2 === 0) p.fill(s.color)
      p.rect(sail / 2, 0, sail, wide)
      p.rotate(Math.PI / 2)
    }
    p.pop()

    solid(p, ink, weight, s.color)
    p.circle(0, hubY, size * 0.09)
  },
})
