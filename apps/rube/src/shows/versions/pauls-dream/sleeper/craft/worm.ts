import { clamp01, drift, mix, rgba, type Paint, type Pt } from '../paint'

/**
 * A sandworm, drawn along a spine: a creature, not a duct. Its outline is a little irregular and weathered, set to the
 * body (so it travels with it); it is shaded round, as a cylinder lit by the sun (the side toward it pale, the side away
 * in its own shade, the middle toward us between); broad low ring bands go round it, curved as rings round a body are,
 * darkest on its shaded side and gone on its lit side. Its hide is the desert's own sand-greys and umbers.
 *
 * Its head, where it has one in sight, is a mouth of three petals. Shut, they meet in a blunt bud; opening, they peel
 * back like a flower's, and inside the rim is a dark throat with a fringe of pale baleen. The mouth is an ellipse, a
 * circle foreshortened by how far it faces us.
 *
 * Shared by every worm in the show: the first one at the harvester, and the one the Fremen ride.
 */

export interface WormLook {
  hide: string
  lit: string
  shade: string
  band: string
  throat: string
  baleen: string
  /** The petals' inner faces, seen as they peel back. */
  flesh: string
}

export const SANDWORM: WormLook = {
  hide: '#97806A',
  lit: '#CDB592',
  shade: '#5B4B3D',
  band: '#4F4033',
  throat: '#22170F',
  baleen: '#E6D8BE',
  flesh: '#6E5446',
}

export interface Worm {
  /** The spine, from its tail end (first, usually under the sand) to its head (last). */
  spine: Pt[]
  /** Its radius `back` cells behind the head along a spine `len` long. */
  radius(back: number, len: number): number
  /** Its head: how far open (0 a shut bud, 1 wide), how far it faces us (0 side on, 1 face on), the rim's radius wide open. */
  mouth?: { open: number; facing: number; size: number }
  /** Toward the sun, a unit vector on the screen (up is negative y). */
  sun: Pt
  /** Nothing of it below this (the sand), in its own cells. */
  ground?: number
  /** Where it is drawn (a far layer's projection); left out, where it is. */
  map?: (p: Pt) => Pt
  /** How far its body has slid along its spine (cells): its bands and its outline's wear go with the body. */
  phase?: number
  /** Every colour through this (a far worm's haze). */
  tint?: (c: string) => string
  look?: WormLook
}

interface Section {
  p: Pt
  d: Pt
  n: Pt
  r: number
  back: number
}

