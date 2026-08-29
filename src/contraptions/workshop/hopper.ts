import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BELT_V, PART, PART_Y, bench, part, rollers } from './shop'

/**
 * A gate slides open under a stack of blanks, the bottom blank drops onto the
 * rollers and rides off east, and the stack settles one slot to be topped up
 * from above.
 */
export const hopper = defineContraption({
  name: 'hopper',
  label: 'Hopper',
  tags: ['feed'],
  role: 'source',
  rotations: [0],
  weight: 1.3,
  // The blank landing on the rollers.
  fireAt: 0.12,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const W = 0.17
    const open = easeOutCubic(seg(u, 0, 0.05)) - easeInOutCubic(seg(u, 0.16, 0.22))
    const settle = easeOutCubic(seg(u, 0.24, 0.36))
    /** Centre of stacked slot `i`, counting up from the gate. */
    const slot = (i: number) => -PART / 2 - 0.03 - i * (PART + 0.02)

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.24, 0.5, u * BELT_V)

      // The magazine: open at the top so it can be topped up, a gate track
      // at the bottom for the slide to run out along.
      outline(p, ink, weight)
      for (const x of [-W, W]) p.line(x * k, -0.5 * k, x * k, 0)
      p.line((-W - 0.05) * k, 0.055 * k, (W + 0.32) * k, 0.055 * k)

      // The stack. The slot above the cell is where the next blank comes from.
      for (let i = 0; i < 3; i++) part(p, k, ink, weight, s.color, 0, slot(i + 1 - settle))

      // The blank the gate lets go: straight down, then away on the rollers.
      if (u < 0.47) {
        const y = lerp(slot(0), PART_Y, easeInQuad(seg(u, 0.02, 0.12)))
        const x = Math.max(0, u - 0.16) * BELT_V
        part(p, k, ink, weight, s.color, x, y)
      }

      solid(p, ink, weight, s.color)
      p.rect(open * 0.3 * k, 0.025 * k, 2 * W * k, 0.05 * k)
    })
  },
})
