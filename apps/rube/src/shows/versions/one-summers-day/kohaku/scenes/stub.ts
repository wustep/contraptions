import { R } from '../../../../../parts'
import type { Key } from '../camera'
import type { Pt } from '../paint'
import { rest } from '../path'
import type { Scene } from '../scene'

/** A scene not yet built: she waits at `at`, the camera holds on her. Replaced as each scene lands. */
export function stub(key: string, from: number, to: number, at: Pt, shots?: Key[]): Scene {
  const her: Pt = [at[0], at[1] - R]
  return {
    key,
    from,
    to,
    hero: [rest(her, from, to)],
    shots: shots ?? [{ t: from, cells: 8, at: [at[0], at[1] - 1.5], cut: true }],
  }
}
