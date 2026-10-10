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
  /**
   * The lights going, or a light filling the frame. With `spark` (where, as fractions of the composed frame), one
   * point of light stays lit through it: the last star in the sky, which is the next place's lamp. With `flicker`,
   * it trembles with a projector's shutter: the bare light of an empty gate.
   */
  | { kind: 'black'; down: [number, number]; up: [number, number]; color?: string; spark?: { at: [number, number]; color: string }; flicker?: boolean }
  /**
   * A cloth, the way a stage changes its scene without the lights going: it flies in from the flies on its batten
   * (`fall`) or is already there, the light on it filling the frame; and it goes either by flying out again (`rise`),
   * or by the lamp behind it coming up, from the middle out, through it onto the next place.
   */
  | { kind: 'cloth'; down: [number, number]; up: [number, number]; color: string; deep: string; fall: boolean; rise: boolean }
  /**
   * An iris: a ring of dark closing on a point, and opening on another. With `snap`, it closes only to `r0` and holds
   * that last small circle of light until `snap`, when it shuts on the hit.
   */
  | { kind: 'iris'; down: [number, number]; up: [number, number]; from: (t: number) => Pt; to: (t: number) => Pt; r0: number; r1: number; color?: string; snap?: number }
  /**
   * A door passing the lens: a red leaf, panelled, its brass knob at its leading edge, sweeps across the frame from
   * the left until it fills it, and sweeps on off the right to show the next place. Through his club's door in Paris.
   */
  | { kind: 'door'; down: [number, number]; up: [number, number]; color: string; deep: string; brass: string }
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

