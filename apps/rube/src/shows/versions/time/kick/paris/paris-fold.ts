import { mixHex, type Pt } from '../../../../../parts'
import { beam, bloom } from '../cast'
import { frame, hash } from '../kit'
import { PARIS } from '../worlds'
import { crowd, figure, turned, type Figure } from './paris-crowd'
import {
  C,
  COBB_END_S,
  H,
  LEVER,
  LEVER_HOME,
  LOCK,
  MAL_FROM,
  MAL_S0,
  malS,
  PAN_DROP,
  paidOut,
  R,
  RELEASE,
  STARE,
  STEP,
  SURGES,
  theta,
  tip,
  leverAngle,
  leverEnd,
  Y_S,
} from './paris-geo'
import { arc, ctxOf, fillPaths, line, oval, poly, puff, rect, seen, shape, strokePaths, vwash, type Pen } from './paris-pen'
import { facadeBlock, hazeCity, lampPost } from './paris-set'

/**
 * The fold (the PARIS builder's): the hinge's machine in its pit under the quai (the great gear, the drum wound with
 * the tambour's slabs, the escapement's anchor, the counterweight in its shaft), Ariadne's lever on the square, the
 * curve of locked slabs growing out of the slot, and the leaf it pushes up and over: the Bir-Hakeim bridge, its iron
 * colonnade and the Métro's deck on it, its arches and piers, the Seine in its bed, the far bank, the roofs beyond.
 */

type Frame = { x0: number; y0: number; x1: number; y1: number }

const IRON_LIT = mixHex(PARIS.iron, PARIS.zinc, 0.35)
const PIT = mixHex(PARIS.cafe, PARIS.crowd, 0.55)
const PIT_WALL = mixHex(PARIS.cobbleDark, PARIS.iron, 0.3)
const QUAI = mixHex(PARIS.stone, PARIS.stoneShade, 0.55)
const WATER = PARIS.seine
const WATER_DEEP = mixHex(PARIS.seine, PARIS.iron, 0.55)
const EARTH = mixHex(PARIS.cobbleDark, PARIS.iron, 0.45)
const SLAB = mixHex(PARIS.cobble, PARIS.stone, 0.25)

/* ------------------------------------------------------------------ the drive */

/** The drum and the gear on its axle; how far they have turned (the strip paid out over the coil's radius). */
export const AXLE: Pt = [7.95, Y_S + 1.55]
const GEAR_R = 1.02
const COIL_FULL = 0.94
const COIL_EMPTY = 0.46
const coilR = (t: number): number => COIL_FULL - (COIL_FULL - COIL_EMPTY) * (theta(t) / Math.PI)
const gearTurn = (t: number): number => paidOut(t) / 0.72
/** The counterweight's top: it goes down its shaft as the drum pays out. */
const weightTop = (t: number): number => Y_S + 1.05 + 2.7 * (theta(t) / Math.PI)
const WEIGHT_X = 6.55

/** The anchor rocks over on every strike of the drive, and rests locked before the lever lets it go. */
function anchorAngle(t: number): number {
  const beats = [LEVER_HOME, ...SURGES.map(([s]) => s), RELEASE]
  let a = 0.16
  let sign = 1
  for (const s of beats) {
    if (t < s) break
    sign = -sign
    const u = t - s
    const from = a
    a = from + (sign * 0.16 - from) * (1 - Math.exp(-u / 0.07))
    if (u > 0) a += sign * 0.03 * Math.exp(-u / 0.12) * Math.sin(u * 40)
  }
  if (t > LOCK) a *= Math.exp(-(t - LOCK) / 0.6)
  return a
}

function gear(pen: Pen, c: Pt, r: number, turn: number, teeth: number, fill: string): void {
  const pts: Pt[] = []
  for (let i = 0; i < teeth; i++) {
    const a0 = turn + (i / teeth) * Math.PI * 2
    const d = (Math.PI * 2) / teeth
    pts.push(
      [c[0] + Math.cos(a0) * (r - 0.09), c[1] + Math.sin(a0) * (r - 0.09)],
      [c[0] + Math.cos(a0 + d * 0.18) * r, c[1] + Math.sin(a0 + d * 0.18) * r],
      [c[0] + Math.cos(a0 + d * 0.5) * r, c[1] + Math.sin(a0 + d * 0.5) * r],
      [c[0] + Math.cos(a0 + d * 0.68) * (r - 0.09), c[1] + Math.sin(a0 + d * 0.68) * (r - 0.09)],
    )
  }
  shape(pen, pts, fill, 0.7)
  // The web between rim and hub, cut away between spokes.
  const holes: Pt[][] = []
  for (let i = 0; i < 6; i++) {
    const a = turn + (i / 6) * Math.PI * 2 + 0.2
    holes.push(arc(c, r - 0.2, a, a + 0.72, 6).concat(arc(c, 0.28, a + 0.72, a, 3)))
  }
  fillPaths(pen, holes, PIT)
  oval(pen, c, 0.16, 0.16, IRON_LIT, 0.6)
}

