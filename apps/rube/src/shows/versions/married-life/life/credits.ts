import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { DURATION } from './music'
import { CARL, ELLIE } from './worlds'

/**
 * The end credits: over the house as the piano plays its last phrases, a card at a time, set by the page
 * (`Performance.titles`), since a show's canvas sets no type. Each comes up high in the frame, holds, and goes as
 * the next comes; the last is gone before the end, so the film ends on the house alone.
 *
 * The canvas draws nothing for them: the camera has drawn back past the roof by then, so every card comes over the
 * evening sky above the house, and the words read there by themselves.
 */

export interface Card {
  /** Show time the card starts to come up. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  /** Its role and "as" lines in the card's cream, not gold (`TitleCard.plain`): over the dusk's still light sky. */
  plain?: boolean
}

const FORM = 1.3
const GO = 1.0
const OVERLAP = 0.25

/**
 * The credits start once he has sat down, the lamp is on and the lit room has had a phrase of the piano to itself,
 * and the camera has drawn back past the roof: the strongest note after it (232.745), so the first card forms over the
 * sky with the chimney well under its name. The cards are held a little shorter (about 4.8 s each, whole) so the last
 * is still gone by 256.9.
 */
export const CREDITS_AT = 232.745

const script: Omit<Card, 'at'>[] = [
  // The first two come up while the dusk is still light: their gold role and "as" lines were under WCAG's 4.5:1 for small
  // text against the sky behind them (3.8:1 at worst), so they are in the card's cream; by the third the sky is night.
  { hold: 2.3, role: 'Directed by', names: ['Claude Opus 5.5'], plain: true },
  {
    hold: 3.1,
    plain: true,
    role: 'With',
    names: [
      // Carl is square: the page's small bar in the disc's footprint.
      ['Carl Fredricksen', 'the blue square', `slab:${CARL}`],
      ['Ellie Fredricksen', 'the coral ball', ELLIE],
    ],
  },
  { hold: 3.25, role: 'Music', names: ['Michael Giacchino'], notes: ['“Married Life”', 'from Up (2009)'] },
  { hold: 2.95, role: 'After', names: ['Up'], notes: ['a film by Pete Docter, co-directed by Bob Peterson', 'Pixar Animation Studios (2009)'] },
  { hold: 2.05, role: 'Drawn with', names: ['p5.js'] },
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
export const AT: [number, number] = [0.5, 0.045]
/** On a phone held upright the stage shows more sky over the house: the cards go up into it. */
export const LIFT = 0.62
/**
 * Where the cards lie, as shares of the 16:9 frame from its top middle: the widest card's half-width and the lowest
 * card's foot. The set puts out any star there while they are up (a star under a letter read as a mark in it).
 */
export const CARD_ZONE = { half: 0.2, foot: AT[1] + 0.19 }

function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp(since / FORM)
  const down = clamp((t - out) / GO)
  return { light: easeInOutCubic(up) * (1 - easeInOutCubic(down)), rise: (1 - easeInOutCubic(up)) * 0.8 }
}

/**
 * The least unit of the cards' type, in pixels: on a phone held upright the frame is about 220px high, and at a
 * hundredth of it the roles were 4px and the cast's lines 9; at this they read (a role 8.6px, a name 25), and the
 * widest card, the cast, is still under three quarters of the screen. On any larger stage it does nothing.
 */
const LEAST = 4.5

/** The cards up at `t`, for the page to set (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `married-life-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT, lift: LIFT, least: LEAST, plain: card.plain })
  })
  return out
}

/** For the check: the credits start after he has sat down, and the last card is gone before the end. */
export const CREDITS_OK = CREDITS_AT >= 220 && LAST_GONE <= DURATION - 1
