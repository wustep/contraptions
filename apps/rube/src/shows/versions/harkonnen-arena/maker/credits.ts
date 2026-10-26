import type { TitleCard } from '../../../registry'
import { CHANI, FEYD, FREMEN, PAUL } from './cast'
import { M } from './music'
import { END } from './timeline'

/**
 * The end credits, over the evening after the storm and on into the quiet after the music: a card at a time, a line in
 * capitals for what they did, the names, and where it is owed, the fine print. Each comes up, holds, and goes as the next
 * comes; the last has gone before the end, and the desert is left to itself.
 *
 * The words are the page's (a show's canvas sets no type, `shows/stage.ts`): live they are set over the frame in the
 * page's own face, and only a saved video has them painted into its frames. They stand high in the frame, in the sky.
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
/** When the first card comes up: as the last chord dies. */
export const CREDITS_AT = M.end + 3.2

const script: Omit<Card, 'at'>[] = [
  { hold: 2.6, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.2,
    scale: 0.9,
    role: 'With',
    names: [
      ['Paul Atreides', 'the blue ball', PAUL],
      ['Chani', 'the red ball', CHANI],
      ['The Fremen', 'the dun balls', FREMEN],
      ['Feyd-Rautha', 'the white ball', FEYD],
    ],
  },
  {
    hold: 3.6,
    role: 'Music',
    names: ['Hans Zimmer'],
    notes: ['“Harkonnen Arena”, from Dune: Part Two (Original Motion Picture Soundtrack)', 'WaterTower Music (2024)'],
  },
  { hold: 3.2, role: 'After', names: ['Dune: Part Two'], notes: ['a film by Denis Villeneuve (2024), after the novel by Frank Herbert'] },
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

/** High and centred, in the evening sky. */
const AT: [number, number] = [0.5, 0.06]
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
      key: `maker-credits-${n}`,
      role: card.role,
      names: card.names,
      notes: card.notes,
      light,
      rise: (1 - ease(up)) * 0.8,
      at: AT,
      lift: LIFT,
      scale: card.scale,
      least: LEAST,
      shade: card.names.length > 1 ? 0.35 : 0.22,
    })
  })
  return out
}

/** For the check: the credits come after the last chord, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT > M.end && LAST_GONE <= END - 1.5
