import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, BEAT, FORM, PIZZ, SNARE, STROKES, T0, lastIndex } from '../music'
import { chainRun } from '../mast'
import { BRASS, GOLD, INK, IRON, clamp, deep, easeOut, pale, smooth } from '../look'

/**
 * The carillon (storey 2: the oboe d'amore, then the flute with the muted trumpet). Six bells hang from the ceiling
 * beam in a row, biggest at the left to smallest at the right, the mast between the third and the fourth, their
 * mouths level. They play the plucked strings' figure: the big bell on every downbeat, the two middle bells on the
 * second beats, the three small ones on the thirds (and the second bar's 3-and), so each bar's boom-ba-ba rings
 * across the row from left to right.
 *
 * Under the bells runs the barrel: a shaft with a pinned drum under each bell's hammer, geared off the mast (a wheel
 * in the chain, a pinion on the shaft) and turning a step with each stroke, once round in two bars like the drum's
 * own pin wheel. Each hammer stands on a saddle on the shaft beside its bell's lip, its tail lying on its drum: a pin
 * coming over the top rocks the hammer back off the bell, and slipping off the tail lets it fall on the lip on the
 * pluck; the bell swings away and settles. Idle, the chain turns the wheel and the pinion and nothing else, until the
 * clutch collars slide in along the shaft either side of the pinion.
 */

interface Bell {
  /** Where it hangs, its mouth's half-width and its height (crown to lip). */
  x: number
  a: number
  h: number
}
const BELLS: Bell[] = [
  { x: -3.1, a: 0.31, h: 0.51 },
  { x: -2.0, a: 0.265, h: 0.455 },
  { x: -0.86, a: 0.23, h: 0.405 },
  { x: 0.6, a: 0.2, h: 0.36 },
  { x: 1.95, a: 0.172, h: 0.32 },
  { x: 3.08, a: 0.148, h: 0.285 },
]

/** Which quarters of the strings' two bars each bell plays: the low pluck the big bell, the mids and highs in turn along the row. */
const QUARTERS: number[][] = (() => {
  const out: number[][] = BELLS.map(() => [])
  let mid = 0
  let high = 0
  for (const [q, who] of PIZZ) {
    const j = who === 'low' ? 0 : who === 'mid' ? 1 + Math.min(1, mid++) : 3 + Math.min(2, high++)
    out[j].push(q)
  }
  return out
})()
/** The drum strokes the plucks fall on: where each bell's pins are round the barrel, which turns a step a stroke. */
const PINS: number[][] = QUARTERS.map((qs) => qs.map((q) => SNARE.findIndex((s) => Math.abs(s - q) < 1e-6)))

const CYCLE = 2 * BAR
const STEPS = SNARE.length
/** The last two-bar turn the strings pluck in (bars 337 and 338). */
const LAST_TURN = Math.floor((FORM.collapse - 2) / 2)
/** The pin's climb under a hammer's tail, and the hammer's fall onto the lip (it lands on the pluck). */
const WIND = 0.55
const FALL = 0.07

/** The drum's radius, the hammer's tail and the gap between its head and the lip at rest. */
const DRUM_R = 0.05
const TAIL = 0.09
const GAP = 0.012
/** The drive: a wheel in the mast's chain (right of it, its teeth in the links) over a pinion on the shaft. */
const WHEEL_R = 0.15
const PINION_R = 0.05
const DRIVE_X = 0.045 + WHEEL_R - 0.035
/** Where the shaft is borne: on the storey's own hangers. */
const HANGERS = [-0.36, -0.14, 0.14, 0.36]

/** The chain's steps so far: stroke n's step is taken over its first 0.07 s (as the mast's chain takes it). */
function run(t: number): number {
  const n = lastIndex(STROKES, t)
  if (n < 0) return -1
  const u = clamp((t - STROKES[n]) / 0.07)
  return n - 1 + u * u * (3 - 2 * u)
}

/** Bell `j`'s plucks from the turn before `t` to the turn after. */
function plucksNear(j: number, t: number): number[] {
  const m0 = Math.floor((t - T0) / CYCLE)
  const out: number[] = []
  for (let m = m0 - 1; m <= m0 + 1; m++) {
    if (m < 0 || m > LAST_TURN) continue
    for (const q of QUARTERS[j]) out.push(T0 + m * CYCLE + q * BEAT)
  }
  return out
}

const frac = (x: number): number => x - Math.floor(x)

