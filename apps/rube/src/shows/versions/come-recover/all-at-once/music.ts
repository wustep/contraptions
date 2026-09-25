import onsets from '../../../../../../../scripts/show-plans/eeaao-onsets.json'

/**
 * The recording's clock: Son Lux's "Come Recover (Empathy Fight)", from Everything Everywhere All at Once, played
 * from its first sample (`docs/promo/eeaao-come-recover-demo.mp3`, `scripts/eeaao-cue.sh`). Measured once by
 * `scripts/eeaao-onsets.py` into `scripts/show-plans/eeaao-onsets.json`; `check:shows` holds every strike of this
 * take against that file.
 *
 * - 0 to 142 s has no steady pulse. A chord and a silence (0 to 7.9), a sparse first minute with one great hit
 *   (12.79), a long breath of swells (35 to 58), then louder and denser to a flurry (86 to 128) and a hush.
 *   Strikes here land on the recording's own onsets (`ONSETS`), as the piano's notes did in Liftoff.
 * - 142 to 200 s, the fight: a 150 bpm pulse, a beat every 0.4 s (`fight(k)`). A break at 164.4, a hit at 165.62,
 *   the full pumping pulse from 170.8, and a crescendo to the great hit on beat 123 (191.22). The last hit is
 *   beat 144 (199.61), and then the drop.
 * - 200 to 266 s, the fall: the same tempo on a new phase (`fall(k)`). Sparse single notes in the quiet (the
 *   strongest, 213.96, on beat 34½), a swell of soft beats (227 to 242), a breath, and the peak (247.75 to 264.14).
 * - 278 to 320 s, home: the pulse once more (`home(k)`), the last hits (286.2, 291.0, 295.0), and the quiet tail
 *   the credits roll over. The file fades out over its last nine seconds, to 332.
 */

interface Comb {
  name: string
  from: number
  to: number
  period: number
  origin: number
  beats: { beat: number; t: number; onset: number; s: number }[]
}
const data = onsets as unknown as { duration: number; onsets: { t: number; s: number }[]; combs: Comb[]; loudness: { step: number; db: number[] } }

/** The file's length: where the music ends, and the show with it. */
export const DURATION = 332

/** Every measured onset, with its strength (1 is the cue's 99th percentile of flux). */
export const ONSETS: readonly { t: number; s: number }[] = data.onsets

/** The measured onset nearest `t` with strength at least `min`: what a strike in the free first 142 s is timed to. */
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

const comb = (name: string): Comb => data.combs.find((c) => c.name === name)!
const FIGHT = comb('fight')
const FALL = comb('fall')
const HOME = comb('home')

/** Show time of beat `k` of the fight's pulse (142 to 200 s; fractions are eighths). Beat 0 is 142.015. */
export const fight = (k: number): number => FIGHT.origin + FIGHT.period * k
/** Show time of beat `k` of the fall's pulse (200 to 266 s). Beat 0 is 200.163. */
export const fall = (k: number): number => FALL.origin + FALL.period * k
/** Show time of beat `k` of home's pulse (278 to 320 s). Beat 0 is 278.205. */
export const home = (k: number): number => HOME.origin + HOME.period * k

/** How strong the recording is on beat `k` of a comb (0 when it has nothing there). */
export function strength(which: 'fight' | 'fall' | 'home', k: number): number {
  const c = comb(which)
  return c.beats.find((b) => Math.abs(b.beat - k) < 1e-6)?.s ?? 0
}

/** The combs, for the check: every beat and eighth of each, in show seconds, and the span it holds over. */
export const COMBS = [FIGHT, FALL, HOME].map((c) => ({ name: c.name, from: c.from, to: c.to, times: c.beats.map((b) => b.t) }))

/**
 * How loud the recording is at `t`, 0 (silence, -45 dB and under) to 1 (its loudest, -8 dB), smoothed over a
 * quarter second either side: for motion the music drives without striking, a drum that turns faster in a swell.
 */
export function level(t: number): number {
  const { step, db } = data.loudness
  const at = (i: number) => db[Math.max(0, Math.min(db.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  // A little smoothing: the neighbours either side, weighted.
  const v = (at(j - 1) + 2 * at(j) + 2 * at(j + 1) + at(j + 2)) / 6 + (at(j + 1) - at(j)) * (f - 0.5) * 0.5
  return Math.max(0, Math.min(1, (v + 45) / 37))
}

/* ------------------------------------------------------------------ landmarks */

/** The chord the show opens on, and the silence after it: the story starts on the first onset after (7.93). */
export const CHORD = 0.662
export const ENTRY = 7.93
/** The first minute's one great hit. */
export const GREAT = 12.794

/**
 * The verse-jumps: every change of world, in show seconds. Each is on an onset of the recording (the drop into the
 * rocks is on the silence after the fight's last hit, the fall's beat 0), and at each the ball holds its place on
 * the screen while the world round it changes.
 */
export const JUMPS = {
  /** Out of the dryer's door into the premiere: the first onset of the louder second minute. */
  premiere: 57.945,
  /** Into the dojo, as the flurry begins. */
  dojo: 86.297,
  /** Into the hot-dog-fingers world. */
  hotdog: 97.152,
  /** Into Raccacoonie's kitchen. */
  hibachi: 106.731,
  /** Out of the kitchen into the surf, a world a hit. */
  surf: 120.953,
  /** Out of the surf into the dark, where Jobu waits with the bagel. */
  void: 127.791,
  /** Into the bagel, and everywhere at once. */
  mosaic: 165.616,
  /** The great hit: the googly eye, home, and kindness. */
  eye: 191.216,
  /** The drop, into the silence: the rocks. */
  rocks: fall(0),
  /** Off the canyon's floor into the dark over the bagel. */
  brink: 241.755,
  /** Out of the bagel's hole through a washer's window, home. */
  home: 264.144,
} as const

/** The fight's last hit, and the drop after it. */
export const LAST_FIGHT = fight(144)
/** The strongest note in the quiet: Joy's rock goes over the edge. */
export const OVER_THE_EDGE = 213.96
/** The peak's first full beat. */
export const PEAK = fall(119)
/** The last three hits of home, and the quiet after them. */
export const HOME_HITS = [286.198, 290.992, 295.01] as const
export const CREDITS_AT = 297
