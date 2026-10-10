import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { beam, bloom, pool, rgba } from '../cast'
import { hash } from '../kit'
import { BAND, RAIN_GEO } from '../stack'
import { RAIN, SLEEP } from '../worlds'
import { AWNING, shake } from './rain-geo'

/**
 * The rain's standing city (behind everything that moves): the sky, the far towers in the rain, the street's buildings
 * with a few warm windows, the shop and its awning, the lamps, the ground under the street, the quays, the river's
 * bed, and the bridge on its piers and steel arches to its broken end on the column. World cells.
 */

export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
}
export interface Pen {
  p: p5
  k: number
  ink: string
  w: number
  ctx: CanvasRenderingContext2D
}
export const seen = (f: View, x0: number, x1: number, y0: number, y1: number, m = 0.5): boolean => x1 > f.x0 - m && x0 < f.x1 + m && y1 > f.y0 - m && y0 < f.y1 + m

/** The quays: the street ends at the left one; the far bank begins at the right one. */
export const QUAY_L = -30.6
export const QUAY_R = 22.5
/** The bridge's piers, and where its arches spring. */
const PIERS = [-17.5, -6.5]
const SPRING = 2.2
const DECK = 0.45

const GROUND = mixHex(mixHex(RAIN.street, RAIN.trainRust, 0.22), SLEEP.deep, 0.25)
const STRATA = mixHex(GROUND, RAIN.kerb, 0.18)
const STONE = mixHex(RAIN.bridge, RAIN.kerb, 0.25)
const STONE_DARK = mixHex(RAIN.bridge, RAIN.street, 0.45)
const LAMP = mixHex(RAIN.lamp, RAIN.window, 0.35)

interface Building {
  x0: number
  x1: number
  top: number
  shade: number
}
const NEAR: Building[] = [
  { x0: -78, x1: -67.5, top: -13, shade: 0 },
  { x0: -67.5, x1: -61.5, top: -9.5, shade: 1 },
  { x0: -61.5, x1: -55, top: -15.5, shade: 0 },
  { x0: -55, x1: -48.6, top: -11, shade: 1 },
  { x0: -48.6, x1: -43.6, top: -8.5, shade: 0 },
  { x0: -43.6, x1: -38.8, top: -14, shade: 1 },
  { x0: -38.8, x1: -34.6, top: -10.5, shade: 0 },
  { x0: -34.6, x1: QUAY_L, top: -7, shade: 1 },
  { x0: QUAY_R + 1, x1: 28.5, top: -9, shade: 1 },
  { x0: 28.5, x1: 35, top: -14.5, shade: 0 },
  { x0: 35, x1: 40, top: -8, shade: 1 },
  { x0: 40, x1: 47.5, top: -16, shade: 0 },
  { x0: 47.5, x1: 53, top: -10, shade: 1 },
  { x0: 53, x1: 60.5, top: -13, shade: 0 },
  { x0: 60.5, x1: 68, top: -9, shade: 1 },
  { x0: 68, x1: 80, top: -12, shade: 0 },
]
/** The far city, in the rain's haze, and a nearer rank of it across the river, standing on the far bank. */
const FAR_BASE = 1.2
const MID_BASE = 2.1
interface Tower {
  x0: number
  x1: number
  top: number
  /** A narrower storey or two set back on top (0: none), and a mast. */
  step: number
  mast: number
}
const FAR: Tower[] = []
const MID: Tower[] = []
{
  let x = -86
  let i = 0
  while (x < 92) {
    const w = 2.2 + hash(i, 1, 71) * 3.6
    const tall = hash(i, 2, 71)
    FAR.push({ x0: x, x1: x + w, top: -5.5 - tall * tall * 10, step: hash(i, 4, 71) < 0.45 ? 1 + hash(i, 5, 71) * 2.2 : 0, mast: hash(i, 6, 71) < 0.18 ? 1.2 + hash(i, 7, 71) * 1.6 : 0 })
    x += w + 0.6 + hash(i, 3, 71) * 2.4
    i++
  }
  x = -84
  i = 0
  while (x < 90) {
    const w = 2.5 + hash(i, 1, 72) * 4
    MID.push({ x0: x, x1: x + w, top: -1.4 - hash(i, 2, 72) * 4.6, step: hash(i, 4, 72) < 0.3 ? 0.6 + hash(i, 5, 72) * 1.1 : 0, mast: 0 })
    x += w + 0.3 + hash(i, 3, 72) * 1.6
    i++
  }
}
/** A tower's silhouette: its block, the storey set back on it, its mast. */
function tower(ctx: CanvasRenderingContext2D, k: number, b: Tower, base: number): void {
  const w = b.x1 - b.x0
  ctx.fillRect(b.x0 * k, b.top * k, w * k, (base - b.top) * k)
  if (b.step > 0) ctx.fillRect((b.x0 + w * 0.2) * k, (b.top - b.step) * k, w * 0.6 * k, b.step * k)
  if (b.mast > 0) ctx.fillRect((b.x0 + w * 0.5 - 0.05) * k, (b.top - b.step - b.mast) * k, Math.max(1, 0.1 * k), b.mast * k)
}
/** The street lamps: on the street, on the bridge (on its railing's line), on the far bank. */
export const LAMPS = [-71, -63, -53.5, -39.3, -32, -22.3, -13.6, -4.8, 25.5, 33, 42, 51, 59, 67]

