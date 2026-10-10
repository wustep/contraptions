import { FLOOR, R, laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { DURATION, SEAM, onset, pulse } from '../music'
import { G } from '../physics'
import { HANNAH_OLDER, HANNAH_SCALE } from '../worlds'

/**
 * The lake house, as numbers: the room's geometry, when each of its five scenes happens, where Hannah goes in each,
 * where Louise and Hannah look, and how the light stands at any show time. Nothing here draws (`house-draw.ts` does).
 *
 * The room is the lake's origin: the prologue, the second and third visions and the end all start Louise at
 * (-0.5, 0), on the low bench under the long window's left end. The floor is lower than the bench by `BENCH.h`, and
 * the window is most of the room's back wall, from the floor up: the lake is beyond it, into the screen. The first
 * vision is outdoors, on the lawn, at `V1_AT` (a place of its own: the set draws the lawn while it is on).
 */

/* ------------------------------------------------------------------ the people */

/** Little Hannah's radius, and older Hannah's. */
export const HR = R * HANNAH_SCALE
export const HR2 = R * HANNAH_OLDER

/** Louise's place on the bench (every room scene starts her here). */
export const SEAT: Pt = [-0.5, 0]

/* ------------------------------------------------------------------ the room */

/**
 * The floor where a ball rolls on it (its centre at `floor - r`), a little in front of the wall; the wall's foot, a
 * little further back up the floor (where the lamp stands); and the ceiling's line, high over the glass: the room is
 * tall, and the end's credits are set on the quiet wall between them.
 */
export const ROOM = { floor: FLOOR + 0.3, wall: FLOOR + 0.24, ceiling: -5.3 }
/** The low bench under the window: its top is Louise's rail (y = FLOOR), its ends, its slab's thickness. */
export const BENCH = { x0: -1.0, x1: 2.3, top: FLOOR, slab: 0.075, leg: 0.13 }
/** The long window: the glass from the floor most of the way up the wall, four tall panes. */
export const WIN = { x0: -1.25, x1: 6.05, top: -2.62, sill: ROOM.wall - 0.05 }
export const MULLIONS = [1, 2, 3].map((i) => WIN.x0 + (i * (WIN.x1 - WIN.x0)) / 4)
/** The floor lamp beside the window's left end (never lit). */
export const LAMP = { x: -1.64, shadeTop: -2.08, shadeBot: -1.7, shadeW: 0.42 }
/** Where the view's horizon (the far shore's waterline) is, in the view's own cells, and the sun behind the fog. */
export const HORIZON = -0.74
export const SUN: Pt = [1.55, -1.02]
/** The camera the view is drawn for (the show's first frame): far things move less than it (`house-draw.ts`). */
export const VIEW_CAM = { x: SEAT[0] + 1.3, y: SEAT[1] - 1.0, cells: 4.8 }

/** Her drawing, taped low on the wall over her corner, at her height: its middle, its size, and its tilt. */
export const DRAWING = { x: -2.82, y: -0.72, w: 0.46, h: 0.34, tilt: -0.06 }

/** Hannah's corner of the floor, across the room: where she is at the first frame (and at the end's). */
export const HANNAH_HOME = -2.36
const FLOOR_Y = ROOM.floor - HR
const BENCH_Y = BENCH.top - HR
/** Where she lands on the bench's end, touches her mother (a sliver short of her), and settles beside her. */
const LAND_X = BENCH.x0 + 0.05
const TOUCH_X = SEAT[0] - R - HR - 0.004
const SETTLE_X = SEAT[0] - 0.34

/* ------------------------------------------------------------------ the scenes */

export const V1_AT: Pt = [34, 0]

export const SCENES = {
  prologue: { begin: 0, end: SEAM.flight },
  v1: { begin: SEAM.v1, end: SEAM.fog2 },
  v2: { begin: SEAM.v2, end: SEAM.fog3 },
  v3: { begin: SEAM.v3, end: SEAM.fog4 },
  end: { begin: SEAM.end, end: DURATION },
} as const

/** The strikes, scene by scene (exact measured times). */
export const PRO = {
  /** The first murmur that carries: Hannah sets off. */
  go: onset(1.573),
  /** The clicks: she springs, and lands on the bench's end. */
  spring: onset(3.582),
  land: onset(3.831),
  /** The click (1.5): she comes to her mother. */
  touch: onset(4.098),
  /** The two of them turn to the window. */
  look: onset(5.242),
  lookToo: onset(5.486),
  /** The first pulse: the sun behind the fog catches the water; it grows on the next two. */
  light: [pulse(28), pulse(29), pulse(30)],
}
export const V1 = {
  cut: pulse(584),
  /** Hannah laughing: a leap (off on one pulse, down on another), and a little skip after it. */
  bounce: [pulse(586), pulse(588), pulse(589)],
  /** Running on ahead: two more little skips, landing on the next two strong pulses. */
  skips: [pulse(592), pulse(593), pulse(594)],
}
export const V2 = {
  /** The cut, and the lean begins; it comes to rest against her. */
  lean: pulse(654),
  rest: pulse(656),
  /** She goes: off along the bench, down off its end (lands on the floor), and out. */
  go: pulse(658),
  down: pulse(666),
}
/** The rain: every hard pulse of the third vision, a drop landing on a pane. */
export const V3_DROPS = [683, 685, 686, 688, 689, 691, 692, 693, 695].map(pulse)
export const END = {
  /** She looks at her daughter first, this time (the loudest note before the flutter); her daughter looks up at her. */
  knows: onset(200.539),
  notices: onset(205.63),
  /** The flutter: Hannah sets off, skips three times, dashes for the bench, springs, lands, and touches her. */
  go: onset(208.631),
  skip: [onset(209.427), onset(209.682), onset(209.937), onset(210.158)],
  run: onset(211.36),
  spring: onset(211.818),
  land: onset(212.05),
  touch: onset(212.312),
  /** Soft (no strike): the two of them turn to the light as the credits begin. */
  look: 214.605,
}

/* ------------------------------------------------------------------ paths */

/** A lane from waypoints with speeds: a roll's `dur` is its length over its mean speed, by construction. */
class Walk {
  segs: Seg[] = []
  constructor(
    public t: number,
    public p: Pt,
    public v = 0,
  ) {}
  /** Stay where she is until `until`. */
  rest(until: number): this {
    if (until > this.t) this.segs.push({ from: this.p, to: this.p, dur: until - this.t })
    this.t = Math.max(this.t, until)
    this.v = 0
    return this
  }
  /** Roll along the level from the speed she has to `v1` (signed), arriving at `until`. */
  roll(until: number, v1: number): this {
    const T = until - this.t
    const d = ((this.v + v1) / 2) * T
    const to: Pt = [this.p[0] + d, this.p[1]]
    const a = Math.abs(this.v)
    const b = Math.abs(v1)
    this.segs.push(a + b > 1e-9 ? { from: this.p, to, dur: T, ramp: [a, b] } : { from: this.p, to, dur: T })
    this.p = to
    this.t = until
    this.v = v1
    return this
  }
  /** A hop at the speed she has (horizontal), landing `dy` lower (negative: up) at `until`: a parabola under G. */
  /** A hop: off now, down at `until`, `dy` lower (negative: up); `lift` raises its arc above gravity's own. */
  hop(until: number, dy = 0, lift = 0): this {
    const T = until - this.t
    const to: Pt = [this.p[0] + this.v * T, this.p[1] + dy]
    this.segs.push({ from: this.p, to, dur: T, arc: (G * T * T) / 8 + lift })
    this.p = to
    this.t = until
    return this
  }
  /** Off an edge at the speed she has: a fall of `dy` from rest vertically, which takes the time it takes. */
  fall(dy: number): this {
    const T = Math.sqrt((2 * dy) / G)
    const to: Pt = [this.p[0] + this.v * T, this.p[1] + dy]
    this.segs.push({ from: this.p, to, dur: T, arc: (G * T * T) / 8 })
    this.p = to
    this.t += T
    return this
  }
  lane(): Lane {
    return { segs: this.segs, fire: 0 }
  }
}

/**
 * Little Hannah across the room to her mother: from her corner of the floor, a roll (and in the end, three skips on
 * the flutter's hardest notes), a spring up onto the bench's end, a roll along it to her mother, a soft touch a sliver
 * short, and back a little (the recovery long and damped) to sit beside her; at the end (`stay`) she stays against her
 * instead. The spring lands near the top of its arc
 * (a child climbing up), just past the bench's end.
 */
function toMother(start: number, o: { go: number; skips?: number[]; run?: number; spring: number; land: number; touch: number; end: number; lean?: number; back?: number; stay?: number }): Lane {
  const vTouch = 0.45
  const hop = o.land - o.spring
  const roll = o.touch - o.land
  // Where her mother is as she reaches her (leaning toward her, at the end), and where she touches.
  const touchX = TOUCH_X - (o.lean ?? 0)
  // Along the bench to her: from where she lands to where she touches, arriving at `vTouch`.
  const vSpring = (2 * (touchX - LAND_X)) / roll - vTouch
  const sprung = LAND_X - vSpring * hop
  const w = new Walk(start, [HANNAH_HOME, FLOOR_Y]).rest(o.go)
  const d = sprung - HANNAH_HOME
  if (o.skips && o.run) {
    // Set off, skip three times at the speed she has come to, keep it, then run for the bench.
    const [s0, , , s3] = o.skips
    const a = s0 - o.go
    const b = o.run - s3
    const c = o.spring - o.run
    const v = (d - (c / 2) * vSpring) / (a / 2 + (s3 - s0) + b + c / 2)
    w.roll(s0, v)
    for (let i = 1; i < o.skips.length; i++) w.hop(o.skips[i])
    w.roll(o.run, v).roll(o.spring, vSpring)
  } else {
    // A child's roll from rest: up to speed, and quicker for the last stretch to the bench.
    const T = o.spring - o.go
    const T1 = T * 0.7
    const v = (2 * d - vSpring * (T - T1)) / T
    w.roll(o.go + T1, v).roll(o.spring, vSpring)
  }
  // Up onto the bench: a spring, rising over its end and coming down onto it (gravity's arc alone in so short a hop
  // would still be rising as she lands, and she would pass through the slab's corner on the way up).
  w.hop(o.land, BENCH_Y - FLOOR_Y, 0.16).roll(o.touch, vTouch)
  if (o.stay) {
    // The touch, at the end: her mother rocks back to her place under it (with `LOUISE_END`'s ease), and she goes
    // with her, against her, and stays there.
    const to: Pt = [SEAT[0] - R - HR - 0.006, BENCH_Y]
    w.segs.push({ from: w.p, to, dur: o.stay, ease: 'out' })
    w.p = to
    w.t = o.touch + o.stay
    w.rest(o.end)
    return w.lane()
  }
  // The touch: she rebounds a little, softly, and comes to rest beside her.
  const back = o.back ?? 0.22
  const settle = o.touch + (2 * (touchX - SETTLE_X)) / back
  w.v = -back
  w.roll(settle, 0).rest(o.end)
  return w.lane()
}

export const HANNAH_PROLOGUE = toMother(0, { go: PRO.go, spring: PRO.spring, land: PRO.land, touch: PRO.touch, end: SCENES.prologue.end + 1 })
/**
 * Louise at the end: on the bench as in the first frame; when she looks at her daughter (knowing, this time) she turns
 * toward her with a small roll, and leans there while she comes; the child's touch rocks her back to her place.
 */
export const LEAN = 0.07
/** How long the touch takes to rock her back to her place. */
const ROCK = 0.95
export const LOUISE_END: Lane = (() => {
  const w = new Walk(SCENES.end.begin, SEAT).rest(END.knows)
  const to: Pt = [SEAT[0] - LEAN, SEAT[1]]
  w.segs.push({ from: SEAT, to, dur: 1.2, ease: 'inout' })
  w.p = to
  w.t = END.knows + 1.2
  w.rest(END.touch)
  w.segs.push({ from: to, to: SEAT, dur: ROCK, ease: 'out' })
  w.p = SEAT
  w.t = END.touch + ROCK
  w.rest(DURATION)
  return w.lane()
})()

export const HANNAH_END = toMother(SCENES.end.begin, { go: END.go, skips: END.skip, run: END.run, spring: END.spring, land: END.land, touch: END.touch, end: DURATION + 1, lean: LEAN, stay: ROCK })

/** Older Hannah, in the second vision: she leans in against her, rests, and goes (along the bench, down off its end, out). */
export const HANNAH_V2: Lane = (() => {
  const y = BENCH.top - HR2
  const lean = SEAT[0] + R + HR2 + 0.004
  const w = new Walk(SCENES.v2.begin, [SEAT[0] + 0.4, y])
  w.segs.push({ from: w.p, to: [lean, y], dur: V2.rest - V2.lean, ease: 'inout' })
  w.p = [lean, y]
  w.t = V2.rest
  w.rest(V2.go)
  // Off along the bench and over its end, landing on the floor on the pulse, then on out of the room's frame.
  const edge = BENCH.x1 + 0.03
  const fallT = Math.sqrt((2 * (ROOM.floor - BENCH.top)) / G)
  const off = V2.down - fallT
  const T = off - V2.go
  const T1 = 0.8
  const v = (edge - lean) / (T1 / 2 + (T - T1))
  w.roll(V2.go + T1, v).roll(off, v).fall(ROOM.floor - BENCH.top).roll(SCENES.v2.end + 1, v)
  return w.lane()
})()

/** A lane's point at show time `t` (the lane starting at `t0`). */
export const along = (lane: Lane, t0: number, t: number): Pt => {
  const at = laneAt(lane, t - t0)
  return [at.x, at.y]
}

/* ------------------------------------------------------------------ the lawn (the first vision) */

/**
 * The lawn in the first vision's own frame (V1_AT is its origin; she comes in at (-0.5, 0)): the grass's surface
 * `lawnY(x)`, level where she comes in, down a gentle dip, and level on along the shore, the lake beyond it; the bank
 * down to the water is further on than the picture ever goes. Hannah runs ahead along it, skipping, and never near
 * the edge: the vision is a child at play and her mother after her, nothing else.
 */
export const BROW = 11.5
const BANK = { drop: 2.35, run: 3.45 }
const smooth01 = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}
export function lawnY(x: number): number {
  const dip = 0.15 * smooth01((x - 0.1) / 1.8)
  const bank = x > BROW ? BANK.drop * smooth01((x - BROW) / BANK.run) : 0
  return FLOOR + dip + bank
}
/** The lawn's slope (dy/dx). */
export const lawnSlope = (x: number): number => (lawnY(x + 0.002) - lawnY(x - 0.002)) / 0.004
/** Where a ball of radius `r` touching the lawn at `x` has its centre. */
export function onLawn(x: number, r: number): Pt {
  const m = lawnSlope(x)
  const n = Math.sqrt(1 + m * m)
  return [x + (r * m) / n, lawnY(x) - r / n]
}
/** The water's edge at the bank's foot, in the vision's frame. */
export const SHORE = { x: BROW + BANK.run, y: FLOOR + BANK.drop }

