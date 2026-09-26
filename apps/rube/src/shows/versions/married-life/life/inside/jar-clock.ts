import type { Pt } from '../../../../../parts'
import { ONSETS, SEAM, beat } from '../music'

/**
 * The living room's clock and its geometry (the jar builder's): every time the room keeps, every place in it, and the
 * motion of everything that moves on its own (the seesaw, the jar, the ladder, the lamp, the car, the storm, the
 * branch). Drawing and lanes both read these, so what Carl rides and what is drawn under him are one function.
 *
 * Coordinates are the house's INSIDE cells (`inside.ts`): the floor under Carl at y 0.13, his centre at y 0.
 */

/* ------------------------------------------------------------------ the music, as measured */

const J = (n: number, pos: 1 | 2 | 3 = 1): number => beat('jar', n, pos)
/** The measured onset nearest `t` (its exact time). */
function onset(t: number): number {
  let best = t
  let d = Infinity
  for (const o of ONSETS) if (Math.abs(o.t - t) < d) { d = Math.abs(o.t - t); best = o.t }
  return best
}

export const BEGIN = SEAM.jar
export const END = SEAM.ties

/** Ellie leaps onto the ladder's first tread; she settles. */
export const PERCH = J(5)
export const SETTLE = J(6)
/** He lands on his end this long before the stroke; the plank thumps the floor on the beat. */
export const TOUCHDOWN = 0.1
/** Carl's strokes on the seesaw (the plank's thump), and where each handful lands in the jar (the next downbeat). */
export const SLAMS = [J(7), J(8), J(9), J(10), J(16), J(17), J(24), J(25)]
export const LANDS = [J(8), J(9), J(10), J(11), J(17), J(18), J(25), J(26)]
/** He hops down, pleased, as the fourth handful lands. */
export const DOWN = J(11)
/** The tyre blows (after a held breath in the music); the hubcap lands; the car stands level again. */
export const TYRE = J(11, 3)
export const HUBCAP = J(12)
export const FIXED = onset(117.702)
/** Ellie up the ladder to the jar and over: tread 2, the mantle, the push. */
export const UP1 = [J(13), J(14)]
export const PUSH1 = J(15)
/** The refill's second stroke shakes the lamp out; he climbs; the ladder kicks; he falls. */
export const LAMP_OUT = J(17, 2)
export const CLIMB = [J(17, 3), J(18)]
export const KICK = onset(119.902)
export const FALL = J(19)
/** She comes down to him, touches him; the bandage. Then up again to the jar. */
export const TO_HIM = J(19, 3)
export const TOUCH = J(20)
export const UP2 = [J(21), J(21, 2), J(22)]
export const PUSH2 = J(23)
/** The storm: a first flash; the tree through the roof; the jar thrown over; thunder. */
export const FLASH1 = J(24, 3)
export const TREE = onset(128.871)
export const TOPPLE = onset(129.271)
export const THUNDER = J(27)
export const RIGHTED3 = J(28)
export const FLASH2 = J(29)
/** Down the plank, off it, and out: Ellie onto the plank, off it; Carl off it. */
export const ONTO_PLANK = J(28)
export const E_OFF = J(30)
export const C_OFF = J(31)
/** The limb winched out as the storm's last flash goes; three boards over the hole; the sun breaks through; she skips. */
export const WINCH = J(29)
export const BOARDS = [J(30), J(31), J(32)]
export const SUN = J(33)
export const SKIP = onset(139.912)

/** Each pour: when it is tipped, when it hits its stop (the lid flies, the coins go), when it is upright again. */
export interface Pour {
  tip: number
  stop: number
  back: number
  /** What is left in it after. */
  left: number
}
export const POURS: Pour[] = [
  { tip: PUSH1, stop: J(15, 2), back: J(16), left: 0 },
  { tip: PUSH2, stop: J(23, 2), back: J(24), left: 0 },
  { tip: TOPPLE, stop: THUNDER, back: RIGHTED3, left: 0.06 },
]

/* ------------------------------------------------------------------ where things stand */

