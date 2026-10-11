import type { Pen } from './skins-pen'

/**
 * What every skin shares: the one machine's geometry, the moment a skin's backdrop answers, and the shape of a skin.
 * The skins themselves are in `skins.ts` (the worlds she has been to, and the first she never saw) and in
 * `skins-film.ts`, `skins-far.ts` and `skins-odd.ts` (more lives she never saw), which all draw from here.
 */

/* ------------------------------------------------------------------ the machine's geometry (shared by every skin) */

/** The pivot's height over the ground. */
export const HP = 0.36
/** Half the plank's length, and its thickness. */
export const PL = 1.15
export const TH = 0.09
/** How far from the pivot Evelyn and the weight sit on the plank. */
export const LE = 0.98
export const LW = 0.92
/** The wedge's half-width at the ground. */
export const WEDGE = 0.25
/** The plank's tilt when one end is down on the ground. */
export const TILT = Math.asin((HP - TH / 2) / PL)
/** The weight's height: it stands this tall on the plank. */
export const WEIGHT_H = 0.34

/** What the moment is, for a skin's backdrop to answer: the last slam of the plank, and how loud. */
export interface Moment {
  /** Show seconds. */
  t: number
  /** Seconds since the plank last slammed (Infinity before the first). */
  since: number
  /** That slam's strength in the recording (0 to 2.4). */
  s: number
  /** Which end slammed: Evelyn's (true) or the weight's. */
  e: boolean
}

/** The box of the scene the panel shows, in scene cells. */
export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Skin {
  key: string
  bg: string
  ink: string
  /** The ground from y = 0 down, and a band along its top edge. */
  floor: string
  edge?: string
  plank: string
  fulcrum: string
  /** Everything behind the machine: the walls, the sky, the one big silhouette. */
  back(pen: Pen, m: Moment, v: View): void
  /** The weight, standing with its foot at 0,0 and WEIGHT_H tall. */
  weight(pen: Pen): void
  /** The plank's own look, in its frame (x -PL..PL, y -TH/2..TH/2); a plain bar of `plank` when unset. */
  board?(pen: Pen): void
  /** Over the machine and Evelyn: rain, a flash. */
  front?(pen: Pen, m: Moment, v: View): void
}

/* ------------------------------------------------------------------ helpers */

export const flashOf = (m: Moment, min = 1.1, decay = 0.14): number => (m.since < 0 || m.s < min ? 0 : Math.exp(-m.since / decay) * Math.min(1, (m.s - min + 0.4) / 0.9))
/** A damped ring after a slam: what a hanging thing does when the floor it hangs over is struck. */
export const ring = (m: Moment, period = 0.36, decay = 0.35): number => (m.since < 0 || !Number.isFinite(m.since) ? 0 : Math.exp(-m.since / decay) * Math.sin((m.since / period) * Math.PI * 2))
