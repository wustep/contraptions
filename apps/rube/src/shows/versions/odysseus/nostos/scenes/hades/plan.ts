import { Path, fly, ramp, rest, ride, roll, type Move, type Pt } from '../../path'
import type { Actor } from '../../show'
import { HELM, WINDOWS, glide } from '../../voyage'
import { floatAt, onShip } from '../../world/ship'
import { k } from '../giants/beats'
import { lazy } from '../giants/lazy'

/**
 * The shore of the dead, timed (222.4 → 251.36, the tutti: everything, loudest, on the beat).
 *
 * His ship runs down from Telepylus to a long beach of black sand under a low sun that never sets, and coasts along it.
 * On the sixth phrase's downbeat he leaps ashore and cuts a trench along the water's edge as he rolls. On the hardest
 * beat after it, hands come up out of the trench where he has cut it, and the dead come up after them, beat by beat
 * towards him along the trench (the men he has lost first, nearest), and then rank on rank behind them, across the
 * whole shore, back into the haze. On the strongest beat of the phrase he runs; on the next phrase's downbeat the dead
 * come after him, a surge a beat; he leaps back aboard as his ship comes by, and on the next hard beat they stop at the
 * water's edge and stand, all of them, and watch the ship go.
 *
 * The beach lies behind the ship's plane: its front edge, the water's edge, a little above the waterline on the
 * screen, and its ground going back to the horizon. The dead stand on it in ranks, each rank on its own ground line;
 * the front two ranks are balls of the cast (`SHADES`), the rest are drawn (`shore.ts`).
 */

export const FROM = WINDOWS.hades[0]
export const TO = WINDOWS.hades[1]

/** The beach: where it runs along the shore, and the ground line of each near rank (cells, up negative). */
export const BEACH = { x0: 300, x1: 393 }
export const EDGE = -0.45
export const ROWS = [
  { ground: -0.52, scale: 0.92 },
  { ground: -0.86, scale: 0.85 },
  { ground: -1.2, scale: 0.79 },
  { ground: -1.53, scale: 0.73 },
] as const

/** His ship along the shore: down from the fjord fast, coasting along the beach, away hard. */
export const SHIP = glide([
  [FROM, 268, 5],
  [227.5, 302, 7],
  [k(60), 326, 3.3],
  [k(78), 370.5, 3.3],
  [TO, 392, 5],
])

/** The beats it turns on. */
export const ASHORE = k(60)
export const LANDED = k(61)
export const TRENCH_END = k(68)
export const HANDS = k(67)
export const RISEN = k(70)
export const RUN = k(70)
export const CHARGE = k(72)
export const ABOARD = k(78)
export const STOP = k(80)

/** The trench: from where he lands to where he stops. */
export const TRENCH = { x0: 326.5, x1: 334.5 }

const R = 0.13
const heroY = (scale: number) => ROWS[0].ground - R * scale
const HERO_SCALE = 0.94

const helm = (t: number): Pt => onShip(floatAt(SHIP(t), t), HELM)

/** His moves ashore and back. */
export function heroMoves(): Move[] {
  const land: Pt = [TRENCH.x0, heroY(HERO_SCALE)]
  const end: Pt = [TRENCH.x1, heroY(HERO_SCALE)]
  const runFrom: Pt = end
  const gathered: Pt = [TRENCH.x1 + 3.5, end[1]]
  const leapFrom: Pt = [368.0, end[1]]
  const into = (a: number, b: number, s0: number, s1: number) => (t: number) => s0 + (s1 - s0) * Math.max(0, Math.min(1, (t - a) / (b - a)))
  const leapAt = ABOARD - 0.75
  return [
    // Off his ship's deck, where the sea has it at that moment (worked out when first wanted: `giants/lazy.ts`).
    lazy(ASHORE, LANDED, 'fly', () => fly(helm(ASHORE), land, ASHORE, LANDED, { scale: into(ASHORE, LANDED, 1, HERO_SCALE) })),
    roll([land, end], LANDED, TRENCH_END, 'inout', { scale: () => HERO_SCALE }),
    rest(end, TRENCH_END, RUN, { scale: () => HERO_SCALE }),
    // From rest to his running pace over the first second (the ramp's length is its distance over its mean speed),
    // then steady to where he leaps.
    ramp([runFrom, gathered], RUN, 0, 7, { scale: () => HERO_SCALE }),
    roll([gathered, leapFrom], RUN + 1, leapAt, 'none', { scale: () => HERO_SCALE }),
    lazy(leapAt, ABOARD, 'fly', () => fly(leapFrom, helm(ABOARD), leapAt, ABOARD, { scale: into(leapAt, ABOARD, HERO_SCALE, 1) })),
  ]
}

