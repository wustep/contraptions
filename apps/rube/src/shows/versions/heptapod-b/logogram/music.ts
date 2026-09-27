import measured from '../../../../../../../scripts/shows/plans/heptapod-b-onsets.json'

/**
 * The recording's clock: Jóhann Jóhannsson's "Heptapod B", from Arrival, played from its first sample
 * (`apps/rube/src/shows/versions/heptapod-b/heptapod-b-demo.mp3`). Measured once by `scripts/shows/heptapod-b-onsets.py`
 * into `scripts/shows/plans/heptapod-b-onsets.json`; `check:shows` holds every strike of this take against that file.
 *
 * It is a machine made of voices. After a few free murmurs, a pulse of short sung notes that never changes pace: one
 * every 0.238715 s (pulse k at 0.0847 + 0.238715 k), from pulse 28 (6.76 s) to pulse 825 (197 s). The voices loop over
 * it in lengths of 7, 13 and 18 pulses, phasing, so there is no bar and no downbeat: only the pulse, and how hard each
 * one is sung (`Pulse.s` against the pulses round it, `Pulse.g` against the whole cue). Strikes land on a pulse or on
 * a measured onset.
 *
 *   0      murmur  free murmurs out of near silence (the first that carries 1.573; a click 4.098)
 *   6.763  rise    the pulse forms, the voices swell up to it; 8.911 the first great pulse
 *   25.89  first   the pulse whole, one layer; a burst of hard pulses 36.37 → 39.73
 *   39.01  second  a second layer of loops; 43.758 a hard one; a burst 52.85 → 55.70 (54.509 the hardest)
 *   65.985 third   a third, brighter; the great burst 70.513 → 72.887 (seven hard pulses in ten)
 *   90.093 lift    the middle voices climb; 97.239 the hardest
 *   107.98 full    the voices at their fullest and softest-edged: few attacks, the loudest moment near 130.3
 *   132.09 held    held at full; 139.476, 156.177, 163.126 (the hardest pulse of the cue after 8.911)
 *   166.96 push    a last push, hard pulses one after another: 168.136 → 184, 183.182 its peak
 *   186    thin    the pulse thins; the last clear one 196.783
 *   197.2  coda    the held tones die away to nothing by 219; a last flutter 208.6 → 212.312
 */

