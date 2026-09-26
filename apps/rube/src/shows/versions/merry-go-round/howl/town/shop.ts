import type p5 from 'p5'
import { clamp } from '../../../../../../../../src/core/ease'
import { mixHex, R, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, hash, part, route, smooth, type PartShot } from '../kit'
import { onsetsIn } from '../music'
import { G } from '../physics'
import { TOWN } from '../worlds'
import { DOOR_AT, TOWN_AT, WAKE, glow, hatShape, inside, soft } from './town'
import { along, curve, polar, ring, step } from './shop-kit'

/**
 * The hat shop at dawn (0 → 38.28): the town builder's.
 *
 * The music box (0.20 → 6.55). The shop is dark. On the workroom's window sill stands the late Hatter's music box,
 * a little carousel of hats on its lid, its comb and pinned cylinder behind a glass front. On its first note it lets
 * go: its spring turns the cylinder, the carousel turns, and a cord from its spool winds Sophie up the dumbwaiter
 * beside it, up out of the dark into the dawn coming through the window, a pluck of the comb on every note of the
 * rising figure. The lift latches at the top on 4.98; the box runs down; on its last note (6.55) the lift tips her
 * out onto the shelf.
 *
 * The hat line, on the theme (10.7 → 25.5), slow, a bar every 1.6 s. Off the shelf's tipping end she drops onto the
 * treadle of a kick press (10.73): her weight pulls the rocker down and the hot ram seats on the felt on its block
 * (11.35) in a burst of steam, and breathes again (11.92). She holds it, then rolls on down the treadle toward its
 * hinge and the ram lifts off (14.89): a hat. Onto the rocking plate of a sewing treadle (15.42): she rocks it, a
 * swing to a bar, and its flywheel draws the hat's trolley along the bench to the ribbon (16.52), spins the
 * turntable while the guide lays a ribbon round the crown (18.44), cuts it (20.27), dabs the join (20.78), and lets
 * the trolley run on to the stand. The plate flicks her off its end (22.28) into the stand's pedal cup (22.84) as the
 * trolley docks: her weight brings the pedal down and the stand's column rises, lifting the finished hat up to the
 * light, and latches on 25.54 as the cup touches the floor and pops her out.
 *
 * Out (25.5 → 38.28). She rolls across the shop, pushes the door open on 27.64 (the bell), and goes out and down
 * the street, the door swinging shut behind her (30.20); as she passes, the shutters across the street open, one on
 * each strong note of the theme's last phrases (`WAKE`, the set's): the town waking. At 38.28 she is at (25.5, 0)
 * walking right at 0.9 c/s, where the alley begins.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The music box's rising figure, every note of it: a pin plucks a tine of the comb on each. */
const NOTES = onsetsIn(0.15, 5.0, 0.3)
const START = NOTES[0]
/** The lift latches at the top. */
const TOP = 4.981
/** The box's last note: the lift tips her out. */
const LAST = 6.548
/** Off the shelf's tipping end, onto the press's treadle. */
const LAND = 10.728
/** The ram seats on the felt: steam. */
const SEAT = 11.349
/** The ram breathes steam again. */
const PUFF = 11.918
/** She rolls on toward the hinge, and the ram begins to lift. */
const EASE_OFF = 14.338
/** The ram back up against its stop. */
const RAM_UP = 14.89
/** Onto the sewing treadle's plate. */
const ONTO = 15.424
/** The plate's turnarounds, one a bar: right, left, right, left. */
const TURNS = [16.521, 18.146, 19.795, 21.246]
/** The ribbon laid on the crown, cut, and the join dabbed down. */
const RIBBON_ON = 18.437
const CUT = 20.271
const DAB = 20.782
/** The plate flicks her off its end, into the pedal's cup. */
const FLICK = 22.28
const PAN = 22.837
/** The stand latches at the top; the cup touches the floor and pops her out. */
const RAISED = 25.536
/** She pushes the door open: the bell. */
const DOOR = 27.638
/** The door swings shut behind her. */
const SHUT = 30.203

