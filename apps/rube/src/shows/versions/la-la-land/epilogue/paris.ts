import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad } from '../../../../../../../src/core/ease'
import { FLOOR, laneAt, mixHex, type Lane, type Pt } from '../../../../parts'
import { alpha, box, carried, hash, knock, lastOf, part, route, smooth, type Companion, type Ctx, type PartShot, type Way } from './kit'
import { beatsOf, CADENCE, waltz, WALTZ_ORIGIN, WALTZ_PERIOD } from './music'
import { G_EARTH, hop } from './physics'
import { batten, flat, glow } from './rig'
import { DREAM, PAINT } from './worlds'

/**
 * Paris, on the club's stage.
 *
 * The transition (132.42 → 143.44, the swing gone soft). They roll out of the
 * stage door into the dark, onto a scissor lift standing in a pit in the
 * floor, and stop. On six of the soft swing's strong beats the lift jacks
 * them up a notch; on all eight the batten above lets the Paris flat down a
 * notch: a teal night with the tower in silhouette, the river and a bridge at
 * its foot. The lift and the flat close on each other. At its top the
 * platform tips toward the carousel and the two roll off it, he first and she
 * a step behind, along the back of a painted horse to its saddle. On the
 * eighth notch (143.44, the waltz's first bar) the flat lands on the quay with
 * a thump and the carousel's lamps come up.
 *
 * The musette (bars 153 → 177). The carousel turns, one turn to a phrase of
 * eight bars, seen a little from above so the far horses ride high behind the
 * near ones. Every bar is an oom-pah-pah: the horses sit through the one,
 * rise on the two, fall through the three and land on the next one with a
 * thump; at the hub a crank turns once a bar and works an accordion whose
 * bellows open in two pulls and clap shut on the one; the tower's lamps
 * sparkle on every downbeat. Under the bridge the river is three painted
 * rollers turning on their own clock. Mia rides the same horse, on its rump
 * a step behind him, all the way round.
 *
 * The cadence (166.30 → 167.65). The carousel brakes: on each of the first
 * four hits the whole machine surges up a notch, and it comes to rest with
 * their horse at the front centre; on the fourth (167.26) the horse's pole
 * fires and throws the two straight up off it, and on the fifth (167.65) the
 * carousel drops back onto the quay with a thump as they hang at the apex,
 * 3.5 cells over the deck, at rest, she a ball's width to his left. The stars
 * take them from there.
 *
 * Frame: the ball comes in at (-0.5, 0) rolling right on the stage floor
 * (FLOOR under it). The quay is 2.6 cells up; the apex is the exit.
 */

/* ------------------------------------------------------------------ the clock */

/**
 * The soft swing's strong beats, as measured: the flat comes down a notch on
 * each. (Here the swing's grid runs ~45 ms ahead of the attacks, and the check
 * holds this part to the attacks, so the notches are the attacks.)
 */
const NOTCHES = [136.452, 136.916, 138.797, 140.666, 141.375, 142.06, 142.536, 143.441]
/** The lift has six of them to its top; the flat takes all eight to the quay. */
const LIFT_NOTCHES = NOTCHES.slice(0, 6)
/** The flat lands; the lamps come up; bar 153. */
const LANDED = NOTCHES[7]
/** The carousel starts to turn on the second bar, with both of them seated. */
const TURN_ON = waltz(154)
/** The horses' last landing: from here the ritardando, and the cadence. */
const FROZEN = waltz(177)
const DOWNBEATS = beatsOf(waltz, 154, 177)
const BRAKE = CADENCE[0]
const THROW = CADENCE[3]
const APEX = CADENCE[4]
/** Every downbeat something lands on: the flat's, the horses', the cadence's. */
const ONES = [LANDED, ...DOWNBEATS, ...CADENCE]

export const PARIS_HITS: number[] = [...NOTCHES, ...DOWNBEATS, ...CADENCE]

/* ------------------------------------------------------------------ the set */

/** The speed the studio hands them over at. */
const IN_V = 1.5
/** The lift: its platform's centre and width, the pit it stands in, and how far the platform tips at the top. */
const LIFT_X = 3.6
const LIFT_W = 1.6
const PIT = 1.15
const TILT = 0.36
/** Where he rests on the platform (she is a ball's width and a bit behind him). */
const HX = LIFT_X + 0.25
/** The carousel: its axis, the ring the horses ride on, and how much of the ring's depth shows as height. */
const CX = 4.0
const RC = 2.1
const SQ = 0.32
/** A ball on the quay: its centre. */
const QUAY = -2.6
const QUAY_TOP = QUAY + FLOOR
/** The rostrum the whole set stands on: the quay, and the river's trough at its right. */
const ROST: [number, number] = [0.9, 10.8]
const DECK_R = RC + 0.4
/** The deck's ellipse, its front edge on the quay. */
const DECK_Y = QUAY_TOP - SQ * DECK_R
/** A rider's centre over the deck point under the horse. */
const SADDLE = 0.95
const HUB_W = 1.2
const HUB_H = 1.25
const RCAN = RC + 0.55
const CANOPY_Y = DECK_Y - 3.0
const CONE = 1.4
const H_RISE = 0.4
const SURGE = 0.35
/** Her place on the horse: a step behind him along the ring, a ball's width and a bit. */
const DTH = Math.asin(0.32 / RC)
/** The flat, and what is painted on it. */
const FX = 0.2
const FW = 10.8
const FH = 6.5
const FLAT_NOTCH = 0.55
const TOWER_X = 8.9
const RIVER: [number, number] = [7.15, 10.65]
const HORSE_COLOURS = [PAINT.cream, PAINT.pink, PAINT.gold, PAINT.blue]

