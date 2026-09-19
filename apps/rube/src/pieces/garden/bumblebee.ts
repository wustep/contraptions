import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, trace, wait, type Lane, type PieceCtx, type Pt } from '../../parts'
import { bloom, leaf, stem, tuft } from './green'

/**
 * A bumblebee at work in a flowerbed. The path ends at a daisy turned up
 * like a plate; the ball rolls onto its face and the daisy dips under it.
 * The bee has been busy at another flower; it comes over, hovers, settles
 * on the ball and takes hold of it with all six legs — and heaves. Nothing.
 * It heaves again, wings a blur, and the ball comes up off the daisy, and
 * the bee labours up and across the bed with it, nose in the air, sagging
 * and recovering, to a shelf a floor up, where it sets the ball down
 * rolling and lets go — and bobs up a hand's breadth, light again, and
 * goes back to its flower.
 *
 * Bee and ball are one motion: the ball hangs a fixed drop under the bee,
 * and the lane is traced from the same flight the bee is drawn on.
 */
const EDGE = -0.12
const DAISY = 0.1
const DIP = 0.02
/** The bee's own flower, and where it hovers over it. */
const FLOWER: Pt = [0.82, 0.16]
const HOVER: Pt = [0.8, -0.1]
/** The ball hangs this far under the bee's middle. */
const HANG = R + 0.1
/** The shelf a floor up: where it starts, the stake it stands on, and where the ball is let go over it. */
const SHELF = 1.55
const STAKE = 1.62
const RELEASE: Pt = [1.95, -1.03]
const CREST = -1.13

const ARRIVE = arriveAt(DAISY)
const GIVE = 0.08
/** Over the ball by then; down onto it; two heaves. */
const T_OVER = ARRIVE + 0.1
const T_GRIP = T_OVER + 0.18
const FIRE = T_GRIP + 0.3
const CARRY = 1.45
const T_FREE = FIRE + CARRY
const HOME = 1.2

/** The ball on its way, `u` from 0 (off the daisy) to 1 (over the shelf): a climb, a crossing, a careful last bit down, and a wobble all the way. */
function carried(at: number): Pt {
  const u = clamp(at)
  const climb = easeInOutSine(Math.min(1, u / 0.7))
  const settle = easeInOutSine(over(u, 0.74, 1))
  const labour = Math.pow(Math.sin(Math.PI * u), 0.7)
  const beat = 2 * Math.PI * 2.7 * u * CARRY
  return [
    lerp(DAISY, RELEASE[0], easeInOutSine(u)) + 0.012 * Math.cos(beat) * labour,
    lerp(DIP, CREST, climb) + (RELEASE[1] - CREST) * settle + 0.034 * Math.sin(beat) * labour,
  ]
}

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [DAISY, 0]),
    { from: [DAISY, 0], to: [DAISY, DIP], dur: GIVE, ease: 'out' },
    wait([DAISY, DIP], FIRE - ARRIVE - GIVE),
    ...trace((t) => carried((t - FIRE) / CARRY), FIRE, T_FREE, 44),
    { from: RELEASE, to: [RELEASE[0] + 0.03, -1], dur: 0.07, ease: 'in' },
    ramp([RELEASE[0] + 0.03, -1], [2.5, -1], 0.6, ROLL),
  ],
  fire: FIRE,
}

interface Bee {
  at: Pt
  /** 1 facing the way out, -1 facing back; through 0 as it turns about. */
  face: number
  /** Nose up is negative. */
  tilt: number
  /** 0 legs dangling, 1 clasped round the ball. */
  grip: number
  /** How hard the wings are going, 1 at a hover. */
  effort: number
}