/** Every strike of this part, in show seconds. */
export const SHOP_HITS: number[] = [
  ...NOTES,
  TOP,
  LAST,
  LAND,
  SEAT,
  PUFF,
  RAM_UP,
  ONTO,
  ...TURNS,
  RIBBON_ON,
  CUT,
  DAB,
  FLICK,
  PAN,
  RAISED,
  DOOR,
  SHUT,
  ...WAKE.map((w) => w.t),
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the rig: where everything stands */

const FLOOR = TOWN_AT.ground
const SILL = TOWN_AT.window[3]
const CEIL = TOWN_AT.ceil
const BENCH = TOWN_AT.bench[2]

/** The dumbwaiter: one guide post, a carriage on it, and a cantilevered platform she rides; its top just over the sill. */
const LIFT_X = -0.5
const POST_X = -0.8
const PLAT: [number, number] = [-0.8, -0.26]
const PLAT_TOP = SILL - 0.07
const PULLEY_Y = CEIL + 0.24
/** The music box on the sill: its body, its spool's axle. */
const MB = { x0: -1.74, x1: -1.1, top: SILL - 0.28 }
const MB_CX = (MB.x0 + MB.x1) / 2
const SPOOL: Pt = [-1.0, SILL - 0.15]
const SPOOL_R = 0.055
/** The shelf, and the ledge at its end that tips. */
const SHELF: [number, number] = [-0.24, 0.52]
const LEDGE_O: Pt = [0.52, SILL]
const LEDGE_L = 0.46
/** The kick press: the treadle's hinge and its free end at rest and pressed; the rocker's pivot; the ram. */
const T_HINGE: Pt = [2.72, 0.05]
const T_FREE: Pt = [1.02, -0.42]
const T_DOWN: Pt = [1.02, 0.06]
const ROCKER: Pt = [2.5, -2.02]
const ROD_D = 0.56
const RAM_X = 2.05
const RAM_H = 0.3
/** The sewing treadle's plate and its pivot; the flywheel above it under the bench. */
const PIVOT: Pt = [3.25, 0.05]
const PLATE_HALF = 0.53
const TILT = 0.13
const FLY: Pt = [3.25, -0.34]
const FLY_R = 0.22
/** The trolley's rail on the bench, and its stations: the press, the ribbon, the stand. */
const AT_PRESS = RAM_X
const AT_RIBBON = 2.95
const AT_STAND = 3.8
/** The ribbon's spool on its post. */
const SPOOL2: Pt = [3.42, BENCH - 0.5]
/** The pedal: its pivot, its arm to the cup, its angles, and how far it lifts the stand's column. */
const PEDAL: Pt = [4.2, -0.2]
const PEDAL_ARM = 0.6
const G_REST = -0.62
const G_DOWN = 0.52
const COLUMN_RISE = 1.25

/* ------------------------------------------------------------------ the machines' motion */

/** A velocity trapezoid, normalised: accelerate over `a`, cruise, decelerate over `d`. */
function trap(u: number, a: number, d: number): number {
  const x = clamp(u)
  const v = 1 / (1 - a / 2 - d / 2)
  if (x < a) return (v * x * x) / (2 * a)
  if (x < 1 - d) return v * (x - a / 2)
  return 1 - (v * (1 - x) * (1 - x)) / (2 * d)
}

/** The platform's top at the lift: up out of the dark on the rising figure, a little give at the latch. */
function liftY(t: number): number {
  const s = trap((t - START) / (TOP - START), 0.1, 0.22)
  return FLOOR + (PLAT_TOP - FLOOR) * s + ring(t - TOP, 0.012, 32, 0.1)
}
/** The platform's tip on the last note: its free end down to the shelf, and level again once she is off. */
const liftTip = (t: number): number => 0.15 * step(t - LAST, 0.05) * (1 - smooth(t, 7.6, 8.6))
/** A point on the platform's top, `x` along it, lifted `up`. */
function onPlat(t: number, x: number, up: number): Pt {
  const a = liftTip(t)
  const y0 = liftY(t)
  return along([PLAT[0], y0], [PLAT[0] + Math.cos(a), y0 + Math.sin(a)], x - PLAT[0], up)
}

/** The cylinder's turn: the spring lets go on the first note, turns steadily, and runs down after the latch. */
const cylinder = curve([
  [START, 0, 0],
  [START + 0.5, 0.9, 3.1],
  [TOP, 14.2, 2.9],
  [LAST + 0.3, 17.6, 0],
])
/** Which tine each note plucks: the figure rises along the comb. */
const TINES = 9
const tineOf = (j: number): number => Math.min(TINES - 1, Math.round((j / (NOTES.length - 1)) * (TINES - 1) * 0.85 + (j % 3) * 0.4))

/** The ledge at the shelf's end: level while she rolls out to its end, then tipping under her; then back. */
const LEDGE_OFF = LAND - 0.31
const ledge = curve([
  [9.35, 0, 0],
  [LEDGE_OFF, 0.6, 1.0],
  [LEDGE_OFF + 0.5, 0.62, 0],
  [12.5, 0.0, 0],
])
const onLedge = (t: number, s: number, up: number): Pt => {
  const a = ledge(t)
  return along(LEDGE_O, [LEDGE_O[0] + Math.cos(a), LEDGE_O[1] + Math.sin(a)], s, up)
}

/** The press's treadle: 0 at rest (its free end up), 1 pressed flat: her weight on it, then off it. */
const sink = curve([
  [LAND, 0, 1.1],
  [SEAT, 1, 2.1],
])
function pressed(t: number): number {
  if (t <= LAND) return 0
  if (t < SEAT) return sink(t)
  if (t < EASE_OFF) return 1 - 0.04 * Math.abs(ring(t - SEAT, 1, 26, 0.08))
  return 1 - smooth(t, EASE_OFF, RAM_UP - 0.04)
}
const T_LEN = Math.hypot(T_FREE[0] - T_HINGE[0], T_FREE[1] - T_HINGE[1])
const A_REST = Math.atan2(T_FREE[1] - T_HINGE[1], T_FREE[0] - T_HINGE[0])
/** Pressed, the short way round from rest (the two angles straddle ±π). */
const A_DOWN = (() => {
  let a = Math.atan2(T_DOWN[1] - T_HINGE[1], T_DOWN[0] - T_HINGE[0])
  while (a - A_REST > Math.PI) a -= 2 * Math.PI
  while (a - A_REST < -Math.PI) a += 2 * Math.PI
  return a
})()
/** The treadle's free end. */
const freeEnd = (t: number): Pt => polar(T_HINGE, T_LEN, A_REST + (A_DOWN - A_REST) * pressed(t))
/** The rod's foot on the treadle at rest, and the rocker's arm from its pivot to the rod. */
const ROD_REST_Y = T_FREE[1] + (T_HINGE[1] - T_FREE[1]) * (ROD_D / T_LEN)
const ROCK_ARM = ROCKER[0] - (T_FREE[0] + (T_HINGE[0] - T_FREE[0]) * (ROD_D / T_LEN))
/** The lever's angle when the treadle is `pr` pressed: the rod pulls its end down as the treadle sinks. */
function leverAt(pr: number): number {
  const f = polar(T_HINGE, T_LEN, A_REST + (A_DOWN - A_REST) * pr)
  const now = f[1] + (T_HINGE[1] - f[1]) * (ROD_D / T_LEN)
  return Math.asin(clamp((now - ROD_REST_Y) / ROCK_ARM, -1, 1))
}
const rockerAng = (t: number): number => leverAt(pressed(t))
/** The felt's top on its block, where the ram seats; the ram's full travel; its top at rest. */
const HAT_TOP = BENCH - 0.15 - 0.34 * 0.62
const DROP_MAX = (ROCKER[0] - RAM_X) * Math.sin(leverAt(1))
const RAM_REST = HAT_TOP - RAM_H - DROP_MAX
/** The ram's drop from its rest, with its knock against the top stop as it comes back up. */
const ramDrop = (t: number): number => (ROCKER[0] - RAM_X) * Math.sin(rockerAng(t)) - ring(t - RAM_UP, 0.012, 34, 0.08)
/** The ram's top. */
const ramTop = (t: number): number => RAM_REST + ramDrop(t)

/** The trolley along the bench: at the press, drawn to the ribbon (a click), let go to the stand (a knock). */
const trolley = curve([
  [ONTO, AT_PRESS, 0],
  [TURNS[0] - 0.05, AT_RIBBON - 0.01, 0.35],
  [TURNS[0], AT_RIBBON, 0],
  [TURNS[3], AT_RIBBON, 0],
  [PAN - 0.06, AT_STAND - 0.01, 0.9],
  [PAN, AT_STAND, 0],
])
/** How the hat wobbles on its block after a knock. */
const wobble = (t: number): number => ring(t - TURNS[0], 0.05, 22, 0.16) + ring(t - PAN, 0.07, 20, 0.2) + ring(t - SEAT, 0.02, 30, 0.1) + ring(t - RAISED, 0.04, 18, 0.22)

/** Where she is along the floor from the press to the sewing plate: rolling down the treadle, then rocking. */
const rollX = curve([
  [LAND, 1.12, 0.3],
  [SEAT, 1.24, 0.14],
  [EASE_OFF, 1.52, 0.2],
  [RAM_UP, 2.2, 1.35],
  [ONTO, 2.86, 0.95],
  [TURNS[0], 3.66, 0],
  [TURNS[1], 2.84, 0],
  [TURNS[2], 3.66, 0],
  [TURNS[3], 2.84, 0],
  [FLICK, 3.72, 1.74],
])
/** The sewing plate's tilt: to her side as she rocks it, and the flick that throws her off its end. */
function plate(t: number): number {
  const x = rollX(Math.min(t, FLICK))
  const on = smooth(t, ONTO - 0.25, ONTO + 0.35)
  const rock = TILT * clamp((x - PIVOT[0]) / PLATE_HALF, -1, 1) * on
  if (t < FLICK) return rock
  // The flick: the plate's right end snaps up, then it rocks down to rest.
  const s = t - FLICK
  return rock * Math.exp(-s / 0.02) - 0.24 * step(s, 0.015) * Math.exp(-s / 0.5) * Math.cos(s * 5)
}
/** The flywheel's turn: half a turn to a swing. */
const fly = curve([
  [ONTO - 0.3, 0, 0],
  [ONTO, 0.4, 1.4],
  [TURNS[0], Math.PI, 2.3],
  [TURNS[1], 2 * Math.PI, 2.0],
  [TURNS[2], 3 * Math.PI, 2.0],
  [TURNS[3], 4 * Math.PI, 2.1],
  [FLICK, 5 * Math.PI, 2.9],
  [FLICK + 2.8, 6.6 * Math.PI, 0],
])
/** The hat's turn on the ribbon's turntable, off the flywheel's belt, while the trolley stands there. */
const spin = (t: number): number => (t < TURNS[0] ? 0 : (fly(Math.min(t, TURNS[3])) - fly(TURNS[0])) * 2.2)
/** How much of the ribbon is round the crown (0 → 1 over the lay), and whether the guide is in against it. */
const laid = (t: number): number => smooth(t, RIBBON_ON, CUT - 0.1)
const guideIn = (t: number): number => smooth(t, RIBBON_ON - 0.4, RIBBON_ON) * (1 - smooth(t, CUT, CUT + 0.35))

/** The pedal's arm angle: up at rest, brought down by her weight with a thump on the floor, and back up once she is out. */
const press2 = curve([
  [PAN, G_REST, 0.35],
  [RAISED, G_DOWN, 0.55],
])
function pedalA(t: number): number {
  if (t <= PAN) return G_REST
  if (t < RAISED) return press2(t)
  return G_DOWN - Math.abs(ring(t - RAISED, 0.04, 20, 0.09)) + (G_REST - G_DOWN) * smooth(t, RAISED + 1.2, RAISED + 3.6)
}
const cupAt = (t: number): Pt => polar(PEDAL, PEDAL_ARM, pedalA(t))
/** The cup tips forward on its pin as it thumps the floor, spilling her out over its lip, and rights itself. */
const cupTip = (t: number): number => 0.55 * smooth(t, RAISED, RAISED + 0.18) * (1 - smooth(t, RAISED + 0.7, RAISED + 1.5))
/** The stand's column: up with the pedal, latched at the top (it stays up when the pedal goes back). */
function column(t: number): number {
  if (t < PAN) return 0
  if (t < RAISED) return (COLUMN_RISE * (pedalA(t) - G_REST)) / (G_DOWN - G_REST)
  return COLUMN_RISE + ring(t - RAISED, 0.025, 24, 0.12)
}

/* ------------------------------------------------------------------ her path */

/** On the platform, rising, and on it as it tips: her centre. */
const liftBall = (t: number): Pt => onPlat(t, LIFT_X, R)
/** Off the tipped platform, along the shelf, out onto the ledge and to its end as it tips. */
const shelfX = curve([
  [LAST, LIFT_X, 0],
  [LAST + 0.55, LIFT_X + 0.22, 0.62],
  [8.2, 0.42, 0.42],
  [9.3, 0.84, 0.08],
  [9.6, 0.85, 0],
])
const ledgeS = curve([
  [9.6, 0.33, 0],
  [LEDGE_OFF, LEDGE_L - 0.06, 0.55],
])
function shelfBall(t: number): Pt {
  const x = shelfX(t)
  if (x < PLAT[1]) return onPlat(t, x, R)
  if (x < LEDGE_O[0]) return [x, SILL - R]
  return onLedge(t, t < 9.6 ? x - LEDGE_O[0] : ledgeS(t), R)
}
/** On the press's treadle, then the sewing plate. */
function floorBall(t: number): Pt {
  const x = rollX(t)
  // On the treadle: the point along it under her, lifted by her radius (its x solved so hers is x).
  const f = freeEnd(t)
  const L = Math.hypot(T_HINGE[0] - f[0], T_HINGE[1] - f[1])
  const ux = (T_HINGE[0] - f[0]) / L
  const uy = (T_HINGE[1] - f[1]) / L
  const d = (x - f[0] - uy * R) / ux
  const onTreadle = f[1] + uy * d - ux * R
  if (x <= T_HINGE[0] - 0.14) return [x, onTreadle]
  // On the sewing plate; and over the hinge, the one surface easing into the other.
  const a = plate(t)
  const onPlate = PIVOT[1] + (x - PIVOT[0]) * Math.tan(a) - R / Math.cos(a)
  const w = smooth(x, T_HINGE[0] - 0.14, T_HINGE[0] + 0.2)
  return [x, onTreadle + (onPlate - onTreadle) * w]
}
/** In the pedal's cup. */
const cupBall = (t: number): Pt => {
  const c = cupAt(t)
  return [c[0], c[1] - R - 0.015]
}

/**
 * The run out: out of the cup onto the floor, up to speed, to the door on the bell, and down the street slowing to
 * the alley's pace. Two ramps, peaking at `vp` at `tp`, solved so she is at the door's leaf on `DOOR` and at the exit
 * on the slot's end.
 */
const OUT_AT: Pt = [5.05, 0]
const OUT_V = 0.95
/** Out over the cup's lip as it tips on the floor: from rest to rolling, a short ramp. */
const OUT_T = RAISED + Math.hypot(OUT_AT[0] - 4.721, OUT_AT[1] + 0.047) / ((0.1 + OUT_V) / 2)
const EXIT_X = 25.5
const EXIT_V = 0.9
const DOOR_X = DOOR_AT.x0 - R - 0.01
function solveRun(end: number): { tp: number; vp: number } {
  let best = { tp: OUT_T + 1, vp: 2, err: Infinity }
  for (let tp = OUT_T + 0.3; tp < DOOR; tp += 0.002) {
    const d1 = tp - OUT_T
    const d2 = end - tp
    const vp = (2 * (EXIT_X - OUT_AT[0]) - OUT_V * d1 - EXIT_V * d2) / (d1 + d2)
    const s = DOOR - tp
    const x = OUT_AT[0] + ((OUT_V + vp) / 2) * d1 + vp * s + (0.5 * (EXIT_V - vp) * s * s) / d2
    const err = Math.abs(x - DOOR_X)
    if (err < best.err) best = { tp, vp, err }
  }
  return { tp: best.tp, vp: best.vp }
}

/* ------------------------------------------------------------------ the part */

interface ShopState {
  begin: number
}

export const shop = part<ShopState>(
  {
    name: 'shop',
    draw: (p, s, c) => drawShop(p, c, c.t + s.begin),
    over: (p, s, c) => drawOver(p, c, c.t + s.begin),
  },
  (slot) => {
    // Every time here is show time; the shop's slot begins at 0, so its lane's times are the same.
    const at = (T: number) => T - slot.begin
    const n = (a: number, b: number, per = 40) => Math.max(2, Math.ceil((b - a) * per))
    const { tp, vp } = solveRun(slot.end)
    const peakX = OUT_AT[0] + ((OUT_V + vp) / 2) * (tp - OUT_T)
    const off = shelfBall(LEDGE_OFF)
    const land = floorBall(LAND)
    const flickFrom = floorBall(FLICK)
    const cup0 = cupBall(PAN)
    const cup1 = cupBall(RAISED)
    const segs: Seg[] = [
      ...route([
        { at: 0, p: [LIFT_X, 0] },
        { at: at(START), p: liftBall(START) },
      ]),
      ...carried(liftBall, START, LAST, n(START, LAST)),
      ...carried(shelfBall, LAST, LEDGE_OFF, n(LAST, LEDGE_OFF)),
      ...route([
        { at: at(LEDGE_OFF), p: off },
        { at: at(LAND), p: land, arc: (G * (LAND - LEDGE_OFF) ** 2) / 8 },
      ]),
      ...carried(floorBall, LAND, FLICK, n(LAND, FLICK, 60)),
      ...route([
        { at: at(FLICK), p: flickFrom },
        { at: at(PAN), p: cup0, arc: (G * (PAN - FLICK) ** 2) / 8 },
      ]),
      ...carried(cupBall, PAN, RAISED, n(PAN, RAISED)),
      ...route([
        { at: at(RAISED), p: cup1 },
        { at: at(OUT_T), p: OUT_AT, ramp: [0.1, OUT_V], arc: 0.04 },
        { at: at(tp), p: [peakX, 0], ramp: [OUT_V, vp] },
        { at: at(slot.end), p: [EXIT_X, 0], ramp: [vp, EXIT_V] },
      ]),
    ]
    return {
      cells: box(-2.5, -4, 5.5, 1),
      exit: [EXIT_X + 0.5, 0],
      lane: { segs, fire: at(START) },
      state: { begin: slot.begin },
    }
  },
  (slot): PartShot[] => [
    // The dark workroom, close on her and the music box on the sill.
    { t: 0, cells: 3.0, hold: [-0.8, -0.86], w: 1 },
    { t: START + 0.5, cells: 3.0, hold: [-0.8, -0.9], w: 1 },
    // Up with her into the light.
    { t: TOP, cells: 3.2, hold: [-0.7, -1.52], w: 1 },
    { t: LAST, cells: 3.3, hold: [-0.5, -1.55], w: 1 },
    // Along the shelf, the press coming into the frame; the light comes up.
    { t: 8.4, cells: 3.6, hold: [0.45, -1.42], w: 1 },
    { t: 9.9, cells: 3.75, hold: [1.15, -1.25], w: 1 },
    // The press.
    { t: SEAT, cells: 3.5, hold: [1.7, -1.05], w: 1 },
    { t: RAM_UP, cells: 3.45, hold: [2.15, -0.98], w: 1 },
    // The sewing treadle, the ribbon.
    { t: TURNS[0], cells: 3.4, hold: [2.85, -0.88], w: 1 },
    // In close while the ribbon goes round the crown, and back out for the flick.
    { t: RIBBON_ON, cells: 3.1, hold: [2.95, -0.8], w: 1 },
    { t: CUT, cells: 3.0, hold: [3.0, -0.78], w: 1 },
    { t: TURNS[3], cells: 3.35, hold: [3.1, -0.88], w: 1 },
    // The stand rises.
    { t: PAN, cells: 3.8, hold: [3.75, -1.15], w: 1 },
    { t: RAISED, cells: 4.3, hold: [4.2, -1.3], w: 1 },
    // Across the shop to the door.
    { t: DOOR, cells: 5.0, hold: [7.3, -1.4], off: [0.9, -1.25], w: 0.35 },
    // The street, the town waking: wide, following, the houses' first floors in the frame.
    { t: 30.2, cells: 7.2, off: [1.6, -2.15], w: 0 },
    { t: 34.6, cells: 7.2, off: [1.5, -2.15], w: 0 },
    // Down to the alley's framing on the seam.
    { t: slot.end, cells: 5, hold: [EXIT_X + 0.9, -0.8], w: 1 },
  ],
)

/* ------------------------------------------------------------------ drawing */

type Tone = (hex: string) => string
type Ctx = { k: number; ink: string; weight: number }

function drawShop(p: p5, c: Ctx, t: number): void {
  const tone = inside(t)
  p.push()
  p.rectMode(p.CORNER)
  drawLight(p, c, t)
  drawMusicBox(p, c, t, tone)
  drawLift(p, c, t, tone)
  drawShelf(p, c, t, tone)
  drawPress(p, c, t, tone)
  drawLine(p, c, t, tone)
  drawSewing(p, c, t, tone)
  drawPedal(p, c, t, tone)
  drawSteam(p, c, t)
  p.pop()
}

/** In front of her: the cup's front lip while she rides it. */
function drawOver(p: p5, c: Ctx, t: number): void {
  if (t < PAN - 0.1 || t > RAISED + 0.6) return
  const tone = inside(t)
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const [cx, cy] = cupAt(t)
  p.push()
  p.translate(X(cx), X(cy))
  p.rotate(cupTip(t))
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(TOWN.gold))
  p.beginShape()
  p.vertex(X(-0.2), X(-0.1))
  p.bezierVertex(X(-0.19), X(0.06), X(0.19), X(0.06), X(0.2), X(-0.1))
  p.bezierVertex(X(0.1), X(-0.05), X(-0.1), X(-0.05), X(-0.2), X(-0.1))
  p.endShape(p.CLOSE)
  p.pop()
}

