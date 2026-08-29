import { defineContraption } from '../../core/define'
import { coil, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutBack, easeOutElastic, seg } from '../../core/ease'
import { beat, drawElevator, drawRideToken, flick, floor, heading, rideOf, type Beat } from './parts'

/**
 * A jack-in-the-box at the end of the line: the ball trips the latch, the lid
 * flies open and the jack springs up — surprise — and then it is stuffed back
 * in and the lid shut for the next one.
 */
const FIRE = 0
const BOX = 0.4
const TOP = 0.08
const HEAD = 0.22
/** Head centre to the tip of the hat. */
const HAT = HEAD / 2 + 0.14
/** easeOutElastic's first crest, its highest overshoot (sin = 1 at x = 0.15). */
const SPRINGY = easeOutElastic(0.15)
/** The rise that puts the hat's tip on the ceiling at the crest of the spring. */
const RISE = (TOP + 0.1 + 0.47 - HAT) / SPRINGY
/** The lid on its hinge: it flings until its far edge lands on the wall at the back-ease's crest (1.1). */
const FLING = Math.acos((BOX / 2 - 0.475) / BOX) / 1.1

export const jack = defineContraption<Beat>({
  name: 'jack',
  label: 'Jack-in-the-box',
  tags: ['pop'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const h = heading(s.flow)
    const t = beat(s, u, FIRE)
    if (rideOf(s)) drawElevator(p, k, ink, weight, s, u)
    const open = easeOutBack(seg(t, 0, 0.1)) - easeInOutCubic(seg(t, 0.62, 0.8))
    const up = easeOutElastic(seg(t, 0.02, 0.24)) - easeInOutCubic(seg(t, 0.58, 0.74))
    const headY = TOP + 0.1 - up * RISE

    floor(p, k, ink, weight, s, BOX / 2 + 0.02)
    outline(p, ink, weight)

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
    p.rotate(-h * open * FLING)
    solid(p, ink, weight, s.color)
    // Exactly the mouth wide: any longer and its tip drags below the box mid-swing.
    p.rect(-h * (BOX / 2) * k, -0.03 * k, BOX * k, 0.06 * k)
    p.pop()
    p.push()
    p.translate(-h * (BOX / 2 + 0.02) * k, (TOP + 0.02) * k)
    p.rotate(h * flick(t, 0.03, 0.2, 0.4) * 1.2)
    outline(p, ink, weight)
    p.line(0, 0, 0, -0.1 * k)
    p.line(0, -0.1 * k, h * 0.06 * k, -0.1 * k)
    p.pop()
    if (rideOf(s)) drawRideToken(p, k, ink, weight, s, u, FIRE)
  },
})
