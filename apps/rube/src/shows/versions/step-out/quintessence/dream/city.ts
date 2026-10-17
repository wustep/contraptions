import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { layer, onLayer, type View } from '../depth'
import { ctxOf, loop, rgba, type Pen } from './pen'
import { T0 } from './geo'
import { fireT } from './draw'

/**
 * The city behind the daydream: the night past true, on two planes behind the platform and the burning building.
 *
 * - Far (z 0.15): a big moon low over the magenta haze, with open sky round it, and under it the towers'
 *   silhouettes, a few of their windows lit.
 * - Near (z 0.6): the dark fronts across the tracks, a few windows lit, their edges toward the fire taking its light.
 *
 * Between them (z 0.35) the one thing that moves on its own: a small flock of pigeons the fire has put up, wheeling.
 *
 * Every colour goes through the pen's tone, so it all drains to grey with the rest in the last bar. The silhouettes
 * and their windows are made once, in cells; what moves is drawn each frame.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera is for most of the daydream, and how close: where every plane is composed as seen. */
const ANCHOR: Pt = [3.5, -1.3]
const REF = 4.3

const K = {
  far: '#2A1D49',
  farHaze: '#6A2C62',
  near: '#1A1131',
  win: '#FFB45C',
  sodium: '#FF9A3C',
  moon: '#F4DCC2',
  smoke: '#3A2944',
  smokeLit: '#C8642E',
}

interface Plane {
  z: number
  body: Path2D
  /** The edge of each front on the side toward the fire. */
  edge: Path2D | null
  lit: Path2D
  color: string
}

/** A rect into a path, in cells. */
const box = (p: Path2D, x0: number, y0: number, x1: number, y1: number) => p.rect(x0, y0, x1 - x0, y1 - y0)

/** The moon, low and big, in the far plane's cells: one plain disc, and no tower stands in front of it. */
const MOON = { x: 1.15, y: -2.85, r: 0.42 }

/**
 * A run of buildings from `x0` to `x1`: widths and heights from the seed, their tops between `low` and `high` (but
 * never up over the moon), down to `base`; windows in a grid of `win` cells, lit in `share` of the buildings and in
 * those `lit` of them on, down to where the next plane forward hides this one for good.
 */
function skyline(x0: number, x1: number, base: number, low: number, high: number, wmin: number, wmax: number, win: [number, number, number, number], share: number, lit: number, seed: number, hidden: number, edged: boolean): Omit<Plane, 'z' | 'color'> {
  const body = new Path2D()
  const edge = edged ? new Path2D() : null
  const litP = new Path2D()
  const [ww, wh, gx, gy] = win
  const under = MOON.y + MOON.r + 0.12
  let x = x0
  for (let i = 0; x < x1; i++) {
    const w = wmin + (wmax - wmin) * hash(i, 1, seed)
    let top = low + (high - low) * Math.pow(hash(i, 2, seed), 1.6)
    if (x < MOON.x + MOON.r + 0.1 && x + w > MOON.x - MOON.r - 0.1) top = Math.max(top, under)
    box(body, x, top, x + w + 0.004, base)
    if (edge) box(edge, x + w - 0.025, top, x + w, base)
    if (hash(i, 3, seed) < share)
      for (let wy = top + gy; wy < Math.min(base - gy, hidden); wy += gy) {
        for (let wx = x + (w - Math.floor((w - 0.06) / gx) * gx) / 2; wx + ww < x + w - 0.04; wx += gx) {
          if (hash(Math.round(wx * 100), Math.round(wy * 100), seed) < lit) box(litP, wx, wy, wx + ww, wy + wh)
        }
      }
    x += w
  }
  return { body, edge, lit: litP }
}

let planes: Plane[] | null = null

function made(): Plane[] {
  if (planes) return planes
  const far = skyline(-4.5, 10.5, 1.2, -1.6, -3.3, 0.28, 0.62, [0.035, 0.05, 0.085, 0.13], 0.3, 0.12, 5, -0.3, false)
  const near = skyline(-5.5, 3.6, 1.6, -0.2, -1.05, 0.7, 1.3, [0.08, 0.11, 0.21, 0.26], 1, 0.06, 13, 1.6, true)
  planes = [
    { z: 0.15, color: K.far, ...far },
    { z: 0.6, color: K.near, ...near },
  ]
  return planes
}

/* ------------------------------------------------------------------ what moves */

function moon(ctx: C2, pen: Pen, k: number): void {
  const { x, y, r } = MOON
  ctx.fillStyle = rgba(pen, K.moon, 0.88)
  ctx.beginPath()
  ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  ctx.fill()
}

