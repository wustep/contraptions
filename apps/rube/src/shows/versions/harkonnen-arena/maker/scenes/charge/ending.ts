import { R } from '../../../../../../parts'
import { composed, mix, smooth, type Brush, type Pt } from '../../paint'
import type { Move } from '../../motion'
import { B, TO } from './plan'
import { sandAt } from './storm'

/**
 * The last image: the evening after the storm, on a dune above the field.
 *
 * Paul stands on its crest in the right-hand third, near, against the low sky. Its long lit slope runs away from him to
 * the west, its ridge going down into the distance, and Chani walks down it alone toward the low sun, smaller and
 * smaller, and on across the flat beyond. Out on the flat to the east the worms' long trails run away to the horizon,
 * where far off the great ship lies on its side, a dark shape on the skyline. The sky over it all is clean for the credits.
 *
 * The camera draws back very slowly about him and comes to rest. Everything far (the horizon, the trails, the ship) is
 * placed as shares of the composed frame, so it stays where it is as the near dune draws back, as through a lens.
 */

/** Where it is: a dune of its own, west of the field (nothing of the battle is in this frame). */
export const CREST: Pt = [8700, -2.0]

/** The camera: about Paul, him at these shares of the frame, drawn back from START to REST cells. */
const AT: Pt = [0.7, 0.56]
const START = 5.8
const REST = 7.4
const paulBall: Pt = [CREST[0], CREST[1] - R]

/** The frame's middle for a frame `cells` high, with Paul at AT. */
const middle = (cells: number): Pt => [paulBall[0] - (AT[0] - 0.5) * cells * (16 / 9), paulBall[1] - (AT[1] - 0.5) * cells]

/** The shots: a cut on the last beat, then slower and slower back, still at the end. */
export const ENDING_SHOTS = [
  { t: B.last, cut: true, cells: START, at: middle(START) },
  { t: 330, cells: 6.85, at: middle(6.85) },
  { t: 340, cells: 7.32, at: middle(7.32) },
  { t: TO, cells: REST, at: middle(REST) },
]

/** A point in the frame at rest, as shares, to world cells. */
function atRest(sx: number, sy: number): Pt {
  const [cx, cy] = middle(REST)
  return [cx + (sx - 0.5) * REST * (16 / 9), cy + (sy - 0.5) * REST]
}

/** The ridge, from the crest down into the distance to where it meets the flat (`u` 0 to 1), and on to the frame's edge. */
const FAR_END = atRest(0.15, 0.72)
export function ridge(u: number): Pt {
  const x = CREST[0] + (FAR_END[0] - CREST[0]) * u
  const y = CREST[1] + (FAR_END[1] - CREST[1]) * Math.pow(Math.max(0, u), 1.35)
  return [x, y]
}
/** Where Chani goes to, out on the flat under the sun. */
const AWAY = atRest(0.215, 0.652)

/** When she sets off, and when she is down off the ridge onto the flat. */
export const CHANI_GOES = 321.6
const OFF_RIDGE = 334.4
const GONE = TO - 1.4

/**
 * Chani in the last image: beside him on the crest, then down the ridge and away across the flat, smaller as she goes
 * (she is walking away from us: a ball does not grow less, but the distance does).
 */
export function chaniEnding(size: number): Move[] {
  const startU = 0.16
  const on = (u: number, s: number): Pt => {
    const [x, y] = ridge(u)
    return [x, y - R * s]
  }
  const scaleOnRidge = (u: number) => 1 - 0.48 * Math.pow((u - startU) / (1 - startU), 1.3)
  const down = (t: number) => smooth(t, CHANI_GOES, OFF_RIDGE)
  const across = (t: number) => {
    const u = Math.max(0, Math.min(1, (t - OFF_RIDGE) / (GONE - OFF_RIDGE)))
    return u * u * (3 - 2 * u) * 0.35 + u * 0.65
  }
  const s1 = scaleOnRidge(1)
  return [
    { t0: B.last, t1: CHANI_GOES, kind: 'hold', at: () => on(startU, size), look: 0.1 },
    {
      t0: CHANI_GOES,
      t1: OFF_RIDGE,
      kind: 'roll',
      at: (t) => {
        const u = startU + (1 - startU) * down(t)
        return on(u, size * scaleOnRidge(u))
      },
      scale: (t) => scaleOnRidge(startU + (1 - startU) * down(t)),
    },
    {
      t0: OFF_RIDGE,
      t1: GONE,
      kind: 'roll',
      at: (t) => {
        const v = across(t)
        const s = s1 + (0.2 - s1) * v
        const [fx, fy] = FAR_END
        return [fx + (AWAY[0] - fx) * v, fy + (AWAY[1] - fy) * v - R * size * s]
      },
      scale: (t) => s1 + (0.2 - s1) * across(t),
    },
    { t0: GONE, t1: TO, kind: 'hold', at: () => [AWAY[0], AWAY[1] - R * size * 0.2], scale: () => 0.2, look: Math.PI },
  ]
}

/** Paul in the last image: on the crest. He looks east over the field, and when she has gone a little way, after her. */
export const PAUL_TURNS = 327.5
export const paulEnding: Move[] = [
  { t0: B.last, t1: PAUL_TURNS, kind: 'hold', at: () => paulBall, look: -0.08 },
  { t0: PAUL_TURNS, t1: TO, kind: 'hold', at: () => paulBall, look: Math.PI - 0.25 },
]

