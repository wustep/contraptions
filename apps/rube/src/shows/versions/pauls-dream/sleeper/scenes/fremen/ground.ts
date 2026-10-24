import { R } from '../../../../../../parts'
import type { Pt } from '../../paint'

/**
 * The near sand under the Fremen's scene, as a profile west to east: the flat at the foot of the great rock where the
 * thopter comes down and Jamis is fought, the dune behind it whose crest Chani stands on (crest A), the swells the troop
 * walks over, the crest they stop on to watch the worm (crest B), and the long rise beyond it toward the sun (crest C).
 * Cells, up negative.
 */

const KEYS: Pt[] = [
  [1100, 0],
  [1172, 0],
  [1179, -1.8],
  [1186, -4.0],
  [1192, -2.5],
  [1200, -5.0],
  [1207, -4.2],
  [1216, -3.0],
  [1226, -3.7],
  [1238, -5.4],
  [1246, -4.5],
  [1262, -2.7],
  [1280, -2.0],
  [1520, -2.0],
]

/** Where things stand in the scene: the landing, the fight, the crests. */
export const SPOT = {
  /** The thopter on the flat, facing east (its body's middle). */
  thopter: 1156.2,
  /** Chani's crest (the dream shot). */
  crestA: 1186,
  /** The crest where they stop to watch the worm, and where she turns to him. */
  crestB: 1200,
  /** The long rise toward the sun they go on over. */
  crestC: 1238,
} as const

const xs = KEYS.map((k) => k[0])
const ys = KEYS.map((k) => k[1])
const slopes = (() => {
  const n = KEYS.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m = new Array<number>(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = xs[i] - xs[i - 1]
    const h1 = xs[i + 1] - xs[i]
    const a = 2 * h1 + h0
    const b = h1 + 2 * h0
    m[i] = (a + b) / (a / d[i - 1] + b / d[i])
  }
  return m
})()

/** The sand's height at `x` (a monotone cubic through the keys: no overshoot, no flat spot at a key that is not a top). */
export function ground(x: number): number {
  const n = KEYS.length
  if (x <= xs[0]) return ys[0]
  if (x >= xs[n - 1]) return ys[n - 1]
  let i = 0
  while (i + 1 < n && xs[i + 1] <= x) i++
  const h = xs[i + 1] - xs[i]
  const u = (x - xs[i]) / h
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * slopes[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * slopes[i + 1]
}

/**
 * The dunes' west faces, turned from the low sun: [the foot of the face (x), the crest (x)], each from a trough in the
 * keys to the crest after it.
 */
export const FACES: [number, number][] = (() => {
  const out: [number, number][] = []
  let foot = xs[0]
  for (let i = 1; i < KEYS.length - 1; i++) {
    if (ys[i] >= ys[i - 1] && ys[i] > ys[i + 1]) foot = xs[i]
    if (ys[i] < ys[i - 1] && ys[i] <= ys[i + 1]) out.push([foot, xs[i]])
  }
  return out
})()

/** A ball of `size` resting on the sand at `x`. */
export const on = (x: number, size = 1): Pt => [x, ground(x) - R * size]

/** The sand under a run from `a` to `b`, every `step` cells: a ball's way over it (its centre's points). */
export function over(a: number, b: number, size = 1, step = 0.25): Pt[] {
  const n = Math.max(1, Math.ceil(Math.abs(b - a) / step))
  const out: Pt[] = []
  for (let i = 1; i <= n; i++) out.push(on(a + ((b - a) * i) / n, size))
  return out
}
