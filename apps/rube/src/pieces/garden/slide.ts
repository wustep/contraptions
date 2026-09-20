import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, post, rail, ramp, trace, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A playground slide at the path's end. The path runs onto the deck at the
 * top of its ladder, where the ball's pace dies to a crawl; it creeps over
 * the brink, tips down the lip, and goes down the chute gathering pace,
 * round the curve at its foot and out along the flat onto the path a floor
 * down. No mechanism at all: a ladder, a deck, a hoop to hold, a chute.
 *
 * The chute is three pieces of one line — a lip turning over, a straight, a
 * foot turning level — and the ball's lane is that line a radius off it, run
 * down under a cartoon gravity, so the ball is on the chute at every instant
 * and its pace is the slope's.
 */
/** The deck's far edge, where the chute turns over; how steep the straight is; the two curves. */
const BRINK = -0.32
const STEEP = 1.22
const LIP_R = 0.1
const FOOT_R = 0.32
/** The ladder's stiles, under the deck. */
const STILES = [-0.47, -0.33]
/** The chute's bed under its line, and the side wall that stands over it along the run. */
const BED = 0.07
const WALL = 0.04
/** The pace it still has at the brink, and what pulls it down the chute and holds it back. */
const CRAWL = 0.1875
const G = 6.5
const DRAG = 0.45

/** The ball's line is the chute's a radius off it: a wider turn over the lip, a tighter one round the foot. */
const LIP_B = LIP_R + R
const FOOT_B = FOOT_R - R
/** The straight's length, so the whole chute falls exactly a floor. */
const RUN = (1 - (LIP_B + FOOT_B) * (1 - Math.cos(STEEP))) / Math.sin(STEEP)
const LENGTH = LIP_B * STEEP + RUN + FOOT_B * STEEP

/**
 * The chute where the ball is `s` cells along its own line from the brink:
 * the point `off` cells out from the chute's surface on the ball's side —
 * the ball's centre by default, the surface at 0 — and the slope there.
 */
function chute(s: number, off = R): { at: Pt; slope: number } {
  const lip = LIP_B * STEEP
  const out = (x: number, y: number, a: number): { at: Pt; slope: number } => ({ at: [x + (off - R) * Math.sin(a), y - (off - R) * Math.cos(a)], slope: a })
  if (s <= lip) {
    const a = s / LIP_B
    return out(BRINK + LIP_B * Math.sin(a), LIP_B * (1 - Math.cos(a)), a)
  }
  const x1 = BRINK + LIP_B * Math.sin(STEEP)
  const y1 = LIP_B * (1 - Math.cos(STEEP))
  if (s <= lip + RUN) return out(x1 + (s - lip) * Math.cos(STEEP), y1 + (s - lip) * Math.sin(STEEP), STEEP)
  const x2 = x1 + RUN * Math.cos(STEEP)
  const y2 = y1 + RUN * Math.sin(STEEP)
  const a = Math.max(0, STEEP - (s - lip - RUN) / FOOT_B)
  return out(x2 + FOOT_B * (Math.sin(STEEP) - Math.sin(a)), y2 + FOOT_B * (Math.cos(a) - Math.cos(STEEP)), a)
}
/** Where the chute comes level, and the path takes over. */
const FOOT_X = chute(LENGTH).at[0]

/**
 * The ride: how far along its line the ball is, every 1/480 s from the
 * moment it goes over the brink. Gravity along the
 * slope, a drag that keeps the foot from being a launch.
 */
const DT = 1 / 480
const RIDE: number[] = [0]
let paceAtFoot = CRAWL
{
  let s = 0
  let v = CRAWL
  while (s < LENGTH && RIDE.length < 2000) {
    v += (G * Math.sin(chute(s).slope) - DRAG * v) * DT
    s += v * DT
    RIDE.push(s)
  }
  paceAtFoot = v
}
/** Seconds down the chute: the last tick ends where the line does, not a whole tick later. */
const LAST = RIDE.length - 1
const DOWN = (LAST - 1 + (LENGTH - RIDE[LAST - 1]) / (RIDE[LAST] - RIDE[LAST - 1])) * DT

const IN = ramp([-0.5, 0], [BRINK, 0], ROLL, CRAWL)
const T_GO = IN.dur
/** The ball's centre on the chute, `t` seconds into the piece. */
function ballAt(t: number): Pt {
  const f = Math.max(0, Math.min(LAST, (t - T_GO) / DT))
  const i = Math.floor(f)
  const s = RIDE[i] + (RIDE[Math.min(LAST, i + 1)] - RIDE[i]) * (f - i)
  return chute(Math.min(s, LENGTH)).at
}

/** It fires when it is over the lip and away down the straight. */
const FIRE = T_GO + RIDE.findIndex((s) => s >= LIP_B * STEEP) * DT

const LANE: Lane = {
  segs: [IN, ...trace(ballAt, T_GO, T_GO + DOWN, 36), ramp([FOOT_X, 1], [0.5, 1], paceAtFoot, ROLL)],
  fire: FIRE,
}

export const slide = definePiece<{ color: string }>({
  name: 'slide',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    return { cells, exit: { at: [1, 1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, _s, { k, ink, weight }) => {
    // The ground a floor down, and the path out from the chute's foot.
    soil(p, k, ink, weight, -0.5, 0.5, 1.5)
    tuft(p, k, ink, weight, -0.17, 1.5, 0.11, 0.02)
    rail(p, k, ink, weight, FOOT_X, 0.5, 1 + FLOOR)
    post(p, k, ink, weight, 0.44, 1 + FLOOR, 1.5)

    // The ladder up the back: two stiles from the ground to the deck, and its rungs.
    outline(p, ink, weight)
    for (const x of STILES) p.line(x * k, FLOOR * k, x * k, 1.5 * k)
    for (let y = 0.4; y < 1.45; y += 0.24) p.line(STILES[0] * k, y * k, STILES[1] * k, y * k)
    // The leg under the chute.
    const mid = chute(LENGTH * 0.55, -BED).at
    p.line(mid[0] * k, mid[1] * k, mid[0] * k, 1.5 * k)

    // The hoop to hold at the top, from the deck over to the chute's lip.
    p.noFill()
    const lip = chute(LIP_B * STEEP, 0).at
    p.beginShape()
    p.vertex((BRINK - 0.12) * k, FLOOR * k)
    p.bezierVertex((BRINK - 0.12) * k, (FLOOR - 0.3) * k, (BRINK + 0.08) * k, (FLOOR - 0.3) * k, lip[0] * k, lip[1] * k)
    p.endShape()
  },
  over: (p, s, { k, ink, weight }) => {
    // The deck and the chute, one band in front of the ball: the deck's board, then a trough whose
    // near wall stands over the line the ball runs on, from the lip to where the foot comes level.
    const n = 64
    const wall = (f: number) => WALL * easeInOutSine(Math.min(1, f / 0.12, (1 - f) / 0.16))
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.5 * k, FLOOR * k)
    for (let i = 0; i <= n; i++) {
      const { at } = chute((LENGTH * i) / n, wall(i / n))
      p.vertex(at[0] * k, at[1] * k)
    }
    for (let i = n; i >= 0; i--) {
      const { at } = chute((LENGTH * i) / n, -BED)
      p.vertex(at[0] * k, at[1] * k)
    }
    p.vertex(-0.5 * k, (FLOOR + BED) * k)
    p.endShape(p.CLOSE)
  },
})
