import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { frame, hash } from '../kit'
import { HOUSE } from '../worlds'
import { SEAM } from '../music'
import { FLOOR, lightAt, ss, type Light } from './time'

/**
 * The room: one long room of dark concrete and pale oak whose whole side is a long window over the lake. We see it in
 * section, the window wall behind the action: the concrete above the glass, the glass down to the floor, the floor in
 * front. Through the glass: the grey lake, fog lying on the water, the far shore's pines, low hills, a strip of sky.
 *
 * Everything is drawn straight on the canvas's context, in pixels from world cells times `k`.
 */

type Ctx = CanvasRenderingContext2D

/** The window: its head (the concrete's lower edge), its ends, and the mullions between its panes. */
export const HEAD = -1.34
export const WIN_X: [number, number] = [-8.6, 9.6]
export const MULLIONS = [-6.1, -1.6, 2.9, 7.4]
const MULL_W = 0.045
/** Where the view's far shore meets the water, and the near bank's top, in world cells at the first frame's camera. */
const SHORE = -0.6
const BANK = -0.04
/** The first frame's camera centre: the view is drawn as it is seen from there, and slides a little as the camera moves. */
const REF: Pt = [1.05, -0.95]
const PAR_FAR = 0.78
const PAR_MID = 0.6
/** Where the light comes up over the far shore (view x at the first frame's camera): just past the cradle's hood. */
const SUN_X = 2.15

/** A weighted blend of colours (each a palette colour or a mix of two). */
function blend(ws: number[], cs: string[]): string {
  let r = 0
  let g = 0
  let b = 0
  let sum = 0
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i]
    if (w <= 1e-4) continue
    const h = cs[i].replace('#', '')
    r += w * parseInt(h.slice(0, 2), 16)
    g += w * parseInt(h.slice(2, 4), 16)
    b += w * parseInt(h.slice(4, 6), 16)
    sum += w
  }
  const c = (v: number) => Math.round(v / (sum || 1)).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

type Mood = Record<'wallTop' | 'wallLow' | 'floor' | 'floorFar' | 'skyHigh' | 'skyLow' | 'hills' | 'pinesFar' | 'pines' | 'lakeFar' | 'lakeNear' | 'bank' | 'fog', string>
const H = HOUSE
/** The blue hour: the room dark, the window luminous and cool, fog white on the water. */
const PRE: Mood = {
  wallTop: mix(H.night, H.concrete, 0.05),
  wallLow: mix(H.night, H.wallShade, 0.24),
  floor: mix(H.night, H.floor, 0.3),
  floorFar: mix(H.night, H.floorDark, 0.3),
  skyHigh: mix(H.lakeDeep, H.night, 0.12),
  skyLow: mix(H.lake, H.lakeLight, 0.4),
  hills: mix(H.lakeDeep, H.lake, 0.35),
  pinesFar: mix(H.pines, H.lakeDeep, 0.35),
  pines: mix(H.pines, H.night, 0.2),
  lakeFar: mix(H.lake, H.lakeLight, 0.5),
  lakeNear: mix(H.lakeDeep, H.night, 0.12),
  bank: mix(H.grassDark, H.night, 0.62),
  fog: H.fog,
}
/** The morning: the sun low over the far shore, its light warm on the water and long across the floor. */
const MORN: Mood = {
  wallTop: mix(H.night, H.concrete, 0.34),
  wallLow: mix(H.night, H.wallShade, 0.72),
  floor: mix(H.floorDark, H.floor, 0.85),
  floorFar: mix(H.night, H.floorDark, 0.75),
  skyHigh: mix(H.day, H.lakeLight, 0.5),
  skyLow: mix(H.dawn, H.lamp, 0.55),
  hills: mix(H.hills, H.lamp, 0.22),
  pinesFar: mix(H.pinesFar, H.hills, 0.3),
  pines: mix(H.pines, H.pinesFar, 0.25),
  lakeFar: mix(H.lakeLight, H.lamp, 0.4),
  lakeNear: mix(H.lake, H.lakeDeep, 0.25),
  bank: mix(H.grass, H.grassDark, 0.55),
  fog: mix(H.fog, H.lamp, 0.35),
}
/** An overcast day: flat, cool, the far shore grey in the fog. */
const GREY: Mood = {
  wallTop: mix(H.night, H.concrete, 0.24),
  wallLow: mix(H.night, H.wallShade, 0.58),
  floor: mix(H.night, H.floor, 0.62),
  floorFar: mix(H.night, H.floorDark, 0.55),
  skyHigh: mix(H.wallShade, H.day, 0.55),
  skyLow: mix(H.fog, H.dawn, 0.5),
  hills: mix(H.hills, H.fog, 0.5),
  pinesFar: mix(H.pinesFar, H.fog, 0.4),
  pines: mix(H.pines, H.pinesFar, 0.55),
  lakeFar: mix(H.lakeLight, H.fog, 0.45),
  lakeNear: mix(H.lake, H.wallShade, 0.45),
  bank: mix(H.grassDark, H.pinesFar, 0.45),
  fog: H.fog,
}
/** Night: the glass dark blue, the far shore black. */
const NIGHT: Mood = {
  wallTop: mix(H.night, H.mullion, 0.35),
  wallLow: mix(H.night, H.concrete, 0.07),
  floor: mix(H.night, H.floor, 0.1),
  floorFar: mix(H.night, H.floorDark, 0.08),
  skyHigh: mix(H.night, H.lakeDeep, 0.3),
  skyLow: mix(H.night, H.lakeDeep, 0.5),
  hills: mix(H.night, H.lakeDeep, 0.3),
  pinesFar: mix(H.night, H.pines, 0.4),
  pines: mix(H.night, H.mullion, 0.3),
  lakeFar: mix(H.night, H.lakeDeep, 0.45),
  lakeNear: mix(H.night, H.lakeDeep, 0.18),
  bank: H.night,
  fog: mix(H.night, H.fog, 0.18),
}
const MOODS = [PRE, MORN, GREY, NIGHT]