/** The spine walked from the head back, a section every `step` cells: where, which way, and how thick. */
function sections(w: Worm, step: number): { all: Section[]; len: number } {
  const pts = w.spine
  const lens = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const len = lens[lens.length - 1]
  const at = (s: number): Pt => {
    let i = 1
    while (i < lens.length - 1 && lens[i] < s) i++
    const f = (s - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
  }
  const phase = w.phase ?? 0
  const n = Math.max(2, Math.ceil(len / step))
  const all: Section[] = []
  for (let i = 0; i <= n; i++) {
    const s = (len * i) / n
    const p = at(s)
    const a = at(Math.max(0, s - 0.3))
    const b = at(Math.min(len, s + 0.3))
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const d: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
    const back = len - s
    // Weathered: the outline wanders a little, in long swells and shorter ones, set to the body.
    const wear = 1 + 0.035 * drift((back + phase) / 5.5, 3) + 0.016 * drift((back + phase) / 1.9, 5)
    all.push({ p, d, n: [-d[1], d[0]], r: Math.max(0, w.radius(back, len) * wear), back })
  }
  return { all, len }
}

/** Brightness across a lit cylinder, at `x` from -1 to 1 along the side normal, for light `lx` along it and `lz` toward us. */
const lambert = (x: number, lx: number, lz: number): number => clamp01(x * lx + Math.sqrt(Math.max(0, 1 - x * x)) * lz)

export function drawWorm(g: Paint, w: Worm): void {
  const ctx = g.ctx
  const look = w.look ?? SANDWORM
  const tint = w.tint ?? ((c: string) => c)
  const M = w.map ?? ((p: Pt) => p)
  const scale = (() => {
    if (!w.map) return 1
    const a = M([0, 0])
    const b = M([1, 0])
    return Math.hypot(b[0] - a[0], b[1] - a[1])
  })()
  const { all } = sections(w, Math.max(0.3, (4 * g.px) / Math.max(1e-3, scale)))
  if (all.length < 2) return
  const hide = tint(look.hide)
  const lit = tint(look.lit)
  const shade = tint(look.shade)
  const band = tint(look.band)
  ctx.save()
  if (w.ground !== undefined) {
    const gy = M([0, w.ground])[1]
    ctx.beginPath()
    ctx.rect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, gy - g.view.y0 + 1)
    ctx.clip()
  }
  const edge = (s: Section, x: number): Pt => M([s.p[0] + s.n[0] * s.r * x, s.p[1] + s.n[1] * s.r * x])
  const colorAt = (b: number) => (b < 0.5 ? mix(shade, hide, b / 0.5) : mix(hide, lit, (b - 0.5) / 0.5))
  const XS = [1, 0.7, 0.35, 0, -0.35, -0.7, -1]
  // The body: a quad between each section and the next, a little overlapping (no seams), filled with the light across it.
  for (let i = 0; i + 1 < all.length; i++) {
    const a = all[i]
    const b = all[i + 1]
    if (a.r <= 0.01 && b.r <= 0.01) continue
    const over = 0.18 / Math.max(1e-3, Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]))
    const bx: Section = { ...b, p: [b.p[0] + (b.p[0] - a.p[0]) * over, b.p[1] + (b.p[1] - a.p[1]) * over] }
    const q = [edge(a, 1), edge(bx, 1), edge(bx, -1), edge(a, -1)]
    ctx.beginPath()
    q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    const lx = a.n[0] * w.sun[0] + a.n[1] * w.sun[1]
    const gr = ctx.createLinearGradient(...edge(a, 1), ...edge(a, -1))
    for (const x of XS) gr.addColorStop((1 - x) / 2, colorAt(lambert(x, lx * 0.9, 0.4)))
    ctx.fillStyle = gr
    ctx.fill()
  }
  // The ring bands: broad, low, curved round it toward the head, darkest on its shaded side and gone on its lit side.
  const spacing = Math.max(1.2, all[Math.floor(all.length / 2)].r * 0.95)
  const phase = w.phase ?? 0
  const near = (back: number): Section => {
    let best = all[0]
    for (const s of all) if (Math.abs(s.back - back) < Math.abs(best.back - back)) best = s
    return best
  }
  const len = all[0].back
  const first = (((spacing * 0.6 - phase) % spacing) + spacing) % spacing
  for (let k = first; k < len; k += spacing) {
    const s0 = near(k)
    const s1 = near(k + spacing * 0.34)
    if (s0.r < 0.05 || s1.r < 0.05 || s1 === s0) continue
    const arc = (s: Section, x: number): Pt => {
      const bow = s.r * 0.22 * Math.sqrt(Math.max(0, 1 - x * x))
      return M([s.p[0] + s.n[0] * s.r * x + s.d[0] * bow, s.p[1] + s.n[1] * s.r * x + s.d[1] * bow])
    }
    ctx.beginPath()
    for (let j = 0; j <= 10; j++) {
      const x = 1 - (2 * j) / 10
      const [px, py] = arc(s0, x)
      if (j) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    for (let j = 10; j >= 0; j--) {
      const x = 1 - (2 * j) / 10
      const [px, py] = arc(s1, x)
      ctx.lineTo(px, py)
    }
    ctx.closePath()
    const lx = s0.n[0] * w.sun[0] + s0.n[1] * w.sun[1]
    const gr = ctx.createLinearGradient(...edge(s0, 1), ...edge(s0, -1))
    for (const x of [1, 0.3, -0.4, -1]) {
      const light = lambert(x, lx * 0.9, 0.4)
      gr.addColorStop((1 - x) / 2, rgba(band, 0.36 * (1 - light) * (1 - light)))
    }
    ctx.fillStyle = gr
    ctx.fill()
  }
  if (w.mouth) drawMouth(g, w, all[all.length - 1], look, tint, M, scale)
  ctx.restore()
}

