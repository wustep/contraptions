/**
 * Theater's running order: every take in the pool, shuffled, each played
 * once before any comes round again. A round that runs out is shuffled
 * afresh, and the new round never opens on the take that just closed the
 * old one, so nothing plays twice running unless it is all there is.
 *
 * The pool can change mid-round. A take let back in joins what is left of
 * the round, somewhere at random, unless it has already had its turn; a
 * take left out is dropped from what is left. The take on the stage is
 * never taken off by a change to the pool: the next one waits its turn.
 *
 * Pure: the dice are handed in, so the headless checks can drive it.
 */

export interface Playlist {
  /** The take that is on: the last one `next()` or `play()` gave. */
  readonly current: string | null
  /** The take `next()` would give now, without moving on. */
  peek(): string | null
  /** Move on: the next take in this round, or the first of a fresh one. Null with an empty pool. */
  next(): string | null
  /** Put a take on out of turn (a link that names it). It counts as its turn this round. */
  play(id: string): void
  /** Which takes are in. Order does not matter. */
  setPool(ids: readonly string[]): void
  readonly pool: readonly string[]
}

export function createPlaylist(ids: readonly string[], random: () => number = Math.random): Playlist {
  let pool: string[] = [...new Set(ids)]
  /** What is left of this round, next first. */
  let queue: string[] = []
  /** What has had its turn this round, so a take let back in mid-round does not get a second. */
  let played = new Set<string>()
  let current: string | null = null

  const roll = (n: number): number => Math.min(n - 1, Math.floor(random() * n))

  const shuffle = (list: string[]): string[] => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = roll(i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /** A fresh round when this one is spent. Not opening on what just played, when there is anything else. */
  const fill = (): void => {
    if (queue.length || !pool.length) return
    played = new Set()
    queue = shuffle(pool)
    if (queue.length > 1 && queue[0] === current) {
      const j = 1 + roll(queue.length - 1)
      ;[queue[0], queue[j]] = [queue[j], queue[0]]
    }
  }

  return {
    get current() {
      return current
    },
    get pool() {
      return pool
    },
    peek() {
      fill()
      return queue[0] ?? null
    },
    next() {
      fill()
      const id = queue.shift() ?? null
      if (id === null) return null
      played.add(id)
      current = id
      return id
    },
    play(id) {
      queue = queue.filter((q) => q !== id)
      played.add(id)
      current = id
    },
    setPool(next) {
      const nextPool = [...new Set(next)]
      const added = nextPool.filter((id) => !pool.includes(id))
      pool = nextPool
      queue = queue.filter((id) => pool.includes(id))
      for (const id of added) {
        if (played.has(id) || id === current) continue
        queue.splice(roll(queue.length + 1), 0, id)
      }
    },
  }
}
