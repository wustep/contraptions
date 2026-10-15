import { hash } from '../kit'
import { mix, rgb, type Pen } from '../pen'
import { C } from './palette'

const DARK = C.dark
const HAZE = C.haze

/**
 * How Tokyo draws a house of a thousand and more and everything they hold up: gathered by colour over a pass and laid
 * in one fill each, never shape by shape. A colour is looked up, not built, so a frame makes no strings it has made
 * before; light comes in steps (`STEPS`), fine enough that a crowd in a hundred coats never shows them.
 */

/** How many steps of light a colour is drawn in, from the dark to itself. */
const STEPS = 18
/** How many veils of haze it may be seen through (0 none), each a tenth more of the haze. */
const HAZES = 5

const tables = new Map<string, string[][]>()
/**
 * `base` lit `f` of the way up from the arena's dark (0 to 1) and seen through `haze` veils of the lit haze (0 to
 * `HAZES` - 1), as a CSS colour, from a table made once.
 */
export function toned(pen: Pen, base: string, f: number, haze = 0): string {
  let rows = tables.get(base)
  if (!rows) {
    rows = []
    tables.set(base, rows)
  }
  const h = haze <= 0 ? 0 : haze >= HAZES - 1 ? HAZES - 1 : Math.round(haze)
  let row = rows[h]
  if (!row) {
    row = []
    for (let i = 0; i <= STEPS; i++) row.push(pen.tone(mix(mix(DARK, base, i / STEPS), HAZE, h * 0.1)))
    rows[h] = row
  }
  return row[f <= 0 ? 0 : f >= 1 ? STEPS : Math.round(f * STEPS)]
}

const rgbas = new Map<string, string[]>()
/** `base` at an alpha, 0 to 1, in twenty steps, from a table made once. */
export function rgbaOf(pen: Pen, base: string, a: number): string {
  let row = rgbas.get(base)
  if (!row) {
    const [r, g, b] = rgb(pen.tone(base))
    row = []
    for (let i = 0; i <= 20; i++) row.push(`rgba(${r},${g},${b},${i / 20})`)
    rgbas.set(base, row)
  }
  return row[a <= 0 ? 0 : a >= 1 ? 20 : Math.round(a * 20)]
}

/** Shapes gathered by fill colour, laid in one fill each (in the order their colours first came). */
export class Fills {
  private readonly paths = new Map<string, Path2D>()
  /** The path for `color`: add to it in pixels. */
  at(color: string): Path2D {
    let p = this.paths.get(color)
    if (!p) {
      p = new Path2D()
      this.paths.set(color, p)
    }
    return p
  }
  fill(ctx: CanvasRenderingContext2D): void {
    for (const [c, p] of this.paths) {
      ctx.fillStyle = c
      ctx.fill(p)
    }
    this.paths.clear()
  }
  stroke(ctx: CanvasRenderingContext2D, width: number): void {
    ctx.lineWidth = width
    for (const [c, p] of this.paths) {
      ctx.strokeStyle = c
      ctx.stroke(p)
    }
    this.paths.clear()
  }
}

/**
 * A round light baked once per colour, so a light is one image draw: soft (a hot heart, a long soft fall: a bulb, a
 * lantern's glow) or a disc (even, with a soft edge: a light out of focus).
 */
type Sprite = HTMLCanvasElement | ImageBitmap
const sprites = new Map<string, Sprite | null>()
const PROFILES: Record<'soft' | 'disc', [number, number][]> = {
  soft: [[0, 1], [0.1, 0.62], [0.28, 0.24], [0.55, 0.07], [1, 0]],
  disc: [[0, 0.62], [0.6, 0.55], [0.8, 0.42], [0.92, 0.14], [1, 0]],
}
function spriteOf(pen: Pen, color: string, kind: 'soft' | 'disc'): Sprite | null {
  const tone = pen.tone(color)
  const key = kind + tone
  const have = sprites.get(key)
  if (have !== undefined) return have
  // Baked on an offscreen canvas and kept as a bitmap (drawn without a fresh snapshot each time), or on a plain one.
  const off = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(128, 128) : null
  const plain = !off && typeof document !== 'undefined' ? document.createElement('canvas') : null
  if (plain) {
    plain.width = 128
    plain.height = 128
  }
  const g = (off?.getContext('2d') ?? plain?.getContext('2d') ?? null) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  let out: Sprite | null = null
  if (g) {
    const [r, gg, b] = rgb(tone)
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    for (const [at, a] of PROFILES[kind]) grad.addColorStop(at, `rgba(${r},${gg},${b},${a})`)
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    out = off ? off.transferToImageBitmap() : plain
  }
  sprites.set(key, out)
  return out
}

