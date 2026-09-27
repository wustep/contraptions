import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { STROKES, lastIndex } from './music'
import { DRUM, TOWER } from './plan'
import { BRASS, INK, IRON, pale, smooth } from './look'
import { openOf } from './storey'

/**
 * The mast: an iron lattice from the drum head up the middle of the tower, and on its face the drive chain, which
 * steps up a link on every stroke of the drum all show: the rhythm, carried up to every storey.
 */

const HALF = 0.13
const LINK = 0.14
/** How far the chain has run at `t`: a link-third a stroke, each step quick and eased. */
export function chainRun(t: number): number {
  const n = lastIndex(STROKES, t)
  if (n < 0) return 0
  const u = Math.min(1, (t - STROKES[n]) / 0.07)
  return (n + u * u * (3 - 2 * u)) * (LINK / 3)
}

/** The mast's stretch through storey `n` as far as the storey has unfolded (and, under storey 0, the stub from the drum head that the first bud sits on). */
export function drawMast(p: p5, k: number, weight: number, n: number, t: number): void {
  const st = TOWER[n]
  const up = smooth(openOf(n, t), 0.26, 0.5)
  if (n === 0) segment(p, k, weight, DRUM.head, st.floor, t)
  if (up > 0) segment(p, k, weight, st.floor, st.floor + (st.top - st.floor) * up, t)
  if (up > 0) {
    // The gusset where the storey's floor meets the mast.
    solid(p, INK, weight * 0.8, pale(IRON, 0.2))
    p.triangle(-0.34 * k, (st.floor - 0.06) * k, 0.34 * k, (st.floor - 0.06) * k, 0, (st.floor + 0.28) * k)
  }
}

function segment(p: p5, k: number, weight: number, from: number, to: number, t: number): void {
  p.push()
  solid(p, INK, weight, pale(IRON, 0.55))
  p.rectMode(p.CORNERS)
  p.noStroke()
  p.rect(-HALF * k, to * k, HALF * k, from * k)
  outline(p, INK, weight * 1.1)
  p.line(-HALF * k, from * k, -HALF * k, to * k)
  p.line(HALF * k, from * k, HALF * k, to * k)
  outline(p, INK, weight * 0.6)
  let rising = true
  for (let y = from; y > to + 0.02; y -= 0.26) {
    const yb = Math.max(to, y - 0.26)
    if (rising) p.line(-HALF * k, y * k, HALF * k, yb * k)
    else p.line(HALF * k, y * k, -HALF * k, yb * k)
    rising = !rising
  }
  // The drive chain on its face, stepping up with the drum.
  const run = chainRun(t)
  outline(p, INK, weight * 0.7)
  p.line(-0.045 * k, from * k, -0.045 * k, to * k)
  p.line(0.045 * k, from * k, 0.045 * k, to * k)
  const phase = ((run % LINK) + LINK) % LINK
  solid(p, INK, weight * 0.6, BRASS)
  for (let y = from - phase; y > to; y -= LINK) p.rect(-0.045 * k, (y - 0.035) * k, 0.045 * k, y * k, 0.01 * k)
  p.pop()
}
