import type { Box } from '../../../../plan'
import type { Shot } from './lens'
import type { Move } from './motion'
import type { Placed } from '../../../../plan'
import type { Actor } from './show'

/**
 * A scene: one stretch of the film, owning a window of show time. Inside its window it says where Paul and Chani are,
 * who else is on the stage, where the camera looks, and what is drawn; outside it, nothing. The score (`score.ts`)
 * lays the scenes end to end.
 *
 * Everything is in world cells and show seconds, absolute. The world is three places far apart along x, each with its
 * own ground: the deep desert (x from -100 to 2600, the flat at y = 0, up negative), Giedi Prime's arena (about x =
 * 6000) and the basin under the storm (about x = 9000). A change of place is a dissolve.
 */
export interface Scene {
  key: string
  /** The window it owns, show seconds: from ≤ t < to. */
  from: number
  to: number
  /** Paul's moves inside the window, and Chani's. Where a window gives none, they are off the stage. */
  paul?: Move[]
  chani?: Move[]
  /** Balls of its own: the Fremen, Feyd-Rautha, the prisoners. */
  actors?: Actor[]
  /** Camera shots inside the window. */
  shots: Shot[]
  /**
   * Dissolves: [at, dur]. At `at` the camera cuts, and the frame it left is laid over the new one and fades off over
   * `dur` seconds (`Performance.blend`). For a change of place the camera cannot travel.
   */
  dissolves?: [number, number][]
  /** Drawings, in order: behind everything, behind the balls, and in front of the balls. */
  back?: Placed[]
  mid?: Placed[]
  front?: Placed[]
  /** What Overview frames while this scene has the stage. */
  overview: Box
  /**
   * The strikes the scene turns on, by name, show seconds: each lands on something the recording has (an onset, or a
   * beat of a comb), and `check:shows` holds it there.
   */
  strikes?: [string, number][]
}
