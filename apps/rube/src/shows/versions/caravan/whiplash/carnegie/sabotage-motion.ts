import type { Pt } from '../../../../../parts'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { POSES, RIG, beatPose, type ArmPose, type HandShape, type Pose } from '../fletcher'
import { BUTTON, CARNEGIE, CHORD, SOLO, SHOUT_ORIGIN, SHOUT_PERIOD, level } from '../music'
import { FLETCHER_HOME, FLOOR, JIM_WINGS, KIT_AT } from './stage'

/**
 * The sabotage's clock and everyone's motion in it (242.34 → 270.52, Carnegie's frame, `stage.ts`): where Andrew
 * is, where Jim and Fletcher are, what Fletcher's hands do, and where the wrong chart is. The part (`sabotage.ts`)
 * samples Andrew's path for its lane and the set (`sabotage-set.ts`) draws from the same functions, so nothing
 * slides against anything.
 *
 * The beats, on the last chorus (`shout`) and the held chord:
 *
 *   242.34  the match cut: he sits on the snare in the dark.
 *   243.30  the lights come up on the band's hit. Fletcher conducts with a chart in his hand.
 *   247.51  he flings it; it lands on Andrew's empty stand on 248.16 (the desk knocks and rocks).
 *   248.2   Andrew looks at it, close; gives up; the band's three hits (254.6, 255.2, 255.8) knock him back
 *           toward the edge of the drum, and Fletcher's finger (258.11) does the rest.
 *   258.5   he rolls off the drum, drops to the floor on the beat (259.40) and goes, fast, to the stage door.
 *   261.13  the band's last hit: the door swings open, and his father is in the light.
 *   262.03  the chord: they meet, close, not pressed, and hold while it swells.
 *   266.1   he turns back; Jim steps out into the wings behind him; the door closes.
 *   268.75  a running leap: he lands on the snare on 269.62 as Fletcher's open hands cut the band off,
 *           and counts himself in on the drum: 269.92, 270.23, and the solo's first stroke on 270.52.
 */

/* ------------------------------------------------------------------ the clock */

/** The hall's lights come up on the chorus's first big hit (the hall's own `LIGHTS_UP`; kept here to avoid an import cycle through `strokes.ts`). */
export const LIGHTS = 243.297
/** Fletcher winds up, flings the chart, and it lands on the stand. */
export const WIND = 247.05
export const FLING = 247.505
export const LANDS = 248.163
/** The band's three big hits, which knock him back. */
export const HITS3 = [254.618, 255.215, 255.767] as const
/** Fletcher's finger: "you". */
export const POINT = 258.112
/** He rolls off the drum, and lands on the floor on the beat. */
export const LEAVE = 258.45
export const FLOORED = 259.399
/** The band's last hit (the door flies open) and its held chord (he meets his father). */
export const DOOR_OPENS = BUTTON
export const MEET = CHORD
/** He goes back. */
export const GO_BACK = 266.095
/** The running leap, and the landing on the snare with the cut-off. */
export const TAKEOFF = 268.75
export const LANDED = 269.62
/** His count-in on the snare, into the solo's first stroke (`SOLO`). */
export const COUNT = [269.917, 270.228] as const

/* ------------------------------------------------------------------ helpers */

/** 0 → 1 with zero speed and acceleration at both ends. */
const S = (u: number): number => {
  const v = clamp(u)
  return v * v * v * (v * (v * 6 - 15) + 10)
}
/** A smooth move of `d` from `t0`, lasting `dur`. */
const move = (T: number, t0: number, dur: number, d: number): number => d * S((T - t0) / dur)
/** A knock at `t0`: a sharp start, then eased to rest `d` away. */
const knock = (T: number, t0: number, d: number, tau: number): number => (T <= t0 ? 0 : d * (1 - Math.exp(-(T - t0) / tau)))

/**
 * A run along the floor whose speed goes from `v0` (cells/s) to a cruise, holds it, and ends at `v1`, each change
 * a half-sine (no step in speed or acceleration). Returns x at time `t` into the run.
 */
