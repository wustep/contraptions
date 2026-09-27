import type p5 from 'p5'
import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'
import { mixHex } from '../../../../parts'

/**
 * How it looks: the Machine's own drawing (ink lines over one flat fill, on paper), in a warm paper and an ink,
 * and a colour for each storey that deepens as the orchestra grows, from the flute's pale sand to the tutti's wine.
 * The ball is the one cool thing in it.
 */

export const PAPER = '#F3EADB'
export const INK = '#2A2320'
export const BALL = '#2E5E93'
/**
 * The storeys, bottom to top, a colour for each pair of voices: the solo woodwinds pale (sage, straw), the reeds and
 * the muted brass warmer (apricot, amber), the horn and celesta's bronze, the trombone's terracotta, the strings'
 * vermilion and wine, and the tutti's plum and aubergine.
 */
export const STOREY_COLORS = ['#B9CDB0', '#E3CB8C', '#E9AA72', '#DC8C45', '#7FA79B', '#C9683F', '#B6473F', '#91374A', '#6F3456', '#4F2C54']
/** The roof and the great bell, and the tower lit by E major. */
export const GOLD = '#E2AC3F'
/** Brass, for the engines' fittings; iron for the mast. */
export const BRASS = '#C8A049'
export const IRON = '#5E5650'
/** The drum's shell. */
export const DRUM_RED = '#B8433A'

export const THEME: Theme = {
  name: 'ostinato',
  label: 'Ostinato',
  bg: PAPER,
  ink: INK,
  colors: [BALL, ...STOREY_COLORS],
  weight: 1,
  note: 'One tower on one drum.',
}

export const WORLD: World = {
  name: 'ostinato',
  label: 'Ostinato',
  note: 'A tower that grows a storey for each turn of the tune, standing on one side drum.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

export const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v))
/** 0 until `a`, 1 from `b`, smooth between. */
export const smooth = (t: number, a: number, b: number): number => {
  const u = clamp((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
export const easeOut = (u: number): number => 1 - (1 - clamp(u)) ** 3
export const easeIn = (u: number): number => clamp(u) ** 3
/** A damped ring after an impulse: sin at `hz`, falling by e every `decay` seconds; 0 before. */
export const ring = (since: number, hz = 6, decay = 0.35): number => (since < 0 || !Number.isFinite(since) ? 0 : Math.exp(-since / decay) * Math.sin(2 * Math.PI * hz * since))

export function alpha(p: p5, hex: string, a: number): p5.Color {
  const c = p.color(hex)
  c.setAlpha(clamp(a) * 255)
  return c
}

/** A colour, lightened toward the paper by `f`. */
export const pale = (hex: string, f: number): string => mixHex(hex, PAPER, f)
/** A colour, darkened toward the ink by `f`. */
export const deep = (hex: string, f: number): string => mixHex(hex, INK, f)

export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

type Styled = { drawingContext: CanvasRenderingContext2D; _cachedFillStyle?: unknown; _cachedStrokeStyle?: unknown; _setFill?: (f: unknown) => void; _setStroke?: (s: unknown) => void; ostinatoHonest?: boolean }
/**
 * p5 remembers the fill and stroke it last set and skips setting the same again; a gradient painted straight onto
 * the canvas leaves that note wrong. So the renderer this show draws with always sets what it is given.
 */
export function honest(p: p5): void {
  const r = (p as unknown as { _renderer?: Styled })._renderer
  if (!r || r.ostinatoHonest || !r._setFill || !r._setStroke) return
  r.ostinatoHonest = true
  r._setFill = function (this: Styled, f: unknown) {
    this.drawingContext.fillStyle = f as string
    this._cachedFillStyle = f
  }
  r._setStroke = function (this: Styled, v: unknown) {
    this.drawingContext.strokeStyle = v as string
    this._cachedStrokeStyle = v
  }
}
