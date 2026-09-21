import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic, lerp } from '../../../../../../src/core/ease'
import { R, ROLL, definePiece, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { gearColor, powder, snow, snowAt, snowWhite, wand } from './snow'

/**
 * A husky asleep in harness on the snow, nose on paws, before a small sled
 * with a tray on it. The track stops short of the sled; the ball drops off
 * its end into the tray and fetches up against the tray's front, and the
 * thump shoves the sled a hand's breadth at the dog. An eye opens. The dog
 * is up, takes up the slack of its line and is away: the sled is jerked out
 * from under the ball, which stays where it was until the tray's back comes
 * up and takes it along, and the dog hauls it a cell and a half at a gallop.
 * Then it sits back on its haunches and skids, snow flying off its paws; the
 * line goes slack; the sled runs on into the drift at the foot of the far
 * track's post and stops dead, and the ball, which nothing stopped, runs
 * down the tray, up the curl of its front and off, over onto the track,
 * and on behind the dog's back. The dog stands there, tail going.
 *
 * One motion. The sled's run and the dog's are functions of time, the ball
 * in the tray is a loose thing's answer to the sled's starts and stops, and
 * the lane is the ball in the tray as the tray is drawn.
 */
/** Where the near track stops and the far one starts. */
const NEAR = -0.25
const FAR = 1.7
/** The tray, from its back wall's inner face: how long inside, where the ball sits against the back and the front, how far under the track its floor is. */
const TRAY = 0.46
const BACK = R
const FRONT = TRAY - R
const SEAT = 0.085
const WALL = 0.075
/** The sled from the same mark: its runner's heel, where the runner's curl ends and the line is made fast, and how high the bed stands on the snow. */
const HEEL = -0.1
const BRIDLE = 0.6
/** The tray's back wall at rest, and how far the ball's thump shoves the sled. */
const S0 = -0.18
const SHOVE = 0.04
/** The line: taut, and the slack the dog sleeps on. */
const LINE = 0.2
const SLACK = 0.14
/** Cartoon gravity, the haul's pace, how hard the dog's lunge jerks the sled, how hard the drift stops it, how hard the dog sits back. */
const G = 24
const V = 3
const JERK = 8
const STOP = 30
const SKID = 10

/* The clock. Off the track's end, down into the tray, along it to its front. */
const T_DROP = (NEAR + 0.5) / ROLL
const FALL = Math.sqrt((2 * SEAT) / G)
const T_LAND = T_DROP + FALL
const X_LAND = NEAR + ROLL * FALL
/** The shove starts at this pace (an ease-out's first instant), so the ball slows to it and not to nothing. */
const SHOVE_T = 0.25
const V_SHOVE = (3 * SHOVE) / SHOVE_T
const T_SEAT = T_LAND + (S0 + FRONT - X_LAND) / ((ROLL + V_SHOVE) / 2)
/** The dog wakes, gets up, takes up the slack; the line comes taut and the sled goes. */
const T_UP = T_SEAT + 0.32
const T_GO = T_SEAT + 0.5
const SPIN_UP = V / JERK
const RUN = FAR - 0.02 - BRIDLE + 0.08 - S0 - SHOVE
const BRAKE = V / STOP
const CRUISE = (RUN - (V * SPIN_UP) / 2 - (V * BRAKE) / 2) / V
const T_STOP_START = T_GO + SPIN_UP + CRUISE
/** The dog sits back this long before the sled meets the drift: long enough for the line to fall as slack as it was. */
const T_SKID = T_STOP_START - Math.sqrt((2 * (LINE - SLACK)) / SKID)
const SKID_T = V / SKID
/** The ball is caught by the tray's back this long after the jerk, and reaches its front again this long after the drift. */
const CAUGHT = Math.sqrt((2 * (FRONT - BACK)) / JERK)
const SHED = BRAKE + (FRONT - BACK - (STOP * BRAKE * BRAKE) / 2) / V
const T_LIP = T_STOP_START + SHED
const HOP = 0.1
const HOP_LEN = 0.3
const T_OVER = T_LIP + HOP

/** The tray's back wall, in the cell. */
function sledAt(t: number): number {
  if (t < T_GO) return S0 + SHOVE * easeOutCubic(over(t, T_SEAT, T_SEAT + SHOVE_T))
  const tau = t - T_GO
  if (tau < SPIN_UP) return S0 + SHOVE + (JERK * tau * tau) / 2
  if (t < T_STOP_START) return S0 + SHOVE + (V * SPIN_UP) / 2 + V * (tau - SPIN_UP)
  const b = Math.min(BRAKE, t - T_STOP_START)
  return S0 + SHOVE + (V * SPIN_UP) / 2 + V * CRUISE + V * b - (STOP * b * b) / 2
}
/** How far the sled rides above or below where it stood, on the snow's own drifts. */
const rideAt = (t: number): number => snowAt(sledAt(t) + 0.25) - snowAt(S0 + 0.25)

/** The ball along the tray, from its back wall: a loose thing, left behind by the jerk and sent on by the stop. */
function alongAt(t: number): number {
  if (t < T_GO) return FRONT
  if (t < T_STOP_START) {
    const tau = t - T_GO
    if (tau < CAUGHT) return FRONT - (JERK * tau * tau) / 2
    const s = tau - CAUGHT
    return BACK + 0.018 * Math.exp(-s * 14) * Math.abs(Math.sin(s * 22))
  }
  const tau = t - T_STOP_START
  if (tau < BRAKE) return BACK + (STOP * tau * tau) / 2
  return Math.min(FRONT, BACK + (STOP * BRAKE * BRAKE) / 2 + V * (tau - BRAKE))
}

/** The ball: off the track, into the tray, carried, and over the tray's lip onto the far track. */
function ballAt(t: number): Pt {
  if (t < T_LAND) {
    const tau = t - T_DROP
    return [NEAR + ROLL * tau, (G * tau * tau) / 2]
  }
  if (t < T_SEAT) {
    const tau = t - T_LAND
    const span = T_SEAT - T_LAND
    return [X_LAND + ROLL * tau + ((V_SHOVE - ROLL) * tau * tau) / (2 * span), SEAT]
  }
  if (t < T_LIP) return [sledAt(t) + alongAt(t), SEAT + rideAt(t)]
  const f = clamp((t - T_LIP) / HOP)
  const from: Pt = [sledAt(T_LIP) + FRONT, SEAT + rideAt(T_LIP)]
  return [from[0] + HOP_LEN * f, lerp(from[1], 0, f) - 0.05 * 4 * f * (1 - f)]
}

const RIDE = [
  ...trace(ballAt, T_DROP, T_LAND, 5),
  ...trace(ballAt, T_LAND, T_SEAT, 6),
  ...trace(ballAt, T_SEAT, T_GO, 6),
  ...trace(ballAt, T_GO, T_GO + CAUGHT, 8),
  ...trace(ballAt, T_GO + CAUGHT, T_STOP_START, 14),
  ...trace(ballAt, T_STOP_START, T_LIP, 8),
  ...trace(ballAt, T_LIP, T_OVER, 8),
]
const LANDED = RIDE[RIDE.length - 1].to
const LANE: Lane = {
  segs: [roll([-0.5, 0], [NEAR, 0], ROLL), ...RIDE, ramp(LANDED, [2.5, 0], HOP_LEN / HOP, ROLL)],
  fire: T_GO,
}

/** When the ball has gone by the dog and out of the piece. */
const T_GONE = LANE.segs.reduce((sum, seg) => sum + seg.dur, 0)

/* ------------------------------------------------------------------ the dog */

/** The dog, from where the line is made fast to its harness, over its rump. */
const BODY = 0.34
const LEG = 0.125
const STAND = 0.235
const LIE = 0.085
const STRIDE = 0.52

/** Where the dog's rump is: asleep a slack line ahead of the sled, up and out to the line's end, hauling, sitting back, stopped. */
function dogAt(t: number): number {
  const asleep = S0 + BRIDLE + SLACK
  if (t < T_GO) return lerp(asleep, S0 + SHOVE + BRIDLE + LINE, easeInOutSine(over(t, T_UP - 0.06, T_GO)))
  if (t < T_SKID) return sledAt(t) + BRIDLE + LINE
  const tau = Math.min(SKID_T, t - T_SKID)
  return sledAt(T_SKID) + BRIDLE + LINE + V * tau - (SKID * tau * tau) / 2
}

interface Pose {
  x: number
  /** 1 lying, 0 up. */
  lie: number
  /** 1 at a gallop. */
  run: number
  /** 1 sat back on its haunches, paws out in front. */
  brace: number
  /** Where in its stride it is, in turns. */
  stride: number
  awake: boolean
  /** 1 with its head hung low, blowing, while the ball goes by behind it. */
  low: number
  /** The tail's wag, -1 to 1. */
  wag: number
}

function poseAt(t: number): Pose {
  const x = dogAt(t)
  const lie = 1 - easeInOutSine(over(t, T_SEAT + 0.12, T_UP))
  const run = easeInOutSine(over(t, T_GO - 0.08, T_GO + 0.12)) * (1 - easeInOutSine(over(t, T_SKID, T_SKID + 0.1)))
  const brace = easeInOutSine(over(t, T_SKID, T_SKID + 0.1)) * (1 - easeInOutSine(over(t, T_SKID + SKID_T - 0.04, T_SKID + SKID_T + 0.3)))
  const still = t - (T_SKID + SKID_T + 0.25)
  const wag = still < 0 ? 0 : Math.exp(-still * 0.9) * Math.sin(still * 13)
  const low = easeInOutSine(over(t, T_SKID + 0.08, T_SKID + 0.3)) * (1 - easeInOutSine(over(t, T_GONE, T_GONE + 0.35)))
  return { x, lie, run, brace, stride: (x - dogAt(T_GO)) / STRIDE, awake: t > T_SEAT + 0.04, low, wag }
}

/** A leg from its joint to its paw, bent at the middle the way `bend` says, as the joint in between. */
function knee(from: Pt, to: Pt, bend: 1 | -1): Pt {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const d = Math.min(Math.hypot(dx, dy), LEG * 2 - 1e-4)
  const h = Math.sqrt(Math.max(0, LEG * LEG - (d * d) / 4))
  const len = Math.hypot(dx, dy) || 1
  return [from[0] + dx / 2 + (bend * h * dy) / len, from[1] + dy / 2 - (bend * h * dx) / len]
}

function drawDog(p: p5, k: number, ink: string, weight: number, white: string, color: string, pose: Pose): void {
  const { lie, run, brace } = pose
  const up = 1 - lie
  const phase = pose.stride * Math.PI * 2
  // The spine: hips and shoulders over the snow, a bob at the gallop, the rump down at the skid.
  const bob = run * 0.018 * Math.sin(phase * 2)
  const hipH = lerp(LIE, STAND, up) - brace * 0.1 + bob
  const shH = lerp(LIE, STAND, up) + brace * 0.015 - bob * 0.6
  const hip: Pt = [pose.x + 0.03, snowAt(pose.x + 0.03) - hipH]
  const stretch = run * 0.02 * Math.sin(phase)
  const sh: Pt = [pose.x + BODY + stretch, snowAt(pose.x + BODY) - shH]

  // The paws: under the joints standing, out in front lying, swung at the gallop, braced at the skid.
  const paw = (joint: Pt, turn: number, lying: number, braced: number): Pt => {
    const swing = run * 0.13 * Math.cos(phase + turn)
    const lift = run * 0.07 * Math.max(0, Math.sin(phase + turn))
    const x = joint[0] + lie * lying + brace * braced + swing
    return [x, snowAt(x) - lift]
  }
  const legs: { joint: Pt; paw: Pt; bend: 1 | -1; near: boolean }[] = [
    { joint: hip, paw: paw(hip, 0.5, 0.12, 0.12), bend: -1, near: false },
    { joint: sh, paw: paw(sh, 3.4, 0.17, 0.2), bend: 1, near: false },
    { joint: hip, paw: paw(hip, 0, 0.1, 0.1), bend: -1, near: true },
    { joint: sh, paw: paw(sh, 2.9, 0.15, 0.18), bend: 1, near: true },
  ]
  const limb = (leg: (typeof legs)[number]) => {
    const mid = knee(leg.joint, leg.paw, leg.bend)
    const stroke = (w: number, c: string) => {
      p.noFill()
      p.stroke(c)
      p.strokeWeight(w)
      p.beginShape()
      p.vertex(leg.joint[0] * k, leg.joint[1] * k)
      p.vertex(mid[0] * k, mid[1] * k)
      p.vertex(leg.paw[0] * k, (leg.paw[1] - 0.02) * k)
      p.endShape()
    }
    stroke(0.045 * k + weight * 2, ink)
    if (leg.near) stroke(0.045 * k, white)
  }

  for (const leg of legs) if (!leg.near) limb(leg)

  // The tail: a plume curled over the back, streaming behind at the gallop, laid on the snow asleep.
  const curl = lerp(lerp(1, -0.25, run), -0.9, lie) + 0.18 * pose.wag
  const root: Pt = [hip[0] - 0.035, hip[1] - 0.03]
  const tip: Pt = [root[0] - 0.13 * Math.cos(curl * 1.1) + 0.06 * Math.max(0, curl), root[1] - 0.15 * Math.sin(curl * 1.25)]
  const ctl: Pt = [root[0] - 0.13, root[1] - 0.09 * curl]
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(0.07 * k)
  p.beginShape()
  p.vertex(root[0] * k, root[1] * k)
  p.quadraticVertex(ctl[0] * k, ctl[1] * k, tip[0] * k, tip[1] * k)
  p.endShape()
  solid(p, ink, weight, white)
  p.circle(tip[0] * k, tip[1] * k, 0.06 * k)

  // The body: one dark capsule from hips to shoulders.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(0.17 * k)
  p.line(hip[0] * k, (hip[1] + 0.035) * k, sh[0] * k, (sh[1] + 0.04) * k)

  for (const leg of legs) if (leg.near) limb(leg)

  // The harness: a collar of colour round the shoulders and a strap along the back to where the line is made fast.
  p.stroke(color)
  p.strokeWeight(0.04 * k)
  p.line((sh[0] - 0.05) * k, (sh[1] - 0.04) * k, (sh[0] + 0.015) * k, (sh[1] + 0.11) * k)
  p.strokeWeight(0.028 * k)
  p.line((sh[0] - 0.05) * k, (sh[1] - 0.045) * k, (hip[0] - 0.01) * k, (hip[1] - 0.045) * k)

  // The head: on its paws asleep, up awake, low and forward at the gallop. A white mask, two ears, an eye that opens.
  const head: Pt = [
    sh[0] + lerp(lerp(0.1, 0.13, run), 0.15, lie) + pose.low * 0.04,
    sh[1] + lerp(lerp(-0.13, -0.07, run), 0.02, lie) + brace * 0.03 * (1 - pose.low) + pose.low * 0.15,
  ]
  const tilt = lerp(lerp(-0.25, 0.1, run), 0.35, lie) + pose.low * 0.6
  p.push()
  p.translate(head[0] * k, head[1] * k)
  p.rotate(tilt)
  // The ears first, behind the skull.
  solid(p, ink, weight, ink)
  p.triangle(-0.065 * k, -0.035 * k, -0.04 * k, -0.135 * k, 0.005 * k, -0.06 * k)
  p.triangle(-0.015 * k, -0.055 * k, 0.025 * k, -0.14 * k, 0.055 * k, -0.045 * k)
  p.circle(0, 0, 0.16 * k)
  // The mask: cheek and muzzle, white, the nose at its end.
  solid(p, ink, weight, white)
  p.beginShape()
  p.vertex(-0.02 * k, 0.075 * k)
  p.bezierVertex(-0.03 * k, 0.0, 0.03 * k, -0.02 * k, 0.07 * k, 0.0)
  p.bezierVertex(0.12 * k, 0.0, 0.15 * k, 0.015 * k, 0.15 * k, 0.04 * k)
  p.bezierVertex(0.15 * k, 0.07 * k, 0.06 * k, 0.085 * k, -0.02 * k, 0.075 * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(ink)
  p.circle(0.145 * k, 0.03 * k, 0.04 * k)
  if (pose.awake) {
    p.fill(white)
    p.circle(0.03 * k, -0.025 * k, 0.035 * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the sled */

function sled(p: p5, k: number, ink: string, weight: number, color: string, x: number, t: number, part: 'behind' | 'front'): void {
  const ground = snowAt(x + 0.25)
  const bed = SEAT + R + rideAt(t)
  if (part === 'behind') {
    // The runner, curled up at the front to the bridle; three stanchions; the bed.
    outline(p, ink, weight)
    p.beginShape()
    p.vertex((x + HEEL) * k, ground * k)
    p.vertex((x + BRIDLE - 0.1) * k, ground * k)
    p.quadraticVertex((x + BRIDLE + 0.03) * k, ground * k, (x + BRIDLE) * k, (bed + 0.015) * k)
    p.endShape()
    for (const u of [-0.02, 0.22, 0.46]) p.line((x + u) * k, bed * k, (x + u) * k, ground * k)
    p.line((x - 0.06) * k, bed * k, (x + BRIDLE) * k, (bed + 0.015) * k)
    // The tray's far side and its floor, behind the ball.
    solid(p, ink, weight, color)
    p.rect((x + TRAY / 2) * k, (bed - WALL / 2) * k, (TRAY + 0.06) * k, WALL * k, 0.01 * k)
    return
  }
  // The tray's near side, in front of the ball: a low wall, its front rounded into the lip the ball leaves by.
  solid(p, ink, weight, color)
  p.beginShape()
  p.vertex((x - 0.03) * k, bed * k)
  p.vertex((x - 0.03) * k, (bed - WALL) * k)
  p.vertex((x + TRAY - 0.02) * k, (bed - WALL) * k)
  p.quadraticVertex((x + TRAY + 0.05) * k, (bed - WALL) * k, (x + TRAY + 0.05) * k, bed * k)
  p.endShape(p.CLOSE)
}

export const husky = definePiece<{ color: string; white: string }>({
  name: 'husky',
  weight: 0.8,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: gearColor(theme, color, ball.color), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    snow(p, k, ink, weight, -0.5, 2.5)
    rail(p, k, ink, weight, -0.5, NEAR)
    rail(p, k, ink, weight, FAR, 2.5)
    wand(p, k, ink, weight, s.color, NEAR - 0.03)
    wand(p, k, ink, weight, s.color, FAR + 0.03)
    // The drift at the foot of the far track's post, which stops the sled; it bursts as the runner goes into it.
    const hit = t - T_STOP_START
    solid(p, ink, weight, s.white)
    p.arc((FAR + 0.01) * k, (snowAt(FAR) + 0.01) * k, 0.26 * k, (hit > 0 ? 0.1 : 0.14) * k, Math.PI, Math.PI * 2, p.CHORD)
    powder(p, k, ink, weight, s.white, FAR - 0.06, snowAt(FAR) - 0.03, over(hit, 0, 0.45), 1.1)

    sled(p, k, ink, weight, s.color, sledAt(t), t, 'behind')
  },
  over: (p, s, { k, t, ink, weight }) => {
    const x = sledAt(t)
    sled(p, k, ink, weight, s.color, x, t, 'front')

    // The line: slack on the snow while the dog sleeps, taut at the haul, slack again at the stop.
    const pose = poseAt(t)
    const from: Pt = [x + BRIDLE, SEAT + R + rideAt(t) + 0.015]
    const to: Pt = [pose.x + 0.02, snowAt(pose.x) - lerp(LIE, STAND, 1 - pose.lie) + pose.brace * 0.1 - 0.045]
    const slack = clamp(1 - (to[0] - from[0]) / LINE) * 3
    outline(p, ink, weight * 0.8)
    p.beginShape()
    p.vertex(from[0] * k, from[1] * k)
    p.quadraticVertex(((from[0] + to[0]) / 2) * k, (Math.min(snowAt((from[0] + to[0]) / 2) - 0.01, (from[1] + to[1]) / 2 + slack * 0.2)) * k, to[0] * k, to[1] * k)
    p.endShape()

    // Snow off its paws as it sits back.
    const skid = t - T_SKID
    powder(p, k, ink, weight, s.white, pose.x + BODY + 0.2, snowAt(pose.x + BODY + 0.2) - 0.02, over(skid, 0.02, 0.5), 1.2)
    drawDog(p, k, ink, weight, s.white, s.color, pose)
  },
})
