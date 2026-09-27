import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { drawHeptapod, drawInk, mix, rgba } from '../cast'
import { frame, hash, smooth } from '../kit'
import { FOG } from '../worlds'
import {
  ABBOTT,
  abbottFog,
  abbottSink,
  costelloAt,
  costelloReach,
  GREAT,
  greatBloom,
  greatC,
  greatFade,
  greatTendrils,
  greatTurn,
  flood,
  gathering,
  greatU,
  RG,
  JETS,
  SMALL,
  SMALL_TURN,
  smallBloom,
  smallC,
  smallFade,
  smallR,
  smallTendrils,
  smallU,
  T_OUT,
} from './plan'

/**
 * Beyond the glass, drawn by show time: white fog with no floor, soft volumes of it drifting at three depths, the light
 * from nowhere; Abbott far back in the white, sinking; Costello near, on her right; and their writing, the one dark
 * thing in the picture.
 */

type Frame = ReturnType<typeof frame>
type Ctx = CanvasRenderingContext2D

/** Where a point of a layer at depth `d` (1 her plane, toward 0 far off) is drawn, seen from the frame's centre. */
const seen = (f: Frame, d: number, x: number, y: number): Pt => [f.cx + d * (x - f.cx), f.cy + d * (y - f.cy)]

/** A soft lobe of fog: dense in the middle, gone at its edge; long and low. */
function lobe(ctx: Ctx, k: number, x: number, y: number, rx: number, ry: number, col: string, a: number): void {
  if (a <= 0.004 || rx * k < 1) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, rgba(col, a))
  g.addColorStop(0.55, rgba(col, a * 0.55))
  g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

interface Layer {
  d: number
  step: number
  size: number
  drift: number
  cols: string[]
  a: number
  seed: number
}
const LAYERS: Layer[] = [
  { d: 0.3, step: 7, size: 7.5, drift: 0.06, cols: [FOG.grey, FOG.deep, FOG.deep], a: 0.5, seed: 11 },
  { d: 0.55, step: 6.5, size: 5.5, drift: 0.1, cols: [FOG.grey, FOG.deep, FOG.white], a: 0.36, seed: 12 },
  { d: 0.85, step: 8, size: 4.8, drift: 0.16, cols: [FOG.white, FOG.grey, FOG.white], a: 0.34, seed: 13 },
]

function drawLayer(ctx: Ctx, k: number, f: Frame, L: Layer, t: number): void {
  const x0 = f.cx + (f.x0 - f.cx) / L.d - L.size * 2
  const x1 = f.cx + (f.x1 - f.cx) / L.d + L.size * 2
  const y0 = f.cy + (f.y0 - f.cy) / L.d - L.size
  const y1 = f.cy + (f.y1 - f.cy) / L.d + L.size
  const shift = L.drift * t
  const sy = L.step * 0.5
  for (let j = Math.floor(y0 / sy); j <= Math.ceil(y1 / sy); j++) {
    for (let i = Math.floor((x0 - shift) / L.step); i <= Math.ceil((x1 - shift) / L.step); i++) {
      const hx = hash(i, j, L.seed)
      const hy = hash(i, j, L.seed + 7)
      const lx = (i + 0.2 + 0.6 * hx) * L.step + shift + Math.sin(t * 0.07 + i * 1.3 + j) * 0.8
      const ly = (j + 0.2 + 0.6 * hy) * sy + Math.sin(t * 0.05 + i * 0.7) * 0.3
      const [x, y] = seen(f, L.d, lx, ly)
      const size = L.size * (0.6 + 0.8 * hash(i, j, L.seed + 3)) * L.d
      const col = L.cols[Math.floor(hash(i, j, L.seed + 5) * L.cols.length)]
      const a = L.a * (0.5 + 0.5 * Math.sin(t * 0.11 + hx * 9))
      lobe(ctx, k, x, y, size, size * (0.28 + 0.18 * hy), col, a)
    }
  }
}

