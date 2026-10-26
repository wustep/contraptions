import type { Pt } from '../../../../../parts'
import { sway, type View } from '../depth'
import { hash } from '../kit'
import { CLANKS, CORNER, STAND, STOP } from './plan'
import { INK, clamp01, mix, ramp, rgba } from '../negatives/hand'
import { AVENUE_FAR } from './fronts'
import { LANE } from './light'
import { NEAR_KERB, PAVE } from './plan'

/**
 * The city running round them (the street's own): the traffic in the road, people on the pavements, the pigeons, the
 * steam. Every one of them is on a timetable read from `t` alone, so a still is that frame of the show.
 *
 * The road is between the camera and the pavement, so nothing in it rises to where the balls roll: the far lane's
 * roofs stop short of the pavement's line, and the near lane's tallest, the bus, short of it again. People on the
 * near pavement keep to the stretches the two of them are not on.
 */

type C2 = CanvasRenderingContext2D

/* ------------------------------------------------------------------ the traffic */

type Kind = 'cab' | 'car' | 'bus'
interface Vehicle {
  kind: Kind
  lane: 'far' | 'near'
  /** When its middle passes x 8, and how fast it goes (cells a second). */
  at: number
  v: number
  color?: string
}

/** When the street's light goes red, near the end: the traffic stops at its lines, and the walk sign comes on. */
export const RED = 259.6
export const WALK = RED + 1.1
/** Near the end, the walker goes out and the hand flashes: the crossing is closing. */
export const FLASH = 266.6
/** Where each lane stops for the light: the far lane short of the corner, the near lane at the far side. */
const STOP_LINE = { far: 13.35, near: AVENUE_FAR + 0.2 }

const DIM: Record<Kind, [number, number]> = { cab: [3.0, 0.92], car: [3.1, 0.88], bus: [7.4, 1.78] }

/** One or two at a time, either way, and the one bus; then one in each lane caught by the light. */
export const TRAFFIC: Vehicle[] = [
  { kind: 'cab', lane: 'far', at: 227.9, v: 7.6 },
  { kind: 'cab', lane: 'far', at: 237.0, v: 6.0 },
  { kind: 'car', lane: 'far', at: 240.3, v: 5.6, color: '#CFC8B6' },
  { kind: 'cab', lane: 'near', at: 242.1, v: 6.4 },
  { kind: 'car', lane: 'far', at: 246.0, v: 5.2, color: '#4F5F52' },
  { kind: 'cab', lane: 'near', at: 248.4, v: 6.0 },
  { kind: 'cab', lane: 'far', at: 252.6, v: 6.3 },
  { kind: 'bus', lane: 'near', at: 255.0, v: 4.1 },
  // Caught by the light.
  { kind: 'cab', lane: 'far', at: 261.0, v: 6.0 },
  { kind: 'car', lane: 'near', at: 263.0, v: 5.5, color: '#6E7F95' },
]

const smin = (a: number, b: number, s: number) => -s * Math.log(Math.exp(-a / s) + Math.exp(-b / s))

/** Where a vehicle's front is at `t`: free, or, if the red catches it short of its line, easing to a stop in the queue. */
function frontAt(car: Vehicle, i: number, t: number): number {
  const dir = car.lane === 'far' ? 1 : -1
  const free = 8 + dir * (car.v * (t - car.at) + DIM[car.kind][0] / 2)
  if (!caught(car)) return free
  const at = STOP_LINE[car.lane] - dir * queue(car, i)
  return dir > 0 ? smin(free, at, 0.5) : -smin(-free, -at, 0.5)
}

/** Whether the red catches it: still short of its line, by more than it could stop in, when the light changes. */
function caught(car: Vehicle): boolean {
  const dir = car.lane === 'far' ? 1 : -1
  const front = 8 + dir * (car.v * (RED - car.at) + DIM[car.kind][0] / 2)
  return dir * (STOP_LINE[car.lane] - front) > 1.8
}

