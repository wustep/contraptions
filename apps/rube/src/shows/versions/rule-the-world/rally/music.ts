import measured from '../../../../../../../scripts/shows/plans/rule-the-world-onsets.json'

/**
 * The recording's clock: Tears for Fears' "Everybody Wants to Rule the World" (Songs from the Big Chair, 1985), the
 * song Marty Supreme (2025) ends on, played by YouTube from Universal Music Group's own upload (awoFZaSuko4) from its
 * first second, so show time is the video's time. Measured once by `scripts/shows/rule-the-world-onsets.py` into
 * `scripts/shows/plans/rule-the-world-onsets.json`; `check:shows` holds every strike of this take against that file.
 *
 * It is a shuffle on a machine-steady pulse, 112.05 beats a minute, so there is one comb; every beat is the comb's,
 * moved onto its own attack. Each beat is cut in three, and the hats and the kick land on the beat and on its last
 * third, the shuffle's "a" (`a(bar, pos)`): a table-tennis rally's two sounds, the bat and the table. It is in four,
 * counted from the first downbeat (bar 1, 1.058 s): `at(bar, pos)` is the show time of beat `pos` (1 to 4) of bar
 * `bar`.
 *
 *   bar  1   intro    the shuffle and the synth's riff, no bass
 *   bar  5   vamp     the bass in
 *   bar 14   verse1   "Welcome to your life / There's no turning back"
 *   bar 21   pre1     "Acting on your best behaviour"
 *   bar 25   hook1    "Everybody wants to rule the world"
 *   bar 28   riff
 *   bar 32   verse2   "It's my own design / It's my own remorse"
 *   bar 39   pre2     "Most of freedom and of pleasure / Nothing ever lasts forever"
 *   bar 43   hook2
 *   bar 45   bridge   "There's a room where the light won't find you / Holding hands while the walls come tumbling down"
 *   bar 51   glad     "So glad we've almost made it / So sad they had to fade it"
 *   bar 55   hook3
 *   bar 57   break    the band down, the synth alone over the shuffle
 *   bar 65   solo     the guitar, up and up
 *   bar 79   verse3   "I can't stand this indecision / Married with a lack of vision"
 *   bar 83   cut      "Everybody wants to rule the -", broken off
 *   bar 85   never    "Say that you'll never, never, never, never need it / One headline, why believe it?"
 *   bar 89   hook5
 *   bar 91   turn     the band down again
 *   bar 95   freedom  "All for freedom and for pleasure / Nothing ever lasts forever"
 *   bar 99   hook6
 *   bar 101  outro    the guitar over the riff, and the fade
 */

