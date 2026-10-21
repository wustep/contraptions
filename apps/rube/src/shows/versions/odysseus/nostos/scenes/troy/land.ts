import { blob, clamp01, curve, fill, mix, poly, rgba, smooth, stroke, type Paint } from '../../draw'
import { M } from '../../music'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { horizonOf } from '../../world/sea'
import { skyAt } from '../../world/sky'
import { SHORE, WALL, ground } from './geo'
import { BU, HORSE_START, LOGS, LOG_R, SLEDGE, TAUT, hauled, horseAt, toWorld } from './horse'
import { FLAME, MAT, burning, firelight, night, tone } from './tone'
import { smoke } from './city'
import { ropeEnd } from './crowd'

/**
 * Troy's land: the plain going away inland behind the coast, Mount Ida on the horizon, the ground itself cut open
 * (red earth under the city's hill, sand under the dunes and the beach, the sand going on down under the water), the
 * road of logs the horse is hauled up, and the ropes.
 */

/** Where the hill's red earth gives way to the dunes' sand. */
const SAND_FROM = -19.6

/**
 * The land seen going away inland, behind the coast: the Trojan plain from the waterline's height up to the horizon,
 * left of a shore that curves away to the horizon; low hills across the plain; Mount Ida far off.
 */
export function drawInland(g: Paint): void {
  const { ctx, t, view } = g
  const hy = horizonOf(view)
  if (view.x0 > SHORE + 1 || view.y1 < hy) return
  const sky = skyAt(t)
  const n = night(t)
  const dark = '#0F131C'
  const x0 = view.x0 - 1
  // The shore going away: from the beach's foot, bending round a bay, out to the horizon far inland.
  const far = SHORE - 24
  ctx.beginPath()
  ctx.moveTo(x0, hy)
  ctx.lineTo(far, hy)
  ctx.quadraticCurveTo(SHORE - 3.5, hy * 0.45, SHORE, 0)
  ctx.lineTo(SHORE, 0.3)
  ctx.lineTo(x0, 0.3)
  ctx.closePath()
  const grd = ctx.createLinearGradient(0, hy, 0, 0)
  grd.addColorStop(0, mix(mix('#B8A582', sky.low, 0.6), dark, 0.8 * n))
  grd.addColorStop(0.5, mix(mix('#A08F68', sky.low, 0.3), dark, 0.84 * n))
  grd.addColorStop(1, mix('#7B7350', dark, 0.88 * n))
  ctx.fillStyle = grd
  ctx.fill()
  // The surf along that shore: one pale line, thinning as it goes away.
  ctx.beginPath()
  ctx.moveTo(SHORE, 0)
  ctx.quadraticCurveTo(SHORE - 3.5, hy * 0.45, far, hy)
  stroke(g, rgba(mix(sky.low, '#FFFFFF', 0.3), 0.45 * (1 - 0.7 * n)), 1.6)
  // Low hills across the plain, and Mount Ida on the horizon.
  for (const [d, base, amp, tint] of [
    [55, 0.25, 1.4, 0.35],
    [160, 0, 3.2, 0.6],
  ] as [number, number, number, number][]) {
    const L = layer(view, d)
    const pts: Pt[] = []
    for (let x = -170; x <= SHORE - 6; x += 4) {
      const h = amp * (0.55 * Math.exp(-(((x + 80) / 34) ** 2)) + 0.3 * Math.exp(-(((x + 34) / 16) ** 2)) + 0.18 + 0.07 * Math.sin(x * 0.17))
      pts.push([L.x(x), hy - (hy - L.y(0)) * base - h * L.s])
    }
    ctx.beginPath()
    ctx.moveTo(pts[0][0], hy + 0.01)
    for (const p of pts) ctx.lineTo(p[0], p[1])
    ctx.lineTo(pts[pts.length - 1][0], hy + 0.01)
    ctx.closePath()
    fill(ctx, mix(mix('#8E8A78', sky.low, tint), sky.top, 0.15 + 0.5 * n))
  }
}

/** Where the seabed starts to go into the water's dark, and where it has gone. */
const SEABED_FADE = [8, 14] as const

/** The ground's cut face goes from its first colour to its second between these heights. */
const EARTH_Y = [-6, 3] as const

let fade: { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D } | null = null
const FADE = 32