/** Everything of the city behind what moves, in the order it is seen through. */
export function drawCity(pen: Pen, f: View, te: number): void {
  const { p, k, ctx } = pen
  const top = BAND.rain.top
  const X0 = (f.x0 - 1) * k
  const W = (f.x1 - f.x0 + 2) * k
  // The sky: rain cloud at the top of the band (feathered out of the dark above it), paling to the low grey.
  {
    const y0 = Math.max(top, f.y0 - 1)
    const y1 = Math.min(RAIN_GEO.river, f.y1 + 1)
    if (y1 > y0) {
      const g = ctx.createLinearGradient(0, top * k, 0, RAIN_GEO.river * k)
      g.addColorStop(0, rgba(RAIN.cloud, 0))
      g.addColorStop(1.6 / (RAIN_GEO.river - top), rgba(RAIN.cloud, 1))
      g.addColorStop(0.35, RAIN.sky)
      g.addColorStop(0.72, RAIN.skyLow)
      g.addColorStop(1, mixHex(RAIN.skyLow, RAIN.far, 0.3))
      ctx.fillStyle = g
      ctx.fillRect(X0, y0 * k, W, (y1 - y0) * k)
    }
  }
  // Heavy cloud, drifting on the rain's clock.
  if (f.y0 < -8) {
    for (let i = 0; i < 22; i++) {
      const span = 180
      const cx = -90 + ((hash(i, 1, 81) * span + te * (0.12 + 0.08 * hash(i, 2, 81))) % span)
      const cy = -20 + hash(i, 3, 81) * 8
      const rx = 8 + hash(i, 4, 81) * 9
      const ry = 2.2 + hash(i, 5, 81) * 2.4
      if (!seen(f, cx - rx, cx + rx, cy - ry, cy + ry)) continue
      ctx.save()
      ctx.translate(cx * k, cy * k)
      ctx.scale(1, ry / rx)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
      const c = i % 3 === 0 ? RAIN.buildingDark : i % 3 === 1 ? RAIN.far : RAIN.cloud
      g.addColorStop(0, rgba(c, 0.5))
      g.addColorStop(0.6, rgba(c, 0.2))
      g.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = g
      ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
      ctx.restore()
    }
  }
  // The far towers, then a nearer rank standing on the far bank, both greyed into the rain.
  p.noStroke()
  const farFill = mixHex(RAIN.far, RAIN.sky, 0.6)
  const midFill = mixHex(RAIN.far, RAIN.building, 0.35)
  ctx.fillStyle = farFill
  for (const b of FAR) if (seen(f, b.x0, b.x1, b.top - b.step - b.mast, FAR_BASE)) tower(ctx, k, b, FAR_BASE)
  hazeBand(pen, f, -9, FAR_BASE, RAIN.skyLow, 0.0, 0.55)
  ctx.fillStyle = midFill
  for (const b of MID) if (seen(f, b.x0, b.x1, b.top - b.step, MID_BASE)) tower(ctx, k, b, MID_BASE)
  if (k > 7) {
    // A few far lit windows in the nearer rank.
    ctx.fillStyle = rgba(RAIN.windowLit, 0.45)
    for (let i = 0; i < MID.length; i++) {
      const b = MID[i]
      if (!seen(f, b.x0, b.x1, b.top, MID_BASE)) continue
      for (let j = 0; j < 5; j++) {
        if (hash(i, j, 73) > 0.4) continue
        const wx = b.x0 + 0.4 + hash(i, j + 9, 73) * (b.x1 - b.x0 - 0.8)
        const wy = b.top + 0.8 + hash(i, j + 19, 73) * Math.max(0.5, MID_BASE - b.top - 2)
        ctx.fillRect(wx * k, wy * k, 0.2 * k, 0.28 * k)
      }
    }
  }
  hazeBand(pen, f, -6.5, MID_BASE, RAIN.skyLow, 0.08, 0.42)
  // Across the river, under the bridge: the far bank's quay wall down to the far reach of the water, in the mist.
  if (seen(f, QUAY_L, QUAY_R, MID_BASE, RAIN_GEO.river)) {
    const x0 = Math.max(QUAY_L, f.x0 - 1)
    const x1 = Math.min(QUAY_R, f.x1 + 1)
    ctx.fillStyle = mixHex(STONE_DARK, RAIN.far, 0.5)
    ctx.fillRect(x0 * k, MID_BASE * k, (x1 - x0) * k, (RAIN_GEO.river - MID_BASE) * k)
    if (k > 8) {
      ctx.fillStyle = rgba(RAIN.far, 0.5)
      for (let y = MID_BASE + 0.9; y < RAIN_GEO.river - 0.4; y += 1.1) ctx.fillRect(x0 * k, y * k, (x1 - x0) * k, Math.max(1, 0.05 * k))
    }
    const g = ctx.createLinearGradient(0, MID_BASE * k, 0, RAIN_GEO.river * k)
    g.addColorStop(0, rgba(RAIN.skyLow, 0.5))
    g.addColorStop(0.6, rgba(RAIN.skyLow, 0.18))
    g.addColorStop(1, rgba(RAIN.skyLow, 0.32))
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, MID_BASE * k, (x1 - x0) * k, (RAIN_GEO.river - MID_BASE) * k)
    ctx.fillStyle = rgba(RAIN.riverLight, 0.75)
    ctx.fillRect(x0 * k, (RAIN_GEO.river - 0.32) * k, (x1 - x0) * k, 0.32 * k)
    // The far bank's road: the lights of its traffic going both ways, small in the rain (and, when he is deeper,
    // hanging where they are).
    if (k > 3) {
      const span = QUAY_R - QUAY_L
      for (let i = 0; i < 14; i++) {
        const dir = i % 2 ? 1 : -1
        const v = 1.6 + hash(i, 1, 75) * 1.4
        const x = QUAY_L + ((((hash(i, 2, 75) * span + dir * v * te) % span) + span) % span)
        if (x < f.x0 - 1 || x > f.x1 + 1) continue
        const y = MID_BASE - 0.12 - (i % 3) * 0.04
        const c = dir > 0 ? RAIN.lamp : RAIN.trainRust
        bloom(p, k, [x, y], 0.13, c, dir > 0 ? 0.42 : 0.34)
        ctx.fillStyle = rgba(c, dir > 0 ? 0.8 : 0.6)
        ctx.fillRect((x - 0.035) * k, (y - 0.02) * k, Math.max(1, 0.07 * k), Math.max(1, 0.04 * k))
      }
    }
  }
}

