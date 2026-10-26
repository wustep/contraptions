import { drawFrigate } from '../../craft/frigate'
import { blob, clamp01, fill, line, mix, poly, rect, rgba, smooth, smoother, vgrad, type Paint, type Pt } from '../../paint'
import { AIR } from './sea'
import { CLIFF, CLOUDS, FIELD, FRIGATE_AT, HEIGHLINER, RAMP, T } from './geo'

/**
 * The leaving: the landing field on the cliff's top, the frigate on it with its ramp down, the family going up, the
 * lift on the build's swell, the climb through Caladan's cloud, and over it, in the dark, the Guild's heighliner: a
 * tube so long its ends are out of every frame, its hold open underneath. The frigate goes up into the hold and is
 * still there on the drop, when the fold hands it to Arrakis.
 */

/** Where the frigate docks, inside the hold. */
const DOCK: Pt = [FRIGATE_AT[0], HEIGHLINER.belly - 9]

/** How far up the frigate has come at `t` (cells over its place on the field), eased from rest to rest. */
function climb(t: number): number {
  if (t <= T.lift) return 0
  const total = FRIGATE_AT[1] - DOCK[1]
  // It leaves the ground slowly, is fastest through the cloud, and comes to rest in the hold a moment before the drop.
  return total * smoother(t, T.lift, T.fold - 0.25)
}

/** The frigate's middle at `t`. */
export function frigateAt(t: number): Pt {
  return [FRIGATE_AT[0] + 1.2 * smooth(t, T.lift, T.fold - 0.25), FRIGATE_AT[1] - climb(t)]
}

/** How hard its vents push at `t`. */
const burnAt = (t: number) => smooth(t, T.field, T.lift) * (1 - 0.6 * smooth(t, T.hold, T.fold - 0.2))

/** The legs it stands on, drawn up as it lifts. */
function legs(g: Paint, at: Pt, t: number): void {
  const up = smooth(t, T.lift, T.lift + 1.2)
  if (up >= 0.999) return
  const foot = CLIFF.top - (CLIFF.top - (at[1] + 1.8)) * up
  for (const dx of [-5.2, 5.2]) {
    line(g, [at[0] + dx * 0.8, at[1] + 1.6], [at[0] + dx, foot], '#2A2D2C', 0.12)
    rect(g.ctx, at[0] + dx - 0.35, foot - 0.08, 0.7, 0.1)
    fill(g.ctx, '#2A2D2C')
  }
}

/** The field: flat ground on the cliff's top, a long pad of dark stone for the ship. */
export function field(g: Paint): void {
  const v = g.view
  if (v.x1 < FIELD.x0 - 2 || v.x0 > FIELD.x1 + 2 || v.y0 > CLIFF.top + 3 || v.y1 < CLIFF.top - 40) return
  const ctx = g.ctx
  rect(ctx, FIELD.x0 - 30, CLIFF.top, FIELD.x1 - FIELD.x0 + 60, 30)
  fill(ctx, vgrad(ctx, CLIFF.top, CLIFF.top + 6, [[0, '#2E3833'], [1, '#1A201D']]))
  rect(ctx, FRIGATE_AT[0] - 11, CLIFF.top - 0.04, 22, 0.25)
  fill(ctx, '#3E4442')
}

/** The ramp from the field up into the frigate's side, down until the family is aboard. */
function ramp(g: Paint, t: number): void {
  const shut = smooth(t, T.field + 1.5, T.lift - 0.2)
  if (shut >= 0.999) return
  const top = RAMP.top
  const foot: Pt = [RAMP.foot[0] + (top[0] - RAMP.foot[0]) * shut, RAMP.foot[1] + 0.13 + (top[1] - RAMP.foot[1] - 0.13) * shut]
  poly(g.ctx, [[foot[0], foot[1]], [top[0], top[1]], [top[0], top[1] + 0.12], [foot[0], foot[1] + 0.12]])
  fill(g.ctx, '#4A4F4D')
}

/** The frigate and everything it does, under the balls (its legs, the ramp) and over them (the hull). */
export function frigateUnder(g: Paint): void {
  const t = g.t
  if (t < T.field - 0.5) return
  const at = frigateAt(t)
  const v = g.view
  if (at[0] + 9 < v.x0 || at[0] - 9 > v.x1 || at[1] + 6 < v.y0 || at[1] - 4 > v.y1) return
  legs(g, at, t)
  ramp(g, t)
}

export function frigateOver(g: Paint): void {
  const t = g.t
  if (t < T.field - 0.5) return
  const at = frigateAt(t)
  const v = g.view
  if (at[0] + 9 < v.x0 || at[0] - 9 > v.x1 || at[1] + 6 < v.y0 || at[1] - 4 > v.y1) return
  drawFrigate(g, { x: at[0], y: at[1], burn: burnAt(t), reach: 1.4 })
  // The dust and rain thrown off the field as it lifts: a low pale veil that spreads and goes.
  const kick = smooth(t, T.lift - 0.3, T.lift + 0.4) * (1 - smooth(t, T.lift + 0.6, T.lift + 3.5))
  if (kick > 0.01) {
    const w = 10 + 9 * smooth(t, T.lift, T.lift + 3)
    blob(g.ctx, [[at[0] - w, CLIFF.top + 0.1], [at[0] - w * 0.6, CLIFF.top - 1.6], [at[0], CLIFF.top - 2.2], [at[0] + w * 0.6, CLIFF.top - 1.6], [at[0] + w, CLIFF.top + 0.1]])
    fill(g.ctx, rgba(AIR.mist, 0.45 * kick))
  }
}