/**
 * The ground's cut face from `x` over `run` cells and down to `bottom`, going from whole to nothing across: the face's
 * own darkening with depth and the fade across in one small picture stretched over it, so it meets the face beside it
 * without a seam at any depth.
 */
function fadeAway(ctx: CanvasRenderingContext2D, c0: string, c1: string, x: number, run: number, bottom: number): void {
  if (typeof document === 'undefined') return
  fade ??= (() => {
    const canvas = document.createElement('canvas')
    canvas.width = FADE
    canvas.height = FADE
    return { canvas, g: canvas.getContext('2d')! }
  })()
  const { g } = fade
  const y0 = -1
  const py = (y: number) => ((y - y0) / (bottom - y0)) * FADE
  g.globalCompositeOperation = 'source-over'
  g.clearRect(0, 0, FADE, FADE)
  const down = g.createLinearGradient(0, py(EARTH_Y[0]), 0, py(EARTH_Y[1]))
  down.addColorStop(0, c0)
  down.addColorStop(1, c1)
  g.fillStyle = down
  g.fillRect(0, 0, FADE, FADE)
  g.globalCompositeOperation = 'destination-in'
  const across = g.createLinearGradient(0.5, 0, FADE - 0.5, 0)
  across.addColorStop(0, 'rgba(0,0,0,1)')
  across.addColorStop(0.06, 'rgba(0,0,0,1)')
  across.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = across
  g.fillRect(0, 0, FADE, FADE)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(fade.canvas, x, y0, run, bottom - y0)
}

