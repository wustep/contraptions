import type { Pt } from '../../../../../parts'
import { layer, sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { mix, vgrad, type Pen } from '../pen'
import { AY, BX0, BX1, LANTERN_DOWN, ROAD, T0 } from './geo'
import { drawFarFire, F, fireAt, fireLight } from './fire'
import { drawFarField } from './airfield'
import { bag, box, disc, fill, haze, loop, oval, poly, seg, stroke, wrap } from './ink'
import { drawLine, drawOverhead } from './line'
import { drawScud, gust } from './wind'

/**
 * New Jersey's night, behind the road: the sky (still stars, a low moon, clouds going over on the wind) and the
 * country going by under it in layers, each at its own speed as the camera rides with the cab (`depth.ts`): the city's
 * glow far behind them on the horizon, a far blue ridge, rolling hills with a farm's lit window and a car's lamps on a
 * far road and a train running beside them in the valley, nearer hills with their trees, and the black trees nearer
 * still. Once the barn is alight its fire warms all of it a little, the clouds' bellies too.
 *
 * Every light out here is the lit thing itself (a window, a lamp, a tail light), with no glow hung round it.
 *
 * Every layer is laid out against one height (`AY`) so that its horizon is where it should be whichever way the camera
 * goes up or down; `d` is how far off a layer is (`depth.ts`).
 */

export const N = {
  top: '#02050C',
  high: '#06101D',
  mid: '#0A1C29',
  low: '#0F2C31',
  horizon: '#163E3D',
  star: '#D8E6F2',
  moon: '#E8EAD8',
  moonShade: '#BCC5B8',
  cloud: '#0C1826',
  cloudLit: '#6A7F94',
  city: '#D9A65E',
  cityWin: '#EECD84',
  skyline: '#08111A',
  mast: '#E0342A',
  ridge: '#0D2230',
  ridgeRim: '#1D3B4A',
  hills: '#0A1B22',
  hillsRim: '#163440',
  near: '#071519',
  field: '#0B221F',
  fieldNear: '#05100E',
  trees: '#040A0C',
  treesFar: '#06110F',
  farm: '#F2C46A',
  lamp: '#FFF1C2',
  tail: '#D23A2A',
  mill: '#050B0E',
  rail: '#0F1D22',
  train: '#09121A',
  trainWin: '#F0D08A',
}

const ANCHOR: Pt = [0, AY]
/** The layers' depths: the sky; the city; the ridge; the hills; the near hills; the black trees; the windmill. */
const D_SKY = 0.03
const D_CITY = 0.1
const D_RIDGE = 0.2
const D_HILLS = 0.4
const D_NEAR = 0.6
const D_TREES = 0.7
const D_MILL = 0.9
/** Each layer's ground, where it meets the one in front (in its own cells). */
const RIDGE_BASE = ROAD - 1.3
const HILLS_BASE = ROAD - 1.08
const NEAR_BASE = ROAD - 0.82
const TREES_BASE = ROAD - 0.55

/** Where a point of a layer at depth `d` is in the world, with the camera at `f`. */
const worldX = (x: number, f: Frame, d: number): number => x + f.cx * (1 - d)

/** The barn's fire as it falls on something at world `x` (0 far, up to about 1.3 beside it). */
function fireOn(t: number, x: number, reach = 11): number {
  const l = fireLight(t)
  if (l <= 0) return 0
  const dx = (x - (BX0 + BX1) / 2) / reach
  return l * Math.exp(-dx * dx)
}

/* ------------------------------------------------------------------ the sky */

const MOON: Pt = [-2.3, AY - 1.95]

export function drawSky(pen: Pen, t: number, f: Frame): void {
  // The horizon, where the far ridge's foot is now.
  const horizon = RIDGE_BASE + (f.cy - AY) * (1 - D_RIDGE)
  const H = f.y1 - f.y0 + 2
  const stop = (y: number) => Math.max(0.02, Math.min(0.98, (y - f.y0 + 1) / H))
  vgrad(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, [
    [0, N.top, 1],
    [stop(horizon - 6.5), N.high, 1],
    [stop(horizon - 3.2), N.mid, 1],
    [stop(horizon - 1.1), N.low, 1],
    [stop(horizon + 0.05), N.horizon, 1],
    [1, N.horizon, 1],
  ])
  const span = f.y1 - f.y0
  layer(
    pen,
    f,
    D_SKY,
    (g) => {
      // The horizon in this layer's own cells.
      const hz = horizon - (f.cy - AY) * (1 - D_SKY)
      // Stars: still, each its own size and brightness, fewer down toward the horizon and round the moon.
      stars(pen, g, hz, span)
      // The moon, low over the hills, ahead of the cab: the disc and its seas, nothing round it.
      const m = bag()
      disc(m, MOON[0], MOON[1], 0.3)
      fill(pen, m, N.moon, 1)
      const maria = bag()
      disc(maria, MOON[0] + 0.09, MOON[1] - 0.06, 0.07)
      disc(maria, MOON[0] - 0.1, MOON[1] + 0.08, 0.05)
      disc(maria, MOON[0] + 0.02, MOON[1] + 0.13, 0.035)
      fill(pen, maria, N.moonShade, 1)
      clouds(pen, t, g, f)
      // A plane coming in to the airfield far off, its landing light on.
      landing(pen, t, g)
      // And earlier, high over the road, the airliner going their way (`line.ts`).
      drawOverhead(pen, t, g)
    },
    ANCHOR,
  )
  // The city, far behind them: its glow along the horizon, its towers small against it.
  layer(pen, f, D_CITY, (g) => city(pen, t, g), ANCHOR)
  // Under the high clouds, low scud going over faster on the wind.
  drawScud(pen, t, f)
}

/** The stars, scattered once over the sky's layer: where, how big, how bright, how dim round the moon. */
const STARS = Array.from({ length: 240 }, (_, i) => {
  const x = -12 + 28 * hash(i, 7, 1)
  const y = AY - 9.5 + 9.1 * hash(i, 7, 2)
  const dm = (x - MOON[0]) ** 2 + (y - MOON[1]) ** 2
  return { x, y, s: hash(i, 7, 3), b: 0.35 + 0.5 * hash(i, 7, 4), dim: 1 - 0.85 * Math.exp(-dm / 1.2) }
})
const STAR_STEPS = 5

function stars(pen: Pen, g: Frame, hz: number, span: number): void {
  const steps = Array.from({ length: STAR_STEPS }, bag)
  for (let i = 0; i < STARS.length; i++) {
    const st = STARS[i]
    if (st.x < g.x0 || st.x > g.x1 || st.y < g.y0 || st.y > hz - 0.3) continue
    const a = st.dim * smooth(hz - st.y, 0.3, 2.2) * st.b
    if (a < 0.05) continue
    disc(steps[Math.min(STAR_STEPS - 1, Math.floor(a * STAR_STEPS))], st.x, st.y, span * (0.0011 + 0.002 * st.s))
  }
  for (let b = 0; b < STAR_STEPS; b++) fill(pen, steps[b], N.star, 0.9 * ((b + 0.7) / STAR_STEPS))
}

/** Clouds in the sky's layer: how many, how far apart they come round, how fast the wind takes them. */
const CLOUDS = 24
const CLOUD_PERIOD = 36
const CLOUD_WIND = 0.07

function clouds(pen: Pen, t: number, g: Frame, f: Frame): void {
  const body = bag()
  const rimNear = bag()
  const rimFar = bag()
  const bellyNear = bag()
  const bellyFar = bag()
  const fire = fireAt(t)
  for (let i = 0; i < CLOUDS; i++) {
    const L = 1.6 + 3.0 * hash(i, 101)
    const Hc = 0.14 + 0.26 * hash(i, 102)
    let y = AY - 1.4 - 5.6 * hash(i, 103) ** 1.35
    // None lies across the moon for long: one at its height is lifted over it or let under it.
    if (Math.abs(y - MOON[1]) < Hc * 1.6 + 0.45) y += y < MOON[1] ? -0.75 : 0.75
    const x = wrap(-12 + hash(i, 104) * CLOUD_PERIOD + CLOUD_WIND * (0.7 + 0.6 * hash(i, 105)) * (t - T0), -12, CLOUD_PERIOD)
    if (x + L / 2 + 0.3 < g.x0 || x - L / 2 - 0.3 > g.x1 || y + Hc < g.y0 || y - Hc * 2 > g.y1) continue
    // A long lumpy top on a flattish base, drawn three times: a little up for the moonlit tops, a little down for the
    // fire-lit bellies, and the body over both.
    const pts: Pt[] = []
    const n = 9
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const lump = (0.3 + 0.7 * Math.sin(u * Math.PI) ** 0.7) * (0.45 + 0.55 * hash(i, j, 106))
      pts.push([x - L / 2 + L * u + (hash(i, j, 108) - 0.5) * 0.1, y - Hc * 1.8 * lump])
    }
    pts.push([x + L * 0.46, y + Hc * 0.12], [x + L * 0.1, y + Hc * 0.24], [x - L * 0.3, y + Hc * 0.2], [x - L * 0.47, y + Hc * 0.08])
    const dm = Math.hypot(x - MOON[0], y - MOON[1])
    loop(body, pts)
    loop(dm < 3.4 ? rimNear : rimFar, pts, 0, -0.045)
    if (fire > 0) {
      const near = Math.exp(-(((worldX(x, f, D_SKY) - (BX0 + BX1) / 2) / 14) ** 2))
      if (near > 0.2) loop(near > 0.55 ? bellyNear : bellyFar, pts, 0.02, 0.07)
    }
  }
  fill(pen, rimFar, N.cloudLit, 0.24)
  fill(pen, rimNear, N.cloudLit, 0.62)
  if (fire > 0) {
    // The fire on their bellies: a plain warm wash, low.
    const l = Math.min(1, fireLight(t))
    fill(pen, bellyFar, F.red, 0.18 * l)
    fill(pen, bellyNear, mix(F.red, F.gold, 0.15), 0.4 * l)
  }
  fill(pen, body, N.cloud, 0.94)
}

