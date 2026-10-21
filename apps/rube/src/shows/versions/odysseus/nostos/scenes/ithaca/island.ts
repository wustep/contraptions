import { blob, circle, fill, hash, mix, poly, rgba, smooth, stroke, type Paint } from '../../draw'
import { layer } from '../../world/depth'
import { skyAt } from '../../world/sky'
import type { Pt } from '../../path'
import { BEACH, CLIFF_E, CLIFF_W, JETTY, TOP, TRIAL } from './geo'
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

/**
 * The cliff's beds: where each ledge comes out of a face (`edge`, run out a little past it, for the island's outline
 * to cut), how far it runs into the rock before it is lost (`into`), and the depth of the shadow under it at the face.
 */
const LEDGES: { y: number; edge: number; into: number; h: number }[] = [
  { y: -2.1, edge: 806.2, into: 812.6, h: 0.3 },
  { y: -4.6, edge: 806.5, into: 811.8, h: 0.24 },
  { y: -7.1, edge: 806.8, into: 813.2, h: 0.28 },
  { y: -4.2, edge: 834.2, into: 829.4, h: 0.26 },
  { y: -6.9, edge: 832.3, into: 828.2, h: 0.22 },
]

/** The cliff's foot along the south face, dark where the sea wets it: its top as [x, y], east to west, thinning out by the beach. */
const WET: Pt[] = [[CLIFF_E.foot, 0.3], [807.0, -0.55], [807.9, -0.85], [810.5, -0.95], [813.8, -0.8], [817.2, -1.0], [821.0, -0.85], [825.4, -0.98], [829.6, -0.82], [833.4, -0.92], [CLIFF_W.foot, -1.1]]

/** Scrub along the top and at the beach's foot: a few rounded clumps. */
const SCRUBS: [number, number, number][] = [
  [808.0, -9.02, 0.3],
  [812.6, -9.02, 0.26],
  [829.6, -9.02, 0.32],
  [805.0, -0.4, 0.22],
]

/** The olive trees on the top: where each stands, how tall, and how it leans. */
const OLIVES: [number, number, number][] = [
  [811.3, 1.9, -0.1],
  [829.7, 1.5, -0.06],
]

/**
 * The rock by night: down nearly to the dark, darker than the sky over it, so the island is one silhouette in its sea
 * under the moon and the lit house is the one bright thing on it.
 */
const NIGHT_ROCK = '#151A22'
// In the west at the end it is the one warm dark against the sunset (`againstSun`), not the night's.
const rock = (hex: string, t: number): string => mix(againstSun(hex, t), NIGHT_ROCK, (0.85 - 0.35 * smooth(t, TRIAL.fade - 1.3, TRIAL.fade + 1.0)) * nightness(t))

/** The islands off Ithaca to the east, low on the horizon: [middle, width, height], as if in the action's plane. */
const FAR_ISLANDS: [number, number, number][] = [
  [781, 15, 2.4],
  [767, 9, 1.3],
]

/**
 * The neighbour islands, far off to the east on the horizon, paled into the air (by night, dark against the sky):
 * the sea he came over is not empty. Not in the west at the end, where there is nothing ahead but the sun.
 */
function drawFar(g: Paint): void {
  const { ctx, t, view } = g
  // Out as the camera comes away to the west; in only once it is well over the island, so the piece's edge never cuts
  // them off in one frame.
  const gone = Math.max(smooth(t, TRIAL.fade - 1.3, TRIAL.fade), 1 - smooth(view.cx, 790, 799))
  if (gone >= 1) return
  const L = layer(view, 80)
  const air = skyAt(t).low
  const color = mix(mix(ROCK_DEEP, air, 0.62), NIGHT_ROCK, 0.6 * nightness(t))
  for (const [x, w, h] of FAR_ISLANDS) {
    if (L.x(x + w / 2) < view.x0 || L.x(x - w / 2) > view.x1) continue
    const pts: Pt[] = []
    for (let k = 0; k <= 10; k++) {
      const u = k / 10
      const y = -h * Math.pow(Math.sin(Math.PI * u), 0.6) * (0.85 + 0.15 * hash(k, Math.round(x)))
      pts.push([L.x(x - w / 2 + w * u), L.hy + y * L.s])
    }
    // On the horizon itself: they are far enough off that their shores are down at it, however high the camera is.
    pts.push([L.x(x + w / 2), L.hy + 0.02 * L.s], [L.x(x - w / 2), L.hy + 0.02 * L.s])
    poly(ctx, pts)
    fill(ctx, rgba(color, 1 - gone))
  }
}

