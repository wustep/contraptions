import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { BREAK, BUILD, BURST, CUTOFF, FINAL, HUSH, LAST_CHORD, RUBATO, SLOWEST, SOLO } from '../music'
import { BIG, SHIFT, UNWIND } from './fast-clock'

/**
 * Carnegie Hall's light, from the cut-off before the solo to the dark under the credits: ONE scored cue, the way a
 * lighting board runs a show. Every light in the hall reads it (the wall's field, the beams, the pool, the floor and
 * the house, the band, the piano, the podium, the kit, Fletcher) and so does the dark laid over the stage after the
 * parts' machines (`hall.ts` `hallDark`), so there is one light in Carnegie, not a wash per part adding up.
 *
 * The cues are on the music, sharp on their attacks and long in their releases:
 *
 *   269.5   the cut-off: the band down, a pool on the kit, the stage round it a quarter dark (the solo)
 *   323.27  the hush: cooler and darker, a small pool, half dark round it; Jim's door the one other warm island
 *   369.98  the build: warm back up in three steps on its phrases (the landing, the big kick, the shift), full by 383
 *   405.6   the lit wide: the whole stage and the band watching; down through the unwind
 *   422     the soft ride: the pool narrowing onto the metronome as it rises, the dark coming in round it
 *   446     the rubato: near dark, a narrow top light on the metronome, darkest on the slowest stroke (458.58);
 *           Fletcher, keeping its time, a rim-lit shape in his own light
 *   468     opening again as it quickens; the swell rising to the burst
 *   504.0   the burst: a white slam over the whole stage and the house, settling into near white for the march, warming
 *           back to gold over the long roll and the nod
 *   541.7   the silence: a held breath, the pool on the two of them
 *   543.25  the last chord: the blaze, every beam and the band, growing through the crescendo
 *   548.56  the cut-off: in 0.15 s everything drops to a spot on the two of them and the fist
 *   550.3   the credits: one slow, even fade to near black, the balls last
 *
 * Before the cut-off (the sabotage) the hall keeps the light it had: the whole stage, waking on the chorus's first
 * big hit.
 */

export interface Cue {
  /** The back wall's lit field round the pool, at its heart (0..1). */
  wall: number
  /** The pool: where the light falls (the wall's field, the dark's hole), its centre and half-widths, in cells. */
  cx: number
  cy: number
  rx: number
  ry: number
  /** The dark laid over everything outside the pool, and over the pool itself (0..1). */
  dark: number
  inside: number
  /** The light's colour: toward the hush's slate, toward the burst's white (0..1). */
  cool: number
  white: number
  /** The band's light (its field, its three beams, the players and their pages). */
  band: number
  /** The kit's beam from the flies, and the cream pool it lays on the kit and the floor. */
  beam: number
  pool: number
  /** The warm wash down the stage from above. */
  wash: number
  /** The floor and the house's front rows. */
  house: number
  /** The kit's lacquer, and Fletcher's own light (his hole in the dark). */
  kit: number
  fl: number
  /** The metronome's narrow top light from the flies. */
  metro: number
  /** The burst's flash over everything, and the last chord's blaze growing on the gilt and the beams. */
  flash: number
  blaze: number
}

type Ease = 'io' | 'hit' | 'in' | 'lin'
/** A cue: from `at`, over `fade` seconds, on `ease`, to the levels in `set`; every other channel holds. */
interface Go {
  at: number
  fade: number
  ease?: Ease
  set: Partial<Cue>
}

const curve = (e: Ease, u: number): number => {
  const x = clamp(u)
  if (e === 'hit') return 1 - (1 - x) ** 3 * (1 + 3 * x)
  if (e === 'in') return x * x
  if (e === 'lin') return x
  return easeInOutSine(x)
}

/** The hall's lights coming up after the match cut from the road: the stage wakes on the chorus's first big hit. */
export const LIGHTS_UP = 243.297
const wake = (t: number): number => (t < LIGHTS_UP + 0.5 ? 0.12 + 0.88 * easeInOutSine(clamp((t - (LIGHTS_UP - 0.08)) / 0.35)) : 1)

/** Where the board takes over from the sabotage's light. */
export const CUE_FROM = CUTOFF - 0.3

/** The sabotage's light (the whole stage, waking at `LIGHTS_UP`), and the level every cue starts from. */
function stage(t: number): Cue {
  const w = wake(t)
  return {
    wall: 0.7125 * w * w,
    cx: 1.0,
    cy: -0.65,
    rx: 7.8,
    ry: 5.6,
    dark: 0,
    inside: 0,
    cool: 0,
    white: 0,
    band: w,
    beam: 0.45 * w * w,
    pool: 0,
    wash: 0.06 + 0.1 * w,
    house: w,
    kit: w,
    fl: 0,
    metro: 0,
    flash: 0,
    blaze: 0,
  }
}

