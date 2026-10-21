import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { DUST } from '../worlds'
import type { Air } from './daylight'
import { RIM_R } from './station'

/**
 * Cooper Station is a cylinder, and the show looks down it end-on from its near end. What stood on the near end's ring
 * of land was all there was: past it, pale air. Here the rest of the station goes away from the camera: its inside
 * surface, farmland all the way round, recedes in perspective toward the far end wall, which hangs in the haze round the
 * spindle: fields in strips and plots, nothing more. Nothing stands on it and nothing runs along it: at this distance,
 * under this haze, a house or a windmill read as a speck, and a road as a scratch across the air. The further off, the
 * more of the air's colour is over it.
 *
 * A slice of the station `s` deep (1 at the near ring, smaller further off) is the near ring scaled by `s` about a
 * centre that slides a little toward the camera as it pans, so the far end moves less than the near: the depth is seen
 * when the camera moves, not only drawn.
 */

/** The far end wall's scale: how big the station's far end looks from the near one. */
export const S_FAR = 0.34
/** How far toward the camera the far end slides as the camera pans: a true eye would be 1; this keeps it calm. */
const SLIDE = 0.32
/** Slices of land from the near ring to the far end: equal steps of depth, so they crowd together far off. */
const BANDS = 15
const sAt = (i: number): number => 1 / (1 + (i / BANDS) * (1 / S_FAR - 1))

const FIELDS = ['#9BA56C', '#C4AF72', '#ADA867', '#B7A077', '#92A065', '#CFBB7E']

/** Where a slice of the station is centred, given the camera. */
export function sliceCentre(axis: Pt, cam: Pt, s: number): Pt {
  const w = (1 - s) * SLIDE
  return [axis[0] + (cam[0] - axis[0]) * w, axis[1] + (cam[1] - axis[1]) * w]
}

/**
 * The land going away, under its haze, and the far end wall. Drawn behind everything in the station but the air.
 */
export function drawCylinder(p: p5, k: number, axis: Pt, cam: Pt, air: Air, lit: number, ink: string): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  const TAU = Math.PI * 2
  // The plots: each slice is cut into fields round the ring, the cuts staggered slice to slice. One path per crop.
  const paths = FIELDS.map(() => new Path2D())
  for (let i = 0; i < BANDS; i++) {
    const s0 = sAt(i)
    const s1 = sAt(i + 1)
    const [c0x, c0y] = sliceCentre(axis, cam, s0)
    const [c1x, c1y] = sliceCentre(axis, cam, s1)
    const n = Math.max(10, Math.round(30 * s0))
    const off = hash(i, 3, 71) * TAU
    for (let j = 0; j < n; j++) {
      const a0 = off + (j / n) * TAU
      const a1 = off + ((j + 1) / n) * TAU
      const path = paths[Math.floor(hash(i, j, 72) * FIELDS.length)]
      path.moveTo(X(c0x + RIM_R * s0 * Math.cos(a0)), X(c0y + RIM_R * s0 * Math.sin(a0)))
      path.arc(X(c0x), X(c0y), X(RIM_R * s0), a0, a1)
      path.lineTo(X(c1x + RIM_R * s1 * Math.cos(a1)), X(c1y + RIM_R * s1 * Math.sin(a1)))
      path.arc(X(c1x), X(c1y), X(RIM_R * s1), a1, a0, true)
      path.closePath()
    }
  }
  for (let q = 0; q < FIELDS.length; q++) {
    ctx.fillStyle = FIELDS[q]
    ctx.fill(paths[q])
  }
  // Furrows across the nearer plots: a few lines along each slice, the ground's grain.
  ctx.strokeStyle = 'rgba(42, 31, 23, 0.16)'
  ctx.lineWidth = Math.max(0.6, k * 0.01)
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const s0 = sAt(i)
    const s1 = sAt(i + 1)
    for (let m = 1; m < 4; m++) {
      const s = s0 + ((s1 - s0) * m) / 4
      const [cx, cy] = sliceCentre(axis, cam, s)
      ctx.moveTo(X(cx + RIM_R * s), X(cy))
      ctx.arc(X(cx), X(cy), X(RIM_R * s), 0, TAU)
    }
  }
  ctx.stroke()
  const far = sliceCentre(axis, cam, S_FAR)

  // The haze: the air between the camera and the land, more of it the further off. One fill, from the far end wall's
  // circle out to the near ring's, so it follows the slices as the far end slides.
  const g = ctx.createRadialGradient(X(far[0]), X(far[1]), X(RIM_R * S_FAR), X(axis[0]), X(axis[1]), X(RIM_R))
  const tint = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }
  g.addColorStop(0, tint(air.center, 0.84))
  g.addColorStop(0.3, tint(air.mid, 0.82))
  g.addColorStop(0.72, tint(air.edge, 0.72))
  g.addColorStop(1, tint(air.rim, 0.56 + 0.3 * (1 - lit)))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(X(axis[0]), X(axis[1]), X(RIM_R), 0, TAU)
  ctx.fill()

  // The far end wall in its haze: a rim where the land meets it, and its hub.
  ctx.strokeStyle = tint(mixHex(air.rim, ink, 0.3), 0.45)
  ctx.lineWidth = Math.max(0.8, k * 0.012)
  ctx.beginPath()
  ctx.arc(X(far[0]), X(far[1]), X(RIM_R * S_FAR), 0, TAU)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(X(far[0]), X(far[1]), X(RIM_R * S_FAR * 0.42), 0, TAU)
  ctx.stroke()
  // The spindle, the station's light, from the near hub to the far wall.
  ctx.strokeStyle = tint(DUST.light, 0.55 + 0.4 * lit)
  ctx.lineWidth = X(0.42)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(X(axis[0]), X(axis[1]))
  ctx.lineTo(X(far[0]), X(far[1]))
  ctx.stroke()
  ctx.lineCap = 'butt'
}

