import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { smooth } from '../kit'
import { bar, beat, beatAt, GROOVE, half, onset, SEAM, SPLASH, STOP } from '../music'
import { G } from '../physics'
import { BAND, DEREK_MEET, DEREK_PLAN, FLOOR_Y, MAGNUM, MUGATU_PERCH, PM_SEAT, RUNWAY } from './geo'

/**
 * Derelicte's clock (the runway builder's): every moment of the runway part, and where Derek, Mugatu, the Prime
 * Minister and the throwing star are at any show time. The set, the part and the camera all read these, so a thing
 * drawn and the ball it carries are one function.
 *
 * Cells, y down, in the runway's frame (= Derelicte's world: `DERELICTE_AT` is the origin). A ball on the runway has
 * its centre at y 0; on the floor, at y 2.
 */

export const B0 = SEAM.derelicte
export const B1 = SEAM.center

/* ------------------------------------------------------------------ the world's clock */

/**
 * Magnum stops the world: from the look to the band's return every clock but Derek's and the star's holds (the crowd,
 * the flashes, the fire, Mugatu mid-follow-through, the Prime Minister). `W` is that clock: show time, held at
 * `MAGNUM` for the half-second, then running on 0.523 s behind. Whatever moves on its own reads `W`; whatever strikes
 * on the music is timed in show seconds and turned into `W` where it has to be.
 */
export const HELD = BAND - MAGNUM
export const W = (t: number): number => (t < MAGNUM ? t : t < BAND ? MAGNUM : t - HELD)
/** The world-clock time of a show time after the hold (for authoring a motion that must land on a strike). */
const w = W
/**
 * The air's clock (fire, smoke, the crowd's heave, things swaying): the silence after the plug plays in slow motion,
 * so it runs at a third of show time from the plug to the look, holds through the look, and runs on after.
 */
const SLOW = 0.33
export const AIR = (t: number): number =>
  t < STOP ? t : t < MAGNUM ? STOP + SLOW * (t - STOP) : t < BAND ? STOP + SLOW * (MAGNUM - STOP) : STOP + SLOW * (MAGNUM - STOP) + (t - BAND)

/* ------------------------------------------------------------------ the moments */

/** The house goes down on the needle; the runway's banks come up from its head to its end on the bare groove's hard beats. */
export const HOUSE_DOWN = B0
export const BANKS_ON = [beat(227), beat(228), beat(229), beat(232)]
/**
 * The plug is the lights: the show's rig (the banks, the runway's edge, the follow spot, the front row's lamp) is on
 * the booth's power, and goes with the sound: dead on the stop, a flicker back on the crash's next onsets, and out. It
 * never comes back.
 */
export const FLICKER = [onset(182.974, 0.2), onset(183.061, 0.2), onset(183.171, 0.2)]
/** The flicker's end (a measured onset): what the camera cuts back to Derek on. */
export const DARK = onset(183.311, 0.2)
export function powerAt(t: number): number {
  if (t < STOP) return 1
  if (t < FLICKER[0]) return 0.05 * Math.exp(-(t - STOP) / 0.05)
  if (t < FLICKER[1]) return 0.6 * Math.exp(-(t - FLICKER[0]) / 0.1)
  if (t < FLICKER[2]) return 0.04
  return 0.28 * Math.exp(-(t - FLICKER[2]) / 0.05)
}
/**
 * The house lights: big work lamps in the roof, a flatter, colder white, clanking on with the band's return and the
 * groove: the show is over and everyone in the hall is seen.
 */
export const WORKS_ON = [BAND, GROOVE]
export function worksAt(t: number): number {
  let v = 0
  WORKS_ON.forEach((at, i) => {
    const u = t - at
    if (u <= 0) return
    const up = Math.min(1, u / 0.08) * (1 - 0.35 * Math.exp(-u / 0.1) * (Math.sin(u * 60) > 0 ? 1 : 0))
    v += (i === 0 ? 0.55 : 0.45) * up
  })
  return v
}