/** The plane coming in far off: from the upper right, down toward the airfield's runway, from just before it is seen. */
const LAND_FROM = 161
const LAND_TO = 181
function landing(pen: Pen, t: number, g: Frame): void {
  if (t < LAND_FROM || t > LAND_TO) return
  const u = (t - LAND_FROM) / (LAND_TO - LAND_FROM)
  const x = 13.4 - 6.4 * u
  const y = AY - 3.9 + 2.1 * u + 0.25 * u * u
  if (x < g.x0 - 1 || x > g.x1 + 1 || y < g.y0 - 1 || y > g.y1 + 1) return
  const on = smooth(t, LAND_FROM, LAND_FROM + 1.5)
  // Its landing light, a point; its red light, steady, small, just behind it.
  const c = bag()
  disc(c, x, y, 0.03)
  fill(pen, c, N.lamp, 0.9 * on)
  const b = bag()
  disc(b, x + 0.12, y - 0.04, 0.014)
  fill(pen, b, N.mast, 0.7 * on)
}

/** The city's towers, left to right: [x, width, height], from the city's middle, made once. */
const TOWERS: [number, number, number][] = Array.from({ length: 22 }, (_, i) => {
  const x = -1.25 + (2.5 * i) / 21 + (hash(i, 111) - 0.5) * 0.08
  const mid = 1 - Math.abs(x) / 1.4
  return [x, 0.07 + 0.09 * hash(i, 112), 0.1 + 0.42 * mid * (0.4 + 0.6 * hash(i, 113)) + (i === 11 ? 0.28 : 0)]
})
const CITY_X = -1.8

