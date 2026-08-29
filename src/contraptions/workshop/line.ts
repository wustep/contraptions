import { LOOP } from '../../core/constants'
import { defineContraption } from '../../core/define'
import { clipBox, outline, solid, teeth } from '../../core/draw'
import { easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { belt, BENCH, burst, PART, part, PART_Y, partColor, pulse } from './shop'

/**
 * A production line three benches long: the hopper drops a blank on the
 * belt, the belt indexes one station, the press marks the blank while the
 * counter clicks the one ahead of it through, and the belt hands the marked
 * part off the east edge.
 */
const PERIOD = LOOP / 2
const MOVE0 = 0.06
const MOVE1 = 0.4
const STRIKE = 0.52
const HOP_X = -1.0
const PRESS_X = 0
const COUNT_X = 1.0
const REST = -0.16
const DOWN = PART_Y - 0.12 - 0.06

export const line = defineContraption({
  name: 'line',
  label: 'Line',
  tags: ['line', 'work'],
  span: [3, 1],
  rotations: [0],
  period: PERIOD,
  fireAt: STRIKE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size: k, u, ink, weight }) => {
    const travel = easeInOutCubic(seg(u, MOVE0, MOVE1))
    const head =
      u < STRIKE - 0.06 ? REST
      : u < STRIKE ? lerp(REST, DOWN, easeInQuad(seg(u, STRIKE - 0.06, STRIKE)))
      : u < STRIKE + 0.06 ? DOWN
      : lerp(DOWN, REST, easeOutCubic(seg(u, STRIKE + 0.06, STRIKE + 0.16)))
    const open = easeOutCubic(seg(u, 0.6, 0.65)) - easeInOutCubic(seg(u, 0.78, 0.84))
    const settle = easeOutCubic(seg(u, 0.84, 0.96))
    const slot = (i: number) => -PART / 2 - 0.03 - i * (PART + 0.02)

    clipBox(p, w, h, () => {
      belt(p, k, ink, weight, s.color, -1.5, 1.5, travel)

      // Three parts on the line, a station apart; the one at the far end
      // rides off the edge as the fresh blank comes down.
      for (const [station, mark] of [[HOP_X, 'blank'], [PRESS_X, 'dot'], [COUNT_X, 'dot']] as const) {
        const x = station + travel
        const marked = station === PRESS_X ? u >= STRIKE : mark === 'dot'
        if (x < 1.62) part(p, k, ink, weight, partColor(s), x, PART_Y, { mark: marked ? 'dot' : 'blank' })
      }

      // Hopper: magazine, stack, the blank dropping, the gate.
      outline(p, ink, weight)
      for (const x of [HOP_X - 0.17, HOP_X + 0.17]) p.line(x * k, -0.5 * k, x * k, 0)
      p.line((HOP_X - 0.22) * k, 0.055 * k, (HOP_X + 0.49) * k, 0.055 * k)
      for (let i = 0; i < 3; i++) part(p, k, ink, weight, partColor(s), HOP_X, slot(i + 1 - settle))
      if (u >= 0.6) part(p, k, ink, weight, partColor(s), HOP_X, lerp(slot(0), PART_Y, easeInQuad(seg(u, 0.66, 0.76))))
      solid(p, ink, weight, s.color)
      p.rect((HOP_X + open * 0.3) * k, 0.025 * k, 0.34 * k, 0.05 * k)

      // Press: frame straddling the belt, cylinder, ram.
      outline(p, ink, weight)
      for (const x of [PRESS_X - 0.28, PRESS_X + 0.28]) p.line(x * k, 0.5 * k, x * k, -0.38 * k)
      p.rect(PRESS_X * k, -0.46 * k, 0.18 * k, 0.08 * k)
      p.push()
      p.fill(ink)
      p.rect(PRESS_X * k, -0.38 * k, 0.68 * k, 0.08 * k)
      p.pop()
      outline(p, ink, weight)
      p.line(PRESS_X * k, -0.34 * k, PRESS_X * k, (head - 0.06) * k)
      solid(p, ink, weight, s.color)
      p.rect(PRESS_X * k, head * k, 0.3 * k, 0.12 * k)
      burst(p, k, s.color, weight, PRESS_X, PART_Y - 0.1, pulse(u, STRIKE, 16, PERIOD), 0.2, 0.32, 4, Math.PI / 4)

      // Counter: a trip lever the part rides over on its way in, a wheel
      // that steps a tooth each time.
      const lever = COUNT_X - 0.3
      const near = Math.max(0, 1 - Math.abs(PRESS_X + travel - lever) / 0.2)
      const press = near * near * (3 - 2 * near)
      const step = easeInOutCubic(seg(travel, 0.55, 0.75))
      outline(p, ink, weight)
      p.line((lever - 0.12) * k, BENCH * k, (lever + 0.08) * k, (BENCH - 0.06 * (1 - press)) * k)
      p.line((lever + 0.08) * k, (BENCH - 0.06 * (1 - press)) * k, (lever + 0.08) * k, -0.02 * k)
      p.line(COUNT_X * k, -0.5 * k, COUNT_X * k, -0.46 * k)
      p.push()
      p.translate(COUNT_X * k, -0.22 * k)
      p.rotate((step * Math.PI * 2) / 8)
      outline(p, ink, weight)
      p.circle(0, 0, 0.36 * k)
      teeth(p, 0.18 * k, 8, 0.05 * k)
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(COUNT_X * k, -0.22 * k, 0.09 * k)
      p.triangle(COUNT_X * k, -0.42 * k, (COUNT_X - 0.04) * k, -0.48 * k, (COUNT_X + 0.04) * k, -0.48 * k)
    })
  },
})
