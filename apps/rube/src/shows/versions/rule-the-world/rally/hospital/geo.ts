import type { Pt, Seg } from '../../../../../parts'
import { carried, route, smooth, type Way } from '../kit'
import { at, DURATION, SEAM, SON } from '../music'
import { G } from '../physics'
import { ring } from '../pen'

/**
 * The ward's clock and ground (202.391 → 266, bar 95 to the end), in the place's own cells. The ball comes in at
 * (-0.5, 0), at rest on the foot of Rachel's bed.
 *
 * Right to left: the curtained partition, the nightstand, the bed under its tall window with Rachel on the pillow at
 * its head, the ward's wall (in section) with its door standing open, and the corridor: its checkerboard floor, the
 * bench, and the nursery's wide window, the bassinets behind it. y is down; the floor is at FLOOR.
 */

export const T0 = SEAM.hospital
export const T1 = DURATION
const R = 0.13

/* ------------------------------------------------------------------ the clock */

/** The cut, on "All for freedom and for pleasure": the first light catches the brass knob of the bed's foot. */
export const CUT = at(95, 1)
/** Rachel stirs toward him. */
export const STIR = at(95, 2)
/** He sets off up the blanket. */
export const SET_OFF = at(95, 3)
/** Against her, on the pillow. */
export const NESTLE = at(96, 1)
/** The glow between them: he tells her. */
export const BLOOM = at(96, 3)
/** They lean in together; the glow swells. */
export const LEAN = at(97, 1)
/** She nudges him: go and see him. He rolls back down the bed. */
export const NUDGE = at(97, 2)
/** Off the foot of the bed, the blanket springing under him. */
export const SPRING = at(97, 4)
/** On the floor; through the door; on the bench. */
export const LANDS = [at(98, 2), at(98, 3), at(98, 4)]
/** At the glass: the blind goes up, and there he is. */
export const BLIND_TOP = at(99, 2)
/** The nurse looks up at the glass. */
export const LOOK = at(100, 1)
/** She reaches into the bassinet; lifts him; holds him up to the glass. */
export const REACH = at(104, 1)
export const LIFT = at(105, 1)
export const LIFTED = at(106, 1)

/** Marty trembles at the glass (he is crying): on these. Tears on some. */
export const TREMBLES: number[] = (() => {
  const out = [at(100, 4)]
  for (let bar = 101; bar <= 111; bar++) out.push(at(bar, 2))
  for (let bar = 112; bar <= 114; bar++) out.push(at(bar, 3))
  out.push(at(115, 1))
  return out
})()
export const TEARS: number[] = [at(102, 2), at(105, 2), at(108, 2), at(111, 2), at(114, 3)]

/** The son wriggles in his blanket. */
export const WRIGGLES: number[] = (() => {
  const out = [at(99, 3), at(100, 3)]
  for (let bar = 101; bar <= 111; bar += 2) out.push(at(bar, 3))
  return out
})()

/** The other babies cry: [time, which]. */
export const CRIES: [number, number][] = (() => {
  const out: [number, number][] = []
  let n = 0
  for (let bar = 101; bar <= 114; bar++) {
    out.push([at(bar, 1), n++ % 5])
    if (bar % 2 === 0 && bar <= 110) out.push([at(bar, 3), (n++ * 3) % 5])
  }
  return out
})()

/* ------------------------------------------------------------------ the ground */

