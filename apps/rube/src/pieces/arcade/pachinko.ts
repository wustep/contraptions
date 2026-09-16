import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, over, rail, ramp, type Lane, type Pt, type Seg } from '../../parts'
import { flash, glow, lamp, marquee, score } from './neon'

/**
 * A pachinko field two floors deep. The lane stops at a lip; the ball
 * drops into a board of pins and goes down it pin to pin, left, right,
 * left — bouncing off each, each lighting as it is struck — and lands in the jackpot
 * pocket at the bottom, which lights up the board, pays out five hundred,
 * drops the pocket's side like a drawbridge and lets the ball out through
 * a gate in the board's wall onto the rail below, on or back the way it
 * came. Which way it goes at each pin is the seed's.
 */
export interface PachinkoState {
  color: string
  turn: 1 | -1
  /** The pin the ball hits in each row: its x, and when. */
  path: { x: number; y: number; at: number }[]
}

const LIP = -0.14
const ROWS = 5
const ROW0 = 0.4
const ROW_GAP = 0.32
const PIN_R = 0.03
const HOP = 0.17
const POCKET_Y = 2
const CUP = 0.15
const WALL = 0.36
/** The pocket's exit side drops open this long after the jackpot; the ball rolls once it is down. */
const OPEN_AT = 0.12
const OPEN = 0.15

/**
 * One hop of the way down, `dur` long. Off the lip it leaves at the pace
 * it had, falling from level; off a pin it leaves with a little of the
 * bounce, up and out, and gathers speed to the next. Never from a dead
 * stop.
 */
function hop(from: Pt, to: Pt, dur: number, vIn: number, off: 'lip' | 'pin'): Seg {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1])
  const mean = len / dur
  // Off the lip the chord's pace is whatever keeps the ball's forward pace, the drop being from level.
  const v0 = off === 'lip' ? (vIn * len) / Math.abs(to[0] - from[0]) : mean * 0.6
  return { from, to, dur, ramp: [v0, 2 * mean - v0], arc: off === 'lip' ? (to[1] - from[1]) / 4 : 0.09 }
}

export const pachinko = definePiece<PachinkoState>({
  name: 'pachinko',
  weight: 1,
  place: ({ rng, color, fits }) => {
    for (const turn of rng.shuffle([1, -1] as const)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
        [0, 2],
      ]
      if (!fits(cells, [turn, 2])) continue
      // The way down: a pin a row, alternating sides more often than not.
      // The first is always ahead: the ball comes off the lip going forward.
      const path: PachinkoState['path'] = []
      const segs: Seg[] = [ramp([-0.5, 0], [LIP, 0], ROLL, 1.6)]
      let t = segs[0].dur
      let from: Pt = [LIP, 0]
      let side = 1
      let vIn = 1.6
      for (let r = 0; r < ROWS; r++) {
        if (r > 0 && !rng.bool(0.25)) side = -side
        const x = side * (0.09 + 0.09 * (r % 2)) + (rng.next() - 0.5) * 0.04
        const y = ROW0 + r * ROW_GAP
        // Land a radius-and-a-pin above the pin, off centre, so the next hop goes the other way.
        const to: Pt = [x + side * 0.03, y - PIN_R - 0.12]
        segs.push(hop(from, to, HOP, vIn, r === 0 ? 'lip' : 'pin'))
        t += HOP
        path.push({ x, y, at: t })
        from = to
        vIn = 0
      }
      const pocket: Pt = [0, POCKET_Y]
      segs.push(hop(from, pocket, 0.2, 0, 'pin'))
      t += 0.2
      segs.push({ from: pocket, to: pocket, dur: OPEN_AT + OPEN })
      segs.push(ramp(pocket, [turn * 0.5, POCKET_Y], 0, ROLL))
      const lane: Lane = { segs, fire: t }
      return { cells, exit: { at: [turn, 2], dir: turn }, lane, state: { color, turn, path } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { turn, path } = s
    const jackpot = since < 0 ? 0 : 1 - over(since, 1.5, 2.5)

    rail(p, k, ink, weight, -0.5, LIP)
    outline(p, ink, weight)
    p.line(LIP * k, FLOOR * k, LIP * k, (FLOOR + 0.1) * k)
    // The board: two side walls from under the lip to the floor, glass
    // between; the exit side has a gate cut in it at the rail, the ball's
    // height, for the payout to leave by.
    outline(p, ink, weight)
    p.line(-turn * WALL * k, 0.16 * k, -turn * WALL * k, (POCKET_Y + 0.5) * k)
    p.line(turn * WALL * k, 0.16 * k, turn * WALL * k, (POCKET_Y - 0.3) * k)
    p.line(turn * WALL * k, (POCKET_Y + FLOOR) * k, turn * WALL * k, (POCKET_Y + 0.5) * k)
    p.line(-WALL * k, (POCKET_Y + 0.5) * k, WALL * k, (POCKET_Y + 0.5) * k)
    // The jackpot's glow behind the board when it pays.
    glow(p, k, s.color, 0, POCKET_Y - 0.1, 0.28, jackpot)
    // The pins: staggered rows, each struck one lighting and staying lit a while.
    for (let r = 0; r < ROWS; r++) {
      const y = ROW0 + r * ROW_GAP
      for (let i = -2; i <= 2; i++) {
        const x = i * 0.13 + (r % 2 ? 0.065 : 0)
        if (Math.abs(x) > 0.3) continue
        const hit = path[r]
        const struck = hit && Math.abs(hit.x - x) < 0.07 && t > hit.at
        const lit = struck ? 1 - over(t - hit.at, 0.2, 1.4) : 0
        if (lit > 0.05) glow(p, k, s.color, x, y, PIN_R * 3, lit)
        solid(p, ink, weight * 0.8, lit > 0.5 ? s.color : bg)
        p.circle(x * k, y * k, PIN_R * 2 * k)
        if (struck) flash(p, k, s.color, weight, x, y, t - hit.at, 0.18, 0.05, 0.12)
      }
    }
    // The pocket: a cup at the bottom with a lamp. Its far wall is hinged
    // at the foot and drops flat onto the rail out once the jackpot has
    // paid, and the ball rolls out over it.
    const drop = since < OPEN_AT ? 0 : (Math.PI / 2) * easeInQuad(over(since, OPEN_AT, OPEN_AT + OPEN))
    solid(p, ink, weight, s.color)
    p.rect(0, (POCKET_Y + 0.22) * k, CUP * 2 * k, 0.16 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(-turn * CUP * k, (POCKET_Y - 0.06) * k, -turn * CUP * k, (POCKET_Y + 0.14) * k)
    p.push()
    p.translate(turn * CUP * k, (POCKET_Y + FLOOR) * k)
    p.rotate(turn * drop)
    p.line(0, 0.01 * k, 0, -(FLOOR + 0.06) * k)
    p.pop()
    p.line(-CUP * k, (POCKET_Y + FLOOR) * k, CUP * k, (POCKET_Y + FLOOR) * k)
    lamp(p, k, ink, weight, s.color, bg, 0, POCKET_Y + 0.22, 0.04, jackpot)
    // The rail out from the pocket's lip.
    rail(p, k, ink, weight, turn * CUP, turn * 0.5, POCKET_Y + FLOOR)
    // The marquee along the foot of the board, chasing on the jackpot.
    marquee(p, k, ink, weight, s.color, bg, -0.3, 0.3, POCKET_Y + 0.42, 6, since, jackpot > 0.2)
    score(p, k, s.color, 0, POCKET_Y - 0.4, '+500', since, 1.2)
  },
})