/** A soft band of rain-haze, thickening downward from `y0` to `y1`. */
function hazeBand(pen: Pen, f: View, y0: number, y1: number, color: string, a0: number, a1: number): void {
  if (!seen(f, -1e9, 1e9, y0, y1)) return
  const { ctx, k } = pen
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, rgba(color, a0))
  g.addColorStop(1, rgba(color, a1))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, y0 * k, (f.x1 - f.x0 + 2) * k, (y1 - y0) * k)
}

/** The street's buildings, the shop and its awning, the ground and the quays, the lamps' posts. */
/** The far kerb, at the buildings' feet. */
const FAR_KERB = -0.26
export function drawStreet(pen: Pen, f: View, te: number): void {
  const { p, k, ink, w, ctx } = pen
  // The ground under the street, the quays and the far bank, and the river's bed: dark earth down to the band's
  // bottom, a few soft strata in it.
  const bottom = BAND.rain.bottom
  if (seen(f, -1e9, 1e9, 0, bottom)) {
    ctx.fillStyle = GROUND
    const x0 = (f.x0 - 1) * k
    const x1 = (f.x1 + 1) * k
    ctx.fillRect(x0, 0.55 * k, Math.max(0, Math.min(x1, QUAY_L * k) - x0), (bottom - 0.55) * k)
    ctx.fillRect(Math.max(x0, QUAY_R * k), 0.55 * k, Math.max(0, x1 - Math.max(x0, QUAY_R * k)), (bottom - 0.5) * k)
    ctx.fillStyle = mixHex(RAIN.river, GROUND, 0.55)
    ctx.fillRect(Math.max(x0, QUAY_L * k), RAIN_GEO.bed * k, Math.max(0, Math.min(x1, QUAY_R * k) - Math.max(x0, QUAY_L * k)), (bottom - RAIN_GEO.bed) * k)
    if (k > 5) {
      ctx.fillStyle = rgba(STRATA, 0.55)
      for (let i = 0; i < 6; i++) {
        const y = 2.2 + i * 1.7 + hash(i, 1, 91) * 0.6
        if (y > bottom - 0.3) break
        ctx.fillRect(x0, y * k, Math.max(0, Math.min(x1, QUAY_L * k) - x0), (0.18 + hash(i, 2, 91) * 0.2) * k)
        ctx.fillRect(Math.max(x0, QUAY_R * k), (y + 0.4) * k, Math.max(0, x1 - Math.max(x0, QUAY_R * k)), 0.2 * k)
      }
    }
    // The quay walls: cut stone from the street down to the bed.
    ctx.fillStyle = STONE_DARK
    ctx.fillRect((QUAY_L - 0.9) * k, 0.4 * k, 0.9 * k, (RAIN_GEO.bed + 0.4) * k)
    ctx.fillRect(QUAY_R * k, 0.4 * k, 1.0 * k, (RAIN_GEO.bed + 0.4) * k)
    if (k > 10) {
      p.stroke(rgba(ink, 0.35))
      p.strokeWeight(w * 0.5)
      for (let y = 1.3; y < RAIN_GEO.bed; y += 0.9) {
        p.line((QUAY_L - 0.9) * k, y * k, QUAY_L * k, y * k)
        p.line(QUAY_R * k, y * k, (QUAY_R + 1) * k, y * k)
      }
      p.noStroke()
    }
  }
  // The street: wet asphalt, its top catching the sky, a kerb's edge; the lamps' and the shop's light run down into it.
  for (const [a, b] of [[-1e9, QUAY_L], [QUAY_R, 1e9]] as const) {
    if (!seen(f, a, b, 0, 0.6)) continue
    const x0 = Math.max(a, f.x0 - 1)
    const x1 = Math.min(b, f.x1 + 1)
    const g = ctx.createLinearGradient(0, 0, 0, 0.6 * k)
    g.addColorStop(0, RAIN.streetWet)
    g.addColorStop(0.35, mixHex(RAIN.streetWet, RAIN.street, 0.6))
    g.addColorStop(1, RAIN.street)
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, 0, (x1 - x0) * k, 0.6 * k)
    p.stroke(ink)
    p.strokeWeight(w * 0.8)
    p.line(x0 * k, 0, x1 * k, 0)
    p.line(x0 * k, 0.6 * k, x1 * k, 0.6 * k)
    p.stroke(rgba(RAIN.kerb, 0.6))
    p.strokeWeight(Math.max(1, 0.04 * k))
    p.line(x0 * k, 0.05 * k, x1 * k, 0.05 * k)
    p.noStroke()
  }
  // The buildings.
  for (let i = 0; i < NEAR.length; i++) {
    const b = NEAR[i]
    if (!seen(f, b.x0, b.x1, b.top, 0)) continue
    building(pen, f, b, i)
  }
  // The shop: its window lit (the one warm light of the street), its door, its awning over the pavement.
  if (seen(f, AWNING.x0 - 1, AWNING.x1 + 1, -3, 0.6)) shop(pen, te)
  // The street's far side: wet asphalt from the far kerb at the buildings' feet to the near one. The traffic and the
  // train run in the middle of the street, set back from the near kerb, and without it they stood a little up the
  // facades, in the air (a critic's note under Zoom).
  for (const [a, b] of [[-1e9, QUAY_L], [QUAY_R, 1e9]] as const) {
    if (!seen(f, a, b, FAR_KERB, 0)) continue
    const x0 = Math.max(a, f.x0 - 1)
    const x1 = Math.min(b, f.x1 + 1)
    const g = ctx.createLinearGradient(0, FAR_KERB * k, 0, 0)
    g.addColorStop(0, mixHex(RAIN.streetWet, RAIN.street, 0.75))
    g.addColorStop(1, RAIN.streetWet)
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, FAR_KERB * k, (x1 - x0) * k, -FAR_KERB * k)
    p.stroke(rgba(RAIN.kerb, 0.55))
    p.strokeWeight(Math.max(1, 0.035 * k))
    p.line(x0 * k, FAR_KERB * k, x1 * k, FAR_KERB * k)
    p.noStroke()
  }
  // The lamps' posts and heads.
  for (const x of LAMPS) {
    const onBridge = x > QUAY_L && x < 0
    if (!seen(f, x - 1, x + 1.5, -3.6, 0.6)) continue
    lampPost(pen, x, onBridge, shake(te, x))
  }
}

