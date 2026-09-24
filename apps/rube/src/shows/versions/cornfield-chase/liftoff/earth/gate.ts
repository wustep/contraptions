import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, puff, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, part, route, smooth, type Companion, type Ctx, type Way } from '../kit'
import { beat } from '../music'
import { G_EARTH, hop } from '../physics'
import { DUST } from '../worlds'
import { drawDrone } from './drone'
import { goldGantry, HALT, LAND, LEAP, OUT, PARK } from './gantry'
import { drawPickup, glassPickup, nearPickup, pickupGlass, pickupPoint, SEAT, type Pickup } from './truck'

/**
 * The fence line, and the gate of the base behind it. A chain of machines,
 * each set off by the ball and each handing it to the next:
 *
 * - The farm track crosses a cattle grid where the stubble ends, and the ball
 *   rattles over its bars on the eighths (101–102.5).
 * - It skips off the last bar into the cup of a well sweep. Its weight trips
 *   the latch (103): the stone on the short end drops, the long end swings the
 *   cup up over the top, and when the stone hits its log (104) the ball is
 *   thrown out onto the top rail of the perimeter fence.
 * - It rolls the rail and clicks over the cap of a post on each beat (105–107),
 *   and drops off the end into the pail on the short end of the barrier arm.
 * - The pail goes down and the arm goes up (108). The pail sets down on the
 *   road (108.5), tips over and lets the ball out (109), and the arm, now
 *   empty, comes down shut on its rest behind the ball (110).
 * - Inside, the ball knocks the paddle of a lever switch (111): the landing
 *   lamps on the bunker roof light, and the drone they chased through the
 *   corn, flying ahead of the ball since the grid, touches down between them
 *   (112). It led them here.
 * - The ball goes through the bunker under it: a spring flap in (113) that
 *   slaps shut behind it (113.5), a flap out (114, 114.5), and on to the foot
 *   of the tower.
 *
 * And the pickup finds him again. It comes up the track behind him from out
 * of shot, the gold ball in the cab, and runs under him as he rolls the rail.
 * It cannot get under the barrier's arm; his pail lifts it (108) and the cab
 * goes under as it goes up, and is through before it comes down (110). Then
 * it keeps pace with him across the apron, past the switch, behind the
 * bunker while he goes through it, and pulls up at the foot of the tower
 * (114.5) as he comes out. The jolt swings the door open; she jumps down.
 *
 * The part's frame: the ball comes in on the ground at (-0.5, 0) and leaves
 * on it; the fence's top rail carries it at y = -2.
 */

/* ------------------------------------------------------------------ the music */

const GRID_HITS = [beat(101), beat(101.5), beat(102), beat(102.5)]
/** Into the sweep's cup: the latch lets go. */
const CUP = beat(103)
/** The stone hits its log and the ball is thrown onto the fence. */
const FLING = beat(104)
const CAPS = [beat(105), beat(106), beat(107)]
/** Into the barrier's pail: the arm goes up. */
const DROP_IN = beat(108)
/** The pail sets down on the road. */
const SET = beat(108.5)
/** It tips over and the ball rolls out. */
const TIP = beat(109)
/** The empty arm comes down on its rest. */
const SHUT = beat(110)
/** The ball throws the switch: the landing lamps. */
const THROW = beat(111)
/** The drone's wheels on the bunker roof. */
const TOUCH = beat(112)
const FLAPS = [beat(113), beat(114)]
const SLAPS = [beat(113.5), beat(114.5)]

export const GATE_HITS = [...GRID_HITS, CUP, FLING, ...CAPS, DROP_IN, SET, TIP, SHUT, THROW, TOUCH, FLAPS[0], SLAPS[0], FLAPS[1], SLAPS[1]]

/* ------------------------------------------------------------------ the machines */

/** Paces, cells a second: in off the combine, over the grid, along the rail, across the apron, and out. */
const V_IN = 2.6
const V_HOP = 2.5
const V_RAIL = 2.2
const V_ROLL = 2.4
const V_OUT = 2.0

/** The grid's bars, three to the ball's skip. */
const SKIP = V_HOP * (beat(0.5) - beat(0))
const BAR_R = 0.045
const PIT = 0.34

/** The sweep: its long arm (the cup's), its short arm (the stone's), where the ball sits in the cup, and its swing. */
const SW_L = 1.5
const SW_S = 0.55
const CUP_C = 0.12
const A0 = (143 / 180) * Math.PI
const A1 = (300 / 180) * Math.PI
const STONE = 0.17

/** The fence: the ball's centre on its top rail, and the rail's top. */
const Y_RAIL = -2.0
const RAIL = Y_RAIL + R
/** Seconds the thrown ball takes to settle onto the rail. */
const SETTLE = 0.05
/** The sprung dog on each post's top: its length, and how it stands, leaning forward. */
const DOG = 0.27
const DOG_UP = -1.0
/** How far ahead of the cap's centre the ball's centre is when it meets it. */
const CAP_MEET = 0.12

/** The barrier: its pivot's height, its arms, how far it lifts, and the pail on the short end. */
const GY = -1.35
const SHORT = 1.0
const LONG = 1.35
const UP = (80 / 180) * Math.PI
const BAIL = 0.235
const PAIL_D = 0.26
const PAIL_TOP = 0.32
const PAIL_BOT = 0.24
/** From the pail's pin to the ball's centre in it. */
const IN_PAIL = BAIL + PAIL_D - 0.15


/** The bunker: its tunnel, its roof, its flaps. */
const TUNNEL = 0.42
const ROOF = FLOOR - 1.1
const FLAP = 0.38

/** The drone: from its pod's centre down to its wheels, its pace, and where it flies. */
const GEAR = 0.25
const V_DRONE = 2.4
const APPEAR = beat(102.25)
const LEVEL = beat(105)
const FINAL = beat(109.75)
const HIGH = -3.45
const ROLLOUT = 0.32

interface GateState {
  begin: number
  /** Show time the ball leaves for the gantry, which has the pickup from then on. */
  end: number
  /** Every bar of the grid, and the four the ball skips on. */
  bars: number[]
  struck: number[]
  pit: [number, number]
  /** The sweep's pivot. */
  sweep: Pt
  /** Where the ball comes onto the rail, and the rail's pace clock starts. */
  rail0: number
  /** The fence's posts, and where the dogs it clicks over stand. */
  posts: number[]
  caps: number[]
  railEnd: number
  /** The barrier's pivot x (at height GY). */
  gate: number
  /** Where the ball rolls out of the tipped pail. */
  out: number
  sw: number
  /** The bunker's two faces, where the flaps hang. */
  bunker: [number, number]
  /** Where the drone's wheels touch. */
  touch: number
  exit: number
  /** Where the pickup stops at the tower's foot: the back of its bed. */
  park: number
}

