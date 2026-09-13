import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { ROLL, definePiece, over, rail, roll, wait, type Lane } from '../parts'

/**
 * A paddle wheel hung over the line with one blade down in the ball's way.
 * The ball shoulders it going past; the wheel goes round once on the kick
 * and coasts to rest with the next blade down. A relay: nothing waits,
 * something turns, the rhythm gets a beat.
 */
const HUB = -0.18
const BLADE = 0.26
const MEET = -0.05

export const paddle = definePiece<{ color: string }>({
  name: 'paddle',
  weight: 0.9,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const lane: Lane = {
      segs: [roll([-0.5, 0], [MEET, 0], ROLL), wait([MEET, 0], 0.06), roll([MEET, 0], [0.5, 0], ROLL * 0.9, 'out')],
      fire: (0.5 + MEET) / ROLL,
    }
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    const spin = since < 0 ? 0 : -Math.PI * 2 * easeOutCubic(over(since, 0, 0.9))

    // The stand: a post behind the rail with an arm out to the axle.
    outline(p, ink, weight)
    p.line(-0.4 * k, 0.5 * k, -0.4 * k, HUB * k)
    p.line(-0.46 * k, 0.5 * k, -0.34 * k, 0.5 * k)
    p.line(-0.4 * k, HUB * k, 0, HUB * k)

    p.push()
    p.translate(0, HUB * k)
    p.rotate(spin + Math.PI / 2)
    for (let i = 0; i < 4; i++) {
      solid(p, ink, weight, s.color)
      p.rect((BLADE / 2 + 0.02) * k, 0, BLADE * k, 0.09 * k)
      p.rotate(Math.PI / 2)
    }
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, HUB * k, 0.12 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(0, HUB * k, 0.04 * k)

    // Motion lines while it spins.
    if (since > 0 && since < 0.5) {
      const f = over(since, 0, 0.5)
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.arc(0, HUB * k, (0.62 + 0.1 * f) * k, (0.62 + 0.1 * f) * k, -2.6 + spin, -1.6 + spin)
      p.pop()
    }

    // Rail last so the wheel sits on it, not in a hole through it.
    rail(p, k, ink, weight, -0.5, 0.5)
  },
})
