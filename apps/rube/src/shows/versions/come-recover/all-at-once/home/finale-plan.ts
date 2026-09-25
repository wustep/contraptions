import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, R, type Pt } from '../../../../../parts'
import { DURATION, home, HOME_HITS, JUMPS } from '../music'
import { G, launch } from '../physics'
import { HOME_CIRCLE } from '../seams'
import { WASHER, WASHERS } from './set'

/**
 * The finale, worked out once: where the family is at any show time, and the clocks of everything they touch. The
 * lane and the drawing both read these. Everything is in the room's own cells (`set.ts`).
 *
 * Home, through the washer by the door: the one Evelyn started the morning at, where Joy waited for her mother and
 * was not looked at. The peak hands over the bagel's hole grown small and full of light, the two of them at its
 * bottom; it is this washer's window.
 *
 *   264.14  the jump. The drum's glass full of the hole's light, Evelyn and Joy at its bottom.
 *   264.55  the drum starts to turn, and rocks them up its wall; 266.59 it turns back the other way.
 *   268.23  the cycle ends: its lamp goes out, the lock clicks. 268.39 the door swings open.
 *   269.70  Evelyn drops out onto the floor; 270.27 Joy after her.
 *   271.71  Waymond, who has been waiting by the counter, hops the washer's foot lever and is there: the family,
 *           touching. 271.91 the touch runs through Joy to her mother. 275.16 the door swings to.
 *   282.20  Evelyn sets off, slowly, to the foot switch of the party lights by the front door.
 *   286.20  she presses it: the lantern string lights, a lantern a beat (286.2 to 288.2), and the camera set up on
 *           the counter for the family portrait wakes, its self-timer lamp blinking faster and faster.
 *   290.38  she is back in her place beside Joy.
 *   290.99  the flash: the family portrait. Fireworks go up over the street in the window.
 *   295.01  the lights go out, the far tubes first, then 295.21, 295.41 the two over the counter (the first two
 *           that came on, 0.66 s into the show). The neon in the window goes out with them.
 *   the rest  the three of them in the glow of the washer's window, at night, while the credits come.
 */

export const BEGIN = JUMPS.home
export const END = DURATION
/** When the finale's things are in the room (a little before the jump, so the flickers show them). */
export const APPEAR = 262.8

/* ------------------------------------------------------------------ the washer by the door */

/** The laundromat part's washer walked this far toward its lever in its spin (13 s); it stands there since. */
export const CREEP = 0.12
export const W0 = WASHERS[0].x
/** The washer's centre as it stands, and its window's. */
export const WX = W0 + CREEP
export const PORT: Pt = [WX, WASHER.port]

/** Where the peak leaves them: Evelyn at the circle's bottom, Joy beside her. */
export const E_IN: Pt = [PORT[0] - HOME_CIRCLE.fromBall[0], PORT[1] - HOME_CIRCLE.fromBall[1]]
export const J_IN: Pt = [E_IN[0] + HOME_CIRCLE.joy[0], E_IN[1] + HOME_CIRCLE.joy[1]]

/** Where they land on the floor, and where each stands in the row (Joy between her parents). */
export const E_FLOOR: Pt = [E_IN[0] - 0.05, 0]
export const J_FLOOR: Pt = [J_IN[0] - 0.03, 0]
const TOUCH = 2 * R + 0.01
export const J_ROW: Pt = [E_FLOOR[0] + TOUCH, 0]
export const W_ROW: Pt = [J_ROW[0] + TOUCH, 0]

/** Waymond waits by the counter, past the foot lever (x -1.5 to -0.66 on the floor). */
export const W_WAIT: Pt = [-0.12, 0]

/* ------------------------------------------------------------------ the times */

const T_TURN = 264.545
const T_BACK = 266.588
const T_STOP = 267.9
export const T_LATCH = 268.225
export const T_DOOR = 268.388
const E_OUT = 269.305
export const E_LAND = 269.7
const J_OUT = 269.816
export const J_LAND = 270.269
const W_HOP = [270.942, 271.511] as const
export const W_TOUCH = 271.708
export const RIPPLE = 271.906
export const NUZZLE = 273.183
export const DOOR_TO = 275.156
export const SET_OFF = home(10)
export const PRESS = HOME_HITS[0]
const BACK_GO = 288.45
export const BACK = 290.377
export const FLASH = HOME_HITS[1]
export const LIGHTS_OUT = HOME_HITS[2]
/** The self-timer's blinks, faster and faster: on home's beats and eighths. */
export const BLINKS = [26, 27, 28, 29, 29.5, 30, 30.5, 31, 31.5].map(home)
/** Fireworks over the street: the flash, and the two loud notes after it. */
export const BURSTS: { at: number; x: number; y: number; r: number; color: 'gold' | 'rose' | 'light' }[] = [
  { at: FLASH, x: -7.0, y: -2.85, r: 0.95, color: 'gold' },
  { at: 291.724, x: -5.7, y: -2.45, r: 0.72, color: 'rose' },
  { at: 293.013, x: -6.35, y: -3.1, r: 0.88, color: 'light' },
]

