import type { Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { rising, shade, sway } from '../depth'
import { ctxOf, ellipse, line, mix, shape, type Pen } from '../pen'
import { at } from '../music'
import { CURTAIN, FLOOR, T0 } from './geo'

/**
 * The maternity floor's people, 1952, in the nurse's flat hand: the life of the corridor round the two of them, kept
 * out of their way. Another father comes to the far end of the nursery's glass, his back to us and his hat on, and
 * looks for his own; he taps, points, waves back at the nurse's wave (which was for Marty), takes his hat off, puts an
 * unlit cigar in his mouth and goes. A father who has been up all night comes out of the ward, sits on the bench
 * under the corridor's window and is asleep under his hat before the sun is up. As the credits come an orderly backs
 * through the far door with his mop and bucket and works the checkerboard, the wet tiles darker behind him; a doctor
 * comes out of the ward reading a chart; a nurse goes in to Rachel's bed and reads hers.
 *
 * A person is a handful of joints (`Side` in profile, `Square` from behind or in front) and is drawn from them: the
 * far leg and arm, the body, the head and hat, the near leg and arm.
 */

/* ------------------------------------------------------------------ what they wear */

interface Dress {
  coat: string
  shade: string
  legs: string
  shoes: string
  skin: string
  hair: string
  hat?: string
  band?: string
  /** A coat to the knee. */
  long?: boolean
}

const PROUD: Dress = { coat: '#9C7B57', shade: '#7D6043', legs: '#55524C', shoes: '#2E2925', skin: '#E2B492', hair: '#3B2D24', hat: '#5F554B', band: '#2D2824', long: true }
const SLEEPY: Dress = { coat: '#69707A', shade: '#535962', legs: '#5C626B', shoes: '#2B2724', skin: '#DDAE8E', hair: '#2E2620', hat: '#4B433C', band: '#262220' }
const ORDERLY: Dress = { coat: '#E9EDE6', shade: '#C4CDC5', legs: '#DCE2DB', shoes: '#3A3633', skin: '#C99474', hair: '#2A221D' }
const DOCTOR: Dress = { coat: '#F3F3EE', shade: '#CFD3CC', legs: '#3F434A', shoes: '#26231F', skin: '#E4B898', hair: '#8C8278', long: true }
const SISTER: Dress = { coat: '#FBFBF6', shade: '#D6DAD3', legs: '#EDEAE2', shoes: '#F3F1EA', skin: '#E2B693', hair: '#6A4A34', long: true }

/* ------------------------------------------------------------------ drawing */

function limb(pen: Pen, a: Pt, b: Pt, width: number, col: string): void {
  const { p, k } = pen
  p.stroke(pen.tone(col))
  p.strokeWeight(width * k)
  p.strokeCap(p.ROUND)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}
const add = (a: Pt, b: Pt, u = 1): Pt => [a[0] + b[0] * u, a[1] + b[1] * u]
const lerp = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

/** A fedora on a head at `c` (its crown's middle), turned by `rot`, `s` the person's size. */
function fedora(pen: Pen, d: Dress, c: Pt, rot: number, s: number, front: boolean): void {
  if (!d.hat) return
  const cs = Math.cos(rot)
  const sn = Math.sin(rot)
  const P = (x: number, y: number): Pt => [c[0] + (x * cs - y * sn) * s, c[1] + (x * sn + y * cs) * s]
  const bw = front ? 0.27 : 0.25
  shape(pen, [P(-bw, 0.01), P(-bw + 0.04, -0.035), P(bw - 0.04, -0.035), P(bw, 0.01), P(bw - 0.05, 0.04), P(-bw + 0.05, 0.04)], d.hat)
  shape(pen, [P(-0.15, -0.02), P(0.15, -0.02), P(0.12, -0.17), P(0.03, -0.15), P(-0.03, -0.19), P(-0.12, -0.17)], d.hat)
  shape(pen, [P(-0.15, -0.02), P(0.15, -0.02), P(0.145, -0.065), P(-0.145, -0.065)], d.band ?? d.shade)
}

/** A person in profile, facing `face`: joints in cells, the far limb first. */
interface Side {
  s: number
  face: 1 | -1
  hip: Pt
  neck: Pt
  head: Pt
  knees: [Pt, Pt]
  feet: [Pt, Pt]
  elbows: [Pt, Pt]
  hands: [Pt, Pt]
  /** The hat on the head (true), off (false). */
  hat: boolean
  /** Eyes open (1) or lowered to what is in the hands (0). */
  eyes?: number
}

function sideLeg(pen: Pen, d: Dress, q: Side, i: 0 | 1, col: string): void {
  const s = q.s
  limb(pen, q.hip, q.knees[i], 0.16 * s, col)
  limb(pen, q.knees[i], q.feet[i], 0.13 * s, col)
  const f = q.feet[i]
  shape(pen, [[f[0] - q.face * 0.06 * s, f[1] - 0.06 * s], [f[0] + q.face * 0.13 * s, f[1] - 0.035 * s], [f[0] + q.face * 0.14 * s, f[1] + 0.005 * s], [f[0] - q.face * 0.07 * s, f[1] + 0.005 * s]], d.shoes)
}
function sideArm(pen: Pen, d: Dress, q: Side, i: 0 | 1, col: string): void {
  const s = q.s
  const sh = add(q.neck, [-q.face * 0.02 * s, 0.07 * s])
  limb(pen, sh, q.elbows[i], 0.12 * s, col)
  limb(pen, q.elbows[i], q.hands[i], 0.1 * s, col)
  ellipse(pen, q.hands[i], 0.045 * s, 0.045 * s, d.skin)
}

export function side(pen: Pen, d: Dress, q: Side): void {
  const s = q.s
  const f = q.face
  sideLeg(pen, d, q, 0, mix(d.legs, '#000000', 0.15))
  sideArm(pen, d, q, 0, d.shade)
  // The body: the coat from the shoulders to the hip, or on to the knee.
  const ux = q.neck[0] - q.hip[0]
  const uy = q.neck[1] - q.hip[1]
  const L = Math.hypot(ux, uy) || 1
  const u: Pt = [ux / L, uy / L]
  const n: Pt = [-u[1] * f, u[0] * f]
  const hem = d.long ? add(q.hip, u, -0.62 * s) : add(q.hip, u, -0.12 * s)
  shape(pen, [add(q.neck, n, 0.13 * s), add(add(q.neck, u, -0.1 * s), n, 0.17 * s), add(q.hip, n, 0.15 * s), add(hem, n, (d.long ? 0.2 : 0.15) * s), add(hem, n, (d.long ? -0.17 : -0.15) * s), add(q.hip, n, -0.15 * s), add(add(q.neck, u, -0.08 * s), n, -0.17 * s), add(q.neck, n, -0.12 * s)], d.coat)
  if (d.long) line(pen, add(q.hip, n, 0.12 * s), add(hem, n, 0.14 * s), d.shade, 0.5)
  // The neck and the head, the hair at its back, a nose.
  limb(pen, q.neck, lerp(q.neck, q.head, 0.6), 0.09 * s, d.skin)
  ellipse(pen, q.head, 0.15 * s, 0.165 * s, d.skin)
  const back: Pt = [q.head[0] - f * 0.05 * s, q.head[1] - 0.04 * s]
  ellipse(pen, back, 0.12 * s, 0.13 * s, d.hair)
  shape(pen, [[q.head[0] + f * 0.13 * s, q.head[1] - 0.02 * s], [q.head[0] + f * 0.19 * s, q.head[1] + 0.035 * s], [q.head[0] + f * 0.13 * s, q.head[1] + 0.05 * s]], d.skin)
  const eye: Pt = [q.head[0] + f * 0.08 * s, q.head[1] - 0.01 * s + 0.015 * s * (1 - (q.eyes ?? 1))]
  ellipse(pen, eye, 0.016 * s, 0.012 * s, '#3E332C')
  if (q.hat) fedora(pen, d, [q.head[0] - f * 0.01 * s, q.head[1] - 0.1 * s], 0, s, false)
  sideLeg(pen, d, q, 1, d.legs)
  sideArm(pen, d, q, 1, d.coat)
}

/** A person squarely from behind (`back`) or in front: joints in cells, [left, right] as seen. */
interface Square {
  s: number
  back: boolean
  hip: Pt
  neck: Pt
  head: Pt
  knees: [Pt, Pt]
  feet: [Pt, Pt]
  elbows: [Pt, Pt]
  hands: [Pt, Pt]
  /** The hat: on the head, held in a hand, over the face (asleep), or none. */
  hat: 'head' | 'face' | 0 | 1 | null
  /** Arms folded over the chest (asleep). */
  folded?: boolean
  /** A cigar in his mouth (seen from behind: only its smoke). */
  breath?: number
}

export function square(pen: Pen, d: Dress, q: Square): void {
  const s = q.s
  // Legs and shoes, then the coat over them.
  for (let i = 0; i < 2; i++) {
    limb(pen, [q.hip[0] + (i ? 0.1 : -0.1) * s, q.hip[1]], q.knees[i as 0 | 1], 0.17 * s, mix(d.legs, '#000000', i ? 0 : 0.08))
    limb(pen, q.knees[i as 0 | 1], q.feet[i as 0 | 1], 0.14 * s, mix(d.legs, '#000000', i ? 0 : 0.08))
    const f = q.feet[i as 0 | 1]
    ellipse(pen, [f[0], f[1] - 0.02 * s], 0.09 * s, 0.045 * s, d.shoes)
  }
  const sw = 0.31 * s
  const hw = 0.23 * s
  const hem = d.long ? q.hip[1] + 0.6 * s : q.hip[1] + 0.1 * s
  const lean = q.neck[0] - q.hip[0]
  shape(pen, [[q.neck[0] - 0.1 * s, q.neck[1]], [q.neck[0] - sw, q.neck[1] + 0.09 * s], [q.hip[0] - hw, q.hip[1]], [q.hip[0] - hw - (d.long ? 0.04 * s : 0), hem], [q.hip[0] + hw + (d.long ? 0.04 * s : 0), hem], [q.hip[0] + hw, q.hip[1]], [q.neck[0] + sw, q.neck[1] + 0.09 * s], [q.neck[0] + 0.1 * s, q.neck[1]]], d.coat)
  if (q.back) {
    // The back seam and the vent, the collar.
    line(pen, [q.neck[0], q.neck[1] + 0.12 * s], [q.hip[0] + lean * 0.1, hem], d.shade, 0.5)
    shape(pen, [[q.neck[0] - 0.13 * s, q.neck[1] - 0.01 * s], [q.neck[0] + 0.13 * s, q.neck[1] - 0.01 * s], [q.neck[0] + 0.16 * s, q.neck[1] + 0.08 * s], [q.neck[0] - 0.16 * s, q.neck[1] + 0.08 * s]], d.shade)
  } else {
    // The shirt's front and a loosened tie, the lapels.
    shape(pen, [[q.neck[0] - 0.08 * s, q.neck[1]], [q.neck[0] + 0.08 * s, q.neck[1]], [q.neck[0], q.neck[1] + 0.42 * s]], '#E9E6DC')
    line(pen, [q.neck[0] + 0.01 * s, q.neck[1] + 0.05 * s], [q.neck[0] + 0.03 * s, q.neck[1] + 0.3 * s], '#7A3A34', 1.2)
    line(pen, [q.neck[0] - 0.08 * s, q.neck[1]], [q.neck[0] - 0.02 * s, q.neck[1] + 0.4 * s], d.shade, 0.5)
    line(pen, [q.neck[0] + 0.08 * s, q.neck[1]], [q.neck[0] + 0.02 * s, q.neck[1] + 0.4 * s], d.shade, 0.5)
  }
  // Arms: folded over the chest, or each to its hand.
  const shL: Pt = [q.neck[0] - sw + 0.05 * s, q.neck[1] + 0.12 * s]
  const shR: Pt = [q.neck[0] + sw - 0.05 * s, q.neck[1] + 0.12 * s]
  if (q.folded) {
    limb(pen, shL, [q.neck[0] - 0.18 * s, q.neck[1] + 0.55 * s], 0.13 * s, d.shade)
    limb(pen, shR, [q.neck[0] + 0.18 * s, q.neck[1] + 0.55 * s], 0.13 * s, d.shade)
    limb(pen, [q.neck[0] - 0.2 * s, q.neck[1] + 0.52 * s], [q.neck[0] + 0.2 * s, q.neck[1] + 0.45 * s], 0.15 * s, d.coat)
  } else {
    limb(pen, shL, q.elbows[0], 0.13 * s, d.coat)
    limb(pen, q.elbows[0], q.hands[0], 0.11 * s, d.coat)
    limb(pen, shR, q.elbows[1], 0.13 * s, d.coat)
    limb(pen, q.elbows[1], q.hands[1], 0.11 * s, d.coat)
    ellipse(pen, q.hands[0], 0.05 * s, 0.05 * s, d.skin)
    ellipse(pen, q.hands[1], 0.05 * s, 0.05 * s, d.skin)
  }
  // The neck, the head: from behind its hair and the backs of the ears; in front a face.
  limb(pen, q.neck, lerp(q.neck, q.head, 0.6), 0.1 * s, d.skin)
  ellipse(pen, [q.head[0] - 0.155 * s, q.head[1] + 0.01 * s], 0.035 * s, 0.05 * s, d.skin)
  ellipse(pen, [q.head[0] + 0.155 * s, q.head[1] + 0.01 * s], 0.035 * s, 0.05 * s, d.skin)
  ellipse(pen, q.head, 0.155 * s, 0.17 * s, q.back ? d.hair : d.skin)
  if (q.back) shape(pen, [[q.head[0] - 0.12 * s, q.head[1] + 0.09 * s], [q.head[0] + 0.12 * s, q.head[1] + 0.09 * s], [q.head[0] + 0.09 * s, q.head[1] + 0.155 * s], [q.head[0] - 0.09 * s, q.head[1] + 0.155 * s]], d.skin)
  else {
    ellipse(pen, [q.head[0], q.head[1] - 0.1 * s], 0.15 * s, 0.08 * s, d.hair)
    line(pen, [q.head[0] - 0.08 * s, q.head[1]], [q.head[0] - 0.03 * s, q.head[1]], '#3E332C', 0.6)
    line(pen, [q.head[0] + 0.03 * s, q.head[1]], [q.head[0] + 0.08 * s, q.head[1]], '#3E332C', 0.6)
  }
  if (q.hat === 'head') fedora(pen, d, [q.head[0], q.head[1] - 0.1 * s], 0, s, true)
  else if (q.hat === 'face') fedora(pen, d, [q.head[0] + 0.01 * s, q.head[1] + 0.09 * s + (q.breath ?? 0) * 0.012 * s], 0.14, s, true)
  else if (q.hat === 0 || q.hat === 1) {
    const h = q.hands[q.hat]
    fedora(pen, d, [h[0], h[1] + 0.06 * s], q.hat ? 0.5 : -0.5, s * 0.95, true)
  }
}

/* ------------------------------------------------------------------ poses */

/** Standing in profile at `x`, or walking (`walk` the step's phase): arms swinging unless given hands. */
function stand(x: number, foot: number, s: number, face: 1 | -1, o: { walk?: number; lean?: number; nod?: number; hands?: [Pt | null, Pt | null] } = {}): Side {
  const ph = o.walk
  const go = ph !== undefined
  const sn = go ? Math.sin(ph) : 0
  const cs = go ? Math.cos(ph) : 0
  const bob = go ? -0.025 * s * Math.abs(cs) : 0
  const hip: Pt = [x, foot - 1.32 * s + bob]
  const neck: Pt = [x + face * (o.lean ?? 0) * s, foot - 2.4 * s + bob]
  const head: Pt = [neck[0] + face * (0.05 + 0.06 * (o.nod ?? 0)) * s, neck[1] - 0.25 * s + 0.06 * (o.nod ?? 0) * s]
  const stride = 0.22 * s
  const feet: [Pt, Pt] = [
    [x + face * stride * sn, foot - 0.08 * s * Math.max(0, cs)],
    [x - face * stride * sn, foot - 0.08 * s * Math.max(0, -cs)],
  ]
  const knees = feet.map((f): Pt => [(hip[0] + f[0]) / 2 + face * 0.05 * s, (hip[1] + f[1]) / 2 - 0.03 * s - (foot - f[1]) * 0.6]) as [Pt, Pt]
  const sh: Pt = [neck[0] - face * 0.02 * s, neck[1] + 0.07 * s]
  const swing = (i: number): Pt => [sh[0] - face * (i ? -1 : 1) * 0.16 * s * sn, hip[1] + 0.06 * s]
  const hands: [Pt, Pt] = [o.hands?.[0] ?? swing(0), o.hands?.[1] ?? swing(1)]
  const elbows = hands.map((h): Pt => {
    const m = lerp(sh, h, 0.5)
    return [m[0] - face * 0.07 * s, m[1] + 0.02 * s]
  }) as [Pt, Pt]
  return { s, face, hip, neck, head, knees, feet, elbows, hands, hat: true }
}

/** From behind, standing at the glass: `lean` toward it (the head down a little), hands where given. */
function backAt(x: number, foot: number, s: number, o: { lean?: number; hands?: [Pt | null, Pt | null]; sway?: number; hat: Square['hat'] }): Square {
  const sw = (o.sway ?? 0) * s
  const hip: Pt = [x + sw * 0.4, foot - 1.32 * s]
  const neck: Pt = [x + sw, foot - 2.4 * s + 0.04 * (o.lean ?? 0) * s]
  const head: Pt = [neck[0] + sw * 0.3, neck[1] - 0.25 * s + 0.05 * (o.lean ?? 0) * s]
  const feet: [Pt, Pt] = [[x - 0.13 * s, foot], [x + 0.13 * s, foot]]
  const knees: [Pt, Pt] = [[x - 0.12 * s + sw * 0.2, foot - 0.68 * s], [x + 0.12 * s + sw * 0.2, foot - 0.68 * s]]
  const hang = (i: number): Pt => [x + (i ? 1 : -1) * 0.3 * s + sw * 0.4, hip[1] + 0.08 * s]
  const hands: [Pt, Pt] = [o.hands?.[0] ?? hang(0), o.hands?.[1] ?? hang(1)]
  const shoulder = (i: number): Pt => [neck[0] + (i ? 1 : -1) * 0.26 * s, neck[1] + 0.12 * s]
  const elbows = hands.map((h, i): Pt => {
    const sh = shoulder(i)
    const m = lerp(sh, h, 0.5)
    return [m[0] + (i ? 1 : -1) * 0.08 * s, m[1] + 0.05 * s]
  }) as [Pt, Pt]
  return { s, back: true, hip, neck, head, knees, feet, elbows, hands, hat: o.hat }
}

/* ------------------------------------------------------------------ the clock of the corridor */

/** Walking from `x0` at `t0` to `x1` at `t1`: where, and the step's phase (steps of `step` seconds). */
function walk(t: number, t0: number, t1: number, x0: number, x1: number, step = 0.55): { x: number; ph: number } {
  const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)))
  // Starting and stopping over the first and last step.
  const e = u < 0.12 ? (u * u) / 0.24 : u > 0.88 ? 1 - ((1 - u) * (1 - u)) / 0.24 : (u - 0.06) / 0.88
  return { x: x0 + (x1 - x0) * e, ph: ((t - t0) / step) * Math.PI }
}

