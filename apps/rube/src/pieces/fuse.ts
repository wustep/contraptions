import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { FAST, FLOOR, ROLL, burst, definePiece, fly, over, puff, rail, ramp, roll, type Lane, type Pt } from '../parts'

/**
 * A fuse that races the ball. The ball rolls over a striker as it comes
 * in and lights a fuse that runs along under the rail to a keg two cells
 * on; the spark chases the ball the whole way and the keg goes up just as
 * the ball passes it, throwing it on twice as fast. It always wins. Just.
 */
const STRIKE = -0.1
const KEG_X = 2.0
const ARRIVE = (0.5 + STRIKE) / ROLL
const BURN = (KEG_X - STRIKE) / ROLL
const FIRE = ARRIVE + BURN
const FUSE_Y = FLOOR + 0.14

/** The fuse's path: a slow wave under the rail from the striker to the keg. */
const fuseAt = (f: number): Pt => [STRIKE + (KEG_X - 0.2 - STRIKE) * f, FUSE_Y + Math.sin(f * Math.PI * 7) * 0.025]

export const fuse = definePiece<{ color: string }>({
  name: 'fuse',
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
        roll([-0.5, 0], [KEG_X, 0], ROLL),
        fly([KEG_X, 0], [KEG_X + 0.3, 0], 0.09, 0.05),
        ramp([KEG_X + 0.3, 0], [2.5, 0], FAST, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 2.5)
    const burn = t < ARRIVE ? 0 : over(t, ARRIVE, FIRE)
    // The striker: a tongue in the rail that flicks as the ball passes.
    const struck = t < ARRIVE - 0.04 ? 0 : 1 - over(t, ARRIVE + 0.3, ARRIVE + 0.8)
    p.push()
    p.translate((STRIKE - 0.08) * k, FLOOR * k)
    p.rotate(-0.7 * (1 - struck) - 0.15)
    solid(p, ink, weight, s.color)
    p.rect(0.06 * k, 0, 0.12 * k, 0.035 * k)
    p.pop()
    // The fuse, from the spark on to the keg; what is burnt is gone.
    if (since < 0) {
      outline(p, ink, weight)
      p.noFill()
      p.beginShape()
      const n = 40
      for (let i = 0; i <= n; i++) {
        const f = burn + (1 - burn) * (i / n)
        const [x, y] = fuseAt(f)
        p.vertex(x * k, y * k)
      }
      p.endShape()
      for (const x of [0.3, 0.9, 1.5]) if (x > fuseAt(burn)[0]) p.line(x * k, (FUSE_Y - 0.03) * k, x * k, (FLOOR + 0.02) * k)
    }
    // The keg beside the rail, on the ground, until it goes.
    if (since < 0) {
      solid(p, ink, weight, s.color)
      p.rect(KEG_X * k, 0.34 * k, 0.24 * k, 0.28 * k, 0.03 * k)
      outline(p, ink, weight)
      p.line((KEG_X - 0.12) * k, 0.28 * k, (KEG_X + 0.12) * k, 0.28 * k)
      p.line((KEG_X - 0.12) * k, 0.4 * k, (KEG_X + 0.12) * k, 0.4 * k)
      p.line((KEG_X - 0.16) * k, 0.5 * k, (KEG_X + 0.16) * k, 0.5 * k)
    }
    // The spark, chasing the ball along the fuse.
    if (t >= ARRIVE && since < 0) {
      const [x, y] = fuseAt(burn)
      p.push()
      p.translate(x * k, y * k)
      p.rotate(t * 40)
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, 0, 0, 0.02 * k, 0.07 * k, 5)
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(x * k, y * k, 0.05 * k)
    }
    // The bang: a burst, a ring, smoke, and the ground line left behind.
    if (since >= 0) {
      outline(p, ink, weight)
      p.line((KEG_X - 0.16) * k, 0.5 * k, (KEG_X + 0.16) * k, 0.5 * k)
      if (since < 0.3) {
        const f = over(since, 0, 0.3)
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight * 1.2)
        burst(p, KEG_X * k, 0.3 * k, (0.1 + 0.45 * f) * k, (0.25 + 0.55 * f) * k, 9, f)
        if (f < 0.6) {
          p.stroke(ink)
          p.strokeWeight(weight)
          p.noFill()
          p.circle(KEG_X * k, 0.3 * k, (0.16 + 0.7 * f) * k)
        }
        p.pop()
      }
      if (since < 1.6) {
        const f = over(since, 0, 1.6)
        const e = easeOutCubic(f)
        for (let i = 0; i < 3; i++) {
          const x = KEG_X + (i - 1) * 0.16 - e * 0.1 * (i - 1)
          const y = 0.24 - e * 0.3 * (i + 1)
          const r = (0.06 + 0.1 * e) * (1 - f * 0.6) * (1 - i * 0.15)
          if (f < 0.98 && r > 0.02) puff(p, k, ink, weight, bg, x, y, r)
        }
      }
    }
  },
})