/** Louise across the lawn: 0.9 cells a second, as she came in and as she goes. */
export const V1_SPEED = 0.9
export const louiseLawn = (t: number): Pt => onLawn(-0.5 + V1_SPEED * (t - SCENES.v1.begin), R)

/**
 * Little Hannah on the lawn: a little ahead of her mother as it cuts in, quicker, a leap and a skip (laughing), and on
 * ahead at a child's run, skipping twice more on the pulses, her mother after her: never caught, and still running
 * when the cut takes her. Integrated once (her contact point along the lawn, and her speed), then read by time.
 */
const HANNAH_LAWN: { t: number; x: number; lift: number }[] = (() => {
  const out: { t: number; x: number; lift: number }[] = []
  const { begin, end } = SCENES.v1
  const [up, down, skip] = V1.bounce
  const [s0, s1, s2] = V1.skips
  const hops: [number, number][] = [
    [up, down],
    [down, skip],
    [s0, s1],
    [s1, s2],
  ]
  const RUN = 1.25
  const ON = 1.05
  let x = -0.5 + 0.85
  let v = V1_SPEED
  const dt = 1 / 480
  for (let t = begin; t <= end + 0.6; t += dt) {
    // Her speed: up from her mother's to a child's run by the leap, held through it and the skip, then easing a
    // little to a pace her mother nearly keeps.
    let a = 0
    if (t < up) a = (RUN - V1_SPEED) / (up - begin)
    else if (t >= skip && t < s0) a = (ON - RUN) / (s0 - skip)
    v += a * dt
    x += v * dt
    // The leap and the skips: parabolas over the lawn under her, each landing on its pulse.
    let lift = 0
    for (const [a0, a1] of hops) if (t > a0 && t < a1) lift = (G / 2) * (t - a0) * (a1 - t)
    out.push({ t, x, lift })
  }
  return out
})()
export function hannahLawn(t: number): Pt {
  const s = HANNAH_LAWN
  const i = Math.max(0, Math.min(s.length - 2, Math.floor((t - s[0].t) / (s[1].t - s[0].t))))
  const a = s[i]
  const b = s[i + 1]
  const u = Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)))
  const x = a.x + (b.x - a.x) * u
  const lift = a.lift + (b.lift - a.lift) * u
  const [cx, cy] = onLawn(x, HR)
  return [cx, cy - lift]
}

