import { INK, PAPER } from './print'
import { clamp, easeInOutCubic } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { frame, scenery, smooth } from './kit'
import { DURATION, FINAL } from './music'
import { BALL, BRAND, MURPH } from './worlds'

/**
 * The end credits. The music has stopped, the lamp is lit, the camp holds at
 * dawn, and the camera goes on drawing back into the sky while the sun comes
 * up. In that sky the credits come, a card at a time. The stars nearest
 * drift together into a small bright cloud, and out of the cloud the card
 * comes into focus: a line in capitals for what they did, the names, and
 * where it is owed the fine print. When it has been read it goes out of
 * focus, and the stars drift apart again. After the last, the camp holds
 * alone at dawn to the end.
 *
 * Two halves. The words are the page's: a show's canvas sets no type
 * (`shows/stage.ts`), so the player sets them over the frame from `creditsAt`
 * in its own face, and a saved video has them painted in (`shows/words.ts`). The starlight
 * is the canvas's: this scenery, drawn over everything.
 */

export interface Card {
  /** Show time the stars start to gather. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
  title?: boolean
}

/** Stars gathering into a card, the card leaving, and how much one card's leaving overlaps the next's coming. */
const FORM = 1.4
const GO = 0.95
const OVERLAP = 0.25

/** The lamp is the last hit (FINAL); the music stops dead a few seconds after, and the porthole lights. Then the credits. */
export const CREDITS_AT = 261.4

const script: Omit<Card, 'at'>[] = [
  { hold: 3.0, role: 'Directed by', names: ['Stephen Wu', 'Codex Astra'] },
  { hold: 2.6, role: 'Machines, drawings and code', names: ['Claude Opus 5.5 · Codex Astra'] },
  {
    hold: 3.7,
    role: 'With',
    names: [
      ['Joseph Cooper', 'the sand ball', BALL],
      ['Dr. Amelia Brand', 'the blue ball', BRAND],
      ['Murph', 'the slate ball, young and old', MURPH],
      ['TARS', 'four slabs of steel', 'slab:#555A4D'],
    ],
  },
  {
    hold: 3.8,
    role: 'Music',
    names: ['Hans Zimmer'],
    notes: ['“Cornfield Chase” and “No Time for Caution”', 'from Interstellar (2014)'],
  },
  { hold: 2.3, role: 'Drawn with', names: ['p5.js'] },
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

/** When the last card has gone: after it the camp holds alone at dawn, the stars back where they were, to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** Where a card's top middle sits, as shares of the 16:9 frame: right of the middle (Gargantua hangs high on the left), high in the sky. */
const AT: [number, number] = [0.585, 0.105]
const TITLE_AT: [number, number] = [0.585, 0.13]

/** How far up a card is at `t` (0..1), and how far it still has to settle (hundredths of the frame). */
function lightOf(card: Card, t: number): { light: number; rise: number } {
  const since = t - card.at
  const out = card.at + FORM + card.hold
  const up = clamp((since - FORM * 0.5) / (FORM * 0.5))
  const down = clamp((t - out) / (GO * 0.55))
  return { light: easeInOutCubic(up) * (1 - down), rise: (1 - easeInOutCubic(up)) * 0.9 }
}

/** The cards up at `t`, for the page to set (`Performance.titles`). */
export function creditsAt(t: number): TitleCard[] {
  if (t < CREDITS_AT) return []
  const out: TitleCard[] = []
  CARDS.forEach((card, n) => {
    const { light, rise } = lightOf(card, t)
    if (light <= 0.001) return
    out.push({ key: `liftoff-credits-${n}`, role: card.role, names: card.names, notes: card.notes, title: card.title, light, rise, at: card.title ? TITLE_AT : AT })
  })
  return out
}

/* ------------------------------------------------------------------ the starlight (the canvas's half) */

export const credits = scenery<null>({
  name: 'credits',
  draw() {},
  over(p, _s, c) {
    if (c.t < CREDITS_AT || c.t > LAST_GONE + 0.6) return
    const f = frame(p, c.k)
    const on = smooth(c.t, CREDITS_AT, CREDITS_AT + 0.5) * (1 - smooth(c.t, LAST_GONE, LAST_GONE + 0.6))
    // The page still owns every word. An ink sky gives its cream type a readable ground.
    const width = Math.min(f.x1 - f.x0, (f.y1 - f.y0) * 16 / 9)
    const height = width * 9 / 16
    const left = f.cx - width / 2
    const top = f.cy - height / 2
    p.push()
    p.drawingContext.globalAlpha *= on
    p.noStroke()
    p.fill(INK)
    p.beginShape()
    p.vertex((left - width * 0.1) * c.k, (top - height * 0.3) * c.k)
    p.vertex((left + width * 1.1) * c.k, (top - height * 0.3) * c.k)
    for (let i = 24; i >= 0; i--) p.vertex((left + width * (i / 20 - 0.1)) * c.k, (top + height * (0.57 + 0.004 * Math.sin(i * 7))) * c.k)
    p.endShape(p.CLOSE)
    p.stroke(PAPER)
    p.strokeWeight(Math.max(0.6, c.k * 0.008))
    for (let i = 0; i < 5; i++) p.line(left * c.k, (top + height * (0.56 + i * 0.004)) * c.k, (left + width) * c.k, (top + height * (0.563 + i * 0.004)) * c.k)
    p.pop()
  },
})

/** For the check: the credits come after the music has stopped, and the last has gone well before the end. */
export const CREDITS_OK = CREDITS_AT >= FINAL + 4 && LAST_GONE <= DURATION - 2
