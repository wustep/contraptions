import type { Move } from '../../path'

/**
 * A move built the first time it is asked where the ball is, not when the scene is read: a move whose ends are on the
 * sea (a ship's deck, the swell where something falls) has to see the sea as the score sets it (`setWeather`), which
 * happens after every scene is read. Its times are known at once; its shape waits.
 */
export function lazy(t0: number, t1: number, kind: Move['kind'], build: () => Move): Move {
  let inner: Move | null = null
  const get = (): Move => (inner ??= build())
  return {
    t0,
    t1,
    kind,
    at: (t) => get().at(t),
    turn: (t) => get().turn?.(t) ?? 0,
    scale: (t) => get().scale?.(t) ?? 1,
  }
}

/** A value worked out the first time it is wanted, for the same reason. */
export function later<T>(make: () => T): () => T {
  let v: T | undefined
  let made = false
  return () => {
    if (!made) {
      v = make()
      made = true
    }
    return v as T
  }
}
