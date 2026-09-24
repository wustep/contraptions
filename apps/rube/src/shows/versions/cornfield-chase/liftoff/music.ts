/**
 * The recording's clock, as measured once by `scripts/cornfield-opus55-onsets.py`
 * (the numbers below are read from `scripts/show-plans/cornfield-opus55-onsets.json`;
 * `check:shows` holds every strike of this take against that file).
 *
 * - 0 to 33.1 s, the piano, rubato: no grid, so the house strikes the piano's own notes.
 * - 33.1 s, the organ comes in and gathers for nine seconds.
 * - 42.48 s, the drop. From here the chase runs on a 96 bpm comb: beat b at 0.008 + 0.625 b s.
 * - Beat 134 (83.76 s), the pedal comes in under the organ: the launch.
 * - Beat 191 (119.41 s), the last hit. Then the decay, to 126.98 s.
 */

export const DURATION = 126.984
export const PERIOD = 0.625
export const ORIGIN = 0.008

/** Show time of beat `b` (fractions are eighths). */
export const beat = (b: number): number => ORIGIN + PERIOD * b

/** The drop, measured: 27 ms ahead of beat 68 on the comb. */
export const DROP = 42.481
/** The organ's first onset. */
export const ORGAN = 33.135
/** The last hit, beat 191 as measured. */
export const LAST = 119.409

/** Beat 134: the pedal. The engines. */
export const IGNITION = beat(134)

/** Beats `a` to `b` inclusive, every `step` beats. */
export const beats = (a: number, b: number, step = 1): number[] => {
  const out: number[] = []
  for (let x = a; x <= b + 1e-9; x += step) out.push(beat(x))
  return out
}
