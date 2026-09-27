import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery } from './kit'
import { CREDITS_AT, DURATION, LAST } from './music'
import { ARIADNE, COBB, FISCHER, KIDS, MAL } from './worlds'

/**
 * The end credits. The top is still turning when the picture cuts to black on the last chord, as the film does; the
 * chord rings away in the dark, and in the silence after it the credits come, a card at a time: a line in capitals
 * for what they did, the names, and where it is owed the fine print. Each comes up, holds, and goes as the next comes.
 *
 * The words are the page's: a show's canvas sets no type, and a saved frame or a recorded video has none
 * (`shows/stage.ts`), so the player sets them over the frame from `creditsAt` in its own face, and a saved video has
 * the same cards painted into its frame. The canvas's half is the dark (`black`): nothing under the words.
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
  { hold: 3.0, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 5.0,
    role: 'With',
    place: [0.5, 0.3],
    names: [
      ['Dom Cobb', 'the orange ball', COBB],
      ['Mal', 'the wine ball', MAL],
      ['Ariadne', 'the teal ball', ARIADNE],
      ['Robert Fischer', 'the pale ball', FISCHER],
      ['James and Phillipa', 'the two small balls', KIDS[0]],
    ],
  },
  {
    hold: 4.4,
    role: 'Music',
    names: ['Hans Zimmer'],
    notes: ['“Time”, from Inception (Music From the Motion Picture), 2010'],
  },
  {
    hold: 4.0,
    role: 'After',
    names: ['Inception'],
    notes: ['a film by Christopher Nolan (2010)'],
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

/** When the last card has gone: after it the dark holds to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: a little over the middle of the dark. */
const AT: [number, number] = [0.5, 0.36]

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
    out.push({ key: `kick-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: card.place ?? AT })
  })
  return out
}

/**
 * The cut to black on the last chord (the director's): from `LAST` the whole frame is black, at once, as the film cuts
 * away from the top. Drawn over everything, in every world it could be seen in.
 */
export const blackAt = (t: number): number => (t >= LAST ? 1 : 0)
export const black = scenery<null>({
  name: 'black',
  draw: () => {},
  over: (p, _s, c) => {
    if (blackAt(c.t) <= 0) return
    const f = frame(p, c.k)
    p.push()
    p.noStroke()
    p.rectMode(p.CORNER)
    p.fill(0)
    p.rect((f.x0 - 1) * c.k, (f.y0 - 1) * c.k, (f.x1 - f.x0 + 2) * c.k, (f.y1 - f.y0 + 2) * c.k)
    p.pop()
  },
})

/** For the check: the credits come after the last chord has rung away, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT >= LAST + 1.5 && LAST_GONE <= DURATION - 2