/** Triggered, on the title (beat 233): his first stiff step; the curtain of bags hoists on it and the next two beats. */
export const TRIGGER = DEREK_PLAN.triggered
export const HOIST = [beat(233), beat(234), beat(235)]
/** The follow spot finds him as he comes out through the curtain. */
export const FOLLOW_ON = beat(237)
/** "Don't do it": a hitch, a half step back (239), and a beat held (240). */
export const HITCH = beat(239)
/** The wash (255): the march becomes a stride. */
export const STRIDE = beat(255)
/** At the runway's end (296), the model's stop; he does not turn back (298: a step to its edge). */
export const AT_END = beat(296)
export const TO_EDGE = beat(298)
/** Down the steps, a tread every other beat; then across to the Prime Minister, a step a bar. */
export const DOWN = [300, 302, 304, 306]
export const ACROSS = [308, 312, 316, 320, 324]
/** The rock: a swing a beat, 328 to 349; on 350 he winds back further, and lunges on its off-beat; the plug stops it. */
export const ROCK_K0 = 328
export const ROCK_K1 = 349
export const WIND = beat(350)
export const LUNGE = half(350)
/** Mugatu's star: in his hand, thrown on 355 (184.936, a measured onset in the ringing), stopped by the look. */
export const DRAW_STAR = 184.25
export const THROW = beat(355)
/** Released on the band: it turns point-down, hangs, and drops, and sticks in the boards on the groove's downbeat. */
export const TIP_END = BAND + 0.12
export const STICK = GROOVE
/** Mugatu, lit by a flash (361), backs away up his runway into the canopy's upright (363). */
export const BACKS = beat(361)
export const BUMP = beat(363)
/** The canopy's hitch slips, and the heap of bags drops on him (365). */
export const LANDS = beat(365)
/** He struggles in it. */
export const STRUGGLE = [beat(367), half(368), beat(370), half(372)]
/** The Prime Minister rises (bar 92), and cheers a beat a bounce. */
export const RISES = bar(92)
export const CHEER_K = [370, 371, 372, 373, 374, 375]
export const CHEERS = CHEER_K.map(beat)
/** The pose: a look each for the press. Derek's is on the off-beat after the meeting; Hansel's a bar on. */
export const DEREK_LOOK = half(380)
export const HANSEL_LOOK = half(384)

/* ------------------------------------------------------------------ paths */

/** A path being laid in show seconds, in the runway's frame. */
export class Path {
  segs: Seg[] = []
  constructor(public at: Pt, public t: number) {}
  /** Still until `t1`. */
  rest(t1: number): this {
    if (t1 > this.t + 1e-9) this.segs.push({ from: this.at, to: this.at, dur: t1 - this.t })
    this.t = Math.max(this.t, t1)
    return this
  }
  /** Straight to `to` by `t1`, linear unless told otherwise. */
  go(to: Pt, t1: number, extra: Partial<Seg> = {}): this {
    this.segs.push({ from: this.at, to, dur: Math.max(0, t1 - this.t), ...extra })
    this.at = to
    this.t = t1
    return this
  }
  /** A flight under `g` to `to`, landing at `t1`. */
  hop(to: Pt, t1: number, g = G): this {
    const T = t1 - this.t
    this.segs.push({ from: this.at, to, dur: T, arc: (g * T * T) / 8 })
    this.at = to
    this.t = t1
    return this
  }
  /** Rolling straight to `to` by `t1`, speed v0 to v1 through one middle speed (two even changes of pace). */
  roll(to: Pt, t1: number, v0: number, v1: number, f = 0.5): this {
    const T = t1 - this.t
    const D = Math.hypot(to[0] - this.at[0], to[1] - this.at[1])
    if (D < 1e-9) return this.rest(t1)
    const ta = T * f
    const tb = T - ta
    const vm = Math.max(0, (2 * D - v0 * ta - v1 * tb) / T)
    const d1 = ((v0 + vm) / 2) * ta
    const mid: Pt = [this.at[0] + ((to[0] - this.at[0]) * d1) / D, this.at[1] + ((to[1] - this.at[1]) * d1) / D]
    const seg = (a: Pt, b: Pt, dur: number, r0: number, r1: number): Seg => (r0 + r1 > 1e-6 ? { from: a, to: b, dur, ramp: [r0, r1] } : { from: a, to: b, dur })
    this.segs.push(seg(this.at, mid, ta, v0, vm), seg(mid, to, tb, vm, v1))
    this.at = to
    this.t = t1
    return this
  }
}

/* ------------------------------------------------------------------ Derek */

const ON = 0
const ON_FLOOR = FLOOR_Y - 0.13
/** His march's step, and where the stride takes over. */
const STEP = 0.22
/** Where he stops at the runway's end, and the edge he steps to. */
export const END_X = 19.6
export const EDGE_X = 19.72
/** The treads he lands on, going down (ball centres). */
export const TREADS: Pt[] = [
  [20.2, 0.5],
  [20.6, 1.0],
  [21.0, 1.5],
  [21.4, ON_FLOOR],
]
/** Where he rocks about, how far back he winds, and where the plug stops his lunge. */
export const ROCK_C = DEREK_PLAN.atPM.at[0]
const WIND_X = 21.84
export const FROZEN_X = 22.55

