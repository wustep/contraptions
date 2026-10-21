import { blob, circle, fill, line, mix, poly, rect, rgba, smooth, vgrad, type Paint, type Pt } from '../../paint'
import { HARVESTER, T } from './geo'

/**
 * The spice harvester: a crawler as long as a street, on one long tread, its hull sloping down to a scoop at the sand in
 * front (east), a cab tower at its back, and two stacks breathing a tall plume of spice that leans west in the wind. Its
 * one job is to be taken. A door at the west end of its near side slides open, and a ramp comes down from it to the sand
 * for the crew.
 *
 * Local cells: its middle at x = 0 on the sand (y = 0), facing east.
 */

const HULL = '#7F6D5C'
const HULL_LIT = '#A08A73'
const HULL_DARK = '#5A4C41'
const TREAD = '#3A3029'
const WHEEL = '#2A231E'
const SLIT = '#1D1916'
const SPICE = '#B8783F'

/** The door's sill and the ramp's foot, world cells: where the crew come out and where they reach the sand. */
export const DOOR: Pt = [HARVESTER.x - 6.4, -2.3]
export const RAMP_FOOT: Pt = [HARVESTER.x - 10.6, 0]

/** How far the door is open, and the ramp down (0 stowed against the hull, 1 on the sand). */
const doorAt = (t: number): number => smooth(t, 156.9, 157.3)
const rampAt = (t: number): number => smooth(t, 157.0, 157.5)

/** Where the ramp's far end is at `t`, world cells: swung down from standing up against the hull. */
export function rampEnd(t: number): Pt {
  const len = Math.hypot(RAMP_FOOT[0] - DOOR[0], RAMP_FOOT[1] - DOOR[1])
  const down = Math.atan2(RAMP_FOOT[1] - DOOR[1], RAMP_FOOT[0] - DOOR[0])
  const up = -Math.PI / 2 - 0.05
  const a = up + (down - up) * rampAt(t)
  return [DOOR[0] + Math.cos(a) * len, DOOR[1] + Math.sin(a) * len]
}

/**
 * The harvester at `t`, `sunk` cells down into the worm (and the sand), clipped at the sand's surface; `shade` (0 to 1)
 * is how far it stands in the worm's shadow.
 */
export function drawHarvester(g: Paint, t: number, sunk: number, shade = 0): void {
  const ctx = g.ctx
  const c = (col: string) => (shade > 0.001 ? mix(col, '#4A2C16', 0.42 * shade) : col)
  ctx.save()
  // Nothing of it below the sand.
  ctx.beginPath()
  ctx.rect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, 0.35 - g.view.y0 + 1)
  ctx.clip()
  ctx.translate(HARVESTER.x, sunk)
  // The tread, and its wheels.
  blob(ctx, [[-7.8, -2.3], [7.6, -2.3], [8.1, -1.1], [7.5, 0.05], [-7.6, 0.05], [-8.2, -1.1]])
  fill(ctx, c(TREAD))
  for (let i = 0; i < 7; i++) {
    circle(ctx, -6.6 + i * 2.2, -1.1, 0.72)
    fill(ctx, c(WHEEL))
  }
  // The scoop at its front, down to the sand.
  poly(ctx, [[7.0, -2.4], [10.6, -0.25], [10.2, 0.1], [7.6, 0.1], [7.0, -1.2]])
  fill(ctx, c(HULL_DARK))
  // The hull, sloping down to the front, lit along its top, darker along its foot.
  poly(ctx, [[-7.3, -2.3], [-7.3, -6.2], [2.2, -6.4], [5.4, -5.5], [7.8, -3.1], [8.6, -2.3]])
  fill(ctx, vgrad(ctx, -6.4, -2.3, [[0, c(HULL_LIT)], [0.18, c(HULL)], [0.8, c(HULL)], [1, c(HULL_DARK)]]))
  // The stacks, and the cab tower at its back with its one dark slit of windows.
  for (const sx of [0.9, 2.5]) {
    rect(ctx, sx, -10.7, 0.85, 4.4)
    fill(ctx, mix(HULL, c(HULL_DARK), 0.4))
    rect(ctx, sx - 0.12, -10.95, 1.09, 0.35)
    fill(ctx, c(HULL_DARK))
  }
  poly(ctx, [[-6.8, -6.2], [-6.8, -9.5], [-2.0, -9.5], [-1.3, -6.25]])
  fill(ctx, vgrad(ctx, -9.5, -6.2, [[0, c(HULL_LIT)], [0.25, c(HULL)], [1, c(HULL)]]))
  rect(ctx, -6.4, -8.75, 4.2, 0.5)
  fill(ctx, c(SLIT))
  // The door at the west end of its near side: dark inside once it has slid open.
  const open = doorAt(t)
  rect(ctx, -6.95, -3.45, 1.05, 1.15)
  fill(ctx, c(HULL_DARK))
  if (open > 0.001) {
    rect(ctx, -6.95, -3.45, 1.05 * open, 1.15)
    fill(ctx, c(SLIT))
  }
  ctx.restore()
  // The ramp, from the sill: a plank with a rail, standing against the hull until it swings down.
  if (sunk < 0.5) {
    const end = rampEnd(t)
    const sill: Pt = [DOOR[0] - 0.1, DOOR[1]]
    const dx = end[0] - sill[0]
    const dy = end[1] - sill[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = dy / l
    const ny = -dx / l
    const th = 0.26
    poly(ctx, [sill, end, [end[0] + nx * th, end[1] + ny * th], [sill[0] + nx * th, sill[1] + ny * th]])
    fill(ctx, c(HULL_DARK))
    line(g, [sill[0] + nx * 0.03, sill[1] + ny * 0.03], [end[0] + nx * 0.03, end[1] + ny * 0.03], c(HULL_LIT), 0.06)
  }
}

