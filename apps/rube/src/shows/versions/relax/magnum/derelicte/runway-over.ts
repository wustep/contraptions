import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { bloom, glint, rgba } from '../cast'
import { type frame } from '../kit'
import { DERELICTE } from '../worlds'
import { FLOOR_Y, RUNWAY } from './geo'
import { derekAt, DEREK_LOOK, HANSEL_LOOK, HEAP, heapAt, LET_GO, MAGNUM, powerAt, STAR_R, starAt, starSpeed, STOP, THROW, worksAt } from './runway-clock'
import { drawFireGlow, drawWindowSpill, TRUSS } from './set-hall'

const TRUSS_LOW = TRUSS.low
import { TOWER_COMPANY } from './tower'
import type { Ink } from './set-hall'

/**
 * What stands in front of the balls at Derelicte (the runway builder's): the heap of bags (hanging over the runway's
 * end, falling, and the lump it makes of Mugatu), the throwing star, and the looks.
 */

type Frame = ReturnType<typeof frame>

/** The heap's outline, about its bottom middle, 0..1 around: gathered to a knot at the top while it hangs, a mound once down. */
function heapOutline(u: number, squash: number, jig: number): [number, number] {
  const th = u * Math.PI * 2 - Math.PI / 2
  const lump = 1 + 0.075 * Math.sin(3 * th + 0.5) + 0.05 * Math.sin(5 * th + 1.3) + 0.035 * Math.sin(8 * th + 2.1)
  // Hanging: a sack, narrow at its knot. Down: wide and low, flat on the boards.
  const W = 0.76 + 0.16 * squash + jig * 0.5
  const H = 0.62 - 0.22 * squash - jig * 0.4
  const pinch = 1 - 0.25 * (1 - squash) * Math.pow(Math.max(0, -Math.sin(th)), 3)
  const x = W * Math.cos(th) * lump * pinch
  const y = -H + H * Math.max(-1, Math.min(1, Math.sin(th) * lump * (1 + 1.6 * squash)))
  return [x, y]
}

/** The swag, hanging: a batten on two lines from the roof, a net of bags slung under it; the lurch drops its left end. */
function drawSwag(p: p5, k: number, lurch: number, sway: number, ink: Ink): void {
  const X = (v: number) => v * k
  const x0 = HEAP.x - HEAP.w
  const x1 = HEAP.x + HEAP.w
  const top = HEAP.top
  p.push()
  // Its lines up into the dark of the roof, and the batten.
  p.stroke(rgba(DERELICTE.paperShade, 0.45))
  p.strokeWeight(Math.max(1, X(0.02)))
  p.line(X(x0 + 0.1), X(top), X(x0 + 0.1), X(TRUSS_LOW))
  p.line(X(x1 - 0.1), X(top), X(x1 - 0.1), X(TRUSS_LOW))
  p.stroke(mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.3))
  p.strokeWeight(Math.max(1, X(0.07)))
  p.line(X(x0 - 0.05), X(top), X(x1 + 0.05), X(top))
  // The net and its bags: a hammock of them, sagging, its left end let down by the slipping line.
  const n = 26
  const drop = lurch * 3.2
  const edge = (u: number): number => top + 0.05 + drop * (1 - u) * (1 - u)
  const under = (u: number): number => edge(u) + (HEAP.bottom - top) * Math.pow(Math.sin(Math.PI * u), 0.75) + 0.05 * Math.sin(u * 19 + 1) * Math.sin(Math.PI * u)
  solid(p, ink.ink, ink.weight * 0.5, DERELICTE.bag)
  p.beginShape()
  for (let i = 0; i <= n; i++) {
    const u = i / n
    p.vertex(X(x0 + (x1 - x0) * u + sway), X(edge(u) + 0.04 * Math.sin(u * 23)))
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n
    p.vertex(X(x0 + (x1 - x0) * u + sway), X(under(u)))
  }
  p.endShape(p.CLOSE)
  // The plastic's sheen in its folds, a little newspaper, the net over it.
  p.noFill()
  p.stroke(rgba(DERELICTE.bagSheen, 0.9))
  p.strokeWeight(Math.max(1, X(0.025)))
  for (const u of [0.22, 0.45, 0.63, 0.8]) {
    const x = x0 + (x1 - x0) * u + sway
    p.line(X(x - 0.08), X(edge(u) + 0.12), X(x + 0.05), X(under(u) - 0.1))
  }
  p.stroke(rgba(DERELICTE.paperShade, 0.4))
  p.strokeWeight(Math.max(1, X(0.015)))
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    const x = x0 + (x1 - x0) * u + sway
    p.line(X(x), X(edge(u)), X(x + 0.15), X(under(Math.min(1, u + 0.07))))
  }
  p.noStroke()
  p.fill(rgba(DERELICTE.paper, 0.75))
  for (const u of [0.3, 0.68]) {
    const x = x0 + (x1 - x0) * u + sway
    const y = under(u) - 0.08
    p.quad(X(x - 0.08), X(y - 0.04), X(x + 0.09), X(y - 0.06), X(x + 0.07), X(y + 0.05), X(x - 0.09), X(y + 0.04))
  }
  p.pop()
}

