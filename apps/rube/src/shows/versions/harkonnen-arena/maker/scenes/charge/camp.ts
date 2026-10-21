import { SARDAUKAR } from '../../cast'
import { clamp01, ellipse, mix, type Brush } from '../../paint'
import { B, EMPEROR, RANKS, SHIP1, ground, headX } from './plan'

/**
 * The Emperor's camp: the Sardaukar in their blocks on the flat, facing the storm; the small ships standing among them on
 * their legs; and behind them the great ship, an upright ovoid as dark as the storm's heart.
 *
 * A block is a calm mass, its top a single row of helmets: never a field of separate men. The worm that runs through a
 * block takes it as it goes: east of its head the block stands, west of it there is only sand.
 *
 * A ship that is struck goes over the way it is pushed, about the foot it falls toward, slowly at first and faster, as a
 * tall thing falls; it lands on the beat, rocks once and lies still.
 */

// Dark against the pale floor: the hulls are the camp's silhouette, with only a narrow face turned to the light.
const HULL = '#221C19'
const HULL_LIT = '#3A2E27'
const HULL_DARK = '#17120F'

/** How far over a struck thing has gone: 0 standing, `most` lying; from `hit` it falls, landing at `land`, then rocks. */
export function toppled(t: number, hit: number, land: number, most = Math.PI / 2 - 0.04): number {
  if (t <= hit) return 0
  if (t < land) {
    const u = (t - hit) / (land - hit)
    return most * u * u * (0.35 + 0.65 * u)
  }
  const s = t - land
  return most - 0.07 * Math.abs(Math.sin(s * 7)) * Math.exp(-s / 0.3)
}

/**
 * A block of Sardaukar from `x0` to `x1` on the ground, three rows deep (the back rows a little higher and paler), its
 * top a row of helmets. `taken`: the block is gone west of this x.
 */
export function paintBlock(b: Brush, x0: number, x1: number, taken: number, at: (x: number) => number = ground): void {
  const { ctx } = b
  const from = Math.max(x0, taken)
  if (from >= x1 - 0.05) return
  // In the storm's light they are dark: grey only where the far rows go into the dust.
  const men = mix(SARDAUKAR, '#1F1B18', 0.5)
  const rows: [number, string][] = [
    [-0.6, mix(men, '#8A5A3C', 0.38)],
    [-0.4, mix(men, '#8A5A3C', 0.24)],
    [-0.2, mix(men, '#8A5A3C', 0.11)],
    [0, men],
  ]
  for (const [lift, color] of rows) {
    const h = 0.32
    const r = 0.12
    ctx.beginPath()
    const y0 = at(from) + lift
    ctx.moveTo(from, y0 + 0.02)
    // The helmets: one row of shallow arcs along the top.
    const n = Math.max(1, Math.floor((x1 - from) / (r * 2.15)))
    const w = (x1 - from) / n
    for (let i = 0; i < n; i++) {
      const cx = from + w * (i + 0.5)
      const y = at(cx) + lift - h
      ctx.lineTo(cx - w / 2, y + r * 0.55)
      ctx.quadraticCurveTo(cx, y - r * 0.75, cx + w / 2, y + r * 0.55)
    }
    ctx.lineTo(x1, at(x1) + lift + 0.02)
    ctx.closePath()
    ctx.fillStyle = b.c(color)
    ctx.fill()
  }
}

/**
 * A small ship: a tall hull narrowing to a blunt top on three short legs, standing at `x` (its middle), `h` tall and `w`
 * wide. Over `tip` radians about the foot on its east side.
 */
