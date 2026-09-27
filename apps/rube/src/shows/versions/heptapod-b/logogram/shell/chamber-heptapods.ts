import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { drawHeptapod, drawLogogram, drawSpray, heptapodTip, type HeptapodOpts } from '../cast'
import { pulse } from '../music'
import { SHELL } from '../worlds'
import { ABBOTT_SEEN, CLOSE, COSTELLO_SEEN, INK_IN, OPENS, OUT, PALM, REACH, REACH_OFF, SPRAY, SURGES, X_PALM } from './chamber-path'

/**
 * Abbott and Costello behind the glass: how they come out of the white on their limbs, each tip set down on a pulse;
 * Abbott's front limb reaching for the glass and opening into a palm on it; Costello's limb writing the first
 * logogram. All of it a function of show time, in the chamber part's frame.
 *
 * Walking: each heptapod's body glides along its approach (from deep in the fog, off to the right, to its place close
 * behind the glass), growing and sinking on the screen as it comes nearer, and dips a little as each foot takes its
 * weight. Its seven tips stay where they were set down until their turn comes: then the tip lifts slowly, swings to
 * where the body will want it and drops, heavily, landing on its pulse. The drawing is `drawHeptapod` with `tips`.
 */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const sm01 = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const lerpPt = (a: Pt, b: Pt, u: number): Pt => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]

/** A curve through knots, smooth between each pair and flat on each (a value that settles at every knot). */
function knots(ks: [number, number][]): (t: number) => number {
  return (t) => {
    if (t <= ks[0][0]) return ks[0][1]
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i][0]) return lerp(ks[i - 1][1], ks[i][1], sm01((t - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])))
    }
    return ks[ks.length - 1][1]
  }
}

/**
 * How deep in the fog a heptapod is: a shadow (`before`) that darkens a little on each unseen footfall (`hints`) and
 * recovers; on `seen` (a hard pulse) it comes out of the white: more than half the way at once, on the pulse, and the
 * rest slowly, onto `after`.
 */
/** How much an unseen footfall darkens its shadow in the fog. */
const HINT = 0.07

function emerge(seen: number, hints: number[], before: [number, number][], after: [number, number][]): (t: number) => number {
  const pre = knots(before)
  const post = knots(after)
  return (t) => {
    let f = pre(t)
    if (t > seen) {
      const a = t - seen
      f += (post(t) - f) * (0.55 * (1 - Math.exp(-a / 0.07)) + 0.45 * (1 - Math.exp(-a / 0.9)))
    }
    for (const h of hints) {
      const a = t - h
      if (a > 0 && a < 4) f -= HINT * (1 - Math.exp(-a / 0.08)) * Math.exp(-a / 0.9)
    }
    return clamp01(f)
  }
}

/* ------------------------------------------------------------------ where they stand */

/** Abbott stands over the palm, a little to its right; Costello behind and to the right, paler, a little smaller. */
export const ABBOTT_AT: Pt = [X_PALM + 0.6, -1.1]
export const ABBOTT_H = 13.5
export const COSTELLO_AT: Pt = [X_PALM + 12.6, -1.8]
export const COSTELLO_H = 12.2

/** One step: which limb, landing on which pulse, and whether it is seen (a strike). */
interface Step {
  limb: number
  at: number
  seen: boolean
}

interface Walker {
  who: 0 | 1
  /** Near place and height, and far (deep in the fog, where it comes from). */
  near: Pt
  far: Pt
  h: number
  hFar: number
  /** The approach: 0 far .. 1 near, by show time. */
  a: (t: number) => number
  /** Where the body is after the approach (a small shift, for Costello turning to write). */
  shift: (t: number) => Pt
  fog: (t: number) => number
  steps: Step[]
}

const step = (limb: number, k: number, seen: boolean): Step => ({ limb, at: pulse(k), seen })