export const FLOOR = 1.3
export const CEIL = -5.6
/** The wainscot's top (the dado rail). */
export const DADO = 0.1
/** The bed: its foot and head posts, the mattress's top, the boards' tops. */
export const FOOT_X = -1.15
export const HEAD_X = 1.45
export const MAT = 0.13
export const FOOT_TOP = -0.62
export const HEAD_TOP = -1.4
/** The pillow, a half-ellipse on the mattress at the head. */
export const PILLOW: [number, number] = [0.3, 1.4]
const PILLOW_H = 0.36
export const pillowTop = (x: number): number => {
  const c = (PILLOW[0] + PILLOW[1]) / 2
  const h = (PILLOW[1] - PILLOW[0]) / 2
  const u = (x - c) / h
  return Math.abs(u) >= 1 ? MAT : MAT - PILLOW_H * Math.sqrt(1 - u * u)
}
/** The ward's tall window. */
export const WARD_WIN = { x0: -0.85, x1: 1.85, y0: -4.9, y1: -0.8 }
/** The nightstand; the partition's curtain. */
export const STAND: [number, number] = [1.78, 2.38]
export const STAND_TOP = 0.18
export const CURTAIN: [number, number] = [2.55, 6.5]
/** The ward's wall, in section, and its door. */
export const WALL: [number, number] = [-3.55, -3.3]
export const DOOR_HEAD = FLOOR - 2.6
export const DOOR_LEAF: [number, number] = [-4.95, -3.75]
/** The corridor's bench. */
export const BENCH: [number, number] = [-7.4, -5.6]
export const BENCH_TOP = 0.55
/** The nursery's window: its glass, and the sill he sits on. */
export const GLASS = { x0: -11.6, x1: -7.2, y0: -2.2, y1: 0.05 }
export const SILL: [number, number] = [-11.75, -7.05]
export const SILL_TOP = 0.05
/** The corridor's far door. */
export const FAR_DOOR: [number, number] = [-14.7, -13.4]

/** Where Marty is at each stop. */
const START: Pt = [-0.5, 0]
const BED_EDGE: Pt = [0.12, 0]
const PIL: Pt = [0.36, pillowTop(0.36) - R]
export const NEST: Pt = [0.52, -0.28]
const FOOT: Pt = [-0.62, 0]
const LAND_AT: Pt[] = [
  [-2.6, FLOOR - R],
  [-4.4, FLOOR - R],
  [-6.3, BENCH_TOP - R],
]
export const AT_GLASS: Pt = [-7.7, SILL_TOP - R]

/** Rachel on the pillow; their son in the front row's first bassinet. */
export const RACHEL_AT: Pt = [0.8, -0.35]
export const SON_BED: Pt = [-8.45, -0.4]
/** The nurse stands behind the front row, at the son's bassinet. */
export const NURSE_X = -9.2
/** The bassinets: the front row (the son's first), and the row behind. */
export const FRONT: number[] = [-8.45, -9.5, -10.55, -11.45]
export const BACK: number[] = [-10.1, -11.05]
export const FRONT_RIM = -0.3
export const BACK_RIM = -0.62

/* ------------------------------------------------------------------ the way */

/** A point `s` (0..1) of the way along a polyline, by length. */
function along(pts: Pt[], s: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  const total = lens.reduce((a, b) => a + b, 0)
  let d = Math.max(0, Math.min(1, s)) * total
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const u = lens[i] > 0 ? Math.min(1, d / lens[i]) : 1
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]
    }
    d -= lens[i]
  }
  return pts[pts.length - 1]
}
const UP: Pt[] = [START, BED_EDGE, PIL, NEST]
const DOWN: Pt[] = [NEST, PIL, BED_EDGE, FOOT]
const HOPS: [number, number, Pt, Pt][] = [
  [SPRING, LANDS[0], FOOT, LAND_AT[0]],
  [LANDS[0], LANDS[1], LAND_AT[0], LAND_AT[1]],
  [LANDS[1], LANDS[2], LAND_AT[1], LAND_AT[2]],
  [LANDS[2], SON, LAND_AT[2], AT_GLASS],
]

/** The lean in at LEAN, back by NUDGE. */
const leanAt = (t: number): number => {
  const u = (t - LEAN) / (NUDGE - LEAN)
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 2
}
/** His shake at the glass: a quick small tremble on each of TREMBLES. */
const trembleAt = (t: number): number => {
  let x = 0
  for (const ti of TREMBLES) if (t >= ti && t < ti + 0.6) x += 0.04 * ring(t - ti, 7.5, 0.16)
  return x
}

