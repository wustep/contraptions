import { mixHex } from '../../../../parts'
import { GLASS } from './desk'
import { smooth } from './music'
import { cloudAt, hash, lampAt, nightAt, rainAt, skyAt } from './world'

/**
 * The view through the glass, a function of show time: the sky from dusk into night, the clouds coming over and
 * clearing, the stars and the moon when it is clear, a plane now and then, the city across the street with its windows
 * lit and going out, the rain falling past, and on the glass the beads.
 *
 * It is what changes slowest in the show: the half hour is one evening, and the window is its clock.
 */

type Ctx = CanvasRenderingContext2D

export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

const W = GLASS.x1 - GLASS.x0
const H = GLASS.y1 - GLASS.y0

/** The night through the glass, clipped to it. */
export function night(ctx: Ctx, t: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(GLASS.x0, GLASS.y0, W, H)
  ctx.clip()
  const sky = skyAt(t)
  const cloud = cloudAt(t)
  const g = ctx.createLinearGradient(0, GLASS.y0, 0, GLASS.y1 - 0.6)
  g.addColorStop(0, sky.top)
  g.addColorStop(0.5, sky.mid)
  g.addColorStop(1, sky.low)
  ctx.fillStyle = g
  ctx.fillRect(GLASS.x0, GLASS.y0, W, H)
  stars(ctx, t, cloud)
  moon(ctx, t, cloud)
  plane(ctx, t, cloud)
  clouds(ctx, t, cloud, sky)
  city(ctx, t, sky)
  rain(ctx, t)
  drops(ctx, t, rainAt(t))
  // The room in the glass: the lamp's warmth caught faintly in the pane nearest it.
  const lamp = lampAt(t)
  const r = ctx.createRadialGradient(GLASS.x1 - 0.25, GLASS.y1 - 0.7, 0.02, GLASS.x1 - 0.25, GLASS.y1 - 0.7, 1.1)
  r.addColorStop(0, rgba('#F4B27A', 0.12 * lamp))
  r.addColorStop(1, rgba('#F4B27A', 0))
  ctx.fillStyle = r
  ctx.fillRect(GLASS.x0, GLASS.y0, W, H)
  ctx.restore()
}

/** How dark the sky is for stars: none at dusk, all of them by the blue hour's end. */
const darkAt = (t: number): number => smooth(nightAt(t), 0.06, 0.22)

function stars(ctx: Ctx, t: number, cloud: number): void {
  const a0 = darkAt(t) * Math.max(0, 1 - cloud * 1.15)
  if (a0 <= 0.01) return
  for (let i = 0; i < 46; i++) {
    const x = GLASS.x0 + hash(i, 61) * W
    const y = GLASS.y0 + hash(i, 62) ** 1.4 * (H - 1.4)
    const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + hash(i, 63) * 1.7) + hash(i, 64) * 6.3)
    const r = 0.007 + hash(i, 65) ** 3 * 0.014
    ctx.fillStyle = rgba(hash(i, 66) < 0.2 ? '#FFD9B8' : '#E6E8FF', a0 * tw * (0.5 + 0.5 * hash(i, 67)))
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // Late in the night, in the clear, a shooting star now and then.
  const n = nightAt(t)
  for (const at of [1452, 1618, 1731, 1790]) {
    const s = t - at
    if (s < 0 || s > 0.9 || n < 0.6) continue
    const u = s / 0.9
    const x = GLASS.x0 + 0.4 + (at % 7) * 0.25 + u * 1.3
    const y = GLASS.y0 + 0.3 + (at % 3) * 0.15 + u * 0.55
    const g = ctx.createLinearGradient(x, y, x - 0.5, y - 0.21)
    const a = a0 * Math.sin(Math.PI * u)
    g.addColorStop(0, rgba('#FFFFFF', a))
    g.addColorStop(1, rgba('#FFFFFF', 0))
    ctx.strokeStyle = g
    ctx.lineWidth = 0.014
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 0.5, y - 0.21)
    ctx.stroke()
  }
}