const ABBOTT: Walker = {
  who: 0,
  near: ABBOTT_AT,
  far: [ABBOTT_AT[0] + 3.6, -3.7],
  h: ABBOTT_H,
  hFar: ABBOTT_H * 0.72,
  a: (t) => sm01((t - 89.6) / (101.0 - 89.6)),
  shift: () => [0, 0],
  // Unseen until the first hard footfalls, a shadow in the white darkening on each, then resolving on 97.239 and
  // coming close.
  fog: emerge(ABBOTT_SEEN, [pulse(394), pulse(402), pulse(406)], [[89.4, 1], [91.6, 0.955], [94.0, 0.905], [96.0, 0.865], [97.1, 0.83], [ABBOTT_SEEN, 0.82]], [[ABBOTT_SEEN, 0.58], [99.7, 0.4], [101.6, 0.28], [104.5, 0.22]]),
  steps: [
    // Deep in the fog, unseen.
    step(3, 383, false), step(1, 385, false), step(5, 387, false), step(0, 389, false), step(6, 391, false), step(2, 392, false), step(4, 393, false),
    // The hard run: shadows first, then the first sight (97.239), each tip on a hard pulse.
    step(3, 394, true), step(1, 402, true), step(5, 406, true), step(4, 407, true), step(2, 408, true), step(6, 411, true), step(0, 413, true),
    // The last few, setting itself close behind the glass.
    step(3, 417, true), step(5, 419, true), step(1, 422, true),
  ],
}

const COSTELLO: Walker = {
  who: 1,
  near: COSTELLO_AT,
  far: [COSTELLO_AT[0] + 4.2, -4.1],
  h: COSTELLO_H,
  hFar: COSTELLO_H * 0.72,
  a: (t) => sm01((t - 96.4) / (102.9 - 96.4)),
  // It turns a little toward the palm before it writes.
  shift: (t) => [-0.7 * sm01((t - 112.6) / 4.2), 0.08 * sm01((t - 112.6) / 4.2)],
  fog: emerge(COSTELLO_SEEN, [pulse(418), pulse(420)], [[97, 1], [99.6, 0.975], [101.0, 0.955], [COSTELLO_SEEN, 0.94]], [[COSTELLO_SEEN, 0.64], [103.6, 0.44], [105.8, 0.35]]),
  steps: [
    step(3, 405, false), step(1, 409, false), step(5, 410, false), step(0, 412, false), step(6, 414, false), step(2, 415, false), step(4, 416, false),
    // Answering Abbott's last steps, then the first sight (101.303) and a ripple of footfalls.
    step(3, 418, true), step(5, 420, true), step(1, 424, true), step(4, 425, true), step(0, 426, true), step(6, 427, true), step(2, 428, true),
    // Settling (107.503), and a foot moved as it turns to write (115.368).
    step(3, 450, true), step(5, 483, true),
  ],
}

export const WALKERS = [ABBOTT, COSTELLO] as const

/** Seconds a tip is in the air, and how high it lifts (a share of the height). */
const SWING = 0.95
const LIFT = 0.075
/** How far ahead of the body a foot is set down: where the body will be this much later. */
const LEAD = 0.6

/** The body's origin and height at `t`, before the dips of its footfalls. */
function bodyOf(w: Walker, t: number): { at: Pt; h: number } {
  const a = w.a(t)
  const s = w.shift(t)
  // Nearer, it comes down the screen faster at the end (perspective), and grows.
  const e = 1 - (1 - a) * (1 - a) * 0.4 - 0.6 * (1 - a)
  const at = lerpPt(w.far, w.near, clamp01(e))
  return { at: [at[0] + s[0], at[1] + s[1]], h: lerp(w.hFar, w.h, a) }
}

/** Heptapod `j`'s body at `t` (origin on its fog floor, and height), for what is drawn round it: its shadow in the fog. */
export const bodyAt = (j: 0 | 1, t: number): { at: Pt; h: number } => bodyOf(WALKERS[j], t)

/** Where limb `i`'s foot rests for a body at `t` (world cells). */
function restOf(w: Walker, i: number, t: number): Pt {
  const b = bodyOf(w, t)
  const rel = heptapodTip({ t, h: b.h, who: w.who }, i)
  return [b.at[0] + rel[0], b.at[1] + rel[1]]
}

interface Plant {
  at: number
  p: Pt
  seen: boolean
}
/** Every limb's footholds in order: where it stood first, then where each step set it down. */
function plantsOf(w: Walker): Plant[][] {
  const out: Plant[][] = []
  for (let i = 0; i < 7; i++) {
    const list: Plant[] = [{ at: -Infinity, p: restOf(w, i, 80), seen: false }]
    for (const s of w.steps.filter((q) => q.limb === i).sort((a, b) => a.at - b.at)) list.push({ at: s.at, p: restOf(w, i, s.at + LEAD), seen: s.seen })
    out.push(list)
  }
  return out
}
const PLANTS = WALKERS.map(plantsOf)

