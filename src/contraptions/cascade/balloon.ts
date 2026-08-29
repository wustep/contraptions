import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeOutCubic, seg } from '../../core/ease'
import { beat, drawElevator, drawRideToken, flick, floor, heading, rideOf, type Beat } from './parts'

/**
 * A balloon tethered over the end of the line with a pin on a lever under it:
 * the ball hits the lever, the pin goes up, the balloon pops, and the pump
 * blows up a fresh one for the next ball.
 */
const FIRE = 0
const CENTRE = -0.2
const R = 0.2
const BANG = 0.1
const INFLATE = 0.3
/** The scraps fly to just shy of the ceiling: the room above the balloon's centre, less its heavy stroke. */
const SCATTER = 0.5 + CENTRE - 0.045

export const balloon = defineContraption<Beat>({
  name: 'balloon',
  label: 'Balloon',
  tags: ['pop'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = beat(s, u, FIRE)
    if (rideOf(s)) drawElevator(p, k, ink, weight, s, u)
    const r = t < INFLATE ? 0 : R * easeOutCubic(seg(t, INFLATE, 0.95))

    floor(p, k, ink, weight, s, 0.2)
    outline(p, ink, weight)
    // The pump the balloon fills from, and its tether.
    solid(p, ink, weight, s.color)
    p.rect(0, 0.42 * k, 0.24 * k, 0.16 * k)
    outline(p, ink, weight)
    p.line(0, 0.34 * k, 0, (CENTRE + r + 0.02) * k)

    // The lever and its pin, hinged on the far side.
    p.push()
    p.translate(h * 0.3 * k, 0.16 * k)
    p.rotate(h * flick(t, 0.03, 0.08, 0.3) * 0.5)
    outline(p, ink, weight)
    p.line(0, 0, -h * 0.3 * k, -0.02 * k)
    p.line(-h * 0.26 * k, -0.02 * k, -h * 0.26 * k, -0.12 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(h * 0.3 * k, 0.16 * k, 0.07 * k)

    if (r > 0.02) {
      solid(p, ink, weight, s.color)
      p.circle(0, (CENTRE + R - r) * k, r * 2 * k)
      p.triangle(-0.04 * k, (CENTRE + R + 0.03) * k, 0.04 * k, (CENTRE + R + 0.03) * k, 0, (CENTRE + R - 0.02) * k)
    }

    // The bang: scraps of skin flung outward and fading.
    if (t < BANG) {
      const f = t / BANG
      p.push()
      p.translate(0, CENTRE * k)
      p.stroke(s.color)
      p.strokeWeight(weight * 1.6)
      p.noFill()
      for (let i = 0; i < 6; i++) {
        const d = (R * 0.6 + (SCATTER - R * 0.6) * f) * k
        p.arc(0, 0, d * 2, d * 2, -0.12, 0.12 + 0.2 * (1 - f))
        p.rotate(Math.PI / 3)
      }
      p.pop()
    }
    if (rideOf(s)) drawRideToken(p, k, ink, weight, s, u, FIRE)
  },
})
