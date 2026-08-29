import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInQuad, lerp, seg } from '../../core/ease'
import { belt, BELT_V, BENCH, bench, lineOf, PART, part, PART_Y, partColor } from './shop'

/**
 * The east (or west) end of a bench opens into a chute. The part rolls in,
 * tips over the lip, and falls out the bottom of the cell onto the catch
 * below — the corner of the snake.
 */
const LIP = 0.12

export const spill = defineContraption({
  name: 'spill',
  label: 'Spill',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  fireAt: 0.5,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const through = !!(line?.catch && line?.drop)
    const start = line?.in && !through ? -0.5 - PART / 2 : -0.2
    const x = start + u * BELT_V
    const fall = easeInQuad(seg(u, through ? 0.08 : 0.36, through ? 0.42 : 0.58))
    let pos: [number, number] | null = null
    let angle = 0
    if (through) {
      if (u < 0.5) {
        pos = [0, lerp(-0.5, 0.55, easeInQuad(seg(u, 0, 0.42)))]
        angle = 0.4 * fall
      }
    } else if (u < 0.36) pos = [Math.min(LIP, x), PART_Y]
    else if (u < 0.72) {
      pos = [lerp(LIP, 0.08, fall), lerp(PART_Y, 0.55, fall)]
      angle = 1.2 * fall
    }

    clipCell(p, k, () => {
      if (through) {
        outline(p, ink, weight)
        p.line(-0.16 * k, -0.5 * k, -0.1 * k, 0.5 * k)
        p.line(0.16 * k, -0.5 * k, 0.1 * k, 0.5 * k)
      } else {
        const x0 = line?.in ? -0.5 : -0.36
        bench(p, k, ink, weight, x0, LIP + 0.08, false)
        belt(p, k, ink, weight, s.color, x0, LIP, u * BELT_V)
        outline(p, ink, weight)
        p.line(LIP * k, BENCH * k, 0.22 * k, 0.5 * k)
        p.line((LIP + 0.12) * k, BENCH * k, 0.34 * k, 0.5 * k)
        solid(p, ink, weight, s.color)
        p.circle(LIP * k, BENCH * k, 0.06 * k)
      }

      if (pos) part(p, k, ink, weight, partColor(s), pos[0], pos[1], { angle })
    })
  },
})
