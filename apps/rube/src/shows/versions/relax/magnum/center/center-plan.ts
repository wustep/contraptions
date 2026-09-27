import type { Pt, Seg } from '../../../../../parts'
import { laneAt, R } from '../../../../../parts'
import { bar, beat, half, onset, SEAM, END, DURATION } from '../music'
import { G } from '../physics'
import { KID_SCALE } from '../worlds'

/**
 * The Center's numbers and its clocks (the CENTER builder's): where everything stands, in the part's own cells (the
 * set and the part share one frame: `CENTER_AT` is the origin, Derek comes in at (-0.5, 0), a ball on the path has
 * its centre at y 0, the path's surface is at y 0.13), and every moving thing as a pure function of show time, so the
 * drawing and the lanes read the same motion.
 *
 * The story, left to right on the lawn: the pump, the model under its sheet, the old tree with the unveiling's
 * bell-pull, Derek and Hansel. Everything that grows grows from the model's left foot (`MODEL.x0`) to the right, over
 * the lawn where the story began; the pump and the path stay where they are.
 */

/* ------------------------------------------------------------------ the ground and the model */

/** The path's surface. */
export const GROUND = 0.13
/** How far the model is enlarged at the end: three times, three times. */
export const FULL = 27
/**
 * The model at its first size: its left foot, its width and its height to the top of its lantern. The building is
 * drawn in full-size cells (`D`) and shrunk by `S / FULL`, so it is the same building at every size.
 */
export const MODEL = { x0: -3.2, w: 0.5, h: 0.3 }
/** The Center at full size, in its own cells: X from its left foot, Y up from the path. */
export const D = {
  W: 13.5,
  H: 8.1,
  plinth: 0.55,
  /** The stair up to the door: three steps. */
  stair: { x0: 5.05, x1: 8.45, n: 3 },
  /** The doorway, and the two leaves in it. */
  door: { x0: 6.0, x1: 7.5, top: 3.05 },
  wings: [
    [0.35, 4.6],
    [8.9, 13.15],
  ] as [number, number][],
  wingTop: 5.0,
  /** The portico: four columns and a pediment; the lantern behind it. */
  portico: { x0: 4.45, x1: 9.05, top: 5.55, apex: 6.95 },
  columns: [4.75, 5.75, 7.75, 8.75],
  windows: [1.25, 2.47, 3.7, 9.8, 11.03, 12.25],
  window: { w: 0.82, y0: 1.05, y1: 3.95 },
  lantern: { x0: 6.15, x1: 7.35, y0: 6.3, y1: 7.3 },
  /** The model's own trees (they grow with it): one behind the right wing, one past its right end. */
  trees: [
    { x: 11.9, h: 6.7, w: 3.1, behind: true, seed: 3 },
    { x: 14.85, h: 5.7, w: 3.0, behind: false, seed: 7 },
  ],
}
/** The model's width with its trees, at its first size, and its centre. */
export const MODEL_X = MODEL.x0 + MODEL.w / 2
/** Where a point of the full-size design is, at scale `S` (1 to 27). */
export const at = (S: number, X: number, Y: number): Pt => [MODEL.x0 + (X * S) / FULL, GROUND - (Y * S) / FULL]

/** The door at full size (its middle), and the landing before it: a ball on it has its centre at y `LANDING`. */
export const DOOR_X = at(FULL, (D.door.x0 + D.door.x1) / 2, 0)[0]
export const LANDING = GROUND - D.plinth - R
/** Where each step's tread is at full size: a ball on step k (1..3) has its centre here. */
export const stepY = (k: number): number => GROUND - (D.plinth * k) / D.stair.n - R

/** The old tree the sheet's cord is thrown over, and the bell-pull hanging from it. */
export const TREE = { x: -1.22, trunk: 0.26, fork: -2.6 }
export const BRANCH_Y = -3.3
export const PULL_X = -1.02
/** The counterweight: from up in the leaves down behind the trunk, till the sheet is up at the limb. */
export const WEIGHT = { x: TREE.x + 0.02, y0: -3.2, y1: -0.6 }

/** The foot pump: a bellows on a base board, its pedal hinged at its left end, and its hose to the model's foot. */
export const PUMP = { x0: -5.45, x1: -4.55, base: GROUND - 0.06, hingeX: -5.41, len: 0.9, up: 0.45, down: 0.17, board: 0.05 }

