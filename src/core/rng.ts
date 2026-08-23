/**
 * Deterministic, forkable PRNG. Everything random in a composition comes from
 * here so that a seed string fully determines the piece.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number
  /** Uniform in [lo, hi). */
  range(lo: number, hi: number): number
  /** Integer in [lo, hi). */
  int(lo: number, hi: number): number
  /** True with probability p (default 0.5). */
  bool(p?: number): boolean
  /** Uniform choice from a non-empty array. */
  pick<T>(items: readonly T[]): T
  /** Choice weighted by `weight(item)`; falls back to uniform when all weights are 0. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T
  /** -1 or 1. */
  sign(): number
  /** A new independent stream, derived from this one's seed plus `salt`. */
  fork(salt: string): Rng
}

export function makeRng(seed: string): Rng {
  const next = mulberry32(xmur3(seed)())
  const rng: Rng = {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo)),
    bool: (p = 0.5) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted(items, weight) {
      const weights = items.map(weight)
      const total = weights.reduce((a, b) => a + b, 0)
      if (total <= 0) return rng.pick(items)
      let roll = next() * total
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i]
        if (roll <= 0) return items[i]
      }
      return items[items.length - 1]
    },
    sign: () => (next() < 0.5 ? -1 : 1),
    fork: (salt) => makeRng(`${seed}::${salt}`),
  }
  return rng
}
