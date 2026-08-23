import { defineContraption } from '../core/define'
import { outline, rails, solid } from '../core/draw'
import { easeInOutCubic, lerp, seg } from '../core/ease'

/** A car on a cable, with a rest at each end of the shaft. */
export const elevator = defineContraption({
  name: 'elevator',
  label: 'Elevator',
  tags: ['lift', 'square'],
  mirror: false,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const car = size * 0.3
    const shaft = size * 0.22
    const wheel = size * 0.11
    const low = size * 0.32 - car / 2
    const high = -size * 0.22 + car / 2

    let y = low
    if (u < 0.4) y = lerp(low, high, easeInOutCubic(seg(u, 0, 0.4)))
    else if (u < 0.5) y = high
    else if (u < 0.9) y = lerp(high, low, easeInOutCubic(seg(u, 0.5, 0.9)))

    outline(p, ink, weight)
    rails(p, size)
    p.line(-shaft, -size * 0.34, -shaft, size / 2)
    p.line(shaft, -size * 0.34, shaft, size / 2)
    p.circle(0, -size * 0.34, wheel * 2)
    p.line(0, -size * 0.34 + wheel, 0, y - car / 2)

    solid(p, ink, weight, s.color)
    p.rect(0, y, car, car)
  },
})
