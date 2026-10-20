import { hash, mix, rgba, smooth, stroke, type Paint } from '../../draw'
import { M } from '../../music'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { seaLight, surface } from '../../world/sea'
import { skyAt, type SkyKey } from '../../world/sky'
import { DECK, onShip } from '../../world/ship'
import { lazy, shipPose, STRIKE } from '../sirens/course'

/**
 * Zeus's weather, from Thrinacia to the wreck: the seas that rise behind the ship (the sea's own swell stays as high as
 * the score lets it; these are the great backs of water beyond it), a few long sheets of rain, and the one bolt, a flat
 * jagged white shape from the cloud to the mast at the instant the music is cut off. Nothing glows: the bolt is its
 * shape, and the sky's own grey lifts by a little for a moment and settles.
 */

/**
 * How high the great seas stand, cells: the far rank behind, and the front rank, which comes up out of the waterline and
 * which the spar rides. They rise with the storm, ease a little after the strike, stand highest when the low voices come
 * back, and lie down when they go.
 */
export function farSeasAt(t: number): number {
  return 1.9 * smooth(t, 296, 303.5) - 0.5 * smooth(t, STRIKE + 1, STRIKE + 8) + 2.6 * smooth(t, M.lowBack - 0.5, M.lowBack + 3.5) - 4.0 * smooth(t, M.lowGone - 1, M.lowGone + 4.5)
}
export function frontSeasAt(t: number): number {
  return 1.0 * smooth(t, 296, 303.5) - 0.25 * smooth(t, STRIKE + 1, STRIKE + 8) + 1.6 * smooth(t, M.lowBack - 0.5, M.lowBack + 3.5) - 2.35 * smooth(t, M.lowGone - 1, M.lowGone + 4.5)
}

/** A rank's crest shape at x, 0 to 1: sharper crests than troughs, and a slow swell under them. */
function crest(x: number, t: number, wl: number, sp: number, k: number): number {
  const th = (x / wl) * Math.PI * 2 - (t * sp * Math.PI * 2) / wl
  // The seas come in sets: a long, slow rise and fall in their height along the sea.
  const set = 0.5 + 0.5 * Math.sin(x * 0.083 - t * 0.12 + k * 2.4)
  return Math.pow((1 + Math.sin(th)) / 2, 1.25) * (0.35 + 0.65 * set)
}

/** How far the front rank stands above the waterline at x: what a thing riding it is lifted by. */
export const frontLift = (x: number, t: number): number => Math.max(0, frontSeasAt(t)) * crest(x, t, 7.3, 6, 0.62)

/** How hard it rains, 0 to 1. */
export function rainAt(t: number): number {
  return 0.75 * smooth(t, 297.5, 301.5) + 0.25 * smooth(t, M.lowBack, M.lowBack + 3) - smooth(t, M.lowGone - 1.5, M.lowGone + 3.5)
}

/** The great seas: two ranks of long crests standing up from the waterline, the far one paler, the front one the sea's. */
export function drawSeas(g: Paint): void {
  const { ctx, t, view } = g
  const far = farSeasAt(t)
  const front = frontSeasAt(t)
  if (Math.max(far, front) <= 0.02 || view.x1 < 470 || view.x0 > 710) return
  const L = seaLight(t)
  const a = Math.max(view.x0 - 1, 465)
  const b = Math.min(view.x1 + 1, 715)
  const step = Math.max(0.1, (b - a) / 160)
  // Each rank a filled shape up to its crests, with the light on its backs as one thin line along them.
  const rank = (top: (x: number) => number, color: string, lit: number) => {
    ctx.beginPath()
    ctx.moveTo(a, 0.6)
    for (let x = a; x <= b + step; x += step) ctx.lineTo(x, top(x))
    ctx.lineTo(b + step, 0.6)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    ctx.beginPath()
    for (let x = a; x <= b + step; x += step) (x === a ? ctx.moveTo(x, top(x)) : ctx.lineTo(x, top(x)))
    stroke(g, rgba(L.lit, lit), 1.6)
  }
  if (far > 0.02) rank((x) => -far * crest(x, t, 11.5, 2.2, 1), mix(L.near, L.far, 0.22), 0.16 * Math.min(1, far))
  if (front > 0.02) rank((x) => surface(x, t) - front * crest(x, t, 7.3, 6, 0.62), mix(L.near, L.body, 0.2), 0.22 * Math.min(1, front))
}