/* ------------------------------------------------------------------ where they look */

/**
 * A ball's mark read as a gaze: the angle it sits at (radians, y down: -π/2 is up), turned the short way round to each
 * `to` over `dur`, eased, on top of `base` (how far rolling has turned it).
 */
export interface Turn {
  at: number
  to: number
  dur: number
}
const wrap = (a: number) => {
  let v = a % (2 * Math.PI)
  if (v > Math.PI) v -= 2 * Math.PI
  if (v <= -Math.PI) v += 2 * Math.PI
  return v
}
const easeInOut = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}
export function gaze(t0: number, a0: number, turns: Turn[], base: (t: number) => number = () => 0): (t: number) => number {
  const first = a0 - base(t0)
  const offs: { at: number; dur: number; from: number; delta: number }[] = []
  let off = first
  for (const tn of turns) {
    const want = tn.to - base(tn.at + tn.dur)
    const delta = wrap(want - off)
    offs.push({ at: tn.at, dur: tn.dur, from: off, delta })
    off += delta
  }
  return (t: number) => {
    let o = first
    for (const s of offs) {
      if (t < s.at) break
      o = s.from + s.delta * easeInOut((t - s.at) / s.dur)
    }
    return base(t) + o
  }
}

/** Looking out through the glass at the light (up and to the right), and at little Hannah beside her or across the room. */
const OUT = -0.62
const AT_HANNAH = Math.PI - 0.2
const AT_HANNAH_FAR = Math.PI - 0.1