/** The press at the opening, in the lawn right of the stair and nearer us than the path (drawn, never balls). */
export const PRESS = [5.72, 6.42, 7.12]
export const PRESS_FOOT = GROUND + 1.35
export const PRESS_SCALE = 1.1

/* ------------------------------------------------------------------ the clock */

/** The cut (in a flash) from Derelicte. */
export const CUT = SEAM.center
/** Derek bumps the bell-pull: the sheet goes up into the tree. The camera cuts to the model on it. */
export const BUMP = bar(98)
/** He comes up beside it, and it is the size of a center for ants. */
export const BESIDE = bar(100)
/** He starts back from it, jumps over it, and lands the far side. */
export const RECOIL = beat(402)
export const OVER = beat(403)
export const LANDED = bar(101)
/** A test: he hops up on the pedal's end, it gives a little, the model puffs and shivers, and he hops back down. */
export const TAP_UP = beat(413)
export const TAP = beat(414)
export const TAP_OFF = half(414)
export const TAP_BACK = half(415)
/** Getting ready on the drum break: a bounce on every hit of the fill, creeping in, then the leap onto the pump. */
export const BOUNCES = [half(418), beat(419), half(419), beat(420), half(420), beat(421), half(421), beat(422)]
/** Bar 106's three calls: three stomps, three times bigger three times. The fourth stomp, on the shout, opens the doors. */
export const STOMPS = [beat(424), beat(425), beat(426), beat(427)]
/** He leaves the pedal on each off-beat after: down with it, up with it, and away with the speed it gives him. */
export const RELEASES = [half(424), half(425), half(426), half(427)]
/** Off the pump onto the path. */
export const OFF = half(428)
/** Hansel's and Derek's steps up to the door (landings). */
export const HANSEL_STEPS = [half(431), beat(432), half(432)]
export const DEREK_STEPS = [half(434), beat(435), half(435)]
/** The last photograph. */
export const PHOTO = END
/** How long the air takes down the hose, from the stomp to the building. */
export const AIR = 0.06
/** When each growth begins at the building (the stomp, and the air down the hose). */
export const GROWS = STOMPS.slice(0, 3).map((t) => t + AIR)
export const DOORS = STOMPS[3] + AIR

/* ------------------------------------------------------------------ springs */

/** A step from 0 to 1 at u = 0 with a damped overshoot: `z` damping, `w` natural frequency (rad/s). */
export function spring(u: number, z = 0.6, w = 30): number {
  if (u <= 0) return 0
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * u))
}
/** The building's scale at `t` for a part of it that lags `lag` seconds and springs with damping `z`. */
export function scaleAt(t: number, lag = 0, z = 0.6, w = 30): number {
  let l = 0
  for (const g of GROWS) l += Math.log(3) * spring(t - g - lag, z, w)
  return Math.exp(l)
}
/** How far the doors have swung open, 0..1 (a little past 1 on the swing). */
export const doorsAt = (t: number): number => spring(t - DOORS, 0.42, 13)

/* ------------------------------------------------------------------ the unveiling */

/** How far the sheet has been hauled up (cells), and the counterweight let down, at `t`. */
export function liftAt(t: number): number {
  const u = t - BUMP - 0.03
  if (u <= 0) return 0
  const fall = WEIGHT.y1 - WEIGHT.y0
  const h = 0.5 * G * u * u
  if (h < fall) return h
  // The sheet up at the limb: a little jolt on the cord, and still.
  const v = Math.sqrt(2 * G * fall)
  const since = u - v / G
  return fall - 0.05 * Math.exp(-since / 0.09) * Math.sin(since * 40)
}
/** When the weight lands on its bracket. */
export const LIFTED = BUMP + 0.03 + Math.sqrt((2 * (WEIGHT.y1 - WEIGHT.y0)) / G)

/* ------------------------------------------------------------------ the pump */

