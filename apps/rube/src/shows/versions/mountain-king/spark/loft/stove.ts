import { R, type Pt, type Seg } from '../../../../../parts'
import { carried, part, type PartShot } from '../kit'
import { DOORS, LOFT_SEAM } from '../music'
import { G } from '../physics'
import { SEAMS } from '../seams'
import { CAT_CUES, EAR_NEAR, catTop, tailTop } from './cat'
import { FIRE_MOUTH, FLOOR_Y, HANDOFF } from './layout'
import { DOOR_OPENS, GRIP_OFF, SILL, gripTop } from './stove-door'
import { lightAt } from './stove-light'
import { CLICKS, LADLE_LEN, LAND, LANDED, TAKEOFF, drawWheel, onLadle, seatAt, wheelCells } from './stove-wheel'

/**
 * LOFT-B: from phrase 3 (`LOFT_SEAM`, 31.185) to the first fire-door (`DOORS.glass`, 58.024). Laid at LOFT-A's exit,
 * so its entry (-0.5, 0) is `HANDOFF`; everything below is worked out in the loft's world cells and moved into the
 * part's own frame at the end.
 *
 *   31.185  the spark drops off the drying rack onto a frame of the dipping wheel (31.465). Its weight turns the wheel:
 *           a click on each strong note (32.307, 33.433, 34.553), carrying it round and down, and on 35.672 the
 *           wheel stops with its frame low over the vat.
 *   36.783  it hops onto the ladle leaning on the vat and zips down the iron handle to the floor (37.900), rolls out
 *           along the boards under the bench and comes to rest (39.6): the sleeping cat is in front of it. It looks.
 *           Then three tiptoes on the phrase's first notes (40.185, 40.755, 41.325), and it stops short of the tail.
 *   42.455  the tail's tip twitches up right in front of it: it hops back (42.735). Then on 43.570 it hops onto the
 *           tail itself, and tiptoes along it (44.958, 45.235, 45.514), up onto the haunch (46.908), along the
 *           breathing back (47.465, 48.027, 49.150) to the shoulders (50.267), where an ear flicks beside it.
 *   51.384  the cat shifts in its sleep, a heave of the shoulders, and the spark is tossed up; at the top of the toss
 *           (51.663) the stove's hot draught takes it, and it rises up the iron face like an ember, swaying, and
 *           settles onto the latch's grip (52.504): the latch lifts, and the firebox door creaks open on the fire.
 *   53.625  it drops onto the sill, backs up three steps (54.180, 54.459, 54.737), bounces twice (55.287, 55.836),
 *           and gathers itself through the held bars while the fire wakes to it.
 *   58.024  it leaps into the fire: `SEAMS.glass`, moving (2.2, -0.4), the camera 2.2 cells, the fire filling it.
 */

/** The part's own frame: its entry (-0.5, 0) is `HANDOFF`. */
const O: Pt = [HANDOFF[0] + 0.5, HANDOFF[1]]
const loc = (p: Pt): Pt => [p[0] - O[0], p[1] - O[1]]

/** Where the lane ends, from the part's own frame: the fire's mouth. */
const EXIT: Pt = [FIRE_MOUTH[0] - HANDOFF[0], FIRE_MOUTH[1] - HANDOFF[1]]

/* ------------------------------------------------------------------ the beats */