/* ------------------------------------------------------------------ the pickup */

/**
 * The pickup's pace, in show seconds and cells a second: in fast from behind,
 * easing off as it comes up to the barrier, through under the arm as it goes
 * up, then his pace across the apron, and it pulls up at the tower's foot.
 */
const PACE: [number, number][] = [[beat(105.5), 5.0], [beat(107.25), 2.8], [beat(110.25), 2.8], [beat(111), 2.43], [beat(114.5), 2.43], [HALT, 0]]
const WHEEL = 0.25
const WHEELS = [0.55, 2.42]

/** How far short of its stop the pickup is at show time `t`: the pace, integrated from `t` to the stop. */
function shortOf(t: number): number {
  const k = PACE
  if (t >= k[k.length - 1][0]) return 0
  let d = 0
  let from = t
  if (from < k[0][0]) {
    d += k[0][1] * (k[0][0] - from)
    from = k[0][0]
  }
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, v0] = k[i]
    const [t1, v1] = k[i + 1]
    if (from >= t1) continue
    const a = Math.max(from, t0)
    const va = v0 + ((v1 - v0) * (a - t0)) / (t1 - t0)
    d += ((va + v1) / 2) * (t1 - a)
  }
  return d
}

/** 1 while a wheel at `x` is over the cattle grid, eased in and out at its lips. */
const onGrid = (s: GateState, x: number): number => smooth(x, s.pit[0] - 0.08, s.pit[0] + 0.08) * (1 - smooth(x, s.pit[1] - 0.08, s.pit[1] + 0.08))

/** The pickup at the gate at show time `t`. */
function truckAt(s: GateState, t: number): Pickup {
  const rear = s.park - shortOf(t)
  // It dips its nose as it slows (each change of pace eased in over a moment), and pitches and settles when it stops.
  let pitch = 0
  for (let i = 0; i < PACE.length - 1; i++) {
    const [t0, v0] = PACE[i]
    const [t1, v1] = PACE[i + 1]
    const a = (v1 - v0) / (t1 - t0)
    pitch -= 0.0045 * a * (smooth(t, t0, t0 + 0.12) - smooth(t, t1, t1 + 0.12))
  }
  const halt = t - HALT
  if (halt > 0) pitch += 0.02 * Math.exp(-halt / 0.2) * Math.sin(halt * 16 + 0.5)
  // It rattles over the cattle grid, and trembles while it runs.
  let lift = t < HALT + 0.3 ? 0.004 * Math.sin(t * 90) : 0
  for (const w of WHEELS) lift += 0.012 * onGrid(s, rear + w) * Math.abs(Math.sin(t * 47 + w))
  const door = halt > 0 ? clamp(halt / 0.14) * (2 - clamp(halt / 0.14)) + 0.07 * Math.exp(-halt / 0.15) * Math.sin(halt * 24) : 0
  return { rear, road: FLOOR, pitch, lift, air: 0, turn: (rear - s.park) / WHEEL, door, lamp: 1 - smooth(t, HALT + 0.2, HALT + 0.5) }
}

/**
 * Where she sits in the cab (u, v), at the gate: leaning into it as the truck
 * slows for the barrier, a rattle over the grid, and thrown against the dash
 * when it pulls up at the tower.
 */
function seatGate(s: GateState, t: number): Pt {
  let u = SEAT[0] + 0.035 * (smooth(t, PACE[0][0], PACE[1][0]) - smooth(t, PACE[1][0], PACE[1][0] + 0.5))
  let v = SEAT[1]
  const rear = s.park - shortOf(t)
  for (const w of WHEELS) v += 0.018 * onGrid(s, rear + w) * Math.abs(Math.sin(t * 31 + w))
  const brake = PACE[PACE.length - 2][0]
  u += 0.13 * smooth(t, brake, HALT) - 0.08 * smooth(t, HALT, HALT + 0.25)
  return [u, v]
}

/** The gold ball at the gate, in its frame: in the cab, then out of it and down onto the road behind him, and after him. */
function goldGate(s: GateState, t: number): Companion | null {
  if (t < LEAP) {
    const [u, v] = seatGate(s, t)
    const [x, y] = pickupPoint(truckAt(s, t), u, v)
    return { x, y }
  }
  if (t < OUT) {
    const [su, sv] = seatGate(s, LEAP)
    const from = pickupPoint(truckAt(s, LEAP), su, sv)
    const to: Pt = [s.exit + LAND[0], LAND[1]]
    const T = OUT - LEAP
    const w = (t - LEAP) / T
    const arc = (G_EARTH * T * T) / 8
    return { x: from[0] + (to[0] - from[0]) * w, y: from[1] + (to[1] - from[1]) * w - arc * 4 * w * (1 - w) }
  }
  const [x, y] = goldGantry(t)
  return { x: x + s.exit, y }
}

/** The sweep's long arm, radians (y down), at show time `t`: resting down to the left, then over the top onto its log. */
function sweepAngle(t: number): number {
  if (t <= CUP) return A0
  const T = FLING - CUP
  const s = t - CUP
  // The stone falls from rest: slow away, fast at the end.
  if (s < T) return A0 + (A1 - A0) * (s / T) ** 2
  const k = s - T
  return A1 - 0.07 * Math.exp(-k / 0.1) * Math.abs(Math.sin(k * 26))
}

/** Where the ball sits in the sweep's cup for an arm at `a`: off the end, toward the cup's open side. */
const cupBall = (pivot: Pt, a: number): Pt => [pivot[0] + SW_L * Math.cos(a) - CUP_C * Math.sin(a), pivot[1] + SW_L * Math.sin(a) + CUP_C * Math.cos(a)]

/** The barrier's arm, radians: 0 shut (long end level to the right), negative raised. */
function armAngle(t: number): number {
  if (t <= DROP_IN) return 0
  if (t <= SET) {
    // Kicked down by the ball's fall, and still going when the pail thumps onto the road.
    const u = (t - DROP_IN) / (SET - DROP_IN)
    return -UP * (0.5 * u + 0.5 * (1 - (1 - u) * (1 - u)))
  }
  const back = TIP + 0.1
  if (t <= back) return -UP
  if (t <= SHUT) return -UP * (1 - easeInQuad((t - back) / (SHUT - back)))
  const k = t - SHUT
  return -0.1 * Math.exp(-k / 0.12) * Math.abs(Math.sin(k * 22))
}

