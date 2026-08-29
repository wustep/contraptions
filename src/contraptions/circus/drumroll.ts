import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { lerp } from '../../core/ease'
import { block, fade, ground, knob, rings, stroke } from './circus'

/**
 * Two beaters trade strokes on the drum faster and faster through the loop
 * — the drumroll — and when the signal lands they come down together for
 * the crash, dent the skin, and start the roll over slow.
 */
const SKIN_Y = 0.16
const SKIN_W = 0.7
const BEAT_X = 0.18
const DOWN = SKIN_Y - 0.07 - 0.05
const UP = -0.22
/** The roll: tempo climbs from 5 to 25 strokes a loop, a whole number in all. */
const TEMPO0 = 5
const TEMPO1 = 25

export const drumroll = defineContraption({
  name: 'drumroll',
  label: 'Drumroll',
  tags: ['band'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme, fired }) => {
    const phase = Math.PI * 2 * (TEMPO0 * u + ((TEMPO1 - TEMPO0) / 2) * u * u)
    const lift = [(1 + Math.sin(phase)) / 2, (1 - Math.sin(phase)) / 2].map((h) => h * (1 - fired))
    const dent = 0.35 * fired

    outline(p, ink, weight)
    ground(p, k, 1)
    rings(p, k, s.color, weight, 0, SKIN_Y - 0.06, 0.22, fade(u, 0, 0.2), -Math.PI / 2, 2)

    block(p, k, ink, weight, s.color, 0, (SKIN_Y + 0.5) / 2, SKIN_W, 0.5 - SKIN_Y)
    // Tension ropes zigzag down the shell.
    outline(p, ink, weight)
    for (let i = 0; i < 6; i++) {
      const x0 = -SKIN_W / 2 + (SKIN_W / 6) * i
      const x1 = x0 + SKIN_W / 6
      if (i % 2 === 0) stroke(p, k, x0, SKIN_Y + 0.06, x1, 0.46)
      else stroke(p, k, x0, 0.46, x1, SKIN_Y + 0.06)
    }
    solid(p, ink, weight, theme.bg)
    p.ellipse(0, SKIN_Y * k, SKIN_W * k, 0.14 * (1 - dent) * k)

    for (const [i, h] of lift.entries()) {
      const x = (i === 0 ? -1 : 1) * BEAT_X
      const y = lerp(DOWN + 0.05 * dent, UP, h)
      outline(p, ink, weight)
      stroke(p, k, x, -0.5, x, y)
      knob(p, k, ink, weight, s.color, x, y, 0.1)
    }
  },
})
