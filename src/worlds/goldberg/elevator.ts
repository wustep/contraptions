import type p5 from 'p5'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, seg } from '../../core/ease'

/**
 * The shared elevator: guides, a sheave, a counterweight, and a cage.
 *
 * Split in two, because the car is the one thing two cells must agree on.
 *
 *   - The *frame* — guides, sheave bracket, buffers, landings, rail stubs —
 *     is static, so each cell draws its own half of it.
 *   - The *car, cable, counterweight and sheave spin* move with the token, so
 *     the lane world draws them once for the whole stack, in one overlay, off
 *     the run's clock. One source of truth for anything that moves means the
 *     car cannot be drawn twice, cannot be clipped at the seam, and cannot
 *     disagree with the token riding in it.
 *
 * Units are cells, y down. `y` is the passenger's centre.
 */

export const GUIDE = 0.17
export const CAR_W = 0.38
export const CAR_H = 0.32
export const LIP = 0.18

/** Where the counterweight hangs, and how far above the car's floor it tops out. */
const CW_X = 0.29
const CW_RISE = 0.26

/**
 * A stack's clock, in loop fractions and cells per loop.
 *
 * The descent is linear because the token's `ride` piece is linear: the car
 * and its passenger are two drawings of one number, and any easing here would
 * float the token off the floor of the cage.
 *
 * `board + floors/v + clear + floors/ret` is the whole cycle — doors, down,
 * doors, empty climb — and it must fit inside the world's `emit`, or the next
 * token arrives at a shaft whose car is still on its way home.
 */
export interface RideTiming {
  /** Loop fraction the car holds at the top with the token aboard. */
  board: number
  /** Cells per loop the loaded car descends. The token's `ride` pieces match. */
  v: number
  /** Loop fraction the car holds at the bottom before the token rolls off. */
  clear: number
  /**
   * Loop fraction the car stays put *after* the token starts rolling off. The
   * landing sill cannot reach the shaft's centre — the car passes through it —
   * so for the first fraction of a cell the token is still standing on the car
   * floor, and the car must not leave under it.
   */
  hand: number
  /** Cells per loop the empty car climbs back. */
  ret: number
}

/** Cascade: one ball a loop, so the car can take its time. */
export const CASCADE_RIDE: RideTiming = { board: 0.06, v: 7, clear: 0.06, hand: 0.03, ret: 8 }
/** Workshop: a part every half loop — the same moves, twice the pace. */
export const SHOP_RIDE: RideTiming = { board: 0.05, v: 8, clear: 0.05, hand: 0.04, ret: 12 }

/** Loop fraction the loaded descent takes. The lane's ride pieces sum to this. */
export const rideTime = (t: RideTiming, floors = 1): number => floors / t.v

/** Loop fraction for the whole cycle: board, down, clear, hand off, climb back. */
export const carCycle = (t: RideTiming, floors = 1): number =>
  t.board + rideTime(t, floors) + t.clear + t.hand + floors / t.ret

/**
 * How far the car has descended, in cells, `c` loop fractions after the token
 * reached it. Linear on the way down, eased on the way back up — nothing is
 * riding then.
 */
export function carTravel(t: RideTiming, c: number, floors = 1): number {
  const down = rideTime(t, floors)
  if (c < t.board) return 0
  if (c < t.board + down) return floors * ((c - t.board) / down)
  const rest = t.board + down + t.clear + t.hand
  if (c < rest) return floors
  const up = floors / t.ret
  if (c < rest + up) return floors * (1 - easeInOutCubic((c - rest) / up))
  return 0
}

/* ------------------------------------------------------------------ frame */

export function guides(p: p5, k: number, ink: string, weight: number, y0: number, y1: number): void {
  outline(p, ink, weight)
  for (const x of [-GUIDE, GUIDE]) p.line(x * k, y0 * k, x * k, y1 * k)
}

export function buffers(p: p5, k: number, ink: string, weight: number, y: number): void {
  outline(p, ink, weight)
  p.line((-GUIDE - 0.03) * k, y * k, (GUIDE + 0.03) * k, y * k)
  for (const x of [-0.07, 0.07]) {
    p.line(x * k, y * k, x * k, (y + 0.045) * k)
    p.line((x - 0.025) * k, (y + 0.045) * k, (x + 0.025) * k, (y + 0.045) * k)
  }
}

/** Short deck from the rail into the cage, so the hand-off is a lip, not a gap. */
export function landing(p: p5, k: number, ink: string, weight: number, fromX: number, toX: number, y: number): void {
  outline(p, ink, weight)
  p.line(fromX * k, y * k, toX * k, y * k)
}

/**
 * Brackets fixing the guides to the wall, every `TIE` down the shaft. Without
 * them a two-cell shaft is a tall empty rectangle; with them it is a frame the
 * car climbs, and it still reads when the car is at the other end.
 */
const TIE = 0.22
function ties(p: p5, k: number, ink: string, weight: number, y0: number, y1: number): void {
  outline(p, ink, weight)
  for (let y = y0 + TIE * 0.6; y < y1 - 0.04; y += TIE) {
    for (const x of [-GUIDE, GUIDE]) p.line(x * k, y * k, (x + Math.sign(x) * 0.06) * k, y * k)
  }
}

/** The top cell's static half: the sheave bracket and the guides below it. */
export function liftFrame(p: p5, k: number, ink: string, weight: number, sheaveY: number): void {
  outline(p, ink, weight)
  p.line((-GUIDE - 0.06) * k, sheaveY * k, (GUIDE + 0.06) * k, sheaveY * k)
  guides(p, k, ink, weight, sheaveY + 0.06, 0.5)
  ties(p, k, ink, weight, sheaveY + 0.06, 0.5)
}

