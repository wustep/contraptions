import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, laneAt, over, post, rail, ramp, roll, segTime, wait, type Lane, type Pt, type Seg } from '../../../parts'
import { arcadeWater, flash, glow, lamp, score } from '../../../pieces/arcade/neon'

/**
 * A log flume. The rail runs to the stern of a stubby boat-shaped log
 * waiting at the top of the chute on a catch; the ball hops in over the
 * transom and its weight slips the catch. The log slides off the station
 * and down the chute, a floor over two cells in a stream of water, faster
 * all the way, and ploughs into the pool at the foot: a splash in the
 * water's colour, the flume lamp lights, two hundred, and the log stops
 * dead in the water while the ball, which nothing was holding, rides the
 * wave on over the log's nose onto the dock and rolls out. The log rocks
 * in the pool a while, and is winched back up later.
 *
 * The chute is one curve, the height of the ball's line at every x; the
 * log, the stream and the lane are all drawn from it, and the log's pace
 * down it is a sliding thing's.
 */
export interface FlumeState {
  color: string
  water: string
}

/** The ball's line: the station, where the chute starts to drop, the foot at the pool. */
const STATION: Pt = [-0.1, 0]
const X_SLIDE = 0.05
const FOOT: Pt = [0.98, 1]
/** The log: stern and nose from the seat, its gunwale over the seat's floor, its hull's depth under it. */
const STERN = 0.16
const NOSE = 0.18
const GUNWALE = 0.09
const HULL = 0.22
/** The chute's bed runs this far under the ball's line; the stream on it. */
const UNDER = HULL + 0.02
const X_BED0 = -0.32
/** The pool at the foot, and the dock past it. */
const POOL_X0 = 0.8
const DOCK_X = FOOT[0] + 0.3
const WATER_Y = 1 + FLOOR + 0.07
/** The log stops here, its nose against the dock. */
const X_STOP = DOCK_X - NOSE - 0.01
/** A push off the catch, and show gravity down the chute. */
const V_PUSH = 1.0
const G = 9

const smoother = (u: number) => {
  const c = clamp(u)
  return c * c * c * (c * (c * 6 - 15) + 10)
}
/** The height of the ball's line at `x`. */
function lineAt(x: number): number {
  if (x <= X_SLIDE) return STATION[1]
  if (x <= FOOT[0]) return STATION[1] + (FOOT[1] - STATION[1]) * smoother((x - X_SLIDE) / (FOOT[0] - X_SLIDE))
  return FOOT[1]
}
const slopeAt = (x: number) => (lineAt(x + 1e-4) - lineAt(x - 1e-4)) / 2e-4
/** A point `d` under the ball's line at `x`, square to it. */
const under = (x: number, d: number): Pt => {
  const m = slopeAt(x)
  const n = Math.hypot(1, m)
  return [x - (m / n) * d, lineAt(x) + d / n]
}
/** The chute's bed, end to end. */
const BED: Pt[] = []
for (let bx = X_BED0; bx <= POOL_X0 + 0.1 + 1e-9; bx += 0.02) BED.push(under(bx, UNDER))
/** The log's pace at `x`: what the push and the drop have given it. */
const paceAt = (x: number) => Math.sqrt(V_PUSH * V_PUSH + 2 * G * (lineAt(x) - STATION[1]))

/** The hop in over the transom, and the catch. */
const EDGE: Pt = [STATION[0] - STERN - 0.12, 0]
const HOP = 0.09
const CATCH = 0.25
const board: Seg[] = [roll([-0.5, 0], EDGE, ROLL), fly(EDGE, STATION, HOP, 0.05), wait(STATION, CATCH)]
const T_GO = segTime(board)
/** The ride, in short runs along the line. */
const ride: Seg[] = []
{
  const step = 0.03
  let x = STATION[0]
  let v = V_PUSH
  while (x < FOOT[0] - 1e-9) {
    const nx = Math.min(FOOT[0], x + step)
    const nv = paceAt(nx)
    ride.push(ramp([x, lineAt(x)], [nx, lineAt(nx)], v, nv))
    x = nx
    v = nv
  }
}
const T_SPLASH = T_GO + segTime(ride)
const V_FOOT = paceAt(FOOT[0])
/** The log ploughs to a stop in the pool; the ball goes on over its nose to the dock. */
const BRAKE = (2 * (X_STOP - FOOT[0])) / V_FOOT
const LAND: Pt = [DOCK_X + 0.14, 1]
const THROW = (LAND[0] - FOOT[0]) / (V_FOOT * 0.7)
const LANE: Lane = {
  segs: [...board, ...ride, fly(FOOT, LAND, THROW, 0.1), fly(LAND, [LAND[0] + 0.04, 1], 0.03, 0.005), ramp([LAND[0] + 0.04, 1], [1.5, 1], V_FOOT * 0.6, ROLL)],
  fire: T_SPLASH,
}
/** The log is winched back up from here. */
const RESET = 2.6

