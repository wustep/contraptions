import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutQuad, lerp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, mixHex, rail, ramp, trace, type Lane, type Pt } from '../../../parts'
import { nearestHue, soil } from '../../../pieces/garden/green'

/**
 * A dung beetle and its heap. The heap lies across the path, too steep for
 * the ball, and the beetle stands on top of it, horn up, watching the ball
 * come. It knows what a ball is for. Its wing cases go up, it drones down
 * off the heap over the ball's head and drops onto the path behind it,
 * facing the way the ball came. The ball runs up the heap, slower and
 * slower in the loose earth, and stops short of the top; the beetle goes up
 * on its forelegs with its hind legs in the air, and the ball rolls back
 * down into them.
 *
 * Then it does what a dung beetle does. Head down, walking backwards on
 * its hands, it rolls the ball up the slope with its hind feet, a shove a
 * step, and heaves it over the top. The ball runs away down the far side
 * and the beetle is left on its head with its feet in the air. It comes
 * down, and backs up onto the top of its heap again, where it began.
 *
 * The ball rests where a ball that size rests on the heap, and climbs it
 * and falls back under one gravity. The beetle is one body: where it is,
 * how it is pitched, how far it is up on its head. Its feet are planted on
 * the ground, or on the ball, or trail under it in the air, and the legs
 * are solved to them. It never leaves the two cells of path it has, the
 * flight included.
 */

/* ------------------------------------------------------------------ the heap */

/** The heap's two feet on the path, its crest, and how high it stands over the path. */
const A = 0.12
const C = 0.85
const B = 1.36
const H = 0.3

/** The heap's height over the path at `x`, and its slope there. */
function heap(x: number): number {
  if (x <= A || x >= B) return 0
  const u = x < C ? (x - A) / (C - A) : (B - x) / (B - C)
  return (H * (1 - Math.cos(Math.PI * u))) / 2
}
function heapSlope(x: number): number {
  if (x <= A || x >= B) return 0
  return x < C ? ((H * Math.PI) / (2 * (C - A))) * Math.sin((Math.PI * (x - A)) / (C - A)) : ((-H * Math.PI) / (2 * (B - C))) * Math.sin((Math.PI * (B - x)) / (B - C))
}
/** The ground at `x`: the point, the way the slope runs there (radians, y down), and the way up off it. */
function ground(x: number): { at: Pt; tilt: number; up: Pt } {
  const tilt = Math.atan(-heapSlope(x))
  return { at: [x, FLOOR - heap(x)], tilt, up: [Math.sin(tilt), -Math.cos(tilt)] }
}

/* ------------------------------------------------------------------ the ball */

/** How high over the rail line a ball rides at each `x`, resting on the heap. */
const STEP = 0.004
const RIDE: number[] = []
for (let x = -0.5; x <= 1.5 + STEP / 2; x += STEP) {
  let best = 0
  for (let i = -16; i <= 16; i++) {
    const d = (i / 16) * R * 0.999
    best = Math.max(best, heap(x + d) + Math.sqrt(R * R - d * d) - R)
  }
  RIDE.push(best)
}
const ride = (x: number): number => {
  const f = clamp((x + 0.5) / STEP, 0, RIDE.length - 1.001)
  const i = Math.floor(f)
  return RIDE[i] + (RIDE[i + 1] - RIDE[i]) * (f - i)
}

/** Gravity, cells a second squared; and how the loose earth drags at the ball going up it, and coming back down. */
const G = 13
const DRAG_UP = 1.5
const DRAG_DOWN = 3.2
/** Where the ball fetches up against the beetle's feet, how far the two of them skid, and for how long; and the beat after. */
const CATCH = 0.17
const SKID = 0.035
const SKID_T = 0.1
const BEAT = 0.08
/** The push: how long, in how many shoves, and how uneven they are. */
const PUSH_T = 0.9
const SHOVES = 4.5
const SURGE = 0.45
/** Where the beetle lets it go: a hair over the crest. */
const TOP = C + 0.015
/** Where the heap has let the ball down onto the path again. */
const OFF = B + 0.05

/** A ball let go at `x` with speed `v` along the path, until `done`: where it is every `DT` seconds, and how fast at the end. */
const DT = 1 / 240
function run(x: number, v: number, drag: number, done: (x: number, v: number) => boolean): { xs: number[]; v: number } {
  const xs = [x]
  for (let i = 0; i < 2400 && !done(x, v); i++) {
    const rise = (ride(x + 0.002) - ride(x - 0.002)) / 0.004
    const along = Math.sqrt(1 + rise * rise)
    v += (-(G * rise) / along - (ride(x) > 0.003 ? drag * Math.sign(v) : 0)) * DT
    x += (v / along) * DT
    xs.push(x)
  }
  return { xs, v }
}
const sample = (xs: number[], t: number): number => {
  const f = clamp(t / DT, 0, xs.length - 1.001)
  const i = Math.floor(f)
  return xs[i] + (xs[i + 1] - xs[i]) * (f - i)
}

