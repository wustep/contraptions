import { drift, hash, layer, mix, rgba, smooth, vgrad, type Paint, type View } from '../../paint'
import { STORM } from './geo'

/**
 * The storm: a wall of dust from the sand to far above any frame, standing across the desert from STORM.front to
 * STORM.back. Its one job is to hide them.
 *
 * Outside, it is one body of dust, painted soft: into a small buffer about two hundred pixels across, lightly blurred, and
 * laid over the frame scaled up, so nothing of it has a hard edge. Its front leans out over its own foot and heaves
 * slowly; its leading edge thins into the clear air, the dunes seen through it; darker masses turn over slowly inside
 * its face; long wisps lift off its face and stream forward on the wind ahead of it and thin away; the low sun grazes
 * its upper face. Inside, the frame is its body: dun above, thickening to a dark core over the sand, a few great masses
 * going by on the wind, and a thin veil of it in front of everything. No particles, no specks, no lightning: the size
 * and the slowness are the storm.
 */

const TOP = '#C29469'
const FACE = '#9A6E47'
const FOOT = '#3E2D20'
const DUSK = '#5A3E29'
const SUN = '#E2BC8E'
const BODY_HI = '#8F6847'
const BODY_MID = '#6A4A31'
const BODY_LO = '#3A281B'
const CORE = '#1A110B'

/* ---------------------------------------------------------------- its shape */

/**
 * The swells on a face: long low swellings of dust, a few cells out of the face and many tall, rising slowly up it as
 * the storm turns over, from its foot to far above any frame. Low and long, so the face is a wall that heaves, never a
 * profile.
 */
interface Swell {
  y: number
  out: number
  tall: number
}

function swells(t: number, seed: number): Swell[] {
  const out: Swell[] = []
  const H = 170
  const n = 9
  for (let i = 0; i < n; i++) {
    const life = ((i / n) * H + t * 0.45 * (0.8 + 0.4 * hash(i, seed + 1))) % H
    const tall = 12 + 12 * hash(i, seed + 2)
    const swell = smooth(life, 0, 16) * (1 - smooth(life, H - 20, H))
    out.push({ y: -life, out: (1.5 + 2.5 * hash(i, seed + 3)) * swell, tall })
  }
  return out
}

/**
 * A face's edge at height `y`: the front leans out over the sand as it rises (the wall overhangs its own foot), the
 * back trails away from its foot; each wavers slowly, and its swells heave it.
 */
function edge(face: number, side: 1 | -1, y: number, t: number, seed: number, ss: Swell[]): number {
  const lean = side < 0 ? 10 * smooth(-y, 6, 110) : -18 * smooth(-y, 0, 90) + 3
  let heave = 0
  for (const m of ss) heave += m.out * Math.exp(-(((y - m.y) / m.tall) ** 2))
  return face + side * (lean + heave) + 2 * drift(y * 0.012 + t * 0.03, seed)
}

/** Where the wall meets the sand, seen from outside: just under the floor's line, so no seam shows between them. */
const SAND = 0.05

/**
 * The storm's body as a path on `ctx`: up the front face, across far over any frame, down the back face, and across at
 * `foot`; `grow` cells out beyond both faces (its thin edge).
 */
function body(ctx: CanvasRenderingContext2D, view: View, t: number, foot: number, grow = 0): void {
  const front = swells(t, 5)
  const back = swells(t, 9)
  const top = Math.min(STORM.top, view.y0 - 20)
  const step = Math.max(1.5, -top / 120)
  const f = (y: number) => edge(STORM.front, -1, y, t, 3, front) - grow
  const b = (y: number) => edge(STORM.back, 1, y, t, 7, back) + grow
  ctx.beginPath()
  ctx.moveTo(f(foot), foot)
  for (let y = Math.min(1, foot); y >= top; y -= step) ctx.lineTo(f(y), y)
  ctx.lineTo(f(top), top - 1)
  ctx.lineTo(b(top), top - 1)
  for (let y = top; y <= Math.min(1, foot); y += step) ctx.lineTo(b(y), y)
  ctx.lineTo(b(foot), foot)
  ctx.closePath()
}

/* ---------------------------------------------------------------- soft painting */

/** A small buffer for each canvas the show paints on (the stage, a saved video's frame), and its blurred copy. */
const buffers = new WeakMap<HTMLCanvasElement, [HTMLCanvasElement, HTMLCanvasElement]>()

