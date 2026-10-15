import { mixHex } from '../../../../parts'
import { GATHER, ORGAN, PIANO, type Note } from './music'
import { clamp, hash, rgba, smooth, type Screen } from './screen'

/**
 * The field: the sky, the far farm on the horizon and the corn, by day over the Forest and by night round the
 * Arcade. The same farm and the same rows, so the portal reads as nightfall on one place rather than a cut to another.
 *
 * Everything is sized in the 16:9 frame's height (`Screen.f`), and moves past the camera at a share `q` of the
 * machine's pace: the far farm barely, the corn by your feet at about half. Zoom and the camera's own changes of
 * height in cells never slide it, since the pace is the frame's, not the cell's.
 */

/** Cells of the camera's travel that move a layer at q = 1 by one frame height. */
const REF = 8

/** Where the layer at pace `q` has got to under the frame's middle, in frame heights. */
const along = (s: Screen, q: number): number => (s.camX * q) / REF

export interface Light {
  /** The sky at the frame's top, its middle, and at the horizon. */
  top: string
  mid: string
  low: string
  /** The field under the horizon, before the rows are laid over it. */
  ground: string
  /** The farthest rows: a band on the horizon. */
  band: string
  /** The farm on the horizon. */
  farm: string
  /** The rows (`rows`). */
  rows: Omit<Rows, 'wind'>
  /** The horizon, as a share of the frame from its top. */
  horizon: number
}

/** The day's light at show time `t`: an afternoon through the piano, the sun going down as the organ gathers. */
export function dayAt(t: number): Light {
  const dusk = smooth(t, ORGAN - 4, 40.6)
  const late = smooth(t, 12, ORGAN)
  const tone = (a: string, b: string, c: string) => mixHex(mixHex(a, b, late), c, dusk)
  return {
    top: tone('#EDEFE4', '#ECE7DA', '#CBBFD0'),
    mid: tone('#F3F1E4', '#F2EEDD', '#E9C9B6'),
    low: tone('#F6EBCB', '#F5DFAF', '#F0A06A'),
    ground: tone('#E4E3C2', '#E2DBB4', '#D29D78'),
    band: tone('#D9DDBB', '#D7D3A9', '#B98A78'),
    farm: mixHex('#B9BCA6', '#6E5560', dusk),
    rows: {
      near: tone('#BFCB98', '#C3C48E', '#9C6E5A'),
      far: tone('#E2E3C3', '#E2DDB6', '#E0A27F'),
      line: tone('#3F6B33', '#4A6430', '#3A2830'),
      ink: 0.5 + 0.15 * dusk,
      sheen: tone('#F6F4DC', '#F7EECB', '#F7C59A'),
      lean: 0.03 + 0.14 * dusk,
      gust: 1 + 0.6 * dusk,
    },
    horizon: 0.69,
  }
}

/** The sun: its height over the horizon in frame heights, sinking all afternoon and setting under the organ. */
export const sunHeight = (t: number): number => 0.3 - 0.2 * smooth(t, 0, ORGAN) - 0.16 * smooth(t, ORGAN - 2, 41)

/**
 * The wind in the corn at show time `t`, `x` across the frame (0 its left edge, 1 its right): each piano note struck
 * harder than the run of them sends a gust through the rows from the left, as hard as it is over the run, and the
 * organ's do too as it gathers. 0 is still air, 1 a full gust.
 */
export function gustAt(t: number, x: number, notes: Note[] = PIANO): number {
  let out = 0
  const pass = (list: Note[], pace: number, floor: number, weight: number) => {
    for (const n of list) {
      if (n.t > t) break
      const u = t - n.t - x / pace
      if (u <= 0 || u > 1.2 || n.s <= floor) continue
      out += weight * (n.s - floor) * (u / 0.14) * Math.exp(1 - u / 0.14)
    }
  }
  pass(notes, 1.5, 0.5, 1.6)
  if (t > ORGAN - 0.1) pass(GATHER, 2.2, 0.35, 1.8)
  return Math.min(1, out)
}

