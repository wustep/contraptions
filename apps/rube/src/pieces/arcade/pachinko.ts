import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, type Lane, type Pt, type Seg } from '../../parts'
import { flash, glow, lamp, marquee, score } from './neon'

/**
 * A pachinko field two floors deep. The lane stops at a lip; the ball
 * drops into a board of pins and goes down it pin to pin, left, right,
 * left — each pin lighting as it is struck — and lands in the jackpot
 * pocket at the bottom, which lights up the board, pays out five hundred,
 * and tips the ball out onto the rail below, on or back the way it came.
 * Which way it goes at each pin is the seed's.
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
      const path: PachinkoState['path'] = []
      const segs: Seg[] = [ramp([-0.5, 0], [LIP, 0], ROLL, 1.6)]
      let t = segs[0].dur
      let from: Pt = [LIP, 0]
      let side = rng.bool() ? 1 : -1
      for (let r = 0; r < ROWS; r++) {
        if (r > 0 && !rng.bool(0.25)) side = -side
        const x = side * (0.09 + 0.09 * (r % 2)) + (rng.next() - 0.5) * 0.04
        const y = ROW0 + r * ROW_GAP
        // Land a radius-and-a-pin above the pin, off centre, so the next hop goes the other way.
        const to: Pt = [x + side * 0.03, y - PIN_R - 0.12]
        const seg = fly(from, to, HOP, 0.04)
        seg.ease = 'in'
        segs.push(seg)
        t += HOP
        path.push({ x, y, at: t })
        from = to
      }
      const pocket: Pt = [0, POCKET_Y]
      const landing = fly(from, pocket, 0.2, 0.02)
      landing.ease = 'in'
      segs.push(landing)
      t += 0.2
      segs.push({ from: pocket, to: pocket, dur: 0.3 })
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
    // The board: two side walls from under the lip to the pocket, glass between.
    outline(p, ink, weight)
    for (const x of [-0.36, 0.36]) p.line(x * k, 0.16 * k, x * k, (POCKET_Y + 0.5) * k)
    p.line(-0.36 * k, (POCKET_Y + 0.5) * k, 0.36 * k, (POCKET_Y + 0.5) * k)
    // The jackpot's glow behind the board when it pays.
    glow(p, k, s.color, 0, POCKET_Y - 0.1, 0.4, jackpot)
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
        if (struck) flash(p, k, s.color, weight, x, y, t - hit.at, 0.2, 0.05, 0.14)
      }
    }
    // The pocket: a cup at the bottom with a lamp, and the flap that tips the ball out.
    solid(p, ink, weight, s.color)
    p.rect(0, (POCKET_Y + 0.22) * k, 0.3 * k, 0.16 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(-0.15 * k, (POCKET_Y - 0.06) * k, -0.15 * k, (POCKET_Y + 0.14) * k)
    p.line(0.15 * k, (POCKET_Y - 0.06) * k, 0.15 * k, (POCKET_Y + 0.14) * k)
    p.line(-0.15 * k, (POCKET_Y + FLOOR) * k, 0.15 * k, (POCKET_Y + FLOOR) * k)
    lamp(p, k, ink, weight, s.color, bg, 0, POCKET_Y + 0.22, 0.04, jackpot)
    // The rail out from the pocket's lip.
    rail(p, k, ink, weight, turn * 0.15, turn * 0.5, POCKET_Y + FLOOR)
    // The marquee along the foot of the board, chasing on the jackpot.
    marquee(p, k, ink, weight, s.color, bg, -0.3, 0.3, POCKET_Y + 0.42, 6, since, jackpot > 0.2)
    score(p, k, s.color, 0, POCKET_Y - 0.4, '+500', since, 1.2)
  },
})
