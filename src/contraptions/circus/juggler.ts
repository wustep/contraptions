import { defineContraption } from '../../core/define'
import { clipCell, outline } from '../../core/draw'
import { mod } from '../../core/ease'
import { flight, ground, pedestal, performer, second, stroke } from './circus'

/**
 * Three balls in a cascade: each hand throws to the other every third of a
 * beat, every ball is in the air while the other two are being caught and
 * thrown, and the pattern hands itself on forever — the loop as a trick.
 */
const HAND_X = 0.22
const HAND_Y = 0.24
const LIFT = 0.5
const BALL = 0.15
const BALLS = 3
/** Throws per loop from each hand. */
const THROWS = 6

export const juggler = defineContraption({
  name: 'juggler',
  label: 'Juggler',
  tags: ['parade'],
  role: 'relay',
  rotations: [0],
  fireAt: 0,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color) }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Hands scoop in small circles, one scoop per throw.
    const scoop = Math.PI * 2 * THROWS * u
    const hand = (side: number): [number, number] => [
      side * (HAND_X - 0.03 * Math.cos(scoop)),
      HAND_Y + 0.03 * Math.sin(scoop),
    ]
    const left = hand(-1)
    const right = hand(1)
    const restL: [number, number] = [-HAND_X, HAND_Y - BALL / 2 - 0.02]
    const restR: [number, number] = [HAND_X, HAND_Y - BALL / 2 - 0.02]

    clipCell(p, k, () => {
    outline(p, ink, weight)
    ground(p, k, 1)
    pedestal(p, k, ink, weight, s.color, 0, 0.36, 0.5, 0.5)
    outline(p, ink, weight)
    stroke(p, k, -0.12, 0.36, left[0], left[1] + 0.02)
    stroke(p, k, 0.12, 0.36, right[0], right[1] + 0.02)
    p.arc(left[0] * k, left[1] * k, 0.16 * k, 0.1 * k, 0, Math.PI)
    p.arc(right[0] * k, right[1] * k, 0.16 * k, 0.1 * k, 0, Math.PI)

    for (let i = 0; i < BALLS; i++) {
      // Each ball runs the same cycle a third of a cycle behind the last:
      // fly right, sit in the right hand, fly left, sit in the left.
      const f = mod(2 * u + i / BALLS, 1)
      let pos: [number, number]
      if (f < 0.4) pos = flight(restL, restR, LIFT, f / 0.4)
      else if (f < 0.5) pos = [right[0], right[1] - BALL / 2 - 0.02]
      else if (f < 0.9) pos = flight(restR, restL, LIFT, (f - 0.5) / 0.4)
      else pos = [left[0], left[1] - BALL / 2 - 0.02]
      performer(p, k, ink, weight, i === 1 ? s.alt : s.color, pos[0], pos[1], BALL)
    }
    })
  },
})
