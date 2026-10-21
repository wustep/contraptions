import { fill, layer, mix, poly, rgba, smooth, vgrad, type Paint, type Pt } from '../../paint'
import { DAY, between, dunes as range, hazeAt, sky, type Air } from '../../world/desert'
import { T, curve, dunes, WORM } from './geo'
import { RADIUS, heap, height } from './worm'
import { softBox } from './soft'

/**
 * The erg's air and sand: the day going on toward a lower sun, ranges of dunes to the horizon with the rock of
 * Arrakeen's bowl far behind to the west, and the near sand the ornithopter flies over and comes down on, with the worm
 * sign running under it.
 */

/** The late afternoon the scene goes on into: warmer, the sun low in the west. */
const LATE: Air = {
  zenith: '#C99B70',
  horizon: '#ECC796',
  haze: '#E3BA8A',
  sand: '#C98B52',
  shade: '#8A5330',
  sun: { x: 0.2, up: 0.12, r: 0.06, color: '#FCE8C6' },
}

export function airAt(t: number): Air {
  const a = between(DAY, LATE, 0.85 * smooth(t, 176, 197))
  // The sun keeps its place in each shot; it is low in the west only from the high shot on, after the cut.
  a.sun = t < T.above ? DAY.sun : LATE.sun
  return a
}

/** The worm sign: a long low swell running in under the sand from the east to where the worm will come up. */
const signX = curve([[T.sign, 508], [155, 499], [160, 491], [165, 484], [170.5, WORM.base], [T.rise, WORM.base]])
const signH = (t: number): number => 2.8 * smooth(t, T.sign, T.sign + 1.4) * (1 - smooth(t, 170.5, T.rise + 0.3))

/** The near sand's surface at `x`, at `t`: the dunes, the worm sign, the heap round the worm and the hole it leaves. */
export function ground(x: number, t: number): number {
  let y = dunes(x)
  const h = signH(t)
  if (h > 0.001) {
    // The swell, and the furrow it leaves behind it as the sand settles.
    const u = (x - signX(t)) / 5.6
    y -= h * Math.exp(-u * u) - 0.4 * h * Math.exp(-((u - 1.7) ** 2))
  }
  return y + heap(t, x)
}

/** The ranges behind, far to near. */
const RANGES = [
  { d: 1500, base: 0, amp: 62, len: 900, seed: 21 },
  { d: 480, base: 0, amp: 24, len: 280, seed: 22 },
  { d: 140, base: 0, amp: 10, len: 170, seed: 23 },
  { d: 45, base: 0, amp: 4.4, len: 88, seed: 24 },
]

/** Arrakeen's rock, far to the west: the outer wall of the bowl the city stands in, flat-topped. */
const ROCK: Pt[] = [
  [30, 0.5], [44, -14], [58, -19], [78, -22], [98, -21], [116, -25], [132, -23], [150, -17], [166, -9], [178, 0.5],
]
const ROCK_D = 300

export function drawBackdrop(g: Paint, air: Air): void {
  const ctx = g.ctx
  sky(g, air)
  for (let i = 0; i < RANGES.length; i++) {
    range(g, air, RANGES[i])
    if (i === 1) {
      // The rock stands between the far ranges and the near ones.
      const L = layer(g.view, ROCK_D)
      const hz = hazeAt(ROCK_D)
      poly(ctx, [...ROCK.map((p) => L.pt(p)), [L.x(178), g.view.y1 + 1], [L.x(30), g.view.y1 + 1]])
      fill(ctx, vgrad(ctx, L.y(-25), L.y(0), [[0, mix('#A86B44', air.haze, hz)], [1, mix('#7A4A2E', air.haze, hz * 1.02)]]))
    }
  }
}

