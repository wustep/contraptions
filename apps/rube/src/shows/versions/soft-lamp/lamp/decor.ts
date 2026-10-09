import { mixHex } from '../../../../parts'
import { CLOCK, CURTAIN, NOTES, PRINT, ROD, WINDOW } from './desk'
import { MUSIC_END, barTime, heldAt, smooth, trackAt } from './music'
import { rgba, viewOf } from './canvas'
import { INK, LAMP_ON, MOUTH, hash, lampAt, lampColor, lightAt, lit, rainAt, skyAt } from './world'

/**
 * What makes the room a room someone lives in, and the picture's finish.
 *
 * - The curtain, tied back on the window's left, on its rod, its loose fall stirring in the draught off the window
 *   (the one the plant on the sill feels), more while it rains.
 * - The fairy lights strung across the top of the window in two swags and along the wall: they come on, bulb by bulb,
 *   just after the lamp, and breathe with the held sound (the pad and the keys), each at its own pace; in a track's
 *   break, when the drums drop out, a slow wave runs along them.
 * - Polaroids and notes pinned to the wall in the lamp's light; a small print on the far wall.
 * - Over everything: the lamp's bloom, a vignette, and a film's grain, so the picture has the soft, worn finish of the
 *   streams it is in the manner of.
 */

type Ctx = CanvasRenderingContext2D

/* ------------------------------------------------------------------ the curtain */

/**
 * How far the curtain's hem is blown from where it hangs at `t` (cells, out into the room, so negative): a draught off
 * the cold glass, two slow swells that never line up and a slower gusting under them, twice as strong in the rain.
 */
export function draughtAt(t: number): number {
  const wave = 0.6 * Math.sin(t * 0.53) + 0.4 * Math.sin(t * 1.21 + 1.3)
  const gust = 0.65 + 0.35 * Math.sin(t * 0.097 + 0.8)
  const strength = 0.45 + 0.55 * rainAt(t)
  return -0.11 * strength * gust * (0.5 + 0.5 * wave)
}