/* ------------------------------------------------------------------ motion */

/** A crisp step from 0 to 1 as `s` crosses zero: critically damped, no overshoot, done in a few `tau`. */
const step = (s: number, tau = 0.035): number => (s <= 0 ? 0 : 1 - Math.exp(-s / tau) * (1 + s / tau))
/** A stop's small ring after it: 0 before `s` = 0, a damped sine after. */
const ring = (s: number, a: number, w: number, tau: number): number => (s <= 0 ? 0 : a * Math.exp(-s / tau) * Math.sin(w * s))

/** The flat's bottom edge: eight notches down from above, each with a little give in the ropes; a thump on the quay. */
function flatBottom(t: number): number {
  let y = QUAY_TOP - FLAT_NOTCH * NOTCHES.length
  for (const at of NOTCHES) y += FLAT_NOTCH * step(t - at) + ring(t - at, 0.02, 34, 0.08)
  return y - ring(t - LANDED, 0.035, 28, 0.11)
}

/** The lift's platform, at its centre: a ball on it has its centre here. Six notches up out of the pit. */
function liftY(t: number): number {
  let y = 0
  for (const at of LIFT_NOTCHES) y += (L_TOP / LIFT_NOTCHES.length) * step(t - at) - ring(t - at, 0.018, 36, 0.08)
  return y
}
/** At its top the platform tips toward the carousel, and they roll. */
const tilt = (t: number): number => TILT * smooth(t, LIFT_NOTCHES[5] + 0.04, LIFT_NOTCHES[5] + 0.16)
/** A ball on the platform, `dx` from its centre. */
const onLift = (t: number, dx: number): Pt => [LIFT_X + dx, liftY(t) + dx * Math.tan(tilt(t))]

/** A turn in eight bars. */
const RATE = Math.PI / 4 / WALTZ_PERIOD
/** How far the carousel has turned: gathering over the first bar, steady, and braked to a stop on the fourth hit. */
function spun(t: number): number {
  if (t <= TURN_ON) return 0
  const ramp = WALTZ_PERIOD
  if (t < TURN_ON + ramp) {
    const u = (t - TURN_ON) / ramp
    return (RATE * ramp * u * u) / 2
  }
  let a = (RATE * ramp) / 2 + RATE * (Math.min(t, BRAKE) - TURN_ON - ramp)
  if (t > BRAKE) {
    const D = THROW - BRAKE
    const s = Math.min(t - BRAKE, D)
    a += RATE * (s - (s * s) / (2 * D))
  }
  return a
}
/** Where their horse waits: so that the brake stops it at the front centre. */
const THETA0 = (() => {
  const a = -spun(THROW) % (2 * Math.PI)
  return a <= -Math.PI ? a + 2 * Math.PI : a > Math.PI ? a - 2 * Math.PI : a
})()
const theta = (t: number): number => THETA0 + spun(t)

/** The horses on their poles: sit through the one, up on the two, down through the three, and land on the one. */
function rise(t: number): number {
  if (t < TURN_ON) return 0
  if (t >= FROZEN) return ring(t - FROZEN, 0.03, 40, 0.09)
  const bars = (t - WALTZ_ORIGIN) / WALTZ_PERIOD
  const phi = bars - Math.floor(bars)
  let h: number
  if (phi < 1 / 3) h = 0
  else if (phi < 0.62) h = H_RISE * easeInOutSine((phi - 1 / 3) / (0.62 - 1 / 3))
  else if (phi < 0.7) h = H_RISE
  else h = H_RISE * (1 - easeInQuad((phi - 0.7) / 0.3))
  // The landing's ring, after every one but the first (nothing has come down onto it yet).
  if (bars >= 155) h += ring(phi * WALTZ_PERIOD, 0.03, 40, 0.09)
  return h
}

/** The whole carousel on the cadence: four surges up, and the drop back onto the quay as they hang at the apex. */
function surge(t: number): number {
  let up = 0
  for (let i = 0; i < 4; i++) up += SURGE * step(t - CADENCE[i])
  const d0 = APEX - 0.2
  if (t > d0) up *= 1 - easeInQuad(clamp((t - d0) / 0.2))
  return up + ring(t - APEX, 0.06, 26, 0.14)
}

