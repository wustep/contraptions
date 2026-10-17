import { makeRng } from '../../src/core/rng'
import type { Theme } from '../../src/core/themes'
import { laneAt, laneReach, laneTime, type Piece, type Placement } from '../rube/src/parts'
import { Show, type ShowPoint } from '../rube/src/show'
import type { Universe } from '../rube/src/universe'
import { musicbox } from '../rube/src/playground/pieces/orchestra/musicbox'
import { triangle } from '../rube/src/playground/pieces/orchestra/triangle'
import { harp } from '../rube/src/playground/pieces/orchestra/harp'
import { timpani } from '../rube/src/playground/pieces/orchestra/timpani'
import { keys } from '../rube/src/playground/pieces/orchestra/keys'
import { xylophone } from '../rube/src/playground/pieces/orchestra/xylophone'
import { COLORS, STEP, type Take, type Voice } from './model'

export const PAPER = '#f7f3ea'
const theme: Theme = { name: 'pocket', label: 'Pocket', bg: PAPER, ink: '#303a35', colors: ['#c99b44', '#b9533e', '#56817b', '#7c6282', '#f8f7ee'], note: 'a small orchestra on paper' }
const pieces: Record<Voice, Piece<any>> = { musicbox, triangle, harp, timpani, keys, xylophone }
export interface Contact { at: number; degree: number; strength: number }
export interface Instrument { show: Miniature; placement: Placement<unknown>; contacts: Contact[]; lead: number; span: number; frame: { x: number; y: number; w: number; h: number } }

/** These are the actual contact clocks of the stock drawings, not a second beat grid.
 * The music box's comb releases, harp's string releases, and drum's first touch are
 * distinct from lane.fire. Keep their formulas beside the adapters and check them. */
function contacts(kind: Voice, p: Placement<unknown>): Contact[] {
  const event = (at: number, degree = 0, strength = 1): Contact => ({ at, degree, strength })
  if (kind === 'harp') return Array.from({ length: 9 }, (_, i) => event(laneReach(p.lane, -.15 + .14 * i + .075 - .13 * .9), i - 2, .53))
  if (kind === 'keys') return Array.from({ length: 8 }, (_, i) => event((-.36 + .215 * (i + .5) + .5) / 2.6, i - 2, .64))
  if (kind === 'xylophone') return (p.state as { hits: number[] }).hits.slice(0, 4).map((at, i) => event(at, 3 - i, .85))
  if (kind === 'timpani') return [event(p.lane.segs[0].dur + p.lane.segs[1].dur)]
  if (kind === 'musicbox') {
    const pace = 1.25, up = .3, past = .09
    const top = up + (Math.PI / 2 - pace * up / 2) / pace
    const stop = 2 * past / pace
    const turned = (t: number) => t < up ? pace * t * t / (2 * up) : t < top ? pace * up / 2 + pace * (t - up) : Math.PI / 2 + past * (2 * Math.min(1, (t - top) / stop) - Math.min(1, (t - top) / stop) ** 2)
    return Array.from({ length: 11 }, (_, i) => Math.PI + Math.asin(.13) - (i + 1) * Math.PI / 6 - 42 * Math.PI / 180)
      .filter(a => a > 0 && a <= Math.PI / 2 + past).sort((a, b) => a - b).map((a, i) => {
        let lo = 0, hi = top + stop
        for (let j = 0; j < 40; j++) { const mid = (lo + hi) / 2; if (turned(mid) < a) lo = mid; else hi = mid }
        return event(p.lane.fire + hi, [0, 2, 4][i % 3], .8)
      })
  }
  // Triangle is struck on initial contact, before swinging free at lane.fire.
  return [event(p.lane.segs[0].dur)]
}

export class Miniature extends Show {
  readonly world: Universe
  constructor(piece: Piece<any>, placement: Placement<unknown>) {
    super('pocket-orchestra')
    const placed = { piece, ...placement, col: 0, row: 0, mirror: 1 as const, start: 0, span: laneTime(placement.lane), ballIn: { color: '#b9533e', ghost: false, id: 0 }, changes: [], points: 0 }
    const world = { name: 'pocket', label: 'Pocket Orchestra', note: '', themes: [theme], pieces: [piece], backdrops: ['plain' as const], tastes: { even: {} } }
    const bounds = { x0: -1, y0: -2, x1: 3, y1: 2 }
    this.world = { index: 0, seed: 'pocket', world, theme, taste: 'even', ballColor: '#b9533e', backdrop: 'plain', pieces: [placed], box: bounds, bounds, journey: placed.span }
  }
  override trailOff(): boolean { return true }
  override at(t: number): ShowPoint {
    const placed = this.world.pieces[0]
    const point = laneAt(placed.lane, t)
    const fade = Math.max(0, Math.min(1, t / .075, (placed.span - t) / .075))
    return { ...point, scale: fade, hidden: t < 0 || t > placed.span, placed, ball: placed.ballIn, universe: this.world, local: t, begin: 0 }
  }
}

const frames: Record<Voice, Instrument['frame']> = {
  triangle: { x: 0, y: -.1, w: 1.45, h: 1.45 }, musicbox: { x: .5, y: -.35, w: 2.4, h: 2.15 }, harp: { x: .5, y: -.45, w: 2.5, h: 2.3 },
  timpani: { x: .5, y: .46, w: 2.5, h: 2.55 }, keys: { x: .5, y: .12, w: 2.4, h: 1.8 }, xylophone: { x: .5, y: .5, w: 2.5, h: 2.4 },
}
export const instruments = Object.fromEntries(Object.entries(pieces).map(([name, piece], i) => {
  const kind = name as Voice
  const placement = piece.place({ rng: makeRng('pocket'), color: COLORS[i], theme, ball: { color: '#b9533e', ghost: false, id: 0 }, earned: 0, taste: { weights: {} }, fits: (_cells, exit) => kind !== 'timpani' || exit[1] === 0 })!
  const hits = contacts(kind, placement)
  return [name, { show: new Miniature(piece, placement), placement, contacts: hits, lead: hits[0].at, span: laneTime(placement.lane), frame: frames[kind] }]
})) as Record<Voice, Instrument>

export interface ScoreEvent { at: number; voice: Voice; degree: number; strength: number; slot: number }
export function scoreFor(take: Take): ScoreEvent[] {
  return take.slots.flatMap((note, slot) => {
    if (!note || note.kind === 'rest') return []
    const instrument = instruments[note.kind]
    return instrument.contacts.map(c => ({ at: slot * STEP + c.at - instrument.lead, voice: note.kind as Voice, degree: note.pitch + c.degree, strength: c.strength, slot }))
  }).sort((a, b) => a.at - b.at)
}