/** The pail's pin, on the end of the short arm. */
const pinAt = (gate: number, t: number): Pt => {
  const b = armAngle(t)
  return [gate - SHORT * Math.cos(b), GY - SHORT * Math.sin(b)]
}

/** How far the pail has tipped over on the road (0 upright, π/2 on its side), and how it swings on its bail once empty. */
function pailTip(t: number): number {
  if (t <= SET) return 0
  if (t <= TIP) return (Math.PI / 2) * easeInQuad((t - SET) / (TIP - SET))
  return (Math.PI / 2) * (1 - smooth(t, TIP + 0.12, TIP + 0.4))
}
function pailSwing(t: number): number {
  if (t < DROP_IN) return 0
  if (t < SET) return -0.12 * Math.sin(((t - DROP_IN) / (SET - DROP_IN)) * Math.PI)
  const k = t - (TIP + 0.4)
  if (k < 0) return 0
  return 0.3 * Math.exp(-k / 0.6) * Math.sin(k * 7.5)
}

/** A spring flap, radians from hanging: pushed up by the ball on its beat, falling back to slap shut on the eighth after. */
function flapAngle(t: number, hit: number, slap: number): number {
  const s = t - hit
  if (s < 0) return 0
  if (t < slap) {
    const up = easeOutCubic(clamp(s / 0.12))
    const back = easeInQuad(clamp((s - 0.17) / (slap - hit - 0.17)))
    return 1.25 * up * (1 - back)
  }
  const k = t - slap
  return 0.2 * Math.exp(-k / 0.1) * Math.abs(Math.sin(k * 30))
}

/** A dog on the rail: folded flat by the ball on its beat, standing up again behind it with a wobble. */
function dogAngle(t: number, hit: number): number {
  const s = t - hit
  if (s < 0) return DOG_UP
  const pass = 0.18
  if (s < pass) return DOG_UP * (1 - easeOutCubic(clamp(s / 0.06)))
  const u = s - pass
  return DOG_UP * (1 - Math.exp(-u / 0.05) * Math.cos(u * 26))
}

/** The switch's lever: the paddle end's angle, down into the road until it is knocked up and over. */
function leverAngle(t: number): number {
  const rest = (122 / 180) * Math.PI
  const thrown = (-30 / 180) * Math.PI
  if (t <= THROW) return rest
  const s = t - THROW
  return rest + (thrown - rest) * easeOutCubic(clamp(s / 0.1)) + 0.14 * Math.exp(-s / 0.12) * Math.sin(Math.max(0, s - 0.1) * 34)
}

/** The drone: where its pod is, its pitch, how far its wheels are down, and how hard they are pressed, at show time `t`. */
function droneAt(s: GateState, t: number): { p: Pt; pitch: number; gear: number; squash: number } | null {
  if (t < APPEAR) return null
  const pad = ROOF - GEAR
  let x: number
  if (t <= TOUCH) x = s.touch - V_DRONE * (TOUCH - t)
  else {
    const u = Math.min(t - TOUCH, ROLLOUT)
    x = s.touch + V_DRONE * (u - (u * u) / (2 * ROLLOUT))
  }
  let y: number
  let pitch = 0
  let squash = 0
  if (t < LEVEL) {
    y = -6.2 + (HIGH + 6.2) * easeOutCubic((t - APPEAR) / (LEVEL - APPEAR))
    pitch = 0.1 * (1 - smooth(t, APPEAR, LEVEL))
  } else if (t < FINAL) {
    y = HIGH + 0.07 * Math.sin((t - LEVEL) * 2.4)
    pitch = -0.03 * Math.cos((t - LEVEL) * 2.4)
  } else if (t < TOUCH) {
    const u = (t - FINAL) / (TOUCH - FINAL)
    const bob = 0.07 * Math.sin((FINAL - LEVEL) * 2.4) * (1 - u)
    y = HIGH + bob + (pad - HIGH) * (u * u * (3 - 2 * u))
    // Nose down into the glide, and up to flare over the roof.
    pitch = 0.16 * Math.sin(Math.PI * Math.min(1, u * 1.25)) - 0.07 * smooth(u, 0.7, 1)
  } else {
    const k = t - TOUCH
    squash = 0.035 * Math.exp(-k / 0.12) * Math.abs(Math.sin(k * 22 + 0.4))
    y = pad + squash
    // The main wheels first; the nose comes down a moment later.
    pitch = -0.07 * (1 - smooth(k, 0.05, 0.3)) + 0.02 * Math.exp(-Math.max(0, k - 0.3) / 0.15) * Math.sin(Math.max(0, k - 0.3) * 20)
  }
  return { p: [x, y], pitch, gear: smooth(t, beat(110), beat(111)), squash }
}

/* ------------------------------------------------------------------ the part */