function city(pen: Pen, t: number, g: Frame): void {
  const base = RIDGE_BASE - 0.02
  if (CITY_X + 5 < g.x0 || CITY_X - 5 > g.x1) return
  haze(pen, [CITY_X, base - 0.15], 4.6, 1.3, N.city, 0.1)
  const towers = bag()
  const lit = bag()
  const s = (g.y1 - g.y0) * 0.0016
  for (const [i, [dx, w, h]] of TOWERS.entries()) {
    const x = CITY_X + dx
    box(towers, x - w / 2, base - h, x + w / 2, base + 0.1)
    // Windows: a few, coming on and going off as the night goes.
    for (let j = 0; j < 6; j++) {
      const wy = base - 0.05 - (h - 0.06) * hash(i, j, 114)
      const wx = x - w / 2 + 0.02 + (w - 0.04) * hash(i, j, 115)
      if (hash(i, j, Math.floor((t + 40 * hash(i, j, 116)) / 3.1)) < 0.45) continue
      box(lit, wx - s, wy - s, wx + s, wy + s)
    }
  }
  fill(pen, towers, N.skyline, 1)
  fill(pen, lit, N.cityWin, 0.85)
  // The tallest's mast, the red light on its top.
  const [mdx, , mh] = TOWERS[11]
  const top: Pt = [CITY_X + mdx, base - mh - 0.12]
  const mast = bag()
  box(mast, top[0] - 0.006, top[1], top[0] + 0.006, base - mh)
  fill(pen, mast, N.skyline, 1)
  const red = bag()
  disc(red, top[0], top[1], 0.018)
  fill(pen, red, N.mast, 0.85)
}