/** Three petals, the throat and its baleen: a bud while shut, a flower peeling back as it opens. */
function drawMouth(g: Paint, w: Worm, h: Section, look: WormLook, tint: (c: string) => string, M: (p: Pt) => Pt, scale: number): void {
  const ctx = g.ctx
  const m = w.mouth!
  const open = clamp01(m.open)
  const e = open * open * (3 - 2 * open)
  const r0 = Math.max(0.1, h.r)
  const rm = r0 + (m.size - r0) * e
  const A = rm
  const B = rm * Math.max(0.12, Math.min(1, m.facing))
  const C = h.p
  const rimAt = (phi: number, k = 1): Pt => [C[0] + (h.n[0] * A * Math.cos(phi) + h.d[0] * B * Math.sin(phi)) * k, C[1] + (h.n[1] * A * Math.cos(phi) + h.d[1] * B * Math.sin(phi)) * k]
  const towardSun = (v: Pt) => v[0] * w.sun[0] + v[1] * w.sun[1]
  const petal = (phi0: number, alpha = 1) => {
    if (alpha <= 0.003) return
    const half = 1.05
    const R1 = rimAt(phi0 - half)
    const R2 = rimAt(phi0 + half)
    const rim = rimAt(phi0)
    const out: Pt = [(rim[0] - C[0]) / rm, (rim[1] - C[1]) / rm]
    // Shut, the tips meet in front of the head; open, each is peeled out past the rim and back along the body.
    const bud: Pt = [C[0] + h.d[0] * r0 * 1.05, C[1] + h.d[1] * r0 * 1.05]
    const peeled: Pt = [rim[0] + out[0] * rm * 0.32 - h.d[0] * rm * 0.95, rim[1] + out[1] * rm * 0.32 - h.d[1] * rm * 0.95]
    const tip: Pt = [bud[0] + (peeled[0] - bud[0]) * e, bud[1] + (peeled[1] - bud[1]) * e]
    const mid1: Pt = [(R1[0] + tip[0]) / 2 + out[0] * rm * 0.18, (R1[1] + tip[1]) / 2 + out[1] * rm * 0.18]
    const mid2: Pt = [(R2[0] + tip[0]) / 2 + out[0] * rm * 0.18, (R2[1] + tip[1]) / 2 + out[1] * rm * 0.18]
    const p = [R1, mid1, tip, mid2, R2].map(M)
    ctx.beginPath()
    ctx.moveTo(p[0][0], p[0][1])
    ctx.quadraticCurveTo(p[1][0], p[1][1], p[2][0], p[2][1])
    ctx.quadraticCurveTo(p[3][0], p[3][1], p[4][0], p[4][1])
    const c = M(C)
    ctx.quadraticCurveTo(c[0], c[1], p[0][0], p[0][1])
    ctx.closePath()
    const light = clamp01(0.5 + 0.5 * towardSun(out))
    const outer = mix(mix(look.shade, look.lit, light), look.hide, 0.35)
    const was = ctx.globalAlpha
    ctx.globalAlpha = was * alpha
    ctx.fillStyle = tint(mix(outer, look.flesh, 0.45 * e))
    ctx.fill()
    ctx.globalAlpha = was
  }
  // Two petals at its sides and a third that, shut, closes the bud between them and, opening, folds away behind the
  // head: side on, an open mouth shows its two sides, and nothing crosses the throat.
  petal(Math.PI / 2, 1 - smoothstep(e, 0.12, 0.42))
  if (e > 0.02) {
    // The throat, and the fine pale baleen inside the rim.
    const th: Pt[] = []
    for (let i = 0; i <= 40; i++) th.push(M(rimAt((i / 40) * Math.PI * 2, 0.9)))
    ctx.beginPath()
    th.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = tint(look.throat)
    ctx.fill()
    // An uneven fringe: blades of different lengths, not quite evenly set, as baleen is.
    ctx.lineWidth = Math.max(1.25 * g.px, 0.026 * rm * scale)
    for (let i = 0; i < 30; i++) {
      const phi = ((i + 0.6 * (fract(i * 0.618) - 0.5)) / 30) * Math.PI * 2
      const long = 0.1 + 0.16 * fract(i * 0.371 + 0.2)
      const a = M(rimAt(phi, 0.89))
      const b = M(rimAt(phi, 0.89 - long * e))
      ctx.strokeStyle = rgba(tint(look.baleen), (0.35 + 0.3 * fract(i * 0.53)) * e)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
    }
    // The rim's lip.
    const lip: Pt[] = []
    for (let i = 0; i <= 40; i++) lip.push(M(rimAt((i / 40) * Math.PI * 2, 0.95)))
    ctx.beginPath()
    lip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.strokeStyle = tint(mix(look.hide, look.lit, 0.3))
    ctx.lineWidth = Math.max(1.25 * g.px, 0.07 * rm * scale)
    ctx.stroke()
  }
  petal(0)
  petal(Math.PI)
}

