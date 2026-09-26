import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery } from './kit'
import { DURATION } from './music'
import { CARL, ELLIE } from './worlds'

/**
 * The end credits: over the house as the piano plays its last phrases, a card at a time, set by the page
 * (`Performance.titles`), since a show's canvas sets no type. Each comes up high in the frame, holds, and goes as
 * the next comes; the last is gone before the end, so the film ends on the house alone.
 *
 * The canvas's half is only a soft dark under the words (`credits`, below), so they read over the dusk.
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

const FORM = 1.3
const GO = 1.0
const OVERLAP = 0.25

/** The credits start once he has sat down in his chair: a note of the piano's last phrases. */
export const CREDITS_AT = 226.197

const script: Omit<Card, 'at'>[] = [
  { hold: 3.2, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.2,
    role: 'With',
    names: [
      // Carl is square: the page's small bar in the disc's footprint.
      ['Carl', 'the blue square', `slab:${CARL}`],
      ['Ellie', 'the coral ball', ELLIE],
    ],
  },
  { hold: 4.4, role: 'Music', names: ['Michael Giacchino'], notes: ['“Married Life”', 'from Up (2009)'] },
  { hold: 4.0, role: 'After', names: ['Up'], notes: ['a film by Pete Docter, co-directed by Bob Peterson', 'Pixar Animation Studios (2009)'] },
  { hold: 2.8, role: 'Drawn with', names: ['p5.js'] },
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

/** When the last card has gone: after it the house holds alone to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: high in the middle, over the sky. */
const AT: [number, number] = [0.5, 0.1]

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
    out.push({ key: `married-life-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT })
  })
  return out
}

/**
 * How dark the bed under the words is at `t`: up with the first card, down after the last. The first cards come over
 * the lit house front and want it; by the third the camera has pulled back and night has fallen, and the words stand
 * on the dark sky by themselves, so it thins to a breath there instead of lying on the sky as a smudge.
 */
const NIGHT = 237
const bedAt = (t: number): number =>
  clamp((t - CREDITS_AT + 0.4) / 1.6) * (1 - clamp((t - LAST_GONE + 0.4) / 1.8)) * (1 - 0.75 * easeInOutCubic(clamp((t - (NIGHT - 5)) / 5)))

/** The canvas's half: a soft dark where the words come, over everything. */
export const credits = scenery<null>({
  name: 'credits',
  draw: () => {},
  over: (p, _s, c) => {
    const bed = bedAt(c.t)
    if (bed <= 0.001) return
    const { k } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const w = f.x1 - f.x0
    const h = f.y1 - f.y0
    const cx = (f.x0 + w * AT[0]) * k
    const cy = (f.y0 + h * (AT[1] + 0.13)) * k
    const rx = w * 0.36 * k
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.42)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, `rgba(20, 18, 24, ${0.42 * bed})`)
    g.addColorStop(0.6, `rgba(20, 18, 24, ${0.22 * bed})`)
    g.addColorStop(1, 'rgba(20, 18, 24, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
    ctx.restore()
  },
})

/** For the check: the credits start after he has sat down, and the last card is gone before the end. */
export const CREDITS_OK = CREDITS_AT >= 220 && LAST_GONE <= DURATION - 1
