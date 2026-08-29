import { defineContraption } from '../../core/define'
import { outline } from '../../core/draw'
import { pendulum as pendulumTable, swing } from '../../core/physics'
import { P, flight, ground, knob, performer, rope, since, stroke } from './circus'

/**
 * Two trapezes swing in toward each other twice a loop; at the top of the
 * swing, where both hang still for an instant, the flyer lets go of one bar
 * and catches the other, and rides it out and back to be handed on again.
 */
const ROPE = 0.6
const BAR = 0.07
const HANG = 0.13
/** Where the flyer hangs at the top of the inward swing: just short of the middle. */
const MEET = 0.1
/**
 * The outward turning point mirrors the inward one about the anchor, so the
 * flyer's far edge lands on the frame — 2 * ANCHOR - MEET + P / 2 = 0.97 of
 * a two-cell half-width — instead of in the act next door.
 */
const ANCHOR = (0.97 + MEET - P / 2) / 2
/** The swing that carries the flyer from that wall in to MEET. */
const AMP = Math.asin((ANCHOR - MEET) / (ROPE + HANG))
/** Half the hop, in loop time, either side of the meeting. */
const H = 0.035

export const trapeze = defineContraption({
  name: 'trapeze',
  label: 'Trapeze',
  tags: ['aerial'],
  role: 'source',
  span: [2, 1],
  rotations: [0],
  // The catch.
  fireAt: H,
  setup: ({ color }) => ({ color, table: pendulumTable(AMP) }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Both swing toward the centre together; `a` is the lean toward it.
    const lean = (at: number) => swing(s.table, 2 * at)
    const a = lean(u)
    /** Bar centre and the flyer's spot under it, for the left (-1) or right (1) trapeze. */
    const under = (side: number, ang: number): { bar: [number, number]; fly: [number, number]; dir: [number, number] } => {
      const dir: [number, number] = [-side * Math.sin(ang), Math.cos(ang)]
      const bar: [number, number] = [side * ANCHOR + ROPE * dir[0], -0.5 + ROPE * dir[1]]
      return { bar, fly: [bar[0] + HANG * dir[0], bar[1] + HANG * dir[1]], dir }
    }

    // On the right bar after the catch at 0, hop to the left at 0.5, back at 1.
    let pos: [number, number]
    if (u >= H && u < 0.5 - H) pos = under(1, a).fly
    else if (u >= 0.5 - H && u < 0.5 + H) pos = flight(under(1, lean(0.5 - H)).fly, under(-1, lean(0.5 + H)).fly, 0.05, (u - (0.5 - H)) / (2 * H))
    else if (u >= 0.5 + H && u < 1 - H) pos = under(-1, a).fly
    else pos = flight(under(-1, lean(1 - H)).fly, under(1, lean(H)).fly, 0.05, since(u, 1 - H) / (2 * H))

    outline(p, ink, weight)
    ground(p, k, 2)
    stroke(p, k, -1, -0.5, 1, -0.5)
    rope(p, k, [-1, 0.4], [1, 0.4], 0.05)
    for (const t of [0.2, 0.4, 0.6, 0.8]) stroke(p, k, -1 + 2 * t, 0.41, -1 + 2 * t, 0.48)

    for (const side of [-1, 1]) {
      const { bar, dir } = under(side, a)
      const bx = dir[1] * BAR
      const by = -dir[0] * BAR
      outline(p, ink, weight)
      stroke(p, k, side * ANCHOR - 0.06, -0.5, bar[0] - bx, bar[1] - by)
      stroke(p, k, side * ANCHOR + 0.06, -0.5, bar[0] + bx, bar[1] + by)
      p.strokeWeight(weight * 1.8)
      stroke(p, k, bar[0] - bx, bar[1] - by, bar[0] + bx, bar[1] + by)
      knob(p, k, ink, weight, s.color, side * ANCHOR, -0.5, 0.06)
    }

    performer(p, k, ink, weight, s.color, pos[0], pos[1])
  },
})