export function curtain(ctx: Ctx, lw: number, t: number): void {
  const sky = skyAt(t)
  const lamp = lampAt(t)
  const { x0, x1, tie, hem } = CURTAIN
  const top = ROD.y + 0.06
  const waist = { x0: x0 + 0.08, x1: x0 + 0.5 }
  // Below the tie it is loose, and the draught takes it: more the further down, the hem lifting a little as it goes.
  const d = draughtAt(t)
  const lift = Math.abs(d) * 0.25
  // The window's side of it is caught first, the wall's side follows a beat behind.
  const dw = draughtAt(t - 0.5)
  // Gathered at the rod, drawn in at the tie, falling loose below it.
  const shape = () => {
    ctx.beginPath()
    ctx.moveTo(x0, top)
    ctx.lineTo(x1, top)
    ctx.bezierCurveTo(x1 - 0.05, top + 1.2, waist.x1 + 0.1, tie - 0.6, waist.x1, tie)
    ctx.bezierCurveTo(waist.x1 + 0.05 + d * 0.35, tie + 0.5, x0 + 0.68 + d * 0.85, hem - 0.2 - lift * 0.5, x0 + 0.72 + d, hem - lift)
    ctx.quadraticCurveTo(x0 + 0.36 + (d + dw) / 2, hem + 0.06 - lift * 0.6, x0 - 0.02 + dw * 0.8, hem - lift * 0.3)
    ctx.bezierCurveTo(x0 + 0.02 + dw * 0.5, tie + 0.4, waist.x0 - 0.04, tie + 0.1, waist.x0, tie)
    ctx.bezierCurveTo(waist.x0 - 0.05, tie - 0.8, x0 - 0.02, top + 1, x0, top)
    ctx.closePath()
  }
  shape()
  const base = mixHex('#4E3A5E', '#7A5378', sky.dusk * 0.6)
  const l = lightAt(x1, -2.5, 1) * lamp
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  // Its folds: light and shade across it, the edge toward the window lit by the sky.
  const folds = 9
  for (let i = 0; i <= folds; i++) {
    const u = i / folds
    const fold = 0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 3.2)
    const c = mixHex(mixHex(base, '#2A2140', 0.45 * fold), mixHex(sky.low, '#F2B57A', l), 0.12 + 0.28 * u * u)
    g.addColorStop(u, c)
  }
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = lw
  ctx.stroke()
  // The fold lines, faint.
  ctx.save()
  shape()
  ctx.clip()
  ctx.strokeStyle = rgba('#1E1830', 0.35)
  ctx.lineWidth = lw * 0.5
  for (let i = 1; i < 5; i++) {
    const a = x0 + ((x1 - x0) * i) / 5
    const b = waist.x0 + ((waist.x1 - waist.x0) * i) / 5
    const u = i / 5
    const c = x0 + 0.72 * u + dw * 0.8 + (d - dw * 0.8) * u
    ctx.beginPath()
    ctx.moveTo(a, top)
    ctx.quadraticCurveTo((a + b) / 2, (top + tie) / 2 + 0.3, b, tie)
    ctx.quadraticCurveTo((b + c) / 2 - 0.02, (tie + hem) / 2, c, hem - lift * (0.3 + 0.7 * u))
    ctx.stroke()
  }
  ctx.restore()
  // The tie: a band round its waist.
  ctx.beginPath()
  ctx.ellipse((waist.x0 + waist.x1) / 2, tie, (waist.x1 - waist.x0) / 2 + 0.04, 0.05, 0, 0, Math.PI * 2)
  ctx.fillStyle = mixHex('#B07A5A', '#E2A76F', l)
  ctx.fill()
  ctx.stroke()
  // The rod, over the window and past it, and its ends.
  ctx.beginPath()
  ctx.moveTo(ROD.x0, ROD.y)
  ctx.lineTo(ROD.x1, ROD.y)
  ctx.lineWidth = 0.06
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.lineWidth = 0.06 - lw * 2
  ctx.strokeStyle = mixHex('#5C4A3C', '#B98A5C', lightAt(ROD.x1, ROD.y, 1) * lamp)
  ctx.stroke()
  for (const x of [ROD.x0, ROD.x1]) {
    ctx.beginPath()
    ctx.arc(x, ROD.y, 0.06, 0, Math.PI * 2)
    ctx.fillStyle = '#6E5A48'
    ctx.fill()
    ctx.lineWidth = lw
    ctx.strokeStyle = INK
    ctx.stroke()
  }
  // Its rings on the rod.
  for (let i = 0; i < 6; i++) {
    const x = x0 + 0.06 + i * ((x1 - x0 - 0.12) / 5)
    ctx.beginPath()
    ctx.ellipse(x, ROD.y + 0.02, 0.04, 0.06, 0, 0, Math.PI * 2)
    ctx.lineWidth = lw * 0.6
    ctx.stroke()
  }
}

/* ------------------------------------------------------------------ the fairy lights */

interface Bulb {
  x: number
  y: number
  i: number
  color: string
}

/** Where the string hangs: swags between hooks, sagging as far as each says. */
const SWAGS: [number, number, number, number, number][] = [
  // x0, y0, x1, y1, sag
  // Deep enough to hang into the room's frames as a drape, not glows cut off by their top edge.
  [WINDOW.x0 + 0.05, WINDOW.y0 + 0.08, WINDOW.mullion, WINDOW.y0 + 0.08, 1.45],
  [WINDOW.mullion, WINDOW.y0 + 0.08, WINDOW.x1 - 0.05, WINDOW.y0 + 0.08, 1.25],
  [WINDOW.x1 - 0.05, WINDOW.y0 + 0.08, 2.75, -4.95, 0.45],
]
/** A point along a swag, `u` 0 to 1: a parabola from hook to hook, `sag` below the chord at its middle. */
function swagAt(s: [number, number, number, number, number], u: number): { x: number; y: number } {
  const [x0, y0, x1, y1, sag] = s
  return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u + 4 * sag * u * (1 - u) }
}

