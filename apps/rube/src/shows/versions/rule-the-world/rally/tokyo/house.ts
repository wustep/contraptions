import type { Pt } from '../../../../../parts'
import { parallax, pulse, sway, type Frame } from '../depth'
import { hash } from '../kit'
import { WIN } from '../music'
import { ctxOf, type Pen } from '../pen'
import { box, Fills, oval, poly, toned } from './batch'
import { FASCIA, rowDepth, LOWER } from './crowd'
import { SECTIONS } from './geo'
import { ANCHOR, heat, HIGH, house, lit, sectionOf, surge } from './mood'
import { C } from './palette'
import { beamsAt, SPOTS, TRUSS_D, TRUSS_Y } from './light'

/**
 * The arena's build: the roof's truss over the upper tier with the house lights' banks, the spotlights and the
 * scoreboard hung from it; the balcony's front over the lower tier, its bunting
 * and the long banners hanging from it; and the lower string of lanterns over the stands. Everything sways or bobs,
 * and is seen as the house lights find it: the lanterns on the beat once the lights are up, the banners in the draught
 * and on the surges. A lamp here is its lit lens or its lit paper, never a glow round it.
 */

/* ------------------------------------------------------------------ the roof's truss */

const TRUSS_H = 0.42
/** The scoreboard, hung from the truss over the judges' end. */
const BOARD_X: [number, number] = [-3.95, -0.95]
const BOARD_Y: [number, number] = [-5.93, -5.36]