/** How far a swing of the rock goes (from the middle), growing, and harder on the breakdown's hard beats. */
function swing(i: number, s: number): number {
  const n = ROCK_K1 - ROCK_K0
  return (0.05 + 0.4 * Math.pow(i / n, 1.25)) * (0.72 + 0.28 * Math.min(1.2, s))
}
function derekPath(): Path {
  const P = new Path([-0.5, ON], B0)
  let x = -0.5
  /** A conditioned step: off dead on the beat, stopped dead on its off-beat. No ease. */
  const step = (k: number, to: number, y = ON) => {
    P.rest(beat(k))
    x = to
    P.go([x, y], half(k))
  }
  // Still in the wings until the title; then the march, a stiff step a beat, out through the curtain.
  for (let k = 233; k <= 238; k++) step(k, x + STEP)
  // "Don't do it": half a step back; a beat held.
  step(239, x - 0.2)
  for (let k = 241; k <= 254; k++) step(k, x + STEP)
  // The wash: a stride a beat, down the whole runway to its end.
  const x0 = x
  const n = 295 - 255 + 1
  for (let i = 0; i < n; i++) step(255 + i, x0 + ((END_X - x0) * (i + 1)) / n)
  // At the end he stops, and does not turn back: a quarter step to the edge, toward the Prime Minister.
  step(298, EDGE_X)
  // Down the steps, a tread every other beat: off on the beat, landing dead on its off-beat.
  DOWN.forEach((k, i) => {
    P.rest(beat(k))
    P.hop(TREADS[i], half(k))
  })
  x = TREADS[3][0]
  // Across to him, a step a bar.
  const dx = (ROCK_C - x) / ACROSS.length
  for (const k of ACROSS) step(k, x + dx, ON_FLOOR)
  x = ROCK_C
  // The rock: a swing a beat, bigger and bigger, forward and back; the last one (349) back.
  for (let k = ROCK_K0; k <= ROCK_K1; k++) {
    const i = k - ROCK_K0
    const dir = (ROCK_K1 - k) % 2 === 0 ? -1 : 1
    const s = beatAt(k)?.s ?? 0.5
    step(k, ROCK_C + dir * swing(i, s), ON_FLOOR)
  }
  // Wound back on 350, the lunge off its off-beat, and the plug stops it dead.
  step(350, WIND_X, ON_FLOOR)
  P.rest(LUNGE)
  P.go([FROZEN_X, ON_FLOOR], STOP)
  // Stock still through the silence and the look, until the band.
  P.rest(BAND)
  // Freed: his motion is his own again. He comes back off the Prime Minister, slowly, and later makes room for Hansel.
  P.go([22.44, ON_FLOOR], 188.45, { ease: 'inout' })
  P.rest(194.9)
  P.go([DEREK_MEET[0], DEREK_MEET[1]], 197.1, { ease: 'inout' })
  P.rest(B1)
  return P
}

export const DEREK_PATH = derekPath()
export const DEREK_LANE = { segs: DEREK_PATH.segs, fire: TRIGGER - B0 }
/** Derek at show time `t`. */
export function derekAt(t: number): Pt {
  const q = laneAt(DEREK_LANE, t - B0)
  return [q.x, q.y]
}
/** Derek's march and stride: every step's start (a beat) and stop (its off-beat), and the rock's swings. */
export function derekSteps(): number[] {
  const out: number[] = []
  for (let k = 233; k <= 298; k++) {
    if (k === 240 || (k >= 296 && k !== 298)) continue
    out.push(beat(k), half(k))
  }
  for (const k of DOWN) out.push(beat(k), half(k))
  for (const k of ACROSS) out.push(beat(k), half(k))
  for (let k = ROCK_K0; k <= ROCK_K1; k++) out.push(beat(k), half(k))
  out.push(WIND, LUNGE)
  return out
}

/* ------------------------------------------------------------------ Mugatu */

/** Where he throws from (the runway's end), where he backs into the canopy's upright, and the upright. */
export const THROW_X = 19.42
export const UPRIGHT_X = 17.5
export const CAUGHT_X = UPRIGHT_X + 0.12 + 0.13 + 0.02
/** The ladder down from his perch (its foot on the wings' platform). */
export const LADDER_X = -3.3

