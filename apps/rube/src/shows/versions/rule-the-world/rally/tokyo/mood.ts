import type { Pt } from '../../../../../parts'
import type { Frame } from '../depth'
import { knock, smooth } from '../kit'
import { BEATS, WIN } from '../music'
import { houseLight, LIGHTS_DOWN, LIGHTS_UP, NET_X, POWER, RALLY, SECTIONS, SERVE, TURN } from './geo'

/**
 * The house's mood, which every drawing of the arena reads: how bright each section's lights are, how far the crowd is
 * up off its seats, the surge on every bat, and how hot the night is getting, from the dark exhibition to the winner
 * and down again to the one lamp. And the arena's depth: what is how far back, so that the far stands drift slower than
 * the table as the camera goes and the front row in the lens passes faster.
 */

/* ------------------------------------------------------------------ the crowd */

export const ERUPT = BEATS.filter((b) => b.bar >= 89 && b.bar <= 90).map((b) => b.t)

/** How far the crowd is up off its seats, 0 to 1. */
export function risen(t: number): number {
  return smooth(t, WIN, WIN + 0.25) * (1 - smooth(t, TURN - 0.3, TURN + 2.2))
}
/** The front of the house coming up off its seats through the last bar of the rally, before the winner has them all up. */
export function swell(t: number): number {
  return 0.6 * smooth(t, RALLY[11], WIN - 0.1)
}
/** The surge on every bat in the rally, a bigger one on his power shots, and the eruption's. */
export function surge(t: number): number {
  let v = 0
  for (const h of RALLY) if (t >= h && t < h + 1) v = Math.max(v, 0.45 * knock(t - h, 0.14))
  for (const h of POWER) if (t >= h && t < h + 2) v = Math.max(v, knock(t - h, 0.3))
  for (const h of ERUPT) if (t >= h && t < h + 1.5) v = Math.max(v, knock(t - h, 0.22))
  return v
}

/**
 * How hot the house is, 0 to 1: nothing through the exhibition, a little as the lights come up, climbing through the
 * real match to everything on the winner and the two bars after it, then easing off through the quiet and down to a
 * murmur once the lights go down.
 */
export function heat(t: number): number {
  if (t < LIGHTS_UP[0]) return 0
  if (t < SERVE) return 0.15 * smooth(t, LIGHTS_UP[0], SERVE)
  if (t < WIN) return 0.15 + 0.6 * ((t - SERVE) / (WIN - SERVE)) ** 1.4
  const after = 1 - 0.5 * smooth(t, TURN - 0.5, TURN + 2.5) - 0.38 * smooth(t, LIGHTS_DOWN[0], LIGHTS_DOWN[3] + 0.6)
  return Math.min(0.75 + 0.25 * smooth(t, WIN, WIN + 0.08), after)
}

/* ------------------------------------------------------------------ the house lights */

export function sectionOf(x: number): number {
  for (let i = 0; i < SECTIONS.length - 1; i++) if (x < SECTIONS[i + 1]) return i
  return SECTIONS.length - 2
}
/** The house lights on section `i` (clamped to the eight), 0 to 1. */
export const lit = (i: number, t: number): number => Math.max(0, Math.min(1, houseLight(Math.max(0, Math.min(7, i)), t)))
/** The house lights over the whole arena, 0 to 1. */
export function house(t: number): number {
  let s = 0
  for (let i = 0; i < 8; i++) s += Math.min(1, lit(i, t))
  return s / 8
}
/** The lamp's spill off the table, onto the nearest of the crowd and the floor. */
export const spill = (x: number, y: number): number => 0.3 * Math.exp(-(((x - NET_X) / 4.2) ** 2) - (((y - 0.5) / 1.8) ** 2))

/* ------------------------------------------------------------------ depth */

/** The point every layer of the house is laid out from: where the camera mostly is through the match. */
export const ANCHOR: Pt = [2, -0.8]
/** The far stands and the roof are laid out from where the wide shot of the eruption looks. */
export const HIGH: Pt = [3, -2]

/** How near a shot is, 0 for the wide view of the house to 1 for the closest look at a bat: what the lens's focus does. */
export const closeness = (f: Frame): number => Math.max(0, Math.min(1, (8 - (f.y1 - f.y0)) / 4.5))
