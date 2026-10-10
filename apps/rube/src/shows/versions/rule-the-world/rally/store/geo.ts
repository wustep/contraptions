import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { carried, route, type Way } from '../kit'
import { a, at, SEAM } from '../music'
import { hop } from '../physics'

/**
 * Uncle Murray's shoe store, 1952, before it opens: the clock, the ground and the way (0 → 52.455, bars 1 to 24), in
 * the place's own cells. The ball starts at (-0.5, 0), sitting on his own sprung bat, a toy on the counter.
 *
 * Left to right: the front window on the street; the counter with the till; the long wall of shoe boxes to the
 * ceiling, the library ladder on its rail in front of it; the fitting chairs, the salesman's stool and the measuring
 * device; the curtain to the stockroom (Rachel); the door to Murray's back office, and the safe.
 */

export const T0 = 0
export const T1 = SEAM.london

/* ------------------------------------------------------------------ the ground */

export const R = 0.13
export const FLOOR = 1.43
export const CEIL = -4.4

/** The front window on the street, behind the counter (x0, y0, x1, y1), and where the wall of boxes starts. */
export const WIN: [number, number, number, number] = [-2.5, -2.65, 0.6, 0.04]
export const FRONT = 1.0

/** The counter and its top; the till on it. */
export const COUNTER: [number, number] = [-1.4, 1.0]
export const COUNTER_TOP = 0.2
export const TILL: [number, number] = [-1.3, -0.8]
/** The toy: his sprung bat. The face's top is where he sits (y 0.13); it is hinged at the base on the counter. */
export const BAT_AT: Pt = [-0.5, 0]
export const BAT_HINGE: Pt = [0.08, 0.1]

/** The wall of boxes: a grid of box ends from the counter's back to the stockroom's curtain. */
export const BOX_X0 = -1.7
export const BOX_X1 = 14.55
export const BOX_W = 0.45
export const BOX_H = 0.32
export const PLINTH = 1.2
export const BOX_ROWS = 17
export const boxX = (i: number) => BOX_X0 + BOX_W * i
export const boxTop = (j: number) => PLINTH - BOX_H * (j + 1)

/** The rolling library ladder: its rail, its rungs, where it starts and where its stop is. */
export const RAIL_Y = -3.95
export const RAIL: [number, number] = [0.6, 9.55]
export const LADDER_HALF = 0.36
export const RUNG = 0.36
export const rungY = (n: number) => FLOOR - RUNG * n
export const XL0 = 4.15
export const XL1 = 9.05

/** The hanging lamps along the store, clicking on one a beat from the bass in. */
export const LAMP_X = [2.4, 5.2, 8.0, 10.8, 13.6]
export const LAMP_Y = -3.35
/** The bare bulb over the counter. */
export const BULB: Pt = [0.75, -1.55]

/** The stack of boxes the shoehorn leans on; the shoehorn; the stool and its sprung footrest; the measuring device. */
export const STACK: [number, number] = [9.72, 10.32]
export const STACK_TOP = FLOOR - 3 * 0.32
export const HORN0: Pt = [10.1, STACK_TOP - 0.005]
export const HORN1: Pt = [11.15, 0.93]
export const STOOL: [number, number] = [11.6, 12.3]
export const STOOL_SEAT = 0.55
export const FOOT_HINGE: Pt = [11.62, 0.77]
export const FOOT_END: Pt = [11.08, 0.96]
export const DEVICE: [number, number] = [12.3, 13.75]
export const DEVICE_TOP = FLOOR - 0.06
export const SLIDER0 = 12.75
export const SLIDER1 = 13.59
export const LIP = 13.68

/** The partition with the curtain to the stockroom. */
export const PART1: [number, number] = [14.55, 15.75]
export const HEAD = FLOOR - 2.6
/** The stockroom: the carton they sit on, Rachel's place on it, its bulb. */
export const BENCH: [number, number] = [16.7, 18.3]
export const BENCH_TOP = 0.98
export const RACHEL_AT: Pt = [17.18, BENCH_TOP - R]
export const SEAT: Pt = [17.5, BENCH_TOP - R]
export const STOCK_BULB: Pt = [17.62, -1.0]

