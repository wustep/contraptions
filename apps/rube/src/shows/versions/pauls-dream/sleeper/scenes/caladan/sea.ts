import { blob, clamp01, cover, drift, fill, hash, layer, mix, poly, rgba, smooth, vgrad, type Layer, type Paint, type Pt, type View } from '../../paint'
import { CLIFF, SEA, T } from './geo'

/**
 * Caladan's weather and water: a low grey-green sky with rain moving through it in curtains, the sea running in from
 * the west in long swells and breaking on the cliff's foot, and far headlands going into the mist. Everything here is
 * cool and wet; the only warm things on Caladan are the castle's lamps.
 */

export const AIR = {
  zenith: '#5E6B66',
  low: '#9AA69F',
  mist: '#8E9A94',
  sea: '#3A4A45',
  seaFar: '#6F7E78',
  deep: '#1E2926',
  crest: '#55665F',
  foam: '#C3CCC6',
  rain: '#56625D',
  rock: '#202625',
  rockLit: '#353D3B',
  turf: '#36443A',
} as const

/** The sky over the whole frame, its horizon at the camera's height, with a few long cloud banks drifting east. */
export function sky(g: Paint): void {
  const v = g.view
  cover(g, vgrad(g.ctx, v.cy - v.h * 1.2, v.cy, [[0, AIR.zenith], [1, AIR.low]]))
  // Cloud banks: long low lenses a little darker than the sky, far off, moving slowly east.
  for (let i = 0; i < 4; i++) {
    const L = layer(v, 300 + i * 220)
    const w = 260
    const x = round(v, L, hash(i, 3) * 2000 + g.t * (1.2 + i * 0.4), w)
    const [px, py] = L.pt([x, -60 - i * 26])
    g.ctx.beginPath()
    g.ctx.ellipse(px, py, w * L.s, 16 * L.s, 0, 0, Math.PI * 2)
    fill(g.ctx, rgba(mix(AIR.zenith, '#4B5753', 0.4), 0.35))
  }
}

/**
 * A thing drifting through a far layer: its near-plane x, from where it would be (`at`), kept within reach of the
 * frame (it wraps round a span wider than the frame by its own width `w` either side, so it never wraps in sight).
 */
function round(v: View, L: Layer, at: number, w: number): number {
  const span = v.w / L.s + 4 * w
  const off = (((at - v.cx) % span) + span * 1.5) % span - span / 2
  return v.cx + off
}

/** The swell's height at `x` (cells) and time `t`: long waves running east, under smaller ones. */
export function swell(x: number, t: number, amp = 0.32): number {
  return -amp * (0.65 * Math.sin(x * 0.42 - t * 1.1) + 0.35 * Math.sin(x * 0.97 - t * 1.9 + 1.3))
}

/**
 * The sea from the horizon to the near water, and the near water's swell. Its far reaches pale into the mist; a few
 * swells stand out across it at their depths.
 */
export function sea(g: Paint): void {
  const v = g.view
  const ctx = g.ctx
  if (v.y1 < -40) return
  // The far plane: from the horizon down to the near water.
  const top = v.cy
  ctx.fillStyle = vgrad(ctx, top, Math.max(top + 0.5, SEA + 0.5), [[0, AIR.seaFar], [0.35, mix(AIR.seaFar, AIR.sea, 0.6)], [1, AIR.sea]])
  ctx.fillRect(v.x0 - 1, top, v.w + 2, Math.max(0, SEA + 1 - top))
  // Swells across it, each at its depth, a little lighter on their faces.
  for (const d of [90, 22]) {
    const L = layer(v, d)
    const pts: Pt[] = []
    const step = Math.max(0.4, (8 * g.px) / L.s)
    const xa = v.cx + (v.x0 - v.cx) / L.s - 2
    const xb = v.cx + (v.x1 - v.cx) / L.s + 2
    for (let x = xa; x <= xb; x += step) pts.push(L.pt([x, SEA + swell(x, g.t, 0.5) - 0.05]))
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (const p of pts) ctx.lineTo(p[0], p[1])
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 0.6 * L.s)
    ctx.closePath()
    fill(ctx, rgba(mix(AIR.crest, AIR.mist, clamp01(d / 160)), 0.3))
  }
}

/** The near water: its swell along the sea's level from the west to the cliff's foot, and the dark of the water under it. */
export function nearWater(g: Paint): void {
  const v = g.view
  if (v.y1 < SEA - 3 || v.x0 > CLIFF.foot + 4) return
  const ctx = g.ctx
  const x1 = Math.min(v.x1 + 1, CLIFF.foot + 3)
  const pts: Pt[] = []
  const step = Math.max(0.15, 6 * g.px)
  for (let x = v.x0 - 1; x <= x1; x += step) pts.push([x, SEA + swell(x, g.t)])
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(x1, v.y1 + 1)
  ctx.lineTo(v.x0 - 1, v.y1 + 1)
  ctx.closePath()
  fill(ctx, vgrad(ctx, SEA - 0.6, SEA + 6, [[0, AIR.crest], [0.12, AIR.sea], [1, AIR.deep]]))
}

/** Far headlands to the north, going into the mist: Caladan's coast. */
export function headlands(g: Paint): void {
  const v = g.view
  for (const [d, x0, w, h] of [[420, -900, 260, 36], [180, -660, 120, 20], [90, -470, 90, 13]] as const) {
    const L = layer(v, d)
    const pts: Pt[] = [L.pt([x0, SEA + 0.5])]
    for (let i = 0; i <= 12; i++) {
      const u = i / 12
      pts.push(L.pt([x0 + w * u, SEA - h * Math.sin(Math.PI * Math.pow(u, 0.7)) * (0.85 + 0.15 * drift(u * 3, d)) - 0.2]))
    }
    pts.push(L.pt([x0 + w, SEA + 0.5]))
    poly(g.ctx, pts)
    fill(g.ctx, mix(AIR.rock, AIR.mist, clamp01(0.55 + d / 900)))
  }
}