/** A floor a little out from the wall, where the corridor's people stand. */
const STAND_Y = FLOOR + 0.18

/* The father at the far end of the glass. */
const PROUD_X = -12.05
const PROUD_IN: [number, number] = [at(99, 3) + 0.2, at(100, 2)]
const PROUD_TAPS = [at(100, 3), at(100, 4)]
const PROUD_POINT: [number, number] = [at(101, 1), at(101, 4)]
const PROUD_WAVE: [number, number] = [at(102, 1) + 0.25, at(103, 1)]
const PROUD_HAT: [number, number] = [at(103, 2), at(104, 1)]
const PROUD_CIGAR = at(103, 3)
const PROUD_OUT: [number, number] = [at(104, 3), at(105, 4)]

function proud(pen: Pen, t: number): void {
  if (t < PROUD_IN[0] || t > PROUD_OUT[1]) return
  const s = 1
  shade(pen, [PROUD_X, STAND_Y + 0.02], 0.45, 0.07, '#2B3832', 0.16)
  if (t < PROUD_IN[1] - 0.3) {
    const w = walk(t, PROUD_IN[0], PROUD_IN[1] - 0.3, -14.4, PROUD_X)
    side(pen, PROUD, stand(w.x, STAND_Y, s, 1, { walk: w.ph }))
    return
  }
  if (t > PROUD_OUT[0] + 0.3) {
    const w = walk(t, PROUD_OUT[0] + 0.3, PROUD_OUT[1], PROUD_X, -14.6)
    side(pen, PROUD, stand(w.x, STAND_Y, s, -1, { walk: w.ph, hands: [null, [w.x - 0.1, STAND_Y - 1.95]] }))
    return
  }
  // At the glass, his back to us: his hand up on it for the taps, pointing at his own, waving back at the nurse.
  const top = STAND_Y - 2.4
  const glassHand: Pt = [-11.62, top + 0.42]
  let right: Pt | null = null
  let left: Pt | null = null
  const tap = PROUD_TAPS.reduce((m, ti) => Math.max(m, Math.exp(-Math.max(0, t - ti) / 0.12) * (t >= ti - 0.12 ? 1 : 0) * (t < ti ? (t - ti + 0.12) / 0.12 : 1)), 0)
  const near = smooth(t, PROUD_TAPS[0] - 0.4, PROUD_TAPS[0] - 0.1) * (1 - smooth(t, PROUD_TAPS[1] + 0.3, PROUD_TAPS[1] + 0.7))
  if (near > 0) right = lerp([PROUD_X + 0.3, STAND_Y - 1.2], [glassHand[0] - 0.05 + 0.05 * (1 - tap), glassHand[1]], near)
  const point = smooth(t, PROUD_POINT[0], PROUD_POINT[0] + 0.3) * (1 - smooth(t, PROUD_POINT[1] - 0.3, PROUD_POINT[1]))
  if (point > 0) right = lerp(right ?? [PROUD_X + 0.3, STAND_Y - 1.2], [-11.5 + 0.03 * Math.sin(t * 9), top + 0.62], point)
  // The nurse's wave was for Marty; he waves back anyway, a little, a beat at a time, and lets it drop.
  const wave = smooth(t, PROUD_WAVE[0], PROUD_WAVE[0] + 0.35) * (1 - smooth(t, PROUD_WAVE[1] - 0.6, PROUD_WAVE[1]))
  if (wave > 0) {
    const beat = (PROUD_WAVE[1] - PROUD_WAVE[0]) / 4
    right = lerp(right ?? [PROUD_X + 0.3, STAND_Y - 1.2], [PROUD_X + 0.42 + 0.06 * Math.sin(((t - PROUD_WAVE[0]) / beat) * Math.PI), top - 0.05], wave)
  }
  // His hat off, held to his chest, and a cigar from his pocket.
  const hatOff = smooth(t, PROUD_HAT[0], PROUD_HAT[0] + 0.4) * (1 - smooth(t, PROUD_OUT[0] - 0.5, PROUD_OUT[0]))
  const cig = smooth(t, PROUD_CIGAR, PROUD_CIGAR + 0.35) * (1 - smooth(t, PROUD_CIGAR + 0.7, PROUD_CIGAR + 1.0))
  if (hatOff > 0) left = lerp([PROUD_X - 0.3, STAND_Y - 1.2], [PROUD_X - 0.2, top + 0.5], hatOff)
  if (cig > 0) right = lerp([PROUD_X + 0.3, STAND_Y - 1.2], [PROUD_X + 0.08, top - 0.12], cig)
  const settle = 0.03 * sway(t, 31, 3.1)
  const hat: Square['hat'] = hatOff > 0.5 ? 0 : 'head'
  // Rocking up onto his toes and back, pleased with himself, between the rest of it.
  const rock = 0.045 * Math.max(0, Math.sin((t - PROUD_IN[1]) * 2.6)) * (1 - near) * (1 - wave)
  square(pen, PROUD, backAt(PROUD_X, STAND_Y - rock, s, { lean: 0.6 + 0.4 * near, sway: settle + 0.04 * point, hands: [left, right], hat }))
}

