import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'

/** A ball that dashes to whichever end of the beam is lower. */
export const seesaw = defineContraption({
  name: 'seesaw',
  label: 'Seesaw',
  tags: ['tilt', 'ball'],
  period: 120,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const pivotY = size * 0.2
    const half = size * 0.46
    const phase = Math.sin(u * Math.PI * 2)
    const tilt = 0.22 * phase
    // tanh parks the ball at one end for most of the cycle, then throws it
    // across as the beam passes level.
    const along = 0.82 * Math.tanh(2.6 * phase)
    const cos = Math.cos(tilt)
    const sin = Math.sin(tilt)

    outline(p, ink, weight)
    floorRail(p, size)
    p.line(-size * 0.13, size / 2, 0, pivotY)
    p.line(size * 0.13, size / 2, 0, pivotY)
    p.line(-half * cos, pivotY - half * sin, half * cos, pivotY + half * sin)

    // Sit the ball on the upper face of the beam, along its normal.
    const d = size * 0.22
    const bx = half * along * cos + (sin * d) / 2
    const by = pivotY + half * along * sin - (cos * d) / 2
    solid(p, ink, weight, s.color)
    p.circle(bx, by, d)
  },
})