/** Where Marty is, show time. The lane is sampled from this. */
export function martyAt(t: number): Pt {
  if (t < SET_OFF) return START
  if (t < NESTLE) return along(UP, smooth(t, SET_OFF, NESTLE))
  if (t < NUDGE) {
    const l = leanAt(t)
    return [NEST[0] + 0.03 * l, NEST[1] - 0.006 * l]
  }
  if (t < SPRING) {
    const u = (t - NUDGE) / (SPRING - NUDGE)
    return along(DOWN, u * u)
  }
  if (t < SON) {
    for (const [a, b, p, q] of HOPS) {
      if (t >= b) continue
      const T = b - a
      const u = (t - a) / T
      const arc = (G * T * T) / 8
      return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u - arc * 4 * u * (1 - u)]
    }
  }
  return [AT_GLASS[0] + trembleAt(t), AT_GLASS[1]]
}

export function hospitalWay(): Seg[] {
  const segs: Seg[] = []
  const rest = (a: number, b: number, p: Pt) => {
    if (b > a) segs.push({ from: p, to: p, dur: b - a })
  }
  rest(T0, SET_OFF, START)
  segs.push(...carried(martyAt, SET_OFF, NESTLE, 32))
  rest(NESTLE, LEAN, NEST)
  segs.push(...carried(martyAt, LEAN, NUDGE, 16))
  segs.push(...carried(martyAt, NUDGE, SPRING, 32))
  // The hops: exact parabolas, landing on the beats.
  const ways: Way[] = [{ at: SPRING, p: FOOT }]
  for (const [a, b, , q] of HOPS) ways.push({ at: b, p: q, arc: (G * (b - a) ** 2) / 8 })
  segs.push(...route(ways))
  let t = SON
  for (const ti of TREMBLES) {
    rest(t, ti, AT_GLASS)
    segs.push(...carried(martyAt, ti, ti + 0.6, 30))
    t = ti + 0.6
  }
  // The last tremble has died away to nothing: settle exactly on the sill, and hold there to the end.
  segs.push({ from: martyAt(t), to: AT_GLASS, dur: 0.2, ease: 'inout' })
  rest(t + 0.2, T1, AT_GLASS)
  return segs
}

/* ------------------------------------------------------------------ Rachel and their son */

/** A little lean and back, peaking `peak` seconds after `t0`. */
const bump = (t: number, t0: number, peak: number): number => {
  const s = (t - t0) / peak
  return s <= 0 ? 0 : s * Math.exp(1 - s)
}

export function rachelAt(t: number): Pt {
  const breath = 0.008 * Math.sin(((t - T0) / 3.4) * Math.PI * 2)
  const dx = -0.03 * bump(t, STIR, 0.25) + 0.03 * bump(t, NESTLE - 0.12, 0.2) - 0.022 * leanAt(t) - 0.045 * bump(t, NUDGE, 0.16)
  return [RACHEL_AT[0] + dx, RACHEL_AT[1] + breath - 0.004 * leanAt(t)]
}

/** How far the nurse has him lifted, 0 to 1. */
export const liftOf = (t: number): number => smooth(t, LIFT, LIFTED)

export function babyAt(t: number): Pt {
  let wx = 0
  for (const w of WRIGGLES) if (t >= w && t < w + 0.8) wx += 0.022 * ring(t - w, 5.5, 0.22)
  const l = liftOf(t)
  const rock = 0.012 * Math.sin(((t - LIFTED) / 2.2) * Math.PI * 2) * smooth(t, LIFTED, LIFTED + 1.5)
  return [SON_BED[0] + wx + 0.16 * l + rock, SON_BED[1] - 0.46 * l - Math.abs(rock) * 0.3]
}

/* ------------------------------------------------------------------ strikes */

export const HOSPITAL_STRIKES: number[] = [
  CUT,
  STIR,
  NESTLE,
  BLOOM,
  LEAN,
  NUDGE,
  SPRING,
  ...LANDS,
  SON,
  BLIND_TOP,
  LOOK,
  REACH,
  LIFT,
  LIFTED,
  ...TREMBLES,
  ...WRIGGLES,
  ...CRIES.map(([t]) => t),
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)