/** Up the heap until it stops; back down into the beetle's feet; and, let go at the top, down the far side. */
const UP = run(-0.5, ROLL, DRAG_UP, (_x, v) => v <= 0)
const DOWN = run(UP.xs[UP.xs.length - 1], -0.001, DRAG_DOWN, (x) => x <= CATCH)
const PUSH_FROM = CATCH - SKID
const LET_GO = ((TOP - PUSH_FROM) / PUSH_T) * (1 + SURGE)
const AWAY = run(TOP, LET_GO, 0, (x) => x >= OFF)

const T_STALL = (UP.xs.length - 1) * DT
const T_CATCH = T_STALL + (DOWN.xs.length - 1) * DT
const T_PUSH = T_CATCH + SKID_T + BEAT
const T_TOP = T_PUSH + PUSH_T
const T_OFF = T_TOP + (AWAY.xs.length - 1) * DT

/** How far through the push it is at `u` of its time: a shove a step, slow out of the beat and quickest into the heave. */
const shoved = (u: number): number => u - (SURGE / (2 * Math.PI * SHOVES)) * Math.sin(2 * Math.PI * SHOVES * u)

/** Where along the path the ball's middle is at piece time `t`, until the heap lets it down. */
function ballX(t: number): number {
  if (t < T_STALL) return sample(UP.xs, t)
  if (t < T_CATCH) return sample(DOWN.xs, t - T_STALL)
  if (t < T_PUSH) return CATCH - SKID * easeOutQuad(clamp((t - T_CATCH) / SKID_T))
  if (t < T_TOP) return PUSH_FROM + (TOP - PUSH_FROM) * shoved((t - T_PUSH) / PUSH_T)
  return sample(AWAY.xs, t - T_TOP)
}
const ballAt = (t: number): Pt => {
  const x = ballX(t)
  return [x, -ride(x)]
}

const LANE: Lane = {
  segs: [...trace(ballAt, 0, T_OFF, Math.round(T_OFF * 80)), ramp([ballX(T_OFF), 0], [1.5, 0], AWAY.v, ROLL)],
  fire: T_CATCH,
}

/* ------------------------------------------------------------------ the beetle's part */

/** Its size: everything of the beetle's own below is in its own frame, tail to the east and belly down, and is this many times as big in the cell. */
const S = 1.1
/** How high it carries its middle over the ground, standing and up on its head; and how far it tips up. */
const STAND = 0.14 * S
const HAND = 0.26 * S
const TIP = 0.62
/** Its hind hip; and how far from the ball's middle that is when it has the ball. */
const HIND: Pt = [0.07, 0.075]
const GRIP = 0.27 * S
/** Where it stands on its heap. */
const PERCH = C
/** Its wing cases go up as the ball comes; it is off the heap, and down on the path. */
const T_OPEN = -0.58
const T_FLY = -0.4
const T_LAND = 0.55
/** How high it flies, as a height of its middle in the cell; and how it is pitched in the air, nose up. */
const CRUISE = -0.285
const PITCH = 0.24
/** It goes up on its head as the ball stalls, in this long; holds it this long after the ball has gone; and comes down. */
const REAR_AT = T_STALL - 0.1
const REAR_T = 0.34
const HOLD = 0.2
const DROP_T = 0.34
/** The heave over the top takes the last this much of the push. */
const HEAVE_T = 0.3
/** Then back up onto the heap: after a thought, in this long. */
const BACK_AT = T_TOP + HOLD + DROP_T + 0.3
const BACK_T = 0.8

interface Pose {
  /** Its middle, and how it is turned: nose up positive. */
  at: Pt
  turn: number
  /** Where along the ground its feet stand, and how far it has walked: they step by that. */
  q: number
  walked: number
  /** 0 on all sixes to 1 up on its head; 0 on the ground to 1 in the air; 0 to 1, its wing cases up. */
  rear: number
  air: number
  open: number
}

/**
 * Standing at `q`, `rear` of the way up on its head, its legs giving by `dip`; and `heave` of the way through the
 * last shove, its hind legs straightening and its back coming down. On a slope it stands half as steep again.
 */
