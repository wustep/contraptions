import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { bloom, pool, rgba } from '../cast'
import { box, frame, hash, scenery, type Ctx } from '../kit'
import { level } from '../music'
import { BAND, clock } from '../stack'
import { PLANE, SNOW } from '../worlds'
import {
  A_SHIFT,
  ARIADNE_SNOW,
  CASE_X,
  clamp01,
  COBB,
  F_SHIFT,
  FISCHER_SNOW,
  CREVASSE,
  doorAt,
  DROP,
  FLOOR_Y,
  FORT,
  fortDrop,
  GATE_X,
  J1_LIP,
  J2_LIP,
  LEDGE,
  lerp,
  PISTES,
  pinwheelAt,
  SHOULDER,
  ss,
  T,
  TRACK,
} from './snow-geo'

/**
 * The snow's standing set (the SNOW builder's), in the dream world's own cells, animated on the snow's own clock
 * (`clock('snow', t)`) but for what Cobb touches (the gate, the door, the floor): Eames's dream, a mountain in snow
 * under a pale sky, and on the column at the foot of its face the fortress, a hospital of concrete, its ground floor
 * cut away to show the antechamber and the vault's great round door. After the snow's kick the fortress comes down,
 * and while he is above it (the hotel, the rain) it hangs there mid-fall, twenty times slower a level.
 *
 * Drawn flat: the land in a few pale masses, the fortress in one ink; light and air soft.
 */

type C2D = CanvasRenderingContext2D
const TAU = Math.PI * 2
const TOP = BAND.snow.top
const J2_LIP_Y = J2_LIP[1]
const BOTTOM = BAND.snow.bottom
export const VALLEY_Y = 61

/**
 * The film's cold daylight: a low sun from the west (the frame's left), the snow's lit faces faintly warm, the faces
 * turned from it and the hollows blue, the ranges paler into the haze. All mixed from the snow's palette.
 */
const LIT = mixHex(SNOW.snow, SNOW.flash, 0.3)
const SHADE = SNOW.snowShade
const HOLLOW = SNOW.snowDeep
const SUN_ROCK = mixHex(SNOW.rock, SNOW.flash, 0.24)
const SHADE_ROCK = mixHex(SNOW.rockDark, SNOW.snowDeep, 0.15)
const PINE_SHADE = mixHex(SNOW.pine, SNOW.vault, 0.4)

/* ------------------------------------------------------------------ the land */

/** The mountain's skyline, west to east: the summit over the face, the shoulder they land on, the ridge the guards come along. */
const CREST: Pt[] = [
  [-75, 53.5],
  [-62, 50.2],
  [-52, 48.4],
  [-44, 46.4],
  [-37, 45.5],
  [-31, 44.2],
  [-25, 43.3],
  [-19, 43.1],
  [-14, 42.3],
  [-10, 42.0],
  [-6, 42.6],
  [-1, 43.0],
  [3, 43.5],
  [6.2, 44.4],
  [SHOULDER.lip, SHOULDER.y],
  [SHOULDER.right, SHOULDER.y],
  [16.5, 44.3],
  [22, 43.9 + R],
  [30, 43.35 + R],
  [36, 42.9],
  [42, 44.3],
  [49, 45.6],
  [57, 47.8],
  [66, 50.4],
  [80, 53.5],
]
function crestAt(x: number): number {
  if (x <= CREST[0][0]) return CREST[0][1]
  for (let i = 1; i < CREST.length; i++) {
    const [x1, y1] = CREST[i]
    if (x <= x1) {
      const [x0, y0] = CREST[i - 1]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return CREST[CREST.length - 1][1]
}
/** A little rock in the ridge's line where it is not the shoulder or the guards' way. */
const jag = (x: number) => {
  if (x > SHOULDER.lip - 0.6 && x < 31) return 0
  const i = Math.floor(x / 1.3)
  const f = x / 1.3 - i
  const a = hash(i, 3, 17) - 0.5
  const b = hash(i + 1, 3, 17) - 0.5
  return (a + (b - a) * f) * 0.55
}
const skyline = (x: number) => crestAt(x) + jag(x)

/** The far ranges behind the mountain (seen through the air: paler the farther), each with how deep it is. */
const FAR = [
  { d: 5.0, y: 44.4, amp: 2.2, seed: 3, haze: 0.72 },
  { d: 3.2, y: 45.3, amp: 2.9, seed: 5, haze: 0.55 },
  { d: 1.9, y: 46.8, amp: 2.6, seed: 9, haze: 0.38 },
].map((l) => ({ ...l, lit: mixHex(LIT, SNOW.sky, l.haze), shade: mixHex(mixHex(SHADE, HOLLOW, 0.5), SNOW.sky, l.haze) }))
const farPeak = (l: (typeof FAR)[number], j: number) => l.y - l.amp * (0.35 + 0.65 * hash(j, l.seed, 2))
const farValley = (l: (typeof FAR)[number], j: number) => (farPeak(l, j) + farPeak(l, j + 1)) / 2 + l.amp * 0.55 * (0.4 + 0.6 * hash(j, l.seed, 7))
function farY(l: (typeof FAR)[number], x: number): number {
  const i = Math.floor(x / 7)
  const f = x / 7 - i
  const a = farPeak(l, i)
  const b = farPeak(l, i + 1)
  // Peaked, not rolling: a V between two tops.
  const m = farValley(l, i)
  return f < 0.5 ? a + (m - a) * (f * 2) : m + (b - m) * ((f - 0.5) * 2)
}

/* ------------------------------------------------------------------ drawing helpers */

const path = (ctx: C2D, pts: Pt[], k: number) => {
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
}
const fill = (ctx: C2D, pts: Pt[], k: number, color: string) => {
  path(ctx, pts, k)
  ctx.fillStyle = color
  ctx.fill()
}
const rect = (ctx: C2D, k: number, x0: number, y0: number, x1: number, y1: number) => {
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}
const inked = (ctx: C2D, c: Ctx, w = 1) => {
  ctx.strokeStyle = c.ink
  ctx.lineWidth = c.weight * w
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/* ------------------------------------------------------------------ the set */

export const snowSetPiece = scenery<null>({
  name: 'snow-set',
  draw: (p, _s, c) => drawSet(p, c, c.t),
  over: (p, _s, c) => drawSetOver(p, c, c.t),
})
/** Everything the set draws, claimed coarsely across the band. */
export const SNOW_SET_CELLS: Pt[] = box(-72, TOP, 82, BOTTOM, 3)

function drawSet(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const f = frame(p, k)
  if (f.y1 < TOP - 1 || f.y0 > BOTTOM + 1) return
  const ctx = p.drawingContext as C2D
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const st = clock('snow', t)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, TOP * k, (x1 - x0) * k, (BOTTOM - TOP) * k)
  ctx.clip()
  drawSky(ctx, k, x0, x1)
  drawFar(ctx, k, f)
  drawFace(ctx, c, x0, x1)
  drawStepShadows(ctx, k, t)
  drawPistes(ctx, k, x0, x1)
  drawFeatures(ctx, c, t)
  drawValley(ctx, c, x0, x1, st)
  drawFortress(p, ctx, c, t, st)
  drawOutside(ctx, c, t)
  drawSnowfall(ctx, k, f, st, false, t < T.kick)
  ctx.restore()
}

function drawSetOver(p: p5, c: Ctx, t: number): void {
  const { k } = c
  const f = frame(p, k)
  if (f.y1 < TOP - 1 || f.y0 > BOTTOM + 1) return
  const ctx = p.drawingContext as C2D
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, TOP * k, (x1 - x0) * k, (BOTTOM - TOP) * k)
  ctx.clip()
  drawCollapseDust(ctx, c, t)
  drawSnowfall(ctx, k, f, clock('snow', t), true, t < T.kick)
  ctx.restore()
}

/* ------------------------------------------------------------------ sky and ranges */

function drawSky(ctx: C2D, k: number, x0: number, x1: number): void {
  const g = ctx.createLinearGradient(0, TOP * k, 0, 58 * k)
  g.addColorStop(0, SNOW.skyHigh)
  g.addColorStop(0.45, SNOW.sky)
  g.addColorStop(1, mixHex(SNOW.sky, SNOW.snow, 0.45))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, TOP * k, (x1 - x0) * k, (BOTTOM - TOP) * k)
  // The low sun is off to the west: the sky warms toward the frame's left, low down.
  const w = x1 - x0
  ctx.save()
  ctx.translate((x0 - 0.1 * w) * k, 49 * k)
  ctx.scale(1, 9 / w)
  const sun = ctx.createRadialGradient(0, 0, 0, 0, 0, w * k)
  sun.addColorStop(0, rgba(mixHex(SNOW.flash, SNOW.pinwheel, 0.15), 0.55))
  sun.addColorStop(0.5, rgba(SNOW.flash, 0.2))
  sun.addColorStop(1, rgba(SNOW.flash, 0))
  ctx.fillStyle = sun
  ctx.fillRect(-w * k, -w * k, 2 * w * k, 2 * w * k)
  ctx.restore()
}

function drawFar(ctx: C2D, k: number, f: ReturnType<typeof frame>): void {
  // Each range moves (1 - 1/d) as far as the camera does: the far one barely at all. Each peak's east face (away
  // from the low sun) is in blue shade; the haze thickens between the ranges.
  for (const l of FAR) {
    const shift = f.cx * (1 - 1 / l.d)
    const lo = f.x0 - 2 - shift
    const hi = f.x1 + 2 - shift
    const step = Math.max(0.8, 3 / k)
    const pts: Pt[] = []
    for (let x = lo; x <= hi + step; x += step) pts.push([x + shift, farY(l, x)])
    pts.push([hi + shift + step, BOTTOM], [lo + shift, BOTTOM])
    fill(ctx, pts, k, l.lit)
    for (let j = Math.floor(lo / 7) - 1; j <= Math.ceil(hi / 7); j++) {
      const a: Pt = [j * 7 + shift, farPeak(l, j)]
      const m: Pt = [j * 7 + 3.5 + shift, farValley(l, j)]
      fill(ctx, [a, m, [m[0] + 0.6, m[1] + 3], [a[0] + 1.2, a[1] + 5]], k, l.shade)
    }
    const g = ctx.createLinearGradient(0, (l.y - 2) * k, 0, (l.y + 5) * k)
    g.addColorStop(0, rgba(SNOW.sky, 0))
    g.addColorStop(1, rgba(mixHex(SNOW.sky, SNOW.flash, 0.25), 0.6))
    ctx.fillStyle = g
    ctx.fillRect((f.x0 - 1) * k, (l.y - 2) * k, (f.x1 - f.x0 + 2) * k, 7 * k)
  }
}

