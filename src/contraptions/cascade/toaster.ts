import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutBack, lerp, seg } from '../../core/ease'
import { floor, heading, since, type Beat } from './parts'

/**
 * A toaster at the end of the line: the ball lands on the lever, the lever
 * goes down, and two slices of toast pop — breakfast, and the end of the
 * story — before they sink back in ready for the next ball.
 */
const FIRE = 0
const TOP = 0.1
const BODY_H = 0.36
const BODY_W = 0.52
/** Toast centre, inside the body and popped. */
const IN = TOP + 0.12
const OUT = TOP - 0.2

export const toaster = defineContraption<Beat>({
  name: 'toaster',
  label: 'Toaster',
  tags: ['pop'],
  role: 'sink',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const pop = easeOutBack(seg(t, 0.01, 0.1)) - easeInOutCubic(seg(t, 0.55, 0.72))
    const pressed = seg(t, 0, 0.03) - seg(t, 0.55, 0.6)
    const toastY = lerp(IN, OUT, pop)

    floor(p, k, ink, weight, s, BODY_W / 2 + 0.02)
    outline(p, ink, weight)

    // The toast first, so the body hides whatever is still inside.
    for (const x of [-0.12, 0.12]) {
      solid(p, ink, weight, theme.bg)
      p.rect(x * k, toastY * k, 0.18 * k, 0.24 * k, 0.04 * k)
      outline(p, ink, weight)
      p.line((x - 0.05) * k, (toastY + 0.05) * k, (x + 0.05) * k, (toastY + 0.05) * k)
    }

    solid(p, ink, weight, s.color)
    p.rect(0, (TOP + BODY_H / 2) * k, BODY_W * k, BODY_H * k, 0.05 * k)
    outline(p, ink, weight)
    for (const x of [-0.12, 0.12]) p.line((x - 0.1) * k, TOP * k, (x + 0.1) * k, TOP * k)
    for (const x of [-0.18, 0.18]) p.line(x * k, (TOP + BODY_H) * k, x * k, 0.46 * k)

    // The lever on the side the ball comes from, in a slot.
    const lx = -h * (BODY_W / 2 + 0.03)
    p.line(lx * k, (TOP + 0.04) * k, lx * k, (TOP + 0.2) * k)
    solid(p, ink, weight, s.color)
    p.rect(lx * k, (TOP + 0.05 + 0.12 * pressed) * k, 0.1 * k, 0.06 * k)
  },
})