/** The pit under the quai, cut open: the drum, the gear, the anchor, the counterweight; the sun down the slot. */
function pit(pen: Pen, t: number, f: Frame): void {
  const x0 = 6.1
  const x1 = H - 0.05
  const y0 = Y_S + 0.28
  const y1 = Y_S + 3.9
  if (!seen(f, x0, y0, x1 + 0.3, y1)) return
  rect(pen, x0, y0, x1, y1, PIT, 0)
  // Its stone walls, faint courses.
  const courses: Pt[][] = []
  for (let y = y0 + 0.4; y < y1; y += 0.4) courses.push([[x0, y], [x1, y]])
  strokePaths(pen, courses, PIT_WALL, 0.3, 0.5)
  // The sun down through the slot onto the drum.
  beam(pen.p, pen.k, [H - 0.05, Y_S + 0.1], [AXLE[0] - 0.6, y1], 0.12, 1.4, PARIS.lamp, 0.3)
  // The counterweight's shaft through the floor, and the weight on its chain.
  rect(pen, WEIGHT_X - 0.45, y1 - 0.05, WEIGHT_X + 0.45, Math.max(y1 + 0.1, f.y1 + 1), mixHex(PIT, PARIS.crowd, 0.5), 0)
  const top = weightTop(t)
  const sheave: Pt = [WEIGHT_X, y0 + 0.28]
  poly(pen, [[AXLE[0] - 0.22, AXLE[1]], [sheave[0] + 0.18, sheave[1] - 0.05], sheave], PARIS.iron, 0.9)
  line(pen, [sheave[0], sheave[1]], [sheave[0], top], PARIS.iron, 0.9)
  oval(pen, sheave, 0.16, 0.16, IRON_LIT, 0.6)
  shape(pen, [[WEIGHT_X - 0.31, top + 0.1], [WEIGHT_X - 0.1, top], [WEIGHT_X + 0.1, top], [WEIGHT_X + 0.31, top + 0.1], [WEIGHT_X + 0.31, top + 0.9], [WEIGHT_X - 0.31, top + 0.9]], PARIS.iron, 0.8)
  line(pen, [WEIGHT_X - 0.31, top + 0.3], [WEIGHT_X + 0.31, top + 0.3], IRON_LIT, 0.5)
  // The gear (behind), the drum wound with the strip of slabs (in front).
  const turn = gearTurn(t)
  gear(pen, AXLE, GEAR_R, turn, 26, PARIS.iron)
  const cr = coilR(t)
  oval(pen, AXLE, cr, cr, mixHex(SLAB, PARIS.iron, 0.35), 0.7)
  // The coil's turns, rolling with the drum.
  const turns: Pt[][] = []
  for (let rr = 0.4; rr < cr - 0.05; rr += 0.12) turns.push(arc(AXLE, rr, turn * 0.3 + rr * 4, turn * 0.3 + rr * 4 + 5.2, 18))
  strokePaths(pen, turns, PARIS.iron, 0.4, 0.8)
  oval(pen, AXLE, 0.2, 0.2, IRON_LIT, 0.6)
  // The strip, off the coil's top to the roller under the slot, and out.
  const off: Pt = [AXLE[0], AXLE[1] - cr]
  const roller: Pt = [H - 0.18, Y_S + 0.38]
  shape(pen, [off, roller, [roller[0], roller[1] + 0.3], [off[0], off[1] + 0.3]], SLAB, 0.6)
  oval(pen, roller, 0.14, 0.14, IRON_LIT, 0.6)
  // The escapement's anchor over the gear, rocking a tooth over on every strike.
  const piv: Pt = [AXLE[0] - 0.62, Y_S + 0.52]
  const a = anchorAngle(t)
  const P = (x: number, y: number): Pt => [piv[0] + x * Math.cos(a) - y * Math.sin(a), piv[1] + x * Math.sin(a) + y * Math.cos(a)]
  shape(pen, [P(-0.55, 0.05), P(-0.45, -0.07), P(0.62, -0.07), P(0.72, 0.05), P(0.66, 0.34), P(0.54, 0.34), P(0.54, 0.06), P(-0.37, 0.06), P(-0.37, 0.3), P(-0.49, 0.3)], PARIS.iron, 0.7)
  oval(pen, piv, 0.09, 0.09, IRON_LIT, 0.5)
  // The rod up to the lever's crank on the square.
  line(pen, P(-0.5, 0), [LEVER.at[0] + 0.18 * Math.sin(leverAngle(t) + Math.PI / 2), Y_S + 0.02], PARIS.iron, 0.8)
  // The quai's wall, and the slot's iron lips.
  rect(pen, x1, Y_S, x1 + 0.2, y1 + 0.6, QUAI, 0.6)
  rect(pen, H - 0.34, Y_S - 0.02, H - 0.2, Y_S + 0.16, PARIS.iron, 0.5)
}