/** The room's colours for a light. */
export function roomColors(L: Light): Mood {
  const ws = [L.pre, L.morn, L.grey, L.night]
  const out = {} as Mood
  for (const key of Object.keys(PRE) as (keyof Mood)[]) out[key] = blend(ws, MOODS.map((m) => m[key]))
  return out
}

/* ------------------------------------------------------------------ the far shore */

interface Pine {
  x: number
  h: number
  w: number
  s: number
}
function pinesOf(seed: number, x0: number, x1: number, step: number, hMin: number, hMax: number): Pine[] {
  const out: Pine[] = []
  let x = x0
  let i = 0
  while (x < x1) {
    const a = hash(i, seed, 1)
    const b = hash(i, seed, 2)
    // Stands and gaps: the shore's pines come in clumps.
    const clump = 0.5 + 0.5 * Math.sin(x * 0.9 + seed) * Math.sin(x * 0.37 + seed * 2) + 0.25 * Math.sin(x * 2.3 + seed * 3)
    // Now and then one far taller than its neighbours; in the gaps between stands, only low ones.
    const tall = hash(i, seed, 6) > 0.9 ? 1.35 : 1
    const h = (hMin + (hMax - hMin) * a ** 1.4) * (0.35 + 0.8 * Math.max(0, Math.min(1.2, clump))) * tall
    out.push({ x: x + (b - 0.5) * step * 0.6, h, w: h * (0.26 + 0.1 * hash(i, seed, 3)), s: hash(i, seed, 4) })
    x += step * (0.6 + 0.8 * hash(i, seed, 5))
    i++
  }
  return out
}
const FAR_PINES = pinesOf(11, -16, 18, 0.034, 0.1, 0.24)
const NEAR_PINES = pinesOf(23, -16, 18, 0.045, 0.18, 0.42)