/** How far the pedal is pressed, 0 (up) to 1 (down), at `t`: each stomp presses it with Derek on it, and it springs back. */
/** Every press of the pedal: when he lands on it, when he leaves it, and how far it goes down. */
const PRESSES: [number, number, number][] = [[TAP, TAP_OFF, 0.3], ...STOMPS.map((s, i): [number, number, number] => [s, RELEASES[i], 1])]
export function pedalAt(t: number): number {
  let c = 0
  for (const [s, off, depth] of PRESSES) {
    const u = t - s
    const on = off - s
    if (u < 0 || u > 1.4) continue
    if (u < on) c += depth * Math.sin((u / on) * Math.PI)
    else c -= depth * 0.14 * Math.exp(-(u - on) / 0.14) * Math.sin(((u - on) / 0.28) * Math.PI * 2)
  }
  return Math.max(-0.16, Math.min(1, c))
}
/** The model's little hop off the ground from the test puff (cells), and its shiver (a share of its size). */
export function hiccupAt(t: number): number {
  const u = t - TAP - AIR
  if (u < 0 || u > 0.5) return 0
  if (u < 0.2) return 0.045 * Math.sin((u / 0.2) * Math.PI)
  return 0.012 * Math.max(0, Math.sin(((u - 0.2) / 0.1) * Math.PI)) * (u < 0.3 ? 1 : 0)
}
export function shiverAt(t: number): number {
  const u = t - TAP - AIR
  if (u < 0 || u > 1.2) return 0
  return 0.09 * Math.exp(-u / 0.2) * Math.sin(u * 34)
}
/** The pedal's angle (radians, up from the base) when pressed `c`. */
export function pedalAngle(c: number): number {
  const rise = (d: number) => Math.asin((PUMP.up - (GROUND - PUMP.base) - d) / PUMP.len)
  const up = rise(0)
  const down = Math.asin((PUMP.down - (GROUND - PUMP.base)) / PUMP.len)
  return up + (down - up) * c
}
/** A point on the pedal's top, `s` cells from its hinge, `lift` over it along its normal. */
export function onPedal(c: number, s: number, lift = 0): Pt {
  const a = pedalAngle(c)
  const hx = PUMP.hingeX
  const hy = PUMP.base
  const nx = -Math.sin(a)
  const ny = -Math.cos(a)
  return [hx + s * Math.cos(a) + nx * (PUMP.board + lift), hy - s * Math.sin(a) + ny * (PUMP.board + lift)]
}
/** Where Derek sits on the pedal. */
export const ON_PEDAL = 0.34
export const derekOnPedal = (t: number): Pt => onPedal(Math.max(0, pedalAt(t)), ON_PEDAL, R)
/** Where he stands on the pedal's end for the test. */
export const derekOnEnd = (t: number): Pt => onPedal(Math.max(0, pedalAt(t)), 0.8, R)

/* ------------------------------------------------------------------ Derek's way */

/** A lane built forward in show time: rests, runs with real speeds at their ends, hops and carried stretches. */
class Way {
  segs: Seg[] = []
  constructor(
    public p: Pt,
    public t: number,
  ) {}
  rest(until: number): this {
    if (until > this.t + 1e-9) this.segs.push({ from: this.p, to: this.p, dur: until - this.t })
    this.t = Math.max(this.t, until)
    return this
  }
  /** A run to `to`, from `v0` to `v1` cells a second, changing evenly. */
  run(to: Pt, v0: number, v1: number): this {
    const L = Math.hypot(to[0] - this.p[0], to[1] - this.p[1])
    const dur = L / ((v0 + v1) / 2)
    this.segs.push({ from: this.p, to, dur, ramp: [v0, v1] })
    this.p = to
    this.t += dur
    return this
  }
  /** A hop under gravity, landing on `to` at `land`. */
  hop(to: Pt, land: number): this {
    const T = land - this.t
    this.segs.push({ from: this.p, to, dur: T, arc: (G * T * T) / 8 })
    this.p = to
    this.t = land
    return this
  }
  /** Riding something that moves, `fn` of show time, to `until`. */
  ride(fn: (t: number) => Pt, until: number, n: number): this {
    const t0 = this.t
    const dt = (until - t0) / n
    for (let i = 0; i < n; i++) this.segs.push({ from: fn(t0 + i * dt), to: fn(t0 + (i + 1) * dt), dur: dt })
    this.p = fn(until)
    this.t = until
    return this
  }
}

/** How long runs through these stretches take: [length, v0, v1]. */
const timeOf = (legs: [number, number, number][]): number => legs.reduce((s, [L, a, b]) => s + L / ((a + b) / 2), 0)

