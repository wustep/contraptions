import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BELT_V, FEED_WEST, PART_Y, belt, bench, lineOf, part } from './shop'

/**
 * A V-funnel over the bench. One blank sits in the throat; the gate lets
 * it drop onto the rollers. When this cell is a catch, the mouth takes a
 * part from the spill above instead of holding a magazine of totes.
 */
export const hopper = defineContraption({
  name: 'hopper',
  label: 'Hopper',
  tags: ['feed'],
  role: 'source',
  rotations: [0],
  weight: 1.3,
  fireAt: 0.12,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const catcher = !!line?.catch
    const W = 0.055
    const mouth = 0.3
    const open = easeOutCubic(seg(u, 0, 0.05)) - easeInOutCubic(seg(u, 0.16, 0.22))
    const dropY = lerp(catcher ? -0.4 : -0.12, PART_Y, easeInQuad(seg(u, catcher ? 0 : 0.02, 0.12)))

    clipCell(p, k, () => {
      const x0 = line?.in || catcher ? -0.5 : FEED_WEST
      bench(p, k, ink, weight, x0, 0.5, false)
      belt(p, k, ink, weight, s.color, x0, 0.5, u * BELT_V)

      outline(p, ink, weight)
      p.line(-mouth * k, -0.46 * k, -W * k, 0.02 * k)
      p.line(mouth * k, -0.46 * k, W * k, 0.02 * k)
      p.line(-mouth * k, -0.46 * k, mouth * k, -0.46 * k)
      p.line((-W - 0.02) * k, 0.04 * k, (W + 0.18) * k, 0.04 * k)

      if (line?.drop) {
        const fall = easeInQuad(seg(u, 0.12, 0.4))
        if (u < 0.4) part(p, k, ink, weight, s.color, 0, lerp(dropY, 0.55, fall))
      } else if (line && !line.out) {
        part(p, k, ink, weight, s.color, 0, dropY)
      } else if (u < 0.47) {
        const x = Math.max(0, u - 0.16) * BELT_V
        if (x <= 0.52) part(p, k, ink, weight, s.color, x, dropY)
      }

      solid(p, ink, weight, s.color)
      p.rect(open * 0.22 * k, 0.02 * k, 2 * W * k, 0.045 * k)
    })
  },
})
