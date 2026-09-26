import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { CHURCH, HILL, HOME, INK } from '../worlds'

/**
 * The hill set: their picnic hill, seen from the side. Standing scenery for the whole show, drawn from show time
 * (`c.t`) in the hill world's cells from the set's origin.
 *
 * A green hill rising from a country lane on the right to a broad crest with one big tree on its left; beyond it
 * the valley, the town small and pale, the far hills, and a big sky. The path up is the hill's own skyline: from a
 * stone step at the lane (`STEP`) it climbs the flank to the crest, so whoever walks it is seen against the sky.
 * The lane runs along the hill's foot in front of it.
 *
 * Summer for the clouds (49.6 to 63.3 s): a blue sky, green grass, the tree in full leaf. Years later, autumn for
 * the climb (167.7 to 180.4 s): a pale grey sky, the grass gone to straw, the tree turning and its leaves coming
 * down. Nothing else here moves but the leaves and the grass: the machines are the parts'.
 *
 * Heights are given where a ball's centre sits (`ridge`, `LANE_Y`); the ground's surface is `R` below that.
 */

/** The cells the set claims, [x0, y0, x1, y1] from its origin (the score boxes them). */
export const HILL_BOX: [number, number, number, number] = [-12, -9, 20, 6]

/** The crest: flat, a ball's centre at y 0, from x0 to x1. */
export const CREST = { x0: -1.3, x1: 2.6 }
/** The lane at the hill's foot, a ball's centre height (it runs the whole width, in front of the hill). */
export const LANE_Y = 2.1
/** The stone step where the path leaves the lane: its tread from x0 to x1, a ball on it at y. */
export const STEP = { x0: 8.15, x1: 9.05, y: LANE_Y - 0.13 }
/** The foot of the path: the step's face, on the lane. */
export const FOOT_X = STEP.x1
/** The tree on the crest: its trunk's foot. */
export const TREE_X = -3.5

/** Summer to autumn, by show time: 0 for the clouds, 1 for the climb. */
export const autumn = (t: number): number => smooth(t, 100, 150)

/**
 * A shoulder of the hill: from level at its top, steepening (to `max` at 0.625 of the way), then easing a little
 * toward its foot, `h` lower after `l` across. What it has dropped `u` of the way across, and its slope there.
 */
const SHOULDER = 0.8 * Math.PI
const drop = (h: number, u: number) => (h * (1 - Math.cos(SHOULDER * u))) / (1 - Math.cos(SHOULDER))
const dropSlope = (h: number, l: number, u: number) => (h * SHOULDER * Math.sin(SHOULDER * u)) / ((1 - Math.cos(SHOULDER)) * l)
/** The far (left) shoulder: how far across, and how far down. */
const BACK = { l: 7, h: 2.6 }

/**
 * The hill's skyline, where a ball's centre sits on it at `x`: the far shoulder, the level crest, the near flank down
 * to the step, the step's tread. (Right of the step it is the lane's: `LANE_Y`.)
 */
export function ridge(x: number): number {
  if (x <= CREST.x0) {
    const u = (CREST.x0 - x) / BACK.l
    if (u <= 1) return drop(BACK.h, u)
    return BACK.h + (u - 1) * BACK.l * dropSlope(BACK.h, BACK.l, 1)
  }
  if (x <= CREST.x1) return 0
  if (x < STEP.x0) return drop(STEP.y, (x - CREST.x1) / (STEP.x0 - CREST.x1))
  if (x <= STEP.x1) return STEP.y
  return LANE_Y
}

/** The skyline's slope (dy/dx, y down) at `x`: what a thing standing there leans with. */
export function ridgeSlope(x: number): number {
  if (x <= CREST.x0) return -dropSlope(BACK.h, BACK.l, Math.min(1, (CREST.x0 - x) / BACK.l))
  if (x <= CREST.x1 || x >= STEP.x0) return 0
  const L = STEP.x0 - CREST.x1
  return dropSlope(STEP.y, L, (x - CREST.x1) / L)
}

/** A clump of the crown: a few discs round a middle, from the trunk's foot (x) and in the world's height (y). */
interface Clump {
  x: number
  y: number
  discs: { x: number; y: number; r: number }[]
}

/**
 * The crown of a big old tree: six clumps, the back ones first, each a soft mass with its own shade under it and
 * light across its top, so the crown reads as bulk and not as one flat blob.
 */
