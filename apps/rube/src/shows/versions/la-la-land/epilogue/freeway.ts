import type p5 from 'p5'
import { R, type Pt } from '../../../../parts'
import { box, carried, frame, knock, part, smooth, type Companion, type Ctx, type PartShot, type Slot } from './kit'
import { SWING_PERIOD } from './music'
import { G_EARTH, dropTime } from './physics'
import {
  BEATS, BONK, BRAKE, BUS, CARS, CATCH, CRANKS, DECK, FLASH, GATE_DROP, GATE_FOOT, GATE_RISE, GATE_TOP, HEADLIGHTS, HER_BED, HER_BUS, HER_CARS, HER_DECK, HER_RACK,
  HESITATE, HORN, JOINTS, LATCH, LIGHTS_UP, LURCH, POP_F, POP_R, PULL, RACK, RELEASE, REVS, SEAT, SLAM, SQUAT, STOP, WINDOWS, driveAt, speedAt,
} from './freeway-clock'
import {
  BED_H, BUICK_LEN, BUS_LEN, CAR_LEN, CONV_LEN, N_CARS, PICKUP_LEN, TIP_X, X_B, X_K, X_P, X_V, bodyPt, carX, drawBackdrop, drawDeck, poseAt, pulseAt, type Pose,
} from './freeway-road'
import {
  BUS_ROOF, CAR_LAND_U, CAR_ROOF, PANEL_T, RACK_V, SEAT_U, SEAT_V, TOP_FOLDED, TOP_RAISED, drawBuick, drawBuickOver, drawBus, drawCar, drawConvertible, drawPickup,
  drawPickupOver, onGate, panelAt, type BuickState, type BusState, type CarState, type ConvertibleState, type PickupState,
} from './freeway-cars'

/**
 * The freeway (75.72 → 103.84, the swing, beats 161 → 221): the film's
 * opening on a stage. Out of the club's door onto a painted on-ramp curving
 * up into a magic-hour sky, and a jam of cars on it that dances: every
 * strike on the swing.
 *
 * The light comes up on the flat on the first downbeat. A landscaper's
 * pickup at the ramp's foot drops its ramp gate on the brass pickup; he rolls
 * up it into the bed, the driver leans on the horn, the gate slams up behind
 * him and flings her in after. The truck crouches on its hydraulics and pops:
 * he is thrown up onto the ladder rack, she after him; off the rack's end on
 * the front's pop, onto the roof of a bus on the biggest hit of the stretch.
 * Along the bus's roof, its windows lighting one by one on the riff's
 * eighths; off its front onto a chorus line of eight little cars, a landing a
 * beat, each kicking its hood up as it is landed on, she a beat behind him.
 * Onto the folded top of a convertible; on the bar the top releases and
 * rises on its arms, and latches at the header with a bang that throws the
 * two of them into the seats of Seb's red Buick, waiting at the top. Two
 * turns of the starter, the catch, the lights, the lurch, and it pulls away
 * along the freeway, bumping over the deck's joints; on the loudest beat it
 * stops dead at the deck's end and they are thrown out of it forward, level,
 * at the freeway's pace: the studio's gate is ahead.
 *
 * The frame: the door is the entry, at street level (y = 0); the road climbs
 * RAMP_H to the top and runs level to the deck's end. Mia is company: the
 * stage draws her from `her(T)`. The clock is `freeway-clock.ts`, the ground
 * `freeway-road.ts`, the cars `freeway-cars.ts`.
 */

const P = SWING_PERIOD
const G = G_EARTH

/* ------------------------------------------------------------------ small motions */

/** A crisp hit, then a damped spring back: 1 at the hit, ringing down. 0 before. */
const spring = (since: number, tau = 0.3, w = 7): number => (since < 0 ? 0 : smooth(since, 0, 0.035) * Math.exp(-since / tau) * Math.cos(w * since))
/** A bump: up and down over `T` seconds, 1 at its peak. */
const bump = (since: number, T: number): number => {
  if (since < 0 || since > T) return 0
  const w = since / T
  return 4 * w * (1 - w)
}
/** A flight from `a` to `b` in `T` seconds under gravity, `t` seconds in. */
function hopAt(a: Pt, b: Pt, T: number, t: number): Pt {
  const u = Math.max(0, Math.min(1, t / T))
  const lift = (G * T * T) / 8
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - lift * 4 * u * (1 - u)]
}
/** Between two points, `w` of the way. */
const mix = (a: Pt, b: Pt, w: number): Pt => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]
/** Distance covered `t` seconds into a run whose speed goes from `v0` to `v1` over `T`. */
const run = (t: number, T: number, v0: number, v1: number): number => v0 * t + ((v1 - v0) * t * t) / (2 * T)

