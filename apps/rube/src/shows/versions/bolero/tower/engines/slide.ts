import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import type { Engine } from './kit'
import { BAR, BEAT, T0, swell } from '../music'
import { BRASS, GOLD, INK, IRON, clamp, deep, easeOut, pale, smooth } from '../look'

/**
 * The trombone: two slides, one either side of the mast, lying on their sides with their bells to the walls. A pair
 * of cranks on the mast, geared together so they turn opposite ways, push them out on each downbeat and draw them
 * back on the third beat, half a turn a glide, both at once: the storey breathes out and in with the strings'
 * "boom ... ba". Each slide is a brass U that telescopes over a fixed pair of silver tubes, so the silver shows as it
 * goes out. The cranks' pins sit in slots and move out along them as the orchestra grows, so the slides travel
 * further.
 *
 * Until the engine is let in, a dog on the mast sits down between the two gears and holds them; it swings up out of
 * the mesh as the engine is let in, and the slides go out on the next downbeat.
 */

/** The cranks: two gears touching at the mast. */
const G = 0.38
/** The rods' length, crank pin to slide grip. */
const ROD = 1.45
/** The trombone, on the right (the left is its mirror): the back bend's straight end, the bell's flare and rim. */
const BACK = 1.12
const FLARE = 2.3
const RIM = 3.35
const BELL_R = 0.26
const INNER_END = 4.32
const OUTER = 3.1
/** How long a glide takes to settle (a critically damped step, this its time constant). */
const GLIDE = 0.1

/** The crank pin's radius in its slot: the slides' half travel. */
const throwOf = (amp: number): number => 0.14 + 0.19 * clamp((amp - 0.6) / 0.38)

/** A glide from rest to rest: critically damped, so it starts on the beat without a jolt and settles without a bounce. */
const glide = (s: number): number => (s <= 0 ? 0 : 1 - (1 + s / GLIDE) * Math.exp(-s / GLIDE))

/**
 * The cranks' turn (radians, pin inward at pi): half a turn out on each downbeat and half a turn back on beat three,
 * from the first downbeat after the dog is out of the mesh. Each glide is scaled to finish by the next beat.
 */
function crankTurn(t: number, at: number): number {
  const first = T0 + Math.ceil((at + 0.9 - T0) / BAR) * BAR
  const s = Math.min(t, 844.99) - first
  if (s < 0) return Math.PI
  const m = Math.floor(s / BAR)
  const r = s - m * BAR
  const out = r < 2 * BEAT
  const n = out ? 2 * m + 1 : 2 * m + 2
  const since = out ? r : r - 2 * BEAT
  const gap = out ? 2 * BEAT : BAR - 2 * BEAT
  return Math.PI + Math.PI * (n - 1 + glide(since) / glide(gap))
}

/** A tube along a path: an ink stroke with the fill's narrower stroke over it. */
function tube(p: p5, pts: [number, number][], d: number, fill: string, k: number, w: number): void {
  p.push()
  p.noFill()
  p.strokeJoin(p.ROUND)
  for (const [col, wt] of [[INK, d * k + 2 * w], [fill, d * k]] as [string, number][]) {
    p.stroke(col)
    p.strokeWeight(wt)
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.endShape()
  }
  p.pop()
}

/** Points round a half circle about (cx, cy) from angle a0 to a1. */
function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 10): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

