import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, mod, seg } from '../../core/ease'
import { BENCH, bench, sparks } from './shop'

/**
 * A snail cam presses the tail of the helve down, lifting the hammer head a
 * little further with every degree, until the step in the cam lets the tail
 * go and the head drops on the anvil.
 */
const PIVOT_Y = -0.04
const HEAD_X = -0.36
const TAIL_X = 0.28
const R0 = 0.08
const R1 = 0.2
/** The cam's step passes the tail here; the head is falling right after. */
const RELEASE = 0.78
const STRIKE = 0.86
const LIFT = (R1 - R0) / TAIL_X

export const hammer = defineContraption({
  name: 'hammer',
  label: 'Trip Hammer',
  tags: ['work'],
  role: 'source',
  rotations: [0],
  weight: 1.1,
  fireAt: STRIKE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // The cam profile by parameter: a dwell, then a spiral out to R1, then
    // the step back. `down` is the parameter pointing at the tail right now.
    const radius = (t: number) => R0 + (R1 - R0) * seg(t, 0.32, 1)
    const down = mod(u + 1 - RELEASE, 1)
    let theta: number
    if (u <= RELEASE) theta = (radius(down) - R0) / TAIL_X
    else {
      const fall = easeInQuad(seg(u, RELEASE, STRIKE))
      const rebound = 0.14 * Math.sin(Math.PI * seg(u, STRIKE, 0.94))
      theta = LIFT * (1 - fall + rebound)
    }
    const camX = TAIL_X
    const camY = PIVOT_Y - R0

    bench(p, k, ink, weight)

    // Anvil, and the A-frame carrying the pivot.
    solid(p, ink, weight, s.color)
    p.rect(HEAD_X * k, (BENCH - 0.04) * k, 0.24 * k, 0.08 * k)
    outline(p, ink, weight)
    p.line(-0.07 * k, BENCH * k, 0, PIVOT_Y * k)
    p.line(0.07 * k, BENCH * k, 0, PIVOT_Y * k)

    // The cam, hung from the beam above, turned so `down` points at the tail.
    p.line(camX * k, -0.5 * k, camX * k, camY * k)
    p.push()
    p.translate(camX * k, camY * k)
    p.rotate(Math.PI / 2 - Math.PI * 2 * down)
    outline(p, ink, weight)
    p.beginShape()
    const n = 56
    for (let i = 0; i <= n; i++) {
      const t = i === n ? 0 : i / n
      const r = i === n ? R0 : radius(t)
      const a = (i / n) * Math.PI * 2
      p.vertex(Math.cos(a) * r * k, Math.sin(a) * r * k)
    }
    p.endShape(p.CLOSE)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.09 * k)
    p.pop()

    // The helve and its head.
    p.push()
    p.translate(0, PIVOT_Y * k)
    p.rotate(theta)
    outline(p, ink, weight)
    p.line(HEAD_X * k, 0, (TAIL_X + 0.04) * k, 0)
    solid(p, ink, weight, s.color)
    p.rect(HEAD_X * k, 0.15 * k, 0.16 * k, 0.3 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, PIVOT_Y * k, 0.07 * k)

    sparks(p, k, s.color, HEAD_X + 0.08, BENCH - 0.08, u, 1, Math.max(0, 1 - seg(u, STRIKE, 0.97)) * (u >= STRIKE ? 1 : 0), 3, 4, 0.18)
    sparks(p, k, s.color, HEAD_X - 0.08, BENCH - 0.08, u, -1, Math.max(0, 1 - seg(u, STRIKE, 0.97)) * (u >= STRIKE ? 1 : 0), 3, 4, 0.18)
  },
})
