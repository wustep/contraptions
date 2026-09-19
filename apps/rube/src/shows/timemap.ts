import { Show, type ShowOptions, type ShowPoint } from '../show'

/**
 * Fitting a machine to music. The machine has a clock of its own — a
 * cannon takes as long as a cannon takes — and the music has another. A
 * time map says where the machine's clock is for every second of music:
 * knots that pair the two, and a curve through them that never runs
 * backwards and never jumps, so a strike lands on its note and the way
 * there is a slight hurry or a slight wait, not a stop and a lurch.
 *
 * This is the vocabulary and no more. A version decides where its knots go
 * (by hand, from a score, a map for the whole show or one a piece) and
 * answers the player with `show.at(t)` in seconds of music. There is no
 * editor here. The one promise the player makes is that it never asks
 * for anything else.
 */

/** Seconds of music paired with seconds on the machine's own clock. */
export interface Knot {
  at: number
  native: number
}

/**
 * The machine's clock as a function of the music's: a monotone cubic
 * through the knots (Fritsch–Carlson tangents), so it passes through every
 * one exactly, its rate never changes abruptly at one, and it never
 * overshoots into running backwards. Outside the knots it carries on at
 * the machine's own rate.
 */
export function timeMap(knots: readonly Knot[]): (t: number) => number {
  if (knots.length < 2) {
    const k = knots[0] ?? { at: 0, native: 0 }
    return (t) => k.native + (t - k.at)
  }
  const n = knots.length
  const slopes = knots.slice(1).map((b, i) => (b.native - knots[i].native) / (b.at - knots[i].at))
  const tangents = knots.map((_, i) => {
    if (i === 0) return slopes[0]
    if (i === n - 1) return slopes[n - 2]
    const a = slopes[i - 1]
    const b = slopes[i]
    // The harmonic mean: gentle where the two sides agree, flat where they disagree.
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b)
  })
  return (t) => {
    const first = knots[0]
    const last = knots[n - 1]
    if (t <= first.at) return first.native + (t - first.at)
    if (t >= last.at) return last.native + (t - last.at)
    let i = 0
    while (knots[i + 1].at < t) i++
    const a = knots[i]
    const b = knots[i + 1]
    const h = b.at - a.at
    const f = (t - a.at) / h
    const f2 = f * f
    const f3 = f2 * f
    return (
      (2 * f3 - 3 * f2 + 1) * a.native +
      (f3 - 2 * f2 + f) * h * tangents[i] +
      (-2 * f3 + 3 * f2) * b.native +
      (f3 - f2) * h * tangents[i + 1]
    )
  }
}

/**
 * When, in the music, the machine's clock reads `native`: the map read the
 * other way, by bisection, which a map that never runs backwards allows.
 * For whatever rides between two knots and still needs its note.
 */
export function musicTimeOf(map: (t: number) => number, native: number, from: number, to: number): number {
  let lo = from
  let hi = to
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2
    if (map(mid) < native) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * What is wrong with a set of knots, a line each: out of order, or asking
 * the machine to run slower than `slowest` or faster than `fastest` times
 * its own rate between two of them. Past about a quarter either way a
 * mechanism stops looking like itself.
 */
export function knotProblems(knots: readonly Knot[], slowest = 0.75, fastest = 1.35): string[] {
  const out: string[] = []
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1]
    const b = knots[i]
    if (!(b.at > a.at) || !(b.native > a.native)) {
      out.push(`knot ${i} does not come after knot ${i - 1}`)
      continue
    }
    const rate = (b.native - a.native) / (b.at - a.at)
    if (rate < slowest || rate > fastest) out.push(`knots ${i - 1}–${i} run the machine at ${rate.toFixed(2)}×`)
  }
  return out
}

/**
 * A procedural show under one time map: the planner's machine, played on
 * the music's clock. Everything the stage asks of a show goes through `at`
 * (the ball, the pieces' clocks, the trail behind the ball, the camera's
 * look ahead) so the whole picture is retimed together.
 */
export class RetimedShow extends Show {
  constructor(
    seed: string,
    options: ShowOptions,
    private readonly map: (t: number) => number,
  ) {
    super(seed, options)
  }

  override at(t: number): ShowPoint {
    return super.at(this.map(t))
  }
}