/** The dawn in the workroom: a warm pool where the window's light lands, coming up with the sun. */
function drawLight(p: p5, c: Ctx, t: number): void {
  if (t > 45) return
  glow(p, c.k, 0.9, -0.9, 2.2, TOWN.glow, 0.16 * smooth(t, 1.5, 9))
}

/* --------------------------------------------- the music box */

function drawMusicBox(p: p5, c: Ctx, t: number, tone: Tone): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const phi = cylinder(t)
  const { x0, x1, top } = MB
  // The box: walnut, a brass rim at the lid.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(mixHex(TOWN.timberDark, TOWN.timber, 0.4)))
  p.rect(X(x0), X(top), X(x1 - x0), X(SILL - top - 0.02))
  p.fill(tone(TOWN.gold))
  p.rect(X(x0 - 0.02), X(top - 0.035), X(x1 - x0 + 0.04), X(0.05))
  // The glass front: the cylinder and its pins above, the comb's tines below.
  const g0 = x0 + 0.06
  const g1 = x1 - 0.06
  const gy0 = top + 0.05
  const gy1 = SILL - 0.06
  p.fill(tone(mixHex(TOWN.night, TOWN.timberDark, 0.5)))
  p.rect(X(g0), X(gy0), X(g1 - g0), X(gy1 - gy0))
  const cy = gy0 + 0.055
  p.noStroke()
  p.fill(tone(TOWN.gold))
  p.rect(X(g0 + 0.03), X(cy - 0.035), X(g1 - g0 - 0.06), X(0.07), X(0.02))
  p.fill(tone(mixHex(TOWN.gold, TOWN.plaster, 0.5)))
  for (let i = 0; i < 18; i++) {
    const a = phi * 1.3 + hash(i, 5) * Math.PI * 2
    if (Math.cos(a) < 0.1) continue
    const x = g0 + 0.05 + ((g1 - g0 - 0.1) * ((i * 7) % 18)) / 17
    p.circle(X(x), X(cy + Math.sin(a) * 0.03), X(0.014))
  }
  // The comb: a steel bar, tines up from it, each set ringing when its note is plucked.
  const base = gy1 - 0.015
  p.stroke(tone(mixHex(TOWN.plaster, TOWN.slate, 0.35)))
  p.strokeCap(p.SQUARE)
  for (let i = 0; i < TINES; i++) {
    const x = g0 + 0.045 + ((g1 - g0 - 0.09) * i) / (TINES - 1)
    const len = 0.1 - i * 0.006
    let bend = 0
    NOTES.forEach((at, j) => {
      if (tineOf(j) === i) bend += ring(t - at, 0.35, 70, 0.14)
    })
    p.strokeWeight(X(0.018))
    p.line(X(x), X(base), X(x + Math.sin(bend) * len), X(base - Math.cos(bend) * len))
  }
  p.strokeCap(p.ROUND)
  p.noStroke()
  p.fill(tone(mixHex(TOWN.plaster, TOWN.slate, 0.45)))
  p.rect(X(g0 + 0.02), X(base), X(g1 - g0 - 0.04), X(0.022))
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(W * 0.55)
  p.rect(X(g0), X(gy0), X(g1 - g0), X(gy1 - gy0))
  // The drum on its side, seen end-on to us as a barrel between two flanges, winding the lift's cord.
  const turns = (FLOOR - liftY(t)) / SPOOL_R
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(tone(TOWN.timberDark))
  p.rect(X(SPOOL[0] - 0.09), X(SPOOL[1] - 0.02), X(0.05), X(0.04))
  p.fill(tone(mixHex(TOWN.straw, TOWN.timber, 0.3)))
  p.rect(X(SPOOL[0] - 0.045), X(SPOOL[1] - SPOOL_R), X(0.09), X(SPOOL_R * 2))
  p.stroke(alpha(p, ink, 0.4))
  p.strokeWeight(W * 0.4)
  for (let i = 0; i < 3; i++) {
    const a = turns + (i * Math.PI * 2) / 3
    if (Math.cos(a) > 0) p.line(X(SPOOL[0] - 0.04), X(SPOOL[1] + Math.sin(a) * SPOOL_R), X(SPOOL[0] + 0.04), X(SPOOL[1] + Math.sin(a) * SPOOL_R))
  }
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(tone(TOWN.timber))
  p.rect(X(SPOOL[0] - 0.065), X(SPOOL[1] - SPOOL_R - 0.03), X(0.022), X(SPOOL_R * 2 + 0.06), X(0.01))
  p.rect(X(SPOOL[0] + 0.043), X(SPOOL[1] - SPOOL_R - 0.03), X(0.022), X(SPOOL_R * 2 + 0.06), X(0.01))
  // The carousel on the lid.
  drawCarousel(p, c, t, tone, phi)
}