/** How far back from its line a vehicle caught by the red stands: the lengths of those caught before it, and a gap each. */
function queue(car: Vehicle, i: number): number {
  let q = 0
  for (let j = 0; j < i; j++) {
    const o = TRAFFIC[j]
    if (o.lane === car.lane && caught(o)) q += DIM[o.kind][0] + 0.6
  }
  return q
}

function wheel(ctx: C2, k: number, x: number, y: number, r: number, turn: number): void {
  ctx.fillStyle = '#2A2E31'
  ctx.beginPath()
  ctx.arc(x * k, (y - r) * k, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#9AA0A3'
  ctx.beginPath()
  ctx.arc(x * k, (y - r) * k, r * 0.45 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#2A2E31'
  ctx.lineWidth = Math.max(1, r * 0.14 * k)
  ctx.beginPath()
  ctx.moveTo((x + Math.cos(turn) * r * 0.45) * k, (y - r + Math.sin(turn) * r * 0.45) * k)
  ctx.lineTo((x - Math.cos(turn) * r * 0.45) * k, (y - r - Math.sin(turn) * r * 0.45) * k)
  ctx.stroke()
}

/** A vehicle in side view, facing `dir`, its front at `x`, wheels on `y`. */
function vehicle(ctx: C2, k: number, car: Vehicle, x: number, y: number, dir: number, glass: string): void {
  const [len, h] = DIM[car.kind]
  const back = x - dir * len
  const a = Math.min(x, back)
  const b = Math.max(x, back)
  const line = rgba(INK, 0.85)
  const turn = (x / 0.24) * dir
  ctx.lineWidth = 0.8
  const color = car.color ?? (car.kind === 'cab' ? '#DDA62F' : '#E8E5DC')
  const r = car.kind === 'bus' ? 0.3 : 0.24
  const body0 = y - r * 0.9
  if (car.kind === 'bus') {
    ctx.fillStyle = color
    ctx.fillRect(a * k, (y - h) * k, len * k, (h - r * 0.9) * k)
    ctx.fillStyle = '#3D6894'
    ctx.fillRect(a * k, (y - h * 0.42) * k, len * k, 0.12 * k)
    // A row of windows, the sun in them, the doors.
    ctx.fillStyle = glass
    for (let wx = a + 0.5; wx < b - 0.9; wx += 0.95) ctx.fillRect(wx * k, (y - h + 0.22) * k, 0.78 * k, 0.6 * k)
    ctx.fillStyle = '#4C5A63'
    const door = dir > 0 ? b - 1.2 : a + 0.4
    ctx.fillRect(door * k, (y - h + 0.22) * k, 0.7 * k, (h - 0.5) * k)
    ctx.strokeStyle = line
    ctx.strokeRect(a * k, (y - h) * k, len * k, (h - r * 0.9) * k)
  } else {
    // A car: its body, the cabin's glass, the pillars; a cab's roof light and checker band.
    const top = y - h
    const belt = y - h * 0.52
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(a * k, (body0 - 0.02) * k)
    ctx.lineTo(a * k, (belt + 0.06) * k)
    ctx.quadraticCurveTo(a * k, belt * k, (a + 0.25) * k, belt * k)
    ctx.lineTo((a + len * (dir > 0 ? 0.22 : 0.3)) * k, belt * k)
    ctx.lineTo((a + len * (dir > 0 ? 0.32 : 0.36)) * k, top * k)
    ctx.lineTo((b - len * (dir > 0 ? 0.36 : 0.32)) * k, top * k)
    ctx.lineTo((b - len * (dir > 0 ? 0.3 : 0.22)) * k, belt * k)
    ctx.lineTo((b - 0.25) * k, belt * k)
    ctx.quadraticCurveTo(b * k, belt * k, b * k, (belt + 0.06) * k)
    ctx.lineTo(b * k, (body0 - 0.02) * k)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = line
    ctx.stroke()
    ctx.fillStyle = glass
    ctx.beginPath()
    ctx.moveTo((a + len * (dir > 0 ? 0.25 : 0.31)) * k, (belt - 0.02) * k)
    ctx.lineTo((a + len * (dir > 0 ? 0.335 : 0.37)) * k, (top + 0.06) * k)
    ctx.lineTo((b - len * (dir > 0 ? 0.37 : 0.335)) * k, (top + 0.06) * k)
    ctx.lineTo((b - len * (dir > 0 ? 0.31 : 0.25)) * k, (belt - 0.02) * k)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = mix(color, INK, 0.55)
    ctx.fillRect(((a + b) / 2 - 0.04) * k, top * k, 0.08 * k, (belt - top) * k)
    // The sun along its shoulder.
    ctx.fillStyle = rgba('#FFF2D8', 0.55)
    ctx.fillRect((a + 0.2) * k, belt * k, (len - 0.4) * k, 0.04 * k)
    if (car.kind === 'cab') {
      ctx.fillStyle = '#F2EBD8'
      ctx.fillRect(((a + b) / 2 - 0.22) * k, (top - 0.12) * k, 0.44 * k, 0.12 * k)
      ctx.strokeRect(((a + b) / 2 - 0.22) * k, (top - 0.12) * k, 0.44 * k, 0.12 * k)
      ctx.fillStyle = '#2A2E31'
      for (let cx = a + len * 0.3, n = 0; cx < b - len * 0.3; cx += 0.08, n++) if (n % 2 === 0) ctx.fillRect(cx * k, (belt + 0.12) * k, 0.08 * k, 0.05 * k)
    }
  }
  // The lamps: warm white at the front, amber at the back.
  ctx.fillStyle = '#FFF4D8'
  ctx.fillRect((dir > 0 ? b - 0.1 : a) * k, (body0 - 0.3) * k, 0.1 * k, 0.1 * k)
  ctx.fillStyle = '#E79A3A'
  ctx.fillRect((dir > 0 ? a : b - 0.08) * k, (body0 - 0.3) * k, 0.08 * k, 0.12 * k)
  // The wheels, turning.
  const wa = a + (car.kind === 'bus' ? 1.1 : 0.55)
  const wb = b - (car.kind === 'bus' ? 1.3 : 0.55)
  wheel(ctx, k, wa, y, r, turn)
  wheel(ctx, k, wb, y, r, turn)
  if (car.kind === 'bus') wheel(ctx, k, wb - 0.7, y, r, turn)
}

/** The traffic in one lane at `t`, inside the frame. */
export function drawTraffic(ctx: C2, v: View, t: number, lane: 'far' | 'near'): void {
  const k = v.k
  const glass = '#B4C3CA'
  const y = LANE[lane]
  if (y - 2 > v.y1) return
  TRAFFIC.forEach((car, i) => {
    if (car.lane !== lane) return
    const dir = lane === 'far' ? 1 : -1
    const x = frontAt(car, i, t)
    const len = DIM[car.kind][0]
    if (Math.max(x, x - dir * len) < v.x0 - 0.5 || Math.min(x, x - dir * len) > v.x1 + 0.5) return
    // Where it meets the road, in the shade: a plain band under it.
    ctx.fillStyle = rgba('#34405A', 0.18)
    ctx.fillRect((Math.min(x, x - dir * len) + 0.1) * k, (y - 0.06) * k, (len - 0.2) * k, 0.08 * k)
    vehicle(ctx, k, car, x, y, dir, glass)
  })
}

/* ------------------------------------------------------------------ people */

interface Walker {
  /** The way: [time, x] stops, walking between them, standing at each. */
  way: [number, number][]
  /** Where the feet are (y), how tall, the coat. */
  y: number
  h: number
  coat: string
  hat?: boolean
}

export const WALKERS: Walker[] = [
  // The one who buys a paper: along from the left, up to the stand's side, a paper handed out, and away with it.
  { way: [[244.6, -1.5], [250.1, 4.55], [253.4, 4.55], [258.9, -1.3]], y: 0.3, h: 1.2, coat: '#5B5347', hat: true },
]

/** Where a walker is at `t`, which way they face, and how far into a stride (for the legs), or null. */
function walkerAt(w: Walker, t: number): { x: number; dir: number; stride: number; still: boolean } | null {
  const way = w.way
  if (t < way[0][0] || t > way[way.length - 1][0] + 0.01) return null
  for (let i = 0; i + 1 < way.length; i++) {
    const [ta, xa] = way[i]
    const [tb, xb] = way[i + 1]
    if (t > tb) continue
    const u = (t - ta) / (tb - ta)
    const x = xa + (xb - xa) * u
    const still = Math.abs(xb - xa) < 1e-6
    // The direction faced while standing is the way they came.
    const dir = still ? Math.sign(xa - (way[i - 1]?.[1] ?? xa - 1)) || 1 : Math.sign(xb - xa)
    return { x, dir, stride: still ? 0 : Math.abs(x - xa) / 0.62, still }
  }
  return null
}

/** A figure walking: the coat, the head, a hat; legs and arms swinging with the stride. Seen against the light. */
function figure(ctx: C2, k: number, x: number, foot: number, h: number, dir: number, stride: number, coat: string, hat: boolean, reach = 0): void {
  const s = h / 1.2
  const swing = Math.sin(stride * Math.PI) * 0.17 * s
  const hip: Pt = [x, foot - 0.55 * s]
  const neck: Pt = [x + dir * 0.03 * s, foot - 1.0 * s]
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#2C3035'
  ctx.lineWidth = Math.max(1.5, 0.085 * k * s)
  ctx.beginPath()
  ctx.moveTo(hip[0] * k, hip[1] * k)
  ctx.lineTo((x + swing) * k, foot * k)
  ctx.moveTo(hip[0] * k, hip[1] * k)
  ctx.lineTo((x - swing) * k, foot * k)
  ctx.stroke()
  // The coat, to the knee.
  ctx.fillStyle = coat
  ctx.beginPath()
  ctx.moveTo((neck[0] - 0.13 * s) * k, (neck[1] + 0.04 * s) * k)
  ctx.lineTo((neck[0] + 0.13 * s) * k, (neck[1] + 0.04 * s) * k)
  ctx.lineTo((x + 0.17 * s) * k, (foot - 0.3 * s) * k)
  ctx.lineTo((x - 0.17 * s) * k, (foot - 0.3 * s) * k)
  ctx.closePath()
  ctx.fill()
  // An arm: swinging, or reaching out for the paper.
  const arm = reach > 0 ? ([neck[0] + dir * (0.18 + 0.32 * reach) * s, neck[1] + (0.3 - 0.12 * reach) * s] as Pt) : ([neck[0] - swing * 0.9, neck[1] + 0.48 * s] as Pt)
  ctx.strokeStyle = mix(coat, INK, 0.25)
  ctx.lineWidth = Math.max(1.5, 0.07 * k * s)
  ctx.beginPath()
  ctx.moveTo((neck[0] + dir * 0.04 * s) * k, (neck[1] + 0.08 * s) * k)
  ctx.lineTo(arm[0] * k, arm[1] * k)
  ctx.stroke()
  ctx.fillStyle = '#3A3632'
  ctx.beginPath()
  ctx.arc((neck[0] + dir * 0.02 * s) * k, (neck[1] - 0.11 * s) * k, 0.1 * s * k, 0, Math.PI * 2)
  ctx.fill()
  if (hat) {
    ctx.fillRect((neck[0] - 0.14 * s) * k, (neck[1] - 0.19 * s) * k, 0.28 * s * k, 0.035 * s * k)
    ctx.fillRect((neck[0] - 0.08 * s) * k, (neck[1] - 0.29 * s) * k, 0.16 * s * k, 0.11 * s * k)
  }
  ctx.lineCap = 'butt'
}

/** Everyone on the pavements at `t`; the paper going from the stand to the one who bought it. */
export function drawPeople(ctx: C2, v: View, t: number): void {
  const k = v.k
  for (const [n, w] of WALKERS.entries()) {
    const at = walkerAt(w, t)
    if (!at || at.x < v.x0 - 1 || at.x > v.x1 + 1) continue
    const reach = n === 0 ? ramp(t, 250.4, 250.9) * (1 - ramp(t, 252.2, 252.7)) : 0
    const bob = at.still ? 0.01 * sway(t, 0.4, n) : 0
    figure(ctx, k, at.x, PAVE + w.y + bob, w.h, at.dir, at.stride, w.coat, !!w.hat, reach)
    // The paper: under the arm once it is bought.
    if (n === 0 && t > 252.3) {
      ctx.fillStyle = '#ECE8DD'
      const s = w.h / 1.2
      ctx.fillRect((at.x - 0.06 * at.dir - 0.1) * k, (PAVE + w.y - 0.78 * s) * k, 0.22 * k, 0.12 * k)
    }
  }
}

/**
 * On the walk sign, a man crosses this street at the corner, on the crossing beside the two of them: he has come down
 * the avenue toward the camera as the light changed and waits at the kerb, then goes down off it, over, up onto the
 * near pavement and along it out of the frame: the frame's foot in the wide, its side in a phone's tall frame. Seen from the front, a leg lifting at each step, small far up the avenue and larger the nearer he
 * comes. His way is [time, x, y] stops, walking between them.
 */
const CROSSERS: { way: [number, number, number][]; h: number; coat: string }[] = [
  { way: [[255.2, CORNER.kerb + 0.95, -0.35], [259.6, CORNER.kerb + 0.75, PAVE + 0.3], [WALK + 0.3, CORNER.kerb + 0.75, PAVE + 0.3], [WALK + 3.2, CORNER.kerb + 0.7, NEAR_KERB + 0.4], [WALK + 12, CORNER.kerb + 8, NEAR_KERB + 0.4]], h: 1.14, coat: '#4B4F44' },
]

export function drawCrossers(ctx: C2, v: View, t: number): void {
  const k = v.k
  const kerb = PAVE + 0.3
  for (const c of CROSSERS) {
    const w = c.way
    if (t < w[0][0]) continue
    let [, x, y] = w[w.length - 1]
    let step = 0
    for (let i = 0; i + 1 < w.length; i++) {
      const [ta, xa, ya] = w[i]
      const [tb, xb, yb] = w[i + 1]
      if (t > tb) continue
      const u = (t - ta) / (tb - ta)
      x = xa + (xb - xa) * u
      y = ya + (yb - ya) * u
      if (xa !== xb || ya !== yb) step = (t - ta) * 1.9
      break
    }
    const s = (c.h / 1.2) * (y < kerb ? (y + 0.7) / (kerb + 0.7) : 1 + (y - kerb) * 0.07)
    if (y - c.h * 1.4 > v.y1) continue
    const lift = (side: number) => Math.max(0, Math.sin(step * Math.PI + (side > 0 ? 0 : Math.PI))) * 0.09 * s
    ctx.save()
    // Far up the avenue at first, coming out of the haze.
    ctx.globalAlpha = Math.min(1, t - w[0][0])
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#2C3035'
    ctx.lineWidth = Math.max(1.5, 0.085 * k * s)
    ctx.beginPath()
    for (const side of [-1, 1]) {
      ctx.moveTo((x + side * 0.05 * s) * k, (y - 0.55 * s) * k)
      ctx.lineTo((x + side * 0.07 * s) * k, (y - lift(side)) * k)
    }
    ctx.stroke()
    ctx.fillStyle = c.coat
    ctx.beginPath()
    ctx.moveTo((x - 0.17 * s) * k, (y - 0.96 * s) * k)
    ctx.lineTo((x + 0.17 * s) * k, (y - 0.96 * s) * k)
    ctx.lineTo((x + 0.2 * s) * k, (y - 0.3 * s) * k)
    ctx.lineTo((x - 0.2 * s) * k, (y - 0.3 * s) * k)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = mix(c.coat, INK, 0.25)
    ctx.lineWidth = Math.max(1.5, 0.07 * k * s)
    ctx.beginPath()
    for (const side of [-1, 1]) {
      ctx.moveTo((x + side * 0.17 * s) * k, (y - 0.92 * s) * k)
      ctx.lineTo((x + side * 0.21 * s) * k, (y - 0.5 * s + lift(-side) * 0.4) * k)
    }
    ctx.stroke()
    ctx.fillStyle = '#3A3632'
    ctx.beginPath()
    ctx.arc(x * k, (y - 1.09 * s) * k, 0.1 * s * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/** Their shadows, long to the left on the paving, into the shade's path (in cells). */
export function peopleShadows(path: Path2D, t: number): void {
  for (const w of WALKERS) {
    const at = walkerAt(w, t)
    if (!at) continue
    const foot = PAVE + w.y
    path.moveTo(at.x - 1.9 * w.h, foot - 0.16)
    path.lineTo(at.x + 0.14, foot)
    path.lineTo(at.x - 0.14, foot + 0.03)
    path.lineTo(at.x - 1.9 * w.h, foot - 0.04)
    path.closePath()
  }
}

/** The paper the vendor hands out over the ledge, and his hand: for the one who buys it. */
export function drawSale(ctx: C2, k: number, t: number): void {
  const u = ramp(t, 250.6, 251.3) * (1 - ramp(t, 252.2, 252.6))
  if (u <= 0.01) return
  const x = STAND.x0 + 0.25 - 0.35 * u
  const y = -0.62
  ctx.fillStyle = '#ECE8DD'
  ctx.fillRect((x - 0.12) * k, (y - 0.08) * k, 0.26 * k, 0.14 * k)
  ctx.strokeStyle = rgba(INK, 0.6)
  ctx.lineWidth = 0.8
  ctx.strokeRect((x - 0.12) * k, (y - 0.08) * k, 0.26 * k, 0.14 * k)
  ctx.fillStyle = '#B39478'
  ctx.beginPath()
  ctx.ellipse((x + 0.15) * k, y * k, 0.07 * k, 0.055 * k, 0, 0, Math.PI * 2)
  ctx.fill()
}

/* ------------------------------------------------------------------ pigeons */

interface Flock {
  n: number
  seed: number
  /** Where they peck, in turn (null: gone away over the roofs). */
  spots: ({ x0: number; x1: number } | null)[]
  /** When they go up from each spot, and when they are down at the next. */
  ups: number[]
  downs: number[]
  /** The wheel each flight makes: its middle and its size. */
  wheels: [Pt, number][]
}

const FLOCKS: Flock[] = [
  // Startled off the pavement by the first clank of the cellar doors, away over the roofs.
  { n: 3, seed: 3, spots: [{ x0: 2.0, x1: 3.5 }, null], ups: [CLANKS[0] + 0.05], downs: [CLANKS[0] + 5], wheels: [[[4.0, -3.4], 1.4]] },
  // Up off the pavement on the last chord, up out of the frame and round over the street, down by the café as the
  // camera draws back; up again when the bus comes by, and down again.
  {
    n: 5,
    seed: 5,
    spots: [{ x0: 8.0, x1: 9.15 }, { x0: 9.0, x1: 11.0 }, { x0: 8.4, x1: 10.4 }],
    ups: [STOP, 254.55],
    downs: [239.4, 258.4],
    wheels: [[[3.5, -3.8], 2.0], [[11.4, -1.9], 1.35]],
  },
]

/** The pigeons' paths, a colour each: the grey of them, and the slate of their wings, tails and heads. */
interface Plumage {
  body: Path2D
  dark: Path2D
}

/** An oval as its own shape in a path (pixels from cells). */
function oval(path: Path2D, k: number, x: number, y: number, rx: number, ry: number, rot: number): void {
  path.moveTo((x + rx * Math.cos(rot)) * k, (y + rx * Math.sin(rot)) * k)
  path.ellipse(x * k, y * k, rx * k, ry * k, rot, 0, Math.PI * 2)
  path.closePath()
}

/** A pigeon facing `dir`: on the ground (`flap` null), pecking `peck` of the way down; or in the air, its wings at `flap`. */
function bird(p: Plumage, k: number, x: number, y: number, dir: number, flap: number | null, peck: number): void {
  if (flap === null) {
    // The body tipped tail up, the wing folded on its back, the tail; the head up or down at the paving.
    oval(p.body, k, x, y - 0.055, 0.07, 0.042, -dir * 0.22)
    oval(p.dark, k, x - dir * 0.018, y - 0.066, 0.048, 0.024, -dir * 0.3)
    p.dark.moveTo((x - dir * 0.05) * k, (y - 0.075) * k)
    p.dark.lineTo((x - dir * 0.135) * k, (y - 0.105) * k)
    p.dark.lineTo((x - dir * 0.125) * k, (y - 0.07) * k)
    p.dark.closePath()
    const hx = x + dir * (0.07 + 0.025 * peck)
    const hy = y - 0.112 + 0.085 * peck
    p.dark.moveTo((x + dir * 0.035) * k, (y - 0.08) * k)
    p.dark.lineTo((hx - dir * 0.012) * k, (hy + 0.012) * k)
    p.dark.lineTo((hx + dir * 0.012) * k, (hy + 0.022) * k)
    p.dark.lineTo((x + dir * 0.06) * k, (y - 0.05) * k)
    p.dark.closePath()
    oval(p.dark, k, hx, hy, 0.024, 0.022, 0)
    p.dark.moveTo((hx + dir * 0.02) * k, (hy - 0.004) * k)
    p.dark.lineTo((hx + dir * 0.045) * k, (hy + 0.006) * k)
    p.dark.lineTo((hx + dir * 0.018) * k, (hy + 0.01) * k)
    p.dark.closePath()
    return
  }
  // In the air, seen against the light: a small body, and the wings out to either side, bent at the wrist, beating.
  oval(p.dark, k, x, y, 0.042, 0.03, 0)
  const lift = -0.09 * flap
  for (const side of [-1, 1]) {
    const wx = x + side * 0.07
    const wy = y + lift * 0.5 - 0.02
    const tx = x + side * 0.15
    const ty = y + lift
    p.dark.moveTo((x + side * 0.02) * k, (y - 0.015) * k)
    p.dark.quadraticCurveTo((wx - side * 0.01) * k, (wy - 0.03) * k, wx * k, wy * k)
    p.dark.quadraticCurveTo((wx + side * 0.04) * k, (wy + (ty - wy) * 0.4 - 0.01) * k, tx * k, ty * k)
    p.dark.quadraticCurveTo((wx + side * 0.03) * k, (wy + (ty - wy) * 0.5 + 0.03) * k, wx * k, (wy + 0.03) * k)
    p.dark.quadraticCurveTo((x + side * 0.03) * k, (y + 0.02) * k, (x + side * 0.02) * k, (y + 0.015) * k)
    p.dark.closePath()
  }
  void dir
}

/** The pigeons at `t`: pecking, going up all at once, wheeling, coming down. */
export function drawPigeons(ctx: C2, v: View, t: number): void {
  const k = v.k
  const plumage: Plumage = { body: new Path2D(), dark: new Path2D() }
  const foot = PAVE + 0.2
  for (const f of FLOCKS) {
    for (let i = 0; i < f.n; i++) {
      const h = (n: number) => hash(i, n, f.seed)
      const lag = 0.07 * h(7)
      const land = 0.5 * h(9)
      const at = (s: number): Pt => {
        const spot = f.spots[s]!
        return [spot.x0 + (spot.x1 - spot.x0) * hash(i, 20 + s, f.seed) + 0.12 * sway(t, 0.05 + 0.05 * h(2), i + s), foot + 0.08 * h(3)]
      }
      let n = 0
      while (n < f.ups.length && t >= f.ups[n] + lag) n++
      if (n > 0 && t < f.downs[n - 1] + land) {
        // In the air: straight up off the paving all at once, round the wheel, each a little behind the one before,
        // and down again.
        const up = f.ups[n - 1] + lag
        const end = f.downs[n - 1] + land
        const u = clamp01((t - up) / (end - up))
        const from = at(n - 1)
        const [wheel, r] = f.wheels[n - 1]
        const to: Pt = f.spots[n] ? at(n) : [wheel[0] + 6, wheel[1] - 7]
        const s = u * u * (3 - 2 * u)
        const take = 1 - (1 - clamp01((t - up) / 0.9)) ** 2
        const settle = f.spots[n] ? clamp01((t - (end - 1.3)) / 1.3) : 0
        const bell = Math.sin(Math.PI * u)
        const ang = -Math.PI / 2 + u * Math.PI * 2 * (f.spots[n] ? 1.25 : 0.5) + h(11) * 0.6
        const rr = r * bell * (0.75 + 0.35 * h(12))
        const x = from[0] + (to[0] - from[0]) * s + (wheel[0] - from[0]) * bell ** 1.5 * 0.8 + Math.cos(ang) * rr + 0.25 * (h(13) - 0.5) * take
        const y = from[1] + (to[1] - from[1]) * s - (2.6 + 0.6 * h(10)) * take * (1 - settle * settle) + (wheel[1] + 2.6 - from[1]) * bell ** 1.5 * 0.5 + Math.sin(ang) * rr * 0.4
        if (x < v.x0 - 0.3 || x > v.x1 + 0.3 || y < v.y0 - 0.3 || y > v.y1 + 0.3) continue
        bird(plumage, k, x, y, -Math.sin(ang) >= 0 ? 1 : -1, Math.sin(t * 15 + i * 2.1), 0)
        continue
      }
      if (!f.spots[n]) continue
      const [px, py] = at(n)
      if (px < v.x0 - 0.3 || px > v.x1 + 0.3) continue
      const peck = Math.max(0, Math.sin(t * (2.2 + 1.6 * h(4)) + h(5) * 9)) ** 3
      bird(plumage, k, px, py, h(6) > 0.5 ? 1 : -1, null, peck)
    }
  }
  ctx.fillStyle = '#98A0A8'
  ctx.fill(plumage.body)
  ctx.strokeStyle = rgba(INK, 0.5)
  ctx.lineWidth = 0.7
  ctx.stroke(plumage.body)
  ctx.fillStyle = '#5F6770'
  ctx.fill(plumage.dark)
}

/* ------------------------------------------------------------------ steam */

/**
 * Steam: one plume rising from `x, y` and bending off to the west on the air from the east. It is made of puffs
 * going up, each swelling as it climbs and drawing in again as it thins away at the top, but they are laid into one
 * path and filled once, in one flat pale grey: one soft shape whose edge billows, not a stack of rounds.
 */
export function steam(ctx: C2, v: View, t: number, x: number, y: number, height: number, alpha: number): void {
  const k = v.k
  const n = 6
  if (x + 1.5 < v.x0 || x - height * 0.8 - 1.5 > v.x1 || y + 0.5 < v.y0 || y - height - 1.5 > v.y1) return
  const plume = new Path2D()
  for (let i = 0; i < n; i++) {
    const ph = t * 0.3 + i / n
    const age = ph - Math.floor(ph)
    const puff = Math.floor(ph) * n + i
    const r = (0.12 + 0.4 * age) * Math.min(1, age * 6) * Math.sqrt(1 - age) * (0.85 + 0.3 * hash(puff, 2, 3))
    if (r < 0.01) continue
    const px = x - age * age * height * (0.45 + 0.3 * hash(puff, 1, 3)) + 0.1 * sway(t, 0.3, puff) * age
    const py = y - age * height
    plume.moveTo((px + r * 1.1) * k, py * k)
    plume.ellipse(px * k, py * k, r * 1.1 * k, r * 0.9 * k, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = rgba('#DCDDD8', alpha)
  ctx.fill(plume)
}
