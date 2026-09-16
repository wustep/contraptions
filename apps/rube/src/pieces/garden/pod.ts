import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, burst, definePiece, fly, laneAt, over, rail, ramp, roll, wait, type BallChange, type Lane, type Pt } from '../../parts'
import { leaf, stem } from './green'

/**
 * A seed pod lying along the path, its mouth open at the near end, on a
 * stalk from the ground. The ball rolls into the mouth and is gone; a bulge
 * creeps along the pod and the pod swells, and swells, and bursts at the
 * far end — and what shoots out along the path is a seed: a different
 * ball, in the plant's own colour, and the thread goes with it. The husk
 * hangs open after, with the ball still inside it.
 *
 * The pod stands in front of the ball, so the ball goes *into* the mouth
 * and the seed comes *out* between the flaps, instead of either popping.
 * The plant is never the colour of the ball that arrives, so the seed that
 * takes the thread is always a change.
 */
const MOUTH = -0.2
const INSIDE = 0.05
/** Where the body ends and the two flaps of the tip begin, and where the tip points. */
const CUT = 0.16
const FAR = 0.3
const LAND: Pt = [1.2, 0]
/** The pod's half-height, at rest. */
const HALF_H = 0.15
/** The ball is out of sight once its back is inside the mouth. */
const GONE = MOUTH + R
const T_GONE = (0.5 + GONE) / ROLL
const CREEP = 0.25
const SWELL = 0.35
const FIRE = T_GONE + CREEP + SWELL
const V_SHOOT = 3.6
const FLIGHT = (LAND[0] - FAR) / V_SHOOT

/** The one lane: the pod never varies. */
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [GONE, 0], ROLL),
    { from: [GONE, 0], to: [INSIDE, 0], dur: CREEP, ease: 'out', hidden: true },
    wait([INSIDE, 0], SWELL, { hidden: true }),
    // The seed: out from behind the body, through the burst tip, and away.
    ramp([INSIDE, 0], [FAR, 0], 1.5, V_SHOOT),
    fly([FAR, 0], LAND, FLIGHT, 0.12),
    fly(LAND, [LAND[0] + 0.1, 0], 0.03, 0.01),
    ramp([LAND[0] + 0.1, 0], [1.5, 0], 3.4, ROLL),
  ],
  fire: FIRE,
}

export const pod = definePiece<{ color: string }>({
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
    // The plant's colour is the seed's. The ball may have been recoloured on
    // its way here, so a plant the ball's colour takes another from the
    // palette; with nothing else to offer, the pod stays out of the map.
    const others = theme.colors.filter((c) => c !== ball.color)
    if (!others.length) return null
    const plant = color !== ball.color ? color : rng.pick(others)
    const changes: BallChange[] = [{ at: FIRE, relay: true, color: plant }]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: plant }, changes }
  },
  draw: (p, s, { k, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, MOUTH - 0.02)
    rail(p, k, ink, weight, FAR + 0.02, 1.5)
    // The stalk from the ground to the pod's belly, with a leaf.
    stem(p, k, ink, weight * 1.2, -0.1, 0.5, 0.02, FLOOR + 0.08, -0.08)
    leaf(p, k, ink, weight, s.color, -0.12, 0.4, 0.18, Math.PI + 0.7)
    outline(p, ink, weight)
    p.line(0.3 * k, 0.5 * k, 0.6 * k, 0.5 * k)
    p.line(-0.5 * k, 0.5 * k, 0.1 * k, 0.5 * k)
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    // The swell: the pod fattens while the ball is inside, bursts, and slumps.
    const inside = t > T_GONE && since < 0
    const swell = inside ? 1 + 0.3 * over(t, T_GONE + CREEP * 0.5, FIRE) : since >= 0 ? 1 - 0.15 * Math.min(1, over(since, 0, 0.6)) : 1
    const open = since < 0 ? 0 : easeOutCubic(over(since, 0, 0.08))
    // The bulge: where the ball is, once its back is in the mouth; it stays where the ball stops.
    const bx = t < T_GONE ? GONE : since < 0 ? laneAt(LANE, t).x : INSIDE
    const bump = t < T_GONE - 0.05 ? 0 : since < 0 ? 1 : 0.6
    const h = HALF_H * swell

    // The body: a capsule from the mouth to the cut, its skin bulging over the ball.
    const skin = (x: number) => h + 0.07 * bump * Math.exp(-Math.pow((x - bx) / 0.11, 2))
    solid(p, ink, weight, s.color)
    p.beginShape()
    const n = 24
    for (let i = 0; i <= n; i++) {
      const x = MOUTH + h + ((CUT - MOUTH - h) * i) / n
      p.vertex(x * k, -skin(x) * k)
    }
    for (let i = n; i >= 0; i--) {
      const x = MOUTH + h + ((CUT - MOUTH - h) * i) / n
      p.vertex(x * k, skin(x) * k)
    }
    for (let i = 1; i < 12; i++) {
      const a = Math.PI / 2 + (Math.PI * i) / 12
      p.vertex((MOUTH + h + Math.cos(a) * h) * k, Math.sin(a) * skin(MOUTH + h) * k)
    }
    p.endShape(p.CLOSE)
    // The seam along its side, and the mouth at the near end.
    outline(p, ink, weight * 0.8)
    p.line((MOUTH + 0.1) * k, 0.01 * k, (CUT - 0.02) * k, 0.01 * k)
    p.fill(ink)
    p.noStroke()
    p.ellipse((MOUTH + 0.035) * k, 0, 0.05 * k, 0.2 * k)
    // The tip: two flaps hinged at the cut that meet in a point, and swing open at the burst.
    for (const side of [-1, 1]) {
      p.push()
      p.translate(CUT * k, side * h * 0.9 * k)
      p.rotate(-side * 1.3 * open)
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex(-0.01 * k, 0)
      p.vertex((FAR - CUT) * k, -side * h * 0.86 * k)
      p.vertex(0, -side * h * 0.9 * k)
      p.endShape(p.CLOSE)
      p.pop()
    }
    // The burst.
    if (since > 0 && since < 0.25) {
      const f = over(since, 0, 0.25)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, FAR * k, 0, (0.1 + 0.16 * f) * k, (0.16 + 0.22 * f) * k, 6, 0.3 + f)
      p.pop()
    }
  },
})