/** The cigar's smoke over his shoulder once it is lit: he lights it after all, by the end. */
function proudSmoke(pen: Pen, t: number): void {
  if (t < PROUD_CIGAR + 0.9 || t > PROUD_OUT[1] + 3) return
  const x = t < PROUD_OUT[0] + 0.3 ? PROUD_X + 0.12 : walk(t, PROUD_OUT[0] + 0.3, PROUD_OUT[1], PROUD_X, -14.6).x - 0.2
  rising(pen, t, { seed: 1301, n: 10, from: [x - 0.03, x + 0.03, STAND_Y - 2.55], rise: 0.9, life: 2.6, spread: 0.35, size: [0.03, 0.07], color: '#E2E2DA', alpha: 0.32 * smooth(t, PROUD_CIGAR + 0.9, PROUD_CIGAR + 1.6) })
}

/* The father who has been up all night. */
const SLEEPY_IN: [number, number] = [at(99, 4), at(101, 2)]
const SLEEPY_X = -6.15
const SLEEPY_SIT: [number, number] = [at(101, 2), at(101, 4)]
const SLEEPY_DOZE: [number, number] = [at(102, 1), at(103, 1)]

function sleepy(pen: Pen, t: number): void {
  if (t < SLEEPY_IN[0]) return
  const s = 0.97
  if (t < SLEEPY_IN[1]) {
    const w = walk(t, SLEEPY_IN[0], SLEEPY_IN[1], -4.1, SLEEPY_X - 0.05, 0.62)
    shade(pen, [w.x, STAND_Y + 0.02], 0.4, 0.06, '#2B3832', 0.14)
    // Slow, his hat in his hand, his head down.
    side(pen, SLEEPY, { ...stand(w.x, STAND_Y, s, -1, { walk: w.ph, lean: 0.06, nod: 0.6, hands: [null, [w.x - 0.18, STAND_Y - 1.25]] }), hat: false })
    const hand: Pt = [w.x - 0.18, STAND_Y - 1.25]
    fedora(pen, SLEEPY, [hand[0] - 0.05, hand[1] + 0.12], -1.3, s * 0.95, true)
    return
  }
  // Down onto the bench, back against the wall, legs out and crossed, and the hat over his face; asleep, breathing slowly.
  const sit = smooth(t, SLEEPY_SIT[0], SLEEPY_SIT[0] + 0.6)
  const slump = smooth(t, SLEEPY_SIT[1], SLEEPY_DOZE[0] + 0.6)
  // Late on, a snore slides the hat off his face into his lap: he starts awake, looks round at the visitors, puts it
  // back, and is gone again.
  const slide = smooth(t, SLEEPY_SLIDE, SLEEPY_SLIDE + 0.35)
  const wake = smooth(t, SLEEPY_SLIDE + 0.2, SLEEPY_SLIDE + 0.4) * (1 - smooth(t, SLEEPY_BACK + 0.4, SLEEPY_BACK + 1.4))
  const doze = smooth(t, SLEEPY_DOZE[0], SLEEPY_DOZE[0] + 0.9) * (1 - wake)
  const breath = Math.sin(((t - T0) / 3.6) * Math.PI * 2) * doze
  const x = SLEEPY_X
  const seat = 0.53
  const hipY = STAND_Y - 1.32 * s + (seat - (STAND_Y - 1.32 * s)) * sit
  // The hat: in his hand on his knee, then up over his face; off into his lap; and back.
  const up = smooth(t, SLEEPY_DOZE[0] - 0.4, SLEEPY_DOZE[0] + 0.3) * (1 - slide) + smooth(t, SLEEPY_BACK - 0.3, SLEEPY_BACK + 0.3)
  const look = wake * Math.sin((t - SLEEPY_SLIDE) * 2.2) * 0.8
  shade(pen, [x, FLOOR + 0.1], 0.55, 0.08, '#2B3832', 0.14)
  seated(pen, SLEEPY, { x, seat: hipY, s, slump, doze, breath, up, sit, look })
}
const SLEEPY_SLIDE = at(112, 1) + 0.15
const SLEEPY_BACK = at(113, 2)