/* ------------------------------------------------------------------ the weather and what flies in it */

/** Fair-weather clouds at many depths: the nearer, the larger and the quicker they go round with the air. */
const CLOUDS = Array.from({ length: 6 }, (_, n) => {
  const s = 0.42 + 0.58 * hash(n, 1, 93)
  return { s, a: hash(n, 2, 93) * Math.PI * 2, r: 0.42 + 0.34 * hash(n, 3, 93), size: 1.1 + 1.4 * hash(n, 4, 93), w: 0.006 + 0.012 * s, puffs: 3 + Math.floor(hash(n, 5, 93) * 3) }
}).sort((a, b) => a.s - b.s)

export function drawClouds(p: p5, k: number, axis: Pt, cam: Pt, t: number, air: Air, lit: number, ink: string): void {
  if (lit <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  for (let n = 0; n < CLOUDS.length; n++) {
    const c = CLOUDS[n]
    const a = c.a + c.w * t
    const [cx, cy] = sliceCentre(axis, cam, c.s)
    const r = RIM_R * c.r * c.s
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    const size = c.size * c.s
    // Far ones are mostly air. Each is opaque, its colour already taken toward the air's, so it can be outlined once
    // round its whole body (an ink stroke under the fill) and not round every dome.
    const near = (c.s - 0.42) / 0.58
    const body = mixHex(mixHex(air.mid, '#FFFFFF', 0.3 + 0.55 * near), air.center, 0.55 * (1 - near))
    const under = mixHex(body, air.rim, 0.22 + 0.12 * near)
    ctx.save()
    ctx.translate(X(x), X(y))
    // Flat base to the land below it (outward), tops to the axis: turned so the drawing's up is in toward the axis.
    ctx.rotate(a - Math.PI / 2)
    ctx.globalAlpha = lit
    // A long flat base with domes along its top, the biggest a little off the middle: a cumulus, not a cluster.
    const W = size * 1.5
    const shape = new Path2D()
    shape.rect(X(-W / 2), X(-size * 0.2), X(W), X(size * 0.2))
    const domes = c.puffs + 3
    for (let m = 0; m < domes; m++) {
      const u = m / (domes - 1) - 0.5
      const lift = 1 - Math.abs(u + 0.12) * 1.5
      const pr = size * (0.13 + 0.15 * Math.max(0, lift) + 0.05 * hash(n, m, 94))
      const px = u * W * 0.86
      const py = -size * 0.18 - pr * 0.45 - size * 0.12 * Math.max(0, lift)
      shape.moveTo(X(px + pr), X(py))
      shape.arc(X(px), X(py), X(pr), 0, Math.PI * 2)
    }
    if (near > 0.45) {
      ctx.strokeStyle = alpha(p, ink, 0.4 * (near - 0.3)).toString()
      ctx.lineWidth = Math.max(1.2, k * 0.024)
      ctx.stroke(shape)
    }
    ctx.fillStyle = body
    ctx.fill(shape)
    // The shaded base.
    ctx.fillStyle = under
    ctx.fillRect(X(-W / 2), X(-size * 0.11), X(W), X(size * 0.11))
    ctx.restore()
  }
}

/**
 * Two loose flocks of birds, wheeling over the land near the ring: each a V of two strokes, its wings beating. And a small
 * airship going round the axis, slowly, a lap in a minute and a half.
 */
const FLOCKS = [
  { a: 0.3, w: -0.05, r: 16.6, n: 5 },
  { a: 4.1, w: -0.035, r: 17.2, n: 4 },
]

export function drawFliers(p: p5, k: number, axis: Pt, t: number, lit: number, ink: string): void {
  if (lit <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  ctx.save()
  ctx.strokeStyle = alpha(p, ink, 0.62 * lit).toString()
  ctx.lineWidth = Math.max(0.8, k * 0.014)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let f = 0; f < FLOCKS.length; f++) {
    const F = FLOCKS[f]
    const a = F.a + F.w * t
    const fx = axis[0] + F.r * Math.cos(a)
    const fy = axis[1] + F.r * Math.sin(a)
    // Along their way (round the axis), with a slow wheel of their own.
    const dir = a + (F.w > 0 ? Math.PI / 2 : -Math.PI / 2)
    for (let m = 0; m < F.n; m++) {
      const wheel = 0.5 * Math.sin(t * 0.35 + m * 1.7 + f)
      const bx = fx + Math.cos(dir + 2.6) * 0.35 * m + 0.25 * Math.cos(t * 0.5 + m * 2 + f) + wheel * 0.3
      const by = fy + Math.sin(dir + 2.6) * 0.35 * m + 0.25 * Math.sin(t * 0.6 + m * 1.3 + f)
      const span = 0.11
      const flap = 0.06 * Math.sin(t * (7 + m) + m)
      // "Up" for a bird is toward the axis.
      const ux = (axis[0] - bx) / Math.hypot(axis[0] - bx, axis[1] - by)
      const uy = (axis[1] - by) / Math.hypot(axis[0] - bx, axis[1] - by)
      const sx = Math.cos(dir)
      const sy = Math.sin(dir)
      ctx.moveTo(X(bx - sx * span + ux * flap), X(by - sy * span + uy * flap))
      ctx.lineTo(X(bx - ux * 0.02), X(by - uy * 0.02))
      ctx.lineTo(X(bx + sx * span + ux * flap), X(by + sy * span + uy * flap))
    }
  }
  ctx.stroke()
  ctx.restore()
}

/** The airship: where it is round the axis at `t`. Clear of the flight and the far-side house while those play. */
const SHIP_R = 13.6
/** It flies a little way down the station, so it is smaller and hazier than what stands on the near ring. */
const SHIP_S = 0.8
const shipAngle = (t: number): number => 1.83 + (t / 95) * Math.PI * 2

export function drawAirship(p: p5, k: number, axis: Pt, cam: Pt, t: number, air: Air, lit: number, ink: string): void {
  if (lit <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  const a = shipAngle(t)
  const [cx, cy] = sliceCentre(axis, cam, SHIP_S)
  const x = cx + SHIP_R * SHIP_S * Math.cos(a)
  const y = cy + SHIP_R * SHIP_S * Math.sin(a)
  const hazed = (hex: string) => mixHex(hex, air.mid, 0.3)
  ctx.save()
  ctx.translate(X(x), X(y))
  // Nose along its way (the angle grows, so it goes round with the angle); its gondola hangs outward, to the land.
  ctx.rotate(a + Math.PI / 2)
  // (Mirrored across its length, so its gondola hangs out toward the land and not up at the axis.)
  ctx.scale(SHIP_S, -SHIP_S)
  // A slow pitch in the air.
  ctx.rotate(0.04 * Math.sin(t * 0.6))
  ctx.globalAlpha = lit
  ctx.strokeStyle = alpha(p, ink, 0.8).toString()
  ctx.lineWidth = Math.max(0.8, k * 0.018)
  ctx.lineJoin = 'round'
  const L = 1.5
  const H = 0.52
  // Its tail fins, small, behind the envelope.
  ctx.fillStyle = hazed(DUST.rust)
  ctx.beginPath()
  for (const sgn of [-1, 1]) {
    ctx.moveTo(X(-L * 0.3), X(sgn * H * 0.2))
    ctx.lineTo(X(-L * 0.52), X(sgn * H * 0.62))
    ctx.lineTo(X(-L * 0.55), X(sgn * H * 0.08))
    ctx.closePath()
  }
  ctx.fill()
  ctx.stroke()
  // The envelope: fat and blunt-nosed, tapering to the tail.
  ctx.fillStyle = hazed(DUST.bone)
  ctx.beginPath()
  ctx.moveTo(X(L * 0.5), 0)
  ctx.bezierCurveTo(X(L * 0.5), X(-H * 0.56), X(-L * 0.1), X(-H * 0.6), X(-L * 0.46), X(-H * 0.14))
  ctx.lineTo(X(-L * 0.46), X(H * 0.14))
  ctx.bezierCurveTo(X(-L * 0.1), X(H * 0.6), X(L * 0.5), X(H * 0.56), X(L * 0.5), 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Its seams, and a band of the farm's denim round its middle.
  ctx.strokeStyle = alpha(p, ink, 0.25).toString()
  ctx.beginPath()
  ctx.moveTo(X(L * 0.45), X(-H * 0.06))
  ctx.lineTo(X(-L * 0.44), X(-H * 0.06))
  ctx.stroke()
  ctx.fillStyle = hazed(DUST.denim)
  ctx.beginPath()
  ctx.moveTo(X(0.04), X(-H * 0.5))
  ctx.lineTo(X(0.2), X(-H * 0.5))
  ctx.lineTo(X(0.2), X(H * 0.5))
  ctx.lineTo(X(0.04), X(H * 0.5))
  ctx.closePath()
  ctx.fill()
  // The gondola under it, outward, on two struts.
  ctx.strokeStyle = alpha(p, ink, 0.8).toString()
  ctx.beginPath()
  ctx.moveTo(X(-0.12), X(H * 0.48))
  ctx.lineTo(X(-0.1), X(H * 0.62))
  ctx.moveTo(X(0.22), X(H * 0.48))
  ctx.lineTo(X(0.2), X(H * 0.62))
  ctx.stroke()
  ctx.fillStyle = hazed(DUST.wood)
  ctx.beginPath()
  ctx.rect(X(-0.18), X(H * 0.62), X(0.44), X(0.13))
  ctx.fill()
  ctx.stroke()
  // Its propeller at the gondola's back, turning: a blur of two strokes.
  const sp = Math.sin(t * 22)
  ctx.beginPath()
  ctx.moveTo(X(-0.24), X(H * 0.68 - 0.09 * sp))
  ctx.lineTo(X(-0.24), X(H * 0.68 + 0.09 * sp))
  ctx.stroke()
  ctx.restore()
}
