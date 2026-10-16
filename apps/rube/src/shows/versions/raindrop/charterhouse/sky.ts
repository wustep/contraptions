import type { Pt } from '../../../../parts'
import { clamp, frame, hash, lerp, mix, poly, rect, rgba, smooth, type Brush } from './brush'
import { nightAt, stormAt, tones } from './look'
import { FORM } from './music'

/**
 * What is far: the sky, the clouds, the Serra's ridges and the sea. Each layer is drawn about the frame's own middle
 * and moves a share `f` of what the camera moves (`at`), so the ridges slide slowly behind the hillside and the
 * horizon stays near the eye wherever the camera goes down the hill.
 */

/** Where the horizon is, in layer cells: a little under the eye. */
const HORIZON = -6

interface View {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
}

const viewOf = (b: Brush): View => {
  const f = frame(b)
  return { ...f, cx: (f.x0 + f.x1) / 2, cy: (f.y0 + f.y1) / 2 }
}

/** A layer point `[px, py]` at depth `f`, as world cells for the frame centred at `[cx, cy]`. */
const at = (v: View, f: number, px: number, py: number): Pt => [v.cx + px - v.cx * f, v.cy + py - v.cy * f]
/** The layer x a world x is over, at depth `f`. */
const layerX = (v: View, f: number, x: number): number => x - v.cx + v.cx * f

/** A ridge: a run of peaks, each a steep tent with a little noise on it, the highest wins. */
function ridge(seed: number, spacing: number, h0: number, h1: number, slope: number): (x: number) => number {
  return (x: number) => {
    const i0 = Math.floor(x / spacing) - 3
    let best = -Infinity
    for (let i = i0; i <= i0 + 6; i++) {
      const px = (i + hash(i, seed, 1) * 0.8) * spacing
      const h = lerp(h0, h1, hash(i, seed, 2))
      const s = slope * lerp(0.7, 1.3, hash(i, seed, 3))
      const v = h - Math.abs(x - px) * s
      if (v > best) best = v
    }
    // A little broken: limestone, not a sine.
    const n = Math.floor(x / 1.7)
    const crag = (hash(n, seed, 4) - 0.5) * 0.9 + Math.sin(x * 0.21 + seed) * 0.5
    return best + crag
  }
}

/** The Serra rises in the west and falls away east, to the valley's mouth and the sea. */
const west = (x: number): number => 1 - 0.82 * smooth(x, -40, 120)
const shaped = (r: (x: number) => number, lift: number) => (x: number) => r(x) * west(x) + lift * (1 - west(x))
const FAR = shaped(ridge(11, 46, 22, 36, 0.62), -2)
const MID = shaped(ridge(23, 30, 12, 22, 0.85), -4)
const NEAR = shaped(ridge(37, 22, 6, 13, 1.05), -6)

/** The ridge as a filled polygon across the frame, from `top(x)` (layer cells above the horizon) down to `bottom`. */
function range(b: Brush, v: View, f: number, top: (x: number) => number, base: number, color: string, step: number): void {
  const pts: Pt[] = []
  const lx0 = layerX(v, f, v.x0) - step
  const lx1 = layerX(v, f, v.x1) + step
  for (let lx = lx0; lx <= lx1 + 1e-9; lx += step) pts.push(at(v, f, lx, HORIZON - top(lx)))
  pts.push(at(v, f, lx1, base), at(v, f, lx0, base))
  poly(b, pts, color)
}

/**
 * The clouds: a rain deck is not a sky of puffs but long flat banks, one over another, with softer, paler breaks
 * low down. Each bank is a very long thin lens, drifting east with the wind.
 */
function clouds(b: Brush, v: View, t: number, f: number, y: number, color: string, alpha: number, seed: number, drift: number): void {
  if (alpha <= 0.01) return
  const g = b.g
  g.fillStyle = rgba(color, alpha)
  const span = 120
  const shift = (t * drift) % span
  const lx0 = layerX(v, f, v.x0) - span
  const lx1 = layerX(v, f, v.x1) + span
  const i0 = Math.floor((lx0 - shift) / span)
  const i1 = Math.ceil((lx1 - shift) / span)
  g.beginPath()
  for (let i = i0; i <= i1; i++) {
    for (let j = 0; j < 3; j++) {
      const cx = i * span + shift + hash(i, seed, j) * 80
      const cy = y + (hash(i, seed, j + 4) - 0.5) * 8 + j * 2.5
      const w = 50 + hash(i, seed, j + 8) * 70
      const h = 1.2 + hash(i, seed, j + 12) * 1.6
      const [x, yy] = at(v, f, cx, cy)
      g.moveTo(x + w / 2, yy)
      g.ellipse(x, yy, w / 2, h, 0, 0, Math.PI * 2)
    }
  }
  g.fill()
}

