import { defineContraption } from '../core/define'
import { floorRail, outline } from '../core/draw'

/** Four sails on a tower. */
export const windmill = defineContraption({
  name: 'windmill',
  label: 'Windmill',
  tags: ['spin'],
  mirror: false,
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const hubY = -size * 0.14
    const sail = size * 0.33
    const wide = size * 0.11
    // Four-fold symmetry: a quarter turn per loop reads as steady rotation.
    const rot = (u * Math.PI * s.dir) / 2

    outline(p, ink, weight)
    floorRail(p, size)
    p.line(-size * 0.22, size / 2, -size * 0.045, hubY)
    p.line(size * 0.22, size / 2, size * 0.045, hubY)
    p.line(-size * 0.14, size * 0.2, size * 0.14, size * 0.2)

    p.push()
    p.translate(0, hubY)
    p.rotate(rot)
    for (let i = 0; i < 4; i++) {
      outline(p, ink, weight)
      p.fill(s.color)
      p.rect(sail / 2 + wide * 0.3, 0, sail, wide)
      p.rotate(Math.PI / 2)
    }
    outline(p, ink, weight)
    p.fill(s.color)
    p.circle(0, 0, size * 0.1)
    p.pop()
  },
})
