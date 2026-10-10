import { clamp } from '../../../../../../../../src/core/ease'
import { mixHex } from '../../../../../parts'
import { DOJO, DOJO_THEME, EVELYN, HIBACHI, HIBACHI_THEME, HOTDOG, HOTDOG_THEME, JOY, PREMIERE, ROCKS, STAR, VOID, VOID_THEME, WAYMOND } from '../worlds'
import { CREDITS_AT } from '../music'
import { SWELL } from './finale-plan'
import { PANEL_LOOKS, paintPicture, pixelOf, prefersCalm } from '../film'

/**
 * Every life, once more, in the washer's window.
 *
 * The show opened the multiverse in a window: in the big dryer's glass, from 46 s, other worlds showed between the
 * drum's lifters, faster and faster, until she flew out into them. Under the credits a window closes it. The family
 * rest at the foot of the washer, and in its lit glass the lives she went through come back, one at a time, in the
 * order back home: the bagel, the rocks, Raccacoonie's kitchen, the hot dog piano, the dojo, the red carpet. In each
 * of them now the three of them are there together, small, eyes and all (on the rocks, three stones on the ledge,
 * where there were two). Each drifts a little across the glass as if seen going past, and gives way to the next.
 * After the carpet the glass is only its own warm light again, and on 312.59 it swells, and they look at one another:
 * of all of them, this one.
 *
 * Painted inside the glass in the dark room, under the window's glow (`drawWindowGlow`), so it is lit as the glass is.
 * Each life comes and goes over most of a second: nothing in it flashes.
 */

type Life = 'bagel' | 'rocks' | 'raccoon' | 'hotdog' | 'dojo' | 'premiere'

const ORDER: Life[] = ['bagel', 'rocks', 'raccoon', 'hotdog', 'dojo', 'premiere']
/** The first comes up a little after the credits begin; each holds about two seconds; the last has gone well before the swell. */
export const FIRST = CREDITS_AT + 1.6
const EACH = 2.05
const FADE = 0.75
export const LIVES: { life: Life; at: number }[] = ORDER.map((life, i) => ({ life, at: FIRST + i * EACH }))
export const LAST_OUT = FIRST + ORDER.length * EACH + FADE
if (LAST_OUT > SWELL - 0.6) throw new Error('the lives in the window run into the swell')

const smooth = (u: number): number => {
  const x = clamp(u)
  return x * x * (3 - 2 * x)
}

/** How much of each life is in the glass at `t`, and how far it has drifted (0 to 1 over its time there). */
function shown(t: number): { life: Life; a: number; u: number }[] {
  const out: { life: Life; a: number; u: number }[] = []
  for (const l of LIVES) {
    const s = t - l.at
    if (s < 0 || s > EACH + FADE) continue
    const a = smooth(s / FADE) * (1 - smooth((s - EACH) / FADE))
    if (a > 0.003) out.push({ life: l.life, a, u: s / (EACH + FADE) })
  }
  return out
}

/** How much the window is showing a life, for the glow over it to stand back. */
export const livesShown = (t: number): number => (t < FIRST || t > LAST_OUT ? 0 : Math.min(1, shown(t).reduce((m, s) => m + s.a, 0)))

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

type Ctx = CanvasRenderingContext2D

/** The three of them, small, side by side on a line at `y` (shares of the radius), each with an eye. */
function family(ctx: Ctx, r: number, x0: number, y: number, size: number, ink: string, stones = false): void {
  const who = [EVELYN, JOY, WAYMOND]
  const gap = size * 2.25
  who.forEach((c, i) => {
    const x = (x0 + (i - 1) * gap) * r
    const yy = (y - size) * r
    const rr = size * r
    ctx.beginPath()
    if (stones) {
      // A lumpy stone, flat underneath, its colour mostly gone to stone.
      const n = 9
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2
        const q = rr * (1.12 + 0.12 * Math.sin(a * 3 + i * 1.7))
        const py = Math.min(rr * 0.95, Math.sin(a) * q * 0.86)
        j === 0 ? ctx.moveTo(x + Math.cos(a) * q, yy + py) : ctx.lineTo(x + Math.cos(a) * q, yy + py)
      }
      ctx.closePath()
      ctx.fillStyle = mixHex(c, ROCKS.stoneDeep, 0.45)
    } else {
      ctx.arc(x, yy, rr, 0, Math.PI * 2)
      ctx.fillStyle = c
    }
    ctx.fill()
    ctx.lineWidth = Math.max(0.8, rr * 0.16)
    ctx.strokeStyle = ink
    ctx.stroke()
    // Their eyes, each looking at the one beside it.
    const ex = x + rr * 0.08
    const ey = yy - rr * 0.18
    ctx.beginPath()
    ctx.arc(ex, ey, rr * 0.52, 0, Math.PI * 2)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.lineWidth = Math.max(0.5, rr * 0.08)
    ctx.stroke()
    const look = i === 0 ? 1 : i === 2 ? -1 : 0.4
    ctx.beginPath()
    ctx.arc(ex + look * rr * 0.22, ey + rr * 0.08, rr * 0.24, 0, Math.PI * 2)
    ctx.fillStyle = '#141414'
    ctx.fill()
  })
}