/** Every seen footfall, for the puffs and the strikes: when, where, and whose. */
export const FOOTFALLS: { at: number; p: Pt; who: 0 | 1 }[] = [
  ...WALKERS.flatMap((w, j) => PLANTS[j].flatMap((list) => list.filter((q) => q.seen).map((q) => ({ at: q.at, p: q.p, who: w.who })))),
  // Abbott's front limb pulling up out of the fog floor to reach: the fog stirs where it stood.
  { at: REACH_OFF, p: PLANTS[0][3][PLANTS[0][3].length - 1].p, who: 0 as const },
].sort((a, b) => a.at - b.at)

/** Limb `i`'s tip at `t`, world cells: planted, or swinging from one foothold to the next (landing on its pulse). */
function tipOf(j: number, i: number, t: number): Pt {
  const list = PLANTS[j][i]
  const h = WALKERS[j].h
  let n = 0
  while (n + 1 < list.length && list[n + 1].at <= t) n++
  const next = list[n + 1]
  if (!next || t < next.at - SWING) return list[n].p
  const u = clamp01((t - (next.at - SWING)) / SWING)
  // Across first (done by 0.8 of the swing), then down: slow to lift, heavy to land.
  const across = sm01(u / 0.8)
  const up = u < 0.5 ? sm01(u / 0.5) : 1 - ((u - 0.5) / 0.5) ** 2
  const from = list[n].p
  const [x, y] = lerpPt(from, next.p, across)
  return [x, y - LIFT * h * up]
}

/** The body's dip as each foot takes its weight: quick down, long and damped back. */
function dipOf(j: number, t: number): number {
  let d = 0
  for (const s of WALKERS[j].steps) {
    const a = t - s.at
    if (a < 0 || a > 3) continue
    d += 0.016 * WALKERS[j].h * (1 - Math.exp(-a / 0.07)) * Math.exp(-a / 0.55)
  }
  return d
}

/* ------------------------------------------------------------------ Abbott's reach, Costello's writing */

/** Where the palm presses on the glass: right over her, its lowest fingers either side of her. */
export const PALM_AT: Pt = [X_PALM, -1.42]

/** Abbott's front limb from its foothold up out of the fog and down to the glass, arriving on PALM. */
function reachTip(t: number, from: Pt): Pt {
  const u = clamp01((t - REACH_OFF) / (PALM - REACH_OFF))
  // Slow to leave the fog floor, slow to come to the glass: a long gesture.
  const e = u < 0.5 ? 2 * u * u * (1.5 - u) : 1 - 2 * (1 - u) * (1 - u) * (0.5 + u)
  // Up off the fog floor a little, and over, and down onto the glass by her: never back up into its body.
  const c1: Pt = [from[0] + 0.1, from[1] - 2.1]
  const c2: Pt = [PALM_AT[0] + 0.9, PALM_AT[1] - 1.4]
  const v = clamp01(e)
  const a = (1 - v) ** 3
  const b = 3 * v * (1 - v) ** 2
  const c = 3 * v * v * (1 - v)
  const d = v ** 3
  const x = a * from[0] + b * c1[0] + c * c2[0] + d * PALM_AT[0]
  const y = a * from[1] + b * c1[1] + c * c2[1] + d * PALM_AT[1]
  // On the glass it presses a touch nearer (a settle of the palm), no more.
  return [x, y]
}

/** How open the palm is: closed until it nears, its fingers opening, flat on the glass on PALM. */
function palmOpen(t: number): number {
  if (t < OPENS) return 0
  // The tip blooms open on OPENS, quickly at first, then slowly as it comes to the glass.
  const opening = 0.78 * (1 - Math.exp(-(t - OPENS) / 0.28))
  if (t < PALM) return opening
  // On the glass: the fingers press out flat, a little past and back.
  const a = t - PALM
  const at = 0.78 * (1 - Math.exp(-(PALM - OPENS) / 0.28))
  return at + (1 - at) * (1 - Math.exp(-a / 0.09)) + 0.04 * Math.exp(-a / 0.6) * (1 - Math.exp(-a / 0.09))
}

/**
 * The ring: where it hangs, its size, which sentence. The first logogram is the thing the fullest voices are for: it
 * hangs in the middle of the glass beside the palm, larger than the palm by far, clear of it, and whole in the frame
 * from its closing to the white.
 */
