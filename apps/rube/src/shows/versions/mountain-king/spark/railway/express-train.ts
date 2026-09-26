import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { RAILWAY } from '../worlds'
import {
  AXLE_V,
  BEAM,
  BOARD,
  BOGIE,
  BOGIE_R,
  BOILER,
  CAB,
  CRANK,
  CRATES,
  CYL,
  DOME,
  FIREBOX,
  LEAD,
  LIP_V,
  MAIN_ROD,
  MOUTH,
  NOSE,
  RAIL_Y,
  ROCKETS,
  SLIDE,
  SMOKEBOX,
  TENDER,
  TRAIL,
  T_BRAKE,
  T_STOP,
  VALVES,
  WHEEL,
  WHISTLE,
  crank,
  engineX,
  pose,
  speed,
  travel,
} from './express-line'

/**
 * The fireworks special, drawn: the engine, its tender and two wagons of fireworks for the festival, side on, going
 * east. Iron black with its edges lit by the moon, brass fittings, red wheels, steel rods; no one on the footplate.
 *
 * Everything is in the engine's own cells (`u` along from the chimney, `v` up from the rail) and put in the world by
 * the pose of the moment: the body rides its springs (`lift`, `pitch`), the wheels and the motion ride the rail.
 */

export const TRAIN = {
  ink: RAILWAY.iron,
  shade: RAILWAY.iron,
  body: mixHex(RAILWAY.iron, RAILWAY.ironLit, 0.45),
  lit: RAILWAY.ironLit,
  edge: mixHex(RAILWAY.ironLit, RAILWAY.moon, 0.5),
  red: RAILWAY.wheel,
  redShade: mixHex(RAILWAY.wheel, RAILWAY.iron, 0.5),
  redLit: mixHex(RAILWAY.wheel, RAILWAY.lamp, 0.22),
  brass: RAILWAY.brass,
  brassShade: mixHex(RAILWAY.brass, RAILWAY.iron, 0.5),
  steel: RAILWAY.rail,
  steelShade: mixHex(RAILWAY.rail, RAILWAY.iron, 0.5),
  wood: RAILWAY.crate,
  woodLit: RAILWAY.crateLit,
  woodShade: mixHex(RAILWAY.crate, RAILWAY.iron, 0.45),
}

/** The engine's state for one frame. */
export interface Pose {
  t: number
  x: number
  lift: number
  pitch: number
  /** The drivers' turn (radians, clockwise), and how far the train has come. */
  turn: number
  run: number
}

export function poseAt(t: number): Pose {
  const at = pose(t)
  return { t, x: engineX(t), lift: at.lift, pitch: at.pitch, turn: crank(t), run: travel(t) }
}

const PIVOT: Pt = [-2.6, 1.5]

/** A point of the sprung body, world cells. */
export function B(e: Pose, u: number, v: number): Pt {
  const du = u - PIVOT[0]
  const dv = v - PIVOT[1]
  const c = Math.cos(e.pitch)
  const s = Math.sin(e.pitch)
  return [e.x + PIVOT[0] + du * c + dv * s, RAIL_Y - (PIVOT[1] - du * s + dv * c + e.lift)]
}

/** A point on the wheels' plane (it rides the rail), world cells. */
export const U = (e: Pose, u: number, v: number): Pt => [e.x + u, RAIL_Y - v]

/** A crank pin's middle, in the engine's cells (u, v), for a wheel at `axle`. */
export function pinUV(e: Pose, axle: number): Pt {
  const a = e.turn - Math.PI / 2
  return [axle + CRANK * Math.cos(a), AXLE_V - CRANK * Math.sin(a)]
}

type Map = (u: number, v: number) => Pt

function poly(p: p5, k: number, map: Map, pts: Pt[], fill: string | p5.Color, stroke: string | p5.Color | null, w = 1): void {
  if (stroke) {
    p.stroke(stroke as string)
    p.strokeWeight(w)
  } else p.noStroke()
  p.fill(fill as string)
  p.beginShape()
  for (const [u, v] of pts) {
    const [x, y] = map(u, v)
    p.vertex(x * k, y * k)
  }
  p.endShape(p.CLOSE)
}

function line(p: p5, k: number, map: Map, a: Pt, b: Pt, color: string | p5.Color, w: number): void {
  const [x0, y0] = map(a[0], a[1])
  const [x1, y1] = map(b[0], b[1])
  p.stroke(color as string)
  p.strokeWeight(w)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
}

const rect = (u0: number, v0: number, u1: number, v1: number): Pt[] => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
]

/**
 * The moon on a cylinder lying along the engine: a wash of light over its top, fading to its underside. Painted over
 * a filled rectangle from `v0` (its underside) to `v1` (its top). Light only: a gradient, never a line.
 */
function shaded(p: p5, k: number, map: Map, u0: number, u1: number, v0: number, v1: number, strength = 1): void {
  const [, ay] = map(u0, v1)
  const [, by] = map(u1, v0)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const top = Math.min(ay, by) * k
  const bot = Math.max(ay, by) * k
  const g = ctx.createLinearGradient(0, top, 0, bot)
  g.addColorStop(0, `rgba(141, 156, 198, ${0.34 * strength})`)
  g.addColorStop(0.28, `rgba(141, 156, 198, ${0.12 * strength})`)
  g.addColorStop(0.62, 'rgba(23, 24, 30, 0)')
  g.addColorStop(1, `rgba(23, 24, 30, ${0.55 * strength})`)
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  const pts: Pt[] = [map(u0, v0), map(u1, v0), map(u1, v1), map(u0, v1)]
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x * k, y * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** A rounded-top shape: a dome, a bell. Base from u0 to u1 at v0, up to `top`. */
function bell(u0: number, u1: number, v0: number, top: number, n = 14, flare = 0.6): Pt[] {
  const out: Pt[] = []
  const mid = (u0 + u1) / 2
  const half = (u1 - u0) / 2
  for (let i = 0; i <= n; i++) {
    const s = -1 + (2 * i) / n
    const h = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), 2.2)), flare)
    out.push([mid + s * half, v0 + (top - v0) * h])
  }
  return out
}

/* ------------------------------------------------------------------ wheels */

