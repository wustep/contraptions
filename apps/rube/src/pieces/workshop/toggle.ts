import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../parts'

/**
 * A toggle: the flip-flop of a marble machine. The rail ends at a hopper,
 * two slanted lips over a throat, which takes the way off the ball: it
 * swoops in, ticks on the far lip and drops out of the throat down the
 * machine's centre line. Below stands a rocker on a pin, two arms and a
 * fin between them, leaning on a stop with the fin tipped away from
 * the side the ball is to leave by. The ball comes down on the fin's
 * shoulder and is shed down its flank into the crook of the raised arm;
 * the knock unsettles the rocker, which creeps toward level under the
 * weight and then goes over with a clack onto its other stop. The arm now
 * slopes the way out and the ball rolls off its end onto the rail a floor
 * down, on or back. The rocker stays as the ball left it, pointing the
 * other way, which is all a flip-flop remembers.
 *
 * The ball's place on the rocker is kept in the rocker's own frame, a
 * radius off the fin's point, its flank or the arm, and its pace there is
 * what the slope under it gives at each instant, the rocker's tilt
 * included. The lane is that place turned by the same tilt the rocker is
 * drawn with, so the ball sits on the metal at every angle.
 */
export interface ToggleState {
  color: string
  /** 1: carries on east. -1: turns back west. */
  turn: 1 | -1
}

/** The machine stands west of the cell's middle: the ball comes from there, and the way on gets a run of rail. */
const PX = -0.05
/** The rocker: an arm's length and thickness, half the fin's foot and its height, and how far over it leans on either stop. */
const ARM = 0.34
const THICK = 0.07
const FIN_B = 0.12
const FIN_H = 0.2
const A0 = 0.35
/** The pin's height: an arm that is down meets the rail a floor below. */
const PY = 1 + FLOOR - ARM * Math.sin(A0)
/** The fin's flank, as an angle up from the arm. */
const BETA = Math.atan2(FIN_H, FIN_B)

/** The hopper: half its width at the rail, half its throat, where the lips give way to the throat's walls, and where those end. */
const LIP = 0.3
const THROAT = 0.18
const LIP_Y = FLOOR + 0.12
const CHUTE_Y = FLOOR + 0.27
/** The far cheek stands this much taller than the near one, a backstop; and each has this much flat top outside its lip. */
const BACK = 0.09
const FLAT = 0.06
/** The frame the rocker stands in: half its width on the floor, and where along an arm's underside its stops are. */
const FRAME = 0.3
const STOP = 0.23
/** The rebound off the far lip leaves the ball this far west of the centre line as it drops. */
const DRIFT = 0.036799

/** Cartoon gravity: for the drop out of the hopper, and along whatever slope the rocker offers. Cells per second squared. */
const G_FALL = 11
const G_RIDE = 8
/** What the landing leaves the ball along the fin, what the crook leaves it along the arm, and the drag of rolling. */
const V_LAND = 0.2
const CROOK = 0.55
const DRAG = 0.8
/**
 * The rocker's hesitation once the ball is in the crook, how far it creeps
 * toward level in that time, and how long it then takes to go over; the jar
 * the landing gives it, which lifts its far arm off the stop and lets it
 * chatter back down.
 */
const CREEP = 0.3712351
const A_CREEP = 0.28
const SNAP = 0.18
const JAR = 0.06

/** Where the ball is as it crosses the hopper. It leaves the rail level, as a thing rolling off an edge does. */
const KNEE: Pt = [PX - LIP, 0]
const TICK: Pt = (() => {
  // A radius off the far lip, a little way up it from the throat.
  const lip: Pt = [LIP - THROAT, FLOOR - BACK - LIP_Y]
  const len = Math.hypot(lip[0], lip[1])
  const at: Pt = [PX + THROAT + (lip[0] / len) * 0.05, LIP_Y + (lip[1] / len) * 0.05]
  return [at[0] + (lip[1] / len) * R, at[1] - (lip[0] / len) * R]
})()
const MOUTH: Pt = [PX - DRIFT, LIP_Y]
const T_KNEE = (KNEE[0] + 0.5) / ROLL
const SWOOP = Math.hypot(TICK[0] - KNEE[0], TICK[1] - KNEE[1]) / ROLL
/** Off the far lip at this pace, and into the throat at that one, already falling. */
const V_TICK = 2
const V_MOUTH = 1
const SETTLE = Math.hypot(MOUTH[0] - TICK[0], MOUTH[1] - TICK[1]) / ((V_TICK + V_MOUTH) / 2)

