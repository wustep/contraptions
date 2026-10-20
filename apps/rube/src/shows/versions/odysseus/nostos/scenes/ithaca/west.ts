import { fill, mix, poly, rect, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { glide } from '../../voyage'
import { slope, surface } from '../../world/sea'
import { JETTY, MOORING, TRIAL } from './geo'
import { CLOTH, MADDER, TIMBER, outdoors } from './look'

/**
 * The west: a skiff at the harbour's jetty, and in it, after everything, the two of them, going out under a small sail
 * towards where the sun is going down; their son on the cliff's top behind them. The film ends on that sail; so do we.
 */

/** The skiff's length, and where the two sit in it (its own frame, the waterline under its middle at 0). */
const L = 1.25
const SEATS: Pt[] = [[-0.22, -0.2], [0.07, -0.2]]

/** Along the sea: moored until the dissolve, then away west, gathering a little way and keeping it. */
const track = glide([
  [TRIAL.fade, MOORING, 0],
  [TRIAL.fade + 6, MOORING + 1.6, 0.42],
  [549, MOORING + 1.6 + 0.42 * (549 - TRIAL.fade - 6), 0.42],
])

export interface Skiff {
  x: number
  y: number
  a: number
}

export function skiffAt(t: number): Skiff {
  const x = track(Math.max(t, TRIAL.fade))
  return { x, y: surface(x, t) - 0.02, a: slope(x, t, L) * 0.8 }
}

/** Where seat `i` is at `t` (0 his, at the stern; 1 hers). */
export function skiffSeat(t: number, i: number): Pt {
  const s = skiffAt(t)
  const [lx, ly] = SEATS[i]
  const c = Math.cos(s.a)
  const n = Math.sin(s.a)
  const r = i === 0 ? 0.13 : 0.125
  return [s.x + lx * c - (ly - r) * n, s.y + lx * n + (ly - r) * c]
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
  if (t < TRIAL.fade + 1.2) {
    ctx.beginPath()
    ctx.moveTo(s.x - L / 2 + 0.05, s.y - 0.15)
    ctx.quadraticCurveTo((s.x + JETTY.x1 - 0.5) / 2, s.y + 0.05, JETTY.x1 - 0.5, JETTY.top - 0.1)
    stroke(g, outdoors('#6A5A44', t), 1.0)
  }
}