/** The carousel on the lid: a deck, a pole, a striped canopy, four little hats riding round and rising. */
function drawCarousel(p: p5, c: Ctx, t: number, tone: Tone, phi: number): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const cx = MB_CX
  const deck = MB.top - 0.06
  const rx = 0.27
  const ry = 0.07
  const turn = phi * 0.42
  const canopy = deck - 0.44
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(tone(TOWN.ribbon))
  p.ellipse(X(cx), X(deck + 0.02), X(rx * 2), X(ry * 2))
  p.fill(tone(mixHex(TOWN.plaster, TOWN.gold, 0.4)))
  p.ellipse(X(cx), X(deck), X(rx * 2), X(ry * 2))
  const riders = [0, 1, 2, 3].map((i) => {
    const a = turn + (i * Math.PI) / 2
    return { i, a, z: Math.cos(a) }
  })
  riders.sort((u, v) => u.z - v.z)
  const hats = [TOWN.felt, TOWN.straw, TOWN.rose, mixHex(TOWN.shutter, TOWN.felt, 0.3)]
  let pole = false
  for (const r of riders) {
    if (!pole && r.z >= 0) {
      p.stroke(ink)
      p.strokeWeight(W * 0.5)
      p.fill(tone(TOWN.gold))
      p.rect(X(cx - 0.018), X(canopy), X(0.036), X(deck - canopy))
      pole = true
    }
    const x = cx + 0.2 * Math.sin(r.a)
    const y = deck + 0.05 * Math.cos(r.a)
    const up = 0.05 + 0.035 * Math.sin(turn * 3 + r.i * 1.6)
    const dim = r.z < 0 ? 0.35 : 0
    p.stroke(tone(TOWN.gold))
    p.strokeWeight(X(0.012))
    p.line(X(x), X(y), X(x), X(canopy + 0.05))
    p.push()
    p.translate(X(x), X(y - 0.12 - up))
    hatShape(p, k, W * 0.6, ink, 0.15, tone(mixHex(hats[r.i], TOWN.night, dim)), tone(mixHex(TOWN.ribbon, TOWN.night, dim)))
    p.pop()
  }
  // The canopy: a cone of stripes and a scalloped rim.
  p.stroke(ink)
  p.strokeWeight(W * 0.55)
  const n = 8
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (Math.PI * i) / n
    const a1 = Math.PI + (Math.PI * (i + 1)) / n
    p.fill(tone(i % 2 ? TOWN.plaster : TOWN.ribbon))
    p.beginShape()
    p.vertex(X(cx), X(canopy - 0.2))
    p.vertex(X(cx + Math.cos(a0) * 0.31), X(canopy - Math.sin(a0) * 0.08))
    p.vertex(X(cx + Math.cos(a1) * 0.31), X(canopy - Math.sin(a1) * 0.08))
    p.endShape(p.CLOSE)
  }
  p.fill(tone(TOWN.gold))
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (Math.PI * (i + 0.5)) / 6
    p.arc(X(cx + Math.cos(a) * 0.31), X(canopy - Math.sin(a) * 0.08 + 0.005), X(0.1), X(0.07), 0, Math.PI, p.CHORD)
  }
  p.noStroke()
  p.fill(tone(TOWN.gold))
  p.circle(X(cx), X(canopy - 0.22), X(0.04))
  // The first light catches the brass as the sun comes up.
  if (t < 40) glow(p, k, cx + 0.12, canopy - 0.05, 0.28, TOWN.glow, 0.25 * smooth(t, 2.5, 7) * (1 - smooth(t, 14, 20)))
}