/** The ball's centre in the rocker's frame, `s` along its way from the fin's point: round the point, down the flank, along the arm. */
const S_FLANK = R * BETA
const D_SEAT = (FIN_H + R * Math.cos(BETA) - R) / Math.sin(BETA)
const S_SEAT = S_FLANK + D_SEAT
const U_SEAT = R * Math.sin(BETA) + D_SEAT * Math.cos(BETA)
const S_END = S_SEAT + (ARM - U_SEAT)
function onRocker(s: number): Pt {
  if (s < S_FLANK) return [R * Math.sin(s / R), -FIN_H - R * Math.cos(s / R)]
  if (s < S_SEAT) return [R * Math.sin(BETA) + (s - S_FLANK) * Math.cos(BETA), -FIN_H - R * Math.cos(BETA) + (s - S_FLANK) * Math.sin(BETA)]
  return [U_SEAT + (s - S_SEAT), -R]
}
/** How steeply that way runs downhill there, in the rocker's frame. */
const slopeAt = (s: number): number => (s < S_FLANK ? s / R : s < S_SEAT ? BETA : 0)

/** A point of the rocker's frame, with the rocker tilted `a` (exit arm down positive), for a rocker that sends the ball `turn`. */
const inWorld = (turn: 1 | -1, v: Pt, a: number): Pt => [PX + turn * (v[0] * Math.cos(a) - v[1] * Math.sin(a)), PY + v[0] * Math.sin(a) + v[1] * Math.cos(a)]

interface Variant {
  lane: Lane
  /** When the ball lands on the fin, and when it reaches the crook and the rocker begins to give. */
  tLand: number
  tSeat: number
}

/** The rocker's tilt `t` seconds into the piece, the way-out arm down positive, given when the ball landed and when it reached the crook. */
function tiltAt(t: number, tLand: number, tSeat: number): number {
  const tau = t - tSeat
  const jar = t > tLand ? JAR * Math.exp(-(t - tLand) * 9) * Math.abs(Math.sin((t - tLand) * 21)) : 0
  if (tau <= 0) return -A0 + jar
  if (tau < CREEP) return -A0 + jar + A_CREEP * easeInQuad(tau / CREEP)
  if (tau < CREEP + SNAP) return -A0 + A_CREEP + (2 * A0 - A_CREEP) * easeInQuad((tau - CREEP) / SNAP)
  // On its other stop, with a bounce or two.
  const rest = tau - CREEP - SNAP
  return A0 - 0.05 * Math.exp(-rest * 9) * Math.abs(Math.sin(rest * 24))
}

const VARIANTS = new Map<number, Variant>()
function variantFor(turn: 1 | -1): Variant {
  const had = VARIANTS.get(turn)
  if (had) return had
  // Where along the fin the drop's line meets the ball's way: on the point's shoulder, or further down the flank.
  let lo = 0
  let hi = S_SEAT
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (turn * (inWorld(turn, onRocker(mid), -A0)[0] - MOUTH[0]) < 0) lo = mid
    else hi = mid
  }
  const sLand = (lo + hi) / 2
  const land = inWorld(turn, onRocker(sLand), -A0)
  // A fall under gravity from the pace it enters the throat at.
  const vLand = Math.sqrt(V_MOUTH * V_MOUTH + 2 * G_FALL * (land[1] - MOUTH[1]))
  const drop = (land[1] - MOUTH[1]) / ((V_MOUTH + vLand) / 2)
  const tLand = T_KNEE + SWOOP + SETTLE + drop

  // The ride, tabulated: down the fin, into the crook, a little way up the raised arm and back, and out along it once the rocker has gone over.
  const dt = 1 / 480
  const way: number[] = [sLand]
  let s = sLand
  let v = V_LAND
  let tSeat = Infinity
  let tOff = tLand
  for (let i = 1; i < 4000; i++) {
    const t = tLand + i * dt
    v += (G_RIDE * Math.sin(slopeAt(s) + tiltAt(t, tLand, tSeat)) - DRAG * v) * dt
    let next = s + v * dt
    if (s < S_SEAT && next >= S_SEAT) {
      // Into the crook: the arm takes what the flank gave it, less the knock.
      tSeat = t - dt + (dt * (S_SEAT - s)) / (next - s)
      next = S_SEAT
      v *= Math.cos(BETA) * CROOK
    } else if (tSeat < Infinity && next < S_SEAT) {
      // Back down the raised arm into the crook, and still.
      next = S_SEAT
      v = 0
    }
    if (next >= S_END) {
      tOff = t - dt + (dt * (S_END - s)) / (next - s)
      way.push(S_END)
      break
    }
    s = next
    way.push(s)
  }
  const at = (t: number): Pt => {
    const f = Math.max(0, Math.min(way.length - 1, (t - tLand) / dt))
    const i = Math.floor(f)
    // The last step is a short one: it ends when the ball is off the arm, not on the tick.
    const step = i === way.length - 2 ? (tOff - tLand) / dt - i : 1
    const here = way[i] + (way[Math.min(way.length - 1, i + 1)] - way[i]) * Math.min(1, (f - i) / step)
    return inWorld(turn, onRocker(here), tiltAt(t, tLand, tSeat))
  }
  const ride = trace(at, tLand, tOff, 48)
  const last = ride[ride.length - 1]
  const pace = Math.hypot(last.to[0] - last.from[0], last.to[1] - last.from[1]) / last.dur
  const lane: Lane = {
    segs: [
      roll([-0.5, 0], KNEE, ROLL),
      fly(KNEE, TICK, SWOOP, (TICK[1] - KNEE[1]) / 4),
      ramp(TICK, MOUTH, V_TICK, V_MOUTH),
      ramp(MOUTH, land, V_MOUTH, vLand),
      ...ride,
      ramp(last.to, [turn * 0.5, 1], pace, ROLL),
    ],
    fire: tSeat + CREEP + SNAP,
  }
  const out: Variant = { lane, tLand, tSeat }
  VARIANTS.set(turn, out)
  return out
}

