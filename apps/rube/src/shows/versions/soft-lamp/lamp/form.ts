import { MOUTH, lampAt, lampColor, lightAt } from './world'

/**
 * Form: each thing on the desk turned in the lamp's light, as a lofi room is painted. A thing is drawn flat in its own
 * colours; this gives it a side away from the lamp, a cel shadow with a soft edge, and along the side toward the lamp a
 * warm lit edge. Both come from the thing's own outline, so whatever it is doing (the kitten curling, stretching,
 * climbing) it is shaded as it is.
 *
 * The thing is drawn on its own small layer. Its shadow is the outline less the same outline moved toward the lamp:
 * what is left is the far side, a crescent on anything round and a narrow edge on anything flat. Its lit edge is the
 * outline less the same outline moved away from the lamp. Both are laid on the thing alone (the shadow multiplied, the
 * light screened), at the strength of the lamp where the thing stands; away from the cone, the shadow side is still a
 * little there, the room being lit by the window too.
 */

type Ctx = CanvasRenderingContext2D

export interface Form {
  /** The box round all of it that is drawn (cells), with room to spare: the layer it is drawn on. */
  box: [number, number, number, number]
  /** Where it stands, for the light's direction and strength (cells): its middle, about. */
  at: { x: number; y: number }
  /** How far into it the shadow side reaches, cells. */
  core: number
  /** How far the lit edge reaches, cells (a fraction of `core` if not given). */
  edge?: number
  /** How much of it takes the shading (1 is all). */
  k?: number
  /**
   * Its solid: the outline with no holes (a mug's handle's), filled, for the shading to be worked from, so a hole does
   * not throw a shadow onto what is behind it. The drawing itself if not given.
   */
  solid?: (g: Ctx) => void
  /**
   * Shaded by one smooth fall of light across it, toward the lamp to away, in place of the cut crescent: for a thing
   * whose outline is too intricate for a crescent to read as shadow (the kitten's head on its body, its thin legs). Its
   * lit edge is left out too.
   */
  smooth?: boolean
}

/** About an outline's width, cells: how far in from the line the lit edge starts. */
const INSET = 0.035

/** The shadow side's colour, multiplied: the room's cool violet, so a shadow is a colour and not a grey. */
const CORE = '#6E62A8'

interface Layers {
  a: HTMLCanvasElement
  b: HTMLCanvasElement
  s: HTMLCanvasElement
  /** The solid, small: drawn back up large, its edge comes out soft (a blur, without a filter's cost). */
  m: HTMLCanvasElement
}
const pool = new Map<string, Layers>()

function layers(name: string, w: number, h: number): Layers {
  let l = pool.get(name)
  if (!l) {
    l = { a: document.createElement('canvas'), b: document.createElement('canvas'), s: document.createElement('canvas'), m: document.createElement('canvas') }
    pool.set(name, l)
  }
  for (const c of [l.a, l.b, l.s]) {
    if (c.width < w || c.height < h) {
      c.width = Math.max(c.width, w)
      c.height = Math.max(c.height, h)
    }
  }
  return l
}

/** The lamp's light where a thing stands: how strong its shading is, and from which way (a unit vector toward it). */
export function lampOn(x: number, y: number, t: number): { a: number; ux: number; uy: number } {
  const dx = MOUTH.x - x
  const dy = MOUTH.y - y
  const d = Math.hypot(dx, dy) || 1
  const here = Math.min(1, lightAt(x, y, 1) * 1.4 + 0.2)
  return { a: lampAt(t) * here, ux: dx / d, uy: dy / d }
}

/**
 * Draw a thing with form: `draw` draws it flat, in cells, on the context it is given. With no document (the checks), it
 * is drawn straight on.
 */