/**
 * A middle cell of a shaft deeper than two cells: guides and ties straight
 * through, nothing else. The car passes; the frame is all this cell owns.
 */
export function shaftFrame(p: p5, k: number, ink: string, weight: number): void {
  guides(p, k, ink, weight, -0.5, 0.5)
  ties(p, k, ink, weight, -0.5, 0.5)
}

/**
 * The bottom cell's static half: guides down to the pit and the buffers the
 * car lands on. They sit clear of the car's floor slab so an empty pit still
 * reads as a pit.
 */
export function wellFrame(p: p5, k: number, ink: string, weight: number, floorY: number): void {
  guides(p, k, ink, weight, -0.5, floorY + 0.28)
  ties(p, k, ink, weight, -0.5, floorY + 0.28)
  buffers(p, k, ink, weight, floorY + 0.3)
}

/* ----------------------------------------------------------------- moving */

export function sheave(p: p5, k: number, ink: string, weight: number, y: number, spin = 0): void {
  outline(p, ink, weight)
  p.line((-GUIDE - 0.06) * k, y * k, (GUIDE + 0.06) * k, y * k)
  p.push()
  p.translate(0, y * k)
  p.rotate(spin)
  outline(p, ink, weight)
  p.circle(0, 0, 0.11 * k)
  p.line(-0.055 * k, 0, 0.055 * k, 0)
  p.pop()
}

/** Cage around a passenger at `y`. Ink slab, open sides, a roof, shoes on the guides. */
export function car(p: p5, k: number, ink: string, weight: number, color: string, y: number, seat = 0.13): void {
  const floor = y + seat
  const roof = floor - CAR_H
  const post = 0.04
  solid(p, ink, weight, ink)
  for (const x of [-CAR_W / 2, CAR_W / 2]) {
    p.rect(x * k, ((roof + floor) / 2) * k, post * k, (CAR_H + 0.02) * k)
  }
  p.rect(0, (roof - 0.01) * k, (CAR_W + 0.02) * k, 0.03 * k)
  outline(p, ink, weight)
  p.line((-CAR_W / 2 + 0.04) * k, (roof + CAR_H * 0.45) * k, (CAR_W / 2 - 0.04) * k, (roof + CAR_H * 0.45) * k)
  for (const x of [-GUIDE, GUIDE]) {
    p.line((x - 0.04) * k, (floor - 0.02) * k, (x + 0.04) * k, (floor - 0.02) * k)
    p.line((x - 0.04) * k, (roof + 0.02) * k, (x + 0.04) * k, (roof + 0.02) * k)
  }
  // Ink slab wider than the passenger, plus a coloured top. Same-colour
  // tokens ate the old sliver and the car vanished into a circle-in-a-box.
  solid(p, ink, weight, ink)
  p.rect(0, (floor + 0.055) * k, (CAR_W + 0.08) * k, 0.11 * k)
  solid(p, ink, weight, color)
  p.rect(0, (floor + 0.02) * k, (CAR_W + 0.08) * k, 0.04 * k)
}

export function counterweight(p: p5, k: number, ink: string, weight: number, color: string, y: number): void {
  solid(p, ink, weight, color)
  p.rect(CW_X * k, y * k, 0.09 * k, 0.12 * k)
}

export function cable(p: p5, k: number, ink: string, weight: number, fromY: number, toY: number, x = 0): void {
  if (Math.abs(toY - fromY) < 0.02) return
  outline(p, ink, weight)
  p.line(x * k, fromY * k, x * k, toY * k)
}

/**
 * Everything on a stack that moves, drawn in the top cell's frame: cables,
 * counterweight, the spinning sheave, the car. `travel` is in cells below the
 * top floor, so the car straddles the seam without any clipping — the overlay
 * is not confined to a cell, which is the whole point of drawing it here.
 * `floors` is the shaft's depth in cells: the counterweight hangs that far
 * down when the car is at the top, and rises as the car descends.
 */
export function carRig(
  p: p5,
  k: number,
  ink: string,
  weight: number,
  color: string,
  opts: { floorY: number; sheaveY: number; travel: number; seat: number; floors?: number },
): void {
  const { floorY, sheaveY, travel, seat } = opts
  const floors = opts.floors ?? 1
  const y = floorY + travel
  const cw = floorY + (floors - travel) - CW_RISE
  cable(p, k, ink, weight, sheaveY, y + seat - CAR_H)
  cable(p, k, ink, weight, sheaveY, cw, CW_X)
  counterweight(p, k, ink, weight, color, cw)
  sheave(p, k, ink, weight, sheaveY, travel * 6)
  car(p, k, ink, weight, color, y, seat)
}

/* ----------------------------------------------------------------- legacy */

/**
 * The old one-clock-per-cell elevator, still used by the circus catalog until
 * its acts become closed two-cell numbers. Nothing on a lane uses it.
 */
export const BOARD = 0.1
export const RIDE0 = 0.16
export const RIDE1 = 0.58
export const CLEAR = 0.62

/** How far the car has descended, in cells, from the top rail. */
export function rideTravel(t: number, floors: number): number {
  if (floors <= 0) return 0
  if (t < RIDE0) return 0
  if (t >= RIDE1) return floors
  return floors * easeInOutCubic(seg(t, RIDE0, RIDE1))
}

/** Passenger centre in this cell. Loose so the car can straddle the seam. */
export function carLocalY(travel: number, index: number): number | null {
  const y = travel - index
  if (y < -0.72 || y > 0.72) return null
  return y
}