export interface Pulse {
  /** Its index on the comb. */
  k: number
  /** Show time: its own attack where one is within 35 ms of the comb, else the comb. */
  t: number
  /** Whether it has its own attack. */
  onset: boolean
  /** How hard it is sung against the 30 s round it (1 is their 90th percentile), and against the whole cue. */
  s: number
  g: number
}
export interface Onset {
  t: number
  s: number
  /** The stretch it is in: murmur, pulse, coda. */
  in: string
}
interface Data {
  duration: number
  comb: { period: number; phase: number; first: number; last: number }
  sections: { name: string; from: number; to: number }[]
  landmarks: Record<string, number>
  pulses: Pulse[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The recording's length. */
export const RECORDING = data.duration
/** The pulse: its period and the time of pulse 0 (which is before the music: the first is pulse 28). */
export const PERIOD = data.comb.period
export const PHASE = data.comb.phase
export const FIRST_PULSE = data.comb.first
export const LAST_PULSE = data.comb.last

/** Every pulse, first to last. */
export const PULSES: readonly Pulse[] = data.pulses
/** Every measured onset, with its strength. */
export const ONSETS: readonly Onset[] = data.onsets
/** The sections, as measured. */
export const SECTIONS = data.sections

/** Pulse `k`'s show time (its own attack where it has one), or where the comb puts it outside the pulse. */
export function pulse(k: number): number {
  const i = k - FIRST_PULSE
  if (i >= 0 && i < PULSES.length) return PULSES[i].t
  return PHASE + k * PERIOD
}
/** The pulse `k` itself, or null outside the pulse. */
export const pulseAt = (k: number): Pulse | null => PULSES[k - FIRST_PULSE] ?? null
/** The index of the pulse nearest `t`. */
export const nearestK = (t: number): number => Math.round((t - PHASE) / PERIOD)
/** Every pulse from index `a` to `b`, inclusive, as show times. */
export const pulses = (a: number, b: number): number[] => {
  const out: number[] = []
  for (let k = a; k <= b; k++) out.push(pulse(k))
  return out
}
/** The pulses between two show times with `g` at least `min`: the hard ones, for the strikes that must be heard. */
export const hardPulses = (a: number, b: number, min = 0.8): number[] => PULSES.filter((p) => p.t >= a && p.t <= b && p.g >= min).map((p) => p.t)

/** The measured onset nearest `t` with strength at least `min`. */
export function onset(t: number, min = 0.3): number {
  let best = t
  let d = Infinity
  for (const o of ONSETS) {
    if (o.s < min) continue
    const e = Math.abs(o.t - t)
    if (e < d) {
      d = e
      best = o.t
    }
  }
  return best
}

/**
 * How loud the recording is at `t`, 0 (-45 dB and under) to 1 (-11 dB, its loudest), smoothed over half a second
 * either side: for motion the music drives without striking (the fog's glow, the ink's spread, a sway).
 */
export function level(t: number): number {
  const { rms_step: step, rms } = data
  const at = (i: number) => rms[Math.max(0, Math.min(rms.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  let v = 0
  let w = 0
  for (let d = -2; d <= 3; d++) {
    const q = 1 - Math.abs(d - f) / 3.5
    v += at(j + d) * q
    w += q
  }
  return Math.max(0, Math.min(1, (v / w + 45) / 34))
}

/* ------------------------------------------------------------------ landmarks */

/** The first murmur that carries, and the first click. */
export const MURMUR = 1.573
export const CLICK = 4.098
/** The first pulse with an attack. */
export const PULSE_IN = 6.763
/** The first great pulse (pulse 37). */
export const GREAT = pulse(37)
/** The first burst: six hard pulses in a row (pulses 152 to 158), then 162 and 166. */
export const BURST1 = [152, 154, 155, 156, 157, 158].map(pulse)
/** The lift's burst (pulses 221 to 233); its hardest, pulse 228. */
export const BURST2_PEAK = pulse(228)
/** The great burst (pulses 295 to 305): the gravity turn. */
export const TURN = pulse(295)
/** The lift section's hardest pulse (407), and 424. */
export const LOOM = pulse(407)
export const LOOM2 = pulse(424)
/** The full voices' first pulse, and their hardest (501). */
export const FULL = pulse(452)
export const FULL_PEAK = pulse(501)
/** The loudest moment of the cue, a swell with no attack of its own: the pulse at its crest (546). */
export const CREST = pulse(546)
/** The held stretch's hard pulses. */
export const HELD = [pulse(584), pulse(654), pulse(683)] as const
/** The push: its first hard pulse (696) and its peak (767). */
export const PUSH = pulse(696)
export const PUSH_PEAK = pulse(767)
/** The last clear pulse (824). */
export const LAST = pulse(824)
/** The coda's last flutter, its strongest note. */
export const FLUTTER = 212.312

/** When the credits come: once the flutter has rung away and the held tones have died to silence. */
export const CREDITS_AT = 219.6
/** The show's length: the recording, then the credits in the quiet after it. */
export const DURATION = 251

/**
 * The seams: every show time the ball passes from one part to the next. A seam inside a place is a hand-off; one
 * between places is a cut (`seams.ts`). Each is on a pulse.
 */
export const SEAM = {
  /** Out of the lake house's window-light into the cloud over the valley: the first great pulse. A white-out. */
  flight: GREAT,
  /** The helicopter's skids touch the pad (pulse 92). */
  base: pulse(92),
  /** At rest on the lift's deck, the lift about to rise (pulse 183). */
  lift: pulse(183),
  /** Cut: the deck rising into the shell's belly, from outside to inside (pulse 276, the third layer's first). */
  shaft: pulse(276),
  /** Out of the shaft into the chamber (pulse 359). */
  chamber: pulse(359),
  /** Cut: through the glass into the fog, on the cue's loudest swell. */
  fog1: CREST,
  /** Cut: the first sight of Hannah (pulse 584). */
  v1: pulse(584),
  /** Cut: back into the fog (pulse 597). */
  fog2: pulse(597),
  /** Cut: Hannah again, older (pulse 654). */
  v2: pulse(654),
  /** Cut: the fog (pulse 670). */
  fog3: pulse(670),
  /** Cut: the window without her, on the held stretch's hardest pulse (683). */
  v3: pulse(683),
  /** Cut: the fog, for the push (pulse 696). */
  fog4: PUSH,
  /** Cut: out of the fog into the valley, the shells going (pulse 776). */
  after: pulse(776),
  /** Cut: the lake house again, the first frame, on the last clear pulse (824). */
  end: LAST,
} as const