/* ------------------------------------------------------------------ the face */

/** Where the face's rock breaks through its snow: a few crags under the ridge, in the world's cells. */
const CRAGS: Pt[][] = [
  [
    [-11.4, 42.35],
    [-9.6, 42.2],
    [-8.4, 43.6],
    [-9.9, 44.9],
    [-11.8, 43.9],
  ],
  [
    [-27, 43.9],
    [-24.6, 43.5],
    [-23.3, 44.6],
    [-25.4, 45.9],
  ],
  [
    [2.2, 43.7],
    [4.4, 44.1],
    [4.6, 45.0],
    [3.2, 45.3],
  ],
  [
    [33.5, 43.3],
    [36.4, 43.1],
    [38.2, 44.3],
    [35.6, 45.5],
    [33.8, 44.6],
  ],
  [
    [-40, 46.0],
    [-37.6, 45.8],
    [-36.4, 47.1],
    [-38.8, 47.6],
  ],
  [
    [-31.5, 49.2],
    [-29.8, 48.7],
    [-29.0, 50.1],
    [-30.9, 50.6],
  ],
  [
    [17.2, 46.6],
    [19.1, 46.2],
    [19.8, 47.4],
    [18.0, 48.1],
  ],
  [
    [23.0, 48.9],
    [24.6, 48.6],
    [25.3, 50.2],
    [23.6, 50.6],
  ],
  [
    [13.6, 51.5],
    [15.2, 51.2],
    [15.6, 52.4],
    [14.1, 52.7],
  ],
]
/** The big rock faces, each with the snow lying on its ledges (from, to). */
const FACES: { pts: Pt[]; ledges: [Pt, Pt][] }[] = [
  {
    // Under the summit.
    pts: [
      [-13.9, 43.0],
      [-11.4, 42.25],
      [-9.2, 42.3],
      [-7.5, 43.9],
      [-8.4, 45.9],
      [-10.8, 46.5],
      [-13.3, 45.4],
    ],
    ledges: [
      [
        [-13.5, 43.7],
        [-8.4, 44.4],
      ],
      [
        [-13.2, 44.8],
        [-8.2, 45.5],
      ],
    ],
  },
  {
    // The far western face.
    pts: [
      [-41.6, 46.2],
      [-38.4, 45.6],
      [-35.6, 46.8],
      [-35.0, 49.6],
      [-37.8, 51.2],
      [-40.8, 50.2],
    ],
    ledges: [
      [
        [-41.2, 47.4],
        [-35.4, 48.2],
      ],
      [
        [-40.9, 48.9],
        [-35.2, 49.5],
      ],
    ],
  },
  {
    // The right-hand peak.
    pts: [
      [32.6, 43.6],
      [36.2, 43.1],
      [38.8, 44.6],
      [38.3, 47.6],
      [35.2, 48.6],
      [32.9, 46.9],
    ],
    ledges: [
      [
        [32.8, 44.8],
        [38.6, 45.5],
      ],
      [
        [33.0, 46.2],
        [38.4, 46.9],
      ],
    ],
  },
  {
    // Under the guards' ridge.
    pts: [
      [16.4, 46.2],
      [19.8, 45.9],
      [21.0, 48.0],
      [19.9, 50.7],
      [17.1, 50.3],
    ],
    ledges: [
      [
        [16.5, 47.6],
        [20.9, 48.2],
      ],
      [
        [16.8, 49.2],
        [20.6, 49.7],
      ],
    ],
  },
]
function drawRockFace(ctx: C2D, k: number, face: { pts: Pt[]; ledges: [Pt, Pt][] }, x0: number, x1: number): void {
  const xs = face.pts.map((q) => q[0])
  const ys = face.pts.map((q) => q[1])
  const lx = Math.min(...xs)
  const rx = Math.max(...xs)
  if (rx < x0 - 1 || lx > x1 + 1) return
  const ty = Math.min(...ys)
  const by = Math.max(...ys)
  fill(ctx, face.pts, k, SHADE_ROCK)
  ctx.save()
  path(ctx, face.pts, k)
  ctx.clip()
  // Its west side in the low sun, the split running down the face.
  const cx = (lx + rx) / 2
  fill(
    ctx,
    [
      [lx - 1, ty - 1],
      [cx + 0.4, ty - 1],
      [cx - 0.5, by + 1],
      [lx - 1, by + 1],
    ],
    k,
    SUN_ROCK,
  )
  // Snow on its ledges, thin and falling a little to the east.
  for (const [a, b] of face.ledges) fill(ctx, [a, b, [b[0], b[1] + 0.16], [a[0], a[1] + 0.2]], k, LIT)
  ctx.restore()
  // Snow on its top edge.
  fill(ctx, [face.pts[0], face.pts[1], [face.pts[1][0] - 0.2, face.pts[1][1] + 0.3], [face.pts[0][0] + 0.3, face.pts[0][1] + 0.35]], k, LIT)
}

/**
 * The face's big planes in the light from the upper left: the summit's east flank (falling to the shoulder) faces away
 * and is in shade; so do the lower slopes of the western face, under the pistes. Flat planes of shade, crisp at the
 * spur they turn on, soft where they fade into the snow.
 */
const SHADES: { pts: Pt[]; color: string }[] = [
  {
    // The summit's east flank, from its spur (the rib the rock step is on) to the shoulder.
    pts: [
      [-10.0, 42.0],
      [-8.9, 44.6],
      [-7.2, 47.35],
      [-6.1, 50.8],
      [-5.2, 58],
      [16, 58],
      [16, 44.3],
      [SHOULDER.right, SHOULDER.y + 0.02],
      [SHOULDER.lip, SHOULDER.y + 0.02],
      [6.2, 44.42],
      [3, 43.52],
      [-1, 43.02],
      [-6, 42.62],
    ],
    color: mixHex(SHADE, HOLLOW, 0.2),
  },
  {
    // A spur west of the summit, and the gully under it.
    pts: [
      [-25.2, 43.35],
      [-24.2, 46.5],
      [-22.8, 49.6],
      [-21.6, 50.6],
      [-19.6, 50.3],
      [-18.8, 47.2],
      [-19.0, 43.15],
    ],
    color: mixHex(LIT, SHADE, 0.75),
  },
  {
    // The rib under the guards' ridge, and the gully east of it.
    pts: [
      [22.2, 44.05],
      [23.4, 47.5],
      [25.6, 51.5],
      [27.4, 56],
      [33, 56],
      [30.8, 50.5],
      [29.6, 46.5],
      [30, 43.5],
    ],
    color: mixHex(LIT, SHADE, 0.85),
  },
  {
    // The right-hand peak's east flank.
    pts: [
      [36, 42.95],
      [38.2, 47],
      [40.5, 52],
      [58, 52],
      [57, 47.85],
      [49, 45.65],
      [42, 44.35],
    ],
    color: mixHex(SHADE, HOLLOW, 0.2),
  },
  {
    // The far western peak's east side.
    pts: [
      [-44, 46.45],
      [-42.6, 50],
      [-41, 54],
      [-33, 54],
      [-35.2, 50.3],
      [-37, 45.55],
    ],
    color: mixHex(LIT, SHADE, 0.8),
  },
]
/**
 * The rock step the first jump goes off: a band of cliff along the contour, its top edge the piste's end (the lip), its
 * foot the next traverse, jagged, the snow lying on its shelves.
 */
function stepBand(): { rock: Pt[]; shade: Pt[]; shelves: Pt[][] } {
  const [lx, ly] = J1_LIP
  const top = ly + R
  const [jx, jy] = TRACK.j1Land
  // Its foot a little up the slope from the piste, a strip of snow between: they land and run under it, not across it.
  const foot = jy + R - 0.26
  const rock: Pt[] = []
  const shade: Pt[] = []
  // The top edge from the right of the lip to the band's left end, slightly falling; the foot back along under it.
  const xs = [lx + 1.1, lx + 0.1, lx - 0.9, lx - 2.2, lx - 3.4, jx - 0.6, jx - 2.4, jx - 3.6]
  xs.forEach((x, i) => rock.push([x, top + (lx - x) * 0.07 + (i % 2 ? 0.12 : -0.05) + (i === 0 ? 0.25 : 0)]))
  const fx = [jx - 3.3, jx - 1.8, jx - 0.2, jx + 1.4, lx - 1.2, lx + 0.4]
  fx.forEach((x, i) => rock.push([x, foot + (jx - x) * 0.05 + (i % 2 ? 0.18 : -0.08) - (i === fx.length - 1 ? 1.3 : 0)]))
  // Its lower half in shade: the cliff's face under the overhang of its top.
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.25]
  shade.push(mid(rock[1], rock[12]), mid(rock[3], rock[11]), mid(rock[5], rock[10]), mid(rock[6], rock[9]), rock[9], rock[10], rock[11], rock[12])
  const shelves: Pt[][] = [
    [rock[1], rock[2], [rock[2][0], rock[2][1] + 0.22], [rock[1][0] + 0.2, rock[1][1] + 0.25]],
    [rock[3], rock[4], [rock[4][0] + 0.1, rock[4][1] + 0.25], [rock[3][0], rock[3][1] + 0.3]],
    [rock[5], rock[6], [rock[6][0] + 0.2, rock[6][1] + 0.2], [rock[5][0], rock[5][1] + 0.25]],
  ]
  return { rock, shade, shelves }
}
const STEP = stepBand()
/**
 * Off the rock step they fly in front of the band, down across its face, and without more it looks as if they sink
 * through the rock. Each throws a shadow on the band behind it (the low sun is west, so a little east of them and
 * lower), further off and softer at the top of the air, where they are furthest out from the face; it closes up on
 * them as they come down to its foot. Only on the rock: the flight is seen to be in front of it.
 */
