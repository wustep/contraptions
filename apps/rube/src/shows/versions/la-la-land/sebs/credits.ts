import { clamp, easeInOutCubic, easeInQuad } from '../../../../../../../src/core/ease'
import type { TitleCard } from '../../../registry'
import { AT, DURATION, END_AT } from './music'
import { DAVID, MIA, SEB, SON } from './worlds'

/**
 * The end credits. Mia has gone, Seb has counted in the band, and on the
 * band's first hit (478.05) the camera draws back out of the club and up
 * over the city of stars while The End swells to its last chord. The cards
 * come up in the sky above the city, one at a time, out of focus and into
 * it, and go the same way. There is no title card: after the last one the
 * city holds alone to the end.
 *
 * The words are the page's: a show's canvas sets no type (`shows/stage.ts`),
 * so the player sets them over the frame from `creditsAt` in its own face,
 * and a saved video has them painted in (`shows/words.ts`).
 */

export interface Card {
  /** Show time it starts to come up. */
  at: number
  /** How long it stays whole once it has come up. */
  hold: number
  role?: string
  names: (string | [string, string] | [string, string, string])[]
  notes?: string[]
}

/** Coming up, going, and how much one card's going overlaps the next's coming. */
const FORM = 1.3
const GO = 0.95
const OVERLAP = 0.25

/** The first card: once the camera is out over the roof and the sky has room. */
export const CREDITS_AT = AT.band + 2.9

const script: Omit<Card, 'at'>[] = [
  { hold: 3.4, role: 'Directed by', names: ['Claude Opus 5.5'], notes: ['Machines, drawings and code'] },
  {
    hold: 4.4,
    role: 'With',
    names: [
      ['Sebastian', 'the blue ball', SEB],
      ['Mia', 'the yellow ball', MIA],
      ['David', 'the grey ball', DAVID],
      ['Their son', 'the small green ball', SON],
    ],
  },
  {
    hold: 4.2,
    role: 'Music',
    names: ['Justin Hurwitz'],
    notes: ['“Epilogue” and “The End”', 'from La La Land (2016)'],
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

/** When the last card has gone: the city holds alone from here to the end. */
export const LAST_GONE = (() => {
  const last = CARDS[CARDS.length - 1]
  return last.at + FORM + last.hold + GO
})()

/** The End's last chord: the last card goes as it rings, and the city holds alone after it. */
export const LAST_CHORD = END_AT + 39.4

/** The words over the stage at `t`. */
export function creditsAt(t: number): TitleCard[] {
  const out: TitleCard[] = []
  for (const [i, c] of CARDS.entries()) {
    const since = t - c.at
    const whole = FORM + c.hold
    if (since < 0 || since > whole + GO) continue
    const up = easeInOutCubic(clamp(since / FORM))
    const down = since > whole ? easeInQuad(clamp((since - whole) / GO)) : 0
    const light = up * (1 - down)
    if (light <= 0.004) continue
    out.push({
      key: `sebs-${i}`,
      role: c.role,
      names: c.names,
      notes: c.notes,
      light,
      // It settles up into place as it comes into focus, and lifts a little more as it goes.
      rise: (1 - up) * 1.4 - down * 0.8,
      at: [0.5, c.names.length > 2 ? 0.1 : 0.16],
    })
  }
  return out
}

/** Whether the credits say what they must and end in time: the check holds this. */
export const CREDITS_OK = CARDS[0].at > AT.band && LAST_GONE > LAST_CHORD && LAST_GONE <= DURATION - 3