/* ------------------------------------------------------------------ the pickup */

const U_CAB = 0.79
const GATE_FALL = 0.16

function pickupPose(T: number): Pose {
  let lr = 0
  let lf = 0
  lr -= 0.06 * spring(T - SLAM, 0.3, 8)
  lr -= 0.04 * spring(T - HER_BED, 0.3, 8)
  lf -= 0.03 * spring(T - BONK, 0.3, 8)
  // The crouch on the hydraulics, held; the rear pops on the beat, the front three beats on.
  const crouch = -0.12 * smooth(T, SQUAT, SQUAT + 0.1)
  lr += pop(T - POP_R, crouch)
  lf += pop(T - POP_F, crouch)
  lf -= 0.05 * spring(T - RACK, 0.3, 8)
  return poseAt(X_P, PICKUP_LEN, lr, lf)
}
/** A hydraulic pop: from the crouch `from` up to the peak in a few frames, then a slow damped settle. */
function pop(since: number, from: number): number {
  if (since < 0) return from
  if (since < 0.06) return from + (0.3 - from) * smooth(since, 0, 0.06)
  const s = since - 0.06
  return 0.3 * Math.exp(-s / 0.32) * Math.cos(5.5 * s)
}
/** The rack's flex under a landing. */
const rackFlex = (T: number): number => -0.06 * spring(T - RACK, 0.22, 13) - 0.03 * spring(T - HER_RACK, 0.22, 13)

/** The gate: closed until the drop; falls, bounces on the road; rises on the pull and slams shut. */
function gateAt(T: number): { gate: number; shiver: number } {
  let gate = 0
  // It falls for GATE_FALL seconds and hits the road on the beat.
  if (T >= GATE_DROP - GATE_FALL) {
    const s = T - (GATE_DROP - GATE_FALL)
    if (s < GATE_FALL) gate = (s / GATE_FALL) ** 2
    else gate = 1 - 0.035 * Math.exp(-(s - GATE_FALL) / 0.12) * Math.abs(Math.sin((s - GATE_FALL) * 30))
  }
  if (T >= GATE_RISE) {
    const u = Math.min(1, (T - GATE_RISE) / (SLAM - GATE_RISE))
    gate = (1 - u * u) * (1 - smooth(T, SLAM, SLAM + 0.001))
    if (T >= SLAM) gate = 0.02 * Math.exp(-(T - SLAM) / 0.1) * Math.abs(Math.sin((T - SLAM) * 40))
  }
  // A shiver as he hits the foot.
  const shiver = 0.025 * spring(T - GATE_FOOT, 0.15, 22)
  return { gate, shiver }
}

const gatePt = (T: number, s: number): Pt => {
  const { gate, shiver } = gateAt(T)
  const [u, v] = onGate(s, gate, shiver, R)
  return bodyPt(pickupPose(T), u, v)
}
const bedPt = (T: number, u: number): Pt => bodyPt(pickupPose(T), u, BED_H + R)
const rackPt = (T: number, u: number): Pt => bodyPt(pickupPose(T), u, RACK_V + R + rackFlex(T))

/* ------------------------------------------------------------------ the bus */

function busPose(T: number): Pose {
  const lr = -0.1 * spring(T - BUS, 0.4, 6) - 0.03 * spring(T - HER_BUS, 0.35, 7)
  const lf = -0.07 * spring(T - BUS, 0.4, 6)
  return poseAt(X_B, BUS_LEN, lr, lf)
}
const busPt = (T: number, u: number): Pt => bodyPt(busPose(T), u, BUS_ROOF + R)
const BUS_ON = 0.45
const BUS_OFF = BUS_LEN - 0.05

function busState(T: number): BusState {
  return {
    lit: WINDOWS.map((w) => smooth(T, w, w + 0.05) * (0.7 + 0.3 * knock(T - w, 0.35))),
    flash: smooth(T, BUS, BUS + 0.03) * knock(T - BUS, 0.35) * 0.85 + smooth(T, FLASH, FLASH + 0.03) * knock(T - FLASH, 0.3) * 0.7,
    tail: pulseAt(T),
  }
}

