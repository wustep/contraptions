import { mixHex } from '../../../../parts'
import { ORGAN, PIANO } from './music'
import { groundAlong, type Among } from './field'
import { droneAcross } from './sky'
import { hash, rgba, smooth, type Screen } from './screen'

/**
 * The farm at work in the field behind the machine, as in the film. Cooper's house stands out in the field with its
 * cottonwood and the pickup in the yard; two combines harvest the far rows in echelon through the afternoon; a dust
 * devil wanders across the field in the piano's quiet. When the organ comes in, the pickup pulls out of the yard and
 * tears through the corn after the drone, toward the camera, its dust hanging over the rows behind it. Each stands in
 * the field at its depth (`Among`), so the rows in front of it hide its feet.
 */

export interface Work {
  /** The rows' canopy near and far, to bury a wheel in, and the haze toward the horizon. */
  near: string
  far: string
  /** The light on the farm: 0 afternoon, 1 sunset. */
  dusk: number
}

const HOUSE = 3.3
/** Where the house stands in the field, frame heights along the ground at its depth. */
const HOME = 0.82
const COMBINES = [{ depth: 2.8, at: 0.1 }, { depth: 3.6, at: 0.04 }]
const TRUCK = 1.85
const DEVIL = { depth: 5, at: 0.95, from: 9, to: 27 }

/** Across the frame, device pixels, for a thing `U` frame heights along the ground at `depth`. */
const xAt = (s: Screen, U: number, depth: number): number => s.cx + (U - groundAlong(s, depth)) * s.f

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

/**
 * Cooper's house: two storeys of white clapboard under a gable, a lower wing, a porch along the front, its windows lit
 * as the sun goes; the cottonwood beside it moving in the wind.
 */
function house(s: Screen, t: number, y: number, w: Work, wind: number): void {
  const { ctx, f } = s
  const H = 0.36 * f / HOUSE
  const x = xAt(s, HOME, HOUSE)
  if (x < -H * 2 || x > s.w + H * 2) return
  const haze = 0.28 + 0.2 * w.dusk
  const wall = mixHex(mixHex('#ECE6D4', '#E3B59C', w.dusk), w.far, haze)
  const shade = mixHex(mixHex('#C8C2AE', '#8E7380', w.dusk), w.far, haze)
  const roof = mixHex(mixHex('#6F655E', '#4C3A40', w.dusk), w.far, haze * 0.8)
  const leaf = mixHex(mixHex('#6E8A4A', '#4E3C40', w.dusk), w.far, haze)
  const glass = w.dusk > 0.35 ? mixHex(roof, '#F0C06A', smooth(w.dusk, 0.35, 0.8)) : mixHex(roof, w.far, 0.3)
  // The cottonwood, behind the house's left end: a trunk and a heap of leaves that leans and stirs with the wind.
  const sway = Math.sin(t * 1.1) * 0.02 + 0.06 * wind
  const tx = x - H * 0.55
  ctx.fillStyle = roof
  ctx.fillRect(tx - H * 0.03, y - H * 0.7, H * 0.06, H * 0.7)
  ctx.fillStyle = leaf
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    const r = H * (0.2 + 0.06 * hash(k, 71))
    const px = tx + Math.cos(a) * H * 0.2 + sway * H * (1 - Math.sin(a)) * 0.5
    const py = y - H * 0.95 + Math.sin(a) * H * 0.14
    ctx.moveTo(px + r, py)
    ctx.arc(px, py, r, 0, Math.PI * 2)
  }
  ctx.fill()
  // The wing to the right, a storey, its roof sloping off the house.
  ctx.fillStyle = shade
  ctx.fillRect(x + H * 0.28, y - H * 0.36, H * 0.42, H * 0.36)
  ctx.fillStyle = roof
  ctx.beginPath()
  ctx.moveTo(x + H * 0.26, y - H * 0.5)
  ctx.lineTo(x + H * 0.74, y - H * 0.36)
  ctx.lineTo(x + H * 0.26, y - H * 0.36)
  ctx.closePath()
  ctx.fill()
  // The house, its gable to the field.
  ctx.fillStyle = wall
  ctx.fillRect(x - H * 0.3, y - H * 0.6, H * 0.6, H * 0.6)
  ctx.fillStyle = roof
  ctx.beginPath()
  ctx.moveTo(x - H * 0.37, y - H * 0.58)
  ctx.lineTo(x, y - H)
  ctx.lineTo(x + H * 0.37, y - H * 0.58)
  ctx.closePath()
  ctx.rect(x + H * 0.12, y - H * 0.98, H * 0.07, H * 0.2)
  // The porch roof along the front and round the wing, on its posts, its shadow under it.
  ctx.rect(x - H * 0.36, y - H * 0.3, H * 1.08, H * 0.05)
  ctx.fill()
  ctx.fillStyle = shade
  ctx.fillRect(x - H * 0.34, y - H * 0.25, H * 1.04, H * 0.05)
  ctx.fillStyle = roof
  for (let k = 0; k < 6; k++) ctx.fillRect(x - H * 0.34 + (k * H * 1.0) / 5, y - H * 0.25, H * 0.02, H * 0.25)
  // The windows: two up, two down, one in the wing; lit as the sun goes.
  ctx.fillStyle = glass
  for (const [wx, wy] of [[-0.18, -0.52], [0.08, -0.52], [-0.18, -0.2], [0.08, -0.2], [0.44, -0.28]]) ctx.fillRect(x + wx * H, y + wy * H, H * 0.1, H * 0.13)
}

