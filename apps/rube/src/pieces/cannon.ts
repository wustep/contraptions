import { clipBox, outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, puff, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A cannon. The ball rolls into the breech and strikes the match on its way;
 * the fuse burns for a long second; the bang throws the ball two cells over
 * and one up, onto a landing with a bumper. Smoke. Recoil. The longest fuse
 * in the show, because the wait is the joke.
 */
const BREECH: Pt = [-0.14, 0.02]
const ANGLE = -Math.PI * 0.32
const BARREL = 0.5
const MUZZLE: Pt = [BREECH[0] + Math.cos(ANGLE) * BARREL, BREECH[1] + Math.sin(ANGLE) * BARREL]
const LAND: Pt = [1.72, -1]
const ARRIVE = (0.5 + BREECH[0]) / ROLL
const FUSE = 1.35
const FLIGHT = 0.58
const ARC = 0.62
/** Where the fuse starts, at the back of the breech, and curls out. */
const FUSE_PTS: Pt[] = [
  [-0.24, 0.0],
  [-0.36, -0.08],
  [-0.42, -0.22],
  [-0.3, -0.32],
]

export const cannon = definePiece<{ color: string }>({
  name: 'cannon',
  weight: 1,
  place: ({ color, fits, taste }) => {
    if ((taste.weights.cannon ?? 1) <= 0) return null
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, -1])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], BREECH, ROLL, 'out'),
        wait(BREECH, FUSE, { hidden: true }),
        fly(MUZZLE, LAND, FLIGHT, ARC),
        fly(LAND, [LAND[0] + 0.28, -1], 0.13, 0.07),
        roll([LAND[0] + 0.28, -1], [2.5, -1], ROLL * 1.3, 'out'),
      ],
      fire: ARRIVE + FUSE,
    }
    return { cells, exit: { at: [3, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The rail into the breech, and the landing on the far upper cell.
    rail(p, k, ink, weight, -0.5, -0.3)
    rail(p, k, ink, weight, 1.5, 2.5, -1 + FLOOR)
    outline(p, ink, weight)
    p.line(1.5 * k, (-1 + FLOOR + 0.06) * k, 2.5 * k, (-1 + FLOOR + 0.06) * k)
    p.line(1.62 * k, (-1 + FLOOR + 0.06) * k, 1.62 * k, 0.5 * k)
    p.line(1.56 * k, 0.5 * k, 1.68 * k, 0.5 * k)
    p.line(1.62 * k, -0.35 * k, 2.36 * k, (-1 + FLOOR + 0.06) * k)
    // The bumper at the back of the landing, squashed by the arrival.
    const landAt = ARRIVE + FUSE + FLIGHT
    const squash = t < landAt ? 0 : 1 - over(t, landAt, landAt + 0.3)
    solid(p, ink, weight, s.color)
    p.rect((1.5 + 0.06) * k, (-1 - 0.06) * k, 0.06 * k, 0.28 * k)
    p.rect(LAND[0] * k, (-1 + FLOOR + 0.06 + squash * 0.02) * k, 0.3 * k, (0.08 - squash * 0.03) * k)

    // Smoke, before the barrel so it is behind it.
    if (since > 0 && since < 1.6) {
      const f = over(since, 0, 1.6)
      const e = easeOutCubic(f)
      for (let i = 0; i < 3; i++) {
        const along = 0.12 + e * (0.3 + i * 0.16)
        const x = MUZZLE[0] + Math.cos(ANGLE) * along + i * 0.05 - e * 0.04 * i
        const y = MUZZLE[1] + Math.sin(ANGLE) * along - e * 0.22 * (i + 1)
        const r = (0.05 + 0.1 * e) * (1 - f * 0.6) * (1 - i * 0.18)
        if (f < 0.98 && r > 0.02) puff(p, k, ink, weight, bg, x, y, r)
      }
    }

    // The carriage: two wheels and a bed.
    solid(p, ink, weight, s.color)
    p.rect(-0.1 * k, 0.3 * k, 0.44 * k, 0.1 * k)
    for (const x of [-0.26, 0.06]) {
      solid(p, ink, weight, s.color)
      p.circle(x * k, 0.4 * k, 0.2 * k)
      p.fill(ink)
      p.noStroke()
      p.circle(x * k, 0.4 * k, 0.05 * k)
    }

    // The barrel: a fat rounded rect on the breech pivot, kicked back on the bang.
    const recoil = since < 0 ? 0 : 0.07 * (1 - over(since, 0, 0.4)) * Math.sin(Math.min(1, since / 0.4) * Math.PI)
    p.push()
    p.translate(BREECH[0] * k, BREECH[1] * k)
    p.rotate(ANGLE)
    p.translate(-recoil * k, 0)
    solid(p, ink, weight, s.color)
    p.rect((BARREL / 2 - 0.05) * k, 0, (BARREL + 0.1) * k, 0.22 * k, 0.06 * k)
    outline(p, ink, weight)
    p.line((BARREL - 0.02) * k, -0.13 * k, (BARREL - 0.02) * k, 0.13 * k)
    p.line(0.12 * k, -0.11 * k, 0.12 * k, 0.11 * k)
    solid(p, ink, weight, s.color)
    p.circle(-0.07 * k, 0, 0.14 * k)
    p.pop()

    // The fuse: unlit before the ball, eaten by the spark during the wait,
    // gone after the bang.
    const burn = t < ARRIVE ? 0 : over(t, ARRIVE, ARRIVE + FUSE)
    if (burn < 1) {
      outline(p, ink, weight)
      p.noFill()
      p.beginShape()
      const n = 20
      const start = burn
      for (let i = 0; i <= n; i++) {
        const f = 1 - (start + (1 - start) * (i / n))
        const [x, y] = bezAt(FUSE_PTS, f)
        p.vertex(x * k, y * k)
      }
      p.endShape()
      if (t >= ARRIVE) {
        const [x, y] = bezAt(FUSE_PTS, 1 - burn)
        p.push()
        p.translate(x * k, y * k)
        p.rotate(t * 40)
        p.stroke(s.color)
        p.strokeWeight(weight)
        burst(p, 0, 0, 0.02 * k, 0.08 * k, 5)
        p.pop()
        solid(p, ink, weight, s.color)
        p.circle(x * k, y * k, 0.06 * k)
      }
    }
    // The match striker: a little tongue in the rail the ball flicks on its
    // way into the breech.
    const struck = t < ARRIVE - 0.06 ? 0 : 1 - over(t, ARRIVE + 0.4, ARRIVE + 1)
    p.push()
    p.translate(-0.34 * k, FLOOR * k)
    p.rotate(-0.9 * (1 - struck) - 0.2)
    solid(p, ink, weight, s.color)
    p.rect(0.06 * k, 0, 0.12 * k, 0.035 * k)
    p.pop()

    // The bang.
    if (since > 0 && since < 0.22) {
      const f = over(since, 0, 0.22)
      clipBox(p, k * 6, k * 4, () => {
        p.push()
        p.translate(MUZZLE[0] * k, MUZZLE[1] * k)
        p.stroke(s.color)
        p.strokeWeight(weight * 1.2)
        burst(p, 0, 0, (0.1 + 0.4 * f) * k, (0.22 + 0.5 * f) * k, 9, f)
        if (f < 0.6) {
          p.stroke(ink)
          p.strokeWeight(weight)
          p.noFill()
          p.circle(0, 0, (0.14 + 0.6 * f) * k)
        }
        p.pop()
      })
    }
  },
})

/** A cubic bezier through four control points, at `f`. */
function bezAt(pts: Pt[], f: number): Pt {
  const g = 1 - f
  const [a, b, c, d] = pts
  return [
    g * g * g * a[0] + 3 * g * g * f * b[0] + 3 * g * f * f * c[0] + f * f * f * d[0],
    g * g * g * a[1] + 3 * g * g * f * b[1] + 3 * g * f * f * c[1] + f * f * f * d[1],
  ]
}
