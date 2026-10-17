import type { Pt } from '../../../../parts'

export const clamp = (v: number): number => Math.max(0, Math.min(1, v))
export const mix = (a: number, b: number, u: number): number => a + (b - a) * u
export const phase = (t: number, a: number, b: number): number => clamp((t - a) / (b - a))
export const smooth = (t: number, a: number, b: number): number => {
  const u = phase(t, a, b)
  return u * u * (3 - 2 * u)
}
/** An impulse with zero initial displacement: a knock has velocity, never a positional jump. */
export const settle = (t: number, at: number, size: number, decay = 2, rate = 5): number => {
  const d = t - at
  return d < 0 ? 0 : size * Math.exp(-d / decay) * Math.sin(d * rate)
}
export const hash = (i: number, salt = 0): number => {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(salt + 1, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Shape-preserving cubic: continuous velocity, no overshoot at a stop or reversal. */
export function curve(keys: readonly (readonly [number, number])[]): (t: number) => number {
  const n = keys.length
  const slopes = keys.slice(1).map((b, i) => (b[1] - keys[i][1]) / (b[0] - keys[i][0]))
  const tangent = keys.map((_, i) => {
    if (i === 0 || i === n - 1) return 0
    const a = slopes[i - 1], b = slopes[i]
    if (a * b <= 0) return 0
    const h0 = keys[i][0] - keys[i - 1][0], h1 = keys[i + 1][0] - keys[i][0]
    const w0 = 2 * h1 + h0, w1 = h1 + 2 * h0
    return (w0 + w1) / (w0 / a + w1 / b)
  })
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1]
    if (t >= keys[n - 1][0]) return keys[n - 1][1]
    let i = 0
    while (keys[i + 1][0] < t) i++
    const [a, x] = keys[i], [b, y] = keys[i + 1], h = b - a, u = (t - a) / h
    return (2 * u ** 3 - 3 * u ** 2 + 1) * x + (u ** 3 - 2 * u ** 2 + u) * h * tangent[i]
      + (-2 * u ** 3 + 3 * u ** 2) * y + (u ** 3 - u ** 2) * h * tangent[i + 1]
  }
}
export function route(keys: readonly (readonly [number, number, number])[]): (t: number) => Pt {
  const x = curve(keys.map(([t, v]) => [t, v])), y = curve(keys.map(([t, , v]) => [t, v]))
  return (t) => [x(t), y(t)]
}
export function rotate(x: number, y: number, a: number): Pt {
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
}
