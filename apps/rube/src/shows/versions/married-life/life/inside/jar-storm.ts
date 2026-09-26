import type p5 from 'p5'
import { mixHex, R } from '../../../../../parts'
import { alpha, frame, hash, type Ctx } from '../kit'
import { HOME, INK } from '../worlds'
import { BOARDS, HOLE, TOPPLE, TREE, bandageAt, boardAt, limbAt, smoothstep, stormAt } from './jar-clock'
import { INSIDE } from './inside'

/**
 * What the jar builder draws in front of everything (the part's `over`): the tree's limb through the roof into the
 * nursery (and the hole, and the boards that patch it), the plaster it brings down, the lightning over the house, and
 * the bandage round Carl's foot. INSIDE cells, show time `T`.
 */

const G = 12
/** The limb's root, out in the tree behind the house, and its tip where it comes to hang in the nursery. */
const ROOT: [number, number] = [11.9, -12.7]
const TIP: [number, number] = [7.7, -5.1]
const LEN = Math.hypot(TIP[0] - ROOT[0], TIP[1] - ROOT[1])
const REST = Math.atan2(TIP[1] - ROOT[1], TIP[0] - ROOT[0])
/** Where it went through the roof (just right of the ridge): patched from the last board on. */
const ROOF_HOLE: [number, number] = [10.74, -10.62]
const SLOPE = Math.atan2(3.8, 12.35)

/** The house's outline from outside (walls, eaves, roof): what the storm darkens round, not over. */
function housePath(ctx: CanvasRenderingContext2D, k: number): void {
  const [e0, e1] = INSIDE.eaves
  const [rx, ry] = INSIDE.ridge
  const pts: [number, number][] = [
    [INSIDE.backWall[0] - 0.08, INSIDE.ground + 0.32], [INSIDE.backWall[0] - 0.08, INSIDE.eavesY + 0.1], [e0 - 0.3, INSIDE.eavesY + 0.12],
    [rx, ry - 0.45], [e1 + 0.3, INSIDE.eavesY + 0.12], [INSIDE.frontWall[1] + 0.08, INSIDE.eavesY + 0.1], [INSIDE.frontWall[1] + 0.08, INSIDE.ground + 0.32],
  ]
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = pts.length - 1; i >= 1; i--) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
}

/** The storm outside: the sky and the garden darkened round the house, and rain across them. Inside, a lesser dark. */
function stormSky(p: p5, c: Ctx, T: number): void {
  const { storm, rain } = stormAt(T)
  if (storm <= 0.01) return
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  housePath(ctx, k)
  ctx.fillStyle = `rgba(43, 52, 72, ${0.52 * storm})`
  ctx.fill('evenodd')
  if (rain > 0.01) {
    ctx.clip('evenodd')
    ctx.strokeStyle = `rgba(220, 238, 243, ${0.42 * rain})`
    ctx.lineWidth = Math.max(1, k * 0.014)
    ctx.beginPath()
    const span = f.x1 - f.x0 + 2
    for (let i = 0; i < 140; i++) {
      const u = (hash(i, 5, 3) + T * (1.4 + hash(i, 6, 3) * 0.5)) % 1
      const rx = f.x0 - 1 + hash(i, 7, 3) * span - 0.8 * u
      const ry = f.y0 - 0.5 + u * (f.y1 - f.y0 + 1)
      ctx.moveTo(rx * k, ry * k)
      ctx.lineTo((rx - 0.09) * k, (ry + 0.34) * k)
    }
    ctx.stroke()
  }
  ctx.restore()
  // Inside, the rooms upstairs and the hall take a little of the dark too (the living room has its own, under the two of them).
  ctx.save()
  ctx.beginPath()
  ctx.rect(INSIDE.backWall[1] * k, INSIDE.ceilUp * k, (INSIDE.frontWall[0] - INSIDE.backWall[1]) * k, (INSIDE.groundUp - INSIDE.ceilUp) * k)
  ctx.rect(INSIDE.hall[0] * k, INSIDE.ceil * k, (INSIDE.hall[1] - INSIDE.hall[0]) * k, (INSIDE.ground - INSIDE.ceil) * k)
  ctx.fillStyle = `rgba(43, 52, 72, ${0.16 * storm})`
  ctx.fill()
  ctx.restore()
}

/** A point along the limb, `s` of its length out from the root, `side` across it. */
function along(v: number, s: number, side = 0): [number, number] {
  const a = REST + (1 - v) * 0.95
  const c = Math.cos(a)
  const n = Math.sin(a)
  return [ROOT[0] + c * LEN * s - n * side, ROOT[1] + n * LEN * s + c * side]
}

