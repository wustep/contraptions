import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { seg } from '../../core/ease'
import { beat, drawElevator, drawRideToken, flick, floor, heading, rideOf, type Beat } from './parts'

/**
 * A bell hung over the end of the line with its clapper down in the ball's
 * way: the ball knocks the clapper, the bell rings and rocks on its yoke, and
 * that is what everything before it was for.
 */
const FIRE = 0
const BW = 0.48
const BH = 0.32
const CROWN = -0.42
/** Where the clapper hangs from, inside the bell. */
const HINGE = CROWN + BH * 0.4

export const bell = defineContraption<Beat>({
  name: 'bell',
  label: 'Bell',
  tags: ['strike', 'signal'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = beat(s, u, FIRE)
    if (rideOf(s)) drawElevator(p, k, ink, weight, s, u)
    const hit = 1 - seg(t, 0, 0.18)
    const rock = h * hit * 0.22 * Math.sin(hit * Math.PI * 4)

    floor(p, k, ink, weight, s)

    if (hit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (const side of [-1, 1]) {
        for (let i = 1; i <= 2; i++) {
          const r = BW * (0.9 + i * 0.3 + hit * 0.25) * k
          p.arc(side * BW * 0.42 * k, (CROWN + BH * 0.5) * k, r, r, side > 0 ? -0.55 : Math.PI - 0.55, side > 0 ? 0.55 : Math.PI + 0.55)
        }
      }
      p.pop()
    }

    p.push()
    p.translate(0, -0.5 * k)
    p.rotate(rock)
    outline(p, ink, weight)
    p.line(0, 0, 0, (CROWN + 0.5) * k)
    p.fill(s.color)
    p.beginShape()
    p.vertex((-BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.bezierVertex((-BW / 2) * k, (CROWN + 0.5) * k, -BW * 0.22 * k, (CROWN + 0.5) * k, 0, (CROWN + 0.5) * k)
    p.bezierVertex(BW * 0.22 * k, (CROWN + 0.5) * k, (BW / 2) * k, (CROWN + 0.5) * k, (BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.endShape(p.CLOSE)
    p.line((-BW / 2) * k, (CROWN + 0.5 + BH) * k, (BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.pop()

    // The clapper, hinged inside the bell and hanging on down to the ball's line.
    p.push()
    p.translate(0, HINGE * k)
    p.rotate(h * flick(t) * 0.7 + rock * 0.5)
    outline(p, ink, weight)
    p.line(0, 0, 0, -HINGE * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -HINGE * k, 0.13 * k)
    p.pop()
    if (rideOf(s)) drawRideToken(p, k, ink, weight, s, u, FIRE)
  },
})
