import { blob, clamp01, mix, poly, rgba, smooth, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { skyAt } from '../../world/sky'
import { boulderAt, boulderTurn } from './giant'
import { BACK, BOULDER_R, CAVE, EAST, FIRE, FLOOR, LEDGE, MOUTH, PILLAR, PIVOT, RIDGE, SHELF, STEP, T, WEST } from './plan'

/**
 * The island and its cave. Outside: a headland of black rock under a cap of green turf, a bare crag over the mouth and
 * its east shoulder breaking down in steps; lit on the face to the morning sun, in its own shade on the far flank, two
 * clefts down the face between, and its foot dark where the sea wets it; a shelf of rock up from the water to the
 * mouth. Inside, while the camera is in it: the
 * cave cut open (its rock's cut edge a lighter rim), his fire, his club over its stone, the heap of rock at the back,
 * and the dark, lifted only where the mouth's daylight and the fire's light fall, as flat shapes.
 */

export const INK = '#15181C'
const ROCK = '#3A3C3C'
const ROCK_DARK = '#2D2F30'
const ROCK_LIT = '#4A4B48'
const WET = '#262A2B'
const CUT = '#5E5B53'
const WALL = '#2A2421'
const WALL_DARK = '#221D1B'
const FLOOR_C = '#3B332C'
const TURF = '#66714A'
const TURF_HI = '#7E885D'
const MOUTH_DARK = '#1A1715'
const SECTION = '#302F2D'
export const BOULDER = '#3F3D3A'
const NIGHT = '#0C0A09'
export const EMBER = '#E07A2E'
const FLAME = ['#B4501E', '#E0893A', '#F3C770']
export const FIRELIT = '#C8723A'

/** Whether the cave is cut open at `t`: from the cut that takes the camera in to the one that takes it out. */
export const openAt = (t: number): boolean => t >= T.cutIn && t < T.cutOut

/** The island's outline, west at the waterline up over the crag and the ridge to the east, and down under the water. */
const OUTLINE: Pt[] = [
  [WEST - 0.4, 0.5],
  [WEST, 0.1],
  [93.6, -0.62],
  [94.15, -1.05],
  [93.85, -3.4],
  [94.35, -6.6],
  [94.7, -9.4],
  [95.5, -11.6],
  [96.4, -12.6],
  [97.3, -13.0],
  // The crag over the mouth, bare of turf.
  [97.9, -14.6],
  [98.9, -15.7],
  [100.1, -15.5],
  [100.9, -14.9],
  [103.0, -15.3],
  [107.2, -16.95],
  [112.2, -17.75],
  RIDGE,
  [121, -17.4],
  // The east shoulder, breaking down in two steps.
  [124.2, -16.3],
  [125.4, -15.1],
  [128.6, -14.4],
  [131.2, -11.4],
  [132.4, -10.6],
  [135.0, -7.6],
  [137.6, -4.45],
  [139.8, -1.35],
  [EAST, 0.25],
  [EAST + 0.4, 3],
  [WEST - 0.4, 3],
]

/** The turf: a cap along the top from behind the crag round to the east slope. */
const TURF_LINE: Pt[] = OUTLINE.filter(([x, y]) => x >= 100.9 && x <= 139.8 && y < 0)

/** The face turned to the morning sun, from the west cliff up the crag. */
const LIT: Pt[] = [[93.85, -3.4], [94.35, -6.6], [94.7, -9.4], [95.5, -11.6], [96.4, -12.6], [97.3, -13.0], [97.9, -14.6], [98.9, -15.7], [99.5, -14.1], [98.7, -11.9], [99.1, -9.1], [98.2, -6.8], [98.0, -2.6], [94.6, -0.9]]

/** The far flank in its own shade, from just past the ridge down to the east foot. */
const SHADE: Pt[] = [[121, -17.4], [124.2, -16.3], [125.4, -15.1], [128.6, -14.4], [131.2, -11.4], [132.4, -10.6], [135.0, -7.6], [137.6, -4.45], [139.8, -1.35], [EAST, 0.25], [EAST, 1], [121.4, 1], [122.0, -4.2], [120.4, -8.6], [121.2, -12.8], [119.6, -16.2]]

/** Two clefts down the face: narrow under the turf, opening to the water. */
const CLEFTS: Pt[][] = [
  [[103.3, -15.6], [103.9, -13.0], [103.5, -9.6], [104.3, -5.8], [103.9, -2.2], [104.6, 1], [106.4, 1], [105.6, -3.0], [105.9, -7.2], [104.8, -10.8], [104.5, -14.0]],
  [[114.0, -17.4], [114.6, -14.2], [113.9, -10.4], [114.8, -6.4], [114.4, -2.6], [115.4, 1], [117.6, 1], [116.6, -3.2], [116.8, -8.0], [115.6, -12.4], [115.0, -16.0]],
]

/** The fire's strength: embers until he stirs it, a blaze while he is awake and asleep, lower after the blow. */
export function fireAt(t: number): number {
  return 0.16 + 0.84 * smooth(t, T.flare - 0.1, T.flare + 0.5) - 0.3 * smooth(t, T.strike, T.strike + 1.5)
}

/** How far the mouth is open to the day: by where the boulder is. */
function gapAt(t: number): number {
  const b = boulderAt(t)
  return clamp01((96.6 - b[0]) / (96.6 - 94.0))
}

/**
 * The way through the west wall, from the cave's roof at its inner edge out to the mouth: a throat whose roof comes
 * down towards the day, rounded at the outer lip, so it is rock and not a door's lintel.
 */
function throat(ctx: CanvasRenderingContext2D): void {
  ctx.lineTo(MOUTH.x1, MOUTH.top)
  ctx.quadraticCurveTo(MOUTH.x0 + 0.2, MOUTH.top - 0.05, MOUTH.x0, MOUTH.top + 0.75)
}

/** The inside of the cave and the way through its west wall, as one outline (two would cancel where they overlap). */
function inCave(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath()
  ctx.moveTo(MOUTH.x0, FLOOR)
  CAVE.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
  throat(ctx)
  ctx.closePath()
}

export function drawIsland(g: Paint, t: number, inside: () => void): void {
  const { ctx, view } = g
  if (view.x1 < WEST - 3 || view.x0 > EAST + 3) return
  const sky = skyAt(t)
  const air = (c: string, f: number) => mix(c, sky.low, f)
  // The rock, and its planes as the light falls on them: a few big shapes, not a pattern of lines.
  poly(ctx, OUTLINE)
  ctx.fillStyle = air(ROCK, 0.06)
  ctx.fill()
  ctx.save()
  poly(ctx, OUTLINE)
  ctx.clip()
  poly(ctx, LIT)
  ctx.fillStyle = air(ROCK_LIT, 0.05)
  ctx.fill()
  ctx.fillStyle = air(ROCK_DARK, 0.04)
  for (const c of [SHADE, ...CLEFTS]) {
    poly(ctx, c)
    ctx.fill()
  }
  // Its foot, dark where the sea wets it.
  ctx.beginPath()
  ctx.moveTo(WEST, -0.5)
  for (let x = WEST; x <= EAST + 0.01; x += 1.5) ctx.lineTo(x, -0.55 - 0.12 * Math.sin(x * 0.9))
  ctx.lineTo(EAST, 1)
  ctx.lineTo(WEST, 1)
  ctx.closePath()
  ctx.fillStyle = air(WET, 0.04)
  ctx.fill()
  ctx.restore()
  // The turf over the top: a cap with a lighter crown.
  const top = TURF_LINE
  const under = [...top].reverse().map(([x, y], i, a): Pt => {
    const f = Math.min(i, a.length - 1 - i) / (a.length / 2)
    return [x + (i < a.length / 2 ? -0.2 : 0.2), y + 0.55 + 0.6 * f]
  })
  blob(ctx, [...top, ...under])
  ctx.fillStyle = air(TURF, 0.08)
  ctx.fill()
  stroke(g, air(INK, 0.15), 2.2)
  ctx.beginPath()
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.12) : ctx.moveTo(x, y + 0.12)))
  stroke(g, air(TURF_HI, 0.05), 3.2)
  // The outline.
  ctx.beginPath()
  OUTLINE.slice(0, OUTLINE.length - 2).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  stroke(g, INK, 2.6)
  if (!openAt(t)) drawFace(g)
  else {
    drawInside(g, t)
    inside()
  }
  drawBoulder(g, t)
  // The shelf, in front of the face, up to the mouth.
  poly(ctx, [...SHELF, [MOUTH.x1, FLOOR], [MOUTH.x1, FLOOR + 0.35], [96.6, FLOOR + 0.5], [94.6, -0.9], [WEST - 0.2, 0.7]])
  ctx.fillStyle = air(mix(ROCK, ROCK_LIT, 0.55), 0.04)
  ctx.fill()
  ctx.beginPath()
  SHELF.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.lineTo(MOUTH.x1, FLOOR)
  stroke(g, INK, 2.4)
}

