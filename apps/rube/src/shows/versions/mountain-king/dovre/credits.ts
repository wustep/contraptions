import type { TitleCard } from '../../../registry'
import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import { END, LAST2 } from './music'
import { PEER, TROLL, WOMAN } from './worlds'

/**
 * The end credits: once he has come to rest in the hollow and the last chord has rung out, over the dawn, a card at a time, set by the page
 * (`Performance.titles`), since a show's canvas sets no type. They come up high in the frame, over the sky, a size up
 * and in cream (amber on the pale sky read weakly); on a tall phone they go up into the sky over the 16:9 box. The
 * last is gone before the end.
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

const FORM = 0.9
const GO = 0.7
const OVERLAP = 0.3

/**
 * The last chords are seen close (he lands and bounces in a frame of the shoulder, the church and the sun), held while
 * the last chord rings out (151.3) and he lies still in the hollow; then the camera cranes up and back (`fall.ts`)
 * and the credits come up with it, into the deep blue the crane raises over the frame (at the close frame's top the
 * sky is the pale warm band, where cream words read weakly).
 */
export const CRANE = END + 1.1
export const CREDITS_AT = CRANE + 0.2
/** A size up from the page's usual, and how far into a tall stage's extra sky they go. */
const SCALE = 1.3
const LIFT = 0.62

const script: Omit<Card, 'at'>[] = [
  { hold: 1.8, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 3.2,
    role: 'With',
    names: [
      ['Peer Gynt', 'the red ball', PEER],
      ['The Woman in Green', 'the green ball', WOMAN],
      ['The Mountain King', 'and his trolls', `slab:${TROLL.hide}`],
      // Ibsen's "bridal steed": the way they reach the hall, on screen for the first twenty seconds.
      ['The great pig', 'her bridal steed', `slab:${TROLL.old}`],
    ],
  },
  { hold: 1.6, role: 'After', names: ['Henrik Ibsen'], notes: ['Peer Gynt (1867), Act Two'] },
  {
    hold: 2.8,
    role: 'Music',
    names: ['Edvard Grieg'],
    notes: ['“In the Hall of the Mountain King”, from Peer Gynt', 'Czech National Symphony Orchestra, for Musopen · public domain'],
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

/** When the last card has gone. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** The show's length: the recording's last chord, its ring, and the credits over the dawn after it. */
export const DURATION = Math.ceil(LAST_GONE + 1.0 - 1e-6)

/** Where a card's top middle sits, as shares of the 16:9 frame: the middle, high, over the sky. */
const AT: [number, number] = [0.5, 0.07]

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
    out.push({ key: `mountain-king-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT, lift: LIFT, scale: SCALE, plain: true })
  })
  return out
}

/** For the check: the credits start after the last chord has rung out, and the last is gone before the end. */
export const CREDITS_OK = CREDITS_AT > LAST2 + 1 && LAST_GONE <= DURATION - 1
