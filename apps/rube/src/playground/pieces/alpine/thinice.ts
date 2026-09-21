import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, laneReach, rail, rankBy, roll, type Lane, type Pt } from '../../../parts'
import { spurt } from './parts-c'
import { iceBlue, snowAt, snowWhite } from './snow'

/**
 * A frozen tarn, cut through: a basin of dark water between two banks of
 * snow, and over it a sheet of ice no thicker than a plank, level with the
 * track, which stops at the near bank. The ball rolls out onto the ice, and
 * the ice will not bear it: a crack opens across the sheet on the ball's
 * heels, and another, and another, the break keeping pace a hand's breadth
 * behind the ball all the way over; each piece let go tips, slops water up
 * at its edges, and bobs itself still as a floe. The ball stays ahead of the
 * break and makes the far bank. The tarn stays broken.
 *
 * A crack opens when the ball's back is a fixed way past it, read off the
 * lane, and a floe is loose once the cracks at both its ends have opened;
 * what it does then is a sprung thing let go, from the moment it was.
 */
export interface ThinIceState {
  /** Two cells of it, or three. */
  wide: 2 | 3
  ice: string
  water: string
}

/** The ice's thickness, and how far under the track's level the water stands. */
const THICK = 0.05
const WATER = FLOOR + THICK - 0.008
const BED = 0.47
/** The banks' lips, inboard of the piece's two edges, and how far the ball's back is past a crack when it opens. */
const LIP = 0.26
const HEELS = R + 0.05
/** The cracks: about this far apart, never evenly. */
const STEPS = [0.36, 0.3, 0.4, 0.33, 0.38, 0.31, 0.37]

function cracks(wide: number): number[] {
  const x0 = -0.5 + LIP
  const x1 = wide - 0.5 - LIP
  const out = [x0]
  for (let i = 0; out[out.length - 1] + STEPS[i % STEPS.length] < x1 - 0.2; i++) out.push(out[out.length - 1] + STEPS[i % STEPS.length])
  out.push(x1)
  return out
}

function laneFor(wide: number): { lane: Lane; edges: number[]; opens: number[] } {
  const edges = cracks(wide)
  const lane: Lane = { segs: [roll([-0.5, 0], [wide - 0.5, 0], ROLL)], fire: (edges[1] + HEELS + 0.5) / ROLL }
  // The crack at the near bank goes with the first one out on the sheet.
  const opens = edges.map((x, i) => laneReach(lane, Math.min(wide - 0.5, (i === 0 ? edges[1] : x) + HEELS)))
  return { lane, edges, opens }
}
const LANES = { 2: laneFor(2), 3: laneFor(3) }

export const thinice = definePiece<ThinIceState>({
  name: 'thinice',
  weight: 0.9,
  place: ({ rng, fits, theme }) => {
    for (const wide of rankBy(rng, [3, 2] as const, (w) => (w === 3 ? 1.2 : 1))) {
      const cells: Pt[] = []
      for (let i = 0; i < wide; i++) cells.push([i, 0])
      if (!fits(cells, [wide, 0])) continue
      // Ice is the palette's whitest colour and the water under it its bluest, whatever the map hands the piece.
      return { cells, exit: { at: [wide, 0], dir: 1 }, lane: LANES[wide].lane, state: { wide, ice: snowWhite(theme), water: iceBlue(theme) } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const { edges, opens } = LANES[s.wide]
    const x0 = edges[0]
    const x1 = edges[edges.length - 1]
    const end = s.wide - 0.5

    // The water, from wall to wall and down to the tarn's bed.
    p.noStroke()
    p.fill(s.water)
    p.beginShape()
    p.vertex(x0 * k, WATER * k)
    p.vertex(x1 * k, WATER * k)
    p.vertex((x1 - 0.07) * k, BED * k)
    p.vertex((x0 + 0.07) * k, BED * k)
    p.endShape(p.CLOSE)
    // The ground, cut through, in one line: the snow up to the near lip, down the tarn's wall, along its bed, up the far wall, and the snow on from the far lip.
    outline(p, ink, weight)
    for (const [edge, lip, hand] of [[-0.5, x0, 1], [end, x1, -1]] as const) {
      p.beginShape()
      p.curveVertex(edge * k, snowAt(edge) * k)
      p.curveVertex(edge * k, snowAt(edge) * k)
      p.curveVertex((edge + hand * LIP * 0.5) * k, (FLOOR + 0.1) * k)
      p.curveVertex((lip - hand * 0.05) * k, (FLOOR + 0.005) * k)
      p.curveVertex(lip * k, (FLOOR + 0.02) * k)
      p.curveVertex(lip * k, (FLOOR + 0.02) * k)
      p.endShape()
    }
    p.beginShape()
    p.vertex(x0 * k, (FLOOR + 0.02) * k)
    p.vertex((x0 + 0.07) * k, BED * k)
    p.vertex((x1 - 0.07) * k, BED * k)
    p.vertex(x1 * k, (FLOOR + 0.02) * k)
    p.endShape()
    rail(p, k, ink, weight, -0.5, x0 - 0.04)
    rail(p, k, ink, weight, x1 + 0.04, end)

    // The sheet, floe by floe: whole until the cracks at both its ends have opened, and then afloat.
    for (let i = 0; i + 1 < edges.length; i++) {
      const loose = t - opens[i + 1]
      const a = edges[i]
      const b = edges[i + 1]
      const mid = (a + b) / 2
      // Let go, a floe dips at the end the ball left by and rocks back, less each time, and drifts a hair off its neighbours.
      const sway = loose > 0 ? Math.exp(-1.7 * loose) * Math.sin(7.5 * loose) : 0
      const tip = (i % 2 ? -0.16 : 0.2) * sway + (loose > 0 ? (i % 2 ? 0.025 : -0.03) * (1 - Math.exp(-3 * loose)) : 0)
      const bob = loose > 0 ? 0.035 * Math.exp(-1.4 * loose) * Math.sin(9 * loose) + 0.012 * (1 - Math.exp(-4 * loose)) : 0
      const gap = loose > 0 ? 0.014 * (1 - Math.exp(-5 * loose)) : 0
      if (loose > 0) spurt(p, k, s.water, b, WATER - 0.02, loose / 0.32, 0.9)
      p.push()
      p.translate(mid * k, (FLOOR + THICK / 2 + bob) * k)
      p.rotate(tip)
      solid(p, ink, weight, s.ice)
      p.rect(0, 0, (b - a - 2 * gap) * k, THICK * k, 0.008 * k)
      p.pop()
    }
  },
})