/* --------------------------------------------- the lift */

function drawLift(p: p5, c: Ctx, t: number, tone: Tone): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const y = liftY(t)
  // The guide post, floor to beam.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(TOWN.timber))
  p.rect(X(POST_X - 0.05), X(CEIL), X(0.1), X(FLOOR - CEIL))
  // The pulleys in the beam, and the cord: spool up, across, down to the carriage.
  const pa: Pt = [SPOOL[0], PULLEY_Y]
  const pb: Pt = [POST_X + 0.1, PULLEY_Y]
  p.stroke(tone(mixHex(TOWN.straw, TOWN.timber, 0.4)))
  p.strokeWeight(W * 0.6)
  p.line(X(SPOOL[0]), X(SPOOL[1] - SPOOL_R), X(pa[0]), X(pa[1] + 0.05))
  p.line(X(pa[0]), X(pa[1] - 0.05), X(pb[0]), X(pb[1] - 0.05))
  p.line(X(pb[0] + 0.05), X(pb[1]), X(pb[0] + 0.05), X(y - 0.2))
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  for (const q of [pa, pb]) {
    p.fill(tone(TOWN.gold))
    p.circle(X(q[0]), X(q[1]), X(0.1))
    p.fill(ink)
    p.circle(X(q[0]), X(q[1]), X(0.02))
  }
  // The carriage on the post, and the platform it carries, tipping on the last note.
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.fill(tone(TOWN.timberDark))
  p.rect(X(POST_X - 0.08), X(y - 0.24), X(0.2), X(0.34))
  p.push()
  p.translate(X(PLAT[0]), X(y))
  p.rotate(liftTip(t))
  p.fill(tone(mixHex(TOWN.timber, TOWN.straw, 0.25)))
  p.rect(0, 0, X(PLAT[1] - PLAT[0]), X(0.06))
  p.pop()
}

/* --------------------------------------------- the shelf and its tipping ledge */

function drawShelf(p: p5, c: Ctx, t: number, tone: Tone): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(TOWN.timber))
  p.rect(X(SHELF[0]), X(SILL), X(SHELF[1] - SHELF[0]), X(0.07))
  p.fill(tone(TOWN.timberDark))
  p.triangle(X(SHELF[0] + 0.12), X(SILL + 0.07), X(SHELF[0] + 0.22), X(SILL + 0.07), X(SHELF[0] + 0.12), X(SILL + 0.35))
  // The ledge: hinged at the shelf's end, a counterweight under its hinge.
  p.push()
  p.translate(X(LEDGE_O[0]), X(LEDGE_O[1]))
  p.rotate(ledge(t))
  p.fill(tone(mixHex(TOWN.timber, TOWN.gold, 0.2)))
  p.rect(0, 0, X(LEDGE_L), X(0.06))
  p.fill(tone(mixHex(TOWN.slate, TOWN.night, 0.3)))
  p.rect(X(-0.14), X(0.06), X(0.12), X(0.12), X(0.02))
  p.pop()
  p.fill(tone(TOWN.gold))
  p.circle(X(LEDGE_O[0]), X(LEDGE_O[1] + 0.03), X(0.05))
}