export function paintSmallShip(b: Brush, x: number, h: number, w: number, tip: number, base = 0): void {
  const { ctx } = b
  const legs = h * 0.12
  const px = x + w / 2
  ctx.save()
  ctx.translate(px, base)
  ctx.rotate(tip)
  ctx.translate(-px, -base)
  // The legs.
  ctx.fillStyle = b.c(HULL_DARK)
  for (const lx of [x - w * 0.42, x, x + w * 0.42]) {
    ctx.beginPath()
    ctx.moveTo(lx - 0.18, base)
    ctx.lineTo(lx + 0.18, base)
    ctx.lineTo(lx + 0.1, base - legs - 0.3)
    ctx.lineTo(lx - 0.1, base - legs - 0.3)
    ctx.closePath()
    ctx.fill()
  }
  // The hull.
  const y0 = base - legs
  const top = base - h
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y0)
  ctx.lineTo(x - w / 2, top + h * 0.28)
  ctx.quadraticCurveTo(x - w * 0.42, top, x, top)
  ctx.quadraticCurveTo(x + w * 0.42, top, x + w / 2, top + h * 0.28)
  ctx.lineTo(x + w / 2, y0)
  ctx.closePath()
  ctx.fillStyle = b.c(HULL)
  ctx.fill()
  // One face takes the storm's light: a narrow strip down its west side.
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y0)
  ctx.lineTo(x - w / 2, top + h * 0.28)
  ctx.quadraticCurveTo(x - w * 0.44, top + h * 0.06, x - w * 0.26, top + h * 0.02)
  ctx.lineTo(x - w * 0.3, y0)
  ctx.closePath()
  ctx.fillStyle = b.c(HULL_LIT)
  ctx.fill()
  ctx.restore()
}

/** The great ship: an upright ovoid on short legs, over `tip` radians about its east foot. */
export function paintEmperor(b: Brush, tip: number): void {
  const { ctx } = b
  const { x, w, h, legs } = EMPEROR
  const px = x + w / 2
  ctx.save()
  ctx.translate(px, 0)
  ctx.rotate(tip)
  ctx.translate(-px, 0)
  // Its plinth: a low drum it stands on, wider than its foot.
  ctx.beginPath()
  ctx.moveTo(x - w * 0.36, 0)
  ctx.lineTo(x + w * 0.36, 0)
  ctx.lineTo(x + w * 0.28, -legs - 0.4)
  ctx.lineTo(x - w * 0.28, -legs - 0.4)
  ctx.closePath()
  ctx.fillStyle = b.c(HULL_DARK)
  ctx.fill()
  const cy = -legs - h / 2
  // The ovoid: fuller below, narrowing above.
  ctx.beginPath()
  ctx.moveTo(x, -legs)
  ctx.bezierCurveTo(x + w * 0.62, -legs, x + w * 0.5, -legs - h * 0.98, x, -legs - h)
  ctx.bezierCurveTo(x - w * 0.5, -legs - h * 0.98, x - w * 0.62, -legs, x, -legs)
  ctx.closePath()
  ctx.fillStyle = b.c(HULL)
  ctx.fill()
  // Its west flank lit by the storm's glow, a crescent.
  ctx.save()
  ctx.clip()
  ellipse(ctx, x + w * 0.16, cy + h * 0.02, w * 0.52, h * 0.56)
  ctx.rect(x - w, -legs - h - 1, w * 2, h + 2)
  ctx.fillStyle = b.c(HULL_LIT)
  ctx.fill('evenodd')
  ctx.restore()
  ctx.restore()
}

/** When the lead worm's head passes `x` (the first time it is at or east of it). */
export function passes(x: number, from: number, to: number): number {
  let a = from
  let c = to
  if (headX(c) < x) return Infinity
  for (let i = 0; i < 40; i++) {
    const m = (a + c) / 2
    if (headX(m) >= x) c = m
    else a = m
  }
  return c
}

/** The camp in the action's plane: the blocks the lead worm runs through, its first ship, and the great ship. */
export function paintCamp(b: Brush): void {
  const t = b.t
  const { view } = b
  if (view.x1 < RANKS[0][0] - 30 || view.x0 > EMPEROR.x + 40) return
  // The first ship, struck at its legs as the worm goes through the first block.
  paintSmallShip(b, SHIP1.x, SHIP1.h, SHIP1.w, toppled(t, B.ship1, B.ship1Down))
  const tipE = toppled(t, B.crash, B.ground, Math.PI / 2 - 0.02)
  paintEmperor(b, tipE)
  const head = headX(t) + 1.5
  for (const [x0, x1] of RANKS) paintBlock(b, x0, x1, head)
}

/** For the plan: when the lead worm reaches each of its blocks (each is gone from there on). */
export const BLOCK_TAKEN = RANKS.map(([x0]) => passes(x0, 263, 300))

/** A share 0..1 of the way through a fall, for dust on landing. */
export const landed = (t: number, land: number): number => clamp01((t - land) / 3)
