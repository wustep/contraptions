import { drift, ellipse, fill, hash, layer, mix, rgba, smooth, vgrad, type Paint } from '../../paint'
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
const BODY_LO = '#4E3726'

/** The wall's fill, by height: one gradient for every shape of it, so its lobes and its body are one. */
function wallFill(g: Paint): CanvasGradient {
  return vgrad(g.ctx, -60, 1, [[0, TOP], [0.55, FACE], [0.9, mix(FACE, FOOT, 0.55)], [1, FOOT]])
}

/**
 * The masses on a face: great swellings of dust, each a few cells out of the face and many tall, rising slowly up it as
 * the storm turns over, swelling out of its foot and sinking back before they come round. Unequal, and few.
 */
interface Mass {
  y: number
  out: number
  tall: number
}

function masses(t: number, seed: number): Mass[] {
  const out: Mass[] = []
  const H = 90
  const n = 7
  for (let i = 0; i < n; i++) {
    const life = ((i / n) * H + t * 0.45 * (0.8 + 0.4 * hash(i, seed + 1))) % H
    const tall = 6 + 8 * hash(i, seed + 2)
    const swell = smooth(life, 0, 12) * (1 - smooth(life, H - 14, H))
    // Bigger toward the top, where the storm boils over its own foot.
    out.push({ y: -life, out: (3 + 7 * hash(i, seed + 3)) * (0.5 + 0.8 * smooth(life, 4, 40)) * swell, tall })
  }
  return out
}

/**
 * A face's edge at height `y`: the front leans out over the sand toward its top (the wall overhangs its own foot), the
 * back trails away from its foot as it goes up; each wavers slowly, and its masses swell out of it.
 */
function edge(face: number, side: 1 | -1, y: number, t: number, seed: number, ms: Mass[]): number {
  const lean = side < 0 ? 9 * smooth(-y, 4, 70) : -16 * smooth(-y, 0, 60) + 3
  let bulge = 0
  for (const m of ms) bulge += m.out * Math.exp(-(((y - m.y) / m.tall) ** 2))
  return face + side * (lean + bulge) + 2.4 * drift(y * 0.02 + t * 0.03, seed)
}

/** The storm's body as a path: up the front face, across the top, down the back face, and on down under the sand. */
function body(g: Paint): void {
  const ctx = g.ctx
  const front = masses(g.t, 5)
  const back = masses(g.t, 9)
  const step = 1.5
  ctx.beginPath()
  ctx.moveTo(edge(STORM.front, -1, 1, g.t, 3, front), 40)
  for (let y = 1; y >= STORM.top; y -= step) ctx.lineTo(edge(STORM.front, -1, y, g.t, 3, front), y)
  for (let y = STORM.top; y <= 1; y += step) ctx.lineTo(edge(STORM.back, 1, y, g.t, 7, back), y)
  ctx.lineTo(edge(STORM.back, 1, 1, g.t, 7, back), 40)
  ctx.closePath()
}

/** The storm from outside: the skirts, the body, and the light on the masses of its faces. */
export function drawWall(g: Paint): void {
  const v = g.view
  if (v.x1 < STORM.front - 50 || v.x0 > STORM.back + 50) return
  const ctx = g.ctx
  // The skirts of dust over the sand, ahead of the front face and behind the back one: low and dark.
  for (const [face, side] of [[STORM.front, -1], [STORM.back, 1]] as [number, 1 | -1][]) {
    ctx.beginPath()
    ctx.moveTo(face + side * 2, 0.5)
    ctx.quadraticCurveTo(face + side * 10, -1.8, face + side * 26, 0.5)
    ctx.closePath()
    fill(ctx, rgba(FOOT, 0.5))
  }
  body(g)
  fill(ctx, wallFill(g))
  // The light on the masses: a broad warmer band down each that the low sun reaches, inside the body.
  ctx.save()
  body(g)
  ctx.clip()
  for (const [face, side, seed] of [[STORM.front, -1, 5], [STORM.back, 1, 9]] as [number, 1 | -1, number][]) {
    for (const m of masses(g.t, seed)) {
      if (m.out < 0.3) continue
      const x = edge(face, side, m.y, g.t, seed === 5 ? 3 : 7, masses(g.t, seed)) - side * m.out * 0.9
      ellipse(ctx, x, m.y - m.tall * 0.25, m.out * 1.3 + 2, m.tall * 0.7)
      fill(ctx, rgba('#D3A87A', 0.13 * smooth(-m.y, 5, 30) * Math.min(1, m.out / 3)))
    }
  }
  ctx.restore()
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
  body(g)
  ctx.clip()
  ctx.fillStyle = vgrad(ctx, v.y0, v.y1, [[0, rgba(BODY_HI, k)], [1, rgba(BODY_LO, k)]])
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.w + 2, v.h + 2)
  // A few big shapes at three depths on the wind, the far ones slower and paler.
  const wind = 7
  for (const [d, n, tone, a, span] of [[26, 4, '#A07A57', 0.32, 110], [9, 4, '#5C402B', 0.3, 64], [2.5, 3, '#6E4D33', 0.34, 50]] as [number, number, string, number, number][]) {
    const L = layer(v, d)
    for (let i = 0; i < n; i++) {
      const r = 5 + 6 * hash(i, d)
      const speed = wind * (0.7 + 0.5 * hash(i, d + 1))
      // Each where the wind has it, wrapped round a span about the camera so there are always some, out of the frame.
      const x = v.cx + ((((hash(i, d + 2) * span - g.t * speed - v.cx) % span) + span) % span) - span / 2
      const y = -5 + (hash(i, d + 3) - 0.5) * 18 + 2 * drift(g.t * 0.1 + i, d)
      ellipse(ctx, L.x(x), L.y(y), r * L.s * 1.7, r * L.s)
      fill(ctx, rgba(tone, a * k))
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
  body(g)
  ctx.clip()
  ctx.fillStyle = rgba('#7A5534', 0.2 * k)
  ctx.fillRect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, g.view.h + 2)
  ctx.restore()
}