/** The moon: it rises into the right-hand pane over the last part of the night, a soft full moon with a halo. */
function moon(ctx: Ctx, t: number, cloud: number): void {
  const n = nightAt(t)
  const up = smooth(n, 0.5, 0.6)
  if (up <= 0) return
  const u = Math.max(0, (n - 0.5) / 0.5)
  const x = GLASS.x1 - 0.55 - u * 0.75
  const y = GLASS.y1 - 1.6 - u * 2.0
  const a = up * (1 - 0.82 * cloud)
  const halo = ctx.createRadialGradient(x, y, 0.15, x, y, 1.2)
  halo.addColorStop(0, rgba('#E9E3FF', 0.32 * a))
  halo.addColorStop(0.4, rgba('#B4B3E8', 0.1 * a))
  halo.addColorStop(1, rgba('#B4B3E8', 0))
  ctx.fillStyle = halo
  ctx.fillRect(x - 1.3, y - 1.3, 2.6, 2.6)
  ctx.fillStyle = rgba('#F6F0DD', a)
  ctx.beginPath()
  ctx.arc(x, y, 0.19, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba('#D6CCB4', 0.55 * a)
  for (const [dx, dy, r] of [[-0.05, -0.04, 0.05], [0.06, 0.03, 0.035], [-0.02, 0.08, 0.03]]) {
    ctx.beginPath()
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Now and then a plane, high and slow, its strobe blinking: only seen when the sky is clear enough. */
function plane(ctx: Ctx, t: number, cloud: number): void {
  const EVERY = 173
  const k = Math.floor(t / EVERY)
  const s = t - k * EVERY - 20
  const dur = 34
  if (s < 0 || s > dur) return
  const a = Math.max(0, 1 - cloud * 1.3) * (0.5 + 0.5 * darkAt(t) + 0.3 * (1 - darkAt(t)))
  if (a <= 0.02) return
  const dir = hash(k, 71) < 0.5 ? 1 : -1
  const u = s / dur
  const x = dir > 0 ? GLASS.x0 - 0.2 + u * (W + 0.4) : GLASS.x1 + 0.2 - u * (W + 0.4)
  const y = GLASS.y0 + 0.35 + hash(k, 72) * 1.2 - u * 0.25
  ctx.fillStyle = rgba('#FF6B6B', 0.75 * a)
  ctx.beginPath()
  ctx.arc(x, y, 0.012, 0, Math.PI * 2)
  ctx.fill()
  const strobe = (s % 1.3) < 0.09 ? 1 : 0
  if (strobe) {
    const g = ctx.createRadialGradient(x + 0.03 * dir, y, 0, x + 0.03 * dir, y, 0.07)
    g.addColorStop(0, rgba('#FFFFFF', a))
    g.addColorStop(1, rgba('#FFFFFF', 0))
    ctx.fillStyle = g
    ctx.fillRect(x - 0.1, y - 0.1, 0.2, 0.2)
  }
}

/**
 * The clouds: long soft banks drifting slowly right, as many as the cover asks. At dusk they are lit from under in
 * peach and rose; at night they are a little paler than the sky, lit by the city.
 */
function clouds(ctx: Ctx, t: number, cover: number, sky: { top: string; mid: string; dusk: number }): void {
  const lit = mixHex('#2C2E4E', '#E7A08E', sky.dusk)
  const body = mixHex('#232543', '#6E5A8E', sky.dusk)
  for (let i = 0; i < 9; i++) {
    const has = Math.max(0, Math.min(1, (cover - i / 9) * 6))
    if (has <= 0) continue
    const span = W + 3
    const x = GLASS.x0 - 1.5 + ((hash(i, 81) * span + t * (0.012 + hash(i, 82) * 0.01)) % span)
    const y = GLASS.y0 + 0.4 + hash(i, 83) * (H - 2.2)
    const w = 0.9 + hash(i, 84) * 1.2
    for (let j = 0; j < 4; j++) {
      const cx = x + (j - 1.5) * w * 0.3 + hash(i, j, 85) * 0.1
      const cy = y - Math.sin((j / 3) * Math.PI) * 0.12 * w
      const r = w * (0.28 + 0.12 * hash(i, j, 86))
      const g = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r)
      g.addColorStop(0, rgba(body, 0.55 * has))
      g.addColorStop(0.6, rgba(body, 0.35 * has))
      g.addColorStop(1, rgba(body, 0))
      ctx.fillStyle = g
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      // The underside, lit.
      const u = ctx.createRadialGradient(cx, cy + r * 0.35, 0, cx, cy + r * 0.35, r * 0.7)
      u.addColorStop(0, rgba(lit, 0.3 * has))
      u.addColorStop(1, rgba(lit, 0))
      ctx.fillStyle = u
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
  }
}

/**
 * The city across the street, low in the pane: two rows of roofs, the far one paler. Its windows come on through the
 * dusk and go out, one by one, through the night; a few are the cool flicker of a screen. On the tallest roof a red
 * light blinks.
 */
function city(ctx: Ctx, t: number, sky: { low: string; dusk: number }): void {
  const n = nightAt(t)
  const far = mixHex('#2B2850', '#463E6E', sky.dusk)
  const near = mixHex('#17162C', '#2A2445', sky.dusk)
  let tallest = { x: 0, y: 0 }
  for (const [row, color, base, tall] of [[0, far, -1.9, 1.15], [1, near, -1.35, 0.85]] as const) {
    let x = GLASS.x0 - 0.3
    let i = 0
    while (x < GLASS.x1 + 0.3) {
      const w = 0.45 + hash(i, row, 7) * 0.7
      const h = 0.25 + hash(i, row, 11) * tall
      ctx.fillStyle = color
      ctx.fillRect(x, base - h, w, h + 2)
      if (row === 0 && base - h < tallest.y) tallest = { x: x + w / 2, y: base - h }
      // A water tank or a stair head on some roofs.
      if (hash(i, row, 17) < 0.3) ctx.fillRect(x + w * 0.2, base - h - 0.12, 0.14, 0.13)
      const cols = Math.max(1, Math.floor(w / 0.16))
      const rows = Math.max(1, Math.floor(h / 0.17))
      for (let a = 0; a < cols; a++) {
        for (let b = 0; b < rows; b++) {
          const key = hash(i * 31 + a, b + row * 17, 3)
          if (key > 0.26) continue
          const on = 4 + hash(i * 31 + a, b + row * 17, 9) * 110
          const out = 0.3 + hash(i * 31 + a, b + row * 17, 5) * 0.95
          if (t < on || n > out) continue
          const fade = Math.min(1, (t - on) * 2) * Math.min(1, (out - n) * 30)
          const screen = key < 0.035
          const flick = screen ? 0.75 + 0.25 * Math.sin(t * 7 + a * 3 + b) * Math.sin(t * 2.3 + i) : 1
          const c = screen ? '#9DB4F2' : hash(i, a + b, 19) < 0.3 ? '#F0A867' : '#F7C98A'
          ctx.fillStyle = rgba(c, (row ? 0.75 : 0.45) * fade * flick)
          ctx.fillRect(x + 0.06 + a * 0.16, base - h + 0.08 + b * 0.17, 0.065, 0.075)
        }
      }
      x += w + 0.02 + hash(i, row, 13) * 0.12
      i++
    }
  }
  // The red light on the tallest roof: on a little over half a second in every two.
  const blink = Math.max(0, Math.sin((t * Math.PI) / 1.1)) ** 3
  const g = ctx.createRadialGradient(tallest.x, tallest.y - 0.03, 0, tallest.x, tallest.y - 0.03, 0.08)
  g.addColorStop(0, rgba('#FF5A4E', 0.9 * blink))
  g.addColorStop(0.3, rgba('#FF5A4E', 0.35 * blink))
  g.addColorStop(1, rgba('#FF5A4E', 0))
  ctx.fillStyle = g
  ctx.fillRect(tallest.x - 0.15, tallest.y - 0.2, 0.3, 0.3)
  // The city's glow over the roofs.
  const glow = ctx.createLinearGradient(0, GLASS.y1 - 2.1, 0, GLASS.y1)
  glow.addColorStop(0, rgba('#B7779A', 0))
  glow.addColorStop(1, rgba('#B7779A', 0.1 * (1 - sky.dusk)))
  ctx.fillStyle = glow
  ctx.fillRect(GLASS.x0, GLASS.y1 - 2.1, W, 2.1)
}

/** The rain falling past: thin, faint, fast, slanting a little with the wind. As many as the weather has. */
function rain(ctx: Ctx, t: number): void {
  const count = 150 * rainAt(t)
  ctx.lineWidth = 0.012
  ctx.lineCap = 'round'
  const HH = H + 0.6
  for (let i = 0; i < 150; i++) {
    const a = Math.min(1, count - i)
    if (a <= 0) break
    const speed = 6.2 + hash(i, 1) * 2.4
    const len = 0.28 + hash(i, 2) * 0.3
    const y = GLASS.y0 - 0.3 + ((hash(i, 3) * HH + t * speed) % HH)
    const x = GLASS.x0 + hash(i, 4) * (W + 0.6) - 0.3 - (y - GLASS.y0) * 0.1
    ctx.strokeStyle = rgba('#B6C0E6', (0.08 + 0.09 * hash(i, 5)) * a)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - len * 0.1, y - len)
    ctx.stroke()
  }
}

const smoothStep = (x: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/**
 * The drops on the glass. Each bead gathers where it lands, sits, and some go: a bead's life is its own length, and at
 * its end it runs down the pane in fits and starts, leaving a faint wet line, and is gone; then it lands again
 * somewhere else. As the rain eases they stop landing, and those on the glass dry where they are.
 */
function drops(ctx: Ctx, t: number, rain: number): void {
  // The glass stays wet a while after the rain: how many beads there are follows the rain a minute behind.
  const wet = Math.max(rain, rainAt(t - 40) * 0.8, rainAt(t - 80) * 0.5)
  const count = 150 * wet
  for (let i = 0; i < 160; i++) {
    const a = Math.min(1, count - i)
    if (a <= 0) break
    const life = 26 + hash(i, 21) * 40
    const u = (t + hash(i, 22) * life) / life
    const k = Math.floor(u)
    const f = u - k
    const x0 = GLASS.x0 + 0.04 + hash(i, k, 23) * (W - 0.08)
    const y0 = GLASS.y0 + 0.1 + hash(i, k, 24) * (H - 0.2)
    const r = 0.012 + hash(i, k, 25) ** 2 * 0.03
    const runs = hash(i, k, 26) < 0.3 && r > 0.02 && rain > 0.15
    let size = r * Math.min(1, (f * life) / 2)
    let y = y0
    let x = x0
    let alpha = a
    if (runs) {
      const run = Math.max(0, (f - 0.72) / 0.28)
      if (run > 0) {
        const n = 3
        const s = run - Math.sin(2 * Math.PI * n * run) / (2 * Math.PI * n)
        const dist = Math.min(H - (y0 - GLASS.y0), 0.9 + hash(i, k, 27) * 1.8)
        y = y0 + s * dist
        x = x0 + Math.sin(s * 5 + i) * 0.02
        size *= 1 - 0.3 * run
        alpha *= 1 - smoothStep(run, 0.8, 1)
        ctx.strokeStyle = rgba('#6F78A6', 0.3 * alpha)
        ctx.lineWidth = size * 0.9
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
    } else {
      alpha *= 1 - smoothStep(f, 0.92, 1)
    }
    if (size < 0.004) continue
    const warm = Math.max(0, Math.min(1, (x - GLASS.x0) / W))
    ctx.fillStyle = rgba(mixHex('#8790BE', '#C69A86', warm * 0.55), 0.32 * alpha)
    ctx.beginPath()
    ctx.ellipse(x, y, size * 0.82, size, 0, 0, Math.PI * 2)
    ctx.fill()
    if (size > 0.02) {
      ctx.fillStyle = rgba(mixHex('#D3D7F5', '#F4C799', warm), 0.5 * alpha)
      ctx.beginPath()
      ctx.arc(x + size * 0.25, y - size * 0.4, size * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