/** Down the ladle: where it lands on the handle (cells from the top), when it reaches the floor. */
const ON_LADLE = 36.783
const LADLE_AT = 1.25
const FLOOR_AT = 37.9
/** The floor's line for the spark's centre. */
const FY = FLOOR_Y - R
/** Where on the handle the spark meets the floor. */
const LADLE_END = (() => {
  let s = LADLE_AT
  while (s < LADLE_LEN + 1 && onLadle(s)[1] < FY) s += 0.001
  return s
})()
/** The roll-out along the boards: it comes to rest here, and sees the cat. */
const GLIDE_STOP = 39.6
const LOOK_X = -3.9
/** Three tiptoes toward the tail, on the phrase's first notes: it stops short of the tail on the third. */
const TIPTOES: [number, number][] = [
  [40.185, -3.25],
  [40.755, -2.6],
  [41.325, -1.95],
]
/** The twitch, and the hop back from it. */
const TWITCH = CAT_CUES.stir[0]
const BACK_AT = 42.735
const BACK_X = -2.45
/** Onto the tail, and three tiptoes along it. */
const ON_TAIL = 43.57
const TAIL_STEPS: [number, number][] = [
  [44.958, 0.5],
  [45.235, 0.98],
  [45.514, 1.46],
]
/** Up onto the haunch, and along the back to the shoulders. */
const HAUNCH: [number, number] = [46.908, 2.78]
const BACK_STEPS: [number, number][] = [
  [47.465, 3.3],
  [48.027, 3.88],
  [49.15, 4.52],
  [EAR_NEAR, 5.7],
]
/** The heave, the toss's top where the draught takes it, the rise up the hot iron, the grip. */
const HEAVE = CAT_CUES.stir[1]
const TOSS_TOP = 51.663
const APEX_AT = 52.3
/** The sill, and the steps back and bounces as it gathers itself. */
const ON_SILL = 53.625
const SILL_X = 6.25
/** The leap into the fire: `LEAP_T` in the air, from the sill to the fire's mouth, arriving with the seam's velocity. */
const LEAP_T = (() => {
  // The rise from the sill to the mouth, h, with the seam's end velocity vy (up): h = vy T + G T² / 2.
  const h = SILL.y - R - FIRE_MOUTH[1]
  const vy = -SEAMS.glass.v[1]
  return (-vy + Math.sqrt(vy * vy + 2 * G * h)) / G
})()
const LEAP_FROM: Pt = [FIRE_MOUTH[0] - SEAMS.glass.v[0] * LEAP_T, SILL.y - R]
const LEAP_AT = DOORS.glass - LEAP_T
const BACKUP: [number, number][] = [
  [54.18, 6.02],
  [54.459, 5.8],
  [54.737, LEAP_FROM[0]],
]
const BOUNCES = [55.287, 55.836]

/** The strikes (show seconds): every landing, click, step and bang this part makes on the music. */
export const STOVE_HITS: number[] = [
  LAND,
  ...CLICKS,
  ON_LADLE,
  FLOOR_AT,
  ...TIPTOES.map(([t]) => t),
  TWITCH,
  BACK_AT,
  ON_TAIL,
  ...TAIL_STEPS.map(([t]) => t),
  HAUNCH[0],
  ...BACK_STEPS.map(([t]) => t),
  HEAVE,
  DOOR_OPENS,
  ON_SILL,
  ...BACKUP.map(([t]) => t),
  ...BOUNCES,
  DOORS.glass,
]

/* ------------------------------------------------------------------ the lane, in world cells */

/** A walk over a surface that moves (the cat breathing): x eased from step to step, the centre on the surface, each step a small lift. */
function walk(surface: (x: number, t: number) => number, x0: number, steps: [number, number][], stepFor: number, lift: number): (t: number) => Pt {
  return (t: number): Pt => {
    let x = x0
    let up = 0
    for (const [at, to] of steps) {
      const start = at - stepFor
      if (t >= at) {
        x = to
        continue
      }
      if (t > start) {
        const u = (t - start) / stepFor
        const e = u * u * (3 - 2 * u)
        x = x + (to - x) * e
        up = lift * Math.sin(Math.PI * u)
      }
      break
    }
    return [x, surface(x, t) - up]
  }
}

/** A cubic Hermite between two points with two velocities over `T` seconds: a move that starts and ends as it must. */
function hermite(p0: Pt, v0: Pt, p1: Pt, v1: Pt, T: number): (u: number) => Pt {
  return (u: number) => {
    const u2 = u * u
    const u3 = u2 * u
    const h00 = 2 * u3 - 3 * u2 + 1
    const h10 = u3 - 2 * u2 + u
    const h01 = -2 * u3 + 3 * u2
    const h11 = u3 - u2
    return [h00 * p0[0] + h10 * T * v0[0] + h01 * p1[0] + h11 * T * v1[0], h00 * p0[1] + h10 * T * v0[1] + h01 * p1[1] + h11 * T * v1[1]]
  }
}

