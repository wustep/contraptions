import type { Contraption } from './types'

/**
 * Identity helper that pins the state type without forcing you to annotate it.
 *
 *   export const pipe = defineContraption({
 *     name: 'pipe',
 *     setup: ({ rng, color }) => ({ color, flip: rng.sign() }),
 *     draw: (p, s, { size, u }) => { ... },
 *   })
 */
export function defineContraption<S>(spec: Contraption<S>): Contraption<S> {
  return spec
}
