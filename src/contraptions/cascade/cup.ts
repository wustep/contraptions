import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInQuad, lerp, seg } from '../../core/ease'
import { FLOOR, TOKEN, drop, fallIn, heading, rollIn, since, token, tokenColor, type Beat } from './parts'

/**
 * The corner of the snake: the rail runs to a lip, the ball tips over, and
 * a chute carries it out the bottom of the cell onto the catch below.
 * The shaft is drawn whether the ball is falling or not — a cup that only
 * opens at 0.62 reads as a hopper sitting on its own row.
 */
const FIRE = 0
const LIP = 0.1
const CHUTE_X = 0.2
const DUMP0 = 0.3
const DUMP1 = 0.52

export const cup = defineContraption<Beat>({
  name: 'cup',
  label: 'Cup',
  tags: ['ball'],
  role: 'relay',
  inlets: ['E', 'W', 'N'],
  outlets: ['E', 'W', 'S'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const dumping = s.flow?.out === 'S'
    const fall = easeInQuad(seg(t, DUMP0, DUMP1))
    let pos: [number, number] | null = null
    const arriving = rollIn(s, u, FIRE) ?? fallIn(s, u, FIRE)
    if (arriving) pos = arriving
    else if (dumping) {
      if (t < DUMP0) pos = [h * LIP, FLOOR - TOKEN / 2]
      else if (t < DUMP1 + 0.12) {
        pos = [
          h * lerp(LIP, 0.04, fall),
          drop(FLOOR - TOKEN / 2, 0.5 + TOKEN / 2 - (FLOOR - TOKEN / 2), Math.min(1, (t - DUMP0) / (DUMP1 - DUMP0))),
        ]
      }
    } else if (t < 0.5) pos = [0, FLOOR - TOKEN / 2]

    p.push()
    p.scale(h, 1)
    outline(p, ink, weight)
    const from = s.flow?.in === 'E' ? 0.5 : s.flow?.in === 'W' || !s.flow?.in ? -0.5 : -0.2
    p.line(from * k, FLOOR * k, LIP * k, FLOOR * k)
    p.line(LIP * k, FLOOR * k, CHUTE_X * k, 0.5 * k)
    p.line((LIP + 0.14) * k, FLOOR * k, (CHUTE_X + 0.14) * k, 0.5 * k)
    solid(p, ink, weight, s.color)
    p.circle(LIP * k, FLOOR * k, 0.055 * k)
    p.pop()

    clipCell(p, k, () => {
      if (pos) token(p, k, ink, weight, tokenColor(s), pos)
    })
  },
})
