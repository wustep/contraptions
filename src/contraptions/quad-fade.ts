import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutCubic, mod, seg } from '../core/ease'

/** Four quarters filling and emptying in rotation. */
export const quadFade = defineContraption({
  name: 'quad-fade',
  label: 'Quad Fade',
  tags: ['square', 'sequence'],
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
      if (scale <= 0.001) return
      solid(p, ink, weight, s.color)
      p.rect(x, y, q * scale * 0.86, q * scale * 0.86)
    })
  },
})
