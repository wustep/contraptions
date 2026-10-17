import type { Pt } from '../../../../parts'
import { clamp, hash } from './brush'
import { GAPS, HOME, MIDDLE, ROWS, X0, Y0, aimAt } from './geo'
import { BLUE, GREEN, RED, YELLOW } from './look'
import { BEATS, LAST, ONSETS, PHRASES, beat, beatBefore, strain } from './music'

/**
 * The score: every shot the launcher fires, where it lands and when. A shot lands on an accent of the music, and is
 * fired a beat before it: the pellet is in the air for that beat. The strains are played twice, and the second time
 * every shot lands in the mirror of where it landed the first time; the surprise lands in the board's middle gap, and
 * so does the last chord.
 *
 *   the theme      red      the surprise; a small one at the forte of each second strain
 *   variation 1    yellow   the forte chord at the head of each first strain; the second strains' forte
 *   variation 2    blue     the C minor's fortissimo bars, a shot a bar or two, through to the violins alone
 *   variation 3    green    three small ones under the oboe
 *   variation 4    all four the fortissimos, a shot a bar or two; one on the dolce's sforzando
 *   the coda       red      three small ones, the last on the last chord
 *
 * Between the accents nothing on the board moves. The launcher does its work in the music's time: the next pellet comes
 * up the lift just after a shot, the turntable swings to aim, and the spring is drawn back a click on each of the
 * beats before the next one (on the downbeats, for the big ones; for the surprise, on every bar of the pianissimo).
 */

interface Spec {
  /** Where it lands: beat `beat` of played bar `bar`, or the onset nearest `onset`. */
  bar?: number
  beat?: 1 | 2
  onset?: number
  /** How hard, 0 to 1: the size of the burst and the push on the pegs. */
  s: number
  color: string
  /** A name, for the shot that lands in its mirror on the repeat. */
  key?: string
  /** Lands in the mirror image (left for right) of the shot of that name. */
  mirrors?: string
  /** Lands here. */
  at?: Pt
}

/** Played bar `n` of a strain (1 is its first bar). */
const of = (key: string, n: number): number => strain(key) + n - 1

const V4 = [RED, YELLOW, BLUE, GREEN]

const SPECS: Spec[] = [
  // The theme.
  { bar: 16, beat: 2, s: 1, color: RED, at: MIDDLE },
  { bar: of('theme-b', 6), s: 0.3, color: RED, key: 'b' },
  { bar: of('theme-b2', 6), s: 0.3, color: RED, mirrors: 'b' },
  // Variation 1: the forte chords, and the second strains' forte.
  { bar: of('var1-a', 1), s: 0.74, color: YELLOW, key: 'v1a' },
  { bar: of('var1-a2', 1), s: 0.74, color: YELLOW, mirrors: 'v1a' },
  { bar: of('var1-b', 6), s: 0.3, color: YELLOW, key: 'v1b' },
  { bar: of('var1-b2', 6), s: 0.3, color: YELLOW, mirrors: 'v1b' },
  // Variation 2: C minor.
  { bar: of('var2-a', 1), s: 0.9, color: BLUE, key: 'v2a1' },
  { bar: of('var2-a', 2), s: 0.46, color: BLUE, key: 'v2a2' },
  { bar: of('var2-a', 4), s: 0.44, color: BLUE, key: 'v2a4' },
  { bar: of('var2-a2', 1), s: 0.9, color: BLUE, mirrors: 'v2a1' },
  { bar: of('var2-a2', 2), s: 0.5, color: BLUE, mirrors: 'v2a2' },
  { bar: of('var2-a2', 4), s: 0.44, color: BLUE, mirrors: 'v2a4' },
  { bar: of('var2-b', 1), s: 0.9, color: BLUE, key: 'v2b1' },
  { bar: of('var2-b', 3), s: 0.46, color: BLUE, key: 'v2b3' },
  { bar: of('var2-b', 5), s: 0.46, color: BLUE, key: 'v2b5' },
  { bar: of('var2-b', 7), s: 0.46, color: BLUE, key: 'v2b7' },
  { bar: of('var2-b2', 1), s: 0.52, color: BLUE, mirrors: 'v2b1' },
  { bar: of('var2-b2', 3), s: 0.56, color: BLUE, mirrors: 'v2b3' },
  { bar: of('var2-b2', 4), beat: 2, s: 0.62, color: BLUE, mirrors: 'v2b5' },
  { bar: of('var2-b2', 6), s: 0.62, color: BLUE, mirrors: 'v2b7' },
  // Variation 3: the oboe, and the flute with it.
  { bar: of('var3-a2', 1), s: 0.28, color: GREEN },
  { bar: of('var3-b', 7), s: 0.27, color: GREEN, key: 'v3b' },
  { bar: of('var3-b2', 7), beat: 2, s: 0.27, color: GREEN, mirrors: 'v3b' },
  // Variation 4: all four colours.
  { bar: of('var4-a', 1), s: 1, color: V4[0], key: 'v4a1' },
  { bar: of('var4-a', 3), s: 0.56, color: V4[1], key: 'v4a2' },
  { bar: of('var4-a', 4), s: 0.52, color: V4[2], key: 'v4a4' },
  { bar: of('var4-a', 6), s: 0.52, color: V4[3], key: 'v4a6' },
  { bar: of('var4-a', 8), s: 0.5, color: V4[0], key: 'v4a8' },
  { bar: of('var4-a2', 7), s: 0.3, color: V4[1] },
  { bar: of('var4-b2', 1), s: 1, color: V4[2], mirrors: 'v4a1' },
  { bar: of('var4-b2', 2), s: 0.56, color: V4[3], mirrors: 'v4a2' },
  { bar: of('var4-b2', 3), beat: 2, s: 0.56, color: V4[0], mirrors: 'v4a4' },
  { bar: of('var4-b2', 5), s: 0.52, color: V4[1], mirrors: 'v4a6' },
  { bar: of('var4-b2', 6), s: 0.52, color: V4[2], mirrors: 'v4a8' },
  { bar: of('var4-b2', 7), s: 0.5, color: V4[3] },
  { bar: of('var4-on', 1), s: 0.72, color: V4[0] },
  { bar: of('var4-on', 2), beat: 2, s: 0.56, color: V4[1] },
  { bar: of('var4-on', 3), beat: 2, s: 0.56, color: V4[2] },
  { bar: of('var4-on', 6), s: 0.62, color: V4[3] },
  // The coda.
  { bar: of('coda', 2), s: 0.28, color: RED, at: [0, -5] },
  { onset: 329.9, s: 0.22, color: RED, key: 'c1', at: [-5, -3] },
  { onset: 331.79, s: 0.2, color: RED, mirrors: 'c1' },
  { onset: LAST, s: 0.24, color: RED, at: MIDDLE },
]

