import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { WASTES } from '../worlds'
import { ground, LAND, YG } from './plank-rig'

/**
 * The land the plank crosses (the part's frame, cells): far mountains and moor hills behind (each moving slower
 * than the ground as the camera goes by), a band of mist, then the moor itself with its heather and its stones,
 * the brow, the long slope down, the ledge, the rocky lip at the edge, and past it the drop into the gorge, with the
 * far side across it in the haze. Flat fills and one ink; mist and haze soft.
 */

type View = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/** The camera's height through the run, where the far layers sit as drawn. */
const EYE = 3.8

const MOOR = mixHex(WASTES.moss, WASTES.hill, 0.45)
const MOOR_DARK = mixHex(WASTES.moss, WASTES.rockDark, 0.3)
const FAR_MTN = mixHex(WASTES.slate, WASTES.mist, 0.62)
const FAR_HILL = mixHex(WASTES.hillFar, WASTES.mist, 0.28)
const NEAR_HILL = mixHex(WASTES.hill, WASTES.hillFar, 0.4)

/** A layer seen from far off: its x moves by `par` of the camera's, so it slides by slower than the ground. */
function layer(p: p5, k: number, v: View, par: number, top: (b: number) => number, bottom: number, fill: string, ink?: string, w = 1) {
  const shift = v.cx * (1 - par)
  // Far off, it moves with the camera up and down too (from the run's eye height), so its skyline stays in sight.
  const lift = (v.cy - EYE) * (1 - par) * 0.9
  const step = Math.max(0.25, (v.x1 - v.x0) / 90)
  p.push()
  if (ink) {
    p.stroke(ink)
    p.strokeWeight(w)
  } else p.noStroke()
  p.fill(fill)
  p.beginShape()
  p.vertex((v.x0 - 1) * k, bottom * k)
  for (let x = v.x0 - 1; x <= v.x1 + 1; x += step) p.vertex(x * k, (top(x - shift) + lift) * k)
  p.vertex((v.x1 + 1) * k, (top(v.x1 + 1 - shift) + lift) * k)
  p.vertex((v.x1 + 1) * k, bottom * k)
  p.endShape(p.CLOSE)
  p.pop()
}

const mountains = (b: number) => YG - 0.9 - (1.3 + 1.5 * (0.5 + 0.5 * Math.sin(b * 0.19 + 0.6)) + 1.2 * Math.max(0, Math.sin(b * 0.071 + 1.3)) + 0.45 * Math.sin(b * 0.53) + 0.2 * Math.sin(b * 1.3 + 0.7))
const hills = (b: number) => YG - 0.35 - (0.7 + 1.0 * (0.5 + 0.5 * Math.sin(b * 0.15 + 2.1)) + 0.45 * Math.sin(b * 0.37 + 0.4) + 0.15 * Math.sin(b * 0.95 + 1.9))
const nearHills = (b: number) => YG - 0.1 - (0.25 + 0.5 * (0.5 + 0.5 * Math.sin(b * 0.23 + 4.0)))