/** The partition with the office door; the office, its step stool, the safe. */
export const PART2: [number, number] = [22.2, 23.4]
export const POST = 0.12
export const STEP: [number, number] = [23.95, 24.55]
export const STEP_TOP = 0.83
export const SAFE: [number, number] = [25.0, 26.8]
export const SAFE_TOP = -0.25
export const SAFE_FEET = 0.1
export const HINGE_X = 25.03
export const DOOR_W = 1.74
export const DIAL: Pt = [25.75, 0.38]
export const DIAL_R = 0.2
export const HANDLE: Pt = [26.33, 0.47]
export const LEVER = 0.36
/** The safe's inside: the walls' thickness, the shelf, the two stacks of bills. */
export const INNER: [number, number, number, number] = [25.14, -0.12, 26.66, 1.18]
export const SHELF = 0.3
export const BUNDLE = 0.16
export const LEFT_STACK: [number, number] = [25.22, 25.74]
export const RIGHT_STACK: [number, number] = [25.82, 26.52]
export const LEFT_TOP = INNER[3] - 2 * BUNDLE
export const RIGHT_TOP = INNER[3] - 3 * BUNDLE
export const END: Pt = [26.1, RIGHT_TOP - R]

/* ------------------------------------------------------------------ the clock */

/** The counter: he ticks on his bat, bars 1 to 4. Every takeoff is the bat's flick; every landing is a strike. */
export const BULB_ON = at(1, 1)
export const INTRO_HOPS: [number, number][] = [
  [at(1, 1), a(1, 1)],
  [at(1, 3), a(1, 3)],
  [at(2, 1), a(2, 1)],
  [at(2, 2), a(2, 2)],
  [at(2, 3), a(2, 3)],
  [at(2, 4), a(2, 4)],
]
const shuffle = (b0: number, b1: number, last: [number, number]): number[] => {
  const out: number[] = []
  for (let b = b0; b <= b1; b++)
    for (let q = 1; q <= 4; q++) {
      if (b === last[0] && q > last[1]) return out
      out.push(at(b, q))
      if (b === last[0] && q === last[1]) return out
      out.push(a(b, q))
    }
  return out
}
/** Bar 3 on the shuffle, then bar 4 on the beats, higher, impatient. */
export const INTRO_RUN = [...shuffle(3, 3, [3, 4]), a(3, 4), at(4, 1), at(4, 2), at(4, 3), at(4, 4)]

/** The bass in: the bat fires him, and the lamps click on along the store, one a beat. */
export const FIRE = at(5, 1)
export const LAMPS_ON = [at(5, 1), at(5, 2), at(5, 3), at(5, 4), at(6, 1)]
/** Down the wall of boxes: each box pops out on the "a" (the first on a beat) and he lands on it on the beat. */
export const POPS = [at(5, 2), a(5, 3), a(5, 4), a(6, 1)]
export const STEPS_AT = [at(5, 3), at(5, 4), at(6, 1), at(6, 2)]
export const STEP_BOX: [number, number][] = [
  [8, 10],
  [9, 9],
  [10, 8],
  [11, 7],
]
/** The ladder: he lands on its rung and it rolls; down a rung a beat as it goes; it bangs into its stop. */
export const LADDER_GO = at(6, 3)
export const RUNGS_AT = [at(6, 3), at(6, 4), at(7, 1), at(7, 2), at(7, 3), at(7, 4)]
export const RUNGS_N = [8, 7, 6, 5, 4, 3]
export const BANG = at(8, 1)
export const HORN_LAND = at(8, 2)
export const FOOTREST = at(8, 3)
export const DEVICE_LAND = at(8, 4)
export const SLIDER_STOP = at(9, 1)
export const FLOOR_LAND = at(9, 2)
export const CURTAIN = at(9, 3)
/** The stockroom: beside her on the carton; a small bounce together on the shuffle; then he goes. */
export const SIT = at(10, 1)
export const TOGETHER = [...shuffle(11, 11, [11, 4]), a(11, 4), at(12, 1)]
export const TOGETHER2: [number, number, number][] = [
  [at(12, 1), a(12, 1), NaN],
  [at(12, 3), a(12, 3), at(12, 4)],
]
export const LEAN = at(13, 1)
export const LEAVE = at(13, 2)
export const DOWN = at(13, 3)
/** "Welcome to your life": the office door. */
export const WELCOME = at(14, 1)
export const STEP_HOP = at(14, 2)
export const ON_STEP = at(14, 3)
export const STEP_BOUNCE = at(14, 4)
/** The dial: a click under every landing, bars 15 to 17 on the shuffle, one way, the other, and back. */
export const DIAL_AT = shuffle(15, 17, [17, 4])
/** The handle: he lands on it, it turns down under him and the bolts throw, and he drops off. */
export const HANDLE_LAND = at(18, 1)
export const BOLTS = at(18, 2)
export const HANDLE_OFF = at(18, 3)
/** The door, heaved a beat at a time, then swinging wide onto its stop. */
export const SHOVES = [at(18, 4), at(19, 1), at(19, 2), at(19, 3), at(19, 4)]
export const SHOVE_DEG = [14, 28, 42, 57, 72]
export const SWUNG = at(20, 1)
export const SWING_DEG = 152
export const WAIT_HOPS = [at(20, 3), at(20, 4)]
const WAIT_FROM = at(20, 2)
export const INTO = at(21, 1)
export const ONTO = at(21, 3)
const ONTO_FROM = at(21, 2)
/** On the bills, with the ticket: little skips on the shuffle, then still. */
export const SKIPS: [number, number, number][] = [
  [at(22, 1), a(22, 1), at(22, 2)],
  [at(22, 3), a(22, 3), at(22, 4)],
  [at(23, 1), a(23, 1), at(23, 2)],
  [at(23, 3), a(23, 3), at(23, 4)],
  [at(24, 1), a(24, 1), at(24, 2)],
]