/** A run from rest to rest over `L` cells: up to `v` over `a`, on at `v`, down to rest over `b`. */
function glide(w: Way, x: number, v: number, a: number, b: number, y = w.p[1]): Way {
  const dir = Math.sign(x - w.p[0])
  const L = Math.abs(x - w.p[0])
  const cruise = Math.max(0, L - a - b)
  const x1 = w.p[0] + dir * a
  const x2 = x1 + dir * cruise
  w.run([x1, y], 0, v)
  if (cruise > 1e-6) w.run([x2, y], v, v)
  return w.run([x, y], v, 0)
}
/** How long `glide` takes. */
const glideTime = (L: number, v: number, a: number, b: number): number => timeOf([[a, 0, v], [Math.max(0, L - a - b), v, v], [b, v, 0]])

/** Derek at the landing: at the door's left side while the kids go in, then beside Hansel in the doorway. */
export const DEREK_FLANK = 2.6
export const DEREK_END: Pt = [DOOR_X - 0.23, LANDING]
export const HANSEL_FLANK = 4.5
export const HANSEL_END: Pt = [DOOR_X + 0.23, LANDING]
/** When the two of them close in to the doorway for the picture. */
export const CLOSE = 227.3

/** Derek's way through the Center, from the cut to the end of the show. */
export function derekWay(): Seg[] {
  const w = new Way([-0.5, 0], CUT)
  // To the bell-pull, touching it on the downbeat, and a hair on as it swings away.
  const pull = PULL_X + 0.035 + R
  const d = Math.abs(-0.5 - pull)
  const toPull = timeOf([[d * 0.45, 0, 0.55], [d * 0.55, 0.55, 0.25]])
  w.rest(BUMP - toPull).run([-0.5 - d * 0.45, 0], 0, 0.55).run([pull, 0], 0.55, 0.25).run([pull - 0.04, 0], 0.25, 0)
  // Up to the model, stopping beside it (right of its little tree) on bar 100.
  const beside = -2.45
  w.rest(BESIDE - glideTime(Math.abs(beside - w.p[0]), 1.2, 0.36, 0.32))
  glide(w, beside, 1.2, 0.36, 0.32)
  // A start back from it; then over it, and a roll on after the landing.
  w.rest(RECOIL).run([-2.27, 0], 1.5, 0)
  w.rest(OVER).hop([-3.45, 0], LANDED)
  const vx = (3.45 - 2.27) / (LANDED - OVER)
  w.run([-3.71, 0], vx, 0)
  // Along the hose to the pump; a look at it.
  w.rest(bar(102) + 0.1)
  glide(w, -4.25, 0.75, 0.25, 0.29)
  // The test: up on the pedal's end, down with it a little, and back down onto the path behind.
  w.rest(TAP_UP).hop(derekOnEnd(TAP), TAP)
  w.ride(derekOnEnd, TAP_OFF, 16)
  w.hop([-3.9, 0], TAP_BACK)
  w.run([-3.72, 0], (-3.9 - derekOnEnd(TAP_OFF)[0]) / (TAP_BACK - TAP_OFF), 0)
  // The drum break: little bounces, bigger ones, creeping in; then the leap onto the pedal on the first call.
  w.rest(BOUNCES[0])
  const creep = [-3.745, -3.77, -3.8, -3.84, -3.89, -3.95, -4.03]
  BOUNCES.slice(1).forEach((t, i) => w.hop([creep[i], 0], t))
  w.hop(derekOnPedal(STOMPS[0]), STOMPS[0])
  // Four stomps: down with the pedal and up with it, and off it into the air; the last sends him off onto the path.
  STOMPS.forEach((_, i) => {
    w.ride(derekOnPedal, RELEASES[i], 24)
    if (i < STOMPS.length - 1) w.hop(derekOnPedal(STOMPS[i + 1]), STOMPS[i + 1])
  })
  const off: Pt = [-3.6, 0]
  w.hop(off, OFF)
  // Along the front of the Center to the foot of the stair, at the door's left side.
  const vLand = (off[0] - derekOnPedal(RELEASES[3])[0]) / (OFF - RELEASES[3])
  const arrive = beat(434) - 0.24
  const avail = arrive - OFF
  const L = DEREK_FLANK - off[0]
  let lo = 0.5
  let hi = 8
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2
    const tt = timeOf([[0.45, vLand, v], [L - 0.9, v, v], [0.45, v, 0]])
    if (tt > avail) lo = v
    else hi = v
  }
  const v = (lo + hi) / 2
  w.run([off[0] + 0.45, 0], vLand, v).run([DEREK_FLANK - 0.45, 0], v, v).run([DEREK_FLANK, 0], v, 0)
  // Up the three steps, and at the door's left side while the kids go in.
  w.rest(beat(434))
  DEREK_STEPS.forEach((t, i) => w.hop([DEREK_FLANK, stepY(i + 1)], t))
  // In to the doorway, beside Hansel, for the picture; and there to the end.
  w.rest(CLOSE)
  glide(w, DEREK_END[0], 1.0, 0.36, 0.36)
  w.rest(DURATION)
  return w.segs
}

