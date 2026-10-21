import { BEAT, BEATS } from '../../music'

/**
 * The beat, by its place on the comb: `k(0)` is the first downbeat of the pulse's first twelve-beat phrase (188.35 s),
 * `k(24)` the third phrase's (206.35), and so on to the cut. Each is the beat's own attack where it has one.
 */
const AT = 188.35
const byK = new Map<number, number>()
for (const b of BEATS) byK.set(Math.round((b.t - AT) / BEAT), b.t)

export function k(n: number): number {
  return byK.get(n) ?? AT + n * BEAT
}

/** The comb index of the beat at or before `t`. */
export function kAt(t: number): number {
  let n = Math.floor((t - AT) / BEAT)
  while (k(n + 1) <= t) n++
  while (k(n) > t) n--
  return n
}

/**
 * Strokes of the oars at `t`: a whole number on each beat (the catch), and between two beats the share of the way from
 * one to the next, so a stroke always lasts exactly its beat and the oars bite on the music.
 */
export function strokeAt(t: number): number {
  const n = kAt(t)
  const a = k(n)
  const b = k(n + 1)
  return n + Math.max(0, Math.min(1, (t - a) / Math.max(1e-6, b - a)))
}
