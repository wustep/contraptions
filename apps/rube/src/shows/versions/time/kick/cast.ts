import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { SLEEP, TOP } from './worlds'

/**
 * The canonical drawings of the show's recurring things (the director's): **the top**, his totem; **going under** (the
 * floor gone soft where the sleepers sink through it); **the tear** a kick makes where it throws him up through a
 * ceiling; and light (a soft glow, a pool, a beam). Every part that shows one of these calls it from here, so the top
 * is one top and going under is one gesture everywhere. If one needs something it does not do, say so in your report;
 * do not draw your own.
 *
 * Every function draws in pixels from cells (`k` pixels a cell; points are in the caller's cells, the caller having
 * translated to its own origin, or not) and leaves p5's and the canvas's state as it found it. None of them draws
 * text, dashed lines or hairline rings. None is inked but the top: light is light.
 */

const TAU = Math.PI * 2
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** '#RRGGBB' and an alpha as a canvas colour. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp01(a).toFixed(3)})`
}

/* ------------------------------------------------------------------ light */

/** A soft round light at `at` (cells), `r` cells to nothing, `a` at its middle: a glow, never a disc. */
export function bloom(p: p5, k: number, at: Pt, r: number, color: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x = at[0] * k
  const y = at[1] * k
  const R = r * k
  const g = ctx.createRadialGradient(x, y, 0, x, y, R)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.25, rgba(color, a * 0.55))
  g.addColorStop(0.6, rgba(color, a * 0.16))
  g.addColorStop(1, rgba(color, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R)
  ctx.restore()
}

/** A pool of light on a floor: an ellipse `rx` by `ry` cells about `at`, soft to its edge. */
export function pool(p: p5, k: number, at: Pt, rx: number, ry: number, color: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  ctx.scale(1, ry / rx)
  const R = rx * k
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.55, rgba(color, a * 0.5))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-R, -R, 2 * R, 2 * R)
  ctx.restore()
}

/**
 * A beam of light: a cone from `from` to `to`, `w0` cells wide at its source and `w1` at the far end, brightest at the
 * source and paling along its length, soft at its sides (eight cones laid over each other, each a little narrower).
 * Air, not a shape: never outlined. `a` 0..1. Headlights, a lamp through rain, the sun through a door.
 */
export function beam(p: p5, k: number, from: Pt, to: Pt, w0: number, w1: number, color: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const L = Math.hypot(dx, dy)
  if (L < 1e-6) return
  const nx = -dy / L
  const ny = dx / L
  ctx.save()
  const n = 8
  for (let i = 0; i < n; i++) {
    const spread = 1.5 - (i * 1.2) / (n - 1)
    const share = 1 / n
    const g = ctx.createLinearGradient(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
    g.addColorStop(0, rgba(color, a * share))
    g.addColorStop(0.7, rgba(color, a * share * 0.45))
    g.addColorStop(1, rgba(color, a * share * 0.08))
    const h0 = (w0 * spread) / 2
    const h1 = (w1 * spread) / 2
    ctx.beginPath()
    ctx.moveTo((from[0] + nx * h0) * k, (from[1] + ny * h0) * k)
    ctx.lineTo((to[0] + nx * h1) * k, (to[1] + ny * h1) * k)
    ctx.lineTo((to[0] - nx * h1) * k, (to[1] - ny * h1) * k)
    ctx.lineTo((from[0] - nx * h0) * k, (from[1] - ny * h0) * k)
    ctx.closePath()
    ctx.fillStyle = g
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the top */

/** The top's size: its height from tip to the stem's end, and its widest. Smaller than a ball, and never round. */
export const TOP_SIZE = { h: 0.3, w: 0.22 }

/**
 * A top's spin in a dream: it never slows. Its phase at `t` seconds since it was set spinning, radians (about 9 turns a
 * second, the eye sees the bands slide).
 */
export const dreamSpin = (u: number): number => (u < 0 ? 0 : u * 9 * TAU)

/**
 * A top's spin in waking life: set going at `u` = 0 at `w0` turns a second, slowing by friction (`decay` a second).
 * Returns its phase (radians) and how fast it is turning (turns a second), from which its wobble follows (`topWobble`).
 */
export function wakingSpin(u: number, w0 = 11, decay = 0.028): { phase: number; rate: number } {
  if (u <= 0) return { phase: 0, rate: 0 }
  const rate = w0 * Math.exp(-decay * u)
  const phase = ((w0 * (1 - Math.exp(-decay * u))) / decay) * TAU
  return { phase, rate }
}

/**
 * How far a top turning `rate` turns a second leans, radians: upright while it is quick, beginning to lean under about
 * 7 turns a second, and leaning ever more as it slows (the wobble the film ends on; a top at rest lies on its side).
 * The precession goes round `prec` times a second as it leans.
 */
export function topWobble(rate: number): { lean: number; prec: number } {
  if (rate >= 7) return { lean: 0.03, prec: 1.2 }
  const f = clamp01((7 - rate) / 6)
  return { lean: 0.03 + f * f * 0.42, prec: 1.2 + f * 1.8 }
}

/**
 * **The top.** His totem, drawn side-on at `at` (cells: the point of its tip, touching the table), `phase` its spin
 * (radians: the pewter's shine slides across it as it turns), `lean` how far its axis leans from upright (radians) and
 * `prec` its precession's phase (radians: the lean goes round, so on the screen it sways from one side to the other).
 * `s` scales it (1 is `TOP_SIZE`). `blur` 0..1 smears its bands when it turns fast. `ink` for its one outline. Its
 * shadow on the table is soft. Never round, never a ball: a squat spindle with a stem.
 */
export function top(p: p5, k: number, at: Pt, phase: number, lean: number, prec: number, ink: string, s = 1, blur = 0.6): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const H = TOP_SIZE.h * s * k
  const W = TOP_SIZE.w * s * k
  const x = at[0] * k
  const y = at[1] * k
  // The lean as seen from the side: the axis's tilt times the cosine of where its precession has it.
  const sway = lean * Math.cos(prec)
  const depth = lean * Math.sin(prec)
  ctx.save()
  // The shadow under it, on the table: soft, wider when it leans.
  const sh = ctx.createRadialGradient(x, y, 0, x, y, W * (0.9 + Math.abs(sway) * 1.6))
  sh.addColorStop(0, rgba(TOP.shade, 0.42))
  sh.addColorStop(1, rgba(TOP.shade, 0))
  ctx.save()
  ctx.translate(x + sway * H * 0.5, y)
  ctx.scale(1, 0.22)
  ctx.fillStyle = sh
  ctx.beginPath()
  ctx.arc(0, 0, W * (0.9 + Math.abs(sway) * 1.6), 0, TAU)
  ctx.fill()
  ctx.restore()

  ctx.translate(x, y)
  ctx.rotate(sway)
  // The body, from the tip up: a point, a cone flaring to the shoulder, a rounded crown, a stem.
  const tip = 0
  const shoulder = -H * 0.52
  const crown = -H * 0.7
  const stemTop = -H
  const body = new Path2D()
  body.moveTo(0, tip)
  body.bezierCurveTo(W * 0.12, -H * 0.08, W * 0.42, -H * 0.3, W * 0.5, shoulder)
  body.bezierCurveTo(W * 0.52, -H * 0.6, W * 0.36, crown, W * 0.1, crown - H * 0.02)
  body.lineTo(W * 0.075, stemTop + H * 0.02)
  body.quadraticCurveTo(0, stemTop - H * 0.02, -W * 0.075, stemTop + H * 0.02)
  body.lineTo(-W * 0.1, crown - H * 0.02)
  body.bezierCurveTo(-W * 0.36, crown, -W * 0.52, -H * 0.6, -W * 0.5, shoulder)
  body.bezierCurveTo(-W * 0.42, -H * 0.3, -W * 0.12, -H * 0.08, 0, tip)
  body.closePath()
  // Pewter, lit from above left, darker as it leans away from us.
  const g = ctx.createLinearGradient(-W * 0.5, 0, W * 0.5, 0)
  g.addColorStop(0, TOP.shine)
  g.addColorStop(0.35, TOP.pewter)
  g.addColorStop(1, TOP.shade)
  ctx.fillStyle = g
  ctx.fill(body)
  // The shine, sliding round as it turns: two soft bands, smeared when it is quick.
  ctx.save()
  ctx.clip(body)
  for (let i = 0; i < 2; i++) {
    const ph = (((phase / TAU + i * 0.5) % 1) + 1) % 1
    // Across the body from left to right as it comes round the front; behind, it is not seen.
    const u = Math.cos(ph * TAU)
    const across = Math.sin(ph * TAU) * W * 0.5
    if (u < -0.1) continue
    const w = W * (0.07 + blur * 0.22)
    const bg = ctx.createLinearGradient(across - w, 0, across + w, 0)
    bg.addColorStop(0, rgba(TOP.shine, 0))
    bg.addColorStop(0.5, rgba(TOP.shine, (0.35 + 0.4 * u) * (1 - blur * 0.45)))
    bg.addColorStop(1, rgba(TOP.shine, 0))
    ctx.fillStyle = bg
    ctx.fillRect(across - w, stemTop, 2 * w, H)
  }
  // The crown's rim catches the light.
  ctx.fillStyle = rgba(TOP.shine, 0.35 + depth * 0.6)
  ctx.fillRect(-W * 0.45, shoulder - H * 0.03, W * 0.9, H * 0.05)
  ctx.restore()
  ctx.lineWidth = Math.max(0.8, 0.018 * k)
  ctx.strokeStyle = ink
  ctx.stroke(body)
  ctx.restore()
}

/* ------------------------------------------------------------------ going under, and the kick */

/**
 * **Going under.** The floor gone soft where a sleeper sinks through it: at `at` (cells: on the floor's surface, under
 * him), `u` seconds since he began to sink (negative: not yet; it opens over 0.5 s before he goes in, and closes over
 * the second after he is through, at `through`). A soft pool of the dark of sleep opens in the surface, flattened as a
 * disc on a floor is seen side-on, and two slow swells spread from it along the surface and fade: water, not rings.
 * `w` is how wide it opens (about three balls). Draw it over the floor and under the ball.
 */
export function sink(p: p5, k: number, at: Pt, u: number, through: number, w = 0.8): void {
  if (u < -0.5 || u > through + 1.4) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const open = u < 0 ? clamp01((u + 0.5) / 0.5) : u < through ? 1 : 1 - clamp01((u - through) / 1.1)
  const e = open * open * (3 - 2 * open)
  if (e <= 0.002) return
  const x = at[0] * k
  const y = at[1] * k
  const R = (w / 2) * k * (0.55 + 0.45 * e)
  ctx.save()
  // The swells: two soft bands of shade either side, moving out along the surface and fading.
  for (const [delay, reach] of [[0, 1.6], [0.45, 1.25]] as const) {
    const v = clamp01((u + 0.5 - delay) / 1.6)
    if (v <= 0 || v >= 1) continue
    const d = (0.35 + v * reach) * w * k
    const a = 0.16 * (1 - v) * e
    for (const side of [-1, 1]) {
      const cx = x + side * d
      const g = ctx.createRadialGradient(cx, y, 0, cx, y, w * 0.32 * k)
      g.addColorStop(0, rgba(SLEEP.mid, a))
      g.addColorStop(1, rgba(SLEEP.mid, 0))
      ctx.save()
      ctx.translate(cx, y)
      ctx.scale(1, 0.24)
      ctx.translate(-cx, -y)
      ctx.fillStyle = g
      ctx.fillRect(cx - w * 0.32 * k, y - w * 0.32 * k, w * 0.64 * k, w * 0.64 * k)
      ctx.restore()
    }
  }
  // The pool of dark: deep in its middle, soft to its edge.
  ctx.translate(x, y)
  ctx.scale(1, 0.26)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  g.addColorStop(0, rgba(SLEEP.deep, 0.92 * e))
  g.addColorStop(0.55, rgba(SLEEP.mid, 0.6 * e))
  g.addColorStop(1, rgba(SLEEP.mid, 0))
  ctx.fillStyle = g
  ctx.fillRect(-R, -R, 2 * R, 2 * R)
  ctx.restore()
}

/**
 * **The tear.** Where a kick throws him up through a floor, a ceiling or a surface: a flattened lens of pale light that
 * flares as he passes and heals over a second (`u` seconds since he passed; 0 before), `w` cells wide, in `color`
 * (the level's light). Soft: a gradient, never an outline.
 */
export function tear(p: p5, k: number, at: Pt, u: number, w = 0.9, color = '#FFF6E4'): void {
  if (u < 0 || u > 1.2) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const a = u < 0.06 ? u / 0.06 : Math.exp(-(u - 0.06) / 0.28) * (1 - clamp01((u - 0.9) / 0.3))
  if (a <= 0.003) return
  const x = at[0] * k
  const y = at[1] * k
  const R = (w / 2) * k * (0.6 + 0.8 * Math.min(1, u * 3))
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, 0.2)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  g.addColorStop(0, rgba(color, 0.9 * a))
  g.addColorStop(0.4, rgba(color, 0.45 * a))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-R, -R, 2 * R, 2 * R)
  ctx.restore()
  bloom(p, k, at, w * 0.7, color, 0.35 * a)
}

/**
 * **The throw.** Where a kick or a blow throws someone up out of a lit level (no dark to cross there, so nothing else
 * marks it): a ring flashed out where it struck, and the streak of the throw behind them, their colour thinning back
 * along the last few tenths of their path, gone in half a second. `at` is their path; `t0` the blow.
 */
export function streak(p: p5, k: number, at: (t: number) => Pt, t0: number, t: number, color: string, ring = '#FFFFFF'): void {
  const u = t - t0
  if (u < 0 || u > 0.7) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const fade = 1 - clamp01((u - 0.35) / 0.35)
  ctx.save()
  ctx.lineCap = 'round'
  for (let j = 0; j < 8; j++) {
    const s0 = Math.max(t0, t - j * 0.035)
    const s1 = Math.max(t0, t - (j + 1) * 0.035)
    if (s1 >= s0) break
    const [x0, y0] = at(s0)
    const [x1, y1] = at(s1)
    ctx.strokeStyle = rgba(color, 0.7 * fade * (1 - j / 8))
    ctx.lineWidth = Math.max(1, 0.22 * k * (1 - j / 10))
    ctx.beginPath()
    ctx.moveTo(x0 * k, y0 * k)
    ctx.lineTo(x1 * k, y1 * k)
    ctx.stroke()
  }
  // The ring where the blow landed.
  if (u < 0.3) {
    const [cx, cy] = at(t0)
    const r = (0.15 + 0.9 * Math.sqrt(u / 0.3)) * k
    ctx.strokeStyle = rgba(ring, 0.85 * (1 - u / 0.3))
    ctx.lineWidth = Math.max(1, 0.06 * k * (1 - u / 0.3) + 0.02 * k)
    ctx.beginPath()
    ctx.arc(cx * k, cy * k, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

