import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { LIP, cable, car, carLocalY, guides, sheave, shopBeat, shopTravel } from '../../worlds/goldberg/elevator'
import { BELT_V, FEED_WEST, PART, PART_Y, belt, bench, lineOf, part } from './shop'

/**
 * A V-funnel over the bench. One blank sits in the throat; the gate lets
 * it drop onto the rollers. When this cell dumps south, the blank boards
 * the elevator car instead of falling off the lip.
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
    const fill = line?.color ?? s.color
    const W = 0.055
    const mouth = 0.3
    const open = easeOutCubic(seg(u, 0, 0.05)) - easeInOutCubic(seg(u, 0.16, 0.22))
    const dropY = lerp(catcher ? -0.4 : -0.12, PART_Y, easeInQuad(seg(u, catcher ? 0 : 0.02, 0.12)))
    const ride = line?.ride
    const dumping = !!line?.drop || (ride && ride.index === 0)
    const x0 = dumping ? (line?.in ? -0.5 : FEED_WEST) : line?.in || catcher ? -0.5 : FEED_WEST
    const x1 = dumping ? -LIP : 0.5

    clipCell(p, k, () => {
      bench(p, k, ink, weight, x0, x1, false)
      belt(p, k, ink, weight, fill, x0, x1, u * BELT_V)
      outline(p, ink, weight)
      p.line(-mouth * k, -0.46 * k, -W * k, 0.02 * k)
      p.line(mouth * k, -0.46 * k, W * k, 0.02 * k)
      p.line(-mouth * k, -0.46 * k, mouth * k, -0.46 * k)
      p.line((-W - 0.02) * k, 0.04 * k, (W + 0.18) * k, 0.04 * k)
      solid(p, ink, weight, s.color)
      p.rect(open * 0.22 * k, 0.02 * k, 2 * W * k, 0.045 * k)
    })

    if (dumping) {
      const stack = ride ?? { index: 0, floors: 1 }
      const v = shopBeat(u)
      const travel = shopTravel(v, stack.floors)
      const y = carLocalY(travel, stack.index)
      guides(p, k, ink, weight, 0.04, 0.55)
      sheave(p, k, ink, weight, 0.02, travel * 6)
      if (y !== null && y > 0) {
        cable(p, k, ink, weight, 0.02, y - 0.12)
        car(p, k, ink, weight, fill, y, PART / 2)
      }
      if (v < 0.5) part(p, k, ink, weight, fill, 0, dropY)
      else if (y !== null) part(p, k, ink, weight, fill, 0, y)
    } else if (line && !line.out) {
      part(p, k, ink, weight, fill, 0, dropY)
    } else if (u < 0.47) {
      // The blank rides the belt out through the seam; the bench east draws
      // its own half of the hand-off, so this side is clipped at the wall.
      const x = Math.max(0, u - 0.16) * BELT_V
      clipCell(p, k, () => part(p, k, ink, weight, fill, x, dropY))
    }
  },
})