export const slide: Engine = (p, c, _st, t, e) => {
  if (e.open < 0.75) return
  const { k, weight } = c
  const grow = easeOut(smooth(e.open, 0.75, 1))
  const tint = (hex: string): string => (e.gold > 0 ? mixHex(hex, GOLD, 0.5 * e.gold) : hex)
  const at = t - e.since
  const { y0 } = e.box

  // Heights: the bell's tube, the slide's two legs and the rod's line between them, the cranks' middle.
  const yb = y0 + 0.28
  const yu = y0 + 0.74
  const yl = y0 + 0.92
  const ym = (yu + yl) / 2
  const yc = y0 + 0.52

  const rho = throwOf(swell(Math.max(at, Math.min(t, 845))))
  const phi = crankTurn(t, at)
  const pin = { x: G + rho * Math.cos(phi), y: yc + rho * Math.sin(phi) }
  // Where the rod puts the slide's grip, on its line.
  const gripX = pin.x + Math.sqrt(ROD * ROD - (ym - pin.y) ** 2)
  const xg = gripX - 0.1

  const brass = tint(BRASS)
  const silver = pale(IRON, 0.55)
  const terracotta = tint(e.color)

  p.push()
  // The storey's unfold: the whole engine grows out of the mast.
  p.translate(0, yc * k)
  p.scale(grow)
  p.translate(0, -yc * k)

  // The gears on the mast: two cranks on a plate bolted across it, touching, turning opposite ways.
  solid(p, INK, weight, pale(IRON, 0.35))
  p.rectMode(p.CORNERS)
  p.rect(-0.55 * k, (yc - 0.3) * k, 0.55 * k, (yc + 0.3) * k, 0.06 * k)
  for (const side of [1, -1]) {
    const a = side > 0 ? phi : Math.PI - phi
    const cx = side * G
    p.push()
    p.translate(cx * k, yc * k)
    solid(p, INK, weight, terracotta)
    p.circle(0, 0, 2 * G * k)
    outline(p, INK, weight * 0.8)
    const teeth = 16
    const phase = side > 0 ? a : a + Math.PI / teeth
    for (let j = 0; j < teeth; j++) {
      const q = phase + (2 * Math.PI * j) / teeth
      p.line(Math.cos(q) * G * k, Math.sin(q) * G * k, Math.cos(q) * (G + 0.04) * k, Math.sin(q) * (G + 0.04) * k)
    }
    // The slot the pin rides in, and a rim line inside the teeth.
    p.noFill()
    p.stroke(tint(deep(e.color, 0.35)))
    p.strokeWeight(weight * 0.6)
    p.circle(0, 0, 2 * (G - 0.05) * k)
    p.stroke(INK)
    p.strokeWeight(0.07 * k + 2 * weight * 0.6)
    p.line(Math.cos(a) * 0.08 * k, Math.sin(a) * 0.08 * k, Math.cos(a) * 0.34 * k, Math.sin(a) * 0.34 * k)
    p.stroke(tint(deep(e.color, 0.55)))
    p.strokeWeight(0.07 * k)
    p.line(Math.cos(a) * 0.08 * k, Math.sin(a) * 0.08 * k, Math.cos(a) * 0.34 * k, Math.sin(a) * 0.34 * k)
    solid(p, INK, weight * 0.8, brass)
    p.circle(0, 0, 0.12 * k)
    p.pop()
  }

  // The pawls on the mast: one down in each gear's teeth until the engine is let in, then lifted clear.
  const lift = 0.6 * smooth(e.since, 0, 0.7)
  for (const side of [1, -1]) {
    p.push()
    p.scale(side, 1)
    const px = 0.07
    const py = y0 + 0.05
    const a = Math.atan2(0.094, 0.163) - lift
    const len = 0.17
    p.translate(px * k, py * k)
    p.rotate(a)
    solid(p, INK, weight * 0.8, IRON)
    p.beginShape()
    p.vertex(0, -0.035 * k)
    p.vertex(len * k, -0.012 * k)
    p.vertex((len + 0.035) * k, 0.02 * k)
    p.vertex(len * k, 0.03 * k)
    p.vertex(0, 0.035 * k)
    p.endShape(p.CLOSE)
    solid(p, INK, weight * 0.6, brass)
    p.circle(0, 0, 0.055 * k)
    p.pop()
  }

  // The two trombones, the left one the right's mirror.
  for (const side of [1, -1]) {
    p.push()
    p.scale(side, 1)
    // The bell section: from the upper leg's back end round the back bend and out along the top to the bell.
    const rb = (yu - yb) / 2
    tube(p, [...arcPts(BACK, (yu + yb) / 2, rb, Math.PI / 2, (3 * Math.PI) / 2, 12), [FLARE + 0.04, yb]], 0.075, brass, k, weight * 0.8)
    // The bell's flare and its mouth.
    const prof: [number, number][] = []
    for (let i = 0; i <= 10; i++) {
      const s = i / 10
      prof.push([FLARE + (RIM - FLARE) * s, 0.0375 + (BELL_R - 0.0375) * s ** 2.6])
    }
    solid(p, INK, weight, brass)
    p.beginShape()
    for (const [x, r] of prof) p.vertex(x * k, (yb - r) * k)
    for (let i = prof.length - 1; i >= 0; i--) p.vertex(prof[i][0] * k, (yb + prof[i][1]) * k)
    p.endShape(p.CLOSE)
    solid(p, INK, weight, tint(deep(e.color, 0.3)))
    p.ellipse(RIM * k, yb * k, 0.09 * k, 2 * BELL_R * k)
    // The fixed inner slide: two silver tubes, the mouthpiece on the lower, a brace at the back.
    tube(p, [[BACK, yu], [INNER_END, yu]], 0.05, silver, k, weight * 0.7)
    tube(p, [[BACK - 0.13, yl], [INNER_END, yl]], 0.05, silver, k, weight * 0.7)
    solid(p, INK, weight * 0.7, brass)
    p.quad((BACK - 0.13) * k, (yl - 0.025) * k, (BACK - 0.13) * k, (yl + 0.025) * k, (BACK - 0.22) * k, (yl + 0.05) * k, (BACK - 0.22) * k, (yl - 0.05) * k)
    solid(p, INK, weight * 0.8, terracotta)
    p.rectMode(p.CORNERS)
    p.rect((BACK + 0.06) * k, (yu - 0.02) * k, (BACK + 0.12) * k, (yl + 0.02) * k, 0.015 * k)
    // The slide: a brass U over the silver, out and in with its grip.
    const xu = xg + OUTER
    tube(p, [[xg, yu], [xu, yu], ...arcPts(xu, ym, (yl - yu) / 2, -Math.PI / 2, Math.PI / 2, 10), [xg, yl]], 0.078, brass, k, weight * 0.8)
    solid(p, INK, weight * 0.7, tint(deep(BRASS, 0.2)))
    p.rect((xg - 0.02) * k, (yu - 0.055) * k, (xg + 0.05) * k, (yu + 0.055) * k, 0.01 * k)
    p.rect((xg - 0.02) * k, (yl - 0.055) * k, (xg + 0.05) * k, (yl + 0.055) * k, 0.01 * k)
    solid(p, INK, weight * 0.8, terracotta)
    p.rect((gripX - 0.035) * k, (yu - 0.01) * k, (gripX + 0.035) * k, (yl + 0.01) * k, 0.015 * k)
    // The rod from the crank pin to the grip.
    outline(p, INK, 0.055 * k + 2 * weight * 0.7)
    p.line(pin.x * k, pin.y * k, gripX * k, ym * k)
    p.stroke(tint(pale(IRON, 0.25)))
    p.strokeWeight(0.055 * k)
    p.line(pin.x * k, pin.y * k, gripX * k, ym * k)
    solid(p, INK, weight * 0.7, brass)
    p.circle(pin.x * k, pin.y * k, 0.075 * k)
    p.circle(gripX * k, ym * k, 0.06 * k)
    p.pop()
  }
  p.pop()
}