/** The stepladder by the fireplace: its feet, its top, its two treads (a ball's centre standing on each). */
export const LADDER = { rear: 3.35, front: 4.05, top: -2.0, topX: 3.67 }
export const T1: Pt = [3.93, -0.75]
export const T2: Pt = [3.82, -1.38]
/** The lamp hanging over the ladder: where its cord meets the ceiling, and the shade's rim. */
export const LAMP = { x: 3.7, ceil: -3.6, rim: -2.86, cord: 0.74 }
/** The mantle (the set's), and on it the jar, which tips over its right-hand foot. */
export const MANTLE = { x0: 4.65, x1: 7.35, top: -1.35 }
export const JAR_X = 6.85
export const JAR_W = 0.62
export const JAR_H = 0.85
export const HINGE: Pt = [JAR_X + JAR_W / 2, MANTLE.top]
/** Ellie on the mantle: at its left end (her seat), and against the jar's side (the push). */
export const SEAT: Pt = [4.85, -1.48]
export const AGAINST: Pt = [JAR_X - JAR_W / 2 - 0.13, -1.48]
/** The seesaw in front of the fireplace: its axle, half its length, its two angles (left end up; left end down). */
export const AXLE: Pt = [5.35, -0.16]
export const HALF = 0.9
export const COCKED = 0.22
export const FIRED = -0.28
/** Where Carl stands on it (along the plank from the axle), and the cup at its other end. */
export const HIS = -0.75
export const CUP = 0.84
/** The coin box the cup scoops from. */
export const BOX = { x0: 6.02, x1: 6.58, rim: -0.2 }
/** Where Carl stands to hop onto his end. */
export const FOOT: Pt = [4.3, 0]
/** The slot in the jar's lid, where each handful goes in. */
export const SLOT: Pt = [JAR_X, MANTLE.top - JAR_H - 0.1]
/** Where he falls. */
export const FELL: Pt = [2.85, 0]
/** The two armchairs, by the right-hand window: their middle. */
export const CHAIRS_X = 9.85
/** The hole the limb makes in the nursery's ceiling (the set's ceiling band, y -7.12 to -7.0). */
export const HOLE = { x0: 8.15, x1: 9.15, y: -7.0 }

/* ------------------------------------------------------------------ small motions */

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
export const smoothstep = (u: number): number => { const v = clamp01(u); return v * v * (3 - 2 * v) }
/** A rise from 0 to 1 over `tau`, critically damped: crisp at first, settling without a bounce. */
export const rise = (s: number, tau: number): number => (s <= 0 ? 0 : 1 - (1 + s / tau) * Math.exp(-s / tau))
/** A struck thing's ring: 1 at the strike, dying away, oscillating `w` radians a second. */
export const ring = (s: number, tau: number, w: number): number => (s <= 0 ? 0 : Math.exp(-s / tau) * Math.sin(s * w))
/** The latest of `times` at or before `t`, or -Infinity. */
export function latest(times: readonly number[], t: number): number {
  let out = -Infinity
  for (const x of times) if (x <= t && x > out) out = x
  return out
}

/* ------------------------------------------------------------------ the seesaw */

/** The plank's angle (radians, clockwise; positive lifts his end): cocked, slammed down on a stroke, lifted back by its counterweight. */
export function plankAt(t: number): number {
  const s = t - latest(SLAMS.map((x) => x - TOUCHDOWN), t)
  if (!Number.isFinite(s)) return COCKED
  // His weight drives it down from the moment he lands on it, gathering, until it thumps the floor on the beat.
  if (s < TOUCHDOWN) { const u = s / TOUCHDOWN; return COCKED + (FIRED - COCKED) * (0.55 * u + 0.45 * u * u) }
  return FIRED + (COCKED - FIRED) * rise(s - TOUCHDOWN - 0.04, 0.11)
}

/** A point on the plank at `d` along it from the axle, raised `up` off its centre line (its top is 0.035 up). */
export function onPlank(d: number, up: number, phi: number): Pt {
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  return [AXLE[0] + d * c + up * s, AXLE[1] + d * s - up * c]
}

/** Where a ball (or Carl) standing on the plank at `d` has its centre. */
export const standing = (d: number, phi: number): Pt => onPlank(d, 0.035 + 0.13, phi)