/**
 * The sky, from the top of the canvas to the horizon, and the field under it. Laid in thin level bands, each a shade
 * of the gradient no more than a level from the next: the same picture as a gradient, at the cost of plain fills,
 * which a gradient over the whole canvas is not where the canvas is drawn without a GPU.
 */
export function sky(s: Screen, l: Light): number {
  const { ctx, w, h, cy, f } = s
  const hy = cy + (l.horizon - 0.5) * f
  const top = cy - 0.5 * f
  const at = (u: number) => (u < 0.55 ? mixHex(l.top, l.mid, u / 0.55) : mixHex(l.mid, l.low, (u - 0.55) / 0.45))
  ctx.fillStyle = l.top
  if (top > 0) ctx.fillRect(0, 0, w, top + 1)
  const n = Math.max(16, Math.min(400, Math.round((hy - top) / 5)))
  for (let i = 0; i < n; i++) {
    const y0 = top + ((hy - top) * i) / n
    const y1 = top + ((hy - top) * (i + 1)) / n
    ctx.fillStyle = at((i + 0.5) / n)
    ctx.fillRect(0, Math.floor(y0), w, Math.ceil(y1) - Math.floor(y0))
  }
  ctx.fillStyle = l.ground
  ctx.fillRect(0, hy, w, h - hy)
  return hy
}

/** Glows, drawn once each at the size they are wanted and laid on as an image: a radial gradient is slow to fill. */
const glows = new Map<string, HTMLCanvasElement>()
function glowOf(r: number, color: string, inner: number): HTMLCanvasElement {
  const size = Math.max(2, Math.ceil(r))
  const key = `${size}|${color}|${inner.toFixed(3)}`
  let c = glows.get(key)
  if (!c) {
    if (glows.size > 12) glows.clear()
    c = document.createElement('canvas')
    c.width = c.height = size * 2
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(size, size, size * inner, size, size, size)
    grad.addColorStop(0, rgba(color, 1))
    grad.addColorStop(0.35, rgba(color, 0.35))
    grad.addColorStop(1, rgba(color, 0))
    g.fillStyle = grad
    g.fillRect(0, 0, size * 2, size * 2)
    glows.set(key, c)
  }
  return c
}

/**
 * A low sun or the moon: a disc and its glow, at `x` of the frame across and `y` frame heights over the horizon,
 * hidden by the field once it is under it. `shade` cuts the moon's dark side out of it in the sky's colour.
 */