const fract = (v: number): number => v - Math.floor(v)
const smoothstep = (v: number, a: number, b: number): number => {
  const u = clamp01((v - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/**
 * Sand pouring off it: long soft sheets falling from its flanks to the sand, `amt` of their strength, swaying slowly.
 * `at` are shares of the way from its tail end to its head where they leave it, and the side (1 the normal's, -1 the
 * other).
 */
export function drawPour(g: Paint, w: Worm, amt: number, t: number, at: [number, 1 | -1][], sand: string, ground: number): void {
  if (amt <= 0.003) return
  const ctx = g.ctx
  const M = w.map ?? ((p: Pt) => p)
  const { all } = sections(w, 0.5)
  for (const [u, side] of at) {
    const s = all[Math.max(0, Math.min(all.length - 1, Math.round(u * (all.length - 1))))]
    if (s.p[1] > ground - 0.5 || s.r < 0.05) continue
    const top: Pt = [s.p[0] + s.n[0] * s.r * side * 0.92, s.p[1] + s.n[1] * s.r * side * 0.92]
    const fall = ground - top[1]
    const sway = Math.sin(t * 0.8 + u * 9) * 0.04 * fall
    const out = side * (s.n[0] >= 0 ? 1 : -1)
    const wTop = 0.25 + 0.04 * fall
    const wFoot = 0.8 + 0.14 * fall
    const pts: Pt[] = [
      [top[0] - wTop * 0.5, top[1]],
      [top[0] + out * fall * 0.06 + sway - wFoot * 0.35, top[1] + fall * 0.5],
      [top[0] + out * fall * 0.1 + sway - wFoot * 0.5, ground + 0.3],
      [top[0] + out * fall * 0.1 + sway + wFoot * 0.5, ground + 0.3],
      [top[0] + out * fall * 0.06 + sway + wFoot * 0.35, top[1] + fall * 0.5],
      [top[0] + wTop * 0.5, top[1]],
    ].map((p) => M(p as Pt))
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1])
    ctx.lineTo(pts[3][0], pts[3][1])
    ctx.quadraticCurveTo(pts[4][0], pts[4][1], pts[5][0], pts[5][1])
    ctx.closePath()
    const gr = ctx.createLinearGradient(0, pts[0][1], 0, pts[2][1])
    gr.addColorStop(0, rgba(sand, 0))
    gr.addColorStop(0.3, rgba(sand, 0.38 * amt))
    gr.addColorStop(1, rgba(sand, 0.5 * amt))
    ctx.fillStyle = gr
    ctx.fill()
  }
}

/** A ring of sand slumping round its foot: a broad low mound, paler on top, `amt` of its height. */
export function drawSlump(g: Paint, foot: Pt, r: number, amt: number, sand: string, shade: string): void {
  if (amt <= 0.003) return
  const ctx = g.ctx
  const h = r * 0.4 * amt
  const wide = r * 2.4
  ctx.beginPath()
  ctx.moveTo(foot[0] - wide, foot[1] + 0.3)
  ctx.bezierCurveTo(foot[0] - wide * 0.55, foot[1] + 0.2, foot[0] - r * 1.05, foot[1] - h, foot[0] - r * 0.7, foot[1] - h)
  ctx.lineTo(foot[0] + r * 0.7, foot[1] - h)
  ctx.bezierCurveTo(foot[0] + r * 1.05, foot[1] - h, foot[0] + wide * 0.55, foot[1] + 0.2, foot[0] + wide, foot[1] + 0.3)
  ctx.closePath()
  const gr = ctx.createLinearGradient(0, foot[1] - h, 0, foot[1] + 0.3)
  gr.addColorStop(0, mix(sand, '#FFFFFF', 0.1))
  gr.addColorStop(1, mix(sand, shade, 0.35))
  ctx.fillStyle = gr
  ctx.fill()
}