/** The metronome's pivot across the stage (`rubato-metronome.ts` `PIVOT_X`; not imported: that file imports the hall). */
const METRO_X = -1.47
/** Andrew's head in the drummer's frame, and Fletcher's by the kit at the end (`finale-rig.ts`, `conductor.ts`). */
const HEADS_Y = -2.6

/** The cue sheet. */
const GOS: Go[] = [
  // The cut-off before the solo: the band down into the dark, a pool gathering on the kit and the frame's height.
  { at: CUE_FROM, fade: SOLO + 0.35 - CUE_FROM, set: { wall: 0.7, cx: -0.8, cy: -0.9, rx: 5.0, ry: 4.0, pool: 1, beam: 1, fl: 0.65, kit: 1 } },
  { at: CUTOFF, fade: 2.4, set: { band: 0.12, dark: 0.3, wash: 0.07, house: 0.45 } },
  // The hush: cooler and darker, a small pool, half dark round it.
  { at: HUSH, fade: 1.5, set: { wall: 0.4, cx: -0.9, cy: -1.15, rx: 3.2, ry: 2.9, cool: 0.35, dark: 0.5, band: 0.05, beam: 0.55, pool: 0.7, wash: 0.04, house: 0.3 } },
  // The build: warm back up in three steps on its phrases, full by 383.
  { at: BUILD, fade: 0.35, ease: 'hit', set: { wall: 0.6, rx: 4.3, ry: 3.6, cool: 0.22, dark: 0.34, beam: 0.75, pool: 0.85, wash: 0.07, house: 0.38 } },
  { at: BIG, fade: 0.35, ease: 'hit', set: { wall: 0.8, cx: -0.5, cy: -0.9, rx: 5.6, ry: 4.4, cool: 0.1, dark: 0.16, band: 0.12, beam: 0.9, pool: 1, wash: 0.1, house: 0.5 } },
  { at: SHIFT, fade: 0.35, ease: 'hit', set: { wall: 0.95, cx: 0.4, cy: -0.75, rx: 7.8, ry: 5.6, cool: 0, dark: 0, band: 0.3, beam: 1, wash: 0.14, house: 0.7 } },
  // The lit wide (the build's third stage, 409-412.5): the whole stage, the band seen watching; down through the unwind.
  { at: 405.6, fade: 3.4, set: { wall: 1, rx: 9, ry: 6, band: 0.8, wash: 0.22, house: 1 } },
  { at: 419.6, fade: 2.1, set: { wall: 0.9, rx: 7.2, ry: 5.2, band: 0.3, wash: 0.12, house: 0.6 } },
  // The soft ride: in from the unwind to a pool on the kit, then narrowing onto the metronome as it rises and he climbs
  // to it, the dark coming in round it.
  { at: UNWIND + 0.3, fade: RUBATO + 1.6 - (UNWIND + 0.3), set: { wall: 0.75, cx: -1.2, cy: -1.4, rx: 4.4, ry: 3.8, dark: 0.3, band: 0.1, beam: 0.7, pool: 0.8, wash: 0.06, house: 0.35 } },
  { at: RUBATO + 1.6, fade: 446 - (RUBATO + 1.6), set: { wall: 0.45, cx: METRO_X, cy: -2.7, rx: 2.2, ry: 2.7, dark: 0.75, band: 0.04, beam: 0.15, pool: 0.3, wash: 0.03, house: 0.2 } },
  { at: 428, fade: 12, set: { metro: 1 } },
  // The rubato: near dark round a narrow light on the metronome, at its lowest on the slowest stroke. Fletcher keeps its
  // time in his own light.
  { at: 446, fade: SLOWEST - 446, set: { wall: 0.3, rx: 2.0, ry: 2.6, dark: 0.88, band: 0.02, beam: 0, pool: 0.15, wash: 0.02, house: 0.1 } },
  { at: 453.8, fade: 1.6, set: { fl: 0.8 } },
  { at: SLOWEST, fade: 468 - SLOWEST, set: { dark: 0.8, wall: 0.34 } },
  { at: 468.3, fade: 1.8, set: { fl: 0.65 } },
  // Opening again as it quickens; then the swell rising to the burst.
  { at: 468, fade: 16, set: { wall: 0.55, cx: METRO_X + 0.2, cy: -2.3, rx: 3.4, ry: 3.3, dark: 0.42, band: 0.05, beam: 0.35, pool: 0.4, wash: 0.05, house: 0.25 } },
  { at: 484, fade: BURST - 1.2 - 484, ease: 'in', set: { wall: 1, cx: -0.9, cy: -1.5, rx: 7, ry: 5, dark: 0, band: 0.35, beam: 1, pool: 1, wash: 0.2, house: 0.7 } },
  // The burst: a white slam over the whole stage and the house's front rows, sharp on the kick; settling into near
  // white for the march; warming back to gold over the long roll and the nod.
  { at: BURST - 0.02, fade: 0.06, ease: 'lin', set: { white: 1, cx: 2.0, cy: -1.5, rx: 11, ry: 7, band: 0.9, beam: 1.3, wash: 0.34, house: 1.4, flash: 1, metro: 0 } },
  { at: BURST + 0.04, fade: 0.7, ease: 'hit', set: { flash: 0 } },
  { at: BURST + 0.1, fade: 3, ease: 'hit', set: { white: 0.72, beam: 1.1, wash: 0.26, band: 0.55, house: 1 } },
  { at: 518.8, fade: 16.2, set: { white: 0, cx: 0, cy: -1.4, rx: 7.5, ry: 5.4, band: 0.3, beam: 1, wash: 0.14, house: 0.6 } },
  // The silence: a held breath, down to the pool on the two of them.
  { at: BREAK + 0.25, fade: 0.9, set: { wall: 0.6, cx: 0.15, cy: -1.8, rx: 3.3, ry: 3.0, dark: 0.6, band: 0.03, beam: 0.7, pool: 0.7, wash: 0.05, house: 0.25 } },
  // The last chord: the blaze, on the attack, and growing through the crescendo.
  { at: LAST_CHORD - 0.02, fade: 0.1, ease: 'hit', set: { wall: 1, cx: 3.5, cy: -1.8, rx: 11, ry: 7, dark: 0, band: 1, beam: 1.2, pool: 1, wash: 0.26, house: 1.2, blaze: 0.35 } },
  { at: LAST_CHORD + 0.2, fade: FINAL - 0.1 - (LAST_CHORD + 0.2), ease: 'in', set: { wash: 0.34, blaze: 1, house: 1.4 } },
  // The cut-off: the light's own. Everything down to a spot on the two of them and the fist.
  { at: FINAL - 0.02, fade: 0.15, set: { wall: 0.42, cx: 0.5, cy: HEADS_Y + 0.05, rx: 2.9, ry: 2.2, dark: 0.8, band: 0, beam: 0.45, pool: 0.5, wash: 0.02, house: 0.05, blaze: 0, fl: 0 } },
  // The credits: one slow, even fade, the spot narrowing on the two heads, to near black, the balls last.
  { at: 550.3, fade: 25, ease: 'lin', set: { wall: 0.1, cx: 0.17, cy: HEADS_Y, rx: 2.0, ry: 1.25, dark: 0.98, inside: 0.72, beam: 0.08, pool: 0.1, kit: 0.55 } },
]

