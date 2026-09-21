import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { marquee, score } from './neon'

/**
 * A coin pusher two floors tall. The rail runs in through a slot in the
 * cabinet's side onto the shelf, level with it, where two stacks of coins
 * stand edge-on at the lip, four and three; the ball rolls up behind them
 * and stops. The pusher block, hanging raised at the back of the shelf,
 * comes down behind the ball and shoves: the ball shoves the stacks, the
 * stacks go over the lip one after the other, each from the bottom up,
 * and the coins tumble a floor down onto the heap in the tray, where each
 * lands, hops once and lies flat; and the ball goes over the edge after
 * them, drops into the tray clear of the heap and rolls out of the payout
 * mouth onto the rail a floor down. The block lifts and slides back to
 * wait. The coins stay in the tray, on the heap that was there already:
 * it is laid like bricks, and the seven that come down finish its near
 * end, each on two that lay or landed before it.
 *
 * The push is one motion: the block's face is what the lane traces, a
 * radius behind the ball, until the ball's centre is past the lip.
 */
export interface PusherState {
  color: string
  coin: string
}

/** The cabinet: a header over a glass case the whole cell wide, down to a base whose top is the tray a floor below. */
const CAB_X0 = -0.5
const CAB_X1 = 0.44
const CAB_TOP = -0.5
const WIN_TOP = -0.4
/** The slot in the near glass the lane comes in by: open from here down to the shelf. */
const SLOT_TOP = -0.17
/** The shelf, level with the rail, from the back wall to the lip. */
const LIP = 0.1
const SHELF_T = 0.08
/** The tray a floor down. */
const TRAY_Y = 1 + FLOOR
/** The payout mouth in the far wall: open from here down to the tray. */
const MOUTH_TOP = 0.74
/** The block: its face drawn back and at the end of its stroke; how thick and tall; how high it hangs; its carriage, under the header. */
const BACK = -0.36
const FWD = 0.05
const BLOCK_W = 0.1
const BLOCK_H = 0.16
const RAISE = 0.28
const CARRIAGE_Y = WIN_TOP + 0.035
/** Where the ball stops on the shelf, and when. */
const SEAT = -0.2
const ARRIVE = arriveAt(SEAT)
const BEAT = 0.15
const DROP = 0.15
const PUSH = 0.45
const T_DROP = ARRIVE + BEAT
const T_PUSH = T_DROP + DROP
const T_TIP = T_PUSH + PUSH
const LIFT = 0.2
const RETURN = 0.6
const T_LIFT = T_TIP + 0.1
const T_BACK = T_LIFT + LIFT
/** A coin, edge on. */
const COIN_W = 0.09
const COIN_T = 0.04
/** Show gravity, and the fall off the lip into the tray. */
const G = 10
const FALL = Math.sqrt(2 / G)
const OFF: Pt = [FWD + R, 0]
const LAND: Pt = [0.3, 1]
const SETTLE: Pt = [0.36, 1]

/** Where the block's face is. */
function faceAt(t: number): number {
  if (t <= T_PUSH) return BACK
  if (t < T_TIP) return BACK + (FWD - BACK) * easeInOutSine((t - T_PUSH) / PUSH)
  if (t < T_BACK) return FWD
  return FWD + (BACK - FWD) * easeInOutSine(over(t, T_BACK, T_BACK + RETURN))
}
/** How far the block hangs over the shelf: 1 raised, 0 down on it. */
function raisedAt(t: number): number {
  if (t < T_DROP) return 1
  if (t < T_PUSH) return 1 - easeInQuad(over(t, T_DROP, T_PUSH))
  if (t < T_LIFT) return 0
  return easeOutCubic(over(t, T_LIFT, T_LIFT + LIFT))
}
/** The ball: at its seat until the face reaches its back, then a radius ahead of the face. */
const ballX = (t: number) => Math.max(SEAT, faceAt(t) + R)