/**
 * Mugatu, in world-clock time (`W`): on his perch over the wings, leaning in when the song takes Derek and giving a
 * little shimmy of glee on the wash; down his ladder late in the last hook while the camera is on the front, and along
 * his runway to its end to watch the kill; stopped by the plug; then, in the silence, heavy and slow, to the edge, the
 * draw, the throw; held by the look mid-follow-through; lit by a flash, he backs away up the runway into the canopy's
 * upright, and the heap comes down on him.
 */
function mugatuPath(): Path {
  const [px, py] = MUGATU_PERCH
  const P = new Path([px, py], B0)
  P.rest(TRIGGER)
  P.go([px + 0.34, py], TRIGGER + 1.3, { ease: 'inout' })
  P.rest(beat(255))
  // Glee on the wash: a shimmy along his rail, settling.
  P.go([px + 0.56, py], beat(255) + 0.3, { ease: 'inout' })
  P.go([px + 0.22, py], beat(256) + 0.3, { ease: 'inout' })
  P.go([px + 0.4, py], beat(258) + 0.1, { ease: 'inout' })
  P.go([px + 0.34, py], beat(260), { ease: 'inout' })
  // Down, while the camera is on the front: to the ladder, down it, and along the runway at a glide.
  P.rest(161.2)
  P.go([LADDER_X, py], 162.6, { ease: 'inout' })
  P.go([LADDER_X, RUNWAY.top - 0.13], 164.0, { ease: 'inout' })
  P.roll([16.9, ON], 180.6, 0, 1.25, 0.08)
  P.roll([18.05, ON], 182.45, 1.25, 0, 1)
  // The plug: stopped. The silence: heavy and slow to the edge; the draw; the throw; a slow follow-through.
  P.rest(183.15)
  P.go([THROW_X - 0.16, ON], 184.42, { ease: 'inout' })
  P.go([THROW_X - 0.3, ON], THROW - 0.02, { ease: 'out' })
  P.go([THROW_X, ON], THROW + 0.14, { ease: 'out' })
  // The follow-through goes on into the look, which holds it (the world clock stops), and ends after.
  P.go([THROW_X + 0.1, ON], w(BAND + 0.45), { ease: 'out' })
  // Lit by the press on the groove, he backs away up the runway, faster, into the upright: a knock, and a little
  // rebound off it.
  P.rest(w(BACKS + 0.02))
  P.go([CAUGHT_X, ON], w(BUMP), { ease: 'in' })
  P.go([CAUGHT_X + 0.07, ON], w(BUMP) + 0.3, { ease: 'out' })
  P.rest(w(B1) + 1)
  return P
}
const MUGATU_LANE = { segs: mugatuPath().segs, fire: 0 }
/** Mugatu at show time `t` (his clock is the world's). */
export function mugatuAt(t: number): Pt {
  const q = laneAt(MUGATU_LANE, W(t) - B0)
  return [q.x, q.y]
}

/* ------------------------------------------------------------------ the Prime Minister */

/** He sits; he rises (a hop out of his seat and back into it, standing: a big one), and cheers, a bounce a beat. */
export function pmAt(t: number): Pt {
  const [x, y] = PM_SEAT
  // A small start at the plug, and at the star's stop (he flinches back into his seat).
  const flinch = 0.05 * Math.exp(-Math.max(0, W(t) - STOP) / 0.3) * (t > STOP ? 1 : 0) + 0.04 * smooth(W(t), MAGNUM - 0.3, MAGNUM) * Math.exp(-Math.max(0, W(t) - MAGNUM) / 0.8)
  let lift = 0
  const hopAt = (t0: number, t1: number): number => {
    if (t < t0 || t > t1) return 0
    const u = (t - t0) / (t1 - t0)
    const T = t1 - t0
    return ((G * T * T) / 2) * u * (1 - u)
  }
  lift += hopAt(RISES, beat(369))
  for (const k of CHEER_K) lift += hopAt(beat(k), half(k))
  return [x + flinch, y - lift]
}

/* ------------------------------------------------------------------ the star */

/** Where the look stops it: a hand's width from his face, at his height, a point at him. */
export const STAR_STOP: Pt = [FROZEN_X - 0.68, 1.76]
/** Where it sticks in the boards, point first (its centre), and its size (a point's reach: 0.34 across). */
export const STAR_R = 0.17
export const STAR_STUCK: Pt = [STAR_STOP[0] - 0.02, FLOOR_Y + 0.05 - STAR_R]
/** The fall starts from rest at `DROP`, so that it lands on the groove. */
export const DROP = STICK - Math.sqrt((2 * (STAR_STUCK[1] - STAR_STOP[1])) / G)