function rect(ctx: Ctx, r: number, x0: number, y0: number, x1: number, y1: number, c: string): void {
  ctx.fillStyle = c
  ctx.fillRect(x0 * r, y0 * r, (x1 - x0) * r, (y1 - y0) * r)
}

/** One life, painted in the glass's own frame: centre at the origin, `r` the glass's radius in pixels, `u` its drift. */
function paintLife(ctx: Ctx, life: Life, r: number, u: number, t: number): void {
  // Seen going past: the picture drifts a little across the glass.
  ctx.translate((0.12 - 0.24 * u) * r, 0)
  switch (life) {
    case 'bagel': {
      rect(ctx, r, -1.4, -1.2, 1.4, 1.2, VOID_THEME.bg)
      // The bagel's crown, a great dark ring low in the glass, its rim lit, the hole's violet.
      const cx = 0
      const cy = 1.05
      const g = ctx.createRadialGradient(cx * r, cy * r, 0.1 * r, cx * r, cy * r, 0.5 * r)
      g.addColorStop(0, rgba(VOID.glow, 0.7))
      g.addColorStop(1, rgba(VOID.glow, 0))
      ctx.fillStyle = VOID.bagel
      ctx.beginPath()
      ctx.ellipse(cx * r, cy * r, 1.3 * r, 0.9 * r, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = rgba(VOID.rimLight, 0.75)
      ctx.lineWidth = Math.max(1, 0.035 * r)
      ctx.beginPath()
      ctx.ellipse(cx * r, cy * r, 1.3 * r, 0.9 * r, 0, Math.PI * 1.08, Math.PI * 1.92)
      ctx.stroke()
      ctx.fillStyle = g
      ctx.fillRect(-0.6 * r, 0.5 * r, 1.2 * r, 1.1 * r)
      for (let i = 0; i < 26; i++) {
        const a = Math.PI * (1.05 + 0.9 * ((i * 0.618) % 1))
        const q = 0.92 + 0.3 * ((i * 0.37) % 1)
        ctx.fillStyle = i % 4 === 0 ? VOID.salt : VOID.sesame
        ctx.beginPath()
        ctx.ellipse((cx + Math.cos(a) * 1.3 * q) * r, (cy + Math.sin(a) * 0.9 * q) * r, 0.03 * r, 0.014 * r, a, 0, Math.PI * 2)
        ctx.fill()
      }
      family(ctx, r, 0, 0.17, 0.14, VOID_THEME.ink)
      break
    }
    case 'rocks': {
      const sky = ctx.createLinearGradient(0, -r, 0, 0.3 * r)
      sky.addColorStop(0, ROCKS.sky)
      sky.addColorStop(1, mixHex(ROCKS.far, ROCKS.sky, 0.4))
      ctx.fillStyle = sky
      ctx.fillRect(-1.4 * r, -1.2 * r, 2.8 * r, 1.6 * r)
      // The far canyon in two pale steps, then the ledge they sit on.
      rect(ctx, r, -1.4, 0.12, 1.4, 0.5, mixHex(ROCKS.far, ROCKS.canyon, 0.25))
      rect(ctx, r, -1.4, 0.0, -0.55, 0.12, mixHex(ROCKS.far, ROCKS.canyon, 0.15))
      rect(ctx, r, 0.6, 0.02, 1.4, 0.12, mixHex(ROCKS.far, ROCKS.canyon, 0.15))
      rect(ctx, r, -1.4, 0.3, 1.4, 1.2, ROCKS.canyon)
      rect(ctx, r, -1.4, 0.3, 1.4, 0.36, ROCKS.stone)
      rect(ctx, r, -1.4, 0.62, 1.4, 1.2, ROCKS.canyonShade)
      family(ctx, r, -0.05, 0.3, 0.145, '#3A342D', true)
      break
    }
    case 'raccoon': {
      rect(ctx, r, -1.4, -1.2, 1.4, 1.2, HIBACHI_THEME.bg)
      // The griddle, its flames, and the chef's toque over it with a raccoon's ears and mask under the brim.
      rect(ctx, r, -1.4, 0.32, 1.4, 0.44, HIBACHI.steel)
      rect(ctx, r, -1.4, 0.44, 1.4, 1.2, HIBACHI.steelDeep)
      for (let i = 0; i < 9; i++) {
        const x = -1.1 + i * 0.28
        const h = 0.07 + 0.03 * Math.sin(t * 6 + i * 1.9)
        ctx.fillStyle = i % 2 ? HIBACHI.flame : HIBACHI.flameHot
        ctx.beginPath()
        ctx.moveTo((x - 0.05) * r, 0.5 * r)
        ctx.quadraticCurveTo(x * r, (0.5 - h * 2) * r, (x + 0.05) * r, 0.5 * r)
        ctx.fill()
      }
      ctx.fillStyle = HIBACHI.hat
      ctx.beginPath()
      ctx.ellipse(0.42 * r, -0.46 * r, 0.3 * r, 0.22 * r, 0, 0, Math.PI * 2)
      ctx.ellipse(0.2 * r, -0.5 * r, 0.2 * r, 0.18 * r, 0, 0, Math.PI * 2)
      ctx.ellipse(0.64 * r, -0.5 * r, 0.2 * r, 0.18 * r, 0, 0, Math.PI * 2)
      ctx.fill()
      rect(ctx, r, 0.18, -0.32, 0.66, -0.2, HIBACHI.hat)
      ctx.fillStyle = HIBACHI.raccoon
      ctx.beginPath()
      ctx.ellipse(0.42 * r, -0.14 * r, 0.16 * r, 0.08 * r, 0, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = HIBACHI.raccoonDeep
      ctx.fillRect(0.3 * r, -0.17 * r, 0.24 * r, 0.035 * r)
      family(ctx, r, -0.25, 0.32, 0.14, HIBACHI_THEME.ink)
      break
    }
    case 'hotdog': {
      rect(ctx, r, -1.4, -1.2, 1.4, 1.2, HOTDOG_THEME.bg)
      ctx.fillStyle = mixHex(HOTDOG_THEME.bg, HOTDOG.sausage, 0.18)
      for (let i = -6; i <= 6; i++) ctx.fillRect((i * 0.22 - 0.04) * r, -1.2 * r, 0.08 * r, 2.4 * r)
      // The piano's keys, and a sausage finger draped down over them.
      rect(ctx, r, -1.4, 0.3, 1.4, 0.56, HOTDOG.ivory)
      ctx.fillStyle = HOTDOG.piano
      for (let i = -9; i <= 9; i++) ctx.fillRect((i * 0.15 - 0.008) * r, 0.3 * r, 0.016 * r, 0.26 * r)
      for (let i = -9; i <= 9; i++) if (i % 7 !== 2 && i % 7 !== -5) ctx.fillRect((i * 0.15 + 0.1) * r, 0.3 * r, 0.09 * r, 0.15 * r)
      rect(ctx, r, -1.4, 0.56, 1.4, 1.2, HOTDOG.piano)
      ctx.strokeStyle = HOTDOG.sausage
      ctx.lineCap = 'round'
      ctx.lineWidth = 0.17 * r
      ctx.beginPath()
      ctx.moveTo(0.95 * r, -1.1 * r)
      ctx.quadraticCurveTo(0.9 * r, -0.3 * r, 0.62 * r, 0.12 * r)
      ctx.stroke()
      family(ctx, r, -0.2, 0.3, 0.14, HOTDOG_THEME.ink)
      break
    }
    case 'dojo': {
      rect(ctx, r, -1.4, -1.2, 1.4, 1.2, DOJO.screen)
      ctx.strokeStyle = mixHex(DOJO.screen, DOJO.woodDeep, 0.35)
      ctx.lineWidth = Math.max(1, 0.02 * r)
      for (let i = -5; i <= 5; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 0.3 * r, -1.2 * r)
        ctx.lineTo(i * 0.3 * r, 0.3 * r)
        ctx.stroke()
      }
      for (let j = -3; j <= 0; j++) {
        ctx.beginPath()
        ctx.moveTo(-1.4 * r, j * 0.34 * r)
        ctx.lineTo(1.4 * r, j * 0.34 * r)
        ctx.stroke()
      }
      // A wooden man, and the gong over the floor's lacquer.
      rect(ctx, r, 0.5, -0.5, 0.64, 0.3, DOJO.wood)
      rect(ctx, r, 0.3, -0.32, 0.84, -0.26, DOJO.woodDeep)
      rect(ctx, r, 0.36, -0.1, 0.78, -0.05, DOJO.woodDeep)
      ctx.fillStyle = DOJO.gold
      ctx.beginPath()
      ctx.arc(-0.6 * r, -0.45 * r, 0.2 * r, 0, Math.PI * 2)
      ctx.fill()
      rect(ctx, r, -1.4, 0.3, 1.4, 1.2, DOJO.lacquer)
      rect(ctx, r, -1.4, 0.3, 1.4, 0.35, DOJO.woodDeep)
      family(ctx, r, -0.2, 0.3, 0.14, DOJO_THEME.ink)
      break
    }
    case 'premiere': {
      rect(ctx, r, -1.4, -1.2, 1.4, 1.2, PREMIERE.bg)
      // The marquee's spot on them, the brass posts and their rope, and the carpet.
      const g = ctx.createRadialGradient(-0.1 * r, 0.2 * r, 0, -0.1 * r, 0.2 * r, 0.9 * r)
      g.addColorStop(0, rgba(STAR.spot, 0.45))
      g.addColorStop(1, rgba(STAR.spot, 0))
      ctx.fillStyle = g
      ctx.fillRect(-1.2 * r, -0.8 * r, 2.4 * r, 1.6 * r)
      rect(ctx, r, -1.4, 0.3, 1.4, 1.2, STAR.carpet)
      rect(ctx, r, -1.4, 0.3, 1.4, 0.34, STAR.carpetDeep)
      ctx.strokeStyle = STAR.velvet
      ctx.lineWidth = Math.max(1, 0.05 * r)
      ctx.beginPath()
      ctx.moveTo(0.45 * r, -0.08 * r)
      ctx.quadraticCurveTo(0.75 * r, 0.12 * r, 1.05 * r, -0.08 * r)
      ctx.stroke()
      for (const x of [0.45, 1.05]) {
        rect(ctx, r, x - 0.025, -0.12, x + 0.025, 0.32, STAR.brass)
        ctx.fillStyle = STAR.gold
        ctx.beginPath()
        ctx.arc(x * r, -0.14 * r, 0.045 * r, 0, Math.PI * 2)
        ctx.fill()
      }
      // A press camera's bulb far off, glinting slowly: a star, not a flash.
      const f = 0.5 + 0.5 * Math.sin(t * 2.4)
      ctx.fillStyle = rgba(STAR.flash, 0.5 + 0.4 * f)
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        const q = (i % 2 === 0 ? 0.08 + 0.03 * f : 0.018) * r
        const x = -0.7 * r + Math.cos(a) * q
        const y = -0.55 * r + Math.sin(a) * q
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      family(ctx, r, -0.2, 0.32, 0.14, PREMIERE.ink)
      break
    }
  }
}

/**
 * The lives in the glass at `t`: inside the window's round at (cx, cy), radius `rCells`, in the glass's own light
 * colour `light` (which tints them, so they are seen in it and not pasted on), as much as `strength`.
 */
export function drawLives(ctx: Ctx, k: number, cx: number, cy: number, rCells: number, light: string, strength: number, t: number): void {
  if (strength <= 0.01 || t < FIRST || t > LAST_OUT) return
  const now = shown(t)
  if (!now.length) return
  const r = rCells * k
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(cx * k, cy * k)
  for (const s of now) {
    ctx.save()
    ctx.globalAlpha = 0.88 * s.a * strength
    paintLife(ctx, s.life, r, s.u, t)
    // Each in the picture it was in (`film.ts`): the carpet between bars, the dojo an old print, the piano soft.
    const look = PANEL_LOOKS[s.life]
    if (look) paintPicture(ctx, look, -r, -r, 2 * r, 2 * r, t, prefersCalm(), pixelOf(ctx), 0.62)
    ctx.restore()
  }
  // The glass's own light over them, and its curve: darker at the rim.
  const a = Math.min(1, now.reduce((m, s) => m + s.a, 0)) * strength
  ctx.fillStyle = rgba(light, 0.2 * a)
  ctx.fillRect(-r, -r, 2 * r, 2 * r)
  const rim = ctx.createRadialGradient(0, -0.15 * r, 0.55 * r, 0, 0, r)
  rim.addColorStop(0, 'rgba(0, 0, 0, 0)')
  rim.addColorStop(1, `rgba(0, 0, 0, ${0.35 * a})`)
  ctx.fillStyle = rim
  ctx.fillRect(-r, -r, 2 * r, 2 * r)
  ctx.restore()
}