function standing(q: number, rear: number, dip: number, heave = 0): { at: Pt; turn: number } {
  const g = ground(q)
  const high = lerp(STAND, HAND * (1 - 0.14 * heave), rear) - dip
  return { at: [g.at[0] + g.up[0] * high, g.at[1] + g.up[1] * high], turn: g.tilt * (1 - 0.5 * rear) - TIP * rear * (1 - 0.3 * heave) }
}

/** A point of the beetle's own frame out in the cell. */
function out(pose: { at: Pt; turn: number }, x: number, y: number): Pt {
  const c = Math.cos(pose.turn)
  const s = Math.sin(pose.turn)
  return [pose.at[0] + (x * c - y * s) * S, pose.at[1] + (x * s + y * c) * S]
}

/** Where along the ground it stands, up on its head, to have a ball at `ball` at its hind hips' length. */
function behind(ball: Pt, heave = 0): number {
  let lo = ball[0] - 0.8
  let hi = ball[0] - 0.05
  for (let i = 0; i < 22; i++) {
    const q = (lo + hi) / 2
    const hip = out(standing(q, 1, 0, heave), HIND[0], HIND[1])
    if (Math.hypot(ball[0] - hip[0], ball[1] - hip[1]) > GRIP) lo = q
    else hi = q
  }
  return (lo + hi) / 2
}
/** Where it comes down on the path, to be there for the ball; and where it is left when the ball goes. */
const HOME = behind(ballAt(T_CATCH))
const LEFT = behind(ballAt(T_TOP), 1)

function poseAt(t: number): Pose {
  if (t < T_FLY) {
    const open = easeOutQuad(clamp((t - T_OPEN) / (T_FLY - T_OPEN)))
    return { ...standing(PERCH, 0, 0.03 * open), q: PERCH, walked: PERCH, rear: 0, air: 0, open }
  }
  if (t < T_LAND) {
    // Off the heap, level over the ball's head, and down onto the path with its nose well up.
    const u = (t - T_FLY) / (T_LAND - T_FLY)
    const from = standing(PERCH, 0, 0)
    const to = standing(HOME, 0, 0)
    const x = lerp(from.at[0], to.at[0], 1 - Math.pow(1 - u, 2.2))
    const y = u < 0.25 ? lerp(from.at[1], CRUISE, easeOutQuad(u / 0.25)) : lerp(CRUISE, to.at[1], easeInQuad(clamp((u - 0.78) / 0.22)))
    const turn = PITCH * (easeOutQuad(clamp(u / 0.2)) + 0.5 * easeInOutSine(clamp((u - 0.55) / 0.3))) * (1 - easeInQuad(clamp((u - 0.85) / 0.15)))
    return { at: [x, y], turn, q: u < 0.5 ? PERCH : HOME, walked: HOME, rear: 0, air: Math.min(1, u / 0.12, (1 - u) / 0.1), open: 1 }
  }
  const s = t - T_LAND
  const landed = 0.07 * Math.exp(-s * 9) * Math.sin(s * 20)
  const gone = t - (T_TOP + HOLD)
  const jolt = t < T_CATCH ? 0 : Math.exp(-(t - T_CATCH) * 11) * Math.sin((t - T_CATCH) * 24)
  const rear =
    gone < 0
      ? easeInOutSine(clamp((t - REAR_AT) / REAR_T)) - 0.08 * jolt
      : 1 - easeInOutSine(clamp(gone / DROP_T)) - 0.06 * Math.exp(-Math.max(0, gone - DROP_T) * 8) * Math.sin(Math.max(0, gone - DROP_T) * 24)
  // The last shove is a heave: from the hind legs, the back coming down as they straighten.
  const heave = easeInOutSine(clamp((t - (T_TOP - HEAVE_T)) / HEAVE_T))
  const q = t < T_CATCH ? HOME : t < T_TOP ? behind(ballAt(t), heave) : lerp(LEFT, PERCH, easeInOutSine(clamp((t - BACK_AT) / BACK_T)))
  // The skid is a slide, not a step.
  return { ...standing(q, rear, landed, heave), q, walked: t < T_PUSH ? HOME : q, rear, air: 0, open: 1 - easeInOutSine(clamp(s / 0.2)) }
}

/**
 * The three legs of a side: the hip on the body, thigh and shin, where along the ground from its middle the foot
 * stands, on all sixes and up on its head, and the way the knee sticks out.
 */
