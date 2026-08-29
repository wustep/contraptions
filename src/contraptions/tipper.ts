import { defineContraption } from '../core/define'
import { clipCell, floorRail, outline, solid } from '../core/draw'
import { easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../core/ease'
import { floor, heading, since, type Beat } from './parts'

/**
 * A tipping tray under a dripping tap: the drips fill it until it
 * overbalances, the dump on the floor is the pulse, and the tray swings back
 * empty and starts filling again.
 */
const FIRE = 0.7
const PIVOT_X = -0.2
const PIVOT_Y = -0.04
const TRAY_H = 0.24
/** The tray is tipped by this much, which lands its lip on the centre. */
const TIP = 1.7
/** The pour and its splash. */
const POUR = 0.12
/** When the tray is back upright and the drips start counting again. */
const REFILL = 0.36

export const tipper = defineContraption<Beat>({
  name: 'tipper',
  label: 'Tipping Tray',
  tags: ['pour'],
  role: 'source',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const t = since(u, FIRE)
    const tip = easeOutCubic(seg(t, 0, 0.06)) - easeInOutCubic(seg(t, 0.2, REFILL))
    const level = t < REFILL ? 1 - easeOutCubic(seg(t, 0, 0.05)) : seg(t, REFILL, 1)

    floor(p, k, ink, weight, s)

    p.push()
    p.scale(heading(s.flow), 1)
    outline(p, ink, weight)
    floorRail(p, k)
    // The tap: a pipe down from the top edge, with a valve wheel on it.
    for (const dx of [-0.035, 0.035]) p.line((PIVOT_X + dx) * k, -0.5 * k, (PIVOT_X + dx) * k, -0.36 * k)
    p.line((PIVOT_X - 0.07) * k, -0.36 * k, (PIVOT_X + 0.07) * k, -0.36 * k)
    p.line((PIVOT_X + 0.035) * k, -0.44 * k, (PIVOT_X + 0.13) * k, -0.44 * k)
    p.circle((PIVOT_X + 0.15) * k, -0.44 * k, 0.07 * k)
    // The post the tray pivots on.
    p.line(PIVOT_X * k, PIVOT_Y * k, PIVOT_X * k, 0.5 * k)

    // Drips, one every tenth of the loop while the tray is filling.
    if (t >= REFILL) {
      const d = ((t - REFILL) % 0.1) / 0.1
      const surface = PIVOT_Y - 0.02 - level * (TRAY_H - 0.04)
      solid(p, ink, weight, s.color)
      p.circle(PIVOT_X * k, lerp(-0.34, surface, easeInQuad(d)) * k, 0.07 * k)
    }

    // The tray, and the water in it.
    p.push()
    p.translate(PIVOT_X * k, PIVOT_Y * k)
    p.rotate(TIP * tip)
    solid(p, ink, weight, theme.bg)
    p.quad(-0.18 * k, -TRAY_H * k, 0.18 * k, -TRAY_H * k, 0.13 * k, 0, -0.13 * k, 0)
    if (level > 0.02) {
      p.push()
      p.noStroke()
      p.fill(s.color)
      const depth = level * (TRAY_H - 0.04)
      p.quad(-0.13 * k, 0, 0.13 * k, 0, (0.13 + 0.05 * level) * k, -depth * k, (-0.13 - 0.05 * level) * k, -depth * k)
      p.pop()
    }
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(PIVOT_X * k, PIVOT_Y * k, 0.07 * k)

    // The pour from the lip onto the centre, and the splash it throws up.
    clipCell(p, k, () => {
      if (t > 0.02 && t < POUR) {
        const f = seg(t, 0.02, POUR)
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight * 3)
        p.line(0.02 * k, 0.02 * k, 0, (0.08 + 0.04 * f) * k)
        p.pop()
      }
      if (t > 0.04 && t < POUR + 0.06) {
        const f = seg(t, 0.04, POUR + 0.06)
        p.push()
        p.noStroke()
        p.fill(s.color)
        const throwX = 0.06 + 0.3 * f
        const throwY = 0.34 * 4 * f * (1 - f)
        const d = lerp(0.09, 0.03, f)
        p.circle(-throwX * k, (0.1 - throwY) * k, d * k)
        p.circle(throwX * k, (0.1 - throwY) * k, d * k)
        p.pop()
      }
    })
    p.pop()
  },
})
