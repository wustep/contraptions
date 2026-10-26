import { blob, clamp01, fill, hash, mix, poly, rgba, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { skyAt } from '../../world/sky'
import { shipPose } from './course'

/**
 * The Sirens' rocks: three black teeth of stone standing out of the surf at noon, broken and sharp, wet dark at the
 * foot where the sea washes them, with a few lesser teeth awash round them; and on them the Sirens, tall and pale and
 * long in the neck, with no faces, white against the stone. They do not sing (Nolan keeps the song from us, as the wax
 * keeps it from the men): they only turn their heads as the ship comes by, and lean after it, and are still again when
 * it has gone.
 *
 * The rocks stand just behind the ship's line, so it passes in front of them close enough to touch.
 */

/** A rock: its outline from its foot on the left, over its points, to its foot on the right (cells), and its Siren. */
interface Rock {
  pts: Pt[]
  /** Where its Siren stands (on its highest point), or none. */
  siren?: Pt
}

const ROCKS: Rock[] = [
  {
    pts: [
      [430.3, 0.55], [430.5, -0.3], [431.0, -0.55], [431.3, -1.2], [431.75, -1.05], [432.1, -1.85], [432.45, -1.6],
      [432.8, -1.8], [433.05, -2.1], [433.45, -2.12], [433.7, -1.45], [434.1, -1.6], [434.5, -0.95], [434.9, -0.7],
      [435.2, -0.25], [435.5, 0.55],
    ],
    siren: [433.25, -2.12],
  },
  {
    pts: [
      [435.9, 0.6], [436.2, -0.3], [436.6, -0.5], [437.0, -1.15], [437.4, -1.0], [437.8, -1.75], [438.2, -1.6],
      [438.6, -2.45], [439.0, -2.3], [439.5, -3.1], [439.8, -3.5], [440.2, -3.53], [440.5, -3.2], [440.85, -2.75],
      [441.2, -2.95], [441.55, -3.35], [441.8, -3.1], [442.2, -2.4], [442.6, -2.55], [443.1, -1.8], [443.6, -1.45],
      [444.1, -1.0], [444.6, -0.75], [445.1, -0.2], [445.7, 0.6],
    ],
    siren: [440.0, -3.52],
  },
  {
    pts: [
      [446.5, 0.55], [446.8, -0.25], [447.2, -0.45], [447.6, -1.1], [448.0, -0.95], [448.4, -1.8], [448.8, -2.4],
      [449.15, -2.0], [449.5, -2.15], [449.9, -2.5], [450.1, -2.68], [450.5, -2.68], [450.75, -2.3], [451.1, -1.65],
      [451.5, -1.75], [451.9, -0.9], [452.3, -0.5], [452.7, 0.55],
    ],
    siren: [450.3, -2.66],
  },
]

/** The lesser teeth, awash round the three: [middle, half-width, height]. */
const TEETH: [number, number, number][] = [
  [429.2, 0.45, 0.75],
  [435.7, 0.22, 0.45],
  [446.1, 0.3, 0.6],
  [453.7, 0.5, 0.95],
]

const STONE = '#5F5D55'
const STONE_SHADE = '#3B3C37'
/** The stone where the sea washes it, dark and wet. */
const WET = '#2C2E2A'
const SIREN = '#F0EBDE'
const SIREN_SHADE = '#C9C2B2'
const HAIR = '#B4AC9B'
const INK = '#38362F'

/** The Sirens' rocks and the far islets: drawn behind the ship. */
export function drawRocks(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 405 || view.x0 > 480) return
  const air = skyAt(t).low
  drawFar(g, air)
  const ship = shipPose(t)
  // Under the water they all stand on one reef that goes on down out of sight, so no frame sees a rock end in a floor
  // through the cut-open sea.
  reef(g)
  for (const [x, w, h] of TEETH) {
    const pts: Pt[] = [[x - w, 0.5], [x - w * 0.6, -h * 0.55], [x - w * 0.15, -h], [x + w * 0.2, -h * 0.7], [x + w * 0.55, -h * 0.85], [x + w, 0.5]]
    poly(ctx, pts)
    fill(ctx, STONE_SHADE)
    washed(g, pts)
    outline(ctx, pts)
    stroke(g, INK, 1.6)
    surf(g, x, w * 1.1, 0.1, x * 0.7)
  }
  for (const [i, rock] of ROCKS.entries()) {
    // The stone: lit on the sun's side (the right), in shade on the left, the shade a flat facet down its middle.
    poly(ctx, rock.pts)
    fill(ctx, STONE)
    const top = rock.pts.reduce((a, b) => (b[1] < a[1] ? b : a))
    const foot = rock.pts[0]
    poly(ctx, [foot, ...rock.pts.slice(1, rock.pts.indexOf(top) + 1), [top[0] + 0.15, top[1] + 0.9], [top[0] - 0.3, 0.6]])
    fill(ctx, rgba(STONE_SHADE, 0.92))
    washed(g, rock.pts)
    outline(ctx, rock.pts)
    stroke(g, INK, 2)
    // Surf round its foot: two broad lobes of foam that rise and fall with the sea, slowly.
    for (let k = 0; k < 2; k++) {
      const x = k === 0 ? rock.pts[1][0] - 0.2 : rock.pts[rock.pts.length - 2][0] + 0.2
      surf(g, x, 0.75, 0.16, i * 1.7 + k * 2.1)
    }
    if (rock.siren) drawSiren(g, rock.siren, i, ship.x)
  }
}

