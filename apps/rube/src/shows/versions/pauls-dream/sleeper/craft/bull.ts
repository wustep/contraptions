import { blob, ellipse, fill, mix, poly, stroke, type Paint, type Pt } from '../paint'

/**
 * The bull's head: the head of the bull that killed the Old Duke, mounted on a plaque, on the wall of the hall at
 * Castle Caladan, packed when the house leaves, and hung again in the palace at Arrakeen. Its one job is the father's
 * line: it looks down on Leto from the first scene he is in to his last.
 *
 * Seen face on, as a thing on a wall is: a dark plaque, the long head narrowing to the muzzle, the horns wide and
 * pale, curving out and up. About 0.95 cells tall from the plaque's top to the muzzle and 1.4 across the horns, larger
 * than life so it is read in the frame. `x, y` is where it hangs from (the plaque's top middle); `swing` turns it about
 * there (radians, while it hangs from a chain), `dark` takes it toward a night's shadow (0 to 1), `light` is the colour
 * of what light falls on it.
 */

export interface BullPose {
  x: number
  y: number
  swing?: number
  /** 0 as in daylight, 1 almost lost in the dark. */
  dark?: number
  /** Without its plaque (a head hauled up out of its crate is still on it; this is for a head that has fallen from it). */
  bare?: boolean
}

const HIDE = '#231912'
const HIDE_LIT = '#3E2D20'
const HORN = '#D9CDB4'
const HORN_TIP = '#3A332A'
const PLAQUE = '#6A4C33'
const PLAQUE_EDGE = '#2E1F14'
const NIGHT = '#0E1219'

function horn(g: Paint, side: 1 | -1, c: (s: string) => string): void {
  const base: Pt = [0.17 * side, 0.3]
  const pts: Pt[] = [
    base,
    [0.42 * side, 0.18],
    [0.62 * side, 0.08],
    [0.7 * side, -0.08],
    [0.66 * side, -0.2],
    [0.6 * side, -0.08],
    [0.48 * side, 0.12],
    [0.3 * side, 0.27],
    [0.18 * side, 0.4],
  ]
  blob(g.ctx, pts)
  fill(g.ctx, c(HORN))
  // The dark tip.
  poly(g.ctx, [[0.69 * side, -0.07], [0.66 * side, -0.21], [0.61 * side, -0.1]])
  fill(g.ctx, c(HORN_TIP))
}

export function drawBull(g: Paint, p: BullPose): void {
  const ctx = g.ctx
  const dark = p.dark ?? 0
  const c = (s: string) => mix(s, NIGHT, dark * 0.82)
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.swing ?? 0)
  if (!p.bare) {
    // The plaque: a shield of dark wood.
    blob(ctx, [[-0.32, 0.02], [0.32, 0.02], [0.36, 0.42], [0.2, 0.78], [0, 0.86], [-0.2, 0.78], [-0.36, 0.42]])
    fill(ctx, c(PLAQUE))
    stroke(g, c(PLAQUE_EDGE), 0.02)
  }
  horn(g, -1, c)
  horn(g, 1, c)
  // Ears, swept back under the horns.
  ellipse(ctx, -0.27, 0.36, 0.11, 0.05, 0.4)
  fill(ctx, c(HIDE))
  ellipse(ctx, 0.27, 0.36, 0.11, 0.05, -0.4)
  fill(ctx, c(HIDE))
  // The head: broad at the poll, long down to the muzzle.
  blob(ctx, [[-0.22, 0.22], [0, 0.17], [0.22, 0.22], [0.24, 0.45], [0.16, 0.72], [0.13, 0.93], [0, 0.98], [-0.13, 0.93], [-0.16, 0.72], [-0.24, 0.45]])
  fill(ctx, c(HIDE))
  // The light down the face's ridge, and the muzzle.
  blob(ctx, [[-0.05, 0.24], [0.05, 0.24], [0.07, 0.6], [0.04, 0.84], [-0.04, 0.84], [-0.07, 0.6]])
  fill(ctx, c(HIDE_LIT))
  ellipse(ctx, 0, 0.92, 0.12, 0.07)
  fill(ctx, c('#1E1611'))
  // Eyes: dark, set wide, no glint.
  ellipse(ctx, -0.15, 0.44, 0.035, 0.025, 0.3)
  fill(ctx, '#0A0806')
  ellipse(ctx, 0.15, 0.44, 0.035, 0.025, -0.3)
  fill(ctx, '#0A0806')
  ctx.restore()
}