function building(pen: Pen, f: View, b: Building, i: number): void {
  const { p, k, ink, w, ctx } = pen
  const fill = b.shade ? RAIN.buildingDark : RAIN.building
  const width = b.x1 - b.x0
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  p.fill(fill)
  p.rectMode(p.CORNER)
  p.rect(b.x0 * k, b.top * k, width * k, -b.top * k)
  // Its cornice and parapet.
  p.fill(mixHex(fill, RAIN.kerb, 0.22))
  p.rect((b.x0 - 0.14) * k, b.top * k, (width + 0.28) * k, 0.3 * k)
  p.noStroke()
  if (k < 4) return
  // Pilasters: the facade's bays.
  const bays = Math.max(1, Math.round(width / 2.6))
  const bw = width / bays
  ctx.fillStyle = mixHex(fill, ink, 0.12)
  for (let j = 1; j < bays; j++) ctx.fillRect((b.x0 + j * bw - 0.09) * k, (b.top + 0.3) * k, 0.18 * k, (-b.top - 3.1) * k)
  // The ground floor's band, and its shopfronts and doors.
  ctx.fillStyle = mixHex(fill, RAIN.kerb, 0.18)
  ctx.fillRect((b.x0 + 0.05) * k, -2.85 * k, (width - 0.1) * k, 0.22 * k)
  if (k < 6) return
  // Windows: dark glass reflecting the grey, a pale sill under each; a few lit warm.
  const glass = mixHex(fill, RAIN.street, 0.5)
  const sill = mixHex(fill, RAIN.kerb, 0.35)
  const style = hash(i, 1, 61)
  const per = style < 0.35 ? 1 : 2
  const ww = style < 0.35 ? Math.min(1.3, bw * 0.55) : Math.min(0.55, bw * 0.24)
  const wh = style < 0.35 ? 0.85 : 1.05
  for (let r = 0; ; r++) {
    const y = b.top + 1.05 + r * 1.75
    if (y + wh > -3.3) break
    if (y + wh < f.y0 - 0.5 || y > f.y1 + 0.5) continue
    for (let j = 0; j < bays; j++) {
      for (let q = 0; q < per; q++) {
        const x = b.x0 + j * bw + (bw * (q + 1)) / (per + 1)
        if (x < f.x0 - 1 || x > f.x1 + 1) continue
        const lit = hash(i, r * 29 + j * 3 + q, 57) < 0.055
        ctx.fillStyle = lit ? RAIN.windowLit : glass
        ctx.fillRect((x - ww / 2) * k, y * k, ww * k, wh * k)
        ctx.fillStyle = sill
        ctx.fillRect((x - ww / 2 - 0.05) * k, (y + wh) * k, (ww + 0.1) * k, Math.max(1, 0.07 * k))
        if (lit) bloom(p, k, [x, y + wh / 2], 0.9, RAIN.windowLit, 0.14)
      }
    }
  }
  if (i === 4) return
  // Street level: dark shopfronts behind thin mullions, and doors.
  const n = Math.max(1, Math.floor(width / 2.4))
  for (let j = 0; j < n; j++) {
    const x = b.x0 + ((j + 0.5) * width) / n
    const door = hash(i, j, 59) < 0.4
    ctx.fillStyle = mixHex(fill, ink, door ? 0.6 : 0.45)
    if (door) ctx.fillRect((x - 0.42) * k, -2.3 * k, 0.84 * k, 2.3 * k)
    else {
      ctx.fillRect((x - 0.95) * k, -2.25 * k, 1.9 * k, 1.75 * k)
      ctx.fillStyle = rgba(RAIN.window, 0.12)
      ctx.fillRect((x - 0.95) * k, -2.25 * k, 1.9 * k, 0.5 * k)
      ctx.fillStyle = mixHex(fill, RAIN.kerb, 0.2)
      ctx.fillRect((x - 0.03) * k, -2.25 * k, Math.max(1, 0.06 * k), 1.75 * k)
    }
  }
}