/* ------------------------------------------------------------------ where they look */

/**
 * A ball's mark read as where it is looking. It rolls with the ball as ever; while the ball is at rest a key turns it
 * to face a way (an angle on the screen, y down: 0 right, π/2 down, π left), and it rolls on from there.
 */
export type Look = [t0: number, t1: number, angle: number]
export function gazer(segs: Seg[], keys: Look[], r = R): (t: number) => number {
  const lane = { segs, fire: 0 }
  const xAt = (t: number) => laneAt(lane, t - CUT).x
  const turns: [number, number, number, number][] = []
  let off = 0
  for (const [t0, t1, a] of keys) {
    let o = a - xAt(t1) / r
    while (o - off > Math.PI) o -= 2 * Math.PI
    while (o - off < -Math.PI) o += 2 * Math.PI
    turns.push([t0, t1, off, o])
    off = o
  }
  return (t: number) => {
    let o = 0
    for (const [t0, t1, a, b] of turns) {
      if (t >= t1) o = b
      else {
        if (t > t0) {
          const u = (t - t0) / (t1 - t0)
          o = a + (b - a) * u * u * (3 - 2 * u)
        }
        break
      }
    }
    return xAt(t) / r + o
  }
}

/* ------------------------------------------------------------------ Hansel */

/** Hansel's way (show time → his centre), from the cut to the end. */
export const hanselWay: Seg[] = (() => {
  const w = new Way([-0.08, 0], CUT)
  // Up to the model's other side while Derek is over it: the two of them either side of it.
  w.rest(beat(405) + 0.26 - glideTime(2.17, 1.8, 0.6, 0.6))
  glide(w, -2.25, 1.8, 0.6, 0.6)
  // Back out of the way when Derek goes to the pump.
  w.rest(bar(102) + 0.3)
  glide(w, -0.35, 1.5, 0.5, 0.5)
  // Off on the doors, ahead of Derek, to the door's right side and up the steps.
  w.rest(STOMPS[3])
  glide(w, HANSEL_FLANK, 3.4, 0.9, 0.9)
  w.rest(beat(431))
  HANSEL_STEPS.forEach((t, i) => w.hop([HANSEL_FLANK, stepY(i + 1)], t))
  w.rest(CLOSE + 0.05)
  glide(w, HANSEL_END[0], 1.0, 0.36, 0.36)
  w.rest(DURATION)
  return w.segs
})()

/* ------------------------------------------------------------------ the kids */