const T_FLIGHT = APEX - THROW
const V_LAUNCH = G_EARTH * T_FLIGHT
const T_STROKE = 0.2
const STROKE = 0.5 * V_LAUNCH * T_STROKE
/** Their horse's pole: the stroke that throws them, ending at the throw at the speed the flight needs; retracted with the drop. */
function stroke(t: number): number {
  const s = t - (THROW - T_STROKE)
  let d = s <= 0 ? 0 : s < T_STROKE ? STROKE * (s / T_STROKE) ** 2 : STROKE
  const d0 = APEX - 0.2
  if (t > d0) d *= 1 - easeInQuad(clamp((t - d0) / 0.2))
  return d
}

/** The deck point under a horse at `th` (no surge). */
const ringPt = (th: number): Pt => [CX + RC * Math.sin(th), DECK_Y + SQ * RC * Math.cos(th)]
/** A rider on the horse at `th` at show time `t`: on its saddle, up with the horse and with the whole machine. */
function seat(th: number, t: number, hero: boolean): Pt {
  const [x, y] = ringPt(th)
  return [x, y - SADDLE - rise(t) - surge(t) - (hero ? stroke(t) : 0)]
}

/** The platform's top, tipped, meets the back of the waiting horse at its edge. */
const SEAT0 = seat(THETA0, 0, true)
const EDGE: Pt = [LIFT_X + LIFT_W / 2, SEAT0[1]]
const L_TOP = SEAT0[1] - (LIFT_W / 2) * Math.tan(TILT)
const T_LEAVE = LIFT_NOTCHES[5] + 0.19
const T_LEAVE_H = T_LEAVE + 0.12
const V_OFF = 2.2
const V_OFF_H = 2.4

const LAUNCH = seat(0, THROW, true)
const APEX_Y = LAUNCH[1] - 0.5 * G_EARTH * T_FLIGHT * T_FLIGHT
/** The two thrown straight up, to hang at the apex. */
function flight(T: number): Pt {
  const s = clamp(T - THROW, 0, T_FLIGHT)
  return [CX, LAUNCH[1] - V_LAUNCH * s + 0.5 * G_EARTH * s * s]
}

/** The accordion's bellows: two pulls open on the two and the three, and the clap shut on the one. 0 shut, 1 open. */
function bellows(t: number): number {
  if (t < LANDED) return 0
  const bars = (t - WALTZ_ORIGIN) / WALTZ_PERIOD
  if (bars >= 177) return 0
  const phi = bars - Math.floor(bars)
  const s = phi * WALTZ_PERIOD
  const e = 0.5 * step(s - WALTZ_PERIOD / 3, 0.045) + 0.45 * step(s - (2 * WALTZ_PERIOD) / 3, 0.045)
  return e * (1 - easeInQuad(clamp((phi - 0.92) / 0.08)))
}
/** The crank at the hub: a turn a bar, from the first bar, stopped with the last landing. */
function crank(t: number): number {
  if (t < LANDED) return 0
  const bars = Math.min((t - WALTZ_ORIGIN) / WALTZ_PERIOD, 177) - 153
  return bars * Math.PI * 2
}

/** The lamps: up on the first bar, and down again as the stars take over. */
const lit = (t: number): number => smooth(t, LANDED - 0.02, LANDED + 0.12) * (1 - dark(t))
/** The set going dark after the throw, as the next set lights. */
const dark = (t: number): number => smooth(t, 168.4, 170.6)

/* ------------------------------------------------------------------ the part */

interface ParisState {
  begin: number
}

const dist = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1])