export function drawRigging(pen: Pen, t: number, f: Frame): void {
  const [dx, dy] = parallax(f, TRUSS_D, HIGH)
  const yb = TRUSS_Y + dy
  if (yb - 6 > f.y1 || yb + 0.8 < f.y0) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const lights = house(t)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The cables up into the dark, the two chords, and the zigzag between them.
  const iron = new Fills()
  const thin = new Fills()
  // Dark iron against the lit tier behind it.
  const ironCol = toned(pen, C.truss, 1)
  const thinCol = toned(pen, C.trussHi, 0.3 + 0.2 * lights)
  const ch = iron.at(ironCol)
  ch.moveTo(x0 * k, yb * k)
  ch.lineTo(x1 * k, yb * k)
  ch.moveTo(x0 * k, (yb - TRUSS_H) * k)
  ch.lineTo(x1 * k, (yb - TRUSS_H) * k)
  const zz = thin.at(thinCol)
  const step = 0.42
  for (let i = Math.floor((x0 - dx) / step); i * step + dx < x1; i++) {
    const x = i * step + dx
    zz.moveTo(x * k, yb * k)
    zz.lineTo((x + step) * k, (yb - TRUSS_H) * k)
    if (i % 5 === 0) {
      zz.moveTo(x * k, (yb - TRUSS_H) * k)
      zz.lineTo((x + 0.15 * Math.sin(i)) * k, (yb - 6) * k)
    }
  }
  ctx.save()
  ctx.lineCap = 'butt'
  thin.stroke(ctx, pen.w * 0.9)
  iron.stroke(ctx, pen.w * 2.4)
  ctx.restore()

  // The house lights' banks under it, four to a section, their lenses lit with their sections.
  const housings = new Fills()
  const lenses = new Fills()
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = SECTIONS[i]
    const b = SECTIONS[i + 1]
    if (b + dx < x0 || a + dx > x1) continue
    const L = Math.min(1, lit(i, t))
    for (let j = 0; j < 4; j++) {
      const lx = a + ((b - a) * (j + 0.5)) / 4 + dx
      box(housings.at(toned(pen, C.iron, 0.6)), k, lx - 0.3, yb, lx + 0.3, yb + 0.2)
      box(lenses.at(toned(pen, '#E8E4D8', 0.12 + 0.88 * L)), k, lx - 0.25, yb + 0.18, lx + 0.25, yb + 0.25)
    }
  }

  // The spotlights: a drum on a yoke, turned where it is pointed, its lens lit while it is on (the inner pair).
  const beams = beamsAt(t, f)
  for (let i = 0; i < SPOTS.length; i++) {
    const sx = SPOTS[i] + dx
    if (sx < x0 || sx > x1) continue
    const bm = beams[i]
    const ang = Math.atan2(bm.to[0] - bm.from[0], bm.to[1] - bm.from[1])
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const c: Pt = [sx, yb + 0.22]
    // The drum: along the beam's line, 0.5 long, 0.32 across.
    const pts = [-0.16, -0.3, 0.16, -0.3, 0.16, 0.22, -0.16, 0.22]
    const out: number[] = []
    for (let q = 0; q < pts.length; q += 2) out.push(pts[q] * ca + pts[q + 1] * sa, -pts[q] * sa + pts[q + 1] * ca)
    poly(housings.at(toned(pen, C.iron, 0.7)), k, c[0], c[1], out)
    box(housings.at(toned(pen, C.iron, 0.5)), k, sx - 0.04, yb, sx + 0.04, yb + 0.22)
    oval(lenses.at(toned(pen, C.beam, 0.2 + 0.7 * bm.a)), k, bm.from[0], bm.from[1], 0.15, 0.15)
  }

  // The scoreboard: two panels of lamps, ten lit a side, and his eleventh on the winner.
  const bx0 = BOARD_X[0] + dx
  const bx1 = BOARD_X[1] + dx
  const by0 = BOARD_Y[0] + dy
  const by1 = BOARD_Y[1] + dy
  if (bx1 > x0 && bx0 < x1) {
    const cable = thin.at(thinCol)
    cable.moveTo((bx0 + 0.4) * k, yb * k)
    cable.lineTo((bx0 + 0.4) * k, by0 * k)
    cable.moveTo((bx1 - 0.4) * k, yb * k)
    cable.lineTo((bx1 - 0.4) * k, by0 * k)
    box(housings.at(toned(pen, C.iron, 0.55)), k, bx0, by0, bx1, by1)
    const mid = (bx0 + bx1) / 2
    box(housings.at(toned(pen, C.cloth, 0.12 + 0.5 * lights)), k, bx0 + 0.08, by0 + 0.07, mid - 0.05, by1 - 0.07)
    box(housings.at(toned(pen, C.red, 0.2 + 0.6 * lights)), k, mid + 0.05, by0 + 0.07, bx1 - 0.08, by1 - 0.07)
    const won = t >= WIN
    for (const [side, n] of [[-1, 10], [1, won ? 11 : 10]] as const) {
      const px0 = side < 0 ? bx0 + 0.2 : mid + 0.17
      for (let q = 0; q < 11; q++) {
        const x = px0 + (q % 6) * 0.2
        const y = by0 + 0.2 + Math.floor(q / 6) * 0.2
        const on = q < n
        oval(lenses.at(on ? toned(pen, C.bulbWarm, 0.45 + 0.55 * lights) : toned(pen, C.dark, 1)), k, x, y, 0.055, 0.055)
      }
    }
  }
  ctx.save()
  thin.stroke(ctx, pen.w * 0.55)
  housings.fill(ctx)
  lenses.fill(ctx)
  ctx.restore()
}

/* ------------------------------------------------------------------ the lanterns and the bunting */

/**
 * Paper lanterns on a sagging string, red and white by turns, their paper paler as the house lights come up: they sway
 * on their cords and bob with the beat once the house is lit. Gathered into the caller's fills (`cords` to stroke,
 * `caps` and `face` to fill).
 */