export const gate = part<GateState>(
  {
    name: 'gate',
    flight: true,
    draw: (p, s, c) => drawGate(p, s, c),
    over: (p, s, c) => overGate(p, s, c),
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // The grid: the ball meets its first bar on beat 101, and skips three bars at a time.
    const first = -0.5 + V_IN * at(GRID_HITS[0])
    const struck = GRID_HITS.map((_, i) => first + i * SKIP)
    const bars: number[] = []
    for (let j = -1; j <= 10; j++) bars.push(first + (j * SKIP) / 3)
    const pit: [number, number] = [bars[0] - 0.13, bars[bars.length - 1] + 0.13]
    // The sweep's cup rests where the last skip comes down; the pivot follows from the arm.
    const cup0: Pt = [struck[3] + V_HOP * (CUP - GRID_HITS[3]), -0.02]
    const sweep: Pt = [cup0[0] - (SW_L * Math.cos(A0) - CUP_C * Math.sin(A0)), cup0[1] - (SW_L * Math.sin(A0) + CUP_C * Math.cos(A0))]
    const thrown = cupBall(sweep, A1)
    // The rail: the ball comes onto it just past the throw and rolls it at an even pace.
    const rail0 = thrown[0] + 0.1
    const railX = (t: number) => rail0 + V_RAIL * (t - FLING - SETTLE)
    const caps = CAPS.map((t) => railX(t) + CAP_MEET)
    // Off the end, a fall of about a cell into the pail.
    const inPail = GY + IN_PAIL
    const fall = Math.sqrt((2 * (inPail - Y_RAIL)) / G_EARTH)
    const railEnd = railX(DROP_IN - fall)
    const gateX = railX(DROP_IN) + SHORT
    const posts = [rail0 + 0.2, ...caps, railEnd - 0.06]
    // Out of the pail on the road; the switch, the bunker, and the way out.
    const setPin = pinAt(gateX, SET)
    const out = setPin[0] + PAIL_BOT / 2 + 0.15
    const rollX = (t: number) => out + V_ROLL * (t - TIP)
    const sw = rollX(THROW)
    const faceA = rollX(FLAPS[0]) + R
    const faceB = faceA + 1.4
    const leaveB = faceB - R
    const pace = (faceB - faceA) / (FLAPS[1] - FLAPS[0])
    const exitBall = leaveB + ((pace + V_OUT) / 2) * (slot.end - FLAPS[1])
    const s: GateState = {
      begin: slot.begin,
      end: slot.end,
      bars,
      struck,
      pit,
      sweep,
      rail0,
      posts,
      caps,
      railEnd,
      gate: gateX,
      out,
      sw,
      bunker: [faceA, faceB],
      touch: faceA + 0.45,
      exit: exitBall + 0.5,
      park: exitBall + 0.5 + PARK,
    }
    // The pickup's cab has to be short of the short arm until it goes up, and out from under the long one before it comes down.
    const cabFront = s.park - shortOf(DROP_IN) + 2.17
    const cabBack = s.park - shortOf(SHUT - 0.06) + 1.3
    if (cabFront > gateX - SHORT || cabBack < gateX + LONG) console.warn(`liftoff: gate — the pickup meets the barrier's arm (${cabFront.toFixed(2)}, ${cabBack.toFixed(2)} against ${gateX.toFixed(2)})`)

    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: at(GRID_HITS[0]), p: [first, 0] }]
    for (let i = 1; i < struck.length; i++) ways.push(hop(ways[ways.length - 1], [struck[i], 0], at(GRID_HITS[i])))
    ways.push(hop(ways[ways.length - 1], cup0, at(CUP)))
    const segs = [...route(ways)]
    segs.push(...carried((u) => cupBall(sweep, sweepAngle(u + slot.begin)), at(CUP), at(FLING), 24))
    // Onto the rail, along it over the dogs, and off the end.
    const rail: Way[] = [{ at: at(FLING), p: thrown }, { at: at(FLING) + SETTLE, p: [rail0, Y_RAIL] }]
    const bump = (2 * CAP_MEET) / V_RAIL
    for (const t of CAPS) {
      rail.push({ at: at(t), p: [railX(t), Y_RAIL] })
      rail.push({ at: at(t) + bump, p: [railX(t + bump), Y_RAIL], arc: 0.06 })
    }
    rail.push({ at: at(DROP_IN - fall), p: [railEnd, Y_RAIL] })
    rail.push(hop(rail[rail.length - 1], [railX(DROP_IN), inPail], at(DROP_IN)))
    segs.push(...route(rail))
    // Down with the pail, and over with it as it tips.
    const pailBall = (u: number): Pt => {
      const t = u + slot.begin
      if (t <= SET) {
        const [x, y] = pinAt(gateX, t)
        const w = pailSwing(t)
        return [x - IN_PAIL * Math.sin(w), y + IN_PAIL * Math.cos(w)]
      }
      const corner: Pt = [setPin[0] + PAIL_BOT / 2, FLOOR]
      const rel: Pt = [-PAIL_BOT / 2, setPin[1] + IN_PAIL - FLOOR]
      const a = pailTip(t)
      return [corner[0] + rel[0] * Math.cos(a) - rel[1] * Math.sin(a), corner[1] + rel[0] * Math.sin(a) + rel[1] * Math.cos(a)]
    }
    segs.push(...carried(pailBall, at(DROP_IN), at(TIP), 20))
    // Across the apron, the switch in passing, through the bunker, and out to the tower.
    segs.push(
      ...route([
        { at: at(TIP), p: pailBall(at(TIP)) },
        { at: at(TIP) + 0.1, p: [rollX(TIP + 0.1), 0] },
        { at: at(THROW), p: [sw, 0] },
        { at: at(FLAPS[0]), p: [faceA - R, 0] },
        { at: at(FLAPS[1]), p: [leaveB, 0] },
        { at: at(slot.end), p: [exitBall, 0], ramp: [pace, V_OUT] },
      ]),
    )
    return {
      cells: box(-1, -6, s.exit + 3, 2),
      exit: [s.exit, 0],
      lane: { segs, fire: at(GRID_HITS[0]) },
      state: s,
      // She comes in with the pickup, far out of shot behind him, and is handed to the gantry on the road at its door.
      company: [{ from: slot.begin, to: slot.end, at: (t) => goldGate(s, t) }],
    }
  },
  (slot, built) => [
    { t: slot.begin, cells: 5.4, off: [1.0, -1.0] },
    { t: beat(102.5), cells: 5.6, off: [1.2, -1.2] },
    { t: beat(104.2), cells: 5.9, off: [1.3, 0.2] },
    { t: beat(107.4), cells: 5.9, off: [1.1, 0.1] },
    { t: beat(108.8), cells: 5.9, off: [1.3, -1.2] },
    { t: beat(111), cells: 6.0, off: [1.5, -1.4] },
    { t: beat(113), cells: 6.2, off: [1.5, -1.4] },
    // The tower's foot, held nearly still: the pickup pulls up, she jumps down behind him, the cage.
    { t: beat(115.2), cells: 6.4, hold: [built.state.exit - 0.7, -1.2], w: 0.7 },
    { t: slot.end, cells: 6.6, hold: [built.state.exit - 0.5, -1.3], w: 0.6 },
  ],
)

/* ------------------------------------------------------------------ drawing */

/** `bare` draws a thing again over what stands behind it, without its light or its dust (which would double). */
type Draw = { p: p5; k: number; ink: string; weight: number; t: number; X: (x: number) => number; bare?: boolean }

/** A rectangle by its corners. */
function rect4(d: Draw, x0: number, y0: number, x1: number, y1: number): void {
  d.p.rect(d.X((x0 + x1) / 2), d.X((y0 + y1) / 2), d.X(Math.abs(x1 - x0)), d.X(Math.abs(y1 - y0)))
}

function drawGate(p: p5, s: GateState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k
  const d: Draw = { p, k, ink, weight, t, X }
  const f = frame(p, k)
  ground(d, s, f)
  grid(d, s)
  fence(d, s)
  // The pickup, on the track in front of the fence and behind everything of his. (Parked, it is the gantry's.)
  if (t >= s.begin && t < s.end) {
    const pk = truckAt(s, t)
    if (pk.rear < f.x1 + 3 && pk.rear + 5.5 > f.x0) {
      drawPickup(p, k, ink, weight, pk)
      nearPickup(p, k, ink, weight, pk)
      // Once she is out, the glass has nobody behind it.
      if (t >= LEAP) glassPickup(p, k, ink, weight, pk)
    }
  }
  sweep(d, s)
  barrier(d, s)
  lever(d, s)
  bunker(d, s)
  drone(d, s, f)
}