/* ------------------------------------------------------------------ the lever */

/** Ariadne's lever: a cast-iron stand on the square, a long arm, a pan that hangs level from its end. */
function lever(pen: Pen, t: number, f: Frame): void {
  const { at } = LEVER
  if (!seen(f, at[0] - 1.6, at[1] - 1.6, at[0] + 1.6, Y_S + 0.2)) return
  const end = leverEnd(t)
  // The stand and its quadrant.
  shape(pen, [[at[0] - 0.24, Y_S], [at[0] - 0.12, at[1] - 0.02], [at[0] + 0.12, at[1] - 0.02], [at[0] + 0.24, Y_S]], PARIS.iron, 0.7)
  poly(pen, arc(at, 0.42, -Math.PI / 2 - 0.5, -Math.PI / 2 + 1.25, 10), IRON_LIT, 0.8)
  // The arm, tapering.
  const a = leverAngle(t)
  const n: Pt = [Math.cos(a), Math.sin(a)]
  shape(pen, [[at[0] - n[0] * 0.06, at[1] - n[1] * 0.06], [end[0] - n[0] * 0.03, end[1] - n[1] * 0.03], [end[0] + n[0] * 0.03, end[1] + n[1] * 0.03], [at[0] + n[0] * 0.06, at[1] + n[1] * 0.06]], PARIS.iron, 0.7)
  oval(pen, at, 0.08, 0.08, IRON_LIT, 0.5)
  // The pan, hung level from the arm's end on its stirrup.
  const floor = end[1] + PAN_DROP - 0.02
  strokePaths(pen, [[end, [end[0] - 0.15, floor - 0.08]], [end, [end[0] + 0.15, floor - 0.08]]], PARIS.iron, 0.5)
  shape(pen, [[end[0] - 0.19, floor - 0.1], [end[0] + 0.19, floor - 0.1], [end[0] + 0.13, floor + 0.02], [end[0] - 0.13, floor + 0.02]], IRON_LIT, 0.6)
  // On the stop: a knock of dust off the square.
  const u = t - LEVER_HOME
  if (u > 0 && u < 1.5) puff(pen, [end[0] + 0.1, Y_S - 0.05], 0.2 + 0.4 * u, mixHex(PARIS.stone, PARIS.sky, 0.3), 0.25 * Math.exp(-u / 0.5))
}

/* ------------------------------------------------------------------ the curve */

