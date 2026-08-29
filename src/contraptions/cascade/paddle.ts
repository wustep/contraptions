import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeOutCubic, seg } from '../../core/ease'
import { floor, rollLane, since, type Beat } from './parts'

/**
 * A paddle wheel hung over the line with one blade down in the ball's way:
 * the ball hits it going past, the wheel spins a full turn on the kick, and
 * it coasts to rest with the next blade down, ready for the next one.
 *
 * The lane pauses for a moment against the blade, so the kick and the ball
 * are the same event rather than two things that happen to coincide.
 */
const FIRE = 0.4
const HUB = -0.18
/** Short of the rail so the wheel is mounted over a continuous line. */
const BLADE = 0.26
/** Where the ball meets the hanging blade. */
const MEET = -0.05

export const paddle = defineContraption<Beat>({
  name: 'paddle',
  label: 'Paddle Wheel',
  tags: ['ball', 'spin'],
  role: 'relay',
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx, { at: MEET, time: 0.02 }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    // Kicked round the way the ball travels; four-fold symmetric, so a whole
    // turn closes the loop.
    const spin = -Math.PI * 2 * easeOutCubic(seg(t, 0, 0.5))

    outline(p, ink, weight)
    // A short A-frame over the hub — not a mast to the cell roof.
    p.line(-0.14 * k, (HUB - 0.14) * k, 0, HUB * k)
    p.line(0.14 * k, (HUB - 0.14) * k, 0, HUB * k)

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

    // Rail last so the wheel sits on it instead of painting a hole through it.
    floor(p, k, ink, weight, s)
  },
})