/** A combine, its header's reel turning as it goes, chaff blowing out behind. */
function combine(s: Screen, t: number, y: number, w: Work, depth: number, at: number): void {
  const { ctx, f } = s
  const sc = 1 / depth
  const x = xAt(s, at + 0.014 * t, depth)
  const L = 0.2 * f * sc
  if (x < -L * 2 || x > s.w + L * 2) return
  const haze = 0.3 + 0.08 * depth + 0.25 * w.dusk
  const body = mixHex(mixHex('#6C8A45', '#5A3E3A', w.dusk), w.far, haze)
  const trim = mixHex(mixHex('#D8B547', '#C9804E', w.dusk), w.far, haze)
  const dark = mixHex(mixHex('#3E4A2E', '#3A2A2E', w.dusk), w.far, haze * 0.8)
  const rock = Math.sin(t * 2.1 + depth) * L * 0.006
  const by = y - L * 0.08 + rock
  // The chaff: pale puffs out of the back, carried off and fading.
  ctx.fillStyle = rgba(mixHex('#EFE5BD', w.far, 0.3), 0.22)
  ctx.beginPath()
  for (let k = 0; k < 7; k++) {
    const age = (t * 0.9 + k / 7 + depth) % 1
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
  front(s, x - L * 0.75, x + L * 0.6, y - L * 0.02, depth, canopy(w, depth * 0.92))
}

/** The dust devil: born of the piano's hardest gust early on, a turning column of dust that wanders over the far rows. */
const DEVIL_FROM = PIANO.filter((n) => n.t >= DEVIL.from - 2 && n.t <= DEVIL.from + 4).reduce((a, b) => (b.s > a.s ? b : a)).t

function devil(s: Screen, t: number, y: number, w: Work): void {
  const life = smooth(t, DEVIL_FROM, DEVIL_FROM + 2.5) * (1 - smooth(t, DEVIL.to - 3, DEVIL.to))
  if (life <= 0) return
  const { ctx, f } = s
  const age = t - DEVIL_FROM
  const x = xAt(s, DEVIL.at + 0.016 * age, DEVIL.depth)
  const H = f * 0.17 * (0.55 + 0.45 * life)
  const dust = mixHex('#CDB28E', w.far, 0.35)
  const body = new Path2D()
  const swirl = new Path2D()
  const n = 12
  // One column, narrow at the foot and widening up into a round crown: a stack of rings left gaps low down, where they
  // were small, and read as beads.
  const ring = (u: number) => ({
    r: f * (0.004 + 0.03 * u ** 1.6) * (0.7 + 0.3 * life),
    cx: x + Math.sin(t * 1.7 + u * 3) * f * 0.006 * u + 0.25 * H * u * u,
    cy: y - H * u,
  })
  for (let k = 0; k <= n; k++) {
    const { r, cx, cy } = ring(k / n)
    if (k === 0) body.moveTo(cx - r, cy)
    else body.lineTo(cx - r, cy)
  }
  for (let k = n; k >= 0; k--) {
    const { r, cx, cy } = ring(k / n)
    body.lineTo(cx + r, cy)
  }
  body.closePath()
  const crown = ring(1)
  body.moveTo(crown.cx + crown.r, crown.cy)
  body.ellipse(crown.cx, crown.cy, crown.r, crown.r * 0.4, 0, 0, Math.PI * 2)
  for (let k = 0; k <= n; k++) {
    const { r, cx: cxk, cy: cyk } = ring(k / n)
    // The turning: an arc across the front of every other ring, going round.
    if (k % 2 === 0 && k > 0) {
      const a = (t * 5 + k) % (Math.PI * 2)
      swirl.moveTo(cxk + Math.cos(a) * r, cyk + Math.sin(a) * r * 0.4)
      swirl.ellipse(cxk, cyk, r, r * 0.4, 0, a, a + 1.6)
    }
  }
  // Its skirt: the dust it lifts off the field at its foot.
  body.moveTo(x + f * 0.03, y)
  body.ellipse(x, y - f * 0.004, f * 0.03, f * 0.007, 0, 0, Math.PI * 2)
  // Thick with dust at the foot, thinning as it climbs, so the crown is a haze and not a lid.
  const thin = ctx.createLinearGradient(0, y, 0, crown.cy - crown.r * 0.4)
  thin.addColorStop(0, rgba(dust, 0.46 * life))
  thin.addColorStop(1, rgba(dust, 0.14 * life))
  ctx.fillStyle = thin
  ctx.fill(body)
  ctx.strokeStyle = rgba(mixHex(dust, '#8C6E55', 0.4), 0.35 * life)
  ctx.lineWidth = Math.max(1, f * 0.0018)
  ctx.stroke(swirl)
}

/** How far out of the yard the pickup is: parked through the piano, away on the organ's entry. */
const outAt = (t: number): number => smooth(t, ORGAN + 0.25, ORGAN + 4.5)

/** Where the pickup is across the frame (0 to 1) when out in the field: closing on the drone, or past where it went down. */
function chaseAt(t: number): number {
  const d = droneAcross(t)
  return d === null ? 1.1 : d - 0.08 - 0.12 * (1 - smooth(t, ORGAN, 41.2))
}

/** The pickup's depth in the field at `t`: in the yard, then out across the rows toward the camera. */
const truckDepth = (t: number): number => HOUSE - 0.04 + (TRUCK - HOUSE + 0.04) * outAt(t)

/** The pickup, bucking through the corn, and its dust; or parked by the house until the organ. */
function truck(s: Screen, t: number, y: number, w: Work): void {
  const { ctx, cx, f } = s
  const W = (f * 16) / 9
  const left = cx - W / 2
  const yard = (xAt(s, HOME + 0.36 * 0.36 / HOUSE + 0.05, HOUSE) - left) / W
  const acrossAt = (then: number) => yard + (chaseAt(then) - yard) * outAt(then)
  const d = truckDepth(t)
  const L = 0.17 * f / d
  const ink = mixHex(mixHex('#5C6672', '#4A3A44', w.dusk), w.far, 0.35 * (d - 1) / 2)
  // The dust: puffs left where the truck was, rising, spreading, thinning; the newest nearest the truck, thickest.
  if (outAt(t) > 0) {
    const dust = mixHex('#D9B48C', w.far, 0.2)
    const levels = [new Path2D(), new Path2D(), new Path2D()]
    for (let k = 1; k <= 30; k++) {
      const age = k * 0.09
      const then = t - age
      if (outAt(then) <= 0.02) break
      const Lt = 0.17 * f / truckDepth(then)
      const px = left + acrossAt(then) * W - Lt * 0.45 + age * f * 0.014
      const py = y - Lt * 0.14 - age * Lt * 0.3
      const r = Lt * (0.14 + 0.24 * age) * (1 - 0.3 * smooth(age, 1.5, 2.7)) * smooth(outAt(then), 0, 0.3)
      const path = levels[Math.min(2, Math.floor(age / 0.9))]
      path.moveTo(px + r, py)
      path.arc(px, py, r, 0, Math.PI * 2)
    }
    for (const [i, path] of levels.entries()) {
      ctx.fillStyle = rgba(dust, [0.34, 0.2, 0.1][i])
      ctx.fill(path)
    }
  }
  const x = left + acrossAt(t) * W
  // Bucking over the rows once it is out: a hop and a pitch.
  const going = outAt(t)
  const hop = going * (Math.abs(Math.sin(t * 7.3)) * L * 0.05 + Math.abs(Math.sin(t * 11.1 + 1)) * L * 0.025)
  const pitch = going * Math.sin(t * 7.3) * 0.04
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
  // Out in the field the corn closes round its wheels; in the yard it stands on bare ground.
  if (going > 0.05) front(s, x - L * 0.8, x + L * 0.75, y + L * 0.01, d, canopy(w, d * 0.9))
}

/** The farm in the field at `t`, for the rows to stand in, `wind` the gust over the house. */
export function farmwork(s: Screen, t: number, w: Work, wind: number): Among[] {
  if (t > 41.5) return []
  const out: Among[] = [{ depth: HOUSE, draw: (y) => house(s, t, y, w, wind) }, { depth: DEVIL.depth, draw: (y) => devil(s, t, y, w) }]
  for (const c of COMBINES) out.push({ depth: c.depth, draw: (y) => combine(s, t, y, w, c.depth, c.at) })
  if (t < 41.4) out.push({ depth: truckDepth(t), draw: (y) => truck(s, t, y, w) })
  return out
}
