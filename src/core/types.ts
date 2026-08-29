import type p5 from 'p5'
import type { Lane, LaneCtx } from './lane'
import type { Rng } from './rng'
import type { Theme } from './themes'

/** An edge of a cell. Used by cascade machines that declare inlets and outlets. */
export type Side = 'N' | 'E' | 'S' | 'W'

/** A slot in a layout, in absolute canvas coordinates. */
export interface Cell {
  /** Center of the slot. */
  x: number
  y: number
  /** The grid unit this slot is built from. Equals min(w, h). */
  size: number
  /** Footprint width. Larger than `size` for multi-cell machines. */
  w: number
  /** Footprint height. */
  h: number
  col: number
  row: number
  index: number
  /** 0 for a uniform grid; deeper values come from recursive layouts. */
  depth: number
}

/** Everything a contraption gets when it is first placed into a cell. */
export interface SetupCtx {
  rng: Rng
  /** The grid unit. For a 1x1 machine this is the whole cell. */
  size: number
  /** Footprint width. Draw within [-w/2, w/2]. */
  w: number
  /** Footprint height. Draw within [-h/2, h/2]. */
  h: number
  theme: Theme
  cell: Cell
  /** Convenience: one color already drawn from the theme palette. */
  color: string
}

/** Everything a contraption gets on every frame. */
export interface DrawCtx {
  size: number
  theme: Theme
  /** Phase-shifted frame counter. Integer-ish, monotonically increasing. */
  t: number
  /** `t` normalized against this contraption's period. Always in [0, 1). */
  u: number
  /** Stroke weight in pixels, already scaled for cell size and theme. */
  weight: number
  /** The ink color. Shorthand for `theme.ink`. */
  ink: string
  /** Footprint width in pixels. Equals `size` for a 1x1 machine. */
  w: number
  /** Footprint height in pixels. */
  h: number
  /**
   * 1 at the instant this machine fires, decaying to 0 shortly after. Machines
   * wired into a chain fire in sequence, so this is how a downstream machine
   * reacts to the one before it. Derived from `u`, so still pure.
   */
  fired: number
}

/**
 * A contraption is a small, self-contained machine that fills one cell.
 *
 * Contract:
 *  - `draw` is a PURE function of `ctx.u`. Never accumulate state across
 *    frames; if you need a timer, derive it from `u`. This is what makes
 *    scrubbing, deterministic export, and seamless looping work.
 *  - Draw in cell-local space: the origin is the cell center and the cell
 *    spans [-size/2, size/2]. Rotation and mirroring are applied for you.
 *  - `rectMode(CENTER)` and `angleMode(RADIANS)` are already set.
 */
export interface Contraption<S = unknown> {
  /** Stable id, kebab-case. Used in URLs and the solo picker. */
  name: string
  /** Human label for the UI. Defaults to a title-cased `name`. */
  label?: string
  /** Loose grouping, surfaced in the UI as a filter. */
  tags?: string[]
  /** Period in frames. Must divide LOOP. Defaults to LOOP. */
  period?: number
  /**
   * Footprint in grid cells, [width, height]. Defaults to [1, 1]. A machine
   * with a larger footprint is placed first, claiming a block of free cells,
   * and falls back to nothing if no block fits.
   */
  span?: [number, number]
  /**
   * Where in the loop this machine does its notable thing — the strike, the
   * arrival, the click. Chains line these moments up. Defaults to 0.
   */
  fireAt?: number
  /**
   * Where this machine can sit in a firing chain.
   *
   *   'source' — does something discrete that could plausibly set another
   *              machine off: a strike, an arrival, a bucket going over
   *   'relay'  — visibly conducts: something turns, slides, or passes along
   *   'sink'   — visibly reacts when the signal arrives
   *
   * A machine with no role is never chained. Chains are built as
   * source -> relay* -> sink, which is what makes them read as causal rather
   * than as a line drawn through whatever happened to be adjacent.
   */
  role?: 'source' | 'relay' | 'sink'
  /**
   * Which edges the token may come in and go out by when this machine is
   * wired into a cascade. Undefined means any. Cascade staffing respects
   * these, so a hopper is never asked to send its ball out through its own
   * roof. Chained cascade machines are drawn upright, whatever `rotations`
   * allows. Classic / workshop / circus ignore this.
   */
  inlets?: Side[]
  outlets?: Side[]
  /** Relative likelihood of being picked. Defaults to 1. */
  weight?: number
  /** Allowed quarter-turns, as multiples of TAU/4. Defaults to [0, 1, 2, 3]. */
  rotations?: number[]
  /** Whether the instance may be mirrored on X. Defaults to true. */
  mirror?: boolean
  /**
   * How a token crosses this machine, for the worlds that draw tokens
   * themselves (cascade, workshop). Undefined means the world's default: a
   * straight roll along the catalog's floor. See `core/lane.ts`.
   */
  lane?(ctx: LaneCtx, state: S): Lane
  setup(ctx: SetupCtx): S
  draw(p: p5, state: S, ctx: DrawCtx): void
  /**
   * Drawn after the world's tokens, for parts that must sit in front of them:
   * a tote's front wall, a cup's lip, a hoop's band. Same contract as `draw`.
   */
  over?(p: p5, state: S, ctx: DrawCtx): void
}

/** One placed, oriented, phase-offset copy of a contraption. */
export interface Instance {
  contraption: Contraption<unknown>
  state: unknown
  cell: Cell
  /** Radians, always a multiple of TAU/4. */
  angle: number
  /** 1 or -1. */
  mirror: number
  /** Frames added to the global counter before normalizing. */
  phase: number
  period: number
  /** Absolute frame within the master loop at which this machine fires. */
  fireFrame: number
}

/** A visible link between two machines that fire in sequence. */
export interface Wire {
  from: Cell
  to: Cell
  /** Frame the upstream machine fires. */
  start: number
  /** Frame the downstream machine fires. The pulse travels between the two. */
  end: number
  color: string
  /** True for the link into the last machine, which gets an end terminal. */
  last: boolean
}
