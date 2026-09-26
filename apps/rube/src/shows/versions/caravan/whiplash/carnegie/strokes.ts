import type { KitPiece } from '../drums'
import type { KitStroke } from '../stub'
import { SABOTAGE_KIT } from './sabotage'
import { SOLO_KIT } from './solo'
import { HUSH_KIT } from './hush'
import { FAST_KIT } from './fast'
import { RUBATO_KIT } from './rubato'
import { FINALE_KIT } from './finale'

/**
 * Every stroke on the Carnegie kit, from every part that plays it, in order: what the hall's kit answers (a head
 * dips, a cymbal swings). The director's; a part adds to it only through its own `*_KIT` export.
 */
export const STROKES: readonly KitStroke[] = [...SABOTAGE_KIT, ...SOLO_KIT, ...HUSH_KIT, ...FAST_KIT, ...RUBATO_KIT, ...FINALE_KIT].sort((a, b) => a.t - b.t)

const byPiece = new Map<KitPiece, number[]>()
for (const s of STROKES) {
  const list = byPiece.get(s.piece) ?? []
  list.push(s.t)
  byPiece.set(s.piece, list)
}

/** Seconds since `piece` was last struck at show time `t`, Infinity if it has not been. */
export function sinceStroke(piece: KitPiece, t: number): number {
  const list = byPiece.get(piece)
  if (!list?.length || list[0] > t) return Infinity
  let lo = 0
  let hi = list.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (list[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return t - list[lo]
}