export const RING_AT: Pt = [X_PALM + 4.35, -3.15]
export const RING_R = 2.6
const RING_SEED = 1014
/** Where Costello's limb holds its tip to write, and when it goes up. */
const WRITE_AT: Pt = [X_PALM + 8.3, -5.3]
const WRITE_UP = pulse(502)
/** The ring's slow turn. */
const spinAt = (t: number) => 0.05 * (t - INK_IN)
/** Where the ink comes into the ring: the side toward the limb. Its two ends meet on the far side. */
const ARRIVE = Math.atan2(WRITE_AT[1] - RING_AT[1], WRITE_AT[0] - RING_AT[0])
const MEET = ARRIVE + Math.PI

/** The inverse of the smoothstep `drawLogogram` puts the ring through (its `form / 0.7`). */
const unSmooth = (y: number) => 0.5 - Math.sin(Math.asin(1 - 2 * clamp01(y)) / 3)

/**
 * How much of the ring is written, 0 .. 1 of the way round: a blot where the ink comes in, a push round on each of
 * the two surges, and a steady spread between, so that the two ends run into each other (not creeping up on it) and
 * meet on CLOSE.
 */
function arcAt(t: number): number {
  if (t < INK_IN) return 0
  if (t >= CLOSE) return 1
  let r = 0.16 * (1 - Math.exp(-(t - INK_IN) / 0.25))
  for (const s of SURGES) if (t > s) r += 0.16 * (1 - Math.exp(-(t - s) / 0.35))
  const tails = 0.16 * (1 - Math.exp(-(CLOSE - INK_IN) / 0.25)) + SURGES.reduce((a, s) => a + 0.16 * (1 - Math.exp(-(CLOSE - s) / 0.35)), 0)
  return Math.min(1, r + (1 - tails) * ((t - INK_IN) / (CLOSE - INK_IN)))
}

/**
 * How far the ring has formed, as `drawLogogram` reads it: the arc to CLOSE (0.7, whole); then its tendrils, put out
 * on REACH and reaching on with the swell until the light takes it.
 */
export function ringForm(t: number): number {
  if (t < INK_IN) return 0
  if (t < CLOSE) return 0.7 * unSmooth(arcAt(t))
  let f = 0.7
  if (t > REACH) f += 0.1 * (1 - Math.exp(-(t - REACH) / 0.3)) + 0.2 * sm01((t - REACH) / (OUT - 0.4 - REACH))
  return Math.min(1, f)
}

/**
 * The ring's size at `t`: RING_R until it closes, then swelling with the voices, slowly and then faster, a tenth
 * larger by the loudest moment (the white takes it at its largest).
 */
export function ringR(t: number): number {
  const u = clamp01((t - CLOSE) / (OUT - CLOSE))
  return RING_R * (1 + 0.09 * u * u)
}

/** Where the two ends meet the ink pools: a blot that lands on CLOSE and settles. */
function meetMark(t: number): { a: number; size: number; width: number; grow: number }[] {
  if (t <= CLOSE) return []
  const a = t - CLOSE
  const grow = (1 - Math.exp(-a / 0.07)) * (1 + 0.35 * Math.exp(-a / 0.5))
  return [{ a: MEET, size: 0.07, width: 0.22, grow }]
}

/**
 * While the ring is written the fog thickens round the two of them and they sink back into it, so the ink is the
 * one dark thing on the glass: the limbs they stand on go furthest (Abbott's arch right through the ring), Costello
 * behind a little, and Abbott's palm and Costello's pen stay out of it (their `reachFog`). Shares of the way to white.
 */
const RECEDE = { body: [0, 0.55], limbs: [0.82, 0.85] } as const
const receding = (t: number) => sm01((t - INK_IN) / (CLOSE - INK_IN))

/* ------------------------------------------------------------------ drawing */

export interface Seen {
  /** The colour of the fog they are in (the glass's light). */
  air: string
  /** 0 .. 1: how much the light washing to white takes them (the end). */
  wash: number
}