const CURVE_T = 0.42
const JOINT = 0.8
/** The curve of locked slabs out of the slot, from the bottom (φ 0) round to its tip (φ θ): paving inside, iron outside. */
function curve(pen: Pen, t: number, f: Frame): void {
  const th = theta(t)
  if (th <= 0.001) return
  if (!seen(f, C[0] - R - 1, C[1] - R - 1, C[0] + R + 1, C[1] + R + 1)) return
  const at = (phi: number, r: number): Pt => [C[0] + r * Math.sin(phi), C[1] + r * Math.cos(phi)]
  const n = Math.max(2, Math.ceil(th / 0.04))
  const band = (r0: number, r1: number): Pt[] => {
    const out: Pt[] = []
    for (let i = 0; i <= n; i++) out.push(at((th * i) / n, r0))
    for (let i = n; i >= 0; i--) out.push(at((th * i) / n, r1))
    return out
  }
  shape(pen, band(R + 0.1, R + CURVE_T), PARIS.iron, 0.8)
  shape(pen, band(R, R + 0.1), SLAB, 0.6)
  // The joints between slabs, moving up with the strip as it pays out, and the iron knuckles over them.
  const joints: Pt[][] = []
  const knuckles: Pt[][] = []
  const d = JOINT / R
  for (let phi = th - d * 0.5; phi > 0; phi -= d) {
    joints.push([at(phi, R), at(phi, R + 0.1)])
    const k0 = at(phi - 0.035, R + CURVE_T)
    const k1 = at(phi + 0.035, R + CURVE_T)
    const k2 = at(phi + 0.035, R + CURVE_T + 0.1)
    const k3 = at(phi - 0.035, R + CURVE_T + 0.1)
    knuckles.push([k0, k1, k2, k3])
    joints.push([at(phi, R + 0.14), at(phi, R + CURVE_T - 0.04)])
  }
  strokePaths(pen, joints, mixHex(PARIS.iron, SLAB, 0.4), 0.4)
  fillPaths(pen, knuckles, IRON_LIT)
  // The slam: dust shaken out of every joint of it at once, drifting off and thinning.
  const w = t - LOCK
  if (w > 0 && w < 2.6) {
    let j = 0
    for (let phi = th - d * 0.5; phi > 0; phi -= d, j++) {
      const r = 0.25 + 0.5 * (1 - Math.exp(-w / 0.4))
      puff(pen, at(phi, R + CURVE_T + 0.15 + 0.35 * (1 - Math.exp(-w / 0.5))), r, mixHex(PARIS.stone, PARIS.sky, 0.25), 0.32 * Math.exp(-w / 0.7) * (0.7 + 0.3 * hash(j, 9)))
    }
  }
  // The sun along the paving's face.
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.strokeStyle = `rgba(255, 238, 200, 0.35)`
  ctx.lineWidth = Math.max(1, 0.03 * pen.k)
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const [x, y] = at((th * i) / n, R + 0.02)
    if (i === 0) ctx.moveTo(x * pen.k, y * pen.k)
    else ctx.lineTo(x * pen.k, y * pen.k)
  }
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ the leaf */

const DECK_END = 28.2
const PIERS = [9.6, 18.9]
export const COLUMNS: number[] = Array.from({ length: 11 }, (_, j) => 1.6 + 2.6 * j)
const COL_H = 2.7
const METRO = 0.5
const WATER_Y = Y_S + 2.2
const BED_Y = Y_S + 3.6
const UNDER = Y_S + 3.95

/** The city across the river, far off behind the bridge in the haze: it rides the bridge up and over. */
function farRoofs(pen: Pen, f: Frame): void {
  const x0 = Math.max(H + 2.6, f.x0 - 3)
  const x1 = Math.min(H + 44, f.x1 + 3)
  if (!seen(f, H + 2.6, Y_S - 3.6, H + 44, Y_S)) return
  hazeCity(pen, x0, x1, H + 2.6, 17, 3.4)
}

/**
 * The far quai along the bridge's first spans (behind it): a row of Haussmann fronts at full strength, a lamp or two,
 * a few projections on the pavement. They are what the wide sees ride the fold up and over, and hang overhead: short
 * enough that, upside down, they clear the square and the café's roofs.
 */
