import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { FLOOR, SHAFT, THROAT, TOKEN, drop, fallIn, heading, rollIn, since, token, tokenColor, type Beat } from './parts'

/**
 * The corner of the snake. The rail runs to centre, then a shaft — the same
 * width the catch opens — carries the ball out the bottom of the cell.
 * The shaft is the stitch; a ball parked in a cup is not.
 */
const FIRE = 0
const DUMP0 = 0.28
const DUMP1 = 0.5

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
    const paint = s.flow?.color ?? s.color
    let pos: [number, number] | null = rollIn(s, u, FIRE) ?? fallIn(s, u, FIRE)
    if (!pos && dumping) {
      if (t < DUMP0) pos = [0, FLOOR - TOKEN / 2]
      else if (t < DUMP1 + 0.1) {
        const f = Math.min(1, (t - DUMP0) / (DUMP1 - DUMP0))
        pos = [0, drop(FLOOR - TOKEN / 2, 0.5 + TOKEN / 2 - (FLOOR - TOKEN / 2), f)]
      }
    } else if (!pos && t < 0.45) pos = [0, FLOOR - TOKEN / 2]

    p.push()
    p.scale(h, 1)
    outline(p, ink, weight)
    const from = s.flow?.in === 'E' ? 0.5 : -0.5
    p.line(from * k, FLOOR * k, THROAT * k, FLOOR * k)
    p.noStroke()
    p.fill(paint)
    p.quad((-THROAT) * k, FLOOR * k, THROAT * k, FLOOR * k, SHAFT * k, 0.5 * k, (-SHAFT) * k, 0.5 * k)
    outline(p, ink, weight)
    p.line((-THROAT) * k, FLOOR * k, (-SHAFT) * k, 0.5 * k)
    p.line(THROAT * k, FLOOR * k, SHAFT * k, 0.5 * k)
    solid(p, ink, weight, paint)
    p.circle(0, FLOOR * k, 0.05 * k)
    p.pop()

    clipCell(p, k, () => {
      if (pos) token(p, k, ink, weight, tokenColor(s), pos)
    })
  },
})