/** Louise's gaze in each room scene (show time). */
export const LOUISE_GAZE = {
  prologue: gaze(0, OUT, [
    { at: PRO.spring, to: AT_HANNAH, dur: 0.5 },
    { at: PRO.look, to: OUT, dur: 0.9 },
  ]),
  v2: gaze(SCENES.v2.begin, -0.1, [
    // Watching her go, to the bench's end and over it; and once she is out of the room, down, bowed, alone, held into
    // the cut.
    { at: V2.go + 0.3, to: 0.2, dur: 1.4 },
    { at: SCENES.v2.end - 0.8, to: 1.38, dur: 0.6 },
  ]),
  v3: gaze(SCENES.v3.begin, -0.85, []),
  // This time she looks at her daughter first (turning to her with a small roll), and watches her come.
  end: gaze(SCENES.end.begin, OUT, [
    { at: END.knows, to: AT_HANNAH_FAR, dur: 1.3 },
    { at: END.run, to: Math.PI - 0.36, dur: 0.45 },
    { at: END.land, to: AT_HANNAH, dur: 0.3 },
    { at: END.look, to: OUT - 0.1, dur: 1.8 },
  ], (t) => (along(LOUISE_END, SCENES.end.begin, t)[0] - SEAT[0]) / R),
}

/** How far a rolling ball of radius `r` on a lane has turned (the mark rolls with her). */
const rolled = (lane: Lane, t0: number, r: number, x0: number) => (t: number) => (along(lane, t0, t)[0] - x0) / r

