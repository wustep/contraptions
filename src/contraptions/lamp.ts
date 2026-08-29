import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'
import { easeInQuad, seg } from '../core/ease'
import { FLOOR, flick, floor, heading, since, type Beat } from './parts'

/**
 * A street lamp over a pedal in the line: the ball presses the pedal going
 * under, the lamp comes on, and it fades as the loop runs down.
 */
const FIRE = 0
const BULB_Y = -0.22
const BULB_D = 0.3
const ARM_Y = -0.44

export const lamp = defineContraption<Beat>({
  name: 'lamp',
  label: 'Lamp',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const lit = 1 - easeInQuad(seg(t, 0.03, 0.6))
    const press = flick(t, 0.04, 0.08, 0.2) * 0.05

    floor(p, k, ink, weight, s, 0.12)
    outline(p, ink, weight)
    floorRail(p, k)
    // The post, the arm over the line, and the cord the bulb hangs on.
    p.line(h * 0.32 * k, 0.5 * k, h * 0.32 * k, ARM_Y * k)
    p.line(h * 0.32 * k, ARM_Y * k, 0, ARM_Y * k)
    p.line(0, ARM_Y * k, 0, (BULB_Y - BULB_D / 2) * k)
    // The pedal, on a stem.
    p.line(0, (FLOOR + press) * k, 0, 0.5 * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLOOR - 0.01 + press) * k, 0.2 * k, 0.05 * k)

    if (lit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      const reach = (BULB_D / 2) * (1.25 + lit * 0.5)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        p.line(Math.cos(a) * BULB_D * 0.6 * k, (BULB_Y + Math.sin(a) * BULB_D * 0.6) * k, Math.cos(a) * reach * k, (BULB_Y + Math.sin(a) * reach) * k)
      }
      p.pop()
    }
    solid(p, ink, weight, lit > 0.02 ? s.color : theme.bg)
    p.circle(0, BULB_Y * k, BULB_D * k)
  },
})
