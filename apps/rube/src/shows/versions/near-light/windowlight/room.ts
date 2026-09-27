import { hash, lerp, smooth } from './kit'
import { BAR_Y, BARS_X, FRAME, GLASS, LAMP } from './layout'
import { PERIOD, held, osc, section, wrap } from './music'
import { scenery, viewOf, type Ctx2D, type View } from './world'

/**
 * The room, and the night through its window.
 *
 * Outside is far, so it moves little as the camera does: it is drawn with a camera of its own that goes a fraction
 * of the way the real one goes, and comes a little closer as it comes closer (`outside`). The sky, and in it the
 * stars and the aurora; the far shore of the fjord, its mountains under snow and a few lit windows along the water;
 * the fjord; and snow falling past the glass.
 *
 * The aurora is the strings. It is not there while the piano plays alone; it comes as the strings come in, is as
 * bright as they are full (`held`), is at its brightest through the beat, and goes as the arpeggios end. Its folds
 * drift slowly the whole time, on whole numbers of cycles a period, so the night comes round.
 *
 * Inside: the wall, warm in the lamp's light near it; the window's frame and its bars; the sill.
 */

/** The camera the wide shot is framed on: the whole window. `camera.ts` goes out to it. */
export const WIDE: [number, number] = [0, -12.3]
export const WIDE_CELLS = 26.5

/** A layer of the outside: how far it moves with the camera (0 not at all, 1 as the room does), and how far it grows. */
interface Layer {
  x: number
  y: number
  px: number
  /** Cells of the layer to device pixels, x and y. */
  at: (qx: number, qy: number) => [number, number]
}

function outside(v: View, follow: number, grow: number): Layer {
  const wide = Math.min((v.W * 9) / 16, v.H) / WIDE_CELLS
  const px = wide * Math.pow(v.px / wide, grow)
  const x = WIDE[0] + (v.x - WIDE[0]) * follow
  const y = WIDE[1] + (v.y - WIDE[1]) * follow
  return { x, y, px, at: (qx, qy) => [v.W / 2 + (qx - x) * px, v.H / 2 + (qy - y) * px] }
}

/** How bright the aurora is at `t`, 0 to 1: the strings, from their entry, gone as the arpeggios end. */
export function auroraLight(t: number): number {
  const u = wrap(t)
  const strings = section('strings').t0
  const arps = section('arpeggios')
  const on = smooth(u, strings - 4, strings + 10) * (1 - smooth(u, arps.t0 - 6, arps.t1 - 2))
  const beat = section('beat')
  const peak = smooth(u, beat.t0 - 3, beat.t0 + 4) * (1 - smooth(u, beat.t1, beat.t1 + 12))
  return on * (0.25 + 0.6 * held(u) ** 1.5 + 0.2 * peak)
}

// ---------------------------------------------------------------- the sky

const SKY_TOP = '#070C1C'
const SKY_LOW = '#18284A'
const STARS = Array.from({ length: 260 }, (_, i) => ({
  x: -44 + 88 * hash(i, 1),
  y: -34 + 26 * Math.pow(hash(i, 2), 0.8),
  r: 0.5 + 1.2 * hash(i, 3) ** 3,
  a: 0.25 + 0.6 * hash(i, 4),
  hz: 0.08 + 0.3 * hash(i, 5),
}))

/** A curtain of the aurora: its base line across the sky, how tall its rays stand, and its folds. */
interface Curtain {
  x0: number
  x1: number
  base: number
  tall: number
  folds: [number, number, number][]
  bright: number
  seed: number
}

const CURTAINS: Curtain[] = [
  { x0: -30, x1: 26, base: -15.2, tall: 7.5, folds: [[1.6, 0.11, 0.013], [0.7, 0.29, 0.021], [0.35, 0.63, 0.034]], bright: 1, seed: 1 },
  { x0: -18, x1: 34, base: -18.6, tall: 5.8, folds: [[1.2, 0.14, 0.017], [0.5, 0.37, 0.027], [0.25, 0.8, 0.041]], bright: 0.6, seed: 2 },
  { x0: -40, x1: -2, base: -13.4, tall: 4.2, folds: [[0.9, 0.18, 0.011], [0.4, 0.45, 0.024]], bright: 0.45, seed: 3 },
]

/** A ray of light, drawn once: green at its foot, going to a violet haze at the top. */
let raySprite: HTMLCanvasElement | null = null
function ray(): HTMLCanvasElement {
  if (raySprite) return raySprite
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 256, 0, 0)
  grad.addColorStop(0, 'rgba(120, 255, 190, 0)')
  grad.addColorStop(0.04, 'rgba(120, 255, 190, 0.95)')
  grad.addColorStop(0.18, 'rgba(80, 235, 170, 0.7)')
  grad.addColorStop(0.5, 'rgba(60, 190, 170, 0.32)')
  grad.addColorStop(0.8, 'rgba(120, 90, 200, 0.12)')
  grad.addColorStop(1, 'rgba(140, 80, 200, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  raySprite = c
  return c
}