/* ------------------------------------------------------------------ the country */

/** The far ridge's height over its foot at `x`: low round the city, rolling away from it. */
const ridgeH = (x: number): number =>
  (0.25 + 0.75 * smooth(x, 1.5, 6.5)) * (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(0.33 * x + 0.4)) + 0.32 * (0.5 + 0.5 * Math.sin(0.91 * x + 1.3)) + 0.1 * Math.sin(2.3 * x))
const hillsH = (x: number): number => 0.12 + 0.55 * (0.5 + 0.5 * Math.sin(0.47 * x + 2.2)) + 0.22 * (0.5 + 0.5 * Math.sin(1.3 * x + 0.3))
const nearH = (x: number): number => 0.08 + 0.36 * (0.5 + 0.5 * Math.sin(0.61 * x + 0.9)) + 0.1 * Math.sin(1.7 * x + 0.4)

/** A range of hills from `base`, its top `h(x)`, filled over the frame `g`; its top edge lit in `rim` if given. */
function range(pen: Pen, g: Frame, base: number, h: (x: number) => number, col: string, rim: string | null, step: number): void {
  const x0 = Math.floor(g.x0 / step) * step - step
  const x1 = g.x1 + step
  const r = bag()
  const b = bag()
  r.moveTo(x0, g.y1 + 2)
  b.moveTo(x0, g.y1 + 2)
  for (let x = x0; x <= x1; x += step) {
    const y = base - h(x)
    r.lineTo(x, y - 0.035)
    b.lineTo(x, y)
  }
  r.lineTo(x1, g.y1 + 2)
  b.lineTo(x1, g.y1 + 2)
  r.closePath()
  b.closePath()
  if (rim) fill(pen, r, rim, 1)
  fill(pen, b, col, 1)
}

export function drawFar(pen: Pen, t: number, f: Frame): void {
  const fire = fireAt(t)
  // The far ridge, blue with the distance, its crest catching the moon.
  layer(pen, f, D_RIDGE, (g) => range(pen, g, RIDGE_BASE, ridgeH, mix(N.ridge, F.red, 0.12 * fire), N.ridgeRim, 0.45), ANCHOR)
  // The hills: a farm's lit window on them, a car's lamps on a road over them, a train down in the valley.
  layer(
    pen,
    f,
    D_HILLS,
    (g) => {
      range(pen, g, HILLS_BASE, hillsH, mix(N.hills, F.red, 0.1 * fire), N.hillsRim, 0.35)
      farms(pen, t, g)
      cars(pen, t, g)
      train(pen, t, g)
    },
    ANCHOR,
  )
  // The barn's fire, seen low across the field from the airfield.
  drawFarFire(pen, t, f, 0.3, ANCHOR, HILLS_BASE - 0.02)
  // The near hills and their trees, and the fields down to the road.
  layer(
    pen,
    f,
    D_NEAR,
    (g) => {
      range(pen, g, NEAR_BASE, nearH, mix(N.near, F.red, 0.12 * fire), null, 0.3)
      hedges(pen, t, g)
      vgrad(pen, g.x0 - 1, NEAR_BASE - 0.05, g.x1 + 1, g.y1 + 2, [
        [0, mix(N.field, F.red, 0.1 * fire), 1],
        [1, N.fieldNear, 1],
      ])
    },
    ANCHOR,
  )
  // A telegraph line going along beyond the fence while they drive (`line.ts`).
  drawLine(pen, t, f)
  // The airfield's far side, out on the flat beyond the field: hangars, the tower, the beacon, the far runway, a plane
  // taxiing out.
  drawFarField(pen, t, f)
  // The black trees at a middle distance, swaying, lit on one side by the fire.
  layer(pen, f, D_TREES, (g) => trees(pen, t, g, f), ANCHOR)
  // The farm's windmill out in the field, its wheel going round in the wind that lays the smoke over.
  layer(pen, f, D_MILL, (g) => windmill(pen, t, g, f), ANCHOR)
}

