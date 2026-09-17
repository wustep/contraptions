import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, mixHex, over, post, rail, ramp, rankBy, roll, type Lane, type Pt, type Seg } from '../../parts'
import { digits, flash, glow } from './neon'
import { BEZEL, doorway, screen } from './screen'

/**
 * A Pong court, one or two floors tall. The lane stops at a doorway in the
 * screen's side, and inside it the ball moves the way a video game moves
 * it: straight lines, one pace, no gravity and no rail. It crosses the
 * court's foot to the far paddle, and the two of them rally it up the
 * screen, each sliding to where it will be before it gets there, a blip
 * at every hit — until the last paddle serves it flat along the top, the
 * other comes up too slowly and misses, the point goes up on the board,
 * and the ball leaves by the doorway there onto the rail, on or back the
 * way it came. The paddles go back to their places and wait.
 */
export interface PongState {
  color: string
  floors: number
  turn: 1 | -1
}

/** The window's half width, its top over the upper rail's line, and its foot under the lower. */
const HALF = 0.36
const TOP = 0.42
const FOOT = 0.3
const PADDLE_X = 0.29
const PADDLE_W = 0.045
const PADDLE_H = 0.18
/** The ball's centre when its edge is on a paddle's face. */
const HIT_X = PADDLE_X - PADDLE_W / 2 - R
/** The game's one pace. */
const V = 2.3
/** How near the beaten paddle gets to the ball's line: never near enough. */
const SHORT = PADDLE_H / 2 + R + 0.035
const RESET = 2.4

interface Rally {
  segs: Seg[]
  /** Every paddle hit: which side's, where the ball's centre is, and when. */
  hits: { side: 1 | -1; y: number; at: number }[]
  /** When the ball passes the beaten paddle: the point. */
  point: number
}

const rallies = new Map<string, Rally>()
/** The rally for a court: far paddle first, side to side, the last hit by the paddle that faces the way out. */
function rallyFor(floors: number, turn: 1 | -1): Rally {
  const key = `${floors}:${turn}`
  const known = rallies.get(key)
  if (known) return known
  const legs = turn > 0 ? 2 * floors + 1 : 2 * floors + 2
  const rise = floors / legs
  const pts: Pt[] = []
  for (let i = 0; i <= legs; i++) pts.push([(i % 2 === 0 ? 1 : -1) * HIT_X, -i * rise])
  const segs: Seg[] = [roll([-0.5, 0], pts[0], ROLL)]
  const hits: Rally['hits'] = []
  let t = segs[0].dur
  for (let i = 0; i <= legs; i++) {
    hits.push({ side: i % 2 === 0 ? 1 : -1, y: pts[i][1], at: t })
    if (i === legs) break
    const seg = roll(pts[i], pts[i + 1], V)
    segs.push(seg)
    t += seg.dur
  }
  // The serve: flat along the top, out of the doorway, and down to the rail's pace on the rail.
  const door: Pt = [turn * (HALF + BEZEL), -floors]
  segs.push(roll(pts[legs], door, V), ramp(door, [turn * 0.5, -floors], V, ROLL))
  const rally = { segs, hits, point: t + (PADDLE_X + HIT_X) / V }
  rallies.set(key, rally)
  return rally
}

/** Where a paddle is: waiting where its next hit will be, there before the ball is; the beaten one coming up short; back to its place after. */
function paddleAt(side: 1 | -1, t: number, rally: Rally, floors: number, turn: 1 | -1): number {
  const mine = rally.hits.filter((h) => h.side === side)
  const home = mine[0].y
  const bob = 0.025 * Math.sin(t * 2.2 + side) * (t < 0 ? over(-t, 0.15, 0.6) : over(t - rally.point, RESET + 1, RESET + 1.5))
  let y = home
  for (let j = 0; j < mine.length; j++) {
    if (t < mine[j].at) break
    const next = mine[j + 1]
    y = next ? mine[j].y + (next.y - mine[j].y) * easeInOutSine(over(t, mine[j].at, mine[j].at + (next.at - mine[j].at) * 0.7)) : mine[j].y
  }
  const last = mine[mine.length - 1]
  if (side === turn && t > last.at) {
    // The beaten paddle goes after the serve, and is still short of it when it passes.
    const reach = Math.min(last.y, -floors + SHORT + 0.12)
    const near = Math.min(last.y, -floors + SHORT)
    y = last.y + (reach - last.y) * easeInOutSine(over(t, last.at + 0.05, rally.point)) + (near - reach) * easeInOutSine(over(t, rally.point, rally.point + 0.3))
  }
  const back = easeInOutSine(over(t - rally.point, RESET, RESET + 1))
  return y + (home - y) * back + bob
}

export const pong = definePiece<PongState>({
  name: 'pong',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      const rally = rallyFor(floors, turn)
      const lane: Lane = { segs: rally.segs, fire: rally.point }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const rally = rallyFor(floors, turn)
    const y0 = -floors - TOP
    const scored = since > 0 && since < RESET + 0.6
    const pulse = since < 0 ? 0 : 1 - over(since, 0.1, 1.2)

    // The posts the court stands on, and the court: a screen, a doorway in
    // its side at each end of the rally, the lane to one and the rail from the other.
    for (const x of [-0.24, 0.24]) post(p, k, ink, weight, x, FOOT + BEZEL, 0.5)
    screen(p, k, ink, weight, s.color, bg, -HALF, y0, HALF, FOOT)
    doorway(p, k, ink, weight, bg, -HALF, -1, -R - 0.04, FLOOR)
    doorway(p, k, ink, weight, bg, turn * HALF, turn, -floors - R - 0.04, -floors + FLOOR)
    rail(p, k, ink, weight, -0.5, -HALF)
    rail(p, k, ink, weight, turn * HALF, turn * 0.5, -floors + FLOOR)

    // The net, a shade down so the ball and the paddles stay the brightest things on the screen.
    p.push()
    p.stroke(mixHex(bg, ink, 0.45))
    p.strokeWeight(weight * 0.8)
    p.strokeCap(p.SQUARE)
    for (let y = y0 + 0.04; y < FOOT - 0.06; y += 0.09) p.line(0, y * k, 0, (y + 0.045) * k)
    p.pop()
    // The board: a nought a side, and the server's point when the other misses.
    const won = -turn
    glow(p, k, s.color, won * 0.13, -floors - 0.3, 0.1, pulse)
    for (const side of [-1, 1]) digits(p, k, s.color, side * 0.13, -floors - 0.3, scored && side === won ? '1' : '0', 0.026)
    // The paddles.
    p.noStroke()
    p.fill(ink)
    for (const side of [-1, 1] as const) p.rect(side * PADDLE_X * k, paddleAt(side, t, rally, floors, turn) * k, PADDLE_W * k, PADDLE_H * k)
    // A blip off every hit.
    for (const h of rally.hits) flash(p, k, s.color, weight, h.side * (HIT_X + R), h.y, t - h.at, 0.16, 0.03, 0.12)
  },
})
