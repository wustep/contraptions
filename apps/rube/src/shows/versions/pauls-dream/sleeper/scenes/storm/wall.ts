import { drift, hash, layer, mix, rgba, smooth, vgrad, type Paint, type View } from '../../paint'
import { hazeAt, type Air } from '../../world/desert'
import { STORM, T, backAt, frontAt } from './geo'

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
const SUN = '#E2BC8E'
const BODY_HI = '#8F6847'
const BODY_MID = '#6A4A31'
const BODY_LO = '#3A281B'
const CORE = '#1A110B'

/* ---------------------------------------------------------------- its shape */

/**
 * A face's edge at height `y`: the front leans out over its own foot as it rises (the head of the storm rides ahead of
 * its feet), the back trails away behind; each wavers slowly. `face` is where the face stands at its foot.
 */
function edge(face: number, side: 1 | -1, y: number, t: number, seed: number): number {
  const lean = side < 0 ? 16 * smooth(-y, 2, 90) : -18 * smooth(-y, 0, 90) + 3
  return face + side * lean + 1.6 * drift(y * 0.015 + t * 0.03, seed)
}

/** Where the wall meets the sand, seen from outside: just under the floor's line, so no seam shows between them. */
const SAND = 0.05

/** The body's colour by height (y, colour), from high up where the sun reaches it down to its dark foot. */
const BODY_STOPS: [number, string][] = [[-70, TOP], [-34.5, FACE], [-9.6, mix(FACE, FOOT, 0.6)], [1, FOOT]]

/** The body's colour at height `y`. */
function bodyAt(y: number): string {
  const st = BODY_STOPS
  if (y <= st[0][0]) return st[0][1]
  for (let i = 0; i + 1 < st.length; i++) if (y < st[i + 1][0]) return mix(st[i][1], st[i + 1][1], (y - st[i][0]) / (st[i + 1][0] - st[i][0]))
  return st[st.length - 1][1]
}

/**
 * The storm's body as a path on `ctx`: up the front face, across far over any frame (its top is never seen, however tall
 * the stage), down the back face, and across at `foot`.
 */
function body(ctx: CanvasRenderingContext2D, view: View, t: number, foot: number): void {
  const fx = frontAt(t)
  const bx = backAt(t)
  const top = Math.min(STORM.top, view.y0 - 30)
  const step = Math.max(1.5, -top / 120)
  ctx.beginPath()
  ctx.moveTo(edge(fx, -1, foot, t, 3), foot)
  for (let y = Math.min(1, foot); y >= top; y -= step) ctx.lineTo(edge(fx, -1, y, t, 3), y)
  ctx.lineTo(edge(fx, -1, top, t, 3), top - 1)
  ctx.lineTo(edge(bx, 1, top, t, 7), top - 1)
  for (let y = top; y <= Math.min(1, foot); y += step) ctx.lineTo(edge(bx, 1, y, t, 7), y)
  ctx.lineTo(edge(bx, 1, foot, t, 7), foot)
  ctx.closePath()
}

/**
 * The billows: great rounded lobes of dust rolling over the head of the storm and down its face, slowly, each born far
 * above any frame and gone into the skirt at its foot. Unequal, and bigger the higher they are; each bulges forward out
 * of the face by most of itself, so the face's line is theirs. Lit on their tops by the low sun, shadowed under.
 */
interface Lobe {
  x: number
  y: number
  r: number
}