/** How far the aurora's slow waves have run along a curtain by `t`, radians: a whole number of times round a period. */
const travel = (t: number, seed: number): number => (2 * Math.PI * (9 + (seed % 3)) * wrap(t)) / PERIOD

/** A curtain's base at `x` at `t`: its folds drifting along it, each on a whole number of cycles a period. */
function fold(c: Curtain, x: number, t: number): number {
  let y = c.base
  for (const [amp, k, hz] of c.folds) y += amp * Math.sin(k * x + (2 * Math.PI * Math.max(1, Math.round(hz * PERIOD)) * wrap(t)) / PERIOD + c.seed)
  return y
}

function drawSky(ctx: Ctx2D, v: View, t: number): void {
  const L = outside(v, 0.1, 0.25)
  const [, top] = L.at(0, -30)
  const [, low] = L.at(0, -7.5)
  const g = ctx.createLinearGradient(0, top, 0, low)
  g.addColorStop(0, SKY_TOP)
  g.addColorStop(1, SKY_LOW)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, v.W, v.H)

  const light = auroraLight(t)
  // The sky lit green low down, under the aurora.
  if (light > 0.01) {
    const [, a] = L.at(0, -21)
    const [, b] = L.at(0, -8)
    const glow = ctx.createLinearGradient(0, a, 0, b)
    glow.addColorStop(0, 'rgba(60, 200, 150, 0)')
    glow.addColorStop(0.6, `rgba(60, 200, 150, ${(0.16 * light).toFixed(3)})`)
    glow.addColorStop(1, `rgba(40, 150, 140, ${(0.06 * light).toFixed(3)})`)
    ctx.fillStyle = glow
    ctx.fillRect(0, a, v.W, b - a)
  }

  // Stars, fewer where the aurora is bright.
  const s = Math.max(1, v.W / 1600)
  for (const [i, st] of STARS.entries()) {
    const [x, y] = L.at(st.x, st.y)
    if (x < -4 || x > v.W + 4 || y < -4 || y > v.H + 4) continue
    const tw = 0.7 + 0.3 * osc(t, st.hz, i)
    const a = st.a * tw * (1 - 0.5 * light)
    ctx.fillStyle = `rgba(236, 240, 250, ${a.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, st.r * s, 0, Math.PI * 2)
    ctx.fill()
  }

  // The aurora: rays standing up from each curtain's folded base, brightening and fading along it.
  if (light > 0.01) {
    const sprite = ray()
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const c of CURTAINS) {
      const step = 0.22
      const w = Math.max(1.5, step * L.px * 1.25)
      for (let x = c.x0; x <= c.x1; x += step) {
        const edge = smooth(x, c.x0, c.x0 + 6) * (1 - smooth(x, c.x1 - 6, c.x1))
        // Brightness goes along the curtain in slow waves, and the rays are finer or coarser from place to place.
        const wave = 0.5 + 0.5 * Math.sin(0.42 * x - travel(t, c.seed) + c.seed)
        const swell = 0.5 + 0.5 * Math.sin(0.13 * x + 0.8 * travel(t, c.seed + 5) + c.seed * 2)
        const grain = 0.7 + 0.3 * hash(Math.round(x / step), c.seed * 7)
        const shimmer = 0.85 + 0.15 * osc(t, 0.21 + 0.1 * hash(Math.round(x * 10), c.seed), x)
        const a = light * c.bright * edge * (0.25 + 0.75 * wave * (0.4 + 0.6 * swell)) * grain * shimmer * 0.46
        if (a < 0.01) continue
        const base = fold(c, x, t)
        const h = c.tall * (0.5 + 0.3 * swell + 0.2 * Math.sin(1.3 * x + c.seed)) * (0.85 + 0.15 * grain)
        const [sx, sy] = L.at(x, base)
        const hp = h * L.px
        ctx.globalAlpha = Math.min(1, a)
        ctx.drawImage(sprite, sx - w / 2, sy - hp, w, hp * 1.08)
      }
    }
    ctx.restore()
  }
}

// ---------------------------------------------------------------- the far shore

const SHORE = -7.6
/** The mountains across the fjord: a ridge line, peaks and saddles. */
const RIDGE: [number, number][] = (() => {
  const out: [number, number][] = []
  for (let x = -70; x <= 70; x += 0.5) {
    const y =
      SHORE -
      1.2 -
      1.6 * Math.max(0, Math.sin(0.11 * x + 0.8)) -
      1.1 * Math.max(0, Math.sin(0.23 * x + 2.1)) -
      0.5 * Math.sin(0.61 * x + 0.4) -
      0.25 * Math.sin(1.7 * x + 1.1)
    out.push([x, y])
  }
  return out
})()
const WINDOWS = Array.from({ length: 11 }, (_, i) => ({
  x: -20 + 40 * hash(i, 21) + (i % 3) * 0.3,
  y: SHORE - 0.12 - 0.45 * hash(i, 22),
  warm: hash(i, 23),
}))

function drawShore(ctx: Ctx2D, v: View, t: number): void {
  const L = outside(v, 0.2, 0.35)
  const light = auroraLight(t)
  // Mountains under snow: pale at the tops, dark at the water.
  ctx.beginPath()
  for (const [i, [x, y]] of RIDGE.entries()) {
    const [sx, sy] = L.at(x, y)
    if (i === 0) ctx.moveTo(sx, sy)
    else ctx.lineTo(sx, sy)
  }
  const [rx, ry] = L.at(70, SHORE)
  const [lx] = L.at(-70, SHORE)
  ctx.lineTo(rx, ry)
  ctx.lineTo(lx, ry)
  ctx.closePath()
  const [, top] = L.at(0, SHORE - 4.4)
  const g = ctx.createLinearGradient(0, top, 0, ry)
  g.addColorStop(0, lerpColor('#5D6D8C', '#6F9C9A', light * 0.5))
  g.addColorStop(0.45, '#2F3B55')
  g.addColorStop(1, '#141B2C')
  ctx.fillStyle = g
  ctx.fill()

  // The fjord: dark water, the shore's lights and the aurora laid on it.
  const [, bottom] = L.at(0, 2)
  const w = ctx.createLinearGradient(0, ry, 0, bottom)
  w.addColorStop(0, '#16213A')
  w.addColorStop(1, '#090E1B')
  ctx.fillStyle = w
  ctx.fillRect(0, ry, v.W, bottom - ry)
  if (light > 0.01) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const [ax0] = L.at(-24, 0)
    const [ax1] = L.at(24, 0)
    const [, ay1] = L.at(0, SHORE + 3.5)
    const r = ctx.createLinearGradient(0, ry, 0, ay1)
    r.addColorStop(0, `rgba(80, 220, 170, ${(0.14 * light).toFixed(3)})`)
    r.addColorStop(1, 'rgba(80, 220, 170, 0)')
    ctx.fillStyle = r
    ctx.fillRect(ax0, ry, ax1 - ax0, ay1 - ry)
    ctx.restore()
  }
  // Lit windows along the shore, and their long reflections.
  const s = Math.max(1, v.W / 1600)
  for (const [i, win] of WINDOWS.entries()) {
    const [x, y] = L.at(win.x, win.y)
    if (x < -20 || x > v.W + 20) continue
    const a = 0.7 + 0.15 * osc(t, 0.07 + 0.05 * win.warm, i)
    ctx.fillStyle = `rgba(255, ${Math.round(196 + 30 * win.warm)}, 140, ${a.toFixed(3)})`
    ctx.fillRect(x - 1.2 * s, y - 1.2 * s, 2.4 * s, 2.4 * s)
    const [, wy] = L.at(0, SHORE + 0.15)
    const len = (0.8 + 0.8 * win.warm) * L.px
    const rg = ctx.createLinearGradient(0, wy, 0, wy + len)
    rg.addColorStop(0, `rgba(255, 200, 140, ${(0.35 * a).toFixed(3)})`)
    rg.addColorStop(1, 'rgba(255, 200, 140, 0)')
    ctx.fillStyle = rg
    ctx.fillRect(x - 1 * s, wy, 2 * s, len)
  }
}

function lerpColor(a: string, b: string, f: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => Math.round(lerp((pa >> sh) & 255, (pb >> sh) & 255, Math.max(0, Math.min(1, f))))
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`
}

