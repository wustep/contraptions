import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { frame, hash, scenery, smooth } from '../kit'
import { RAILWAY } from '../worlds'

/**
 * The railway's night, drawn from show time wherever the camera is: the sky, the stars, the moon, and the plain out to
 * the horizon with its far trees and farms. EXPRESS's file; FIREWORKS's festival stands in it too, and draws its own
 * sky (smoke, bursts) over it. The near ground (the embankment, the track, the trestle's valley) is EXPRESS's part's.
 *
 * Everything here is far away, so it is laid out on the screen, not in the world: the moon and the stars hold their
 * place in the frame as the camera runs with the train, the horizon sits at the camera's eye (a little under the
 * frame's middle), and the far trees and farms slide by slower the further off they are. A pull-back does not shrink
 * them: only what is near gets smaller. `moonAt` and `horizonAt` say where they are for any part that needs them
 * (smoke across the moon, a set that stands on the far plain).
 */

interface Frame {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
}

/**
 * The moon's place on the screen (x and y as fractions of the frame, its diameter as a fraction of the frame's height),
 * by show time. High on the right while the train runs; for the trestle (phrase 14, the wide shot) it hangs big and low
 * behind the train's middle, so the whole train crosses its face; then back up on the right for the festival.
 */
function moonPlace(t: number): { x: number; y: number; d: number } {
  const wide = smooth(t, 113.2, 115.2) * (1 - smooth(t, 118.6, 120.6))
  return {
    x: 0.77 + (0.5 - 0.77) * wide,
    y: 0.23 + (0.335 - 0.23) * wide,
    d: 0.15 + (0.34 - 0.15) * wide,
  }
}

/** Where the horizon is on the screen, as a fraction of the frame from the top: the camera's eye, a little low. */
export const HORIZON = 0.53

/** The moon for the frame the stage is drawing: its middle and radius, in world cells. */
export function moonAt(p: p5, k: number, t: number): { x: number; y: number; r: number } {
  const f = frame(p, k)
  const m = moonPlace(t)
  const H = f.y1 - f.y0
  return { x: f.x0 + m.x * (f.x1 - f.x0), y: f.y0 + m.y * H, r: (m.d * H) / 2 }
}

/** The horizon's world y in the frame the stage is drawing. */
export function horizonAt(p: p5, k: number): number {
  const f = frame(p, k)
  return f.y0 + HORIZON * (f.y1 - f.y0)
}

/* ------------------------------------------------------------------ the drawing */

function sky(p: p5, k: number, f: Frame, hy: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, f.y0 * k, 0, hy * k)
  g.addColorStop(0, RAILWAY.sky)
  g.addColorStop(0.62, mixHex(RAILWAY.sky, RAILWAY.skyLow, 0.55))
  g.addColorStop(1, RAILWAY.skyLow)
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k - 2, f.y0 * k - 2, (f.x1 - f.x0) * k + 4, (hy - f.y0) * k + 4)
}

/** Stars: a few, of every size, fewest low down and near the moon, each breathing on its own slow clock. */
function stars(p: p5, k: number, f: Frame, t: number, hy: number, moon: { x: number; y: number; r: number }): void {
  const H = f.y1 - f.y0
  // Screen units: frame heights from the frame's middle. The stars drift a hair as the camera runs.
  const drift = f.cx * 0.0004
  const cell = 0.085
  const i0 = Math.floor((-1.0 + drift) / cell)
  const i1 = Math.ceil((1.0 + drift) / cell)
  const j0 = Math.floor(-0.55 / cell)
  const j1 = Math.ceil((HORIZON - 0.5) / cell)
  p.push()
  p.noStroke()
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      if (hash(i, j, 3) > 0.42) continue
      const sx = (i + hash(i, j, 5)) * cell - drift
      const sy = (j + hash(i, j, 7)) * cell
      const x = f.cx + sx * H
      const y = f.cy + sy * H
      if (x < f.x0 || x > f.x1 || y > hy - 0.03 * H) continue
      const dm = Math.hypot(x - moon.x, y - moon.y) / moon.r
      if (dm < 2.4) continue
      const low = smooth(y, hy - 0.25 * H, hy - 0.02 * H)
      const size = 0.0016 + 0.0034 * Math.pow(hash(i, j, 9), 2.6)
      const breath = 0.72 + 0.28 * Math.sin(t * (0.6 + hash(i, j, 11) * 1.4) + hash(i, j, 13) * 6.28)
      const a = (0.35 + 0.65 * hash(i, j, 15)) * breath * (1 - 0.8 * low) * Math.min(1, (dm - 2.4) / 1.5)
      const c = p.color(hash(i, j, 17) < 0.2 ? RAILWAY.lamp : RAILWAY.moon)
      c.setAlpha(255 * a)
      p.fill(c)
      p.circle(x * k, y * k, Math.max(1, size * H * k))
    }
  }
  p.pop()
}