const QUAI_Y = Y_S + 1.3
function farQuai(pen: Pen, t: number, f: Frame): void {
  if (!seen(f, H + 0.2, Y_S - 5.2, H + 13, BED_Y)) return
  // The quai's wall down to the water, and its pavement.
  rect(pen, H + 0.2, QUAI_Y, H + 12.8, BED_Y, mixHex(QUAI, PARIS.stoneShade, 0.35), 0.6)
  rect(pen, H + 0.2, QUAI_Y - 0.05, H + 12.8, QUAI_Y + 0.08, PARIS.cobble, 0)
  // Up to 4.9 over the bridge's deck (they hang over the square once it is over), then under 3.9 (over the café).
  facadeBlock(pen, H + 0.4, H + 6.0, QUAI_Y, 1.45, 3, 1.0, 0.8, f, 31)
  facadeBlock(pen, H + 6.3, H + 12.4, QUAI_Y, 1.3, 3, 0.9, 0.6, f, 37, 0.6)
  lampPost(pen, H + 3.1, QUAI_Y)
  lampPost(pen, H + 9.6, QUAI_Y)
  const figs: Figure[] = [
    figure(80, H + 7.9, QUAI_Y, turned(t, 52.5, -0.8, -0.2, 0.6), NaN, 0.92),
    figure(81, H + 8.25, QUAI_Y, turned(t, 52.9, 0.6, -0.3, 0.6), NaN, 0.92),
    figure(82, H + 11.3, QUAI_Y, turned(t, 53.3, 0.8, -0.6, 0.6), NaN, 0.92),
  ]
  crowd(pen, figs)
}

/** A column of the viaduct: a plinth, a slender fluted shaft, a flaring capital. */
function column(pen: Pen, s: number): void {
  const x = H + s
  const y = Y_S
  shape(pen, [[x - 0.17, y], [x - 0.15, y - 0.24], [x - 0.07, y - 0.3], [x - 0.055, y - COL_H + 0.3], [x - 0.2, y - COL_H + 0.05], [x - 0.23, y - COL_H], [x + 0.23, y - COL_H], [x + 0.2, y - COL_H + 0.05], [x + 0.055, y - COL_H + 0.3], [x + 0.07, y - 0.3], [x + 0.15, y - 0.24], [x + 0.17, y]], PARIS.iron, 0.7)
}

