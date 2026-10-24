import type { TitleCard } from '../../../registry'
import { CHANI, FREMEN, JAMIS, JESSICA, LETO, MOTHER, PAUL, BARON, STILGAR } from './cast'

/**
 * The end credits, as the last blow dies away and on into the quiet after the music, while the Fremen go on into the
 * desert: a card at a time, high in the morning sky. Each comes up, holds, and goes as the next comes up; the last has
 * gone before the end, and the desert is left to itself.
 *
 * The words are the page's (a show's canvas sets no type, `shows/stage.ts`): live they are set over the frame in the
 * page's own face, and only a saved video has them painted in. On a phone held upright they go up into the sky the tall
 * stage shows over the 16:9 frame (`lift`), at the house's least size (`least`), as the other shows' credits do.
 */

interface Card {
  /** Seconds it holds whole, once up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  scale?: number
}

const SCRIPT: Card[] = [
  { hold: 2.6, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.0,
    scale: 0.9,
    role: 'With',
    names: [
      ['Paul Atreides', 'the green ball', PAUL.color],
      ['Lady Jessica', 'the plum one', JESSICA.color],
      ['Duke Leto Atreides', 'the slate one', LETO.color],
      ['Chani', 'the henna one', CHANI.color],
    ],
  },
  {
    hold: 4.0,
    scale: 0.9,
    role: 'And',
    names: [
      ['The Reverend Mother', 'the black one', MOTHER.color],
      ['Baron Harkonnen', 'the pale one', BARON.color],
      ['Stilgar', 'the dark umber', STILGAR.color],
      ['Jamis', 'the darker umber', JAMIS.color],
      ['The Fremen', 'the umber balls', FREMEN.color],
    ],
  },
  {
    hold: 3.6,
    role: 'Music',
    names: ['Hans Zimmer'],
    notes: ['“Paul’s Dream”, from Dune (Original Motion Picture Soundtrack)', 'WaterTower Music (2021)'],
  },
  { hold: 3.2, role: 'After', names: ['Dune'], notes: ['a film by Denis Villeneuve (2021)', 'after the novel by Frank Herbert'] },
  { hold: 2.2, role: 'Drawn with', names: ['p5.js'] },
]

/** How long a card takes to come up and to go, and how much the next overlaps its going. */
const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25

/** The first card comes up as the last blow's long decay settles. */
export const CREDITS_AT = 403.5

export const CARDS = (() => {
  let at = CREDITS_AT
  return SCRIPT.map((c) => {
    const card = { ...c, at }
    at += FORM + c.hold + GO - OVERLAP
    return card
  })
})()

/** When the last card has gone. */
export const LAST_GONE = (() => {
  const c = CARDS[CARDS.length - 1]
  return c.at + FORM + c.hold + GO
})()

/** High in the middle of the sky; on a phone, up into the sky over the frame, at the house's least size. */
const AT: [number, number] = [0.5, 0.06]
const LIFT = 0.6
const LEAST = 4.5

const inOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const clamp = (v: number) => Math.max(0, Math.min(1, v))

/** The cards up at `t` (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const up = clamp((t - card.at) / FORM)
    const down = clamp((t - (card.at + FORM + card.hold)) / (GO * 0.6))
    const light = inOut(up) * (1 - down)
    if (light <= 0.001) return
    out.push({
      key: `sleeper-credits-${n}`,
      role: card.role,
      names: card.names,
      notes: card.notes,
      light,
      rise: (1 - inOut(up)) * 0.8,
      at: AT,
      lift: LIFT,
      scale: card.scale,
      least: LEAST,
      // The morning sky is pale: the words in graphite, so they are read over it.
      dark: true,
      shade: 0,
    })
  })
  return out
}