export const carillon: Engine = (p, c, st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const fine = weight * 0.5
  const unfold = smooth(e.open, 0.75, 1)
  const at = t - e.since
  const tint = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)

  const beam = st.top + 0.05
  const yb = e.box.y1 - 0.1
  const drumTop = yb - DRUM_R
  const mouth = beam + 0.58
  const pivotY = drumTop - 0.004
  const hangers = HANGERS.map((f) => f * st.w)
  const reach = hangers[3] * easeOut(unfold)

  const bronze = tint(mixHex(BRASS, deep(e.color, 0.3), 0.4))
  const inside = deep(bronze, 0.55)
  const accent = tint(e.color)
  const brass = tint(BRASS)
  const iron = pale(IRON, 0.25)

  const on = (x: number): number => smooth(x, at, at + 1)
  const force = (tp: number): number => on(tp - FALL) * (0.5 + 0.5 * e.amp)
  // The barrel's position, in steps: standing until the clutch is in, then taking up the chain's.
  const chain = run(t)
  const idle = run(at) - 0.5
  const pos = e.on >= 1 ? chain : idle + (chain - idle) * e.on
  const pin = TAIL * Math.sin(0.7 * (0.5 + 0.5 * e.amp))

  // The shaft, from hanger to hanger, and its bearings on them.
  outline(p, INK, weight * 1.9)
  p.line(-reach * k, yb * k, reach * k, yb * k)
  outline(p, iron, weight * 0.9)
  p.line(-reach * k, yb * k, reach * k, yb * k)
  p.rectMode(p.CENTER)
  for (const x of hangers) {
    if (Math.abs(x) > reach + 1e-6) continue
    solid(p, INK, fine, pale(IRON, 0.45))
    p.rect(x * k, yb * k, 0.09 * k, 0.15 * k, 0.02 * k)
  }

  // The drive: the wheel in the chain turns with it all show, and turns the pinion; the collars slide in to lock the
  // pinion to the shaft as the engine is let in.
  const wheelY = yb - WHEEL_R - PINION_R
  const turn = chainRun(t) / WHEEL_R
  cog(p, k, weight, DRIVE_X, wheelY, WHEEL_R, 12, turn, brass)
  cog(p, k, weight, DRIVE_X, yb, PINION_R, 5, -turn * (WHEEL_R / PINION_R) + Math.PI / 5, accent)
  const slide = 0.07 * (1 - smooth(t, at - 0.2, at + 0.6))
  for (const side of [-1, 1]) {
    solid(p, INK, fine, accent)
    p.rect((DRIVE_X + side * (PINION_R + 0.05 + slide)) * k, yb * k, 0.05 * k, 0.11 * k, 0.015 * k)
  }

  BELLS.forEach((bell, j) => {
    if (Math.abs(bell.x) > reach + 0.1) return
    const shown = easeOut(clamp((unfold - 0.35 * (Math.abs(bell.x) / hangers[3])) / 0.6))
    if (shown <= 0) return
    const drumX = bell.x + bell.a + 0.04
    const pivotX = drumX + TAIL

    // What the hammer and the bell are doing: wound back by the pin before a pluck, bouncing off the lip after it;
    // the bell swinging away from each blow.
    let lift = 0
    let bounce = 0
    let swing = 0
    let fresh = 0
    const hz = 1.05 + (0.31 - bell.a) * 4
    for (const tp of plucksNear(j, t)) {
      const d = tp - t
      if (d > 0) {
        if (d >= WIND + FALL) continue
        const f = force(tp)
        if (d > FALL) lift += (f * (1 - Math.cos((Math.PI * (WIND + FALL - d)) / WIND))) / 2
        else lift += f * (1 - (1 - d / FALL) ** 2)
      } else {
        const x = -d
        if (x > 4) continue
        const f = force(tp)
        bounce += f * (x / 0.06) * Math.exp(1 - x / 0.06)
        swing += f * Math.exp(-x / 0.5) * Math.sin(2 * Math.PI * hz * x)
        fresh = Math.max(fresh, f * Math.exp(-x / 0.3))
      }
    }
    const hang = mouth - beam
    const tilt = 0.22 * swing
    // The lip coming back at the hammer pushes it aside rather than passing through it.
    const arm = pivotY - (mouth - 0.04)
    const push = Math.max(0, -Math.sin(tilt) * hang - GAP) / arm
    const fold = (1 - shown) * 1.4
    const phi = Math.max(0.7 * lift + 0.2 * bounce, push) + fold

    // The drum under the hammer's tail, and its pins coming up over the front and over the top.
    solid(p, INK, fine, brass)
    p.rect(drumX * k, yb * k, 0.12 * k, DRUM_R * 2 * k, 0.02 * k)
    outline(p, INK, fine * 0.8)
    p.line((drumX - 0.04) * k, (yb - DRUM_R) * k, (drumX - 0.04) * k, (yb + DRUM_R) * k)
    p.line((drumX + 0.04) * k, (yb - DRUM_R) * k, (drumX + 0.04) * k, (yb + DRUM_R) * k)
    for (const s of PINS[j]) {
      const psi = 2 * Math.PI * frac((s - 0.5 - pos) / STEPS)
      if (Math.sin(psi) < -0.3 || Math.cos(psi) < 0) continue
      const y0 = yb - DRUM_R * Math.cos(psi)
      const y = yb - (DRUM_R + pin) * Math.cos(psi)
      outline(p, INK, fine * 1.2)
      p.line(drumX * k, y0 * k, drumX * k, y * k)
      solid(p, INK, fine * 0.7, accent)
      p.circle(drumX * k, y * k, 0.028 * k)
    }

    // The saddle on the shaft that carries the hammer's pivot.
    solid(p, INK, fine, pale(IRON, 0.45))
    p.rect(pivotX * k, (yb - 0.01) * k, 0.05 * k, 0.1 * k, 0.015 * k)

    // The bell: hung by its strap from the beam, folded up against it until the storey is open.
    p.push()
    p.translate(bell.x * k, beam * k)
    p.rotate(tilt + (1 - shown) * (bell.x < 0 ? -1.45 : 1.45))
    const crown = hang - bell.h
    outline(p, INK, weight * 0.55)
    p.stroke(deep(IRON, 0.1))
    p.line(0, 0, 0, crown * k)
    solid(p, INK, fine, accent)
    p.rect(0, 0.015 * k, 0.12 * k, 0.03 * k, 0.01 * k)
    const lit = fresh > 0 ? mixHex(bronze, pale(bronze, 0.6), 0.7 * fresh) : bronze
    p.translate(0, crown * k)
    bellShape(p, k, weight, bell.a, bell.h, lit, inside, accent)
    p.pop()

    // The hammer: standing on its pivot, its head at the lip, its tail on the drum.
    p.push()
    p.translate(pivotX * k, pivotY * k)
    p.rotate(phi)
    const hx = bell.x + bell.a + GAP + 0.06 - pivotX
    const hy = mouth - 0.04 - pivotY
    outline(p, INK, weight * 0.9)
    p.line(-TAIL * k, 0, 0, 0)
    p.line(0, 0, hx * k, hy * k)
    p.translate(hx * k, hy * k)
    p.rotate(Math.atan2(hy, hx) + Math.PI / 2)
    solid(p, INK, fine, accent)
    p.rect(0, 0, 0.12 * k, 0.07 * k, 0.018 * k)
    p.pop()
    solid(p, INK, fine * 0.8, brass)
    p.circle(pivotX * k, pivotY * k, 0.035 * k)
  })
}