export const paris = part<ParisState>(
  {
    name: 'paris',
    flight: true,
    draw: (p, s, c) => drawParis(p, s, c),
    over: (p, s, c) => drawOver(p, s, c),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    // In from the stage door, and to rest on the platform.
    const T_IN1 = slot.begin + (HX - 1 + 0.5) / IN_V
    const T_REST = T_IN1 + 1 / (IN_V / 2)
    const rollIn: Way[] = [
      { at: 0, p: [-0.5, 0] },
      { at: at(T_IN1), p: [HX - 1, 0] },
      { at: at(T_REST), p: [HX, 0], ramp: [IN_V, 0] },
    ]
    const inLane: Lane = { segs: route(rollIn), fire: 0 }
    // Off the tipped platform, along the horse's back, to its saddle.
    const p0 = onLift(T_LEAVE, 0.25)
    const T_EDGE = T_LEAVE + dist(p0, EDGE) / (V_OFF / 2)
    const T_SEAT = T_EDGE + dist(EDGE, SEAT0) / (V_OFF / 2)
    const off: Way[] = [
      { at: at(T_LEAVE), p: p0 },
      { at: at(T_EDGE), p: EDGE, ramp: [0, V_OFF] },
      { at: at(T_SEAT), p: SEAT0, ramp: [V_OFF, 0] },
    ]
    // Her: a step behind him, onto the rump.
    const p0h = onLift(T_LEAVE_H, -0.07)
    const seatH = seat(THETA0 - DTH, 0, true)
    const T_EDGE_H = T_LEAVE_H + dist(p0h, EDGE) / (V_OFF_H / 2)
    const T_SEAT_H = T_EDGE_H + dist(EDGE, seatH) / (V_OFF_H / 2)
    const offH: Lane = {
      segs: route([
        { at: 0, p: p0h },
        { at: T_EDGE_H - T_LEAVE_H, p: EDGE, ramp: [0, V_OFF_H] },
        { at: T_SEAT_H - T_LEAVE_H, p: seatH, ramp: [V_OFF_H, 0] },
      ]),
      fire: 0,
    }
    const rideSeb = (t: number): Pt => seat(theta(t + slot.begin), t + slot.begin, true)
    const launch: Way = { at: at(THROW), p: LAUNCH }
    const segs = [
      ...route(rollIn),
      ...carried((t) => onLift(t + slot.begin, 0.25), at(T_REST), at(T_LEAVE), Math.ceil((T_LEAVE - T_REST) * 30)),
      ...route(off),
      ...carried(rideSeb, at(T_SEAT), at(THROW), Math.ceil((THROW - T_SEAT) * 40)),
      ...route([launch, hop(launch, [CX, APEX_Y], at(APEX), G_EARTH)]),
    ]
    const DY0 = seat(-DTH, THROW, true)[1] - LAUNCH[1]
    const mia = (T: number): Pt => {
      if (T < T_REST) {
        const q = laneAt(inLane, T - slot.begin)
        return [q.x - 0.32, q.y]
      }
      if (T < T_LEAVE_H) return onLift(T, -0.07)
      if (T < T_SEAT_H) {
        const q = laneAt(offH, T - T_LEAVE_H)
        return [q.x, q.y]
      }
      if (T < THROW) return seat(theta(T) - DTH, T, true)
      const [x, y] = flight(T)
      return [x - 0.32, y + DY0 * (1 - clamp((T - THROW) / T_FLIGHT))]
    }
    return {
      cells: box(-1, -12, 11.5, 2),
      exit: [CX + 0.5, APEX_Y],
      lane: { segs, fire: at(NOTCHES[0]) },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: (T): Companion => { const [x, y] = mia(T); return { x, y } } }],
    }
  },
  (slot): PartShot[] => [
    // As the studio leaves it: following, six cells.
    { t: slot.begin, cells: 6 },
    // At rest on the lift: hold on the dark above them, where the flat will come in.
    { t: slot.begin + 3.5, cells: 6.2, hold: [4.4, -2.1], w: 0.7 },
    // Up with them to the quay.
    { t: LIFT_NOTCHES[5], cells: 6.3, hold: [4.5, -4.4], w: 0.75 },
    // The carousel, the tower and the river; the follow's share gives the orbit.
    { t: LANDED, cells: 6.4, hold: [4.7, -4.75], w: 0.6 },
    { t: BRAKE, cells: 6.2, hold: [4.4, -4.9], w: 0.55 },
    // The throw: up with them, fast.
    { t: THROW, cells: 5.8, hold: [4.2, -5.3], w: 0.35 },
    // The stars' first key, so the cut is one picture.
    { t: slot.end, cells: 6.8, hold: [CX + 1.3, APEX_Y + 1.4], w: 0.55 },
  ],
)

/* ------------------------------------------------------------------ drawing */

function drawParis(p: p5, s: ParisState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (v: number) => v * k
  const fb = flatBottom(t)

  // The flat, flown in from above: a teal night, deep at the foot.
  flat(p, c, FX, fb - FH, FW, FH, PAINT.sea, PAINT.deep)
  drawPainted(p, c, fb, t)
  batten(p, c, FX, FX + FW, fb - FH)

  // The rostrum: the quay, its face down to the stage floor.
  solid(p, ink, weight * 0.8, PAINT.deep)
  p.rect(X((ROST[0] + ROST[1]) / 2), X((QUAY_TOP + FLOOR) / 2), X(ROST[1] - ROST[0]), X(FLOOR - QUAY_TOP))
  outline(p, ink, weight)
  p.line(X(ROST[0]), X(QUAY_TOP), X(ROST[1]), X(QUAY_TOP))
  drawRiver(p, c, t)

  // The stage floor out of the door, the pit, and the lift.
  outline(p, ink, weight)
  p.line(X(-0.7), X(FLOOR), X(LIFT_X - LIFT_W / 2), X(FLOOR))
  p.line(X(LIFT_X + LIFT_W / 2), X(FLOOR), X(ROST[1] + 0.3), X(FLOOR))
  drawLift(p, c, t)

  drawCarousel(p, c, t)

  // The lights going down on the set after the throw.
  const d = dark(t)
  if (d > 0) {
    p.noStroke()
    p.fill(alpha(p, c.bg, 0.9 * d))
    p.rect(X(5.4), X(-5.5), X(13.4), X(16))
  }
}