/** A spoked wheel at world (x, y), radius r, turned `a` (clockwise): tyre, spokes, and its counterweight if it drives. */
export function wheel(p: p5, k: number, x: number, y: number, r: number, a: number, w: number, spokes: number, color: string, shade: string, weight: boolean): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(y))
  p.rotate(a)
  // The dark behind the spokes.
  p.noStroke()
  p.fill(TRAIN.shade)
  p.circle(0, 0, X(r * 2 * 0.9))
  // The spokes, tapering to the rim.
  p.fill(color)
  for (let i = 0; i < spokes; i++) {
    const b = (i / spokes) * Math.PI * 2
    const c = Math.cos(b)
    const s = Math.sin(b)
    const w0 = r * 0.075
    const w1 = r * 0.045
    const r0 = r * 0.16
    const r1 = r * 0.84
    p.quad(X(c * r0 - s * w0), X(s * r0 + c * w0), X(c * r1 - s * w1), X(s * r1 + c * w1), X(c * r1 + s * w1), X(s * r1 - c * w1), X(c * r0 + s * w0), X(s * r0 - c * w0))
  }
  // The counterweight: a solid crescent opposite the crank, between the spokes.
  if (weight) {
    p.fill(shade)
    p.beginShape()
    const n = 12
    for (let i = 0; i <= n; i++) {
      const b = Math.PI / 2 - 0.85 + (1.7 * i) / n
      p.vertex(X(Math.cos(b) * r * 0.84), X(Math.sin(b) * r * 0.84))
    }
    for (let i = n; i >= 0; i--) {
      const b = Math.PI / 2 - 0.62 + (1.24 * i) / n
      p.vertex(X(Math.cos(b) * r * 0.42), X(Math.sin(b) * r * 0.42))
    }
    p.endShape(p.CLOSE)
  }
  // The rim and the steel tyre on it.
  p.noFill()
  p.stroke(color)
  p.strokeWeight(X(r * 0.07))
  p.circle(0, 0, X(r * 2 * 0.86))
  p.stroke(TRAIN.steelShade)
  p.strokeWeight(X(r * 0.1))
  p.circle(0, 0, X(r * 2 * 0.95))
  // The hub: a dark boss, a nut on it.
  p.noStroke()
  p.fill(shade)
  p.circle(0, 0, X(r * 0.36))
  p.fill(TRAIN.shade)
  p.beginShape()
  for (let i = 0; i < 6; i++) {
    const b = (i / 6) * Math.PI * 2
    p.vertex(X(Math.cos(b) * r * 0.1), X(Math.sin(b) * r * 0.1))
  }
  p.endShape(p.CLOSE)
  p.pop()
  // The moon on its upper rim: one lit arc on the tyre.
  p.noFill()
  p.stroke(alpha(p, RAILWAY.moon, 0.35))
  p.strokeWeight(Math.max(1, w * 0.6))
  p.arc(X(x), X(y), X(r * 2 * 0.99), X(r * 2 * 0.99), -Math.PI * 0.85, -Math.PI * 0.25)
}

/** A plain disc wheel for the wagons: iron with a steel tyre, turned by its bolts. */
function discWheel(p: p5, k: number, x: number, y: number, r: number, a: number, w: number): void {
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(y))
  p.rotate(a)
  p.noStroke()
  p.fill(TRAIN.body)
  p.circle(0, 0, X(r * 2))
  p.fill(TRAIN.shade)
  p.circle(0, 0, X(r * 0.5))
  for (let i = 0; i < 6; i++) {
    const b = (i / 6) * Math.PI * 2
    p.rect(X(Math.cos(b) * r * 0.55), X(Math.sin(b) * r * 0.55), X(r * 0.12), X(r * 0.12))
  }
  p.noFill()
  p.stroke(TRAIN.steelShade)
  p.strokeWeight(X(r * 0.12))
  p.circle(0, 0, X(r * 2 * 0.94))
  p.pop()
  p.noFill()
  p.stroke(alpha(p, RAILWAY.moon, 0.3))
  p.strokeWeight(Math.max(1, w * 0.5))
  p.arc(X(x), X(y), X(r * 2), X(r * 2), -Math.PI * 0.85, -Math.PI * 0.25)
}

/* ------------------------------------------------------------------ the vehicles behind the engine */

/** The knock of a rail joint reaches a vehicle further back a little later: its own lift, from the engine's. */
function liftAt(e: Pose, u: number): number {
  const v = Math.max(1, speed(e.t))
  return pose(e.t - (LEAD - u) / v).lift
}

/** Buffers and a coupling between two vehicles, at `u` (the gap's middle). */
function coupling(p: p5, k: number, map: Map, u: number, gap: number, w: number): void {
  poly(p, k, map, rect(u - gap / 2 - 0.02, 1.1, u + gap / 2 + 0.02, 1.2), TRAIN.shade, null)
  for (const s of [-1, 1]) {
    const f = u + (s * gap) / 2
    poly(p, k, map, rect(f - s * 0.02, 1.32, f - s * 0.14, 1.48), TRAIN.body, TRAIN.ink, w * 0.5)
  }
}

