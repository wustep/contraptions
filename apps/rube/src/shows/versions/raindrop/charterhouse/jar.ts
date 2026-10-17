import type { Pt } from '../../../../parts'
import { R } from '../../../../parts'
import { bar, clamp, disc, line, mix, oval, poly, rect, rgba, stroke, turn, type Brush } from './brush'
import { GUTTER, JAR, gutterY } from './geo'
import { G } from './path'
import { DRIPS, at, dripIndex } from './music'
import { tones } from './look'

/**
 * The starter. The end tile of the eave drips on every eighth (the prelude's A-flat) into a glass jar hung from a
 * lever; the lever's other arm holds a latch across the gutter, and the ball waits behind it. Eight bars of drops
 * fill the jar to where it outweighs the latch's spring: on bar 9's downbeat the lever drops, the latch lifts, and
 * the ball goes. The jar stays down after, and goes on taking the drip till it runs over, and the last drop of the
 * piece falls into it.
 */

/** Bar 9's downbeat: the lever hits its stop and the ball is let go. */
export const TIP = at(9, 0)
/** How long the lever takes to go over. */
const TIP_DUR = 0.32
/** How far it goes over, radians (the jar's end down). */
const TIP_ANGLE = -0.4

/** Where the ball waits, against the latch, and where the latch hangs. */
export const BALL_START: Pt = [GUTTER.x0 + 0.34, gutterY(GUTTER.x0 + 0.34) - R]
const LATCH: Pt = [BALL_START[0] + R + 0.07, gutterY(BALL_START[0]) - 0.48]

/** How far over the lever is at `t`, radians. */
export function leverAngle(t: number): number {
  const u = clamp((t - (TIP - TIP_DUR)) / TIP_DUR)
  // It goes over the way a weight drops: slowly, then all at once onto its stop, with a small knock back off it.
  const fall = u * u
  const knock = t > TIP ? Math.exp(-(t - TIP) * 9) * Math.sin((t - TIP) * 40) * 0.035 : 0
  return TIP_ANGLE * fall + knock
}

/** The latch's swing, radians: up and out of the ball's way as the lever's arm pulls on it. */
const latchAngle = (t: number): number => -1.15 * clamp((t - (TIP - 0.12)) / 0.2)

/** The hook's place (the jar hangs from it) at `t`. */
function hookAt(t: number): Pt {
  const [px, py] = JAR.pivot
  const a = leverAngle(t)
  return [px - Math.cos(a) * JAR.hook, py - Math.sin(a) * JAR.hook]
}

/** Where the water in the jar stands, as a share of its depth: a little more with every drop it has caught. */
function level(t: number): number {
  const first = dripIndex(0)
  const n = dripIndex(t) - first
  return clamp(0.1 + n * 0.0115, 0, 0.97)
}

/** The jar's mouth (top middle) at `t`. */
function mouthAt(t: number): Pt {
  const [hx, hy] = hookAt(t)
  return [hx, hy + JAR.hang]
}

/** Seconds a drop takes from the tile's lip to the water. */
function fallTime(t: number): number {
  const [, my] = mouthAt(t)
  const surface = my + JAR.h * (1 - level(t))
  return Math.sqrt((2 * Math.max(0.2, surface - JAR.lip[1])) / G)
}

/** The lever, its bracket, the latch and its wire: behind the ball. */
export function drawLever(b: Brush, t: number): void {
  const c = tones(t)
  const [px, py] = JAR.pivot
  const a = leverAngle(t)
  // The bracket: an iron arm from the wall to the pivot.
  bar(b, px, py, px + 0.05, py - 1.35, c.iron, 0.07)
  bar(b, px + 0.05, py - 1.35, px + 0.55, py - 1.35, c.iron, 0.07)
  // The lever: a stick of olive wood through the pivot.
  const ends = turn([[px - JAR.hook - 0.1, py], [px + JAR.arm + 0.12, py]], a, px, py)
  bar(b, ends[0][0], ends[0][1], ends[1][0], ends[1][1], c.wood, 0.1, 'round')
  disc(b, px, py, 0.08, c.iron)
  // The latch: a tin tongue on a pin over the gutter, hanging down in front of the ball.
  const la = latchAngle(t)
  const tongue = turn([[-0.035, 0], [0.035, 0], [0.035, 0.46], [-0.035, 0.46]], la, 0, 0, LATCH[0], LATCH[1])
  poly(b, tongue, c.iron)
  disc(b, LATCH[0], LATCH[1], 0.05, c.iron)
  // The wire from the lever's arm up to the latch's foot.
  const arm = turn([[px + JAR.arm, py]], a, px, py)[0]
  const foot = turn([[0, 0.42]], la, 0, 0, LATCH[0], LATCH[1])[0]
  line(b, arm[0], arm[1], foot[0], foot[1], c.iron, Math.max(1, b.k * 0.012))
}