function run(x0: number, x1: number, dur: number, v0: number, v1: number, ta: number, td: number): (t: number) => number {
  const tc = dur - ta - td
  const vc = (x1 - x0 - (v0 * ta) / 2 - (v1 * td) / 2) / (ta / 2 + tc + td / 2)
  // Distance covered by a half-sine ramp from va to vb over T, after t of it.
  const ramp = (va: number, vb: number, T: number, t: number) => va * t + (vb - va) * (t / 2 - (T / (2 * Math.PI)) * Math.sin((Math.PI * t) / T))
  const dA = ramp(v0, vc, ta, ta)
  const dC = vc * tc
  return (t) => {
    const u = clamp(t, 0, dur)
    if (u < ta) return x0 + ramp(v0, vc, ta, u)
    if (u < ta + tc) return x0 + dA + vc * (u - ta)
    return x0 + dA + dC + ramp(vc, v1, td, u - ta - tc)
  }
}

/* ------------------------------------------------------------------ Andrew */

/** Where the ball rests on the snare, and on the stage floor. */
const SNARE = KIT_AT[0]
const GROUND = FLOOR - 0.13
const G_DROP = 12
const G_LEAP = 16

/** Andrew's x while he is on the snare's head (y 0): still through the chorus, then the look, the knocks. */
function onSnare(T: number): number {
  let x = SNARE
  // The chart slaps down on the stand: he starts back a little...
  x += knock(T, LANDS, -0.06, 0.09)
  // ...rolls to the drum's edge to look at it, close...
  x += move(T, 248.45, 1.15, 0.43)
  x += move(T, 249.75, 1.2, 0.03)
  // ...shrinks back when Fletcher leans his way...
  x += move(T, 250.95, 0.6, -0.1)
  // ...and gives up, back to the middle.
  x += move(T, 251.85, 1.5, -0.24)
  // The band's three hits knock him back toward the far edge, and Fletcher's finger once more.
  x += knock(T, HITS3[0], -0.1, 0.1) + knock(T, HITS3[1], -0.09, 0.1) + knock(T, HITS3[2], -0.08, 0.1)
  x += knock(T, POINT, -0.1, 0.1)
  return x
}

/** The snare's left rim, where he rolls off, and how long the drop to the floor takes. */
const RIM = -1.1
const FALL = Math.sqrt((2 * GROUND) / G_DROP)
const OFF = FLOORED - FALL
// From LEAVE he rolls to the rim with a steady push: x = onSnare(T) - a/2 (T - LEAVE)^2, reaching RIM at OFF.
const PUSH = (2 * (onSnare(OFF) - RIM)) / (OFF - LEAVE) ** 2
const derivative = (f: (t: number) => number, t: number) => (f(t + 1e-5) - f(t - 1e-5)) / 2e-5
const V_RIM = derivative(onSnare, OFF) - PUSH * (OFF - LEAVE)
const X_FLOOR = RIM + V_RIM * FALL

/** Where he meets his father, and where he turns back from. */
export const ANDREW_MEET = -8.9
const BACKED = ANDREW_MEET + 0.2
/** The leap: from here, at this pace, to the snare. */
const X_TAKEOFF = -1.6
const VX_LEAP = (SNARE - X_TAKEOFF) / (LANDED - TAKEOFF)
const PUSH_OFF = 0.14
const V_LEAP = (GROUND + (G_LEAP / 2) * (LANDED - TAKEOFF - PUSH_OFF) ** 2) / (LANDED - TAKEOFF - PUSH_OFF / 2)

const walkOff = run(X_FLOOR, ANDREW_MEET, MEET - FLOORED, V_RIM, 0, 0.5, 0.95)
const walkBack = run(BACKED, X_TAKEOFF, TAKEOFF - GO_BACK, 0, VX_LEAP, 0.7, 0.5)

/** The breath of two people holding each other: a slow sway toward each other and back, with the hold's envelope. */
function sway(T: number): number {
  const env = S((T - MEET) / 0.7) * (1 - S((T - 264.3) / 0.7))
  return Math.sin((2 * Math.PI * (T - MEET)) / 2.1) * env
}
/** The embrace: a little closer for a while, then apart. */
const embrace = (T: number): number => S((T - 262.9) / 0.8) - S((T - 264.2) / 0.9)