/** The tender: a tank on three axles, coal heaped on it, lining along its side. */
function tender(p: p5, k: number, e: Pose, w: number): void {
  const lift = liftAt(e, (TENDER.u0 + TENDER.u1) / 2)
  const map: Map = (u, v) => [e.x + u, RAIL_Y - v - lift]
  const { u0, u1 } = TENDER
  // Frame and axle boxes.
  poly(p, k, map, rect(u0 + 0.1, 0.95, u1 - 0.1, 1.35), TRAIN.shade, TRAIN.ink, w * 0.6)
  // The coal: a heap, lumpy, a few pieces catching the moon.
  const heap: Pt[] = [[u0 + 0.35, 3.55]]
  for (let i = 0; i <= 12; i++) {
    const s = i / 12
    const u = u0 + 0.5 + s * (u1 - u0 - 0.9)
    heap.push([u, 3.55 + 0.42 * Math.sin(Math.PI * s) + 0.05 * (hash(i, 3) - 0.5)])
  }
  heap.push([u1 - 0.35, 3.55])
  poly(p, k, map, heap, TRAIN.shade, null)
  p.noStroke()
  for (let i = 0; i < 9; i++) {
    const s = (i + 0.5) / 9
    const u = u0 + 0.6 + s * (u1 - u0 - 1.2)
    const v = 3.55 + 0.38 * Math.sin(Math.PI * s) - 0.08 - 0.12 * hash(i, 5)
    const [x, y] = map(u, v)
    const r = 0.05 + 0.03 * hash(i, 6)
    p.fill(alpha(p, RAILWAY.moon, 0.25 + 0.2 * hash(i, 7)))
    p.triangle((x - r) * k, (y + r * 0.4) * k, (x + r * 0.2) * k, (y - r) * k, (x + r) * k, (y + r * 0.3) * k)
  }
  // The tank, its flared coal rail, the lining.
  poly(p, k, map, rect(u0, 1.35, u1, 3.45), TRAIN.body, TRAIN.ink, w * 0.7)
  poly(p, k, map, [[u0 - 0.06, 3.45], [u1 + 0.06, 3.45], [u1 + 0.12, 3.66], [u0 - 0.12, 3.66]], TRAIN.shade, TRAIN.ink, w * 0.6)
  poly(p, k, map, rect(u0 + 0.25, 1.6, u1 - 0.25, 3.2), TRAIN.body, TRAIN.brassShade, w * 0.45)
  line(p, k, map, [u0 - 0.12, 3.66], [u1 + 0.12, 3.66], TRAIN.edge, w * 0.6)
  line(p, k, map, [u0, 3.45], [u1, 3.45], alpha(p, RAILWAY.moon, 0.35), w * 0.5)
  // Wheels.
  const turning = Math.min(e.run, travelAtBrake())
  for (const u of [u1 - 0.9, (u0 + u1) / 2, u0 + 0.9]) {
    const [x, y] = [e.x + u, RAIL_Y - 0.45]
    discWheel(p, k, x, y, 0.45, turning / 0.45, w)
    poly(p, k, map, rect(u - 0.16, 0.95, u + 0.16, 1.2), TRAIN.shade, TRAIN.ink, w * 0.5)
  }
}

let brakeRun = -1
const travelAtBrake = (): number => (brakeRun >= 0 ? brakeRun : (brakeRun = travel(T_BRAKE)))

/** The rocket wagon: a flat wagon with three racks of great display rockets standing in it, roped. */
function rocketWagon(p: p5, k: number, e: Pose, w: number, t: number): void {
  const lift = liftAt(e, (ROCKETS.u0 + ROCKETS.u1) / 2)
  const map: Map = (u, v) => [e.x + u, RAIL_Y - v - lift]
  const { u0, u1 } = ROCKETS
  const paper = [RAILWAY.fwRed, RAILWAY.fwGold, RAILWAY.fwGreen, RAILWAY.fwViolet, RAILWAY.fwBlue]
  // The racks: a timber frame each, and the rockets in them, their sticks down through the deck.
  for (let r = 0; r < 3; r++) {
    const c = u0 + 0.9 + r * 1.5
    const n = 5
    for (let i = 0; i < n; i++) {
      const u = c - 0.46 + i * 0.23
      const tall = 2.05 + 0.25 * hash(r, i, 3)
      const col = paper[(r * 2 + i) % paper.length]
      // The case, a paper tube; its cone; a white band.
      poly(p, k, map, rect(u - 0.1, tall - 0.75, u + 0.1, tall), mixHex(col, RAILWAY.iron, 0.25), TRAIN.ink, w * 0.5)
      poly(p, k, map, [[u - 0.1, tall], [u + 0.1, tall], [u, tall + 0.26]], mixHex(col, RAILWAY.fwWhite, 0.15), TRAIN.ink, w * 0.5)
      poly(p, k, map, rect(u - 0.1, tall - 0.42, u + 0.1, tall - 0.35), mixHex(RAILWAY.fwWhite, RAILWAY.iron, 0.2), null)
      line(p, k, map, [u, 1.5], [u, tall - 0.75], RAILWAY.fuse, w * 0.45)
    }
    poly(p, k, map, rect(c - 0.62, 1.5, c - 0.56, 2.25), TRAIN.woodShade, TRAIN.ink, w * 0.4)
    poly(p, k, map, rect(c + 0.56, 1.5, c + 0.62, 2.25), TRAIN.woodShade, TRAIN.ink, w * 0.4)
    poly(p, k, map, rect(c - 0.62, 1.9, c + 0.62, 1.98), TRAIN.wood, TRAIN.ink, w * 0.4)
    line(p, k, map, [c - 0.58, 2.55], [c + 0.58, 2.62], RAILWAY.fuse, w * 0.5)
  }
  // The flat: its deck and sole bars.
  poly(p, k, map, rect(u0, 1.35, u1, 1.52), TRAIN.wood, TRAIN.ink, w * 0.6)
  poly(p, k, map, rect(u0 + 0.05, 0.98, u1 - 0.05, 1.35), TRAIN.shade, TRAIN.ink, w * 0.6)
  line(p, k, map, [u0, 1.52], [u1, 1.52], alpha(p, RAILWAY.moon, 0.3), w * 0.5)
  const turning = Math.min(e.run, travelAtBrake())
  for (const u of [u1 - 1.0, u0 + 1.0]) discWheel(p, k, e.x + u, RAIL_Y - 0.42, 0.42, turning / 0.42, w)
  // Bunting along the racks' tops, flying back in the wind.
  bunting(p, k, map, [u0 + 0.25, 2.62], [u1 - 0.2, 2.62], t, w, 7)
}