/* ------------------------------------------------------------------ small tools */

const smooth01 = (u: number) => {
  const v = clamp(u)
  return v * v * (3 - 2 * v)
}
const ballistic = (p: Pt, v: Pt, s: number): Pt => [p[0] + v[0] * s, p[1] + v[1] * s + 0.5 * G * s * s]

/* ------------------------------------------------------------------ the drum */

/** The drum's own turn (radians), and how the two of them are rocked round its wall (radians, + clockwise). */
const RATE = 240
const SIM0 = BEGIN
const SIM1 = 270.5
const DRUM = (() => {
  const n = Math.ceil((SIM1 - SIM0) * RATE) + 2
  const turn = new Float32Array(n)
  const rock = new Float32Array(n)
  let th = 0
  let d = 0
  let v = 0
  const dt = 1 / RATE
  for (let i = 0; i < n; i++) {
    const t = SIM0 + i * dt
    // The drum's speed: starting, turning back, stopping.
    const w = 1.15 * (smooth01((t - T_TURN) / 0.2) - 2 * smooth01((t - T_BACK) / 0.35) + smooth01((t - T_STOP) / 0.45))
    // They are carried up the wall with it, and roll back: a heavy spring towards where the turn holds them.
    const eq = 0.3 * (w / 1.15)
    v += (-26 * (d - eq) - 3.2 * v) * dt
    d += v * dt
    th += w * dt
    turn[i] = th
    rock[i] = d
  }
  return { turn, rock }
})()
const sample = (arr: Float32Array, t: number): number => {
  const i = (Math.min(SIM1, Math.max(SIM0, t)) - SIM0) * RATE
  const j = Math.floor(i)
  return arr[j] + (arr[j + 1] - arr[j]) * (i - j)
}
/** In the quiet under the credits, on 305.40, the empty drum gives one slow half-turn and settles. */
export const TURN_OVER = home(68)
/** And on 312.59 the window's light swells once. */
export const SWELL = home(86)
const lateTurn = (t: number): number => {
  const u = t - TURN_OVER
  if (u <= 0) return 0
  const s = Math.min(1, u / 2.6)
  return Math.PI * (1 - Math.pow(1 - s, 3)) + 0.05 * Math.exp(-Math.max(0, u - 2.6) / 0.3) * Math.sin(Math.max(0, u - 2.6) * 9)
}
export const drumTurn = (t: number): number => (t < SIM0 ? 0 : sample(DRUM.turn, t) + lateTurn(t))
const rockAt = (t: number): number => (t < SIM0 ? 0 : sample(DRUM.rock, t))

/** A ball on the drum's wall, rocked: where it sat at the jump, carried round the window's centre. */
function inDrum(at: Pt, t: number): Pt {
  const dx = at[0] - PORT[0]
  const dy = at[1] - PORT[1]
  const r = Math.hypot(dx, dy)
  const a = Math.atan2(dy, dx) + rockAt(t)
  return [PORT[0] + r * Math.cos(a), PORT[1] + r * Math.sin(a)]
}

/** The two drops out of the drum: a small lift over the rim, and down to the floor. */
const E_DROP = (() => {
  const from = inDrum(E_IN, E_OUT)
  return { from, v: launch(from, E_FLOOR, E_LAND - E_OUT).out }
})()
const J_DROP = (() => {
  const from = inDrum(J_IN, J_OUT)
  return { from, v: launch(from, J_FLOOR, J_LAND - J_OUT).out }
})()

/* ------------------------------------------------------------------ the foot switch, the camera */