/** The pole above the hub, over the ball: the far horse passes behind it. */
function drawOver(p: p5, s: ParisState, c: Ctx): void {
  const { k } = c
  const t = c.t + s.begin
  const up = surge(t)
  const paint = painter(t)
  p.stroke(paint(PAINT.gold))
  p.strokeWeight(0.07 * k)
  p.line(CX * k, (DECK_Y - up - HUB_H) * k, CX * k, (CANOPY_Y - up + SQ * RCAN) * k)
}

/** Colours in the dark are the stage's shadow; the lamps bring them up. */
const painter = (t: number) => {
  const l = 0.15 + 0.85 * lit(t)
  return (hex: string): string => mixHex(PAINT.deep, hex, l)
}

/* --------------------------------------------- the flat's painting */

function drawPainted(p: p5, c: Ctx, fb: number, t: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  p.push()
  // The river at the foot: a band of the sea's colour, and three painted ripples.
  p.noStroke()
  p.fill(alpha(p, PAINT.sea, 0.5))
  p.rect(X(FX + FW / 2), X(fb - 0.3), X(FW), X(0.6))
  p.stroke(alpha(p, PAINT.cream, 0.28))
  p.strokeWeight(weight * 0.6)
  for (let i = 0; i < 5; i++) {
    const x = FX + 0.8 + i * 2.3 + hash(i, 11) * 0.8
    const y = fb - 0.12 - hash(i, 12) * 0.36
    p.line(X(x), X(y), X(x + 0.5 + hash(i, 13) * 0.5), X(y))
  }
  // The tower, in silhouette on the night: two legs and the arch between them, two platforms, the spire.
  const tx = TOWER_X
  const yb = fb - 0.5
  const T = (dx: number, h: number): [number, number] => [X(tx + dx), X(yb - h)]
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(weight * 0.5)
  p.fill(DREAM.bg)
  for (const side of [-1, 1]) {
    p.beginShape()
    for (const [dx, h] of [[1.15, 0], [0.98, 0.35], [0.76, 0.85], [0.6, 1.25], [0.28, 1.25], [0.34, 0.95], [0.46, 0.5], [0.58, 0]] as const) p.vertex(...T(side * dx, h))
    p.endShape(p.CLOSE)
  }
  p.rect(...T(0, 1.4), X(1.3), X(0.28))
  p.beginShape()
  for (const [dx, h] of [[-0.5, 1.5], [-0.36, 2.35], [-0.28, 3.0], [-0.2, 3.7], [-0.11, 4.9], [-0.06, 5.7], [0, 6.1], [0.06, 5.7], [0.11, 4.9], [0.2, 3.7], [0.28, 3.0], [0.36, 2.35], [0.5, 1.5]] as const) p.vertex(...T(dx, h))
  p.endShape(p.CLOSE)
  p.rect(...T(0, 3.05), X(0.8), X(0.2))
  p.line(...T(0, 6.1), ...T(0, 6.5))
  // The bridge over the river: an arch, its deck, a parapet.
  const stone = alpha(p, PAINT.cream, 0.32)
  p.fill(stone)
  p.stroke(alpha(p, ink, 0.4))
  p.rect(X((RIVER[0] + RIVER[1]) / 2), X(fb - 1.08), X(RIVER[1] - RIVER[0] + 0.5), X(0.16))
  p.line(X(RIVER[0] - 0.25), X(fb - 1.22), X(RIVER[1] + 0.25), X(fb - 1.22))
  p.noStroke()
  p.fill(stone)
  const ax = (RIVER[0] + RIVER[1]) / 2
  p.beginShape()
  p.vertex(X(RIVER[0] - 0.1), X(fb - 1.0))
  p.vertex(X(RIVER[0] - 0.1), X(fb - 0.55))
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (Math.PI * i) / 16
    p.vertex(X(ax + Math.cos(a) * 1.45), X(fb - 0.55 + Math.sin(a) * 0.5 * -1))
  }
  p.vertex(X(RIVER[1] + 0.1), X(fb - 0.55))
  p.vertex(X(RIVER[1] + 0.1), X(fb - 1.0))
  p.endShape(p.CLOSE)
  // The tower's lamps: dark until the first bar, then a sparkle on every downbeat, a different few each time.
  const l = lit(t)
  if (l > 0) {
    const last = lastOf(ONES, t)
    const LAMPS: [number, number][] = [[-0.52, 1.36], [0, 1.36], [0.52, 1.36], [-0.32, 3.0], [0.32, 3.0], [-0.14, 4.3], [0.14, 4.3], [0, 5.55]]
    for (let j = 0; j < LAMPS.length; j++) {
      const [dx, h] = LAMPS[j]
      const on = last.i >= 0 && hash(last.i, j) < 0.55 ? knock(last.ago, 0.32) : 0
      const [x, y] = T(dx, h)
      if (on > 0.03) glow(p, c, x / k, y / k, 0.26 + 0.1 * on, 0.55 * on * l, PAINT.gold)
      p.noStroke()
      p.fill(alpha(p, PAINT.gold, l * (0.35 + 0.65 * on)))
      p.circle(x, y, X(0.06 + 0.03 * on))
    }
  }
  p.pop()
}

