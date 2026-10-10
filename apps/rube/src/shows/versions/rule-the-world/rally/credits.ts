import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery } from './kit'
import { AUDIBLE, CREDITS_AT, DURATION } from './music'
import { MARTY, RACHEL } from './worlds'

/**
 * The end credits, which in the film run on this very song. The guitar is playing out into the fade; the ward holds
 * in the first light, Rachel asleep, and Marty at the nursery's glass with his son on the other side of it; over it the
 * credits come, a card at a time: a line in capitals for what they did, the names, and where it is owed the fine
 * print. Each comes up, holds, and goes as the next comes, and the last goes in the quiet after the song.
 *
 * The words are the page's: a show's canvas sets no type, and a saved frame or a recorded video has none
 * (`shows/stage.ts`), so the player sets them over the frame from `creditsAt` in its own face. The canvas's half is
 * the hall's light going down round the nursery's lit window, so they read over the pale ward.
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
  { hold: 3.2, role: 'Directed by', names: ['Claude Opus 5.5'] },
  {
    hold: 4.6,
    role: 'With',
    names: [
      ['Marty Mauser', 'the orange ball', MARTY],
      ['Rachel Mizler', 'the teal ball', RACHEL],
      ['Their son', 'the little orange one', MARTY],
    ],
  },
  {
    hold: 4.6,
    role: 'Music',
    names: ['Tears for Fears'],
    notes: ['“Everybody Wants to Rule the World”, written by Roland Orzabal, Ian Stanley and Chris Hughes', 'Mercury Records (1985)'],
  },
  {
    hold: 4.2,
    role: 'After',
    names: ['Marty Supreme'],
    notes: ['a film by Josh Safdie (2025)'],
  },
  { hold: 3.0, role: 'Drawn with', names: ['p5.js'] },
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

/** Where a card's top middle sits, as shares of the 16:9 frame: high and centred, over the ward's pale wall. */
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
    out.push({ key: `rally-credits-${n}`, role: card.role, names: card.names, notes: card.notes, light, rise, at: card.place ?? AT })
  })
  return out
}

/** How far the hall's light is down at `t`: going down with the first card, and staying down to the end. */
const bedAt = (t: number): number => easeInOutCubic(clamp((t - CREDITS_AT + 1.2) / 3.2))

/** The shade under the words: up with the hall's going down, and gone with the last card, so no smudge is left. */
const shadeAt = (t: number): number => bedAt(t) * (1 - easeInOutCubic(clamp((t - (LAST_GONE - GO - 0.2)) / 1.4)))

/** The canvas's half: the hall's light going down, and a soft shade where the words come. */
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
    // The corridor's light goes down as the credits come, and the nursery's window (low in the middle of the last
    // picture) stays lit: the words come up on the dark of the hall, over the glow of the glass.
    const wx = (bx + w * 0.5) * k
    const wy = (by + h * 0.64) * k
    const hall = ctx.createRadialGradient(wx, wy, w * 0.15 * k, wx, wy, w * 0.78 * k)
    hall.addColorStop(0, 'rgba(22, 20, 17, 0)')
    hall.addColorStop(0.42, `rgba(22, 20, 17, ${0.52 * bed})`)
    hall.addColorStop(1, `rgba(22, 20, 17, ${0.78 * bed})`)
    ctx.save()
    ctx.fillStyle = hall
    // Over the whole frame, which may see more than the 16:9 the words are placed in.
    ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    ctx.restore()
    // And more shade right under the words, while there are words: the fine print is small, and set in the page's amber.
    const shade = shadeAt(c.t)
    if (shade <= 0.001) return
    const cx = (bx + w * AT[0]) * k
    const cy = (by + h * (AT[1] + 0.07)) * k
    const rx = w * 0.44 * k
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.42)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    g.addColorStop(0, `rgba(22, 20, 17, ${0.5 * shade})`)
    g.addColorStop(0.55, `rgba(22, 20, 17, ${0.22 * shade})`)
    g.addColorStop(1, 'rgba(22, 20, 17, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
    ctx.restore()
  },
})

/** For the check: the credits come in the song's outro, and the last has gone after the fade and before the end. */
export const CREDITS_OK = CREDITS_AT < AUDIBLE && LAST_GONE > AUDIBLE && LAST_GONE <= DURATION - 2