/** The face over the cave, as it is from outside: the island's own rock, drawn already, and the mouth's dark arch. */
function drawFace(g: Paint): void {
  const { ctx } = g
  // The mouth: an arch of dark in the face.
  ctx.beginPath()
  ctx.moveTo(MOUTH.x0, FLOOR + 0.25)
  ctx.lineTo(MOUTH.x0, MOUTH.top + 1)
  ctx.quadraticCurveTo(MOUTH.x0 + 0.1, MOUTH.top - 0.05, (MOUTH.x0 + MOUTH.x1) / 2, MOUTH.top - 0.1)
  ctx.quadraticCurveTo(MOUTH.x1 - 0.1, MOUTH.top - 0.05, MOUTH.x1, MOUTH.top + 1)
  ctx.lineTo(MOUTH.x1, FLOOR)
  ctx.closePath()
  ctx.fillStyle = MOUTH_DARK
  ctx.fill()
  stroke(g, INK, 2.4)
}

/**
 * How dim the cave is at `t`: 0 while the day comes in at the door, 1 once the boulder is in, and partly lifted again
 * once it is ground out. The cave's own colours go down to the dark by it; the balls do not, so the men are always read.
 */
export function dimAt(t: number): number {
  return smooth(t, T.shut - 0.6, T.shut + 0.15) * (1 - 0.55 * smooth(t, T.open, T.open + 1.4))
}