function shop(pen: Pen, te: number): void {
  const { p, k, ink, w, ctx } = pen
  const { x0, x1 } = AWNING
  const quake = shake(te, (x0 + x1) / 2)
  const y = AWNING.y
  // The window: warm, a little breathing, brighter under its lamp; shelves and goods dark in it.
  const glow = (0.92 + 0.08 * Math.sin(te * 0.7)) * (1 - Math.min(0.4, Math.abs(quake) * 10))
  const wx0 = x0 + 0.35
  const wx1 = x1 - 1.25
  const wy0 = y + 0.28
  const wy1 = y + 2.0
  const lg = ctx.createLinearGradient(0, wy0 * k, 0, wy1 * k)
  lg.addColorStop(0, mixHex(RAIN.windowLit, RAIN.lamp, 0.45))
  lg.addColorStop(0.55, RAIN.windowLit)
  lg.addColorStop(1, mixHex(RAIN.windowLit, RAIN.trainRust, 0.35))
  ctx.fillStyle = lg
  ctx.fillRect(wx0 * k, wy0 * k, (wx1 - wx0) * k, (wy1 - wy0) * k)
  if (k > 10) {
    ctx.fillStyle = rgba(mixHex(RAIN.trainRust, ink, 0.5), 0.55)
    for (const sy of [wy0 + 0.75, wy0 + 1.35]) {
      ctx.fillRect(wx0 * k, sy * k, (wx1 - wx0) * k, 0.05 * k)
      for (let i = 0; i < 7; i++) {
        const gx = wx0 + 0.12 + hash(i, sy * 10, 41) * (wx1 - wx0 - 0.3)
        const gh = 0.12 + hash(i, sy * 10 + 1, 41) * 0.22
        ctx.fillRect(gx * k, (sy - gh) * k, (0.08 + hash(i, 3, 41) * 0.14) * k, gh * k)
      }
    }
  }
  const g = ctx.createLinearGradient(0, wy0 * k, 0, wy1 * k)
  g.addColorStop(0, rgba(ink, 0))
  g.addColorStop(1, rgba(ink, 0.18))
  ctx.fillStyle = g
  ctx.fillRect(wx0 * k, wy0 * k, (wx1 - wx0) * k, (wy1 - wy0) * k)
  // The door beside it.
  ctx.fillStyle = mixHex(RAIN.buildingDark, ink, 0.45)
  ctx.fillRect((x1 - 1.0) * k, (y + 0.15) * k, 0.7 * k, -(y + 0.15) * k)
  p.stroke(ink)
  p.strokeWeight(w * 0.6)
  p.noFill()
  p.rect(wx0 * k, wy0 * k, (wx1 - wx0) * k, (wy1 - wy0) * k)
  p.line(((wx0 + wx1) / 2) * k, wy0 * k, ((wx0 + wx1) / 2) * k, wy1 * k)
  // Its light: on the pavement under the awning and into the street.
  pool(p, k, [(x0 + x1) / 2 - 0.4, 0.02], 2.2, 0.16, RAIN.windowLit, 0.3 * glow)
  // Into the street: a soft pool fading out on every side (a window-wide box of light ended on hard vertical edges).
  pool(p, k, [(wx0 + wx1) / 2, 0.22], (wx1 - wx0) / 2 + 0.7, 0.34, RAIN.windowLit, 0.3 * glow)
  bloom(p, k, [(wx0 + wx1) / 2, y + 1.1], 2.4, RAIN.windowLit, 0.16 * glow)
  // The awning: a canvas sloped out from the wall, its valance scalloped, dark against the lit window; it shivers as
  // the train goes by.
  p.push()
  p.translate(0, quake * 1.2 * k)
  const canvas = mixHex(RAIN.trainRust, RAIN.buildingDark, 0.2)
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(canvas)
  p.beginShape()
  p.vertex(x0 * k, (y - 0.5) * k)
  p.vertex(x1 * k, (y - 0.5) * k)
  p.vertex((x1 + 0.12) * k, y * k)
  p.vertex((x0 - 0.12) * k, y * k)
  p.endShape(p.CLOSE)
  p.fill(mixHex(canvas, ink, 0.25))
  p.beginShape()
  p.vertex((x0 - 0.12) * k, y * k)
  p.vertex((x1 + 0.12) * k, y * k)
  const n = 9
  for (let i = n; i >= 0; i--) {
    const x = x0 - 0.12 + ((x1 - x0 + 0.24) * i) / n
    p.vertex(x * k, (y + 0.22) * k)
    if (i > 0) p.vertex((x - (x1 - x0 + 0.24) / n / 2) * k, (y + 0.3) * k)
  }
  p.endShape(p.CLOSE)
  // Its arms back to the wall, each into a bracket on the wall under it (they hung from it and stopped in the air).
  for (const ax of [x0 + 0.1, x1 - 0.1]) {
    p.line(ax * k, (y + 0.02) * k, ax * k, (y + 0.62) * k)
    p.rect((ax - 0.07) * k, (y + 0.58) * k, 0.14 * k, 0.12 * k)
  }
  p.pop()
  // The drip off its edge, on the rain's clock: a thin sheet of drops falling from the valance.
  if (k > 16) {
    ctx.strokeStyle = rgba(RAIN.rain, 0.45)
    ctx.lineWidth = Math.max(0.6, 0.012 * k)
    ctx.beginPath()
    for (let i = 0; i < 14; i++) {
      const x = x0 + 0.1 + hash(i, 1, 93) * (x1 - x0 - 0.2)
      const ph = (te * (1.1 + hash(i, 2, 93) * 0.6) + hash(i, 3, 93)) % 1
      const yy = y + 0.3 + ph * ph * 2.1
      ctx.moveTo(x * k, yy * k)
      ctx.lineTo(x * k, (yy + 0.12 + ph * 0.25) * k)
    }
    ctx.stroke()
  }
  p.noStroke()
}

