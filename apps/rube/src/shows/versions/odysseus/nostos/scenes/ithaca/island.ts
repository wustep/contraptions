import { blob, circle, fill, hash, mix, poly, rgba, smooth, stroke, type Paint } from '../../draw'
import { skyAt } from '../../world/sky'
import type { Pt } from '../../path'
import { BEACH, CLIFF_E, CLIFF_W, JETTY, TOP } from './geo'
import { BARK, OLIVE, OLIVE_DARK, ROCK, ROCK_DEEP, SAND_C, SCRUB, SCRUB_DARK, STONE, STONE_DEEP, STONE_SHADE, againstSun, nightness } from './look'

/**
 * The island, outside: one mass of limestone standing out of the sea, its east face sheer over a little beach, its west
 * face stepping down to the harbour; scrub in its ledges, olive trees on its top. Under the waterline it goes on down,
 * seen through the water like everything else in the cutaway sea. Drawn behind the palace and the balls.
 */

/** The island's outline, east foot to west foot, top edge first (y up is negative). */
const OUTLINE: Pt[] = [
  [793.5, 7],
  [795.6, 2.2],
  [797.0, 0.4],
  [BEACH.x0, BEACH.sand],
  [BEACH.x1, BEACH.sand],
  [805.5, -0.42],
  [CLIFF_E.foot, -0.9],
  [806.62, -2.6],
  [806.95, -3.7],
  [806.8, -5.3],
  [807.15, -6.8],
  [807.1, -8.2],
  [CLIFF_E.top, TOP],
  [CLIFF_W.top, TOP],
  [831.0, -8.85],
  [831.5, -8.1],
  [832.0, -6.6],
  [833.4, -5.7],
  [833.9, -3.9],
  [835.3, -3.0],
  [CLIFF_W.foot, -1.1],
  [836.9, 0.6],
  [839.0, 3.5],
  [842.0, 8],
]

/** The faces in shade, east and west: each a darker plane from the foot to the top. */
const SHADE_E: Pt[] = [[805.5, -0.42], [CLIFF_E.foot, -0.9], [806.62, -2.6], [806.95, -3.7], [806.8, -5.3], [807.15, -6.8], [807.1, -8.2], [CLIFF_E.top, TOP], [808.3, TOP], [807.9, -6], [807.7, -2.6], [806.9, 0.3]]
const SHADE_W: Pt[] = [[CLIFF_W.top, TOP], [831.5, -8.1], [832.0, -6.6], [833.4, -5.7], [833.9, -3.9], [835.3, -3.0], [CLIFF_W.foot, -1.1], [836.9, 0.6], [834.6, 0.6], [833.0, -2.8], [831.2, -6.2], [829.9, TOP]]

/** Bands of the cliff's strata: long, few, each a darker step of the stone. */
const STRATA: { y: number; x0: number; x1: number; h: number }[] = [
  { y: -2.1, x0: 806.5, x1: 810.5, h: 0.32 },
  { y: -4.6, x0: 806.9, x1: 810.5, h: 0.26 },
  { y: -7.1, x0: 807.1, x1: 810.5, h: 0.3 },
  { y: -4.2, x0: 829.5, x1: 834.0, h: 0.28 },
  { y: -6.9, x0: 829.8, x1: 832.1, h: 0.24 },
]

/** Scrub in the cliff's ledges and along the top: a few rounded clumps. */
const SCRUBS: [number, number, number][] = [
  [806.95, -3.72, 0.28],
  [807.15, -6.82, 0.26],
  [808.0, -9.02, 0.3],
  [812.6, -9.02, 0.26],
  [829.6, -9.02, 0.32],
  [831.6, -8.12, 0.26],
  [833.5, -5.72, 0.3],
  [835.4, -3.02, 0.26],
  [805.0, -0.4, 0.22],
]

/** The olive trees on the top: where each stands, how tall, and how it leans. */
const OLIVES: [number, number, number][] = [
  [811.3, 1.9, -0.1],
  [829.7, 1.5, -0.06],
]

/** The rock by night: down nearer the dark than the rest of the outdoors, so the lit house is the one bright thing on it. */
const NIGHT_ROCK = '#151A22'
const rock = (hex: string, t: number): string => mix(againstSun(hex, t), NIGHT_ROCK, 0.5 * nightness(t))

