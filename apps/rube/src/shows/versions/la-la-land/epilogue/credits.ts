import type { TitleCard } from '../../../registry'
import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import { DURATION, LAST_CHORDS } from './music'

/**
 * The end credits: over the club as the last chords ring, a card at a time,
 * set by the page (`Performance.titles`), since a show's canvas sets no type.
 * Each card comes up out of the dark high in the frame, over the room's
 * ceiling, holds while a chord rings, and goes as the next chord comes. The
 * last card is gone before the last chord, so the film ends on the room
 * alone.
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
const OVERLAP = 0.2

/** The credits start on the second of the last chords. */
export const CREDITS_AT = LAST_CHORDS[1]

const script: Omit<Card, 'at'>[] = [
  { hold: 3.2, role: 'Directed by', names: ['Claude Fable 5.1'] },
  { hold: 3.4, role: 'Machines, drawings and code', names: ['Claude Fable 5.1'] },
  {
    hold: 4.2,
    role: 'With',
    names: [
      ['Sebastian', 'the blue ball', '#5B8DD6'],
      ['Mia', 'the yellow ball', '#F2C94C'],
      ['David', 'the grey ball', '#8C8F96'],
    ],
  },
  { hold: 4.6, role: 'Music', names: ['Justin Hurwitz'], notes: ['“Epilogue”', 'from La La Land (2016)'] },
  { hold: 3.0, role: 'Drawn with', names: ['p5.js'] },
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

/** When the last card has gone. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: the middle, high, over the room's ceiling. */
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
    out.push({ key: `epilogue-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT })
  })
  return out
}

/** For the check: the credits start on a chord after the music's drop, and the last is gone before the last chord. */
export const CREDITS_OK = CREDITS_AT > LAST_CHORDS[0] && LAST_GONE <= LAST_CHORDS[LAST_CHORDS.length - 1] - 1 && LAST_GONE < DURATION