export interface Shot {
  i: number
  /** When it lands: the accent. */
  at: number
  /** When it is fired: a beat before. */
  launch: number
  /** The gap it lands in. */
  target: Pt
  /** Where the launcher points to fire it. */
  angle: number
  color: string
  s: number
  /** Where it is in the music: played bar and beat, or null for an onset between the beats. */
  bar: number | null
  beat: number | null
  /** The lift brings this shot's pellet up into the breech. */
  reload: [number, number]
  /** The turntable swings round to aim. */
  aim: [number, number]
  /** The clicks that draw the spring back, one on each of these beats. */
  steps: number[]
  /** Or, with no beat free for a click, one steady pull. */
  pull: [number, number] | null
  /** The shot whose mirror image this one lands in, on a strain's repeat, or null. */
  mirrors: number | null
}

/** How far back a shot of strength `s` draws the spring, of the whole way: the harder the accent, the further. */
export const depth = (s: number): number => 0.5 + 0.5 * s

/** How far a burst of strength `s` reaches, cells. */
export const reach = (s: number): number => 2.0 + 6.4 * s

/** The nearest onset to `t`. */
function onsetNear(t: number): number {
  let best = ONSETS[0].t
  for (const o of ONSETS) if (Math.abs(o.t - t) < Math.abs(best - t)) best = o.t
  return best
}

/** The local quarter at `t`, seconds. */
function quarterAt(t: number): number {
  let q = PHRASES[0].quarter
  for (const p of PHRASES) if (p.t <= t) q = p.quarter
  return q
}