function leafContent(pen: Pen, t: number, f: Frame): void {
  const L = H
  // The far roofs, behind everything on the bridge; the far quai's fronts before them.
  farRoofs(pen, f)
  farQuai(pen, t, f)
  // Under the deck: the Seine in its bed between its quais, the piers standing in it, the iron arches over it.
  if (seen(f, L - 0.3, Y_S, L + 46, UNDER)) {
    // The water, and its surface: sloshing in its bed when the bridge slams home, and settling.
    const slosh = (x: number) => {
      const u = t - LOCK
      if (u <= 0) return 0
      return 0.16 * Math.exp(-u / 0.9) * Math.sin(1.3 * (x - L) - 5 * u)
    }
    const top: Pt[] = []
    for (let x = L + 0.8; x <= L + DECK_END - 0.2 + 1e-6; x += 0.4) top.push([x, WATER_Y + slosh(x)])
    shape(pen, [...top, [L + DECK_END - 0.2, BED_Y], [L + 0.8, BED_Y]], WATER, 0)
    vwash(pen, L + 0.8, L + DECK_END - 0.2, WATER_Y + 0.2, BED_Y, [[0, WATER, 0], [1, WATER_DEEP, 1]])
    poly(pen, top, mixHex(WATER, PARIS.mirror, 0.5), 0.9)
    // The sun's glints on the water, drifting.
    const glints: Pt[][] = []
    for (let i = 0; i < 26; i++) {
      const gx = L + 1 + ((i * 1.07 + t * 0.08 * (0.6 + hash(i, 91))) % (DECK_END - 1.4))
      const gy = WATER_Y + 0.12 + 0.5 * hash(i, 92)
      const gw = 0.12 + 0.25 * hash(i, 93)
      const gl = 0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1)
      if (gl > 0.25) glints.push([[gx - gw, gy], [gx + gw, gy], [gx + gw * 0.7, gy + 0.03], [gx - gw * 0.7, gy + 0.03]])
    }
    fillPaths(pen, glints, PARIS.mirror, 0.45)
    // The far bank is ground, not a pavement on a plank: earth under it down to the bed, and the bed and the cut under
    // it run on to the leaf's end (seen whole, its building stood on a hairline over open sky).
    rect(pen, L + DECK_END + 1.0, Y_S + 0.3, L + 46, BED_Y, mixHex(EARTH, PARIS.stoneShade, 0.25), 0)
    rect(pen, L - 0.3, BED_Y, L + 46, UNDER, EARTH, 0)
    // The leaf's underside: the cut the fold made, rough.
    const rough: Pt[] = [[L - 0.3, UNDER - 0.2]]
    for (let x = L - 0.3; x <= L + 46; x += 0.6) rough.push([x, UNDER + 0.1 + 0.25 * hash(Math.round(x * 5), 95)])
    rough.push([L + 46, UNDER - 0.2])
    shape(pen, rough, EARTH, 0)
    // The quais' walls at either end.
    for (const [a, b] of [[L - 0.3, L + 0.8], [L + DECK_END - 0.2, L + DECK_END + 1.0]]) {
      rect(pen, a, Y_S, b, BED_Y, QUAI, 0.6)
      const courses: Pt[][] = []
      for (let y = Y_S + 0.45; y < BED_Y; y += 0.42) courses.push([[a, y], [b, y]])
      strokePaths(pen, courses, PARIS.stoneShade, 0.35)
    }
    // The piers, their cutwaters toward us.
    for (const s of PIERS) {
      rect(pen, L + s - 0.65, Y_S + 0.3, L + s + 0.65, BED_Y, PARIS.stone, 0.7)
      // Its cutwater's far face in shade, and its courses.
      rect(pen, L + s, Y_S + 0.55, L + s + 0.65, BED_Y, mixHex(PARIS.stone, PARIS.stoneShade, 0.6), 0)
      const courses: Pt[][] = []
      for (let y = Y_S + 0.9; y < BED_Y; y += 0.38) courses.push([[L + s - 0.65, y], [L + s + 0.65, y]])
      strokePaths(pen, courses, PARIS.stoneShade, 0.3)
      line(pen, [L + s, Y_S + 0.55], [L + s, BED_Y], PARIS.stoneShade, 0.6)
      rect(pen, L + s - 0.75, Y_S + 0.3, L + s + 0.75, Y_S + 0.52, PARIS.stoneShade, 0.6)
      rect(pen, L + s - 0.65, WATER_Y, L + s + 0.65, WATER_Y + 0.12, mixHex(PARIS.stoneShade, WATER, 0.5), 0)
    }
    // The iron arches between them.
    const spans: [number, number][] = [[0.8, PIERS[0] - 0.65], [PIERS[0] + 0.65, PIERS[1] - 0.65], [PIERS[1] + 0.65, DECK_END - 0.2]]
    for (const [a, b] of spans) {
      const mid = (a + b) / 2
      const half = (b - a) / 2
      const rib = (off: number): Pt[] => {
        const pts: Pt[] = []
        for (let i = 0; i <= 16; i++) {
          const u = -1 + (2 * i) / 16
          pts.push([L + mid + u * half, Y_S + 0.34 + off + 1.25 * u * u])
        }
        return pts
      }
      const top = rib(0)
      const bot = rib(0.24)
      shape(pen, [...top, ...bot.reverse()], PARIS.iron, 0.7)
      const posts: Pt[][] = []
      for (let x = a + 0.7; x < b - 0.5; x += 0.75) {
        const u = (x - mid) / half
        posts.push([[L + x, Y_S + 0.3], [L + x, Y_S + 0.34 + 1.25 * u * u]])
      }
      strokePaths(pen, posts, PARIS.iron, 0.55)
    }
  }
  // The road deck.
  rect(pen, L - 0.3, Y_S, L + DECK_END + 1, Y_S + 0.3, mixHex(PARIS.iron, PARIS.stoneShade, 0.3), 0.8)
  rect(pen, L - 0.3, Y_S - 0.02, L + DECK_END + 1, Y_S + 0.06, PARIS.cobble, 0)
  // The viaduct's colonnade, and the Métro's deck riding on it.
  if (seen(f, L, Y_S - COL_H - METRO - 0.4, L + DECK_END + 1, Y_S)) {
    for (const s of COLUMNS) if (seen(f, L + s - 0.4, Y_S - COL_H, L + s + 0.4, Y_S)) column(pen, s)
    const my0 = Y_S - COL_H - METRO
    const my1 = Y_S - COL_H
    // Iron arches under the Métro's deck, column to column.
    const arches: Pt[][] = []
    for (let j = 0; j + 1 < COLUMNS.length; j++) {
      const a = L + COLUMNS[j] + 0.2
      const b = L + COLUMNS[j + 1] - 0.2
      const pts: Pt[] = [[a, my1]]
      for (let i = 0; i <= 10; i++) {
        const u = -1 + (2 * i) / 10
        pts.push([(a + b) / 2 + (u * (b - a)) / 2, my1 + 0.36 * (1 - u * u) * -1 + 0.36])
      }
      pts.push([b, my1])
      arches.push(pts)
    }
    strokePaths(pen, arches, PARIS.iron, 0.6)
    rect(pen, L + 0.6, my0, L + DECK_END + 0.2, my1, PARIS.iron, 0.8)
    rect(pen, L + 0.6, my0 - 0.08, L + DECK_END + 0.2, my0 + 0.04, IRON_LIT, 0.5)
    const rivets: Pt[][] = []
    for (let x = L + 1.2; x < L + DECK_END; x += 0.65) rivets.push([[x, my0 + 0.12], [x, my1 - 0.08]])
    strokePaths(pen, rivets, IRON_LIT, 0.35, 0.7)
    // Its railing, on top.
    line(pen, [L + 0.6, my0 - 0.36], [L + DECK_END + 0.2, my0 - 0.36], PARIS.iron, 0.6)
    const rails: Pt[][] = []
    for (let x = L + 0.8; x < L + DECK_END; x += 0.45) rails.push([[x, my0 - 0.36], [x, my0 - 0.08]])
    strokePaths(pen, rails, PARIS.iron, 0.4)
  }
  // The far bank: its quai, a lamp, and a Haussmann front.
  if (seen(f, L + DECK_END, Y_S - 8, L + 46, Y_S)) {
    rect(pen, L + DECK_END + 1, Y_S, L + 46, Y_S + 0.3, PARIS.cobble, 0.6)
    const bx0 = L + 30.2
    const bx1 = L + 43.6
    // One floor over its shops, not three: folded over and hung upside down, a floor more brought its mansard down
    // through the roofs of the street under it (plainest seen whole).
    const wall = 3.6
    rect(pen, bx0, Y_S - wall, bx1, Y_S, PARIS.stone, 0.7)
    const wins: Pt[][] = []
    for (let fl = 0; fl < 1; fl++) for (let x = bx0 + 0.55; x < bx1 - 0.3; x += 1.15) {
      const y = Y_S - 2.25 - 1.3 * fl - 1.08
      wins.push([[x - 0.21, y], [x + 0.21, y], [x + 0.21, y + 0.86], [x - 0.21, y + 0.86]])
    }
    fillPaths(pen, wins, mixHex(PARIS.slate, PARIS.cafe, 0.45))
    for (let x = bx0 + 0.4; x < bx1 - 1.5; x += 2.4) rect(pen, x, Y_S - 1.7, x + 1.8, Y_S, PARIS.cafe, 0.5)
    shape(pen, [[bx0 - 0.05, Y_S - wall], [bx1 + 0.05, Y_S - wall], [bx1 - 0.15, Y_S - wall - 0.95], [bx0 + 0.15, Y_S - wall - 0.95]], PARIS.slate, 0.6)
    lampPost(pen, L + DECK_END + 1.6, Y_S)
  }
  // The balustrade along the deck's near edge.
  line(pen, [L - 0.2, Y_S - 0.44], [L + DECK_END + 0.9, Y_S - 0.44], PARIS.iron, 0.8)
  const bars: Pt[][] = []
  for (let x = L - 0.1; x < L + DECK_END + 0.9; x += 0.9) bars.push([[x, Y_S - 0.44], [x, Y_S]])
  strokePaths(pen, bars, PARIS.iron, 0.7)
  const fine: Pt[][] = []
  for (let x = L; x < L + DECK_END + 0.9; x += 0.15) fine.push([[x, Y_S - 0.4], [x, Y_S - 0.04]])
  strokePaths(pen, fine, PARIS.iron, 0.25, 0.55)
  // The quai's end at the bridge's start: the stone block the curve's tip holds, and its iron shoe.
  rect(pen, L - 0.3, Y_S - 0.1, L + 0.8, Y_S + 0.3, QUAI, 0.6)
  rect(pen, L - 0.3, Y_S - 0.02, L - 0.05, Y_S + 0.42, PARIS.iron, 0.6)
}