/**
 * Round lights added onto what is under them, without a gradient made each frame: each a baked sprite laid with one
 * image draw (or, with no canvas to bake on, a couple of discs gathered into fills by how bright they are).
 */
export class Glows {
  private readonly rings: Fills[] = [new Fills(), new Fills()]
  private readonly soft: (Sprite | number)[] = []
  constructor(private readonly pen: Pen) {}
  /** A light at `x, y` (cells), radius `r`, `a` bright at its heart. `hard` gives it an edge (a disc out of focus). */
  add(x: number, y: number, r: number, color: string, a: number, hard = false): void {
    if (a <= 0.01 || r <= 0) return
    const { k } = this.pen
    const sprite = spriteOf(this.pen, color, hard ? 'disc' : 'soft')
    if (sprite) {
      this.soft.push(sprite, x * k, y * k, r * k, Math.min(1, a))
      return
    }
    const radii = hard ? HARD_R : SOFT_R
    const alphas = hard ? HARD_A : SOFT_A
    for (let i = 0; i < radii.length; i++) {
      const p = this.rings[i].at(rgbaOf(this.pen, color, a * alphas[i]))
      const rr = r * radii[i] * k
      p.moveTo(x * k + rr, y * k)
      p.arc(x * k, y * k, rr, 0, Math.PI * 2)
    }
  }
  /** Lay them, added (`lighter`). */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const r of this.rings) r.fill(ctx)
    const q = this.soft
    for (let i = 0; i < q.length; i += 5) {
      const r = q[i + 3] as number
      ctx.globalAlpha = q[i + 4] as number
      ctx.drawImage(q[i] as Sprite, (q[i + 1] as number) - r, (q[i + 2] as number) - r, 2 * r, 2 * r)
    }
    q.length = 0
    ctx.restore()
  }
}
/** Without a canvas to bake on, a soft light's discs (wide and faint to small and bright); a hard one's two. */
const SOFT_R = [1, 0.45]
const SOFT_A = [0.12, 0.45]
const HARD_R = [1, 0.86]
const HARD_A = [0.4, 0.6]

/** An ellipse into a path, in cells (a path's own `ellipse` with its move first, so shapes never join). */
export function oval(p: Path2D, k: number, x: number, y: number, rx: number, ry: number, rot = 0): void {
  p.moveTo((x + rx * Math.cos(rot)) * k, (y + rx * Math.sin(rot)) * k)
  p.ellipse(x * k, y * k, rx * k, ry * k, rot, 0, Math.PI * 2)
}

/** A circle into a path, in cells (cheaper to fill than an ellipse). */
export function disc(p: Path2D, k: number, x: number, y: number, r: number): void {
  p.moveTo((x + r) * k, y * k)
  p.arc(x * k, y * k, r * k, 0, Math.PI * 2)
}

/** The top half of a circle into a path, in cells: hair over a head, seen from the back. */
export function crown(p: Path2D, k: number, x: number, y: number, r: number): void {
  p.moveTo((x - r) * k, y * k)
  p.arc(x * k, y * k, r * k, Math.PI, Math.PI * 2)
  p.closePath()
}

/** A closed polygon into a path, in cells, from a flat list x0, y0, x1, y1, ... moved by `dx, dy`. */
export function poly(p: Path2D, k: number, dx: number, dy: number, xy: readonly number[]): void {
  p.moveTo((xy[0] + dx) * k, (xy[1] + dy) * k)
  for (let i = 2; i < xy.length; i += 2) p.lineTo((xy[i] + dx) * k, (xy[i + 1] + dy) * k)
  p.closePath()
}

/** A rectangle into a path, in cells. */
export function box(p: Path2D, k: number, x0: number, y0: number, x1: number, y1: number): void {
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/**
 * Events scattered in time: every `dt` seconds, up to `per` candidates, each happening when its hash is under the rate
 * then (events a second) times `dt` over `per`. Calls `fn` for every event that happened within `life` before `t`, with
 * its age and its own index, so a stream of flash bulbs is a pure function of the show's time.
 */
export function events(t: number, seed: number, dt: number, per: number, life: number, rate: (t: number) => number, fn: (age: number, id: number) => void): void {
  const b1 = Math.floor(t / dt)
  const b0 = Math.floor((t - life) / dt)
  for (let b = b0; b <= b1; b++) {
    const tb = b * dt
    const p = (rate(tb) * dt) / per
    if (p <= 0) continue
    for (let m = 0; m < per; m++) {
      if (hash(b, m, seed) >= p) continue
      const at = tb + hash(b, m, seed + 1) * dt
      const age = t - at
      if (age < 0 || age > life) continue
      fn(age, b * per + m)
    }
  }
}