export function drawHeap(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  if (HEAP.x + 2.5 < f.x0 || HEAP.x - 2.5 > f.x1) return
  const h = heapAt(t)
  if (t < LET_GO) {
    drawSwag(p, k, h.drop, h.sway, ink)
    return
  }
  // Let go: the batten stays, the empty net hangs from its right end, and the bags come down as one heap.
  p.push()
  p.stroke(mixHex(DERELICTE.steelDark, DERELICTE.roof, 0.3))
  p.strokeWeight(Math.max(1, X(0.07)))
  p.line(X(HEAP.x - HEAP.w - 0.05), X(HEAP.top), X(HEAP.x + HEAP.w + 0.05), X(HEAP.top))
  p.stroke(rgba(DERELICTE.paperShade, 0.45))
  p.strokeWeight(Math.max(1, X(0.02)))
  p.line(X(HEAP.x - HEAP.w + 0.1), X(HEAP.top), X(HEAP.x - HEAP.w + 0.1), X(TRUSS_LOW))
  p.line(X(HEAP.x + HEAP.w - 0.1), X(HEAP.top), X(HEAP.x + HEAP.w - 0.1), X(TRUSS_LOW))
  const swing = Math.sin(Math.min(8, (t - LET_GO) * 5)) * Math.exp(-(t - LET_GO) / 1.5) * 0.25
  p.line(X(HEAP.x + HEAP.w), X(HEAP.top), X(HEAP.x + HEAP.w - 0.25 + swing), X(HEAP.top + 1.05))
  p.line(X(HEAP.x + HEAP.w - 0.15), X(HEAP.top), X(HEAP.x + HEAP.w - 0.4 + swing), X(HEAP.top + 0.95))
  p.pop()
  const s = h.squash
  const bottom = s > 0 ? -0.13 + (RUNWAY.top + 0.01 - -0.13) * s : HEAP.bottom + h.drop
  // Out of the net it gathers from the swag's spread into a heap as it falls.
  const gather = Math.min(1, (t - LET_GO) / 0.22)
  const wide = 1 + 0.45 * (1 - gather)
  const cx = HEAP.x
  const jig = s > 0 ? h.sway : 0
  const n = 40
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const [x, y] = heapOutline(i / n, s, jig)
    pts.push([cx + x * wide, bottom + y * (0.75 + 0.25 * gather)])
  }
  const topY = Math.min(...pts.map((q) => q[1]))
  p.push()
  solid(p, ink.ink, ink.weight * 0.7, DERELICTE.bag)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
  // Folds and sheen: the plastic catching the light in creases.
  p.noFill()
  p.stroke(rgba(DERELICTE.bagSheen, 1))
  p.strokeWeight(Math.max(1, X(0.03)))
  const H = bottom - topY
  const creases: [number, number, number, number][] = [
    [-0.42, 0.62, -0.18, 0.2],
    [0.28, 0.7, 0.46, 0.3],
    [-0.08, 0.86, 0.06, 0.52],
    [0.1, 0.35, 0.34, 0.12],
  ]
  for (const [ax, ay, bx, by] of creases) {
    const sx = (1 + 0.2 * s) * wide
    p.bezier(X(cx + ax * sx), X(bottom - ay * H), X(cx + (ax * 0.6 + bx * 0.4) * sx + 0.06), X(bottom - (ay * 0.5 + by * 0.5) * H), X(cx + (ax * 0.3 + bx * 0.7) * sx - 0.04), X(bottom - (ay * 0.3 + by * 0.7) * H), X(cx + bx * sx), X(bottom - by * H))
  }
  // Newspaper stuffed in among the bags.
  p.noStroke()
  const papers: [number, number, number][] = [
    [-0.62, 0.3, -0.5],
    [0.6, 0.45, 0.6],
    [0.18, 0.95, -0.2],
  ]
  for (const [dx, hy, a] of papers) {
    p.push()
    p.translate(X(cx + dx * (1 + 0.2 * s) * wide), X(bottom - hy * H))
    p.rotate(a)
    p.fill(DERELICTE.paper)
    p.quad(X(-0.1), X(-0.05), X(0.12), X(-0.08), X(0.1), X(0.07), X(-0.12), X(0.06))
    p.fill(DERELICTE.paperShade)
    p.triangle(X(0.02), X(-0.07), X(0.12), X(-0.08), X(0.1), X(0.07))
    p.pop()
  }
  p.pop()
}