/* ------------------------------------------------------------------ the chorus line */

function carPose(i: number, T: number): Pose {
  const his = T - CARS[i]
  const hers = T - HER_CARS[i]
  const lr = -0.08 * spring(his, 0.25, 9) - 0.05 * spring(hers, 0.25, 9)
  const lf = -0.04 * spring(his, 0.25, 9) - 0.02 * spring(hers, 0.25, 9)
  return poseAt(carX(i), CAR_LEN, lr, lf)
}
const carPt = (i: number, T: number): Pt => bodyPt(carPose(i, T), CAR_LAND_U, CAR_ROOF + R)
const kick = (since: number): number => (since < 0 ? 0 : smooth(since, 0, 0.07) * Math.exp(-Math.max(0, since - 0.07) / 0.42))
const carState = (i: number, T: number): CarState => ({ hood: Math.min(1, kick(T - CARS[i]) + kick(T - HER_CARS[i])), tail: pulseAt(T) })

/* ------------------------------------------------------------------ the convertible */

function topAt(T: number): number {
  if (T < RELEASE) return TOP_FOLDED
  if (T < LATCH) {
    const u = (T - RELEASE) / (LATCH - RELEASE)
    return TOP_FOLDED + (TOP_RAISED - TOP_FOLDED) * Math.pow(u, 1.6)
  }
  return TOP_RAISED + 0.03 * spring(T - LATCH, 0.14, 16)
}
function convPose(T: number): Pose {
  const lr = -0.08 * spring(T - DECK, 0.3, 8) - 0.04 * spring(T - HER_DECK, 0.3, 8) + 0.02 * spring(T - RELEASE, 0.2, 10)
  const lf = -0.04 * spring(T - LATCH, 0.3, 8)
  return poseAt(X_V, CONV_LEN, lr, lf)
}
/** A ball on the top's panel, `s` along it from its rear edge. */
function panelPt(T: number, s: number): Pt {
  const a = panelAt(topAt(T))
  return bodyPt(convPose(T), a[0] + s, a[1] + PANEL_T + R)
}
const convState = (T: number): ConvertibleState => ({ th: topAt(T), tail: pulseAt(T) })

/* ------------------------------------------------------------------ the Buick */

function buickPose(T: number): Pose {
  let lr = 0
  let lf = 0
  for (const c of CRANKS) {
    const s = T - c
    if (s > 0 && s < 0.5) {
      const sh = 0.012 * Math.exp(-s / 0.14) * Math.sin(s * 70)
      lr += sh
      lf += sh
    }
  }
  lr += 0.03 * spring(T - CATCH, 0.3, 8)
  if (T > CATCH && T < STOP + 0.5) {
    const rev = REVS.reduce((a, r) => a + knock(T - r, 0.35), 0)
    const tremble = (0.003 + 0.005 * rev) * Math.sin(T * 90)
    lr += tremble
    lf += tremble
  }
  for (const r of REVS) lr -= 0.02 * spring(T - r, 0.3, 8)
  // The lurch: it pitches back; pulling away it squats on the rear; every joint lifts the nose, then the tail.
  lr -= 0.04 * spring(T - LURCH, 0.3, 7)
  lf += 0.03 * spring(T - LURCH, 0.3, 7)
  lr -= 0.05 * smooth(T, PULL, PULL + 0.3) * (1 - smooth(T, PULL + 0.5, PULL + 1.6))
  for (const j of JOINTS) {
    lf += 0.07 * bump(T - j, 0.16)
    lr += 0.07 * bump(T - j - 0.12, 0.16)
  }
  // The stop: the nose dives and the tail lifts, and it settles.
  const st = T - STOP
  if (st > 0) {
    const dive = smooth(st, 0, 0.1) * Math.exp(-Math.max(0, st - 0.1) / 0.4) * Math.cos(4.5 * Math.max(0, st - 0.1))
    lf -= 0.16 * dive
    lr += 0.06 * dive
  }
  const q = poseAt(X_K + driveAt(T), BUICK_LEN, lr, lf)
  q.th = 0
  return q
}
/** In the seat: on the bench, thrown up by every joint and down on the eighth. */
function seatPt(T: number, u: number): Pt {
  const [x, y] = bodyPt(buickPose(T), u, SEAT_V + R)
  let up = 0
  for (const j of JOINTS) up += 0.13 * bump(T - j, P / 2)
  return [x, y - up]
}
function buickState(T: number): BuickState {
  return {
    turn: driveAt(T) / 0.3,
    lamp: smooth(T, HEADLIGHTS, HEADLIGHTS + 0.1) * (1 + 0.4 * knock(T - HEADLIGHTS, 0.25)),
    brake: smooth(T, BRAKE, BRAKE + 0.05),
    tail: pulseAt(T),
    puffs: [...CRANKS, CATCH, ...REVS, PULL].map((t) => T - t),
  }
}

