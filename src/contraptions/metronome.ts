import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'

/** An inverted pendulum ticking above its case. */
export const metronome = defineContraption({
  name: 'metronome',
  label: 'Metronome',
  tags: ['swing', 'tick'],
  period: 120,
  mirror: false,
  setup: ({ color, rng }) => ({ color, bob: rng.range(0.3, 0.52) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const pivotY = size * 0.34
    const arm = size * 0.76
    const theta = 0.26 * Math.sin(u * Math.PI * 2)
    const tipX = arm * Math.sin(theta)
    const tipY = pivotY - arm * Math.cos(theta)
    const bobX = arm * s.bob * Math.sin(theta)
    const bobY = pivotY - arm * s.bob * Math.cos(theta)

    outline(p, ink, weight)
    floorRail(p, size)
    p.line(-size * 0.26, size * 0.5, 0, -size * 0.34)
    p.line(size * 0.26, size * 0.5, 0, -size * 0.34)
    p.line(0, pivotY, tipX, tipY)

    solid(p, ink, weight, s.color)
    p.rect(bobX, bobY, size * 0.2, size * 0.11)
  },
})
