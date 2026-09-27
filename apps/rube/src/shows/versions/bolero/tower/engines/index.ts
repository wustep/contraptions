import type p5 from 'p5'
import type { PieceCtx } from '../../../../../parts'
import { R, TOWER, engineAt } from '../plan'
import { STOREY_COLORS, smooth } from '../look'
import { swell } from '../music'
import { gilt } from '../gold'
import { openOf } from '../storey'
import type { Engine } from './kit'
import { escapement } from './escapement'
import { bellows } from './bellows'
import { carillon } from './carillon'
import { valves } from './valves'
import { pendulums } from './pendulums'
import { slide } from './slide'
import { bows } from './bows'
import { flywheel } from './flywheel'
import { cymbals } from './cymbals'
import { timpani } from './timpani'

/**
 * The engines, a storey each, bottom to top: the flute's and clarinet's escapement, the bassoon's bellows, the oboe
 * d'amore's carillon, the saxophones' valves, the horn and celesta's pendulums, the trombone's slide, the violins'
 * bows, the strings' and trumpet's flywheel, and the tutti's cymbals and timpani.
 */
export const ENGINES: Engine[] = [escapement, bellows, carillon, valves, pendulums, slide, bows, flywheel, cymbals, timpani]

export function drawEngine(p: p5, c: PieceCtx, n: number, t: number): void {
  const st = TOWER[n]
  const open = openOf(n, t)
  if (open < 0.7) return
  const at = engineAt(n)
  const upperY = Math.min(st.upper.left, st.upper.right)
  const box = { x0: -st.w / 2 + 0.75, x1: st.w / 2 - 0.55, y0: st.top + 0.1, y1: upperY - R - 0.1 }
  p.push()
  ENGINES[n](p, c, st, t, {
    on: smooth(t, at, at + 1),
    since: t - at,
    amp: swell(t),
    open,
    gold: gilt(t),
    color: STOREY_COLORS[n],
    box,
  })
  p.pop()
}