/** The light from nowhere: brighter where she is, greying toward the frame's edges and its top. */
function drawAir(ctx: Ctx, k: number, f: Frame, t: number): void {
  const w = f.x1 - f.x0
  const h = f.y1 - f.y0
  const top = mix(FOG.white, FOG.grey, 0.7)
  const g = ctx.createLinearGradient(0, f.y0 * k, 0, f.y1 * k)
  g.addColorStop(0, top)
  g.addColorStop(0.55, FOG.white)
  g.addColorStop(1, mix(FOG.white, FOG.grey, 0.35))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (w + 2) * k, (h + 2) * k)
  // A breath of brighter light in the middle of the frame, slowly moving.
  const cx = f.cx + Math.sin(t * 0.09) * w * 0.06
  const cy = f.cy + h * 0.05
  const r = Math.max(w, h) * 0.55
  const glow = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, r * k)
  glow.addColorStop(0, rgba(FOG.white, 0.6))
  glow.addColorStop(1, rgba(FOG.white, 0))
  ctx.fillStyle = glow
  ctx.fillRect((cx - r) * k, (cy - r) * k, 2 * r * k, 2 * r * k)
}

/* ------------------------------------------------------------------ the heptapods */

function abbott(p: p5, k: number, f: Frame, t: number): void {
  if (t > T_OUT + 0.5) return
  const sink = abbottSink(t)
  const fog = abbottFog(t)
  if (fog >= 0.985) return
  const at = seen(f, ABBOTT.depth, ABBOTT.at[0], ABBOTT.at[1] + sink / ABBOTT.depth)
  drawHeptapod(p, k * ABBOTT.depth, at[0] / ABBOTT.depth, at[1] / ABBOTT.depth, ABBOTT.s, {
    t,
    fog,
    fogColor: FLOOR,
    seed: ABBOTT.seed,
    color: FOG.heptapod,
    lean: -0.06 * sink,
    face: 1,
  })
  feetFog(p.drawingContext as Ctx, k, f, at[1], ABBOTT.s * ABBOTT.depth)
}

/** A jet of ink from a pointing limb's tip to where the writing begins, landing on the beat, then drawn in to it. */
function jet(ctx: Ctx, k: number, t: number): void {
  for (const J of JETS) {
    if (t < J.from || t > J.fade) continue
    const a = J.tip
    const b = J.at
    const head = smooth(t, J.from, J.to)
    const tail = smooth(t, J.to, J.fade)
    if (head - tail < 0.01) continue
    // A little arc, sagging, from tip to target.
    const mid: Pt = [(a[0] + b[0]) / 2 + 0.05, (a[1] + b[1]) / 2 + J.sag]
    const at = (s: number): Pt => [(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * mid[0] + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * mid[1] + s * s * b[1]]
    const n = 18
    const L: Pt[] = []
    const R: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const s = tail + ((head - tail) * i) / n
      const [x, y] = at(s)
      const [x2, y2] = at(Math.min(1, s + 0.01))
      const [x1, y1] = at(Math.max(0, s - 0.01))
      const tx = x2 - x1
      const ty = y2 - y1
      const tl = Math.hypot(tx, ty) || 1
      // Thin from the tip, swelling toward its head.
      const w = (0.02 + 0.055 * (i / n) ** 1.5) * (1 - 0.5 * tail)
      L.push([x - (ty / tl) * w, y + (tx / tl) * w])
      R.push([x + (ty / tl) * w, y - (tx / tl) * w])
    }
    ctx.beginPath()
    ctx.moveTo(L[0][0] * k, L[0][1] * k)
    for (const q of L) ctx.lineTo(q[0] * k, q[1] * k)
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0] * k, R[i][1] * k)
    ctx.closePath()
    ctx.fillStyle = rgba(FOG.ink, 0.9 * (1 - 0.6 * tail))
    ctx.fill()
  }
}

