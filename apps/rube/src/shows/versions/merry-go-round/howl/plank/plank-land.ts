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
/** The turf's darker lip, just under its top. */
const LIP = mixHex(WASTES.moss, WASTES.rockDark, 0.4)
/** Heather's shades: the dark heather-green of a clump's mass, its tops a step lighter, and the bloom on them. */
const HEATH_DEEP = mixHex(mixHex(WASTES.moss, WASTES.heatherDeep, 0.45), WASTES.rockDark, 0.28)
const HEATH_TOP = mixHex(mixHex(WASTES.moss, WASTES.heatherDeep, 0.3), MOOR, 0.2)
const HEATH_LIT = mixHex(mixHex(WASTES.moss, WASTES.heather, 0.3), WASTES.mist, 0.18)
/** The mist deep down in the gorges, the colour `plank.ts` fills the brink's depth with, so they meet unseen. */
const DEEP_MIST = mixHex(WASTES.mist, '#AEB8C8', 0.35)

/** A band hung under the ground's edge: from `d0(x)` below it to `d1(x)` below it (or at y = d1(x) when `abs`). */
function band(p: p5, k: number, pts: Pt[], d0: (x: number) => number, d1: (x: number) => number, abs = false): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, (y + d0(x)) * k)
  for (let i = pts.length - 1; i >= 0; i--) p.vertex(pts[i][0] * k, (abs ? d1(pts[i][0]) : pts[i][1] + d1(pts[i][0])) * k)
  p.endShape(p.CLOSE)
}

/** A lumpy round volume (a cushion of heather): its edge wanders by `seed`, never a clean ellipse. */
function blob(p: p5, k: number, x: number, y: number, rx: number, ry: number, seed: number): void {
  const n = Math.max(10, Math.min(30, Math.round(rx * k * 0.9)))
  p.beginShape()
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2
    const r = 1 + 0.06 * Math.sin(3 * th + seed * 1.7) + 0.035 * Math.sin(5 * th + seed * 3.1)
    p.vertex((x + Math.cos(th) * rx * r) * k, (y + Math.sin(th) * ry * r) * k)
  }
  p.endShape(p.CLOSE)
}
/** The far range: a deep storm blue-slate, well under Sophie's grey (about half her light) and over Howl's ink, so
 * both stand out against it on the run and at the heart. */
const FAR_MTN = mixHex(mixHex(WASTES.slate, WASTES.mist, 0.1), '#4F6690', 0.35)
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
  // The mist lying on the moor, over the hills' feet, and on down at its full to the bottom of the view: as the far
  // layers lift with the camera, whatever of them shows below the moor's line (behind the slope, the ledge, the drop)
  // is always in it, never a bare stripe of range under a ruled edge. The gorge's far wall, nearer, stands over it.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const m = ctx.createLinearGradient(0, (YG - 1.6) * k, 0, (YG + 0.2) * k)
  m.addColorStop(0, 'rgba(238, 241, 236, 0)')
  m.addColorStop(1, 'rgba(238, 241, 236, 0.55)')
  ctx.fillStyle = m
  ctx.fillRect((v.x0 - 1) * k, (YG - 1.6) * k, (v.x1 + 2 - v.x0) * k, Math.max(1.8, v.y1 + 3.6 - YG) * k)
  // The gorge beyond the edge: its depth going blue-grey into the haze, and its far wall across the drop.
  if (v.x1 > LAND.edge) {
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
    // (From behind the cliff's face, which covers its left edge: no seam at the face's foot.)
    ctx.fillRect((LAND.edge - 1.5) * k, (LAND.ledge + 0.5) * k, (v.x1 + 3.5 - LAND.edge) * k, (v.y1 + 2 - LAND.ledge) * k)
  }
}

/** Stones on the slope where the plank bumps over them (x), set by the part. */
export const STONES: { x: number; r: number }[] = []

