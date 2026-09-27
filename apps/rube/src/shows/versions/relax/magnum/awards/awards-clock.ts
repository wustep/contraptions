import { laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { carried } from '../kit'
import { bar, beat, CALL1, CALL2, DRUMS, half, onset, PICKUP, SEAM } from '../music'
import { G } from '../physics'

/**
 * The awards' clock and geometry (the AWARDS builder's): where everything stands, when everything happens, and the
 * three lanes (Derek's, Hansel's, Mugatu's), all in the awards' own cells (the frame's origin is AWARDS_AT = [0, 0];
 * Derek comes in at (-0.5, 0)) and in show seconds (the part's slot begins at 0).
 *
 * Side on, left to right: the press pit past the runway's end; the runway, out into the house; its head at the
 * stage's lip, where Derek starts in the one follow spot; the stage, the podium (a stepped dais, the trophy on it) in
 * front of a wall of bulbs; the right-hand curtain; and past it the far wings, where Hansel comes from and Derek goes
 * back to. Over it all, the truss of spots, and on it the trolley that flies the trophy.
 */

/* ------------------------------------------------------------------ geometry */

/** The stage's and the runway's surface (a ball on it has its centre at 0), and the floor of the house. */
export const SURF = 0.13
export const HOUSE = 2.13
/** The runway: out from the stage's lip into the house, its end over the press pit. */
export const RUNWAY = { x0: -4.4, x1: -0.9 }
/** The stage, from the runway's head on through the wings. */
export const STAGE = { x0: -0.9, x1: 14 }
/** The podium: a stepped dais of black gloss, a step each side, the top between. Surfaces (y) and a ball's centre on each. */
export const DAIS = { x0: 0.7, s0: 1.1, s1: 2.7, x1: 3.1, step: -0.17, top: -0.47 }
export const ON_STEP = DAIS.step - 0.13
export const ON_TOP = DAIS.top - 0.13
/** The trophy: where it stands on the podium, how tall it is (base to crown). */
export const TROPHY_X = 2.2
export const TROPHY_H = 0.9
/** The curtains: the right-hand leg of the proscenium, the far wings' legs behind it, and the left-hand leg. */
export const LEG_L = { x0: -1.75, x1: -0.95 }
export const LEG_R = { x0: 5.85, x1: 6.75 }
export const WING_LEGS = [
  { x0: 8.45, x1: 9.05 },
  { x0: 10.6, x1: 11.2 },
]
/** The wall of bulbs behind the stage: its strips, and the height they run between. */
export const BULBS = { x0: -0.35, dx: 0.66, n: 9, y0: -0.62, dy: 0.25, rows: 11 }
/** The truss of spots: its bottom chord and its top, and how far along it runs. */
export const TRUSS = { y: -4.35, h: 0.34, x0: -7, x1: 12.5 }
/** The mouth of the far wings, where the spots swing to on the drums. */
export const MOUTH = 6.45

/** Marks: Derek's start, where he gives Blue Steel, his place on the podium, and where he stops in the wings. */
export const START: Pt = [-0.5, 0]
export const STEEL_X = -4.0
export const MARK_X = 1.62
export const REACH_X = 1.95
export const WINGS_X = 7.25
/** Hansel's: behind the curtain, in the light, at the runway's end. */
export const HANSEL_FROM = 8.8
export const HANSEL_LIGHT = 5.0
export const HANSEL_END = -3.6
/** Mugatu's: deep in the wings; beside Derek on his right. */
export const MUGATU_FROM = 12.3
export const MUGATU_AT = WINGS_X + 0.42

/* ------------------------------------------------------------------ moments */

/** Derek sets off down the runway as the first call begins. */
export const SET_OFF = 2.75
/** Blue Steel, on the first call's strongest onset. */
export const STEEL = CALL1
/** The press pit's volley on it. */
export const VOLLEY = [CALL1, onset(5.283), onset(5.44), onset(5.666)]
/** He turns and goes back up the runway. */
export const TURN = onset(5.811)
/**
 * The house begins to come up for him: a spot snaps on on the stage ahead of him (the intro's hardest onset) and takes
 * him as he walks into it; the trophy's own lamp; the wall of bulbs in two banks.
 */
export const AHEAD = onset(6.92)
export const TROPHY_LAMP = onset(7.21)
export const BANK1 = onset(7.773)
export const BANK2 = onset(8.133)
/** Up the podium: a hop onto its step on the second call, and onto its top. */
export const HOP1 = onset(8.348)
export const UP1 = CALL2
export const HOP2 = onset(9.068, 0.2)
export const UP2 = onset(9.347)
/** The pickup: the spotlight rig lurches. The drums: the spots swing to the far wings, and the trophy is lifted. */
export const LURCH = PICKUP
export const SWING = DRUMS
/** Hansel rolls out (in the dark, out of shot, on the pickup) and stops in the light. */
export const HANSEL_GO = PICKUP
export const HANSEL_STOP = beat(23)
/** The press row under the podium, its cameras swung round onto him on the drums, fire as he rolls into the light. */
export const LIP_VOLLEY = [beat(21), half(21), beat(22)]
/** The trophy set down beside him (bar 6's downbeat). A hop of joy. */
export const CROWNED = bar(6)
export const JOY_OFF = half(24)
export const JOY = beat(25)
/** The victory roll down the runway, past the podium (bar 7), to its end (bar 8), the trophy flown along over him. */
export const PARADE = 13.62
export const PASS = bar(7)
export const ARRIVE = bar(8)
/** Derek backs away: off the podium's top onto its step, and onto the stage. */
export const BACK = 15.95
export const DROP1 = beat(33)
export const DROP2 = beat(34)
/** In the wings, he stops. */
export const STILL = 23.0
/** Mugatu glides out of the dark to him and stops on bar 12's downbeat. */
export const GLIDE = 20.6
export const MUGATU_STOP = bar(12)
/** Derek starts at the one behind him: a little hop where he stands. */
export const STARTLE_OFF = half(48)
export const STARTLE = beat(49)
/** A photographer in the wings raises his camera, and fires: the flash the cut is made in. */
export const RAISE = beat(50)
export const CUT = SEAM.spa

/** The press's flashes at Hansel: the stage's lip on the downbeats, the pit when he reaches it and after. */
export const PIT_LATE = [ARRIVE, half(32), beat(33), half(33), bar(9), bar(10), beat(41), bar(11), beat(46), bar(12)]
/** The seats in front of the runway: a photographer there fires twice as Hansel goes by (beats 30 and 31, hard). */
export const RUNWAY_FLASHES = [beat(30), beat(31)]

/* ------------------------------------------------------------------ easing */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** 0 at a, 1 at b, eased in and out (smoothstep). */
export const ease = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** A hit's sharp start and long damped settle onto 1: the swing of a lamp. 0 before. */
export const settle = (u: number, tau = 0.16, w = 6.5): number => (u <= 0 ? 0 : 1 - Math.exp(-u / tau) * Math.cos(u * w))
/** A lamp snapping on: up in a few frames, a flicker as its filament catches. */
export const snapOn = (u: number): number => (u <= 0 ? 0 : (1 - Math.exp(-u / 0.025)) * (1 + 0.22 * Math.exp(-u / 0.1) * Math.sin(u * 55)))

/* ------------------------------------------------------------------ lanes */

/** A lane being laid in show seconds, in the awards' cells. */
export class Path {
  segs: Seg[] = []
  constructor(public at: Pt, public t: number) {}
  /** Still until `t1`. */
  rest(t1: number): this {
    if (t1 > this.t + 1e-9) this.segs.push({ from: this.at, to: this.at, dur: t1 - this.t })
    this.t = Math.max(this.t, t1)
    return this
  }
  /** A flight under gravity to `to`, landing at `t1`. */
  fly(to: Pt, t1: number): this {
    const T = t1 - this.t
    this.segs.push({ from: this.at, to, dur: T, arc: (G * T * T) / 8 })
    this.at = to
    this.t = t1
    return this
  }
  /** Rolling straight to `to` by `t1`, from speed v0 to v1 through one middle speed: two even changes of pace. */
  roll(to: Pt, t1: number, v0: number, v1: number, f = 0.5): this {
    const T = t1 - this.t
    const D = Math.hypot(to[0] - this.at[0], to[1] - this.at[1])
    const ta = T * f
    const tb = T - ta
    let vm = (2 * D - v0 * ta - v1 * tb) / T
    if (vm < 0) {
      console.warn(`magnum: awards: a roll of ${D.toFixed(2)} in ${T.toFixed(2)}s from ${v0.toFixed(2)} to ${v1.toFixed(2)} cannot be made`)
      vm = 0
    }
    const d1 = ((v0 + vm) / 2) * ta
    const mid: Pt = [this.at[0] + ((to[0] - this.at[0]) * d1) / D, this.at[1] + ((to[1] - this.at[1]) * d1) / D]
    const seg = (a: Pt, b: Pt, dur: number, r0: number, r1: number): Seg => (r0 + r1 > 1e-6 ? { from: a, to: b, dur, ramp: [r0, r1] } : { from: a, to: b, dur })
    this.segs.push(seg(this.at, mid, ta, v0, vm), seg(mid, to, tb, vm, v1))
    this.at = to
    this.t = t1
    return this
  }
  /** A glide from rest to rest: up to speed over `ta`, a long even glide, and a long ease to a stop over `td`. */
  glide(to: Pt, t1: number, ta: number, td: number): this {
    const T = t1 - this.t
    const D = Math.hypot(to[0] - this.at[0], to[1] - this.at[1])
    const tc = T - ta - td
    const vm = D / (ta / 2 + tc + td / 2)
    const p = (d: number): Pt => [this.at[0] + ((to[0] - this.at[0]) * d) / D, this.at[1] + ((to[1] - this.at[1]) * d) / D]
    const d1 = (vm * ta) / 2
    const d2 = d1 + vm * tc
    this.segs.push({ from: this.at, to: p(d1), dur: ta, ramp: [0, vm] }, { from: p(d1), to: p(d2), dur: tc }, { from: p(d2), to, dur: td, ramp: [vm, 0] })
    this.at = to
    this.t = t1
    return this
  }
  /** Carried along a function of show time to `t1` (sampled finely, so the lane and a drawing reading it agree). */
  carry(fn: (t: number) => Pt, t1: number, perSecond = 60): this {
    const n = Math.max(2, Math.ceil((t1 - this.t) * perSecond))
    this.segs.push(...carried(fn, this.t, t1, n))
    this.at = fn(t1)
    this.t = t1
    return this
  }
  lane(fire: number): Lane {
    return { segs: this.segs, fire }
  }
}

/**
 * A model's strut from `x0` to `x1` (a level floor at y 0) between `t0` and `t1`: eased off from rest and eased
 * either into a stop or into the speed `v1` it leaves with, and a little lilt, `bobs` of them, `amp` high, a step at a
 * time. The lilt is a smooth sine squared: no footfall is a knock.
 */
export function strut(x0: number, x1: number, t0: number, t1: number, bobs: number, amp: number, v1 = 0): (t: number) => Pt {
  const D = x1 - x0
  const T = t1 - t0
  const m1 = (Math.abs(v1) * T) / Math.abs(D)
  return (t: number): Pt => {
    const u = clamp01((t - t0) / T)
    const s = -2 * u ** 3 + 3 * u ** 2 + m1 * (u ** 3 - u ** 2)
    return [x0 + D * s, -amp * Math.sin(Math.PI * bobs * s) ** 2]
  }
}

/** Derek's walk down the runway, and back up it. */
export const derekOut = strut(START[0], STEEL_X, SET_OFF, STEEL, 4, 0.035)
const HOP1_FROM: Pt = [0.45, 0]
const STEP_LAND: Pt = [0.87, ON_STEP]
const HOP1_V = (STEP_LAND[0] - HOP1_FROM[0]) / (UP1 - HOP1)
export const derekBack = strut(STEEL_X, HOP1_FROM[0], TURN, HOP1, 5, 0.03, HOP1_V)

/** Derek's lane, in show seconds. */
function derek(): Path {
  const path = new Path(START, 0)
  path.rest(SET_OFF)
  // Down the runway to its end, and Blue Steel.
  path.carry(derekOut, STEEL)
  path.rest(TURN)
  // Back up it toward the podium, sure it is his, and up its steps: onto the step on the second call, onto the top.
  path.carry(derekBack, HOP1)
  path.fly(STEP_LAND, UP1)
  const settleAt: Pt = [0.96, ON_STEP]
  path.roll(settleAt, UP1 + (2 * (settleAt[0] - STEP_LAND[0])) / HOP1_V, HOP1_V, 0, 0.001)
  path.rest(HOP2)
  const topLand: Pt = [1.36, ON_TOP]
  path.fly(topLand, UP2)
  const v2 = (topLand[0] - settleAt[0]) / (UP2 - HOP2)
  path.roll([MARK_X, ON_TOP], UP2 + (2 * (MARK_X - topLand[0])) / v2, v2, 0, 0.001)
  // On the drums the trophy is lifted away from beside him: he goes after it a step, and it is gone.
  path.rest(SWING + 0.12)
  path.roll([REACH_X, ON_TOP], SWING + 0.95, 0, 0, 0.45)
  path.rest(BACK)
  // He backs away: across the top, off it onto the step (bar 8's second beat), off that onto the stage, and on back
  // into the dark of the wings.
  const fall = Math.sqrt((2 * (ON_STEP - ON_TOP)) / G)
  const vDown = (DAIS.x1 - DAIS.s1) / (fall + (DROP2 - DROP1 - fall))
  path.roll([DAIS.s1, ON_TOP], DROP1 - fall, 0, vDown, 0.55)
  path.fly([DAIS.s1 + vDown * fall, ON_STEP], DROP1)
  path.roll([DAIS.x1, ON_STEP], DROP2 - fall, vDown, vDown)
  path.fly([DAIS.x1 + vDown * fall, 0], DROP2)
  path.roll([WINGS_X, 0], STILL, vDown, 0, 0.35)
  // Mugatu comes to rest just behind him, out of the dark: he starts.
  path.rest(STARTLE_OFF)
  path.fly([WINGS_X, 0], STARTLE)
  path.rest(CUT)
  return path
}

/** Hansel's victory roll: quick and showy, a bigger lilt. */
export const hanselParade = strut(HANSEL_LIGHT, HANSEL_END, PARADE, ARRIVE, 7, 0.055)

/** Hansel's lane, in show seconds, from where he waits behind the curtain. */
function hansel(): Path {
  const path = new Path([HANSEL_FROM, 0], 0)
  path.rest(HANSEL_GO)
  path.roll([HANSEL_LIGHT, 0], HANSEL_STOP, 0, 0, 0.3)
  path.rest(JOY_OFF)
  path.fly([HANSEL_LIGHT, 0], JOY)
  path.rest(PARADE)
  path.carry(hanselParade, ARRIVE)
  path.rest(CUT)
  return path
}

/** Mugatu's lane: in the dark deep in the wings, then a glide to Derek's side. */
function mugatu(): Path {
  const path = new Path([MUGATU_FROM, 0], 0)
  path.rest(GLIDE)
  path.glide([MUGATU_AT, 0], MUGATU_STOP, 0.9, 1.9)
  path.rest(CUT)
  return path
}

export const DEREK_LANE: Lane = derek().lane(STEEL)
export const HANSEL_LANE: Lane = hansel().lane(0)
export const MUGATU_LANE: Lane = mugatu().lane(0)

/** Where each of them is at show time `t` (the lanes start at 0). */
export const derekAt = (t: number): Pt => {
  const q = laneAt(DEREK_LANE, t)
  return [q.x, q.y]
}
export const hanselAt = (t: number): Pt => {
  const q = laneAt(HANSEL_LANE, t)
  return [q.x, q.y]
}
export const mugatuAt = (t: number): Pt => {
  const q = laneAt(MUGATU_LANE, t)
  return [q.x, q.y]
}
/** Hansel's x a little behind time: what the spots and the trolley follow. */
export const hanselLag = (t: number, lag = 0.3): number => {
  let s = 0
  for (let i = 0; i < 6; i++) s += hanselAt(t - (lag * i) / 5)[0]
  return s / 6
}

/* ------------------------------------------------------------------ the rig */

/** How far the truss has dropped at `t`: the lurch on the pickup, a bounce on its chains, and it hangs a little lower. */
export function trussDrop(t: number): number {
  const u = t - LURCH
  if (u <= 0) return 0
  return 0.06 * (1 - Math.exp(-u / 0.025)) + 0.075 * Math.exp(-u / 0.32) * Math.sin(u * 19)
}

/* ------------------------------------------------------------------ the trophy */

/** The trophy's flight: the trolley's x along the truss, and the height of the trophy's foot (y of its base's bottom). */
const lift1 = (t: number) => ease(t, SWING, SWING + 0.55)
const down1 = (t: number) => ease(t, CROWNED - 0.95, CROWNED)
const lift2 = (t: number) => ease(t, PARADE - 0.05, PARADE + 0.55)
const down2 = (t: number) => ease(t, ARRIVE - 0.75, ARRIVE)
const HIGH = -1.3
const TROPHY_AT_HANSEL = HANSEL_LIGHT + 0.46
export const TROPHY_END = HANSEL_END + 0.46
function trolleyX(t: number): number {
  if (t < SWING + 0.1) return TROPHY_X
  if (t < PARADE) return TROPHY_X + (TROPHY_AT_HANSEL - TROPHY_X) * ease(t, SWING + 0.1, CROWNED - 0.35)
  if (t < ARRIVE) {
    // After him, a little behind, and eased onto its spot beside him at the runway's end.
    const follow = hanselLag(t, 0.35) + 0.46
    return follow + (TROPHY_END - follow) * ease(t, ARRIVE - 0.5, ARRIVE)
  }
  return TROPHY_END
}
function footY(t: number): number {
  if (t < SWING) return DAIS.top
  if (t < PARADE - 0.05) {
    const up = DAIS.top + (HIGH - DAIS.top) * lift1(t)
    return up + (SURF - up) * down1(t)
  }
  const up = SURF + (HIGH - SURF) * lift2(t)
  return up + (SURF - up) * down2(t)
}
/** Whether it is standing on something (and so does not swing). */
const grounded = (t: number): boolean => t < SWING || (t >= CROWNED && t < PARADE) || t >= ARRIVE

/**
 * The swing on its wire: a pendulum hung from the trolley, driven by the trolley's pace and damped, integrated once
 * over the whole slot. A stiff rig (a third of a free swing), and still whenever the trophy stands on something.
 */
const SW_DT = 1 / 240
const SW_N = Math.ceil(30 / SW_DT)
const SWING_ANGLE: Float32Array = (() => {
  const out = new Float32Array(SW_N + 1)
  let th = 0
  let om = 0
  const acc = (t: number) => (trolleyX(t + SW_DT) - 2 * trolleyX(t) + trolleyX(t - SW_DT)) / (SW_DT * SW_DT)
  for (let i = 0; i <= SW_N; i++) {
    const t = i * SW_DT
    if (grounded(t)) {
      th = 0
      om = 0
    } else {
      const L = Math.max(0.6, footY(t) - TROPHY_H / 2 - TRUSS.y)
      const w2 = G / L
      const a = -w2 * th - 2 * 0.22 * Math.sqrt(w2) * om - (0.33 * acc(t)) / L
      om += a * SW_DT
      th += om * SW_DT
    }
    out[i] = th
  }
  return out
})()

/** The trophy at show time `t`: its trolley's x, the foot of its base (where it would stand), its tilt, and the lift. */
export function trophyAt(t: number): { tx: number; foot: Pt; tilt: number; crown: Pt; flying: boolean } {
  const tx = trolleyX(t)
  const fy = footY(t)
  const i = Math.max(0, Math.min(SW_N, Math.round(t / SW_DT)))
  let tilt = SWING_ANGLE[i]
  // A touchdown takes the last of the swing out.
  if (!grounded(t)) tilt *= 1 - Math.max(ease(t, CROWNED - 0.45, CROWNED), ease(t, ARRIVE - 0.45, ARRIVE))
  // The lurch rocks it on its base before it goes.
  const r = t - LURCH
  if (t < SWING && r > 0) tilt += 0.06 * Math.exp(-r / 0.2) * Math.sin(r * 16)
  // A set-down: a small clunk as it lands.
  for (const land of [CROWNED, ARRIVE]) {
    const u = t - land
    if (u > 0 && u < 0.5) tilt += 0.03 * Math.exp(-u / 0.1) * Math.sin(u * 30)
  }
  const pivotY = TRUSS.y + trussDrop(t)
  const wire = fy - TROPHY_H - pivotY
  const flying = !grounded(t)
  if (!flying) {
    const foot: Pt = [tx, fy]
    return { tx, foot, tilt, crown: [tx + Math.sin(tilt) * TROPHY_H, fy - Math.cos(tilt) * TROPHY_H], flying }
  }
  const crown: Pt = [tx + Math.sin(tilt) * wire, pivotY + Math.cos(tilt) * wire]
  const foot: Pt = [crown[0] + Math.sin(tilt) * TROPHY_H, crown[1] + Math.cos(tilt) * TROPHY_H]
  return { tx, foot, tilt: -tilt, crown, flying }
}

/* ------------------------------------------------------------------ strikes */

/** Every strike the awards make, in show seconds. */
export const HITS: number[] = [
  ...VOLLEY,
  AHEAD,
  TROPHY_LAMP,
  BANK1,
  BANK2,
  HOP1,
  UP1,
  HOP2,
  UP2,
  LURCH,
  SWING,
  ...LIP_VOLLEY,
  HANSEL_STOP,
  CROWNED,
  JOY_OFF,
  JOY,
  PASS,
  ...RUNWAY_FLASHES,
  ARRIVE,
  DROP1,
  DROP2,
  bar(9),
  bar(10),
  beat(41),
  bar(11),
  beat(46),
  MUGATU_STOP,
  STARTLE_OFF,
  STARTLE,
  RAISE,
  CUT,
].sort((a, b) => a - b)