export interface StarState {
  at: Pt
  angle: number
  /** 0 hidden, 1 shown. */
  show: number
  /** Held in Mugatu's hand. */
  held: boolean
  /** Stuck in the boards: its quiver. */
  stuck: boolean
}
/** Where it leaves his hand, relative to his centre. */
const HAND: Pt = [0.16, -0.12]
/** Where it leaves his hand: exactly where it was in it. */
let START: Pt | null = null
const startOf = (): Pt => {
  if (!START) {
    const m = mugatuAt(THROW)
    START = [m[0] + HAND[0], m[1] + HAND[1]]
  }
  return START
}
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))
/** The throwing star at show time `t`. */
export function starAt(t: number): StarState {
  if (t < DRAW_STAR) return { at: [0, 0], angle: 0, show: 0, held: false, stuck: false }
  if (t < THROW) {
    // Drawn from his sleeve, held back behind him for the throw, turning slowly in his fingers.
    const m = mugatuAt(t)
    const u = ease((t - DRAW_STAR) / (THROW - DRAW_STAR))
    const off: Pt = [-0.17 + 0.33 * Math.pow(Math.max(0, (t - (THROW - 0.12)) / 0.12), 2), -0.16 + 0.04 * u]
    return { at: [m[0] + off[0], m[1] + off[1]], angle: 0.4 + 1.2 * u, show: smooth(t, DRAW_STAR, DRAW_STAR + 0.2), held: true, stuck: false }
  }
  const start = startOf()
  if (t < MAGNUM) {
    // Its flight, in the ringing silence: slow, a little sag, spinning (slowing), and still coming when the look
    // stops it dead, a point at his face.
    const T = MAGNUM - THROW
    const u = (t - THROW) / T
    const s = u * (1.25 - 0.25 * u)
    const sag = 0.12 * 4 * s * (1 - s)
    const x = start[0] + (STAR_STOP[0] - start[0]) * s
    const y = start[1] + (STAR_STOP[1] - start[1]) * s - sag
    return { at: [x, y], angle: spinAt(t), show: 1, held: false, stuck: false }
  }
  // Held by the look, a point at him and a point down; let go on the band, it shivers, and drops into the boards.
  if (t < DROP) {
    const u = t - BAND
    const shiver = u > 0 ? 0.12 * Math.exp(-u / 0.12) * Math.sin(u * 45) : 0
    return { at: STAR_STOP, angle: SPIN_END + shiver, show: 1, held: false, stuck: false }
  }
  if (t < STICK) {
    const u = t - DROP
    const T = STICK - DROP
    const y = STAR_STOP[1] + 0.5 * G * u * u
    const x = STAR_STOP[0] + (STAR_STUCK[0] - STAR_STOP[0]) * (u / T)
    return { at: [x, Math.min(y, STAR_STUCK[1])], angle: SPIN_END, show: 1, held: false, stuck: false }
  }
  const q = t - STICK
  const quiver = 0.16 * Math.exp(-q / 0.22) * Math.sin(q * 70)
  return { at: STAR_STUCK, angle: SPIN_END + quiver, show: 1, held: false, stuck: true }
}

/** The star's spin in flight: fast off his hand and slowing, landing on a whole quarter turn (a point at him). */
const spinRaw = (t: number) => 1.6 + 15 * (t - THROW) - 2.6 * (t - THROW) * (t - THROW)
const SPIN_END = Math.round(spinRaw(MAGNUM) / (Math.PI / 2)) * (Math.PI / 2)
function spinAt(t: number): number {
  const u = (t - THROW) / (MAGNUM - THROW)
  return spinRaw(t) + (SPIN_END - spinRaw(MAGNUM)) * u
}
/** How fast it is going at `t` (cells a second), for its streak. */
export function starSpeed(t: number): number {
  if (t < THROW || t >= MAGNUM) return 0
  const a = starAt(t).at
  const b = starAt(Math.min(MAGNUM - 1e-4, t + 0.02)).at
  return Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.02
}

/* ------------------------------------------------------------------ the canopy's heap */

/** The canopy over the runway's end: two uprights and a crossbar (the pose's arch). */
export const CANOPY = { x0: UPRIGHT_X, x1: 20.05, top: -4.35 }
/**
 * The swag over it, up in the dark under the roof: a batten, and a net of bin bags slung under it, set dressing; its
 * release line comes down to a cleat on the canopy's left upright. `x` its middle, `w` its half-width, `bottom` the
 * net's lowest point, `top` the batten.
 */
