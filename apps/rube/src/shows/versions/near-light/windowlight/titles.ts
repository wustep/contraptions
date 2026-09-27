import type { TitleCard } from '../../../registry'
import { PERIOD, wrap } from './music'

/**
 * The words over the stage. A show's canvas sets no type (`shows/stage.ts`), so the page sets these, over the frame,
 * from `titlesAt`. They come round with the loop: the title over the whole window as the first chords begin, and the
 * credits while the ball goes round the lamp at the end, gone before the camera has drawn back to the window.
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

export const CARDS: Card[] = [
  { at: 0.8, hold: 4.2, names: ['Windowlight'], notes: ['Near Light · Ólafur Arnalds'], title: true },
  { at: 184.6, hold: 3.2, role: 'Directed by', names: ['Stephen Wu', 'Claude Opus 5.5'], notes: ['drawn with p5.js'] },
  {
    at: 191.2,
    hold: 3.6,
    role: 'Music',
    names: ['Ólafur Arnalds'],
    notes: ['Near Light', 'from Living Room Songs (Erased Tapes, 2011)'],
  },
]

/** When the last card is gone: before the period comes round, so the title comes up on a clear frame. */
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
      key: `windowlight-${n}`,
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
