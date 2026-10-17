import { smooth } from '../kit'
import { at } from '../music'
import { A, DEAD, DIES, REST_AT, SMASHES, T0, WINNER } from './geo'

/**
 * The house's mood, which everything in the hall goes by: the gallery, the front row, the press, the air.
 *
 * A cheer (up off the benches, arms up) after the big shots: Marty's smash that wins the semifinal and the one that
 * wins him the final's first point, a smaller one for the others; and a groan as the last point dies.
 */
const CHEERS: [number, number, number][] = SMASHES.map((s): [number, number, number] =>
  s.who !== 'marty' ? [s.t, 0.3, 0.9] : s.table === A || Math.abs(s.t - WINNER) < 1e-6 ? [s.t, 1, 2.6] : [s.t, 0.4, 1.0],
)
export function cheer(t: number): number {
  let v = 0
  for (const [t0, amt, dur] of CHEERS) {
    const u = t - t0 - 0.06
    if (u < 0 || u > dur) continue
    v = Math.max(v, amt * smooth(u, 0, 0.16) * (1 - smooth(u, dur * 0.45, dur)))
  }
  return v
}
export const groan = (t: number): number => smooth(t, DIES, DIES + 0.45) * (1 - smooth(t, DIES + 2.4, DIES + 4))

/** Marty's smash that wins the semifinal. */
export const SEMI_WIN = Math.max(...SMASHES.filter((s) => s.who === 'marty' && s.table === A).map((s) => s.t))

/**
 * How full the hall is of life, 0.3 to 1: quiet as the lamp clicks on for the semifinal, building through it and the
 * final's first point to the last point, where it is busiest; then, once the ball has died, it goes out of it
 * (`hush`).
 */
export const busy = (t: number): number => 0.3 + 0.7 * smooth(t, T0 + 1, at(40, 1))
/** 0 until the dead ball dies, then 1: the hall after the loss. */
export const hush = (t: number): number => smooth(t, DIES, DIES + 2.5)
/** Just the dead shot and the ball dying: nothing in the hall competes with it. */
export const still = (t: number): number => smooth(t, DEAD - 0.6, DEAD - 0.15) * (1 - smooth(t, DIES + 0.1, DIES + 0.5))
/** The hall getting up to go, once he has come to rest on the boards: 0 to 1. */
export const leaving = (t: number): number => smooth(t, REST_AT - 1.3, REST_AT + 0.5)