/** The near sand across the whole frame, lit at its surface and going into its own shade below. */
export function drawGround(g: Paint, t: number, air: Air): void {
  const v = g.view
  const ctx = g.ctx
  const step = Math.max(0.15, 5 * g.px)
  const pts: Pt[] = []
  let top = Infinity
  for (let x = v.x0 - step; x <= v.x1 + step; x += step) {
    const y = ground(x, t)
    pts.push([x, y])
    top = Math.min(top, y)
  }
  if (top > v.y1) return
  poly(ctx, [...pts, [v.x1 + step, v.y1 + 1], [v.x0 - step, v.y1 + 1]])
  fill(ctx, vgrad(ctx, top, Math.max(top + 1, 6), [[0, mix(air.sand, '#FFFFFF', 0.06)], [0.35, air.sand], [1, air.shade]]))
  // The worm sign's own shade: the side of the swell away from the sun.
  const h = signH(t)
  if (h > 0.01) {
    const xw = signX(t)
    if (xw + 6 > v.x0 && xw - 14 < v.x1) {
      const lee: Pt[] = []
      for (let x = xw - 13; x <= xw + 0.01; x += 0.25) lee.push([x, ground(x, t)])
      const back = [...lee].reverse().map(([x, y]): Pt => [x, y + 0.5 + 0.35 * h])
      poly(ctx, [...lee, ...back])
      const gr = ctx.createLinearGradient(xw - 13, 0, xw, 0)
      gr.addColorStop(0, rgba(air.shade, 0))
      gr.addColorStop(0.65, rgba(air.shade, 0.3))
      gr.addColorStop(1, rgba(air.shade, 0.05))
      fill(ctx, gr)
      // Sand streaming back off its crest as it runs: a thin veil trailing east and settling.
      const cy = ground(xw, t)
      poly(ctx, [[xw - 1.5, cy + 0.2], [xw + 1, cy - 0.35 * h], [xw + 9, cy - 0.2 * h], [xw + 16, cy + 0.5], [xw + 6, cy + 0.6]])
      const st = ctx.createLinearGradient(xw - 1.5, 0, xw + 16, 0)
      st.addColorStop(0, rgba(air.sand, 0))
      st.addColorStop(0.15, rgba(mix(air.sand, '#FFFFFF', 0.12), 0.55 * Math.min(1, h)))
      st.addColorStop(1, rgba(air.sand, 0))
      fill(ctx, st)
    }
  }
  // The worm's shadow on the sand while it stands: from its base west as far as the sun throws it, its edge soft.
  const amt = shadowAt(t)
  if (amt > 0.002) {
    const edge = shadowEdge(t)
    const x1 = WORM.base + RADIUS + 1
    if (x1 > v.x0 && edge < v.x1) {
      const soft = 5
      ctx.save()
      poly(ctx, [...pts, [v.x1 + step, v.y1 + 1], [v.x0 - step, v.y1 + 1]])
      ctx.clip()
      // Strongest at the surface, going with the sand's face as it comes toward us; soft at both its ends.
      softBox(ctx, SHADOW, 0.34 * amt, { x0: edge - soft, y0: -4, x1, y1: 5 }, 2 * soft, 2.5, [[0, 1], [0.45, 1], [1, 0]])
      ctx.restore()
    }
  }
}

export const SHADOW = '#4A2C16'

/** How dark the worm's shadow is: it falls as the worm comes up, and goes as it bends away over the harvester. */
export const shadowAt = (t: number): number => smooth(t, T.rise, T.rise + 0.7) * (1 - smooth(t, T.over, T.down))

/** How far west the shadow reaches on the sand: the worm's height, thrown low by the afternoon sun. */
export const shadowEdge = (t: number): number => WORM.base - RADIUS - height(t) * 1.3

/** How far into the shadow a thing at `x` stands, 0 to 1. */
export function inShadow(t: number, x: number): number {
  const amt = shadowAt(t)
  if (amt <= 0) return 0
  const edge = shadowEdge(t)
  return amt * smooth(x, edge - 5, edge + 5) * (1 - smooth(x, WORM.base + RADIUS, WORM.base + RADIUS + 2))
}

/** The ornithopter's shadow on the sand under it while it flies low: a dark sliver along the surface. */
export function drawThopterShadow(g: Paint, t: number, at: Pt, len: number): void {
  const alt = ground(at[0], t) - at[1]
  if (alt > 26 || alt < 0.9) return
  const x = at[0] - 0.45 * alt
  const y = ground(x, t)
  const a = 0.26 * (1 - alt / 26)
  g.ctx.beginPath()
  g.ctx.ellipse(x, y + 0.08, len * (0.55 + alt / 40), 0.16, 0, 0, Math.PI * 2)
  fill(g.ctx, rgba(SHADOW, a))
}
