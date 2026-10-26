import type { Placed } from '../../../../plan'
import type { Shot } from './camera'
import type { Who } from './cast'
import type { Pt } from './paint'
import type { Seg } from './path'
import type { Actor } from './show'

/**
 * A scene: one stretch of the film, owning a window of show time. Inside its window the scene says where the
 * principals are (`moves`), who else is on the stage (`actors`), where the camera looks (`shots`), what is drawn
 * (`pieces`), and how the picture changes (dissolves, dreams, the frame's bars); outside it, nothing of that. The score
 * (`score.ts`) lays the scenes end to end.
 *
 * Everything is in world cells and show seconds, absolute. Up is negative. The world holds Caladan and Arrakis side by
 * side (`plan.ts` says where each place is), so a scene draws only round its own place and nothing else is ever seen.
 */
export interface Scene {
  key: string
  /** The window it owns, show seconds: from ≤ t < to. */
  from: number
  to: number
  /** The principals' segments inside the window (a `Walk`'s `segs`). A principal with none is off the stage. */
  moves?: Partial<Record<Who, Seg[]>>
  /**
   * Where a principal looks while it is not rolling: [from, to, angle] windows in which its mark turns to `angle`
   * (radians: 0 is to its right, −π/2 up, π/2 down) and holds there, easing in and out over a third of a second.
   */
  looks?: Partial<Record<Who, [number, number, number][]>>
  /** A principal's colour going out (death): [time it starts, seconds it takes]. */
  deaths?: Partial<Record<Who, [number, number]>>
  /** Balls of its own (the crew, soldiers, the Fremen), each with its own run. */
  actors?: Actor[]
  /** The camera's shots inside the window. The first should be at `from` (marked `cut` unless a dissolve covers it). */
  shots: Shot[]
  /**
   * Dissolves: [at, seconds]. At `at` the camera cuts, and the frame it left is laid over the new one and fades off.
   * For a change of place the camera cannot travel. A dissolve at a scene's `from` is that scene's to give.
   */
  dissolves?: [number, number][]
  /** Visions: a later moment of the show seen through an opening in this one (`Dream`). */
  dreams?: Dream[]
  /** The frame's bars: [t, 1 for the old scope picture (2.39:1), 0 for the open frame], eased between keys. */
  scope?: [number, number][]
  /** Its drawings, in order: each piece's `draw` goes under the balls and its `over` over them. */
  pieces: Placed[]
  /** What it strikes, by name, for the checks: each should be on something the recording has. */
  strikes?: [string, number][]
  /** Where someone leaves the stage behind something drawn over them: [t, ball id]. */
  covered?: [number, number][]
}

/**
 * A vision. From `from` to `to` the show's later moment `at` (advancing at `rate` of real time from there) is laid over
 * the frame, `a(t)` of the way, through a soft round opening that grows from something in the picture (`iris`, in the
 * live frame's cells), or over the whole frame where it gives none. It has no drawn edge.
 */
export interface Dream {
  from: number
  to: number
  at: number
  rate: number
  a(t: number): number
  iris?(t: number): { x: number; y: number; r: number; soft: number } | null
}

export type { Pt }
