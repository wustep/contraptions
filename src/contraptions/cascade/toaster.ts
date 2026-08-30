import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutBack, lerp, seg } from '../../core/ease'
import { floor, rollLane, since, type Beat } from './parts'

/**
 * A toaster at the end of the line: the ball rolls up against the lever, the
 * lever goes down, and two slices of toast pop — breakfast, and the end of
 * the story — before they sink back in ready for the next ball.
 */
const FIRE = 0
const TOP = 0.1
const BODY_H = 0.36
const BODY_W = 0.46
/** Toast centre, inside the body and popped. */
const IN = TOP + 0.12
const OUT = TOP - 0.2
/** Where the ball comes to rest, in the lever's slot on the near side. */
const SEAT = -0.34

export const toaster = defineContraption<Beat>({
  name: 'toaster',
  label: 'Toaster',
  tags: ['pop'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx, { at: SEAT }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const t = since(u, FIRE)
    const pop = easeOutBack(seg(t, 0.01, 0.1)) - easeInOutCubic(seg(t, 0.55, 0.72))
    const toastY = lerp(IN, OUT, pop)

    // The rail runs under the ball and stops at the body's near wall.
    floor(p, k, ink, weight, s, BODY_W / 2 - 0.02)

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
    for (const x of [-0.18, 0.18]) p.line(x * k, (TOP + BODY_H) * k, x * k, 0.48 * k)
  },
  // The lever slides in a slot on the near side, in front of the ball whose
  // arrival pushed it down.
  over: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const pressed = seg(t, 0, 0.03) - seg(t, 0.55, 0.6)
    // Clear of the ball's own circle, or the knob would be drawn across it.
    const lx = -(BODY_W / 2 + 0.035)
    outline(p, ink, weight)
    p.line(lx * k, (TOP + 0.02) * k, lx * k, (TOP + 0.26) * k)
    solid(p, ink, weight, s.color)
    p.rect(lx * k, (TOP + 0.08 + 0.15 * pressed) * k, 0.11 * k, 0.06 * k)
  },
})
