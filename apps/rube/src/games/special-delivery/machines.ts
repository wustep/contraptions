import { makeRng } from '../../../../../src/core/rng'
import type { Theme } from '../../../../../src/core/themes'
import { laneTime, type Lane, type Piece, type Placement, type Pt, type Seg } from '../../parts'
import { painter } from '../../pieces/workshop/painter'
import { conveyor } from '../../pieces/workshop/conveyor'
import { cannon } from '../../pieces/workshop/cannon'
import { frog } from '../../pieces/garden/frog'

export const INK = '#293b34'
export const PAPER = '#f5f1e7'
export const COLORS = ['#d86a53', '#538ba7', '#e4b64e'] as const
export const COLOR_NAMES = ['Red', 'Blue', 'Yellow'] as const
export const LETTERS = ['R', 'B', 'Y'] as const
export const ADDRESSES = ['Windmill', 'Lighthouse', 'Moon'] as const
export type Color = 0 | 1 | 2
export type Address = 0 | 1 | 2
export const THEME: Theme = { name: 'delivery', label: 'Postal ink', bg: PAPER, ink: INK, colors: [...COLORS, '#7a9b72'], weight: 0.72 }

export interface Machine {
  piece: Piece<any>
  placement: Placement<any>
  at: Pt
  rate: number
  duration: number
}

function machine<S>(piece: Piece<S>, at: Pt, rate: number, fits?: (cells: Pt[], exit: Pt) => boolean): Machine {
  const placement = piece.place({
    rng: makeRng(`special-delivery:${piece.name}`), color: piece.name === 'frog' ? '#7a9b72' : '#e4b64e',
    theme: THEME, taste: { weights: {} }, ball: { color: PAPER, ghost: false, id: 0 }, earned: 0,
    fits: fits ?? (() => true),
  })
  if (!placement) throw new Error(`Special Delivery: cannot place ${piece.name}`)
  return { piece, placement, at, rate, duration: laneTime(placement.lane) / rate }
}

export const MACHINES = {
  painter: machine(painter, [1.7, 2.3], 1.35),
  conveyor: machine(conveyor, [2.7, 2.3], 1.85),
  cannon: machine(cannon, [7.1, 2.3], 1.55),
  frog: machine(frog, [11.4, 3.8], 1.2, (_, exit) => exit[0] === -1 && exit[1] === -1),
}
export type Station = keyof typeof MACHINES

export const readyAt = (i: number): Pt => [5.95 - i * 0.57, 1.3]
export const inputAt = (i: number): Pt => [0.48, 2.3 - i * 0.42]
export const returnAt = (i: number): Pt => [1.05 + i * 0.38, 3.82]
export const PARK: Pt = [5.85, 2.6]
export const mailboxAt = (i: number): Pt => [8.7 + i * 1.6, 0.55]

/** Stock lanes are translated, never inferred from collision or screen coordinates. */
export function worldLane(station: Station): Lane {
  const m = MACHINES[station]
  const pt = ([x, y]: Pt): Pt => [x + m.at[0], y + m.at[1]]
  return {
    fire: m.placement.lane.fire / m.rate,
    segs: m.placement.lane.segs.map((s): Seg => ({ ...s, from: pt(s.from), to: pt(s.to), dur: s.dur / m.rate })),
  }
}