/** The white a heptapod stands in: the whole frame's width, thickening down from its knees, so its feet are lost. */
const FLOOR = mix(FOG.white, FOG.grey, 0.22)
function feetFog(ctx: Ctx, k: number, f: Frame, y: number, s: number): void {
  const y0 = y - 0.6 * s
  const y1 = y - 0.12 * s
  if (y0 > f.y1 + 0.5) return
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    g.addColorStop(u, rgba(FLOOR, u * u * (3 - 2 * u)))
  }
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, y0 * k, (f.x1 - f.x0 + 2) * k, (y1 - y0) * k)
  if (y1 < f.y1 + 1) {
    ctx.fillStyle = FLOOR
    ctx.fillRect((f.x0 - 1) * k, y1 * k, (f.x1 - f.x0 + 2) * k, (f.y1 + 1 - y1) * k)
  }
}

function costello(p: p5, k: number, f: Frame, t: number): void {
  const { at, d, fog, s: size } = costelloAt(t)
  const [x, y] = seen(f, d, at[0], at[1])
  // The reach is to a point in her plane: drawn at its depth's scale, the point is where it is on the screen.
  const r = costelloReach(t)
  drawHeptapod(p, k * d, x / d, y / d, size, {
    t,
    fog,
    fogColor: FLOOR,
    seed: 2,
    color: FOG.heptapod,
    face: -1,
    lean: -0.08 + 0.03 * Math.sin(t * 0.21),
    reach: r ? { ...r, to: [r.to[0] / d, r.to[1] / d] } : undefined,
  })
  feetFog(p.drawingContext as Ctx, k, f, y, size * d)
}

/* ------------------------------------------------------------------ the writing */

function great(p: p5, k: number, t: number): void {
  const u = greatU(t)
  if (u <= 0) return
  const c = greatC(t)
  p.push()
  p.translate(c[0] * k, c[1] * k)
  p.rotate(greatTurn(t))
  drawInk(p, k, 0, 0, RG, GREAT, u, { tendrils: greatTendrils(t), bloom: greatBloom(t), fade: greatFade(t) })
  p.pop()
}

function small(p: p5, k: number, f: Frame, t: number): void {
  const u = smallU(t)
  if (u <= 0) return
  const c = smallC(t)
  const R = smallR(t)
  const ctx = p.drawingContext as Ctx
  const diag = Math.hypot(f.x1 - f.x0, f.y1 - f.y0)
  // As its ends come round to her the fog gathers grey about it...
  const g = gathering(t)
  if (g > 0.005) {
    const gr = ctx.createRadialGradient(c[0] * k, c[1] * k, R * 0.9 * k, c[0] * k, c[1] * k, diag * 0.75 * k)
    gr.addColorStop(0, rgba(FOG.deep, 0))
    gr.addColorStop(1, rgba(mix(FOG.deep, FOG.shadow, 0.5), g))
    ctx.fillStyle = gr
    ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  }
  // ...and when they meet at her touch the white floods out from it over everything but it and her.
  const fl = flood(t)
  if (fl.a > 0.005) {
    const reach = R * 1.2 + diag * fl.r
    const gr = ctx.createRadialGradient(c[0] * k, c[1] * k, 0, c[0] * k, c[1] * k, reach * k)
    gr.addColorStop(0, rgba(FOG.white, fl.a))
    gr.addColorStop(0.75, rgba(FOG.white, fl.a * 0.92))
    gr.addColorStop(1, rgba(FOG.white, 0))
    ctx.fillStyle = gr
    ctx.fillRect((c[0] - reach) * k, (c[1] - reach) * k, 2 * reach * k, 2 * reach * k)
  }
  p.push()
  p.translate(c[0] * k, c[1] * k)
  p.rotate(SMALL_TURN)
  drawInk(p, k, 0, 0, R, SMALL, u, { tendrils: smallTendrils(t), bloom: smallBloom(t), fade: smallFade(t) })
  p.pop()
}

/** The fog's standing drawing: only ever on the stage while she is beyond the glass. */
export function drawFog(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as Ctx
  const f = frame(p, k)
  p.push()
  p.noStroke()
  drawAir(ctx, k, f, t)
  drawLayer(ctx, k, f, LAYERS[0], t)
  abbott(p, k, f, t)
  drawLayer(ctx, k, f, LAYERS[1], t)
  costello(p, k, f, t)
  drawLayer(ctx, k, f, LAYERS[2], t)
  jet(ctx, k, t)
  great(p, k, t)
  small(p, k, f, t)
  p.pop()
}
