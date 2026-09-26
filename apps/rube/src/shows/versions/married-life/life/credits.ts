import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { DURATION } from './music'
import { CARL, ELLIE } from './worlds'

/**
 * The end credits: over the house as the piano plays its last phrases, a card at a time, set by the page
 * (`Performance.titles`), since a show's canvas sets no type. Each comes up high in the frame, holds, and goes as
 * the next comes; the last is gone before the end, so the film ends on the house alone.
 *
 * The canvas draws nothing for them: the camera has drawn back by then, so the first card comes over the house's upper
 * storey, the second over its roof, and the rest over the night sky, and the words read there by themselves.
 */

export interface Card {
  /** Show time the card starts to come up. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
}

const FORM = 1.3
const GO = 1.0
const OVERLAP = 0.25

/** The credits start once he has sat down in his chair: a note of the piano's last phrases. */
export const CREDITS_AT = 226.197

const script: Omit<Card, 'at'>[] = [
  { hold: 3.2, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.2,
    role: 'With',
    names: [
      // Carl is square: the page's small bar in the disc's footprint.
      ['Carl Fredricksen', 'the blue square', `slab:${CARL}`],
      ['Ellie Fredricksen', 'the coral ball', ELLIE],
    ],
  },
  { hold: 4.4, role: 'Music', names: ['Michael Giacchino'], notes: ['“Married Life”', 'from Up (2009)'] },
  { hold: 4.0, role: 'After', names: ['Up'], notes: ['a film by Pete Docter, co-directed by Bob Peterson', 'Pixar Animation Studios (2009)'] },
  { hold: 2.8, role: 'Drawn with', names: ['p5.js'] },
]

export const CARDS: Card[] = (() => {
  const out: Card[] = []
  let at = CREDITS_AT
  for (const c of script) {
    out.push({ ...c, at })
    at += FORM + c.hold + GO - OVERLAP
  }
  return out
})()

/** When the last card has gone: after it the house holds alone to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: high in the middle, over the sky. */
const AT: [number, number] = [0.5, 0.1]

function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp(since / FORM)
  const down = clamp((t - out) / GO)
  return { light: easeInOutCubic(up) * (1 - easeInOutCubic(down)), rise: (1 - easeInOutCubic(up)) * 0.8 }
}

/** The cards up at `t`, for the page to set (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `married-life-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT })
  })
  return out
}

/** For the check: the credits start after he has sat down, and the last card is gone before the end. */
export const CREDITS_OK = CREDITS_AT >= 220 && LAST_GONE <= DURATION - 1