/**
 * Paint `fn` (in world cells, as on the frame) into a buffer about 210 pixels across, blur it a pixel, and lay it over
 * the whole frame scaled up: everything in it comes out soft-edged, a few cells soft at any distance.
 */
function soft(g: Paint, fn: (ctx: CanvasRenderingContext2D) => void): void {
  const main = g.ctx.canvas as HTMLCanvasElement
  let pair = buffers.get(main)
  if (!pair) {
    pair = [document.createElement('canvas'), document.createElement('canvas')]
    buffers.set(main, pair)
  }
  const [buf, blur] = pair
  const f = Math.max(2, main.width / 210)
  const w = Math.max(8, Math.round(main.width / f))
  const h = Math.max(8, Math.round(main.height / f))
  for (const c of pair) {
    if (c.width !== w || c.height !== h) {
      c.width = w
      c.height = h
    }
  }
  const sx = w / main.width
  const sy = h / main.height
  const b = buf.getContext('2d')!
  b.setTransform(1, 0, 0, 1, 0, 0)
  b.clearRect(0, 0, w, h)
  const m = g.ctx.getTransform()
  b.setTransform(m.a * sx, m.b * sy, m.c * sx, m.d * sy, m.e * sx, m.f * sy)
  fn(b)
  const bl = blur.getContext('2d')!
  bl.setTransform(1, 0, 0, 1, 0, 0)
  bl.clearRect(0, 0, w, h)
  bl.filter = 'blur(1.8px)'
  bl.drawImage(buf, 0, 0)
  bl.filter = 'none'
  const ctx = g.ctx
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(blur, 0, 0, main.width, main.height)
  ctx.restore()
}

/* ---------------------------------------------------------------- outside */

/** The wisps: long thin drifts lifting off the front face and streaming forward on the wind, thinning as they go. */
function wisps(ctx: CanvasRenderingContext2D, t: number, front: Swell[]): void {
  const n = 7
  const life = 7
  for (let i = 0; i < n; i++) {
    const phase = (((t + hash(i, 61) * life) % life) + life) % life
    const born = t - phase
    const y0 = -2 - 42 * hash(i, 62) ** 1.3 - 6 * hash(Math.floor(born / life), 63 + i)
    const x0 = edge(STORM.front, -1, y0, born, 3, front)
    const u = phase / life
    const x = x0 - 3 - 2 * phase
    const y = y0 - 0.5 * phase
    const a = 0.34 * smooth(u, 0, 0.2) * (1 - smooth(u, 0.4, 1))
    const len = 3 + 3 * hash(i, 64) + 0.8 * phase
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(0.06)
    ctx.beginPath()
    ctx.ellipse(0, 0, len, 0.5 + 0.6 * hash(i, 65), 0, 0, Math.PI * 2)
    ctx.fillStyle = rgba(mix(FACE, TOP, 0.4), a)
    ctx.fill()
    ctx.restore()
  }
}

