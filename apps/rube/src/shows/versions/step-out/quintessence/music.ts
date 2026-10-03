import measured from '../../../../../../../scripts/shows/plans/step-out-onsets.json'

/**
 * The recording's clock: José González's "Step Out", from The Secret Life of Walter Mitty (2013), played by YouTube
 * from Republic Records' own upload (5EV9IdeU3D0) from its first second, so show time is the video's time. Measured
 * once by `scripts/shows/step-out-onsets.py` into `scripts/shows/plans/step-out-onsets.json`; `check:shows` holds every
 * strike of this take against that file.
 *
 * It is played by a band, not a machine: a pulse of about 144 beats a minute that leans between 143 and 145, so there
 * is no one comb. Every beat was tracked one by one and moved onto its own attack. It is in four, counted from the
 * band's first downbeat (bar 1, 10.363 s): `at(bar, pos)` is the show time of beat `pos` (1 to 4) of bar `bar`. The
 * lead before the band is bars -3 to 0. A strike lands on a beat (`at`, `beats`) or on a measured onset (`onset`).
 *
 *   0        swell   a swell out of silence (0.088)
 *   3.519    lead    the guitar and the bass on the pulse, no hats: bars -3 to 0
 *   10.363   band    the band in on bar 1: drums, hats, the voice; nine phrases of four bars
 *   70.398   under   bar 37: everything over the bass drops out, the kick and the bass alone, as if under water
 *   88.620   band2   bar 48: the band back in
 *   120.06   hush    bar 67: it stops; a held low note, and the guitar picking softly under it
 *   133.278  pulse   bar 75: a low pulse comes back under the hush
 *   146.519  build   bar 83: the choir and the band come up, a phrase at a time
 *   191.409  peak    bar 110: the whole band and the choir, the loudest stretch
 *   226.384  fall    bar 131: the band drops away
 *   233.048  last    the last chord, ringing out to the video's end (241.07)
 */