function lobes(t: number, view: View, side: 1 | -1): Lobe[] {
  const fx = side < 0 ? frontAt(t) : backAt(t)
  const seed = side < 0 ? 91 : 191
  const top = Math.min(STORM.top, view.y0 - 30)
  const H = -top + 10
  // Close together, so they run into one another and the face is one heaving line, not a string of beads.
  const n = Math.max(20, Math.round(H / 4.5))
  const out: Lobe[] = []
  for (let i = 0; i < n; i++) {
    // Rolling down: from far above to the foot at a cell and a half a second.
    const s = ((i / n) * H + t * 1.5 * (0.9 + 0.2 * hash(i, seed))) % H
    const y = top + s
    const size = (0.65 + 0.7 * hash(i, seed + 1)) * (6 + 14 * smooth(-y, 0, 90))
    // Swelling out where it comes over the head, and sinking into the skirt at the foot.
    const r = size * smooth(s, 0, 12) * (1 - smooth(y, -9, -2))
    if (r < 0.2) continue
    // Sunk half into the face: each bulges out of it by a third to a half of itself.
    const x = edge(fx, side, y, t, side < 0 ? 3 : 7) - side * r * (0.5 + 0.17 * hash(i, seed + 2))
    out.push({ x, y, r })
  }
  return out
}

/* ---------------------------------------------------------------- crisp-soft painting */

/** A buffer for each canvas the show paints on (the stage, a saved video's frame), and its softened copy. */
const buffers = new WeakMap<HTMLCanvasElement, [HTMLCanvasElement, HTMLCanvasElement]>()

/**
 * Paint `fn` (in world cells, as on the frame) into a buffer about 480 pixels across, soften it a pixel, and lay it
 * over the whole frame scaled up: everything in it has a short soft edge, the way dust meets clear air, never a hard
 * line and never a wide blur.
 */
function soft(g: Paint, fn: (ctx: CanvasRenderingContext2D) => void): void {
  const main = g.ctx.canvas as HTMLCanvasElement
  let pair = buffers.get(main)
  if (!pair) {
    pair = [document.createElement('canvas'), document.createElement('canvas')]
    buffers.set(main, pair)
  }
  const [buf, blur] = pair
  const f = Math.max(1.5, main.width / 480)
  const w = Math.max(8, Math.round(main.width / f))
  const h = Math.max(8, Math.round(main.height / f))
  // A margin all round, painted too, so the softening has something past the frame's edge to take in and the edge of
  // the frame is not left faded.
  const pad = 4
  for (const c of pair) {
    if (c.width !== w + 2 * pad || c.height !== h + 2 * pad) {
      c.width = w + 2 * pad
      c.height = h + 2 * pad
    }
  }
  const sx = w / main.width
  const sy = h / main.height
  const b = buf.getContext('2d')!
  b.setTransform(1, 0, 0, 1, 0, 0)
  b.clearRect(0, 0, w + 2 * pad, h + 2 * pad)
  const m = g.ctx.getTransform()
  b.setTransform(m.a * sx, m.b * sy, m.c * sx, m.d * sy, m.e * sx + pad, m.f * sy + pad)
  fn(b)
  const bl = blur.getContext('2d')!
  bl.setTransform(1, 0, 0, 1, 0, 0)
  bl.clearRect(0, 0, w + 2 * pad, h + 2 * pad)
  bl.filter = 'blur(1px)'
  bl.drawImage(buf, 0, 0)
  bl.filter = 'none'
  const ctx = g.ctx
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(blur, pad, pad, w, h, 0, 0, main.width, main.height)
  ctx.restore()
}

/* ---------------------------------------------------------------- outside */

/** The wisps: long thin drifts torn off the billows on the upper face, streaming forward on the wind and thinning. */
function wisps(ctx: CanvasRenderingContext2D, t: number): void {
  const n = 7
  const life = 6
  for (let i = 0; i < n; i++) {
    const phase = (((t + hash(i, 61) * life) % life) + life) % life
    const born = t - phase
    const y0 = -16 - 50 * hash(i, 62) - 8 * hash(Math.floor(born / life), 63 + i)
    const x0 = edge(frontAt(born), -1, y0, born, 3)
    const u = phase / life
    const x = x0 - 2 - 2.4 * phase
    const y = y0 - 0.9 * phase
    const a = 0.4 * smooth(u, 0, 0.15) * (1 - smooth(u, 0.35, 1))
    const len = 3 + 4 * hash(i, 64) + 0.9 * phase
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(0.12)
    ctx.beginPath()
    ctx.ellipse(0, 0, len, 0.45 + 0.5 * hash(i, 65), 0, 0, Math.PI * 2)
    ctx.fillStyle = rgba(mix(FACE, TOP, 0.6), a)
    ctx.fill()
    ctx.restore()
  }
}