export const HEAP = { x: 17.95, w: 1.15, bottom: -5.45, top: -6.3 }
/** When it lets go (after the hitch has slipped and the line run), from how far down the lurch has taken it. */
const LURCH = 0.14
export const LET_GO = LANDS - Math.sqrt((2 * (-0.13 - (HEAP.bottom + LURCH))) / G)

export interface HeapState {
  /** How far it has come down (cells), 0 hanging. */
  drop: number
  /** 0 hanging, 1 flattened into a lump. */
  squash: number
  /** Sway and jiggle, cells. */
  sway: number
  /** The line: how much has run (0 tied off, 1 run out). */
  run: number
  /** How much the upright has been knocked (its shiver, radians). */
  knock: number
}
export function heapAt(t: number): HeapState {
  const tw = AIR(t)
  const sway = 0.02 * Math.sin(tw * 0.9) + 0.012 * Math.sin(tw * 2.3 + 1)
  const hit = t - BUMP
  const knockA = hit > 0 ? 0.05 * Math.exp(-hit / 0.25) * Math.sin(hit * 34) : 0
  if (t < BUMP) return { drop: 0, squash: 0, sway, run: 0, knock: 0 }
  if (t < LET_GO) {
    // The hitch slips: a lurch and a jiggle.
    const u = (t - BUMP) / (LET_GO - BUMP)
    const lurch = LURCH * ease(Math.min(1, u * 2.2))
    return { drop: lurch, squash: 0, sway: sway + 0.03 * Math.sin(u * 20) * (1 - u), run: 0.12 * u, knock: knockA }
  }
  if (t < LANDS) {
    const u = t - LET_GO
    return { drop: LURCH + 0.5 * G * u * u, squash: 0, sway: sway * 0.5, run: 0.12 + 0.88 * ease(u / (LANDS - LET_GO)), knock: knockA }
  }
  // Landed on him: flattened over him, in a lump, with the struggle in it.
  const s = t - LANDS
  const squash = Math.min(1, s / 0.1)
  let jig = 0.05 * Math.exp(-s / 0.18) * Math.sin(s * 30)
  for (const at of STRUGGLE) {
    const v = t - at
    if (v > 0 && v < 1) jig += 0.035 * Math.exp(-v / 0.16) * Math.sin(v * 26)
  }
  return { drop: -0.13 - HEAP.bottom, squash, sway: jig, run: 1, knock: knockA }
}

/* ------------------------------------------------------------------ the curtain, the lights */

/** How far the curtain of bags is hoisted, 0 down .. 1 up: three jerks on the beat, like his steps. */
export function hoistAt(t: number): number {
  let v = 0
  for (const at of HOIST) {
    const u = t - at
    if (u <= 0) continue
    v += (Math.min(1, u / 0.16) + 0.06 * Math.exp(-u / 0.12) * Math.sin(u * 30) * (u > 0.16 ? 1 : 0)) / HOIST.length
  }
  return Math.max(0, Math.min(1.02, v))
}

/** How bright bank `i` is: off, a flare as it strikes on, then steady. */
export function bankAt(i: number, t: number): number {
  const u = t - BANKS_ON[i]
  if (u < 0) return 0
  return (1 + 0.9 * Math.exp(-u / 0.14)) * powerAt(t)
}
/** The house lights (the crowd's wash), down over the needle's first beat. */
export const houseAt = (t: number): number => 1 - 0.75 * smooth(t, HOUSE_DOWN, HOUSE_DOWN + 1.2)
/** The follow spot: on as he comes out; where it is aimed (smoothed behind him, as a hand on a spot would be). */
export function followAt(t: number): { on: number; at: Pt } {
  const on = t < FOLLOW_ON ? 0 : (1 + 0.8 * Math.exp(-(t - FOLLOW_ON) / 0.15)) * powerAt(t)
  let x = 0
  let y = 0
  let sum = 0
  for (let j = 0; j <= 8; j++) {
    const q = derekAt(Math.max(FOLLOW_ON, t - j * 0.05))
    const wgt = 1 - j / 10
    x += q[0] * wgt
    y += q[1] * wgt
    sum += wgt
  }
  return { on, at: [x / sum, y / sum] }
}

/** Derek's position when the look happens, for the glint. */
export const LOOK_AT = (): Pt => derekAt(MAGNUM)
export { STOP, SPLASH, BAND, MAGNUM, ON_FLOOR }