export function body(s: Screen, hy: number, x: number, y: number, r: number, color: string, glow: string, glowA: number, glowR: number, shade?: string): void {
  const { ctx, cx, f } = s
  const bx = cx + (x - 0.5) * f * (16 / 9)
  const by = hy - y * f
  const sprite = glowOf(glowR * f, glow, (r * 0.5) / glowR)
  ctx.save()
  ctx.globalAlpha = clamp(glowA)
  ctx.drawImage(sprite, bx - sprite.width / 2, by - sprite.height / 2)
  ctx.restore()
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, s.w, hy)
  ctx.clip()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(bx, by, r * f, 0, Math.PI * 2)
  ctx.fill()
  if (shade) {
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.arc(bx + r * f * 0.45, by - r * f * 0.2, r * f * 0.9, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The farm on the horizon, far off and barely moving: a house with a porch, a barn, two silos, a water tower, a
 * windpump, the power line along the road. `windows` lights the house's at night.
 */
export function farm(s: Screen, hy: number, color: string, windows?: string): void {
  const { ctx, cx, f, w } = s
  const q = 0.06
  const at = along(s, q)
  const X = (u: number) => cx + (u - at) * f
  const u0 = at - w / 2 / f - 0.2
  const u1 = at + w / 2 / f + 0.2
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, f * 0.0016)
  // The power line: poles every so often, a sagging wire between.
  const pole = 0.17
  ctx.beginPath()
  for (let i = Math.floor(u0 / pole); i <= Math.ceil(u1 / pole); i++) {
    const x = X(i * pole)
    const top = hy - f * 0.03
    ctx.moveTo(x, hy)
    ctx.lineTo(x, top)
    ctx.moveTo(x - f * 0.005, top + f * 0.003)
    ctx.lineTo(x + f * 0.005, top + f * 0.003)
    const nx = X((i + 1) * pole)
    ctx.moveTo(x, top + f * 0.003)
    ctx.quadraticCurveTo((x + nx) / 2, top + f * 0.009, nx, top + f * 0.003)
  }
  ctx.stroke()
  const sets = [
    { u: 0.42, kind: 'farm' },
    { u: -0.38, kind: 'tower' },
    { u: 0.98, kind: 'windpump' },
    { u: -1.15, kind: 'farm' },
    { u: 1.55, kind: 'tower' },
    { u: -1.75, kind: 'windpump' },
  ] as const
  for (const set of sets) {
    if (set.u < u0 - 0.2 || set.u > u1 + 0.2) continue
    const x = X(set.u)
    const e = f * 0.01
    ctx.beginPath()
    if (set.kind === 'farm') {
      // The house: two storeys, a gable, a porch on the right.
      ctx.rect(x - 2.2 * e, hy - 3.2 * e, 3.2 * e, 3.2 * e)
      ctx.moveTo(x - 2.6 * e, hy - 3.1 * e)
      ctx.lineTo(x - 0.6 * e, hy - 4.8 * e)
      ctx.lineTo(x + 1.4 * e, hy - 3.1 * e)
      ctx.rect(x + 1, hy - 1.6 * e, 1.6 * e, 1.6 * e)
      // The barn, gambrel roofed, and two silos behind it.
      const b = x + 5.5 * e
      ctx.moveTo(b - 2.6 * e, hy)
      ctx.lineTo(b - 2.6 * e, hy - 2.4 * e)
      ctx.lineTo(b - 1.9 * e, hy - 3.8 * e)
      ctx.lineTo(b, hy - 4.4 * e)
      ctx.lineTo(b + 1.9 * e, hy - 3.8 * e)
      ctx.lineTo(b + 2.6 * e, hy - 2.4 * e)
      ctx.lineTo(b + 2.6 * e, hy)
      ctx.closePath()
      for (const [sx, sh] of [[b + 3.6 * e, 6.2 * e], [b + 5 * e, 5.2 * e]] as const) {
        ctx.rect(sx - 0.6 * e, hy - sh, 1.2 * e, sh)
        ctx.moveTo(sx - 0.6 * e, hy - sh)
        ctx.arc(sx, hy - sh, 0.6 * e, Math.PI, 0)
      }
      // A windbreak of trees behind it.
      for (let i = 0; i < 6; i++) {
        const tx = x - 6 * e - i * 1.7 * e
        const tr = (1.1 + hash(i, 7) * 0.7) * e
        ctx.moveTo(tx + tr, hy - tr * 1.3)
        ctx.arc(tx, hy - tr * 1.3, tr, 0, Math.PI * 2)
        ctx.rect(tx - 0.15 * e, hy - tr * 0.6, 0.3 * e, tr * 0.6)
      }
      ctx.fill()
      if (windows) {
        ctx.fillStyle = windows
        ctx.fillRect(x - 1.7 * e, hy - 2.6 * e, 0.7 * e, 0.8 * e)
        ctx.fillRect(x - 0.3 * e, hy - 1.3 * e, 0.7 * e, 0.8 * e)
        ctx.fillStyle = color
      }
    } else if (set.kind === 'tower') {
      // A water tower: a tank on four legs.
      ctx.moveTo(x - 2 * e, hy - 6 * e)
      ctx.lineTo(x + 2 * e, hy - 6 * e)
      ctx.lineTo(x + 2 * e, hy - 8.4 * e)
      ctx.quadraticCurveTo(x, hy - 9.8 * e, x - 2 * e, hy - 8.4 * e)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x - 1.6 * e, hy - 6 * e)
      ctx.lineTo(x - 2.2 * e, hy)
      ctx.moveTo(x + 1.6 * e, hy - 6 * e)
      ctx.lineTo(x + 2.2 * e, hy)
      ctx.moveTo(x - 0.5 * e, hy - 6 * e)
      ctx.lineTo(x - 0.7 * e, hy)
      ctx.moveTo(x + 0.5 * e, hy - 6 * e)
      ctx.lineTo(x + 0.7 * e, hy)
      ctx.moveTo(x - 1.9 * e, hy - 3 * e)
      ctx.lineTo(x + 1.9 * e, hy - 3 * e)
      ctx.stroke()
    } else {
      // A windpump: a lattice tower and its wheel.
      ctx.moveTo(x - 1.4 * e, hy)
      ctx.lineTo(x - 0.25 * e, hy - 7 * e)
      ctx.moveTo(x + 1.4 * e, hy)
      ctx.lineTo(x + 0.25 * e, hy - 7 * e)
      ctx.moveTo(x - 1 * e, hy - 2.5 * e)
      ctx.lineTo(x + 1 * e, hy - 2.5 * e)
      ctx.moveTo(x - 0.6 * e, hy - 5 * e)
      ctx.lineTo(x + 0.6 * e, hy - 5 * e)
      ctx.moveTo(x + 1.6 * e, hy - 7.4 * e)
      ctx.arc(x, hy - 7.4 * e, 1.6 * e, 0, Math.PI * 2)
      ctx.moveTo(x, hy - 7.4 * e)
      ctx.lineTo(x + 3 * e, hy - 7.2 * e)
      ctx.lineTo(x + 3 * e, hy - 8 * e)
      ctx.stroke()
    }
  }
}