/** A man sitting on the bench, seen in front: his lap toward us, his back to the wall, the hat over his face once asleep. */
function seated(pen: Pen, d: Dress, o: { x: number; seat: number; s: number; slump: number; doze: number; breath: number; up: number; sit: number; look?: number }): void {
  const { x, s, slump, doze, breath, up, sit } = o
  const look = o.look ?? 0
  const y = o.seat
  // Shins: from the knees at the seat's edge down to the floor, stretched out and crossed at the ankle as he slumps.
  const kneeY = y + 0.12 * s * sit
  const footY = FLOOR + 0.16 + 0.3 * slump
  const knees: [Pt, Pt] = [[x - 0.14 * s, kneeY], [x + 0.14 * s, kneeY]]
  const feet: [Pt, Pt] = [[x - 0.17 * s + 0.2 * slump * s, footY], [x + 0.17 * s - 0.2 * slump * s, footY - 0.04 * slump]]
  for (let i = 0; i < 2; i++) {
    const k = knees[i as 0 | 1]
    const f = feet[i as 0 | 1]
    limb(pen, k, f, 0.14 * s, mix(d.legs, '#000000', i ? 0 : 0.1))
    ellipse(pen, [f[0] + (i ? 0.03 : -0.03) * s, f[1] - 0.01 * s], 0.09 * s, 0.045 * s, d.shoes)
  }
  // The lap: his thighs toward us, the knees.
  shape(pen, [[x - 0.25 * s, y - 0.04 * s], [x + 0.25 * s, y - 0.04 * s], [x + 0.24 * s, kneeY + 0.06 * s], [x - 0.24 * s, kneeY + 0.06 * s]], d.legs)
  ellipse(pen, [knees[0][0], kneeY + 0.04 * s], 0.11 * s, 0.07 * s, d.legs)
  ellipse(pen, [knees[1][0], kneeY + 0.04 * s], 0.11 * s, 0.07 * s, d.legs)
  // His jacket from the shoulders down to the seat, open over the shirt and the loosened tie; leaning back he sinks.
  const neck: Pt = [x + 0.02 * s * doze, y - (1.02 - 0.12 * slump) * s - 0.012 * s * breath]
  const sw = 0.3 * s
  shape(pen, [[neck[0] - 0.1 * s, neck[1]], [neck[0] - sw, neck[1] + 0.09 * s], [x - 0.27 * s, y + 0.02 * s], [x + 0.27 * s, y + 0.02 * s], [neck[0] + sw, neck[1] + 0.09 * s], [neck[0] + 0.1 * s, neck[1]]], d.coat)
  shape(pen, [[neck[0] - 0.08 * s, neck[1]], [neck[0] + 0.08 * s, neck[1]], [neck[0] + 0.03 * s, y - 0.1 * s], [neck[0] - 0.03 * s, y - 0.1 * s]], '#E9E6DC')
  line(pen, [neck[0] + 0.01 * s, neck[1] + 0.05 * s], [neck[0] + 0.04 * s, neck[1] + 0.32 * s], '#7A3A34', 1.2)
  line(pen, [neck[0] - 0.08 * s, neck[1]], [neck[0] - 0.04 * s, y - 0.1 * s], d.shade, 0.5)
  line(pen, [neck[0] + 0.08 * s, neck[1]], [neck[0] + 0.04 * s, y - 0.1 * s], d.shade, 0.5)
  // The head, tipped a little to one side as he goes off.
  const head: Pt = [neck[0] + 0.05 * s * doze, neck[1] - 0.24 * s + 0.04 * s * doze]
  limb(pen, neck, lerp(neck, head, 0.6), 0.1 * s, d.skin)
  ellipse(pen, [head[0] - 0.155 * s, head[1] + 0.01 * s], 0.035 * s, 0.05 * s, d.skin)
  ellipse(pen, [head[0] + 0.155 * s, head[1] + 0.01 * s], 0.035 * s, 0.05 * s, d.skin)
  ellipse(pen, head, 0.155 * s, 0.17 * s, d.skin)
  ellipse(pen, [head[0], head[1] - 0.1 * s], 0.15 * s, 0.08 * s, d.hair)
  const ex = head[0] + 0.05 * s * look
  if (doze > 0.5) {
    line(pen, [ex - 0.08 * s, head[1]], [ex - 0.03 * s, head[1] + 0.01 * s * doze], '#3E332C', 0.6)
    line(pen, [ex + 0.03 * s, head[1] + 0.01 * s * doze], [ex + 0.08 * s, head[1]], '#3E332C', 0.6)
  } else {
    ellipse(pen, [ex - 0.055 * s, head[1]], 0.018 * s, 0.022 * s, '#3E332C')
    ellipse(pen, [ex + 0.055 * s, head[1]], 0.018 * s, 0.022 * s, '#3E332C')
  }
  // His arms: a hand on his knee and the hat in the other, the hat going up over his face; asleep, folded.
  const shL: Pt = [neck[0] - sw + 0.05 * s, neck[1] + 0.12 * s]
  const shR: Pt = [neck[0] + sw - 0.05 * s, neck[1] + 0.12 * s]
  const fold = smooth(doze, 0.6, 1)
  const restL: Pt = [knees[0][0], kneeY - 0.02]
  const restR: Pt = [knees[1][0] + 0.06 * s, kneeY - 0.04]
  const face: Pt = [head[0] + 0.02 * s, head[1] + 0.16 * s]
  const handL = lerp(restL, [x + 0.12 * s, y - 0.32 * s], fold)
  const handR = lerp(lerp(restR, face, up), [x - 0.12 * s, y - 0.4 * s], fold)
  for (const [sh, h, sign] of [[shL, handL, -1], [shR, handR, 1]] as [Pt, Pt, number][]) {
    const el: Pt = [sh[0] + sign * 0.12 * s * (1 - 0.6 * fold), (sh[1] + h[1]) / 2 + 0.12 * s]
    limb(pen, sh, el, 0.13 * s, d.coat)
    limb(pen, el, h, 0.11 * s, d.coat)
    ellipse(pen, h, 0.05 * s, 0.05 * s, d.skin)
  }
  // The hat: on his knee in his hand, then over his face, lifting a little on each breath.
  const hc = up < 1 ? lerp([restR[0] + 0.02, restR[1] - 0.1], [head[0] + 0.01 * s, head[1] + 0.06 * s], up) : [head[0] + 0.01 * s, head[1] + 0.06 * s + 0.01 * s * breath]
  fedora(pen, d, hc as Pt, (1 - up) * 0.4 + 0.12 * up, s, true)
}

