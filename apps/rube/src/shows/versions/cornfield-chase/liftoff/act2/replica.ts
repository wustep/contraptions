import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeOutCubic, easeOutSine } from '../../../../../../../../src/core/ease'
import { FLOOR, R, mixHex, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, part, route, smooth, type Ctx, type PartShot } from '../kit'
import { ACT2, CUE2_PERIOD, cue } from '../music'
import { G_EARTH } from '../physics'
import { DARK, DUST } from '../worlds'
import { drawRobot, house, SHELF_TOP, stayRow, TOY_HOME } from '../earth/house'
import { AXIS, HOUSE, RIM_R, SEAM, stationFrame, standOnRim } from './station'

/**
 * The replica house. The organ comes in, the lights come up, and the room
 * Act I left at dusk is the same room in daylight: Murph's room, rebuilt
 * board for board as a museum at the bottom of Cooper Station. The ghost on
 * the top shelf is a ball again, and the ball has weight: the end of the
 * shelf it sits on is a flap, and it gives.
 *
 * Down through the house, on the organ's pulse:
 *
 *   104  the lights: the first frame is Act I's room at dusk, and on the
 *        accent the station's lamps strike (one catches late) and the day
 *        comes up in it; the ghost is a ball, and the shelf's end tips under it
 *   105  out through a flap in the side of the case, into the dumbwaiter
 *   106  the dumbwaiter's catch lets go: the car drops, the counterweight flies up
 *   107  the car lands in the kitchen on its buffer, and its gate drops
 *   108–111  the tall clock: the ball rides its weight down a notch a tick,
 *        the pendulum swinging to the organ (a second a beat, as a clock's does)
 *   112  the clock's side door drops open and the ball rolls out
 *   114  the museum's turnstile at the front door takes it through, a third of a turn
 *   115  off the end of the plinth and down onto the ring
 *
 * Meanwhile the camera goes out from the room to the house on its plinth,
 * and then to the whole ring round it, and comes back in to the door.
 *
 * Everything here is drawn in Act I's house cells (the farm's frame, where
 * the house scenery draws itself) and moved into the part's own cells by O.
 * The ring's gravity is outward; a flat plinth at its bottom is a low hill,
 * so a ball let go on it runs off its end, and on the ring's own ground it
 * rolls as on the level.
 */

/* ------------------------------------------------------------------ frames */

/** Act I's house cells into this part's cells: the house's origin is HOUSE from O, and O is the entry at (-0.5, 0). */
const O: Pt = [HOUSE[0] - 0.5, HOUSE[1]]
const toL = (q: Pt): Pt => [q[0] + O[0], q[1] + O[1]]
/** The axis, in house cells. */
const AX: Pt = [AXIS[0] - HOUSE[0], AXIS[1] - HOUSE[1]]
const station = stationFrame(SEAM.start)
/** Where the ball leaves, in this part's cells: on the ring, rolling. */
const EXIT_AT = station.local(SEAM.replicaOut)
const EXIT_ANGLE = Math.atan2(SEAM.replicaOut[1] - AXIS[1], SEAM.replicaOut[0] - AXIS[0])

/** The ball's centre on the ring's ground at angle `a`, in house cells. */
const onRing = (a: number): Pt => [AX[0] + (RIM_R - FLOOR) * Math.cos(a), AX[1] + (RIM_R - FLOOR) * Math.sin(a)]
/** The ring's ground under x, in house cells (the bottom half). */
const groundY = (x: number): number => AX[1] + Math.sqrt(RIM_R * RIM_R - (x - AX[0]) * (x - AX[0]))

/* ------------------------------------------------------------------ the house (Act I's numbers) */

const WALL_L = -1.0
const WALL_R = 8.3
const UP = -2 + FLOOR
const DOWN = FLOOR
const EAVE = -3.78
/** The kitchen's ceiling: the underside of the upstairs floor. */
const CEIL_DOWN = UP + 0.16

/** The plinth: a flat stone top at the ground floor's level, filling the bottom of the ring. */
const PL_L = -1.7
const PL_R = 9.0

/* ------------------------------------------------------------------ the case (the shelf part's frame: house y + 2) */

const CASE_L = -0.45
const CASE_R = 2.0
const CAP = SHELF_TOP - 0.6
const MIDY = SHELF_TOP + 0.46
const ROW = stayRow()
const GONE = ROW.length - 1
/** The flap at the end of the top shelf: hinged here, on the board's centre line; it tips to TILT. */
const HINGE: Pt = [1.12, SHELF_TOP + 0.025]
const TILT = 0.3
const BOARD_END = CASE_R - 0.07
/** Where the ghost rests, along the flap from its hinge. */
const D0 = 1.5055 - HINGE[0]
const D_END = BOARD_END - HINGE[0]
/** The flap in the case's side the ball goes out through, in the side's own height. */
const DOOR_TOP = SHELF_TOP - 0.12
const DOOR_BOT = SHELF_TOP + 0.3

/** The ball on the tipping board, `d` along it from the hinge, in the case's frame. */
function onBoard(d: number, th: number): Pt {
  const lift = 0.025 + R
  return [HINGE[0] + d * Math.cos(th) + lift * Math.sin(th), HINGE[1] + d * Math.sin(th) - lift * Math.cos(th)]
}
const caseToHouse = (q: Pt): Pt => [q[0], q[1] - 2]

/* ------------------------------------------------------------------ the dumbwaiter (house cells) */

const SH_L = 2.04
const SH_R = 2.74
const CAR_L = 2.07
const CAR_R = 2.62
const CAR_MID = (CAR_L + CAR_R) / 2
const CAR_H = 0.55
/** The car's floor at its middle, up at the hatch and down in the kitchen. It slopes down toward the gate. */
const CAR_UP = -2.54
const CAR_DOWN = -0.96
const SLOPE = 0.128
const JOLT = 0.05
const HATCH = { x0: SH_L, x1: SH_R, y0: CAR_UP - CAR_H - 0.07, y1: CAR_UP + 0.05 }
/** The kitchen's hatch, where the car stops: papered over like the one upstairs until the car is on its way. */
const HATCH_DOWN = { x0: SH_L, x1: CAR_R + 0.04, y0: CAR_DOWN - CAR_H - 0.07, y1: CAR_DOWN + 0.07 }
const CW_X = 2.7
const CW_H = 0.4
/** The counterweight's top when the car is up: it hangs low in the kitchen. */
const CW_LOW = -1.4
const CAB_TOP = -0.88
/** Where the ball sits in the car, against the gate. */
const IN_CAR_X = CAR_R - 0.04 - R
const inCarY = (y: number): number => y + SLOPE * (IN_CAR_X - CAR_MID) - R * Math.hypot(1, SLOPE)
const GATE = 0.45

/* ------------------------------------------------------------------ the clock (house cells) */