/** The far rows: one band along the horizon with a ragged top of tassels. */
export function band(s: Screen, hy: number, color: string): void {
  const { ctx, cx, f, w } = s
  const q = 0.14
  const at = along(s, q)
  const step = 0.006
  const i0 = Math.floor((at - w / 2 / f) / step) - 1
  const i1 = Math.ceil((at + w / 2 / f) / step) + 1
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx + (i0 * step - at) * f, hy + f * 0.01)
  for (let i = i0; i <= i1; i++) {
    const x = cx + (i * step - at) * f
    ctx.lineTo(x, hy - f * (0.012 + 0.008 * hash(i, 3) + 0.004 * Math.sin(i * 0.37)))
  }
  ctx.lineTo(cx + (i1 * step - at) * f, hy + f * 0.01)
  ctx.closePath()
  ctx.fill()
}

/** How the rows are painted: their canopy near and far, the line of their leaves and tassels, and the wind in them. */
export interface Rows {
  /** The nearest row's canopy, and the farthest's, which goes toward the haze on the horizon. */
  near: string
  far: string
  /** The leaves' and tassels' line, and how strongly the nearest row's is drawn. */
  line: string
  ink: number
  /** Leaves turned up by a gust show their pale side. */
  sheen?: string
  lean: number
  gust: number
  /** The gust at `x` across the frame (0 to 1), from the music. */
  wind?: (x: number) => number
}

/**
 * The corn from the horizon to the foot of the frame, seen from a little over it: rows of canopy, each a scalloped
 * band of leaves, smaller, paler and slower the farther off, and the near rows' tassels standing out of it. Drawn far
 * to near, so each row stands in front of the ones behind it. A gust bends the tassels and leaves as it crosses the
 * frame, and turns up the leaves' pale side.
 */