/* The orderly with his mop and bucket, as the credits come: through the far door, and over the checkerboard. */
export const MOP_IN = at(107, 4)
const MOP_X: [number, number] = [-13.9, -12.6]
/** How far he has mopped, and where the mop's head is: side to side in front of him, working along. */
export function mopAt(t: number): { x: number; head: number; face: 1 | -1; on: number; rest: number } | null {
  if (t < MOP_IN) return null
  const u = t - MOP_IN
  // Out of the door and a couple of steps; then mopping, working right, and after a while back left. He stops, leaning
  // on the mop, while the visitors tiptoe past over his wet floor.
  const out = Math.min(1, u / 1.6)
  const rest = smooth(t, VISIT_PAUSE[0], VISIT_PAUSE[0] + 0.3) * (1 - smooth(t, VISIT_PAUSE[1] - 0.3, VISIT_PAUSE[1]))
  const paused = Math.max(0, Math.min(t, VISIT_PAUSE[1]) - VISIT_PAUSE[0])
  const work = Math.max(0, u - 1.8 - paused)
  const x = -14.05 + 0.35 * out + Math.min(MOP_X[1] - MOP_X[0], 0.12 * work) - Math.max(0, 0.1 * (work - 14))
  const face: 1 | -1 = work > 14 ? -1 : 1
  const swing = Math.sin(work * 2.4) * (1 - rest)
  return { x, head: x + face * (0.55 + 0.32 * swing - 0.15 * rest), face, on: smooth(u, 1.6, 2.2), rest }
}

