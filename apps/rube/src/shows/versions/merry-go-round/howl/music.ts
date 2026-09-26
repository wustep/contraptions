import measured from '../../../../../../../scripts/shows/plans/merry-go-round-onsets.json'

/**
 * The recording's clock: Joe Hisaishi's concert arrangement of the Merry-Go-Round of Life, from Howl's Moving
 * Castle, played from its first sample (`apps/rube/src/shows/versions/merry-go-round/merry-go-round-demo.mp3`).
 * Measured once by `scripts/shows/merry-go-round-onsets.py` into `scripts/shows/plans/merry-go-round-onsets.json`;
 * `check:shows` holds every strike of this take against that file.
 *
 * It is a waltz in stretches, each at its own pace, so there is no one comb. Every stretch with a pulse has its
 * beats tracked one by one (`BEATS`), each with its bar and its place in the bar (1 is the oom); strikes in a free
 * stretch land on the measured onsets (`ONSETS`).
 *
 *   0      box      a music box: a rising figure every quarter second (0.20 → 4.98), then a few notes
 *   9.6    theme    the theme, slow and alone, G minor, a bar every 1.6 s (bar 1 = 11.349)
 *   38.28  hold     a held D and a trill over it, strong notes at 38.28, 41.38, 42.94, 44.72, 45.95; soft to 48.7
 *   49.035 waltz    the waltz proper, a bar every 1.1 s (bar 1 = 50.13); a swell at 70.0, accents 99.4 → 107.5
 *                   (the loudest of them 101.31), a second swell at 110.1, accents 128 → 136, fading to 150
 *   150.4  stop     it stops
 *   151.998 flow    a flowing interlude, running notes, D major: two waves (152 → 158, 164 → 176), a hush between
 *   178.051 slow    a slow waltz in E flat, a bar every 1.9 s, from its one great hit (bar 1 = 178.051)
 *   199.639 build   it quickens, B flat to D minor, a bar every 1.4 → 1.2 s
 *   218.883 return  the waltz again, loud (bar 1 = 220.46), hits 234.39 → 241.20, the last onset 241.96
 *   242.4   breath  a breath
 *   243.635 climax  the climax a key higher, E minor, the loudest: bar 1 = 244.03; accents 263.6 → 273.5 (272.37)
 *   285.8   cadenza soft and high and free
 *   292.2  finale   the last tutti swells in, E major: its first clear beat 292.734, bar 1 = 293.471
 *   302.243 chord   the last chord, struck three times (302.243, 302.41, 302.57), and its ring to ~306.5
 */

