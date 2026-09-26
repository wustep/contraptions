import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery } from './kit'
import { CREDITS_AT, DURATION, LAST, QUIET } from './music'
import { LOFT, SPARK } from './worlds'

/**
 * The end credits. The spark is home on its wick, the stove door has banged shut, the cat has looked, seen a candle
 * burning as a candle should, and gone back to sleep. Over the dark loft, in the silence after the music, the credits
 * come a card at a time: a line in capitals for what they did, the names, and where it is owed the fine print. Each
 * comes into focus, holds, and goes out of focus as the next comes.
 *
 * The words are the page's: a show's canvas sets no type, and a saved frame or a recorded video has none
 * (`shows/stage.ts`), so the player sets them over the frame from `creditsAt` in its own face. The canvas's half is
 * only a soft dark under them, so they read whatever the room is doing.
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

/** A card coming up, going, and how much one card's going overlaps the next's coming. */
const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25

const script: Omit<Card, 'at'>[] = [
  { hold: 3.0, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 3.8,
    role: 'With',
    names: [
      ['Spark', "the candle's flame", SPARK],
      ['The cat', 'asleep by the stove', `slab:${LOFT.cat}`],
    ],
  },
  {
    hold: 4.4,
    role: 'Music',
    names: ['Edvard Grieg'],
    notes: ['“In the Hall of the Mountain King”, Peer Gynt Suite No. 1', 'played by the Czech National Symphony Orchestra for Musopen, in the public domain'],
  },
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

/** When the last card has gone: after it the loft holds in the dark to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: high in the middle, in the dark of the roof over the candle. */
const AT: [number, number] = [0.5, 0.09]

/** How far up a card is at `t` (0..1), and how far it still has to settle (hundredths of the frame). */
function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp(since / FORM)
  const down = clamp((t - out) / (GO * 0.6))
  return { light: easeInOutCubic(up) * (1 - down), rise: (1 - easeInOutCubic(up)) * 0.8 }
}

/** The cards up at `t`, for the page to set (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `spark-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT })
  })
  return out
}

/** How dark the bed under the words is at `t`: up with the first card, down after the last. */
const bedAt = (t: number): number => clamp((t - CREDITS_AT + 0.4) / 1.6) * (1 - clamp((t - LAST_GONE + 0.4) / 1.8))

/**
 * The canvas's half: a soft dark across the top of the frame where the words come, gone well above the candle, so the
 * words read over the roof and the candle keeps all its light.
 */
export const credits = scenery<null>({
  name: 'credits',
  draw: () => {},
  over: (p, _s, c) => {
    const bed = bedAt(c.t)
    if (bed <= 0.001) return
    const { k } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const h = f.y1 - f.y0
    const g = ctx.createLinearGradient(0, f.y0 * k, 0, (f.y0 + h * 0.3) * k)
    g.addColorStop(0, `rgba(8, 7, 10, ${0.5 * bed})`)
    g.addColorStop(0.55, `rgba(8, 7, 10, ${0.3 * bed})`)
    g.addColorStop(1, 'rgba(8, 7, 10, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, h * 0.3 * k)
    ctx.restore()
  },
})

/** For the check: the credits come after the last chord has died away, and the last card has gone before the end. */
export const CREDITS_OK = CREDITS_AT >= Math.max(LAST[1] + 2, QUIET) && LAST_GONE <= DURATION - 1.5
