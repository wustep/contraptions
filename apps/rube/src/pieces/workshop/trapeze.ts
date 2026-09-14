import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, arrive, arriveAt, chain, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'

/**
 * A trapeze. A basket hangs from a high beam, held at the west end of its
 * swing by a pin. The ball rolls off the rail into it; its weight pulls
 * the pin; the basket swings down through the gap and up the far side,
 * where a catch takes it, and the ball rolls out onto the rail. Two cells
 * of nothing underneath, crossed on a rope.
 */
const PIVOT: Pt = [1, -1.15]
const ROPE = 1.4
const HALF = 0.61
const PIN = 0.35
const SWING = 1.1
const ARRIVE = arriveAt(0.2)
const FIRE = ARRIVE + PIN

/** The basket's angle from the vertical, west negative. */
const angleAt = (since: number) => {
  if (since < 0) return -HALF
  if (since < SWING) {
    // A pendulum's quarter, roughly: slow off the top, fast through the bottom, slow into the catch.
    const f = over(since, 0, SWING)
    return -HALF * Math.cos(f * Math.PI)
  }
  return HALF - 0.04 * Math.exp(-(since - SWING) * 5) * Math.cos((since - SWING) * 30)
}
const basketAt = (a: number): Pt => [PIVOT[0] + Math.sin(a) * ROPE, PIVOT[1] + Math.cos(a) * ROPE]

export const trapeze = definePiece<{ color: string }>({
  name: 'trapeze',
  flight: true,
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, -1],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, 0])) return null
    // The ball rides the basket: points along the arc, quick through the bottom.
    const n = 16
    const pts: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const a = -HALF * Math.cos((i / n) * Math.PI)
      const [x, y] = basketAt(a)
      pts.push([x, y - ROPE + 0.02 + (ROPE - Math.cos(a) * ROPE) * 0 + (Math.cos(a) * ROPE - ROPE)])
    }
    // (the basket's floor is the rope's end; the ball sits 0.02 above it)
    const ride = pts.map(([x], i) => [x, basketAt(-HALF * Math.cos((i / n) * Math.PI))[1] - 0.0] as Pt)
    const speed = (i: number) => 0.25 + Math.sin((i / n) * Math.PI)
    const swing = chain(ride, SWING, speed)
    const start = ride[0]
    const end = ride[ride.length - 1]
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], start),
        wait(start, PIN),
        ...swing,
        wait(end, 0.12),
        fly(end, [end[0] + 0.16, 0], 0.08, 0.02),
        ramp([end[0] + 0.16, 0], [2.5, 0], 1.5, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const a = angleAt(since)
    const [bx, by] = basketAt(a)
    const west = basketAt(-HALF)
    const east = basketAt(HALF)

    // The rails to the ends of the swing, and the frame: a beam on two posts.
    rail(p, k, ink, weight, -0.5, west[0] - 0.16)
    rail(p, k, ink, weight, east[0] + 0.16, 2.5)
    outline(p, ink, weight)
    p.line(-0.15 * k, (PIVOT[1] - 0.12) * k, 2.15 * k, (PIVOT[1] - 0.12) * k)
    for (const x of [-0.1, 2.1]) {
      p.line(x * k, (PIVOT[1] - 0.12) * k, x * k, 0.5 * k)
      p.line((x - 0.06) * k, 0.5 * k, (x + 0.06) * k, 0.5 * k)
    }
    p.line(PIVOT[0] * k, (PIVOT[1] - 0.12) * k, PIVOT[0] * k, PIVOT[1] * k)
    // The pin at the west end, pulled by the basket sinking; the catch at the east.
    const pulled = t < ARRIVE ? 0 : since < 0 ? over(t, ARRIVE + 0.1, FIRE) : 1
    p.push()
    p.translate((west[0] - 0.2) * k, (west[1] - 0.12) * k)
    p.rotate(-0.8 * pulled)
    solid(p, ink, weight, s.color)
    p.rect(0.08 * k, 0, 0.16 * k, 0.04 * k)
    p.pop()
    outline(p, ink, weight)
    p.line((west[0] - 0.2) * k, (west[1] - 0.12) * k, (west[0] - 0.2) * k, FLOOR * k)
    const caught = since < SWING ? 0 : 1
    p.push()
    p.translate((east[0] + 0.2) * k, (east[1] - 0.12) * k)
    p.rotate(0.5 * (1 - caught))
    solid(p, ink, weight, s.color)
    p.rect(-0.08 * k, 0, 0.16 * k, 0.04 * k)
    p.pop()
    outline(p, ink, weight)
    p.line((east[0] + 0.2) * k, (east[1] - 0.12) * k, (east[0] + 0.2) * k, FLOOR * k)

    // The ropes and the basket.
    outline(p, ink, weight)
    for (const dx of [-0.12, 0.12]) p.line(PIVOT[0] * k, PIVOT[1] * k, (bx + dx * Math.cos(a)) * k, (by - 0.06 + dx * Math.sin(a)) * k)
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.07 * k)
    p.push()
    p.translate(bx * k, by * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.rect(0, FLOOR * k, 0.34 * k, 0.05 * k)
    outline(p, ink, weight)
    p.line(-0.17 * k, FLOOR * k, -0.17 * k, -0.1 * k)
    p.line(0.17 * k, FLOOR * k, 0.17 * k, -0.1 * k)
    p.pop()
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The basket's front bar, so the ball rides inside it.
    const a = angleAt(since)
    const [bx, by] = basketAt(a)
    p.push()
    p.translate(bx * k, by * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.rect(0, 0.04 * k, 0.34 * k, 0.04 * k)
    p.pop()
  },
})