function lampPost(pen: Pen, x: number, onBridge: boolean, quake: number): void {
  const { p, k, ink, w } = pen
  const foot = onBridge ? -0.85 : 0
  const headY = -3.05
  // The post sways from its foot as the ground shakes: its head moves most.
  p.push()
  p.translate(x * k, foot * k)
  p.rotate(quake * 0.9)
  p.translate(-x * k, -foot * k)
  p.stroke(ink)
  p.strokeWeight(w * 0.9)
  p.noFill()
  p.line(x * k, foot * k, x * k, (headY + 0.3) * k)
  p.bezier(x * k, (headY + 0.3) * k, x * k, (headY - 0.05) * k, (x + 0.2) * k, headY * k, (x + 0.45) * k, headY * k)
  p.fill(mixHex(RAIN.steel, ink, 0.3))
  p.beginShape()
  p.vertex((x + 0.3) * k, (headY - 0.04) * k)
  p.vertex((x + 0.62) * k, (headY - 0.04) * k)
  p.vertex((x + 0.56) * k, (headY + 0.1) * k)
  p.vertex((x + 0.36) * k, (headY + 0.1) * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.pop()
}

/** The lamps' light: soft glows, cones down through the rain, pools on the wet street and their runs into it. */
export function drawLampLight(pen: Pen, f: View, te: number): void {
  const { p, k, ctx } = pen
  for (let i = 0; i < LAMPS.length; i++) {
    const x = LAMPS[i] + 0.46
    if (!seen(f, x - 2.5, x + 2.5, -4, 0.8)) continue
    const q = shake(te, LAMPS[i])
    const flick = (0.94 + 0.06 * Math.sin(te * (1.3 + hash(i, 1, 95)) + i)) * (1 - Math.min(0.5, Math.abs(q) * 12))
    const head: [number, number] = [x + q * 0.9 * 3, -2.92]
    bloom(p, k, head, 1.0, LAMP, 0.32 * flick)
    beam(p, k, head, [x, 0], 0.22, 2.4, LAMP, 0.12 * flick)
    pool(p, k, [x, 0.02], 1.5, 0.13, LAMP, 0.22 * flick)
    const r = ctx.createLinearGradient(0, 0, 0, 0.5 * k)
    r.addColorStop(0, rgba(LAMP, 0.26 * flick))
    r.addColorStop(1, rgba(LAMP, 0))
    ctx.fillStyle = r
    ctx.fillRect((x - 0.35) * k, 0, 0.7 * k, 0.5 * k)
  }
}

/** The bridge: its abutment, its piers and steel arches, its deck, to its broken end; the railing is drawn over. */
export function drawBridge(pen: Pen, f: View): void {
  const { p, k, ink, w } = pen
  if (!seen(f, QUAY_L - 1, 1.5, -1.2, RAIN_GEO.bed + 0.5)) return
  // The abutment: stone from the deck down to the bed.
  p.stroke(ink)
  p.strokeWeight(w * 0.7)
  p.fill(STONE)
  p.rectMode(p.CORNER)
  p.rect(QUAY_L * k, DECK * k, (RAIN_GEO.deckFrom - QUAY_L) * k, (RAIN_GEO.bed + 0.2 - DECK) * k)
  // The piers, battered, with their caps.
  for (const x of PIERS) {
    p.fill(STONE)
    p.beginShape()
    p.vertex((x - 0.62) * k, SPRING * k)
    p.vertex((x + 0.62) * k, SPRING * k)
    p.vertex((x + 0.82) * k, (RAIN_GEO.bed + 0.25) * k)
    p.vertex((x - 0.82) * k, (RAIN_GEO.bed + 0.25) * k)
    p.endShape(p.CLOSE)
    p.fill(mixHex(STONE, RAIN.kerb, 0.3))
    p.rect((x - 0.78) * k, (SPRING - 0.25) * k, 1.56 * k, 0.3 * k)
  }
  if (k > 9) {
    p.stroke(rgba(ink, 0.3))
    p.strokeWeight(w * 0.45)
    for (let y = 1.3; y < RAIN_GEO.bed; y += 0.9) {
      p.line(QUAY_L * k, y * k, RAIN_GEO.deckFrom * k, y * k)
      for (const x of PIERS) if (y > SPRING + 0.2) p.line((x - 0.62 - ((y - SPRING) / (RAIN_GEO.bed - SPRING)) * 0.2) * k, y * k, (x + 0.62 + ((y - SPRING) / (RAIN_GEO.bed - SPRING)) * 0.2) * k, y * k)
    }
  }
  // The arches: steel ribs from the abutment to the piers, and from the last pier toward the far side, broken off at
  // the column; posts up from each to the deck.
  const spans: [number, number, number][] = [
    [RAIN_GEO.deckFrom, PIERS[0] - 0.62, 1],
    [PIERS[0] + 0.62, PIERS[1] - 0.62, 1],
    [PIERS[1] + 0.62, PIERS[1] + 0.62 + 11, (RAIN_GEO.deckEnd - 0.35 - PIERS[1] - 0.62) / 11],
  ]
  const archY = (a: number, b: number, x: number) => {
    const u = (x - a) / (b - a)
    return SPRING - (SPRING - DECK - 0.12) * Math.sin(Math.PI * u)
  }
  for (const [a, b, frac] of spans) {
    const end = a + (b - a) * frac
    // Posts first, then the rib over them.
    p.stroke(RAIN.steel)
    p.strokeWeight(Math.max(1, 0.07 * k))
    for (let x = a + 0.6; x < end - 0.1; x += 0.8) p.line(x * k, DECK * k, x * k, archY(a, b, x) * k)
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(Math.max(1.6, 0.26 * k) + w)
    p.beginShape()
    for (let x = a; x <= end + 1e-6; x += 0.25) p.vertex(x * k, archY(a, b, x) * k)
    p.endShape()
    p.stroke(RAIN.steel)
    p.strokeWeight(Math.max(1, 0.26 * k))
    p.beginShape()
    for (let x = a; x <= end + 1e-6; x += 0.25) p.vertex(x * k, archY(a, b, x) * k)
    p.endShape()
    if (frac < 1) {
      // Torn: the rib's end bent down, and the bars of the deck hanging out of it.
      const ey = archY(a, b, end)
      p.strokeWeight(Math.max(1, 0.18 * k))
      p.line(end * k, ey * k, (end + 0.25) * k, (ey + 0.35) * k)
    }
  }
  // The deck: a slab from the street to its broken end (its face is drawn again over the balls, for the going under).
  deckFace(pen)
  // The broken end: bars bent down out of the concrete.
  p.stroke(mixHex(RAIN.steel, ink, 0.3))
  p.strokeWeight(Math.max(0.8, 0.035 * k))
  p.noFill()
  for (let i = 0; i < 6; i++) {
    const x = RAIN_GEO.deckEnd - 0.05 - i * 0.05
    const y = 0.08 + i * 0.06
    const len = 0.3 + hash(i, 1, 97) * 0.45
    p.bezier(x * k, y * k, (x + len * 0.6) * k, (y + 0.02) * k, (x + len * 0.8) * k, (y + len * 0.4) * k, (x + len * 0.7) * k, (y + len) * k)
  }
  p.noStroke()
}

/** The deck's face, from the street to its jagged broken end. */
export function deckFace(pen: Pen): void {
  const { p, k, ink, w } = pen
  const end = RAIN_GEO.deckEnd
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.fill(mixHex(RAIN.bridge, RAIN.steel, 0.25))
  p.beginShape()
  p.vertex(QUAY_L * k, 0)
  p.vertex((end - 0.05) * k, 0)
  p.vertex((end + 0.06) * k, 0.07 * k)
  p.vertex((end - 0.08) * k, 0.18 * k)
  p.vertex((end + 0.02) * k, 0.3 * k)
  p.vertex((end - 0.18) * k, DECK * k)
  p.vertex(QUAY_L * k, DECK * k)
  p.endShape(p.CLOSE)
  // Its wet top.
  p.stroke(rgba(RAIN.streetWet, 0.9))
  p.strokeWeight(Math.max(1, 0.05 * k))
  p.line(QUAY_L * k, 0.03 * k, (end - 0.08) * k, 0.03 * k)
  p.noStroke()
}

/** The bridge's railing along the deck's near edge, bent out and down where it gives at the broken end. */
export function drawRailing(pen: Pen, f: View): void {
  const { p, k, ink } = pen
  if (!seen(f, QUAY_L, 1, -1.2, 0.2)) return
  const end = RAIN_GEO.deckEnd
  const top = -0.82
  const x0 = Math.max(QUAY_L, f.x0 - 1)
  const x1 = Math.min(end - 0.9, f.x1 + 1)
  const col = mixHex(RAIN.steel, ink, 0.2)
  p.stroke(col)
  p.strokeWeight(Math.max(0.9, 0.05 * k))
  const first = Math.ceil(x0 / 0.8) * 0.8
  for (let x = first; x <= x1; x += 0.8) p.line(x * k, 0, x * k, top * k)
  p.strokeWeight(Math.max(1, 0.07 * k))
  p.line(x0 * k, top * k, x1 * k, top * k)
  p.strokeWeight(Math.max(0.8, 0.04 * k))
  p.line(x0 * k, (top * 0.5) * k, x1 * k, (top * 0.5) * k)
  if (f.x1 > end - 2) {
    // The last length, torn loose: it hangs out over the gap.
    p.noFill()
    p.strokeWeight(Math.max(1, 0.07 * k))
    p.bezier((end - 0.9) * k, top * k, (end - 0.4) * k, top * k, (end + 0.1) * k, (top + 0.15) * k, (end + 0.35) * k, (top + 0.7) * k)
    p.strokeWeight(Math.max(0.8, 0.04 * k))
    p.bezier((end - 0.9) * k, (top * 0.5) * k, (end - 0.5) * k, (top * 0.5) * k, (end - 0.1) * k, (top * 0.4) * k, (end + 0.1) * k, 0.15 * k)
    p.strokeWeight(Math.max(0.9, 0.05 * k))
    p.line((end - 0.1) * k, 0, (end + 0.05) * k, (top + 0.2) * k)
  }
  p.noStroke()
}