/** A point of the composed frame, as shares, to world cells in this frame. */
function share(b: Brush, sx: number, sy: number): Pt {
  const f = composed(b.view)
  return [f.cx + (sx - 0.5) * f.h * (16 / 9), f.cy + (sy - 0.5) * f.h]
}

/**
 * The worms' trails: long furrows across the flat east of the dune, running away to the horizon where the great ship
 * lies. Shares of the frame: near end, far end, width.
 */
const TRAILS: [Pt, Pt, number][] = [
  [[1.08, 0.83], [0.862, 0.643], 0.02],
  [[1.08, 0.715], [0.905, 0.643], 0.013],
]

function paintTrails(b: Brush, sand: { lit: string; shade: string; far: string }): void {
  const { ctx } = b
  const f = composed(b.view)
  for (const [near, far, w] of TRAILS) {
    const a = share(b, near[0], near[1])
    const c = share(b, far[0], far[1])
    // A slow curve: it bows a little toward us on its way out.
    const m = share(b, (near[0] + far[0]) / 2 - 0.03, (near[1] + far[1]) / 2 + 0.02)
    const wide = w * f.h
    // The furrow: the shadow in it, wide near, to nothing at the horizon; and the lit lip on its sunward side.
    ctx.beginPath()
    ctx.moveTo(a[0], a[1] - wide)
    ctx.quadraticCurveTo(m[0], m[1] - wide * 0.45, c[0], c[1])
    ctx.quadraticCurveTo(m[0], m[1] + wide * 0.45, a[0], a[1] + wide)
    ctx.closePath()
    ctx.fillStyle = b.ca(sand.shade, 0.32)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(a[0], a[1] - wide)
    ctx.quadraticCurveTo(m[0], m[1] - wide * 0.45, c[0], c[1])
    ctx.quadraticCurveTo(m[0], m[1] - wide * 0.2, a[0], a[1] - wide * 0.45)
    ctx.closePath()
    ctx.fillStyle = b.ca('#F3C48E', 0.55)
    ctx.fill()
  }
}

/** The great ship, far off on the skyline in the east, on its side: a small dark shape, a little into the haze. */
function paintFarShip(b: Brush, air: string): void {
  const { ctx } = b
  const f = composed(b.view)
  const [x, y] = share(b, 0.885, 0.64)
  const h = f.h * 0.024
  const w = h * 2.1
  const hull = mix('#1E1915', air, 0.28)
  ctx.beginPath()
  ctx.ellipse(x, y - h * 0.5, w * 0.5, h * 0.5, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.c(hull)
  ctx.fill()
  // Its plinth, torn up with it, stood on end at its western end.
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, y - h * 0.15)
  ctx.lineTo(x - w * 0.62, y - h * 0.05)
  ctx.lineTo(x - w * 0.62, y - h * 0.95)
  ctx.lineTo(x - w * 0.5, y - h * 0.85)
  ctx.closePath()
  ctx.fill()
}

/** The dune: its long lit slope down the ridge to the west, its east face turned from the sun. */
function paintDune(b: Brush, sand: { lit: string; shade: string; far: string }): void {
  const { ctx, view } = b
  const bottom = view.y1 + 1
  const n = 40
  // The east silhouette: down from the crest, steeper, to the frame's edge.
  const eastAt = (x: number) => CREST[1] + 0.62 * Math.pow(Math.max(0, x - CREST[0]), 1.12)
  ctx.beginPath()
  ctx.moveTo(view.x0 - 2, bottom)
  // West of the ridge's far end the dune goes on down out of the frame.
  const fe = ridge(1)
  ctx.lineTo(view.x0 - 2, fe[1] + (fe[0] - (view.x0 - 2)) * 0.18)
  ctx.lineTo(fe[0], fe[1])
  for (let i = n; i >= 0; i--) {
    const [x, y] = ridge(i / n)
    ctx.lineTo(x, y)
  }
  for (let i = 1; i <= n; i++) {
    const x = CREST[0] + ((view.x1 + 2 - CREST[0]) * i) / n
    ctx.lineTo(x, eastAt(x))
  }
  ctx.lineTo(view.x1 + 2, bottom)
  ctx.closePath()
  // The slope takes the low sun: the palest sand in the picture, warmer near.
  const gr = ctx.createLinearGradient(0, CREST[1], 0, bottom)
  gr.addColorStop(0, b.c(mix(sand.lit, '#F2BE84', 0.7)))
  gr.addColorStop(1, b.c(mix(sand.lit, '#E6A86C', 0.5)))
  ctx.fillStyle = gr
  ctx.fill()
  // The east face: from the crest down, the shadow under the terminator.
  ctx.beginPath()
  ctx.moveTo(CREST[0] + 0.02, CREST[1] + 0.01)
  for (let i = 1; i <= n; i++) {
    const x = CREST[0] + ((view.x1 + 2 - CREST[0]) * i) / n
    ctx.lineTo(x, eastAt(x))
  }
  ctx.lineTo(view.x1 + 2, bottom)
  ctx.lineTo(CREST[0] + 2.6, bottom)
  ctx.quadraticCurveTo(CREST[0] + 0.9, CREST[1] + 1.4, CREST[0] + 0.02, CREST[1] + 0.01)
  ctx.closePath()
  ctx.fillStyle = b.ca(sand.shade, 0.55)
  ctx.fill()
}

/** The last image's own things, over the sky and the far flat. */
export function paintEnding(b: Brush, air: string): void {
  if (b.t < B.last) return
  const sand = sandAt(b.t)
  paintTrails(b, sand)
  paintFarShip(b, air)
  paintDune(b, sand)
}