/** A rock's outline open along its foot: inked over its points, not across the bottom it has under the water. */
function outline(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1])
}

/**
 * The reef the rocks and teeth stand on: from each one's foot it goes on down, dipping a little between them, and widens
 * away into the dark at both ends.
 */
function reef(g: Paint): void {
  const { ctx } = g
  const feet: [number, number][] = [...TEETH.map(([x, w]): [number, number] => [x - w, x + w]), ...ROCKS.map((r): [number, number] => [r.pts[0][0], r.pts[r.pts.length - 1][0]])]
  feet.sort((p, q) => p[0] - q[0])
  // A tooth awash at a rock's foot is one foot with it.
  for (let k = feet.length - 1; k > 0; k--) {
    if (feet[k][0] <= feet[k - 1][1] + 0.3) {
      feet[k - 1] = [feet[k - 1][0], Math.max(feet[k - 1][1], feet[k][1])]
      feet.splice(k, 1)
    }
  }
  const top: Pt[] = []
  for (const [k, [a, b]] of feet.entries()) {
    if (k > 0) top.push([(feet[k - 1][1] + a) / 2, 0.55 + 0.2 * hash(k, 3)])
    top.push([a + 0.05, 0.35], [b - 0.05, 0.35])
  }
  const x0 = feet[0][0]
  const x1 = feet[feet.length - 1][1]
  poly(ctx, [...top, [x1 + 0.6, 2.5], [x1 + 4, 40], [x0 - 4, 40], [x0 - 0.6, 2.5]])
  fill(ctx, WET)
}

/** The band of wet stone the swell washes, from just above the water down: the outline's own foot, darker. */
function washed(g: Paint, pts: Pt[]): void {
  const { ctx, t } = g
  const line = -0.22 + 0.05 * Math.sin(t * 1.3)
  ctx.save()
  poly(ctx, pts)
  ctx.clip()
  ctx.fillStyle = WET
  ctx.fillRect(pts[0][0] - 1, line, pts[pts.length - 1][0] - pts[0][0] + 2, 2)
  ctx.restore()
}

/** A lobe of foam at a rock's foot, rising and falling with the sea. */
function surf(g: Paint, x: number, w: number, h: number, ph: number): void {
  const { ctx, t } = g
  const lift = 0.09 * Math.sin(t * 1.3 + ph)
  ctx.beginPath()
  ctx.ellipse(x, -0.02 + lift, w, h + 0.05 * Math.sin(t * 0.9 + ph), 0, Math.PI, Math.PI * 2)
  // Broken water, seen through: never a white plank laid on the sea.
  fill(ctx, rgba('#F7F5EE', 0.6))
}

/** Two low islets far off on the sea behind, paler with the haze. */
function drawFar(g: Paint, air: string): void {
  const { ctx, view } = g
  const L = layer(view, 70)
  for (const [x, w, h] of [[424, 9, 1.8], [458, 12, 2.6]] as const) {
    const cx = L.x(x)
    if (cx + w < view.x0 || cx - w > view.x1) continue
    const pts: Pt[] = []
    for (let k = 0; k <= 8; k++) {
      const u = k / 8
      const y = -h * Math.pow(Math.sin(Math.PI * u), 0.7) * (0.8 + 0.2 * hash(k, Math.round(x)))
      pts.push([L.x(x - w / 2 + w * u), L.y(y)])
    }
    pts.push([L.x(x + w / 2), L.y(0.2)], [L.x(x - w / 2), L.y(0.2)])
    poly(ctx, pts)
    fill(ctx, mix(STONE_SHADE, air, 0.7))
  }
}