/** The back of the scene: mountains, hills, the mist on the moor, and the gorge's far side. */
export function drawBack(p: p5, k: number, W: number, ink: string, v: View): void {
  const low = v.y1 + 2
  layer(p, k, v, 0.1, mountains, low, FAR_MTN)
  layer(p, k, v, 0.35, hills, low, FAR_HILL, alpha(p, ink, 0.25).toString(), W * 0.5)
  layer(p, k, v, 0.6, nearHills, low, NEAR_HILL, alpha(p, ink, 0.35).toString(), W * 0.6)
  // The gorge beyond the edge: its depth going blue-grey into the haze, and its far wall across the drop.
  if (v.x1 > LAND.edge) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // The far wall, a little higher than the ledge, its face going down into the haze (it moves a little slower).
    const x0 = LAND.edge + 2.8 + (v.cx - LAND.edge) * 0.12
    const lip = LAND.ledge - 1.3
    const face = (y: number) => x0 + 0.3 * Math.sin(y * 1.7) + 0.18 * Math.sin(y * 4.1) + (y - lip) * 0.08
    p.push()
    p.stroke(alpha(p, ink, 0.45))
    p.strokeWeight(W * 0.7)
    p.fill(mixHex(WASTES.rock, WASTES.mist, 0.3))
    p.beginShape()
    p.vertex((v.x1 + 2) * k, (v.y1 + 2) * k)
    for (let y = v.y1 + 2; y > lip; y -= 0.35) p.vertex(face(y) * k, y * k)
    for (let x = face(lip); x < v.x1 + 2; x += 0.7) p.vertex(x * k, (lip - 0.2 * (0.5 + 0.5 * Math.sin(x * 0.9))) * k)
    p.vertex((v.x1 + 2) * k, lip * k)
    p.endShape(p.CLOSE)
    // Its turf on top.
    p.noStroke()
    p.fill(mixHex(MOOR, WASTES.mist, 0.3))
    p.beginShape()
    for (let x = face(lip); x < v.x1 + 2; x += 0.7) p.vertex(x * k, (lip - 0.2 * (0.5 + 0.5 * Math.sin(x * 0.9))) * k)
    p.vertex((v.x1 + 2) * k, lip * k)
    p.vertex((v.x1 + 2) * k, (lip + 0.35) * k)
    p.vertex((face(lip) + 0.3) * k, (lip + 0.35) * k)
    p.endShape(p.CLOSE)
    p.stroke(alpha(p, ink, 0.3))
    p.strokeWeight(W * 0.5)
    for (let i = 1; i < 6; i++) {
      const y = lip + i * 1.1
      p.line(face(y) * k, y * k, (face(y) + 0.8 + 0.6 * hash(i, 41)) * k, (y + 0.1) * k)
    }
    p.pop()
    // Haze down in it, over the far wall's foot.
    const h = ctx.createLinearGradient(0, (LAND.ledge + 0.5) * k, 0, (LAND.ledge + 6) * k)
    h.addColorStop(0, 'rgba(238, 241, 236, 0)')
    h.addColorStop(1, 'rgba(238, 241, 236, 0.9)')
    ctx.fillStyle = h
    ctx.fillRect(LAND.edge * k, (LAND.ledge + 0.5) * k, (v.x1 + 2 - LAND.edge) * k, (v.y1 + 2 - LAND.ledge) * k)
  }
  // The mist lying on the moor, over the hills' feet.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const m = ctx.createLinearGradient(0, (YG - 1.6) * k, 0, (YG + 0.2) * k)
  m.addColorStop(0, 'rgba(238, 241, 236, 0)')
  m.addColorStop(1, 'rgba(238, 241, 236, 0.55)')
  ctx.fillStyle = m
  ctx.fillRect((v.x0 - 1) * k, (YG - 1.6) * k, (v.x1 + 2 - v.x0) * k, 1.8 * k)
}

/** Stones on the slope where the plank bumps over them (x), set by the part. */
export const STONES: { x: number; r: number }[] = []