/** Pigeons the fire has put up off the roofs, wheeling as one flock over them and drifting left (z 0.35). */
const FLOCK: Pt[] = [
  [0, 0],
  [-0.2, 0.07],
  [0.19, 0.05],
  [-0.38, -0.03],
  [0.36, -0.06],
]
function pigeons(ctx: C2, pen: Pen, k: number, t: number): void {
  const s = t - T0
  const cx = 0.8 - 0.04 * s
  const cy = -1.9
  const birds = new Path2D()
  // The flock goes round together; each bird keeps its place in it, bobbing a little on its own.
  const a = s * 0.42
  const fx = cx + 0.8 * Math.cos(a)
  const fy = cy + 0.22 * Math.sin(a)
  for (const [i, [dx, dy]] of FLOCK.entries()) {
    const x = fx + dx + 0.02 * Math.sin(s * 1.3 + i * 2.1)
    const y = fy + dy + 0.025 * Math.sin(s * 1.7 + i * 1.4)
    // Its wings: down, then up, a few times a second.
    const flap = 0.035 * Math.sin(s * 8.5 + i * 1.7)
    const span = 0.06
    birds.moveTo((x - span) * k, (y - flap) * k)
    birds.quadraticCurveTo((x - span / 2) * k, (y - 0.012) * k, x * k, y * k)
    birds.quadraticCurveTo((x + span / 2) * k, (y - 0.012) * k, (x + span) * k, (y - flap) * k)
  }
  ctx.save()
  ctx.strokeStyle = rgba(pen, '#140C26', 0.95)
  ctx.lineWidth = Math.max(1, 0.016 * k)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(birds)
  ctx.restore()
}

/* ------------------------------------------------------------------ the city, drawn */

/** Where, in the world, the far towers stand solid from: the sky need only be painted above it. */
export function skyFloor(v: View): number {
  return onLayer(v, 0.15, ANCHOR, REF, [0, -1.6])[1]
}

/**
 * The city behind the platform and the building, at show time `t`: `fire` is how hard the building burns (its light
 * on the near fronts, which face it).
 */
export function drawCity(pen: Pen, v: View, t: number, fire: number): void {
  const ctx = ctxOf(pen.p)
  const [far, near] = made()
  const ft = fireT(t)
  const flick = 0.8 + 0.2 * Math.sin(ft * 11.3) * Math.sin(ft * 4.7 + 1.3)
  layer(ctx, v, far.z, ANCHOR, REF, (inner) => {
    const k = inner.k
    moon(ctx, pen, k)
    ctx.save()
    ctx.scale(k, k)
    ctx.fillStyle = rgba(pen, far.color, 1)
    ctx.fill(far.body)
    ctx.fillStyle = rgba(pen, K.win, 0.55)
    ctx.fill(far.lit)
    ctx.restore()
    // The magenta haze over the far towers' feet.
    const h = ctx.createLinearGradient(0, -1.9 * k, 0, -0.35 * k)
    h.addColorStop(0, rgba(pen, K.farHaze, 0))
    h.addColorStop(1, rgba(pen, K.farHaze, 0.5))
    ctx.fillStyle = h
    ctx.fillRect((inner.x0 - 0.2) * k, -1.9 * k, (inner.w + 0.4) * k, 1.55 * k)
  })
  layer(ctx, v, 0.35, ANCHOR, REF, (inner) => pigeons(ctx, pen, inner.k, t))
  layer(ctx, v, near.z, ANCHOR, REF, (inner) => {
    ctx.save()
    ctx.scale(inner.k, inner.k)
    ctx.fillStyle = rgba(pen, near.color, 1)
    ctx.fill(near.body)
    // The fire's light on the fronts, flickering with it, and on their edges toward it, the more as it flares.
    if (fire > 0.01) {
      ctx.fillStyle = rgba(pen, K.sodium, 0.07 * Math.min(1.4, fire) * flick)
      ctx.fill(near.body)
    }
    if (near.edge) {
      ctx.fillStyle = rgba(pen, '#9A5A34', 0.35 + 0.4 * fire)
      ctx.fill(near.edge)
    }
    ctx.fillStyle = rgba(pen, K.win, 0.85)
    ctx.fill(near.lit)
    ctx.restore()
  })
}

/**
 * Smoke from the burning building going away over the city, behind it (z 0.75): big soft rolls drifting left and
 * up, lit amber from under by the fire.
 */
export function drawPlumes(pen: Pen, v: View, t: number, fire: number, amount: number): void {
  if (amount <= 0.01) return
  const ctx = ctxOf(pen.p)
  layer(ctx, v, 0.75, ANCHOR, REF, (inner) => {
    const k = inner.k
    const under = new Path2D()
    const body = new Path2D()
    for (let i = 0; i < 6; i++) {
      const age = (t * 0.06 + i / 6 + hash(i, 5) * 0.1) % 1
      const x = 5.2 - age * 7.5 + Math.sin(age * 3 + i) * 0.4
      const y = -6.3 - age * 2.6 + Math.sin(age * 5 + i * 2) * 0.25
      const r = 0.7 + age * 1.6
      if (x + r * 1.3 < inner.x0 || x - r * 1.3 > inner.x1 || y + r < inner.y0 || y - r > inner.y1) continue
      for (const [p, oy] of [[under, 0.22], [body, 0]] as const) {
        const pts: Pt[] = Array.from({ length: 7 }, (_, j) => {
          const a = (j / 7) * Math.PI * 2
          const rr = r * (0.82 + 0.22 * Math.sin(a * 3 + i * 1.7 + age * 4))
          return [x + Math.cos(a) * rr * 1.3, y + oy * r + Math.sin(a) * rr * 0.6]
        })
        loop(p, pts, k)
      }
    }
    ctx.fillStyle = rgba(pen, K.smokeLit, (0.1 + 0.12 * fire) * amount)
    ctx.fill(under)
    ctx.fillStyle = rgba(pen, K.smoke, 0.38 * amount)
    ctx.fill(body)
  })
}