/** Farms on the hills, every so far: a house's dark shape, a lit window or two, a barn, a silo. */
function farms(pen: Pen, t: number, g: Frame): void {
  const dark = bag()
  const lit = bag()
  for (let i = Math.floor(g.x0 / 9) - 1; i <= Math.ceil(g.x1 / 9) + 1; i++) {
    if (hash(i, 121) > 0.7) continue
    const x = i * 9 + 3 + 3 * hash(i, 122)
    const y = HILLS_BASE - hillsH(x) * 0.7 + 0.05
    box(dark, x - 0.2, y - 0.16, x + 0.2, y + 0.06)
    poly(dark, [[x - 0.24, y - 0.15], [x, y - 0.3], [x + 0.24, y - 0.15]])
    if (hash(i, 123) > 0.4) {
      box(dark, x + 0.35, y - 0.22, x + 0.62, y + 0.06)
      box(dark, x + 0.7, y - 0.42, x + 0.8, y + 0.06)
      disc(dark, x + 0.75, y - 0.42, 0.05)
    }
    const on = hash(i, Math.floor((t + 20 * hash(i, 124)) / 5), 125) > 0.15
    if (on) box(lit, x - 0.12, y - 0.1, x - 0.05, y - 0.03)
    if (hash(i, 126) > 0.5) box(lit, x + 0.06, y - 0.1, x + 0.13, y - 0.03)
  }
  fill(pen, dark, N.treesFar, 1)
  fill(pen, lit, N.farm, 0.9)
}

/** Cars on a road over the hills, far off: one coming, lamps first, one going, its tail lights red. */
function cars(pen: Pen, t: number, g: Frame): void {
  for (let i = 0; i < 2; i++) {
    const dir = i === 0 ? -1 : 1
    const x = wrap(10 + 17 * i + dir * 1.3 * (t - T0), -8, 44)
    if (x < g.x0 - 1 || x > g.x1 + 1) continue
    const y = HILLS_BASE - hillsH(x) * 0.42
    const c = bag()
    if (dir < 0) {
      disc(c, x - 0.05, y, 0.016)
      disc(c, x - 0.1, y + 0.005, 0.016)
      fill(pen, c, N.lamp, 0.9)
    } else {
      disc(c, x, y, 0.012)
      disc(c, x + 0.05, y, 0.012)
      fill(pen, c, N.tail, 0.9)
    }
  }
}

/** The train: down in the valley under the hills, running beside the road the same way, a while after the guitar comes in. */
const TRAIN_CARS = 7
const TRAIN_V = 2.2
const TRAIN_X0 = -0.8
function train(pen: Pen, t: number, g: Frame): void {
  const head = TRAIN_X0 + TRAIN_V * (t - T0)
  const tail = head - TRAIN_CARS * 0.62
  const y = HILLS_BASE - 0.04
  // The line: a faint rail along the valley floor.
  const rail = bag()
  box(rail, g.x0 - 1, y + 0.01, g.x1 + 1, y + 0.025)
  fill(pen, rail, N.rail, 1)
  if (head + 3 < g.x0 || tail > g.x1 + 1 || t > LANTERN_DOWN + 4) return
  const body = bag()
  const win = bag()
  for (let c = 0; c < TRAIN_CARS; c++) {
    const x1 = head - c * 0.62
    const x0 = x1 - 0.56
    if (c === 0) poly(body, [[x0, y], [x0, y - 0.15], [x1 - 0.08, y - 0.15], [x1, y - 0.07], [x1, y]])
    else box(body, x0, y - 0.13, x1, y)
    if (c === 0) continue
    for (let w = 0; w < 5; w++) {
      if (hash(c, w, 131) < 0.2) continue
      const wx = x0 + 0.05 + w * 0.1
      box(win, wx, y - 0.1, wx + 0.06, y - 0.06)
    }
  }
  fill(pen, body, N.train, 1)
  fill(pen, win, N.trainWin, 0.9)
  // Its headlamp, on the engine's nose.
  const lamp = bag()
  disc(lamp, head - 0.02, y - 0.09, 0.022)
  fill(pen, lamp, N.lamp, 0.95)
}