const CK_L = 3.07
const CK_R = 3.97
const CK_MID = (CK_L + CK_R) / 2
const HOOD_TOP = -1.64
const HOOD_BOT = -1.2
const TRUNK_BOT = -0.08
const WALLW = 0.04
const PIVOT: Pt = [CK_MID, -1.28]
const PEND = 0.95
const SWING = 0.12
/** The ledge under the hood that takes the ball from the side door to the weight. */
const LEDGE_Y = -0.95
/** The weight's tray: its surface where the ball sits, up and after each tick. */
const TRAY_UP = -0.94
const NOTCH = 0.17
const ON_TRAY_X = CK_R - WALLW - R
/** The door in the right-hand wall, hinged at its foot: shut, it holds the ball against it; open, it is a spout. */
const SPOUT_HINGE: Pt = [CK_R - 0.02, -0.26]
const SPOUT = 0.34
const SPOUT_OPEN = 0.5
const SPOUT_TIP: Pt = [SPOUT_HINGE[0] + SPOUT * Math.cos(SPOUT_OPEN), SPOUT_HINGE[1] + SPOUT * Math.sin(SPOUT_OPEN)]
/** The ball at the spout's lip, and where it comes down on the kitchen floor. */
const onSpout: Pt = [SPOUT_TIP[0] + R * Math.sin(SPOUT_OPEN) - 0.02, SPOUT_TIP[1] - R * Math.cos(SPOUT_OPEN)]
const floorAt: Pt = [onSpout[0] + 0.24, 0]

/* ------------------------------------------------------------------ the turnstile (house cells) */

const TS_HUB: Pt = [8.0, -0.36]
const TS_ARM = 0.44
const TS_BODY = { x0: 7.6, x1: 7.98, y0: -0.52 }

/* ------------------------------------------------------------------ the clock of the part */

/** Slot seconds of what the drawing needs to know, and where the ball comes down on the ring. */
interface ReplicaState {
  /** The ball at the end of the tipped flap, going through the side of the case. */
  edge: number
  /** Down on the kitchen floor out of the clock. */
  outOfClock: number
  /** Down on the ring off the plinth, and where. */
  landed: number
  landX: number
}

/** Slot seconds of beat k of the cue: the slot begins on the accent, ACT2. */
const B = (k: number): number => cue(k) - ACT2

/** The flap's angle: level, then down under the ball's new weight; back up once the ball has gone. */
function tailAngle(t: number): number {
  if (t < 0.06) return 0
  const down = TILT * easeOutCubic(clamp((t - 0.06) / 0.1))
  const settle = t > 0.16 ? 0.035 * Math.exp(-(t - 0.16) / 0.07) * Math.sin((t - 0.16) * 42) : 0
  const back = smooth(t, B(105) + 0.1, B(105) + 0.45)
  const wobble = t > B(105) + 0.45 ? 0.03 * Math.exp(-(t - B(105) - 0.45) / 0.1) * Math.sin((t - B(105) - 0.45) * 36) : 0
  return (down + settle) * (1 - back) - wobble
}

/** The car's floor (its middle): still, a dip as the ball comes in, the fall on 106, the buffer on 107. */
function carY(t: number): number {
  const b105 = B(105)
  const b106 = B(106)
  const b107 = B(107)
  if (t < b105) return CAR_UP
  if (t < b106) {
    const s = t - b105
    return CAR_UP + 0.03 * Math.exp(-s / 0.14) * Math.sin(s * 26)
  }
  if (t < b107) {
    // The catch lets go with a jolt, and then it falls against the counterweight.
    const u = (t - b106) / (b107 - b106)
    const jolt = JOLT * easeOutCubic(clamp((t - b106) / 0.06))
    return CAR_UP + jolt + (CAR_DOWN - CAR_UP - JOLT) * u * u
  }
  const s = t - b107
  return CAR_DOWN + 0.055 * Math.exp(-s / 0.08) * Math.sin(s * 40)
}

/** The counterweight's top: it goes up as the car goes down. */
const cwTop = (t: number): number => CW_LOW - (carY(t) - CAR_UP)

/** The car's gate, 0 up to 1 down, on 107. */
const gateDown = (t: number): number => {
  const s = t - B(107) - 0.02
  if (s < 0) return 0
  const u = clamp(s / 0.14)
  return u * u + (s > 0.14 ? -0.08 * Math.exp(-(s - 0.14) / 0.06) * Math.sin((s - 0.14) * 50) : 0)
}

/** The weight's tray: a notch down on each tick from 108 to 111. */
function trayY(t: number): number {
  let y = TRAY_UP
  for (const k of [108, 109, 110, 111]) {
    const s = t - B(k)
    if (s <= 0) continue
    const u = clamp(s / 0.08)
    y += NOTCH * u * u + (s > 0.08 ? 0.018 * Math.exp(-(s - 0.08) / 0.05) * Math.sin((s - 0.08) * 70) : 0)
  }
  return y
}
const onTray = (t: number): Pt => [ON_TRAY_X, trayY(t) - R]

/** The clock's side door, shut (0) to open as a spout (1), on 112. */
const spoutOpen = (t: number): number => {
  const s = t - B(112)
  if (s < 0) return 0
  const u = clamp(s / 0.16)
  return u * u + (s > 0.16 ? -0.05 * Math.exp(-(s - 0.16) / 0.07) * Math.sin((s - 0.16) * 45) : 0)
}
/** The spout's angle from pointing up (shut) to SPOUT_OPEN below the level (open). */
const spoutAngle = (t: number): number => -Math.PI / 2 + (Math.PI / 2 + SPOUT_OPEN) * spoutOpen(t)

/** The pendulum's angle at show time T: an end of its swing on every beat of the cue. */
const pendulum = (T: number): number => SWING * Math.cos((Math.PI * (T - ACT2)) / CUE2_PERIOD)

/** The turnstile's turn: a third of a turn on 114, pushed round by the ball, with the ratchet's click at the end. */
function turnstile(t: number): number {
  const s = t - B(114)
  if (s <= 0) return 0
  const u = clamp(s / 0.5)
  const kick = s > 0.5 ? 0.05 * Math.exp(-(s - 0.5) / 0.06) * Math.sin((s - 0.5) * 60) : 0
  return ((2 * Math.PI) / 3) * easeOutSine(u) - kick
}
/** The ball against the down arm, while the arm has it. */
function pushedBy(rot: number): Pt {
  const phi = Math.PI / 2 - rot
  return [TS_HUB[0] + (0 - TS_HUB[1]) / Math.tan(phi) - (0.025 + R) / Math.sin(phi), 0]
}

/* ------------------------------------------------------------------ the part */

export const REPLICA_HITS = [104, 105, 106, 107, 108, 109, 110, 111, 112, 114, 115].map((k) => cue(k))