function drawStepShadows(ctx: C2D, k: number, t: number): void {
  const fly = T.j1Land - T.j1
  const riders: [typeof COBB, number][] = [
    [ARIADNE_SNOW, -A_SHIFT],
    [COBB, 0],
    [FISCHER_SNOW, F_SHIFT],
  ]
  let any = false
  for (const [, shift] of riders) if (t > T.j1 + shift && t < T.j1Land + shift) any = true
  if (!any) return
  ctx.save()
  path(ctx, STEP.rock, k)
  ctx.clip()
  for (const [m, shift] of riders) {
    const u = (t - T.j1 - shift) / fly
    if (u <= 0 || u >= 1) continue
    const [x, y] = m.at(t)
    // Out from the face most at the top of the air; the shadow fades in off the lip and out onto the landing.
    const out = Math.sin(Math.PI * u)
    const a = 0.55 * Math.min(1, u / 0.12, (1 - u) / 0.12) * (1 - 0.35 * out)
    const [sx, sy] = [x + 0.12 + 0.38 * out, y + 0.1 + 0.22 * out]
    const r = R * (1.1 + 0.6 * out)
    const g = ctx.createRadialGradient(sx * k, sy * k, 0, sx * k, sy * k, r * 1.6 * k)
    g.addColorStop(0, rgba(SNOW.rockDark, a))
    g.addColorStop(0.55, rgba(SNOW.rockDark, a * 0.8))
    g.addColorStop(1, rgba(SNOW.rockDark, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(sx * k, sy * k, r * 1.6 * k, r * 1.25 * k, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
/** The ledge over the gate: a rock wall with snow on its top, the apron in front of it. */
const LEDGE_WALL: Pt[] = [
  [LEDGE.from - 0.3, LEDGE.y + R + 0.12],
  [LEDGE.from + 0.1, LEDGE.y + R - 0.02],
  [LEDGE.lip, LEDGE.y + R - 0.02],
  [LEDGE.lip + 0.25, LEDGE.y + R + 0.35],
  [LEDGE.lip + 0.35, FLOOR_Y + 0.02],
  [LEDGE.from - 0.6, FLOOR_Y + 0.02],
]
/** Pines round the hairpin's bend, and a boulder in it. */
const HAIR_PINES: [number, number, number][] = [
  [-26.6, 53.0, 1.5],
  [-27.4, 52.6, 1.1],
  [-23.1, 52.5, 0.9],
  [-25.8, 55.0, 1.7],
  [-27.8, 55.4, 1.3],
  [-22.2, 55.6, 1.2],
  [-20.6, 55.9, 1.6],
  [-29.2, 53.8, 1.2],
  [-17.4, 56.4, 1.4],
  [-31.0, 55.2, 1.5],
]

function drawFace(ctx: C2D, c: Ctx, x0: number, x1: number): void {
  const { k } = c
  const step = Math.max(0.35, 1.5 / k)
  const pts: Pt[] = []
  for (let x = x0; x <= x1 + step; x += step) pts.push([x, skyline(x)])
  pts.push([x1 + step, BOTTOM], [x0, BOTTOM])
  fill(ctx, pts, k, LIT)
  ctx.save()
  path(ctx, pts, k)
  ctx.clip()
  // The long slopes away from the sun, blue.
  for (const sh of SHADES) {
    const xs = sh.pts.map((q) => q[0])
    if (Math.max(...xs) < x0 || Math.min(...xs) > x1) continue
    // Crisp along the spur it turns on, fading out down the slope (never a shape with a bottom edge).
    const ys = sh.pts.map((q) => q[1])
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
    g.addColorStop(0, rgba(sh.color, 1))
    g.addColorStop(0.5, rgba(sh.color, 0.85))
    g.addColorStop(1, rgba(sh.color, 0))
    path(ctx, sh.pts, k)
    ctx.fillStyle = g
    ctx.fill()
    // Deeper blue in the hollow right under the spur.
    const [sx, sy] = sh.pts[0]
    const [ex, ey] = sh.pts[Math.min(3, sh.pts.length - 1)]
    const hg = ctx.createLinearGradient(sx * k, 0, (sx + 2.2) * k, 0)
    hg.addColorStop(0, rgba(HOLLOW, 0.45))
    hg.addColorStop(1, rgba(HOLLOW, 0))
    ctx.fillStyle = hg
    path(ctx, [sh.pts[0], sh.pts[1], sh.pts[2], [ex + 2.2, ey], [sx + 2.2, sy]], k)
    ctx.fill()
  }
  // The face's foot goes grey-blue into the valley's air.
  const g = ctx.createLinearGradient(0, 52 * k, 0, VALLEY_Y * k)
  g.addColorStop(0, rgba(SNOW.snowShade, 0))
  g.addColorStop(1, rgba(SNOW.snowShade, 0.8))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, 52 * k, (x1 - x0) * k, (VALLEY_Y - 52) * k)
  // The low sun along the ridge: a warm rim where the snow meets the sky.
  ctx.strokeStyle = rgba(mixHex(SNOW.flash, '#FFFFFF', 0.3), 0.85)
  ctx.lineWidth = Math.max(1, 0.06 * k)
  ctx.beginPath()
  for (let x = x0; x <= x1 + step; x += step) {
    const y = skyline(x) + 0.04
    if (x === x0) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  ctx.stroke()
  ctx.restore()
  // The rock faces, lit on their west side, blue-grey in shade, snow on their ledges; the small crags.
  for (const face of FACES) drawRockFace(ctx, k, face, x0, x1)
  for (const crag of CRAGS) {
    if (crag[0][0] > x1 + 4 || crag[0][0] < x0 - 6) continue
    // Its shadow on the face under its foot, soft, a little east of it (the sun is low in the west): without it the
    // crag ended on the snow with a hard edge and read as a slab laid on the face, plainest in a tall frame.
    const xs = crag.map((q) => q[0])
    const ys = crag.map((q) => q[1])
    const [lx, rx, by] = [Math.min(...xs), Math.max(...xs), Math.max(...ys)]
    ctx.save()
    ctx.translate(((lx + rx) / 2 + 0.35) * k, (by - 0.05) * k)
    ctx.scale(1, 0.32)
    const r = ((rx - lx) / 2 + 0.6) * k
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    g.addColorStop(0, rgba(HOLLOW, 0.5))
    g.addColorStop(0.6, rgba(HOLLOW, 0.22))
    g.addColorStop(1, rgba(HOLLOW, 0))
    ctx.fillStyle = g
    ctx.fillRect(-r, -r, 2 * r, 2 * r)
    ctx.restore()
    drawRockFace(ctx, k, { pts: crag, ledges: [] }, x0, x1)
  }
  // The band throws its shadow down the slope under it, east of the low sun: blue, deepest at its foot (Mal waits
  // in it on the piste).
  {
    const xs = STEP.rock.map((q) => q[0])
    const xa = Math.min(...xs) - 0.4
    const xb = Math.max(...xs)
    const foot = TRACK.j1Land[1] + R
    const g = ctx.createLinearGradient(0, (foot - 0.6) * k, 0, (foot + 3.2) * k)
    g.addColorStop(0, rgba(HOLLOW, 0.75))
    g.addColorStop(0.35, rgba(mixHex(SHADE, HOLLOW, 0.5), 0.55))
    g.addColorStop(1, rgba(SHADE, 0))
    ctx.fillStyle = g
    path(
      ctx,
      [
        [xa, foot - 0.6],
        [xb, J1_LIP[1] + 1],
        [xb + 1.4, foot + 1.2],
        [xb - 0.5, foot + 3.2],
        [xa + 1.6, foot + 3.2],
        [xa - 0.3, foot + 1.0],
      ],
      k,
    )
    ctx.fill()
  }
  fill(ctx, STEP.rock, k, SUN_ROCK)
  fill(ctx, STEP.shade, k, SHADE_ROCK)
  for (const sh of STEP.shelves) fill(ctx, sh, k, LIT)
  fill(ctx, LEDGE_WALL, k, SUN_ROCK)
  fill(ctx, [LEDGE_WALL[2], LEDGE_WALL[3], LEDGE_WALL[4], [LEDGE.lip - 0.25, FLOOR_Y + 0.02]], k, SHADE_ROCK)
  fill(ctx, [LEDGE_WALL[0], LEDGE_WALL[1], LEDGE_WALL[2], [LEDGE.lip - 0.05, LEDGE.y + R + 0.18], [LEDGE.from, LEDGE.y + R + 0.3]], k, SNOW.snow)
  // The crevasse: a gap in the snow under the piste, a dark V dropping into the face (filled: never an outlined hole),
  // thin rock at its walls, snow overhanging its lips. The piste breaks off at its lip and takes up lower beyond it.
  const cv = CREVASSE
  const far = cv.top + (TRACK.j2Land[1] - J2_LIP_Y)
  const deep = cv.top + 1.9
  const cx = (cv.x0 + cv.x1) / 2
  fill(
    ctx,
    [
      [cv.x0 - 0.12, cv.top + 0.02],
      [cv.x1 + 0.12, far + 0.02],
      [cv.x1 - 0.02, far + 0.9],
      [cx + 0.12, deep + 0.15],
      [cv.x0 + 0.05, cv.top + 0.9],
    ],
    k,
    SNOW.rock,
  )
  const cg = ctx.createLinearGradient(0, cv.top * k, 0, deep * k)
  cg.addColorStop(0, mixHex(SNOW.snowDeep, SNOW.rockDark, 0.35))
  cg.addColorStop(1, mixHex(SNOW.rockDark, SNOW.vault, 0.65))
  ctx.fillStyle = cg
  path(
    ctx,
    [
      [cv.x0 + 0.02, cv.top + 0.04],
      [cv.x1 - 0.02, far + 0.04],
      [cv.x1 - 0.14, far + 0.85],
      [cx + 0.1, deep],
      [cv.x0 + 0.16, cv.top + 0.85],
    ],
    k,
  )
  ctx.fill()
  // Snow overhanging both lips.
  fill(ctx, [[cv.x0 - 0.45, cv.top - 0.02], [cv.x0 + 0.14, cv.top - 0.02], [cv.x0 + 0.06, cv.top + 0.16], [cv.x0 - 0.4, cv.top + 0.2]], k, SNOW.snow)
  fill(ctx, [[cv.x1 - 0.16, far - 0.02], [cv.x1 + 0.5, far - 0.02], [cv.x1 + 0.45, far + 0.2], [cv.x1 - 0.08, far + 0.16]], k, SNOW.snow)
  // The pines at the hairpin, and a boulder in its bend: bedded in the snow, lit on its west, its east in shade, snow
  // on its crown, and its shadow long on the slope like the pines' (it was a bare flat slab, floating).
  {
    const [hx, hy] = TRACK.HAIR.pts[20]
    const bx = hx + 1.45
    const foot = hy + 0.2
    longShadow(ctx, k, bx + 0.2, foot, 0.5, 1.0)
    const body: Pt[] = [
      [bx - 0.6, foot + 0.04],
      [bx - 0.5, foot - 0.22],
      [bx - 0.22, foot - 0.42],
      [bx + 0.12, foot - 0.46],
      [bx + 0.42, foot - 0.3],
      [bx + 0.56, foot - 0.04],
      [bx + 0.5, foot + 0.06],
    ]
    fill(ctx, body, k, SHADE_ROCK)
    fill(ctx, [body[0], body[1], body[2], body[3], [bx + 0.02, foot - 0.12], [bx - 0.2, foot + 0.05]], k, SUN_ROCK)
    fill(ctx, [[bx - 0.36, foot - 0.33], [bx - 0.2, foot - 0.45], [bx + 0.12, foot - 0.5], [bx + 0.36, foot - 0.33], [bx + 0.1, foot - 0.37], [bx - 0.15, foot - 0.3]], k, SNOW.snow)
    // The snow drifted up round its foot.
    fill(ctx, [[bx - 0.75, foot + 0.08], [bx - 0.5, foot - 0.04], [bx + 0.5, foot - 0.02], [bx + 0.72, foot + 0.1]], k, SNOW.snow)
  }
  for (const [x, foot, h] of HAIR_PINES) {
    if (x < x0 - 2 || x > x1 + 2) continue
    longShadow(ctx, k, x, foot, h, h * 0.42)
    drawPine(ctx, k, x, foot, h, h * 0.42, SNOW.pine)
  }
}

/** The pistes: the groove the skis cut, a soft shade a little wider than a ball, under the path they run. */
function drawPistes(ctx: C2D, k: number, x0: number, x1: number): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Each kind is one path, stroked once: where one piste runs on into the next their ends overlap, and stroked apart
  // the overlap showed as a darker blot.
  for (const which of ['piste', 'branch'] as const) {
    ctx.beginPath()
    for (const { path: pth, kind } of PISTES) {
      if (kind !== which) continue
      const pts = pth.pts
      const xs = pts.map((q) => q[0])
      if (Math.max(...xs) < x0 - 1 || Math.min(...xs) > x1 + 1) continue
      // The groove sits under the ball's path, on the snow: straight down from it, so that round a hairpin's turn it
      // follows the arc a ball's width lower rather than jumping from one side of the path to the other.
      const under = (i: number): Pt => [pts[i][0], pts[i][1] + R]
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = under(i)
        if (i === 0) ctx.moveTo(x * k, y * k)
        else ctx.lineTo(x * k, y * k)
      }
    }
    ctx.strokeStyle = rgba(SNOW.snowDeep, which === 'piste' ? 0.34 : 0.26)
    ctx.lineWidth = Math.max(1, 0.1 * k)
    ctx.stroke()
    ctx.strokeStyle = rgba(SNOW.snowShade, 0.9)
    ctx.lineWidth = Math.max(1, 0.24 * k)
    ctx.globalCompositeOperation = 'multiply'
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}

/** The shoulder's cornice, the kicker at the rock step's lip, the ledge's lip. */
function drawFeatures(ctx: C2D, c: Ctx, _t: number): void {
  const { k } = c
  // The cornice: the shoulder's snow curling out over the face.
  fill(
    ctx,
    [
      [SHOULDER.lip - 0.25, SHOULDER.y + 0.05],
      [SHOULDER.lip + 0.4, SHOULDER.y - 0.06],
      [SHOULDER.right + 0.6, SHOULDER.y - 0.02],
      [SHOULDER.right + 0.3, SHOULDER.y + 0.55],
      [SHOULDER.lip + 0.6, SHOULDER.y + 0.6],
      [SHOULDER.lip + 0.05, SHOULDER.y + 0.35],
    ],
    k,
    SNOW.snow,
  )
  fill(
    ctx,
    [
      [SHOULDER.lip - 0.25, SHOULDER.y + 0.05],
      [SHOULDER.lip + 0.05, SHOULDER.y + 0.35],
      [SHOULDER.lip + 0.6, SHOULDER.y + 0.6],
      [SHOULDER.lip + 0.3, SHOULDER.y + 0.75],
      [SHOULDER.lip - 0.1, SHOULDER.y + 0.45],
    ],
    k,
    SNOW.snowShade,
  )
  // The kicker at the lip: the snow built up into a ramp.
  const [lx, ly] = J1_LIP
  fill(
    ctx,
    [
      [lx + 1.6, ly + R + 0.02],
      [lx, ly + R - 0.12],
      [lx - 0.12, ly + R + 0.1],
      [lx + 0.4, ly + R + 0.35],
    ],
    k,
    SNOW.snow,
  )
}

/* ------------------------------------------------------------------ the valley, the pines, the ground */

/** Pines: stands of them on the face's foot and in the valley, each a dark spire; drawn only where seen. */
function drawPine(ctx: C2D, k: number, x: number, foot: number, h: number, w: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x * k, (foot - h) * k)
  const tiers = 4
  for (let i = 1; i <= tiers; i++) {
    const y = foot - h + (h * i) / tiers
    const ww = (w / 2) * (0.35 + (0.65 * i) / tiers)
    ctx.lineTo((x + ww) * k, y * k)
    if (i < tiers) ctx.lineTo((x + ww * 0.45) * k, (y - h * 0.06) * k)
  }
  ctx.lineTo((x + 0.05) * k, foot * k)
  ctx.lineTo((x - 0.05) * k, foot * k)
  for (let i = tiers; i >= 1; i--) {
    const y = foot - h + (h * i) / tiers
    const ww = (w / 2) * (0.35 + (0.65 * i) / tiers)
    if (i < tiers) ctx.lineTo((x - ww * 0.45) * k, (y - h * 0.06) * k)
    ctx.lineTo((x - ww) * k, y * k)
  }
  ctx.closePath()
  ctx.fill()
  // Its east half away from the low sun, darker.
  if (color === SNOW.pine && k > 6) {
    ctx.save()
    ctx.clip()
    ctx.fillStyle = PINE_SHADE
    ctx.fillRect(x * k, (foot - h) * k, w * k, h * k)
    ctx.restore()
  }
}
/** A long blue shadow thrown east across the snow by something standing at `x` on `foot`, `h` tall, in the low sun. */
function longShadow(ctx: C2D, k: number, x: number, foot: number, h: number, w: number): void {
  const L = h * 1.7
  const g = ctx.createLinearGradient(x * k, 0, (x + L) * k, 0)
  g.addColorStop(0, rgba(HOLLOW, 0.55))
  g.addColorStop(1, rgba(SHADE, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((x - w * 0.3) * k, foot * k)
  ctx.lineTo((x + L) * k, (foot + 0.08) * k)
  ctx.lineTo((x + L * 0.9) * k, (foot + 0.22) * k)
  ctx.lineTo((x - w * 0.2) * k, (foot + 0.16) * k)
  ctx.closePath()
  ctx.fill()
}

function drawValley(ctx: C2D, c: Ctx, x0: number, x1: number, st: number): void {
  const { k } = c
  // Far pines along the face's foot (paler: in the air), then the valley floor, then near pines, then the ground.
  const far = mixHex(SNOW.pine, SNOW.snowShade, 0.45)
  const lod = k < 7 ? 3 : 1
  for (let i = Math.floor(x0 / 0.9); i <= Math.ceil(x1 / 0.9); i += lod) {
    const x = i * 0.9 + hash(i, 1, 41) * 0.6
    if (x > -10 && x < 10) continue
    if (hash(i, 2, 41) < 0.35) continue
    const h = (0.9 + 1.1 * hash(i, 3, 41)) * (k < 7 ? 1.4 : 1)
    drawPine(ctx, k, x, VALLEY_Y - 0.4 - 0.9 * hash(i, 4, 41), h, h * 0.42, far)
  }
  // The valley floor: level snow across the whole width.
  const g = ctx.createLinearGradient(0, (VALLEY_Y - 0.3) * k, 0, (VALLEY_Y + 0.6) * k)
  g.addColorStop(0, LIT)
  g.addColorStop(1, SHADE)
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, (VALLEY_Y - 0.3) * k, (x1 - x0) * k, 1.0 * k)
  // The ground under it, cut: rock, darker as it goes down to the dark of sleep.
  const rg = ctx.createLinearGradient(0, (VALLEY_Y + 0.6) * k, 0, BOTTOM * k)
  rg.addColorStop(0, SNOW.rock)
  rg.addColorStop(0.35, SNOW.rockDark)
  rg.addColorStop(1, mixHex(SNOW.rockDark, SNOW.vault, 0.6))
  ctx.fillStyle = rg
  ctx.fillRect(x0 * k, (VALLEY_Y + 0.6) * k, (x1 - x0) * k, (BOTTOM - VALLEY_Y - 0.6) * k)
  // Strata in the cut: a few long soft bands, not strokes.
  for (let i = 0; i < 3; i++) {
    const y = VALLEY_Y + 1.4 + i * 0.95
    ctx.fillStyle = rgba(SNOW.rock, 0.18)
    ctx.fillRect(x0 * k, y * k, (x1 - x0) * k, 0.18 * k)
  }
  // The knoll the fortress stands on: rock, from its footing down to the valley.
  fill(
    ctx,
    [
      [FORT.x0 - 0.5, FORT.foot - 0.1],
      [FORT.x1 + 0.6, FORT.foot - 0.1],
      [FORT.x1 + 2.4, VALLEY_Y + 0.1],
      [FORT.x0 - 2.2, VALLEY_Y + 0.1],
    ],
    k,
    SNOW.rockDark,
  )
  fill(
    ctx,
    [
      [FORT.x0 - 0.5, FORT.foot - 0.1],
      [FORT.x0 + 1.4, FORT.foot - 0.1],
      [FORT.x0 - 0.8, VALLEY_Y + 0.1],
      [FORT.x0 - 2.2, VALLEY_Y + 0.1],
    ],
    k,
    SNOW.rock,
  )
  // The apron at the gate: a snow terrace on the face's foot, level with the vault's floor.
  fill(
    ctx,
    [
      [LEDGE.lip - 2.4, FLOOR_Y],
      [GATE_X + 0.05, FLOOR_Y],
      [GATE_X + 0.05, FORT.foot + 0.4],
      [GATE_X - 1.6, VALLEY_Y - 0.3],
      [LEDGE.lip - 4.8, VALLEY_Y - 0.3],
      [LEDGE.lip - 3.4, FLOOR_Y + 1.3],
    ],
    k,
    LIT,
  )
  fill(
    ctx,
    [
      [LEDGE.lip - 3.4, FLOOR_Y + 0.32],
      [GATE_X + 0.05, FLOOR_Y + 0.32],
      [GATE_X + 0.05, FLOOR_Y + 0.62],
      [LEDGE.lip - 3.2, FLOOR_Y + 0.7],
    ],
    k,
    rgba(SNOW.snowShade, 0.7),
  )
  // Under its snow the apron is ground, cut as the knoll beside it is: rock, darker as it goes down, so whoever sinks
  // through the apron's floor is seen to go into the mountain and not through white air.
  {
    const apron: Pt[] = [
      [LEDGE.lip - 2.4, FLOOR_Y],
      [GATE_X + 0.05, FLOOR_Y],
      [GATE_X + 0.05, FORT.foot + 0.4],
      [GATE_X - 1.6, VALLEY_Y - 0.3],
      [LEDGE.lip - 4.8, VALLEY_Y - 0.3],
      [LEDGE.lip - 3.4, FLOOR_Y + 1.3],
    ]
    ctx.save()
    path(ctx, apron, k)
    ctx.clip()
    const top = FLOOR_Y + 0.6
    const cg = ctx.createLinearGradient(0, top * k, 0, (VALLEY_Y - 0.3) * k)
    cg.addColorStop(0, mixHex(SNOW.snowDeep, SNOW.rock, 0.5))
    cg.addColorStop(0.3, SNOW.rock)
    cg.addColorStop(1, SNOW.rockDark)
    ctx.fillStyle = cg
    ctx.fillRect((LEDGE.lip - 5) * k, top * k, (GATE_X - LEDGE.lip + 5.2) * k, (VALLEY_Y - top) * k)
    ctx.restore()
  }
  // Near pines in the valley, swaying a little on the snow's clock, and some on the face's foot.
  for (let i = Math.floor(x0 / 1.3); i <= Math.ceil(x1 / 1.3); i += lod) {
    const x = i * 1.3 + hash(i, 5, 43) * 0.9
    if (x > FORT.x0 - 3.2 && x < FORT.x1 + 3.4) continue
    if (hash(i, 6, 43) < 0.45) continue
    const h = 1.2 + 1.6 * hash(i, 7, 43)
    const sway = Math.sin(st * 0.9 + i) * 0.02
    if (k > 5) longShadow(ctx, k, x, VALLEY_Y + 0.15, h, h * 0.4)
    drawPine(ctx, k, x + sway, VALLEY_Y + 0.15, h, h * 0.4, SNOW.pine)
  }
}

/* ------------------------------------------------------------------ the fortress */

/** How far the fortress has come down at `t`, each piece: the sag from the charges (show time), then its fall. */
function collapse(t: number): { sag: number; tau: number } {
  const sag = fortDrop(t)
  const tau = Math.max(0, clock('snow', t) - clock('snow', T.kick))
  return { sag, tau }
}

/** How far the ground floor has sunk into its blown footing after the kick (settling), cells. */
const settle = (tau: number) => 1.3 * (1 - Math.exp(-tau / 0.45))

/**
 * The fortress. Its pieces: the ground floor (cut away) on its footing; the upper floor's left wing and main block; the
 * tower on the right; the walkway to the mountain. From the charges it sags into its blown footing (show time: they
 * ride it); from the kick it breaks up, each piece dropping and tipping as it settles, in the dust (the snow's clock:
 * in the wides it hangs there, mid-fall).
 */
function drawFortress(p: p5, ctx: C2D, c: Ctx, t: number, st: number): void {
  const { k } = c
  const { sag, tau } = collapse(t)
  const down = sag + settle(tau)
  // Its long shadow thrown east onto the slope behind it by the low sun (while it stands).
  const stand = 1 - ss(tau / 0.6)
  if (stand > 0.01) {
    const g = ctx.createLinearGradient(FORT.x1 * k, 0, (FORT.x1 + 8) * k, 0)
    g.addColorStop(0, rgba(HOLLOW, 0.55 * stand))
    g.addColorStop(1, rgba(SHADE, 0))
    ctx.fillStyle = g
    path(
      ctx,
      [
        [FORT.x1, FORT.towerTop + 0.4],
        [FORT.x1 + 7.5, FORT.towerTop + 2.2],
        [FORT.x1 + 8.5, FORT.foot + 0.5],
        [FORT.x1, FORT.foot],
      ],
      k,
    )
    ctx.fill()
  }
  ctx.save()
  // Nothing of it below the ground: it goes down into the crater its charges blew.
  ctx.beginPath()
  ctx.rect((FORT.x0 - 6) * k, (TOP - 2) * k, (FORT.x1 - FORT.x0 + 12) * k, (FORT.foot + 0.25 + down - TOP + 2) * k)
  ctx.clip()

  // The ground floor and its footing: the antechamber, the vault's face, the door, Eames.
  ctx.save()
  ctx.translate(0, down * k)
  drawGroundFloor(p, ctx, c, t, st)
  ctx.restore()

  // The upper floor: the left wing and the main block and the tower, cracking apart and tipping as they come down.
  const piece = (x0: number, x1: number, y1: number, turn: number, dx: number, drop: number, draw: () => void) => {
    const u = ss(tau / 1.1)
    ctx.save()
    const cx = ((x0 + x1) / 2) * k
    const cy = y1 * k
    ctx.translate(cx + dx * u * k, cy + (down + drop * u) * k)
    ctx.rotate(turn * u)
    ctx.translate(-cx, -cy)
    draw()
    ctx.restore()
  }
  piece(FORT.x0, FORT.wingX, FORT.upper, -0.22, -0.35, 1.6, () => drawWing(ctx, c))
  piece(FORT.wingX, FORT.towerX[0], FORT.upper, 0.07, 0.1, 1.1, () => drawMain(ctx, c, st))
  piece(FORT.towerX[0], FORT.x1, FORT.upper, 0.42, 0.7, 1.4, () => drawTower(ctx, c, st))
  ctx.restore()
  // The crater round its foot: the knoll's top blown out, rubble in it.
  if (down > 0.02) {
    const d = Math.min(down, 3.2)
    fill(
      ctx,
      [
        [FORT.x0 - 0.6, FORT.foot - 0.05],
        [FORT.x0 - 0.1, FORT.foot + d * 0.7],
        [FORT.x0 + 1.5, FORT.foot + d + 0.3],
        [FORT.x1 - 1.4, FORT.foot + d + 0.35],
        [FORT.x1 + 0.2, FORT.foot + d * 0.6],
        [FORT.x1 + 0.7, FORT.foot - 0.05],
        [FORT.x1 + 0.3, FORT.foot + 0.15],
        [FORT.x0 - 0.2, FORT.foot + 0.15],
      ],
      k,
      rgba(SNOW.rockDark, 0.55),
    )
    for (let i = 0; i < 9; i++) {
      const x = lerp(FORT.x0 + 0.2, FORT.x1 - 0.2, i / 8) + (hash(i, 3, 11) - 0.5) * 0.8
      const y = FORT.foot + 0.1 + hash(i, 4, 11) * 0.4
      const r = 0.25 + 0.35 * hash(i, 5, 11)
      fill(
        ctx,
        [
          [x - r, y + 0.1],
          [x - r * 0.4, y - r * 0.7],
          [x + r * 0.6, y - r * 0.5],
          [x + r, y + 0.1],
        ],
        k,
        i % 2 ? SNOW.concreteDark : SNOW.concrete,
      )
    }
  }
}

/** Concrete in the fortress's one ink: warm where the low sun rakes it from the west, cooler to the east and the foot. */
function concrete(ctx: C2D, c: Ctx, x0: number, y0: number, x1: number, y1: number, color = SNOW.concrete): void {
  const { k } = c
  rect(ctx, k, x0, y0, x1, y1)
  ctx.fillStyle = color
  ctx.fill()
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  g.addColorStop(0, rgba(SNOW.flash, 0.34))
  g.addColorStop(0.55, rgba(SNOW.flash, 0.08))
  g.addColorStop(1, rgba(SNOW.concreteDark, 0.22))
  ctx.fillStyle = g
  ctx.fill()
  const v = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  v.addColorStop(0.6, rgba(SNOW.concreteDark, 0))
  v.addColorStop(1, rgba(SNOW.concreteDark, 0.2))
  ctx.fillStyle = v
  ctx.fill()
  // The sunlit west edge.
  rect(ctx, k, x0, y0, x0 + 0.07, y1)
  ctx.fillStyle = rgba(SNOW.flash, 0.55)
  ctx.fill()
  rect(ctx, k, x0, y0, x1, y1)
  inked(ctx, c)
}

/** A long strip window, deep-set: one dark band, its mullions, a few panes with a cold light behind them. */
function strip(ctx: C2D, c: Ctx, x0: number, x1: number, y0: number, y1: number, st: number, seed: number): void {
  const { k } = c
  rect(ctx, k, x0, y0, x1, y1)
  ctx.fillStyle = mixHex(SNOW.vault, SNOW.concreteDark, 0.35)
  ctx.fill()
  const n = Math.max(1, Math.round((x1 - x0) / 0.8))
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    const lit = hash(i, seed, 5) < 0.32
    rect(ctx, k, x0 + w * i + 0.05, y0 + 0.05, x0 + w * (i + 1) - 0.05, y1 - 0.05)
    // The glass holds a little of the pale sky; some panes lit from within.
    ctx.fillStyle = lit ? rgba(mixHex(SNOW.bed, SNOW.flash, 0.5), 0.6 + 0.08 * Math.sin(st * 0.6 + i + seed)) : rgba(SNOW.sky, 0.22)
    ctx.fill()
  }
  ctx.strokeStyle = rgba(c.ink, 0.8)
  ctx.lineWidth = Math.max(0.5, c.weight * 0.45)
  for (let i = 1; i < n; i++) {
    ctx.beginPath()
    ctx.moveTo((x0 + w * i) * k, y0 * k)
    ctx.lineTo((x0 + w * i) * k, y1 * k)
    ctx.stroke()
  }
  rect(ctx, k, x0, y0, x1, y1)
  inked(ctx, c, 0.7)
  // The sill's shadow: the band is set deep in the concrete.
  rect(ctx, k, x0, y0, x1, y0 + 0.08)
  ctx.fillStyle = rgba(SNOW.vault, 0.4)
  ctx.fill()
}

/** Snow lying along a roof's edge. */
function snowcap(ctx: C2D, k: number, x0: number, x1: number, y: number, h = 0.13): void {
  fill(
    ctx,
    [
      [x0 - 0.04, y],
      [x1 + 0.04, y],
      [x1 - 0.02, y - h],
      [x0 + 0.08, y - h * 1.1],
    ],
    k,
    LIT,
  )
}

function drawWing(ctx: C2D, c: Ctx): void {
  const { k } = c
  concrete(ctx, c, FORT.x0, FORT.wingRoof, FORT.wingX, FORT.upper)
  concrete(ctx, c, FORT.x0 - 0.12, FORT.wingRoof - 0.18, FORT.wingX, FORT.wingRoof + 0.1, SNOW.concreteDark)
  strip(ctx, c, FORT.x0 + 0.45, FORT.wingX - 0.25, FORT.wingRoof + 0.85, FORT.wingRoof + 1.35, 0, 1)
  snowcap(ctx, k, FORT.x0 - 0.12, FORT.wingX, FORT.wingRoof - 0.18)
}

function drawMain(ctx: C2D, c: Ctx, st: number): void {
  const { k } = c
  const x0 = FORT.wingX
  const x1 = FORT.towerX[0]
  concrete(ctx, c, x0, FORT.roof, x1, FORT.upper)
  // Its parapet, and the plant room on the roof, set back.
  concrete(ctx, c, x0 + 1.2, FORT.roof - 0.55, x0 + 3.4, FORT.roof, SNOW.concreteDark)
  snowcap(ctx, k, x0 + 1.2, x0 + 3.4, FORT.roof - 0.55)
  concrete(ctx, c, x0 - 0.12, FORT.roof - 0.18, x1 + 0.05, FORT.roof + 0.12, SNOW.concreteDark)
  snowcap(ctx, k, x0 - 0.12, x1 + 0.05, FORT.roof - 0.18)
  // Two floors of wards behind long strip windows, and the fins between the bays.
  strip(ctx, c, x0 + 0.5, x1 - 0.5, FORT.roof + 0.75, FORT.roof + 1.3, st, 2)
  strip(ctx, c, x0 + 0.5, x1 - 0.5, FORT.roof + 2.35, FORT.roof + 2.9, st, 3)
  for (const fx of [x0 + 0.25, x0 + 3.0, x0 + 6.0, x1 - 0.25]) {
    rect(ctx, k, fx - 0.12, FORT.roof + 0.15, fx + 0.12, FORT.upper)
    ctx.fillStyle = SNOW.concrete
    ctx.fill()
    inked(ctx, c, 0.7)
    rect(ctx, k, fx + 0.04, FORT.roof + 0.15, fx + 0.12, FORT.upper)
    ctx.fillStyle = rgba(SNOW.concreteDark, 0.6)
    ctx.fill()
    rect(ctx, k, fx - 0.12, FORT.roof + 0.15, fx - 0.06, FORT.upper)
    ctx.fillStyle = rgba(SNOW.flash, 0.5)
    ctx.fill()
  }
}

function drawTower(ctx: C2D, c: Ctx, st: number): void {
  const { k } = c
  const [tx0, tx1] = FORT.towerX
  // The low annex at the corner, the tower (stairs and lifts: blind, one slit), the walkway to the mountain.
  concrete(ctx, c, tx1, FORT.roof + 1.0, FORT.x1, FORT.upper)
  concrete(ctx, c, tx0, FORT.towerTop, tx1, FORT.upper)
  concrete(ctx, c, tx0 - 0.1, FORT.towerTop - 0.16, tx1 + 0.1, FORT.towerTop + 0.14, SNOW.concreteDark)
  snowcap(ctx, k, tx0 - 0.1, tx1 + 0.1, FORT.towerTop - 0.16)
  strip(ctx, c, (tx0 + tx1) / 2 - 0.14, (tx0 + tx1) / 2 + 0.14, FORT.towerTop + 0.7, FORT.upper - 0.7, st, 4)
  const wy = FORT.towerTop + 1.5
  concrete(ctx, c, tx1, wy, tx1 + 3.1, wy + 0.6, SNOW.concreteDark)
  strip(ctx, c, tx1 + 0.2, tx1 + 2.9, wy + 0.18, wy + 0.4, st, 6)
  snowcap(ctx, k, tx1, tx1 + 3.1, wy, 0.09)
  rect(ctx, k, tx1 + 2.4, wy + 0.6, tx1 + 2.58, FORT.upper + 1.6)
  ctx.fillStyle = SNOW.concreteDark
  ctx.fill()
  inked(ctx, c, 0.7)
}

/**
 * The ground floor, cut away: the footing and its pillars (the charges on them), the floor, the antechamber from the
 * gate in the left wall, its lamps, and at its back the vault's steel face with the great round door; Eames by it.
 */
function drawGroundFloor(p: p5, ctx: C2D, c: Ctx, t: number, st: number): void {
  const { k } = c
  const fl = FORT.floor
  const x0 = FORT.x0
  const x1 = FORT.x1
  const w = FORT.wall
  // The footing: a slab on pillars, the charges strapped to them; the space between is dark.
  rect(ctx, k, x0, fl + FORT.slab, x1, FORT.foot)
  ctx.fillStyle = mixHex(SNOW.vault, SNOW.concreteDark, 0.35)
  ctx.fill()
  const blownPillars = t >= T.charges
  for (const px of [-5.2, -2.1, 1.0, 4.1]) {
    if (blownPillars) continue
    rect(ctx, k, px - 0.22, fl + FORT.slab, px + 0.22, FORT.foot)
    ctx.fillStyle = SNOW.concreteDark
    ctx.fill()
    inked(ctx, c, 0.6)
    // The charge: a dark pack with its small light (it blows on the beat before the kick).
    const blown = t >= T.charges
    if (!blown) {
      rect(ctx, k, px - 0.3, fl + 0.75, px + 0.3, fl + 1.15)
      ctx.fillStyle = SNOW.vault
      ctx.fill()
      inked(ctx, c, 0.5)
      const on = t > T.paddles ? 0.6 + 0.4 * Math.sin((t - T.paddles) * TAU * 1.05) : 0.35
      bloom(p, k, [px + 0.18, fl + 0.85], 0.12, SNOW.flash, 0.5 * on)
    }
  }
  rect(ctx, k, x0 - 0.2, FORT.foot - 0.35, x1 + 0.2, FORT.foot)
  ctx.fillStyle = SNOW.concreteDark
  ctx.fill()
  inked(ctx, c, 0.8)
  // The antechamber: its back wall in the cold light, the vault's face at its back.
  const back = ctx.createLinearGradient(0, FORT.ceil * k, 0, fl * k)
  back.addColorStop(0, mixHex(SNOW.concreteDark, SNOW.vault, 0.55))
  back.addColorStop(0.55, mixHex(SNOW.concreteDark, SNOW.vault, 0.3))
  back.addColorStop(1, mixHex(SNOW.concreteDark, SNOW.concrete, 0.25))
  rect(ctx, k, x0 + w, FORT.ceil, x1 - w, fl)
  ctx.fillStyle = back
  ctx.fill()
  // The long lamps along its ceiling and their light on the wall and floor (cold, even).
  // On the paddles the power surges through them: they dip and flare, and settle.
  const surge = t >= T.paddles && t < T.paddles + 0.6 ? Math.sin(((t - T.paddles) / 0.6) * Math.PI * 3) * Math.exp(-(t - T.paddles) / 0.2) : 0
  const lamp = clamp01(1 + surge * 0.9)
  for (const lx of [-5.0, -2.2, 3.2, 5.6]) {
    rect(ctx, k, lx - 0.55, FORT.ceil + 0.02, lx + 0.55, FORT.ceil + 0.1)
    ctx.fillStyle = mixHex(SNOW.concreteDark, mixHex(SNOW.snow, SNOW.flash, 0.3), lamp)
    ctx.fill()
    pool(p, k, [lx, fl], 1.3, 0.22, SNOW.snow, 0.28 * lamp + 0.15 * Math.max(0, surge))
    bloom(p, k, [lx, FORT.ceil + 0.15], 0.9, SNOW.snow, 0.12 * lamp)
  }
  // As the charges go, dust sifts down out of the ceiling's cracks.
  const sagging = clamp01((t - T.charges) / 0.3)
  if (sagging > 0 && t < T.kick + 1) {
    for (let i = 0; i < 9; i++) {
      const x = -6 + i * 1.45 + hash(i, 4, 9) * 0.6
      const drop = ((t - T.charges) * (1.5 + hash(i, 5, 9)) + hash(i, 6, 9)) % 2.8
      const g = ctx.createLinearGradient(0, (FORT.ceil + drop - 0.8) * k, 0, (FORT.ceil + drop) * k)
      g.addColorStop(0, rgba(SNOW.snowShade, 0))
      g.addColorStop(1, rgba(SNOW.snowShade, 0.5 * sagging))
      ctx.fillStyle = g
      ctx.fillRect((x - 0.05) * k, (FORT.ceil + Math.max(0, drop - 0.8)) * k, 0.1 * k, Math.min(drop, 0.8) * k)
    }
  }
  drawVaultFace(p, ctx, c, t)
  drawEames(ctx, c, t)
  // The floor: a slab, its cut edge in section.
  rect(ctx, k, x0, fl, x1, fl + FORT.slab)
  ctx.fillStyle = SNOW.concreteDark
  ctx.fill()
  inked(ctx, c)
  // The ceiling's slab (the upper floor stands on it), in section.
  rect(ctx, k, x0, FORT.upper, x1, FORT.ceil)
  ctx.fillStyle = SNOW.concreteDark
  ctx.fill()
  inked(ctx, c)
  // The walls, in section: the left with the gate in it, the right plain.
  const gateTop = fl - FORT.gateH
  rect(ctx, k, x0, FORT.ceil, x0 + w, gateTop)
  ctx.fillStyle = SNOW.concreteDark
  ctx.fill()
  inked(ctx, c)
  rect(ctx, k, x1 - w, FORT.ceil, x1, fl)
  ctx.fillStyle = SNOW.concreteDark
  ctx.fill()
  inked(ctx, c)
  // The gate: a steel shutter that runs up into the wall on bar 37.
  const up = ss((t - T.gate) / 0.55)
  const shut = FORT.gateH * (1 - up)
  if (shut > 0.02) {
    rect(ctx, k, x0 + 0.04, gateTop, x0 + w - 0.04, gateTop + shut)
    ctx.fillStyle = SNOW.rock
    ctx.fill()
    inked(ctx, c, 0.8)
    // Its slats.
    ctx.strokeStyle = rgba(SNOW.vault, 0.5)
    ctx.lineWidth = Math.max(0.6, c.weight * 0.4)
    for (let y = gateTop + 0.3; y < gateTop + shut - 0.05; y += 0.3) {
      ctx.beginPath()
      ctx.moveTo((x0 + 0.06) * k, y * k)
      ctx.lineTo((x0 + w - 0.06) * k, y * k)
      ctx.stroke()
    }
  }
  // Its lamp over the gate, outside: a hooded light, cold.
  rect(ctx, k, x0 - 0.42, gateTop - 0.32, x0, gateTop - 0.16)
  ctx.fillStyle = SNOW.concreteDark
  ctx.fill()
  inked(ctx, c, 0.6)
  void st
}

/** The vault's steel face with the great round door: its wheel, its bolts; rolled aside, the vault lit behind it. */
function drawVaultFace(p: p5, ctx: C2D, c: Ctx, t: number): void {
  const { k } = c
  const [vx0, vx1] = FORT.vault
  const fl = FORT.floor
  const steel = mixHex(SNOW.rock, SNOW.concreteDark, 0.4)
  rect(ctx, k, vx0, FORT.ceil, vx1, fl)
  ctx.fillStyle = steel
  ctx.fill()
  inked(ctx, c, 0.8)
  // Its plates: a few long seams, soft.
  ctx.fillStyle = rgba(SNOW.vault, 0.22)
  for (const sx of [vx0 + 1.7, vx0 + 3.6]) ctx.fillRect((sx - 0.02) * k, FORT.ceil * k, 0.04 * k, (fl - FORT.ceil) * k)
  const [dx, dy] = FORT.door
  const r = FORT.doorR
  // The frame: a heavy ring round the doorway.
  ctx.beginPath()
  ctx.arc(dx * k, dy * k, (r + 0.22) * k, 0, TAU)
  ctx.fillStyle = mixHex(steel, SNOW.vault, 0.45)
  ctx.fill()
  inked(ctx, c, 0.8)
  // The doorway: the vault inside, lit, seen as the door rolls aside.
  const d = doorAt(t)
  ctx.save()
  ctx.beginPath()
  ctx.arc(dx * k, dy * k, r * k, 0, TAU)
  ctx.clip()
  drawVaultInside(p, ctx, c, t)
  ctx.restore()
  // The door: a steel disc, rolled right along its rail as it opens (turning as a wheel turns).
  const cx = lerp(dx, FORT.doorTo, d.roll)
  const turn = -((cx - dx) / r)
  // Its rail along the face, on a sill down to the floor (it ended a little above the floor, a bar floating there).
  rect(ctx, k, dx - r * 0.4, dy + r + 0.02, FORT.doorTo + r + 0.1, FLOOR_Y)
  ctx.fillStyle = SNOW.vault
  ctx.fill()
  drawDoor(ctx, c, [cx, dy], r, turn, d.wheel, d.bolts)
  // The lamp's warmth out through the open doorway, across the antechamber's floor to the son at its sill: the
  // first warm light he has stood in, the whole dream. It goes out with the kick.
  const warm = d.roll * (t < T.kick ? 1 : 0)
  if (warm > 0.003) {
    pool(p, k, [dx - 0.25, fl - 0.04], 2.1, 0.32, SNOW.pinwheel, 0.34 * warm)
    pool(p, k, [dx - 0.1, fl - 0.04], 1.0, 0.18, mixHex(SNOW.pinwheel, SNOW.flash, 0.4), 0.3 * warm)
    bloom(p, k, [dx, dy + 0.35 * r], 1.6 * r, SNOW.pinwheel, 0.12 * warm)
  }
}

function drawDoor(ctx: C2D, c: Ctx, [cx, cy]: Pt, r: number, turn: number, wheel: number, bolts: number): void {
  const { k } = c
  const face = mixHex(SNOW.rock, SNOW.snowDeep, 0.25)
  ctx.save()
  ctx.translate(cx * k, cy * k)
  ctx.beginPath()
  ctx.arc(0, 0, r * k, 0, TAU)
  ctx.fillStyle = face
  ctx.fill()
  inked(ctx, c)
  // A ring inset, and the light on its upper left.
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.78 * k, 0, TAU)
  ctx.strokeStyle = rgba(SNOW.vault, 0.35)
  ctx.lineWidth = Math.max(0.8, 0.05 * k)
  ctx.stroke()
  const g = ctx.createRadialGradient(-0.35 * r * k, -0.4 * r * k, 0, 0, 0, r * k)
  g.addColorStop(0, rgba(SNOW.snow, 0.28))
  g.addColorStop(1, rgba(SNOW.snow, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * k, 0, TAU)
  ctx.fill()
  // The bolts round its edge: short bars that draw in as the wheel turns.
  ctx.rotate(turn)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU
    const out = r * (0.97 - 0.12 * bolts)
    ctx.save()
    ctx.rotate(a)
    ctx.fillStyle = SNOW.vault
    ctx.fillRect((out - 0.16) * k, -0.045 * k, 0.16 * k, 0.09 * k)
    ctx.restore()
  }
  // The wheel: a hub and three spokes to a rim, turning.
  ctx.rotate(wheel)
  ctx.lineCap = 'round'
  ctx.strokeStyle = SNOW.vault
  ctx.lineWidth = Math.max(1, 0.07 * k)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(a) * 0.36 * r * k, Math.sin(a) * 0.36 * r * k)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(0, 0, 0.36 * r * k, 0, TAU)
  ctx.lineWidth = Math.max(1, 0.06 * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, 0.09 * r * k, 0, TAU)
  ctx.fillStyle = SNOW.vault
  ctx.fill()
  ctx.restore()
}

/** Inside the vault: a steel room lit from above, the bed, the old man under the sheet, the bedside and the pinwheel. */
function drawVaultInside(p: p5, ctx: C2D, c: Ctx, t: number): void {
  const { k } = c
  const [dx, dy] = FORT.door
  const r = FORT.doorR
  const fl = FORT.floor
  const g = ctx.createLinearGradient(0, (dy - r) * k, 0, fl * k)
  g.addColorStop(0, mixHex(SNOW.snowShade, SNOW.rock, 0.35))
  g.addColorStop(1, mixHex(SNOW.rock, SNOW.vault, 0.25))
  ctx.fillStyle = g
  ctx.fillRect((dx - r) * k, (dy - r) * k, 2 * r * k, 2 * r * k)
  // The lamp's light down on the bed: the one warm light in the fortress.
  pool(p, k, [dx + 0.2, fl - 0.55], 1.1, 0.45, SNOW.pinwheel, 0.42)
  bloom(p, k, [dx + 0.1, dy - r + 0.1], 0.9, SNOW.flash, 0.3)
  // The bed: legs, the mattress, the sheet over him, the pillow at the right, by the bedside and its pinwheel.
  const bx0 = dx - 0.75
  const bx1 = dx + 0.55
  const top = fl - 0.62
  ctx.fillStyle = SNOW.vault
  ctx.fillRect(bx0 * k, top * k, 0.06 * k, (fl - top) * k)
  ctx.fillRect((bx1 - 0.06) * k, top * k, 0.06 * k, (fl - top) * k)
  rect(ctx, k, bx0, top, bx1, top + 0.14)
  ctx.fillStyle = mixHex(SNOW.bed, SNOW.snowShade, 0.3)
  ctx.fill()
  inked(ctx, c, 0.6)
  // The old man: the sheet over him in one pale mound, his head dark on the pillow; his breathing, until it stops.
  const breath = t < T.pinwheel ? 0.025 * Math.sin((t - T.paddles) * 2.2) : 0
  fill(
    ctx,
    [
      [bx0, top],
      [bx0 + 0.08, top - 0.12],
      [bx0 + 0.3, top - 0.18],
      [bx1 - 0.55, top - 0.26 - breath],
      [bx1 - 0.3, top - 0.2],
      [bx1 - 0.1, top],
    ],
    k,
    SNOW.bed,
  )
  ctx.beginPath()
  ctx.ellipse((bx1 - 0.2) * k, (top - 0.17) * k, 0.13 * k, 0.11 * k, 0, 0, TAU)
  ctx.fillStyle = mixHex(SNOW.vault, SNOW.rockDark, 0.4)
  ctx.fill()
  // The bedside table at the head, and on it the pinwheel: a child's paper windmill on a stick.
  const tx = dx + 0.74
  rect(ctx, k, tx - 0.15, fl - 0.5, tx + 0.15, fl)
  ctx.fillStyle = SNOW.rockDark
  ctx.fill()
  inked(ctx, c, 0.5)
  const hub: Pt = [tx, fl - 1.04]
  ctx.strokeStyle = SNOW.rockDark
  ctx.lineWidth = Math.max(1, 0.03 * k)
  ctx.beginPath()
  ctx.moveTo(tx * k, (fl - 0.5) * k)
  ctx.lineTo(hub[0] * k, hub[1] * k)
  ctx.stroke()
  const a0 = pinwheelAt(t)
  for (let i = 0; i < 4; i++) {
    const a = a0 + (i * TAU) / 4
    const L = 0.21
    const tip: Pt = [hub[0] + Math.cos(a) * L, hub[1] + Math.sin(a) * L]
    const side: Pt = [hub[0] + Math.cos(a + 0.9) * L * 0.62, hub[1] + Math.sin(a + 0.9) * L * 0.62]
    fill(ctx, [hub, tip, side], k, i % 2 ? SNOW.pinwheel : mixHex(SNOW.pinwheel, SNOW.bed, 0.45))
  }
  ctx.beginPath()
  ctx.arc(hub[0] * k, hub[1] * k, 0.025 * k, 0, TAU)
  ctx.fillStyle = SNOW.rockDark
  ctx.fill()
}

/**
 * Eames, one quiet silhouette: kneeling by the vault's door with the paddles, waiting; on bar 49 he presses them, and
 * then gets up and steps back behind the others, out of the way of the door and of the son at his father's bed.
 */
function drawEames(ctx: C2D, c: Ctx, t: number): void {
  const { k } = c
  const fl = FORT.floor
  // Leaning over Fischer from a little after the shot (when he came up) to the paddles; then up and away.
  const over = t < T.shot + 1 ? 0 : ss((t - T.shot - 1) / 1.5) * (1 - ss((t - T.paddles - 0.25) / 0.35))
  const rise = ss((t - T.paddles - 0.28) / 0.4)
  const walk = ss((t - T.paddles - 0.42) / 0.8)
  const x = lerp(1.02, -1.15, walk)
  const dark = mixHex(SNOW.vault, SNOW.rockDark, 0.2)
  const jolt = t >= T.paddles ? Math.exp(-(t - T.paddles) / 0.12) : 0
  if (rise < 0.02) {
    const lean = 0.1 + 0.25 * over
    const head: Pt = [x - lean * 0.9, fl - 1.05 + lean * 0.35]
    // Knees and shins on the floor, the back, the shoulders, the head.
    fill(
      ctx,
      [
        [x - 0.12, fl],
        [x + 0.55, fl],
        [x + 0.5, fl - 0.18],
        [x + 0.25, fl - 0.34],
        [x + 0.18, fl - 0.62],
        [head[0] + 0.2, head[1] + 0.3],
        [head[0] - 0.12, head[1] + 0.3],
        [x - 0.1 - lean * 0.2, fl - 0.45],
      ],
      k,
      dark,
    )
    ctx.beginPath()
    ctx.ellipse(head[0] * k, head[1] * k, 0.12 * k, 0.14 * k, 0, 0, TAU)
    ctx.fillStyle = dark
    ctx.fill()
    // The arms down to the paddles (on Fischer's chest while he presses them).
    const hand: Pt = [lerp(x - 0.05, x - 0.3, over), lerp(fl - 0.4, fl - 0.24, over)]
    ctx.strokeStyle = dark
    ctx.lineWidth = Math.max(1, 0.08 * k)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo((head[0] + 0.05) * k, (head[1] + 0.3) * k)
    ctx.lineTo(hand[0] * k, hand[1] * k)
    ctx.stroke()
    if (over > 0.05) {
      rect(ctx, k, hand[0] - 0.09, hand[1] - 0.04, hand[0] + 0.05, hand[1] + 0.05)
      ctx.fillStyle = SNOW.rockDark
      ctx.fill()
    }
    // A dim rim where the lamps catch his back (bright for a moment as the paddles fire).
    ctx.strokeStyle = rgba(SNOW.snow, 0.35 + 0.6 * jolt)
    ctx.lineWidth = Math.max(0.6, 0.025 * k)
    ctx.beginPath()
    ctx.moveTo((x + 0.18) * k, (fl - 0.62) * k)
    ctx.lineTo((head[0] + 0.2) * k, (head[1] + 0.3) * k)
    ctx.stroke()
    return
  }
  // Standing (rising from his knees), then stepping back along the face: one figure, head and shoulders and coat.
  const h = lerp(1.0, 1.75, rise)
  const top = fl - h
  const S = 0.9
  fill(
    ctx,
    [
      [x - 0.26 * S, fl],
      [x - 0.3 * S, top + 0.55],
      [x - 0.2 * S, top + 0.36],
      [x + 0.2 * S, top + 0.36],
      [x + 0.3 * S, top + 0.55],
      [x + 0.26 * S, fl],
    ],
    k,
    dark,
  )
  ctx.beginPath()
  ctx.ellipse(x * k, (top + 0.17) * k, 0.12 * k, 0.15 * k, 0, 0, TAU)
  ctx.fillStyle = dark
  ctx.fill()
  ctx.strokeStyle = rgba(SNOW.snow, 0.3)
  ctx.lineWidth = Math.max(0.6, 0.025 * k)
  ctx.beginPath()
  ctx.moveTo((x - 0.28 * S) * k, (top + 0.56) * k)
  ctx.lineTo((x - 0.2 * S) * k, (top + 0.37) * k)
  ctx.lineTo((x - 0.05) * k, (top + 0.33) * k)
  ctx.stroke()
}

/* ------------------------------------------------------------------ outside: the case */

/** The case by the gate, waiting for them: shut, and on bar 39 open, its lines out to them. */
function drawOutside(ctx: C2D, c: Ctx, t: number): void {
  const { k } = c
  const x = CASE_X
  const y = FLOOR_Y
  const open = ss((t - T.case) / 0.3)
  rect(ctx, k, x - 0.17, y - 0.16, x + 0.17, y)
  ctx.fillStyle = PLANE.case
  ctx.fill()
  inked(ctx, c, 0.6)
  // The lid swings up about its back edge.
  ctx.save()
  ctx.translate((x - 0.17) * k, (y - 0.16) * k)
  ctx.rotate(-open * 1.35)
  rect(ctx, k, 0, -0.05, 0.34, 0)
  ctx.fillStyle = PLANE.caseDark
  ctx.fill()
  inked(ctx, c, 0.5)
  ctx.restore()
}

/* ------------------------------------------------------------------ the fortress's dust, and the snow */

/** The dust and snow thrown up as the fortress comes down: soft, rising and spreading on the snow's clock. */
function drawCollapseDust(ctx: C2D, c: Ctx, t: number): void {
  const { k } = c
  const { sag, tau } = collapse(t)
  if (sag <= 0.01 && tau <= 0) return
  const grow = tau > 0 ? 1 - Math.exp(-tau / 0.7) : 0
  const a = clamp01(sag / DROP) * 0.22 + grow * 0.2
  for (let i = 0; i < 6; i++) {
    const x = lerp(FORT.x0 - 0.5, FORT.x1 + 0.5, i / 5) + (hash(i, 9, 3) - 0.5) * 1.2
    const y = FORT.foot - 0.2 - grow * (0.8 + 1.6 * hash(i, 8, 3))
    const r = 1.0 + grow * (1.2 + 0.8 * hash(i, 7, 3)) + sag * 0.15
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
    g.addColorStop(0, rgba(mixHex(SNOW.snowShade, SNOW.concrete, 0.35), a))
    g.addColorStop(0.6, rgba(SNOW.snowShade, a * 0.35))
    g.addColorStop(1, rgba(SNOW.snowShade, 0))
    ctx.fillStyle = g
    ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  }
}

/**
 * The snow falling, on the snow's own clock (while he is in limbo it hangs in the air): flakes of many sizes, soft,
 * sparse, drifting; in `near` a few bigger ones out of focus, in front of everything. While the fortress stands
 * (`indoors`), none falls in its ground floor: the antechamber, the vault and the footing under them are inside.
 */
function drawSnowfall(ctx: C2D, k: number, f: ReturnType<typeof frame>, st: number, near: boolean, indoors: boolean): void {
  const S = 4
  const per = near ? (k > 70 ? 5 : k > 40 ? 2 : 1) : k < 8 ? 3 : 7
  const i0 = Math.floor((f.x0 - 1) / S)
  const i1 = Math.floor((f.x1 + 1) / S)
  const j0 = Math.floor(Math.max(TOP, f.y0 - 1) / S)
  const j1 = Math.floor(Math.min(BOTTOM, f.y1 + 1) / S)
  const breath = 0.8 + 0.4 * level(0)
  void breath
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      for (let n = 0; n < per; n++) {
        const h1 = hash(i, j * 31 + n, near ? 71 : 70)
        const h2 = hash(i * 7 + n, j, near ? 73 : 72)
        const h3 = hash(n, i + j * 13, 74)
        const speed = near ? 0.9 + 0.5 * h3 : 0.35 + 0.45 * h3
        const drift = (((h1 * S + st * 0.12) % S) + S) % S
        const x = i * S + drift + Math.sin(st * (0.5 + h2) + h1 * 9) * 0.25
        const y = j * S + ((h2 * S + st * speed) % S)
        if (indoors && x > FORT.x0 && x < FORT.x1 && y > FORT.ceil && y < FORT.foot + 1.5) continue
        const r = near ? 0.035 + 0.03 * h1 : 0.018 + 0.04 * h3 * h3
        const a = near ? 0.5 : 0.35 + 0.45 * h1
        if (r * k < 0.5 && !near) continue
        if (near) {
          // Out of focus, close to the lens: a soft spot, never a disc.
          const R = r * 2.2 * k
          const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, R)
          g.addColorStop(0, rgba(SNOW.snow, a))
          g.addColorStop(1, rgba(SNOW.snow, 0))
          ctx.fillStyle = g
          ctx.fillRect(x * k - R, y * k - R, 2 * R, 2 * R)
          continue
        }
        ctx.fillStyle = rgba(SNOW.snow, a)
        ctx.beginPath()
        ctx.arc(x * k, y * k, Math.max(0.6, r * k), 0, TAU)
        ctx.fill()
      }
    }
  }
}
