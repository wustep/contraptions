import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha } from '../kit'
import { CHURCH, HOME, INK } from '../worlds'

/**
 * The ties of the tie machine (the ties builder's; `ties.ts`): five of them, one a morning, each from its decade, the
 * last a bow tie. Each comes on the machine as a set: a cream shirt collar with the tie already knotted under it, so
 * a tie on Carl reads at once as a collar and a tie on his front, and the same set hanging from the wheel reads as
 * the tie he will wear.
 *
 * Drawn in cells from the collar's top middle (`x, y`), the tie hanging down along `angle` (radians, clockwise on
 * the screen; 0 hangs straight down). Carl is 0.26 across, so the collar is about half his width and the tie ends a
 * little above his bottom edge.
 *
 * This file imports nothing from the cast or the part, so `cast.ts` may import `drawBowTie` from it without a cycle.
 */

export type TieKind = 'skinny' | 'striped' | 'knit' | 'loud' | 'bow'

export interface TieLook {
  kind: TieKind
  /** The blade's widest, in cells. */
  w: number
  color: string
  accent: string
}

/** The five, in the order the wheel brings them: the fifties to the old man's bow tie. */
export const TIES: TieLook[] = [
  { kind: 'skinny', w: 0.044, color: mixHex(INK, HOME.section, 0.25), accent: HOME.trim },
  { kind: 'striped', w: 0.058, color: CHURCH.glassRed, accent: HOME.trim },
  { kind: 'knit', w: 0.05, color: HOME.wood, accent: HOME.woodDark },
  { kind: 'loud', w: 0.098, color: HOME.yellow, accent: HOME.pink },
  { kind: 'bow', w: 0.13, color: mixHex(CHURCH.glassRed, INK, 0.58), accent: mixHex(CHURCH.glassRed, INK, 0.3) },
]

/** The bow tie: the last one she tied. */
export const BOW = TIES[4]

/** The collar: a cream band whose two points turn down either side of the knot. */
function collar(p: p5, k: number, weight: number, light: number): void {
  p.stroke(alpha(p, INK, 0.9 * light))
  p.strokeWeight(weight * 0.5)
  p.fill(alpha(p, HOME.trim, light))
  p.beginShape()
  p.vertex(-0.074 * k, 0)
  p.vertex(0.074 * k, 0)
  p.vertex(0.062 * k, 0.05 * k)
  p.vertex(0.013 * k, 0.024 * k)
  p.vertex(-0.013 * k, 0.024 * k)
  p.vertex(-0.062 * k, 0.05 * k)
  p.endShape(p.CLOSE)
}

/** The blade's outline, in pixels: from under the knot, widening, to its point (or a knit tie's square end). */
function bladePath(look: TieLook, k: number): [number, number][] {
  const half = look.w / 2
  const top = 0.048
  const neck = 0.015
  if (look.kind === 'knit') {
    return [
      [-neck, top],
      [neck, top],
      [half, 0.2],
      [half, 0.218],
      [-half, 0.218],
      [-half, 0.2],
    ].map(([x, y]) => [x * k, y * k])
  }
  const low = look.kind === 'loud' ? 0.186 : 0.19
  const tip = look.kind === 'loud' ? 0.232 : 0.226
  return [
    [-neck, top],
    [neck, top],
    [half, low],
    [0, tip],
    [-half, low],
  ].map(([x, y]) => [x * k, y * k])
}

/** The pattern on the blade, clipped to it. */
function pattern(p: p5, look: TieLook, k: number, weight: number, light: number): void {
  const half = look.w / 2
  p.noFill()
  if (look.kind === 'striped') {
    // Regimental stripes, running down to the left.
    p.stroke(alpha(p, look.accent, 0.95 * light))
    p.strokeWeight(0.012 * k)
    for (let i = -2; i <= 8; i++) {
      const y = 0.04 + i * 0.034
      p.line(-half * 1.4 * k, (y + 0.03) * k, half * 1.4 * k, (y - 0.03) * k)
    }
  } else if (look.kind === 'knit') {
    // The knit's ribs across it.
    p.stroke(alpha(p, look.accent, 0.8 * light))
    p.strokeWeight(weight * 0.4)
    for (let y = 0.07; y < 0.215; y += 0.018) p.line(-half * k, y * k, half * k, y * k)
  } else if (look.kind === 'loud') {
    // Big chevrons: the one he wore in the seventies.
    p.stroke(alpha(p, look.accent, light))
    p.strokeWeight(0.016 * k)
    for (let y = 0.075; y < 0.24; y += 0.05) {
      p.line(-half * k, (y - 0.02) * k, 0, (y + 0.012) * k)
      p.line(0, (y + 0.012) * k, half * k, (y - 0.02) * k)
    }
  } else {
    // The skinny tie: plain, one lighter line of its sheen.
    p.stroke(alpha(p, look.accent, 0.55 * light))
    p.strokeWeight(weight * 0.45)
    p.line(-0.004 * k, 0.07 * k, -0.01 * k, 0.19 * k)
  }
}