/** The storm's ceiling: one low mass of cloud over everything, its underside in long slow lobes. */
export function drawCeiling(g: Paint): void {
  const { ctx, t, view } = g
  const s = smooth(t, 291, 299) * (1 - smooth(t, M.lowGone - 1, M.lowGone + 6))
  if (s <= 0.01 || view.x1 < 470 || view.x0 > 720) return
  const sky = skyAt(t)
  const Lr = layer(view, 70)
  const lx0 = view.cx + (view.x0 - view.cx) / Lr.s - 12
  const lx1 = view.cx + (view.x1 - view.cx) / Lr.s + 12
  const top = view.y0 - 1
  ctx.beginPath()
  ctx.moveTo(Lr.x(lx0), top)
  // Its underside: low, in two long, slow swells, coming down as the storm closes and lifting as it goes.
  for (let x = lx0; x <= lx1; x += 2) {
    const under = -10.5 + 2.2 * Math.sin(x * 0.09 + 0.7) + 1.1 * Math.sin(x * 0.031 - t * 0.05) - 6 * (1 - s)
    ctx.lineTo(Lr.x(x), Math.min(Lr.hy - 0.6, Lr.y(under)))
  }
  ctx.lineTo(Lr.x(lx1), top)
  ctx.closePath()
  ctx.fillStyle = rgba(mix(sky.top, '#0B0D0E', 0.35), 0.9 * s)
  ctx.fill()
}

/** A second bolt, far off on the horizon ahead, when the low voices come back: the storm turning on him again. */
const FAR_BOLT = M.lowBack
/** Where he is along the sea, for the far bolt to stand ahead of (the wreck sets it: `sparX`). */
let aheadOf: (t: number) => number = () => 600
export function setBoltAhead(fn: (t: number) => number): void {
  aheadOf = fn
}
export function drawFarBolt(g: Paint): void {
  const { ctx, t, view } = g
  const u = t - FAR_BOLT
  if (u < 0 || u > 0.4) return
  const a = u < 0.08 ? 0.75 : 0.75 * (1 - smooth(u, 0.08, 0.4))
  const L = layer(view, 90)
  const x0 = aheadOf(FAR_BOLT) + 22
  const pts: Pt[] = []
  for (let i = 0; i <= 7; i++) {
    const v = i / 7
    pts.push([L.x(x0 + (hash(i, 77) - 0.5) * 1.6 * (1 - v * 0.3) - 1.5 * v), L.y(-14 + 14 * v)])
  }
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.lineCap = 'round'
  ctx.strokeStyle = rgba('#E9E6DC', a)
  ctx.lineWidth = Math.max(1.5 * g.px, 0.12 * L.s)
  ctx.stroke()
}