/** The moor, the slope, the ledge, the lip and the cliff's face; heather along the top. */
export function drawGround(p: p5, k: number, W: number, ink: string, v: View): void {
  // The moor runs on west past anything any frame sees (never an end to it, never a side).
  const x0 = v.x0 - 1
  const x1 = Math.min(v.x1 + 1, LAND.edge)
  if (x1 > x0) {
    const step = Math.max(0.2, (v.x1 - v.x0) / 120)
    const bottom = v.y1 + 2
    const pts: Pt[] = []
    for (let x = x0; x < x1; x += step) pts.push([x, ground(x)])
    pts.push([x1, ground(x1)])
    p.push()
    // The turf: no ink along its top (the far edge meets the haze by its colour alone).
    p.noStroke()
    p.fill(MOOR)
    p.beginShape()
    p.vertex(x0 * k, bottom * k)
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.vertex(x1 * k, bottom * k)
    p.endShape(p.CLOSE)
    // Its body deepens toward us in soft steps, their edges wandering, so there is no band to see.
    for (let i = 0; i < 6; i++) {
      p.fill(alpha(p, MOOR_DARK, 0.16))
      band(p, k, pts, (x) => 0.3 + i * 0.24 + 0.1 * Math.sin(x * 0.37 + i * 1.7) + 0.05 * Math.sin(x * 1.1 + i), () => bottom, true)
    }
    // Drifts of heather down in it: long low patches of overlapping cushions, no ink.
    const drift = mixHex(MOOR, WASTES.heatherDeep, 0.3)
    for (let j = Math.floor((x0 - 6) / 4.3); j <= Math.ceil((x1 + 6) / 4.3); j++) {
      if (hash(j, 61) < 0.3) continue
      const cx = j * 4.3 + hash(j, 62) * 2.5
      const w = 1.6 + hash(j, 63) * 2.8
      const d = 0.35 + hash(j, 64) * 1.3
      for (let m = 0; m < 7; m++) {
        const ex = cx + (hash(j, m, 65) - 0.5) * w * 0.8
        if (ex > LAND.edge - 0.3) continue
        const rx = w * (0.1 + 0.16 * hash(j, m, 66))
        const ry = rx * (0.22 + 0.12 * hash(j, m, 67))
        p.fill(alpha(p, drift, 0.3))
        p.ellipse(ex * k, (ground(ex) + d + (hash(j, m, 68) - 0.5) * 0.16) * k, 2 * rx * k, 2 * ry * k)
      }
    }
    // The lip: the turf darkens softly just under its top, thicker in a wide so it still reads.
    const lipW = Math.max(1, Math.sqrt((v.y1 - v.y0) / 6))
    for (const [h, a] of [[0.03, 0.3], [0.07, 0.24], [0.13, 0.18], [0.22, 0.12]]) {
      p.fill(alpha(p, LIP, a))
      band(p, k, pts, () => 0, (x) => h * lipW * (1 + 0.25 * Math.sin(x * 2.3 + h * 40)))
    }
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
  }
  // Deep down (only a wide or a phone held upright sees it): the moor's body, the cliff and the gorge all go into one
  // mist together, across the whole frame, thickening softly with depth to the brink's own deep mist by the depth its
  // rim comes down to, so no column of land ever shows its sides. No edge anywhere.
  if (v.y1 > LAND.ledge + 1.5) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = LAND.ledge
    const n = parseInt(DEEP_MIST.slice(1), 16)
    const rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
    const h = ctx.createLinearGradient(0, (g + 1.5) * k, 0, (g + 5) * k)
    h.addColorStop(0, `rgba(${rgb}, 0)`)
    h.addColorStop(0.35, `rgba(${rgb}, 0.4)`)
    h.addColorStop(0.7, `rgba(${rgb}, 0.82)`)
    h.addColorStop(1, `rgba(${rgb}, 1)`)
    // (Inside save/restore, so p5's cached fill never goes stale behind the raw gradient.)
    ctx.save()
    ctx.fillStyle = h
    ctx.fillRect((v.x0 - 1) * k, (g + 1.5) * k, (v.x1 - v.x0 + 2) * k, (v.y1 + 1 - g) * k)
    ctx.restore()
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

/**
 * Heather along the turf's top: low mounded clumps, wider than tall, overlapping here and bare there, from small to
 * three times that. Each one a dark heather-green mass of uneven cushions, its tops a step lighter, and the bloom as a
 * few small purple flecks on them. No ink; never a row of beads.
 */
function heather(p: p5, k: number, x0: number, x1: number, v: View) {
  const span = v.x1 - v.x0
  const every = Math.max(0.5, Math.min(1.1, span / 60))
  // In a wide the smallest would be specks: they go, and what is left grows a little so the edge still reads broken.
  const tiny = 3 / k
  p.push()
  p.noStroke()
  for (let i = Math.floor(x0 / every) - 1; i <= Math.ceil(x1 / every) + 1; i++) {
    const x = (i + 0.5 + (hash(i, 21) - 0.5) * 0.8) * every
    // Drifts: long stretches of it, then bare turf (a slow wave with its own grain), never an even row.
    const drift = 0.5 + 0.45 * Math.sin(x * 0.47 + 1.1) + 0.3 * Math.sin(x * 1.13 + 2.3) + 0.35 * (hash(i, 22) - 0.5)
    if (drift < 0.3 || x > LAND.th - 1.4 || x < x0 - 1 || x > x1 + 1) continue
    // Sizes 1 to 3 (skewed small, the big ones where the drift is deep).
    const s = 1 + 2 * Math.min(1, hash(i, 24) ** 1.6 * (0.6 + 0.6 * Math.min(1, drift)))
    const w = 0.34 * s * (0.85 + 0.3 * hash(i, 23))
    if (w < tiny) continue
    clump(p, k, x, w, w * (0.34 + 0.12 * hash(i, 25)), i)
  }
  p.pop()
}

/** One heather clump centred at x on the ground, w across and h tall. */
function clump(p: p5, k: number, x: number, w: number, h: number, seed: number) {
  const n = 3 + Math.floor(hash(seed, 31) * 3)
  const peak = 0.3 + hash(seed, 32) * 0.4
  const lumps: [number, number, number, number][] = []
  for (let j = 0; j < n; j++) {
    const u = (j + 0.2 + hash(seed, j, 33) * 0.6) / n
    const near = Math.exp(-((u - peak) ** 2) / 0.06)
    const rx = w * (0.16 + 0.14 * near + 0.05 * hash(seed, j, 34))
    const ry = rx * (0.6 + 0.2 * hash(seed, j, 35))
    const tall = h * (0.45 + 0.55 * near) * (0.85 + 0.25 * hash(seed, j, 36))
    const lx = x - w / 2 + u * w
    lumps.push([lx, ground(lx) + 0.02 - Math.max(tall - ry, ry * 0.35), rx, ry])
  }
  const gl = ground(x - w * 0.5)
  const gr = ground(x + w * 0.5)
  // The mass, from the ground up to each cushion (no gap under them), then the cushions over it.
  p.fill(HEATH_DEEP)
  p.beginShape()
  p.vertex((x - w * 0.5) * k, (gl + 0.06) * k)
  for (const [lx, ly] of lumps) p.vertex(lx * k, ly * k)
  p.vertex((x + w * 0.5) * k, (gr + 0.06) * k)
  p.endShape(p.CLOSE)
  for (const [j, [lx, ly, rx, ry]] of lumps.entries()) blob(p, k, lx, ly, rx, ry, seed + j)
  // Their tops, lit from the upper left, smaller and off-centre so the dark shows under them.
  p.fill(HEATH_TOP)
  for (const [j, [lx, ly, rx, ry]] of lumps.entries()) blob(p, k, lx - rx * 0.12, ly - ry * 0.2, rx * 0.78, ry * 0.66, seed + j + 7)
  // The bloom: a few small flecks on the tops, of two purples and a lit one, each its own size.
  for (const [j, [lx, ly, rx, ry]] of lumps.entries()) {
    const m = 1 + Math.floor(hash(seed, j, 37) * 3)
    for (let q = 0; q < m; q++) {
      const a = -Math.PI * (0.2 + 0.6 * hash(seed, j * 5 + q, 38))
      const fr = rx * (0.1 + 0.12 * hash(seed, j * 5 + q, 39))
      if (fr * k < 0.7) continue
      const c = hash(seed, j * 5 + q, 40)
      p.fill(c < 0.45 ? WASTES.heather : c < 0.8 ? WASTES.heatherDeep : HEATH_LIT)
      p.ellipse((lx + Math.cos(a) * rx * 0.62) * k, (ly + Math.sin(a) * ry * 0.62) * k, fr * 2 * k, fr * 1.3 * k)
    }
  }
}
