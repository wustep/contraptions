import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutBack } from '../../../../../../../../src/core/ease'
import { FLOOR, mixHex, puff, type Pt } from '../../../../../parts'
import { alpha, carried, knock, lastOf, part, route, smooth, type Ctx, type PartShot } from '../kit'
import { cue } from '../music'
import { DUST } from '../worlds'
import { fromRim, RIM_R, SEAM, stationFrame } from './station'

/**
 * Up the spoke to the Ranger.
 *
 * The far-side house is the foot of the lift: the spoke comes down through
 * its roof, and the car waits on its floor. Murph has nudged the ball into it
 * (the ballpark's), and the gate drops behind it (159); the brake comes off
 * (160) and the car climbs toward the axis, its counterweight coming down the
 * other side of the shaft (on a pulley, so half as far) to pass it. Every beat
 * of the climb the car's roller trips a flag at a landing and the landing's
 * lamp lights and stays lit, so the lit lamps climb the spoke behind it; and
 * every beat the jolt tosses the ball. Low down it taps the floor and lands on
 * the eighth (161–163); halfway up it bounces a beat at a time (164–167); from
 * the step on 168 a hop takes two beats, and on 170 it leaves the floor and
 * does not come back. On 171 the sheave's brake bites; the car slows and the
 * ball does not.
 *
 * The car stops at the hub on 172, its needle on the landing's dial at the
 * stop, and the roof and the landing doors open. The ball sails on into the
 * docking bay, where the Ranger sits in its cradle, hood back. A grabber arm
 * springs out (173), closes on the ball (174), swings it over the ship (175)
 * and sets it in the seat (176). The hood runs forward and knocks home (177),
 * the arm whips back into its catch (178), the cockpit lights (179), and the
 * four clamps of the cradle let go one a beat, tail to nose (180–183), the
 * ship lifting a notch each time. The stage cuts to outside on the big step
 * (184), the ball in the cockpit and the fuel line still plugged in.
 *
 * Two frames: the spoke's (u across it in the ring's direction of travel, v
 * down it toward the ground, which is at v = 0, so the axis is at v = -20;
 * turned as the station's `standOnRim` turns), and the hub's (the screen's
 * own axes, the station's axis at 0, 0). The ship has its own inside the hub's.
 */

const TAU = Math.PI * 2
/** The spoke: the far side of the ring, up and to the left. */
const A = Math.PI * 1.18
const F = stationFrame(SEAM.ballparkOut)
const AX = F.axis
/** The spoke's frame to the part's cells. */
const SP = (u: number, v: number): Pt => fromRim(AX, A, u, v)
/** The hub's frame to the part's cells. */
const HB = (x: number, y: number): Pt => [AX[0] + x, AX[1] + y]
/** Toward the axis along the spoke, on screen. */
const IN: Pt = [-Math.cos(A), -Math.sin(A)]

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The ball at rest in the car, Murph's nudge done: the gate drops behind it. */
const GATE = cue(159)
/** The brake off: the car goes. */
const GO = cue(160)
const CRUISE = cue(161)
/** The beats of the climb: a landing a beat, its flag tripped and its lamp lit. */
const RIBS: number[] = []
for (let b = 161; b <= 171; b++) RIBS.push(cue(b))
/** The ball leaves the floor for good. */
const FLOAT = cue(170)
/** The sheave's brake bites. */
const BRAKE = cue(171)
/** The car stops at the hub; the roof and the landing doors open. */
const LAND = cue(172)
/** The arm springs out; closes on the ball; stops over the ship; lets go in the seat. */
const REACH = cue(173)
const CATCH = cue(174)
const SWUNG = cue(175)
const SEAT = cue(176)
const CANOPY = cue(177)
/** The arm whips home and latches. */
const STOW = cue(178)
/** The ship wakes: its cockpit lights, its wingtip lamp starts to blink. */
const WAKE = cue(179)
/** The cradle's clamps, tail to nose, one a beat. */
const CLAMPS = [180, 181, 182, 183].map(cue)

/**
 * The ball's hops in the car, each off a beat's jolt: [beat, beats in the air, height]. Low down, where the ring's
 * weight is nearly all there, a quick tap that lands on the eighth; halfway, a beat a hop; from the step on 168, two.
 */
const HOPS: [number, number, number][] = [
  [161, 0.5, 0.17],
  [162, 0.5, 0.19],
  [163, 0.5, 0.22],
  [164, 1, 0.42],
  [165, 1, 0.47],
  [166, 1, 0.52],
  [167, 1, 0.58],
  [168, 2, 0.78],
]