/* The father back again, with his mother, through the far door: tiptoeing past the orderly's wet floor to the glass. */
export const VISIT_DOOR = at(109, 1)
const VISIT_WALK: [number, number] = [at(109, 1) + 0.3, at(110, 4)]
const VISIT_PAUSE: [number, number] = [at(109, 3), at(111, 1)]
const MOTHER: Dress = { coat: '#3F4B5E', shade: '#2F3848', legs: '#C9A890', shoes: '#2A2522', skin: '#E3B79A', hair: '#B9B1AA', long: true }

/** Her little felt hat, with its brim turned up, and a feather. */
function cloche(pen: Pen, head: Pt, s: number, face: number): void {
  shape(pen, [[head[0] - 0.17 * s, head[1] - 0.04 * s], [head[0] - 0.14 * s, head[1] - 0.17 * s], [head[0] - 0.04 * s, head[1] - 0.23 * s], [head[0] + 0.1 * s, head[1] - 0.21 * s], [head[0] + 0.17 * s, head[1] - 0.1 * s], [head[0] + 0.18 * s, head[1] - 0.04 * s]], '#6A3A4A')
  line(pen, [head[0] - 0.18 * s, head[1] - 0.04 * s], [head[0] + 0.19 * s, head[1] - 0.04 * s], '#4E2A36', 1.4 * s)
  line(pen, [head[0] - face * 0.1 * s, head[1] - 0.18 * s], [head[0] - face * 0.26 * s, head[1] - 0.34 * s], '#8C7A5A', 0.8 * s)
}

