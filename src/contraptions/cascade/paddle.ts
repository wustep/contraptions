import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeOutCubic, seg } from '../../core/ease'
import { floor, heading, rollIn, rollOut, since, token, tokenColor, type Beat } from './parts'

/**
 * A paddle wheel hung over the line with one blade down in the ball's way:
 * the ball hits it going past, the wheel spins a full turn on the kick, and
 * it coasts to rest with the next blade down, ready for the next one.
 */
const FIRE = 0.4
const HUB = -0.2
const BLADE = 0.34

export const paddle = defineContraption<Beat>({
  name: 'paddle',
  label: 'Paddle Wheel',
  tags: ['ball', 'spin'],
  role: 'relay',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    // Kicked round by the ball's direction of travel; four-fold symmetric, so
    // a whole turn closes the loop.
    const spin = -h * Math.PI * 2 * easeOutCubic(seg(t, 0, 0.5))

    floor(p, k, ink, weight, s, BLADE * 0.7)
    outline(p, ink, weight)
    p.line(-0.16 * k, -0.5 * k, 0, HUB * k)
    p.line(0.16 * k, -0.5 * k, 0, HUB * k)

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

    clipCell(p, k, () => {
      const at = rollIn(s, u, FIRE) ?? rollOut(s, u, FIRE)
      if (at) token(p, k, ink, weight, tokenColor(s), at)
    })
  },
})
