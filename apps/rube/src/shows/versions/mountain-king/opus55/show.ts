import type { Theme } from '../../../../../../../src/core/themes'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Framing } from '../../../registry'
import { drawCast, where, type Troll } from './cast'
import { beatAt } from './grid'
import { Route } from './machine'

/**
 * The show: one universe an act, each a palette and a stretch of the
 * music, Peer's route through it, and the trolls. Show time is the
 * recording's; an act begins at `t0` and its universe's clock is zero
 * there.
 */
export interface Act {
  universe: Universe
  t0: number
  peer: Route
  trolls: Troll[]
  /** How the camera frames this act at beat b: how many cells a 16:9 frame is tall, and where it leans. */
  frame(b: number, peer: { x: number; y: number }): Framing
}

const ASPECT = 16 / 9

export class MountainKing extends Show {
  constructor(readonly acts: Act[], readonly duration: number) {
    super('mountain-king')
  }

  override worldAt(i: number): World {
    return this.acts[Math.max(0, Math.min(this.acts.length - 1, i))].universe.world
  }

  override universe(i: number): Universe {
    return this.acts[Math.max(0, Math.min(this.acts.length - 1, i))].universe
  }

  override begin(i: number): number {
    return this.acts[Math.max(0, Math.min(this.acts.length - 1, i))].t0
  }

  override indexAt(t: number): number {
    let i = 0
    while (i + 1 < this.acts.length && this.acts[i + 1].t0 <= t) i++
    return i
  }

  actAt(t: number): Act {
    return this.acts[this.indexAt(t)]
  }

  override at(time: number): ShowPoint {
    const t = Math.max(0, Math.min(this.duration, Number.isFinite(time) ? time : 0))
    const act = this.actAt(t)
    const here = act.peer.at(t)
    return { ...here, universe: act.universe, local: t - act.t0, begin: act.t0 }
  }

  /**
   * The camera: a framing per act as a function of the beat and of where
   * Peer is, averaged over a short window so it glides; never across a cut.
   */
  cameraAt(time: number): Framing {
    const t = Math.max(0, Math.min(this.duration, time))
    const act = this.actAt(t)
    let x = 0
    let y = 0
    let cells = 0
    let w = 0
    for (let i = -6; i <= 6; i++) {
      const s = t + i * 0.09
      if (s < act.t0 - 1e-9 || s > this.duration || this.actAt(s) !== act) continue
      const weight = 1 - Math.abs(i) / 7
      const peer = act.peer.at(s)
      const f = act.frame(beatAt(s), peer)
      x += f.x * weight
      y += f.y * weight
      cells += f.cells * weight
      w += weight
    }
    return { x: x / w, y: y / w, cells: cells / w }
  }
}

/** The trolls of an act as scenery: drawn behind the ball, in the act's palette, looking at Peer. */
export function castPiece(trolls: () => Troll[], peer: () => Route, t0: number) {
  return (p: import('p5'), _s: null, c: import('../../../../parts').PieceCtx) => {
    const t = t0 + c.t
    const at = peer().at(t)
    drawCast(p, c.k, c.ink, c.weight, c.theme, trolls(), t, [at.x, at.y])
  }
}

/** Keep a framing whole: at least `cells` tall and wide enough for a span of x at 16:9. */
export const fit = (x0: number, x1: number, y0: number, y1: number, min: number): Framing => ({
  x: (x0 + x1) / 2,
  y: (y0 + y1) / 2,
  cells: Math.max(min, y1 - y0, (x1 - x0) / ASPECT),
})

export { where }
export type { Theme }
