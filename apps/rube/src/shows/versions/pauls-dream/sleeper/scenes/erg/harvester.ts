import { circle, drift, fill, line, mix, poly, rgba, smooth, vgrad, type Paint, type Pt } from '../../paint'
import { HARVESTER, T } from './geo'

/**
 * The spice harvester: a huge dark armoured crawler, low and wide, thirty cells long (nine ornithopters), on one long
 * tread, its armour sloping to an intake scoop at the sand in front (east), and from a vent on its back one great soft
 * column of spice dust leaning west in the wind. Its one job is to be taken. A door low in its west end opens and a
 * ramp comes down from it to the sand for the crew.
 *
 * Local cells: its middle at x = 0 on the sand (y = 0), facing east.
 */

const ARMOUR = '#4B453E'
const ARMOUR_LIT = '#6E6459'
const ARMOUR_DARK = '#34302B'
const TREAD = '#2A2723'
const WHEEL = '#3A3530'
const SLIT = '#17140F'
const SPICE = '#B97A42'
const SHADOW = '#4A2C16'

/** The door's sill and the ramp's foot, world cells: where the crew come out, and where they reach the sand. */
export const DOOR: Pt = [HARVESTER.x - 13.6, -3.4]
export const RAMP_FOOT: Pt = [HARVESTER.x - 20.4, 0]
/** The vent on its back the plume comes out of. */
const VENT: Pt = [HARVESTER.x - 6.5, -8.9]

const doorAt = (t: number): number => smooth(t, 156.9, 157.3)
const rampAt = (t: number): number => smooth(t, 157.0, 157.5)

/** Where the ramp's far end is at `t`: swung down from lying up along the hull's sloping armour. */
export function rampEnd(t: number): Pt {
  const len = Math.hypot(RAMP_FOOT[0] - DOOR[0], RAMP_FOOT[1] - DOOR[1])
  const down = Math.atan2(RAMP_FOOT[1] - DOOR[1], RAMP_FOOT[0] - DOOR[0])
  const up = Math.atan2(-8.4 - DOOR[1], HARVESTER.x - 9.2 - DOOR[0])
  const a = up + (down - up) * rampAt(t)
  return [DOOR[0] + Math.cos(a) * len, DOOR[1] + Math.sin(a) * len]
}

/**
 * The harvester at `t`, `sunk` cells down (inside the worm, and the sand), clipped at the sand's surface; `shade`
 * (0 to 1) is how far it stands in the worm's shadow.
 */
export function drawHarvester(g: Paint, t: number, sunk: number, shade = 0): void {
  if (sunk > 14) return
  const ctx = g.ctx
  const c = (col: string) => (shade > 0.001 ? mix(col, SHADOW, 0.4 * shade) : col)
  ctx.save()
  ctx.beginPath()
  ctx.rect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, 0.35 - g.view.y0 + 1)
  ctx.clip()
  ctx.translate(HARVESTER.x, sunk)
  // The tread: one long band with its great wheels, barely lighter than it.
  poly(ctx, [[-15.2, -3.3], [14.6, -3.3], [15.6, -1.6], [14.8, 0.05], [-14.8, 0.05], [-15.8, -1.6]])
  fill(ctx, c(TREAD))
  for (let i = 0; i < 9; i++) {
    circle(ctx, -12.8 + i * 3.2, -1.55, 1.15)
    fill(ctx, c(WHEEL))
  }
  // The intake scoop in front, down to the sand.
  poly(ctx, [[13.6, -3.4], [19.4, -0.3], [18.6, 0.1], [14.2, 0.1], [13.4, -1.6]])
  fill(ctx, c(ARMOUR_DARK))
  // The armour: one long low lozenge, its top catching the sun, darker toward its foot.
  poly(ctx, [[-14.6, -3.3], [-13.4, -7.6], [-7.5, -9.0], [6.5, -9.0], [12.6, -7.3], [16.2, -3.3]])
  fill(ctx, vgrad(ctx, -9.0, -3.3, [[0, c(ARMOUR_LIT)], [0.14, c(ARMOUR)], [0.75, c(ARMOUR)], [1, c(ARMOUR_DARK)]]))
  // Its plates' joints, three, and the long dark slit of its cab along the front.
  for (const x of [-7.2, 0.2, 6.4]) line(g, [x, -8.9], [x + 0.4, -3.4], rgba(c(ARMOUR_DARK), 0.7), 0.08)
  poly(ctx, [[5.4, -8.3], [11.6, -7.0], [11.4, -6.6], [5.2, -7.9]])
  fill(ctx, c(SLIT))
  // The vent on its back.
  poly(ctx, [[VENT[0] - HARVESTER.x - 2.2, -9.0], [VENT[0] - HARVESTER.x + 2.2, -9.0], [VENT[0] - HARVESTER.x + 1.6, -9.35], [VENT[0] - HARVESTER.x - 1.6, -9.35]])
  fill(ctx, c(SLIT))
  // The door, low in its west end: dark inside once it has slid open.
  const open = doorAt(t)
  poly(ctx, [[-14.3, -5.6], [-12.9, -5.6], [-12.9, -3.4], [-14.3, -3.4]])
  fill(ctx, c(ARMOUR_DARK))
  if (open > 0.001) {
    poly(ctx, [[-14.3, -5.6], [-14.3 + 1.4 * open, -5.6], [-14.3 + 1.4 * open, -3.4], [-14.3, -3.4]])
    fill(ctx, SLIT)
  }
  ctx.restore()
  // The ramp from the sill: a plank under its surface, standing against the hull until it swings down.
  if (sunk < 0.5) {
    const end = rampEnd(t)
    const sill: Pt = [DOOR[0] - 0.1, DOOR[1]]
    const dx = end[0] - sill[0]
    const dy = end[1] - sill[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = dy / l
    const ny = -dx / l
    const th = 0.3
    poly(ctx, [sill, end, [end[0] + nx * th, end[1] + ny * th], [sill[0] + nx * th, sill[1] + ny * th]])
    fill(ctx, c(ARMOUR_DARK))
    line(g, [sill[0] + nx * 0.03, sill[1] + ny * 0.03], [end[0] + nx * 0.03, end[1] + ny * 0.03], c(ARMOUR_LIT), 0.07)
  }
}