export interface Beat {
  /** Show time: its own attack where one is within 25 ms of the tracked pulse, else the pulse. */
  t: number
  /** Whether it has its own attack. */
  onset: boolean
  /** The stretch it is in. */
  in: string
  /** How hard it is struck against the beats round it (1 is their 90th percentile). */
  s: number
  /** Its bar, counted from the band's first downbeat (bar 1), and its place in the bar, 1 to 4. */
  bar: number
  pos: number
}
export interface Onset {
  t: number
  /** Against the 95th percentile of the peaks of its own stretch. */
  s: number
  in: string
}
interface Data {
  youtube: string
  duration: number
  stretches: { name: string; from: number; to: number; kind: 'beat' | 'free' }[]
  landmarks: Record<string, number>
  beats: Beat[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The video's length: the show's music. */
export const RECORDING = data.duration
export const YOUTUBE = data.youtube

/** Every beat, first to last, and every measured onset. */
export const BEATS: readonly Beat[] = data.beats
export const ONSETS: readonly Onset[] = data.onsets
export const STRETCHES = data.stretches

const byBar = new Map<string, Beat>(BEATS.map((b) => [`${b.bar}.${b.pos}`, b]))
/** The beat `pos` (1 to 4) of bar `bar`, or undefined outside the pulse. */
export const beatOf = (bar: number, pos = 1): Beat | undefined => byBar.get(`${bar}.${pos}`)
/** The show time of beat `pos` of bar `bar`. Throws outside the pulse, so a part cannot strike a beat that is not there. */
export function at(bar: number, pos = 1): number {
  const b = beatOf(bar, pos)
  if (!b) throw new Error(`quintessence: no beat ${bar}.${pos}`)
  return b.t
}
/** The off-beat after beat `pos` of bar `bar`: half-way to the next beat (the guitar's eighths), not a measured attack. */
export function and(bar: number, pos = 1): number {
  const i = BEATS.findIndex((b) => b.bar === bar && b.pos === pos)
  if (i < 0 || i + 1 >= BEATS.length) throw new Error(`quintessence: no beat ${bar}.${pos}`)
  return (BEATS[i].t + BEATS[i + 1].t) / 2
}
/** Every beat from bar.pos `a` to bar.pos `b`, inclusive, as show times. */
export function beats(a: [number, number], b: [number, number]): number[] {
  const i0 = BEATS.findIndex((x) => x.bar === a[0] && x.pos === a[1])
  const i1 = BEATS.findIndex((x) => x.bar === b[0] && x.pos === b[1])
  if (i0 < 0 || i1 < 0) throw new Error(`quintessence: no beats ${a.join('.')} to ${b.join('.')}`)
  return BEATS.slice(i0, i1 + 1).map((x) => x.t)
}
/** The downbeats of bars `a` to `b`, inclusive. */
export const downbeats = (a: number, b: number): number[] => {
  const out: number[] = []
  for (let n = a; n <= b; n++) out.push(at(n, 1))
  return out
}
/** The beat nearest `t`. */
export function nearestBeat(t: number): Beat {
  let best = BEATS[0]
  for (const b of BEATS) if (Math.abs(b.t - t) < Math.abs(best.t - t)) best = b
  return best
}
/** The beats between two show times struck at least `min` hard against the beats round them, with their own attack. */
export const hardBeats = (a: number, b: number, min = 0.8): number[] => BEATS.filter((x) => x.t >= a && x.t <= b && x.onset && x.s >= min).map((x) => x.t)

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
/** The measured onsets between two show times at least `min` strong. */
export const onsets = (a: number, b: number, min = 0.3): number[] => ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= min).map((o) => o.t)

/**
 * How loud the recording is at `t`, 0 (40 dB under its loudest, and under) to 1 (its loudest), smoothed over half a
 * second either side: for motion the music drives without striking (a glow, a sway, the sea's swell, the rotor).
 */
export function level(t: number): number {
  const { rms_step: step, rms } = data
  const get = (i: number) => rms[Math.max(0, Math.min(rms.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  let v = 0
  let w = 0
  for (let d = -2; d <= 3; d++) {
    const q = 1 - Math.abs(d - f) / 3.5
    v += get(j + d) * q
    w += q
  }
  return Math.max(0, Math.min(1, v / w))
}

/* ------------------------------------------------------------------ landmarks */

const L = data.landmarks
/** The swell out of silence, and the guitar's first beat (bar -3). */
export const SWELL = L.swell
export const LEAD = L.lead
/** The band in (bar 1). */
export const BAND = L.band
/** Everything over the bass drops out (bar 37). */
export const UNDER = L.under
/** The band back in (bar 48). */
export const BAND2 = L.band2
/** The band's last hit before the hush, and the hush's first downbeat (bar 67). */
export const LAST_HIT = L.hush
export const HUSH = at(67)
/** The low pulse back under the hush (bar 75). */
export const PULSE = L.pulse
/** The build (bar 83), the peak (bar 110), the fall (bar 131), the last chord. */
export const BUILD = L.build
export const PEAK = L.peak
export const FALL = L.fall
export const LAST = L.last

/** When the credits come: as the last chord rings away. */
export const CREDITS_AT = 236.2
/** The show's length: the video, then the credits in the quiet after it. */
export const DURATION = 270

/**
 * The cuts: every show time Walter passes from one place to the next. Each is on a downbeat, and each is a match cut
 * on him (`seams.ts`): the camera carries his place on the screen across.
 */
export const SEAM = {
  /** The basement into the daydream, as the band comes in (bar 1). */
  dream: at(1),
  /** The daydream snaps, back into the basement (bar 9). */
  office: at(9),
  /** Through the enlarger's picture of the ship, into the bar at Nuuk (bar 17). */
  nuuk: at(17),
  /** Out of the bar's door after Cheryl, onto the helicopter pad (bar 25). */
  sky: at(25),
  /** Into the sea, as everything over the bass drops out (bar 37). */
  sea: at(37),
  /** Through the cake's wrapper, into Iceland (bar 52). */
  iceland: at(52),
  /** Out of the ash, into his mother's room, on the pulse (bar 75). */
  home: at(75),
  /** Up into the mountains, on the build (bar 83). */
  himalaya: at(83),
  /** The negative laid on Ted's table, on the peak (bar 110). */
  press: at(110),
  /** Out onto the street, as the band drops away (bar 131). */
  street: at(131),
} as const