/** Rain: a few long slanted sheets drifting across at the middle distance, faint, soft at their edges. */
export function drawRain(g: Paint): void {
  const { ctx, t, view } = g
  const r = rainAt(t)
  if (r <= 0.01 || view.x1 < 480 || view.x0 > 700) return
  const L = layer(view, 18)
  const slant = 0.42
  const spacing = 24
  const drift = t * 1.6
  // The span of layer x the frame shows, widened by the slant.
  const lx0 = view.cx + (view.x0 - view.h * slant - view.cx) / L.s
  const lx1 = view.cx + (view.x1 + view.h * slant - view.cx) / L.s
  const first = Math.floor((lx0 - drift) / spacing) - 1
  const last = Math.ceil((lx1 - drift) / spacing) + 1
  const top = view.y0 - 1
  const bot = view.y1 + 1
  for (let k = first; k <= last; k++) {
    const x0 = L.x(k * spacing + drift + hash(k, 4) * spacing * 0.5)
    const w = (6 + 6 * hash(k, 9)) * L.s
    const a = (0.035 + 0.03 * hash(k, 7)) * r
    // Soft at both edges: clear, then the rain's faint grey across its middle, then clear.
    const grad = ctx.createLinearGradient(x0, 0, x0 + w, 0)
    grad.addColorStop(0, rgba(RAIN, 0))
    grad.addColorStop(0.5, rgba(RAIN, a))
    grad.addColorStop(1, rgba(RAIN, 0))
    ctx.save()
    ctx.transform(1, 0, -slant, 1, slant * top, 0)
    ctx.fillStyle = grad
    ctx.fillRect(x0, top, w, bot - top)
    ctx.restore()
  }
}
const RAIN = '#AEB6B8'

/** The bolt's path: from the cloud far above, down in jags to the masthead, as the ship stood at the strike. */
const bolt = lazy(() => {
  const MAST_TOP: Pt = onShip(shipPose(STRIKE), [0.15, DECK - 2.4])
  const pts: Pt[] = []
  const top: Pt = [MAST_TOP[0] - 3.2, MAST_TOP[1] - 16]
  const n = 9
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const j = i === 0 || i === n ? 0 : (hash(i, 31) - 0.5) * 1.1 * (1 - u * 0.5)
    pts.push([top[0] + (MAST_TOP[0] - top[0]) * u + j, top[1] + (MAST_TOP[1] - top[1]) * Math.pow(u, 0.92)])
  }
  const fork: Pt[] = [pts[4], [pts[4][0] + 1.3, pts[4][1] + 1.6], [pts[4][0] + 1.6, pts[4][1] + 3.1]]
  return { pts, fork }
})

/** How much of the bolt is seen: whole for a tenth of a second, then gone over a quarter. */
export const boltAt = (t: number): number => (t < STRIKE ? 0 : t < STRIKE + 0.1 ? 1 : 1 - smooth(t, STRIKE + 0.1, STRIKE + 0.38))

export function drawBolt(g: Paint): void {
  const a = boltAt(g.t)
  if (a <= 0.003) return
  const { ctx } = g
  const ribbon = (pts: Pt[], w0: number, w1: number) => {
    const left: Pt[] = []
    const right: Pt[] = []
    for (let i = 0; i < pts.length; i++) {
      const p = pts[Math.max(0, i - 1)]
      const q = pts[Math.min(pts.length - 1, i + 1)]
      const dx = q[0] - p[0]
      const dy = q[1] - p[1]
      const d = Math.hypot(dx, dy) || 1
      const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2
      left.push([pts[i][0] - (dy / d) * w, pts[i][1] + (dx / d) * w])
      right.push([pts[i][0] + (dy / d) * w, pts[i][1] - (dx / d) * w])
    }
    ctx.beginPath()
    left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1])
    ctx.closePath()
    ctx.fillStyle = rgba('#F4F1E6', a)
    ctx.fill()
  }
  ribbon(bolt().pts, 0.2, 0.07)
  ribbon(bolt().fork, 0.08, 0.02)
}

/** The sky's grey lifted a little at the strike and settled: three keys over the base plan's storm. */
const STORM = { top: '#1E2224', low: '#3C4245', cloud: '#2B3032', cover: 0.95, far: '#3B4446', near: '#1E2729', body: '#172022', deep: '#040607', lit: '#7E898A', edge: '#0B1011' }
export const STRIKE_SKY: SkyKey[] = [
  { t: STRIKE - 0.05, ...STORM },
  { t: STRIKE + 0.06, ...STORM, top: '#353C40', low: '#5A6366', cloud: '#40474A' },
  { t: STRIKE + 0.7, ...STORM },
]