/**
 * The plume: spice dust driven up from the vent in one soft column, tapering, leaning west with the wind as it rises,
 * darker at its foot and paling into the haze as it thins, its edge wandering slowly and unevenly. It is laid as thin
 * slices up its height, each soft across its width, so it has no edge and no discs. On the drums' blow at `plume` it
 * bellies out low down; once the harvester has gone under it is cut off at its foot and drifts up and away.
 */
export function drawPlume(g: Paint, t: number, haze: string): void {
  const ctx = g.ctx
  const gone = smooth(t, T.swallow - 0.6, 197)
  if (gone >= 0.999) return
  const foot = 60 * smooth(t, T.swallow - 0.6, 198) ** 0.7
  const H = 70
  const belly = Math.exp(-(((t - T.plume - 0.9) / 1.3) ** 2))
  const along = (h: number): number => VENT[0] - 0.3 * h - 0.0035 * h * h + 1.4 * drift(h / 16 - t * 0.05, 3) * Math.min(1, h / 10)
  const half = (h: number): number => (1.4 + 0.25 * h) * (1 + 0.16 * drift(h / 9 + t * 0.07, 5)) + 2.6 * belly * Math.exp(-(((h - 12) / 10) ** 2))
  // Slices meet exactly, each boundary on a whole row of the canvas's pixels, so no row is painted twice (a stripe) or
  // half by each (a seam).
  const m = ctx.getTransform()
  const snap = (y: number): number => (Math.round(m.d * y + m.f) - m.f) / m.d
  // Finer low down, where its colour and strength change fastest.
  const stepAt = (h: number): number => 0.25 + 0.45 * smooth(h, foot + 2, foot + 14)
  let ya = snap(VENT[1] - foot)
  for (let h = foot; h < H; h += stepAt(h)) {
    const y0 = ya
    const y1 = snap(VENT[1] - Math.min(H, h + stepAt(h)))
    ya = y1
    if (y1 >= y0) continue
    const hA = VENT[1] - y0
    const hB = VENT[1] - y1
    const c0 = along(hA)
    const c1 = along(hB)
    const w0 = half(hA)
    const w1 = half(hB)
    // Darker at the foot, paling into the haze; thinning as it goes up, and over its last stretch to nothing.
    const u = hA / H
    const color = mix(mix('#8A5530', SPICE, smooth(hA, 0, 18)), haze, 0.55 * smooth(hA, 14, H))
    // Out of the vent at once, dark; once cut off, its foot thins away softly.
    const a = 0.46 * (1 - gone) * (1 - u) ** 1.3 * smooth(hA, foot, foot + (foot > 0.5 ? 6 : 1.5))
    if (a <= 0.003) continue
    poly(ctx, [[c0 - w0, y0], [c0 + w0, y0], [c1 + w1, y1], [c1 - w1, y1]])
    // Across the column, square to its lean, so the soft edge runs along it rather than stepping slice by slice.
    const ax = c1 - c0
    const ay = y1 - y0
    const al = Math.hypot(ax, ay) || 1
    const nx = -ay / al
    const ny = ax / al
    const mx = (c0 + c1) / 2
    const my = (y0 + y1) / 2
    const wp = ((w0 + w1) / 2) * (Math.abs(ay) / al)
    const gr = ctx.createLinearGradient(mx - nx * wp, my - ny * wp, mx + nx * wp, my + ny * wp)
    gr.addColorStop(0, rgba(color, 0))
    gr.addColorStop(0.32, rgba(color, a))
    gr.addColorStop(0.68, rgba(color, a))
    gr.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = gr
    ctx.fill()
  }
}