/* --------------------------------------------- the river's rollers */

/** Three painted rollers turning under the bridge: the wave machine. */
function drawRiver(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ROLLERS: [number, number, number][] = [
    [8.9, QUAY_TOP - 0.42, -1],
    [7.75, QUAY_TOP - 0.2, 1],
    [10.05, QUAY_TOP - 0.2, 1],
  ]
  for (const [rx, ry, dir] of ROLLERS) {
    const w = 1.25
    const h = 0.36
    p.push()
    ctx.save()
    ctx.beginPath()
    ctx.rect(X(rx - w / 2), X(ry - h / 2), X(w), X(h))
    ctx.clip()
    p.noStroke()
    p.fill(PAINT.sea)
    p.rect(X(rx), X(ry), X(w), X(h))
    p.fill(alpha(p, PAINT.blue, 0.85))
    const pitch = 0.34
    const run = (t * 0.42 * dir) % pitch
    for (let i = -2; i < 6; i++) {
      const x0 = rx - w / 2 + i * pitch + run
      p.quad(X(x0), X(ry + h / 2), X(x0 + 0.12), X(ry + h / 2), X(x0 + 0.12 + 0.2), X(ry - h / 2), X(x0 + 0.2), X(ry - h / 2))
    }
    ctx.restore()
    outline(p, ink, weight * 0.7)
    p.rect(X(rx), X(ry), X(w), X(h), X(0.05))
    p.pop()
  }
}

/* --------------------------------------------- the lift */

