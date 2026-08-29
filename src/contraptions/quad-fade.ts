import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutCubic, mod, seg } from '../core/ease'

/**
 * Four quarters filling and emptying in rotation, like water rising in a
 * tank. A quarter that scaled about its own centre spent the ends of its
 * cycle as a speck of ink in a large empty square — a mark, not a machine.
 * Filling from the floor keeps the shape the width of its quarter the whole
 * way, so the same cycle reads at every cell size.
 */
export const quadFade = defineContraption({
  name: 'quad-fade',
  label: 'Quad Fade',
  tags: ['square', 'sequence'],
  role: 'relay',
  rotations: [0],
  fireAt: 0,
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const q = size / 2
    const corners = [
      [-q / 2, -q / 2],
      [q / 2, -q / 2],
      [q / 2, q / 2],
      [-q / 2, q / 2],
    ] as const

    outline(p, ink, weight)
    p.rect(0, 0, size, size)
    p.line(-size / 2, 0, size / 2, 0)
    p.line(0, -size / 2, 0, size / 2)

    corners.forEach(([x, y], i) => {
      const local = mod(u * s.dir - i / 4, 1)
      const grow = easeInOutCubic(seg(local, 0, 0.25))
      const shrink = easeInOutCubic(seg(local, 0.5, 0.75))
      const scale = grow - shrink
      const side = q * 0.86
      const level = side * scale
      if (level <= weight) return
      solid(p, ink, weight, s.color)
      p.rect(x, y + (side - level) / 2, side, level)
    })
  },
})