/**
 * Hannah's gaze: rolling as she goes, looking where she looks when she stops. Little Hannah starts looking down at
 * the floor by her (a child at play); once she has come to rest by her mother she looks up at her, and then out.
 */
const HOME_GAZE = 1.25
export const HANNAH_GAZE = {
  prologue: gaze(0, HOME_GAZE, [
    { at: PRO.touch + 0.55, to: -0.4, dur: 0.6 },
    { at: PRO.lookToo, to: OUT - 0.2, dur: 0.8 },
  ], rolled(HANNAH_PROLOGUE, 0, HR, HANNAH_HOME)),
  v2: gaze(SCENES.v2.begin, Math.PI - 0.15, [
    { at: V2.lean, to: Math.PI + 0.1, dur: 0.48 },
  ], rolled(HANNAH_V2, SCENES.v2.begin, HR2, SEAT[0] + 0.4)),
  end: gaze(SCENES.end.begin, HOME_GAZE, [
    { at: END.notices, to: -0.12, dur: 0.9 },
    { at: END.touch + 0.55, to: -0.4, dur: 0.6 },
    { at: END.look + 0.35, to: OUT - 0.2, dur: 1.8 },
  ], rolled(HANNAH_END, SCENES.end.begin, HR, HANNAH_HOME)),
}

