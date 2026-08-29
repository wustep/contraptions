import { defineContraption } from '../../core/define'
import { clipCell, outline } from '../../core/draw'
import { lerp, seg } from '../../core/ease'
import { BELT_V, BENCH, HIGH_Y, PART, PART_Y, SHELF, bench, lineOf, part, rollers } from './shop'

/**
 * A part comes along the high shelf from the west, tips onto the slide,
 * gathers speed down it, and levels out onto the rollers at the bottom.
 */
const X0 = -0.3
const X1 = 0.3
const DROP = BENCH - SHELF
const RAMP = Math.hypot(X1 - X0, DROP)
const ANGLE = Math.atan2(DROP, X1 - X0)
/** When the part reaches the top of the slide, the bottom, and the edge. */
const T_TOP = (X0 + 0.5 + PART / 2) / BELT_V
const T_BOTTOM = T_TOP + 0.28
const T_GONE = T_BOTTOM + 0.115

export const chute = defineContraption({
  name: 'chute',
  label: 'Chute',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  weight: 1.2,
  // Landing at the bottom of the slide.
  fireAt: T_BOTTOM,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const nx = Math.sin(ANGLE)
    const ny = -Math.cos(ANGLE)
    let pos: [number, number] | null = null
    let angle = 0
    const line = lineOf(s)
    if (u < T_TOP) {
      const x = -0.5 - PART / 2 + u * BELT_V
      pos = line && !line.in ? [Math.max(-0.22, x), HIGH_Y] : [x, HIGH_Y]
    } else if (u < T_BOTTOM) {
      // Along the slide, starting at shelf speed and picking up.
      const f = seg(u, T_TOP, T_BOTTOM)
      const dist = RAMP * (0.72 * f + 0.28 * f * f)
      const sx = X0 + Math.cos(ANGLE) * dist
      const sy = SHELF + Math.sin(ANGLE) * dist
      const blend = Math.min(seg(f, 0, 0.12), 1 - seg(f, 0.88, 1))
      angle = ANGLE * blend
      pos = [sx + nx * (PART / 2) * blend, sy + ny * (PART / 2) * blend - (PART / 2) * (1 - blend)]
    } else if (u < T_GONE || (line && !line.out && u >= T_BOTTOM)) {
      if (line && !line.out) pos = [X1, PART_Y]
      else {
        const f = seg(u, T_BOTTOM, T_GONE)
        pos = [X1 + 0.32 * (1.29 * f - 0.29 * f * f), PART_Y]
      }
    }

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, X1, 0.5, u * BELT_V)

      // The shelf and its post, then the slide: a board on a strut.
      outline(p, ink, weight)
      p.line(-0.5 * k, SHELF * k, X0 * k, SHELF * k)
      p.line(-0.42 * k, SHELF * k, -0.42 * k, BENCH * k)
      const under = 0.05
      p.line(X0 * k, SHELF * k, X1 * k, BENCH * k)
      p.line((X0 - nx * under) * k, (SHELF - ny * under) * k, (X1 - nx * under - Math.cos(ANGLE) * 0.06) * k, (BENCH - ny * under - Math.sin(ANGLE) * 0.06) * k)
      p.line(X0 * k, SHELF * k, (X0 - nx * under) * k, (SHELF - ny * under) * k)
      p.line(0, lerp(SHELF, BENCH, 0.5) * k, 0, BENCH * k)

      if (pos && pos[0] > -0.56 && pos[0] < 0.56) part(p, k, ink, weight, s.color, pos[0], pos[1], { angle })
    })
  },
})