/* ------------------------------------------------------------------ his path */

const STREET_V = 1.5
/** The roll-off from the bus's front onto the first car is a drop; the drop sets when he leaves. */
const OFF_BUS = (() => {
  const edge = busPt(BUS, BUS_OFF)
  const land = carPt(0, CARS[0])
  return CARS[0] - dropTime(land[1] - edge[1])
})()
const DECK_S = 0.3
const DECK_REST = 0.5
const HER_DECK_S = 0
const HER_DECK_REST = 0.18
/** How far along the panel each sits when the latch throws them. */
const THROW_S = DECK_REST
const HER_THROW_S = HER_DECK_REST

const street = (T: number, back = 0): Pt => [-0.5 - back + STREET_V * (T - LIGHTS_UP), 0]
/** How long the roll blends from the road onto the gate's foot, and from the gate's top onto the bed: no kink at either. */
const ONTO = 0.09

function him(T: number): Pt {
  if (T < GATE_FOOT) return street(T)
  if (T < GATE_TOP) {
    const on = gatePt(T, (T - GATE_FOOT) / (GATE_TOP - GATE_FOOT))
    if (T < GATE_FOOT + ONTO) return mix(street(T), on, smooth(T, GATE_FOOT, GATE_FOOT + ONTO))
    if (T > GATE_TOP - ONTO) return mix(on, bedPt(T, 0), smooth(T, GATE_TOP - ONTO, GATE_TOP))
    return on
  }
  if (T < BONK) {
    const TT = BONK - GATE_TOP
    const v1 = (2 * U_CAB) / TT - STREET_V
    return bedPt(T, run(T - GATE_TOP, TT, STREET_V, v1))
  }
  if (T < POP_R) return bedPt(T, U_CAB - 0.03 * spring(T - BONK, 0.2, 12))
  if (T < RACK) return hopAt(bedPt(POP_R, U_CAB), rackPt(RACK, U_CAB + 0.12), RACK - POP_R, T - POP_R)
  if (T < POP_F) {
    const TT = POP_F - RACK
    const u0 = U_CAB + 0.12
    const u1 = 2.45
    const vm = (u1 - u0) / TT
    return rackPt(T, u0 + run(T - RACK, TT, vm * 1.25, vm * 0.75))
  }
  if (T < BUS) return hopAt(rackPt(POP_F, 2.45), busPt(BUS, BUS_ON), BUS - POP_F, T - POP_F)
  if (T < OFF_BUS) return busPt(T, BUS_ON + ((BUS_OFF - BUS_ON) * (T - BUS)) / (OFF_BUS - BUS))
  if (T < CARS[0]) return hopAt(busPt(OFF_BUS, BUS_OFF), carPt(0, CARS[0]), CARS[0] - OFF_BUS, T - OFF_BUS)
  if (T < DECK) {
    let i = 0
    while (i + 1 < N_CARS && CARS[i + 1] <= T) i++
    const to = i + 1 < N_CARS ? carPt(i + 1, CARS[i + 1]) : panelPt(DECK, DECK_S)
    return hopAt(carPt(i, CARS[i]), to, P, T - CARS[i])
  }
  if (T < LATCH) return panelPt(T, DECK_S + (DECK_REST - DECK_S) * smooth(T, DECK, DECK + 0.45))
  if (T < SEAT) return hopAt(panelPt(LATCH, THROW_S), seatPt(SEAT, SEAT_U), SEAT - LATCH, T - LATCH)
  return seatPt(T, SEAT_U)
}