/** A pine's outline: a narrow spire of ragged tiers, base at (x, y). */
function pinePath(ctx: Ctx, k: number, t: Pine, x: number, y: number, dir = -1): void {
  const tiers = 5
  const H = t.h * k
  const W = t.w * k
  const X = x * k
  const Y = y * k
  ctx.moveTo(X - W * 0.12, Y)
  // Up the left side, tier by tier, then down the right.
  for (let i = 0; i < tiers; i++) {
    const u0 = i / tiers
    const u1 = (i + 1) / tiers
    const wOut = W * 0.5 * (1 - u0) ** 0.9 * (0.85 + 0.3 * hash(i, Math.floor(t.s * 999), 7))
    ctx.lineTo(X - wOut, Y + dir * H * (u0 + 0.12 / tiers))
    ctx.lineTo(X - wOut * 0.35, Y + dir * H * u1 * 0.98)
  }
  ctx.lineTo(X, Y + dir * H)
  for (let i = tiers - 1; i >= 0; i--) {
    const u0 = i / tiers
    const u1 = (i + 1) / tiers
    const wOut = W * 0.5 * (1 - u0) ** 0.9 * (0.85 + 0.3 * hash(i, Math.floor(t.s * 999), 8))
    ctx.lineTo(X + wOut * 0.35, Y + dir * H * u1 * 0.98)
    ctx.lineTo(X + wOut, Y + dir * H * (u0 + 0.12 / tiers))
  }
  ctx.lineTo(X + W * 0.12, Y)
  ctx.closePath()
}

/**
 * A shore of pines: a band along the water whose top is `base(v)` above it, with the trees' spires standing up out of
 * it, all one shape (filled once). `v` is the shore's own x (before the view slides by `off`); `grow(v)` scales the
 * trees (0 leaves the shore bare there).
 */
function forest(ctx: Ctx, k: number, trees: Pine[], off: number, gx0: number, gx1: number, y: number, base: (v: number) => number, grow: (v: number) => number, color: string): void {
  ctx.beginPath()
  ctx.moveTo((gx0 - 0.1) * k, (y + 0.02) * k)
  for (let x = gx0 - 0.1; x <= gx1 + 0.15; x += 0.05) {
    const v = x - off
    const g = grow(v)
    ctx.lineTo(x * k, (y - Math.max(0, base(v)) * Math.min(1, g * 3)) * k)
  }
  ctx.lineTo((gx1 + 0.15) * k, (y + 0.02) * k)
  ctx.closePath()
  for (const t of trees) {
    const x = t.x + off
    if (x < gx0 - 0.3 || x > gx1 + 0.3) continue
    const g = grow(t.x)
    if (g < 0.05) continue
    pinePath(ctx, k, { ...t, h: t.h * g }, x, y - Math.max(0, base(t.x)) * Math.min(1, g * 3) + 0.01)
  }
  ctx.fillStyle = color
  ctx.fill('nonzero')
}

/* ------------------------------------------------------------------ the room */

/**
 * The room behind the action at show time T: the view through the glass, the concrete, the window's steel, and the
 * floor with the window's light on it. `shadows` are the things standing in the light (their outlines at rest on the
 * floor, world cells), whose shadows fall toward us.
 */
