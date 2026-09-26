import type { Pt } from '../../../../../parts'
import { level, onset, SEAM } from '../music'

/**
 * The castle's morning, as numbers: where the room's machine stands and what every part of it is doing at any show
 * time. The room (`room.ts`) draws the machine from these, and the morning part (`morning.ts`) rides Sophie on them,
 * so the rocking chair she sits in and the lane she follows are one function.
 *
 * Everything here is in the ROOM's cells (the room's origin; the morning part's frame is `MORNING_AT` to the right of
 * it). Every time is a show time on the recording (`music.ts`): the flow's running notes, first wave 152 → 156.7,
 * the knock 157.948, the hush, Howl 163.834, the second wave (breakfast) 164.1 → 170, the latch 177.424.
 *
 * The machine, in the order it wakes: Calcifer in the grate; the steam engine over the mantel (a cylinder, a
 * crosshead and a flywheel), belted up to a line shaft under the ceiling; off the shaft the window's shutters, the
 * pump at the sink, and the trolley that runs a pan along a rail under the ceiling (to the fire, then to the table).
 * By the hearth, the rocking chair whose front rocker works the bellows: Sophie rocking is Calcifer's breath.
 */

/* ------------------------------------------------------------------ curves */

/** A monotone cubic through `keys` ([t, v], t ascending): flat at the ends, never overshooting a key. */
export function pchip(keys: readonly (readonly [number, number])[]): (t: number) => number {
  const n = keys.length
  const xs = keys.map((k) => k[0])
  const ys = keys.map((k) => k[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-9, xs[i + 1] - xs[i]))
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = xs[i] - xs[i - 1]
    const h1 = xs[i + 1] - xs[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t: number) => {
    if (t <= xs[0]) return ys[0]
    if (t >= xs[n - 1]) return ys[n - 1]
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (xs[mid] <= t) lo = mid
      else hi = mid
    }
    const h = xs[hi] - xs[lo]
    const u = (t - xs[lo]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[lo] + (u3 - 2 * u2 + u) * h * m[lo] + (-2 * u3 + 3 * u2) * ys[hi] + (u3 - u2) * h * m[hi]
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** 0 until `a`, 1 from `b`, smooth between. */
export const ramp = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** A swell that peaks at `t0`: up over `rise` seconds before it, down over `decay` (a time constant) after. */
export const swell = (t: number, t0: number, rise: number, decay: number): number => {
  if (t < t0 - rise) return 0
  if (t < t0) return ramp(t, t0 - rise, t0)
  return Math.exp(-(t - t0) / decay)
}
/** A damped wobble after `t0` (0 before): what a pointer or a leaf does when it stops against something. */
export const wobble = (t: number, t0: number, freq = 26, decay = 0.13): number =>
  t < t0 ? 0 : Math.exp(-(t - t0) / decay) * Math.sin((t - t0) * freq)
const easeIn = (u: number) => clamp01(u) * clamp01(u)
const easeOut = (u: number) => 1 - (1 - clamp01(u)) * (1 - clamp01(u))

/* ------------------------------------------------------------------ the times */

/** The part's slot, and every moment of it that the machine keys on (each a measured onset, found by `onset`). */
export const MT = {
  in: SEAM.morning,
  /** The door swings shut behind her. */
  shut0: onset(152.364),
  /** Calcifer's eyes open in the embers; he flares up. */
  eyes: onset(152.619),
  flare: onset(152.869),
  /** The engine's strokes as it starts: each a puff of steam from the cylinder. */
  strokes: [onset(153.101), onset(153.571), onset(154.024), onset(154.5)] as const,
  /** The belt goes taut and the line shaft turns. */
  belt: onset(154.268),
  /** She lands in the rocking chair. */
  seat: onset(154.709),
  /** The pump's first gush. */
  pump: onset(154.999),
  /** Her rocking: the bellows' puffs. */
  puffs: [onset(155.231), onset(155.87, 0.2), onset(156.508)] as const,
  /** The shutters fly open: the morning. */
  shutters: onset(156.102),
  /** Calcifer roars up. */
  roar: onset(156.346),
  /** Two knocks at the door. */
  knock: onset(157.948),
  knock2: onset(158.314),
  /** Markl lands out of his seat; he pulls the bell-pull and the dial clicks to blue. */
  marklDown: onset(158.528),
  blue: onset(159.359, 0.2),
  /** Markl back behind the table; the dial twitches (someone on the far side). */
  marklUp: onset(163.695),
  /** The dial whips to black and the door flies open: Howl. */
  black: onset(163.834),
  /** Calcifer flares for Howl. */
  howlFlare: onset(164.136),
  /** Howl flips the trolley's lever as he passes; the door shuts behind him. */
  lever: onset(164.612),
  shut1: onset(165.047),
  /** Calcifer bows his head under the pan. */
  bow: onset(165.79),
  /** The eggs crack on the pan's rim. */
  eggs: [onset(166.011), onset(166.47), onset(166.725), onset(167.439)] as const,
  /** Calcifer gobbles the shells. */
  gobble: onset(167.903),
  /** The trolley lifts the pan off him. */
  lift: onset(168.194),
  /** Sophie down out of the chair. */
  down: onset(168.623),
  /** The pan down on the table. */
  table: onset(170.887),
  /** Sophie up on her stool. */
  stool: onset(172.333),
  /** Howl pulls the bell-pull: the dial sweeps back to green. */
  green: onset(174.724, 0.2),
  /** Sophie down off the stool. */
  hopdown: onset(175.282, 0.2),
  /** The latch: the door flies open on the meadow. */
  latch: onset(177.424),
  out: SEAM.field,
} as const

/** How long an egg flies from the basket to the pan. */
export const EGG_FLIGHT = 0.34
/** When each egg leaves the basket. */
export const TOSSES = MT.eggs.map((c) => c - EGG_FLIGHT)

/** True while show time `t` is the morning's (with a margin): outside it the room is at rest, or at war. */
export const inMorning = (t: number): boolean => t > MT.in - 2 && t < MT.out + 2

/* ------------------------------------------------------------------ the geometry (room cells) */

/** The hearth's log, where Calcifer sits (kept equal to `ROOM_AT.log`). */
export const LOG: Pt = [2.8, -0.12]
/** The door's sill (kept equal to `ROOM_AT.door`). */
export const DOOR_AT: Pt = [0.3, 0.13]

/**
 * The rocking chair, in front of the hearth's left jamb, facing the fire. Its rockers are an arc of radius `R`
 * touching the floor at `cx` when it is level; rocking, it rolls on them.
 */
export const CHAIR = { cx: 1.62, R: 1.1, half: 0.5, seat: -0.3 }
/** Where Sophie sits in it when it is level (her centre). */
export const SEAT0: Pt = [1.6, -0.43]
/** The basket of eggs on the chair's right arm (its middle, level). */
export const BASKET0: Pt = [1.88, -0.7]
/** The bellows on the floor between the chair and the grate: the rear board's end, the hinge, the nozzle's tip. */
export const BELLOWS = { rear: 2.16, hinge: 2.52, tip: 2.66 }

/** The engine over the mantel: the cylinder (x0, x1) on the flywheel's axis, the crosshead's guide, the flywheel. */
export const ENGINE = { cyl: [1.62, 2.3] as Pt, guide: [2.4, 3.02] as Pt, fly: [3.55, -2.55] as Pt, r: 0.46, crank: 0.21, rod: 0.8, hub: 0.12 }
/** The line shaft under the ceiling, and the pulleys on it. */
export const SHAFT = { y: -3.98, x0: 2.0, x1: 8.4, drive: 3.55, rDrive: 0.19, shutter: 6.5, pump: 7.85, hangers: [2.35, 5.1, 8.15] }
/** The pump at the sink's right end: its pivot on top, the handle's length, the spout. */
export const PUMP = { x: 7.35, pivot: [7.35, -1.52] as Pt, handle: 0.5, spout: [7.02, -1.26] as Pt, base: -0.75 }
/** The trolley's rail under the ceiling (its underside), its ends, where the trolley parks, and the hook's height. */
export const TROLLEY = { y: -3.62, x0: -3.7, x1: 5.35, park: 4.85, hook: -3.44 }
/** Where the trolley stops over the fire and over the table. */
export const PAN_FIRE = LOG[0]
export const PAN_TABLE = -3.4
/** The pan: its radius (rim), depth, and handle length. */
export const PAN = { r: 0.27, depth: 0.1, handle: 0.42 }
/** The bell-pull left of the door: its pulley on the wall, and its handle at rest. */
export const PULL = { x: -0.82, pulley: -2.12, handle: -0.3 }
/** Sophie's stool at the table's right end: its seat's top. */
export const STOOL = { x: -1.85, seat: -0.27 }
/** The trolley's lever on the door's right post. */
export const LEVER: Pt = [1.02, -0.4]
/** The table (x0, x1, top), kept equal to `ROOM_AT.table`. */
export const TABLE = { x0: -4.3, x1: -2.1, top: -0.62 }

/* ------------------------------------------------------------------ the rocking chair */

/** How far the chair is rocked at `t`, radians; positive is forward (toward the fire). */
const rockKeys: [number, number][] = [
  [MT.seat, 0],
  [MT.seat + 0.24, -0.12],
  [MT.puffs[0], 0.16],
  [155.55, -0.13],
  [MT.puffs[1], 0.17],
  [156.19, -0.14],
  [MT.puffs[2], 0.18],
  [156.86, -0.13],
  [157.22, 0.1],
  [157.58, -0.07],
  [MT.knock + 0.02, 0.04],
  // The knock: she stops, leaning back to look at the door; then a slow creak while she watches Markl.
  [158.36, -0.06],
  [158.95, 0.02],
  [159.7, -0.045],
  [160.6, 0.015],
  [161.5, -0.04],
  [162.4, 0.01],
  [163.2, -0.02],
  // Howl in the doorway: she sits back.
  [MT.black + 0.12, -0.06],
  [164.8, 0.015],
  [165.32, -0.04],
  // The eggs: a rock forward to each toss.
  [TOSSES[0], 0.085],
  [165.9, -0.02],
  [TOSSES[1], 0.08],
  [166.26, 0.02],
  [TOSSES[2], 0.085],
  [166.74, -0.03],
  [TOSSES[3], 0.09],
  [167.45, -0.03],
  [167.85, 0.01],
  [168.2, 0],
  // She gets out backwards: the chair tips back, and rocks on by itself, dying away.
  [168.38, -0.13],
  [168.82, 0.09],
  [169.28, -0.06],
  [169.74, 0.035],
  [170.2, -0.018],
  [170.7, 0.006],
  [171.3, 0],
]
const rockCurve = pchip(rockKeys)
export const rock = (t: number): number => (t <= MT.seat || t > 172 ? 0 : rockCurve(t))

/** A point of the chair (given where it is when the chair is level) at rock angle `a`: it rolls on its rockers. */
export function onChair(p0: Pt, a: number): Pt {
  const c0x = CHAIR.cx
  const c0y = 0.13 - CHAIR.R
  const dx = p0[0] - c0x
  const dy = p0[1] - c0y
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [c0x + CHAIR.R * a + dx * c - dy * s, c0y + dx * s + dy * c]
}

/** Sophie in the chair at `t` (her centre). */
export const seatAt = (t: number): Pt => onChair(SEAT0, rock(t))
/** The basket on the chair's arm at `t`. */
export const basketAt = (t: number): Pt => onChair(BASKET0, rock(t))

/** How far the bellows are pressed (0 open, 1 shut): the front rocker bears on their board as the chair rocks forward. */
export const bellowsAt = (t: number): number => ramp(rock(t), 0.04, 0.15)

/* ------------------------------------------------------------------ Calcifer */

export interface CalciferState {
  size: number
  look: Pt
  mouth: number
  shut: number
  /** His height squashed (1 upright; less while he bows under the pan). */
  squash: number
}

const sizeBase = pchip([
  [150, 0.3],
  [MT.flare, 0.3],
  [153.3, 0.58],
  [155.0, 0.62],
  [156.2, 0.7],
  [157.3, 0.8],
  [163.7, 0.76],
  [164.4, 0.84],
  [165.7, 0.87],
  [165.86, 0.6],
  [MT.lift, 0.6],
  [168.45, 0.8],
  [172, 0.76],
  [178.2, 0.74],
])
const lookX = pchip([
  [MT.eyes, 0],
  [MT.eyes + 0.1, -0.8],
  [154.4, -0.9],
  [MT.roar - 0.05, -0.3],
  [MT.roar + 0.2, 0],
  [157.2, -0.9],
  [MT.knock + 0.1, -1],
  [161.5, -1],
  [163.2, -0.6],
  [MT.black + 0.1, -1],
  [165.3, -0.9],
  [MT.bow + 0.08, 0],
  [MT.eggs[0] - 0.3, -0.7],
  [MT.eggs[3] + 0.1, -0.7],
  [MT.gobble, 0],
  [MT.lift + 0.1, 0],
  [169.3, -1],
  [178.2, -1],
])
const lookY = pchip([
  [MT.eyes, 0],
  [MT.eyes + 0.1, 0.15],
  [154.4, 0.35],
  [MT.roar - 0.05, -0.6],
  [MT.roar + 0.25, -1],
  [157.2, 0.3],
  [MT.knock + 0.1, 0],
  [158.2, -0.3],
  [158.6, 0.25],
  [161.5, 0],
  [163.2, 0.3],
  [MT.black + 0.1, -0.1],
  [165.3, 0],
  [MT.bow + 0.08, 0.6],
  [MT.eggs[0] - 0.3, -0.6],
  [MT.eggs[3] + 0.1, -0.6],
  [MT.gobble, 0.1],
  [MT.lift + 0.1, -0.9],
  [169.3, -0.4],
  [171.2, 0.1],
  [174.5, -0.2],
  [178.2, 0],
])
const shutKeys = pchip([
  [MT.eyes - 0.05, 1],
  [MT.eyes + 0.03, 0],
  [MT.bow - 0.05, 0],
  [MT.bow + 0.1, 0.35],
  [MT.lift - 0.05, 0.35],
  [MT.lift + 0.08, 0],
])
const BLINKS = [159.9, 162.35, 170.3, 173.6, 176.2]
const mouthBase = pchip([
  [MT.flare, 0.25],
  [MT.bow - 0.5, 0.25],
  [MT.bow - 0.35, 0.55],
  [MT.bow, 0.5],
  [MT.bow + 0.1, 0.12],
  [MT.lift, 0.12],
  [MT.lift + 0.2, 0.35],
  [178.2, 0.35],
])

/** Calcifer at show time `t`, during the morning (in the war the hearth part draws him its own way). */
export function calciferAt(t: number): CalciferState {
  if (!inMorning(t)) {
    const l = level(t)
    return { size: 0.5 + 0.3 * l, look: [0, 0], mouth: 0.3, shut: 0, squash: 1 }
  }
  let size = sizeBase(t)
  size += 0.42 * swell(t, MT.flare, 0.05, 0.3)
  size += 0.05 * swell(t, MT.eyes, 0.03, 0.2)
  for (const p of MT.puffs) size += 0.14 * swell(t, p, 0.05, 0.22)
  size += 0.55 * swell(t, MT.roar, 0.07, 0.45)
  size += 0.2 * swell(t, MT.howlFlare, 0.05, 0.35)
  size += 0.05 * swell(t, MT.shutters, 0.04, 0.3)
  size += 0.05 * Math.sin(t * 5.1) * (t > MT.flare ? 1 : 0.3)
  let mouth = mouthBase(t)
  mouth += 0.45 * swell(t, MT.flare, 0.05, 0.25)
  mouth += 0.75 * swell(t, MT.roar, 0.07, 0.4)
  mouth += 0.4 * swell(t, MT.howlFlare, 0.05, 0.3)
  // Grumbling under the pan.
  if (t > MT.bow && t < MT.lift) mouth += 0.12 * (0.5 + 0.5 * Math.sin(t * 11)) * ramp(t, MT.bow, MT.bow + 0.3)
  // Each egg's shells go into his mouth, a moment after it cracks; and the last gulp.
  for (const c of MT.eggs) mouth += 0.7 * swell(t, c + 0.2, 0.12, 0.09)
  mouth += 0.9 * swell(t, MT.gobble, 0.12, 0.12)
  let shut = shutKeys(t)
  for (const b of BLINKS) shut = Math.max(shut, 1 - Math.min(1, Math.abs(t - b) / 0.08))
  for (const c of MT.eggs) shut = Math.max(shut, 0.5 * swell(t, c + 0.22, 0.08, 0.1))
  shut = Math.max(shut, 0.7 * swell(t, MT.gobble, 0.08, 0.12))
  if (t < MT.eyes - 0.05) shut = 1
  let squash = 1
  if (t > MT.bow - 0.07 && t < MT.lift + 0.12) squash = 1 - 0.2 * ramp(t, MT.bow - 0.07, MT.bow + 0.05) * (1 - ramp(t, MT.lift, MT.lift + 0.12))
  squash += 0.06 * wobble(t, MT.lift + 0.12, 14, 0.2)
  return { size: Math.max(0.2, size), look: [lookX(t), lookY(t)], mouth: clamp01(mouth), shut: clamp01(shut), squash }
}

/** The top of Calcifer's head (where a pan rests on him), y. */
export function calciferTop(t: number): number {
  const c = calciferAt(t)
  return LOG[1] - 0.6 * c.size * c.squash
}

/* ------------------------------------------------------------------ the engine and the shaft */

/** The flywheel's angular speed after the engine is running, radians a second. */
function omega(t: number): number {
  const c = calciferAt(t)
  return Math.max(3, 6.6 + 3.4 * ramp(t, 154.5, 155.6) + 4.5 * swell(t, MT.roar, 0.1, 0.6) + 3 * (c.size - 0.75))
}
/** The flywheel's angle: from rest, a half turn a stroke on the first strokes, then running with Calcifer. */
const flyCurve = (() => {
  const keys: [number, number][] = [
    [MT.strokes[0] - 0.05, 0],
    [MT.strokes[0], 0.04],
    [MT.strokes[1], Math.PI],
    [MT.strokes[2], 2 * Math.PI],
    [MT.strokes[3], 3 * Math.PI],
  ]
  let a = 3 * Math.PI
  const dt = 0.05
  for (let t = MT.strokes[3]; t < MT.out + 3; t += dt) {
    a += ((omega(t) + omega(t + dt)) / 2) * dt
    keys.push([t + dt, a])
  }
  return pchip(keys)
})()
export function flywheelAt(t: number): number {
  if (inMorning(t)) return t < MT.strokes[0] - 0.05 ? 0 : flyCurve(t)
  return 12 * t
}
/** The shaft's pulley is bigger than the flywheel's hub: it turns slower. It turns only once the belt is taut. */
const RATIO = ENGINE.hub / SHAFT.rDrive
export function shaftAt(t: number): number {
  if (!inMorning(t)) return 12 * t * RATIO
  return t < MT.belt ? 0 : (flywheelAt(t) - flywheelAt(MT.belt)) * RATIO
}
/** How slack the belt hangs (1 before it takes up, 0 once it is taut). */
export const beltSlack = (t: number): number => (inMorning(t) ? 1 - ramp(t, MT.belt - 0.14, MT.belt) : 0)
/** The steam puffs from the cylinder: at each first stroke, and a softer chuff at every stroke after. */
export function steamAt(t: number): { big: number; since: number }[] {
  if (!inMorning(t)) return []
  const out: { big: number; since: number }[] = []
  for (const s of MT.strokes) if (t >= s && t - s < 1.6) out.push({ big: 1, since: t - s })
  return out
}

/* ------------------------------------------------------------------ the pump, the shutters */

/** The pump's handle, radians (positive: its outer end up). It rocks on the shaft's eccentric from the first gush. */
export function pumpAt(t: number): { handle: number; flow: number } {
  const from = inMorning(t) ? MT.pump : -Infinity
  if (t < from) return { handle: 0.2, flow: 0 }
  const phase = shaftAt(t) - (inMorning(t) ? shaftAt(MT.pump) : 0)
  return { handle: 0.2 * Math.cos(phase), flow: Math.max(0, Math.sin(phase)) }
}

const shutterCurve = pchip([
  [MT.shutters, 0],
  [MT.shutters + 0.16, 0.92],
  [MT.shutters + 0.26, 1],
  [MT.shutters + 0.42, 0.93],
  [MT.shutters + 0.66, 0.985],
  [MT.shutters + 1.0, 0.965],
  [MT.shutters + 1.4, 0.97],
])
/** The window's shutters: 0 shut, 1 flung open. */
export const shuttersAt = (t: number): number => (inMorning(t) ? shutterCurve(t) : 0.97)
/** The shutters' latch bar, lifted by the cord off the shaft as it winds, until it lets go. */
export const latchLift = (t: number): number => (inMorning(t) ? 0.07 * ramp(t, 155.42, MT.shutters) * (1 - ramp(t, MT.shutters, MT.shutters + 0.08)) : 0)

/** The morning's light in the room, 0 (the dark: only the fire) to 1: it comes in with the shutters. */
export const morningLight = (t: number): number => (t > MT.in - 2 && t < 200 ? ramp(t, MT.shutters, MT.shutters + 1.2) : 0)

/* ------------------------------------------------------------------ the trolley and the pan */

/** Where the pan hangs while parked, and the height it travels at under the mantel's machinery and over the door. */
const LOW = -1.84
const HIGH = -3.05
const trolleyX = pchip([
  [MT.lever, TROLLEY.park],
  [165.2, PAN_FIRE],
  [168.46, PAN_FIRE],
  [169.1, 1.0],
  [169.4, 0.75],
  [170.3, PAN_TABLE],
])
const hangCurve = pchip([
  [MT.lever, LOW],
  [165.16, LOW],
  [165.6, -0.2],
  [MT.lift - 0.001, -0.2],
])
/** Lifted off him, clear of the mantel; along to the chimney's side; up over the door; along; down to the table. */
const liftCurve = pchip([
  [MT.lift, -0.42],
  [168.46, LOW],
  [168.95, LOW],
  [169.35, HIGH],
  [170.3, HIGH],
])

export interface PanState {
  /** The trolley on its rail. */
  trolley: number
  /** The pan's middle (x) and the underside of its bottom (y). */
  x: number
  y: number
  /** Its tilt, radians, swinging on its bail as the trolley goes. */
  tilt: number
  /** How slack its chain is (0 taut: hanging; 1: resting on something). */
  slack: number
  /** Where it is: hanging, on Calcifer, on the table. */
  on: 'hang' | 'fire' | 'table'
}

/** The pan and its trolley at `t` (parked with the pan hanging, outside the morning). */
export function panAt(t: number): PanState {
  if (!inMorning(t) || t < MT.lever) return { trolley: TROLLEY.park, x: TROLLEY.park, y: LOW, tilt: 0, slack: 0, on: 'hang' }
  const x = trolleyX(t)
  const v = (trolleyX(t + 0.03) - trolleyX(t - 0.03)) / 0.06
  const a = (trolleyX(t + 0.06) - 2 * trolleyX(t) + trolleyX(t - 0.06)) / 0.0036
  const tilt = Math.max(-0.22, Math.min(0.22, -0.012 * a - 0.015 * v))
  if (t < MT.lift) {
    const hang = hangCurve(t)
    const top = Math.abs(x - LOG[0]) < 0.35 ? calciferTop(t) : Infinity
    const y = Math.min(hang, top)
    return { trolley: x, x, y, tilt: y < hang - 1e-6 ? tilt * 0.2 : tilt, slack: clamp01((hang - y) / 0.25), on: y < hang - 1e-6 ? 'fire' : 'hang' }
  }
  if (t < 170.3) {
    // Lifted off him (at once: the chain takes up on the strike), carried high along the rail.
    const top = calciferTop(t)
    const y = Math.min(liftCurve(t), top)
    return { trolley: x, x, y, tilt, slack: 0, on: 'hang' }
  }
  // Lowered onto the table, falling faster as it comes, and landing on the strike with a small bounce.
  const u = clamp01((t - 170.3) / (MT.table - 170.3))
  let y = HIGH + (TABLE.top - HIGH) * easeIn(u)
  if (t >= MT.table) y = TABLE.top - 0.025 * Math.max(0, wobble(t, MT.table, 22, 0.1))
  return { trolley: x, x, y, tilt: t < MT.table ? tilt : 0, slack: t < MT.table ? 0 : clamp01((t - MT.table) / 0.25), on: t < MT.table ? 'hang' : 'table' }
}

/** How many fried eggs are in the pan at `t`: in on each crack, eaten at the table. */
export function eggsInPan(t: number): number {
  if (!inMorning(t)) return 0
  let n = MT.eggs.filter((c) => t >= c).length
  for (const eaten of [171.9, 173.1, 174.2, 176.1]) if (t >= eaten) n--
  return Math.max(0, n)
}
/** How many eggs are still in the basket. */
export const eggsInBasket = (t: number): number => (inMorning(t) ? 4 - TOSSES.filter((s) => t >= s).length : 0)

/* ------------------------------------------------------------------ the door, the dial, the bell-pull */

/** The door's opening (0 shut, 1 wide) through the morning. */
export function doorAt(t: number): number {
  // She comes in with it open; it swings shut behind her, faster as it goes, and bangs.
  if (t < MT.shut0) return t < MT.in ? 1 : 1 - easeIn((t - MT.in) / (MT.shut0 - MT.in))
  if (t < 159.4) return 0.04 * Math.max(0, wobble(t, MT.shut0, 20, 0.08))
  // Porthaven: Markl's pull opens it; it closes softly behind the caller.
  if (t < 162.4) return easeOut((t - 159.45) / 0.55) * (t > 159.45 ? 1 : 0)
  if (t < MT.black) return 1 - ramp(t, 162.4, 163.0)
  // Howl: it flies open, hits its stop, and swings shut behind him, banging.
  if (t < 164.6) return Math.min(1, easeOut((t - MT.black) / 0.2)) - 0.06 * Math.max(0, wobble(t, MT.black + 0.2, 16, 0.12))
  if (t < MT.shut1) return 1 - easeIn((t - 164.6) / (MT.shut1 - 164.6))
  if (t < MT.latch) return 0.035 * Math.max(0, wobble(t, MT.shut1, 20, 0.08))
  // The latch: flung open on the meadow.
  return Math.min(1, easeOut((t - MT.latch) / 0.28)) - 0.05 * Math.max(0, wobble(t, MT.latch + 0.28, 15, 0.14))
}

/** The dial's pointer, counting along DIAL_ORDER (0 green, 1 blue, 2 red, 3 black). */
export function dialAt(t: number): number {
  const pullB = MT.blue - 0.2
  if (t < pullB) return 0
  if (t < MT.blue) return easeIn((t - pullB) / 0.2)
  if (t < 163.62) return 1 + 0.08 * wobble(t, MT.blue)
  // Someone on the far side: it twitches, then whips round to black.
  if (t < MT.marklUp) return 1 + 0.12 * easeIn((t - 163.62) / (MT.marklUp - 163.62))
  if (t < 163.76) return 1.12 - 0.1 * ramp(t, MT.marklUp, 163.76)
  if (t < MT.black) return 1.02 + 1.98 * easeIn((t - 163.76) / (MT.black - 163.76))
  const pullH = MT.green - 0.17
  if (t < pullH) return 3 + 0.1 * wobble(t, MT.black)
  if (t < MT.green) return 3 - 3 * easeIn((t - pullH) / 0.17)
  return -0.09 * wobble(t, MT.green, 22, 0.14)
}

/** The bell-pull's handle: how far it is pulled down (cells), and its swing (cells, sideways). */
export function pullAt(t: number): { down: number; swing: number } {
  if (!inMorning(t)) return { down: 0, swing: 0 }
  let down = 0
  let swing = 0
  for (const at of [MT.blue, MT.green]) {
    const grab = at - 0.2
    if (t >= grab && t < at) down = Math.max(down, 0.16 * easeIn((t - grab) / 0.2))
    if (t >= at) {
      down = Math.max(down, 0.16 * Math.exp(-(t - at) / 0.18))
      swing += 0.05 * wobble(t, at, 8, 0.6)
    }
  }
  // The dial turning itself drags the chain up.
  down -= 0.05 * swell(t, MT.black - 0.03, 0.08, 0.2)
  swing += 0.03 * wobble(t, MT.black, 9, 0.5)
  return { down, swing }
}

/** The trolley's lever: 0 off, 1 thrown (Howl knocks it over as he passes). */
export const leverAt = (t: number): number => (inMorning(t) ? ramp(t, MT.lever - 0.08, MT.lever) * (1 - ramp(t, MT.table, MT.table + 0.3)) : 0)

/** The door jolting in its frame on the two knocks: sideways, cells, damped fast. */
export const doorJolt = (t: number): number =>
  inMorning(t) ? 0.03 * wobble(t, MT.knock, 48, 0.07) + 0.022 * wobble(t, MT.knock2, 48, 0.07) : 0