/** The moon: a soft halo, the disc, its seas. No outline, no bright core: a wide pale thing, never a ball. */
function moon(p: p5, k: number, m: { x: number; y: number; r: number }): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const halo = ctx.createRadialGradient(m.x * k, m.y * k, m.r * 0.9 * k, m.x * k, m.y * k, m.r * 3.2 * k)
  halo.addColorStop(0, 'rgba(141, 156, 198, 0.32)')
  halo.addColorStop(0.35, 'rgba(141, 156, 198, 0.1)')
  halo.addColorStop(1, 'rgba(141, 156, 198, 0)')
  ctx.fillStyle = halo
  ctx.fillRect((m.x - m.r * 3.2) * k, (m.y - m.r * 3.2) * k, m.r * 6.4 * k, m.r * 6.4 * k)
  p.push()
  p.noStroke()
  p.fill(RAILWAY.moon)
  p.circle(m.x * k, m.y * k, m.r * 2 * k)
  // The seas: soft, irregular, the grey-blue of the halo.
  const sea = p.color(mixHex(RAILWAY.moon, RAILWAY.moonHalo, 0.42))
  sea.setAlpha(150)
  p.fill(sea)
  const blob = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
    const at = (i: number): [number, number] => {
      const a = (i / 14) * Math.PI * 2
      const w = 1 + 0.18 * Math.sin(a * 3 + seed) + 0.1 * Math.sin(a * 5 + seed * 2)
      return [(m.x + (cx + Math.cos(a) * rx * w) * m.r) * k, (m.y + (cy + Math.sin(a) * ry * w) * m.r) * k]
    }
    p.beginShape()
    for (let i = 0; i < 17; i++) p.curveVertex(...at(i % 14))
    p.endShape()
  }
  blob(-0.28, -0.22, 0.3, 0.22, 1)
  blob(0.12, -0.34, 0.2, 0.14, 2)
  blob(-0.05, 0.12, 0.26, 0.2, 3)
  blob(0.34, 0.22, 0.14, 0.18, 4)
  p.pop()
}

/** The plain from the horizon down: a band of moonlit haze at the horizon, darkening toward us. */
function plain(p: p5, k: number, f: Frame, hy: number): void {
  const H = f.y1 - f.y0
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, hy * k, 0, f.y1 * k)
  g.addColorStop(0, mixHex(RAILWAY.plain, RAILWAY.skyLow, 0.62))
  g.addColorStop(Math.min(0.99, (0.05 * H) / Math.max(0.01, f.y1 - hy)), RAILWAY.plain)
  g.addColorStop(1, mixHex(RAILWAY.plain, RAILWAY.iron, 0.45))
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k - 2, hy * k, (f.x1 - f.x0) * k + 4, (f.y1 - hy) * k + 2)
}

/**
 * The far country on the horizon: clumps of trees, lines of poplars, a farm with a lit window. Laid out along the
 * horizon in screen units (frame heights) and slid by the camera's run at `rate` frame heights a cell: the far line
 * slowly, the nearer hedges faster.
 */
