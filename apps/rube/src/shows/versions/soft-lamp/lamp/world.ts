import type { Theme } from '../../../../../../../src/core/themes'
import { mixHex } from '../../../../parts'
import type { World } from '../../../../worlds'
import { LAMP } from './desk'
import { MUSIC_END, TRACKS, heldAt, smooth, trackAt } from './music'

/**
 * The room's palette and its light. Two colours and the neutrals: the lamp's amber (the light, the wood, the clay,
 * the one warm book) and the rain's blue-grey (the night, the glass, the one cool book, the plant), over a warm dark
 * and a cream. One ink for every line, the ball's too.
 */

export const INK = '#17141A'
export const CREAM = '#EFE4CE'
export const BALL = '#F1E6CF'

export const THEME: Theme = {
  name: 'soft-lamp',
  label: 'Soft Lamp',
  bg: '#1E1917',
  ink: INK,
  colors: [BALL, CREAM, '#E7B872', '#5E6E7C'],
  weight: 0.62,
  note: 'A desk by a rainy window at night, under one lamp.',
}

export const WORLD: World = {
  name: 'soft-lamp',
  label: 'Soft Lamp',
  note: 'A study desk by a rainy window at night: the sill, three books, the headphones, the lamp.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

/** The lamp's light, as warm as it is at its brightest, and the dark it falls off into. */
export const AMBER = '#EDBE7C'
export const AMBER_DEEP = '#C9894E'

/** The shade's mouth: where the light comes from (a little down the shade from the hinge, toward the aim). */
export const MOUTH = (() => {
  const dx = LAMP.aim.x - LAMP.hinge.x
  const dy = LAMP.aim.y - LAMP.hinge.y
  const d = Math.hypot(dx, dy)
  return { x: LAMP.hinge.x + (dx / d) * 0.62, y: LAMP.hinge.y + (dy / d) * 0.62, ux: dx / d, uy: dy / d }
})()

/**
 * How much of the lamp's light falls at a point, 0 to 1: inside its cone (a little over 40 degrees either side of the
 * shade's axis, softly edged) and falling off with distance. The wall behind the desk takes it more softly than the
 * things on the desk (`soft`).
 */
export function lightAt(x: number, y: number, soft = 0): number {
  const dx = x - MOUTH.x
  const dy = y - MOUTH.y
  const d = Math.hypot(dx, dy) || 1e-6
  const cos = (dx * MOUTH.ux + dy * MOUTH.uy) / d
  const edge = 0.7 - soft * 0.5
  const cone = smooth(cos, edge - 0.18, edge + 0.12)
  const fall = 1 / (1 + (d / (3.6 + soft * 2)) ** 2)
  // A little spills back up round the shade: the arm and the wall right by it are never quite dark.
  const spill = 0.35 * Math.exp(-d / 0.9)
  return Math.min(1, cone * fall * 1.5 + spill)
}

/** When the lamp comes on: as the first track's first chord sounds. */
export const LAMP_ON = TRACKS[0].from

/**
 * How bright the lamp is at `t`: off as the show opens (the room lit only by the window), warming up over a second
 * and a half as the first chord sounds, steady then, breathing a few per cent with the held sound (the pad and the keys
 * under each track), and, once the last track has rung out, going down to a glow as the show ends.
 */
export function lampAt(t: number): number {
  const breath = 0.965 + 0.05 * heldAt(t)
  const on = 0.04 + 0.96 * smooth(t, LAMP_ON - 0.1, LAMP_ON + 1.5) ** 1.3
  const out = 1 - 0.8 * smooth(t, MUSIC_END - 1.5, MUSIC_END + 4.5)
  return breath * on * out
}

/**
 * How warm the light is, 0 (a pale amber) to 1 (deep): a little different for each track, eased from one to the next
 * across the breath between them, so each track has its own lamp and no track's change is seen as a change.
 */
const WARMTH = [0.35, 0.45, 0.55, 0.4, 0.6, 0.7, 0.5, 0.65, 0.75, 0.55, 0.45, 0.6]
export function warmthAt(t: number): number {
  const tr = trackAt(t)
  const next = TRACKS[tr.n + 1]
  const here = WARMTH[tr.n]
  if (!next) return here
  return here + (WARMTH[tr.n + 1] - here) * smooth(t, tr.to - 6, next.from + 2)
}

/** The lamp's colour at `t`. */
export const lampColor = (t: number): string => mixHex(AMBER, AMBER_DEEP, warmthAt(t) * 0.55)

/**
 * The rain, 0 to 1: light at the start of the night, heavy through its middle, easing off by the end. Keyed to the
 * tracks (each its own weather), eased across the breaths between them.
 */
const RAIN = [0.3, 0.38, 0.5, 0.46, 0.62, 0.74, 0.86, 0.7, 0.8, 0.6, 0.46, 0.32]
export function rainAt(t: number): number {
  const tr = trackAt(t)
  const next = TRACKS[tr.n + 1]
  const here = RAIN[tr.n]
  const v = next ? here + (RAIN[tr.n + 1] - here) * smooth(t, tr.to - 10, next.from + 6) : here
  return v * (1 - 0.5 * smooth(t, MUSIC_END - 8, MUSIC_END + 6))
}

/** How far into the night it is, 0 to 1, over the whole show. */
export const nightAt = (t: number): number => Math.max(0, Math.min(1, t / (MUSIC_END + 6)))

/** A cheap stable hash, 0 to 1. */
export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** A colour lit by the lamp: `base` in the dark, toward `lit` as far as `l` (0 to 1). */
export const lit = (base: string, litColor: string, l: number): string => mixHex(base, litColor, Math.max(0, Math.min(1, l)))