/** Hedgerows and clumps of trees along the near hills, and a farm's light here and there among them. */
function hedges(pen: Pen, t: number, g: Frame): void {
  const dark = bag()
  const lights: Pt[] = []
  for (let i = Math.floor(g.x0 / 1.1) - 2; i <= Math.ceil(g.x1 / 1.1) + 2; i++) {
    if (hash(i, 141) > 0.55) continue
    const x = i * 1.1 + 0.5 * hash(i, 142)
    const y = NEAR_BASE - nearH(x) + 0.04
    const r = 0.14 + 0.16 * hash(i, 143)
    const lean = 0.03 * sway(t, i, 5)
    disc(dark, x + lean, y - r * 0.9, r)
    disc(dark, x + r * 0.7 + lean, y - r * 0.6, r * 0.8)
    disc(dark, x - r * 0.7 + lean, y - r * 0.5, r * 0.7)
    if (hash(i, 144) < 0.12) lights.push([x + r * 1.4, y - 0.08])
  }
  fill(pen, dark, N.treesFar, 1)
  const c = bag()
  for (const p of lights) {
    if (p[0] < g.x0 || p[0] > g.x1) continue
    // A farm's porch light, now and then gone a moment as someone passes in front of it.
    if (hash(Math.round(p[0] * 7), Math.floor(t / 2.3), 145) < 0.12) continue
    disc(c, p[0], p[1], 0.024)
  }
  fill(pen, c, N.farm, 0.9)
}

/** The black trees at a middle distance: trunks and heaps of round crowns, swaying; lit by the fire on its side. */
function trees(pen: Pen, t: number, g: Frame, f: Frame): void {
  const dark = bag()
  const rimHot = bag()
  const rimWarm = bag()
  const fire = fireAt(t)
  for (let i = Math.floor(g.x0 / 2.6) - 2; i <= Math.ceil(g.x1 / 2.6) + 2; i++) {
    if (hash(i, 31) > 0.5 || hash(i, 34) > 0.8) continue
    const x = i * 2.6 + hash(i, 32)
    const h = 1.0 + hash(i, 33) * 1.05
    const wx = worldX(x, f, D_TREES)
    // Laid over downwind, harder in the gusts, and tossing.
    const g0 = gust(t)
    const lean = h * (0.045 * (g0 - 0.55) + 0.075 * g0 * sway(t, i, 3.6))
    const crowns = (path: Path2D, dx: number, dy: number, grow: number) => {
      box(path, x - 0.04 * h + dx, TREES_BASE - h * 0.45 + dy, x + 0.04 * h + dx, TREES_BASE)
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2 + i
        const r = h * (0.22 + 0.08 * hash(i, j, 5)) + grow
        disc(path, x + Math.cos(a) * h * 0.18 + lean * (0.6 + 0.2 * j / 5) + dx, TREES_BASE - h * 0.62 + Math.sin(a) * h * 0.16 + dy, r)
      }
      disc(path, x + lean + dx, TREES_BASE - h * 0.85 + dy, h * 0.2 + grow)
    }
    if (fire > 0) {
      const lit = fireOn(t, wx, 9)
      if (lit > 0.08) {
        // Toward the fire.
        const toward = wx > (BX0 + BX1) / 2 ? -1 : 1
        crowns(lit > 0.45 ? rimHot : rimWarm, toward * 0.09, 0.015, 0)
      }
    }
    crowns(dark, 0, 0, 0)
  }
  if (fire > 0) {
    const l = Math.min(1, fireLight(t))
    fill(pen, rimWarm, F.red, 0.42 * l)
    fill(pen, rimHot, mix(F.red, F.gold, 0.3), 0.62 * l)
  }
  fill(pen, dark, N.trees, 1)
}

