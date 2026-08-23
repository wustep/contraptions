/**
 * Small numeric solvers for motion that easing curves get wrong.
 *
 * Everything here is precomputed at setup and sampled by index at draw time, so
 * contraptions using it stay pure functions of `u`.
 */

/** Samples per quarter swing. Enough that linear sampling shows no facets. */
const RESOLUTION = 96

const cache = new Map<number, number[]>()

/**
 * Integrate theta'' = -sin(theta) from rest at `amplitude` down to theta = 0,
 * and return the descent resampled to `RESOLUTION` evenly spaced instants.
 *
 * A pendulum is only sinusoidal for small swings. Past roughly 20 degrees the
 * bob spends visibly longer near the turning points and crosses the bottom
 * faster than a sine does, and that asymmetry is most of what makes a real
 * pendulum look alive. Semi-implicit Euler at this step size tracks the exact
 * elliptic solution to well under a pixel.
 */
function quarterSwing(amplitude: number): number[] {
  const dt = 0.0004
  const trace: number[] = []
  let theta = amplitude
  let omega = 0
  while (theta > 0) {
    trace.push(theta)
    omega -= Math.sin(theta) * dt
    theta += omega * dt
    // A pendulum released from rest always reaches the bottom; the guard is
    // only here so a pathological amplitude cannot spin forever.
    if (trace.length > 200000) break
  }

  const out: number[] = []
  for (let i = 0; i < RESOLUTION; i++) {
    const at = (i / (RESOLUTION - 1)) * (trace.length - 1)
    const lo = Math.floor(at)
    const hi = Math.min(trace.length - 1, lo + 1)
    out.push(trace[lo] + (trace[hi] - trace[lo]) * (at - lo))
  }
  out[RESOLUTION - 1] = 0
  return out
}

/**
 * A reusable quarter-swing table for `amplitude` radians. Amplitudes are
 * rounded before lookup so a grid full of pendulums shares a handful of tables
 * rather than integrating one each.
 */
export function pendulum(amplitude: number): number[] {
  const key = Math.round(Math.max(0.02, Math.min(2.6, amplitude)) * 200)
  let table = cache.get(key)
  if (!table) {
    table = quarterSwing(key / 200)
    cache.set(key, table)
  }
  return table
}

/** The descent, from `amplitude` at x = 0 to 0 at x = 1. */
function descent(table: number[], x: number): number {
  const at = Math.min(1, Math.max(0, x)) * (RESOLUTION - 1)
  const lo = Math.floor(at)
  const hi = Math.min(RESOLUTION - 1, lo + 1)
  return table[lo] + (table[hi] - table[lo]) * (at - lo)
}

/**
 * Angle at normalized position `u` through one full swing: out, back, out the
 * other side, and back again. Built from the quarter table by symmetry, so the
 * loop closes exactly.
 */
export function swing(table: number[], u: number): number {
  const x = ((u % 1) + 1) % 1
  if (x < 0.25) return descent(table, x * 4)
  if (x < 0.5) return -descent(table, 1 - (x - 0.25) * 4)
  if (x < 0.75) return -descent(table, (x - 0.5) * 4)
  return descent(table, 1 - (x - 0.75) * 4)
}