function drawLift(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const y = liftY(t)
  // The pit in the floor.
  solid(p, ink, weight * 0.8, PAINT.deep)
  p.rect(X(LIFT_X), X(FLOOR + PIT / 2), X(LIFT_W), X(PIT))
  // The scissor: three crossed pairs between the pit's floor and the platform's underside.
  const floor = FLOOR + PIT
  const under = y + FLOOR + 0.14
  const H = (floor - under) / 3
  const w = 0.55
  outline(p, ink, weight * 0.9)
  p.stroke(PAINT.timber)
  p.strokeWeight(weight * 1.3)
  for (let i = 0; i < 3; i++) {
    const y0 = floor - i * H
    const y1 = y0 - H
    p.line(X(LIFT_X - w), X(y0), X(LIFT_X + w), X(y1))
    p.line(X(LIFT_X + w), X(y0), X(LIFT_X - w), X(y1))
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(PAINT.gold)
  for (let i = 0; i <= 3; i++) {
    const yy = floor - i * H
    p.circle(X(LIFT_X), X(yy - (i === 0 ? 0 : i === 3 ? 0 : 0)), X(0.07))
    if (i > 0 && i < 3) p.circle(X(LIFT_X), X(yy - H / 2), X(0.07))
  }
  // The platform, tipped at the top.
  p.push()
  p.translate(X(LIFT_X), X(y + FLOOR + 0.07))
  p.rotate(tilt(t))
  solid(p, ink, weight, PAINT.timber)
  p.rect(0, 0, X(LIFT_W), X(0.14), X(0.02))
  outline(p, ink, weight * 0.5)
  p.line(X(-LIFT_W / 2 + 0.1), X(-0.07), X(LIFT_W / 2 - 0.1), X(-0.07))
  p.pop()
}

/* --------------------------------------------- the carousel */

/** A rim point of an ellipse about (cx, cy), radii (a, b), at parameter `psi` measured with y up. */
const rim = (cx: number, cy: number, a: number, b: number, psi: number): Pt => [cx + a * Math.cos(psi), cy - b * Math.sin(psi)]

function drawCarousel(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const paint = painter(t)
  const l = lit(t)
  const inkA = alpha(p, ink, 0.4 + 0.6 * l)
  const up = surge(t)
  const th = theta(t)
  const dy = DECK_Y - up
  const cy = CANOPY_Y - up

  // The deck: its skirt, then the boards, then the ring the horses ride.
  p.stroke(inkA)
  p.strokeWeight(weight * 0.8)
  p.fill(paint(PAINT.red))
  p.ellipse(X(CX), X(dy + 0.24), X(2 * DECK_R), X(2 * SQ * DECK_R))
  p.fill(paint(PAINT.timber))
  p.ellipse(X(CX), X(dy), X(2 * DECK_R), X(2 * SQ * DECK_R))
  p.noFill()
  p.stroke(alpha(p, ink, 0.25 * (0.4 + 0.6 * l)))
  p.strokeWeight(weight * 0.5)
  p.ellipse(X(CX), X(dy), X(2 * RC), X(2 * SQ * RC))

  // The horses, far to near; the hub between the far ones and the near ones.
  const horses = [0, 1, 2, 3].map((i) => {
    const a = th + (i * Math.PI) / 2
    return { i, a, z: Math.cos(a) }
  })
  horses.sort((u, v) => u.z - v.z)
  let hubDrawn = false
  for (const h of horses) {
    if (!hubDrawn && h.z >= 0) {
      drawHub(p, c, t, paint, inkA)
      hubDrawn = true
    }
    const [x, y] = ringPt(h.a)
    const feet = y - up - rise(t) - (h.i === 0 ? stroke(t) : 0)
    // The pole, from under the canopy to the deck.
    p.stroke(paint(PAINT.gold))
    p.strokeWeight(0.05 * k)
    p.line(X(x), X(cy + SQ * RC * Math.cos(h.a)), X(x), X(y - up))
    drawHorse(p, c, x, feet, Math.cos(h.a), paint(HORSE_COLOURS[h.i]), paint, inkA)
  }
  if (!hubDrawn) drawHub(p, c, t, paint, inkA)

  // The canopy: a cone of gores over the rim, a valance with its scallops and lamps along the front.
  const a = RCAN
  const b = SQ * RCAN
  const psiT = Math.asin(b / CONE)
  const n = 10
  const from = psiT
  const to = Math.PI - psiT - 2 * Math.PI
  p.stroke(inkA)
  p.strokeWeight(weight * 0.6)
  for (let i = 0; i < n; i++) {
    const p0 = from + ((to - from) * i) / n
    const p1 = from + ((to - from) * (i + 1)) / n
    p.fill(paint(i % 2 ? PAINT.cream : PAINT.red))
    p.beginShape()
    p.vertex(X(CX), X(cy - CONE))
    for (let j = 0; j <= 4; j++) {
      const [rx, ry] = rim(CX, cy, a, b, p0 + ((p1 - p0) * j) / 4)
      p.vertex(X(rx), X(ry))
    }
    p.endShape(p.CLOSE)
  }
  // The valance along the front half, and the scallops under it.
  p.noFill()
  p.stroke(paint(PAINT.gold))
  p.strokeWeight(0.13 * k)
  p.beginShape()
  for (let j = 0; j <= 40; j++) {
    const [rx, ry] = rim(CX, cy, a, b, -Math.PI + (Math.PI * j) / 40)
    p.vertex(X(rx), X(ry))
  }
  p.endShape()
  p.stroke(inkA)
  p.strokeWeight(weight * 0.5)
  p.fill(paint(PAINT.cream))
  for (let j = 0; j < 14; j++) {
    const [rx, ry] = rim(CX, cy, a, b, -Math.PI + (Math.PI * (j + 0.5)) / 14)
    p.arc(X(rx), X(ry + 0.06), X(0.24), X(0.22), 0, Math.PI, p.CHORD)
  }
  // The lamps along the front.
  for (let j = 0; j < 7; j++) {
    const [rx, ry] = rim(CX, cy, a, b, -Math.PI + (Math.PI * (j + 1)) / 8)
    if (l > 0.02) glow(p, c, rx, ry - 0.1, 0.42, 0.42 * l, PAINT.gold)
    p.stroke(inkA)
    p.strokeWeight(weight * 0.5)
    p.fill(l > 0.5 ? PAINT.beam : paint(PAINT.gold))
    p.circle(X(rx), X(ry - 0.1), X(0.11))
  }
  // The finial, and its pennant on the breeze.
  p.fill(paint(PAINT.gold))
  p.circle(X(CX), X(cy - CONE), X(0.14))
  p.fill(paint(PAINT.red))
  const fl = 0.12 * Math.sin(t * 5.2)
  p.triangle(X(CX), X(cy - CONE - 0.05), X(CX + 0.38), X(cy - CONE - 0.02 + fl), X(CX), X(cy - CONE + 0.16))
}

/** The hub: the band organ in the carousel's middle, its bellows and its crank on the front. */
function drawHub(p: p5, c: Ctx, t: number, paint: (h: string) => string, inkA: p5.Color): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const up = surge(t)
  const base = DECK_Y - up + 0.08
  const top = DECK_Y - up - HUB_H
  const mid = (base + top) / 2 + 0.08
  p.stroke(inkA)
  p.strokeWeight(weight * 0.8)
  p.fill(paint(PAINT.red))
  p.rect(X(CX), X((base + top) / 2), X(HUB_W), X(base - top), X(0.03))
  p.fill(paint(PAINT.gold))
  p.rect(X(CX), X(top + 0.09), X(HUB_W + 0.1), X(0.16))
  // The bellows: a fixed end at the left, the moving end drawn out to the right, pleated between.
  const e = bellows(t)
  const clap = knock(((t - WALTZ_ORIGIN) / WALTZ_PERIOD - Math.floor((t - WALTZ_ORIGIN) / WALTZ_PERIOD)) * WALTZ_PERIOD, 0.07) * (t >= LANDED && t < FROZEN + 0.3 ? 1 : 0)
  const bw = 0.34 + 0.4 * e
  const bh = 0.46 * (1 - 0.08 * clap)
  const bx0 = CX - 0.56
  p.strokeWeight(weight * 0.6)
  p.fill(paint(PAINT.cream))
  p.rect(X(bx0 + bw / 2), X(mid), X(bw), X(bh))
  p.noFill()
  const pleats = 6
  for (let i = 1; i < pleats; i++) {
    const x = bx0 + (bw * i) / pleats
    p.line(X(x), X(mid - bh / 2), X(x + 0.03 * (i % 2 ? 1 : -1)), X(mid + bh / 2))
  }
  p.fill(paint(PAINT.timber))
  p.rect(X(bx0 - 0.03), X(mid), X(0.08), X(bh + 0.08))
  p.rect(X(bx0 + bw + 0.03), X(mid), X(0.08), X(bh + 0.08))
  // The crank wheel, a turn a bar, its handle out.
  const cx = CX + 0.36
  const ang = crank(t)
  p.stroke(inkA)
  p.strokeWeight(weight * 0.7)
  p.fill(paint(PAINT.gold))
  p.circle(X(cx), X(mid), X(0.4))
  for (let i = 0; i < 4; i++) {
    const a = ang + (i * Math.PI) / 2
    p.line(X(cx), X(mid), X(cx + Math.cos(a) * 0.17), X(mid + Math.sin(a) * 0.17))
  }
  p.fill(paint(PAINT.red))
  p.circle(X(cx + Math.cos(ang) * 0.17), X(mid + Math.sin(ang) * 0.17), X(0.09))
}