function visitors(pen: Pen, t: number): void {
  if (t < VISIT_WALK[0]) return
  const at0 = VISIT_WALK[0]
  const at1 = VISIT_WALK[1]
  // His mother first, the father behind her; nearer the lens than the orderly as they pass him, then up to the glass.
  const party: [Dress, number, number, number, number][] = [
    [PROUD, 1, -14.2, -12.55, 0.25],
    [MOTHER, 0.86, -14.0, -11.95, 0],
  ]
  for (const [d, s, x0, x1, lag] of party) {
    const ta = at0 + lag
    if (t < ta) continue
    if (t < at1 + lag) {
      // On tiptoe: short steps, up on the toes, arms out a little.
      const w = walk(t, ta, at1 + lag, x0, x1, 0.32)
      const y = STAND_Y + 0.3 - 0.3 * smooth(t, at1 + lag - 0.8, at1 + lag)
      const toe = 0.05 * s
      const q = stand(w.x, y - toe, s, 1, { walk: w.ph, lean: 0.08 })
      q.hands = [[w.x - 0.25 * s, y - 1.25 * s], [w.x + 0.32 * s, y - 1.3 * s]]
      q.hat = d === PROUD
      shade(pen, [w.x, y + 0.02], 0.38, 0.06, '#2B3832', 0.12)
      side(pen, d, q)
      if (d === MOTHER) cloche(pen, q.head, s, 1)
      continue
    }
    // At the glass, their backs to us: he points his out to her; she clasps her hands, up on her toes for joy.
    const since = t - (at1 + lag)
    if (d === PROUD) {
      const point = 0.5 + 0.5 * Math.sin(since * 0.9)
      const hand: Pt = lerp([x1 + 0.3, STAND_Y - 1.2], [-11.55, STAND_Y - 1.7], smooth(point, 0.3, 0.7))
      square(pen, PROUD, backAt(x1, STAND_Y, s, { lean: 0.5, sway: 0.03 * sway(t, 33, 2.7), hands: [null, hand], hat: 'head' }))
    } else {
      const bob = 0.04 * Math.max(0, Math.sin(since * 5.2)) * smooth(since, 0, 0.3) * (1 - smooth(since, 2.5, 4.5))
      const q = backAt(x1, STAND_Y - bob, s, { lean: 0.8, sway: 0.02 * sway(t, 35, 3.3), hands: [[x1 - 0.06, STAND_Y - 1.75 * s], [x1 + 0.06, STAND_Y - 1.75 * s]], hat: null })
      shade(pen, [x1, STAND_Y + 0.02], 0.34, 0.05, '#2B3832', 0.12)
      square(pen, MOTHER, q)
      // A handbag on her arm.
      shape(pen, [[x1 + 0.2, STAND_Y - 1.05 * s], [x1 + 0.42, STAND_Y - 1.05 * s], [x1 + 0.45, STAND_Y - 0.8 * s], [x1 + 0.17, STAND_Y - 0.8 * s]], '#2E2622')
      cloche(pen, q.head, s, -1)
    }
  }
}
/** Where the wet has been laid on the tiles: a span along the floor that dries over a few seconds. */
export function wetAt(t: number): { x0: number; x1: number; a: number }[] {
  const out: { x0: number; x1: number; a: number }[] = []
  if (t < MOP_IN + 1.8) return out
  for (let tt = MOP_IN + 1.8; tt <= t; tt += 0.5) {
    const m = mopAt(tt)
    if (!m) continue
    const a = 1 - Math.min(1, (t - tt) / 9)
    if (a <= 0) continue
    out.push({ x0: m.x + m.face * 0.2, x1: m.x + m.face * 0.95, a })
  }
  return out
}

function orderly(pen: Pen, t: number): void {
  const m = mopAt(t)
  if (!m) return
  const s = 0.96
  const walking = t < MOP_IN + 1.6
  const q = stand(m.x, STAND_Y + 0.1, s, m.face, walking ? { walk: ((t - MOP_IN) / 0.55) * Math.PI } : { lean: 0.12 })
  // His hands on the mop's handle, the handle down to its head on the floor, swung side to side.
  const foot = STAND_Y + 0.25
  const headPt: Pt = [m.head, foot]
  const top: Pt = lerp(headPt, [m.x + m.face * 0.05, STAND_Y - 1.75], 1.12)
  if (!walking) {
    q.hands = [lerp(headPt, top, 0.82), lerp(headPt, top, 0.55)]
    q.elbows = [[q.neck[0] + m.face * 0.12, q.neck[1] + 0.55], [q.neck[0] + m.face * 0.24, q.neck[1] + 0.75]]
  }
  shade(pen, [m.x, STAND_Y + 0.12], 0.4, 0.06, '#2B3832', 0.14)
  // The bucket on its casters behind him, its wringer.
  const bx = m.x - m.face * 0.55
  const by = STAND_Y + 0.1
  shape(pen, [[bx - 0.22, by - 0.42], [bx + 0.22, by - 0.42], [bx + 0.19, by - 0.06], [bx - 0.19, by - 0.06]], '#8E9A96')
  shape(pen, [[bx - 0.12, by - 0.55], [bx + 0.1, by - 0.55], [bx + 0.12, by - 0.42], [bx - 0.14, by - 0.42]], '#6F7A77')
  rect4(pen, bx - 0.24, by - 0.44, bx + 0.24, by - 0.4, '#6F7A77')
  for (const dx of [-0.15, 0.15]) ellipse(pen, [bx + dx, by - 0.03], 0.035, 0.035, '#3A3633')
  q.hat = false
  side(pen, ORDERLY, q)
  if (walking) {
    // Carried, over his shoulder.
    line(pen, [m.x - m.face * 0.3, STAND_Y - 2.2], [m.x + m.face * 0.7, STAND_Y - 0.9], '#9C7A52', 1.4)
    return
  }
  line(pen, top, headPt, '#9C7A52', 1.4)
  // The mop's head: a grey tangle, dragging.
  const drag = Math.cos((t - MOP_IN - 1.8) * 2.4)
  shape(pen, [[m.head - 0.2 - 0.05 * drag, foot], [m.head + 0.2 - 0.05 * drag, foot], [m.head + 0.12, foot - 0.1], [m.head - 0.12, foot - 0.1]], '#B7B8AE')
  for (let i = -2; i <= 2; i++) line(pen, [m.head + i * 0.05, foot - 0.08], [m.head + i * 0.07 - 0.06 * drag, foot], '#9FA095', 0.5)
}
const rect4 = (pen: Pen, x0: number, y0: number, x1: number, y1: number, col: string): void => shape(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col)

/* The doctor out of the ward with a chart, and the ward sister in to Rachel's bed with hers. */
const DOC_IN: [number, number] = [at(109, 1), at(110, 1)]
const DOC_X = -4.7
/** The sister comes out from behind the partition's curtain (she was the shadow at the next bed) to Rachel's chart. */
const SISTER_IN: [number, number] = [at(110, 2), at(111, 4)]
const SISTER_X = -1.85
const SISTER_FROM = 3.3

