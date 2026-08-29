import { defineContraption } from '../../core/define'
import { clipBox, outline, solid } from '../../core/draw'
import { easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BENCH, bench, part, PART_Y, partColor, roller, sparks } from './shop'

/**
 * The motor turns the line shaft along the ceiling, flat belts bring its
 * turning down to the bench, and the grinder throws sparks off one blank
 * while the drill press goes down into another.
 */
const SHAFT = -0.4
const MOTOR_X = -0.8
const GRIND_X = -0.35
const DRILL_X = 0.45
const PR = 0.06

export const lineshaft = defineContraption({
  name: 'lineshaft',
  label: 'Line Shaft',
  tags: ['line', 'work'],
  span: [2, 1],
  rotations: [0],
  fireAt: 0.42,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size: k, u, ink, weight }) => {
    const spin = u * Math.PI * 2 * 2
    const quill =
      u < 0.36 ? -0.06
      : u < 0.42 ? lerp(-0.06, 0.12, easeInQuad(seg(u, 0.36, 0.42)))
      : u < 0.5 ? 0.12
      : lerp(0.12, -0.06, easeOutCubic(seg(u, 0.5, 0.6)))
    const drilling = seg(u, 0.4, 0.42) * (1 - seg(u, 0.5, 0.54))
    const chuck = 0.08 * (Math.abs(Math.cos(spin)) + Math.abs(Math.sin(spin))) * 0.75

    clipBox(p, w, h, () => {
      bench(p, k, ink, weight, -1, 1)

      // The shaft in its hangers, with a pulley over each machine.
      outline(p, ink, weight)
      p.line(-k, SHAFT * k, k, SHAFT * k)
      for (const x of [-0.6, 0.05, 0.75]) {
        p.line(x * k, -0.5 * k, x * k, SHAFT * k)
        p.circle(x * k, SHAFT * k, 0.05 * k)
      }
      for (const x of [MOTOR_X, GRIND_X, DRILL_X]) roller(p, k, ink, weight, s.color, x, SHAFT, PR, spin)

      // The motor, belted up to the shaft.
      outline(p, ink, weight)
      p.rect(MOTOR_X * k, (BENCH - 0.12) * k, 0.26 * k, 0.24 * k, 0.03 * k)
      for (const side of [-PR, PR]) p.line((MOTOR_X + side) * k, (SHAFT + 0.0) * k, (MOTOR_X + side) * k, -0.02 * k)
      roller(p, k, ink, weight, s.color, MOTOR_X, -0.02, PR, spin)

      // The grinder: wheel on a pedestal, a blank held to it on a rest.
      outline(p, ink, weight)
      p.line(GRIND_X * k, BENCH * k, GRIND_X * k, 0.02 * k)
      for (const side of [-PR, PR]) p.line((GRIND_X + side) * k, SHAFT * k, (GRIND_X + side) * k, 0.02 * k)
      p.line((GRIND_X - 0.29) * k, BENCH * k, (GRIND_X - 0.29) * k, 0.14 * k)
      p.line((GRIND_X - 0.36) * k, 0.14 * k, (GRIND_X - 0.22) * k, 0.14 * k)
      part(p, k, ink, weight, partColor(s), GRIND_X - 0.29, 0.02)
      roller(p, k, ink, weight, s.color, GRIND_X, 0.02, 0.16, spin)
      sparks(p, k, s.color, GRIND_X - 0.17, -0.02, u, -1, 1, 4, 4, 0.2)

      // The drill press: column, head, belt, spindle going down into a blank.
      outline(p, ink, weight)
      p.line((DRILL_X + 0.25) * k, BENCH * k, (DRILL_X + 0.25) * k, -0.2 * k)
      p.rect((DRILL_X + 0.1) * k, -0.2 * k, 0.34 * k, 0.12 * k)
      for (const side of [-PR, PR]) p.line((DRILL_X + side) * k, SHAFT * k, (DRILL_X + side) * k, -0.26 * k)
      roller(p, k, ink, weight, s.color, DRILL_X, -0.26, PR, spin)
      p.line(DRILL_X * k, -0.14 * k, DRILL_X * k, quill * k)
      p.line(DRILL_X * k, quill * k, DRILL_X * k, (quill + 0.12) * k)
      solid(p, ink, weight, s.color)
      p.rect(DRILL_X * k, quill * k, chuck * k, 0.08 * k)
      part(p, k, ink, weight, partColor(s), DRILL_X, PART_Y)
      sparks(p, k, s.color, DRILL_X + 0.03, PART_Y - 0.12, u, 1, drilling, 3, 6, 0.12)
      sparks(p, k, s.color, DRILL_X - 0.03, PART_Y - 0.12, u, -1, drilling, 3, 6, 0.12)
    })
  },
})
