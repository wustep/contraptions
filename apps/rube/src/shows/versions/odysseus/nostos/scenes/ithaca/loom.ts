import { clamp01, fill, rect, ring, rgba, smoother, stroke, type Paint } from '../../draw'
import { END } from '../../voyage'
import { LOOM, ROOM, SHUTTLE, TRIAL } from './geo'
import { CLOTH, MADDER, PETROL, TIMBER, TIMBER_LIGHT, indoors, nightness } from './look'

/**
 * Penelope's loom: an upright loom of the old kind, the warp hanging from a beam and kept taut by a row of clay weights
 * at its foot, the cloth woven from the top down. She is its clock. By day she weaves and the cloth grows down the
 * warp; by night she unpicks it and it goes back up (the trick that kept the suitors waiting), so across the years the
 * shroud is never done. Her shuttle crosses the warp on the theme's notes in the prologue, and steadily whenever else
 * she is at it. On the night of the trial she leaves it.
 */

/** Seconds from one pass to the next while she is at the loom and no note is setting the pace. */
const PACE = 1.9
/** How long a pass takes: the shuttle thrown across, coming to rest at the far side. */
const PASS = 0.55
const STEP = 0.1

/** Whether she is at her loom: from the start until she leaves it for the trial. */
export const atLoom = (t: number): boolean => t < TRIAL.penelope

/** The times the shuttle comes to rest, the prologue's on its notes and the rest steady. */
const PASSES: number[] = (() => {
  const out: number[] = []
  for (let t = 1; t < SHUTTLE[0] - PASS; t += PACE) out.push(t)
  out.push(...SHUTTLE)
  for (let t = SHUTTLE[SHUTTLE.length - 1] + PACE; t < TRIAL.penelope - 1; t += PACE) out.push(t)
  return out
})()

/** The shuttle across the warp at `t`, -1 at the left edge to 1 at the right; and which way it last went. */
export function shuttleAt(t: number): number {
  let i = -1
  for (let j = 0; j < PASSES.length; j++) if (PASSES[j] - PASS <= t) i = j
  if (i < 0) return -1
  const from = i % 2 === 0 ? -1 : 1
  const u = smoother(t, PASSES[i] - PASS, PASSES[i])
  return from + (-2 * from) * u
}

/** How many passes have landed by `t` (for the heddle's turn). */
const passesBy = (t: number): number => PASSES.filter((p) => p <= t).length

let table: Float32Array | null = null
let built = 0
/**
 * How much of the warp is woven at `t`, 0 to 1. Integrated over the show from the sky (`nightness`), as far as it has
 * been asked for: it grows by day and comes back by night while she is at the loom, and stays as she left it after.
 */
export function woven(t: number): number {
  if (!table) {
    table = new Float32Array(Math.ceil(END / STEP) + 2)
    table[0] = 0.46
    built = 1
  }
  const f = Math.max(0, t) / STEP
  const i = Math.min(table.length - 2, Math.floor(f))
  for (; built <= i + 1; built++) {
    const s = (built - 1) * STEP
    let v = table[built - 1]
    if (atLoom(s)) v = Math.max(0.22, Math.min(0.72, v + (nightness(s) > 0.5 ? -0.0035 : 0.005) * STEP))
    table[built] = v
  }
  return table[i] + (table[i + 1] - table[i]) * (f - i)
}

/** Where Penelope stands at her loom: a little to the side of it, following the shuttle with her body. */
export function weaverX(t: number): number {
  return LOOM.x + 0.2 * shuttleAt(t)
}

export function drawLoom(g: Paint): void {
  const { ctx, t } = g
  const x0 = LOOM.x - LOOM.half
  const x1 = LOOM.x + LOOM.half
  const top = LOOM.top
  const foot = LOOM.foot
  const timber = indoors(TIMBER, t)
  const warp = indoors('#D8CBAE', t)
  // The uprights, leaning a little back against the wall, and the beam at the top with the cloth rolled on it.
  for (const x of [x0, x1]) {
    rect(ctx, x - 0.035, top - 0.05, 0.07, ROOM.floor - top + 0.05)
    fill(ctx, timber)
  }
  // The warp below the cloth: a pale field, its threads gathered in bundles to the weights.
  const span = foot - top - 0.12
  const fell = top + 0.1 + span * woven(t)
  const shed = (passesBy(t) % 2 === 0 ? 1 : -1) * 0.012
  rect(ctx, x0 + 0.05, fell, x1 - x0 - 0.1, foot - fell)
  fill(ctx, rgba(warp, 0.55))
  const bundles = 8
  for (let i = 0; i < bundles; i++) {
    const bx = x0 + 0.09 + ((x1 - x0 - 0.18) * i) / (bundles - 1)
    const sway = 0.006 * Math.sin(t * 1.3 + i) + 0.01 * ring(t, PASSES.find((p) => p > t - 1.2 && p <= t) ?? -99, 1.6, 0.5)
    ctx.beginPath()
    ctx.moveTo(bx - 0.03, fell)
    ctx.lineTo(bx + sway, foot - 0.02)
    ctx.lineTo(bx + 0.03, fell)
    stroke(g, rgba(indoors('#B8A88A', t), 0.9), 0.8)
    // A clay weight: a little pyramid hanging at the bundle's foot.
    ctx.beginPath()
    ctx.moveTo(bx + sway - 0.028, foot + 0.07)
    ctx.lineTo(bx + sway, foot - 0.02)
    ctx.lineTo(bx + sway + 0.028, foot + 0.07)
    ctx.closePath()
    fill(ctx, indoors('#9A6B4E', t))
  }
  // The heddle rod and the shed rod across the warp, the heddle turning with each pass.
  rect(ctx, x0 - 0.02, fell + 0.1 + shed, x1 - x0 + 0.04, 0.025)
  fill(ctx, indoors(TIMBER_LIGHT, t))
  rect(ctx, x0 - 0.02, fell + 0.22 - shed, x1 - x0 + 0.04, 0.02)
  fill(ctx, indoors(TIMBER_LIGHT, t))
  // The cloth: cream, with the shroud's bands woven so far (madder, petrol, madder), from the beam down to the fell.
  rect(ctx, x0 + 0.05, top + 0.06, x1 - x0 - 0.1, fell - top - 0.06)
  fill(ctx, indoors(CLOTH, t))
  const bands: [number, number, string][] = [
    [0.1, 0.04, MADDER],
    [0.18, 0.025, PETROL],
    [0.24, 0.04, MADDER],
    [0.46, 0.03, PETROL],
  ]
  for (const [d, h, c] of bands) {
    const y = top + 0.06 + d
    if (y >= fell) continue
    rect(ctx, x0 + 0.05, y, x1 - x0 - 0.1, Math.min(h, fell - y))
    fill(ctx, indoors(c, t))
  }
  // The beam, with the cloth's roll on it.
  rect(ctx, x0 - 0.07, top - 0.03, x1 - x0 + 0.14, 0.07)
  fill(ctx, timber)
  // The shuttle at the fell, and the red weft trailing from the edge it left.
  if (atLoom(t)) {
    const s = shuttleAt(t)
    const sx = LOOM.x + (LOOM.half - 0.09) * s
    const from = passesBy(t) % 2 === 0 ? x0 + 0.05 : x1 - 0.05
    ctx.beginPath()
    ctx.moveTo(from, fell + 0.01)
    ctx.lineTo(sx, fell + 0.01)
    stroke(g, indoors(MADDER, t), 1.1)
    rect(ctx, sx - 0.06, fell - 0.006, 0.12, 0.03)
    fill(ctx, indoors(TIMBER_LIGHT, t))
  }
  void clamp01
}