/**
 * A Siren: a woman sitting on her rock, pale and still, draped to the feet, her long hair down her back, with no face.
 * She turns her head after the ship as it passes (eased, never quick), and as it comes nearest she leans after it and
 * reaches out one arm, slowly, and lowers it again when it has gone. Larger than life, as a thing seen from a deck is.
 */
function drawSiren(g: Paint, foot: Pt, i: number, shipX: number): void {
  const { ctx, t } = g
  // How far the ship is past her, eased into a lean: -1 before (it is coming, on her left), 1 after.
  const d = shipX - foot[0]
  const look = Math.tanh(d / 6)
  const near = clamp01(1 - Math.abs(d) / 22)
  const sway = 0.04 * Math.sin(t * 0.55 + i * 2.3)
  const lean = -0.06 + 0.14 * look * near + sway
  const H = 1.7 + 0.12 * i
  ctx.save()
  ctx.translate(foot[0], foot[1] + 0.03)
  ctx.rotate(lean)
  // Her hair first, behind her: long, from the crown down her back to the rock, stirring a little.
  const head: Pt = [0.04 * look, -H * 0.86]
  const stir = 0.05 * Math.sin(t * 0.8 + i)
  ctx.beginPath()
  ctx.moveTo(head[0] - 0.1, head[1] - 0.08)
  ctx.quadraticCurveTo(-0.32 + stir, -H * 0.55, -0.3 + stir, -H * 0.18)
  ctx.lineTo(-0.16, -H * 0.2)
  ctx.quadraticCurveTo(-0.12, -H * 0.6, head[0] + 0.06, head[1] - 0.1)
  ctx.closePath()
  fill(ctx, HAIR)
  stroke(g, INK, 1.6)
  // The body: sitting, the drape pooled on the rock, a narrow waist, sloping shoulders.
  const body: Pt[] = [
    [-0.38, 0],
    [-0.3, -H * 0.18],
    [-0.16, -H * 0.36],
    [-0.13, -H * 0.56],
    [-0.15, -H * 0.7],
    [-0.08, -H * 0.76],
    [0.1, -H * 0.76],
    [0.16, -H * 0.68],
    [0.13, -H * 0.5],
    [0.2, -H * 0.3],
    [0.4, -H * 0.12],
    [0.44, 0],
  ]
  blob(ctx, body)
  fill(ctx, SIREN)
  // The side away from the sun in shade: the drape's long fall down her back.
  poly(ctx, [[-0.38, 0], [-0.3, -H * 0.18], [-0.16, -H * 0.36], [-0.13, -H * 0.56], [-0.12, -H * 0.72], [-0.04, -H * 0.5], [-0.06, -H * 0.2], [0.02, 0]])
  fill(ctx, rgba(SIREN_SHADE, 0.7))
  blob(ctx, body)
  stroke(g, INK, 1.8)
  // The arm towards the ship: down in her lap while it is far, lifted and reaching after it as it passes nearest.
  const reach = near * near * (0.5 + 0.5 * Math.max(0, look + 0.3))
  const shoulder: Pt = [0.1, -H * 0.72]
  const ang = 1.2 - 1.45 * reach
  const len = H * 0.4
  const hand: Pt = [shoulder[0] + Math.cos(ang) * len * 0.95, shoulder[1] + Math.sin(ang) * len]
  const elbow: Pt = [(shoulder[0] + hand[0]) / 2 + 0.05, (shoulder[1] + hand[1]) / 2 + 0.06 * (1 - reach)]
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(shoulder[0], shoulder[1])
  ctx.quadraticCurveTo(elbow[0], elbow[1], hand[0], hand[1])
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.075 + 3.6 / 108
  ctx.stroke()
  ctx.strokeStyle = SIREN
  ctx.lineWidth = 0.075
  ctx.stroke()
  // The head: no face, turned after the ship.
  ctx.beginPath()
  ctx.ellipse(head[0], head[1], 0.13, 0.15, 0.25 * look, 0, Math.PI * 2)
  fill(ctx, SIREN)
  stroke(g, INK, 1.8)
  ctx.restore()
}