/**
 * A collar and tie at (`x`, `y`) in cells (the collar's top middle), hanging along `angle`. `snug` 0..1: how far the
 * knot has been pushed up under the collar (she snugs it on the downbeat).
 */
export function drawTie(p: p5, k: number, weight: number, look: TieLook, x: number, y: number, angle = 0, snug = 1, light = 1): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  if (look.kind === 'bow') {
    collar(p, k, weight, light)
    bowAt(p, k, weight, look, 0.042 + (1 - snug) * 0.012, light)
    p.pop()
    return
  }
  // Loose, the knot sits a little low and the blade with it.
  p.translate(0, (1 - snug) * 0.014 * k)
  const path = bladePath(look, k)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.55)
  p.fill(alpha(p, look.color, light))
  p.beginShape()
  for (const [px, py] of path) p.vertex(px, py)
  p.endShape(p.CLOSE)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  path.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  ctx.clip()
  pattern(p, look, k, weight, light)
  ctx.restore()
  // The outline again over the pattern's ends.
  p.noFill()
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.55)
  p.beginShape()
  for (const [px, py] of path) p.vertex(px, py)
  p.endShape(p.CLOSE)
  // The knot: a small tapered block under the collar.
  p.fill(alpha(p, mixHex(look.color, INK, 0.12), light))
  p.quad(-0.025 * k, 0.012 * k, 0.025 * k, 0.012 * k, 0.016 * k, 0.052 * k, -0.016 * k, 0.052 * k)
  p.translate(0, -(1 - snug) * 0.014 * k)
  collar(p, k, weight, light)
  p.pop()
}

/**
 * The bow: a knot and two wings flaring out from it, the shape every bow tie has (narrow at the knot, widest at the
 * ends), `y` below the collar's top (translated and turned already). It sits in the collar's V where the long ties'
 * knots sit, inside Carl's square: nothing of it rises above his top edge, and it is dark and small enough that it
 * never reads as a pair of eyes on him.
 */
function bowAt(p: p5, k: number, weight: number, look: TieLook, y: number, light: number): void {
  const half = look.w / 2
  const knot = 0.013
  const end = 0.024
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.5)
  p.fill(alpha(p, look.color, light))
  for (const side of [-1, 1]) {
    p.beginShape()
    p.vertex(side * knot * k, (y - knot * 0.8) * k)
    p.bezierVertex(side * half * 0.5 * k, (y - end * 0.8) * k, side * half * 0.85 * k, (y - end) * k, side * half * k, (y - end) * k)
    p.bezierVertex(side * half * 0.9 * k, (y - end * 0.3) * k, side * half * 0.9 * k, (y + end * 0.3) * k, side * half * k, (y + end) * k)
    p.bezierVertex(side * half * 0.85 * k, (y + end) * k, side * half * 0.5 * k, (y + end * 0.8) * k, side * knot * k, (y + knot * 0.8) * k)
    p.endShape(p.CLOSE)
    // A fold in each wing, toward the knot.
    p.stroke(alpha(p, look.accent, 0.7 * light))
    p.strokeWeight(weight * 0.35)
    p.line(side * 0.024 * k, y * k, side * half * 0.62 * k, (y - 0.006) * k)
    p.stroke(alpha(p, INK, light))
    p.strokeWeight(weight * 0.5)
  }
  p.fill(alpha(p, mixHex(look.color, INK, 0.25), light))
  p.rectMode(p.CENTER)
  p.rect(0, y * k, 0.026 * k, 0.03 * k, 0.006 * k)
}

/**
 * The bow tie on Carl, in the cast's own terms (for `cast.ts`, should the director keep it on him after the ties): at
 * Carl's centre (`x`, `y`) in PIXELS, turned `tilt`, flattened `squash` onto his bottom, as `drawCarl` draws him.
 */
export function drawBowTie(p: p5, k: number, weight: number, x: number, y: number, tilt = 0, squash = 0, scale = 1, light = 1): void {
  if (scale <= 0.02) return
  const half = 0.13
  const h = 2 * half * (1 - squash)
  p.push()
  p.translate(x, y)
  p.rotate(tilt)
  p.translate(0, (half - h) * k * scale)
  p.scale(scale)
  drawTie(p, k, weight, BOW, 0, 0, 0, 1, light)
  p.pop()
}
