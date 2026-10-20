import type { TitleCard } from '../../../registry'
import { ANTINOUS, CALYPSO, MAN, ODYSSEUS, PENELOPE, SUITOR, TELEMACHUS } from './cast'
import { AGAMEMNON } from './scenes/troy/host'
import { TROJAN } from './scenes/troy/crowd'
import { M } from './music'
import { END } from './voyage'

/**
 * The end credits, over the last of the music and on into the quiet after it, while the skiff goes out towards the
 * sun: a card at a time, a line in capitals for what they did, the names, and where it is owed, the fine print. Each
 * comes up, holds, and goes as the next comes; the last has gone before the end, and the sea is left to itself.
 *
 * The words are the page's (a show's canvas sets no type, `shows/stage.ts`): live they are set over the frame in the
 * page's own face, and only a saved video has them painted into its frames. They stand high in the frame, in the
 * evening sky over the harbour.
 */

export interface Card {
  /** Show time the card starts to come up. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  scale?: number
}

/** How long a card takes to come up, and to go; how much the next one overlaps its going. */
const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25
/** When the first card comes up: as the skiff's sail fills, in the last of the fade. */
export const CREDITS_AT = M.fade + 3.0

const script: Omit<Card, 'at'>[] = [
  { hold: 2.6, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 3.8,
    scale: 0.9,
    role: 'With',
    names: [
      ['Odysseus', 'the bronze ball', ODYSSEUS],
      ['Penelope', 'the red ball', PENELOPE],
      ['Telemachus', 'the small bronze one', TELEMACHUS],
      ['His men', 'the clay balls', MAN],
    ],
  },
  {
    hold: 3.8,
    scale: 0.9,
    role: 'And',
    names: [
      ['Agamemnon', 'the gold one', AGAMEMNON],
      ['Calypso', 'the sea-glass one', CALYPSO],
      ['Antinous', 'the dark slate one', ANTINOUS],
      ['The suitors', 'the slate balls', SUITOR],
      ['The Trojans', 'the terracotta', TROJAN],
    ],
  },
  {
    hold: 3.6,
    role: 'Music',
    names: ['Ludwig Göransson'],
    notes: ['“Odysseus”, from The Odyssey (Original Motion Picture Soundtrack)', 'Back Lot Music (2026)'],
  },
  { hold: 3.0, role: 'After', names: ['The Odyssey'], notes: ['a film by Christopher Nolan (2026), after Homer'] },
  { hold: 2.2, role: 'Drawn with', names: ['p5.js'] },
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

/** High and centred, in the sky over the harbour. */
const AT: [number, number] = [0.5, 0.05]
/**
 * On a phone held upright the stage shows sky over the 16:9 frame: the cards go up into it, clear of the picture. And a
 * floor on their type that keeps them read on a phone's small frame without growing them over the whole picture.
 */
const LIFT = 0.6
const LEAST = 4.5

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const clamp = (v: number) => Math.max(0, Math.min(1, v))

/** The cards up at `t`, for the page to set (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const up = clamp((t - card.at) / FORM)
    const down = clamp((t - (card.at + FORM + card.hold)) / (GO * 0.6))
    const light = ease(up) * (1 - down)
    if (light <= 0.001) return
    out.push({
      key: `nostos-credits-${n}`,
      role: card.role,
      names: card.names,
      notes: card.notes,
      light,
      rise: (1 - ease(up)) * 0.8,
      at: AT,
      lift: LIFT,
      scale: card.scale,
      least: LEAST,
      // The cast lists come down into the sunset's band, where gold is lost: cream there, over a little more of the dark.
      plain: card.names.length > 1,
      shade: card.names.length > 1 ? 0.4 : 0.25,
    })
  })
  return out
}

/** For the check: the credits come in the fade, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT > M.fade && LAST_GONE <= END - 1.5
