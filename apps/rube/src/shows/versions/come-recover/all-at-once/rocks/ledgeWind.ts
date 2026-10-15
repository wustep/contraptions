import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { depth, hash, smooth, type Frame } from '../kit'
import { ROCKS } from '../worlds'
import { INK, rgba } from './ledgeLand'
import type { Light } from './ledgeLight'
import { E_GO } from './ledgePath'

/**
 * What the wind moves in the canyon, the one thing that is never still in the silence: a bank of cloud lower and
 * nearer than the high streaks, sliding across slower than they drift, as far things do; sand lifting off a far rim
 * in the gusts and blowing out over the drop; two birds circling far off over the canyon, one after the other; and,
 * nearest of all, dry grass at the rim's edge, between the camera and the two stones, bending in the same gusts.
 *
 * The far things are in the canyon's own perspective (`paintSlices`), so they keep their distance when the camera
 * draws back; the grass is near, in front of the rim (`depth`), and is only there while the camera is on the rim
 * close up.
 */

type Ctx2D = CanvasRenderingContext2D

/** The wind's strength at `t`, 0..1: a slow swell with gusts in it, the same everywhere in the canyon. */
export function wind(t: number): number {
  const v = 0.5 + 0.28 * Math.sin(t * 0.37 + 0.6) + 0.16 * Math.sin(t * 0.91 + 1.3) + 0.06 * Math.sin(t * 2.3)
  return Math.max(0, Math.min(1, v))
}

/* ------------------------------------------------------------------ cloud banks */

/** How far behind the stage the banks are, in cells: nearer than the horizon, far beyond the canyon. */
export const BANK_D = 520
/** The banks, in their own cells at that depth: centre, length, height, and how lumpy. */
const BANKS: { x: number; y: number; l: number; h: number; seed: number }[] = [
  { x: -250, y: -110, l: 230, h: 20, seed: 1 },
  { x: -60, y: -70, l: 170, h: 15, seed: 2 },
  { x: 60, y: -185, l: 260, h: 22, seed: 3 },
  { x: 190, y: -95, l: 190, h: 16, seed: 4 },
  { x: 330, y: -150, l: 210, h: 18, seed: 5 },
  { x: -170, y: -215, l: 170, h: 14, seed: 6 },
  { x: 460, y: -80, l: 160, h: 13, seed: 7 },
]
/** How fast the banks slide on the wind, in their own cells a second. */
const BANK_DRIFT = 1.1

/**
 * A bank of cloud: a long, low lens, flat underneath, its top in two or three gentle swells; its underside a band
 * that goes warm as the sun goes down and lights it from below. Thin paint, no gradient, so the sky shows through it
 * as through the high streaks, and it is drawn as the rest of the canyon is.
 */
export function paintBanks(p: p5, k: number, f: Frame, t: number, light: Light): void {
  const ctx = p.drawingContext as Ctx2D
  const Z = f.y1 - f.y0
  const s = Z / (Z + BANK_D)
  const map = (x: number, y: number): Pt => [f.cx + (x - f.cx) * s, f.cy + (y - f.cy) * s]
  for (const b of BANKS) {
    const bx = b.x + BANK_DRIFT * (t - 200)
    const [cx, cy] = map(bx, b.y)
    const L = b.l * s
    const H = b.h * s
    if (cx + L < f.x0 || cx - L > f.x1 || cy + H < f.y0 || cy - 2 * H > f.y1) continue
    const n = 30
    const top = (u: number) => {
      // A lens, fuller toward its head (the left, upwind), with a couple of swells along it.
      const env = Math.pow(Math.sin(Math.PI * u), 0.7) * (1.15 - 0.4 * u)
      const swell = 1 + 0.22 * Math.sin(u * (5 + 3 * hash(b.seed, 9)) + b.seed) + 0.12 * Math.sin(u * 13 + b.seed * 2)
      return H * env * swell
    }
    ctx.beginPath()
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const x = cx - L / 2 + L * u
      if (j === 0) ctx.moveTo(x * k, (cy - top(u)) * k)
      else ctx.lineTo(x * k, (cy - top(u)) * k)
    }
    for (let j = n; j >= 0; j--) {
      const u = j / n
      ctx.lineTo((cx - L / 2 + L * u) * k, (cy + H * 0.12 * Math.sin(Math.PI * u)) * k)
    }
    ctx.closePath()
    ctx.fillStyle = rgba(light.cloud, 0.42)
    ctx.fill()
    // Its underside: a band along the flat, lit from below as the sun goes down.
    ctx.beginPath()
    for (let j = 2; j <= n - 2; j++) {
      const u = j / n
      const x = cx - L / 2 + L * u
      const y = cy - Math.min(top(u), H * 0.3)
      if (j === 2) ctx.moveTo(x * k, y * k)
      else ctx.lineTo(x * k, y * k)
    }
    for (let j = n - 2; j >= 2; j--) {
      const u = j / n
      ctx.lineTo((cx - L / 2 + L * u) * k, (cy + H * 0.12 * Math.sin(Math.PI * u)) * k)
    }
    ctx.closePath()
    ctx.fillStyle = rgba(light.cloudUnder, 0.2 + 0.35 * light.gold + 0.25 * light.dusk)
    ctx.fill()
  }
}

