import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'

/** Crank, connecting rod, and a block sliding in its guide. */
export const piston = defineContraption({
  name: 'piston',
  label: 'Piston',
  tags: ['spin', 'slide'],
  rotations: [0, 1, 2, 3],
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const cx = -size * 0.26
    const r = size * 0.16
    const rod = size * 0.44
    const block = size * 0.26
    const a = u * Math.PI * 2 * s.dir
    const px = cx + r * Math.cos(a)
    const py = r * Math.sin(a)
    const bx = px + Math.sqrt(Math.max(0, rod * rod - py * py))

    outline(p, ink, weight)
    p.line(-size * 0.1, -block / 2, size / 2, -block / 2)
    p.line(-size * 0.1, block / 2, size / 2, block / 2)
    p.circle(cx, 0, r * 2)
    p.line(px, py, bx, 0)

    solid(p, ink, weight, s.color)
    p.rect(bx, 0, block, block)
    p.circle(px, py, size * 0.07)
  },
})
