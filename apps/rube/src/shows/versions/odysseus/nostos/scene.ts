import type { Placed } from '../../../../plan'
import type { Key } from './camera'
import type { Move, Pt } from './path'
import type { Actor } from './show'
import type { Pose, ShipLook } from './world/ship'
import type { SkyKey } from './world/sky'

/**
 * A scene: one stretch of the voyage, owning a window of show time. Inside its window the scene says where the hero
 * is, where the camera looks, what the sky and the sea are doing, where the ships are, and what is drawn; outside it,
 * nothing. The score (`score.ts`) lays the scenes end to end and holds them to their seams: the hero, the ships and the
 * camera leave one window exactly as the next takes them up (`SEAMS` in `voyage.ts`).
 *
 * Everything is in world cells and show seconds, absolute: the sea's waterline is y = 0, up is negative, and the
 * voyage runs left to right, from Troy (x < 0) to Ithaca (x ≈ 820) and on west into the sun.
 */
export interface Scene {
  key: string
  /** The window it owns, show seconds: from ≤ t < to. */
  from: number
  to: number
  /** The sky inside the window (and the sea's colours, which go with it). */
  sky?: SkyKey[]
  /** How rough the sea is: [t, 0 calm .. 1 storm], eased between keys. */
  weather?: [number, number][]
  /**
   * The ships inside the window, by index (0 is his own): where each is, how it looks, and when it is gone. Every ship
   * still afloat needs a part in every window.
   */
  ships?: Partial<Record<number, ShipPart>>
  /** The hero's moves inside the window. Where none is given he rides his ship at his place on the deck. */
  hero?: Move[]
  /** His men's moves inside the window, by man (0 to MEN - 1). A man left out rides his ship at his place. */
  men?: Partial<Record<number, Move[]>>
  /** When men die inside the window, by man: from that time on they are not on the stage. */
  deaths?: Partial<Record<number, number>>
  /** Camera keys inside the window. */
  shots: Key[]
  /**
   * Dissolves: [at, dur]: at `at` the camera cuts, and the frame it left is laid over the new one and fades off over
   * `dur` seconds (`Performance.blend`). For a change of place the camera cannot travel.
   */
  dissolves?: [number, number][]
  /** Drawings, in order: behind the ships, in front of the ships (under the balls), and over everything. */
  back?: Placed[]
  mid?: Placed[]
  front?: Placed[]
  /** Balls of its own: shades, suitors, Penelope, Telemachus. */
  actors?: Actor[]
}

export interface ShipPart {
  /** Where it is along the sea, floating on the swell (`glide` builds one from [t, x, speed] keys). */
  x?: (t: number) => number
  /** Or its pose outright (beached, sinking, broken). */
  pose?: (t: number) => Pose
  /** Its look, over the default (sail set, oars shipped). */
  look?: (t: number) => Partial<ShipLook>
  /** It is gone from this time on (sunk). */
  gone?: number
}

export type { Pt }