/* ------------------------------------------------------------------ the dead */

/** The colour of the dead: ash, with a dim rim; the drawn ranks behind go paler into the haze. */
export const ASH = '#B8B3A9'
export const ASH_RIM = '#48443F'
export const SHADES_ID = 300

/** How far the dead come on in the charge, by rank (cells), and how it goes: a surge on each beat. */
export const CHARGE_BY_ROW = [33, 31.5, 30, 29]

/** The share of the charge done by `t`: a surge on each of the eight beats from CHARGE, each starting from rest. */
export function charged(t: number, lag = 0): number {
  const tt = t - lag
  if (tt <= CHARGE) return 0
  if (tt >= STOP) return 1
  let n = 72
  while (k(n + 1) <= tt) n++
  const a = k(n)
  const b = k(n + 1)
  const u = Math.max(0, Math.min(1, (tt - a) / (b - a)))
  // Each surge: from rest, quick, and settling before the next (a curve that peaks early).
  const v = Math.pow(u, 0.55)
  const f = v * v * (3 - 2 * v)
  // Bigger surges in the middle of the run than at its ends.
  const weights = [0.7, 1, 1.15, 1.2, 1.2, 1.15, 1, 0.6]
  const total = weights.reduce((x, y) => x + y, 0)
  const done = weights.slice(0, n - 72).reduce((x, y) => x + y, 0)
  return (done + weights[n - 72] * f) / total
}

/** One of the front two ranks: where it comes up, and when. */
export interface Shade {
  row: 0 | 1
  x: number
  /** When its hands break the sand; it is up and standing 1.1 s later. */
  rise: number
  /** A little behind the others in the surges. */
  lag: number
}

export const SHADES: Shade[] = (() => {
  const out: Shade[] = []
  for (let i = 0; i < 9; i++) {
    const f = i / 8
    // Not evenly spaced: each a little off its place, so they come up as men, not as a row.
    out.push({ row: 0, x: 327.0 + 0.86 * i + 0.28 * Math.sin(i * 2.9 + 0.7), rise: HANDS + (RISEN - 0.6 - HANDS) * f, lag: 0.04 * ((i * 7) % 3) })
    out.push({ row: 1, x: 326.6 + 0.86 * i + 0.3 * Math.sin(i * 2.3 + 2.1), rise: HANDS + 0.45 + (RISEN - 0.6 - HANDS) * f, lag: 0.05 + 0.04 * ((i * 5) % 3) })
  }
  return out
})()

/** How far up out of the sand a shade is, 0 to 1, `s` seconds after its hands break the sand. */
export const upOf = (s: number): number => {
  const u = Math.max(0, Math.min(1, (s - 0.45) / 0.7))
  return u * u * (3 - 2 * u)
}

/** One of the front ranks as a ball of the cast: up out of the sand, standing, then the charge, then still. */
export function shadeActor(sh: Shade, i: number): Actor {
  const row = ROWS[sh.row]
  const size = row.scale
  const at = (t: number): Pt => {
    const up = upOf(t - sh.rise)
    const x = sh.x + CHARGE_BY_ROW[sh.row] * charged(t, sh.lag)
    // Rising from just under the sand to standing on it, as it grows from nothing among its hands.
    const y = row.ground + R * size * (0.2 - 1.2 * up)
    return [x, y]
  }
  const moves: Move[] = [ride(at, sh.rise, 300)]
  return {
    id: SHADES_ID + i,
    color: ASH,
    rim: ASH_RIM,
    size,
    path: new Path(moves, `shade ${i}`),
    on: (t) => t >= sh.rise + 0.45,
    fade: (t) => upOf(t - sh.rise),
    mark: null,
  }
}

export const SHADE_ACTORS: Actor[] = SHADES.map(shadeActor)
