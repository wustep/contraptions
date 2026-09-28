import { inkRing, type Ring } from '../cast'

/** Their rings by seed, made once: the same seed is the same word everywhere it is seen. */
const ringOf = new Map<number, Ring>()
export const ring = (seed: number): Ring => {
  let r = ringOf.get(seed)
  if (!r) {
    r = inkRing(seed)
    ringOf.set(seed, r)
  }
  return r
}

/** A word as a card keeps it, small: the same ring, its ink heavier, so it still reads at a card's size. */
const heavyOf = new Map<number, Ring>()
export const heavy = (seed: number): Ring => {
  let r = heavyOf.get(seed)
  if (!r) {
    const base = ring(seed)
    r = { ...base, w: (a) => base.w(a) * 1.6 }
    heavyOf.set(seed, r)
  }
  return r
}