/** The four-pointed star: steel, its points sharp, a hole in its middle. */
export function drawStar(p: p5, k: number, f: Frame, t: number, ink: Ink): void {
  const X = (v: number) => v * k
  const s = starAt(t)
  if (s.show <= 0) return
  const [x, y] = s.at
  if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) return
  // The light it catches: the show's, the fires' in the dark after the plug, the house's cold after the band.
  const dark = t < STOP ? 0 : (1 - powerAt(t)) * (1 - Math.min(1, worksAt(t)))
  const lit = mixHex(DERELICTE.star, DERELICTE.fire, 0.45 * dark)
  // In flight, a soft streak behind it along its way: air, never dots.
  const v = starSpeed(t)
  if (v > 0.05) {
    const back = starAt(Math.max(THROW, t - 0.18)).at
    const dx = x - back[0]
    const dy = y - back[1]
    const L = Math.hypot(dx, dy)
    if (L > 0.02) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const nx = -dy / L
      const ny = dx / L
      const w = STAR_R * 0.9
      const g = ctx.createLinearGradient(X(x), X(y), X(back[0]), X(back[1]))
      g.addColorStop(0, rgba(lit, 0.32))
      g.addColorStop(1, rgba(lit, 0))
      ctx.save()
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(X(x + nx * w), X(y + ny * w))
      ctx.lineTo(X(back[0]), X(back[1]))
      ctx.lineTo(X(x - nx * w), X(y - ny * w))
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }
  p.push()
  // Stuck, its lower point is in the boards.
  if (s.stuck) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    ctx.rect(X(x - 1), X(y - 1), X(2), X(FLOOR_Y - (y - 1)))
    ctx.clip()
  }
  p.translate(X(x), X(y))
  p.rotate(s.angle)
  const R = STAR_R
  const r = R * 0.34
  // Steel, outlined dark: a blade, not a sparkle.
  solid(p, DERELICTE.steelDark, ink.weight * 0.8, mixHex(DERELICTE.star, DERELICTE.steel, 0.45))
  p.beginShape()
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const b = a + Math.PI / 4
    p.vertex(X(Math.cos(a) * R), X(Math.sin(a) * R))
    p.vertex(X(Math.cos(b) * r), X(Math.sin(b) * r))
  }
  p.endShape(p.CLOSE)
  // Each point's bevel, lit on one side.
  p.noStroke()
  p.fill(lit)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const b = a + Math.PI / 4
    p.triangle(0, 0, X(Math.cos(a) * R * 0.92), X(Math.sin(a) * R * 0.92), X(Math.cos(b) * r * 0.9), X(Math.sin(b) * r * 0.9))
  }
  p.fill(DERELICTE.vinyl)
  p.circle(0, 0, X(0.05))
  p.pop()
  // The fire's light on its steel while the look holds it.
  if (t >= MAGNUM && t < MAGNUM + 0.55) bloom(p, k, [x, y], 0.4, lit, 0.14)
}

/** The looks: Magnum (the only one over 0.6), and Derek's for the press at the end. */
export function drawLooks(p: p5, k: number, t: number): void {
  const at = (q: Pt): Pt => [q[0] + 0.09, q[1] - 0.09]
  if (t >= MAGNUM - 0.01 && t < MAGNUM + 0.6) glint(p, k, at(derekAt(MAGNUM)), t - MAGNUM, 0.9)
  if (t >= DEREK_LOOK - 0.01 && t < DEREK_LOOK + 0.6) glint(p, k, at(derekAt(DEREK_LOOK)), t - DEREK_LOOK, 0.4)
  // Hansel's, for the press, a bar after Derek's (he is the tower's, but the pose is the runway's).
  if (t >= HANSEL_LOOK - 0.01 && t < HANSEL_LOOK + 0.6) {
    const span = TOWER_COMPANY.find((c) => c.who === 'hansel' && HANSEL_LOOK >= c.from && HANSEL_LOOK < c.to)
    const h = span?.at(HANSEL_LOOK)
    if (h) glint(p, k, at([h.x, h.y]), t - HANSEL_LOOK, 0.4)
  }
}

/**
 * The plug is the lights: once the show's rig is dead the hall goes dark over everything (the tower too), but for the
 * fires, and a little night through the high windows; after the band, the house's work lamps light it flat and cold.
 */
export function drawDarkness(p: p5, k: number, f: Frame, t: number): void {
  if (t < STOP) return
  const works = Math.min(1, worksAt(t))
  const dark = (1 - powerAt(t)) * (1 - 0.82 * works)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x0 = (f.x0 - 1) * k
  const y0 = (f.y0 - 1) * k
  const w = (f.x1 - f.x0 + 2) * k
  const h = (f.y1 - f.y0 + 2) * k
  ctx.save()
  if (dark > 0.01) {
    ctx.fillStyle = rgba(DERELICTE.roof, 0.55 * dark)
    ctx.fillRect(x0, y0, w, h)
  }
  if (works > 0.01) {
    ctx.fillStyle = rgba(DERELICTE.star, 0.085 * works)
    ctx.fillRect(x0, y0, w, h)
  }
  ctx.restore()
  drawFireGlow(p, k, f, t, Math.max(0, dark))
  drawWindowSpill(p, k, f, t)
}