/** The cliff: black rock from the castle's foot down into the sea, turf along its top edge. */
export function cliff(g: Paint): void {
  const v = g.view
  if (v.x1 < CLIFF.foot - 2 || v.y1 < CLIFF.top - 2) return
  const ctx = g.ctx
  // The face from the edge down to the sea, broken in steps, leaning out a little as it goes down, as sea cliffs do.
  const H = SEA - CLIFF.top
  const at = (u: number, dx: number): Pt => [CLIFF.edge + dx, CLIFF.top + H * u]
  const face: Pt[] = [
    at(0, 0),
    at(0.07, -0.8),
    at(0.16, -0.4),
    at(0.26, -2.1),
    at(0.38, -1.6),
    at(0.5, -3.4),
    at(0.62, -3.0),
    at(0.74, -5.2),
    at(0.86, -6.0),
    [CLIFF.foot, SEA + 0.4],
    [CLIFF.foot - 0.6, SEA + 6],
  ]
  poly(ctx, [...face, [-380, SEA + 6], [-380, CLIFF.top]])
  fill(ctx, vgrad(ctx, CLIFF.top, SEA + 4, [[0, AIR.rockLit], [0.5, AIR.rock], [1, '#151A19']]))
  // Ledges: the face's broken steps, lit a little on their tops.
  for (const [u, dx, w] of [[0.07, -0.8, 1.2], [0.26, -2.1, 1.6], [0.5, -3.4, 1.4], [0.74, -5.2, 1.8]] as const) {
    const [x, y] = at(u, dx)
    poly(ctx, [[x, y], [x + w, y - 0.05], [x + w + 0.2, y + 0.18], [x + 0.1, y + 0.22]])
    fill(ctx, AIR.rockLit)
  }
  // Turf along the top, over the edge.
  poly(ctx, [[CLIFF.edge - 0.3, CLIFF.top + 0.25], [CLIFF.edge - 0.1, CLIFF.top - 0.12], [-380, CLIFF.top - 0.12], [-380, CLIFF.top + 0.3]])
  fill(ctx, AIR.turf)
}

/**
 * Spray off the cliff's foot: on each wave a burst of white water climbs the rock and falls back; on its answer, a
 * smaller one. The great wave on the first low swell climbs half the cliff. Big soft shapes under gravity, fading as
 * they fall; never sparks.
 */
export function spray(g: Paint): void {
  const v = g.view
  if (v.x1 < CLIFF.foot - 10 || v.x0 > CLIFF.foot + 8 || v.y1 < SEA - 16) return
  const bursts: [number, number][] = [
    ...T.waves.map((t): [number, number] => [t, 7]),
    ...T.answers.map((t): [number, number] => [t, 3]),
    [T.great, 15],
    [T.sea, 6],
  ]
  for (const [at, height] of bursts) {
    const s = g.t - at
    if (s < 0 || s > 3.2) continue
    const v0 = Math.sqrt(2 * 24 * height)
    for (let i = 0; i < 7; i++) {
      const spread = (hash(i, Math.round(at * 10)) - 0.5) * 2
      const vi = v0 * (0.55 + 0.45 * hash(i, 7, Math.round(at * 10)))
      const y = -vi * s + 0.5 * 24 * s * s
      if (y > 0.6) continue
      const yy = SEA + y
      const x = CLIFF.foot - 0.6 - Math.abs(spread) * 2.4 - s * 1.2 * (0.4 + Math.abs(spread))
      const r = (0.5 + 0.5 * hash(i, 11)) * (0.7 + height * 0.2) * (1 + s * 0.6)
      const a = (1 - smooth(s, 0.8, 3.0)) * 0.75
      blob(g.ctx, [[x - r, yy], [x - r * 0.4, yy - r * 0.8], [x + r * 0.5, yy - r * 0.7], [x + r, yy + r * 0.1], [x + r * 0.2, yy + r * 0.6], [x - r * 0.7, yy + r * 0.5]])
      fill(g.ctx, rgba(AIR.foam, a))
    }
  }
}

/**
 * Rain: tall curtains of it moving east across the sea, slanted, a little darker than the air behind them, as showers
 * at sea are (paler ones read as shafts of light). No streaks or drops (a field of small marks reads as noise).
 */
export function rain(g: Paint, strength = 1): void {
  const v = g.view
  if (strength <= 0.01) return
  const ctx = g.ctx
  for (let i = 0; i < 5; i++) {
    const L = layer(v, 30 + i * 50)
    const w = 14 + 10 * hash(i, 9)
    const x = round(v, L, hash(i, 5) * 3000 + g.t * (2.4 + i * 0.5), w)
    const top = -40
    const foot = SEA + 0.5
    const skew = 6
    const p = (xx: number, yy: number): Pt => L.pt([xx, yy])
    poly(ctx, [p(x, top), p(x + w, top), p(x + w - skew, foot), p(x - skew, foot)])
    fill(ctx, vgrad(ctx, L.y(top), L.y(foot), [[0, rgba(AIR.rain, 0)], [0.4, rgba(AIR.rain, 0.12 * strength)], [1, rgba(AIR.rain, 0.06 * strength)]]))
  }
}