function lane(slot: { begin: number; end: number }): Seg[] {
  const segs: Seg[] = []
  let now = { t: slot.begin, p: HANDOFF as Pt }
  const push = (seg: Omit<Seg, 'from' | 'to'> & { to: Pt }, t: number) => {
    segs.push({ ...seg, from: loc(now.p), to: loc(seg.to) })
    now = { t, p: seg.to }
  }
  /** A hop from where it is to `to`, landing at `at`: the parabola the loft's gravity draws. */
  const hop = (to: Pt, at: number, g = G) => {
    const T = at - now.t
    push({ to, dur: T, arc: (g * T * T) / 8 }, at)
  }
  const hold = (until: number) => {
    if (until > now.t + 1e-9) push({ to: now.p, dur: until - now.t }, until)
  }
  /** A step from rest to rest, a little lift in the middle. */
  const step = (to: Pt, from: number, at: number, lift: number) => {
    hold(from)
    push({ to, dur: at - now.t, arc: lift, ease: 'inout' }, at)
  }
  /** Carried by something moving, sampled from the same function its drawing reads. */
  const ride = (fn: (t: number) => Pt, until: number, per = 0.02) => {
    const n = Math.max(1, Math.ceil((until - now.t) / per))
    for (const s of carried((t) => loc(fn(t)), now.t, until, n)) segs.push(s)
    now = { t: until, p: fn(until) }
  }

  // Off the rack, at the seam's velocity, down onto the frame.
  hop(LANDED, LAND)
  // Riding the frame round and down.
  ride(seatAt, TAKEOFF)
  // A hop onto the ladle, the slide down it, the glide along the boards: one pace that runs down, from the handle
  // through the floor to a stop.
  hop(onLadle(LADLE_AT), ON_LADLE)
  const floorAt: Pt = [onLadle(LADLE_END)[0], FY]
  const glide = LOOK_X - floorAt[0]
  const vFloor = (2 * glide) / (GLIDE_STOP - FLOOR_AT)
  const slide = Math.hypot(floorAt[0] - now.p[0], floorAt[1] - now.p[1])
  const vLadle = Math.max(0.3, (2 * slide) / (FLOOR_AT - ON_LADLE) - vFloor)
  push({ to: floorAt, dur: FLOOR_AT - ON_LADLE, ramp: [vLadle, vFloor] }, FLOOR_AT)
  push({ to: [LOOK_X, FY], dur: GLIDE_STOP - FLOOR_AT, ramp: [vFloor, 0] }, GLIDE_STOP)
  // It looks at the cat; then tiptoes up to the tail, each step a note.
  for (const [at, x] of TIPTOES) step([x, FY], at - 0.3, at, 0.09)
  // The twitch: it hops back from the tail, then over the curl onto it.
  hold(TWITCH)
  hop([BACK_X, FY], BACK_AT)
  hold(ON_TAIL - 0.62)
  hop([0.02, tailTop(0.02, ON_TAIL)], ON_TAIL)
  // Tiptoes along the tail.
  ride(walk(tailTop, 0.02, TAIL_STEPS, 0.26, 0.07), TAIL_STEPS[2][0], 0.01)
  // Up onto the haunch, along the back: it breathes under it.
  const hopUp = HAUNCH[0] - 0.55
  ride(walk(tailTop, TAIL_STEPS[2][1], [], 0.26, 0), hopUp, 0.03)
  hop([HAUNCH[1], catTop(HAUNCH[1], HAUNCH[0])], HAUNCH[0])
  ride(walk(catTop, HAUNCH[1], BACK_STEPS, 0.34, 0.09), HEAVE, 0.01)
  // The heave tosses it up off the shoulders; at the top of the toss the stove's draught takes it, and it rises up the
  // hot iron like an ember, swaying, slowing under the latch, and settles onto the grip.
  const p0 = now.p
  const vHeave = (catTop(p0[0], HEAVE + 0.004) - catTop(p0[0], HEAVE)) / 0.004
  const v0: Pt = [0.35, Math.min(-3.2, vHeave - 0.8)]
  const top = gripTop(DOOR_OPENS)
  const pTop: Pt = [p0[0] + 0.14, p0[1] - 0.62]
  const vTop: Pt = [0.4, -0.9]
  const apex: Pt = [top[0] - 0.06, top[1] - R - 0.2]
  const vApex: Pt = [0.18, -0.05]
  const toss = hermite(p0, v0, pTop, vTop, TOSS_TOP - HEAVE)
  ride((t) => toss((t - HEAVE) / (TOSS_TOP - HEAVE)), TOSS_TOP, 0.012)
  const rise = hermite(pTop, vTop, apex, vApex, APEX_AT - TOSS_TOP)
  ride((t) => {
    const u = (t - TOSS_TOP) / (APEX_AT - TOSS_TOP)
    const [x, y] = rise(u)
    // The ember's sway in the draught: out west and back, gone by the top.
    return [x - 0.24 * Math.sin(2 * Math.PI * u) * Math.sin(Math.PI * u), y]
  }, APEX_AT, 0.012)
  const land: Pt = [top[0], top[1] - R]
  const drop = hermite(apex, vApex, land, [0.05, 1.6], DOOR_OPENS - APEX_AT)
  ride((t) => drop((t - APEX_AT) / (DOOR_OPENS - APEX_AT)), DOOR_OPENS, 0.01)
  // It rides the grip as the door creaks open under it.
  ride((t) => {
    const g = gripTop(t)
    return [g[0], g[1] - R]
  }, GRIP_OFF, 0.01)
  // Down onto the sill; three steps back; two bounces; the held bars.
  hop([SILL_X, SILL.y - R], ON_SILL)
  for (const [at, x] of BACKUP) step([x, SILL.y - R], at - 0.26, at, 0.06)
  for (const at of BOUNCES) step([LEAP_FROM[0], SILL.y - R], at - 0.3, at, 0.16)
  // A last settle back, and the leap into the fire.
  step([LEAP_FROM[0] - 0.05, SILL.y - R], LEAP_AT - 0.5, LEAP_AT - 0.08, 0)
  push({ to: LEAP_FROM, dur: 0.08, ease: 'in' }, LEAP_AT)
  hop(FIRE_MOUTH, DOORS.glass)
  return segs
}

