import type p5 from 'p5'
import type { PieceCtx } from '../../../../../parts'
import type { Storey } from '../plan'

/**
 * What an engine is told each frame. An engine is the machine in a storey's roof, between its ceiling and its upper
 * rail: let in when the ball starts round the storey the second time (the second voice of the pair), and running
 * from then on under everything above it, as the voices that have had the tune join the accompaniment.
 */
export interface EngineState {
  /** 0 until it is let in, easing to 1 over its first second, then 1: how engaged it is. */
  on: number
  /** Show seconds since it was let in (negative before). */
  since: number
  /** How big it plays now: the orchestra's swell, 0 (the flute's pianissimo) to 1 (the last tutti). */
  amp: number
  /** How far the storey has unfolded (0 folded into the bud, 1 open). Draw nothing below about 0.75. */
  open: number
  /** E major's gold, 0 to 1 (bars 327 to 334): tint toward `GOLD` by up to about half. */
  gold: number
  /** The storey's own colour. */
  color: string
  /** The box it has to live in, in world cells: x from x0 to x1 (the mast is at x = 0), y from y0 (the ceiling) to y1 (just over the ball's upper rail). */
  box: { x0: number; x1: number; y0: number; y1: number }
}

export type Engine = (p: p5, c: PieceCtx, st: Storey, t: number, e: EngineState) => void