/* ------------------------------------------------------------------ the door and the handle */

const easeOut = (u: number) => 1 - (1 - Math.max(0, Math.min(1, u))) ** 3
const smoothU = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/** The safe door's swing, degrees (0 shut). */
export function doorDeg(t: number): number {
  let d = 0
  for (let i = 0; i < SHOVES.length; i++) {
    const t0 = SHOVES[i]
    const from = i ? SHOVE_DEG[i - 1] : 0
    if (t >= t0) d = from + (SHOVE_DEG[i] - from) * easeOut((t - t0) / 0.32)
  }
  const last = SHOVES[SHOVES.length - 1] + 0.32
  if (t > last) {
    const u = (t - last) / (SWUNG - last)
    d = SHOVE_DEG[SHOVE_DEG.length - 1] + (SWING_DEG - SHOVE_DEG[SHOVE_DEG.length - 1]) * (u >= 1 ? 1 : u * u)
    if (u >= 1) d = SWING_DEG - 4 * Math.exp(-(t - SWUNG) / 0.12) * Math.sin((t - SWUNG) * 30)
  }
  return d
}
/** Where a point on the door's face (its x when shut) is on the screen. */
export const doorX = (x: number, deg: number) => HINGE_X + (x - HINGE_X) * Math.cos((deg * Math.PI) / 180)

/** The handle's turn, radians (clockwise, its end going down). */
export function handleTurn(t: number): number {
  return 0.96 * smoothU((t - HANDLE_LAND) / (BOLTS - HANDLE_LAND))
}
const onLever = (th: number): Pt => {
  const lx = 0.27
  const ly = -0.035 - R
  return [HANDLE[0] + lx * Math.cos(th) - ly * Math.sin(th), HANDLE[1] + lx * Math.sin(th) + ly * Math.cos(th)]
}

/** The dial's turn, radians: a notch a landing, clockwise, then back, then clockwise. */
export function dialTurn(t: number): number {
  let th = 0
  for (let i = 0; i < DIAL_AT.length; i++) {
    const ti = DIAL_AT[i]
    if (t < ti) break
    const dir = ti < at(16, 1) - 0.01 ? 1 : ti < at(17, 1) - 0.01 ? -1 : 1
    th += dir * 0.31 * easeOut((t - ti) / 0.06)
  }
  return th
}

/** The office door's swing: knocked open on "Welcome". 0 shut, 1 open. */
export function officeDoor(t: number): number {
  if (t < WELCOME) return 0
  const u = t - WELCOME
  return Math.min(1, easeOut(u / 0.35) * 0.82 + 0.06 * Math.exp(-u / 0.4) * Math.sin(u * 14))
}

/* ------------------------------------------------------------------ the way */

