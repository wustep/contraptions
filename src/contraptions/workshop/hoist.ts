import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, lerp, seg } from '../../core/ease'
import { belt, BELT_V, bench, fold, lineOf, PART, part, PART_Y, partColor } from './shop'

/**
 * A hook lowers a blank from the bay above onto the bench, lets go, and hauls
 * back up out of sight while the blank rides off east.
 */
export const hoist = defineContraption({
  name: 'hoist',
  label: 'Hoist',
  tags: ['feed', 'lift'],
  role: 'source',
  rotations: [0],
  // Touchdown.
  fireAt: 0.3,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const f = fold(u)
    const hidden = -0.5 - PART - 0.2
    const down = PART_Y - PART / 2 - 0.04
    // The hook's tip: down from above, a dwell to unhook, back up.
    const tip =
      f < 0.3 ? lerp(hidden, down, easeInOutCubic(seg(f, -0.14, 0.3)))
      : f < 0.4 ? down
      : lerp(down, hidden, easeInOutCubic(seg(f, 0.4, 0.74)))
    const release = easeOutCubic(seg(u, 0.3, 0.36)) - easeInOutCubic(seg(u, 0.74, 0.86))
    // The blank hangs from the hook until touchdown, then rolls away.
    const line = lineOf(s)
    const px = line && !line.out ? 0 : Math.max(0, u - 0.42) * BELT_V
    const py = f < 0.3 ? tip + 0.04 + PART / 2 : PART_Y

    clipCell(p, k, () => {
      bench(p, k, ink, weight, 0, 0.5, false)
      belt(p, k, ink, weight, s.color, 0, 0.5, u * BELT_V)

      // Cable from the bay above, a lifting eye on the blank, a J of a hook.
      outline(p, ink, weight)
      p.line(-0.1 * k, -0.5 * k, 0.1 * k, -0.5 * k)
      p.line(0, -0.5 * k, 0, tip * k)
      if (px < 0.52) {
        part(p, k, ink, weight, partColor(s), px, py)
        outline(p, ink, weight)
        p.circle(px * k, (py - PART / 2 - 0.02) * k, 0.06 * k)
      }
      p.push()
      p.translate(0, (tip - 0.1) * k)
      p.rotate(-release * 0.7)
      outline(p, ink, weight)
      p.line(0, 0, 0, 0.1 * k)
      p.arc(-0.035 * k, 0.1 * k, 0.07 * k, 0.07 * k, 0, Math.PI)
      solid(p, ink, weight, s.color)
      p.circle(0, 0, 0.06 * k)
      p.pop()
    })
  },
})