/**
 * The plume: spice breathed up from the stacks, one broad soft column leaning west as it rises and thinning to nothing,
 * laid in three widths so its edge is soft; a few large slow billows climb it, never a field of specks. On the drums'
 * blow at `plume` it bellies out; once the stacks have gone under it is cut off at its foot and drifts up and away.
 */
export function drawPlume(g: Paint, t: number, sunk: number): void {
  const ctx = g.ctx
  const gone = smooth(t, T.swallow - 0.3, 196)
  if (gone >= 0.999) return
  const base: Pt = [HARVESTER.x + 2.2, -10.9 + sunk * 0.2]
  // Once the stacks are under, its foot lifts away from them.
  const foot = 34 * smooth(t, T.swallow - 0.3, 197) ** 0.7
  const H = 38
  const belly = Math.exp(-(((t - T.plume - 0.9) / 1.3) ** 2))
  const along = (h: number): Pt => [base[0] - 0.24 * h - 0.004 * h * h, base[1] - h]
  const half = (h: number): number => 0.7 + 0.2 * h + 1.4 * belly * Math.exp(-(((h - 8) / 7) ** 2))
  for (const [k, a] of [[1.0, 0.16], [0.72, 0.16], [0.45, 0.16]] as [number, number][]) {
    const left: Pt[] = []
    const right: Pt[] = []
    for (let h = foot; h <= H; h += 1) {
      const [x, y] = along(h)
      const w = half(h) * k
      left.push([x - w, y])
      right.push([x + w, y])
    }
    if (left.length < 2) continue
    poly(ctx, [...left, ...right.reverse()])
    const [, y0] = along(foot)
    const [, y1] = along(H)
    fill(ctx, vgrad(ctx, y0, y1, [[0, rgba(SPICE, a * (1 - gone))], [0.55, rgba(SPICE, a * 0.7 * (1 - gone))], [1, rgba(SPICE, 0)]]))
  }
  // Billows: a few large soft swellings climbing it slowly.
  for (let i = 0; i < 4; i++) {
    const period = 11
    const u = (((t / period + i / 4) % 1) + 1) % 1
    const h = foot + 2 + u * (H - foot - 4)
    if (h > H - 2) continue
    const [x, y] = along(h)
    const r = half(h) * 0.9
    const a = 0.12 * Math.sin(Math.PI * u) * (1 - gone)
    ctx.beginPath()
    ctx.ellipse(x + 0.3 * Math.sin(i * 1.7 + t * 0.2), y, r, r * 0.7, 0, 0, Math.PI * 2)
    fill(ctx, rgba(SPICE, a))
  }
}
