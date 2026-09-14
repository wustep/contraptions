import { buildUniverse, hasDynamics, universeAt, type Universe, type UniversePoint } from './universe'

/**
 * The show: an endless sequence of universes from one seed. Universe `i` is
 * built from `seed#i`, so the whole future is fixed by the seed and any
 * moment of it can be rebuilt on demand — scrubbing backwards, jumping
 * ahead, reloading the link.
 */
export interface ShowPoint extends UniversePoint {
  universe: Universe
  /** Seconds since this universe began. */
  local: number
  /** Show time at which this universe began. */
  begin: number
}

export class Show {
  private universes: Universe[] = []
  private starts: number[] = []

  /** `solo` narrows the planner to one piece (plus rail). Debug only. */
  constructor(
    public readonly seed: string,
    public readonly solo: string | null = null,
  ) {}

  universe(i: number): Universe {
    while (this.universes.length <= i) {
      const n = this.universes.length
      const previous = n ? this.universes[n - 1] : null
      const avoid = { themes: this.universes.map((u) => u.theme.name), taste: previous?.taste ?? null, dynamicsLast: previous ? hasDynamics(previous) : false }
      const u = buildUniverse(this.seed, n, avoid, this.solo)
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

  at(t: number): ShowPoint {
    const i = this.indexAt(Math.max(0, t))
    const universe = this.universe(i)
    const begin = this.starts[i]
    const local = Math.max(0, t) - begin
    return { ...universeAt(universe, local), universe, local, begin }
  }
}