/**
 * Inside: the far wall and floor, lit as the light falls on them: the day in a pale wedge from the door while it is open,
 * the fire on the wall round it, flat shapes both; the heap at the back, the stone. (He, his fire and his club are
 * drawn by the scene, between this and the boulder.)
 */
function drawInside(g: Paint, t: number): void {
  const { ctx } = g
  const sky = skyAt(t)
  const dim = dimAt(t)
  const f = fireAt(t)
  const wall = mix(WALL, NIGHT, 0.7 * dim)
  inCave(ctx)
  ctx.fillStyle = wall
  ctx.fill()
  ctx.save()
  inCave(ctx)
  ctx.clip()
  // The fire's light on the wall round it: one flat warm shape, wavering a little with the flames.
  if (f > 0.01) {
    const w = 0.08 * Math.sin(t * 5.3) + 0.05 * Math.sin(t * 8.9 + 1)
    // Behind him as he sits by it, so it is against this that he is seen: a shape, not a face.
    const cx = FIRE[0] - 1.6
    blob(ctx, [
      [cx - 1.4 - 3.4 * f - w, FLOOR],
      [cx - 1.8 - 3.2 * f, FLOOR - 1.6 - 2.8 * f],
      [cx - 0.5 - 1.8 * f + w, FLOOR - 2.3 - 4.6 * f],
      [cx + 1.0 + 1.6 * f, FLOOR - 2.0 - 4.0 * f - w],
      [cx + 1.9 + 2.2 * f, FLOOR - 1.1 - 1.8 * f],
      [cx + 2.1 + 2.6 * f + w, FLOOR],
    ])
    ctx.fillStyle = mix(wall, FIRELIT, 0.06 + 0.26 * f)
    ctx.fill()
  }
  // Two great masses of the far wall standing out of it, darker, so the firelight lies on rock and breaks round them;
  // the one by the fire takes a little of it.
  for (const [s, lit] of [
    [[[98.8, -2.6], [99.2, -6.9], [101.6, -8.9], [104.2, -9.6], [103.4, -6.2], [102.4, -2.6]], 0.13],
    [[[109.0, -2.6], [108.4, -7.4], [110.8, -9.2], [113.2, -7.6], [113.9, -2.6]], 0.04],
  ] as [Pt[], number][]) {
    blob(ctx, s)
    ctx.fillStyle = mix(mix(WALL_DARK, NIGHT, 0.72 * dim), FIRELIT, lit * f)
    ctx.fill()
  }
  // The day through the door, while it is open: a pool of it on the floor inside.
  const gap = t < T.open ? gapAt(t) : smooth(t, T.open, T.open + 1.0)
  // The floor's lip, and the day's pool on it.
  ctx.fillStyle = mix(FLOOR_C, NIGHT, 0.75 * dim)
  ctx.fillRect(MOUTH.x0, FLOOR - 0.12, BACK - MOUTH.x0 + 1, 0.4)
  if (gap > 0.01) {
    ctx.beginPath()
    ctx.ellipse(MOUTH.x1 + 1.0 * gap, FLOOR - 0.02, 0.6 + 2.6 * gap, 0.1, 0, 0, Math.PI * 2)
    ctx.fillStyle = mix(FLOOR_C, sky.low, 0.25 * gap)
    ctx.fill()
  }
  ctx.restore()
  // The rock under the floor, cut through with it: a plain dark band down to the water, so the floor is a floor.
  ctx.fillStyle = SECTION
  ctx.fillRect(MOUTH.x1 - 0.02, FLOOR + 0.12, BACK - MOUTH.x1 + 0.4, -FLOOR - 0.12)
  // The rock's cut edge round the inside.
  ctx.beginPath()
  CAVE.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  throat(ctx)
  stroke(g, CUT, 9)
  stroke(g, INK, 2.2)
  // The step, the ledge and the pillar of fallen rock at the back; the stone under the club. Lit by the fire as they
  // are near it.
  const near = (x: number) => clamp01(1 - Math.abs(x - FIRE[0]) / 9) * f
  // Each a fallen slab: flat on top where a man can stand, rough at the sides, leaning a little.
  const block = (x0: number, x1: number, top: number, fill: string, lean: number) => {
    const w = x1 - x0
    poly(ctx, [
      [x0 - 0.06, FLOOR + 0.02],
      [x0 + lean - 0.05, (FLOOR + top) / 2 + 0.1],
      [x0 + lean * 0.4, top + 0.06],
      [x0 + 0.12 * w, top],
      [x1 - 0.1 * w, top],
      [x1 + 0.02, top + 0.1],
      [x1 + lean * 0.6 + 0.06, (FLOOR + top) / 2 - 0.05],
      [x1 + 0.08, FLOOR + 0.02],
    ])
    const body = mix(mix(fill, NIGHT, 0.55 * dim), FIRELIT, 0.18 * near((x0 + x1) / 2))
    ctx.fillStyle = body
    ctx.fill()
    ctx.lineJoin = 'round'
    stroke(g, INK, 2)
    // Its flat top catching what light there is: a thin lighter band, where a man stands.
    poly(ctx, [[x0 + 0.12 * w, top], [x1 - 0.1 * w, top], [x1 - 0.12 * w, top + 0.09], [x0 + 0.16 * w, top + 0.09]])
    ctx.fillStyle = mix(body, '#9A8E80', 0.35)
    ctx.fill()
  }
  drawPail(g, near, dim)
  block(PILLAR.x0, PILLAR.x1, PILLAR.top, '#4E4741', 0.05)
  block(LEDGE.x0, LEDGE.x1, LEDGE.top, '#5A524A', -0.06)
  block(STEP.x0, STEP.x1, STEP.top, '#544C45', 0.07)
  ctx.beginPath()
  ctx.ellipse(PIVOT[0], FLOOR - 0.57, 0.62, 0.6, 0, 0, Math.PI * 2)
  ctx.fillStyle = mix(mix('#554D45', NIGHT, 0.7 * dim), FIRELIT, 0.2 * near(PIVOT[0]))
  ctx.fill()
  stroke(g, INK, 2)
}

