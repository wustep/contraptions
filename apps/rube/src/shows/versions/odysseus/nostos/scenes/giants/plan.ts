import { fly, ride, type Move, type Pt } from '../../path'
import { glide, seat, WINDOWS } from '../../voyage'
import { surface } from '../../world/sea'
import { DECK, floatAt, onShip, type Pose } from '../../world/ship'
import { k } from './beats'
import { later, lazy } from './lazy'

/**
 * Telepylus, timed: when the three ships come in, where each is, when each giant comes out of the fog and when it
 * throws, where every boulder comes down, and what happens to the men on the two ships that are struck. Every throw
 * lands on a beat of the comb (`beats.ts`): the first in the water ahead of them, as a warning; ship 2 on the third
 * phrase's downbeat; one into the water by his own ship; ship 1 on the hardest beat of the fourth phrase; and the last
 * into his wake as he gets out.
 */

export const FROM = WINDOWS.giants[0]
export const TO = WINDOWS.giants[1]

/** The cliff along the back of the fjord: its foot just behind the ships, its top where the giants stand. */
export const CLIFF = { x0: 180, x1: 264, foot: -0.32 }
export const TOP = -9.5

/** The three ships' way along the fjord: rowing in on the beat, slowing under the cliff, his own pulling out hard. */
export const X: ((t: number) => number)[] = [
  glide([[FROM, 150, 4.5], [197.35, 188, 3.2], [206.35, 212, 2.2], [215.35, 236, 3.4], [TO, 268, 5]]),
  glide([[FROM, 143, 4.5], [197.35, 181, 3.2], [206.35, 205, 2.4], [k(38), 228.6, 2.2]]),
  glide([[FROM, 136, 4.5], [197.35, 174, 3.2], [k(24), 198, 2.2]]),
]

/** When ships 2 and 1 are struck. */
export const HIT: Record<1 | 2, number> = { 2: k(24), 1: k(38) }

/** How long a struck ship takes to go down out of sight. */
export const SINK = 5.4

/** A struck ship: carried on a little by its way, split at the mast, its bow going down, then under. */
export function sinking(i: 1 | 2): (t: number) => Pose {
  const x = X[i]
  const hit = HIT[i]
  const v = (x(hit + 0.01) - x(hit - 0.01)) / 0.02
  return (t) => {
    if (t < hit) return floatAt(x(t), t)
    const s = t - hit
    const tau = 0.9
    const at = x(hit) + v * tau * (1 - Math.exp(-s / tau))
    const p = floatAt(at, t)
    // Holed amidships, it lists and goes down by one end, its other end rising out of the water, slowly at first,
    // then all at once.
    const down = 0.06 * s + 0.13 * s * s + 0.12 * Math.max(0, s - 2.5) ** 2
    const lean = (i === 2 ? 0.62 : -0.55) * (1 - Math.exp(-s / 1.1))
    return { x: p.x, y: p.y + down, a: p.a * Math.exp(-s / 1.2) + lean }
  }
}

/** The giants: where each stands on the cliff top, and when it comes out of the fog (show seconds, on beats). */
export interface Giant {
  x: number
  /** It comes out of the fog over the two beats from here. */
  emerge: number
  /** A little taller or shorter than the others. */
  size: number
}
export const GIANTS: Giant[] = [
  { x: 193.5, emerge: k(13), size: 0.98 },
  { x: 203, emerge: k(14), size: 0.92 },
  { x: 224, emerge: k(18), size: 0.95 },
  { x: 251, emerge: k(26), size: 1.0 },
]

/** One boulder: which giant throws it, when it comes down, and where (a point on a ship's deck, or the water). */
export interface Throw {
  giant: number
  land: number
  /** Where it comes down, at `land`. */
  at: Pt
  /** The ship it breaks, if it strikes one. */
  ship?: 1 | 2
  /** Its size (radius, cells) and its own turn. */
  r: number
  spin: number
}

/** Seconds a boulder is in the air: thrown out level from the giant's hand, a short, heavy flight. */
export const FLIGHT = 1.25

const water = (x: number, t: number): Pt => [x, surface(x, t)]
const deck = (i: 1 | 2): Pt => {
  const pose = floatAt(X[i](HIT[i]), HIT[i])
  return onShip(pose, [0.15, DECK - 0.42])
}

/** A throw whose mark is worked out when it is first wanted, when the sea is as the score has set it (`lazy.ts`). */
const throwing = (spec: Omit<Throw, 'at'>, mark: () => Pt): Throw => {
  const at = later(mark)
  return {
    ...spec,
    get at() {
      return at()
    },
  }
}

export const THROWS: Throw[] = [
  throwing({ giant: 1, land: k(20), r: 0.5, spin: -1.1 }, () => water(X[1](k(20)) + 3.4, k(20))),
  throwing({ giant: 0, land: HIT[2], ship: 2, r: 0.58, spin: 0.9 }, () => deck(2)),
  throwing({ giant: 2, land: k(30), r: 0.52, spin: 1.3 }, () => water(X[0](k(30)) + 3.6, k(30))),
  throwing({ giant: 2, land: HIT[1], ship: 1, r: 0.6, spin: -0.8 }, () => deck(1)),
  throwing({ giant: 3, land: k(44), r: 0.55, spin: 1.0 }, () => water(X[0](k(44)) - 3.2, k(44))),
]

/** The side of a giant a throw is made from: its right arm (+1) for a target to its right. */
export const sideOf = (th: Throw): 1 | -1 => (th.at[0] >= GIANTS[th.giant].x ? 1 : -1)

/* ------------------------------------------------------------------ the men */

/**
 * The men of a struck ship: thrown off by the blow, a short arc each into the water beside the hull, and down into the
 * dark, slowing to the pace of a body sinking. A man is gone (dead) once he is well under the bottom of any frame
 * this scene makes.
 */
export interface Fate {
  moves: Move[]
  death: number
}

const SINK_SPEED = 1.5
const DEEP = 15

export function fateOf(man: number, ship: 1 | 2): Fate {
  const hit = HIT[ship]
  const pose = sinking(ship)
  // Off the deck where he sat, as the sea has the deck at the blow (worked out when first wanted: `lazy.ts`).
  const from = later(() => onShip(pose(hit), seat(man)))
  const i = man - (ship === 1 ? 6 : 10)
  const dx = [-1.7, -0.6, 0.9, 1.9][i] + (ship === 1 ? 0.2 : -0.2)
  const T = [0.62, 0.72, 0.66, 0.78][i]
  const LAND_Y = 0.22
  const land = later((): Pt => [from()[0] + dx, LAND_Y])
  const splash = hit + T
  const vIn = 26 * T * 0.55
  const tau = 0.4
  // Into the water: the speed it fell at, given up to the water over `tau`, and then the slow sink.
  const depthAt = (t: number): number => {
    const s = Math.max(0, t - splash)
    const e = 1 - Math.exp(-s / tau)
    return LAND_Y + vIn * tau * e + SINK_SPEED * (s - tau * e)
  }
  const sinkAt = (t: number): Pt => {
    const s = Math.max(0, t - splash)
    return [land()[0] + dx * 0.25 * (1 - Math.exp(-s / tau)), depthAt(t)]
  }
  // When it reaches DEEP.
  let death = splash
  while (depthAt(death) < DEEP) death += 0.05
  return {
    moves: [lazy(hit, splash, 'fly', () => fly(from(), land(), hit, splash)), ride(sinkAt, splash, death)],
    death,
  }
}
