import { cover, drift, fill, layer, mix, rgba, vgrad, type Paint, type Pt, type View } from '../paint'

/**
 * Arrakis's air and sand, shared by every desert scene so the planet is one place: a sky graded from the zenith to the
 * horizon (which is always at the camera's height), a sun as a flat disc, and ranges of dunes as smooth swells, each a
 * flat fill lighter at its crest, paling toward the haze the farther back it stands. No crest lines, no ripples, no
 * grain: the shapes are big and plain and the air does the work.
 */

export interface Air {
  /** The sky at the top of the frame, at the horizon, and the haze the far sand goes into. */
  zenith: string
  horizon: string
  haze: string
  /** Sand in the light, and in its own shade at a dune's foot. */
  sand: string
  shade: string
  /** The sun: where it sits (shares of the composed 16:9 frame across, and up from the horizon in its heights), its size
   * (a share of its height) and colour. Left out: no sun in the frame. */
  sun?: { x: number; up: number; r: number; color: string }
}

/** The day, from the drop through the harvester: the ochre of Arrakis. */
export const DAY: Air = {
  zenith: '#D9B98A',
  horizon: '#F0DDBC',
  haze: '#E9D2AC',
  sand: '#D49A5C',
  shade: '#A86B3A',
  sun: { x: 0.78, up: 0.32, r: 0.05, color: '#FBF1DE' },
}

/** The night, deep blue over cold sand. */
export const NIGHT: Air = {
  zenith: '#0C1320',
  horizon: '#1E2A3B',
  haze: '#1B2534',
  sand: '#3A3A44',
  shade: '#22232C',
}

/** Dawn in the deep desert: rose over ochre, the sun just up. */
export const DAWN: Air = {
  zenith: '#C9A58F',
  horizon: '#F2D3B0',
  haze: '#EBCBA6',
  sand: '#CC8E58',
  shade: '#8E5835',
  sun: { x: 0.24, up: 0.06, r: 0.07, color: '#FFF0D6' },
}

/** Every colour of one air `f` of the way to another's. */
export function between(a: Air, b: Air, f: number): Air {
  const sun = a.sun && b.sun
    ? { x: a.sun.x + (b.sun.x - a.sun.x) * f, up: a.sun.up + (b.sun.up - a.sun.up) * f, r: a.sun.r + (b.sun.r - a.sun.r) * f, color: mix(a.sun.color, b.sun.color, f) }
    : f < 0.5 ? a.sun : b.sun
  return {
    zenith: mix(a.zenith, b.zenith, f),
    horizon: mix(a.horizon, b.horizon, f),
    haze: mix(a.haze, b.haze, f),
    sand: mix(a.sand, b.sand, f),
    shade: mix(a.shade, b.shade, f),
    sun,
  }
}

/** The sky over the whole frame, and the sun in it. */
export function sky(g: Paint, air: Air): void {
  const v = g.view
  // The horizon is at the camera's height; the zenith colour is reached a frame and a half above it.
  cover(g, vgrad(g.ctx, v.cy - v.h * 1.5, v.cy, [[0, air.zenith], [0.75, mix(air.zenith, air.horizon, 0.6)], [1, air.horizon]]))
  if (air.sun) {
    const [x, y, r] = sunAt(v, air.sun)
    g.ctx.beginPath()
    g.ctx.arc(x, y, r, 0, Math.PI * 2)
    fill(g.ctx, air.sun.color)
  }
}

/**
 * Where a disc fixed to the frame (the sun, a moon) stands: its shares measured against the composed 16:9 frame, not
 * the whole stage, so a phone held upright (whose stage is far taller) sees it where and as big as everyone else does.
 */
export function sunAt(v: View, s: { x: number; up: number; r: number }): [number, number, number] {
  const h = Math.min(v.h, (v.w * 9) / 16)
  return [v.cx + (s.x - 0.5) * ((h * 16) / 9), v.cy - h * s.up, h * s.r]
}

/** A range of dunes. */
export interface Range {
  /** How far behind the near plane it stands (cells). */
  d: number
  /** Its foot's height, as if it stood on the near plane (cells; up negative, 0 is the floor). */
  base: number
  /** How high its swells rise over the foot, and how long they are (cells, on the near plane). */
  amp: number
  len: number
  seed: number
  /** How far into the haze, 0 to 1 (default from its depth). */
  haze?: number
}

/** The crest of a range at near-plane `x`: smooth swells, never a sharp edge. */
export function crest(r: Range, x: number): number {
  const u = x / r.len
  const a = 0.5 + 0.5 * Math.sin(u * Math.PI * 2 + r.seed * 1.7) * 0.6 + 0.4 * drift(u * 0.9, r.seed)
  return r.base - r.amp * Math.max(0, Math.min(1.2, a))
}

/** How far into the haze a range at depth `d` goes. */
export const hazeAt = (d: number): number => Math.min(0.92, 1 - Math.exp(-d / 260))

/**
 * One range, drawn across the whole frame from its crest down past the frame's foot: lighter at the crest, its own
 * shade toward the foot, the whole of it taken toward the haze by its depth.
 */
export function dunes(g: Paint, air: Air, r: Range): void {
  const v = g.view
  const L = layer(v, r.d)
  const hz = r.haze ?? hazeAt(r.d)
  const lit = mix(air.sand, air.haze, hz)
  const dark = mix(air.shade, air.haze, Math.min(0.95, hz * 1.05))
  // Sample the crest every few pixels across the frame, in the layer's own (near-plane) coordinates.
  const step = Math.max(r.len / 40, (6 * g.px) / L.s)
  const xa = v.cx + (v.x0 - v.cx) / L.s - step
  const xb = v.cx + (v.x1 - v.cx) / L.s + step
  const pts: Pt[] = []
  let top = Infinity
  for (let x = xa; x <= xb + 1e-9; x += step) {
    const p = L.pt([x, crest(r, x)])
    pts.push(p)
    top = Math.min(top, p[1])
  }
  const foot = Math.max(v.y1 + 1, L.y(r.base) + 1)
  const ctx = g.ctx
  ctx.beginPath()
  ctx.moveTo(pts[0][0], foot)
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(pts[pts.length - 1][0], foot)
  ctx.closePath()
  const swell = Math.max(1e-3, L.y(r.base) - top)
  fill(ctx, vgrad(ctx, top, top + swell * 1.6, [[0, lit], [1, dark]]))
}

/** The near sand: the floor at y = 0 and everything under it, in the light. */
export function floor(g: Paint, air: Air, y = 0): void {
  const v = g.view
  if (y > v.y1) return
  g.ctx.fillStyle = air.sand
  g.ctx.fillRect(v.x0 - 1, y, v.w + 2, Math.max(0, v.y1 - y) + 1)
}

/** A drift of dust or spice: a soft flat veil, no particles (`a` its strength, `color` its tint). */
export function veil(g: Paint, color: string, a: number, y0: number, y1: number): void {
  if (a <= 0.002) return
  const v = g.view
  g.ctx.fillStyle = vgrad(g.ctx, y0, y1, [[0, rgba(color, 0)], [0.5, rgba(color, a)], [1, rgba(color, 0)]])
  g.ctx.fillRect(v.x0 - 1, y0, v.w + 2, y1 - y0)
}