/** One side of the hopper, cut through: a block with a slanted lip over a throat wall. `side` is -1 for the near one. */
function cheek(p: p5, k: number, side: 1 | -1): void {
  const top = side > 0 ? FLOOR - BACK : FLOOR
  p.beginShape()
  p.vertex((PX + side * (LIP + FLAT)) * k, top * k)
  p.vertex((PX + side * LIP) * k, top * k)
  p.vertex((PX + side * THROAT) * k, LIP_Y * k)
  p.vertex((PX + side * THROAT) * k, CHUTE_Y * k)
  p.vertex((PX + side * (LIP + FLAT)) * k, CHUTE_Y * k)
  p.endShape(p.CLOSE)
}

export const toggle = definePiece<ToggleState>({
  name: 'toggle',
  weight: 1,
  place: ({ rng, color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    for (const turn of rankBy(rng, [1, -1] as const, (d) => (d > 0 ? 1 : 0.8))) {
      const exit: Pt = [turn, 1]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: turn }, lane: variantFor(turn).lane, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { turn } = s
    const v = variantFor(turn)
    const a = tiltAt(t, v.tLand, v.tSeat)

    // The rail in, to the hopper's near cheek; the hopper, cut through, each cheek on a post.
    rail(p, k, ink, weight, -0.5, PX - LIP)
    for (const side of [-1, 1]) post(p, k, ink, weight, PX + (side * (THROAT + LIP + FLAT)) / 2, CHUTE_Y, 0.5)
    solid(p, ink, weight, s.color)
    cheek(p, k, -1)
    cheek(p, k, 1)

    // The rail out a floor down, from where the arm comes to rest.
    const tip = PX + turn * ARM * Math.cos(A0)
    rail(p, k, ink, weight, Math.min(tip, turn * 0.5), Math.max(tip, turn * 0.5), 1 + FLOOR)
    if (turn > 0) post(p, k, ink, weight, 0.44, 1 + FLOOR, 1.5)

    // The frame the rocker stands in, all on one sill: a trestle up to the pin, and a stop under each arm.
    const stop = inWorld(1, [STOP, THICK], A0)
    outline(p, ink, weight)
    p.line((PX - FRAME) * k, 1.5 * k, (PX + FRAME) * k, 1.5 * k)
    p.line((PX - 0.12) * k, 1.5 * k, PX * k, PY * k)
    p.line((PX + 0.12) * k, 1.5 * k, PX * k, PY * k)
    for (const side of [-1, 1]) {
      const x = PX + side * (stop[0] - PX)
      p.line(x * k, stop[1] * k, x * k, 1.5 * k)
      p.line((x - 0.05) * k, stop[1] * k, (x + 0.05) * k, stop[1] * k)
    }

    // The rocker: two arms and the fin between them, one shape on its pin.
    p.push()
    p.translate(PX * k, PY * k)
    p.rotate(turn * a)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-ARM * k, 0)
    p.vertex(-FIN_B * k, 0)
    p.vertex(0, -FIN_H * k)
    p.vertex(FIN_B * k, 0)
    p.vertex(ARM * k, 0)
    p.vertex(ARM * k, THICK * k)
    p.vertex(-ARM * k, THICK * k)
    p.endShape(p.CLOSE)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(PX * k, PY * k, 0.06 * k)

    // The clack, off the stop the rocker comes down on, out under the arm's end.
    const f = over(since, 0, 0.2)
    if (f > 0 && f < 1) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight * (1 - f))
      for (const d of [0.15, 0.7, 1.25]) {
        const r0 = 0.05 + 0.06 * f
        const r1 = 0.09 + 0.1 * f
        p.line((PX + turn * (stop[0] - PX + 0.05 + Math.cos(d) * r0)) * k, (stop[1] + 0.03 + Math.sin(d) * r0) * k, (PX + turn * (stop[0] - PX + 0.05 + Math.cos(d) * r1)) * k, (stop[1] + 0.03 + Math.sin(d) * r1) * k)
      }
      p.pop()
    }
  },
})