/** The crate wagon: an open wagon of plank sides, crates stacked in it, a tarpaulin corner flogging in the wind. */
function crateWagon(p: p5, k: number, e: Pose, w: number, t: number): void {
  const lift = liftAt(e, (CRATES.u0 + CRATES.u1) / 2)
  const map: Map = (u, v) => [e.x + u, RAIL_Y - v - lift]
  const { u0, u1 } = CRATES
  // The crates behind the side, their tops showing; a bundle of mortar tubes.
  const crates: [number, number, number][] = [
    [u0 + 0.4, 1.1, 3.05],
    [u0 + 1.55, 1.05, 3.3],
    [u0 + 2.65, 1.1, 2.95],
    [u0 + 3.8, 0.8, 3.15],
  ]
  for (const [u, wide, top] of crates) {
    poly(p, k, map, rect(u, 2.2, u + wide, top), TRAIN.wood, TRAIN.ink, w * 0.6)
    line(p, k, map, [u + 0.05, top - 0.3], [u + wide - 0.05, top - 0.3], TRAIN.woodShade, w * 0.5)
    line(p, k, map, [u, top], [u + wide, top], alpha(p, RAILWAY.moon, 0.35), w * 0.5)
  }
  for (let i = 0; i < 4; i++) {
    const u = u0 + 2.75 + i * 0.17
    poly(p, k, map, rect(u, 2.9, u + 0.14, 3.45 + 0.08 * hash(i, 9)), RAILWAY.tube, TRAIN.ink, w * 0.45)
  }
  // The tarpaulin over the last crate, its loose corner flogging back.
  const flog = Math.sin(t * 17) * 0.08 + Math.sin(t * 29 + 1) * 0.04
  poly(p, k, map, [[u0 + 1.5, 3.32], [u0 + 2.65, 3.32], [u0 + 2.7, 2.6], [u0 + 1.2 - 0.25 + flog, 2.9 + flog], [u0 + 1.35, 3.1]], mixHex(RAILWAY.smoke, RAILWAY.iron, 0.3), TRAIN.ink, w * 0.5)
  // The plank sides, iron-strapped.
  poly(p, k, map, rect(u0, 1.35, u1, 2.45), TRAIN.woodShade, TRAIN.ink, w * 0.7)
  for (let i = 1; i < 4; i++) line(p, k, map, [u0 + 0.05, 1.35 + i * 0.27], [u1 - 0.05, 1.35 + i * 0.27], TRAIN.shade, w * 0.35)
  for (const u of [u0 + 0.1, (u0 + u1) / 2, u1 - 0.1]) poly(p, k, map, rect(u - 0.05, 1.35, u + 0.05, 2.45), TRAIN.shade, null)
  line(p, k, map, [u0, 2.45], [u1, 2.45], alpha(p, RAILWAY.moon, 0.35), w * 0.6)
  poly(p, k, map, rect(u0 + 0.05, 0.98, u1 - 0.05, 1.35), TRAIN.shade, TRAIN.ink, w * 0.6)
  const turning = Math.min(e.run, travelAtBrake())
  for (const u of [u1 - 1.0, u0 + 1.0]) discWheel(p, k, e.x + u, RAIL_Y - 0.42, 0.42, turning / 0.42, w)
}

/** A string of pennants between two points, sagging, each flag flying back and fluttering. */
function bunting(p: p5, k: number, map: Map, a: Pt, b: Pt, t: number, w: number, n: number): void {
  const cols = [RAILWAY.fwRed, RAILWAY.fwGold, RAILWAY.fwGreen, RAILWAY.fwBlue, RAILWAY.fwViolet]
  const at = (s: number): Pt => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s - 0.12 * 4 * s * (1 - s)]
  p.noFill()
  p.stroke(RAILWAY.fuse)
  p.strokeWeight(w * 0.4)
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const [u, v] = at(i / 16)
    const [x, y] = map(u, v)
    p.vertex(x * k, y * k)
  }
  p.endShape()
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n
    const [u, v] = at(s)
    const flap = 0.05 * Math.sin(t * 19 + i * 1.7)
    poly(p, k, map, [[u + 0.09, v], [u - 0.09, v], [u - 0.02 - 0.08, v - 0.22 + flap]], mixHex(cols[i % cols.length], RAILWAY.iron, 0.2), null)
  }
}

/* ------------------------------------------------------------------ the engine */

/** How bright the firebox is (1 its ordinary glow): what the ashpan's mouth and the cab show. */
export interface Fire {
  glow: number
  /**
   * The spark inside the engine, in its cells, and the way it came (newest first), each with how hot it still shows
   * through the iron (0..1): the iron glows where it is and cools behind it. Empty when the spark is outside.
   */
  inside?: { u: number; v: number; a: number }[]
  /** The dome ringing as the spark lands on it, and the safety valves lifting (0..1). */
  ring?: number
  valves?: number
}

/**
 * The spark's heat through the iron: the ashpan, the firebox, the barrel, the smokebox and the chimney glow from
 * inside where it is, and cool behind it. Clipped to the engine's own shapes, so it reads as hot iron, never as a
 * light of its own.
 */
function insideHeat(p: p5, k: number, b: Map, heat: { u: number; v: number; a: number }[]): void {
  if (!heat.length) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  const add = (pts: Pt[]) => {
    pts.forEach(([u, v], i) => {
      const [x, y] = b(u, v)
      if (i) ctx.lineTo(x * k, y * k)
      else ctx.moveTo(x * k, y * k)
    })
    ctx.closePath()
  }
  add(rect(-6.2, 0.4, MOUTH.u1 + 0.02, BOARD.v))
  add(rect(FIREBOX.u0, BOARD.v - 0.05, FIREBOX.u1 + 0.02, FIREBOX.top))
  add(rect(BOILER.u0 - 0.02, BOILER.v - BOILER.r, BOILER.u1 + 0.02, BOILER.v + BOILER.r))
  add(rect(SMOKEBOX.u0, BOILER.v - SMOKEBOX.r, SMOKEBOX.u1 + 0.06, BOILER.v + SMOKEBOX.r))
  add(rect(-0.27, BOILER.v + SMOKEBOX.r - 0.1, 0.27, LIP_V))
  ctx.clip()
  for (let i = heat.length - 1; i >= 0; i--) {
    const h = heat[i]
    if (h.a <= 0.01) continue
    const [x, y] = b(h.u, h.v)
    const r = (i === 0 ? 1.25 : 0.95) * k
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r)
    g.addColorStop(0, `rgba(255, 176, 72, ${0.8 * h.a})`)
    g.addColorStop(0.3, `rgba(255, 107, 44, ${0.55 * h.a})`)
    g.addColorStop(0.7, `rgba(142, 42, 24, ${0.25 * h.a})`)
    g.addColorStop(1, 'rgba(142, 42, 24, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x * k - r, y * k - r, 2 * r, 2 * r)
  }
  ctx.restore()
}