const ballOnStep = (k: number): Pt => {
  const [i, j] = STEP_BOX[k]
  return [boxX(i) + BOX_W / 2, boxTop(j) - 0.18]
}
const rungBall = (n: number): number => rungY(n) - 0.025 - R
const V_LADDER = (XL1 - XL0) / (BANG - LADDER_GO)
export const ladderX = (t: number): number => (t < LADDER_GO ? XL0 : t > BANG ? XL1 : XL0 + V_LADDER * (t - LADDER_GO))
const RUNG_DX = [-0.12, -0.05, 0.04, -0.06, 0.05, -0.02]

/** On the shoehorn: fraction `f` from its top. */
export function onHorn(f: number): Pt {
  const dx = HORN1[0] - HORN0[0]
  const dy = HORN1[1] - HORN0[1]
  const l = Math.hypot(dx, dy)
  return [HORN0[0] + dx * f + (dy / l) * R, HORN0[1] + dy * f - (dx / l) * R]
}

const SHOVE_END = SHOVES[SHOVES.length - 1] + 0.32
const pushX = (t: number) => doorX(HINGE_X + DOOR_W, doorDeg(Math.min(t, SHOVE_END))) + R
const FLOOR_Y = FLOOR - R
export const WAIT_X = pushX(SHOVE_END)
const LEFT_SEAT: Pt = [25.47, LEFT_TOP - R]

export function storeWay(): { segs: Seg[]; at: (t: number) => Pt } {
  const w: Way[] = [{ at: T0, p: BAT_AT }]
  const last = () => w[w.length - 1]
  const go = (t: number, p: Pt) => w.push(hop(last(), p, t))
  const still = (t: number) => w.push({ at: t, p: last().p })
  // The counter.
  still(BULB_ON)
  for (const [t0, t1] of INTRO_HOPS) {
    still(t0)
    go(t1, BAT_AT)
  }
  still(INTRO_RUN[0])
  for (const t of INTRO_RUN.slice(1)) go(t, BAT_AT)
  go(FIRE, BAT_AT)
  // Off: up onto the first box, and down the wall a box a beat.
  STEPS_AT.forEach((t, k) => go(t, ballOnStep(k)))
  // Onto the ladder's rung; it rolls, and he comes down it a rung a beat.
  RUNGS_AT.forEach((t, k) => go(t, [ladderX(t) + RUNG_DX[k], rungBall(RUNGS_N[k])]))
  w.push({ at: BANG, p: [ladderX(BANG) + RUNG_DX[RUNG_DX.length - 1], rungBall(3)] })
  // The bang throws him onto the shoehorn; he rolls down it into the footrest, which flings him onto the device.
  go(HORN_LAND, onHorn(0.18))
  w.push({ at: FOOTREST, p: onHorn(0.96), ramp: [1.1, 2.3] })
  go(DEVICE_LAND, [SLIDER0 - 0.15, DEVICE_TOP - R])
  w.push({ at: SLIDER_STOP, p: [SLIDER1 - 0.15, DEVICE_TOP - R], ramp: [1.9, 1.25] })
  // Over the lip, a bounce in the doorway (the curtain parts), and a lob over her onto the carton beside her.
  go(FLOOR_LAND, [14.1, FLOOR_Y])
  go(CURTAIN, [15.15, FLOOR_Y])
  go(SIT, SEAT)
  // Together, on the shuffle.
  still(TOGETHER[0])
  for (const t of TOGETHER.slice(1)) go(t, SEAT)
  for (const [t0, t1, t2] of TOGETHER2) {
    still(t0)
    go(t1, SEAT)
    if (!Number.isNaN(t2)) go(t2, SEAT)
  }
  still(LEAN)
  w.push({ at: LEAN + 0.4, p: [SEAT[0] - 0.025, SEAT[1]], ease: 'inout' })
  w.push({ at: LEAVE, p: [SEAT[0] - 0.025, SEAT[1]] })
  // Down, and away to the office door, which he knocks open on "Welcome".
  go(DOWN, [19.35, FLOOR_Y])
  w.push({ at: WELCOME, p: [PART2[0] + POST - R + 0.02, FLOOR_Y], ramp: [3.0, 2.45] })
  w.push({ at: STEP_HOP, p: [23.5, FLOOR_Y], ramp: [2.45, 2.2] })
  go(ON_STEP, [24.22, STEP_TOP - R])
  go(STEP_BOUNCE, [24.3, STEP_TOP - R])
  // The dial: onto its top, and the clicks.
  const dialTop: Pt = [DIAL[0], DIAL[1] - DIAL_R - R]
  go(DIAL_AT[0], dialTop)
  for (const t of DIAL_AT.slice(1)) go(t, dialTop)
  // The handle: carried down on its end as it turns; off onto the floor.
  go(HANDLE_LAND, onLever(0))
  w.push(...carriedWays(HANDLE_LAND, BOLTS, 8, (t) => onLever(handleTurn(t))))
  go(HANDLE_OFF, [SAFE[1] + R + 0.0, FLOOR_Y])
  // The door, heaved open a beat at a time.
  w.push({ at: SHOVES[0], p: [pushX(SHOVES[0]), FLOOR_Y] })
  w.push(...carriedWays(SHOVES[0], SHOVE_END, 24, (t) => [pushX(t), FLOOR_Y]))
  still(SWUNG)
  // Waiting at the open door; two hops; in, onto the lower stack; onto the bundle with the ticket.
  still(WAIT_FROM)
  for (const t of WAIT_HOPS) go(t, [WAIT_X, FLOOR_Y])
  go(INTO, LEFT_SEAT)
  still(ONTO_FROM)
  go(ONTO, END)
  for (const [t0, t1, t2] of SKIPS) {
    still(t0)
    go(t1, END)
    go(t2, END)
  }
  still(T1)
  const segs = route(w)
  return {
    segs,
    at: (t) => {
      const q = laneAt({ segs, fire: 0 }, t - T0)
      return [q.x, q.y]
    },
  }
}

