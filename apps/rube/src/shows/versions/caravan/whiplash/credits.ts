import type { TitleCard } from '../../../registry'
import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import { DURATION, END, FINAL } from './music'
import { ANDREW, FLETCHER, JIM, TANNER } from './worlds'

/**
 * The end credits: after the fist, over the hall going dark, a card at a time, set by the page
 * (`Performance.titles`), since a show's canvas sets no type. The film ends on the cut-off; so does the music. The
 * cards come up in the silence after it, high in the frame over the arch, and the last is gone before the end.
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

/** The credits start once the last chord has rung out. */
export const CREDITS_AT = END + 1.0

const script: Omit<Card, 'at'>[] = [
  { hold: 3.2, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.6,
    role: 'With',
    names: [
      ['Andrew Neiman', 'the yellow ball', ANDREW],
      ['Terence Fletcher', 'the black ball', FLETCHER],
      ['Jim Neiman', 'the blue-grey ball', JIM],
      ['Carl Tanner', 'the olive ball', TANNER],
    ],
  },
  { hold: 4.6, role: 'Music', names: ['Juan Tizol, Duke Ellington and Irving Mills'], notes: ['“Caravan”, arranged by John Wasson', 'from the Whiplash soundtrack (2014), Lakeshore Records'] },
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

/** Where a card's top middle sits, as shares of the 16:9 frame: the middle, high, over the arch. */
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
    out.push({ key: `caravan-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT })
  })
  return out
}

/** For the check: the credits start after the final cut-off has rung out, and the last is gone before the end. */
export const CREDITS_OK = CREDITS_AT > FINAL + 0.5 && LAST_GONE <= DURATION - 1
