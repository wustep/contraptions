import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { BELT_V, BENCH, PART, bench, lineOf, roller, rollers } from './shop'

/**
 * Two counter-turning rolls bite the blank as it arrives, and what comes out
 * the far side is longer and thinner than what went in, moving faster to
 * make up the difference.
 */
const NIP = 0.3
const T_IN = PART
const T_OUT = 0.14
const V_IN = BELT_V
const V_OUT = (BELT_V * T_IN) / T_OUT
/** Loop fraction the blank spends passing through the nip. */
const BITE = PART / V_IN
const ROLL_R = 0.16

export const mill = defineContraption({
  name: 'mill',
  label: 'Rolling Mill',
  tags: ['work', 'convey'],
  role: 'relay',
  rotations: [0],
  fireAt: NIP,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Front and back edges of the blank, each at the speed of its own side.
    const line = lineOf(s)
    let front = u < NIP ? (u - NIP) * V_IN : (u - NIP) * V_OUT
    let back = u < NIP + BITE ? (u - NIP) * V_IN - T_IN : (u - NIP - BITE) * V_OUT
    if (line && !line.out) {
      front = Math.min(front, 0.18)
      back = Math.min(back, 0.18)
    }
    if (line && !line.in) {
      front = Math.max(front, -0.22)
      back = Math.max(back, -0.22)
    }
    const spin = u * Math.PI * 2 * 2

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.5, -0.3, u * V_IN)
      rollers(p, k, ink, weight, s.color, 0.3, 0.5, u * V_OUT)

      if (back < 0.55 && front > -0.55) {
        const slab = (x0: number, x1: number, t: number) => {
          if (x1 - x0 < 0.005) return
          solid(p, ink, weight, s.color)
          p.rect(((x0 + x1) / 2) * k, (BENCH - t / 2) * k, (x1 - x0) * k, t * k, 0.02 * k)
        }
        // Thick behind the nip, thin ahead of it.
        slab(back, Math.min(front, 0), T_IN)
        slab(Math.max(back, 0), front, T_OUT)
      }

      // The stand, and the two rolls: the top one clears the bench by the
      // thickness it leaves behind.
      outline(p, ink, weight)
      for (const x of [-0.3, 0.3]) p.line(x * k, BENCH * k, x * k, -0.38 * k)
      p.line(-0.34 * k, -0.38 * k, 0.34 * k, -0.38 * k)
      p.line(0, -0.38 * k, 0, -0.5 * k)
      p.rect(0, -0.44 * k, 0.14 * k, 0.04 * k)
      roller(p, k, ink, weight, s.color, 0, BENCH + ROLL_R, ROLL_R, spin)
      roller(p, k, ink, weight, s.color, 0, BENCH - T_OUT - ROLL_R, ROLL_R, -spin)
    })
  },
})