/** A heptapod's options at `t`: body, fog, the tips of its limbs (and for Abbott the reach, for Costello the writing). */
export function heptapodAt(j: 0 | 1, t: number, seen: Seen): { o: HeptapodOpts; at: Pt } {
  const w = WALKERS[j]
  const b = bodyOf(w, t)
  const at: Pt = [b.at[0], b.at[1] + dipOf(j, t)]
  const tips: Pt[] = []
  for (let i = 0; i < 7; i++) {
    const p = tipOf(j, i, t)
    tips.push([p[0] - at[0], p[1] - at[1]])
  }
  const back = receding(t)
  const deep = w.fog(t) + (1 - w.fog(t)) * RECEDE.body[j] * back
  const fog = Math.min(1, deep + (1 - deep) * 0.6 * seen.wash)
  const limbFog = back > 0 ? fog + (1 - fog) * RECEDE.limbs[j] * back : undefined
  const o: HeptapodOpts = { t, h: b.h, who: w.who, fog, air: seen.air, color: SHELL.heptapod, tips, limbFog }
  if (j === 0) {
    // Abbott: the front limb's reach, and its lean toward her as it comes down.
    if (t > REACH_OFF) {
      const from = PLANTS[0][3][PLANTS[0][3].length - 1].p
      const tip = reachTip(t, from)
      const rel: Pt = [tip[0] - at[0], tip[1] - at[1]]
      tips[3] = rel
      const u = clamp01((t - REACH_OFF) / (PALM - REACH_OFF))
      // Never quite straight: it keeps a little of the arch the others have.
      o.reach = { limb: 3, to: rel, u: 0.64 * sm01(u / 0.9) }
      o.palm = palmOpen(t)
      // Out of the fog toward the glass: the reaching limb darkens as it comes, the palm on the glass darkest.
      o.reachFog = 0.05
      o.lean = -0.05 * sm01((t - REACH_OFF) / 6)
    }
  } else if (t > WRITE_UP) {
    // Costello: a limb up to write, held there while the ring blooms, drifting a little.
    const from = PLANTS[1][1][PLANTS[1][1].length - 1].p
    const u = clamp01((t - WRITE_UP) / (SPRAY - 0.1 - WRITE_UP))
    const e = sm01(u)
    const lift = Math.sin(Math.PI * e) * 1.4
    const hold: Pt = [WRITE_AT[0] + 0.12 * Math.sin(t * 0.7), WRITE_AT[1] + 0.1 * Math.sin(t * 0.53 + 1)]
    // The limb gives a little on the spray, as ink leaves it.
    const kick = t > SPRAY ? 0.18 * (1 - Math.exp(-(t - SPRAY) / 0.05)) * Math.exp(-(t - SPRAY) / 0.6) : 0
    const tip: Pt = [lerp(from[0], hold[0], e) + kick, lerp(from[1], hold[1], e) - lift + kick * 0.5]
    const rel: Pt = [tip[0] - at[0], tip[1] - at[1]]
    tips[1] = rel
    o.reach = { limb: 1, to: rel, u: 0.9 * e }
    // Its tip opens as it comes to write, and the ink leaves it; it stays half open while the ring blooms.
    o.palm = 0.5 * sm01((t - (SPRAY - 0.75)) / 0.6) - 0.15 * sm01((t - INK_IN) / 5)
    o.reachFog = 0.12
    o.lean = -0.035 * sm01((t - 112.6) / 5)
  }
  return { o, at }
}

/** The world position of a heptapod's limb tip, as drawn. */
export function tipWorld(j: 0 | 1, i: number, t: number, seen: Seen): Pt {
  const { o, at } = heptapodAt(j, t, seen)
  const rel = heptapodTip(o, i)
  return [at[0] + rel[0], at[1] + rel[1]]
}

export function drawWalker(p: p5, k: number, j: 0 | 1, t: number, seen: Seen): void {
  const { o, at } = heptapodAt(j, t, seen)
  if (o.fog !== undefined && o.fog >= 0.995) return
  p.push()
  p.translate(at[0] * k, at[1] * k)
  drawHeptapod(p, k, o)
  p.pop()
}

/** The first logogram: Costello's spray, then the ring blooming beside the palm. */
export function drawInk(p: p5, k: number, t: number, seen: Seen): void {
  if (t < SPRAY - 0.05 || t > OUT + 2) return
  const ink = mixHex(SHELL.ink, seen.air, 0.08 + 0.5 * seen.wash)
  if (t < INK_IN + 0.5) {
    const from = tipWorld(1, 1, t, seen)
    const to: Pt = [RING_AT[0] + Math.cos(ARRIVE) * RING_R, RING_AT[1] + Math.sin(ARRIVE) * RING_R]
    drawSpray(p, k, from, to, (t - SPRAY) / (INK_IN - SPRAY), ink, 1.4)
  }
  const form = ringForm(t)
  if (form <= 0) return
  const spin = spinAt(t)
  p.push()
  p.translate(RING_AT[0] * k, RING_AT[1] * k)
  drawLogogram(p, k, { r: ringR(t), seed: RING_SEED, t, form, start: ARRIVE, spin, color: ink, marks: meetMark(t) })
  p.pop()
}