export function drawRoom(p: p5, k: number, T: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  const L = lightAt(T)
  const C = roomColors(L)
  const x0 = f.x0 - 0.5
  const x1 = f.x1 + 0.5
  const y0 = f.y0 - 0.5
  const y1 = f.y1 + 0.5
  const px = (v: number) => v * k
  ctx.save()

  // The glass, and through it the lake.
  const gx0 = Math.max(x0, WIN_X[0])
  const gx1 = Math.min(x1, WIN_X[1])
  if (gx1 > gx0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(px(gx0), px(HEAD), px(gx1 - gx0), px(FLOOR - HEAD))
    ctx.clip()
    drawView(ctx, k, T, L, C, f, gx0, gx1)
    ctx.restore()
  }

  // The concrete above the glass (and past its ends): dark overhead, lifted a little by the light at the head.
  const wall = ctx.createLinearGradient(0, px(Math.max(y0, HEAD - 3.2)), 0, px(HEAD))
  wall.addColorStop(0, C.wallTop)
  wall.addColorStop(0.72, mix(C.wallTop, C.wallLow, 0.45))
  wall.addColorStop(1, C.wallLow)
  ctx.fillStyle = wall
  ctx.fillRect(px(x0), px(y0), px(x1 - x0), px(HEAD - y0))
  if (x0 < WIN_X[0]) ctx.fillRect(px(x0), px(HEAD - 0.01), px(WIN_X[0] - x0), px(FLOOR - HEAD + 0.01))
  if (x1 > WIN_X[1]) ctx.fillRect(px(WIN_X[1]), px(HEAD - 0.01), px(x1 - WIN_X[1]), px(FLOOR - HEAD + 0.01))
  // The board-formed concrete: faint lifts where the boards met, never a line.
  for (let i = 1; i <= 7; i++) {
    const y = HEAD - i * 0.36
    if (y < y0 - 0.2) break
    const band = ctx.createLinearGradient(0, px(y - 0.05), 0, px(y + 0.05))
    band.addColorStop(0, rgba(C.wallLow, 0))
    band.addColorStop(0.5, rgba(C.wallLow, 0.07 * (1 - L.night)))
    band.addColorStop(1, rgba(C.wallLow, 0))
    ctx.fillStyle = band
    ctx.fillRect(px(x0), px(y - 0.05), px(x1 - x0), px(0.1))
  }
  // The window's light on the underside of the head: a soft band of the sky's colour, as if the concrete took it.
  const soffit = ctx.createLinearGradient(0, px(HEAD - 0.5), 0, px(HEAD))
  soffit.addColorStop(0, rgba(C.skyLow, 0))
  soffit.addColorStop(1, rgba(C.skyLow, 0.1 + 0.08 * L.amb))
  ctx.fillStyle = soffit
  ctx.fillRect(px(Math.max(x0, WIN_X[0])), px(HEAD - 0.5), px(Math.min(x1, WIN_X[1]) - Math.max(x0, WIN_X[0])), px(0.5))

  // The window's steel: the head, the sill, the mullions.
  const steel = mix(HOUSE.mullion, HOUSE.night, 0.3)
  ctx.fillStyle = steel
  ctx.fillRect(px(Math.max(x0, WIN_X[0])), px(HEAD), px(Math.min(x1, WIN_X[1]) - Math.max(x0, WIN_X[0])), px(0.035))
  ctx.fillRect(px(Math.max(x0, WIN_X[0])), px(FLOOR - 0.028), px(Math.min(x1, WIN_X[1]) - Math.max(x0, WIN_X[0])), px(0.028))
  for (const m of [WIN_X[0], ...MULLIONS, WIN_X[1]]) {
    if (m < x0 - 1 || m > x1 + 1) continue
    const w = m === WIN_X[0] || m === WIN_X[1] ? MULL_W * 2 : MULL_W
    ctx.fillRect(px(m - w / 2), px(HEAD), px(w), px(FLOOR - HEAD))
  }

  const fl = ctx.createLinearGradient(0, px(FLOOR), 0, px(FLOOR + 1.3))
  fl.addColorStop(0, C.floorFar)
  fl.addColorStop(1, C.floor)
  ctx.fillStyle = fl
  ctx.fillRect(px(x0), px(FLOOR), px(x1 - x0), px(Math.max(0.2, y1 - FLOOR)))
  ctx.restore()
}