function beeAt(t: number): Bee {
  const bob = 0.014 * Math.sin(t * 5.2)
  const above: Pt = [DAISY, DIP - HANG - 0.1]
  const on: Pt = [DAISY, DIP - HANG]
  if (t < 0) return { at: [HOVER[0], HOVER[1] + bob], face: -1, tilt: 0.12, grip: 0, effort: 1 }
  if (t < T_OVER) {
    // Over to the ball, nose down, in a shallow swoop.
    const f = easeInOutSine(over(t, 0, T_OVER))
    return { at: [lerp(HOVER[0], above[0], f), lerp(HOVER[1], above[1], f) - 0.06 * Math.sin(Math.PI * f) + bob * (1 - f)], face: -1, tilt: 0.12 + 0.2 * Math.sin(Math.PI * f), grip: 0, effort: 1.2 }
  }
  if (t < T_GRIP) {
    // Down onto it, turning to face the way it means to go, legs closing.
    const f = over(t, T_OVER, T_GRIP)
    return { at: [DAISY, lerp(above[1], on[1], easeInOutSine(f))], face: -Math.cos(Math.PI * easeInOutSine(f)), tilt: 0, grip: easeInQuad(f), effort: 1 }
  }
  if (t < FIRE) {
    // Two heaves: the first gets nothing; the second has it coming.
    const f = over(t, T_GRIP, FIRE)
    const heave = Math.pow(Math.sin(Math.PI * 2 * f), 2) * (f < 0.5 ? 1 : 0.6)
    return { at: [DAISY, on[1] - 0.018 * heave], face: 1, tilt: -0.25 * heave, grip: 1, effort: 1.3 + 1.2 * heave }
  }
  if (t < T_FREE) {
    const u = (t - FIRE) / CARRY
    const [x, y] = carried(u)
    const beat = 2 * Math.PI * 2.7 * u * CARRY
    return { at: [x, y - HANG], face: 1, tilt: -0.3 + 0.12 * Math.sin(beat + 1) + 0.25 * over(u, 0.85, 1), grip: 1, effort: 2.2 }
  }
  // Light again: up a hand's breadth, a moment's hover, and home, turning back to its flower.
  const free = t - T_FREE
  const from: Pt = [RELEASE[0], RELEASE[1] - HANG]
  const pop = 0.1 * (1 - Math.exp(-free * 9))
  if (free < 0.45) return { at: [from[0], from[1] - pop + bob * over(free, 0.2, 0.45)], face: Math.cos(Math.PI * easeInOutSine(over(free, 0.15, 0.45))), tilt: -0.05, grip: 1 - over(free, 0, 0.08), effort: 1 }
  // Home over the shelf's end, not through it: along first, and only then down.
  const lin = over(free, 0.45, 0.45 + HOME)
  const fx = easeInOutSine(lin)
  const fy = easeInOutSine(over(lin, 0.3, 1))
  return { at: [lerp(from[0], HOVER[0], fx), lerp(from[1] - 0.1, HOVER[1], fy) + bob], face: -1, tilt: 0.12 + 0.15 * Math.sin(Math.PI * fx), grip: 0, effort: 1 }
}

export const bumblebee = definePiece<{ color: string; petal: string }>({
  name: 'bumblebee',
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, -1])) return null
    const petal = rng.pick(theme.colors.filter((c) => c !== color))
    return { cells, exit: { at: [3, -1], dir: 1 }, lane: LANE, state: { color, petal } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The daisy dips under the ball and springs back when the ball is taken off it.
    const dip = t < ARRIVE ? 0 : since < 0 ? DIP * Math.min(1, over(t, ARRIVE, ARRIVE + GIVE)) : DIP * Math.exp(-since * 6) * Math.cos(since * 20)

    // The path in, the bed, and the shelf a floor up: a plank on a stake, braced.
    rail(p, k, ink, weight, -0.5, EDGE)
    outline(p, ink, weight)
    p.line((EDGE - 0.05) * k, FLOOR * k, (EDGE - 0.05) * k, 0.5 * k)
    p.line(-0.5 * k, 0.5 * k, 1.5 * k, 0.5 * k)
    rail(p, k, ink, weight, SHELF, 2.5, -1 + FLOOR)
    outline(p, ink, weight)
    p.line(SHELF * k, (-1 + FLOOR + 0.05) * k, 2.5 * k, (-1 + FLOOR + 0.05) * k)
    p.line(STAKE * k, (-1 + FLOOR + 0.05) * k, STAKE * k, 0.5 * k)
    p.line((STAKE - 0.06) * k, 0.5 * k, (STAKE + 0.06) * k, 0.5 * k)
    p.line(STAKE * k, -0.4 * k, 2.34 * k, (-1 + FLOOR + 0.05) * k)

    // The bed: the bee's own flower, and a few smaller ones, nodding.
    const nod = (ph: number) => 0.015 * Math.sin(t * 1.4 + ph)
    for (const [x, y, r, ph] of [
      [0.46, 0.27, 0.075, 0.5],
      [1.22, 0.23, 0.085, 2.1],
    ]) {
      stem(p, k, ink, weight, x, 0.5, x + nod(ph), y + r * 0.6, 0.02)
      bloom(p, k, ink, weight * 0.7, s.petal, bg, x + nod(ph), y, r, 5, 1, ph)
    }
    tuft(p, k, ink, weight, 0.63, 0.5, 0.08, 0.02)
    tuft(p, k, ink, weight, 1.0, 0.5, 0.09, -0.02)
    tuft(p, k, ink, weight, 1.42, 0.5, 0.07, 0.02)
    stem(p, k, ink, weight * 1.2, FLOWER[0] + 0.02, 0.5, FLOWER[0], FLOWER[1] + 0.05, 0.03)
    leaf(p, k, ink, weight, s.color, FLOWER[0] + 0.02, 0.4, 0.14, -0.5)
    bloom(p, k, ink, weight * 0.8, s.petal, s.color, FLOWER[0], FLOWER[1], 0.115, 6, 1, 0.3)

    // The daisy the ball lands on: face up, seen from the side — petals out flat either way, the heart a low dome.
    const face = FLOOR + 0.025 + dip
    stem(p, k, ink, weight * 1.3, DAISY + 0.03, 0.5, DAISY, face + 0.03, -0.04)
    leaf(p, k, ink, weight, s.color, DAISY + 0.01, 0.38, 0.15, Math.PI + 0.5)
    solid(p, ink, weight * 0.8, s.petal)
    for (const [dx, a, len] of [
      [-0.04, Math.PI + 0.2, 0.2],
      [0.04, -0.2, 0.2],
      [-0.03, Math.PI - 0.06, 0.17],
      [0.03, 0.06, 0.17],
    ]) {
      p.push()
      p.translate((DAISY + dx) * k, (face + 0.02) * k)
      p.rotate(a)
      p.ellipse((len / 2) * k, 0, len * k, 0.075 * k)
      p.pop()
    }
    solid(p, ink, weight, s.color)
    p.arc(DAISY * k, (face + 0.035) * k, 0.17 * k, 0.09 * k, 0, Math.PI, p.CHORD)
  },
  over: (p, s, c) => bee(p, s.color, c, beeAt(c.t)),
})