/** The drone, ahead of the ball, and down onto the lamps. */
function drone(d: Draw, s: GateState, f: { x0: number; x1: number; y0: number }): void {
  const { p, k, ink, weight, t } = d
  const dr = droneAt(s, t)
  if (dr && dr.p[0] > f.x0 - 2 && dr.p[0] < f.x1 + 2 && dr.p[1] > f.y0 - 1) {
    const over = dr.p[0] > s.bunker[0] - 0.3 && dr.p[0] < s.bunker[1] + 0.1
    gear(d, dr.p, dr.pitch, dr.gear, dr.squash)
    drawDrone(p, k, ink, weight, dr.p, dr.pitch, 1, d.bare ? null : over ? ROOF : FLOOR)
    if (!d.bare && t >= TOUCH && t < TOUCH + 0.8) {
      const age = t - TOUCH
      p.push()
      p.drawingContext.globalAlpha = 1 - age / 0.8
      for (const side of [-1, 1]) puff(p, k, ink, weight * 0.6, DUST.bone, s.touch + side * (0.12 + age * 0.5), ROOF - 0.05 - age * 0.12, 0.05 + age * 0.08)
      p.pop()
    }
  }
}

/** The ground: stubble off the combine, the track to the gate, and the base's concrete from the gate on. */
function ground(d: Draw, s: GateState, f: { x0: number; x1: number }): void {
  const { p, ink, weight, X } = d
  const pave = s.gate - 0.4
  const end = s.exit + 3
  // The apron: a slab, its edge cut, with joints.
  solid(p, ink, weight, DUST.bone)
  rect4(d, pave, FLOOR, end, FLOOR + 0.16)
  outline(p, ink, weight * 0.5)
  for (let x = pave + 1.1; x < end; x += 1.1) if (x > f.x0 - 1 && x < f.x1 + 1) p.line(X(x), X(FLOOR), X(x), X(FLOOR + 0.16))
  // The track, to either side of the grid.
  outline(p, ink, weight)
  p.line(X(-0.6), X(FLOOR), X(s.pit[0]), X(FLOOR))
  p.line(X(s.pit[1]), X(FLOOR), X(pave), X(FLOOR))
  p.stroke(alpha(p, ink, 0.3))
  for (let i = Math.floor(f.x0 / 0.41); i < f.x1 / 0.41; i++) {
    const x = i * 0.41 + hash(i, 5) * 0.2
    if (x < -0.5 || x > pave - 0.2 || (x > s.pit[0] - 0.2 && x < s.pit[1] + 0.05)) continue
    p.line(X(x), X(FLOOR + 0.08), X(x + 0.13), X(FLOOR + 0.08))
  }
  // Stubble where the field was cut, thinning out toward the fence.
  p.stroke(alpha(p, ink, 0.5))
  p.strokeWeight(Math.max(1, weight * 0.6))
  for (let i = 0; i < 70; i++) {
    const x = -0.5 + i * 0.11 + hash(i, 3) * 0.05
    if (x > s.pit[0] - 0.1 && x < s.pit[1] + 0.1) continue
    if (x > s.sweep[0] + 0.6) break
    if (hash(i, 4) < (x - 3) / 4) continue
    const h = 0.05 + hash(i, 6) * 0.07
    p.line(X(x), X(FLOOR), X(x + 0.012), X(FLOOR - h))
  }
}

/** The cattle grid: a pit across the track and a row of bars over it. The ones the ball skips on ring. */
function grid(d: Draw, s: GateState): void {
  const { p, ink, weight, t, X } = d
  const [x0, x1] = s.pit
  // The pit, cut: dark, between two concrete lips.
  p.noStroke()
  p.fill(alpha(p, ink, 0.72))
  rect4(d, x0, FLOOR, x1, FLOOR + PIT)
  solid(p, ink, weight, DUST.bone)
  rect4(d, x0 - 0.1, FLOOR, x0, FLOOR + PIT + 0.06)
  rect4(d, x1, FLOOR, x1 + 0.1, FLOOR + PIT + 0.06)
  // Grit knocked off the bars the ball strikes, falling into the dark.
  p.noStroke()
  for (let i = 0; i < GRID_HITS.length; i++) {
    const age = t - GRID_HITS[i]
    if (age < 0 || age > 0.45) continue
    for (let j = 0; j < 3; j++) {
      const gx = s.struck[i] + (hash(i, j, 1) - 0.5) * 0.14
      const gy = FLOOR + 0.06 + 0.5 * G_EARTH * age * age * (0.6 + hash(i, j, 2) * 0.4)
      if (gy > FLOOR + PIT) continue
      p.fill(alpha(p, DUST.husk, 1 - age / 0.45))
      p.circle(X(gx), X(gy), X(0.03))
    }
  }
  // The bars, end on.
  for (const bx of s.bars) {
    let shake = 0
    for (let i = 0; i < GRID_HITS.length; i++) if (Math.abs(bx - s.struck[i]) < 0.01) shake = knock(t - GRID_HITS[i], 0.12) * Math.sin((t - GRID_HITS[i]) * 70)
    solid(p, ink, weight * 0.8, DUST.shade)
    p.circle(X(bx), X(FLOOR + BAR_R + 0.005 + shake * 0.02), X(BAR_R * 2))
  }
}