/** The same scatter every time: 0 to 1 from an index and a salt. */
const hash = (i: number, salt: number): number => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/**
 * The heap in the tray, laid like bricks: every row lies half a coin along
 * from the row under it. Where the bottom row begins, the pitch, and what
 * lay there already, each row's first place and how many: a bank against
 * the near wall, under the shelf, falling away toward the lip. Its foot
 * stops short of where the ball comes down. The coins that lay there are
 * each a little out of true; the places the stacks come down to are exact.
 */
const HEAP_X0 = -0.43
const PITCH = 0.095
const LAY: [number, number][] = [
  [0, 6],
  [0, 4],
  [-1, 4],
  [-1, 3],
  [-2, 3],
  [-2, 2],
  [-2, 1],
]
const lieAt = (row: number, n: number): Pt => [HEAP_X0 + (row / 2 + n) * PITCH, TRAY_Y - COIN_T / 2 - row * COIN_T]

/**
 * The stacks on the shelf, the far one at the lip and the near one against
 * the ball: where each stands, how far each coin in it is out of plumb from
 * the bottom up, and the place in the heap each comes down to, its row and
 * how far along. They are listed as they go over, and they land in that
 * order, so every one comes down on two that are there.
 */
const STACKS: { rest: number; out: number[]; to: [number, number][] }[] = [
  { rest: 0.07, out: [0, -0.007, 0.005], to: [[0, 6], [1, 4], [1, 5]] },
  { rest: -0.02, out: [0, 0.008, -0.003, 0.009], to: [[2, 3], [2, 4], [3, 2], [3, 3]] },
]
/** The ball's front meets the near stack's back here, and from then on both stacks go along with it. */
const MEET = STACKS[1].rest - COIN_W / 2
const shiftAt = (t: number) => Math.max(0, ballX(t) + R - MEET)
/**
 * A stack goes when its bottom coin's middle is this far past the lip, the
 * ones above a moment after the one under them. A coin going over is still
 * carried along for as long as it takes its tail to clear the lip, its nose
 * dropping; then it falls, turning over, this many half turns in all.
 */
const OVER = 0.014
const FOLLOW = 0.012
const CLEAR = 0.035
const NOSE = 0.6
const TURNS = [1, 2, 1, 2, 3, 2, 3]
const SHELF_COINS = STACKS.flatMap(({ rest, out, to }) => {
  let tip = T_TIP
  for (let t = T_PUSH; t < T_TIP; t += 0.004) {
    if (rest + shiftAt(t) > LIP + OVER) {
      tip = t
      break
    }
  }
  return out.map((dx, level) => ({ x: rest + dx, y: FLOOR - COIN_T / 2 - level * COIN_T, at: tip + level * FOLLOW, to: lieAt(...to[level]) }))
})

/** Where shelf coin `i` is at `t`, and how far it has turned: standing in its stack, going over the lip, falling, or lying in the heap, where it rattles a moment and is still. */
function coinAt(i: number, t: number): { x: number; y: number; a: number } {
  const c = SHELF_COINS[i]
  const s = t - c.at
  if (s <= 0) return { x: c.x + shiftAt(t), y: c.y, a: 0 }
  const tilt = (s / CLEAR) * (s / CLEAR)
  if (s < CLEAR) return { x: c.x + shiftAt(t), y: c.y + 0.02 * tilt, a: NOSE * tilt }
  const x1 = c.x + shiftAt(c.at + CLEAR)
  const y1 = c.y + 0.02
  const dur = Math.sqrt((2 * (c.to[1] - y1)) / G)
  const f = (s - CLEAR) / dur
  if (f < 1) return { x: x1 + (c.to[0] - x1) * f, y: y1 + (c.to[1] - y1) * f * f, a: NOSE + (Math.PI * TURNS[i] - NOSE) * f }
  const w = s - CLEAR - dur
  const ring = Math.exp(-16 * w)
  return { x: c.to[0], y: c.to[1] - 0.012 * ring * Math.abs(Math.sin(32 * w)), a: 0.3 * ring * Math.sin(32 * w) }
}

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [SEAT, 0]),
    wait([SEAT, 0], T_PUSH - ARRIVE),
    ...trace((t) => [ballX(t), 0], T_PUSH, T_TIP, 12),
    fly(OFF, LAND, FALL, 0.25),
    fly(LAND, SETTLE, 0.05, 0.012),
    ramp(SETTLE, [0.5, 1], 1.6, ROLL),
  ],
  fire: T_TIP,
}

