import type p5 from 'p5'
import type { DrawCtx, SetupCtx } from '../../core/types'

/**
 * Framework A: ports.
 *
 * A machine declares what crosses each of its edges. The composer wires
 * machines together only where an out-port meets a matching in-port, and
 * assigns phases so the token leaves one cell at the exact frame it enters the
 * next. Machines stay pure functions of their own `u`; the physics is in the
 * contract, not in a simulation.
 */

export type Side = 'N' | 'E' | 'S' | 'W'

/**
 * What a port carries.
 *
 *   ball  — a rolling or falling object. Conserved: what comes in must go out
 *           or be visibly swallowed.
 *   shaft — continuous rotation. Meshing gears counter-rotate.
 *   push  — a contact impulse: a rod, a toppling bar.
 */
export type Kind = 'ball' | 'shaft' | 'push'

export interface Port {
  side: Side
  kind: Kind
  /**
   * Loop fraction at which the token crosses this edge, in the machine's own
   * `u`. Shaft ports are continuous couplings and use 0. May depend on the
   * machine's state (a domino run's length sets when the last bar falls).
   */
  t: number | ((state: any) => number)
  /** Which cell of a multi-cell footprint the port is on, offset from the anchor. */
  cell?: [number, number]
}

/** What the composer resolved for one placed machine. Attached to its state. */
export interface Link {
  inSide: Side | null
  outSides: Side[]
  /** The token's colour along this whole chain — it is one ball. */
  ball: string
  /** For shaft members: the rotation as a function of u, shared down the train. */
  drive: ((u: number) => number) | null
  /** 1 or -1. Alternates along a gear train. */
  spin: number
  /** When a cam on this train should trip its follower. */
  camAt: number
  /** Tooth offset so neighbouring gears interleave: 0 or half a pitch. */
  mesh: number
}

export interface PortMachine<S = unknown> {
  name: string
  label: string
  span?: [number, number]
  /** Whether a mirrored variant may be placed. Defaults to true. */
  mirror?: boolean
  ins: Port[]
  outs: Port[]
  /** Exactly one of the outs is wired — a gear passes its rotation on one way. */
  pickOne?: boolean
  /** Relative weight when picked to start a chain. Absent: never a source. */
  source?: number
  /** Shaft drivers: the rotation they impart and when a cam on the train should trip. */
  driver?: { drive: (u: number) => number; camAt: number }
  setup(ctx: SetupCtx): S
  draw(p: p5, s: S & { link: Link }, ctx: DrawCtx): void
}

export function definePort<S>(m: PortMachine<S>): PortMachine<S> {
  return m
}