/* --------------------------------------------- the kick press */

function drawPress(p: p5, c: Ctx, t: number, tone: Tone): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const ang = rockerAng(t)
  const f = freeEnd(t)
  const iron = tone(mixHex(TOWN.slateDark, TOWN.night, 0.25))
  const ironHi = tone(mixHex(TOWN.slateDark, TOWN.plaster, 0.18))
  const ry = ramTop(t)
  // The kettle at the back of the bench that feeds the ram its steam: copper, a lid, a spout to the hose.
  const kx = 1.55
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(mixHex(TOWN.gold, TOWN.rose, 0.4)))
  p.beginShape()
  p.vertex(X(kx - 0.17), X(BENCH - 0.03))
  p.bezierVertex(X(kx - 0.22), X(BENCH - 0.22), X(kx - 0.15), X(BENCH - 0.33), X(kx), X(BENCH - 0.34))
  p.bezierVertex(X(kx + 0.15), X(BENCH - 0.33), X(kx + 0.22), X(BENCH - 0.22), X(kx + 0.17), X(BENCH - 0.03))
  p.endShape(p.CLOSE)
  p.fill(tone(TOWN.timberDark))
  p.rect(X(kx - 0.05), X(BENCH - 0.4), X(0.1), X(0.07), X(0.02))
  // Its hose, up and over to the ram's top.
  p.noFill()
  p.stroke(tone(mixHex(TOWN.timberDark, TOWN.night, 0.35)))
  p.strokeWeight(X(0.035))
  p.bezier(X(kx + 0.16), X(BENCH - 0.2), X(kx + 0.45), X(BENCH - 0.3), X(RAM_X - 0.5), X(ry - 0.25), X(RAM_X - 0.12), X(ry + 0.06))
  // The frame: a cast-iron gooseneck from a broad foot on the bench, up and over the ram, a boss that guides it.
  const col = ROCKER[0] + 0.02
  const head = ROCKER[1] + 0.2
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  p.fill(iron)
  p.beginShape()
  p.vertex(X(col - 0.26), X(BENCH))
  p.vertex(X(col + 0.2), X(BENCH))
  p.vertex(X(col + 0.1), X(BENCH - 0.18))
  p.vertex(X(col + 0.1), X(head - 0.14))
  p.bezierVertex(X(col + 0.1), X(head - 0.3), X(col - 0.05), X(head - 0.32), X(col - 0.22), X(head - 0.32))
  p.vertex(X(RAM_X - 0.1), X(head - 0.32))
  p.vertex(X(RAM_X - 0.1), X(head - 0.08))
  p.vertex(X(col - 0.2), X(head - 0.08))
  p.bezierVertex(X(col - 0.1), X(head - 0.08), X(col - 0.1), X(head), X(col - 0.1), X(head + 0.08))
  p.vertex(X(col - 0.1), X(BENCH - 0.18))
  p.endShape(p.CLOSE)
  // A highlight down its face.
  p.stroke(ironHi)
  p.strokeWeight(X(0.025))
  p.line(X(col + 0.04), X(BENCH - 0.2), X(col + 0.04), X(head - 0.12))
  // The ram's stem through the boss, and the ram: a heavy iron bell with a crown-shaped hollow.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(ironHi)
  p.rect(X(RAM_X - 0.035), X(head - 0.5), X(0.07), X(ry - head + 0.5))
  p.fill(iron)
  p.rect(X(RAM_X - 0.13), X(head - 0.34), X(0.26), X(0.3), X(0.04))
  p.strokeWeight(W * 0.9)
  p.fill(iron)
  p.beginShape()
  p.vertex(X(RAM_X - 0.12), X(ry))
  p.vertex(X(RAM_X + 0.12), X(ry))
  p.bezierVertex(X(RAM_X + 0.2), X(ry + 0.04), X(RAM_X + 0.25), X(ry + 0.15), X(RAM_X + 0.26), X(ry + RAM_H))
  p.vertex(X(RAM_X - 0.26), X(ry + RAM_H))
  p.bezierVertex(X(RAM_X - 0.25), X(ry + 0.15), X(RAM_X - 0.2), X(ry + 0.04), X(RAM_X - 0.12), X(ry))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(ironHi)
  p.rect(X(RAM_X - 0.2), X(ry + RAM_H - 0.07), X(0.4), X(0.03))
  // Its heat: a warm edge while it is on the felt.
  const hot = pressed(t)
  if (hot > 0.05) glow(p, k, RAM_X, ry + RAM_H, 0.34, TOWN.fire, 0.16 * hot)
  // The lever on top: pivoted on the neck, pressing the stem at the ram, the rod at its long end, a weight at its short end.
  const rodTop: Pt = [ROCKER[0] - ROCK_ARM * Math.cos(ang), ROCKER[1] - 0.3 + ROCK_ARM * Math.sin(ang)]
  p.push()
  p.translate(X(ROCKER[0]), X(ROCKER[1] - 0.3))
  p.rotate(-ang)
  p.stroke(ink)
  p.strokeWeight(W * 0.85)
  p.fill(iron)
  p.rect(X(-ROCK_ARM - 0.06), X(-0.055), X(ROCK_ARM + 0.5), X(0.11), X(0.04))
  // The counterweight that lifts it all back when she is off the treadle.
  p.fill(tone(mixHex(TOWN.slate, TOWN.night, 0.45)))
  p.rect(X(0.26), X(-0.16), X(0.2), X(0.3), X(0.03))
  p.pop()
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(iron)
  p.rect(X(ROCKER[0] - 0.05), X(ROCKER[1] - 0.3), X(0.1), X(0.3))
  p.fill(tone(TOWN.gold))
  p.circle(X(ROCKER[0]), X(ROCKER[1] - 0.3), X(0.08))
  // The rod down past the bench's end to the treadle.
  const rodFoot = along(f, T_HINGE, ROD_D, 0.03)
  p.stroke(iron)
  p.strokeWeight(X(0.045))
  p.line(X(rodTop[0]), X(rodTop[1]), X(rodFoot[0]), X(rodFoot[1]))
  p.noStroke()
  p.fill(tone(TOWN.gold))
  p.circle(X(rodTop[0]), X(rodTop[1]), X(0.05))
  p.circle(X(rodFoot[0]), X(rodFoot[1]), X(0.05))
  // The treadle: a flat iron bar from its hinge to its free end.
  const th = 0.06
  p.stroke(ink)
  p.strokeWeight(W * 0.85)
  p.fill(iron)
  p.quad(X(f[0]), X(f[1]), X(T_HINGE[0]), X(T_HINGE[1]), X(T_HINGE[0]), X(T_HINGE[1] + th), X(f[0]), X(f[1] + th))
  p.fill(tone(TOWN.timberDark))
  p.triangle(X(T_HINGE[0] - 0.08), X(FLOOR), X(T_HINGE[0] + 0.08), X(FLOOR), X(T_HINGE[0]), X(T_HINGE[1] + 0.02))
  p.fill(tone(TOWN.gold))
  p.circle(X(T_HINGE[0]), X(T_HINGE[1] + 0.03), X(0.06))
}