/** A painted horse, its feet at (x, feet), seen side on and foreshortened by `sx` (negative faces the other way). */
function drawHorse(p: p5, c: Ctx, x: number, feet: number, sx: number, body: string, paint: (h: string) => string, inkA: p5.Color): void {
  const { k, weight } = c
  const X = (v: number) => v * k
  const s = Math.abs(sx) < 0.03 ? 0.03 * (sx < 0 ? -1 : 1) : sx
  p.push()
  p.translate(X(x), X(feet))
  p.scale(s, 1)
  p.stroke(inkA)
  p.strokeWeight(weight * 0.65)
  p.fill(body)
  // Legs, at a gallop; the tail; the body; the neck and head.
  const leg = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0
    const dy = y1 - y0
    const L = Math.hypot(dx, dy) || 1
    const nx = (-dy / L) * 0.045
    const ny = (dx / L) * 0.045
    p.quad(X(x0 + nx), X(y0 + ny), X(x1 + nx), X(y1 + ny), X(x1 - nx), X(y1 - ny), X(x0 - nx), X(y0 - ny))
  }
  leg(0.26, -0.42, 0.52, -0.06)
  leg(0.2, -0.42, 0.34, -0.02)
  leg(-0.26, -0.42, -0.5, -0.05)
  leg(-0.2, -0.42, -0.3, -0.02)
  p.beginShape()
  p.vertex(X(-0.42), X(-0.64))
  p.vertex(X(-0.72), X(-0.78))
  p.vertex(X(-0.66), X(-0.5))
  p.vertex(X(-0.44), X(-0.5))
  p.endShape(p.CLOSE)
  p.rect(0, X(-0.55), X(0.92), X(0.36), X(0.15))
  p.beginShape()
  p.vertex(X(0.26), X(-0.66))
  p.vertex(X(0.44), X(-0.7))
  p.vertex(X(0.64), X(-1.0))
  p.vertex(X(0.48), X(-1.06))
  p.endShape(p.CLOSE)
  p.push()
  p.translate(X(0.62), X(-1.02))
  p.rotate(0.45)
  p.ellipse(0, 0, X(0.34), X(0.19))
  p.pop()
  p.triangle(X(0.5), X(-1.1), X(0.56), X(-1.22), X(0.6), X(-1.08))
  // The mane, and the saddle he sits on.
  p.stroke(paint(PAINT.gold))
  p.strokeWeight(weight * 1.1)
  p.line(X(0.3), X(-0.72), X(0.5), X(-1.0))
  p.stroke(inkA)
  p.strokeWeight(weight * 0.6)
  p.fill(paint(PAINT.red))
  p.rect(0, X(-0.78), X(0.34), X(0.1), X(0.03))
  p.pop()
}