/** The windmill: where it stands in its layer, its height, its wheel's radius. */
const MILL_X = 46.4
const MILL_BASE = ROAD - 0.47
const MILL_H = 3.1
const MILL_R = 0.56

/**
 * A farm's windmill out on the field beyond the barn: a lattice tower, the many-bladed wheel turned three-quarters to
 * us and going round in the wind, the vane streaming off downwind. Seen from the barn's fire on, lit on its side by it.
 */
function windmill(pen: Pen, t: number, g: Frame, f: Frame): void {
  if (MILL_X + 2 < g.x0 || MILL_X - 2 > g.x1) return
  const top = MILL_BASE - MILL_H
  const lat = bag()
  seg(lat, MILL_X - 0.55, MILL_BASE, MILL_X - 0.1, top + 0.2)
  seg(lat, MILL_X + 0.55, MILL_BASE, MILL_X + 0.1, top + 0.2)
  for (let k = 0; k < 7; k++) {
    const u0 = k / 7
    const u1 = (k + 1) / 7
    const w0 = 0.55 - 0.45 * u0
    const w1 = 0.55 - 0.45 * u1
    const y0 = MILL_BASE - (MILL_H - 0.2) * u0
    const y1 = MILL_BASE - (MILL_H - 0.2) * u1
    seg(lat, MILL_X - w0, y0, MILL_X + w1, y1)
    seg(lat, MILL_X + w0, y0, MILL_X - w1, y1)
    seg(lat, MILL_X - w1, y1, MILL_X + w1, y1)
  }
  // The vane, off downwind (to the right), swinging a little with the gusts.
  const va = -0.05 + 0.08 * sway(t, 4, 1.7)
  const hub: Pt = [MILL_X + 0.05, top]
  const tail: Pt = [hub[0] + 1.25 * Math.cos(va), hub[1] + 1.25 * Math.sin(va)]
  seg(lat, hub[0], hub[1], tail[0], tail[1])
  const body = bag()
  poly(body, [[tail[0] - 0.05, tail[1] - 0.32], [tail[0] + 0.5, tail[1] - 0.22], [tail[0] + 0.5, tail[1] + 0.2], [tail[0] - 0.05, tail[1] + 0.12]])
  box(body, hub[0] - 0.12, hub[1] - 0.08, hub[0] + 0.22, hub[1] + 0.08)
  // The wheel: its blades going round, turned three-quarters to us, so its rim is an ellipse.
  const spin = 2.3 * t + 0.7 * sway(t, 9, 3.1)
  const wc: Pt = [hub[0] - 0.2, hub[1]]
  const rx = MILL_R * 0.42
  for (let b = 0; b < 16; b++) {
    const a = spin + (b / 16) * Math.PI * 2
    const a2 = a + 0.13
    poly(body, [
      [wc[0] + Math.cos(a) * rx * 0.25, wc[1] + Math.sin(a) * MILL_R * 0.25],
      [wc[0] + Math.cos(a) * rx, wc[1] + Math.sin(a) * MILL_R],
      [wc[0] + Math.cos(a2) * rx, wc[1] + Math.sin(a2) * MILL_R],
      [wc[0] + Math.cos(a2) * rx * 0.25, wc[1] + Math.sin(a2) * MILL_R * 0.25],
    ])
  }
  const fire = fireAt(t)
  if (fire > 0) {
    const lit = fireOn(t, worldX(MILL_X, f, D_MILL), 12)
    if (lit > 0.05) {
      const rim = bag()
      seg(rim, MILL_X - 0.57, MILL_BASE, MILL_X - 0.12, top + 0.2)
      stroke(pen, rim, mix(F.red, F.gold, 0.25), Math.min(1, lit), 1.4)
    }
  }
  stroke(pen, lat, N.mill, 1, 0.8)
  fill(pen, body, N.mill, 1)
  const ring = bag()
  oval(ring, wc[0], wc[1], rx, MILL_R)
  stroke(pen, ring, N.mill, 1, 0.9)
}