export function rows(s: Screen, t: number, hy: number, r: Rows): void {
  const { ctx, cx, w, h, f } = s
  const foot = s.cy + 0.56 * f
  const frameW = (f * 16) / 9
  const left = cx - frameW / 2
  // Rows by their distance, 1 for the one at the 16:9 frame's foot: each lies 1/d of the way from the horizon to it.
  // On a canvas taller than 16:9 (a phone held upright) the field goes on under the frame in nearer rows, larger, to
  // the canvas's edge; where the 16:9 picture is letterboxed, the stage's clip keeps them off the bars.
  let nearest = 1
  while (hy + (foot - hy) / nearest < h + 0.05 * f) nearest /= 1.3
  const depths: number[] = []
  for (let d = nearest; d < 13; d *= 1.3) depths.push(d)
  const ys = depths.map((d) => hy + (foot - hy) / d)
  for (let n = depths.length - 1; n >= 0; n--) {
    const d = depths[n]
    const y = ys[n]
    const sc = 1 / d
    const below = n > 0 ? ys[n - 1] + 0.02 * f / depths[n - 1] : h + 2
    // Far rows have fewer, wider mounds than true perspective would give them: at that size it is the same picture.
    const gap = 0.085 * sc ** 0.75
    const at = (s.camX * (0.62 * sc)) / REF + n * 0.37
    const i0 = Math.floor((at - w / 2 / f) / gap) - 2
    const i1 = Math.ceil((at + w / 2 / f) / gap) + 2
    const haze = smooth(d, 1, 10)
    const tips: number[] = []
    // The canopy: from stalk to stalk, a mound of leaves between.
    const canopy = new Path2D()
    let first = true
    for (let i = i0; i <= i1; i++) {
      const j1 = hash(i, 50 + n)
      const j2 = hash(i, 80 + n)
      const x = cx + (i * gap + (j1 - 0.5) * gap * 0.4 - at) * f
      const top = y - (0.006 + 0.008 * j2) * f * sc
      if (first) {
        canopy.moveTo(x, top)
        first = false
      } else {
        const px = tips[tips.length - 4]
        const py = tips[tips.length - 3]
        canopy.quadraticCurveTo((px + x) / 2, Math.min(py, top) - 0.02 * f * sc, x, top)
      }
      const across = clamp((x - left) / frameW, -0.2, 1.2)
      // The wind reaches the far rows a moment after the near: a front crossing the field, not a shiver.
      const sway = 0.05 * Math.sin(t * (1.2 + j1 * 0.6) + i * 0.8 + n) + 0.025 * Math.sin(t * 2.6 + i * 2.3)
      const gust = r.wind ? r.wind(across - 0.04 * (d - 1)) : 0
      tips.push(x, top, r.lean + sway + r.gust * 0.35 * gust, gust)
    }
    // The mounds along the crest as a curved shape, the row under them as a plain rectangle: the curves cover only
    // the thin strip they need.
    const base = Math.ceil(y)
    const band = new Path2D(canopy)
    band.lineTo(tips[tips.length - 4], base + 1)
    band.lineTo(tips[0], base + 1)
    band.closePath()
    ctx.fillStyle = mixHex(r.near, r.far, haze)
    ctx.fill(band)
    if (below > base) ctx.fillRect(0, base, w, Math.ceil(below) - base)
    // The row's crest, a shade darker, so the rows read one behind another; far off, the haze has them.
    if (d < 5) {
      ctx.strokeStyle = rgba(r.line, r.ink * 0.35 * (1 - haze * 0.8))
      ctx.lineWidth = Math.max(1, 0.0016 * f * Math.sqrt(sc))
      ctx.stroke(canopy)
    }
    // Where a gust is crossing, the crest catches the light: the leaves turned up, their pale side to the sky.
    if (r.sheen && r.wind && d < 5) {
      ctx.lineWidth = Math.max(1, 0.006 * f * sc)
      ctx.lineCap = 'butt'
      for (const level of [0.2, 0.45, 0.7]) {
        ctx.strokeStyle = rgba(r.sheen, (level + 0.15) * 0.75 * (1 - haze * 0.5))
        ctx.beginPath()
        for (let k = 4; k < tips.length; k += 4) {
          const g = (tips[k + 3] + tips[k - 1]) / 2
          if (g < level || g >= level + 0.25) continue
          const px = tips[k - 4]
          const py = tips[k - 3]
          const x = tips[k]
          const top = tips[k + 1]
          ctx.moveTo(px, py)
          ctx.quadraticCurveTo((px + x) / 2, Math.min(py, top) - 0.02 * f * sc, x, top)
        }
        ctx.stroke()
      }
    }
    // Leaves and tassels, on the rows near enough to see them.
    const ink = r.ink * (1 - smooth(d, 1.2, 2.3))
    if (ink < 0.03) continue
    ctx.strokeStyle = rgba(r.line, ink)
    ctx.lineWidth = Math.max(1, 0.0022 * f * Math.sqrt(sc))
    ctx.lineCap = 'butt'
    ctx.beginPath()
    for (let k = 0; k < tips.length; k += 4) {
      const x = tips[k]
      const top = tips[k + 1]
      const bend = tips[k + 2]
      const j = hash(k, 90 + n)
      const tall = (0.07 + 0.03 * j) * f * sc
      // The stalk up out of the canopy to the tassel.
      const tx = x + bend * tall
      const ty = top - tall * (1 - 0.1 * bend * bend)
      ctx.moveTo(x, top + 0.012 * f * sc)
      ctx.quadraticCurveTo(x + bend * tall * 0.1, top - tall * 0.5, tx, ty)
      for (let q = -1; q <= 1; q++) {
        const a = -Math.PI / 2 + q * 0.42 + bend * 0.8
        const l = tall * (0.3 + 0.06 * Math.abs(q))
        ctx.moveTo(tx, ty)
        ctx.lineTo(tx + Math.cos(a) * l, ty + Math.sin(a) * l + Math.abs(q) * l * 0.3)
      }
      // A leaf each way off the stalk, arching out and over, the tips carried by the wind.
      for (const side of [-1, 1]) {
        const ly = top - tall * (0.12 + 0.22 * (side > 0 ? j : 1 - j))
        const lx = x + bend * tall * 0.2
        const len = gap * f * (0.4 + 0.15 * j)
        ctx.moveTo(lx, ly)
        ctx.quadraticCurveTo(lx + side * len * 0.45 + bend * len * 0.3, ly - len * 0.4, lx + side * len + bend * len * 0.6, ly + len * (0.1 - 0.2 * bend * side))
      }
    }
    ctx.stroke()
  }
}