const COLORS = ['#FFD9A0', '#FFC27E', '#FFB0A0', '#FFE7BC', '#FFC27E']
const BULBS: Bulb[] = (() => {
  const out: Bulb[] = []
  let i = 0
  for (const s of SWAGS) {
    const len = Math.hypot(s[2] - s[0], s[3] - s[1]) + s[4] * 1.4
    const n = Math.round(len / 0.3)
    for (let j = 1; j < n; j++) {
      const p = swagAt(s, j / n)
      out.push({ x: p.x, y: p.y, i, color: COLORS[i % COLORS.length] })
      i++
    }
  }
  return out
})()

/** How far into a break the music is, 0 to 1: the bars between two of a track's runs of drums, eased in and out. */
export function breakAt(t: number): number {
  const tr = trackAt(t)
  let v = 0
  for (let i = 0; i + 1 < tr.runs.length; i++) {
    const a = barTime(tr, tr.runs[i].to)
    const b = barTime(tr, tr.runs[i + 1].from)
    v = Math.max(v, smooth(t, a - tr.period, a + tr.period) * (1 - smooth(t, b - tr.period, b)))
  }
  return v
}

/** When the lights come on: bulb by bulb along the string, a moment after the lamp. */
const LIGHTS_ON = LAMP_ON + 2.4

/** How bright bulb `b` is at `t`, 0 to 1. */
function bulbAt(b: Bulb, t: number): number {
  const on = smooth(t, LIGHTS_ON + b.i * 0.07, LIGHTS_ON + b.i * 0.07 + 0.35)
  // A flicker as each catches.
  const catching = t > LIGHTS_ON + b.i * 0.07 && t < LIGHTS_ON + b.i * 0.07 + 0.35 ? 0.6 + 0.4 * Math.sin(t * 90 + b.i) : 1
  // They go down last, after the lamp, from the far end back, to a low glow by the moon.
  const off = 1 - 0.6 * smooth(t, MUSIC_END + 1 + (BULBS.length - b.i) * 0.05, MUSIC_END + 2.2 + (BULBS.length - b.i) * 0.05)
  const breathe = 0.62 + 0.26 * heldAt(t) + 0.12 * Math.sin(t * (0.35 + hash(b.i, 41) * 0.5) + hash(b.i, 42) * 6.3)
  // In a break, when the drums drop out and the music opens up, a slow wave runs along the string.
  const wave = 0.28 * breakAt(t) * Math.sin(2 * Math.PI * (t / 3.2 - b.i / 14))
  return on * catching * off * Math.max(0.15, breathe + wave)
}

