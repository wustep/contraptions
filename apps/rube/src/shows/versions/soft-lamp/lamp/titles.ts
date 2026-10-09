import type { TitleCard } from '../../../registry'
import { MUSIC_END, TRACKS, barTime } from './music'

/**
 * The words over the stage, set by the page (a show's canvas sets no type). The title over the first intro; each
 * track's name, small and brief, as it begins, as a radio says what it is playing; and the credits over the last
 * track's outro, while the ball sleeps in the cup. The title and the credits come over the room's widest frame, so they
 * stand on the dark wall right of the window, clear of its frame.
 */

export interface Card {
  at: number
  hold: number
  role?: string
  names: (string | [string, string])[]
  notes?: string[]
  title?: boolean
  /** Where its top middle sits, as shares of the frame. */
  pos: [number, number]
  scale?: number
}

const FORM = 1.8
const GO = 1.6

const last = TRACKS[TRACKS.length - 1]
/**
 * Where the credits stand in the room's wide frame: on the dark wall right of the fairy lights' last swag and the
 * clock, over the lamp's arm, short of the print.
 */
const CREDITS_AT: [number, number] = [0.785, 0.15]
const creditsFrom = barTime(last, last.exit) + 2

export const CARDS: Card[] = [
  { at: 2.6, hold: 5.2, names: ['Soft Lamp'], notes: ['Lofi Girl · Best of lofi hip hop 2021'], title: true, pos: [0.74, 0.13] },
  // Each track's name as it starts (the first after the title has gone).
  ...TRACKS.map((tr): Card => ({
    at: tr.n === 0 ? 11.2 : tr.from + 1.2,
    hold: 3.4,
    // As a stream's now-playing line: the track and its artists on one baseline, the artists in gold.
    names: [[tr.title, tr.artists]],
    pos: [0.5, 0.06],
    scale: 0.95,
  })),
  { at: creditsFrom, hold: 3.6, role: 'Directed by', names: ['Stephen Wu', 'Claude Opus 5.5'], notes: ['drawn with p5.js'], pos: CREDITS_AT },
  {
    at: creditsFrom + FORM + 3.6 + GO - 0.2,
    hold: 4.6,
    role: 'Music',
    names: ['Lofi Girl'],
    notes: ['Best of lofi hip hop 2021', `its first twelve tracks, ${TRACKS[0].title} to ${last.title}`],
    pos: CREDITS_AT,
  },
]

/** When the last card is gone. */
export const LAST_GONE = (() => {
  const c = CARDS[CARDS.length - 1]
  return c.at + FORM + c.hold + GO
})()

const ease = (u: number): number => {
  const x = Math.max(0, Math.min(1, u))
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

export function titlesAt(t: number): TitleCard[] {
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const since = t - card.at
    const end = card.at + FORM + card.hold
    if (since < 0 || t > end + GO) return
    const up = ease(since / FORM)
    const down = ease((t - end) / GO)
    const light = up * (1 - down)
    if (light <= 0.001) return
    out.push({
      key: `soft-lamp-${n}`,
      role: card.role,
      names: card.names,
      notes: card.notes,
      title: card.title,
      light,
      rise: (1 - up) * 0.9,
      at: card.pos,
      scale: card.scale,
    })
  })
  return out
}

/** For the check: no two cards up at once, and the last gone before the show ends. */
export const TITLES_OK = (duration: number): boolean =>
  LAST_GONE < duration && CARDS.every((c, i) => i === 0 || c.at >= CARDS[i - 1].at + FORM + CARDS[i - 1].hold + GO - 0.4) && MUSIC_END > 0
