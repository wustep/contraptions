import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, post, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { flash, score } from './neon'
import { BEZEL, doorway, screen } from './screen'

/**
 * A falling-blocks well, two floors deep. The lane runs in through a
 * doorway in the screen's side onto the top row of the stack — a row of
 * blocks from wall to wall with one gap in it — and the ball rolls over
 * the gap and up against the far wall. That wakes the game: the piece
 * waiting at the top of the well comes down in steps — tick, tick, tick —
 * and its stem slots into the gap. The line is whole; it flashes, and
 * clears, and there is nothing under the ball: it falls a floor to the
 * well's foot and rolls out of the doorway there, on or back the way it
 * came. What was left of the piece drops a row, the way the game has it,
 * and lies where the row was, level with the lane. +100.
 */
export interface BlocksState {
  color: string
  /** The falling piece's colour, and the colours of the row it completes, a block each. */
  piece: string
  row: string[]
  turn: 1 | -1
}

/** One block, and the well: six across. Row 0 is the row the ball rolls on; rows count down the screen. */
const B = 0.11
const COLS = 6
const X0 = (-COLS / 2) * B
const X1 = -X0
const Y0 = FLOOR - 5 * B - 0.01
const Y1 = 1 + FLOOR + 0.17
/** The gap in the row, and the piece: a T, its bar three across over the gap and its stem down into it. */
const GAP = 1
const BAR = [0, 1, 2]
/** The bar's row while it waits, and when it has landed. */
const WAIT_ROW = -5
const LAND_ROW = -1
/** The ball comes to rest against the far wall. */
const SEAT = X1 - R
const ARRIVE = arriveAt(SEAT)
const WAKE = 0.12
const TICK = 0.11
const STEPS = LAND_ROW - WAIT_ROW
const T_LAND = ARRIVE + WAKE + TICK * (STEPS - 1)
const LOCK = 0.07
const FLASH = 0.3
const FIRE = T_LAND + LOCK + FLASH
/** What is left of the piece drops a row this long after the clear. */
const SETTLE = 0.11
const T_FALL = 0.32
const HOP = 0.14

const rowY = (row: number) => FLOOR + row * B

export const blocks = definePiece<BlocksState>({
  name: 'blocks',
  points: 100,
  weight: 1,
  place: ({ rng, color, fits, theme }) => {
    for (const turn of rng.shuffle([1, -1] as const)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
      ]
      if (!fits(cells, [turn, 1])) continue
      const others = theme.colors.filter((c) => c !== color)
      const piece = others.length ? rng.pick(others) : color
      // The row is what earlier pieces left: any colour but the one coming down, no two neighbours alike.
      const rest = theme.colors.filter((c) => c !== piece)
      const row: string[] = []
      for (let c = 0; c < COLS; c++) row.push(rng.pick(rest.filter((x) => x !== row[c - 1])))
      const hop: Pt = [SEAT + turn * (turn > 0 ? 0.1 : 0.16), 1]
      const lane: Lane = {
        segs: [
          ...arrive([-0.5, 0], [SEAT, 0]),
          wait([SEAT, 0], FIRE - ARRIVE),
          // Nothing under it: a fall from rest, a floor deep.
          { from: [SEAT, 0], to: [SEAT, 1], dur: T_FALL, ease: 'in' },
          fly([SEAT, 1], hop, HOP, 0.05),
          ramp(hop, [turn * 0.5, 1], 2.2, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: [turn, 1], dir: turn }, lane, state: { color, piece, row, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { turn } = s
    // The bump against the wall shakes the cabinet a hair; the clear shakes it more.
    const shake = (t > ARRIVE && t < ARRIVE + 0.12 ? 0.006 * Math.sin(t * 90) : 0) + (since > 0 && since < 0.15 ? 0.008 * Math.sin(since * 80) : 0)

    // The posts the well stands on.
    for (const x of [-0.22, 0.22]) post(p, k, ink, weight, x, Y1 + BEZEL, 1.5)

    p.push()
    p.translate(shake * k, 0)
    screen(p, k, ink, weight, s.color, bg, X0, Y0, X1, Y1)
    doorway(p, k, ink, weight, bg, X0, -1, -R - 0.04, FLOOR)
    doorway(p, k, ink, weight, bg, turn * X1, turn, 1 - R - 0.04, 1 + FLOOR)
    // The well's foot: the rail across it, that the ball lands on.
    rail(p, k, ink, weight, X0, X1, 1 + FLOOR)

    // The row the ball rolls on, until the line clears: flashing between the colour and the ink once it is whole.
    const whole = t >= T_LAND + LOCK
    const lit = whole && Math.floor((t - T_LAND - LOCK) / (FLASH / 6)) % 2 === 0
    if (since < 0) {
      for (let c = 0; c < COLS; c++) {
        if (c === GAP) continue
        block(p, k, ink, weight, lit ? ink : s.row[c], c, 0)
      }
    }
    // The piece: waiting at the top, coming down a row a tick, landed; and after the clear, what is left of it a row further down.
    const steps = t < ARRIVE + WAKE ? 0 : Math.min(STEPS, 1 + Math.floor((t - ARRIVE - WAKE) / TICK))
    const bar = since < 0 ? WAIT_ROW + steps : since < SETTLE ? LAND_ROW : LAND_ROW + 1
    for (const c of BAR) block(p, k, ink, weight, s.piece, c, bar)
    if (since < 0) block(p, k, ink, weight, lit ? ink : s.piece, GAP, bar + 1)
    p.pop()
    // The lane in and the lane out, through the doorways.
    rail(p, k, ink, weight, -0.5, X0)
    rail(p, k, ink, weight, turn * X1, turn * 0.5, 1 + FLOOR)

    // The clear: a ring off the row's middle.
    flash(p, k, s.color, weight, 0, rowY(0) + B / 2, since, 0.25, 0.1, 0.36)
    flash(p, k, s.color, weight, SEAT, 1 + R, since - T_FALL, 0.18, 0.05, 0.18)
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.piece, bg, -0.04, 0.12, '+100', since, 1),
})

/** One block of the well: column `c`, row `row`, a square in the colour with the ink round it. */
function block(p: p5, k: number, ink: string, weight: number, color: string, c: number, row: number): void {
  solid(p, ink, weight * 0.7, color)
  p.rect((X0 + (c + 0.5) * B) * k, (rowY(row) + B / 2) * k, B * k, B * k, 0.012 * k)
}
