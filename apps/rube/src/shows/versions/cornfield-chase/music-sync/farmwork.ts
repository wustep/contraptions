import { mixHex } from '../../../../parts'
import { ORGAN } from './music'
import { groundAlong, type Among } from './field'
import { hash, rgba, smooth, type Screen } from './screen'

/**
 * The farm at work in the field behind the machine: a combine harvesting the far rows through the afternoon, and, when
 * the organ comes in, the pickup tearing through the corn after the drone, its dust hanging over the rows behind it.
 * Each stands in the field at its depth (`Among`), so the rows in front of it hide its wheels.
 */

export interface Work {
  /** The rows' canopy near and far, to bury a wheel in, and the haze toward the horizon. */
  near: string
  far: string
  /** The light on the machines: 0 afternoon, 1 sunset. */
  dusk: number
  /** Where the drone is across the frame, if it is up. */
  drone: number | null
}

const COMBINE = 2.8
const TRUCK = 1.85

/** The canopy of the rows at `depth`, as the rows are painted there. */
const canopy = (w: Work, depth: number): string => mixHex(w.near, w.far, smooth(depth, 1, 10))

/** A strip of the row's canopy in front of a thing at `depth`, from `x0` to `x1`, its scalloped top at `y`. */
function front(s: Screen, x0: number, x1: number, y: number, depth: number, color: string): void {
  const { ctx, f } = s
  const gap = 0.085 * (1 / depth) ** 0.75 * f * 0.5
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x0, y + f * 0.03 / depth)
  ctx.lineTo(x0, y)
  for (let x = x0; x < x1; x += gap) {
    const j = hash(Math.round(x / gap), 5)
    ctx.quadraticCurveTo(x + gap / 2, y - (0.01 + 0.008 * j) * f / depth, Math.min(x1, x + gap), y)
  }
  ctx.lineTo(x1, y + f * 0.03 / depth)
  ctx.closePath()
  ctx.fill()
}

/** The combine, its header's reel turning as it goes, chaff blowing out behind. */
function combine(s: Screen, t: number, y: number, w: Work): void {
  const { ctx, cx, f } = s
  const d = COMBINE
  const sc = 1 / d
  const U = 0.55 + 0.014 * t
  const x = cx + (U - groundAlong(s, d)) * f
  const L = 0.2 * f * sc
  if (x < -L * 2 || x > s.w + L * 2) return
  const haze = 0.4 + 0.25 * w.dusk
  const body = mixHex(mixHex('#6C8A45', '#5A3E3A', w.dusk), w.far, haze)
  const trim = mixHex(mixHex('#D8B547', '#C9804E', w.dusk), w.far, haze)
  const dark = mixHex(mixHex('#3E4A2E', '#3A2A2E', w.dusk), w.far, haze * 0.8)
  const rock = Math.sin(t * 2.1) * L * 0.006
  const by = y - L * 0.08 + rock
  // The chaff: pale puffs out of the back, carried off and fading.
  ctx.fillStyle = rgba(mixHex('#EFE5BD', w.far, 0.3), 0.22)
  ctx.beginPath()
  for (let k = 0; k < 7; k++) {
    const age = ((t * 0.9 + k / 7) % 1)
    const px = x - L * 0.55 - age * L * 0.9
    const py = by - L * 0.25 - age * L * 0.35 + Math.sin(t + k) * L * 0.03
    const r = L * (0.06 + 0.16 * age)
    ctx.moveTo(px + r, py)
    ctx.arc(px, py, r * (1 - 0.3 * age), 0, Math.PI * 2)
  }
  ctx.fill()
  // The body, the grain tank over it, the cab at the front, the stack.
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.rect(x - L * 0.5, by - L * 0.32, L * 0.62, L * 0.26)
  ctx.rect(x - L * 0.42, by - L * 0.46, L * 0.42, L * 0.15)
  ctx.rect(x + L * 0.04, by - L * 0.52, L * 0.16, L * 0.22)
  ctx.rect(x - L * 0.36, by - L * 0.58, L * 0.025, L * 0.14)
  ctx.fill()
  // The unloading auger folded along its side, and the cab's glass.
  ctx.strokeStyle = trim
  ctx.lineWidth = Math.max(1, L * 0.025)
  ctx.beginPath()
  ctx.moveTo(x - L * 0.45, by - L * 0.4)
  ctx.lineTo(x + L * 0.02, by - L * 0.47)
  ctx.stroke()
  ctx.fillStyle = mixHex(w.far, '#FFFFFF', 0.25)
  ctx.fillRect(x + L * 0.07, by - L * 0.49, L * 0.1, L * 0.09)
  // The header out in front, low, its reel turning.
  ctx.fillStyle = trim
  ctx.fillRect(x + L * 0.12, by - L * 0.14, L * 0.36, L * 0.09)
  const rx = x + L * 0.32
  const ry = by - L * 0.2
  const rr = L * 0.09
  ctx.strokeStyle = trim
  ctx.beginPath()
  ctx.moveTo(rx + rr, ry)
  ctx.arc(rx, ry, rr, 0, Math.PI * 2)
  for (let k = 0; k < 5; k++) {
    const a = -t * 2.4 + (k * Math.PI * 2) / 5
    ctx.moveTo(rx, ry)
    ctx.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr)
  }
  ctx.stroke()
  // The wheels, the drive wheel big.
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.arc(x - L * 0.02, by - L * 0.07, L * 0.12, 0, Math.PI * 2)
  ctx.moveTo(x - L * 0.36, by - L * 0.06)
  ctx.arc(x - L * 0.42, by - L * 0.06, L * 0.07, 0, Math.PI * 2)
  ctx.fill()
  front(s, x - L * 0.75, x + L * 0.6, y - L * 0.02, d, canopy(w, d * 0.92))
}

