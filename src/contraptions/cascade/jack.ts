import { defineContraption } from '../../core/define'
import { coil, outline, solid } from '../../core/draw'
import { clamp, easeInOutCubic, easeOutBack, easeOutElastic, seg } from '../../core/ease'
import { flick, floor, rollLane, since, type Beat } from './parts'

/**
 * A jack-in-the-box at the end of the line: the ball rolls up against the box
 * and trips the latch, the lid flies open and the jack springs up — surprise
 * — and then it is stuffed back in and the lid shut for the next one.
 *
 * The ball stays against the box for exactly `emit`, so the latch is never
 * seen tripping itself.
 */
const FIRE = 0
const BOX = 0.4
const TOP = 0.08
const HEAD = 0.22
/** How far the jack springs. Its hat's point must stay inside the cell. */
const RISE = 0.38
const HAT = 0.11
/** Where the ball comes to rest: touching the latch on the box's near side. */
const SEAT = -0.34

export const jack = defineContraption<Beat>({
  name: 'jack',
  label: 'Jack-in-the-box',
  tags: ['pop'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx, { at: SEAT }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const t = since(u, FIRE)
    // Both curves overshoot, and the hat is the highest thing in the cell, so
    // they are clamped: a jack that springs past the ceiling lands in the row
    // above.
    const open = clamp(easeOutBack(seg(t, 0, 0.1)) - easeInOutCubic(seg(t, 0.62, 0.8)))
    const up = clamp(easeOutElastic(seg(t, 0.02, 0.24)) - easeInOutCubic(seg(t, 0.58, 0.74)))
    const headY = TOP + 0.1 - up * RISE

    floor(p, k, ink, weight, s, BOX / 2 + 0.02)
    outline(p, ink, weight)

    // The jack rides its spring up out of the box; the box front hides the rest.
    coil(p, 0, (TOP + BOX - 0.04) * k, 0, (headY + HEAD / 2) * k, 4, 0.08 * k)
    solid(p, ink, weight, theme.bg)
    p.circle(0, headY * k, HEAD * k)
    p.fill(ink)
    p.circle(-0.045 * k, (headY - 0.02) * k, 0.04 * k)
    p.circle(0.045 * k, (headY - 0.02) * k, 0.04 * k)
    solid(p, ink, weight, s.color)
    p.triangle(-0.1 * k, (headY - HEAD / 2 + 0.03) * k, 0.1 * k, (headY - HEAD / 2 + 0.03) * k, 0, (headY - HEAD / 2 - HAT) * k)

    solid(p, ink, weight, s.color)
    p.rect(0, (TOP + BOX / 2) * k, BOX * k, BOX * k)

    // The lid, hinged on the far side from the ball.
    p.push()
    p.translate((BOX / 2) * k, TOP * k)
    p.rotate(-open * 2.2)
    solid(p, ink, weight, s.color)
    p.rect(-(BOX / 2) * k, -0.03 * k, (BOX + 0.04) * k, 0.06 * k)
    p.pop()
  },
  // The latch stands between the viewer and the ball that trips it.
  over: (p, _s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    p.push()
    p.translate(-(BOX / 2 + 0.02) * k, (TOP + 0.02) * k)
    p.rotate(flick(t, 0.03, 0.2, 0.4) * 1.2)
    outline(p, ink, weight)
    p.line(0, 0, 0, -0.1 * k)
    p.line(0, -0.1 * k, 0.06 * k, -0.1 * k)
    p.pop()
  },
})