/** The engine, everything that stands behind the spark: frame, motion, boiler, cab, wheels and rods. */
export function engine(p: p5, k: number, e: Pose, w: number, fire: Fire): void {
  const b: Map = (u, v) => B(e, u, v)
  const r: Map = (u, v) => U(e, u, v)
  const X = (v: number) => v * k

  // The frame, dark behind the wheels, and the ashpan in the gap behind the trailing wheel with its mouth aglow.
  poly(p, k, b, rect(-7.55, 0.72, BEAM.u0, 2.1), TRAIN.shade, null)
  poly(p, k, b, rect(-6.2, 0.4, MOUTH.u1, 2.1), TRAIN.shade, TRAIN.ink, w * 0.5)
  {
    const [x0, y0] = b(MOUTH.u0, MOUTH.v1)
    const [x1, y1] = b(MOUTH.u1, MOUTH.v0)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, X(y1), 0, X(y0))
    const hot = Math.min(1, 0.55 + 0.45 * fire.glow)
    g.addColorStop(0, `rgba(255, 194, 76, ${hot})`)
    g.addColorStop(1, `rgba(255, 107, 44, ${0.7 * hot})`)
    ctx.fillStyle = g
    ctx.fillRect(X(Math.min(x0, x1)), X(Math.min(y0, y1)), X(Math.abs(x1 - x0)), X(Math.abs(y1 - y0)))
  }

  // The cylinder, its steam chest, the slide bars and the motion bracket.
  poly(p, k, r, rect(SLIDE.u0 - 0.08, 1.05, SLIDE.u0 + 0.06, 2.05), TRAIN.body, TRAIN.ink, w * 0.5)
  poly(p, k, r, rect(SLIDE.u0, 1.45, SLIDE.u1, 1.52), TRAIN.steelShade, TRAIN.ink, w * 0.4)
  poly(p, k, r, rect(SLIDE.u0, 1.18, SLIDE.u1, 1.25), TRAIN.steelShade, TRAIN.ink, w * 0.4)
  poly(p, k, b, rect(CYL.u0 + 0.1, CYL.v + CYL.r, CYL.u1 - 0.1, BOARD.v - 0.18), TRAIN.shade, TRAIN.ink, w * 0.6)
  poly(p, k, b, rect(CYL.u0, CYL.v - CYL.r, CYL.u1, CYL.v + CYL.r), TRAIN.body, TRAIN.ink, w * 0.7)
  poly(p, k, b, rect(CYL.u0 - 0.06, CYL.v - CYL.r - 0.04, CYL.u0 + 0.06, CYL.v + CYL.r + 0.04), TRAIN.lit, TRAIN.ink, w * 0.5)
  poly(p, k, b, rect(CYL.u1 - 0.06, CYL.v - CYL.r - 0.04, CYL.u1 + 0.06, CYL.v + CYL.r + 0.04), TRAIN.lit, TRAIN.ink, w * 0.5)
  line(p, k, b, [CYL.u0 + 0.1, CYL.v + CYL.r - 0.03], [CYL.u1 - 0.1, CYL.v + CYL.r - 0.03], alpha(p, RAILWAY.moon, 0.35), w * 0.5)

  // The boiler: barrel, firebox, smokebox, each a cylinder in the moonlight: lit along its top, dark underneath.
  poly(p, k, b, rect(FIREBOX.u0, BOARD.v, FIREBOX.u1 + 0.02, FIREBOX.top - 0.12), TRAIN.body, TRAIN.ink, w * 0.8)
  shaded(p, k, b, FIREBOX.u0, FIREBOX.u1 + 0.02, BOARD.v, FIREBOX.top - 0.12)
  poly(p, k, b, [[FIREBOX.u0, FIREBOX.top - 0.12], [FIREBOX.u1 + 0.02, FIREBOX.top - 0.12], [FIREBOX.u1 + 0.02, FIREBOX.top - 0.04], [FIREBOX.u1 - 0.06, FIREBOX.top], [FIREBOX.u0 + 0.06, FIREBOX.top], [FIREBOX.u0, FIREBOX.top - 0.04]], TRAIN.lit, TRAIN.ink, w * 0.6)
  const top = BOILER.v + BOILER.r
  poly(p, k, b, rect(BOILER.u0, BOILER.v - BOILER.r, BOILER.u1, top), TRAIN.body, TRAIN.ink, w * 0.8)
  shaded(p, k, b, BOILER.u0, BOILER.u1, BOILER.v - BOILER.r, top)
  for (const u of [-1.2, -2.65, -3.95]) {
    poly(p, k, b, rect(u - 0.035, BOILER.v - BOILER.r, u + 0.035, top), alpha(p, TRAIN.shade, 0.7), null)
    poly(p, k, b, rect(u - 0.035, top - 0.34, u + 0.035, top), alpha(p, TRAIN.brass, 0.45), null)
  }
  line(p, k, b, [BOILER.u0, top], [BOILER.u1, top], TRAIN.edge, w * 0.7)
  line(p, k, b, [FIREBOX.u0 + 0.06, FIREBOX.top], [FIREBOX.u1 - 0.06, FIREBOX.top], TRAIN.edge, w * 0.6)
  // The handrail along the boiler's side, a thin steel line catching the moon.
  line(p, k, b, [FIREBOX.u1 + 0.1, 3.28], [SMOKEBOX.u1 - 0.15, 3.28], alpha(p, TRAIN.steel, 0.55), w * 0.45)
  const sb = SMOKEBOX
  poly(p, k, b, [[sb.u0, BOILER.v - sb.r], [sb.u1, BOILER.v - sb.r], [sb.u1 + 0.06, BOILER.v - sb.r + 0.2], [sb.u1 + 0.09, BOILER.v], [sb.u1 + 0.06, BOILER.v + sb.r - 0.2], [sb.u1, BOILER.v + sb.r], [sb.u0, BOILER.v + sb.r]], TRAIN.shade, TRAIN.ink, w * 0.8)
  shaded(p, k, b, sb.u0, sb.u1, BOILER.v - sb.r, BOILER.v + sb.r, 0.8)
  line(p, k, b, [sb.u0, BOILER.v + sb.r], [sb.u1, BOILER.v + sb.r], TRAIN.edge, w * 0.7)
  line(p, k, b, [sb.u1 + 0.06, BOILER.v - sb.r + 0.2], [sb.u1 + 0.06, BOILER.v + sb.r - 0.2], TRAIN.lit, w * 0.6)
  for (const v of [BOILER.v + 0.35, BOILER.v - 0.35]) line(p, k, b, [sb.u1 - 0.05, v], [sb.u1 + 0.07, v], TRAIN.steelShade, w * 0.7)

  // The chimney: a tall stovepipe rising out of a curved saddle on the smokebox, a brass band, a flared cap.
  const base = BOILER.v + sb.r
  const pipe: Pt[] = [[-0.5, base - 0.06], [0.5, base - 0.06]]
  for (let i = 0; i <= 6; i++) {
    const s = i / 6
    pipe.push([0.5 - 0.26 * Math.sin((s * Math.PI) / 2), base - 0.06 + 0.2 * (1 - Math.cos((s * Math.PI) / 2))])
  }
  pipe.push([0.25, LIP_V - 0.2], [0.29, LIP_V - 0.12], [0.32, LIP_V - 0.03], [0.3, LIP_V], [-0.3, LIP_V], [-0.32, LIP_V - 0.03], [-0.29, LIP_V - 0.12], [-0.25, LIP_V - 0.2])
  for (let i = 6; i >= 0; i--) {
    const s = i / 6
    pipe.push([-0.5 + 0.26 * Math.sin((s * Math.PI) / 2), base - 0.06 + 0.2 * (1 - Math.cos((s * Math.PI) / 2))])
  }
  poly(p, k, b, pipe, TRAIN.shade, TRAIN.ink, w * 0.8)
  poly(p, k, b, rect(0.08, base + 0.18, 0.23, LIP_V - 0.22), alpha(p, TRAIN.lit, 0.8), null)
  poly(p, k, b, rect(-0.27, LIP_V - 0.2, 0.27, LIP_V - 0.13), mixHex(TRAIN.brass, TRAIN.shade, 0.25), null)
  line(p, k, b, [-0.3, LIP_V], [0.3, LIP_V], TRAIN.edge, w * 0.8)
  // The steam dome in brass; the safety valves; the whistle on the firebox.
  poly(p, k, b, bell(DOME.u - DOME.w / 2, DOME.u + DOME.w / 2, top - 0.05, DOME.top), TRAIN.brass, TRAIN.ink, w * 0.7)
  poly(p, k, b, bell(DOME.u - DOME.w / 2 + 0.12, DOME.u - 0.02, top - 0.05, DOME.top - 0.12, 10, 0.5), mixHex(TRAIN.brass, RAILWAY.moon, 0.25), null)
  poly(p, k, b, rect(DOME.u - DOME.w / 2 - 0.02, top - 0.06, DOME.u + DOME.w / 2 + 0.02, top + 0.04), TRAIN.brassShade, TRAIN.ink, w * 0.5)
  // The spark lands on the dome with a bong: its brass flashes in the spark's light.
  const ring = fire.ring ?? 0
  if (ring > 0.01) poly(p, k, b, bell(DOME.u - DOME.w / 2 + 0.05, DOME.u + DOME.w / 2 - 0.05, top, DOME.top - 0.03), alpha(p, mixHex(TRAIN.brass, RAILWAY.fwWhite, 0.55), 0.75 * ring), null)
  poly(p, k, b, rect(VALVES.u - VALVES.w / 2, top - 0.05, VALVES.u + VALVES.w / 2, top + 0.12), TRAIN.brassShade, TRAIN.ink, w * 0.6)
  // The safety valves: their heads lift when they blow off.
  const lift = 0.07 * (fire.valves ?? 0)
  for (const s of [-1, 1]) {
    const u = VALVES.u + s * 0.1
    poly(p, k, b, [[u - 0.05, top + 0.12], [u + 0.05, top + 0.12], [u + 0.05, VALVES.top - 0.06 + lift], [u + 0.08, VALVES.top + lift], [u - 0.08, VALVES.top + lift], [u - 0.05, VALVES.top - 0.06 + lift]], TRAIN.brass, TRAIN.ink, w * 0.5)
  }
  poly(p, k, b, rect(WHISTLE.u - 0.03, FIREBOX.top, WHISTLE.u + 0.03, WHISTLE.top - 0.26), TRAIN.brassShade, TRAIN.ink, w * 0.4)
  poly(p, k, b, [[WHISTLE.u - 0.08, WHISTLE.top - 0.26], [WHISTLE.u + 0.08, WHISTLE.top - 0.26], [WHISTLE.u + 0.07, WHISTLE.top - 0.03], [WHISTLE.u, WHISTLE.top], [WHISTLE.u - 0.07, WHISTLE.top - 0.03]], TRAIN.brass, TRAIN.ink, w * 0.5)

  // The spark inside, its heat through the iron.
  insideHeat(p, k, b, fire.inside ?? [])

  // The cab: its front, roof and side; inside, dark, lit from below by the fire; no one at the regulator.
  const cab = CAB
  poly(p, k, b, rect(cab.u0, cab.floor, cab.u1, cab.eave), TRAIN.shade, TRAIN.ink, w * 0.8)
  {
    // The fire's light on the inside of the cab: warm, from the firehole low at the front.
    const [fx, fy] = b(cab.u1 - 0.25, cab.floor + 0.45)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(X(fx), X(fy), 0, X(fx), X(fy), X(1.6))
    const hot = 0.5 + 0.35 * fire.glow
    g.addColorStop(0, `rgba(255, 150, 60, ${0.85 * hot})`)
    g.addColorStop(0.5, `rgba(255, 107, 44, ${0.35 * hot})`)
    g.addColorStop(1, 'rgba(255, 107, 44, 0)')
    const [ax, ay] = b(cab.u0 + 0.05, cab.eave - 0.05)
    const [bx, by] = b(cab.u1 - 0.05, cab.floor + 0.05)
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(X(Math.min(ax, bx)), X(Math.min(ay, by)), X(Math.abs(bx - ax)), X(Math.abs(by - ay)))
    ctx.restore()
  }
  // The side sheet, with its window and the open back where the crew would stand.
  const side: Pt[] = [[cab.u1, cab.floor], [cab.u1, cab.eave], [cab.u0 + 0.62, cab.eave], [cab.u0 + 0.62, 2.72], [cab.u0 + 0.5, 2.6], [cab.u0, 2.6], [cab.u0, cab.floor]]
  p.push()
  {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // Cut the window out of the sheet: draw the sheet, then paint the window's dark and light over it.
    poly(p, k, b, side, TRAIN.body, TRAIN.ink, w * 0.8)
    const win: Pt[] = [[cab.u1 - 0.18, 3.3], [cab.u1 - 0.18, 3.95], [cab.u1 - 0.3, 4.07], [cab.u0 + 0.95, 4.07], [cab.u0 + 0.85, 3.95], [cab.u0 + 0.85, 3.3]]
    poly(p, k, b, win, TRAIN.shade, TRAIN.ink, w * 0.6)
    const wy = b(cab.u1 - 0.5, 3.35)[1]
    const g = ctx.createLinearGradient(0, X(wy), 0, X(wy - 0.7))
    const hot = 0.5 + 0.35 * fire.glow
    g.addColorStop(0, `rgba(255, 140, 60, ${0.55 * hot})`)
    g.addColorStop(1, 'rgba(255, 140, 60, 0)')
    ctx.fillStyle = g
    const [ax, ay] = b(cab.u0 + 0.87, 4.05)
    const [bx, by] = b(cab.u1 - 0.2, 3.32)
    ctx.fillRect(X(Math.min(ax, bx)), X(Math.min(ay, by)), X(Math.abs(bx - ax)), X(Math.abs(by - ay)))
    poly(p, k, b, rect(cab.u0 + 0.12, 2.8, cab.u1 - 0.12, 2.86), TRAIN.brassShade, null)
  }
  p.pop()
  // The roof, arched, overhanging front and back; its edge in the moon.
  const roof: Pt[] = []
  for (let i = 0; i <= 12; i++) {
    const s = i / 12
    roof.push([cab.u0 - 0.15 + s * (cab.u1 - cab.u0 + 0.3), cab.eave + (cab.top - cab.eave) * Math.sin(Math.PI * s)])
  }
  roof.push([cab.u1 + 0.15, cab.eave - 0.07], [cab.u0 - 0.15, cab.eave - 0.07])
  poly(p, k, b, roof, TRAIN.body, TRAIN.ink, w * 0.7)
  p.noFill()
  p.stroke(TRAIN.edge)
  p.strokeWeight(w * 0.7)
  p.beginShape()
  for (const [u, v] of roof.slice(0, 13)) {
    const [x, y] = b(u, v)
    p.vertex(X(x), X(y))
  }
  p.endShape()

  // The running board and its valance, the full length; at the front it drops to the buffer beam.
  poly(p, k, b, [[cab.u1, BOARD.v - 0.2], [BOARD.u1, BOARD.v - 0.2], [BOARD.u1 + 0.3, BEAM.v1 - 0.12], [BEAM.u0, BEAM.v1 - 0.12], [BEAM.u0, BEAM.v1], [BOARD.u1 + 0.35, BEAM.v1], [BOARD.u1 + 0.05, BOARD.v], [cab.u1, BOARD.v]], TRAIN.body, TRAIN.ink, w * 0.7)
  // Its top, a ledge in the moonlight: what the spark rides along the boiler's side.
  poly(p, k, b, rect(cab.u1, BOARD.v - 0.01, BOARD.u1 + 0.05, BOARD.v + 0.07), mixHex(TRAIN.lit, RAILWAY.moonHalo, 0.35), null)
  line(p, k, b, [cab.u1, BOARD.v], [BOARD.u1 + 0.05, BOARD.v], TRAIN.edge, w * 0.7)
  line(p, k, b, [BOARD.u1 + 0.35, BEAM.v1], [BEAM.u1, BEAM.v1], TRAIN.edge, w * 0.6)
  // The buffer beam in red, its buffers, the coupling hook.
  poly(p, k, b, rect(BEAM.u0, BEAM.v0, BEAM.u1, BEAM.v1), TRAIN.red, TRAIN.ink, w * 0.7)
  poly(p, k, b, rect(BEAM.u1, 1.32, NOSE - 0.08, 1.48), TRAIN.body, TRAIN.ink, w * 0.5)
  poly(p, k, b, rect(NOSE - 0.08, 1.14, NOSE, 1.66), TRAIN.steel, TRAIN.ink, w * 0.5)
  poly(p, k, b, [[BEAM.u1, 1.12], [BEAM.u1 + 0.2, 1.12], [BEAM.u1 + 0.24, 1.04], [BEAM.u1 + 0.16, 1.02], [BEAM.u1, 1.06]], TRAIN.shade, TRAIN.ink, w * 0.5)

  // The wheels: the bogie's, then the drivers.
  for (const u of BOGIE) {
    const [x, y] = U(e, u, BOGIE_R)
    wheel(p, k, x, y, BOGIE_R, e.run / BOGIE_R, w, 10, TRAIN.red, TRAIN.redShade, false)
  }
  for (const u of [LEAD, TRAIL]) {
    const [x, y] = U(e, u, AXLE_V)
    wheel(p, k, x, y, WHEEL, e.turn, w, 16, TRAIN.red, TRAIN.redShade, true)
  }

  // The motion: the valve gear, the crosshead, the main rod, the coupling rod.
  const lead = pinUV(e, LEAD)
  const trail = pinUV(e, TRAIL)
  const chV = CYL.v
  const ch = lead[0] + Math.sqrt(MAIN_ROD * MAIN_ROD - (chV - lead[1]) ** 2)
  // The Walschaerts gear. A return crank on the leading pin, a quarter turn ahead of it, drives the eccentric rod up
  // and forward to the foot of the curved expansion link, hung on the motion bracket; the link rocks, and the radius
  // rod runs forward from it to the combination lever at the back of the steam chest, whose foot the union link ties
  // to the crosshead. Every piece of it moves with the wheels.
  const a = e.turn - Math.PI / 2
  const ret: Pt = [lead[0] + 0.3 * Math.cos(a - Math.PI / 2), lead[1] - 0.3 * Math.sin(a - Math.PI / 2)]
  const hang: Pt = [SLIDE.u0 - 0.28, 1.78]
  const rock = 0.3 * Math.sin(e.turn + 0.9)
  const onLink = (d: number): Pt => [hang[0] + Math.sin(rock) * d, hang[1] - Math.cos(rock) * d]
  const foot = onLink(0.36)
  const die = onLink(-0.1)
  const leverTop: Pt = [CYL.u0 + 0.05 + 0.1 * Math.sin(e.turn + 0.3), 1.98]
  const leverFoot: Pt = [leverTop[0] - 0.02, 1.12]
  // The link: a curved slotted plate, pivoted at its middle.
  {
    const pts: Pt[] = []
    for (let i = 0; i <= 8; i++) {
      const d = -0.26 + (0.66 * i) / 8
      const bow = 0.05 * Math.sin((Math.PI * i) / 8)
      const [u, v] = onLink(d)
      pts.push([u - 0.06 - bow, v])
    }
    for (let i = 8; i >= 0; i--) {
      const d = -0.26 + (0.66 * i) / 8
      const bow = 0.05 * Math.sin((Math.PI * i) / 8)
      const [u, v] = onLink(d)
      pts.push([u + 0.06 - bow, v])
    }
    poly(p, k, r, pts, TRAIN.steelShade, TRAIN.ink, w * 0.5)
  }
  rod(p, k, r, ret, foot, 0.06, 0.06, TRAIN.steelShade, w)
  rod(p, k, r, lead, ret, 0.12, 0.08, TRAIN.redShade, w)
  rod(p, k, r, die, leverTop, 0.07, 0.07, TRAIN.steel, w)
  rod(p, k, r, leverTop, leverFoot, 0.07, 0.06, TRAIN.steelShade, w)
  rod(p, k, r, leverFoot, [ch - 0.05, 1.2], 0.05, 0.05, TRAIN.steelShade, w)
  // The crosshead and the piston rod into the cylinder.
  line(p, k, r, [ch, chV], [CYL.u0, chV], TRAIN.steel, w * 1.6)
  poly(p, k, r, rect(ch - 0.19, chV - 0.1, ch + 0.19, chV + 0.1), TRAIN.steel, TRAIN.ink, w * 0.6)
  // The main rod: a long taper from the crosshead to the leading pin.
  rod(p, k, r, [ch, chV], lead, 0.09, 0.13, TRAIN.steel, w)
  // The coupling rod: the leading pin to the trailing, the spark's ride.
  rod(p, k, r, lead, trail, 0.1, 0.1, TRAIN.steel, w)
  // Brake shoes against the drivers' tyres, behind: they bite at the brakes.
  // They go red-hot as they grind, and cool slowly at the terminus.
  const bite = e.t > T_BRAKE ? 1 : 0
  const hot = bite * Math.min(1, (e.t - T_BRAKE) / 0.35) * Math.exp(-Math.max(0, e.t - T_STOP) / 2.5)
  for (const u of [LEAD, TRAIL]) {
    const [x, y] = U(e, u + WHEEL * 0.97 + 0.05 * (1 - bite), AXLE_V)
    p.noStroke()
    p.fill(mixHex(TRAIN.shade, RAILWAY.coal, 0.85 * hot))
    p.rect(X(x), X(y), X(0.12), X(0.5))
    if (hot > 0.02) {
      p.fill(alpha(p, RAILWAY.coalHot, 0.7 * hot))
      p.rect(X(x - 0.03), X(y), X(0.05), X(0.42))
    }
  }
}