export function fairyLights(ctx: Ctx, lw: number, t: number): void {
  // The wire.
  ctx.strokeStyle = rgba('#141020', 0.9)
  ctx.lineWidth = lw * 0.45
  for (const s of SWAGS) {
    ctx.beginPath()
    for (let j = 0; j <= 24; j++) {
      const p = swagAt(s, j / 24)
      if (j === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  // The bulbs, each with its glow.
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const b of BULBS) {
    const a = bulbAt(b, t)
    if (a < 0.01) continue
    const g = ctx.createRadialGradient(b.x, b.y + 0.03, 0, b.x, b.y + 0.03, 0.32)
    g.addColorStop(0, rgba(b.color, 0.42 * a))
    g.addColorStop(0.35, rgba(b.color, 0.12 * a))
    g.addColorStop(1, rgba(b.color, 0))
    ctx.fillStyle = g
    ctx.fillRect(b.x - 0.35, b.y - 0.32, 0.7, 0.7)
  }
  ctx.restore()
  for (const b of BULBS) {
    const a = bulbAt(b, t)
    ctx.beginPath()
    ctx.ellipse(b.x, b.y + 0.035, 0.022, 0.032, 0, 0, Math.PI * 2)
    ctx.fillStyle = mixHex('#5A4A44', mixHex(b.color, '#FFFFFF', 0.4), a)
    ctx.fill()
    ctx.fillStyle = '#1D1826'
    ctx.fillRect(b.x - 0.012, b.y - 0.006, 0.024, 0.016)
  }
}

/** How much light the fairy lights give the wall under them, 0 to 1 (for the wall's own glow). */
export const fairyGlowAt = (t: number): number => (BULBS.length ? bulbAt(BULBS[Math.floor(BULBS.length / 2)], t) : 0)

/* ------------------------------------------------------------------ the wall */

/** Polaroids and notes, pinned up between the window and the lamp. */
export function notes(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const pieces: { x: number; y: number; w: number; h: number; rot: number; kind: 'photo' | 'note'; tint: string; art: string }[] = [
    { x: NOTES.x0 + 0.04, y: NOTES.y0 + 0.08, w: 0.42, h: 0.5, rot: -0.08, kind: 'photo', tint: '#F09A7C', art: '#5B4A86' },
    { x: NOTES.x0 + 0.52, y: NOTES.y0 + 0.02, w: 0.42, h: 0.5, rot: 0.06, kind: 'photo', tint: '#7FB6C9', art: '#2F5A6E' },
    { x: NOTES.x0 + 1.06, y: NOTES.y0 + 0.14, w: 0.34, h: 0.34, rot: -0.04, kind: 'note', tint: '#E9C46A', art: '' },
    { x: NOTES.x0 + 0.36, y: NOTES.y0 + 0.6, w: 0.3, h: 0.3, rot: 0.1, kind: 'note', tint: '#E89AAE', art: '' },
    { x: NOTES.x0 + 0.86, y: NOTES.y0 + 0.5, w: 0.42, h: 0.38, rot: -0.05, kind: 'photo', tint: '#B9A0D9', art: '#E5A86E' },
  ]
  for (const p of pieces) {
    const cx = p.x + p.w / 2
    const cy = p.y + p.h / 2
    const l = Math.min(1, lightAt(cx, cy, 1) * lamp * 1.25)
    const dim = (c: string) => lit(mixHex(c, '#1E1A30', 0.72), c, l)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(p.rot)
    // Its shadow on the wall.
    ctx.fillStyle = rgba('#120E1C', 0.35 * (0.3 + l))
    ctx.fillRect(-p.w / 2 + 0.025, -p.h / 2 + 0.03, p.w, p.h)
    ctx.fillStyle = dim(p.kind === 'photo' ? '#EEE6D6' : p.tint)
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
    ctx.strokeStyle = INK
    ctx.lineWidth = lw * 0.6
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h)
    if (p.kind === 'photo') {
      // A small picture: a sky over a horizon, the sun or the moon in it.
      const iw = p.w - 0.07
      const ih = p.h - 0.16
      const ix = -iw / 2
      const iy = -p.h / 2 + 0.035
      const g = ctx.createLinearGradient(0, iy, 0, iy + ih)
      g.addColorStop(0, dim(p.art))
      g.addColorStop(1, dim(p.tint))
      ctx.fillStyle = g
      ctx.fillRect(ix, iy, iw, ih)
      ctx.fillStyle = dim(mixHex(p.art, '#1A1626', 0.5))
      ctx.beginPath()
      ctx.moveTo(ix, iy + ih)
      ctx.lineTo(ix, iy + ih * 0.72)
      ctx.quadraticCurveTo(ix + iw * 0.35, iy + ih * 0.55, ix + iw * 0.6, iy + ih * 0.7)
      ctx.quadraticCurveTo(ix + iw * 0.8, iy + ih * 0.78, ix + iw, iy + ih * 0.66)
      ctx.lineTo(ix + iw, iy + ih)
      ctx.fill()
      ctx.fillStyle = dim('#FFF0D0')
      ctx.beginPath()
      ctx.arc(ix + iw * 0.68, iy + ih * 0.35, 0.035, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // A few lines of writing, as marks.
      ctx.strokeStyle = rgba('#3A2E3E', 0.45)
      ctx.lineWidth = 0.012
      for (let k = 0; k < 3; k++) {
        ctx.beginPath()
        ctx.moveTo(-p.w / 2 + 0.05, -p.h / 2 + 0.09 + k * 0.07)
        ctx.lineTo(p.w / 2 - 0.05 - (k === 2 ? 0.1 : 0), -p.h / 2 + 0.09 + k * 0.07)
        ctx.stroke()
      }
    }
    // The pin.
    ctx.beginPath()
    ctx.arc(0, -p.h / 2 + 0.03, 0.022, 0, Math.PI * 2)
    ctx.fillStyle = dim(p.kind === 'photo' ? '#D9605A' : '#5A8FA8')
    ctx.fill()
    ctx.restore()
  }
}

/** A small framed print on the far wall: a wave under a low sun, in the room's two colours. */
export function print(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const { x0, x1, y0, y1 } = PRINT
  const l = Math.min(1, lightAt((x0 + x1) / 2, (y0 + y1) / 2, 1) * lamp * 1.5 + 0.08)
  const dim = (c: string) => lit(mixHex(c, '#1E1A30', 0.7), c, l)
  ctx.fillStyle = rgba('#120E1C', 0.4)
  ctx.fillRect(x0 + 0.04, y0 + 0.05, x1 - x0, y1 - y0)
  ctx.fillStyle = dim('#3A2A22')
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  ctx.strokeStyle = INK
  ctx.lineWidth = lw
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
  const m = 0.1
  const ix0 = x0 + m
  const iy0 = y0 + m
  const iw = x1 - x0 - 2 * m
  const ih = y1 - y0 - 2 * m
  ctx.fillStyle = dim('#EDE2CC')
  ctx.fillRect(ix0, iy0, iw, ih)
  const pad = 0.07
  const g = ctx.createLinearGradient(0, iy0 + pad, 0, iy0 + ih - pad)
  g.addColorStop(0, dim('#6D5D9E'))
  g.addColorStop(0.6, dim('#E59A86'))
  g.addColorStop(1, dim('#F2C38A'))
  ctx.fillStyle = g
  ctx.fillRect(ix0 + pad, iy0 + pad, iw - 2 * pad, ih - 2 * pad)
  ctx.fillStyle = dim('#FFE2B0')
  ctx.beginPath()
  ctx.arc(ix0 + iw * 0.5, iy0 + ih * 0.58, 0.11, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = dim('#3E4E86')
  ctx.beginPath()
  ctx.moveTo(ix0 + pad, iy0 + ih - pad)
  ctx.lineTo(ix0 + pad, iy0 + ih * 0.62)
  for (let k = 0; k <= 8; k++) {
    const u = k / 8
    ctx.lineTo(ix0 + pad + u * (iw - 2 * pad), iy0 + ih * 0.62 + Math.sin(u * Math.PI * 3) * 0.025)
  }
  ctx.lineTo(ix0 + iw - pad, iy0 + ih - pad)
  ctx.fill()
  ctx.strokeStyle = rgba(INK, 0.6)
  ctx.lineWidth = lw * 0.5
  ctx.strokeRect(ix0 + pad, iy0 + pad, iw - 2 * pad, ih - 2 * pad)
}

/* ------------------------------------------------------------------ the finish */

/** The lamp's bloom: the bulb seen through the air, soft, over everything near it. */
export function bloom(ctx: Ctx, t: number): void {
  const on = lampAt(t)
  if (on < 0.02) return
  const warm = lampColor(t)
  const x = MOUTH.x + MOUTH.ux * 0.12
  const y = MOUTH.y + MOUTH.uy * 0.12
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, 1.6)
  g.addColorStop(0, rgba(warm, 0.3 * on))
  g.addColorStop(0.25, rgba(warm, 0.08 * on))
  g.addColorStop(1, rgba(warm, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - 1.7, y - 1.7, 3.4, 3.4)
  ctx.restore()
}


/** The vignette: the frame's corners a little darker and cooler, so the eye rests in the middle where the lamp is. */
export function vignette(ctx: Ctx): void {
  const v = viewOf(ctx)
  const cx = (v.x0 + v.x1) / 2
  const cy = (v.y0 + v.y1) / 2
  const r = Math.hypot(v.x1 - v.x0, v.y1 - v.y0) / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, (v.y1 - v.y0) / (v.x1 - v.x0) * 1.5)
  const g = ctx.createRadialGradient(0, 0, r * 0.45, 0, 0, r * 1.02)
  g.addColorStop(0, 'rgba(14, 10, 30, 0)')
  g.addColorStop(1, 'rgba(14, 10, 30, 0.5)')
  ctx.fillStyle = g
  ctx.fillRect(-r * 1.1, -r * 1.1 / ((v.y1 - v.y0) / (v.x1 - v.x0) * 1.5), r * 2.2, (r * 2.2) / ((v.y1 - v.y0) / (v.x1 - v.x0) * 1.5))
  ctx.restore()
}

/**
 * Behind the now-playing line, while it is up: a soft dark wash across the top middle of the picture, as a stream puts
 * under its words, so the cream type never stands on the window's cream bars. The type is the page's; this is only
 * what it stands on. `light` is how far the card is up (0 to 1); `at` where its top middle sits in the 16:9 frame.
 */
export function scrim(ctx: Ctx, light: number, at: [number, number]): void {
  if (light <= 0.001) return
  const v = viewOf(ctx)
  const w = v.x1 - v.x0
  // The 16:9 box the card is placed in, middle of the stage.
  const bh = (w * 9) / 16
  const by0 = (v.y0 + v.y1) / 2 - bh / 2
  const cx = v.x0 + w * at[0]
  const cy = by0 + bh * (at[1] + 0.035)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(w * 0.3, bh * 0.07)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(14, 10, 30, ${(0.5 * light).toFixed(3)})`)
  g.addColorStop(0.6, `rgba(14, 10, 30, ${(0.32 * light).toFixed(3)})`)
  g.addColorStop(1, 'rgba(14, 10, 30, 0)')
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

/** A few tiles of film grain, made once, one shown at a time. */
let tiles: CanvasPattern[] | null = null
function grainTiles(ctx: Ctx): CanvasPattern[] {
  if (tiles) return tiles
  tiles = []
  for (let n = 0; n < 6; n++) {
    const c = document.createElement('canvas')
    c.width = 160
    c.height = 160
    const g = c.getContext('2d')!
    const img = g.createImageData(160, 160)
    for (let i = 0; i < 160 * 160; i++) {
      const v = hash(i, n, 131)
      const on = v < 0.5
      const s = on ? 255 : 0
      img.data[i * 4] = s
      img.data[i * 4 + 1] = s
      img.data[i * 4 + 2] = s
      img.data[i * 4 + 3] = Math.floor(hash(i, n, 137) * 26)
    }
    g.putImageData(img, 0, 0)
    tiles.push(ctx.createPattern(c, 'repeat')!)
  }
  return tiles
}

/** The grain: a different tile a dozen times a second, over the whole frame, in the canvas's own pixels. */
export function grain(ctx: Ctx, t: number): void {
  if (typeof document === 'undefined') return
  const all = grainTiles(ctx)
  const k = Math.floor(t * 12)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const ox = Math.floor(hash(k, 1, 141) * 160)
  const oy = Math.floor(hash(k, 2, 141) * 160)
  ctx.translate(ox, oy)
  ctx.fillStyle = all[k % all.length]
  ctx.globalAlpha = 0.55
  ctx.fillRect(-ox, -oy, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}


/* ------------------------------------------------------------------ the street */

/**
 * Now and then at night a car goes by below, and its lights come up through the window and sweep across the wall:
 * the window's own shape, its bars in it, pale and cool, moving over the wall and the things pinned to it in a few
 * seconds and gone. In the rain it is freckled with the drops on the glass. Each at its own time, roughly every minute
 * and a half once it is dark.
 */
export const SWEEPS: number[] = (() => {
  const out: number[] = []
  let at = 160
  for (let k = 0; at < MUSIC_END - 20; k++) {
    out.push(at)
    at += 70 + hash(k, 151) * 60
  }
  return out
})()
const SWEEP_DUR = 4.2

/** Where the sweep is on the wall at `t` and how bright, 0 to 1 (for the cat, who looks). */
export function sweepAt(t: number): { x: number; y: number; a: number } {
  let i = SWEEPS.length - 1
  while (i >= 0 && SWEEPS[i] > t) i--
  const dark = smooth(t, 120, 300)
  if (i < 0 || dark <= 0) return { x: 0, y: 0, a: 0 }
  const s = (t - SWEEPS[i]) / SWEEP_DUR
  if (s < 0 || s > 1) return { x: 0, y: 0, a: 0 }
  const dir = hash(i, 152) < 0.5 ? 1 : -1
  const u = dir > 0 ? s : 1 - s
  return { x: WINDOW.x1 + 0.15 + u * 7.4, y: -2.6, a: dark * Math.sin(Math.PI * s) }
}

export function headlights(ctx: Ctx, t: number): void {
  const dark = smooth(t, 120, 300)
  let i = SWEEPS.length - 1
  while (i >= 0 && SWEEPS[i] > t) i--
  if (i < 0 || dark <= 0) return
  const s = (t - SWEEPS[i]) / SWEEP_DUR
  if (s > 1) return
  // Leftward or rightward, as the car goes.
  const dir = hash(i, 152) < 0.5 ? 1 : -1
  const u = dir > 0 ? s : 1 - s
  const x = WINDOW.x1 - 0.6 + u * 7.4
  const a = 0.13 * dark * Math.sin(Math.PI * s) ** 1.5
  const w = 1.5
  const skew = 0.9 * dir
  const top = -5.6
  const bottom = 0
  ctx.save()
  // Only on the wall: not on the window, not below the desk.
  ctx.beginPath()
  ctx.rect(WINDOW.x1, top - 1, 9, bottom - top + 1)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  const quad = (x0: number, x1: number) => {
    ctx.beginPath()
    ctx.moveTo(x0 + skew, top)
    ctx.lineTo(x1 + skew, top)
    ctx.lineTo(x1, bottom)
    ctx.lineTo(x0, bottom)
    ctx.closePath()
  }
  const g = ctx.createLinearGradient(x - 0.3, 0, x + w + 0.3, 0)
  g.addColorStop(0, 'rgba(200, 212, 255, 0)')
  g.addColorStop(0.2, `rgba(200, 212, 255, ${a.toFixed(3)})`)
  g.addColorStop(0.8, `rgba(200, 212, 255, ${a.toFixed(3)})`)
  g.addColorStop(1, 'rgba(200, 212, 255, 0)')
  ctx.fillStyle = g
  quad(x - 0.3, x + w + 0.3)
  ctx.fill()
  ctx.restore()
  // The window's bars, as darker lines through it; and, in the rain, the drops.
  ctx.save()
  ctx.beginPath()
  ctx.rect(WINDOW.x1, top - 1, 9, bottom - top + 1)
  ctx.clip()
  quad(x - 0.3, x + w + 0.3)
  ctx.clip()
  ctx.strokeStyle = `rgba(20, 16, 36, ${(a * 1.6).toFixed(3)})`
  ctx.lineWidth = 0.07
  ctx.beginPath()
  const mid = x + w / 2
  ctx.moveTo(mid + skew, top)
  ctx.lineTo(mid, bottom)
  const ty = -3.2
  ctx.moveTo(x - 0.3 + skew * ((ty - bottom) / (top - bottom)), ty)
  ctx.lineTo(x + w + 0.3 + skew * ((ty - bottom) / (top - bottom)), ty)
  ctx.stroke()
  const rain = rainAt(t)
  if (rain > 0.1) {
    ctx.fillStyle = `rgba(20, 16, 36, ${(a * 1.4 * rain).toFixed(3)})`
    for (let k = 0; k < 40; k++) {
      const fy = top + hash(k, i, 153) * (bottom - top)
      const fx = x + hash(k, i, 154) * w + skew * ((fy - bottom) / (top - bottom))
      ctx.beginPath()
      ctx.arc(fx, fy, 0.02 + hash(k, i, 155) * 0.025, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/**
 * Dust in the lamp's light: a few motes drifting slowly where the light is, each catching it as it turns, gone where
 * the light is not. The one thing in the frame that moves when nothing else does.
 */
export function motes(ctx: Ctx, t: number): void {
  const on = lampAt(t)
  if (on < 0.05) return
  const warm = lampColor(t)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 34; i++) {
    // Each drifts on its own slow loop round a home in the lamp's reach, and sinks a little and rises again.
    const hx = MOUTH.x - 2.4 + hash(i, 161) * 3.6
    const hy = MOUTH.y + 0.1 + hash(i, 162) * 2.0
    const sp = 0.05 + hash(i, 163) * 0.08
    const x = hx + Math.sin(t * sp + hash(i, 164) * 6.3) * 0.5 + Math.sin(t * sp * 2.3 + i) * 0.12
    const y = hy + Math.cos(t * sp * 0.8 + hash(i, 165) * 6.3) * 0.35 + Math.sin(t * 0.21 + i) * 0.05
    if (y > -0.05) continue
    const l = lightAt(x, y)
    const glint = 0.35 + 0.65 * Math.max(0, Math.sin(t * (0.8 + hash(i, 166) * 1.5) + i * 2.1)) ** 3
    const a = 0.42 * on * l * glint
    if (a < 0.02) continue
    const r = 0.007 + hash(i, 167) * 0.01
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3)
    g.addColorStop(0, rgba(mixHex(warm, '#FFFFFF', 0.5), a))
    g.addColorStop(0.35, rgba(warm, a * 0.4))
    g.addColorStop(1, rgba(warm, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the clock */

/** The show starts at 11:41 at night, by the clock on the wall. */
const CLOCK_START = (23 * 60 + 41) * 60 + 12

/**
 * The clock: it keeps the show's own time from 11:41 at night, so midnight passes in the eighth track. Its second hand
 * ticks, each second a small step with a settle in it, as a quartz hand does: the one thing in the room that moves
 * on the second.
 */
export function clock(ctx: Ctx, lw: number, t: number): void {
  const { x, y, r } = CLOCK
  const lamp = lampAt(t)
  const l = Math.min(1, lightAt(x, y, 1) * lamp * 1.5 + 0.12)
  const dim = (c: string) => lit(mixHex(c, '#1E1A30', 0.65), c, l)
  // Its shadow on the wall, and its rim and face.
  ctx.fillStyle = rgba('#120E1C', 0.35)
  ctx.beginPath()
  ctx.arc(x + 0.03, y + 0.04, r + 0.02, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = dim('#3E6E78')
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = lw
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, r - 0.035, 0, Math.PI * 2)
  ctx.fillStyle = dim('#EFE6D2')
  ctx.fill()
  ctx.lineWidth = lw * 0.5
  ctx.stroke()
  // The hours' marks.
  ctx.strokeStyle = rgba(INK, 0.7)
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2
    const r0 = h % 3 === 0 ? r - 0.085 : r - 0.065
    ctx.lineWidth = h % 3 === 0 ? 0.016 : 0.008
    ctx.beginPath()
    ctx.moveTo(x + Math.sin(a) * r0, y - Math.cos(a) * r0)
    ctx.lineTo(x + Math.sin(a) * (r - 0.05), y - Math.cos(a) * (r - 0.05))
    ctx.stroke()
  }
  const now = CLOCK_START + t
  const whole = Math.floor(now)
  const f = now - whole
  // A tick: the step in the first tenth of the second, a little past and back.
  const step = f < 0.12 ? 1 + Math.sin((f / 0.12) * Math.PI) * 0.08 - (1 - f / 0.12) * (1 - f / 0.12) : 1
  const sec = ((whole % 60) - 1 + Math.min(1, step)) / 60
  const min = (now % 3600) / 3600
  const hour = (now % 43200) / 43200
  const hand = (u: number, len: number, w: number, color: string) => {
    const a = u * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x - Math.sin(a) * len * 0.18, y + Math.cos(a) * len * 0.18)
    ctx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len)
    ctx.strokeStyle = color
    ctx.lineWidth = w
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  hand(hour, r * 0.5, 0.024, INK)
  hand(min, r * 0.74, 0.016, INK)
  hand(sec, r * 0.8, 0.007, '#C9534A')
  ctx.beginPath()
  ctx.arc(x, y, 0.016, 0, Math.PI * 2)
  ctx.fillStyle = '#C9534A'
  ctx.fill()
  // The glass's sheen.
  ctx.strokeStyle = rgba('#FFFFFF', 0.18)
  ctx.lineWidth = 0.014
  ctx.beginPath()
  ctx.arc(x, y, r - 0.07, Math.PI * 1.1, Math.PI * 1.45)
  ctx.stroke()
}