/**
 * His milking pail by the back wall, behind the step where the men hide: staved wood with two hoops, as tall as ten of
 * them, the whey near its brim pale in the dark. It is his size, so the cave is.
 */
function drawPail(g: Paint, near: (x: number) => number, dim: number): void {
  const { ctx } = g
  const x = STEP.x1 + 1.0
  const top = FLOOR - 1.55
  const wb = 0.55
  const wt = 0.7
  const wood = mix(mix('#5A4632', NIGHT, 0.55 * dim), FIRELIT, 0.16 * near(x))
  const hoop = mix(mix('#2C241D', NIGHT, 0.4 * dim), FIRELIT, 0.08 * near(x))
  poly(ctx, [[x - wb, FLOOR + 0.02], [x - wt, top], [x + wt, top], [x + wb, FLOOR + 0.02]])
  ctx.fillStyle = wood
  ctx.fill()
  ctx.lineJoin = 'round'
  stroke(g, INK, 2)
  // Two hoops round it, and the staves' seams between them.
  for (const u of [0.22, 0.78]) {
    const y = top + (FLOOR - top) * u
    const w = wt + (wb - wt) * u
    poly(ctx, [[x - w, y - 0.06], [x + w, y - 0.06], [x + w, y + 0.06], [x - w, y + 0.06]])
    ctx.fillStyle = hoop
    ctx.fill()
  }
  // The whey at the brim, and the rim's back edge.
  ctx.beginPath()
  ctx.ellipse(x, top + 0.02, wt - 0.06, 0.09, 0, 0, Math.PI * 2)
  ctx.fillStyle = mix(mix('#CFC6B4', NIGHT, 0.6 * dim), FIRELIT, 0.1 * near(x))
  ctx.fill()
  stroke(g, INK, 1.6)
}

