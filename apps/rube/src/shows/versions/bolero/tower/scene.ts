import type p5 from 'p5'
import type { PieceCtx, Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import { drawBase, drawGround } from './base'
import { drawCup, drawRack } from './lift'
import { drawMast } from './mast'
import { DRUM, TOWER } from './plan'
import { inFrame, sway } from './pose'
import { drawRoof } from './roof'
import { drawStorey } from './storey'
import { drawEngine } from './engines/index'
import { drawing, standing } from './show'
import { FALL_FROM } from './finale'

/** Every cell of a box, inclusive: what a large drawing claims so the stage draws it whenever any of it is in view. */
function box(x0: number, y0: number, x1: number, y1: number, step = 1): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x += step) for (let y = Math.floor(y0); y <= Math.ceil(y1); y += step) out.push([x, y])
  return out
}

const nothing = drawing('spin', () => {})

/** Everything on the stage, in the order it is drawn: the ground, the drum, the storeys up, the roof, the lift's cup. */
export function scenery(duration: number): Placed[] {
  const top = TOWER[TOWER.length - 1]
  const out: Placed[] = [standing(nothing, [], duration)]
  out.push(standing(drawing('ground', (p, c) => drawGround(p, c)), box(-60, -2, 60, 3, 2), duration))
  out.push(standing(drawing('drum', (p, c) => drawBase(p, c, c.t)), box(-4, -2, 3, 0), duration))
  for (const st of TOWER) {
    const n = st.n
    // The folded bud of a storey stands up over the one under it: claim the cells up to its tips too.
    const reach = st.w / 2 + 1.5
    out.push(
      standing(
        drawing(`storey-${n}`, (p, c) =>
          inFrame(p, c.k, n, c.t, () => {
            drawMast(p, c.k, c.weight, n, c.t)
            drawRack(p, c.k, c.weight, n, c.t)
            drawEngine(p, c, n, c.t)
            drawStorey(p, n, c, c.t)
          }),
        ),
        box(-reach, st.top - st.w / 2 - 0.5, reach, st.floor + 0.5),
        duration,
      ),
    )
  }
  out.push(standing(drawing('roof', (p, c) => drawRoof(p, c, c.t)), box(-top.w / 2 - 1, top.top - 4.5, top.w / 2 + 1, top.top + 1), duration))
  // The lift's cup: its back behind the ball, its lip over it; on the tower, so it sways with it.
  const cup = (front: boolean) => (p: p5, c: PieceCtx) => {
    if (c.t >= FALL_FROM) return
    p.translate(0, DRUM.head * c.k)
    p.rotate(sway(c.t))
    p.translate(0, -DRUM.head * c.k)
    drawCup(p, c.k, c.weight, c.t, front)
  }
  out.push(standing(drawing('cup', cup(false), cup(true)), box(-top.w / 2 - 1, top.top, 0, 0), duration))
  return out
}