/* ------------------------------------------------------------------ her path */

const HER_V = 0.9
/** She slows before the gate's foot over this long, reaches it a step behind him, and climbs it slowly: it takes her up when it rises. */
const HER_SLOW = 0.45
const HER_SLOW_AT = LIGHTS_UP + (TIP_X + 0.82 - ((STREET_V + HER_V) / 2) * HER_SLOW) / STREET_V
const HER_FOOT = HER_SLOW_AT + HER_SLOW
const herStreet = (T: number): Pt => (T < HER_SLOW_AT ? street(T, 0.32) : [street(HER_SLOW_AT, 0.32)[0] + run(T - HER_SLOW_AT, HER_SLOW, STREET_V, HER_V), 0])
const FLING = GATE_RISE + (SLAM - GATE_RISE) * 0.45
const HER_LAG_ON = HESITATE
/** Her lag on the bus's roof: she stops at a window as it lights, and catches up. */
const lag = (T: number): number => 0.25 * (smooth(T, HER_LAG_ON, HER_LAG_ON + 0.4) - smooth(T, HER_LAG_ON + 0.5, HER_LAG_ON + 1.3))
const HER_OFF_BUS = OFF_BUS + P

const herS = (T: number): number => Math.min(0.92, (HER_V * (T - HER_FOOT)) / 0.85)

function her(T: number): Pt {
  if (T < HER_FOOT) return herStreet(T)
  if (T < FLING) {
    const on = gatePt(T, herS(T))
    return T < HER_FOOT + ONTO ? mix([herStreet(HER_FOOT)[0] + HER_V * (T - HER_FOOT), 0], on, smooth(T, HER_FOOT, HER_FOOT + ONTO)) : on
  }
  if (T < HER_BED) return hopAt(gatePt(FLING, herS(FLING)), bedPt(HER_BED, 0.3), HER_BED - FLING, T - FLING)
  if (T < POP_R) return bedPt(T, 0.3 + 0.2 * smooth(T, HER_BED, HER_BED + 0.5))
  if (T < HER_RACK) return hopAt(bedPt(POP_R, 0.5), rackPt(HER_RACK, 0.62), HER_RACK - POP_R, T - POP_R)
  if (T < POP_F) {
    const TT = POP_F - HER_RACK
    const vm = (1.9 - 0.62) / TT
    return rackPt(T, 0.62 + run(T - HER_RACK, TT, vm * 0.7, vm * 1.3))
  }
  if (T < HER_BUS) return hopAt(rackPt(POP_F, 1.9), busPt(HER_BUS, 0.1), HER_BUS - POP_F, T - POP_F)
  if (T < HER_OFF_BUS) {
    const rate = (BUS_OFF - 0.1) / (HER_OFF_BUS - HER_BUS)
    return busPt(T, 0.1 + rate * (T - HER_BUS) - lag(T))
  }
  if (T < HER_CARS[0]) return hopAt(busPt(HER_OFF_BUS, BUS_OFF), carPt(0, HER_CARS[0]), HER_CARS[0] - HER_OFF_BUS, T - HER_OFF_BUS)
  if (T < HER_DECK) {
    let i = 0
    while (i + 1 < N_CARS && HER_CARS[i + 1] <= T) i++
    const to = i + 1 < N_CARS ? carPt(i + 1, HER_CARS[i + 1]) : panelPt(HER_DECK, HER_DECK_S)
    return hopAt(carPt(i, HER_CARS[i]), to, P, T - HER_CARS[i])
  }
  if (T < LATCH) return panelPt(T, HER_DECK_S + (HER_DECK_REST - HER_DECK_S) * smooth(T, HER_DECK, HER_DECK + 0.45))
  if (T < SEAT) return hopAt(panelPt(LATCH, HER_THROW_S), seatPt(SEAT, SEAT_U - 0.32), SEAT - LATCH, T - LATCH)
  return seatPt(T, SEAT_U - 0.32)
}

/* ------------------------------------------------------------------ the strikes */