/** How far into space the air is at height `y`: 0 under the clouds, 1 above the heighliner. */
export const spaceAt = (y: number) => smooth(-y, 70, 140)

/**
 * Above the cloud: the camera's horizon is a sea of cloud tops under a sky going to the dark of space. Drawn over
 * Caladan's sky and sea as the camera climbs past the deck, so the climb ends over the planet's weather, not in a void.
 */
export function heights(g: Paint): void {
  const v = g.view
  const f = spaceAt(v.cy)
  if (f <= 0.002) return
  const ctx = g.ctx
  ctx.save()
  ctx.globalAlpha = f
  ctx.fillStyle = vgrad(ctx, v.cy - v.h * 0.9, v.cy, [[0, '#090C12'], [0.7, '#1C2530'], [1, '#56626A']])
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.w + 2, v.cy - v.y0 + 1)
  ctx.fillStyle = vgrad(ctx, v.cy, v.cy + v.h * 0.6, [[0, '#9AA49F'], [0.25, '#7E8984'], [1, '#56605C']])
  ctx.fillRect(v.x0 - 1, v.cy, v.w + 2, v.y1 - v.cy + 1)
  ctx.restore()
}

/** The cloud deck: a long soft band of grey, its top rounded, drawn twice: the far half behind, the near half over. */
export function clouds(g: Paint, near: boolean): void {
  const v = g.view
  if (v.y1 < CLOUDS.y0 - 4 || v.y0 > CLOUDS.y1 + 4) return
  const ctx = g.ctx
  const top = (x: number) => CLOUDS.y0 + 2.2 + 1.6 * Math.sin(x * 0.11 + (near ? 1.7 : 0)) + 0.9 * Math.sin(x * 0.31 + 0.4)
  const pts: Pt[] = []
  for (let x = v.x0 - 2; x <= v.x1 + 2; x += Math.max(0.4, 8 * g.px)) pts.push([x, top(x) - (near ? 0 : 1.2)])
  ctx.beginPath()
  ctx.moveTo(pts[0][0], CLOUDS.y1 + (near ? 0.5 : -1))
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.lineTo(pts[pts.length - 1][0], CLOUDS.y1 + (near ? 0.5 : -1))
  ctx.closePath()
  const c = near ? '#A5AFAA' : '#8D9893'
  fill(ctx, vgrad(ctx, CLOUDS.y0, CLOUDS.y1 + 1, [[0, rgba(c, near ? 0.92 : 0.85)], [1, rgba(mix(c, AIR.low, 0.5), 0)]]))
}

/**
 * The heighliner: a dark tube lying across the sky over the cloud, its ends beyond any frame, ribbed along its length;
 * its hold a great dark mouth in its belly, the frigate rising into it.
 */
export function heighliner(g: Paint): void {
  const v = g.view
  const H = HEIGHLINER
  if (v.y1 < H.top - 4 || v.y0 > H.belly + 6) return
  const ctx = g.ctx
  const appear = clamp01(spaceAt(v.cy) * 1.4)
  if (appear <= 0.01) return
  ctx.save()
  ctx.globalAlpha = appear
  // The hull: a long band, dark on top against space, its belly lit grey by the cloud under it, so it reads round.
  ctx.fillStyle = vgrad(ctx, H.top, H.belly, [[0, '#0F1216'], [0.45, '#1B2025'], [0.85, '#353C42'], [1, '#444C52']])
  ctx.fillRect(H.x0, H.top, H.x1 - H.x0, H.belly - H.top)
  // Its ribs: broad bands round it every so often, a little darker, fading toward the lit belly.
  for (let x = H.x0 + 20; x < H.x1; x += 64) {
    rect(ctx, x, H.top, 7, H.belly - H.top)
    fill(ctx, vgrad(ctx, H.top, H.belly, [[0, rgba('#05070A', 0.6)], [1, rgba('#05070A', 0.15)]]))
  }
  // The hold: an open mouth in the belly, and the dark inside it up to its ceiling.
  rect(ctx, H.hold.x0, H.belly - H.hold.depth, H.hold.x1 - H.hold.x0, H.hold.depth)
  fill(ctx, '#07080A')
  // The hold's lit ceiling line (the dock), dim.
  rect(ctx, H.hold.x0 + 4, H.belly - H.hold.depth + 0.3, H.hold.x1 - H.hold.x0 - 8, 0.35)
  fill(ctx, rgba('#5C6166', 0.7))
  ctx.restore()
}

/** The lip of the hold, over the frigate as it rises in: the belly's near edges either side of the mouth. */
export function holdLip(g: Paint): void {
  const v = g.view
  const H = HEIGHLINER
  if (v.y1 < H.belly - 3 || v.y0 > H.belly + 3) return
  const appear = clamp01(spaceAt(v.cy) * 1.4)
  if (appear <= 0.01) return
  const ctx = g.ctx
  ctx.save()
  ctx.globalAlpha = appear
  rect(ctx, H.x0, H.belly - 1.6, H.hold.x0 - H.x0, 1.6)
  fill(ctx, '#14171A')
  rect(ctx, H.hold.x1, H.belly - 1.6, H.x1 - H.hold.x1, 1.6)
  fill(ctx, '#14171A')
  ctx.restore()
}