// ---------------------------------------------------------------- snow

/** Flakes falling past the glass, near it: each falls a whole number of times a period, so the snow comes round. */
const FLAKES = Array.from({ length: 90 }, (_, i) => {
  const span = 30
  const turns = 4 + Math.floor(hash(i, 31) * 5)
  return { x: -24 + 48 * hash(i, 32), y: hash(i, 33) * span, v: (turns * span) / PERIOD, span, r: 0.5 + 1.1 * hash(i, 34), sway: 0.2 + 0.5 * hash(i, 35), i }
})

function drawSnow(ctx: Ctx2D, v: View, t: number): void {
  const L = outside(v, 0.55, 0.6)
  const s = Math.max(1, v.W / 1600)
  const u = wrap(t)
  for (const f of FLAKES) {
    const y = ((f.y + f.v * u) % f.span) - 26
    const x = f.x + f.sway * osc(t, 0.05 + 0.04 * hash(f.i, 36), f.i)
    const [sx, sy] = L.at(x, y)
    if (sx < -5 || sx > v.W + 5 || sy < -5 || sy > v.H + 5) continue
    ctx.fillStyle = `rgba(232, 238, 248, ${(0.35 + 0.35 * hash(f.i, 37)).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(sx, sy, f.r * s * (L.px / 40) ** 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ---------------------------------------------------------------- the room

const WALL = '#221A17'
const WALL_LIT = '#4A3527'
const FRAME_FILL = '#5F574D'
const FRAME_LIT = '#B7A98F'
const SILL = '#5E4330'
const SILL_TOP = '#8A6A4B'

export const room = scenery<null>('room', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const k = c.k

  // The night, through the glass only.
  const [gx0, gy0] = [GLASS.x0 * k, GLASS.y0 * k]
  const [gx1, gy1] = [GLASS.x1 * k, GLASS.y1 * k]
  ctx.save()
  ctx.beginPath()
  ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0)
  ctx.clip()
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  drawSky(ctx, v, c.t)
  drawShore(ctx, v, c.t)
  drawSnow(ctx, v, c.t)
  ctx.restore()
  // A cool sheen on the glass, and the lamp's warmth caught in it.
  const sheen = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
  sheen.addColorStop(0, 'rgba(160, 190, 230, 0.05)')
  sheen.addColorStop(0.5, 'rgba(160, 190, 230, 0)')
  sheen.addColorStop(1, 'rgba(160, 190, 230, 0.04)')
  ctx.fillStyle = sheen
  ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0)
  ctx.restore()

  // The wall round the window, warmer near the lamp.
  const reach = 90
  const warm = ctx.createRadialGradient(LAMP[0] * k, LAMP[1] * k, 0, LAMP[0] * k, LAMP[1] * k, 26 * k)
  warm.addColorStop(0, WALL_LIT)
  warm.addColorStop(1, WALL)
  ctx.fillStyle = warm
  const fx0 = (GLASS.x0 - FRAME) * k
  const fx1 = (GLASS.x1 + FRAME) * k
  const fy0 = (GLASS.y0 - FRAME) * k
  ctx.fillRect(-reach * k, -reach * k, 2 * reach * k, fy0 + reach * k)
  ctx.fillRect(-reach * k, fy0, fx0 + reach * k, reach * k)
  ctx.fillRect(fx1, fy0, reach * k, reach * k)
  ctx.fillRect(fx0, 0, fx1 - fx0, reach * k)

  // The frame and the bars, lit from the lamp's side.
  const frame = ctx.createLinearGradient(fx0, 0, fx1, 0)
  frame.addColorStop(0, FRAME_LIT)
  frame.addColorStop(0.45, FRAME_FILL)
  frame.addColorStop(1, '#4A443D')
  ctx.fillStyle = frame
  ctx.fillRect(fx0, fy0, fx1 - fx0, FRAME * k)
  ctx.fillRect(fx0, fy0, FRAME * k, -fy0)
  ctx.fillRect(GLASS.x1 * k, fy0, FRAME * k, -fy0)
  ctx.fillRect(fx0, GLASS.y1 * k, fx1 - fx0, -GLASS.y1 * k)
  const bar = 0.24 * k
  for (const x of BARS_X) ctx.fillRect(x * k - bar / 2, gy0, bar, gy1 - gy0)
  ctx.fillRect(gx0, BAR_Y * k - bar / 2, gx1 - gx0, bar)
  // The frame's inner edge: a thin shadow where it meets the glass.
  ctx.strokeStyle = 'rgba(10, 8, 6, 0.45)'
  ctx.lineWidth = Math.max(1, c.weight * 0.8)
  ctx.strokeRect(gx0, gy0, gx1 - gx0, gy1 - gy0)

  // The sill: a deep plank, its top catching the lamp.
  const sx0 = (GLASS.x0 - FRAME - 1.2) * k
  const sx1 = (GLASS.x1 + FRAME + 1.2) * k
  ctx.fillStyle = SILL
  ctx.fillRect(sx0, 0, sx1 - sx0, 0.55 * k)
  ctx.fillStyle = SILL_TOP
  ctx.fillRect(sx0, 0, sx1 - sx0, 0.09 * k)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fillRect(sx0, 0.55 * k, sx1 - sx0, 0.12 * k)
})
