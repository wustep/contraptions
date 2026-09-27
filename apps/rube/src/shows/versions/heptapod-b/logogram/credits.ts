import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery } from './kit'
import { CREDITS_AT, DURATION, FLUTTER } from './music'
import { HANNAH, IAN, LOUISE, SHELL } from './worlds'

/**
 * The end credits. The last flutter has rung away and the lake house is quiet, Louise and Hannah by the window; over
 * the room the credits come, a card at a time: a line in capitals for what they did, the names, and where it is owed
 * the fine print. Each comes up, holds, and goes as the next comes.
 *
 * The words are the page's: a show's canvas sets no type, and a saved frame or a recorded video has none
 * (`shows/stage.ts`), so the player sets them over the frame from `creditsAt` in its own face. The canvas's half is
 * only a soft shade under them, so they read over the bright window.
 */

export interface Card {
  /** Show time the card starts to come up. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  /** Where this card's top middle sits, if not at `AT`. */
  place?: [number, number]
}

const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25

const script: Omit<Card, 'at'>[] = [
  { hold: 3.0, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.6,
    role: 'With',
    place: [0.5, 0.075],
    names: [
      ['Louise Banks', 'the orange ball', LOUISE],
      ['Ian Donnelly', 'the blue ball', IAN],
      ['Hannah', 'the little peach ball', HANNAH],
      ['Abbott and Costello', 'heptapods', `slab:${SHELL.heptapod}`],
    ],
  },
  {
    hold: 4.2,
    role: 'Music',
    names: ['Jóhann Jóhannsson'],
    notes: ['“Heptapod B”, with Joan La Barbara', 'from Arrival (Original Motion Picture Soundtrack), Deutsche Grammophon (2016)'],
  },
  {
    hold: 4.0,
    role: 'After',
    names: ['Arrival'],
    notes: ['a film by Denis Villeneuve (2016)', 'from “Story of Your Life” by Ted Chiang'],
  },
  { hold: 2.6, role: 'Drawn with', names: ['p5.js'] },
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

/** When the last card has gone: after it the room holds to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: high and centred, over the window. */
const AT: [number, number] = [0.5, 0.1]

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
    out.push({ key: `logogram-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: card.place ?? AT })
  })
  return out
}

/** How deep the shade under the words is at `t`: up with the first card, down after the last. */
const bedAt = (t: number): number => clamp((t - CREDITS_AT + 0.4) / 1.6) * (1 - clamp((t - LAST_GONE + 0.4) / 1.8))

/** The canvas's half: a soft shade where the words come. */
export const credits = scenery<null>({
  name: 'credits',
  draw: () => {},
  over: (p, _s, c) => {
    const bed = bedAt(c.t)
    if (bed <= 0.001) return
    const { k } = c
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const w = Math.min(f.x1 - f.x0, ((f.y1 - f.y0) * 16) / 9)
    const h = (w * 9) / 16
    const bx = (f.x0 + f.x1) / 2 - w / 2
    const by = (f.y0 + f.y1) / 2 - h / 2
    const cx = (bx + w * AT[0]) * k
    const cy = (by + h * (AT[1] + 0.13)) * k
    const rx = w * 0.36 * k
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.42)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, `rgba(30, 36, 40, ${0.16 * bed})`)
    g.addColorStop(0.6, `rgba(30, 36, 40, ${0.07 * bed})`)
    g.addColorStop(1, 'rgba(30, 36, 40, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
    ctx.restore()
  },
})

/** For the check: the credits come after the last flutter, and the last has gone before the end. */
export const CREDITS_OK = CREDITS_AT >= FLUTTER + 1.5 && LAST_GONE <= DURATION - 2
