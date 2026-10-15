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