/** The joints throw them up; they come down on the eighth. */
const LANDINGS = JOINTS.map((j) => j + P / 2)
export const FREEWAY_HITS: number[] = [
  ...new Set(
    [
      ...BEATS, HORN, GATE_DROP, GATE_FOOT, SLAM, HER_BED, BONK, SQUAT, POP_R, RACK, HER_RACK, POP_F, BUS, HER_BUS, ...WINDOWS, FLASH, ...CARS, ...HER_CARS, DECK,
      HER_DECK, RELEASE, LATCH, SEAT, ...CRANKS, CATCH, ...REVS, HEADLIGHTS, LURCH, PULL, ...JOINTS, ...LANDINGS, BRAKE, STOP,
    ].map((t) => Math.round(t * 1e4) / 1e4),
  ),
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the part */

interface FreewayState {
  begin: number
}

function drawFreeway(p: p5, s: FreewayState, c: Ctx): void {
  const T = c.t + s.begin
  if (T < LIGHTS_UP) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  const seen = (x0: number, x1: number): boolean => x1 > f.x0 - 1.5 && x0 < f.x1 + 1.5
  p.push()
  ctx.globalAlpha = smooth(T, LIGHTS_UP, LIGHTS_UP + 0.28)
  drawBackdrop(p, c, T)
  drawDeck(p, c)
  if (seen(X_P - 1, X_P + PICKUP_LEN + 1)) {
    const { gate, shiver } = gateAt(T)
    const st: PickupState = { gate, shiver, horn: T - HORN, flex: rackFlex(T), tail: pulseAt(T) }
    drawPickup(p, c, pickupPose(T), st)
  }
  if (seen(X_B, X_B + BUS_LEN)) drawBus(p, c, busPose(T), busState(T))
  for (let i = 0; i < N_CARS; i++) if (seen(carX(i), carX(i) + CAR_LEN)) drawCar(p, c, carPose(i, T), carState(i, T))
  if (seen(X_V, X_V + CONV_LEN)) drawConvertible(p, c, convPose(T), convState(T))
  const bx = X_K + driveAt(T)
  if (seen(bx - 0.5, bx + BUICK_LEN + 3.5)) drawBuick(p, c, buickPose(T), buickState(T))
  p.pop()
  void speedAt
}

function drawFreewayOver(p: p5, s: FreewayState, c: Ctx): void {
  const T = c.t + s.begin
  if (T < LIGHTS_UP) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  p.push()
  ctx.globalAlpha = smooth(T, LIGHTS_UP, LIGHTS_UP + 0.28)
  if (X_P + PICKUP_LEN > f.x0 - 1.5 && X_P < f.x1 + 1.5) drawPickupOver(p, c, pickupPose(T))
  const bx = X_K + driveAt(T)
  if (bx + BUICK_LEN > f.x0 - 1.5 && bx < f.x1 + 1.5) drawBuickOver(p, c, buickPose(T))
  p.pop()
}

export const freeway = part<FreewayState>(
  {
    name: 'freeway',
    flight: true,
    draw: (p, s, c) => drawFreeway(p, s, c),
    over: (p, s, c) => drawFreewayOver(p, s, c),
  },
  (slot: Slot) => {
    const span = slot.end - slot.begin
    const segs = carried((t) => him(t + slot.begin), 0, span, Math.ceil(span / 0.02))
    const end = him(slot.end)
    const mia = (T: number): Companion => {
      const [x, y] = her(T)
      return { x, y }
    }
    return {
      cells: box(-1, -13.5, X_K + BUICK_LEN + driveAt(STOP) + 3, 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: GATE_DROP - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: mia }],
    }
  },
  (slot: Slot): PartShot[] => [
    // Out of the door as the kiss framed it; a wide of the ramp's foot and the jam; then up the ramp with them, a little ahead.
    { t: slot.begin, cells: 5, off: [0.8, -0.3] },
    { t: LIGHTS_UP + 0.9, cells: 6.8, hold: [4.4, -2.3], w: 0.55 },
    { t: GATE_TOP, cells: 5.6, off: [1.0, -0.8] },
    { t: BUS, cells: 6.2, off: [1.5, -0.6] },
    { t: CARS[0], cells: 6.2, off: [1.4, -0.5] },
    { t: DECK, cells: 5.8, off: [1.3, -0.4] },
    { t: SEAT, cells: 5.6, off: [1.0, -0.3] },
    { t: PULL, cells: 6.2, off: [1.5, -0.2] },
    { t: JOINTS[0], cells: 7.2, off: [1.9, 0.2] },
    { t: slot.end, cells: 6, off: [1.0, -0.6] },
  ],
)