/**
 * A projection milling about: a slow wander to and fro (its legs going, its head the way it goes) until `stop`, when it
 * stops dead and turns its head to `look` (-1 left, 1 right), and stands, too still.
 */
function mill(i: number, t: number, stop: number, look: number): { dx: number; face: number; walk: number } {
  const A = 0.04 + 0.07 * hash(i, 105)
  const w = 0.7 + 0.5 * hash(i, 106)
  const ph = 6.283 * hash(i, 107)
  const te = Math.min(t, stop)
  const dx = A * Math.sin(w * te + ph)
  const v = A * w * Math.cos(w * te + ph)
  const going = v >= 0 ? 0.85 : -0.85
  if (t < stop) return { dx, face: going, walk: Math.abs(v) > 0.035 ? te * 6.5 + i : NaN }
  return { dx, face: turned(t, stop, going, look, 0.26), walk: NaN }
}

/** The projections on the bridge: a few by its start; a crowd further along it, out of which Mal comes. */
function leafCrowd(pen: Pen, t: number): void {
  const figs: Figure[] = []
  const L = H
  const cobbS = COBB_END_S
  // They drift in toward where the two of them are, slowly, as the dream is disturbed; on bar 15 they all turn to him,
  // and on its eighth they step in, as one.
  const step = (x: number) => {
    // Staggered by the slam as the bridge comes home overhead, and settling.
    const w = t - LOCK
    const stagger = w > 0 ? 0.09 * Math.exp(-w / 0.35) * Math.sin(w * 11) : 0
    const u = t - STEP
    if (u <= 0) return stagger
    return stagger - Math.sign(x - cobbS) * 0.22 * (1 - Math.exp(-u / 0.09)) * (1 + 0.1 * Math.exp(-u / 0.2) * Math.sin(u * 30))
  }
  const behind: number[] = [0.7, 1.15, 1.95]
  behind.forEach((s, i) => {
    const m = mill(40 + i, t, STARE + 0.05 * i, 1)
    const x = s + m.dx
    figs.push(figure(40 + i, L + x + step(x), Y_S, m.face, m.walk))
  })
  // The crowd ahead: one mass in two ranks, the back one a little smaller (further off). They part where Mal comes
  // through them, and close behind her.
  const mal = malS(t)
  const inside = t >= MAL_FROM && mal > 10.6
  for (let i = 0; i < 32; i++) {
    const s = 10.95 + i * 0.22 + 0.08 * hash(i, 101)
    const drift = -0.35 * Math.max(0, Math.min(1, (t - 53.7) / 4))
    let x = s + drift
    if (inside) {
      const d = x - mal
      const near = Math.max(0, 1 - Math.abs(d) / 0.55)
      x += Math.sign(d || 1) * 0.28 * near * near * (3 - 2 * near)
    }
    const back = i % 2 === 1
    // Milling about, as a crowd does; on bar 15 they stop dead and turn to him, in a ripple out from her.
    const m = mill(60 + i, t, STARE + 0.03 * Math.abs(s - MAL_S0), -1)
    x += m.dx
    figs.push(figure(60 + i, L + x + step(x), Y_S - (back ? 0.1 : 0), m.face, m.walk, back ? 0.9 : 1))
  }
  crowd(pen, figs)
}