function limb(p: p5, c: Ctx, T: number): void {
  const v = limbAt(T)
  if (v <= 0.02) return
  const { k, weight } = c
  const x = (u: number) => u * k
  const wet = stormAt(T).storm
  p.push()
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(HOME.bark, INK, 0.15 * wet))
  // The limb: a tapering bough with one side branch.
  p.beginShape()
  const n = 10
  for (let i = 0; i <= n; i++) { const s = i / n; const [px, py] = along(v, s, 0.2 * (1 - s) + 0.04); p.vertex(x(px), x(py)) }
  for (let i = n; i >= 0; i--) { const s = i / n; const [px, py] = along(v, s, -(0.2 * (1 - s) + 0.04)); p.vertex(x(px), x(py)) }
  p.endShape(p.CLOSE)
  const [bx, by] = along(v, 0.72)
  const [ex, ey] = along(v, 0.84, 0.75)
  p.strokeWeight(weight * 0.6)
  p.quad(x(bx - 0.05), x(by - 0.03), x(bx + 0.05), x(by + 0.03), x(ex + 0.02), x(ey + 0.01), x(ex - 0.02), x(ey - 0.01))
  // The leaves, in soft lobed masses of different sizes, no outline, heavier and darker in the rain.
  p.noStroke()
  const clumps: [number, number, number][] = [[0.8, -0.2, 0.52], [0.9, 0.2, 0.44], [0.99, -0.04, 0.36], [0.86, 0.74, 0.4], [0.94, 0.95, 0.28], [0.74, 0.34, 0.3]]
  clumps.forEach(([s, side, r], ci) => {
    const [lx, ly] = along(v, s, side)
    p.fill(mixHex(mixHex(HOME.leaf, '#5E8A4C', hash(ci, 2, 1)), HOME.night, 0.25 * wet))
    p.beginShape()
    const lobes = 7 + (ci % 3)
    for (let i = 0; i < lobes * 4; i++) {
      const a = (i / (lobes * 4)) * Math.PI * 2
      const bump = 0.78 + 0.22 * Math.abs(Math.sin((a * lobes) / 2)) + 0.08 * (hash(ci, i, 5) - 0.5)
      p.vertex(x(lx + Math.cos(a) * r * 0.62 * bump), x(ly + Math.sin(a) * r * 0.46 * bump))
    }
    p.endShape(p.CLOSE)
  })
  p.pop()
}

/** The hole in the nursery's ceiling (and in the roof over it), with the broken plaster's teeth hanging round it. */
function holes(p: p5, c: Ctx, T: number): void {
  if (T < TREE) return
  const { k, weight } = c
  const x = (u: number) => u * k
  const patched = T >= BOARDS[2]
  p.push()
  p.noStroke()
  p.fill('#3A2E2A')
  p.beginShape()
  const n = 9
  for (let i = 0; i <= n; i++) p.vertex(x(HOLE.x0 + (i / n) * (HOLE.x1 - HOLE.x0)), x(HOLE.y - 0.13 - 0.05 * hash(i, 1, 1)))
  for (let i = n; i >= 0; i--) p.vertex(x(HOLE.x0 + (i / n) * (HOLE.x1 - HOLE.x0)), x(HOLE.y + 0.02 + 0.07 * hash(i, 2, 1)))
  p.endShape(p.CLOSE)
  // Plaster teeth and lath hanging down round the break.
  p.fill(mixHex(HOME.nursery, HOME.stone, 0.4))
  p.stroke(alpha(p, INK, 0.6))
  p.strokeWeight(weight * 0.45)
  for (let i = 0; i < 5; i++) {
    const tx = HOLE.x0 - 0.08 + i * 0.3 + hash(i, 3, 1) * 0.08
    const d = 0.08 + 0.12 * hash(i, 4, 1)
    p.triangle(x(tx), x(HOLE.y), x(tx + 0.12), x(HOLE.y), x(tx + 0.05), x(HOLE.y + d))
  }
  // The roof: the gap the limb tore, or (from the last board) its patch of new shingles.
  p.push()
  p.translate(x(ROOF_HOLE[0]), x(ROOF_HOLE[1]))
  p.rotate(SLOPE)
  p.rectMode(p.CENTER)
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.6)
  p.fill(patched ? mixHex(HOME.roof, HOME.trim, 0.25) : '#3A2E2A')
  p.rect(0, x(-0.2), x(0.9), x(0.44), x(0.02))
  p.pop()
  p.pop()
}

/** Plaster brought down by the limb: it falls into the nursery, lies there, and is gone by the time it is mended. */
function plaster(p: p5, c: Ctx, T: number): void {
  const s0 = T - TREE
  if (s0 < 0 || T > BOARDS[2] + 1.6) return
  const { k, weight } = c
  const x = (u: number) => u * k
  const fade = 1 - smoothstep((T - BOARDS[1]) / (BOARDS[2] + 1.6 - BOARDS[1]))
  const floor = -3.72
  const v0 = 5.3
  const drop = floor - HOLE.y - 0.05
  const tf = (-v0 + Math.sqrt(v0 * v0 + 2 * G * drop)) / G
  p.push()
  p.stroke(alpha(p, INK, 0.5 * fade))
  p.strokeWeight(weight * 0.4)
  p.fill(alpha(p, mixHex(HOME.nursery, HOME.stone, 0.4), fade))
  for (let i = 0; i < 5; i++) {
    const lag = i * 0.03
    const s = Math.max(0, s0 - lag)
    const px = HOLE.x0 + 0.1 + i * 0.2 + hash(i, 7, 1) * 0.1
    const size = 0.07 + 0.06 * hash(i, 8, 1)
    const t = Math.min(s, tf)
    const py = HOLE.y + 0.05 + v0 * t + 0.5 * G * t * t
    const slide = s > tf ? 0.12 * (1 - Math.exp(-(s - tf) / 0.12)) * (hash(i, 9, 1) - 0.5) * 2 : 0
    const turn = s < tf ? s * (4 + i) : tf * (4 + i)
    p.push()
    p.translate(x(px + slide), x(Math.min(py, floor - size * 0.4)))
    p.rotate(turn)
    p.quad(x(-size), x(-size * 0.4), x(size * 0.7), x(-size * 0.5), x(size), x(size * 0.4), x(-size * 0.6), x(size * 0.5))
    p.pop()
  }
  p.pop()
  void TOPPLE
}