export function drawIsland(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 792 || view.x0 > 844) return
  const stone = rock(STONE, t)
  const shade = rock(STONE_SHADE, t)
  // Whichever face the sun or the moon is on is the lit one; the other is in its own shadow.
  const disc = skyAt(t).disc
  const fromWest = disc ? smooth(disc.x, 0.35, 0.65) * Math.min(1, disc.a * 1.5) : 0.5
  const deep = rock(STONE_DEEP, t)
  const ink = againstSun('#2B261F', t)
  // The rock under the sea, and the mass itself.
  blob(ctx, OUTLINE)
  fill(ctx, stone)
  // The faces in shade: the east face and the west face, a darker plane each.
  poly(ctx, SHADE_E)
  fill(ctx, mix(stone, shade, 0.35 + 0.65 * fromWest))
  poly(ctx, SHADE_W)
  fill(ctx, mix(stone, shade, 1 - 0.65 * fromWest))
  for (const s of STRATA) {
    poly(ctx, [[s.x0, s.y], [s.x1, s.y - 0.1], [s.x1, s.y + s.h], [s.x0 + 0.1, s.y + s.h * 1.1]])
    fill(ctx, rgba(deep, 0.45))
  }
  // The island's foot under the water: rock, darker, going down out of sight.
  poly(ctx, [[795.6, 2.2], [797.0, 0.4], [836.9, 0.6], [839.0, 3.5], [842.0, 8], [793.5, 8]])
  fill(ctx, rock(ROCK, t))
  poly(ctx, [[794.8, 4.4], [840.6, 5.4], [842.0, 8], [793.5, 8]])
  fill(ctx, rock(ROCK_DEEP, t))
  // The beach: the sand where he comes ashore, flat, running into the water.
  poly(ctx, [[797.0, 0.45], [BEACH.x0, BEACH.sand], [BEACH.x1, BEACH.sand], [805.5, -0.42], [805.7, 0.6]])
  fill(ctx, againstSun(SAND_C, t))
  blob(ctx, OUTLINE)
  stroke(g, ink, 1.6)
  // The top's skin: a band of earth and dry grass along the plateau, so the ground he stands on is ground.
  poly(ctx, [[CLIFF_E.top, TOP], [CLIFF_W.top, TOP], [CLIFF_W.top - 0.4, TOP + 0.16], [CLIFF_E.top + 0.3, TOP + 0.2]])
  fill(ctx, againstSun('#8C7F5E', t))
  poly(ctx, [[CLIFF_E.top, TOP], [CLIFF_W.top, TOP], [CLIFF_W.top - 0.2, TOP + 0.05], [CLIFF_E.top + 0.15, TOP + 0.06]])
  fill(ctx, againstSun('#A8996C', t))
  for (const [x, y, r] of SCRUBS) drawScrub(g, x, y, r)
  for (const [x, h, lean] of OLIVES) drawOlive(g, x, TOP, h, lean)
  drawJetty(g)
}

function drawScrub(g: Paint, x: number, y: number, r: number): void {
  const { ctx, t } = g
  ctx.beginPath()
  ctx.ellipse(x, y - r * 0.35, r, r * 0.55, 0, Math.PI, 0)
  ctx.ellipse(x + r * 0.5, y - r * 0.2, r * 0.6, r * 0.4, 0, Math.PI, 0)
  ctx.closePath()
  fill(ctx, againstSun(hash(Math.round(x * 10)) > 0.5 ? SCRUB : SCRUB_DARK, t))
}

/** An olive tree: a twisted trunk and a few silvery-green masses of leaf that sway a little in the wind. */
export function drawOlive(g: Paint, x: number, ground: number, h: number, lean: number): void {
  const { ctx, t } = g
  const sway = Math.sin(t * 0.7 + x) * 0.03
  const bark = againstSun(BARK, t)
  ctx.beginPath()
  ctx.moveTo(x - 0.22, ground)
  ctx.quadraticCurveTo(x - 0.05 + lean * h * 0.3, ground - h * 0.35, x + lean * h * 0.55, ground - h * 0.62)
  ctx.lineTo(x + lean * h * 0.55 + 0.16, ground - h * 0.6)
  ctx.quadraticCurveTo(x + 0.12 + lean * h * 0.25, ground - h * 0.3, x + 0.24, ground)
  ctx.closePath()
  fill(ctx, bark)
  const cx = x + lean * h * 0.6 + sway * h
  const cy = ground - h * 0.78
  const masses: [number, number, number, number][] = [
    [-0.55, 0.05, 0.62, 0.36],
    [0.45, 0.1, 0.58, 0.34],
    [0, -0.28, 0.7, 0.38],
    [-0.15, 0.25, 0.5, 0.26],
  ]
  for (const [dx, dy, rx, ry] of masses) {
    ctx.beginPath()
    ctx.ellipse(cx + dx * h * 0.5, cy + dy * h * 0.5, rx * h * 0.5, ry * h * 0.5, 0, 0, Math.PI * 2)
    fill(ctx, againstSun(dy < 0 ? OLIVE : OLIVE_DARK, t))
  }
}

/** The harbour's jetty: a stone pier on the west side, its top just over the water. */
function drawJetty(g: Paint): void {
  const { ctx, t } = g
  poly(ctx, [[JETTY.x0, JETTY.top], [JETTY.x1, JETTY.top], [JETTY.x1 + 0.1, 3], [JETTY.x0 - 0.4, 3]])
  fill(ctx, againstSun(STONE_SHADE, t))
  poly(ctx, [[JETTY.x0, JETTY.top], [JETTY.x1, JETTY.top], [JETTY.x1, JETTY.top + 0.2], [JETTY.x0, JETTY.top + 0.2]])
  fill(ctx, againstSun(STONE, t))
  // A bollard for the skiff's line.
  circle(ctx, JETTY.x1 - 0.5, JETTY.top - 0.14, 0.12)
  fill(ctx, againstSun(STONE_DEEP, t))
  void mix
}
