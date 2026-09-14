import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, rail, ramp, roll, wait, type BallChange, type Lane, type Pt } from '../../parts'
import { leaf, stem } from './green'

/**
 * A seed pod lying along the path, split open at the near end, on a stalk
 * from the ground. The ball rolls into it and is gone; the pod swells,
 * and swells, and bursts at the far end — and what shoots out along the
 * path is a seed: a different ball, in a different colour, and the thread
 * goes with it. The husk hangs open after, with the ball inside it.
 */
const MOUTH = -0.2
const INSIDE = 0.05
const FAR = 0.3
const LAND: Pt = [1.2, 0]
const T_MOUTH = (0.5 + MOUTH) / ROLL
const CREEP = 0.25
const SWELL = 0.35
const FIRE = T_MOUTH + CREEP + SWELL
const FLIGHT = 0.4

export const pod = definePiece<{ color: string; seed: string }>({
  name: 'pod',
  weight: 0.9,
  dynamic: true,
  flight: true,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const pool = theme.colors.filter((c) => c !== ball.color && c !== color)
    const seed = rng.pick(pool.length ? pool : theme.colors)
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [MOUTH, 0], ROLL),
        { from: [MOUTH, 0], to: [INSIDE, 0], dur: CREEP, ease: 'out', hidden: true },
        wait([INSIDE, 0], SWELL, { hidden: true }),
        { from: [INSIDE, 0], to: [FAR, 0], dur: 0.04, hidden: true },
        fly([FAR, 0], LAND, FLIGHT, 0.18),
        fly(LAND, [LAND[0] + 0.12, 0], 0.06, 0.02),
        ramp([LAND[0] + 0.12, 0], [1.5, 0], 2.6, ROLL),
      ],
      fire: FIRE,
    }
    const changes: BallChange[] = [{ at: FIRE, relay: true, color: seed }]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color, seed }, changes }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    // The swell: the pod fattens while the ball is inside, bursts, and slumps.
    const inside = t > T_MOUTH && since < 0
    const swell = inside ? 1 + 0.35 * over(t, T_MOUTH + CREEP * 0.5, FIRE) : since >= 0 ? 1 - 0.15 * Math.min(1, over(since, 0, 0.6)) : 1
    const open = since < 0 ? 0 : easeOutCubic(over(since, 0, 0.1))
    // A bulge that travels along the pod as the ball creeps in.
    const bulge = t > T_MOUTH && t < T_MOUTH + CREEP ? MOUTH + (INSIDE - MOUTH) * easeOutCubic(over(t, T_MOUTH, T_MOUTH + CREEP)) : INSIDE

    rail(p, k, ink, weight, -0.5, MOUTH - 0.02)
    rail(p, k, ink, weight, FAR + 0.02, 1.5)
    // The stalk from the ground to the pod's belly, with a leaf.
    stem(p, k, ink, weight * 1.2, -0.1, 0.5, 0.02, FLOOR + 0.08, -0.08)
    leaf(p, k, ink, weight, s.color, -0.12, 0.4, 0.18, Math.PI + 0.7)
    outline(p, ink, weight)
    p.line(0.3 * k, 0.5 * k, 0.6 * k, 0.5 * k)
    p.line(-0.5 * k, 0.5 * k, 0.1 * k, 0.5 * k)

    // The pod: a bean along the rail, fat round the ball, seam down its side.
    p.push()
    p.translate(((MOUTH + FAR) / 2) * k, 0)
    const half = (FAR - MOUTH) / 2
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-half * k, 0.02 * k)
    p.bezierVertex(-half * 0.6 * k, -0.15 * swell * k, (bulge - (MOUTH + FAR) / 2) * k, -0.19 * swell * k, half * 0.7 * k, -0.14 * swell * k)
    p.bezierVertex(half * 1.1 * k, -0.06 * k, half * 1.1 * k, 0.1 * k, half * 0.7 * k, 0.14 * swell * k)
    p.bezierVertex((bulge - (MOUTH + FAR) / 2) * k, 0.19 * swell * k, -half * 0.6 * k, 0.15 * swell * k, -half * k, 0.02 * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.8)
    p.line(-half * 0.7 * k, 0.01 * k, half * 0.8 * k, 0.01 * k)
    // The mouth at the near end, open a little for the ball.
    p.fill(ink)
    p.noStroke()
    p.ellipse((-half + 0.03) * k, 0.01 * k, 0.05 * k, 0.14 * k)
    // The far end burst open: two flaps hinged at the seam, and the seed's way out.
    if (open > 0) {
      for (const side of [-1, 1]) {
        p.push()
        p.translate(half * 0.65 * k, side * 0.1 * k)
        p.rotate(side * 1.1 * open)
        solid(p, ink, weight, s.color)
        p.ellipse(0.08 * k, 0, 0.18 * k, 0.07 * k)
        p.pop()
      }
    }
    p.pop()
    // The burst.
    if (since > 0 && since < 0.25) {
      const f = over(since, 0, 0.25)
      p.push()
      p.stroke(s.seed)
      p.strokeWeight(weight)
      burst(p, FAR * k, 0, (0.1 + 0.16 * f) * k, (0.16 + 0.22 * f) * k, 6, 0.3 + f)
      p.pop()
    }
  },
})