function country(p: p5, k: number, f: Frame, hy: number, rate: number, seed: number, scale: number, drop: number, fill: string): void {
  const H = f.y1 - f.y0
  const halfW = (f.x1 - f.x0) / H / 2
  const run = f.cx * rate
  const step = 0.09 * scale
  const base = hy + drop * H
  const i0 = Math.floor((-halfW - 0.3 + run) / step)
  const i1 = Math.ceil((halfW + 0.3 + run) / step)
  p.push()
  p.rectMode(p.CENTER)
  p.noStroke()
  p.fill(fill)
  // One continuous low band first, so the things on it never float: a hedge line along the horizon.
  p.beginShape()
  p.vertex((f.x0 - 1) * k, (base + 0.004 * H) * k)
  for (let i = i0; i <= i1; i++) {
    const x = f.cx + (i * step - run) * H
    const hgt = (0.004 + 0.006 * hash(i, seed, 1)) * scale * H
    p.vertex(x * k, (base - hgt) * k)
  }
  p.vertex((f.x1 + 1) * k, (base + 0.004 * H) * k)
  p.endShape(p.CLOSE)
  const lit: [number, number, number][] = []
  for (let i = i0; i <= i1; i++) {
    const r = hash(i, seed, 2)
    const x = f.cx + ((i + hash(i, seed, 3) * 0.6) * step - run) * H
    const s = scale * H
    if (r < 0.34) {
      // A clump of trees: overlapping crowns of different sizes on the hedge, flattened a little.
      const n = 2 + Math.floor(hash(i, seed, 4) * 3)
      for (let j = 0; j < n; j++) {
        const cx = x + (j - n / 2) * 0.012 * s
        const w = (0.012 + 0.01 * hash(i, j, seed + 5)) * s
        const h = w * (1.1 + 0.5 * hash(i, j, seed + 6))
        p.ellipse(cx * k, (base - h * 0.55) * k, w * 2 * k, h * 1.2 * k)
      }
    } else if (r < 0.5) {
      // A line of poplars: tall and narrow, not all alike.
      const n = 3 + Math.floor(hash(i, seed, 7) * 4)
      for (let j = 0; j < n; j++) {
        const cx = x + j * 0.011 * s
        const h = (0.032 + 0.018 * hash(i, j, seed + 8)) * s
        const w = h * 0.22
        p.beginShape()
        p.vertex((cx - w / 2) * k, base * k)
        p.bezierVertex((cx - w * 0.75) * k, (base - h * 0.45) * k, (cx - w * 0.3) * k, (base - h * 0.95) * k, cx * k, (base - h) * k)
        p.bezierVertex((cx + w * 0.3) * k, (base - h * 0.95) * k, (cx + w * 0.75) * k, (base - h * 0.45) * k, (cx + w / 2) * k, base * k)
        p.endShape(p.CLOSE)
      }
    } else if (r < 0.58) {
      // A farm: a long low house and a barn, a window lit.
      const w = 0.03 * s
      const h = 0.012 * s
      p.rect((x + w / 2) * k, (base - h / 2) * k, w * k, h * k)
      p.triangle(x * k, (base - h) * k, (x + w) * k, (base - h) * k, (x + w / 2) * k, (base - h - 0.009 * s) * k)
      const bx = x + w + 0.004 * s
      p.rect((bx + w * 0.35) * k, (base - h * 0.75) * k, w * 0.7 * k, h * 1.5 * k)
      if (hash(i, seed, 9) < 0.7) lit.push([x + w * 0.3, base - h * 0.5, 0.0035 * s])
    }
  }
  // The windows, last, a warm point in the dark: small and square, never round.
  const lamp = p.color(RAILWAY.lamp)
  lamp.setAlpha(210)
  p.fill(lamp)
  for (const [x, y, w] of lit) p.rect(x * k, y * k, w * k, w * 0.8 * k)
  p.pop()
}

export const night = scenery<null>({
  name: 'railway-night',
  draw: (p, _s, c) => {
    const { k } = c
    const t = c.t
    const f = frame(p, k)
    const hy = f.y0 + HORIZON * (f.y1 - f.y0)
    const m = moonAt(p, k, t)
    p.push()
    sky(p, k, f, hy)
    stars(p, k, f, t, hy, m)
    moon(p, k, m)
    plain(p, k, f, hy)
    // The far line, then the hedges nearer in, darker and quicker.
    country(p, k, f, hy, 0.004, 11, 1, 0, mixHex(RAILWAY.plain, RAILWAY.skyLow, 0.2))
    country(p, k, f, hy, 0.014, 23, 1.7, 0.035, mixHex(RAILWAY.plain, RAILWAY.iron, 0.3))
    p.pop()
  },
})
