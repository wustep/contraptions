import measured from '../../../../../../../scripts/shows/plans/married-life-onsets.json'

/**
 * The recording's clock, as measured once by `scripts/shows/married-life-onsets.py` into
 * `scripts/shows/plans/married-life-onsets.json`; `check:shows` holds every strike of this take against that file.
 * Show time is recording time (the soundtrack's offset is 0).
 *
 * Michael Giacchino's Married Life is a waltz played the way a life is lived. It does not keep one tempo, so there is
 * no comb: the pulse is tracked beat by beat, and in the two waltzes every beat has its bar and its place in the bar.
 *
 * -   0.44      a camera flash; the Wedding March, jazzed, at a bounce (free: strike its onsets)
 * -  17.76      bar 1 of the waltz (175 bpm, a bar every 1.03 s): the kiss, and the swell of the families' cheer
 * -  21.58      the waltz proper: the house, then (49.64) the clouds on the hill, then (63.25) the nursery
 * -  71.0       the last beat of the waltz; it slows and stops. 73.46: a held note, the doctor's office
 * -  84.38      the piano alone: Ellie in the yard. It gathers from 94.5 s
 * - 100.36      the waltz again, slower (163 bpm, a bar every 1.10 s; its bar 1 is 100.78): the book, the jar, the years
 * - 140.66      jar bar 37: the ties; the loudest of the second half at 156 s
 * - 161.68      jar bar 56: it presses on, faster, to the tickets: a cadence of three hits, the last 167.71 s
 * - 167.71      a held note: the hill. 174.67 the fall
 * - 180.41      the hospital. 189.45 the church. 197.71 the strongest onset of all, then silence to 201.5 s
 * - 201.94      the piano alone: home. Its last note 242.53 s; the recording has rung out by 248.5 s
 */

export interface Beat {
  t: number
  /** How strong, against the 95th percentile of the beats of its stretch. */
  s: number
  /** Whether the beat sits on an attack of its own (a measured onset). */
  onset: boolean
  stretch: StretchName
  /** In the two waltzes: the bar, and the place in it (1 is the oom, 2 and 3 the pahs). */
  bar?: number
  pos?: 1 | 2 | 3
}

export interface Onset {
  t: number
  s: number
  in: StretchName
}

export type StretchName = 'wedding' | 'waltz' | 'loss' | 'jar' | 'hill' | 'alone'

interface Measured {
  duration: number
  stretches: { name: StretchName; from: number; to: number; kind: 'waltz' | 'free' }[]
  landmarks: {
    flash: number
    waltz: number
    halt: number
    loss: number
    book: number
    tickets: number
    fall: number
    hospital: number
    church: number
    home: number
    last: number
    cadence: [number, number, number]
    press: number
  }
  beats: Beat[]
  onsets: Onset[]
  piano: { t: number; s: number }[]
}

const M = measured as unknown as Measured

/** The recording's length. It has rung out by 248.5 s. */
export const RECORDING = M.duration
/** The show's length: the last note's ring, the credits over the house, and a breath. */
export const DURATION = 258

/** The moments the story is cut to, each on the onset that makes it (show seconds). */
export const AT = M.landmarks

/** Every tracked beat of the recording, in order. */
export const BEATS: readonly Beat[] = M.beats
/** Every measured onset, in order, with its strength inside its own stretch. */
export const ONSETS: readonly Onset[] = M.onsets
/** The piano's notes where it plays alone or leads (the wedding's start, the loss, the hill, the end). */
export const PIANO: readonly { t: number; s: number }[] = M.piano
export const STRETCHES = M.stretches

/** The downbeat of bar `n` of a waltz (`'waltz'`, bars 1 to 52; `'jar'`, bars 1 to 61, and bar 0 is its pickup). */
export function bar(stretch: 'waltz' | 'jar', n: number): number {
  const b = BEATS.find((x) => x.stretch === stretch && x.bar === n && x.pos === 1)
  if (!b) throw new Error(`married life: no bar ${n} in the ${stretch}`)
  return b.t
}