const LEGS = [
  { hip: [-0.135, 0.065] as Pt, thigh: 0.085, shin: 0.1, stand: -0.2, hand: -0.25, knee: [-1, -0.3] as Pt },
  { hip: [-0.04, 0.08] as Pt, thigh: 0.085, shin: 0.1, stand: -0.03, hand: -0.09, knee: [0.2, -1] as Pt },
  { hip: HIND, thigh: 0.125, shin: 0.17, stand: 0.16, hand: 0.16, knee: [1, -0.35] as Pt },
]
/** A step: how far the body goes in one, the share of it a foot spends on the ground, and how high it is lifted. */
const STRIDE = 0.19
const PLANTED = 0.65
const LIFT = 0.04
/** Where on the ball the two hind feet hold it: radians back from its top. */
const HOLDS = [0.45, 1.1]

/** A foot `at` from the body's middle along the ground, stepping as the body goes: where it is, lifted off the ground or on it. */
function step(pose: Pose, at: number, phase: number): Pt {
  const c = (((pose.walked / STRIDE + phase) % 1) + 1) % 1
  const swing = c < PLANTED ? 0 : (c - PLANTED) / (1 - PLANTED)
  const rel = PLANTED * STRIDE * (c < PLANTED ? 0.5 - c / PLANTED : swing - 0.5)
  const g = ground(pose.q + at * S + rel)
  const lift = LIFT * Math.sin(Math.PI * swing)
  return [g.at[0] + g.up[0] * lift, g.at[1] + g.up[1] * lift]
}

/** The knee between a hip and a foot, bent the way that sticks out furthest along `way`, unless that is into the ground. */
function knee(hip: Pt, foot: Pt, thigh: number, shin: number, way: Pt): Pt {
  const dx = foot[0] - hip[0]
  const dy = foot[1] - hip[1]
  const d = clamp(Math.hypot(dx, dy), Math.abs(thigh - shin) + 0.002, thigh + shin - 0.002)
  const base = Math.atan2(dy, dx)
  const bend = Math.acos(clamp((thigh * thigh + d * d - shin * shin) / (2 * thigh * d), -1, 1))
  const a: Pt = [Math.cos(base + bend) * thigh, Math.sin(base + bend) * thigh]
  const b: Pt = [Math.cos(base - bend) * thigh, Math.sin(base - bend) * thigh]
  const [pick, other] = a[0] * way[0] + a[1] * way[1] > b[0] * way[0] + b[1] * way[1] ? [a, b] : [b, a]
  const sunk = hip[1] + pick[1] > ground(hip[0] + pick[0]).at[1] - 0.01
  return sunk ? [hip[0] + other[0], hip[1] + other[1]] : [hip[0] + pick[0], hip[1] + pick[1]]
}

/** One side's legs: `far` for the side away from us, a little along from the near one and out of step with it. */
function legs(p: p5, k: number, t: number, pose: Pose, far: boolean): void {
  LEGS.forEach((leg, i) => {
    const hip = out(pose, leg.hip[0] + (far ? 0.025 : 0), leg.hip[1] - (far ? 0.015 : 0))
    let foot = step(pose, lerp(leg.stand, leg.hand, pose.rear) + (far ? 0.04 : 0), (i % 2 ? 0.5 : 0) + (far ? 0.5 : 0))
    if (i === 2 && pose.rear > 0) {
      // A hind foot, up off the ground and onto the ball: where the ball will be, where it is, and where it was let go.
      const ball = ballAt(clamp(t, T_CATCH, T_TOP + 0.04))
      const paddle = t > T_PUSH && t < T_TOP ? 0.13 * Math.sin((pose.walked / STRIDE + (far ? 0.5 : 0)) * 2 * Math.PI) : 0
      const a = -Math.PI / 2 - HOLDS[far ? 1 : 0] + ground(ball[0]).tilt + paddle
      const held: Pt = [ball[0] + Math.cos(a) * (R + 0.014), ball[1] + Math.sin(a) * (R + 0.014)]
      const e = easeInOutSine(clamp(pose.rear))
      const arc = 0.07 * Math.sin(Math.PI * clamp(pose.rear))
      foot = [lerp(foot[0], held[0], e) - arc * 0.4, lerp(foot[1], held[1], e) - arc]
    }
    if (pose.air > 0) {
      // In the air they hang under it, trailing.
      const hung: Pt = [hip[0] + (i === 2 ? 0.25 : 0.15) * S, hip[1] + (i === 2 ? -0.01 : 0.025) * S]
      foot = [lerp(foot[0], hung[0], pose.air), lerp(foot[1], hung[1], pose.air)]
    }
    const joint = knee(hip, foot, leg.thigh * S, leg.shin * S, leg.knee)
    p.line(hip[0] * k, hip[1] * k, joint[0] * k, joint[1] * k)
    p.line(joint[0] * k, joint[1] * k, foot[0] * k, foot[1] * k)
  })
}

