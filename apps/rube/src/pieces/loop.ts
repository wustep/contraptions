import { outline, solid } from '../../../../src/core/draw'
import { FAST, FLOOR, R, ROLL, arcPts, chain, definePiece, over, rail, ramp, type Lane, type Pt } from '../parts'

/**
 * A loop-the-loop. The rail dips into the loop and the ball goes round —
 * slow at the top, fast at the bottom, the way a real one is — and out the
 * far side onto the rail again. A pennant on top flaps as it passes. No
 * mechanism at all; the cleanest beat in the show, placed to break the
 * rhythm of ones that wait.
 */
const CX = 0.5
const TRACK = 0.42
const PATH = TRACK - R
const CY = -PATH
const V0 = 5.4
const G = 9

export const loop = definePiece<{ color: string }>({
  name: 'loop',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    // Round from the bottom, heading east: angle falling from π/2 through 0
    // to -3π/2. Segment speeds from energy: v² = v0² − 2gh.
    const pts = arcPts(CX, CY, PATH, Math.PI / 2, Math.PI / 2 - Math.PI * 2, 20)
    const speed = (i: number) => {
      const h = CY + PATH - pts[i][1]
      return Math.sqrt(Math.max(4, V0 * V0 - 2 * G * h))
    }
    let total = 0
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / speed(i)
    const round = chain(pts, total, speed)
    const into = ramp([-0.5, 0], [CX, 0], ROLL, FAST)
    const lane: Lane = {
      segs: [into, ...round, ramp([CX, 0], [1.5, 0], FAST, ROLL)],
      fire: into.dur,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 1.5)
    // A rim in colour, the track in paper, the ball runs inside.
    solid(p, ink, weight, s.color)
    p.circle(CX * k, CY * k, (TRACK + 0.06) * 2 * k)
    solid(p, ink, weight, bg)
    p.circle(CX * k, CY * k, TRACK * 2 * k)
    // Struts to the ground on both sides.
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      const ax = CX + side * (TRACK + 0.03) * Math.cos(0.5)
      const ay = CY + (TRACK + 0.03) * Math.sin(0.5)
      p.line(ax * k, ay * k, (CX + side * 0.62) * k, 0.5 * k)
      p.line((CX + side * 0.56) * k, 0.5 * k, (CX + side * 0.68) * k, 0.5 * k)
    }
    // The rail through the bottom of the loop is the track; re-ink it over the rim.
    outline(p, ink, weight)
    p.line((CX - 0.3) * k, FLOOR * k, (CX + 0.3) * k, FLOOR * k)
    // The pennant.
    const top = CY - TRACK - 0.06
    p.line(CX * k, top * k, CX * k, (top - 0.2) * k)
    const flap = since < 0 ? 0 : (1 - over(since, 0, 1.4)) * Math.sin(since * 30) * 0.06
    solid(p, ink, weight, s.color)
    p.triangle(CX * k, (top - 0.2) * k, (CX + 0.2) * k, (top - 0.15 + flap) * k, CX * k, (top - 0.09) * k)
  },
})