/** The party lights' foot switch on the floor by the front door: its middle, its dome and its button. */
export const SWITCH = { x: -3.18, w: 0.3, h: 0.09, button: 0.035 }
/** Where she sits on it with the button down. */
const ON_SWITCH: Pt = [SWITCH.x, FLOOR - SWITCH.h - R]
/** Her height rolling up the dome's flank. */
function switchY(x: number): number {
  const d = Math.abs(x - SWITCH.x)
  const reach = SWITCH.w / 2 + 0.1
  if (d >= reach) return 0
  const u = 1 - d / reach
  return (FLOOR - SWITCH.h - R - SWITCH.button) * smooth01(u * 1.15)
}
/** The button: up, pressed on 286.2, up again as she rolls off. */
export function buttonDown(t: number): number {
  if (t < PRESS - 0.02) return 0
  if (t < BACK_GO + 0.3) return smooth01((t - (PRESS - 0.02)) / 0.04)
  return 1 - smooth01((t - (BACK_GO + 0.3)) / 0.08)
}

/** The camera for the portrait, on its little tripod on the counter, looking left at the washer. */
export const CAMERA = { x: 1.72, foot: -1.2, lens: [1.46, -1.62] as Pt, lamp: [1.6, -1.72] as Pt, flash: [1.74, -1.95] as Pt }

/** The self-timer lamp: dark till the lights are on, then a blink on each of its beats, and lit through the flash. */
export function timerLamp(t: number): number {
  if (t < PRESS) return 0
  if (t >= FLASH + 0.5) return 0
  let v = 0.25
  for (const b of BLINKS) {
    const u = t - b
    if (u >= 0 && u < 0.3) v = Math.max(v, Math.exp(-u / 0.09))
  }
  if (t >= BLINKS[BLINKS.length - 1]) v = Math.max(v, 0.9)
  return v
}

/* ------------------------------------------------------------------ Evelyn */

/** Where she is at show time `t`, in the room's cells. */
export function evelynAt(t: number): Pt {
  if (t < T_TURN) return E_IN
  if (t < E_OUT) return inDrum(E_IN, t)
  if (t < E_LAND) return ballistic(E_DROP.from, E_DROP.v, t - E_OUT)
  if (t < SET_OFF) return E_FLOOR
  if (t < PRESS) {
    // A slow, even roll to the switch, easing up onto it, its button going down under her on the beat.
    const s = (t - SET_OFF) / (PRESS - SET_OFF)
    const f = 1 - Math.pow(1 - s, 1.7)
    const x = E_FLOOR[0] + (ON_SWITCH[0] - E_FLOOR[0]) * f
    return [x, Math.min(0, switchY(x))]
  }
  if (t < BACK_GO) return ON_SWITCH
  if (t < BACK) {
    // Back to her place for the photograph, down off the switch and along, to touch Joy.
    const s = (t - BACK_GO) / (BACK - BACK_GO)
    const f = s * s * (3 - 2 * s) * 0.82 + 0.18 * s
    const x = ON_SWITCH[0] + (E_FLOOR[0] - ON_SWITCH[0]) * f
    return [x, Math.min(0, switchY(x) + SWITCH.button * (1 - smooth01(s * 6)))]
  }
  return E_FLOOR
}

/** The lane's pieces, split at every jolt; `still` where she is at rest. */
export const PIECES: { a: number; b: number; still?: boolean }[] = (() => {
  const cuts = [BEGIN, T_TURN, E_OUT, E_LAND, SET_OFF, PRESS, BACK_GO, BACK, END]
  const still = new Set([BEGIN, E_LAND, PRESS, BACK])
  const out: { a: number; b: number; still?: boolean }[] = []
  for (let i = 1; i < cuts.length; i++) out.push({ a: cuts[i - 1], b: cuts[i], still: still.has(cuts[i - 1]) })
  return out
})()

/* ------------------------------------------------------------------ Joy and Waymond */

export function joyAt(t: number): Pt {
  if (t < T_TURN) return J_IN
  if (t < J_OUT) return inDrum(J_IN, t)
  if (t < J_LAND) return ballistic(J_DROP.from, J_DROP.v, t - J_OUT)
  // Waymond's touch pushes her against her mother.
  const nudge = smooth01((t - W_TOUCH) / (RIPPLE - W_TOUCH))
  const x = J_FLOOR[0] + (J_ROW[0] - J_FLOOR[0]) * nudge
  return [x, 0]
}

