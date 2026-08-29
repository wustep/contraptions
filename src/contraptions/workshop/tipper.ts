import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, lerp, seg } from '../../core/ease'
import { BELT_V, BENCH, PART, PART_Y, belt, bench, lineOf, part } from './shop'

/**
 * A blank drops into a counterweighted tray, its weight tips the tray past
 * the balance point, and it slides off the end onto the rollers and away east.
 */
const PIVOT: [number, number] = [-0.25, -0.05]
const TRAY = 0.45
const TILT = 0.61

export const tipper = defineContraption({
  name: 'tipper',
  label: 'Tipper',
  tags: ['feed'],
  role: 'source',
  rotations: [0],
  // The blank hitting the rollers.
  fireAt: 0.46,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const tilt = TILT * (easeInQuad(seg(u, 0.16, 0.34)) - easeInOutCubic(seg(u, 0.52, 0.68)))
    const cos = Math.cos(tilt)
    const sin = Math.sin(tilt)
    /** Tray-local to cell coordinates. */
    const world = (x: number, y: number): [number, number] => [PIVOT[0] + x * cos - y * sin, PIVOT[1] + x * sin + y * cos]

    // The blank: falls into the tray, rides it over, slides off, rolls away.
    let pos: [number, number] | null = null
    let angle = 0
    if (u < 0.14) {
      pos = [world(0.1, -PART / 2)[0], lerp(-0.75, world(0.1, -PART / 2)[1], easeInQuad(seg(u, 0, 0.14)))]
    } else if (u < 0.46) {
      const slide = lerp(0.1, TRAY + PART / 2, easeInQuad(seg(u, 0.3, 0.44)))
      pos = world(slide, -PART / 2)
      angle = tilt
      if (u > 0.44) {
        const f = seg(u, 0.44, 0.46)
        pos = [lerp(pos[0], 0.3, f), lerp(pos[1], PART_Y, f)]
        angle = tilt * (1 - f)
      }
    } else if (u < 0.64) {
      const out = lineOf(s)?.out !== false
      pos = out ? [0.3 + (u - 0.46) * BELT_V, PART_Y] : [0.3, PART_Y]
    }

    clipCell(p, k, () => {
      bench(p, k, ink, weight, PIVOT[0] - 0.02, 0.5)
      belt(p, k, ink, weight, s.color, 0.08, 0.5, u * BELT_V)

      // The post, the counterweight, and the tray on its pivot.
      outline(p, ink, weight)
      p.line(PIVOT[0] * k, BENCH * k, PIVOT[0] * k, PIVOT[1] * k)
      p.push()
      p.translate(PIVOT[0] * k, PIVOT[1] * k)
      p.rotate(tilt)
      outline(p, ink, weight)
      p.rect((TRAY / 2) * k, 0.02 * k, TRAY * k, 0.04 * k)
      p.line(0, 0, 0, -0.16 * k)
      p.line(0, 0, -0.16 * k, 0)
      solid(p, ink, weight, s.color)
      p.circle(-0.16 * k, 0, 0.12 * k)
      p.pop()

      if (pos && pos[0] <= 0.52) part(p, k, ink, weight, s.color, pos[0], pos[1], { angle })
      solid(p, ink, weight, s.color)
      p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.06 * k)
    })
  },
})
