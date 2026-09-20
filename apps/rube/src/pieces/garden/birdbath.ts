import { outline, solid } from '../../../../../src/core/draw'
import { lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, chain, definePiece, fly, over, rail, ramp, roll, type Lane, type Pt, type Seg } from '../../parts'
import { drop, gardenWater, soil, tuft } from './green'

/**
 * A birdbath: a shallow bowl on a pedestal, its rim level with the path,
 * which runs straight into it. The ball rolls over the rim and drops into
 * the water with a splash; the water carries it round — along the near
 * side, back along the far side seen against the far rim, and round again
 * — slowing as it goes, until it comes to the spout notch in the near-right
 * of the rim and rolls out of it onto the path. Rings spread on the water
 * and settle.
 *
 * The bowl is seen a little from above: its rim is an ellipse, the water
 * fills it, and the ball's ride round is the same ellipse drawn in a size
 * smaller. The near half of the rim is drawn over the ball, so the ball is
 * in the bowl and not on it.
 */
/** The rim: level with the path, seen from a little above. */
const CX = 0.05
const RIM: Pt = [0.36, 0.1]
const DEPTH = 0.15
/** The ball's ride: the rim's ellipse drawn in, its centre a little under the rim's line. */
const RIDE: Pt = [0.24, 0.06]
const BY = 0.1
/** Where on the ellipse it joins, having dropped in from the left, and where it leaves through the notch. Angles run the near side to the right. */
const JOIN = Math.PI - 0.55
const NOTCH = 0.45
const TURNS = 1
/** Its pace on the water, in and out. */
const V_IN = 2.4
const V_OUT = 1.5
const OUT: Pt = [0.43, 0]

const onRide = (a: number): Pt => [CX + RIDE[0] * Math.cos(a), BY + RIDE[1] * Math.sin(a)]
const EDGE = CX - RIM[0]
const T_EDGE = (0.5 + EDGE) / ROLL
const DROP = 0.1
const FIRE = T_EDGE + DROP

const LANE: Lane = (() => {
  const n = 48
  const a1 = NOTCH - TURNS * Math.PI * 2
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) pts.push(onRide(JOIN + ((a1 - JOIN) * i) / n))
  const speed = (i: number) => lerp(V_IN, V_OUT, i / n)
  let total = 0
  for (let i = 1; i <= n; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / speed(i)
  const round: Seg[] = chain(pts, total, speed)
  return {
    segs: [
      roll([-0.5, 0], [EDGE, 0], ROLL),
      fly([EDGE, 0], pts[0], DROP, 0.02),
      ...round,
      ramp(pts[n], OUT, V_OUT, 2.0),
      ramp(OUT, [0.5, 0], 2.0, ROLL),
    ],
    fire: FIRE,
  }
})()
const SPLASH: Pt = LANE.segs[1].to

/** The splash's drops: which way each is thrown and how hard. */
const DROPS: [number, number][] = [
  [-1.1, 2.0],
  [-0.5, 2.8],
  [0.15, 3.2],
  [0.7, 2.6],
  [1.2, 1.8],
]

export const birdbath = definePiece<{ color: string; water: string }>({
  name: 'birdbath',
  weight: 1,
  place: ({ color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color, water: gardenWater(theme, ball.color) } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    // The path in to the rim, and out from the notch; the ground.
    rail(p, k, ink, weight, -0.5, EDGE)
    rail(p, k, ink, weight, OUT[0] - 0.02, 0.5)
    soil(p, k, ink, weight, -0.5, 0.5)
    tuft(p, k, ink, weight, -0.42, 0.5, 0.1, -0.02)

    // The pedestal on its foot, and the bowl on it: one dish under the rim's line.
    solid(p, ink, weight, bg)
    p.rect(CX * k, 0.47 * k, 0.32 * k, 0.06 * k, 0.01 * k)
    p.beginShape()
    p.vertex((CX - 0.09) * k, (FLOOR + DEPTH - 0.02) * k)
    p.vertex((CX + 0.09) * k, (FLOOR + DEPTH - 0.02) * k)
    p.quadraticVertex((CX + 0.03) * k, 0.36 * k, (CX + 0.08) * k, 0.44 * k)
    p.vertex((CX - 0.08) * k, 0.44 * k)
    p.quadraticVertex((CX - 0.03) * k, 0.36 * k, (CX - 0.09) * k, (FLOOR + DEPTH - 0.02) * k)
    p.endShape(p.CLOSE)
    solid(p, ink, weight, s.color)
    p.arc(CX * k, FLOOR * k, RIM[0] * 2 * k, DEPTH * 2 * k, 0, Math.PI, p.CHORD)
    // The water, filling the rim.
    p.noStroke()
    p.fill(s.water)
    p.ellipse(CX * k, FLOOR * k, RIM[0] * 2 * k, RIM[1] * 2 * k)
    // The far rim, behind the ball.
    outline(p, ink, weight)
    p.arc(CX * k, FLOOR * k, RIM[0] * 2 * k, RIM[1] * 2 * k, Math.PI, Math.PI * 2)

    // The rings from where the ball went in, spreading and fading.
    for (const [delay, reach] of [
      [0, 0.17],
      [0.15, 0.12],
    ]) {
      const f = over(since, delay, delay + 1.1)
      if (f <= 0 || f >= 1) continue
      outline(p, ink, weight * 0.9 * (1 - f))
      p.ellipse(SPLASH[0] * k, (FLOOR + 0.01) * k, (0.06 + reach * f) * 2 * k, (0.02 + reach * 0.3 * f) * 2 * k)
    }
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The near rim: a lip in the bowl's colour over the ball, with the spout notch open in it.
    const lip = (col: string, w: number) => {
      p.noFill()
      p.stroke(col)
      p.strokeWeight(w)
      p.arc(CX * k, FLOOR * k, RIM[0] * 2 * k, RIM[1] * 2 * k, NOTCH + 0.32, Math.PI + 0.02)
    }
    lip(ink, weight * 3.6)
    lip(s.color, weight * 2)
    // The notch's two lips, down to the path out.
    outline(p, ink, weight)
    const nx = CX + RIM[0] * Math.cos(NOTCH + 0.32)
    const ny = FLOOR + RIM[1] * Math.sin(NOTCH + 0.32)
    p.line(nx * k, (ny + 0.02) * k, (OUT[0] - 0.02) * k, (FLOOR + 0.05) * k)
    p.line((CX + RIM[0]) * k, FLOOR * k, (OUT[0] - 0.02) * k, FLOOR * k)

    // The splash: water thrown up as the ball goes in, falling back.
    if (since > 0 && since < 0.5) {
      for (const [vx, vy] of DROPS) {
        const x = SPLASH[0] + vx * since * 0.5
        const y = SPLASH[1] - vy * since + 9 * since * since
        if (y < FLOOR + 0.02) drop(p, k, s.water, x, y, 0.03 * (1 - since * 0.8))
      }
    }
  },
})