/** The well sweep: a forked post, the pole, the stone on its short end and the cup on its long end, the latch, and the log the stone comes down on. */
function sweep(d: Draw, s: GateState): void {
  const { p, ink, weight, t, X } = d
  const [px, py] = s.sweep
  const a = sweepAngle(t)
  // The log the stone lands on.
  const stoneAt = (ang: number): Pt => [px - SW_S * Math.cos(ang), py - SW_S * Math.sin(ang) + STONE * 0.55]
  const landed = stoneAt(A1)
  solid(p, ink, weight, DUST.wood)
  p.rect(X(landed[0] - 0.05), X(FLOOR - 0.11), X(0.72), X(0.23), X(0.1))
  solid(p, ink, weight * 0.6, DUST.husk)
  p.ellipse(X(landed[0] + 0.28), X(FLOOR - 0.11), X(0.1), X(0.2))
  // The post, forked at the top.
  solid(p, ink, weight, DUST.wood)
  rect4(d, px - 0.065, py + 0.05, px + 0.065, FLOOR)
  outline(p, ink, weight)
  p.line(X(px - 0.06), X(py + 0.07), X(px - 0.12), X(py - 0.08))
  p.line(X(px + 0.06), X(py + 0.07), X(px + 0.12), X(py - 0.08))
  // The latch: a hooked stick on a stake that holds the cup down until the ball lands in it.
  const cupRest = cupBall(s.sweep, A0)
  const stake: Pt = [cupRest[0] - 0.32, FLOOR]
  const freed = t > CUP ? easeOutCubic(clamp((t - CUP) / 0.1)) : 0
  const wob = t > CUP ? 0.25 * Math.exp(-(t - CUP) / 0.25) * Math.sin((t - CUP) * 25) : 0
  outline(p, ink, weight)
  p.line(X(stake[0]), X(FLOOR), X(stake[0]), X(FLOOR - 0.24))
  p.push()
  p.translate(X(stake[0]), X(FLOOR - 0.24))
  p.rotate(-0.15 - 1.1 * freed + wob * freed)
  outline(p, ink, weight * 0.9)
  p.line(0, 0, X(0.3), 0)
  p.line(X(0.3), 0, X(0.3), X(0.07))
  p.pop()
  // The pole, the stone, the cup (its near side is drawn over the ball).
  p.push()
  p.translate(X(px), X(py))
  p.rotate(a)
  solid(p, ink, weight, DUST.wood)
  p.rect(X((SW_L - SW_S) / 2), 0, X(SW_L + SW_S + 0.06), X(0.07), X(0.03))
  // The stone, roped on under the short end: a field boulder.
  p.push()
  p.translate(X(-SW_S), 0)
  p.rotate(-a)
  outline(p, ink, weight * 0.7)
  p.line(X(-0.04), 0, X(-0.1), X(STONE * 0.3))
  p.line(X(0.04), 0, X(0.1), X(STONE * 0.3))
  solid(p, ink, weight, DUST.shade)
  p.beginShape()
  for (let i = 0; i < 9; i++) {
    const q = (i / 9) * Math.PI * 2
    const r = STONE * (0.9 + 0.18 * hash(i, 77))
    p.vertex(X(Math.cos(q) * r * 1.15), X(STONE * 0.55 + Math.sin(q) * r * 0.85))
  }
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.5)
  p.line(X(-STONE * 0.9), X(STONE * 0.45), X(STONE * 0.95), X(STONE * 0.4))
  p.pop()
  // The cup's far side, behind the ball.
  solid(p, ink, weight * 0.9, DUST.rust)
  p.arc(X(SW_L), X(CUP_C), X(0.36), X(0.36), Math.PI, Math.PI * 2, p.CHORD)
  p.pop()
  // The hub.
  solid(p, ink, weight * 0.8, ink)
  p.circle(X(px), X(py), X(0.07))
  // The stone hits the log: dust off it.
  if (!d.bare && t >= FLING && t < FLING + 0.9) {
    const age = t - FLING
    p.push()
    p.drawingContext.globalAlpha = 1 - age / 0.9
    for (const side of [-1, 1]) puff(p, d.k, ink, weight * 0.6, DUST.bone, landed[0] + side * (0.3 + age * 0.6), FLOOR - 0.12 - age * 0.18, 0.06 + age * 0.12)
    p.pop()
  }
}

/** The fence: concrete posts, the mesh, the top rail the ball rolls, and the dogs it clicks over. */
function fence(d: Draw, s: GateState): void {
  const { p, ink, weight, t, X } = d
  const x0 = s.posts[0]
  const x1 = s.posts[s.posts.length - 1]
  const shiver = (x: number): number => {
    for (let i = 0; i < CAPS.length; i++) if (Math.abs(x - s.caps[i]) < 0.01) return knock(t - CAPS[i], 0.15) * Math.sin((t - CAPS[i]) * 60)
    return 0
  }
  // The mesh: fine diamonds, faint, between the posts.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.beginPath()
  ctx.rect(X(x0), X(RAIL + 0.04), X(x1 - x0), X(FLOOR - 0.03 - RAIL - 0.04))
  ctx.clip()
  p.stroke(alpha(p, ink, 0.26))
  p.strokeWeight(Math.max(1, weight * 0.4))
  const hgt = FLOOR - RAIL
  const pitch = 0.13
  for (let x = x0 - hgt; x < x1 + hgt; x += pitch) {
    let ripple = 0
    for (let i = 0; i < CAPS.length; i++) ripple += 0.02 * knock(t - CAPS[i], 0.2) * Math.sin((t - CAPS[i]) * 40) * Math.max(0, 1 - Math.abs(x - s.caps[i]) / 1.2)
    p.line(X(x + ripple), X(FLOOR), X(x + hgt + ripple), X(RAIL))
    p.line(X(x + ripple), X(RAIL), X(x + hgt + ripple), X(FLOOR))
  }
  p.pop()
  outline(p, ink, weight * 0.6)
  p.line(X(x0), X(FLOOR - 0.03), X(x1), X(FLOOR - 0.03))
  // The posts.
  for (const x of s.posts) {
    const dx = shiver(x) * 0.014
    solid(p, ink, weight, DUST.bone)
    rect4(d, x - 0.05 + dx, RAIL + 0.03, x + 0.05 + dx, FLOOR)
  }
  // The top rail: a pipe, run on past the last post to where the ball leaves it.
  solid(p, ink, weight * 0.9, DUST.shade)
  rect4(d, s.rail0 - 0.12, RAIL, s.railEnd + 0.04, RAIL + 0.06)
  // The dogs: sprung flaps on the post tops that the ball folds flat, one a beat, and that stand up again behind it.
  for (let i = 0; i < s.caps.length; i++) {
    const hx = s.caps[i] - 0.05 + shiver(s.caps[i]) * 0.014
    p.push()
    p.translate(X(hx), X(RAIL))
    p.rotate(dogAngle(t, CAPS[i]))
    solid(p, ink, weight * 0.8, DUST.rust)
    p.rect(X(DOG / 2), X(-0.03), X(DOG), X(0.06), X(0.025))
    p.pop()
    solid(p, ink, weight * 0.6, ink)
    p.circle(X(hx), X(RAIL - 0.01), X(0.045))
  }
}

