import { defineContraption } from '../../core/define'
import { clipBox, clipCell, outline } from '../../core/draw'
import { mod } from '../../core/ease'
import { BELT_V, BENCH, bench, HIGH_Y, keepX, lineOf, PART, part, PART_Y, partColor, rollers, SHELF } from './shop'

/**
 * A part rolls in under the screw, the turning flights walk it up the tube,
 * and it is set out onto the high shelf at the top.
 */
const W = 0.15
const PITCH = 0.16
/** Nine pitches a loop, so the flights close. */
const V = PITCH * 9
const IN = (0.5 + PART / 2) / BELT_V
const TOP = IN + (PART_Y - HIGH_Y) / V

export const auger = defineContraption({
  name: 'auger',
  label: 'Screw Lift',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  // Set out on the shelf.
  fireAt: TOP,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const raw = u < IN ? -0.5 - PART / 2 + u * BELT_V : u < TOP ? 0 : (u - TOP) * BELT_V
    const px = keepX(raw, lineOf(s))
    const py = u < IN ? PART_Y : u < TOP ? PART_Y - (u - IN) * V : HIGH_Y

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.5, -W, u * BELT_V)

      // The tube: open low on the west to take a part, open high on the east
      // to let it out onto the shelf.
      outline(p, ink, weight)
      p.line(-W * k, -0.5 * k, -W * k, (BENCH - PART - 0.06) * k)
      p.line(W * k, -0.5 * k, W * k, (HIGH_Y - PART / 2 - 0.02) * k)
      p.line(W * k, SHELF * k, W * k, BENCH * k)
      p.line(W * k, SHELF * k, 0.5 * k, SHELF * k)
      p.line(0.44 * k, SHELF * k, 0.44 * k, BENCH * k)
      p.rect(0, -0.47 * k, 0.22 * k, 0.06 * k)

      // The flights, scrolling up the tube.
      clipBox(p, W * 2 * k, k, () => {
        outline(p, ink, weight)
        p.line(0, -0.5 * k, 0, BENCH * k)
        const off = mod(u * V, PITCH)
        for (let y = BENCH + PITCH - off; y > -0.6; y -= PITCH) {
          p.line(-W * k, y * k, W * k, (y - 0.1) * k)
        }
      })

      if (px !== null) part(p, k, ink, weight, partColor(s), px, py)
    })
  },
})
