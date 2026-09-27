import { R } from '../../../../parts'
import { add, dist, hermite, scale, smooth, sub, type Pt } from './kit'
import { SCREW_RADIUS, SCREW_TOP } from './layout'
import { BAR, BEAT, PERIOD, PHASE, wrap } from './music'
import { INTO_SCREW, MOUTH } from './trough'

/**
 * The screw: the beat. An Archimedes screw of brass wire standing up the right side of the window, turning all the
 * time, slowly, a turn every four bars. The ball drops into its mouth a bar after the drums come in, and from there
 * the screw turns a turn a bar, stepping on every beat of the drum loop (faster through the beat, slower towards the
 * next, never still), and the ball rides up it inside the wire, a flight a turn, twenty-three turns to the top. It
 * gets there as the drums stop, and spills out of the head into the spout, into the silence before the next chord.
 */

/** Show time the ball reaches the head: bar 72's downbeat, where the drums stop. */
export const AT_TOP = PHASE + 288 * BEAT

/** The axis, from its foot to its head, and the side of it the ball rides on (below the axis, in the wire's trough). */
const RIDE = SCREW_RADIUS - R - 0.04
const INTAKE = 0.4
const { foot, along, down } = (() => {
  let foot: Pt = sub(MOUTH, [0, 0])
  let along: Pt = [0, -1]
  let down: Pt = [1, 0]
  for (let i = 0; i < 8; i++) {
    const d = sub(SCREW_TOP, foot)
    const L = Math.hypot(d[0], d[1])
    along = [d[0] / L, d[1] / L]
    down = [-along[1], along[0]]
    foot = sub(sub(MOUTH, scale(along, INTAKE)), scale(down, RIDE))
  }
  return { foot, along, down }
})()
export const SCREW_FOOT = foot
export const SCREW_ALONG = along
export const SCREW_DOWN = down
export const SCREW_LENGTH = dist(foot, SCREW_TOP)
/** The ball on its way up: its centre at `s` cells along from the foot. */
export const onScrew = (s: number): Pt => add(add(foot, scale(along, s)), scale(down, RIDE))
/** Where the ball leaves the head. */
const OUT = SCREW_LENGTH - 0.3

/** The screw's turning, turns a second: slow and steady, and a turn a bar while it carries the ball, stepping on the beats. */
const SURGE = 0.55
const STEP = 0.005
const on = (t: number): number => smooth(t, INTO_SCREW - 2 * BEAT, INTO_SCREW) - smooth(t, AT_TOP, AT_TOP + 2 * BEAT)
const busy = (t: number): number => (1 / BAR) * (1 + SURGE * Math.cos((2 * Math.PI * (t - PHASE)) / BEAT))

/** Turns since show time 0, every STEP, round a period that holds a whole number of them. */
const TURNS: Float64Array = (() => {
  const n = Math.round(PERIOD / STEP)
  const base = new Float64Array(n + 1)
  const idle = new Float64Array(n + 1)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * STEP
    base[i + 1] = base[i] + on(t) * busy(t) * STEP
    idle[i + 1] = idle[i] + (1 - on(t)) * STEP
  }
  // Idle a turn every four bars, near enough that the period holds a whole number of turns.
  const whole = Math.round(base[n] + idle[n] / (4 * BAR))
  const rate = (whole - base[n]) / idle[n]
  const out = new Float64Array(n + 1)
  for (let i = 0; i <= n; i++) out[i] = base[i] + rate * idle[i]
  return out
})()
/** How many whole turns the screw makes a period. */
export const SCREW_TURNS = Math.round(TURNS[TURNS.length - 1])

/** Turns since show time 0, at `t` taken round the circle. */
export function turns(t: number): number {
  const x = wrap(t) / STEP
  const i = Math.min(TURNS.length - 2, Math.floor(x))
  return TURNS[i] + (TURNS[i + 1] - TURNS[i]) * (x - i)
}

const IN = turns(INTO_SCREW)
const UP = turns(AT_TOP) - IN
/** Cells the ball climbs a turn: the wire's pitch. */
export const PITCH = (OUT - INTAKE) / UP

/** How far along the screw the ball is at `t` (in [INTO_SCREW, AT_TOP]). */
export const climbed = (t: number): number => INTAKE + PITCH * (turns(t) - IN)

/** The spout: from the head, over a hook of felt and back the other way, onto the rail. */
export const SPOUT = 1.5
export const RAIL_FROM: Pt = [SCREW_TOP[0] - 0.95, SCREW_TOP[1] + 0.5]
export const RAIL_V0: Pt = [-0.42, 0.04]
const TOP_V: Pt = scale(along, PITCH * ((turns(AT_TOP + 0.005) - turns(AT_TOP - 0.005)) / 0.01))

/** The spout's curve, as the ball's centre goes over it: from the head to the rail. */
export const spout = (t: number): Pt =>
  hermite({ t: AT_TOP, p: onScrew(OUT), v: TOP_V }, { t: AT_TOP + SPOUT, p: RAIL_FROM, v: RAIL_V0 }, t)

/** The ball from the screw's mouth to the rail. */
export function ballInScrew(t: number): { p: Pt; rolling: number } {
  if (t < AT_TOP) return { p: onScrew(climbed(t)), rolling: 0 }
  const a = spout(t - 0.004)
  const b = spout(t + 0.004)
  return { p: spout(t), rolling: Math.sign(b[0] - a[0]) * Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.008 }
}