/**
 * The storm seen from outside: its body and its billows as one mass, darker to its foot; the low sun on the crowns of
 * the billows; its wisps; its skirts.
 *
 * The light is the shape's own: the whole mass is painted once in the light, and again in its body's colour a little
 * down and in from it, so what is left lit is a thin rim along every edge that faces up and out toward the sun, the
 * crown of every billow, and nothing inside it. So the billows are swellings of one body, never balls on it.
 */
export function drawWall(g: Paint): void {
  const v = g.view
  const t = g.t
  if (v.x1 < frontAt(t) - 80 || v.x0 > backAt(t) + 60) return
  const inView = (l: Lobe) => !(l.y - l.r > v.y1 + 2 || l.y + l.r < v.y0 - 2 || l.x - l.r > v.x1 + 2 || l.x + l.r < v.x0 - 2)
  const ls = [...lobes(t, v, -1), ...lobes(t, v, 1)].filter(inView)
  soft(g, (ctx) => {
    const span = BODY_STOPS[BODY_STOPS.length - 1][0] - BODY_STOPS[0][0]
    const at = (y: number) => (y - BODY_STOPS[0][0]) / span
    const mass = (style: CanvasGradient) => {
      ctx.fillStyle = style
      body(ctx, v, t, SAND)
      ctx.fill()
      for (const l of ls) {
        ctx.beginPath()
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // In the light: warm and pale high up where the sun reaches it, going to the body's own colour toward the foot.
    const lit = vgrad(ctx, BODY_STOPS[0][0], BODY_STOPS[BODY_STOPS.length - 1][0], [
      [0, mix(TOP, SUN, 0.7)],
      [at(-34.5), mix(FACE, SUN, 0.45)],
      [at(-12), bodyAt(-12)],
      [1, FOOT],
    ])
    // Nothing of it below the sand's line, where the copy laid down and in would show as a ledge.
    ctx.save()
    ctx.beginPath()
    ctx.rect(v.x0 - 60, v.y0 - 200, v.w + 120, SAND - (v.y0 - 200))
    ctx.clip()
    mass(lit)
    // The body, by height, a little down and in from each face (the light on the front is the low sun behind the
    // camera's west, on the back the morning's ahead in the east): warm high up, darkening down to its foot.
    const fill = vgrad(ctx, BODY_STOPS[0][0], BODY_STOPS[BODY_STOPS.length - 1][0], BODY_STOPS.map(([y, c]) => [at(y), c]))
    const mid = (frontAt(t) + backAt(t)) / 2
    for (const side of [-1, 1] as const) {
      ctx.save()
      ctx.beginPath()
      if (side < 0) ctx.rect(v.x0 - 60, v.y0 - 200, mid - (v.x0 - 60), v.h + 400)
      else ctx.rect(mid, v.y0 - 200, v.x1 + 60 - mid, v.h + 400)
      ctx.clip()
      ctx.translate(-side * 1.3, 1.0)
      mass(fill)
      ctx.restore()
    }
    ctx.restore()
    wisps(ctx, t)
    // Its skirts of dust over the sand, ahead of its foot and behind it: low and dark.
    for (const [face, side] of [[frontAt(t), -1], [backAt(t), 1]] as [number, 1 | -1][]) {
      ctx.beginPath()
      ctx.moveTo(face + side * 2, SAND)
      ctx.quadraticCurveTo(face + side * 10, -2.4, face + side * 30, SAND)
      ctx.closePath()
      ctx.fillStyle = rgba(FOOT, 0.5)
      ctx.fill()
      // Dust boiling up round its foot where the face meets the sand, so the face goes down into it, not to a corner.
      const fx = edge(face, side, SAND, t, side < 0 ? 3 : 7)
      ctx.save()
      ctx.translate(fx, SAND)
      ctx.scale(1, 0.38)
      const apron = ctx.createRadialGradient(0, 0, 0, 0, 0, 9)
      apron.addColorStop(0, rgba(FOOT, 0.85))
      apron.addColorStop(0.5, rgba(FOOT, 0.45))
      apron.addColorStop(1, rgba(FOOT, 0))
      ctx.beginPath()
      ctx.arc(0, 0, 9, Math.PI, 0)
      ctx.closePath()
      ctx.fillStyle = apron
      ctx.fill()
      ctx.restore()
    }
  })
}

/* ---------------------------------------------------------------- its far reaches */

/**
 * The same wall going on north and south to the horizon both ways: from the wide shot on, a band of it stands over the
 * far dunes from one edge of the frame to the other, paler with distance, its top soft and slowly heaving, so there is
 * no way round it. Two depths of it (`REACHES`), each drawn among the dune ranges at its own depth (`land.ts`), the
 * nearer lower and denser, the farther taller and fainter.
 */
export const REACHES = [
  { d: 330, tall: 150, seed: 81 },
  { d: 120, tall: 66, seed: 82 },
] as const

/** How much of the far reaches is seen at `t` from a camera at `x`: from the reveal, until it is inside or past the storm. */
const reachesAt = (t: number, x: number): number => (t >= T.wall ? 1 : 0) * (1 - smooth(x, frontAt(t) + 2, frontAt(t) + 8))

export function drawReach(g: Paint, air: Air, reach: (typeof REACHES)[number]): void {
  const v = g.view
  const f = reachesAt(g.t, v.cx)
  if (f <= 0.002) return
  const L = layer(v, reach.d)
  const haze = hazeAt(reach.d)
  const top = mix(TOP, air.haze, haze)
  const body = mix(FACE, air.haze, haze * 0.92)
  const step = Math.max(2, (8 * g.px) / L.s)
  const xa = v.cx + (v.x0 - v.cx) / L.s - step
  const xb = v.cx + (v.x1 - v.cx) / L.s + step
  const ctx = g.ctx
  ctx.beginPath()
  const foot = L.y(2)
  ctx.moveTo(L.x(xa), foot)
  let high = Infinity
  for (let x = xa; x <= xb + 1e-9; x += step) {
    const y = L.y(-reach.tall * (0.86 + 0.14 * drift(x / 90 + g.t * 0.02, reach.seed)))
    high = Math.min(high, y)
    ctx.lineTo(L.x(x), y)
  }
  ctx.lineTo(L.x(xb), foot)
  ctx.closePath()
  // Its top thins into the sky, so it has no edge there either.
  ctx.fillStyle = vgrad(ctx, high, foot, [[0, rgba(top, 0)], [0.16, rgba(top, 0.85 * f)], [0.45, rgba(body, f)], [1, rgba(body, f)]])
  ctx.fill()
}

/* ---------------------------------------------------------------- inside */

/** How deep in the storm the view's middle is: 0 outside, 1 well in. */
const deep = (x: number, t: number) => smooth(x, frontAt(t) + 1, frontAt(t) + 7) * (1 - smooth(x, backAt(t) - 6, backAt(t) - 1))

/** Inside: the body's browns and the great masses going by on the wind, behind the thopter, coming in as it goes in. */
export function drawInside(g: Paint): void {
  const v = g.view
  const k = deep(v.cx, g.t)
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
  const k = deep(g.view.cx, g.t)
  if (k <= 0.002) return
  g.ctx.fillStyle = rgba('#7A5534', 0.2 * k)
  g.ctx.fillRect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, g.view.h + 2)
}
