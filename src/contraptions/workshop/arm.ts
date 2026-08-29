import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { clamp, easeInOutCubic, lerp, seg } from '../../core/ease'
import { BELT_V, PART, PART_Y, bench, keepX, lineOf, part, rollers } from './shop'

/**
 * A part rolls in and stops, the arm comes down and closes on it, swings it
 * over the gap, and sets it on the far rollers to roll away.
 */
const SHOULDER: [number, number] = [0, -0.4]
const L1 = 0.3
const L2 = 0.28
const GRIP = 0.1
const REACH = 0.28
const CARRY = -0.14
const DOWN = PART_Y - PART / 2 - GRIP
const SET = 0.72

export const arm = defineContraption({
  name: 'arm',
  label: 'Pick and Place',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  fireAt: SET,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // The wrist: down, up, across, down, up, back.
    const wx =
      u < 0.42 ? -REACH
      : u < 0.62 ? lerp(-REACH, REACH, easeInOutCubic(seg(u, 0.42, 0.62)))
      : u < 0.86 ? REACH
      : lerp(REACH, -REACH, easeInOutCubic(seg(u, 0.86, 1)))
    const dip = (a: number, b: number) => easeInOutCubic(seg(u, a, a + 0.1)) - easeInOutCubic(seg(u, b, b + 0.1))
    const wy = lerp(CARRY, DOWN, dip(0.18, 0.32) + dip(0.62, 0.76))
    const closed = easeInOutCubic(seg(u, 0.28, 0.32)) - easeInOutCubic(seg(u, SET, SET + 0.04))
    const held = u >= 0.3 && u < SET + 0.02

    // Two-link IK, elbow always to the east.
    const tx = wx - SHOULDER[0]
    const ty = wy - SHOULDER[1]
    const d = Math.hypot(tx, ty)
    const bend = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
    const a1 = Math.atan2(ty, tx) - bend
    const ex = SHOULDER[0] + Math.cos(a1) * L1
    const ey = SHOULDER[1] + Math.sin(a1) * L1

    const line = lineOf(s)
    let px = held ? wx : u < 0.3 ? Math.min(-REACH, -0.5 - PART / 2 + u * BELT_V) : REACH + Math.max(0, u - 0.76) * BELT_V
    const py = held ? wy + GRIP + PART / 2 : PART_Y
    if (!held) {
      const kept = keepX(px, line)
      px = kept === null ? 99 : kept
    }

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.5, -0.14, u * BELT_V)
      rollers(p, k, ink, weight, s.color, 0.14, 0.5, u * BELT_V)

      if (px < 0.56) part(p, k, ink, weight, s.color, px, py)

      // Mount, upper arm, forearm, hubs.
      outline(p, ink, weight)
      p.line(-0.12 * k, -0.5 * k, 0.12 * k, -0.5 * k)
      p.line(SHOULDER[0] * k, -0.5 * k, SHOULDER[0] * k, SHOULDER[1] * k)
      p.strokeWeight(weight * 1.6)
      p.line(SHOULDER[0] * k, SHOULDER[1] * k, ex * k, ey * k)
      p.line(ex * k, ey * k, wx * k, wy * k)
      solid(p, ink, weight, s.color)
      p.circle(SHOULDER[0] * k, SHOULDER[1] * k, 0.09 * k)
      p.circle(ex * k, ey * k, 0.07 * k)

      // The gripper: a stem and two jaws that close on the part.
      const gap = PART + 0.02 + 0.08 * (1 - closed)
      outline(p, ink, weight)
      p.line(wx * k, wy * k, wx * k, (wy + GRIP - 0.05) * k)
      p.line((wx - gap / 2) * k, (wy + GRIP - 0.05) * k, (wx + gap / 2) * k, (wy + GRIP - 0.05) * k)
      for (const side of [-1, 1]) {
        p.line((wx + (side * gap) / 2) * k, (wy + GRIP - 0.05) * k, (wx + (side * gap) / 2) * k, (wy + GRIP + PART * 0.55) * k)
      }
      solid(p, ink, weight, s.color)
      p.circle(wx * k, wy * k, 0.06 * k)
    })
  },
})