function coin(p: import('p5'), k: number, ink: string, weight: number, color: string, x: number, y: number, a: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  solid(p, ink, weight * 0.5, color)
  p.rect(0, 0, COIN_W * k, COIN_T * k, 0.012 * k)
  p.pop()
}

export const pusher = definePiece<PusherState>({
  name: 'pusher',
  points: 100,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    // The coins in a colour of their own: not the cabinet's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    return { cells, exit: { at: [1, 1], dir: 1 }, lane: LANE, state: { color, coin: pool.length ? rng.pick(pool) : color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const face = faceAt(t)
    const up = raisedAt(t)
    const paid = since < 0 ? 0 : 1 - over(since, 1.2, 2)

    // The cabinet: the header and the base in the colour, and the glass between them a line a side, open at the slot the lane comes in by and at the payout mouth.
    solid(p, ink, weight, s.color)
    p.rect(((CAB_X0 + CAB_X1) / 2) * k, ((CAB_TOP + WIN_TOP) / 2) * k, (CAB_X1 - CAB_X0) * k, (WIN_TOP - CAB_TOP) * k, 0.02 * k)
    p.rect(((CAB_X0 + CAB_X1) / 2) * k, ((TRAY_Y + 1.5) / 2) * k, (CAB_X1 - CAB_X0) * k, (1.5 - TRAY_Y) * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(CAB_X0 * k, WIN_TOP * k, CAB_X0 * k, SLOT_TOP * k)
    p.line(CAB_X0 * k, (FLOOR + SHELF_T) * k, CAB_X0 * k, TRAY_Y * k)
    p.line(CAB_X1 * k, WIN_TOP * k, CAB_X1 * k, MOUTH_TOP * k)
    // The marquee on the header, chasing as the coins come down.
    marquee(p, k, ink, weight, s.coin, bg, -0.38, 0.32, (CAB_TOP + WIN_TOP) / 2, 5, since, paid > 0.2, 0.06)

    // The shelf, level with the rail and the slot's sill; the rail out of the mouth, off the base's top.
    solid(p, ink, weight, s.color)
    p.rect(((CAB_X0 + LIP) / 2) * k, (FLOOR + SHELF_T / 2) * k, (LIP - CAB_X0) * k, SHELF_T * k, 0.008 * k)
    rail(p, k, ink, weight, CAB_X1, 0.5, TRAY_Y)

    // The carriage under the header, the rod, and the block: raised at the back, down behind the ball, along the shelf.
    const bottom = FLOOR - RAISE * up
    const bx = face - BLOCK_W / 2
    outline(p, ink, weight)
    p.line(bx * k, CARRIAGE_Y * k, bx * k, (bottom - BLOCK_H) * k)
    solid(p, ink, weight, ink)
    p.rect(bx * k, CARRIAGE_Y * k, 0.14 * k, 0.03 * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    p.rect(bx * k, (bottom - BLOCK_H / 2) * k, BLOCK_W * k, BLOCK_H * k, 0.01 * k)

    // The heap in the tray from before, from the bottom row up; and the stacks, on the shelf, going over, coming down and lying on it.
    LAY.forEach(([n0, n], row) => {
      for (let i = n0; i < n0 + n; i++) {
        const [x, y] = lieAt(row, i)
        coin(p, k, ink, weight, s.coin, x + (hash(row * 9 + i, 1) - 0.5) * 0.014, y, (hash(row * 9 + i, 2) - 0.5) * 0.07)
      }
    })
    SHELF_COINS.forEach((_, i) => {
      const q = coinAt(i, t)
      coin(p, k, ink, weight, s.coin, q.x, q.y, q.a)
    })
  },
  // Over the header, clear of the cabinet: in the tray it would lie across the coins.
  scores: (p, s, { k, since, bg }) => score(p, k, s.coin, bg, 0, CAB_TOP + 0.1, '+100', since, 1),
})