function drawView(ctx: Ctx, k: number, T: number, L: Light, C: Mood, f: { cx: number; cy: number }, gx0: number, gx1: number): void {
  const px = (v: number) => v * k
  // The view slides with the camera, the far things more than the near (they are further off).
  const far = (f.cx - REF[0]) * PAR_FAR
  const mid = (f.cx - REF[0]) * PAR_MID
  const lift = (f.cy - REF[1]) * 0.35
  const shore = SHORE + lift
  const w = gx1 - gx0
  // Sky.
  const sky = ctx.createLinearGradient(0, px(HEAD), 0, px(shore - 0.3))
  sky.addColorStop(0, C.skyHigh)
  sky.addColorStop(1, C.skyLow)
  ctx.fillStyle = sky
  ctx.fillRect(px(gx0), px(HEAD), px(w), px(shore - HEAD + 0.1))
  const sunX = SUN_X + far
  const glowA = (0.62 + 0.2 * L.morn) * (1 - L.night) * (1 - 0.75 * L.grey)
  // Long soft streaks of cloud high in the sky.
  for (let i = 0; i < 5; i++) {
    const y = HEAD + 0.1 + 0.075 * i + 0.02 * Math.sin(i * 1.9)
    const len = 1.6 + 1.2 * hash(i, 9, 1)
    for (let j = -3; j <= 3; j++) {
      const cx = gx0 + (((j * 3.7 + i * 1.3 + far * 0.95 + T * 0.004) % 26) + 26) % 26 - 4
      if (cx < gx0 - len || cx > gx1 + len) continue
      ctx.save()
      ctx.translate(px(cx), px(y))
      ctx.scale(len / 0.05, 1)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, px(0.05))
      const c = mix(C.skyLow, HOUSE.glass, 0.3)
      g.addColorStop(0, rgba(c, (0.1 + 0.05 * i) * (1 - L.night) * (1 - 0.5 * L.grey)))
      g.addColorStop(1, rgba(c, 0))
      ctx.fillStyle = g
      ctx.fillRect(-px(0.05), -px(0.05), px(0.1), px(0.1))
      ctx.restore()
    }
  }
  // The hills behind the far shore: two long low swells.
  ctx.beginPath()
  ctx.moveTo(px(gx0), px(shore + 0.02))
  for (let x = gx0; x <= gx1 + 0.2; x += 0.2) {
    const v = x - far
    const h = 0.24 + 0.1 * Math.sin(v * 0.42 + 0.7) + 0.06 * Math.sin(v * 1.13 + 2.1) + 0.03 * Math.sin(v * 2.9)
    ctx.lineTo(px(x), px(shore - h))
  }
  ctx.lineTo(px(gx1 + 0.2), px(shore + 0.02))
  ctx.closePath()
  ctx.fillStyle = C.hills
  ctx.fill()
  // A haze over the hills' feet, so the pines stand out of it.
  const haze = ctx.createLinearGradient(0, px(shore - 0.3), 0, px(shore))
  haze.addColorStop(0, rgba(C.fog, 0))
  haze.addColorStop(1, rgba(C.fog, 0.55 * L.fog * (1 - L.night)))
  ctx.fillStyle = haze
  ctx.fillRect(px(gx0), px(shore - 0.3), px(w), px(0.3))
  // The far shore's forest: a dark band of pines along the water, their spires ragged against the hills, then a
  // nearer headland's, darker.
  forest(ctx, k, FAR_PINES, far, gx0, gx1, shore + 0.012, (v) => 0.045 + 0.03 * Math.sin(v * 0.7 + 1) + 0.02 * Math.sin(v * 2.1), () => 1, C.pinesFar)
  const HEADS: [number, number][] = [
    [2.4, 7.2],
    [-9.4, -4.4],
  ]
  const headland = (v: number): number => {
    let best = 0
    for (const [a, b] of HEADS) {
      if (v <= a || v >= b) continue
      const u = (v - a) / (b - a)
      best = Math.max(best, Math.sin(Math.PI * u) ** 0.6)
    }
    return best
  }
  forest(ctx, k, NEAR_PINES, mid, gx0, gx1, shore + 0.045, (v) => 0.1 * headland(v) - 0.02, (v) => headland(v), C.pines)
  // The lake: bright under the far shore where it holds the sky, darker toward us.
  const lake = ctx.createLinearGradient(0, px(shore), 0, px(FLOOR))
  lake.addColorStop(0, C.lakeFar)
  lake.addColorStop(0.45, mix(C.lakeFar, C.lakeNear, 0.55))
  lake.addColorStop(1, C.lakeNear)
  ctx.fillStyle = lake
  ctx.fillRect(px(gx0), px(shore), px(w), px(FLOOR - shore))
  // The shore's reflection: a soft dark under the far forest, fading down into the water.
  const refl = ctx.createLinearGradient(0, px(shore), 0, px(shore + 0.16))
  refl.addColorStop(0, rgba(C.pinesFar, 0.5 * (1 - 0.5 * L.fog)))
  refl.addColorStop(1, rgba(C.pinesFar, 0))
  ctx.fillStyle = refl
  ctx.fillRect(px(gx0), px(shore), px(w), px(0.16))
  // A long bright calm on the water, where the light comes from.
  const calm = ctx.createLinearGradient(0, px(shore + 0.1), 0, px(shore + 0.22))
  calm.addColorStop(0, rgba(C.skyLow, 0))
  calm.addColorStop(0.5, rgba(C.skyLow, 0.35 * (0.4 + L.warm) * (1 - L.night)))
  calm.addColorStop(1, rgba(C.skyLow, 0))
  ctx.fillStyle = calm
  ctx.fillRect(px(gx0), px(shore + 0.1), px(w), px(0.12))
  // Fog lying on the water: long soft banks drifting very slowly.
  if (L.night < 0.8) {
    for (let i = 0; i < 7; i++) {
      const y = shore + 0.02 + 0.1 * i + 0.03 * Math.sin(i * 2.3)
      const len = 2.2 + 1.6 * hash(i, 3, 1)
      const drift = ((T * (0.018 + 0.01 * hash(i, 3, 2)) + hash(i, 3, 3) * 9) % 9) - 4.5
      for (let j = -2; j <= 2; j++) {
        const cx = gx0 + ((((j * 4.6 + drift + far * 0.8 + i * 1.7) % 23) + 23) % 23) - 3
        if (cx < gx0 - len || cx > gx1 + len) continue
        ctx.save()
        ctx.translate(px(cx), px(y))
        ctx.scale(len / 0.09, 1)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, px(0.09))
        const a = (0.42 - 0.04 * i) * L.fog * (1 - L.night)
        g.addColorStop(0, rgba(C.fog, a))
        g.addColorStop(1, rgba(C.fog, 0))
        ctx.fillStyle = g
        ctx.fillRect(-px(0.09), -px(0.09), px(0.18), px(0.18))
        ctx.restore()
      }
    }
    // A general mist over the far water and shore.
    const mist = ctx.createLinearGradient(0, px(shore - 0.35), 0, px(shore + 0.4))
    mist.addColorStop(0, rgba(C.fog, 0))
    mist.addColorStop(0.5, rgba(C.fog, 0.3 * L.fog))
    mist.addColorStop(1, rgba(C.fog, 0))
    ctx.fillStyle = mist
    ctx.fillRect(px(gx0), px(shore - 0.35), px(w), px(0.75))
  }
  // Where the light is coming up, over the far shore just past the cradle's hood: a wide brightness in the haze, no
  // core, and its path across the water toward us.
  if (glowA > 0.01) {
    const warm = mix(HOUSE.glass, HOUSE.lamp, 0.16 + 0.55 * L.morn)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.save()
    ctx.translate(px(sunX), px(shore - 0.2))
    ctx.scale(3.4, 1)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, px(0.62))
    g.addColorStop(0, rgba(warm, 0.9 * glowA))
    g.addColorStop(0.35, rgba(warm, 0.5 * glowA))
    g.addColorStop(0.7, rgba(warm, 0.14 * glowA))
    g.addColorStop(1, rgba(warm, 0))
    ctx.fillStyle = g
    ctx.fillRect(-px(0.62), -px(0.62), px(1.24), px(1.24))
    ctx.restore()
    const top = shore + 0.03
    const col = ctx.createLinearGradient(0, px(top), 0, px(BANK + 0.03))
    col.addColorStop(0, rgba(warm, 0.7 * glowA))
    col.addColorStop(0.55, rgba(warm, 0.25 * glowA))
    col.addColorStop(1, rgba(warm, 0))
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(px(sunX - 0.3), px(top))
    ctx.lineTo(px(sunX + 0.3), px(top))
    ctx.lineTo(px(sunX + 0.75), px(BANK + 0.03))
    ctx.lineTo(px(sunX - 0.75), px(BANK + 0.03))
    ctx.closePath()
    ctx.filter = `blur(${Math.max(1, k * 0.12).toFixed(1)}px)`
    ctx.fill()
    ctx.restore()
  }
  // The near bank: the lawn's top falling away below the glass.
  ctx.beginPath()
  ctx.moveTo(px(gx0), px(FLOOR))
  for (let x = gx0; x <= gx1 + 0.25; x += 0.25) {
    const v = x - mid * 0.5
    ctx.lineTo(px(x), px(BANK + lift * 0.5 + 0.035 * Math.sin(v * 0.8) + 0.02 * Math.sin(v * 2.3 + 1)))
  }
  ctx.lineTo(px(gx1 + 0.25), px(FLOOR))
  ctx.closePath()
  ctx.fillStyle = C.bank
  ctx.fill()
  // The glass itself: a cool cast, and at night the room's own dark in it.
  ctx.fillStyle = rgba(HOUSE.glass, 0.05 + 0.04 * L.amb)
  ctx.fillRect(px(gx0), px(HEAD), px(w), px(FLOOR - HEAD))
}

