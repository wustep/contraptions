import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { marquee, score } from './neon'

/**
 * A coin pusher two floors tall. The rail runs in through a slot in the
 * cabinet's side onto the shelf, level with it, where three coins lie
 * edge-on at the lip; the ball rolls up behind them and stops. The pusher
 * block, hanging raised at the back of the shelf, comes down behind the
 * ball and shoves: the ball shoves the coins, the coins tip off the lip
 * one after another and clatter into the tray a floor below, and the ball
 * goes over the edge after them, drops into the tray and rolls out of the
 * payout mouth onto the rail a floor down. The block lifts and slides back
 * to wait. The coins stay in the tray, on top of the ones already there.
 *
 * The push is one motion: the block's face is what the lane traces, a
 * radius behind the ball, until the ball's centre is past the lip.
 */
export interface PusherState {
  color: string
  coin: string
}

/** The cabinet: the whole cell wide, from a header over the shelf to the floor of the cell below. */
const CAB_X0 = -0.5
const CAB_X1 = 0.44
const CAB_TOP = -0.5
const FRAME = 0.04
/** The window: the dark play field behind the glass. */
const WIN_TOP = -0.4
const WIN_BOTTOM = 1 + FLOOR + 0.06
/** The shelf, level with the rail, from the back wall to the lip. */
const LIP = 0.1
const SHELF_T = 0.07
/** The tray a floor down. */
const TRAY_Y = 1 + FLOOR
/** The payout mouth in the far wall: open from here down to the tray. */
const MOUTH_TOP = 0.74
/** The block: its face drawn back and at the end of its stroke; how thick and tall; how high it hangs; the track it rides. */
const BACK = -0.36
const FWD = 0.05
const BLOCK_W = 0.1
const BLOCK_H = 0.16
const RAISE = 0.28
const TRACK_Y = -0.34
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
const COIN_T = 0.026
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