/** The cup's mouth at `t`. */
export const cupAt = (t: number): Pt => onPlank(CUP, 0.1, plankAt(t))

/* ------------------------------------------------------------------ the jar */

const TIP_MAX = 1.9
/** How long the cradle's spring takes to set it back on its feet. */
const RIGHTING = 0.45

/** The jar's turn about its right-hand foot (radians, clockwise), its lid (0 on, 1 flung open), and whether it is pouring. */
export function jarAt(t: number): { tilt: number; lid: number; jolt: number } {
  let tilt = 0
  let lid = 0
  // The tree's blow jolts it off its feet a little before it goes over.
  const jolt = 0.05 * Math.max(0, ring(t - TREE, 0.12, 28)) + 0.03 * Math.max(0, ring(t - FALL, 0.1, 30))
  for (const p of POURS) {
    if (t < p.tip || t > p.back + 1.2) continue
    const s = t - p.tip
    const fall = p.stop - p.tip
    if (s < fall) {
      // Over it goes: slowly at first, then all at once, like anything heavy.
      const u = s / fall
      tilt = TIP_MAX * (0.12 * u + 0.88 * u * u)
    } else if (t < p.back - RIGHTING) {
      // On its stop: a knock, and a small rebound that dies.
      tilt = TIP_MAX - 0.09 * Math.abs(ring(t - p.stop, 0.13, 22))
    } else if (t < p.back) {
      // Righted by the cradle's spring, landing on its feet on the beat.
      const u = (t - (p.back - RIGHTING)) / RIGHTING
      tilt = TIP_MAX * (1 - smoothstep(u) * 0.35 - 0.65 * u * u)
    } else tilt = -0.05 * ring(t - p.back, 0.14, 24)
    lid = s < fall ? smoothstep((s - fall * 0.55) / (fall * 0.45)) : t < p.back - 0.4 ? 1 : t < p.back ? 1 - smoothstep((t - (p.back - 0.4)) / 0.4) : 0
  }
  return { tilt, lid, jolt }
}

/** Where the jar's bottom middle is when it is turned `tilt` about its right-hand foot. */
export function jarBase(tilt: number): Pt {
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  return [HINGE[0] - (JAR_W / 2) * c, HINGE[1] - (JAR_W / 2) * s]
}

/** The jar's mouth (the middle of its top) when turned `tilt`. */
export function jarMouth(tilt: number): Pt {
  const [bx, by] = jarBase(tilt)
  return [bx + JAR_H * Math.sin(tilt), by - JAR_H * Math.cos(tilt)]
}

/** A handful: three coins flung from the cup on a stroke, dropping into the lid's slot on the next downbeat. */
export const PER_COIN = 0.04
export const HANDFUL = 3

/** How full the jar is at `t` (0..1): a coin at a time, drained by each pour down to what it leaves. */
export function fillAt(t: number): number {
  const events: { t: number; pour?: Pour }[] = []
  for (const land of LANDS) for (let i = 0; i < HANDFUL; i++) events.push({ t: land + i * 0.03 })
  for (const p of POURS) events.push({ t: p.stop - 0.08, pour: p })
  events.sort((a, b) => a.t - b.t)
  let fill = 0
  for (const e of events) {
    if (e.t > t) break
    if (!e.pour) { fill += PER_COIN; continue }
    const start = fill
    const end = Math.min(start, e.pour.left)
    fill = start + (end - start) * clamp01((t - e.t) / 0.5)
  }
  return Math.max(0, fill)
}

/* ------------------------------------------------------------------ the ladder and the lamp */

/** The ladder's rock (radians, clockwise about its right foot when positive): kicked as he pushes off it, and on his fall. */
export const ladderAt = (t: number): number => 0.13 * ring(t - KICK, 0.45, 9.5) + 0.02 * ring(t - FALL, 0.3, 12)

