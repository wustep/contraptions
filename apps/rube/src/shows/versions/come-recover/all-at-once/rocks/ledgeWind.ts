import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { hash, smooth, type Frame } from '../kit'
import { ROCKS } from '../worlds'
import { rgba } from './ledgeLand'
import type { Light } from './ledgeLight'

/**
 * What the wind moves in the canyon, the one thing that is never still in the silence: a bank of cloud lower and
 * nearer than the high streaks, sliding across slower than they drift, as far things do; the cloud's shadows going
 * over the far walls; and sand lifting off a far rim in the gusts and blowing out over the drop. Nothing else moves
 * here: this is the universe where life never formed, so no bird crosses its sky and nothing grows at its rim.
 *
 * They are in the canyon's own perspective (`paintSlices`), so they keep their distance when the camera draws back.
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

/* ------------------------------------------------------------------ the cloud's shadows */

/** How far apart the shadows lie along a wall, in its own cells, before some are left out for the gaps in the cloud. */
const SHADE_PERIOD = 60
/** How fast they go over the land, in its cells a second: the wind down at the cloud that casts them, nearer than the banks. */
const SHADE_DRIFT = 3

/**
 * The shadows of the cloud going over the far walls on the same wind: wide, rounded patches of shade, laid on each
 * slice in its own cells and sliding at the same speed over each, so a nearer wall's shadows cross the frame faster than
 * a farther one's and the canyon's depth shows in how they move. Thin shade, flat, with a paler rim for the soft edge
 * a shadow has from so high; under the haze, so the far ones are fainter. As the sun goes low the walls go into their
 * own shade and the shadows go with the light. `paintSlices` clips it to the slice (`map`, scale `s`).
 */
export function paintShade(p: p5, k: number, f: Frame, t: number, i: number, s: number, map: (q: Pt) => Pt, light: Light): void {
  const ctx = p.drawingContext as Ctx2D
  // How near the slice is (its depth, back from its scale): the nearer, the darker its shadows, as with its grade.
  const Z = f.y1 - f.y0
  const near = Math.min(1, (2.2 * 12) / (12 + Z / s - Z))
  const a = (0.1 + 0.22 * near) * (1 - light.dusk)
  if (a < 0.01) return
  const drift = SHADE_DRIFT * (t - 200)
  const lx0 = f.cx + (f.x0 - f.cx) / s
  const lx1 = f.cx + (f.x1 - f.cx) / s
  const ly0 = f.cy + (f.y0 - f.cy) / s
  const ly1 = f.cy + (f.y1 - f.cy) / s
  // Only the part of the slice that is rock: above its rim is sky.
  if (ly1 < 0) return
  const col = mixHex(ROCKS.canyonShade, light.haze, 0.2)
  for (let n = Math.floor((lx0 - drift - 40) / SHADE_PERIOD); n <= Math.floor((lx1 - drift + 40) / SHADE_PERIOD); n++) {
    // A gap in the cloud.
    if (hash(n, i, 85) < 0.3) continue
    const cx = drift + (n + 0.5 * hash(n, i, 81)) * SHADE_PERIOD
    const cy = 6 + 22 * hash(n, i, 83)
    const L = 26 + 22 * hash(n, i, 87)
    const H = 5 + 5 * hash(n, i, 89)
    if (cx + L < lx0 || cx - L > lx1 || cy + 2 * H < ly0 || cy - 2 * H > ly1) continue
    const p1 = 6.3 * hash(n, i, 91)
    const p2 = 6.3 * hash(n, i, 93)
    for (const [grow, alpha] of [[1.18, 0.45], [1, 1]] as const) {
      ctx.beginPath()
      for (let j = 0; j < 36; j++) {
        // A rounded, lumpy patch, as the cloud that casts it: a few slow swells round its edge.
        const th = (j / 36) * Math.PI * 2
        const r = grow * (1 + 0.16 * Math.sin(3 * th + p1) + 0.08 * Math.sin(5 * th + p2))
        const [x, y] = map([cx + Math.cos(th) * L * 0.5 * r, cy + Math.sin(th) * H * r])
        if (j === 0) ctx.moveTo(x * k, y * k)
        else ctx.lineTo(x * k, y * k)
      }
      ctx.closePath()
      ctx.fillStyle = rgba(col, a * alpha)
      ctx.fill()
    }
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
