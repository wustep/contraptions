import { defineContraption } from '../core/define'
import { coil, floorRail, outline, solid } from '../core/draw'
import { easeInOutCubic, easeOutBack, easeOutElastic, seg } from '../core/ease'
import { flick, floor, heading, since, type Beat } from './parts'

/**
 * A jack-in-the-box at the end of the line: the ball trips the latch, the lid
 * flies open and the jack springs up — surprise — and then it is stuffed back
 * in and the lid shut for the next one.
 */
const FIRE = 0
const BOX = 0.4
const TOP = 0.08
const HEAD = 0.22

export const jack = defineContraption<Beat>({
  name: 'jack',
  label: 'Jack-in-the-box',
  tags: ['pop'],
  role: 'sink',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const open = easeOutBack(seg(t, 0, 0.1)) - easeInOutCubic(seg(t, 0.62, 0.8))
    const up = easeOutElastic(seg(t, 0.02, 0.24)) - easeInOutCubic(seg(t, 0.58, 0.74))
    const headY = TOP + 0.1 - up * 0.5

    floor(p, k, ink, weight, s, BOX / 2 + 0.02)
    outline(p, ink, weight)
    floorRail(p, k)

    // The jack rides its spring up out of the box; the box front hides the rest.
    outline(p, ink, weight)
    coil(p, 0, (TOP + BOX - 0.04) * k, 0, (headY + HEAD / 2) * k, 4, 0.08 * k)
    solid(p, ink, weight, theme.bg)
    p.circle(0, headY * k, HEAD * k)
    p.fill(ink)
    p.circle(-0.045 * k, (headY - 0.02) * k, 0.04 * k)
    p.circle(0.045 * k, (headY - 0.02) * k, 0.04 * k)
    solid(p, ink, weight, s.color)
    p.triangle(-0.1 * k, (headY - HEAD / 2 + 0.03) * k, 0.1 * k, (headY - HEAD / 2 + 0.03) * k, 0, (headY - HEAD / 2 - 0.14) * k)

    solid(p, ink, weight, s.color)
    p.rect(0, (TOP + BOX / 2) * k, BOX * k, BOX * k)

    // The lid, hinged on the far side, and the latch on the near side.
    p.push()
    p.translate(h * (BOX / 2) * k, TOP * k)
    p.rotate(-h * open * 2.3)
    solid(p, ink, weight, s.color)
    p.rect(-h * (BOX / 2) * k, -0.03 * k, (BOX + 0.04) * k, 0.06 * k)
    p.pop()
    p.push()
    p.translate(-h * (BOX / 2 + 0.02) * k, (TOP + 0.02) * k)
    p.rotate(h * flick(t, 0.03, 0.2, 0.4) * 1.2)
    outline(p, ink, weight)
    p.line(0, 0, 0, -0.1 * k)
    p.line(0, -0.1 * k, h * 0.06 * k, -0.1 * k)
    p.pop()
  },
})
