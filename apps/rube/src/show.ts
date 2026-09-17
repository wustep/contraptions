import { buildUniverse, hasDynamics, universeAt, type Universe, type UniversePoint } from './universe'
import { worldAt, worldByName, worldOf, type World } from './worlds'

/**
 * The show: an endless sequence of universes from one seed. Universe `i` is
 * a visit to world `i mod 4` of the loop — workshop, harbor, garden,
 * arcade, and round again — built from `seed#i`, so the whole future is
 * fixed by the seed and any moment of it can be rebuilt on demand:
 * scrubbing backwards, jumping ahead, reloading the link. The seed decides
 * what each visit looks like, never which world comes next.
 */
export interface ShowPoint extends UniversePoint {
  universe: Universe
  /** Seconds since this universe began. */
  local: number
  /** Show time at which this universe began. */
  begin: number
}

export interface ShowOptions {
  /** Narrow the planner to one piece (plus rail and portals). Debug and the catalog. */
  solo?: string | null
  /** Stay in one world instead of going round the loop. Debug and the catalog; implied by a solo. */
  world?: string | null
}

export class Show {
  private universes: Universe[] = []
  private starts: number[] = []
  public readonly solo: string | null
  /** The world every universe is built in, when pinned; null to go round the loop. */
  public readonly pinned: World | null

  constructor(
    public readonly seed: string,
    options: ShowOptions = {},
  ) {
    this.solo = options.solo ?? null
    // A solo is a piece in one world; the show stays there so the piece is always in the pool.
    this.pinned = (options.world ? worldByName(options.world) : null) ?? (this.solo ? worldOf(this.solo) : null)
  }

  /** The world universe `i` is a visit to. */
  worldAt(i: number): World {
    return this.pinned ?? worldAt(i)
  }

  universe(i: number): Universe {
    while (this.universes.length <= i) {
      const n = this.universes.length
      const world = this.worldAt(n)
      const previous = n ? this.universes[n - 1] : null
      // The last visit to this same world, so this one can look different from it.
      let lastHere: Universe | null = null
      for (let j = n - 1; j >= 0; j--) {
        if (this.universes[j].world === world) {
          lastHere = this.universes[j]
          break
        }
      }
      const avoid = {
        theme: lastHere?.theme.name ?? null,
        taste: lastHere?.taste ?? null,
        dynamicsLast: previous ? hasDynamics(previous) : false,
        pieces: lastHere ? new Set(lastHere.pieces.map((p) => p.piece.name)) : null,
      }
      const u = buildUniverse(this.seed, n, world, avoid, this.solo)
      this.universes.push(u)
      this.starts.push(previous ? this.starts[n - 1] + previous.journey : 0)
    }
    return this.universes[i]
  }

  begin(i: number): number {
    this.universe(i)
    return this.starts[i]
  }

  /** Which universe holds show time `t`. */
  indexAt(t: number): number {
    let i = 0
    for (;;) {
      const u = this.universe(i)
      if (t < this.starts[i] + u.journey || t <= 0) return i
      i++
    }
  }

  /** The first universe after `from` that is a visit to `world`. */
  nextVisit(from: number, world: World): number {
    let i = from + 1
    while (this.worldAt(i) !== world) {
      i++
      if (i > from + 8) return from + 1
    }
    return i
  }

  at(t: number): ShowPoint {
    const i = this.indexAt(Math.max(0, t))
    const universe = this.universe(i)
    const begin = this.starts[i]
    const local = Math.max(0, t) - begin
    return { ...universeAt(universe, local), universe, local, begin }
  }
}