/** The barrier: its pillar, the striped arm, the rest it comes down on, and the pail on the short end. */
function barrier(d: Draw, s: GateState): void {
  const { p, ink, weight, t, X } = d
  const gx = s.gate
  const b = armAngle(t)
  // The rest the long end comes down on: a post with a fork.
  const rest = gx + LONG - 0.08
  solid(p, ink, weight, DUST.bone)
  rect4(d, rest - 0.035, GY + 0.05, rest + 0.035, FLOOR)
  outline(p, ink, weight)
  p.line(X(rest - 0.07), X(GY + 0.05), X(rest + 0.07), X(GY + 0.05))
  p.line(X(rest - 0.07), X(GY + 0.05), X(rest - 0.07), X(GY - 0.05))
  p.line(X(rest + 0.07), X(GY + 0.05), X(rest + 0.07), X(GY - 0.05))
  // The pillar.
  solid(p, ink, weight, DUST.bone)
  rect4(d, gx - 0.12, GY + 0.04, gx + 0.12, FLOOR)
  solid(p, ink, weight * 0.8, DUST.denim)
  rect4(d, gx - 0.14, GY + 0.04, gx + 0.14, GY + 0.16)
  // The arm: striped on the long end, plain steel on the short.
  p.push()
  p.translate(X(gx), X(GY))
  p.rotate(b)
  solid(p, ink, weight * 0.9, DUST.shade)
  p.rect(X(-SHORT / 2), 0, X(SHORT), X(0.055))
  solid(p, ink, weight, DUST.bone)
  p.rect(X(LONG / 2), 0, X(LONG), X(0.085))
  p.noStroke()
  p.fill(DUST.rust)
  for (let u = 0.12; u < LONG - 0.1; u += 0.3) p.rect(X(u + 0.075), 0, X(0.15), X(0.085 - weight / d.k))
  outline(p, ink, weight)
  p.rect(X(LONG / 2), 0, X(LONG), X(0.085))
  p.pop()
  solid(p, ink, weight * 0.8, ink)
  p.circle(X(gx), X(GY), X(0.09))
  // The pail sets down: a little dust.
  if (!d.bare && t >= SET && t < SET + 0.6) {
    const age = t - SET
    const pin = pinAt(gx, SET)
    p.push()
    p.drawingContext.globalAlpha = 1 - age / 0.6
    for (const side of [-1, 1]) puff(p, d.k, ink, weight * 0.5, DUST.bone, pin[0] + side * (0.2 + age * 0.4), FLOOR - 0.05 - age * 0.1, 0.045 + age * 0.08)
    p.pop()
  }
  // The pail's bail and its far rim, behind the ball; its body goes over it.
  if (!d.bare) pail(d, s, true)
}

/** The pail on the barrier's short end. `back` draws the bail and the inside; the front draws its near wall, over the ball. */
function pail(d: Draw, s: GateState, back: boolean): void {
  const { p, ink, weight, t, X } = d
  const pin = pinAt(s.gate, t)
  const tip = pailTip(t)
  const swing = pailSwing(t)
  p.push()
  if (tip > 0) {
    // Tipping over its bottom corner on the road, and righted again as the arm hauls it up.
    p.translate(X(pin[0] + PAIL_BOT / 2), X(pin[1] + BAIL + PAIL_D))
    p.rotate(tip)
    p.translate(X(-PAIL_BOT / 2), X(-(BAIL + PAIL_D)))
  } else {
    p.translate(X(pin[0]), X(pin[1]))
    p.rotate(swing)
  }
  const top = BAIL
  const bot = BAIL + PAIL_D
  if (back) {
    outline(p, ink, weight * 0.8)
    p.noFill()
    p.arc(0, X(top), X(PAIL_TOP), X(BAIL * 2), Math.PI, Math.PI * 2)
    solid(p, ink, weight * 0.8, DUST.denim)
    p.quad(X(-PAIL_TOP / 2), X(top), X(PAIL_TOP / 2), X(top), X(PAIL_BOT / 2), X(bot), X(-PAIL_BOT / 2), X(bot))
  } else {
    // The near wall, its rim a little low so the ball in it shows its crown.
    const lip = top + 0.1
    const w = (y: number) => PAIL_TOP / 2 + ((PAIL_BOT - PAIL_TOP) / 2) * ((y - top) / PAIL_D)
    solid(p, ink, weight, DUST.teal)
    p.quad(X(-w(lip)), X(lip), X(w(lip)), X(lip), X(PAIL_BOT / 2), X(bot), X(-PAIL_BOT / 2), X(bot))
    outline(p, ink, weight * 0.6)
    p.line(X(-w(lip + 0.08)), X(lip + 0.08), X(w(lip + 0.08)), X(lip + 0.08))
  }
  p.pop()
}

/** The lever switch by the road: a cabinet with a beacon, the lever on its side, and the cable from it to the bunker. */
function lever(d: Draw, s: GateState): void {
  const { p, ink, weight, t, X } = d
  const on = t >= THROW
  const left = s.sw + 0.19
  const w = 0.38
  const top = FLOOR - 0.34
  const cx = left + w / 2
  // The cable along the ground, and the spark that runs down it when the switch goes.
  outline(p, ink, weight * 0.7)
  p.line(X(left + w), X(FLOOR - 0.03), X(s.bunker[0]), X(FLOOR - 0.03))
  const run = (t - THROW) / 0.14
  if (run > 0 && run < 1.3) {
    const x = left + w + (s.bunker[0] - left - w) * Math.min(1, run)
    p.noStroke()
    p.fill(alpha(p, DUST.light, 1 - Math.max(0, run - 1) / 0.3))
    p.circle(X(x), X(FLOOR - 0.03), X(0.1))
    glow(d, x, FLOOR - 0.03, 0.2, 0.6 * (1 - Math.max(0, run - 1) / 0.3))
  }
  // The cabinet, its lid, and the beacon on it.
  solid(p, ink, weight, DUST.sage)
  rect4(d, left, top, left + w, FLOOR)
  solid(p, ink, weight * 0.8, DUST.sage)
  rect4(d, left - 0.03, top - 0.04, left + w + 0.03, top + 0.02)
  solid(p, ink, weight * 0.8, on ? DUST.light : DUST.shade)
  p.arc(X(cx + 0.06), X(top - 0.04), X(0.14), X(0.16), Math.PI, Math.PI * 2, p.CHORD)
  if (on) glow(d, cx + 0.06, top - 0.08, 0.34, 0.55 + 0.45 * knock(t - THROW, 0.25))
  outline(p, ink, weight * 0.5)
  p.line(X(cx + 0.02), X(top + 0.12), X(cx + 0.14), X(top + 0.12))
  // The lever on the cabinet's side: its paddle down in the road until the ball knocks it up and over.
  const a = leverAngle(t)
  const pv: Pt = [s.sw + 0.23, -0.08]
  const paddle: Pt = [pv[0] + 0.2 * Math.cos(a), pv[1] + 0.2 * Math.sin(a)]
  const handle: Pt = [pv[0] - 0.44 * Math.cos(a), pv[1] - 0.44 * Math.sin(a)]
  outline(p, ink, weight * 1.2)
  p.line(X(handle[0]), X(handle[1]), X(paddle[0]), X(paddle[1]))
  solid(p, ink, weight * 0.8, DUST.rust)
  p.circle(X(handle[0]), X(handle[1]), X(0.09))
  p.push()
  p.translate(X(paddle[0]), X(paddle[1]))
  p.rotate(a)
  p.rect(0, 0, X(0.06), X(0.12))
  p.pop()
  solid(p, ink, weight * 0.7, ink)
  p.circle(X(pv[0]), X(pv[1]), X(0.05))
}