/** The three boards nailed up under the hole, each on its downbeat: hung from one nail, swung up flat, nailed. */
function boards(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const x = (u: number) => u * k
  for (let i = 0; i < BOARDS.length; i++) {
    const u = boardAt(T, i)
    if (u < 0) continue
    const appear = smoothstep((T - (BOARDS[i] - 0.4)) / 0.12)
    const x0 = HOLE.x0 - 0.12 + i * 0.07
    const y = HOLE.y + 0.02 + i * 0.1
    const lean = [-0.03, 0.025, -0.015][i]
    p.push()
    p.translate(x(x0), x(y))
    p.rotate(lean + (1 - u) * 1.25)
    p.rectMode(p.CORNER)
    p.stroke(alpha(p, INK, 0.9 * appear))
    p.strokeWeight(weight * 0.6)
    p.fill(alpha(p, mixHex(HOME.wood, HOME.trim, 0.25), appear))
    p.rect(0, 0, x(HOLE.x1 - HOLE.x0 + 0.24), x(0.1), x(0.01))
    p.noStroke()
    p.fill(alpha(p, INK, appear))
    p.circle(x(0.06), x(0.05), x(0.025))
    if (u >= 1 - 1e-6 || T >= BOARDS[i]) p.circle(x(HOLE.x1 - HOLE.x0 + 0.18), x(0.05), x(0.025))
    p.pop()
  }
}

/** Plaster dust shaken down from the living room's ceiling by the blow. */
function dust(p: p5, c: Ctx, T: number): void {
  const s = T - TREE
  if (s < 0 || s > 1.8) return
  const { k } = c
  p.push()
  p.noStroke()
  for (let i = 0; i < 16; i++) {
    const lag = hash(i, 1, 4) * 0.25
    const q = s - lag
    if (q < 0) continue
    const px = 6.8 + hash(i, 2, 4) * 3.4 + 0.12 * Math.sin(q * 3 + i)
    const py = -3.58 + 1.6 * q * q + 0.2 * q
    const a = (1 - smoothstep(q / 1.5)) * 0.8
    p.fill(alpha(p, HOME.paper, a))
    p.circle(px * k, py * k, (0.018 + 0.025 * hash(i, 3, 4)) * k)
  }
  p.pop()
}

/** Lightning: the whole house lit for an instant. */
function lightning(p: p5, c: Ctx, T: number): void {
  const { flash } = stormAt(T)
  if (flash <= 0.01) return
  const { k } = c
  const f = frame(p, k)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, '#F4F7F2', 0.32 * flash))
  p.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  p.pop()
}

/** Carl as the cast draws him, for the bandage: his centre, his tilt and his squash. */
export interface Figure {
  x: number
  y: number
  tilt: number
  squash: number
}

/** The bandage round his foot: a white band wrapped on from the side she touches him, and unwound as he heals. */
function bandage(p: p5, c: Ctx, T: number, carl: Figure): void {
  const wrap = bandageAt(T)
  if (wrap <= 0.01) return
  const { k, weight } = c
  const s = 2 * R * k
  const h = s * (1 - carl.squash)
  const w = s * (1 + carl.squash * 0.6)
  p.push()
  p.translate(carl.x * k, carl.y * k)
  p.rotate(carl.tilt)
  p.translate(0, (s - h) / 2)
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.6)
  p.fill(HOME.trim)
  const band = 0.085 * k
  const len = (w + 0.02 * k) * wrap
  p.rect(w / 2 + 0.01 * k - len, h / 2 - band - 0.012 * k, len, band, 0.02 * k)
  if (wrap > 0.95) {
    // The knot, on her side.
    p.ellipse(w / 2 + 0.035 * k, h / 2 - band / 2 - 0.012 * k, 0.07 * k, 0.05 * k)
  }
  p.pop()
}

export function drawStormOver(p: p5, c: Ctx, T: number, carl: Figure | null): void {
  stormSky(p, c, T)
  holes(p, c, T)
  limb(p, c, T)
  plaster(p, c, T)
  boards(p, c, T)
  dust(p, c, T)
  if (carl) bandage(p, c, T, carl)
  lightning(p, c, T)
}