export const HUB_HITS: number[] = [
  GATE,
  GO,
  ...RIBS,
  ...HOPS.filter(([, d]) => d === 0.5).map(([b]) => cue(b + 0.5)),
  LAND,
  REACH,
  CATCH,
  SWUNG,
  SEAT,
  CANOPY,
  STOW,
  WAKE,
  ...CLAMPS,
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the lift (spoke frame) */

/**
 * The car, on the spoke's line. The ball rolls in off the organ's treadle from -u and stops in the middle of
 * its floor; the gate is on that side. Its floor is on the ground at the start.
 */
const CAR_L = -0.45
const CAR_R = 0.45
const POST = 0.06
/** Floor to ceiling, and to the top of the roof. */
const CAR_H = 1.2
const CAR_TOP = 1.3
/** The roof's hatch, over the ball: two flaps. */
const HATCH = 0.22
/** The hub's collar, from the axis. */
const RING_IN = 2.9
const RING_OUT = 3.3
/** How far the car's floor climbs: its roof stops against the collar. */
const S_TOP = RIM_R - RING_OUT - CAR_TOP
const DA = CRUISE - GO
const DB = LAND - BRAKE
const V = S_TOP / (DA / 2 + (BRAKE - CRUISE) + DB / 2)
/** The shaft's walls: the car's lane, and the counterweight's beside it on the +u side. */
const WALL_L = -0.58
const WALL_R = 1.1
/** The car's rope, off its roof, up over the sheave inside the collar. */
const ROPE_U = 0.33
const SHEAVE_R = 0.22
const SHEAVE_U = ROPE_U + SHEAVE_R
const SHEAVE_V = 2.45 - RIM_R
/** The counterweight hangs on a pulley in a bight of the rope, the rope's end made fast at the collar: it goes half as far as the car. */
const CW_ROPE = SHEAVE_U + SHEAVE_R
const CW_PULLEY = 0.1
const CW_U = CW_ROPE + CW_PULLEY
const CW_DEAD = CW_U + CW_PULLEY
const CW_W = 0.22
const CW_LEN = 0.9
/** The counterweight's pulley, with the car on the ground: just under the collar. */
const CW_R0 = RING_OUT + 0.22

/**
 * The far-side house over the spoke's foot (the ballpark's drawing, in this same frame), which leaves a well in
 * its attic floor and a cut in its roof for the lift: its roof, which the shaft comes down through.
 */
const RIDGE: Pt = [0.025, -3.8]
const EAVE_V = -1.5
const SPAN = 2.545
const ROOF_T = 0.13
const roofTop = (u: number): number => RIDGE[1] + (Math.abs(u - RIDGE[0]) / SPAN) * (EAVE_V - RIDGE[1])
const roofUnder = (u: number): number => roofTop(u) + ROOF_T

/** Where the ball is caught, from the axis. */
const CATCH_R = 1.95

/** How far the car's floor is up the spoke. */
function carS(T: number): number {
  if (T <= GO) return 0
  if (T < CRUISE) {
    const x = T - GO
    return (0.5 * V * x * x) / DA
  }
  const s1 = 0.5 * V * DA
  if (T < BRAKE) return s1 + V * (T - CRUISE)
  const s2 = s1 + V * (BRAKE - CRUISE)
  if (T < LAND) {
    const x = T - BRAKE
    return s2 + V * x - (0.5 * V * x * x) / DB
  }
  return S_TOP
}

/** The car's jolt as its roller takes each landing's flag, the lurch off, and the thump at the top. */
function carJolt(T: number): number {
  const { ago } = lastOf(RIBS, T)
  // Each is sharp at its moment and settles heavily: a lower ring that dies away over most of a beat.
  let j = ago < 0.8 && T < LAND ? -0.025 * Math.exp(-ago / 0.13) * Math.cos(ago * 15) : 0
  const lurch = T - GO
  if (lurch > 0 && lurch < 1) j += 0.03 * Math.exp(-lurch / 0.22) * Math.sin(lurch * 16)
  const stop = T - LAND
  if (stop > 0 && stop < 1.2) j += 0.04 * Math.exp(-stop / 0.26) * Math.sin(stop * 12)
  return j
}

/** Where the flags and lamps are: where the car's roof is on each beat of the climb. */
const RIB_V = RIBS.map((T) => -(carS(T) + CAR_TOP))

function hop(T: number): number {
  for (const [b, d, h] of HOPS) {
    const t0 = cue(b)
    const t1 = cue(b + d)
    if (T >= t0 && T < t1) {
      const x = (T - t0) / (t1 - t0)
      return 4 * h * x * (1 - x)
    }
  }
  return 0
}

const hermite1 = (p0: number, v0: number, p1: number, v1: number, x: number): number => {
  const x2 = x * x
  const x3 = x2 * x
  return (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * v0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * v1
}

/** What little weight is left up here, and the push the last jolt gives it off the floor. */
const G_TOP = 0.05
const PUSH = 0.1
/** The ball after it leaves the floor for good: free, so it keeps the car's speed when the car brakes under it. */
const freeQ = (T: number): number => {
  const tau = T - FLOAT
  return carS(FLOAT) + FLOOR + (V + PUSH) * tau - 0.5 * G_TOP * tau * tau
}

/** How far the ball's centre is up the spoke from the ground, until the arm has it. */
function ballQ(T: number): number {
  if (T < FLOAT) return carS(T) + FLOOR + hop(T)
  if (T < LAND) return freeQ(T)
  // Out through the roof and the doors, slowing into the bay's air, to where the claw takes it.
  const D = CATCH - LAND
  const v0 = V + PUSH - G_TOP * (LAND - FLOAT)
  return hermite1(freeQ(LAND), v0 * D, RIM_R - CATCH_R, 0.55 * D, clamp((T - LAND) / D))
}

/* ------------------------------------------------------------------ the bay (hub frame) */

/** The Ranger's cockpit, where the ball sits: the dock. */
const DOCK: Pt = [0.8, 0]
/**
 * How low the ship sits in its cradle while it is clamped. It springs up a notch at each release, sharp on the beat,
 * over a hair and settling, heavily; after the last it is at the dock exactly.
 */
const SINK = 0.12
const notch = (s: number): number => (s <= 0 ? 0 : 1 - Math.exp(-s / 0.12) * Math.cos(s * 8) * (1 - smooth(s, 0.6, 0.9)))
const rangerY = (T: number): number => {
  let up = 0
  for (const c of CLAMPS) up += notch(T - c)
  return SINK * (1 - up / CLAMPS.length)
}

const C_PT: Pt = [CATCH_R * Math.cos(A), CATCH_R * Math.sin(A)]
const OVER: Pt = [DOCK[0], -0.95]
const SWING_VIA: Pt = [-0.7, -1.75]
const bez = (a: Pt, b: Pt, c: Pt, u: number): Pt => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * b[0] + u * u * c[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * b[1] + u * u * c[1]]
const lerp2 = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

/** Where the arm holds the ball, from the catch to the seat. */
function carryAt(T: number): Pt {
  const seat: Pt = [DOCK[0], SINK]
  if (T <= CATCH + 0.06) return C_PT
  if (T < SWUNG) return bez(C_PT, SWING_VIA, OVER, easeInOutSine((T - CATCH - 0.06) / (SWUNG - CATCH - 0.06)))
  if (T < SWUNG + 0.2) return OVER
  if (T < SEAT) return lerp2(OVER, seat, easeInOutSine((T - SWUNG - 0.2) / (SEAT - SWUNG - 0.2)))
  return seat
}

/** The ball, in the part's cells, at show time `T`. */
function ballAt(T: number): Pt {
  if (T < CATCH) return SP(0, -ballQ(T))
  if (T < SEAT) {
    const [x, y] = carryAt(T)
    return HB(x, y)
  }
  return HB(DOCK[0], rangerY(T))
}

/* ------------------------------------------------------------------ the arm */

const ARM_BASE: Pt = [0.25, -2.86]
const L1 = 1.65
const L2 = 1.6
/** Folded: up against the collar, over the ship's back, out of the way; its elbow in a catch on the collar. */
const HOME: Pt = [0.35, -2.05]
/** After it lets go: straight up out of the cockpit, and forward over the nose, clear of the hood's run. */
const LIFT_UP: Pt = [DOCK[0], -0.6]
const LIFT: Pt = [-0.55, -0.78]
/** Where the claw is, from the seat to over the nose. */
function liftAt(T: number): Pt {
  const u = clamp((T - SEAT - 0.1) / 0.8)
  const seat = carryAt(SEAT)
  return bez(seat, [DOCK[0], LIFT_UP[1] - 0.25], LIFT, easeInOutSine(u))
}

interface Joints {
  sh: number
  fa: number
}

/** Shoulder and forearm angles that put the claw at `q`: the elbow on the far side from the ship. */
function reach(q: Pt): Joints {
  const dx = q[0] - ARM_BASE[0]
  const dy = q[1] - ARM_BASE[1]
  const d = Math.min(L1 + L2 - 1e-3, Math.hypot(dx, dy))
  const th = Math.atan2(dy, dx)
  const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
  const sh = th - al
  const ex = ARM_BASE[0] + L1 * Math.cos(sh)
  const ey = ARM_BASE[1] + L1 * Math.sin(sh)
  return { sh, fa: Math.atan2(q[1] - ey, q[0] - ex) }
}

const unwrap = (a: number, b: number): number => {
  let d = b - a
  while (d > Math.PI) d -= TAU
  while (d < -Math.PI) d += TAU
  return a + d
}
const mixJ = (a: Joints, b: Joints, u: number): Joints => ({ sh: a.sh + (unwrap(a.sh, b.sh) - a.sh) * u, fa: a.fa + (unwrap(a.fa, b.fa) - a.fa) * u })

/** The arm's pose at show time `T`, and how open its claw is (1 open, 0 shut on the ball). */
function armAt(T: number): { j: Joints; open: number } {
  const home = reach(HOME)
  const out = reach(C_PT)
  if (T < REACH) return { j: home, open: 0.35 }
  if (T < CATCH) {
    // It springs out and waits, open, for the ball drifting in.
    const u = easeOutBack(clamp((T - REACH) / 0.55))
    return { j: mixJ(home, out, u), open: 0.35 + 0.65 * smooth(T, REACH, REACH + 0.4) }
  }
  if (T < SEAT) return { j: reach(carryAt(T)), open: 1 - smooth(T, CATCH - 0.02, CATCH + 0.05) }
  // It lets go in the seat and lifts clear for the hood; on the beat after, it whips home and latches.
  const open = smooth(T, SEAT - 0.02, SEAT + 0.06) * (1 - 0.65 * smooth(T, STOW - 0.28, STOW))
  if (T < STOW - 0.28) return { j: reach(liftAt(T)), open }
  // Home on the beat, latching with its speed, and a slow, heavy sway in the catch after.
  const u = clamp((T - STOW + 0.28) / 0.28)
  const swing = T < STOW ? u * u * (1.6 - 0.6 * u) : 1 + 0.05 * Math.exp(-(T - STOW) / 0.3) * Math.sin((T - STOW) * 11)
  return { j: mixJ(reach(LIFT), home, swing), open }
}

/* ------------------------------------------------------------------ the part */

interface HubState {
  begin: number
}

export const hub = part<HubState>(
  {
    name: 'hub',
    flight: true,
    draw: (p, s, c) => drawHub(p, s, c),
    over: (p, s, c) => drawFront(p, s, c),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const ball = (t: number): Pt => ballAt(t + slot.begin)
    const start = SP(0, -FLOOR)
    const segs = [
      ...route([
        { at: 0, p: start },
        { at: at(GO), p: start },
      ]),
      ...carried(ball, at(GO), at(CATCH), Math.ceil((CATCH - GO) * 40)),
      ...carried(ball, at(CATCH), at(SEAT), 80),
      ...route([
        { at: at(SEAT), p: ball(at(SEAT)) },
        { at: at(CLAMPS[0]), p: ball(at(SEAT)) },
      ]),
      ...carried(ball, at(CLAMPS[0]), slot.end - slot.begin, 240),
    ]
    return {
      cells: CELLS,
      exit: F.exit(SEAM.dock),
      lane: { segs, fire: 0 },
      state: { begin: slot.begin },
    }
  },
  (slot): PartShot[] => {
    const lead = (d: number): Pt => [IN[0] * d, IN[1] * d]
    // Between the car and the hub, for the wide shot on the step.
    const mid = (T: number, f: number): Pt => {
      const q = SP(0, -(carS(T) + CAR_TOP / 2))
      const h = HB(0, 0)
      return [q[0] + (h[0] - q[0]) * f, q[1] + (h[1] - q[1]) * f]
    }
    const low: Pt = [mid(cue(166), 0)[0] - IN[0] * 1.5, mid(cue(166), 0)[1] - IN[1] * 1.5]
    return [
      // The gate, framed as the ballpark pulls out from the meeting (it leaves this key to the hub): the car, him in it,
      // and her on the floor outside. Then out with the car as it lurches off.
      { t: slot.begin, cells: 2.6, hold: SP(-0.42, -0.62), w: 1 },
      { t: GO + 0.5, cells: 5, hold: SP(0, -(carS(GO + 0.5) + FLOOR + 0.6)), w: 1 },
      // The climb: near enough to read the first hops; then the camera stops following and holds wide on the spoke, and
      // the car climbs up through the frame, its lit landings trailing below it, while the station turns round it; then
      // up with it into the float.
      { t: cue(162), cells: 6, off: lead(1.0) },
      // (Held a cell and a half lower down the spoke than where the car is on 166, so that the car comes up into the
      // frame's lower part rather than along its bottom edge, and is still in under Zoom, 1.5 times closer.)
      { t: cue(163.5), cells: 10, hold: low, w: 0.95 },
      { t: cue(166.5), cells: 10, hold: low, w: 0.95 },
      // The step on 168: out wide, the car halfway up the spoke and the hub ahead of it.
      { t: cue(168.5), cells: 8.6, hold: mid(cue(168.5), 0.42), w: 0.8 },
      { t: BRAKE, cells: 7, hold: mid(BRAKE, 0.45), w: 0.9 },
      // Home: the landing and the bay.
      { t: LAND + 0.3, cells: 5.8, hold: HB(-1.35, -0.95), w: 1 },
      { t: CATCH, cells: 5.6, hold: HB(-0.7, -0.75), w: 1 },
      // The ship. Seated; in on the hood as it runs forward and knocks home, drifting aft over it as the arm whips home
      // and the ship wakes (its wingtip lamp is at the tail); then a slow push along the ship from its tail to its nose
      // as the cradle lets it go a clamp a beat, the release running ahead of the frame, to the nose in the port for
      // the cut, where the port's own clamps (outside) are the next to go. The last key is at the cut itself: the
      // undock's first frame keeps it.
      { t: SEAT, cells: 5, hold: HB(0.55, -0.3), w: 1 },
      { t: CANOPY, cells: 3.7, hold: HB(1.25, -0.22), w: 1 },
      { t: STOW, cells: 3.4, hold: HB(1.5, -0.2), w: 1 },
      { t: WAKE, cells: 3.2, hold: HB(1.45, 0.08), w: 1 },
      { t: CLAMPS[0], cells: 3.1, hold: HB(1.25, 0.15), w: 1 },
      { t: CLAMPS[3], cells: 2.95, hold: HB(0.3, 0.12), w: 1 },
      { t: slot.end, cells: 2.9, hold: HB(0.02, 0.1), w: 1 },
    ]
  },
)

/** Every cell the drawing reaches: the spoke from the house to the hub, and the hub with its light. */
const CELLS: Pt[] = (() => {
  const seen = new Set<string>()
  const out: Pt[] = []
  const add = (q: Pt) => {
    const c: Pt = [Math.round(q[0]), Math.round(q[1])]
    const key = `${c[0]},${c[1]}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(c)
  }
  for (let v = 0.5; v >= -RIM_R + RING_OUT; v -= 0.5) for (const u of [WALL_L - 0.3, 0, WALL_R + 0.3]) add(SP(u, v))
  for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (x * x + y * y <= 26) add(HB(x, y))
  return out
})()

/* ------------------------------------------------------------------ drawing */

/** A colour with an alpha, as the string `outline` and `solid` take. */
const tone = (p: p5, hex: string, a: number): string => alpha(p, hex, a).toString()

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

function glow(p: p5, k: number, x: number, y: number, r: number, hex: string, a: number, r0 = 0): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x * k, y * k, r0 * k, x * k, y * k, r * k)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(1, rgba(hex, 0))
  // Saved and restored, so p5's own idea of the fill stays true.
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

function shape(p: p5, k: number, pts: Pt[], close = true): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  if (close) p.endShape(p.CLOSE)
  else p.endShape()
}

/** Draw in the spoke's frame. */
function inSpoke(p: p5, k: number, draw: () => void): void {
  p.push()
  const [gx, gy] = SP(0, 0)
  p.translate(gx * k, gy * k)
  p.rotate(A - Math.PI / 2)
  draw()
  p.pop()
}

/** Draw in the hub's frame. */
function inHub(p: p5, k: number, draw: () => void): void {
  p.push()
  p.translate(AX[0] * k, AX[1] * k)
  draw()
  p.pop()
}

function drawHub(p: p5, s: HubState, c: Ctx): void {
  const T = c.t + s.begin
  const { k } = c
  inHub(p, k, () => drawBay(p, c, T))
  inSpoke(p, k, () => drawShaft(p, c, T))
  inHub(p, k, () => drawCollar(p, c))
  inSpoke(p, k, () => {
    drawLift(p, c, T)
    drawGate(p, c, T)
    drawDial(p, c, T)
  })
  inHub(p, k, () => {
    drawCradle(p, c, T)
    drawRanger(p, c, T)
    drawClamps(p, c, T)
    drawFuelLine(p, c, T)
    drawArm(p, c, T)
  })
}

function drawFront(p: p5, s: HubState, c: Ctx): void {
  const T = c.t + s.begin
  const { k } = c
  inHub(p, k, () => {
    drawCanopy(p, c, T)
    drawClaw(p, c, T)
  })
}

/* ---- the bay: the hub's light, and the end wall behind the ship */

function drawBay(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // The spindle's light, round the hub.
  glow(p, k, 0, 0, RING_OUT + 3.2, DUST.light, 0.85, RING_OUT - 0.2)
  // The end wall inside the collar: a cool grey, lit from behind the ship.
  solid(p, ink, weight * 0.7, DUST.sky)
  p.circle(0, 0, X(2 * RING_IN))
  glow(p, k, 0, 0, RING_IN, DUST.light, 0.7)
  // The end wall's rings and the spindle's end: concentric, faint.
  outline(p, tone(p, ink, 0.18), weight * 0.6)
  p.circle(0, 0, X(2 * 2.2))
  p.circle(0, 0, X(2 * 1.4))
  // The spindle's end: a bolted cap in the wall, faint like the rings round it. (It was a pale disc in a dark ring,
  // a ball's size and colour right beside the cockpit, and it read as another ball.)
  p.circle(0, 0, X(0.6))
  p.circle(0, 0, X(0.22))
  p.noStroke()
  p.fill(tone(p, ink, 0.25))
  for (let i = 0; i < 6; i++) p.circle(X(Math.cos((i / 6) * TAU + 0.3) * 0.2), X(Math.sin((i / 6) * TAU + 0.3) * 0.2), X(0.03))
  // Bay lamps round the inside of the collar: on when the car arrives.
  const on = smooth(T, LAND - 0.05, LAND + 0.1)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.26
    const lx = Math.cos(a) * (RING_IN - 0.12)
    const ly = Math.sin(a) * (RING_IN - 0.12)
    glow(p, k, lx, ly, 0.3, DUST.light, 0.6 * on)
  }
}

/* ---- the shaft: the well through the house, the tube, its landings and lamps */

function drawShaft(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const vTop = -(RIM_R - RING_OUT) + 0.02
  // The tube's back, from the roof (whose boards it cuts through) up to the hub; the counterweight's lane a shade down.
  const foot = (u: number): Pt => [u, roofUnder(u)]
  solid(p, ink, weight * 0.6, mixHex(DUST.wall, DUST.bone, 0.35))
  shape(p, k, [foot(WALL_L), foot(RIDGE[0]), foot(WALL_R), [WALL_R, vTop], [WALL_L, vTop]])
  p.noStroke()
  p.fill(alpha(p, DUST.shade, 0.55))
  shape(p, k, [foot(CAR_R + 0.08), foot(WALL_R), [WALL_R, vTop], [CAR_R + 0.08, vTop]])
  // The car's guide rails, from the house's floor up.
  outline(p, tone(p, ink, 0.45), weight * 0.55)
  for (const u of [CAR_L - 0.03, CAR_R + 0.03]) p.line(X(u), X(0), X(u), X(vTop))
  // The landings: a band round the tube, a flag on the wall the car's roller throws over, and a lamp outside that
  // lights on the beat and stays lit, so the lit lamps climb the spoke behind the car.
  for (let i = 0; i < RIB_V.length; i++) {
    const v = RIB_V[i]
    const since = T - RIBS[i]
    const inTube = v < Math.min(roofUnder(WALL_L), roofUnder(WALL_R)) - 0.03
    if (inTube) {
      solid(p, ink, weight * 0.6, DUST.tin)
      p.rect(X((WALL_L + WALL_R) / 2), X(v), X(WALL_R - WALL_L + 0.14), X(0.06))
    } else {
      // In the attic, on a bracket off the well's edge.
      solid(p, ink, weight * 0.6, DUST.tin)
      p.rect(X(WALL_L), X(v), X(0.08), X(0.18), X(0.02))
    }
    const flip = smooth(since, -0.05, 0.04)
    const fa = 1.15 - 2.3 * flip
    const fx = WALL_L + 0.17 * Math.cos(fa)
    const fy = v + 0.17 * Math.sin(fa)
    outline(p, ink, weight * 0.8)
    p.line(X(WALL_L), X(v), X(fx), X(fy))
    // The flag: a small pennant on the end of its arm.
    const na = fa + Math.PI / 2
    solid(p, ink, weight * 0.5, DUST.rust)
    shape(p, k, [
      [fx, fy],
      [fx - 0.08 * Math.cos(fa) + 0.06 * Math.cos(na), fy - 0.08 * Math.sin(fa) + 0.06 * Math.sin(na)],
      [fx - 0.1 * Math.cos(fa), fy - 0.1 * Math.sin(fa)],
    ])
    if (!inTube) continue
    // The landing's lamp: a small caged slit on a bracket, warm white once lit. It comes on, it does not flash.
    const on = smooth(since, -0.02, 0.14)
    const lx = WALL_L - 0.2
    if (on > 0) glow(p, k, lx, v, 0.17, DUST.light, 0.35 * on)
    outline(p, ink, weight * 0.5)
    p.line(X(WALL_L - 0.04), X(v), X(lx + 0.05), X(v))
    solid(p, ink, weight * 0.5, on > 0.5 ? DUST.light : DUST.shade)
    p.rect(X(lx), X(v), X(0.11), X(0.035), X(0.012))
    outline(p, ink, weight * 0.35)
    for (const dx of [-0.028, 0.028]) p.line(X(lx + dx), X(v - 0.03), X(lx + dx), X(v + 0.03))
  }
  // The walls, down into the roof.
  solid(p, ink, weight * 0.8, DUST.tin)
  for (const u of [WALL_L, WALL_R]) {
    const v0 = roofUnder(u)
    p.rect(X(u), X((vTop + v0) / 2), X(0.07), X(v0 - vTop))
  }
  // Where it goes through the roof: a collar of flashing along the slope.
  solid(p, ink, weight * 0.7, DUST.tin)
  for (const [u0, u1] of [
    [WALL_L - 0.2, WALL_L],
    [WALL_R, WALL_R + 0.2],
  ]) {
    shape(p, k, [
      [u0, roofTop(u0)],
      [u1, roofTop(u1)],
      [u1, roofTop(u1) - 0.07],
      [u0, roofTop(u0) - 0.07],
    ])
  }
}

/* ---- the hub's collar, where the three spokes meet the bay */

function drawCollar(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The other two spokes' sockets, and this one's.
  for (const [a, w] of [
    [A + TAU / 3, 0.62],
    [A - TAU / 3, 0.62],
    [A, WALL_R - WALL_L + 0.3],
  ] as const) {
    p.push()
    p.rotate(a)
    solid(p, ink, weight * 0.8, DUST.tin)
    const mid = a === A ? (WALL_L + WALL_R) / 2 : 0
    // Turned to the spoke, it runs along +x and the spoke's +u is -y.
    p.rect(X(RING_OUT + 0.22), X(-mid), X(0.44), X(w))
    p.pop()
  }
  // The collar itself: a heavy ring, bolted.
  ctx.beginPath()
  ctx.arc(0, 0, X(RING_OUT), 0, TAU)
  ctx.arc(0, 0, X(RING_IN), TAU, 0, true)
  ctx.closePath()
  ctx.fillStyle = DUST.tin
  ctx.fill()
  outline(p, ink, weight)
  p.circle(0, 0, X(2 * RING_OUT))
  p.circle(0, 0, X(2 * RING_IN))
  p.noStroke()
  p.fill(alpha(p, ink, 0.45))
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU
    p.circle(X(Math.cos(a) * (RING_IN + RING_OUT) * 0.5), X(Math.sin(a) * (RING_IN + RING_OUT) * 0.5), X(0.05))
  }
}

/* ---- the lift: sheave and brake, ropes, counterweight, car, and the landing doors */

function drawLift(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const s = carS(T)
  const vf = -s + carJolt(T)
  const vRoof = vf - CAR_TOP
  const vHitch = -(RIM_R - RING_OUT)
  // The counterweight's pulley, halfway down the car's run behind it.
  const vP = -(RIM_R - CW_R0) + s / 2
  // Ropes: the car's, up over the sheave and down to the counterweight's pulley, round it and back up to the collar.
  outline(p, ink, weight * 0.7)
  p.line(X(ROPE_U), X(SHEAVE_V), X(ROPE_U), X(vRoof - 0.08))
  p.line(X(CW_ROPE), X(SHEAVE_V), X(CW_ROPE), X(vP))
  p.line(X(CW_DEAD), X(vHitch), X(CW_DEAD), X(vP))
  solid(p, ink, weight * 0.6, DUST.tin)
  p.rect(X(CW_DEAD), X(vHitch + 0.05), X(0.12), X(0.1))
  // The counterweight: a stack of plates in a yoke under its pulley.
  solid(p, ink, weight * 0.7, DUST.tin)
  p.rect(X(CW_U), X(vP + 0.06), X(0.06), X(0.14))
  solid(p, ink, weight * 0.8, DUST.tin)
  p.rect(X(CW_U), X(vP + 0.13 + CW_LEN / 2), X(CW_W), X(CW_LEN), X(0.02))
  outline(p, tone(p, ink, 0.6), weight * 0.5)
  for (let y = vP + 0.26; y < vP + 0.13 + CW_LEN - 0.06; y += 0.12) p.line(X(CW_U - CW_W / 2 + 0.02), X(y), X(CW_U + CW_W / 2 - 0.02), X(y))
  solid(p, ink, weight * 0.6, DUST.rust)
  p.rect(X(CW_U), X(vP + 0.17), X(CW_W + 0.04), X(0.07))
  solid(p, ink, weight * 0.7, DUST.bone)
  p.circle(X(CW_U), X(vP), X(2 * CW_PULLEY))
  outline(p, ink, weight * 0.5)
  const pt = s / 2 / CW_PULLEY
  p.line(X(CW_U - Math.cos(pt) * 0.06), X(vP - Math.sin(pt) * 0.06), X(CW_U + Math.cos(pt) * 0.06), X(vP + Math.sin(pt) * 0.06))

  // The sheave, turning with the rope, and the brake's shoes either side of it.
  const turn = s / SHEAVE_R
  const bite = smooth(T, BRAKE - 0.04, BRAKE + 0.03) * (1 - smooth(T, LAND + 0.4, LAND + 0.8))
  solid(p, ink, weight * 0.7, DUST.tin)
  p.rect(X(SHEAVE_U), X(SHEAVE_V - 0.26), X(0.1), X(0.46))
  solid(p, ink, weight * 0.9, DUST.rust)
  p.circle(X(SHEAVE_U), X(SHEAVE_V), X(2 * SHEAVE_R))
  solid(p, ink, weight * 0.6, DUST.bone)
  p.circle(X(SHEAVE_U), X(SHEAVE_V), X(2 * SHEAVE_R - 0.11))
  outline(p, ink, weight * 0.7)
  for (let i = 0; i < 4; i++) {
    const a = turn + (i * Math.PI) / 2
    p.line(X(SHEAVE_U + Math.cos(a) * 0.04), X(SHEAVE_V + Math.sin(a) * 0.04), X(SHEAVE_U + Math.cos(a) * (SHEAVE_R - 0.06)), X(SHEAVE_V + Math.sin(a) * (SHEAVE_R - 0.06)))
  }
  solid(p, ink, weight * 0.6, DUST.corn)
  p.circle(X(SHEAVE_U), X(SHEAVE_V), X(0.08))
  for (const sgn of [-1, 1]) {
    // A caliper on the inward side of the rim, its two shoes closing on it.
    const a = -Math.PI / 2 + sgn * 0.75
    const d = SHEAVE_R + 0.05 + 0.06 * (1 - bite)
    p.push()
    p.translate(X(SHEAVE_U + Math.cos(a) * d), X(SHEAVE_V + Math.sin(a) * d))
    p.rotate(a + Math.PI / 2)
    solid(p, ink, weight * 0.7, DUST.denim)
    p.rect(0, 0, X(0.2), X(0.07), X(0.02))
    p.pop()
  }
  if (T > BRAKE && T < BRAKE + 0.5) {
    const age = T - BRAKE
    p.push()
    p.drawingContext.globalAlpha = 1 - age / 0.5
    puff(p, k, ink, weight * 0.6, DUST.bone, SHEAVE_U, SHEAVE_V - SHEAVE_R - 0.12 - age * 0.3, 0.06 + age * 0.12)
    p.pop()
  }

  // The car. Its back wall, lit by its own lamp.
  solid(p, ink, weight * 0.7, DUST.light)
  p.rect(0, X(vf - CAR_H / 2), X(CAR_R - CAR_L - POST), X(CAR_H))
  // Its lamp: a slit under the roof, warm white, not a bulb.
  glow(p, k, 0, vf - CAR_H + 0.12, 0.7, DUST.light, 0.22)
  solid(p, ink, weight * 0.45, DUST.light)
  p.rect(0, X(vf - CAR_H + 0.03), X(0.3), X(0.035), X(0.012))
  // The floor, a plank deck; the +u post (the -u side is the door); the roof, with the hatch over the ball.
  solid(p, ink, weight * 0.8, DUST.wood)
  p.rect(0, X(vf + 0.035), X(CAR_R - CAR_L + 0.04), X(0.07))
  solid(p, ink, weight * 0.8, DUST.rust)
  p.rect(X(CAR_R - POST / 2), X(vf - CAR_H / 2), X(POST), X(CAR_H + 0.02))
  const open = smooth(T, LAND - 0.03, LAND + 0.14)
  const roofY = vf - (CAR_H + CAR_TOP) / 2
  const roofT = CAR_TOP - CAR_H
  p.rect(X((CAR_L - HATCH) / 2), X(roofY), X(-HATCH - CAR_L), X(roofT))
  p.rect(X((CAR_R + HATCH) / 2), X(roofY), X(CAR_R - HATCH), X(roofT))
  // The hatch: a flap each side, hinged at its edge, thrown up toward the axis as the car lands.
  for (const sgn of [-1, 1]) {
    const hx = sgn * HATCH
    p.push()
    p.translate(X(hx), X(roofY))
    p.rotate(sgn * open * 1.9)
    solid(p, ink, weight * 0.8, DUST.rust)
    p.rect(X((-sgn * HATCH) / 2), 0, X(HATCH - 0.01), X(roofT))
    p.pop()
  }
  // The -u side's door head, where the gate hangs; the rope's shackle; the roller that throws the flags.
  solid(p, ink, weight * 0.7, DUST.rust)
  p.rect(X(CAR_L + 0.03), X(vf - CAR_H + 0.05), X(0.08), X(0.1))
  solid(p, ink, weight * 0.7, DUST.tin)
  shape(p, k, [
    [ROPE_U - 0.07, vRoof + 0.01],
    [ROPE_U + 0.07, vRoof + 0.01],
    [ROPE_U, vRoof - 0.09],
  ])
  // The arm that throws the flags as the car passes: a short tin cam off the roof's corner.
  solid(p, ink, weight * 0.6, DUST.tin)
  p.rect(X(CAR_L - 0.05), X(vRoof + 0.06), X(0.1), X(0.045), X(0.015))
  // Its underside: the safety's shoe.
  solid(p, ink, weight * 0.6, DUST.tin)
  p.rect(0, X(vf + 0.1), X(0.5), X(0.05))

  // The landing doors in the collar, over the car's hatch: they part as the car lands.
  const dv0 = -(RIM_R - RING_OUT)
  const dv1 = -(RIM_R - RING_IN)
  const part = open * 0.2
  solid(p, ink, weight * 0.7, DUST.shade)
  p.rect(X(-HATCH / 2 - part), X((dv0 + dv1) / 2), X(HATCH), X(dv0 - dv1))
  p.rect(X(HATCH / 2 + part), X((dv0 + dv1) / 2), X(HATCH), X(dv0 - dv1))
}

/** The car's gate: a slatted drop-bar on the -u side, the side the ball rolled in by. Down behind it on the step. */
function drawGate(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const vf = -carS(T) + carJolt(T)
  const since = T - GATE
  const down = since < 0 ? 0 : since < 0.12 ? (since / 0.12) ** 2 : 1 - 0.06 * Math.exp(-(since - 0.12) / 0.18) * Math.abs(Math.sin((since - 0.12) * 13))
  const u = CAR_L + 0.035
  const len = CAR_H - 0.06
  const bottom = vf - CAR_H + 0.06 + down * (len - 0.02)
  const top = bottom - len
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(u - 0.2), X(vf - CAR_H), X(0.4), X(CAR_H))
  ctx.clip()
  solid(p, ink, weight * 0.8, DUST.rust)
  p.rect(X(u), X((top + bottom) / 2), X(0.07), X(bottom - top))
  outline(p, tone(p, ink, 0.7), weight * 0.5)
  for (let y = top + 0.13; y < bottom - 0.02; y += 0.18) p.line(X(u - 0.035), X(y), X(u + 0.035), X(y))
  ctx.restore()
  if (since > 0 && since < 0.35) {
    // The slam: a crack of dust off the sill.
    p.push()
    p.drawingContext.globalAlpha = 1 - since / 0.35
    puff(p, k, ink, weight * 0.5, DUST.husk, u - 0.16 - since * 0.4, vf - 0.08, 0.05 + since * 0.15)
    p.pop()
  }
}

/**
 * The landing's indicator, on the collar beside the doors: an arc and a needle that ticks over a mark as the car
 * passes each landing, a second a tick, and comes to the stop when it is home, where its lamp goes from red to teal.
 */
function drawDial(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const cu = WALL_L - 0.55
  const cv = -(RIM_R - RING_OUT) + 0.34
  const r = 0.27
  const marks = RIBS.length + 1
  const at = (i: number) => Math.PI + (i / (marks - 1)) * Math.PI
  // The bracket off the collar, and the face.
  solid(p, ink, weight * 0.6, DUST.tin)
  p.rect(X(cu + 0.25), X(cv - 0.1), X(0.3), X(0.08))
  solid(p, ink, weight * 0.8, DUST.bone)
  p.arc(X(cu), X(cv), X(2 * r), X(2 * r), Math.PI, TAU, p.CHORD)
  outline(p, ink, weight * 0.5)
  for (let i = 0; i < marks; i++) {
    const a = at(i)
    const long = i === 0 || i === marks - 1
    p.line(X(cu + Math.cos(a) * (r - (long ? 0.09 : 0.05))), X(cv + Math.sin(a) * (r - (long ? 0.09 : 0.05))), X(cu + Math.cos(a) * (r - 0.02)), X(cv + Math.sin(a) * (r - 0.02)))
  }
  // The needle: a tick for each landing passed and one for home, each with a little shiver.
  const ticks = [...RIBS, LAND]
  const { i, ago } = lastOf(ticks, T)
  const n = i + 1
  const shiver = ago < 0.7 ? 0.05 * Math.exp(-ago / 0.12) * Math.cos(ago * 22) : 0
  const a = at(Math.min(n, marks - 1)) + shiver
  outline(p, DUST.rust, weight * 1.1)
  p.line(X(cu), X(cv), X(cu + Math.cos(a) * (r - 0.05)), X(cv + Math.sin(a) * (r - 0.05)))
  solid(p, ink, weight * 0.5, ink)
  p.circle(X(cu), X(cv), X(0.05))
  // The lamp over it.
  const home = T >= LAND
  if (home) glow(p, k, cu, cv - r - 0.12, 0.32, DUST.light, 0.7 * (0.6 + 0.4 * knock(T - LAND, 0.3)))
  solid(p, ink, weight * 0.6, home ? DUST.teal : DUST.rust)
  p.circle(X(cu), X(cv - r - 0.12), X(0.11))
}

/* ---- the ship's frame */

/**
 * The Ranger lies nosed toward the axis (to the left), as it lies nosed into the port on the end cap when the
 * stage cuts outside, at about the size it is drawn there. Its own frame: x forward from the seat, y down.
 */
const FACE = -1
const SHIP = 0.86
/** A point of the ship's frame, in the hub's. */
const shipPt = (xs: number, ys: number, T: number): Pt => [DOCK[0] + FACE * SHIP * xs, rangerY(T) + SHIP * ys]

/** Draw in the ship's frame, keeping the stage's line weights. */
function inShip(p: p5, c: Ctx, T: number, draw: (c: Ctx) => void): void {
  p.push()
  p.translate(DOCK[0] * c.k, rangerY(T) * c.k)
  p.scale(FACE * SHIP, SHIP)
  draw({ ...c, weight: c.weight / SHIP })
  p.pop()
}

/* ---- the cradle and its clamps */

/** The clamps along the belly, tail to nose (ship's x). */
const CLAMP_X = [-1.25, -0.55, 0.15, 0.85]
/** The cradle's beam (hub's y), under the ship's forward two thirds (ship's x); the wing hangs clear aft of it. */
const BEAM_Y = 0.76
const BEAM_X: [number, number] = [-1.5, 1.1]
/** The belly, and the rail along its side the hooks take (ship's y). */
const BELLY_Y = 0.41
const RAIL = 0.3

function drawCradle(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const xa = shipPt(BEAM_X[0], 0, T)[0]
  const xb = shipPt(BEAM_X[1], 0, T)[0]
  const lo = Math.min(xa, xb)
  const hi = Math.max(xa, xb)
  const mid = (lo + hi) / 2
  // The trestle: two legs from the collar's foot splayed up to the beam, and a tie across them.
  const floorAt = (x: number) => Math.sqrt(RING_IN * RING_IN - x * x) - 0.02
  const legs: [Pt, Pt][] = [
    [[mid - 1.0, floorAt(mid - 1.0)], [mid - 0.6, BEAM_Y + 0.05]],
    [[mid + 1.0, floorAt(mid + 1.0)], [mid + 0.6, BEAM_Y + 0.05]],
  ]
  for (const [[fx, fy], [hx, hy]] of legs) {
    const a = Math.atan2(hy - fy, hx - fx)
    const nx = -Math.sin(a) * 0.05
    const ny = Math.cos(a) * 0.05
    solid(p, ink, weight * 0.7, DUST.tin)
    shape(p, k, [
      [fx + nx * 1.6, fy + ny * 1.6],
      [hx + nx, hy + ny],
      [hx - nx, hy - ny],
      [fx - nx * 1.6, fy - ny * 1.6],
    ])
  }
  outline(p, ink, weight * 0.6)
  const tieY = BEAM_Y + 0.9
  const along = ([[fx, fy], [hx, hy]]: [Pt, Pt], y: number): number => fx + ((hx - fx) * (y - fy)) / (hy - fy)
  p.line(X(along(legs[0], tieY)), X(tieY), X(along(legs[1], tieY)), X(tieY))
  // The beam, and the two saddles the belly rests in.
  solid(p, ink, weight * 0.9, DUST.denim)
  p.rect(X(mid), X(BEAM_Y + 0.05), X(hi - lo), X(0.1), X(0.02))
  solid(p, ink, weight * 0.7, DUST.tin)
  const top = shipPt(0, BELLY_Y, T)[1] + 0.01
  for (const sx of [-0.85, 0.55]) {
    const x = shipPt(sx, 0, T)[0]
    shape(p, k, [
      [x - 0.15, BEAM_Y],
      [x - 0.09, top],
      [x + 0.09, top],
      [x + 0.15, BEAM_Y],
    ])
  }
}

/** The clamps: a hook from a pin on the beam over the belly's rail, in front of the hull; each thrown back on its beat. */
function drawClamps(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const reachUp = BEAM_Y - (SINK + SHIP * RAIL)
  for (let i = 0; i < CLAMPS.length; i++) {
    const x = shipPt(CLAMP_X[i], 0, T)[0]
    const since = T - CLAMPS[i]
    // Thrown back on the beat, and a heavy settle against its stop.
    const back = since < 0 ? 0 : 1 - (1 - clamp(since / 0.16)) ** 3 + 0.08 * Math.exp(-since / 0.3) * Math.sin(since * 11)
    p.push()
    p.translate(X(x), X(BEAM_Y))
    p.scale(FACE, 1)
    p.rotate(-back)
    // The arm, up to the rail, and the hook over it, toward the nose.
    solid(p, ink, weight * 0.9, DUST.denim)
    shape(p, k, [
      [-0.055, 0.03],
      [-0.055, -reachUp + 0.1],
      [0.0, -reachUp - 0.05],
      [0.16, -reachUp - 0.05],
      [0.22, -reachUp + 0.02],
      [0.16, -reachUp + 0.05],
      [0.07, -reachUp + 0.02],
      [0.055, -reachUp + 0.12],
      [0.055, 0.03],
    ])
    p.pop()
    solid(p, ink, weight * 0.6, DUST.bone)
    p.circle(X(x), X(BEAM_Y), X(0.07))
    // The lamp on the beam beside it: red, clamped; teal, free.
    const free = since >= 0
    const lx = x + FACE * 0.18
    if (free) glow(p, k, lx, BEAM_Y + 0.05, 0.22 + 0.3 * knock(since, 0.2), DUST.light, 0.4 + 0.5 * knock(since, 0.3))
    solid(p, ink, weight * 0.5, free ? DUST.teal : DUST.rust)
    p.circle(X(lx), X(BEAM_Y + 0.05), X(0.075))
    if (since > 0 && since < 0.5) {
      p.push()
      p.drawingContext.globalAlpha = 1 - since / 0.5
      const [px, py] = shipPt(CLAMP_X[i] + 0.1, RAIL, T)
      puff(p, k, ink, weight * 0.5, DUST.bone, px - FACE * since * 0.2, py + 0.02 + since * 0.1, 0.05 + since * 0.14)
      p.pop()
    }
  }
}

/* ---- the fuel line, from the collar to the ship's flank: still plugged in when the stage cuts outside */

const PORT: Pt = [-1.5, 0.2]
const WALL_END: Pt = [Math.cos(-0.3) * RING_IN, Math.sin(-0.3) * RING_IN]

function drawFuelLine(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const port = shipPt(PORT[0], PORT[1], T)
  // Slack, and drifting a little in the hub's weightless air.
  const mid: Pt = [(WALL_END[0] + port[0]) / 2 + 0.32 + 0.03 * Math.sin(T * 0.9), (WALL_END[1] + port[1]) / 2 + 0.08 + 0.03 * Math.sin(T * 0.7 + 1)]
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const path = () => {
    ctx.beginPath()
    ctx.moveTo(X(WALL_END[0]), X(WALL_END[1]))
    ctx.quadraticCurveTo(X(mid[0]), X(mid[1]), X(port[0]), X(port[1]))
  }
  ctx.lineCap = 'round'
  path()
  ctx.strokeStyle = ink
  ctx.lineWidth = X(0.1)
  ctx.stroke()
  path()
  ctx.strokeStyle = DUST.teal
  ctx.lineWidth = Math.max(1, X(0.1) - 2 * weight * 0.8)
  ctx.stroke()
  solid(p, ink, weight * 0.7, DUST.tin)
  p.circle(X(WALL_END[0]), X(WALL_END[1]), X(0.2))
  const dir = Math.atan2(port[1] - mid[1], port[0] - mid[0])
  p.push()
  p.translate(X(port[0]), X(port[1]))
  p.rotate(dir)
  solid(p, ink, weight * 0.7, DUST.corn)
  p.rect(X(-0.05), 0, X(0.13), X(0.12), X(0.02))
  p.pop()
}

/* ---- the Ranger: long and low, a swept wing hanging under its after half, a bubble canopy on a sliding hood */

/** The hull (ship's frame): the nose, the sill under the canopy, the spine, the tail, the belly. */
const HULL: Pt[] = [
  [1.4, 0.27],
  [1.12, 0.19],
  [0.84, 0.13],
  [0.56, 0.1],
  [-0.46, 0.1],
  [-0.55, 0.0],
  [-0.78, -0.05],
  [-1.86, -0.06],
  [-2.02, -0.01],
  [-2.06, 0.36],
  [-1.98, 0.41],
  [0.35, 0.41],
  [0.86, 0.38],
  [1.16, 0.32],
]
/** The black of the belly and the nose. */
const BELLY: Pt[] = [
  [1.4, 0.27],
  [1.16, 0.32],
  [0.86, 0.38],
  [0.35, 0.41],
  [-1.98, 0.41],
  [-2.05, 0.33],
  [0.35, 0.335],
  [0.86, 0.305],
  [1.13, 0.25],
]
/** The wing, swept and drooped: seen side-on it hangs under the after half. */
const WING: Pt[] = [
  [-0.3, 0.36],
  [-1.72, 0.72],
  [-2.14, 0.72],
  [-1.98, 0.36],
]
/** The canopy's foot, at the windscreen. Open, the hood is slid back along the spine by `SLIDE`. */
const HINGE: Pt = [0.56, 0.1]
const SLIDE: Pt = [-0.86, -0.12]

/** The bubble, from the windscreen over the seat to its back: the cockpit's well, and the glass that closes over it. */
function bubble(p: p5, k: number): void {
  const X = (v: number) => v * k
  p.beginShape()
  p.vertex(X(HINGE[0]), X(HINGE[1]))
  p.bezierVertex(X(0.42), X(-0.14), X(0.14), X(-0.31), X(-0.1), X(-0.3))
  p.bezierVertex(X(-0.36), X(-0.29), X(-0.5), X(-0.12), X(-0.46), X(0.1))
  p.endShape(p.CLOSE)
}

/** How far the hood is slid back: 1 open, 0 shut. It runs forward on the beat and knocks home. */
const canopyOpen = (T: number): number => {
  const since = T - CANOPY
  if (since < -0.3) return 1
  if (since < 0) {
    const u = (since + 0.3) / 0.3
    return 1 - u * u
  }
  return -0.04 * Math.exp(-since / 0.18) * Math.sin(since * 17)
}

function drawRanger(p: p5, c0: Ctx, T: number): void {
  inShip(p, c0, T, (c) => {
    const { k, ink, weight } = c
    const X = (v: number) => v * k
    // The wing, behind the hull.
    solid(p, ink, weight * 0.9, DUST.tin)
    shape(p, k, WING)
    outline(p, tone(p, ink, 0.45), weight * 0.5)
    p.line(X(-0.75), X(0.47), X(-2.02), X(0.47))
    // The bells, cold: the engine is lit outside, pointing away.
    for (const [y0, y1] of [
      [0.02, 0.17],
      [0.21, 0.36],
    ]) {
      solid(p, ink, weight * 0.7, DUST.tin)
      shape(p, k, [
        [-2.05, y0 + 0.025],
        [-2.26, y0 - 0.015],
        [-2.26, y1 + 0.015],
        [-2.05, y1 - 0.025],
      ])
    }
    // The hull, the black of its belly and nose.
    solid(p, ink, weight, DUST.bone)
    shape(p, k, HULL)
    p.noStroke()
    p.fill(ink)
    shape(p, k, BELLY)
    // The cockpit's well, dark; on 179 its panel lights, warm round the ball.
    solid(p, ink, weight * 0.6, DUST.denim)
    bubble(p, k)
    const wake = smooth(T, WAKE - 0.03, WAKE + 0.06)
    if (wake > 0) {
      const kick = knock(T - WAKE, 0.3)
      glow(p, k, 0.12, -0.02, 0.42 + 0.2 * kick, DUST.corn, 0.45 * wake + 0.4 * kick)
      for (const [x, y, col] of [
        [0.4, 0.04, DUST.corn],
        [0.33, -0.05, DUST.teal],
        [0.26, -0.12, DUST.light],
      ] as const) {
        p.noStroke()
        p.fill(col)
        p.circle(X(x), X(y), X(0.05))
      }
    }
    solid(p, ink, weight * 0.6, DUST.rust)
    shape(p, k, [
      [-0.31, 0.1],
      [-0.23, -0.14],
      [-0.14, -0.14],
      [-0.16, 0.1],
    ])
    // Panel lines, the hatch, the docking collar on its back, the fuel port.
    outline(p, tone(p, ink, 0.45), weight * 0.5)
    for (const x of [-0.78, -1.62]) p.line(X(x), X(-0.04), X(x), X(0.33))
    p.rect(X(-1.1), X(0.16), X(0.3), X(0.18), X(0.04))
    solid(p, ink, weight * 0.7, DUST.tin)
    p.rect(X(-1.66), X(-0.1), X(0.36), X(0.09), X(0.02))
    solid(p, ink, weight * 0.5, DUST.tin)
    p.circle(X(PORT[0]), X(PORT[1]), X(0.12))
    // The wingtip lamp: dark, then a blink on every beat once the ship is awake.
    const blink = wake > 0.5 ? knock(lastOf([WAKE, ...CLAMPS], T).ago, 0.18) : 0
    if (blink > 0.02) glow(p, k, -1.95, 0.7, 0.28, DUST.rust, 0.8 * blink)
    solid(p, ink, weight * 0.5, blink > 0.3 ? DUST.corn : DUST.rust)
    p.circle(X(-1.95), X(0.7), X(0.075))
  })
}

/** The canopy's hood over the ball: glass in a frame, on a rail along the spine. Open, it sits slid back. */
function drawCanopy(p: p5, c0: Ctx, T: number): void {
  const open = canopyOpen(T)
  inShip(p, c0, T, (c) => {
    const { k, ink, weight } = c
    const X = (v: number) => v * k
    outline(p, ink, weight * 0.7)
    p.line(X(-1.4), X(-0.07), X(-0.5), X(-0.07))
    p.push()
    p.translate(X(SLIDE[0] * open), X(SLIDE[1] * clamp(open)))
    solid(p, ink, weight * 1.1, tone(p, DUST.sky, 0.34))
    bubble(p, k)
    outline(p, tone(p, DUST.light, 0.95), weight * 1.2)
    p.arc(X(-0.02), X(-0.02), X(0.46), X(0.46), -2.4, -1.5)
    outline(p, ink, weight * 0.8)
    p.line(X(0.16), X(-0.27), X(0.32), X(0.1))
    p.pop()
    // The knock home: a flash off the windscreen's foot.
    const since = T - CANOPY
    if (since > 0 && since < 0.3) {
      outline(p, tone(p, ink, 1 - since / 0.3), weight * 0.8)
      for (let i = 0; i < 3; i++) {
        const a = -0.4 - i * 0.45
        const r0 = 0.12 + 0.1 * since
        const r1 = 0.22 + 0.3 * since
        p.line(X(HINGE[0] + Math.cos(a) * r0), X(HINGE[1] + Math.sin(a) * r0), X(HINGE[0] + Math.cos(a) * r1), X(HINGE[1] + Math.sin(a) * r1))
      }
    }
  })
}

/* ---- the arm */

function drawArm(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const { j } = armAt(T)
  const [bx, by] = ARM_BASE
  const ex = bx + L1 * Math.cos(j.sh)
  const ey = by + L1 * Math.sin(j.sh)
  const wx = ex + (L2 - 0.2) * Math.cos(j.fa)
  const wy = ey + (L2 - 0.2) * Math.sin(j.fa)
  // The catch on the collar the elbow parks in, and the snap when it goes home.
  const park = reach(HOME)
  const pe: Pt = [bx + L1 * Math.cos(park.sh), by + L1 * Math.sin(park.sh)]
  const pa = Math.atan2(pe[1], pe[0])
  const snap = knock(T - STOW, 0.2)
  if (snap > 0.02) glow(p, k, pe[0], pe[1], 0.35, DUST.light, 0.7 * snap)
  p.push()
  p.translate(X(Math.cos(pa) * (RING_IN + 0.02)), X(Math.sin(pa) * (RING_IN + 0.02)))
  p.rotate(pa + Math.PI / 2)
  solid(p, ink, weight * 0.7, DUST.tin)
  shape(p, k, [
    [-0.16, 0],
    [-0.16, 0.1],
    [-0.1, 0.16],
    [-0.06, 0.1],
    [0.06, 0.1],
    [0.1, 0.16],
    [0.16, 0.1],
    [0.16, 0],
  ])
  p.pop()
  // The mount on the collar.
  solid(p, ink, weight * 0.8, DUST.tin)
  shape(p, k, [
    [bx - 0.3, by - 0.12],
    [bx + 0.3, by - 0.12],
    [bx + 0.16, by + 0.1],
    [bx - 0.16, by + 0.1],
  ])
  const limb = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) => {
    const a = Math.atan2(y1 - y0, x1 - x0)
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    solid(p, ink, weight * 0.9, DUST.corn)
    shape(p, k, [
      [x0 + nx * w0, y0 + ny * w0],
      [x1 + nx * w1, y1 + ny * w1],
      [x1 - nx * w1, y1 - ny * w1],
      [x0 - nx * w0, y0 - ny * w0],
    ])
  }
  limb(bx, by, ex, ey, 0.09, 0.07)
  limb(ex, ey, wx, wy, 0.065, 0.05)
  // A hydraulic ram along the upper arm.
  outline(p, ink, weight * 0.6)
  const ra = j.sh
  p.line(X(bx + 0.25 * Math.cos(ra) - 0.1 * Math.sin(ra)), X(by + 0.25 * Math.sin(ra) + 0.1 * Math.cos(ra)), X(ex - 0.2 * Math.cos(ra) - 0.1 * Math.sin(ra)), X(ey - 0.2 * Math.sin(ra) + 0.1 * Math.cos(ra)))
  for (const [x, y, d] of [
    [bx, by, 0.2],
    [ex, ey, 0.17],
  ]) {
    solid(p, ink, weight * 0.8, DUST.bone)
    p.circle(X(x), X(y), X(d))
    p.noStroke()
    p.fill(ink)
    p.circle(X(x), X(y), X(0.05))
  }
  // The wrist, and the jaws' roots behind the ball (the jaws themselves are drawn over it).
  solid(p, ink, weight * 0.8, DUST.tin)
  p.push()
  p.translate(X(wx), X(wy))
  p.rotate(j.fa)
  p.rect(0, 0, X(0.12), X(0.2), X(0.03))
  p.pop()
}

function drawClaw(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const { j, open } = armAt(T)
  const ex = ARM_BASE[0] + L1 * Math.cos(j.sh)
  const ey = ARM_BASE[1] + L1 * Math.sin(j.sh)
  // The claw's centre is the end of the forearm: where the ball sits when it is held.
  const cx = ex + L2 * Math.cos(j.fa)
  const cy = ey + L2 * Math.sin(j.fa)
  const wx = cx - 0.2 * Math.cos(j.fa)
  const wy = cy - 0.2 * Math.sin(j.fa)
  for (const sgn of [-1, 1]) {
    // Each jaw: out from the wrist to a knuckle beside the ball, and round to a tip ahead of it.
    const kn: Pt = [wx + 0.2 * Math.cos(j.fa + sgn * (1.1 + 0.4 * open)), wy + 0.2 * Math.sin(j.fa + sgn * (1.1 + 0.4 * open))]
    const tip: Pt = [cx + 0.19 * Math.cos(j.fa + sgn * (0.5 + 0.8 * open)), cy + 0.19 * Math.sin(j.fa + sgn * (0.5 + 0.8 * open))]
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(X(0.07))
    p.line(X(wx), X(wy), X(kn[0]), X(kn[1]))
    p.line(X(kn[0]), X(kn[1]), X(tip[0]), X(tip[1]))
    p.stroke(DUST.corn)
    p.strokeWeight(Math.max(1, X(0.07) - 2 * weight * 0.7))
    p.line(X(wx), X(wy), X(kn[0]), X(kn[1]))
    p.line(X(kn[0]), X(kn[1]), X(tip[0]), X(tip[1]))
  }
  if (T > CATCH && T < CATCH + 0.3) {
    // The snap.
    const u = (T - CATCH) / 0.3
    outline(p, tone(p, ink, 1 - u), weight * 0.7)
    for (let i = 0; i < 5; i++) {
      const a = j.fa + Math.PI + (i - 2) * 0.45
      p.line(X(cx + Math.cos(a) * (0.24 + 0.1 * u)), X(cy + Math.sin(a) * (0.24 + 0.1 * u)), X(cx + Math.cos(a) * (0.34 + 0.18 * u)), X(cy + Math.sin(a) * (0.34 + 0.18 * u)))
    }
  }
}