/** Where the log's seat is along the line. */
function logAt(t: number): number {
  if (t <= T_GO) return STATION[0]
  if (t <= T_SPLASH) return laneAt(LANE, t).x
  const s = t - T_SPLASH
  if (s < BRAKE) return FOOT[0] + V_FOOT * s - ((V_FOOT / BRAKE) * s * s) / 2
  if (s < RESET) return X_STOP
  return X_STOP + (STATION[0] - X_STOP) * clamp((s - RESET) / 2.5)
}

/** The log's frame: origin on the ball's line at `x`, turned to the chute, and rocked by `rock`. */
function inLog(p: p5, k: number, x: number, rock: number, draw: () => void): void {
  p.push()
  p.translate(x * k, lineAt(x) * k)
  p.rotate(Math.atan(slopeAt(x)) + rock)
  draw()
  p.pop()
}
/** The hull: one shape, a low transom, a floor under the ball, a nose rising a little. */
function hull(p: p5, k: number, ink: string, weight: number, color: string): void {
  solid(p, ink, weight, color)
  p.beginShape()
  for (const [x, y] of [
    [-STERN, GUNWALE],
    [-STERN, HULL - 0.04],
    [-STERN + 0.05, HULL],
    [NOSE - 0.06, HULL],
    [NOSE, HULL - 0.08],
    [NOSE, 0.06],
    [NOSE - 0.05, GUNWALE],
  ] as Pt[])
    p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}
/** The splash off the bow: drops up and out, each on its own arc. */
const DROPS: [number, number][] = [
  [0.4, -3.2],
  [0.9, -3.8],
  [1.4, -3.4],
  [1.9, -2.8],
  [0.2, -2.4],
  [1.1, -2.2],
  [2.3, -2.0],
  [-0.3, -2.6],
]

