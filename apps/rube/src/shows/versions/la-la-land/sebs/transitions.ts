import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { frame, rgba, scenery, smooth } from './kit'
import { AT, snap } from './music'

/**
 * The covers the stage changes place under. The dream moves the way the
 * film's epilogue does, by the grammar of an old studio picture: the lights
 * go out, an iris closes, a curtain comes in. Each is drawn over everything,
 * the ball included, in both the place it leaves and the place it opens on,
 * so the change of place itself is never seen.
 *
 *   down: [a, b]  the cover comes in, full at b
 *   up:   [c, d]  it goes, gone at d; the stage changes place between b and c
 */
export type Cover =
  | { kind: 'black'; down: [number, number]; up: [number, number]; color?: string }
  /**
   * An iris: a ring of dark closing on a point, and opening on another. With `snap`, it closes only to `r0` and holds
   * that last small circle of light until `snap`, when it shuts on the hit.
   */
  | { kind: 'iris'; down: [number, number]; up: [number, number]; from: (t: number) => Pt; to: (t: number) => Pt; r0: number; r1: number; color?: string; snap?: number }
  /** Velvet, drawn in from both sides and parted again. */
  | { kind: 'curtain'; down: [number, number]; up: [number, number]; color: string; deep: string; gold: string }

export interface CoverState {
  covers: Cover[]
}

/** How long an iris takes to shut on its snap. */
const SNAP_TIME = 0.06

/**
 * The trumpet's iris closes to a small circle on the two of them and holds it through the silence before the second
 * knock; on the knock (the loudest onset in the cue) the last light shuts. That shutting is a strike.
 */
export const IRIS_SNAP = AT.knock2
/** The iris opens on painted Paris on the hit after it (the choir's entrance). */
export const IRIS_OPEN = snap(269.69, 0.05)?.t ?? 269.677
/** The red of the club's door lifts on the jazz's first kick. */
export const RED_LIFT = AT.jazz
export const COVER_HITS = [RED_LIFT, IRIS_SNAP, IRIS_OPEN]

/** How much a cover covers at `t`: 0 before, 1 from `down[1]` to `up[0]`, 0 after. An iris still holding its last circle is not whole. */
export function coverAt(c: Cover, t: number): number {
  if (t < c.down[0] || t > c.up[1]) return 0
  if (c.kind === 'iris' && c.snap !== undefined && t >= c.down[1] && t < c.snap + SNAP_TIME) return 0.99
  if (t < c.down[1]) return smooth(t, c.down[0], c.down[1])
  if (t <= c.up[0]) return 1
  return 1 - smooth(t, c.up[0], c.up[1])
}

/** The one cover in force at `t`, if any, and how far in. */
export function coverOf(covers: Cover[], t: number): { c: Cover; f: number } | null {
  for (const c of covers) {
    const f = coverAt(c, t)
    if (f > 0) return { c, f }
  }
  return null
}

function drawCover(p: p5, k: number, c: Cover, f: number, t: number): void {
  const fr = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const pad = 2
  const X0 = (fr.x0 - pad) * k
  const Y0 = (fr.y0 - pad) * k
  const W = (fr.x1 - fr.x0 + 2 * pad) * k
  const H = (fr.y1 - fr.y0 + 2 * pad) * k
  ctx.save()
  if (c.kind === 'black') {
    ctx.fillStyle = rgba(c.color ?? '#000000', f)
    ctx.fillRect(X0, Y0, W, H)
  } else if (c.kind === 'iris') {
    // Closing: the opening shrinks on `from`; opening: it grows on `to`. Outside it, the dark, with a soft lip.
    const closing = t <= c.up[0]
    const at = closing ? c.from(t) : c.to(t)
    // It closes to `r0` round `from` (0 is dark), and opens from `r1` round `to`: a spotlight is an iris that stops short.
    const span = Math.hypot(fr.x1 - fr.x0, fr.y1 - fr.y0)
    const least = closing ? c.r0 : c.r1
    let r = least + (1 - f) * Math.max(0, span - least)
    if (closing && c.snap !== undefined && t >= c.down[1]) r = c.r0 * (1 - smooth(t, c.snap, c.snap + SNAP_TIME))
    // A soft lip a fifth of a cell wide (a stage light's edge), or less on a small opening.
    const lip = Math.min(0.2, r * 0.3)
    const g = ctx.createRadialGradient(at[0] * k, at[1] * k, Math.max(0, r - lip) * k, at[0] * k, at[1] * k, (r + 0.02) * k)
    const dark = c.color ?? '#000000'
    g.addColorStop(0, rgba(dark, 0))
    g.addColorStop(1, rgba(dark, 1))
    ctx.fillStyle = g
    ctx.fillRect(X0, Y0, W, H)
  } else {
    // Two halves of velvet, each its own set of folds, meeting in the middle when f is 1.
    const half = (fr.x1 - fr.x0) / 2 + pad
    const reach = half * f
    const folds = 7
    for (const side of [-1, 1]) {
      const edge = side < 0 ? fr.x0 - pad + reach : fr.x1 + pad - reach
      const outer = side < 0 ? fr.x0 - pad : fr.x1 + pad
      const x0 = Math.min(edge, outer)
      const w = Math.abs(edge - outer)
      ctx.fillStyle = c.color
      ctx.fillRect(x0 * k, Y0, w * k, H)
      // Folds: soft darker bands that bunch toward the outer edge as the velvet gathers.
      for (let i = 0; i < folds; i++) {
        const u = (i + 0.5) / folds
        const x = outer + (edge - outer) * Math.pow(u, 1.3)
        const band = (w / folds) * 0.42
        const grad = ctx.createLinearGradient((x - band) * k, 0, (x + band) * k, 0)
        grad.addColorStop(0, rgba(c.deep, 0))
        grad.addColorStop(0.5, rgba(c.deep, 0.55))
        grad.addColorStop(1, rgba(c.deep, 0))
        ctx.fillStyle = grad
        ctx.fillRect((x - band) * k, Y0, 2 * band * k, H)
      }
      // The leading edge: a gold fringe.
      ctx.fillStyle = rgba(c.gold, 0.9)
      ctx.fillRect((edge - (side < 0 ? 0.05 : 0)) * k, Y0, 0.05 * k, H)
    }
    // The pelmet across the top, heavy and still.
    ctx.fillStyle = c.deep
    ctx.fillRect(X0, Y0, W, (pad + (fr.y1 - fr.y0) * 0.09) * k)
    ctx.fillStyle = rgba(c.gold, 0.85)
    ctx.fillRect(X0, Y0 + (pad + (fr.y1 - fr.y0) * 0.09) * k, W, 0.04 * k)
  }
  ctx.restore()
}

/** The covers, as one scenery laid over every place (it is told show time). */
export const covers = scenery<CoverState>({
  name: 'covers',
  draw: () => {},
  over(p, s, c) {
    const on = coverOf(s.covers, c.t)
    if (!on) return
    // The piece is placed at 0,0: undo nothing, draw in world cells.
    drawCover(p, c.k, on.c, on.f, c.t)
  },
})
