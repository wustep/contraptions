import { blob, clamp01, fill, hash, mix, poly, rgba, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { skyAt } from '../../world/sky'
import { shipPose } from './course'

/**
 * The Sirens' rocks: three teeth of pale stone standing out of the surf at noon, and on them the Sirens, tall and pale
 * and long in the neck, with no faces. They do not sing (Nolan keeps the song from us, as the wax keeps it from the
 * men): they only turn their heads as the ship comes by, and lean after it, and are still again when it has gone.
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
    pts: [[430.3, 0.55], [430.6, -0.4], [431.4, -1.1], [432.1, -1.9], [432.7, -1.5], [433.3, -2.15], [434.3, -1.2], [435.2, -0.5], [435.5, 0.55]],
    siren: [433.25, -2.12],
  },
  {
    pts: [[435.9, 0.6], [436.4, -0.6], [437.5, -1.7], [438.3, -2.4], [439.2, -3.15], [440.0, -3.55], [440.9, -2.9], [441.8, -3.25], [442.9, -2.1], [444.0, -1.2], [445.2, -0.3], [445.7, 0.6]],
    siren: [440.0, -3.52],
  },
  {
    pts: [[446.5, 0.55], [447.0, -0.5], [447.9, -1.4], [448.8, -2.45], [449.6, -2.0], [450.3, -2.7], [451.2, -1.5], [452.3, -0.4], [452.7, 0.55]],
    siren: [450.3, -2.66],
  },
]

const STONE = '#E2DCCD'
const STONE_SHADE = '#ADA79A'
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
  for (const [i, rock] of ROCKS.entries()) {
    // The stone: lit on the sun's side (the right), in shade on the left, the shade a flat facet down its middle.
    blob(ctx, rock.pts)
    fill(ctx, STONE)
    const top = rock.pts.reduce((a, b) => (b[1] < a[1] ? b : a))
    const foot = rock.pts[0]
    poly(ctx, [foot, ...rock.pts.slice(1, rock.pts.indexOf(top) + 1), [top[0] + 0.15, top[1] + 0.9], [top[0] - 0.3, 0.6]])
    fill(ctx, rgba(STONE_SHADE, 0.85))
    blob(ctx, rock.pts)
    stroke(g, INK, 2)
    // Surf round its foot: two broad lobes of foam that rise and fall with the sea, slowly.
    for (let k = 0; k < 2; k++) {
      const x = k === 0 ? rock.pts[1][0] - 0.2 : rock.pts[rock.pts.length - 2][0] + 0.2
      const lift = 0.09 * Math.sin(t * 1.3 + i * 1.7 + k * 2.1)
      ctx.beginPath()
      ctx.ellipse(x, -0.02 + lift, 0.75, 0.16 + 0.05 * Math.sin(t * 0.9 + k + i), 0, Math.PI, Math.PI * 2)
      fill(ctx, rgba('#F7F5EE', 0.9))
    }
    if (rock.siren) drawSiren(g, rock.siren, i, ship.x)
  }
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
 * A Siren: a tall pale body like a draped column, a long neck, a small head. Her neck bends towards the ship, which
 * she follows with her head as it passes (eased, never quick), and she leans after it as it goes.
 */
function drawSiren(g: Paint, foot: Pt, i: number, shipX: number): void {
  const { ctx, t } = g
  // How far the ship is past her, eased into a lean: -1 before (it is coming, on her left), 1 after.
  const d = shipX - foot[0]
  const look = Math.tanh(d / 6)
  const near = clamp01(1 - Math.abs(d) / 22)
  const sway = 0.05 * Math.sin(t * 0.55 + i * 2.3)
  const lean = -0.1 + 0.16 * look * near + sway
  const H = 1.35 + 0.12 * i
  ctx.save()
  ctx.translate(foot[0], foot[1] + 0.03)
  ctx.rotate(lean)
  // The body: a fall of cloth from a narrow foot, fuller at the hip, to sloping shoulders.
  const body: Pt[] = [
    [-0.2, 0],
    [-0.27, -H * 0.3],
    [-0.2, -H * 0.62],
    [-0.15, -H * 0.86],
    [-0.06, -H * 0.97],
    [0.06, -H * 0.98],
    [0.14, -H * 0.88],
    [0.19, -H * 0.6],
    [0.25, -H * 0.28],
    [0.21, 0],
  ]
  blob(ctx, body)
  fill(ctx, SIREN)
  // The side away from the sun in shade: a long fold down her left.
  poly(ctx, [[-0.2, 0], [-0.27, -H * 0.3], [-0.2, -H * 0.62], [-0.15, -H * 0.86], [-0.05, -H * 0.94], [-0.06, -H * 0.5], [-0.04, 0]])
  fill(ctx, rgba(SIREN_SHADE, 0.75))
  blob(ctx, body)
  stroke(g, INK, 1.8)
  // The neck: long, bending towards the ship; the head at its end, turned along it.
  const bend = 0.55 * look * (0.4 + 0.6 * near) + 0.08 * Math.sin(t * 0.7 + i)
  const n0: Pt = [0, -H * 0.95]
  const n1: Pt = [0.2 * bend, -H - 0.42]
  const n2: Pt = [0.6 * bend, -H - 0.66 + 0.12 * Math.abs(bend)]
  // Drawn twice, in cells so it is as thick close up as far off: the ink, then the pale over it.
  const neck = 0.085
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(n0[0], n0[1])
  ctx.quadraticCurveTo(n1[0], n1[1], n2[0], n2[1])
  ctx.strokeStyle = INK
  ctx.lineWidth = neck + 3.6 / 108
  ctx.stroke()
  ctx.strokeStyle = SIREN
  ctx.lineWidth = neck
  ctx.stroke()
  const a = Math.atan2(n2[1] - n1[1], n2[0] - n1[0])
  // Her hair: from the back of her head, down behind her neck to her shoulders, stirring.
  const back: Pt = [n2[0] - Math.cos(a) * 0.04, n2[1] - Math.sin(a) * 0.04]
  const fall: Pt = [-0.14 - 0.06 * bend, -H * 0.72 + 0.04 * Math.sin(t * 0.8 + i)]
  ctx.beginPath()
  ctx.moveTo(back[0], back[1])
  ctx.quadraticCurveTo(back[0] - 0.12 - 0.1 * bend, (back[1] + fall[1]) / 2, fall[0], fall[1])
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.07 + 3.6 / 108
  ctx.stroke()
  ctx.strokeStyle = HAIR
  ctx.lineWidth = 0.07
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(n2[0] + Math.cos(a) * 0.05, n2[1] + Math.sin(a) * 0.05, 0.13, 0.075, a, 0, Math.PI * 2)
  fill(ctx, SIREN)
  stroke(g, INK, 1.8)
  ctx.restore()
}