export const flume = definePiece<FlumeState>({
  name: 'flume',
  points: 200,
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color, water: arcadeWater(theme) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const x = logAt(t)
    const rock = since > BRAKE ? 0.12 * Math.sin((since - BRAKE) * 9) * Math.exp(-(since - BRAKE) * 2.2) : 0
    const lit = since < 0 ? 0 : 1 - over(since, 1.4, 2.4)

    // The rail in, to the transom; the dock and the rail out from it, on posts.
    rail(p, k, ink, weight, -0.5, EDGE[0])
    rail(p, k, ink, weight, DOCK_X, 1.5, 1 + FLOOR)
    post(p, k, ink, weight, DOCK_X + 0.04, 1 + FLOOR, 1.5)
    post(p, k, ink, weight, 1.44, 1 + FLOOR, 1.5)
    // The trestles under the chute, and the chute's bed: a trough in the colour with the stream on it.
    outline(p, ink, weight * 0.8)
    for (const bx of [-0.2, 0.15, 0.45, 0.72]) {
      const [ux, uy] = under(bx, UNDER + 0.06)
      p.line(ux * k, uy * k, ux * k, 1.5 * k)
      p.line((ux - 0.06) * k, 1.5 * k, (ux + 0.06) * k, 1.5 * k)
    }
    outline(p, ink, weight)
    p.line(-0.3 * k, 1.5 * k, 0.8 * k, 1.5 * k)
    p.push()
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight * 4.2)
    p.beginShape()
    for (const [bx, by] of BED) p.vertex(bx * k, (by + 0.03) * k)
    p.endShape()
    p.stroke(s.color)
    p.strokeWeight(weight * 3)
    p.beginShape()
    for (const [bx, by] of BED) p.vertex(bx * k, (by + 0.03) * k)
    p.endShape()
    // The stream down it.
    p.stroke(s.water)
    p.strokeWeight(weight * 1.4)
    p.beginShape()
    for (const [bx, by] of BED) p.vertex(bx * k, (by - 0.01) * k)
    p.endShape()
    p.pop()
    // The pool: a tank at the foot in the colour, the dock's wall its far side; the water goes in front.
    solid(p, ink, weight, s.color)
    p.rect(((POOL_X0 + DOCK_X) / 2) * k, 1.47 * k, (DOCK_X - POOL_X0 + 0.04) * k, 0.06 * k)
    p.rect((POOL_X0 + 0.02) * k, ((WATER_Y - 0.06 + 1.5) / 2) * k, 0.04 * k, (1.5 - WATER_Y + 0.06) * k)
    p.rect((DOCK_X + 0.02) * k, ((1 + FLOOR + 1.5) / 2) * k, 0.04 * k, (1.5 - 1 - FLOOR) * k)
    // The catch at the station: a hook behind the transom, dropped at the go.
    p.push()
    p.translate((STATION[0] - STERN - 0.02) * k, (HULL - 0.02) * k)
    p.rotate(t < T_GO - 0.04 ? 0 : -1.2 * over(t, T_GO - 0.04, T_GO + 0.04))
    outline(p, ink, weight * 1.1)
    p.line(0, 0, 0, -0.1 * k)
    p.line(0, -0.1 * k, 0.04 * k, -0.1 * k)
    p.pop()
    // The flume lamp on the dock's post, lit at the splash.
    glow(p, k, s.color, DOCK_X + 0.04, 1 + FLOOR - 0.34, 0.12, lit)
    outline(p, ink, weight)
    p.line((DOCK_X + 0.04) * k, (1 + FLOOR) * k, (DOCK_X + 0.04) * k, (1 + FLOOR - 0.3) * k)
    lamp(p, k, ink, weight, s.color, bg, DOCK_X + 0.04, 1 + FLOOR - 0.34, 0.04, lit)
    // The log's far side, behind the ball.
    inLog(p, k, x, rock, () => hull(p, k, ink, weight, s.color))
    flash(p, k, s.water, weight, FOOT[0] + NOSE, 1 + R, since, 0.25, 0.1, 0.3)
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    const x = logAt(t)
    const rock = since > BRAKE ? 0.12 * Math.sin((since - BRAKE) * 9) * Math.exp(-(since - BRAKE) * 2.2) : 0
    // The log's near side, in front of the ball: it sits in the log.
    inLog(p, k, x, rock, () => hull(p, k, ink, weight, s.color))
    // The pool's water, in front of the hull's underside.
    solid(p, ink, weight * 0.8, s.water)
    p.rect(((POOL_X0 + 0.04 + DOCK_X) / 2) * k, ((WATER_Y + 1.47) / 2) * k, (DOCK_X - POOL_X0 - 0.04) * k, (1.47 - WATER_Y) * k)
    // The splash: drops up off the bow and back into the pool, and a crest on the water.
    if (since > 0 && since < 0.6) {
      p.noStroke()
      p.fill(s.water)
      for (const [vx, vy] of DROPS) {
        const y = WATER_Y + vy * since + (G / 2) * since * since
        if (y > WATER_Y) continue
        p.circle(Math.min(DOCK_X - 0.03, FOOT[0] + 0.1 + vx * since) * k, y * k, 0.045 * k)
      }
      const f = over(since, 0, 0.35)
      p.fill(s.water)
      p.arc((FOOT[0] + 0.12) * k, WATER_Y * k, (0.16 + 0.2 * f) * k, (0.22 * (1 - f) + 0.04) * k, Math.PI, Math.PI * 2, p.CHORD)
    }
  },
  // Over the pool, beside the dock lamp: on the log it would lie across the ball's throw.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, FOOT[0] + 0.05, 1 + FLOOR - 0.5, '+200', since, 1),
})
