import { TICK } from '../../music'
import { WINDOWS } from '../../plan'
import { drift, smooth } from '../../paint'

/**
 * The erg's plan: when everything happens, where everything stands, and the sand they stand on.
 *
 * The ornithopter lifts off the palace roof in Arrakeen (`PAD`), and is next seen out over the open dunes east of the
 * city. It comes down by the harvester on a broad flat of sand among the dunes; the worm comes up beside it, east, and
 * goes down on it. Up is negative; the flat is at y = 0.
 */

export const [FROM, TO] = WINDOWS.erg

/** The moments, each on something the recording has (`strikes` in `erg.ts`). */
export const T = {
  /** The lift off the roof, on the drums' great blow. */
  lift: 130.664,
  /** Out over the open sand (a cut). */
  out: 133.01,
  dip: 134.9,
  skim: 137.31,
  climb: 138.7,
  /** The open erg, wide (a cut). */
  open: 140.75,
  /** The harvester (a cut). */
  ahead: 145.05,
  plume: 147.39,
  /** Worm sign; the choir comes in (a cut). */
  sign: 150.06,
  touch: 152.54,
  settle: 153.83,
  /** Close in the cockpit: they look up for the carryall (a cut, on a beat). */
  look: 155.06,
  /** The crew come out (a cut, on a beat), one on each of these. */
  crew: [157.55, 158.2, 159.52, 160.07, 160.97, 161.95],
  paulOut: 164.47,
  /** He stops in the spice, and sees. */
  stop: 167.15,
  letoOut: 169.65,
  letoDown: 170.06,
  /** The worm (a cut). */
  rise: 170.75,
  /** Leto reaches him (a cut). */
  bump: 172.9,
  aboard: 175.28,
  up: 176.33,
  climbing: 178.2,
  /** The arch (a cut). */
  arch: 179.94,
  over: 180.98,
  down: 183.21,
  swallow: 187.58,
  /** From high over it (a cut). */
  above: 190.06,
} as const

/** The harvester: its middle on the flat. It faces east, its door at its west end. */
export const HARVESTER = { x: 430 } as const
/** Where the ornithopter comes down, west of the harvester, facing it. */
export const LANDED = { x: 398, y: -0.6 } as const
/** The worm comes up here, east of the harvester, and goes down on it. */
export const WORM = { base: 478, plunge: 430 } as const

/** The wings beat once a tick of the click. */
export const beatAt = (t: number): number => (2 * Math.PI * (t - 0.057)) / TICK

/* ------------------------------------------------------------------ the sand */

/**
 * How tall the dunes stand at `x`: none on the broad flat round the harvester (which runs well east of it, open sand for
 * the worm sign to run across), rising to the open dunes either side.
 */
export function dunesAt(x: number): number {
  const env = x < 430 ? smooth(430 - x, 52, 76) : smooth(x - 430, 130, 156)
  return env * (4.2 + 1.5 * drift(x / 97, 7))
}

/**
 * The near sand's surface at `x` before anything disturbs it: long smooth swells about 46 cells apart, unequal, with a
 * crest on 262 (the one the ornithopter skims), their troughs broad.
 */
export function dunes(x: number): number {
  const A = dunesAt(x)
  const u = (x - 239 + 6 * drift(x / 140, 9)) / 46
  const c = 0.5 - 0.5 * Math.cos(2 * Math.PI * u)
  return -A * c ** 1.4
}

/** A monotone cubic through [t, v] keys, flat outside them. */
export function curve(keys: [number, number][]): (t: number) => number {
  const ks = [...keys].sort((a, b) => a[0] - b[0])
  const n = ks.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ks[i + 1][1] - ks[i][1]) / Math.max(1e-9, ks[i + 1][0] - ks[i][0]))
  const m = new Array<number>(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = ks[i][0] - ks[i - 1][0]
    const h1 = ks[i + 1][0] - ks[i][0]
    const a = 2 * h1 + h0
    const b = h1 + 2 * h0
    m[i] = (a + b) / (a / d[i - 1] + b / d[i])
  }
  return (t: number) => {
    if (t <= ks[0][0]) return ks[0][1]
    if (t >= ks[n - 1][0]) return ks[n - 1][1]
    let i = 0
    while (i + 1 < n && ks[i + 1][0] <= t) i++
    const h = ks[i + 1][0] - ks[i][0]
    const u = (t - ks[i][0]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ks[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ks[i + 1][1] + (u3 - u2) * h * m[i + 1]
  }
}