/** The moon, after the storm: a plain disc, half in a cloud's edge as the sky clears. */
function moon(b: Brush, v: View, t: number, color: string): void {
  const n = smooth(t, FORM.still - 1.5, FORM.still + 5)
  if (n <= 0) return
  const [x, y] = at(v, 0.04, 26, HORIZON - 38)
  b.g.globalAlpha = n
  b.g.beginPath()
  b.g.arc(x, y, 2.1, 0, Math.PI * 2)
  b.g.fillStyle = color
  b.g.fill()
  b.g.globalAlpha = 1
}

export function drawSky(b: Brush, t: number): void {
  const c = tones(t)
  const v = viewOf(b)
  // The sky: dark overhead to pale at the horizon, by where the horizon is in this frame.
  const [, hy] = at(v, 0.06, 0, HORIZON)
  const g = b.g
  const grad = g.createLinearGradient(0, hy - 70, 0, hy + 4)
  grad.addColorStop(0, c.skyTop)
  grad.addColorStop(1, c.skyLow)
  g.fillStyle = grad
  g.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, v.y1 - v.y0 + 2)

  // The sea, east of the hills, under the horizon: flat, a paler band at its far edge.
  const sea = c.sea
  rect(b, v.x0 - 1, hy, v.x1 + 1, v.y1 + 1, sea)
  rect(b, v.x0 - 1, hy, v.x1 + 1, hy + 0.9, mix(sea, c.seaLight, 0.6))

  moon(b, v, t, mix('#E9E4D2', c.skyLow, 0.15))

  // The rain's own cloud, near and everywhere: faint long bands drifting with the wind, so even a close shot's
  // patch of sky is weather and not a flat wall. Fixed to the frame, as something so far off and so wide is.
  const storm0 = clamp(stormAt(t))
  const night0 = clamp(nightAt(t))
  const H = v.y1 - v.y0
  const W = v.x1 - v.x0
  const g0 = b.g
  g0.fillStyle = rgba(mix(c.cloudLow, c.skyLow, 0.3), 0.05 + 0.05 * storm0 - 0.04 * night0)
  g0.beginPath()
  for (let i = 0; i < 9; i++) {
    const u = (hash(i, 201) + t * (0.004 + 0.006 * storm0) * (0.7 + hash(i, 202) * 0.6)) % 1.4 - 0.2
    const x = v.x0 + u * W
    const y = v.y0 + (0.05 + hash(i, 203) * 0.55) * H
    const w = (0.25 + hash(i, 204) * 0.35) * W
    const h = (0.012 + hash(i, 205) * 0.02) * H
    g0.moveTo(x + w / 2, y)
    g0.ellipse(x, y, w / 2, h, 0, 0, Math.PI * 2)
  }
  g0.fill()

  // The cloud deck: low and heavy in the storm, breaking up in the clear night.
  const storm = clamp(stormAt(t))
  const night = clamp(nightAt(t))
  const deck = lerp(-34, -26, storm)
  clouds(b, v, t, 0.05, HORIZON + deck, mix(c.cloud, c.skyTop, 0.2), 0.55 + 0.35 * storm - 0.45 * night, 3, 0.9 + 1.6 * storm)
  clouds(b, v, t, 0.07, HORIZON + deck + 9, c.cloud, 0.5 + 0.4 * storm - 0.42 * night, 5, 1.4 + 2.4 * storm)

  // The ridges of the Serra, far to near.
  range(b, v, 0.1, FAR, HORIZON + 6, c.mtFar, 1.5)
  clouds(b, v, t, 0.12, HORIZON - 14, c.cloudLow, 0.3 + 0.35 * storm - 0.3 * night, 9, 1.1 + 2 * storm)
  range(b, v, 0.18, MID, HORIZON + 12, c.mtMid, 1.2)
  range(b, v, 0.3, NEAR, HORIZON + 30, c.mtNear, 1)
}

/** The rain's far veil over the ridges in the storm: a flat grey wash, thicker low down. */
export function drawVeil(b: Brush, t: number): void {
  const s = clamp(stormAt(t))
  if (s <= 0.02) return
  const v = viewOf(b)
  const [, hy] = at(v, 0.06, 0, HORIZON)
  const g = b.g
  const grad = g.createLinearGradient(0, hy - 40, 0, hy + 8)
  const c = tones(t)
  grad.addColorStop(0, rgba(c.cloudLow, 0))
  grad.addColorStop(1, rgba(c.cloudLow, 0.35 * s))
  g.fillStyle = grad
  g.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, v.y1 - v.y0 + 2)
}