/* ------------------------------------------------------------------ light */

export type Kind = 'dawn' | 'day' | 'dusk' | 'lawn'
export interface Light {
  kind: Kind
  /** Seconds since this scene's light began: what the fog's drift and the rain read (the end reads as the prologue). */
  tau: number
  /** How dark the room is: its plaster, oak and bench mixed toward the night. */
  dim: number
  /** How much light there is outside, 0 (before the sun) to 1. */
  lum: number
  /** The fog lying on the water, 0 to 1. */
  fog: number
  /** The sun behind the fog: its glow in it, and its light on the water under it. */
  glow: number
  path: number
  /** The window going to white (the prologue's end; softly, at the end). */
  glare: number
  /** Rain (the third vision). */
  rain: number
}

const rise = (t: number, at: number, tau: number) => (t < at ? 0 : 1 - Math.exp(-(t - at) / tau))
const sm = (t: number, a: number, b: number) => smooth01((t - a) / (b - a))

/** The dawn of the prologue: dim, the fog on the water; the sun catches it on the first pulse and the next two; white. */
function prologueLight(t: number): Light {
  const catchUp = 0.45 * rise(t, PRO.light[0], 0.16) + 0.25 * rise(t, PRO.light[1], 0.16) + 0.3 * rise(t, PRO.light[2], 0.2)
  const glare = Math.pow(sm(t, 7.3, SCENES.prologue.end), 1.25)
  const before = sm(t, 0.3, PRO.light[0])
  return {
    kind: 'dawn',
    tau: t,
    dim: 0.78 - 0.07 * before - 0.16 * catchUp - 0.16 * glare,
    lum: Math.min(1, 0.1 + 0.14 * before + 0.42 * catchUp + 0.34 * glare),
    fog: 0.85 - 0.1 * before,
    glow: 0.14 + 0.13 * before + 0.63 * catchUp + 0.1 * glare,
    path: catchUp,
    glare,
    rain: 0,
  }
}

/**
 * The same dawn at the end, slower, and this time it comes: as the held tones die the light comes on over the lake
 * (the water brightening, the fog thinning off the far shore, its firs coming out of it), and after the touch the
 * sun comes through: the end of the one movement.
 */
function endLight(t: number): Light {
  const tau = t - SCENES.end.begin
  if (tau <= 0) return prologueLight(0)
  const first = prologueLight(0)
  // On the touch the sun catches the water at once, as it did on the prologue's first pulse (the circle closing on
  // the loudest note of the coda), and goes on coming through the fog after it.
  const sun = 0.42 * rise(t, END.touch, 0.16) + 0.58 * rise(t, END.touch, 2.6) * sm(t, END.touch, END.touch + 0.6)
  const dawn = sm(t, SCENES.end.begin + 0.4, END.go + 0.4)
  return {
    kind: 'dawn',
    tau,
    dim: first.dim - 0.18 * dawn - 0.18 * sun,
    lum: Math.min(1, first.lum + 0.44 * dawn + 0.44 * sun),
    fog: first.fog - 0.42 * dawn - 0.1 * sun,
    glow: first.glow + 0.26 * dawn + 0.52 * sun,
    path: 0.14 * dawn + 0.72 * sun,
    glare: 0.18 * sun,
    rain: 0,
  }
}

export function lightAt(t: number): Light {
  const { v1, v2, v3, end } = SCENES
  if (t >= v1.begin - 1 && t < v1.end + 1) return { kind: 'lawn', tau: t - v1.begin, dim: 0, lum: 1, fog: 0, glow: 0, path: 0, glare: 0, rain: 0 }
  if (t >= v2.begin - 1 && t < v2.end + 1) return { kind: 'day', tau: t - v2.begin, dim: 0.24, lum: 0.8, fog: 0.32, glow: 0.12, path: 0.1, glare: 0, rain: 0 }
  if (t >= v3.begin - 1 && t < v3.end + 1) return { kind: 'dusk', tau: t - v3.begin, dim: 0.76, lum: 0.2, fog: 0.16, glow: 0, path: 0, glare: 0, rain: 1 }
  if (t >= end.begin - 1) return endLight(t)
  return prologueLight(Math.min(t, SCENES.prologue.end + 1))
}