/**
 * The light on the floor: the sun through the panes, slanting toward us, what stands in it keeping it off the oak,
 * and a close shadow where each ball rests. Drawn over the floor's mirror.
 */
export function drawFloorLight(p: p5, k: number, T: number, shadows: Pt[][], balls: Pt[]): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  const L = lightAt(T)
  const C = roomColors(L)
  const px = (v: number) => v * k
  const x0 = f.x0 - 0.5
  const x1 = f.x1 + 0.5
  const gx0 = Math.max(x0, WIN_X[0])
  const gx1 = Math.min(x1, WIN_X[1])
  // The sun through the panes: a long soft light on the floor for each, slanting toward us.
  const SLANT = 0.55
  const LEN = 0.9
  if (L.sun > 0.01 && gx1 > gx0) {
    const panes = [WIN_X[0], ...MULLIONS, WIN_X[1]]
    const sun = mix(HOUSE.lamp, HOUSE.linen, 0.3)
    ctx.save()
    ctx.filter = `blur(${Math.max(1, k * 0.06).toFixed(1)}px)`
    for (let i = 0; i + 1 < panes.length; i++) {
      const a = panes[i] + 0.06
      const b = panes[i + 1] - 0.06
      if (b < x0 - 1 || a - SLANT * LEN > x1 + 1) continue
      const g = ctx.createLinearGradient(0, px(FLOOR), 0, px(FLOOR + LEN))
      g.addColorStop(0, rgba(sun, 0.26 * L.sun))
      g.addColorStop(0.6, rgba(sun, 0.1 * L.sun))
      g.addColorStop(1, rgba(sun, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(px(a), px(FLOOR))
      ctx.lineTo(px(b), px(FLOOR))
      ctx.lineTo(px(b - SLANT * LEN), px(FLOOR + LEN))
      ctx.lineTo(px(a - SLANT * LEN), px(FLOOR + LEN))
      ctx.closePath()
      ctx.fill()
    }
    // What stands in the light keeps it off the floor behind it: soft, faint shadows toward us.
    ctx.fillStyle = rgba(C.floorFar, 0.5 * L.sun)
    for (const outline of shadows) {
      ctx.beginPath()
      outline.forEach(([x, y], i) => {
        const h = FLOOR - Math.min(FLOOR, y)
        const sx = x - SLANT * h * 0.8
        const sy = FLOOR + h * 0.8
        if (i === 0) ctx.moveTo(px(sx), px(sy))
        else ctx.lineTo(px(sx), px(sy))
      })
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  // Where things touch the floor: a small close shadow, in any light.
  for (const [bx] of balls) {
    const g = ctx.createRadialGradient(px(bx), px(FLOOR + 0.01), 0, px(bx), px(FLOOR + 0.01), px(0.17))
    g.addColorStop(0, rgba(HOUSE.night, 0.4))
    g.addColorStop(1, rgba(HOUSE.night, 0))
    ctx.save()
    ctx.translate(px(bx), px(FLOOR + 0.01))
    ctx.scale(1, 0.28)
    ctx.translate(-px(bx), -px(FLOOR + 0.01))
    ctx.fillStyle = g
    ctx.fillRect(px(bx - 0.17), px(FLOOR - 0.16), px(0.34), px(0.34))
    ctx.restore()
  }
}

/**
 * The balls given back by the polished floor too. The mirror copies only what is drawn before them, so the cradle
 * stood in the oak and Louise and Ian on it did not: each now has a dim soft reflection under it, as faint as the
 * mirror's and fading into the oak. `balls` are each a ball's middle and its colour.
 */
export function drawBallMirror(p: p5, k: number, T: number, balls: [Pt, string][]): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  if (FLOOR > f.y1 || FLOOR < f.y0) return
  const L = lightAt(T)
  const C = roomColors(L)
  const a = 0.17 + 0.1 * L.morn - 0.07 * L.night
  ctx.save()
  // Soft by its gradient, not a blur filter (a filter is costly every frame): brightest just under the floor line, where
  // the ball meets its reflection, fading down and out to nothing at its rim.
  for (const [[x, y], color] of balls) {
    const r = FLOOR - y
    const cy = FLOOR + r
    const g = ctx.createRadialGradient(x * k, (FLOOR + 0.35 * r) * k, 0, x * k, cy * k, r * 1.05 * k)
    g.addColorStop(0, rgba(mix(color, C.floorFar, 0.2), a))
    g.addColorStop(0.55, rgba(mix(color, C.floorFar, 0.4), a * 0.55))
    g.addColorStop(1, rgba(mix(color, C.floorFar, 0.6), 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x * k, cy * k, r * 1.05 * k, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The polished floor gives back the window and what stands before it: everything already drawn above the floor line
 * (never the balls, which the stage draws after), turned over below it, soft, and fading into the oak.
 */
export function drawMirror(p: p5, k: number, T: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  const L = lightAt(T)
  const C = roomColors(L)
  const m = ctx.getTransform()
  // No mirror if the camera is turned (it never is here) or the floor is out of the frame.
  if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6 || FLOOR > f.y1 || FLOOR < f.y0) return
  const depth = Math.min(1.1, f.y1 - FLOOR + 0.05)
  const x0 = f.x0 - 0.1
  const x1 = f.x1 + 0.1
  // Device pixels of the band above the floor line that is given back.
  const dev = (x: number, y: number): [number, number] => [m.a * x * k + m.e, m.d * y * k + m.f]
  const [ax, ay] = dev(x0, FLOOR - depth)
  const [bx, by] = dev(x1, FLOOR)
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const sx = Math.max(0, Math.floor(ax))
  const sy = Math.max(0, Math.floor(ay))
  const sw = Math.min(cw, Math.ceil(bx)) - sx
  const sh = Math.min(ch, Math.ceil(by)) - sy
  if (sw <= 2 || sh <= 2) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 0.17 + 0.1 * L.morn - 0.07 * L.night
  ctx.filter = `blur(${Math.max(0.8, m.a * k * 0.02).toFixed(1)}px)`
  ctx.translate(0, 2 * Math.round(by))
  ctx.scale(1, -1)
  ctx.drawImage(ctx.canvas, sx, sy, sw, sh, sx, sy, sw, sh)
  ctx.restore()
  // The oak takes it back as it comes toward us.
  ctx.save()
  const fade = ctx.createLinearGradient(0, FLOOR * k, 0, (FLOOR + depth) * k)
  fade.addColorStop(0, rgba(C.floorFar, 0))
  fade.addColorStop(0.35, rgba(mix(C.floorFar, C.floor, 0.4), 0.45))
  fade.addColorStop(0.72, rgba(mix(C.floorFar, C.floor, 0.8), 0.95))
  fade.addColorStop(1, rgba(C.floor, 1))
  ctx.fillStyle = fade
  ctx.fillRect(x0 * k, FLOOR * k, (x1 - x0) * k, depth * k)
  if (f.y1 > FLOOR + depth) {
    ctx.fillStyle = C.floor
    ctx.fillRect(x0 * k, (FLOOR + depth - 0.01) * k, (x1 - x0) * k, (f.y1 - FLOOR - depth + 0.2) * k)
  }
  ctx.restore()
}

/**
 * The room's dark round the window: the frame's corners fall away into the unlit room, so the glass is the light in
 * it. Drawn over the room and under everything that stands in it.
 */
export function drawVignette(p: p5, k: number, T: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  const L = lightAt(T)
  // Going into the television, its picture becomes the whole frame: the room's dark leaves the corners.
  const into = T >= SEAM.news && T < SEAM.arrival ? 1 - ss(T, SEAM.news + 1.6, SEAM.arrival - 0.5) : 1
  if (into <= 0.001) return
  const w = f.x1 - f.x0
  const h = f.y1 - f.y0
  const cx = (f.x0 + f.x1) / 2
  const cy = (f.y0 + f.y1) / 2
  ctx.save()
  ctx.translate(cx * k, cy * k)
  ctx.scale(w / h, 1)
  const r = (h / 2) * 1.55 * k
  const g = ctx.createRadialGradient(0, h * 0.08 * k, r * 0.45, 0, h * 0.08 * k, r)
  const dark = HOUSE.night
  g.addColorStop(0, rgba(dark, 0))
  g.addColorStop(1, rgba(dark, (0.42 - 0.12 * L.amb + 0.2 * L.night) * into))
  ctx.fillStyle = g
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4)
  ctx.restore()
}
