import type p5 from 'p5'
import type { Theme } from '../../../../../../../src/core/themes'
import { mixHex, type Pt } from '../../../../parts'
import type { World } from '../../../../worlds'
import { PERIOD, wrap } from './music'
import { RADIUS } from './path'

/**
 * The planet and its day. The sea is a circle of RADIUS cells about the
 * world's origin, the ball goes round it clockwise once a period, and "up"
 * anywhere on it is out from the middle. A point is named by how far round it
 * is along the sea (`u`, cells) and how high over the sea (`h`).
 *
 * One time round is one day: the Gymnopédie at dawn and through the morning,
 * the first Gnossienne from dusk into the night, the third under the moon, and
 * the dark before dawn again as the circle closes. The colours are keyed to
 * show time and taken round the circle, so the last frame of the period and
 * the first are the same frame.
 */

export const BALL = '#F7EBD0'

export const THEME: Theme = {
  name: 'gymnopedie',
  label: 'Gymnopédie',
  bg: '#0B1020',
  ink: '#161A28',
  colors: [BALL, '#E8DFCF', '#F2B45A', '#8FB3A0'],
  weight: 0.72,
  note: 'A small sea planet, and one day on it.',
}

export const WORLD: World = {
  name: 'gymnopedie',
  label: 'Gymnopédie',
  note: 'A small sea planet: a colonnade at dawn, lamps at night, lotus under the moon.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

/** World cells of the point `h` over the sea, `u` round it. */
export function polar(u: number, h = 0): Pt {
  const a = u / RADIUS
  const r = RADIUS + h
  return [r * Math.sin(a), -r * Math.cos(a)]
}

/** The angle, radians clockwise from the top, of the point `u` round. */
export const angleOf = (u: number): number => u / RADIUS

/** Back to `u` from a world point (in [0, 2πR)), and its height over the sea. */
export function unpolar(x: number, y: number): { u: number; h: number } {
  let a = Math.atan2(x, -y)
  if (a < 0) a += Math.PI * 2
  return { u: a * RADIUS, h: Math.hypot(x, y) - RADIUS }
}

/**
 * A slow oscillation that comes round with the period: the nearest whole number of cycles a period to `hz`. What
 * anything that shimmers or sways runs on, so that nothing jumps at the end of the period.
 */
export const osc = (t: number, hz: number, phase = 0): number => {
  const n = Math.max(1, Math.round(hz * PERIOD))
  return Math.sin((2 * Math.PI * n * wrap(t)) / PERIOD + phase)
}

/** 0 until `a`, 1 from `b`, smooth between. */
export const smooth = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/** A colour with an alpha, 0..1. */
export function alpha(p: p5, hex: string, a: number): p5.Color {
  const c = p.color(hex)
  c.setAlpha(Math.max(0, Math.min(255, a * 255)))
  return c
}

export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** The day's colours at one moment. */
export interface Sky {
  /** The sky overhead, and at the horizon. */
  top: string
  low: string
  /** The sea at its surface, and deep. */
  sea: string
  deep: string
  /** The line the things on the planet are drawn with, and their lit face. */
  line: string
  lit: string
  /** 0 by day, 1 at full night: stars, lamps. */
  night: number
}

const KEYS: (Sky & { t: number })[] = [
  // Before dawn: where the circle closes.
  { t: 0, top: '#121833', low: '#6A5878', sea: '#2A3450', deep: '#10162A', line: '#141827', lit: '#CFC4BE', night: 0.75 },
  { t: 26, top: '#2E3C63', low: '#E6AE93', sea: '#3F5870', deep: '#172437', line: '#171B2A', lit: '#EFDCCB', night: 0.25 },
  { t: 95, top: '#7E9FBA', low: '#F2DDC2', sea: '#5E8193', deep: '#26404F', line: '#1A1F2C', lit: '#F3EADB', night: 0 },
  { t: 170, top: '#6E8FB0', low: '#F4D4A6', sea: '#557789', deep: '#223A4A', line: '#1A1F2C', lit: '#F4E6CC', night: 0 },
  // Dusk, as the Gymnopédie ends and the first Gnossienne begins.
  { t: 212, top: '#3B3765', low: '#DE8C6C', sea: '#3C4868', deep: '#161C33', line: '#161A28', lit: '#E6C9B4', night: 0.35 },
  { t: 262, top: '#0D1228', low: '#2B3462', sea: '#172040', deep: '#080C1C', line: '#C9C2B3', lit: '#3A3F57', night: 1 },
  { t: 440, top: '#0B1024', low: '#252E58', sea: '#141C38', deep: '#070A18', line: '#C9C2B3', lit: '#3A3F57', night: 1 },
  // The moon: the third Gnossienne.
  { t: 472, top: '#101B36', low: '#3E557E', sea: '#20304F', deep: '#0B1226', line: '#D6D3C6', lit: '#8FA9B8', night: 0.9 },
  { t: 600, top: '#0F1932', low: '#46587E', sea: '#223252', deep: '#0B1226', line: '#D6D3C6', lit: '#8FA9B8', night: 0.9 },
  { t: PERIOD, top: '#121833', low: '#6A5878', sea: '#2A3450', deep: '#10162A', line: '#141827', lit: '#CFC4BE', night: 0.75 },
]

/** The day's colours at show time `t`. */
export function skyAt(t: number): Sky {
  const u = wrap(t)
  let i = 0
  while (i + 2 < KEYS.length && KEYS[i + 1].t <= u) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const f = smooth(u, a.t, b.t)
  return {
    top: mixHex(a.top, b.top, f),
    low: mixHex(a.low, b.low, f),
    sea: mixHex(a.sea, b.sea, f),
    deep: mixHex(a.deep, b.deep, f),
    line: mixHex(a.line, b.line, f),
    lit: mixHex(a.lit, b.lit, f),
    night: a.night + (b.night - a.night) * f,
  }
}