/** A toothed wheel, face on: its disc, its teeth, three spokes and a hub. */
function cog(p: p5, k: number, weight: number, x: number, y: number, r: number, teeth: number, turn: number, fill: string): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(turn)
  outline(p, INK, weight * 1.1)
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * 2 * Math.PI
    p.line(Math.cos(a) * (r - 0.02) * k, Math.sin(a) * (r - 0.02) * k, Math.cos(a) * (r + 0.025) * k, Math.sin(a) * (r + 0.025) * k)
  }
  solid(p, INK, weight * 0.8, fill)
  p.circle(0, 0, 2 * (r - 0.012) * k)
  outline(p, INK, weight * 0.6)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 2 * Math.PI
    p.line(Math.cos(a) * 0.02 * k, Math.sin(a) * 0.02 * k, Math.cos(a) * (r - 0.03) * k, Math.sin(a) * (r - 0.03) * k)
  }
  p.pop()
  solid(p, INK, weight * 0.6, pale(IRON, 0.3))
  p.circle(x * k, y * k, Math.min(0.045, r * 0.6) * k)
}

/** A bell, its crown's top middle at the origin, hanging down: shoulder, waist, flared lip and an open mouth. */
function bellShape(p: p5, k: number, weight: number, a: number, h: number, fill: string, inside: string, band: string): void {
  const c = 0.44 * a
  solid(p, INK, weight, fill)
  p.beginShape()
  p.vertex(-c * k, 0)
  p.bezierVertex(-0.4 * c * k, -0.06 * h * k, 0.4 * c * k, -0.06 * h * k, c * k, 0)
  p.bezierVertex((c + 0.15 * a) * k, 0, 0.62 * a * k, 0.1 * h * k, 0.62 * a * k, 0.32 * h * k)
  p.bezierVertex(0.62 * a * k, 0.56 * h * k, 0.7 * a * k, 0.76 * h * k, 0.88 * a * k, 0.87 * h * k)
  p.bezierVertex(0.97 * a * k, 0.92 * h * k, a * k, 0.95 * h * k, a * k, h * k)
  p.vertex(-a * k, h * k)
  p.bezierVertex(-a * k, 0.95 * h * k, -0.97 * a * k, 0.92 * h * k, -0.88 * a * k, 0.87 * h * k)
  p.bezierVertex(-0.7 * a * k, 0.76 * h * k, -0.62 * a * k, 0.56 * h * k, -0.62 * a * k, 0.32 * h * k)
  p.bezierVertex(-0.62 * a * k, 0.1 * h * k, -(c + 0.15 * a) * k, 0, -c * k, 0)
  p.endShape(p.CLOSE)
  // A band round the shoulder.
  outline(p, INK, weight * 0.45)
  p.stroke(band)
  p.strokeWeight(weight * 1.4)
  p.line(-0.58 * a * k, 0.26 * h * k, 0.58 * a * k, 0.26 * h * k)
  // The mouth: open, seen a little from below.
  solid(p, INK, weight * 0.8, inside)
  p.ellipse(0, h * k, 1.9 * a * k, 0.22 * a * k)
}
