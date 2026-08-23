/** Easing and timing helpers. All take and return normalized progress. */

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

/**
 * Re-normalize `u` against the sub-window [a, b], clamped to [0, 1].
 * This is the workhorse for multi-stage contraptions:
 *   const rise = seg(u, 0, 0.25)   // 0 -> 1 over the first quarter of the loop
 */
export const seg = (u: number, a: number, b: number) => clamp((u - a) / (b - a))

/** True while `u` sits inside [a, b). */
export const inSeg = (u: number, a: number, b: number) => u >= a && u < b

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2
export const easeInSine = (x: number) => 1 - Math.cos((x * Math.PI) / 2)
export const easeOutSine = (x: number) => Math.sin((x * Math.PI) / 2)
export const easeInQuad = (x: number) => x * x
export const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x)
export const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
export const easeOutBack = (x: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
export const easeOutElastic = (x: number) => {
  const c4 = (2 * Math.PI) / 3
  if (x === 0 || x === 1) return x
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
}
export const easeOutBounce = (x: number) => {
  const n1 = 7.5625
  const d1 = 2.75
  if (x < 1 / d1) return n1 * x * x
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375
  return n1 * (x -= 2.625 / d1) * x + 0.984375
}

/** 0 -> 1 -> 0 over the unit interval, with sine easing. Handy for breathing motions. */
export const pingPong = (x: number) => (1 - Math.cos(x * Math.PI * 2)) / 2

/** Quantize `u` into `steps` discrete positions, for ratchet-like motion. */
export const step = (u: number, steps: number) => Math.floor(u * steps) / steps

/**
 * Discrete steps with an eased transition inside each step.
 * `hold` is the fraction of each step spent stationary.
 */
export const stepEase = (u: number, steps: number, hold = 0.5) => {
  const scaled = u * steps
  const index = Math.floor(scaled)
  const local = clamp((scaled - index) / (1 - hold))
  return (index + easeInOutCubic(local)) / steps
}

/** Positive modulo. `-1 % 3` is -1 in JS; this returns 2. */
export const mod = (n: number, m: number) => ((n % m) + m) % m
