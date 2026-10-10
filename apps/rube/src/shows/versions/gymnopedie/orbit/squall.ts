import { mixHex } from '../../../../parts'
import { osc, wrap } from './music'
import { RADIUS, along } from './path'
import { hash, polar, smooth, type Sky } from './world'
import { devicePx, type Ctx2D } from './frame'
import { cumulus, drawCloud } from './air'

/**
 * The afternoon shower, seen coming and going across the sea. A squall (a dark base of cloud trailing curtains of rain
 * to the water) comes in from the west, the sun's side, over the far shore, until it is overhead and the rain is all
 * round; then it goes off to the east, lit from behind by the low sun, and the bow stands in it, opposite the sun, where
 * a bow is.
 *
 * Its place is across the frame (cells from the frame's middle): the weather goes with the wind, faster than the ball.
 */

/** Its way across the frame: in from the west, overhead, off to the east. Show times and cells from the middle. */
const COMING = { from: 116, near: 150 }
const GOING = { from: 176, far: 210 }

/** Where the squall is at `t`, cells across from the frame's middle (west negative), and how much of it there is. */
export function squallAt(t: number): { x: number; there: number; going: number } | null {
  const u = wrap(t)
  if (u < COMING.from || u > GOING.far) return null
  let x: number
  let going = 0
  if (u < COMING.near) {
    const q = smooth(u, COMING.from, COMING.near)
    x = -13 + 11.5 * q
  } else if (u < GOING.from) {
    x = -1.5 + (3 * (u - COMING.near)) / (GOING.from - COMING.near)
  } else {
    const q = smooth(u, GOING.from, GOING.far)
    x = 1.5 + 11.5 * q
    going = smooth(u, GOING.from, GOING.from + 8)
  }
  // Coming in and going off; and while it is overhead its curtains are the rain all round, not a thing seen.
  const there = smooth(u, COMING.from, COMING.from + 10) * (1 - smooth(u, GOING.far - 12, GOING.far)) * smooth(Math.abs(x), 1.6, 4.5)
  return { x, there, going }
}

/** The curtains: across the squall (cells from its middle), how wide, how far each hangs and how dense. */
const CURTAINS = Array.from({ length: 7 }, (_, i) => ({
  x: (i - 3) * 0.62 + (hash(i, 701) - 0.5) * 0.4,
  w: 0.5 + 0.6 * hash(i, 702),
  dense: 0.55 + 0.45 * hash(i, 703),
  seed: i,
}))

/** How high the squall's cloud base is over the sea, cells: over the far islands, under the near cumulus. */
const BASE = 1.9

/** Its cloud: a long, low cumulus, its foot at the base. */
const SQUALL_CLOUD = { ...cumulus(7001, 0, 0, 4.6, 0.42), h: 0 }

/**
 * The squall in the world's transform, square to the sea under the frame's middle: in front of the far shore, behind the
 * stones. `sunSide` is which way the sun is across the frame (-1 west, 1 east).
 */
export function drawSquall(ctx: Ctx2D, k: number, t: number, day: Sky, light: number): void {
  const s = squallAt(t)
  if (!s || s.there * light < 0.01) return
  const u = along(t) + 0.55
  const [x0, y0] = polar(u, 0)
  ctx.save()
  ctx.translate(x0 * k, y0 * k)
  ctx.rotate(u / RADIUS)
  ctx.scale(k, k)
  ctx.translate(s.x, 0)
  const px = devicePx(ctx)
  // Dark and blue-grey, coming and going: going off it is the dark the bow stands out against, its cloud's top only
  // warmed by the low sun behind.
  const rain = mixHex(mixHex('#5E6876', day.top, 0.35), mixHex('#59607A', day.top, 0.3), s.going)
  const base = mixHex(mixHex('#6C7480', day.top, 0.3), mixHex('#7A7488', day.low, 0.25), s.going)
  const [rr, rg, rb] = [1, 3, 5].map((i) => parseInt(rain.slice(i, i + 2), 16))
  const a = s.there * light
  // The curtains: soft slanting streaks from the cloud base to the water, thinning to the sea and into the horizon's haze.
  const slant = 0.32
  for (const c of CURTAINS) {
    // Its edge stirs a little, as rain does in the wind.
    const sway = 0.08 * osc(t, 0.07, c.seed)
    // In thin strips, each as dense as it is near the curtain's middle, so the curtain has no edge.
    const STRIPS = 18
    const sw = (c.w * 1.6) / STRIPS
    // One gradient for the curtain, down its height; each strip as dense as it is near the middle, by its alpha.
    const g = ctx.createLinearGradient(0, -BASE, 0, 0)
    g.addColorStop(0, `rgba(${rr}, ${rg}, ${rb}, ${(0.3 * a).toFixed(3)})`)
    g.addColorStop(0.6, `rgba(${rr}, ${rg}, ${rb}, ${(0.2 * a).toFixed(3)})`)
    g.addColorStop(1, `rgba(${rr}, ${rg}, ${rb}, ${(0.05 * a).toFixed(3)})`)
    ctx.fillStyle = g
    for (let i = 0; i < STRIPS; i++) {
      const across = (i + 0.5) / STRIPS - 0.5
      const dense = c.dense * Math.exp(-((across / 0.28) ** 2))
      if (dense < 0.03) continue
      ctx.globalAlpha = dense
      const x = c.x + across * c.w * 1.6
      ctx.beginPath()
      ctx.moveTo(x - sw / 2 - 0.002, -BASE + 0.1)
      ctx.lineTo(x + sw / 2 + 0.002, -BASE + 0.1)
      ctx.lineTo(x + sw / 2 + 0.002 + slant + sway, 0.05)
      ctx.lineTo(x - sw / 2 - 0.002 + slant + sway, 0.05)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // And its streaks, fine and faint.
    ctx.strokeStyle = `rgba(${rr}, ${rg}, ${rb}, ${(0.14 * a * c.dense).toFixed(3)})`
    ctx.lineWidth = Math.max(px, 0.01)
    ctx.beginPath()
    for (let i = 0; i < 14; i++) {
      const sx = c.x + (hash(c.seed, i, 704) - 0.5) * c.w
      const top = -BASE + 0.1 + 0.3 * hash(c.seed, i, 705)
      ctx.moveTo(sx, top)
      ctx.lineTo(sx + slant * (-top / BASE) + sway, 0.02)
    }
    ctx.stroke()
  }
  // The cloud the rain falls from: one of the sky's own cumulus, dark with rain, its top lit.
  const lit = mixHex(base, '#FFFFFF', 0.25 + 0.2 * s.going)
  ctx.translate(0, -BASE + 0.12)
  drawCloud(ctx, 1, SQUALL_CLOUD, { lit, shade: base, under: mixHex(base, '#2E3442', 0.3), alpha: 1 }, -0.3, 0.95, (0.72 - 0.17 * s.going) * a)
  ctx.restore()
}