export interface Onset {
  t: number
  s: number
  /** The stretch it is in. */
  in: string
}
export interface Beat {
  t: number
  /** How strong the recording is on it, 1 the stretch's 95th percentile. */
  s: number
  /** Whether a measured onset is on it (within 12 ms). */
  onset: boolean
  stretch: string
  /** Its bar in the stretch, and its place in the bar (1, 2, 3). */
  bar: number
  pos: number
}
interface Data {
  duration: number
  stretches: { name: string; from: number; to: number; kind: 'waltz' | 'free' }[]
  landmarks: Record<string, number>
  beats: Beat[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The recording's length. */
export const RECORDING = data.duration
/** The show's length: the recording, then the credits in the quiet after the last chord's ring. */
export const DURATION = 336

/** Every measured onset, with its strength. */
export const ONSETS: readonly Onset[] = data.onsets
/** Every tracked beat of every stretch with a pulse. */
export const BEATS: readonly Beat[] = data.beats
/** The stretches, as measured. */
export const STRETCHES = data.stretches

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

/** The onsets between `a` and `b` (show seconds) at least `min` strong. */
export const onsetsIn = (a: number, b: number, min = 0.3): number[] => ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= min).map((o) => o.t)

/** The tracked beats between `a` and `b`, optionally only places `pos` in the bar (1 for downbeats). */
export const beatsIn = (a: number, b: number, pos?: number): Beat[] => BEATS.filter((q) => q.t >= a && q.t <= b && (pos === undefined || q.pos === pos))

/**
 * The show time of bar `n`, place `pos` (1, 2, 3), of a waltz stretch ('theme', 'waltz', 'slow', 'build',
 * 'return', 'climax', 'finale'). Throws on a bar the tracker has not got, so a typo is caught at once.
 */
export function bar(stretch: string, n: number, pos = 1): number {
  const q = BEATS.find((b) => b.stretch === stretch && b.bar === n && b.pos === pos)
  if (!q) throw new Error(`merry-go-round: no beat ${stretch} ${n}.${pos}`)
  return q.t
}

/** Every downbeat of a stretch from bar `a` to bar `b`, inclusive. */
export const downbeats = (stretch: string, a: number, b: number): number[] =>
  BEATS.filter((q) => q.stretch === stretch && q.pos === 1 && q.bar >= a && q.bar <= b).map((q) => q.t)

/**
 * How loud the recording is at `t`, 0 (-45 dB and under) to 1 (-10 dB), smoothed over half a second either side:
 * for motion the music drives without striking (Calcifer's flame, smoke, a sway).
 */
export function level(t: number): number {
  const { rms_step: step, rms } = data
  const at = (i: number) => rms[Math.max(0, Math.min(rms.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  const v = (at(j - 1) + 2 * at(j) + 2 * at(j + 1) + at(j + 2)) / 6 + (at(j + 1) - at(j)) * (f - 0.5) * 0.5
  return Math.max(0, Math.min(1, (v + 45) / 35))
}

/* ------------------------------------------------------------------ landmarks */

/** The music box's first note. */
export const BOX = 0.203
/** The theme's first downbeat. */
export const THEME = 11.349
/** The held D's first strong note: the alley. */
export const HOLD = 38.28
/** The waltz: its first downbeat (bar 0), the lift into the air. */
export const WALTZ = 49.035
/** The waltz's first swell. */
export const SWELL = 70.002
/** The strongest onset of the waltz: the curse. */
export const CURSE = 101.31
/** The waltz's second swell: the castle out of the fog. */
export const SWELL2 = 110.138
/** The waltz's last onset, before it stops. */
export const STOP = 148.805
/** The flow's first note. */
export const FLOW = 151.998
/** The slow waltz's great first hit. */
export const SLOW = 178.051
/** The build's first note. */
export const BUILD = 199.639
/** The waltz's return. */
export const RETURN = 218.883
/** The return's last onset: then the breath. */
export const BREATH = 241.964
/** The climax's great first hit. */
export const CLIMAX = 243.635
/** The heart: the strongest of the climax's accents. */
export const HEART = 272.37
/** The cadenza's first note. */
export const CADENZA = 285.87
/** The last tutti's first clear beat (it swells in from 292.1 without an attack). */
export const FINALE = 292.734
/** The last chord, struck three times. */
export const CHORD = [302.243, 302.41, 302.57] as const
/** When the credits come, once the chord has rung. */
export const CREDITS_AT = 304.2

/**
 * The seams: every show time the ball passes from one part to the next. A seam inside a leg is a hand-off in one
 * place; a seam at a cut is a match cut (`seams.ts`). Each is on a measured onset or a tracked beat.
 */
export const SEAM = {
  /** Out of the hat shop's street into the alley, on the held D. */
  alley: HOLD,
  /** Off the ground, on the waltz's first downbeat. */
  skywalk: WALTZ,
  /** Cut: from the café's balcony at noon to the hat shop at night (waltz bar 33). */
  curse: 85.8,
  /** Cut: out of the hat shop's door, old, into the hills (waltz bar 53). */
  hills: 107.9,
  /** The castle comes to her (waltz bar 65). */
  walk: 121.15,
  /** Cut: through the castle's door into its room, on the flow's first note. */
  morning: FLOW,
  /** Cut: through the door onto the flower fields, on the slow waltz's hit. */
  field: SLOW,
  /** Cut: back through the door, into the town at war (build bar 5). */
  raid: 205.86,
  /** Cut: through the hat shop's door into the castle's room, shaking (return bar 16). */
  hearth: 237.0,
  /** Cut: Calcifer out of the grate, and the castle falls apart round her, on the climax's hit. */
  plank: CLIMAX,
  /** Calcifer comes back, and the castle flies. */
  flight: FINALE,
} as const