/** The whole leaf, turned into the world wherever the fold has it. */
function leaf(pen: Pen, t: number): void {
  const th = theta(t)
  const { at } = tip(th)
  const { p, k } = pen
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(-th)
  p.translate(-H * k, -Y_S * k)
  // A shudder when it slams onto its latches: the whole of it rings.
  const f = frame(p, k)
  leafContent(pen, t, f)
  leafCrowd(pen, t)
  // The latches' dust shaken off its joints when it slams home.
  const u = t - LOCK
  if (u > 0 && u < 3) for (let i = 0; i < 6; i++) puff(pen, [H + 0.6 + i * 1.3, Y_S - 0.2 - 0.25 * u * (0.5 + hash(i, 7))], 0.35 + 0.35 * u, mixHex(PARIS.stone, PARIS.sky, 0.3), 0.3 * Math.exp(-u / 0.8))
  p.pop()
}

/** Everything of the fold, in draw order: the leaf, the pit and its drive, the lever, the curve. */
export function drawFold(pen: Pen, t: number, f: Frame): void {
  leaf(pen, t)
  pit(pen, t, f)
  lever(pen, t, f)
  curve(pen, t, f)
  // The slam, seen from below: a flash of the sun off the latches.
  const u = t - LOCK
  if (u > 0 && u < 0.6) bloom(pen.p, pen.k, [C[0], C[1] - R], 1.8, PARIS.lamp, 0.4 * (1 - u / 0.6))
}