/** The ground, cut open: from its surface down past the bottom of the frame. `below` keeps only what is under y = -0.25 (the cover over the sea's cutaway). */
export function drawGround(g: Paint, below = false): void {
  const { ctx, t, view } = g
  const x0 = Math.max(-140, view.x0 - 0.5)
  const x1 = Math.min(below ? SHORE : 14, view.x1 + 0.5)
  if (x1 <= x0) return
  const bottom = Math.max(view.y1 + 1, 3)
  if (below) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 - 1, -0.25, x1 - x0 + 8, bottom + 2)
    ctx.clip()
  }
  const edge = (a: number, b: number): Pt[] => {
    const pts: Pt[] = []
    const step = Math.max(0.08, view.h / 220)
    for (let x = a; x < b; x += step) pts.push([x, ground(x)])
    pts.push([b, ground(b)])
    return pts
  }
  const fireAll = firelight(-40, t) * 0.4
  // The ground cut open, under the city's hill and the dunes and the beach alike: one dark face, a little warmer near
  // the surface and going down into the dark, so what is under the action is a quiet base and not a wall of colour.
  const earth0 = tone(mix(MAT.earthDeep, MAT.sand, 0.12), t, { fire: fireAll * 0.25, deep: 0.5 })
  const earth1 = mix(earth0, '#0B0C10', 0.6)
  const earth = ctx.createLinearGradient(0, EARTH_Y[0], 0, EARTH_Y[1])
  earth.addColorStop(0, earth0)
  earth.addColorStop(1, earth1)
  // Out to sea, the seabed goes away into the water's dark over its last cells instead of ending square under the sea:
  // whole to `whole`, then fading out from a little inside it (so the two never meet on an edge) to the end.
  const whole = Math.min(x1, SEABED_FADE[0])
  const from = SEABED_FADE[0] - 0.3
  const run = SEABED_FADE[1] - from
  const away = (c: string) => {
    const grd = ctx.createLinearGradient(from, 0, from + run, 0)
    grd.addColorStop(0, rgba(c, 1))
    grd.addColorStop(0.06, rgba(c, 1))
    grd.addColorStop(1, rgba(c, 0))
    return grd
  }
  if (whole > x0) {
    const pts = edge(x0, whole)
    poly(ctx, [...pts, [whole, bottom], [x0, bottom]])
    ctx.fillStyle = earth
    ctx.fill()
  }
  if (!below && x1 > from) {
    const a = Math.max(x0, from)
    ctx.save()
    poly(ctx, [...edge(a, x1), [x1, bottom], [a, bottom]])
    ctx.clip()
    fadeAway(ctx, earth0, earth1, from, run, bottom)
    ctx.restore()
  }
  // Past the shore, over the cut-open water, the beach's ground goes on under the seabed and into the water's dark over
  // a few cells, so the sand does not end at the shore as a cut block. It starts a little inside the beach's, whole
  // there, so the two never meet on an edge.
  if (below && view.x1 > SHORE) {
    const from = SHORE - 0.3
    const run = 5.3
    const b = Math.min(from + run, view.x1 + 0.5)
    const pts = edge(from, b)
    ctx.save()
    poly(ctx, [...pts, [b, bottom], [from, bottom]])
    ctx.clip()
    fadeAway(ctx, earth0, earth1, from, run, bottom)
    ctx.restore()
    // The sand's surface along the seabed, thinning from the beach's to the seabed's.
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 0.05 + 0.06 * clamp01(1 - (pts[i][0] - SHORE) / 1.5))
    ctx.closePath()
    const sand = tone(MAT.sand, t, { lit: 1, fire: fireAll })
    const grd = ctx.createLinearGradient(from, 0, from + run, 0)
    grd.addColorStop(0, rgba(sand, 1))
    grd.addColorStop(0.06, rgba(sand, 1))
    grd.addColorStop(1, rgba(sand, 0))
    ctx.fillStyle = grd
    ctx.fill()
  }
  // The sand of the dunes, the beach and the seabed: its surface.
  if (x1 > SAND_FROM) {
    // The surface itself, a band of lit sand along the top: what a cut through a beach shows of the beach.
    const band = (a: number, b: number) => {
      const pts = edge(a, b)
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      for (let i = pts.length - 1; i >= 0; i--) {
        const [x, y] = pts[i]
        ctx.lineTo(x, y + (x > SHORE ? 0.05 : 0.11))
      }
      ctx.closePath()
    }
    const sand = tone(MAT.sand, t, { lit: 1, fire: fireAll })
    const a = Math.max(x0, SAND_FROM)
    if (whole > a) {
      band(a, whole)
      fill(ctx, sand)
    }
    if (!below && x1 > from) {
      band(Math.max(a, from), x1)
      ctx.fillStyle = away(sand)
      ctx.fill()
    }
  }
  // The hill's surface band, the same way.
  if (x0 < SAND_FROM) {
    const pts = edge(x0, Math.min(x1, SAND_FROM + 0.6)).filter(([x]) => x > WALL.x1 - 0.01 || x < -45.4)
    if (pts.length > 1) {
      ctx.beginPath()
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 0.1)
      ctx.closePath()
      fill(ctx, tone(mix(MAT.scrub, MAT.clay, 0.45), t, { lit: 1, fire: firelight(pts[0][0], t) }))
    }
  }
  // The line of the ground, going with the seabed.
  if (!below) {
    const ink = tone('#2A1D17', t)
    if (whole > x0) {
      curve(ctx, edge(x0, whole))
      stroke(g, ink, 1.8)
    }
    if (x1 > from) {
      curve(ctx, edge(Math.max(x0, from), x1))
      ctx.strokeStyle = away(ink)
      ctx.lineWidth = Math.max(1.25 * g.px, 1.8 / 108)
      ctx.stroke()
    }
  }
  if (below) ctx.restore()
}

/** Where log `i` is at `t`, and how far it has turned: rolled along under the sledge at half its pace while under it. */
export function logAt(i: number, t: number): { x: number; turn: number } {
  const L = LOGS[i]
  const hx = HORSE_START - hauled(Math.min(t, M.second + 1))
  const enter = L + SLEDGE
  const exit = L - 3 * SLEDGE
  const h = Math.max(exit, Math.min(enter, hx))
  const moved = enter - h
  return { x: L - moved / 2, turn: -moved / (2 * LOG_R) }
}

export function drawLogs(g: Paint): void {
  const { ctx, t, view } = g
  for (let i = 0; i < LOGS.length; i++) {
    const { x, turn } = logAt(i, t)
    if (x < view.x0 - 1 || x > view.x1 + 1) continue
    const y = ground(x) - LOG_R
    ctx.beginPath()
    ctx.arc(x, y, LOG_R, 0, Math.PI * 2)
    fill(ctx, tone(MAT.timber, t, { lit: 0.4 }))
    stroke(g, tone('#1E1610', t), 1.5)
    // The end grain's one mark, so it is seen to turn.
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(turn) * LOG_R * 0.7, y + Math.sin(turn) * LOG_R * 0.7)
    stroke(g, tone('#1E1610', t), 1.3)
  }
}