export const replica = part<ReplicaState>(
  {
    name: 'replica',
    dynamic: true,
    draw: (p, s, c) => drawAll(p, s, c),
    over: (p, s, c) => drawOver(p, s, c),
  },
  (slot) => {
    const b = (k: number) => cue(k) - slot.begin
    const T_END = slot.end - slot.begin
    const H = (q: Pt): Pt => toL(q)
    const segs: Seg[] = []

    // The cut: the ghost is a ball, and the flap it sits on tips under it.
    const tipped = 0.2
    segs.push(...carried((t) => H(caseToHouse(onBoard(D0, tailAngle(t)))), 0, tipped, 8))
    // Down the tipped board, gathering speed, to its end.
    const g = G_EARTH * Math.sin(TILT) * (5 / 7)
    const run = D_END - D0
    const edge = tipped + Math.sqrt((2 * run) / g)
    const vEdge = g * (edge - tipped)
    const boardEnd = H(caseToHouse(onBoard(D_END, TILT)))
    // Out through the flap in the side and down the car's floor to its gate: the knock on 105.
    const inCar = (t: number): Pt => H([IN_CAR_X, inCarY(carY(t))])
    const into = inCar(b(105))
    segs.push(
      ...route([
        { at: tipped, p: H(caseToHouse(onBoard(D0, TILT))) },
        { at: edge, p: boardEnd, ramp: [0, vEdge] },
        { at: b(105), p: into, ramp: [vEdge, vEdge * 1.15] },
      ]),
    )
    // In the car: the dip, the fall, the buffer.
    const sitOut = b(107) + 0.1
    segs.push(...carried(inCar, b(105), b(106), 10))
    segs.push(...carried(inCar, b(106), b(107), 24))
    segs.push(...carried(inCar, b(107), sitOut, 10))
    // Out over the gate, through the clock's side door, along the ledge and onto the weight's tray.
    const onLedge = H([CK_L + 0.12, LEDGE_Y - R])
    const trayIn = b(107) + 0.84
    segs.push(
      ...route([
        { at: sitOut, p: inCar(sitOut) },
        { at: sitOut + 0.32, p: H([CAR_R + GATE * 0.9, CAR_DOWN + 0.03 - R]), ramp: [0.8, 2.4] },
        { at: sitOut + 0.39, p: onLedge, ramp: [2.4, 2.4] },
        { at: trayIn, p: H(onTray(trayIn)), ramp: [2.4, 0.6] },
      ]),
    )
    // Down with the weight, a notch a tick.
    segs.push(...carried((t) => H(onTray(t)), trayIn, b(112), 60))
    // The side door drops: out over it and down to the kitchen floor, landing on the half beat.
    const outOfClock = b(112.5)
    segs.push(
      ...route([
        { at: b(112), p: H(onTray(b(112))) },
        { at: b(112) + 0.16, p: H(onTray(b(112))) },
        { at: b(112) + 0.38, p: H(onSpout), ramp: [0.3, 1.9] },
        { at: outOfClock, p: H(floorAt), ramp: [1.9, 2.2] },
      ]),
    )
    // Across the kitchen floor, under the stairs, to the turnstile.
    const atArm = pushedBy(0)
    segs.push(...route([{ at: outOfClock, p: H(floorAt) }, { at: b(114), p: H(atArm) }]))
    // The arm takes it round until it slips off the arm's end.
    const release = Math.PI / 2 - Math.asin((0 - TS_HUB[1] + 0.02) / TS_ARM)
    const uRel = (2 / Math.PI) * Math.asin(release / ((2 * Math.PI) / 3))
    const released = b(114) + 0.5 * uRel
    segs.push(...carried((t) => H(pushedBy(turnstile(t))), b(114), released, 6))
    // Out of the door and down the plinth (a low hill, as the ring's gravity has it) to its end, and off.
    const vOff = 1.5
    const lip: Pt = [PL_R, 0]
    // How long it is in the air off the lip: until it meets the ring's ground.
    const fallTo = (tau: number): number => {
      const x = lip[0] + vOff * tau
      return 0.5 * G_EARTH * tau * tau - (AX[1] + Math.sqrt((RIM_R - FLOOR) ** 2 - (x - AX[0]) ** 2))
    }
    let lo = 0
    let hi = 1
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2
      if (fallTo(mid) < 0) lo = mid
      else hi = mid
    }
    const tau = (lo + hi) / 2
    const landed = b(115)
    const flightFrom = landed - tau
    const outDoor = pushedBy(turnstile(released))
    const dist = lip[0] - outDoor[0]
    const v0 = Math.max(0.3, (2 * dist) / (flightFrom - released) - vOff)
    segs.push(...route([{ at: released, p: H(outDoor) }, { at: flightFrom, p: H(lip), ramp: [v0, vOff] }]))
    segs.push(...carried((t) => H([lip[0] + vOff * (t - flightFrom), 0.5 * G_EARTH * (t - flightFrom) ** 2]), flightFrom, landed, 6))
    // On the ring's ground: round and up to the seam, rolling on at the ring's pace.
    const land: Pt = [lip[0] + vOff * tau, 0.5 * G_EARTH * tau * tau]
    const aLand = Math.atan2(land[1] - AX[1], land[0] - AX[0])
    const arc = (aLand - EXIT_ANGLE) * (RIM_R - FLOOR)
    const span = T_END - landed
    const vIn = Math.max(0.4, (2 * arc) / span - 1.5)
    const acc = (1.5 - vIn) / span
    segs.push(
      ...carried(
        (t) => {
          const s = t - landed
          const along = vIn * s + 0.5 * acc * s * s
          return H(onRing(aLand - along / (RIM_R - FLOOR)))
        },
        landed,
        T_END,
        16,
      ),
    )
    // The seam, exactly.
    segs[segs.length - 1].to = EXIT_AT

    const lane: Lane = { segs, fire: b(105) }
    return {
      cells: box(-17, -7, 9.8, 4.8),
      exit: [EXIT_AT[0] + 0.5, EXIT_AT[1]],
      lane,
      state: { edge, outOfClock, landed, landX: land[0] },
      changes: [{ at: 0, ghost: false }],
    }
  },
  (slot): PartShot[] => [
    // Act I's last framing: the room, the case, the ball on the top shelf.
    { t: slot.begin, cells: 2.9, hold: toL([0.75, -2.55]), w: 1 },
    // Out to the house on its plinth, and the ground curving up either side of it.
    { t: cue(109), cells: 9.5, hold: toL([3.65, -2.25]), w: 1 },
    // The whole ring.
    { t: cue(112), cells: 46, hold: toL(AX), w: 1 },
    // Back in, to the front door.
    { t: cue(114), cells: 5, hold: toL([8.6, -0.55]), w: 1 },
    { t: cue(115.6), cells: 5, hold: toL([10.2, -0.8]), w: 0.6 },
  ],
)

/* ------------------------------------------------------------------ drawing */

const rect = (p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0): void => {
  p.rect(((x0 + x1) / 2) * k, ((y0 + y1) / 2) * k, Math.abs(x1 - x0) * k, Math.abs(y1 - y0) * k, r * k)
}

function drawAll(p: p5, s: ReplicaState, c: Ctx): void {
  const { k } = c
  const t = c.t
  p.push()
  p.translate(O[0] * k, O[1] * k)
  drawFields(p, c)
  // Act I's house, as it stood; its window full of the station's day. Its footing goes into the plinth, so
  // nothing of it is drawn below the ring's ground.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(-3 * k, -9 * k)
  ctx.lineTo(12 * k, -9 * k)
  for (let x = 12; x >= -3; x -= 0.25) ctx.lineTo(x * k, groundY(x) * k)
  ctx.closePath()
  ctx.clip()
  house.draw?.(p, null, { ...c, t: 1.5 + 4.5 * smooth(t, 0.05, 0.9) })
  ctx.restore()
  drawPlinth(p, c)
  drawAwning(p, c)
  drawCase(p, s, c, t)
  // The museum keeps Murph's toy robot where it stood, its arm out.
  drawRobot(p, c, TOY_HOME[0], TOY_HOME[1])
  drawDumbwaiter(p, c, t)
  drawClock(p, c, t)
  drawTurnstile(p, c, t)
  drawDust(p, s, c, t)
  p.pop()
}

/**
 * The cut from Act I is one room waking up. Act I left it at dusk, darkest away from the ghost; the first frame
 * here is that same dark. On the organ's accent the station's lamps strike, one catches late and dips it again,
 * and then the day comes up over half a second.
 */
