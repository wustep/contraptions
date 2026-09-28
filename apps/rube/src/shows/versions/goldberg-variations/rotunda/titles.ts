import type { TitleCard } from '../../../registry'
import { PERIOD, STARTS, VARIATIONS, wrap } from './music'

/**
 * The words over the stage. A show's canvas sets no type (`shows/stage.ts`), so the page sets these, over the frame,
 * from `titlesAt`: the title as the Aria begins, each variation's number for a few seconds as its lap starts (with
 * Bach's own heading for it where he gave it one), and the credits as the da capo goes out. They come round with the
 * loop.
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
  /** Shares of the 16:9 frame the card's top middle sits at. */
  place?: [number, number]
  /** Its type this many times its usual size. */
  scale?: number
}

const FORM = 1.6
const GO = 1.2

const caption = (n: number): Card => {
  const spec = VARIATIONS[n]
  const label = n === 0 ? 'Aria' : n === 31 ? 'Aria da Capo' : `Variatio ${n}`
  return {
    at: STARTS[n] + (n === 0 ? 12 : 2.4),
    hold: 3.4,
    names: [label],
    notes: n === 0 || n === 31 || !spec.name ? undefined : [spec.name],
    place: [0.5, 0.885],
    scale: 0.72,
  }
}

const CREDITS_AT = STARTS[31] + 96

export const CARDS: Card[] = [
  { at: 1.2, hold: 5.2, names: ['Goldberg Variations'], notes: ['Johann Sebastian Bach'], title: true, place: [0.5, 0.1] },
  ...VARIATIONS.map((v) => caption(v.n)),
  { at: CREDITS_AT, hold: 3.6, role: 'Directed by', names: ['Stephen Wu', 'Claude Sonnet 5.5'], notes: ['drawn with p5.js'], place: [0.5, 0.08] },
  {
    at: CREDITS_AT + FORM + 3.6 + GO - 0.3,
    hold: 4.6,
    role: 'Music',
    names: ['Johann Sebastian Bach'],
    notes: ['Goldberg Variations, BWV 988', 'Víkingur Ólafsson · Deutsche Grammophon, 2023', 'from the album’s own uploads on YouTube'],
    place: [0.5, 0.08],
  },
]

/** When the last card is gone: before the period comes round. */
export const LAST_GONE = (() => {
  const c = CARDS[CARDS.length - 1]
  return c.at + FORM + c.hold + GO
})()

const ease = (u: number): number => {
  const x = Math.max(0, Math.min(1, u))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

export function titlesAt(time: number): TitleCard[] {
  const now = wrap(time)
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
      key: `goldberg-${n}`,
      role: card.role,
      names: card.names,
      notes: card.notes,
      title: card.title,
      light,
      rise: (1 - up) * 1.1,
      at: card.place ?? [0.5, 0.08],
      scale: card.scale,
    })
  })
  return out
}

/** For the check: every card is up and gone within the period, and no two overlap. */
export const TITLES_OK =
  LAST_GONE < PERIOD - 20 && CARDS.every((c, i) => i === 0 || c.at >= CARDS[i - 1].at + FORM + CARDS[i - 1].hold + GO - 0.35)
