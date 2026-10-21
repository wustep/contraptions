import type { Box } from '../../../../plan'
import type { Placed } from '../../../../plan'
import type { Key } from './camera'
import type { Move } from './path'
import type { Actor } from './show'

/**
 * A scene: one stretch of the film, owning a window of show time. Inside its window it says where Chihiro is, who
 * else is there and where, where the camera looks, and what is drawn. The score (`score.ts`) lays the scenes end to
 * end; a scene hands her on to the next where the next takes her up, so nothing steps at a seam.
 *
 * Everything is in world cells and show seconds, absolute. Up is negative. The world runs west to east: the tunnel and
 * the meadow, the river of stones, the town, the bridge and the bathhouse, and the sea going away east to the Sixth
 * Station (`world.ts`).
 */
export interface Scene {
  key: string
  /** The window it owns, show seconds: from ≤ t < to. */
  from: number
  to: number
  /** Chihiro's moves inside the window. */
  hero: Move[]
  /** Haku's and No-Face's moves inside the window, and when they are on the stage there. */
  haku?: { moves: Move[]; on?: [number, number][] }
  noface?: { moves: Move[]; on?: [number, number][] }
  /** Balls of its own (the bathhouse's hands). */
  actors?: Actor[]
  /** Camera keys inside the window. */
  shots: Key[]
  /**
   * Dissolves: [at, dur]: at `at` the camera cuts, and the frame it left is laid over the new one and fades off over
   * `dur` seconds (`Performance.blend`). For a change of place or of time the camera cannot travel.
   */
  dissolves?: [number, number][]
  /** Drawings: behind (sky and far land), the set under the balls, and in front of them. */
  back?: Placed[]
  mid?: Placed[]
  front?: Placed[]
  /** What Overview frames while this scene has the stage. */
  overview?: Box
}
