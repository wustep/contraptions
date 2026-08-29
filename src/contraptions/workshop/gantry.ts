import { defineContraption } from '../../core/define'
import { clipBox, outline, solid } from '../../core/draw'
import { easeInOutCubic, lerp, seg } from '../../core/ease'
import { belt, BELT_V, BENCH, bench, PART, part, PART_Y, partColor } from './shop'

/**
 * A part rides in on the low belt and stops at the block, the crane lowers
 * its hook, lifts the part clear, runs it across the shop, and sets it on
 * the high belt, which carries it off east.
 */
const BEAM = -0.94
const PICK_X = -0.5
const DROP_X = 0.5
const OUT_Y = -0.34
const LOW_Y = 0.5 + BENCH
const CARRY = -0.7
const TIP_PICK = 0.5 + PART_Y - PART / 2 - 0.02
const TIP_DROP = OUT_Y - PART - 0.02
const RELEASE = 0.86

export const gantry = defineContraption({
  name: 'gantry',
  label: 'Gantry',
  tags: ['lift', 'line'],
  span: [2, 2],
  rotations: [0],
  fireAt: RELEASE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size: k, u, ink, weight }) => {
    // The trolley: across at 0.64, back through the top of the loop.
    const back = u >= 0.92 ? u - 0.92 : u + 0.08
    const tx =
      u < 0.64 && u >= 0.2 ? PICK_X
      : u < 0.8 && u >= 0.64 ? lerp(PICK_X, DROP_X, easeInOutCubic(seg(u, 0.64, 0.8)))
      : u >= 0.8 && u < 0.92 ? DROP_X
      : lerp(DROP_X, PICK_X, easeInOutCubic(seg(back, 0, 0.28)))
    // The hook's tip.
    const tip =
      u < 0.32 ? CARRY
      : u < 0.44 ? lerp(CARRY, TIP_PICK, easeInOutCubic(seg(u, 0.32, 0.44)))
      : u < 0.48 ? TIP_PICK
      : u < 0.64 ? lerp(TIP_PICK, CARRY, easeInOutCubic(seg(u, 0.48, 0.64)))
      : u < 0.8 ? CARRY
      : u < RELEASE ? lerp(CARRY, TIP_DROP, easeInOutCubic(seg(u, 0.8, RELEASE)))
      : lerp(TIP_DROP, CARRY, easeInOutCubic(seg(u, RELEASE, 0.92)))
    const held = u >= 0.46 && u < RELEASE

    // This loop's part: in along the low belt, on the hook, out along the
    // high belt. Last loop's part is still leaving on the high belt.
    const inX = Math.min(PICK_X, -1 - PART / 2 + u * BELT_V)
    const outX = DROP_X + (u - RELEASE) * BELT_V
    const lastX = DROP_X + (u + 1 - RELEASE) * BELT_V

    clipBox(p, w, h, () => {
      // Low belt to the stop block; the high belt on its columns.
      belt(p, k, ink, weight, s.color, -1, -0.38, u * BELT_V, LOW_Y)
      solid(p, ink, weight, s.color)
      p.rect(-0.35 * k, (LOW_Y - 0.1) * k, 0.04 * k, 0.2 * k)
      bench(p, k, ink, weight, -0.3, 1)
      outline(p, ink, weight)
      for (const x of [0.46, 0.94]) p.line(x * k, (OUT_Y + 0.14) * k, x * k, LOW_Y * k)
      belt(p, k, ink, weight, s.color, 0.36, 1, u * BELT_V, OUT_Y)
      part(p, k, ink, weight, partColor(s), 0.62, 0.5 + PART_Y, { mark: 'dot' })
      part(p, k, ink, weight, partColor(s), 0.62, 0.5 + PART_Y - PART, { mark: 'dot' })

      if (lastX < 1.12) part(p, k, ink, weight, partColor(s), lastX, OUT_Y - PART / 2)
      if (held) part(p, k, ink, weight, partColor(s), tx, tip + 0.02 + PART / 2)
      else if (u < 0.46) part(p, k, ink, weight, partColor(s), inX, 0.5 + PART_Y)
      else if (outX < 1.12) part(p, k, ink, weight, partColor(s), outX, OUT_Y - PART / 2)

      // The gantry: legs, beam, trolley, cable, hook.
      outline(p, ink, weight)
      for (const x of [-0.9, 0.9]) p.line(x * k, BEAM * k, x * k, k)
      p.push()
      p.fill(ink)
      p.rect(0, BEAM * k, 1.9 * k, 0.08 * k)
      p.pop()
      outline(p, ink, weight)
      p.line(tx * k, (BEAM + 0.1) * k, tx * k, (tip - 0.1) * k)
      solid(p, ink, weight, s.color)
      p.rect(tx * k, (BEAM + 0.1) * k, 0.28 * k, 0.12 * k)
      outline(p, ink, weight)
      p.line(tx * k, (tip - 0.1) * k, tx * k, tip * k)
      p.arc((tx - 0.035) * k, tip * k, 0.07 * k, 0.07 * k, 0, Math.PI)
      const eyeY = held ? tip + 0.02 : u < 0.46 ? 0.5 + PART_Y - PART / 2 - 0.02 : OUT_Y - PART - 0.02
      const eyeX = held ? tx : u < 0.46 ? inX : outX
      if (eyeX < 1.12) p.circle(eyeX * k, eyeY * k, 0.06 * k)
    })
  },
})