/** A rod between two pins: a bar tapering from `w0` to `w1`, rounded ends (never a round boss by itself). */
function rod(p: p5, k: number, map: Map, a: Pt, b: Pt, w0: number, w1: number, color: string, w: number): void {
  const [ax, ay] = map(a[0], a[1])
  const [bx, by] = map(b[0], b[1])
  const len = Math.hypot(bx - ax, by - ay)
  const ang = Math.atan2(by - ay, bx - ax)
  const X = (v: number) => v * k
  p.push()
  p.translate(X(ax), X(ay))
  p.rotate(ang)
  p.stroke(TRAIN.ink)
  p.strokeWeight(w * 0.6)
  p.fill(color)
  p.beginShape()
  p.vertex(X(-0.16), X(-w0 * 1.2))
  p.vertex(X(0.1), X(-w0 / 2))
  p.vertex(X(len - 0.1), X(-w1 / 2))
  p.vertex(X(len + 0.16), X(-w1 * 1.2))
  p.vertex(X(len + 0.22), X(0))
  p.vertex(X(len + 0.16), X(w1 * 1.2))
  p.vertex(X(len - 0.1), X(w1 / 2))
  p.vertex(X(0.1), X(w0 / 2))
  p.vertex(X(-0.16), X(w0 * 1.2))
  p.vertex(X(-0.22), X(0))
  p.endShape(p.CLOSE)
  // The moon along its top edge.
  p.stroke(alpha(p, RAILWAY.moon, 0.45))
  p.strokeWeight(Math.max(1, w * 0.45))
  p.line(X(0.1), X(-w0 / 2), X(len - 0.1), X(-w1 / 2))
  p.pop()
}

/** The whole train at one frame: the wagons and tender behind, then the engine. */
export function train(p: p5, k: number, e: Pose, w: number, fire: Fire): void {
  p.push()
  p.rectMode(p.CENTER)
  crateWagon(p, k, e, w, e.t)
  coupling(p, k, (u, v) => [e.x + u, RAIL_Y - v], (CRATES.u1 + ROCKETS.u0) / 2, ROCKETS.u0 - CRATES.u1, w)
  rocketWagon(p, k, e, w, e.t)
  coupling(p, k, (u, v) => [e.x + u, RAIL_Y - v], (ROCKETS.u1 + TENDER.u0) / 2, TENDER.u0 - ROCKETS.u1, w)
  tender(p, k, e, w)
  coupling(p, k, (u, v) => [e.x + u, RAIL_Y - v], (TENDER.u1 + CAB.u0) / 2, CAB.u0 - TENDER.u1, w)
  engine(p, k, e, w, fire)
  p.pop()
}