type Fr = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/** A cloth on its batten: coming in from the flies, filling the frame, and flying out or lit through from behind. */
function drawCloth(ctx: CanvasRenderingContext2D, k: number, fr: Fr, pad: number, c: Extract<Cover, { kind: 'cloth' }>, f: number, t: number): void {
  const x0 = fr.x0 - pad
  const x1 = fr.x1 + pad
  const h = fr.y1 - fr.y0
  const coming = t <= c.up[0]
  // Where its hem is: falling in, it comes down past the frame's foot with a little settle on its lines; flying out,
  // it goes up and away. Otherwise it hangs below the frame's foot.
  let hem = fr.y1 + pad
  if (coming && c.fall) {
    const u = (t - c.down[0]) / (c.down[1] - c.down[0])
    const e = u >= 1 ? 1 : 1 - (1 - Math.max(0, u)) ** 2.2
    const settle = u >= 1 ? 0 : 0.035 * h * Math.sin(Math.max(0, u - 0.7) / 0.3 * Math.PI) * (u > 0.7 ? 1 : 0)
    hem = fr.y0 - 0.1 * h + (fr.y1 + 0.06 * h - (fr.y0 - 0.1 * h)) * e - settle
  } else if (!coming && c.rise) {
    const u = Math.min(1, Math.max(0, (t - c.up[0]) / (c.up[1] - c.up[0])))
    hem = fr.y1 + 0.06 * h - (fr.y1 + 0.06 * h - (fr.y0 - 0.12 * h)) * u * u * (3 - 2 * u)
  }
  // How much of it there is: fading in, if it doesn't fall; lit through, if it doesn't rise.
  const a = coming ? (c.fall ? 1 : f) : c.rise ? 1 : 1
  const top = fr.y0 - pad
  if (hem <= top) return
  ctx.save()
  // Lit through from behind as it goes: clear from the middle out, where the lamp is.
  if (!coming && !c.rise) {
    const r = Math.hypot(x1 - x0, h) / 2
    const g = ctx.createRadialGradient(fr.cx * k, fr.cy * k, 0, fr.cx * k, fr.cy * k, r * k)
    g.addColorStop(0, rgba(c.color, Math.max(0, f * 1.6 - 0.6)))
    g.addColorStop(0.55, rgba(c.color, Math.min(1, f * 1.15)))
    g.addColorStop(1, rgba(c.color, Math.min(1, f * 1.4)))
    ctx.fillStyle = g
  } else ctx.fillStyle = rgba(c.color, a)
  ctx.fillRect(x0 * k, top * k, (x1 - x0) * k, (hem - top) * k)
  // Its folds: soft long bands down its height, a shade deeper, easing as it hangs still.
  const fa = (coming ? (c.fall ? 1 : f) : c.rise ? 1 : f) * 0.5
  const folds = 9
  for (let i = 0; i < folds; i++) {
    const x = x0 + ((i + 0.5) / folds) * (x1 - x0) + 0.15 * Math.sin(t * 1.7 + i * 2.1)
    const band = ((x1 - x0) / folds) * 0.38
    const g = ctx.createLinearGradient((x - band) * k, 0, (x + band) * k, 0)
    g.addColorStop(0, rgba(c.deep, 0))
    g.addColorStop(0.5, rgba(c.deep, 0.32 * fa))
    g.addColorStop(1, rgba(c.deep, 0))
    ctx.fillStyle = g
    ctx.fillRect((x - band) * k, top * k, 2 * band * k, (hem - top) * k)
  }
  // The batten along its hem, and the shadow it throws on what is below.
  if (hem < fr.y1 + pad) {
    const sh = ctx.createLinearGradient(0, hem * k, 0, (hem + 0.05 * h) * k)
    sh.addColorStop(0, rgba('#000000', 0.4))
    sh.addColorStop(1, rgba('#000000', 0))
    ctx.fillStyle = sh
    ctx.fillRect(x0 * k, hem * k, (x1 - x0) * k, 0.05 * h * k)
    ctx.fillStyle = rgba(c.deep, 0.95)
    ctx.fillRect(x0 * k, (hem - 0.012 * h) * k, (x1 - x0) * k, 0.012 * h * k)
  }
  ctx.restore()
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
    const shutter = c.flicker ? 0.93 + 0.07 * Math.sin(t * 2 * Math.PI * 18) * Math.sin(t * 2 * Math.PI * 2.3 + 1) : 1
    ctx.fillStyle = rgba(c.color ?? '#000000', f * shutter)
    ctx.fillRect(X0, Y0, W, H)
    if (c.spark && f > 0.02) {
      // The composed frame is 16 to 9, whole on the canvas, about its centre.
      const fw = Math.min(fr.x1 - fr.x0, ((fr.y1 - fr.y0) * 16) / 9)
      const fh = (fw * 9) / 16
      const x = fr.cx + (c.spark.at[0] - 0.5) * fw
      const y = fr.cy + (c.spark.at[1] - 0.5) * fh
      // It is there as the dark comes (a star the dark leaves), breathes while it holds, and is the lamp as it lifts.
      const a = smooth(f, 0.25, 0.85) * (0.85 + 0.15 * Math.sin(t * 5.3))
      const r = fh * 0.05
      const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
      g.addColorStop(0, rgba('#FFFFFF', 0.95 * a))
      g.addColorStop(0.12, rgba(c.spark.color, 0.8 * a))
      g.addColorStop(0.4, rgba(c.spark.color, 0.2 * a))
      g.addColorStop(1, rgba(c.spark.color, 0))
      ctx.fillStyle = g
      ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
      // A star's four-point glint.
      ctx.strokeStyle = rgba('#FFFFFF', 0.55 * a)
      ctx.lineWidth = Math.max(1, fh * 0.002 * k)
      ctx.beginPath()
      ctx.moveTo((x - r * 0.7) * k, y * k)
      ctx.lineTo((x + r * 0.7) * k, y * k)
      ctx.moveTo(x * k, (y - r * 0.7) * k)
      ctx.lineTo(x * k, (y + r * 0.7) * k)
      ctx.stroke()
    }
  } else if (c.kind === 'cloth') {
    drawCloth(ctx, k, fr, pad, c, f, t)
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
    const dark = c.color ?? '#000000'
    if (r * k < 0.5) {
      // Shut: all dark. (A gradient's hair of an edge would leave a speck of the world showing through.)
      ctx.fillStyle = dark
      ctx.fillRect(X0, Y0, W, H)
    } else {
      const g = ctx.createRadialGradient(at[0] * k, at[1] * k, Math.max(0, r - lip) * k, at[0] * k, at[1] * k, (r + 0.02) * k)
      g.addColorStop(0, rgba(dark, 0))
      g.addColorStop(1, rgba(dark, 1))
      ctx.fillStyle = g
      ctx.fillRect(X0, Y0, W, H)
    }
  } else if (c.kind === 'door') {
    // One leaf, as wide as the frame, carried across it left to right: in until it fills it, then on and off.
    const x0 = fr.x0 - pad
    const w = fr.x1 - fr.x0 + 2 * pad
    const closing = t <= c.up[0]
    const L = closing ? x0 - w + f * w : x0 + (1 - f) * w
    const R = L + w
    const top = fr.y0
    const h = fr.y1 - fr.y0
    // The shadow it throws just ahead of itself on what it has not yet covered.
    const sh = ctx.createLinearGradient(R * k, 0, (R + 0.6) * k, 0)
    sh.addColorStop(0, rgba('#000000', 0.45))
    sh.addColorStop(1, rgba('#000000', 0))
    ctx.fillStyle = sh
    ctx.fillRect(R * k, Y0, 0.6 * k, H)
    ctx.fillStyle = c.color
    ctx.fillRect(L * k, Y0, w * k, H)
    // Its panels: two tall sunk frames, a shade deeper, with a light bevel on their upper-left edges.
    for (const [a, b] of [[0.1, 0.44], [0.54, 0.9]]) {
      const px0 = L + 0.2 * w
      const pw = 0.6 * w
      const py0 = top + a * h
      const ph = (b - a) * h
      ctx.fillStyle = rgba(c.deep, 0.55)
      ctx.fillRect(px0 * k, py0 * k, pw * k, ph * k)
      ctx.strokeStyle = rgba('#FFFFFF', 0.12)
      ctx.lineWidth = Math.max(1, 0.02 * h * k * 0.1)
      ctx.beginPath()
      ctx.moveTo(px0 * k, (py0 + ph) * k)
      ctx.lineTo(px0 * k, py0 * k)
      ctx.lineTo((px0 + pw) * k, py0 * k)
      ctx.stroke()
      ctx.strokeStyle = rgba(c.deep, 0.9)
      ctx.beginPath()
      ctx.moveTo((px0 + pw) * k, py0 * k)
      ctx.lineTo((px0 + pw) * k, (py0 + ph) * k)
      ctx.lineTo(px0 * k, (py0 + ph) * k)
      ctx.stroke()
    }
    // The leading edge, and the knob on it.
    ctx.fillStyle = rgba(c.deep, 0.8)
    ctx.fillRect((R - 0.012 * w) * k, Y0, 0.012 * w * k, H)
    const kx = R - 0.07 * w
    const ky = top + 0.5 * h
    ctx.fillStyle = c.brass
    ctx.beginPath()
    ctx.arc(kx * k, ky * k, 0.022 * h * k, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba('#FFFFFF', 0.35)
    ctx.beginPath()
    ctx.arc((kx - 0.006 * h) * k, (ky - 0.007 * h) * k, 0.008 * h * k, 0, Math.PI * 2)
    ctx.fill()
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