/** Andrew at show time `T` (Carnegie's frame), from the match cut to the solo's first stroke. */
export function andrewAt(T: number): Pt {
  if (T < LEAVE) return [onSnare(T), 0]
  if (T < OFF) return [onSnare(T) - (PUSH / 2) * (T - LEAVE) ** 2, 0]
  if (T < FLOORED) {
    const s = T - OFF
    return [RIM + V_RIM * s, (G_DROP / 2) * s * s]
  }
  if (T < MEET) return [walkOff(T - FLOORED), GROUND]
  if (T < GO_BACK) return [ANDREW_MEET - 0.012 * sway(T) - 0.018 * embrace(T) + move(T, 265.1, 0.8, BACKED - ANDREW_MEET), GROUND]
  if (T < TAKEOFF) return [walkBack(T - GO_BACK), GROUND]
  if (T < LANDED) {
    // A running leap: a quick push off the floor (the lift builds over PUSH_OFF, so nothing snaps), then the arc.
    const s = T - TAKEOFF
    const x = X_TAKEOFF + VX_LEAP * s
    if (s < PUSH_OFF) return [x, GROUND - (V_LEAP / (2 * PUSH_OFF)) * s * s]
    const f = s - PUSH_OFF
    return [x, GROUND - (V_LEAP * PUSH_OFF) / 2 - V_LEAP * f + (G_LEAP / 2) * f * f]
  }
  return [SNARE, 0]
}

/** The breakpoints of his path, and how finely to sample each stretch (samples a second; 0 for a still stretch). */
export const PATH: { from: number; to: number; rate: number }[] = [
  { from: CARNEGIE, to: LANDS, rate: 0 },
  { from: LANDS, to: LEAVE, rate: 60 },
  { from: LEAVE, to: OFF, rate: 120 },
  { from: OFF, to: FLOORED, rate: 120 },
  { from: FLOORED, to: MEET, rate: 60 },
  { from: MEET, to: GO_BACK, rate: 30 },
  { from: GO_BACK, to: TAKEOFF, rate: 60 },
  { from: TAKEOFF, to: LANDED, rate: 120 },
]
/** The count-in: three bounces on the snare, growing, the last landing on the solo's first stroke. */
export const BOUNCES: { at: number; arc: number }[] = [
  { at: COUNT[0], arc: 0.2 },
  { at: COUNT[1], arc: 0.24 },
  { at: SOLO, arc: 0.31 },
]

/* ------------------------------------------------------------------ Jim */

/** Behind the stage door, out of sight, until it opens; then he steps out from behind its leaf. */
const JIM_HIDE = -9.62
const JIM_MEET = ANDREW_MEET - 0.34

/** Jim at show time `T`: behind the door, then in the doorway, then out in the wings to watch. */
export function jimAt(T: number): Pt {
  let x = JIM_HIDE + move(T, 261.3, 1.0, JIM_MEET - JIM_HIDE)
  x += 0.012 * sway(T) + 0.014 * embrace(T)
  x += move(T, 266.75, 1.85, JIM_WINGS[0] - JIM_MEET)
  return [x, JIM_WINGS[1]]
}

/* ------------------------------------------------------------------ the stage door */

/** How far the stage door is open at `T`, radians (0 shut, about 1.35 wide open): Jim throws it open on the band's last hit, and it closes behind him. */
export function doorAngle(T: number): number {
  const open = 1.36
  if (T < DOOR_OPENS) return 0
  const s = T - DOOR_OPENS
  // Flung open: a sharp start, a long damped settle against its stop.
  const swing = open * (1 - Math.exp(-s / 0.13) * (Math.cos(s * 7.5) + 0.3 * Math.sin(s * 7.5)))
  // The closer draws it shut after Jim is out, easing into the latch.
  return swing * (1 - easeInOutSine(clamp((T - 268.05) / 1.25)))
}

/* ------------------------------------------------------------------ Fletcher */

/** Fletcher's head at `T`: on his podium, bobbing with his beat, leaning into the throw, toward the silent kit, and into the point, dipping on the cut-off. */
export function fletcherAt(T: number): Pt {
  const [hx, hy] = FLETCHER_HOME
  const conducting = 1 - S((T - 261.3) / 0.7)
  const bob = 0.02 * (1 - lift(phase(T))) * conducting
  // Into the throw; a long look at the silent kit while he keeps the band going; into the point.
  const lean = -0.09 * (S((T - 247.1) / 0.4) - S((T - 248.6) / 0.8)) - 0.17 * (S((T - 250.45) / 0.55) - S((T - 251.7) / 0.9)) - 0.06 * (S((T - 257.72) / 0.4) - S((T - 259.4) / 0.8))
  const dip = 0.05 * (S((T - 269.3) / 0.32) - S((T - 269.8) / 0.55))
  return [hx + lean, hy + bob + dip]
}

const phase = (T: number): number => (T - SHOUT_ORIGIN) / SHOUT_PERIOD
/** beatPose's bounce, 1 at the top of the beat, 0 at its ictus. */
function lift(ph: number): number {
  const u = ph - Math.floor(ph)
  return u < 0.12 ? 1 - u / 0.12 : Math.pow(Math.sin(((u - 0.12) / 0.88) * Math.PI * 0.5), 0.7)
}