/** The wing cases' hinge on the body, and how far they lift. */
const HINGE: Pt = [-0.04, -0.04]
const LIFTED = 0.85

export const beetle = definePiece<{ color: string; shell: string }>({
  name: 'beetle',
  weight: 0.9,
  place: ({ fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // Earth is earth and a beetle is a dark gloss, whatever the map hands the piece: the palette's violet or blue, down toward the ink, and further for a ball of that colour.
    const gloss = nearestHue(theme, 262)
    return {
      cells,
      exit: { at: [2, 0], dir: 1 },
      lane: LANE,
      state: { color: nearestHue(theme, 18, ball.color), shell: mixHex(gloss, theme.ink, ball.color === gloss ? 0.5 : 0.3) },
    }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    soil(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, 1.5)

    // The heap, lying on the path.
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= 48; i++) {
      const x = A + ((B - A) * i) / 48
      p.vertex(x * k, (FLOOR - heap(x)) * k)
    }
    p.endShape(p.CLOSE)

    // The beetle: the far legs, the body, the near legs.
    const pose = poseAt(t)
    outline(p, ink, weight * 0.85)
    legs(p, k, t, pose, true)

    p.push()
    p.translate(pose.at[0] * k, pose.at[1] * k)
    p.rotate(pose.turn)
    p.scale(S)
    // The head, a shovel, and the horn on it.
    solid(p, ink, weight / S, s.shell)
    p.beginShape()
    p.vertex(-0.185 * k, -0.005 * k)
    p.bezierVertex(-0.23 * k, -0.005 * k, -0.28 * k, 0.03 * k, -0.29 * k, 0.07 * k)
    p.bezierVertex(-0.25 * k, 0.085 * k, -0.21 * k, 0.08 * k, -0.185 * k, 0.065 * k)
    p.endShape(p.CLOSE)
    outline(p, ink, (weight * 1.25) / S)
    p.noFill()
    p.bezier(-0.24 * k, 0.012 * k, -0.27 * k, -0.04 * k, -0.25 * k, -0.085 * k, -0.2 * k, -0.1 * k)
    // The hind wings, a blur over its back, while it is in the air.
    if (pose.air > 0) {
      const beat = Math.sin(t * 2 * Math.PI * 13)
      solid(p, ink, (weight * 0.6) / S, bg)
      for (const a of [-0.42 + 0.2 * beat, -0.08 - 0.2 * beat]) {
        p.push()
        p.translate(HINGE[0] * k, HINGE[1] * k)
        p.rotate(a)
        p.ellipse(0.16 * k * pose.air, 0, 0.32 * k * pose.air, 0.09 * k)
        p.pop()
      }
    }
    // The body under the wing cases, the thorax, and the wing cases, down or up.
    solid(p, ink, weight / S, s.shell)
    if (pose.open > 0.02) {
      p.beginShape()
      p.vertex(-0.05 * k, 0.075 * k)
      p.bezierVertex(-0.04 * k, -0.02 * k, 0.12 * k, -0.04 * k, 0.19 * k, 0.04 * k)
      p.bezierVertex(0.15 * k, 0.09 * k, 0 * k, 0.095 * k, -0.05 * k, 0.075 * k)
      p.endShape(p.CLOSE)
    }
    p.beginShape()
    p.vertex(-0.04 * k, 0.075 * k)
    p.bezierVertex(-0.02 * k, -0.03 * k, -0.07 * k, -0.09 * k, -0.125 * k, -0.08 * k)
    p.bezierVertex(-0.18 * k, -0.07 * k, -0.21 * k, -0.01 * k, -0.2 * k, 0.05 * k)
    p.bezierVertex(-0.15 * k, 0.09 * k, -0.09 * k, 0.09 * k, -0.04 * k, 0.075 * k)
    p.endShape(p.CLOSE)
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(-LIFTED * pose.open)
    p.translate(-HINGE[0] * k, -HINGE[1] * k)
    p.beginShape()
    p.vertex(-0.055 * k, 0.075 * k)
    p.bezierVertex(-0.08 * k, -0.06 * k, -0.01 * k, -0.118 * k, 0.075 * k, -0.11 * k)
    p.bezierVertex(0.17 * k, -0.1 * k, 0.24 * k, -0.01 * k, 0.205 * k, 0.06 * k)
    p.bezierVertex(0.15 * k, 0.095 * k, 0 * k, 0.095 * k, -0.055 * k, 0.075 * k)
    p.endShape(p.CLOSE)
    p.pop()
    p.pop()

    outline(p, ink, weight * 1.1)
    legs(p, k, t, pose, false)
  },
})