/**
 * Dust off the field as the organ gathers: specks blown left to right across the lower sky, thicker toward the drop.
 */
export function dust(s: Screen, t: number, hy: number, amount: number, color: string): void {
  if (amount <= 0.01) return
  const { ctx, cx, f } = s
  const frameW = (f * 16) / 9
  const left = cx - frameW / 2
  ctx.fillStyle = rgba(color, 0.55 * amount)
  ctx.beginPath()
  const n = Math.round(90 * amount)
  for (let i = 0; i < n; i++) {
    const speed = 0.25 + hash(i, 41) * 0.35
    const x = left + ((((hash(i, 42) + t * speed) % 1.2) + 1.2) % 1.2 - 0.1) * frameW
    const y = hy - f * (0.02 + 0.5 * hash(i, 43) ** 1.6) + Math.sin(t * 1.7 + i) * f * 0.006
    const r = f * (0.0012 + 0.0018 * hash(i, 44))
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }
  ctx.fill()
  // A haze low over the rows, in level bands as the sky is.
  const bands = 24
  const edge = (i: number) => Math.floor(hy - f * 0.25 + (f * 0.3 * i) / bands)
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = rgba(color, 0.32 * amount * ((i + 0.5) / bands))
    ctx.fillRect(0, edge(i), s.w, edge(i + 1) - edge(i))
  }
}