function lanterns(pen: Pen, t: number, dx: number, y: number, sc: number, span: number, seed: number, f: Frame, cords: Fills, caps: Fills, face: Fills): void {
  const { k } = pen
  const L = Math.min(1, lit(3, t))
  const beat = pulse(t, 0.3) * house(t)
  const hot = heat(t)
  const cord = toned(pen, '#2A2522', 1)
  const x0 = f.x0 - 1 - dx
  const x1 = f.x1 + 1 - dx
  for (let a = Math.floor(x0 / span) * span; a < x1; a += span) {
    const n = Math.round(a / span)
    const sag = (u: number) => y + 0.4 * sc * 4 * u * (1 - u) + 0.03 * Math.sin(t * 0.9 + n)
    const p = cords.at(cord)
    for (let j = 0; j <= 10; j++) {
      const x = (a + (span * j) / 10 + dx) * k
      const yy = sag(j / 10) * k
      if (j) p.lineTo(x, yy)
      else p.moveTo(x, yy)
    }
    for (let j = 1; j < 4; j++) {
      const u = j / 4
      const lx = a + span * u + dx
      const s = seed + n * 7 + j
      // Swaying on its cord, and a hop on each beat once the lights are up.
      const sw = (0.035 + 0.04 * hot) * sway(t, s, 2.6 + hash(s, 3) * 1.4) + 0.03 * Math.sin(t * 1.3 + s)
      const ly = sag(u) + 0.1 * sc - 0.035 * sc * beat * (0.6 + 0.8 * hash(s, 5))
      const red = (n + j + seed) % 2 === 0
      const col = red ? C.red : C.white
      const cx = lx + sw
      const cy = ly + 0.22 * sc
      p.moveTo(lx * k, sag(u) * k)
      p.lineTo(cx * k, ly * k)
      oval(face.at(toned(pen, col, 0.32 + 0.6 * L)), k, cx, cy, 0.2 * sc, 0.25 * sc)
      box(caps.at(cord), k, cx - 0.08 * sc, ly - 0.03 * sc, cx + 0.08 * sc, ly + 0.01 * sc)
      box(caps.at(cord), k, cx - 0.08 * sc, cy + 0.22 * sc, cx + 0.08 * sc, cy + 0.27 * sc)
      // The paper's ribs.
      const rib = face.at(toned(pen, col, 0.18 + 0.3 * L))
      for (const d of [-0.09, 0.08]) box(rib, k, cx - 0.17 * sc, cy + d * sc - 0.008, cx + 0.17 * sc, cy + d * sc + 0.008)
    }
  }
}

/** Red and white pennants on a line, flicking in the draught; into `fills`. */
function bunting(pen: Pen, t: number, x0: number, x1: number, y: number, step: number, h: number, L: number, fills: Fills): void {
  const { k } = pen
  let n = Math.floor(x0 / step)
  const red = toned(pen, C.red, 0.35 + 0.55 * L)
  const white = toned(pen, C.white, 0.35 + 0.55 * L)
  const flick = 0.02 + 0.03 * heat(t)
  for (let x = n * step; x < x1; x += step, n++) {
    const wob = flick * Math.sin(t * 2.3 + n * 1.7)
    poly(fills.at(n % 2 === 0 ? red : white), k, 0, 0, [x + 0.02, y, x + step - 0.02, y, x + step / 2 + wob, y + h * 1.6])
  }
}