const arm = (up: number, bend: number, wrist: number, hand: HandShape): ArmPose => ({ up, bend, wrist, hand })
/** An arm's angles eased from `a` to `b`, the shoulder turning the short way round. The hand's shape changes halfway. */
function mixArm(a: ArmPose, b: ArmPose, u: number): ArmPose {
  let d = b.up - a.up
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return { up: a.up + d * u, bend: a.bend + (b.bend - a.bend) * u, wrist: a.wrist + (b.wrist - a.wrist) * u, hand: u < 0.5 ? a.hand : b.hand }
}

/** His beat's size: the louder the band, the bigger. */
const size = (T: number): number => 0.58 + 0.38 * clamp((level(T) - 0.5) / 0.4)
const beat = (T: number): Pose => beatPose(phase(T), size(T))

/** The right hand cocked over his head, the chart in it. */
const COCK = arm(-Math.PI * 0.62, 1.32, -0.3, 'beat')
/** Flung out toward the kit. */
const RELEASE = arm(-Math.PI * 0.95, 0.08, 0.1, 'beat')
/** The chord held: both hands up, open, a little higher as it swells. */
const HELD = POSES.ready
/** The cut-off: both open hands swept out and down. */
const CUT = { right: arm(Math.PI * 0.8, -0.3, -0.25, 'open'), left: arm(Math.PI * 0.2, 0.3, 0.25, 'open') }

/** The right arm straight out at `target` from where his right shoulder is: "you". */
function aim(T: number, target: Pt): ArmPose {
  const [hx, hy] = fletcherAt(T)
  const up = Math.atan2(target[1] - (hy + RIG.drop), target[0] - (hx - RIG.shoulder))
  return arm(up, 0.05, 0, 'point')
}
const atAndrew = (T: number): ArmPose => aim(T, andrewAt(T))

/** What Fletcher's hands do at `T`. His right hand (the house's left) throws, points and cuts; his left keeps the band. */
export function poseAt(T: number): Pose {
  const b = beat(T)
  // The left hand: the beat, then the chord held, the cut, rest.
  let left = b.left
  let right = b.right
  if (T >= 261.2) {
    const rise = 0.14 * easeInOutSine(clamp((T - 262.3) / 6.8))
    const held = { right: { ...HELD.right, up: HELD.right.up - rise }, left: { ...HELD.left, up: HELD.left.up + rise } }
    if (T < 269.25) {
      const u = easeInOutSine(clamp((T - 261.2) / 0.8))
      return { right: mixArm(b.right, held.right, u), left: mixArm(b.left, held.left, u) }
    }
    if (T < LANDED) {
      // The cut-off: the open hands sweep out and down, gathering speed, and stop on the release.
      const u = easeInQuad(clamp((T - 269.25) / (LANDED - 269.25)))
      return { right: mixArm(held.right, CUT.right, u), left: mixArm(held.left, CUT.left, u) }
    }
    // A small rebound off the stop, then down to his sides (exactly `POSES.rest` at the solo's first stroke).
    const s = T - LANDED
    const settle = { right: { ...CUT.right, up: CUT.right.up - 0.06 * Math.exp(-s / 0.12) * Math.sin(s * 14) }, left: { ...CUT.left, up: CUT.left.up + 0.06 * Math.exp(-s / 0.12) * Math.sin(s * 14) } }
    const u = easeInOutSine(clamp(s / (SOLO - LANDED)))
    return { right: mixArm(settle.right, POSES.rest.right, u), left: mixArm(settle.left, POSES.rest.left, u) }
  }
  // The right hand's own business through the chorus.
  if (T >= WIND && T < 247.36) right = mixArm(b.right, COCK, easeInOutSine((T - WIND) / (247.36 - WIND)))
  else if (T >= 247.36 && T < FLING) right = mixArm(COCK, RELEASE, easeInQuad((T - 247.36) / (FLING - 247.36)))
  else if (T >= FLING && T < 247.8) right = mixArm(RELEASE, atAndrew(T), easeOutCubic((T - FLING) / (247.8 - FLING)))
  else if (T >= 247.8 && T < 248.6) right = atAndrew(T)
  else if (T >= 248.6 && T < 249.1) right = mixArm(atAndrew(T), b.right, easeInOutSine((T - 248.6) / 0.5))
  else if (T >= 257.62 && T < POINT) right = mixArm(b.right, atAndrew(T), easeInQuad((T - 257.62) / (POINT - 257.62)))
  else if (T >= POINT && T < 259.45) {
    // The finger lands on the beat with a small jab, then follows him off the drum.
    const s = T - POINT
    const a = atAndrew(T)
    right = { ...a, bend: a.bend + 0.12 * Math.exp(-s / 0.1) * Math.sin(s * 22) }
  } else if (T >= 259.45 && T < 259.95) right = mixArm(atAndrew(T), b.right, easeInOutSine((T - 259.45) / 0.5))
  return { left, right }
}