/** The coins on the shelf: a stack of two, and one at the lip; where each rests, and how high it lies. */
const SHELF_COINS: { rest: number; lift: number; ahead: number; landX: number }[] = [
  { rest: 0.07, lift: 0, ahead: COIN_W, landX: 0.1 },
  { rest: -0.02, lift: 0, ahead: 0, landX: 0.18 },
  { rest: -0.02, lift: COIN_T, ahead: 0, landX: 0.26 },
]
/** Where a shelf coin is at `t`, pushed along by the ball, and when it tips off the lip. */
const coinX = (i: number, t: number) => Math.max(SHELF_COINS[i].rest, ballX(t) + R + COIN_W / 2 + SHELF_COINS[i].ahead)
const TIP_AT = SHELF_COINS.map((_, i) => {
  for (let t = T_PUSH; t < T_TIP; t += 0.004) if (coinX(i, t) > LIP + 0.014) return t
  return T_TIP
})
/** Coins lying in the tray from before. */
const TRAY_COINS: [number, number][] = [
  [-0.32, 0],
  [-0.2, 0],
  [-0.08, 0],
  [-0.26, 1],
]

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
  solid(p, ink, weight * 0.6, color)
  p.rect(0, 0, COIN_W * k, COIN_T * k, 0.006 * k)
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

    // The cabinet: a frame in the colour round a dark window, from the header to the floor below.
    solid(p, ink, weight, s.color)
    p.rect(((CAB_X0 + CAB_X1) / 2) * k, ((CAB_TOP + 1.5) / 2) * k, (CAB_X1 - CAB_X0) * k, (1.5 - CAB_TOP) * k, 0.03 * k)
    solid(p, ink, weight * 0.8, bg)
    p.rect(((CAB_X0 + CAB_X1) / 2) * k, ((WIN_TOP + WIN_BOTTOM) / 2) * k, (CAB_X1 - CAB_X0 - 2 * FRAME) * k, (WIN_BOTTOM - WIN_TOP) * k, 0.01 * k)
    // The slot the lane comes in by, and the payout mouth the ball leaves by: the frame cut through.
    p.noStroke()
    p.fill(bg)
    p.rect((CAB_X0 + FRAME / 2) * k, -0.02 * k, (FRAME + 0.03) * k, 0.3 * k)
    p.rect((CAB_X1 - FRAME / 2) * k, ((MOUTH_TOP + WIN_BOTTOM) / 2) * k, (FRAME + 0.03) * k, (WIN_BOTTOM - MOUTH_TOP) * k)
    outline(p, ink, weight)
    p.line((CAB_X0 - 0.01) * k, -0.17 * k, (CAB_X0 + FRAME) * k, -0.17 * k)
    p.line((CAB_X1 - FRAME) * k, MOUTH_TOP * k, (CAB_X1 + 0.01) * k, MOUTH_TOP * k)
    // The marquee on the header, chasing as the coins come down.
    marquee(p, k, ink, weight, s.coin, bg, -0.4, 0.34, (CAB_TOP + WIN_TOP) / 2, 6, since, paid > 0.2, 0.06)

    // The rail in, and the shelf level with it; the rail out of the mouth.
    rail(p, k, ink, weight, -0.5, CAB_X0 + FRAME)
    solid(p, ink, weight, s.color)
    p.rect(((CAB_X0 + FRAME + LIP) / 2) * k, (FLOOR + SHELF_T / 2) * k, (LIP - CAB_X0 - FRAME) * k, SHELF_T * k, 0.008 * k)
    // The tray: a floor across the bottom of the window, out through the mouth to the rail.
    p.rect(((CAB_X0 + FRAME + CAB_X1) / 2) * k, (TRAY_Y + 0.03) * k, (CAB_X1 - CAB_X0 - FRAME) * k, 0.06 * k, 0.008 * k)
    rail(p, k, ink, weight, CAB_X1 - 0.02, 0.5, TRAY_Y)

    // The track under the header, the carriage on it, the rod, and the block: raised at the back, down behind the ball, along the shelf.
    outline(p, ink, weight)
    p.line((CAB_X0 + FRAME + 0.02) * k, TRACK_Y * k, 0.22 * k, TRACK_Y * k)
    const bottom = FLOOR - RAISE * up
    const bx = face - BLOCK_W / 2
    p.line(bx * k, (TRACK_Y + 0.02) * k, bx * k, (bottom - BLOCK_H) * k)
    solid(p, ink, weight, ink)
    p.rect(bx * k, TRACK_Y * k, 0.16 * k, 0.05 * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    p.rect(bx * k, (bottom - BLOCK_H / 2) * k, BLOCK_W * k, BLOCK_H * k, 0.01 * k)

    // The coins in the tray from before, and the ones that come down.
    for (const [x, lift] of TRAY_COINS) coin(p, k, ink, weight, s.coin, x, TRAY_Y - COIN_T / 2 - lift * COIN_T, 0)
    SHELF_COINS.forEach((c, i) => {
      const y0 = FLOOR - COIN_T / 2 - c.lift
      const tipped = t - TIP_AT[i]
      if (tipped <= 0) {
        coin(p, k, ink, weight, s.coin, coinX(i, t), y0, 0)
        return
      }
      // Off the lip: a tumble down into the tray, half a turn, and it lies flat where it lands.
      const x0 = LIP + 0.014
      const y1 = TRAY_Y - COIN_T / 2 - (i === 2 ? COIN_T : 0)
      const dur = Math.sqrt((2 * (y1 - y0)) / G)
      const f = Math.min(1, tipped / dur)
      const x = x0 + (c.landX - x0) * f
      const y = y0 + (y1 - y0) * f * f
      coin(p, k, ink, weight, s.coin, x, y, Math.PI * f)
    })
  },
  // Over the header, clear of the cabinet: in the tray it would lie across the coins.
  scores: (p, s, { k, since, bg }) => score(p, k, s.coin, bg, 0, CAB_TOP + 0.1, '+100', since, 1),
})
