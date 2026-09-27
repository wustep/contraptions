import { add, hermite, ring, settle, smoother, type Pt } from './kit'
import { CHUTE_FROM, GONDOLAS, HANG, LAMP, RIM_SPEED, WHEEL_R, WHEEL_TURN } from './layout'
import { since } from './music'
import { BOARD } from './rail'

/**
 * The wheel: the arpeggios. A little wheel of six gondolas round the lamp, turning all the time, anticlockwise, a turn
 * every three bars, so a period holds a whole number of sixths of a turn and it comes round with the music. The ball
 * drops into the gondola at the top on the arpeggios' first accent and rides round the light four times and a half;
 * at the bottom, on the last chord of the coda, a cam tips the gondola and the ball rolls out onto the felt chute.
 */

/** Seconds a turn. */
export const TURN = WHEEL_TURN
/** Show time the gondola that carries the ball is at the bottom for the last time: four turns and a half after it boards. */
export const ALIGHT = BOARD + 4.5 * TURN

/** The wheel's angle at `t`, radians from the top, clockwise on the screen: it turns anticlockwise, so this falls. */
export const wheelAngle = (t: number): number => (-2 * Math.PI * (t - BOARD)) / TURN
/** Where gondola `k`'s pin is on the wheel at `t`. Gondola 0 carries the ball. */
export function pin(k: number, t: number): Pt {
  const a = wheelAngle(t) + (2 * Math.PI * k) / GONDOLAS
  return [LAMP[0] + WHEEL_R * Math.sin(a), LAMP[1] - WHEEL_R * Math.cos(a)]
}

/** The cam's tip, radians, of the gondola passing the bottom: how far it is turned over, to the right, to pour. */
const TIP = 0.95
const TIP_IN = 0.35
/** Seconds the ball takes to roll out over the gondola's lip once it is tipped. */
export const ROLL_OUT = 0.3

/**
 * Gondola `k`'s tilt at `t`, radians clockwise: hanging plumb as the wheel turns; swung a little by the ball landing
 * in it (the ball comes in going left); and, for the ball's gondola at its last bottom, turned over by the cam to
 * pour, and let go to swing back and settle.
 */
export function tilt(k: number, t: number): number {
  if (k !== 0) return 0
  let a = -0.16 * ring(since(t, BOARD), 1.3, 0.9)
  const s = since(t, ALIGHT - TIP_IN)
  if (s >= 0 && s < TIP_IN + ROLL_OUT) a += TIP * smoother(s, 0, TIP_IN)
  else if (s >= TIP_IN + ROLL_OUT && s < 9) a += TIP * settle(s - TIP_IN - ROLL_OUT, 1.25, 0.55) * Math.min(1, (9 - s) / 2)
  return a
}

/** Where the ball sits in gondola `k` at `t`: under its pin. A gondola tips about the ball in it, not about its pin. */
export const seat = (k: number, t: number): Pt => add(pin(k, t), [0, HANG])

/** How fast the ball leaves the gondola: the wheel's rim speed at the bottom, going right. */
export const CHUTE_V0: Pt = [RIM_SPEED, 0]

/** The ball from the top gondola to the chute. */
export function ballOnWheel(t: number): { p: Pt; rolling: number } {
  if (t < ALIGHT) return { p: seat(0, t), rolling: 0 }
  // Tipped out over the lip, and rolling off onto the felt.
  return { p: hermite({ t: ALIGHT, p: seat(0, ALIGHT), v: [RIM_SPEED, 0] }, { t: ALIGHT + ROLL_OUT, p: CHUTE_FROM, v: CHUTE_V0 }, t), rolling: CHUTE_V0[0] }
}

/** The ball's squash as it drops into the gondola. */
export function wheelSquash(t: number): number {
  const s = since(t, BOARD)
  if (s < 0 || s > 0.6) return 0
  return 0.1 * (1 - Math.exp(-s / 0.012)) * Math.exp(-s / 0.08) * Math.cos((2 * Math.PI * s) / 0.32)
}