function reader(pen: Pen, d: Dress, x: number, face: 1 | -1, t: number, seed: number, cap: boolean): void {
  const s = 0.98
  // The chart held up before the chest, read; a page turned now and then; a glance up, and back to it.
  const look = smooth(Math.sin((t + seed) * 0.45), 0.85, 0.98)
  const q = stand(x, STAND_Y, s, face, { nod: 0.9 * (1 - look), lean: 0.04 })
  const chart: Pt = [x + face * 0.42, STAND_Y - 1.65]
  q.hands = [[chart[0] - face * 0.04, chart[1] + 0.12], [chart[0] + face * 0.06, chart[1] + 0.1]]
  q.elbows = [[x + face * 0.12, STAND_Y - 1.42], [x + face * 0.2, STAND_Y - 1.35]]
  q.hat = false
  q.eyes = look
  shade(pen, [x, STAND_Y + 0.02], 0.4, 0.06, '#2B3832', 0.14)
  side(pen, d, q)
  // The board and its sheet, a corner lifting as it is turned.
  const turn = Math.max(0, Math.sin((t + seed * 3) * 0.8)) ** 12
  shape(pen, [[chart[0] - 0.13, chart[1] - 0.2], [chart[0] + 0.13, chart[1] - 0.2], [chart[0] + 0.13, chart[1] + 0.16], [chart[0] - 0.13, chart[1] + 0.16]], '#6E5238')
  shape(pen, [[chart[0] - 0.11, chart[1] - 0.17 - 0.06 * turn], [chart[0] + 0.11, chart[1] - 0.17 - 0.12 * turn], [chart[0] + 0.11, chart[1] + 0.14], [chart[0] - 0.11, chart[1] + 0.14]], '#F4F1E4')
  if (cap) {
    const h = q.head
    shape(pen, [[h[0] - 0.16, h[1] - 0.12], [h[0] + 0.12, h[1] - 0.12], [h[0] + 0.09, h[1] - 0.26], [h[0] - 0.13, h[1] - 0.26]], '#FBFBF6')
    shape(pen, [[h[0] - 0.155, h[1] - 0.15], [h[0] + 0.115, h[1] - 0.15], [h[0] + 0.115, h[1] - 0.18], [h[0] - 0.155, h[1] - 0.18]], '#2C2C2C')
  } else {
    // His stethoscope round his neck.
    line(pen, [q.neck[0] - face * 0.05, q.neck[1] + 0.05], [q.neck[0] + face * 0.1, q.neck[1] + 0.5], '#2E2E2E', 0.6)
  }
}

function doctor(pen: Pen, t: number): void {
  if (t < DOC_IN[0]) return
  if (t < DOC_IN[1]) {
    const w = walk(t, DOC_IN[0], DOC_IN[1], -2.4, DOC_X)
    shade(pen, [w.x, STAND_Y + 0.02], 0.4, 0.06, '#2B3832', 0.14)
    const q = stand(w.x, STAND_Y, 0.98, -1, { walk: w.ph, nod: 0.5 })
    q.hat = false
    side(pen, DOCTOR, q)
    return
  }
  reader(pen, DOCTOR, DOC_X, -1, t, 2.1, false)
}

function sister(pen: Pen, t: number): void {
  if (t < SISTER_IN[0]) return
  if (t < SISTER_IN[1]) {
    const w = walk(t, SISTER_IN[0], SISTER_IN[1], SISTER_FROM, SISTER_X)
    const q = stand(w.x, STAND_Y, 0.95, -1, { walk: w.ph })
    q.hat = false
    // Behind the curtain until she is past its edge.
    const { k } = pen
    const ctx = ctxOf(pen.p)
    ctx.save()
    ctx.beginPath()
    ctx.rect((CURTAIN[0] - 30) * k, -10 * k, 30 * k, 20 * k)
    ctx.clip()
    shade(pen, [w.x, STAND_Y + 0.02], 0.4, 0.06, '#2B3832', 0.14)
    side(pen, SISTER, q)
    const h = q.head
    shape(pen, [[h[0] - 0.12, h[1] - 0.12], [h[0] + 0.16, h[1] - 0.12], [h[0] + 0.13, h[1] - 0.26], [h[0] - 0.09, h[1] - 0.26]], '#FBFBF6')
    shape(pen, [[h[0] - 0.115, h[1] - 0.15], [h[0] + 0.155, h[1] - 0.15], [h[0] + 0.155, h[1] - 0.18], [h[0] - 0.115, h[1] - 0.18]], '#2C2C2C')
    ctx.restore()
    return
  }
  reader(pen, SISTER, SISTER_X, 1, t, 0.7, true)
}

/* The night nurse at the back of the nursery, giving a bottle, swaying on her feet and going slowly to and fro. */

/** Drawn inside the nursery's glass, behind the back row (which hides her below the waist). */
export function nightNurse(pen: Pen, t: number): void {
  if (t < T0) return
  const s = 0.8
  // To and fro along the back, from the window to just behind the other nurse's shoulder, a slow round of it.
  const ph = ((t - T0) / 13) * Math.PI * 2
  const x = -10.5 + 0.78 * Math.sin(ph)
  const face: 1 | -1 = Math.cos(ph) >= 0 ? 1 : -1
  const sw = 0.025 * Math.sin(((t - T0) / 1.9) * Math.PI * 2)
  const foot = 0.05 + 0.95
  const q = stand(x + sw, foot, s, face, { lean: 0.02, nod: 0.7 })
  const baby: Pt = [x + face * 0.22 * s + sw, foot - 1.98 * s]
  q.hands = [[baby[0] - face * 0.12, baby[1] + 0.08], [baby[0] + face * 0.16, baby[1] - 0.04]]
  q.elbows = [[x - face * 0.04, foot - 1.72 * s], [x + face * 0.1, foot - 1.62 * s]]
  q.hat = false
  q.eyes = 0
  side(pen, SISTER, q)
  // The baby in her arms, swaddled, and the bottle tipped to it.
  ellipse(pen, baby, 0.17 * s, 0.075 * s, '#F7F5EC')
  ellipse(pen, [baby[0] + face * 0.13 * s, baby[1] - 0.02 * s], 0.055 * s, 0.055 * s, '#EFC5AA')
  const b0: Pt = [baby[0] + face * 0.2 * s, baby[1] - 0.04 * s]
  const b1: Pt = [b0[0] + face * 0.16 * s, b0[1] - 0.1 * s]
  line(pen, b0, b1, '#E9EEF0', 3.2 * s)
  line(pen, lerp(b0, b1, 0.45), b1, '#F4F0DE', 2.6 * s)
  const h = q.head
  shape(pen, [[h[0] - 0.12 * s, h[1] - 0.12 * s], [h[0] + 0.14 * s, h[1] - 0.12 * s], [h[0] + 0.11 * s, h[1] - 0.25 * s], [h[0] - 0.09 * s, h[1] - 0.25 * s]], '#FBFBF6')
  shape(pen, [[h[0] - 0.115 * s, h[1] - 0.15 * s], [h[0] + 0.135 * s, h[1] - 0.15 * s], [h[0] + 0.135 * s, h[1] - 0.18 * s], [h[0] - 0.115 * s, h[1] - 0.18 * s]], '#2C2C2C')
}

/* ------------------------------------------------------------------ in the picture */

/** The corridor's people who stand in front of the wall: drawn over the set, under Marty and the nursery's glass's front. */
export function drawPeople(pen: Pen, t: number): void {
  if (t < T0) return
  sleepy(pen, t)
  orderly(pen, t)
  visitors(pen, t)
  doctor(pen, t)
  sister(pen, t)
  proud(pen, t)
  proudSmoke(pen, t)
}