type Channel = keyof Cue
interface Step {
  a: number
  b: number
  from: number
  to: number
  ease: Ease
}

/** Per channel, its fades in order, each starting from the level the channel has when it begins. */
const TRACKS: Record<Channel, Step[]> = (() => {
  const base = stage(CUE_FROM)
  const out = {} as Record<Channel, Step[]>
  for (const ch of Object.keys(base) as Channel[]) {
    const steps: Step[] = []
    const gos = GOS.filter((g) => g.set[ch] !== undefined).sort((x, y) => x.at - y.at)
    for (const g of gos) {
      const from = valueOf(steps, base[ch], g.at)
      steps.push({ a: g.at, b: g.at + Math.max(1e-3, g.fade), from, to: g.set[ch] as number, ease: g.ease ?? 'io' })
    }
    out[ch] = steps
  }
  return out
})()

function valueOf(steps: Step[], base: number, t: number): number {
  let v = base
  for (const s of steps) {
    if (t < s.a) break
    v = t >= s.b ? s.to : s.from + (s.to - s.from) * curve(s.ease, (t - s.a) / (s.b - s.a))
  }
  return v
}

let lastT = NaN
let last: Cue = stage(0)

/** The hall's light at show time `t`. */
export function cueAt(t: number): Cue {
  if (t === lastT) return last
  let q: Cue
  if (t < CUE_FROM) q = stage(t)
  else {
    const base = stage(CUE_FROM)
    q = { ...base }
    for (const ch of Object.keys(base) as Channel[]) q[ch] = valueOf(TRACKS[ch], base[ch], t)
  }
  lastT = t
  last = q
  return q
}
