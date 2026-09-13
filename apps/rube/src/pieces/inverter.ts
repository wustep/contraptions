import { outline, solid } from '../../../../src/core/draw'
import { FLOOR, R, ROLL, burst, definePiece, over, rail, roll, type Lane, type Pt } from '../parts'

/**
 * A gravity inverter. Two coils on posts hold a field between them with a
 * rail along its top. The ball rolls in under the first coil and falls up
 * onto the ceiling rail, rolls along it upside down, and at the far coil
 * falls back down to the floor and carries on as if nothing had happened.
 */
const CEIL = -0.44
const RIDE = CEIL + R
const X0 = 0.5
const X1 = 1.5
const FLIP = 0.3
const DROP = 1.7
const LIFT = 0.22

export const inverter = definePiece<{ color: string }>({
  name: 'inverter',
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [FLIP, 0], ROLL),
        { from: [FLIP, 0], to: [X0 + 0.2, RIDE], dur: LIFT, ease: 'in' },
        roll([X0 + 0.2, RIDE], [X1 - 0.2, RIDE], ROLL),
        { from: [X1 - 0.2, RIDE], to: [DROP, 0], dur: LIFT, ease: 'in' },
        roll([DROP, 0], [2.5, 0], ROLL, 'out'),
      ],
      fire: (0.5 + FLIP) / ROLL,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const inside = since > 0 && t < (0.5 + FLIP) / ROLL + LIFT + (X1 - X0 - 0.4) / ROLL + LIFT
    rail(p, k, ink, weight, -0.5, 2.5)
    // The frame: two posts on the ground, the ceiling rail between them.
    outline(p, ink, weight)
    for (const x of [X0, X1]) {
      p.line(x * k, 0.5 * k, x * k, (CEIL - 0.08) * k)
      p.line((x - 0.06) * k, 0.5 * k, (x + 0.06) * k, 0.5 * k)
    }
    p.line((X0 - 0.06) * k, CEIL * k, (X1 + 0.06) * k, CEIL * k)
    // The coils on the posts, three windings each, lit while the field is on.
    for (const x of [X0, X1]) {
      for (let i = 0; i < 3; i++) {
        solid(p, ink, weight, inside ? s.color : bg)
        p.rect(x * k, (-0.3 + i * 0.09) * k, 0.14 * k, 0.07 * k, 0.02 * k)
      }
    }
    // The field: dashed lines between the coils while it is on.
    if (inside) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.setLineDash([0.03 * k, 0.05 * k])
      const drift = (t * 0.4) % 0.08
      for (let y = CEIL + 0.06 + drift; y < FLOOR - 0.04; y += 0.08) p.line((X0 + 0.1) * k, y * k, (X1 - 0.1) * k, y * k)
      ctx.setLineDash([])
      p.pop()
    }
    // The flip and the drop: a ring of lines where the ball leaves a rail.
    const dropAt = LIFT + (X1 - X0 - 0.4) / ROLL
    for (const [at, x, y] of [[0, FLIP, 0], [dropAt, X1 - 0.2, RIDE]] as [number, number, number][]) {
      if (since > at && since < at + 0.22) {
        const f = over(since, at, at + 0.22)
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight)
        burst(p, x * k, y * k, (0.14 + 0.12 * f) * k, (0.18 + 0.16 * f) * k, 6, 0.4)
        p.pop()
      }
    }
  },
})
