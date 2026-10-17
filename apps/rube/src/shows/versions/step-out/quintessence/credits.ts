import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { CREDITS_AT, DURATION, LAST } from './music'
import { CHERYL, SEAN, WALTER_WARM } from './worlds'

/**
 * The end credits. The band has dropped away and the last chord is ringing out; the street holds in the morning, the
 * newsstand with the last issue on it, and Walter and Cheryl gone on up the street together; over it the credits
 * come, a card at a time: a line in capitals for what they did, the names, and where it is owed the fine print. Each
 * comes up, holds, and goes as the next comes, and the last goes in the quiet after the song.
 *
 * The words are the page's: a show's canvas sets no type, and a saved frame or a recorded video has none
 * (`shows/stage.ts`), so the player sets them over the frame from `creditsAt` in its own face. Over the pale morning
 * the page's usual cream all but vanished, so they are set dark (`TitleCard.dark`): graphite, the street's own ink.
 * The canvas lays nothing under them: the street is calm enough behind them to read them over a front or the sky.
 */

export interface Card {
  /** Show time the card starts to come up. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  /** Where this card's top middle sits, if not at `AT`. */
  place?: [number, number]
}

const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25

const script: Omit<Card, 'at'>[] = [
  { hold: 3.4, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 5.0,
    role: 'With',
    names: [
      ['Walter Mitty', 'the slate ball, then the red', WALTER_WARM],
      ['Cheryl Melhoff', 'the marigold ball', CHERYL],
      ["Sean O'Connell", 'the khaki ball', SEAN],
    ],
  },
  {
    hold: 4.8,
    role: 'Music',
    names: ['José González'],
    notes: ['“Step Out”, written by Theodore Shapiro and Craig Wedren', 'Republic Records (2013)'],
  },
  {
    hold: 4.4,
    role: 'After',
    names: ['The Secret Life of Walter Mitty'],
    notes: ['a film by Ben Stiller (2013)'],
  },
  { hold: 2.6, role: 'Drawn with', names: ['p5.js'] },
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

/** When the last card has gone: after it the room holds to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: high and centred, over the sky. */
const AT: [number, number] = [0.5, 0.1]
/** The least the cards' unit may be on the page, CSS pixels: so a phone held upright still reads the role and the notes. */
const LEAST = 4.5

function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp(since / FORM)
  const down = clamp((t - out) / (GO * 0.6))
  return { light: easeInOutCubic(up) * (1 - down), rise: (1 - easeInOutCubic(up)) * 0.8 }
}

/** The cards up at `t`, for the page to set (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `quintessence-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: card.place ?? AT, dark: true, least: LEAST })
  })
  return out
}

/** For the check: the credits come after the last chord, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT >= LAST + 2 && LAST_GONE <= DURATION - 2