/** The bunker: a concrete blockhouse, cut open, with a tunnel through its foot and the landing lamps on its roof. */
function bunker(d: Draw, s: GateState): void {
  const { p, ink, weight, t, X } = d
  const [a, b] = s.bunker
  const lin = FLOOR - TUNNEL
  // The body: battered walls up from the lintels to a slab roof.
  solid(p, ink, weight, DUST.shade)
  p.beginShape()
  p.vertex(X(a), X(FLOOR))
  p.vertex(X(a), X(lin - 0.12))
  p.vertex(X(a + 0.2), X(ROOF + 0.12))
  p.vertex(X(b - 0.2), X(ROOF + 0.12))
  p.vertex(X(b), X(lin - 0.12))
  p.vertex(X(b), X(FLOOR))
  p.endShape(p.CLOSE)
  solid(p, ink, weight, DUST.bone)
  rect4(d, a + 0.1, ROOF, b - 0.1, ROOF + 0.12)
  // Aggregate in the cut face.
  p.stroke(alpha(p, ink, 0.35))
  p.strokeWeight(Math.max(1, weight * 0.7))
  for (let i = 0; i < 14; i++) {
    const y = ROOF + 0.2 + hash(i, 42) * (lin - 0.2 - ROOF - 0.2)
    const inset = 0.2 * (1 - (y - ROOF) / (lin - ROOF))
    const x = a + 0.12 + inset + hash(i, 41) * (b - a - 0.24 - 2 * inset)
    p.point(X(x), X(y))
  }
  // The tunnel through it, dark, lit by one lamp once the power is on.
  p.noStroke()
  p.fill(alpha(p, ink, 0.72))
  rect4(d, a, lin, b, FLOOR)
  if (t >= THROW) glow(d, (a + b) / 2, lin + 0.04, 0.5, 0.45)
  outline(p, ink, weight)
  p.line(X(a), X(lin), X(b), X(lin))
  // The lintels over the two mouths, which the flaps hang from.
  solid(p, ink, weight * 0.9, DUST.bone)
  rect4(d, a - 0.05, lin - 0.12, a + 0.16, lin)
  rect4(d, b - 0.16, lin - 0.12, b + 0.05, lin)
  // The landing lamps at the roof's two corners.
  const on = t >= THROW
  const flick = on && t < THROW + 0.12 ? (Math.sin((t - THROW) * 90) > -0.2 ? 1 : 0.2) : 1
  for (const x of [a + 0.1, b - 0.1]) {
    solid(p, ink, weight * 0.8, on ? DUST.light : DUST.shade)
    p.arc(X(x), X(ROOF), X(0.13), X(0.13), Math.PI, Math.PI * 2, p.CHORD)
    if (on) glow(d, x, ROOF - 0.03, 0.42, flick * (0.6 + 0.4 * knock(t - THROW, 0.3)))
  }
}

/** The drone's wheels: down for the landing, pressed at the touch. */
function gear(d: Draw, at: Pt, pitch: number, g: number, squash: number): void {
  if (g <= 0.01) return
  const { p, ink, weight, X } = d
  p.push()
  p.translate(X(at[0]), X(at[1]))
  p.rotate(pitch)
  const len = (GEAR - 0.035 - 0.06 - squash) * g
  for (const gx of [-0.03, 0.15]) {
    outline(p, ink, weight * 0.7)
    p.line(X(gx), X(0.05), X(gx), X(0.06 + len))
    if (g > 0.4) {
      solid(p, ink, weight * 0.6, ink)
      p.circle(X(gx), X(0.06 + len), X(0.07 * Math.min(1, (g - 0.4) / 0.3)))
    }
  }
  p.pop()
}

/** A soft light: a glow around a lamp. */
function glow(d: Draw, x: number, y: number, r: number, a: number): void {
  if (d.bare) return
  const { p, X } = d
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(X(x), X(y), 0, X(x), X(y), X(r))
  g.addColorStop(0, `rgba(255, 244, 214, ${0.75 * a})`)
  g.addColorStop(1, 'rgba(255, 244, 214, 0)')
  ctx.fillStyle = g
  ctx.fillRect(X(x - r), X(y - r), X(r * 2), X(r * 2))
}

/** In front of the ball: the near side of the sweep's cup, the pail's near wall, and the bunker's flaps. */
function overGate(p: p5, s: GateState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const X = (x: number) => x * k
  const d: Draw = { p, k, ink, weight, t, X }
  // The pickup's glass over her; and whatever of his stands in front of the cab, over both, where it crosses the window.
  if (t >= s.begin && t < LEAP) {
    const pk = truckAt(s, t)
    const f = frame(p, k)
    if (pk.rear < f.x1 + 1 && pk.rear + 3.5 > f.x0) {
      const win = pickupGlass(pk)
      p.push()
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.beginPath()
      win.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), X(y)) : ctx.moveTo(X(x), X(y))))
      ctx.closePath()
      ctx.clip()
      glassPickup(p, k, ink, weight, pk, false)
      const bare: Draw = { ...d, bare: true }
      sweep(bare, s)
      barrier(bare, s)
      lever(bare, s)
      bunker(bare, s)
      drone(bare, s, f)
      p.pop()
    }
  }
  // The cup: a bowl whose near rim sits low, so the ball in it shows.
  const a = sweepAngle(t)
  p.push()
  p.translate(X(s.sweep[0]), X(s.sweep[1]))
  p.rotate(a)
  solid(p, ink, weight, DUST.rust)
  p.arc(X(SW_L), X(CUP_C), X(0.36), X(0.3), Math.PI * 1.08, Math.PI * 1.92, p.CHORD)
  p.pop()
  pail(d, s, false)
  // The flaps.
  for (let i = 0; i < 2; i++) {
    const hx = s.bunker[i]
    const ang = flapAngle(t, FLAPS[i], SLAPS[i])
    p.push()
    p.translate(X(hx), X(FLOOR - TUNNEL))
    p.rotate(-ang)
    solid(p, ink, weight * 0.9, DUST.corn)
    p.rect(0, X(FLAP / 2), X(0.07), X(FLAP), X(0.02))
    p.pop()
  }
}