export function formed(ctx: Ctx, name: string, t: number, f: Form, draw: (g: Ctx) => void): void {
  if (typeof document === 'undefined') return draw(ctx)
  const m = ctx.getTransform()
  const [x0, y0, x1, y1] = f.box
  const p0 = m.transformPoint(new DOMPoint(x0, y0))
  const p1 = m.transformPoint(new DOMPoint(x1, y1))
  const k = Math.hypot(m.a, m.b)
  const pad = Math.ceil(f.core * k) + 2
  const bx = Math.floor(Math.min(p0.x, p1.x)) - pad
  const by = Math.floor(Math.min(p0.y, p1.y)) - pad
  const w = Math.ceil(Math.abs(p1.x - p0.x)) + pad * 2
  const h = Math.ceil(Math.abs(p1.y - p0.y)) + pad * 2
  // Off the canvas, or too small to shade: drawn flat.
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  if (w < 4 || h < 4 || bx > cw || by > ch || bx + w < 0 || by + h < 0) return draw(ctx)
  const { a: L } = layers(name, w, h)
  const g = L.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, w, h)
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  g.setTransform(new DOMMatrix([1, 0, 0, 1, -bx, -by]).multiply(m))
  g.lineJoin = ctx.lineJoin
  g.lineCap = ctx.lineCap
  draw(g)
  g.setTransform(1, 0, 0, 1, 0, 0)
  // What the shading is worked from: the drawing, or its solid.
  let cut = L
  if (f.solid) {
    cut = layers(name, w, h).s
    const q = cut.getContext('2d')!
    q.setTransform(1, 0, 0, 1, 0, 0)
    q.clearRect(0, 0, w, h)
    q.setTransform(new DOMMatrix([1, 0, 0, 1, -bx, -by]).multiply(m))
    q.fillStyle = '#000'
    f.solid(q)
    q.setTransform(1, 0, 0, 1, 0, 0)
  }

  const lamp = lampOn(f.at.x, f.at.y, t)
  const s = f.k ?? 1
  const shadowA = s * (0.26 + 0.3 * lamp.a)
  const litA = s * 0.62 * lamp.a
  const core = f.core * k
  const edge = (f.edge ?? f.core * 0.3) * k
  // The terminator's softness, px: the solid is taken down to about that size of pixel and drawn back up smooth.
  const soft = Math.max(1.5, f.core * k * 0.12)
  const q = Math.max(0.12, Math.min(0.6, 1 / soft))
  const mw = Math.max(2, Math.ceil(w * q))
  const mh = Math.max(2, Math.ceil(h * q))
  const lay = layers(name, w, h)
  const M = lay.m
  if (M.width < mw || M.height < mh) {
    M.width = Math.max(M.width, mw)
    M.height = Math.max(M.height, mh)
  }
  const mg = M.getContext('2d')!
  mg.setTransform(1, 0, 0, 1, 0, 0)
  mg.clearRect(0, 0, M.width, M.height)
  mg.imageSmoothingEnabled = true
  mg.drawImage(cut, 0, 0, w, h, 0, 0, mw, mh)
  const B = lay.b
  const b = B.getContext('2d')!
  b.imageSmoothingEnabled = true
  // The thing as it is.
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(L, 0, 0, w, h, bx, by, w, h)
  // Its side away from the lamp, and its edge toward it.
  // The shadow is worked at half size on a sharp screen (it is soft, and a pixel's spill past a dark outline is lost
  // in it); the lit edge, lighter than the outline, at full size, kept to it exactly.
  // `from` moves the thing itself before the cut: the lit edge starts an outline's width in, so it lies inside the
  // line, not over it.
  const side = (dx: number, dy: number, color: string, a: number, op: GlobalCompositeOperation, fx = 0, fy = 0) => {
    if (a <= 0.004) return
    const r = op === 'multiply' && k > 160 ? 0.5 : 1
    const bw = Math.ceil(w * r)
    const bh = Math.ceil(h * r)
    b.setTransform(1, 0, 0, 1, 0, 0)
    b.globalCompositeOperation = 'source-over'
    b.globalAlpha = 1
    b.clearRect(0, 0, bw, bh)
    b.drawImage(L, 0, 0, w, h, fx * r, fy * r, bw, bh)
    b.globalCompositeOperation = 'source-in'
    b.fillStyle = color
    b.fillRect(0, 0, bw, bh)
    b.globalCompositeOperation = 'destination-out'
    b.drawImage(M, 0, 0, mw, mh, dx * r, dy * r, bw, bh)
    // Kept to the thing's own outline: its alpha taken again and again, so what is solid stays and what is faint in
    // the drawing (a soft glow round it) falls away, and the shading does not show past the outline.
    b.globalCompositeOperation = 'destination-in'
    for (let i = 0; i < 3; i++) b.drawImage(L, 0, 0, w, h, 0, 0, bw, bh)
    ctx.globalCompositeOperation = op
    ctx.globalAlpha = a
    ctx.drawImage(B, 0, 0, bw, bh, bx, by, w, h)
  }
  if (f.smooth) {
    // Across the thing, from its far side to its side toward the lamp: the shadow's colour, going to nothing past the
    // middle. Kept to its outline as the crescent is.
    if (shadowA > 0.004) {
      const cx = w / 2
      const cy = h / 2
      const reach = (Math.abs(lamp.ux) * w + Math.abs(lamp.uy) * h) / 2
      b.setTransform(1, 0, 0, 1, 0, 0)
      b.globalCompositeOperation = 'source-over'
      b.globalAlpha = 1
      b.clearRect(0, 0, w, h)
      b.drawImage(L, 0, 0, w, h, 0, 0, w, h)
      b.globalCompositeOperation = 'source-in'
      const gr = b.createLinearGradient(cx - lamp.ux * reach, cy - lamp.uy * reach, cx + lamp.ux * reach, cy + lamp.uy * reach)
      gr.addColorStop(0, CORE)
      gr.addColorStop(0.55, CORE + '00')
      gr.addColorStop(1, CORE + '00')
      b.fillStyle = gr
      b.fillRect(0, 0, w, h)
      b.globalCompositeOperation = 'destination-in'
      for (let i = 0; i < 2; i++) b.drawImage(L, 0, 0, w, h, 0, 0, w, h)
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = shadowA
      ctx.drawImage(B, 0, 0, w, h, bx, by, w, h)
    }
    ctx.restore()
    return
  }
  side(lamp.ux * core, lamp.uy * core, CORE, shadowA, 'multiply')
  const ink = INSET * k
  side(-lamp.ux * (edge + ink), -lamp.uy * (edge + ink), lampColor(t), litA, 'screen', -lamp.ux * ink, -lamp.uy * ink)
  ctx.restore()
}