/** The moor, the slope, the ledge, the lip and the cliff's face; heather along the top. */
export function drawGround(p: p5, k: number, W: number, ink: string, v: View): void {
  const x0 = Math.max(v.x0 - 1, -80)
  const x1 = Math.min(v.x1 + 1, LAND.edge)
  if (x1 > x0) {
    const step = Math.max(0.2, (v.x1 - v.x0) / 120)
    p.push()
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(MOOR)
    p.beginShape()
    p.vertex(x0 * k, (v.y1 + 2) * k)
    for (let x = x0; x < x1; x += step) p.vertex(x * k, ground(x) * k)
    p.vertex(x1 * k, ground(x1) * k)
    p.vertex(x1 * k, (v.y1 + 2) * k)
    p.endShape(p.CLOSE)
    // A darker earth under the turf.
    p.noStroke()
    p.fill(MOOR_DARK)
    p.beginShape()
    p.vertex(x0 * k, (v.y1 + 2) * k)
    for (let x = x0; x < x1; x += step) p.vertex(x * k, (ground(x) + 0.9 + 0.15 * Math.sin(x * 1.3)) * k)
    p.vertex(x1 * k, (ground(x1) + 0.9) * k)
    p.vertex(x1 * k, (v.y1 + 2) * k)
    p.endShape(p.CLOSE)
    p.pop()
    // Stones: a boulder now and then on the moor, and the stones on the slope.
    for (let i = Math.floor(x0 / 7); i <= Math.ceil(x1 / 7); i++) {
      const x = i * 7 + hash(i, 1) * 5
      if (x > LAND.b0 - 2 || hash(i, 2) < 0.35) continue
      stone(p, k, W, ink, x, 0.35 + hash(i, 3) * 0.8, i)
    }
    for (const [i, s] of STONES.entries()) stone(p, k, W, ink, s.x, s.r, 100 + i)
    heather(p, k, x0, x1, v)
  }
  // The lip at the edge: a low ridge of rock he stands on.
  if (v.x1 > LAND.th - 2 && v.x0 < LAND.edge + 2) {
    const g = LAND.ledge
    p.push()
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(WASTES.rock)
    p.beginShape()
    p.vertex((LAND.th - 1.0) * k, (g + 0.05) * k)
    p.bezierVertex((LAND.th - 0.7) * k, (g - 0.2) * k, (LAND.th - 0.45) * k, (g - LAND.lip) * k, LAND.th * k, (g - LAND.lip) * k)
    p.bezierVertex((LAND.th + 0.3) * k, (g - LAND.lip) * k, (LAND.edge - 0.05) * k, (g - LAND.lip + 0.05) * k, LAND.edge * k, (g - 0.1) * k)
    p.vertex(LAND.edge * k, (g + 0.4) * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(WASTES.rockDark)
    p.triangle((LAND.th + 0.2) * k, (g - LAND.lip + 0.12) * k, (LAND.edge - 0.02) * k, (g - 0.05) * k, (LAND.edge - 0.02) * k, (g + 0.35) * k)
    p.pop()
  }
  // The cliff's face below the edge, down into the gorge.
  if (v.x1 > LAND.edge - 1 && v.x0 < LAND.edge + 3) {
    const g = LAND.ledge
    const face = (y: number) => LAND.edge - 0.25 * (y - g) * 0.12 + 0.18 * Math.sin(y * 2.3) + 0.12 * Math.sin(y * 5.3)
    p.push()
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(mixHex(WASTES.rock, WASTES.rockDark, 0.35))
    p.beginShape()
    p.vertex((LAND.edge - 2) * k, (g + 0.3) * k)
    p.vertex(LAND.edge * k, (g - 0.1) * k)
    for (let y = g; y < v.y1 + 2; y += 0.3) p.vertex(face(y) * k, y * k)
    p.vertex((LAND.edge - 2) * k, (v.y1 + 2) * k)
    p.endShape(p.CLOSE)
    // Its strata, and the haze over its foot.
    p.stroke(alpha(p, ink, 0.35))
    p.strokeWeight(W * 0.55)
    for (let i = 1; i < 7; i++) {
      const y = g + i * 0.9 + 0.2 * hash(i, 9)
      p.line((face(y) - 0.7 - hash(i, 4) * 0.6) * k, (y - 0.08) * k, face(y) * k, y * k)
    }
    p.pop()
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const h = ctx.createLinearGradient(0, (g + 2) * k, 0, (g + 8) * k)
    h.addColorStop(0, 'rgba(238, 241, 236, 0)')
    h.addColorStop(1, 'rgba(238, 241, 236, 0.8)')
    ctx.fillStyle = h
    ctx.fillRect((LAND.edge - 1.5) * k, (g + 2) * k, 4 * k, (v.y1 - g) * k)
  }
}

/** A stone sitting on the ground at x: a rounded lump with its shade side. */
function stone(p: p5, k: number, W: number, ink: string, x: number, r: number, seed: number) {
  const g = ground(x)
  const pts: Pt[] = []
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI
    const rr = r * (0.8 + 0.3 * hash(seed, i, 7))
    pts.push([x + Math.cos(a) * rr * 1.25, g + 0.08 + Math.sin(a) * rr * 0.8])
  }
  p.push()
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(WASTES.rock)
  p.beginShape()
  for (const [px, py] of pts) p.vertex(px * k, py * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, WASTES.rockDark, 0.8))
  p.beginShape()
  for (const [px, py] of pts.slice(5)) p.vertex(px * k, py * k)
  p.vertex(x * k, (g + 0.08) * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** Heather in clumps along the turf's edge: purple sprays of every size, never a row of beads. */
function heather(p: p5, k: number, x0: number, x1: number, v: View) {
  const span = v.x1 - v.x0
  const every = span > 30 ? 0.9 : 0.55
  p.push()
  p.noStroke()
  for (let i = Math.floor(x0 / every); i <= Math.ceil(x1 / every); i++) {
    const x = i * every + hash(i, 21) * every * 0.8
    if (x > LAND.th - 1.2 || hash(i, 22) < 0.3) continue
    const g = ground(x)
    const n = 2 + Math.floor(hash(i, 23) * 4)
    const big = 0.5 + hash(i, 24) * 0.9
    for (let j = 0; j < n; j++) {
      const dx = (hash(i, j, 25) - 0.5) * 0.45 * big
      const h = (0.08 + 0.2 * hash(i, j, 26)) * big
      const w = (0.07 + 0.12 * hash(i, j, 27)) * big
      p.fill(hash(i, j, 28) < 0.55 ? WASTES.heather : WASTES.heatherDeep)
      p.ellipse((x + dx) * k, (g - h * 0.5 + 0.02) * k, w * k, h * k)
    }
    if (hash(i, 29) < 0.4) {
      p.fill(mixHex(WASTES.moss, WASTES.rockDark, 0.2))
      p.ellipse(x * k, (g - 0.02) * k, 0.35 * big * k, 0.1 * big * k)
    }
  }
  p.pop()
}