/** The gap for a shot that is not placed by hand: clear of the bursts just gone, with room for its own, an easy swing. */
function choose(done: Shot[], at: number, s: number, angle: number, window: number, seed: number, paired: boolean): Pt {
  let best: Pt = MIDDLE
  let bestScore = Infinity
  const r = reach(s)
  for (let gx = Math.ceil(GAPS.x0); gx <= Math.floor(GAPS.x1); gx++) {
    for (let gy = Math.ceil(GAPS.y0); gy <= Math.floor(GAPS.y1); gy++) {
      let score = 0
      for (const d of done) {
        const age = at - d.at
        if (age > 14) continue
        const spread = 0.45 * reach(d.s) + 0.3 * r
        const dd = (gx - d.target[0]) ** 2 + (gy - d.target[1]) ** 2
        score += 1.6 * (1 - age / 14) * Math.exp(-dd / (2 * spread * spread))
      }
      // Room on the board for most of the burst.
      // Room on the board for most of the burst: across it, and (the board being wide) a little less up and down it.
      const across = Math.min(gx - X0, -X0 - gx)
      const down = Math.min(gy - Y0, Y0 + ROWS - 1 - gy)
      if (across < 0.75 * r) score += (0.75 * r - across) * 0.9
      if (down < 0.5 * r) score += (0.5 * r - down) * 0.9
      // The middle gap is the surprise's, and the last chord's.
      if (gx === MIDDLE[0] && gy === MIDDLE[1]) score += 2
      // A shot whose repeat lands in its mirror is off the middle column, or the mirror would be the same gap.
      if (paired && Math.abs(gx) < 2) score += 3
      // An easy swing, the more so the less time there is for it: in a quick run the shots step along the board.
      const turn = Math.abs(aimAt([gx, gy]) - angle)
      score += (1.4 * turn * turn) / Math.max(0.3, window - 0.9)
      // The far sides only now and then.
      score += 0.05 * Math.abs(gx)
      // Not too near the launcher's own foot.
      if (gy > 1) score += (gy - 1) * 0.25
      score += 0.5 * hash(gx + 40, gy + 40, seed)
      if (score < bestScore) {
        bestScore = score
        best = [gx, gy]
      }
    }
  }
  return best
}

function compose(): Shot[] {
  const shots: Shot[] = []
  const named = new Map<string, Shot>()
  const paired = new Set(SPECS.map((s) => s.mirrors).filter((k) => k !== undefined))
  let angle = HOME
  let lastLaunch = -Infinity
  SPECS.forEach((spec, i) => {
    const at = spec.onset !== undefined ? onsetNear(spec.onset) : beat(spec.bar!, spec.beat ?? 1)
    const before = beatBefore(at)
    // Fired on the beat before; across a pause with no beat in it, a quarter before, as a conductor gives the upbeat.
    const launch = at - before <= 1.25 ? before : at - quarterAt(at)
    const window = launch - lastLaunch
    const mirrored = spec.mirrors ? named.get(spec.mirrors) : undefined
    const target: Pt = spec.at ?? (mirrored ? [-mirrored.target[0], mirrored.target[1]] : choose(shots, at, spec.s, angle, window, i, spec.key !== undefined && paired.has(spec.key)))
    const aim = aimAt(target)
    // The first pellet comes up the lift on the music's first note; each after it just after the shot before.
    const reload: [number, number] = Number.isFinite(lastLaunch) ? [lastLaunch + 0.1, lastLaunch + 0.4] : [beat(1, 1), beat(1, 1) + 0.5]
    const turn = Math.abs(aim - angle)
    const aimFor = turn < 1e-3 ? 0 : clamp(0.22 + 0.45 * turn, 0.22, 1.0)
    const big = spec.s >= 0.85
    const most = i === 0 ? 7 : big ? 4 : 3
    const free = BEATS.filter((b) => b.t > reload[1] + aimFor + 0.1 && b.t < launch - 0.12 && (!big || b.beat === 1)).map((b) => b.t)
    const steps = free.slice(-most)
    let aimSpan: [number, number]
    let pull: [number, number] | null = null
    if (steps.length) {
      const end = steps[0] - 0.08
      aimSpan = [Math.max(reload[1], end - aimFor), end]
    } else {
      const start = reload[1]
      const end = Math.min(start + aimFor, launch - 0.4)
      aimSpan = [start, Math.max(start, end)]
      pull = [aimSpan[1] + 0.02, launch - 0.04]
    }
    const shot: Shot = {
      i,
      at,
      launch,
      target,
      angle: aim,
      color: spec.color,
      s: spec.s,
      bar: spec.onset !== undefined ? null : spec.bar!,
      beat: spec.onset !== undefined ? null : (spec.beat ?? 1),
      reload,
      aim: aimSpan,
      steps,
      pull,
      mirrors: mirrored ? mirrored.i : null,
    }
    shots.push(shot)
    if (spec.key) named.set(spec.key, shot)
    angle = aim
    lastLaunch = launch
  })
  return shots
}

export const SHOTS: readonly Shot[] = compose()

/** After the last shot the launcher swings home, as the last chord dies. */
export const HOMEWARD: [number, number] = [SHOTS[SHOTS.length - 1].at + 1.0, SHOTS[SHOTS.length - 1].at + 2.4]