/* --------------------------------------------- the line: the trolley, the ribbon, the stand */

function hatOnBlock(p: p5, c: Ctx, t: number, tone: Tone, x: number, base: number): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const shaped = smooth(t, SEAT, RAM_UP)
  // The turntable, the felt: a limp hood before the press, a hat after.
  const turn = spin(t)
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(tone(TOWN.timber))
  p.rect(X(x - 0.2), X(base - 0.04), X(0.4), X(0.04))
  p.stroke(alpha(p, ink, 0.5))
  p.strokeWeight(W * 0.5)
  for (let i = 0; i < 3; i++) {
    const a = turn + (i * Math.PI * 2) / 3
    if (Math.cos(a) < 0) continue
    const sx = x + 0.18 * Math.sin(a)
    p.line(X(sx), X(base - 0.035), X(sx), X(base - 0.005))
  }
  p.push()
  p.translate(X(x), X(base - 0.05))
  p.rotate(wobble(t))
  const w = 0.62
  const felt = tone(mixHex(TOWN.felt, TOWN.rose, 0.18))
  if (shaped < 0.5) {
    // The hood: a soft dome with a ragged skirt, before the press shapes it.
    const u = shaped * 2
    p.stroke(ink)
    p.strokeWeight(W * 0.7)
    p.fill(felt)
    p.beginShape()
    p.vertex(X(-0.22 - 0.04 * u), X(0.0))
    p.bezierVertex(X(-0.24), X(-0.18), X(-0.14), X(-0.23), X(0), X(-0.23))
    p.bezierVertex(X(0.14), X(-0.23), X(0.24), X(-0.18), X(0.22 + 0.04 * u), X(0.0))
    p.bezierVertex(X(0.12), X(0.03), X(-0.12), X(0.03), X(-0.22 - 0.04 * u), X(0.0))
    p.endShape(p.CLOSE)
  } else {
    // The hat, with the ribbon going round it.
    hatShape(p, k, W, ink, w, felt, '', 0)
    const band = laid(t)
    if (band > 0) {
      const cw = w * 0.3
      // The ribbon comes in at the right and the turning crown carries its end round the front to the left.
      const lead = band < 0.5 ? cw * Math.cos(Math.PI * band * 2) : -cw
      p.noStroke()
      p.fill(tone(TOWN.ribbon))
      p.rect(X(lead), X(-0.16 * w), X(cw - lead), X(0.09 * w))
      // The join, dabbed down on 20.78: a small bow of ribbon on the band.
      const knot = smooth(t, DAB - 0.05, DAB + 0.05)
      if (knot > 0) {
        p.stroke(ink)
        p.strokeWeight(W * 0.5)
        p.fill(tone(mixHex(TOWN.ribbon, TOWN.timberDark, 0.15)))
        const s = 0.035 + 0.03 * knot
        p.triangle(X(cw * 0.5), X(-0.115 * w), X(cw * 0.5 + s * 1.4), X(-0.2 * w), X(cw * 0.5 + s * 1.4), X(-0.03 * w))
        p.triangle(X(cw * 0.5), X(-0.115 * w), X(cw * 0.5 - s * 1.4), X(-0.2 * w), X(cw * 0.5 - s * 1.4), X(-0.03 * w))
      }
    }
  }
  p.pop()
}

function drawLine(p: p5, c: Ctx, t: number, tone: Tone): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  // The rail along the bench.
  p.stroke(alpha(p, ink, 0.6))
  p.strokeWeight(W * 0.6)
  p.fill(tone(TOWN.gold))
  p.rect(X(1.75), X(BENCH - 0.035), X(AT_STAND - 1.75 + 0.2), X(0.035))
  // The stand at the bench's end: a brass column that rises from its sleeve, a plate on top the trolley docks on.
  const up = column(t)
  const colTop = BENCH - 0.04 - up
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.fill(tone(mixHex(TOWN.gold, TOWN.timber, 0.25)))
  p.rect(X(AT_STAND - 0.04), X(colTop), X(0.08), X(BENCH - colTop))
  p.fill(tone(TOWN.timberDark))
  p.rect(X(AT_STAND - 0.1), X(BENCH - 0.02), X(0.2), X(0.1))
  if (up > 0.02) {
    p.fill(tone(TOWN.gold))
    p.rect(X(AT_STAND - 0.26), X(colTop - 0.02), X(0.52), X(0.03))
  }
  // The trolley: a little car on two wheels, the turntable and the hat on it.
  const x = trolley(t)
  const onStand = t >= PAN - 0.02
  const deck = onStand ? colTop - 0.02 : BENCH - 0.1
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(tone(TOWN.timberDark))
  p.rect(X(x - 0.24), X(deck), X(0.48), X(0.05))
  p.fill(tone(TOWN.gold))
  for (const dx of [-0.15, 0.15]) {
    const wy = deck + 0.065
    p.circle(X(x + dx), X(wy), X(0.07))
    const a = (x - AT_PRESS) / 0.035
    p.line(X(x + dx), X(wy), X(x + dx + Math.cos(a) * 0.03), X(wy + Math.sin(a) * 0.03))
  }
  hatOnBlock(p, c, t, tone, x, deck)
  // The ribbon's reel on its bracket, turned side-on: flanges and the wound ribbon between them, turning as it pays out.
  const [sx, sy] = SPOOL2
  const lay = laid(t)
  const wound = 0.09 - 0.035 * lay
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(tone(TOWN.timber))
  p.rect(X(sx - 0.03), X(sy + 0.05), X(0.06), X(BENCH - sy - 0.05))
  p.fill(tone(TOWN.ribbon))
  p.rect(X(sx - 0.1), X(sy - wound), X(0.2), X(wound * 2))
  p.stroke(alpha(p, ink, 0.35))
  p.strokeWeight(W * 0.45)
  const turn = lay * 14
  for (let i = 0; i < 3; i++) {
    const y = sy + wound * Math.sin(turn + (i * Math.PI * 2) / 3)
    if (Math.cos(turn + (i * Math.PI * 2) / 3) > 0) p.line(X(sx - 0.09), X(y), X(sx + 0.09), X(y))
  }
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.fill(tone(TOWN.timberDark))
  p.rect(X(sx - 0.13), X(sy - 0.11), X(0.035), X(0.22), X(0.01))
  p.rect(X(sx + 0.095), X(sy - 0.11), X(0.035), X(0.22), X(0.01))
  // The guide: an arm from the reel's bracket with a roller at its tip; it swings in to lay the ribbon, out to cut it,
  // and dabs in once more to press the join.
  const ds = t - (DAB - 0.16)
  const dab = ds > 0 && ds < 0.32 ? Math.sin((ds / 0.32) * Math.PI) : 0
  const gi = Math.max(guideIn(t), 0.85 * dab)
  const crownY = BENCH - 0.1 - 0.05 - 0.62 * 0.12
  const arm: Pt = [sx - 0.02 - 0.27 * gi, crownY + 0.02]
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.line(X(sx), X(sy + 0.1), X(arm[0]), X(arm[1]))
  p.fill(tone(TOWN.gold))
  p.rect(X(arm[0] - 0.035), X(arm[1] - 0.05), X(0.07), X(0.1), X(0.02))
  // The ribbon itself: from the reel to the guide's roller and on to the crown while it is laid; a tail once cut.
  if (t > RIBBON_ON - 0.3 && t < CUT + 1.2) {
    p.stroke(tone(TOWN.ribbon))
    p.strokeWeight(X(0.035))
    p.line(X(sx - 0.09), X(sy + wound), X(arm[0]), X(arm[1]))
    if (t < CUT) p.line(X(arm[0]), X(arm[1]), X(AT_RIBBON + 0.19), X(arm[1]))
    else p.line(X(arm[0]), X(arm[1]), X(arm[0] - 0.02), X(arm[1] + Math.min(0.14, (t - CUT) * 0.6)))
  }
}