/** The bee, in front of everything: far wing, fat striped body, head, near wing, and the legs — dangling, or down round the ball. */
function bee(p: p5, color: string, { k, t, ink, bg, weight }: PieceCtx, b: Bee): void {
  const flap = 0.6 * Math.sin(t * 2 * Math.PI * 27 * Math.min(1.6, b.effort))
  p.push()
  p.translate(b.at[0] * k, b.at[1] * k)
  // The legs first, straight down whatever the body's tilt: hanging loose, or clasped on the ball's shoulders.
  outline(p, ink, weight * 0.9)
  const squeeze = Math.abs(b.face)
  for (const [hx, reach] of [
    [-0.06, -1],
    [0.0, 0],
    [0.06, 1],
  ]) {
    const hipX = hx * squeeze
    const hipY = 0.06
    // A foot on the ball at this angle round from its top, or dangling under the hip.
    const a = -Math.PI / 2 + reach * 0.95
    const footX = lerp(hipX + 0.015 * reach, Math.cos(a) * R, b.grip)
    const footY = lerp(hipY + 0.085 + 0.012 * Math.sin(t * 7 + hx * 40), HANG + Math.sin(a) * R, b.grip)
    const kneeX = (hipX + footX) / 2 + reach * (0.035 + 0.03 * b.grip)
    const kneeY = (hipY + footY) / 2 - 0.01
    p.line(hipX * k, hipY * k, kneeX * k, kneeY * k)
    p.line(kneeX * k, kneeY * k, footX * k, footY * k)
  }
  p.scale(b.face === 0 ? 0.001 : b.face, 1)
  p.rotate(b.tilt)
  // The far wing, behind the body.
  wing(p, k, ink, weight, bg, -0.035, -0.055, -2.3 + flap * 0.8)
  // The body: fat, in the colour, two bands of ink round it, a stub of a sting.
  solid(p, ink, weight, ink)
  p.triangle(-0.1 * k, -0.015 * k, -0.1 * k, 0.03 * k, -0.15 * k, 0.012 * k)
  solid(p, ink, weight, color)
  p.ellipse(0, 0, 0.24 * k, 0.175 * k)
  p.noStroke()
  p.fill(ink)
  for (const x of [-0.045, 0.03]) {
    const h = 0.175 * Math.sqrt(1 - Math.pow(x / 0.12, 2))
    p.rect(x * k, 0, 0.036 * k, h * k)
  }
  // The head, an eye, the antennae.
  solid(p, ink, weight, ink)
  p.circle(0.125 * k, -0.005 * k, 0.095 * k)
  p.noStroke()
  p.fill(bg)
  p.circle(0.142 * k, -0.018 * k, 0.03 * k)
  outline(p, ink, weight * 0.8)
  p.noFill()
  p.arc(0.175 * k, -0.075 * k, 0.07 * k, 0.09 * k, Math.PI * 0.55, Math.PI * 1.35)
  p.arc(0.145 * k, -0.085 * k, 0.07 * k, 0.09 * k, Math.PI * 0.55, Math.PI * 1.35)
  // The near wing.
  wing(p, k, ink, weight, bg, -0.005, -0.06, -2.0 + flap)
  p.pop()
}

/** A wing from its root, `a` radians round from pointing ahead: a long pale oval. */
function wing(p: p5, k: number, ink: string, weight: number, bg: string, x: number, y: number, a: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  solid(p, ink, weight * 0.7, bg)
  p.ellipse(0.085 * k, 0, 0.17 * k, 0.075 * k)
  p.pop()
}
