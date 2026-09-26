import { mixHex } from '../../../../parts'
import { CURSE, HEART, SLOW } from './music'
import { SOPHIE_SILVER, sophie } from './worlds'

/**
 * Sophie's age over the show, and so her colour: the director's, and the only way the show says it. She is young
 * (chestnut) until the curse; the Witch greys her on the accents after it, a step a hit; she is old (dull silver) up
 * the hills, in the castle and at breakfast; among the flowers she forgets herself and warms most of the way back to
 * young (the film's own rule: she is younger when she forgets to be old); the war's fleet over the lake ages her
 * again; when she gives Howl back his heart the curse breaks and she is young with her hair gone silver: bright
 * silver, to the end.
 *
 * If your scene needs another shape, say so in your report; do not colour the ball yourself.
 */

/** [show time, age] keys; linear between them. 0 young, 1 old. */
const KEYS: [number, number][] = [
  [0, 0],
  [CURSE - 0.02, 0],
  // The curse: a step greyer on each of the accents after it, the last of them the oldest.
  [CURSE + 0.12, 0.3],
  [102.01, 0.4],
  [102.39, 0.48],
  [103.14, 0.58],
  [103.51, 0.66],
  [104.26, 0.74],
  [104.62, 0.8],
  [105.34, 0.87],
  [105.7, 0.92],
  [106.43, 0.97],
  [106.81, 1],
  // The castle's morning: she has forgotten a little, busy.
  [151.998, 1],
  [165, 0.9],
  [178.0, 0.92],
  // The flowers: she forgets herself.
  [SLOW + 2, 0.85],
  [192, 0.3],
  [199.2, 0.25],
  // The fleet on the sky: fear.
  [203.5, 0.8],
  [206, 0.9],
  [HEART - 0.02, 0.9],
]

/** Her age at `t`, 0..1 (1 old); after the heart it is no longer an age but the curse broken (`sophieAt`). */
export function age(t: number): number {
  if (t <= KEYS[0][0]) return KEYS[0][1]
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, a1] = KEYS[i]
    if (t <= t1) {
      const [t0, a0] = KEYS[i - 1]
      return a0 + ((a1 - a0) * (t - t0)) / Math.max(1e-6, t1 - t0)
    }
  }
  return KEYS[KEYS.length - 1][1]
}

/** How far the curse has broken at `t`: 0 until she gives him his heart, 1 within a second and a half after. */
export const unbroken = (t: number): number => {
  const u = Math.max(0, Math.min(1, (t - HEART) / 1.5))
  return u * u * (3 - 2 * u)
}

/** Sophie's colour at show time `t`. */
export const sophieAt = (t: number): string => mixHex(sophie(age(t)), SOPHIE_SILVER, unbroken(t))