/** The fire: a ring of stones and flames, as flat tongues of three colours, low as embers and high once he stirs it. */
export function drawFire(g: Paint, t: number): void {
  if (!openAt(t)) return
  const { ctx } = g
  const f = fireAt(t)
  const [x, y] = FIRE
  // The floor where it lights it: a flat warm pool, the fire's own light on the ground.
  ctx.beginPath()
  ctx.ellipse(x, y + 0.02, 0.9 + 1.4 * f, 0.1, 0, 0, Math.PI * 2)
  ctx.fillStyle = rgba(FIRELIT, 0.35 * f)
  ctx.fill()
  // The stones.
  for (const dx of [-0.42, -0.14, 0.16, 0.44]) {
    ctx.beginPath()
    ctx.ellipse(x + dx, y - 0.05, 0.15, 0.09, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#4A433C'
    ctx.fill()
  }
  // Flames.
  const tongues = 5
  for (let k = 0; k < 3; k++) {
    const scale = [1, 0.72, 0.42][k]
    ctx.beginPath()
    for (let i = 0; i < tongues; i++) {
      const u = (i + 0.5) / tongues
      const fx = x - 0.42 + 0.84 * u
      const h = (0.25 + 1.1 * f) * scale * (0.65 + 0.35 * Math.sin(t * (5.1 + i * 1.3) + i * 2.1)) * (1 - Math.abs(u - 0.5) * 0.9)
      const w = 0.17 * scale + 0.06
      const sway = 0.08 * Math.sin(t * 3.3 + i)
      ctx.moveTo(fx - w, y - 0.04)
      ctx.quadraticCurveTo(fx - w * 0.6 + sway * 0.5, y - h * 0.6, fx + sway, y - h)
      ctx.quadraticCurveTo(fx + w * 0.6 + sway * 0.5, y - h * 0.6, fx + w, y - 0.04)
      ctx.closePath()
    }
    ctx.fillStyle = FLAME[k]
    ctx.fill()
  }
}

/** The boulder: rolled up the shelf into the mouth, and later ground out again. */
function drawBoulder(g: Paint, t: number): void {
  const { ctx } = g
  const [x, y] = boulderAt(t)
  const turn = boulderTurn(t)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  const r = BOULDER_R
  blob(ctx, [[r, 0.05], [0.72 * r, -0.72 * r], [0, -r], [-0.75 * r, -0.66 * r], [-r, 0.05], [-0.7 * r, 0.74 * r], [0.05, r], [0.72 * r, 0.7 * r]])
  ctx.fillStyle = BOULDER
  ctx.fill()
  stroke(g, INK, 2.6)
  // One broad facet, darker, to show it turning.
  blob(ctx, [[0.15 * r, -0.2 * r], [0.7 * r, -0.55 * r], [0.85 * r, 0.25 * r], [0.35 * r, 0.6 * r]])
  ctx.fillStyle = '#34322F'
  ctx.fill()
  ctx.restore()
}

/**
 * The rock's splash: a column of the sea's own water that rises and falls, sheets thrown off it, and a ring spreading
 * on the water. Water, not paint: the colour of the light on the sea, a little paler, and seen through, with no ink
 * round it, so it is never a white tree standing in front of the ships.
 */
export function drawSplash(g: Paint, t: number, x: number, at: number): void {
  const s = t - at
  if (s < 0 || s > 3.2) return
  const { ctx } = g
  const sky = skyAt(t)
  const water = mix(sky.lit, sky.far, 0.35)
  const white = mix(water, '#E6E8E2', 0.4)
  const grey = water
  // The column: up fast, hanging, falling back; its top thrown open into a crown that droops as it falls.
  const rise = smooth(s, 0, 0.55)
  const fall = smooth(s, 0.9, 2.4)
  const H = 7.4 * rise * (1 - 0.85 * fall)
  const W = 0.8 + 0.7 * rise + 1.2 * fall
  const crown = 1.1 + 1.6 * rise + 1.2 * fall
  const droop = 1.4 * fall
  const a = 1 - smooth(s, 1.8, 3.1)
  if (H > 0.05 && a > 0.01) {
    ctx.beginPath()
    ctx.moveTo(x - W, 0.1)
    ctx.quadraticCurveTo(x - W * 0.35, -H * 0.5, x - W * 0.45, -H * 0.86)
    ctx.quadraticCurveTo(x - crown, -H * 0.95 + droop, x - crown - 0.3, -H * 0.78 + droop * 1.4)
    ctx.quadraticCurveTo(x - crown * 0.5, -H * 1.08, x, -H)
    ctx.quadraticCurveTo(x + crown * 0.5, -H * 1.08, x + crown + 0.3, -H * 0.78 + droop * 1.4)
    ctx.quadraticCurveTo(x + crown, -H * 0.95 + droop, x + W * 0.45, -H * 0.86)
    ctx.quadraticCurveTo(x + W * 0.35, -H * 0.5, x + W, 0.1)
    ctx.closePath()
    ctx.fillStyle = rgba(white, 0.75 * a)
    ctx.fill()
    // The sheets thrown off its foot, either side.
    for (const side of [-1, 1]) {
      const sx = x + side * (W + 0.8 * rise + 1.2 * fall)
      const sh = 2.4 * rise * (1 - fall)
      if (sh < 0.05) continue
      ctx.beginPath()
      ctx.moveTo(x + side * W * 0.6, 0.1)
      ctx.quadraticCurveTo(sx, -sh * 1.1, sx + side * 0.6, -sh * 0.2)
      ctx.lineTo(sx + side * 0.25, 0.1)
      ctx.closePath()
      ctx.fillStyle = rgba(grey, 0.7 * a)
      ctx.fill()
    }
  }
  // The ring: a low band of white spreading out along the water.
  const R = 0.6 + 4.2 * smooth(s, 0.2, 3.0)
  const ra = 0.7 * (1 - smooth(s, 1.2, 3.2))
  if (ra > 0.01) {
    ctx.beginPath()
    ctx.ellipse(x, 0.02, R, 0.16, 0, Math.PI, Math.PI * 2)
    ctx.ellipse(x, 0.02, Math.max(0, R - 0.5), 0.1, 0, Math.PI * 2, Math.PI, true)
    ctx.closePath()
    ctx.fillStyle = rgba(white, ra)
    ctx.fill()
  }
}