export function drawIsland(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 792 || view.x0 > 844) return
  drawFar(g)
  const stone = rock(STONE, t)
  const shade = rock(STONE_SHADE, t)
  // Whichever face the sun or the moon is on is the lit one, the other in its own shadow; the face towards us takes a
  // low sun aslant, a step down from the one it falls full on.
  const disc = skyAt(t).disc
  const strength = disc ? Math.min(1, disc.a * 1.5) : 0
  const fromWest = disc ? smooth(disc.x, 0.35, 0.65) * strength : 0.5
  const aslant = disc ? Math.abs(smooth(disc.x, 0.35, 0.65) - 0.5) * 2 * strength : 0
  const deep = rock(STONE_DEEP, t)
  const ink = againstSun('#2B261F', t)
  // The rock under the sea, and the mass itself, its face towards us.
  blob(ctx, OUTLINE)
  fill(ctx, mix(stone, shade, 0.28 * aslant))
  // The east face and the west face, each a plane of its own.
  poly(ctx, SHADE_E)
  fill(ctx, mix(stone, shade, fromWest))
  poly(ctx, SHADE_W)
  fill(ctx, mix(stone, shade, 1 - fromWest))
  // Its foot along the south face, darker where the sea wets it.
  poly(ctx, [...WET, [CLIFF_W.foot, 0.6], [CLIFF_E.foot, 0.6]])
  fill(ctx, mix(mix(stone, shade, 0.28 * aslant), rock(ROCK, t), 0.3))
  // Each bed's ledge: the shadow under it, straight along the bed and thinning away into the rock, never ending square;
  // cut off by the face itself, and gone as the island goes dark against the sun at the end.
  const ledges = 0.4 * (1 - smooth(t, TRIAL.fade - 1.3, TRIAL.fade + 1.0))
  if (ledges > 0.004) {
    ctx.save()
    blob(ctx, OUTLINE)
    ctx.clip()
    for (const s of LEDGES) {
      const u = (f: number) => s.edge + (s.into - s.edge) * f
      poly(ctx, [[s.edge, s.y], [s.into, s.y], [u(0.55), s.y + s.h * 0.4], [u(0.2), s.y + s.h * 0.85], [s.edge, s.y + s.h]])
      fill(ctx, rgba(deep, ledges))
    }
    ctx.restore()
  }
  // The island's foot under the water: rock, darker, going down out of sight.
  poly(ctx, [[795.6, 2.2], [797.0, 0.4], [836.9, 0.6], [839.0, 3.5], [842.0, 8], [793.5, 8]])
  fill(ctx, rock(ROCK, t))
  poly(ctx, [[794.8, 4.4], [840.6, 5.4], [842.0, 8], [793.5, 8]])
  fill(ctx, rock(ROCK_DEEP, t))
  // The beach: the sand where he comes ashore, flat, running into the water, lying on the rock as a bank that thins
  // away to both ends under the water.
  ctx.beginPath()
  ctx.moveTo(797.0, 0.4)
  ctx.lineTo(BEACH.x0, BEACH.sand)
  ctx.lineTo(BEACH.x1, BEACH.sand)
  ctx.lineTo(805.5, -0.42)
  ctx.quadraticCurveTo(805.2, 0.3, 802.6, 0.62)
  ctx.quadraticCurveTo(799.6, 0.8, 797.0, 0.4)
  ctx.closePath()
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
