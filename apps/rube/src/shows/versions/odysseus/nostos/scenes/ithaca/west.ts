import { fill, mix, poly, rect, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { glide } from '../../voyage'
import { smoother } from '../../draw'
import { horizonOf, slope, surface } from '../../world/sea'
import { JETTY, MOORING, TRIAL } from './geo'
import { CLOTH, MADDER, TIMBER, outdoors } from './look'

/**
 * The west: a skiff at the harbour's jetty, and in it, after everything, the two of them, going out under a small sail
 * towards where the sun is going down; their son on the cliff's edge above them. The camera holds still on it all, and the
 * skiff goes away from us into the sun: smaller and smaller, up the sea's surface towards the horizon under the sun,
 * the way a boat goes when it is going west and we are staying. The film ends on that sail; so do we.
 */

/** The last shot, held: the olive on the west cliff at its left, their son on the edge under it, the sun ahead. */
export const WEST_CAM = { x: 839.0, y: -5.35, cells: 12.2 }
/** Its horizon (`horizonOf` for that frame), where the skiff goes. */
const HORIZON_Y = horizonOf({ cy: WEST_CAM.y, h: WEST_CAM.cells })
/** Where on the horizon it heads: under the sun (the sky's disc is four fifths across that frame). */
const SUN_X = WEST_CAM.x + ((0.8 - 0.5) * WEST_CAM.cells * 16) / 9

/** The skiff's length, and where the two sit in it (its own frame, the waterline under its middle at 0). */
const L = 1.25
const SEATS: Pt[] = [[-0.22, -0.2], [0.07, -0.2]]

/** Along the sea, near: moored until the dissolve, then out from the jetty, gathering a little way. */
const track = glide([
  [TRIAL.fade, MOORING, 0],
  [TRIAL.fade + 6, MOORING + 1.4, 0.36],
  [549, MOORING + 1.4 + 0.36 * (549 - TRIAL.fade - 6), 0.36],
])

/** How far off it has gone, as the share of its size it is seen at: 1 at the jetty, less and less as it goes west. */
export function skiffScale(t: number): number {
  return 1 - 0.8 * smoother(t, TRIAL.fade + 4.5, 549)
}

export interface Skiff {
  x: number
  y: number
  a: number
  s: number
}

export function skiffAt(t: number): Skiff {
  const near = track(Math.max(t, TRIAL.fade))
  const s = skiffScale(t)
  // Going away: towards the point on the horizon under the sun, as far as it has gone (the perspective of the held shot).
  const x = SUN_X + (near - SUN_X) * s
  const y = HORIZON_Y * (1 - s) + (surface(near, t) - 0.02) * s
  return { x, y, a: slope(near, t, L) * 0.8 * s, s }
}

/** Where seat `i` is at `t` (0 his, at the stern; 1 hers). */
export function skiffSeat(t: number, i: number): Pt {
  const k = skiffAt(t)
  const [lx, ly] = SEATS[i]
  const c = Math.cos(k.a)
  const n = Math.sin(k.a)
  const r = i === 0 ? 0.13 : 0.125
  const px = lx * k.s
  const py = (ly - r) * k.s
  return [k.x + px * c - py * n, k.y + px * n + py * c]
}

/** The skiff: a small hull, a mast and a square sail with a madder band, lifting a little in the evening wind. */
export function drawSkiff(g: Paint): void {
  const { ctx, t, view } = g
  const s = skiffAt(t)
  if (s.x < view.x0 - 3 || s.x > view.x1 + 3) return
  const ink = outdoors('#2A2420', t)
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.a)
  ctx.scale(s.s, s.s)
  // The mast and the sail, set once they are under way.
  const set = Math.min(1, Math.max(0, (t - TRIAL.fade - 1.5) / 3))
  rect(ctx, 0.3, -1.05, 0.03, 0.85)
  fill(ctx, outdoors(TIMBER, t))
  if (set > 0) {
    const foot = -1.0 + 0.62 * set
    const belly = 0.06 * set * (1 + 0.15 * Math.sin(t * 0.9))
    ctx.beginPath()
    ctx.moveTo(0.02, -1.0)
    ctx.lineTo(0.6, -1.0)
    ctx.quadraticCurveTo(0.6 + belly, (foot - 1.0) / 2, 0.58, foot)
    ctx.lineTo(0.04, foot)
    ctx.quadraticCurveTo(0.02 + belly, (foot - 1.0) / 2, 0.02, -1.0)
    ctx.closePath()
    fill(ctx, outdoors(CLOTH, t))
    stroke(g, ink, 1.4)
    rect(ctx, 0.03, -1.0 + 0.62 * set * 0.45, 0.56, 0.62 * set * 0.12)
    fill(ctx, outdoors(MADDER, t))
  }
  // The hull: low, a little rise at either end.
  poly(ctx, [[-L / 2, -0.2], [-L / 2 + 0.08, 0.06], [L / 2 - 0.12, 0.06], [L / 2, -0.24], [L / 2 - 0.06, -0.16], [-L / 2 + 0.05, -0.15]])
  fill(ctx, mix(outdoors('#3A3029', t), '#1C1814', 0.3))
  stroke(g, ink, 1.4)
  ctx.restore()
  // The mooring line to the jetty's bollard, until they cast off.
  if (t < TRIAL.fade + 1.2 && s.s > 0.99) {
    ctx.beginPath()
    ctx.moveTo(s.x - L / 2 + 0.05, s.y - 0.15)
    ctx.quadraticCurveTo((s.x + JETTY.x1 - 0.5) / 2, s.y + 0.05, JETTY.x1 - 0.5, JETTY.top - 0.1)
    stroke(g, outdoors('#6A5A44', t), 1.0)
  }
}
