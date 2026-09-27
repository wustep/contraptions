import type { TitleCard } from '../../../registry'
import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import { LAST } from './music'
import { REST } from './finale'
import { BALL, DRUM_RED } from './look'

/**
 * The end credits: once the tower is down, the ball has come to rest on the drum and the last chord has rung, night
 * comes down over the ruins from the top of the sky (`base.ts` `dusk`), and the cards come up in it, a card at a
 * time, set by the page (`Performance.titles`), since a show's canvas sets no type. The last is gone before the end.
 */

export interface Card {
  at: number
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
}

const FORM = 0.9
const GO = 0.7
const OVERLAP = 0.3

/** Night starts to come down once the ball is still; the first card comes up into it. */
export const DUSK = REST + 0.6
export const CREDITS_AT = DUSK + 1.6

const script: Omit<Card, 'at'>[] = [
  { hold: 1.8, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 2.8,
    role: 'With',
    names: [
      ['The ball', 'the blue ball', BALL],
      ['The side drum', 'and all it carries', `slab:${DRUM_RED}`],
    ],
  },
  {
    hold: 3.2,
    role: 'Music',
    names: ['Maurice Ravel'],
    notes: ['Boléro (1928)', 'played from the score by Omega13a in MuseScore 4 with Muse Sounds · CC BY 4.0'],
  },
  { hold: 1.4, role: 'Drawn with', names: ['p5.js'] },
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

export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** The show's length: the recording, the ball at rest, and the credits in the night after it. */
export const DURATION = Math.ceil(LAST_GONE + 1.2 - 1e-6)

/** Where a card's top middle sits, as shares of the 16:9 frame: the middle, high, in the night sky. */
const AT: [number, number] = [0.5, 0.08]
const SCALE = 1.2
const LIFT = 0.6

function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp(since / FORM)
  const down = clamp((t - out) / GO)
  return { light: easeInOutCubic(up) * (1 - easeInOutCubic(down)), rise: (1 - easeInOutCubic(up)) * 0.8 }
}

export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `ostinato-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT, lift: LIFT, scale: SCALE, plain: true })
  })
  return out
}

/** For the check: the credits come after the last chord and the ball's rest, and the last is gone before the end. */
export const CREDITS_OK = CREDITS_AT > LAST + 2 && CREDITS_AT > REST && LAST_GONE <= DURATION - 1