export interface Beat {
  /** Show time: its own attack where one is within 30 ms of the comb, else the comb. */
  t: number
  /** Whether it has its own attack. */
  onset: boolean
  /** The stretch it is in. */
  in: string
  /** How hard it is struck against the beats round it (1 is their 90th percentile). */
  s: number
  /** Its bar, counted from the first downbeat (bar 1), and its place in the bar, 1 to 4. */
  bar: number
  pos: number
}
export interface Shuffle {
  t: number
  onset: boolean
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
  period: number
  stretches: { name: string; from: number; to: number; kind: 'beat' | 'free' }[]
  landmarks: Record<string, number>
  beats: Beat[]
  shuffle: Shuffle[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The video's length: the show's music. */
export const RECORDING = data.duration
export const YOUTUBE = data.youtube
/** One beat, in seconds (the comb's). */
export const BEAT = data.period
/** One bar. */
export const BAR = 4 * BEAT

/** Every beat, first to last; every shuffle "a"; every measured onset. */
export const BEATS: readonly Beat[] = data.beats
export const SHUFFLES: readonly Shuffle[] = data.shuffle
export const ONSETS: readonly Onset[] = data.onsets
export const STRETCHES = data.stretches

const byBar = new Map<string, Beat>(BEATS.map((b) => [`${b.bar}.${b.pos}`, b]))
const aByBar = new Map<string, Shuffle>(SHUFFLES.map((b) => [`${b.bar}.${b.pos}`, b]))
/** The beat `pos` (1 to 4) of bar `bar`, or undefined outside the pulse. */
export const beatOf = (bar: number, pos = 1): Beat | undefined => byBar.get(`${bar}.${pos}`)
/** The show time of beat `pos` of bar `bar`. Throws outside the pulse, so a part cannot strike a beat that is not there. */
export function at(bar: number, pos = 1): number {
  const b = beatOf(bar, pos)
  if (!b) throw new Error(`rally: no beat ${bar}.${pos}`)
  return b.t
}
/** The shuffle's "a" after beat `pos` of bar `bar`: two thirds of the way to the next beat, on its own attack. */
export function a(bar: number, pos = 1): number {
  const b = aByBar.get(`${bar}.${pos}`)
  if (!b) throw new Error(`rally: no shuffle after ${bar}.${pos}`)
  return b.t
}
/** Every beat from bar.pos `from` to bar.pos `to`, inclusive, as show times. */
export function beats(from: [number, number], to: [number, number]): number[] {
  const i0 = BEATS.findIndex((x) => x.bar === from[0] && x.pos === from[1])
  const i1 = BEATS.findIndex((x) => x.bar === to[0] && x.pos === to[1])
  if (i0 < 0 || i1 < 0) throw new Error(`rally: no beats ${from.join('.')} to ${to.join('.')}`)
  return BEATS.slice(i0, i1 + 1).map((x) => x.t)
}
/** The downbeats of bars `from` to `to`, inclusive. */
export const downbeats = (from: number, to: number): number[] => {
  const out: number[] = []
  for (let n = from; n <= to; n++) out.push(at(n, 1))
  return out
}
/** The beat nearest `t`. */
export function nearestBeat(t: number): Beat {
  let best = BEATS[0]
  for (const b of BEATS) if (Math.abs(b.t - t) < Math.abs(best.t - t)) best = b
  return best
}
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
export const onsets = (from: number, to: number, min = 0.3): number[] => ONSETS.filter((o) => o.t >= from && o.t <= to && o.s >= min).map((o) => o.t)

/**
 * How loud the recording is at `t`, 0 (40 dB under its loudest, and under) to 1 (its loudest), smoothed over half a
 * second either side: for motion the music drives without striking (a glow, a sway, the crowd's roar).
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
/** The first downbeat; the bass in; each line of the voice. */
export const FIRST_BEAT = L.first
export const VAMP = L.vamp
export const VERSE1 = L.verse1
export const PRE1 = L.pre1
export const HOOK1 = L.hook1
export const VERSE2 = L.verse2
export const PRE2 = L.pre2
export const HOOK2 = L.hook2
export const BRIDGE = L.bridge
export const GLAD = L.glad
export const HOOK3 = L.hook3
/** The band down: the synth alone over the shuffle. */
export const BREAK = L.break
/** The guitar. */
export const SOLO = L.solo
export const VERSE3 = L.verse3
/** "Everybody wants to rule the -", broken off. */
export const CUT = L.cut
export const NEVER = L.never
export const HOOK5 = L.hook5
export const TURN = L.turn
export const FREEDOM = L.freedom
export const HOOK6 = L.hook6
export const OUTRO = L.outro
/** The last beat the fade still lets be heard. */
export const AUDIBLE = L.audible

/** When the credits come: on bar 108, as the guitar plays on into the fade (the film's credits run on this song). */
export const CREDITS_AT = at(108)
/** The show's length: the video, then the last of the credits in the quiet after it. */
export const DURATION = 266

/**
 * The cuts: every show time Marty passes from one place to the next. Each is on a downbeat, and each is a match cut on
 * him (`seams.ts`): the camera carries his place on the screen across.
 */
export const SEAM = {
  /** The shoe store to London, on the first "Everybody wants to rule the world" (bar 25). */
  london: at(25),
  /** London to the hotel on Broadway, on the second (bar 43). */
  hotel: at(43),
  /** Down the fire escape and in at the bowling alley's door, as the band drops out (bar 57). */
  alley: at(57),
  /** Into Wally's cab, as the guitar comes in (bar 65). */
  jersey: at(65),
  /** "Everybody wants to rule the -", broken off: Tokyo (bar 83). */
  tokyo: at(83),
  /** "All for freedom and for pleasure": the maternity ward (bar 95). */
  hospital: at(95),
} as const

/**
 * The story's fixed moments, which the places build to and the score punches in on:
 *
 * - `LOSS`: the last point of the final in London, lost to Endo, on "Nothing ever lasts forever" (bar 41).
 * - `CRASH`: the tub through the hotel's floor, on "the walls come tumbling down" (bar 48).
 * - `WIN`: the last point in Tokyo, on the "Everybody" after "One headline, why believe it?" (bar 89).
 * - `SON`: he sees his son through the nursery's glass, on the last "Everybody wants to rule the world" (bar 99).
 */
export const LOSS = at(41)
export const CRASH = at(48)
export const WIN = at(89)
export const SON = at(99)