/** Ways sampled off something that carries him (after the way at `t0`, which must already be there). */
function carriedWays(t0: number, t1: number, n: number, f: (t: number) => Pt): Way[] {
  const out: Way[] = []
  const segs = carried(f, t0, t1, n)
  let t = t0
  for (const s of segs) {
    t += s.dur
    out.push({ at: t, p: s.to })
  }
  return out
}

export const WAY = storeWay()

/* ------------------------------------------------------------------ Rachel */

/** Rachel on the carton: still, but for the small bounce together on the shuffle, and the lean. */
export function rachelAt(t: number): Pt {
  const [x, y] = RACHEL_AT
  const hopY = (t0: number, t1: number) => {
    const T = t1 - t0
    const s = (t - t0) / T
    return -(12 * T * T) / 2 * s * (1 - s)
  }
  for (let i = 1; i < TOGETHER.length; i++) if (t >= TOGETHER[i - 1] && t < TOGETHER[i]) return [x, y + hopY(TOGETHER[i - 1], TOGETHER[i])]
  for (const [t0, t1, t2] of TOGETHER2) {
    if (t >= t0 && t < t1) return [x, y + hopY(t0, t1)]
    if (!Number.isNaN(t2) && t >= t1 && t < t2) return [x, y + hopY(t1, t2)]
  }
  if (t >= LEAN && t < LEAVE + 0.4) {
    const u = Math.min(1, (t - LEAN) / 0.4)
    const back = t > LEAVE ? Math.min(1, (t - LEAVE) / 0.4) : 0
    const e = u * u * (3 - 2 * u) * (1 - back * back * (3 - 2 * back))
    return [x + 0.025 * e, y]
  }
  return [x, y]
}

/* ------------------------------------------------------------------ strikes */

export const STORE_STRIKES: number[] = [
  ...INTRO_HOPS.flat(),
  ...INTRO_RUN,
  ...LAMPS_ON,
  ...POPS,
  ...STEPS_AT,
  ...RUNGS_AT,
  BANG,
  HORN_LAND,
  FOOTREST,
  DEVICE_LAND,
  SLIDER_STOP,
  FLOOR_LAND,
  CURTAIN,
  SIT,
  ...TOGETHER,
  ...TOGETHER2.flat().filter((t) => !Number.isNaN(t)),
  DOWN,
  WELCOME,
  STEP_HOP,
  ON_STEP,
  STEP_BOUNCE,
  ...DIAL_AT,
  HANDLE_LAND,
  BOLTS,
  HANDLE_OFF,
  ...SHOVES,
  SWUNG,
  ...WAIT_HOPS,
  INTO,
  ONTO,
  ...SKIPS.flat(),
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((x, y) => x - y)