/** Darker masses turning over slowly inside the face, behind its front, rising: tone in the dust, never a spot. */
function churn(ctx: CanvasRenderingContext2D, t: number, front: Swell[]): void {
  const n = 5
  const H = 120
  for (let i = 0; i < n; i++) {
    const rise = ((i / n) * H + t * 0.6 * (0.8 + 0.4 * hash(i, 71))) % H
    const r = 14 + 10 * hash(i, 72)
    const y = -rise + r * 0.5
    const a = 0.13 * smooth(rise, 0, 14) * (1 - smooth(rise, H - 16, H))
    const x = edge(STORM.front, -1, y, t, 3, front) + r * 0.9 + 3 * hash(i, 73) + 1.5 * drift(t * 0.08 + i, 74)
    // Densest at its middle and gone at its edge, so it is a darkening in the dust and has no outline at all.
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, rgba(DUSK, a * 1.6))
    gr.addColorStop(0.5, rgba(DUSK, a))
    gr.addColorStop(1, rgba(DUSK, 0))
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The low sun grazing the upper face: a warm band down its edge from about twenty cells up, inside it. */
function graze(ctx: CanvasRenderingContext2D, view: View, t: number, front: Swell[]): void {
  const top = Math.min(STORM.top, view.y0 - 20)
  ctx.beginPath()
  for (let y = -14; y >= top; y -= 2) ctx.lineTo(edge(STORM.front, -1, y, t, 3, front) - 0.5, y)
  for (let y = top; y <= -14; y += 2) ctx.lineTo(edge(STORM.front, -1, y, t, 3, front) + 5, y)
  ctx.closePath()
  ctx.fillStyle = vgrad(ctx, -14, -55, [[0, rgba(SUN, 0)], [1, rgba(SUN, 0.5)]])
  ctx.fill()
}

/** The storm seen from outside, soft: its thin edge, its body, the churn in its face, the sun on it, its wisps. */
export function drawWall(g: Paint): void {
  const v = g.view
  if (v.x1 < STORM.front - 70 || v.x0 > STORM.back + 60) return
  const t = g.t
  soft(g, (ctx) => {
    const fill = vgrad(ctx, -60, 1, [[0, TOP], [0.55, FACE], [0.9, mix(FACE, FOOT, 0.55)], [1, FOOT]])
    // The thin edge round it: the same dust thinning out over a tenth of the frame's height, the dunes seen through it,
    // in fine steps the blur runs together.
    ctx.fillStyle = fill
    ctx.globalAlpha = 0.085
    for (let i = 8; i >= 1; i--) {
      body(ctx, v, t, SAND, i * 0.0115 * v.h)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    body(ctx, v, t, SAND, 0)
    ctx.fill()
    const front = swells(t, 5)
    ctx.save()
    body(ctx, v, t, SAND, 0)
    ctx.clip()
    churn(ctx, t, front)
    graze(ctx, v, t, front)
    ctx.restore()
    wisps(ctx, t, front)
    // Its skirt of dust over the sand ahead of it and behind it.
    for (const [face, side] of [[STORM.front, -1], [STORM.back, 1]] as [number, 1 | -1][]) {
      ctx.beginPath()
      ctx.moveTo(face + side * 2, SAND)
      ctx.quadraticCurveTo(face + side * 10, -2.2, face + side * 28, SAND)
      ctx.closePath()
      ctx.fillStyle = rgba(FOOT, 0.45)
      ctx.fill()
    }
  })
}

/* ---------------------------------------------------------------- inside */

/** How deep in the storm the view's middle is: 0 outside, 1 well in. */
const deep = (x: number) => smooth(x, STORM.front + 1, STORM.front + 7) * (1 - smooth(x, STORM.back - 6, STORM.back - 1))

/** Inside: the body's browns and the great masses going by on the wind, behind the thopter, coming in as it goes in. */
export function drawInside(g: Paint): void {
  const v = g.view
  const k = deep(v.cx)
  if (k <= 0.002) return
  const ctx = g.ctx
  // The body by height in the world: dun where the light still gets in, high up, thickening downward to a dark core
  // over the sand, so a drop with the wings folded is a fall into it.
  ctx.fillStyle = vgrad(ctx, -14, 1, [[0, rgba(BODY_HI, k)], [0.45, rgba(BODY_MID, k)], [0.8, rgba(BODY_LO, k)], [1, rgba(CORE, k)]])
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.w + 2, v.h + 2)
  // A few great masses on the wind at two depths, slow, their edges lost in the dust round them.
  const wind = 4
  for (const [d, n, tone, a, span] of [[18, 3, '#9E7957', 0.4, 120], [4, 3, '#2C1E14', 0.5, 70]] as [number, number, string, number, number][]) {
    const L = layer(v, d)
    for (let i = 0; i < n; i++) {
      const r = 9 + 7 * hash(i, d)
      const speed = wind * (0.7 + 0.5 * hash(i, d + 1))
      // Each where the wind has it, wrapped round a span about the camera, out of the frame.
      const x = v.cx + ((((hash(i, d + 2) * span - g.t * speed - v.cx) % span) + span) % span) - span / 2
      const y = -5 + (hash(i, d + 3) - 0.5) * 14 + 2 * drift(g.t * 0.06 + i, d)
      const cx = L.x(x)
      const cy = L.y(y)
      const rr = r * L.s
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr)
      gr.addColorStop(0, rgba(tone, a * k))
      gr.addColorStop(0.55, rgba(tone, a * k * 0.6))
      gr.addColorStop(1, rgba(tone, 0))
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1.6, 1)
      ctx.translate(-cx, -cy)
      ctx.fillStyle = gr
      ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2)
      ctx.restore()
    }
  }
}

/** In front of everything inside: a thin veil of the dust. */
export function drawVeil(g: Paint): void {
  const k = deep(g.view.cx)
  if (k <= 0.002) return
  g.ctx.fillStyle = rgba('#7A5534', 0.2 * k)
  g.ctx.fillRect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, g.view.h + 2)
}