const CROWN: Clump[] = (() => {
  const at: [number, number, number][] = [
    // x from the trunk, y, size
    [0.05, -2.7, 1.0],
    [-0.9, -2.45, 0.9],
    [1.0, -2.45, 0.9],
    [-1.6, -1.9, 0.8],
    [1.6, -1.85, 0.8],
    [0.0, -1.95, 1.0],
  ]
  return at.map(([x, y, s], j) => {
    const discs = [{ x, y, r: 0.5 * s }]
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.95 + (i / 4) * Math.PI * 0.9 + (hash(i, j, 3) - 0.5) * 0.4
      const d = 0.36 * s
      discs.push({ x: x + Math.cos(a) * d * 1.25, y: y + Math.sin(a) * d * 0.85 + 0.06, r: (0.3 + 0.1 * hash(i, j, 5)) * s })
    }
    discs.push({ x: x - 0.3 * s, y: y + 0.2 * s, r: 0.36 * s }, { x: x + 0.32 * s, y: y + 0.2 * s, r: 0.36 * s })
    return { x, y, discs }
  })
})()

/** The main limbs, out of the trunk's fork into the clumps, each a curve: [x0, y0, bend x, bend y, x1, y1, width], x from the trunk. */
const LIMBS: [number, number, number, number, number, number, number][] = [
  [-0.06, -1.0, -0.55, -1.2, -1.05, -1.75, 0.11],
  [0.0, -1.05, 0.1, -1.5, -0.05, -2.15, 0.12],
  [0.07, -1.0, 0.6, -1.15, 1.1, -1.7, 0.11],
]