/** The lamp: lit (0..1), and its swing (radians) from the strokes shaking the house. */
export function lampAt(t: number): { lit: number; swing: number } {
  let swing = 0
  for (const s of SLAMS) swing += 0.07 * ring(t - s, 1.1, 3.4)
  swing += 0.16 * ring(t - TREE, 1.6, 3.4) + 0.05 * ring(t - FALL, 1.0, 3.4)
  let lit = 1
  if (t >= SLAMS[5]) {
    // The stroke that shakes it: it sputters, and is out on the next beat.
    const s = t - SLAMS[5]
    const span = LAMP_OUT - SLAMS[5]
    lit = s >= span ? 0 : s < span * 0.3 ? 0.4 : s < span * 0.55 ? 0.9 : s < span * 0.75 ? 0.15 : 0.6
  }
  return { lit, swing }
}

/* ------------------------------------------------------------------ outside: the car and the storm */

/** The car's rear sag (0 level .. 1 down on its flat), the hubcap's flight (seconds since it came off), and the puff. */
export function carAt(t: number): { sag: number; puff: number; cap: number } {
  let sag = 0
  if (t >= TYRE) sag = rise(t - TYRE, 0.05) + 0.12 * ring(t - TYRE, 0.12, 30)
  // Jacked up on its new tyre, and let down level with a small bounce.
  if (t >= FIXED - 0.35) sag *= 1 - smoothstep((t - (FIXED - 0.35)) / 0.35)
  if (t >= FIXED) sag = -0.1 * ring(t - FIXED, 0.16, 22)
  return { sag, puff: t - TYRE, cap: t - TYRE }
}

/** The storm (0 clear .. 1 at its height), and the lightning's flash (0..1). */
export function stormAt(t: number): { storm: number; flash: number; rain: number } {
  const storm = smoothstep((t - PUSH2 + 0.6) / 3.2) * (1 - smoothstep((t - WINCH) / (SUN - WINCH)))
  const rain = smoothstep((t - FLASH1 + 1.2) / 1.2) * (1 - smoothstep((t - BOARDS[1]) / 1.6))
  let flash = 0
  for (const [at, a] of [[FLASH1, 0.55], [TREE, 1], [THUNDER, 0.8], [FLASH2, 0.35]] as [number, number][]) {
    const s = t - at
    if (s >= -0.05 && s < 0.9) flash = Math.max(flash, a * (s < 0 ? 0.3 : Math.exp(-s / 0.16) * (1 + 0.5 * Math.max(0, Math.sin(s * 40)) * Math.exp(-s / 0.1))))
  }
  return { storm, flash, rain }
}

/** The sun through the windows once the storm has gone: in at once on its beat, then settling to a warm afternoon. */
export const sunAt = (t: number): number => (t < SUN ? 0 : 0.55 + 0.45 * Math.exp(-(t - SUN) / 0.5))

/** The limb through the roof: 0 before it, falling in at the blow, hanging; winched back out through the hole. */
export function limbAt(t: number): number {
  if (t < TREE - 0.22) return 0
  if (t < TREE) { const u = (t - (TREE - 0.22)) / 0.22; return 0.62 * u * u }
  // Through the roof on the blow; it settles hanging with a shudder, and drops a little further as it breaks the lath.
  const hang = 1 - 0.38 * Math.exp(-(t - TREE) / 0.09) + 0.05 * ring(t - TREE, 0.35, 11) + 0.07 * rise(t - TOPPLE, 0.05)
  if (t < WINCH) return hang
  const u = clamp01((t - WINCH) / 1.1)
  return hang * (1 - smoothstep(u)) + 0.03 * ring(t - WINCH, 0.08, 30) * (1 - u)
}

/** A board over the hole: 0 hanging from its nail .. 1 nailed flat on its beat. */
export const boardAt = (t: number, i: number): number => {
  const at = BOARDS[i]
  if (t < at - 0.4) return -1
  if (t < at) { const u = (t - (at - 0.4)) / 0.4; return u * u }
  return 1 - 0.06 * Math.abs(ring(t - at, 0.1, 30))
}

/** The bandage round his foot: 0 none .. 1 wrapped; unwound as he heals, as they go. */
export function bandageAt(t: number): number {
  if (t < TOUCH) return 0
  const on = smoothstep((t - TOUCH) / 0.6)
  const off = smoothstep((t - (SUN + 0.1)) / 0.7)
  return on * (1 - off)
}

export { J }