/** The ropes, from the sledge up the beach to the Trojans hauling on them: lying slack in the surf until they are taken up. */
export function drawRopes(g: Paint): void {
  const { ctx, t, view } = g
  if (t > M.second + 1) return
  const p = horseAt(t)
  const slack = 1 - smooth(t, TAUT - 0.25, TAUT + 0.4)
  for (let r = 0; r < 2; r++) {
    const start = toWorld(p, [-2.75, -0.18 - r * 0.12])
    const pts: Pt[] = [start]
    const off = 0.025 + r * 0.025
    // To the last hauler's hands, and a little on past them, lying on the sand.
    const gate = ropeEnd(t) - 0.5 - 0.3 * r
    if (start[0] - 0.4 < view.x0 - 2 && gate > view.x1 + 2) continue
    // Off the sledge and down to the sand, then along it.
    for (let x = start[0] - 0.45; x > gate; x -= 0.3) {
      const d = start[0] - x
      const wiggle = slack * 0.07 * Math.sin(d * 3.1 + r * 1.7) * Math.exp(-d / 3)
      pts.push([x, ground(x) - off + wiggle])
    }
    pts.push([gate, ground(gate) - off])
    curve(ctx, pts)
    stroke(g, tone(r ? '#4C3A2A' : '#3B2C20', t), 1.7)
  }
}

/** Troy far behind them as they sail, seen from the sea: the hill, the wall, the smoke going up, the fires low on it. */
export function drawTroyFar(g: Paint): void {
  const { ctx, t, view } = g
  if (t < 124) return
  // In as the camera comes away from the city to the sea; and into the haze behind them as it opens out over the sea.
  const a = smooth(view.x0, -3, 6) * (1 - smooth(view.x0, 24, 40))
  if (a <= 0.01) return
  const L = layer(view, 70)
  const hill: Pt[] = []
  for (let x = -60; x <= SHORE + 2; x += 1.5) hill.push([L.x(x), L.y(Math.min(0, ground(x)))])
  ctx.save()
  ctx.globalAlpha = a
  ctx.beginPath()
  ctx.moveTo(hill[0][0], L.y(0.4))
  for (const p of hill) ctx.lineTo(p[0], p[1])
  ctx.lineTo(hill[hill.length - 1][0], L.y(0.4))
  ctx.closePath()
  fill(ctx, tone(mix(MAT.clayDark, '#3A3436', 0.4), t, { deep: 0.5 }))
  // The wall and the city on it, a band of blocks along the top.
  poly(ctx, [[L.x(-50), L.y(-5.5)], [L.x(-47), L.y(-6.4)], [L.x(-40), L.y(-6.1)], [L.x(-33), L.y(-5.7)], [L.x(-28.4), L.y(-5.9)], [L.x(-27.2), L.y(-3.0)], [L.x(-50), L.y(-5.0)]])
  fill(ctx, tone(MAT.clayDark, t, { deep: 0.6, fire: 0.5 }))
  // Smoke, standing up off the city and leaning with the wind.
  for (let i = 0; i < 3; i++) {
    const x = [-42, -36, -30][i]
    smoke(ctx, L.x(x), L.y(-6.2), 3.2 * L.s * (1 + i * 0.2), 1, t, 40 + i, mix(FLAME.smoke, '#6E6866', 0.35 + 0.3 * clamp01((t - 128) / 12)))
  }
  // The fires still low along it.
  for (let i = 0; i < 5; i++) {
    const x = -46 + i * 4.2
    const b = burning(x, t)
    if (b <= 0.02) continue
    const h = (0.9 + 0.3 * Math.sin(t * 2.1 + i)) * b
    blob(ctx, [[L.x(x - 0.9), L.y(-5.6)], [L.x(x), L.y(-5.6 - h * 1.6)], [L.x(x + 0.9), L.y(-5.6)]])
    fill(ctx, rgba(FLAME.body, 0.85))
  }
  ctx.restore()
}

/** The sledge's eye where the ropes are made fast, for the plan. */
export const ropeEye = (t: number): Pt => toWorld(horseAt(t), [-2.75, -0.18])
export { BU }
