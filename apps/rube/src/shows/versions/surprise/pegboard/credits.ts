import type { TitleCard } from '../../../registry'
import { clamp, easeInOut } from './brush'
import { LAST, RECORDING } from './music'

/**
 * The end credits: once the last chord has died away, the cards come up one at a time under the board, beside the
 * launcher at rest, set by the page (`Performance.titles`), since a show's canvas sets no type. The last is gone
 * before the end.
 */

export interface Card {
  at: number
  hold: number
  role?: string
  names: string[]
  notes?: string[]
}

const UP = 0.9
const GO = 0.8
const OVERLAP = 0.3

/** The first card comes up as the last chord is gone. */
export const CREDITS_AT = LAST + 3.2

const script: Omit<Card, 'at'>[] = [
  { hold: 1.9, role: 'Directed by', names: ['Claude Opus 5.5'] },
  { hold: 2.8, role: 'Music', names: ['Joseph Haydn'], notes: ['Symphony No. 94 in G major, “Surprise”', 'II. Andante (1791)'] },
  { hold: 2.8, role: 'Played by', names: ['Berliner Philharmoniker'], notes: ['Herbert von Karajan', 'Deutsche Grammophon, 1982'] },
  { hold: 1.5, role: 'Drawn with', names: ['p5.js'] },
]

export const CARDS: Card[] = (() => {
  const out: Card[] = []
  let at = CREDITS_AT
  for (const c of script) {
    out.push({ ...c, at })
    at += UP + c.hold + GO - OVERLAP
  }
  return out
})()

export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + UP + last.hold + GO
})()

/** The show's length: the recording, and the credits after the last chord, which run past it. */
export const DURATION = Math.ceil(Math.max(RECORDING, LAST_GONE) + 1.0 - 1e-6)

/** Where a card's top middle sits, as shares of the 16:9 frame: under the board, left of the launcher. */
const AT: [number, number] = [0.25, 0.715]

function lightOf(card: Card, t: number): { light: number; rise: number } {
  const up = clamp((t - card.at) / UP)
  const down = clamp((t - (card.at + UP + card.hold)) / GO)
  return { light: easeInOut(up) * (1 - easeInOut(down)), rise: (1 - easeInOut(up)) * 0.8 }
}

export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, i) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0) return
    out.push({ key: `composure-${i}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT, scale: 0.62, least: 9, dark: true })
  })
  return out
}

/** Whether every card is up and gone in the show's time. */
export const CREDITS_OK = LAST_GONE <= DURATION