/** A wall's plaster: a soft, uneven tone over it, laid once as a tile (tiling, low and broad), so it is painted, not flat. */
let plasterTile: HTMLCanvasElement | null = null
const TILE = 192

function bakePlaster(): HTMLCanvasElement {
  const c = Object.assign(document.createElement('canvas'), { width: TILE, height: TILE })
  const g = c.getContext('2d')!
  const img = g.createImageData(TILE, TILE)
  // Value noise on a tiling lattice, three octaves: broad clouds of tone, a finer tooth over them.
  const lattice = (n: number, s: number) => {
    const v: number[] = []
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) v.push(hash01(i, j, s))
    return (x: number, y: number) => {
      const fx = (x * n) / TILE
      const fy = (y * n) / TILE
      const i0 = Math.floor(fx)
      const j0 = Math.floor(fy)
      const u = fx - i0
      const w = fy - j0
      const su = u * u * (3 - 2 * u)
      const sw = w * w * (3 - 2 * w)
      const at = (i: number, j: number) => v[((j % n) + n) % n * n + (((i % n) + n) % n)]
      const a = at(i0, j0) + (at(i0 + 1, j0) - at(i0, j0)) * su
      const b = at(i0, j0 + 1) + (at(i0 + 1, j0 + 1) - at(i0, j0 + 1)) * su
      return a + (b - a) * sw
    }
  }
  const o1 = lattice(4, 1)
  const o2 = lattice(9, 2)
  const o3 = lattice(24, 3)
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = 0.55 * o1(x, y) + 0.3 * o2(x, y) + 0.15 * o3(x, y)
      const k = (y * TILE + x) * 4
      // Darker and lighter about the middle: black where it darkens, white where it lightens, each by its alpha.
      const d = (n - 0.5) * 2
      const on = d > 0 ? 255 : 0
      img.data[k] = on
      img.data[k + 1] = on
      img.data[k + 2] = on
      img.data[k + 3] = Math.round(Math.min(1, Math.abs(d)) * 255)
    }
  }
  g.putImageData(img, 0, 0)
  return c
}

function hash01(i: number, j: number, s: number): number {
  const x = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453
  return x - Math.floor(x)
}

/** The plaster over the wall, in cells: `x0..x1`, `y0..y1`, `a` strong. A tile is `size` cells across. */
export function plaster(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, a: number, size = 3.2): void {
  if (typeof document === 'undefined' || a <= 0) return
  plasterTile ??= bakePlaster()
  const pat = ctx.createPattern(plasterTile, 'repeat')
  if (!pat) return
  pat.setTransform(new DOMMatrix().scale(size / TILE, size / TILE))
  ctx.save()
  ctx.globalAlpha = a
  ctx.globalCompositeOperation = 'soft-light'
  ctx.fillStyle = pat
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  ctx.restore()
}