/** Where the pickup is across the frame (0 to 1) at `t`: in from the left on the organ, closing on the drone. */
function truckAt(t: number, drone: number | null): number {
  const u = smooth(t, ORGAN, 41.2)
  const chase = drone === null ? 1.1 : drone - 0.08 - 0.12 * (1 - u)
  return -0.15 + (chase + 0.15) * smooth(t, ORGAN, ORGAN + 3.5)
}

/** The pickup, bucking through the corn, and its dust. */
function truck(s: Screen, t: number, y: number, w: Work): void {
  if (t < ORGAN || t > 41.4) return
  const { ctx, cx, f } = s
  const W = (f * 16) / 9
  const left = cx - W / 2
  const d = TRUCK
  const L = 0.17 * f / d
  const ink = mixHex(mixHex('#5C6672', '#4A3A44', w.dusk), w.far, 0.3)
  // The dust: puffs left where the truck was, rising, spreading, thinning; the newest nearest the truck, thickest.
  const dust = mixHex('#D9B48C', w.far, 0.2)
  const levels = [new Path2D(), new Path2D(), new Path2D()]
  for (let k = 1; k <= 30; k++) {
    const age = k * 0.09
    const then = t - age
    if (then < ORGAN + 0.2) break
    const px = left + truckAt(then, w.drone) * W - L * 0.45 + age * f * 0.014
    const py = y - L * 0.14 - age * L * 0.3
    const r = L * (0.14 + 0.24 * age) * (1 - 0.3 * smooth(age, 1.5, 2.7))
    const path = levels[Math.min(2, Math.floor(age / 0.9))]
    path.moveTo(px + r, py)
    path.arc(px, py, r, 0, Math.PI * 2)
  }
  for (const [i, path] of levels.entries()) {
    ctx.fillStyle = rgba(dust, [0.34, 0.2, 0.1][i])
    ctx.fill(path)
  }
  const x = left + truckAt(t, w.drone) * W
  // Bucking over the rows: a hop and a pitch.
  const hop = Math.abs(Math.sin(t * 7.3)) * L * 0.05 + Math.abs(Math.sin(t * 11.1 + 1)) * L * 0.025
  const pitch = Math.sin(t * 7.3) * 0.04
  ctx.save()
  ctx.translate(x, y - L * 0.1 - hop)
  ctx.rotate(pitch)
  ctx.fillStyle = ink
  ctx.beginPath()
  // The bed behind, the cab, the hood out front; facing right.
  ctx.rect(-L * 0.5, -L * 0.22, L * 0.48, L * 0.16)
  ctx.moveTo(-L * 0.04, -L * 0.06)
  ctx.lineTo(-L * 0.04, -L * 0.38)
  ctx.lineTo(L * 0.16, -L * 0.38)
  ctx.lineTo(L * 0.24, -L * 0.24)
  ctx.lineTo(L * 0.5, -L * 0.2)
  ctx.lineTo(L * 0.5, -L * 0.06)
  ctx.closePath()
  ctx.fill()
  // The wheels under it, showing over the corn.
  ctx.beginPath()
  ctx.arc(-L * 0.32, -L * 0.06, L * 0.085, 0, Math.PI * 2)
  ctx.moveTo(L * 0.4, -L * 0.06)
  ctx.arc(L * 0.32, -L * 0.06, L * 0.085, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = mixHex(w.far, '#FFF4E0', 0.35)
  ctx.beginPath()
  ctx.moveTo(L * 0.02, -L * 0.34)
  ctx.lineTo(L * 0.14, -L * 0.34)
  ctx.lineTo(L * 0.2, -L * 0.25)
  ctx.lineTo(L * 0.02, -L * 0.25)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  front(s, x - L * 0.8, x + L * 0.75, y + L * 0.01, d, canopy(w, d * 0.9))
}

/** The work in the field at `t`, for the rows to stand in. */
export function farmwork(s: Screen, t: number, w: Work): Among[] {
  const out: Among[] = []
  if (t < 41.5) out.push({ depth: COMBINE, draw: (y) => combine(s, t, y, w) })
  if (t > ORGAN && t < 41.4) out.push({ depth: TRUCK, draw: (y) => truck(s, t, y, w) })
  return out
}