/** Beat `pos` (1, 2 or 3) of bar `n` of a waltz. */
export function beat(stretch: 'waltz' | 'jar', n: number, pos: 1 | 2 | 3): number {
  const b = BEATS.find((x) => x.stretch === stretch && x.bar === n && x.pos === pos)
  if (!b) throw new Error(`married life: no beat ${n}.${pos} in the ${stretch}`)
  return b.t
}

/** The beats in [a, b), at least `s` strong. */
export const beatsIn = (a: number, b: number, s = 0): Beat[] => BEATS.filter((x) => x.t >= a && x.t < b && x.s >= s)

/** The waltzes' downbeats in [a, b). */
export const downbeats = (a: number, b: number): Beat[] => BEATS.filter((x) => x.t >= a && x.t < b && x.pos === 1)

/** The measured onsets in [a, b), at least `s` strong. */
export const onsets = (a: number, b: number, s = 0.2): number[] => ONSETS.filter((o) => o.t >= a && o.t < b && o.s >= s).map((o) => o.t)

/** The piano's notes in [a, b), at least `s` strong. */
export const notes = (a: number, b: number, s = 0.2): number[] => PIANO.filter((o) => o.t >= a && o.t < b && o.s >= s).map((o) => o.t)

/**
 * The cuts: each a match cut on Carl (the camera carries across, so on the screen he holds still while the world
 * round him becomes another place and another year), each on a clear onset.
 */
export const CUT = {
  /** Out of the church's doors, to the old house. The waltz proper, on its accent. */
  house: 21.577,
  /** From the two armchairs to the blanket on the hill. */
  hill: 49.644,
  /** From the baby in the clouds to the mobile over the crib. */
  nursery: 63.251,
  /** The music box has run down: the doctor's office, on the last note before the held one. */
  doctor: 73.456,
  /** The piano alone: Carl at the window, Ellie alone in the yard. */
  yard: 84.376,
  /** The tickets' last hit: the hill again, years later. */
  climb: 167.706,
  /** The hospital. */
  hospital: 180.413,
  /** The church again, empty. */
  funeral: 189.452,
  /** The church's steps become his own front steps: the piano alone, home. */
  home: 201.944,
} as const

/** The seams inside the house's one long take (no cut: the ball rolls from one room into the next). */
export const SEAM = {
  /** Back inside with the book open: the living room, and the jar. Jar bar 3. */
  jar: 103.288,
  /** The ties, jar bar 37. */
  ties: 140.655,
} as const

/**
 * How old they are, 0 (the wedding) to 1 (the hill): what their colours and their pace follow. The years go by
 * slowly through the first waltz; in the jar, life's three breaks each cost a few (the tyre, his leg, the tree); and
 * in the ties they go a decade a morning: each step taken as she snugs his tie (`TIE_YEARS`, the CINCH downbeats,
 * jar bars 40 to 48), eased over 0.6 s, so no single frame pops and yet each morning is plainly older than the last.
 */
const eased = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}
/** Life's breaks in the jar (the tyre, his fall, the tree): a few years each. */
export const BREAK_YEARS = [beat('jar', 11, 3), beat('jar', 19, 1), 128.871]
/** Her knots in the ties: a decade each. */
export const TIE_YEARS = [40, 42, 44, 46, 48].map((n) => bar('jar', n))
export function AGE(t: number): number {
  let a = 0.12 * eased(t, 0, CUT.yard)
  for (const b of BREAK_YEARS) a += 0.06 * eased(t, b + 0.05, b + 0.65)
  a += 0.05 * eased(t, 131.5, SEAM.ties)
  for (const c of TIE_YEARS) a += 0.12 * eased(t, c + 0.05, c + 0.65)
  a += 0.05 * eased(t, 161.68, CUT.climb)
  return a
}
