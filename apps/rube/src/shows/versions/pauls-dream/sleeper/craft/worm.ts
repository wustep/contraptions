import { clamp01, drift, mix, rgba, type Paint, type Pt } from '../paint'

/**
 * A sandworm, drawn along a spine: a creature, not a duct. Its outline is a little irregular and weathered, set to the
 * body (so it travels with it); it is shaded round, as a cylinder lit by the sun (the side toward it pale, the side away
 * in its own shade, the middle toward us between); broad low ring bands go round it, curved as rings round a body are,
 * darkest on its shaded side and gone on its lit side. Its hide is the desert's own sand-greys and umbers.
 *
 * Its head, where it has one in sight, is a mouth of three broad lips. Shut, they meet in a blunt bud; opening, they fold
 * back flush against its flanks, and what is seen is the dark throat inside the rim with a fringe of pale baleen. The mouth is an ellipse, a
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

/**
 * The spine walked from its tail end to the head, a section every `step` cells of the body itself (set to the body, so
 * the sections move with it and nothing drawn from them swims along it as it goes), and one at each end: where, which
 * way, and how thick.
 */
function sections(w: Worm, step: number): { all: Section[]; len: number; at(back: number): Section } {
  const pts = w.spine
  const lens = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const len = lens[lens.length - 1]
  const along = (s: number): Pt => {
    let i = 1
    while (i < lens.length - 1 && lens[i] < s) i++
    const f = (s - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
  }
  const phase = w.phase ?? 0
  const section = (back: number): Section => {
    const s = len - back
    const p = along(s)
    const a = along(Math.max(0, s - 0.3))
    const b = along(Math.min(len, s + 0.3))
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const d: Pt = [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
    // Weathered: the outline wanders a little, in long swells and shorter ones, set to the body.
    const wear = 1 + 0.035 * drift((back + phase) / 5.5, 3) + 0.014 * drift((back + phase) / 2.6, 5)
    return { p, d, n: [-d[1], d[0]], r: Math.max(0, w.radius(back, len) * wear), back }
  }
  // Backs from the tail end (len) to the head (0): the ends, and every `step` of the body between.
  const backs: number[] = [len]
  const first = Math.floor((len + phase) / step)
  for (let j = first; j * step - phase > 0; j--) {
    const back = j * step - phase
    if (back < len - 1e-6) backs.push(back)
  }
  backs.push(0)
  return { all: backs.map(section), len, at: section }
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
  // A fixed step along the body (not the screen), so a zoom never moves where the sections fall.
  const { all, at } = sections(w, 0.6)
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
  const across = shading(hide, lit, shade, w.sun)
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
    ctx.fillStyle = across(ctx, edge(a, 1), edge(a, -1), a.n)
    ctx.fill()
  }
  // The ring bands: broad, low, curved round it toward the head, darkest on its shaded side and gone on its lit side.
  // Their spacing from its girth at one fixed place on the body (never from whichever section is in the middle, which
  // changes as sections come and go at its ends and would jolt every band).
  const spacing = Math.max(1.2, w.radius(Math.min(30, all[0].back), all[0].back) * 0.95)
  const phase = w.phase ?? 0
  const len = all[0].back
  const first = (((spacing * 0.6 - phase) % spacing) + spacing) % spacing
  for (let k = first; k < len; k += spacing) {
    const s0 = at(k)
    const s1 = at(Math.min(len, k + spacing * 0.34))
    if (s0.r < 0.05 || s1.r < 0.05 || s1.back - s0.back < 0.05) continue
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
  if (w.mouth) drawMouth(g, w, all[all.length - 1], look, tint, M, scale, across)
  ctx.restore()
}

/** Three petals, the throat and its baleen: a bud while shut, a flower peeling back as it opens. */
/**
 * A fill that lights a cylinder across its width: from its edge at `a` (on the side `n` points to) to its edge at `b`,
 * lit as the sun would light it, so every part of the body (and its shut head) is shaded the same way.
 */
type Across = (ctx: CanvasRenderingContext2D, a: Pt, b: Pt, n: Pt) => CanvasGradient
function shading(hide: string, lit: string, shade: string, sun: Pt): Across {
  const colorAt = (b: number) => (b < 0.5 ? mix(shade, hide, b / 0.5) : mix(hide, lit, (b - 0.5) / 0.5))
  return (ctx, a, b, n) => {
    const lx = n[0] * sun[0] + n[1] * sun[1]
    const gr = ctx.createLinearGradient(a[0], a[1], b[0], b[1])
    for (const x of [1, 0.7, 0.35, 0, -0.35, -0.7, -1]) gr.addColorStop((1 - x) / 2, colorAt(lambert(x, lx * 0.9, 0.4)))
    return gr
  }
}

function drawMouth(g: Paint, w: Worm, h: Section, look: WormLook, tint: (c: string) => string, M: (p: Pt) => Pt, scale: number, across: Across): void {
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
  /**
   * A lip: hinged on the rim at `phi0`, broad (its base a wide stretch of the rim), blunt-ended. Shut, its end meets the
   * others' in the bud in front of the head; open, it folds back flush against the body's flank, short.
   */
  const petal = (phi0: number, alpha = 1) => {
    if (alpha <= 0.003) return
    const half = 1.25
    const R1 = rimAt(phi0 + half)
    const R2 = rimAt(phi0 - half)
    const rim = rimAt(phi0)
    const out: Pt = [(rim[0] - C[0]) / rm, (rim[1] - C[1]) / rm]
    const bud: Pt = [C[0] + h.d[0] * r0 * 1.05, C[1] + h.d[1] * r0 * 1.05]
    // Open: its blunt end lies along the flank, a little way back from the rim.
    const back = rm * 0.5
    const flushA: Pt = [C[0] + out[0] * r0 * 1.05 - h.d[0] * back, C[1] + out[1] * r0 * 1.05 - h.d[1] * back]
    const flushB: Pt = [C[0] + out[0] * r0 * 0.8 - h.d[0] * back * 0.9, C[1] + out[1] * r0 * 0.8 - h.d[1] * back * 0.9]
    const budA: Pt = [bud[0] + out[0] * r0 * 0.08, bud[1] + out[1] * r0 * 0.08]
    const T1: Pt = [budA[0] + (flushA[0] - budA[0]) * e, budA[1] + (flushA[1] - budA[1]) * e]
    const T2: Pt = [bud[0] + (flushB[0] - bud[0]) * e, bud[1] + (flushB[1] - bud[1]) * e]
    // Its outer edge bows out a little past the rim, and comes round to the end.
    const bow: Pt = [rim[0] + out[0] * rm * 0.06 * e, rim[1] + out[1] * rm * 0.06 * e]
    const p = [R1, bow, T1, T2, R2].map(M)
    const c = M(C)
    ctx.beginPath()
    ctx.moveTo(p[0][0], p[0][1])
    ctx.quadraticCurveTo(p[1][0], p[1][1], p[2][0], p[2][1])
    // The blunt end.
    const m12: Pt = [(p[2][0] + p[3][0]) / 2 - (c[0] - p[2][0]) * 0.04, (p[2][1] + p[3][1]) / 2 - (c[1] - p[2][1]) * 0.04]
    ctx.quadraticCurveTo(m12[0], m12[1], p[3][0], p[3][1])
    ctx.quadraticCurveTo((p[3][0] + c[0]) / 2, (p[3][1] + c[1]) / 2, p[4][0], p[4][1])
    // Back to where it began along the rim itself, so it never crosses the throat.
    for (let k = 1; k <= 12; k++) {
      const q = M(rimAt(phi0 - half + (2 * half * k) / 12))
      ctx.lineTo(q[0], q[1])
    }
    ctx.closePath()
    const light = clamp01(0.5 + 0.5 * towardSun(out))
    const outer = mix(mix(look.shade, look.lit, light), look.hide, 0.4)
    const was = ctx.globalAlpha
    ctx.globalAlpha = was * alpha
    ctx.fillStyle = tint(mix(outer, look.flesh, 0.3 * e))
    ctx.fill()
    ctx.globalAlpha = was
  }
  // Two lips at its sides and a third that, shut, closes the bud between them and, opening, folds away behind the head:
  // side on, an open mouth shows its two sides, and nothing crosses the throat.
  const lips = smoothstep(e, 0.04, 0.3)
  petal(Math.PI / 2, lips * (1 - smoothstep(e, 0.12, 0.42)))
  // The throat comes in as the bud parts, never all at once.
  const seen = smoothstep(e, 0.02, 0.2)
  if (seen > 0.002) {
    const was = ctx.globalAlpha
    ctx.globalAlpha = was * seen
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
    ctx.globalAlpha = was
  }
  // Drawn over the throat, so the throat is only seen where the dome has drawn back from it, never through it.
  // Shut, its head is a smooth blunt dome, the three lips closed flush, a faint seam where each meets the next; opening,
  // the dome flattens into the rim and the lips come away from it.
  const shut = 1 - e
  if (shut > 0.01) {
    const L = r0 * 1.2 * shut
    const dome: Pt[] = []
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI
      dome.push(M([C[0] + h.n[0] * r0 * Math.cos(a) + h.d[0] * L * Math.sin(a), C[1] + h.n[1] * r0 * Math.cos(a) + h.d[1] * L * Math.sin(a)]))
    }
    // A little behind the head too, so it closes over the body's end with no seam.
    dome.push(M([C[0] - h.n[0] * r0 - h.d[0] * 0.3, C[1] - h.n[1] * r0 - h.d[1] * 0.3]), M([C[0] + h.n[0] * r0 - h.d[0] * 0.3, C[1] + h.n[1] * r0 - h.d[1] * 0.3]))
    ctx.beginPath()
    dome.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = across(ctx, M([C[0] + h.n[0] * r0, C[1] + h.n[1] * r0]), M([C[0] - h.n[0] * r0, C[1] - h.n[1] * r0]), h.n)
    ctx.fill()
    const tip = M([C[0] + h.d[0] * L, C[1] + h.d[1] * L])
    ctx.strokeStyle = rgba(tint(look.band), 0.38 * shut)
    ctx.lineWidth = Math.max(1.25 * g.px, 0.035 * r0 * scale)
    for (const k of [0.55, -0.55]) {
      const foot = M([C[0] + h.n[0] * r0 * k - h.d[0] * 0.2, C[1] + h.n[1] * r0 * k - h.d[1] * 0.2])
      const bend = M([C[0] + h.n[0] * r0 * k * 0.75 + h.d[0] * L * 0.7, C[1] + h.n[1] * r0 * k * 0.75 + h.d[1] * L * 0.7])
      ctx.beginPath()
      ctx.moveTo(foot[0], foot[1])
      ctx.quadraticCurveTo(bend[0], bend[1], tip[0], tip[1])
      ctx.stroke()
    }
  }
  petal(0, lips)
  petal(Math.PI, lips)
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
