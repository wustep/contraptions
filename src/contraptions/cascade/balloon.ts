import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeOutCubic, seg } from '../../core/ease'
import { FLOOR, flick, floor, rollLane, since, type Beat } from './parts'

/**
 * A balloon tethered over the end of the line with a pin on a treadle under
 * it: the ball rolls onto the far end of the beam, the pin comes up, the
 * balloon pops, and the pump blows up a fresh one for the next ball.
 *
 * The ball stays on the beam for exactly `emit`, so the pin is never seen
 * rising on its own.
 */
const FIRE = 0
const CENTRE = -0.2
const R = 0.2
const BANG = 0.1
const INFLATE = 0.18
/** The treadle: its pivot, the pin's end, the ball's end, and the tip. */
const PIV_X = 0.06
const PIN_X = -0.08
const SEAT = 0.24
const HORN = 0.14
const TIP = 0.26

export const balloon = defineContraption<Beat>({
  name: 'balloon',
  label: 'Balloon',
  tags: ['pop'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx, { at: SEAT }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const r = t < INFLATE ? 0 : R * easeOutCubic(seg(t, INFLATE, 0.95))
    const tip = flick(t, 0.03, 0.08, 0.3) * TIP

    // The rail runs out where the treadle takes over.
    floor(p, k, ink, weight, s, -PIN_X)
    // The pump the balloon fills from, and its tether.
    solid(p, ink, weight, s.color)
    p.rect(0, 0.42 * k, 0.24 * k, 0.16 * k)
    outline(p, ink, weight)
    p.line(0, 0.34 * k, 0, (CENTRE + R + 0.02) * k)

    // The treadle: the ball's weight on the far end drives the pin up under
    // the balloon. Its deck is the rail's height, so the ball rolls straight
    // off one onto the other.
    const west = PIN_X - PIV_X
    const east = SEAT + HORN - PIV_X
    p.push()
    p.translate(PIV_X * k, FLOOR * k)
    p.rotate(tip)
    solid(p, ink, weight, s.color)
    p.rect(((west + east) / 2) * k, 0.025 * k, (east - west) * k, 0.05 * k)
    outline(p, ink, weight)
    p.line(west * k, 0, west * k, -0.115 * k)
    for (const side of [-1, 1]) {
      const x = SEAT + side * HORN - PIV_X
      p.line(x * k, 0, x * k, -0.05 * k)
    }
    p.pop()
    outline(p, ink, weight)
    p.line(PIV_X * k, (FLOOR + 0.05) * k, PIV_X * k, 0.34 * k)
    solid(p, ink, weight, s.color)
    p.circle(PIV_X * k, (FLOOR + 0.05) * k, 0.07 * k)

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
        const d = (R * 0.6 + R * 1.6 * f) * k
        p.arc(0, 0, d * 2, d * 2, -0.12, 0.12 + 0.2 * (1 - f))
        p.rotate(Math.PI / 3)
      }
      p.pop()
    }
  },
})
