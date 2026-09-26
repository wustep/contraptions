/**
 * The recording's clock, as measured once by `scripts/shows/cornfield-opus55-onsets.py`
 * (the numbers below are read from `scripts/shows/plans/cornfield-opus55-onsets.json`;
 * `check:shows` holds every strike of this take against that file).
 *
 * - 0 to 33.1 s, the piano, rubato: no grid, so the house strikes the piano's own notes.
 * - 33.1 s, the organ comes in and gathers for nine seconds.
 * - 42.48 s, the drop. From here the chase runs on a 96 bpm comb: beat b at 0.008 + 0.625 b s.
 * - Beat 134 (83.76 s), the pedal comes in under the organ: the launch.
 * - Beat 191 (119.41 s), the last hit. Then the decay, to 126.98 s.
 */

/** The mix (`scripts/shows/liftoff-mix.sh`), Cornfield Chase and then No Time for Caution: where the music ends. */
export const MIX_END = 262.741
/**
 * The whole show: the mix, and then the end credits over the camp, in silence (`credits.ts`). The player's clock
 * carries on from the wall clock once the recording has run out (`shows/clock.ts`), and so does an export.
 */
export const DURATION = 291
/** Where the Cornfield recording ends in the mix, and Act I with it. */
export const ACT1_END = 126.984
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

/**
 * Act II: No Time for Caution, from the mix (measured by
 * `scripts/shows/liftoff-ntfc-onsets.py` into `scripts/shows/plans/liftoff-ntfc-onsets.json`).
 * The organ's pulse is 60 bpm: beat k of the cue at 23.5177 + 0.9999·k s of the
 * show. It comes in on beat 104 (the accent at 127.51 s); it steps up on 132,
 * 152, 156 and 184, peaks on 228 and stops dead after 232.
 */
export const CUE2_ORIGIN = 23.5177
export const CUE2_PERIOD = 0.9999
/** Show time of beat `k` of No Time for Caution (fractions are eighths). */
export const cue = (k: number): number => CUE2_ORIGIN + CUE2_PERIOD * k
/** The organ's accent: the lights come up in the station. */
export const ACT2 = cue(104)
/** The big step: the Ranger lets go of the station. */
export const UNDOCK = cue(184)
/** The peak, and the last full hit before the cue stops. */
export const PEAK = cue(228)
export const FINAL = cue(232)
