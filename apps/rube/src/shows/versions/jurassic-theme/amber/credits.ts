import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { DAWN, DURATION, LAST } from './music'
import { ELLIE, GRANT } from './worlds'

/**
 * The end credits. The helicopter has gone out over the sea and the cue has faded; the sky holds, and in that quiet
 * the credits come, a card at a time. The words are the page's. Over the pale dawn they are set dark, so they read.
 */

export interface Card {
  at: number
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  place?: [number, number]
}

const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25

/** After the fade, with a breath of sky before the first card. */
export const CREDITS_AT = Math.max(LAST + 2.4, DAWN + 26)

const script: Omit<Card, 'at'>[] = [
  { hold: 3.2, role: 'Directed by', names: ['Grok 4.7'], notes: ['Machines, drawings and code'] },
  {
    hold: 4.8,
    role: 'With',
    place: [0.5, 0.3],
    names: [
      ['Grant', 'the sandstone ball', GRANT],
      ['Ellie', 'the green ball', ELLIE],
    ],
  },
  {
    hold: 4.4,
    role: 'Music',
    names: ['John Williams'],
    notes: ['“Theme from Jurassic Park”, 1993'],
  },
  {
    hold: 4.0,
    role: 'After',
    names: ['Jurassic Park'],
    notes: ['a film by Steven Spielberg (1993)'],
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

export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

const AT: [number, number] = [0.5, 0.34]

function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp(since / FORM)
  const down = clamp((t - out) / (GO * 0.6))
  return { light: easeInOutCubic(up) * (1 - down), rise: (1 - easeInOutCubic(up)) * 0.8 }
}

export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({
      key: `amber-credits-${n}`,
      role: card.role,
      names: card.names,
      notes: card.notes,
      light,
      rise,
      at: card.place ?? AT,
      dark: true,
    })
  })
  return out
}

/** The credits come after the fade, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT >= LAST + 1.5 && LAST_GONE <= DURATION - 2
