import type p5 from 'p5'
import type { Rng } from './rng'
import type { Theme } from './themes'

/** A square slot in a layout, in absolute canvas coordinates. */
export interface Cell {
  /** Center of the cell. */
  x: number
  y: number
  /** Edge length. */
  size: number
  col: number
  row: number
  index: number
  /** 0 for a uniform grid; deeper values come from recursive layouts. */
  depth: number
}

/** Everything a contraption gets when it is first placed into a cell. */
export interface SetupCtx {
  rng: Rng
  /** Edge length of the cell. Draw within [-size/2, size/2] on both axes. */
  size: number
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
  /** Relative likelihood of being picked. Defaults to 1. */
  weight?: number
  /** Allowed quarter-turns, as multiples of TAU/4. Defaults to [0, 1, 2, 3]. */
  rotations?: number[]
  /** Whether the instance may be mirrored on X. Defaults to true. */
  mirror?: boolean
  setup(ctx: SetupCtx): S
  draw(p: p5, state: S, ctx: DrawCtx): void
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
}