/** The jar, its bail, the water in it and the ring each drop makes: in front of the lever. */
export function drawJar(b: Brush, t: number): void {
  const c = tones(t)
  const [hx, hy] = hookAt(t)
  const [mx, my] = mouthAt(t)
  const { w, h } = JAR
  // The bail: a wire from the hook to the jar's neck.
  line(b, hx, hy, mx - w * 0.85, my + 0.06, c.iron, Math.max(1, b.k * 0.012))
  line(b, hx, hy, mx + w * 0.85, my + 0.06, c.iron, Math.max(1, b.k * 0.012))
  // The glass: a squat jar, a little narrower at the neck.
  const body: Pt[] = [
    [mx - w * 0.82, my],
    [mx + w * 0.82, my],
    [mx + w * 0.86, my + 0.12],
    [mx + w, my + 0.26],
    [mx + w, my + h - 0.08],
    [mx + w - 0.08, my + h],
    [mx - w + 0.08, my + h],
    [mx - w, my + h - 0.08],
    [mx - w, my + 0.26],
    [mx - w * 0.86, my + 0.12],
  ]
  const glass = mix(c.glass, c.skyLow, 0.35)
  b.g.globalAlpha = 0.42
  poly(b, body, glass)
  b.g.globalAlpha = 1
  // The water.
  const lv = level(t)
  const sy = my + h * (1 - lv)
  const water = mix(c.water, c.glass, 0.25)
  const top = Math.max(sy, my + 0.12)
  const ww = sy < my + 0.26 ? w * 0.86 : w
  poly(b, [[mx - ww + 0.02, top], [mx + ww - 0.02, top], [mx + w - 0.02, Math.max(top, my + h - 0.1)], [mx + w - 0.1, my + h - 0.02], [mx - w + 0.1, my + h - 0.02], [mx - w + 0.02, Math.max(top, my + h - 0.1)]], water)
  line(b, mx - ww + 0.03, top, mx + ww - 0.03, top, mix(water, c.glass, 0.6), Math.max(1, b.k * 0.02))
  // The glass's edges and its neck's rim.
  stroke(b, body, mix(c.glass, c.ink, 0.35), Math.max(1, b.k * 0.018), true)
  rect(b, mx - w * 0.86, my - 0.03, mx + w * 0.86, my + 0.05, mix(c.glass, c.ink, 0.3))
  // A ring where each drop went in, spreading for a quarter second.
  const i = dripIndex(t)
  for (let j = i; j >= 0 && j > i - 2; j--) {
    const age = t - DRIPS[j]
    if (age < 0 || age > 0.3) continue
    const f = age / 0.3
    b.g.strokeStyle = rgba(mix(c.glass, c.skyLow, 0.2), 0.75 * (1 - f))
    b.g.lineWidth = Math.max(1, b.k * 0.014) * b.px
    b.g.beginPath()
    b.g.ellipse(mx, top, 0.06 + f * (ww - 0.1), 0.02 + f * 0.05, 0, 0, Math.PI * 2)
    b.g.stroke()
  }
  // Once it is full, each drop throws a little over the rim.
  if (lv >= 0.96) {
    for (let j = i; j >= 0 && j > i - 3; j--) {
      const age = t - DRIPS[j]
      if (age < 0 || age > 0.45) continue
      const side = j % 2 ? 1 : -1
      const x = mx + side * (w * 0.86 + age * 0.5)
      const y = my + 0.02 + age * age * G * 0.5 - age * 0.6
      oval(b, x, y, 0.035, 0.05, rgba(c.rain, 0.8 * (1 - age / 0.45)))
    }
  }
}

/** The drops falling from the end tile into the jar: one lands on every eighth. */
export function drawDrip(b: Brush, t: number): void {
  const c = tones(t)
  const [lx, ly] = JAR.lip
  const ft = fallTime(t)
  const i = dripIndex(t + ft)
  const col = rgba(mix(c.rain, c.glass, 0.4), 0.9)
  for (let j = i; j >= 0 && j > i - 3; j--) {
    const land = DRIPS[j]
    const u = (t - (land - ft)) / ft
    if (u < 0 || u > 1) continue
    const y = ly + 0.5 * G * (u * ft) * (u * ft)
    const v = G * u * ft
    const stretch = 1 + Math.min(1.6, v * 0.06)
    oval(b, lx, y, 0.045, 0.045 * stretch, col)
  }
  // The next drop gathering on the lip.
  const next = DRIPS[i + 1]
  if (next !== undefined) {
    const grow = clamp(1 - (next - ft - t) / 0.3)
    if (grow > 0) oval(b, lx, ly + 0.03 + grow * 0.03, 0.045 * grow, 0.05 * grow, col)
  }
}

export { R }