/** A limb: a tapering curve, filled. */
function limb(p: p5, k: number, tx: number, [x0, y0, bx, by, x1, y1, w]: (typeof LIMBS)[number]): void {
  const at = (u: number): Pt => [
    (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * bx + u * u * x1,
    (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * by + u * u * y1,
  ]
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    const [x, y] = at(u)
    const [xa, ya] = at(Math.max(0, u - 0.05))
    const [xb, yb] = at(Math.min(1, u + 0.05))
    const l = Math.hypot(xb - xa, yb - ya) || 1
    const half = w * (1 - 0.55 * u)
    left.push([tx + x - ((yb - ya) / l) * half, y + ((xb - xa) / l) * half])
    right.push([tx + x + ((yb - ya) / l) * half, y - ((xb - xa) / l) * half])
  }
  p.beginShape()
  for (const [x, y] of [...left, ...right.reverse()]) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A leaf, a small pointed oval, turned `a`. */
export function leaf(p: p5, k: number, x: number, y: number, a: number, s: number, color: p5.Color): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(a)
  p.noStroke()
  p.fill(color)
  p.beginShape()
  p.vertex(-s * k, 0)
  p.quadraticVertex(0, -s * 0.55 * k, s * k, 0)
  p.quadraticVertex(0, s * 0.55 * k, -s * k, 0)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The tree's falling leaves in autumn, as a pure function of time: each leaf lets go, drifts down and away, and is gone. */
function fallingLeaves(p: p5, k: number, t: number, au: number, f: { x0: number; x1: number; y0: number; y1: number }): void {
  if (au < 0.05) return
  const col = [HILL.leafAutumn, mixHex(HILL.leafAutumn, HOME.yellow, 0.4), mixHex(HILL.leafAutumn, HILL.bark, 0.35)]
  const n = 34
  const life = 9
  for (let i = 0; i < n; i++) {
    const phase = hash(i, 41) * life
    const cycle = Math.floor((t + phase) / life)
    const u = ((t + phase) % life) / life
    const seed = i * 31 + cycle * 7
    // Let go from somewhere in the crown; the breeze takes them right and down, swaying.
    const x0 = TREE_X - 1.4 + 3.3 * hash(seed, 1)
    const y0 = -2.6 + 1.2 * (hash(seed, 2) - 0.5)
    const drift = 3.5 + 6 * hash(seed, 3)
    const x = x0 + drift * u + 0.35 * Math.sin(u * 9 + hash(seed, 4) * 6)
    const y = y0 + 4.6 * u + 0.12 * Math.sin(u * 13 + i)
    if (x < f.x0 - 0.5 || x > f.x1 + 0.5 || y < f.y0 - 0.5 || y > f.y1 + 0.5) continue
    const fade = Math.min(1, u * 8) * Math.min(1, (1 - u) * 5)
    leaf(p, k, x, y, u * 11 + i, 0.055 + 0.02 * hash(seed, 5), alpha(p, col[i % 3], 0.85 * fade * au))
  }
}

export const hillSet = scenery<null>({
  name: 'hill',
  draw: (p, _s, c) => {
    const { k, t, weight } = c
    const au = autumn(t)
    const f = frame(p, k)
    const X = (x: number) => x * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    p.push()
    p.rectMode(p.CORNER)

    // The sky: a summer blue deepening overhead; years later a pale overcast grey.
    const zenith = mixHex(mixHex(HILL.sky, CHURCH.glassBlue, 0.5), mixHex(HILL.skyGrey, HOME.night, 0.12), au)
    const low = mixHex(mixHex(HILL.sky, HILL.cloud, 0.45), mixHex(HILL.skyGrey, HILL.cloud, 0.35), au)
    const horizon = f.cy + (0.9 - f.cy) * 0.3
    ctx.save()
    const g = ctx.createLinearGradient(0, X(horizon - 7), 0, X(horizon))
    g.addColorStop(0, zenith)
    g.addColorStop(1, low)
    ctx.fillStyle = g
    ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
    ctx.restore()

    // Far weather: in summer a clear sky (the clouds are theirs); in autumn a lid of soft grey bands, drifting.
    const farX = f.cx * 0.85
    p.noStroke()
    if (au > 0.02) {
      for (let i = 0; i < 7; i++) {
        const cy = horizon - 1.1 - i * 0.85 - 0.3 * hash(i, 11)
        const cx = farX + (hash(i, 9) - 0.5) * 7 + t * 0.03
        const w = 7 + 5 * hash(i, 8)
        const h = 0.3 + 0.25 * hash(i, 10)
        p.fill(alpha(p, mixHex(HILL.cloudShade, HILL.skyGrey, 0.5), 0.22 * au))
        p.ellipse(X(cx), X(cy), X(w * 1.2), X(h * 1.6))
        p.fill(alpha(p, mixHex(HILL.cloud, HILL.skyGrey, 0.35), 0.3 * au))
        p.ellipse(X(cx - w * 0.1), X(cy - h * 0.2), X(w * 0.8), X(h))
      }
    }

    // The far hills and the valley: flat and pale, slow to move with the camera.
    const hill1 = mixHex(mixHex(HILL.grass, HILL.sky, 0.62), mixHex(HILL.grassAutumn, HILL.skyGrey, 0.6), au)
    const hill2 = mixHex(mixHex(HILL.grass, HILL.sky, 0.4), mixHex(HILL.grassAutumn, HILL.skyGrey, 0.42), au)
    const field = mixHex(mixHex(HILL.grass, HILL.sky, 0.22), mixHex(HILL.grassAutumn, HILL.skyGrey, 0.25), au)
    const band = (shift: number, height: number, amp: number, freq: number, seed: number, color: string) => {
      p.fill(color)
      p.beginShape()
      p.vertex(X(f.x0 - 1), X(f.y1 + 1))
      for (let x = Math.floor(f.x0) - 1; x <= f.x1 + 1; x += 0.25) {
        const w = x - shift
        p.vertex(X(x), X(horizon - height - amp * (0.55 + 0.45 * Math.sin(w * freq + seed) + 0.25 * Math.sin(w * freq * 2.7 + seed * 2))))
      }
      p.vertex(X(f.x1 + 1), X(f.y1 + 1))
      p.endShape(p.CLOSE)
    }
    band(f.cx * 0.9, 0.35, 0.35, 0.33, 1, hill1)
    band(f.cx * 0.82, 0.05, 0.22, 0.52, 4, hill2)
    band(f.cx * 0.75, -0.35, 0.05, 0.9, 7, field)

    // The town in the valley, far off in the haze: one soft roofline, the houses run together under their gables,
    // and a steeple where their church is. A single pale shape, no gaps, no outline, so it never reads as a row of
    // marks.
    const townShift = f.cx * 0.78
    const ty = horizon + 0.05
    const town = mixHex(mixHex(HOME.roof, HILL.sky, 0.72), mixHex(HOME.roofOld, HILL.skyGrey, 0.72), au)
    const walls = mixHex(mixHex(HILL.grass, HILL.sky, 0.72), mixHex(HOME.trim, HILL.skyGrey, 0.7), au)
    const tx0 = townShift + 4.2
    const tx1 = townShift + 7.0
    if (tx1 > f.x0 - 1 && tx0 < f.x1 + 1) {
      p.noStroke()
      p.fill(alpha(p, mixHex(town, walls, 0.45), 0.42))
      p.beginShape()
      p.vertex(X(tx0), X(ty))
      for (let i = 0; i < 9; i++) {
        const x = tx0 + 0.16 + i * 0.3 + 0.06 * hash(i, 21)
        const h = 0.1 + 0.07 * hash(i, 22)
        const w = 0.3
        p.vertex(X(x - w / 2), X(ty - h))
        if (i === 4) {
          // The steeple.
          p.vertex(X(x - 0.07), X(ty - h))
          p.vertex(X(x - 0.07), X(ty - h - 0.34))
          p.vertex(X(x), X(ty - h - 0.7))
          p.vertex(X(x + 0.07), X(ty - h - 0.34))
          p.vertex(X(x + 0.07), X(ty - h))
        } else p.vertex(X(x), X(ty - h - 0.1))
        p.vertex(X(x + w / 2), X(ty - h))
      }
      p.vertex(X(tx0 + 0.16 + 8 * 0.3 + 0.2), X(ty))
      p.endShape(p.CLOSE)
    }

    // The hill: the crest and its flank, filled down past the lane; its skyline inked once.
    const grass = mixHex(HILL.grass, HILL.grassAutumn, au)
    const grassDark = mixHex(mixHex(HILL.grass, HILL.leaf, 0.6), mixHex(HILL.grassAutumn, HILL.bark, 0.3), au)
    const xs: number[] = []
    const a = Math.max(f.x0 - 1, -14)
    const b = Math.min(f.x1 + 1, STEP.x1)
    for (let x = a; x < b; x += 0.1) xs.push(x)
    xs.push(b)
    if (b > a) {
      p.fill(grass)
      p.beginShape()
      p.vertex(X(a), X(LANE_Y + 3))
      for (const x of xs) p.vertex(X(x), X(ridge(x) + R))
      p.vertex(X(b), X(LANE_Y + 3))
      p.endShape(p.CLOSE)
      // A shade across the face, deepening toward the foot: the hill's bulk.
      ctx.save()
      const sh = ctx.createLinearGradient(0, X(0), 0, X(LANE_Y + 0.2))
      sh.addColorStop(0, 'rgba(0,0,0,0)')
      sh.addColorStop(1, `rgba(40, 50, 30, ${0.1 + 0.04 * au})`)
      ctx.fillStyle = sh
      ctx.beginPath()
      ctx.moveTo(X(a), X(LANE_Y + 0.4))
      for (const x of xs) ctx.lineTo(X(x), X(ridge(x) + R))
      ctx.lineTo(X(b), X(LANE_Y + 0.4))
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      // The path along the skyline: a worn band just under the edge, from the step to the crest.
      const px0 = Math.max(a, CREST.x1 - 0.8)
      const px1 = Math.min(b, STEP.x0)
      if (px1 > px0) {
        p.noStroke()
        p.fill(alpha(p, mixHex(HOME.stone, grass, 0.35), 0.9))
        p.beginShape()
        for (let x = px0; x <= px1; x += 0.1) p.vertex(X(x), X(ridge(x) + R))
        for (let x = px1; x >= px0; x -= 0.1) p.vertex(X(x), X(ridge(x) + R + 0.055 * smooth(x, CREST.x1 - 0.8, CREST.x1)))
        p.endShape(p.CLOSE)
      }
      p.noFill()
      p.stroke(alpha(p, INK, 0.85))
      p.strokeWeight(weight * 0.9)
      p.beginShape()
      for (const x of xs) {
        if (x > STEP.x0 + 1e-6) break
        p.vertex(X(x), X(ridge(x) + R))
      }
      p.endShape()
      // Tufts along the skyline, the odd one taller: grass, then straw.
      p.stroke(alpha(p, grassDark, 0.9))
      p.strokeWeight(Math.max(1, weight * 0.55))
      for (let i = Math.floor(a / 0.23); i * 0.23 < b; i++) {
        const x = i * 0.23 + 0.08 * hash(i, 31)
        if (x > STEP.x0 - 0.1 || (x > -0.85 && x < 2.6)) continue
        const y = ridge(x) + R
        const h = 0.06 + 0.07 * hash(i, 32)
        const lean = 0.03 * Math.sin(t * 1.3 + i * 0.7)
        p.line(X(x), X(y), X(x - 0.03 + lean), X(y - h))
        p.line(X(x + 0.03), X(y), X(x + 0.05 + lean), X(y - h * 0.8))
      }
    }

    // The step: one stone slab, where the path leaves the lane.
    if (STEP.x1 > f.x0 - 1 && STEP.x0 < f.x1 + 1) {
      p.stroke(INK)
      p.strokeWeight(weight * 0.9)
      p.fill(mixHex(HOME.stone, HILL.skyGrey, 0.15 + 0.2 * au))
      p.rect(X(STEP.x0 - 0.08), X(STEP.y + R), X(STEP.x1 - STEP.x0 + 0.08), X(0.13), X(0.025))
    }

    // The lane at the foot, in front of the hill: a pale track, its verge, and the field below.
    const lane = mixHex(HOME.stone, mixHex(HOME.stone, HILL.grassAutumn, 0.3), au)
    const top = LANE_Y + R
    p.noStroke()
    p.fill(mixHex(grass, grassDark, 0.35))
    p.rect(X(f.x0 - 1), X(top + 0.16), X(f.x1 - f.x0 + 2), X(Math.max(0, f.y1 - top + 1)))
    p.fill(lane)
    p.rect(X(f.x0 - 1), X(top), X(f.x1 - f.x0 + 2), X(0.16))
    p.stroke(alpha(p, INK, 0.85))
    p.strokeWeight(weight * 0.9)
    p.line(X(f.x0 - 1), X(top), X(Math.min(f.x1 + 1, STEP.x0 - 0.08)), X(top))
    p.line(X(Math.max(f.x0 - 1, STEP.x1)), X(top), X(f.x1 + 1), X(top))
    // Ruts in the track, faint.
    p.stroke(alpha(p, mixHex(lane, INK, 0.3), 0.35))
    p.strokeWeight(Math.max(1, weight * 0.4))
    for (let i = Math.floor(f.x0 / 1.7) - 1; i * 1.7 < f.x1 + 1; i++) {
      const x = i * 1.7 + 0.5 * hash(i, 51)
      p.line(X(x), X(top + 0.07), X(x + 0.5 + 0.4 * hash(i, 52)), X(top + 0.07))
    }
    // The field in front: darkening toward us, a verge of tufts along the lane, and the odd tuft further down.
    if (f.y1 > top + 0.2) {
      ctx.save()
      const fg = ctx.createLinearGradient(0, X(top + 0.16), 0, X(top + 2.6))
      fg.addColorStop(0, 'rgba(40, 36, 20, 0)')
      fg.addColorStop(1, `rgba(40, 36, 20, ${0.16 + 0.04 * au})`)
      ctx.fillStyle = fg
      ctx.fillRect(X(f.x0 - 1), X(top + 0.16), X(f.x1 - f.x0 + 2), X(Math.max(0, f.y1 - top + 1)))
      ctx.restore()
      p.stroke(alpha(p, grassDark, 0.85))
      p.strokeWeight(Math.max(1, weight * 0.55))
      for (let i = Math.floor(f.x0 / 0.31) - 1; i * 0.31 < f.x1 + 1; i++) {
        if (hash(i, 58) < 0.3) continue
        const x = i * 0.31 + 0.14 * hash(i, 53)
        const y = top + 0.17
        const h = 0.04 + 0.09 * hash(i, 54) ** 2
        const lean = 0.025 * Math.sin(t * 1.1 + i * 0.6)
        p.line(X(x), X(y), X(x - 0.03 + lean), X(y - h))
        p.line(X(x + 0.025), X(y), X(x + 0.05 + lean), X(y - h * 0.75))
      }
      p.stroke(alpha(p, grassDark, 0.5))
      for (let i = Math.floor(f.x0 / 0.9) - 1; i * 0.9 < f.x1 + 1; i++) {
        for (let row = 0; row < 3; row++) {
          const x = i * 0.9 + 0.6 * hash(i, 55, row)
          const y = top + 0.55 + row * 0.6 + 0.25 * hash(i, 56, row)
          if (y > f.y1 + 0.2) continue
          const h = 0.05 + 0.05 * hash(i, 57, row)
          p.line(X(x), X(y), X(x - 0.02), X(y - h))
          p.line(X(x + 0.03), X(y), X(x + 0.04), X(y - h * 0.8))
        }
      }
    }

    // The tree's trunk and limbs (the crown is drawn over the parts, so their clouds pass behind it).
    const tx = TREE_X
    const ty0 = R
    const base = ridge(tx)
    if (tx + 3 > f.x0 && tx - 3 < f.x1) {
      p.push()
      p.translate(0, X(base))
      const bark = mixHex(HILL.bark, mixHex(HILL.bark, HILL.skyGrey, 0.25), au)
      p.stroke(INK)
      p.strokeWeight(weight)
      p.fill(bark)
      // The trunk: short and stout, flaring at its foot, forking into its limbs.
      p.beginShape()
      p.vertex(X(tx - 0.4), X(ty0))
      p.bezierVertex(X(tx - 0.2), X(ty0 - 0.12), X(tx - 0.19), X(ty0 - 0.5), X(tx - 0.16), X(-1.12))
      p.vertex(X(tx + 0.17), X(-1.14))
      p.bezierVertex(X(tx + 0.2), X(ty0 - 0.5), X(tx + 0.21), X(ty0 - 0.12), X(tx + 0.42), X(ty0))
      p.endShape(p.CLOSE)
      for (const l of LIMBS) limb(p, k, tx, l)
      // Bare twigs show in autumn, through the thinning crown.
      if (au > 0.05) {
        p.noFill()
        p.stroke(alpha(p, bark, au))
        p.strokeWeight(Math.max(1, weight * 0.5))
        for (let i = 0; i < 12; i++) {
          const [x0, y0, , , x1, y1] = LIMBS[i % LIMBS.length]
          const u = 0.6 + 0.4 * hash(i, 61)
          const bx = tx + x0 + (x1 - x0) * u
          const by = y0 + (y1 - y0) * u
          const a2 = -Math.PI / 2 + (hash(i, 62) - 0.5) * 2.2
          p.line(X(bx), X(by), X(bx + Math.cos(a2) * 0.45), X(by + Math.sin(a2) * 0.45))
        }
      }
      p.pop()
    }
    p.pop()
  },
  over: (p, _s, c) => {
    const { k, t, weight } = c
    const au = autumn(t)
    const f = frame(p, k)
    const tx = TREE_X
    if (tx + 3.5 > f.x0 && tx - 3.5 < f.x1 && f.y0 < -1) {
      p.push()
      p.translate(0, ridge(tx) * k)
      // The crown: clumps from the back forward, each inked round its outside, shaded under, lit on top.
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const X = (v: number) => v * k
      const sway = 0.03 * Math.sin(t * 0.9) + 0.015 * Math.sin(t * 2.3 + 1)
      const body = mixHex(HILL.leaf, HILL.leafAutumn, au)
      const lit = mixHex(mixHex(HILL.leaf, HOME.yellow, 0.3), mixHex(HILL.leafAutumn, HOME.yellow, 0.4), au)
      const shade = mixHex(mixHex(HILL.leaf, INK, 0.3), mixHex(HILL.leafAutumn, HILL.bark, 0.45), au)
      CROWN.forEach((clump, j) => {
        // In autumn the crown thins a little.
        const s = 1 - 0.08 * au * (0.6 + 0.8 * hash(j, 91))
        const lean = sway * (1.2 - clump.y * 0.4)
        const discs = clump.discs.map((d) => ({ x: tx + clump.x + (d.x - clump.x) * s + lean, y: clump.y + (d.y - clump.y) * s, r: d.r * s }))
        p.stroke(alpha(p, INK, 0.9))
        p.strokeWeight(weight * 1.6)
        p.fill(shade)
        for (const d of discs) p.circle(X(d.x), X(d.y), X(2 * d.r))
        p.noStroke()
        for (const d of discs) p.circle(X(d.x), X(d.y), X(2 * d.r))
        ctx.save()
        ctx.beginPath()
        for (const d of discs) {
          ctx.moveTo(X(d.x + d.r), X(d.y))
          ctx.arc(X(d.x), X(d.y), X(d.r), 0, Math.PI * 2)
        }
        ctx.clip()
        p.fill(body)
        for (const d of discs) p.circle(X(d.x - 0.03), X(d.y - 0.13), X(2 * d.r))
        p.fill(alpha(p, lit, 0.85))
        for (const d of discs) p.circle(X(d.x - 0.08), X(d.y - 0.3), X(2 * d.r * 0.78))
        ctx.restore()
      })
      p.pop()
    }
    p.push()
    fallingLeaves(p, k, t, au, f)
    p.pop()
  },
})
