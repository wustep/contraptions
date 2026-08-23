import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'

/** A three-armed wheel on a short stem, turning forever. */
export const pinwheel = defineContraption({
  name: 'pinwheel',
  label: 'Pinwheel',
  tags: ['spin'],
  role: 'relay',
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    outline(p, ink, weight)
    floorRail(p, size)
    p.line(0, size / 2, 0, size / 2 - size * 0.25)

    p.push()
    // The figure has three-fold symmetry, so a third of a turn per loop reads
    // as continuous rotation while still closing the loop exactly.
    p.rotate((u * Math.PI * 2 * s.dir) / 3)
    outline(p, ink, weight)
    p.circle(0, 0, size * 0.5)
    for (let i = 0; i < 3; i++) {
      p.line(0, 0, size * 0.25, 0)
      p.rotate((Math.PI * 2) / 3)
    }
    solid(p, ink, weight, s.color)
    p.circle(0, 0, size * 0.2)
    p.pop()
  },
})