/* --------------------------------------------- the sewing treadle */

function drawSewing(p: p5, c: Ctx, t: number, tone: Tone): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const iron = tone(mixHex(TOWN.slateDark, TOWN.night, 0.2))
  const a = fly(t)
  // The flywheel under the bench, spoked, and its crank pin.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(iron)
  p.circle(X(FLY[0]), X(FLY[1]), X(FLY_R * 2))
  p.fill(tone(mixHex(TOWN.plaster, TOWN.gold, 0.35)))
  p.circle(X(FLY[0]), X(FLY[1]), X(FLY_R * 2 - 0.07))
  p.stroke(iron)
  p.strokeWeight(X(0.025))
  for (let i = 0; i < 5; i++) {
    const b = a + (i * Math.PI * 2) / 5
    p.line(X(FLY[0]), X(FLY[1]), X(FLY[0] + Math.cos(b) * (FLY_R - 0.04)), X(FLY[1] + Math.sin(b) * (FLY_R - 0.04)))
  }
  const pin = polar(FLY, 0.1, a)
  // The belt up through the bench to the turntable's pulley at the ribbon.
  p.stroke(tone(mixHex(TOWN.timberDark, TOWN.timber, 0.5)))
  p.strokeWeight(X(0.022))
  p.line(X(FLY[0] - FLY_R + 0.02), X(FLY[1]), X(AT_RIBBON - 0.05), X(BENCH + 0.02))
  p.line(X(FLY[0] - 0.05), X(FLY[1] - FLY_R + 0.02), X(AT_RIBBON + 0.05), X(BENCH + 0.02))
  // The plate on its pivot block, tilting to her side; the pitman up to the crank.
  const tau = plate(t)
  const endR = polar(PIVOT, PLATE_HALF, tau)
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.fill(tone(TOWN.timberDark))
  p.triangle(X(PIVOT[0] - 0.08), X(FLOOR), X(PIVOT[0] + 0.08), X(FLOOR), X(PIVOT[0]), X(PIVOT[1] + 0.02))
  p.push()
  p.translate(X(PIVOT[0]), X(PIVOT[1]))
  p.rotate(tau)
  p.fill(iron)
  p.rect(X(-PLATE_HALF), 0, X(PLATE_HALF * 2), X(0.05), X(0.015))
  p.stroke(alpha(p, ink, 0.4))
  p.strokeWeight(W * 0.45)
  for (let i = 1; i < 6; i++) {
    const x = -PLATE_HALF + (PLATE_HALF * 2 * i) / 6
    p.line(X(x - 0.04), X(0.01), X(x + 0.04), X(0.04))
  }
  p.pop()
  p.stroke(iron)
  p.strokeWeight(X(0.03))
  p.line(X(endR[0] - 0.04), X(endR[1]), X(pin[0]), X(pin[1]))
  p.noStroke()
  p.fill(tone(TOWN.gold))
  p.circle(X(pin[0]), X(pin[1]), X(0.045))
  p.circle(X(FLY[0]), X(FLY[1]), X(0.05))
}

/* --------------------------------------------- the pedal */

function drawPedal(p: p5, c: Ctx, t: number, tone: Tone): void {
  const { k, ink, weight: W } = c
  const X = (v: number) => v * k
  const a = pedalA(t)
  const cup = cupAt(t)
  const back = polar(PEDAL, PEDAL[0] - AT_STAND, a + Math.PI)
  const iron = tone(mixHex(TOWN.slateDark, TOWN.night, 0.2))
  // Its stand.
  p.stroke(ink)
  p.strokeWeight(W * 0.75)
  p.fill(tone(TOWN.timberDark))
  p.quad(X(PEDAL[0] - 0.1), X(FLOOR), X(PEDAL[0] + 0.1), X(FLOOR), X(PEDAL[0] + 0.03), X(PEDAL[1]), X(PEDAL[0] - 0.03), X(PEDAL[1]))
  // The column's rod, down through the bench to the arm's short end, which pushes it up.
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  p.fill(tone(mixHex(TOWN.gold, TOWN.timber, 0.25)))
  const rodTop = BENCH + 0.08
  p.rect(X(back[0] - 0.03), X(rodTop), X(0.06), X(back[1] - rodTop))
  // The arm: the cup's long end, the short end under the rod.
  p.stroke(iron)
  p.strokeWeight(X(0.05))
  p.line(X(back[0]), X(back[1]), X(cup[0]), X(cup[1]))
  p.noStroke()
  p.fill(tone(TOWN.gold))
  p.circle(X(PEDAL[0]), X(PEDAL[1]), X(0.06))
  // The cup's back and its bowl (its front lip is drawn over her), tipping on its pin as it lands.
  p.push()
  p.translate(X(cup[0]), X(cup[1]))
  p.rotate(cupTip(t))
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(tone(mixHex(TOWN.gold, TOWN.timberDark, 0.3)))
  p.ellipse(0, X(-0.1), X(0.4), X(0.1))
  p.fill(tone(TOWN.gold))
  p.beginShape()
  p.vertex(X(-0.2), X(-0.1))
  p.bezierVertex(X(-0.19), X(0.06), X(0.19), X(0.06), X(0.2), X(-0.1))
  p.endShape(p.CLOSE)
  p.pop()
}

/* --------------------------------------------- steam */

function drawSteam(p: p5, c: Ctx, t: number): void {
  const { k } = c
  if (t < SEAT - 0.1 || t > RAM_UP + 3) return
  const ry = ramTop(t) + RAM_H
  const col = mixHex(TOWN.plaster, TOWN.canal, 0.15)
  // The bursts: out from under the ram's skirt both ways, rising and spreading, on the seat, the breath and the lift.
  for (const [at, s] of [[SEAT, 1], [PUFF, 0.75], [RAM_UP, 0.9]] as const) {
    const u = t - at
    if (u < 0 || u > 2.4) continue
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1
      const r = 0.12 + u * (0.5 + hash(i, 3) * 0.3)
      const out = (0.18 + u * (0.7 + hash(i, 5) * 0.5)) * (1 - Math.exp(-u / 0.25))
      const x = RAM_X + side * (0.18 + out * 0.6)
      const y = ry - 0.05 - u * (0.45 + hash(i, 7) * 0.3) - out * 0.1
      soft(p, k, x, y, r, col, 0.42 * s * Math.exp(-u / 0.7) * (1 - Math.exp(-u / 0.05)))
    }
  }
  // The wisps while it is held.
  const held = smooth(t, SEAT + 0.5, SEAT + 1) * (1 - smooth(t, EASE_OFF, RAM_UP))
  for (let i = 0; i < 4; i++) {
    const age = (((t * 0.5 + i / 4) % 1) + 1) % 1
    soft(p, k, RAM_X + (hash(i, 2) - 0.5) * 0.4 + age * 0.15, ry - 0.1 - age * 0.9, 0.12 + age * 0.3, col, 0.2 * held * (1 - age))
  }
}
