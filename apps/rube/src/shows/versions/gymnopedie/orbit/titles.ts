import type { TitleCard } from '../../../registry'
import { PERIOD, PIECES, wrap } from './music'

/**
 * The words over the stage. A show's canvas sets no type (`shows/stage.ts`), so
 * the page sets these, over the frame, from `titlesAt`. They come round with
 * the loop: the credits as the planet draws away at the end of the period,
 * the title as the Gymnopédie's first bars begin again over the whole planet,
 * and each Gnossienne's name in the wide shot between the pieces.
 */

export interface Card {
  /** Show time it starts to come up. */
  at: number
  /** Seconds it stays whole. */
  hold: number
  role?: string
  names: string[]
  notes?: string[]
  title?: boolean
}

const FORM = 1.6
const GO = 1.2

const [, GN1, GN3] = PIECES

export const CARDS: Card[] = [
  { at: 1.2, hold: 4.4, names: ['Gymnopédie'], notes: ['Erik Satie'], title: true },
  { at: GN1.from - 3.6, hold: 3.2, names: ['Gnossienne No. 1'], notes: ['Lent'] },
  { at: GN3.from - 3.6, hold: 3.2, names: ['Gnossienne No. 3'], notes: ['Lent'] },
  { at: GN3.last - 5.2, hold: 2.6, role: 'Directed by', names: ['Stephen Wu', 'Claude Opus 5.5'], notes: ['drawn with p5.js'] },
  {
    at: GN3.last - 5.2 + FORM + 2.6 + GO - 0.3,
    hold: 2.4,
    role: 'Music',
    names: ['Erik Satie'],
    notes: ['Gymnopédie No. 1 · Gnossiennes Nos. 1 and 3', 'from the Mutopia Project’s engravings', 'played on the Salamander Grand Piano (Alexander Holm, CC BY 3.0)'],
  },
]

/** When the last card is gone: before the period comes round, so the title comes up on a clear sky. */
export const LAST_GONE = (() => {
  const c = CARDS[CARDS.length - 1]
  return c.at + FORM + c.hold + GO
})()

const ease = (u: number): number => {
  const x = Math.max(0, Math.min(1, u))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

export function titlesAt(t: number): TitleCard[] {
  const now = wrap(t)
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const since = now - card.at
    const end = card.at + FORM + card.hold
    if (since < 0 || now > end + GO) return
    const up = ease(since / FORM)
    const down = ease((now - end) / GO)
    const light = up * (1 - down)
    if (light <= 0.001) return
    out.push({
      key: `gymnopedie-${n}`,
      role: card.role,
      names: card.names,
      notes: card.notes,
      title: card.title,
      light,
      rise: (1 - up) * 1.1,
      at: card.title ? [0.5, 0.12] : [0.5, 0.08],
    })
  })
  return out
}

/** For the check: every card is up and gone within the period, and none overlaps another. */
export const TITLES_OK = LAST_GONE < PERIOD && CARDS.every((c, i) => i === 0 || c.at >= CARDS[i - 1].at + FORM + CARDS[i - 1].hold + GO - 0.35)