/* ------------------------------------------------------------------ dust off a far rim */

/** The far rim the sand blows off: slice 2's near rim (`buildLand`), in its own cells. */
const DUST_RIM: Pt = [16, -0.1]
const DUST_PERIOD = 6.5

/**
 * Sand lifting off the far rim in the gusts and going out over the drop on the wind: thin streamers that rise a
 * little, lengthen and thin away. In the slice's perspective (`map`, scale `s`). Only while the camera is up on the
 * rim, where the wind is; down in the gorge it is still.
 */
export function paintDust(p: p5, k: number, f: Frame, t: number, s: number, map: (q: Pt) => Pt): void {
  const up = 1 - smooth(f.cy, 2, 4)
  if (up <= 0) return
  const ctx = p.drawingContext as Ctx2D
  const col = mixHex(ROCKS.sand, ROCKS.canyon, 0.25)
  const n = 7
  for (let i = 0; i < n; i++) {
    const born = t - ((i / n) * DUST_PERIOD + hash(i, 61) * 0.6)
    const cycle = Math.floor(born / DUST_PERIOD)
    const a = born / DUST_PERIOD - cycle
    // How hard it was blowing when this one lifted.
    const g = wind(t - a * DUST_PERIOD)
    const strength = Math.max(0, (g - 0.35) / 0.65)
    if (strength <= 0.02) continue
    const j = hash(i, cycle, 62)
    const x = DUST_RIM[0] - 0.5 + j * 1.5 + a * (16 + 8 * g)
    const y = DUST_RIM[1] - a * (2.2 + 1.6 * j) + 0.8 * Math.sin(a * 3 + i)
    const [px, py] = map([x, y])
    const rx = (2 + 11 * a) * s
    const ry = (0.28 + 0.9 * a) * s
    const alpha = 0.34 * Math.sin(Math.PI * a) * strength * up
    ctx.fillStyle = rgba(col, alpha)
    for (let q = 0; q < 3; q++) {
      ctx.beginPath()
      ctx.ellipse((px - q * rx * 0.55) * k, (py + q * ry * 0.3) * k, rx * (1 - 0.2 * q) * k, ry * (1 - 0.2 * q) * k, -0.08, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/* ------------------------------------------------------------------ the birds */

/** Where they circle, in their own cells, and how far behind the stage: over the canyon, a little above its rim. */
const CIRCLE = { x: 24, y: -6, rx: 9, ry: 1.8, D: 90, period: 17 }
/** The second keeps after the first, this far behind round the circle. */
const AFTER = 0.75

/**
 * Two birds circling far off over the canyon, on the warm air off its walls: dark specks, one following the other
 * round the same slow circle, gliding, now and then a few beats of the wings. In the canyon's perspective at their
 * depth, so they stay far off however the camera moves; they are behind the nearest slice and the wall.
 */
export function paintBirds(p: p5, k: number, f: Frame, t: number, light: Light): void {
  const ctx = p.drawingContext as Ctx2D
  const Z = f.y1 - f.y0
  const s = Z / (Z + CIRCLE.D)
  const col = mixHex(mixHex(INK, light.haze, 0.38), INK, 0.4 * light.dusk)
  for (let b = 0; b < 2; b++) {
    const a = ((t - 200) / CIRCLE.period) * Math.PI * 2 - b * AFTER
    // The circle drifts slowly downwind.
    const cx = CIRCLE.x + 0.08 * (t - 200)
    const x = cx + CIRCLE.rx * Math.cos(a)
    const y = CIRCLE.y + CIRCLE.ry * Math.sin(a) + 0.35 * Math.sin(a * 2 + b)
    const px = f.cx + (x - f.cx) * s
    const py = f.cy + (y - f.cy) * s
    const span = 2.4 * s * (b === 0 ? 1 : 0.88)
    if (px < f.x0 - span || px > f.x1 + span || py < f.y0 - span || py > f.y1 + span) continue
    // Heading: along the circle; seen from the side, nearer half of the round is a little larger.
    const dir = -Math.sin(a) >= 0 ? 1 : -1
    const near = 1 + 0.08 * Math.sin(a)
    // Gliding, wings set in a shallow vee; a few beats every so often.
    const flapping = (t + b * 2.3) % 7.5 < 0.9
    const beat = flapping ? Math.sin((t + b) * 13) : 0
    const lift = 0.18 + 0.32 * beat
    const w = span * near * 0.5
    ctx.strokeStyle = col
    ctx.lineWidth = Math.max(1, w * k * 0.16)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo((px - w) * k, (py - w * lift) * k)
    ctx.quadraticCurveTo((px - w * 0.45) * k, (py - w * (lift + 0.18)) * k, px * k, py * k)
    ctx.quadraticCurveTo((px + w * 0.45) * k, (py - w * (lift + 0.18)) * k, (px + w) * k, (py - w * lift) * k)
    ctx.stroke()
    // The body, a dab, toward its head.
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.ellipse((px + dir * w * 0.06) * k, (py + w * 0.02) * k, w * 0.2 * k, w * 0.08 * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/* ------------------------------------------------------------------ grass at the rim */

/** Where the camera looks at the two stones on the rim: the grass is laid for this framing. */
const RIM_EYE: Pt = [0.25, -0.25]
/** How much faster than the rim it moves: it is between the camera and the rim. */
const NEAR = 1.4
/**
 * Tufts along the rim's near edge, in the layer's own cells across; how tall each is as a share of the frame's
 * height, how many blades, and which way it leans. None under the lip, where the two of them go over.
 */
const TUFTS: { x: number; h: number; n: number; lean: number }[] = [
  { x: -3.3, h: 0.16, n: 7, lean: -0.1 },
  { x: -2.55, h: 0.22, n: 9, lean: 0.05 },
  { x: -1.75, h: 0.13, n: 6, lean: 0 },
  { x: -1.05, h: 0.18, n: 8, lean: 0.06 },
  { x: 1.45, h: 0.19, n: 8, lean: 0.08 },
  { x: 2.15, h: 0.24, n: 10, lean: 0 },
  { x: 2.85, h: 0.15, n: 7, lean: -0.05 },
  { x: 3.6, h: 0.21, n: 9, lean: 0.06 },
]

/**
 * Dry grass along the rim's edge nearest the camera: big, because near, rising from below the frame's foot under the
 * two stones and never up to them, each blade bending in the wind's gusts, the tips most. Straw in the noon light,
 * gold in the late, darker than the sunlit rim behind it. Only while the camera is close on the rim: it goes as the
 * camera draws back or goes over the brink, and comes back when it does.
 */
export function paintGrass(p: p5, k: number, t: number, weight: number, light: Light): void {
  const ctx = p.drawingContext as Ctx2D
  depth(p, k, NEAR, RIM_EYE, (fr) => {
    const H = fr.y1 - fr.y0
    // Close on the rim, and still up there.
    const here = (1 - smooth(H, 3.9, 5.2)) * (1 - smooth((fr.cy - RIM_EYE[1]) / NEAR, 0.25, 0.7)) * (t < E_GO + 0.4 ? 1 : 1 - smooth(t, E_GO + 0.4, E_GO + 1.2))
    if (here <= 0.01) return
    const g = wind(t)
    const straw = mixHex(mixHex('#B39A6C', '#C99251', 0.5 * light.gold), '#9A6B52', 0.45 * light.dusk)
    const shade = mixHex(straw, ROCKS.stoneDeep, 0.5)
    // Their roots below the frame's foot, wherever it is: near, they are as big as the frame says.
    const base = fr.y1 + 0.04 * H
    ctx.save()
    ctx.globalAlpha = here
    ctx.lineWidth = Math.max(0.5, weight * 0.4)
    ctx.strokeStyle = rgba(INK, 0.4)
    for (const [ti, tf] of TUFTS.entries()) {
      const reach = tf.h * H
      if (tf.x + reach < fr.x0 || tf.x - reach > fr.x1) continue
      for (let i = 0; i < tf.n; i++) {
        const u = tf.n === 1 ? 0.5 : i / (tf.n - 1)
        const spread = (u - 0.5) * 0.9 + tf.lean
        const h = reach * (0.55 + 0.45 * hash(ti, i, 83)) * (1 - 0.35 * Math.abs(u - 0.5))
        const flutter = 0.025 * h * Math.sin(t * (4 + 2 * hash(ti, i, 84)) + i)
        // Downwind (to the right), more in the gusts; a blade bends from its root, its tip most.
        const bend = (0.12 + 0.34 * g) * h + flutter
        const x0 = tf.x + (u - 0.5) * 0.04 * H
        const tipX = x0 + spread * h * 0.55 + bend
        const tipY = base - h * (1 - 0.2 * Math.abs(spread)) + Math.abs(bend) * 0.3
        const midX = x0 + spread * h * 0.25 + bend * 0.25
        const midY = base - h * 0.55
        const wb = (0.006 + 0.004 * hash(ti, i, 85)) * H
        ctx.fillStyle = i % 3 === 1 ? shade : straw
        ctx.beginPath()
        ctx.moveTo((x0 - wb) * k, base * k)
        ctx.quadraticCurveTo((midX - wb * 0.6) * k, midY * k, tipX * k, tipY * k)
        ctx.quadraticCurveTo((midX + wb * 0.6) * k, midY * k, (x0 + wb) * k, base * k)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    }
    ctx.restore()
  })
}
