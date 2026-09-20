import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, rail, ramp, roll, type Lane, type Pt, type Seg } from '../../../parts'

/**
 * A xylophone stood up as a flight of steps: five bars on two rails, each
 * a fifth of a floor under the last and longer, so their ends make the
 * treads. The top bar is level with the rail, and the ball rolls out along
 * it and off its end; it comes down on the end of the next, which dips on
 * its rail like a seesaw and rings, shivering, and throws the ball on to the
 * next, each bounce a little lower and a little slower; off the longest bar
 * onto the rail a floor down. Each bar is its own colour, and none of them
 * the ball's.
 *
 * Every hop is a thrown thing's: one gravity for all of them, and the arc
 * of each is what that gravity gives a ball that rises so far and falls a
 * step further.
 */
export interface XylophoneState {
  colors: string[]
  /** When the ball strikes each bar after the first, in piece seconds. */
  hits: number[]
}

const BARS = 5
const STEP = 1 / BARS
const THICK = 0.09
const WEST = -0.45
/** Where the top bar ends; how far in from a bar's end the ball comes down on it. */
const FIRST_END = -0.22
const IN = 0.1
const G = 24
/** How high each bar throws the ball, and how fast it goes on along the steps after each. */
const RISE = [0, 0.05, 0.046, 0.042, 0.038]
const PACE = [ROLL, 1.55, 1.5, 1.45, 1.4]

/** Where the ball strikes: the end of the top bar, then a point on each bar below, then the rail. */
const { LANE, LANDS, HITS } = (() => {
  const segs: Seg[] = [roll([-0.5, 0], [FIRST_END, 0], ROLL)]
  const lands: Pt[] = [[FIRST_END, 0]]
  const hits: number[] = []
  let t = segs[0].dur
  let at: Pt = [FIRST_END, 0]
  for (let i = 0; i < BARS; i++) {
    const T = Math.sqrt((2 * RISE[i]) / G) + Math.sqrt((2 * (RISE[i] + STEP)) / G)
    const to: Pt = [at[0] + PACE[i] * T, (i + 1) * STEP]
    segs.push(fly(at, to, T, (G * T * T) / 8))
    t += T
    hits.push(t)
    lands.push(to)
    at = to
  }
  segs.push(ramp(at, [1.5, 1], PACE[BARS - 1], ROLL))
  return { LANE: { segs, fire: hits[0] } as Lane, LANDS: lands, HITS: hits }
})()

/** Bar `i`'s east end: a little past where the ball strikes it. */
const endOf = (i: number) => (i === 0 ? FIRST_END : LANDS[i][0] + IN)
const topOf = (i: number) => FLOOR + i * STEP
/** The post the bars are tied to, and how far in from a bar's end the slanting rail passes under it. */
const POST = WEST + 0.09
const NODE = 0.2

export const xylophone = definePiece<XylophoneState>({
  name: 'xylophone',
  weight: 1,
  place: ({ fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    // A bar a colour, round the palette, leaving out the one the ball arrives in.
    const pool = theme.colors.filter((c) => c !== ball.color)
    const colors = Array.from({ length: BARS }, (_, i) => pool[i % pool.length])
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { colors, hits: HITS } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    // The rail in, and the rail out under the longest bar's end.
    rail(p, k, ink, weight, -0.5, WEST)
    rail(p, k, ink, weight, endOf(BARS - 1) + 0.04, 1.5, 1 + FLOOR)

    // The frame: a post the bars are tied to at their west ends, a rail slanting down under their east ends, and a
    // post from its foot to the floor.
    outline(p, ink, weight)
    const nodeX = (i: number) => endOf(i) - NODE
    const last = BARS - 1
    p.line(POST * k, (topOf(0) + THICK) * k, POST * k, 1.5 * k)
    p.line(nodeX(0) * k, (topOf(0) + THICK) * k, nodeX(last) * k, (topOf(last) + THICK) * k)
    p.line(nodeX(last) * k, (topOf(last) + THICK) * k, nodeX(last) * k, 1.5 * k)
    p.line((POST - 0.06) * k, 1.5 * k, (nodeX(last) + 0.06) * k, 1.5 * k)

    // The bars. Struck, one's free end goes down under the blow and comes back, shivering as it rings.
    for (let i = 0; i < BARS; i++) {
      const since = i === 0 ? -1 : t - s.hits[i - 1]
      const ring = since > 0 ? Math.exp(-since * 5) : 0
      const w = endOf(i) - WEST
      const dip = since > 0 ? (0.05 / w) * ring * Math.cos(since * 38) * (since < 0.04 ? since / 0.04 : 1) : 0
      p.push()
      p.translate(POST * k, (topOf(i) + THICK / 2) * k)
      p.rotate(dip)
      solid(p, ink, weight, s.colors[i])
      p.rect((WEST + w / 2 - POST) * k, 0, w * k, THICK * k, 0.02 * k)
      p.pop()
    }
  },
})
