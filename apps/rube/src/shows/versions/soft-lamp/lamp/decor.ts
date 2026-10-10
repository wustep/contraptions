import { mixHex } from '../../../../parts'
import { CURTAIN, NOTES, ROD, WINDOW } from './desk'
import { MUSIC_END, TRACKS, barTime, heldAt, smooth, snareAt, trackAt } from './music'
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
 * - Polaroids and a note pinned to the wall in the lamp's light.
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
  // Over the wall right of the window, a drape that comes well down into the home frame (not a sliver at its top) and
  // clears the clock under it.
  [WINDOW.x1 - 0.05, WINDOW.y0 + 0.08, 2.75, -4.95, 0.75],
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

/** Where each bulb is and how bright at `t`, for the room's light (`light.ts`). */
export const bulbsAt = (t: number): { x: number; y: number; a: number }[] => BULBS.map((b) => ({ x: b.x, y: b.y, a: bulbAt(b, t) }))

/** How much light the fairy lights give the wall under them, 0 to 1 (for the wall's own glow). */
export const fairyGlowAt = (t: number): number => (BULBS.length ? bulbAt(BULBS[Math.floor(BULBS.length / 2)], t) : 0)

/* ------------------------------------------------------------------ the wall */

/** Two polaroids and a note, pinned up between the window and the lamp. */
export function notes(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const pieces: { x: number; y: number; w: number; h: number; rot: number; kind: 'photo' | 'note'; tint: string; art: string }[] = [
    { x: NOTES.x0 + 0.04, y: NOTES.y0 + 0.08, w: 0.42, h: 0.5, rot: -0.08, kind: 'photo', tint: '#F09A7C', art: '#5B4A86' },
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
  // Deeper at the edges, and cool: the room's corners in the dark, so the lamp's pool is the one warm place.
  g.addColorStop(0, 'rgba(10, 10, 32, 0)')
  g.addColorStop(0.55, 'rgba(10, 10, 32, 0.16)')
  g.addColorStop(1, 'rgba(10, 10, 32, 0.64)')
  ctx.fillStyle = g
  ctx.fillRect(-r * 1.1, -r * 1.1 / ((v.y1 - v.y0) / (v.x1 - v.x0) * 1.5), r * 2.2, (r * 2.2) / ((v.y1 - v.y0) / (v.x1 - v.x0) * 1.5))
  ctx.restore()
}

/**
 * Behind the now-playing line, while it is up: a soft dark wash across the top middle of the picture, as a stream puts
 * under its words, so the cream type never stands on the window's cream bars. The type is the page's; this is only
 * what it stands on. `light` is how far the card is up (0 to 1); `at` where its top middle sits in the 16:9 frame.
 * Live and in a recording, in Follow and in Zoom; not in the overview, nor in a still, which show no words.
 */
export function scrim(ctx: Ctx, light: number, at: [number, number], frame: number): void {
  if (light <= 0.001) return
  const v = viewOf(ctx)
  const w = v.x1 - v.x0
  // The 16:9 box the card is placed in, middle of the stage.
  const bh = (w * 9) / 16
  // The stage's overview (the whole room, far wider than the camera's frame `frame`, in cells top to bottom) shows no
  // words, so nothing to stand them on.
  if (bh > frame * 1.3) return
  // Nor in a still (a saved picture, a share card): the stage paints a still with no words, in a frame of its own
  // that is never shown; a video's frame is shown, and has the words painted over it.
  const holder = (ctx.canvas as HTMLCanvasElement).closest?.('.show-frame') as HTMLElement | null
  if (holder?.hidden) return
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
  ctx.globalAlpha = 0.36
  ctx.fillRect(-ox, -oy, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}


/** The snare the far cup plays, each how hard. */
const SNARES: { t: number; h: number }[] = (() => {
  const out: { t: number; h: number }[] = []
  for (const tr of TRACKS) {
    for (const run of tr.runs) {
      for (let i = run.from; i < run.to; i++) {
        for (let q = 0; q < 4; q++) {
          const g = barTime(tr, i, q)
          const k = snareAt(tr, g)
          if (k >= 0.45) out.push({ t: g, h: Math.min(1, k) })
        }
      }
    }
  }
  return out.sort((a, b) => a.t - b.t)
})()

/** How far the far cup's cushion is pressed at `t` (cells): a small give on each snare, as hard as it was struck. */
export function farPress(t: number): number {
  let d = 0
  for (const b of recent(SNARES, t)) d += b.h * 0.12 * Math.exp(-((b.s / 0.06) ** 2))
  return d
}

/** Of `beats`, those in the last second and a half: how hard each pushes the air (cells), and how long ago. */
function recent(beats: { t: number; h: number }[], t: number): { h: number; s: number }[] {
  const out: { h: number; s: number }[] = []
  let lo = 0
  let hi = beats.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (beats[m].t <= t) lo = m + 1
    else hi = m
  }
  for (let i = lo - 1; i >= 0 && t - beats[i].t < 1.5; i--) out.push({ h: 0.2 * beats[i].h, s: t - beats[i].t })
  return out
}