/* ------------------------------------------------------------------ the camera */

function shots(slot: { begin: number; end: number }): PartShot[] {
  const at = (x: number, y: number): Pt => loc([x, y])
  return [
    // The wheel whole, the spark on its frame at its east side.
    { t: 32.7, cells: 9.6, hold: at(-20.3, 2.9), w: 0.8 },
    { t: 35.4, cells: 9.8, hold: at(-19.9, 4.2), w: 0.72 },
    // Down the ladle and along the floor, low.
    { t: 37.6, cells: 7.4, hold: at(-15.4, 8.3), w: 0.5 },
    { t: 38.8, cells: 6.6, off: [1.8, -1.5] },
    // It comes to rest and sees the cat: the whole sleeping cat, face and all, with the spark small before it.
    { t: 40.1, cells: 8.2, hold: at(0.8, 8.7), w: 1 },
    // The tail, the spark and the cat's sleeping face in one frame for the twitch; then one two-shot that drifts east
    // with it along the cat, the face always in.
    { t: 42.3, cells: 7.4, hold: at(1.65, 8.9), w: 1 },
    { t: 43.3, cells: 7.25, hold: at(1.8, 8.95), w: 1 },
    { t: 44.6, cells: 6.2, hold: at(3.2, 9.0), w: 0.93 },
    { t: 46.9, cells: 5.6, hold: at(3.9, 9.1), w: 0.9 },
    { t: 49.7, cells: 5.7, hold: at(4.7, 8.75), w: 0.8 },
    // The cat and the stove's door in one frame for the heave, and the rise up the hot iron to the latch.
    { t: 51.15, cells: 8.8, hold: at(6.0, 6.75), w: 0.95 },
    { t: 52.6, cells: 6.2, hold: at(6.45, 4.55), w: 0.88 },
    // The sill: closer, and closer, into the fire.
    { t: 54.0, cells: 4.2, hold: at(6.15, 4.6), w: 0.8 },
    { t: 56.4, cells: 3.3, hold: at(6.1, 4.55), w: 0.75 },
    // Gathered on the sill, the fire towering over it; then the leap, and the frame is all fire.
    { t: 57.55, cells: 2.9, hold: at(5.75, 4.72), w: 0.9 },
    { t: slot.end, cells: SEAMS.glass.cells, hold: at(FIRE_MOUTH[0], FIRE_MOUTH[1]), w: 1 },
  ]
}

/* ------------------------------------------------------------------ the part */

export const stove = part<null>(
  {
    name: 'loft-stove',
    draw: (p, _s, c) => {
      const t = c.t + LOFT_SEAM
      const L = lightAt(t)
      p.push()
      p.translate(-O[0] * c.k, -O[1] * c.k)
      drawWheel(p, c.k, c.ink, c.weight, L, t)
      p.pop()
    },
  },
  (slot) => ({
    cells: wheelCells().map(loc),
    exit: EXIT,
    lane: { segs: lane(slot), fire: CLICKS[0] - slot.begin },
    state: null,
  }),
  (slot) => shots(slot),
)