/* ------------------------------------------------------------------ the chart */

/** Andrew's music stand beside the hi-hat, its desk, and the page when it lies there. */
export const STAND = { x: 1.9, deskY: -1.28, deskW: 0.76, deskH: 0.56, pageW: 0.6, pageH: 0.46 }
export const CHART_W = 0.4
export const CHART_H = 0.5

/** A hand's wrist and heading, for an arm on the house's left (`-1`, his right) or right (`1`). */
export function handOf(head: Pt, a: ArmPose, side: -1 | 1): { wrist: Pt; angle: number } {
  const sh: Pt = [head[0] + side * RIG.shoulder, head[1] + RIG.drop]
  const el: Pt = [sh[0] + Math.cos(a.up) * RIG.upper, sh[1] + Math.sin(a.up) * RIG.upper]
  const fa = a.up + a.bend
  return { wrist: [el[0] + Math.cos(fa) * RIG.fore, el[1] + Math.sin(fa) * RIG.fore], angle: fa + a.wrist }
}

/** The chart in his fingers: its centre and turn, hanging from the hand. */
function inHand(T: number): { at: Pt; turn: number } {
  const { wrist, angle } = handOf(fletcherAt(T), poseAt(T).right, -1)
  const grip: Pt = [wrist[0] + Math.cos(angle) * 0.17, wrist[1] + Math.sin(angle) * 0.17]
  // The page hangs below the grip, turned a little with the hand.
  const turn = 0.35 * Math.sin(angle + Math.PI / 2)
  return { at: [grip[0] + Math.sin(turn) * CHART_H * 0.42, grip[1] + Math.cos(turn) * CHART_H * 0.42], turn }
}

/** The desk's knock when the chart lands, and the whole stand's sway: damped, from the landing. */
export function deskRock(T: number): { desk: number; stand: number } {
  const s = T - LANDS
  if (s < 0) return { desk: 0, stand: 0 }
  return { desk: 0.1 * Math.exp(-s / 0.28) * Math.sin(s * 2 * Math.PI * 2.6), stand: 0.02 * Math.exp(-s / 0.4) * Math.sin(s * 2 * Math.PI * 1.7) }
}

/** How far the stand has sunk into the trap under it: gone with Fletcher's piece, on the cut-off. */
export const standSink = (T: number): number => 3.7 * easeInOutSine(clamp((T - 269.25) / 1.15))

/** Where the chart is at `T` and how it is turned, or null before the match cut. On the stand from `LANDS`. */
export function chartAt(T: number): { at: Pt; turn: number; on: 'hand' | 'air' | 'desk' } {
  if (T < FLING) return { ...inHand(T), on: 'hand' }
  const from = inHand(FLING)
  const to: Pt = [STAND.x, STAND.deskY + STAND.deskH / 2 - CHART_H / 2 - 0.04]
  if (T < LANDS) {
    const u = (T - FLING) / (LANDS - FLING)
    const arc = (9 * (LANDS - FLING) ** 2) / 8
    const x = from.at[0] + (to[0] - from.at[0]) * u
    const y = from.at[1] + (to[1] - from.at[1]) * u - arc * 4 * u * (1 - u)
    // It turns once in the air, and comes down square on the desk.
    const turn = from.turn + (-2 * Math.PI - from.turn) * easeInOutSine(u)
    return { at: [x, y], turn, on: 'air' }
  }
  return { at: to, turn: 0, on: 'desk' }
}

/* ------------------------------------------------------------------ the light */

/** How much of the road's darkness is still over the hall at `T`: all of it at the cut, gone as the lights come up. */
export const veil = (T: number): number => 0.72 * (1 - easeInOutSine(clamp((T - (LIGHTS - 0.08)) / 0.42)))
/** How lit the stage is for Fletcher's hands (the hall's own wake, kept in step with it). */
export const stageLight = (T: number): number => 0.12 + 0.88 * easeInOutSine(clamp((T - (LIGHTS - 0.08)) / 0.35))