export function waymondAt(t: number): Pt {
  // Waiting; a little way towards the washer as its door opens; then a hop over the lever, and to them.
  const hopFrom: Pt = [W_WAIT[0] - 0.14, 0]
  const hopTo: Pt = [-1.62, 0]
  if (t < W_HOP[0]) return [W_WAIT[0] + (hopFrom[0] - W_WAIT[0]) * smooth01((t - T_DOOR) / 0.6), 0]
  if (t < W_HOP[1]) {
    const v = launch(hopFrom, hopTo, W_HOP[1] - W_HOP[0]).out
    return ballistic(hopFrom, v, t - W_HOP[0])
  }
  const touch = J_FLOOR[0] + TOUCH
  if (t < W_TOUCH) {
    const s = (t - W_HOP[1]) / (W_TOUCH - W_HOP[1])
    return [hopTo[0] + (touch - hopTo[0]) * (1 - (1 - s) * (1 - s) * 0.6 - 0.4 * (1 - s)), 0]
  }
  const s = smooth01((t - W_TOUCH) / (RIPPLE - W_TOUCH))
  // A nuzzle: he eases back a little and bumps in against Joy again, on 273.18, and settles.
  const back = NUZZLE - 0.45
  let dx = 0
  if (t > back && t < NUZZLE) dx = 0.06 * Math.sin((Math.PI * (t - back)) / (NUZZLE - back))
  if (t >= NUZZLE) dx = -0.012 * Math.exp(-(t - NUZZLE) / 0.08) * Math.sin((t - NUZZLE) * 30)
  return [touch + (W_ROW[0] - touch) * s + dx, 0]
}

/* ------------------------------------------------------------------ the washer's clocks */

/** The door: shut; flung open on 268.39, bouncing off its stop; open while they come out; swinging to by 275.16. */
export function doorAt(t: number): number {
  if (t < T_DOOR) return 0
  const u = t - T_DOOR
  if (u < 0.3) return 1.04 * (1 - Math.pow(1 - u / 0.3, 2))
  const open = 1 - 0.1 * Math.exp(-(u - 0.3) / 0.15) * Math.abs(Math.sin((u - 0.3) * 18)) + 0.04 * Math.exp(-(u - 0.3) / 0.05)
  const close = DOOR_TO - 2.6
  if (t < close) return Math.min(1.04, open)
  const s = clamp((t - close) / (DOOR_TO - close))
  if (s < 1) return 1 - s * s * (3 - 2 * s) * 0.97 - 0.03 * s * s
  const w = t - DOOR_TO
  return 0.03 * Math.exp(-w / 0.08) * Math.abs(Math.sin(w * 30))
}

/** The washer's running lamp: on from the jump till the cycle ends. */
export const runLamp = (t: number): number => (t >= BEGIN - 2 && t < T_LATCH ? 1 : 0)

/** A jolt of the washer's body: the drum starting, and turning back. */
export function bodyJolt(t: number): number {
  let v = 0
  for (const at of [T_TURN, T_BACK, T_LATCH, TURN_OVER]) {
    const u = t - at
    if (u >= 0 && u < 0.5) v += 0.012 * Math.exp(-u / 0.06) * Math.sin(u * 60)
  }
  return v
}

/**
 * The window's light: the bagel's hole was full of light when it became this glass; the light stays in the drum,
 * cooler at first, warming as the evening goes on, breathing a little, and going down with the music at the very end.
 */
export function windowLight(t: number): { a: number; warm: number } {
  if (t < APPEAR) return { a: 0, warm: 0 }
  const warm = smooth01((t - 268) / 20)
  const end = 1 - 0.45 * smooth01((t - 326) / (END - 326))
  const breath = 1 + 0.06 * Math.sin((t - BEGIN) * 0.9)
  // On 312.59, once, the window's light swells, and slowly goes back.
  const w = t - SWELL
  const swell = w > 0 ? 0.35 * (1 - Math.exp(-w / 0.12)) * Math.exp(-w / 2.2) : 0
  return { a: 0.85 * end * breath * (1 + swell), warm }
}

/** What was struck, for the score: every visible strike. */
export const STRIKES: number[] = [T_TURN, T_BACK, T_LATCH, T_DOOR, E_OUT, E_LAND, J_OUT, J_LAND, W_HOP[0], W_HOP[1], W_TOUCH, RIPPLE, NUZZLE, DOOR_TO, SET_OFF, PRESS, home(22), home(23), home(24), home(25), ...BLINKS, BACK, FLASH, 291.724, 293.013, LIGHTS_OUT, home(42.5), home(43), TURN_OVER, SWELL]
