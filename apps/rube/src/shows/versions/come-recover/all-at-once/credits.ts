import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery } from './kit'
import { CREDITS_AT, DURATION, HOME_HITS } from './music'
import { EVELYN, JOY, WAYMOND } from './worlds'

/**
 * The end credits. The last hit has put the laundromat's lights out, and the family rest in the dark by the glow of
 * a washer's window while the quiet end of the cue plays on. Over the dark the credits come, a card at a time: a
 * line in capitals for what they did, the names, and where it is owed the fine print. Each comes into focus, holds,
 * and goes out of focus as the next comes.
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
  { hold: 2.6, role: 'Directed by', names: ['Stephen Wu'] },
  { hold: 2.6, role: 'Machines, drawings and code', names: ['Claude Opus 5.5'] },
  {
    hold: 3.6,
    role: 'With',
    names: [
      ['Evelyn', 'the vermilion ball', EVELYN],
      ['Joy', 'the violet ball', JOY],
      ['Waymond', 'the jade ball', WAYMOND],
    ],
  },
  {
    hold: 3.8,
    role: 'Music',
    names: ['Son Lux'],
    notes: ['“Come Recover (Empathy Fight)”', 'Ryan Lott, Rafiq Bhatia and Ian Chang'],
  },
  {
    hold: 3.4,
    role: 'After',
    names: ['Everything Everywhere All at Once'],
    notes: ['a film by Daniels (2022)'],
  },
  { hold: 2.4, role: 'Drawn with', names: ['p5.js'] },
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

/** When the last card has gone: after it the room holds in the dark to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: high in the middle, over the dark. */
const AT: [number, number] = [0.5, 0.12]

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
    out.push({ key: `all-at-once-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: AT })
  })
  return out
}

/** How dark the bed under the words is at `t`: up with the first card, down after the last. */
const bedAt = (t: number): number => clamp((t - CREDITS_AT + 0.4) / 1.6) * (1 - clamp((t - LAST_GONE + 0.4) / 1.8))

/** The canvas's half: a soft dark where the words come, over everything in the room. */
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
    g.addColorStop(0, `rgba(8, 10, 12, ${0.55 * bed})`)
    g.addColorStop(0.6, `rgba(8, 10, 12, ${0.3 * bed})`)
    g.addColorStop(1, 'rgba(8, 10, 12, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
    ctx.restore()
  },
})

/** For the check: the credits come after the last hit, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT >= HOME_HITS[2] + 1.5 && LAST_GONE <= DURATION - 2