/** The bunting along the front of the stands, over the red wall. */
export function drawWallBunting(pen: Pen, t: number, x0: number, x1: number, y: number): void {
  const ctx = ctxOf(pen.p)
  const fills = new Fills()
  bunting(pen, t, x0, x1, y, 1.1, 0.16, 0.4 + 0.6 * Math.min(1, lit(3, t)), fills)
  ctx.save()
  fills.fill(ctx)
  ctx.strokeStyle = toned(pen, '#2A2522', 1)
  ctx.lineWidth = pen.w * 0.4
  ctx.beginPath()
  ctx.moveTo(x0 * pen.k, y * pen.k)
  ctx.lineTo(x1 * pen.k, y * pen.k)
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ the balcony */

/** The banners hung from the balcony's front: where, and which (a red sun on white, or red with white bands). */
const BANNERS: [number, number][] = [
  [-14.6, 1],
  [-10.4, 0],
  [-6.3, 1],
  [-2.3, 0],
  [8.9, 0],
  [13.1, 1],
  [17.4, 0],
]

/** The balcony's front over the lower tier: its red face and pale rail, bunting under it, banners hanging down. */
export function drawBalcony(pen: Pen, t: number, f: Frame): void {
  const d = rowDepth(LOWER - 1) - 0.01
  const [dx, dy] = parallax(f, d, ANCHOR)
  const y1 = FASCIA + dy
  const y0 = y1 - 0.42
  if (y0 > f.y1 || y1 + 2.4 < f.y0) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const face = new Fills()
  const hang = new Fills()
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    const a = Math.max(SECTIONS[i] + dx, x0)
    const b = Math.min(SECTIONS[i + 1] + dx, x1)
    if (b <= a) continue
    const L = Math.min(1, lit(i, t)) * 0.7
    box(face.at(toned(pen, C.wall, 0.14 + 0.55 * L)), k, a, y0, b, y1)
    box(face.at(toned(pen, C.rail, 0.15 + 0.7 * L)), k, a, y0 - 0.05, b, y0 + 0.03)
    box(face.at(toned(pen, C.dark, 1)), k, a, y1 - 0.05, b, y1)
  }
  bunting(pen, t, x0, x1, y1, 0.75, 0.12, 0.3 + 0.6 * Math.min(1, lit(3, t)), hang)
  // The banners: in the draught and the house's roar, their feet swinging.
  const sg = surge(t)
  for (const [bx, kind] of BANNERS) {
    const x = bx + dx
    if (x + 0.6 < x0 || x - 0.6 > x1) continue
    const L = Math.min(1, lit(sectionOf(bx), t)) * 0.75 + 0.06
    const w = 0.66
    const len = 2.15
    const s = 0.07 * sway(t, bx, 4.5) + 0.05 * sg * Math.sin(t * 5 + bx)
    const at = (u: number, v: number): [number, number] => [x + (u - 0.5) * w + s * v * v + 0.03 * v * Math.sin(t * 1.7 + bx + v * 3), y1 + v * len]
    const quad = (p: Path2D, u0: number, u1: number, v0: number, v1: number) => {
      const pts = [at(u0, v0), at(u1, v0), at(u1, (v0 + v1) / 2), at(u1, v1), at(u0, v1), at(u0, (v0 + v1) / 2)]
      pts.forEach(([px, py], q) => (q ? p.lineTo(px * k, py * k) : p.moveTo(px * k, py * k)))
      p.closePath()
    }
    const ground = kind === 0 ? C.white : C.red
    const mark = kind === 0 ? C.redHi : C.white
    const gp = hang.at(toned(pen, ground, 0.25 + 0.7 * L))
    quad(gp, 0, 1, 0, 0.94)
    // A swallowtail foot.
    const [lx, ly] = at(0, 0.94)
    const [mx, my] = at(0.5, 0.86)
    const [rx, ry] = at(1, 0.94)
    const [lt, lty] = at(0.05, 1.02)
    const [rt, rty] = at(0.95, 1.02)
    gp.moveTo(lx * k, ly * k)
    gp.lineTo(lt * k, lty * k)
    gp.lineTo(mx * k, my * k)
    gp.lineTo(rt * k, rty * k)
    gp.lineTo(rx * k, ry * k)
    gp.closePath()
    const mp = hang.at(toned(pen, mark, 0.25 + 0.7 * L))
    if (kind === 0) {
      const [cx, cy] = at(0.5, 0.36)
      oval(mp, k, cx, cy, 0.19, 0.19)
      quad(mp, 0, 1, 0.8, 0.84)
    } else {
      quad(mp, 0.12, 0.88, 0.16, 0.22)
      quad(mp, 0.12, 0.88, 0.3, 0.36)
      quad(mp, 0.12, 0.88, 0.7, 0.76)
    }
    box(hang.at(toned(pen, C.iron, 0.6)), k, x - w / 2 - 0.05, y1 - 0.02, x + w / 2 + 0.05, y1 + 0.05)
  }
  ctx.save()
  face.fill(ctx)
  hang.fill(ctx)
  ctx.restore()
}

/** The lower string of lanterns, over the lower tier. */
export function drawLowLanterns(pen: Pen, t: number, f: Frame): void {
  const [dx, dy] = parallax(f, 0.88, ANCHOR)
  const y = -4.3 + dy
  if (y > f.y1 || y + 0.9 < f.y0) return
  const ctx = ctxOf(pen.p)
  const cords = new Fills()
  const caps = new Fills()
  const face = new Fills()
  lanterns(pen, t, dx, y, 0.75, 3.3, 1, f, cords, caps, face)
  ctx.save()
  cords.stroke(ctx, pen.w * 0.45)
  caps.fill(ctx)
  face.fill(ctx)
  ctx.restore()
}