function duskAt(t: number): number {
  if (t < 0) return 1
  if (t < 0.04) return 1 - 0.62 * (t / 0.04)
  if (t < 0.09) return 0.38
  if (t < 0.13) return 0.68
  if (t < 0.17) return 0.34
  return 0.34 * (1 - easeOutCubic(clamp((t - 0.17) / 0.45)))
}

function drawDusk(p: p5, c: Ctx): void {
  const a = duskAt(c.t)
  if (a <= 0.002) return
  const { k } = c
  const X = (v: number) => v * k
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const deep = (o: number) => {
    const n = parseInt(DARK.deep.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${o * a})`
  }
  // Centred on the ghost's rest, as Act I's is: it is the ball's own light that keeps the dark off it.
  const g = ctx.createRadialGradient(X(-0.5), 0, X(0.12), X(-0.5), 0, X(3.2))
  g.addColorStop(0, deep(0.1))
  g.addColorStop(0.25, deep(0.62))
  g.addColorStop(1, deep(0.92))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
  ctx.restore()
}

/** Beyond the plinth on the left, the farm the station keeps: a field of corn up the curve and a tree. */
function drawFields(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const field = (a0: number, a1: number, seed: number) => {
    const n = Math.max(8, Math.round((a1 - a0) * RIM_R * 7))
    const at = (a: number, h: number): Pt => [AX[0] + (RIM_R - h) * Math.cos(a), AX[1] + (RIM_R - h) * Math.sin(a)]
    // The row: one silhouette, stalks' tassels making its top edge ragged.
    solid(p, ink, weight * 0.8, DUST.leaf)
    p.beginShape()
    p.vertex(X(at(a0, 0)[0]), X(at(a0, 0)[1]))
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n
      const h = 0.78 + 0.1 * hash(i, seed)
      const edge = i === 0 || i === n ? 0.5 : 1
      const [x, y] = at(a, h * edge)
      p.vertex(X(x), X(y))
      if (i < n) {
        const [mx, my] = at(a + (a1 - a0) / n / 2, (h - 0.14) * edge)
        p.vertex(X(mx), X(my))
      }
    }
    p.vertex(X(at(a1, 0)[0]), X(at(a1, 0)[1]))
    p.endShape(p.CLOSE)
    // A nearer row in front, lower and paler.
    solid(p, ink, weight * 0.7, DUST.husk)
    p.beginShape()
    p.vertex(X(at(a0 + 0.004, 0)[0]), X(at(a0 + 0.004, 0)[1]))
    for (let i = 0; i <= n; i++) {
      const a = a0 + 0.004 + ((a1 - a0 - 0.008) * i) / n
      const [x, y] = at(a, (0.42 + 0.06 * hash(i, seed + 3)) * (i === 0 || i === n ? 0.6 : 1))
      p.vertex(X(x), X(y))
    }
    p.vertex(X(at(a1 - 0.004, 0)[0]), X(at(a1 - 0.004, 0)[1]))
    p.endShape(p.CLOSE)
  }
  const left = Math.PI / 2 + Math.asin((AX[0] - PL_L) / RIM_R)
  field(left + 0.03, left + 0.2, 3)
  field(left + 0.29, left + 0.62, 7)
  // A cottonwood between the fields.
  standOnRim(p, k, AX, left + 0.245, () => {
    solid(p, ink, weight, DUST.wood)
    p.quad(X(-0.07), 0, X(-0.04), X(-0.9), X(0.04), X(-0.9), X(0.07), 0)
    solid(p, ink, weight, DUST.sage)
    p.circle(X(-0.22), X(-1.05), X(0.6))
    p.circle(X(0.2), X(-1.12), X(0.66))
    p.circle(X(0), X(-1.38), X(0.62))
  })
}

/** The museum's plinth: the bottom of the ring filled flat to the ground floor, paved, in stone. */
function drawPlinth(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const n = 40
  solid(p, ink, weight, DUST.shade)
  p.beginShape()
  p.vertex(X(PL_L), X(DOWN))
  p.vertex(X(WALL_L), X(DOWN))
  p.vertex(X(WALL_L), X(DOWN + 0.16))
  p.vertex(X(WALL_R), X(DOWN + 0.16))
  p.vertex(X(WALL_R), X(DOWN))
  p.vertex(X(PL_R), X(DOWN))
  for (let i = 0; i <= n; i++) {
    const x = PL_R + ((PL_L - PL_R) * i) / n
    p.vertex(X(x), X(groundY(x)))
  }
  p.endShape(p.CLOSE)
  // Courses of stone, cut to the curve.
  outline(p, ink, weight * 0.5)
  for (const y of [0.52, 0.86]) {
    const half = Math.sqrt(Math.max(0, RIM_R * RIM_R - (y - AX[1]) ** 2))
    const x0 = Math.max(PL_L, AX[0] - half)
    const x1 = Math.min(PL_R, AX[0] + half)
    if (x1 > x0) p.line(X(x0), X(y), X(x1), X(y))
  }
  for (let x = PL_L + 0.45, i = 0; x < PL_R - 0.2; x += 0.9, i++) {
    const y0 = i % 2 ? DOWN + 0.1 : 0.52
    const y1 = i % 2 ? 0.52 : 0.86
    if (groundY(x) > y1) p.line(X(x), X(y0), X(x), X(y1))
  }
  // The paving on top, its nose over the ends.
  solid(p, ink, weight, DUST.bone)
  rect(p, k, PL_L - 0.05, DOWN, WALL_L, DOWN + 0.09)
  rect(p, k, WALL_R, DOWN, PL_R + 0.05, DOWN + 0.09)
  // The house's walls stand on it.
  solid(p, ink, weight, DUST.bone)
  rect(p, k, WALL_L - 0.065, DOWN, WALL_L + 0.065, DOWN + 0.16)
  rect(p, k, WALL_R - 0.065, DOWN + 0.02, WALL_R + 0.065, DOWN + 0.16)
  // A bronze plaque with nothing on it.
  solid(p, ink, weight * 0.8, DUST.corn)
  rect(p, k, AX[0] - 0.36, 0.4, AX[0] + 0.36, 0.72, 0.02)
  outline(p, ink, weight * 0.5)
  rect(p, k, AX[0] - 0.29, 0.46, AX[0] + 0.29, 0.66)
}

/** A little roof over the front door on a strut: what is left of the porch, on a museum's plinth. */
function drawAwning(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const x0 = WALL_R + 0.065
  const x1 = WALL_R + 0.85
  const y0 = -1.44
  const y1 = -1.24
  // The strut, from the wall up under the roof's middle.
  p.stroke(ink)
  p.strokeWeight(X(0.05) + weight * 1.6)
  p.line(X(x0), X(-0.98), X(x0 + 0.42), X(y0 + 0.42 * ((y1 - y0) / (x1 - x0)) + 0.02))
  p.stroke(DUST.wood)
  p.strokeWeight(Math.max(1, X(0.05)))
  p.line(X(x0), X(-0.98), X(x0 + 0.42), X(y0 + 0.42 * ((y1 - y0) / (x1 - x0)) + 0.02))
  solid(p, ink, weight, DUST.rust)
  p.quad(X(x0 - 0.02), X(y0 - 0.09), X(x1 + 0.06), X(y1 - 0.09), X(x1 + 0.06), X(y1), X(x0 - 0.02), X(y0))
  outline(p, ink, weight * 0.5)
  for (let i = 1; i < 5; i++) {
    const x = x0 + ((x1 - x0) * i) / 5
    const y = y0 + ((y1 - y0) * i) / 5
    p.line(X(x), X(y - 0.09), X(x), X(y))
  }
}

/* ------------------------------------------------------------------ the case */

function spine(p: p5, c: Ctx, x: number, foot: number, w: number, h: number, color: string): void {
  const { k, ink, weight } = c
  p.push()
  p.translate(x * k, foot * k)
  solid(p, ink, weight * 0.9, color)
  p.rect(0, (-h / 2) * k, w * k, h * k, 0.008 * k)
  outline(p, ink, weight * 0.55)
  p.line((-w / 2) * k, (-h + 0.035) * k, (w / 2) * k, (-h + 0.035) * k)
  p.line((-w / 2) * k, -0.035 * k, (w / 2) * k, -0.035 * k)
  if (h > 0.26) p.rect(0, -h * 0.55 * k, w * 0.5 * k, 0.05 * k)
  p.pop()
}

/** The flap in the case's side, swung out on its top hinge as the ball goes through, and back shut with a knock or two. */
function doorSwing(t: number, edge: number): number {
  const s = t - edge + 0.1
  if (s < 0) return 0
  if (s < 0.2) return 1.05 * easeOutCubic(s / 0.2)
  return 1.05 * Math.exp(-(s - 0.2) / 0.22) * Math.abs(Math.cos((s - 0.2) * 7.5))
}

/** The replica bookcase, as Act I's room had it at the end: the same books, the one on the floor, the watch. */
function drawCase(p: p5, s: ReplicaState, c: Ctx, t: number): void {
  const { k, ink, weight: w } = c
  const X = (v: number) => v * k
  const L = CASE_L
  const Rr = CASE_R
  p.push()
  p.translate(0, X(-2))
  solid(p, ink, w, DUST.shade)
  rect(p, k, L, CAP, Rr, FLOOR)
  solid(p, ink, w, DUST.wood)
  rect(p, k, L, CAP, L + 0.07, FLOOR)
  // The right-hand side, and the flap in it.
  const swing = doorSwing(t, s.edge)
  if (Math.abs(swing) <= 0.001) {
    rect(p, k, Rr - 0.07, CAP, Rr, FLOOR)
    p.stroke(alpha(p, ink, 0.35))
    p.strokeWeight(Math.max(0.6, w * 0.4))
    p.line(X(Rr - 0.065), X(DOOR_TOP), X(Rr - 0.005), X(DOOR_TOP))
    p.line(X(Rr - 0.065), X(DOOR_BOT), X(Rr - 0.005), X(DOOR_BOT))
  } else {
    rect(p, k, Rr - 0.07, CAP, Rr, DOOR_TOP)
    rect(p, k, Rr - 0.07, DOOR_BOT, Rr, FLOOR)
  }
  rect(p, k, L - 0.05, CAP - 0.065, Rr + 0.05, CAP + 0.005)
  rect(p, k, L + 0.07, MIDY, Rr - 0.07, MIDY + 0.05)
  rect(p, k, L + 0.07, FLOOR - 0.08, Rr - 0.07, FLOOR)
  // The top board: fixed as far as the last book, then the flap on its hinge.
  const th = tailAngle(t)
  if (t < 0.06) rect(p, k, L + 0.07, SHELF_TOP, Rr - 0.07, SHELF_TOP + 0.05)
  else {
    rect(p, k, L + 0.07, SHELF_TOP, HINGE[0], SHELF_TOP + 0.05)
    p.push()
    p.translate(X(HINGE[0]), X(HINGE[1]))
    p.rotate(th)
    rect(p, k, 0, -0.025, D_END, 0.025)
    p.pop()
  }
  if (t >= 0.06) {
    solid(p, ink, w * 0.6, DUST.tin)
    p.circle(X(HINGE[0]), X(HINGE[1]), X(0.035))
  }

  // The middle shelf, the bottom one, as they were.
  const mid = [
    [0.1, 0.3, DUST.denim], [0.09, 0.32, DUST.bone], [0.12, 0.28, DUST.rust], [0.08, 0.3, DUST.sage], [0.1, 0.34, DUST.corn],
    [0.11, 0.3, DUST.teal], [0.09, 0.26, DUST.rust], [0.12, 0.33, DUST.bone],
  ] as const
  let x = L + 0.1
  for (const [bw, bh, col] of mid) {
    spine(p, c, x + bw / 2, MIDY, bw, bh, col)
    x += bw + 0.01
  }
  p.push()
  p.translate(X(x + 0.17), X(MIDY))
  p.rotate(0.45)
  p.translate(-X(x + 0.17), -X(MIDY))
  spine(p, c, x + 0.17, MIDY, 0.1, 0.3, DUST.sage)
  p.pop()
  solid(p, ink, w, DUST.light)
  p.rect(X(1.55), X(MIDY + 0.05 + 0.13), X(0.18), X(0.22), X(0.02))
  outline(p, ink, w * 0.8)
  for (const dx of [-0.04, 0.0, 0.05]) p.line(X(1.55 + dx), X(MIDY + 0.1), X(1.55 + dx * 1.8), X(MIDY - 0.02))
  for (let j = 0; j < 3; j++) {
    solid(p, ink, w, [DUST.teal, DUST.rust, DUST.corn][j])
    p.rect(X(-0.1 + j * 0.03), X(FLOOR - 0.08 - 0.045 - j * 0.09), X(0.5 - j * 0.06), X(0.09))
  }
  solid(p, ink, w, DUST.sage)
  p.rect(X(0.85), X(FLOOR - 0.08 - 0.13), X(0.4), X(0.26), X(0.01))
  const BOOKS = [DUST.rust, DUST.teal, DUST.corn, DUST.denim, DUST.sage, DUST.bone]
  for (let j = 0; j < 5; j++) spine(p, c, 1.3 + j * 0.1, FLOOR - 0.08, 0.09, 0.28 - (j % 2) * 0.03, BOOKS[(j + 2) % 6])

  // The lander, and the top row, all but the one that went.
  outline(p, ink, w * 0.7)
  for (const sgn of [-1, 1]) p.line(X(-0.13 + sgn * 0.04), X(SHELF_TOP - 0.07), X(-0.13 + sgn * 0.09), X(SHELF_TOP))
  solid(p, ink, w * 0.8, DUST.corn)
  p.rect(X(-0.13), X(SHELF_TOP - 0.08), X(0.12), X(0.06))
  solid(p, ink, w * 0.8, DUST.bone)
  p.beginShape()
  for (const [lx, ly] of [[-0.18, -0.11], [-0.08, -0.11], [-0.095, -0.17], [-0.165, -0.17]] as Pt[]) p.vertex(X(lx), X(SHELF_TOP + ly))
  p.endShape(p.CLOSE)
  for (let i = 0; i < ROW.length; i++) if (i !== GONE) spine(p, c, ROW[i].x, SHELF_TOP, ROW[i].w, ROW[i].h, ROW[i].color)
  // The one that went lies where it fell.
  const fb = ROW[GONE]
  const fx = fb.x + (hash(GONE, 7) - 0.5) * 0.16 + (GONE % 2 ? 0.05 : -0.05)
  p.push()
  p.translate(X(fx), X(FLOOR - fb.w / 2))
  p.rotate(((GONE % 2 ? 1 : -1) * Math.PI) / 2)
  spine(p, c, 0, fb.h / 2, fb.w, fb.h, fb.color)
  p.pop()

  // The flap in the side, swung out on its top hinge.
  if (Math.abs(swing) > 0.001) {
    p.push()
    p.translate(X(Rr - 0.035), X(DOOR_TOP))
    p.rotate(-swing)
    solid(p, ink, w, DUST.wood)
    rect(p, k, -0.035, 0, 0.035, DOOR_BOT - DOOR_TOP)
    p.pop()
  }

  // The watch on the cap, keeping the organ's time: its second hand goes a second a beat.
  const wx = 1.45
  const wy = CAP - 0.11
  solid(p, ink, w * 0.7, DUST.wood)
  p.rect(X(wx - 0.13), X(wy + 0.03), X(0.14), X(0.04), X(0.01))
  p.rect(X(wx + 0.13), X(wy + 0.03), X(0.14), X(0.04), X(0.01))
  solid(p, ink, w * 0.7, DUST.bone)
  p.ellipse(X(wx), X(wy), X(0.13), X(0.1))
  let ticks = 0
  for (let n = 1; n < 400; n++) {
    const s = t - n * CUE2_PERIOD
    if (s < 0) break
    ticks += 1 - Math.exp(-s / 0.03)
  }
  const a = -Math.PI / 2 + 0.95 + (2 * Math.PI) / 30 + (ticks * Math.PI) / 30
  outline(p, ink, w * 0.6)
  p.line(X(wx), X(wy), X(wx + Math.cos(a) * 0.05), X(wy + Math.sin(a) * 0.038))
  p.pop()
}

/* ------------------------------------------------------------------ the dumbwaiter */

function drawDumbwaiter(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight: w } = c
  const X = (v: number) => v * k
  const y = carY(t)
  const deep = mixHex(DUST.shade, DUST.wood, 0.25)
  const dark = mixHex(DUST.shade, ink, 0.28)

  // The two hatches, dark inside: upstairs by the case, and in the kitchen over the cupboard.
  solid(p, ink, w, dark)
  rect(p, k, HATCH.x0, HATCH.y0, HATCH.x1, HATCH.y1)
  rect(p, k, HATCH_DOWN.x0, HATCH_DOWN.y0, HATCH_DOWN.x1, HATCH_DOWN.y1)
  // The cupboard, its door, and the buffer on top.
  solid(p, ink, w, DUST.wood)
  rect(p, k, SH_L - 0.03, CAB_TOP, SH_R + 0.03, DOWN)
  outline(p, ink, w * 0.6)
  rect(p, k, SH_L + 0.06, CAB_TOP + 0.1, SH_R - 0.06, DOWN - 0.08)
  solid(p, ink, w * 0.6, DUST.bone)
  p.circle(X(SH_R - 0.13), X((CAB_TOP + DOWN) / 2), X(0.035))
  const squash = y > CAR_DOWN ? clamp((y - CAR_DOWN) / 0.06) : 0
  // The counterweight in its channel: in the wall while the car is up; it comes up into the hatch as the car goes down.
  const cw = cwTop(t)
  outline(p, ink, w * 0.6)
  p.line(X(CW_X), X(cw), X(CW_X), X(HATCH.y0))
  solid(p, ink, w * 0.8, mixHex(DUST.tin, ink, 0.35))
  rect(p, k, CW_X - 0.035, cw, CW_X + 0.035, cw + CW_H, 0.01)
  solid(p, ink, w * 0.8, '#3A3F3A')
  rect(p, k, CAR_MID - 0.12, CAB_TOP - 0.035 + 0.02 * squash, CAR_MID + 0.12, CAB_TOP)

  // The car: a box with no front, its floor sloped to the gate; the rope from its roof up into the wall.
  const top = y - CAR_H
  outline(p, ink, w * 0.6)
  p.line(X(CAR_MID), X(top - 0.02), X(CAR_MID), X(Math.max(top - 1, EAVE + 0.12)))
  solid(p, ink, w * 0.8, deep)
  rect(p, k, CAR_L, top, CAR_R, y + 0.04)
  solid(p, ink, w, DUST.wood)
  // Roof, and the floor as a sloped board.
  rect(p, k, CAR_L - 0.01, top - 0.04, CAR_R + 0.01, top + 0.01)
  p.quad(X(CAR_L), X(y - 0.03 - 0.01), X(CAR_R), X(y + 0.03 - 0.01), X(CAR_R), X(y + 0.06), X(CAR_L), X(y + 0.02))
  // A post at the top corner on the case's side (that side is open), and the right-hand wall above the gate.
  rect(p, k, CAR_L - 0.01, top, CAR_L + 0.03, top + 0.12)
  rect(p, k, CAR_R - 0.03, top, CAR_R + 0.01, y + 0.03 - GATE)
  // The gate: up, it is the car's right-hand wall; on 107 it drops to a bridge.
  const gd = gateDown(t)
  p.push()
  p.translate(X(CAR_R), X(y + 0.03))
  p.rotate(-Math.PI / 2 + (Math.PI / 2) * gd)
  solid(p, ink, w, DUST.wood)
  rect(p, k, 0, -0.02, GATE, 0.02)
  p.pop()
  solid(p, ink, w * 0.6, DUST.corn)
  p.circle(X(CAR_R), X(y + 0.03), X(0.04))
  // The hatches' doors: papered like the wall, so each is only a hairline until it slides up into the wall.
  jibDoor(p, c, HATCH, smooth(t, 0.1, 0.7), true)
  jibDoor(p, c, HATCH_DOWN, smooth(t, B(106), B(106) + 0.5), false)
}

function jibDoor(p: p5, c: Ctx, h: { x0: number; x1: number; y0: number; y1: number }, open: number, papered: boolean): void {
  const { k, ink, weight: w } = c
  const X = (v: number) => v * k
  const hy1 = h.y1 - (h.y1 - h.y0) * open
  if (hy1 <= h.y0 + 0.01) return
  p.noStroke()
  p.fill(DUST.wall)
  rect(p, k, h.x0, h.y0, h.x1, hy1)
  if (papered) {
    p.stroke(alpha(p, DUST.shade, 0.55))
    p.strokeWeight(Math.max(1, k * 0.012))
    for (let x = WALL_L + 0.2; x < h.x1; x += 0.22) if (x > h.x0) p.line(X(x), X(h.y0), X(x), X(hy1))
  }
  p.stroke(alpha(p, ink, 0.4 + 0.6 * smooth(open, 0, 0.3)))
  p.strokeWeight(Math.max(0.6, w * 0.45))
  p.line(X(h.x0), X(hy1), X(h.x1), X(hy1))
  solid(p, ink, w * 0.5, DUST.corn)
  p.circle(X((h.x0 + h.x1) / 2), X(hy1 - 0.05), X(0.035))
}

/** In front of the ball: the wall the dumbwaiter runs down inside, upstairs, and the floor it goes through. */
function drawCasing(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight: w } = c
  const X = (v: number) => v * k
  p.noStroke()
  p.fill(DUST.wall)
  rect(p, k, SH_L, EAVE + 0.12, SH_R + 0.03, HATCH.y0)
  rect(p, k, SH_L, HATCH.y1, SH_R + 0.03, UP)
  rect(p, k, HATCH.x1, HATCH.y0 - 0.01, SH_R + 0.03, HATCH.y1 + 0.01)
  // The wallpaper's stripes carry on across it.
  p.stroke(alpha(p, DUST.shade, 0.55))
  p.strokeWeight(Math.max(1, k * 0.012))
  for (let x = WALL_L + 0.2; x < SH_R + 0.03; x += 0.22) {
    if (x < SH_L) continue
    p.line(X(x), X(EAVE + 0.12), X(x), X(HATCH.y0))
    p.line(X(x), X(HATCH.y1), X(x), X(UP - 0.02))
    if (x > HATCH.x1) p.line(X(x), X(HATCH.y0), X(x), X(HATCH.y1))
  }
  // Downstairs, plain plaster over the shaft but for the hatch.
  p.noStroke()
  p.fill(DUST.wall)
  rect(p, k, SH_L, CEIL_DOWN, SH_R + 0.03, HATCH_DOWN.y0)
  rect(p, k, HATCH_DOWN.x1, HATCH_DOWN.y0 - 0.01, SH_R + 0.03, CAB_TOP)
  // The floor, cut, across the shaft.
  solid(p, ink, w, DUST.wood)
  rect(p, k, SH_L - 0.02, UP, SH_R + 0.05, UP + 0.16)
  const seenDown = smooth(t, B(106), B(106) + 0.3)
  p.noFill()
  p.stroke(alpha(p, ink, 0.4 + 0.6 * seenDown))
  p.strokeWeight(Math.max(0.6, w * (0.45 + 0.55 * seenDown)))
  rect(p, k, HATCH_DOWN.x0, HATCH_DOWN.y0, HATCH_DOWN.x1, HATCH_DOWN.y1)
  // The hatch's edges: a hairline in the paper at first; its sill comes with the door.
  const seen = smooth(t, 0.1, 0.4)
  p.noFill()
  p.stroke(alpha(p, ink, 0.4 + 0.6 * seen))
  p.strokeWeight(Math.max(0.6, w * (0.45 + 0.55 * seen)))
  rect(p, k, HATCH.x0, HATCH.y0, HATCH.x1, HATCH.y1)
  if (seen > 0.01) {
    p.stroke(alpha(p, ink, seen))
    p.fill(alpha(p, DUST.wood, seen))
    rect(p, k, HATCH.x0 - 0.04, HATCH.y1 - 0.01, HATCH.x1 + 0.04, HATCH.y1 + 0.05)
  }
  // The catch at the hatch: across the car's corner until 106, then up.
  const off = smooth(t, B(106) - 0.04, B(106) + 0.08)
  if (seen <= 0.01) return
  p.push()
  p.translate(X(HATCH.x1 + 0.02), X(CAR_UP - CAR_H - 0.06))
  p.rotate(Math.PI - 1.2 * off)
  solid(p, ink, w * 0.8, DUST.tin)
  rect(p, k, 0, -0.018, 0.14, 0.018, 0.01)
  p.pop()
  solid(p, ink, w * 0.6, DUST.bone)
  p.circle(X(HATCH.x1 + 0.02), X(CAR_UP - CAR_H - 0.06), X(0.035))
}

/* ------------------------------------------------------------------ the clock */

function drawClock(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight: w } = c
  const X = (v: number) => v * k
  const T = ACT2 + t
  const case_ = mixHex(DUST.wood, DUST.rust, 0.25)
  const inside = mixHex(DUST.shade, ink, 0.22)
  // The base and the trunk, its back dark behind the glass.
  solid(p, ink, w, case_)
  rect(p, k, CK_L - 0.04, TRUNK_BOT, CK_R + 0.04, DOWN)
  solid(p, ink, w, inside)
  rect(p, k, CK_L, HOOD_BOT, CK_R, TRUNK_BOT)
  // The pendulum, behind everything else in there.
  const th = pendulum(T)
  const bob: Pt = [PIVOT[0] + Math.sin(th) * PEND, PIVOT[1] + Math.cos(th) * PEND]
  outline(p, ink, w * 0.7)
  p.stroke(mixHex(DUST.corn, ink, 0.3))
  p.strokeWeight(Math.max(1, w * 0.9))
  p.line(X(PIVOT[0]), X(PIVOT[1]), X(bob[0]), X(bob[1]))
  solid(p, ink, w * 0.8, DUST.corn)
  p.circle(X(bob[0]), X(bob[1]), X(0.17))
  outline(p, ink, w * 0.4)
  p.circle(X(bob[0]), X(bob[1]), X(0.09))
  // The ledge from the side door.
  solid(p, ink, w * 0.8, DUST.wood)
  rect(p, k, CK_L, LEDGE_Y, CK_L + 0.5, LEDGE_Y + 0.035)
  // The weight, on its line from the works: a brass drum, and the tray on it that carries the ball.
  const ty = trayY(t)
  outline(p, ink, w * 0.6)
  p.line(X(ON_TRAY_X - 0.04), X(ty - 0.02), X(ON_TRAY_X - 0.04), X(HOOD_BOT))
  solid(p, ink, w * 0.8, DUST.corn)
  rect(p, k, ON_TRAY_X - 0.13, ty + 0.03, ON_TRAY_X + 0.03, ty + 0.2, 0.02)
  outline(p, ink, w * 0.45)
  p.line(X(ON_TRAY_X - 0.13), X(ty + 0.08), X(ON_TRAY_X + 0.03), X(ty + 0.08))
  p.line(X(ON_TRAY_X - 0.13), X(ty + 0.15), X(ON_TRAY_X + 0.03), X(ty + 0.15))
  solid(p, ink, w * 0.8, mixHex(DUST.corn, DUST.tin, 0.5))
  p.quad(X(ON_TRAY_X - 0.2), X(ty - 0.05), X(ON_TRAY_X - 0.17), X(ty + 0.03), X(CK_R - WALLW), X(ty + 0.03), X(CK_R - WALLW), X(ty))
  // The side walls: a door on the left at the ledge, and the one on the right that holds the ball in.
  solid(p, ink, w, case_)
  rect(p, k, CK_L - 0.01, LEDGE_Y + 0.03, CK_L + WALLW, TRUNK_BOT)
  rect(p, k, CK_R - WALLW, HOOD_BOT, CK_R + 0.01, SPOUT_HINGE[1] - SPOUT)
  rect(p, k, CK_R - WALLW, SPOUT_HINGE[1], CK_R + 0.01, TRUNK_BOT)
  p.push()
  p.translate(X(SPOUT_HINGE[0]), X(SPOUT_HINGE[1]))
  p.rotate(spoutAngle(t))
  rect(p, k, 0, -0.025, SPOUT, 0.025)
  p.pop()
  // The hood, with its arch, and the face.
  solid(p, ink, w, case_)
  rect(p, k, CK_L - 0.05, HOOD_TOP + 0.1, CK_R + 0.05, HOOD_BOT)
  p.arc(X(CK_MID), X(HOOD_TOP + 0.12), X(CK_R - CK_L - 0.16), X(0.2), Math.PI, 2 * Math.PI, p.CHORD)
  rect(p, k, CK_L - 0.07, HOOD_BOT - 0.03, CK_R + 0.07, HOOD_BOT + 0.02)
  solid(p, ink, w * 0.8, DUST.bone)
  const face: Pt = [CK_MID, -1.41]
  p.circle(X(face[0]), X(face[1]), X(0.32))
  outline(p, ink, w * 0.45)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    p.line(X(face[0] + Math.cos(a) * 0.12), X(face[1] + Math.sin(a) * 0.12), X(face[0] + Math.cos(a) * 0.145), X(face[1] + Math.sin(a) * 0.145))
  }
  // Ten past two; the minute hand creeps.
  const minute = -Math.PI / 2 + ((10 + T / 60) / 60) * Math.PI * 2
  outline(p, ink, w * 0.7)
  p.line(X(face[0]), X(face[1]), X(face[0] + Math.cos(minute) * 0.12), X(face[1] + Math.sin(minute) * 0.12))
  p.line(X(face[0]), X(face[1]), X(face[0] + Math.cos(-0.45) * 0.075), X(face[1] + Math.sin(-0.45) * 0.075))
}

/** The clock's glass, over the ball inside it. */
function drawGlass(p: p5, c: Ctx): void {
  const { k, ink, weight: w } = c
  const X = (v: number) => v * k
  p.noStroke()
  p.fill(alpha(p, DUST.light, 0.18))
  rect(p, k, CK_L + WALLW + 0.02, HOOD_BOT + 0.05, CK_R - WALLW - 0.02, TRUNK_BOT - 0.05)
  p.stroke(alpha(p, DUST.light, 0.55))
  p.strokeWeight(Math.max(1, w * 0.8))
  p.line(X(CK_L + 0.14), X(TRUNK_BOT - 0.2), X(CK_L + 0.34), X(HOOD_BOT + 0.35))
  outline(p, ink, w * 0.5)
  rect(p, k, CK_L + WALLW + 0.02, HOOD_BOT + 0.05, CK_R - WALLW - 0.02, TRUNK_BOT - 0.05)
}

/* ------------------------------------------------------------------ the turnstile */

function drawTurnstile(p: p5, c: Ctx, t: number): void {
  const { k, ink, weight: w } = c
  const X = (v: number) => v * k
  const rot = turnstile(t)
  // Its post: a waist-high box, a brass cap, and a counter that turns over with every visitor.
  solid(p, ink, w, mixHex(DUST.wood, ink, 0.15))
  rect(p, k, TS_BODY.x0, TS_BODY.y0, TS_BODY.x1, DOWN, 0.02)
  outline(p, ink, w * 0.5)
  rect(p, k, TS_BODY.x0 + 0.05, TS_BODY.y0 + 0.28, TS_BODY.x1 - 0.05, DOWN - 0.05)
  solid(p, ink, w, DUST.corn)
  rect(p, k, TS_BODY.x0 - 0.03, TS_BODY.y0 - 0.05, TS_BODY.x1 + 0.03, TS_BODY.y0 + 0.02, 0.015)
  solid(p, ink, w * 0.6, DUST.bone)
  const win = { x0: TS_BODY.x0 + 0.08, x1: TS_BODY.x0 + 0.2, y0: TS_BODY.y0 + 0.09, y1: TS_BODY.y0 + 0.19 }
  rect(p, k, win.x0, win.y0, win.x1, win.y1)
  outline(p, ink, w * 0.45)
  const roll = (rot / ((2 * Math.PI) / 3)) * 0.05
  for (let i = -2; i <= 3; i++) {
    const yy = win.y0 + 0.025 + i * 0.05 + roll
    if (yy > win.y0 + 0.01 && yy < win.y1 - 0.01) p.line(X(win.x0 + 0.03), X(yy), X(win.x1 - 0.03), X(yy))
  }
  // Three brass arms with knobs on their ends, on a hub on the post's side.
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3 - rot
    const tip: Pt = [TS_HUB[0] + Math.cos(a) * TS_ARM, TS_HUB[1] + Math.sin(a) * TS_ARM]
    p.stroke(ink)
    p.strokeWeight(X(0.055) + w * 1.8)
    p.line(X(TS_HUB[0]), X(TS_HUB[1]), X(tip[0]), X(tip[1]))
    p.stroke(DUST.corn)
    p.strokeWeight(Math.max(1, X(0.055)))
    p.line(X(TS_HUB[0]), X(TS_HUB[1]), X(tip[0]), X(tip[1]))
    solid(p, ink, w * 0.8, DUST.corn)
    p.circle(X(tip[0]), X(tip[1]), X(0.075))
  }
  solid(p, ink, w, DUST.corn)
  p.circle(X(TS_HUB[0]), X(TS_HUB[1]), X(0.15))
  solid(p, ink, w * 0.6, mixHex(DUST.corn, ink, 0.35))
  p.circle(X(TS_HUB[0]), X(TS_HUB[1]), X(0.06))
}

/* ------------------------------------------------------------------ dust */

function drawDust(p: p5, s: ReplicaState, c: Ctx, t: number): void {
  const { k } = c
  const X = (v: number) => v * k
  const puff = (at: number, x: number, y: number, spread = 1, color: string = DUST.shade) => {
    const since = t - at
    if (since < 0 || since > 0.55) return
    const u = since / 0.55
    p.noStroke()
    p.fill(alpha(p, color, 0.85 * (1 - u)))
    for (const side of [-1, 1]) {
      p.circle(X(x + side * (0.1 + u * 0.16) * spread), X(y - 0.03 - u * 0.06), X((0.06 + u * 0.07) * spread))
      p.circle(X(x + side * (0.2 + u * 0.22) * spread), X(y - 0.02 - u * 0.03), X((0.04 + u * 0.05) * spread))
    }
  }
  puff(B(107), CAR_MID, CAB_TOP, 1.8)
  puff(s.outOfClock, floorAt[0], DOWN, 0.8)
  puff(s.landed, s.landX, groundY(s.landX), 1.2, mixHex(DUST.husk, DUST.shade, 0.5))
}

/* ------------------------------------------------------------------ over the ball */

function drawOver(p: p5, _s: ReplicaState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t
  p.push()
  p.translate(O[0] * k, O[1] * k)
  drawCasing(p, c, t)
  drawGlass(p, c)
  p.pop()
  drawDusk(p, c)
  // The ghost is a ball: its light goes out, and a ring goes out from it.
  if (t < 1.0) {
    const at = toL(caseToHouse(onBoard(D0, 0)))
    const X = at[0] * k
    const Y = at[1] * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const a = 0.5 * (1 - smooth(t, 0, 0.3))
    if (a > 0.005) {
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, 0.45 * k)
      g.addColorStop(0, `rgba(255, 246, 214, ${a})`)
      g.addColorStop(0.35, `rgba(255, 236, 190, ${a * 0.5})`)
      g.addColorStop(1, 'rgba(255, 236, 190, 0)')
      ctx.fillStyle = g
      ctx.fillRect(X - 0.45 * k, Y - 0.45 * k, 0.9 * k, 0.9 * k)
    }
    const u = t / 1.0
    p.noFill()
    p.stroke(alpha(p, DUST.light, 0.9 * (1 - u) * (1 - u)))
    p.strokeWeight(Math.max(1, weight * 2.2 * (1 - u)))
    p.circle(X, Y, (0.32 + easeOutCubic(u) * 1.1) * k)
    p.stroke(alpha(p, ink, 0.35 * (1 - u) * (1 - u)))
    p.strokeWeight(Math.max(0.6, weight * 0.6))
    p.circle(X, Y, (0.32 + easeOutCubic(u) * 1.1) * k + weight * 2.4)
  }
}
