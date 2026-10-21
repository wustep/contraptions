import type { TitleCard } from '../../../registry'
import { clamp, easeInOut } from './brush'
import { DUSK } from './look'
import { FORM as MUSIC, RECORDING } from './music'

/**
 * The end credits: after the last chord, while the last drops still fall into the jar, the cards come up one at a
 * time in the night beside the cell's corner, set by the page (`Performance.titles`), since a show's canvas sets no
 * type. The last is gone before the end.
 */

export interface Card {
  at: number
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
}

const UP = 0.9
const GO = 0.8
const OVERLAP = 0.3

/** The first card comes up as the last chord dies away. */
export const CREDITS_AT = MUSIC.last + 2.4

const script: Omit<Card, 'at'>[] = [
  { hold: 1.9, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 3.4,
    role: 'With',
    names: [
      ['The ball', 'the red ball', DUSK.ball],
      ['George Sand', 'with the lantern'],
      ['Maurice', 'her son'],
      ['Frédéric Chopin', 'at the piano'],
    ],
  },
  {
    hold: 3.2,
    role: 'Music',
    names: ['Frédéric Chopin'],
    notes: ['Prelude in D-flat major, Op. 28 No. 15 (1838–39)', 'played by Ivan Ilić · CC BY 3.0'],
  },
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

/** The show's length: the recording, and the credits after the last chord, which may run past it. */
export const DURATION = Math.ceil(Math.max(RECORDING, LAST_GONE) + 1.0 - 1e-6)

/** Where a card's top middle sits, as shares of the 16:9 frame: in the night west of the cell, high. */
const AT: [number, number] = [0.2, 0.2]
/**
 * On a phone held upright the frame is about 220px high: a floor on the cards' unit keeps the role and the notes read
 * there without growing the names over the cell's window, and the cards go up into the night the tall stage shows
 * over the frame. On any larger stage neither does anything.
 */
const LEAST = 4.5
const LIFT = 0.6

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
    out.push({ key: `raindrop-${i}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT, lift: LIFT, scale: 0.9, least: LEAST })
  })
  return out
}

/** Whether every card is up and gone in the show's time. */
export const CREDITS_OK = LAST_GONE <= DURATION
