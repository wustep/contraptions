import { drift, fill, hash, layer, mix, rgba, smooth, vgrad, type Paint } from '../../paint'
import { STORM } from './geo'

/**
 * The storm: a wall of dust from the sand to far above the frame, standing across the desert from STORM.front to
 * STORM.back. Its one job is to hide them.
 *
 * Outside, it is one body: each face a slow wavering edge from the sand to the sky, heaped with great lobes that bulge a
 * little out of it and churn slowly upward, warm where the low light is on it and dark at its foot, with a dark skirt of
 * dust running out over the sand ahead of it. Inside, the frame is its body: browns, lighter above, and through them a
 * few big slow shapes going by on the wind at three depths, and a thin veil of it in front of everything. No texture, no
 * specks, no lightning: the size and the slowness are the storm.
 */

const TOP = '#C29469'
const FACE = '#9A6E47'
const FOOT = '#3E2D20'
const BODY_HI = '#8F6847'
const BODY_MID = '#6A4A31'
const BODY_LO = '#3A281B'
const CORE = '#1A110B'

/** The wall's fill, by height: one gradient for every shape of it, so its lobes and its body are one. */
function wallFill(g: Paint): CanvasGradient {
  return vgrad(g.ctx, -60, 1, [[0, TOP], [0.55, FACE], [0.9, mix(FACE, FOOT, 0.55)], [1, FOOT]])
}

/**
 * The swells on a face: long low swellings of dust, a few cells out of the face and many tall, rising slowly up it as
 * the storm turns over, from its foot to far above any frame, coming out of it and sinking back before they come round.
 * Low and long, so the face is a wall that heaves, never a profile.
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

/**
 * The storm's body as a path: up the front face, across far over any frame, down the back face, and across at
 * `foot`: the sand's surface for the wall seen from outside (the floor runs on under it toward us), or past the frame's
 * foot from inside, where everything is the storm.
 */
function body(g: Paint, foot: number): void {
  const ctx = g.ctx
  const front = swells(g.t, 5)
  const back = swells(g.t, 9)
  const top = Math.min(STORM.top, g.view.y0 - 20)
  const step = Math.max(1.5, -top / 120)
  ctx.beginPath()
  ctx.moveTo(edge(STORM.front, -1, foot, g.t, 3, front), foot)
  for (let y = Math.min(1, foot); y >= top; y -= step) ctx.lineTo(edge(STORM.front, -1, y, g.t, 3, front), y)
  ctx.lineTo(edge(STORM.front, -1, top, g.t, 3, front), top - 1)
  ctx.lineTo(edge(STORM.back, 1, top, g.t, 7, back), top - 1)
  for (let y = top; y <= Math.min(1, foot); y += step) ctx.lineTo(edge(STORM.back, 1, y, g.t, 7, back), y)
  ctx.lineTo(edge(STORM.back, 1, foot, g.t, 7, back), foot)
  ctx.closePath()
}

/** Where the wall meets the sand, seen from outside: just under the floor's line, so no seam shows between them. */
const SAND = 0.05

/** The storm from outside: the skirts of dust over the sand, and the body. */
export function drawWall(g: Paint): void {
  const v = g.view
  if (v.x1 < STORM.front - 60 || v.x0 > STORM.back + 60) return
  const ctx = g.ctx
  // The skirts of dust over the sand, ahead of the front face and behind the back one: low and dark.
  for (const [face, side] of [[STORM.front, -1], [STORM.back, 1]] as [number, 1 | -1][]) {
    ctx.beginPath()
    ctx.moveTo(face + side * 2, SAND)
    ctx.quadraticCurveTo(face + side * 10, -1.8, face + side * 26, SAND)
    ctx.closePath()
    fill(ctx, rgba(FOOT, 0.5))
  }
  body(g, SAND)
  fill(ctx, wallFill(g))
}

/** How deep in the storm the view's middle is: 0 outside, 1 well in. */
const deep = (x: number) => smooth(x, STORM.front + 1, STORM.front + 6) * (1 - smooth(x, STORM.back - 6, STORM.back - 1))

/** Inside: the body's browns, and the shapes going by on the wind, behind the thopter. */
export function drawInside(g: Paint): void {
  const v = g.view
  const k = deep(v.cx)
  if (k <= 0.002) return
  const ctx = g.ctx
  ctx.save()
  body(g, Math.max(40, v.y1 + 20))
  ctx.clip()
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
  ctx.restore()
}

/** In front of everything inside: a thin veil of the dust. */
export function drawVeil(g: Paint): void {
  const k = deep(g.view.cx)
  if (k <= 0.002) return
  const ctx = g.ctx
  ctx.save()
  body(g, Math.max(40, g.view.y1 + 20))
  ctx.clip()
  ctx.fillStyle = rgba('#7A5534', 0.2 * k)
  ctx.fillRect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, g.view.h + 2)
  ctx.restore()
}