export const KID_R = R * KID_SCALE
/** When the kids come on (just out of the wide's right edge), how fast, and where each goes up the stair. */
export const KIDS_FROM = STOMPS[2]
const KID_V = 4.2
export const KID_LANES = [3.0, 3.2, 3.4, 3.6, 3.8, 4.0, 4.2]
const KID_X0 = (i: number) => 17.9 + 0.85 * i
const KID_STEP = 0.19
const KID_FADE = 0.36
const KID_Y = GROUND - KID_R
/** Kid i: where, how big, how far into the dark of the doorway (0..1), or null before or after. */
export function kidAt(i: number, t: number): { x: number; y: number; scale: number; dark: number; spin: number } | null {
  const u = t - KIDS_FROM
  if (u < 0) return null
  const lane = KID_LANES[i]
  const x0 = KID_X0(i)
  // Rolling in at a run, a little bounce to the step, easing in to the stair's foot over the last 0.3 cells.
  const brake = 0.3
  const tRun = (x0 - lane - brake) / KID_V
  const tBrake = (2 * brake) / KID_V
  const tFoot = tRun + tBrake
  const spin = (x: number) => x / KID_R
  if (u < tRun + tBrake) {
    let x: number
    if (u < tRun) x = x0 - KID_V * u
    else {
      const s = u - tRun
      x = x0 - KID_V * tRun - (KID_V * s - (KID_V * s * s) / (2 * tBrake))
    }
    const phase = (i * 0.37) % 1
    const bounce = 0.045 * Math.abs(Math.sin(Math.PI * (u / 0.26 + phase))) * Math.min(1, (tRun - u + 0.4) / 0.4)
    return { x, y: KID_Y - Math.max(0, bounce), scale: KID_SCALE, dark: 0, spin: spin(x) }
  }
  // Up the three steps, one hop each.
  const s = u - tFoot
  const steps = 3
  if (s < steps * KID_STEP) {
    const k = Math.floor(s / KID_STEP)
    const f = (s - k * KID_STEP) / KID_STEP
    const y0 = k === 0 ? KID_Y : GROUND - (D.plinth * k) / steps - KID_R
    const y1 = GROUND - (D.plinth * (k + 1)) / steps - KID_R
    const arc = (G * KID_STEP * KID_STEP) / 8
    return { x: lane, y: y0 + (y1 - y0) * f - arc * 4 * f * (1 - f), scale: KID_SCALE, dark: 0, spin: spin(lane) }
  }
  // Into the dark of the doorway.
  const d = (s - steps * KID_STEP) / KID_FADE
  if (d >= 1) return null
  const e = d * d * (3 - 2 * d)
  return { x: lane - 0.02 * e, y: GROUND - D.plinth - KID_R - 0.03 * e, scale: KID_SCALE * (1 - 0.3 * e), dark: e, spin: spin(lane) }
}
export const KID_COUNT = KID_LANES.length

/* ------------------------------------------------------------------ the tail: the press go, the day goes */

/** The last call's two onsets: the press fire twice more, smaller, as the big flash fades. */
export const TAIL_FLASHES = [onset(229.66, 1), onset(230.21, 1)]
/** Which of the press fires each of them. */
export const TAIL_BY = [2, 1]

/**
 * How far the day has gone to dusk, 0..1: from the last photograph through the tail the sky deepens to a dusk blue
 * over a warm horizon, quickest at first, so the credits (from 231) come up over a dark sky.
 */
export function duskAt(t: number): number {
  const v = Math.max(0, Math.min(1, (t - (PHOTO + 0.25)) / 4.0))
  return 1 - (1 - v) * (1 - v)
}

/** When each of the six tall windows lights, one by one as the dusk comes (wing windows, left to right). */
export const WINDOW_LIGHTS = [230.95, 232.35, 231.45, 230.55, 231.85, 232.8]
export const litAt = (i: number, t: number): number => {
  const u = (t - WINDOW_LIGHTS[i]) / 0.3
  return u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u)
}
/** The kids at the lit windows: which kid, at which window, a little off its middle. */
export const WINDOW_KIDS: { kid: number; window: number; dx: number }[] = [
  { kid: 1, window: 3, dx: -0.1 },
  { kid: 4, window: 0, dx: 0.12 },
  { kid: 0, window: 2, dx: -0.14 },
  { kid: 3, window: 2, dx: 0.12 },
  { kid: 6, window: 4, dx: 0.02 },
]

/* ------------------------------------------------------------------ the press */

/** The press go after the tail's flashes: they lower their cameras and hurry off right, out of the widening shot. */
export const PRESS_GO = TAIL_FLASHES[1] + 0.2
export function pressWalk(i: number, t: number): number {
  const u = t - PRESS_GO - [0.18, 0.08, 0][i]
  if (u <= 0) return 0
  const a = 0.45
  const v = 6.4 + 0.3 * i
  return u < a ? (0.5 * v * u * u) / a : v * (u - a / 2)
}
/** The pump is taken away while the camera is on the door (it has done its job). */
export const PUMP_GONE = 227.0

/** How far the press have their cameras up (0..1): raised for the picture. */
export const cameraUp = (t: number): number => {
  const a = Math.max(0, Math.min(1, (t - 227.75) / 0.7))
  const b = Math.max(0, Math.min(1, (t - PRESS_GO + 0.05) / 0.3))
  return a * a * (3 - 2 * a) * (1 - b * b * (3 - 2 * b))
}
