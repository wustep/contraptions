import { outline, solid } from '../../../../src/core/draw'
import { FLOOR, R, ROLL, burst, chain, definePiece, over, rail, ramp, roll, segTime, type Lane, type Pt, type Seg } from '../parts'

/**
 * A gravity inverter. Two coils on posts hold a field between them with a
 * rail along its top, and no rail along the bottom: the ball rolls in, the
 * floor ends, and instead of falling it falls *up* onto the ceiling rail,
 * bobs along it upside down, slower, and at the far coil falls back down
 * onto the rail and carries on as if nothing had happened.
 */
const CEIL = -0.44
const RIDE = CEIL + R
const X0 = 0.5
const X1 = 1.5
/** Where the floor rail ends and starts again, and where the ball leaves and lands. */
const FLIP = 0.3
const DROP = 1.7
const RAIL_END = 0.4
const RAIL_BACK = 1.6
const UPSPEED = 5
/** The ceiling run: from over the first coil to over the second, with a bob and a lull in the middle. */
const RIDE0 = X0 + 0.2
const RIDE1 = X1 - 0.2
const RIDE_DUR = 0.42
const BOB = 0.025

function ride(): Seg[] {
  const n = 12
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const f = i / n
    pts.push([RIDE0 + (RIDE1 - RIDE0) * f, RIDE + BOB * Math.sin(f * Math.PI * 2)])
  }
  return chain(pts, RIDE_DUR, (i) => 0.5 + 0.5 * Math.abs((2 * i) / n - 1))
}
const LIFT = Math.hypot(RIDE0 - FLIP, RIDE) / ((ROLL + UPSPEED) / 2)
const FIRE = (0.5 + FLIP) / ROLL
const T_DROP = LIFT + segTime(ride())

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
        ramp([FLIP, 0], [RIDE0, RIDE], ROLL, UPSPEED),
        ...ride(),
        ramp([RIDE1, RIDE], [DROP, 0], ROLL, UPSPEED),
        ramp([DROP, 0], [2.5, 0], 3, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const inside = since > 0 && since < T_DROP + (Math.hypot(DROP - RIDE1, RIDE) / ((ROLL + UPSPEED) / 2))
    // The floor rail stops short of the field and starts again past it.
    rail(p, k, ink, weight, -0.5, RAIL_END)
    rail(p, k, ink, weight, RAIL_BACK, 2.5)
    outline(p, ink, weight)
    for (const x of [RAIL_END, RAIL_BACK]) p.line(x * k, (FLOOR - 0.05) * k, x * k, (FLOOR + 0.05) * k)
    // The frame: two posts on the ground, the ceiling rail between them.
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
    for (const [at, x, y] of [[0, FLIP, 0], [T_DROP, RIDE1, RIDE]] as [number, number, number][]) {
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
